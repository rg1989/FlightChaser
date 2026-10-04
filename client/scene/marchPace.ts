// client/scene/marchPace.ts
// At which tier the cloud volume's march is walked (cloudVolume.ts walks it at a tier), and when that changes. Pure (no Cesium, no
// DOM), so Node tests cover it.
// The tiers give up, one thing more at each, what is seen least first: the step budget (with fewer steps every step is longer by
// as much: a cloud is found and read a little more coarsely), the noise's finest octave (a cloud's edge near the camera is
// smoother), the ground shadows, the march's size (0.35, then 0.25 of the view's width and height), then the second of the two
// samples toward the Sun that shade a cloud, and then steps and size again. The first tier is the look as designed. TIER_COST
// is what each costs on the check machine, as a share of the first.
// (The mix stays as it is at every tier: laid from the four nearest march pixels instead of the nine round a pixel it showed the
// march's 2 × 2 starts as a screen of dots, and it saved nothing that could be measured.)
// The march starts at a cheap tier (START_TIER), not at the first: what the first costs is not known until it has been drawn, and
// on a laptop's graphics card it is most of a frame, at once and for as long as the weather shows (the card's time is the laptop's
// heat: a fanless one slows itself down under it within minutes). It goes finer only with proof of room, and the proof is the
// pass's own time on the card (cloudVolume.ts measures it with a timer query, where the browser has one): the pass has a budget
// (BUDGET_MS), and after a few runs of frames that are no slower than a display's and a pass within the budget, the march goes to
// the finest tier whose pass would still cost no more than ROOM of it: the pass's time now, times what the steps between the two
// cost (TIER_COST's shares, until a step has been timed on this card: then what it measured).
// The frames are looked at in runs of a second and a half, the first eight seconds not at all (the view is loading then, and slow
// whatever the march), nor the first run after a change of tier. Three runs in a row that ask for it make the march one tier
// coarser, down to the last, which stays however slow the frames are. What asks for it: a pass that costs over OVER of the budget,
// however quick the frames are; or, at a tier finer than the start, frames slower than a display's (the room was not there after
// all). Slow frames with a pass within its budget at the start tier or a coarser one are not the pass's: nothing changes.
// A tier given up as too slow is not gone back to until the pass would cost no more than CHEAPER of what it cost there then: a
// second try needs it much cheaper, a third cheaper still by as much again. So it cannot go to and fro.
// Without the pass's time (a browser with no timer query, one whose timer says nothing or zero, a card that stops answering) there
// is no proof of anything: the march stays at the start tier, whatever the frames' times, and one that stands at another tier
// goes back to it. (Slow frames alone do not say that the march is what makes them slow.)
// The rules before these started at the first tier and stepped down when the frames were slow, judging each step by whether the
// frames got quicker. A display shows a frame at its next sixtieth and no sooner: a step that saved 3 ms of 30 changed no frame's
// time, was judged "not the march", and was taken back for good. A slow machine ended at the first tier and stayed there.
// reset() (the weather hidden and shown again) starts over.

/** What the march is walked with at a tier. */
export interface MarchTier {
  steps: number // the step budget of a ray
  detail: number // 0: all four octaves of the noise; 1: the finest one left out
  shadows: boolean // the clouds' shadows on the ground
  scale: number // the share of the view's width and height its rays are walked at
  light: number // the samples toward the Sun that shade a cloud: 2, or 1 (as heavy as the two, half-way between them)
}

/** The tiers, the finest first. */
export const MARCH_TIERS: readonly MarchTier[] = [
  { steps: 128, detail: 0, shadows: true, scale: 0.5, light: 2 },
  { steps: 80, detail: 0, shadows: true, scale: 0.5, light: 2 },
  { steps: 80, detail: 1, shadows: true, scale: 0.5, light: 2 },
  { steps: 80, detail: 1, shadows: false, scale: 0.5, light: 2 },
  { steps: 80, detail: 1, shadows: false, scale: 0.35, light: 2 },
  { steps: 80, detail: 1, shadows: false, scale: 0.25, light: 2 },
  { steps: 56, detail: 1, shadows: false, scale: 0.25, light: 1 },
  { steps: 40, detail: 1, shadows: false, scale: 0.2, light: 1 },
  { steps: 32, detail: 1, shadows: false, scale: 0.16, light: 1 },
]
/**
 * What each tier's pass costs on the graphics card, as a share of the first tier's: the check machine (RTX 4090, kept busy so
 * that it runs at full clock), 2000 × 1030, the chase camera in a rain layer, the view in which the march is most of the pass
 * (0.70 ms at the first tier, 0.18 ms at the start tier; a pass's two stages cost 0.07 ms each there whatever they draw, so the
 * cheap tiers' shares are larger where there is less to march). A step to a finer tier is priced by these until it has been
 * timed on the card in use; they are the smallest shares of the views timed, so the price is not too low.
 */
