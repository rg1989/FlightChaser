// client/scene/fieldPlace.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REACH_KM, RIM_KM } from './cloudShaders.ts'
import { FIELD_LEAD_KM, FIELD_SLACK_KM, fieldCentre, fieldDue, fieldRoomKm } from './fieldPlace.ts'
import { REBUILD_KM } from './cloudField.ts'

const KM_PER_DEG = 111.195
const RAD = Math.PI / 180
const LAT = 37.6
const LON = -122.4
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol
/** A place on a centre's flat map (the field's own): km east and north of the centre. */
const onMap = (c: { lat: number; lon: number }, lat: number, lon: number): [number, number] => [(lon - c.lon) * KM_PER_DEG * Math.cos(c.lat * RAD), (lat - c.lat) * KM_PER_DEG]
/** The place km along trackDeg from lat, lon (on the plane round it: these are tens of km). */
const fly = (lat: number, lon: number, trackDeg: number, km: number): { lat: number; lon: number } =>
  ({ lat: lat + (km * Math.cos(trackDeg * RAD)) / KM_PER_DEG, lon: lon + (km * Math.sin(trackDeg * RAD)) / (KM_PER_DEG * Math.cos(lat * RAD)) })

test('the field\'s slack: the volume shows the weather whole within 130 km of the aircraft, and a field whole within 150 km of its middle on each axis: 20 km to spare each way; and no aircraft a field serves is further from its middle than the 30 km the sources are read past their reach', () => {
  assert.equal(FIELD_SLACK_KM, RIM_KM[0] - REACH_KM[0])
  assert.equal(FIELD_SLACK_KM, 20)
  assert.equal(FIELD_LEAD_KM, 5)
  assert.ok(Math.SQRT2 * FIELD_SLACK_KM < REBUILD_KM, 'the square\'s corner')
})

test('fieldCentre: ahead of the aircraft on its track, as far as leaves the aircraft just inside the square: 20 km on a track along an axis, 28 km on a diagonal (it starts in the corner); with no track, the aircraft\'s own place', () => {
  const north = fieldCentre(LAT, LON, 0)
  assert.ok(near(north.lon, LON, 1e-9) && near((north.lat - LAT) * KM_PER_DEG, 20, 1e-9), JSON.stringify(north))
  for (const [track, x, y] of [[0, 0, -20], [90, -20, 0], [180, 0, 20], [270, 20, 0], [45, -20, -20], [225, 20, 20], [30, -20 * Math.tan(30 * RAD), -20], [300, 20, -20 * Math.tan(30 * RAD)]]) {
    const c = fieldCentre(LAT, LON, track)
    const [ex, ny] = onMap(c, LAT, LON)
    assert.ok(near(ex, x, 1e-6) && near(ny, y, 1e-6), `track ${track}: the aircraft is at ${ex}, ${ny} on the field's map`)
  }
  assert.deepEqual(fieldCentre(LAT, LON, undefined), { lat: LAT, lon: LON })
  assert.deepEqual(fieldCentre(LAT, LON, Number.NaN), { lat: LAT, lon: LON })
  const far = fieldCentre(10, 179.95, 90)
  assert.ok(far.lon < -179.8 && far.lon > -180, `across the antimeridian: ${far.lon}`)
})

