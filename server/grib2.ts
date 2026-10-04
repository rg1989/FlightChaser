// server/grib2.ts
// A reader of GRIB edition 2 (WMO's FM 92 GRIB: the Manual on Codes, volume I.2) for the two Meteosat cloud products that EUMETSAT's
// Data Store gives (server/eumetsat.ts), and of no more of the format than they use. What their files are, found on 2026-10-04 in
// the two products of the 10:30 UTC frame and in EUMETSAT's product specification (EUM/MSG/SPE/022 v5B, §10 and §19):
// - a header of 272 bytes of the producing facility's own (binary fields, the texts "OPE" and the frame's time), then one GRIB
//   message of edition 2 that runs to the file's end ("7777"). So the file does not begin with the letters GRIB: the message is
//   looked for in the file's first 4 KB, and taken where an edition 2 message of a length that fits starts;
// - section 1: centre 254 (EUMETSAT), the reference time the frame's nominal time;
// - section 3, the grid: template 3.90, "space view perspective": the picture as the satellite takes it. Nx × Ny points, the point
//   under the satellite (its latitude and longitude, and where in the grid it falls: Xp, Yp), the Earth's apparent diameter in grid
//   lengths (dx, dy), the camera's distance from the Earth's centre in Earth radii (Nr), and the scanning mode (0xC0 for SEVIRI: the
//   first point is the south-east corner, a row runs west, the rows go north);
// - section 4, the product: template 4.30 (a satellite product); only its parameter's category and number are read (discipline 3,
//   space products: 0.7 the cloud mask, 1.2 the cloud top height, 1.3 that height's quality);
// - sections 5 and 7, the values: template 5.0, simple packing: whole numbers of a few bits each (2 for the mask and the quality,
//   6 for the height), one after the other, the highest bit first. A value is (R + number × 2^E) / 10^D: for the height R = 0,
//   E = 5, D = −1, so a step is 320 m;
// - section 6, the bit map: none (the mask: every point has a number), one of its own (the height: a bit for each point, numbers
//   only for the points whose bit is 1), or the one before it in the message (the quality: indicator 254).
// No codec is needed: nothing here is JPEG 2000, PNG or CCSDS. A message in another grid or packing template, or of another
// edition, is refused by its number (GribError), never misread.
// ponytail: template 3.90 and 5.0 only, numbers of up to 16 bits, the first message of a file. Upgrade: a template more when a
// product needs it (the newer satellite's cloud mask, collection EO:EUM:DAT:0800, is GRIB 2 too; its other products are NetCDF-4).

/** A file that is no GRIB 2 message this reader reads; the message says what it met. */
export class GribError extends Error {}

/** Grid definition template 3.90: the satellite's own view. */
export interface GribSpaceView {
  nx: number // points in a row
  ny: number // rows
  subLat: number // the point under the satellite, degrees
  subLon: number
  dx: number // the Earth's apparent diameter in grid lengths, along a row
  dy: number // and across the rows
  xp: number // where the point under the satellite falls, in grid lengths
  yp: number
  scan: number // the scanning mode's flags: 0x80 a row runs towards −x (west), 0x40 the rows go towards +y (north)
  nr: number // the camera's distance from the Earth's centre, in Earth (equatorial) radii
}

/** One field of a message: a number for every point of the grid, in the message's own order (the scanning mode says which). */
export interface GribField {
  category: number // the parameter's category and number in its discipline (code table 4.2)
  parameter: number
  grid: GribSpaceView
  bits: number // a number's width as packed
  offset: number // a point's value is offset + number × step
  step: number
  packed: Uint8Array | Uint16Array // the numbers as packed (Uint8Array up to 8 bits); 0 where a point has none
  present: Uint8Array | null // 1 where a point has a number (the bit map); null: every point has one
}

export interface GribMessage {
  at: number // where in the file the message starts (the producer's header before it)
  discipline: number // code table 0.0: 3 is space products
  centre: number // the originating centre: 254 is EUMETSAT
  timeMs: number // the reference time
  fields: GribField[]
}

const HEAD_MAX = 4096 // the message starts within this many bytes of the file's start
const MAX_BITS = 16
const GRID_SPACE_VIEW = 90
const PACKING: Record<number, string> = { 2: 'complex packing', 3: 'complex packing and spatial differencing', 40: 'JPEG 2000', 41: 'PNG', 42: 'CCSDS' }
const MAGIC = [0x47, 0x52, 0x49, 0x42] // "GRIB"
const END = [0x37, 0x37, 0x37, 0x37] // "7777"

