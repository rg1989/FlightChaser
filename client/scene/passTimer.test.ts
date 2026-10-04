// client/scene/passTimer.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { passTimer, type QueryGl } from './passTimer.ts'

const TIME_ELAPSED = 0x88bf
const DISJOINT = 0x8fbb
/** A graphics context that keeps what is asked of it: each query's time is given by `ns` when it ends, and is there to read `lag` polls later. */
function fakeGl(o: { ext?: boolean; lag?: number } = {}) {
  const log: string[] = []
  let [made, deleted, open, polls] = [0, 0, null as { id: number; ns: number; ended: number } | null, 0]
  const queries = new Map<object, { id: number; ns: number; ended: number }>()
  const state = { ns: 1_000_000, disjoint: false, lag: o.lag ?? 1 }
  const gl: QueryGl = {
    QUERY_RESULT: 0x8866, QUERY_RESULT_AVAILABLE: 0x8867,
    getExtension: (name) => (log.push(`ext ${name}`), o.ext === false ? null : { TIME_ELAPSED_EXT: TIME_ELAPSED, GPU_DISJOINT_EXT: DISJOINT }),
    createQuery: () => {
      const q = {}
      queries.set(q, { id: ++made, ns: 0, ended: -1 })
      return q
    },
    deleteQuery: (q) => {
      deleted++
      queries.delete(q as object)
    },
    beginQuery: (target, q) => {
      assert.equal(target, TIME_ELAPSED)
      assert.equal(open, null, 'one query at a time')
      open = queries.get(q as object)!
      log.push(`begin ${open.id}`)
    },
    endQuery: (target) => {
      assert.equal(target, TIME_ELAPSED)
      assert.notEqual(open, null)
      open!.ns = state.ns
      open!.ended = polls
      log.push(`end ${open!.id}`)
      open = null
    },
    getQueryParameter: (q, what) => {
      const s = queries.get(q as object)!
      return what === 0x8867 ? polls - s.ended >= state.lag : s.ns
    },
    getParameter: (what) => (what === DISJOINT ? state.disjoint : 0),
  }
  return { gl, log, state, made: (): number => made, left: (): number => made - deleted, poll: (): void => void polls++ }
}
/** A stage: its draw is noted, and tells the context how long it takes. */
function stage(name: string, f: ReturnType<typeof fakeGl>, ms: number) {
  const s = { drawn: 0, execute(...args: unknown[]): void { s.drawn++; f.log.push(`${name} ${args.join(',')}`); f.state.ns = ms * 1e6 } }
  return s
}

test('passTimer: none without a graphics context that has timer queries (the browser\'s EXT_disjoint_timer_query_webgl2)', () => {
  assert.equal(passTimer(undefined), null)
  assert.equal(passTimer({}), null, 'no queries at all (WebGL 1)')
  assert.equal(passTimer(fakeGl({ ext: false }).gl), null)
  assert.notEqual(passTimer(fakeGl().gl), null)
})

test('passTimer: each stage\'s draw is wrapped in a query of its own, the stage drawn as it was (its arguments passed on); a frame\'s times are added up once all have come, some frames later: the pass\'s time, ms', () => {
  const f = fakeGl({ lag: 2 })
  const t = passTimer(f.gl)!
  assert.ok(Number.isNaN(t.ms), 'not known yet')
  const [march, mix] = [stage('march', f, 6.5), stage('mix', f, 0.75)]
  t.watch([march, mix])
  const frame = (): void => {
    t.poll()
    f.poll()
    march.execute('ctx', 1)
    mix.execute('ctx', 2)
  }
  frame()
  assert.deepEqual(f.log.slice(1), ['begin 1', 'march ctx,1', 'end 1', 'begin 2', 'mix ctx,2', 'end 2'])
  assert.ok(Number.isNaN(t.ms))
  frame()
  assert.ok(Number.isNaN(t.ms), 'the card has not answered yet')
  frame()
  t.poll()
  assert.equal(t.ms, 7.25)
  assert.deepEqual([march.drawn, mix.drawn], [3, 3])
})

test('passTimer: one frame in four is timed (a query is not free), and its queries are given back when read', () => {
  const f = fakeGl()
  const t = passTimer(f.gl)!
  const s = stage('march', f, 2)
  t.watch([s])
  for (let k = 0; k < 40; k++) {
    t.poll()
    f.poll()
    s.execute()
  }
  assert.equal(s.drawn, 40, 'every frame is drawn')
  assert.equal(f.made(), 10)
  assert.ok(f.left() <= 1, 'none kept')
  assert.equal(t.ms, 2)
})

