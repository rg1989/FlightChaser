// server/flightSearch.ts
// A flight looked up by its ticket number or callsign (GET /api/flights): what it is, where it flies now, and when it flew
// before. Open data only:
// - What it is: adsbdb.com knows ticket numbers and callsigns with their routes (flightRoutes.ts). An airline that flies
//   under its ticket numbers (FZ 1073 is FDB1073) is found by that callsign. One that does not (W4 3257 is flown as
//   WMT7403, and WMT3257 is another flight altogether) is looked for under every callsign its airline uses on that route
//   (vradarserver/standing-data): byRoute. That may list the airline's other flights on the route too; nothing open ties
//   a ticket number to such a callsign. A ticket number's flights must lie on its route (onRoute): a callsign is reused.
//   One exception: Ben Gurion's flight board is open data (tlvBoard.ts), so for a flight to or from there the board's
//   times say which of those callsigns is the number's, and only its flights are listed.
// - Now: the live source's worldwide callsign lookup (adsb.fi: one request for all the callsigns).
// - Before: the callsigns at the start of adsb.lol's half hours (slotCalls.ts: about 1 MB a half hour, not the 12-25 MB of a
//   whole file) say which aircraft flew it and when; that aircraft's trace of the day (trace.ts) gives the flight itself. The
//   newest 24 h are read at even steps (stepFor: close enough for a flight of the route's length to hold one; an hour with
//   no route, so a shorter flight of a route-less callsign may fall between two); each day before is read at the times of
//   day found, a callsign at a time (a flight keeps its time), a slot or three to either side when it is not there. A
//   flight that was not heard to its route's end (lost on the way, or it went elsewhere) has the hours after it read
//   evenly too, for the first AFTER_MAX such flights: what flew on under its callsign (a diversion's last leg) flies at no
//   usual time. With nothing found the even reading stops after UNANCHORED_DAYS unless asked to go on: a number nobody
//   flew costs no more than that.
// - Nothing known under the id (no route, not in its airline's list, not in the air): nothing is searched; ids one slip of
//   the keyboard away that the lists know are offered instead (similar).
// A search is a job kept by its id for JOB_TTL_MS: asking again returns what it has so far, and the reading of the past goes
// on only while it is asked for (ALIVE_MS), so a search the page has left costs no more. After that the id is looked up
// afresh (its past ended where its first ask began). A lookup the route lists could not answer is not kept at all: a ticket
// number means nothing without them, so ask() says 'failed' and the next ask tries again. Memory only.
import type { FlightPlace, FlightSearchReply, LiveFlight, PastFlight, SimilarFlight, TraceDay, TraceReply } from '../shared/api.ts'
import { parseFlightId, slips, ticketText, type FlightId } from '../shared/flightId.ts'
import { distanceNm } from '../shared/geo.ts'
import { SLOT_MS, newestSlotMs } from '../shared/history.ts'
import type { FlightRoute } from './flightRoutes.ts'
import type { BoardTimes } from './tlvBoard.ts'
import type { CallIndex } from './heatmap.ts'
import type { HistoryMiss } from './historyStore.ts'

const DAY_MS = 24 * 3_600_000
export const DEFAULT_DAYS = 14
export const MAX_DAYS = 60
/** With no flight found yet the past is read at even steps, which costs a day's worth of half hours: this far and no further unless asked. */
export const UNANCHORED_DAYS = 2
export const ALIVE_MS = 6000
const JOB_TTL_MS = 15 * 60_000
const MAX_JOBS = 24
const LIVE_TTL_MS = 30_000
const MAX_CALLSIGNS = 16 // one live lookup names them all
const MAX_SIMILAR = 6
const NEAR = [0, -1, 1, -2, 2, -3, 3] // the slots tried round a time of day, nearest first
const ONGOING_MS = 20 * 60_000 // a flight last heard this recently, of an aircraft in the air now, is the one still flying
const EDGE_MS = 3 * 60_000 // a leg that starts or ends this near a day file's edge may run on in the next file
const TAXI_OUT_MS = 30 * 60_000 // a flight is shown from this long before its first point in the air…
const TAXI_IN_MS = 10 * 60_000 // …to this long after its last (an aircraft may sit at the gate with its callsign set for an hour)
const LIVE_SLACK_MS = 15 * 60_000 // the trace of an aircraft in the air now may end this long ago (its file is written every few minutes)
const RETRIES = 2
const RETRY_MS = 1500
const AHEAD = 2 // days whose first half hours are asked for ahead of the one being read
const RETRY_AFTER_MS = 3000 // a reading that failed starts again only when asked this long after
// A flight is the board's when it was last heard from this long before the board's landing time (lost on the approach: GPS
// jamming there) to this long after (taxiing in); the same turned round for a departure (its callsign set at the gate, or
// first heard well after take-off).
const BOARD_LOST_MS = 100 * 60_000
const BOARD_TAXI_MS = 40 * 60_000
const BOARD_AIRPORT = 'LLBG'
const SHORT_NM = 80 // a flight last heard farther than this from its route's last airport was not heard to its end
const AFTER_MS = 12 * 3_600_000 // …and this long after it is read evenly for what flew on under its callsign
// ponytail: …for a job's first few such flights only (the newest): where receivers end short of an airport every flight
// looks cut, and each would cost half a day of reading. Upgrade: tell a diversion from lost coverage.
const AFTER_MAX = 3

