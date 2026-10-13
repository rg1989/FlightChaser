// client/ui/scenarioPanel.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import type { RecordingInfo } from '../../shared/api.ts'
import type { ScenarioCard } from '../scenario/types.ts'

// scenarioPanel.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { mountScenarioPanel } = await import('./scenarioPanel.ts')

// Node has no DOM: just enough of one for scenarioPanel.ts and icons.ts. innerHTML throws: data goes in as text only.
class El {
  tag: string
  children: El[] = []
  parent: El | null = null
  className = ''
  textContent = ''
  hidden = false
  disabled = false
  open = false
  type = ''
  attrs: Record<string, string> = {}
  dataset: Record<string, string> = {}
  title = ''
  value = ''
  placeholder = ''
  maxLength = -1
  focused = false
  focus(): void {
    this.focused = true
  }
  querySelectorAll(tag: string): El[] {
    return all(this).filter((e) => e !== this && e.tag === tag)
  }
  get childElementCount(): number {
    return this.children.length
  }
  #classes = new Set<string>()
  classList = {
    add: (c: string): void => void this.#classes.add(c),
    remove: (c: string): void => void this.#classes.delete(c),
    toggle: (c: string, on?: boolean): boolean => {
      if (on ?? !this.#classes.has(c)) this.#classes.add(c)
      else this.#classes.delete(c)
      return this.#classes.has(c)
    },
    contains: (c: string): boolean => this.#classes.has(c),
  }
  listeners = new Map<string, ((e?: unknown) => void)[]>()
  constructor(tag: string) {
    this.tag = tag
  }
  set innerHTML(_v: string) {
    throw new Error('innerHTML is not allowed: data goes in with textContent')
  }
  append(...cs: El[]): void {
    for (const c of cs) {
      c.remove()
      c.parent = this
      this.children.push(c)
    }
  }
  replaceChildren(...cs: El[]): void {
    for (const c of this.children) c.parent = null
    this.children = []
    this.append(...cs)
  }
  remove(): void {
    if (!this.parent) return
    this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v
  }
  addEventListener(type: string, f: (e?: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), f])
  }
  click(): void {
    if (!this.disabled) this.fire('click')
  }
  fire(type: string, e?: unknown): void {
    for (const f of this.listeners.get(type) ?? []) f(e)
  }
  has(cls: string): boolean {
    return this.className.split(' ').includes(cls) || this.#classes.has(cls)
  }
}
Object.assign(globalThis, {
  document: { createElement: (tag: string) => new El(tag), createElementNS: (_ns: string, tag: string) => new El(tag) },
})

const all = (el: El): El[] => [el, ...el.children.flatMap(all)]
const text = (el: El): string => el.textContent + el.children.map(text).join('')
const find = (root: El, cls: string): El[] => all(root).filter((e) => e.has(cls))
const one = (root: El, cls: string): El => {
  const hits = find(root, cls)
  assert.equal(hits.length, 1, `one .${cls}, found ${hits.length}`)
  return hits[0]
}
const visible = (root: El, cls: string): El[] => find(root, cls).filter((e) => !all(root).some((a) => a.hidden && all(a).includes(e)))
const flush = (): Promise<void> => new Promise((r) => setImmediate(r))

