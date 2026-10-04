// server/eumetsat.test.ts
// The satellite's raw products through the server: products built here (encodeGrib2, encodeZip: SEVIRI's own grids, a small sky
// painted on them), EUMETSAT's API from a fake fetch on a fake clock, and made-up credentials. Nothing here touches the network.
// The last tests read the two products recorded on 2026-10-04 with one's own key, when they are there (data/eumetsat/, git-ignored).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { decodeSatCut, type SatCut } from '../shared/sat.ts'
import { SAT_LIMITS, SAT_PRODUCTS, cutFrame, decodeProducts, makeEumetsat, satQuery } from './eumetsat.ts'
import { SEVIRI, seviriPixel } from './geos.ts'
import { encodeGrib2, type GribSpaceView } from './grib2.ts'
import { encodeZip } from './typeDb.ts'
import { WxError } from './wx.ts'

const MIN = 60_000
const T = Date.UTC(2026, 9, 4, 10, 30) // a frame's time
const KEY = 'made-up-key-0123456789'
const SECRET = 'made-up-secret-abcdefghij'
const N = SEVIRI.n
const B = SEVIRI.blocks
const view = (side: number, mid: number, dx: number, dy: number, subLon = 0): GribSpaceView => ({ nx: side, ny: side, subLat: 0, subLon, dx, dy, xp: mid, yp: mid, scan: 0xc0, nr: 6.6107 })
const MASK_GRID = view(N, 1856, 3622, 3610)
const TOP_GRID = view(B, 619, 1207, 1203)
const TEL_AVIV = [32.0853, 34.7818] as const
const NO_DATA = [35.0, 33.0] as const // a place the sky painted here has no data at

const idOf = (kind: 'mask' | 'top', timeMs: number): string => `MSG3-SEVI-${kind === 'mask' ? 'MSGCLMK' : 'MSGCLTH'}-0100-0100-${new Date(timeMs).toISOString().replace(/[-:T]|\.\d+Z$/g, '')}.000000000Z-NA`
const zipOf = (id: string, grb: Uint8Array): Uint8Array<ArrayBuffer> =>
  encodeZip([{ name: `${id}.grb`, data: grb, method: 8, descriptor: true }, { name: 'EOPMetadata.xml', data: new TextEncoder().encode('<eum:EarthObservation/>'), method: 8, descriptor: true }, { name: 'manifest.xml', data: new TextEncoder().encode('<informationPackage/>'), method: 8, descriptor: true }])

/**
 * A painted sky on SEVIRI's grid: clear land everywhere, a square of cloud of 13 pixels a side round Tel Aviv's pixel, with a
 * height (number 10: 3,200 m; quality 1) in the blocks of the square's middle 7 pixels only, and a square of no data round NO_DATA's pixel.
 */
function paintedSky(): { mask: Uint8Array; packed: number[]; quality: number[]; bitmap: Uint8Array } {
  const mask = new Uint8Array(N * N).fill(1)
  const bitmap = new Uint8Array(B * B)
  const square = (place: readonly [number, number], half: number, paint: (col: number, row: number) => void): void => {
    const [c, r] = seviriPixel(place[0], place[1], 0)!.map(Math.round)
    for (let row = r - half; row <= r + half; row++) for (let col = c - half; col <= c + half; col++) paint(col, row)
  }
  square(TEL_AVIV, 6, (col, row) => void (mask[row * N + col] = 2))
  square(NO_DATA, 6, (col, row) => void (mask[row * N + col] = 3))
  square(TEL_AVIV, 3, (col, row) => void (bitmap[Math.floor(row / 3) * B + Math.floor(col / 3)] = 1))
  const count = bitmap.reduce((n, b) => n + b, 0)
  return { mask, packed: new Array<number>(count).fill(10), quality: new Array<number>(count).fill(1), bitmap }
}