export interface FlightSearchDeps {
  nowMs(): number
  route(id: string): Promise<FlightRoute | null | 'failed'> // adsbdb (FlightRoutes.route)
  airlineCallsigns(icao: string): Promise<ReadonlyMap<string, string> | null | 'failed'> // FlightRoutes.callsigns (null: it has no list)
  icaoOf(iata: string): string | null // an airline's ICAO designator from its ticket designator, where the app's own table knows it
  airlineOf?(callsign: string): string | null // an airline's name from its callsign, where the app's own table knows it (adsbdb's comes first)
  live(callsigns: readonly string[]): Promise<Omit<LiveFlight, 'sinceMs'>[] | null> // null: cannot be asked here, or failed
  calls(slotMs: number): Promise<CallIndex | HistoryMiss> // SlotCallsStore.at
  day(hex: string, fromMs: number, toMs: number): Promise<TraceDay | 'unavailable' | null> // TraceStore.day
  oldestSlotMs(): number
  board?(airline: string, number: string): Promise<BoardTimes | null> // Ben Gurion's flight board (TlvBoard.times); absent: none
  sleep?(ms: number): Promise<void> // tests
}

interface Job {
  id: FlightId
  ticket: string | null
  airline: string | null
  route: [FlightPlace, FlightPlace] | null
  primary: string | null // the id's own callsign; null when that callsign is known to be another flight's
  callsigns: string[]
  others: string[] // the airline's other callsigns on the route, not looked for yet: they join when the newest day has no flight under the id's own
  byRoute: boolean
  boarded: boolean // the flight board was asked which callsign is the number's
  reread: Set<string> // the flights not heard to their end whose hours after were read (hex and first moment)
  known: boolean
  live: Omit<LiveFlight, 'sinceMs'>[] | null
  liveAtMs: number
  similar: SimilarFlight[]
  resolved: Promise<void>
  flights: PastFlight[]
  // A slot start inside each flight of the newest day read: the times of day the days before are read at, each for its
  // callsign (two flights of a route may fly within the hour of each other).
  anchors: { callsign: string; at: number }[]
  endMs: number | null // the scan reads back from here (the end of the newest half hour published when it began)
  fromMs: number | null // …and has read down to here
  days: number // how far back it is asked to read
  evenDays: number // …and how far with nothing found yet (an even pass a day): UNANCHORED_DAYS, or what a deep ask said
  stepSlots: number
  scanning: boolean
  failed: boolean
  failedMs: number
  askedMs: number // the last ask that wanted the past
  madeMs: number
  broken: boolean // what it is could not be found out (a route list did not answer): not kept, and ask() says so
}

const lastMs = (leg: TraceReply): number => leg.t0Ms + (leg.t.at(-1) ?? 0) * 1000

/**
 * Whether a place lies along a route: the way from its first airport to its last through that place is little longer than
 * the direct one (a quarter longer, or 120 nm when that is more): an ellipse round the great circle, wide enough for the
 * airways' bends and a hold.
 */
export function alongRoute(p: { lat: number; lon: number }, [a, b]: [FlightPlace, FlightPlace]): boolean {
  const direct = distanceNm(a.lat, a.lon, b.lat, b.lon)
  return distanceNm(a.lat, a.lon, p.lat, p.lon) + distanceNm(p.lat, p.lon, b.lat, b.lon) <= direct + Math.max(120, direct / 4)
}

/**
 * Whether a flight is one of the route: it left the route's first airport, or reached its last (wherever its other end was:
 * a diversion, or the leg that flew on from one), or both its ends lie along the route and it went the route's way (heard
 * only on the way).
 */
