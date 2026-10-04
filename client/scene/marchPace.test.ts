// client/scene/marchPace.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUDGET_MS, MARCH_TIERS, MarchPace, START_TIER, TIER_COST } from './marchPace.ts'

/** What a frame takes at a tier: its time, and the cloud pass's own time on the GPU when the browser can tell it. */
type Cost = (tier: number) => { dt: number; pass?: number }
/** s seconds of frames, each as the cost says for the tier in force; the tiers seen, in turn (after `seen`). */
function run(p: MarchPace, cost: Cost | number, s: number, seen: number[] = [p.tier]): number[] {
  for (let t = 0; t < s * 1000;) {
    const c = typeof cost === 'number' ? { dt: cost } : cost(p.tier)
    t += c.dt
    const tier = p.frame(c.dt, c.pass)
    if (tier !== seen.at(-1)) seen.push(tier)
  }
  return seen
}
const HZ60 = 1000 / 60
const told = (pass: number, timer: boolean): { pass?: number } => (timer ? { pass } : {})
/** A display of 60 frames a second: a frame that takes less still takes a sixtieth. The rest of the view takes `rest` ms, the pass what `pass` says. */
const capped = (rest: number, pass: (tier: number) => number, timer = true): Cost => (tier) => ({ dt: Math.max(HZ60, rest + pass(tier)), ...told(pass(tier), timer) })
/** No display's limit (a check run): a frame takes what it costs. */
const uncapped = (rest: number, pass: (tier: number) => number, timer = true): Cost => (tier) => ({ dt: rest + pass(tier), ...told(pass(tier), timer) })
/** A display that shows a frame at its next sixtieth and no sooner (a laptop's, with its vertical sync): 17 ms of work is a frame of 33. */
const synced = (rest: number, pass: (tier: number) => number, timer = true): Cost => (tier) => ({ dt: Math.max(1, Math.ceil((rest + pass(tier)) / HZ60 - 1e-9)) * HZ60, ...told(pass(tier), timer) })
/** A graphics card on which the first tier's pass takes `at0` ms, and each tier's as the check machine's shares say (TIER_COST). */
const card = (at0: number) => (tier: number): number => at0 * TIER_COST[tier]
const LAST = MARCH_TIERS.length - 1
const START = START_TIER
/** The finest tier whose pass, by the shares, fits in `ms` on a card whose first tier takes at0. */
const fits = (at0: number, ms: number): number => TIER_COST.findIndex((c) => at0 * c <= ms)

test('the tiers: the first is the look as designed; each one after gives up something more and takes nothing back (steps, the noise\'s finest octave, the ground shadows, size, the light\'s second sample); each is cheaper than the one before', () => {
  assert.deepEqual(MARCH_TIERS[0], { steps: 128, detail: 0, shadows: true, scale: 0.5, light: 2 }, 'the first tier is the look as it was')
  for (let k = 1; k < MARCH_TIERS.length; k++) {
    const [b, t] = [MARCH_TIERS[k - 1], MARCH_TIERS[k]]
    assert.ok(t.steps <= b.steps && t.detail >= b.detail && (b.shadows || !t.shadows) && t.scale <= b.scale && t.light <= b.light, `tier ${k} takes nothing back`)
    assert.ok(t.steps < b.steps || t.detail > b.detail || (b.shadows && !t.shadows) || t.scale < b.scale || t.light < b.light, `tier ${k} gives something up`)
  }
  for (const t of MARCH_TIERS) assert.ok(t.steps >= 24 && t.steps <= 128 && Number.isInteger(t.steps) && [0, 1].includes(t.detail) && [1, 2].includes(t.light) && t.scale > 0 && t.scale <= 0.5)
  assert.equal(TIER_COST.length, MARCH_TIERS.length)
  assert.equal(TIER_COST[0], 1)
  for (let k = 1; k < TIER_COST.length; k++) assert.ok(TIER_COST[k] < TIER_COST[k - 1] && TIER_COST[k] > 0, `tier ${k} is cheaper than tier ${k - 1}`)
})

test('the start: a cheap tier, not the finest: its pass takes a third of the first tier\'s on the check machine, and there is a coarser one under it', () => {
  assert.ok(Number.isInteger(START) && START > 0 && START < LAST)
  assert.ok(TIER_COST[START] <= 0.34, `the start tier costs ${TIER_COST[START]} of the first`)
  assert.equal(new MarchPace().tier, START)
  assert.equal(BUDGET_MS, 4)
})

test('MarchPace: with no word of the pass\'s time (a browser without the timer) nothing is proven: it stays at the start tier, however quick or slow the frames, for hours', () => {
  const p = new MarchPace()
  assert.deepEqual(run(p, HZ60, 4 * 3600), [START])
  assert.deepEqual(run(p, 4, 3600), [START], '250 frames a second: still no proof of what the pass costs')
  assert.deepEqual(run(p, 33, 3600), [START], 'slow frames do not say that the march is what makes them slow')
  assert.deepEqual(run(p, capped(14, card(26), false), 3600), [START])
})