function deferred<T>(): { promise: Promise<T>; resolve(v: T): void; reject(e: unknown): void } {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const JAL: ScenarioCard = {
  id: 'jal123',
  title: 'Japan Air Lines Flight 123',
  subtitle: 'Tokyo Haneda to Osaka Itami',
  date: '1985-08-12',
  clockLabel: 'JST',
  note: 'Reconstructed from the official accident report.',
  summary: ['First line of the summary.', 'Second line of the summary.'],
  crew: [
    { role: 'Captain', name: 'A. Captain', detail: 'right seat, instructor' },
    { role: 'First Officer', name: 'B. Officer' },
  ],
  aircraft: { registration: 'JA8119', type: 'Boeing 747SR-46', callsign: 'JAL123', operator: 'Japan Air Lines', model: 'b744' },
  start: 65475, // 18:11:15
  end: 68188, // 18:56:28
  sound: null,
}
const OTHER: ScenarioCard = { ...JAL, id: 'other', title: 'Another flight', crew: [], summary: [] }

const T0 = Date.UTC(2026, 8, 30, 0, 29, 32)
const ITY: RecordingInfo = {
  file: '2026-09-30/002932Z-ITY810-4cae1d.jsonl', name: null, hex: '4cae1d', callsign: 'ITY810', reg: 'EI-HXG', typeCode: 'A21N', category: 'A3',
  military: false, route: 'LIRF-LLBG', source: 'adsbfi', startedMs: T0, firstMs: T0 - 120_000, lastMs: T0 + 280_000, samples: 140,
  ended: { why: 'landed', endedMs: T0 + 340_000 }, active: false,
}
const LIVE: RecordingInfo = { ...ITY, file: '2026-09-30/010000Z-ELY336-73806c.jsonl', hex: '73806c', callsign: 'ELY336', route: null, ended: null, active: true }
const STUB: RecordingInfo = { ...ITY, file: '2026-09-30/020000Z--738abc.jsonl', hex: '738abc', callsign: null, samples: 1, lastMs: T0 - 120_000 }

function mount(
  list: () => Promise<ScenarioCard[]>, recordings?: () => Promise<RecordingInfo[] | null>,
  edit?: Pick<Parameters<typeof mountScenarioPanel>[1], 'onRename' | 'onDelete' | 'onImport' | 'downloadUrl' | 'modelOf' | 'hasLivery'>,
) {
  const body = new El('div')
  const plays: string[] = []
  let calls = 0
  let recCalls = 0
  const panel = mountScenarioPanel(body as unknown as HTMLElement, {
    list: () => {
      calls++
      return list()
    },
    recordings: recordings && (() => {
      recCalls++
      return recordings()
    }),
    onPlay: (id) => plays.push(id),
    ...edit,
  })
  return { body, panel, plays, calls: () => calls, recCalls: () => recCalls }
}

const titles = (root: El): string[] => visible(root, 'fh-scn-item').map((c) => text(one(c, 'fh-scn-title')))

test('a skeleton while list() runs, then one compact row per scenario: title and one line, details hidden', async () => {
  const d = deferred<ScenarioCard[]>()
  const { body, calls } = mount(() => d.promise)
  assert.equal(calls(), 1, 'loads at mount')
  assert.equal(visible(body, 'fh-scn-skel').length, 1)
  assert.equal(find(body, 'fh-scn-item').length, 0)
  d.resolve([JAL, OTHER])
  await flush()
  assert.equal(visible(body, 'fh-scn-skel').length, 0)
  assert.deepEqual(titles(body), ['Japan Air Lines Flight 123', 'Another flight'])
  const row = find(body, 'fh-scn-item')[0]
  assert.equal(row.attrs['aria-label'], 'Japan Air Lines Flight 123')
  assert.equal(text(one(row, 'fh-scn-line')), '12 August 1985 · 18:11–18:56 JST')
  // Nothing else shows until the chevron is pressed.
  for (const cls of ['fh-scn-sub', 'fh-scn-p', 'fh-scn-note', 'fh-scn-crew-list', 'fh-scn-facts']) assert.equal(visible(row, cls).length, 0, cls)
  assert.deepEqual(find(body, 'fh-scn-section').map(text), ['Scenarios'], 'no Recordings section without recordings()')
})

test('the chevron opens and closes a scenario\'s details: subtitle, aircraft, summary, crew, note', async () => {
  const { body } = mount(async () => [JAL])
  await flush()
  const row = one(body, 'fh-scn-item')
  const more = one(row, 'fh-scn-more')
  assert.equal(more.attrs['aria-expanded'], 'false')
  more.click()
  assert.equal(more.attrs['aria-expanded'], 'true')
  assert.equal(text(one(row, 'fh-scn-sub')), 'Tokyo Haneda to Osaka Itami')
  assert.equal(text(one(row, 'fh-scn-facts')), 'AircraftJA8119 · Boeing 747SR-46FlightJAL123')
  assert.deepEqual(visible(row, 'fh-scn-p').map(text), ['First line of the summary.', 'Second line of the summary.'])
  assert.deepEqual(all(row).filter((e) => e.tag === 'li').map(text), ['CaptainA. Captainright seat, instructor', 'First OfficerB. Officer'])
  assert.equal(text(one(row, 'fh-scn-note')), 'Reconstructed from the official accident report.')
  more.click()
  assert.equal(visible(row, 'fh-scn-note').length, 0)
})

test('no crew and no summary: no empty blocks in the details', async () => {
  const { body } = mount(async () => [OTHER])
  await flush()
  assert.equal(find(body, 'fh-scn-crew-list').length, 0)
  assert.equal(find(body, 'fh-scn-p').length, 0)
})

test('Play calls onPlay with that item\'s id; it is named for its item', async () => {
  const { body, plays } = mount(async () => [JAL, OTHER])
  await flush()
  const [a, b] = find(body, 'fh-scn-play')
  assert.equal(a.attrs['aria-label'], 'Play Japan Air Lines Flight 123')
  b.click()
  a.click()
  assert.deepEqual(plays, ['other', 'jal123'])
})

test('setPlaying: that item\'s Play is pressed and disabled; null restores it; set before the list arrives, it still applies', async () => {
  const d = deferred<ScenarioCard[]>()
  const { body, panel, plays } = mount(() => d.promise)
  panel.setPlaying('jal123')
  d.resolve([JAL, OTHER])
  await flush()
  const [a, b] = find(body, 'fh-scn-play')
  assert.deepEqual([a.disabled, a.attrs['aria-pressed'], b.disabled], [true, 'true', false])
  panel.setPlaying(null)
  assert.deepEqual([a.disabled, a.attrs['aria-pressed'], b.disabled], [false, 'false', false])
  assert.deepEqual(plays, [])
})

test('Recordings: newest first as the server lists them; route, start and length in one line; REC while under way', async () => {
  const { body, recCalls } = mount(async () => [JAL], async () => [LIVE, ITY])
  await flush()
  assert.equal(recCalls(), 1)
  assert.deepEqual(find(body, 'fh-scn-section').map(text), ['Scenarios', 'Recordings'])
  assert.deepEqual(titles(body), ['Japan Air Lines Flight 123', 'ELY336', 'ITY810'])
  const [, live, ity] = find(body, 'fh-scn-item')
  assert.equal(text(one(ity, 'fh-scn-line')), 'LIRF → LLBG · 30 Sep 2026 · 00:27 UTC · 7 min')
  assert.equal(find(ity, 'fh-scn-mark').length, 0)
  assert.equal(text(one(live, 'fh-scn-mark')), 'REC')
  one(ity, 'fh-scn-more').click()
  assert.equal(text(one(ity, 'fh-scn-facts')),
    'AircraftEI-HXG · A21NRouteLIRF → LLBGStarted30 Sep 2026 · 00:29 UTCLength7 minPoints140EndedLanded (stopped by itself)Sourceadsbfi')
  one(live, 'fh-scn-more').click()
  assert.match(text(one(live, 'fh-scn-facts')), /EndedStill recording/)
})

test('a recording plays by its rec: id; one too short says so and cannot be played', async () => {
  const { body, plays } = mount(async () => [], async () => [ITY, STUB])
  await flush()
  const [ity, stub] = find(body, 'fh-scn-item')
  one(ity, 'fh-scn-play').click()
  assert.deepEqual(plays, ['rec:2026-09-30/002932Z-ITY810-4cae1d'])
  assert.equal(text(one(stub, 'fh-scn-title')), '738ABC', 'no callsign: the hex')
  assert.equal(text(one(stub, 'fh-scn-line')), 'Too short to replay')
  assert.equal(one(stub, 'fh-scn-play').disabled, true)
})

test('Recordings: none yet, recording off, and a failed load each say so', async (t) => {
  t.mock.method(console, 'warn', () => {})
  const none = mount(async () => [], async () => [])
  await flush()
  assert.match(visible(none.body, 'fh-scn-empty').map(text).join(), /None yet\. Select a flight and press the record button/)
  const off = mount(async () => [], async () => null)
  await flush()
  assert.match(visible(off.body, 'fh-scn-empty').map(text).join(), /records nothing/)
  let fail = true
  const bad = mount(async () => [], async () => {
    if (fail) throw new Error('500')
    return [ITY]
  })
  await flush()
  const err = one(bad.body, 'fh-scn-error')
  assert.match(text(err), /Could not load the recordings/)
  fail = false
  all(err).find((e) => e.tag === 'button')!.click()
  await flush()
  assert.deepEqual(titles(bad.body), ['ITY810'])
})

test('refresh(\'recordings\') asks for the recordings only, keeps the rows until the answer, and drops a late older one', async () => {
  const answers = [deferred<RecordingInfo[]>(), deferred<RecordingInfo[]>(), deferred<RecordingInfo[]>()]
  let i = 0
  const { body, panel, calls } = mount(async () => [], () => answers[i++].promise)
  answers[0].resolve([ITY])
  await flush()
  panel.refresh('recordings')
  panel.refresh('recordings')
  assert.equal(calls(), 1, 'the scenarios are not asked again')
  assert.deepEqual(titles(body), ['ITY810'], 'no flash back to a skeleton')
  answers[2].resolve([LIVE, ITY])
  await flush()
  answers[1].resolve([])
  await flush()
  assert.deepEqual(titles(body), ['ELY336', 'ITY810'])
})

test('list() fails: an error line and Try again, which loads again', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {})
  let fail = true
  const { body, calls } = mount(async () => {
    if (fail) throw new Error('404')
    return [JAL]
  })
  await flush()
  const err = visible(body, 'fh-scn-error')
  assert.equal(err.length, 1)
  assert.match(text(err[0]), /Could not load the scenarios/)
  assert.equal(warn.mock.callCount(), 1, 'the reason goes to the console (a package author needs it)')
  fail = false
  all(err[0]).find((e) => e.tag === 'button')!.click()
  assert.equal(calls(), 2)
  await flush()
  assert.equal(visible(body, 'fh-scn-error').length, 0)
  assert.equal(visible(body, 'fh-scn-item').length, 1)
})