export function onRoute(f: Pick<PastFlight, 'from' | 'to'>, route: [FlightPlace, FlightPlace]): boolean {
  const [from, to] = route
  const left = distanceNm(from.lat, from.lon, f.from.lat, f.from.lon)
  if (left <= SHORT_NM || distanceNm(to.lat, to.lon, f.to.lat, f.to.lon) <= SHORT_NM) return true
  return alongRoute(f.from, route) && alongRoute(f.to, route) && left <= distanceNm(from.lat, from.lon, f.to.lat, f.to.lon) + 30
}
const dayStart = (tMs: number): number => Math.floor(tMs / DAY_MS) * DAY_MS

/** The half hours read in an even pass over [fromMs, toMs): every `step`th, newest first. */
export function evenSlots(fromMs: number, toMs: number, step: number): number[] {
  const out: number[] = []
  for (let s = Math.floor((toMs - 1) / SLOT_MS) * SLOT_MS; s >= fromMs; s -= step * SLOT_MS) out.push(s)
  return out
}

/** The latest moment before toMs at anchor's time of day, or null when it is before fromMs (a window shorter than a day). */
export function sameTimeIn(anchor: number, fromMs: number, toMs: number): number | null {
  const at = anchor - Math.ceil((anchor - (toMs - 1)) / DAY_MS) * DAY_MS
  return at >= fromMs && at < toMs ? at : null
}

/**
 * How many half hours apart an even pass reads: a flight is heard for most of its time in the air, so one of them falls
 * inside a flight of this route's length (430 kt, and half an hour on the ground with the callsign set). No route: an hour.
 */
export function stepFor(route: [FlightPlace, FlightPlace] | null): number {
  if (route === null) return 2
  const hours = distanceNm(route[0].lat, route[0].lon, route[1].lat, route[1].lon) / 430 + 0.5
  return Math.max(1, Math.min(4, Math.floor((hours * 0.6) / 0.5)))
}

/**
 * The part of a leg flown under callsign round tMs, as point indexes [i, j]: from where it began to send it (the leg's start
 * when it is its first callsign) to where it sent another, since readsb keeps a quick turnround in one leg; then cut to
 * TAXI_OUT_MS before its first point in the air and TAXI_IN_MS after its last. A leg that names no callsign is taken whole
 * (the half hour's file said who it was). null: it sent another callsign then.
 */
export function spanUnder(leg: TraceReply, callsign: string, tMs: number, slackMs = 120_000): [number, number] | null {
  const n = leg.t.length
  if (n === 0) return null
  const tS = (tMs - leg.t0Ms) / 1000
  const slackS = slackMs / 1000
  let fromS = -Infinity
  let toS = Infinity
  if (leg.calls.length > 0) {
    let found = false
    for (let k = 0; k < leg.calls.length; k++) {
      if (leg.calls[k][1] !== callsign) continue
      const a = k === 0 ? -Infinity : leg.calls[k][0]
      const b = k + 1 < leg.calls.length ? leg.calls[k + 1][0] : Infinity
      if (tS < a - slackS || tS >= b + slackS) continue
      fromS = a
      toS = b
      found = true
    }
    if (!found) return null
  }
  let i = 0
  while (i < n && leg.t[i] < fromS) i++
  let j = n - 1
  while (j >= 0 && leg.t[j] >= toS) j--
  if (j < i) return null
  let up = i
  while (up <= j && typeof leg.alt[up] !== 'number') up++
  if (up > j) return [i, j] // never in the air under it: all of it
  let down = j
  while (typeof leg.alt[down] !== 'number') down--
  while (i < up && leg.t[i] < leg.t[up] - TAXI_OUT_MS / 1000) i++
  while (j > down && leg.t[j] > leg.t[down] + TAXI_IN_MS / 1000) j--
  return [i, j]
}

/** A slot start well inside the flight, nearest its middle: where the same flight is looked for on other days. The slot it was found at when it holds none. */
export function anchorOf(f: PastFlight, foundAt: number): number {
  const mid = (f.from.tMs + f.to.tMs) / 2
  const at = Math.round(mid / SLOT_MS) * SLOT_MS
  for (const s of [at, at - SLOT_MS, at + SLOT_MS]) if (s >= f.from.tMs + 60_000 && s <= f.to.tMs - 120_000) return s
  return foundAt
}

export class FlightSearch {
  #deps: FlightSearchDeps
  #jobs = new Map<string, Job>() // Map order is use order
  #sleep: (ms: number) => Promise<void>

