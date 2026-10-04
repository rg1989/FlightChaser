// client/ui/wxMenu.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { RAIN_PALETTE } from '../scene/radar.ts'
import { SEV_COLOR } from '../scene/wxAhead.ts'
import { CATEGORY_COLOR, MODEL_CREDIT, SAT_CREDIT } from '../scene/wxText.ts'
import type { WxPrefs } from './wxPrefs.ts'
import type { WxMenuView } from './wxMenu.ts'

// wxMenu.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { mountWxMenu } = await import('./wxMenu.ts')
const { DEFAULT_WX_PREFS } = await import('./wxPrefs.ts')

// Node has no DOM: just enough of one for mountWxMenu (and icons.ts). A click goes to the element's listeners, then up its parents', as in a page.
interface ClickEvent { target: El }
class El {
  tag: string
  children: El[] = []
  parent: El | null = null
  className = ''
  #text = ''
  type = ''
  href = ''
  target = ''
  rel = ''
  hidden = false
  disabled = false
  value = '' // a slider's
  inputs: (() => void)[] = []
  vars: Record<string, string> = {}
  style = { setProperty: (k: string, v: string): void => void (this.vars[k] = v) }
  classList = { add: (): void => {} } // icons.ts marks its svg
  attrs: Record<string, string> = {}
  attrWrites = 0
  listeners: ((e: ClickEvent) => void)[] = []
  constructor(tag: string) {
    this.tag = tag
  }
  get textContent(): string {
    return this.#text
  }
  set textContent(v: string) {
    for (const c of this.children) c.parent = null
    this.children = [] // as in the DOM: the text replaces what the element held
    this.#text = v
  }
  append(...cs: El[]): void {
    for (const c of cs) {
      c.parent = this
      this.children.push(c)
    }
  }
  replaceChildren(...cs: (El | string)[]): void {
    this.#text = ''
    for (const c of this.children) c.parent = null
    this.children = []
    this.append(...cs.map((c) => (typeof c === 'string' ? Object.assign(new El('#text'), { textContent: c }) : c)))
  }
  remove(): void {
    if (!this.parent) return
    this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }
  setAttribute(k: string, v: string): void {
    this.attrWrites++
    this.attrs[k] = v
  }
  addEventListener(type: string, f: (e: ClickEvent) => void): void {
    if (type === 'click') this.listeners.push(f)
    if (type === 'input') this.inputs.push(f as unknown as () => void)
  }
  /** A slider dragged to v: its value is that, and its listeners hear of it. A disabled one does not move. */
  slide(v: string): void {
    if (this.disabled) return
    this.value = v
    for (const f of this.inputs) f()
  }
  click(e: ClickEvent = { target: this }): void {
    if (this.disabled) return // as in a page: a disabled button takes no click, and passes none up
    for (const f of this.listeners) f(e)
    this.parent?.click(e)
  }
}
Object.assign(globalThis, {
  document: { createElement: (tag: string) => new El(tag), createElementNS: (_ns: string, tag: string) => new El(tag) },
})

const all = (el: El): El[] => [el, ...el.children.flatMap(all)]
const text = (el: El): string => el.textContent + el.children.map(text).join('')

const CHASE: WxMenuView = { wx: true, chasing: true, live: true, failed: false, theme: 'light' } // the Weather switch on, in a live chase: every control in use

function mount(prefs: WxPrefs = DEFAULT_WX_PREFS, view: Partial<WxMenuView> = {}) {
  const root = new El('div')
  const changes: WxPrefs[] = []
  const masters: boolean[] = []
  const menu = mountWxMenu(root as unknown as HTMLElement, { prefs, onChange: (next) => changes.push(next), onMaster: (on) => masters.push(on) })
  menu.setView({ ...CHASE, ...view })
  const group = (label: string): El => all(root).find((e) => e.attrs.role === 'group' && e.attrs['aria-label'] === label)!
  const button = (label: string, name: string): El => group(label).children.find((b) => b.textContent === name)!
  const sw = (label: string): El => all(root).find((e) => e.attrs.role === 'switch' && e.attrs['aria-label'] === label)!
  const pressed = (label: string): string[] => group(label).children.filter((b) => b.attrs['aria-pressed'] === 'true').map((b) => b.textContent)
  const aids = (): string[] => ['Track line', 'Level slice', 'Ahead strip'].map((l) => sw(l).attrs['aria-checked'])
  const part = (className: string): El => all(root).find((e) => e.className.split(' ').includes(className))!
  return { root, menu, changes, masters, group, button, sw, pressed, aids, part }
}