test('fieldRoomKm: how far the aircraft can still fly on its track before it leaves the square: the whole square at a build (40 km along an axis, 57 km on a diagonal), less as it flies, nothing once outside; on another track, the way that track has', () => {
  for (const [track, room] of [[0, 40], [90, 40], [45, 40 * Math.SQRT2], [30, 40 / Math.cos(30 * RAD)], [200, 40 / Math.cos(20 * RAD)]]) {
    const c = fieldCentre(LAT, LON, track)
    assert.ok(near(fieldRoomKm(c, LAT, LON, track), room, 1e-3), `track ${track}: ${fieldRoomKm(c, LAT, LON, track)} for ${room}`)
    const on = fly(LAT, LON, track, 12)
    assert.ok(near(fieldRoomKm(c, on.lat, on.lon, track), room - 12, 0.05), `12 km on: ${fieldRoomKm(c, on.lat, on.lon, track)}`)
    const out = fly(LAT, LON, track, room + 1)
    assert.equal(fieldRoomKm(c, out.lat, out.lon, track), 0, 'outside')
  }
  const c = fieldCentre(LAT, LON, 0) // the aircraft 20 km south of the middle
  assert.ok(near(fieldRoomKm(c, LAT, LON, 180), 0, 1e-6), 'turned round at the square\'s side: no way left')
  assert.ok(near(fieldRoomKm(c, LAT, LON, 90), 20, 1e-3), 'eastward along the side: 20 km to the corner')
  const mid = fly(LAT, LON, 0, 20)
  assert.ok(near(fieldRoomKm(c, mid.lat, mid.lon, 270), 20, 0.05) && near(fieldRoomKm(c, mid.lat, mid.lon, 135), 20 * Math.SQRT2, 0.05), 'from the middle')
})

test('fieldRoomKm: with no track, the way to the square\'s nearest side', () => {
  const c = { lat: LAT, lon: LON }
  assert.equal(fieldRoomKm(c, LAT, LON, undefined), 20)
  const p = fly(LAT, LON, 60, 10) // 8.7 km east, 5 km north
  assert.ok(near(fieldRoomKm(c, p.lat, p.lon, undefined), 20 - 10 * Math.sin(60 * RAD), 0.05))
  const out = fly(LAT, LON, 90, 21)
  assert.equal(fieldRoomKm(c, out.lat, out.lon, undefined), 0)
})

test('fieldDue: the next field is asked for 5 km before the one drawn runs out, and at once when there is none', () => {
  const c = fieldCentre(LAT, LON, 0)
  const at = (km: number): boolean => {
    const p = fly(LAT, LON, 0, km)
    return fieldDue(c, p.lat, p.lon, 0)
  }
  assert.deepEqual([at(0), at(20), at(34.9), at(35.1), at(45)], [false, false, false, true, true])
  assert.equal(fieldDue({ lat: Number.NaN, lon: Number.NaN }, LAT, LON, 0), true, 'no field yet')
  assert.equal(fieldDue(c, Number.NaN, LON, 0), true)
})

test('the cadence: at 450 kt (13.9 km a minute) a field is built every 35 km along an axis and every 52 km on a diagonal, 2.5 to 3.7 minutes, where one was built every 30 km (2.2 minutes)', () => {
  const kmPerS = (450 * 1.852) / 3600
  /** Km flown between builds, looking once a second (Weather3D's look). */
  const between = (track: number): number => {
    let [here, c, flown] = [{ lat: LAT, lon: LON }, fieldCentre(LAT, LON, track), 0]
    const builds: number[] = []
    for (let s = 0; s < 1200; s++) {
      here = fly(here.lat, here.lon, track, kmPerS)
      flown += kmPerS
      if (fieldDue(c, here.lat, here.lon, track)) {
        builds.push(flown)
        c = fieldCentre(here.lat, here.lon, track)
      }
    }
    assert.ok(builds.length >= 4, `${builds.length} builds in 20 minutes`)
    const gaps = builds.slice(1).map((b, i) => b - builds[i])
    assert.ok(Math.max(...gaps) - Math.min(...gaps) < 0.5, 'evenly')
    return gaps[0]
  }
  assert.ok(near(between(0), 35, 0.3), `${between(0)}`)
  assert.ok(near(between(90), 35, 0.3), `${between(90)}`)
  assert.ok(near(between(45), 40 * Math.SQRT2 - 5, 0.4), `${between(45)}`)
  assert.ok(between(20) > 35 && between(20) < 40 * Math.SQRT2 - 5)
  assert.ok(near(35 / kmPerS / 60, 2.52, 0.01) && near((40 * Math.SQRT2 - 5) / kmPerS / 60, 3.71, 0.01) && near(30 / kmPerS / 60, 2.16, 0.01))
})
