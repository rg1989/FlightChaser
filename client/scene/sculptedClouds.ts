// client/scene/sculptedClouds.ts
// The chase's weather as sculpted bodies: the "Sculpted" look, a sibling of the cloud volume (cloudVolume.ts) behind the same seam
// (weather3d.ts Sky.clouds). It draws the same weather field (wxField.ts), not by a march through it for every pixel of every frame,
// but as geometry built once per field (sculptMesh.ts: smooth closed bodies, a band at a time) that the graphics card draws as
// ordinary opaque triangles with depth (sculptGpu.ts, sculptShaders.ts): so the aircraft, the terrain and the buildings hide a body and
// are hidden by it, an aircraft inside one is not seen from outside, and the cost of a frame does not grow with the size of the view.
// There is no post-process pass in this look at all.
// Weather3D hands it every source's cloud specs (draw); the builder (fieldBuilder.ts: in the app the field's worker) makes the field
// round the place given and its mesh, off the frames. Until it answers, the field made last is drawn and asked by the HUD. A field
// that comes is not drawn at once: its bands are written to the card one a frame (frame(); all at once where it was made within draw
// itself: no worker, so no frame was spared anyway), while the bodies in use go on being drawn; at the frame after the last write
// the new bodies take their place, and with them the field in use, and the old ones are destroyed: one frame draws the old field
// whole, the next the new one whole.
// While hidden, while the field has no body, and once destroyed there is no primitive of its in the scene and nothing of its on the
// card. Shown again, the bodies are written again from the mesh kept.
// A shader that another graphics card will not compile would stop Cesium's render loop: a render error while its layer is in the scene
// takes the layer out for good (failed, onFailed), as the cloud volume's pass.
// The hazard areas' edges (setHazards) and the track line along the way ahead (setAhead), which the other looks' cloud pass draws
// itself, are handed to a SculptAids here (in the app plain Cesium geometry), while shown: the edges when they are given, the track
// line every frame, its pieces coloured where they are inside a body as drawn. The level slice is not drawn in this look.
// With its mesh a field brings its bodies' shadow on the ground, a faint tint moved a little away from the scene's light as it stood
// when the field was asked for (a SculptShadow lays it: in the app a picture draped on the terrain); it changes with the bodies.
// Flying through a body (through(), every frame): while the camera is inside one, a light veil in the body's colour lies over the
// view (a SculptVeil: in the app an element over the globe), its strength by how deep in the camera is (sculptInside.ts bodyAt:
// the bodies as drawn), eased over EASE_S; and the chased aircraft is tinted toward that colour by the cloud on the line from the
// camera to it (cloudBetween), TINT_MAX at most: tinted and softened, never hidden (tint: the app gives it to the chased model).
// ponytail: the bodies stand at their true heights when the relief is flattened or grown, as the volume's clouds. Upgrade: the frame's
// relief in the corners' heights.
import { Cartesian3, Math as CesiumMath, Matrix4, Transforms, type Camera } from 'cesium'
import { geoidN } from '../../shared/geoid.ts'
import type { TerrainFrame } from '../types.ts'
import { sunBrightness, type CloudSpec } from './cloudField.ts'
import type { CloudLook, HazardStyle } from './cloudVolume.ts'
import { fieldBuilder, type FieldBuilder } from './fieldBuilder.ts'
import type { SatGrid } from './satGrid.ts'
import { countLayer, gpuLayers, type MakeLayer, type SculptBody, type SculptLayer, type SculptUniforms } from './sculptGpu.ts'
import { bodyAt, cloudBetween, trackSeverities, type Depth, type Place } from './sculptInside.ts'
import { INSIDE, severityRgb } from './sculptShaders.ts'
import type { AheadPath } from './wxAhead.ts'
import type { Bitmap, WxField } from './wxField.ts'
import { packSpecs, type FieldMade } from './wxFieldJob.ts'
import { wrapLon, type Hazard } from './wxGeo.ts'
import type { SculptMesh } from './sculptMesh.ts'

/** What of Cesium's scene the bodies touch: its primitives, its camera, the event it raises when a frame fails, and its graphics context (private; the bodies are made in it). */
export interface SculptScene {
  primitives: { add(primitive: unknown): unknown; remove(primitive?: unknown): boolean }
  camera: Camera
  renderError?: { addEventListener(listener: (scene: unknown, error: unknown) => void): () => void }
  context?: unknown
  light?: () => { direction?: Cartesian3 } | undefined // the scene's light now (a light with a direction: the way it travels)
}

