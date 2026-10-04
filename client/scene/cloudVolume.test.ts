// client/scene/cloudVolume.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Cartesian3, Event, Matrix4, PostProcessStage, PostProcessStageComposite, Transforms, type Camera, type PostProcessStageCollection } from 'cesium'
import { geoidN } from '../../shared/geoid.ts'
import { PUFF_FILL, SEV, sunBrightness, type CloudSpec } from './cloudField.ts'
import { noiseAtlas } from './cloudNoise.ts'
import { BOX_PAD_KM, MARCH_SHADER, MIX_SHADER } from './cloudShaders.ts'
import { CloudVolume, eyeToLocal, localFrame, localToMap, mapScale, resumeRendering, tileUv } from './cloudVolume.ts'
import type { FieldBuilder } from './fieldBuilder.ts'
import { MARCH_TIERS } from './marchPace.ts'
import type { PassTimer } from './passTimer.ts'
import { bytesImage, type MakeImage } from './gpuImage.ts'
import { AHEAD_MIN, aheadPath } from './wxAhead.ts'
import { edgeBound, hazardEdges, packEdges } from './wxEdges.ts'
import { BANDS, FIELD_KM, FIELD_N, HEIGHT_MAX_M, TOWER_BAND, buildField, fieldAtlas, sampleField, type WxField } from './wxField.ts'
import { makeField, unpackSpecs, type FieldJob, type FieldMade } from './wxFieldJob.ts'
import { hazardsNear, type Hazard } from './wxGeo.ts'
import { survey } from './wxSurvey.ts'

const KM_PER_DEG = 111.195
const TEXEL_KM = FIELD_KM / FIELD_N
const LAT = 37.6
const LON = -122.4
const RAD = Math.PI / 180
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol
/** The place eastKm and northKm of (lat, lon), on the field's flat map round it. */
const at = (eastKm: number, northKm: number, lat = LAT, lon = LON): { lat: number; lon: number } =>
  ({ lat: lat + northKm / KM_PER_DEG, lon: lon + eastKm / (KM_PER_DEG * Math.cos(lat * RAD)) })
/** A puff whose base and top are given; wide: its billboard's width, m. */
function puff(baseM: number, topM: number, o: Partial<CloudSpec> & { eastKm?: number; northKm?: number; wide?: number } = {}): CloudSpec {
  const { eastKm = 0, northKm = 0, wide = 3000, ...rest } = o
  return {
    ...at(eastKm, northKm), heightM: (baseM + topM) / 2, groundM: 0, scale: [wide, (topM - baseM) / PUFF_FILL], maxSize: [20, 12, 12], slice: 0.3,
    brightness: 1, tint: 0, farKm: 100, ...rest,
  }
}
/** Where the middle of the field's texel (i, j) is, km east and north of its middle. */
const middleOf = (i: number, j: number): [number, number] => [(i - (FIELD_N - 1) / 2) * TEXEL_KM, (j - (FIELD_N - 1) / 2) * TEXEL_KM]

// ---- the pure helpers the shader mirrors -------------------------------------------------------------------------------------

test('tileUv: a place of the map as the atlas\'s texture coordinate: band b\'s tile at column b % 3 and row ⌊b / 3⌋, the image\'s first row the texture\'s first (its bytes are written as they are: nothing is flipped), the middle of a texel at its middle', () => {
  const atlas = fieldAtlas(buildField([puff(1500, 2500, { eastKm: 20, northKm: -30 }), puff(1000, 9000, { eastKm: -50, northKm: 70, wide: 8000, tower: 1, sev: SEV.storm })], LAT, LON))
  /** The image's pixel under a texture coordinate, as the GPU finds it. */
  const pixel = ([u, v]: [number, number]): [number, number] => [u * atlas.width - 0.5, v * atlas.height - 0.5]
  for (const [band, i, j] of [[0, 0, 0], [0, 287, 207], [1, 100, 400], [2, 511, 0], [3, 0, 511], [TOWER_BAND, 176, 367], [TOWER_BAND, 511, 511]]) {
    const [x, y] = pixel(tileUv(band, ...middleOf(i, j)))
    assert.ok(near(x, (band % 3) * FIELD_N + i, 1e-6) && near(y, Math.floor(band / 3) * FIELD_N + j, 1e-6), `band ${band} texel ${i},${j}: pixel ${x},${y}`)
  }
  // the cumulus, 20 km east and 30 km south, is in band 0's tile where the field has it; the tower in the towers'
  const byte = (band: number, eastKm: number, northKm: number): number[] => {
    const [x, y] = pixel(tileUv(band, eastKm, northKm)).map(Math.round)
    return [...atlas.data.subarray((y * atlas.width + x) * 4, (y * atlas.width + x) * 4 + 4)]
  }
  const cu = byte(0, 20, -30)
  assert.ok(cu[0] > 200 && near(cu[1], (1500 / HEIGHT_MAX_M) * 255, 1) && near(cu[2], (2500 / HEIGHT_MAX_M) * 255, 1) && cu[3] === 0, `${cu}`)
  assert.deepEqual(byte(0, 20, 30), [0, 0, 0, 0], 'north is not south')
  const cb = byte(TOWER_BAND, -50, 70)
  assert.ok(cb[0] > 200 && cb[3] === 255, `${cb}`)
  assert.deepEqual(byte(TOWER_BAND, 20, -30), [0, 0, 0, 0])
})

test('tileUv: beyond the outer texels\' middles a place has their coordinate (no bilinear mix reaches into the next tile)', () => {
  const edge = middleOf(FIELD_N - 1, 0)
  assert.deepEqual(tileUv(1, 500, -500), tileUv(1, ...edge))
  assert.deepEqual(tileUv(1, FIELD_KM / 2, -FIELD_KM / 2), tileUv(1, ...edge), 'the square\'s own corner is half a texel past the last middle')
  const [u, v] = tileUv(1, ...edge)
  assert.ok(near(u * 3 * FIELD_N, 2 * FIELD_N - 0.5, 1e-9) && near(v * 2 * FIELD_N, 0.5, 1e-9), `${u}, ${v}`)
})

test('localFrame: world metres to the frame at a place: km east, north and up from it', () => {
  const frame = localFrame(LAT, LON, 25)
  const to = (lat: number, lon: number, h: number): Cartesian3 => Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(lon, lat, h), new Cartesian3())
  assert.ok(Cartesian3.equalsEpsilon(to(LAT, LON, 25), Cartesian3.ZERO, 0, 1e-9))
  assert.ok(Cartesian3.equalsEpsilon(to(LAT, LON, 10_025), new Cartesian3(0, 0, 10), 0, 1e-6), '10 km up')
  const n = to(LAT + 1, LON, 25)
  assert.ok(near(n.x, 0, 1e-6) && near(n.y, 111, 0.2) && near(n.z, -(111 * 111) / (2 * 6371), 0.02), `a degree north: ${n}: the Earth has curved away by 0.97 km`)
  const e = to(LAT, LON + 1, 25)
  assert.ok(near(e.x, 111.3 * Math.cos(LAT * RAD), 0.2) && e.y > 0 && e.y < 1, `a degree east: ${e}`)
})

