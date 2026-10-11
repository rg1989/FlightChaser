// client/ui/miniGauges.ts
// The top-down map's small instrument panel (bottom left, over the map key): what the chase's flight-data frame shows
// round the aircraft (scene/flightFrame.ts), in one compact card. The attitude indicator with bank and pitch; altitude,
// vertical speed, speed and heading as figures, in the frame's units. For the selected aircraft and for a scenario's. A
// button folds it to a dot and opens it again; the app keeps the choice. update() every frame: the indicator moves by
// transforms, the figures are written at most every TEXT_MS, estimates dimmed as in the frame.
import { Glide } from '../scene/instrumentMath.ts'
import { TEXT_MS, altTextIn, bankText, deg3, frameView, pitchText, speedText, vsTextIn } from '../scene/flightFrame.ts'
import type { FlightData } from '../types.ts'
import { icon } from './icons.ts'
import { Adi, h, say, show } from './instruments.ts'
import { altLabel, speedIn, speedLabel, vsLabel, type Units } from './units.ts'
import './miniGauges.css'

export interface MiniGaugesOpts {
  open: boolean
  onOpen(open: boolean): void // folded or opened by hand: to keep
}

export interface MiniGaugesHandle {
  update(data: FlightData | null, units: Units, nowMs?: number): void // null: nothing to show (no aircraft, or the chase)
  destroy(): void
}

/** A figure under its label, with its unit: "ALT / 12,300 ft". */
function cell(name: string): { el: HTMLDivElement; name: HTMLSpanElement; value: HTMLSpanElement; unit: HTMLSpanElement } {
  const el = h('div', 'fh-mini-cell')
  const label = h('span', 'fh-mini-l', name)
  const value = h('span', 'fh-mini-v')
  const unit = h('span', 'fh-mini-u')
  const fig = h('span', 'fh-mini-fig')
  fig.append(value, unit)
  el.append(label, fig)
  return { el, name: label, value, unit }
}

export function mountMiniGauges(root: HTMLElement, opts: MiniGaugesOpts): MiniGaugesHandle {
  const box = h('div', 'fh-mini fh-glass fh-blur')
  box.hidden = true
  const toggle = h('button', 'fh-ibtn fh-mini-toggle')
  toggle.type = 'button'
  const adi = new Adi()
  const bank = cell('Bank')
  const pitch = cell('Pitch')
  const att = h('div', 'fh-mini-att')
  const angles = h('div', 'fh-mini-angles')
  angles.append(bank.el, pitch.el)
  att.append(adi.el, angles)
  const alt = cell('Alt')
  const vs = cell('V/S')
  const spd = cell('IAS')
  const gs = cell('GS')
  const hdg = cell('Hdg')
  const nums = h('div', 'fh-mini-nums')
  nums.append(alt.el, vs.el, spd.el, gs.el, hdg.el)
  const body = h('div', 'fh-mini-body')
  body.append(att, nums)
  box.append(body, toggle)
  root.append(box)

  let open = opts.open
  const paint = (): void => {
    box.dataset.open = String(open)
    body.hidden = !open
    toggle.replaceChildren(icon(open ? 'chevronDown' : 'gauge', open ? 16 : 18))
    const label = open ? 'Hide the instruments' : 'Show the instruments'
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.title = label
  }
  paint()
  toggle.addEventListener('click', () => {
    open = !open
    paint()
    opts.onOpen(open)
  })

  const roll = new Glide(0.05, 60, true) // as the frame's: the indicator never spins the long way round
  const pit = new Glide(0.05, 20)
  let lastMs = 0
  let textAt = -Infinity
  const dim = (el: Element, on: boolean): void => void el.classList.toggle('fh-est', on)

  return {
    update(data, units, nowMs = performance.now()) {
      show(box, data !== null)
      if (data === null) {
        roll.step(null, 0)
        pit.step(null, 0)
        return
      }
      const dt = Math.min(1, Math.max(0, (nowMs - lastMs) / 1000))
      lastMs = nowMs
      const v = frameView(data)
      const r = roll.step(v.roll?.value ?? null, dt)
      const p = pit.step(v.pitch?.value ?? null, dt)
      if (!open) return
      if (v.adi !== null) adi.set(r ?? 0, p ?? 0)
      if (nowMs - textAt < TEXT_MS) return
      textAt = nowMs
      show(att, v.adi !== null)
      if (v.adi !== null) dim(adi.el, v.adi.est)
      show(bank.el, v.roll !== null)
      if (v.roll !== null && r !== null) {
        say(bank.value, bankText(r))
        dim(bank.el, v.roll.est)
      }
      show(pitch.el, v.pitch !== null)
      if (v.pitch !== null && p !== null) {
        say(pitch.value, pitchText(p))
        dim(pitch.el, v.pitch.est)
      }
      show(alt.el, v.alt !== null)
      if (v.alt !== null) {
        say(alt.value, altTextIn(v.alt.value, units))
        say(alt.unit, altLabel(units.alt))
        dim(alt.el, v.alt.est)
      }
      show(vs.el, v.vs !== null)
      if (v.vs !== null) {
        const t = vsTextIn(v.vs.value, units.vs === 'ms')
        say(vs.value, t.arrow === '' ? t.text : `${t.arrow} ${t.text}`)
        say(vs.unit, vsLabel(units.vs))
        vs.el.dataset.dir = t.arrow === '↑' ? 'up' : t.arrow === '↓' ? 'down' : 'level'
        dim(vs.el, v.vs.est)
      }
      show(spd.el, v.speed !== null)
      if (v.speed !== null) {
        say(spd.name, v.speed.kind)
        say(spd.value, speedText(speedIn(v.speed.value, units.speed)))
        say(spd.unit, speedLabel(units.speed))
        dim(spd.el, v.speed.est)
      }
      show(gs.el, v.gs !== null) // beside an airspeed only: without one the speed above is the ground speed
      if (v.gs !== null) {
        say(gs.value, speedText(speedIn(v.gs.value, units.speed)))
        say(gs.unit, speedLabel(units.speed))
        dim(gs.el, v.gs.est)
      }
      show(hdg.el, v.hdg !== null)
      if (v.hdg !== null) {
        say(hdg.name, v.hdg.kind === 'HDG' ? 'Hdg' : 'Trk')
        say(hdg.value, deg3(v.hdg.value))
        dim(hdg.el, v.hdg.est)
      }
    },
    destroy() {
      box.remove()
    },
  }
}
