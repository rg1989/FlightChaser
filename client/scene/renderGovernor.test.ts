// client/scene/renderGovernor.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUDGET_MS, FrameTimer, QUALITY, QualityPace, STEP_RATIO, frameRate, frameTimer, type Activity, type FrameTimerGl } from './renderGovernor.ts'

const HZ60 = 1000 / 60
/**
 * s seconds of frames on a display of 60 a second (a frame takes a sixtieth, or the next one when the card needs longer), the card
 * taking cost[level] ms a frame; timer: whether the browser says so (each frame's time, as the governor's timer gives one in five).
 * The levels seen, in turn.
 */
function run(p: QualityPace, cost: readonly number[], s: number, timer = true, seen: number[] = [p.level]): number[] {
  let k = 0
  for (let t = 0; t < s * 1000;) {
    const ms = cost[p.level]
    const dt = Math.max(1, Math.ceil(ms / HZ60 - 1e-9)) * HZ60
    t += dt
    const level = p.frame(dt, HZ60, timer && k++ % 5 === 0 ? [ms] : [])
    if (level !== seen.at(-1)) seen.push(level)
  }
  return seen
}
// The card's time a frame at each level, as measured on the user's MacBook Air (M2), JAL 123 at Haneda: a small window
// (1470 × 833) and a 27" screen's (2499 × 1416); the coarser levels by the measured steps.
const SMALL = [8.9, 7.4, 5.9, 4.8, 4.0]
const LARGE = [17, 10.7, 8.4, 6.6, 5.3]

test('the levels: the first is the view as designed (4× MSAA, every pixel); each one after gives up something more and takes nothing back', () => {
  assert.deepEqual(QUALITY[0], { msaa: 4, fxaa: false, scale: 1 })
  for (let k = 1; k < QUALITY.length; k++) {
    const [b, q] = [QUALITY[k - 1], QUALITY[k]]
    assert.ok(q.msaa <= b.msaa && q.scale <= b.scale && (q.fxaa || q.msaa > 1), `level ${k} takes nothing back, and has some anti-aliasing`)
    assert.ok(q.msaa < b.msaa || q.scale < b.scale, `level ${k} gives something up`)
  }
  assert.ok(QUALITY.at(-1)!.scale >= 0.6, 'never coarser than 0.6 of the canvas each way')
  assert.equal(STEP_RATIO.length, QUALITY.length - 1)
  assert.ok(STEP_RATIO.every((r) => r > 1))
  assert.equal(BUDGET_MS, 10)
})

test('QualityPace: where the view as designed fits in the budget (the M2 in a small window), it stays as designed, for hours', () => {
  assert.deepEqual(run(new QualityPace(), SMALL, 4 * 3600), [0])
})

test('QualityPace: where it does not (the M2 at a 27" screen\'s size: 17 ms, the card full), it steps down within seconds to the first level that fits, and stays there without going to and fro', () => {
  const p = new QualityPace()
  assert.deepEqual(run(p, LARGE, 7.9), [0], 'two runs over the budget after the first five seconds, not one')
  assert.deepEqual(run(p, LARGE, 7), [0, 1, 2], 'FXAA (10.7 ms: still over), then 0.85 of the pixels (8.4 ms), within 15 s of the start')
  assert.deepEqual(run(p, LARGE, 3600), [2], 'an hour on: still there (1 would cost more than the budget again)')
})

test('QualityPace: the first seconds (the view loading) are not judged, and a step is judged only after the run that follows it', () => {
  const p = new QualityPace()
  assert.deepEqual(run(p, LARGE, 4.9), [0])
})

test('QualityPace: frames made slow now and then (a tile\'s upload in a third of them) do not cost the view its quality: the middle frame of a run is judged', () => {
  const p = new QualityPace()
  for (let t = 0, k = 0; t < 600_000; k++) {
    const ms = k % 3 === 0 ? 30 : 8.9
    const dt = Math.ceil(ms / HZ60 - 1e-9) * HZ60
    t += dt
    p.frame(dt, HZ60, k % 5 === 0 ? [ms] : [])
    assert.equal(p.level, 0)
  }
})

test('QualityPace: a smaller window has room again: back to the view as designed (resized), and down again if it does not fit', () => {
  const p = new QualityPace()
  run(p, LARGE, 30)
  assert.equal(p.level, 2)
  p.resized()
  assert.equal(p.level, 0)
  assert.deepEqual(run(p, SMALL, 600), [0])
  p.resized()
  assert.deepEqual(run(p, LARGE, 30), [0, 1, 2])
})

test('QualityPace: with a card that becomes quicker (another app let go of it) it goes back up a level at a time, and only to a level that would fit with room', () => {
  const p = new QualityPace()
  run(p, LARGE, 30)
  assert.equal(p.level, 2)
  const quicker = LARGE.map((ms) => ms * 0.5) // 8.5 ms as designed
  assert.deepEqual(run(p, quicker, 600), [2, 1, 0])
  const p2 = new QualityPace()
  run(p2, LARGE, 30)
  assert.deepEqual(run(p2, LARGE.map((ms) => ms * 0.85), 600), [2], 'level 1 would cost 9.1 ms, over the room (8.5): it stays')
})

