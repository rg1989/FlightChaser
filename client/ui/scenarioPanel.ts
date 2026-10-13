// client/ui/scenarioPanel.ts
// The Scenarios panel (rail), in two sections. Scenarios: the packaged reconstructions (public/scenarios). Recordings:
// the flights recorded with the flight card's Record button (server/flightLog.ts), newest first, each replayed like a
// scenario (fromRecording.ts). Every item is one compact row: Play, its title and one line (date and span, or route,
// start and length), and a chevron that opens its details (a package's subtitle, aircraft, summary, crew and note; a
// recording's aircraft, route, times, points and how it ended). A recording still under way is marked and plays what
// is recorded so far; one too short to play says so. A recording's details also hold Rename (a name of its own, in
// place: Enter saves, Esc cancels, blank clears) and Delete (asked twice: it is for good). The scenarios load once, at
// mount; the recordings at mount and again on refresh('recordings') (the app asks when the panel opens). An older
// answer that arrives late is dropped; open details stay open across reloads. setPlaying(id) marks the running item.
// A scenario that plays sound carries a small speaker by its title.
// Import a file (the Recordings heading) takes a flight file found elsewhere (shared/flightFile.ts: KML, GPX, a
// Flightradar24 CSV, an ADS-B trace, an OpenSky track, a recording downloaded here): it is read in the browser first, so
// the form shows what it holds and what it says of the aircraft, and whoever imports says the rest (flight, airline,
// registration, type: they pick the model and the livery). A recording's details hold Download (its own file) and KML.
// Text only.
import { AIRLINE_NAMES, icaoOfIata, operatorOf } from '../../shared/airlines.ts'
import type { RecordingInfo } from '../../shared/api.ts'
import { FIELD, FILE_MAX_BYTES, FlightFileError, NO_HEX, parseFlightFile, type FileFlight, type FlightFile } from '../../shared/flightFile.ts'
import { sToClock } from '../scenario/format.ts'
import { recordingId } from '../scenario/fromRecording.ts'
import type { ScenarioCard } from '../scenario/types.ts'
import { icon } from './icons.ts'
import './scenarioPanel.css'

export interface ScenarioPanelOpts {
  list(): Promise<ScenarioCard[]>
  /** The recorded flights, newest first; null: this server records nothing. Absent: no Recordings section. */
  recordings?(): Promise<RecordingInfo[] | null>
  onPlay(id: string): void
  /** Names a recording (blank clears); resolves to the list after. Absent: no Rename. */
  onRename?(file: string, name: string): Promise<RecordingInfo[]>
  /** Deletes a recording for good; resolves to the list after. Absent: no Delete. */
  onDelete?(file: string): Promise<RecordingInfo[]>
  /**
   * Keeps a flight file's text as a recording: which of its flights, and what to say of it (blank: nothing). Resolves to
   * its file and the list after; rejects with words for why not. Absent: no Import.
   */
  onImport?(text: string, o: ImportFields): Promise<{ file: string; recordings: RecordingInfo[] }>
  /** Where a recording downloads from: its own file, or KML. Absent: no Download. */
  downloadUrl?(file: string, as?: 'kml'): string
  /** The model the app has of an aircraft type, by name; null: none of its own. Absent: the form does not say. */
  modelOf?(typeCode: string): string | null
  /** Whether the app has an airline's livery. Absent: the form does not say. */
  hasLivery?(operator: string): boolean
}

export interface ImportFields {
  flight: number
  name: string
  callsign: string
  reg: string
  type: string
  airline: string
}

