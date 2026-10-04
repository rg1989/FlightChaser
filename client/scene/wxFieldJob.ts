// client/scene/wxFieldJob.ts
// The making of a weather field as one job, which a worker does while the frames go on (wxField.worker.ts; fieldBuilder.ts sends it) or,
// where there is no worker, the caller's own thread: the field of the cloud specs round a place (wxField.ts buildField), its image for
// the GPU, a tile for each band that has cloud (fieldTile: the cloud volume writes them to the card one at a time), what the march asks
// of the field before it walks it (wxSurvey.ts survey) and, when asked, the noise (cloudNoise.ts: 64³ values, the longest of it all to
// make). A job for the Sculpted look (sculpt) is the field and its bodies as a mesh (sculptMesh.ts) in place of the images and the
// noise: that look reads no image. Pure (no Cesium, no DOM), so Node tests cover it.
// The specs cross to the worker as numbers (packSpecs: what a field reads of a spec, no more), and with them the weather satellite's
// grid when there is one (satGrid.ts: 213 KB, copied as the specs are: a worker that fails leaves its job to this thread, which
// then needs it whole); the answer's arrays cross back handed over, not copied (transfers): 21 MB of field, up to 5 MB of image.
import { noiseAtlas } from './cloudNoise.ts'
import type { SatGrid } from './satGrid.ts'
import { sculptMesh, type SculptMesh } from './sculptMesh.ts'
import { BANDS, buildField, fieldTile, type Bitmap, type FieldSpec, type WxField } from './wxField.ts'
import { survey } from './wxSurvey.ts'

/** A spec's numbers in packSpecs: its longitude and latitude, its middle's height, its billboard's width and height, its severity, 1 when it is a tower's, and 1 when it is masked by the satellite. */
export const SPEC_NUMBERS = 8

/** One field to make: the specs (packSpecs), the place it is built round, whether the noise is wanted with it, and the satellite's cloud over its square, if a frame is in use. */
export interface FieldJob {
  id: number // the ask's number: its answer carries it
  specs: Float64Array
  lat: number
  lon: number
  noise: boolean
  sat?: SatGrid | null
  sculpt?: boolean // the field's bodies as a mesh, and no image
}

/** A field made: with each band's tile of its image (none for a band with no cloud), its clear-air map (none of an empty field), which bands rain, the noise if it was asked for, and how long the making took, ms. */
export interface FieldMade {
  id: number
  field: WxField
  tiles: (Bitmap | null)[]
  near: Bitmap | null
  wet: boolean[]
  box: [number, number, number, number] // wxSurvey.ts survey: the map's rectangle all the cover stands in
  noise: Bitmap | null
  mesh?: SculptMesh | null // a sculpt job's: the field's bodies
  ms: number
}

/** The specs as numbers, SPEC_NUMBERS each: what buildField reads of them. */
export function packSpecs(specs: readonly FieldSpec[]): Float64Array {
  const out = new Float64Array(specs.length * SPEC_NUMBERS)
  specs.forEach((s, k) => {
    const o = k * SPEC_NUMBERS
    out[o] = s.lon
    out[o + 1] = s.lat
    out[o + 2] = s.heightM
    out[o + 3] = s.scale[0]
    out[o + 4] = s.scale[1]
    out[o + 5] = s.sev ?? 0
    out[o + 6] = s.tower === undefined ? 0 : 1
    out[o + 7] = s.masked === true ? 1 : 0
  })
  return out
}

/** The packed specs as buildField takes them (a tower's number is not kept: a field asks only whether a spec has one). */
export function unpackSpecs(packed: Float64Array): FieldSpec[] {
  const out: FieldSpec[] = []
  for (let o = 0; o + SPEC_NUMBERS <= packed.length; o += SPEC_NUMBERS) {
    out.push({ lon: packed[o], lat: packed[o + 1], heightM: packed[o + 2], scale: [packed[o + 3], packed[o + 4]], sev: packed[o + 5], tower: packed[o + 6] > 0 ? 0 : undefined, masked: packed[o + 7] > 0 })
  }
  return out
}

/** The job done. The noise given is a copy: the worker hands its answer's arrays over, and keeps its own noise to give again. */
export function makeField(job: FieldJob): FieldMade {
  const t0 = performance.now()
  const field = buildField(unpackSpecs(job.specs), job.lat, job.lon, job.sat ?? null)
  let tiles: (Bitmap | null)[] = Array.from({ length: BANDS }, () => null)
  let near: Bitmap | null = null
  let wet = Array.from({ length: BANDS }, () => false)
  let box: [number, number, number, number] = [1, 1, -1, -1]
  const mesh = job.sculpt === true ? sculptMesh(field) : null
  if (!field.empty && mesh === null) {
    const s = survey(field)
    tiles = tiles.map((_, b) => fieldTile(field, b))
    near = s.near
    wet = s.wet
    box = s.box
  }
  let noise: Bitmap | null = null
  if (job.noise) {
    const n = noiseAtlas()
    noise = { data: n.data.slice(), width: n.width, height: n.height }
  }
  return { id: job.id, field, tiles, near, wet, box, noise, mesh, ms: performance.now() - t0 }
}

/** The answer's arrays, each once: what a worker hands over with it. */
export function transfers(made: FieldMade): ArrayBuffer[] {
  const f = made.field
  const out = [...f.cov, ...f.base, ...f.top, ...f.sev].map((a) => a.buffer as ArrayBuffer)
  for (const image of [...made.tiles, made.near, made.noise]) if (image !== null) out.push(image.data.buffer as ArrayBuffer)
  for (const band of made.mesh?.bands ?? []) out.push(...[band.vertices, band.indices, band.roof, band.floor].map((a) => a.buffer as ArrayBuffer))
  return out
}
