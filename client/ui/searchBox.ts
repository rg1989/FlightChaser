// client/ui/searchBox.ts
// The search box: airports, cities, countries, the flights in view, recordings and scenarios in one list, best first,
// each row with its kind (search/search.ts ranks them). Wide screens: a glass bar at the top centre that drops its list
// open while it has the focus (/ or Cmd/Ctrl+K). Phones (rail.ts SHEET_MEDIA): the Search tab of the bottom bar opens it
// as a full-screen sheet, the field at the top, over the keyboard's reach. Picks are kept in this browser (RECENTS_KEY)
// and come back marked in later searches; an empty box lists them.
// The places file is fetched at the first focus (~2 MB), the scenarios once, the recordings at every opening (new ones
// come). A failed fetch says so in the list, with Retry; what did load still searches.
// A text that reads as a flight (a ticket number, W4 3257, or a callsign, WMT7403: shared/flightId.ts) is also looked up
// worldwide (opts.flightSearch: the server's flight search), above the other rows: where it flies now, each flight of the
// past days, or the flights one slip away when nothing is known under it (search/flights.ts). The server is asked only
// once the typing has paused (LOOKUP_AFTER_MS), and for the past days once the text has then stayed (PAST_AFTER_MS); it
// reads them only while the open box keeps asking. A text that is an aircraft type too (A320) is looked up only when asked.
import type { FlightSearchReply, RecordingInfo } from '../../shared/api.ts'
import { parseFlightId, typeLike } from '../../shared/flightId.ts'
import { distanceNm } from '../../shared/geo.ts'
import { flagEmoji } from '../../shared/icaoCountry.ts'
import type { AircraftInfo } from '../../shared/info.ts'
import type { Places } from '../../shared/places.ts'
import type { ScenarioCard } from '../scenario/types.ts'
import { FIRST_DAYS, LOOKUP_AFTER_MS, PAST_AFTER_MS, POLL_MS, flightRecent, flightView, type FlightEnv, type FlightLookup } from '../search/flights.ts'
import {
  addRecent, flightCandidates, highlight, placeCandidates, readRecents, recordingCandidates, scenarioCandidates, search,
  type Candidate, type Hit, type Item, type Kind, type Recent,
} from '../search/search.ts'
import { icon, type IconName } from './icons.ts'
import { SHEET_MEDIA } from './rail.ts'
import './searchBox.css'

export const RECENTS_KEY = 'fh.search.v1'

export interface SearchBoxOpts {
  placesUrl: string
  flights(): readonly { hex: string; info: AircraftInfo | null }[] // the flights in view now
  recordings(): Promise<RecordingInfo[]>
  scenarios(): Promise<ScenarioCard[]>
  /** A flight by its ticket number or callsign, worldwide (ApiClient.flights); absent: flights are searched in view only. */
  flightSearch?(q: string, o: { scan?: boolean; days?: number; deep?: boolean }): Promise<FlightSearchReply | null>
  store: Storage | null // localStorage; null where it is blocked (nothing is remembered)
  tools?: HTMLElement[] // more controls at the bar's end (the Live pill: ui/timePill.ts)
  onPick(item: Item): void
}

export interface SearchBoxHandle {
  open(): void // focus it; on phones, open the sheet
  close(): void
  destroy(): void
}

const KIND: Record<Kind, { label: string; icon: IconName }> = {
  airport: { label: 'Airport', icon: 'tower' },
  city: { label: 'City', icon: 'building' },
  country: { label: 'Country', icon: 'flag' },
  flight: { label: 'Flight', icon: 'plane' },
  recording: { label: 'Recording', icon: 'record' },
  scenario: { label: 'Scenario', icon: 'film' },
  live: { label: 'Live', icon: 'plane' },
  flown: { label: 'Flown', icon: 'history' },
  similar: { label: 'Similar', icon: 'search' },
  more: { label: '', icon: 'refresh' },
}
const EXAMPLES = ['TLV', 'London', 'Germany', 'LY315', 'JAL123']
const NEAR_NM = 10 // an aircraft heard low within this of an airport is leaving or reaching it
const SKELETON_ROWS = 3
const ENTER_MS = 420 // rows slide in this long after the list opens

