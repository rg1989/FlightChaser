// client/scene/wxFieldJob.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PUFF_FILL, SEV, type CloudSpec } from './cloudField.ts'
import { noiseAtlas } from './cloudNoise.ts'
import type { SatGrid } from './satGrid.ts'
import { BANDS, FIELD_N, buildField, fieldAtlas, fieldTile } from './wxField.ts'
import { SPEC_NUMBERS, makeField, packSpecs, transfers, unpackSpecs, type FieldJob } from './wxFieldJob.ts'
import { survey } from './wxSurvey.ts'

const KM_PER_DEG = 111.195
const LAT = 37.6
const LON = -122.4
const at = (eastKm: number, northKm: number): { lat: number; lon: number } =>
  ({ lat: LAT + northKm / KM_PER_DEG, lon: LON + eastKm / (KM_PER_DEG * Math.cos((LAT * Math.PI) / 180)) })
/** A puff whose base and top are given; wide: its billboard's width, m. */
function puff(baseM: number, topM: number, o: Partial<CloudSpec> & { eastKm?: number; northKm?: number; wide?: number } = {}): CloudSpec {
  const { eastKm = 0, northKm = 0, wide = 3000, ...rest } = o
  return {
    ...at(eastKm, northKm), heightM: (baseM + topM) / 2, groundM: 0, scale: [wide, (topM - baseM) / PUFF_FILL], maxSize: [20, 12, 12], slice: 0.3,
    brightness: 1, tint: 0, farKm: 100, ...rest,
  }
}
const CU = puff(1500, 2500, { eastKm: 6.123, northKm: 2.456 })
const RAIN = puff(7000, 8700, { eastKm: -40, northKm: 20, wide: 10_000, sev: SEV.light })
const CB = puff(1000, 11_000, { eastKm: 60, northKm: 60, wide: 9000, tower: 0, sev: SEV.storm }) // tower number 0 is a tower too
const SKY = [CU, RAIN, CB]
const job = (specs: readonly CloudSpec[], o: Partial<FieldJob> = {}): FieldJob => ({ id: 1, specs: packSpecs(specs), lat: LAT, lon: LON, noise: false, ...o })

test('packSpecs: the cloud specs as numbers, eight each (what a field reads of a spec: its place, its height, its billboard, its severity, whether it is a tower\'s and whether it is masked by the satellite); read back, they build the very same field', () => {
  const packed = packSpecs(SKY)
  assert.ok(packed instanceof Float64Array)
  assert.equal(SPEC_NUMBERS, 8)
  assert.equal(packed.length, 3 * SPEC_NUMBERS)
  const back = unpackSpecs(packed)
  assert.equal(back.length, 3)
  assert.deepEqual(back.map((s) => [s.lon, s.lat, s.heightM, s.scale[0], s.scale[1]]), SKY.map((s) => [s.lon, s.lat, s.heightM, s.scale[0], s.scale[1]]), 'to the last bit: doubles')
  assert.deepEqual(back.map((s) => s.tower === undefined), [true, true, false], 'a tower is a tower, whatever its number')
  assert.deepEqual(back.map((s) => s.sev ?? 0), [0, 1, 3], 'no severity is cloud')
  assert.deepEqual(back.map((s) => s.masked === true), [false, false, false])
  assert.deepEqual(buildField(back, LAT, LON), buildField(SKY, LAT, LON))
  assert.deepEqual(unpackSpecs(packSpecs([])), [])
  assert.deepEqual(unpackSpecs(packSpecs([{ ...CU, masked: true }, RAIN])).map((s) => s.masked === true), [true, false])
})

test('makeField: with the satellite\'s grid in the job, the field is the specs\' and the grid\'s (buildField\'s with it), and its images follow', () => {
  const n = 128
  const sat: SatGrid = { timeMs: 0, n, cover: new Float32Array(n * n).fill(1), topM: new Float32Array(n * n).fill(6000), baseM: new Float32Array(n * n).fill(5000), seen: new Uint8Array(n * n).fill(1) }
  const specs = [{ ...CU, masked: true }, CB]
  const made = makeField(job(specs, { sat }))
  const f = buildField(specs, LAT, LON, sat)
  assert.deepEqual(made.field, f)
  assert.equal(f.cov[2][0], 1) // the satellite's deck, everywhere
  assert.deepEqual(made.tiles.map((t) => t !== null), [true, false, true, false, true])
  assert.deepEqual(made.tiles[2], fieldTile(f, 2))
  assert.deepEqual(makeField(job(specs, { sat: null })).field, buildField(specs, LAT, LON))
})

