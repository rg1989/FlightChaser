// tools/scenarios/new.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseScenario } from '../../client/scenario/format.ts'
import { physicsReport } from '../../client/scenario/physics.ts'
import { destination } from '../../shared/geo.ts'
import { packageFromFlight } from './new.ts'

const T0 = Date.UTC(2026, 8, 30, 10, 0, 0)

/** One of the app's own recordings: 40 s rolling to 150 kt on 300°, then a climb at 160 kt and 2,000 fpm, a point every 2 s. */
function recording(hex: string, t0: number): string {
  const lines: unknown[] = [{ flight: { v: 1, hex, callsign: 'ELY315', reg: '4X-EKA', typeCode: 'B738', category: 'A3', route: 'LLBG-EGLL', startedMs: t0 } }]
  let at = { lat: 32.0, lon: 34.87 }
  for (let i = 0; i <= 100; i++) {
    const t = i * 2
    const ground = t < 40
    const gs = ground ? Math.min(150, t * 4) : 160
    if (i > 0) at = destination(at.lat, at.lon, 300, (gs * 2) / 3600)
    const alt = ground ? null : Math.round(((t - 40) * 2000) / 60 / 25) * 25 + 135
    lines.push({ s: { tMs: t0 + t * 1000, lat: at.lat, lon: at.lon, onGround: ground, altBaroFt: alt, altGeomFt: alt === null ? null : alt + 150, gsKt: gs, trackDeg: 300, iasKt: ground ? null : 155, baroRateFpm: ground ? 0 : 2000 } })
  }
  return lines.map((l) => JSON.stringify(l)).join('\n')
}

test('a flight file becomes a package that loads, flies like an aircraft, and leaves its words to the author', () => {
  const files = packageFromFlight(recording('738abc', T0), { id: 'my-flight', model: 'b738', fileName: 'ely315.jsonl' })
  const s = parseScenario({ base: '', manifest: JSON.parse(files['scenario.json']), track: files['track.csv'], events: files['events.csv'], transcript: null, present: { body: false, finLogo: false, audio: false } })
  assert.deepEqual([s.id, s.title, s.subtitle, s.date, s.clockLabel, s.aircraft.model, s.aircraft.registration], ['my-flight', 'ELY315', 'LLBG → EGLL', '2026-09-30', 'UTC', 'b738', '4X-EKA'])
  assert.equal(s.track.length, 201, 'a row a second')
  assert.ok(s.track.every((r) => r.q === 'A' && r.src === 'TRACK'), 'every row within 5 s of a point of the file')
  assert.ok(s.events.some((e) => e.type === 'mark' && e.label === 'Take-off'))
  assert.equal(s.gearFromHeight, true, 'no gear events: the gear follows the height')
  assert.deepEqual(physicsReport(s.track).problems, [])
  assert.match(files['scenario.json'], /TODO/, 'the note and the source are the author\'s to write')
})

test('a flight that is not in the file, and a file that is no flight, say so', () => {
  assert.throws(() => packageFromFlight(recording('738abc', T0), { id: 'x', model: 'b738', fileName: 'f', flight: 3 }), /No flight 3/)
  assert.throws(() => packageFromFlight('hello', { id: 'x', model: 'b738', fileName: 'f' }), /Not a flight file/)
})
