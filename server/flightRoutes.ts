// server/flightRoutes.ts
// What the open route lists know of a flight, for the flight search (flightSearch.ts):
// - adsbdb.com (free, no key): GET /v0/callsign/{id} answers for a ticket number as for a callsign.
//     200 → {"response": {"flightroute": {callsign, callsign_icao: "WMT3257", callsign_iata: "W43257",
//            airline: {name, icao, iata, …}, origin: {icao_code, iata_code, name, municipality, latitude, longitude, …},
//            destination: {…}}}}   404 → {"response": "unknown callsign"}
//   Checked 2026-10-11 with W43257 (Bucharest to Tel Aviv, Wizz Air Malta) and WMT7403 (the callsign that flight is flown
//   under: the same route, and nothing that ties the two).
// - vradarserver/standing-data (CC0 1.0): an airline's callsigns with their routes, one CSV an airline:
//     https://raw.githubusercontent.com/vradarserver/standing-data/main/routes/schema-01/W/WMT-all.csv
//     Callsign,Code,Number,AirlineCode,AirportCodes      WMT7403,WMT,7403,WMT,LROP-LLBG
//   So the callsigns an airline uses on a route can be listed when a ticket number's own callsign is not one of them.
// Both are kept in memory: a route 6 h, an unknown number 1 h, an airline's list a day; a failed request is not kept.
import type { FlightPlace } from '../shared/api.ts'

export const ADSBDB_FLIGHT_URL = 'https://api.adsbdb.com/v0/callsign/'
export const STANDING_URL = 'https://raw.githubusercontent.com/vradarserver/standing-data/main/routes/schema-01/'
const TIMEOUT_MS = 10_000
const ROUTE_TTL_MS = 6 * 3_600_000
const UNKNOWN_TTL_MS = 3_600_000
const LIST_TTL_MS = 24 * 3_600_000
const GAP_MS = 250 // between two requests to adsbdb
const MAX_KEPT = 300

/** What adsbdb says of a ticket number or a callsign. */
export interface FlightRoute {
  callsign: string // the id as an aircraft would send it, when its airline flies under its ticket numbers: 'WMT3257'
  airline: { name: string; icao: string | null } | null
  from: FlightPlace
  to: FlightPlace
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

function place(v: unknown): FlightPlace | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const lat = o.latitude
  const lon = o.longitude
  const name = text(o.name)
  if (typeof lat !== 'number' || typeof lon !== 'number' || !(Math.abs(lat) <= 90 && Math.abs(lon) <= 180) || name === null) return null
  const code = (c: unknown, n: number): string | null => (typeof c === 'string' && new RegExp(`^[A-Z0-9]{${n}}$`).test(c) ? c : null)
  return { icao: code(o.icao_code, 4), iata: code(o.iata_code, 3), name, city: text(o.municipality), lat, lon }
}

/** An adsbdb answer → the flight's route; null when it holds none (an unknown number, or an airport without a place). */
export function parseFlightRoute(body: unknown): FlightRoute | null {
  const r = (body as { response?: { flightroute?: Record<string, unknown> } } | null)?.response?.flightroute
  if (typeof r !== 'object' || r === null) return null
  const from = place(r.origin)
  const to = place(r.destination)
  const callsign = text(r.callsign_icao)?.toUpperCase() ?? null
  if (from === null || to === null || callsign === null || !/^[A-Z0-9]{3,8}$/.test(callsign)) return null
  const a = typeof r.airline === 'object' && r.airline !== null ? (r.airline as Record<string, unknown>) : null
  const name = a === null ? null : text(a.name)
  const icao = a === null ? null : text(a.icao)?.toUpperCase() ?? null
  return { callsign, airline: name === null ? null : { name, icao: icao !== null && /^[A-Z]{3}$/.test(icao) ? icao : null }, from, to }
}

/** An airline's standing-data CSV → callsign → route ('LROP-LLBG'; a route with a stop has three codes). Rows that are not one are skipped. */
export function parseStanding(csv: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of csv.split(/\r?\n/)) {
    const cells = line.split(',')
    const callsign = cells[0]?.trim().toUpperCase() ?? ''
    const route = cells[4]?.trim().toUpperCase() ?? ''
    if (/^[A-Z0-9]{3,8}$/.test(callsign) && /^[A-Z0-9]{3,4}(-[A-Z0-9]{3,4})+$/.test(route)) out.set(callsign, route)
  }
  return out
}

