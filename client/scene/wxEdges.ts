// client/scene/wxEdges.ts
// The hazard areas' edges as the cloud volume's march draws them (cloudShaders.ts hazards()): each ring's corners joined in turn, as
// walls in the field's frame (hazardEdges), and those walls as an image of bytes the shader reads with texelFetch (packEdges: two bytes
// a number; unpackEdge reads one back as the shader does).
// ponytail: a hazard area's wall stands along the frame's up, over a straight line between its corners in the frame, not along the
// Earth's up over a great circle: its top leans by its height times its distance over the Earth's radius (0.3 km for a 12 km top
// 150 km off, 1.5 km at 800 km). An edge that leaves the 819 km the image holds is cut there (a box then draws a corner's line at the
// cut), and one with an end more than about 1,900 km off is not drawn at all. Upgrade: the walls on the field's map; long edges cut on
// their great circle.
import { Cartesian3, Color, Ellipsoid, Matrix4 } from 'cesium'
import type { Bitmap } from './wxField.ts'
import type { Hazard } from './wxGeo.ts'

export const MAX_EDGES = 48 // hazard areas' edges given to the march, at most: the nearest to the aircraft
export const EDGE_TEXELS = 5 // an edge's texels in the image (packEdges)
export const EDGE_KM = 819.2 // an edge's end is packed over ± this in the frame, in 16 bits: 25 m apart
export const EDGE_Q = (2 * EDGE_KM) / 65536
const EDGE_CUT_KM = 819 // an edge is cut where it leaves this, just inside what the image holds
const EDGE_DROP_KM = 300 // an edge with an end this far under the frame's level (the Earth has curved away: about 1,900 km off) is not drawn
export const EDGE_TOP_KM = 32.768 // a wall's base and top are packed over 0 … this: 0.5 m apart
export const HEIGHT_Q = EDGE_TOP_KM / 65536
export const POST_KM = 4 // the fence's posts stand this far apart, the curtain's pleats are half of it wide
export const ALONG_Q = POST_KM / 65536

/** A number as the 16 bits it is packed in: its count of quanta from the least, held to 0 … 65535. */
const word = (v: number, quantum: number, least = 0): number => Math.min(65535, Math.max(0, Math.round((v - least) / quantum)))

/** A hazard area's edge as the march draws it: a wall over the line between two places of the frame, from the area's base to its top. */
export interface HazardEdge {
  ax: number // its two ends, km east and north in the frame
  ay: number
  bx: number
  by: number
  baseKm: number // the wall's heights over the sea
  topKm: number
  rgb: [number, number, number] // the area's colour, 0 … 255
  alongKm: number // how far its first end is from the corner the edge began at, less whole posts (an edge cut to what the image holds): the posts and pleats count from that corner
  first: boolean // the first edge listed of its area
  whole: boolean // every edge of its area is listed, none cut: the area's top face can be found (a ray meets it inside when it would cross an odd number of them)
}

/**
 * The hazard areas' edges nearest a place of the frame (the aircraft; none given: the field's middle), at most max, as walls in the
 * frame (world metres to km round the field's middle at sea level, seaM above the ellipsoid: localFrame): each ring's corners joined in
 * turn, the last to the first. An area's edges stay together and in their ring's order, the area with the nearest edge first. An area
 * that lost an edge (left out as too far, cut, or beyond the frame) is not whole. An edge is cut where it leaves ± EDGE_CUT_KM;
 * one with an end EDGE_DROP_KM under the frame's level is left out (see the header's ponytail). color: an area's CSS colour.
 */