test('eyeToLocal: eye metres to the frame through the camera\'s inverse view: the camera\'s own place and a point 1 km in front of it, to the millimetre', () => {
  const frame = localFrame(LAT, LON, 25)
  const cameraWC = Cartesian3.fromDegrees(LON + 0.6, LAT - 0.4, 9000)
  const inverseView = Transforms.eastNorthUpToFixedFrame(cameraWC) // a camera looking straight down: its x east, its y north, its −z down
  const m = eyeToLocal(inverseView, frame, new Matrix4())
  const want = (world: Cartesian3): Cartesian3 => Matrix4.multiplyByPoint(frame, world, new Cartesian3())
  const here = Matrix4.multiplyByPoint(m, Cartesian3.ZERO, new Cartesian3())
  assert.ok(Cartesian3.equalsEpsilon(here, want(cameraWC), 0, 1e-6))
  const ahead = Matrix4.multiplyByPoint(m, new Cartesian3(0, 0, -1000), new Cartesian3())
  assert.ok(Cartesian3.equalsEpsilon(ahead, want(Matrix4.multiplyByPoint(inverseView, new Cartesian3(0, 0, -1000), new Cartesian3())), 0, 1e-6), `${ahead}`)
  assert.ok(Cartesian3.equalsEpsilon(ahead, want(Cartesian3.fromDegrees(LON + 0.6, LAT - 0.4, 8000)), 0, 1e-4), 'which is 1 km under the camera')
  assert.ok(near(Cartesian3.distance(ahead, here), 1, 1e-9), 'a kilometre is 1')
  assert.ok(near(here.x, 53.3, 0.3) && near(here.y, -44.3, 0.3) && near(here.z, 8.6, 0.1), `${here}: the camera, 53 km east and 44 km south of the frame's middle`)
  assert.ok(Math.max(...Matrix4.toArray(m).map(Math.abs)) < 200, 'no large number for the shader\'s floats')
})

test('localToMap: a place of the frame as the field maps it (km east and north on its flat map, km over the sea): within 40 m out to 150 km from the field\'s middle and 100 m at the square\'s corners, up to 12 km', () => {
  for (const [lat0, lon0] of [[LAT, LON], [32, 34.9], [60, 10], [-33.9, 151.2], [0.2, -78.5]]) {
    const n0 = geoidN(lat0, lon0)
    const frame = localFrame(lat0, lon0, n0)
    const scale = mapScale(lat0, lon0, n0)
    let [within, worst] = [0, 0]
    for (const eastKm of [-150, -100, -40, 0, 75, 106, 150]) {
      for (const northKm of [-150, -106, -60, 0, 40, 100, 150]) {
        for (const hM of [0, 3000, 12_000]) {
          const p = at(eastKm, northKm, lat0, lon0)
          const l = Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(p.lon, p.lat, hM + n0), new Cartesian3())
          const m = localToMap(l.x, l.y, l.z, scale)
          const off = Math.max(Math.abs(m[0] - eastKm), Math.abs(m[1] - northKm), Math.abs(m[2] - hM / 1000))
          worst = Math.max(worst, off)
          if (Math.hypot(eastKm, northKm) <= 150) within = Math.max(within, off)
        }
      }
    }
    assert.ok(within < 0.04 && worst < 0.1, `round ${lat0}, ${lon0}: ${(within * 1000).toFixed(1)} m off at worst within 150 km, ${(worst * 1000).toFixed(1)} m in the corners`)
  }
})

test('localToMap: where the shader samples is where sampleField does: a cloud 100 km off is found at its own place and height', () => {
  const spec = puff(3000, 5000, { eastKm: 90, northKm: -60, wide: 6000 })
  const f = buildField([spec], LAT, LON)
  const n0 = geoidN(LAT, LON)
  const l = Matrix4.multiplyByPoint(localFrame(LAT, LON, n0), Cartesian3.fromDegrees(spec.lon, spec.lat, 4000 + n0), new Cartesian3())
  const [eastKm, northKm, hKm] = localToMap(l.x, l.y, l.z, mapScale(LAT, LON, n0))
  const there = at(eastKm, northKm)
  assert.ok(near(sampleField(f, there.lat, there.lon, hKm * 1000).cover, sampleField(f, spec.lat, spec.lon, 4000).cover, 0.02))
  assert.ok(sampleField(f, there.lat, there.lon, hKm * 1000).cover > 0.9)
})

// ---- CloudVolume -------------------------------------------------------------------------------------------------------------

const CU = puff(1500, 2500, { eastKm: 6, northKm: 2 })
const RAIN = puff(7000, 8700, { eastKm: -40, northKm: 20, wide: 10_000, sev: SEV.light })
const CB = puff(1000, 11_000, { eastKm: 60, northKm: 60, wide: 9000, tower: 1, sev: SEV.storm })
const HERE = { lat: LAT, lon: LON }
type Uniforms = Record<string, unknown>
interface Image { data: Uint8ClampedArray; width: number; height: number }

const TF = { fSampled: 1, fNow: 1, relHM: 0 }
/** A builder that keeps what it is asked, and answers when told: as a worker's does, after draw has returned. */
function lateBuilder() {
  const asks: { job: FieldJob; done: (made: FieldMade) => void }[] = []
  let ended = 0
  const builder: FieldBuilder = { ask: (job, done) => void asks.push({ job, done }), destroy: () => void ended++ }
  return { builder, asks, ended: (): number => ended, answer: (n: number): void => asks[n].done(makeField(asks[n].job)) }
}