test('passTimer: an answer that comes tens of frames late is taken all the same (a quick machine draws many frames before the card answers)', () => {
  const f = fakeGl({ lag: 40 })
  const t = passTimer(f.gl)!
  const s = stage('march', f, 3.5)
  t.watch([s])
  for (let k = 0; k < 39; k++) {
    t.poll()
    f.poll()
    s.execute()
  }
  assert.ok(Number.isNaN(t.ms), 'not yet')
  for (let k = 0; k < 4; k++) {
    t.poll()
    f.poll()
    s.execute()
  }
  assert.equal(t.ms, 3.5)
  assert.ok(f.left() <= 11, 'the queries in flight, no more')
})

test('passTimer: times read while the card says its timer was disturbed (a disjoint) are thrown away; a stage that is not drawn in a frame leaves that frame without a time; other stages watched take the first ones\' place', () => {
  const f = fakeGl()
  const t = passTimer(f.gl)!
  const [a, b] = [stage('a', f, 3), stage('b', f, 1)]
  t.watch([a, b])
  const frames = (n: number, draw: () => void): void => {
    for (let k = 0; k < n; k++) {
      t.poll()
      f.poll()
      draw()
    }
  }
  frames(8, () => (a.execute(), b.execute()))
  assert.equal(t.ms, 4)
  f.state.disjoint = true
  a.execute = a.execute // (still wrapped)
  frames(8, () => (f.state.ns = 99e6, a.execute(), b.execute()))
  assert.equal(t.ms, 4, 'what was read during the disturbance is not believed')
  f.state.disjoint = false
  frames(8, () => a.execute()) // b is not drawn (its pass is not ready)
  assert.equal(t.ms, 4, 'half a pass is no pass')
  const c = stage('c', f, 9)
  t.watch([c])
  frames(8, () => (a.execute(), c.execute()))
  assert.equal(t.ms, 9, 'only c is watched now; a is drawn untimed')
  assert.ok(f.left() <= 2)
})

test('passTimer: the last timed frame\'s time is there stage by stage too, in the order the stages were given (the bench\'s line says the march and the mix apart)', () => {
  const f = fakeGl()
  const t = passTimer(f.gl)!
  assert.deepEqual(t.parts, [], 'none yet')
  const [march, mix] = [stage('march', f, 6.5), stage('mix', f, 0.75)]
  t.watch([march, mix])
  for (let k = 0; k < 8; k++) {
    t.poll()
    f.poll()
    march.execute()
    mix.execute()
  }
  assert.deepEqual(t.parts, [6.5, 0.75])
  assert.equal(t.ms, 7.25)
})

test('passTimer: a card that never answers (its queries are never there to read) is given up on: the queries waiting are few, however long it runs, no more are made, and the time stays unknown', () => {
  const f = fakeGl({ lag: Infinity })
  const t = passTimer(f.gl)!
  const s = stage('march', f, 2)
  t.watch([s])
  for (let k = 0; k < 4000; k++) {
    t.poll()
    f.poll()
    s.execute()
  }
  assert.equal(s.drawn, 4000, 'every frame is drawn')
  assert.ok(Number.isNaN(t.ms))
  assert.equal(f.left(), 0, 'none is left on the card')
  assert.ok(f.made() <= 64, `it stopped asking: ${f.made()} queries made`)
  assert.equal(t.dead, true)
})

test('passTimer: a card that answers late but does answer is not given up on', () => {
  const f = fakeGl({ lag: 100 })
  const t = passTimer(f.gl)!
  const s = stage('march', f, 2)
  t.watch([s])
  for (let k = 0; k < 600; k++) {
    t.poll()
    f.poll()
    s.execute()
  }
  assert.equal(t.ms, 2)
  assert.equal(t.dead, false)
  assert.ok(f.left() <= 27, 'the queries in flight, no more')
})

test('passTimer: when other stages are watched (a new pass, or none) the time of the ones before is not theirs: it is unknown until the new ones have been timed, and an answer still on its way for the old ones is not taken', () => {
  const f = fakeGl({ lag: 3 })
  const t = passTimer(f.gl)!
  const [a, b] = [stage('a', f, 3), stage('b', f, 7)]
  t.watch([a])
  const frames = (n: number, draw: () => void): void => {
    for (let k = 0; k < n; k++) {
      t.poll()
      f.poll()
      draw()
    }
  }
  frames(9, () => a.execute())
  assert.equal(t.ms, 3)
  t.watch([b]) // (a query of a's is still on its way)
  assert.ok(Number.isNaN(t.ms) && t.parts.length === 0, 'not known for the new ones yet')
  frames(3, () => b.execute())
  assert.ok(Number.isNaN(t.ms), 'the old one\'s late answer is not the new pass\'s time')
  frames(8, () => b.execute())
  assert.equal(t.ms, 7)
  t.watch([])
  assert.ok(Number.isNaN(t.ms), 'no pass: no time')
  t.watch([])
  frames(8, () => b.execute())
  assert.ok(Number.isNaN(t.ms))
  assert.ok(f.left() <= 1)
})