const built = new Map<string, Uint8Array<ArrayBuffer>>()
/** A product's zip as the Data Store gives it, of the painted sky, for a frame's time (built once for each). */
function product(kind: 'mask' | 'top', timeMs: number, o: { grid?: GribSpaceView; noHeights?: boolean } = {}): Uint8Array<ArrayBuffer> {
  const key = `${kind}|${timeMs}|${JSON.stringify(o)}`
  let zip = built.get(key)
  if (zip !== undefined) return zip
  const sky = paintedSky()
  const header = new Uint8Array(272)
  const grb = kind === 'mask'
    ? encodeGrib2({ header, discipline: 3, timeMs, grid: o.grid ?? MASK_GRID, fields: [{ category: 0, parameter: 7, bits: 2, packed: o.grid === undefined ? sky.mask : new Uint8Array(o.grid.nx * o.grid.ny) }] })
    : encodeGrib2({
      header, discipline: 3, timeMs, grid: o.grid ?? TOP_GRID,
      fields: [
        ...(o.noHeights === true ? [] : [{ category: 1, parameter: 2, bits: 6, binScale: 5, decScale: -1, packed: sky.packed, bitmap: sky.bitmap }]),
        { category: 1, parameter: 3, bits: 2, packed: sky.quality, bitmap: o.noHeights === true ? sky.bitmap : 'previous' as const },
      ],
    })
  zip = zipOf(idOf(kind, timeMs), grb)
  built.set(key, zip)
  return zip
}

// ---- the products read, the frame cut ----

test('satQuery: a box and a size; anything else is a 400', () => {
  assert.deepEqual(satQuery('27.7533,29.4534,36.7467,40.0466', '400'), { box: [27.7533, 29.4534, 36.7467, 40.0466], n: 400 })
  assert.deepEqual(satQuery('-5,170,5,190', '16'), { box: [-5, 170, 5, 190], n: 16 }, 'a box across the antimeridian runs on past 180')
  for (const [bbox, n] of [[null, '400'], ['', '400'], ['1,2,3', '400'], ['a,b,c,d', '400'], ['10,0,5,5', '400'], ['0,5,5,0', '400'], ['-91,0,0,1', '400'], ['0,0,91,1', '400'], ['0,0,30,10', '400'], ['0,0,10,70', '400'], ['0,-200,5,-190', '400'],
    ['0,0,5,5', null], ['0,0,5,5', ''], ['0,0,5,5', '0'], ['0,0,5,5', '1'], ['0,0,5,5', '12.5'], ['0,0,5,5', '513'], ['0,0,5,5', 'x']] as const) {
    assert.throws(() => satQuery(bbox, n), (e: unknown) => e instanceof WxError && e.status === 400, `${bbox} | ${n}`)
  }
})

test('decodeProducts, cutFrame: the frame of two products, cut out over a box: cloud where the mask has cloud, a top where the heights\' block has one, not seen where there is no data', async () => {
  const frame = await decodeProducts(product('mask', T), product('top', T))
  assert.deepEqual([frame.timeMs, frame.subLon, frame.topStepM, frame.topOffsetM], [T, 0, 320, 0])
  assert.equal(frame.bytes, product('mask', T).length + product('top', T).length)
  const n = 90 // a tenth of a degree a cell
  const box = [27.5, 30.5, 36.5, 39.5] as const
  const cut = cutFrame(frame, box, n)
  assert.deepEqual([cut.timeMs, cut.box, cut.n, cut.cloud.length, cut.seen.length, cut.topM.length], [T, box, n, n * n, n * n, n * n])
  const cell = (lat: number, lon: number): number => Math.floor(((box[2] - lat) / (box[2] - box[0])) * n) * n + Math.floor(((lon - box[1]) / (box[3] - box[1])) * n)
  const at = (lat: number, lon: number): number[] => [cut.cloud[cell(lat, lon)], cut.seen[cell(lat, lon)], cut.topM[cell(lat, lon)]]
  assert.deepEqual(at(...TEL_AVIV), [255, 1, 3200], 'cloud with its top: the number 10 in steps of 320 m')
  assert.deepEqual(at(30.0, 37.0), [0, 1, 0], 'clear, and seen')
  assert.deepEqual(at(...NO_DATA), [0, 0, 0], 'no data: not seen')
  // The cloud's square is 13 pixels a side: about 0.57° by 0.47° there, 27 cells of a tenth of a degree. Its heights are the blocks
  // of its middle 7 pixels: 9 pixels a side, 0.40° by 0.32°.
  const cloudy = cut.cloud.reduce((s, c) => s + (c === 255 ? 1 : 0), 0)
  const topped = cut.topM.reduce((s, m) => s + (m > 0 ? 1 : 0), 0)
  assert.ok(cloudy >= 22 && cloudy <= 32, `${cloudy} cloudy cells`)
  assert.ok(topped >= 9 && topped <= 17 && topped < cloudy, `${topped} cells with a top`)
  assert.ok(cut.cloud.every((c) => c === 0 || c === 255), 'a cell is cloud or not: the nearest pixel, not a blend')
  assert.equal(cut.seen.reduce((s, v) => s + v, 0) < n * n, true)
  // Past the Earth's edge nothing is seen.
  const edge = cutFrame(frame, [-5, 82, 5, 92], 8)
  assert.ok(edge.seen.every((v) => v === 0) && edge.cloud.every((v) => v === 0))
})

