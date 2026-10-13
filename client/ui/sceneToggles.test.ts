// client/ui/sceneToggles.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import type { ScenePrefs } from '../types.ts'

// sceneToggles.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { mountSceneToggles, rainTheme } = await import('./sceneToggles.ts')
const { DEFAULT_PREFS } = await import('./scenePrefs.ts')

// Node has no DOM: just enough of one for mountSceneToggles (and icons.ts), plus recorders for listeners outside it.
class El {
  tag: string
  children: El[] = []
  parent: El | null = null
  className = ''
  #text = ''
  textWrites = 0
  title = ''
  type = ''
  href = ''
  target = ''
  rel = ''
  #hidden = false
  classList = { add: (): void => {} } // icons.ts marks its svg
  vars: Record<string, string> = {}
  styleWrites = 0
  style = {
    setProperty: (k: string, v: string): void => {
      this.styleWrites++
      this.vars[k] = v
    },
  }
  attrs: Record<string, string> = {}
  attrWrites = 0
  disabled = false
  hiddenWrites = 0
  listeners = new Map<string, (() => void)[]>()
  constructor(tag: string) {
    this.tag = tag
  }
  get textContent(): string {
    return this.#text
  }
  set textContent(v: string) {
    this.textWrites++
    this.#clear() // as in the DOM: the text replaces what the element held
    this.#text = v
  }
  get hidden(): boolean {
    return this.#hidden
  }
  set hidden(v: boolean) {
    this.hiddenWrites++
    this.#hidden = v
  }
  append(...cs: El[]): void {
    for (const c of cs) {
      c.parent = this
      this.children.push(c)
    }
  }
  replaceChildren(...cs: (El | string)[]): void {
    this.#clear()
    this.append(...cs.map((c) => (typeof c === 'string' ? Object.assign(new El('#text'), { textContent: c }) : c)))
  }
  #clear(): void {
    this.#text = ''
    for (const c of this.children) c.parent = null
    this.children = []
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
  addEventListener(type: string, f: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), f])
  }
  click(): void {
    for (const f of this.listeners.get('click') ?? []) f()
  }
}
const outside: string[] = [] // listeners added to window or document: keys belong to the app
Object.assign(globalThis, {
  document: {
    createElement: (tag: string) => new El(tag),
    createElementNS: (_ns: string, tag: string) => new El(tag),
    addEventListener: (t: string) => outside.push(`document:${t}`),
  },
  window: { addEventListener: (t: string) => outside.push(`window:${t}`) },
})

const all = (el: El): El[] => [el, ...el.children.flatMap(all)]
const text = (el: El): string => el.textContent + el.children.map(text).join('')
/** What is on screen: the tree without its hidden parts. */
const visible = (el: El): El[] => (el.hidden ? [] : [el, ...el.children.flatMap(visible)])
/** The panel as it shows: section titles, button groups and switches, top to bottom. */
const screen = (root: El): string[] => visible(root).flatMap((e) => {
  if (e.className === 'fh-scene-title') return [e.textContent]
  if (e.attrs.role === 'group' || e.attrs.role === 'switch') return [e.attrs['aria-label']]
  return []
})
const MAP = ['Map', 'Base map']
const SCENE = ['3-D scene', '3-D terrain', 'Sun', '3-D buildings', 'See-through', 'Textures']

function mount(prefs: ScenePrefs) {
  const root = new El('div')
  const changes: ScenePrefs[] = []
  const t = mountSceneToggles(root as unknown as HTMLElement, { prefs, onChange: (next) => changes.push(next) })
  const sw = (label: string): El => all(root).find((e) => e.attrs.role === 'switch' && e.attrs['aria-label'] === label)!
  const [topo, light, glass] = ['3-D terrain', 'Sun', 'See-through'].map(sw)
  const checked = (): [string, string, string] => [topo.attrs['aria-checked'], light.attrs['aria-checked'], glass.attrs['aria-checked']]
  const spinner = all(root).find((e) => e.className === 'fh-spin')!
  const [roads, places] = ['Roads', 'Borders & places'].map(sw)
  const [mapB, satB, lightB, darkB] = all(root).filter((e) => e.className === 'fh-seg-b')
  const theme = all(root).find((e) => e.attrs['aria-label'] === 'Map theme')!
  const view = all(root).find((e) => e.className === 'fh-scene-view')!
  return { root, topo, light, glass, roads, places, mapB, satB, lightB, darkB, theme, view, t, changes, checked, spinner }
}

