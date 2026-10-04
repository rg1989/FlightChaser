// client/scene/sculptedClouds.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Cartesian3, Cartographic, Event, Matrix4, type Camera } from 'cesium'
import { PUFF_FILL, sunBrightness, type CloudSpec } from './cloudField.ts'
import type { HazardStyle } from './cloudVolume.ts'
import { aheadPath } from './wxAhead.ts'
import type { Hazard } from './wxGeo.ts'
import type { FieldBuilder } from './fieldBuilder.ts'
import { countLayer, type SculptUniforms } from './sculptGpu.ts'
import { EASE_S, SculptedClouds, TINT_KM, TINT_MAX, TRACK_PIECES, VEIL_MAX, type SculptScene } from './sculptedClouds.ts'
import { INSIDE, severityRgb } from './sculptShaders.ts'
import { sampleField, type WxField } from './wxField.ts'
import { makeField, type FieldJob, type FieldMade } from './wxFieldJob.ts'

const [LAT, LON] = [37.6, -122.4]
const TF = { fSampled: 1, fNow: 1, relHM: 0 }
/** A puff from baseM to topM, wide metres across, km east of the middle. */
const puff = (baseM: number, topM: number, wide = 20_000, eastKm = 0, o: Partial<CloudSpec> = {}): CloudSpec => ({
  lat: LAT, lon: LON + eastKm / (111.195 * Math.cos((LAT * Math.PI) / 180)), heightM: (baseM + topM) / 2, groundM: 0, scale: [wide, (topM - baseM) / PUFF_FILL], maxSize: [20, 12, 12], slice: 0.3,
  brightness: 1, tint: 0, farKm: 100, ...o,
})
/** The field in use (asked through a function: an assertion on the getter itself would narrow it for the rest of a test). */
const fieldOf = (c: SculptedClouds): WxField | null => c.field
const TWO_BANDS = [puff(1000, 2500), puff(5000, 6000, 20_000, 30, { sev: 1 })]

/** A scene that holds what is added to it, a layer that counts, and a builder: at once (this thread's) or, `late`, when answer() is called (a worker's). */
function rig(o: { late?: boolean } = {}) {
  const list: unknown[] = []
  const renderError = new Event()
  const scene: SculptScene = {
    primitives: { add: (p) => (list.push(p), p), remove: (p) => list.includes(p) && (list.splice(list.indexOf(p), 1), true) },
    camera: {} as Camera, renderError: renderError as unknown as SculptScene['renderError'],
  }
  const layers: ReturnType<typeof countLayer>[] = []
  const uniforms: SculptUniforms[] = []
  const jobs: FieldJob[] = []
  const waiting: (() => void)[] = []
  let ended = false
  const builder: FieldBuilder = {
    ask(job, done) {
      jobs.push(job)
      if (o.late) waiting.push(() => done(makeField(job)))
      else done(makeField(job))
    },
    destroy: () => void (ended = true),
  }
  const failures: number[] = []
  const clouds = new SculptedClouds(scene, {
    builder, geoid: () => 0, onFailed: () => failures.push(1),
    layer: (u) => {
      uniforms.push(u)
      layers.push(countLayer())
      return layers.at(-1)!
    },
  })
  const live = (): number => layers.reduce((n, l) => n + l.live, 0)
  return { clouds, list, layers, uniforms, jobs, failures, renderError, live, answer: () => waiting.shift()?.(), ended: () => ended }
}

test('hidden it draws nothing: no primitive in the scene, nothing on the card; its field is made and answers the HUD all the same', () => {
  const r = rig()
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  assert.deepEqual([r.list.length, r.layers.length, r.live()], [0, 0, 0])
  assert.ok(sampleField(r.clouds.field, LAT, LON, 1800).cover > 0.9, 'the field is there')
  assert.deepEqual(r.jobs.map((j) => [j.sculpt, j.noise]), [[true, false]], 'the job asks for the mesh, and for no noise')
  assert.deepEqual(r.clouds.stats, { bodies: 0, triangles: 0, meshMs: r.clouds.stats.meshMs, layer: false })
})

