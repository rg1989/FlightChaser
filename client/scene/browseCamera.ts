// client/scene/browseCamera.ts
// Browse mode's camera: a north-up, straight-down view like a slippy map, which the person may tilt (a right-button drag,
// which on a Mac trackpad is a two-finger click held and moved; Ctrl + drag; a middle drag: Cesium's own, BROWSE_TILT_EVENTS;
// Shift + two fingers on a trackpad, browseTilt) up to MAX_TILT_RAD off straight down, and turn (the same drags sideways).
// N brings it back straight down, north up. The view is kept as the ground point at the canvas's centre, the camera's
// distance to it (its "height": the zoom) and its heading and pitch; a pan, a pinch and a jump keep the tilt. Cesium's own
// controls still pan (drag) and zoom (wheel, pinch), within MIN_ZOOM_M … MAX_ZOOM_M. On a trackpad, two fingers pan
// (browseDrag) and a pinch zooms (browsePinch).
import { CameraEventType, Cartesian2, Cartesian3, Ellipsoid, KeyboardEventModifier, Math as CesiumMath, Matrix4, Rectangle, Transforms } from 'cesium'
import type { ScreenSpaceCameraController, Viewer } from 'cesium'
import { attachTrackpad } from './trackpad.ts'

export const BROWSE_HEIGHT_M = 300_000 // ≈ 189 nm across the wider canvas axis (viewWidthM)
export const BROWSE_FLY_S = 1.2
export const MIN_ZOOM_M = 2_000
export const MAX_ZOOM_M = 10_000_000
/** Cesium's default PerspectiveFrustum.fov (60°). It spans the wider canvas axis. */
export const CESIUM_FOV_RAD = Math.PI / 3
// ponytail: the helpers treat the Earth as a sphere of the WGS84 equatorial radius: exact east-west along the equator,
// ≤ 0.34 % off elsewhere. Upgrade: pick the camera's rays against Ellipsoid.WGS84 (viewRectangleDeg already does).
const EARTH_R = 6_378_137
const TOP_DOWN = { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 }
/** How far the map tilts off straight down: 70°, the camera no flatter than 20° under the horizon. */
export const MAX_TILT_RAD = CesiumMath.toRadians(70)
const FLATTEST_PITCH = -CesiumMath.PI_OVER_TWO + MAX_TILT_RAD
const MAX_DRAG_LAT = CesiumMath.toRadians(89) // a drag stops short of the pole, where north-up has no meaning

/** Visible ground rectangle in degrees. west > east when it spans the antimeridian. */
export interface RectDeg {
  west: number
  south: number
  east: number
  north: number
}

/**
 * Ground distance (m) spanned by a fan of rays fovRad wide, from a camera heightM up looking straight down.
 * A ray at angle θ off nadir meets the sphere at central angle asin((R+h)/R · sin θ) − θ. Once the edge rays miss the
 * Earth, the visible cap stops at the horizon, acos(R/(R+h)).
 */
export function viewWidthM(heightM: number, fovRad: number = CESIUM_FOV_RAD): number {
  const half = fovRad / 2
  const k = ((EARTH_R + heightM) / EARTH_R) * Math.sin(half)
  const phi = k <= 1 ? Math.asin(k) - half : Math.acos(EARTH_R / (EARTH_R + heightM))
  return 2 * EARTH_R * phi
}

/** Inverse of viewWidthM: the camera height that shows widthM across fovRad. Infinity when no height can. */
export function heightForViewWidthM(widthM: number, fovRad: number = CESIUM_FOV_RAD): number {
  const half = fovRad / 2
  const phi = widthM / (2 * EARTH_R)
  if (phi <= Math.PI / 2 - half) return EARTH_R * (Math.sin(half + phi) / Math.sin(half) - 1)
  if (phi < Math.PI / 2) return EARTH_R / Math.cos(phi) - EARTH_R
  return Number.POSITIVE_INFINITY
}

