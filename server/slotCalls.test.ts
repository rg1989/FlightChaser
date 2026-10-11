// server/slotCalls.test.ts
// The callsigns at a half hour's start from the start of its file: a fake adsb.lol that serves parts of gzipped files. No network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { SLOT_MS } from '../shared/history.ts'
import { encodeHeatmap, type HeatIdentIn, type HeatRecordIn } from './heatmap.ts'
import { heatmapUrl } from './historyStore.ts'
import { CALL_SLICES, SlotCallsStore } from './slotCalls.ts'

const NOW = Date.UTC(2026, 9, 11, 12, 10)
const SLOT = Date.UTC(2026, 9, 10, 4, 0)
const OLDEST = Date.UTC(2026, 8, 1)

/** A half hour of `slices` slices: each has one ident (CS<i>) and `fill` positions. */
function file(slices: number, fill: number, extra: (HeatIdentIn | HeatRecordIn)[] = []): Uint8Array {
  return encodeHeatmap(Array.from({ length: slices }, (_, i) => ({
    tMs: SLOT + i * 10_000,
    records: [
      { hex: (0x100000 + i).toString(16), callsign: `CS${i}`, squawk: null },
      ...(i === 0 ? extra : []),
      // Positions that do not compress to nothing: a part of the file then holds a part of its slices.
      ...Array.from({ length: fill }, (_, k) => ({ hex: (0x200000 + k).toString(16), lat: ((k * 7919 + i * 104729) % 170000) / 1000 - 85, lon: ((k * 15485863 + i * 32452843) % 350000) / 1000 - 175, alt: (k * 37) % 40000, gs: (k * 13) % 500 })),
    ],
  })))
}

/** A fake adsb.lol: the gzip stream of each file by URL, cut to the Range asked for (as adsb.lol does; no Content-Encoding, so the store undoes it). */
function upstream(files: Record<string, Uint8Array | number>): { fetchFn: typeof fetch; asked: { url: string; range: string | null }[] } {
  const asked: { url: string; range: string | null }[] = []
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const range = new Headers(init?.headers).get('range')
    asked.push({ url, range })
    const f = files[url]
    if (f === undefined) return new Response('', { status: 404 })
    if (typeof f === 'number') return new Response('', { status: f })
    const gz = gzipSync(f)
    const last = Number(/bytes=0-(\d+)/.exec(range ?? '')?.[1] ?? gz.length - 1)
    const part = gz.subarray(0, Math.min(gz.length, last + 1))
    return new Response(part, { status: 206, headers: { 'content-range': `bytes 0-${part.length - 1}/${gz.length}`, 'content-length': String(part.length) } })
  }) as typeof fetch
  return { fetchFn, asked }
}

const store = (up: ReturnType<typeof upstream>, o: Partial<ConstructorParameters<typeof SlotCallsStore>[0]> = {}): SlotCallsStore =>
  new SlotCallsStore({ base: 'https://x', userAgent: 'test', fetchFn: up.fetchFn, nowMs: () => NOW, oldestSlotMs: () => OLDEST, ...o })

test('at: the callsigns of the first slices from the file\'s start, asked with a Range; kept after', async () => {
  const up = upstream({ [heatmapUrl('https://x', SLOT)]: file(40, 50, [{ hex: '471f67', callsign: 'WMT7403 ', squawk: '5541' }]) })
  const s = store(up)
  const calls = await s.at(SLOT)
  assert.ok(typeof calls !== 'string')
  assert.deepEqual(calls.hexes('WMT7403'), ['471f67'])
  assert.deepEqual(calls.hexes('CS0'), ['100000'])
  assert.deepEqual(calls.hexes(`CS${CALL_SLICES - 1}`), [(0x100000 + CALL_SLICES - 1).toString(16)])
  assert.deepEqual(calls.hexes(`CS${CALL_SLICES}`), []) // past the slices read
  assert.equal(up.asked.length, 1)
  assert.match(up.asked[0].range ?? '', /^bytes=0-\d+$/)
  assert.equal(await s.at(SLOT), calls) // kept: no second request
  assert.equal(up.asked.length, 1)
  assert.ok(s.bytes > 0)
})

