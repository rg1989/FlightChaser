// tools/models/detail.ts
// Rebuilds a package's model.glb from its unchanged full-detail source file, smooth-shaded, in exactly the frame, size
// and place of the mesh it replaces, and measures the package again. The shipped meshes were the sources joined and
// decimated to a fifth of their triangles, many with every face shaded flat: a fuselage drawn as a ring of 18 flat
// sides. This tool takes the whole source instead, and shades it as a curved skin.
//
//   node tools/models/detail.ts <id…>      on the machine that has Blender (BLENDER, else ~/fh-blender/…, else `blender`)
//   node tools/models/detail.ts --mesh-only <id…>      model.glb only: model.json is not measured again
//
// THE TARGET every model must reach (smoothness.ts TARGET, and `node tools/models/smoothness.ts <id>` prints it):
//   hard ≤ 5 % of the curved edges' length, turn ≤ 6° at the median and ≤ 20° at the 90th percentile,
//   ring ≥ 32 sides, model.glb ≤ 1 MB (2 MB at most, with a reason in client/scene/model.test.ts).
//
// The package's recipe.json says what to build from:
//   "mesh": { "source": "flightairmap-glb/A320.glb", "date": "2026-10-13" }
// source: the file under third_party/aircraft-models/source/. date: goes into the GLB's copyright line (today without
// it). Optional: "smoothDeg" (35), "subdivide" (the number of passes; without it the tool chooses: see step 4),
// "turnDeg" (6), "bulgePct" (0.01), "maskPct" (1), "glass" (true), "scale" (1), "drop" (object names), "maxKB" (1024).
//
// The steps:
// 1. detail.py (Blender) writes the source's whole surface as plain triangles. Vertices closer than 1/50,000 of the
//    model's size are welded, so the seams that UV maps and flat shading cut into the source close.
// 2. Register: the source is laid over the mesh it replaces, not turned by a new guess. Of the 48 ways to map axes to
//    axes, the one whose surface the old mesh's vertices lie on; the move by least squares on the nearest surface points,
//    at the recipe's scale (1: a free scale fitted to a coarse old mesh comes out too large). A fit worse than FIT_MEDIAN / FIT_P95 of the model's length is an error. The first run
//    keeps the mesh it replaces in SHIPPED (.work/shipped-models/<id>.glb, or the folder in SHIPPED_DIR), and every
//    later run registers on that copy: a dense mesh is never registered on a dense mesh. (.work is not in git: the
//    mesh that a re-meshed model replaced is `git show <commit before>:public/models/<id>/model.glb`.)
// 3. Mask: a part of the source (triangles joined through shared vertices) of which more than half lies farther than
//    maskPct % of the length from the old mesh's surface goes: what the old mesh left out on purpose (a pilot, ground
//    equipment). No list of part names. The tool names each source object that lost triangles: read that line.
// 4. Subdivide, where the source is itself coarse. One pass cuts every edge along which the skin turns more than
//    turnDeg and whose curve stands more than bulgePct % of the model's size above the straight edge (5 mm on an
//    airliner), and puts the new vertex on the curve through the edge's ends that their normals give (a PN triangle's
//    edge). The old vertices stay where they are, so nothing shrinks and no thin part rounds off; a sharp edge (a
//    trailing edge, a cowl lip, a door sill: over smoothDeg) stays sharp; a flat panel gets no new triangle.
//    Without "subdivide" in the recipe the tool passes until the mesh reaches the target's turn (three passes at most,
//    and never over 1 MB: then it keeps the pass before). "subdivide": 0 switches it off; a number fixes the passes.
//    A source denser than 1 MB allows is simplified until it fits (simplified: meshoptimizer's edge collapse).
// 5. Shade: one normal per vertex and smooth group. Two faces are in one group when they meet at less than smoothDeg
//    (a wing's trailing edge, a door sill, the fan face against the cowl stay sharp). COLOR_0 is the shade the old
//    meshes carry (variants.ts `shade`). Glass: the source's see-through triangles on the fuselage (a windscreen)
//    get a near-black COLOR_0, which the paint shader draws as dark glass (client/scene/livery.ts). Not the ones in
//    the cabin window row that model.json's paint map has: the shader draws that row itself.
// It writes the layout glb.ts reads (one mesh, one primitive: POSITION, NORMAL, COLOR_0, indices), with the old file's
// nodes, material and copyright line, to which it adds what was done. The licence does not change.
// 6. Measure: light-anchors.ts, profile.ts and outline.ts with --write (not gear-glb.ts: the gear is built from the
//    recipe, run it yourself when the gear must follow). Then it prints the smoothness line, and how far each measured
//    value of model.json moved: it is the same aircraft, so a few centimetres. Read that list.
// 7. lod.ts writes the light copy the traffic draws (lod.glb).
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MeshoptSimplifier } from 'meshoptimizer/simplifier'
import { readGlb, writeGlb, type Glb } from './glb.ts'
import type { Paint } from '../../client/types.ts'
import { fileOf, readManifest, recipeOf } from './packages.ts'
import { describe, measure, misses, ringOf, TARGET } from './smoothness.ts'

await MeshoptSimplifier.ready // meshoptimizer's simplifier (Cesium brings it): simplified()

/** Triangles: xyz per vertex, three vertex indices per triangle, and (from a source) each triangle's object. */
export interface Tris { p: Float64Array; tri: Uint32Array; owner?: Uint16Array }

/** A source object as detail.py names it. */
export interface SourceObject { name: string; triangles: number; glass?: boolean; hidden: boolean; modifiers: string[] }

/** recipe.json `mesh`: what detail.ts builds model.glb from. */
export interface MeshRecipe {
  source: string // the file, under third_party/aircraft-models/source/
  date?: string // when it was re-meshed (the GLB's copyright line)
  smoothDeg?: number // faces that meet at less than this are shaded as one curved skin (35)
  subdivide?: number // passes of cutting the edges that turn more than turnDeg (0: none; without it: until the target is reached)
  turnDeg?: number // 6
  bulgePct?: number // an edge is cut only when its curve stands more than this share of the model's size above it (0.01)
  glass?: boolean // the source's see-through triangles on the fuselage are drawn as dark glass (true)
  maskPct?: number // a source triangle farther than this share of the length from the old mesh goes (1; 0: keep all)
  maxKB?: number // the file's most (1024; less where a derived model adds parts to it: the A320neo's sharklets on the A320)
  drop?: string[] // source objects left out by name, where the mask cannot tell (a propeller disc on the blades, a pod on a wing tip)
  scale?: number // the source's size on the mesh it replaces (1: the shipped meshes are their sources decimated, never scaled; a model built larger says how much)
}

