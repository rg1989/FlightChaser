// server/main.wx.test.ts
// The weather over HTTP: /api/wx/model and /api/wx/sat on the real server (port 0), Open-Meteo and EUMETSAT from a fake fetch:
// nothing here reaches them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeSatCut } from '../shared/sat.ts'
import type { ModelGrid } from '../shared/wx.ts'
import { readServerConfig } from './config.ts'
import { SAT_PRODUCTS } from './eumetsat.ts'
import { encodeGrib2, type GribSpaceView } from './grib2.ts'
import { createServer } from './main.ts'
import { makeReplay } from './sources/replay.ts'
import { encodeZip } from './typeDb.ts'
import { modelGeo, modelPlaces, modelUrl } from './wx.ts'

const FILE = fileURLToPath(new URL('../data/fixtures/golden/recording-sample.jsonl', import.meta.url))

/** Open-Meteo's answer for n places: one object a place; 40 % cloud at 700 hPa everywhere. */
const answer = (n: number): unknown => Array.from({ length: n }, () => ({ elevation: 12, hourly: { time: [1791014400], cloud_cover_700hPa: [40] } }))

test('GET /api/wx/model?lat&lon: the model grid of the cell as JSON, shared by the next ask; 400 for a bad place; 502 when Open-Meteo is down and nothing is held, then a 503 with Retry-After (and retryAfterS in the body) while the failure is remembered', async (t) => {
  const asked: string[] = []
  let down = false
  const wxFetch = (async (url: string) => {
    asked.push(url)
    if (down) throw new Error('offline')
    return new Response(JSON.stringify(answer(new URL(url).searchParams.get('latitude')!.split(',').length)))
  }) as unknown as typeof fetch
  const cfg = { ...readServerConfig({ REPLAY_FILES: FILE }), staticDir: join(mkdtempSync(join(tmpdir(), 'fh-wx-')), 'dist') }
  let now = 2_000_000_000_000
  const app = createServer(cfg, { source: makeReplay({ files: cfg.replayFiles, nowMs: () => now }), nowMs: () => now, wxFetch })
  const base = await app.listen(0)
  t.after(() => app.close())
  type Body = ModelGrid & { error?: string; retryAfterS?: number }
  const get = async (q: string): Promise<{ status: number; type: string | null; retryAfter: string | null; body: Body }> => {
    const res = await fetch(`${base}/api/wx/model${q}`)
    return { status: res.status, type: res.headers.get('content-type'), retryAfter: res.headers.get('retry-after'), body: (await res.json()) as Body }
  }

  const a = await get('?lat=32.1&lon=34.9')
  assert.equal(a.status, 200)
  assert.match(a.type ?? '', /^application\/json/)
  assert.deepEqual([a.body.lat0, a.body.lon0, a.body.step, a.body.n, a.body.timeMs], [31.5, 34, 0.25, 7, 1791014400_000])
  assert.deepEqual(a.body.clouds.find((l) => l.hPa === 700)!.cover.slice(0, 3), [40, 40, 40])
  assert.deepEqual(asked, [modelUrl(modelPlaces(modelGeo('32.1', '34.9')))])
  assert.deepEqual((await get('?lat=32.4&lon=34.6')).body, a.body, 'the same cell')
  assert.equal(asked.length, 1, 'Open-Meteo is asked once for it')

  for (const q of ['', '?lat=32.1', '?lat=x&lon=1', '?lat=95&lon=0', '?lat=0&lon=200']) {
    const bad = await get(q)
    assert.equal(bad.status, 400, q)
    assert.match(bad.body.error ?? '', /lat and lon/)
    assert.equal(bad.body.retryAfterS, undefined, `${q}: nothing to wait for`)
  }
  assert.equal(asked.length, 1)

  down = true
  now += 60_000 // the clock the server keeps (nowMs) runs on
  const gone = await get('?lat=-33.9&lon=151.2')
  assert.equal(gone.status, 502)
  assert.equal(gone.retryAfter, null)
  assert.equal(gone.body.retryAfterS, undefined)
  assert.match(gone.body.error ?? '', /api\.open-meteo\.com: offline/)
  now += 10_000
  const again = await get('?lat=-33.9&lon=151.2')
  assert.equal(again.status, 503, 'the failure is remembered')
  assert.equal(again.retryAfter, '50', 'its own Retry-After: what is left of the 60 s')
  assert.equal(again.body.retryAfterS, 50, 'the same, in the body, for the client\'s own wait')
  assert.match(again.body.error ?? '', /failed/)
  assert.equal(asked.length, 2, 'Open-Meteo was not asked again')
  assert.equal((await get('?lat=32.1&lon=34.9')).status, 200, 'a cell held is still served')
})

