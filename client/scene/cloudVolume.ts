// client/scene/cloudVolume.ts
// The chase's weather as volumes: one post-process pass that walks every pixel's ray through the weather field (wxField.ts), so a cloud
// is a body with a near side and a far side. The aircraft flies into it and is veiled in it (nothing is cleared round it; a cloud
// hides a little over half of what is behind it and no more: cloudShaders.ts VEIL), and the terrain, the buildings and the aircraft
// hide the cloud behind them and are veiled by the cloud in front, as the depth buffer says. Weather3D hands it the cloud specs of every source at once (draw), with the weather satellite's cloud over the same
// square when a frame is in use (satGrid.ts: the field takes it as cover directly), and it has the field of them made round the place
// given: by its builder (fieldBuilder.ts), in the app a worker, so that the frames do not wait for it. Until the builder answers, the
// field made last is drawn, and asked by the HUD; then the new one is taken (the field, its two images, and with the first the noise).
// The pass is a PostProcessStageComposite of two stages, the march at half the size and the mix at full size: cloudShaders.ts has
// their shaders and says what each draws (the clouds in two looks, the rain, the shadows; the hazard areas' edges and the level
// slice, sorted with the cloud; the track line). This file makes the pass and gives the shaders their numbers.
// The march is walked at a tier (tier: marchPace.ts MARCH_TIERS, the first until told; Weather3D tells it the pace's start tier at
// once): its step budget, whether it reads the noise's finest octave, whether the ground has the clouds' shadows, and its size.
// The pace that picks the tier judges by the pass's own time on the graphics card, which the volume measures where the browser
// can (passMs, passParts: passTimer.ts), and is asked only while the pass is in the scene (drawn).
// The shader works in a frame of its own, so that it holds no large number: km east, north and up from the field's middle at sea level
// (localFrame; JS gives it u_eyeToLocal each frame, worked out in doubles). A point's height over the sea is z + (x² + y²) / 2R, and
// its place on the field's flat map follows from x and y (localToMap, the shader's toMap: to 40 m within 150 km, 100 m in the corners).
// Four images, the volume's own on the graphics card (gpuImage.ts: their bytes go up as they are, nothing premultiplied or flipped,
// and the pass's samplers are asked for them each frame): the field's atlas (wxField.ts fieldAtlas, written a band's tile at a time);
// the clear-air map (wxSurvey.ts survey); a noise volume of 64³ packed as 64 tiles (cloudNoise.ts noiseAtlas), fixed to the Earth, not
// to the field: a field built round another place keeps every cloud's detail; and the hazard areas' edges nearest the aircraft, at
// most 48 (wxEdges.ts hazardEdges, packEdges).
// A field that comes is not drawn at once: the atlas is 6 MB, and written to the card in one frame it holds the frame up. The field
// and the clear-air map have a second pair of images. A coming field's bands are written into that pair, one band a frame, then its
// clear-air map (frame(); all at once where the field was made within draw itself: no worker, so no frame was spared anyway), while
// the pass goes on drawing the field in use from the first pair; at the frame after the last write the pairs change places, and
// with them the field in use, its frame, its heights and the edges laid in it (a frame that writes nothing to the card): one frame
// draws the old field whole, the next the new one whole. The pass stands
// through it all: it is made again only for another size of march.
// ponytail: the 48 edges nearest the aircraft are picked when the hazard areas are given and when a field comes into use (35 to 52 km
// of flight), not as the aircraft moves: among more than 48, one that has become nearer since is not yet drawn. Upgrade: pick again
// every few km.
// While hidden, while there is no cloud, no hazard area's edge and no aid to draw, and once destroyed there is no stage in the scene
// and no image on the card, so nothing runs and nothing is held. Shown again, the images are made and written again from the field
// kept. With no cloud the images are there and are not read: the march walks no ray.
// A shader that another graphics card will not compile would stop Cesium's render loop, and with it the whole viewer: a render error
// while the pass is in the scene takes the pass out for good (failed, onFailed; resumeRendering starts Cesium's loop again).
// ponytail: the clouds stand at their true heights when the relief is flattened or grown (the puffs moved with their station's ground).
// Upgrade: the frame's relief in the height the shader takes.
import { Cartesian2, Cartesian3, Cartesian4, Ellipsoid, Matrix4, PostProcessStage, PostProcessStageComposite, Transforms, type Camera, type PostProcessStageCollection } from 'cesium'
import { geoidN } from '../../shared/geoid.ts'
import type { TerrainFrame } from '../types.ts'
import { sunBrightness, type CloudSpec } from './cloudField.ts'
import { NOISE_KM } from './cloudNoise.ts'
import { ATLAS_H, ATLAS_W, BOX_PAD_KM, MARCH_SHADER, MIX_SHADER, PATH_N, R_KM, VEIL } from './cloudShaders.ts'
import { fieldBuilder, type FieldBuilder } from './fieldBuilder.ts'
import { bytesImage, textureImages, type GpuImage, type MakeImage } from './gpuImage.ts'
import { MARCH_TIERS } from './marchPace.ts'
import { passTimer, type PassTimer } from './passTimer.ts'
import type { SatGrid } from './satGrid.ts'
import type { AheadPath } from './wxAhead.ts'
import { EDGE_TEXELS, MAX_EDGES, edgeBound, hazardEdges, packEdges } from './wxEdges.ts'
import { FIELD_KM, FIELD_N, type Bitmap, type WxField } from './wxField.ts'
import { NEAR_N } from './wxSurvey.ts'
import { packSpecs, type FieldMade } from './wxFieldJob.ts'
import type { Hazard } from './wxGeo.ts'

