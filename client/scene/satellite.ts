// client/scene/satellite.ts
// Where the cloud really is, and how high its top: the weather satellite's own products, for the chase's weather (weather3d.ts).
// The source is EUMETSAT's EUMETView, a GeoServer (WMS 1.3.0, no key; it answers with `access-control-allow-origin: *`, so the
// page fetches it itself, as it does RainViewer's radar tiles), and of it two layers of Meteosat at 0°, a frame every 15 minutes,
// the newest about 20 minutes old:
// - msg_fes:clm, the cloud mask: each pixel clear over water, clear over land, cloud, or not processed (off the Earth's disc);
// - msg_fes:cth, the cloud top height: the height of the highest cloud, in blocks of three pixels by three.
// Both come as pictures. Checked by hand on 2026-10-04: the layers' styles (GetStyles) hold no colour map ("RGB with custom legend":
// the pictures are coloured before the server has them, and `styles=raster` gives the same picture), so the numbers are read back
// from the colours:
// - the mask is blue (0, 0, 255), green (0, 192, 0) or white, and has no alpha where it is not processed. A picture asked for
//   coarser than the satellite's own pixels comes blended: a pixel's share of white is its share of cloud;
// - a height is one of fifty colours, 320 m apart from 320 m to 16,000 m (SAT_TOPS), and no alpha is no height. The legend
//   (GetLegendGraphic, kept in data/fixtures/eumetview) labels the bar 320 to 16,000 m and draws straight blends between eight key
//   colours; the pictures hold exactly as many colours between two key colours as there are steps of 320 m between their heights
//   (counted in two pictures of 1.5 million pixels each, over Europe and over the tropics; which colour neighbours which says their
//   order). Forty-seven of the fifty were seen: no cloud stood over 15,040 m, and the three greys above it are the ramp carried on.
// A frame whose colours are others than these (more than STRANGE of a picture's pixels) is not used: the style has changed.
// The pictures of one frame are held (SatelliteSource), as they came (RGBA bytes: reading 160,000 pixels' colours takes 4 to 12 ms,
// so the weather's gatherer does it, off the main thread: wxGather.ts, decodeFrame), for a square of SAT_KM round the middle of
// the half-degree cell the aircraft is in (so places near each other, and a page loaded again, ask for the very same pictures,
// which the browser keeps): 2.5 km a pixel, as fine as the satellite sees (3 km under it, 4 to 5 km at 45° north). The source is
// asked politely: the layer's own capabilities (6 KB) for the newest frame's time, at most every 5 minutes; and two pictures (3 to
// 20 KB each) when that frame is another than the one held, or when the aircraft has flown out of what the square serves. An
// aircraft at 450 kt stays served for a frame's 15 minutes, so that is two pictures a frame. Every picture is asked for with its
// frame's time: without it the server's answer would be kept by the browser as "the newest" for a week (its cache-control).
// A frame is used (usable) inside the satellite's view (within SAT_VIEW_DEG of the point under it), for a place it serves, until
// SAT_KEEP_MS after the source last answered for it (a failed ask keeps the last frame that long) and never when it is SAT_OLD_MS
// old; then the weather is drawn as it was without a satellite. A failed ask is made again at the next check.
// Not used here: EUMETSAT's Data Store gives the same products as numbers (and the newer satellite's, every 10 minutes), for a key
// and a NetCDF or GRIB reader; it would plug in as another SatFetch, answering frames instead of pictures.
// ponytail: the Indian Ocean satellite (msg_iodc, at 45.5° E) sees Israel at a better angle and reaches India; only the one at 0° is
// asked. Upgrade: pick the satellite by the place, and the point under it with it (satPlace.ts takes it).

