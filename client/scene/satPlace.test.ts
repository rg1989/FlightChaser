// client/scene/satPlace.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DRIFT_MAX_KM, driftKm, parallaxKm, satZenithDeg } from './satPlace.ts'

const RAD = Math.PI / 180
const size = (m: { east: number; north: number }): number => Math.hypot(m.east, m.north)
/** The way a move points, degrees true. */
const way = (m: { east: number; north: number }): number => (Math.atan2(m.east, m.north) / RAD + 360) % 360
/** The first bearing of the great circle from a place to the point under the satellite (0° N). */
function bearingToSat(lat: number, lon: number, satLon = 0): number {
  const d = (satLon - lon) * RAD
  return (Math.atan2(Math.sin(d), -Math.sin(lat * RAD) * Math.cos(d)) / RAD + 360) % 360
}

test('satZenithDeg: the satellite stands overhead at the point under it, at about 53° over Israel, and on the horizon 81° away', () => {
  assert.ok(Math.abs(satZenithDeg(0, 0)) < 1e-6)
  assert.ok(Math.abs(satZenithDeg(32, 35) - 52.9) < 0.3, String(satZenithDeg(32, 35)))
  assert.ok(Math.abs(satZenithDeg(0, 81.3) - 90) < 0.2, String(satZenithDeg(0, 81.3)))
  assert.ok(Math.abs(satZenithDeg(32, 35, 45.5) - 39) < 1, String(satZenithDeg(32, 35, 45.5))) // from the Indian Ocean satellite
})

test('parallaxKm: nothing at the point under the satellite, whatever the height; nothing for a cloud on the ground', () => {
  for (const h of [1000, 10_000, 16_000]) assert.ok(size(parallaxKm(0, 0, h)) < 1e-6)
  assert.ok(size(parallaxKm(32, 35, 0)) < 1e-9)
  assert.ok(size(parallaxKm(50, 8, -5)) < 1e-9)
})

test('parallaxKm: a 10 km top over Israel is moved about 13 km, toward the point under the satellite (south-west)', () => {
  const m = parallaxKm(32, 35, 10_000)
  assert.ok(size(m) > 12.5 && size(m) < 14, String(size(m)))
  assert.ok(m.east < 0 && m.north < 0)
  assert.ok(Math.abs(way(m) - bearingToSat(32, 35)) < 1.5, `${way(m)} against ${bearingToSat(32, 35)}`)
  assert.ok(Math.abs(bearingToSat(32, 35) - 232.9) < 0.1)
})

test('parallaxKm: about the height times the tangent of the satellite\'s zenith angle, in proportion to the height', () => {
  for (const [lat, lon] of [[32, 35], [50, 8], [-26, 28], [60, 25], [10, -40]]) {
    const m = parallaxKm(lat, lon, 8000)
    const flat = 8 * Math.tan(satZenithDeg(lat, lon) * RAD)
    assert.ok(Math.abs(size(m) / flat - 1) < 0.03, `${lat}, ${lon}: ${size(m)} against ${flat}`)
    assert.ok(Math.abs(way(m) - bearingToSat(lat, lon)) < 2, `${lat}, ${lon}: ${way(m)} against ${bearingToSat(lat, lon)}`)
    assert.ok(Math.abs(size(parallaxKm(lat, lon, 4000)) / size(m) - 0.5) < 0.01)
  }
})

test('parallaxKm: on the equator east of the satellite a cloud is moved west; south of it, north; from the Indian Ocean satellite Israel\'s cloud moves 8 km south-east', () => {
  const east = parallaxKm(0, 50, 10_000)
  assert.ok(east.east < -10 && Math.abs(east.north) < 1e-6)
  const south = parallaxKm(-30, 0, 10_000)
  assert.ok(south.north > 5 && Math.abs(south.east) < 1e-6)
  const iodc = parallaxKm(32, 35, 10_000, 45.5)
  assert.ok(size(iodc) > 7 && size(iodc) < 9, String(size(iodc)))
  assert.ok(iodc.east > 0 && iodc.north < 0)
})

test('parallaxKm: a place the satellite does not see is not moved', () => {
  assert.deepEqual(parallaxKm(0, 100, 10_000), { east: 0, north: 0 })
  assert.deepEqual(parallaxKm(Number.NaN, 0, 10_000), { east: 0, north: 0 })
})

test('driftKm: the wind carries a cloud downwind for the frame\'s age', () => {
  const west = driftKm({ fromDeg: 270, kt: 30 }, 20 * 60_000) // a west wind blows east: 30 kt for a third of an hour
  assert.ok(Math.abs(west.east - 18.52) < 0.01 && Math.abs(west.north) < 1e-9, JSON.stringify(west))
  const north = driftKm({ fromDeg: 0, kt: 60 }, 15 * 60_000)
  assert.ok(Math.abs(north.north + 27.78) < 0.01 && Math.abs(north.east) < 1e-9)
  const sw = driftKm({ fromDeg: 225, kt: 40 }, 30 * 60_000)
  assert.ok(sw.east > 0 && sw.north > 0 && Math.abs(size(sw) - 37.04) < 0.01)
})

test('driftKm: no more than 40 km, the same way; nothing with no wind, no age, or a number that is none', () => {
  assert.equal(DRIFT_MAX_KM, 40)
  const jet = driftKm({ fromDeg: 270, kt: 100 }, 30 * 60_000) // 92.6 km
  assert.ok(Math.abs(jet.east - 40) < 1e-9 && Math.abs(jet.north) < 1e-9)
  const far = driftKm({ fromDeg: 225, kt: 150 }, 35 * 60_000)
  assert.ok(Math.abs(size(far) - 40) < 1e-9 && Math.abs(far.east - far.north) < 1e-9)
  for (const m of [driftKm(null, 20 * 60_000), driftKm({ fromDeg: 270, kt: 30 }, 0), driftKm({ fromDeg: 270, kt: 30 }, -5), driftKm({ fromDeg: Number.NaN, kt: 30 }, 60_000), driftKm({ fromDeg: 90, kt: 30 }, Number.NaN)]) {
    assert.deepEqual(m, { east: 0, north: 0 })
  }
})
