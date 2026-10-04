// client/scene/sculptAids.ts
// What the Sculpted look draws besides its bodies, as plain Cesium geometry (the other looks' cloud pass draws these itself; this
// look has no pass): the hazard areas' edges in the style chosen, and the track line. sculptedClouds.ts says what and when.
// A hazard area's ring stands from the area's base to its top, in its colour:
// - curtain: a wall whose colour is strongest along the top and fades to nothing a part of the way down (a picture on the wall),
//   with a line along the top and a fainter one along the base;
// - fence: a rail along the top, and posts from the base to the top at each corner and every POST_KM between;
// - box: the volume, faintly filled, with its edges.
// The footprint on the ground under a curtain or a fence is Weather3D's, as in the other looks.
// The track line is the way ahead (wxAhead.ts aheadPath) as a line of short pieces, each pale in clear air and in the severity's
// colour where it is inside a body as drawn (sculptInside.ts trackSeverities): it shows where on this heading the aircraft enters
// cloud, and of what kind. Its places follow the aircraft every frame.
import {
  Cartesian3, Color, CustomDataSource, ImageMaterialProperty, Material, PolylineCollection, type Polyline, type Viewer,
} from 'cesium'
import type { HazardStyle } from './cloudVolume.ts'
import type { SculptAids } from './sculptedClouds.ts'
import { severityRgb } from './sculptShaders.ts'
import { wrapLon, type Hazard } from './wxGeo.ts'

const POST_KM = 12 // a fence's posts stand at each corner and this far apart between
const CURTAIN_ALPHA = 0.55 // a curtain's colour along its top
const CURTAIN_FADE = 0.6 // and it has faded to nothing this share of the way down
const BOX_ALPHA = 0.1 // a box's fill
const LINE_PX = 2
const TRACK_PX = 3
const TRACK_CLEAR = Color.fromCssColorString('#d8ecff').withAlpha(0.9) // the track line in clear air
const KM_PER_DEG = 111.195

/** A wall's picture: a column of the colour, strongest at the top, nothing from CURTAIN_FADE of the way down. */
function curtainImage(doc: Document, color: Color): HTMLCanvasElement {
  const canvas = doc.createElement('canvas')
  canvas.width = 2
  canvas.height = 64
  const g = canvas.getContext('2d')!
  const fade = g.createLinearGradient(0, 0, 0, canvas.height)
  fade.addColorStop(0, color.withAlpha(CURTAIN_ALPHA).toCssColorString())
  fade.addColorStop(CURTAIN_FADE, color.withAlpha(0).toCssColorString())
  g.fillStyle = fade
  g.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

/** The aids in the viewer: the hazard areas' edges as entities of a data source of their own, the track line as a polyline collection in the scene. */
export function sceneAids(viewer: Viewer): SculptAids {
  const source = new CustomDataSource('hazard-edges')
  void viewer.dataSources.add(source)
  const lines = viewer.scene.primitives.add(new PolylineCollection()) as PolylineCollection
  const pieces: Polyline[] = []
  const tints = new Map<number, Material>() // a piece's material by its severity in tenths (−1: clear air): made once each
  const tintOf = (sev: number): Material => {
    const key = sev < 0 ? -1 : Math.round(sev * 10)
    let m = tints.get(key)
    if (m === undefined) {
      const [r, g, b] = severityRgb(key / 10)
      tints.set(key, (m = Material.fromType('Color', { color: key < 0 ? TRACK_CLEAR : new Color(r, g, b, 1) })))
    }
    return m
  }
  let gone = false
  return {
    hazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string): void {
      if (gone) return
      const ents = source.entities
      ents.suspendEvents()
      ents.removeAll()
      for (const h of hazards) {
        const c = Color.fromCssColorString(color(h))
        for (const ring of h.rings) {
          const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]]
          const at = (heightM: number): Cartesian3[] => closed.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat, heightM))
          const [top, base] = [at(h.topM), at(h.baseM)]
          if (style === 'box') {
            ents.add({ polygon: { hierarchy: top.slice(0, -1), height: h.baseM, extrudedHeight: h.topM, material: c.withAlpha(BOX_ALPHA), outline: true, outlineColor: c.withAlpha(0.8) } })
            continue
          }
          ents.add({ polyline: { positions: top, width: LINE_PX, material: c.withAlpha(0.95) } })
          if (style === 'curtain') {
            ents.add({ wall: { positions: top, minimumHeights: closed.map(() => h.baseM), material: new ImageMaterialProperty({ image: curtainImage(viewer.container.ownerDocument, c), transparent: true }) } })
            ents.add({ polyline: { positions: base, width: 1, material: c.withAlpha(0.45) } })
            continue
          }
          // A fence: a post at each corner, and between two corners every POST_KM.
          for (let k = 0; k + 1 < closed.length; k++) {
            const [[lon0, lat0], [lon1, lat1]] = [closed[k], closed[k + 1]]
            const km = Math.hypot((lat1 - lat0) * KM_PER_DEG, wrapLon(lon1 - lon0) * KM_PER_DEG * Math.cos((lat0 * Math.PI) / 180))
            const posts = Math.max(1, Math.round(km / POST_KM))
            for (let p = 0; p < posts; p++) {
              const [lon, lat] = [lon0 + (wrapLon(lon1 - lon0) * p) / posts, lat0 + ((lat1 - lat0) * p) / posts]
              ents.add({ polyline: { positions: [Cartesian3.fromDegrees(lon, lat, h.baseM), Cartesian3.fromDegrees(lon, lat, h.topM)], width: p === 0 ? LINE_PX : 1, material: c.withAlpha(p === 0 ? 0.9 : 0.6) } })
            }
          }
        }
      }
      ents.resumeEvents()
    },
    track(positions: readonly Cartesian3[], severities: ArrayLike<number>): void {
      if (gone) return
      const n = Math.max(0, positions.length - 1)
      lines.show = n > 0
      while (pieces.length < n) pieces.push(lines.add({ width: TRACK_PX, positions: [new Cartesian3(), new Cartesian3()] }))
      for (let k = 0; k < pieces.length; k++) {
        const piece = pieces[k]
        piece.show = k < n
        if (k >= n) continue
        piece.positions = [positions[k], positions[k + 1]]
        const tint = tintOf(severities[k])
        if (piece.material !== tint) piece.material = tint
      }
    },
    destroy(): void {
      if (gone) return
      gone = true
      if (viewer.isDestroyed()) return
      void viewer.dataSources.remove(source, true)
      viewer.scene.primitives.remove(lines)
    },
  }
}