test('shown: one primitive, a body for each band that has one; hidden again: no primitive and nothing on the card; shown again: made again from the mesh kept', () => {
  const r = rig()
  r.clouds.show = true
  assert.equal(r.list.length, 0, 'no field yet: nothing to draw')
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies, r.clouds.stats.layer], [1, 2, 2, true])
  assert.ok(r.clouds.stats.triangles > 100)
  assert.equal(r.layers[0].used.length, 2, 'the layer draws both')
  r.clouds.show = false
  assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies, r.layers[0].destroyed], [0, 0, 0, true])
  assert.ok(r.clouds.field !== null, 'the field stays for the HUD')
  r.clouds.show = true
  assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies, r.jobs.length], [1, 2, 2, 1], 'no new job: the mesh was kept')
})

test('an empty sky has no primitive; a sky that becomes empty takes its primitive out', () => {
  const r = rig()
  r.clouds.show = true
  r.clouds.draw([], { lat: LAT, lon: LON })
  assert.deepEqual([r.list.length, r.live()], [0, 0])
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  assert.deepEqual([r.list.length, r.live()], [1, 2])
  r.clouds.draw([], { lat: LAT, lon: LON })
  assert.deepEqual([r.list.length, r.live(), r.clouds.field?.empty], [0, 0, true])
})

test('a worker\'s field is written a band a frame while the bodies in use go on being drawn; the frame after the last write it takes their place, and they are destroyed', () => {
  const r = rig({ late: true })
  r.clouds.show = true
  r.clouds.draw([puff(1000, 2500)], { lat: LAT, lon: LON })
  assert.equal(fieldOf(r.clouds), null, 'not answered yet')
  r.answer()
  assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies], [1, 0, 0], 'the layer is in; nothing written yet')
  r.clouds.frame(TF, 0)
  assert.deepEqual([r.live(), r.clouds.stats.bodies], [1, 0], 'its one band written; not in use in the same frame')
  r.clouds.frame(TF, 0)
  assert.deepEqual([r.live(), r.clouds.stats.bodies], [1, 1])
  const first = r.clouds.field
  // The next field, of two bands, round another place.
  r.clouds.draw(TWO_BANDS, { lat: LAT + 0.2, lon: LON })
  r.answer()
  r.clouds.frame(TF, 0)
  assert.deepEqual([r.live(), r.clouds.stats.bodies, r.clouds.field === first], [2, 1, true], 'a band of the new one written; the old one drawn and asked')
  r.clouds.frame(TF, 0)
  assert.deepEqual([r.live(), r.clouds.stats.bodies, r.clouds.field === first], [3, 1, true])
  r.clouds.frame(TF, 0)
  assert.deepEqual([r.live(), r.clouds.stats.bodies, r.clouds.field?.lat], [2, 2, LAT + 0.2], 'in use: the old body is gone')
  assert.equal(r.list.length, 1, 'the same primitive all along')
  assert.equal(r.layers.length, 1)
})

test('ten fields one after another leave what one leaves: one primitive, its own bodies, nothing else on the card', () => {
  const r = rig({ late: true })
  r.clouds.show = true
  for (let k = 0; k < 10; k++) {
    r.clouds.draw(TWO_BANDS, { lat: LAT + 0.05 * k, lon: LON })
    r.answer()
    for (let f = 0; f < 4; f++) r.clouds.frame(TF, 0)
    assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies], [1, 2, 2], `after field ${k + 1}`)
  }
  assert.equal(r.layers.reduce((n, l) => n + l.made, 0), 20, 'twenty bodies were made, eighteen destroyed')
  // A field overtaken while its bands are being written: what was written of it is destroyed.
  r.clouds.draw(TWO_BANDS, { lat: LAT + 1, lon: LON })
  r.answer()
  r.clouds.frame(TF, 0)
  assert.equal(r.live(), 3)
  r.clouds.draw([puff(1000, 2500)], { lat: LAT + 1.1, lon: LON })
  r.answer()
  assert.equal(r.live(), 2, 'the overtaken field\'s band is gone')
  for (let f = 0; f < 3; f++) r.clouds.frame(TF, 0)
  assert.deepEqual([r.list.length, r.live(), r.clouds.stats.bodies], [1, 1, 1])
})

