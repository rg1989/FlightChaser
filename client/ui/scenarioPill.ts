// client/ui/scenarioPill.ts
// A playing scenario's pill, top centre, where the search bar and its Live pill stand otherwise (searchBox.ts,
// timePill.ts): the scenario's day and clock, since what plays is not now; the view, 3-D or the top-down map; and Exit.
// The scenario (scenario/run.ts) mounts it and writes its time each frame.
import { icon } from './icons.ts'
import './sceneToggles.css' // the view's two buttons are the panels' segment (.fh-seg)
import './timePill.css' // the time is the History pill's chip, in its past colour
import './scenarioPill.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The scenario's day at t, seconds since `date` 00:00 (YYYY-MM-DD, its local day): '12 Aug 1985'; past 24 h, the day after. */
export function scenarioDay(date: string, t: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const at = new Date(Date.UTC(y, m - 1, d) + Math.floor(t / 86_400) * 86_400_000)
  return `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`
}

export interface ScenarioPillHandle {
  /** The day and clock shown: '12 Aug 1985 · 18:24:35 JST'. Cheap every frame: written only when it changed. */
  update(text: string): void
  /** The view on screen: its button is the pressed one. */
  setView(topDown: boolean): void
  destroy(): void
}

/** onView absent: no view to choose (the pill is the time and Exit). It is called when the other view is asked for. */
export function mountScenarioPill(root: HTMLElement, o: { onExit(): void; onView?(): void }): ScenarioPillHandle {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag)
    e.className = className
    if (text !== '') e.textContent = text
    return e
  }
  const bar = el('div', 'fh-scnpill fh-glass fh-blur')
  bar.setAttribute('role', 'toolbar')
  bar.setAttribute('aria-label', 'Scenario')
  const time = el('span', 'fh-timepill')
  time.dataset.state = 'scenario'
  time.title = 'The scenario’s day and time: a replay, not live'
  const text = el('span', 'fh-timepill-text')
  time.append(el('span', 'fh-timepill-dot'), text)
  bar.append(time)
  let topDown = false
  const views: HTMLButtonElement[] = []
  if (o.onView !== undefined) {
    const seg = el('div', 'fh-seg fh-scnpill-seg')
    seg.setAttribute('role', 'group')
    seg.setAttribute('aria-label', 'View')
    for (const [name, map, tip] of [['3-D', false, '3-D view behind the aircraft (V)'], ['Map', true, 'Top-down map with the whole route (V)']] as const) {
      const b = el('button', 'fh-seg-b', name)
      b.type = 'button'
      b.title = tip
      b.setAttribute('aria-pressed', String(map === topDown))
      b.addEventListener('click', (e) => {
        if (map !== topDown) o.onView!()
        if (e.detail > 0) b.blur() // a later Space plays or pauses
      })
      views.push(b)
      seg.append(b)
    }
    bar.append(seg)
  }
  const exit = el('button', 'fh-pill fh-pill-secondary fh-scnpill-exit')
  exit.type = 'button'
  exit.title = 'Exit the scenario (Esc)'
  exit.setAttribute('aria-label', 'Exit the scenario')
  exit.append(icon('x', 14), el('span', 'fh-scnpill-exit-l', 'Exit'))
  exit.addEventListener('click', () => o.onExit())
  bar.append(exit)
  root.append(bar)
  let shown = ''
  return {
    update(t) {
      if (t === shown) return
      shown = t
      text.textContent = t
    },
    setView(map) {
      topDown = map
      views.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === map)))
    },
    destroy: () => bar.remove(),
  }
}
