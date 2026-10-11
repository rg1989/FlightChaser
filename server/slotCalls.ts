// server/slotCalls.ts
// Who was in the air as a past half hour began: the callsigns at the start of adsb.lol's heatmap file for it (heatmap.ts
// readCalls), which the flight search (flightSearch.ts) reads to find the days a flight flew. A whole file is 12-25 MB;
// its first 1.4 MB holds the first minute and more, and an ident comes once a minute per aircraft, so that start names
// everyone heard then. adsb.lol serves a part of a file on request (Range; checked 2026-10-11: 206, the bytes of the gzip
// stream, which is read as far as it goes); should it ever send a whole file instead, that is refused ('unavailable'). A
// file the history store already holds is read in place of a download.
// Memory only: an index is about 150 KB, the newest `max` are kept. A half hour with no file is 'missing' (404, 410, or
// older than adsb.lol keeps) or 'unavailable' (not published yet, a failed download): as HistoryStore says it.
import { gunzipSync, constants } from 'node:zlib'
import { SLOT_MS, newestSlotMs } from '../shared/history.ts'
import { CallIndex, readCalls } from './heatmap.ts'
import { heatmapUrl, type HistoryMiss } from './historyStore.ts'

/** The slices read from a half hour's start: an ident comes once a minute, a slice is 10 s, and one more for the edge. */
export const CALL_SLICES = 8
const PROBE_BYTES = 1_400_000 // of the compressed file: 8 slices of a busy midday half hour (about 10,000 aircraft) fit
const MORE_BYTES = 3_000_000 // asked once when the first part held fewer slices than that
// A file's 180 slices are much alike, so 8 of them are about 8/180 of its bytes: once a half hour of some time of day was
// read, the next one of that time of day (another day's: the sky is as busy) is asked for this share of that file's size;
// with none read at that time yet, of the nearest time's read within NEAR_SLOTS (the sky changes slowly over an hour).
const SHARE = (CALL_SLICES / 180) * 1.35
const NEAR_SLOTS = 2
const NEAR_MORE = 1.2
const LEAST_BYTES = 250_000
const DAY_SLOTS = 48
const MISSING_MS = 10 * 60_000
const TIMEOUT_MS = 30_000
const MAX_LOADING = 3

export interface SlotCallsOpts {
  base?: string // default 'https://adsb.lol'
  userAgent: string
  fetchFn?: typeof fetch
  nowMs?: () => number
  held?(slotMs: number): Uint8Array | null // a whole decompressed file already in memory (HistoryStore.held)
  oldestSlotMs(): number
  max?: number // indexes kept; default 400
}

export class SlotCallsStore {
  #base: string
  #userAgent: string
  #fetch: typeof fetch
  #now: () => number
  #held: (slotMs: number) => Uint8Array | null
  #oldest: () => number
  #max: number
  #cache = new Map<number, CallIndex>() // Map order is use order
  #missing = new Map<number, number>() // slotMs → forgotten at
  #loading = new Map<number, Promise<CallIndex | HistoryMiss>>()
  #waiting: (() => void)[] = [] // downloads waiting their turn
  #active = 0
  #sizes = new Array<number>(DAY_SLOTS).fill(0) // the size of the last file read at each half hour of the day, bytes; 0: none yet
  #stop = new AbortController()
  bytes = 0 // downloaded so far, for the log and the tests

  constructor(o: SlotCallsOpts) {
    this.#base = o.base ?? 'https://adsb.lol'
    this.#userAgent = o.userAgent
    this.#fetch = o.fetchFn ?? ((input, init) => fetch(input, init))
    this.#now = o.nowMs ?? Date.now
    this.#held = o.held ?? (() => null)
    this.#oldest = o.oldestSlotMs
    this.#max = o.max ?? 400
  }