function rig(opts: { geoid?: (lat: number, lon: number) => number; onFailed?: () => void; broken?: boolean; builder?: FieldBuilder; images?: MakeImage; timer?: Pick<PassTimer, 'watch' | 'poll' | 'ms'> } = {}) {
  const added: PostProcessStageComposite[] = []
  const removed: PostProcessStageComposite[] = []
  const stages = { add: (s: PostProcessStageComposite) => (added.push(s), s), remove: (s: PostProcessStageComposite) => (removed.push(s), true) } as unknown as PostProcessStageCollection
  const cameraWC = Cartesian3.fromDegrees(LON + 0.1, LAT + 0.2, 5000)
  const camera = { inverseViewMatrix: Transforms.eastNorthUpToFixedFrame(cameraWC) } as unknown as Camera
  const renderError = new Event() // the scene's: raised when a frame fails
  const vol = new CloudVolume({ postProcessStages: stages, camera, renderError }, opts)
  /** The composites in the scene now. */
  const live = (): PostProcessStageComposite[] => added.filter((s) => !removed.includes(s))
  const stage = (i: number): PostProcessStage => live()[0].get(i) as PostProcessStage
  const call = <T>(i: number, name: string): T => ((stage(i).uniforms as Uniforms)[name] as () => T)()
  /** The image a sampler of the march is given now. */
  const image = (name: string, i = 0): Image => call<Image>(i, name)
  return { vol, added, removed, live, stage, call, image, cameraWC, renderError, march: (): Uniforms => stage(0).uniforms as Uniforms, mix: (): Uniforms => stage(1).uniforms as Uniforms }
}

test('CloudVolume: no stage while hidden, while the field is empty, or once destroyed; shown with weather, one pass in the scene', () => {
  const r = rig()
  const field = (): WxField | null => r.vol.field
  assert.equal(r.vol.show, false)
  assert.equal(field(), null)
  r.vol.draw([CU], HERE)
  assert.equal(r.added.length, 0, 'hidden')
  r.vol.show = true
  assert.equal(r.live().length, 1)
  r.vol.show = true
  assert.equal(r.added.length, 1, 'shown twice is shown once')
  r.vol.show = false
  assert.deepEqual(r.removed, r.added, 'hidden: removed (Cesium destroys it)')
  r.vol.show = true
  assert.deepEqual([r.added.length, r.live().length], [2, 1], 'a new pass')
  r.vol.draw([], HERE)
  assert.equal(r.live().length, 0, 'no weather: no pass')
  assert.equal(field()?.empty, true)
  r.vol.draw([puff(1500, 2500, { eastKm: 400 })], HERE)
  assert.equal(r.live().length, 0, 'weather outside the square: none either')
  r.vol.draw([CU], HERE)
  assert.equal(r.live().length, 1)
  r.vol.destroy()
  assert.equal(r.live().length, 0)
  r.vol.show = true
  r.vol.draw([CU], HERE)
  assert.equal(r.live().length, 0, 'destroyed: does nothing')
  assert.equal(r.vol.show, false)
})

test('CloudVolume: shown before the first draw, the pass comes with the weather', () => {
  const r = rig()
  r.vol.show = true
  assert.equal(r.added.length, 0)
  r.vol.draw([CU], HERE)
  assert.equal(r.live().length, 1)
})

test('CloudVolume: the pass is a composite of two stages on the scene\'s own colour: the march at half the size, and the mix, at full size, which reads the march by its name', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const pass = r.live()[0]
  assert.ok(pass instanceof PostProcessStageComposite)
  assert.equal(pass.length, 2)
  assert.equal(pass.inputPreviousStageTexture, false)
  const [march, mix] = [r.stage(0), r.stage(1)]
  assert.ok(march instanceof PostProcessStage && mix instanceof PostProcessStage)
  assert.equal(march.textureScale, 0.5)
  assert.equal(mix.textureScale, 1)
  assert.equal(march.fragmentShader, MARCH_SHADER)
  assert.equal(mix.fragmentShader, MIX_SHADER)
  assert.equal(r.mix().u_march, march.name)
  assert.notEqual(march.name, mix.name)
})

test('CloudVolume: the march is walked at a tier (marchPace.ts MARCH_TIERS: the first until told): the tier\'s step budget and whether it reads the noise\'s finest octave are numbers the march is given, its ground shadows the mix\'s; a tier of another size is a new pass at that size, reading the same images; the same tier again changes nothing, and a pass made later has the tier', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const given = (): unknown[] => [r.vol.tier, r.call<number>(0, 'u_steps'), r.call<number>(0, 'u_detail'), r.call<number>(1, 'u_shadow'), r.stage(0).textureScale, r.vol.scale]
  assert.deepEqual(given(), [0, 128, 0, 0.5, 0.5, 0.5])
  r.vol.tier = 0
  r.vol.tier = 1
  assert.deepEqual(given(), [1, MARCH_TIERS[1].steps, 0, 0.5, 0.5, 0.5], 'a smaller step budget')
  r.vol.tier = 2
  assert.deepEqual(given(), [2, MARCH_TIERS[2].steps, 1, 0.5, 0.5, 0.5], 'and the finest octave left out')
  r.vol.tier = 3
  assert.deepEqual(given(), [3, MARCH_TIERS[3].steps, 1, 0, 0.5, 0.5], 'and no ground shadows')
  r.vol.frame(TF, 0)
  assert.equal(r.call<number>(1, 'u_shadow'), 0, 'by day too')
  assert.equal(r.added.length, 1, 'all on the pass that stands')
  r.vol.tier = 4
  assert.deepEqual([r.added.length, r.live().length, r.stage(0).textureScale, r.stage(1).textureScale, r.vol.scale], [2, 1, 0.35, 1, 0.35], 'the march smaller, the mix at full size still')
  assert.deepEqual(r.image('u_field').data, fieldAtlas(r.vol.field!).data, 'with the field it had: the new pass reads the same images')
  r.vol.show = false
  r.vol.tier = 5
  assert.equal(r.live().length, 0, 'hidden: no pass for it')
  r.vol.show = true
  assert.equal(r.stage(0).textureScale, 0.25)
  r.vol.draw([CU, RAIN], HERE)
  assert.equal(r.stage(0).textureScale, 0.25, 'a draw keeps it')
  for (const none of [-1, 6, 2.5, Number.NaN]) r.vol.tier = none
  assert.equal(r.vol.tier, 5, 'what is no tier is not taken')
  r.vol.tier = 0
  r.vol.frame(TF, 0)
  assert.deepEqual(given(), [0, 128, 0, 0.5, 0.5, 0.5], 'and back to the first: everything as it was')
})

test('CloudVolume: with a timer (passTimer.ts: the graphics card\'s own clock, where the browser has one) the pass\'s two stages are watched, a new pass\'s when it is made and none when there is no pass; the timer is asked every frame, and its time is the volume\'s; with none the time is not known', () => {
  const timer = { watched: [] as unknown[][], polls: 0, ms: 4.25, watch(stages: readonly unknown[]): void { this.watched.push([...stages]) }, poll(): void { this.polls++ } }
  const r = rig({ timer })
  r.vol.show = true
  r.vol.draw([CU], HERE)
  assert.deepEqual(timer.watched, [[r.stage(0), r.stage(1)]])
  r.vol.frame(TF, 0)
  r.vol.frame(TF, 0)
  assert.equal(timer.polls, 2)
  assert.equal(r.vol.passMs, 4.25)
  r.vol.tier = 4 // a new pass
  assert.deepEqual(timer.watched.at(-1), [r.stage(0), r.stage(1)])
  assert.equal(timer.watched.length, 2)
  r.vol.show = false
  assert.deepEqual(timer.watched.at(-1), [], 'no pass: nothing to time')
  assert.ok(Number.isNaN(rig().vol.passMs), 'no timer (no graphics context): not known')
})

