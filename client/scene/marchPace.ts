// client/scene/marchPace.ts
// What the cloud volume's march gives up when the frames are slow (cloudVolume.ts walks it at a tier), and when. Pure (no Cesium, no
// DOM), so Node tests cover it.
// The tiers give up, one thing more at each, what is seen least first: the step budget (with five eighths of the steps every step
// is longer by as much: a cloud is found and read a little more coarsely), the noise's finest octave (a cloud's edge near the camera
// is smoother), the ground shadows, and then the march's size (0.35, then 0.25 of the view's width and height). The first tier is
// the look as designed. On the check machine the tiers cost 100, 76 to 88, 74 to 88, 67 to 85, 40 to 63 and 25 to 42 % of the first.
// The frames are looked at in runs of a second and a half, the first eight seconds not at all (the view is loading then, and slow
// whatever the march). A run is slow when its frames take over 15 % longer than they would without the pass, if the pass's time
// on the GPU (cloudVolume.ts measures it with a timer query, where the browser has one) is all of it lost: their own time less the
// pass's, but no less than a sixtieth of a second, a display's frame: frames that quick are not slow, whatever the pass takes. Three slow runs in a row make the march one tier coarser, down to the last, which stays however slow the frames
// are. Frames that are slow for another reason with a pass that is cheap are not slow by this measure. And a pass that is dear on
// the card may still cost no frame: where the frames wait for the main thread (the globe's tiles loading, a large window), the
// card has the time. So a descent is judged once it has made the pass a good deal quicker: when the frames did not get quicker by
// half as much, the pass is not what they wait for; the march goes back to where the descent began and no coarser tier is tried
// until the view has changed (the pass a third dearer, or the frames a fifth quicker).
// It grows finer again when the view has become cheap again. The pass's time now, times what the step down from the finer tier saved
// when it was taken, is what the finer tier would cost now; after four quick runs the finer tier is tried when the frames would
// still be within 5 % of what they take without the pass, or (on a display, where a quick frame hides how much time is to spare)
// when it would cost under six tenths of what it cost when it last proved too slow. A try that proves too slow is taken back, and
// the next needs it cheaper still by as much again: so it cannot go to and fro.
// Without the pass's time (a browser with no timer query) a run is slow by its frames' time alone. Then it cannot be told whether
// the march is what makes them slow: a descent that has reached the march's first smaller size without making the frames a tenth
// quicker than they were where it began goes back there, and no coarser tier is tried again. And a finer tier is tried blind,
// after a minute of quick frames, then two, then four: three failed tries, and no more.
// reset() (the weather hidden and shown again) starts over.

/** What the march is walked with at a tier. */
export interface MarchTier {
  steps: number // the step budget of a ray
  detail: number // 0: all four octaves of the noise; 1: the finest one left out
  shadows: boolean // the clouds' shadows on the ground
  scale: number // the share of the view's width and height its rays are walked at
}

/** The tiers, the finest first. */
export const MARCH_TIERS: readonly MarchTier[] = [
  { steps: 128, detail: 0, shadows: true, scale: 0.5 },
  { steps: 80, detail: 0, shadows: true, scale: 0.5 },
  { steps: 80, detail: 1, shadows: true, scale: 0.5 },
  { steps: 80, detail: 1, shadows: false, scale: 0.5 },
  { steps: 80, detail: 1, shadows: false, scale: 0.35 },
  { steps: 80, detail: 1, shadows: false, scale: 0.25 },
]
const LAST = MARCH_TIERS.length - 1
const FIRST_SMALLER = MARCH_TIERS.findIndex((t) => t.scale < MARCH_TIERS[0].scale) // the first tier that walks fewer rays
const RUN_MS = 1500 // frames are judged in runs of this long
const DISPLAY_MS = 1000 / 60 // a display's frame: frames within 15 % of it are quick enough
const SLOW = 1.15 // a run is slow when its frames take more than this share of what they would without the pass
const SLOW_RUNS = 3 // this many slow runs in a row are "a while"
const QUICK_RUNS = 4 // and after this many quick ones a finer tier may be tried
const ROOM = 1.05 // a finer tier is tried when the frames would then take no more than this share of what they take without the pass …
const CHEAPER = 0.6 // … or when it would cost no more than this share of what it cost when it was last too slow
const SAVED_MOST = 8 // what a step down saved is taken as no more than this many times
const JUDGED_MS = 2 // a descent is judged once it has made the pass this much quicker, ms, and at least
const JUDGED = 0.08 // this share of the frames' time (less cannot be told from the frames' own unrest)
const FOLLOWED = 0.5 // it helped when the frames got quicker by this share of what the pass did
const DEARER = 1.3 // after a descent that did not help, a coarser tier is tried again when the pass costs this many times what it did then,
const QUICKER = 0.8 // or the frames take this share of what they took
const HELPED = 0.9 // with no word of the pass's time: a descent helped when the frames then take no more than this share of what they took
const PROBE_MS = 60_000 // with no word of the pass's time: a finer tier is tried after this long of quick frames, twice as long after each failed try,
const PROBES = 3 // and after this many failed tries no more
const GAP_MS = 250 // a longer wait is not a frame (the tab was hidden, the page stalled): not counted
const START_MS = 8000 // the frames of this long after the start are not looked at: the view is loading