test('switch rows: Roads (R), Borders & places (P), 3-D terrain (T), Sun (L), 3-D buildings (B), See-through (X), Textures (U), real buttons with a label each; no Weather row (its switch is the Weather panel\'s)', () => {
  const { root, topo, light, glass, roads, places } = mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  const rows = all(root).filter((e) => e.className === 'fh-scene-row')
  assert.deepEqual(rows.map((r) => text(r.children[1])), [
    'RoadsR', 'Borders & placesP', '3-D terrainT', 'SunL', '3-D buildingsB', 'See-throughX', 'TexturesU', // the name and the key: the longer words are the row's tooltip
  ])
  for (const b of [roads, places, topo, light, glass]) {
    assert.equal(b.tag, 'button')
    assert.equal(b.type, 'button') // never a form submit; Enter and Space work as on any button
    assert.equal(b.className, 'fh-switch')
  }
  assert.deepEqual([topo, light, glass].map((b) => b.attrs['aria-label']), ['3-D terrain', 'Sun', 'See-through'])
})

test('only what applies to the view on screen: top-down or chase, on the map or the satellite', () => {
  const cases: [string, boolean, Partial<ScenePrefs>, string[]][] = [
    ['top-down, map', false, { mapTop: true }, [...MAP, 'Map theme']],
    ['top-down, satellite', false, { mapTop: false }, [...MAP, 'Roads', 'Borders & places']],
    ['chase, map', true, { mapChase: true }, [...MAP, 'Map theme', ...SCENE]],
    ['chase, satellite', true, { mapChase: false }, [...MAP, 'Roads', 'Borders & places', ...SCENE]],
  ]
  for (const [name, chasing, base, want] of cases) {
    const { root, t } = mount({ ...DEFAULT_PREFS, ...base })
    t.setChasing(chasing)
    assert.deepEqual(screen(root), want, name)
    assert.ok(all(root).every((e) => e.className !== 'fh-scene-note'), `${name}: no note`) // the 3-D scene shows in the chase only
  }
})

test('the rows follow the base and the view as they change: Satellite, the chase, Map there, and back', () => {
  const { root, satB, t, changes } = mount({ ...DEFAULT_PREFS })
  assert.deepEqual(screen(root), [...MAP, 'Map theme'])
  satB.click()
  assert.deepEqual(screen(root), [...MAP, 'Map theme'], 'not until the app answers')
  t.update(changes.at(-1)!)
  assert.deepEqual(screen(root), [...MAP, 'Roads', 'Borders & places'])
  t.setChasing(true) // the chase keeps its own base: the satellite by default
  assert.deepEqual(screen(root), [...MAP, 'Roads', 'Borders & places', ...SCENE])
  t.update({ ...DEFAULT_PREFS, mapTop: false, mapChase: true })
  assert.deepEqual(screen(root), [...MAP, 'Map theme', ...SCENE])
  t.setChasing(false)
  assert.deepEqual(screen(root), [...MAP, 'Roads', 'Borders & places'])
})

test('Roads and Borders & places: each switch shows and asks for its own pref', () => {
  const { roads, places, t, changes } = mount({ ...DEFAULT_PREFS, mapTop: false })
  assert.deepEqual([roads.attrs['aria-checked'], places.attrs['aria-checked']], ['false', 'true']) // the defaults
  roads.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, mapTop: false, roads: true })
  places.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, mapTop: false, places: false })
  t.update({ ...DEFAULT_PREFS, mapTop: false, roads: true, places: false })
  assert.deepEqual([roads.attrs['aria-checked'], places.attrs['aria-checked']], ['true', 'false'])
  places.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, mapTop: false, roads: true, places: true })
})

// .fh-seg and the rows are flex boxes, whose display beats the hidden attribute's own: the Light | Dark row stayed on the
// satellite until the panel's [hidden] won. CSS, so checked as text.
test('a hidden part of the panel really goes: there, [hidden] wins over the display of its rows and button groups', () => {
  const css = readFileSync(new URL('./sceneToggles.css', import.meta.url), 'utf8')
  assert.match(css, /\.fh-scene\[hidden\],\s*\.fh-scene \[hidden\] \{\s*display: none !important;\s*\}/)
})

test('what hangs under a choice is set in under it, in its box: See-through under 3-D buildings; the theme and the overlays under the base', () => {
  const { root, glass, roads, places, theme } = mount(DEFAULT_PREFS)
  const buildings = all(root).find((e) => e.attrs['aria-label'] === '3-D buildings')!
  const box = buildings.parent!.parent!
  assert.equal(box.className, 'fh-scene-group')
  assert.deepEqual(box.children.map((c) => c.className), ['fh-scene-row', 'fh-scene-sub'])
  assert.equal(glass.parent!.parent, box.children[1])
  const base = all(root).find((e) => e.attrs['aria-label'] === 'Base map')!
  const under = base.parent!.children[base.parent!.children.indexOf(base) + 1]
  assert.equal(under.className, 'fh-scene-sub')
  assert.deepEqual(under.children, [theme, roads.parent, places.parent])
})

