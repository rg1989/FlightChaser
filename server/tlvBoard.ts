// server/tlvBoard.ts
// Ben Gurion's flight board, the Israel Airports Authority's open data on data.gov.il (no key):
//   GET https://data.gov.il/api/3/action/datastore_search?resource_id=e83f763b-b7d7-479e-b172-ae981ddc6de5
//       &filters={"CHOPER":"W4","CHFLTN":"3257"}&limit=40
//   → {success: true, result: {records: [{CHOPER: "W4", CHFLTN: "3257", CHAORD: "A" (arrival) | "D", CHLOC1: "OTP",
//       CHSTOL: "2026-10-11T08:25:00" (scheduled), CHPTOL: "2026-10-11T08:45:00" (estimated, then actual), CHRMINE: "LANDED", …}]}}
// Times are Israel's clock, with no zone. It lists yesterday to about three days ahead (checked 2026-10-11: 2,628 rows).
// The flight search (flightSearch.ts) asks it for one thing: when a ticket number's flights reached or left Ben Gurion,
// to tell which of its airline's callsigns on the route is that number's (nothing else ties the two). An answer is kept
// 20 minutes; a failure is not kept, and costs the search nothing but that.
export const BOARD_URL = 'https://data.gov.il/api/3/action/datastore_search'
export const BOARD_RESOURCE = 'e83f763b-b7d7-479e-b172-ae981ddc6de5'
const ZONE = 'Asia/Jerusalem'
const TIMEOUT_MS = 8000
const TTL_MS = 20 * 60_000
const MAX_KEPT = 100

/** When a ticket number's flights were at Ben Gurion: landing there (arrival) or leaving, each day's estimated or actual time, UTC ms. */
export interface BoardTimes {
  arrival: boolean
  times: number[]
}

/** How far a zone's clock is ahead of UTC at a moment, ms. */
function zoneOffsetMs(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(utcMs)
  const v = (type: string): number => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - Math.floor(utcMs / 1000) * 1000
}

/** A wall clock time of a zone ('2026-10-11T08:25:00') as UTC ms; NaN when it is no time. */
export function zoneTimeMs(wall: string, zone = ZONE): number {
  const asUtc = Date.parse(`${wall}Z`)
  if (Number.isNaN(asUtc)) return Number.NaN
  return asUtc - zoneOffsetMs(asUtc - zoneOffsetMs(asUtc, zone), zone) // the offset at that moment, not at the same hour of UTC
}

/** A board answer → the flights' times; null when it lists none of the flight, or is no answer. Arrival is what most of its rows say. */
export function parseBoard(body: unknown): BoardTimes | null {
  const records = (body as { result?: { records?: unknown } } | null)?.result?.records
  if (!Array.isArray(records)) return null
  const rows: { arrival: boolean; tMs: number }[] = []
  for (const r of records) {
    if (typeof r !== 'object' || r === null) continue
    const o = r as Record<string, unknown>
    const at = typeof o.CHPTOL === 'string' ? o.CHPTOL : typeof o.CHSTOL === 'string' ? o.CHSTOL : null
    const tMs = at === null ? Number.NaN : zoneTimeMs(at)
    if (Number.isFinite(tMs) && (o.CHAORD === 'A' || o.CHAORD === 'D') && o.CHRMINE !== 'CANCELED') rows.push({ arrival: o.CHAORD === 'A', tMs })
  }
  if (rows.length === 0) return null
  const arrival = rows.filter((r) => r.arrival).length * 2 >= rows.length
  return { arrival, times: rows.filter((r) => r.arrival === arrival).map((r) => r.tMs).sort((a, b) => a - b) }
}

export class TlvBoard {
  #userAgent: string
  #fetch: typeof fetch
  #now: () => number
  #kept = new Map<string, { ms: number; value: BoardTimes | null }>()
  #stop = new AbortController()

  constructor(o: { userAgent: string; fetchFn?: typeof fetch; nowMs?: () => number }) {
    this.#userAgent = o.userAgent
    this.#fetch = o.fetchFn ?? ((input, init) => fetch(input, init))
    this.#now = o.nowMs ?? Date.now
  }

  /** The board's times for a ticket number (its airline's designator and its number); null: not on the board, or the board could not be asked. */
  async times(airline: string, number: string): Promise<BoardTimes | null> {
    if (!/^[A-Z0-9]{2}$/.test(airline) || !/^\d{1,4}[A-Z]?$/.test(number)) return null
    const key = `${airline} ${number}`
    const hit = this.#kept.get(key)
    if (hit !== undefined && this.#now() - hit.ms < TTL_MS) return hit.value
    try {
      // The board writes a number as the airline does: with its leading zeros or without. Asked as typed.
      const q = new URLSearchParams({ resource_id: BOARD_RESOURCE, filters: JSON.stringify({ CHOPER: airline, CHFLTN: number }), limit: '40' })
      const res = await this.#fetch(`${BOARD_URL}?${q}`, {
        headers: { 'user-agent': this.#userAgent, accept: 'application/json' },
        signal: AbortSignal.any([this.#stop.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      })
      if (res.status !== 200) {
        void res.body?.cancel().catch(() => {})
        return null
      }
      const value = parseBoard(await res.json())
      this.#kept.delete(key)
      this.#kept.set(key, { ms: this.#now(), value })
      if (this.#kept.size > MAX_KEPT) this.#kept.delete(this.#kept.keys().next().value!)
      return value
    } catch {
      return null
    }
  }

  close(): void {
    this.#stop.abort()
  }
}