test('at: a part that holds too few slices is asked for once more, longer; a short file is read whole', async () => {
  // 1,600 positions a slice do not compress much: the first part ends within the first slices.
  const busy = upstream({ [heatmapUrl('https://x', SLOT)]: file(12, 20_000) })
  const calls = await store(busy).at(SLOT)
  assert.ok(typeof calls !== 'string')
  assert.equal(busy.asked.length, 2)
  assert.ok(Number(/-(\d+)$/.exec(busy.asked[1].range!)![1]) > Number(/-(\d+)$/.exec(busy.asked[0].range!)![1]))
  assert.ok(calls.slices >= 2)
  // A file with fewer slices than are read (it ends there): one request, no second.
  const short = upstream({ [heatmapUrl('https://x', SLOT)]: file(3, 5) })
  const few = await store(short).at(SLOT)
  assert.ok(typeof few !== 'string')
  assert.equal(few.slices, 3)
  assert.equal(short.asked.length, 1)
})

test('at: no file is missing (remembered), a failure is unavailable (asked again), the future and the too old ask nothing', async () => {
  const up = upstream({ [heatmapUrl('https://x', SLOT + SLOT_MS)]: 503 })
  const s = store(up)
  assert.equal(await s.at(SLOT), 'missing')
  assert.equal(await s.at(SLOT), 'missing')
  assert.equal(up.asked.length, 1) // the 404 is remembered
  assert.equal(await s.at(SLOT + SLOT_MS), 'unavailable')
  assert.equal(await s.at(SLOT + SLOT_MS), 'unavailable')
  assert.equal(up.asked.length, 3) // a failure is not
  assert.equal(await s.at(NOW), 'missing') // not a half hour's start
  assert.equal(await s.at(Date.UTC(2026, 9, 11, 12, 0)), 'unavailable') // not published yet
  assert.equal(await s.at(OLDEST - SLOT_MS), 'missing') // older than adsb.lol keeps
  assert.equal(up.asked.length, 3)
})

test('at: a file the history store holds is read in place of a download; asks for one slot at once share one download', async () => {
  const up = upstream({ [heatmapUrl('https://x', SLOT)]: file(10, 5) })
  const held = store(up, { held: (slotMs) => (slotMs === SLOT ? file(10, 5, [{ hex: 'abcdef', callsign: 'HELD1', squawk: null }]) : null) })
  assert.equal(held.has(SLOT), true)
  const a = await held.at(SLOT)
  assert.ok(typeof a !== 'string')
  assert.deepEqual(a.hexes('HELD1'), ['abcdef'])
  assert.equal(up.asked.length, 0)
  const s = store(up)
  assert.equal(s.has(SLOT), false)
  const [x, y] = await Promise.all([s.at(SLOT), s.at(SLOT)])
  assert.equal(x, y)
  assert.equal(up.asked.length, 1)
  assert.equal(s.has(SLOT), true)
})

test('at: once a half hour of some time of day was read, the same time on another day is asked for less; too little, and it asks for more', async () => {
  const DAY = 24 * 3_600_000
  const big = file(180, 400) // a whole half hour: 180 slices
  const up = upstream({ [heatmapUrl('https://x', SLOT)]: big, [heatmapUrl('https://x', SLOT - DAY)]: big, [heatmapUrl('https://x', SLOT - 2 * DAY)]: file(180, 4000) })
  const s = store(up)
  await s.at(SLOT)
  const first = Number(/-(\d+)$/.exec(up.asked[0].range!)![1])
  const calls = await s.at(SLOT - DAY)
  const second = Number(/-(\d+)$/.exec(up.asked[1].range!)![1])
  assert.equal(up.asked.length, 2)
  assert.ok(second < first, `${second} < ${first}`)
  assert.ok(typeof calls !== 'string' && calls.slices >= CALL_SLICES)
  assert.deepEqual((calls as Exclude<typeof calls, string>).hexes(`CS${CALL_SLICES - 1}`), [(0x100000 + CALL_SLICES - 1).toString(16)])
  // A day ten times busier at that time: the share of yesterday's size holds too few slices, so the usual part is asked for.
  const busy = await s.at(SLOT - 2 * DAY)
  assert.ok(up.asked.length >= 4)
  assert.ok(typeof busy !== 'string' && busy.slices >= CALL_SLICES)
})
