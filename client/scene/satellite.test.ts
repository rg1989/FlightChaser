// client/scene/satellite.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { encodeSatCut } from '../../shared/sat.ts'
import {
  SAT_CHECK_MS, SAT_KEEP_MS, SAT_KM, SAT_LAYER, SAT_N, SAT_OLD_MS, SAT_RAW_CHECK_MS, SAT_RAW_NONE_MS, SAT_STEP_M, SAT_TOPS, SatelliteSource, cloudyShare, decodeFrame, decodeMask, decodeTops, inSatView, rawFrame, satBare, satBox, satBuffers,
  satCapsUrl, satFrameTime, satMapUrl, satServes,
  type SatFetch,
} from './satellite.ts'

const fixture = (name: string): Buffer => readFileSync(new URL(`../../data/fixtures/eumetview/${name}`, import.meta.url))

/** A PNG's pixels as RGBA bytes (8 bits a channel, not interlaced: RGBA, RGB or a palette): what the legends EUMETView serves are. */
function readPng(buf: Buffer): { data: Uint8ClampedArray; width: number; height: number } {
  let [o, w, h, type] = [8, 0, 0, 0]
  let plte: Buffer | null = null
  let trns: Buffer | null = null
  const idat: Buffer[] = []
  while (o < buf.length) {
    const len = buf.readUInt32BE(o)
    const kind = buf.toString('latin1', o + 4, o + 8)
    const body = buf.subarray(o + 8, o + 8 + len)
    if (kind === 'IHDR') {
      ;[w, h, type] = [body.readUInt32BE(0), body.readUInt32BE(4), body[9]]
      assert.ok(body[8] === 8 && body[12] === 0, 'an 8-bit picture, not interlaced')
    } else if (kind === 'PLTE') plte = body
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
      const [pa, pb, pc] = [Math.abs(b - c), Math.abs(a - c), Math.abs(a + b - 2 * c)]
      const predicted = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      px[y * line + x] = (raw[y * (line + 1) + 1 + x] + predicted) & 255
    }
  }
  const data = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    if (type === 3) data.set([plte![3 * px[p]], plte![3 * px[p] + 1], plte![3 * px[p] + 2], trns !== null && px[p] < trns.length ? trns[px[p]] : 255], 4 * p)
    else if (type === 2) data.set([px[3 * p], px[3 * p + 1], px[3 * p + 2], 255], 4 * p)
    else data.set(px.subarray(4 * p, 4 * p + 4), 4 * p)
  }
  return { data, width: w, height: h }
}

type Rgb = readonly [number, number, number]
const rgbaOf = (pixels: readonly (readonly number[])[]): Uint8ClampedArray => Uint8ClampedArray.from(pixels.flatMap((p) => (p.length === 4 ? [...p] : [...p, 255])))
const far = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// ---- the heights' colours, against the recorded legend ------------------------------------------------------------------------

/** The legend of msg_fes:cth as recorded: its colour bar's row, and where its three inner ticks stand (the labels 4240, 8160 and 12080 m; 320 and 16000 m are the bar's ends). */
function legend(): { colourAt: (m: number) => number[]; ticks: number[] } {
  const png = readPng(fixture('legend-cth.png'))
  const at = (x: number, y: number): number[] => [...png.data.subarray(4 * (y * png.width + x), 4 * (y * png.width + x) + 3)]
  const ticks: number[] = []
  for (let x = 160; x < 630; x++) if (at(x, 46).join() === '0,0,0' && at(x, 20).join() !== '0,0,0' && at(x - 1, 46).join() !== '0,0,0') ticks.push(x + 1) // a tick is two pixels wide: its middle
  const perPx = 3920 / (ticks[1] - ticks[0]) // the labels are 3,920 m apart
  const x0 = ticks[0] - 3920 / perPx // where 320 m stands
  return { ticks, colourAt: (m) => at(Math.min(633, Math.max(150, Math.round(x0 + (m - 320) / perPx))), 20) }
}

test('the legend recorded from EUMETView has its ticks 122 pixels apart: 320 m at the bar\'s start, 16,000 m at its end', () => {
  const { ticks } = legend()
  assert.deepEqual(ticks, [271, 393, 515])
})

