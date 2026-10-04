// client/scene/marchPace.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MARCH_TIERS, MarchPace } from './marchPace.ts'

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
/** A display of 60 frames a second: a frame that takes less still takes a sixtieth. The rest of the view takes `rest` ms, the pass what `pass` says. */
const capped = (rest: number, pass: (tier: number) => number, timer = true): Cost => (tier) => ({ dt: Math.max(HZ60, rest + pass(tier)), ...(timer ? { pass: pass(tier) } : {}) })
/** No display's limit (a check run): a frame takes what it costs. */
const uncapped = (rest: number, pass: (tier: number) => number, timer = true): Cost => (tier) => ({ dt: rest + pass(tier), ...(timer ? { pass: pass(tier) } : {}) })
const LAST = MARCH_TIERS.length - 1

test('the tiers: what the march gives up when the frames are slow, the least seen first: the step budget, then the noise\'s finest octave, then the ground shadows, then its size (0.35, 0.25 of the view)', () => {
  assert.deepEqual(MARCH_TIERS[0], { steps: 128, detail: 0, shadows: true, scale: 0.5 }, 'the first tier is the look as it was')
  const given = MARCH_TIERS.slice(1).map((t, k) => {
    const b = MARCH_TIERS[k]
    return [t.steps < b.steps ? 'steps' : '', t.detail > b.detail ? 'detail' : '', b.shadows && !t.shadows ? 'shadows' : '', t.scale < b.scale ? 'size' : ''].filter((w) => w !== '').join('+')
  })
  assert.deepEqual(given, ['steps', 'detail', 'shadows', 'size', 'size'], 'each tier gives up one thing more, and takes nothing back')
  assert.deepEqual(MARCH_TIERS.map((t) => t.scale), [0.5, 0.5, 0.5, 0.5, 0.35, 0.25])
  for (const t of MARCH_TIERS) assert.ok(t.steps >= 48 && t.steps <= 128 && Number.isInteger(t.steps) && (t.detail === 0 || t.detail === 1))
})

test('MarchPace: the march starts at the first tier, and stays there while the frames are quick, whatever the pass costs', () => {
  const p = new MarchPace()
  assert.equal(p.tier, 0)
  assert.deepEqual(run(p, capped(4, () => 9), 120), [0], 'a sixtieth each, 9 ms of it the pass\'s: nothing is lost')
  assert.deepEqual(run(p, HZ60, 60), [0], 'nor with no word of the pass')
})

test('MarchPace: the first eight seconds are not looked at: the view is loading then, and slow whatever the march', () => {
  const p = new MarchPace()
  const slow = capped(10, () => 30)
  assert.deepEqual(run(p, slow, 10), [0], 'slow from the start, for 10 s: the first 8 do not count, and 2 are not a while')
  assert.deepEqual(run(p, HZ60, 60), [0], 'then quick: nothing changed')
  const q = new MarchPace()
  assert.deepEqual(run(q, slow, 14), [0, 1], 'slow for 14 s: the 6 after the start are a while')
})

test('MarchPace: frames made slow by the pass make the march coarser, tier by tier, until they are within 15 % of what the view takes without it (or of a sixtieth); there it stays', () => {
  const pass = (tier: number): number => [12, 10, 9, 8, 4, 2][tier]
  const p = new MarchPace()
  assert.deepEqual(run(p, capped(14, pass), 120), [0, 1, 2, 3, 4], '14 ms and the pass: 26, 24, 23, 22, then 18 ms, which is within 15 % of a sixtieth')
  assert.deepEqual(run(p, capped(14, pass), 1800), [4], 'held for half an hour')
  const q = new MarchPace()
  assert.deepEqual(run(q, uncapped(30, (tier) => [20, 12, 8, 6, 4, 2][tier]), 300), [0, 1, 2, 3, 4], 'a view of 30 ms: the pass may take 4.5')
})

test('MarchPace: frames that are slow for another reason leave the march alone: the pass\'s own time says that it is not the pass', () => {
  const p = new MarchPace()
  assert.deepEqual(run(p, capped(45, () => 3), 600), [0], '48 ms a frame, 3 of them the pass\'s')
  assert.deepEqual(run(p, uncapped(45, () => 6.5), 600), [0], '6.5 of 51.5: within 15 %')
  assert.deepEqual(run(p, uncapped(45, (tier) => (tier === 0 ? 9 : 6)), 60), [0, 1], '9 of 54 is not')
})

