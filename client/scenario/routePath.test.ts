// client/scenario/routePath.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scenarioRoute } from './routePath.ts'
import type { EventRow, TrackRow } from './types.ts'

const row = (t: number, lat: number, lon: number, altFt: number, gnd = false): TrackRow => ({
  t, lat, lon, altFt, hdg: 90, pitch: 0, roll: 0, gnd, iasKt: null, gsKt: null, vsFpm: null, g: null, windFromDeg: null, windKt: null, epr: null, q: null, src: null,
})
const ev = (t: number, type: EventRow['type'], label: string): EventRow => ({ t, type, value: '', label, src: null })

test('scenarioRoute: the path from start to end with its heights, the marks where the aircraft was, the box round it', () => {
  // A climb east along the equator: 100 s on the ground, then 10,000 ft by t = 400.
  const track = [row(0, 0, 10, 0, true), row(100, 0, 10.1, 0, true), row(400, 0, 11, 10_000), row(500, 0, 11.4, 10_000)]
  const events = [ev(50, 'phase', 'Taxi'), ev(250, 'mark', 'Halfway up'), ev(900, 'mark', 'After the end')]
  const r = scenarioRoute({ track, events, start: 100, end: 500 })
  assert.equal(r.path.length, 401) // a point a second
  assert.equal(r.path[0].tMs, 100_000)
  assert.equal(r.path.at(-1)!.tMs, 500_000)
  assert.equal(r.path[0].onGround, true)
  assert.equal(r.path.at(-1)!.onGround, false)
  assert.ok(Math.abs(r.path.at(-1)!.altFt! - 10_000) < 1)
  for (let i = 1; i < r.path.length; i++) assert.ok(r.path[i].lon >= r.path[i - 1].lon, `eastward at ${i}`)
  // Only the marks on the timeline, each on the path at its time (the point of that second).
  assert.deepEqual(r.marks.map((m) => m.label), ['Halfway up'])
  const at = r.path[150]
  assert.equal(at.tMs, 250_000)
  assert.ok(Math.abs(r.marks[0].lon - at.lon) < 1e-9 && Math.abs(r.marks[0].lat - at.lat) < 1e-9)
  assert.ok(r.marks[0].hM > 300 && r.marks[0].hM < 3048 + 100) // in the climb
  assert.ok(Math.abs(r.box.west - 10.1) < 1e-6 && Math.abs(r.box.east - 11.4) < 1e-6)
})

test('scenarioRoute: a long flight is thinned to 4,000 steps', () => {
  const track = [row(0, 0, 0, 30_000), row(20_000, 0, 30, 30_000)]
  assert.equal(scenarioRoute({ track, events: [], start: 0, end: 20_000 }).path.length, 4001)
})
