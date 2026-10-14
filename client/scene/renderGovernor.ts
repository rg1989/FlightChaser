// client/scene/renderGovernor.ts
// How much the 3-D view draws, so that it never takes the whole graphics card unasked. A laptop's card also draws the system's
// windows and its other screens: when the view takes all of it, the whole computer stutters (the user's MacBook Air, three
// screens, 2026-10-13). Two levers:
// - Frames (frameRate), by itself: as many as the display shows while something on screen moves (the camera, a tile coming in,
//   the person's hand on the mouse or the keys); 30 a second while only the map's aircraft move, 15 while a paused scenario holds
//   still, and at most 30 while the window is not the one in use (the person is in another app). The TV (?tv=1) is never held back.
// - Quality, only at the person's word (the user, 2026-10-14: "suggest the option to downgrade … I need to be able to also remain
//   at high quality"): the chase is drawn as designed (4× MSAA, every pixel), and when a frame of it costs the card more than it
//   can give (Strain: STRAIN_MS, for a few seconds) the Performance mode switch is offered (ui/pictureSwitch.ts), and stays a
//   while (Linger: it never comes and goes with a view on the line). Switched on, QualityPace draws it with the
//   cheap edge filter (FXAA) in place of MSAA, then at 0.85, 0.72 and 0.6 of the canvas's width and height, as far as a frame
//   needs to fit in BUDGET_MS, and back up as room comes; switched off, as designed again. The 2-D map is always drawn as
//   designed: its aircraft and names are in the canvas, and fewer pixels would blur them.
//   Both go by the frame's own time on the card (FrameTimer: a timer query, where the browser has one), not by the frames' times:
//   at 60 frames a second those say nothing of the room left (marchPace.ts says why).
// Measured on that Mac (M2), JAL 123 at Haneda, the frame cap on: a frame takes 8.4–9.5 ms on the card at 1470 × 833 as designed
// (the card 73–80 % busy), 6.7 ms with FXAA for MSAA (MSAA's three resolves a frame go; 2× MSAA saves nothing); at 2560 × 1440 (a
// 27" screen) 16.3 ms (the card 99 % busy, 49 fps), 9.6 ms at 0.72 with FXAA. An empty frame still costs 4–6 ms there: the
// framebuffers' plumbing, not what is drawn.
// With Performance mode on and nothing translucent that needs it (the 3-D weather's volumes, see-through buildings), Cesium's
// order-independent translucency is off too: its resolve, clear and composite passes run in every frame even with nothing
// translucent to draw, 1–2 ms on the M2 at a 27" screen's size with FXAA (measured). Billboards, labels and lines then blend
// back to front, as Cesium draws them without it.
// ponytail: Cesium has no switch for it after the start: the governor takes View.oit out and puts it back (private), and on
// putting it back makes every command build its OIT twin again (FrameState.shadowState.lastDirtyTime, as Cesium does when shadows
// change). Another Cesium without those fields: nothing is touched. Upgrade: Cesium's own switch, if it gets one.
import type { Viewer } from 'cesium'

/** What the view is drawn with at a level. */
export interface Quality {
  msaa: number // samples a pixel: 4 as designed, 1 none
  fxaa: boolean // the edge filter that takes MSAA's place
  scale: number // the share of the canvas's width and height drawn (Viewer.resolutionScale)
  bloom: boolean // the sun's glow (Scene.sunBloom: six passes, two at full size, whenever the sun is on screen)
}

/** The levels, the finest first: the first is the view as designed. */
export const QUALITY: readonly Quality[] = [
  { msaa: 4, fxaa: false, scale: 1, bloom: true },
  { msaa: 1, fxaa: true, scale: 1, bloom: false },
  { msaa: 1, fxaa: true, scale: 0.85, bloom: false },
  { msaa: 1, fxaa: true, scale: 0.72, bloom: false },
  { msaa: 1, fxaa: true, scale: 0.6, bloom: false },
]
/**
 * What a level costs over the next coarser one, until a step between the two has been timed on the card in use. Measured (M2):
 * MSAA over FXAA 1.25 in a small window, 1.6 in a large one; a step of resolution about 1.3. The higher of what was seen, so a
 * finer level is never taken on too low a price.
 */
