// server/flightWatch.ts
// The watch list: flights the person wants caught whenever they are heard, even with no page open. Each is looked up every
// WATCH_TICK_MS by its number or callsign, the way the search does (flightSearch.ts: an airline's lettered callsigns, the
// route), and recorded (flightLog.ts) from the moment it is heard, through silences out of range up to WATCH_LOST_MS
// (central Saudi Arabia has no receivers: EY 593 was silent there for over an hour), until it lands. A watch whose recording
// ended stays listed DONE_MS, then goes; one never heard goes after MAX_MS. Kept in <flights dir>/watch.json across restarts.
import { readFileSync, writeFileSync } from 'node:fs'
import { WATCH_SEEN_MS, type RecordingState, type WatchState } from '../shared/api.ts'
import type { EndReason } from './flightLog.ts'

export const WATCH_TICK_MS = 30_000
export const WATCH_LOST_MS = 4 * 3_600_000
const DONE_MS = 3_600_000
const MAX_MS = 24 * 3_600_000
const MAX_WATCHES = 20

/** What the search makes of a text: its id and how it is shown, its route, and who of it is heard now. */
export interface WatchFound {
  id: string
  label: string
  route: string | null
  live: { hex: string; callsign: string }[]
}

export interface FlightWatchDeps {
  nowMs(): number
  find(text: string): Promise<WatchFound | null | 'failed'> // null: not a flight id; 'failed': could not be looked up now
  recording(hex: string): RecordingState | null // its recording under way
  record(hex: string): RecordingState | null // starts (or keeps) a watched recording; null: recording is off
  endedWhy(hex: string): EndReason | null
}

interface Kept {
  id: string
  label: string
  route: string | null
  sinceMs: number
  hex: string | null
  callsign: string | null
  heardMs: number | null
  file: string | null
  ended: 'landed' | 'lost' | null
  endedMs: number | null
}

export class FlightWatch {
  #file: string
  #deps: FlightWatchDeps
  #kept: Kept[] = []
  #ticking = false

  constructor(file: string, deps: FlightWatchDeps) {
    this.#file = file
    this.#deps = deps
    try {
      const list = JSON.parse(readFileSync(file, 'utf8')) as Kept[]
      if (Array.isArray(list)) this.#kept = list.filter((k) => typeof k?.id === 'string' && typeof k.sinceMs === 'number')
    } catch {
      // none yet, or unreadable: an empty list
    }
  }

  get size(): number {
    return this.#kept.length
  }

  list(): WatchState[] {
    const now = this.#deps.nowMs()
    return this.#kept.map((k) => {
      const rec = k.hex === null ? null : this.#deps.recording(k.hex)
      const heardMs = rec?.lastMs ?? k.heardMs
      return {
        id: k.id, label: k.label, route: k.route, sinceMs: k.sinceMs, hex: k.hex, callsign: k.callsign, heardMs,
        seen: rec !== null && heardMs !== null && now - heardMs < WATCH_SEEN_MS, file: rec?.file ?? k.file, ended: k.ended,
      }
    })
  }

  /** Puts the flight `text` names on the list (and looks for it at once) or takes it off. null: not a flight id. */
  async set(text: string, on: boolean): Promise<WatchState[] | null | 'failed'> {
    const found = await this.#deps.find(text)
    if (found === null || found === 'failed') return found
    const had = this.#kept.find((k) => k.id === found.id)
    if (!on) {
      // Its recording goes on to its end (it is a recording like any other: the Recordings list can stop it).
      if (had) this.#kept = this.#kept.filter((k) => k !== had)
    } else if (!had) {
      if (this.#kept.length >= MAX_WATCHES) this.#kept.shift()
      const k: Kept = { id: found.id, label: found.label, route: found.route, sinceMs: this.#deps.nowMs(), hex: null, callsign: null, heardMs: null, file: null, ended: null, endedMs: null }
      this.#kept.push(k)
      this.#catch(k, found)
    }
    this.#save()
    return this.list()
  }

  /** Looks for every watched flight not being recorded; notes the ones whose recording ended; drops the old ones. */
  async tick(): Promise<void> {
    if (this.#ticking) return
    this.#ticking = true
    try {
      const now = this.#deps.nowMs()
      for (const k of [...this.#kept]) {
        const rec = k.hex === null ? null : this.#deps.recording(k.hex)
        if (rec !== null) {
          k.heardMs = rec.lastMs ?? k.heardMs
          k.file = rec.file
          continue
        }
        if (k.ended === null && k.file !== null && k.hex !== null) {
          const why = this.#deps.endedWhy(k.hex)
          k.ended = why === 'landed' ? 'landed' : 'lost'
          k.endedMs = now
        }
        const old = k.ended !== null ? now - (k.endedMs ?? now) >= DONE_MS : now - k.sinceMs >= MAX_MS
        if (old) {
          this.#kept = this.#kept.filter((x) => x !== k)
          continue
        }
        if (k.ended !== null) continue
        const found = await this.#deps.find(k.id).catch(() => 'failed' as const)
        if (found !== null && found !== 'failed') this.#catch(k, found)
      }
      this.#save()
    } finally {
      this.#ticking = false
    }
  }

  /** One of its live aircraft (the one heard before first) is recorded from now. */
  #catch(k: Kept, found: WatchFound): void {
    const l = found.live.find((x) => x.hex === k.hex) ?? found.live[0]
    if (l === undefined) return
    const rec = this.#deps.record(l.hex)
    if (rec === null) return
    k.hex = l.hex
    k.callsign = l.callsign
    k.file = rec.file
    k.heardMs = rec.lastMs ?? k.heardMs
  }

  #save(): void {
    try {
      writeFileSync(this.#file, JSON.stringify(this.#kept, null, 1) + '\n')
    } catch (e) {
      console.error('watch: the list could not be saved:', e) // ponytail: kept in memory; the next change tries again
    }
  }
}