const SAT_HOST = 'https://view.eumetsat.int/geoserver'
/** The two layers asked for. */
export const SAT_LAYER = { mask: 'msg_fes:clm', top: 'msg_fes:cth' } as const
/** The satellite's view: places within this many degrees of the point under it (0° N 0° E), on the great circle. Past it the pixels are long and the products thin out. */
export const SAT_VIEW_DEG = 65
/** The square a frame covers, km, and its pixels a side: 2.5 km a pixel. */
export const SAT_KM = 1000
export const SAT_N = 400
/** A height's step, m: the pictures' colours are this far apart. */
export const SAT_STEP_M = 320
/** The newest frame's time is asked for this often at most. */
export const SAT_CHECK_MS = 5 * 60_000
/** A frame is used this long after the source last answered for it. */
export const SAT_KEEP_MS = 45 * 60_000
/** And never when its own time is this long past. */
export const SAT_OLD_MS = 90 * 60_000
const SNAP_DEG = 0.5 // a frame's square is laid round the middle of the cell of this size the place is in
// A frame serves a place while the place's weather field (320 km square, built round a place up to 28 km ahead of the aircraft) and
// the room a cloud is moved by (its parallax and its drift: satPlace.ts) stand inside the frame's square.
const SERVE_KM = 160 + 28 + 100
const STRANGE = 0.02 // a picture with more than this share of pixels in colours not known is not used
const TOP_FAR = 64 // a colour farther than this from every height's colour is none (two neighbouring heights' colours are 16 to 123 apart: a blend of two neighbours is within this of one of them)
const MASK_OFF = 24 // a mask colour this far (of 255) off any blend of its three is none
const KM_PER_DEG = 111.195 // of latitude, on a sphere of 6,371 km
const RAD = Math.PI / 180

/** South, west, north, east, degrees. */
export type SatBox = readonly [south: number, west: number, north: number, east: number]

/** A frame's two pictures as they came: n × n pixels each, RGBA bytes, row by row from the north-west corner. */
export interface SatPictures {
  timeMs: number // the frame's own time
  box: SatBox
  n: number
  mask: Uint8ClampedArray
  tops: Uint8ClampedArray
}

/**
 * One frame of the satellite over a box, read from its pictures: n × n pixels, row by row from the north-west corner (a pixel's
 * middle stands half a pixel in). cloud: how much of the pixel is cloud, 0 … 255. seen: 1 where the satellite's product says
 * anything, 0 where it is not processed. topM: the highest cloud's top, metres above sea level (taken so: the product says
 * "height"); 0 where none is given.
 */
export interface SatFrame {
  timeMs: number
  box: SatBox
  n: number
  cloud: Uint8Array
  seen: Uint8Array
  topM: Uint16Array
}

/**
 * The colour of each height in msg_fes:cth, 320 m (the first) to 16,000 m (the last), 320 m apart: as the pictures hold them (see
 * the header). The last three were not seen in a picture.
 */
export const SAT_TOPS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1], [43, 18, 13], [75, 30, 13], [103, 47, 0], [141, 32, 24], [177, 0, 63], [199, 0, 120], [192, 0, 192], [174, 0, 206], [149, 0, 221],
  [111, 0, 238], [0, 0, 255], [0, 82, 255], [0, 119, 255], [0, 147, 255], [0, 172, 255], [0, 195, 255], [0, 217, 255], [0, 237, 255], [0, 255, 255],
  [0, 242, 214], [0, 228, 162], [0, 211, 100], [0, 192, 0], [69, 201, 0], [102, 209, 0], [131, 217, 0], [157, 225, 0], [182, 233, 0], [207, 241, 0],
  [231, 248, 0], [255, 255, 0], [255, 232, 0], [255, 208, 0], [255, 184, 0], [255, 159, 0], [255, 132, 0], [255, 103, 0], [255, 69, 0], [254, 0, 0],
  [203, 112, 0], [160, 144, 45], [140, 158, 112], [160, 160, 160], [175, 175, 175], [191, 191, 191], [206, 206, 206], [222, 222, 222], [238, 238, 238], [255, 255, 255],
]

// A colour (packed) → its height, m, or 0 for a colour of no height: the fifty, and every other colour met, once it is worked out.
const TOP_OF = new Map<number, number>(SAT_TOPS.map(([r, g, b], i) => [(r << 16) | (g << 8) | b, SAT_STEP_M * (i + 1)]))
const TOPS_KNOWN = 4096 // colours kept at most (a picture has fifty; one asked for coarser, blends of them)

/** The height of a colour: its nearest of the fifty, or 0 when none is near. */
function topOf(r: number, g: number, b: number): number {
  const key = (r << 16) | (g << 8) | b
  let m = TOP_OF.get(key)
  if (m !== undefined) return m
  let best = TOP_FAR * TOP_FAR + 1
  m = 0
  for (let i = 0; i < SAT_TOPS.length; i++) {
    const c = SAT_TOPS[i]
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2
    if (d < best) [best, m] = [d, SAT_STEP_M * (i + 1)]
  }
  if (TOP_OF.size < TOPS_KNOWN) TOP_OF.set(key, m)
  return m
}

