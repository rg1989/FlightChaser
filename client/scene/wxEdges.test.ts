// client/scene/wxEdges.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Cartesian3, Matrix4 } from 'cesium'
import { geoidN } from '../../shared/geoid.ts'
import { localFrame } from './cloudVolume.ts'
import { EDGE_KM, EDGE_Q, EDGE_TEXELS, EDGE_TOP_KM, MAX_EDGES, POST_KM, hazardEdges, packEdges, unpackEdge, type HazardEdge } from './wxEdges.ts'
import { hazardsNear, type Hazard } from './wxGeo.ts'

const KM_PER_DEG = 111.195
const LAT = 37.6
const LON = -122.4
const RAD = Math.PI / 180
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol
/** The place eastKm and northKm of (lat, lon), on the field's flat map round it. */
const at = (eastKm: number, northKm: number, lat = LAT, lon = LON): { lat: number; lon: number } =>
  ({ lat: lat + northKm / KM_PER_DEG, lon: lon + eastKm / (KM_PER_DEG * Math.cos(lat * RAD)) })

type Ring = [number, number][]
const N0 = geoidN(LAT, LON)
const FRAME = localFrame(LAT, LON, N0)
const RED = (): string => '#ff5a5a'
/** A ring through places km east and north of the field's middle, closed as GeoJSON closes it. */
const ringKm = (corners: [number, number][]): Ring => {
  const r = corners.map(([e, n]): [number, number] => [at(e, n).lon, at(e, n).lat])
  return [...r, r[0]]
}
/** A ring of n corners on a circle of r km round a place eastKm east of the field's middle. */
const circle = (eastKm: number, r: number, n = 20): Ring => ringKm(Array.from({ length: n }, (_, i): [number, number] => [eastKm + r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]))
/** The hazard area of these rings, as wxGeo.ts picks it. */
const hazardOf = (rings: Ring[], o: { baseFt?: number | null; topFt?: number } = {}): Hazard =>
  hazardsNear([{ hazard: 'TS', qualifier: 'EMBD', base: o.baseFt ?? null, top: o.topFt ?? 35000, until: '', raw: '', rings }], LAT, LON, 5000)[0]
