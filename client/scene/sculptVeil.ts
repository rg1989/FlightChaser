// client/scene/sculptVeil.ts
// The Sculpted look's veil over the view while the camera is inside a body (sculptedClouds.ts says when, in what colour and how
// strong): one element over the globe and under the place names, of one flat colour, see-through. The browser lays it over the
// picture: no pass of the scene's, no shader. Hidden while its strength is nothing.
import type { SculptVeil } from './sculptedClouds.ts'

/** The veil as an element of `parent` (the globe's): .fh-wx-veil (layout.css). */
export function domVeil(parent: HTMLElement): SculptVeil {
  const el = parent.ownerDocument.createElement('div')
  el.className = 'fh-wx-veil'
  el.hidden = true
  parent.append(el)
  return {
    set(css, opacity) {
      el.hidden = !(opacity > 0)
      if (el.hidden) return
      el.style.setProperty('background-color', css)
      el.style.setProperty('opacity', String(opacity))
    },
    destroy: () => el.remove(),
  }
}