test('decodeProducts: products that are not SEVIRI\'s mask and heights of one frame are refused: another grid, another frame, no height field, no GRIB file in the zip', async () => {
  const no = (what: Promise<unknown>, message: RegExp): Promise<void> => assert.rejects(what, message)
  await no(decodeProducts(product('mask', T, { grid: view(100, 50, 97, 97) }), product('top', T)), /cloud mask.*grid/)
  await no(decodeProducts(product('mask', T), product('top', T, { grid: view(B, 618.488, 1207, 1203) })), /cloud top height.*grid/)
  await no(decodeProducts(product('mask', T), product('top', T + 15 * MIN)), /frame/)
  await no(decodeProducts(product('mask', T), product('top', T, { noHeights: true })), /no cloud top height/)
  await no(decodeProducts(product('top', T), product('top', T)), /no cloud mask/)
  await no(decodeProducts(encodeZip([{ name: 'manifest.xml', data: new Uint8Array(3), method: 0 }]), product('top', T)), /no \.grb/)
  await no(decodeProducts(new TextEncoder().encode('<html>Service unavailable</html>'), product('top', T)), /not a zip/)
})

// ---- EUMETSAT's API ----

interface Ask { url: string; method: string; auth: string | null; agent: string | null; body: string }

/** EUMETSAT's API as the tests need it: a token, the newest products of the two collections, their zips. */
function upstream() {
  const asked: Ask[] = []
  const s = {
    tokens: 0, // tokens given out; the last one is the valid one
    expiresIn: 3200,
    listed: { mask: [T], top: [T] } as Record<'mask' | 'top', number[]>, // the frames each collection lists, the newest first
    searchStatus: 200, tokenStatus: 200, downloadStatus: 200,
    hold: null as Promise<void> | null, // a search waits for this
  }
  const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    asked.push({ url, method: init.method ?? 'GET', auth: headers.get('authorization'), agent: headers.get('user-agent'), body: typeof init.body === 'string' ? init.body : '' })
    const u = new URL(url)
    assert.equal(u.origin, 'https://api.eumetsat.int')
    if (u.pathname === '/token') {
      if (s.tokenStatus !== 200) return json({ error: 'invalid_client' }, s.tokenStatus)
      return json({ access_token: `token-${++s.tokens}`, scope: 'default', token_type: 'Bearer', expires_in: s.expiresIn })
    }
    if (u.pathname === '/data/search-products/1.0.0/os') {
      if (s.hold !== null) await s.hold
      if (s.searchStatus !== 200) return json({}, s.searchStatus)
      const kind = u.searchParams.get('pi') === SAT_PRODUCTS.mask ? 'mask' : 'top'
      const iso = (t: number): string => new Date(t).toISOString().replace('.000Z', 'Z')
      return json({ type: 'FeatureCollection', totalResults: 601_296, features: s.listed[kind].slice(0, Number(u.searchParams.get('c'))).map((t) => ({ type: 'Feature', id: idOf(kind, t), properties: { identifier: idOf(kind, t), date: `${iso(t)}/${iso(t)}` } })) })
    }
    const m = /^\/data\/download\/1\.0\.0\/collections\/([^/]+)\/products\/([^/]+)$/.exec(u.pathname)
    if (m !== null) {
      if (s.downloadStatus !== 200) return json({}, s.downloadStatus)
      if (headers.get('authorization') !== `Bearer token-${s.tokens}`) return json({}, 401)
      const kind = decodeURIComponent(m[1]) === SAT_PRODUCTS.mask ? 'mask' : 'top'
      const t = s.listed[kind].find((x) => idOf(kind, x) === decodeURIComponent(m[2]))
      return t === undefined ? json({}, 404) : new Response(product(kind, t), { headers: { 'content-type': 'application/zip' } })
    }
    return json({}, 404)
  }) as unknown as typeof fetch
  return { asked, s, fetchFn }
}