export const SMOOTH_DEG = 35
export const TURN_DEG = 6
export const BULGE_PCT = 0.01
/** Without `subdivide` in the recipe: the most passes, and the size a pass must not go over. */
export const AUTO_PASSES = 3
export const AUTO_BYTES = 1024 * 1024
export const MASK_PCT = 1
/** A mesh over AUTO_BYTES is simplified with this error (a share of its size: 3 cm on an airliner), raised up to 8 times if it must be. */
export const FIT_ERROR = 0.0005
/** The worst fit accepted, as shares of the model's length: the median and the 95th percentile of the old vertices' distance to the source. */
export const FIT_MEDIAN = 0.001
export const FIT_P95 = 0.01
const WELD = 2e-5 // of the bounding box's diagonal
const MIN_EDGE = 0.0015 // of the diagonal: a shorter edge is not cut (its curve is under a millimetre high)

const SOURCES = fileURLToPath(new URL('../../third_party/aircraft-models/source/', import.meta.url))
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const SHIPPED = process.env.SHIPPED_DIR ?? path.join(ROOT, '.work', 'shipped-models')

// ---------- reading ----------

/** detail.py's file: the triangles and the names of the objects they came from. */
export function readRaw(bytes: Uint8Array): Tris & { objects: SourceObject[] } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== 'FCM1') throw new Error('not a detail.py file')
  const n = dv.getUint32(4, true)
  const head = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n)))
  let o = 8 + n
  const p = Float64Array.from({ length: 3 * head.vertices }, (_, i) => dv.getFloat32(o + 4 * i, true))
  o += 12 * head.vertices
  const tri = Uint32Array.from({ length: 3 * head.triangles }, (_, i) => dv.getUint32(o + 4 * i, true))
  o += 12 * head.triangles
  const owner = Uint16Array.from({ length: head.triangles }, (_, i) => dv.getUint16(o + 2 * i, true))
  return { p, tri, owner, objects: head.objects }
}

export function bounds(p: Float64Array): { lo: number[]; hi: number[]; diag: number; long: number } {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < p.length; i++) {
    if (p[i] < lo[i % 3]) lo[i % 3] = p[i]
    if (p[i] > hi[i % 3]) hi[i % 3] = p[i]
  }
  const d = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
  return { lo, hi, diag: Math.hypot(d[0], d[1], d[2]), long: Math.max(d[0], d[1], d[2]) }
}

// ---------- welding ----------

/**
 * m with vertices closer than tol made one, and without the triangles that leaves with no area or that are there twice
 * (the same three vertices the same way round).
 */
export function weld(m: Tris, tol: number): Tris {
  const { p, tri } = m
  const nv = p.length / 3
  const cells = new Map<number, number[]>()
  const key = (x: number, y: number, z: number): number => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0
  const to = new Int32Array(nv)
  const out: number[] = []
  for (let i = 0; i < nv; i++) {
    const [x, y, z] = [p[3 * i], p[3 * i + 1], p[3 * i + 2]]
    const [cx, cy, cz] = [Math.floor(x / tol), Math.floor(y / tol), Math.floor(z / tol)]
    let found = -1
    for (let dx = -1; dx <= 1 && found < 0; dx++) for (let dy = -1; dy <= 1 && found < 0; dy++) for (let dz = -1; dz <= 1 && found < 0; dz++) {
      for (const j of cells.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
        if (Math.hypot(out[3 * j] - x, out[3 * j + 1] - y, out[3 * j + 2] - z) <= tol) { found = j; break }
      }
    }
    if (found < 0) {
      found = out.length / 3
      out.push(x, y, z)
      const k = key(cx, cy, cz)
      const c = cells.get(k)
      if (c === undefined) cells.set(k, [found]); else c.push(found)
    }
    to[i] = found
  }
  const q = Float64Array.from(out)
  const seen = new Set<string>()
  const t: number[] = []
  const own: number[] = []
  for (let f = 0; f < tri.length; f += 3) {
    let [a, b, c] = [to[tri[f]], to[tri[f + 1]], to[tri[f + 2]]]
    if (a === b || b === c || c === a) continue
    if (area2(q, a, b, c) < 1e-9 * tol * tol) continue
    while (a > b || a > c) [a, b, c] = [b, c, a] // the least first, the same way round
    const k = `${a},${b},${c}`
    if (seen.has(k)) continue
    seen.add(k)
    t.push(a, b, c)
    if (m.owner) own.push(m.owner[f / 3])
  }
  return { p: q, tri: Uint32Array.from(t), owner: m.owner ? Uint16Array.from(own) : undefined }
}

/** Twice the triangle's area, squared. */
function area2(p: Float64Array, a: number, b: number, c: number): number {
  const ux = p[3 * b] - p[3 * a], uy = p[3 * b + 1] - p[3 * a + 1], uz = p[3 * b + 2] - p[3 * a + 2]
  const vx = p[3 * c] - p[3 * a], vy = p[3 * c + 1] - p[3 * a + 1], vz = p[3 * c + 2] - p[3 * a + 2]
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  return nx * nx + ny * ny + nz * nz
}

// ---------- the nearest point of a surface ----------

/** A mesh's triangles in a grid of cells, to ask for the surface's nearest point. */
export class Surface {
  private readonly p: Float64Array
  private readonly tri: Uint32Array
  private readonly lo: number[]
  private readonly h: number
  private readonly n: number[]
  private readonly start: Uint32Array
  private readonly items: Uint32Array
  private readonly stamp: Uint32Array
  private tick = 0
  /** The nearest point found by the last `distance` call. */
  readonly at = [0, 0, 0]

  constructor(m: Tris, cells = 80) {
    this.p = m.p
    this.tri = m.tri
    const b = bounds(m.p)
    this.lo = b.lo
    this.h = Math.max(b.long / cells, 1e-9)
    this.n = [0, 1, 2].map((d) => Math.max(1, Math.ceil((b.hi[d] - b.lo[d]) / this.h + 1e-9)))
    const nt = m.tri.length / 3
    const count = new Uint32Array(this.n[0] * this.n[1] * this.n[2] + 1)
    const range = (f: number): number[] => {
      const r: number[] = []
      for (let d = 0; d < 3; d++) {
        const v = [m.p[3 * m.tri[3 * f] + d], m.p[3 * m.tri[3 * f + 1] + d], m.p[3 * m.tri[3 * f + 2] + d]]
        r.push(this.cell(Math.min(...v), d), this.cell(Math.max(...v), d))
      }
      return r
    }
    const each = (f: number, fn: (c: number) => void): void => {
      const r = range(f)
      for (let x = r[0]; x <= r[1]; x++) for (let y = r[2]; y <= r[3]; y++) for (let z = r[4]; z <= r[5]; z++) fn((x * this.n[1] + y) * this.n[2] + z)
    }
    for (let f = 0; f < nt; f++) each(f, (c) => count[c + 1]++)
    for (let i = 1; i < count.length; i++) count[i] += count[i - 1]
    this.start = count
    this.items = new Uint32Array(count[count.length - 1])
    const fill = count.slice(0, -1)
    for (let f = 0; f < nt; f++) each(f, (c) => { this.items[fill[c]++] = f })
    this.stamp = new Uint32Array(nt)
  }

  private cell(v: number, d: number): number {
    return Math.max(0, Math.min(this.n[d] - 1, Math.floor((v - this.lo[d]) / this.h)))
  }