test('SAT_TOPS: fifty colours, 320 m apart from 320 m to 16,000 m; the legend\'s key colours stand at their heights', () => {
  assert.equal(SAT_STEP_M, 320)
  assert.equal(SAT_TOPS.length, 50)
  const { colourAt } = legend()
  // The legend is drawn as straight blends between its key colours; the pictures' colours between them are spaced otherwise (each
  // 320 m is a colour of its own). At the key colours the two agree.
  const keys: [number, Rgb][] = [[320, [0, 0, 0]], [2560, [192, 0, 192]], [3840, [0, 0, 255]], [6400, [0, 255, 255]], [7680, [0, 192, 0]], [10240, [255, 255, 0]], [12800, [255, 0, 0]], [16000, [255, 255, 255]]]
  for (const [m, key] of keys) {
    const mine = SAT_TOPS[m / 320 - 1]
    assert.ok(far(mine, key) <= 2, `${m} m is ${mine}, the key colour ${key}`)
    assert.ok(far(mine, colourAt(m)) <= 35, `${m} m: ${mine} against the legend's ${colourAt(m)}`)
  }
  const seen = new Set(SAT_TOPS.map((c) => c.join()))
  assert.equal(seen.size, 50, 'no colour twice')
})

test('decodeTops: the legend\'s colour at each of its labels reads as that height, to two steps', () => {
  const { colourAt } = legend()
  for (const m of [320, 4240, 8160, 12080, 16000]) {
    const { topM, strange } = decodeTops(rgbaOf([colourAt(m)]))
    assert.ok(Math.abs(topM[0] - m) <= 640, `${m} m read as ${topM[0]}`)
    assert.equal(strange, 0)
  }
})

test('decodeTops: each colour is its height; no alpha is no cloud; a colour a shade off reads as its nearest; a colour of no height is strange', () => {
  const all = decodeTops(rgbaOf(SAT_TOPS))
  assert.deepEqual([...all.topM], SAT_TOPS.map((_, i) => 320 * (i + 1)))
  assert.equal(all.strange, 0)
  const got = decodeTops(rgbaOf([[0, 0, 0, 0], [0, 0, 255], [1, 1, 255], [111, 1, 238], [0, 0, 0], [56, 1, 247], [255, 0, 255], [0, 0, 255, 0]]))
  assert.deepEqual([...got.topM], [0, 3840, 3840, 3520, 320, 3520, 0, 0]) // (a blend of two neighbours, 3,520 and 3,840 m, reads as one of them)
  assert.equal(got.strange, 1)
})

// ---- the mask ----------------------------------------------------------------------------------------------------------------

test('decodeMask: the recorded legend\'s three classes: clear over water and over land are no cloud, cloud is cloud', () => {
  const png = readPng(fixture('legend-clm.png'))
  const at = (x: number): number[] => [...png.data.subarray(4 * (20 * png.width + x), 4 * (20 * png.width + x) + 4)]
  const [water, land, cloud] = [at(230), at(390), at(550)]
  assert.deepEqual([water.slice(0, 3), land.slice(0, 3), cloud.slice(0, 3)], [[0, 0, 255], [0, 192, 0], [255, 255, 255]])
  const got = decodeMask(rgbaOf([water, land, cloud]))
  assert.deepEqual([...got.cloud], [0, 0, 255])
  assert.deepEqual([...got.seen], [1, 1, 1])
  assert.equal(got.strange, 0)
})

test('decodeMask: no alpha is not processed; a blend of cloud and clear is that share of cloud; another colour is strange and not seen', () => {
  const got = decodeMask(rgbaOf([[0, 0, 0, 0], [1, 192, 1], [1, 1, 255], [128, 224, 128], [191, 191, 255], [1, 96, 128], [255, 0, 0], [90, 90, 90]]))
  assert.deepEqual([...got.cloud], [0, 0, 0, 128, 191, 0, 0, 0])
  assert.deepEqual([...got.seen], [0, 1, 1, 1, 1, 1, 0, 0])
  assert.equal(got.strange, 2)
})

// ---- the requests ------------------------------------------------------------------------------------------------------------

test('satFrameTime: the newest frame\'s time from the layer\'s capabilities, as recorded; none from anything else', () => {
  assert.equal(satFrameTime(fixture('capabilities-cth.xml').toString('utf8')), Date.UTC(2026, 9, 4, 4, 45))
  assert.equal(satFrameTime(fixture('no-frame.xml').toString('utf8')), null)
  assert.equal(satFrameTime('<Dimension name="time" default="soon">'), null)
})

test('the requests: the layer\'s own capabilities, and a GetMap of a box at a frame\'s time (south, west, north, east)', () => {
  assert.equal(satCapsUrl(), 'https://view.eumetsat.int/geoserver/msg_fes/cth/ows?service=WMS&version=1.3.0&request=GetCapabilities')
  assert.equal(
    satMapUrl(SAT_LAYER.top, [28, 30, 36, 40], 256, Date.UTC(2026, 9, 4, 4, 45)),
    'https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetMap&layers=msg_fes:cth&styles=&format=image/png&transparent=true&crs=EPSG:4326&bbox=28,30,36,40&width=256&height=256&time=2026-10-04T04:45:00Z',
  )
  assert.ok(satMapUrl(SAT_LAYER.mask, [28, 30, 36, 40], 256, 0).includes('layers=msg_fes:clm&'))
})

