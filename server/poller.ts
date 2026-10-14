// server/poller.ts
import type { CellStatus, Degraded, StatusBrief, StatusReport } from '../shared/api.ts'
import { MinOffset } from '../shared/clock.ts'
import { isHidden, toSample } from '../shared/sample.ts'
import type { TokenBucket } from './budget.ts'
import { distanceNm } from '../shared/geo.ts'
import { cellBox, cellsForView, type Cell } from './cells.ts'
import type { InfoStore } from './infoStore.ts'
import type { Recorder } from './recorder.ts'
import type { FetchResult, Source } from './sources/types.ts'
import type { ReadsbAircraft, Sample } from '../shared/types.ts'
import { LATEST_HORIZON_MS, type SampleStore } from './store.ts'

/** One upstream with its own request budget. */
export interface Lane {
  source: Source
  bucket: TokenBucket
}

export interface PollerOpts {
  cellPeriodMs: number
  chasePeriodMs: number
  fullSnapshotPeriodMs: number
  interestTtlMs: number
  chaseTtlMs: number
  recorder: Recorder | null
  hideFlagged: boolean
  nowMs?: () => number
  // Low-budget mode (F2): every view, however wide, is polled as its own circle (≤ 250 nm around its centre). At
  // 0.04 req/s the cell cover of one view (2–4 cells) refreshed each aircraft only every 50–100 s; one circle, every 25 s.
  singleCircle?: boolean
  info?: InfoStore // gets every non-hidden aircraft object of every good answer (identity, detail panel, routes)
  // ponytail: onSample and onAircraft must be synchronous. A throw is caught and logged (#hookFailed); the rejection of an
  // async one is not caught: it would be an unhandled rejection.
  onSample?: (s: Sample) => void // every sample the store took (server/flightLog.ts records the ones it follows)
  // Hexes to keep fresh even when no view covers them (flights being recorded): each is asked by hex once its newest
  // sample is WATCH_PERIOD_MS old. Area sources only; a full snapshot carries them anyway.
  watched?: () => readonly string[]
  // The squawks to sweep worldwide now (server/alerts.ts; empty: none). One request every SWEEP_PERIOD_MS / codes, so each
  // code every SWEEP_PERIOD_MS, after a due chase and before the watched hexes and the areas. Sources with squawk() only.
  // At a low request rate the gap is longer: the sweep takes at most SWEEP_SHARE of the tokens (#sweepCode).
  // ponytail: squawks() is called every tick (100 ms) and must not throw: a throw rejects the tick (start() logs it each time).
  squawks?: () => readonly string[]
  onAircraft?: (ac: ReadsbAircraft, rxMs: number) => void // every non-hidden aircraft object of every good answer (server/alerts.ts)
  // More upstreams, each with its own budget (ADSB_SOURCE=adsbfi,adsblol): area sources, after the first. Every lane asks
  // at its own rate at the same time as the others, and each free one takes the most urgent request it can make, so no
  // token of any upstream goes unused. All answers go into the one store.
  lanes?: Lane[]
}

/**
 * Suggested timing (WP-A1 may override). At adsb.lol's 1 req/s a 1.4 s chase uses 0.71 req/s and the view's cells
 * share the other 0.29 (one cell ≈ 4 s, three ≈ 11 s); a 1 s chase would starve them. The client's delay floor is
 * 3 s (WP-C3), so 1.4 s costs the chase nothing.
 */
export const POLLER_DEFAULTS = {
  cellPeriodMs: 3000,
  chasePeriodMs: 1400,
  fullSnapshotPeriodMs: 1000,
  interestTtlMs: 15_000,
  chaseTtlMs: 10_000,
} as const

/** A callsign lookup that could not be sent within this long is given up: the page shows the rest without it. */
export const LOOKUP_WAIT_MS = 8000
/** Each swept squawk is asked for this often: 3 codes cost 0.1 req/s of adsb.fi's 0.9 (docs/anomaly-alerts.md §7.2). */
export const SWEEP_PERIOD_MS = 30_000
/**
 * The sweep takes at most this share of the request budget: the map keeps at least 7 tokens in 8. At adsb.fi's 0.9 req/s the
 * 3 codes take 11 % and this does not bind. At a lower rate the sweep slows down to fit (see #sweepCode).
 */
export const SWEEP_SHARE = 1 / 8