test('an empty scenario list says so', async () => {
  const { body } = mount(async () => [])
  await flush()
  assert.match(text(one(body, 'fh-scn-empty')), /No scenarios/)
})

test('data goes in as text only', async () => {
  const { body } = mount(async () => [{ ...JAL, title: '<img src=x onerror=alert(1)>', note: '<b>n</b>' }], async () => [{ ...ITY, callsign: '<b>x</b>' }])
  await flush()
  assert.deepEqual(find(body, 'fh-scn-title').map(text), ['<img src=x onerror=alert(1)>', '<b>x</b>'])
  assert.equal(text(one(body, 'fh-scn-note')), '<b>n</b>')
})

test('destroy removes the panel, and a late answer adds nothing', async () => {
  const d = deferred<ScenarioCard[]>()
  const { body, panel } = mount(() => d.promise)
  assert.equal(body.children.length, 1)
  panel.destroy()
  assert.equal(body.children.length, 0)
  d.resolve([JAL])
  await flush()
  assert.equal(all(body).length, 1)
  panel.destroy()
})

const key = (k: string) => {
  const e = { key: k, stopped: false, prevented: false, stopPropagation() { e.stopped = true }, preventDefault() { e.prevented = true } }
  return e
}
const btn = (root: El, label: string): El => {
  const b = all(root).filter((e) => e.tag === 'button' && text(e) === label)
  assert.equal(b.length, 1, `one "${label}" button, found ${b.length}`)
  return b[0]
}

