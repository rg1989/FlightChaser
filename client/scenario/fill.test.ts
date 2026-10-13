// client/scenario/fill.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { destination, distanceNm } from '../../shared/geo.ts'
import type { Sample } from '../../shared/types.ts'
import { fillGaps } from './fill.ts'

const T0 = Date.UTC(2026, 8, 30, 10, 0, 0)
const at = (s: number, o: Partial<Sample> = {}): Sample => ({
  hex: '738abc', tMs: T0 + s * 1000, rxMs: T0 + s * 1000 + 500, ...destination(32, 34.9, 90, (300 * s) / 3600), onGround: false,
  altBaroFt: 10_000, altGeomFt: null, gsKt: 300, trackDeg: 90, trueHeadingDeg: 92, rollDeg: 1, baroRateFpm: 0, geomRateFpm: null,
  navQnhHpa: 1013, version: 2, nic: 8, quality: 'adsb2', nM: 18, callsign: 'ELY315', typeCode: 'B738', reg: '4X-EKA', iasKt: 250, ...o,
})

test('fillGaps: a gap of over 8 s gets a point each 2 s on the path between, with its speed, track and height; shorter gaps stay', () => {
  const samples = [at(0), at(8), at(48, { altBaroFt: 12_000 }), at(50, { altBaroFt: 12_000 })]
  const out = fillGaps(samples)
  assert.deepEqual(out.map((s) => (s.tMs - T0) / 1000), [0, 8, ...Array.from({ length: 20 }, (_, i) => 10 + i * 2), 50])
  assert.deepEqual([out[0], out[1], out.at(-2), out.at(-1)], samples, 'the samples themselves are as they were')
  const mid = out[11] // 28 s: half way
  assert.ok(distanceNm(mid.lat, mid.lon, at(28).lat, at(28).lon) < 0.02, 'on the straight line, at its time')
  assert.ok(Math.abs(mid.gsKt! - 300) < 3 && Math.abs(mid.trackDeg! - 90) < 1, `${mid.gsKt} kt on ${mid.trackDeg}°`)
  assert.equal(mid.altBaroFt, 11_000)
  assert.deepEqual([mid.rxMs, mid.rollDeg, mid.trueHeadingDeg, mid.baroRateFpm, mid.iasKt, mid.typeCode], [mid.tMs, null, null, null, null, 'B738'], 'nothing is made up beyond the path')
})

test('fillGaps: without speed and track the positions either side give the velocity; ground to air stays down, air to ground has no height', () => {
  const bare = { gsKt: null, trackDeg: null }
  const out = fillGaps([at(0, bare), at(40, bare), at(80, bare)])
  const mid = out.find((s) => s.tMs === T0 + 20_000)!
  assert.ok(distanceNm(mid.lat, mid.lon, at(20).lat, at(20).lon) < 0.05 && Math.abs(mid.gsKt! - 300) < 5)

  const ground = { onGround: true, altBaroFt: null, gsKt: 20 }
  const off = fillGaps([at(0, ground), at(20, { altBaroFt: 800 })]).slice(1, -1)
  assert.ok(off.length === 9 && off.every((s) => s.onGround && s.altBaroFt === null))
  const land = fillGaps([at(0, { altBaroFt: 800 }), at(20, ground)]).slice(1, -1)
  assert.ok(land.every((s) => !s.onGround && s.altBaroFt === null))
})
