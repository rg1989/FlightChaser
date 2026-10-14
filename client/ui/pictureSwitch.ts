// client/ui/pictureSwitch.ts
// The Performance mode card, beside the instrument layout button at the bottom of the chase (rail.css .fh-spot-bottom). It is
// there only while the 3-D view as designed is more than this computer's graphics draw smoothly, or while it is drawn lighter
// (renderGovernor.ts, which keeps it from coming and going). Its first line says why it is there, the second is the switch. Off:
// the view as designed, whatever it costs. On: softer edges, then fewer pixels, until the frames are smooth again. The person
// decides; the app never lowers the picture by itself (the user, 2026-10-14). The choice is kept.
import { icon } from './icons.ts'
import './pictureSwitch.css'
import { QUALITY, type Picture, type PictureState } from '../scene/renderGovernor.ts'

export const PICTURE_KEY = 'fh.picture.v1'

/** The kept choice: 'smooth' only when the person turned Performance mode on. */
export function readPicture(stored: string | null): Picture {
  return stored === 'smooth' ? 'smooth' : 'full'
}

/** The card's words: why it is there, the switch's name, and its tooltip (what each position does, and what is given up now). */
export function pictureText(s: PictureState): { why: string; label: string; tip: string } {
  const q = QUALITY[s.level] ?? QUALITY[0]
  const on = s.picture === 'smooth'
  const now = on && s.level > 0 ? `Now: ${q.msaa > 1 ? 'full' : 'softer'} edges, ${q.bloom ? '' : 'no sun glare, '}${Math.round(q.scale * 100)} % of the pixels.\n` : ''
  return {
    why: on ? 'Performance mode: a softer picture keeps the view smooth.' : 'Graphics at full load: the view may stutter.',
    label: 'Performance mode',
    tip: on ? `${now}Off: full quality, whatever it costs.` : 'On: softer edges, no sun glare and fewer pixels, so the view stays smooth.\nOff: full quality.',
  }
}

/** Mounts the card in the bottom spot; onToggle hears the person's choice. update() once a frame writes only what changed. */
export function mountPictureSwitch(spot: HTMLElement, onToggle: (p: Picture) => void): { update(s: PictureState): void; destroy(): void } {
  const card = document.createElement('div')
  card.className = 'fh-corner-b fh-glass fh-blur fh-picture'
  card.hidden = true
  const why = document.createElement('div')
  why.className = 'fh-picture-why'
  why.prepend(icon('gauge', 14))
  const whyText = document.createElement('span')
  why.append(whyText)
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'fh-ibtn fh-picture-btn'
  b.setAttribute('role', 'switch')
  const label = document.createElement('span')
  const knob = document.createElement('span')
  knob.className = 'fh-switch'
  knob.setAttribute('aria-hidden', 'true')
  b.append(label, knob)
  card.append(why, b)
  spot.append(card)
  let last = ''
  let on = false
  b.addEventListener('click', () => onToggle(on ? 'full' : 'smooth'))
  return {
    update(s) {
      const key = `${s.offered}|${s.picture}|${s.level}`
      if (key === last) return
      last = key
      on = s.picture === 'smooth'
      card.hidden = !s.offered
      card.toggleAttribute('data-on', on)
      const t = pictureText(s)
      whyText.textContent = t.why
      label.textContent = t.label
      b.dataset.tip = t.tip
      b.setAttribute('aria-label', `${t.label}. ${t.why}`)
      b.setAttribute('aria-checked', String(on))
      knob.setAttribute('aria-checked', String(on))
    },
    destroy() {
      card.remove()
    },
  }
}
