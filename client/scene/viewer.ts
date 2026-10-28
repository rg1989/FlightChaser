// client/scene/viewer.ts
import { Color, ImageryLayer, Viewer } from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import type { ClientConfig } from '../types.ts'
import { fadeOffOnDestroy, imageryFade, installImageryFade } from './imageryFade.ts'
import { makeImagery } from './imagery.ts'
import { makeTerrain } from './terrain.ts'
import { TileCache } from './tileCache.ts'
import { keepCanvasSize } from './canvasSize.ts'

/**
 * Far ground in steps: the pixels of detail error Cesium forgives a ground tile where the distance haze is full (Fog's
 * screenSpaceErrorFactor; Cesium's own is 2). The haze thickens with distance, so near ground keeps all its detail and each
 * step farther out is drawn and fetched from a coarser tile; looking straight down there is none (the top-down map is as before).
 * Measured 2026-10-28 (chase over London at 6,000 ft; FL360 cruise): about half the ground tiles, triangles and draw calls,
 * no difference seen. .planning/reports/render-lod/README.md has the numbers and the pictures.
 */
export const FAR_GROUND_SSE = 12

/**
 * Scene options (the app passes none: the defaults). tileCache: globe.tileCacheSize, 'auto' (default: tileCache.ts sizes it
 * from the tiles a frame touches, so orbiting back finds the ground still loaded) or a fixed number of tiles (100 is
 * Cesium's default). fade: the base imagery cross-fades to each sharper tile (imageryFade.ts), default on.
 */
export interface ViewerOpts {
  tileCache?: 'auto' | number
  fade?: boolean
  /** Cesium ion failed (terrain.ts, imagery.ts): the keyless terrain or imagery took its place; why. */
  onIonFallback?: (what: 'terrain' | 'imagery', why: string) => void
}

/**
 * The one Cesium Viewer: configured terrain + imagery, no stock widgets. Credits go to a detached element, so no credit
 * bar or "Powered by" logo shows (a personal-use app); the app has its own fullscreen button, flight card and picking.
 * depthTestAgainstTerrain hides aircraft and runway planes behind hills. Sharper imagery dissolves in over imageryFade's
 * FADE_MS instead of popping (opts.fade). The adaptive TileCache listens to scene.postRender, so it dies with the viewer.
 */
export async function createViewer(el: HTMLElement | string, cfg: ClientConfig, opts: ViewerOpts = {}): Promise<Viewer> {
  const [terrainProvider, imagery] = await Promise.all([
    makeTerrain(cfg, (why) => opts.onIonFallback?.('terrain', why)), makeImagery(cfg, (why) => opts.onIonFallback?.('imagery', why)),
  ])
  installImageryFade() // false on a Cesium without the privates it needs: no fade, the globe pops as before
  imageryFade.enabled = opts.fade ?? true
  const viewer = new Viewer(el, {
    terrainProvider,
    baseLayer: imagery ? new ImageryLayer(imagery) : false,
    timeline: false,
    animation: false,
    geocoder: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    creditContainer: document.createElement('div'), // never attached
    requestRenderMode: false,
  })
  viewer.scene.globe.depthTestAgainstTerrain = true
  // Ground whose picture has not come yet (the first seconds, a source swapped mid-flight) in a dark neutral, not Cesium's navy:
  // navy squares over the land read as a broken picture (the user's chase over Israel, 2026-10-14).
  viewer.scene.globe.baseColor = Color.fromCssColorString('#1e2428')
  viewer.scene.fog.screenSpaceErrorFactor = FAR_GROUND_SSE
  viewer.scene.useDepthPicking = false // nothing reads the depth back (Scene.pickPosition): no full-screen depth copy each frame
  keepCanvasSize(viewer.canvas)
  fadeOffOnDestroy(viewer) // Viewer.destroy frees no globe tiles, so the running fades are ended first
  // Never both: a TileCache would overwrite a fixed size on its next change.
  if (typeof opts.tileCache === 'number') viewer.scene.globe.tileCacheSize = opts.tileCache
  else new TileCache(viewer)
  return viewer
}