/**
 * The camera height that shows the whole of box, top-down, on a canvas widthPx × heightPx, with a little to spare. The
 * field of view spans the wider axis; the narrower one sees proportionally less.
 */
export function heightToFit(box: RectDeg, widthPx: number, heightPx: number, spare = 1.05): number {
  const mPerDeg = (EARTH_R * Math.PI) / 180
  const nsM = (box.north - box.south) * mPerDeg
  const ewM = (box.east - box.west) * mPerDeg * Math.cos((((box.north + box.south) / 2) * Math.PI) / 180)
  const narrowFov = 2 * Math.atan((Math.tan(CESIUM_FOV_RAD / 2) * Math.min(widthPx, heightPx)) / Math.max(widthPx, heightPx))
  const [fovX, fovY] = widthPx >= heightPx ? [CESIUM_FOV_RAD, narrowFov] : [narrowFov, CESIUM_FOV_RAD]
  return Math.max(heightForViewWidthM(ewM * spare, fovX), heightForViewWidthM(nsM * spare, fovY))
}

/**
 * The top-down view (where the camera looks, and from how high) that shows the whole of box inside one part of a canvas
 * widthPx × heightPx: `part`, in CSS px from the canvas's top-left (the map clear of the cards and bars), with a little to
 * spare. The box's middle comes to the part's middle. The part's angles are taken as if it sat on the camera's axis, which
 * is near enough for a part that holds most of the canvas.
 */
export function viewToFit(box: RectDeg, widthPx: number, heightPx: number, part: { x: number; y: number; w: number; h: number }, spare = 1.05):
  { lat: number; lon: number; heightM: number } {
  const mPerDeg = (EARTH_R * Math.PI) / 180
  const lat = (box.north + box.south) / 2
  const lon = (box.west + box.east) / 2
  const cos = Math.cos((lat * Math.PI) / 180)
  const perPx = Math.tan(CESIUM_FOV_RAD / 2) / (Math.max(widthPx, heightPx) / 2) // the tangent of the angle one pixel off the axis
  const fov = (px: number): number => 2 * Math.atan((perPx * Math.max(1, px)) / 2)
  const heightM = Math.max(
    heightForViewWidthM((box.east - box.west) * mPerDeg * cos * spare, fov(part.w)),
    heightForViewWidthM((box.north - box.south) * mPerDeg * spare, fov(part.h)),
  )
  // The camera looks at the canvas's middle: the box's middle is put as far from it as the part's middle is.
  const mPerPx = heightM * perPx
  const dx = part.x + part.w / 2 - widthPx / 2
  const dy = part.y + part.h / 2 - heightPx / 2
  return { lat: lat + (dy * mPerPx) / mPerDeg, lon: lon - (dx * mPerPx) / (mPerDeg * Math.max(0.05, cos)), heightM }
}

/** Is (lat, lon) inside r? Edges count as inside; a rectangle with west > east wraps across the antimeridian. */
export function containsDeg(r: RectDeg, lat: number, lon: number): boolean {
  if (lat < r.south || lat > r.north) return false
  return r.west <= r.east ? lon >= r.west && lon <= r.east : lon >= r.west || lon <= r.east
}

type Saved = Pick<ScreenSpaceCameraController, 'enableTilt' | 'enableLook' | 'minimumZoomDistance' | 'maximumZoomDistance' | 'maximumTiltAngle' | 'tiltEventTypes' | 'zoomEventTypes'>

/**
 * Browse: a right-button drag tilts and turns the map (a Mac trackpad's two-finger click held and moved is one), as
 * Ctrl + drag and a middle drag do; the wheel and a pinch zoom. Cesium's default zooms on a right drag.
 */
