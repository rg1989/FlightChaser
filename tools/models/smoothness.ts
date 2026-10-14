// tools/models/smoothness.ts
// Says how smooth each model's mesh is, in numbers: what "as smooth as our best model" means for every package.
//
//   node tools/models/smoothness.ts [id…]      one line per model (all without ids)
//
// Per model:
// - triangles, vertices, the file's size.
// - hard: of the edges where the skin curves, the share that is shaded hard (the two faces do not share their normals
//   at the edge's ends, so each face shows as a flat patch). A curved edge is one that two faces share, turning
//   between CURVED[0] and CURVED[1] degrees: less is a flat panel, more is a real fold (a trailing edge, a door sill).
// - turn: how far the skin turns across a curved edge, at the median and at the 90th percentile. This is what the
//   outline shows as corners, and what makes highlights jump from face to face.
//   All three are weighted by the edges' lengths: a long edge on the fuselage is seen, a short one in a window frame
//   is not.
// - ring: the number of sides of the fuselage's cross-section, a fifth of the length behind the nose (the corners of
//   its convex outline).
//
// THE TARGET (from the two models rebuilt first with detail.ts, the A320 and the 787-9, and from how they look in the
// app's renderer: round noses and nacelles, no facet in the outline at the lab's `nose` and `front-left` views):
//   hard ≤ 5 %, turn ≤ 6° at the median and ≤ 20° at the 90th percentile, ring ≥ 32 sides (TARGET below), inside the
//   size limit (client/scene/model.test.ts).
// The 90th percentile is high on every aircraft: it is the leading edges, the lips and the fairings' ends, where the
// radius is a few centimetres. Smooth-shaded, they do not show.
// A model that misses on `hard` needs detail.ts at all (or a larger smoothDeg). One that misses on `turn` or `ring`
// has a coarse source: detail.ts subdivides it by itself; "subdivide": 2 or 3 in its recipe forces more passes.
import { readFileSync, statSync } from 'node:fs'
import type { ModelManifestEntry } from '../../client/types.ts'
import { edgesOf, faceNormals, type Tris } from './detail.ts'
import { readGlb, type Glb } from './glb.ts'
import { loadBody, type Mesh } from './light-anchors.ts'
import { asked, readManifest } from './packages.ts'

/** The turn across an edge, in degrees, between which the skin counts as curved. */
export const CURVED: [number, number] = [0.5, 60]
/** What every model must reach (see the header). */
export const TARGET = { hard: 5, p50: 6, p90: 20, ring: 32 }

export interface Smoothness {
  triangles: number
  vertices: number
  hard: number // per cent of the curved edges' length
  p50: number // degrees
  p90: number
}