test('MarchPace: the first eight seconds are not looked at: the view is loading then, and slow whatever the march', () => {
  const p = new MarchPace()
  const dear = uncapped(10, () => 30)
  assert.deepEqual(run(p, dear, 10), [START], 'a dear pass from the start, for 10 s: the first 8 do not count, and 2 are not a while')
  assert.deepEqual(run(p, uncapped(10, () => 3.5), 60), [START], 'then within the budget: nothing changed')
  const q = new MarchPace()
  assert.deepEqual(run(q, dear, 14), [START, START + 1], 'dear for 14 s: the 6 after the start are a while')
})

test('MarchPace: on a quick card the pass\'s own time proves the room: after a few quick runs the march goes, at once, to the finest tier whose pass would still fit the budget, and stays there', () => {
  const quick = new MarchPace() // the check machine: the first tier's pass takes 1.7 ms
  assert.deepEqual(run(quick, uncapped(11, card(1.7)), 30), [START, 0])
  assert.deepEqual(run(quick, uncapped(11, card(1.7)), 3600), [0], 'held for an hour')
  const mid = new MarchPace() // a card on which the first tier takes 5 ms: a tier that costs 3.2 ms or less
  const to = fits(5, 0.8 * BUDGET_MS)
  assert.ok(to > 0 && to < START, `(the shares put that between the first tier and the start: ${to})`)
  assert.deepEqual(run(mid, capped(6, card(5)), 30), [START, to])
  assert.deepEqual(run(mid, capped(6, card(5)), 3600), [to], 'held')
})

test('MarchPace: a pass over the budget makes the march coarser, tier by tier, until it is within a quarter over it or at the last tier, however quick the frames are: the card\'s time is the laptop\'s heat', () => {
  const slow = card(4 * BUDGET_MS / TIER_COST[START]) // the start tier's pass takes four times the budget here
  const p = new MarchPace()
  const seen = run(p, capped(2, slow), 120)
  assert.deepEqual(seen, Array.from({ length: LAST - START + 1 }, (_, k) => START + k), 'down to the last')
  assert.deepEqual(run(p, capped(2, slow), 3600), [LAST], 'which stays, however dear: nothing is tried again, so nothing flickers')
  const q = new MarchPace()
  const some = card(1.3 * BUDGET_MS / TIER_COST[START]) // 5.2 ms at the start tier: one tier coarser is within the quarter
  assert.ok(1.3 * BUDGET_MS * TIER_COST[START + 1] / TIER_COST[START] <= 1.25 * BUDGET_MS)
  assert.deepEqual(run(q, capped(2, some), 3600), [START, START + 1])
})

test('MarchPace: the user\'s laptop as estimated (the card is what the frames wait for, the display shows a frame at its next sixtieth): the march never goes finer than the start tier, with the timer or without, for hours', () => {
  // The scene takes the card 15 ms; the first tier's pass would take 8 ms more (ten times the check machine's in an overcast).
  // At the start tier the pass takes 8 × its share: 2.6 ms, and the frames take two sixtieths.
  assert.ok(card(8)(START) <= 3 && 15 + card(8)(START) > HZ60)
  for (const timer of [true, false]) {
    const p = new MarchPace()
    const seen = run(p, synced(15, card(8), timer), 4 * 3600)
    assert.deepEqual(seen, [START], `${timer ? 'with' : 'without'} the timer: ${seen}`)
  }
  // The rules before these took this machine to the first tier's neighbour and back to the first tier, for good.
})

test('MarchPace: frames that are slow for another reason leave the march at the start tier: no room is proven (it does not go finer), and the pass is within its budget (it does not go coarser)', () => {
  const p = new MarchPace()
  assert.deepEqual(run(p, capped(45, card(1.7)), 3600), [START], '45 ms a frame on the main thread, the pass a fraction of a ms')
  assert.deepEqual(run(p, uncapped(22, card(6)), 3600), [START])
})

test('MarchPace: a finer tier that makes the frames slow on a display (the card is over its sixtieth with it) is taken back, a tier at a time, and not tried again until the pass costs much less than it did then', () => {
  const to = fits(6, 0.8 * BUDGET_MS) // the tier the pass's time alone asks for: 6 × its share ≤ 3.2 ms
  assert.ok(to > 0 && to < START - 1)
  let [rest, k] = [HZ60 - (card(6)(to) + card(6)(to + 1)) / 2, 1] // with that tier the card is over a sixtieth; a tier coarser it is not
  const view: Cost = (tier) => synced(rest, (t) => card(6)(t) * k)(tier)
  const p = new MarchPace()
  assert.deepEqual(run(p, view, 60), [START, to, to + 1])
  assert.deepEqual(run(p, view, 4 * 3600), [to + 1], 'held for hours: not tried again')
  k = 0.8
  assert.deepEqual(run(p, view, 3600), [to + 1], 'nor when the pass is a fifth cheaper')
  k = 0.5
  rest = 12
  const seen = run(p, view, 600)
  assert.ok(seen.length === 2 && seen[1] <= to, `much cheaper: tried again, and it holds: ${seen}`)
})