test('Textures hangs under 3-D buildings too, and is out of use with them off or with the chase on the street map (the roofs are the satellite picture)', () => {
  const state = (prefs: ScenePrefs): [boolean, string | undefined, string] => {
    const { root, glass } = mount(prefs)
    const sw = all(root).find((e) => e.attrs['aria-label'] === 'Textures')!
    assert.equal(sw.parent!.parent, glass.parent!.parent, 'in the box under 3-D buildings, with See-through')
    return [sw.disabled, sw.parent!.attrs['aria-disabled'], sw.attrs['aria-checked']]
  }
  assert.deepEqual(state(DEFAULT_PREFS), [false, undefined, 'true'])
  assert.deepEqual(state({ ...DEFAULT_PREFS, buildings: false }), [true, 'true', 'true'])
  assert.deepEqual(state({ ...DEFAULT_PREFS, mapChase: true }), [true, 'true', 'true'])
  const { root, changes } = mount(DEFAULT_PREFS)
  all(root).find((e) => e.attrs['aria-label'] === 'Textures')!.click()
  assert.deepEqual(changes, [{ ...DEFAULT_PREFS, textures: false }])
})

test('3-D buildings off: the See-through row keeps its choice but is out of use; on again, it is back', () => {
  const { root, glass, t, changes } = mount({ ...DEFAULT_PREFS, glass: true })
  const row = all(root).find((e) => e.className === 'fh-scene-row' && e.children.includes(glass))!
  const off = (): [boolean, string | undefined] => [glass.disabled, row.attrs['aria-disabled']]
  assert.deepEqual(off(), [false, undefined])
  all(root).find((e) => e.attrs['aria-label'] === '3-D buildings')!.click()
  assert.deepEqual(changes, [{ ...DEFAULT_PREFS, buildings: false, glass: true }])
  t.update(changes[0])
  assert.deepEqual([...off(), glass.attrs['aria-checked']], [true, 'true', 'true'])
  const writes = row.attrWrites
  t.update(changes[0])
  assert.equal(row.attrWrites, writes) // every frame: nothing written without a change
  t.update({ ...DEFAULT_PREFS, glass: true })
  assert.deepEqual(off(), [false, 'false'])
  assert.equal(mount({ ...DEFAULT_PREFS, buildings: false }).glass.disabled, true) // and from the start
})

test('See-through asks for glass toggled and keeps the others', () => {
  const { glass, changes } = mount({ ...DEFAULT_PREFS, topo: false, light: true, glass: false })
  glass.click()
  assert.deepEqual(changes, [{ ...DEFAULT_PREFS, topo: false, light: true, glass: true }])
})

test('aria-checked shows the prefs it was mounted with', () => {
  assert.deepEqual(mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false }).checked(), ['true', 'true', 'false'])
  assert.deepEqual(mount({ ...DEFAULT_PREFS, topo: false, light: true, glass: true }).checked(), ['false', 'true', 'true'])
  assert.deepEqual(mount({ ...DEFAULT_PREFS, topo: true, light: false, glass: false }).checked(), ['true', 'false', 'false'])
})

test('a click asks for the toggled copy and changes nothing itself: the app answers with update()', () => {
  const prefs = { ...DEFAULT_PREFS, topo: true, light: true, glass: false }
  const { topo, light, changes, checked } = mount(prefs)
  topo.click()
  assert.deepEqual(changes, [{ ...DEFAULT_PREFS, topo: false, light: true, glass: false }])
  assert.notEqual(changes[0], prefs)
  assert.deepEqual(prefs, { ...DEFAULT_PREFS, topo: true, light: true, glass: false }) // the caller's object is not touched
  assert.deepEqual(checked(), ['true', 'true', 'false']) // not until update()
  light.click()
  assert.deepEqual(changes[1], { ...DEFAULT_PREFS, topo: true, light: false, glass: false }) // still from the mounted prefs
})

test('update() only re-renders: no onChange, and the next click toggles from the new prefs', () => {
  const { topo, light, t, changes, checked } = mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  t.update({ ...DEFAULT_PREFS, topo: false, light: true, glass: false })
  assert.deepEqual(checked(), ['false', 'true', 'false'])
  assert.equal(changes.length, 0)
  topo.click()
  assert.deepEqual(changes, [{ ...DEFAULT_PREFS, topo: true, light: true, glass: false }])
  const p = { ...DEFAULT_PREFS, topo: false, light: false, glass: false }
  t.update(p)
  assert.deepEqual(checked(), ['false', 'false', 'false'])
  p.topo = true // a caller reusing its object later does not change what the panel holds
  light.click()
  assert.deepEqual(changes[1], { ...DEFAULT_PREFS, topo: false, light: true, glass: false })
})

