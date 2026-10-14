// client/scene/renderGovernor.ts
// How much the 3-D view draws, so that it never takes the whole graphics card. A laptop's card also draws the system's windows and
// its other screens: when the view takes all of it, the whole computer stutters (the user's MacBook Air, three screens, 2026-10-13).
// Two levers, each pulled only where it is least seen:
// - Frames (frameRate): as many as the display shows while something on screen moves (the camera, a tile coming in, the person's
//   hand on the mouse or the keys); 30 a second while only the map's aircraft move, 15 while a paused scenario holds still, and
//   at most 30 while the window is not the one in use (the person is in another app). The TV (?tv=1) is never held back.
// - Quality (QualityPace): the view as designed (4× MSAA) while a frame fits in the card's budget (BUDGET_MS); past it, the
//   cheap edge filter (FXAA) in place of MSAA, then the picture drawn at 0.85, 0.72 and 0.6 of the canvas's width and height.
//   It goes by the frame's own time on the card (FrameTimer: a timer query, where the browser has one), not by the frames'
//   times: at 60 frames a second those say nothing of the room left (marchPace.ts says why).
// Measured on that Mac (M2), JAL 123 at Haneda, the frame cap on: a frame takes 8.4–9.5 ms on the card at 1470 × 833 as designed
// (the card 73–80 % busy), 6.7 ms with FXAA for MSAA (MSAA's three resolves a frame go; 2× MSAA saves nothing); at 2499 × 1416 (a
// 27" screen) 17 ms (the card 99 % busy, 48 fps) and 10.7 ms with FXAA. An empty frame still costs 4–6 ms there: the
// framebuffers' plumbing, not what is drawn.
// ponytail: order-independent translucency (OIT) stays on: off where nothing needs it, it saves another 1–2 ms a frame with FXAA,
// but Cesium has no switch for it after the start (View.oit, private) and a translucent command made while it is off has no
// OIT twin to draw when it comes back on. Upgrade: a Cesium with a runtime switch, or rebuilding the derived commands.
import type { Viewer } from 'cesium'

/** What the view is drawn with at a level. */
export interface Quality {
  msaa: number // samples a pixel: 4 as designed, 1 none
  fxaa: boolean // the edge filter that takes MSAA's place
  scale: number // the share of the canvas's width and height drawn (Viewer.resolutionScale)
}

/** The levels, the finest first: the first is the view as designed. */
export const QUALITY: readonly Quality[] = [
  { msaa: 4, fxaa: false, scale: 1 },
  { msaa: 1, fxaa: true, scale: 1 },
  { msaa: 1, fxaa: true, scale: 0.85 },
  { msaa: 1, fxaa: true, scale: 0.72 },
  { msaa: 1, fxaa: true, scale: 0.6 },
]
/**
 * What a level costs over the next coarser one, until a step between the two has been timed on the card in use. Measured (M2):
 * MSAA over FXAA 1.25 in a small window, 1.6 in a large one; a step of resolution about 1.3. The higher of what was seen, so a
 * finer level is never taken on too low a price.
 */
export const STEP_RATIO: readonly number[] = [1.6, 1.3, 1.3, 1.3]
/** What a frame may take on the graphics card, ms: 60 % of a display's sixtieth. The rest is the system's. */
export const BUDGET_MS = 10
const LAST = QUALITY.length - 1
const RUN_MS = 1500 // frames are judged in runs of this long
const START_MS = 5000 // nor in the first seconds: the view is loading
const GAP_MS = 250 // a longer wait is not a frame (the tab was hidden, the page stalled)
const BAD_RUNS = 2 // this many runs in a row over the budget: a level coarser
const QUICK_RUNS = 4 // this many within it: a level finer, if it fits
const ROOM = 0.85 // a finer level is taken when it would cost no more than this share of the budget
const CHEAPER = 0.7 // and no more than this share of what it cost when it was last given up
const SLOW = 1.25 // without the timer: frames this much slower than they should come are too slow
const BLIND_WAIT_RUNS = 20 // without the timer a finer level is tried after this many quick runs (30 s), twice as long after each step down

/** A run's middle value: a tile's upload in one frame does not make the run slow. */
function median(xs: number[]): number {
  const s = xs.toSorted((a, b) => a - b)
  return s.length === 0 ? Number.NaN : s[Math.floor(s.length / 2)]
}