/** Every control but the master switch: the two segments' buttons (three looks, three styles) and the three aids' switches. */
const others = (root: El): El[] => all(root).filter((e) => e.className === 'fh-seg-b' || (e.attrs.role === 'switch' && e.attrs['aria-label'] !== 'Weather'))
/** What is on screen: the tree without its hidden parts. */
const visible = (el: El): El[] => (el.hidden ? [] : [el, ...el.children.flatMap(visible)])

test('the panel: Clouds with its legend, Hazard areas, Looking ahead with a switch row and a hint each', () => {
  const { root, group } = mount()
  assert.deepEqual(all(root).filter((e) => e.className === 'fh-scene-title').map(text), ['Clouds', 'Hazard areas', 'Looking ahead'])
  assert.deepEqual(group('Clouds').children.map(text), ['Natural', 'Severity colours', 'Sculpted'])
  assert.deepEqual(group('Hazard area style').children.map(text), ['Curtain', 'Fence', 'Box'])
  const rows = all(root).filter((e) => e.className === 'fh-scene-row')
  assert.deepEqual(rows.map((r) => text(r.children[1])), [
    'WeatherWClouds, rain and hazard areas around the aircraft', // the master switch, first (the chase's hint)
    "Track lineThe next six minutes on this heading",
    "Level sliceThe weather at the aircraft's own altitude",
    'Ahead stripSide view of the next 80 km',
  ])
  const switches = all(root).filter((e) => e.attrs.role === 'switch')
  assert.deepEqual(switches.map((s) => s.attrs['aria-label']), ['Weather', 'Track line', 'Level slice', 'Ahead strip'])
  for (const s of switches) {
    assert.equal(s.tag, 'button')
    assert.equal(s.type, 'button') // never a form submit; Enter and Space work as on any button
    assert.equal(s.className, 'fh-switch')
  }
  for (const b of all(root).filter((e) => e.className === 'fh-seg-b')) assert.equal(b.type, 'button')
})

test('the four-colour legend under the clouds: Cloud, Light rain, Heavy rain, Thunderstorm, in the severity scale\'s colours', () => {
  const { root, group } = mount()
  const legend = all(root).find((e) => e.className === 'fh-wx-legend fh-wxm-legend')!
  assert.deepEqual(legend.children.map(text), ['Cloud', 'Light rain', 'Heavy rain', 'Thunderstorm'])
  assert.deepEqual(legend.children.map((k) => k.vars['--c']), [...SEV_COLOR])
  assert.deepEqual(SEV_COLOR, ['#f2f5f8', '#58a6ff', '#ffbe3d', '#ff4d3d'])
  // Under the clouds' buttons, in the same section.
  const section = group('Clouds').parent!
  assert.ok(section.children.includes(legend))
  assert.ok(section.children.indexOf(legend) > section.children.indexOf(group('Clouds')))
})

test('it is the Layers panel\'s look: its classes for the section heads, button groups, rows and switches', () => {
  const { root } = mount()
  const classes = new Set(all(root).map((e) => e.className))
  for (const c of ['fh-scene', 'fh-scene-head', 'fh-scene-title', 'fh-seg', 'fh-seg-b', 'fh-scene-row', 'fh-scene-icon', 'fh-scene-text', 'fh-scene-label', 'fh-scene-hint', 'fh-switch']) {
    assert.ok([...classes].some((k) => k.split(' ').includes(c)), c)
  }
  assert.equal(root.children.length, 4) // the master switch's section, Clouds, Hazard areas, Looking ahead
  assert.ok(root.children.every((s) => s.className === 'fh-scene'))
})