export interface ScenarioPanelHandle {
  /** Loads both sections again, or only the recordings. */
  refresh(what?: 'recordings'): void
  setPlaying(id: string | null): void
  destroy(): void
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MIN_PLAY_S = 2 // a recording shorter than this has nothing to play
const NAME_MAX = 60 // server/flightLog.ts NAME_MAX

/** '1985-08-12' → '12 August 1985' (read as written: no time zone moves the day). */
function dateText(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1] ?? ''} ${y}`
}

/** Scenario seconds → 'HH:MM', floored as the play bar's clock is (hours past 23 kept). */
const hm = (t: number): string => sToClock(Math.floor(t)).slice(0, -3)

/** UTC ms → '30 Sep 2026 · 00:29 UTC'. */
function utcText(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

/** 45 → '45 s', 400 → '6 min', 4400 → '1 h 13 min'. */
export function lengthText(s: number): string {
  if (s < 60) return `${Math.max(0, Math.round(s))} s`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

const ENDED: Record<NonNullable<RecordingInfo['ended']>['why'], string> = {
  landed: 'Landed (stopped by itself)',
  stopped: 'Stopped by hand',
  lost: 'Signal lost for 15 min',
  imported: '', // its Source row says it came from a file
}

const SOUND: Record<NonNullable<ScenarioCard['sound']>, string> = { recording: 'Plays the recorded sound', 'voice-over': 'Plays a voice-over' }

/** An airline as typed (its 3-letter code, its 2-character ticket code, or its name in full) → its ICAO designator; null: none such. */
export function airlineCode(typed: string): string | null {
  const s = typed.trim().toUpperCase()
  if (FIELD.operator.test(s)) return s
  if (s.length === 2) return icaoOfIata(s)
  return Object.keys(AIRLINE_NAMES).find((code) => AIRLINE_NAMES[code].toUpperCase() === s) ?? null
}

/** The flight of a file to offer first: the one longest in the air. */
function mainFlight(flights: readonly FileFlight[]): number {
  const air = flights.map((f) => f.samples.filter((x) => !x.onGround).length)
  return air.indexOf(Math.max(...air))
}

/** A recording's played seconds: its first to last sample. */
const spanS = (r: RecordingInfo): number => (r.firstMs === null || r.lastMs === null ? 0 : (r.lastMs - r.firstMs) / 1000)

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (className !== '') el.className = className
  if (text !== '') el.textContent = text
  return el
}

export function mountScenarioPanel(body: HTMLElement, opts: ScenarioPanelOpts): ScenarioPanelHandle {
  const root = h('div', 'fh-scn')
  const scnList = h('div', 'fh-scn-list')
  const recList = h('div', 'fh-scn-list')
  const recHead = h('h3', 'fh-scn-section', 'Recordings')
  const importBox = h('div', 'fh-scn-import')
  importBox.hidden = true
  const importBtn = h('button', 'fh-scn-act', 'Import a file')
  importBtn.type = 'button'
  importBtn.title = 'A flight file: KML, GPX, Flightradar24 CSV, ADS-B trace, or a recording downloaded here'
  importBtn.hidden = true // shown once the server says it keeps recordings
  root.append(h('h3', 'fh-scn-section', 'Scenarios'), scnList)
  if (opts.recordings) {
    if (opts.onImport) recHead.append(importBtn, filePicker())
    root.append(recHead, importBox, recList)
  }
  body.append(root)
  const buttons = new Map<string, HTMLButtonElement>()
  const expanded = new Set<string>() // ids whose details are open: kept across reloads
  let playing: string | null = null
  const generation = { scn: 0, rec: 0 } // a newer load (or destroy) makes older answers stale

  function skeleton(): HTMLElement {
    const s = h('div', 'fh-scn-skel')
    s.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < 3; i++) s.append(h('span', 'fh-skel')) // widths in the CSS
    return s
  }

  /** Label: value rows for an item's details. */
  function facts(rows: [string, string][]): HTMLElement {
    const dl = h('dl', 'fh-scn-facts')
    for (const [k, v] of rows) if (v !== '') dl.append(h('dt', '', k), h('dd', '', v))
    return dl
  }

  /**
   * One compact row: Play, title (+ a mark), one line, and a chevron that shows the details. playable false: Play is
   * disabled and why says so in the line's place.
   */
  function item(id: string, title: string, line: string, details: HTMLElement[], o: { mark?: string; sound?: string; playable?: boolean; why?: string } = {}): HTMLElement {
    const art = h('article', 'fh-scn-item')
    art.setAttribute('aria-label', title)
    const row = h('div', 'fh-scn-row')
    const play = h('button', 'fh-scn-play')
    play.type = 'button'
    play.append(icon('play', 14))
    play.setAttribute('aria-label', `Play ${title}`)
    play.title = o.playable === false ? (o.why ?? 'Nothing to play') : 'Play'
    play.addEventListener('click', () => opts.onPlay(id))
    if (o.playable === false) play.dataset.off = '1'
    const text = h('div', 'fh-scn-text')
    const top = h('div', 'fh-scn-top')
    top.append(h('span', 'fh-scn-title', title))
    if (o.mark) top.append(h('span', 'fh-scn-mark', o.mark))
    if (o.sound) {
      const sound = h('span', 'fh-scn-sound')
      sound.append(icon('volume', 15))
      sound.title = o.sound
      sound.setAttribute('role', 'img')
      sound.setAttribute('aria-label', o.sound)
      top.append(sound)
    }
    text.append(top, h('div', 'fh-scn-line fh-num', o.playable === false && o.why ? o.why : line))
    const more = h('button', 'fh-ibtn fh-sm fh-scn-more')
    more.type = 'button'
    more.append(icon('chevronDown', 16))
    more.setAttribute('aria-expanded', 'false')
    more.setAttribute('aria-label', `Details of ${title}`)
    more.title = 'Details'
    const box = h('div', 'fh-scn-details')
    box.append(...details)
    const show = (open: boolean): void => {
      box.hidden = !open
      if (open) expanded.add(id)
      else expanded.delete(id)
      more.setAttribute('aria-expanded', String(open))
      more.replaceChildren(icon(open ? 'chevronUp' : 'chevronDown', 16))
    }
    show(expanded.has(id))
    more.addEventListener('click', () => show(box.hidden !== false))
    row.append(play, text, more)
    art.append(row, box)
    buttons.set(id, play)
    return art
  }

  function scenarioItem(c: ScenarioCard): HTMLElement {
    const details: HTMLElement[] = []
    if (c.subtitle) details.push(h('p', 'fh-scn-sub', c.subtitle))
    details.push(facts([['Aircraft', [c.aircraft.registration, c.aircraft.type].filter(Boolean).join(' · ')], ['Flight', c.aircraft.callsign]]))
    for (const p of c.summary) details.push(h('p', 'fh-scn-p', p))
    if (c.crew.length > 0) {
      const list = h('ul', 'fh-scn-crew-list')
      for (const m of c.crew) {
        const li = h('li')
        li.append(h('span', 'fh-scn-crew-role', m.role), h('span', 'fh-scn-crew-name', m.name))
        if (m.detail) li.append(h('span', 'fh-scn-crew-detail', m.detail))
        list.append(li)
      }
      details.push(h('h4', 'fh-scn-h', 'Crew'), list)
    }
    if (c.note) details.push(h('p', 'fh-scn-note', c.note))
    return item(c.id, c.title, `${dateText(c.date)} · ${hm(c.start)}–${hm(c.end)} ${c.clockLabel}`, details, { sound: c.sound === null ? undefined : SOUND[c.sound] })
  }

  /** The hidden file input behind Import a file: a picked file is read and its form shown, or why it cannot be read. */
  function filePicker(): HTMLElement {
    const picker = h('input')
    picker.type = 'file'
    picker.accept = '.kml,.gpx,.csv,.json,.jsonl,.txt,.xml'
    picker.hidden = true
    picker.setAttribute('aria-hidden', 'true')
    importBtn.addEventListener('click', () => picker.click())
    picker.addEventListener('change', () => {
      const f = picker.files?.[0]
      picker.value = '' // the same file picked again is a change again
      if (!f) return
      if (f.size > FILE_MAX_BYTES) return importFailed(f.name, `The file is over ${FILE_MAX_BYTES / 1024 / 1024} MB.`)
      f.text().then(
        (text) => {
          try {
            importForm(f.name, text, parseFlightFile(text))
          } catch (e) {
            if (!(e instanceof FlightFileError)) console.warn('[recordings] import: not read', e)
            importFailed(f.name, e instanceof FlightFileError ? e.message : 'The file could not be read.')
          }
        },
        () => importFailed(f.name, 'The file could not be read.'),
      )
    })
    return picker
  }

  function closeImport(): void {
    importBox.hidden = true
    importBox.replaceChildren()
  }

  function importFailed(fileName: string, why: string): void {
    const msg = h('p', 'fh-scn-actmsg', why)
    msg.setAttribute('role', 'alert')
    const close = h('button', 'fh-scn-act', 'Close')
    close.type = 'button'
    close.addEventListener('click', closeImport)
    const bar = h('div', 'fh-scn-actions')
    bar.append(close)
    importBox.replaceChildren(h('p', 'fh-scn-import-file', fileName), msg, bar)
    importBox.hidden = false
  }

  /** What the file holds and what it says of the aircraft, each field open to change; Import keeps it as a recording. */
  function importForm(fileName: string, text: string, parsed: FlightFile): void {
    let chosen = mainFlight(parsed.flights)
    const fileBase = fileName.replace(/\.[^.]+$/, '')
    const span = (f: FileFlight): string => `${utcText(f.samples[0].tMs)} · ${lengthText((f.samples[f.samples.length - 1].tMs - f.samples[0].tMs) / 1000)}`
    const what = h('p', 'fh-scn-line fh-num')
    const fields = h('div', 'fh-scn-fields')
    const input = (label: string, placeholder: string, max: number, hint?: (v: string) => string): { el: HTMLInputElement; hint(): void } => {
      const el = h('input', 'fh-scn-input')
      el.type = 'text'
      el.placeholder = placeholder
      el.maxLength = max
      el.autocomplete = 'off'
      el.spellcheck = false
      const tag = h('label', 'fh-scn-field')
      tag.append(h('span', '', label), el)
      const note = h('span', 'fh-scn-hint')
      const say = (): void => {
        note.textContent = hint?.(el.value.trim()) ?? ''
        note.hidden = note.textContent === ''
      }
      if (hint) {
        tag.append(note)
        el.addEventListener('input', say)
      }
      fields.append(tag)
      return { el, hint: say }
    }
    const name = input('Name', '', NAME_MAX)
    const callsign = input('Flight', 'Callsign, e.g. ELY315', 8)
    const airline = input('Airline', '3-letter code, e.g. ELY', 60, (v) => {
      const code = v === '' ? operatorOf(callsign.el.value.trim().toUpperCase()) : airlineCode(v)
      if (code === null) return v === '' ? '' : 'Not an airline this app knows: use its 3-letter code.'
      const livery = opts.hasLivery ? (opts.hasLivery(code) ? '' : ' · no livery of it yet: plain white') : ''
      return `${AIRLINE_NAMES[code] ?? code}${v === '' ? ' (from the flight)' : ''}${livery}`
    })
    const reg = input('Registration', 'e.g. 4X-EHA', 10)
    const type = input('Type', 'ICAO code, e.g. B738', 4, (v) => {
      const code = v.toUpperCase()
      if (!opts.modelOf || !FIELD.typeCode.test(code)) return ''
      const model = opts.modelOf(code)
      return model === null ? 'No model of this type yet: a stand-in is drawn.' : `Model: ${model}`
    })
    callsign.el.addEventListener('input', airline.hint)
    const list = h('datalist')
    list.id = 'fh-scn-airlines'
    for (const code of Object.keys(AIRLINE_NAMES)) {
      const opt = h('option')
      opt.value = code
      opt.label = AIRLINE_NAMES[code]
      list.append(opt)
    }
    airline.el.setAttribute('list', list.id)

    const fill = (): void => {
      const f = parsed.flights[chosen]
      const m = f.meta
      what.textContent = `${parsed.format} · ${span(f)} · ${f.samples.length.toLocaleString('en-US')} points`
      name.el.value = m.name ?? ''
      name.el.placeholder = m.callsign ?? fileBase
      callsign.el.value = m.callsign ?? ''
      airline.el.value = m.operator ?? ''
      reg.el.value = m.reg ?? ''
      type.el.value = m.typeCode ?? ''
      airline.hint()
      type.hint()
    }

    const head: HTMLElement[] = [h('p', 'fh-scn-import-file', fileName)]
    if (parsed.flights.length > 1) {
      const pick = h('select', 'fh-scn-input')
      pick.setAttribute('aria-label', 'Which flight of the file')
      parsed.flights.forEach((f, i) => {
        const opt = h('option', '', [f.meta.callsign, span(f)].filter(Boolean).join(' · '))
        opt.value = String(i)
        pick.append(opt)
      })
      pick.value = String(chosen)
      pick.addEventListener('change', () => {
        chosen = Number(pick.value)
        fill()
      })
      head.push(h('p', 'fh-scn-hint', `The file holds ${parsed.flights.length} flights. Import one at a time:`), pick)
    }

    const msg = h('p', 'fh-scn-actmsg')
    msg.hidden = true
    msg.setAttribute('role', 'alert')
    const fail = (why: string): void => {
      msg.textContent = why
      msg.hidden = false
    }
    const go = h('button', 'fh-scn-act fh-scn-primary', 'Import')
    go.type = 'button'
    const cancel = h('button', 'fh-scn-act', 'Cancel')
    cancel.type = 'button'
    cancel.addEventListener('click', closeImport)
    go.addEventListener('click', () => {
      const v = { callsign: callsign.el.value.trim().toUpperCase(), reg: reg.el.value.trim().toUpperCase(), type: type.el.value.trim().toUpperCase() }
      const typed = airline.el.value.trim()
      const op = typed === '' ? '' : airlineCode(typed)
      if (v.callsign !== '' && !FIELD.callsign.test(v.callsign)) return fail('Flight: a callsign of letters and digits, such as ELY315.')
      if (op === null) return fail('Airline: its 3-letter code, such as ELY.')
      if (v.reg !== '' && !FIELD.reg.test(v.reg)) return fail('Registration: letters, digits and a dash, such as 4X-EHA.')
      if (v.type !== '' && !FIELD.typeCode.test(v.type)) return fail('Type: the ICAO code, such as B738 or A320.')
      // With neither a name nor a callsign the list would show nothing to tell it by: the file's own name then.
      const named = name.el.value.trim() || (v.callsign === '' ? fileBase : '')
      go.disabled = cancel.disabled = true
      msg.hidden = true
      opts.onImport!(text, { flight: chosen, name: named, ...v, airline: op }).then(
        ({ file, recordings }) => {
          closeImport()
          const id = recordingId(file)
          expanded.add(id) // the new one opens, so what was kept can be seen
          generation.rec++
          recList.replaceChildren(...showRecordings(recordings))
          paintPlaying()
          buttons.get(id)?.scrollIntoView?.({ block: 'nearest' })
        },
        (e: unknown) => {
          go.disabled = cancel.disabled = false
          fail(e instanceof Error && e.message !== '' && !e.message.startsWith('HTTP') ? e.message : 'Could not import it. Try again.')
        },
      )
    })
    const bar = h('div', 'fh-scn-actions')
    bar.append(go, cancel)
    importBox.replaceChildren(...head, what, fields, list, bar, msg)
    importBox.hidden = false
    fill()
    name.el.focus()
  }

  /** Rename and Delete for one recording, in its details. */
  function recordingActions(r: RecordingInfo, flight: string): HTMLElement {
    const bar = h('div', 'fh-scn-actions')
    const msg = h('p', 'fh-scn-actmsg')
    msg.hidden = true
    msg.setAttribute('role', 'alert')
    const small = (label: string, cls = ''): HTMLButtonElement => {
      const b = h('button', `fh-scn-act ${cls}`.trim(), label)
      b.type = 'button'
      return b
    }
    const busy = (on: boolean): void => {
      for (const b of bar.querySelectorAll('button')) b.disabled = on
    }
    const fail = (what: string, e: unknown): void => {
      console.warn(`[recordings] ${what} failed`, e)
      busy(false)
      msg.textContent = `Could not ${what} it. Try again.`
      msg.hidden = false
    }
    const done = (recs: RecordingInfo[]): void => {
      generation.rec++ // an answer to an older ask must not undo this
      recList.replaceChildren(...showRecordings(recs))
      paintPlaying()
    }

    const idle = (): void => {
      const items: HTMLElement[] = []
      if (opts.onRename) {
        const rename = small('Rename')
        rename.addEventListener('click', editing)
        items.push(rename)
      }
      if (opts.onDelete) {
        const del = small('Delete', 'fh-scn-danger')
        del.addEventListener('click', confirming)
        items.push(del)
      }
      bar.replaceChildren(...items)
    }

    const editing = (): void => {
      const input = h('input', 'fh-scn-input')
      input.type = 'text'
      input.value = r.name ?? ''
      input.placeholder = flight
      input.maxLength = NAME_MAX
      input.setAttribute('aria-label', `Name of the recording of ${flight}`)
      const save = small('Save', 'fh-scn-primary')
      const cancel = small('Cancel')
      const commit = (): void => {
        busy(true)
        input.disabled = true
        opts.onRename!(r.file, input.value).then(done, (e: unknown) => {
          input.disabled = false
          fail('rename', e)
        })
      }
      save.addEventListener('click', commit)
      cancel.addEventListener('click', idle)
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== 'Escape') return
        e.preventDefault()
        e.stopPropagation() // Esc here cancels the edit, not the panel (the app's Esc closes it)
        if (e.key === 'Enter') commit()
        else idle()
      })
      bar.replaceChildren(input, save, cancel)
      input.focus()
    }

    const confirming = (): void => {
      const q = h('span', 'fh-scn-ask', 'Delete for good?')
      const yes = small('Delete', 'fh-scn-danger fh-scn-primary')
      const no = small('Cancel')
      yes.addEventListener('click', () => {
        busy(true)
        opts.onDelete!(r.file).then(done, (e: unknown) => fail('delete', e))
      })
      no.addEventListener('click', idle)
      bar.replaceChildren(q, yes, no)
      no.focus()
    }

    idle()
    const wrap = h('div', 'fh-scn-edit')
    wrap.append(bar, msg)
    if (opts.downloadUrl) {
      const link = (label: string, as: 'kml' | undefined, title: string): HTMLAnchorElement => {
        const a = h('a', 'fh-scn-act', label)
        a.href = opts.downloadUrl!(r.file, as)
        a.download = ''
        a.title = title
        return a
      }
      const links = h('div', 'fh-scn-actions fh-scn-links')
      links.append(link('Download', undefined, 'Its own file, with everything recorded. Import a file reads it back.'), link('Download as KML', 'kml', 'For Google Earth and other programs: the path with its times and heights.'))
      wrap.append(links)
    }
    return wrap
  }

  function recordingItem(r: RecordingInfo): HTMLElement {
    const flight = r.callsign ?? (r.hex === NO_HEX ? '' : r.hex.toUpperCase()) // an imported file may name neither
    const title = r.name ?? (flight || 'Flight')
    const route = r.route === null ? '' : r.route.split('-').join(' → ')
    const span = spanS(r)
    const when = utcText(r.firstMs ?? r.startedMs)
    const ended = r.active ? 'Still recording' : r.ended === null ? 'Cut short (the server stopped)' : ENDED[r.ended.why]
    const details = [facts([
      ['Flight', r.name === null ? '' : flight],
      ['Airline', r.operator ? (AIRLINE_NAMES[r.operator] ?? r.operator) : ''],
      ['Aircraft', [r.reg, r.typeCode].filter(Boolean).join(' · ')],
      ['Route', route],
      ['Started', utcText(r.startedMs)],
      ['Length', lengthText(span)],
      ['Points', r.samples.toLocaleString('en-US')],
      ['Ended', ended],
      ['Source', r.source],
    ])]
    if (opts.onRename || opts.onDelete || opts.downloadUrl) details.push(recordingActions(r, flight || title))
    const line = [route, when, lengthText(span)].filter(Boolean).join(' · ')
    const playable = r.samples >= 2 && span >= MIN_PLAY_S
    return item(recordingId(r.file), title, line, details, { mark: r.active ? 'REC' : undefined, playable, why: 'Too short to replay' })
  }

  function failed(what: string, retry: () => void): HTMLElement {
    const box = h('div', 'fh-scn-error')
    box.setAttribute('role', 'alert')
    box.append(h('p', 'fh-scn-error-t', `Could not load the ${what}.`))
    const again = h('button', 'fh-pill fh-pill-secondary', 'Try again')
    again.type = 'button'
    again.addEventListener('click', retry)
    box.append(again)
    return box
  }

  function paintPlaying(): void {
    for (const [id, btn] of buttons) {
      const on = id === playing
      const off = btn.dataset.off === '1'
      if (btn.disabled !== (on || off)) btn.disabled = on || off
      btn.classList.toggle('fh-on', on)
      btn.setAttribute('aria-pressed', String(on))
    }
  }

  function load<T>(list: HTMLElement, key: 'scn' | 'rec', get: () => Promise<T>, show: (v: T) => HTMLElement[], what: string): void {
    const mine = ++generation[key]
    for (const [id] of buttons) if ((key === 'rec') === id.startsWith('rec:')) buttons.delete(id)
    list.setAttribute('aria-busy', 'true')
    // A reload keeps what is there until the answer comes (no flash); the first load shows a skeleton.
    if (list.childElementCount === 0) list.replaceChildren(skeleton())
    get().then(
      (v) => {
        if (mine !== generation[key]) return
        list.setAttribute('aria-busy', 'false')
        list.replaceChildren(...show(v))
        paintPlaying()
      },
      (err: unknown) => {
        if (mine !== generation[key]) return
        console.warn(`[scenarios] ${what} failed`, err) // a package author needs the reason (ScenarioError lists every problem)
        list.setAttribute('aria-busy', 'false')
        list.replaceChildren(failed(what, () => load(list, key, get, show, what)))
      },
    )
  }

  const loadScenarios = (): void =>
    load(scnList, 'scn', opts.list, (cards) => (cards.length > 0 ? cards.map(scenarioItem) : [h('p', 'fh-scn-empty', 'No scenarios yet.')]), 'scenarios')
  const showRecordings = (recs: RecordingInfo[] | null): HTMLElement[] => {
    importBtn.hidden = recs === null // nowhere to keep an imported flight
    return recs === null
      ? [h('p', 'fh-scn-empty', 'This server records nothing: start it with make to record flights.')]
      : recs.length > 0
        ? recs.map(recordingItem)
        : [h('p', 'fh-scn-empty', `None yet. Select a flight and press the record button on its card${opts.onImport ? ', or import a flight file' : ''}.`)]
  }
  const loadRecordings = (): void => {
    if (opts.recordings) load(recList, 'rec', opts.recordings, showRecordings, 'recordings')
  }

  const api: ScenarioPanelHandle = {
    refresh(what) {
      if (what !== 'recordings') loadScenarios()
      loadRecordings()
    },
    setPlaying(id) {
      playing = id
      paintPlaying()
    },
    destroy() {
      generation.scn++
      generation.rec++
      buttons.clear()
      root.remove()
    },
  }
  api.refresh()
  return api
}