export function hazardEdges(
  hazards: readonly Hazard[], frame: Matrix4, seaM: number, color: (h: Hazard) => string, from: { x: number; y: number } = { x: 0, y: 0 }, max = MAX_EDGES,
): HazardEdge[] {
  interface Found { edge: HazardEdge; area: number; km: number }
  const found: Found[] = []
  const broken = new Set<number>() // the areas that are not whole
  const scratch = new Cartesian3()
  hazards.forEach((h, area) => {
    const [baseKm, topKm] = [h.baseM / 1000, h.topM / 1000]
    if (!(word(topKm, HEIGHT_Q) > word(baseKm, HEIGHT_Q))) return // no height in the image: no wall
    const [r, g, b] = (Color.fromCssColorString(color(h)) ?? Color.WHITE).toBytes()
    for (const ring of h.rings) {
      const at = ring.map(([lon, lat]) => Cartesian3.clone(Matrix4.multiplyByPoint(frame, Cartesian3.fromDegrees(lon, lat, seaM, Ellipsoid.WGS84, scratch), scratch)))
      const n = at.length
      const closed = n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1]
      for (let i = 0; i < (closed ? n - 1 : n); i++) {
        const [p, q] = [at[i], at[(i + 1) % n]]
        const [dx, dy] = [q.x - p.x, q.y - p.y]
        const len = Math.hypot(dx, dy)
        if (len < 1e-6) continue // a corner given twice
        if (p.z < -EDGE_DROP_KM || q.z < -EDGE_DROP_KM) {
          broken.add(area)
          continue
        }
        // the part of it inside the square the image holds (Liang and Barsky's cut)
        let [t0, t1] = [0, 1]
        for (const [d, lo, hi] of [[dx, -EDGE_CUT_KM - p.x, EDGE_CUT_KM - p.x], [dy, -EDGE_CUT_KM - p.y, EDGE_CUT_KM - p.y]]) {
          if (d === 0) {
            if (lo > 0 || hi < 0) t1 = -1
            continue
          }
          t0 = Math.max(t0, Math.min(lo / d, hi / d))
          t1 = Math.min(t1, Math.max(lo / d, hi / d))
        }
        if (t0 > 0 || t1 < 1) broken.add(area)
        if (!(t0 < t1)) continue
        const edge: HazardEdge = {
          ax: p.x + t0 * dx, ay: p.y + t0 * dy, bx: p.x + t1 * dx, by: p.y + t1 * dy, baseKm, topKm, rgb: [r, g, b], alongKm: (t0 * len) % POST_KM, first: false, whole: true,
        }
        const [ex, ey] = [edge.bx - edge.ax, edge.by - edge.ay]
        const t = Math.min(1, Math.max(0, ((from.x - edge.ax) * ex + (from.y - edge.ay) * ey) / (ex * ex + ey * ey)))
        found.push({ edge, area, km: Math.hypot(edge.ax + t * ex - from.x, edge.ay + t * ey - from.y) })
      }
    }
  })
  let kept = found
  if (found.length > max) {
    const nearest = new Set([...found].sort((a, b) => a.km - b.km).slice(0, max))
    for (const f of found) if (!nearest.has(f)) broken.add(f.area)
    kept = found.filter((f) => nearest.has(f))
  }
  const nearestOf = new Map<number, number>() // each area's nearest edge, km
  for (const f of kept) nearestOf.set(f.area, Math.min(nearestOf.get(f.area) ?? Infinity, f.km))
  const order = [...nearestOf.keys()].sort((a, b) => nearestOf.get(a)! - nearestOf.get(b)! || a - b)
  return order.flatMap((area) => kept.filter((f) => f.area === area).map((f, i) => ({ ...f.edge, first: i === 0, whole: !broken.has(area) })))
}

/**
 * The edges as the image the march reads (u_edges): one row, EDGE_TEXELS texels an edge, MAX_EDGES at most (the first ones), the rest
 * blank. A number is two bytes, the high one first. An edge's texels: its first end (east in R and G, north in B and A, over ± EDGE_KM);
 * its second end; its base (R, G) and top (B, A), over 0 … EDGE_TOP_KM; its colour (R, G, B) and in A 1 when it is the first of its
 * area plus 2 when the area is whole; alongKm (R, G), over 0 … POST_KM. One row, so the texture's flip changes nothing.
 */
export function packEdges(edges: readonly HazardEdge[]): Bitmap {
  const data = new Uint8ClampedArray(MAX_EDGES * EDGE_TEXELS * 4)
  const put = (o: number, a: number, b: number): void => {
    data[o] = a >> 8
    data[o + 1] = a & 255
    data[o + 2] = b >> 8
    data[o + 3] = b & 255
  }
  edges.slice(0, MAX_EDGES).forEach((e, k) => {
    const o = k * EDGE_TEXELS * 4
    put(o, word(e.ax, EDGE_Q, -EDGE_KM), word(e.ay, EDGE_Q, -EDGE_KM))
    put(o + 4, word(e.bx, EDGE_Q, -EDGE_KM), word(e.by, EDGE_Q, -EDGE_KM))
    put(o + 8, word(e.baseKm, HEIGHT_Q), word(e.topKm, HEIGHT_Q))
    data.set([e.rgb[0], e.rgb[1], e.rgb[2], (e.first ? 1 : 0) + (e.whole ? 2 : 0)], o + 12)
    put(o + 16, word(e.alongKm, ALONG_Q), 0)
  })
  return { data, width: MAX_EDGES * EDGE_TEXELS, height: 1 }
}

/** Edge k of the image, read as the shader's hazards() reads it (in doubles: the shader's floats differ by under a millimetre). */
export function unpackEdge(image: Bitmap, k: number): HazardEdge {
  const d = image.data
  const o = k * EDGE_TEXELS * 4
  const read = (i: number): number => d[o + i] * 256 + d[o + i + 1]
  return {
    ax: read(0) * EDGE_Q - EDGE_KM, ay: read(2) * EDGE_Q - EDGE_KM, bx: read(4) * EDGE_Q - EDGE_KM, by: read(6) * EDGE_Q - EDGE_KM,
    baseKm: read(8) * HEIGHT_Q, topKm: read(10) * HEIGHT_Q, rgb: [d[o + 12], d[o + 13], d[o + 14]], alongKm: read(16) * ALONG_Q,
    first: d[o + 15] % 2 === 1, whole: d[o + 15] >= 2,
  }
}