/**
 * The heights of a picture of msg_fes:cth (RGBA bytes): each pixel's top, m, 0 where it has no alpha (no cloud's height given) or its
 * colour is none of the heights' (counted: strange).
 */
export function decodeTops(rgba: Uint8ClampedArray): { topM: Uint16Array; strange: number } {
  const n = rgba.length >> 2
  const topM = new Uint16Array(n)
  let strange = 0
  let key0 = -1 // the last colour looked up: a height comes in runs (a block of the product is several pixels wide)
  let m0 = 0
  for (let p = 0, q = 0; p < n; p++, q += 4) {
    if (rgba[q + 3] < 128) continue
    const key = (rgba[q] << 16) | (rgba[q + 1] << 8) | rgba[q + 2]
    if (key !== key0) {
      key0 = key
      m0 = topOf(rgba[q], rgba[q + 1], rgba[q + 2])
    }
    if (m0 === 0) strange++
    else topM[p] = m0
  }
  return { topM, strange }
}

/**
 * The mask of a picture of msg_fes:clm (RGBA bytes): each pixel's share of cloud (0 … 255) and whether it is processed (it has alpha).
 * A pixel is a blend of white (cloud), green (clear over land) and blue (clear over water): its red is its share of white. A colour
 * that is no such blend is not seen (counted: strange).
 */
export function decodeMask(rgba: Uint8ClampedArray): { cloud: Uint8Array; seen: Uint8Array; strange: number } {
  const n = rgba.length >> 2
  const cloud = new Uint8Array(n)
  const seen = new Uint8Array(n)
  let strange = 0
  for (let p = 0, q = 0; p < n; p++, q += 4) {
    if (rgba[q + 3] < 128) continue
    const r = rgba[q]
    // Shares w of white, l of land's green and s of the sea's blue give (255 w, 255 w + 192 l, 255 w + 255 s), and add up to one:
    // l = (g − r) / 192, s = (b − r) / 255, w = r / 255. In whole numbers, times 192 × 255.
    const land = rgba[q + 1] - r
    const sea = rgba[q + 2] - r
    const sum = 192 * r + 255 * land + 192 * sea - 192 * 255
    if (land < -MASK_OFF || sea < -MASK_OFF || sum > MASK_OFF * 255 || sum < -MASK_OFF * 255) {
      strange++
      continue
    }
    seen[p] = 1
    if (r > 1) cloud[p] = r
  }
  return { cloud, seen, strange }
}

/** A frame read from its pictures; null when either picture has too many pixels in colours not known (the style has changed), or is not n × n. */
export function decodeFrame(p: SatPictures): SatFrame | null {
  const cells = p.n * p.n
  if (p.mask.length !== cells * 4 || p.tops.length !== cells * 4) return null
  const m = decodeMask(p.mask)
  const t = decodeTops(p.tops)
  if (Math.max(m.strange, t.strange) > STRANGE * cells) return null
  return { timeMs: p.timeMs, box: p.box, n: p.n, cloud: m.cloud, seen: m.seen, topM: t.topM }
}

/** The share of a frame's processed pixels that are cloud (half cloud or more); 0 when none is processed. */
export function cloudyShare(f: SatFrame): number {
  let seen = 0
  let cloudy = 0
  for (let p = 0; p < f.cloud.length; p++) {
    if (f.seen[p] === 0) continue
    seen++
    if (f.cloud[p] >= 128) cloudy++
  }
  return seen === 0 ? 0 : cloudy / seen
}

/** Whether a place is in the satellite's view: within SAT_VIEW_DEG of 0° N 0° E on the great circle. */
export function inSatView(lat: number, lon: number): boolean {
  return Math.cos(lat * RAD) * Math.cos(lon * RAD) >= Math.cos(SAT_VIEW_DEG * RAD) // (not a number: not in it)
}

/** The box a frame is asked for round a place: SAT_KM square round the middle of the place's half-degree cell. */
export function satBox(lat: number, lon: number): SatBox {
  const midLat = (Math.floor(lat / SNAP_DEG) + 0.5) * SNAP_DEG
  const midLon = (Math.floor(lon / SNAP_DEG) + 0.5) * SNAP_DEG
  const dLat = SAT_KM / 2 / KM_PER_DEG
  const dLon = SAT_KM / 2 / (KM_PER_DEG * Math.max(0.2, Math.cos(midLat * RAD)))
  const r = (deg: number): number => Math.round(deg * 1e4) / 1e4
  return [r(midLat - dLat), r(midLon - dLon), r(midLat + dLat), r(midLon + dLon)]
}

