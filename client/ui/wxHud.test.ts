// client/ui/wxHud.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { PROFILE_COLS, PROFILE_ROWS, PROFILE_TOP_M, aheadPath, type AheadProfile, type AheadStatus } from '../scene/wxAhead.ts'
import { DEFAULT_UNITS, type Units } from './units.ts'

// wxHud.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { drawStrip, mountWxHud, stripCells, stripPlot } = await import('./wxHud.ts')

// Node has no DOM: just enough of one for mountWxHud, with counters for what is written.
interface Call { op: string; a: unknown[]; fill: string; stroke: string; alpha: number; dash: number[]; align: string; smooth: boolean }
class Ctx {
  calls: Call[] = []
  fillStyle = '#000'
  strokeStyle = '#000'
  lineWidth = 1
  font = ''
  textAlign = 'start'
  textBaseline = 'alphabetic'
  globalAlpha = 1
  imageSmoothingEnabled = true
  #dash: number[] = []
  transform: number[] = []
  #note(op: string, a: unknown[]): void {
    this.calls.push({ op, a, fill: this.fillStyle, stroke: this.strokeStyle, alpha: this.globalAlpha, dash: this.#dash, align: this.textAlign, smooth: this.imageSmoothingEnabled })
  }
  clearRect(...a: number[]): void { this.#note('clearRect', a) }
  fillRect(...a: number[]): void { this.#note('fillRect', a) }
  strokeRect(...a: number[]): void { this.#note('strokeRect', a) }
  beginPath(): void { this.#note('beginPath', []) }
  moveTo(...a: number[]): void { this.#note('moveTo', a) }
  lineTo(...a: number[]): void { this.#note('lineTo', a) }
  stroke(): void { this.#note('stroke', []) }
  fill(): void { this.#note('fill', []) }
  fillText(...a: unknown[]): void { touched.push('read'); this.#note('fillText', a) } // (in a browser a canvas's text asks for the page's styles: a read)
  drawImage(...a: unknown[]): void { this.#note('drawImage', a) }
  createImageData(width: number, height: number): { data: Uint8ClampedArray; width: number; height: number } { return { data: new Uint8ClampedArray(width * height * 4), width, height } }
  putImageData(...a: unknown[]): void { this.#note('putImageData', a) }
  setLineDash(d: number[]): void { this.#dash = d }
  setTransform(...a: number[]): void { this.transform = a }
  texts(): string[] { return this.calls.filter((c) => c.op === 'fillText').map((c) => String(c.a[0])) }
  rects(color: string): Call[] { return this.calls.filter((c) => c.op === 'fillRect' && c.fill === color) }
}

/** What the HUD did to the page, in order: 'read' (it asked how something is laid out), 'write' (it changed what is laid out). */
const touched: string[] = []

class El {
  tag: string
  children: El[] = []
  parent: El | null = null
  className = ''
  #text = ''
  textWrites = 0
  hiddenWrites = 0
  #hidden = false
  attrs: Record<string, string> = {}
  vars: Record<string, string> = {}
  setProps = 0
  removed: string[] = []
  #offsetHeight = 0
  #clientWidth = 0
  width = 300
  height = 150
  ctx = new Ctx()
  style = {
    setProperty: (k: string, v: string): void => { this.setProps++; this.vars[k] = v },
    removeProperty: (k: string): void => { this.removed.push(k); delete this.vars[k] },
  }
  constructor(tag: string) {
    this.tag = tag
  }
  get textContent(): string { return this.#text }
  set textContent(v: string) { this.textWrites++; touched.push('write'); this.#text = v }
  get hidden(): boolean { return this.#hidden }
  set hidden(v: boolean) { this.hiddenWrites++; touched.push('write'); this.#hidden = v }
  get offsetHeight(): number { touched.push('read'); return this.#offsetHeight }
  set offsetHeight(v: number) { this.#offsetHeight = v }
  get clientWidth(): number { touched.push('read'); return this.#clientWidth }
  set clientWidth(v: number) { this.#clientWidth = v }
  append(...cs: El[]): void { for (const c of cs) { c.parent = this; this.children.push(c) } }
  remove(): void {
    if (!this.parent) return
    this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }
  setAttribute(k: string, v: string): void { this.attrs[k] = v }
  getContext(): Ctx { return this.ctx }
}
Object.assign(globalThis, { document: { createElement: (tag: string) => new El(tag) } })

const all = (el: El): El[] => [el, ...el.children.flatMap(all)]
const byClass = (root: El, cls: string): El => all(root).find((e) => e.className.split(' ').includes(cls))!

function mount() {
  const root = new El('div')
  const hud = mountWxHud(root as unknown as HTMLElement)
  const [veil, box] = root.children
  const cloud = byClass(box, 'fh-wxhud-chip')
  const hazard = byClass(box, 'fh-wxhud-hazard')
  return {
    root, hud, veil, box, cloud, hazard, strip: byClass(box, 'fh-wxhud-strip'), canvas: byClass(box, 'fh-wxhud-cv'),
    cloudText: byClass(cloud, 'fh-wxhud-text'), hazardText: byClass(hazard, 'fh-wxhud-text'), dot: byClass(cloud, 'fh-wxhud-dot'),
  }
}
type Mounted = ReturnType<typeof mount>

const RED = '#ff5a5a' // a thunderstorm area's colour (wxText.ts sigmetColor)
const status = (cloud: Partial<AheadStatus['cloud']> = {}, hazard: (Omit<NonNullable<AheadStatus['hazard']>, 'color'> & { color?: string }) | null = null, known = true): AheadStatus =>
  ({ known, cloud: { inside: false, sev: 0, inMin: null, ...cloud }, hazard: hazard === null ? null : { color: RED, ...hazard } })
const PATH = aheadPath({ lat: 32, lon: 34.9, altM: 3000 }, 0, 360, 0)!
/** A profile with weather in the cells given: [column, row, cover, severity]. */
function profile(cells: [number, number, number, number][] = [], hazards: AheadProfile['hazards'] = []): AheadProfile {
  const [cover, sev] = [new Float32Array(PROFILE_COLS * PROFILE_ROWS), new Float32Array(PROFILE_COLS * PROFILE_ROWS)]
  for (const [i, j, c, s] of cells) { cover[j * PROFILE_COLS + i] = c; sev[j * PROFILE_COLS + i] = s }
  return { cols: PROFILE_COLS, rows: PROFILE_ROWS, kmAhead: 80, topM: PROFILE_TOP_M, cover, sev, hazards }
}
/** What is on screen: a part inside the hidden HUD is not. */
const visible = (m: Mounted): { box: boolean; veil: boolean; hazard: boolean; strip: boolean } =>
  ({ box: !m.box.hidden, veil: !m.veil.hidden, hazard: !m.box.hidden && !m.hazard.hidden, strip: !m.box.hidden && !m.strip.hidden })

test('mounted: a frame (the veil) and the HUD in the root, both hidden; the status line a live region; nothing published until there is something', () => {
  const m = mount()
  assert.deepEqual(m.root.children, [m.veil, m.box])
  assert.equal(m.veil.className, 'fh-wxhud-veil')
  assert.equal(m.veil.attrs['aria-hidden'], 'true')
  assert.equal(m.box.className, 'fh-wxhud')
  assert.deepEqual(visible(m), { box: false, veil: false, hazard: false, strip: false })
  assert.equal(byClass(m.box, 'fh-wxhud-lines').attrs.role, 'status')
  assert.equal(m.canvas.attrs.role, 'img')
  assert.deepEqual(m.root.vars, {})
  m.hud.set(null, null, null, DEFAULT_UNITS)
  assert.deepEqual(visible(m), { box: false, veil: false, hazard: false, strip: false })
})

test('the status line: where the aircraft is, in the words and the dot of its severity; clear air is green', () => {
  const m = mount()
  m.hud.set(status({ inside: true, sev: 1, inMin: 0 }), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textContent, 'In light rain')
  assert.equal(m.dot.vars['--c'], '#58a6ff')
  assert.deepEqual(visible(m), { box: true, veil: false, hazard: false, strip: false })
  m.hud.set(status({ sev: 3, inMin: 3.1 }), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textContent, 'Clear air · a thunderstorm in 3 min')
  assert.equal(m.dot.vars['--c'], '#ff4d3d')
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textContent, 'Clear air ahead')
  assert.equal(m.dot.vars['--c'], 'var(--fh-ok)')
  m.hud.set(status({ inside: true, sev: 0, inMin: 0 }), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textContent, 'In cloud')
  assert.equal(m.dot.vars['--c'], '#f2f5f8')
})

test('the status line while the sky is not known (no weather source has answered): "No weather data" with a grey dot, never the green "Clear air ahead"', () => {
  const m = mount()
  m.hud.set(status({}, null, false), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textContent, 'No weather data')
  assert.equal(m.dot.vars['--c'], 'var(--fh-muted)')
  assert.deepEqual(visible(m), { box: true, veil: false, hazard: false, strip: false })
  m.hud.set(status({}, { inside: true, inMin: 0, text: 'icing' }, false), null, null, DEFAULT_UNITS)
  assert.deepEqual(visible(m), { box: true, veil: true, hazard: true, strip: false }, 'a hazard area is known from its own list: its chip and the frame show')
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.deepEqual([m.cloudText.textContent, m.dot.vars['--c']], ['Clear air ahead', 'var(--fh-ok)'], 'once a source has answered')
})

test('a hazard area: its chip under the status line, edged in the area\'s own colour, and the red frame round the view only while the aircraft is inside it', () => {
  const m = mount()
  m.hud.set(status({}, { inside: true, inMin: 0, text: 'embedded thunderstorms, up to 35,000 ft' }), null, null, DEFAULT_UNITS)
  assert.equal(m.hazardText.textContent, 'Inside hazard area · embedded thunderstorms, up to 35,000 ft')
  assert.equal(m.hazard.vars['--hz'], RED)
  assert.deepEqual(visible(m), { box: true, veil: true, hazard: true, strip: false })
  const writes = m.hazard.setProps
  m.hud.set(status({}, { inside: true, inMin: 0, text: 'embedded thunderstorms, up to 35,000 ft' }), null, null, DEFAULT_UNITS)
  assert.equal(m.hazard.setProps, writes, 'the same colour is not written again')
  m.hud.set(status({}, { inside: false, inMin: 2.2, text: 'icing, 8,000 to 20,000 ft', color: '#5ac8fa' }), null, null, DEFAULT_UNITS)
  assert.equal(m.hazardText.textContent, 'Hazard area in 2 min · icing, 8,000 to 20,000 ft')
  assert.equal(m.hazard.vars['--hz'], '#5ac8fa', 'icing is not a thunderstorm\'s red')
  assert.deepEqual(visible(m), { box: true, veil: false, hazard: true, strip: false }, 'ahead of it: no frame')
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.deepEqual(visible(m), { box: true, veil: false, hazard: false, strip: false }, 'none on the path')
  m.hud.set(status({}, { inside: true, inMin: 0, text: 'x' }), null, null, DEFAULT_UNITS)
  m.hud.set(null, null, null, DEFAULT_UNITS)
  assert.deepEqual(visible(m), { box: false, veil: false, hazard: false, strip: false }, 'no status: the whole HUD and the frame go')
})

test('the ahead strip: shown with a profile and a path while it is on; Ahead strip off, or no profile, hides it; turning it on draws from what was last given', () => {
  const m = mount()
  const s = status({ sev: 2, inMin: 4 })
  m.hud.set(s, profile(), PATH, DEFAULT_UNITS)
  assert.equal(m.strip.hidden, false)
  assert.ok(m.canvas.ctx.calls.length > 0 && m.canvas.ctx.calls[0].op === 'clearRect', 'drawn')
  m.hud.setStrip(false)
  assert.equal(m.strip.hidden, true)
  const drawn = m.canvas.ctx.calls.length
  m.hud.set(s, profile(), PATH, DEFAULT_UNITS)
  assert.equal(m.strip.hidden, true)
  assert.equal(m.canvas.ctx.calls.length, drawn, 'off: nothing is drawn')
  m.hud.setStrip(true)
  assert.equal(m.strip.hidden, false)
  assert.ok(m.canvas.ctx.calls.length > drawn, 'drawn at once from the last set')
  m.hud.set(s, null, PATH, DEFAULT_UNITS)
  assert.equal(m.strip.hidden, true, 'no profile (the app skips it while the strip is off)')
  m.hud.set(s, profile(), null, DEFAULT_UNITS)
  assert.equal(m.strip.hidden, true, 'no path')
  assert.equal(m.box.hidden, false, 'the status line is still up')
})

test('the strip is drawn at the width it is laid out at, as sharp as the screen (up to 2×), its height the same shape', () => {
  const m = mount()
  m.canvas.clientWidth = 360
  m.hud.set(status(), profile(), PATH, DEFAULT_UNITS)
  assert.deepEqual([m.canvas.width, m.canvas.height], [400, 112], 'shown at this look: drawn at the usual width until the page has laid it out')
  m.hud.set(status(), profile(), PATH, DEFAULT_UNITS)
  assert.deepEqual([m.canvas.width, m.canvas.height], [360, Math.round(360 * 0.28)], 'at the next look, at its own')
  assert.deepEqual(m.canvas.ctx.transform, [1, 0, 0, 1, 0, 0])
  ;(globalThis as { devicePixelRatio?: number }).devicePixelRatio = 3
  try {
    m.hud.set(status(), profile(), PATH, DEFAULT_UNITS)
    assert.deepEqual([m.canvas.width, m.canvas.height], [720, Math.round(360 * 0.28) * 2], 'at most 2×')
    assert.deepEqual(m.canvas.ctx.transform, [2, 0, 0, 2, 0, 0])
  } finally {
    delete (globalThis as { devicePixelRatio?: number }).devicePixelRatio
  }
  const n = mount()
  n.hud.set(status(), profile(), PATH, DEFAULT_UNITS) // not laid out (no width): 400
  assert.deepEqual([n.canvas.width, n.canvas.height], [400, 112])
})

test('the strip\'s cells go to its canvas as one picture, a pixel a cell, stretched over the plot (as rectangles, one a cell, they took 2.5 to 7 ms of a frame)', () => {
  const m = mount()
  m.canvas.clientWidth = 400
  m.hud.set(status(), profile([[20, 10, 0.9, 2]]), PATH, DEFAULT_UNITS)
  const laid = m.canvas.ctx.calls.filter((c) => c.op === 'drawImage')
  assert.equal(laid.length, 1)
  const cells = laid[0].a[0] as El
  assert.deepEqual([cells.tag, cells.width, cells.height, cells.parent], ['canvas', PROFILE_COLS, PROFILE_ROWS, null], 'a canvas of its own, not in the page')
  const put = cells.ctx.calls.filter((c) => c.op === 'putImageData')
  assert.equal(put.length, 1)
  const image = put[0].a[0] as { data: Uint8ClampedArray }
  assert.deepEqual([...image.data.subarray(((PROFILE_ROWS - 11) * PROFILE_COLS + 20) * 4).subarray(0, 4)], [0xff, 0xbe, 0x3d, 255], 'the cell, heavy rain\'s colour')
  assert.equal(m.canvas.ctx.calls.filter((c) => c.op === 'fillRect').length, 1, 'no rectangle but the plot\'s ground')
  m.hud.set(status(), profile([[21, 10, 0.9, 1]]), PATH, DEFAULT_UNITS)
  const again = cells.ctx.calls.filter((c) => c.op === 'putImageData')
  assert.equal(again.length, 2)
  assert.equal(again[1].a[0], image, 'the same picture, filled again')
  assert.deepEqual([...image.data.subarray(((PROFILE_ROWS - 11) * PROFILE_COLS + 20) * 4).subarray(0, 8)], [0, 0, 0, 0, 0x58, 0xa6, 0xff, 255])
})

test('the strip is painted again only when it would show something else: another profile, other units, another size, or a way ahead that has moved a pixel; the same again is not painted (the app looks four times a second, and a profile lasts a second or more)', () => {
  const m = mount()
  m.canvas.clientWidth = 400
  const p = profile([[20, 10, 0.9, 2]])
  const painted = (): number => m.canvas.ctx.calls.filter((c) => c.op === 'clearRect').length
  m.hud.set(status(), p, PATH, DEFAULT_UNITS)
  assert.equal(painted(), 1)
  m.hud.set(status({ sev: 2, inMin: 3 }), p, PATH, DEFAULT_UNITS)
  m.hud.set(status(), p, aheadPath({ lat: 32.0005, lon: 34.9, altM: 3010 }, 0, 360.5, 0)!, DEFAULT_UNITS)
  assert.equal(painted(), 1, 'the same profile; the aircraft 10 m higher and half a knot faster: not a pixel')
  m.hud.set(status(), p, aheadPath({ lat: 32, lon: 34.9, altM: 3400 }, 0, 360, 0)!, DEFAULT_UNITS)
  assert.equal(painted(), 2, '400 m higher: its line is 3 pixels up')
  m.hud.set(status(), p, aheadPath({ lat: 32, lon: 34.9, altM: 3400 }, 0, 360, -1500)!, DEFAULT_UNITS)
  assert.equal(painted(), 3, 'descending: the line\'s far end is lower')
  m.hud.set(status(), p, aheadPath({ lat: 32, lon: 34.9, altM: 3400 }, 0, 300, -1500 * (300 / 360))!, DEFAULT_UNITS)
  assert.equal(painted(), 4, 'slower: the minutes stand closer')
  m.hud.set(status(), { ...p }, aheadPath({ lat: 32, lon: 34.9, altM: 3400 }, 0, 300, -1500 * (300 / 360))!, DEFAULT_UNITS)
  assert.equal(painted(), 5, 'another profile (wxAhead.ts keepProfile gives a new object when it has made it again)')
  const last = { ...p }
  m.hud.set(status(), last, PATH, DEFAULT_UNITS)
  m.hud.set(status(), last, PATH, { ...DEFAULT_UNITS, alt: 'm' })
  assert.equal(painted(), 7, 'other units: other labels')
  m.canvas.clientWidth = 320
  m.hud.set(status(), last, PATH, { ...DEFAULT_UNITS, alt: 'm' })
  assert.equal(painted(), 8, 'another width')
  m.hud.setStrip(false)
  m.hud.setStrip(true)
  assert.equal(painted(), 8, 'hidden and shown with nothing new: the canvas has kept its picture')
})

test('at a look, what is laid out is read before anything is written: a read after a write makes the browser lay the whole page out on the spot (5 to 20 ms in a flight, when a chip\'s words changed), so the HUD\'s height and the strip\'s width are those of the look before', () => {
  const m = mount()
  m.box.offsetHeight = 40
  m.canvas.clientWidth = 360
  const looks: [AheadStatus, AheadProfile | null][] = [
    [status(), profile()], [status({ sev: 2, inMin: 3 }), profile()], [status({ sev: 2, inMin: 2 }, { inside: false, inMin: 4, text: 'icing' }), profile([[3, 3, 0.9, 1]])],
    [status({ inside: true, sev: 1, inMin: 0 }, { inside: true, inMin: 0, text: 'icing' }), null], [status(), profile()],
  ]
  for (const [s, p] of looks) {
    touched.length = 0
    m.hud.set(s, p, PATH, DEFAULT_UNITS)
    const firstWrite = touched.indexOf('write')
    assert.ok(firstWrite < 0 || !touched.slice(firstWrite).includes('read'), `no read after a write: ${touched.join(' ')}`)
  }
  assert.ok(touched.length > 0)
  for (const on of [false, true]) {
    touched.length = 0
    m.hud.setStrip(on)
    assert.ok(touched.includes('write') && !touched.slice(touched.indexOf('write')).includes('read'), `nor when the strip is switched: ${touched.join(' ')}`)
  }
})

test('the strip\'s labels are in the page\'s font, asked for with what is laid out, before anything is written, and not at a paint: asked after a write, the browser works the whole page\'s styles out on the spot (3 to 5 ms of a flight\'s frame)', () => {
  const g = globalThis as { getComputedStyle?: unknown }
  g.getComputedStyle = (): { fontFamily: string; display: string } => {
    touched.push('read')
    return { fontFamily: 'Inter, sans-serif', display: 'block' }
  }
  try {
    const m = mount()
    m.canvas.clientWidth = 360
    for (const [k, s] of [status(), status({ sev: 2, inMin: 3 }), status({ sev: 2, inMin: 2 })].entries()) {
      touched.length = 0
      m.hud.set(s, profile([[k, 3, 0.9, 1]]), PATH, DEFAULT_UNITS) // other words and another profile at each look: written, and painted
      const firstWrite = touched.indexOf('write')
      assert.ok(firstWrite < 0 || !touched.slice(firstWrite).includes('read'), `look ${k}: no read after a write: ${touched.join(' ')}`)
      assert.equal(m.canvas.ctx.font, '500 11px Inter, sans-serif', `look ${k}`)
    }
    assert.equal(m.canvas.ctx.calls.filter((c) => c.op === 'clearRect').length, 3, 'painted at each')
  } finally {
    delete g.getComputedStyle
  }
})

test('in a browser the HUD is told when a part of it changes size, or the window does, and reads what is laid out only then: a look that changes nothing reads nothing (a read makes the browser lay out whatever the rest of the page has changed in that frame)', () => {
  const watchers: { told: () => void; watched: unknown[]; off: boolean }[] = []
  const g = globalThis as { ResizeObserver?: unknown }
  g.ResizeObserver = class {
    readonly #w: { told: () => void; watched: unknown[]; off: boolean }
    constructor(told: () => void) { watchers.push((this.#w = { told, watched: [], off: false })) }
    observe(el: unknown): void { this.#w.watched.push(el) }
    disconnect(): void { this.#w.off = true }
  }
  try {
    const m = mount()
    assert.deepEqual(watchers[0].watched, [m.box, m.cloud, m.hazard, m.strip], 'the HUD, its two chips and the strip')
    m.box.offsetHeight = 40
    m.canvas.clientWidth = 360
    const p = profile() // (the same profile at every look: the strip is painted once)
    m.hud.set(status(), p, PATH, DEFAULT_UNITS)
    assert.equal(m.hud.moved(), true, 'at first it may stand anywhere')
    assert.equal(m.hud.moved(), false, 'asked again: nothing new')
    watchers[0].told() // the page has laid it out: its parts have their sizes
    touched.length = 0
    m.hud.set(status(), p, PATH, DEFAULT_UNITS)
    assert.ok(touched.includes('read'), 'read at the next look')
    assert.equal(m.root.vars['--fh-wxhud-h'], '40px')
    assert.equal(m.canvas.width, 360)
    assert.equal(m.hud.moved(), true)
    for (let k = 0; k < 3; k++) {
      touched.length = 0
      m.hud.set(status(), p, PATH, DEFAULT_UNITS)
      assert.deepEqual(touched, [], 'the same again: nothing read, nothing written')
      assert.equal(m.hud.moved(), false)
    }
    m.hud.set(status({ sev: 2, inMin: 3 }), p, PATH, DEFAULT_UNITS) // other words: the chip is wider
    assert.ok(touched.includes('write') && !touched.includes('read'), 'not read at the look that writes')
    watchers[0].told()
    touched.length = 0
    m.box.offsetHeight = 44
    m.hud.set(status({ sev: 2, inMin: 3 }), p, PATH, DEFAULT_UNITS)
    assert.deepEqual(touched.includes('read') && m.root.vars['--fh-wxhud-h'], '44px')
    m.hud.destroy()
    assert.equal(watchers[0].off, true)
  } finally {
    delete g.ResizeObserver
  }
  assert.equal(mount().hud.moved(), true, 'where nothing tells it (no ResizeObserver), it may have moved at any look')
  const n = mount()
  n.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.equal(n.hud.moved(), true)
  assert.equal(n.hud.moved(), true)
})

test('what has not changed is not written again: the line says the same thing most of the time', () => {
  const m = mount()
  const s = status({ sev: 1, inMin: 5 }, { inside: false, inMin: 3, text: 'icing' })
  m.hud.set(s, null, null, DEFAULT_UNITS)
  const [a, b, c, d] = [m.cloudText.textWrites, m.hazardText.textWrites, m.dot.setProps, m.box.hiddenWrites + m.hazard.hiddenWrites + m.veil.hiddenWrites]
  m.hud.set(status({ sev: 1, inMin: 5.2 }, { inside: false, inMin: 3.3, text: 'icing' }), null, null, DEFAULT_UNITS) // the same words
  assert.deepEqual([m.cloudText.textWrites, m.hazardText.textWrites, m.box.hiddenWrites + m.hazard.hiddenWrites + m.veil.hiddenWrites], [a, b, d])
  assert.equal(m.dot.setProps, c, 'nor the dot\'s colour')
  m.hud.set(status({ sev: 1, inMin: 6.2 }, { inside: false, inMin: 3.3, text: 'icing' }), null, null, DEFAULT_UNITS)
  assert.equal(m.cloudText.textWrites, a + 1, 'a new minute is new words')
  assert.equal(m.hazardText.textWrites, b)
})

test('its height is published as --fh-wxhud-h on the root for the toasts to stand under it: when it changes, and gone with the HUD', () => {
  const m = mount()
  m.box.offsetHeight = 41.2
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.deepEqual(m.root.vars, {}, 'shown at this look: its height is read at the next (the page lays it out between)')
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.equal(m.root.vars['--fh-wxhud-h'], '42px')
  const writes = m.root.setProps
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.equal(m.root.setProps, writes, 'the same height is not written again')
  m.box.offsetHeight = 172
  m.hud.set(status(), profile(), PATH, DEFAULT_UNITS)
  assert.equal(m.root.vars['--fh-wxhud-h'], '172px')
  m.hud.set(null, null, null, DEFAULT_UNITS)
  assert.deepEqual(m.root.vars, {}, 'hidden: none, at once')
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  m.hud.set(status(), null, null, DEFAULT_UNITS)
  assert.equal(m.root.vars['--fh-wxhud-h'], '172px')
  m.hud.destroy()
  assert.deepEqual(m.root.vars, {})
  assert.deepEqual(m.root.children, [], 'the frame and the HUD are gone')
})

test('the stylesheet: a hidden part really goes (its chips and veil are flex and absolute boxes), the toasts stand under the HUD, and the frame is inset', () => {
  const css = readFileSync(new URL('./wxHud.css', import.meta.url), 'utf8')
  assert.match(css, /\.fh-wxhud\[hidden\],\s*\.fh-wxhud \[hidden\],\s*\.fh-wxhud-veil\[hidden\] \{\s*display: none !important;\s*\}/)
  assert.match(css, /\.fh-wxhud-veil \{[^}]*inset: 0;[^}]*pointer-events: none;[^}]*box-shadow: inset 0 0 0 2px #ff5a5a, inset 0 0 46px/)
  assert.match(css, /\.fh-ui:has\(> \.fh-wxhud:not\(\[hidden\]\)\) \.fh-toasts \{\s*top: calc\(var\(--fh-top\) \+ 54px \+ var\(--fh-wxhud-h, 0px\)/)
  assert.match(css, /\.fh-wxhud \{[^}]*pointer-events: none;/)
  assert.match(css, /\.fh-wxhud-text \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/, 'a chip is one line, cut with an ellipsis when it must be')
  assert.match(css, /\.fh-wxhud-hazard \{[^}]*border-color: color-mix\(in srgb, var\(--hz[^}]*\}/, 'the hazard chip\'s edge is the area\'s colour')
  assert.match(css, /@media \(max-height: 480px\) \{\s*\.fh-wxhud-strip \{\s*display: none !important;/, 'a short window has no room for the strip')
})

// ---- the strip's drawing ---------------------------------------------------------------------------------------------------

const [W, H] = [400, 112]
const draw = (p: AheadProfile, units: Units = DEFAULT_UNITS, path = PATH): Ctx => {
  const ctx = new Ctx()
  drawStrip(ctx as unknown as CanvasRenderingContext2D, W, H, p, path, units)
  return ctx
}

test('drawStrip: the heights in the frame\'s units, at the same gridlines: feet, metres, or feet with metres to the right', () => {
  assert.deepEqual(draw(profile()).texts().filter((t) => /ft|m$/.test(t) && !/min/.test(t)), ['10,000 ft', '20,000 ft', '30,000 ft', '40,000 ft'])
  assert.deepEqual(draw(profile(), { ...DEFAULT_UNITS, alt: 'm' }).texts().filter((t) => !/min/.test(t)), ['3,000 m', '6,000 m', '9,000 m', '12,000 m'])
  const both = draw(profile(), { ...DEFAULT_UNITS, alt: 'ft+m' })
  assert.deepEqual(both.texts().filter((t) => !/min/.test(t)), ['10,000 ft', '3,050 m', '20,000 ft', '6,100 m', '30,000 ft', '9,150 m', '40,000 ft', '12,200 m'])
  const left = both.calls.filter((c) => c.op === 'fillText' && /ft$/.test(String(c.a[0]))).map((c) => c.a[1] as number)
  const right = both.calls.filter((c) => c.op === 'fillText' && /m$/.test(String(c.a[0])) && !/min/.test(String(c.a[0]))).map((c) => c.a[1] as number)
  const p = stripPlot(W, H, { ...DEFAULT_UNITS, alt: 'ft+m' })
  assert.ok(left.every((x) => x < p.x0) && right.every((x) => x > p.x1), 'ft left of the plot, m right of it')
  assert.ok(p.x1 < stripPlot(W, H, DEFAULT_UNITS).x1, 'the plot gives the metres their room')
})

test('drawStrip: a gridline stands at its height: 30,000 ft at 9,144 of 12,500 m up the plot', () => {
  const ctx = draw(profile())
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const text = ctx.calls.find((c) => c.op === 'fillText' && c.a[0] === '30,000 ft')!
  assert.ok(Math.abs((text.a[2] as number) - (p.y1 - (9144 / PROFILE_TOP_M) * (p.y1 - p.y0))) < 1e-9)
})

test('drawStrip: a minute at the plot\'s far edge has its label inside the strip (ending at its edge), not cut off by it', () => {
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const ctx = draw(profile(), DEFAULT_UNITS, aheadPath({ lat: 32, lon: 34.9, altM: 3000 }, 0, 427, 0)!) // 13.18 km a minute: the sixth at 79 km
  const labels = ctx.calls.filter((c) => c.op === 'fillText' && /min/.test(String(c.a[0])))
  assert.deepEqual(labels.map((c) => c.a[0]), ['1 min', '2 min', '3 min', '4 min', '5 min', '6 min'])
  const sixth = labels[5]
  assert.ok((sixth.a[1] as number) > p.x1 - 6, 'its tick is at the plot\'s edge')
  assert.deepEqual([sixth.align, sixth.a[1]], ['right', W - 1], 'so the label ends at the strip\'s edge')
  assert.ok(labels.slice(0, 5).every((c) => c.align === 'center'), 'the others are centred on their ticks')
})

test('drawStrip: the minutes under the plot, each at its distance along 80 km; a slow aircraft\'s minutes are close, so only those with room are named; none past 80 km', () => {
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const at = (ctx: Ctx, t: string): number => ctx.calls.find((c) => c.op === 'fillText' && c.a[0] === t)!.a[1] as number
  const fast = draw(profile())
  assert.deepEqual(fast.texts().filter((t) => /min/.test(t)), ['1 min', '2 min', '3 min', '4 min', '5 min', '6 min'], '360 kt: 11.1 km a minute')
  assert.ok(Math.abs(at(fast, '3 min') - (p.x0 + ((3 * PATH.kmPerMin) / 80) * (p.x1 - p.x0))) < 1e-9)
  const quick = draw(profile(), DEFAULT_UNITS, aheadPath({ lat: 32, lon: 34.9, altM: 3000 }, 0, 480, 0)!)
  assert.deepEqual(quick.texts().filter((t) => /min/.test(t)), ['1 min', '2 min', '3 min', '4 min', '5 min'], '480 kt: the sixth is at 89 km')
  const slow = draw(profile(), DEFAULT_UNITS, aheadPath({ lat: 32, lon: 34.9, altM: 3000 }, 0, 100, 0)!)
  const named = slow.texts().filter((t) => /min/.test(t))
  assert.ok(named.length >= 2 && named.length < 6, `100 kt: ${named.join(', ')}`)
  const xs = named.map((t) => at(slow, t))
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 44, 'room between the labels')
})

test('stripCells: the cells as a picture, a pixel a cell, the top row first: a cell where the cover is over 0.25, in its severity\'s colour, the more solid the cover the stronger; clear for less', () => {
  const p = profile([[10, 5, 1, 3], [11, 5, 0.2, 3], [12, 5, 0.6, 1], [13, 5, 0.25, 2], [20, 30, 0.8, 2.4], [30, 40, 0.5, 0], [0, 0, 0.9, 1], [159, 49, 0.9, 3]])
  const px = stripCells(p)
  assert.equal(px.length, PROFILE_COLS * PROFILE_ROWS * 4)
  const at = (i: number, j: number): number[] => [...px.subarray(((PROFILE_ROWS - 1 - j) * PROFILE_COLS + i) * 4).subarray(0, 4)]
  assert.deepEqual(at(10, 5), [0xff, 0x4d, 0x3d, 255], 'a thunderstorm: 0.35 + 1, kept to 1')
  assert.deepEqual(at(11, 5), [0, 0, 0, 0], '0.2: none')
  assert.deepEqual(at(12, 5), [0x58, 0xa6, 0xff, Math.round(0.95 * 255)], 'light rain: 0.35 + 0.6')
  assert.deepEqual(at(13, 5), [0, 0, 0, 0], '0.25 is not over 0.25')
  assert.deepEqual(at(20, 30), [0xff, 0xbe, 0x3d, 255], 'heavy rain: 2.4 is step 2')
  assert.deepEqual(at(30, 40), [0xf2, 0xf5, 0xf8, Math.round(0.85 * 255)], 'cloud')
  assert.deepEqual([...px.subarray((PROFILE_ROWS - 1) * PROFILE_COLS * 4).subarray(0, 4)], [0x58, 0xa6, 0xff, 255], 'the first column at sea level: the bottom row\'s first pixel')
  assert.deepEqual([...px.subarray((PROFILE_COLS - 1) * 4).subarray(0, 4)], [0xff, 0x4d, 0x3d, 255], 'the last column at the top: the top row\'s last pixel')
  assert.equal(px.filter((v, k) => k % 4 === 3 && v > 0).length, 6)
  const kept = stripCells(profile([[1, 1, 0.9, 0]]), px)
  assert.equal(kept, px, 'into the picture given')
  assert.deepEqual(at(10, 5), [0, 0, 0, 0], 'what it held is gone')
  assert.equal(px.filter((v, k) => k % 4 === 3 && v > 0).length, 1)
})

test('drawStrip: the cells\' picture is laid over the plot, not smoothed (a cell is a block), over the hazard areas\' tints and under their dashed boxes; without one no cell is drawn', () => {
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const cells = { the: 'picture' }
  const ctx = new Ctx()
  drawStrip(ctx as unknown as CanvasRenderingContext2D, W, H, profile([[10, 5, 1, 3]], [{ fromKm: 40, toKm: 60, baseM: 3000, topM: 10_000, color: RED }]), PATH, DEFAULT_UNITS, undefined, cells as unknown as CanvasImageSource)
  const laid = ctx.calls.filter((c) => c.op === 'drawImage')
  assert.equal(laid.length, 1)
  assert.deepEqual(laid[0].a, [cells, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0])
  assert.deepEqual([laid[0].smooth, laid[0].alpha], [false, 1])
  const order = ctx.calls.map((c) => c.op)
  assert.ok(order.lastIndexOf('fillRect') < order.indexOf('drawImage') && order.indexOf('drawImage') < order.indexOf('strokeRect'))
  assert.equal(ctx.calls.filter((c) => c.op === 'fillRect').length, 2, 'the plot\'s ground and the area\'s tint: no rectangle for a cell')
  assert.equal(draw(profile([[10, 5, 1, 3]])).calls.filter((c) => c.op === 'drawImage' || c.op === 'fillRect').length, 1)
})

test('drawStrip: a hazard area is a dashed box in its own colour over the stretch it is crossed, from its base to its top, tinted inside', () => {
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const two = draw(profile([], [{ fromKm: 5, toKm: 15, baseM: 0, topM: 6000, color: '#5ac8fa' }, { fromKm: 40, toKm: 60, baseM: 3000, topM: 10_000, color: RED }]))
  assert.deepEqual(two.calls.filter((c) => c.op === 'strokeRect').map((c) => c.stroke), ['#5ac8fa', RED], 'each box its area\'s colour')
  assert.deepEqual(two.calls.filter((c) => c.op === 'fillRect' && c.alpha < 0.3 && c.alpha > 0.1).map((c) => c.fill), ['#5ac8fa', RED], 'and its tint')
  const ctx = draw(profile([], [{ fromKm: 40, toKm: 60, baseM: 3000, topM: 10_000, color: RED }]))
  const boxes = ctx.calls.filter((c) => c.op === 'strokeRect')
  assert.equal(boxes.length, 1)
  assert.equal(boxes[0].stroke, '#ff5a5a')
  assert.ok(boxes[0].dash.length > 0, 'dashed')
  const [x, y, w, h] = boxes[0].a as number[]
  const pw = p.x1 - p.x0
  const ph = p.y1 - p.y0
  assert.ok(Math.abs(x - (p.x0 + 0.5 * pw)) < 1e-9 && Math.abs(w - 0.25 * pw) < 1e-9)
  assert.ok(Math.abs(y - (p.y1 - (10_000 / PROFILE_TOP_M) * ph)) < 1e-9 && Math.abs(h - ((7000 / PROFILE_TOP_M) * ph)) < 1e-9, 'from 3,000 m to 10,000 m')
  const tint = ctx.calls.filter((c) => c.op === 'fillRect' && c.fill === '#ff5a5a')
  assert.equal(tint.length, 1)
  assert.ok(tint[0].alpha < 0.3)
  const high = draw(profile([], [{ fromKm: 0, toKm: 20, baseM: 0, topM: 30_000, color: RED }])).calls.find((c) => c.op === 'strokeRect')!
  assert.ok(Math.abs((high.a[1] as number) - p.y0) < 1e-9, 'a top above the strip is held to its top edge')
})

test('drawStrip: the aircraft\'s way is a dashed yellow line from its height now, a marker on it, to the plot\'s far edge at the height it reaches; a climb rises, and the strip\'s top holds it', () => {
  const p = stripPlot(W, H, DEFAULT_UNITS)
  const Y = (m: number): number => p.y1 - (Math.min(m, PROFILE_TOP_M) / PROFILE_TOP_M) * (p.y1 - p.y0)
  const level = draw(profile())
  const start = level.calls.find((c) => c.op === 'moveTo' && c.stroke === '#ffd23f')!
  assert.deepEqual(start.a, [p.x0, Y(3000)])
  assert.ok(start.dash.length > 0)
  const way = (ctx: Ctx): Call[] => ctx.calls.filter((c) => c.op === 'lineTo' && c.stroke === '#ffd23f' && c.dash.length > 0) // (the marker is not dashed)
  const last = way(level).at(-1)!
  assert.ok(Math.abs((last.a[0] as number) - p.x1) < 1e-9 && Math.abs((last.a[1] as number) - Y(3000)) < 1e-9, 'level: level')
  assert.ok(level.calls.some((c) => c.op === 'fill' && c.fill === '#ffd23f'), 'the marker')
  const up = draw(profile(), DEFAULT_UNITS, aheadPath({ lat: 32, lon: 34.9, altM: 3000 }, 0, 360, 2000)!)
  const upEnd = way(up).at(-1)!
  const wantM = 3000 + 2000 * 0.3048 * (80 / PATH.kmPerMin)
  assert.ok(Math.abs((upEnd.a[1] as number) - Y(wantM)) < 1e-6, `${upEnd.a[1]} against ${Y(wantM)}`)
  const steep = draw(profile(), DEFAULT_UNITS, aheadPath({ lat: 32, lon: 34.9, altM: 9000 }, 0, 360, 6000)!)
  assert.ok(Math.abs((way(steep).at(-1)!.a[1] as number) - p.y0) < 1e-9, 'held to the top')
})