  /** The distance from (x, y, z) to the surface, or Infinity when it is more than `max`; the nearest point is in `at`. */
  distance(x: number, y: number, z: number, max = Infinity): number {
    const { n, h, lo } = this
    const q = [x, y, z]
    const c = [0, 1, 2].map((d) => Math.floor((q[d] - lo[d]) / h))
    // the first ring that reaches the grid, the last that can hold anything
    let r0 = 0, rEnd = 0
    for (let d = 0; d < 3; d++) {
      r0 = Math.max(r0, -c[d], c[d] - (n[d] - 1))
      rEnd = Math.max(rEnd, c[d], n[d] - 1 - c[d])
    }
    let best = Infinity
    this.tick++
    // what is not in the rings 0 … r − 1 is at least (r − 1) cells and the point's own room in its cell away
    let room = Infinity
    for (let d = 0; d < 3; d++) room = Math.min(room, q[d] - (lo[d] + c[d] * h), lo[d] + (c[d] + 1) * h - q[d])
    for (let r = Math.max(0, r0); r <= rEnd; r++) {
      const least = r === 0 ? 0 : (r - 1) * h + room
      if (best <= least || least > max) break // nothing nearer is left in the rings to come
      const [x0, x1] = [Math.max(0, c[0] - r), Math.min(n[0] - 1, c[0] + r)]
      const [y0, y1] = [Math.max(0, c[1] - r), Math.min(n[1] - 1, c[1] + r)]
      const [z0, z1] = [Math.max(0, c[2] - r), Math.min(n[2] - 1, c[2] + r)]
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const shell = Math.abs(ix - c[0]) === r || Math.abs(iy - c[1]) === r
        for (let iz = z0; iz <= z1; iz += shell ? 1 : Math.max(1, z1 - z0)) {
          if (!shell && Math.abs(iz - c[2]) !== r) continue
          const k = (ix * n[1] + iy) * n[2] + iz
          for (let i = this.start[k]; i < this.start[k + 1]; i++) {
            const f = this.items[i]
            if (this.stamp[f] === this.tick) continue
            this.stamp[f] = this.tick
            const d2 = this.toTriangle(f, x, y, z)
            if (d2 < best * best) {
              best = Math.sqrt(d2)
              this.at[0] = hit[0]; this.at[1] = hit[1]; this.at[2] = hit[2]
            }
          }
        }
      }
    }
    return best <= max ? best : Infinity
  }

  /** The squared distance from a point to triangle f; its nearest point goes to `hit` (Ericson, Real-Time Collision Detection 5.1.5). */
  private toTriangle(f: number, x: number, y: number, z: number): number {
    const p = this.p
    const a = 3 * this.tri[3 * f], b = 3 * this.tri[3 * f + 1], c = 3 * this.tri[3 * f + 2]
    const abx = p[b] - p[a], aby = p[b + 1] - p[a + 1], abz = p[b + 2] - p[a + 2]
    const acx = p[c] - p[a], acy = p[c + 1] - p[a + 1], acz = p[c + 2] - p[a + 2]
    const apx = x - p[a], apy = y - p[a + 1], apz = z - p[a + 2]
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz
    let v = 0, w = 0
    const bpx = x - p[b], bpy = y - p[b + 1], bpz = z - p[b + 2]
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz
    const cpx = x - p[c], cpy = y - p[c + 1], cpz = z - p[c + 2]
    const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4
    if (d1 <= 0 && d2 <= 0) { v = 0; w = 0 }
    else if (d3 >= 0 && d4 <= d3) { v = 1; w = 0 }
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) { v = d1 / (d1 - d3); w = 0 }
    else if (d6 >= 0 && d5 <= d6) { v = 0; w = 1 }
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) { v = 0; w = d2 / (d2 - d6) }
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { w = (d4 - d3) / (d4 - d3 + (d5 - d6)); v = 1 - w }
    else { const k = 1 / (va + vb + vc); v = vb * k; w = vc * k }
    hit[0] = p[a] + abx * v + acx * w
    hit[1] = p[a + 1] + aby * v + acy * w
    hit[2] = p[a + 2] + abz * v + acz * w
    return (x - hit[0]) ** 2 + (y - hit[1]) ** 2 + (z - hit[2]) ** 2
  }
}
const hit = [0, 0, 0]

// ---------- registering ----------

/** How a source lies over the mesh it replaces: q = s · M · p + t. M maps axes to axes (row-major; a mirror when det < 0). */
export interface Fit {
  m: number[]
  s: number
  t: [number, number, number]
  mirrored: boolean
  median: number // the old mesh's vertices to the source's surface, in the old mesh's units…
  p95: number
  max: number // …the farthest (searched to a tenth of the size: "at least" beyond)
  runnerUp: number // the least median among the other ways round that were tried: far above `median` when the choice is clear
}

/** The 48 matrices that map axes to axes. */
function axisMaps(): number[][] {
  const out: number[][] = []
  for (const perm of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    for (let s = 0; s < 8; s++) {
      const m = new Array<number>(9).fill(0)
      for (let r = 0; r < 3; r++) m[3 * r + perm[r]] = s & (1 << r) ? -1 : 1
      out.push(m)
    }
  }
  return out
}

const det3 = (m: number[]): number =>
  m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])

/** The surface's centre of area, and the root-mean-square distance of the surface from it. */
function areaMoments(m: Tris): { c: number[]; rms: number } {
  const { p, tri } = m
  let sum = 0
  const c = [0, 0, 0]
  for (let f = 0; f < tri.length; f += 3) {
    const a = Math.sqrt(area2(p, tri[f], tri[f + 1], tri[f + 2]))
    sum += a
    for (let d = 0; d < 3; d++) c[d] += (a * (p[3 * tri[f] + d] + p[3 * tri[f + 1] + d] + p[3 * tri[f + 2] + d])) / 3
  }
  for (let d = 0; d < 3; d++) c[d] /= sum
  let r = 0
  for (let f = 0; f < tri.length; f += 3) {
    const a = Math.sqrt(area2(p, tri[f], tri[f + 1], tri[f + 2]))
    for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) r += (a / 3) * (p[3 * tri[f + k] + d] - c[d]) ** 2
  }
  return { c, rms: Math.sqrt(r / sum) }
}

/** p under a fit: s · M · p + t. */
export function applyFit(f: Pick<Fit, 'm' | 's' | 't'>, p: Float64Array): Float64Array {
  const out = new Float64Array(p.length)
  for (let i = 0; i < p.length; i += 3) {
    for (let r = 0; r < 3; r++) out[i + r] = f.s * (f.m[3 * r] * p[i] + f.m[3 * r + 1] * p[i + 1] + f.m[3 * r + 2] * p[i + 2]) + f.t[r]
  }
  return out
}

/**
 * Lays `source` over `old` (see the header, step 2). Starts each of the 48 ways round from the two surfaces' centres
 * of area and spreads (decimation keeps both), scores it by the old vertices' distance to the source's surface, and
 * refines the best six: scale and move by least squares on the nearest points, until they stop changing.
 * Throws nothing: the caller judges the fit.
 */
