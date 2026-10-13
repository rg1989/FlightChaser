// client/scenario/fromRecording.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { RecordingInfo } from '../../shared/api.ts'
import type { Sample } from '../../shared/types.ts'
import { destination, distanceNm } from '../../shared/geo.ts'
import { recordingFile, recordingId, recordingScenario } from './fromRecording.ts'
import { physicsReport } from './physics.ts'

const T0 = Date.UTC(2026, 8, 30, 10, 0, 0)
const FILE = '2026-09-30/100000Z-ELY315-738abc.jsonl'
const INFO: RecordingInfo = {
  file: FILE, name: null, hex: '738abc', callsign: 'ELY315', reg: '4X-EKA', typeCode: 'B738', category: 'A3', military: false,
  route: 'LLBG-EGLL', source: 'adsbfi', startedMs: T0, firstMs: T0, lastMs: null, samples: 0, ended: null, active: false,
}

/** A take-off from Ben Gurion on 300°: 40 s rolling to 150 kt, then a climb at 160 kt and 2,000 fpm, a sample every 2 s. */
function takeOff(): Sample[] {
  const out: Sample[] = []
  let at = { lat: 32.0, lon: 34.87 }
  for (let i = 0; i <= 100; i++) {
    const t = i * 2
    const ground = t < 40
    const gs = ground ? Math.min(150, t * 4) : 160
    if (i > 0) at = destination(at.lat, at.lon, 300, (gs * 2) / 3600)
    const alt = ground ? null : Math.round(((t - 40) * 2000) / 60 / 25) * 25 + 135
    out.push({
      hex: '738abc', tMs: T0 + t * 1000, rxMs: T0 + t * 1000 + 800, lat: at.lat, lon: at.lon, onGround: ground,
      altBaroFt: alt, altGeomFt: alt === null ? null : alt + 150, gsKt: gs, trackDeg: 300, trueHeadingDeg: null, rollDeg: null,
      baroRateFpm: ground ? 0 : 2000, geomRateFpm: null, navQnhHpa: null, version: 2, nic: 8, quality: 'adsb2', nM: 18,
      callsign: 'ELY315', typeCode: 'B738', reg: '4X-EKA',
    } as Sample)
  }
  return out
}

test('recordingId / recordingFile: a recording\'s scenario id and back; a package id names no file', () => {
  assert.equal(recordingId(FILE), 'rec:2026-09-30/100000Z-ELY315-738abc')
  assert.equal(recordingFile(recordingId(FILE)), FILE)
  assert.equal(recordingFile('jal123'), null)
})

test('recordingScenario: a row a second over the whole recording, UTC, on the live estimator; take-off marked; gear by height', () => {
  const samples = takeOff()
  const s = recordingScenario({ info: INFO, samples: [...samples].reverse() }, 'b738')!
  assert.equal(s.id, 'rec:2026-09-30/100000Z-ELY315-738abc')
  assert.deepEqual([s.title, s.subtitle, s.date, s.clockLabel, s.aircraft.model, s.aircraft.registration], ['ELY315', 'LLBG → EGLL', '2026-09-30', 'UTC', 'b738', '4X-EKA'])
  assert.equal(s.gearFromHeight, true)
  assert.equal(s.t0UtcMs + s.start * 1000, T0)
  assert.equal(s.end - s.start, 200)
  assert.equal(s.track.length, 201)
  for (let i = 1; i < s.track.length; i++) assert.equal(s.track[i].t - s.track[i - 1].t, 1)
  const lift = s.events.find((e) => e.label === 'Take-off')
  assert.ok(lift && Math.abs(s.t0UtcMs + lift.t * 1000 - (T0 + 40_000)) <= 2000, 'take-off marked when the wheels leave')
  const end = s.track.at(-1)!
  assert.ok(Math.abs(end.altFt - (135 + (160 * 2000) / 60 + 150 - 18 / 0.3048)) < 150, `climbs: ${end.altFt} ft MSL at the end`)
  assert.ok(Math.abs(end.hdg - 300) < 5, `nose on the track: ${end.hdg}`)
  assert.ok(end.pitch > 3 && end.pitch < 15, `climbing nose-up: ${end.pitch}°`)
  assert.deepEqual(physicsReport(s.track).problems, [], 'the packages\' physics gate passes')
})

test('recordingScenario: too little to play is null', () => {
  assert.equal(recordingScenario({ info: INFO, samples: [] }, 'b738'), null)
  assert.equal(recordingScenario({ info: INFO, samples: takeOff().slice(0, 1) }, 'b738'), null)
})

/**
 * A cruise at 450 kt and 35,000 ft, a point every `gapS` seconds: as sparse as a file found elsewhere may be. East for
 * 200 s, a right turn to the south at 0.75° a second (a 17° bank), then south.
 */
function sparse(withVelocity: boolean, gapS: number): Sample[] {
  const out: Sample[] = []
  let at = { lat: 32.0, lon: 30.0 }
  let track = 90
  for (let t = 0; t <= 11 * gapS; t++) {
    if (t > 0) at = destination(at.lat, at.lon, track, 450 / 3600)
    if (t >= 200 && t < 320) track += 0.75
    if (t % gapS !== 0) continue
    out.push({
      hex: '738abc', tMs: T0 + t * 1000, rxMs: T0 + t * 1000, lat: at.lat, lon: at.lon, onGround: false,
      altBaroFt: 35_000, altGeomFt: null, gsKt: withVelocity ? 450 : null, trackDeg: withVelocity ? track : null, trueHeadingDeg: null, rollDeg: null,
      baroRateFpm: null, geomRateFpm: null, navQnhHpa: null, version: null, nic: null, quality: 'adsb2', nM: 18,
      callsign: 'ELY315', typeCode: 'B738', reg: '4X-EKA',
    })
  }
  return out
}

for (const [withVelocity, gapS] of [[true, 40], [false, 40], [false, 90]] as const) {
  test(`recordingScenario: points ${gapS} s apart ${withVelocity ? 'with' : 'without'} speed and track are flown between, through a turn too`, () => {
    const info: RecordingInfo = { ...INFO, source: 'KML file', ended: { why: 'imported', endedMs: T0 } }
    const s = recordingScenario({ info, samples: sparse(withVelocity, gapS) }, 'b738')!
    assert.equal(s.track.length, 11 * gapS + 1)
    assert.equal(s.track[0].src, 'KML file')
    // The first seconds have one point to go by: judged from the second point on.
    const rows = s.track.slice(gapS)
    const kt = rows.slice(1).map((r, i) => distanceNm(rows[i].lat, rows[i].lon, r.lat, r.lon) * 3600)
    assert.ok(Math.min(...kt) > 380 && Math.max(...kt) < 520, `no stop and no jump: ${Math.min(...kt).toFixed(0)} to ${Math.max(...kt).toFixed(0)} kt`)
    const roll = rows.map((r) => r.roll)
    assert.ok(Math.max(...roll) > 10 && Math.max(...roll) < 30 && Math.min(...roll) > -8, `a banked right turn, no more: ${Math.min(...roll).toFixed(0)}° to ${Math.max(...roll).toFixed(0)}°`)
    assert.ok(Math.abs(rows[0].hdg - 90) < 8 && Math.abs(rows.at(-1)!.hdg - 180) < 8, `east, then south: ${rows[0].hdg.toFixed(0)}° to ${rows.at(-1)!.hdg.toFixed(0)}°`)
    assert.ok(rows.every((r) => Math.abs(r.altFt - 35_000) < 60), 'level')
  })
}