test('makeField: the field of the job\'s specs round its place, its image for the GPU as a tile for each band with cloud, the clear-air map and which bands rain: what buildField, fieldTile and survey give; and the ask\'s number, and how long it took', () => {
  const made = makeField(job(SKY, { id: 7 }))
  const f = buildField(SKY, LAT, LON)
  assert.equal(made.id, 7)
  assert.deepEqual(made.field, f)
  assert.deepEqual(made.tiles.map((t) => t !== null), [true, false, true, false, true], 'the cumulus, the deck, the storm')
  assert.deepEqual(made.tiles, [0, 1, 2, 3, 4].map((b) => fieldTile(f, b)))
  const atlas = fieldAtlas(f)
  made.tiles.forEach((t, b) => {
    for (const row of [0, 100, 255, 511]) {
      const o = ((Math.floor(b / 3) * FIELD_N + row) * atlas.width + (b % 3) * FIELD_N) * 4
      assert.deepEqual(t === null ? new Uint8ClampedArray(FIELD_N * 4) : t.data.subarray(row * FIELD_N * 4, (row + 1) * FIELD_N * 4), atlas.data.subarray(o, o + FIELD_N * 4), `band ${b}, row ${row}: the atlas's tile`)
    }
  })
  const s = survey(f)
  assert.deepEqual(made.near, s.near)
  assert.deepEqual(made.wet, s.wet)
  assert.deepEqual(made.box, s.box)
  assert.deepEqual(made.wet, [false, false, true, false, true], 'the deck and the storm rain')
  assert.equal(made.noise, null, 'not asked for')
  assert.ok(Number.isFinite(made.ms) && made.ms >= 0)
})

test('makeField: an empty sky has a field (empty) and no images; weather outside the square likewise', () => {
  for (const specs of [[], [puff(1500, 2500, { eastKm: 400 })]]) {
    const made = makeField(job(specs))
    assert.equal(made.field.empty, true)
    assert.deepEqual([made.field.lat, made.field.lon], [LAT, LON])
    assert.deepEqual([made.tiles, made.near], [[null, null, null, null, null], null])
    assert.deepEqual(made.wet, [false, false, false, false, false])
    assert.ok(made.box[0] > made.box[2], 'a box that holds nothing')
  }
})

test('makeField: the noise, when asked for: a copy of noiseAtlas\'s (the worker hands its arrays over, and has to keep its own to give again)', () => {
  const made = makeField(job([], { noise: true }))
  const n = noiseAtlas()
  assert.deepEqual(made.noise, n)
  assert.notEqual(made.noise!.data, n.data)
  assert.notEqual(made.noise!.data.buffer, n.data.buffer)
  assert.deepEqual(makeField(job([], { noise: true })).noise, n, 'and again')
})

test('transfers: every array of an answer, once each: the field\'s twenty, the tiles, the clear-air map and the noise; of an empty sky\'s, the field\'s alone', () => {
  const made = makeField(job(SKY, { noise: true }))
  const t = transfers(made)
  assert.equal(t.length, 4 * BANDS + 3 + 2)
  assert.equal(new Set(t).size, t.length, 'none twice: a buffer handed over twice is an error')
  for (const b of t) assert.ok(b instanceof ArrayBuffer && b.byteLength > 0)
  const all = new Set(t)
  for (const maps of [made.field.cov, made.field.base, made.field.top, made.field.sev]) for (const a of maps) assert.ok(all.has(a.buffer as ArrayBuffer))
  for (const tile of made.tiles) assert.ok(tile === null || all.has(tile.data.buffer as ArrayBuffer))
  assert.ok(all.has(made.near!.data.buffer as ArrayBuffer) && all.has(made.noise!.data.buffer as ArrayBuffer))
  assert.equal(made.field.cov[0].length, FIELD_N * FIELD_N)
  assert.equal(transfers(makeField(job([]))).length, 4 * BANDS)
  // handed over as a worker hands them: the answer arrives whole
  const sent = structuredClone(made, { transfer: t })
  assert.deepEqual(sent.field.lo, made.field.lo)
  assert.equal(sent.tiles[0]!.data.length, FIELD_N * FIELD_N * 4)
  assert.equal(made.tiles[0]!.data.length, 0, 'and is gone from the sender')
  assert.ok(noiseAtlas().data.length > 0, 'its own noise is not')
})