export function register(old: Tris, source: Tris, scale?: number): Fit {
  const surface = new Surface(source)
  const [a, b] = [areaMoments(old), areaMoments(source)]
  const size = bounds(old.p).diag
  const nv = old.p.length / 3
  const sample = (count: number): number[] => {
    const step = Math.max(1, Math.floor(nv / count))
    const out: number[] = []
    for (let i = 0; i < nv; i += step) out.push(i)
    return out
  }
  // the old vertex i in the source's frame under (m, s, t), its distance there in the old mesh's units, its nearest point back in the old frame
  const near = [0, 0, 0]
  const dist = (m: number[], s: number, t: number[], i: number, max: number): number => {
    const v = [old.p[3 * i] - t[0], old.p[3 * i + 1] - t[1], old.p[3 * i + 2] - t[2]]
    const q = [0, 1, 2].map((c) => (m[c] * v[0] + m[3 + c] * v[1] + m[6 + c] * v[2]) / s) // Mᵀ v / s
    const d = surface.distance(q[0], q[1], q[2], max / s) * s
    for (let r = 0; r < 3; r++) near[r] = s * (m[3 * r] * surface.at[0] + m[3 * r + 1] * surface.at[1] + m[3 * r + 2] * surface.at[2]) + t[r]
    return d
  }
  const median = (v: number[], q = 0.5): number => v.toSorted((x, y) => x - y)[Math.min(v.length - 1, Math.floor(q * v.length))]
  const s0 = a.rms / b.rms
  const start = (m: number[], s = s0): number[] => [0, 1, 2].map((r) => a.c[r] - s * (m[3 * r] * b.c[0] + m[3 * r + 1] * b.c[1] + m[3 * r + 2] * b.c[2]))
  const few = sample(400)
  const cap = 0.05 * size
  const scored = axisMaps().map((m) => {
    const t = start(m)
    return { m, score: median(few.map((i) => Math.min(cap, dist(m, s0, t, i, cap)))) }
  }).sort((x, y) => x.score - y.score)
  const some = sample(3000)
  const refine = (m: number[], fixed?: number): Fit => {
    let s = fixed ?? s0
    let t = start(m, s)
    let reach = cap
    for (let it = 0; it < 100; it++) {
      const pairs: number[][] = []
      const ds: number[] = []
      for (const i of some) {
        const d = dist(m, s, t, i, reach)
        if (d === Infinity) continue
        ds.push(d)
        pairs.push([old.p[3 * i], old.p[3 * i + 1], old.p[3 * i + 2], near[0], near[1], near[2]])
      }
      if (pairs.length < 3) break
      reach = Math.max(4 * median(ds), 1e-6 * size)
      const mp = [0, 0, 0], mc = [0, 0, 0]
      for (const q of pairs) for (let d = 0; d < 3; d++) { mp[d] += q[d] / pairs.length; mc[d] += q[3 + d] / pairs.length }
      let [num, den] = [0, 0]
      for (const q of pairs) for (let d = 0; d < 3; d++) { num += (q[3 + d] - mc[d]) * (q[d] - mp[d]); den += (q[3 + d] - mc[d]) ** 2 }
      const k = fixed !== undefined ? 1 : den > 0 ? num / den : 1
      const move = [0, 1, 2].map((d) => mp[d] - k * mc[d])
      s *= k
      t = t.map((v, d) => k * v + move[d])
      if (Math.abs(k - 1) < 1e-9 && Math.hypot(move[0] + (k - 1) * mc[0], move[1] + (k - 1) * mc[1], move[2] + (k - 1) * mc[2]) < 1e-8 * size) break
    }
    const all: number[] = []
    for (let i = 0; i < nv; i++) all.push(Math.min(0.1 * size, dist(m, s, t, i, 0.1 * size)))
    return { m, s, t: t as [number, number, number], mirrored: det3(m) < 0, median: median(all), p95: median(all, 0.95), max: Math.max(...all), runnerUp: Infinity }
  }
  // An aircraft is nearly its own mirror image, so the rough scores of a way round and of its mirror are close: the
  // best six are refined, and the one that fits best after that is taken. Each is refined twice, with the scale free
  // and with the scale 1: nearest points pull only weakly on the scale, and most sources are the size of their model
  // already. A turn is taken before a mirror, and the scale 1 before another, unless the other fits clearly better.
  // With `scale` given (the recipe's), the way round found so is fitted again at that scale: a free scale fitted to a
  // coarse decimated mesh comes out up to 1.5 % too large (the A330-300's would be 0.96 m longer than the aircraft it replaces).
  const unit = Math.abs(s0 - 1) < 0.05
  const fits = scored.slice(0, 6).flatMap((c) => [refine(c.m), ...(unit ? [refine(c.m, 1)] : [])])
  const cost = (x: Fit): number => (x.median + x.p95) * (x.mirrored ? 1.5 : 1) * (x.s === 1 ? 1 : 1.2)
  fits.sort((x, y) => cost(x) - cost(y))
  const best = scale === undefined || fits[0].s === scale ? fits[0] : refine(fits[0].m, scale) // the way round as found, at the recipe's size
  return { ...best, runnerUp: Math.min(...fits.filter((x) => x.m !== best.m).map((x) => x.median)) }
}

// ---------- the mask ----------

/**
 * Which of m's triangles to keep (both meshes in one frame). A triangle is far when a corner or its middle is more
 * than `reach` from `old`'s surface. The mask works on whole parts (triangles joined through shared vertices): a part
 * goes when more than half of its area is far, and stays whole otherwise. So a part the old mesh never had goes (a
 * pilot, a tow bar), and a part that decimation only wore down (an exhaust cone inside its nozzle) keeps every triangle.
 */