export const BROWSE_TILT_EVENTS = [
  CameraEventType.MIDDLE_DRAG,
  CameraEventType.PINCH,
  CameraEventType.RIGHT_DRAG,
  { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
  { eventType: CameraEventType.RIGHT_DRAG, modifier: KeyboardEventModifier.CTRL },
]
export const BROWSE_ZOOM_EVENTS = [CameraEventType.WHEEL, CameraEventType.PINCH]
/** Keyed by controller, present = browsing: its settings from before browse, and the detach of browse's trackpad. */
const saved = new WeakMap<object, { before: Saved; detach: () => void; aim: ReturnType<typeof browseView>; flyEndMs: number }>()

export function isBrowsing(viewer: Viewer): boolean {
  return saved.has(viewer.scene.screenSpaceCameraController)
}

/** A camera this close to straight down (radians) counts as straight down: its centre is the point under it. */
const TOP_DOWN_EPS = 1e-6

/**
 * The browse view: the ground at the canvas's centre (degrees), the camera's distance to it (m) and its heading and pitch
 * (radians) in that ground point's own east-north-up frame (Cesium's camera.pitch is the camera's own: from 50 km back,
 * a few tenths of a degree off). Not browsing, or with the globe off the centre: the point under the camera, its height,
 * north up, straight down.
 */
export function browseView(viewer: Viewer): { lat: number; lon: number; rangeM: number; heading: number; pitch: number } {
  const camera = viewer.camera
  const under = camera.positionCartographic
  const below = { lat: CesiumMath.toDegrees(under.latitude), lon: CesiumMath.toDegrees(under.longitude), rangeM: under.height }
  if (!isBrowsing(viewer)) return { ...below, heading: 0, pitch: TOP_DOWN.pitch }
  if (camera.pitch < TOP_DOWN.pitch + TOP_DOWN_EPS) return { ...below, heading: camera.heading, pitch: TOP_DOWN.pitch }
  const canvas = viewer.scene.canvas
  const hit = camera.pickEllipsoid(new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2), Ellipsoid.WGS84)
  const g = hit === undefined ? undefined : Ellipsoid.WGS84.cartesianToCartographic(hit)
  if (hit === undefined || g === undefined) return { ...below, heading: camera.heading, pitch: TOP_DOWN.pitch }
  const toEnu = Matrix4.inverseTransformation(Transforms.eastNorthUpToFixedFrame(hit), new Matrix4())
  const d = Matrix4.multiplyByPointAsVector(toEnu, camera.directionWC, new Cartesian3())
  const u = Matrix4.multiplyByPointAsVector(toEnu, camera.upWC, new Cartesian3())
  const pitch = Math.asin(CesiumMath.clamp(d.z / Cartesian3.magnitude(d), -1, 1))
  return {
    lat: CesiumMath.toDegrees(g.latitude),
    lon: CesiumMath.toDegrees(g.longitude),
    rangeM: Cartesian3.distance(camera.positionWC, hit),
    heading: Math.atan2(u.x, u.y), // looking down, the camera's up leans along its heading (roll 0)
    pitch: CesiumMath.clamp(pitch, TOP_DOWN.pitch, FLATTEST_PITCH),
  }
}

type Orientation = { heading: number; pitch: number; roll: number } | { direction: Cartesian3; up: Cartesian3 }

/**
 * The camera's place and orientation to look at (lat, lon) on the ellipsoid from rangeM away, along heading, at pitch
 * (below 0: down), both in that point's east-north-up frame.
 */
function cameraAt(lat: number, lon: number, rangeM: number, heading: number, pitch: number): { destination: Cartesian3; orientation: Orientation } {
  if (pitch < TOP_DOWN.pitch + TOP_DOWN_EPS) { // straight down: exactly above
    return { destination: Cartesian3.fromDegrees(lon, lat, rangeM), orientation: { heading, pitch: TOP_DOWN.pitch, roll: 0 } }
  }
  const enu = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(lon, lat, 0))
  const sh = Math.sin(heading), ch = Math.cos(heading), sp = Math.sin(pitch), cp = Math.cos(pitch)
  const forward = new Cartesian3(sh * cp, ch * cp, sp)
  const up = new Cartesian3(-sh * sp, -ch * sp, cp)
  const back = Cartesian3.multiplyByScalar(forward, -rangeM, new Cartesian3()) // the camera stands back along its view
  return {
    destination: Matrix4.multiplyByPoint(enu, back, new Cartesian3()),
    orientation: { direction: Matrix4.multiplyByPointAsVector(enu, forward, forward), up: Matrix4.multiplyByPointAsVector(enu, up, up) },
  }
}