test('Rename: in place, Enter saves (the list after it is shown, the row still open), Esc cancels without closing the panel', async () => {
  const names: [string, string][] = []
  const { body } = mount(async () => [], async () => [ITY], {
    onRename: async (file, name) => {
      names.push([file, name])
      return [{ ...ITY, name: name.trim() || null }]
    },
  })
  await flush()
  one(body, 'fh-scn-more').click()
  btn(body, 'Rename').click()
  const input = one(body, 'fh-scn-input')
  assert.deepEqual([input.value, input.placeholder, input.maxLength, input.focused], ['', 'ITY810', 60, true])
  const esc = key('Escape')
  input.fire('keydown', esc)
  assert.ok(esc.stopped, 'Esc stays in the field: the app would close the panel')
  assert.equal(find(body, 'fh-scn-input').length, 0, 'cancelled')
  btn(body, 'Rename').click()
  one(body, 'fh-scn-input').value = 'Night arrival, runway 12'
  one(body, 'fh-scn-input').fire('keydown', key('Enter'))
  await flush()
  assert.deepEqual(names, [[ITY.file, 'Night arrival, runway 12']])
  assert.deepEqual(titles(body), ['Night arrival, runway 12'])
  assert.equal(visible(body, 'fh-scn-facts').length, 1, 'still open')
  assert.match(text(one(body, 'fh-scn-facts')), /^FlightITY810Aircraft/, 'named: its flight in the details')
  assert.equal(find(body, 'fh-scn-play')[0].attrs['aria-label'], 'Play Night arrival, runway 12')
})