const TICK_MS = 100
// The sample store is pruned this often, not on every tick: its horizons are 180 s and 35 min, and a pass walks every
// aircraft it holds (thousands in a wide view).
const PRUNE_EVERY_MS = 1000
/** A view up to this radius is polled as one circle of its own (the upstream's limit); a wider one as grid cells. */
export const VIEW_CIRCLE_MAX_NM = 250
const EMPTY_FACTOR = 4 // an area whose last answer was empty (sea, desert) is asked this many times less often…
const EMPTY_MAX_MS = 3_600_000 // …but at least hourly
/**
 * A watched (recorded) aircraft is refreshed this often when no view covers it: 5 s is ~250 m on an approach, fine to
 * tell procedures apart. Watch requests go out at most every WATCH_GAP_MS so areas keep ≥ 0.4 req/s at adsb.fi's 0.9.
 * ponytail: adsb.fi asks one hex per request, so N watched aircraft outside the view are refreshed every max(5, 2N) s.
 */
const WATCH_PERIOD_MS = 5000
const WATCH_GAP_MS = 2000
const HEX_RETRY_MS = 30_000 // a hex whose hex request left it without a fresh position waits this long before the next one
/**
 * Fresh: the newest position is younger than this. A hex answer that only re-serves such a one (the upstream has nothing
 * newer yet) is no reason to wait: the next position is due any moment. Older (not found, position-less, GPS jammed,
 * hidden), the hex waits HEX_RETRY_MS.
 */
const HEX_FRESH_MS = 10_000

/** A wide view asks only for the areas within this distance of its centre: the middle of the globe, not its rim. */
export const WIDE_REACH_NM = 2500

/**
 * How often to refresh the aircraft of a view radiusNm wide. Between answers the client dead-reckons every aircraft
 * along its track, so what a gap costs is the turn error on screen, which grows with the view's scale: 0.12 s per nm
 * up to 500 nm (5 s for a city, 16 s for the default regional view, 60 s at 500 nm). Wider, a view covers ~r² areas,
 * so the period grows as r² too and every zoomed-out view costs about the same (~0.2 req/s): 4 min for a continent
 * (1,000 nm), 30 min for the globe. The chased aircraft goes faster still (chasePeriodMs).
 */
export function viewPeriodMs(radiusNm: number): number {
  if (radiusNm <= 500) return Math.max(5_000, 120 * radiusNm)
  return Math.min(1_800_000, 60_000 * (radiusNm / 500) ** 2)
}
const MAX_HEXES = 100 // hexes a hex request carries when its source does not say (caps.maxHexes)
const OFFSET_WINDOW_MS = 10 * 60_000
const HOUR_MS = 3_600_000
const MIN_SPAN_MS = 60_000 // bytes/hour is extrapolated from at least one minute
const KEEP_INTERVALS = 100 // p95 over the most recent intervals
const HOOK_LOG_MS = 60_000 // a failing onAircraft, and a failing onSample, are each logged at most this often
/** The InfoStore forgets an aircraft after this long without an answer: as long as the SampleStore keeps its newest sample. */
export const INFO_HORIZON_MS = LATEST_HORIZON_MS

/** p95 (nearest rank) of intervals in ms, as seconds; null when there are none. */
function p95S(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  return sorted[Math.ceil(0.95 * sorted.length) - 1] / 1000
}

/** Intervals between successive good (200 + parsed) answers for one thing we poll. */
class OkIntervals {
  lastOkMs: number | null = null
  intervals: number[] = []

  ok(t: number): void {
    if (this.lastOkMs !== null) {
      this.intervals.push(t - this.lastOkMs)
      if (this.intervals.length > KEEP_INTERVALS) this.intervals.shift()
    }
    this.lastOkMs = t
  }
}

interface CellState {
  cell: Cell
  expiresMs: number
  lastReqMs: number
  ok: OkIntervals
  periodMs: number // from the finest view that touched it within interestTtlMs
  periodSetMs: number
  count: number | null // aircraft in its last good answer; null before one
}