/** What is on the card and in the scene (for checks in the console, and the bench's line). */
export interface SculptStats {
  bodies: number // meshes in use, one for each band that has a body
  triangles: number // in them
  meshMs: number // how long the building of the mesh in use took, where it was built
  layer: boolean // its primitive is in the scene
}

const BANDS_A_FRAME = 1 // of a coming field's mesh, written to the graphics card in one frame
export const VEIL_MAX = 0.16 // the veil over the view with the camera deep in a body: light, the ground and the aircraft stay readable
export const EASE_S = 0.5 // the veil and the aircraft's tint come and go over this long
export const TINT_MAX = 0.5 // the chased aircraft is tinted toward the body's colour by at most this
export const TINT_KM = 0.3 // and by 63 % of that with this much cloud between the camera and it
const TINT_SAMPLES = 6 // places asked along the line from the camera to the aircraft, each frame
export const TRACK_PIECES = 6 // the track line's pieces in each minute of the way ahead

/** The veil over the view while the camera is inside a body: a CSS colour and how strong (0: none). In the app an element over the globe (sculptVeil.ts). */
export interface SculptVeil {
  set(css: string, opacity: number): void
  destroy(): void
}

/** The bodies' shadow on the ground: an image over the field's square round lat, lon (sculptMesh.ts shadowImage), or none. In the app a picture draped on the terrain (sculptShadow.ts). */
export interface SculptShadow {
  set(image: Bitmap | null, lat: number, lon: number): void
  destroy(): void
}

/**
 * What draws the look's other parts (in the app plain Cesium geometry: sculptAids.ts): the hazard areas' edges in a style and each
 * area's colour (none: nothing), and the track line as a line through the places given, each piece of a severity (−1: clear air;
 * no place: no line).
 */
export interface SculptAids {
  hazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string): void
  track(positions: readonly Cartesian3[], severities: ArrayLike<number>): void
  destroy(): void
}

/** The chased aircraft's tint: the colour (each part 0 … 1) and how far toward it (0 … TINT_MAX). */
export interface SculptTint {
  color: [number, number, number]
  amount: number
}

/**
 * Draws the weather field as sculpted bodies. One primitive in the scene while it is shown and has a body to draw (or to write); none
 * otherwise, and none ever again after a render error while its primitive was in the scene (failed).
 */
export class SculptedClouds {
  /** The look: this renderer's one. Weather3D writes it; nothing reads it here. */
  look: CloudLook = 'sculpted'
  readonly #primitives: SculptScene['primitives']
  readonly #geoid: (lat: number, lon: number) => number
  readonly #onFailed: () => void
  readonly #builder: FieldBuilder
  readonly #makeLayer: MakeLayer
  readonly #unlisten: (() => void) | null // ends its listening for the scene's render errors
  readonly #uniforms: SculptUniforms = { light: 1 }
  readonly #camera: Camera
  readonly #veil: SculptVeil | null
  readonly #shadow: SculptShadow | null
  readonly #aids: SculptAids | null
  #hazards: readonly Hazard[] = []
  #style: HazardStyle = 'box'
  #hazardColor: (h: Hazard) => string = () => '#ffffff'
  #ahead: AheadPath | null = null // the way ahead, while its track line shows
  #tracked = false // the aids hold a track line
  readonly #way: Place[] = [] // the track line's places, and where they are in the world
  readonly #wayWC: Cartesian3[] = []
  #waySev = new Float32Array(0)
  readonly #light: SculptScene['light']
  readonly #toLocal = new Matrix4() // draw()'s own
  readonly #toward = new Cartesian3()
  readonly #at: Depth = { depth: 0, sev: 0 } // through()'s own
  readonly #eye: Place = { lat: 0, lon: 0, altM: 0 }
  readonly #plane: Place = { lat: 0, lon: 0, altM: 0 }
  readonly #tint: SculptTint = { color: [1, 1, 1], amount: 0 }
  #deep = 0 // how deep the camera is in a body, eased
  #veilSev = 0 // the severity of the body it is in, or was last in
  #veilWritten = '' // what the veil was last told
  #throughMs = Number.NaN // the last frame's time
  readonly #frame = new Matrix4() // the frame of the field in use to the world's
  #layer: SculptLayer | null = null
  #made: FieldMade | null = null // the field in use: what is drawn and the HUD asks; its mesh kept for bodies made later (shown again)
  #bodies: SculptBody[] = [] // its bands on the card
  #coming: FieldMade | null = null // a field whose bodies are being written: it is in use once they are
  #comingBodies: SculptBody[] = []
  #asked = 0 // fields asked of the builder
  #asking = false // inside draw(): a field that comes now was made here, with no worker
  #late = false // the last field came after draw() had returned: a worker's, so the frames go on while its bodies are written
  #show = false
  #failed = false
  #destroyed = false