export const STEP_RATIO: readonly number[] = [1.6, 1.3, 1.3, 1.3]
/** What a frame may take on the graphics card with Performance mode on, ms: 60 % of a display's sixtieth. The rest is the system's. */
export const BUDGET_MS = 10
/** A frame as designed costing the card more than this, ms (80 % of a sixtieth), is more than it draws smoothly: the switch is offered. */
export const STRAIN_MS = 13
/** And it is clear again only under this, ms: a frame between the two moves nothing (a view on the line does not go to and fro). */
export const STRAIN_OFF_MS = 10.5
/** The switch, once on screen, stays at least this long, ms, and goes only after this long of nothing asking for it. */
export const LINGER_MS = 45_000
export const CLEAR_MS = 20_000
const LAST = QUALITY.length - 1
const RUN_MS = 1500 // frames are judged in runs of this long
const START_MS = 5000 // nor in the first seconds: the view is loading
const GAP_MS = 2000 // a longer wait is not a frame (the tab was hidden, the page stalled); a very slow machine's frames, up to 2 s, count
const BAD_RUNS = 2 // this many runs in a row over the budget: a level coarser
const OFFER_RUNS = 3 // and this many over the strain limit: the switch offered (4.5 s: a burst of tile uploads is not a slow machine)
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

/** The frames in runs of RUN_MS, after the first START_MS: each run's verdict. */
class Runs {
  #age = 0
  #sum = 0 // the run in hand: its frames' time and the time they should have taken, ms
  #due = 0
  #gpu: number[] = [] // the frames' times on the card that came in during it