/**
 * Decides what to ask the upstream next and feeds the answers into the store. With more than one upstream (opts.lanes),
 * each lane makes one request at a time at its own rate, all lanes at once, and each takes the most urgent request it can
 * make: what follows is the order they all take from.
 * Full-snapshot sources (readsb, replay): one all() per fullSnapshotPeriodMs serves every view and chase.
 * Area sources (adsb.fi, adsb.lol): the newest view up to 250 nm wide is one circle of its own, a wider one the grid
 * cells covering it. Each area is asked every viewPeriodMs of the finest view that touched it (empty ones less often),
 * never-asked ones first, nearest the view centre first. While an aircraft is chased the view circle, centred on it,
 * is asked every chasePeriodMs: it carries the chased aircraft and its traffic in one request. A hex request (the chase
 * batch) goes out only for a chased aircraft the areas have not delivered lately and that is not inside the view
 * circle. While the alerts ask for squawks (opts.squawks), one of them is asked worldwide in turn, each every
 * SWEEP_PERIOD_MS (longer at a low request rate: the sweep takes at most SWEEP_SHARE of the tokens), after a due chase and
 * before the watched hexes and the areas (sources with squawk() only). Every request needs a bucket token first; interest
 * lapses interestTtlMs after the last touch.
 */
export class Poller {
  #source: Source // the first lane's: what kind of source this is (full snapshot or areas), named in the status
  #store: SampleStore
  #bucket: TokenBucket // the first lane's
  #lanes: (Lane & { busy: boolean })[] // busy: a request of this lane is in flight
  #opts: PollerOpts
  #now: () => number
  #startMs: number
  // One for all lanes: both networks keep UTC, so one offset stamps a position both report alike (shared/dedupe.ts).
  #offset = new MinOffset(OFFSET_WINDOW_MS)
  #cells = new Map<string, CellState>()
  #viewAt = { lat: 0, lon: 0 } // centre of the newest view
  #viewPeriodMs = 0 // its period
  #chased = new Map<string, number>() // hex → expiresMs
  #lastChaseReqMs = -Infinity
  #lastWatchReqMs = -Infinity
  #lastSweepMs = -Infinity
  #sweepNext = 0 // index of the next squawk to sweep
  #hookFailedMs = { onAircraft: -Infinity, onSample: -Infinity } // when each hook last threw and was logged
  #hexRetryMs = new Map<string, number>() // hex → not asked again before this (its last hex request brought no position)
  #lastAllReqMs = -Infinity
  #prunedMs = -Infinity // when the sample store was last pruned
  #chaseOk = new OkIntervals()
  #snapOk = new OkIntervals()
  #bytes: { t: number; n: number }[] = [] // last hour of responses
  #requestsTotal = 0
  #asking = new Set<CellState>() // the areas whose requests are in flight
  #timer: ReturnType<typeof setInterval> | null = null
  #lookups: { callsigns: readonly string[]; done: (found: ReadsbAircraft[] | null) => void; timer: ReturnType<typeof setTimeout> }[] = []