interface Kept<T> { ms: number; ttlMs: number; value: T }

export class FlightRoutes {
  #userAgent: string
  #fetch: typeof fetch
  #now: () => number
  #routes = new Map<string, Kept<FlightRoute | null>>()
  #lists = new Map<string, Kept<ReadonlyMap<string, string> | null>>()
  #pending = new Map<string, Promise<unknown>>()
  #chain: Promise<unknown> = Promise.resolve() // adsbdb is asked one request at a time, GAP_MS apart
  #stop = new AbortController()

  constructor(o: { userAgent: string; fetchFn?: typeof fetch; nowMs?: () => number }) {
    this.#userAgent = o.userAgent
    this.#fetch = o.fetchFn ?? ((input, init) => fetch(input, init))
    this.#now = o.nowMs ?? Date.now
  }

  /** adsbdb's route for a ticket number or callsign (3 to 8 letters and digits): null when it knows none, 'failed' when it could not be asked. */
  async route(id: string): Promise<FlightRoute | null | 'failed'> {
    if (!/^[A-Z0-9]{3,8}$/.test(id)) return null
    const hit = this.#routes.get(id)
    if (hit !== undefined && this.#now() - hit.ms < hit.ttlMs) return hit.value
    return this.#once(`r:${id}`, async () => {
      const turn = this.#chain.then(() => this.#get(ADSBDB_FLIGHT_URL + id))
      this.#chain = turn.then(() => new Promise((r) => setTimeout(r, GAP_MS)), () => {})
      const res = await turn
      if (res === null || (res.status !== 200 && res.status !== 404)) return 'failed' as const
      let value: FlightRoute | null = null
      if (res.status === 200) {
        try {
          value = parseFlightRoute(JSON.parse(res.body))
        } catch {
          return 'failed' as const // a 200 that is not JSON
        }
      }
      this.#keep(this.#routes, id, value, value === null ? UNKNOWN_TTL_MS : ROUTE_TTL_MS)
      return value
    })
  }

  /** An airline's callsigns with their routes, by its ICAO designator; null when the list has none for it, or could not be had. */
  async callsigns(icao: string): Promise<ReadonlyMap<string, string> | null> {
    if (!/^[A-Z]{3}$/.test(icao)) return null
    const hit = this.#lists.get(icao)
    if (hit !== undefined && this.#now() - hit.ms < hit.ttlMs) return hit.value
    return this.#once(`l:${icao}`, async () => {
      const res = await this.#get(`${STANDING_URL}${icao[0]}/${icao}-all.csv`)
      if (res === null || (res.status !== 200 && res.status !== 404)) return null // not kept: asked again next time
      const value = res.status === 200 ? parseStanding(res.body) : null
      this.#keep(this.#lists, icao, value !== null && value.size > 0 ? value : null, LIST_TTL_MS)
      return value !== null && value.size > 0 ? value : null
    })
  }

  close(): void {
    this.#stop.abort()
  }

  /** Asks for one key at a time share one request. */
  #once<T>(key: string, run: () => Promise<T>): Promise<T> {
    let p = this.#pending.get(key) as Promise<T> | undefined
    if (p === undefined) {
      p = run().finally(() => this.#pending.delete(key))
      this.#pending.set(key, p)
    }
    return p
  }

  /** One GET that never throws: null on a network error or a timeout. */
  async #get(url: string): Promise<{ status: number; body: string } | null> {
    try {
      const res = await this.#fetch(url, {
        headers: { 'user-agent': this.#userAgent, accept: 'application/json, text/csv' },
        signal: AbortSignal.any([this.#stop.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      })
      return { status: res.status, body: await res.text() }
    } catch {
      return null
    }
  }

  #keep<T>(map: Map<string, Kept<T>>, key: string, value: T, ttlMs: number): void {
    map.delete(key)
    map.set(key, { ms: this.#now(), ttlMs, value })
    if (map.size > MAX_KEPT) map.delete(map.keys().next().value!)
  }
}
