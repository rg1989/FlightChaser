// client/bench/overlay.ts
/**
 * G3 bench: frame timing, camera clearance, long tasks, the chase weather's main-thread time and heap for one chase, shown as a
 * small text overlay (?bench=1, wired by WP-A2) and downloadable as JSON. Browser-only APIs are touched only inside methods that
 * need them and are feature-checked, so importing this module in node is safe.
 * The overlay also says how the chase's clouds are drawn (CloudsBench: the march's tier, the pass's time on the graphics card, the
 * march's size) and how many WebGL textures are alive (countTextures), so that one screenshot of a slow machine tells why.
 * Unknown numbers are NaN (JSON null), never 0: a Safari run cannot pass the "long tasks: 0" bar by accident.
 */
import type { Viewer } from 'cesium'
import type { RenderState } from '../types.ts'

export interface BenchReport {
  label: string
  frames: number
  fpsP50: number
  fpsP5: number
  frameMsP95: number
  longTasks: number                             // NaN where the Long Tasks API is missing (Safari, Firefox)
  longTaskMsMax: number                         // 0 with no long task; NaN where unsupported
  wxMsMax: number                               // the longest the chase's weather held the main thread in one frame (work()), ms
  wxOver: number                                // frames in which it held it more than WX_OVER_MS (the Long Tasks API sees only 50 ms and more)
  minClearanceM: number | null                  // null until a clearance was reported
  clearanceViolations: number                   // frames with clearance < minClearanceM
  heapMB: number | null                         // performance.memory.usedJSHeapSize (Chromium only) at report time
}

/**
 * Percentile by linear interpolation between closest ranks (rank = p/100 · (n − 1)); empty → NaN.
 * Same definition as tools/metrics.ts `percentile`, repeated because client code must not import tools/.
 */
function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN
  const s = xs.toSorted((a, b) => a - b)
  const r = (p / 100) * (s.length - 1)
  const lo = Math.floor(r)
  return s[lo] + (r - lo) * (s[Math.ceil(r)] - s[lo])
}

/** Frame times (ms) → p50 fps = 1000 / median ms, p5 fps = 1000 / p95 ms (the slow tail), and p95 ms. Empty → NaN. */
export function summarizeFrames(frameMs: number[]): { fpsP50: number; fpsP5: number; frameMsP95: number } {
  const p95 = percentile(frameMs, 95)
  return { fpsP50: 1000 / percentile(frameMs, 50), fpsP5: 1000 / p95, frameMsP95: p95 }
}

const num = (x: number | null, digits: number): string => (x === null || Number.isNaN(x) ? 'n/a' : x.toFixed(digits))

/** How the chase's clouds are drawn now (scene/cloudVolume.ts, scene/marchPace.ts), for the overlay's line. */
export interface CloudsBench {
  tier: number // the march's tier: 0 the finest
  passMs: number // the cloud pass's time on the graphics card, ms; not a number: no timer (the browser has none, or the card does not answer it)
  parts: readonly number[] // that time stage by stage, the march and the mix; none: not known
  march: readonly [number, number] // the march's size, pixels
  drawn: boolean // the pass is in the scene (there is something to draw)
}

/**
 * The overlay's line for the clouds (null: the chase's weather is not shown): the tier, the march's size, the pass's time with the
 * march's and the mix's in brackets. Short, and the tier first: the search box covers the overlay's right end.
 */
function cloudsText(clouds: CloudsBench | null): string {
  if (clouds === null) return 'clouds off'
  const parts = clouds.parts.length === 0 ? '' : ` (${clouds.parts.map((ms) => num(ms, 1)).join(' + ')})`
  const pass = !clouds.drawn ? 'no pass' : Number.isFinite(clouds.passMs) ? `pass ${num(clouds.passMs, 1)} ms${parts}` : 'pass: no timer'
  return `clouds tier ${clouds.tier} · march ${clouds.march[0]}×${clouds.march[1]} px · ${pass}`
}

/**
 * The overlay's text: one line per fact, unknown values as n/a. clouds: how the chase's clouds are drawn (null: its weather is not
 * shown; absent: no such line); textures: the WebGL textures alive (absent: not said), with the heap.
 */