test('the bodies are laid in the frame at the field\'s middle, lifted by the geoid there; the light follows the night', () => {
  const list: unknown[] = []
  const scene: SculptScene = { primitives: { add: (p) => (list.push(p), p), remove: () => true }, camera: {} as Camera }
  const layer = Object.assign(countLayer(), { frame: new Matrix4(), radius: 0 })
  layer.use = (bodies, frame, radiusM) => {
    layer.used = bodies
    Matrix4.clone(frame, layer.frame)
    layer.radius = radiusM
  }
  let uniforms: SculptUniforms | null = null
  const clouds = new SculptedClouds(scene, { builder: { ask: (job, done) => done(makeField(job)), destroy: () => {} }, geoid: () => -30, layer: (u) => ((uniforms = u), layer) })
  clouds.show = true
  clouds.draw([puff(1000, 2500)], { lat: LAT, lon: LON })
  const origin = Matrix4.getTranslation(layer.frame, new Cartesian3())
  assert.ok(Cartesian3.distance(origin, Cartesian3.fromDegrees(LON, LAT, -30)) < 1e-6)
  assert.ok(layer.radius > 4000 && layer.radius < 9000, `${layer.radius}`)
  clouds.frame(TF, 0)
  assert.equal(uniforms!.light, 1)
  clouds.frame(TF, 1)
  assert.equal(uniforms!.light, sunBrightness(1))
  assert.ok(uniforms!.light < 0.6)
})

test('a render error while its primitive is in the scene takes it out for good, and tells once; one while it is not in the scene is not its', () => {
  const r = rig()
  r.renderError.raiseEvent({}, new Error('another part\'s'))
  assert.deepEqual([r.clouds.failed, r.failures.length], [false, 0])
  r.clouds.show = true
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  r.renderError.raiseEvent({}, new Error('the shader does not compile'))
  assert.deepEqual([r.clouds.failed, r.failures.length, r.list.length, r.live()], [true, 1, 0, 0])
  r.clouds.draw(TWO_BANDS, { lat: LAT + 0.1, lon: LON })
  assert.deepEqual([r.list.length, r.live(), r.clouds.field?.lat], [0, 0, LAT + 0.1], 'the field is still built: the status line still speaks')
  r.renderError.raiseEvent({}, new Error('again'))
  assert.equal(r.failures.length, 1)
})

test('destroy: the primitive out, nothing on the card, the builder ended, and nothing drawn after', () => {
  const r = rig()
  r.clouds.show = true
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  r.clouds.destroy()
  assert.deepEqual([r.list.length, r.live(), r.ended(), r.clouds.show], [0, 0, true, false])
  r.clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  r.clouds.show = true
  assert.deepEqual([r.list.length, r.live(), r.jobs.length], [0, 0, 1])
})

test('a field made is an answer of its own kind: the mesh and no image; its arrays are handed over', async () => {
  const { transfers, packSpecs } = await import('./wxFieldJob.ts')
  const made: FieldMade = makeField({ id: 1, specs: packSpecs(TWO_BANDS), lat: LAT, lon: LON, noise: false, sculpt: true })
  assert.deepEqual([made.tiles.every((t) => t === null), made.near, made.noise, made.mesh?.bands.length], [true, null, null, 2])
  const handed = transfers(made)
  for (const band of made.mesh!.bands) assert.ok(handed.includes(band.vertices.buffer as ArrayBuffer) && handed.includes(band.indices.buffer as ArrayBuffer))
  const plain = makeField({ id: 2, specs: packSpecs(TWO_BANDS), lat: LAT, lon: LON, noise: false })
  assert.deepEqual([plain.mesh, plain.tiles.filter((t) => t !== null).length], [null, 2], 'the volume\'s job has the images and no mesh')
})