export function mask(m: Tris, old: Tris, reach: number): boolean[] {
  const surface = new Surface(old)
  const { p, tri } = m
  const parent = Int32Array.from({ length: p.length / 3 }, (_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }
  const far = new Map<number, number>(), all = new Map<number, number>()
  for (let f = 0; f < tri.length; f += 3) {
    parent[find(tri[f + 1])] = find(tri[f])
    parent[find(tri[f + 2])] = find(tri[f])
  }
  for (let f = 0; f < tri.length; f += 3) {
    const [a, b, c] = [3 * tri[f], 3 * tri[f + 1], 3 * tri[f + 2]]
    const mid = [0, 1, 2].map((d) => (p[a + d] + p[b + d] + p[c + d]) / 3)
    const near = [[p[a], p[a + 1], p[a + 2]], [p[b], p[b + 1], p[b + 2]], [p[c], p[c + 1], p[c + 2]], mid].every((q) => surface.distance(q[0], q[1], q[2], reach) <= reach)
    const part = find(tri[f])
    const area = Math.sqrt(area2(p, tri[f], tri[f + 1], tri[f + 2]))
    all.set(part, (all.get(part) ?? 0) + area)
    if (!near) far.set(part, (far.get(part) ?? 0) + area)
  }
  return Array.from({ length: tri.length / 3 }, (_, f) => { const part = find(tri[3 * f]); return (far.get(part) ?? 0) <= 0.5 * all.get(part)! })
}

/** m with only the triangles `keep` names, and the vertices they use. */
export function pick(m: Tris, keep: boolean[]): Tris {
  const to = new Int32Array(m.p.length / 3).fill(-1)
  const p: number[] = []
  const tri: number[] = []
  const owner: number[] = []
  for (let f = 0; f < keep.length; f++) {
    if (!keep[f]) continue
    for (let k = 0; k < 3; k++) {
      const v = m.tri[3 * f + k]
      if (to[v] < 0) { to[v] = p.length / 3; p.push(m.p[3 * v], m.p[3 * v + 1], m.p[3 * v + 2]) }
      tri.push(to[v])
    }
    if (m.owner) owner.push(m.owner[f])
  }
  return { p: Float64Array.from(p), tri: Uint32Array.from(tri), owner: m.owner ? Uint16Array.from(owner) : undefined }
}

// ---------- smooth groups ----------

/** A welded mesh's shading: each triangle corner's group (a vertex of the mesh to draw), each group's normal and vertex. */
export interface Groups {
  corner: Int32Array // per triangle corner: its group
  n: Float64Array // per group: its unit normal
  vertex: Int32Array // per group: its vertex in the welded mesh
  fn: Float64Array // per triangle: its unit normal
}

/** The edge between vertices a and b, whichever way round. */
const edgeKey = (a: number, b: number, nv: number): number => (a < b ? a * nv + b : b * nv + a)

/** Every edge's triangle sides: side 3f + k runs from triangle f's corner k to its next corner. */
export function edgesOf(m: Tris): Map<number, number[]> {
  const nv = m.p.length / 3
  const edges = new Map<number, number[]>()
  for (let s = 0; s < m.tri.length; s++) {
    const f = s - (s % 3)
    const k = edgeKey(m.tri[s], m.tri[f + ((s + 1) % 3)], nv)
    const e = edges.get(k)
    if (e === undefined) edges.set(k, [s]); else e.push(s)
  }
  return edges
}

/** The triangles' unit normals. */
export function faceNormals(m: Tris): Float64Array {
  const { p, tri } = m
  const fn = new Float64Array(tri.length)
  for (let f = 0; f < tri.length; f += 3) {
    const a = 3 * tri[f], b = 3 * tri[f + 1], c = 3 * tri[f + 2]
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const l = Math.hypot(nx, ny, nz) || 1
    fn[f] = nx / l; fn[f + 1] = ny / l; fn[f + 2] = nz / l
  }
  return fn
}

/**
 * The smooth groups of a welded mesh: two triangles that share an edge, the same way out, and meet at less than
 * smoothDeg share their normals at the edge's ends. Where more than two triangles meet on an edge (a sheet modelled
 * with two faces back to back), each is paired with the one it meets flattest. A group's normal is its faces' normals
 * weighted by their angle at the vertex.
 */
export function groupsOf(m: Tris, smoothDeg: number, edges = edgesOf(m)): Groups {
  const { p, tri } = m
  const fn = faceNormals(m)
  const cos = Math.cos((smoothDeg * Math.PI) / 180)
  const parent = Int32Array.from({ length: tri.length }, (_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }
  const next = (s: number): number => s - (s % 3) + ((s + 1) % 3)
  for (const sides of edges.values()) {
    if (sides.length < 2) continue
    const fwd = sides.filter((s) => tri[s] < tri[next(s)])
    const back = sides.filter((s) => tri[s] > tri[next(s)])
    const used = new Set<number>()
    for (const s of fwd) {
      const f = s - (s % 3)
      let [best, at] = [-2, -1]
      for (const r of back) {
        if (used.has(r)) continue
        const g = r - (r % 3)
        const d = fn[f] * fn[g] + fn[f + 1] * fn[g + 1] + fn[f + 2] * fn[g + 2]
        if (d > best) [best, at] = [d, r]
      }
      if (at < 0 || best < cos) continue
      used.add(at)
      parent[find(s)] = find(next(at)) // s starts where `at` ends…
      parent[find(next(s))] = find(at) // …and ends where it starts
    }
  }
  const id = new Int32Array(tri.length).fill(-1)
  const corner = new Int32Array(tri.length)
  const vertex: number[] = []
  for (let s = 0; s < tri.length; s++) {
    const r = find(s)
    if (id[r] < 0) { id[r] = vertex.length; vertex.push(tri[s]) }
    corner[s] = id[r]
  }
  const n = new Float64Array(3 * vertex.length)
  for (let s = 0; s < tri.length; s++) {
    const f = s - (s % 3)
    const a = 3 * tri[s], b = 3 * tri[next(s)], c = 3 * tri[next(next(s))]
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]
    const w = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz) || 1))))
    for (let d = 0; d < 3; d++) n[3 * corner[s] + d] += w * fn[f + d]
  }
  for (let s = 0; s < tri.length; s++) { // a group whose faces cancel out takes a face's normal
    const g = 3 * corner[s]
    if (Math.hypot(n[g], n[g + 1], n[g + 2]) < 1e-9) for (let d = 0; d < 3; d++) n[g + d] = fn[s - (s % 3) + d]
  }
  for (let g = 0; g < n.length; g += 3) {
    const l = Math.hypot(n[g], n[g + 1], n[g + 2])
    n[g] /= l; n[g + 1] /= l; n[g + 2] /= l
  }
  return { corner, n, vertex: Int32Array.from(vertex), fn }
}

// ---------- subdividing ----------


/**
 * m with at most `target` triangles (meshoptimizer's edge collapse: each vertex kept stays where it is), the surface
 * moved at most `error` of the mesh's size, raised in steps up to maxError until the target is met. Each triangle keeps
 * the object of its first vertex.
 */
export function simplified(m: Tris, target: number, error: number, maxError = error): Tris {
  if (m.tri.length <= 3 * target) return m
  const p32 = Float32Array.from(m.p)
  let idx = m.tri
  for (let e = error; idx.length > 3 * target && e <= maxError * 1.0001; e *= 2) idx = MeshoptSimplifier.simplify(m.tri, p32, 3, 3 * target, e)[0]
  const nv = m.p.length / 3
  const objectOf = new Int32Array(nv).fill(-1)
  if (m.owner) for (let f = 0; f < m.tri.length; f++) if (objectOf[m.tri[f]] < 0) objectOf[m.tri[f]] = m.owner[(f - (f % 3)) / 3]
  const to = new Int32Array(nv).fill(-1)
  const p: number[] = []
  const tri = new Uint32Array(idx.length)
  for (let k = 0; k < idx.length; k++) {
    const v = idx[k]
    if (to[v] < 0) { to[v] = p.length / 3; p.push(m.p[3 * v], m.p[3 * v + 1], m.p[3 * v + 2]) }
    tri[k] = to[v]
  }
  const owner = m.owner ? Uint16Array.from({ length: idx.length / 3 }, (_, f) => objectOf[idx[3 * f]]) : undefined
  return { p: Float64Array.from(p), tri, owner }
}