export function overlayText(r: BenchReport, state: RenderState | null, canvas?: { width: number; height: number }, clouds?: CloudsBench | null, textures?: number): string {
  const alt = state?.onGround ? 'ground' : `${num(state?.altBaroFt ?? null, 0)} ft`
  return [
    `bench ${r.label} · ${r.frames} frames${canvas ? ` · ${canvas.width}×${canvas.height} px` : ''}`,
    `fps p50 ${num(r.fpsP50, 1)} · p5 ${num(r.fpsP5, 1)} · frame p95 ${num(r.frameMsP95, 1)} ms`,
    `long tasks ${num(r.longTasks, 0)} · max ${num(r.longTaskMsMax, 0)} ms`,
    `weather max ${num(r.wxMsMax, 1)} ms · over ${WX_OVER_MS} ms ${r.wxOver}`,
    ...(clouds === undefined ? [] : [cloudsText(clouds)]),
    `clearance min ${num(r.minClearanceM, 0)} m · violations ${r.clearanceViolations}`,
    `heap ${num(r.heapMB, 0)} MB${textures === undefined ? '' : ` · textures ${num(textures, 0)}`}`,
    state ? `${state.hex} ${state.mode} ${alt}` : 'no aircraft',
  ].join('\n')
}

/** What of a WebGL context's class the texture count wraps. */
interface TextureMaker {
  createTexture(): unknown
  deleteTexture(texture: never): void
}

const counted = new WeakMap<object, { alive: number; live: WeakSet<object> }>() // a context class whose textures are counted, and its count

/**
 * The WebGL textures alive in the page, counted from when this is first called (call it before the viewer makes its context, and
 * every texture is in it): each one made is one more, each one deleted one less. The count is asked of the function it gives; not a
 * number where there is no WebGL to count in. protos: the context classes' prototypes (default: the browser's WebGL 2 and WebGL 1).
 * ponytail: it puts its own functions in place of the classes' createTexture and deleteTexture, for the page's life (a bench run's
 * only: app.ts calls it with ?bench=1). Upgrade: none needed while it is a check aid.
 */
export function countTextures(protos?: readonly object[]): () => number {
  const g = globalThis as { WebGL2RenderingContext?: { prototype: object }; WebGLRenderingContext?: { prototype: object } }
  const classes = protos ?? [g.WebGL2RenderingContext?.prototype, g.WebGLRenderingContext?.prototype].filter((p): p is object => p !== undefined)
  const counts = classes.map((proto) => {
    const had = counted.get(proto)
    if (had !== undefined) return had
    const count = { alive: 0, live: new WeakSet<object>() }
    counted.set(proto, count)
    const p = proto as TextureMaker
    const [make, drop] = [p.createTexture, p.deleteTexture as (this: unknown, texture: unknown) => void]
    p.createTexture = function (this: unknown): unknown {
      const texture = make.call(this)
      if (texture !== null && typeof texture === 'object') {
        count.live.add(texture)
        count.alive++
      }
      return texture
    }
    p.deleteTexture = function (this: unknown, texture: unknown): void {
      if (texture !== null && typeof texture === 'object' && count.live.delete(texture)) count.alive--
      drop.call(this, texture)
    } as TextureMaker['deleteTexture']
    return count
  })
  return () => (counts.length === 0 ? Number.NaN : counts.reduce((n, c) => n + c.alive, 0))
}

/** Frames the overlay summarises: about 2 s at 60 Hz, so its fps reads "now", not the whole run. */
const RECENT_FRAMES = 120
/** The chase's weather may hold the main thread this long in a frame (half a frame at 60 Hz); frames in which it takes more are counted. */
const WX_OVER_MS = 8

export class BenchRecorder {
  #viewer: Viewer
  #label: string
  #minClearanceM: number
  // ponytail: every frame time is kept (≈ 1.7 MB per hour at 60 Hz) and report() sorts them all. Fine for bench
  // runs of minutes to hours; for day-long soaks switch to a fixed 0.1 ms histogram.
  #frameMs: number[] = []
  #frames = 0
  #lastMs: number | null = null
  #minClearance: number | null = null
  #violations = 0
  #longTasks = 0
  #longTaskMsMax = 0
  #wxMsMax = 0
  #wxOver = 0
  #observer: PerformanceObserver | null = null
  #state: RenderState | null = null
  #overlay: HTMLElement | null = null
  #timer: ReturnType<typeof setInterval> | null = null

