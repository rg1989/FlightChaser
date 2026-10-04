// .planning/tools/sat-compare.ts
// The satellite's frame by its two routes, compared over one box: the numbers the app's server cuts out of EUMETSAT's raw products
// (GET /api/wx/sat: it needs a server running with EUMETSAT_KEY and EUMETSAT_SECRET) against what the page reads back from
// EUMETView's two pictures of the same frame (client/scene/satellite.ts decodeFrame). Run on the QA machine, in the tree:
//   node .planning/tools/sat-compare.ts <the server, e.g. http://127.0.0.1:8798> <lat> <lon> <out dir> [<raw answer saved before> | -] [<lat> <lon> of a weather field's middle]
// It prints how the masks agree (also with the raw grid moved a cell each way: the two services place the pixels half a satellite
// pixel apart), a table of raw height less picture height over the cells where both have one, and writes four plans as PNGs
// (raw-mask, raw-tops, view-mask, view-tops: the masks white, green, blue as EUMETView colours them, the tops in the pictures' own
// colours) and the raw answer (raw.bin), so that the pictures can be asked for later (EUMETView has a frame 2 to 9 minutes after
// the Data Store) with the raw answer given as the fifth argument. With a field's middle (sat-probe.js state() says it) the four plans
// are also written cut to the field's 320 km square, 128 cells a side (-square.png), to lay beside the field's own plans.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'
import { SAT_LAYER, SAT_N, SAT_STEP_M, SAT_TOPS, decodeFrame, satBox, satMapUrl, type SatFrame } from '../../client/scene/satellite.ts'
import { decodeSatCut } from '../../shared/sat.ts'

const [api, latArg, lonArg, out, savedArg, midLat, midLon] = process.argv.slice(2)
const saved = savedArg === '-' ? undefined : savedArg
if (out === undefined) throw new Error('usage: sat-compare.ts <server> <lat> <lon> <out dir> [<raw.bin>]')
mkdirSync(out, { recursive: true })
const box = satBox(Number(latArg), Number(lonArg))
const n = SAT_N

/** A PNG's pixels as RGBA (8 bits a channel, not interlaced: RGBA, RGB or a palette). */
function readPng(buf: Buffer): Uint8ClampedArray {
  let [o, w, h, type] = [8, 0, 0, 0]
  let plte: Buffer | null = null
  let trns: Buffer | null = null
  const idat: Buffer[] = []
  while (o < buf.length) {
    const len = buf.readUInt32BE(o)
    const kind = buf.toString('latin1', o + 4, o + 8)
    const body = buf.subarray(o + 8, o + 8 + len)
    if (kind === 'IHDR') [w, h, type] = [body.readUInt32BE(0), body.readUInt32BE(4), body[9]]
    else if (kind === 'PLTE') plte = body
    else if (kind === 'tRNS') trns = body
    else if (kind === 'IDAT') idat.push(body)
    o += 12 + len
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 1
  const raw = inflateSync(Buffer.concat(idat))
  const line = w * bpp
  const px = new Uint8Array(h * line)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (line + 1)]
    for (let x = 0; x < line; x++) {
      const a = x >= bpp ? px[y * line + x - bpp] : 0
      const b = y > 0 ? px[(y - 1) * line + x] : 0
      const c = x >= bpp && y > 0 ? px[(y - 1) * line + x - bpp] : 0
      const pa = Math.abs(b - c)
      const pb = Math.abs(a - c)
      const pc = Math.abs(a + b - 2 * c)
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      px[y * line + x] = (raw[y * (line + 1) + 1 + x] + pred) & 255
    }
  }
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    if (type === 6) rgba.set(px.subarray(4 * p, 4 * p + 4), 4 * p)
    else if (type === 2) rgba.set([px[3 * p], px[3 * p + 1], px[3 * p + 2], 255], 4 * p)
    else rgba.set([plte![3 * px[p]], plte![3 * px[p] + 1], plte![3 * px[p] + 2], trns !== null && px[p] < trns.length ? trns[px[p]] : 255], 4 * p)
  }
  return rgba
}

