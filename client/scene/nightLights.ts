// client/scene/nightLights.ts
// City lights: the server draws the tiles (server/lamps.ts: NASA Black Marble says where it is lit, OpenFreeMap's roads are
// the street lights in it); here they lie on the globe as plain imagery layers.
import { Cartesian3, Credit, ImageryLayer, PerspectiveFrustum, Rectangle, UrlTemplateImageryProvider, type Scene } from 'cesium'
import { LAMPS_MAX_LEVEL, LAMPS_TILES } from '../../shared/tiles.ts'

// The acknowledgment GIBS asks clients to show: https://nasa-gibs.github.io/gibs-api-docs/
export const NIGHT_CREDIT =
  "VIIRS Black Marble 2016. We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
export const STREETS_CREDIT = 'Street lights: OpenFreeMap, © OpenMapTiles, data © OpenStreetMap contributors'

// ---------- dark until loaded ----------
// Where the lamps are still loading, Cesium draws what it has: the imagery tile of a much coarser level stretched over
// the ground, or a whole ground tile far coarser than the view wants (terrain still loading: at start, after a jump,
// flying into new ground). Either way the city's mean light is smeared over kilometres as a pale wash with glowing roads
// (user report 2026-09-30, from the map into the chase at night). At night unloaded ground should be dark. So:
// - each ground level below COARSE_BELOW_LEVEL has a lamp layer of its own (minimumTerrainLevel = maximumTerrainLevel):
//   a ground tile only ever shows the lamp tiles of its own level, never a coarser one stretched while they load, and
//   ground near the camera where its level is still COARSE_SSE times too blurry (darkWhileCoarse) has none;
// - the deeper ground shares one layer: its lamp levels (12–14) are at most two apart, and a deep tile near the camera
//   may be the terrain's last level.
export const COARSE_SSE = 4
export const COARSE_BELOW_LEVEL = 12
const GROUND_EVERY = 30 // frames between soundings of the ground under the camera (half a second)

/**
 * The city-lights layers (one per ground level below COARSE_BELOW_LEVEL, then one for the rest), hidden and transparent:
 * Sun fades them in at dusk (alpha = night) and shows them only while they are visible, so daytime makes no requests.
 * Their tiles are lamplight; Sun sets their brightness so the lamps shine by themselves, whatever the moon. Add them right
 * above the day layer. Constructing them requests nothing.
 */
export function makeNightLayers(apiBase: string): ImageryLayer[] {
  const credit = new Credit(`${NIGHT_CREDIT} ${STREETS_CREDIT}`)
  const layers: ImageryLayer[] = []
  for (let level = 0; level <= COARSE_BELOW_LEVEL; level++) {
    const provider = new UrlTemplateImageryProvider({ url: `${apiBase}/${LAMPS_TILES}`, maximumLevel: LAMPS_MAX_LEVEL, credit })
    const deep = level === COARSE_BELOW_LEVEL
    layers.push(new ImageryLayer(provider, { alpha: 0, show: false, minimumTerrainLevel: level, maximumTerrainLevel: deep ? undefined : level }))
  }
  return layers
}

/**
 * How near the camera (m) a ground tile is still `coarse` times blurrier than the view allows: Cesium's screen-space error
 * (QuadtreePrimitive: geometricErrorM × pxPerM / distance, less the fog's forgiveness) above coarse × maxSse there.
 * pxPerM: CSS pixels per metre at 1 m (the view's height / sseDenominator); fogDensity 0: no fog.
 */
export function coarseRadiusM(geometricErrorM: number, pxPerM: number, maxSse: number, coarse: number, fogDensity: number, fogSse: number): number {
  const over = (d: number): boolean => (geometricErrorM * pxPerM) / d - (1 - Math.exp(-((d * fogDensity) ** 2))) * fogSse > coarse * maxSse
  let lo = 0
  let hi = (geometricErrorM * pxPerM) / (coarse * maxSse) // without fog; the fog only shortens it
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (over(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Keeps the lamps off ground far blurrier than the view wants (see above): before each frame, each coarse level's layer is
 * cut out round the camera as far as that level is COARSE_SSE times too blurry. Fog as Cesium's Fog.update reckons it,
 * from its public settings. Returns the remover.
 * ponytail: the cut-out is a lon/lat box round the point under the camera, the camera's height taken over the ground there;
 * Cesium measures to each tile's nearest point. Near enough at the box's size; a box across ±180° is clipped by Cesium.
 */
export function darkWhileCoarse(scene: Scene, layers: readonly ImageryLayer[]): () => void {
  const boxes = layers.map(() => new Rectangle())
  const up = new Cartesian3()
  let frame = 0
  let groundM = 0
  return scene.preRender.addEventListener(() => {
    const camera = scene.camera
    const frustum = camera.frustum
    if (!layers[0]?.show || !(frustum instanceof PerspectiveFrustum) || frustum.fovy === undefined) return
    const c = camera.positionCartographic
    if (frame++ % GROUND_EVERY === 0) groundM = scene.globe.getHeight(c) ?? groundM // a ray into the terrain: not every frame
    const h = Math.max(1, c.height - groundM)
    const pxPerM = scene.canvas.clientHeight / (2 * Math.tan(frustum.fovy / 2)) // CSS px: Cesium's drawing-buffer height / pixelRatio
    const fog = scene.fog
    let density = 0
    if (fog.enabled && c.height <= fog.maxHeight) {
      const tilt = Math.abs(Cartesian3.dot(camera.directionWC, Cartesian3.normalize(camera.positionWC, up)))
      density = fog.density * fog.heightScalar * Math.max(c.height / fog.maxHeight, 1e-4) ** -Math.max(fog.heightFalloff, 0) * (1 - tilt)
    }
    const R = scene.globe.ellipsoid.maximumRadius
    for (let level = 0; level < COARSE_BELOW_LEVEL && level < layers.length; level++) {
      const err = scene.terrainProvider.getLevelMaximumGeometricError(level)
      const maxSse = scene.globe.maximumScreenSpaceError
      const r = (err * pxPerM) / (COARSE_SSE * maxSse) <= h ? 0 : coarseRadiusM(err, pxPerM, maxSse, COARSE_SSE, density, fog.screenSpaceErrorFactor)
      if (r <= h) {
        layers[level].cutoutRectangle = undefined as unknown as Rectangle // Cesium.d.ts types it as always set; undefined is its default, no cut-out
        continue
      }
      const g = Math.sqrt(r * r - h * h) / R // radians of ground round the point under the camera
      const box = boxes[level]
      box.south = Math.max(-Math.PI / 2, c.latitude - g)
      box.north = Math.min(Math.PI / 2, c.latitude + g)
      const dLon = g / Math.max(Math.cos(c.latitude), 1e-6)
      box.west = dLon >= Math.PI ? -Math.PI : c.longitude - dLon
      box.east = dLon >= Math.PI ? Math.PI : c.longitude + dLon
      if (box.west < -Math.PI) box.west += 2 * Math.PI
      if (box.east > Math.PI) box.east -= 2 * Math.PI
      layers[level].cutoutRectangle = box
    }
  })
}