test('QualityPace: without the card\'s word (a browser with no timer) slow frames make it coarser, and quick ones finer after half a minute, twice as long after each step down', () => {
  const p = new QualityPace()
  assert.deepEqual(run(p, LARGE, 15, false), [0, 1], 'frames of 33 ms where 17 are due: down to FXAA (10.7 ms: on time, which is all it can see)')
  const seen = run(p, LARGE, 600, false)
  assert.deepEqual(seen, [1, 0, 1, 0, 1, 0, 1], `it tries the view as designed again after 1, 2 and 4 minutes: ${seen.join(' ')}`)
  assert.deepEqual(run(new QualityPace(), SMALL, 3600, false), [0], 'on time as designed: as designed')
})

test('frameRate: every frame the display shows while something moves or the hand is on the view; fewer while only the map\'s aircraft move (30), a paused scenario holds still (15), the window is not in use (20, or 30 while the camera moves); the TV never held back', () => {
  const a = (o: Partial<Activity>): Activity => ({ tv: false, busy: false, moving: false, focused: true, paused: false, ...o })
  assert.equal(frameRate(a({ moving: true })), undefined, 'the chase: the camera follows the aircraft')
  assert.equal(frameRate(a({ busy: true })), undefined, 'the hand on the mouse, or tiles coming in')
  assert.equal(frameRate(a({ busy: true, focused: false, paused: true })), undefined)
  assert.equal(frameRate(a({})), 30, 'the map, held still: its aircraft move a pixel or so a frame')
  assert.equal(frameRate(a({ focused: false })), 20)
  assert.equal(frameRate(a({ moving: true, focused: false })), 30, 'a chase on another screen while the person types elsewhere')
  assert.equal(frameRate(a({ paused: true })), 15, 'a paused scenario: only the lights blink')
  assert.equal(frameRate(a({ paused: true, focused: false })), 15)
  assert.equal(frameRate(a({ tv: true, focused: false, paused: true })), undefined)
})

const TIME_ELAPSED = 0x88bf
const DISJOINT = 0x8fbb
/** A context whose queries answer `lag` frames after they end, with the time ns says; another query may be running (other). */
function fakeGl(o: { lag?: number; ext?: boolean } = {}) {
  let [made, deleted, frames] = [0, 0, 0]
  const queries = new Map<object, { ns: number; ended: number }>()
  const st = { ns: 9e6, disjoint: false, other: null as object | null, current: null as object | null, lag: o.lag ?? 2 }
  const gl: FrameTimerGl & { getExtension(n: string): unknown } = {
    QUERY_RESULT: 0x8866, QUERY_RESULT_AVAILABLE: 0x8867, CURRENT_QUERY: 0x8865,
    getExtension: () => (o.ext === false ? null : { TIME_ELAPSED_EXT: TIME_ELAPSED, GPU_DISJOINT_EXT: DISJOINT }),
    createQuery: () => (made++, {}),
    deleteQuery: (q) => void (deleted++, queries.delete(q as object)),
    beginQuery: (_, q) => {
      assert.equal(st.current ?? st.other, null, 'one query at a time')
      st.current = q as object
    },
    endQuery: () => {
      queries.set(st.current!, { ns: st.ns, ended: frames })
      st.current = null
    },
    getQuery: () => st.current ?? st.other,
    getQueryParameter: (q, what) => {
      const s = queries.get(q as object)
      return what === 0x8867 ? s !== undefined && frames - s.ended >= st.lag : s?.ns
    },
    getParameter: (what) => (what === DISJOINT ? st.disjoint : 0),
  }
  return { gl, st, made: (): number => made, left: (): number => made - deleted, next: (): void => void frames++ }
}

test('frameTimer: none without WebGL 2 and the timer query', () => {
  assert.equal(frameTimer(undefined), null)
  assert.equal(frameTimer({}), null)
  assert.equal(frameTimer(fakeGl({ ext: false }).gl), null)
  assert.ok(frameTimer(fakeGl().gl) instanceof FrameTimer)
})

test('FrameTimer: one frame in five is timed from its start to its end; the times come some frames later, and the queries are given back', () => {
  const f = fakeGl()
  const t = frameTimer(f.gl)!
  const got: number[] = []
  for (let k = 0; k < 50; k++) {
    t.begin()
    t.end()
    f.next()
    got.push(...t.take())
  }
  assert.equal(f.made(), 10)
  assert.ok(f.left() <= 1)
  assert.ok(got.length >= 9 && got.every((ms) => ms === 9))
})

test('FrameTimer: it does not start while another query runs (the cloud pass\'s), nor take a time the card says was disturbed, and gives up on a card that never answers', () => {
  const f = fakeGl()
  const t = frameTimer(f.gl)!
  f.st.other = {}
  for (let k = 0; k < 10; k++) (t.begin(), t.end(), f.next())
  assert.equal(f.made(), 0, 'the other query runs: no frame timed')
  f.st.other = null
  f.st.disjoint = true
  for (let k = 0; k < 20; k++) (t.begin(), t.end(), f.next())
  assert.deepEqual(t.take(), [])
  const dead = fakeGl({ lag: 1e9 })
  const td = frameTimer(dead.gl)!
  for (let k = 0; k < 400; k++) (td.begin(), td.end(), dead.next())
  assert.ok(td.dead)
  assert.equal(dead.left(), 0, 'its queries given back')
  const made = dead.made()
  for (let k = 0; k < 50; k++) (td.begin(), td.end(), dead.next())
  assert.equal(dead.made(), made, 'and no more made')
})