/** A corner of a ring in the field's frame, at sea level. */
const inFrame = ([lon, lat]: [number, number]): Cartesian3 => Matrix4.multiplyByPoint(FRAME, Cartesian3.fromDegrees(lon, lat, N0), new Cartesian3())
/** Km from a place of the frame to an edge. */
const kmTo = (e: HazardEdge, x = 0, y = 0): number => {
  const [dx, dy] = [e.bx - e.ax, e.by - e.ay]
  const t = Math.min(1, Math.max(0, ((x - e.ax) * dx + (y - e.ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(e.ax + t * dx - x, e.ay + t * dy - y)
}

test('packEdges: the edges as an image of one row, five texels each, two bytes a number (the high byte first); read back as the shader reads it, each is itself to within half its quantum (12.5 m for a place, 25 cm for a height)', () => {
  const edges: HazardEdge[] = [
    { ax: -123.4567, ay: 0.0125, bx: 600.2, by: -819.2, baseKm: 0, topKm: 10.668, rgb: [255, 90, 90], alongKm: 0, first: true, whole: true },
    { ax: 819.17, ay: 12, bx: -0.01, by: 77.7777, baseKm: 5.4864, topKm: 18.288, rgb: [79, 209, 255], alongKm: 3.999, first: false, whole: true },
    { ax: 5000, ay: -5000, bx: 1, by: 2, baseKm: -1, topKm: 99, rgb: [1, 2, 3], alongKm: 1.25, first: true, whole: false },
  ]
  const image = packEdges(edges)
  assert.deepEqual([MAX_EDGES, EDGE_TEXELS, EDGE_KM, EDGE_TOP_KM, POST_KM], [48, 5, 819.2, 32.768, 4])
  assert.deepEqual([image.width, image.height, image.data.length], [240, 1, 960], 'one row: the texture\'s flip (Cesium flips an image it uploads) changes nothing')
  assert.equal(EDGE_Q, 0.025)
  edges.slice(0, 2).forEach((e, k) => {
    const d = unpackEdge(image, k)
    for (const c of ['ax', 'ay', 'bx', 'by'] as const) assert.ok(near(d[c], e[c], EDGE_Q / 2 + 1e-9), `edge ${k} ${c}: ${d[c]} for ${e[c]}`)
    for (const c of ['baseKm', 'topKm'] as const) assert.ok(near(d[c], e[c], EDGE_TOP_KM / 65536 / 2 + 1e-9), `edge ${k} ${c}: ${d[c]} for ${e[c]}`)
    assert.ok(near(d.alongKm, e.alongKm, POST_KM / 65536 / 2 + 1e-9), `edge ${k}: ${d.alongKm} km along`)
    assert.deepEqual([d.rgb, d.first, d.whole], [e.rgb, e.first, e.whole])
  })
  const out = unpackEdge(image, 2) // beyond what the image holds: held at its ends
  assert.ok(near(out.ax, EDGE_KM - EDGE_Q, 1e-9) && near(out.ay, -EDGE_KM, 1e-9) && out.baseKm === 0 && near(out.topKm, EDGE_TOP_KM - EDGE_TOP_KM / 65536, 1e-9), JSON.stringify(out))
  assert.deepEqual([out.rgb, out.first, out.whole], [[1, 2, 3], true, false])
  const v = Math.round((-123.4567 + EDGE_KM) / EDGE_Q)
  assert.deepEqual([image.data[0], image.data[1]], [v >> 8, v & 255], 'the high byte first')
  assert.deepEqual([3, 8, 13].map((texel) => image.data[texel * 4 + 3]), [3, 2, 1], 'the fourth texel\'s alpha: 1 the first edge of its area, 2 the area is whole')
  assert.ok(image.data.subarray(3 * EDGE_TEXELS * 4).every((b) => b === 0), 'nothing after the last edge')
  assert.ok(packEdges([]).data.every((b) => b === 0))
  assert.equal(packEdges(Array.from({ length: 60 }, () => edges[0])).data.length, 960, 'never more than 48')
})

test('hazardEdges: a hazard area\'s ring as walls in the field\'s frame: each corner at its own place (km east and north of the field\'s middle), the area\'s base and top in km and its colour; a ring is closed whether its last corner repeats the first or not', () => {
  const ring = ringKm([[100, 50], [140, 50], [140, 90], [100, 90]])
  const h = hazardOf([ring], { baseFt: 18000, topFt: 35000 })
  const edges = hazardEdges([h], FRAME, N0, RED)
  assert.equal(edges.length, 4)
  edges.forEach((e, i) => {
    const [a, b] = [inFrame(ring[i]), inFrame(ring[i + 1])]
    assert.ok(near(e.ax, a.x, 1e-9) && near(e.ay, a.y, 1e-9) && near(e.bx, b.x, 1e-9) && near(e.by, b.y, 1e-9), `edge ${i}`)
  })
  assert.ok(near(edges[0].ax, 100, 0.6) && near(edges[0].ay, 50.5, 0.3) && near(edges[0].bx, 140, 0.8) && near(edges[0].by, 51.1, 0.3), `${JSON.stringify(edges[0])}: from 100 km east and 50 km north to 140 km east (on a plane that touches the Earth at the field's middle, a parallel bends north: by 0.6 and 1.2 km there)`)
  assert.ok(edges.every((e) => near(e.baseKm, 5.4864, 1e-9) && near(e.topKm, 10.668, 1e-9)), '18,000 and 35,000 ft')
  assert.ok(edges.every((e) => e.rgb.join() === '255,90,90' && e.alongKm === 0 && e.whole))
  assert.deepEqual(edges.map((e) => e.first), [true, false, false, false])
  assert.deepEqual(hazardEdges([{ ...h, rings: [ring.slice(0, 4)] }], FRAME, N0, RED), edges, 'the ring left open')
  const two = hazardEdges([hazardOf([ring, ringKm([[-60, -60], [-40, -60], [-50, -40]])])], FRAME, N0, () => '#4fd1ff')
  assert.deepEqual([two.length, two.filter((e) => e.first).length, two[0].rgb], [7, 1, [79, 209, 255]], 'an area of two rings is one area: its top face is inside either')
  assert.deepEqual(hazardEdges([], FRAME, N0, RED), [])
})

test('hazardEdges: at most 48, the nearest to the aircraft; an area\'s edges stay together, the nearest area first; an area that lost an edge is not whole (its top face cannot be found)', () => {
  const areas = [hazardOf([circle(250, 40)], { topFt: 30000 }), hazardOf([circle(30, 20)], { topFt: 31000 }), hazardOf([circle(120, 30)], { topFt: 32000 })]
  const ft = (e: HazardEdge): number => Math.round(e.topKm / 0.0003048)
  const edges = hazardEdges(areas, FRAME, N0, RED)
  assert.equal(edges.length, 48)
  assert.deepEqual(edges.map(ft), [...Array(20).fill(31000), ...Array(20).fill(32000), ...Array(8).fill(30000)], 'the area the aircraft is in, the one 90 km off, and 8 edges of the one 210 km off')
  assert.deepEqual(edges.map((e) => e.first), edges.map((_, k) => k === 0 || k === 20 || k === 40))
  assert.deepEqual(edges.map((e) => e.whole), edges.map((_, k) => k < 40))
  const far = hazardEdges([areas[0]], FRAME, N0, RED)
  assert.equal(far.length, 20)
  const kept = edges.slice(40)
  const left = far.filter((e) => !kept.some((k) => k.ax === e.ax && k.ay === e.ay))
  assert.equal(left.length, 12)
  assert.ok(Math.max(...kept.map((e) => kmTo(e))) <= Math.min(...left.map((e) => kmTo(e))), 'the 8 kept are its nearest')
  assert.deepEqual(kept, far.filter((e) => kept.some((k) => k.ax === e.ax && k.ay === e.ay)).map((e) => ({ ...e, first: e === far.find((f) => kept.some((k) => k.ax === f.ax && k.ay === f.ay)), whole: false })), 'in the ring\'s own order')
  const from = inFrame([at(250, 0).lon, at(250, 0).lat]) // the aircraft in the far area
  const there = hazardEdges(areas, FRAME, N0, RED, from)
  assert.deepEqual(there.map(ft), [...Array(20).fill(30000), ...Array(20).fill(32000), ...Array(8).fill(31000)], 'nearest to where the aircraft is')
  assert.deepEqual(hazardEdges(areas, FRAME, N0, RED, undefined, 100).length, 60, 'room for all: all, and whole')
  assert.ok(hazardEdges(areas, FRAME, N0, RED, undefined, 100).every((e) => e.whole))
})

test('hazardEdges: an edge that leaves what the image can hold (819 km each way) is cut there, and counts its posts from the corner it began at; one wholly beyond is left out, and so is one with an end past where the frame holds (the Earth has curved away); the area is then not whole', () => {
  const ring = ringKm([[700, -20], [1100, -20], [1100, 20], [700, 20]])
  const edges = hazardEdges([hazardOf([ring])], FRAME, N0, RED)
  const c = ring.map(inFrame)
  assert.ok(c[1].x > 900 && c[2].x > 900 && c[0].x < 819 && c[3].x < 819)
  assert.equal(edges.length, 3, 'the far side is left out')
  const [out, back, near0] = edges
  assert.ok(near(out.ax, c[0].x, 1e-9) && near(out.ay, c[0].y, 1e-9) && near(out.bx, 819, 1e-9), 'cut at 819 km')
  assert.ok(near((out.by - c[0].y) / (c[1].y - c[0].y), (819 - c[0].x) / (c[1].x - c[0].x), 1e-9), 'on the edge')
  assert.equal(out.alongKm, 0)
  assert.ok(near(back.ax, 819, 1e-9) && near(back.bx, c[3].x, 1e-9) && near(back.by, c[3].y, 1e-9))
  const cut = Math.hypot(819 - c[2].x, back.ay - c[2].y) // km from the corner the edge began at to where it is cut
  assert.ok(cut > 50 && near(back.alongKm, cut % POST_KM, 1e-9), `${back.alongKm} km of a post\'s 4 along, ${cut} km from the corner`)
  assert.ok(near(near0.ax, c[3].x, 1e-9) && near(near0.bx, c[0].x, 1e-9) && near0.alongKm === 0)
  assert.deepEqual(edges.map((e) => [e.first, e.whole]), [[true, false], [false, false], [false, false]])
  // a corner 3,000 km off: its two edges are left out (a cut would not be on the edge: the frame folds there)
  const long = ringKm([[100, 0], [3000, 0], [100, 30]])
  assert.ok(inFrame(long[1]).z < -300)
  const kept = hazardEdges([hazardOf([long])], FRAME, N0, RED)
  assert.equal(kept.length, 1)
  assert.ok(near(kept[0].ax, inFrame(long[2]).x, 1e-9) && near(kept[0].bx, inFrame(long[0]).x, 1e-9) && !kept[0].whole)
  // an area whose base and top are one height in the image is no wall
  assert.deepEqual(hazardEdges([{ ...hazardOf([circle(30, 20)]), baseM: 9000, topM: 9000.2 }], FRAME, N0, RED), [])
})
