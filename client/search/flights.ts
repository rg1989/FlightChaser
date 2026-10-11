// client/search/flights.ts
// A flight looked up worldwide by its ticket number or callsign (the server's flight search, shared/api.ts
// FlightSearchReply), as the search box shows it: a heading (what the flight is, its route, what the search is doing) and
// rows: where it flies now, each flight of the past days, and, when nothing is known under what was typed, the flights one
// slip of the keyboard away. Pure: the box (ui/searchBox.ts) asks the server, with a pause after the last key so a number
// half typed is not looked up, and draws this.
import type { FlightEnd, FlightPlace, FlightSearchReply, LiveFlight, PastFlight, SimilarFlight } from '../../shared/api.ts'
import { countryOf } from '../../shared/icaoCountry.ts'
import type { Item } from './search.ts'

/** How long after the last key a flight is looked up: a number being typed is not asked for digit by digit. */
export const LOOKUP_AFTER_MS = 600
/** How long the text must then stay as it is before its past days are searched (the costly part). */
export const PAST_AFTER_MS = 1200
/** While the past is searched the server is asked again this often: it searches only while asked. */
export const POLL_MS = 1000
/** The past is searched this far back at first, then to each of these when asked for more; adsb.lol keeps about 42 days. */
export const FIRST_DAYS = 14
export const MORE_DAYS: readonly number[] = [7, 14, 28, 42]

/** Where the box is with one flight id. */
export interface FlightLookup {
  id: string // as searched: 'W43257'
  state: 'offer' | 'wait' | 'loading' | 'ok' | 'error' // offer: not asked unless picked (it reads as an aircraft type too)
  reply: FlightSearchReply | null // the last answer, kept while the next is awaited
  past: boolean // its past days are asked for
  days: number
  deep: boolean
}

export interface FlightView {
  title: string // 'W4 3257 · Wizz Air Malta'
  route: string | null // 'Bucharest OTP → Tel Aviv TLV'
  notes: string[] // what the search is doing or found, in a few words; the last is the newest
  busy: boolean
  doing: string | null // while the past is searched: how far it has got (the last of notes), said again under a long list
  rows: Item[]
}