/** Which level the view is drawn at, and when that changes. Pure (no Cesium, no DOM). */
export class QualityPace {
  #level = 0
  #age = 0
  #sum = 0 // the run in hand: its frames' time and the time they should have taken, ms
  #due = 0
  #gpu: number[] = [] // the frames' times on the card that came in during it
  #settling = false // the first run after a change: not judged
  #bad = 0
  #quick = 0
  #cameDown: number | null = null // the card's time at the level just left for a coarser one
  #wait = BLIND_WAIT_RUNS
  readonly #ratio = [...STEP_RATIO] // [k]: level k's cost over level k + 1's
  readonly #tooSlow = QUALITY.map(() => Infinity) // [k]: the card's time at level k when it was last given up there

  get level(): number {
    return this.#level
  }

  /**
   * A frame took dtMs since the one before, and should have taken dueMs (the display's frame, or the frame cap's); gpuMs: the
   * frames' times on the card that have come in now (they come some frames late). The level to draw at.
   */
  frame(dtMs: number, dueMs: number, gpuMs: readonly number[] = []): number {
    if (!(dtMs > 0) || dtMs > GAP_MS) return this.#level
    if (this.#age < START_MS) {
      this.#age += dtMs
      return this.#level
    }
    this.#sum += dtMs
    this.#due += dueMs
    for (const ms of gpuMs) if (ms > 0) this.#gpu.push(ms)
    if (this.#sum < RUN_MS) return this.#level
    const [slow, gpu] = [this.#sum > SLOW * this.#due, median(this.#gpu)]
    this.#sum = this.#due = 0
    this.#gpu = []
    if (this.#settling) this.#settling = false
    else if (Number.isFinite(gpu)) this.#judge(gpu)
    else this.#judgeBlind(slow)
    return this.#level
  }

  /**
   * The canvas changed size: what each level cost says nothing now. Back to the view as designed, judged again from the next run
   * (a smaller window may well have the room a larger one had not; a larger one steps down again within seconds).
   */
  resized(): void {
    this.#tooSlow.fill(Infinity)
    this.#ratio.splice(0, this.#ratio.length, ...STEP_RATIO)
    this.#wait = BLIND_WAIT_RUNS
    this.#cameDown = null
    this.#sum = this.#due = 0
    this.#gpu = []
    this.#to(0)
  }

  #to(level: number): void {
    this.#level = level
    this.#bad = this.#quick = 0
    this.#settling = true
  }

  /** A run whose frames took `gpu` ms each on the card (the middle one). */
  #judge(gpu: number): void {
    const down = this.#cameDown
    this.#cameDown = null
    if (down !== null) this.#ratio[this.#level - 1] = Math.min(4, Math.max(1, down / gpu)) // the first run after a step down: what it saved
    if (gpu > BUDGET_MS) {
      this.#quick = 0
      if (++this.#bad < BAD_RUNS || this.#level >= LAST) return
      this.#tooSlow[this.#level] = Math.min(this.#tooSlow[this.#level], gpu)
      this.#cameDown = gpu
      this.#to(this.#level + 1)
      return
    }
    this.#bad = 0
    if (++this.#quick < QUICK_RUNS || this.#level === 0) return
    const finer = gpu * this.#ratio[this.#level - 1]
    if (finer <= ROOM * BUDGET_MS && finer <= CHEAPER * this.#tooSlow[this.#level - 1]) this.#to(this.#level - 1)
  }

  /** A run with no word from the card (a browser without the timer): slow frames make it coarser; quick ones finer, after a while. */
  #judgeBlind(slow: boolean): void {
    if (slow) {
      this.#quick = 0
      if (++this.#bad < BAD_RUNS || this.#level >= LAST) return
      this.#wait = Math.min(this.#wait * 2, BLIND_WAIT_RUNS * 16)
      this.#to(this.#level + 1)
      return
    }
    this.#bad = 0
    if (++this.#quick >= this.#wait && this.#level > 0) this.#to(this.#level - 1)
  }
}

/** What the frame rate goes by. */
export interface Activity {
  tv: boolean // the TV (?tv=1): never held back
  busy: boolean // the person's hand on the mouse or the keys a moment ago, or tiles coming in
  moving: boolean // the camera moved since the last frame
  focused: boolean // the window is the one in use
  paused: boolean // a scenario stands paused (the camera holds still, only the aircraft's lights blink)
}

/** Frames a second for the view now; undefined: as many as the display shows. */
export function frameRate(a: Activity): number | undefined {
  if (a.tv || a.busy) return undefined
  if (a.moving) return a.focused ? undefined : 30
  if (a.paused) return 15
  return a.focused ? 30 : 20
}

/** What of a WebGL 2 context the frame timer uses. */
export interface FrameTimerGl {
  readonly QUERY_RESULT: number
  readonly QUERY_RESULT_AVAILABLE: number
  readonly CURRENT_QUERY: number
  createQuery(): unknown
  deleteQuery(q: unknown): void
  beginQuery(target: number, q: unknown): void
  endQuery(target: number): void
  getQuery(target: number, what: number): unknown
  getQueryParameter(q: unknown, what: number): unknown
  getParameter(what: number): unknown
}

const EVERY = 5 // one frame in this many is timed (the cloud pass's timer takes one in four: they seldom meet, and the second to come waits)
const GIVE_UP = 240 // frames: a query not answered this long after it ended never will be

/** A whole frame's time on the graphics card: a timer query from the scene's preRender to its postRender, one frame in EVERY. */
export class FrameTimer {
  readonly #gl: FrameTimerGl
  readonly #elapsed: number
  readonly #disjoint: number
  #frame = 0
  #open: unknown = null
  #waiting: { q: unknown; frame: number }[] = []
  #came: number[] = []
  #dead = false

  constructor(gl: FrameTimerGl, ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }) {
    this.#gl = gl
    this.#elapsed = ext.TIME_ELAPSED_EXT
    this.#disjoint = ext.GPU_DISJOINT_EXT
  }

  get dead(): boolean {
    return this.#dead
  }

  /** Before a frame's draws: the answers that have come are read, and this frame is timed if it is its turn and no other query runs. */
  begin(): void {
    const gl = this.#gl
    let disturbed: boolean | null = null
    while (this.#waiting.length > 0 && gl.getQueryParameter(this.#waiting[0].q, gl.QUERY_RESULT_AVAILABLE) === true) {
      const { q } = this.#waiting.shift()!
      disturbed ??= gl.getParameter(this.#disjoint) === true
      const ns = Number(gl.getQueryParameter(q, gl.QUERY_RESULT))
      gl.deleteQuery(q)
      if (!disturbed && ns > 0) this.#came.push(ns / 1e6)
    }
    if (this.#waiting.length > 0 && this.#frame - this.#waiting[0].frame > GIVE_UP) {
      for (const { q } of this.#waiting) gl.deleteQuery(q)
      this.#waiting.length = 0
      this.#dead = true
    }
    if (!this.#dead && this.#frame++ % EVERY === 0 && gl.getQuery(this.#elapsed, gl.CURRENT_QUERY) === null) {
      this.#open = gl.createQuery()
      gl.beginQuery(this.#elapsed, this.#open)
    }
  }

  /** After the frame's draws. */
  end(): void {
    if (this.#open === null) return
    if (this.#gl.getQuery(this.#elapsed, this.#gl.CURRENT_QUERY) === this.#open) {
      this.#gl.endQuery(this.#elapsed)
      this.#waiting.push({ q: this.#open, frame: this.#frame })
    } else this.#gl.deleteQuery(this.#open) // (ended by someone else: not a frame's time)
    this.#open = null
  }

  /** The frames' times that came in since the last call, ms. */
  take(): number[] {
    const out = this.#came
    this.#came = []
    return out
  }
}

/** A frame timer on a WebGL context (Cesium's scene.context._gl), or none: no WebGL 2, or no timer query in this browser. */
export function frameTimer(gl: unknown): FrameTimer | null {
  const g = gl as Partial<FrameTimerGl> & { getExtension?(name: string): unknown } | null | undefined
  if (g === null || g === undefined || typeof g.getQuery !== 'function' || typeof g.getExtension !== 'function') return null
  const ext = g.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null
  return ext ? new FrameTimer(g as FrameTimerGl, ext) : null
}

const INPUT_MS = 2000 // the hand is "on" the view this long after its last move
const DISPLAY_MS = 1000 / 60

/**
 * The two levers on a viewer. update() once a frame (the app's frame, in scene.preUpdate); it sets the frame cap
 * (Viewer.targetFrameRate) and, when the level changes, the scene's MSAA, FXAA and Viewer.resolutionScale.
 */
export class RenderGovernor {
  readonly #viewer: Viewer
  readonly #tv: boolean
  readonly #pace = new QualityPace()
  readonly #timer: FrameTimer | null
  readonly #off: (() => void)[] = []
  #inputMs = -Infinity
  #lastMs: number | null = null
  #moving = true
  #cam = [NaN, NaN, NaN, NaN, NaN, NaN]
  #size = ''
  #level = -1
  #fps: number | undefined
  #gpuMs = Number.NaN

  constructor(viewer: Viewer, opts: { tv?: boolean } = {}) {
    this.#viewer = viewer
    this.#tv = opts.tv === true
    const scene = viewer.scene
    this.#timer = frameTimer((scene as unknown as { context?: { _gl?: unknown } }).context?._gl)
    const hand = (): void => {
      this.#inputMs = performance.now()
      if (this.#fps !== undefined) this.#cap(undefined) // at once, not at the capped rate's next frame
    }
    for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) {
      window.addEventListener(type, hand, { capture: true, passive: true })
      this.#off.push(() => window.removeEventListener(type, hand, { capture: true }))
    }
    if (this.#timer !== null) {
      const t = this.#timer
      this.#off.push(scene.preRender.addEventListener(() => t.begin()), scene.postRender.addEventListener(() => t.end()))
    }
    // Whether the camera moved in the frame just drawn: its place and its direction against the last frame's.
    this.#off.push(scene.postRender.addEventListener(() => {
      const { positionWC: p, directionWC: d } = scene.camera
      const c = this.#cam
      this.#moving = Math.abs(p.x - c[0]) + Math.abs(p.y - c[1]) + Math.abs(p.z - c[2]) > 1e-3 || Math.abs(d.x - c[3]) + Math.abs(d.y - c[4]) + Math.abs(d.z - c[5]) > 1e-7
      c.splice(0, 6, p.x, p.y, p.z, d.x, d.y, d.z)
    }))
    this.#apply(0)
  }

  /** The level in force (an index into QUALITY), the frame cap (undefined: none) and the last frame's time on the card, ms. */
  get state(): { level: number; fps: number | undefined; gpuMs: number } {
    return { level: this.#level, fps: this.#fps, gpuMs: this.#gpuMs }
  }

  update(o: { paused: boolean }): void {
    const now = performance.now()
    const v = this.#viewer
    const fps = frameRate({
      tv: this.#tv,
      busy: now - this.#inputMs < INPUT_MS || v.scene.globe?.tilesLoaded === false,
      moving: this.#moving,
      focused: document.hasFocus(),
      paused: o.paused,
    })
    if (fps !== this.#fps) this.#cap(fps)
    if (this.#tv) return
    const size = `${v.canvas.clientWidth}x${v.canvas.clientHeight}`
    if (size !== this.#size) {
      if (this.#size !== '') this.#pace.resized()
      this.#size = size
    }
    const dt = this.#lastMs === null ? 0 : now - this.#lastMs
    this.#lastMs = now
    const came = this.#timer?.take() ?? []
    if (came.length > 0) this.#gpuMs = came[came.length - 1]
    const level = this.#pace.frame(dt, fps === undefined ? DISPLAY_MS : 1000 / fps, came)
    if (level !== this.#level) this.#apply(level)
  }

  #cap(fps: number | undefined): void {
    this.#fps = fps
    // (Cesium draws when more than 1/rate has passed since the last: a hair over the rate keeps every second sixtieth)
    this.#viewer.targetFrameRate = fps === undefined ? (undefined as unknown as number) : fps * 1.05
  }

  #apply(level: number): void {
    this.#level = level
    const q = QUALITY[level]
    const scene = this.#viewer.scene
    scene.msaaSamples = q.msaa
    scene.postProcessStages.fxaa.enabled = q.fxaa
    this.#viewer.resolutionScale = q.scale
  }

  destroy(): void {
    for (const off of this.#off.splice(0)) off()
  }
}
