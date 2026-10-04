// server/grib2.test.ts
// The GRIB 2 reader on messages built here (encodeGrib2: the same templates as EUMETSAT's two cloud products, small), and, when
// they are there, on the two products recorded on 2026-10-04 with one's own key (data/eumetsat/, git-ignored: the licence does not
// let the original data be passed on; data/fixtures/README.md says how to get them). Nothing here touches the network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { GribError, encodeGrib2, readGrib2, type GribSpaceView } from './grib2.ts'
import { readZip } from './typeDb.ts'

const TIME = Date.UTC(2026, 9, 4, 10, 30, 0)
/** A small picture's grid in the manner of SEVIRI's: the first point in the south-east, rows to the west, then north. */
const grid = (nx: number, ny: number): GribSpaceView => ({ nx, ny, subLat: 0, subLon: 0, dx: 3622, dy: 3610, xp: 1856, yp: 1856, scan: 0xc0, nr: 6.6107 })
const refused = (make: () => unknown, what: RegExp): void => {
  assert.throws(make, (e: unknown) => e instanceof GribError && what.test(e.message), `refused with ${what}`)
}

test('readGrib2: a message after a header of the producer\'s own: its time, its grid, and a field of 2-bit numbers in the message\'s order', () => {
  const packed = [0, 1, 2, 3, 3, 2, 1, 0, 2, 2, 0, 1]
  const header = new Uint8Array(272).fill(0x41) // (the real header is 272 bytes of binary fields and texts)
  const m = readGrib2(encodeGrib2({ header, discipline: 3, timeMs: TIME, grid: grid(4, 3), fields: [{ category: 0, parameter: 7, bits: 2, packed }] }))
  assert.equal(m.at, 272, 'where the message starts')
  assert.deepEqual([m.discipline, m.centre, m.timeMs], [3, 254, TIME])
  assert.equal(m.fields.length, 1)
  const f = m.fields[0]
  assert.deepEqual(f.grid, grid(4, 3))
  assert.deepEqual([f.category, f.parameter, f.bits, f.offset, f.step, f.present], [0, 7, 2, 0, 1, null])
  assert.ok(f.packed instanceof Uint8Array)
  assert.deepEqual([...f.packed], packed)
})

test('readGrib2: a sub-satellite point east or south of 0° is read with its sign (the format writes a sign bit, not two\'s complement)', () => {
  const g = { ...grid(2, 2), subLat: -0.5, subLon: 45.5 }
  assert.deepEqual(readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: g, fields: [{ category: 0, parameter: 7, bits: 2, packed: [0, 1, 2, 3] }] })).fields[0].grid, g)
  const west = { ...grid(2, 2), subLon: -75.2 }
  assert.deepEqual(readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: west, fields: [{ category: 0, parameter: 7, bits: 2, packed: [0, 1, 2, 3] }] })).fields[0].grid, west)
})

test('readGrib2: a field with a bit map has numbers only where the map says, and the field after it takes the same map; a height\'s scale comes from the binary and decimal factors', () => {
  // The heights' product: 6-bit numbers times 2^5, over 10^-1: steps of 320 m. Then its quality, 2 bits, on the same bit map.
  const bitmap = [1, 0, 0, 1, 1, 1, 0, 0, 0, 1]
  const m = readGrib2(encodeGrib2({
    discipline: 3, timeMs: TIME, grid: grid(5, 2),
    fields: [
      { category: 1, parameter: 2, bits: 6, binScale: 5, decScale: -1, packed: [1, 47, 20, 63, 9], bitmap },
      { category: 1, parameter: 3, bits: 2, packed: [0, 1, 0, 3, 1], bitmap: 'previous' },
    ],
  }))
  const [top, quality] = m.fields
  assert.deepEqual([top.category, top.parameter, top.bits, top.offset, top.step], [1, 2, 6, 0, 320])
  assert.deepEqual([...top.present!], bitmap)
  assert.deepEqual([...top.packed], [1, 0, 0, 47, 20, 63, 0, 0, 0, 9], 'a point with no number holds 0')
  assert.deepEqual([quality.category, quality.parameter, quality.bits, quality.offset, quality.step], [1, 3, 2, 0, 1])
  assert.deepEqual([...quality.present!], bitmap)
  assert.deepEqual([...quality.packed], [0, 0, 0, 1, 0, 3, 0, 0, 0, 1])
  assert.equal(quality.grid, top.grid, 'one grid for both')
})