test('CloudVolume: a draw keeps the pass: the new field is written into a second pair of images, which takes the first pair\'s place (the pass asks for its images each frame); the pass is made again only for another size of march', () => {
  const made: ReturnType<typeof bytesImage>[] = []
  const r = rig({ images: (w, h) => (made.push(bytesImage(w, h)), made.at(-1)!) })
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const pass = r.live()[0]
  const names = [r.stage(0).name, r.stage(1).name]
  const [field1, near1] = [r.image('u_field'), r.image('u_near')]
  assert.deepEqual(field1.data, fieldAtlas(buildField([CU], LAT, LON)).data)
  r.vol.draw([CU, RAIN], HERE)
  assert.deepEqual([r.added.length, r.removed.length, r.live()[0] === pass], [1, 0, true], 'the pass stands')
  assert.deepEqual([r.stage(0).name, r.stage(1).name], names)
  const [field2, near2] = [r.image('u_field'), r.image('u_near')]
  assert.ok(field2 !== field1 && near2 !== near1, 'another pair of images')
  assert.deepEqual(field2.data, fieldAtlas(buildField([CU, RAIN], LAT, LON)).data)
  assert.deepEqual(near2.data, survey(buildField([CU, RAIN], LAT, LON)).near.data)
  assert.equal(r.image('u_field', 1), field2, 'the mix reads the same field')
  r.vol.draw([CB], HERE)
  assert.ok(r.image('u_field') === field1 && r.image('u_near') === near1, 'and the first pair again: two pairs in all')
  const sizes = made.map((im) => `${im.width}x${im.height}`).sort()
  assert.deepEqual(sizes, ['1536x1024', '1536x1024', '240x1', '256x256', '256x256', '528x528'], 'two pairs, the edges and the noise: made once')
  assert.ok(made.every((im) => !im.destroyed))
})

test('CloudVolume: a field that comes from a worker is not written to the graphics card in one frame: a band at each frame, while the pass draws the field in use from its own images; with the last band the two change places, all at once: the field the HUD asks, the images, the heights and the frame', () => {
  const b = lateBuilder()
  const r = rig({ builder: b.builder })
  r.vol.show = true
  r.vol.draw([CU], HERE)
  b.answer(0)
  assert.deepEqual([r.vol.field, r.live().length], [null, 0], 'made, but not on the card yet')
  r.vol.frame(TF, 0)
  assert.deepEqual([r.vol.field!.lat, r.live().length], [LAT, 1], 'one band (the cumulus\'s): one frame')
  const first = r.vol.field
  const shown = r.image('u_field')
  const there = at(10, 5)
  r.vol.draw([CU, RAIN, CB], there) // three bands
  b.answer(1)
  const want = fieldAtlas(buildField([CU, RAIN, CB], there.lat, there.lon))
  for (const frame of [1, 2]) {
    r.vol.frame(TF, 0)
    assert.equal(r.vol.field, first, `frame ${frame}: the field in use stands`)
    assert.ok(r.image('u_field') === shown && r.call<number>(0, 'u_top') === 2.5, 'and so do its images and its heights')
    assert.deepEqual(shown.data, fieldAtlas(first!).data, 'which nothing is written into')
  }
  r.vol.frame(TF, 0)
  assert.deepEqual([r.vol.field!.lat, r.vol.field!.lon], [there.lat, there.lon], 'frame 3: the last band, and the new field is in use')
  assert.notEqual(r.image('u_field'), shown)
  assert.deepEqual(r.image('u_field').data, want.data)
  assert.deepEqual(r.image('u_near').data, survey(r.vol.field!).near.data)
  assert.equal(r.call<number>(0, 'u_top'), 11)
  assert.equal(r.added.length, 1, 'one pass throughout')
  // a field that comes while another is being written takes its place: the one between is never in use
  r.vol.draw([CU, RAIN], HERE)
  b.answer(2)
  r.vol.frame(TF, 0)
  r.vol.draw([CB], HERE)
  b.answer(3)
  for (let k = 0; k < 4; k++) r.vol.frame(TF, 0)
  assert.equal(r.call<number>(0, 'u_top'), 11)
  assert.deepEqual(r.call<number[]>(0, 'u_lo').map((lo, k) => lo < r.call<number[]>(0, 'u_hi')[k]), [false, false, false, false, true], 'the storm alone')
  // an empty sky has nothing to write: in use at once
  r.vol.draw([], HERE)
  b.answer(4)
  assert.equal(r.vol.field!.empty, true)
  assert.equal(r.live().length, 0)
})

test('CloudVolume: the field is made by its builder (a worker\'s, in the app) and the frames do not wait for it: until the builder answers and the field\'s images are written, the field made last stands, in the pass and for the HUD; then the new one is in use, and the noise that came with the first; an answer that comes after the volume is destroyed is not taken', () => {
  const b = lateBuilder()
  const r = rig({ builder: b.builder })
  const frames = (n = 6): void => {
    for (let k = 0; k < n; k++) r.vol.frame(TF, 0)
  }
  r.vol.show = true
  r.vol.draw([CU, CB], HERE)
  assert.equal(b.asks.length, 1)
  const first = b.asks[0].job
  assert.deepEqual([first.lat, first.lon, first.noise], [LAT, LON, true], 'round the place given; the noise has not come: asked for')
  assert.deepEqual(unpackSpecs(first.specs).map((s) => [s.lon, s.lat, s.tower !== undefined]), [[CU.lon, CU.lat, false], [CB.lon, CB.lat, true]])
  frames()
  assert.deepEqual([r.vol.field, r.live().length], [null, 0], 'not made yet: nothing to draw, and nothing waited for')
  b.answer(0)
  frames()
  const f = r.vol.field!
  assert.deepEqual([f.lat, f.lon, r.live().length], [LAT, LON, 1])
  assert.deepEqual(r.image('u_noise').data, noiseAtlas().data, 'the noise is the builder\'s')
  assert.ok(r.vol.madeMs >= 0)
  const pass = r.live()[0]
  r.vol.draw([CU, RAIN], at(10, 0))
  frames()
  assert.deepEqual([b.asks.length, b.asks[1].job.noise], [2, false], 'the noise is there: not asked for again')
  assert.equal(r.vol.field, f, 'the field made last stands for the HUD')
  assert.equal(r.live()[0], pass, 'and in the pass')
  assert.equal(r.call<number>(0, 'u_top'), 11)
  b.answer(1)
  frames()
  assert.deepEqual([r.vol.field!.lat, r.vol.field!.lon], [at(10, 0).lat, at(10, 0).lon])
  assert.equal(r.call<number>(0, 'u_top'), 8.7, 'the storm is gone with the old field')
  const second = r.vol.field
  r.vol.draw([CU], HERE)
  r.vol.destroy()
  assert.equal(b.ended(), 1, 'the builder is ended with the volume')
  b.answer(2)
  frames()
  assert.equal(r.vol.field, second)
  assert.equal(r.live().length, 0)
})