test('inSatView: within 65° of 0° N 0° E on the great circle', () => {
  assert.ok(inSatView(0, 0))
  assert.ok(inSatView(32, 35)) // Israel
  assert.ok(inSatView(0, 64.9) && !inSatView(0, 65.1))
  assert.ok(inSatView(60, 30)) // 64.3°
  assert.ok(!inSatView(65, 25)) // 67.5°
  assert.ok(!inSatView(37.6, -122.4)) // San Francisco
  assert.ok(!inSatView(Number.NaN, 0))
})

test('satBox: a square of SAT_KM round the middle of the place\'s half-degree cell, so places near each other ask for the same picture', () => {
  const box = satBox(32.1, 34.9)
  assert.deepEqual(box, satBox(32.4, 34.6))
  assert.notDeepEqual(box, satBox(32.6, 34.9))
  const [south, west, north, east] = box
  assert.ok(Math.abs((north - south) * 111.195 - SAT_KM) < 0.1)
  assert.ok(Math.abs((east - west) * 111.195 * Math.cos((32.25 * Math.PI) / 180) - SAT_KM) < 0.1)
  assert.ok(Math.abs((south + north) / 2 - 32.25) < 1e-3 && Math.abs((west + east) / 2 - 34.75) < 1e-3)
})

test('satServes: a box serves a place while the place\'s field, and the room a cloud is moved by, stand inside it', () => {
  const box = satBox(32.25, 34.75)
  assert.ok(satServes(box, 32.25, 34.75))
  assert.ok(satServes(box, 33.6, 34.75)) // 150 km north
  assert.ok(!satServes(box, 34.5, 34.75)) // 250 km north
  assert.ok(!satServes(box, 32.25, 37.5)) // 258 km east
})

// ---- the source --------------------------------------------------------------------------------------------------------------

const T0 = Date.UTC(2026, 9, 4, 4, 45)
const caps = (ms: number): string => `<Dimension name="time" default="${new Date(ms).toISOString().replace('.000Z', 'Z')}" units="ISO8601">…</Dimension>`

/** A stand-in for EUMETView: the newest frame's time, a picture for every map asked (cloud over the northern half, 3,840 m), and what was asked. */
function server(opts: { newest?: number; fail?: boolean; mask?: Rgb } = {}): SatFetch & { asked: string[]; newest: number; fail: boolean } {
  const s = {
    asked: [] as string[], newest: opts.newest ?? T0, fail: opts.fail ?? false,
    text(url: string): Promise<string> {
      s.asked.push(url)
      return s.fail ? Promise.reject(new Error('HTTP 503')) : Promise.resolve(caps(s.newest))
    },
    pixels(url: string, n: number): Promise<{ rgba: Uint8ClampedArray; bytes: number }> {
      s.asked.push(url)
      if (s.fail) return Promise.reject(new Error('not a picture: text/xml'))
      const rgba = new Uint8ClampedArray(n * n * 4)
      const top = url.includes(SAT_LAYER.top)
      for (let p = 0; p < n * n; p++) {
        const cloudy = p < (n * n) / 2
        rgba.set(top ? (cloudy ? [0, 0, 255, 255] : [0, 0, 0, 0]) : [...(cloudy ? (opts.mask ?? [255, 255, 255]) : [0, 192, 0]), 255], 4 * p)
      }
      return Promise.resolve({ rgba, bytes: 3000 })
    },
  }
  return s
}
const settle = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await new Promise<void>((r) => setImmediate(r))
}
const [LAT, LON] = [32.1, 34.9]

