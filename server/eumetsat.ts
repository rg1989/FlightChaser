// server/eumetsat.ts
// GET /api/wx/sat?bbox=south,west,north,east&n=400[&have=<a frame's time, ms>]: the weather satellite's newest frame over a box, as
// numbers (shared/sat.ts), cut out of the satellite's raw products: the route the chase's weather prefers to the keyless pictures
// (client/scene/satellite.ts). The products are EUMETSAT's, from its Data Store (api.eumetsat.int), which gives them to anyone with
// a free account's key and secret (EUMETSAT_KEY and EUMETSAT_SECRET: .env.example). Without them the server has no such route
// (404), and the page keeps to the pictures.
// The two products, of Meteosat at 0° (SEVIRI), a frame every 15 minutes, each a zip of about 0.5 MB holding one GRIB 2 file
// (grib2.ts says what that is), in the Data Store 13.5 to 14.5 minutes after the frame's time (24 products watched, 2026-10-04):
// - EO:EUM:DAT:MSG:CLM, the cloud mask: for each of the 3,712 × 3,712 pixels, clear over water, clear over land, cloud, or no data;
// - EO:EUM:DAT:MSG:CTH, the cloud top height: for each block of three pixels by three with enough cloud in it, the height of its
//   highest cloud, a number of 320 m steps (1 to 47 seen: 320 m to 15,040 m), and a quality flag. The height is the cloud top's
//   pressure read as a height in the ICAO standard atmosphere (EUM/MSG/SPE/022 v5B, §10.3.2.2). So the raw heights are the same
//   320 m steps the pictures' fifty colours stand for: what the raw route adds is that none is misread from a colour, the frame
//   8 to 16 minutes sooner (EUMETView has it 22 to 30 minutes after its time), and the quality flag.
// What is asked of EUMETSAT, and how seldom:
// - the newest products of the two collections (a search each: no key needed): only when a page asks for a frame, only once a
//   newer frame than the one held can be there (13 minutes after its own time), and then at most once a minute;
// - a token (the key and the secret, to the token's address only): when a product is to be downloaded and the token held runs out
//   within a minute. A token is good for about 53 minutes;
// - the two products of a frame, once, with the token. The frame is the newest that both collections list (they are published some
//   20 s apart).
// The frame is kept decoded in memory (18 MB), the last two of them; every box asked for is cut out of it (geos.ts: each cell
// takes the pixel its middle falls in). Nothing is written to disk: the licence does not let the original data be passed on.
// A failure (EUMETSAT down, an answer that is no product, a product in another grid) is a 502 that says what failed; for a minute
// after it nothing is asked and the answer is a 503 with the seconds to wait. A key that is refused is not tried again for half an
// hour. The page falls back to the pictures on any of them. One warning for a whole outage. The key, the secret and the token are
// never logged, never in a URL, never in an answer.
// ponytail: only the satellite at 0°; the frame is decoded on the server's one thread (0.1 s, four times an hour); the quality flag
// is read and not sent. Upgrade: the Indian Ocean satellite's products (CLM-IODC, CTH-IODC: the same files, 45.5° E, a better angle
// on Israel) picked by the box; a worker thread; a fourth plane in shared/sat.ts.
import { encodeSatCut, type SatCut } from '../shared/sat.ts'
import { GEOS, SEVIRI, seviriLattice } from './geos.ts'
import { readGrib2, type GribField, type GribMessage, type GribSpaceView } from './grib2.ts'
import { readZip } from './typeDb.ts'
import { WxError } from './wx.ts'