type Load = 'idle' | 'loading' | 'ok' | 'error'
interface Source {
  what: string // for the error line: "airports and cities"
  state: Load
  cands: Candidate[]
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  e.className = className
  if (text !== '') e.textContent = text
  return e
}

/** The label with its matched parts in <mark>. */
function marked(label: string, typed: string): HTMLElement {
  const span = h('span', 'fh-search-label')
  let at = 0
  for (const [a, b] of highlight(label, typed)) {
    if (a > at) span.append(label.slice(at, a))
    span.append(h('mark', '', label.slice(a, b)))
    at = b
  }
  if (at < label.length) span.append(label.slice(at))
  return span
}

let uid = 0

export function mountSearchBox(root: HTMLElement, opts: SearchBoxOpts): SearchBoxHandle {
  const id = `fh-search-${++uid}`
  const phone = matchMedia(SHEET_MEDIA)
  const box = h('div', 'fh-search fh-glass fh-blur')
  box.setAttribute('role', 'search')

  const bar = h('div', 'fh-search-bar')
  const glyph = h('span', 'fh-search-glyph')
  glyph.append(icon('search', 17))
  const input = h('input', 'fh-search-input')
  input.type = 'text'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('autocorrect', 'off')
  input.setAttribute('enterkeyhint', 'search')
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-label', 'Search airports, cities, countries, flights in view, recordings and scenarios')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-expanded', 'false')
  input.setAttribute('aria-controls', `${id}-list`)
  const spin = h('span', 'fh-spin fh-search-spin')
  spin.hidden = true
  const clear = h('button', 'fh-ibtn fh-sm fh-search-clear')
  clear.type = 'button'
  clear.setAttribute('aria-label', 'Clear the search')
  clear.append(icon('x', 15))
  clear.hidden = true
  const key = h('kbd', 'fh-kbd fh-search-key', '/')
  key.setAttribute('aria-hidden', 'true')
  const cancel = h('button', 'fh-search-cancel', 'Cancel')
  cancel.type = 'button'
  const field = h('div', 'fh-search-field') // on phones a pill of its own, Cancel beside it
  field.append(glyph, input, spin, clear, key)
  bar.append(field, ...(opts.tools ?? []), cancel)

  // The list opens by growing its grid row from 0 to its height (searchBox.css), so it slides down rather than pops.
  const drop = h('div', 'fh-search-drop')
  const dropIn = h('div', 'fh-search-drop-in')
  const scroll = h('div', 'fh-search-scroll')
  const notice = h('div', 'fh-search-notice')
  notice.hidden = true
  const head = h('div', 'fh-search-head')
  const headText = h('span', '', 'Recent')
  const clearRecents = h('button', 'fh-search-link', 'Clear')
  clearRecents.type = 'button'
  head.append(headText, clearRecents)
  // A flight looked up worldwide: what it is and what the search is doing, over its rows (the first of the list).
  const flight = h('div', 'fh-search-flight')
  flight.hidden = true
  const flightTile = h('span', 'fh-search-tile')
  flightTile.dataset.kind = 'live'
  flightTile.append(icon('plane', 17))
  const flightTitle = h('div', 'fh-search-flight-title')
  const flightSpin = h('span', 'fh-spin')
  const flightRoute = h('div', 'fh-search-flight-route')
  const flightNotes = h('div', 'fh-search-flight-notes')
  flightNotes.setAttribute('aria-live', 'polite')
  const flightText = h('div', 'fh-search-flight-text')
  flightText.append(flightTitle, flightRoute, flightNotes)
  flight.append(flightTile, flightText, flightSpin)
  const list = h('ul', 'fh-search-list')
  list.id = `${id}-list`
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Results')
  const glow = h('div', 'fh-search-glow') // the active row's highlight: one element that glides from row to row
  glow.setAttribute('aria-hidden', 'true')
  const state = h('div', 'fh-search-state')
  scroll.append(notice, head, flight, glow, list, state)
  const foot = h('div', 'fh-search-foot')
  const keys = h('span', 'fh-search-keys')
  for (const [k, what] of [['↑↓', 'move'], ['↵', 'open'], ['esc', 'close']] as const) {
    const g = h('span')
    g.append(h('kbd', 'fh-kbd', k), ` ${what}`)
    keys.append(g)
  }
  foot.append(keys, h('span', 'fh-search-scope', opts.flightSearch === undefined ? 'Flights: those in view' : 'Flights: in view, or worldwide by number'))
  dropIn.append(scroll, foot)
  drop.append(dropIn)
  const live = h('span', 'fh-search-live') // "5 results", for screen readers
  live.setAttribute('aria-live', 'polite')
  box.append(bar, drop, live)
  root.append(box)

  const places: Source = { what: 'places', state: 'idle', cands: [] }
  const scenarios: Source = { what: 'scenarios', state: 'idle', cands: [] }
  const recordings: Source = { what: 'recordings', state: 'idle', cands: [] }
  let recents: Recent[] = []
  try {
    recents = readRecents(opts.store?.getItem(RECENTS_KEY) ?? null)
  } catch {
    // blocked: none
  }
  let hits: Hit[] = [] // the rows: a looked-up flight's first, then what matches here
  let active = -1
  let moved = false // the arrows or the pointer chose the active row: it stays that row when rows come in above it
  let isOpen = false
  // The flight being looked up worldwide (search/flights.ts), and the timer of its next ask.
  let look: FlightLookup | null = null
  let lookTimer: ReturnType<typeof setTimeout> | null = null
  let airports: Places['airports'] = []
  let cities = new Map<string, string>() // an airport's city by its ICAO code
  let frame: number | null = null
  let enterTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  const fetchInto = (src: Source, get: () => Promise<Candidate[]>): void => {
    if (src.state === 'loading') return
    src.state = 'loading'
    get().then(
      (c) => {
        src.cands = c
        src.state = 'ok'
      },
      (e: unknown) => {
        console.warn(`FlightHopper: search: no ${src.what}:`, e)
        src.state = 'error' // what loaded before stays searchable
      },
    ).finally(() => {
      if (!destroyed) schedule()
    })
  }
  /** Fetches what is missing; the recordings again at every opening (new ones, renamed or deleted ones). */
  const load = (): void => {
    if (places.state === 'idle' || places.state === 'error') {
      fetchInto(places, async () => {
        const r = await fetch(opts.placesUrl)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const p = (await r.json()) as Places
        airports = p.airports // a looked-up flight's rows name the airports it left and reached
        cities = new Map(p.airports.map((a) => [a[0], a[3] !== '' ? a[3] : a[2]]))
        return placeCandidates(p)
      })
    }
    if (scenarios.state === 'idle' || scenarios.state === 'error') fetchInto(scenarios, async () => scenarioCandidates(await opts.scenarios()))
    fetchInto(recordings, async () => recordingCandidates(await opts.recordings()))
  }

  const saveRecents = (): void => {
    try {
      opts.store?.setItem(RECENTS_KEY, JSON.stringify(recents))
    } catch {
      // full or blocked: they last this visit only
    }
  }

  const schedule = (): void => {
    if (frame === null) frame = requestAnimationFrame(render)
  }

  const flightEnv = (): FlightEnv => ({
    nowMs: Date.now(),
    cityOf: (icao) => cities.get(icao) ?? null,
    near: (lat, lon) => {
      let best: string | null = null
      let bestNm = NEAR_NM
      for (const a of airports) {
        if (Math.abs(a[5] - lat) > 0.25) continue
        const nm = distanceNm(lat, lon, a[5], a[6])
        if (nm < bestNm) [best, bestNm] = [a[0], nm]
      }
      return best
    },
  })

  const stopLook = (): void => {
    if (lookTimer !== null) clearTimeout(lookTimer)
    lookTimer = null
  }

  /** Asks the server about the flight in the box, then again while its past is being searched; an answer for a text since changed is dropped. */
  function askFlight(): void {
    const l = look
    if (l === null || opts.flightSearch === undefined || l.state === 'loading') return
    stopLook()
    l.state = 'loading'
    schedule()
    opts.flightSearch(l.id, l.past ? { scan: true, days: l.days, deep: l.deep } : {}).then(
      (r) => {
        if (look !== l || destroyed) return
        l.reply = r ?? l.reply
        l.state = r === null ? 'error' : 'ok'
        if (r === null || !isOpen) return
        // Its past days: asked for once the text has stayed a little longer; then again and again while they are read.
        if (!l.past && r.known) lookTimer = setTimeout(() => {
          l.past = true
          askFlight()
        }, PAST_AFTER_MS)
        else if (l.past && (r.scan.state === 'running' || r.scan.state === 'idle')) lookTimer = setTimeout(askFlight, POLL_MS)
      },
      (e: unknown) => {
        if (look !== l || destroyed) return
        console.warn('FlightHopper: search: the flight was not looked up:', e)
        l.state = 'error'
      },
    ).finally(() => {
      if (!destroyed) schedule()
    })
  }

  /**
   * The flight the text names, taken up when the text changes or the box opens: none (not a flight, or no server to ask), one
   * only offered (it reads as an aircraft type), or one looked up LOOKUP_AFTER_MS after the last key. The same flight again
   * (the box opened once more) goes on from what it had.
   */
  function syncFlight(asked = false): void {
    const id = opts.flightSearch === undefined || !isOpen ? null : parseFlightId(input.value)
    if (id === null) {
      stopLook()
      if (!isOpen && look !== null && look.state === 'loading') look.state = 'ok' // its answer will not be waited for
      if (isOpen || opts.flightSearch === undefined) look = null
      return
    }
    if (look === null || look.id !== id.id) {
      stopLook()
      look = { id: id.id, state: typeLike(id.id) && !asked ? 'offer' : 'wait', reply: null, past: false, days: FIRST_DAYS, deep: false }
    } else if (look.state === 'offer' && asked) look.state = 'wait'
    if (look.state === 'offer' || look.state === 'loading' || lookTimer !== null) return
    if (look.reply !== null) return void askFlight() // opened again: at once, from where it was
    lookTimer = setTimeout(askFlight, asked ? 0 : LOOKUP_AFTER_MS)
  }

  function row(hit: Hit, i: number): HTMLLIElement {
    const li = h('li', 'fh-search-row')
    li.id = `${id}-o${i}`
    li.setAttribute('role', 'option')
    li.setAttribute('aria-selected', String(i === active))
    li.dataset.kind = hit.kind
    li.style.setProperty('--i', String(Math.min(i, 10)))
    const tile = h('span', 'fh-search-tile')
    tile.append(icon(KIND[hit.kind].icon, 17))
    const flag = hit.iso2 === null ? '' : flagEmoji(hit.iso2)
    if (flag !== '') tile.append(h('span', 'fh-search-flag', flag))
    const text = h('span', 'fh-search-text')
    text.append(marked(hit.label, input.value))
    if (hit.sub !== '') text.append(h('span', 'fh-search-sub', hit.sub))
    const meta = h('span', 'fh-search-meta')
    if (hit.recent) {
      const r = h('span', 'fh-search-recent')
      r.title = 'Searched before'
      r.setAttribute('aria-label', 'searched before')
      r.append(icon('clock', 13))
      meta.append(r)
    }
    if (KIND[hit.kind].label !== '') meta.append(h('span', 'fh-search-kind', KIND[hit.kind].label))
    li.append(tile, text, meta)
    li.addEventListener('pointermove', () => {
      if (active === i) return
      moved = true
      setActive(i, false)
    })
    li.addEventListener('pointerdown', (e) => e.preventDefault()) // the field keeps the focus
    li.addEventListener('click', () => pick(hit))
    return li
  }

  /** The glow under row i (none: -1), which scrolls into view when the keys moved it. */
  function setActive(i: number, reveal: boolean): void {
    active = i
    const rows = list.children
    for (let k = 0; k < rows.length; k++) rows[k]!.setAttribute('aria-selected', String(k === i))
    const el = i >= 0 ? (rows[i] as HTMLElement | undefined) : undefined
    if (el === undefined) {
      glow.classList.remove('fh-on')
      input.removeAttribute('aria-activedescendant')
      return
    }
    input.setAttribute('aria-activedescendant', el.id)
    glow.dataset.kind = el.dataset.kind // tinted as its row's kind
    glow.style.transform = `translateY(${list.offsetTop + el.offsetTop}px)` // the rows sit in the list, the glow beside it
    glow.style.height = `${el.offsetHeight}px`
    glow.classList.add('fh-on')
    if (reveal) el.scrollIntoView({ block: 'nearest' })
  }

  function skeleton(): HTMLElement {
    const wrap = h('div', 'fh-search-skel')
    for (let k = 0; k < SKELETON_ROWS; k++) {
      const r = h('div', 'fh-search-skel-row')
      r.append(h('span', 'fh-skel fh-search-skel-tile'), h('span', 'fh-search-skel-lines'))
      r.lastElementChild!.append(h('span', 'fh-skel'), h('span', 'fh-skel'))
      wrap.append(r)
    }
    return wrap
  }

  function render(): void {
    frame = null
    const typed = input.value
    const q = typed.trim()
    clear.hidden = typed === ''
    key.hidden = typed !== '' || isOpen
    const loading = [places, scenarios, recordings].filter((s) => s.state === 'loading')
    const failed = [places, scenarios, recordings].filter((s) => s.state === 'error')
    spin.hidden = !isOpen || loading.length === 0
    const was = active >= 0 ? hits[active]?.key : undefined
    const here = search(typed, [places.cands, flightCandidates(opts.flights()), recordings.cands, scenarios.cands], recents)
    // The flight looked up worldwide, over the rows that match here; one it finds in the air is not listed twice.
    const view = flightView(look, flightEnv(), here.length)
    const found = new Set((view?.rows ?? []).flatMap((r) => (r.go.to === 'live' ? [r.go.hex] : [])))
    const rest = here.filter((r) => !(r.go.to === 'flight' && found.has(r.go.hex)) && !(view !== null && look !== null && r.key === `find:${look.id}`)) // nor its own past pick under it
    const own: Hit[] = (view?.rows ?? []).map((r) => ({ ...r, score: 0, recent: false }))
    hits = look?.state === 'offer' ? [...rest, ...own] : [...own, ...rest]
    flight.hidden = view === null || look?.state === 'offer' || !isOpen
    if (!flight.hidden && view !== null) {
      flightTitle.textContent = view.title
      flightRoute.textContent = view.route ?? ''
      flightRoute.hidden = view.route === null
      flightNotes.replaceChildren(...view.notes.map((n) => h('div', 'fh-search-flight-note', n)))
      flightSpin.hidden = !view.busy
    }

    // Network trouble: what failed, with Retry. Offline says so.
    notice.hidden = failed.length === 0 || !isOpen
    if (!notice.hidden) {
      const offline = !navigator.onLine
      const what = failed.map((s) => s.what).join(', ').replace(/, ([^,]*)$/, ' and $1')
      const retry = h('button', 'fh-search-link', 'Retry')
      retry.type = 'button'
      retry.addEventListener('pointerdown', (e) => e.preventDefault())
      retry.addEventListener('click', () => {
        load()
        schedule()
      })
      const msg = h('span', 'fh-search-notice-t')
      msg.append(h('b', '', offline ? 'You are offline. ' : `Could not load ${what}. `), offline ? `No ${what} until the connection is back.` : 'The FlightHopper server did not answer.')
      notice.replaceChildren(icon('alert', 16), msg, retry)
    }

    head.hidden = !(q === '' && hits.length > 0)
    // Typing puts the best row under Enter; an empty box's past picks wait for the arrows. A row chosen by hand stays the
    // active one when a looked-up flight's rows come in above it.
    const kept = moved && was !== undefined ? hits.findIndex((r) => r.key === was) : -1
    active = kept >= 0 ? kept : Math.min(active, hits.length - 1)
    if (kept < 0 && q !== '' && hits.length > 0 && (active < 0 || !moved)) active = 0
    list.replaceChildren(...hits.map(row))
    setActive(active, false)

    // What shows when there are no rows: loading places (a skeleton), no match, or the hint with examples.
    state.replaceChildren()
    state.className = 'fh-search-state'
    if (!flight.hidden) {
      // The looked-up flight's heading says what there is to say; under its flights, how far the search has got, again.
      if (view !== null && view.doing !== null && own.length > 0) {
        const line = h('div', 'fh-search-state-line')
        line.append(h('span', 'fh-spin'), view.doing)
        state.append(line)
      }
    } else if (hits.length === 0 && q !== '' && places.state === 'loading') {
      state.append(skeleton(), h('div', 'fh-search-state-line', 'Loading airports, cities and countries…'))
    } else if (hits.length === 0 && q !== '' && look !== null && (look.state === 'wait' || look.state === 'loading')) {
      const line = h('div', 'fh-search-state-line')
      line.append(h('span', 'fh-spin'), `Looking up flight ${look.id}…`)
      state.append(line)
    } else if (hits.length === 0 && q !== '') {
      state.classList.add('fh-search-empty')
      const art = h('span', 'fh-search-empty-art')
      art.append(icon('search', 22))
      state.append(art, h('div', 'fh-search-empty-t', `No matches for “${q}”`), h('div', 'fh-search-empty-s', places.state === 'error'
        ? 'Airports, cities and countries did not load: Retry above to search them too.'
        : opts.flightSearch === undefined
          ? 'Try an airport code, a city or country, a callsign in view, or a recording’s name. Flights are searched in the current view only.'
          : 'Try an airport code, a city or country, a recording’s name, or a flight by its number (LY315) or callsign.'))
    } else if (hits.length === 0) {
      state.classList.add('fh-search-hint')
      state.append(h('div', 'fh-search-hint-t', opts.flightSearch === undefined
        ? 'Airports, cities, countries, the flights in view, recordings and scenarios.'
        : 'Airports, cities, countries, recordings and scenarios; a flight by its number or callsign, now and in the past days.'))
      const chips = h('div', 'fh-search-chips')
      for (const ex of EXAMPLES) {
        const c = h('button', 'fh-search-chip', ex)
        c.type = 'button'
        c.addEventListener('pointerdown', (e) => e.preventDefault())
        c.addEventListener('click', () => {
          input.value = ex
          active = 0
          syncFlight()
          schedule()
        })
        chips.append(c)
      }
      state.append(chips)
    } else if (q !== '' && places.state === 'loading') {
      const more = h('div', 'fh-search-state-line')
      more.append(h('span', 'fh-spin'), 'Loading airports, cities and countries…')
      state.append(more)
    }
    live.textContent = !isOpen ? '' : q === '' ? '' : hits.length === 0 ? 'No results' : `${hits.length} result${hits.length === 1 ? '' : 's'}`
  }

  function pick(hit: Hit): void {
    const go = hit.go
    // Another search (a flight like the one typed, a past pick of a flight, the offer to look one up): the box stays.
    if (go.to === 'find') {
      input.value = go.q
      active = 0
      moved = false
      syncFlight(true)
      return schedule()
    }
    // More of the flight's past, or the same ask again: the box stays, and the search goes on.
    if (go.to === 'more') {
      if (look === null) return
      stopLook()
      look.past = true
      look.days = Math.max(look.days, go.days)
      look.deep ||= go.deep
      if (look.state !== 'loading') look.state = 'ok'
      moved = false
      return askFlight()
    }
    // A looked-up flight is kept as its search (asked afresh when picked again): where it flew then is not where it flies later.
    const kept = (go.to === 'live' || go.to === 'past') && look?.reply != null ? flightRecent(look.reply) : go.to === 'live' || go.to === 'past' ? null : hit
    if (kept !== null) {
      recents = addRecent(recents, kept, Date.now())
      saveRecents()
    }
    input.value = ''
    close()
    opts.onPick(hit)
  }

  function setOpen(on: boolean): void {
    if (on === isOpen) return
    isOpen = on
    box.classList.toggle('fh-open', on)
    input.setAttribute('aria-expanded', String(on))
    if (on) {
      active = input.value.trim() === '' ? -1 : 0
      moved = false
      load()
      box.classList.add('fh-enter')
      if (enterTimer !== null) clearTimeout(enterTimer)
      enterTimer = setTimeout(() => box.classList.remove('fh-enter'), ENTER_MS)
      scroll.scrollTop = 0
    }
    syncFlight() // the flight in the box: looked up while open; closed, its search of the past is no longer asked for
    render()
  }

  function open(): void {
    setOpen(true)
    input.focus()
  }

  function close(): void {
    setOpen(false)
    if (document.activeElement === input) input.blur()
  }

  input.addEventListener('focus', () => setOpen(true))
  // Wide screens close with the focus; the phone sheet stays until Cancel or a pick (the keyboard's Done blurs it).
  input.addEventListener('blur', () => {
    if (!phone.matches) setOpen(false)
  })
  input.addEventListener('input', () => {
    active = input.value.trim() === '' ? -1 : 0
    moved = false
    scroll.scrollTop = 0
    syncFlight()
    schedule()
  })
  input.addEventListener('keydown', (e) => {
    // The app's own keys (Esc steps back, T L X M R P W toggle the scene) stay out of the field.
    e.stopPropagation()
    if (e.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (hits.length === 0) return
      const n = hits.length
      moved = true
      setActive(active < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n, true)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = active >= 0 ? hits[active] : input.value.trim() !== '' ? hits[0] : undefined
      if (hit !== undefined) pick(hit)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (input.value !== '') {
        input.value = ''
        syncFlight()
        schedule()
      } else close()
    }
  })
  clear.addEventListener('pointerdown', (e) => e.preventDefault())
  clear.addEventListener('click', () => {
    input.value = ''
    input.focus()
    syncFlight()
    schedule()
  })
  cancel.addEventListener('click', () => {
    input.value = ''
    close()
  })
  clearRecents.addEventListener('pointerdown', (e) => e.preventDefault())
  clearRecents.addEventListener('click', () => {
    recents = []
    saveRecents()
    schedule()
  })

  // "/" or Cmd/Ctrl+K from anywhere but a field: to the box.
  const onKey = (e: KeyboardEvent): void => {
    const t = e.target as HTMLElement | null
    const typing = t !== null && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')
    const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey
    const cmdK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey
    if ((!slash && !cmdK) || (typing && !cmdK) || (box.offsetParent === null && !phone.matches)) return // hidden: a scenario plays
    e.preventDefault()
    open()
  }
  window.addEventListener('keydown', onKey)
  const onMedia = (): void => {
    input.placeholder = phone.matches ? 'Search' : opts.flightSearch === undefined ? 'Search airports, cities, flights, recordings' : 'Search places, flight numbers, recordings' // a phone's field is short
    if (isOpen && !phone.matches && document.activeElement !== input) setOpen(false)
  }
  onMedia()
  phone.addEventListener('change', onMedia)
  render()

  return {
    open,
    close,
    destroy() {
      destroyed = true
      stopLook()
      if (frame !== null) cancelAnimationFrame(frame)
      if (enterTimer !== null) clearTimeout(enterTimer)
      window.removeEventListener('keydown', onKey)
      phone.removeEventListener('change', onMedia)
      box.remove()
    },
  }
}