test('SatelliteSource: the first look asks for the newest frame\'s time, then its mask and its heights for the place\'s box; the pictures are held as they came', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  assert.equal(sat.pictures, null)
  sat.look(0, T0 + 20 * 60_000, LAT, LON)
  sat.look(1000, T0 + 20 * 60_000, LAT, LON) // (still asking: nothing more)
  await settle()
  const box = satBox(LAT, LON)
  assert.deepEqual(eumetview.asked, [satCapsUrl(), satMapUrl(SAT_LAYER.mask, box, SAT_N, T0), satMapUrl(SAT_LAYER.top, box, SAT_N, T0)])
  const p = sat.pictures!
  assert.deepEqual([p.timeMs, p.n, p.mask.length, p.tops.length], [T0, SAT_N, SAT_N * SAT_N * 4, SAT_N * SAT_N * 4])
  assert.deepEqual(p.box, box)
  assert.equal(sat.gen, 1)
  assert.equal(sat.down, false)
  assert.equal(sat.stats!.bytes, 6000)
  // Read (the gatherer's work): cloud over the northern half, its top at 3,840 m.
  const f = decodeFrame(p)!
  assert.deepEqual([f.timeMs, f.n, f.cloud.length, f.topM.length], [T0, SAT_N, SAT_N * SAT_N, SAT_N * SAT_N])
  assert.deepEqual(f.box, box)
  assert.deepEqual([f.cloud[0], f.seen[0], f.topM[0], f.cloud[SAT_N * SAT_N - 1], f.topM[SAT_N * SAT_N - 1]], [255, 1, 3840, 0, 0])
  assert.equal(cloudyShare(f), 0.5)
})

test('SatelliteSource: it checks for a newer frame every 5 min at most; the same frame asks for no picture, a newer one for two', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  sat.look(0, T0 + 20 * 60_000, LAT, LON)
  await settle()
  eumetview.asked.length = 0
  sat.look(SAT_CHECK_MS - 1000, T0 + 25 * 60_000, LAT, LON)
  await settle()
  assert.deepEqual(eumetview.asked, [])
  sat.look(SAT_CHECK_MS, T0 + 25 * 60_000, LAT, LON)
  await settle()
  assert.deepEqual(eumetview.asked, [satCapsUrl()])
  assert.equal(sat.gen, 1)
  eumetview.asked.length = 0
  eumetview.newest = T0 + 15 * 60_000
  sat.look(2 * SAT_CHECK_MS, T0 + 30 * 60_000, LAT, LON)
  await settle()
  const asked: string[] = [...eumetview.asked]
  assert.equal(asked.length, 3)
  assert.ok(asked[1].endsWith('&time=2026-10-04T05:00:00Z'))
  assert.equal(sat.pictures!.timeMs, T0 + 15 * 60_000)
  assert.equal(sat.gen, 2)
})

test('SatelliteSource: a place the frame held does not serve asks for other pixels at once, with no check; a place outside the view asks for nothing', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  sat.look(0, T0 + 20 * 60_000, LAT, LON)
  await settle()
  eumetview.asked.length = 0
  sat.look(1000, T0 + 20 * 60_000, LAT + 1, LON) // 111 km on: served
  await settle()
  assert.deepEqual(eumetview.asked, [])
  sat.look(2000, T0 + 20 * 60_000, LAT + 3, LON)
  await settle()
  const box = satBox(LAT + 3, LON)
  assert.deepEqual(eumetview.asked, [satMapUrl(SAT_LAYER.mask, box, SAT_N, T0), satMapUrl(SAT_LAYER.top, box, SAT_N, T0)])
  assert.deepEqual(sat.pictures!.box, box)
  const far = new SatelliteSource({ fetch: eumetview })
  eumetview.asked.length = 0
  far.look(0, T0, 37.6, -122.4)
  await settle()
  assert.deepEqual(eumetview.asked, [])
  assert.equal(far.usable(T0, 37.6, -122.4), null)
})

test('SatelliteSource.usable: the frame for a place it serves, in the view; none 45 min after the source last answered for it, nor when it is 90 min old', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  const t = T0 + 20 * 60_000
  assert.equal(sat.usable(t, LAT, LON), null) // no frame
  sat.look(0, t, LAT, LON)
  await settle()
  assert.equal(sat.usable(t, LAT, LON), sat.pictures)
  assert.equal(sat.usable(t, LAT + 3, LON), null) // not served
  assert.equal(sat.usable(t + SAT_KEEP_MS, LAT, LON), sat.pictures)
  assert.equal(sat.usable(t + SAT_KEEP_MS + 1, LAT, LON), null) // stale: nothing has answered for it since
  // The source goes on saying that this frame is its newest: kept past 45 min, not past 90 min of age.
  sat.look(SAT_CHECK_MS * 6, t + 30 * 60_000, LAT, LON)
  await settle()
  assert.equal(sat.usable(t + 60 * 60_000, LAT, LON), sat.pictures)
  assert.equal(sat.usable(T0 + SAT_OLD_MS + 1, LAT, LON), null)
})