const API = 'https://api.eumetsat.int'
const HOST = new URL(API).hostname
const USER_AGENT = 'FlightHopper/0.1' // (no contact of the user's: the key says who asks)
/** The Data Store's collections of the two products. */
export const SAT_PRODUCTS = { mask: 'EO:EUM:DAT:MSG:CLM', top: 'EO:EUM:DAT:MSG:CTH' } as const
/** What is kept, and what EUMETSAT may be asked: see the header. */
export const SAT_LIMITS = {
  frameMs: 15 * 60_000, // a frame every 15 minutes
  soonestMs: 13 * 60_000, // a frame's products are in the Data Store no sooner than this after its time
  searchGapMs: 60_000, // at least this between two searches for a newer frame
  failureMs: 60_000, // after a failure nothing is asked for this long
  refusedMs: 30 * 60_000, // and for this long after the key was refused
  tokenSpareMs: 60_000, // a token is not used in its last minute
  frames: 2, // frames kept
  maxBytes: 16 * 1024 * 1024, // a product's zip is 0.5 MB: anything over this is no product
  timeoutMs: 30_000,
} as const
const MASK = { cloud: 2, none: 3 } as const // code table 4.217: 0 clear over water, 1 clear over land, 2 cloud, 3 no data
const SCAN = 0xc0 // the first point in the south-east, a row to the west, the rows to the north: SEVIRI's order
const NR = GEOS.hKm / 6378.14 // the camera's distance as the products write it: 6.6107 Earth radii
const MIN_N = 2
const MAX_N = 512
const MAX_LAT_SPAN = 20 // degrees: the page's box is 9° of latitude, and up to 45° of longitude near the poles
const MAX_LON_SPAN = 60
const PRODUCT_ID = /^[A-Za-z0-9._-]{8,200}$/

/** A frame of the satellite as its two products give it, in SEVIRI's own grid and order (geos.ts). */
export interface RawFrame {
  timeMs: number // the frame's own time
  subLon: number // the satellite's longitude
  mask: Uint8Array // a pixel's class: 3,712 × 3,712
  top: Uint8Array | Uint16Array // a block's height as its number: 1,237 × 1,237
  topHas: Uint8Array | null // 1 where a block has a height; null: every block
  topOffsetM: number // a height is topOffsetM + number × topStepM
  topStepM: number
  quality: Uint8Array | Uint16Array | null // a block's quality flags: bit 0 "fog in the block", bit 1 "height of poor quality" (code table 4.219); null: the product has none
  bytes: number // the two zips as downloaded
  decodeMs: number // how long they took to unzip and read
}

/** bbox=south,west,north,east (east may run past 180) and n, the cells a side, as asked; a WxError (400) saying why not. */
export function satQuery(bbox: string | null, n: string | null): { box: [south: number, west: number, north: number, east: number]; n: number } {
  const v = (bbox ?? '').split(',').map((x) => (x.trim() === '' ? Number.NaN : Number(x)))
  if (v.length !== 4 || !v.every(Number.isFinite)) throw new WxError('bbox must be south,west,north,east', 400)
  const [south, west, north, east] = v
  if (south < -90 || north > 90 || south >= north || west >= east || west < -180 || east > 360) throw new WxError('bbox out of range', 400)
  if (north - south > MAX_LAT_SPAN || east - west > MAX_LON_SPAN) throw new WxError(`bbox over ${MAX_LAT_SPAN}° of latitude or ${MAX_LON_SPAN}° of longitude`, 400)
  const cells = n === null || n.trim() === '' ? Number.NaN : Number(n)
  if (!Number.isInteger(cells) || cells < MIN_N || cells > MAX_N) throw new WxError(`n must be a whole number from ${MIN_N} to ${MAX_N}`, 400)
  return { box: [south, west, north, east], n: cells }
}

/** A product's GRIB message out of its zip (the Data Store's package: the .grb file, EOPMetadata.xml, manifest.xml). */
async function messageOf(zip: Uint8Array, what: string): Promise<GribMessage> {
  const files = await readZip(zip)
  const name = [...files.keys()].find((k) => k.endsWith('.grb'))
  if (name === undefined) throw new Error(`the ${what}'s zip holds no .grb file`)
  return readGrib2(files.get(name)!)
}

/** Whether a grid is SEVIRI's whole picture in pixels (or blocks) of `side` a side, the point under the satellite the middle of pixel (block) `mid` counted from 1. */
const isSeviri = (g: GribSpaceView, side: number, mid: number): boolean =>
  g.nx === side && g.ny === side && g.xp === mid && g.yp === mid && g.scan === SCAN && g.subLat === 0 && Math.abs(g.nr - NR) < 0.01