test('CloudVolume: each shader is given every uniform it declares, and no other', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU, RAIN, CB], HERE)
  const declared = (src: string): string[] => [...src.matchAll(/^uniform\s+\w+\s+(\w+)/gm)].map((m) => m[1]).filter((n) => n !== 'colorTexture' && n !== 'depthTexture').sort()
  assert.deepEqual(Object.keys(r.march()).sort(), declared(MARCH_SHADER))
  assert.deepEqual(Object.keys(r.mix()).sort(), declared(MIX_SHADER))
  assert.ok(declared(MARCH_SHADER).length >= 10 && declared(MIX_SHADER).includes('u_march'))
  for (const src of [MARCH_SHADER, MIX_SHADER]) assert.match(src, /uniform\s+sampler2D\s+depthTexture/, 'each reads the depth')
})

test('CloudVolume: draw has the field made round the place and its atlas written, as it is (its bytes, tile by tile), into the image both stages read; the noise and the clear-air map into the march\'s', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU, RAIN, CB], HERE)
  const f = r.vol.field!
  assert.deepEqual([f.lat, f.lon, f.empty], [LAT, LON, false])
  assert.ok(sampleField(f, CU.lat, CU.lon, 2000).cover > 0.9, 'the field the HUD asks')
  const want = fieldAtlas(buildField([CU, RAIN, CB], LAT, LON))
  for (const stage of [0, 1]) {
    const image = r.image('u_field', stage)
    assert.deepEqual([image.width, image.height], [want.width, want.height])
    assert.deepEqual(image.data, want.data)
  }
  assert.deepEqual(r.image('u_noise').data, noiseAtlas().data)
  assert.deepEqual(r.image('u_near').data, survey(f).near.data)
})

test('CloudVolume: the shader is told each band\'s heights in km (an empty band: none), the floor it is read down to (the sea under a band that rains, else the band\'s lowest base), and the highest top of all', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU, RAIN, CB], HERE)
  const f = r.vol.field!
  const [lo, hi, floor] = [r.call<number[]>(0, 'u_lo'), r.call<number[]>(0, 'u_hi'), r.call<number[]>(0, 'u_floor')]
  assert.equal(lo.length, BANDS)
  for (let b = 0; b < BANDS; b++) assert.ok(near(lo[b], f.lo[b] / 1000, 1e-12) && near(hi[b], f.hi[b] / 1000, 1e-12), `band ${b}`)
  assert.deepEqual([lo[0], hi[0]], [1.5, 2.5])
  assert.ok(lo[1] > hi[1] && lo[3] > hi[3], 'bands 1 and 3 are empty')
  assert.deepEqual(floor, [1.5, lo[1], 0, lo[3], 0], 'rain falls from the deck (band 2) and the storm')
  assert.deepEqual([r.call<number[]>(1, 'u_lo'), r.call<number[]>(1, 'u_hi')], [lo, hi], 'the mix has the heights too, for the shadows')
  assert.equal(r.call<number>(0, 'u_top'), 11)
  r.vol.draw([CU], HERE)
  assert.equal(r.call<number>(0, 'u_top'), 2.5)
})

test('CloudVolume: a ray is walked only over the box the field\'s cover stands in (the clear-air map\'s, with the march\'s margin and room for the map\'s bend), and the edges are read only by a ray that passes over the circle they stand in; with no cloud the box holds nothing', () => {
  const r = rig()
  r.vol.show = true
  r.vol.setHazards([hazardOf([circle(30, 20)])], 'box', RED)
  r.vol.draw([CU, RAIN], HERE) // the cumulus 6 km east and 2 km north, the deck 40 km west and 20 km north
  const box = (): number[] => {
    const b = r.call<{ x: number; y: number; z: number; w: number }>(0, 'u_box')
    return [b.x, b.y, b.z, b.w]
  }
  const s = survey(r.vol.field!).box
  assert.deepEqual(box(), [s[0] - BOX_PAD_KM, s[1] - BOX_PAD_KM, s[2] + BOX_PAD_KM, s[3] + BOX_PAD_KM])
  assert.ok(BOX_PAD_KM > 8 && BOX_PAD_KM < 8.2)
  const [west, south, east, north] = box()
  assert.ok(west < -50 && west > -54 && east > 14 && east < 18 && south < -7 && south > -10 && north > 30 && north < 34, `${box()}: not the whole square of 320 km`)
  const bound = r.call<{ x: number; y: number; z: number }>(0, 'u_edgeBound')
  assert.deepEqual([bound.x, bound.y, bound.z], edgeBound(hazardEdges([hazardOf([circle(30, 20)])], FRAME, N0, RED)))
  assert.ok(near(bound.x, 30, 1) && near(bound.z, 20, 1))
  r.vol.draw([], HERE)
  assert.ok(box()[0] > box()[2] && box()[1] > box()[3], 'no cloud: no ray is over it')
})

