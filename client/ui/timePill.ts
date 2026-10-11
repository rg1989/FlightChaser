// client/ui/timePill.ts
// The pill that says which time the map shows: "Live" while it is now; in the past (History, a flight's replay) the day
// and the clock of the moment shown, and under the pointer or the focus an × in place of its dot: a press goes back to
// live. One in the search box's bar (wide screens), one of its own on phones (timePill.css): the app updates both.
import { icon } from './icons.ts'
import './timePill.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const two = (n: number): string => String(n).padStart(2, '0')

/** 'Sat 10 Oct · 06:41:17' in the browser's zone; the year too when it is not nowMs's ('Sat 10 Oct 2025 · …'). */
export function pillText(tMs: number, nowMs: number): string {
  const d = new Date(tMs)
  const year = d.getFullYear() === new Date(nowMs).getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${year} · ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
}

export interface TimePillHandle {
  el: HTMLButtonElement
  /** tMs null: live. Cheap to call every frame: it writes only what changed. */
  update(tMs: number | null, nowMs?: number): void
  destroy(): void
}

export function mountTimePill(o: { zone: string; onLive(): void; className?: string }): TimePillHandle {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `fh-timepill${o.className === undefined ? '' : ` ${o.className}`}`
  const dot = document.createElement('span')
  dot.className = 'fh-timepill-dot'
  const x = document.createElement('span')
  x.className = 'fh-timepill-x'
  x.append(icon('x', 12))
  const text = document.createElement('span')
  text.className = 'fh-timepill-text'
  el.append(dot, x, text)
  let shown: string | null = null
  let live: boolean | null = null
  const paint = (isLive: boolean, label: string): void => {
    if (label !== shown) {
      shown = label
      text.textContent = label
    }
    if (isLive === live) return
    live = isLive
    el.dataset.state = isLive ? 'live' : 'past'
    // Live, it is a statement, not a control: out of the tab order, and a press does nothing.
    el.tabIndex = isLive ? -1 : 0
    el.setAttribute('aria-disabled', String(isLive))
    const says = isLive ? 'Live: the map shows the air now' : `The map shows the past, times in ${o.zone}. Back to live`
    el.title = says
    el.setAttribute('aria-label', says)
  }
  el.addEventListener('pointerdown', (e) => e.preventDefault()) // the search field keeps its focus
  el.addEventListener('click', () => {
    if (live === false) o.onLive()
  })
  paint(true, 'Live')
  return {
    el,
    update(tMs, nowMs = Date.now()) {
      if (tMs === null) paint(true, 'Live')
      else paint(false, pillText(tMs, nowMs))
    },
    destroy: () => el.remove(),
  }
}
