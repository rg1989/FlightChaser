// shared/sat.ts
// A frame of the weather satellite over a box, as the server cuts it out of the satellite's raw products (server/eumetsat.ts, GET
// /api/wx/sat) and the chase's weather reads it (client/scene/satellite.ts): the numbers the keyless route reads back from two
// pictures' colours, sent as they are. Bytes, not JSON: 640 KB for 400 × 400 cells (34 to 48 KB gzipped, in three real skies), which the page has
// nothing to parse of: the three planes are read where they lie in the answer. All numbers little-endian:
//    0  "FHS1"                     the format
//    4  n, uint32                  cells a side
//    8  the frame's time, float64  ms since 1970
//   16  the box, 4 × float64       south, west, north, east, degrees
//   48  cloud, n × n bytes         row by row from the north-west corner: how much of the cell is cloud, 0 … 255
//       seen, n × n bytes          1 where the product says anything, 0 where it is not processed or the satellite does not see
//       topM, n × n uint16         the highest cloud's top, metres; 0 where none is given

/** The frame over a box: n × n cells, row by row from the north-west corner (a cell's middle stands half a cell in). */
export interface SatCut {
  timeMs: number // the frame's own time
  box: readonly [south: number, west: number, north: number, east: number]
  n: number
  cloud: Uint8Array
  seen: Uint8Array
  topM: Uint16Array
}

const NAME = [0x46, 0x48, 0x53, 0x31] // "FHS1"
const HEAD = 48
const MAX_N = 4096
const LITTLE = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1 // this machine writes a number's low byte first, as the format does

/** The frame as the bytes sent. */
export function encodeSatCut(c: SatCut): Uint8Array<ArrayBuffer> {
  const cells = c.n * c.n
  const out = new Uint8Array(HEAD + 4 * cells)
  const dv = new DataView(out.buffer)
  out.set(NAME, 0)
  dv.setUint32(4, c.n, true)
  dv.setFloat64(8, c.timeMs, true)
  c.box.forEach((v, i) => dv.setFloat64(16 + 8 * i, v, true))
  out.set(c.cloud.subarray(0, cells), HEAD)
  out.set(c.seen.subarray(0, cells), HEAD + cells)
  for (let i = 0, at = HEAD + 2 * cells; i < cells; i++, at += 2) dv.setUint16(at, c.topM[i], true)
  return out
}

/** The frame of an answer's bytes, its planes read where they lie; null for bytes that are no frame. */
export function decodeSatCut(bytes: ArrayBuffer): SatCut | null {
  if (bytes.byteLength < HEAD) return null
  const head = new Uint8Array(bytes, 0, 4)
  const dv = new DataView(bytes)
  const n = dv.getUint32(4, true)
  const cells = n * n
  if (!NAME.every((b, i) => head[i] === b) || n < 1 || n > MAX_N || bytes.byteLength !== HEAD + 4 * cells) return null
  const timeMs = dv.getFloat64(8, true)
  const box = [dv.getFloat64(16, true), dv.getFloat64(24, true), dv.getFloat64(32, true), dv.getFloat64(40, true)] as const
  if (!Number.isFinite(timeMs) || !box.every(Number.isFinite)) return null
  const at = HEAD + 2 * cells // even: a uint16 may start there
  let topM: Uint16Array
  if (LITTLE) topM = new Uint16Array(bytes, at, cells)
  else {
    topM = new Uint16Array(cells)
    for (let i = 0; i < cells; i++) topM[i] = dv.getUint16(at + 2 * i, true)
  }
  return { timeMs, box, n, cloud: new Uint8Array(bytes, HEAD, cells), seen: new Uint8Array(bytes, HEAD + cells, cells), topM }
}