const SEARCH = (kind: 'mask' | 'top'): string => `https://api.eumetsat.int/data/search-products/1.0.0/os?format=json&pi=${encodeURIComponent(SAT_PRODUCTS[kind])}&si=0&c=2&sort=start,time,0`
const DOWNLOAD = (kind: 'mask' | 'top', t: number): string => `https://api.eumetsat.int/data/download/1.0.0/collections/${encodeURIComponent(SAT_PRODUCTS[kind])}/products/${idOf(kind, t)}`
const BOX = '27.7533,29.4534,36.7467,40.0466' // the frame the page asks for round Tel Aviv
const kinds = (asked: readonly Ask[]): string[] => asked.map((a) => (a.url.endsWith('/token') ? 'token' : a.url.includes('/search-products/') ? 'search' : 'download'))
const is = (status: number, message?: RegExp) => (e: unknown): boolean => e instanceof WxError && e.status === status && (message === undefined || message.test(e.message))

/** A server's client of the API on a clock that starts 20 minutes after the frame's time (its products come 14 minutes after it). */
function client() {
  const up = upstream()
  const clock = { now: T + 20 * MIN }
  const warnings: string[] = []
  const sat = makeEumetsat({ key: KEY, secret: SECRET, fetchFn: up.fetchFn, nowMs: () => clock.now, warn: (message) => warnings.push(message) })
  const frameOf = (a: { bytes: Uint8Array } | null): SatCut => decodeSatCut(a!.bytes.slice().buffer)!
  return { ...up, clock, sat, frameOf, warnings }
}

test('makeEumetsat: the first ask searches both collections, takes a token with the key and the secret, downloads the two products with the token, and answers the frame cut out over the box', async () => {
  const { asked, sat, frameOf } = client()
  const a = await sat.cut(BOX, '400', null)
  assert.deepEqual(kinds(asked), ['search', 'search', 'token', 'download', 'download'])
  assert.deepEqual(asked.map((x) => x.url), [SEARCH('mask'), SEARCH('top'), 'https://api.eumetsat.int/token', DOWNLOAD('mask', T), DOWNLOAD('top', T)])
  assert.deepEqual(asked.map((x) => x.method), ['GET', 'GET', 'POST', 'GET', 'GET'])
  assert.deepEqual(asked.map((x) => x.auth), [null, null, `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`, 'Bearer token-1', 'Bearer token-1'], 'the key and the secret go to the token\'s address only, the token to the downloads only')
  assert.equal(asked[2].body, 'grant_type=client_credentials')
  assert.ok(asked.every((x) => x.agent === 'FlightHopper/0.1'), 'no contact of the user\'s in the requests: the key says who asks')
  for (const x of asked) for (const secret of [KEY, SECRET, 'token-1']) assert.ok(!x.url.includes(secret), 'no credential in a URL')
  const f = frameOf(a)
  assert.deepEqual([f.timeMs, f.n, f.box], [T, 400, [27.7533, 29.4534, 36.7467, 40.0466]])
  const cell = Math.floor(((36.7467 - TEL_AVIV[0]) / (36.7467 - 27.7533)) * 400) * 400 + Math.floor(((TEL_AVIV[1] - 29.4534) / (40.0466 - 29.4534)) * 400)
  assert.deepEqual([f.cloud[cell], f.seen[cell], f.topM[cell]], [255, 1, 3200])
  assert.equal(a!.timeMs, T)
  assert.ok(a!.decodeMs > 0 && a!.cutMs >= 0)
})

