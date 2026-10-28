// client/scene/nightLights.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Cartesian3, Cartographic, Ellipsoid, Event, PerspectiveFrustum, UrlTemplateImageryProvider, WebMercatorTilingScheme } from 'cesium'
import type { Scene } from 'cesium'
import { COARSE_BELOW_LEVEL, COARSE_SSE, NIGHT_CREDIT, STREETS_CREDIT, coarseRadiusM, darkWhileCoarse, makeNightLayers } from './nightLights.ts'

test('NIGHT_CREDIT carries the GIBS acknowledgment and names the layer', () => {
  assert.match(NIGHT_CREDIT, /We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services \(GIBS\), part of NASA's Earth Science Data and Information System \(ESDIS\)\./)
  assert.match(NIGHT_CREDIT, /VIIRS Black Marble 2016/)
})

test('makeNightLayers: one per coarse ground level, then one for the rest; hidden, transparent, brightness 1; our server\'s tiles to level 14', () => {
  const layers = makeNightLayers('/api')
  assert.equal(layers.length, COARSE_BELOW_LEVEL + 1)
  const range = (l: object): unknown[] => [(l as { _minimumTerrainLevel?: number })._minimumTerrainLevel, (l as { _maximumTerrainLevel?: number })._maximumTerrainLevel]
  layers.slice(0, -1).forEach((l, level) => assert.deepEqual(range(l), [level, level], 'a ground tile shows only its own level\'s lamps'))
  assert.deepEqual(range(layers.at(-1)!), [COARSE_BELOW_LEVEL, undefined])
  for (const layer of layers) {
    assert.equal(layer.show, false) // no tile requests until Sun shows them at dusk
    assert.equal(layer.alpha, 0)
    assert.equal(layer.brightness, 1) // 1.6 turned big cities into a flat white blob up close
    const p = layer.imageryProvider as UrlTemplateImageryProvider
    assert.ok(p instanceof UrlTemplateImageryProvider)
    assert.equal(p.url, '/api/tiles/lamps/v1/{z}/{x}/{y}.png') // drawn by our server (server/lamps.ts)
    assert.equal(p.maximumLevel, 14)
    assert.ok(p.tilingScheme instanceof WebMercatorTilingScheme) // EPSG:3857, as GIBS's tile matrix set and OpenFreeMap's tiles
    assert.equal(p.credit.html, `${NIGHT_CREDIT} ${STREETS_CREDIT}`)
  }
  assert.match(STREETS_CREDIT, /© OpenStreetMap contributors/)
  assert.notEqual(makeNightLayers('/api')[0], layers[0]) // new ones per call: a layer belongs to one collection
})

test('makeNightLayers makes no request (Cesium fetches tiles only for a shown layer while it renders)', () => {
  const urls: string[] = []
  const real = globalThis.fetch
  globalThis.fetch = ((url: string) => (urls.push(String(url)), Promise.reject(new Error('offline')))) as typeof fetch
  try {
    makeNightLayers('/api')
  } finally {
    globalThis.fetch = real
  }
  assert.deepEqual(urls, [])
})

test('coarseRadiusM: where the screen-space error passes coarse × the maximum; the fog forgives the far ground, never the near', () => {
  // A level-8 tile (geometric error ~301 m) on a 833-px-high view, 60° tall: ~721 px per metre at 1 m.
  const r = coarseRadiusM(301, 721, 2, COARSE_SSE, 0, 12)
  assert.ok(Math.abs(r - (301 * 721) / 8) < 1, `${r}`)
  const fogged = coarseRadiusM(301, 721, 2, COARSE_SSE, 3.1e-5, 12) // haze as at 1 km looking ahead
  assert.ok(fogged < r && fogged > 15_000 && fogged < 22_000, `${fogged}`)
  assert.ok(Math.abs(coarseRadiusM(301 / 8, 721, 2, COARSE_SSE, 3.1e-5, 12) - r / 8) < 100, 'a level-11 tile: 3.4 km, the fog all but nothing there')
})

/** Just enough of a Scene for darkWhileCoarse: the camera 1 km over Tel Aviv looking at the horizon, no fog. */
function fakeScene() {
  const at = Cartographic.fromDegrees(34.78, 32.08, 1000)
  const positionWC = Ellipsoid.WGS84.cartographicToCartesian(at)
  const frustum = new PerspectiveFrustum({ fov: Math.PI / 3, aspectRatio: 1 }) // 60° tall: ~721 px per metre at 1 m
  const camera = { frustum, positionCartographic: at, positionWC, directionWC: Cartesian3.UNIT_X }
  const scene = {
    preRender: new Event(),
    camera,
    canvas: { clientHeight: 833 },
    fog: { enabled: false, screenSpaceErrorFactor: 12 },
    globe: { getHeight: () => 0, maximumScreenSpaceError: 2, ellipsoid: Ellipsoid.WGS84 },
    terrainProvider: { getLevelMaximumGeometricError: (level: number) => 77_067 / 2 ** level },
  }
  return scene
}

test('darkWhileCoarse: each coarse level is cut out round the camera as far as it is 4 × too blurry; the deep layer never; nothing while hidden', () => {
  const scene = fakeScene()
  const layers = makeNightLayers('/api')
  const stop = darkWhileCoarse(scene as unknown as Scene, layers)
  scene.preRender.raiseEvent()
  assert.ok(layers.every((l) => l.cutoutRectangle === undefined), 'hidden: untouched')
  for (const l of layers) l.show = true
  scene.preRender.raiseEvent()
  const kmNorth = (level: number): number => ((layers[level].cutoutRectangle!.north - Cartographic.fromDegrees(34.78, 32.08).latitude) * 6_378_137) / 1000
  assert.ok(Math.abs(kmNorth(8) - 27) < 1.5, `level 8: ${kmNorth(8)} km`) // geometric error 301 m × 721 px / (4 × 2 px)
  assert.ok(Math.abs(kmNorth(11) - 3.25) < 0.3, `level 11: ${kmNorth(11)} km (less the camera's 1 km height)`)
  assert.ok([0, 1, 2, 3, 4, 5, 6, 7].every((l) => kmNorth(l) > kmNorth(l + 1)), 'a coarser level reaches farther')
  assert.equal(layers[COARSE_BELOW_LEVEL].cutoutRectangle, undefined, 'deep tiles near the camera may be the last level')
  scene.camera.positionCartographic = Cartographic.fromDegrees(34.78, 32.08, 20_000)
  scene.preRender.raiseEvent()
  assert.equal(layers[11].cutoutRectangle, undefined, 'from 20 km up no level-11 ground is that near')
  stop()
})