/** Whether a frame of this box serves a place: the place's field and the room a cloud is moved by stand inside it. */
export function satServes(box: SatBox, lat: number, lon: number): boolean {
  const dLat = SERVE_KM / KM_PER_DEG
  const dLon = SERVE_KM / (KM_PER_DEG * Math.max(0.2, Math.cos(lat * RAD)))
  return lat - dLat >= box[0] && lat + dLat <= box[2] && lon - dLon >= box[1] && lon + dLon <= box[3]
}

/** The request for the heights layer's own capabilities: 6 KB, with its newest frame's time. (The mask's frames come with it: both are of one scan.) */
export const satCapsUrl = (): string => `${SAT_HOST}/${SAT_LAYER.top.replace(':', '/')}/ows?service=WMS&version=1.3.0&request=GetCapabilities`

/** The newest frame's time in a layer's capabilities (its time dimension's default), ms; null when there is none to read. */
export function satFrameTime(xml: string): number | null {
  const m = /<Dimension\b[^>]*\bname="time"[^>]*\bdefault="([^"]+)"/.exec(xml)
  const ms = m === null ? Number.NaN : Date.parse(m[1])
  return Number.isFinite(ms) ? ms : null
}

/** The request for a layer's picture of a box at a frame's time, n × n pixels. (WMS 1.3.0 with EPSG:4326: the box is south, west, north, east.) */
export function satMapUrl(layer: string, box: SatBox, n: number, timeMs: number): string {
  const time = new Date(timeMs).toISOString().replace(/\.\d+Z$/, 'Z')
  return `${SAT_HOST}/ows?service=WMS&version=1.3.0&request=GetMap&layers=${layer}&styles=&format=image/png&transparent=true&crs=EPSG:4326&bbox=${box.join(',')}&width=${n}&height=${n}&time=${time}`
}

/** What fetches for the source: a text, and a picture as RGBA bytes with its size as sent. The browser's by default; fakes in tests. */
export interface SatFetch {
  text(url: string): Promise<string>
  pixels(url: string, n: number): Promise<{ rgba: Uint8ClampedArray; bytes: number }>
}

let reader: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null

/** The browser's fetches. A picture's colours must arrive as sent: each is a number. */
const browserFetch: SatFetch = {
  async text(url) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.text()
  },
  async pixels(url, n) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const type = r.headers.get('content-type') ?? ''
    if (!type.startsWith('image/png')) throw new Error(`not a picture (${type})`) // a time it has no frame for is answered in XML, with 200
    const blob = await r.blob()
    const img = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
    if (reader === null) {
      const canvas = document.createElement('canvas')
      reader = { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! }
    }
    if (reader.canvas.width !== n) reader.canvas.width = reader.canvas.height = n
    reader.ctx.clearRect(0, 0, n, n)
    reader.ctx.drawImage(img, 0, 0, n, n)
    img.close()
    return { rgba: reader.ctx.getImageData(0, 0, n, n).data, bytes: blob.size }
  },
}

/** What the pictures held cost: both pictures' bytes as sent, and the time from asking for them to having their pixels. */
export interface SatStats {
  bytes: number
  fetchMs: number
}

/**
 * The satellite's newest frame round the aircraft, as its two pictures, kept up as look() is called (once a second while the weather
 * shows). See the header for when it asks, and for when a frame is used.
 */
export class SatelliteSource {
  readonly #fetch: SatFetch
  #held: SatPictures | null = null
  #answeredMs = -Infinity // the wall clock when the source last answered for the frame held: it came, or a check said it is still the newest
  #newest: number | null = null // the newest frame's time, as the last check said
  #checkDue = -Infinity
  #busy = false
  #failed = false // the last ask failed: nothing more is asked before the next check
  #down = false
  #gen = 0
  #stats: SatStats | null = null

  constructor(opts: { fetch?: SatFetch } = {}) {
    this.#fetch = opts.fetch ?? browserFetch
  }

  /** The pictures held, whether or not they may be used now (usable); null until the first have come. */
  get pictures(): SatPictures | null {
    return this.#held
  }

  /** Counts the frames that have come. */
  get gen(): number {
    return this.#gen
  }

  /** Whether the last ask of the source failed, or its pictures could not be read. */
  get down(): boolean {
    return this.#down
  }