test('update() and setChasing() with nothing changed write nothing (both run every frame)', () => {
  const { root, light, t } = mount({ ...DEFAULT_PREFS, topo: true, light: false, glass: false })
  const writes = (): number => all(root).reduce((n, e) => n + e.attrWrites + e.hiddenWrites + e.styleWrites + e.textWrites, 0)
  const before = writes()
  for (let i = 0; i < 100; i++) {
    t.update({ ...DEFAULT_PREFS, topo: true, light: false, glass: false })
    t.setChasing(false)
  }
  assert.equal(writes(), before)
  t.update({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  assert.equal(writes(), before + 1) // only the switch that changed
  assert.equal(light.attrs['aria-checked'], 'true')
  t.setChasing(true)
  const chased = writes()
  for (let i = 0; i < 100; i++) t.setChasing(true)
  assert.equal(writes(), chased)
})

test('setBusy shows the spinner on the terrain row', () => {
  const { t, spinner } = mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  assert.equal(spinner.hidden, true)
  t.setBusy(true)
  assert.equal(spinner.hidden, false)
  t.setBusy(false)
  assert.equal(spinner.hidden, true)
})

test('keys and storage belong to the app: no listeners outside the panel', () => {
  outside.length = 0
  const { topo, t } = mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  topo.click()
  t.update({ ...DEFAULT_PREFS, topo: false, light: true, glass: false })
  assert.deepEqual(outside, [])
})

test('destroy removes both sections; twice is harmless', () => {
  const { root, t } = mount({ ...DEFAULT_PREFS, topo: true, light: true, glass: false })
  t.destroy()
  assert.equal(root.children.length, 0)
  t.destroy()
  assert.equal(root.children.length, 0)
})

test('the base picker sets the pref of the view on screen: mapTop top-down, mapChase in the chase', () => {
  const { mapB, satB, view, t, changes } = mount({ ...DEFAULT_PREFS })
  assert.deepEqual([mapB.attrs['aria-pressed'], satB.attrs['aria-pressed'], view.textContent], ['true', 'false', 'Top-down view'])
  mapB.click() // already the map: nothing to ask
  assert.equal(changes.length, 0)
  satB.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, mapTop: false })
  t.setChasing(true) // the chase has the satellite by default
  assert.deepEqual([mapB.attrs['aria-pressed'], satB.attrs['aria-pressed'], view.textContent], ['false', 'true', 'Chase view'])
  mapB.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, mapChase: true })
  t.update({ ...DEFAULT_PREFS, mapChase: true })
  assert.equal(mapB.attrs['aria-pressed'], 'true')
})

test('the map theme, Light or Dark, shows under Map only and sets dark for both views', () => {
  const { lightB, darkB, theme, satB, t, changes } = mount({ ...DEFAULT_PREFS })
  assert.deepEqual([theme.hidden, lightB.attrs['aria-pressed'], darkB.attrs['aria-pressed']], [false, 'true', 'false'])
  lightB.click() // already light
  assert.equal(changes.length, 0)
  darkB.click()
  assert.deepEqual(changes.at(-1), { ...DEFAULT_PREFS, dark: true })
  t.update({ ...DEFAULT_PREFS, dark: true })
  assert.deepEqual([lightB.attrs['aria-pressed'], darkB.attrs['aria-pressed']], ['false', 'true'])
  satB.click()
  t.update({ ...DEFAULT_PREFS, dark: true, mapTop: false })
  assert.equal(theme.hidden, true) // the satellite has no theme
  t.setChasing(true)
  t.update({ ...DEFAULT_PREFS, dark: true, mapTop: false, mapChase: true })
  assert.equal(theme.hidden, false)
})

test('the Layers panel has no Weather row and none of what hung under it: the switch, the rain scale, the airports legend and the status line are the Weather panel\'s', () => {
  const { root, t } = mount({ ...DEFAULT_PREFS, wx: true })
  for (const chasing of [false, true]) {
    t.setChasing(chasing)
    assert.ok(!screen(root).includes('Weather'), 'no Weather switch')
    assert.deepEqual(all(root).filter((e) => e.attrs['aria-label'] === 'Weather' || e.className.startsWith('fh-wx-')), [], 'no weather part in the tree')
    assert.ok(!text(root).includes('Weather'))
  }
  assert.equal('setWeather' in t, false)
})

test('rainTheme: the top-down map\'s base decides (the radar is drawn there only): light over the light street map, else dark', () => {
  assert.equal(rainTheme(DEFAULT_PREFS), 'light')
  assert.equal(rainTheme({ ...DEFAULT_PREFS, dark: true }), 'dark')
  assert.equal(rainTheme({ ...DEFAULT_PREFS, mapTop: false }), 'dark')
  assert.equal(rainTheme({ ...DEFAULT_PREFS, mapChase: true }), 'light') // the chase's base changes nothing
  assert.equal(rainTheme({ ...DEFAULT_PREFS, mapTop: false, mapChase: true }), 'dark')
})