export type CloudLook = 'natural' | 'severity' | 'sculpted' // (sculpted is not this pass's: sculptedClouds.ts draws it, as bodies)
/** How a hazard area's edge is drawn: a curtain hung from its top, a fence (lines and posts), or the box of today (a faint fill and its edges). */
export type HazardStyle = 'curtain' | 'fence' | 'box'
const LOOK: Record<CloudLook, number> = { natural: 0, severity: 1, sculpted: 1 } // u_look
const HAZARD: Record<HazardStyle, number> = { curtain: 0, fence: 1, box: 2 } // u_hazard
const KM_PER_DEG = 111.195 // of latitude on the sphere the heights curve over (R_KM): the field's map
const RAD = Math.PI / 180
const TEXEL_KM = FIELD_KM / FIELD_N
const SHADOW = 0.3 // the ground under full cover is darkened by this, by day: a see-through cloud's shadow, light enough to read the map in (it was 0.5)
const NO_TOP_KM = -10 // the highest top given to the march when there is no cloud: under any ground, so no ray is walked
const BANDS_A_FRAME = 1 // of a coming field, written to the graphics card in one frame (a band's tile is 1 MB)

/** The numbers that turn a place of the frame into a place of the field's map (mapScale). */
export interface MapScale {
  sx: number // the map's km per km of the frame eastward, at the field's middle
  sy: number // and northward
  t: number // tan(latitude) / R: how the meridians close in northward, per km
}

const TO_KM = Matrix4.fromUniformScale(0.001)

/**
 * World metres to the frame at lat, lon, heightM (above the ellipsoid): km east, north and up from there.
 */
export function localFrame(lat: number, lon: number, heightM: number, result = new Matrix4()): Matrix4 {
  const toWorld = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(lon, lat, heightM), undefined, result)
  return Matrix4.multiply(TO_KM, Matrix4.inverseTransformation(toWorld, result), result)
}

/** Eye metres to the frame: the frame's matrix (localFrame) times the camera's inverse view, in doubles, so the shader's floats hold only km round the field. */
export function eyeToLocal(inverseView: Matrix4, frame: Matrix4, result: Matrix4): Matrix4 {
  return Matrix4.multiply(frame, inverseView, result)
}

/** The map's scale in the frame at lat, lon, heightM: the field maps a degree as 111.195 km (× cos(lat) eastward), the frame is the ellipsoid's metres. */
export function mapScale(lat: number, lon: number, heightM: number): MapScale {
  const frame = localFrame(lat, lon, heightM)
  const d = 0.01 // degrees: about a km
  const east = Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(lon + d, lat, heightM), new Cartesian3())
  const north = Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(lon, lat + d, heightM), new Cartesian3())
  return { sx: (d * KM_PER_DEG * Math.max(0.01, Math.cos(lat * RAD))) / east.x, sy: (d * KM_PER_DEG) / north.y, t: Math.tan(lat * RAD) / R_KM }
}