  /** What the pictures held cost to fetch; null until the first have come. */
  get stats(): SatStats | null {
    return this.#stats
  }

  /**
   * The pictures held, if they may be used for a weather field round lat, lon at this wall-clock time: the place in the satellite's
   * view and served by the frame, the source heard of the frame within SAT_KEEP_MS, the frame not SAT_OLD_MS old. Else null.
   */
  usable(epochMs: number, lat: number, lon: number): SatPictures | null {
    const f = this.#held
    if (f === null || !inSatView(lat, lon) || !satServes(f.box, lat, lon)) return null
    return epochMs - this.#answeredMs <= SAT_KEEP_MS && epochMs - f.timeMs <= SAT_OLD_MS ? f : null
  }

  /**
   * A look, for an aircraft at lat, lon (where the satellite's pixels are: not moved by ?wxat): outside the view nothing is asked.
   * When a check is due (nowMs: the frames' clock) the newest frame's time is asked for, and then its pictures if it is another frame
   * than the one held, or the frame held does not serve the place. Between checks the pictures are asked for when the place has left
   * what the frame held serves. One ask at a time; after a failed one, nothing before the next check.
   */
  look(nowMs: number, epochMs: number, lat: number, lon: number): void {
    if (this.#busy || !inSatView(lat, lon)) return
    if (nowMs >= this.#checkDue) {
      this.#checkDue = nowMs + SAT_CHECK_MS
      this.#failed = false
      void this.#ask(async () => {
        this.#newest = satFrameTime(await this.#fetch.text(satCapsUrl()))
        if (this.#newest === null) throw new Error('no frame time in the capabilities')
        if (this.#held?.timeMs === this.#newest) this.#answeredMs = epochMs
        if (this.#wants(lat, lon)) await this.#load(this.#newest, satBox(lat, lon), epochMs)
      })
    } else if (!this.#failed && this.#newest !== null && this.#wants(lat, lon)) {
      const newest = this.#newest
      void this.#ask(() => this.#load(newest, satBox(lat, lon), epochMs))
    }
  }

  /**
   * These pictures could not be read (the gatherer found colours it does not know: the layers' style has changed): they are held no
   * longer, the source is down, and nothing is asked before the next check.
   */
  reject(p: SatPictures): void {
    if (p !== this.#held) return
    this.#held = null
    this.#failed = true
    this.#fail(new Error('colours not known in the pictures: the layers\' style has changed'))
  }

  /**
   * These pictures' pixels are gone (they were handed to the gatherer's worker, which has them no longer): the pictures are held no
   * longer, and the next look asks for them again (the browser has kept them). The source is not down.
   */
  forget(p: SatPictures): void {
    if (p === this.#held) this.#held = null
  }

  /** Whether the frame held is not the newest known, or does not serve the place. */
  #wants(lat: number, lon: number): boolean {
    return this.#held === null || this.#held.timeMs !== this.#newest || !satServes(this.#held.box, lat, lon)
  }

  /** One ask at a time; a failure is one warning for a whole outage. */
  async #ask(what: () => Promise<void>): Promise<void> {
    this.#busy = true
    try {
      await what()
      this.#down = false
    } catch (e) {
      this.#failed = true
      this.#fail(e)
    } finally {
      this.#busy = false
    }
  }

  #fail(why: unknown): void {
    if (!this.#down) console.warn('FlightHopper: the weather satellite\'s pictures (EUMETView):', why)
    this.#down = true
  }

  /** The two pictures of a frame over a box: held in place of those before. */
  async #load(timeMs: number, box: SatBox, epochMs: number): Promise<void> {
    const t0 = performance.now()
    const [mask, tops] = await Promise.all([this.#fetch.pixels(satMapUrl(SAT_LAYER.mask, box, SAT_N, timeMs), SAT_N), this.#fetch.pixels(satMapUrl(SAT_LAYER.top, box, SAT_N, timeMs), SAT_N)])
    if (mask.rgba.length !== SAT_N * SAT_N * 4 || tops.rgba.length !== SAT_N * SAT_N * 4) throw new Error('a picture of another size than asked for')
    this.#held = { timeMs, box, n: SAT_N, mask: mask.rgba, tops: tops.rgba }
    this.#answeredMs = epochMs
    this.#stats = { bytes: mask.bytes + tops.bytes, fetchMs: performance.now() - t0 }
    this.#gen++
  }
}