test('readGrib2: a reference value and negative factors: a value is (reference + number × 2^binary) / 10^decimal', () => {
  const f = readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 1), fields: [{ category: 1, parameter: 2, bits: 8, ref: 2.5, binScale: -1, decScale: 1, packed: [0, 200] }] })).fields[0]
  assert.ok(Math.abs(f.offset - 0.25) < 1e-9 && Math.abs(f.step - 0.05) < 1e-9, `${f.offset} ${f.step}`)
})

test('readGrib2: numbers of any width up to 16 bits come back as they were; a width of 0 is every value the reference', () => {
  for (const bits of [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 16]) {
    const top = 2 ** bits - 1
    const packed = Array.from({ length: 37 }, (_, i) => (i * 2654435761) % (top + 1)).map((v, i) => (i === 0 ? top : i === 1 ? 0 : v))
    const f = readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(37, 1), fields: [{ category: 0, parameter: 0, bits, packed }] })).fields[0]
    assert.ok(bits <= 8 ? f.packed instanceof Uint8Array : f.packed instanceof Uint16Array, `${bits} bits: the array's kind`)
    assert.deepEqual([...f.packed], packed, `${bits} bits`)
  }
  const none = readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(3, 1), fields: [{ category: 0, parameter: 0, bits: 0, ref: 7, packed: [0, 0, 0] }] })).fields[0] // (three values, no bit of data)
  assert.deepEqual([[...none.packed], none.offset], [[0, 0, 0], 7])
})

test('readGrib2: the letters GRIB inside the header are not taken for the message', () => {
  const header = new Uint8Array(64)
  header.set(new TextEncoder().encode('GRIB'), 10) // no message starts there: no edition 2, no length that fits
  const m = readGrib2(encodeGrib2({ header, discipline: 3, timeMs: TIME, grid: grid(2, 1), fields: [{ category: 0, parameter: 7, bits: 2, packed: [2, 3] }] }))
  assert.deepEqual([m.at, [...m.fields[0].packed]], [64, [2, 3]])
})

test('readGrib2: what it does not read is refused by name, not misread', () => {
  const one = { category: 0, parameter: 7, bits: 2, packed: [0, 1, 2, 3] }
  const good = encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [one] })
  assert.equal(readGrib2(good).fields.length, 1)
  refused(() => readGrib2(new Uint8Array(500)), /no GRIB message/)
  refused(() => readGrib2(new TextEncoder().encode('<html>not found</html>')), /no GRIB message/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [one], edition: 1 })), /edition 1/)
  refused(() => readGrib2(good.subarray(0, good.length - 9)), /cut short/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [one], gridTemplate: 0 })), /grid definition template 3\.0 /)
  for (const [template, name] of [[40, /5\.40 \(JPEG 2000\)/], [41, /5\.41 \(PNG\)/], [42, /5\.42 \(CCSDS\)/], [3, /5\.3 \(complex packing/], [200, /5\.200 /]] as const) {
    refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, template }] })), name)
  }
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, bits: 24 }] })), /24 bits/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, bitmap: 'previous' }] })), /bit map/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, packed: [1, 2, 3], bitmap: [1, 1, 1, 1] }] })), /3 values for 4 points/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, packed: [1, 2, 3] }] })), /3 values for 4 points/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [one], points: 5 })), /5 points in a grid of 2 × 2/)
  refused(() => readGrib2(encodeGrib2({ discipline: 3, timeMs: TIME, grid: grid(2, 2), fields: [{ ...one, bitmapIndicator: 7 }] })), /bit map 7/)
})