test('GET /api/wx/sat?bbox&n: the satellite\'s frame over the box as bytes (gzipped for a client that takes it), 204 for the frame the client has, 400 for a bad box, 502 then 503 with Retry-After when EUMETSAT fails; 404 on a server with no key', async (t) => {
  const T = Date.UTC(2026, 9, 4, 10, 30)
  // The two products, as small as SEVIRI's grids allow: every pixel cloud, every block's height the number 10 (3,200 m).
  const view = (side: number, mid: number): GribSpaceView => ({ nx: side, ny: side, subLat: 0, subLon: 0, dx: side, dy: side, xp: mid, yp: mid, scan: 0xc0, nr: 6.6107 })
  const zips = {
    [SAT_PRODUCTS.mask]: encodeZip([{ name: 'clm.grb', data: encodeGrib2({ discipline: 3, timeMs: T, grid: view(3712, 1856), fields: [{ category: 0, parameter: 7, bits: 2, packed: new Uint8Array(3712 * 3712).fill(2) }] }), method: 8 }]),
    [SAT_PRODUCTS.top]: encodeZip([{ name: 'cth.grb', data: encodeGrib2({ discipline: 3, timeMs: T, grid: view(1237, 619), fields: [{ category: 1, parameter: 2, bits: 6, binScale: 5, decScale: -1, packed: new Uint8Array(1237 * 1237).fill(10) }] }), method: 8 }]),
  }
  const asked: string[] = []
  let down = false
  const wxFetch = (async (url: string) => {
    asked.push(url)
    const u = new URL(url)
    if (down) return new Response('{}', { status: 500 })
    if (u.pathname === '/token') return new Response(JSON.stringify({ access_token: 't', expires_in: 3200 }))
    if (u.pathname.includes('/search-products/')) return new Response(JSON.stringify({ features: [{ id: `product-${u.searchParams.get('pi') === SAT_PRODUCTS.mask ? 'mask' : 'top'}`, properties: { date: '2026-10-04T10:30:00Z/2026-10-04T10:30:00Z' } }] }))
    return new Response(zips[decodeURIComponent(u.pathname.split('/')[5]) as keyof typeof zips])
  }) as unknown as typeof fetch
  const base = { ...readServerConfig({ REPLAY_FILES: FILE }), staticDir: join(mkdtempSync(join(tmpdir(), 'fh-sat-')), 'dist') }
  let now = T + 20 * 60_000
  const serve = async (cfg: typeof base): Promise<string> => {
    const app = createServer(cfg, { source: makeReplay({ files: cfg.replayFiles, nowMs: () => now }), nowMs: () => now, wxFetch })
    t.after(() => app.close())
    return app.listen(0)
  }
  const warned = t.mock.method(console, 'warn', () => {})

  const none = await fetch(`${await serve(base)}/api/wx/sat?bbox=27.7533,29.4534,36.7467,40.0466&n=400`)
  assert.equal(none.status, 404)
  assert.match(((await none.json()) as { error: string }).error, /EUMETSAT_KEY and EUMETSAT_SECRET/)
  assert.equal(asked.length, 0, 'with no key, EUMETSAT is asked for nothing')

  const url = `${await serve({ ...base, eumetsat: { key: 'a-key', secret: 'a-secret' } })}/api/wx/sat`
  const res = await fetch(`${url}?bbox=27.7533,29.4534,36.7467,40.0466&n=400`) // (fetch takes gzip, and gives the bytes unzipped)
  assert.equal(res.status, 200)
  assert.deepEqual([res.headers.get('content-type'), res.headers.get('content-encoding'), res.headers.get('cache-control')], ['application/octet-stream', 'gzip', 'no-store'])
  assert.match(res.headers.get('server-timing') ?? '', /^decode;dur=[\d.]+, cut;dur=[\d.]+$/)
  assert.ok(Number(res.headers.get('content-length')) < 20_000, 'a sky all of one kind zips small')
  const cut = decodeSatCut(await res.arrayBuffer())!
  assert.deepEqual([cut.timeMs, cut.n, cut.box, cut.cloud[80_200], cut.seen[80_200], cut.topM[80_200]], [T, 400, [27.7533, 29.4534, 36.7467, 40.0466], 255, 1, 3200])
  assert.equal(asked.length, 5)

  const plain = await fetch(`${url}?bbox=27.7533,29.4534,36.7467,40.0466&n=16`, { headers: { 'accept-encoding': 'identity' } })
  assert.deepEqual([plain.status, plain.headers.get('content-encoding'), plain.headers.get('content-length')], [200, null, String(48 + 4 * 16 * 16)])
  const same = await fetch(`${url}?bbox=27.7533,29.4534,36.7467,40.0466&n=400&have=${T}`)
  assert.deepEqual([same.status, (await same.arrayBuffer()).byteLength], [204, 0])
  for (const q of ['', '?bbox=1,2,3&n=400', '?bbox=0,0,5,5', '?bbox=0,0,5,5&n=4000', '?bbox=0,0,5,5&n=16&have=x']) assert.equal((await fetch(`${url}${q}`)).status, 400, q)
  assert.equal(asked.length, 5, 'the frame held answered them all')

  down = true
  now = T + 30 * 60_000 // the next frame can be there: EUMETSAT is asked, and fails
  const failed = await fetch(`${url}?bbox=27.7533,29.4534,36.7467,40.0466&n=400&have=${T}`)
  assert.equal(failed.status, 502)
  assert.match(((await failed.json()) as { error: string }).error, /api\.eumetsat\.int: HTTP 500/)
  now += 15_000
  const waiting = await fetch(`${url}?bbox=27.7533,29.4534,36.7467,40.0466&n=400&have=${T}`)
  assert.deepEqual([waiting.status, waiting.headers.get('retry-after'), ((await waiting.json()) as { retryAfterS: number }).retryAfterS], [503, '45', 45])
  assert.equal(warned.mock.callCount(), 1, 'one warning')
  assert.doesNotMatch(String(warned.mock.calls[0].arguments[0]), /a-key|a-secret/)
})