// ---- flying through a body: the veil, and the chased aircraft's tint ----------------------------------------------------------

/** Bodies shown over a camera that is put where told (metres above the sea: the geoid is 0), and a veil that keeps what it is told. */
function flight() {
  const camera = { positionCartographic: Cartographic.fromDegrees(LON, LAT, 0) }
  const scene: SculptScene = { primitives: { add: (p) => p, remove: () => true }, camera: camera as unknown as Camera }
  const told: [string, number][] = []
  let gone = false
  const clouds = new SculptedClouds(scene, {
    builder: { ask: (job, done) => done(makeField(job)), destroy: () => {} }, geoid: () => 0, layer: countLayer,
    veil: { set: (css, opacity) => void told.push([css, opacity]), destroy: () => void (gone = true) },
  })
  clouds.show = true
  // A deck of light rain from 2,000 to 3,500 m, 80 km wide.
  clouds.draw([puff(2000, 3500, 80_000, 0, { sev: 1 })], { lat: LAT, lon: LON })
  const eye = (eastKm: number, altM: number): void => void Cartographic.fromDegrees(LON + eastKm / (111.195 * Math.cos((LAT * Math.PI) / 180)), LAT, altM, camera.positionCartographic)
  const plane = (eastKm: number, altM: number) => ({ lat: LAT, lon: LON + eastKm / (111.195 * Math.cos((LAT * Math.PI) / 180)), altM })
  return { clouds, told, eye, plane, gone: () => gone }
}

test('through: the camera inside a body: a light veil in the body\'s colour, eased in over half a second, and out again when it leaves', () => {
  const f = flight()
  f.eye(0, 5000) // over the deck
  f.clouds.through(null, 0)
  f.clouds.through(null, 100)
  assert.equal(f.told.length, 0, 'outside: no veil, and nothing told')
  f.eye(0, 2750) // in its middle
  f.clouds.through(null, 100 + (EASE_S * 1000) / 2)
  const [css, half] = f.told.at(-1)!
  assert.ok(Math.abs(half - VEIL_MAX / 2) < 0.006, `half-way in after half the time: ${half}`)
  assert.equal(css, `rgb(${severityRgb(1).map((v) => Math.round((v + (1 - v) * INSIDE) * 255)).join(' ')})`, 'light rain\'s colour, lightened as the inside of a body is')
  for (let t = 500; t <= 1200; t += 50) f.clouds.through(null, t)
  assert.equal(f.told.at(-1)![1], VEIL_MAX, 'and no stronger: the ground and the aircraft stay readable')
  assert.ok(VEIL_MAX <= 0.2)
  const n = f.told.length
  f.clouds.through(null, 1250)
  assert.equal(f.told.length, n, 'unchanged: not told again')
  f.eye(0, 5000)
  for (let t = 1300; t <= 2200; t += 50) f.clouds.through(null, t)
  assert.equal(f.told.at(-1)![1], 0, 'gone, half a second after leaving')
  assert.ok(f.told.some(([, o]) => o > 0 && o < VEIL_MAX / 2), 'through the strengths between')
})