  /**
   * geoid: the sea's height above the ellipsoid at a place, m (default EGM96). onFailed: told once, when a render error has taken the
   * layer out for good. builder: who makes the fields and their meshes (default: a worker in a page, this thread elsewhere). layer:
   * what draws the bodies (default: Cesium's renderer in the scene's context; with no context, a count of them). veil: what lays the
   * veil over the view (default: none). shadow: what lays the bodies' shadow on the ground (default: none).
   * aids: what draws the hazard areas' edges and the track line (default: none).
   */
  constructor(scene: SculptScene, opts: { geoid?: (lat: number, lon: number) => number; onFailed?: () => void; builder?: FieldBuilder; layer?: MakeLayer; veil?: SculptVeil; shadow?: SculptShadow; aids?: SculptAids } = {}) {
    this.#primitives = scene.primitives
    this.#aids = opts.aids ?? null
    this.#shadow = opts.shadow ?? null
    this.#light = scene.light
    this.#camera = scene.camera
    this.#veil = opts.veil ?? null
    this.#geoid = opts.geoid ?? geoidN
    this.#onFailed = opts.onFailed ?? (() => {})
    this.#builder = opts.builder ?? fieldBuilder()
    this.#makeLayer = opts.layer ?? (scene.context === undefined ? countLayer : gpuLayers(scene.context))
    this.#unlisten = scene.renderError?.addEventListener((_scene, error) => this.#fail(error)) ?? null
  }

  get show(): boolean {
    return this.#show
  }