/**
 * Fly to the browse view of center (or of the view's own centre when null) heightM away: straight down and north up on
 * coming from the chase or with topDown, else at the tilt and heading the person left the map at. flyS 0 jumps. Unlocks
 * tilt (up to MAX_TILT_RAD), locks free-look and clamps zoom until exitBrowse; calling it again re-centres.
 * Call ChaseCamera.release() first: it hands the mouse back to Cesium's controls.
 */
export function enterBrowse(viewer: Viewer, center: { lat: number; lon: number } | null, opts: { heightM?: number; flyS?: number; topDown?: boolean } = {}): void {
  const camera = viewer.camera
  const sscc = viewer.scene.screenSpaceCameraController
  const was = browseView(viewer) // read before the lookAt frame is dropped: not browsing, it is the point under the camera
  const s = saved.get(sscc)
  // During a flight of ours the camera is on its way: the tilt is the one that flight was asked for.
  const aim = s !== undefined && performance.now() < s.flyEndMs ? s.aim : was
  const keep = s !== undefined && opts.topDown !== true
  if (!saved.has(sscc)) {
    const { enableTilt, enableLook, minimumZoomDistance, maximumZoomDistance, maximumTiltAngle, tiltEventTypes, zoomEventTypes } = sscc
    const detach = attachTrackpad(viewer.scene.canvas, {
      drag: (dx, dy) => browseDrag(viewer, dx, dy),
      pinch: (ratio, x, y) => browsePinch(viewer, ratio, x, y),
      tilt: (dy) => browseTilt(viewer, dy),
    })
    // The right button's menu would open on the press (macOS) and end the drag: none over the map while browsing.
    const canvas = viewer.scene.canvas as Partial<HTMLCanvasElement>
    const noMenu = (e: Event): void => e.preventDefault()
    canvas.addEventListener?.('contextmenu', noMenu)
    const untrack = (): void => { detach(); canvas.removeEventListener?.('contextmenu', noMenu) }
    saved.set(sscc, { before: { enableTilt, enableLook, minimumZoomDistance, maximumZoomDistance, maximumTiltAngle, tiltEventTypes, zoomEventTypes }, detach: untrack, aim: was, flyEndMs: 0 })
  }
  sscc.enableTilt = true
  sscc.maximumTiltAngle = MAX_TILT_RAD
  sscc.tiltEventTypes = BROWSE_TILT_EVENTS
  sscc.zoomEventTypes = BROWSE_ZOOM_EVENTS
  sscc.enableLook = false
  sscc.minimumZoomDistance = MIN_ZOOM_M
  sscc.maximumZoomDistance = MAX_ZOOM_M

  camera.cancelFlight() // flyTo cancels a running flight itself; setView alone would leave it running
  camera.lookAtTransform(Matrix4.IDENTITY) // a chase camera leaves its lookAt frame on the camera
  const lat = center ? center.lat : was.lat
  const lon = center ? center.lon : was.lon
  const heightM = CesiumMath.clamp(opts.heightM ?? BROWSE_HEIGHT_M, MIN_ZOOM_M, MAX_ZOOM_M)
  const heading = keep ? aim.heading : 0
  const pitch = keep ? aim.pitch : TOP_DOWN.pitch
  const { destination, orientation } = cameraAt(lat, lon, heightM, heading, pitch)
  const flyS = Math.max(0, opts.flyS ?? BROWSE_FLY_S)
  const now = saved.get(sscc)
  if (now) {
    now.aim = { lat, lon, rangeM: heightM, heading, pitch }
    now.flyEndMs = flyS === 0 ? 0 : performance.now() + flyS * 1000
  }
  if (flyS === 0) camera.setView({ destination, orientation })
  else camera.flyTo({ destination, orientation, duration: flyS })
}

