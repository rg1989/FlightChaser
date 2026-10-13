// client/ui/info.ts
// The keyboard shortcuts, in the Settings dialog's Controls tab (settings.ts).
import './info.css'

interface Section {
  title: string
  rows: [string, string][]
}

// ponytail: keys only (the user's call, 2026-09-30); the mouse, trackpad and touch gestures are not listed.
const KEYS: Section[] = [
  { title: 'Anywhere', rows: [
    ['/', 'Search (also Cmd+K)'],
    ['Esc', 'One step back'],
    ['M', 'Map or satellite'],
    ['R', 'Roads over the satellite'],
    ['P', 'Borders and places over the satellite'],
    ['W', 'Weather'],
  ] },
  { title: '3-D chase', rows: [
    ['T', '3-D terrain'],
    ['L', 'Sun and moon light'],
    ['B', '3-D buildings'],
    ['X', 'See-through buildings'],
    ['U', 'Building textures'],
  ] },
  { title: 'In a scenario', rows: [
    ['Space', 'Play or pause'],
    ['← →', 'Back or ahead 10 s (with Shift, 60 s)'],
    ['M', 'Mute the voices'],
    ['V', 'Map or 3-D view'],
  ] },
]

export function mountInfoPanel(root: HTMLElement): void {
  const h = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag)
    e.className = className
    if (text !== '') e.textContent = text
    return e
  }
  for (const sec of KEYS) {
    const box = h('section', 'fh-info-sec')
    const dl = h('dl', 'fh-info-keys')
    for (const [what, does] of sec.rows) {
      const dt = h('dt')
      dt.append(...what.split(' ').map((k) => h('kbd', 'fh-kbd', k)))
      dl.append(dt, h('dd', '', does))
    }
    box.append(h('h3', 'fh-info-t', sec.title), dl)
    root.append(box)
  }
}