test('SatelliteSource: a failed ask keeps the frame held, says the source is down, and is made again at the next check, not before', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  const warn = console.warn
  const warned: unknown[] = []
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    sat.look(0, T0 + 20 * 60_000, LAT, LON)
    await settle()
    const held = sat.pictures
    eumetview.fail = true
    eumetview.asked.length = 0
    sat.look(SAT_CHECK_MS, T0 + 25 * 60_000, LAT, LON)
    await settle()
    assert.equal(sat.pictures, held)
    assert.equal(sat.down, true)
    assert.equal(warned.length, 1)
    sat.look(SAT_CHECK_MS + 1000, T0 + 25 * 60_000, LAT + 3, LON) // other pixels wanted, the source down: not before the next check
    await settle()
    assert.equal(eumetview.asked.length, 1)
    sat.look(2 * SAT_CHECK_MS, T0 + 30 * 60_000, LAT, LON)
    await settle()
    assert.equal(eumetview.asked.length, 2)
    assert.equal(warned.length, 1) // one warning for a whole outage
    eumetview.fail = false
    sat.look(3 * SAT_CHECK_MS, T0 + 35 * 60_000, LAT, LON)
    await settle()
    assert.equal(sat.down, false)
    assert.equal(sat.usable(T0 + 36 * 60_000, LAT, LON), held)
  } finally {
    console.warn = warn
  }
})

test('decodeFrame: pictures in colours it does not know are not a frame (the style has changed); nor are pictures of another size', async () => {
  const eumetview = server({ mask: [200, 40, 40] })
  const sat = new SatelliteSource({ fetch: eumetview })
  sat.look(0, T0 + 20 * 60_000, LAT, LON)
  await settle()
  const p = sat.pictures!
  assert.equal(decodeFrame(p), null)
  assert.equal(decodeFrame({ ...p, mask: new Uint8ClampedArray(p.mask.length), n: SAT_N - 1 }), null)
  assert.notEqual(decodeFrame({ ...p, mask: new Uint8ClampedArray(p.mask.length) }), null) // (nothing processed: a frame, of nothing seen)
})

test('SatelliteSource.reject: pictures that could not be read are held no longer; the source is down, and is asked again at the next check', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  const warn = console.warn
  const warned: unknown[] = []
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    sat.look(0, T0 + 20 * 60_000, LAT, LON)
    await settle()
    eumetview.asked.length = 0
    sat.reject(sat.pictures!)
    assert.equal(sat.pictures, null)
    assert.equal(sat.usable(T0 + 20 * 60_000, LAT, LON), null)
    assert.equal(sat.down, true)
    assert.equal(warned.length, 1)
    sat.look(1000, T0 + 20 * 60_000, LAT, LON)
    await settle()
    assert.deepEqual(eumetview.asked, [])
    sat.look(SAT_CHECK_MS, T0 + 25 * 60_000, LAT, LON)
    await settle()
    assert.equal(eumetview.asked.length, 3)
    assert.equal(sat.down, false)
  } finally {
    console.warn = warn
  }
})

test('SatelliteSource.forget: pictures whose pixels are gone (handed to a worker that has lost them) are held no longer, and are asked for again at the next look; the source is not down', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  sat.look(0, T0 + 20 * 60_000, LAT, LON)
  await settle()
  eumetview.asked.length = 0
  sat.forget(sat.pictures!)
  assert.deepEqual([sat.pictures, sat.down], [null, false])
  sat.look(1000, T0 + 20 * 60_000, LAT, LON)
  await settle()
  assert.equal(eumetview.asked.length, 2, 'the two pictures, with no check')
  assert.equal(sat.pictures!.timeMs, T0)
  assert.equal(sat.gen, 2)
})

test('SatelliteSource.usable: a frame that serves the aircraft serves the field built ahead of it too (the field\'s middle stands up to 28 km ahead on the track)', async () => {
  const eumetview = server()
  const sat = new SatelliteSource({ fetch: eumetview })
  const t = T0 + 20 * 60_000
  sat.look(0, t, LAT, LON)
  await settle()
  const box = sat.pictures!.box
  // The farthest north the aircraft is still served: the next look asks for nothing there.
  let lat = LAT
  while (satServes(box, lat + 0.01, LON)) lat += 0.01
  eumetview.asked.length = 0
  sat.look(1000, t, lat, LON)
  await settle()
  assert.deepEqual(eumetview.asked, [])
  assert.ok(sat.usable(t, lat + 28 / 111.195, LON) === sat.pictures, 'the field 28 km ahead of it')
  assert.equal(sat.usable(t, lat + 40 / 111.195, LON), null)
})

// ---- the raw route: the app's own server's frames first ----