test('Delete asks first; Cancel keeps it; confirmed, the list after it is shown; a failure says so and allows a retry', async (t) => {
  t.mock.method(console, 'warn', () => {})
  let fail = true
  const deleted: string[] = []
  const { body } = mount(async () => [], async () => [LIVE, ITY], {
    onDelete: async (file) => {
      if (fail) throw new Error('500')
      deleted.push(file)
      return [LIVE]
    },
  })
  await flush()
  const ity = find(body, 'fh-scn-item')[1]
  one(ity, 'fh-scn-more').click()
  assert.equal(all(ity).filter((e) => e.tag === 'button' && text(e) === 'Rename').length, 0, 'no onRename: no Rename')
  btn(ity, 'Delete').click()
  assert.match(text(ity), /Delete for good\?/)
  assert.deepEqual(deleted, [])
  btn(ity, 'Cancel').click()
  btn(ity, 'Delete').click()
  btn(ity, 'Delete').click()
  await flush()
  assert.match(text(one(ity, 'fh-scn-actmsg')), /Could not delete it/)
  assert.equal(btn(ity, 'Delete').disabled, false, 'buttons back for a retry')
  fail = false
  btn(ity, 'Delete').click()
  await flush()
  assert.deepEqual(deleted, [ITY.file])
  assert.deepEqual(titles(body), ['ELY336'])
})

test('an edit\'s list is not undone by an older reload answering after it', async () => {
  const slow = deferred<RecordingInfo[]>()
  let n = 0
  const { body, panel } = mount(async () => [], () => (n++ === 0 ? Promise.resolve([ITY]) : slow.promise), {
    onRename: async () => [{ ...ITY, name: 'Renamed' }],
  })
  await flush()
  panel.refresh('recordings')
  one(body, 'fh-scn-more').click()
  btn(body, 'Rename').click()
  one(body, 'fh-scn-input').fire('keydown', key('Enter'))
  await flush()
  slow.resolve([ITY])
  await flush()
  assert.deepEqual(titles(body), ['Renamed'])
})

test('a scenario that plays sound carries a speaker by its title, named for what it plays; the others carry none', async () => {
  const { body } = mount(async () => [{ ...JAL, sound: 'recording' }, { ...OTHER, sound: 'voice-over' }, { ...OTHER, id: 'silent' }])
  await flush()
  const rows = find(body, 'fh-scn-item')
  assert.deepEqual(rows.map((r) => find(r, 'fh-scn-sound').map((m) => m.attrs['aria-label'])), [['Plays the recorded sound'], ['Plays a voice-over'], []])
})