export const TIER_COST: readonly number[] = [1, 0.77, 0.74, 0.7, 0.51, 0.39, 0.31, 0.26, 0.23]
/** The tier the march starts at. */
export const START_TIER = 7
/** What the pass may cost on the graphics card, ms: a quarter of a display's frame. */
export const BUDGET_MS = 4
const LAST = MARCH_TIERS.length - 1
const RUN_MS = 1500 // frames are judged in runs of this long
const DISPLAY_MS = 1000 / 60 // a display's frame
const SLOW = 1.15 // frames are slower than a display's when they take more than this share of its frame
const ROOM = 0.8 // a finer tier is taken when its pass would cost no more than this share of the budget
const OVER = 1.25 // and a tier's pass is too dear when it costs more than this share of it
const CHEAPER = 0.6 // a tier given up as too slow is tried again when its pass would cost no more than this share of what it cost then
const BAD_RUNS = 3 // this many runs in a row that ask for a coarser tier are "a while"
const QUICK_RUNS = 4 // and after this many that do not, a finer tier may be taken
const RATIO_MOST = 8 // a step between two tiers is taken to change the pass's cost by no more than this many times
const GAP_MS = 250 // a longer wait is not a frame (the tab was hidden, the page stalled): not counted
const START_MS = 8000 // the frames of this long after the start are not looked at: the view is loading

export class MarchPace {
  #tier = START_TIER
  #age = 0 // the frames' time since the start, ms, while it is under START_MS
  #sum = 0 // the run in hand: its frames' time, ms, and how many
  #frames = 0
  #passSum = 0 // and the pass's time in it, of the frames that had a word of it
  #passFrames = 0
  #settling = false // the run in hand is the first after a change of tier (the new pass is being made): not judged
  #bad = 0 // runs in a row that ask for a coarser tier
  #quick = 0 // runs in a row that do not
  #cameDown: number | null = null // the pass's cost at the tier just left for a coarser one, until the first judged run after the step
  readonly #ratio: number[] = MARCH_TIERS.map((_, k) => (k < LAST ? TIER_COST[k] / TIER_COST[k + 1] : 1)) // [k]: tier k's cost over tier k + 1's: the shares', until a step between the two has been timed here
  readonly #tooSlow: number[] = MARCH_TIERS.map(() => Infinity) // [k]: the pass's cost at tier k when it was last given up as too slow there

  /** The tier in force: an index into MARCH_TIERS. */
  get tier(): number {
    return this.#tier
  }

  /** A frame took dtMs since the one before, passMs of it the cloud pass's on the GPU (not a number, or none: not known); the tier to walk at. */
  frame(dtMs: number, passMs?: number): number {
    if (!(dtMs > 0) || dtMs > GAP_MS) return this.#tier
    if (this.#age < START_MS) {
      this.#age += dtMs
      return this.#tier
    }
    this.#sum += dtMs
    this.#frames++
    if (passMs !== undefined && passMs > 0) {
      this.#passSum += passMs
      this.#passFrames++
    }
    if (this.#sum < RUN_MS) return this.#tier
    const [mean, pass] = [this.#sum / this.#frames, this.#passFrames > 0 ? this.#passSum / this.#passFrames : Number.NaN]
    this.#sum = this.#frames = this.#passSum = this.#passFrames = 0
    if (this.#settling) this.#settling = false
    else this.#judge(mean, pass)
    return this.#tier
  }

  /** From the start again: the start tier, watching. */
  reset(): void {
    this.#tier = START_TIER
    this.#age = this.#sum = this.#frames = this.#passSum = this.#passFrames = this.#bad = this.#quick = 0
    this.#settling = false
    this.#cameDown = null
    for (let k = 0; k < LAST; k++) this.#ratio[k] = TIER_COST[k] / TIER_COST[k + 1]
    this.#tooSlow.fill(Infinity)
  }

  #to(tier: number): void {
    this.#tier = tier
    this.#bad = this.#quick = 0
    this.#settling = true
  }

  /** A run whose frames took `mean` ms each, `pass` of it the pass's (not a number: not known). */
  #judge(mean: number, pass: number): void {
    const down = this.#cameDown
    this.#cameDown = null
    if (!(Number.isFinite(pass) && pass > 0)) { // no word of the pass's time: no proof of anything
      if (this.#tier !== START_TIER) this.#to(START_TIER)
      return
    }
    if (down !== null) this.#ratio[this.#tier - 1] = Math.min(RATIO_MOST, Math.max(1, down / pass)) // the first run at a coarser tier: what the step saved
    const slow = mean > SLOW * DISPLAY_MS
    if (pass > OVER * BUDGET_MS || (slow && this.#tier < START_TIER)) { // too dear, or the room this tier was taken on is not there
      this.#quick = 0
      if (++this.#bad < BAD_RUNS || this.#tier >= LAST) return
      this.#tooSlow[this.#tier] = Math.min(this.#tooSlow[this.#tier], pass)
      this.#cameDown = pass
      this.#to(this.#tier + 1)
      return
    }
    this.#bad = 0
    if (++this.#quick < QUICK_RUNS || this.#tier === 0 || slow) return // (frames slower than a display's: no room is proven, whatever the pass costs)
    let [to, cost] = [this.#tier, pass]
    while (to > 0) {
      const finer = cost * this.#ratio[to - 1] // what the next finer tier would cost now
      if (finer > ROOM * BUDGET_MS || finer > CHEAPER * this.#tooSlow[to - 1]) break
      cost = finer
      to--
    }
    if (to < this.#tier) this.#to(to)
  }
}