const isAt = (file: Uint8Array, at: number, what: readonly number[]): boolean => what.every((b, i) => file[at + i] === b)
/** A whole number written with a sign bit (the format's way): the highest bit set is minus. */
const signed = (v: number, bits: number): number => (v >= 2 ** (bits - 1) ? -(v - 2 ** (bits - 1)) : v)

/** Where the message starts and its length; throws when the file holds none this reader reads. */
function find(file: Uint8Array, dv: DataView): { at: number; length: number } {
  let met = 'no GRIB message in the file\'s first 4 KB'
  for (let at = 0; at + 16 <= file.length && at <= HEAD_MAX; at++) {
    if (!isAt(file, at, MAGIC)) continue
    const edition = file[at + 7]
    const length = dv.getUint32(at + 8) * 2 ** 32 + dv.getUint32(at + 12)
    if (edition !== 2) {
      if (at === 0 || edition === 1) met = `GRIB edition ${edition} is not read (only edition 2)`
      continue
    }
    if (length < 20 || at + length > file.length || !isAt(file, at + length - 4, END)) {
      met = 'a GRIB 2 message that is cut short'
      continue
    }
    return { at, length }
  }
  throw new GribError(met)
}

/** count numbers of `bits` bits each from data, the highest bit first. */
function unpack(data: Uint8Array, count: number, bits: number): Uint8Array | Uint16Array {
  const out = bits <= 8 ? new Uint8Array(count) : new Uint16Array(count)
  if (bits === 0) return out
  if (data.length * 8 < count * bits) throw new GribError('a GRIB 2 message that is cut short: its data section is shorter than its values')
  const mask = 2 ** bits - 1
  if (8 % bits === 0) {
    // 1, 2, 4 or 8 bits: whole numbers to a byte (the mask's 13.8 million pixels in 15 ms, not 60).
    const whole = Math.floor((count * bits) / 8)
    let k = 0
    for (let p = 0; p < whole; p++) {
      const b = data[p]
      for (let s = 8 - bits; s >= 0; s -= bits) out[k++] = (b >> s) & mask
    }
    for (let s = 8 - bits; k < count; s -= bits) out[k++] = (data[whole] >> s) & mask
    return out
  }
  let acc = 0 // the bits read and not yet given out: fewer than 24
  let have = 0
  let p = 0
  for (let k = 0; k < count; k++) {
    while (have < bits) {
      acc = (acc << 8) | data[p++]
      have += 8
    }
    have -= bits
    out[k] = (acc >> have) & mask
    acc &= (1 << have) - 1
  }
  return out
}