/** Leave browse: stop a browse flight still under way (it would fight the chase camera) and restore the controller settings. */
export function exitBrowse(viewer: Viewer): void {
  const sscc = viewer.scene.screenSpaceCameraController
  const s = saved.get(sscc)
  if (!s) return
  viewer.camera.cancelFlight()
  s.detach()
  Object.assign(sscc, s.before)
  saved.delete(sscc)
}

/** Browse: the map follows two fingers moving (dxPx, dyPx) (right, down) on a trackpad. */
export function browseDrag(viewer: Viewer, dxPx: number, dyPx: number): void {
  moveView(viewer, dxPx, dyPx)
}

/**
 * Browse: two fingers spread by ratio around (xPx, yPx) (CSS px from the canvas's top-left). The camera comes that much
 * closer to the centre, no closer than MIN_ZOOM_M over the ground there (where Cesium would lift it) and no farther than
 * MAX_ZOOM_M, and the ground under the fingers stays under them.
 */
export function browsePinch(viewer: Viewer, ratio: number, xPx: number, yPx: number): void {
  const v = browseView(viewer)
  const canvas = viewer.scene.canvas
  const ground = viewer.scene.globe.getHeight(viewer.camera.positionCartographic) ?? 0
  const rangeM = CesiumMath.clamp(v.rangeM / ratio, ground + MIN_ZOOM_M, MAX_ZOOM_M)
  const k = 1 - rangeM / v.rangeM // the share of the way to the fingers that the middle moves
  moveView(viewer, (canvas.clientWidth / 2 - xPx) * k, (canvas.clientHeight / 2 - yPx) * k, rangeM)
}

/**
 * Browse: Shift + two fingers moving dyPx (down) on a trackpad. Up tilts the map toward the horizon, down back toward
 * straight down (a canvas's height is about 90°), round the ground at the centre, heading and zoom kept.
 */
export function browseTilt(viewer: Viewer, dyPx: number): void {
  const v = browseView(viewer)
  const pitch = CesiumMath.clamp(v.pitch - (dyPx / Math.max(1, viewer.scene.canvas.clientHeight)) * CesiumMath.PI_OVER_TWO, TOP_DOWN.pitch, FLATTEST_PITCH)
  viewer.camera.cancelFlight()
  viewer.camera.setView(cameraAt(v.lat, v.lon, v.rangeM, v.heading, pitch))
}

/**
 * Moves the view so the ground follows a drag of (dxPx, dyPx), at the centre's scale (a pinhole camera over flat ground:
 * exact there straight down, and close enough across the view), then puts the camera rangeM from the new centre, its
 * heading and tilt kept.
 * ponytail: tilted, the far half of the view moves faster than the fingers and the near half slower. Upgrade: move the
 * ground picked under the fingers (pickEllipsoid before and after).
 */
function moveView(viewer: Viewer, dxPx: number, dyPx: number, rangeM?: number): void {
  const v = browseView(viewer)
  const canvas = viewer.scene.canvas
  const mPerPx = (2 * v.rangeM * Math.tan(CESIUM_FOV_RAD / 2)) / Math.max(canvas.clientWidth, canvas.clientHeight)
  // Screen right is (cos h, −sin h) east-north, screen up (sin h, cos h); the centre goes against the fingers.
  const sin = Math.sin(v.heading)
  const cos = Math.cos(v.heading)
  const eastM = (-dxPx * cos + dyPx * sin) * mPerPx
  const northM = (dxPx * sin + dyPx * cos) * mPerPx
  const latR = CesiumMath.toRadians(v.lat)
  const lat = CesiumMath.clamp(latR + northM / EARTH_R, -MAX_DRAG_LAT, MAX_DRAG_LAT)
  const lon = CesiumMath.toRadians(v.lon) + eastM / (EARTH_R * Math.cos(latR))
  const camera = viewer.camera
  camera.cancelFlight() // the fingers win over a flight still under way
  const r = rangeM ?? v.rangeM
  camera.setView(cameraAt(CesiumMath.toDegrees(lat), CesiumMath.toDegrees(lon), r, v.heading, v.pitch))
}