/**
 * One pass over a welded mesh: every edge along which the skin turns more than turnDeg (the angle between its two
 * ends' normals), that is longer than minEdge and whose curve stands more than minBulge above it gets a vertex in its
 * middle, on the cubic through its ends that their normals give (the edge of a PN triangle: Vlachos et al. 2001). A triangle with one, two or three cut edges
 * becomes two, three or four. The old vertices do not move. Returns the new mesh and how many edges it cut.
 */
export function subdivide(m: Tris, smoothDeg: number, turnDeg: number, minEdge: number, minBulge = 0): { mesh: Tris; cut: number } {
  const { p, tri } = m
  const nv = p.length / 3
  const edges = edgesOf(m)
  const g = groupsOf(m, smoothDeg, edges)
  const cosTurn = Math.cos((turnDeg * Math.PI) / 180)
  const next = (s: number): number => s - (s % 3) + ((s + 1) % 3)
  const pos = Array.from(p)
  const mid = new Map<number, number>()
  for (const [key, sides] of edges) {
    const [a, b] = [Math.floor(key / nv), key % nv]
    const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]]
    const len = Math.hypot(ab[0], ab[1], ab[2])
    if (len < minEdge) continue
    let turns = false
    let move = [0, 0, 0]
    for (const s of sides) { // each face's own view of the curve; the faces of one smooth group agree
      const [ga, gb] = tri[s] === a ? [3 * g.corner[s], 3 * g.corner[next(s)]] : [3 * g.corner[next(s)], 3 * g.corner[s]]
      if (g.n[ga] * g.n[gb] + g.n[ga + 1] * g.n[gb + 1] + g.n[ga + 2] * g.n[gb + 2] < cosTurn) turns = true
      const wa = ab[0] * g.n[ga] + ab[1] * g.n[ga + 1] + ab[2] * g.n[ga + 2]
      const wb = -(ab[0] * g.n[gb] + ab[1] * g.n[gb + 1] + ab[2] * g.n[gb + 2])
      const d = [0, 1, 2].map((k) => -(wa * g.n[ga + k] + wb * g.n[gb + k]) / 8)
      if (Math.hypot(d[0], d[1], d[2]) > Math.hypot(move[0], move[1], move[2])) move = d
    }
    const l = Math.hypot(move[0], move[1], move[2])
    if (!turns || l < minBulge) continue
    const k = l > len / 4 ? len / 4 / l : 1 // normals that disagree wildly: no spike
    mid.set(key, pos.length / 3)
    pos.push((p[3 * a] + p[3 * b]) / 2 + k * move[0], (p[3 * a + 1] + p[3 * b + 1]) / 2 + k * move[1], (p[3 * a + 2] + p[3 * b + 2]) / 2 + k * move[2])
  }
  const out: number[] = []
  const owner: number[] = []
  const d2 = (i: number, j: number): number => (pos[3 * i] - pos[3 * j]) ** 2 + (pos[3 * i + 1] - pos[3 * j + 1]) ** 2 + (pos[3 * i + 2] - pos[3 * j + 2]) ** 2
  for (let f = 0; f < tri.length; f += 3) {
    const v = [tri[f], tri[f + 1], tri[f + 2]]
    const e = [0, 1, 2].map((k) => mid.get(edgeKey(v[k], v[(k + 1) % 3], nv)) ?? -1)
    const cuts = e.filter((x) => x >= 0).length
    const before = out.length
    if (cuts === 0) out.push(v[0], v[1], v[2])
    else if (cuts === 3) out.push(v[0], e[0], e[2], e[0], v[1], e[1], e[2], e[1], v[2], e[0], e[1], e[2])
    else if (cuts === 1) {
      const k = e.findIndex((x) => x >= 0)
      const [a, b, c] = [v[k], v[(k + 1) % 3], v[(k + 2) % 3]]
      out.push(a, e[k], c, e[k], b, c)
    } else {
      const k = e.findIndex((x) => x < 0) // the whole edge: v[k] → v[k + 1]; the corner opposite is cut off
      const [a, b, c] = [v[k], v[(k + 1) % 3], v[(k + 2) % 3]]
      const [mb, mc] = [e[(k + 1) % 3], e[(k + 2) % 3]] // on b → c and on c → a
      out.push(mc, mb, c)
      if (d2(a, mb) <= d2(b, mc)) out.push(a, b, mb, a, mb, mc)
      else out.push(a, b, mc, b, mb, mc)
    }
    if (m.owner) for (let i = before; i < out.length; i += 3) owner.push(m.owner[f / 3])
  }
  return { mesh: { p: Float64Array.from(pos), tri: Uint32Array.from(out), owner: m.owner ? Uint16Array.from(owner) : undefined }, cut: mid.size }
}

// ---------- writing ----------

/** livetaiwan's COLOR_0 shade from a unit normal's up part (canonicalise.py shade_from_normals; variants.ts `shade`). */
const shade = (ny: number): number => Math.round(255 * Math.max(0, Math.min(1, 0.55 + 0.45 * (ny * 0.5 + 0.5))))

/** A welded mesh (the GLB's frame: +y up) as glb.ts's arrays: a vertex per smooth group, its normal and its shade. */
export function shaded(m: Tris, smoothDeg: number, dark?: (triangle: number) => boolean): Pick<Glb, 'pos' | 'nrm' | 'col' | 'idx'> {
  const g = groupsOf(m, smoothDeg)
  // a group's vertex, and a second one for its dark triangles: glass keeps the skin's normal and has its own colour
  const id = new Int32Array(2 * g.vertex.length).fill(-1)
  const from: number[] = []
  const idx = new Uint32Array(g.corner.length)
  for (let s = 0; s < idx.length; s++) {
    const k = 2 * g.corner[s] + (dark?.((s - (s % 3)) / 3) ? 1 : 0)
    if (id[k] < 0) { id[k] = from.length; from.push(k) }
    idx[s] = id[k]
  }
  const n = from.length
  const pos = new Float32Array(3 * n), nrm = new Float32Array(3 * n), col = new Uint8Array(4 * n)
  for (let i = 0; i < n; i++) {
    const grp = from[i] >> 1
    for (let d = 0; d < 3; d++) { pos[3 * i + d] = m.p[3 * g.vertex[grp] + d]; nrm[3 * i + d] = g.n[3 * grp + d] }
    const s = from[i] & 1 ? GLASS : shade(g.n[3 * grp + 1])
    col.set([s, s, s, 255], 4 * i)
  }
  return { pos, nrm, col, idx }
}

/** Glass's COLOR_0: under the paint shader's 0.035 (client/scene/livery.ts `glass`). */
export const GLASS = 6

/**
 * Whether a point of the mesh (the GLB's frame) is where a see-through triangle is drawn as dark glass: on the
 * fuselage of the paint map, ahead of its cabin window row (the cockpit; the shader draws the row itself). Everywhere
 * without a paint map, and all of a light aircraft's glass (no window row: its canopy).
 */