test('mounted with the prefs it is given: the pressed buttons and the switches show them', () => {
  const a = mount() // the defaults
  assert.deepEqual([a.pressed('Clouds'), a.pressed('Hazard area style'), a.aids()], [['Severity colours'], ['Curtain'], ['true', 'false', 'true']])
  const b = mount({ look: 'sculpted', opacity: 0.58, hazard: 'box', track: false, slice: true, strip: false })
  assert.deepEqual([b.pressed('Clouds'), b.pressed('Hazard area style'), b.aids()], [['Sculpted'], ['Box'], ['false', 'true', 'false']])
  const c = mount({ look: 'natural', opacity: 0.58, hazard: 'fence', track: true, slice: true, strip: true })
  assert.deepEqual([c.pressed('Clouds'), c.pressed('Hazard area style'), c.aids()], [['Natural'], ['Fence'], ['true', 'true', 'true']])
})

test('a look or a style button asks for it and keeps the others; the one already pressed asks nothing', () => {
  const p: WxPrefs = { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true }
  const { button, changes } = mount(p)
  button('Clouds', 'Natural').click()
  button('Clouds', 'Sculpted').click()
  button('Clouds', 'Severity colours').click() // pressed already
  button('Hazard area style', 'Fence').click()
  button('Hazard area style', 'Box').click()
  button('Hazard area style', 'Curtain').click() // pressed already
  assert.deepEqual(changes, [
    { ...p, look: 'natural' },
    { ...p, look: 'sculpted' },
    { ...p, hazard: 'fence' },
    { ...p, hazard: 'box' },
  ])
})

test('a switch asks for its own field toggled and keeps the others; the whole row is the target, and a click on the switch asks once', () => {
  const p: WxPrefs = { look: 'natural', opacity: 0.58, hazard: 'fence', track: true, slice: false, strip: true }
  const { sw, changes } = mount(p)
  sw('Track line').click()
  sw('Level slice').click()
  sw('Ahead strip').click()
  assert.deepEqual(changes, [{ ...p, track: false }, { ...p, slice: true }, { ...p, strip: false }]) // one ask each, though a click rises to its row
  const row = sw('Level slice').parent!
  assert.equal(row.className, 'fh-scene-row')
  row.click() // on the row, not on its switch (a finger's)
  assert.deepEqual(changes.at(-1), { ...p, slice: true })
  assert.equal(changes.length, 4)
})

test('a click changes nothing itself: the app answers with update(); the caller\'s prefs are not touched', () => {
  const p: WxPrefs = { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true }
  const { button, sw, pressed, aids, changes } = mount(p)
  button('Clouds', 'Natural').click()
  sw('Level slice').click()
  assert.deepEqual(pressed('Clouds'), ['Severity colours'])
  assert.deepEqual(aids(), ['true', 'false', 'true'])
  assert.deepEqual(p, { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true })
  assert.notEqual(changes[0], p)
  button('Hazard area style', 'Box').click()
  assert.deepEqual(changes[2], { ...p, hazard: 'box' }) // still from what it was given, not from the clicks
})

test('update() moves the pressed buttons and the switches, asks nothing, and the next click goes from the new prefs', () => {
  const { menu, button, sw, pressed, aids, changes } = mount()
  menu.update({ look: 'natural', opacity: 0.58, hazard: 'box', track: false, slice: true, strip: false })
  assert.deepEqual([pressed('Clouds'), pressed('Hazard area style'), aids()], [['Natural'], ['Box'], ['false', 'true', 'false']])
  assert.deepEqual(changes, [])
  button('Clouds', 'Sculpted').click()
  sw('Track line').click()
  assert.deepEqual(changes, [
    { look: 'sculpted', opacity: 0.58, hazard: 'box', track: false, slice: true, strip: false },
    { look: 'natural', opacity: 0.58, hazard: 'box', track: true, slice: true, strip: false },
  ])
  button('Clouds', 'Natural').click() // the one pressed now
  assert.equal(changes.length, 2)
  menu.update(DEFAULT_WX_PREFS)
  assert.deepEqual([pressed('Clouds'), pressed('Hazard area style'), aids()], [['Severity colours'], ['Curtain'], ['true', 'false', 'true']])
})

