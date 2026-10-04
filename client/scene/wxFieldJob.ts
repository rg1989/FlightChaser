// client/scene/wxFieldJob.ts
// The making of a weather field as one job, which a worker does while the frames go on (wxField.worker.ts; fieldBuilder.ts sends it) or,
// where there is no worker, the caller's own thread: the field of the cloud specs round a place (wxField.ts buildField), its image for
// the GPU (fieldAtlas), what the march asks of it before it walks it (wxSurvey.ts survey) and, when asked, the noise (cloudNoise.ts: 64³
// values, the longest of it all to make). Pure (no Cesium, no DOM), so Node tests cover it.
// The specs cross to the worker as numbers (packSpecs: what a field reads of a spec, no more), and the answer's arrays cross back
// handed over, not copied (transfers): 21 MB of field, 6 MB of image.
import { noiseAtlas } from './cloudNoise.ts'
import { BANDS, buildField, fieldAtlas, type Bitmap, type FieldSpec, type WxField } from './wxField.ts'
import { survey } from './wxSurvey.ts'

/** A spec's numbers in packSpecs: its longitude and latitude, its middle's height, its billboard's width and height, its severity, and 1 when it is a tower's. */
export const SPEC_NUMBERS = 7

/** One field to make: the specs (packSpecs), the place it is built round, and whether the noise is wanted with it. */
export interface FieldJob {
  id: number // the ask's number: its answer carries it
  specs: Float64Array
  lat: number
  lon: number
  noise: boolean
}

/** A field made: with its image and its clear-air map (none of an empty field), which bands rain, the noise if it was asked for, and how long the making took, ms. */
export interface FieldMade {
  id: number
  field: WxField
  atlas: Bitmap | null
  near: Bitmap | null
  wet: boolean[]
  noise: Bitmap | null
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
  })
  return out
}

/** The packed specs as buildField takes them (a tower's number is not kept: a field asks only whether a spec has one). */
export function unpackSpecs(packed: Float64Array): FieldSpec[] {
  const out: FieldSpec[] = []
  for (let o = 0; o + SPEC_NUMBERS <= packed.length; o += SPEC_NUMBERS) {
    out.push({ lon: packed[o], lat: packed[o + 1], heightM: packed[o + 2], scale: [packed[o + 3], packed[o + 4]], sev: packed[o + 5], tower: packed[o + 6] > 0 ? 0 : undefined })
  }
  return out
}

/** The job done. The noise given is a copy: the worker hands its answer's arrays over, and keeps its own noise to give again. */
export function makeField(job: FieldJob): FieldMade {
  const t0 = performance.now()
  const field = buildField(unpackSpecs(job.specs), job.lat, job.lon)
  let [atlas, near]: (Bitmap | null)[] = [null, null]
  let wet = Array.from({ length: BANDS }, () => false)
  if (!field.empty) {
    const s = survey(field)
    atlas = fieldAtlas(field)
    near = s.near
    wet = s.wet
  }
  let noise: Bitmap | null = null
  if (job.noise) {
    const n = noiseAtlas()
    noise = { data: n.data.slice(), width: n.width, height: n.height }
  }
  return { id: job.id, field, atlas, near, wet, noise, ms: performance.now() - t0 }
}

/** The answer's arrays, each once: what a worker hands over with it. */
export function transfers(made: FieldMade): ArrayBuffer[] {
  const f = made.field
  const out = [...f.cov, ...f.base, ...f.top, ...f.sev].map((a) => a.buffer as ArrayBuffer)
  for (const image of [made.atlas, made.near, made.noise]) if (image !== null) out.push(image.data.buffer as ArrayBuffer)
  return out
}