export function glassAt(paint: Paint | undefined): (x: number, y: number, z: number) => boolean {
  if (paint === undefined) return () => true
  const w = paint.windows
  return (x, _y, z) => {
    const pz = paint.noseMinusZ ? -z : z
    if (Math.abs(x) > paint.bodyHalfWidth) return false
    return w === undefined || pz > w[2] + w[3] // with a cabin window row: the cockpit's glass only (a door's window drawn dark is a stray dark patch)
  }
}

export interface Built { glb: Glb; fit: Fit; dropped: Map<number, number>; cuts: number[]; sourceTriangles: number; glass: number; fitted?: number }

/**
 * The new mesh for `old` from `source` (detail.py's triangles): welded, registered, masked, subdivided, shaded, in
 * old's frame with old's JSON. `objects` and `paint` (the source's objects, model.json's paint map) say where glass is.
 * Throws on a poor fit.
 */
export function rebuild(old: Glb, source: Tris, r: Omit<MeshRecipe, 'source' | 'date'> = {}, objects?: SourceObject[], paint?: Paint): Built {
  const oldTris: Tris = { p: Float64Array.from(old.pos), tri: old.idx }
  const size = bounds(oldTris.p)
  const dropped = new Map<number, number>()
  if (r.drop?.length && objects !== undefined && source.owner !== undefined) { // the objects named: gone before anything else
    const keep = Array.from(source.owner, (o) => !r.drop!.includes(objects[o].name))
    keep.forEach((k, f) => { if (!k) dropped.set(source.owner![f], (dropped.get(source.owner![f]) ?? 0) + 1) })
    source = pick(source, keep)
  }
  const welded = weld(source, WELD * bounds(source.p).diag)
  const fit = register(oldTris, welded, r.scale ?? 1)
  const pct = (x: number): string => `${(100 * x / size.long).toFixed(3)} %`
  if (fit.median > FIT_MEDIAN * size.long || fit.p95 > FIT_P95 * size.long) {
    throw new Error(`the source does not lie on the mesh it replaces: the old vertices are ${fit.median.toFixed(3)} from it at the median (${pct(fit.median)} of the length; ${pct(FIT_MEDIAN * size.long)} allowed), ${fit.p95.toFixed(3)} at the 95th percentile (${pct(fit.p95)}; ${pct(FIT_P95 * size.long)} allowed). Is it the right source file?`)
  }
  let m: Tris = { p: applyFit(fit, welded.p), tri: fit.mirrored ? welded.tri.map((_, i, t) => t[i - (i % 3) + [0, 2, 1][i % 3]]) : welded.tri, owner: welded.owner }
  const reach = ((r.maskPct ?? MASK_PCT) / 100) * size.long
  if (reach > 0) {
    const keep = mask(m, oldTris, reach)
    keep.forEach((k, f) => { if (!k && m.owner) dropped.set(m.owner[f], (dropped.get(m.owner[f]) ?? 0) + 1) })
    if (keep.includes(false)) m = pick(m, keep)
  }
  const smoothDeg = r.smoothDeg ?? SMOOTH_DEG
  const cuts: number[] = []
  const at = glassAt(paint)
  let glass = 0
  const shadedOf = (x: Tris): Pick<Glb, 'pos' | 'nrm' | 'col' | 'idx'> => {
    glass = 0
    if (r.glass === false || objects === undefined || x.owner === undefined || !objects.some((o) => o.glass)) return shaded(x, smoothDeg)
    const dark = Array.from({ length: x.tri.length / 3 }, (_, f) => {
      if (!objects[x.owner![f]].glass) return false
      const [a, b, c] = [3 * x.tri[3 * f], 3 * x.tri[3 * f + 1], 3 * x.tri[3 * f + 2]]
      return at((x.p[a] + x.p[b] + x.p[c]) / 3, (x.p[a + 1] + x.p[b + 1] + x.p[c + 1]) / 3, (x.p[a + 2] + x.p[b + 2] + x.p[c + 2]) / 3)
    })
    glass = dark.filter(Boolean).length
    return shaded(x, smoothDeg, (f) => dark[f])
  }
  let out = shadedOf(m)
  const auto = r.subdivide === undefined
  const limit = r.maxKB === undefined ? AUTO_BYTES : r.maxKB * 1024
  for (let pass = 0; pass < (r.subdivide ?? AUTO_PASSES); pass++) {
    if (auto) {
      const now = measure(out)
      if (now.p50 <= TARGET.p50 && now.p90 <= TARGET.p90) break
    }
    const s = subdivide(m, smoothDeg, r.turnDeg ?? TURN_DEG, MIN_EDGE * size.diag, ((r.bulgePct ?? BULGE_PCT) / 100) * size.diag)
    if (s.cut === 0) break
    const next = shadedOf(s.mesh)
    if (auto && writeGlb({ json: old.json, ...next }).length > AUTO_BYTES) { out = shadedOf(m); break } // the pass before stays (and its glass count)
    cuts.push(s.cut)
    m = s.mesh
    out = next
  }
  // A source denser than the file allows (the A340's 61,000 triangles) is simplified until it fits: the flat parts lose
  // triangles first, and the curves keep theirs.
  let fitted: number | undefined
  for (let bytes = writeGlb({ json: old.json, ...out }).length; bytes > limit; bytes = writeGlb({ json: old.json, ...out }).length) {
    m = simplified(m, Math.floor((m.tri.length / 3) * (limit / bytes) * 0.95), FIT_ERROR, 8 * FIT_ERROR)
    out = shadedOf(m)
    fitted = m.tri.length / 3
  }
  return { glb: { json: structuredClone(old.json), ...out }, fit, dropped, cuts, sourceTriangles: source.tri.length / 3, glass, fitted }
}

/** The copyright line of a re-meshed GLB: the old one (without an earlier re-mesh's note) and what was done. */
export function notice(old: string | undefined, source: string, date: string): string {
  const base = (old ?? '').replace(/; re-meshed by Flight Chaser.*$/, '')
  return `${base}; re-meshed by Flight Chaser from the unchanged source ${source} (the whole mesh, smooth-shaded) on ${date} with tools/models/detail.ts`
}

// ---------- the driver ----------

function blender(): string {
  const local = path.join(homedir(), 'fh-blender', 'blender-5.2.2-linux-x64', 'blender')
  return process.env.BLENDER ?? (existsSync(local) ? local : 'blender')
}