test('MarchPace: where the frames wait for the main thread and not for the graphics card, the pass may take long on the card and cost no frame: a coarser tier that makes the pass quicker and the frames no quicker is taken back, and no coarser one is tried while the view stays as it is', () => {
  let dear = 1
  const pass = (tier: number): number => [18.8, 13.6, 13.5, 13, 9.5, 8.5][tier] * dear
  /** The main thread takes 22 ms a frame; the card draws the rest of the view in 3 ms and the pass beside it. */
  const cost: Cost = (tier) => ({ dt: Math.max(22, 3 + pass(tier)), pass: pass(tier) })
  const p = new MarchPace()
  assert.deepEqual(run(p, cost, 60), [0, 1, 0], '22 ms with the pass at 18.8 ms and at 13.6 ms: not the pass')
  assert.deepEqual(run(p, cost, 3600), [0], 'held for an hour')
  dear = 1.6 // the view has changed: the pass at 30 ms, and now the card is what the frames wait for (33 ms)
  assert.deepEqual(run(p, cost, 120), [0, 1, 2, 3, 4, 1], 'tried again: the first step makes the frames quicker by all the pass saved (24.8 ms): kept; the later ones by under half (22 ms, the main thread\'s): back to it')
  assert.deepEqual(run(p, cost, 3600), [1], 'and held')
  // the same main thread with a cheaper pass, and then the main thread quick again (the globe's tiles have come)
  const q = new MarchPace()
  let [main, scale] = [22, 1 / 1.6]
  const other: Cost = (tier) => ({ dt: Math.max(HZ60, main, 3 + pass(tier) * scale), pass: pass(tier) * scale })
  dear = 1
  assert.deepEqual(run(q, other, 60), [0, 1, 0])
  main = 8
  assert.deepEqual(run(q, other, 600), [0], 'a sixtieth a frame now: nothing to do')
  scale = 1.6 // and a dearer view: the card is what the frames wait for, and the march is free to go coarser again
  assert.deepEqual(run(q, other, 120), [0, 1, 2, 3, 4], '33, 25, 25, 24, then 18 ms')
})

test('MarchPace: a machine that is slow at the last tier too keeps the last tier: nothing is tried again, so nothing flickers', () => {
  const p = new MarchPace()
  const cost = capped(14, (tier) => [60, 50, 45, 40, 30, 20][tier])
  assert.deepEqual(run(p, cost, 120), [0, 1, 2, 3, 4, LAST])
  assert.deepEqual(run(p, cost, 3600), [LAST], 'an hour on')
})

test('MarchPace: it never goes to and fro: where one tier is quick enough and the finer one is not, it stays at the one, for hours', () => {
  for (const cost of [capped(8, (tier) => [12, 11.8, 11.5, 6, 3, 2][tier]), uncapped(20, (tier) => [9, 6, 2.9, 2, 1, 0.5][tier]), capped(4, (tier) => [16, 15.5, 12.5, 8, 4, 2][tier])]) {
    const p = new MarchPace()
    const seen = run(p, cost, 4 * 3600)
    assert.deepEqual(seen, [...seen].sort((a, b) => a - b), `never finer again: ${seen}`)
    assert.ok(seen.length >= 2 && seen.at(-1)! < LAST)
  }
})

test('MarchPace: when the view gets cheap again the march grows finer again, tier by tier: the pass\'s time, times what the step down saved, says that the finer tier would fit', () => {
  let heavy = true
  const pass = (tier: number): number => [12, 10, 9, 8, 4, 2][tier] * (heavy ? 1 : 0.1)
  const p = new MarchPace()
  assert.deepEqual(run(p, capped(14, pass), 120), [0, 1, 2, 3, 4])
  heavy = false // the camera has come back to the aircraft: the pass costs a tenth
  assert.deepEqual(run(p, capped(14, pass), 120), [4, 3, 2, 1, 0])
  assert.deepEqual(run(p, capped(14, pass), 600), [0])
  heavy = true
  assert.deepEqual(run(p, capped(14, pass), 120), [0, 1, 2, 3, 4], 'and coarser again when it is dear again')
})

test('MarchPace: on a display, where a quick frame hides how much time is to spare, it tries the finer tier when the pass has become much cheaper than it was when that tier was too slow; a try that fails is taken back, and the next needs the pass cheaper still', () => {
  let [rest, k] = [8, 1] // the rest of the view, ms; and how dear the pass is
  const PASS = [12, 11.8, 11.5, 6, 3, 2]
  const now: Cost = (tier) => ({ dt: Math.max(HZ60, rest + PASS[tier] * k), pass: PASS[tier] * k })
  const p = new MarchPace()
  assert.deepEqual(run(p, now, 120), [0, 1, 2, 3], '8 + 11.5 ms was too slow, 8 + 6 fits')
  k = 0.8
  assert.deepEqual(run(p, now, 600), [3], 'a fifth cheaper: the finer tier, 9.2 ms, is not much cheaper than the 11.5 ms that were too slow')
  k = 0.5
  assert.deepEqual(run(p, now, 120), [3, 2, 1, 0], 'half: tried, and it fits (8 + 5.75 ms), and so do the tiers before it')
  k = 1
  assert.deepEqual(run(p, now, 120), [0, 1, 2, 3])
  rest = 14 // the view itself is dearer now
  k = 0.5
  assert.deepEqual(run(p, now, 120), [3, 2, 3], 'half again: tried, but 14 + 5.75 ms is too slow now: taken back')
  assert.deepEqual(run(p, now, 3600), [3], 'and not tried again while the pass costs the same')
  k = 0.4
  assert.deepEqual(run(p, now, 600), [3], 'nor a little cheaper')
  k = 0.2
  assert.deepEqual(run(p, now, 120), [3, 2, 1, 0], 'much cheaper than at the failed try: tried again, and it fits')
})

