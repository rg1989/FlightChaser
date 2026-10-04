// client/scene/fieldBuilder.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fieldBuilder, type WorkerLike } from './fieldBuilder.ts'
import { makeField, packSpecs, type FieldJob, type FieldMade } from './wxFieldJob.ts'

const SPEC = { lon: 20.1, lat: 11.1, heightM: 2000, scale: [3000, 1300] as [number, number] }
const job = (id: number): FieldJob => ({ id, specs: packSpecs([SPEC]), lat: 10 + id, lon: 20, noise: false })

/** A worker that keeps what it is sent, and answers when told. */
function fakeWorker() {
  const posted: FieldJob[] = []
  let terminated = 0
  const w: WorkerLike = {
    onmessage: null, onerror: null, onmessageerror: null,
    postMessage: (j) => void posted.push(j),
    terminate: () => void terminated++,
  }
  return {
    w, posted,
    terminated: (): number => terminated,
    /** The worker's answer to the ask it was sent `n`th. */
    answer: (n: number): void => w.onmessage?.({ data: makeField(posted[n]) }),
    fail: (): void => w.onerror?.(new Error('the script did not load')),
  }
}

test('fieldBuilder: with no worker (Node; a browser without one) a field asked for is made at once, on the caller\'s thread', () => {
  const b = fieldBuilder(null)
  const got: FieldMade[] = []
  b.ask(job(1), (m) => got.push(m))
  assert.equal(got.length, 1, 'before ask returns')
  assert.deepEqual([got[0].id, got[0].field.lat], [1, 11])
  b.ask(job(2), (m) => got.push(m))
  assert.deepEqual(got.map((m) => m.id), [1, 2])
  b.destroy()
})

test('fieldBuilder: the default builder in Node has no worker', () => {
  const b = fieldBuilder()
  let told = 0
  b.ask(job(1), () => told++)
  assert.equal(told, 1)
  b.destroy()
})

test('fieldBuilder: with a worker the ask is sent to it, and the caller is told when it answers, not before', () => {
  const f = fakeWorker()
  const b = fieldBuilder(() => f.w)
  const got: number[] = []
  const j = job(1)
  b.ask(j, (m) => got.push(m.id))
  assert.deepEqual(got, [])
  assert.deepEqual(f.posted, [j])
  assert.equal(j.specs.length, 7, 'the ask is kept whole (its numbers are copied to the worker, not handed over): should the worker fail, it is made here')
  f.answer(0)
  assert.deepEqual(got, [1])
})

test('fieldBuilder: one field is made at a time: an ask that comes meanwhile waits, and a later one takes its place (the one between is never made); every field made is told', () => {
  const f = fakeWorker()
  const b = fieldBuilder(() => f.w)
  const got: number[] = []
  for (const id of [1, 2, 3]) b.ask(job(id), (m) => got.push(m.id))
  assert.deepEqual(f.posted.map((j) => j.id), [1], 'only the first is with the worker')
  f.answer(0)
  assert.deepEqual(got, [1], 'the first is told, though later asks wait: the old field would otherwise stand until they are all made')
  assert.deepEqual(f.posted.map((j) => j.id), [1, 3], 'then the latest; 2 is skipped')
  f.answer(1)
  assert.deepEqual(got, [1, 3])
  b.ask(job(4), (m) => got.push(m.id))
  assert.deepEqual(f.posted.map((j) => j.id), [1, 3, 4], 'idle again: sent at once')
})

test('fieldBuilder: a worker that fails is ended, and its work is done on the caller\'s thread from then on: the latest ask at once, later ones as they come; it says so once', (t) => {
  const warn = t.mock.method(console, 'warn', () => {})
  const f = fakeWorker()
  const b = fieldBuilder(() => f.w)
  const got: number[] = []
  b.ask(job(1), (m) => got.push(m.id))
  b.ask(job(2), (m) => got.push(m.id))
  f.fail()
  assert.equal(f.terminated(), 1)
  assert.deepEqual(got, [2], 'the ask that waited is the latest: it is made; the one the worker had is not')
  b.ask(job(3), (m) => got.push(m.id))
  assert.deepEqual(got, [2, 3])
  assert.equal(f.posted.length, 1, 'nothing more is sent')
  f.fail()
  assert.equal(warn.mock.callCount(), 1)
  const g = fakeWorker()
  const one = fieldBuilder(() => g.w)
  const seen: number[] = []
  one.ask(job(5), (m) => seen.push(m.id))
  g.w.onmessageerror?.(null)
  assert.deepEqual(seen, [5], 'an answer that cannot be read is a failure too; the ask the worker had is made here')
})

test('fieldBuilder: a worker that cannot be started, or cannot be sent to, is no worker', (t) => {
  t.mock.method(console, 'warn', () => {})
  const b = fieldBuilder(() => {
    throw new Error('no workers here')
  })
  const got: number[] = []
  b.ask(job(1), (m) => got.push(m.id))
  assert.deepEqual(got, [1])
  const f = fakeWorker()
  f.w.postMessage = () => {
    throw new Error('cannot be cloned')
  }
  const c = fieldBuilder(() => f.w)
  c.ask(job(2), (m) => got.push(m.id))
  assert.deepEqual(got, [1, 2])
  assert.equal(f.terminated(), 1)
})

test('fieldBuilder: destroyed, the worker is ended and nothing is told any more', () => {
  const f = fakeWorker()
  const b = fieldBuilder(() => f.w)
  const got: number[] = []
  b.ask(job(1), (m) => got.push(m.id))
  b.destroy()
  assert.equal(f.terminated(), 1)
  f.answer(0)
  b.ask(job(2), (m) => got.push(m.id))
  assert.deepEqual(got, [])
  b.destroy()
  assert.equal(f.terminated(), 1, 'once')
})
