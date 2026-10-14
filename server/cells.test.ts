// server/cells.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { destination, distanceNm } from '../shared/geo.ts'
import { cellBox, cellById, cellsForView } from './cells.ts'

/** Deterministic PRNG (mulberry32) so the property test is reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WHOLE_EARTH_NM = 10_900 // > half the circumference: every cell intersects

test('grid: 32 bands of 5.625°, in each the fewest columns whose circles fit in 250 nm, ids b{band}:{col}', () => {
  // KSFO (37.62, −122.38): band floor((37.62+90)/5.625) = 22, φc = 36.5625°, 52 columns of 6.92°, column 8
  const c = cellById('b22:8')
  assert.equal(c.id, 'b22:8')
  assert.equal(c.lat, 36.5625)
  assert.ok(Math.abs(c.lon - -121.1538) < 1e-4, `lon ${c.lon}`)
  assert.throws(() => cellById('b22:52'), /unknown cell/)
  // bands 15 and 16 meet at the equator: 64 columns of 5.625°; polar bands: 5 columns of 72°
  assert.equal(cellById('b16:0').lat, 2.8125)
  assert.equal(cellById('b16:0').lon, -177.1875)
  assert.doesNotThrow(() => cellById('b16:63'))
  assert.throws(() => cellById('b16:64'), /unknown cell/)
  assert.equal(cellById('b31:0').lat, 87.1875)
  assert.equal(cellById('b31:0').lon, -144)
  assert.doesNotThrow(() => cellById('b0:4'))
  assert.throws(() => cellById('b0:5'), /unknown cell/)
  assert.throws(() => cellById('b32:0'), /unknown cell/)
  assert.throws(() => cellById('nonsense'), /unknown cell/)
})

test('every cell: query radius = half-diagonal + 10 nm, 235 to 250 nm; cellById round-trips', () => {
  const all = cellsForView(0, 0, WHOLE_EARTH_NM)
  assert.equal(all.length, 1332)
  assert.equal(new Set(all.map((c) => c.id)).size, all.length)
  for (const c of all) {
    // About as big as the 250 nm limit allows; the polar bands' five columns reach 235 nm (four would not fit).
    assert.ok(c.radiusNm >= 235 && c.radiusNm <= 250, `${c.id} radius ${c.radiusNm}`)
    assert.deepEqual(cellById(c.id), c)
  }
  // b22:8 spans 33.75–39.375° N, 124.62–117.69° W; the far (equatorward) corner is ≈ 240 nm from its centre
  const k = cellById('b22:8')
  const halfDiag = distanceNm(k.lat, k.lon, 33.75, -124.6154)
  assert.ok(k.radiusNm >= halfDiag + 10 && k.radiusNm < halfDiag + 11, `radius ${k.radiusNm}, half-diagonal ${halfDiag}`)
})

test('a wide view over Europe takes 10, 20, 44 cells at 400, 600, 1,000 nm (4° cells took 19, 34, 74)', () => {
  assert.deepEqual([400, 600, 1000].map((nm) => cellsForView(48, 10, nm).length), [10, 20, 44])
})

test('a small view in the middle of a cell needs only that cell', () => {
  for (const id of ['b22:8', 'b16:0', 'b26:10', 'b8:40']) {
    const c = cellById(id)
    assert.deepEqual(cellsForView(c.lat, c.lon, 20).map((x) => x.id), [id])
  }
})

test('returned cells are exactly those whose query circle intersects the view circle', () => {
  const view = { lat: 37.6188, lon: -122.3758, nm: 40 }
  const got = new Set(cellsForView(view.lat, view.lon, view.nm).map((c) => c.id))
  assert.ok(got.has('b22:8'))
  for (const c of cellsForView(0, 0, WHOLE_EARTH_NM)) {
    const hits = distanceNm(view.lat, view.lon, c.lat, c.lon) <= c.radiusNm + view.nm
    assert.equal(got.has(c.id), hits, c.id)
  }
})

test('coverage: every point of the view lies inside some returned query circle (poles, ±80°, antimeridian)', () => {
  const views: [number, number, number][] = [
    [37.6188, -122.3758, 40], // KSFO
    [32.0114, 34.8867, 150], // LLBG
    [47.2602, 11.3439, 5], // LOWI, tiny view
    [0, 179.9, 200], // equator, antimeridian
    [65, -179.95, 250], // high latitude, antimeridian
    [79.7, 20, 150], // near +80°
    [-79.9, -60, 120], // near −80°
    [89.5, 45, 100], // contains the north pole
    [-88, 170, 250], // near the south pole, antimeridian
    [2, 0, 1], // tiny view
    [5.625, 0, 1], // band edge, tiny view
    [48, 10, 1000], // a wide view
  ]
  const rand = rng(42)
  for (const [lat, lon, nm] of views) {
    const cells = cellsForView(lat, lon, nm)
    assert.ok(cells.length > 0)
    for (let i = 0; i < 400; i++) {
      const p = destination(lat, lon, rand() * 360, nm * Math.sqrt(rand()))
      const covered = cells.some((c) => distanceNm(p.lat, p.lon, c.lat, c.lon) <= c.radiusNm)
      assert.ok(covered, `view (${lat}, ${lon}, ${nm}): point (${p.lat}, ${p.lon}) not covered`)
    }
  }
})

test('cellBox: 5.625° tall, as wide as its band\'s step, around the cell; the boxes of a band meet edge to edge at ±180', () => {
  assert.deepEqual(cellBox(cellById('b0:0')), [-90, -84.375, -180, -108]) // five columns at the pole
  const band = cellsForView(0, 0, 13_000).filter((c) => c.id.startsWith('b16:')).sort((a, b) => a.lon - b.lon)
  const boxes = band.map(cellBox)
  assert.deepEqual([boxes[0][0], boxes[0][1], boxes[0][2], boxes.at(-1)![3]], [0, 5.625, -180, 180])
  for (let i = 1; i < boxes.length; i++) assert.equal(boxes[i][2], boxes[i - 1][3])
})

test('cells are shared, read-only objects', () => {
  const c = cellById('b22:8')
  assert.throws(() => {
    ;(c as { radiusNm: number }).radiusNm = 1
  }, TypeError)
})