test('MarchPace: where the finer tiers cost more than the shares say (another view), the tier taken is over the budget: back, a tier at a time, and held for hours: never to and fro', () => {
  // The shares say a tier fits; in this view everything finer than the start tier costs 2.2 times that.
  const pass = (tier: number): number => card(6)(tier) * (tier < START ? 2.2 : 1)
  const p = new MarchPace()
  const seen = run(p, capped(6, pass), 120)
  const to = fits(6, 0.8 * BUDGET_MS)
  assert.equal(seen[1], to, 'tried')
  assert.ok(pass(to) > 1.25 * BUDGET_MS, '(and too dear there)')
  assert.deepEqual(seen, [...seen.slice(0, 2), ...seen.slice(2).sort((a, b) => a - b)], `then coarser only: ${seen}`)
  assert.ok(pass(seen.at(-1)!) <= 1.25 * BUDGET_MS)
  assert.deepEqual(run(p, capped(6, pass), 4 * 3600), [seen.at(-1)], 'held')
})

test('MarchPace: when the view gets dearer the march grows coarser, and finer again when it is cheap again: the pass\'s time now, times what the steps between cost when they were taken, says what the finer tier would cost', () => {
  let k = 1
  const view = capped(6, (tier) => card(3)(tier) * k)
  const p = new MarchPace()
  assert.deepEqual(run(p, view, 30), [START, 0], '3 ms at the first tier: it fits')
  k = 4 // the camera is in a storm: 12 ms at the first tier
  const down = run(p, view, 120)
  assert.ok(down.length > 2 && card(3)(down.at(-1)!) * 4 <= 1.25 * BUDGET_MS, `coarser until it fits: ${down}`)
  assert.deepEqual(down, [...down].sort((a, b) => a - b))
  assert.deepEqual(run(p, view, 3600), [down.at(-1)], 'held')
  k = 1
  assert.deepEqual(run(p, view, 60).at(-1), 0, 'cheap again: the first tier again')
})

test('MarchPace: a timer that says nothing, or zero, is no timer: nothing is proven by it; and when it stops answering at a finer tier the march goes back to the start tier', () => {
  const p = new MarchPace()
  assert.deepEqual(run(p, () => ({ dt: 8, pass: 0 }), 3600), [START], 'a pass of 0 ms is not believed')
  assert.deepEqual(run(p, () => ({ dt: 8, pass: Number.NaN }), 3600), [START])
  const q = new MarchPace()
  run(q, uncapped(11, card(1.7)), 30)
  assert.equal(q.tier, 0)
  assert.deepEqual(run(q, 12, 30), [0, START], 'the timer has stopped answering')
})

test('MarchPace: a hitch is not a while: bad runs between good ones change nothing, and a gap that is no frame (the tab was hidden) is not counted', () => {
  const p = new MarchPace()
  for (let k = 0; k < 20; k++) {
    run(p, uncapped(10, () => 30), 1)
    run(p, uncapped(10, () => 4.5), 4)
  }
  assert.equal(p.tier, START)
  for (let k = 0; k < 400; k++) {
    p.frame(HZ60, 4.5)
    p.frame(5000, 30)
  }
  assert.equal(p.tier, START)
  p.frame(Number.NaN)
  p.frame(-5, Number.NaN)
  assert.equal(p.tier, START)
})

test('MarchPace: a pass whose time wavers by a fifth from run to run round the budget does not send the march to and fro: a handful of changes in four hours', () => {
  let seed = 7
  const noise = (): number => 0.8 + 0.4 * ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  for (const at0 of [2.5, 4, 5.5, 8, 14, 30, 60]) {
    const p = new MarchPace()
    let n = 1
    let wob = 1
    const seen = run(p, (tier) => {
      if (++n % 90 === 0) wob = noise() // about a run
      const pass = card(at0)(tier) * wob
      return { dt: Math.max(HZ60, 6 + pass), pass }
    }, 4 * 3600)
    assert.ok(seen.length <= 6, `first tier at ${at0} ms: ${seen}`)
  }
})

test('MarchPace: reset starts again at the start tier, watching', () => {
  const p = new MarchPace()
  run(p, uncapped(11, card(1.7)), 30)
  assert.equal(p.tier, 0)
  p.reset()
  assert.equal(p.tier, START)
  run(p, uncapped(10, () => 30), 7)
  assert.equal(p.tier, START, 'after a reset the start is not looked at again')
  run(p, uncapped(10, () => 30), 7)
  assert.equal(p.tier, START + 1, 'and then it is')
  p.reset()
  assert.equal(p.tier, START)
})
