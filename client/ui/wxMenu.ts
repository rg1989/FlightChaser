// client/ui/wxMenu.ts
// The Weather panel (a square of its own under the Layers square, always on the rail): a master switch (Weather, W: ScenePrefs.wx) with
// what hangs under it: the rain scale in the radar's colours and the airports legend (the top-down map's) and the status line (both
// views', with Open-Meteo's credit in it, and EUMETSAT's while the satellite's frame is in use, as links to their sites, as their licences
// ask); Clouds, in three looks (natural, severity colours, sculpted), their opacity (a slider, none to solid: at none the hazard areas show alone) and the severity scale's four colours; Hazard areas, in
// three styles (curtain, fence, box); Looking ahead, a switch row each for the track line, the level slice and the ahead strip (the
// level slice is not drawn in the Sculpted look: there its switch is disabled, keeps its choice, and its hint says so). The
// looks, styles and aids are the chase's: top-down they show disabled, with one line, "In the chase view". With the master switch off
// every other control keeps the choice stored but is disabled (native `disabled` on the buttons and the slider, aria-disabled on the row or the
// group, which wxMenu.css dims); nothing in WxPrefs changes with the switch. After a drawing error the Clouds segment and slider are disabled; in
// History and a scenario ("Live only") the master switch is. It is the Layers panel's look (sceneToggles.css: its segments, rows and
// switches). A click asks the app for the changed prefs through onChange (or onMaster, for the switch) and changes nothing itself;
// update() and setView() only re-render, so the app is the one place the choices are applied and stored (wxPrefs.ts).
import { icon, type IconName } from './icons.ts'
import { RAIN_PALETTE } from '../scene/radar.ts'
import { CATEGORY_COLOR, WX_CREDITS } from '../scene/wxText.ts'
import { SEV_COLOR } from '../scene/wxAhead.ts'
import type { CloudLook, HazardStyle } from '../scene/cloudVolume.ts'
import type { WxPrefs } from './wxPrefs.ts'
import './sceneToggles.css'
import './wxMenu.css'

export interface WxMenuOpts {
  prefs: WxPrefs
  onChange(next: WxPrefs): void
  onMaster(on: boolean): void // the master switch asks for ScenePrefs.wx to be this
}

/** What the panel's controls depend on, besides the choices: set with setView() whenever the app changes any of it. */
export interface WxMenuView {
  wx: boolean // the master switch: ScenePrefs.wx
  chasing: boolean // the looks, styles and aids are the chase's
  live: boolean // the weather is today's: false in History and a scenario, where the master switch is disabled
  failed: boolean // the chase's cloud pass has failed for good: the Clouds segment does nothing
  theme: 'light' | 'dark' // the radar's palette, for the rain scale (sceneToggles.ts rainTheme)
}

export interface WxMenuHandle {
  update(prefs: WxPrefs): void
  setView(view: WxMenuView): void
  setWeather(text: string | null): void // the status line under the switch: what the weather holds, or why not
  destroy(): void
}

const LOOKS: [CloudLook, string][] = [['natural', 'Natural'], ['severity', 'Severity colours'], ['sculpted', 'Sculpted']]
const HAZARDS: [HazardStyle, string][] = [['curtain', 'Curtain'], ['fence', 'Fence'], ['box', 'Box']]
// The severity scale's names (wxAhead.ts SEV_COLOR is in this order), as a legend says them.
const LEGEND = ['Cloud', 'Light rain', 'Heavy rain', 'Thunderstorm']
// How the weather reads at an airport (VFR to LIFR), in the colours of its markers' rings (wxText.ts).
const CATEGORIES: [string, string][] = [['Good', CATEGORY_COLOR.VFR], ['Marginal', CATEGORY_COLOR.MVFR], ['Poor', CATEGORY_COLOR.IFR], ['Very poor', CATEGORY_COLOR.LIFR]]
const MASTER_HINT = { top: 'Rain radar, airport weather, hazard areas', chase: 'Clouds, rain and hazard areas around the aircraft' } // per view
interface Aid { key: 'track' | 'slice' | 'strip'; icon: IconName; label: string; hint: string }
const AIDS: Aid[] = [
  { key: 'track', icon: 'plane', label: 'Track line', hint: 'The next six minutes on this heading' },
  { key: 'slice', icon: 'layers', label: 'Level slice', hint: "The weather at the aircraft's own altitude" },
  { key: 'strip', icon: 'altitude', label: 'Ahead strip', hint: 'Side view of the next 6 minutes' },
]
const NO_SLICE = 'Not in the Sculpted look yet' // the level slice's hint in that look, where it is not drawn
/** A control group or a row, in use or not: its controls, and the box that says so. */
interface Part { box: HTMLElement; buttons: (HTMLButtonElement | HTMLInputElement)[]; off: boolean }
/** The opacity as the slider and its label say it: whole hundredths, and "Off" for none. */
const percent = (opacity: number): number => Math.round(opacity * 100)
const opacityText = (opacity: number): string => (percent(opacity) === 0 ? 'Off' : `${percent(opacity)} %`)

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  if (text !== '') el.textContent = text
  return el
}