const RAW = '/api/wx/sat'
const rawUrl = (lat: number, lon: number, have?: number): string => `${RAW}?bbox=${satBox(lat, lon).join(',')}&n=${SAT_N}${have === undefined ? '' : `&have=${have}`}`
/**
 * A stand-in for EUMETView and for the app's server's route: the server's newest frame (`rawNewest`: 15 minutes ahead of the
 * pictures', as the Data Store is), cloud over the northern half with its top at 5,120 m, or the status it answers with instead.
 */
function both(opts: { status?: number; rawNewest?: number } = {}) {
  const s = Object.assign(server(), {
    status: opts.status ?? 200, rawNewest: opts.rawNewest ?? T0 + 15 * 60_000, garbled: false,
    raw(url: string): Promise<{ status: number; body: ArrayBuffer | null; bytes: number }> {
      s.asked.push(url)
      if (s.status === 0) return Promise.reject(new TypeError('Failed to fetch'))
      const q = new URL(url, 'http://localhost').searchParams
      if (s.status !== 200) return Promise.resolve({ status: s.status, body: null, bytes: 0 })
      if (q.get('have') === String(s.rawNewest)) return Promise.resolve({ status: 204, body: null, bytes: 0 })
      const n = Number(q.get('n'))
      const box = q.get('bbox')!.split(',').map(Number) as [number, number, number, number]
      const half = (n * n) / 2
      const body = encodeSatCut({
        timeMs: s.rawNewest, box, n,
        cloud: Uint8Array.from({ length: n * n }, (_, p) => (p < half ? 255 : 0)), seen: new Uint8Array(n * n).fill(1), topM: Uint16Array.from({ length: n * n }, (_, p) => (p < half ? 5120 : 0)),
      }).buffer
      return Promise.resolve({ status: 200, body: s.garbled ? body.slice(0, 1000) : body, bytes: 30_000 })
    },
  })
  return s
}
const quiet = async (run: (warned: unknown[][]) => Promise<void>): Promise<void> => {
  const warn = console.warn
  const warned: unknown[][] = []
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    await run(warned)
  } finally {
    console.warn = warn
  }
}

test('SatelliteSource with the app\'s server\'s route: the first look asks the server for the place\'s box and holds its answer, the frame\'s numbers as they came; EUMETView is not asked', async () => {
  const app = both()
  const sat = new SatelliteSource({ fetch: app, raw: RAW })
  sat.look(0, T0 + 30 * 60_000, LAT, LON)
  await settle()
  assert.deepEqual(app.asked, [rawUrl(LAT, LON)])
  const p = sat.pictures!
  assert.deepEqual([p.timeMs, p.n, p.mask.length, p.tops.length, p.raw!.length], [T0 + 15 * 60_000, SAT_N, 0, 0, 48 + 4 * SAT_N * SAT_N])
  assert.deepEqual(p.box, satBox(LAT, LON))
  assert.deepEqual([sat.gen, sat.down, sat.stats!.bytes], [1, false, 30_000])
  assert.equal(sat.usable(T0 + 30 * 60_000, LAT, LON), p)
  // Read (nothing to decode: the planes lie in the answer): cloud over the northern half, its top at 5,120 m.
  const f = rawFrame(p)!
  assert.deepEqual([f.timeMs, f.n, f.cloud[0], f.seen[0], f.topM[0], f.cloud[SAT_N * SAT_N - 1], f.topM[SAT_N * SAT_N - 1]], [T0 + 15 * 60_000, SAT_N, 255, 1, 5120, 0, 0])
  assert.deepEqual(f.box, satBox(LAT, LON))
  assert.equal(cloudyShare(f), 0.5)
})

test('SatelliteSource with the server\'s route: the server is asked every minute, with the time of the frame held; "the same" keeps the frame and counts as an answer for it; a newer frame takes its place', async () => {
  const app = both()
  const sat = new SatelliteSource({ fetch: app, raw: RAW })
  const t = T0 + 30 * 60_000
  sat.look(0, t, LAT, LON)
  await settle()
  const first = sat.pictures
  app.asked.length = 0
  sat.look(SAT_RAW_CHECK_MS - 1000, t + 59_000, LAT, LON)
  await settle()
  assert.deepEqual(app.asked, [], 'not within the minute')
  for (let k = 1; k <= 20; k++) sat.look(k * SAT_RAW_CHECK_MS, t + k * 60_000, LAT, LON), await settle()
  assert.equal(app.asked.length, 20)
  assert.ok(app.asked.every((u) => u === rawUrl(LAT, LON, T0 + 15 * 60_000)))
  assert.deepEqual([sat.pictures, sat.gen], [first, 1], 'the same frame, held on')
  assert.equal(sat.usable(t + 20 * 60_000 + SAT_KEEP_MS, LAT, LON), first, 'the server answered for it 20 minutes on: used 45 minutes from then')
  app.rawNewest = T0 + 30 * 60_000
  sat.look(21 * SAT_RAW_CHECK_MS, t + 21 * 60_000, LAT, LON)
  await settle()
  assert.deepEqual([sat.pictures!.timeMs, sat.gen], [T0 + 30 * 60_000, 2])
})