/** A square picture of `side` pixels as a PNG file (RGB): each pixel's colour by its column and row. */
function writePng(file: string, side: number, rgb: (x: number, y: number) => readonly [number, number, number]): void {
  const raw = Buffer.alloc(side * (1 + 3 * side))
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) raw.set(rgb(x, y), y * (1 + 3 * side) + 1 + 3 * x)
  const chunk = (kind: string, body: Buffer): Buffer => {
    const b = Buffer.alloc(12 + body.length)
    b.writeUInt32BE(body.length, 0)
    b.write(kind, 4, 'latin1')
    body.copy(b, 8)
    let crc = ~0
    for (let i = 4; i < 8 + body.length; i++) {
      crc ^= b[i]
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
    b.writeUInt32BE(~crc >>> 0, 8 + body.length)
    return b
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(side, 0)
  head.writeUInt32BE(side, 4)
  head.set([8, 2, 0, 0, 0], 8)
  writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
}

const DARK = [14, 18, 28] as const
const maskRgb = (f: SatFrame, c: number): readonly [number, number, number] => (f.seen[c] === 0 ? DARK : f.cloud[c] >= 128 ? [250, 250, 250] : [38, 58, 44])
const topRgb = (f: SatFrame, c: number): readonly [number, number, number] => (f.topM[c] === 0 ? DARK : SAT_TOPS[Math.min(SAT_TOPS.length, Math.round(f.topM[c] / SAT_STEP_M)) - 1])
const SQUARE_N = 128 // the field's square in cells of 2.5 km
/** The frame's cell at a place of the field's square: x cells east of its west edge, y south of its north edge. */
const squareCell = (x: number, y: number): number => {
  const lat = Number(midLat) + ((SQUARE_N / 2 - y - 0.5) * 2.5) / 111.195
  const lon = Number(midLon) + ((x + 0.5 - SQUARE_N / 2) * 2.5) / (111.195 * Math.cos((Number(midLat) * Math.PI) / 180))
  const [i, j] = [Math.floor(((lon - box[1]) / (box[3] - box[1])) * n), Math.floor(((box[2] - lat) / (box[2] - box[0])) * n)]
  return i < 0 || j < 0 || i >= n || j >= n ? -1 : j * n + i
}
const plans = (name: string, f: SatFrame): void => {
  writePng(`${out}/${name}-mask.png`, n, (x, y) => maskRgb(f, y * n + x))
  writePng(`${out}/${name}-tops.png`, n, (x, y) => topRgb(f, y * n + x))
  if (midLon === undefined) return
  writePng(`${out}/${name}-mask-square.png`, SQUARE_N, (x, y) => (squareCell(x, y) < 0 ? DARK : maskRgb(f, squareCell(x, y))))
  writePng(`${out}/${name}-tops-square.png`, SQUARE_N, (x, y) => (squareCell(x, y) < 0 ? DARK : topRgb(f, squareCell(x, y))))
}

// ---- the raw route ----
let rawBytes: ArrayBuffer
if (saved !== undefined) rawBytes = new Uint8Array(readFileSync(saved)).buffer
else {
  const t0 = performance.now()
  const r = await fetch(`${api}/api/wx/sat?bbox=${box.join(',')}&n=${n}`)
  if (r.status !== 200) throw new Error(`the server answered ${r.status}: ${await r.text()}`)
  rawBytes = await r.arrayBuffer()
  console.log(`raw route: HTTP 200 in ${(performance.now() - t0).toFixed(0)} ms, ${r.headers.get('content-length')} bytes as sent (${r.headers.get('content-encoding') ?? 'not zipped'}), ${rawBytes.byteLength} unzipped; Server-Timing: ${r.headers.get('server-timing')}`)
  writeFileSync(`${out}/raw.bin`, new Uint8Array(rawBytes))
}
const raw = decodeSatCut(rawBytes)
if (raw === null) throw new Error('the server\'s answer is no frame')
const time = new Date(raw.timeMs).toISOString()
console.log(`frame ${time}, box ${box.join(', ')}, ${n} × ${n} cells`)
plans('raw', raw)

// ---- the pictures of the same frame ----
const picture = async (layer: string): Promise<{ rgba: Uint8ClampedArray; bytes: number } | null> => {
  const r = await fetch(satMapUrl(layer, box, n, raw.timeMs))
  const body = Buffer.from(await r.arrayBuffer())
  if (!(r.headers.get('content-type') ?? '').startsWith('image/png')) return null
  return { rgba: readPng(body), bytes: body.length }
}
const [mask, tops] = [await picture(SAT_LAYER.mask), await picture(SAT_LAYER.top)]
if (mask === null || tops === null) {
  console.log(`EUMETView has no picture of the ${time} frame yet: run again later with ${out}/raw.bin as the fifth argument`)
  process.exit(2)
}
console.log(`pictures: ${mask.bytes + tops.bytes} bytes as sent`)
const t1 = performance.now()
const view = decodeFrame({ timeMs: raw.timeMs, box, n, mask: mask.rgba, tops: tops.rgba })
if (view === null) throw new Error('the pictures are in colours not known')
console.log(`the pictures' colours read in ${(performance.now() - t1).toFixed(1)} ms`)
plans('view', view)

// ---- the masks ----
const cloudy = (f: SatFrame, c: number): boolean => f.cloud[c] >= 128
const share = (dx: number, dy: number): number => {
  let [same, all] = [0, 0]
  for (let y = 2; y < n - 2; y++) {
    for (let x = 2; x < n - 2; x++) {
      const [a, b] = [y * n + x, (y + dy) * n + x + dx]
      if (raw.seen[b] === 0 || view.seen[a] === 0) continue
      all++
      if (cloudy(raw, b) === cloudy(view, a)) same++
    }
  }
  return same / all
}
const count = (f: SatFrame): string => {
  let [c, s, t] = [0, 0, 0]
  for (let i = 0; i < n * n; i++) {
    if (f.seen[i] === 1) s++
    if (f.seen[i] === 1 && cloudy(f, i)) c++
    if (f.topM[i] > 0) t++
  }
  return `seen ${s}, cloud ${c} (${((100 * c) / Math.max(1, s)).toFixed(1)} %), a top in ${t}`
}
/** How well a route's heights lie on its own mask: the cells that are cloud with no height, and those with a height that are clear. */
const apartOf = (f: SatFrame): string => {
  let [bare, over, seen] = [0, 0, 0]
  for (let i = 0; i < n * n; i++) {
    if (f.seen[i] === 0) continue
    seen++
    if (cloudy(f, i) && f.topM[i] === 0) bare++
    if (!cloudy(f, i) && f.topM[i] > 0) over++
  }
  return `cloud with no height ${bare}, a height where it is clear ${over}: ${((100 * (bare + over)) / Math.max(1, seen)).toFixed(2)} % of the cells seen`
}
console.log(`raw:      ${count(raw)}; ${apartOf(raw)}`)
console.log(`pictures: ${count(view)}; ${apartOf(view)}`)
console.log(`the masks agree (cloud or clear) on ${(100 * share(0, 0)).toFixed(2)} % of the cells both see`)
console.log('with the raw grid moved by cells (2.5 km each; columns: 1 west, 0, 1 east; rows: 1 north, 0, 1 south):')
for (const dy of [-1, 0, 1]) console.log(`  ${[-1, 0, 1].map((dx) => `${(100 * share(dx, dy)).toFixed(2)} %`).join('  ')}`)

// ---- the heights ----
const diff = new Map<number, number>()
let [both, rawOnly, viewOnly, equal] = [0, 0, 0, 0]
const levels = new Map<number, number>()
for (let i = 0; i < n * n; i++) {
  const [a, b] = [raw.topM[i], view.topM[i]]
  if (a > 0) levels.set(a, (levels.get(a) ?? 0) + 1)
  if (a > 0 && b > 0) {
    both++
    if (a === b) equal++
    diff.set(a - b, (diff.get(a - b) ?? 0) + 1)
  } else if (a > 0) rawOnly++
  else if (b > 0) viewOnly++
}
console.log(`heights: both routes give one in ${both} cells; the same height in ${equal} (${((100 * equal) / Math.max(1, both)).toFixed(2)} %); only raw ${rawOnly}, only the pictures ${viewOnly}`)
console.log('raw height less picture height, m: cells')
for (const d of [...diff.keys()].sort((x, y) => x - y)) console.log(`  ${String(d).padStart(7)}: ${String(diff.get(d)).padStart(7)}  ${((100 * diff.get(d)!) / both).toFixed(2)} %`)
// The same with the raw grid moved to where the masks agree best: what is left is not the place.
let best = [0, 0]
for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) if (share(dx, dy) > share(best[0], best[1])) best = [dx, dy]
let [movedBoth, movedEqual, movedNear] = [0, 0, 0]
for (let y = 2; y < n - 2; y++) {
  for (let x = 2; x < n - 2; x++) {
    const [a, b] = [raw.topM[(y + best[1]) * n + x + best[0]], view.topM[y * n + x]]
    if (a === 0 || b === 0) continue
    movedBoth++
    if (a === b) movedEqual++
    if (Math.abs(a - b) <= SAT_STEP_M) movedNear++
  }
}
console.log(`with the raw grid moved by ${best[0]}, ${best[1]} cells (where the masks agree best): the same height in ${((100 * movedEqual) / Math.max(1, movedBoth)).toFixed(2)} % of ${movedBoth} cells, within one step in ${((100 * movedNear) / Math.max(1, movedBoth)).toFixed(2)} %`)
// Whatever the place: how many cells stand at each height, by each route.
const viewLevels = new Map<number, number>()
for (let i = 0; i < n * n; i++) if (view.topM[i] > 0) viewLevels.set(view.topM[i], (viewLevels.get(view.topM[i]) ?? 0) + 1)
console.log('cells at each height, m: raw | pictures')
let apart = 0
for (const m of [...new Set([...levels.keys(), ...viewLevels.keys()])].sort((x, y) => x - y)) {
  apart += Math.abs((levels.get(m) ?? 0) - (viewLevels.get(m) ?? 0))
  console.log(`  ${String(m).padStart(6)}: ${String(levels.get(m) ?? 0).padStart(6)} | ${String(viewLevels.get(m) ?? 0).padStart(6)}`)
}
console.log(`the two counts differ by ${apart} cells in all (${((100 * apart) / Math.max(1, both + rawOnly + viewOnly)).toFixed(2)} % of the cells with a height)`)
const offStep = [...levels.keys()].filter((m) => m % SAT_STEP_M !== 0)
console.log(`raw heights: ${levels.size} different values from ${Math.min(...levels.keys())} to ${Math.max(...levels.keys())} m; not a multiple of ${SAT_STEP_M} m: ${offStep.length}`)
writeFileSync(`${out}/compare.json`, JSON.stringify({ time, box, both, equal, rawOnly, viewOnly, agree: share(0, 0), diff: Object.fromEntries(diff) }, null, 1))