/**
 * A frame read from its two products' zips. Throws when they are not SEVIRI's cloud mask and cloud top height of one frame:
 * no GRIB file, another parameter, another grid (geos.ts places SEVIRI's pixels only), two frames' times.
 */
export async function decodeProducts(maskZip: Uint8Array, topZip: Uint8Array): Promise<RawFrame> {
  const t0 = performance.now()
  const [m, t] = await Promise.all([messageOf(maskZip, 'cloud mask'), messageOf(topZip, 'cloud top height')])
  const field = (msg: GribMessage, category: number, parameter: number): GribField | undefined => (msg.discipline === 3 ? msg.fields.find((f) => f.category === category && f.parameter === parameter) : undefined)
  const mask = field(m, 0, 7)
  if (mask === undefined) throw new Error('the product holds no cloud mask')
  const top = field(t, 1, 2)
  if (top === undefined) throw new Error('the product holds no cloud top height')
  const said = (g: GribSpaceView): string => `${g.nx} × ${g.ny}, the point under the satellite at ${g.xp}, ${g.yp}`
  if (!isSeviri(mask.grid, SEVIRI.n, SEVIRI.mid + 1)) throw new Error(`the cloud mask is in another grid than SEVIRI's (${said(mask.grid)})`)
  // A block is three pixels: block 619 of 1,237 (from 1) is pixels 1855 to 1857, its middle the pixel under the satellite.
  if (!isSeviri(top.grid, SEVIRI.blocks, (SEVIRI.mid + 2) / SEVIRI.block) || top.grid.subLon !== mask.grid.subLon) throw new Error(`the cloud top height is in another grid than SEVIRI's blocks (${said(top.grid)})`)
  if (m.timeMs !== t.timeMs) throw new Error(`the two products are of different frames (${new Date(m.timeMs).toISOString()}, ${new Date(t.timeMs).toISOString()})`)
  const pixels = mask.packed instanceof Uint8Array ? mask.packed : Uint8Array.from(mask.packed)
  if (mask.present !== null) for (let i = 0; i < pixels.length; i++) if (mask.present[i] === 0) pixels[i] = MASK.none
  return {
    timeMs: m.timeMs, subLon: mask.grid.subLon, mask: pixels,
    top: top.packed, topHas: top.present, topOffsetM: top.offset, topStepM: top.step,
    quality: field(t, 1, 3)?.packed ?? null,
    bytes: maskZip.length + topZip.length, decodeMs: performance.now() - t0,
  }
}

/**
 * The frame over a box: n × n cells, row by row from the north-west. A cell takes the pixel its middle falls in: cloud (255) where
 * that pixel is cloud, seen where it has data, and the top of the pixel's block where the block has one (whatever the pixel's own
 * class: a block has a height when enough of its nine pixels are cloud).
 */
export function cutFrame(f: RawFrame, box: readonly [south: number, west: number, north: number, east: number], n: number): SatCut {
  const pixels = seviriLattice(box, n, f.subLon)
  const cloud = new Uint8Array(n * n)
  const seen = new Uint8Array(n * n)
  const topM = new Uint16Array(n * n)
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i]
    if (p < 0 || f.mask[p] === MASK.none) continue
    seen[i] = 1
    if (f.mask[p] === MASK.cloud) cloud[i] = 255
    const row = Math.floor(p / SEVIRI.n)
    const blockRow = Math.floor(row / SEVIRI.block)
    const blockCol = Math.floor((p - row * SEVIRI.n) / SEVIRI.block)
    if (blockRow >= SEVIRI.blocks || blockCol >= SEVIRI.blocks) continue // (the picture's last pixel each way is in no block)
    const b = blockRow * SEVIRI.blocks + blockCol
    if (f.topHas !== null && f.topHas[b] === 0) continue
    topM[i] = Math.min(65_535, Math.max(0, Math.round(f.topOffsetM + f.top[b] * f.topStepM)))
  }
  return { timeMs: f.timeMs, box, n, cloud, seen, topM }
}