/** detail.py's triangles of a source file (runs Blender). */
export function readSource(file: string): ReturnType<typeof readRaw> {
  const dir = mkdtempSync(path.join(tmpdir(), 'detail-'))
  try {
    const out = path.join(dir, 'source.fcm')
    execFileSync(blender(), ['-b', '--disable-autoexec', '--python', fileURLToPath(new URL('./detail.py', import.meta.url)), '--', file, out], { stdio: ['ignore', 'ignore', 'inherit'] })
    return readRaw(new Uint8Array(readFileSync(out)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Every number in a JSON value, by its path. */
function numbers(v: unknown, at: string, out: Map<string, number>): Map<string, number> {
  if (typeof v === 'number') out.set(at, v)
  else if (Array.isArray(v)) v.forEach((x, i) => numbers(x, `${at}[${i}]`, out))
  else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) numbers(x, at === '' ? k : `${at}.${k}`, out)
  return out
}

/**
 * What the measuring tools changed in a model.json, one line per measured field: how many of its numbers moved, the
 * largest move and where. A list of another length (the outline's spheres, the profile's body) is only counted.
 */
export function moved(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const lines: string[] = []
  const fields: Array<[string, unknown, unknown]> = []
  for (const k of ['box', 'lights', 'outline']) fields.push([k, before[k], after[k]])
  const [pb, pa] = [(before.profile ?? {}) as Record<string, unknown>, (after.profile ?? {}) as Record<string, unknown>]
  for (const k of new Set([...Object.keys(pb), ...Object.keys(pa)])) fields.push([`profile.${k}`, pb[k], pa[k]])
  fields.push(['paint.windows', (before.paint as Record<string, unknown> | undefined)?.windows, (after.paint as Record<string, unknown> | undefined)?.windows])
  for (const [k, b, a] of fields) {
    if (JSON.stringify(a) === JSON.stringify(b)) { lines.push(`${k}: the same`); continue }
    const [nb, na] = [numbers(b, '', new Map()), numbers(a, '', new Map())]
    if (nb.size !== na.size || [...nb.keys()].some((p) => !na.has(p))) { lines.push(`${k}: ${nb.size} numbers before, ${na.size} now${k === 'outline' || k === 'profile.body' || k === 'profile.fin' ? '' : `: ${JSON.stringify(b)} → ${JSON.stringify(a)}`}`); continue }
    let [worst, where, n] = [0, '', 0]
    for (const [p, x] of nb) {
      const d = Math.abs(na.get(p)! - x)
      if (d > 0) n++
      if (d > worst) [worst, where] = [d, p]
    }
    lines.push(`${k}: ${n} of ${nb.size} numbers moved, ${worst.toFixed(2)} at most (${where || 'the whole'}: ${nb.get(where)} → ${na.get(where)})`)
  }
  return lines
}

if (import.meta.main) {
  const meshOnly = process.argv.includes('--mesh-only')
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  if (ids.length === 0) throw new Error('usage: node tools/models/detail.ts [--mesh-only] <id…>')
  for (const id of ids) {
    const r = recipeOf(id).mesh
    if (r === undefined) throw new Error(`${id}: recipe.json has no "mesh": { "source": … }`)
    const file = fileOf(id, 'model.glb')
    const kept = path.join(SHIPPED, `${id}.glb`)
    if (!existsSync(kept)) {
      if (/re-meshed by Flight Chaser/.test(readGlb(new Uint8Array(readFileSync(file))).json.asset?.copyright ?? '')) {
        throw new Error(`${id}: model.glb is a re-meshed one already, and the mesh it replaced is not at ${kept}. Put it there (git show <the commit before the re-mesh>:public/models/${id}/model.glb).`)
      }
      mkdirSync(SHIPPED, { recursive: true })
      copyFileSync(file, kept)
    }
    const old = readGlb(new Uint8Array(readFileSync(kept)))
    const source = readSource(path.join(SOURCES, r.source))
    const entry = readManifest().models.find((e) => e.id === id)
    if (entry === undefined) throw new Error(`${id}: no model.json`)
    const b = rebuild(old, source, r, source.objects, entry.paint)
    const date = r.date ?? new Date().toISOString().slice(0, 10)
    b.glb.json.asset = { ...b.glb.json.asset, generator: 'Flight Chaser tools/models/detail.ts', copyright: notice(old.json.asset?.copyright, r.source, date) }
    const bytes = writeGlb(b.glb)
    const f = b.fit
    console.log(`${id}: ${r.source}: ${b.sourceTriangles} triangles in ${source.objects.length} objects`)
    const unapplied = source.objects.filter((o) => o.modifiers.length > 0).length
    if (unapplied > 0) console.log(`  note: ${unapplied} objects have modifiers, which are not applied`)
    console.log(`  fit: axes [${f.m.join(' ')}]${f.mirrored ? ' MIRRORED' : ''}, scale ${f.s.toFixed(5)}, move [${f.t.map((v) => v.toFixed(3)).join(', ')}]; the old vertices lie ${f.median.toFixed(4)} from the source at the median, ${f.p95.toFixed(3)} at the 95th percentile, ${f.max.toFixed(3)} at most (the next-best way round: ${f.runnerUp.toFixed(2)})`)
    const lost = [...b.dropped].sort((x, y) => y[1] - x[1])
    console.log(`  mask: ${lost.reduce((s, x) => s + x[1], 0)} triangles dropped${lost.length ? `: ${lost.map(([o, n]) => `${source.objects[o].name} ${n}/${source.objects[o].triangles}`).join(', ')}` : ''}`)
    console.log(`  subdivided: ${b.cuts.length === 0 ? 'no' : b.cuts.map((c, i) => `pass ${i + 1} cut ${c} edges`).join(', ')}${r.subdivide === undefined ? ' (chosen by the tool)' : ` ("subdivide": ${r.subdivide})`}`)
    if (b.fitted !== undefined) console.log(`  simplified to ${b.fitted} triangles: the file must fit ${r.maxKB ?? AUTO_BYTES / 1024} KB`)
    console.log(`  glass: ${b.glass} triangles drawn dark`)
    console.log(`  before  ${describe(measure(old), statSize(kept))}`)
    if (bytes.length > 2 * 1024 * 1024) throw new Error(`${id}: ${bytes.length} bytes: over 2 MB. Subdivide less, or raise turnDeg or bulgePct.`)
    writeFileSync(file, bytes)
    if (!meshOnly) {
      const json = (): Record<string, unknown> => JSON.parse(readFileSync(fileOf(id, 'model.json'), 'utf8'))
      const was = json()
      for (const tool of ['light-anchors.ts', 'profile.ts', 'outline.ts']) {
        execFileSync(process.execPath, [fileURLToPath(new URL(`./${tool}`, import.meta.url)), '--write', id], { stdio: ['ignore', 'ignore', 'inherit'] })
      }
      console.log('  measured again (light-anchors.ts, profile.ts, outline.ts), against model.json before this run:')
      for (const line of moved(was, json())) console.log(`    ${line}`)
    }
    execFileSync(process.execPath, [fileURLToPath(new URL('./lod.ts', import.meta.url)), id], { stdio: ['ignore', 'inherit', 'inherit'] })
    const now = measure(b.glb)
    const ring = ringOf(readManifest().models.find((e) => e.id === id)!)
    const miss = misses(now, ring)
    console.log(`  after   ${describe(now, bytes.length, ring)}  ${miss.length === 0 ? 'reaches the target' : `MISSES: ${miss.join('; ')}`}`)
    if (bytes.length > 1024 * 1024) console.log(`  NOTE: over 1 MB (client/scene/model.test.ts allows 1 MB unless the model is named there with a reason)`)
  }
}

function statSize(file: string): number {
  return readFileSync(file).length
}