/**
 * A place of the frame (km) as the field maps it: [km east, km north, km above the sea]. The shader's toMap. The height is the frame's
 * z and the Earth's curve; east and north are the frame's x and y drawn in to sea level, with a tangent plane's terms of the second
 * and third order (the meridians close in northward; a parallel bends away from the plane's east axis; an arc is longer than its chord).
 */
export function localToMap(x: number, y: number, z: number, s: MapScale): [number, number, number] {
  const h = z + (x * x + y * y) / (2 * R_KM)
  const k = 1 - h / R_KM
  const [ex, ey] = [x * k, y * k]
  const c = 1 / (R_KM * R_KM)
  const east = ex * (1 + s.t * ey + (s.t * s.t + 0.5 * c) * ey * ey + (c / 6 - (s.t * s.t) / 3) * ex * ex)
  const north = ey - 0.5 * s.t * ex * ex * (1 + s.t * ey) + (c / 6) * ey * ey * ey
  return [s.sx * east, s.sy * north, h]
}

/**
 * The atlas's texture coordinate of a place of the map (km east and north of the field's middle) in band b's tile. The shader's band().
 * A place beyond the outer texels' middles has theirs, as sampleField holds them out to the edge, so no bilinear mix reaches the next
 * tile. The image's first row is the texture's first (v = 0): its bytes are written as they are (gpuImage.ts).
 */
export function tileUv(band: number, eastKm: number, northKm: number): [number, number] {
  const inTile = (km: number): number => Math.min(FIELD_N - 1, Math.max(0, km / TEXEL_KM + (FIELD_N - 1) / 2)) + 0.5
  return [((band % 3) * FIELD_N + inTile(eastKm)) / ATLAS_W, (Math.floor(band / 3) * FIELD_N + inTile(northKm)) / ATLAS_H]
}

/** What of Cesium's viewer resumeRendering touches. */
export interface RenderLoop {
  useDefaultRenderLoop: boolean
  container: Element
  isDestroyed(): boolean
}

/**
 * After a render error, rendering again. On an error in a frame Cesium's scene raises renderError and goes no further with it
 * (rethrowRenderErrors is off), and its widget, which listens, stops its own render loop (useDefaultRenderLoop off) and lays its
 * error panel over the view: the viewer is then a still picture. This closes that panel by its own button and starts the loop again,
 * two frames on: the loop that ran has one more frame asked for, at which it sees that it is stopped; started before that, there
 * would be two loops. For a caller that has taken what failed out of the scene (CloudVolume); if the frames go on failing, Cesium
 * stops again, and its panel stays.
 */
export function resumeRendering(viewer: RenderLoop, later: (f: () => void) => void = (f) => void requestAnimationFrame(f)): void {
  const close = (): void => (viewer.container.querySelector('.cesium-widget-errorPanel button') as HTMLElement | null)?.click()
  close()
  later(() => later(() => {
    if (viewer.isDestroyed()) return
    close() // put up since, if Cesium's widget heard the error after the caller did
    if (!viewer.useDefaultRenderLoop) viewer.useDefaultRenderLoop = true
  }))
}

let passes = 0 // each pass's stages are named by its number: a stage's name is unique in the scene

/** What of Cesium's scene the volume touches: its post-process stages, its camera, the event it raises when a frame fails, and its graphics context (private; the volume's images are made in it). */
export interface VolumeScene {
  postProcessStages: PostProcessStageCollection
  camera: Camera
  renderError?: { addEventListener(listener: (scene: unknown, error: unknown) => void): () => void }
  context?: unknown
}

/** A field's two images on the graphics card: its atlas and its clear-air map. */
interface Held {
  field: GpuImage
  near: GpuImage
}

/**
 * Draws the weather field as volumes, and in the same pass the hazard areas' edges, the level slice and the track line. One pass in
 * the scene while it is shown and has cloud, an edge or an aid to draw; none otherwise, and none ever again after a render error
 * while its pass was in the scene (failed). The shader's numbers and images are read from this each frame as Cesium draws (its
 * uniforms are functions).
 */