test('update() writes only what changed (it runs for every choice made)', () => {
  const p: WxPrefs = { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true }
  const { root, menu } = mount(p)
  const writes = (): number => all(root).reduce((n, e) => n + e.attrWrites, 0)
  const before = writes()
  menu.update({ ...p })
  assert.equal(writes(), before, 'the same prefs: nothing written')
  menu.update({ ...p, look: 'natural' })
  assert.equal(writes(), before + 3, 'a look: its three buttons')
  menu.update({ ...p, look: 'natural', slice: true })
  assert.equal(writes(), before + 4, 'a switch: that switch')
  menu.update({ ...p, look: 'natural', slice: true, opacity: 0.2 })
  assert.equal(writes(), before + 4, 'the opacity: the slider\'s value and its words, no attribute')
})

test('destroy() takes the panel\'s parts out of its root', () => {
  const { root, menu } = mount()
  assert.equal(root.children.length, 4)
  menu.destroy()
  assert.equal(root.children.length, 0)
})

// .fh-seg-b's thirds are 95 px each in the 320 px panel and "Severity colours" needs about 110: a button is as wide as its words need,
// and the buttons are equal where a third is enough (Curtain, Fence, Box). CSS, so checked as text.
test('wxMenu.css: a segment\'s buttons are equal shares of the row, each no narrower than its words; and the legend has the panel\'s margins', () => {
  const css = readFileSync(new URL('./wxMenu.css', import.meta.url), 'utf8')
  assert.match(css, /\.fh-wxm-seg \.fh-seg-b \{[^}]*flex: 1 1 0;[^}]*min-width: max-content;[^}]*white-space: nowrap;[^}]*\}/)
  assert.match(css, /\.fh-wxm-legend \{[^}]*padding: 0 14px 10px;[^}]*\}/)
})

test('the master switch: Weather (W), first in the panel; it shows the Weather pref and asks for it toggled, once, from the switch or the row', () => {
  const on = mount(DEFAULT_WX_PREFS, { wx: true })
  const master = on.sw('Weather')
  assert.deepEqual([master.tag, master.type, master.className, master.attrs['aria-checked']], ['button', 'button', 'fh-switch', 'true'])
  const row = master.parent!
  assert.equal(row.className, 'fh-scene-row')
  assert.equal(row.parent, on.root.children[0], 'in the first section, above Clouds')
  assert.equal(text(row.children[1]), 'WeatherWClouds, rain and hazard areas around the aircraft')
  master.click()
  assert.deepEqual(on.masters, [false]) // one ask, though the click rises to its row
  row.click({ target: row }) // on the row, not on its switch (a finger's)
  assert.deepEqual(on.masters, [false, false])
  assert.deepEqual(on.changes, [], 'the Weather prefs (look, hazard, aids) are not touched')
  const off = mount(DEFAULT_WX_PREFS, { wx: false })
  assert.equal(off.sw('Weather').attrs['aria-checked'], 'false')
  off.sw('Weather').click()
  assert.deepEqual(off.masters, [true])
  off.menu.setView({ ...CHASE, wx: true }) // the app answers
  assert.equal(off.sw('Weather').attrs['aria-checked'], 'true')
})

test('the master row\'s hint follows the view: radar and airports top-down, clouds, rain and hazard areas round the aircraft in the chase', () => {
  const { menu, sw } = mount(DEFAULT_WX_PREFS, { chasing: false })
  const hint = (): string => text(sw('Weather').parent!.children[1])
  assert.equal(hint(), 'WeatherWRain radar, airport weather, hazard areas')
  menu.setView({ ...CHASE })
  assert.equal(hint(), 'WeatherWClouds, rain and hazard areas around the aircraft')
})