/** The first GRIB 2 message of a file, read; throws a GribError for a file that holds none, or one in a template this reader does not read. */
export function readGrib2(file: Uint8Array): GribMessage {
  const dv = new DataView(file.buffer, file.byteOffset, file.byteLength)
  const { at, length } = find(file, dv)
  const end = at + length - 4
  const fields: GribField[] = []
  let centre = -1
  let timeMs = Number.NaN
  let grid: GribSpaceView | null = null
  let product: { category: number; parameter: number } | null = null
  let packing: { count: number; bits: number; offset: number; step: number } | null = null
  let bitmap: Uint8Array | null | undefined // of the field being read: undefined until its section 6
  let lastBitmap: Uint8Array | null = null // the last one a section 6 brought: indicator 254 takes it again
  const ones = new WeakMap<Uint8Array, number>()
  let p = at + 16
  while (p < end) {
    const len = p + 5 <= end ? dv.getUint32(p) : 0
    const section = file[p + 4]
    const need = (bytes: number): void => {
      if (len < bytes) throw new GribError(`GRIB 2: section ${section} is ${len} bytes, shorter than its template`)
    }
    if (len < 5 || p + len > end) throw new GribError('a GRIB 2 message that is cut short: a section runs past its end')
    if (section === 1) {
      need(21)
      centre = dv.getUint16(p + 5)
      timeMs = Date.UTC(dv.getUint16(p + 12), file[p + 14] - 1, file[p + 15], file[p + 16], file[p + 17], file[p + 18])
    } else if (section === 3) {
      need(15)
      const template = dv.getUint16(p + 12)
      if (template !== GRID_SPACE_VIEW) throw new GribError(`GRIB 2: grid definition template 3.${template} is not read (only 3.90, the satellite's view)`)
      need(80)
      const points = dv.getUint32(p + 6)
      grid = {
        nx: dv.getUint32(p + 30), ny: dv.getUint32(p + 34),
        subLat: signed(dv.getUint32(p + 38), 32) / 1e6, subLon: signed(dv.getUint32(p + 42), 32) / 1e6,
        dx: dv.getUint32(p + 47), dy: dv.getUint32(p + 51),
        xp: dv.getUint32(p + 55) / 1000, yp: dv.getUint32(p + 59) / 1000,
        scan: file[p + 63],
        nr: dv.getUint32(p + 68) / 1e6,
      }
      if (points !== grid.nx * grid.ny) throw new GribError(`GRIB 2: ${points} points in a grid of ${grid.nx} × ${grid.ny}`)
    } else if (section === 4) {
      need(11)
      product = { category: file[p + 9], parameter: file[p + 10] }
    } else if (section === 5) {
      need(11)
      const template = dv.getUint16(p + 9)
      if (template !== 0) throw new GribError(`GRIB 2: data representation template 5.${template} ${PACKING[template] === undefined ? '' : `(${PACKING[template]}) `}is not read (only 5.0, simple packing)`)
      need(21)
      const bits = file[p + 19]
      if (bits > MAX_BITS) throw new GribError(`GRIB 2: numbers of ${bits} bits are not read (up to ${MAX_BITS})`)
      const decimal = 10 ** signed(dv.getUint16(p + 17), 16)
      packing = { count: dv.getUint32(p + 5), bits, offset: dv.getFloat32(p + 11) / decimal, step: 2 ** signed(dv.getUint16(p + 15), 16) / decimal }
    } else if (section === 6) {
      need(6)
      const indicator = file[p + 5]
      if (indicator === 255) bitmap = null
      else if (indicator === 254) {
        if (lastBitmap === null) throw new GribError('GRIB 2: a field takes the bit map before it, and there is none')
        bitmap = lastBitmap
      } else if (indicator === 0) {
        if (grid === null) throw new GribError('GRIB 2: a bit map before its grid')
        const points = grid.nx * grid.ny
        if ((len - 6) * 8 < points) throw new GribError('a GRIB 2 message that is cut short: its bit map is shorter than its grid')
        const present = new Uint8Array(points)
        let n = 0
        for (let i = 0, q = p + 6; i < points; i++) {
          const bit = (file[q + (i >> 3)] >> (7 - (i & 7))) & 1
          present[i] = bit
          n += bit
        }
        ones.set(present, n)
        bitmap = lastBitmap = present
      } else throw new GribError(`GRIB 2: bit map ${indicator} (one defined by the centre beforehand) is not read`)
    } else if (section === 7) {
      if (grid === null || product === null || packing === null || bitmap === undefined) throw new GribError('GRIB 2: a data section before its grid, product, packing or bit map section')
      const points = grid.nx * grid.ny
      const valued = bitmap === null ? points : ones.get(bitmap)!
      if (packing.count !== valued) throw new GribError(`GRIB 2: ${packing.count} values for ${valued} points`)
      const numbers = unpack(file.subarray(p + 5, p + len), packing.count, packing.bits)
      let packed = numbers
      if (bitmap !== null) {
        packed = packing.bits <= 8 ? new Uint8Array(points) : new Uint16Array(points)
        for (let i = 0, k = 0; i < points; i++) if (bitmap[i] === 1) packed[i] = numbers[k++]
      }
      fields.push({ category: product.category, parameter: product.parameter, grid, bits: packing.bits, offset: packing.offset, step: packing.step, packed, present: bitmap })
      product = packing = null // sections 4 to 7 come again for the next field, on the same grid
      bitmap = undefined
    } else if (section !== 2) throw new GribError(`GRIB 2: no section ${section}`) // (2 is the centre's own use: skipped)
    p += len
  }
  if (!Number.isFinite(timeMs)) throw new GribError('GRIB 2: a message with no identification section')
  return { at, discipline: file[at + 6], centre, timeMs, fields }
}

/** A field as encodeGrib2 writes it. */
export interface GribFieldSpec {
  category: number
  parameter: number
  bits: number
  ref?: number // the reference value R, default 0
  binScale?: number // E, default 0
  decScale?: number // D, default 0
  packed: ArrayLike<number> // a number for each point that has one, in the grid's order
  bitmap?: ArrayLike<number> | 'previous' // 1 where a point has a number; 'previous': the field before's; absent: every point has one
  template?: number // the data representation template; default 0, simple packing (a test writes another to see it refused)
  bitmapIndicator?: number // written in place of the bit map's own indicator (a test's)
}

/**
 * Test helper: a GRIB 2 message in the templates EUMETSAT's cloud products use (3.90, 4.30, 5.0, a bit map or none), after an
 * optional header as the producing facility writes one. gridTemplate, edition and points write a wrong number in the place of the
 * right one, to see it refused.
 */
