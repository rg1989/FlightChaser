// client/ui/routeMarks.ts
// A scenario's timeline marks on the top-down map's route: a dot where the aircraft was at each mark, as the play bar's
// ticks (playbar.ts): the label in a bubble on hover or focus, a press seeks to it, the ones already passed filled. DOM
// over the globe, each dot moved to its place every frame (a transform, written only when it changed).
import { Cartesian2, Cartesian3, SceneTransforms } from 'cesium'
import type { Scene } from 'cesium'
import { h, move, show } from './instruments.ts'
import './routeMarks.css'

export interface RouteMarkView {
  t: number
  label: string // as the play bar's tick says it: the mark and its clock time
  lat: number
  lon: number
  hM: number
}

export interface RouteMarksHandle {
  update(scene: Scene | null, t: number): void // scene null: hidden (the chase)
  destroy(): void
}

export function mountRouteMarks(root: HTMLElement, marks: readonly RouteMarkView[], onSeek: (t: number) => void): RouteMarksHandle {
  const layer = h('div', 'fh-routemarks')
  layer.hidden = true
  const at = new Cartesian2()
  const dots = marks.map((m) => {
    const el = h('button', 'fh-routemark')
    el.type = 'button'
    el.setAttribute('aria-label', m.label)
    el.dataset.label = m.label
    el.addEventListener('click', (e) => {
      onSeek(m.t)
      if (e.detail > 0) el.blur() // a later Space plays or pauses, as after a press on the play bar's tick
    })
    layer.append(el)
    return { el, t: m.t, pos: Cartesian3.fromDegrees(m.lon, m.lat, m.hM), past: false }
  })
  root.append(layer)
  return {
    update(scene, t) {
      show(layer, scene !== null)
      if (scene === null) return
      for (const d of dots) {
        const w = SceneTransforms.worldToWindowCoordinates(scene, d.pos, at)
        show(d.el, w !== undefined)
        if (w === undefined) continue
        move(d.el, `translate3d(${w.x.toFixed(1)}px,${w.y.toFixed(1)}px,0)`)
        const past = d.t <= t
        if (past !== d.past) d.el.classList.toggle('fh-past', (d.past = past))
      }
    },
    destroy() {
      layer.remove()
    },
  }
}