/** The weather line's text, each credit in it (Open-Meteo's, EUMETSAT's: wxText.ts WX_CREDITS) a link to its site: their licences ask for one. */
function writeLine(el: HTMLElement, text: string): void {
  const parts: (string | HTMLElement)[] = []
  let rest = text
  for (const [credit, url] of WX_CREDITS) {
    const at = rest.indexOf(credit)
    if (at < 0) continue
    const link = h('a', 'fh-wx-credit', credit)
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    if (at > 0) parts.push(rest.slice(0, at))
    parts.push(link)
    rest = rest.slice(at + credit.length)
  }
  if (parts.length === 0) {
    el.textContent = text
    return
  }
  if (rest !== '') parts.push(rest)
  el.replaceChildren(...parts)
}

export function mountWxMenu(root: HTMLElement, opts: WxMenuOpts): WxMenuHandle {
  let prefs = { ...opts.prefs }
  let view: WxMenuView = { wx: false, chasing: false, live: true, failed: false, theme: 'light' } // until the app says (setView, at once)
  const segs: { key: 'look' | 'hazard'; value: string; b: HTMLButtonElement }[] = []
  const switches = new Map<Aid['key'], HTMLButtonElement>()
  const parts: Part[] = []

  const part = (box: HTMLElement, buttons: Part['buttons']): Part => {
    box.setAttribute('aria-disabled', 'false')
    const p = { box, buttons, off: false }
    parts.push(p)
    return p
  }
  /** Puts a part out of use or back, writing only a change. */
  const setOff = (p: Part, off: boolean): void => {
    if (p.off === off) return
    p.off = off
    p.box.setAttribute('aria-disabled', String(off))
    for (const b of p.buttons) b.disabled = off
  }
  /** Shows el or hides it, writing only a change. */
  const show = (el: HTMLElement, on: boolean): void => {
    if (el.hidden === on) el.hidden = !on
  }
  const section = (title: string | null): HTMLElement => {
    const el = h('div', 'fh-scene')
    if (title === null) return el
    const head = h('div', 'fh-scene-head')
    head.append(h('span', 'fh-scene-title', title))
    el.append(head)
    return el
  }
  /** A button group: one choice of a field, asked for by its button (none when it is the one on). */
  const segment = <K extends 'look' | 'hazard'>(key: K, label: string, options: [WxPrefs[K], string][]): Part => {
    const el = h('div', 'fh-seg fh-wxm-seg')
    el.setAttribute('role', 'group')
    el.setAttribute('aria-label', label)
    const buttons: HTMLButtonElement[] = []
    for (const [value, text] of options) {
      const b = h('button', 'fh-seg-b', text)
      b.type = 'button'
      b.setAttribute('aria-pressed', String(prefs[key] === value))
      b.addEventListener('click', () => prefs[key] !== value && opts.onChange({ ...prefs, [key]: value }))
      el.append(b)
      buttons.push(b)
      segs.push({ key, value, b })
    }
    return part(el, buttons)
  }
  /** A switch row: the icon, the label (with its key), the hint, the switch; the whole row is the target (a finger's). */
  const switchRow = (ic: IconName, label: string, hint: string, ask: () => void, checked: boolean, shortcut?: string): { sw: HTMLButtonElement; hint: HTMLElement; part: Part } => {
    const el = h('div', 'fh-scene-row')
    const glyph = h('span', 'fh-scene-icon')
    glyph.append(icon(ic, 18))
    const text = h('div', 'fh-scene-text')
    const name = h('span', 'fh-scene-label', label)
    if (shortcut !== undefined) name.append(h('kbd', 'fh-kbd', shortcut))
    const hintEl = h('span', 'fh-scene-hint', hint)
    text.append(name, hintEl)
    const sw = h('button', 'fh-switch')
    sw.type = 'button'
    sw.setAttribute('role', 'switch')
    sw.setAttribute('aria-checked', String(checked))
    sw.setAttribute('aria-label', label)
    sw.addEventListener('click', ask)
    el.addEventListener('click', (e) => e.target !== sw && sw.click())
    el.append(glyph, text, sw)
    return { sw, hint: hintEl, part: part(el, [sw]) }
  }

  // The master switch, with what hangs under it.
  const master = section(null)
  const m = switchRow('cloud', 'Weather', MASTER_HINT.top, () => opts.onMaster(!view.wx), false, 'W')
  const more = h('div', 'fh-wx-more')
  // The rain radar's colours, light rain to heavy, as drawn over the top-down map.
  const rain = h('div', 'fh-wx-rain')
  const scale = h('span', 'fh-wx-scale')
  rain.append(h('span', 'fh-wx-rain-end', 'Light'), scale, h('span', 'fh-wx-rain-end', 'Heavy'))
  let scaleTheme = ''
  let masterOn = false // what the master switch shows
  const airports = h('div', 'fh-wx-legend')
  airports.append(h('span', 'fh-wx-legend-title', 'Airports'))
  for (const [cat, color] of CATEGORIES) {
    const k = h('span', 'fh-wx-cat', cat)
    k.style.setProperty('--c', color)
    airports.append(k)
  }
  const wxLine = h('p', 'fh-wx-line')
  let line: string | null = null // what it holds
  more.append(rain, airports, wxLine)
  const note = h('p', 'fh-wxm-note', 'In the chase view') // for the looks, styles and aids below, top-down
  master.append(m.part.box, more, note)

  const clouds = section('Clouds')
  const looks = segment('look', 'Clouds', LOOKS)
  const legend = h('div', 'fh-wx-legend fh-wxm-legend')
  LEGEND.forEach((name, i) => {
    const k = h('span', 'fh-wx-cat', name)
    k.style.setProperty('--c', SEV_COLOR[i])
    legend.append(k)
  })
  // The clouds' opacity: none (the hazard areas alone) to solid.
  const opacity = h('label', 'fh-wxm-opacity')
  const range = h('input', 'fh-wxm-range')
  range.type = 'range'
  range.min = '0'
  range.max = '100'
  range.step = '2'
  range.value = String(percent(prefs.opacity))
  range.setAttribute('aria-label', 'Cloud opacity')
  const amount = h('span', 'fh-wxm-amount', opacityText(prefs.opacity))
  range.addEventListener('input', () => opts.onChange({ ...prefs, opacity: Number(range.value) / 100 }))
  opacity.append(h('span', 'fh-wxm-range-name', 'Opacity'), range, amount)
  const dial = part(opacity, [range])
  clouds.append(looks.box, opacity, legend)
  const hazards = section('Hazard areas')
  const styles = segment('hazard', 'Hazard area style', HAZARDS)
  hazards.append(styles.box)
  const ahead = section('Looking ahead')
  const aids = AIDS.map((a) => {
    const r = switchRow(a.icon, a.label, a.hint, () => opts.onChange({ ...prefs, [a.key]: !prefs[a.key] }), prefs[a.key])
    switches.set(a.key, r.sw)
    return { ...a, part: r.part, hintEl: r.hint }
  })
  ahead.append(...aids.map((a) => a.part.box))
  root.append(master, clouds, hazards, ahead)

  /** Everything the view decides: what is in use, what shows, the hint, the switch, the scale's colours. */
  const fit = (): void => {
    const { wx, chasing, live, failed, theme } = view
    const use = wx && chasing // the looks, styles and aids act in the chase, with the weather on
    setOff(m.part, !live)
    setOff(looks, !use || failed)
    setOff(dial, !use || failed)
    setOff(styles, !use)
    for (const a of aids) {
      const undrawn = a.key === 'slice' && prefs.look === 'sculpted' // the Sculpted look has no level slice
      setOff(a.part, !use || undrawn)
      const words = undrawn ? NO_SLICE : a.hint
      if (a.hintEl.textContent !== words) a.hintEl.textContent = words
    }
    if (wx !== masterOn) m.sw.setAttribute('aria-checked', String((masterOn = wx)))
    const hint = chasing ? MASTER_HINT.chase : MASTER_HINT.top
    if (m.hint.textContent !== hint) m.hint.textContent = hint
    const map = wx && !chasing // the radar's scale and the airports' legend: the top-down map's, with the weather on
    show(rain, map)
    show(airports, map)
    show(wxLine, line !== null)
    show(more, map || line !== null)
    show(note, !chasing)
    if (theme === scaleTheme) return
    scaleTheme = theme
    scale.style.setProperty('--scale', `linear-gradient(90deg, ${RAIN_PALETTE[theme].rain.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ')})`)
  }
  fit()

  return {
    update(next) {
      for (const s of segs) if (next[s.key] !== prefs[s.key]) s.b.setAttribute('aria-pressed', String(next[s.key] === s.value))
      for (const [key, sw] of switches) if (next[key] !== prefs[key]) sw.setAttribute('aria-checked', String(next[key]))
      if (next.opacity !== prefs.opacity) {
        range.value = String(percent(next.opacity))
        amount.textContent = opacityText(next.opacity)
      }
      const look = next.look !== prefs.look
      prefs = { ...next }
      if (look) fit() // the level slice's switch goes out of use in the Sculpted look, and comes back
    },
    setView(next) {
      view = { ...next }
      fit()
    },
    setWeather(text) {
      if (text === line) return
      line = text
      if (text !== null) writeLine(wxLine, text)
      fit()
    },
    destroy() {
      master.remove()
      clouds.remove()
      hazards.remove()
      ahead.remove()
    },
  }
}