test('SatelliteSource with the server\'s route: a server with no key (404) is not asked again for half an hour; the look goes on to EUMETView\'s pictures at once, and checks them every 5 minutes as before', async () => {
  const app = both({ status: 404 })
  const sat = new SatelliteSource({ fetch: app, raw: RAW })
  await quiet(async (warned) => {
    sat.look(0, T0 + 20 * 60_000, LAT, LON)
    await settle()
    const box = satBox(LAT, LON)
    assert.deepEqual(app.asked, [rawUrl(LAT, LON), satCapsUrl(), satMapUrl(SAT_LAYER.mask, box, SAT_N, T0), satMapUrl(SAT_LAYER.top, box, SAT_N, T0)])
    assert.deepEqual([sat.pictures!.timeMs, sat.pictures!.raw, sat.pictures!.mask.length, sat.down], [T0, undefined, SAT_N * SAT_N * 4, false])
    assert.deepEqual(warned, [], 'a server without the key is no fault')
    app.asked.length = 0
    for (let ms = 60_000; ms < SAT_RAW_NONE_MS; ms += 60_000) sat.look(ms, T0 + 20 * 60_000 + ms, LAT, LON), await settle()
    assert.deepEqual(app.asked, new Array(5).fill(satCapsUrl()), 'the pictures\' checks, 5 minutes apart: at 5, 10, 15, 20 and 25 minutes')
    app.asked.length = 0
    app.status = 200
    app.rawNewest = T0 + 45 * 60_000
    sat.look(SAT_RAW_NONE_MS, T0 + 50 * 60_000, LAT, LON)
    await settle()
    assert.deepEqual(app.asked, [rawUrl(LAT, LON)], 'asked again after half an hour (a key may have been given to the server)')
    assert.deepEqual([sat.pictures!.timeMs, sat.pictures!.raw !== undefined], [T0 + 45 * 60_000, true])
  })
})

test('SatelliteSource with the server\'s route: a server that fails (EUMETSAT down: 502 or 503; the server itself not answering; an answer that is no frame) falls back to the pictures for that check and is asked again at the next, with one warning for the outage', async () => {
  for (const fault of [502, 503, 0, 'garbled'] as const) {
    const app = both(fault === 'garbled' ? {} : { status: fault })
    app.garbled = fault === 'garbled'
    const sat = new SatelliteSource({ fetch: app, raw: RAW })
    await quiet(async (warned) => {
      sat.look(0, T0 + 20 * 60_000, LAT, LON)
      await settle()
      assert.deepEqual(app.asked.map((u) => u.split('?')[0]).slice(0, 2), [RAW, 'https://view.eumetsat.int/geoserver/msg_fes/cth/ows'], String(fault))
      assert.deepEqual([app.asked.length, sat.pictures!.timeMs, sat.pictures!.raw, sat.down], [4, T0, undefined, false], 'the pictures\' frame; the satellite is not down')
      assert.equal(warned.length, 1)
      app.asked.length = 0
      sat.look(60_000, T0 + 21 * 60_000, LAT, LON)
      await settle()
      assert.deepEqual(app.asked, [], 'not before the next check')
      sat.look(SAT_CHECK_MS, T0 + 25 * 60_000, LAT, LON)
      await settle()
      assert.deepEqual(app.asked, [rawUrl(LAT, LON), satCapsUrl()], 'the server again, then the pictures\' check (the same frame: no picture)')
      assert.equal(warned.length, 1, 'one warning for the outage')
      app.status = 200
      app.garbled = false
      app.asked.length = 0
      sat.look(2 * SAT_CHECK_MS, T0 + 30 * 60_000, LAT, LON)
      await settle()
      assert.deepEqual(app.asked, [rawUrl(LAT, LON)])
      assert.deepEqual([sat.pictures!.timeMs, sat.pictures!.raw !== undefined], [T0 + 15 * 60_000, true], 'back on the server\'s frames')
    })
  }
})