  constructor(deps: FlightSearchDeps) {
    this.#deps = deps
    this.#sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  }

  /**
   * What is known of the flight `text` names, now: null when it does not read as a flight. The first ask for an id waits for
   * what it is and whether it flies now (two or three requests); scan asks for its past too, back `days` (while nothing is
   * found only UNANCHORED_DAYS, unless deep), which is read in the background: ask again for more of it. 'failed': what it
   * is could not be found out now (a route list did not answer); nothing is kept, the next ask tries again.
   */
  async ask(text: string, o: { scan?: boolean; days?: number; deep?: boolean } = {}): Promise<FlightSearchReply | null | 'failed'> {
    const id = parseFlightId(text)
    if (id === null) return null
    const now = this.#deps.nowMs()
    let job = this.#jobs.get(id.id)
    // A job answers for JOB_TTL_MS: an older one's past would end where its first ask began. One being read is left to finish.
    if (job !== undefined && !job.scanning && now - job.madeMs > JOB_TTL_MS) job = undefined
    if (job === undefined) {
      job = this.#create(id, now)
      this.#evict(now)
    }
    this.#jobs.delete(id.id) // the most recently used
    this.#jobs.set(id.id, job)
    await job.resolved
    if (job.broken) {
      if (this.#jobs.get(id.id) === job) this.#jobs.delete(id.id)
      return 'failed'
    }
    if (now - job.liveAtMs > LIVE_TTL_MS && job.callsigns.length > 0) void this.#refreshLive(job)
    if (o.scan === true && job.callsigns.length > 0) {
      job.askedMs = this.#deps.nowMs()
      const days = Number.isFinite(o.days) ? Math.max(1, Math.min(MAX_DAYS, Math.floor(o.days!))) : DEFAULT_DAYS
      job.days = Math.max(job.days, days)
      if (o.deep === true) job.evenDays = Math.max(job.evenDays, days)
      // A reading that failed is not started again by the next poll: only by an ask a while after (the page's Retry).
      if (job.failed && job.askedMs - job.failedMs >= RETRY_AFTER_MS) job.failed = false
      if (!job.scanning && !job.failed) {
        job.scanning = true
        void this.#scan(job)
          .catch((e: unknown) => {
            this.#fail(job)
            console.error('flights: the search of the past failed:', e)
          })
          .finally(() => (job.scanning = false))
      }
    }
    return this.#reply(job)
  }

  #create(id: FlightId, now: number): Job {
    const job: Job = {
      id, ticket: id.ticket === null ? null : ticketText(id.ticket), airline: null, route: null, primary: id.callsign, callsigns: [], others: [], byRoute: false, boarded: false, reread: new Set(),
      known: false, live: null, liveAtMs: -Infinity, similar: [], resolved: Promise.resolve(), flights: [], anchors: [], endMs: null, fromMs: null,
      days: 0, evenDays: UNANCHORED_DAYS, stepSlots: 2, scanning: false, failed: false, failedMs: -Infinity, askedMs: -Infinity, madeMs: now, broken: false,
    }
    job.resolved = this.#resolve(job).catch((e: unknown) => {
      job.broken = true
      console.error('flights: the lookup failed:', e)
    })
    return job
  }

  /** The jobs older than JOB_TTL_MS go, then the least recently used over MAX_JOBS (never one being read). */
  #evict(now: number): void {
    for (const [key, j] of this.#jobs) {
      if (j.scanning) continue
      if (now - j.madeMs > JOB_TTL_MS || this.#jobs.size >= MAX_JOBS) this.#jobs.delete(key)
    }
  }

  /** What the id is: its route and airline, the callsigns to look for, whether it flies now, and what is like it when it is nothing known. */
  async #resolve(job: Job): Promise<void> {
    const { id } = job
    const r = await this.#deps.route(id.id)
    // A ticket number is read through the route lists (where it flies, and under which callsign): without their answer what
    // would be shown is a guess. A callsign is looked for as it is, with what is known of it.
    if (r === 'failed' && id.ticket !== null) return void (job.broken = true)
    let airlineIcao: string | null = id.callsign !== null && /^[A-Z]{3}\d/.test(id.callsign) ? id.callsign.slice(0, 3) : null
    if (r !== null && r !== 'failed') {
      job.route = [r.from, r.to]
      job.airline = r.airline?.name ?? null
      job.primary = r.callsign
      airlineIcao = r.airline?.icao ?? (/^[A-Z]{3}\d/.test(r.callsign) ? r.callsign.slice(0, 3) : airlineIcao)
    } else if (id.ticket !== null) {
      // adsbdb does not know the number: the app's own table of airlines, else the id as it is (a callsign after all).
      const icao = this.#deps.icaoOf(id.ticket.airline)
      job.primary = icao === null ? id.id : icao + id.ticket.number
      airlineIcao = icao
    }
    job.stepSlots = stepFor(job.route)
    if (job.airline === null && job.primary !== null) job.airline = this.#deps.airlineOf?.(job.primary) ?? null
    const asked = airlineIcao === null ? null : await this.#deps.airlineCallsigns(airlineIcao)
    if (asked === 'failed' && id.ticket !== null) return void (job.broken = true)
    const list = asked === 'failed' ? null : asked
    let listed = job.primary !== null && list !== null && list.has(job.primary)
    if (id.ticket !== null && job.route !== null && list !== null && job.route[0].icao !== null && job.route[1].icao !== null) {
      // A ticket number with its route: the airline's list says whether the number's own callsign flies it (then that is
      // the flight), flies another route (then it is another flight: not looked for when the list names others on the
      // route; with none it is still tried, as the list may be behind, and a flight off the route is not listed anyway),
      // or is not in use (then perhaps).
      const route = `${job.route[0].icao}-${job.route[1].icao}`
      const its = job.primary === null ? undefined : list.get(job.primary)
      if (its !== route) {
        for (const [callsign, r2] of list) if (r2 === route && callsign !== job.primary && job.others.length < MAX_CALLSIGNS) job.others.push(callsign)
        if (its !== undefined && job.others.length > 0) job.primary = null
      }
      listed = its === route || job.others.length > 0
    }
    job.callsigns = job.primary === null ? [] : [job.primary]
    if (job.primary === null) this.#widen(job)
    await this.#refreshLive(job)
    job.known = job.route !== null || listed || (job.live?.length ?? 0) > 0
    if (!job.known) job.similar = await this.#similar(job.primary, list)
  }

  /** The route's other callsigns join the search: the id's own is not flying it. */
  #widen(job: Job): void {
    if (job.others.length === 0) return
    job.callsigns = [...job.callsigns, ...job.others]
    job.others = []
    job.byRoute = true
  }

  /** Who of the job's callsigns (and of those that may yet join) flies now. A ticket number's must be along its route. */
  async #refreshLive(job: Job): Promise<void> {
    job.liveAtMs = this.#deps.nowMs()
    const asked = [...job.callsigns, ...job.others]
    if (asked.length === 0) return void (job.live ??= [])
    let live = await this.#deps.live(asked).catch(() => null)
    if (live === null) return // a failed refresh keeps the last answer
    const route = job.id.ticket === null ? null : job.route
    if (route !== null) live = live.filter((l) => alongRoute(l, route))
    // One of the other callsigns is in the air and the id's own is not: they are how it is flown.
    if (live.some((l) => job.others.includes(l.callsign)) && !live.some((l) => l.callsign === job.primary)) this.#widen(job)
    job.live = live.filter((l) => job.callsigns.includes(l.callsign))
    this.#own(job, job.live.map((l) => l.callsign))
    // Since when each flies (its trace's leg): asked once, not waited for; the next reply has it.
    const now = this.#deps.nowMs()
    for (const l of job.live) {
      if (!job.flights.some((f) => f.hex === l.hex && now - f.to.tMs < ONGOING_MS)) void this.#flightAt(job, l.hex, l.callsign, now, LIVE_SLACK_MS).catch(() => null)
    }
  }

  /** Once the number's own callsign is heard on its route, the route's other callsigns are other flights: they go, with what was found under them. */
  #own(job: Job, heard: readonly string[]): void {
    if (job.primary === null || !heard.includes(job.primary) || (!job.byRoute && job.others.length === 0)) return
    job.byRoute = false
    job.others = []
    job.callsigns = [job.primary]
    job.flights = job.flights.filter((f) => f.callsign === job.primary)
    job.anchors = job.anchors.filter((a) => a.callsign === job.primary)
    if (job.live !== null) job.live = job.live.filter((l) => l.callsign === job.primary)
  }

  /** Ids one slip from the callsign that the airline's list knows, or that are in the air in the newest half hour (any airline): those flying first. */
  async #similar(callsign: string | null, list: ReadonlyMap<string, string> | null): Promise<SimilarFlight[]> {
    if (callsign === null) return []
    const out = new Map<string, SimilarFlight>()
    if (list !== null) for (const id of slips(callsign, list.keys(), 40)) out.set(id, { id, route: list.get(id) ?? null, flying: false })
    const air = await this.#deps.calls(newestSlotMs(this.#deps.nowMs())).catch(() => 'unavailable' as const)
    if (typeof air !== 'string') {
      for (const id of slips(callsign, air.callsigns(), 40)) out.set(id, { id, route: out.get(id)?.route ?? list?.get(id) ?? null, flying: true })
    }
    return [...out.values()].sort((a, b) => Number(b.flying) - Number(a.flying) || a.id.localeCompare(b.id)).slice(0, MAX_SIMILAR)
  }

  #fail(job: Job): void {
    job.failed = true
    job.failedMs = this.#deps.nowMs()
  }

  /** How far back the job's past is read, in days: as asked, but with nothing found yet only as far as an even pass may go. */
  #depth(job: Job): number {
    return job.anchors.length > 0 ? job.days : Math.min(job.days, job.evenDays)
  }

  /** Whether the page still asks for this search's past. */
  #alive(job: Job): boolean {
    return this.#deps.nowMs() - job.askedMs < ALIVE_MS
  }

  /** Reads the past a day at a time back from where it stopped, while it is asked for, as far as it is asked to. */
  async #scan(job: Job): Promise<void> {
    const oldest = this.#deps.oldestSlotMs()
    if (job.endMs === null) job.endMs = job.fromMs = newestSlotMs(this.#deps.nowMs()) + SLOT_MS
    const end = job.endMs
    while (this.#alive(job)) {
      const target = Math.max(oldest, end - this.#depth(job) * DAY_MS)
      const to = job.fromMs!
      if (to <= target) return
      const from = Math.max(target, to - DAY_MS)
      const first = to === end
      let ok = first || job.anchors.length === 0 ? await this.#even(job, from, to) : await this.#anchored(job, from, to, target)
      // The newest day has no flight under the id's own callsign: the airline's others on the route are read from the same
      // half hours (they are held: no download).
      if (ok && first && job.anchors.length === 0 && job.others.length > 0) {
        this.#widen(job)
        ok = await this.#even(job, from, to)
      }
      if (ok && first) await this.#byBoard(job)
      if (!ok) return // not asked for any more, or adsb.lol could not be read: it goes on from `to` next time
      job.fromMs = from
    }
  }

  /**
   * An even pass over [from, to): every flight in it, and (daily) from them the times of day for the days before. false: stopped.
   */
  async #even(job: Job, from: number, to: number, daily = true): Promise<boolean> {
    const slots = evenSlots(from, to, job.stepSlots)
    const found: [PastFlight, number][] = []
    for (let i = 0; i < slots.length; i += 3) {
      if (!this.#alive(job)) return false
      const batch = slots.slice(i, i + 3)
      const read = await Promise.all(batch.map((s) => this.#read(job, s)))
      if (read.includes(null)) return false
      read.forEach((flights, k) => {
        for (const f of flights!) found.push([f, batch[k]])
      })
    }
    // (a callsign that has left the search since, #own, gives no time of day)
    if (daily) for (const [f, slot] of found) if (job.callsigns.includes(f.callsign)) this.#anchor(job, f.callsign, anchorOf(f, slot))
    return true
  }

  /**
   * A flight of a known route that was not heard to its end: the AFTER_MS after it are read evenly, once, for what flew on
   * under the job's callsigns then (on any aircraft); for AFTER_MAX flights of a job at most. Such a leg is no daily flight:
   * it gives the days before no time of day. false: stopped.
   */
  async #afterShort(job: Job, f: PastFlight): Promise<boolean> {
    const key = `${f.hex}:${f.from.tMs}`
    if (job.route === null || job.endMs === null || job.reread.has(key) || job.reread.size >= AFTER_MAX) return true
    const dest = job.route[1]
    if (distanceNm(dest.lat, dest.lon, f.to.lat, f.to.lon) <= SHORT_NM) return true
    const from = Math.ceil(f.to.tMs / SLOT_MS) * SLOT_MS
    const ok = await this.#even(job, from, Math.min(job.endMs, from + AFTER_MS), false)
    if (ok) job.reread.add(key)
    return ok
  }

  /** One time of day for each flight of a day, by its callsign: a flight read at two half hours gave the same one twice. */
  #anchor(job: Job, callsign: string, at: number): void {
    const has = job.anchors.some((b) => b.callsign === callsign && Math.abs(sameTimeIn(b.at, at - DAY_MS / 2, at + DAY_MS / 2)! - at) < 3 * SLOT_MS)
    if (!has) job.anchors.push({ callsign, at })
  }

  /**
   * A ticket number to or from Ben Gurion, searched under its airline's callsigns on the route: the flight board's times for
   * the number say which of them flew it (a flight heard at the airport when the board says the number's flight was there),
   * and the others go, with their flights. Asked once, after the newest day is read; no answer, or no flight at the board's
   * times: nothing changes.
   */
  async #byBoard(job: Job): Promise<void> {
    const { ticket } = job.id
    if (job.boarded || !job.byRoute || ticket === null || job.route === null || this.#deps.board === undefined) return
    const arrival = job.route[1].icao === BOARD_AIRPORT
    if (!arrival && job.route[0].icao !== BOARD_AIRPORT) return
    job.boarded = true
    const board = await this.#deps.board(ticket.airline, ticket.number).catch(() => null)
    if (board === null || board.arrival !== arrival) return
    const its = new Set<string>()
    for (const f of job.flights) {
      const at = arrival ? f.to.tMs : f.from.tMs
      const [before, after] = arrival ? [BOARD_LOST_MS, BOARD_TAXI_MS] : [BOARD_TAXI_MS, BOARD_LOST_MS]
      if (board.times.some((t) => at >= t - before && at <= t + after)) its.add(f.callsign)
    }
    if (its.size === 0 || job.callsigns.every((c) => its.has(c))) return
    job.callsigns = job.callsigns.filter((c) => its.has(c))
    job.byRoute = job.callsigns.length > 1
    job.flights = job.flights.filter((f) => its.has(f.callsign))
    if (job.live !== null) job.live = job.live.filter((l) => its.has(l.callsign))
    job.anchors = []
    for (const f of job.flights) this.#anchor(job, f.callsign, anchorOf(f, Math.round((f.from.tMs + f.to.tMs) / 2 / SLOT_MS) * SLOT_MS))
  }

  /**
   * The day [from, to) read at each time of day a flight was found at, a slot or three to either side when its callsign is
   * not there (another's flight in that half hour is added too, and is looked for at its own time). false: stopped.
   */
  async #anchored(job: Job, from: number, to: number, target: number): Promise<boolean> {
    // The days before this one, as far as the reading will go, asked for ahead: their downloads run while this one is read.
    for (let d = 1; d <= AHEAD; d++) for (const a of job.anchors) {
      const at = sameTimeIn(a.at, from - d * DAY_MS, to - d * DAY_MS)
      if (at !== null && at >= target) void this.#deps.calls(at).catch(() => {})
    }
    for (const anchor of [...job.anchors]) {
      if (!job.anchors.includes(anchor)) continue // its callsign left the search meanwhile (#own)
      const base = sameTimeIn(anchor.at, from, to)
      if (base === null) continue
      for (const off of NEAR) {
        if (!this.#alive(job)) return false
        const slot = base + off * SLOT_MS
        if (slot < this.#deps.oldestSlotMs()) continue
        const flights = await this.#read(job, slot)
        if (flights === null) return false
        const its = flights.filter((f) => f.callsign === anchor.callsign)
        if (its.length === 0) continue
        anchor.at = anchorOf(its[0], slot) // the flight's time that day: a schedule that drifts is followed
        for (const f of its) if (!(await this.#afterShort(job, f))) return false
        break
      }
    }
    return true
  }

  /**
   * One half hour's start read for the job's callsigns: the flights found there (each added to the job once). [] when none of
   * them was in the air, or adsb.lol has no file for it (or not yet: its newest); null when it could not be read after a few
   * tries (the job fails).
   */
  async #read(job: Job, slotMs: number): Promise<PastFlight[] | null> {
    let calls: CallIndex | HistoryMiss = 'unavailable'
    // adsb.lol may be late with its newest half hour: that one is not waited for, and the search goes on without it (who
    // flies in it is in the one before too, or took off since: the live lookup's).
    const newest = slotMs >= newestSlotMs(this.#deps.nowMs())
    for (let tries = 0; tries <= (newest ? 0 : RETRIES); tries++) {
      calls = await this.#deps.calls(slotMs).catch(() => 'unavailable' as const)
      if (calls !== 'unavailable') break
      if (tries < RETRIES && !newest) await this.#sleep(RETRY_MS)
    }
    if (calls === 'unavailable') {
      if (newest) return []
      this.#fail(job)
      return null
    }
    if (calls === 'missing') return []
    const out: PastFlight[] = []
    for (const callsign of [...job.callsigns]) {
      for (const hex of calls.hexes(callsign)) {
        const f = await this.#flightAt(job, hex, callsign, slotMs)
        if (f === 'unavailable') {
          this.#fail(job)
          return null
        }
        if (f !== null) out.push(f)
      }
    }
    this.#own(job, out.map((f) => f.callsign))
    return out.filter((f) => job.callsigns.includes(f.callsign))
  }

  /**
   * The flight of hex that was in the air at tMs under callsign, from its trace: the part under that callsign (spanUnder) of
   * the leg holding tMs; a leg that touches its day file's edge is read with the next file too. Known already: that one.
   * slackMs: how long before tMs the leg may end (the trace of an aircraft flying now is some minutes behind). null: its
   * trace has no such leg (adsb.lol heard it in the half hour's file and kept no trace of it); 'unavailable': the trace could
   * not be had.
   */
  async #flightAt(job: Job, hex: string, callsign: string, tMs: number, slackMs = 30_000): Promise<PastFlight | 'unavailable' | null> {
    const has = job.flights.find((f) => f.hex === hex && tMs >= f.from.tMs - 120_000 && tMs <= f.to.tMs + Math.max(120_000, slackMs))
    if (has !== undefined && slackMs <= 30_000) return has
    const now = this.#deps.nowMs()
    const oldest = this.#deps.oldestSlotMs()
    let from = dayStart(tMs)
    let to = Math.min(now, from + DAY_MS - 1)
    for (let pass = 0; pass < 3; pass++) {
      const day = await this.#deps.day(hex, Math.max(from, oldest), to)
      if (day === 'unavailable') return 'unavailable'
      if (day === null) return null
      let found: { leg: TraceReply; span: [number, number] } | null = null
      for (const leg of day.legs) {
        if (leg.t0Ms > tMs + 100_000 || lastMs(leg) < tMs - slackMs) continue
        const span = spanUnder(leg, callsign, Math.min(tMs, lastMs(leg)))
        if (span !== null) found = { leg, span }
      }
      if (found === null) return null
      const { leg, span } = found
      const early = span[0] === 0 && leg.t0Ms - from < EDGE_MS && from > oldest
      const late = span[1] === leg.t.length - 1 && to - lastMs(leg) < EDGE_MS && to < now
      if ((early || late) && pass < 2) {
        if (early) from -= DAY_MS
        if (late) to = Math.min(now, to + DAY_MS)
        continue
      }
      const made = this.#add(job, hex, callsign, leg, span, day)
      // The same aircraft's other flights under the callsign in the files just read cost nothing more. Not one the files'
      // edge cuts: that is a part of a flight, read whole when its own half hour is.
      for (const other of day.legs) {
        if (other === leg) continue
        if ((other.t0Ms - from < EDGE_MS && from > oldest) || (to - lastMs(other) < EDGE_MS && to < now)) continue
        other.calls.forEach(([sec, c]) => {
          const part = c === callsign ? spanUnder(other, callsign, other.t0Ms + sec * 1000) : null
          if (part !== null) this.#add(job, hex, callsign, other, part, day)
        })
      }
      return made
    }
    return null
  }

  /** The flight into the job; null when it is a ticket number's and does not lie on its route (the callsign was another flight's that day). */
  #add(job: Job, hex: string, callsign: string, leg: TraceReply, [i, j]: [number, number], day: TraceDay): PastFlight | null {
    const end = (k: number): PastFlight['from'] => ({ tMs: leg.t0Ms + leg.t[k] * 1000, lat: leg.lat[k], lon: leg.lon[k], alt: leg.alt[k] })
    const f: PastFlight = { hex, callsign, reg: day.reg, typeCode: day.typeCode, from: end(i), to: end(j) }
    if (job.id.ticket !== null && job.route !== null && !onRoute(f, job.route)) return null
    const has = job.flights.find((x) => x.hex === hex && x.from.tMs === f.from.tMs)
    if (has !== undefined) return f.to.tMs >= has.to.tMs ? Object.assign(has, f) : has // a flight still in the air grows; none shrinks
    job.flights.push(f)
    return f
  }

  #reply(job: Job): FlightSearchReply {
    const now = this.#deps.nowMs()
    const oldest = this.#deps.oldestSlotMs()
    const flying = new Map((job.live ?? []).map((l) => [l.hex, l]))
    const ongoing = (f: PastFlight): boolean => flying.has(f.hex) && now - f.to.tMs < ONGOING_MS
    const target = job.endMs === null ? null : Math.max(oldest, job.endMs - this.#depth(job) * DAY_MS)
    const done = job.fromMs !== null && target !== null && job.fromMs <= target
    return {
      id: job.id.id,
      ticket: job.ticket,
      callsigns: job.callsigns,
      byRoute: job.byRoute,
      airline: job.airline,
      route: job.route,
      known: job.known,
      live: job.live === null ? null : job.live.map((l) => ({ ...l, sinceMs: job.flights.find((f) => f.hex === l.hex && ongoing(f))?.from.tMs ?? null })),
      past: job.flights.filter((f) => !ongoing(f)).sort((a, b) => b.from.tMs - a.from.tMs),
      scan: {
        state: job.failed ? 'failed' : done ? 'done' : job.scanning && this.#alive(job) ? 'running' : 'idle',
        fromMs: job.fromMs,
        oldestMs: oldest,
        more: job.fromMs === null || job.fromMs > oldest,
      },
      similar: job.similar,
    }
  }
}
