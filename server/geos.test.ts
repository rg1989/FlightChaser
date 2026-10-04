// server/geos.test.ts
// The geostationary projection against places worked out another way: by plain geometry on the equator, and for any place through
// its Earth-centred coordinates (the textbook geodetic formula, not the specification's geocentric one). The figures written out
// were computed with that second way in Python on 2026-10-04.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GEOS, SEVIRI, geosAngles, seviriLattice, seviriPixel } from './geos.ts'

const RAD = Math.PI / 180
const near = (a: number, b: number, eps: number, what: string): void => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} against ${b}`)

/** The same angles through the place's Earth-centred coordinates: X towards the satellite's meridian on the equator, Z north. */
function byCoordinates(lat: number, lon: number, subLon: number): [number, number] {
  const e2 = 1 - GEOS.rpolKm ** 2 / GEOS.reqKm ** 2
  const n = GEOS.reqKm / Math.sqrt(1 - e2 * Math.sin(lat * RAD) ** 2)
  const x = n * Math.cos(lat * RAD) * Math.cos((lon - subLon) * RAD)
  const y = n * Math.cos(lat * RAD) * Math.sin((lon - subLon) * RAD)
  const z = n * (1 - e2) * Math.sin(lat * RAD)
  return [Math.atan2(y, GEOS.hKm - x) / RAD, Math.atan2(z, Math.hypot(GEOS.hKm - x, y)) / RAD]
}

test('geosAngles: the point under the satellite is straight ahead; a place on the equator stands east by plain geometry; north is up', () => {
  assert.deepEqual(geosAngles(0, 0, 0), [0, 0])
  assert.deepEqual(geosAngles(0, 45.5, 45.5), [0, 0])
  const [x, y] = geosAngles(0, 30, 0)!
  near(x, Math.atan((GEOS.reqKm * Math.sin(30 * RAD)) / (GEOS.hKm - GEOS.reqKm * Math.cos(30 * RAD))) / RAD, 1e-12, 'a place 30° east on the equator')
  near(x, 4.974346508, 1e-9, 'the same, as computed beforehand')
  assert.equal(y, 0)
  assert.ok(geosAngles(0, -30, 0)![0] < 0 && geosAngles(40, 0, 0)![1] > 0 && geosAngles(-40, 0, 0)![1] < 0, 'west is minus, north is plus')
})

test('geosAngles: any place, as its Earth-centred coordinates give it', () => {
  for (const [lat, lon, sub] of [[32.0853, 34.7818, 0], [64.1466, -21.9426, 0], [-33.9249, 18.4241, 0], [51.5, -0.1, 0], [-70, 40, 0], [12, -60, 0], [32.0853, 34.7818, 45.5], [10, 100, 45.5], [0, 179, 140.7], [0, -179, 140.7]]) {
    const got = geosAngles(lat, lon, sub)
    assert.ok(got !== null, `${lat}, ${lon} is seen from ${sub}°`)
    const want = byCoordinates(lat, lon, sub)
    near(got[0], want[0], 1e-10, `${lat}, ${lon}: east`)
    near(got[1], want[1], 1e-10, `${lat}, ${lon}: north`)
  }
  const telAviv = geosAngles(32.0853, 34.7818, 0)!
  near(telAviv[0], 4.676442624, 1e-9, 'Tel Aviv: east')
  near(telAviv[1], 5.085731389, 1e-9, 'Tel Aviv: north')
})

test('geosAngles: a place past the Earth\'s edge as the satellite sees it is not seen', () => {
  // The edge on the equator is acos(a / h) = 81.30° from the point under the satellite; on its meridian, 81.33° of latitude.
  assert.ok(geosAngles(0, 81.2, 0) !== null && geosAngles(0, -81.2, 0) !== null)
  assert.equal(geosAngles(0, 81.4, 0), null)
  assert.equal(geosAngles(0, -81.4, 0), null)
  assert.ok(geosAngles(81.2, 0, 0) !== null && geosAngles(-81.2, 0, 0) !== null)
  assert.equal(geosAngles(81.5, 0, 0), null)
  assert.equal(geosAngles(0, 180, 0), null, 'the far side')
  assert.equal(geosAngles(32, 34.8, -135), null, 'Israel from over the Pacific')
  assert.ok(geosAngles(0, 100, 45.5) !== null, 'a satellite farther east sees farther east')
  assert.equal(geosAngles(Number.NaN, 0, 0), null)
})

test('seviriPixel: the point under the satellite is the middle of pixel 1856 of 3712 counted from the south-east (1855 from 0); columns run west, rows north', () => {
  assert.deepEqual(seviriPixel(0, 0, 0), [1855, 1855])
  assert.deepEqual([SEVIRI.n, SEVIRI.mid, SEVIRI.block, SEVIRI.blocks], [3712, 1855, 3, 1237])
  near(SEVIRI.perDeg, 208.165543, 1e-6, 'pixels to a degree of the satellite\'s view: 13,642,337 / 65,536, the specification\'s figure')
  const [col, row] = seviriPixel(32.0853, 34.7818, 0)!
  near(col, 881.525784, 1e-5, 'Tel Aviv\'s column (east of the middle: a lower column)')
  near(row, 2913.674034, 1e-5, 'Tel Aviv\'s row (north of the middle: a higher row)')
  const cape = seviriPixel(-33.9249, 18.4241, 0)!
  near(cape[0], 1317.611484, 1e-5, 'Cape Town\'s column')
  near(cape[1], 722.872078, 1e-5, 'Cape Town\'s row')
  const iceland = seviriPixel(64.1466, -21.9426, 0)!
  near(iceland[0], 2168.999002, 1e-5, 'Reykjavik\'s column (west of the middle)')
  near(iceland[1], 3565.36747, 1e-5, 'Reykjavik\'s row')
  const other = seviriPixel(32.0853, 34.7818, 45.5)! // the Indian Ocean satellite's picture
  near(other[0], 2180.525051, 1e-5, 'Tel Aviv from 45.5° E: west of the middle')
  near(other[1], 2941.789265, 1e-5, 'Tel Aviv from 45.5° E: its row')
  assert.equal(seviriPixel(0, 120, 0), null)
})

test('seviriPixel: the whole disc lies inside the picture, with room to its corners', () => {
  // The Earth's edge east and west on the equator, and north and south on the meridian: 44 to 56 pixels in from the picture's sides.
  const east = seviriPixel(0, 81.29, 0)!
  const west = seviriPixel(0, -81.29, 0)!
  const north = seviriPixel(81.3, 0, 0)!
  const south = seviriPixel(-81.3, 0, 0)!
  assert.ok(east[0] > 43 && east[0] < 45 && west[0] > 3665 && west[0] < 3667, `${east[0]} ${west[0]}`)
  assert.ok(south[1] > 49 && south[1] < 52 && north[1] > 3658 && north[1] < 3661, `${south[1]} ${north[1]}`)
  near(east[0] + west[0], 2 * 1855, 1e-9, 'east and west are as far from the middle')
  near(north[1] + south[1], 2 * 1855, 1e-9, 'north and south too')
})

test('seviriLattice: each cell of a box\'s lattice (rows from the north, a cell\'s middle half a cell in) is the pixel its middle falls in, as row × 3712 + column', () => {
  const box = [27.5, 29.5, 36.5, 40] as const
  const n = 9
  const cells = seviriLattice(box, n, 0)
  assert.equal(cells.length, n * n)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const lat = box[2] - ((j + 0.5) / n) * (box[2] - box[0])
      const lon = box[1] + ((i + 0.5) / n) * (box[3] - box[1])
      const [col, row] = seviriPixel(lat, lon, 0)!
      assert.equal(cells[j * n + i], Math.round(row) * SEVIRI.n + Math.round(col), `cell ${i}, ${j}`)
    }
  }
  assert.ok(cells[0] > cells[n * n - 1], 'the north-west cell is a later pixel than the south-east one: the picture starts in the south-east')
})

test('seviriLattice: a cell the satellite does not see is −1; a box across the antimeridian is read on past 180°', () => {
  const edge = seviriLattice([-5, 70, 5, 90], 4, 0) // 72.5°, 77.5°, 82.5°, 87.5° east: the last two are past the edge
  assert.deepEqual([...edge].map((c) => c >= 0), [true, true, false, false, true, true, false, false, true, true, false, false, true, true, false, false])
  const far = seviriLattice([-5, 170, 5, 190], 2, 140.7) // from over the western Pacific
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const [col, row] = seviriPixel(2.5 - 5 * j, 175 + 10 * i, 140.7)!
      assert.equal(far[j * 2 + i], Math.round(row) * SEVIRI.n + Math.round(col))
    }
  }
})