test('Weather off: every other control keeps the stored choice but is disabled, and a click on one changes nothing', () => {
  const p: WxPrefs = { look: 'natural', opacity: 0.58, hazard: 'fence', track: false, slice: true, strip: false }
  const { root, menu, button, sw, pressed, aids, group, changes, masters } = mount(p, { wx: false })
  assert.equal(others(root).length, 9)
  for (const e of others(root)) assert.equal(e.disabled, true, `${e.attrs['aria-label'] ?? e.textContent} is disabled`)
  for (const g of [group('Clouds'), group('Hazard area style'), ...['Track line', 'Level slice', 'Ahead strip'].map((l) => sw(l).parent!)]) assert.equal(g.attrs['aria-disabled'], 'true')
  assert.equal(sw('Weather').disabled, false, 'the master stays in use')
  assert.deepEqual([pressed('Clouds'), pressed('Hazard area style'), aids()], [['Natural'], ['Fence'], ['false', 'true', 'false']], 'the stored choices still show')
  for (const e of others(root)) e.click()
  for (const l of ['Track line', 'Level slice', 'Ahead strip']) sw(l).parent!.click({ target: sw(l).parent! }) // the rows too
  button('Clouds', 'Severity colours').click()
  assert.deepEqual([changes, masters], [[], []])
  assert.deepEqual([pressed('Clouds'), pressed('Hazard area style'), aids()], [['Natural'], ['Fence'], ['false', 'true', 'false']], 'nothing moved')
  menu.setView({ ...CHASE, wx: true }) // switched on: the same choices, in use
  for (const e of others(root)) assert.equal(e.disabled, false)
  assert.equal(group('Clouds').attrs['aria-disabled'], 'false')
  assert.deepEqual([pressed('Clouds'), pressed('Hazard area style'), aids()], [['Natural'], ['Fence'], ['false', 'true', 'false']])
  button('Clouds', 'Severity colours').click()
  assert.deepEqual(changes, [{ ...p, look: 'severity' }])
})

test('top-down: the cloud look, the hazard style and the looking-ahead rows are there, disabled, with one line, "In the chase view"; in the chase the line goes', () => {
  const { root, menu, part } = mount(DEFAULT_WX_PREFS, { chasing: false })
  assert.equal(others(root).length, 9)
  for (const e of others(root)) assert.equal(e.disabled, true)
  assert.equal(all(root).find((e) => e.attrs.role === 'switch' && e.attrs['aria-label'] === 'Weather')!.disabled, false, 'the master is in use')
  const note = part('fh-wxm-note')
  assert.deepEqual([note.textContent, note.hidden], ['In the chase view', false])
  assert.equal(all(root).filter((e) => e.className.split(' ').includes('fh-wxm-note')).length, 1, 'one line, not one per part')
  menu.setView({ ...CHASE })
  for (const e of others(root)) assert.equal(e.disabled, false)
  assert.equal(note.hidden, true)
})

test('Live only (History, a scenario): the master switch is disabled, showing its pref', () => {
  const { sw, masters } = mount(DEFAULT_WX_PREFS, { live: false })
  const master = sw('Weather')
  assert.deepEqual([master.disabled, master.parent!.attrs['aria-disabled'], master.attrs['aria-checked']], [true, 'true', 'true'])
  master.click()
  master.parent!.click({ target: master.parent! })
  assert.deepEqual(masters, [])
  const live = mount(DEFAULT_WX_PREFS)
  assert.deepEqual([live.sw('Weather').disabled, live.sw('Weather').parent!.attrs['aria-disabled']], [false, 'false'])
})

test('after a drawing error the Clouds segment is disabled, the hazard style and the aids are not', () => {
  const { root, menu, group, button, sw, changes } = mount(DEFAULT_WX_PREFS, { failed: true })
  assert.deepEqual(group('Clouds').children.map((b) => b.disabled), [true, true, true])
  assert.equal(group('Clouds').attrs['aria-disabled'], 'true')
  button('Clouds', 'Natural').click()
  assert.deepEqual(changes, [])
  assert.deepEqual(group('Hazard area style').children.map((b) => b.disabled), [false, false, false])
  assert.deepEqual(['Track line', 'Level slice', 'Ahead strip'].map((l) => sw(l).disabled), [false, false, false])
  assert.equal(group('Hazard area style').attrs['aria-disabled'], 'false')
  menu.setView({ ...CHASE, failed: true, wx: false })
  assert.equal(others(root).every((e) => e.disabled), true)
})

test('setView() with nothing changed writes nothing', () => {
  const { root, menu } = mount()
  const writes = (): number => all(root).reduce((n, e) => n + e.attrWrites, 0)
  const before = writes()
  for (let i = 0; i < 50; i++) menu.setView({ ...CHASE })
  assert.equal(writes(), before)
  menu.setView({ ...CHASE, wx: false })
  assert.equal(writes(), before + 1 + 6, 'the master switch, and the six parts that go off (two segments, the opacity, three rows)')
})

