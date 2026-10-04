// client/scene/cloudVolume.ts
// The chase's weather as volumes: one post-process pass that walks every pixel's ray through the weather field (wxField.ts), so a cloud
// is a body with a near side and a far side. The aircraft flies into it, fades in it and is gone in thick cloud (nothing is cleared round
// it), and the terrain, the buildings and the aircraft hide the cloud behind them and are hidden by the cloud in front, as the depth
// buffer says. Weather3D hands it the cloud specs of every source at once (draw), and it has the field of them made round the place
// given: by its builder (fieldBuilder.ts), in the app a worker, so that the frames do not wait for it. Until the builder answers, the
// field made last is drawn, and asked by the HUD; then the new one is taken (the field, its two images, and with the first the noise).
// The pass is a PostProcessStageComposite of two stages, the march at half the size (scale: marchPace.ts makes it coarser when the
// frames are slow) and the mix at full size: cloudShaders.ts has their shaders and says what each draws (the clouds in three looks,
// the rain, the shadows; the hazard areas' edges and the level slice, sorted with the cloud; the track line). This file makes the pass
// and gives the shaders their numbers.
// The shader works in a frame of its own, so that it holds no large number: km east, north and up from the field's middle at sea level
// (localFrame; JS gives it u_eyeToLocal each frame, worked out in doubles). A point's height over the sea is z + (x² + y²) / 2R, and
// its place on the field's flat map follows from x and y (localToMap, the shader's toMap: to 40 m within 150 km, 100 m in the corners).
// Three textures, each an ImageData that Cesium uploads as it is (the atlas's alpha is data: nothing may premultiply it): the field's
// atlas (wxField.ts fieldAtlas); a noise volume of 64³ packed as 64 tiles (cloudNoise.ts noiseAtlas); the clear-air map (wxSurvey.ts
// survey). The noise is fixed to the Earth, not to the field: a field built round another place keeps every cloud's detail.
// The hazard areas' edges nearest the aircraft, at most 48, are given as an image too (wxEdges.ts hazardEdges, packEdges); an image,
// like the field's, can only be given to a new pass, so other edges are a new pass.
// ponytail: the 48 edges nearest the aircraft are picked when the hazard areas are given and at each draw (30 km of flight), not as
// the aircraft moves: among more than 48, one that has become nearer since is not yet drawn. Upgrade: pick again every few km.
// While hidden, while there is no cloud, no hazard area's edge and no aid to draw, and once destroyed there is no stage in the scene,
// so nothing runs. With no cloud the march is given blank images and walks no ray.
// A shader that another graphics card will not compile would stop Cesium's render loop, and with it the whole viewer: a render error
// while the pass is in the scene takes the pass out for good (failed, onFailed; resumeRendering starts Cesium's loop again).
// Each draw makes a new pass in place of the last (the plan was to give the running stage the new image). An image given to a stage
// that already runs is not uploaded until Cesium's next update, and the stage's sampler has nothing for that frame (the render fails);
// a new stage's image is uploaded before its first run. (Read in Cesium's PostProcessStage.js and createUniform.js; not tried.)
// ponytail: the clouds stand at their true heights when the relief is flattened or grown (the puffs moved with their station's ground).
// Upgrade: the frame's relief in the height the shader takes.
import { Cartesian2, Cartesian3, Ellipsoid, Matrix4, PostProcessStage, PostProcessStageComposite, Transforms, type Camera, type PostProcessStageCollection } from 'cesium'
import { geoidN } from '../../shared/geoid.ts'
import type { TerrainFrame } from '../types.ts'
import { sunBrightness, type CloudSpec } from './cloudField.ts'
import { NOISE_KM } from './cloudNoise.ts'
import { ATLAS_H, ATLAS_W, MARCH_SHADER, MIX_SHADER, PATH_N, R_KM } from './cloudShaders.ts'
import { fieldBuilder, type FieldBuilder } from './fieldBuilder.ts'
import { MARCH_SCALES } from './marchPace.ts'
import type { AheadPath } from './wxAhead.ts'
import { MAX_EDGES, hazardEdges, packEdges } from './wxEdges.ts'
import { FIELD_KM, FIELD_N, type Bitmap, type WxField } from './wxField.ts'
import { packSpecs, type FieldMade } from './wxFieldJob.ts'
import type { Hazard } from './wxGeo.ts'