  /** A frame (see QualityPace.frame); a finished run's verdict: its frames too slow, and the middle time on the card (NaN: none came). */
  add(dtMs: number, dueMs: number, gpuMs: readonly number[]): { slow: boolean; gpu: number } | null {
    if (!(dtMs > 0) || dtMs > GAP_MS) return null
    if (this.#age < START_MS) {
      this.#age += dtMs
      return null
    }
    this.#sum += dtMs
    this.#due += dueMs
    for (const ms of gpuMs) if (ms > 0) this.#gpu.push(ms)
    if (this.#sum < RUN_MS) return null
    const out = { slow: this.#sum > SLOW * this.#due, gpu: median(this.#gpu) }
    this.clear()
    return out
  }

  /** The run in hand is dropped (not the start's wait). */
  clear(): void {
    this.#sum = this.#due = 0
    this.#gpu = []
  }

  /** From the start again, the first START_MS not judged: a new view loads its tiles, and the uploads make its first frames dear. */
  restart(): void {
    this.clear()
    this.#age = 0
  }
}

/** Whether the view as designed is more than the card draws smoothly (the switch's offer), from runs at the level as designed. Pure. */
export class Strain {
  readonly #runs = new Runs()
  readonly #limit: number
  readonly #clear: number
  #bad = 0
  #quick = 0
  #on = false
  #gpu = Number.NaN

  /** limitMs: STRAIN_MS but in checks (?strainms=); clear again under the same share of it as STRAIN_OFF_MS of STRAIN_MS. */
  constructor(limitMs = STRAIN_MS) {
    this.#limit = limitMs
    this.#clear = (limitMs * STRAIN_OFF_MS) / STRAIN_MS
  }

  /** Offered: OFFER_RUNS in a row over the limit (or, with no word from the card, slow); withdrawn after four clearly under it. */
  get on(): boolean {
    return this.#on
  }

  /** The last run's middle time on the card, ms (NaN: none). */
  get gpuMs(): number {
    return this.#gpu
  }

  frame(dtMs: number, dueMs: number, gpuMs: readonly number[] = []): boolean {
    const run = this.#runs.add(dtMs, dueMs, gpuMs)
    if (run === null) return this.#on
    this.#gpu = run.gpu
    const timed = Number.isFinite(run.gpu)
    const over = timed ? run.gpu > this.#limit : run.slow
    const clear = timed ? run.gpu < this.#clear : !run.slow
    if (over) {
      this.#quick = 0
      if (++this.#bad >= OFFER_RUNS) this.#on = true
    } else if (clear) {
      this.#bad = 0
      if (++this.#quick >= QUICK_RUNS) this.#on = false
    } else this.#bad = this.#quick = 0 // on the line: neither
    return this.#on
  }

  /** Judged afresh (another view, another size): not offered until runs say so again, the first seconds (loading) not judged. */
  reset(): void {
    this.#runs.restart()
    this.#bad = this.#quick = 0
    this.#on = false
    this.#gpu = Number.NaN
  }
}

/**
 * Whether the switch is on screen, from whether it is asked for now: it comes at once, and once there it stays at least
 * LINGER_MS and goes only after CLEAR_MS in which nothing asked for it (a view on the line does not make it come and go). Pure.
 */
export class Linger {
  readonly #min: number
  readonly #clear: number
  #since: number | null = null // on screen since, ms; null: not on screen
  #asked = -Infinity // last asked for, ms

  constructor(minMs = LINGER_MS, clearMs = CLEAR_MS) {
    this.#min = minMs
    this.#clear = clearMs
  }

  update(nowMs: number, asked: boolean): boolean {
    if (asked) {
      this.#since ??= nowMs
      this.#asked = nowMs
    } else if (this.#since !== null && nowMs - this.#since >= this.#min && nowMs - this.#asked >= this.#clear) this.#since = null
    return this.#since !== null
  }

  /** Off screen at once (another view, where the switch has no place). */
  reset(): void {
    this.#since = null
    this.#asked = -Infinity
  }
}

/** Which level the view is drawn at with the switch on, and when that changes. Pure (no Cesium, no DOM). */
export class QualityPace {
  readonly #runs = new Runs()
  readonly #budget: number
  #level = 0
  #settling = false // the first run after a change: not judged
  #bad = 0
  #quick = 0
  #cameDown: number | null = null // the card's time at the level just left for a coarser one
  #wait = BLIND_WAIT_RUNS
  readonly #ratio = [...STEP_RATIO] // [k]: level k's cost over level k + 1's
  readonly #tooSlow = QUALITY.map(() => Infinity) // [k]: the card's time at level k when it was last given up there

  /** budgetMs: BUDGET_MS but in checks (?budgetms=). */
  constructor(budgetMs = BUDGET_MS) {
    this.#budget = budgetMs
  }

  get level(): number {
    return this.#level
  }

  /**
   * A frame took dtMs since the one before, and should have taken dueMs (the display's frame, or the frame cap's); gpuMs: the
   * frames' times on the card that have come in now (they come some frames late). The level to draw at.
   */
  frame(dtMs: number, dueMs: number, gpuMs: readonly number[] = []): number {
    const run = this.#runs.add(dtMs, dueMs, gpuMs)
    if (run === null) return this.#level
    if (this.#settling) this.#settling = false
    else if (Number.isFinite(run.gpu)) this.#judge(run.gpu)
    else this.#judgeBlind(run.slow)
    return this.#level
  }

  /**
   * The switch was turned on while a frame as designed cost gpuAt0 ms (NaN: not known): straight to the finest level that would
   * fit the budget by the steps' prices, so the change is seen at once and not over a dozen seconds of steps.
   */
  startAt(gpuAt0: number): number {
    let [to, cost] = [0, gpuAt0]
    while (Number.isFinite(cost) && cost > this.#budget && to < LAST) cost /= this.#ratio[to++]
    if (to !== this.#level) this.#to(to)
    return this.#level
  }

  /**
   * The canvas changed size, or the switch was turned off: what each level cost says nothing now. Back to the view as designed,
   * judged again from the next run (a smaller window may well have the room a larger one had not).
   */
  resized(): void {
    this.#tooSlow.fill(Infinity)
    this.#ratio.splice(0, this.#ratio.length, ...STEP_RATIO)
    this.#wait = BLIND_WAIT_RUNS
    this.#cameDown = null
    this.#runs.clear()
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
    if (gpu > this.#budget) {
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
    if (finer <= ROOM * this.#budget && finer <= CHEAPER * this.#tooSlow[this.#level - 1]) this.#to(this.#level - 1)
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

/** Whether the chase may be drawn lighter: 'full' as designed whatever it costs (the default), 'smooth' as light as it needs. */
export type Picture = 'full' | 'smooth'

/** What the Performance mode switch shows (ui/pictureSwitch.ts). */
export interface PictureState {
  offered: boolean // the switch is on screen: the chase as designed is more than the card draws smoothly, or it is drawn lighter now
  picture: Picture
  level: number // the level in force: an index into QUALITY
}

/**
 * The two levers on a viewer. update() once a frame (the app's frame, in scene.preUpdate); it sets the frame cap
 * (Viewer.targetFrameRate) and, when the level changes, the scene's MSAA, FXAA and Viewer.resolutionScale.
 */
export class RenderGovernor {
  readonly #viewer: Viewer
  readonly #tv: boolean
  readonly #pace: QualityPace
  readonly #strain: Strain
  readonly #linger = new Linger()
  #offered = false
  readonly #timer: FrameTimer | null
  readonly #off: (() => void)[] = []
  #picture: Picture
  #chasing = false
  #inputMs = -Infinity
  #lastMs: number | null = null
  #moving = true
  #cam = [NaN, NaN, NaN, NaN, NaN, NaN]
  #size = ''
  #level = -1
  #fps: number | undefined
  #gpuMs = Number.NaN
  #oitAside: unknown = undefined // Cesium's OIT while it is off (setOit)
  #oitOff = false

  /** opts.strainMs, opts.budgetMs: STRAIN_MS and BUDGET_MS but in checks on a quick card (?strainms=, ?budgetms=). */
  constructor(viewer: Viewer, opts: { tv?: boolean; picture?: Picture; strainMs?: number; budgetMs?: number } = {}) {
    this.#viewer = viewer
    this.#pace = new QualityPace(opts.budgetMs)
    this.#strain = new Strain(opts.strainMs)
    this.#tv = opts.tv === true
    this.#picture = opts.picture ?? 'full'
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

  /** What the switch shows. */
  get picture(): PictureState {
    return { offered: this.#offered, picture: this.#picture, level: this.#level }
  }

  /** The person's word: 'smooth' draws the chase as light as it needs at once; 'full' as designed again. */
  setPicture(p: Picture): void {
    if (p === this.#picture) return
    this.#picture = p
    if (p === 'full') {
      this.#pace.resized() // (its levels' prices are forgotten: the next time it starts from the card's word then)
      if (this.#level !== 0) this.#apply(0)
      return
    }
    const level = this.#chasing ? this.#pace.startAt(this.#strain.gpuMs) : 0
    if (level !== this.#level) this.#apply(level)
  }

  /** o.translucent: something on screen needs order-independent translucency (the 3-D weather's volumes, see-through buildings). */
  update(o: { paused: boolean; chasing: boolean; translucent?: boolean }): void {
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
    const resized = size !== this.#size && this.#size !== ''
    this.#size = size
    if (resized || o.chasing !== this.#chasing) { // another size or another view: what was measured says nothing of it
      this.#strain.reset()
      if (resized) this.#pace.resized()
      if (!o.chasing) this.#linger.reset()
    }
    this.#chasing = o.chasing
    const dt = this.#lastMs === null ? 0 : now - this.#lastMs
    this.#lastMs = now
    const came = this.#timer?.take() ?? []
    if (came.length > 0) this.#gpuMs = came[came.length - 1]
    const due = fps === undefined ? DISPLAY_MS : 1000 / fps
    let level = 0 // the map always as designed (its aircraft and names are in the canvas)
    if (o.chasing && this.#picture === 'smooth') level = this.#pace.frame(dt, due, came)
    else if (o.chasing) this.#strain.frame(dt, due, came)
    if (level !== this.#level) this.#apply(level)
    this.#setOit(!(this.#level > 0 && o.translucent !== true))
    this.#offered = this.#linger.update(now, o.chasing && (this.#picture === 'smooth' ? this.#level > 0 : this.#strain.on))
  }

  /** Cesium's order-independent translucency on or off (see the header). */
  #setOit(on: boolean): void {
    if (on !== this.#oitOff) return // (already so)
    const scene = this.#viewer.scene as unknown as { _defaultView?: { oit?: unknown }; frameState?: { shadowState?: { lastDirtyTime: number } } }
    const view = scene._defaultView
    const shadows = scene.frameState?.shadowState
    if (view === undefined || shadows === undefined || typeof shadows.lastDirtyTime !== 'number' || !('oit' in view)) return
    if (!on) {
      if (view.oit === undefined) return // none to begin with (no depth textures)
      this.#oitAside = view.oit
      view.oit = undefined
      this.#oitOff = true
      return
    }
    view.oit = this.#oitAside
    this.#oitAside = undefined
    this.#oitOff = false
    shadows.lastDirtyTime++ // every command builds its OIT twin again before it is next drawn
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
    scene.sunBloom = q.bloom
    this.#viewer.resolutionScale = q.scale
  }

  destroy(): void {
    for (const off of this.#off.splice(0)) off()
    this.#setOit(true) // back where Cesium's own destroy frees it
  }
}