test('through: the chased aircraft is tinted toward the body\'s colour by the cloud between the camera and it: more with more cloud, never wholly', () => {
  const f = flight()
  const settle = (plane: ReturnType<typeof f.plane> | null, from: number): number => {
    for (let t = from; t <= from + 1000; t += 50) f.clouds.through(plane, t)
    return f.clouds.tint.amount
  }
  f.eye(0, 5000)
  assert.equal(settle(f.plane(0.25, 5000), 0), 0, 'both over the deck: no tint')
  f.eye(0, 2750)
  const chase = settle(f.plane(0.25, 2750), 2000) // a chase camera 250 m behind, both in the deck
  assert.ok(Math.abs(chase - TINT_MAX * (1 - Math.exp(-0.25 / TINT_KM))) < 0.01, `${chase}`)
  const far = settle(f.plane(6, 2750), 4000) // 6 km of cloud between
  assert.ok(far > chase && far <= TINT_MAX && far > 0.95 * TINT_MAX, `${far}`)
  assert.ok(TINT_MAX <= 0.6, 'tinted and softened, not removed')
  assert.deepEqual(f.clouds.tint.color.map((v) => Math.round(v * 255)), severityRgb(1).map((v) => Math.round((v + (1 - v) * INSIDE) * 255)))
  f.eye(0, 5000) // the camera over the deck, the aircraft in it: tinted still, by the cloud on the line down to it
  assert.ok(settle(f.plane(0.25, 2750), 6000) > 0.2)
  assert.equal(settle(null, 8000), 0, 'no aircraft: none')
})

test('through: hidden, there is no veil and no tint; destroy takes the veil away', () => {
  const f = flight()
  f.eye(0, 2750)
  for (let t = 0; t <= 1000; t += 50) f.clouds.through(f.plane(0.25, 2750), t)
  assert.ok(f.told.at(-1)![1] === VEIL_MAX && f.clouds.tint.amount > 0)
  f.clouds.show = false
  assert.deepEqual([f.told.at(-1)![1], f.clouds.tint.amount], [0, 0])
  const n = f.told.length
  f.clouds.through(f.plane(0.25, 2750), 1100)
  assert.deepEqual([f.told.length, f.clouds.tint.amount], [n, 0], 'hidden: nothing is worked out')
  f.clouds.destroy()
  assert.equal(f.gone(), true)
})

test('the shadow: a field\'s bodies bring their shadow with them, asked for with the scene\'s light as it stands; hidden or empty, there is none', () => {
  const laid: ({ width: number } | null)[] = []
  const jobs: FieldJob[] = []
  let gone = false
  // The light travels down and east at the field's middle: it comes from the west, 45° up.
  const up = Cartesian3.normalize(Cartesian3.fromDegrees(LON, LAT), new Cartesian3())
  const east = Cartesian3.normalize(Cartesian3.cross(Cartesian3.UNIT_Z, up, new Cartesian3()), new Cartesian3())
  const travel = Cartesian3.normalize(Cartesian3.subtract(east, up, new Cartesian3()), new Cartesian3())
  const scene: SculptScene = { primitives: { add: (p) => p, remove: () => true }, camera: {} as Camera, light: () => ({ direction: travel }) }
  const clouds = new SculptedClouds(scene, {
    builder: { ask: (job, done) => (jobs.push(job), done(makeField(job))), destroy: () => {} }, geoid: () => 0, layer: countLayer,
    shadow: { set: (image) => void laid.push(image), destroy: () => void (gone = true) },
  })
  clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  assert.equal(JSON.stringify(laid), '[null]', 'hidden: none')
  const light = jobs[0].light!
  assert.ok(Math.abs(light[0] + Math.SQRT1_2) < 0.01 && Math.abs(light[1]) < 0.01 && Math.abs(light[2] - Math.SQRT1_2) < 0.01, `toward the light: ${light}`)
  clouds.show = true
  assert.equal(laid.at(-1)?.width, 256)
  clouds.draw([], { lat: LAT, lon: LON })
  assert.equal(laid.at(-1), null, 'an empty sky: none')
  clouds.draw(TWO_BANDS, { lat: LAT, lon: LON })
  clouds.show = false
  assert.equal(laid.at(-1), null)
  clouds.destroy()
  assert.equal(gone, true)
  // A scene whose light has no direction of its own (Cesium's sun): overhead.
  const plain = new SculptedClouds({ primitives: { add: (p) => p, remove: () => true }, camera: {} as Camera, light: () => ({}) }, { builder: { ask: (job, done) => (jobs.push(job), done(makeField(job))), destroy: () => {} }, layer: countLayer })
  plain.draw(TWO_BANDS, { lat: LAT, lon: LON })
  assert.equal(jobs.at(-1)!.light, null)
})

