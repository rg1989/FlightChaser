// client/scene/buildings.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Appearance, Cartesian3, Cartographic, Ellipsoid, Matrix4, PerInstanceColorAppearance, PolygonGeometry, PolygonHierarchy, Primitive, Transforms, type Viewer } from 'cesium'
import type { TerrainFrame } from '../types.ts'
import { TOPO_ON, drawnHeightM } from './exaggeration.ts'
import type { Layer } from './mvt.ts'
import type { PhotoSource, PhotoTexture } from './roofPhoto.ts'
import { followExaggeration } from './runways.ts'
import { Buildings, LOAD_NEAR_M, boxSeen, extentM, footprints, groundPoints, photoZoom, tileLatDeg, tileLonDeg, tileOf, tilesAround, tileXY, viewPlanes, type Footprint } from './buildings.ts'

const near = (a: number, b: number, tol: number, msg = ''): void => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b} (tol ${tol}) ${msg}`)
const LLBG = { lat: 32.0114, lon: 34.8867 }

test('tileOf: z14 slippy-map tile of a point; the tile bounds contain it', () => {
  assert.deepEqual(tileOf(0, 0), [8192, 8192])
  assert.deepEqual(tileOf(85.05, -180), [0, 0])
  for (const p of [LLBG, { lat: 47.2602, lon: 11.3439 }, { lat: -22.95, lon: -43.18 }, { lat: 22.28, lon: 114.16 }]) {
    const [x, y] = tileOf(p.lat, p.lon)
    assert.ok(tileLonDeg(x) <= p.lon && p.lon < tileLonDeg(x + 1), `lon ${p.lon}`)
    assert.ok(tileLatDeg(y + 1) < p.lat && p.lat <= tileLatDeg(y), `lat ${p.lat}`)
  }
})

test('tileXY: a point in fractions of a tile, the inverse of the tile edges; tileOf is its whole part', () => {
  const [x, y] = tileOf(LLBG.lat, LLBG.lon)
  const [fx, fy] = tileXY(tileLatDeg(y + 0.25), tileLonDeg(x + 0.75))
  assert.ok(Math.abs(fx - (x + 0.75)) < 1e-9 && Math.abs(fy - (y + 0.25)) < 1e-9)
  assert.deepEqual(tileXY(LLBG.lat, LLBG.lon).map(Math.floor), [x, y])
})

test('photoZoom: sharpest round a low aircraft, a zoom coarser a ring out and for each doubling of its height; coarser only well past the line', () => {
  assert.equal(photoZoom(0, 600, 0, 19), 17)
  assert.equal(photoZoom(1, 600, 0, 19), 17)
  assert.equal(photoZoom(2, 600, 0, 19), 16)
  assert.deepEqual([1999, 2000, 4000, 8000, 11000].map((h) => photoZoom(0, h, 0, 19)), [17, 16, 15, 14, 14])
  assert.equal(photoZoom(3, 11000, 0, 19), 14, 'never under the building tiles\' own zoom')
  assert.equal(photoZoom(0, 600, 0, 14), 14, 'never deeper than the source goes (EOX)')
  // a sharp tile left a ring behind keeps its picture; two rings, it goes coarse
  assert.equal(photoZoom(2, 600, 17, 19), 17)
  assert.equal(photoZoom(3, 600, 17, 19), 16)
  // climbing through 2,000 m: coarse only from 2,500 m; descending: sharp at once
  assert.equal(photoZoom(0, 2400, 17, 19), 17)
  assert.equal(photoZoom(0, 2500, 17, 19), 16)
  assert.equal(photoZoom(0, 1900, 16, 19), 17)
})

test('tilesAround: every tile touching the square of half-side r, nearest first', () => {
  const ts = tilesAround(LLBG.lat, LLBG.lon, 5000)
  assert.deepEqual(ts[0], tileOf(LLBG.lat, LLBG.lon))
  const dLat = 5000 / 111_320
  const dLon = 5000 / (111_320 * Math.cos((LLBG.lat * Math.PI) / 180))
  const has = (t: [number, number]): boolean => ts.some(([x, y]) => x === t[0] && y === t[1])
  for (const [a, b] of [[dLat, dLon], [dLat, -dLon], [-dLat, dLon], [-dLat, -dLon]]) assert.ok(has(tileOf(LLBG.lat + a, LLBG.lon + b)), 'corner')
  assert.ok(ts.length >= 25 && ts.length <= 42, `${ts.length} tiles`) // z14 is ~2.07 km wide at 32°N: 5–6 per 10 km
  const [cx, cy] = ts[0]
  const d = ts.map(([x, y]) => Math.hypot(x - cx, y - cy))
  assert.deepEqual(d, [...d].sort((a, b) => a - b))
})

const square = (x0: number, y0: number, s: number): [number, number][] => [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]]
const layer: Layer = {
  extent: 4096,
  features: [
    { id: 1, props: { render_height: 12, render_min_height: 0, colour: 'white' }, polys: [[square(1024, 1024, 1024), square(1280, 1280, 256)]] },
    { id: 2, props: { render_height: 40, render_min_height: 0, hide_3d: true }, polys: [[square(0, 0, 100)]] }, // an outline with parts
    { id: 3, props: { render_height: 1, render_min_height: 0 }, polys: [[square(3000, 3000, 50)]] }, // a shed or a wall
    { id: 4, props: { render_height: 30, render_min_height: 10 }, polys: [[square(100, 3000, 64)], [square(300, 3000, 64)]] },
  ],
}

test('footprints: rings in degrees with their holes; hide_3d outlines and anything under 2 m are left out', () => {
  const [x, y] = tileOf(LLBG.lat, LLBG.lon)
  const fs = footprints(layer, x, y)
  assert.equal(fs.length, 3) // feature 1, and feature 4's two polygons
  const [a, b, c] = fs
  assert.equal(a.rings.length, 2)
  near(a.rings[0][0][0], tileLonDeg(x + 0.25), 1e-12)
  near(a.rings[0][0][1], tileLatDeg(y + 0.25), 1e-12)
  near(a.rings[1][0][0], tileLonDeg(x + 0.3125), 1e-12) // the hole
  assert.deepEqual([a.heightM, a.minHeightM, b.heightM, b.minHeightM, c.minHeightM], [12, 0, 30, 10, 10])
  for (const f of fs) assert.ok(f.rnd >= 0 && f.rnd < 1)
  assert.notEqual(b.rnd, c.rnd)
})

const fp = (heightM: number, minHeightM: number, rings: [number, number][][] = []): Footprint => ({ rings, heightM, minHeightM, rnd: 0 })

test('extentM: OSM height counts from the lowest ground the building touches; a 20 m foundation under it; a podium part starts at its min height', () => {
  // on a slope: corners read 100–108 m
  assert.deepEqual(extentM(fp(12, 0), [100, 104, 108, 103]), { baseM: 80, topM: 112, groundM: 103.75 })
  // steeper than the building is tall: one storey (3 m) stays above the uphill corner, the downhill side shows more floors
  assert.deepEqual(extentM(fp(8, 0), [100, 115]), { baseM: 80, topM: 118, groundM: 107.5 })
  assert.deepEqual(extentM(fp(2.5, 0), [100, 101]), { baseM: 80, topM: 103.5, groundM: 100.5 }) // never more than its own height
  assert.deepEqual(extentM(fp(30, 10), [100, 106]), { baseM: 110, topM: 130, groundM: 103 })
  assert.deepEqual(extentM(fp(12, 0), [50]), { baseM: 30, topM: 62, groundM: 50 })
})

test('groundPoints: every corner of the outer ring, plus a point every 10 m along long walls, at most 24', () => {
  const mLat = 111_320
  const mLon = mLat * Math.cos((32 * Math.PI) / 180)
  // a 30 m × 8 m block at 32°N: the long walls get points at 10 and 20 m, the short ones none
  const rect: [number, number][] = [[35, 32], [35 + 30 / mLon, 32], [35 + 30 / mLon, 32 + 8 / mLat], [35, 32 + 8 / mLat]]
  const pts = groundPoints(fp(10, 0, [rect, [[35.00001, 32.00001], [35.00002, 32.00001], [35.00002, 32.00002]]]))
  assert.equal(pts.length, 8)
  for (const c of rect) assert.ok(pts.some((p) => p[0] === c[0] && p[1] === c[1]), 'every corner')
  near((pts[1][0] - 35) * mLon, 10, 0.01)
  near((pts[2][0] - 35) * mLon, 20, 0.01)
  // a round tower of 40 corners 1 m apart: evenly thinned to 24
  const ring = Array.from({ length: 40 }, (_, i): [number, number] => [35 + Math.cos(i / 6.4) * 6.4 / mLon, 32 + Math.sin(i / 6.4) * 6.4 / mLat])
  const thin = groundPoints(fp(10, 0, [ring]))
  assert.equal(thin.length, 24)
  assert.deepEqual(thin[0], ring[0])
})

test('followExaggeration: any height in the tile lands where the terrain is drawn, not only the base', () => {
  const up = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(Cartographic.fromDegrees(LLBG.lon, LLBG.lat))
  const baseM = 100
  const upDotBase = Cartesian3.dot(up, Cartesian3.fromDegrees(LLBG.lon, LLBG.lat, baseM))
  const M = new Matrix4()
  for (const [f, relHM] of [[TOPO_ON, 0], [0.5, 50], [0.1, 60], [0, 60]]) {
    followExaggeration(up, upDotBase, baseM, f, relHM, M)
    for (const [dLon, h] of [[0, 100], [0.01, 350], [-0.008, 20]]) { // a roof ~1 km away and 250 m above the base
      const c = Cartographic.fromCartesian(Matrix4.multiplyByPoint(M, Cartesian3.fromDegrees(LLBG.lon + dLon, LLBG.lat, h), new Cartesian3()))
      near(c.height, drawnHeightM(h, Math.max(f, 1e-3), relHM), 0.1, `f ${f} h ${h}`)
    }
  }
})

// ---- the layer itself, with a fake viewer and loader (no WebGL, no network) ----

// A Material types its uniforms with instanceof checks against these DOM classes (Material.js getUniformType); Node has none.
Object.assign(globalThis, { HTMLCanvasElement: class {}, HTMLImageElement: class {}, ImageBitmap: class {}, OffscreenCanvas: class {} })

function fakeViewer(): { viewer: Viewer; added: Primitive[]; removed: Primitive[] } {
  const added: Primitive[] = []
  const removed: Primitive[] = []
  const primitives = { add: (p: Primitive) => (added.push(p), p), remove: (p: Primitive) => (removed.push(p), true) }
  return { viewer: { scene: { primitives }, isDestroyed: () => false } as unknown as Viewer, added, removed }
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r))
}
const tf = (fNow: number, relHM = 0): TerrainFrame => ({ fSampled: fNow, fNow, relHM })

function rig(): { b: Buildings; added: Primitive[]; removed: Primitive[]; asked: string[]; release: () => void } {
  const { viewer, added, removed } = fakeViewer()
  const asked: string[] = []
  const gates: (() => void)[] = []
  const b = new Buildings(viewer, {
    loadLayer: async (x, y) => {
      asked.push(`${x}/${y}`)
      await new Promise<void>((r) => gates.push(r))
      return layer
    },
    groundM: async (cs) => cs.map(() => 40),
  })
  return { b, added, removed, asked, release: () => gates.splice(0).forEach((r) => r()) }
}

test('Buildings: nothing loads or shows without a focus (browse); a focus loads the nearest tiles, 4 at a time', async () => {
  const { b, added, asked, release } = rig()
  b.update(null, tf(TOPO_ON))
  await flush()
  assert.equal(asked.length, 0)
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  assert.equal(asked.length, 4)
  const [x, y] = tileOf(LLBG.lat, LLBG.lon)
  assert.equal(asked[0], `${x}/${y}`)
  release()
  await flush()
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  assert.equal(added.length, 4)
  assert.equal(asked.length, 8) // the next four
  for (const p of added) {
    assert.ok(p instanceof Primitive)
    assert.equal(p.allowPicking, false)
    assert.ok(p.appearance instanceof Appearance)
    assert.equal(p.appearance.translucent, false)
    assert.equal(p.show, true)
  }
  b.update(null, tf(TOPO_ON))
  for (const p of added) assert.equal(p.show, false, 'browse hides them')
})

test('Buildings: see-through swaps every tile to the translucent appearance and back, new tiles included', async () => {
  const { b, added, release } = rig()
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  release()
  await flush()
  b.setGlass(true)
  for (const p of added) assert.equal(p.appearance.translucent, true)
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  release()
  await flush()
  assert.equal(added.length, 8)
  for (const p of added) assert.equal(p.appearance.translucent, true, 'a tile built while see-through')
  b.setGlass(false)
  for (const p of added) assert.equal(p.appearance.translucent, false)
})

test('Buildings: tiles follow the exaggeration, hide when flat, and far tiles are dropped', async () => {
  const { b, added, removed, release } = rig()
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  release()
  await flush()
  const p = added[0]
  const before = Matrix4.clone(p.modelMatrix)
  b.update(LLBG, tf(0.5, 50))
  assert.ok(!Matrix4.equals(before, p.modelMatrix), 'the sink moves them')
  b.update(LLBG, tf(0, 50))
  assert.equal(p.show, false, 'nothing to draw on a flat map')
  b.update(LLBG, tf(TOPO_ON))
  assert.equal(p.show, true)
  b.update({ lat: LLBG.lat + 1, lon: LLBG.lon }, tf(TOPO_ON)) // 111 km north
  assert.equal(removed.length, added.length, 'every old tile went')
  b.destroy()
})

test('Buildings: setNight feeds one night value to every tile, solid and see-through, clamped to 0–1', async () => {
  const { b, added, release } = rig()
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  release()
  await flush()
  const night = (p: Primitive): unknown => (p.appearance as Appearance).material.uniforms.night
  assert.equal(night(added[0]), 0, 'day until told otherwise')
  b.setNight(0.7)
  for (const p of added) assert.equal(night(p), 0.7)
  b.setGlass(true)
  for (const p of added) {
    assert.equal(night(p), 0.7, 'the see-through look reads the same value')
    assert.equal((p.appearance as Appearance).isTranslucent(), true, 'and Cesium draws it translucent')
  }
  b.setNight(3)
  assert.equal(night(added[0]), 1)
  b.setNight(Number.NaN)
  assert.equal(night(added[0]), 0)
})

// ---- what the camera sees ----

/** A camera at lat/lon/HAE looking along headingDeg, pitchDeg (negative: down), as Cesium's: unit axes, 60° across a 1.6 view. */
function cam(lat: number, lon: number, hM: number, headingDeg: number, pitchDeg: number): Record<string, unknown> {
  const pos = Cartesian3.fromDegrees(lon, lat, hM)
  const m = Transforms.eastNorthUpToFixedFrame(pos)
  const [E, N, U] = [new Cartesian3(m[0], m[1], m[2]), new Cartesian3(m[4], m[5], m[6]), new Cartesian3(m[8], m[9], m[10])]
  const [h, p] = [(headingDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180]
  const v = (a: Cartesian3, ka: number, b: Cartesian3, kb: number): Cartesian3 => Cartesian3.add(Cartesian3.multiplyByScalar(a, ka, new Cartesian3()), Cartesian3.multiplyByScalar(b, kb, new Cartesian3()), new Cartesian3())
  const fwd = v(E, Math.sin(h), N, Math.cos(h))
  const dir = v(fwd, Math.cos(p), U, Math.sin(p))
  const right = v(E, Math.cos(h), N, -Math.sin(h))
  const up = Cartesian3.cross(right, dir, new Cartesian3())
  return { positionWC: pos, directionWC: dir, upWC: up, rightWC: right, positionCartographic: Cartographic.fromDegrees(lon, lat, hM), frustum: { fov: Math.PI / 3, aspectRatio: 1.6 } }
}

test('viewPlanes + boxSeen: a box ahead is seen, one behind or well off to the side is not; the margin widens the view', () => {
  const c = cam(LLBG.lat, LLBG.lon, 600, 0, -14) as { positionWC: Cartesian3; directionWC: Cartesian3; upWC: Cartesian3; rightWC: Cartesian3 }
  const planes = (marginDeg: number) => viewPlanes(c.positionWC, c.directionWC, c.upWC, c.rightWC, Math.tan(Math.PI / 6), Math.tan(Math.PI / 6) / 1.6, marginDeg)
  const box = (dNorthM: number, dEastM: number): Cartesian3[] => {
    const [lat, lon] = [LLBG.lat + dNorthM / 111_320, LLBG.lon + dEastM / (111_320 * Math.cos((LLBG.lat * Math.PI) / 180))]
    const out: Cartesian3[] = []
    for (const h of [0, 30]) for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) out.push(Cartesian3.fromDegrees(lon + b * 0.001, lat + a * 0.001, h))
    return out
  }
  assert.equal(boxSeen(box(3000, 0), planes(0)), true, '3 km ahead')
  assert.equal(boxSeen(box(-3000, 0), planes(15)), false, '3 km behind')
  assert.equal(boxSeen(box(200, 0), planes(0)), false, 'under the camera: the view starts ~1.5 × its height ahead')
  assert.equal(boxSeen(box(1000, 0), planes(15)), true, 'just under the view: within the margin')
  // 2 km ahead and 1.6 km east: ~39° off the view's middle; the view's half-width is 30°, 45° with the margin
  assert.equal(boxSeen(box(2000, 1600), planes(0)), false)
  assert.equal(boxSeen(box(2000, 1600), planes(15)), true)
})

test('the solid look culls back faces (its walls and roofs wind outward); see-through draws them', () => {
  // A 20 m × 12 m block with a 4 m courtyard, 30 m tall: every triangle's winding (counter-clockwise = front) agrees with its
  // normal, and the outer walls' normals point away from the middle, so culling the back faces drops the far walls only.
  const mLon = 111_320 * Math.cos((LLBG.lat * Math.PI) / 180)
  const rect = (w: number, h: number): Cartesian3[] => Cartesian3.fromDegreesArray([[-w, -h], [w, -h], [w, h], [-w, h]].flatMap(([e, n]) => [LLBG.lon + e / mLon, LLBG.lat + n / 111_320]))
  for (const hole of [false, true]) {
    const g = PolygonGeometry.createGeometry(new PolygonGeometry({
      polygonHierarchy: new PolygonHierarchy(rect(10, 6), hole ? [new PolygonHierarchy(rect(2, 2))] : []),
      height: 0, extrudedHeight: 30, closeBottom: false, vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
    }))!
    const pos = g.attributes.position!.values as unknown as number[]
    const nrm = g.attributes.normal!.values as unknown as number[]
    const idx = g.indices!
    const P = (i: number): Cartesian3 => new Cartesian3(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2])
    const Nv = (i: number): Cartesian3 => new Cartesian3(nrm[3 * i], nrm[3 * i + 1], nrm[3 * i + 2])
    const mid = Cartesian3.fromDegrees(LLBG.lon, LLBG.lat, 15)
    let outer = 0
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [P(idx[t]), P(idx[t + 1]), P(idx[t + 2])]
      const face = Cartesian3.cross(Cartesian3.subtract(b, a, new Cartesian3()), Cartesian3.subtract(c, a, new Cartesian3()), new Cartesian3())
      if (Cartesian3.magnitude(face) < 1e-6) continue
      const n = Nv(idx[t])
      assert.ok(Cartesian3.dot(face, n) > 0, `triangle ${t / 3}: winding against its normal`)
      // a wall of the outer ring (> 5 m from the middle): its normal points away from the middle
      const centre = Cartesian3.multiplyByScalar(Cartesian3.add(Cartesian3.add(a, b, new Cartesian3()), c, new Cartesian3()), 1 / 3, new Cartesian3())
      const away = Cartesian3.subtract(centre, mid, new Cartesian3())
      const up = Ellipsoid.WGS84.geodeticSurfaceNormal(mid)
      const flat = Cartesian3.subtract(away, Cartesian3.multiplyByScalar(up, Cartesian3.dot(away, up), new Cartesian3()), new Cartesian3())
      if (Math.abs(Cartesian3.dot(n, up)) < 0.1 && Cartesian3.magnitude(flat) > 5.5) {
        outer++
        assert.ok(Cartesian3.dot(n, flat) > 0, 'an outer wall faces outward')
      }
    }
    assert.ok(outer >= 8, `${outer} outer wall triangles`)
  }
})

function camRig(camera: Record<string, unknown>, photo = false): {
  b: Buildings; added: Primitive[]; asked: string[]; pictures: string[]; canvases: { width: number; height: number }[]; release: () => void
} {
  const added: Primitive[] = []
  const primitives = { add: (p: Primitive) => (added.push(p), p), remove: () => true }
  const globe = { getHeight: () => 40, vertexShadowDarkness: 0.3, lambertDiffuseMultiplier: 1, enableLighting: false }
  const viewer = { scene: { primitives, globe, context: { webgl2: true } }, camera, imageryLayers: { length: 0 }, isDestroyed: () => false } as unknown as Viewer
  const asked: string[] = []
  const pictures: string[] = []
  const canvases: { width: number; height: number }[] = []
  const gates: (() => void)[] = []
  const src: PhotoSource = { url: () => '', maxZ: 19 }
  const b = new Buildings(viewer, {
    loadLayer: async (x, y) => {
      asked.push(`${x}/${y}`)
      await new Promise<void>((r) => gates.push(r))
      return layer
    },
    groundM: async (cs) => cs.map(() => 40),
    photo: photo ? src : null,
    mosaic: async (_s, x, y, _tz, z) => {
      pictures.push(`${x}/${y}@${z}`)
      const c = { width: 256 * 2 ** (z - 14), height: 256 * 2 ** (z - 14) }
      canvases.push(c)
      return c as unknown as HTMLCanvasElement
    },
    upload: () => ({ destroy: () => {} }) as PhotoTexture,
  })
  return { b, added, asked, pictures, canvases, release: () => gates.splice(0).forEach((r) => r()) }
}

/** Loads and plans until nothing more is asked for. */
async function settle(b: Buildings, focus: { lat: number; lon: number; hM: number }, release: () => void): Promise<void> {
  for (let i = 0; i < 40; i++) {
    b.update(focus, tf(TOPO_ON))
    await flush()
    release()
    await flush()
  }
}

test('Buildings: low over a city the tiles in view load first, those out of view only within 5 km of the camera', async () => {
  const camLat = LLBG.lat - 145 / 111_320 // 150 m behind the aircraft (north-bound), looking 14° down
  const { b, asked, release } = camRig(cam(camLat, LLBG.lon, 640, 0, -14))
  const focus = { ...LLBG, hM: 600 }
  b.update(focus, tf(TOPO_ON))
  await flush()
  assert.equal(asked.length, 4)
  for (const k of asked) assert.ok(tileLatDeg(Number(k.split('/')[1])) > camLat, `${k} first: in view (north of the camera)`)
  await settle(b, focus, release)
  const all = tilesAround(focus.lat, focus.lon, 5000).map(([x, y]) => `${x}/${y}`)
  assert.ok(asked.length < all.length, `${asked.length} of ${all.length}: the far corners behind stay unloaded`)
  const mLon = 111_320 * Math.cos((camLat * Math.PI) / 180)
  for (const k of asked) {
    const [x, y] = k.split('/').map(Number)
    if (tileLatDeg(y) > camLat) continue // ahead: in view
    const dx = Math.max(0, tileLonDeg(x) - LLBG.lon, LLBG.lon - tileLonDeg(x + 1)) * mLon
    const dy = Math.max(0, tileLatDeg(y + 1) - camLat) * 111_320
    assert.ok(Math.hypot(dx, dy) < LOAD_NEAR_M, `${k} behind the camera, within 5 km of it`)
  }
})

test('Buildings: from cruise height, looking ahead, nothing of the square is in view and nothing loads', async () => {
  const { b, asked, release } = camRig(cam(LLBG.lat - 0.002, LLBG.lon, 11_030, 0, -14))
  await settle(b, { ...LLBG, hM: 11_000 }, release)
  assert.equal(asked.length, 0)
  // the camera turned down at the ground: the tiles under it load
  const { b: b2, asked: asked2, release: release2 } = camRig(cam(LLBG.lat - 0.002, LLBG.lon, 11_030, 0, -89))
  await settle(b2, { ...LLBG, hM: 11_000 }, release2)
  assert.ok(asked2.length > 0)
})

test('Buildings: roof pictures only for the tiles in view; each canvas is released once on the card', async () => {
  const camLat = LLBG.lat - 145 / 111_320
  const { b, asked, pictures, canvases, release } = camRig(cam(camLat, LLBG.lon, 640, 0, -14), true)
  await settle(b, { ...LLBG, hM: 600 }, release)
  assert.ok(pictures.length > 0)
  const pictured = new Set(pictures.map((p) => p.split('@')[0]))
  assert.ok(pictured.size < asked.length, `${pictured.size} pictures for ${asked.length} tiles`)
  for (const k of pictured) assert.ok(tileLatDeg(Number(k.split('/')[1])) > camLat, `${k}: in view`)
  for (const c of canvases) assert.deepEqual([c.width, c.height], [0, 0], 'released')
})

test('Buildings: solid tiles cull back faces, see-through ones do not', async () => {
  const { b, added, release } = rig()
  b.update(LLBG, tf(TOPO_ON))
  await flush()
  release()
  await flush()
  const cull = (p: Primitive): unknown => (p.appearance.renderState as { cull?: { enabled?: boolean } }).cull?.enabled
  assert.ok(added.length > 0)
  for (const p of added) assert.equal(cull(p), true)
  b.setGlass(true)
  for (const p of added) assert.equal(cull(p), undefined)
})