/** What an ask is answered with: the frame cut out, as the bytes to send, and what it cost. */
export interface SatAnswer {
  bytes: Uint8Array<ArrayBuffer>
  timeMs: number // the frame's time
  decodeMs: number // the frame's two products unzipped and read (once for the frame)
  cutMs: number // this box cut out of it
}

/** A request to EUMETSAT that failed: what is said of it, and how long nothing is asked after it. */
class Failed extends Error {
  readonly waitMs: number
  constructor(message: string, waitMs: number = SAT_LIMITS.failureMs) {
    super(message)
    this.waitMs = waitMs
  }
}

export function makeEumetsat(o: { key: string; secret: string; fetchFn?: typeof fetch; nowMs?: () => number; warn?: (message: string) => void }) {
  const fetchFn = o.fetchFn ?? fetch
  const nowMs = o.nowMs ?? Date.now
  const warn = o.warn ?? ((message: string) => console.warn(message))
  const frames: RawFrame[] = [] // the newest first
  let token: { value: string; untilMs: number } | null = null
  let searchedMs = -Infinity
  let failedUntilMs = 0
  let down = false // the last round of requests failed: its warning is given
  let pending: Promise<void> | null = null // the round of requests under way: asks that come meanwhile wait for it

  const ask = (url: string, init: RequestInit = {}): Promise<Response> =>
    fetchFn(url, { ...init, headers: { 'user-agent': USER_AGENT, ...(init.headers as Record<string, string> | undefined) }, signal: AbortSignal.timeout(SAT_LIMITS.timeoutMs) })

  /** The token held, or a new one for the key and the secret. */
  async function bearer(): Promise<string> {
    if (token !== null && nowMs() < token.untilMs) return token.value
    token = null
    const r = await ask(`${API}/token`, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`${o.key}:${o.secret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (r.status === 400 || r.status === 401) throw new Failed(`${HOST}: the key was refused (HTTP ${r.status}): check EUMETSAT_KEY and EUMETSAT_SECRET`, SAT_LIMITS.refusedMs)
    if (!r.ok) throw new Failed(`${HOST}: HTTP ${r.status}`)
    const j = (await r.json()) as { access_token?: unknown; expires_in?: unknown }
    if (typeof j.access_token !== 'string' || j.access_token === '' || typeof j.expires_in !== 'number') throw new Failed(`${HOST}: no token in the answer`)
    token = { value: j.access_token, untilMs: nowMs() + j.expires_in * 1000 - SAT_LIMITS.tokenSpareMs }
    return token.value
  }

  /** The newest two products a collection lists, each with its frame's time. */
  async function listed(collection: string): Promise<{ id: string; timeMs: number }[]> {
    const r = await ask(`${API}/data/search-products/1.0.0/os?format=json&pi=${encodeURIComponent(collection)}&si=0&c=2&sort=start,time,0`)
    if (!r.ok) throw new Failed(`${HOST}: HTTP ${r.status}`)
    const features = ((await r.json()) as { features?: unknown }).features
    const out: { id: string; timeMs: number }[] = []
    for (const f of Array.isArray(features) ? (features as { id?: unknown; properties?: { date?: unknown } }[]) : []) {
      const date = f?.properties?.date // "2026-10-04T10:30:00Z/2026-10-04T10:30:00Z"
      const timeMs = typeof date === 'string' ? Date.parse(date.split('/')[0]) : Number.NaN
      if (typeof f?.id === 'string' && PRODUCT_ID.test(f.id) && Number.isFinite(timeMs)) out.push({ id: f.id, timeMs })
    }
    return out
  }

  async function download(collection: string, id: string, withToken: string): Promise<Uint8Array> {
    const r = await ask(`${API}/data/download/1.0.0/collections/${encodeURIComponent(collection)}/products/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${withToken}` } })
    if (r.status === 401) token = null // the token is no longer good: the next try takes a new one
    if (!r.ok) throw new Failed(`${HOST}: HTTP ${r.status}`)
    if (Number(r.headers.get('content-length') ?? 0) > SAT_LIMITS.maxBytes) throw new Failed(`${HOST}: an answer too large for a product`)
    const body = new Uint8Array(await r.arrayBuffer())
    if (body.length > SAT_LIMITS.maxBytes) throw new Failed(`${HOST}: an answer too large for a product`)
    return body
  }

  /** One round: the collections searched, and the newest frame that both list downloaded and read if it is newer than the one held. */
  async function round(): Promise<void> {
    searchedMs = nowMs()
    const [masks, tops] = await Promise.all([listed(SAT_PRODUCTS.mask), listed(SAT_PRODUCTS.top)])
    const mask = masks.filter((m) => tops.some((t) => t.timeMs === m.timeMs)).sort((a, b) => b.timeMs - a.timeMs)[0]
    if (mask === undefined) throw new Failed(`${HOST}: no frame that both products are listed for`)
    if (frames.length > 0 && mask.timeMs <= frames[0].timeMs) return // the frame held is still the newest
    const top = tops.find((t) => t.timeMs === mask.timeMs)!
    const withToken = await bearer()
    const [maskZip, topZip] = await Promise.all([download(SAT_PRODUCTS.mask, mask.id, withToken), download(SAT_PRODUCTS.top, top.id, withToken)])
    const frame = await decodeProducts(maskZip, topZip)
    if (frame.timeMs !== mask.timeMs) throw new Failed(`${HOST}: a product of another frame than the one listed`)
    frames.unshift(frame)
    frames.length = Math.min(frames.length, SAT_LIMITS.frames)
  }

  /** The newest frame: the one held while no newer one can be there, else after a round of requests. */
  async function newest(): Promise<RawFrame> {
    const now = nowMs()
    const due = frames.length === 0 || now >= frames[0].timeMs + SAT_LIMITS.frameMs + SAT_LIMITS.soonestMs
    if (pending === null && due) {
      if (now < failedUntilMs) {
        const s = Math.ceil((failedUntilMs - now) / 1000)
        throw new WxError(`${HOST}: the last request failed; not asked again for ${s} s`, 503, s)
      }
      if (now - searchedMs >= SAT_LIMITS.searchGapMs) {
        pending = round()
          .then(() => void (down = false))
          .catch((e: unknown) => {
            const message = e instanceof Failed ? e.message : `${HOST}: ${(e as Error).message}`
            failedUntilMs = nowMs() + (e instanceof Failed ? e.waitMs : SAT_LIMITS.failureMs)
            if (!down) warn(`sat: ${message}; the pages keep to EUMETView's pictures meanwhile`)
            down = true
            throw new WxError(message, 502)
          })
          .finally(() => void (pending = null))
      }
    }
    if (pending !== null) await pending
    if (frames.length === 0) throw new WxError(`${HOST}: no frame held yet`, 503, Math.ceil(SAT_LIMITS.searchGapMs / 1000))
    return frames[0]
  }

  return {
    /**
     * The newest frame cut out over a box; null when it is the frame the asker has (`have`: its time). A WxError: 400 for a bad
     * box, size or time; 502 when EUMETSAT failed just now; 503 with the seconds to wait while a failure is remembered.
     */
    async cut(bbox: string | null, n: string | null, have: string | null): Promise<SatAnswer | null> {
      const q = satQuery(bbox, n)
      const had = have === null || have.trim() === '' ? null : Number(have)
      if (had !== null && !Number.isFinite(had)) throw new WxError('have must be a frame\'s time in ms', 400)
      const frame = await newest()
      if (had === frame.timeMs) return null
      const t0 = performance.now()
      const bytes = encodeSatCut(cutFrame(frame, q.box, q.n))
      return { bytes, timeMs: frame.timeMs, decodeMs: frame.decodeMs, cutMs: performance.now() - t0 }
    },
    /** The times of the frames held, the newest first (for tests). */
    held: (): number[] => frames.map((f) => f.timeMs),
  }
}