  constructor(viewer: Viewer, opts?: { label?: string; minClearanceM?: number }) {
    this.#viewer = viewer
    this.#label = opts?.label ?? 'bench'
    this.#minClearanceM = opts?.minClearanceM ?? 15
    // Long tasks (≥ 50 ms on the main thread) from now on; Chromium only. Unsupported → the report says NaN.
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      this.#observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          this.#longTasks++
          this.#longTaskMsMax = Math.max(this.#longTaskMsMax, e.duration)
        }
      })
      this.#observer.observe({ type: 'longtask' })
    }
  }

  /** Call once per rendered frame with the chased state and ChaseCamera.update()'s clearance (null = unknown). */
  frame(state: RenderState | null, clearanceM: number | null): void {
    const now = performance.now()
    if (this.#lastMs !== null) this.#frameMs.push(now - this.#lastMs)
    this.#lastMs = now
    this.#frames++
    this.#state = state
    if (clearanceM === null) return
    if (this.#minClearance === null || clearanceM < this.#minClearance) this.#minClearance = clearanceM
    if (clearanceM < this.#minClearanceM) this.#violations++
  }

  /** Call once per frame with how long the chase's weather held the main thread in it, ms (its update and what follows the aircraft's way ahead). */
  work(ms: number): void {
    if (ms > this.#wxMsMax) this.#wxMsMax = ms
    if (ms > WX_OVER_MS) this.#wxOver++
  }

  report(): BenchReport {
    return this.#build(this.#frameMs)
  }

  /** The report over the last ~2 s of frames only (what the overlay shows): the frame times now, not the whole run's. */
  recent(): BenchReport {
    return this.#build(this.#frameMs.slice(-RECENT_FRAMES))
  }

  /** Save report() as JSON through a Blob and a temporary <a download>. Throws outside a DOM. */
  download(filename?: string): void {
    if (typeof document === 'undefined') throw new Error('BenchRecorder.download() needs a DOM')
    const name = filename ?? `bench-${this.#label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.report(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /**
   * A small fixed-position text box, refreshed at 2 Hz, summarising the last ~2 s of frames. Mount once. clouds: asked at each
   * refresh how the chase's clouds are drawn (null: its weather is not shown); textures: asked for the WebGL textures alive
   * (countTextures). With neither, the box has no line for them.
   */
  mountOverlay(root: HTMLElement, clouds?: () => CloudsBench | null, textures?: () => number): void {
    const el = document.createElement('pre')
    el.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:10;margin:0;padding:6px 8px;border-radius:4px;pointer-events:none;' +
      'font:12px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.6)'
    root.append(el)
    const tick = (): void => {
      const c = this.#viewer.canvas
      el.textContent = overlayText(this.recent(), this.#state, { width: c.width, height: c.height }, clouds?.(), textures?.())
    }
    tick()
    this.#overlay = el
    this.#timer = setInterval(tick, 500)
  }

  /** Stop observing long tasks and remove the overlay. report() still works afterwards. */
  destroy(): void {
    this.#observer?.disconnect()
    if (this.#timer !== null) clearInterval(this.#timer)
    this.#overlay?.remove()
    this.#timer = null
    this.#overlay = null
  }

  #build(frameMs: number[]): BenchReport {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    return {
      label: this.#label,
      frames: this.#frames,
      ...summarizeFrames(frameMs),
      longTasks: this.#observer ? this.#longTasks : NaN,
      longTaskMsMax: this.#observer ? this.#longTaskMsMax : NaN,
      wxMsMax: this.#wxMsMax,
      wxOver: this.#wxOver,
      minClearanceM: this.#minClearance,
      clearanceViolations: this.#violations,
      heapMB: memory ? memory.usedJSHeapSize / 2 ** 20 : null,
    }
  }
}