test('the rain scale and the airports legend are the top-down map\'s, with the switch on; the status line is both views\'', () => {
  const { root, menu, part } = mount(DEFAULT_WX_PREFS, { chasing: false })
  const shows = (): string[] => visible(root).flatMap((e) => ['fh-wx-rain', 'fh-wx-legend', 'fh-wx-line'].includes(e.className) ? [e.className] : [])
  assert.deepEqual(shows(), ['fh-wx-rain', 'fh-wx-legend'])
  menu.setWeather('Live only')
  assert.deepEqual(shows(), ['fh-wx-rain', 'fh-wx-legend', 'fh-wx-line'])
  menu.setView({ ...CHASE }) // the chase
  assert.deepEqual(shows(), ['fh-wx-line'])
  menu.setWeather('Clouds from 3 airports · 2 hazard areas')
  assert.equal(part('fh-wx-line').textContent, 'Clouds from 3 airports · 2 hazard areas')
  menu.setWeather(null)
  assert.deepEqual(shows(), [])
  assert.equal(part('fh-wx-more').hidden, true, 'nothing under the switch: its box goes')
  menu.setView({ ...CHASE, chasing: false, wx: false }) // switched off: no rain scale, no legend
  assert.deepEqual(shows(), [])
  menu.setWeather('Live only') // History: the line says why the switch is disabled, whatever the switch holds
  assert.deepEqual(shows(), ['fh-wx-line'])
})

test('weather: a rain scale above the airports legend, Light to Heavy, in the radar\'s colours for the map on screen', () => {
  const { root, menu } = mount(DEFAULT_WX_PREFS, { chasing: false })
  const more = all(root).find((e) => e.className === 'fh-wx-more')!
  assert.deepEqual(more.children.map((e) => e.className), ['fh-wx-rain', 'fh-wx-legend', 'fh-wx-line'])
  const [rain] = more.children
  assert.deepEqual(rain.children.map((e) => [e.className, e.textContent]), [['fh-wx-rain-end', 'Light'], ['fh-wx-scale', ''], ['fh-wx-rain-end', 'Heavy']])
  const scale = rain.children[1]
  const gradient = (theme: 'light' | 'dark'): string => `linear-gradient(90deg, ${RAIN_PALETTE[theme].rain.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ')})`
  assert.equal(scale.vars['--scale'], gradient('light')) // the light street map
  menu.setView({ ...CHASE, chasing: false, theme: 'dark' })
  assert.equal(scale.vars['--scale'], gradient('dark'))
  menu.setView({ ...CHASE, chasing: false, theme: 'light' })
  assert.equal(scale.vars['--scale'], gradient('light'))
  assert.equal(RAIN_PALETTE.light.rain.length, 11)
})

test('weather legend: the word Airports, then how the flight rules read, each in its colour', () => {
  const { root } = mount(DEFAULT_WX_PREFS, { chasing: false })
  const legend = all(root).find((e) => e.className === 'fh-wx-legend')!
  assert.deepEqual(legend.children.map((e) => [e.className, e.textContent]), [
    ['fh-wx-legend-title', 'Airports'], ['fh-wx-cat', 'Good'], ['fh-wx-cat', 'Marginal'], ['fh-wx-cat', 'Poor'], ['fh-wx-cat', 'Very poor'],
  ])
  const colors = legend.children.filter((e) => e.className === 'fh-wx-cat').map((e) => e.vars['--c'])
  assert.deepEqual(colors, [CATEGORY_COLOR.VFR, CATEGORY_COLOR.MVFR, CATEGORY_COLOR.IFR, CATEGORY_COLOR.LIFR]) // as the markers' rings
})

