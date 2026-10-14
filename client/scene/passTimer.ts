// client/scene/passTimer.ts
// How long a post-process pass takes on the graphics card: a timer query round each of its stages' draws
// (EXT_disjoint_timer_query_webgl2), where the browser has one (Chromium and Firefox on a desktop; Safari has none). The cloud volume
// asks it of its own pass, and the pace that says how fine the march is walked judges by it (marchPace.ts): the frames' times alone
// do not say whether the pass is what makes them slow, nor, on a display, how much time is to spare.
// One frame in four is timed. The card answers some frames later (tens of frames, on a quick machine); a frame's time is the sum of
// its stages', once all have come (parts: each stage's own). A time read while the card says its timer was disturbed (a disjoint: it was put to another use between) is not believed.
// A card that takes the queries and never answers them (its oldest query still unread GIVE_UP frames on) is given up on for good
// (dead): the queries waiting are given back and no more are made. Without that they pile up on the card, thirty a second, for as
// long as the weather shows.
// ponytail: a stage is timed by putting a function of this module in place of its `execute` (Cesium's own, private: the collection
// calls it on the stage for each draw). A Cesium that draws a stage another way leaves the timer without a word, and the pace then
// goes by the frames' times as in a browser without the query. Upgrade: check PostProcessStageCollection.js execute on a Cesium bump.

/** What of a WebGL 2 context the timer uses. */
export interface QueryGl {
  readonly QUERY_RESULT: number
  readonly QUERY_RESULT_AVAILABLE: number
  getExtension(name: string): unknown
  createQuery(): unknown
  deleteQuery(q: unknown): void
  beginQuery(target: number, q: unknown): void
  endQuery(target: number): void
  getQueryParameter(q: unknown, what: number): unknown
  getParameter(what: number): unknown
  getQuery?(target: number, what: number): unknown // WebGL 2's: the query running now (another's: the whole frame's, renderGovernor.ts)
  readonly CURRENT_QUERY?: number
}

/** A stage as the timer takes it: something drawn by its `execute`. */
export interface TimedStage {
  execute(...args: never[]): void
}

const EVERY = 4 // one frame in this many is timed
const GIVE_UP = 240 // frames: a query not answered this long after it ended never will be (answers come within tens of frames)

export class PassTimer {
  readonly #gl: QueryGl
  readonly #elapsed: number // the query's target: TIME_ELAPSED_EXT
  readonly #disjoint: number // GPU_DISJOINT_EXT
  readonly #wrapped = new WeakSet<TimedStage>()
  #watched = new Set<TimedStage>()
  #frame = 0 // frames polled
  #timing = false // the frame in hand is timed
  #order = new Map<TimedStage, number>() // each watched stage's place among them
  #waiting: { q: unknown; frame: number; at: number }[] = [] // queries ended, not read yet, the oldest first, each with its stage's place
  readonly #frames = new Map<number, { ns: number; left: number; parts: number[] }>() // a timed frame: its stages' time so far, each one's, and how many are still to answer
  #ms = Number.NaN
  #parts: readonly number[] = []
  #dead = false

  constructor(gl: QueryGl, ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }) {
    this.#gl = gl
    this.#elapsed = ext.TIME_ELAPSED_EXT
    this.#disjoint = ext.GPU_DISJOINT_EXT
  }

  /** The pass's time on the card in the last frame timed, ms: its stages' together. Not a number until one has come. */
  get ms(): number {
    return this.#ms
  }

  /** That frame's time stage by stage, ms, in the order the stages were given to watch; none until a frame has come. */
  get parts(): readonly number[] {
    return this.#parts
  }

  /** Whether the card has been given up on: it took the queries and did not answer them. Nothing is timed from then on. */
  get dead(): boolean {
    return this.#dead
  }

  /**
   * These stages are the pass from now on (a pass's stages, all of them): their draws are timed. Stages watched before are drawn
   * untimed, and their time is not the new ones': it is not known again until the new ones have been timed.
   */
  watch(stages: readonly TimedStage[]): void {
    if (stages.length !== this.#watched.size || stages.some((stage) => !this.#watched.has(stage))) {
      this.#frames.clear() // (an answer still on its way then finds no frame to add to)
      this.#ms = Number.NaN
      this.#parts = []
    }
    this.#watched = new Set(stages)
    this.#order = new Map(stages.map((stage, at) => [stage, at]))
    for (const stage of stages) {
      if (this.#wrapped.has(stage)) continue
      this.#wrapped.add(stage)
      const draw = stage.execute as (...args: unknown[]) => void
      ;(stage as { execute: (...args: unknown[]) => void }).execute = (...args) => {
        if (!this.#timing || !this.#watched.has(stage)) return draw.apply(stage, args)
        if (this.#gl.getQuery !== undefined && this.#gl.getQuery(this.#elapsed, this.#gl.CURRENT_QUERY ?? 0x8865) !== null) return draw.apply(stage, args) // another query runs (one at a time): this frame's pass is not timed
        const q = this.#gl.createQuery()
        this.#gl.beginQuery(this.#elapsed, q)
        try {
          draw.apply(stage, args)
        } finally {
          this.#gl.endQuery(this.#elapsed)
          this.#waiting.push({ q, frame: this.#frame, at: this.#order.get(stage) ?? 0 })
          const f = this.#frames.get(this.#frame) ?? { ns: 0, left: this.#watched.size, parts: [] }
          this.#frames.set(this.#frame, f)
        }
      }
    }
  }

  /** Once a frame, before its draws: the times the card has answered are read, and whether this frame is one to time. */
  poll(): void {
    const gl = this.#gl
    let disturbed: boolean | null = null // asked of the card only when there is something to read (the asking resets it)
    while (this.#waiting.length > 0 && gl.getQueryParameter(this.#waiting[0].q, gl.QUERY_RESULT_AVAILABLE) === true) {
      const { q, frame, at } = this.#waiting.shift()!
      disturbed ??= gl.getParameter(this.#disjoint) === true
      const ns = Number(gl.getQueryParameter(q, gl.QUERY_RESULT))
      gl.deleteQuery(q)
      for (const earlier of this.#frames.keys()) if (earlier < frame) this.#frames.delete(earlier) // (the answers come in the order asked: a frame before this one has had all it will get, and a stage was not drawn in it: half a pass is no pass)
      const f = this.#frames.get(frame)
      if (f === undefined) continue
      if (disturbed) {
        this.#frames.delete(frame)
        continue
      }
      f.ns += ns
      f.parts[at] = ns / 1e6
      if (--f.left > 0) continue
      this.#ms = f.ns / 1e6
      this.#parts = f.parts
      this.#frames.delete(frame)
    }
    if (this.#waiting.length > 0 && this.#frame - this.#waiting[0].frame > GIVE_UP) { // the card does not answer: no more is asked of it
      for (const { q } of this.#waiting) gl.deleteQuery(q)
      this.#waiting.length = 0
      this.#frames.clear()
      this.#ms = Number.NaN
      this.#parts = []
      this.#dead = true
    }
    this.#frame++
    this.#timing = !this.#dead && this.#watched.size > 0 && (this.#frame - 1) % EVERY === 0
  }
}

/** A timer on a WebGL context (Cesium's scene.context._gl), or none: no context, no queries (WebGL 1), or a browser without the timer query. */
export function passTimer(gl: unknown): PassTimer | null {
  const g = gl as Partial<QueryGl> | null | undefined
  if (g === null || g === undefined || typeof g.createQuery !== 'function' || typeof g.getExtension !== 'function') return null
  const ext = g.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null
  return ext === null || ext === undefined ? null : new PassTimer(g as QueryGl, ext)
}