// ---- the hazard areas' edges and the track line ----------------------------------------------------------------------------

test('the aids: the hazard areas\' edges are handed on while shown, in their style; the track line every frame, its pieces coloured where they are in a body; hidden, none of either', () => {
  const camera = { positionCartographic: Cartographic.fromDegrees(LON, LAT, 9000) }
  const edges: { n: number; style: HazardStyle }[] = []
  const tracks: { n: number; sev: number[]; first: Cartesian3 | undefined }[] = []
  let gone = false
  const clouds = new SculptedClouds({ primitives: { add: (p) => p, remove: () => true }, camera: camera as unknown as Camera }, {
    builder: { ask: (job, done) => done(makeField(job)), destroy: () => {} }, geoid: () => 25, layer: countLayer,
    aids: {
      hazards: (hazards, style) => void edges.push({ n: hazards.length, style }),
      track: (positions, sev) => void tracks.push({ n: positions.length, sev: Array.from(sev).slice(0, Math.max(0, positions.length - 1)), first: positions[0] && Cartesian3.clone(positions[0]) }),
      destroy: () => void (gone = true),
    },
  })
  const area = { key: 'a', rings: [], baseM: 0, topM: 9000 } as unknown as Hazard
  clouds.setHazards([area], 'fence', () => '#ff4d3d')
  assert.ok(edges.length < 1, 'hidden: not drawn')
  clouds.show = true
  assert.equal(JSON.stringify(edges), '[{"n":1,"style":"fence"}]')
  clouds.setHazards([area, area], 'curtain', () => '#ff4d3d')
  assert.deepEqual(edges.at(-1), { n: 2, style: 'curtain' })
  // A deck of heavy rain 40 km wide, 2,000 to 3,500 m, 60 km east; the aircraft flies east at 2,750 m, 10 km a minute.
  clouds.draw([puff(2000, 3500, 40_000, 60, { sev: 2 })], { lat: LAT, lon: LON })
  const path = aheadPath({ lat: LAT, lon: LON, altM: 2750 }, 90, 324, 0)!
  clouds.through(null, 0)
  assert.ok(tracks.length < 1, 'no way ahead given: no line')
  clouds.setAhead(path, { track: true, slice: true })
  clouds.through(null, 16)
  const t = tracks.at(-1)!
  assert.equal(t.n, (path.points.length - 1) * TRACK_PIECES + 1)
  assert.ok(Cartesian3.distance(t.first!, Cartesian3.fromDegrees(LON, LAT, 2750 + 25)) < 0.01, 'from the aircraft, its height above the sea lifted by the geoid')
  const km = (k: number): number => ((k + 0.5) * path.kmPerMin) / TRACK_PIECES // a piece's middle
  t.sev.forEach((sev, k) => {
    if (km(k) > 50 && km(k) < 70) assert.ok(Math.abs(sev - 2) < 1e-3, `in the deck at ${km(k)} km: ${sev}`)
    else if (km(k) < 42 || km(k) > 78) assert.equal(sev, -1, `clear air at ${km(k)} km`)
  })
  clouds.setAhead(path, { track: false, slice: true })
  clouds.through(null, 32)
  assert.equal(tracks.at(-1)!.n, 0, 'the track line switched off: taken away, once')
  const n = tracks.length
  clouds.through(null, 48)
  assert.equal(tracks.length, n)
  clouds.setAhead(path, { track: true, slice: false })
  clouds.through(null, 64)
  clouds.show = false
  assert.deepEqual([edges.at(-1)!.n, tracks.at(-1)!.n], [0, 0], 'hidden: both taken away')
  clouds.destroy()
  assert.equal(gone, true)
})