test('weather: Open-Meteo\'s credit in the line is a link to its site (its licence asks for one) while the credit is in the line; the rest of the line is text', () => {
  const { part, menu } = mount()
  const wxLine = part('fh-wx-line')
  const links = (): El[] => all(wxLine).filter((e) => e.tag === 'a')
  menu.setWeather('Clouds from 3 airports · 2 hazard areas')
  assert.deepEqual(links(), [], 'no credit, no link')
  assert.equal(text(wxLine), 'Clouds from 3 airports · 2 hazard areas')
  const line = `Clouds from the forecast · 1 hazard area · ${MODEL_CREDIT} · some weather unavailable`
  menu.setWeather(line)
  const [link] = links()
  assert.equal(links().length, 1)
  assert.deepEqual([link.href, link.target, link.rel, link.className, link.textContent], ['https://open-meteo.com/', '_blank', 'noopener noreferrer', 'fh-wx-credit', 'Weather data by Open-Meteo.com'])
  assert.deepEqual(wxLine.children.map((c) => [c.tag, c.textContent]), [['#text', 'Clouds from the forecast · 1 hazard area · '], ['a', 'Weather data by Open-Meteo.com'], ['#text', ' · some weather unavailable']])
  assert.equal(text(wxLine), line, 'it reads as the one line')
  menu.setWeather(line)
  assert.equal(links()[0], link, 'the same line again writes nothing')
  menu.setWeather('Clouds from 3 airports · 2 hazard areas · some weather unavailable') // the grid is gone, and its credit
  assert.deepEqual(links(), [])
  menu.setWeather(null)
  assert.deepEqual(visible(wxLine), [], 'no line: no link on screen')
})

test('weather: EUMETSAT\'s credit in the line is a link to its site, beside Open-Meteo\'s: each credit its own link, the rest of the line text', () => {
  const { part, menu } = mount()
  const wxLine = part('fh-wx-line')
  const links = (): El[] => all(wxLine).filter((e) => e.tag === 'a')
  assert.equal(SAT_CREDIT, '© EUMETSAT')
  const line = `Clouds from 3 airports · cloud positions from Meteosat, 14:45 UTC · 2 hazard areas · ${MODEL_CREDIT} · ${SAT_CREDIT} · some weather unavailable`
  menu.setWeather(line)
  assert.deepEqual(links().map((l) => [l.href, l.target, l.rel, l.className, l.textContent]), [
    ['https://open-meteo.com/', '_blank', 'noopener noreferrer', 'fh-wx-credit', 'Weather data by Open-Meteo.com'],
    ['https://www.eumetsat.int/', '_blank', 'noopener noreferrer', 'fh-wx-credit', '© EUMETSAT'],
  ])
  assert.equal(text(wxLine), line, 'it reads as the one line')
})

// What the credit link and the disabled controls look like is CSS, so checked as text, as the [hidden] rule is.
test('the credit link looks like the rest of the line (its colour, underlined on hover only); a disabled control is dimmed and takes no pointer', () => {
  const layers = readFileSync(new URL('./sceneToggles.css', import.meta.url), 'utf8')
  assert.match(layers, /\.fh-wx-credit \{\s*color: inherit;\s*text-decoration: none;\s*\}/)
  assert.match(layers, /\.fh-wx-credit:hover \{\s*text-decoration: underline;\s*\}/)
  const css = readFileSync(new URL('./wxMenu.css', import.meta.url), 'utf8')
  assert.match(css, /\.fh-wxm-seg\[aria-disabled='true'\],\s*\.fh-wxm-opacity\[aria-disabled='true'\],\s*\.fh-scene-row\[aria-disabled='true'\] \{[^}]*opacity: 0\.4;[^}]*pointer-events: none;[^}]*\}/)
  assert.match(css, /\.fh-seg-b:disabled \{[^}]*cursor: default;[^}]*\}/)
})

test('the third look, Sculpted: its button asks for it, shows pressed, and the others ask for theirs from it', () => {
  const p: WxPrefs = { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true }
  const { menu, button, pressed, changes } = mount(p)
  button('Clouds', 'Sculpted').click()
  assert.deepEqual(changes, [{ ...p, look: 'sculpted' }])
  menu.update({ ...p, look: 'sculpted' })
  assert.deepEqual(pressed('Clouds'), ['Sculpted'])
  button('Clouds', 'Sculpted').click() // pressed already
  button('Clouds', 'Natural').click()
  assert.deepEqual(changes, [{ ...p, look: 'sculpted' }, { ...p, look: 'natural' }])
  assert.deepEqual(mount({ ...p, look: 'sculpted' }).pressed('Clouds'), ['Sculpted'])
})