// ---- the recorded products ----

const recorded = (name: string): string => fileURLToPath(new URL(`../data/eumetsat/${name}`, import.meta.url))
const CLM = recorded('clm-20261004T1030Z.zip')
const CTH = recorded('cth-20261004T1030Z.zip')
/** The product's GRIB file out of its zip (the Data Store's package: the file, EOPMetadata.xml, manifest.xml). */
async function grb(zip: string): Promise<Uint8Array> {
  const files = await readZip(new Uint8Array(readFileSync(zip)))
  const name = [...files.keys()].find((k) => k.endsWith('.grb'))
  assert.ok(name !== undefined, 'the zip holds a .grb')
  return files.get(name)!
}

test('readGrib2: the cloud mask of 2026-10-04 10:30 UTC as the Data Store gave it: SEVIRI\'s whole grid, 2 bits a pixel', { skip: !existsSync(CLM) && 'no recorded product (data/eumetsat/)' }, async () => {
  const file = await grb(CLM)
  assert.equal(file.length, 3_445_185)
  const m = readGrib2(file)
  assert.deepEqual([m.at, m.discipline, m.centre, m.timeMs, m.fields.length], [272, 3, 254, TIME, 1])
  const f = m.fields[0]
  assert.deepEqual(f.grid, { nx: 3712, ny: 3712, subLat: 0, subLon: 0, dx: 3622, dy: 3610, xp: 1856, yp: 1856, scan: 0xc0, nr: 6.6107 })
  assert.deepEqual([f.category, f.parameter, f.bits, f.offset, f.step, f.present], [0, 7, 2, 0, 1, null])
  const count = [0, 0, 0, 0]
  for (let i = 0; i < f.packed.length; i++) count[f.packed[i]]++
  assert.deepEqual(count, [1_795_661, 1_935_954, 5_934_954, 4_112_375], 'clear over water, clear over land, cloud, no data')
  // The first point is the south-east corner, off the Earth's disc; the grid's middle is the Gulf of Guinea.
  assert.equal(f.packed[0], 3)
  assert.notEqual(f.packed[1855 * 3712 + 1855], 3)
})

test('readGrib2: the cloud top height of the same frame: blocks of three pixels, 6-bit heights in steps of 320 m where the bit map has one, and their quality', { skip: !existsSync(CTH) && 'no recorded product (data/eumetsat/)' }, async () => {
  const file = await grb(CTH)
  assert.equal(file.length, 868_483)
  const m = readGrib2(file)
  assert.deepEqual([m.at, m.discipline, m.timeMs, m.fields.length], [272, 3, TIME, 2])
  const [top, quality] = m.fields
  assert.deepEqual(top.grid, { nx: 1237, ny: 1237, subLat: 0, subLon: 0, dx: 1207, dy: 1203, xp: 619, yp: 619, scan: 0xc0, nr: 6.6107 }) // (block 619 of 1237, counted from 1, is pixels 1855 to 1857 of 3712: its middle the mask's 1856)
  assert.deepEqual([top.category, top.parameter, top.bits, top.offset, top.step], [1, 2, 6, 0, 320])
  assert.deepEqual([quality.category, quality.parameter, quality.bits, quality.offset, quality.step], [1, 3, 2, 0, 1])
  let has = 0
  let highest = 0
  let lowest = 99
  const flags = [0, 0, 0, 0]
  for (let i = 0; i < top.packed.length; i++) {
    if (top.present![i] === 0) continue
    has++
    highest = Math.max(highest, top.packed[i])
    lowest = Math.min(lowest, top.packed[i])
    flags[quality.packed[i]]++
  }
  assert.deepEqual([has, lowest, highest], [676_705, 1, 47], 'blocks with a height; the heights run from 320 m to 15,040 m')
  assert.deepEqual(flags, [571_086, 105_619, 0, 0])
  assert.equal(quality.present, top.present, 'the quality takes the heights\' bit map')
})