test('makeEumetsat: a frame held is served with nothing asked until the next one can be there (13 minutes after its own time), then the collections are searched once a minute; a client that has the frame is told so', async () => {
  const { asked, s, clock, sat, frameOf } = client()
  assert.deepEqual([SAT_LIMITS.frameMs, SAT_LIMITS.soonestMs, SAT_LIMITS.searchGapMs], [15 * MIN, 13 * MIN, MIN])
  await sat.cut(BOX, '400', null)
  assert.equal(asked.length, 5)
  clock.now = T + 21 * MIN
  assert.equal(frameOf(await sat.cut('20,20,29,29', '64', null)).timeMs, T, 'another box of the same frame')
  assert.equal(await sat.cut(BOX, '400', String(T)), null, 'the client has this frame')
  clock.now = T + 28 * MIN - 1
  await sat.cut(BOX, '400', null)
  assert.equal(asked.length, 5, 'nothing asked: the 10:45 frame is not there before 10:58')
  clock.now = T + 28 * MIN
  assert.equal(await sat.cut(BOX, '400', String(T)), null)
  assert.deepEqual(kinds(asked).slice(5), ['search', 'search'], 'searched, and the newest is still the frame held: no download')
  clock.now = T + 28 * MIN + 59_000
  await sat.cut(BOX, '400', null)
  assert.equal(asked.length, 7, 'not searched again within the minute')
  s.listed = { mask: [T + 15 * MIN, T], top: [T + 15 * MIN, T] }
  clock.now = T + 29 * MIN
  const next = await sat.cut(BOX, '400', String(T))
  assert.equal(frameOf(next).timeMs, T + 15 * MIN, 'the next frame')
  assert.deepEqual(kinds(asked).slice(7), ['search', 'search', 'download', 'download'], 'the token is used again: none is asked for')
  assert.deepEqual(asked.slice(9).map((x) => x.url), [DOWNLOAD('mask', T + 15 * MIN), DOWNLOAD('top', T + 15 * MIN)])
  assert.equal(await sat.cut(BOX, '400', String(T + 15 * MIN)), null)
  assert.equal(asked.length, 11)
})

test('makeEumetsat: a token is asked for again only shortly before it runs out', async () => {
  // The token comes at 10:50 for 3,200 s: it is used until a minute before 11:43:20.
  for (const [spareS, tokens] of [[61, 1], [59, 2]] as const) {
    const { asked, s, clock, sat } = client()
    await sat.cut(BOX, '400', null)
    s.listed = { mask: [T + 30 * MIN], top: [T + 30 * MIN] }
    clock.now = T + 45 * MIN
    await sat.cut(BOX, '400', null)
    assert.equal(kinds(asked).filter((k) => k === 'token').length, 1, 'the next frame comes with the same token')
    s.listed = { mask: [T + 45 * MIN], top: [T + 45 * MIN] }
    clock.now = T + 20 * MIN + 3200_000 - spareS * 1000
    await sat.cut(BOX, '400', null)
    assert.equal(kinds(asked).filter((k) => k === 'token').length, tokens, `${spareS} s before it runs out`)
    assert.equal(asked.at(-1)!.auth, `Bearer token-${tokens}`)
  }
})

test('makeEumetsat: when one collection lists a newer frame than the other (they are published 20 s apart), the newest frame both have is the one taken', async () => {
  const { asked, s, clock, sat, frameOf } = client()
  s.listed = { mask: [T + 15 * MIN, T], top: [T, T - 15 * MIN] }
  clock.now = T + 29 * MIN
  assert.equal(frameOf(await sat.cut(BOX, '400', null)).timeMs, T)
  assert.deepEqual(asked.slice(3).map((x) => x.url), [DOWNLOAD('mask', T), DOWNLOAD('top', T)])
  s.listed.top = [T + 15 * MIN, T]
  clock.now += MIN
  assert.equal(frameOf(await sat.cut(BOX, '400', String(T))).timeMs, T + 15 * MIN)
})

test('makeEumetsat: asks that come together share one round of requests', async () => {
  const { asked, s, sat, frameOf } = client()
  let release = (): void => {}
  s.hold = new Promise((done) => (release = done))
  const both = Promise.all([sat.cut(BOX, '400', null), sat.cut('20,20,29,29', '64', null)])
  release()
  const [a, b] = await both
  assert.deepEqual([frameOf(a).n, frameOf(b).n], [400, 64])
  assert.deepEqual(kinds(asked), ['search', 'search', 'token', 'download', 'download'])
})