/** What the rows need from the page: the time, and the places file once it has loaded (nothing is named until then). */
export interface FlightEnv {
  nowMs: number
  cityOf(icao: string): string | null // an airport's city by its ICAO code
  near(lat: number, lon: number): string | null // the ICAO code of the airport at this place (an aircraft on it or just off it)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const two = (n: number): string => String(n).padStart(2, '0')
const LOW_FT = 6000 // an aircraft heard this low by an airport is taken to be leaving or reaching it

/** 'Sat 10 Oct', in the browser's time zone, as the History bar says a day. */
export function dayText(tMs: number): string {
  const d = new Date(tMs)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** '06:11', in the browser's time zone. */
export function clockText(tMs: number): string {
  const d = new Date(tMs)
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}

/** '2 h 26 min', '46 min'. */
export function durationText(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${two(min % 60)} min`
}

const feet = (ft: number): string => `${(Math.round(ft / 100) * 100).toLocaleString('en-US')} ft`
const placeText = (p: FlightPlace): string => [p.city ?? p.name, p.iata ?? p.icao].filter(Boolean).join(' ')

/**
 * Where a flight began or ended, in words: the airport's city when it was heard on it or just off it (the route's own word
 * for it when it is one of the route's: Bucharest, where the places file says Otopeni), else how high it was heard.
 */
function endText(e: FlightEnd, env: FlightEnv, which: 'first' | 'last', route: readonly FlightPlace[] | null): string {
  const low = e.alt === 'g' || (typeof e.alt === 'number' && e.alt < LOW_FT)
  const code = low ? env.near(e.lat, e.lon) : null
  if (code !== null) return route?.find((p) => p.icao === code)?.city ?? env.cityOf(code) ?? code
  return e.alt === 'g' ? 'on the ground' : typeof e.alt === 'number' ? `${which} heard at ${feet(e.alt)}` : `${which} heard in the air`
}

/** A flight in the air now: its callsign, and where it is in a few words. */
export function liveRow(l: LiveFlight): Item {
  const where = l.alt === 'g' ? 'On the ground' : `In the air now${typeof l.alt === 'number' ? ` · ${feet(l.alt)}` : ''}`
  const since = l.sinceMs === null ? null : `since ${clockText(l.sinceMs)}`
  return {
    key: `live:${l.hex}`, kind: 'live', label: l.callsign,
    sub: [where, since, l.typeCode, l.reg].filter(Boolean).join(' · '),
    iso2: countryOf(l.hex)?.iso2 ?? null, go: { to: 'live', hex: l.hex, lat: l.lat, lon: l.lon },
  }
}

/**
 * A flight of the past: its day, its times and its length; then where it went, under which callsign, on which aircraft.
 * ticket: the number it was looked up by ('W4 3257'; null: by its callsign), for its replay's title. route: the flight's
 * airports, whose cities name its ends.
 */
export function flownRow(f: PastFlight, env: FlightEnv, ticket: string | null = null, route: readonly FlightPlace[] | null = null): Item {
  const day = dayText(f.from.tMs)
  const nextDay = dayText(f.to.tMs) !== day
  return {
    key: `flown:${f.hex}:${f.from.tMs}`, kind: 'flown',
    label: `${day} · ${clockText(f.from.tMs)} – ${clockText(f.to.tMs)}${nextDay ? ' (+1)' : ''} · ${durationText(f.to.tMs - f.from.tMs)}`,
    sub: [`${endText(f.from, env, 'first', route)} → ${endText(f.to, env, 'last', route)}`, f.callsign, [f.typeCode, f.reg].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    iso2: countryOf(f.hex)?.iso2 ?? null,
    go: {
      to: 'past', hex: f.hex, callsign: f.callsign, fromMs: f.from.tMs, toMs: f.to.tMs,
      title: ticket === null ? f.callsign : `${ticket} · ${f.callsign}`, ends: [f.from.lat, f.from.lon, f.to.lat, f.to.lon],
    },
  }
}

/** A flight like the one typed: what to search instead, with its route when the airline's list has one. */
export function similarRow(s: SimilarFlight, env: FlightEnv): Item {
  const cities = s.route === null ? null : s.route.split('-').map((c) => env.cityOf(c) ?? c).join(' → ')
  return {
    key: `similar:${s.id}`, kind: 'similar', label: s.id,
    sub: [cities, s.flying ? 'in the air now' : null].filter(Boolean).join(' · '), iso2: null, go: { to: 'find', q: s.id },
  }
}

const more = (label: string, sub: string, days: number, deep: boolean): Item => ({ key: 'more', kind: 'more', label, sub, iso2: null, go: { to: 'more', days, deep } })

/** The next depth to ask for after `days`: the first of MORE_DAYS beyond it; null when there is none. */
export const nextDays = (days: number): number | null => MORE_DAYS.find((d) => d > days) ?? null

/** How many days back from now a moment is, in whole days. */
const daysBack = (tMs: number, nowMs: number): number => Math.max(1, Math.round((nowMs - tMs) / 86_400_000))

/**
 * What the box shows for the flight being looked up. null: nothing to show (no flight id typed; or one nobody knows, with
 * nothing like it, while other rows match: the list is not pushed down by a line that says nothing).
 */
export function flightView(look: FlightLookup | null, env: FlightEnv, otherRows: number): FlightView | null {
  if (look === null) return null
  const r = look.reply
  if (look.state === 'offer') {
    return { title: look.id, route: null, notes: [], busy: false, doing: null, rows: [{ key: 'find', kind: 'more', label: `Look up flight ${look.id}`, sub: 'Where it flies now and when it flew before', iso2: null, go: { to: 'find', q: look.id } }] }
  }
  if (r === null) {
    if (look.state === 'error') return { title: look.id, route: null, notes: ['The flight could not be looked up.'], busy: false, doing: null, rows: [more('Try again', 'Look it up once more', look.days, look.deep)] }
    return look.state === 'loading' ? { title: look.id, route: null, notes: ['Looking the flight up…'], busy: true, doing: null, rows: [] } : null
  }
  const title = [r.ticket ?? r.id, r.airline].filter(Boolean).join(' · ')
  const route = r.route === null ? null : `${placeText(r.route[0])} → ${placeText(r.route[1])}`
  const notes: string[] = []
  const rows: Item[] = []
  if (!r.known && r.past.length === 0) {
    if (r.similar.length === 0 && otherRows > 0 && r.scan.state === 'idle' && !look.past) return null
    notes.push(r.similar.length > 0 ? `No flight is known as ${r.id}. These are close to it:` : `No flight is known as ${r.id}.`)
    for (const s of r.similar) rows.push(similarRow(s, env))
  }
  if (r.byRoute) notes.push(`${r.airline ?? 'Its airline'} flies this route under other callsigns: these are its flights on the route.`)
  else if (r.ticket !== null && r.known && r.callsigns.length === 1) notes.push(`Callsign ${r.callsigns[0]}.`)
  const live = r.live ?? []
  for (const l of live) rows.push(liveRow(l))
  if (r.known && r.live !== null && live.length === 0) notes.push('Not in the air now.')
  for (const f of r.past) rows.push(flownRow(f, env, r.ticket, r.route))
  const scan = r.scan
  const back = scan.fromMs === null ? null : dayText(scan.fromMs)
  const searching = look.past && (scan.state === 'running' || (scan.state === 'idle' && look.state === 'loading'))
  let doing: string | null = null
  if (look.state === 'error') {
    // The server stopped answering after it had: what it found stays, and the search does not go on by itself.
    notes.push('The FlightHopper server did not answer.')
    rows.push(more('Try again', back === null ? 'Look the flight up once more' : `Searched back to ${back} so far`, look.days, look.deep))
  } else if (scan.state === 'failed') {
    notes.push('The past days could not be read from adsb.lol.')
    rows.push(more('Try again', back === null ? 'Search the past days once more' : `Searched back to ${back} so far`, look.days, look.deep))
  } else if (searching) {
    doing = back === null ? 'Searching the past days…' : `Searching the past days… back to ${back}`
    notes.push(doing)
  } else if (scan.state === 'done' && scan.fromMs !== null) {
    const days = daysBack(scan.fromMs, env.nowMs)
    const next = nextDays(days)
    if (r.past.length === 0) notes.push(`No flight heard in the last ${days} days.`)
    // (with nothing found the days are read at even steps, which only a row that says so asks for: deep)
    if (scan.more && next !== null) rows.push(more(r.past.length === 0 ? `Search the last ${next} days` : 'Search older days', `Searched back to ${back} · adsb.lol keeps about 42 days`, next, r.past.length === 0))
  } else if (!r.known && !look.past) {
    rows.push(more('Search the past days anyway', 'Reads the last 2 days for this callsign', 2, true))
  }
  const busy = look.state === 'loading' || (searching && look.state !== 'error')
  return { title, route, notes, busy, doing, rows }
}

/** The pick that stands for a looked-up flight among the past picks: its search, asked afresh when picked again. */
export function flightRecent(r: FlightSearchReply): Item {
  const route = r.route === null ? null : `${r.route[0].city ?? r.route[0].name} → ${r.route[1].city ?? r.route[1].name}`
  return { key: `find:${r.id}`, kind: 'flight', label: r.ticket ?? r.id, sub: [r.airline, route].filter(Boolean).join(' · '), iso2: null, go: { to: 'find', q: r.id } }
}