export class CloudVolume {
  /** The look, read each frame: changing it costs nothing. */
  look: CloudLook = 'severity'
  /**
   * The clouds' opacity (the Weather menu's), read each frame: the most a cloud or its rain hides of what is behind it, 0 … 1 (VEIL
   * until told). Their shadow on the ground is as much darker or lighter. At 0 neither is drawn: the hazard areas and the aids are.
   */
  opacity = VEIL
  readonly #stages: PostProcessStageCollection
  readonly #camera: Camera
  readonly #geoid: (lat: number, lon: number) => number
  readonly #onFailed: () => void
  readonly #broken: boolean
  readonly #builder: FieldBuilder
  readonly #image: MakeImage
  readonly #timer: (Pick<PassTimer, 'watch' | 'poll' | 'ms'> & Partial<Pick<PassTimer, 'parts'>>) | null // the pass's time on the graphics card; none where it cannot be asked
  readonly #unlisten: (() => void) | null // ends its listening for the scene's render errors
  readonly #frame = new Matrix4() // world metres to the field's frame
  readonly #eyeToLocal = new Matrix4()
  readonly #noiseFrame = new Matrix4()
  readonly #map = new Cartesian3()
  readonly #plane = new Cartesian2() // the aircraft on the field's map; the field's middle until fade() gives it
  readonly #local = new Cartesian3() // and in the frame
  readonly #aids = new Cartesian2() // u_aids
  readonly #box = new Cartesian4(1, 1, -1, -1) // u_box: the frame's rectangle the field's cover stands in, with the march's margin; none until a field with cloud is in use
  readonly #edgeBound = new Cartesian3() // u_edgeBound
  readonly #path: number[] = Array.from({ length: PATH_N * 3 }, () => 0) // u_path
  readonly #aircraft = new Cartesian3() // u_aircraft: the path's first place
  readonly #scratch = new Cartesian3()
  #pass: PostProcessStageComposite | null = null
  #made: FieldMade | null = null // the field in use: what the pass draws and the HUD asks; kept for images made later (shown again)
  #coming: FieldMade | null = null // a field whose images are being written: it is in use once they are
  #writes: (() => void)[] = [] // what is still to write of them, a band each
  #shown: Held | null = null // the images the pass's samplers are given; none while there is no pass to read them
  #spare: Held | null = null // the pair a coming field is written into; the two then change places
  #up = false // the images shown hold the field in use
  #noise: Bitmap | null = null // the noise, once the builder has given it (with the first field)
  #noiseImage: GpuImage | null = null
  #edgeImage: GpuImage | null = null
  #asked = 0 // fields asked of the builder
  #asking = false // inside draw(): a field that comes now was made here, with no worker
  #late = false // the last field came after draw() had returned: a worker's, so the frames go on while its images are written
  #cloud = false // the field in use has cloud
  #seaM = 0 // the frame's level: the geoid at the field's middle
  #scale: MapScale = { sx: 1, sy: 1, t: 0 }
  #lo: number[] = []
  #hi: number[] = []
  #floor: number[] = []
  #top = 0
  #from: Cartesian3 | null = null // the aircraft as fade() gave it
  #hazards: readonly Hazard[] = []
  #hazardColor: (h: Hazard) => string = () => '#ffffff'
  #style: HazardStyle = 'box'
  #edges: Bitmap = packEdges([]) // the hazard areas' edges in the frame as it stands: what the edge image holds
  #edgeCount = 0
  #ahead: AheadPath | null = null
  #night = 0 // the Sun's night, as frame() gave it
  #light = 1
  #shadow = SHADOW
  #tier = 0 // of MARCH_TIERS
  #show = false
  #failed = false
  #destroyed = false

  /**
   * geoid: the sea's height above the ellipsoid at a place, m (default EGM96). onFailed: told once, when a render error has taken the
   * pass out for good. broken: the march is given a shader that cannot compile (?wxbreak=1: the failure seen handled on any machine).
   * builder: who makes the fields (default: a worker in a page, this thread elsewhere). images: what makes its images (default:
   * textures in the scene's context; with no context, bytes). timer: what times its pass (default: a timer query in the scene's
   * context, where there is one).
   */
  constructor(scene: VolumeScene, opts: {
    geoid?: (lat: number, lon: number) => number; onFailed?: () => void; broken?: boolean; builder?: FieldBuilder; images?: MakeImage; timer?: (Pick<PassTimer, 'watch' | 'poll' | 'ms'> & Partial<Pick<PassTimer, 'parts'>>) | null
  } = {}) {
    this.#stages = scene.postProcessStages
    this.#camera = scene.camera
    this.#geoid = opts.geoid ?? geoidN
    this.#onFailed = opts.onFailed ?? (() => {})
    this.#broken = opts.broken === true
    this.#builder = opts.builder ?? fieldBuilder()
    this.#image = opts.images ?? (scene.context === undefined ? bytesImage : textureImages(scene.context))
    this.#timer = opts.timer !== undefined ? opts.timer : passTimer((scene.context as { _gl?: unknown } | undefined)?._gl)
    this.#unlisten = scene.renderError?.addEventListener((_scene, error) => this.#fail(error)) ?? null
  }