export class MarchPace {
  #tier = 0
  #age = 0 // the frames' time since the start, ms, while it is under START_MS
  #sum = 0 // the run in hand: its frames' time, ms, and how many
  #frames = 0
  #passSum = 0 // and the pass's time in it, of the frames that had a word of it
  #passFrames = 0
  #settling = false // the run in hand is the first after a change of tier (the new pass is being made): not judged
  #slow = 0 // slow runs in a row
  #quick = 0 // quick runs in a row
  #quickMs = 0 // and how long they have lasted
  #cameDown: { mean: number; pass: number } | null = null // the last run before a step down, until the first judged run after it
  #cameUp = false // the tier in force was a try at a finer one, and has not held yet
  readonly #saved: number[] = MARCH_TIERS.map(() => 1) // [k]: the pass's cost at tier k over its cost at tier k + 1, when the step was last taken
  readonly #tooSlow: number[] = MARCH_TIERS.map(() => Infinity) // [k]: the pass's cost at tier k when it last proved too slow there
  #began: { tier: number; mean: number; pass: number } | null = null // where the descent in hand began, and what the frames and the pass took there
  #noCoarser = false // a descent did not help: no coarser tier is tried …
  #heldAt: { mean: number; pass: number } | null = null // … while the view is as it was then (with no word of the pass's time: ever)
  #failed = 0 // … and the failed blind tries of a finer tier

  /** The tier in force: an index into MARCH_TIERS. */
  get tier(): number {
    return this.#tier
  }

  /** A frame took dtMs since the one before, passMs of it the cloud pass's on the GPU (not a number: not known); the tier to walk at. */
  frame(dtMs: number, passMs?: number): number {
    if (!(dtMs > 0) || dtMs > GAP_MS) return this.#tier
    if (this.#age < START_MS) {
      this.#age += dtMs
      return this.#tier
    }
    this.#sum += dtMs
    this.#frames++
    if (passMs !== undefined && passMs >= 0) {
      this.#passSum += passMs
      this.#passFrames++
    }
    if (this.#sum < RUN_MS) return this.#tier
    const [run, mean, pass] = [this.#sum, this.#sum / this.#frames, this.#passFrames > 0 ? this.#passSum / this.#passFrames : Number.NaN]
    this.#sum = this.#frames = this.#passSum = this.#passFrames = 0
    if (this.#settling) this.#settling = false
    else this.#judge(run, mean, pass)
    return this.#tier
  }

  /** From the start again: the first tier, watching. */
  reset(): void {
    this.#tier = this.#age = this.#sum = this.#frames = this.#passSum = this.#passFrames = this.#slow = this.#quick = this.#quickMs = this.#failed = 0
    this.#settling = this.#cameUp = this.#noCoarser = false
    this.#cameDown = this.#began = this.#heldAt = null
    this.#saved.fill(1)
    this.#tooSlow.fill(Infinity)
  }

  #to(tier: number): void {
    this.#tier = tier
    this.#slow = this.#quick = this.#quickMs = 0
    this.#settling = true
  }

  /** A run of `run` ms whose frames took `mean` ms each, `pass` of it the pass's (not a number: not known). */
  #judge(run: number, mean: number, pass: number): void {
    const known = Number.isFinite(pass)
    const bare = Math.max(known ? mean - pass : 0, DISPLAY_MS) // what the frames would take without the pass, at the least
    const slow = mean > SLOW * bare
    const held = this.#heldAt
    if (held !== null && known && (pass >= DEARER * held.pass || mean <= QUICKER * held.mean)) { // the view has changed: a coarser tier may help now
      this.#heldAt = null
      this.#noCoarser = false
    }
    const down = this.#cameDown
    if (down !== null) { // the first run at a coarser tier: what the step saved, and whether the descent helped
      this.#cameDown = null
      if (known && Number.isFinite(down.pass)) {
        this.#saved[this.#tier - 1] = Math.min(SAVED_MOST, Math.max(1, down.pass / Math.max(pass, 1e-3)))
        this.#tooSlow[this.#tier - 1] = down.pass
      }
      const began = this.#began
      let helped: boolean | null = null // not to be told yet
      if (began !== null && known && Number.isFinite(began.pass)) {
        const quicker = began.pass - pass
        if (quicker >= Math.max(JUDGED_MS, JUDGED * began.mean)) helped = began.mean - mean >= FOLLOWED * quicker
      } else if (began !== null && !known) {
        if (mean <= HELPED * began.mean) helped = true
        else if (this.#tier >= FIRST_SMALLER) helped = false // fewer rays, and no quicker
      }
      if (helped === true) this.#began = null
      else if (helped === false && began !== null) { // it is not the march: back, and no coarser tier is tried
        this.#began = null
        this.#noCoarser = true
        this.#heldAt = known ? { mean: began.mean, pass: began.pass } : null
        this.#to(began.tier)
        return
      }
    }
    if (slow) {
      this.#quick = this.#quickMs = 0
      if (++this.#slow < SLOW_RUNS || this.#tier >= LAST || this.#noCoarser) return
      if (this.#cameUp) { // the finer tier that was tried is too slow: back to the one that held
        this.#cameUp = false
        if (known) this.#tooSlow[this.#tier] = Math.min(this.#tooSlow[this.#tier], pass)
        else this.#failed++
      } else if (this.#began === null) this.#began = { tier: this.#tier, mean, pass }
      this.#cameDown = { mean, pass }
      this.#to(this.#tier + 1)
      return
    }
    this.#slow = 0
    this.#began = null // quick here: the descent, if one was in hand, ends at this tier
    this.#quickMs += run
    if (++this.#quick >= SLOW_RUNS) this.#cameUp = false // a finer tier that was tried has held
    if (this.#tier === 0 || this.#quick < QUICK_RUNS) return
    if (known) {
      const finer = pass * this.#saved[this.#tier - 1] // what the finer tier would cost now
      if (!(mean - pass + finer <= ROOM * bare || finer <= CHEAPER * this.#tooSlow[this.#tier - 1])) return
    } else if (this.#failed >= PROBES || this.#quickMs < PROBE_MS * 2 ** this.#failed) return
    this.#cameUp = true
    this.#began = null
    this.#to(this.#tier - 1)
  }
}