const AT = Date.UTC(2018, 10, 11, 13, 34, 7) / 1000
const CSV = `Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction\n${AT},,KZR1388,"38.89,-8.96",3400,170,158\n${AT + 600},,KZR1388,"38.88,-8.95",4175,182,131\n`

async function pickFile(body: El, name: string, content: string, size = content.length): Promise<void> {
  const picker = all(body).find((e) => e.tag === 'input' && e.type === 'file')!
  Object.assign(picker, { files: [{ name, size, text: async () => content }] })
  picker.fire('change')
  await flush()
}
const field = (body: El, label: string): El => find(body, 'fh-scn-field').find((f) => text(f.children[0]) === label)!.children[1]
const button = (root: El, label: string): El => all(root).find((e) => e.tag === 'button' && text(e) === label)!

test('Import a file: the form shows what the file holds and says; Import sends it with what was typed; the new one opens', async () => {
  const sent: unknown[] = []
  const KZR: RecordingInfo = { ...ITY, file: '2018-11-11/133407Z-KZR1388-000000.jsonl', hex: '000000', callsign: 'KZR1388', name: 'Air Astana 1388', reg: 'P4-KCJ', typeCode: 'E190', route: null, operator: 'KZR', source: 'Flightradar24 CSV file', ended: { why: 'imported', endedMs: 0 } }
  const { body } = mount(async () => [], async () => [ITY], {
    onImport: async (content, o) => {
      sent.push(content === CSV, o)
      return { file: KZR.file, recordings: [ITY, KZR] }
    },
    modelOf: (t) => (t === 'E190' ? 'Embraer 190' : null),
    hasLivery: (op) => op === 'ELY',
  })
  await flush()
  const box = one(body, 'fh-scn-import')
  assert.equal(box.hidden, true)
  assert.equal(button(body, 'Import a file').hidden, false)
  await pickFile(body, 'KC1388_1e84fc24.csv', CSV)
  assert.equal(box.hidden, false)
  assert.equal(text(one(box, 'fh-scn-import-file')), 'KC1388_1e84fc24.csv')
  assert.equal(text(one(box, 'fh-scn-line')), 'Flightradar24 CSV · 11 Nov 2018 · 13:34 UTC · 10 min · 2 points')
  assert.deepEqual(['Name', 'Flight', 'Airline', 'Registration', 'Type'].map((l) => field(box, l).value), ['', 'KZR1388', '', '', ''])
  assert.equal(field(box, 'Name').placeholder, 'KZR1388')
  const hint = (label: string): string => visible(find(box, 'fh-scn-field').find((f) => text(f.children[0]) === label)!, 'fh-scn-hint').map(text).join('')
  assert.equal(hint('Airline'), 'Air Astana (from the flight) · no livery of it yet: plain white')

  const type = (label: string, v: string): void => {
    field(box, label).value = v
    field(box, label).fire('input')
  }
  type('Type', 'e190')
  assert.equal(hint('Type'), 'Model: Embraer 190')
  type('Type', 'B789')
  assert.equal(hint('Type'), 'No model of this type yet: a stand-in is drawn.')
  type('Airline', 'el al israel airlines')
  assert.equal(hint('Airline'), 'El Al Israel Airlines')
  type('Type', 'a boeing')
  button(box, 'Import').click()
  assert.match(text(one(box, 'fh-scn-actmsg')), /^Type: the ICAO code/)
  assert.deepEqual(sent, [], 'nothing is sent while a field cannot be')
  type('Type', 'e190')
  type('Registration', 'p4-kcj')
  type('Name', ' Air Astana 1388 ')
  button(box, 'Import').click()
  await flush()
  assert.deepEqual(sent, [true, { flight: 0, name: 'Air Astana 1388', callsign: 'KZR1388', reg: 'P4-KCJ', type: 'E190', airline: 'ELY' }])
  assert.equal(box.hidden, true)
  assert.deepEqual(titles(body), ['ITY810', 'Air Astana 1388'])
  const row = find(body, 'fh-scn-item')[1]
  assert.equal(one(row, 'fh-scn-details').hidden, false, 'the imported one is open')
  assert.equal(text(one(row, 'fh-scn-facts')), 'FlightKZR1388AirlineAir AstanaAircraftP4-KCJ · E190Started30 Sep 2026 · 00:29 UTCLength7 minPoints140SourceFlightradar24 CSV file')
})