test('MarchPace: with no word of the pass\'s time (a browser without the timer) slow frames still make the march coarser; a step that made the frames a tenth quicker is kept', () => {
  const p = new MarchPace()
  run(p, HZ60, 10) // the start
  assert.deepEqual(run(p, 30, 3), [0], 'three seconds of slow frames: not yet')
  assert.deepEqual(run(p, capped(14, (tier) => [16, 4, 4, 4, 2, 1][tier], false), 60), [0, 1], 'a while more: coarser, and quick for it: kept')
  const q = new MarchPace()
  assert.deepEqual(run(q, capped(14, (tier) => [26, 16, 12, 9, 4, 2][tier], false), 60), [0, 1, 2, 3, 4], '40, 30, 26, 23, then 18 ms')
})

test('MarchPace: with no word of the pass\'s time, a march made coarser down to its first smaller size without the frames getting a tenth quicker is not what makes them slow: it goes back to where it was, and nothing is tried again', () => {
  const p = new MarchPace()
  const cost: Cost = (tier) => ({ dt: 33 - 0.2 * tier })
  assert.deepEqual(run(p, cost, 120), [0, 1, 2, 3, 4, 0], 'as slow as before: back')
  assert.deepEqual(run(p, 33, 600), [0], 'held')
  assert.deepEqual(run(p, 80, 600), [0])
  const q = new MarchPace()
  assert.deepEqual(run(q, (tier) => ({ dt: tier === 0 ? 40 : 30 }), 240), [0, 1, 2, 3, 4, 1], 'the first step helped (30 for 40 ms): kept; the later ones not: back to it')
  assert.deepEqual(run(q, 50, 600), [1], 'held there')
})

test('MarchPace: with no word of the pass\'s time it tries a finer tier after a minute of quick frames; a try that fails is taken back, the next comes after twice as long, and after three failed tries none', () => {
  const p = new MarchPace()
  const cost = capped(14, (tier) => [12, 10, 9, 8, 4, 2][tier], false) // tier 4 fits (18 ms), tier 3 does not (22 ms)
  assert.deepEqual(run(p, cost, 60), [0, 1, 2, 3, 4])
  const seen = run(p, cost, 4 * 3600)
  assert.deepEqual(seen, [4, 3, 4, 3, 4, 3, 4], 'three tries in four hours')
  const q = new MarchPace()
  let heavy = true
  const view = capped(14, (tier) => [12, 10, 9, 8, 4, 2][tier] * (heavy ? 1 : 0.1), false)
  run(q, view, 60)
  heavy = false
  const back = run(q, view, 600)
  assert.deepEqual(back, [4, 3, 2, 1, 0], 'when the view is cheap again every try holds: back to the first tier, a minute a tier')
})

test('MarchPace: a hitch is not a while: slow runs between quick ones change nothing, and a gap that is no frame (the tab was hidden) is not counted', () => {
  const p = new MarchPace()
  for (let k = 0; k < 20; k++) {
    run(p, capped(10, () => 30), 2)
    run(p, capped(10, () => 3), 3)
  }
  assert.equal(p.tier, 0)
  for (let k = 0; k < 400; k++) {
    p.frame(HZ60, 3)
    p.frame(5000, 3)
  }
  assert.equal(p.tier, 0)
  p.frame(Number.NaN)
  p.frame(-5, Number.NaN)
  assert.equal(p.tier, 0)
})

test('MarchPace: reset starts again at the first tier, watching', () => {
  const p = new MarchPace()
  run(p, (tier) => ({ dt: 33 - 0.2 * tier }), 120) // taken back and held
  run(p, 40, 30)
  assert.equal(p.tier, 0, 'held')
  p.reset()
  run(p, 40, 7)
  assert.equal(p.tier, 0, 'after a reset the start is not looked at again')
  run(p, 40, 7)
  assert.equal(p.tier, 1, 'and then it tries again')
  p.reset()
  assert.equal(p.tier, 0)
})