export type CloudLook = 'natural' | 'severity' | 'blocks'
/** How a hazard area's edge is drawn: a curtain hung from its top, a fence (lines and posts), or the box of today (a faint fill and its edges). */
export type HazardStyle = 'curtain' | 'fence' | 'box'
const LOOK: Record<CloudLook, number> = { natural: 0, severity: 1, blocks: 2 } // u_look
const HAZARD: Record<HazardStyle, number> = { curtain: 0, fence: 1, box: 2 } // u_hazard
const KM_PER_DEG = 111.195 // of latitude on the sphere the heights curve over (R_KM): the field's map
const RAD = Math.PI / 180
const TEXEL_KM = FIELD_KM / FIELD_N
const SHADOW = 0.5 // the ground under full cover is darkened by this, by day
const NO_TOP_KM = -10 // the highest top given to the march when there is no cloud: under any ground, so no ray is walked
const BLANK: Bitmap = { data: new Uint8ClampedArray(4), width: 1, height: 1 } // an image for a sampler the shader will not read

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
 * tile. Cesium flips an image it uploads: the image's first row is the top of the texture.
 */
export function tileUv(band: number, eastKm: number, northKm: number): [number, number] {
  const inTile = (km: number): number => Math.min(FIELD_N - 1, Math.max(0, km / TEXEL_KM + (FIELD_N - 1) / 2)) + 0.5
  return [((band % 3) * FIELD_N + inTile(eastKm)) / ATLAS_W, 1 - (Math.floor(band / 3) * FIELD_N + inTile(northKm)) / ATLAS_H]
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

/** Bytes as an image Cesium uploads as they are (an ImageData: no canvas, so nothing premultiplies them). Node has none: there the bytes stand in, for the tests. */
function image(b: Bitmap): unknown {
  return typeof ImageData === 'undefined' ? b : new ImageData(b.data as Uint8ClampedArray<ArrayBuffer>, b.width, b.height)
}

let passes = 0 // each pass's stages are named by its number: a stage's name is unique in the scene

/** What of Cesium's scene the volume touches: its post-process stages, its camera, and the event it raises when a frame fails. */
export interface VolumeScene {
  postProcessStages: PostProcessStageCollection
  camera: Camera
  renderError?: { addEventListener(listener: (scene: unknown, error: unknown) => void): () => void }
}

/**
 * Draws the weather field as volumes, and in the same pass the hazard areas' edges, the level slice and the track line. One pass in
 * the scene while it is shown and has cloud, an edge or an aid to draw; none otherwise, and none ever again after a render error
 * while its pass was in the scene (failed). The shader's numbers are read from this each frame as Cesium draws (its uniforms are
 * functions).
 */
export class CloudVolume {
  /** The look, read each frame: changing it costs nothing. */
  look: CloudLook = 'severity'
  readonly #stages: PostProcessStageCollection
  readonly #camera: Camera
  readonly #geoid: (lat: number, lon: number) => number
  readonly #onFailed: () => void
  readonly #broken: boolean
  readonly #builder: FieldBuilder
  readonly #unlisten: (() => void) | null // ends its listening for the scene's render errors
  readonly #frame = new Matrix4() // world metres to the field's frame
  readonly #eyeToLocal = new Matrix4()
  readonly #noiseFrame = new Matrix4()
  readonly #map = new Cartesian3()
  readonly #plane = new Cartesian2() // the aircraft on the field's map; the field's middle until fade() gives it
  readonly #local = new Cartesian3() // and in the frame
  readonly #aids = new Cartesian2() // u_aids
  readonly #path: number[] = Array.from({ length: PATH_N * 3 }, () => 0) // u_path
  readonly #aircraft = new Cartesian3() // u_aircraft: the path's first place
  readonly #scratch = new Cartesian3()
  #pass: PostProcessStageComposite | null = null
  #field: WxField | null = null
  #images: { field: unknown; near: unknown } | null = null // the field's, for a pass made when it is shown again; null before the first field has come
  #noise: Bitmap | null = null // the noise, once the builder has given it (with the first field)
  #asked = 0 // fields asked of the builder
  #madeMs = 0
  #cloud = false // the field has cloud
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
  #edges: Bitmap = packEdges([]) // the hazard areas' edges in the frame as it stands: a pass's u_edges
  #edgeCount = 0
  #ahead: AheadPath | null = null
  #light = 1
  #shadow = SHADOW
  #marchScale = MARCH_SCALES[0]
  #show = false
  #failed = false
  #destroyed = false

  /**
   * geoid: the sea's height above the ellipsoid at a place, m (default EGM96). onFailed: told once, when a render error has taken the
   * pass out for good. broken: the march is given a shader that cannot compile (?wxbreak=1: the failure seen handled on any machine).
   * builder: who makes the fields (default: a worker in a page, this thread elsewhere).
   */
  constructor(scene: VolumeScene, opts: { geoid?: (lat: number, lon: number) => number; onFailed?: () => void; broken?: boolean; builder?: FieldBuilder } = {}) {
    this.#stages = scene.postProcessStages
    this.#camera = scene.camera
    this.#geoid = opts.geoid ?? geoidN
    this.#onFailed = opts.onFailed ?? (() => {})
    this.#broken = opts.broken === true
    this.#builder = opts.builder ?? fieldBuilder()
    this.#unlisten = scene.renderError?.addEventListener((_scene, error) => this.#fail(error)) ?? null
  }

  get show(): boolean {
    return this.#show
  }

  set show(on: boolean) {
    if (this.#destroyed || on === this.#show) return
    this.#show = on
    this.#sync(false)
  }

  /**
   * The share of the view's width and height the march is walked at: a half until told (marchPace.ts says when the frames ask for a
   * coarser one). A stage's size is fixed when it is made, so another size is a new pass.
   */
  get scale(): number {
    return this.#marchScale
  }

  set scale(s: number) {
    if (this.#destroyed || s === this.#marchScale || !(s > 0 && s <= 1)) return
    this.#marchScale = s
    this.#sync(true)
  }

  /** The field last made: what the pass draws, and what the HUD asks (wxField.ts sampleField). Null until the first has come. */
  get field(): WxField | null {
    return this.#field
  }

  /** How long the making of that field took, ms, where it was made (the bench's line says it). */
  get madeMs(): number {
    return this.#madeMs
  }

  /** Whether a render error has taken the pass out of the scene: for good, until the page is loaded again. The field is still built. */
  get failed(): boolean {
    return this.#failed
  }

  /**
   * These clouds in place of those drawn before, once their field is made: the builder is asked for the field round `at`, and what
   * is drawn stands until it answers (at once where there is no worker).
   */
  draw(specs: readonly CloudSpec[], at: { lat: number; lon: number }): void {
    if (this.#destroyed) return
    this.#builder.ask({ id: ++this.#asked, specs: packSpecs(specs), lat: at.lat, lon: at.lon, noise: this.#noise === null }, (made) => this.#take(made))
  }

  /**
   * A field the builder has made, in place of the one drawn: the frame laid at its middle, the hazard areas' edges and the way ahead
   * laid in that frame, and a pass for it all. With no cloud the field's images are blank.
   */
  #take(made: FieldMade): void {
    if (this.#destroyed) return
    if (made.noise !== null) this.#noise = made.noise
    const f = made.field
    this.#field = f
    this.#madeMs = made.ms
    this.#cloud = !f.empty
    this.#lo = f.lo.map((m) => m / 1000)
    this.#hi = f.hi.map((m) => m / 1000)
    if (made.atlas === null || made.near === null) {
      this.#images = { field: image(BLANK), near: image(BLANK) }
      this.#top = NO_TOP_KM
    } else {
      this.#images = { field: image(made.atlas), near: image(made.near) }
      this.#top = Math.max(...this.#hi)
    }
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
    this.#sync(true)
  }

  /**
   * The hazard areas whose edges are drawn (the nearest MAX_EDGES of them to the aircraft, picked when they are given and at each
   * draw), how (curtain, fence or box: changed on the fly), and each area's CSS colour. Other edges are a new pass; the same again,
   * or another style, are not.
   */
  setHazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string): void {
    if (this.#destroyed) return
    this.#hazards = hazards
    this.#style = style
    this.#hazardColor = color
    this.#sync(this.#layEdges())
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
    this.#sync(false)
  }

  /** Every frame while the weather shows: the Sun's night. (The relief drawn is not followed: see the header.) */
  frame(_tf: TerrainFrame, night: number): void {
    const n = Number.isFinite(night) ? Math.min(1, Math.max(0, night)) : 0
    this.#light = sunBrightness(n)
    this.#shadow = SHADOW * (1 - n)
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
    this.#images = null
    this.#builder.destroy()
    this.#unlisten?.()
    this.#sync(false)
  }

  /**
   * The pass in the scene when it should be (shown, a frame laid, and cloud, a hazard area's edge or an aid to draw), and not otherwise;
   * `fresh`: an image is new (the field's, the edges'), so a pass that stands is replaced.
   */
  #sync(fresh: boolean): void {
    const wanted = this.#show && !this.#destroyed && !this.#failed && this.#images !== null && (this.#cloud || this.#edgeCount > 0 || this.#aids.x > 0 || this.#aids.y > 0)
    if (this.#pass !== null && (!wanted || fresh)) {
      this.#stages.remove(this.#pass) // and destroys it
      this.#pass = null
    }
    if (wanted && this.#pass === null) this.#stages.add((this.#pass = this.#build(this.#images!)))
  }

  /**
   * A frame failed to render while the pass was in the scene: the pass is taken out, and none is made again. (Its shaders were only
   * ever compiled on one graphics card; one that will not compile them fails at the pass's first frame, and Cesium then stops
   * rendering altogether.) An error while no pass is in the scene is another part's.
   */
  #fail(error: unknown): void {
    if (this.#pass === null) return
    this.#failed = true
    console.warn('FlightHopper: the cloud pass is taken out of the scene after a render error; the 3-D clouds are off until the page is loaded again:', error)
    this.#sync(false)
    this.#onFailed()
  }

  /** The hazard areas' edges in the frame as it stands (none before the first draw has laid it), packed for a pass; whether they are others than before. */
  #layEdges(): boolean {
    if (this.#field === null) return false
    const edges = hazardEdges(this.#hazards, this.#frame, this.#seaM, this.#hazardColor, this.#from === null ? undefined : this.#local)
    const packed = packEdges(edges)
    const was = this.#edges.data
    const same = packed.data.every((b, i) => b === was[i])
    this.#edges = packed
    this.#edgeCount = Math.min(edges.length, MAX_EDGES)
    return !same
  }

  /** The way ahead's places in the frame, for the aids that show: each at its height above the sea there. */
  #placeAhead(): void {
    const points = this.#ahead?.points
    if (points === undefined || points.length === 0 || this.#field === null || (this.#aids.x === 0 && this.#aids.y === 0)) return
    for (let i = 0; i < PATH_N; i++) {
      const p = points[Math.min(i, points.length - 1)]
      const l = Matrix4.multiplyByPoint(this.#frame, Cartesian3.fromDegrees(p.lon, p.lat, p.altM + this.#geoid(p.lat, p.lon), Ellipsoid.WGS84, this.#scratch), this.#scratch)
      this.#path[3 * i] = l.x
      this.#path[3 * i + 1] = l.y
      this.#path[3 * i + 2] = l.z
    }
    Cartesian3.fromElements(this.#path[0], this.#path[1], this.#path[2], this.#aircraft)
  }

  #build(images: { field: unknown; near: unknown }): PostProcessStageComposite {
    const n = ++passes
    const look = (): number => LOOK[this.look] ?? LOOK.severity
    const edgeCount = this.#edgeCount // of the image this pass is given
    const shared = {
      u_field: images.field,
      u_eyeToLocal: () => eyeToLocal(this.#camera.inverseViewMatrix, this.#frame, this.#eyeToLocal),
      u_map: () => this.#map,
      u_lo: () => this.#lo,
      u_hi: () => this.#hi,
      u_plane: () => this.#plane,
      u_look: look,
      u_aids: () => this.#aids,
    }
    const march = new PostProcessStage({
      name: `fh_cloud_march_${n}`, fragmentShader: this.#broken ? `${MARCH_SHADER}\n?wxbreak=1: this line is not a shader's, so the march does not compile.\n` : MARCH_SHADER,
      textureScale: this.#marchScale,
      uniforms: {
        ...shared, u_noise: image(this.#cloud && this.#noise !== null ? this.#noise : BLANK), u_near: images.near, u_noiseFrame: () => this.#noiseFrame, u_floor: () => this.#floor,
        u_top: () => this.#top, u_light: () => this.#light,
        u_edges: image(this.#edges), u_edgeCount: () => edgeCount, u_hazard: () => HAZARD[this.#style] ?? HAZARD.box, u_aircraft: () => this.#aircraft,
      },
    })
    const mix = new PostProcessStage({
      name: `fh_cloud_mix_${n}`, fragmentShader: MIX_SHADER,
      uniforms: { ...shared, u_march: march.name, u_shadow: () => this.#shadow, u_path: () => this.#path },
    })
    return new PostProcessStageComposite({ name: `fh_cloud_${n}`, stages: [march, mix], inputPreviousStageTexture: false })
  }

  /** The aircraft's place on the field's map. */
  #place(): void {
    if (this.#from === null || this.#field === null) return
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