/** A GLB's mesh, measured (see the header). Vertices at one place count as one, whatever their normals. */
export function measure(g: Pick<Glb, 'pos' | 'nrm' | 'idx'>): Smoothness {
  const nv = g.pos.length / 3
  // one id per place (a hundredth of a millimetre)
  const ids = new Map<string, number>()
  const at = new Int32Array(nv)
  const p: number[] = []
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(g.pos[3 * i] * 1e5)},${Math.round(g.pos[3 * i + 1] * 1e5)},${Math.round(g.pos[3 * i + 2] * 1e5)}`
    let id = ids.get(k)
    if (id === undefined) { id = ids.size; ids.set(k, id); p.push(g.pos[3 * i], g.pos[3 * i + 1], g.pos[3 * i + 2]) }
    at[i] = id
  }
  const m: Tris = { p: Float64Array.from(p), tri: Uint32Array.from(g.idx, (i) => at[i]) }
  const fn = faceNormals(m)
  const next = (s: number): number => s - (s % 3) + ((s + 1) % 3)
  const same = (i: number, j: number): boolean => g.nrm[3 * i] * g.nrm[3 * j] + g.nrm[3 * i + 1] * g.nrm[3 * j + 1] + g.nrm[3 * i + 2] * g.nrm[3 * j + 2] > 0.999
  const turns: Array<[deg: number, len: number]> = []
  let [hard, all] = [0, 0]
  for (const sides of edgesOf(m).values()) {
    if (sides.length !== 2) continue
    const [s, r] = sides
    if (m.tri[s] !== m.tri[next(r)] || m.tri[s] === m.tri[next(s)]) continue // the two faces must face the same way out
    const [f, h] = [s - (s % 3), r - (r % 3)]
    const deg = (Math.acos(Math.max(-1, Math.min(1, fn[f] * fn[h] + fn[f + 1] * fn[h + 1] + fn[f + 2] * fn[h + 2]))) * 180) / Math.PI
    if (!(deg >= CURVED[0] && deg <= CURVED[1])) continue
    const [a, b] = [3 * m.tri[s], 3 * m.tri[next(s)]]
    const len = Math.hypot(m.p[a] - m.p[b], m.p[a + 1] - m.p[b + 1], m.p[a + 2] - m.p[b + 2])
    turns.push([deg, len])
    all += len
    if (!same(g.idx[s], g.idx[next(r)]) || !same(g.idx[next(s)], g.idx[r])) hard += len
  }
  turns.sort((x, y) => x[0] - y[0])
  const at_ = (q: number): number => {
    let sum = 0
    for (const [deg, len] of turns) { sum += len; if (sum >= q * all) return deg }
    return 0
  }
  return { triangles: g.idx.length / 3, vertices: nv, hard: all > 0 ? (100 * hard) / all : 0, p50: at_(0.5), p90: at_(0.9) }
}

/**
 * The number of sides of the mesh's cross-section at x (the body frame: nose +x, up +z), within halfWidth of the
 * centre line when given: the corners of the section's convex outline where it turns more than 2°.
 */
export function ringSides(m: Mesh, x: number, halfWidth = Infinity): number {
  const pts: Array<[number, number]> = []
  const { p, tri } = m
  for (let f = 0; f < tri.length; f += 3) {
    for (let k = 0; k < 3; k++) {
      const [u, v] = [3 * tri[f + k], 3 * tri[f + ((k + 1) % 3)]]
      const [du, dv] = [p[u] - x, p[v] - x]
      if (du < 0 === dv < 0) continue
      const t = du / (du - dv)
      const q: [number, number] = [p[u + 1] + t * (p[v + 1] - p[u + 1]), p[u + 2] + t * (p[v + 2] - p[u + 2])]
      if (Math.abs(q[0]) <= halfWidth) pts.push(q)
    }
  }
  if (pts.length < 3) return 0
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: Array<[number, number]>): Array<[number, number]> => {
    const h: Array<[number, number]> = []
    for (const q of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 1e-12) h.pop()
      h.push(q)
    }
    return h.slice(0, -1)
  }
  const hull = [...half(pts), ...half(pts.toReversed())]
  // corners: the heading changes by more than 2° since the last corner
  const heading = (i: number): number => Math.atan2(hull[(i + 1) % hull.length][1] - hull[i][1], hull[(i + 1) % hull.length][0] - hull[i][0])
  let sides = 0
  let last = heading(hull.length - 1)
  for (let i = 0; i < hull.length; i++) {
    const h = heading(i)
    const d = Math.abs(((h - last + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
    if (d > (2 * Math.PI) / 180) { sides++; last = h }
  }
  return sides
}

/** e's fuselage ring: the section a fifth of the length behind the nose, as wide as the paint map's fuselage. */
export function ringOf(e: ModelManifestEntry, m = loadBody(e)): number {
  let [lo, hi] = [Infinity, -Infinity]
  for (let i = 0; i < m.p.length; i += 3) { lo = Math.min(lo, m.p[i]); hi = Math.max(hi, m.p[i]) }
  return ringSides(m, hi - 0.22 * (hi - lo), e.paint === undefined ? Infinity : e.paint.bodyHalfWidth + 0.1)
}

/** One line of numbers. */
export function describe(s: Smoothness, bytes?: number, ring?: number): string {
  return `${String(s.triangles).padStart(6)} triangles ${String(s.vertices).padStart(6)} vertices  hard ${s.hard.toFixed(0).padStart(3)} %  turn ${s.p50.toFixed(1).padStart(5)}° / ${s.p90.toFixed(1).padStart(5)}°${ring === undefined ? '' : `  ring ${String(ring).padStart(3)}`}${bytes === undefined ? '' : `  ${(bytes / 1024).toFixed(0).padStart(5)} KB`}`
}

/** Where s misses the target, in words; empty when it reaches it. */
export function misses(s: Smoothness, ring: number): string[] {
  return [
    ...(s.hard > TARGET.hard ? [`hard ${s.hard.toFixed(0)} % > ${TARGET.hard} %`] : []),
    ...(s.p50 > TARGET.p50 ? [`median turn ${s.p50.toFixed(1)}° > ${TARGET.p50}°`] : []),
    ...(s.p90 > TARGET.p90 ? [`90th-percentile turn ${s.p90.toFixed(1)}° > ${TARGET.p90}°`] : []),
    ...(ring < TARGET.ring ? [`ring ${ring} < ${TARGET.ring}`] : []),
  ]
}

if (import.meta.main) {
  const PUBLIC = new URL('../../public/', import.meta.url)
  for (const e of asked(readManifest())) {
    const url = new URL(e.uri, PUBLIC)
    try {
      const s = measure(readGlb(new Uint8Array(readFileSync(url))))
      const ring = ringOf(e)
      const miss = misses(s, ring)
      console.log(`${e.id.padEnd(10)} ${describe(s, statSync(url).size, ring)}  ${miss.length === 0 ? 'reaches the target' : `MISSES: ${miss.join('; ')}`}`)
    } catch (err) { // a model in another layout (the default model): not one of ours to rebuild
      console.log(`${e.id.padEnd(10)} ${(err as Error).message}`)
    }
  }
}