  set show(on: boolean) {
    if (this.#destroyed || on === this.#show) return
    this.#show = on
    if (!on) this.#away()
    else {
      this.#aids?.hazards(this.#hazards, this.#style, this.#hazardColor)
      if (this.#made !== null && bands(this.#made) > 0 && !this.#failed) this.#load(this.#made, !this.#late)
    }
  }

  /** The field in use: what the bodies are of, and what the HUD asks (wxField.ts sampleField). Null until the first has come. */
  get field(): WxField | null {
    return this.#made?.field ?? null
  }

  /** How long the making of that field and its mesh took, ms, where it was made (the bench's line says it). */
  get madeMs(): number {
    return this.#made?.ms ?? 0
  }

  /** Whether a render error has taken the layer out of the scene: for good, until the page is loaded again. The field is still built. */
  get failed(): boolean {
    return this.#failed
  }

  get stats(): SculptStats {
    return { bodies: this.#bodies.length, triangles: this.#bodies.reduce((n, b) => n + b.triangles, 0), meshMs: this.#made?.mesh?.ms ?? 0, layer: this.#layer !== null }
  }

  /**
   * These clouds in place of those drawn before, once their field and its mesh are made and written: the builder is asked for the
   * field round `at`, and what is drawn stands until then (see the header). sat: the weather satellite's cloud over the field's square.
   */
  draw(specs: readonly CloudSpec[], at: { lat: number; lon: number }, sat: SatGrid | null = null): void {
    if (this.#destroyed) return
    this.#asking = true
    this.#builder.ask({ id: ++this.#asked, specs: packSpecs(specs), lat: at.lat, lon: at.lon, noise: false, sat, sculpt: true, light: this.#lightAt(at.lat, at.lon) }, (made) => this.#take(made))
    this.#asking = false
  }

  /** The unit vector toward the scene's light at a place (east, north, up), for the shadow a field's mesh brings; null where the scene's light has no direction of its own (Cesium's sun: overhead will do). */
  #lightAt(lat: number, lon: number): [number, number, number] | null {
    const travel = this.#light?.()?.direction
    if (travel === undefined) return null
    Matrix4.inverseTransformation(Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(lon, lat), undefined, this.#toLocal), this.#toLocal)
    const t = Matrix4.multiplyByPointAsVector(this.#toLocal, travel, this.#toward)
    return [-t.x, -t.y, -t.z]
  }

  /** The hazard areas whose edges are drawn, how (curtain, fence or box), and each area's CSS colour: handed to the aids while shown. */
  setHazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string): void {
    if (this.#destroyed) return
    this.#hazards = hazards
    this.#style = style
    this.#hazardColor = color
    if (this.#show) this.#aids?.hazards(hazards, style, color)
  }

  /** Every frame: the way ahead of the aircraft (null: none) and whether its track line shows (the level slice is not drawn in this look). The line itself is laid at through(). */
  setAhead(path: AheadPath | null, show: { track: boolean; slice: boolean }): void {
    this.#ahead = show.track ? path : null
  }

  /** Every frame while the weather shows: the Sun's night; and of a coming field's mesh, a band written, the field coming into use the frame after the last. */
  frame(_tf: TerrainFrame, night: number): void {
    this.#uniforms.light = sunBrightness(night)
    if (this.#coming !== null) this.#write(BANDS_A_FRAME)
  }

  fade(_from: Cartesian3): void {}

  /**
   * Every frame while the weather shows, with the chased aircraft (degrees, metres above the ellipsoid as drawn; null: none) and the
   * clock: the veil by how deep the camera is in a body, and the aircraft's tint by the cloud between the camera and it, both eased
   * (see the header). Of the bodies as they are drawn: none while their bands are not on the card.
   */
  through(aircraft: Place | null, nowMs: number): void {
    if (this.#destroyed || !this.#show) return
    const step = Number.isFinite(this.#throughMs) ? Math.min(0.25, Math.max(0, (nowMs - this.#throughMs) / 1000)) / EASE_S : 0
    this.#throughMs = nowMs
    const mesh = this.#bodies.length > 0 ? this.#made?.mesh ?? null : null
    const field = this.#made?.field ?? null
    const c = this.#camera.positionCartographic
    const eye = this.#eye
    eye.lat = CesiumMath.toDegrees(c.latitude)
    eye.lon = CesiumMath.toDegrees(c.longitude)
    eye.altM = c.height - this.#geoid(eye.lat, eye.lon)
    const deep = bodyAt(mesh, field, eye.lat, eye.lon, eye.altM, this.#at).depth
    if (deep > 0) this.#veilSev = this.#at.sev
    this.#deep += Math.min(step, Math.max(-step, deep - this.#deep))
    let tint = 0
    if (aircraft !== null) {
      const p = this.#plane
      p.lat = aircraft.lat
      p.lon = aircraft.lon
      p.altM = aircraft.altM - this.#geoid(aircraft.lat, aircraft.lon)
      const km = cloudBetween(mesh, field, eye, p, TINT_SAMPLES, this.#at).depth
      tint = TINT_MAX * (1 - Math.exp(-km / TINT_KM))
      if (km > 0 && !(deep > 0)) this.#veilSev = this.#at.sev // (the camera outside, the aircraft in a body: that body's colour)
    }
    const t = this.#tint
    t.amount += Math.min(step * TINT_MAX, Math.max(-step * TINT_MAX, tint - t.amount))
    const [r, g, b] = severityRgb(this.#veilSev)
    t.color[0] = r + (1 - r) * INSIDE
    t.color[1] = g + (1 - g) * INSIDE
    t.color[2] = b + (1 - b) * INSIDE
    this.#lay()
    this.#track(mesh, field)
  }

  /** The track line handed to the aids: TRACK_PIECES pieces a minute along the way ahead, each of the severity of the body its middle is in; none with no way ahead. */
  #track(mesh: SculptMesh | null, field: WxField | null): void {
    if (this.#aids === null) return
    const points = this.#ahead?.points
    if (points === undefined || points.length < 2) {
      if (this.#tracked) this.#aids.track([], this.#waySev)
      this.#tracked = false
      return
    }
    const n = (points.length - 1) * TRACK_PIECES + 1
    while (this.#way.length < n) {
      this.#way.push({ lat: 0, lon: 0, altM: 0 })
      this.#wayWC.push(new Cartesian3())
    }
    this.#way.length = this.#wayWC.length = n
    if (this.#waySev.length !== n - 1) this.#waySev = new Float32Array(n - 1)
    for (let k = 0; k < n; k++) {
      const [a, b] = [points[Math.min(points.length - 2, Math.floor(k / TRACK_PIECES))], points[Math.min(points.length - 1, Math.floor(k / TRACK_PIECES) + 1)]]
      const t = k / TRACK_PIECES - Math.min(points.length - 2, Math.floor(k / TRACK_PIECES))
      const p = this.#way[k]
      p.lat = a.lat + (b.lat - a.lat) * t
      p.lon = a.lon + wrapLon(b.lon - a.lon) * t
      p.altM = a.altM + (b.altM - a.altM) * t
      Cartesian3.fromDegrees(p.lon, p.lat, p.altM + this.#geoid(p.lat, p.lon), undefined, this.#wayWC[k])
    }
    this.#aids.track(this.#wayWC, trackSeverities(mesh, field, this.#way, this.#waySev))
    this.#tracked = true
  }

  /** The chased aircraft's tint now (through() works it out): nothing while hidden. */
  get tint(): Readonly<SculptTint> {
    return this.#tint
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#show = false
    this.#builder.destroy()
    this.#unlisten?.()
    this.#away()
    this.#veil?.destroy()
    this.#shadow?.destroy()
    this.#aids?.destroy()
  }

  /** A field the builder has made. Shown, and with a body: its bands are written first (at once when it was made within draw, else one a frame), and then it is in use. Hidden, failed, or with no body: in use at once. */
  #take(made: FieldMade): void {
    if (this.#destroyed) return
    this.#late = !this.#asking
    if (this.#show && !this.#failed && bands(made) > 0) this.#load(made, this.#asking)
    else {
      this.#drop()
      this.#use(made, [])
    }
  }

  /** `made` is to come into use once its bands are on the card (a band at each #write). now: all of them at once. */
  #load(made: FieldMade, now: boolean): void {
    this.#drop()
    if (this.#layer === null) this.#primitives.add((this.#layer = this.#makeLayer(this.#uniforms)))
    this.#coming = made
    if (now) this.#write(Infinity)
  }

  /** At most n of the coming field's bands written; when none is left, and this call wrote none (all at once: in the same call), the field is in use. */
  #write(n: number): void {
    const made = this.#coming
    if (made === null || this.#layer === null) return
    const mesh = made.mesh!.bands
    let done = 0
    while (done < n && this.#comingBodies.length < mesh.length) {
      this.#comingBodies.push(this.#layer.make(mesh[this.#comingBodies.length]))
      done++
    }
    if (this.#comingBodies.length < mesh.length || (done > 0 && n !== Infinity)) return
    const bodies = this.#comingBodies
    this.#coming = null
    this.#comingBodies = []
    this.#use(made, bodies)
  }

  /** `made` in place of the field in use, drawn as `bodies` (none: it has none, or nothing is drawn now); the bodies drawn before are destroyed. */
  #use(made: FieldMade, bodies: SculptBody[]): void {
    const old = this.#bodies
    this.#made = made
    this.#bodies = bodies
    const f = made.field
    Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(f.lon, f.lat, this.#geoid(f.lat, f.lon)), undefined, this.#frame)
    this.#layer?.use(bodies, this.#frame, made.mesh?.radiusM ?? 0)
    this.#shadow?.set(bodies.length > 0 ? made.mesh?.shadow ?? null : null, f.lat, f.lon)
    for (const body of old) body.destroy()
    if (bodies.length === 0) this.#lift()
  }

  /** The bodies written for a field that was coming, and is overtaken or not to be drawn: destroyed. */
  #drop(): void {
    for (const body of this.#comingBodies) body.destroy()
    this.#comingBodies = []
    this.#coming = null
  }

  /** The layer out of the scene, with what is left of its on the card. */
  #lift(): void {
    const layer = this.#layer
    if (layer === null) return
    this.#layer = null
    this.#primitives.remove(layer) // Cesium's collection destroys what it removes
    if (!layer.isDestroyed()) layer.destroy()
  }

  /** The veil told its colour and strength, when they are others than it was last told (the strength in steps of half a hundredth). */
  #lay(): void {
    if (this.#veil === null) return
    const opacity = Math.round(this.#deep * VEIL_MAX * 200) / 200
    const css = `rgb(${this.#tint.color.map((v) => Math.round(v * 255)).join(' ')})`
    const told = opacity === 0 ? '' : `${css} ${opacity}`
    if (told === this.#veilWritten) return
    this.#veilWritten = told
    this.#veil.set(css, opacity)
  }

  /** Hidden, failed or destroyed: no primitive, and no body on the card. A field that was coming is in use (its bodies are written when it is shown again). */
  #away(): void {
    this.#deep = 0
    this.#tint.amount = 0
    this.#throughMs = Number.NaN
    this.#lay()
    this.#aids?.hazards([], this.#style, this.#hazardColor)
    if (this.#tracked) this.#aids?.track([], this.#waySev)
    this.#tracked = false
    const coming = this.#coming
    this.#drop()
    for (const body of this.#bodies) body.destroy()
    this.#bodies = []
    this.#shadow?.set(null, 0, 0)
    if (coming !== null && !this.#destroyed) this.#made = coming
    this.#lift()
  }

  /** A frame failed to render while the layer was in the scene: the layer is taken out, and none is made again. An error while it is not in the scene is another part's. */
  #fail(error: unknown): void {
    if (this.#layer === null) return
    this.#failed = true
    console.warn('FlightHopper: the sculpted clouds are taken out of the scene after a render error; the 3-D clouds are off until the page is loaded again:', error)
    this.#away()
    this.#onFailed()
  }
}

/** How many bands of a field made have a body. */
const bands = (made: FieldMade): number => made.mesh?.bands.length ?? 0