test('makeEumetsat: a failed search is a 502 that names the host and the status, then a 503 with the seconds to wait while it is remembered (a minute), with nothing asked; then it is asked again', async () => {
  const { asked, s, clock, sat, frameOf, warnings } = client()
  s.searchStatus = 500
  await assert.rejects(sat.cut(BOX, '400', null), is(502, /^api\.eumetsat\.int: HTTP 500$/))
  assert.deepEqual(kinds(asked), ['search', 'search'])
  clock.now += 20_000
  await assert.rejects(sat.cut(BOX, '400', null), (e: unknown) => is(503, /failed/)(e) && (e as WxError).retryAfterS === 40)
  assert.equal(asked.length, 2)
  clock.now += 40_000
  await assert.rejects(sat.cut(BOX, '400', null), is(502))
  assert.equal(asked.length, 4, 'asked again after the minute')
  assert.deepEqual(warnings, ['sat: api.eumetsat.int: HTTP 500; the pages keep to EUMETView\'s pictures meanwhile'], 'one warning for the whole outage')
  s.searchStatus = 200
  clock.now += 60_000
  assert.equal(frameOf(await sat.cut(BOX, '400', null)).timeMs, T)
  s.searchStatus = 500
  s.listed = { mask: [T + 15 * MIN], top: [T + 15 * MIN] }
  clock.now = T + 30 * MIN
  await assert.rejects(sat.cut(BOX, '400', null), is(502))
  assert.equal(warnings.length, 2, 'and one for the next')
})