test('CloudVolume: the frame is at the field\'s middle at sea level (the geoid there): the camera\'s matrix, the map\'s scale and the noise, which is fixed to the Earth so that a field built round another place has the same detail', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const n0 = geoidN(LAT, LON)
  const frame = localFrame(LAT, LON, n0)
  const m = r.call<Matrix4>(0, 'u_eyeToLocal')
  const eye = Matrix4.multiplyByPoint(m, Cartesian3.ZERO, new Cartesian3())
  assert.ok(Cartesian3.equalsEpsilon(eye, Matrix4.multiplyByPoint(frame, r.cameraWC, new Cartesian3()), 0, 1e-6), `${eye}`)
  assert.ok(near(eye.x, 0.1 * 111.3 * Math.cos((LAT + 0.2) * RAD), 0.1) && near(eye.y, 22.2, 0.1) && near(eye.z, 5 - n0 / 1000 - 0.04, 0.01), `${eye}: 8.8 km east, 22 km north, 5 km up`)
  assert.ok(Matrix4.equalsEpsilon(r.call<Matrix4>(1, 'u_eyeToLocal'), m, 1e-12), 'the mix has it too')
  const s = mapScale(LAT, LON, n0)
  const map = r.call<{ x: number; y: number; z: number }>(0, 'u_map')
  assert.deepEqual([map.x, map.y, map.z], [s.sx, s.sy, s.t])
  // a point of the Earth has the same place in the noise (whole periods of 32 km apart) whichever field's frame it is seen from
  const world = Cartesian3.fromDegrees(LON + 0.3, LAT + 0.1, 4000)
  const inNoise = (): Cartesian3 => {
    const f = r.vol.field!
    const local = Matrix4.multiplyByPoint(localFrame(f.lat, f.lon, geoidN(f.lat, f.lon)), world, new Cartesian3())
    return Matrix4.multiplyByPoint(r.call<Matrix4>(0, 'u_noiseFrame'), local, new Cartesian3())
  }
  const a = inNoise()
  r.vol.draw([CU], at(21, 22))
  const b = inNoise()
  for (const d of [b.x - a.x, b.y - a.y, b.z - a.z]) assert.ok(near(d, Math.round(d), 1e-6), `${d} periods apart`)
  assert.ok(Math.max(...Matrix4.toArray(r.call<Matrix4>(0, 'u_noiseFrame')).map(Math.abs)) <= 1, 'no large number')
})

test('CloudVolume: the look as a number (0 natural, 1 severity colours, 2 blocks), changed on the fly; the light by the Sun\'s night, as the puffs\' was; the ground shadows gone by night', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const look = (): number => r.call<number>(0, 'u_look')
  assert.equal(r.vol.look, 'severity')
  assert.equal(look(), 1)
  r.vol.look = 'natural'
  assert.equal(look(), 0)
  r.vol.look = 'blocks'
  assert.equal(look(), 2)
  const tf = { fSampled: 1, fNow: 1, relHM: 0 }
  assert.equal(r.call<number>(0, 'u_light'), 1)
  assert.equal(r.call<number>(1, 'u_shadow'), 0.5)
  r.vol.frame(tf, 0.5)
  assert.equal(r.call<number>(0, 'u_light'), sunBrightness(0.5))
  assert.equal(r.call<number>(1, 'u_shadow'), 0.25)
  r.vol.frame(tf, 1)
  assert.deepEqual([r.call<number>(0, 'u_light'), r.call<number>(1, 'u_shadow')], [sunBrightness(1), 0])
  r.vol.frame(tf, Number.NaN)
  assert.equal(r.call<number>(0, 'u_light'), 1, 'no night known: day')
  r.vol.draw([CU, RAIN], HERE)
  r.vol.frame({ fSampled: 0, fNow: 0, relHM: 300 }, 0.5)
  assert.deepEqual([look(), r.call<number>(0, 'u_light')], [2, sunBrightness(0.5)], 'a new pass keeps the look and the night')
  assert.deepEqual(r.call<number[]>(1, 'u_lo').slice(0, 1), [1.5], 'the clouds stand at their true heights, whatever the relief drawn')
})

test('CloudVolume: the reach\'s fade is centred on the aircraft: its place on the field\'s map, the field\'s middle until it is given, and again its own place in a field built round another', () => {
  const r = rig()
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const plane = (): [number, number] => {
    const p = r.call<{ x: number; y: number }>(0, 'u_plane')
    return [p.x, p.y]
  }
  assert.deepEqual(plane(), [0, 0])
  const p = at(12, -20)
  r.vol.fade(Cartesian3.fromDegrees(p.lon, p.lat, 9000))
  assert.ok(near(plane()[0], 12, 0.03) && near(plane()[1], -20, 0.03), `${plane()}`)
  assert.deepEqual(r.call<{ x: number; y: number }>(1, 'u_plane'), r.call<{ x: number; y: number }>(0, 'u_plane'))
  r.vol.draw([CU], at(12, -20))
  assert.ok(near(plane()[0], 0, 0.03) && near(plane()[1], 0, 0.03), `${plane()}`)
})

// ---- CloudVolume: the hazard areas, the way ahead, the render error ---------------------------------------------------------------

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

test('CloudVolume: hazard areas alone keep a pass in the scene: the march is given their edges as an image, how many, and the style as a number (0 curtain, 1 fence, 2 box), which changes on the fly; a changed list is written into the image the pass reads, with no new pass; no area and no cloud: no pass', () => {
  const r = rig()
  const h = hazardOf([ringKm([[100, 50], [140, 50], [140, 90], [100, 90]])], { topFt: 34000 })
  r.vol.show = true
  r.vol.setHazards([h], 'box', RED)
  assert.equal(r.added.length, 0, 'before the first draw there is no frame to lay them in')
  r.vol.draw([], HERE)
  assert.equal(r.live().length, 1, 'no cloud, but a hazard area')
  const edges = (): Image => r.image('u_edges')
  assert.deepEqual(edges().data, packEdges(hazardEdges([h], FRAME, N0, RED)).data)
  assert.deepEqual([edges().width, edges().height], [240, 1])
  assert.equal(r.call<number>(0, 'u_edgeCount'), 4)
  assert.equal(r.call<number>(0, 'u_hazard'), 2)
  r.vol.setHazards([h], 'curtain', RED)
  assert.equal(r.call<number>(0, 'u_hazard'), 0)
  r.vol.setHazards([h], 'fence', RED)
  assert.equal(r.call<number>(0, 'u_hazard'), 1)
  assert.equal(r.added.length, 1, 'the style and the same areas again: the pass stands')
  const other = hazardOf([circle(30, 20)], { topFt: 30000 })
  const image = edges()
  r.vol.setHazards([h, other], 'fence', RED)
  assert.deepEqual([r.added.length, r.removed.length, edges() === image], [1, 0, true], 'other areas: the same pass and the same image')
  assert.deepEqual(edges().data, packEdges(hazardEdges([h, other], FRAME, N0, RED)).data, 'written anew')
  assert.deepEqual([r.call<number>(0, 'u_edgeCount'), r.call<number>(0, 'u_hazard')], [24, 1])
  r.vol.setHazards([h, other], 'fence', () => '#4fd1ff')
  assert.deepEqual(edges().data, packEdges(hazardEdges([h, other], FRAME, N0, () => '#4fd1ff')).data, 'another colour is other bytes')
  r.vol.setHazards([], 'fence', RED)
  assert.equal(r.live().length, 0, 'none left, and no cloud')
  r.vol.draw([CU], HERE)
  assert.equal(r.call<number>(0, 'u_edgeCount'), 0)
  assert.ok(edges().data.every((b) => b === 0) && edges().width === 240, 'with cloud and no area the march still has an image to read')
  // a field built round another place: the edges in its frame; the nearest by where the aircraft is
  r.vol.setHazards([h, other], 'curtain', RED)
  const there = at(21, 22)
  r.vol.draw([CU], there)
  const frame = localFrame(there.lat, there.lon, geoidN(there.lat, there.lon))
  assert.deepEqual(edges().data, packEdges(hazardEdges([h, other], frame, geoidN(there.lat, there.lon), RED)).data)
  const many = [hazardOf([circle(250, 40)], { topFt: 30000 }), hazardOf([circle(30, 20)], { topFt: 31000 }), hazardOf([circle(120, 30)], { topFt: 32000 })]
  const ac = at(250, 0)
  r.vol.fade(Cartesian3.fromDegrees(ac.lon, ac.lat, 9000))
  r.vol.setHazards(many, 'curtain', RED)
  const from = Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(ac.lon, ac.lat, 9000), new Cartesian3())
  assert.deepEqual(edges().data, packEdges(hazardEdges(many, frame, geoidN(there.lat, there.lon), RED, from)).data, 'the 48 nearest the aircraft, not the field\'s middle')
  assert.equal(r.call<number>(0, 'u_edgeCount'), 48)
  r.vol.show = false
  assert.equal(r.live().length, 0, 'hidden: no pass, whatever it holds')
})