  get show(): boolean {
    return this.#show
  }

  set show(on: boolean) {
    if (this.#destroyed || on === this.#show) return
    this.#show = on
    if (!on) this.#away()
    else if (this.#made !== null && !this.#made.field.empty && !this.#failed) this.#load(this.#made, !this.#late)
    else this.#sync()
  }

  /**
   * The tier the march is walked at, an index into marchPace.ts MARCH_TIERS: the first until told (the pace says when the frames ask
   * for a coarser one). Its step budget, its detail and its shadows are numbers the pass reads each frame; a stage's size is fixed
   * when it is made, so a tier of another size is a new pass (which reads the same images).
   */
  get tier(): number {
    return this.#tier
  }

  set tier(n: number) {
    if (this.#destroyed || n === this.#tier || MARCH_TIERS[n] === undefined) return
    const resized = MARCH_TIERS[n].scale !== MARCH_TIERS[this.#tier].scale
    this.#tier = n
    this.#shadow = MARCH_TIERS[n].shadows ? SHADOW * (1 - this.#night) : 0
    if (resized) this.#sync(true)
  }

  /** The share of the view's width and height the march is walked at: the tier's. */
  get scale(): number {
    return MARCH_TIERS[this.#tier].scale
  }

  /** The pass's time on the graphics card in the last frame timed, ms; not a number where the browser cannot tell it, before it has, or while there is no pass. */
  get passMs(): number {
    return this.#timer?.ms ?? Number.NaN
  }

  /** That time stage by stage, ms: the march, the mix. None where it is not known. */
  get passParts(): readonly number[] {
    return this.#timer?.parts ?? []
  }

  /** Whether the pass is in the scene: there is something to draw, and it is drawn. (The pace is asked only then: with no pass there is no time of it.) */
  get drawn(): boolean {
    return this.#pass !== null
  }

  /** The march's size in pixels for a view of width × height pixels, at the tier in force (as Cesium sizes a stage's image: rounded up). */
  marchSize(width: number, height: number): [number, number] {
    return [Math.ceil(width * this.scale), Math.ceil(height * this.scale)]
  }

  /** The field in use: what the pass draws, and what the HUD asks (wxField.ts sampleField). Null until the first has come. */
  get field(): WxField | null {
    return this.#made?.field ?? null
  }

  /** How long the making of that field took, ms, where it was made (the bench's line says it). */
  get madeMs(): number {
    return this.#made?.ms ?? 0
  }

  /** Whether a render error has taken the pass out of the scene: for good, until the page is loaded again. The field is still built. */
  get failed(): boolean {
    return this.#failed
  }

  /**
   * These clouds in place of those drawn before, once their field is made and its images are written: the builder is asked for the
   * field round `at`, and what is drawn stands until then (see the header). sat: the weather satellite's cloud over the field's
   * square (built round the same place), when a frame is in use.
   */
  draw(specs: readonly CloudSpec[], at: { lat: number; lon: number }, sat: SatGrid | null = null): void {
    if (this.#destroyed) return
    this.#asking = true
    this.#builder.ask({ id: ++this.#asked, specs: packSpecs(specs), lat: at.lat, lon: at.lon, noise: this.#noise === null, sat }, (made) => this.#take(made))
    this.#asking = false
  }

  /**
   * A field the builder has made. Shown, and with cloud: its images are written first (at once when it was made within draw, else a
   * band a frame), and then it is in use. Hidden, failed, or an empty field (which has no images): in use at once.
   */
  #take(made: FieldMade): void {
    if (this.#destroyed) return
    this.#late = !this.#asking
    if (made.noise !== null) {
      this.#noise = made.noise
      this.#writeNoise()
    }
    if (this.#show && !this.#failed && !made.field.empty) this.#load(made, this.#asking)
    else {
      this.#coming = null
      this.#writes.length = 0
      this.#use(made, false)
    }
  }

  /**
   * The hazard areas whose edges are drawn (the nearest MAX_EDGES of them to the aircraft, picked when they are given and when a
   * field comes into use), how (curtain, fence or box: changed on the fly), and each area's CSS colour. Other edges are written into
   * the edge image the pass reads.
   */
  setHazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string): void {
    if (this.#destroyed) return
    this.#hazards = hazards
    this.#style = style
    this.#hazardColor = color
    this.#layEdges()
    this.#sync()
  }

  /**
   * Every frame: the way ahead of the aircraft (wxAhead.ts aheadPath: heights above mean sea level; null: none) and which of the aids
   * drawn from it show: the track line along it, the level slice at its first place's height.
   */
  setAhead(path: AheadPath | null, show: { track: boolean; slice: boolean }): void {
    if (this.#destroyed) return
    this.#ahead = path
    this.#aids.x = path !== null && show.track ? 1 : 0
    this.#aids.y = path !== null && show.slice ? 1 : 0
    this.#placeAhead()
    this.#sync()
  }

  /**
   * Every frame while the weather shows: the Sun's night (the relief drawn is not followed: see the header); and of a coming
   * field's images, a band written, the field coming into use with the last.
   */
  frame(_tf: TerrainFrame, night: number): void {
    const n = Number.isFinite(night) ? Math.min(1, Math.max(0, night)) : 0
    this.#night = n
    this.#light = sunBrightness(n)
    this.#shadow = MARCH_TIERS[this.#tier].shadows ? SHADOW * (1 - n) : 0
    this.#timer?.poll()
    if (this.#coming !== null) this.#write(BANDS_A_FRAME)
  }

  /** Each look: the aircraft, which the reach's fade is centred on. */
  fade(from: Cartesian3): void {
    if (this.#destroyed) return
    this.#from = Cartesian3.clone(from, this.#from ?? new Cartesian3())
    this.#place()
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#show = false
    this.#builder.destroy()
    this.#unlisten?.()
    this.#away()
  }

  /**
   * `made` is to come into use once its images are written into the spare pair: a band's tile at each write (#write), then the
   * clear-air map. now: all of it at once.
   */
  #load(made: FieldMade, now: boolean): void {
    this.#spare ??= { field: this.#image(ATLAS_W, ATLAS_H), near: this.#image(NEAR_N, NEAR_N) }
    const into = this.#spare
    this.#coming = made
    this.#writes = made.tiles.flatMap((tile, b) => (tile === null ? [] : [() => into.field.write(tile, (b % 3) * FIELD_N, Math.floor(b / 3) * FIELD_N)]))
    if (made.near !== null) this.#writes.push(() => into.near.write(made.near!, 0, 0))
    if (now) this.#write(Infinity)
  }

  /**
   * At most n of the coming field's writes done; when none is left, and this call did none (all at once: in the same call), the
   * field is in use from the images written.
   */
  #write(n: number): void {
    let done = 0
    while (done < n && this.#writes.length > 0) {
      this.#writes.shift()!()
      done++
    }
    const made = this.#coming
    if (this.#writes.length > 0 || (done > 0 && n !== Infinity) || made === null || this.#spare === null) return
    ;[this.#shown, this.#spare] = [this.#spare, this.#shown]
    this.#coming = null
    this.#use(made, true)
  }

  /**
   * `made` in place of the field in use: the frame laid at its middle, the hazard areas' edges and the way ahead laid in that frame,
   * its heights for the shader. up: the images shown hold it.
   */
  #use(made: FieldMade, up: boolean): void {
    const f = made.field
    this.#made = made
    this.#up = up
    this.#cloud = !f.empty
    this.#lo = f.lo.map((m) => m / 1000)
    this.#hi = f.hi.map((m) => m / 1000)
    this.#top = f.empty ? NO_TOP_KM : Math.max(...this.#hi)
    const [west, south, east, north] = made.box
    if (west > east) Cartesian4.fromElements(1, 1, -1, -1, this.#box)
    else Cartesian4.fromElements(west - BOX_PAD_KM, south - BOX_PAD_KM, east + BOX_PAD_KM, north + BOX_PAD_KM, this.#box)
    this.#floor = this.#lo.map((km, b) => (made.wet[b] ? 0 : km))
    const seaM = this.#geoid(f.lat, f.lon)
    this.#seaM = seaM
    localFrame(f.lat, f.lon, seaM, this.#frame)
    this.#scale = mapScale(f.lat, f.lon, seaM)
    Cartesian3.fromElements(this.#scale.sx, this.#scale.sy, this.#scale.t, this.#map)
    this.#anchorNoise(f.lat, f.lon, seaM)
    this.#place()
    this.#layEdges()
    this.#placeAhead()
    this.#sync()
  }

  /**
   * The pass in the scene when it should be (shown, a field in use whose images are written if it has cloud, and cloud, a hazard
   * area's edge or an aid to draw), and not otherwise; `fresh`: a pass that stands is replaced (another size of march).
   */
  #sync(fresh = false): void {
    const wanted = this.#show && !this.#destroyed && !this.#failed && this.#made !== null && ((this.#cloud && this.#up) || this.#edgeCount > 0 || this.#aids.x > 0 || this.#aids.y > 0)
    if (this.#pass !== null && (!wanted || fresh)) {
      this.#stages.remove(this.#pass) // and destroys it
      this.#pass = null
      if (!wanted) this.#timer?.watch([]) // no pass: nothing to time, and the time of the one that was is nobody's
    }
    if (wanted && this.#pass === null) this.#stages.add((this.#pass = this.#build()))
  }

  /** Hidden, failed or destroyed: no pass, and no image on the card. A field that was coming is in use (its images are written when it is shown again). */
  #away(): void {
    const coming = this.#coming
    this.#coming = null
    this.#writes.length = 0
    this.#up = false
    if (coming !== null && !this.#destroyed) this.#use(coming, false)
    this.#sync()
    for (const image of [this.#shown?.field, this.#shown?.near, this.#spare?.field, this.#spare?.near, this.#noiseImage, this.#edgeImage]) image?.destroy()
    this.#shown = this.#spare = this.#noiseImage = this.#edgeImage = null
  }

  /**
   * A frame failed to render while the pass was in the scene: the pass is taken out, and none is made again. (Its shaders were only
   * ever compiled on one graphics card; one that will not compile them fails at the pass's first frame, and Cesium then stops
   * rendering altogether.) An error while no pass is in the scene is another part's.
   */
  #fail(error: unknown): void {
    if (this.#pass === null) return
    this.#failed = true
    console.warn('Flight Chaser: the cloud pass is taken out of the scene after a render error; the 3-D clouds are off until the page is loaded again:', error)
    this.#away()
    this.#onFailed()
  }

  /** The hazard areas' edges in the frame as it stands (none before the first field has laid it), packed, and written to the edge image when they are others than it holds. */
  #layEdges(): void {
    if (this.#made === null) return
    const edges = hazardEdges(this.#hazards, this.#frame, this.#seaM, this.#hazardColor, this.#from === null ? undefined : this.#local)
    const packed = packEdges(edges)
    const was = this.#edges.data
    const same = packed.data.every((b, i) => b === was[i])
    this.#edges = packed
    this.#edgeCount = Math.min(edges.length, MAX_EDGES)
    Cartesian3.fromArray(edgeBound(edges.slice(0, MAX_EDGES)), 0, this.#edgeBound)
    if (!same) this.#edgeImage?.write(packed, 0, 0)
  }

  /** The noise on the card, once it has come and while there are images at all. */
  #writeNoise(): void {
    if (this.#noise === null || this.#noiseImage !== null || this.#shown === null) return
    this.#noiseImage = this.#image(this.#noise.width, this.#noise.height)
    this.#noiseImage.write(this.#noise, 0, 0)
  }

  /** The way ahead's places in the frame, for the aids that show: each at its height above the sea there. */
  #placeAhead(): void {
    const points = this.#ahead?.points
    if (points === undefined || points.length === 0 || this.#made === null || (this.#aids.x === 0 && this.#aids.y === 0)) return
    for (let i = 0; i < PATH_N; i++) {
      const p = points[Math.min(i, points.length - 1)]
      const l = Matrix4.multiplyByPoint(this.#frame, Cartesian3.fromDegrees(p.lon, p.lat, p.altM + this.#geoid(p.lat, p.lon), Ellipsoid.WGS84, this.#scratch), this.#scratch)
      this.#path[3 * i] = l.x
      this.#path[3 * i + 1] = l.y
      this.#path[3 * i + 2] = l.z
    }
    Cartesian3.fromElements(this.#path[0], this.#path[1], this.#path[2], this.#aircraft)
  }

  /** A pass, and the images its samplers are given if they are not there yet (a field's pair, unwritten where the field in use has no cloud; the edges; the noise once it has come). */
  #build(): PostProcessStageComposite {
    const n = ++passes
    this.#shown ??= { field: this.#image(ATLAS_W, ATLAS_H), near: this.#image(NEAR_N, NEAR_N) }
    if (this.#edgeImage === null) {
      this.#edgeImage = this.#image(MAX_EDGES * EDGE_TEXELS, 1)
      this.#edgeImage.write(this.#edges, 0, 0)
    }
    this.#writeNoise()
    const shared = {
      u_field: () => this.#shown!.field.texture,
      u_eyeToLocal: () => eyeToLocal(this.#camera.inverseViewMatrix, this.#frame, this.#eyeToLocal),
      u_map: () => this.#map,
      u_lo: () => this.#lo,
      u_hi: () => this.#hi,
      u_plane: () => this.#plane,
      u_aids: () => this.#aids,
    }
    const march = new PostProcessStage({
      name: `fh_cloud_march_${n}`, fragmentShader: this.#broken ? `${MARCH_SHADER}\n?wxbreak=1: this line is not a shader's, so the march does not compile.\n` : MARCH_SHADER,
      textureScale: this.scale,
      uniforms: {
        ...shared, u_noise: () => (this.#noiseImage ?? this.#shown!.near).texture, u_near: () => this.#shown!.near.texture, u_noiseFrame: () => this.#noiseFrame,
        u_floor: () => this.#floor, u_top: () => this.#top, u_light: () => this.#light, u_box: () => this.#box,
        u_steps: () => MARCH_TIERS[this.#tier].steps, u_detail: () => MARCH_TIERS[this.#tier].detail,
        u_look: () => LOOK[this.look] ?? LOOK.severity, u_veil: () => this.opacity,
        u_edges: () => this.#edgeImage!.texture, u_edgeCount: () => this.#edgeCount, u_edgeBound: () => this.#edgeBound, u_hazard: () => HAZARD[this.#style] ?? HAZARD.box, u_aircraft: () => this.#aircraft,
      },
    })
    const mix = new PostProcessStage({
      name: `fh_cloud_mix_${n}`, fragmentShader: MIX_SHADER,
      uniforms: { ...shared, u_march: march.name, u_shadow: () => Math.min(1, this.#shadow * (this.opacity / VEIL)), u_path: () => this.#path },
    })
    this.#timer?.watch([march, mix] as unknown as Parameters<PassTimer['watch']>[0])
    return new PostProcessStageComposite({ name: `fh_cloud_${n}`, stages: [march, mix], inputPreviousStageTexture: false })
  }

  /** The aircraft's place on the field's map. */
  #place(): void {
    if (this.#from === null || this.#made === null) return
    const l = Matrix4.multiplyByPoint(this.#frame, this.#from, this.#local)
    const [x, y] = localToMap(l.x, l.y, l.z, this.#scale)
    this.#plane.x = x
    this.#plane.y = y
  }

  /**
   * The frame to the noise's own: the Earth's axes, in periods of 32 km, the field's middle taken into the first period (in doubles).
   * Every octave is a whole fraction of 32 km, so a point of the Earth reads the same noise from any field's frame.
   */
  #anchorNoise(lat: number, lon: number, seaM: number): void {
    const n = Matrix4.toArray(Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(lon, lat, seaM))) // the frame's metres to the world's
    for (let c = 0; c < 12; c++) n[c] /= NOISE_KM // its axes: a km of the frame, in periods
    for (const c of [12, 13, 14]) {
      const periods = n[c] / 1000 / NOISE_KM // the field's middle
      n[c] = periods - Math.floor(periods)
    }
    Matrix4.fromArray(n, 0, this.#noiseFrame)
  }
}