test('makeEumetsat: an answer that does not come (the network down, a timeout) is a 502 with what fetch said', async () => {
  const sat = makeEumetsat({ key: KEY, secret: SECRET, fetchFn: (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch, nowMs: () => T + 20 * MIN, warn: () => {} })
  await assert.rejects(sat.cut(BOX, '400', null), is(502, /^api\.eumetsat\.int: fetch failed$/))
})

test('makeEumetsat: a refused key is a 502 that names the two settings and shows neither, and the token is not asked for again for half an hour', async () => {
  const { asked, s, clock, sat, frameOf, warnings } = client()
  s.tokenStatus = 401
  let message = ''
  await assert.rejects(sat.cut(BOX, '400', null), (e: unknown) => {
    message = (e as Error).message
    return is(502, /EUMETSAT_KEY and EUMETSAT_SECRET/)(e)
  })
  for (const said of [message, ...warnings]) assert.ok(!said.includes(KEY) && !said.includes(SECRET) && !said.includes(Buffer.from(`${KEY}:${SECRET}`).toString('base64')), 'neither in the answer nor in the log')
  assert.equal(warnings.length, 1)
  assert.deepEqual(kinds(asked), ['search', 'search', 'token'])
  clock.now += 29 * MIN
  await assert.rejects(sat.cut(BOX, '400', null), (e: unknown) => is(503)(e) && (e as WxError).retryAfterS === 60)
  assert.equal(asked.length, 3, 'nothing asked meanwhile')
  s.tokenStatus = 200
  clock.now += MIN
  assert.equal(frameOf(await sat.cut(BOX, '400', null)).timeMs, T)
  assert.deepEqual(kinds(asked).slice(3), ['search', 'search', 'token', 'download', 'download'])
})

test('makeEumetsat: a download the token is refused for drops the token, and the next try takes a new one; a download that is no product is a 502 too', async () => {
  const { asked, s, clock, sat, frameOf } = client()
  await sat.cut(BOX, '400', null)
  s.tokens = 7 // the API has forgotten token-1
  s.listed = { mask: [T + 15 * MIN], top: [T + 15 * MIN] }
  clock.now = T + 29 * MIN
  await assert.rejects(sat.cut(BOX, '400', null), is(502, /^api\.eumetsat\.int: HTTP 401$/))
  clock.now += MIN
  assert.equal(frameOf(await sat.cut(BOX, '400', null)).timeMs, T + 15 * MIN)
  assert.deepEqual(kinds(asked).slice(-5), ['search', 'search', 'token', 'download', 'download'])
  assert.equal(asked.at(-1)!.auth, 'Bearer token-8')
  s.downloadStatus = 503
  s.listed = { mask: [T + 30 * MIN], top: [T + 30 * MIN] }
  clock.now = T + 44 * MIN
  await assert.rejects(sat.cut(BOX, '400', null), is(502, /HTTP 503/))
  clock.now += 30_000
  await assert.rejects(sat.cut(BOX, '400', String(T + 15 * MIN)), is(503), 'a failure is the answer also to a client that has the frame held: it falls back for this round')
})

test('makeEumetsat: the last two frames are kept, the older ones dropped', async () => {
  const { s, clock, sat } = client()
  for (let k = 0; k < 4; k++) {
    s.listed = { mask: [T + k * 15 * MIN], top: [T + k * 15 * MIN] }
    clock.now = T + k * 15 * MIN + 20 * MIN
    await sat.cut(BOX, '400', null)
  }
  assert.deepEqual(sat.held(), [T + 45 * MIN, T + 30 * MIN])
})

test('makeEumetsat: a bad box or size is a 400 before anything is asked', async () => {
  const { asked, sat } = client()
  await assert.rejects(sat.cut('1,2,3', '400', null), is(400))
  await assert.rejects(sat.cut(BOX, '4000', null), is(400))
  await assert.rejects(sat.cut(BOX, '400', 'yesterday'), is(400))
  assert.equal(asked.length, 0)
})

// ---- the recorded products ----

const recorded = (name: string): string => fileURLToPath(new URL(`../data/eumetsat/${name}`, import.meta.url))
const CLM = recorded('clm-20261004T1030Z.zip')
const CTH = recorded('cth-20261004T1030Z.zip')

test('decodeProducts, cutFrame: the frame of 2026-10-04 10:30 UTC as the Data Store gave it, cut out round Tel Aviv: the land is land, the sea is sea, the cloud has tops', { skip: !(existsSync(CLM) && existsSync(CTH)) && 'no recorded products (data/eumetsat/)' }, async (t) => {
  const frame = await decodeProducts(new Uint8Array(readFileSync(CLM)), new Uint8Array(readFileSync(CTH)))
  assert.deepEqual([frame.timeMs, frame.subLon, frame.topStepM, frame.topOffsetM, frame.bytes], [T, 0, 320, 0, 576_812 + 451_108])
  const box = [27.7533, 29.4534, 36.7467, 40.0466] as const
  const t0 = performance.now()
  const cut = cutFrame(frame, box, 400)
  t.diagnostic(`the two products unzipped and read in ${frame.decodeMs.toFixed(0)} ms; 400 × 400 cells cut out in ${(performance.now() - t0).toFixed(1)} ms`)
  const cell = (lat: number, lon: number): number => Math.floor(((box[2] - lat) / (box[2] - box[0])) * 400) * 400 + Math.floor(((lon - box[1]) / (box[3] - box[1])) * 400)
  const at = (lat: number, lon: number): number[] => [cut.cloud[cell(lat, lon)], cut.seen[cell(lat, lon)]]
  // What the mask said there at 10:30 (its own classes, read pixel by pixel beforehand): the deserts and the sea were clear.
  for (const [name, lat, lon] of [['the Sinai', 29.5, 34.0], ['the Negev', 30.8, 34.8], ['the Nile delta', 30.8, 31.0], ['Jordan', 31.0, 36.5], ['the sea south of Cyprus', 33.5, 32.5]] as const) assert.deepEqual(at(lat, lon), [0, 1], name)
  assert.deepEqual(at(34.95, 32.9), [255, 1], 'cloud over the Troodos')
  assert.ok(cut.topM[cell(34.95, 32.9)] >= 320, 'with a top')
  const unseen = cut.seen.reduce((s, v) => s + (v === 0 ? 1 : 0), 0)
  assert.ok(unseen < 1600, `${unseen} cells with no data: under 1 % of the box (the product leaves a pixel out here and there)`)
  let cloudy = 0
  let topped = 0
  let highest = 0
  for (let i = 0; i < cut.cloud.length; i++) {
    if (cut.cloud[i] === 255) cloudy++
    if (cut.topM[i] > 0) topped++
    highest = Math.max(highest, cut.topM[i])
    assert.ok(cut.topM[i] % 320 === 0)
  }
  t.diagnostic(`cloud in ${cloudy} of 160,000 cells, a top in ${topped}, the highest ${highest} m, no data in ${unseen}`)
  assert.ok(cloudy > 16_000 && cloudy < 80_000 && topped > 8_000 && highest <= 15_040)
})