test('CloudVolume: with no cloud the march has its images all the same, unwritten (it reads none of them), and a top under the ground, so that no ray is walked', () => {
  const r = rig()
  r.vol.show = true
  r.vol.setHazards([hazardOf([circle(30, 20)])], 'box', RED)
  r.vol.draw([], HERE)
  for (const name of ['u_field', 'u_near']) assert.ok(r.image(name).data.every((b) => b === 0), name)
  assert.ok(r.image('u_noise') !== undefined, 'a sampler is never left without an image')
  assert.ok(r.call<number>(0, 'u_top') < -1)
  assert.deepEqual([r.call<number[]>(0, 'u_lo'), r.call<number[]>(0, 'u_hi'), r.call<number[]>(0, 'u_floor')], [[16, 16, 16, 16, 16], [0, 0, 0, 0, 0], [16, 16, 16, 16, 16]], 'every band empty')
  r.vol.draw([CU], HERE)
  assert.equal(r.image('u_noise').width, 528)
  assert.equal(r.call<number>(0, 'u_top'), 2.5)
})

test('CloudVolume: hidden, it holds no image on the graphics card; shown again, the images are made again and the field it kept is written into them', () => {
  const made: ReturnType<typeof bytesImage>[] = []
  const r = rig({ images: (w, h) => (made.push(bytesImage(w, h)), made.at(-1)!) })
  r.vol.setHazards([hazardOf([circle(30, 20)])], 'box', RED)
  r.vol.draw([CU, CB], HERE)
  assert.equal(made.length, 0, 'hidden: none made')
  r.vol.show = true
  assert.equal(r.live().length, 1)
  const first = made.length
  assert.ok(first >= 4 && made.every((im) => !im.destroyed))
  const want = fieldAtlas(buildField([CU, CB], LAT, LON)).data
  assert.deepEqual(r.image('u_field').data, want)
  r.vol.show = false
  assert.ok(made.every((im) => im.destroyed), 'every one given back')
  r.vol.draw([CU, CB, RAIN], HERE) // hidden: the field is in use (the HUD may ask it), with no image
  assert.deepEqual([made.length, r.vol.field!.lo[2] < r.vol.field!.hi[2]], [first, true])
  r.vol.show = true
  assert.ok(made.length > first && made.slice(first).every((im) => !im.destroyed))
  assert.deepEqual(r.image('u_field').data, fieldAtlas(buildField([CU, CB, RAIN], LAT, LON)).data)
  assert.deepEqual(r.image('u_edges').data, packEdges(hazardEdges([hazardOf([circle(30, 20)])], FRAME, N0, RED)).data)
  assert.equal(r.image('u_noise').width, 528)
  r.vol.destroy()
  assert.ok(made.every((im) => im.destroyed))
})

test('CloudVolume: the way ahead is given to the mix, which draws the track line, in the frame (the aircraft, then each minute; its heights are above the sea, so the geoid of each place is added), and its first place to the march, for the level slice; both are told which aids show; an aid alone keeps a pass in the scene, and with none it goes', () => {
  const geoid = (lat: number, lon: number): number => 40 + (lat - LAT) * 10 + (lon - LON) * 5 // not the real one: so that the test sees it used, place by place
  const r = rig({ geoid })
  r.vol.show = true
  r.vol.draw([], HERE)
  assert.equal(r.live().length, 0)
  const path = aheadPath({ lat: LAT + 0.05, lon: LON - 0.1, altM: 9000 }, 70, 420, -1500)!
  assert.equal(path.points.length, AHEAD_MIN + 1)
  r.vol.setAhead(path, { track: true, slice: false })
  assert.equal(r.live().length, 1, 'the track line alone')
  const aids = (): [number, number] => [r.call<{ x: number; y: number }>(0, 'u_aids').x, r.call<{ x: number; y: number }>(0, 'u_aids').y]
  /** The path's points in the frame at a place. */
  const inFrameOf = (lat: number, lon: number): number[] => {
    const frame = localFrame(lat, lon, geoid(lat, lon))
    return path.points.flatMap((p) => { const l = Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(p.lon, p.lat, p.altM + geoid(p.lat, p.lon)), new Cartesian3()); return [l.x, l.y, l.z] })
  }
  const got = r.call<number[]>(1, 'u_path')
  assert.equal(got.length, 3 * (AHEAD_MIN + 1))
  const want = inFrameOf(LAT, LON)
  got.forEach((v, i) => assert.ok(near(v, want[i], 1e-9), `number ${i}: ${v} for ${want[i]}`))
  const ac = r.call<{ x: number; y: number; z: number }>(0, 'u_aircraft')
  assert.deepEqual([ac.x, ac.y, ac.z], got.slice(0, 3), 'the march has the aircraft\'s place')
  assert.deepEqual(r.call<{ x: number; y: number }>(1, 'u_aids'), r.call<{ x: number; y: number }>(0, 'u_aids'), 'one word on the aids for both')
  assert.ok(near(got[0], -8.8, 0.1) && near(got[1], 5.56, 0.05) && near(got[2], 9, 0.02), `${got.slice(0, 3)}: the aircraft, 8.8 km west and 5.6 km north of the field\'s middle, 9 km up`)
  assert.ok(near(Math.hypot(got[3] - got[0], got[4] - got[1], got[5] - got[2]), Math.hypot((420 * 1.852) / 60, 0.4572), 0.05), 'a minute on: 13 km along and 457 m down')
  assert.deepEqual(aids(), [1, 0])
  r.vol.setAhead(path, { track: true, slice: true })
  assert.deepEqual(aids(), [1, 1])
  assert.equal(r.added.length, 1, 'given every frame: the pass stands')
  r.vol.setAhead(path, { track: false, slice: false })
  assert.equal(r.live().length, 0, 'no aid: no pass')
  r.vol.setAhead(path, { track: false, slice: true })
  assert.equal(r.live().length, 1, 'the level slice alone')
  assert.deepEqual(aids(), [0, 1])
  r.vol.setAhead(null, { track: true, slice: true })
  assert.equal(r.live().length, 0, 'no way ahead (the aircraft is slow): nothing to draw')
  r.vol.draw([CU], HERE)
  assert.deepEqual(aids(), [0, 0], 'with cloud the pass stands, and draws no aid')
  r.vol.setAhead(path, { track: true, slice: false })
  const there = at(21, 22)
  r.vol.draw([CU], there)
  const moved = inFrameOf(there.lat, there.lon)
  r.call<number[]>(1, 'u_path').forEach((v, i) => assert.ok(near(v, moved[i], 1e-9), `in the frame of a field built round another place: number ${i}`))
  assert.ok(near(r.call<{ x: number }>(0, 'u_aircraft').x, moved[0], 1e-9))
})