test('Import a file: one that cannot be read says why; a failed import says the server\'s words; no Import where nothing is kept', async () => {
  const { body } = mount(async () => [], async () => [], { onImport: () => Promise.reject(new Error('This flight is in the list already.')) })
  await flush()
  const box = one(body, 'fh-scn-import')
  await pickFile(body, 'notes.txt', 'hello')
  assert.match(text(one(box, 'fh-scn-actmsg')), /^Not a flight file this app reads/)
  button(box, 'Close').click()
  assert.equal(box.hidden, true)
  await pickFile(body, 'big.kml', '', 33 * 1024 * 1024)
  assert.equal(text(one(box, 'fh-scn-actmsg')), 'The file is over 32 MB.')
  await pickFile(body, 'a.csv', CSV)
  button(box, 'Import').click()
  await flush()
  assert.equal(text(one(box, 'fh-scn-actmsg')), 'This flight is in the list already.')
  assert.equal(button(box, 'Import').disabled, false)
  button(box, 'Cancel').click()
  assert.equal(box.hidden, true)

  const off = mount(async () => [], async () => null, { onImport: async () => ({ file: '', recordings: [] }) })
  await flush()
  assert.equal(button(off.body, 'Import a file').hidden, true)
})

test('a file of several flights: the one longest in the air is offered, another can be chosen', async () => {
  const sent: unknown[] = []
  const row = (dt: number, alt: number | string, flags = 0, flight?: string): unknown[] => [dt, 25.26 + dt / 1e5, 55.35, alt, 150, 31, flags, null, flight ? { flight } : null, 'adsb_icao', null, null, null, null]
  const trace = JSON.stringify({ icao: '8965d1', r: 'A6-FKF', t: 'B38M', timestamp: AT, trace: [row(0, 'ground', 0, 'FDB7AQ'), row(60, 'ground'), row(4000, 900, 2, 'FDB1073'), row(4060, 2000), row(4120, 3000)] })
  const { body } = mount(async () => [], async () => [], { onImport: async (_c, o) => (sent.push(o), { file: 'x', recordings: [] }) })
  await flush()
  await pickFile(body, 'trace_full_8965d1.json', trace)
  const box = one(body, 'fh-scn-import')
  const pick = all(box).find((e) => e.tag === 'select')!
  assert.deepEqual(pick.children.map(text), ['FDB7AQ · 11 Nov 2018 · 13:34 UTC · 1 min', 'FDB1073 · 11 Nov 2018 · 14:40 UTC · 2 min'])
  assert.equal(pick.value, '1')
  assert.deepEqual(['Flight', 'Registration', 'Type'].map((l) => field(box, l).value), ['FDB1073', 'A6-FKF', 'B38M'])
  pick.value = '0'
  pick.fire('change')
  assert.equal(field(box, 'Flight').value, 'FDB7AQ')
  button(box, 'Import').click()
  await flush()
  assert.deepEqual(sent, [{ flight: 0, name: '', callsign: 'FDB7AQ', reg: 'A6-FKF', type: 'B38M', airline: '' }])
})

test('a recording\'s details hold links that download it: its own file, and KML', async () => {
  const { body } = mount(async () => [], async () => [ITY], { downloadUrl: (file, as) => `/api/recordings/file?file=${file}${as ? `&as=${as}` : ''}` })
  await flush()
  const links = all(one(body, 'fh-scn-item')).filter((e) => e.tag === 'a') as (El & { href: string; download: string })[]
  assert.deepEqual(links.map((a) => [text(a), a.href, a.download]), [
    ['Download', '/api/recordings/file?file=2026-09-30/002932Z-ITY810-4cae1d.jsonl', ''],
    ['Download as KML', '/api/recordings/file?file=2026-09-30/002932Z-ITY810-4cae1d.jsonl&as=kml', ''],
  ])
})
