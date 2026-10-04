// client/scene/sculptInside.ts
// Whether a place is inside a sculpted body (sculptMesh.ts), how deep, and how much of a line between two places lies in one: what
// the Sculpted look's veil and the chased aircraft's fade are worked out from (sculptedClouds.ts). Pure (no Cesium, no DOM), so Node
// tests cover it.
// It asks the bodies as they are drawn, not the field's own profile (wxField.ts sampleField): a body's top is rounded in from its rim,
// so over a body's shoulder the field has cloud where the body drawn has none, and a veil there would say "in cloud" with the cloud
// plainly below. Each band's mesh brings its top sheet and its underside as two maps on the field's texels (roof, floor: m above the
// sea, both 0 outside a body); a place is in a band's body between the two, read between the four texels round it.
// The depth is 0 at a body's surface and 1 from EDGE_M inside it (above the underside and below the top sheet: near the rim the
// two are close, so it is shallow there). The cloud between two places is the depth added up along the line, km. And the track
// line's pieces are each asked at their middle: in a body (deeper than IN_BODY), and of what severity, or in clear air.
import type { SculptMesh } from './sculptMesh.ts'
import { FIELD_KM, FIELD_N, type WxField } from './wxField.ts'
import { wrapLon } from './wxGeo.ts'

export const EDGE_M = 120 // a place is wholly in a body from this far inside its surface
export const IN_BODY = 0.3 // a piece of the track line is in a body when its middle is this deep
const TEXEL_KM = FIELD_KM / FIELD_N
const KM_PER_DEG = 111.195 // of latitude: the field's map
const RAD = Math.PI / 180

/** A place: degrees, and metres above the sea. */
export interface Place {
  lat: number
  lon: number
  altM: number
}

/** How deep a place is in a body (0: outside … 1), and that body's severity there (0 … 3). */
export interface Depth {
  depth: number
  sev: number
}

/**
 * How deep lat, lon, altM (metres above the sea) is in a body of the mesh, and how severe that body is there (the field's, of the
 * mesh's band): written into `out`, which is returned. Of several bands' bodies the deepest wins. Nothing with no mesh, outside the
 * field's square, or outside every body.
 */
export function bodyAt(mesh: SculptMesh | null, field: WxField | null, lat: number, lon: number, altM: number, out: Depth): Depth {
  out.depth = 0
  out.sev = 0
  if (mesh === null || field === null || mesh.bands.length === 0) return out
  const N = FIELD_N
  const u = (wrapLon(lon - mesh.lon) * KM_PER_DEG * Math.max(0.01, Math.cos(mesh.lat * RAD)) + FIELD_KM / 2) / TEXEL_KM - 0.5
  const v = ((lat - mesh.lat) * KM_PER_DEG + FIELD_KM / 2) / TEXEL_KM - 0.5
  if (!(u >= 0 && u <= N - 1 && v >= 0 && v <= N - 1)) return out
  const [i, j] = [Math.min(N - 2, Math.floor(u)), Math.min(N - 2, Math.floor(v))]
  const [fx, fy] = [u - i, v - j]
  const o = j * N + i
  for (const band of mesh.bands) {
    const { roof, floor } = band
    // The thickness between the four texels, an outside texel being none; the underside by the texels that have a body.
    let [thick, base, w] = [0, 0, 0]
    for (let c = 0; c < 4; c++) {
      const q = o + (c & 1) + (c >> 1) * N
      const share = ((c & 1) === 1 ? fx : 1 - fx) * (c >> 1 === 1 ? fy : 1 - fy)
      const t = roof[q] - floor[q]
      if (!(t > 0)) continue
      thick += share * t
      base += share * floor[q]
      w += share
    }
    if (!(w > 0)) continue
    base /= w
    const depth = Math.min(1, Math.min(altM - base, base + thick - altM) / EDGE_M)
    if (!(depth > out.depth)) continue
    out.depth = depth
    const s = field.sev[band.band]
    out.sev = (1 - fx) * (1 - fy) * s[o] + fx * (1 - fy) * s[o + 1] + (1 - fx) * fy * s[o + N] + fx * fy * s[o + N + 1]
  }
  return out
}

const at: Depth = { depth: 0, sev: 0 } // cloudBetween's own

/**
 * How much cloud lies on the straight line from a to b: the depth (bodyAt) added up over `samples` places along it, km, and the
 * severity of the cloud met, by its depth. Written into `out` (depth: the km), which is returned.
 */
export function cloudBetween(mesh: SculptMesh | null, field: WxField | null, a: Place, b: Place, samples: number, out: Depth): Depth {
  out.depth = 0
  out.sev = 0
  if (mesh === null || field === null || mesh.bands.length === 0) return out
  const north = (b.lat - a.lat) * KM_PER_DEG
  const east = wrapLon(b.lon - a.lon) * KM_PER_DEG * Math.cos(a.lat * RAD)
  const km = Math.hypot(north, east, (b.altM - a.altM) / 1000)
  let [sum, sev] = [0, 0]
  for (let k = 0; k < samples; k++) {
    const t = (k + 0.5) / samples
    bodyAt(mesh, field, a.lat + (b.lat - a.lat) * t, a.lon + wrapLon(b.lon - a.lon) * t, a.altM + (b.altM - a.altM) * t, at)
    sum += at.depth
    sev += at.depth * at.sev
  }
  out.depth = (sum / samples) * km
  out.sev = sum > 0 ? sev / sum : 0
  return out
}

/**
 * The track line's pieces, from each place of `places` to the next: the severity of the body a piece's middle is in (0 … 3), or −1
 * in clear air. Written into `out` (a number a piece), which is returned.
 */
export function trackSeverities(mesh: SculptMesh | null, field: WxField | null, places: readonly Place[], out: Float32Array): Float32Array {
  for (let k = 0; k + 1 < places.length && k < out.length; k++) {
    const [a, b] = [places[k], places[k + 1]]
    bodyAt(mesh, field, (a.lat + b.lat) / 2, a.lon + wrapLon(b.lon - a.lon) / 2, (a.altM + b.altM) / 2, at)
    out[k] = at.depth > IN_BODY ? at.sev : -1
  }
  return out
}