test('CloudVolume: a render error while its pass is in the scene takes the pass out for good (a shader another graphics card will not compile must not stop the viewer): told once, the field still built, and no pass again for cloud, hazard area or aid; an error while it has no pass in the scene is not its own', () => {
  const warn = console.warn
  const warned: unknown[][] = []
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    let told = 0
    const r = rig({ onFailed: () => told++ })
    r.vol.show = true
    r.renderError.raiseEvent({}, new Error('another part of the scene'))
    assert.deepEqual([r.vol.failed, told, warned.length], [false, 0, 0], 'no pass in the scene yet')
    r.vol.draw([CU], HERE)
    assert.equal(r.live().length, 1)
    r.renderError.raiseEvent({}, new Error('Fragment shader failed to compile'))
    assert.deepEqual([r.vol.failed, told, r.live().length], [true, 1, 0])
    assert.deepEqual(r.removed, r.added, 'removed (Cesium destroys it)')
    assert.equal(warned.length, 1)
    assert.match(String(warned[0][0]), /FlightHopper: .*cloud pass/)
    r.vol.draw([CU, RAIN], HERE)
    r.vol.show = false
    r.vol.show = true
    r.vol.setHazards([hazardOf([circle(30, 20)])], 'curtain', RED)
    r.vol.setAhead(aheadPath({ lat: LAT, lon: LON, altM: 9000 }, 70, 420, 0), { track: true, slice: true })
    assert.deepEqual([r.added.length, r.live().length], [1, 0], 'no pass again')
    assert.ok(sampleField(r.vol.field, RAIN.lat, RAIN.lon, 8000).cover > 0.5, 'the field is still built: the status line and the ahead strip ask it')
    r.renderError.raiseEvent({}, new Error('again'))
    assert.deepEqual([told, warned.length], [1, 1], 'told once')
    const hidden = rig()
    hidden.vol.draw([CU], HERE)
    hidden.renderError.raiseEvent({}, new Error('while it is hidden'))
    hidden.vol.show = true
    assert.deepEqual([hidden.vol.failed, hidden.live().length], [false, 1])
    assert.equal(hidden.renderError.numberOfListeners, 1)
    hidden.vol.destroy()
    assert.equal(hidden.renderError.numberOfListeners, 0, 'destroyed: it listens no more')
    assert.equal(warned.length, 1)
  } finally {
    console.warn = warn
  }
})

test('CloudVolume: broken (?wxbreak=1, a check aid) gives the march a shader that cannot compile, so that the failure is seen handled on any machine; the mix and an unbroken volume have their own', () => {
  const r = rig({ broken: true })
  r.vol.show = true
  r.vol.draw([CU], HERE)
  const src = r.stage(0).fragmentShader
  assert.ok(src.startsWith(MARCH_SHADER) && src.length > MARCH_SHADER.length)
  assert.match(src.slice(MARCH_SHADER.length), /wxbreak/, 'what is added says why')
  assert.equal(r.stage(1).fragmentShader, MIX_SHADER)
})

test('resumeRendering: after a render error Cesium has stopped its loop and put up its panel: the panel is closed by its own button, and the loop is started again two frames on (by then the loop that ran has seen that it is stopped: one loop, not two); not when the viewer is gone, nor when the loop already runs', () => {
  const queue: (() => void)[] = []
  const later = (f: () => void): void => void queue.push(f)
  const frame = (): void => queue.splice(0).forEach((f) => f())
  const fake = (o: { loop?: boolean; gone?: boolean } = {}) => {
    const s = { loop: o.loop ?? false, sets: 0, clicks: 0, panel: true, gone: o.gone ?? false }
    const viewer = {
      get useDefaultRenderLoop() { return s.loop },
      set useDefaultRenderLoop(on: boolean) { s.loop = on; s.sets++ },
      isDestroyed: () => s.gone,
      container: { querySelector: (q: string) => (q === '.cesium-widget-errorPanel button' && s.panel ? { click: () => { s.clicks++; s.panel = false } } : null) },
    }
    return { s, viewer: viewer as unknown as Parameters<typeof resumeRendering>[0] }
  }
  const a = fake()
  resumeRendering(a.viewer, later)
  assert.deepEqual([a.s.clicks, a.s.panel, a.s.loop], [1, false, false], 'the panel at once; the loop not yet')
  frame()
  assert.equal(a.s.loop, false, 'one frame on: the loop that ran is seeing that it is stopped')
  frame()
  assert.deepEqual([a.s.loop, a.s.sets, queue.length], [true, 1, 0])
  const late = fake() // the panel put up after (Cesium's listener heard the error second)
  late.s.panel = false
  resumeRendering(late.viewer, later)
  late.s.panel = true
  frame()
  frame()
  assert.deepEqual([late.s.clicks, late.s.panel, late.s.loop], [1, false, true])
  const gone = fake()
  resumeRendering(gone.viewer, later)
  gone.s.gone = true
  frame()
  frame()
  assert.deepEqual([gone.s.loop, gone.s.sets], [false, 0], 'the viewer destroyed meanwhile')
  const running = fake({ loop: true })
  resumeRendering(running.viewer, later)
  frame()
  frame()
  assert.equal(running.s.sets, 0, 'it runs: not started again')
})