test('SatelliteSource with the server\'s route: a frame held is not given up for an older one: when the server fails, EUMETView\'s frame takes its place only once it is newer; and the server\'s frame replaces the pictures of the same time', async () => {
  const app = both()
  const sat = new SatelliteSource({ fetch: app, raw: RAW })
  await quiet(async () => {
    sat.look(0, T0 + 30 * 60_000, LAT, LON) // the server has 05:00; EUMETView has 04:45 still
    await settle()
    const held = sat.pictures
    app.status = 503
    app.asked.length = 0
    sat.look(SAT_RAW_CHECK_MS, T0 + 31 * 60_000, LAT, LON)
    await settle()
    assert.deepEqual(app.asked, [rawUrl(LAT, LON, T0 + 15 * 60_000), satCapsUrl()], 'the pictures\' newest is older than the frame held: none is asked for')
    assert.equal(sat.pictures, held)
    app.newest = T0 + 15 * 60_000 // EUMETView has the same frame now: still none asked for, and it counts as an answer for the frame
    sat.look(SAT_RAW_CHECK_MS + SAT_CHECK_MS, T0 + 36 * 60_000, LAT, LON)
    await settle()
    assert.equal(sat.pictures, held)
    assert.equal(sat.usable(T0 + 36 * 60_000 + SAT_KEEP_MS, LAT, LON), held)
    app.newest = T0 + 30 * 60_000
    sat.look(SAT_RAW_CHECK_MS + 2 * SAT_CHECK_MS, T0 + 41 * 60_000, LAT, LON)
    await settle()
    assert.deepEqual([sat.pictures!.timeMs, sat.pictures!.raw], [T0 + 30 * 60_000, undefined], 'a newer frame, from the pictures')
    app.status = 200
    app.rawNewest = T0 + 30 * 60_000
    sat.look(SAT_RAW_CHECK_MS + 3 * SAT_CHECK_MS, T0 + 46 * 60_000, LAT, LON)
    await settle()
    assert.deepEqual([sat.pictures!.timeMs, sat.pictures!.raw !== undefined, sat.gen], [T0 + 30 * 60_000, true, 3], 'the same frame as numbers: it takes the pictures\' place')
  })
})

test('SatelliteSource with the server\'s route: a place the frame held does not serve asks the server for the other box at once; a frame forgotten is asked for again', async () => {
  const app = both()
  const sat = new SatelliteSource({ fetch: app, raw: RAW })
  sat.look(0, T0 + 30 * 60_000, LAT, LON)
  await settle()
  app.asked.length = 0
  sat.look(1000, T0 + 30 * 60_000, LAT + 1, LON)
  await settle()
  assert.deepEqual(app.asked, [], 'served')
  sat.look(2000, T0 + 30 * 60_000, LAT + 3, LON)
  await settle()
  assert.deepEqual(app.asked, [rawUrl(LAT + 3, LON)], 'the other box, whatever frame is held')
  assert.deepEqual(sat.pictures!.box, satBox(LAT + 3, LON))
  app.asked.length = 0
  sat.forget(sat.pictures!)
  sat.look(3000, T0 + 30 * 60_000, LAT + 3, LON)
  await settle()
  assert.deepEqual(app.asked, [rawUrl(LAT + 3, LON)])
  assert.equal(sat.gen, 3)
})

test('satBuffers, satBare, rawFrame: what a frame held hands to a worker (two pictures\' pixels, or the one answer), the frame without it, and the numbers of an answer; none of bytes that are not that frame', async () => {
  const app = both()
  const pictures = new SatelliteSource({ fetch: app })
  pictures.look(0, T0 + 20 * 60_000, LAT, LON)
  const raw = new SatelliteSource({ fetch: app, raw: RAW })
  raw.look(0, T0 + 30 * 60_000, LAT, LON)
  await settle()
  const [p, r] = [pictures.pictures!, raw.pictures!]
  assert.deepEqual(satBuffers(p), [p.mask.buffer, p.tops.buffer])
  assert.deepEqual(satBuffers(r), [r.raw!.buffer])
  for (const bare of [satBare(p), satBare(r)]) assert.deepEqual([satBuffers(bare), bare.mask.length, bare.tops.length], [[], 0, 0])
  assert.deepEqual([satBare(p).raw, satBare(r).raw!.length, satBare(r).timeMs, satBare(r).box], [undefined, 0, r.timeMs, r.box], 'still the server\'s frame, by its time and box')
  assert.equal(rawFrame(p), null, 'pictures are no numbers')
  assert.equal(rawFrame(satBare(r)), null)
  assert.equal(rawFrame({ ...r, timeMs: r.timeMs + 1 }), null, 'an answer of another frame than it is held as')
  assert.equal(rawFrame({ ...r, box: satBox(LAT + 3, LON) }), null)
  assert.equal(rawFrame({ ...r, raw: r.raw!.slice(0, 5000) }), null)
  assert.notEqual(rawFrame(r), null)
})