export function encodeGrib2(m: { header?: Uint8Array; discipline: number; timeMs: number; grid: GribSpaceView; fields: GribFieldSpec[]; gridTemplate?: number; edition?: number; points?: number }): Uint8Array<ArrayBuffer> {
  const sign = (v: number, bits: number): number => (v < 0 ? 2 ** (bits - 1) - v : v)
  const section = (number: number, bytes: number, fill: (b: Buffer) => void): Buffer => {
    const b = Buffer.alloc(bytes)
    b.writeUInt32BE(bytes, 0)
    b[4] = number
    fill(b)
    return b
  }
  const t = new Date(m.timeMs)
  const g = m.grid
  const parts: Buffer[] = [
    section(1, 21, (b) => {
      b.writeUInt16BE(254, 5) // EUMETSAT
      b[9] = 3 // master tables version
      b[11] = 3 // the reference time is the observation's
      b.writeUInt16BE(t.getUTCFullYear(), 12)
      b.set([t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), 1, 6], 14)
    }),
    section(3, 80, (b) => {
      b.writeUInt32BE(m.points ?? g.nx * g.ny, 6)
      b.writeUInt16BE(m.gridTemplate ?? GRID_SPACE_VIEW, 12)
      b[14] = 3 // the Earth an oblate spheroid, its axes in km
      b.fill(0xff, 15, 20)
      b[20] = 4
      b.writeUInt32BE(63_781_400, 21)
      b[25] = 4
      b.writeUInt32BE(63_567_550, 26)
      b.writeUInt32BE(g.nx, 30)
      b.writeUInt32BE(g.ny, 34)
      b.writeUInt32BE(sign(Math.round(g.subLat * 1e6), 32), 38)
      b.writeUInt32BE(sign(Math.round(g.subLon * 1e6), 32), 42)
      b.writeUInt32BE(g.dx, 47)
      b.writeUInt32BE(g.dy, 51)
      b.writeUInt32BE(Math.round(g.xp * 1000), 55)
      b.writeUInt32BE(Math.round(g.yp * 1000), 59)
      b[63] = g.scan
      b.writeUInt32BE(Math.round(g.nr * 1e6), 68)
    }),
  ]
  for (const f of m.fields) {
    const numbers = Buffer.alloc(Math.ceil((f.packed.length * f.bits) / 8))
    for (let k = 0, bit = 0; k < f.packed.length; k++) {
      for (let s = f.bits - 1; s >= 0; s--, bit++) if ((f.packed[k] >> s) & 1) numbers[bit >> 3] |= 0x80 >> (bit & 7)
    }
    const map = f.bitmap === undefined || f.bitmap === 'previous' ? null : f.bitmap
    parts.push(
      section(4, 24, (b) => {
        b.writeUInt16BE(30, 7) // template 4.30: a satellite product
        b.set([f.category, f.parameter, 8, 1, 1], 9) // an observation, one spectral band
        b.set([0x01, 0x4d, 0x00, 0x39, 0xcf], 14) // the band's satellite series and number, and its instrument: Meteosat-10's SEVIRI
        b.fill(0xff, 19, 24)
      }),
      section(5, 21, (b) => {
        b.writeUInt32BE(f.packed.length, 5)
        b.writeUInt16BE(f.template ?? 0, 9)
        b.writeFloatBE(f.ref ?? 0, 11)
        b.writeUInt16BE(sign(f.binScale ?? 0, 16), 15)
        b.writeUInt16BE(sign(f.decScale ?? 0, 16), 17)
        b[19] = f.bits
        b[20] = 1 // the original values are whole numbers
      }),
      section(6, 6 + (map === null ? 0 : Math.ceil(map.length / 8)), (b) => {
        b[5] = f.bitmapIndicator ?? (f.bitmap === undefined ? 255 : f.bitmap === 'previous' ? 254 : 0)
        if (map !== null) for (let i = 0; i < map.length; i++) if (map[i] === 1) b[6 + (i >> 3)] |= 0x80 >> (i & 7)
      }),
      section(7, 5 + numbers.length, (b) => void numbers.copy(b, 5)),
    )
  }
  const body = Buffer.concat(parts)
  const head = Buffer.alloc(16)
  head.set(MAGIC, 0)
  head[6] = m.discipline
  head[7] = m.edition ?? 2
  head.writeUInt32BE(16 + body.length + 4, 12) // (the length's upper four bytes stay 0)
  return new Uint8Array(Buffer.concat([Buffer.from(m.header ?? []), head, body, Buffer.from(END)]))
}