  constructor(source: Source, store: SampleStore, bucket: TokenBucket, opts: PollerOpts) {
    this.#source = source
    this.#store = store
    this.#bucket = bucket
    this.#lanes = [{ source, bucket }, ...(opts.lanes ?? [])].map((l) => ({ ...l, busy: false }))
    if (this.#lanes.length > 1 && this.#lanes.some((l) => l.source.caps.fullSnapshot)) throw new Error('Poller: only area sources share the work')
    this.#opts = opts
    this.#now = opts.nowMs ?? Date.now
    this.#startMs = this.#now()
  }

  /**
   * Keeps this view's areas polled for interestTtlMs, each at least every viewPeriodMs(radiusNm). Returns them: one
   * circle ('view') up to 250 nm (always, with singleCircle), else the grid cells covering the view out to WIDE_REACH_NM
   * from its centre. Areas of an older
   * view that were never asked are dropped: the newest view wins (one person's app). Full-snapshot sources: [].
   */
  touchView(lat: number, lon: number, radiusNm: number): Cell[] {
    if (this.#source.caps.fullSnapshot) return []
    const now = this.#now()
    const expiresMs = now + this.#opts.interestTtlMs
    const single = this.#opts.singleCircle || radiusNm <= VIEW_CIRCLE_MAX_NM
    // One circle is at most 250 nm wide whatever the view: its period is that circle's, not the globe's.
    const periodMs = Math.max(this.#opts.cellPeriodMs, viewPeriodMs(single ? Math.min(VIEW_CIRCLE_MAX_NM, radiusNm) : radiusNm))
    this.#viewAt = { lat, lon }
    this.#viewPeriodMs = periodMs
    const cells = single
      ? [{ id: 'view', lat, lon, radiusNm: Math.ceil(Math.min(VIEW_CIRCLE_MAX_NM, radiusNm)) }]
      : cellsForView(lat, lon, Math.min(WIDE_REACH_NM, radiusNm))
    const ids = new Set(cells.map((c) => c.id))
    for (const [id, c] of this.#cells) if (!ids.has(id) && c.lastReqMs === -Infinity) this.#cells.delete(id)
    for (const cell of cells) {
      const c = this.#cells.get(cell.id)
      if (c === undefined) {
        this.#cells.set(cell.id, { cell, expiresMs, lastReqMs: -Infinity, ok: new OkIntervals(), periodMs, periodSetMs: now, count: null })
        continue
      }
      // The view circle moved a third of its radius or more (a pan, or the chased aircraft flying on): a new area, asked
      // at once, whatever the old one's timer (up to 4× a period after an empty answer) said.
      if (cell.id === 'view' && distanceNm(c.cell.lat, c.cell.lon, cell.lat, cell.lon) > c.cell.radiusNm / 3) {
        c.lastReqMs = -Infinity
        c.count = null
      }
      c.cell = cell
      c.expiresMs = Math.max(c.expiresMs, expiresMs)
      // The finest view wins while it is being watched; a coarser one takes over interestTtlMs after it.
      if (periodMs <= c.periodMs || now - c.periodSetMs > this.#opts.interestTtlMs) {
        c.periodMs = periodMs
        c.periodSetMs = now
      }
    }
    return cells
  }

  /** Keeps this hex in the chase batch for chaseTtlMs. */
  touchChase(hex: string): void {
    this.#chased.set(hex.toLowerCase(), this.#now() + this.#opts.chaseTtlMs)
  }

  /**
   * Every aircraft sending one of these callsigns now, worldwide (the flight search): one request, which waits its turn for a
   * token like any other and goes right after a due chase; its answer is taken in as any answer is, so the aircraft are in the
   * store when the page selects one. null: the source has no such lookup (a replay, a receiver), the request failed, or it
   * could not be sent within LOOKUP_WAIT_MS (the budget is paused or spent).
   */
  lookup(callsigns: readonly string[]): Promise<ReadsbAircraft[] | null> {
    if (!this.#lanes.some((l) => l.source.callsign !== undefined) || callsigns.length === 0) return Promise.resolve(null)
    return new Promise((done) => {
      const ask = { callsigns, done, timer: setTimeout(() => {
        this.#lookups = this.#lookups.filter((l) => l !== ask)
        done(null)
      }, LOOKUP_WAIT_MS) }
      ask.timer.unref()
      this.#lookups.push(ask)
    })
  }

  /**
   * At most one upstream request on each lane that has none in flight; waits for their answers. Returns whether one was
   * made. A lane whose request is in flight is passed over, so a slow answer (adsb.lol's take 10 s now and then) holds up
   * its own lane only.
   */
  async tick(): Promise<boolean> {
    const now = this.#now()
    this.#expire(now)
    // Once a second; a clock that went back (the wall clock set back) prunes at once and counts from there.
    if (now - this.#prunedMs >= PRUNE_EVERY_MS || now < this.#prunedMs) {
      this.#prunedMs = now
      this.#store.prune(now)
    }
    const asks: Promise<void>[] = []
    for (const lane of this.#lanes) {
      if (lane.busy) continue
      const ask = this.#ask(lane, now)
      if (ask === null) continue
      lane.busy = true
      asks.push(ask().finally(() => (lane.busy = false)))
    }
    await Promise.all(asks)
    return asks.length > 0
  }

  /**
   * The most urgent request this lane can make now, its token taken and its schedule marked (so another lane does not
   * make it too), to be sent by calling it; null when the lane has no token or nothing is due. In order: a due chase, a
   * callsign looked up, a due sweep, due watched hexes, then the most urgent area.
   */
  #ask(lane: Lane, now: number): (() => Promise<void>) | null {
    const { source, bucket } = lane
    if (source.caps.fullSnapshot) {
      if (now - this.#lastAllReqMs < this.#opts.fullSnapshotPeriodMs || !bucket.tryTake()) return null
      this.#lastAllReqMs = now
      return async () => {
        if (this.#ingest(await source.all(), lane)) {
          const t = this.#now()
          this.#snapOk.ok(t)
          if (this.#chased.size > 0) this.#chaseOk.ok(t)
        }
      }
    }
    const maxHexes = source.caps.maxHexes ?? MAX_HEXES
    const batch = now - this.#lastChaseReqMs >= this.#opts.chasePeriodMs ? this.#batch(now, maxHexes) : []
    if (batch.length > 0) {
      if (!bucket.tryTake()) return null // a due chase never yields its token to an area
      this.#lastChaseReqMs = now
      return async () => {
        if (this.#ingest(await source.hexes(batch), lane)) {
          this.#chaseOk.ok(this.#now())
          // A failed request is the bucket's to pace (Retry-After, back-off).
          this.#backOff(batch, now)
        }
      }
    }
    // A callsign looked up for the flight search: someone is waiting for it.
    if (this.#lookups.length > 0 && source.callsign !== undefined) {
      if (!bucket.tryTake()) return null
      const ask = this.#lookups.shift()!
      clearTimeout(ask.timer)
      return async () => {
        let found: ReadsbAircraft[] | null = null
        try {
          const r = await source.callsign!(ask.callsigns)
          if (this.#ingest(r, lane)) found = r.snapshot!.aircraft.filter((ac) => !(this.#opts.hideFlagged && isHidden(ac)))
        } finally {
          ask.done(found) // whatever happened: its timer is gone, and someone waits for it
        }
      }
    }
    // ponytail: a due sweep goes before the areas, so it can delay a chase circle (an area request) by one token interval:
    // about 1 s every 10 s at 0.9 req/s.
    const code = source.squawk === undefined ? null : this.#sweepCode(now)
    if (code !== null) {
      if (!bucket.tryTake()) return null
      this.#lastSweepMs = now
      this.#sweepNext++
      return async () => void this.#ingest(await source.squawk!(code), lane)
    }
    const watch = now - this.#lastWatchReqMs >= WATCH_GAP_MS ? this.#watchBatch(now, maxHexes) : []
    if (watch.length > 0) {
      if (!bucket.tryTake()) return null
      this.#lastWatchReqMs = now
      return async () => {
        if (this.#ingest(await source.hexes(watch), lane)) this.#backOff(watch, now)
      }
    }
    const c = this.#next(now)
    if (!c || !bucket.tryTake()) return null
    const before = c.lastReqMs
    c.lastReqMs = now
    this.#asking.add(c)
    return async () => {
      const r = await source.circle(c.cell.lat, c.cell.lon, c.cell.radiusNm).finally(() => this.#asking.delete(c))
      if (this.#ingest(r, lane)) {
        const t = this.#now()
        c.ok.ok(t)
        c.count = r.snapshot!.aircraft.length
        // The view circle is how a chased aircraft in it is refreshed: its answers count as chase answers.
        if (this.#chased.size > 0 && r.snapshot!.aircraft.some((a) => this.#chased.has(a.hex.toLowerCase()))) this.#chaseOk.ok(t)
      } else if (c.lastReqMs === now) {
        // No answer (a 429, an error): the area is as due as it was, for the first lane with a token (this one's bucket
        // waits out its pause), not a whole period later. Unless a moved view circle has reset it meanwhile.
        c.lastReqMs = before
      }
    }
  }

  start(): void {
    if (this.#timer !== null) return
    this.#timer = setInterval(() => {
      this.tick().catch((e: unknown) => console.error('poller: tick failed:', e))
    }, TICK_MS)
    this.#timer.unref() // the HTTP server keeps the process alive, not the poller
  }

  stop(): void {
    if (this.#timer !== null) clearInterval(this.#timer)
    this.#timer = null
    for (const ask of this.#lookups.splice(0)) { // nobody will send them now
      clearTimeout(ask.timer)
      ask.done(null)
    }
  }

  brief(): StatusBrief {
    this.#expire(this.#now())
    const cellIntervals = this.#source.caps.fullSnapshot ? this.#snapOk.intervals : [...this.#cells.values()].flatMap((c) => c.ok.intervals)
    const tokenMs = 1000 / this.#rps()
    const full = this.#source.caps.fullSnapshot
    let busy = 0 // areas of the view that hold (or may hold) aircraft: each costs one request per round
    let pending = 0
    const waiting: CellState[] = []
    const now = this.#now()
    const chaseInView = this.#chaseInView()
    for (const c of this.#cells.values()) {
      if (c.count !== 0) busy++
      // Not loaded: never asked (or its view circle moved), or no good answer yet (in flight, or failed).
      if (c.lastReqMs !== -Infinity && c.ok.lastOkMs !== null) continue
      pending++
      if (c.cell.id !== 'view') waiting.push(c)
    }
    // In the order they will be asked: the one in flight first (the map shows a spinner in it).
    const order = (c: CellState): number => (this.#asking.has(c) ? Infinity : this.#priority(c, now, chaseInView))
    const boxes = waiting.sort((a, b) => order(b) - order(a)).map((c) => cellBox(c.cell))
    // While the sweep runs it takes up to SWEEP_SHARE of the tokens (11 % at adsb.fi's 0.9 req/s): the areas have the rest.
    const areaTokenMs = this.#sweeping() ? tokenMs / (1 - SWEEP_SHARE) : tokenMs
    const b: StatusBrief = {
      source: this.#source.caps.kind,
      degraded: this.#degraded(),
      cellPeriodP95S: p95S(cellIntervals),
      chasePeriodP95S: p95S(this.#chaseOk.intervals),
      // What to expect next, for the client's delay and staleness: the budget stretches both when it cannot keep up.
      viewEveryS: (full ? Math.max(this.#opts.fullSnapshotPeriodMs, tokenMs) : Math.max(this.#viewPeriodMs, busy * areaTokenMs)) / 1000,
      chaseEveryS: Math.max(full ? this.#opts.fullSnapshotPeriodMs : this.#opts.chasePeriodMs, tokenMs) / 1000,
      pendingAreas: pending,
    }
    if (boxes.length > 0) b.pendingBoxes = boxes
    if (this.#lanes.length > 1) b.sources = this.#lanes.map((l) => l.source.caps.kind)
    // The offset that stamps every sample (#ingest): lets the client light a replay at its recorded time (sun = tRender − it).
    if (this.#offset.ready) b.upstreamOffsetMs = Math.round(this.#offset.get())
    return b
  }

  report(): StatusReport {
    const now = this.#now()
    const brief = this.brief() // also drops expired cells and chases
    const cells: CellStatus[] = [...this.#cells.values()].map(({ cell: { id, lat, lon, radiusNm }, ok }) => ({
      id,
      lat,
      lon,
      radiusNm,
      lastOkMs: ok.lastOkMs,
      periodP95S: p95S(ok.intervals),
    }))
    this.#pruneBytes(now)
    let bytes = 0
    for (const b of this.#bytes) bytes += b.n
    const spanMs = Math.min(HOUR_MS, Math.max(MIN_SPAN_MS, now - this.#startMs))
    return {
      ...brief,
      budget: this.#bucket.state(),
      ...(this.#lanes.length > 1 ? { lanes: this.#lanes.map((l) => ({ source: l.source.caps.kind, budget: l.bucket.state() })) } : {}),
      cells,
      chasedHexes: [...this.#chased.keys()],
      bytesPerHourEstimate: Math.round((bytes * HOUR_MS) / spanMs),
      requestsTotal: this.#requestsTotal,
    }
  }

  /** Budget, recorder, clock offset, stores. Returns whether the answer was good (200 and parsed). */
  #ingest(r: FetchResult, lane: Lane): boolean {
    const now = this.#now()
    lane.bucket.onResult(r.status, r.retryAfterS)
    this.#requestsTotal++
    this.#bytes.push({ t: now, n: r.bytes })
    this.#pruneBytes(now)
    try {
      this.#opts.recorder?.write(lane.source.caps.kind, r)
    } catch (e) {
      console.error('poller: recorder write failed:', e) // ponytail: a full disk logs once per request; polling goes on
    }
    const snap = r.snapshot
    if (r.status !== 200 || snap === null) return false
    this.#offset.update(r.tRecvMs, snap.nowMs)
    const offsetMs = this.#offset.get()
    const info = this.#opts.info
    for (const ac of snap.aircraft) {
      if (this.#opts.hideFlagged && isHidden(ac)) continue
      info?.update(ac, r.tRecvMs)
      try {
        this.#opts.onAircraft?.(ac, r.tRecvMs)
      } catch (e) {
        this.#hookFailed('onAircraft', e)
      }
      const s = toSample(ac, snap.nowMs, offsetMs, r.tRecvMs)
      if (s && this.#store.add(s)) {
        try {
          this.#opts.onSample?.(s)
        } catch (e) {
          this.#hookFailed('onSample', e)
        }
      }
    }
    info?.prune(now, INFO_HORIZON_MS) // on good answers only: its route-cache sweep need not run every 100 ms tick
    return true
  }

  /**
   * A bug in a hook costs the answer nothing: the rest of it is still ingested (the aircraft that threw is stored too) and the
   * tick goes on. Logged once a minute per hook, not once per aircraft.
   */
  #hookFailed(hook: 'onAircraft' | 'onSample', e: unknown): void {
    const now = this.#now()
    if (now - this.#hookFailedMs[hook] < HOOK_LOG_MS) return
    this.#hookFailedMs[hook] = now
    console.error(`poller: ${hook} failed:`, e)
  }

  #expire(now: number): void {
    for (const [id, c] of this.#cells) if (c.expiresMs <= now) this.#cells.delete(id)
    for (const [hex, exp] of this.#chased) if (exp <= now) this.#chased.delete(hex)
    for (const [hex, until] of this.#hexRetryMs) if (until <= now) this.#hexRetryMs.delete(hex)
    if (this.#chased.size === 0) this.#chaseOk.lastOkMs = null // a new chase must not count the idle gap
  }

  /**
   * The chased hexes (at most max, most recently touched first) that need a hex request: never stored (a ?hex= link), or last
   * seen outside the view circle (none while the view is grid cells). A hex whose last hex request left it without a
   * fresh position (landed, out of coverage, GPS jammed, hidden, a mistyped ?hex=) is left out for HEX_RETRY_MS.
   * ponytail: more than 100 concurrent chases starve the rest.
   */
  #batch(now: number, max: number): string[] {
    if (this.#chased.size === 0) return []
    const view = this.#cells.get('view')?.cell
    // Only chases a client asked about in the last 2.5 s (clients ask every second): one released by Esc or a new
    // selection stays in #chased for chaseTtlMs but is not worth a request.
    const recent = now + this.#opts.chaseTtlMs - 2500
    return [...this.#chased]
      .sort((a, b) => b[1] - a[1])
      .filter(([hex, expiresMs]) => {
        if (expiresMs < recent) return false
        if ((this.#hexRetryMs.get(hex) ?? -Infinity) > now) return false
        const s = this.#store.latest(hex)
        // Inside the view circle its answers carry the aircraft (or, once it is gone, a hex request would not find it either).
        return s === null || view === undefined || distanceNm(view.lat, view.lon, s.lat, s.lon) > view.radiusNm
      })
      .slice(0, max)
      .map(([hex]) => hex)
  }

  /**
   * The squawk due for its sweep request, or null: none asked for, no squawk() on the source, or the last one too recent.
   * The gap between two sweep requests is the larger of SWEEP_PERIOD_MS / codes and 1 / (rps × SWEEP_SHARE) seconds, so the
   * sweep never takes more than SWEEP_SHARE of the tokens. It goes before the areas: without the second term, at 0.1 req/s
   * (a token every 10 s) it would take all of them and the map none.
   * rps is the rate now of the lanes that can sweep, read each time we ask: a 429 halves it for good. `degraded` is not
   * used for this: it is null again 60 s after a 429, but the halved rate stays, so the sweep would go back to its full rate
   * on half a budget.
   */
  #sweepCode(now: number): string | null {
    const codes = this.#opts.squawks?.() ?? []
    if (codes.length === 0 || !this.#sweeping()) return null
    const gapMs = Math.max(SWEEP_PERIOD_MS / codes.length, 1000 / (this.#rps((l) => l.source.squawk !== undefined) * SWEEP_SHARE))
    return now - this.#lastSweepMs < gapMs ? null : codes[this.#sweepNext % codes.length]
  }

  /** Whether the sweep runs: squawks are asked for, and a source can sweep them. */
  #sweeping(): boolean {
    return (this.#opts.squawks?.() ?? []).length > 0 && this.#lanes.some((l) => l.source.squawk !== undefined)
  }

  /** Requests a second the lanes (those `which` picks) can make now, a blocked one none; the first lane's rate if that is 0. */
  #rps(which: (l: Lane) => boolean = () => true): number {
    let rps = 0
    for (const l of this.#lanes) {
      const b = l.bucket.state()
      if (which(l) && !b.blocked) rps += b.rps
    }
    return rps > 0 ? rps : this.#bucket.state().rps
  }

  /** The first lane's trouble; only 'rate-limited' (slowed) while another lane still answers (is neither blocked nor down). */
  #degraded(): Degraded {
    const first = this.#bucket.degraded
    const answers = (d: Degraded): boolean => d === null || d === 'rate-limited'
    return answers(first) || !this.#lanes.slice(1).some((l) => answers(l.bucket.degraded)) ? first : 'rate-limited'
  }

  /**
   * Watched hexes (at most max) due for a hex request: no sample for WATCH_PERIOD_MS (a chase or a view keeps most fresh),
   * not waiting after a request that brought no position. The stalest first, so one-hex sources go round.
   */
  #watchBatch(now: number, max: number): string[] {
    const hexes = this.#opts.watched?.() ?? []
    if (hexes.length === 0 || this.#source.caps.fullSnapshot) return []
    const due: [string, number][] = []
    for (const hex of hexes) {
      if ((this.#hexRetryMs.get(hex) ?? -Infinity) > now) continue
      const rx = this.#store.latest(hex)?.rxMs ?? -Infinity
      if (now - rx >= WATCH_PERIOD_MS) due.push([hex, rx])
    }
    return due
      .sort((a, b) => a[1] - b[1])
      .slice(0, max)
      .map(([hex]) => hex)
  }

  /** After a good hex answer: each hex left without a fresh (shown) position waits HEX_RETRY_MS before it is asked again. */
  #backOff(hexes: readonly string[], now: number): void {
    for (const hex of hexes) if (now - (this.#store.latest(hex)?.tMs ?? -Infinity) >= HEX_FRESH_MS) this.#hexRetryMs.set(hex, now + HEX_RETRY_MS)
  }

  /** The hexes clients are chasing or focused on now (their chase requests keep them for chaseTtlMs). */
  chasedHexes(): string[] {
    this.#expire(this.#now())
    return [...this.#chased.keys()]
  }

  /** Is a chased aircraft (as last stored) inside the view circle? Then that circle is how it is chased. */
  #chaseInView(): boolean {
    const view = this.#cells.get('view')?.cell
    if (view === undefined) return false
    for (const hex of this.#chased.keys()) {
      const s = this.#store.latest(hex)
      if (s !== null && distanceNm(view.lat, view.lon, s.lat, s.lon) <= view.radiusNm) return true
    }
    return false
  }

  /** How often this area is due: its view's period (the chase period for a view circle holding the chase), longer when empty. */
  #periodMs(c: CellState, chaseInView: boolean): number {
    const p = c.cell.id === 'view' && chaseInView ? Math.min(c.periodMs, this.#opts.chasePeriodMs) : c.periodMs
    return c.count === 0 ? Math.max(p, Math.min(EMPTY_MAX_MS, p * EMPTY_FACTOR)) : p
  }

  /**
   * The next area to ask: never-asked ones first, nearest the newest view centre first; then the most overdue for its
   * period.
   */
  #next(now: number): CellState | null {
    let best: CellState | null = null
    let bestKey = -Infinity
    const chaseInView = this.#chaseInView()
    for (const c of this.#cells.values()) {
      if (now - c.lastReqMs < this.#periodMs(c, chaseInView)) continue
      const key = this.#priority(c, now, chaseInView)
      if (key > bestKey) {
        best = c
        bestKey = key
      }
    }
    return best
  }

  /**
   * Never asked: 1e9 minus the distance from the view centre, so a view fills outwards from where the user looks. Else:
   * how many periods overdue (≥ 1 when due).
   */
  #priority(c: CellState, now: number, chaseInView: boolean): number {
    return c.lastReqMs === -Infinity
      ? 1e9 - distanceNm(this.#viewAt.lat, this.#viewAt.lon, c.cell.lat, c.cell.lon)
      : (now - c.lastReqMs) / this.#periodMs(c, chaseInView)
  }

  #pruneBytes(now: number): void {
    while (this.#bytes.length > 0 && this.#bytes[0].t <= now - HOUR_MS) this.#bytes.shift()
  }
}