/**
 * A tilted map's footprint: the ground the same view would show straight down (same centre, zoom and heading), as a
 * rectangle turned to the heading. The tilted map shows only the aircraft inside it, so tilting shows no new ones.
 */
export interface Footprint { lat: number; lon: number; cosLat: number; sin: number; cos: number; halfXM: number; halfYM: number }

/** The browse view counts as tilted past this much off straight down (radians): below it the map is as top-down. */
export const TILTED_RAD = CesiumMath.toRadians(2)

/** The tilted map's footprint; null straight down (or nearly: TILTED_RAD), and when not browsing. */
export function footprint(viewer: Viewer, v = browseView(viewer)): Footprint | null {
  if (!isBrowsing(viewer) || v.pitch < TOP_DOWN.pitch + TILTED_RAD) return null
  const canvas = viewer.scene.canvas
  const w = Math.max(1, canvas.clientWidth)
  const h = Math.max(1, canvas.clientHeight)
  const mPerPx = (2 * v.rangeM * Math.tan(CESIUM_FOV_RAD / 2)) / Math.max(w, h) // a pinhole over flat ground, as moveView
  return {
    lat: v.lat, lon: v.lon, cosLat: Math.cos(CesiumMath.toRadians(v.lat)), sin: Math.sin(v.heading), cos: Math.cos(v.heading),
    halfXM: (mPerPx * w) / 2, halfYM: (mPerPx * h) / 2,
  }
}

const M_PER_DEG = (EARTH_R * Math.PI) / 180

/** Is (lat, lon) inside the footprint? Flat over it: a footprint is at most a few hundred km across. */
export function inFootprint(f: Footprint, lat: number, lon: number): boolean {
  const n = (lat - f.lat) * M_PER_DEG
  let dLon = lon - f.lon
  if (dLon > 180) dLon -= 360
  else if (dLon < -180) dLon += 360
  const e = dLon * M_PER_DEG * f.cosLat
  return Math.abs(e * f.cos - n * f.sin) <= f.halfXM && Math.abs(e * f.sin + n * f.cos) <= f.halfYM
}

/** The footprint's corners' bounding rectangle in degrees (west > east across the antimeridian). */
function footprintRect(f: Footprint): RectDeg {
  let dLat = 0
  let dLon = 0
  for (const [x, y] of [[f.halfXM, f.halfYM], [f.halfXM, -f.halfYM]]) {
    dLat = Math.max(dLat, Math.abs(-x * f.sin + y * f.cos) / M_PER_DEG)
    dLon = Math.max(dLon, Math.abs(x * f.cos + y * f.sin) / (M_PER_DEG * Math.max(0.05, f.cosLat)))
  }
  const wrap = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180
  return { west: wrap(f.lon - dLon), south: Math.max(-90, f.lat - dLat), east: wrap(f.lon + dLon), north: Math.min(90, f.lat + dLat) }
}

const scratchRect = new Rectangle()

/**
 * The ground the camera sees (Camera.computeViewRectangle, WGS84), in degrees; null when the globe is out of view.
 * Tilted, the footprint's (what the same view shows straight down): the list, the badge and the asks keep to it.
 */
export function viewRectangleDeg(viewer: Viewer): RectDeg | null {
  const f = footprint(viewer)
  if (f !== null) return footprintRect(f)
  const r = viewer.camera.computeViewRectangle(Ellipsoid.WGS84, scratchRect)
  if (!r) return null
  const d = CesiumMath.toDegrees
  return { west: d(r.west), south: d(r.south), east: d(r.east), north: d(r.north) }
}