  /** The callsigns at the start of the half hour beginning at slotMs, or why there are none. Asks for one slot at a time share one download. */
  async at(slotMs: number): Promise<CallIndex | HistoryMiss> {
    const now = this.#now()
    if (slotMs % SLOT_MS !== 0 || slotMs < this.#oldest()) return 'missing'
    if (slotMs > newestSlotMs(now)) return 'unavailable'
    const hit = this.#cache.get(slotMs)
    if (hit !== undefined) {
      this.#cache.delete(slotMs)
      this.#cache.set(slotMs, hit)
      return hit
    }
    const until = this.#missing.get(slotMs)
    if (until !== undefined) {
      if (now < until) return 'missing'
      this.#missing.delete(slotMs)
    }
    const file = this.#held(slotMs)
    if (file !== null) {
      const calls = readCalls(file, CALL_SLICES)
      if (calls !== null) return this.#keep(slotMs, calls)
    }
    let loading = this.#loading.get(slotMs)
    if (loading === undefined) {
      if (this.#stop.signal.aborted) return 'unavailable'
      loading = this.#queued(slotMs).finally(() => this.#loading.delete(slotMs))
      this.#loading.set(slotMs, loading)
    }
    return loading
  }

  /** Whether the half hour's callsigns are at hand without a download. */
  has(slotMs: number): boolean {
    return this.#cache.has(slotMs) || this.#held(slotMs) !== null
  }

  close(): void {
    this.#stop.abort()
    for (const go of this.#waiting.splice(0)) go()
  }

  /** At most MAX_LOADING downloads at once; the rest wait their turn, in order. */
  async #queued(slotMs: number): Promise<CallIndex | HistoryMiss> {
    if (this.#active >= MAX_LOADING) await new Promise<void>((go) => this.#waiting.push(go))
    if (this.#stop.signal.aborted) return 'unavailable'
    this.#active++
    try {
      return await this.#load(slotMs)
    } finally {
      this.#active--
      this.#waiting.shift()?.()
    }
  }

  /** The file's start, and once a longer one when that held too few slices (a busier half hour than any measured). Never throws. */
  async #load(slotMs: number): Promise<CallIndex | HistoryMiss> {
    let best: CallIndex | null = null
    const known = this.#sizeAt((slotMs / SLOT_MS) % DAY_SLOTS)
    const first = known > 0 ? Math.min(PROBE_BYTES, Math.max(LEAST_BYTES, Math.round(known * SHARE))) : PROBE_BYTES
    for (const bytes of first < PROBE_BYTES ? [first, PROBE_BYTES, MORE_BYTES] : [PROBE_BYTES, MORE_BYTES]) {
      const part = await this.#part(slotMs, bytes)
      if (typeof part === 'string') return best === null ? part : this.#keep(slotMs, best)
      const calls = readCalls(part.body, CALL_SLICES)
      if (calls === null) return best === null ? 'unavailable' : this.#keep(slotMs, best)
      best = calls
      // The slice a part ends in may be cut: with CALL_SLICES begun, the ones before the last are whole (a minute and
      // more: every ident). Or the file ended.
      if (calls.slices >= CALL_SLICES || part.whole) break
    }
    return this.#keep(slotMs, best!)
  }

  /** The size of a file at this half hour of the day, as last read; else of the nearest half hour read, a little more; 0: none near. */
  #sizeAt(slot: number): number {
    if (this.#sizes[slot] > 0) return this.#sizes[slot]
    for (let d = 1; d <= NEAR_SLOTS; d++) {
      const near = Math.max(this.#sizes[(slot + d) % DAY_SLOTS], this.#sizes[(slot - d + DAY_SLOTS) % DAY_SLOTS])
      if (near > 0) return near * NEAR_MORE
    }
    return 0
  }

  /** The first `bytes` of the file, decompressed as far as they go; or why not. */
  async #part(slotMs: number, bytes: number): Promise<{ body: Uint8Array; whole: boolean } | HistoryMiss> {
    try {
      const res = await this.#fetch(heatmapUrl(this.#base, slotMs), {
        headers: { 'user-agent': this.#userAgent, 'accept-encoding': 'gzip', range: `bytes=0-${bytes - 1}` },
        signal: AbortSignal.any([this.#stop.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      })
      if (res.status !== 200 && res.status !== 206) {
        void res.body?.cancel().catch(() => {})
        if (res.status !== 404 && res.status !== 410) return 'unavailable'
        if (slotMs === newestSlotMs(this.#now())) return 'unavailable' // late, not missing: asked again
        this.#missing.set(slotMs, this.#now() + MISSING_MS)
        return 'missing'
      }
      // A server that sends the whole file where a part was asked for (12-25 MB a half hour) is not read: a search reads
      // hundreds of half hours.
      const sent = Number(res.headers.get('content-length') ?? NaN)
      if (res.status === 200 && sent > 2 * bytes) {
        void res.body?.cancel().catch(() => {})
        return 'unavailable'
      }
      let body = new Uint8Array(await res.arrayBuffer())
      this.bytes += sent || body.length
      // adsb.lol sends the gzip stream's bytes and says so; fetch undoes it as far as the part goes. Bytes still gzip (no
      // such header) are undone here, the same way: to where they end.
      if (body[0] === 0x1f && body[1] === 0x8b) {
        const plain = gunzipSync(body, { finishFlush: constants.Z_SYNC_FLUSH })
        body = new Uint8Array(plain.buffer, plain.byteOffset, plain.byteLength)
      }
      const total = /\/(\d+)$/.exec(res.headers.get('content-range') ?? '')?.[1]
      if (total !== undefined && Number(total) > 0) this.#sizes[(slotMs / SLOT_MS) % DAY_SLOTS] = Number(total)
      return { body, whole: res.status === 200 || (total !== undefined && Number(total) <= bytes) }
    } catch {
      return 'unavailable'
    }
  }

  #keep(slotMs: number, calls: CallIndex): CallIndex {
    this.#cache.delete(slotMs)
    this.#cache.set(slotMs, calls)
    if (this.#cache.size > this.#max) this.#cache.delete(this.#cache.keys().next().value!)
    return calls
  }
}