test('in the Sculpted look the level slice is not drawn: its switch is disabled, keeps its choice, and its hint says "Not in the Sculpted look yet"', () => {
  const p: WxPrefs = { look: 'sculpted', opacity: 0.58, hazard: 'curtain', track: true, slice: true, strip: true }
  const { menu, sw, changes } = mount(p)
  const hint = (): string => sw('Level slice').parent!.children[1].children[1].textContent
  assert.deepEqual([sw('Level slice').disabled, sw('Level slice').parent!.attrs['aria-disabled'], sw('Level slice').attrs['aria-checked'], hint()], [true, 'true', 'true', 'Not in the Sculpted look yet'])
  assert.deepEqual([sw('Track line').disabled, sw('Ahead strip').disabled], [false, false], 'the other aids are in use')
  sw('Level slice').click()
  sw('Level slice').parent!.click({ target: sw('Level slice').parent! })
  assert.deepEqual(changes, [])
  menu.update({ ...p, look: 'severity' }) // another look: in use again, with its own hint
  assert.deepEqual([sw('Level slice').disabled, sw('Level slice').parent!.attrs['aria-disabled'], hint()], [false, 'false', "The weather at the aircraft's own altitude"])
  sw('Level slice').click()
  assert.deepEqual(changes, [{ ...p, look: 'severity', slice: false }])
  menu.update({ ...p, look: 'sculpted' })
  assert.deepEqual([sw('Level slice').disabled, hint()], [true, 'Not in the Sculpted look yet'])
  menu.setView({ ...CHASE, wx: false }) // and with the weather off it is disabled as the rest
  assert.equal(sw('Level slice').disabled, true)
})

test('the clouds\' opacity: a slider from none to solid under the looks, with its value beside it ("Off" at none); a drag asks for it and keeps the rest; update() moves it; out of use with the weather off, top-down and after a drawing error', () => {
  const p: WxPrefs = { look: 'severity', opacity: 0.58, hazard: 'curtain', track: true, slice: false, strip: true }
  const { root, menu, part, changes } = mount(p)
  const row = part('fh-wxm-opacity')
  const [name, slider, amount] = row.children
  assert.deepEqual([text(name), slider.tag, slider.type, slider.attrs['aria-label']], ['Opacity', 'input', 'range', 'Cloud opacity'])
  assert.deepEqual([slider.value, text(amount)], ['58', '58 %'])
  const clouds = root.children[1]
  assert.deepEqual(clouds.children.map((c) => c.className.split(' ')[0]), ['fh-scene-head', 'fh-seg', 'fh-wxm-opacity', 'fh-wx-legend'], 'under the looks, over the legend')
  slider.slide('20')
  assert.deepEqual(changes, [{ ...p, opacity: 0.2 }])
  assert.equal(text(amount), '58 %', 'the app answers with update()')
  menu.update({ ...p, opacity: 0.2 })
  assert.deepEqual([slider.value, text(amount)], ['20', '20 %'])
  slider.slide('0')
  assert.deepEqual(changes.at(-1), { ...p, opacity: 0 }, 'none: the hazard areas alone')
  menu.update({ ...p, opacity: 0 })
  assert.deepEqual([slider.value, text(amount)], ['0', 'Off'])
  menu.update({ ...p, opacity: 1 })
  assert.deepEqual([slider.value, text(amount)], ['100', '100 %'])
  assert.deepEqual([slider.disabled, row.attrs['aria-disabled']], [false, 'false'])
  for (const view of [{ wx: false }, { chasing: false }, { failed: true }]) {
    menu.setView({ ...CHASE, ...view })
    assert.deepEqual([slider.disabled, row.attrs['aria-disabled']], [true, 'true'], JSON.stringify(view))
    slider.slide('50')
  }
  assert.equal(changes.length, 2, 'out of use: it asks nothing')
  menu.setView({ ...CHASE })
  assert.equal(slider.disabled, false)
})

test('nothing in the Clouds row is cut off at the panel\'s edge: three looks, and a row whose words do not fit goes to a second one', () => {
  const css = readFileSync(new URL('./wxMenu.css', import.meta.url), 'utf8')
  assert.match(css, /\.fh-wxm-seg \{\s*flex-wrap: wrap;\s*\}/)
})
