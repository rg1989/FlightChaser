// tools/models/variants.ts
// Builds derived type models from a base model by recipe (public/models/<id>/recipe.json with a `base`): a new wingtip
// device and bigger engine nacelles on the same airframe (A320neo and A321neo sharklets and neo nacelles, the 737 MAX's
// AT winglets and LEAP-1B nacelles), a longer or shorter fuselage (fuselage.ts). Writes the package public/models/<id>/:
// model.glb, gear.glb and model.json (the base's, with the new id, name, uri, types, box, lights, outline, engine region
// and profile). No other package is touched: where two models list a designator, the picker takes the one that lists
// it earlier (client/scene/modelFor.ts), and a derived model lists its own types first.
//
//   node tools/models/variants.ts [id…]          build these recipes, or every one (a base before what is derived from it)
//   node tools/models/variants.ts --png <dir>    also render each result (render.py): whole views and close-ups
//
// Frames: the ops work in the paint frame (profile.ts: +x left wing, +y up, +z nose), metres, on the left side, and
// mirror to the right. The recipe's sizes are the real aircraft's (its `sources`), used as mesh metres (the
// base meshes are within 2 % of true size).
//
// wingtip: removes the base's own device (winglet or fence parts by the tip) and cuts the base wing at the blend start
// (blendStartM inboard of its tip; everything outboard goes), then lofts the new device from inside the wing (the wing's own section there, a hair
// thinner, so the joint is flush) through a blend (its curvature growing, as the drawings show: gentle where it leaves
// the wing, tight near vertical) into a straight, swept, tapered, canted blade with a rounded tip; an AT winglet adds
// a lower blade from under the tip. Closed, smooth-shaded (normals from the loft's faces), the wing's COLOR_0 shade.
// nacelle: scales each nacelle's parts (profile.ts engineParts) about its axis, from the inlet lip aft, and moves them
// forward and up; its pylon follows by height (the nacelle's top all the way, the wing's underside not at all).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import type { ModelManifest, ModelManifestEntry, ModelProfile } from '../../client/types.ts'
import { readGlb, writeGlb, type Glb } from './glb.ts'
import { applyFuselage } from './fuselage.ts'
import { gearEntry, gearFor, glb as gearGlb, rootMatrix, type GearSpec } from './gear-glb.ts'
import { lightsFor, loadBody, type Mesh } from './light-anchors.ts'
import { LOD_TRIANGLES, lodOf, smoothDegOf } from './lod.ts'
import { boxOf, outlineFor } from './outline.ts'
import { MODELS, fileOf, readManifest, recipeOf, writeModel, type Recipe as PackageRecipe, type Stations } from './packages.ts'
import { engineParts, partBoxes, parts, profileOf, section } from './profile.ts'

type V3 = [number, number, number]

/** A blade of a wingtip device: a straight, swept, tapered loft, reached from the wing through an optional blend. */
export interface Blade {
  blendSpanM?: number // the blend's reach outboard of its start…
  blendRiseM?: number // …and up (down for a lower blade), at the leading edge; absent: no blend (a lower blade)
  heightM?: number // the top above the wing's chord plane, extended (upper blades)
  lengthM?: number // the straight part's length (lower blades)
  cantDeg: number // the straight part: its lean outboard from vertical (upper), or its droop below horizontal (lower)
  teSweepDeg?: number // an upper blade: its trailing edge's sweep in side view, from vertical (the leading edge follows)
  leSweepDeg?: number // a lower blade: its leading edge's sweep in side view, from vertical
  chordsM: [number, number] // at the blend's end (or the root) and at the tip
  rootLeAftM?: number // a lower blade: its root's leading edge this far aft of the tip's
  thickness: number // thickness over chord
}

export interface Wingtip {
  kind: 'sharklet' | 'blended' | 'at-winglet' | 'none' // the first three: an upper blade (and a lower one); none: the base's removed
  blendStartM: number // where the device leaves the wing, inboard of the base's tip
  upper?: Blade
  lower?: Blade
}

export interface NacelleOp {
  scale: V3 // across (x), up (y), along (z) the nacelle axis; along: from the inlet lip aft
  forwardM: number
  upM: number
}

/** A derived model's recipe.json: a recipe with a base, a name and types. */
export type Recipe = PackageRecipe & { base: string; name: string; types: string[]; date: string }

const PUBLIC = fileURLToPath(new URL('../../public/', import.meta.url))

/** Every recipe with a base, by package id (a folder with only its recipe.json counts: it is not built yet). */
export function recipes(): Record<string, Recipe> {
  const ids = readdirSync(MODELS, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(fileOf(d.name, 'recipe.json'))).map((d) => d.name).sort()
  return Object.fromEntries(ids.map((id) => [id, recipeOf(id)] as const).filter(([, r]) => r.base !== undefined)) as Record<string, Recipe>
}

/** A recipe's own setting, else the nearest one up its chain of bases. */
function nearest<K extends 'stations' | 'gear'>(id: string, key: K): PackageRecipe[K] {
  const r = recipeOf(id)
  return r[key] ?? (r.base === undefined ? undefined : nearest(r.base, key))
}

// ---------- the working mesh: paint frame, growable ----------

/** A single-primitive mesh in the paint frame (arrays, so ops can add vertices). */
export interface Work {
  p: number[]
  n: number[]
  c: number[] // RGBA bytes
  tri: number[]
}

/** The glTF frame ↔ the paint frame: a half turn about y for noseMinusZ models (a rotation: windings keep). */
const turnOf = (e: ModelManifestEntry): V3 => (e.paint?.noseMinusZ ? [-1, 1, -1] : [1, 1, 1])

export function toWork(g: Glb, e: ModelManifestEntry): Work {
  const t = turnOf(e)
  return { p: Array.from(g.pos, (v, i) => v * t[i % 3]), n: Array.from(g.nrm, (v, i) => v * t[i % 3]), c: Array.from(g.col), tri: Array.from(g.idx) }
}

export function fromWork(w: Work, base: Glb, e: ModelManifestEntry): Glb {
  const t = turnOf(e)
  return { json: base.json, pos: Float32Array.from(w.p, (v, i) => v * t[i % 3]), nrm: Float32Array.from(w.n, (v, i) => v * t[i % 3]), col: Uint8Array.from(w.c), idx: Uint32Array.from(w.tri) }
}

export const meshOf = (w: Work): Mesh => ({ p: Float64Array.from(w.p), tri: Uint32Array.from(w.tri) })

/** livetaiwan's COLOR_0 shade from a unit normal (canonicalise.py shade_from_normals): 0.55 facing down … 1 facing up. */
export const shade = (ny: number): number => Math.round(255 * Math.max(0, Math.min(1, 0.55 + 0.45 * (ny * 0.5 + 0.5))))

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const unit = (a: V3): V3 => mul(a, 1 / (Math.hypot(...a) || 1))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

// ---------- cutting the wing ----------

/**
 * Removes everything outboard of |x| = xCut (both wings), clipping the triangles across the cut: the kept part of each
 * gets new vertices on the plane (position, normal and shade interpolated along its edges).
 */
export function cutOutboard(w: Work, xCut: number): Work {
  const out: Work = { p: [...w.p], n: [...w.n], c: [...w.c], tri: [] }
  const onEdge = new Map<string, number>()
  const cutAt = (a: number, b: number, side: 1 | -1): number => {
    const key = a < b ? `${a},${b}` : `${b},${a}`
    let v = onEdge.get(key)
    if (v !== undefined) return v
    const t = (side * xCut - w.p[3 * a]) / (w.p[3 * b] - w.p[3 * a])
    const n = unit([0, 1, 2].map((k) => lerp(w.n[3 * a + k], w.n[3 * b + k], t)) as V3)
    out.p.push(...[0, 1, 2].map((k) => (k === 0 ? side * xCut : lerp(w.p[3 * a + k], w.p[3 * b + k], t))))
    out.n.push(...n)
    out.c.push(...[0, 1, 2, 3].map((k) => Math.round(lerp(w.c[4 * a + k], w.c[4 * b + k], t))))
    v = out.p.length / 3 - 1
    onEdge.set(key, v)
    return v
  }
  for (let t = 0; t < w.tri.length; t += 3) {
    const v = [w.tri[t], w.tri[t + 1], w.tri[t + 2]]
    const side: 1 | -1 = v.reduce((s, i) => s + w.p[3 * i], 0) >= 0 ? 1 : -1
    const inside = v.map((i) => side * w.p[3 * i] <= xCut)
    if (inside.every(Boolean)) {
      out.tri.push(...v)
      continue
    }
    if (!inside.some(Boolean)) continue
    const poly: number[] = [] // Sutherland–Hodgman against the one plane
    for (let k = 0; k < 3; k++) {
      const [a, b] = [v[k], v[(k + 1) % 3]]
      if (inside[k]) poly.push(a)
      if (inside[k] !== inside[(k + 1) % 3]) poly.push(cutAt(a, b, side))
    }
    for (let k = 1; k + 1 < poly.length; k++) out.tri.push(poly[0], poly[k], poly[k + 1])
  }
  return compact(out)
}

/** Drops unused vertices. */
function compact(w: Work): Work {
  const map = new Map<number, number>()
  const out: Work = { p: [], n: [], c: [], tri: [] }
  for (const i of w.tri) {
    let j = map.get(i)
    if (j === undefined) {
      map.set(i, (j = map.size))
      out.p.push(w.p[3 * i], w.p[3 * i + 1], w.p[3 * i + 2])
      out.n.push(w.n[3 * i], w.n[3 * i + 1], w.n[3 * i + 2])
      out.c.push(w.c[4 * i], w.c[4 * i + 1], w.c[4 * i + 2], w.c[4 * i + 3])
    }
    out.tri.push(j)
  }
  return out
}

// ---------- the wing's own section ----------

export const M = 14 // chordwise stations per surface
/** Chord fractions 0 (LE) … 1 (TE), cosine spaced (dense at the nose). */
export const U = Array.from({ length: M + 1 }, (_, j) => (1 - Math.cos((Math.PI * j) / M)) / 2)

/** A wing section at a span station: its leading and trailing edge [z, y], and its surfaces over the chord line. */
export interface WingSection { x: number; le: [number, number]; te: [number, number]; upper: number[]; lower: number[] } // offsets / chord at U

/** The wing's section in the plane x (left wing), from the triangles near the wing's level (within ±0.8 m of y0). */
export function wingSection(m: Mesh, x: number, y0: number): WingSection {
  const s = section(m, 0, x)
  const seg: number[][] = []
  for (let k = 0; k < s.length; k += 4) if (Math.abs(s[k + 1] - y0) < 0.8 && Math.abs(s[k + 3] - y0) < 0.8) seg.push([s[k], s[k + 1], s[k + 2], s[k + 3]])
  if (seg.length < 3) throw new Error(`no wing section at x = ${x}`)
  const pts = seg.flatMap((q) => [[q[0], q[1]], [q[2], q[3]]])
  const le = pts.reduce((a, b) => (b[0] > a[0] ? b : a)) as [number, number]
  const te = pts.reduce((a, b) => (b[0] < a[0] ? b : a)) as [number, number]
  const c = le[0] - te[0]
  const upper: number[] = []
  const lower: number[] = []
  for (const u of U) {
    const z = le[0] - u * c
    const chordY = lerp(le[1], te[1], u)
    const ys: number[] = []
    for (const [z0, y0_, z1, y1] of seg) if ((z0 - z) * (z1 - z) <= 0 && z0 !== z1) ys.push(y0_ + ((z - z0) / (z1 - z0)) * (y1 - y0_))
    upper.push(ys.length ? (Math.max(...ys) - chordY) / c : 0)
    lower.push(ys.length ? (Math.min(...ys) - chordY) / c : 0)
  }
  upper[0] = lower[0] = 0
  upper[M] = lower[M] = 0 // closed at the nose and the tail
  return { x, le, te, upper, lower }
}

/** A symmetric NACA 4-digit half thickness at chord fraction u, for thickness ratio t, closed trailing edge. */
const naca = (u: number, t: number): number => 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4)

// ---------- the loft ----------

/** One section of a loft: the leading edge, the chord (length and direction), the thickness direction, the surfaces. */
interface Ring { le: V3; chord: number; back: V3; up: V3; upper: number[]; lower: number[] }

/**
 * A closed loft through the rings, root first: each ring runs from the upper trailing edge round the nose to the lower
 * trailing edge (the nose vertex shared, the trailing edge doubled so it stays sharp). The root is capped flat, the
 * last ring must be flat (zero thickness). Normals: area-weighted face normals, outward.
 */
export function loft(rings: Ring[]): Work {
  const w: Work = { p: [], n: [], c: [], tri: [] }
  const per = 2 * M + 1
  for (const r of rings) {
    for (let j = 0; j < per; j++) {
      const [u, off] = j <= M ? [U[M - j], r.upper[M - j]] : [U[j - M], r.lower[j - M]]
      w.p.push(...add(add(r.le, mul(r.back, u * r.chord)), mul(r.up, off * r.chord)))
    }
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j + 1 < per; j++) {
      const [a, b, c, d] = [i * per + j, i * per + j + 1, (i + 1) * per + j + 1, (i + 1) * per + j]
      w.tri.push(a, b, c, a, c, d)
    }
  }
  const centre = rings[0].le.map((_, k) => w.p.filter((_, q) => q < 3 * per && q % 3 === k).reduce((s, v) => s + v, 0) / per)
  w.p.push(...centre)
  const hub = w.p.length / 3 - 1
  for (let j = 0; j + 1 < per; j++) w.tri.push(hub, j + 1, j)
  w.tri.push(hub, 0, per - 1) // across the root's trailing edge
  // outward: a closed mesh's signed volume is positive when its faces wind counter-clockwise seen from outside
  if (signedVolume(w) < 0) for (let t = 0; t < w.tri.length; t += 3) [w.tri[t + 1], w.tri[t + 2]] = [w.tri[t + 2], w.tri[t + 1]]
  smoothNormals(w)
  for (let i = 0; i < w.p.length / 3; i++) w.c.push(...[shade(w.n[3 * i + 1]), shade(w.n[3 * i + 1]), shade(w.n[3 * i + 1]), 255])
  return w
}

export function signedVolume(w: Work): number {
  let v = 0
  for (let t = 0; t < w.tri.length; t += 3) {
    const P = (i: number): V3 => [w.p[3 * i], w.p[3 * i + 1], w.p[3 * i + 2]]
    v += dot(P(w.tri[t]), cross(P(w.tri[t + 1]), P(w.tri[t + 2]))) / 6
  }
  return v
}

function faceNormal(w: Work, t: number): V3 {
  const P = (i: number): V3 => [w.p[3 * i], w.p[3 * i + 1], w.p[3 * i + 2]]
  const [a, b, c] = [P(w.tri[t]), P(w.tri[t + 1]), P(w.tri[t + 2])]
  return cross(sub(b, a), sub(c, a))
}

/** Vertex normals: the area-weighted normals of the faces around each vertex. */
function smoothNormals(w: Work): void {
  w.n = new Array(w.p.length).fill(0)
  for (let t = 0; t < w.tri.length; t += 3) {
    const f = faceNormal(w, t)
    for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) w.n[3 * w.tri[t + k] + a] += f[a]
  }
  for (let i = 0; i < w.n.length; i += 3) {
    const n = unit([w.n[i], w.n[i + 1], w.n[i + 2]])
    ;[w.n[i], w.n[i + 1], w.n[i + 2]] = n
  }
}

/** Mirrors a left-side piece to the right: x negated, windings reversed (a reflection). */
export function mirrored(w: Work): Work {
  const tri = [...w.tri]
  for (let t = 0; t < tri.length; t += 3) [tri[t + 1], tri[t + 2]] = [tri[t + 2], tri[t + 1]]
  return { p: w.p.map((v, i) => (i % 3 === 0 ? -v : v)), n: w.n.map((v, i) => (i % 3 === 0 ? -v : v)), c: [...w.c], tri }
}

export function append(a: Work, b: Work): Work {
  const base = a.p.length / 3
  return { p: [...a.p, ...b.p], n: [...a.n, ...b.n], c: [...a.c, ...b.c], tri: [...a.tri, ...b.tri.map((i) => i + base)] }
}

// ---------- the wingtip device ----------

/** The wing where the device leaves it: its section, and the directions its leading edge and plane run in. */
export interface Tip {
  sec: WingSection // at the blend start
  inner: WingSection // 0.4 m further in (the stub inside the wing)
  dihedral: number // radians: the chord plane's slope outboard
  leSweep: number // radians: the leading edge's sweep in plan
  teSweep: number // radians: the trailing edge's
}

const DEG = Math.PI / 180

/**
 * The spine of a blade from its blend's start: the blend turns the leading edge from angle a0 to a1 (radians, in the
 * x–y plane from +x) with its curvature growing (angle ∝ t^p, p fitted so the blend reaches span out and rise up),
 * then runs straight. Returns points every ds with their angle.
 */
export function spine(a0: number, a1: number, spanM: number, riseM: number, straightM: number, ds = 0.02): Array<{ x: number; y: number; a: number; s: number; t: number }> {
  const integ = (p: number): [number, number] => {
    let [cx, sy] = [0, 0]
    for (let k = 0; k < 400; k++) {
      const a = a0 + (a1 - a0) * ((k + 0.5) / 400) ** p
      cx += Math.cos(a) / 400
      sy += Math.sin(a) / 400
    }
    return [cx, sy]
  }
  const want = spanM / Math.abs(riseM)
  let [lo, hi] = [0.2, 12]
  for (let k = 0; k < 60; k++) { // the ratio of reach to rise grows with p
    const mid = (lo + hi) / 2
    const [cx, sy] = integ(mid)
    if (cx / Math.abs(sy) < want) lo = mid
    else hi = mid
  }
  const p = (lo + hi) / 2
  const S = spanM / integ(p)[0]
  const out: Array<{ x: number; y: number; a: number; s: number; t: number }> = []
  let [x, y] = [0, 0]
  const total = S + straightM
  const n = Math.ceil(total / ds)
  for (let k = 0; k <= n; k++) {
    const s = (k * total) / n
    const t = Math.min(1, s / S)
    const a = s < S ? a0 + (a1 - a0) * t ** p : a1
    out.push({ x, y, a, s, t })
    x += Math.cos(a) * (total / n)
    y += Math.sin(a) * (total / n)
  }
  return out
}

/** The rings of an upper blade (sharklet, blended or AT upper element) leaving the wing at tip. */
export function upperRings(tip: Tip, b: Blade): Ring[] {
  const { sec, inner } = tip
  const a0 = tip.dihedral
  const a1 = (90 - b.cantDeg) * DEG
  const span = b.blendSpanM ?? 0.05
  const rise = b.blendRiseM ?? 0.05
  // the straight part climbs to heightM above the chord plane, extended to where it ends
  const risePerM = Math.cos(b.cantDeg * DEG) - Math.sin(b.cantDeg * DEG) * Math.tan(tip.dihedral)
  const straight = Math.max(0.2, (b.heightM! - rise + span * Math.tan(tip.dihedral)) / risePerM)
  const sp = spine(a0, a1, span, rise, straight)
  const c0 = sec.le[0] - sec.te[0]
  const [cMid, cTip] = b.chordsM
  const tilt0 = (sec.te[1] - sec.le[1]) / c0 // the wing's incidence at the tip
  const rings: Ring[] = []
  const ringAt = (le: V3, a: number, chord: number, tilt: number, upper: number[], lower: number[]): Ring => {
    const T: V3 = [Math.cos(a), Math.sin(a), 0]
    let back = unit([0, tilt, -1])
    back = unit(sub(back, mul(T, dot(back, T))))
    return { le, chord, back, up: unit(cross(T, back)), upper, lower }
  }
  const thin = (v: number[]): number[] => v.map((q) => 0.97 * q)
  // the stub inside the wing: the wing's own sections, a hair thinner
  const ci = inner.le[0] - inner.te[0]
  rings.push(ringAt([inner.x, inner.le[1], inner.le[0]], a0, ci, (inner.te[1] - inner.le[1]) / ci, thin(inner.upper), thin(inner.lower)))
  const shapeAt = (t: number, u: number, j: number, side: 'upper' | 'lower'): number => {
    const foil = (side === 'upper' ? 1 : -1) * naca(u, b.thickness) + 0.08 * u * (1 - u) // 2 % camber, the suction side inboard
    return lerp(0.97 * sec[side][j], foil, Math.min(1, t * 1.5)) // from the wing's own section to the blade's
  }
  // the trailing edge is the blade's straight reference line: the wing's trailing edge sweep (in plan) on the horizontal
  // run, the blade's (in side view) on the rise; the leading edge is a chord ahead of it (so it curves into the wing's
  // leading edge through the blend, as the drawings show)
  let zTe = sec.te[0]
  const blendS = sp.find((r) => r.t >= 1)?.s ?? sp[sp.length - 1].s
  const every = Math.max(1, Math.round(0.08 / 0.02)) // a ring every 8 cm of spine
  for (let k = 0; k < sp.length; k++) {
    const q = sp[k]
    if (k > 0) {
      const f = Math.min(1, q.t * 1.2)
      zTe -= ((1 - f) * Math.tan(tip.teSweep) * Math.cos(q.a) + f * Math.tan(b.teSweepDeg! * DEG) * Math.abs(Math.sin(q.a))) * (q.s - sp[k - 1].s)
    }
    if (k % every !== 0 && k !== sp.length - 1) continue
    const chord = q.t < 1 ? lerp(c0, cMid, q.t) : lerp(cMid, cTip, (q.s - blendS) / Math.max(1e-6, sp[sp.length - 1].s - blendS))
    rings.push(ringAt([sec.x + q.x, sec.le[1] + q.y, zTe + chord], q.a, chord, tilt0 * (1 - q.t),
      U.map((u, j) => shapeAt(q.t, u, j, 'upper')), U.map((u, j) => shapeAt(q.t, u, j, 'lower'))))
  }
  return capped(rings, sp[sp.length - 1].a)
}

/** The rings of a lower blade (the AT winglet's ventral element): straight, from the tip's chord plane, down and outboard. */
export function lowerRings(tip: Tip, b: Blade): Ring[] {
  const { sec } = tip
  const a = -b.cantDeg * DEG // below horizontal
  const [cRoot, cTip] = b.chordsM
  const L = b.lengthM!
  const T: V3 = [Math.cos(a), Math.sin(a), 0]
  const back: V3 = [0, 0, -1]
  const up = unit(cross(T, back))
  const foil = (sign: number): number[] => U.map((u) => sign * naca(u, b.thickness))
  // its root on the tip's chord plane (30 % back), a stub 0.15 m further in along the span: both inside the wing
  const root: V3 = [sec.x, lerp(sec.le[1], sec.te[1], 0.3), sec.le[0] - (b.rootLeAftM ?? 0)]
  const rings: Ring[] = [{ le: add(root, [-0.15, 0, 0]), chord: cRoot, back, up, upper: foil(1), lower: foil(-1) }]
  const n = 12
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n
    const le = add(add(root, mul(T, s)), [0, 0, -Math.tan(b.leSweepDeg! * DEG) * Math.abs(Math.sin(a)) * s]) // side-view sweep
    rings.push({ le, chord: lerp(cRoot, cTip, s / L), back, up, upper: foil(1), lower: foil(-1) })
  }
  return capped(rings, a)
}

/** Rounds the blade's tip: three more rings over 6 % of the tip chord, thinning to nothing and shortening a little. */
function capped(rings: Ring[], a: number): Ring[] {
  const last = rings[rings.length - 1]
  const T: V3 = [Math.cos(a), Math.sin(a), 0]
  for (const phi of [30, 60, 90].map((d) => d * DEG)) {
    const k = Math.cos(phi)
    const out = 0.06 * last.chord * Math.sin(phi)
    const shrink = 0.12 * last.chord * (1 - k)
    rings.push({
      ...last, le: add(add(last.le, mul(T, out)), mul(last.back, shrink)), chord: last.chord - 2 * shrink,
      upper: last.upper.map((v) => v * k * (last.chord / (last.chord - 2 * shrink))), lower: last.lower.map((v) => v * k * (last.chord / (last.chord - 2 * shrink))),
    })
  }
  return rings
}

/** The wing where the device will leave it (xStart), measured on the base: its sections there and inboard, its slopes. */
export function measureTip(m: Mesh, plane: (x: number) => number, xStart: number): Tip {
  const sec = wingSection(m, xStart - 0.01, plane(xStart))
  const inner = wingSection(m, xStart - 0.4, plane(xStart - 0.4))
  const far = wingSection(m, xStart - 1.5, plane(xStart - 1.5))
  const mid = (s: WingSection): number => (s.le[1] + s.te[1]) / 2
  return {
    sec, inner,
    dihedral: Math.atan2(mid(sec) - mid(far), sec.x - far.x),
    leSweep: Math.atan2(far.le[0] - sec.le[0], sec.x - far.x),
    teSweep: Math.atan2(far.te[0] - sec.te[0], sec.x - far.x),
  }
}

/**
 * Removes the base's own wingtip device (winglet, fence) wherever it reaches: the small parts (under 3 m of span) out
 * by the tip (within 1 m of the cut, or beyond it) with a corner standing above the wing plane or hanging well below it.
 */
export function removeDevice(w: Work, plane: (x: number) => number, xStart: number): Work {
  const m = meshOf(w)
  const part = parts(m)
  const off = new Set<number>()
  for (let t = 0; t < part.length; t++) {
    for (let k = 0; k < 3; k++) {
      const i = 3 * w.tri[3 * t + k]
      const [x, y] = [Math.abs(w.p[i]), w.p[i + 1]]
      if (x > xStart - 1 && (y > plane(x) + 0.15 || y < plane(x) - 0.75)) off.add(part[t])
    }
  }
  const boxes = partBoxes(m, part)
  const drop = new Set([...off].filter((k) => {
    const b = boxes.get(k)!.box
    return b[0] * b[1] > 0 && Math.abs(b[1] - b[0]) < 3 && Math.max(Math.abs(b[0]), Math.abs(b[1])) > xStart - 1
  }))
  return compact({ ...w, tri: w.tri.filter((_, i) => !drop.has(part[Math.floor(i / 3)])) })
}

/** The wingtip op: remove the base's device, cut the wing at the blend start, loft the new device on both sides. */
export function applyWingtip(w: Work, op: Wingtip, prof: ModelProfile, plane: (x: number) => number): Work {
  const xStart = prof.wing[3] - op.blendStartM
  const tip = measureTip(meshOf(w), plane, xStart) // on the base wing, before anything goes
  let out = cutOutboard(removeDevice(w, plane, xStart), xStart)
  for (const piece of devicePieces(tip, op)) out = append(append(out, piece), mirrored(piece))
  return out
}

/** The device's closed pieces for the left wing (none for kind 'none': the base's device is only removed). */
export function devicePieces(tip: Tip, op: Wingtip): Work[] {
  if (op.kind === 'none') return []
  return [op.upper && loft(upperRings(tip, op.upper)), op.lower && loft(lowerRings(tip, op.lower))].filter((w): w is Work => Boolean(w))
}

// ---------- the nacelles ----------

/** The nacelle op on every engine, both sides; and the paint map's engine region grown to take the new nacelles in. */
export function applyNacelle(w: Work, op: NacelleOp, e: ModelManifestEntry): { work: Work; moveBox: (b: [number, number, number, number]) => [number, number, number, number] } {
  const m = meshOf(w)
  const part = parts(m)
  const boxes = partBoxes(m, part)
  const groups = engineParts(boxes, e.paint!.engines)
  if (groups.length === 0) throw new Error(`${e.id}: no engines to scale`)
  const [sx, sy, sz] = op.scale
  const p = [...w.p]
  const n = [...w.n]
  const c = [...w.c]
  const done = new Set<number>()
  let moveBox = (b: [number, number, number, number]): [number, number, number, number] => b
  for (const g of groups) {
    const core = g.core
    const nb = g.nacelle.map((k) => boxes.get(k)!.box)
    const ax = (core[0] + core[1]) / 2
    const ay = (core[2] + core[3]) / 2
    const zLip = Math.max(...nb.map((b) => b[5]))
    const pylonTop = Math.max(core[3], ...g.pylon.map((k) => boxes.get(k)!.box[3]))
    const T = (q: V3, side: number): V3 => [side * ax + sx * (q[0] - side * ax), ay + sy * (q[1] - ay) + op.upM, zLip + sz * (q[2] - zLip) + op.forwardM]
    // the parts on each side: the left group's, and the right's (their boxes mirrored)
    const mirrorOf = (b: number[]): number | undefined => [...boxes].find(([, o]) => Math.abs(o.box[0] + b[1]) < 0.05 && Math.abs(o.box[1] + b[0]) < 0.05 && Math.abs(o.box[4] - b[4]) < 0.05 && Math.abs(o.box[5] - b[5]) < 0.05 && Math.abs(o.box[2] - b[2]) < 0.05)?.[0]
    const sets: Array<{ ids: Set<number>; weight: (q: V3) => number }> = [
      { ids: new Set(g.nacelle.flatMap((k) => [k, mirrorOf(boxes.get(k)!.box)].filter((v): v is number => v !== undefined))), weight: () => 1 },
      { ids: new Set(g.pylon.flatMap((k) => [k, mirrorOf(boxes.get(k)!.box)].filter((v): v is number => v !== undefined))), weight: (q) => Math.max(0, Math.min(1, (pylonTop - q[1]) / Math.max(0.05, pylonTop - core[3]))) },
    ]
    for (const { ids, weight } of sets) {
      for (let t = 0; t < part.length; t++) {
        if (!ids.has(part[t])) continue
        for (let k = 0; k < 3; k++) {
          const i = w.tri[3 * t + k]
          if (done.has(i)) continue
          done.add(i)
          const q: V3 = [w.p[3 * i], w.p[3 * i + 1], w.p[3 * i + 2]]
          const side = q[0] >= 0 ? 1 : -1
          const f = weight(q)
          const to = T(q, side)
          for (let a = 0; a < 3; a++) p[3 * i + a] = lerp(q[a], to[a], f)
          const nn = unit([lerp(w.n[3 * i], w.n[3 * i] / sx, f), lerp(w.n[3 * i + 1], w.n[3 * i + 1] / sy, f), lerp(w.n[3 * i + 2], w.n[3 * i + 2] / sz, f)])
          ;[n[3 * i], n[3 * i + 1], n[3 * i + 2]] = nn
          const s = shade(nn[1])
          ;[c[4 * i], c[4 * i + 1], c[4 * i + 2]] = [s, s, s]
        }
      }
    }
    // the paint map's engine region grows to take the new nacelle in (it stays clear of the fuselage)
    const zAft = Math.min(...nb.map((b) => b[4]))
    const nx: [number, number] = [ax - sx * (ax - core[0]), ax + sx * (core[1] - ax)]
    const nz: [number, number] = [zLip + sz * (zAft - zLip) + op.forwardM, zLip + op.forwardM]
    const prev = moveBox
    moveBox = (b) => {
      const [x0, x1, z0, z1] = prev(b)
      return [Math.min(x0, nx[0]), Math.max(x1, nx[1]), Math.min(z0, nz[0]), Math.max(z1, nz[1])]
    }
  }
  return { work: { p, n, c, tri: [...w.tri] }, moveBox }
}

// ---------- the variant ----------

const cm = (x: number): number => Math.round(x * 100) / 100 + 0

export interface Built {
  bytes: Uint8Array
  entry: ModelManifestEntry // without what is measured on the written mesh: lights, outline, profile (measure())
  stations: Stations | undefined // the doors and the cockpit windows on the new airframe
  gear: GearSpec | undefined // a gear of its own to build; undefined: its base's gear as it is
}

/** Builds a recipe: the GLB bytes and its model.json entry. */
export function build(id: string, r: Recipe, manifest: ModelManifest): Built {
  const base = manifest.models.find((m) => m.id === r.base)
  if (base === undefined || base.paint === undefined) throw new Error(`${id}: no painted base ${r.base}`)
  const glb = readGlb(readFileSync(join(PUBLIC, base.uri)))
  let work = toWork(glb, base)
  const baseProfile = profileOf(base)
  let paint = structuredClone(base.paint)
  // The fuselage first, on the base's mesh and profile: the wing stays, so the other two ops find it where the base has it.
  const plug = r.fuselage ? applyFuselage(work, r.fuselage, base, baseProfile.profile) : null
  if (plug !== null) {
    work = plug.work
    paint = plug.movePaint(paint)
  }
  if (r.wingtip) work = applyWingtip(work, r.wingtip, baseProfile.profile, baseProfile.wingPlane)
  if (r.nacelle) {
    const { work: moved, moveBox } = applyNacelle(work, r.nacelle, { ...base, paint })
    work = moved
    paint.engines = moveBox(paint.engines).map(cm) as typeof paint.engines
  }
  const out = fromWork(work, glb, base)
  const note = `modified by FlightHopper (tools/models/variants.ts)`
  const licence = base.license.split(':')[0]
  out.json = structuredClone(glb.json)
  out.json.asset = {
    ...out.json.asset,
    generator: `${glb.json.asset?.generator ?? 'unknown'}; FlightHopper tools/models/variants.ts`,
    copyright: `${licence}, derived from ${base.id}/model.glb (${base.author}); ${note} ${r.date}: public/models/${id}/recipe.json`,
  }
  out.json.nodes[0].name = id
  out.json.meshes[0].name = id
  const bytes = writeGlb(out)
  const entry: ModelManifestEntry = {
    ...structuredClone(base), id, uri: `models/${id}/model.glb`, author: `${base.author}; ${note}`, source: `${base.source}; ${note}, public/models/${id}/recipe.json`,
    name: r.name, types: [...r.types], paint,
  }
  if (entry.gear) entry.gear.uri = `models/${id}/gear.glb`
  if (plug !== null) entry.lengthM = cm(base.lengthM + plug.lengthM)
  delete entry.standIns // a model made for its types stands in for nothing
  delete entry.profile
  delete entry.lights
  delete entry.outline
  entry.box = boxOf(bytes)
  // The doors and the gear follow the fuselage, unless the recipe gives its own (a door more or less, another bogie).
  const [stations, gear] = [nearest(r.base, 'stations'), nearest(r.base, 'gear')]
  return {
    bytes, entry,
    stations: r.stations ?? (plug !== null && stations !== undefined ? plug.stations(stations) : stations),
    gear: r.gear ?? (plug !== null && gear !== undefined && base.gear !== undefined ? plug.gear(gear) : undefined),
  }
}

/** What is measured on a built variant's mesh (its model.glb is on disk): the lights, the outline, the profile; and its own gear. */
export function measure(b: Built): { entry: ModelManifestEntry; gear: Uint8Array | null; lod: Uint8Array | null } {
  const entry = structuredClone(b.entry)
  let gear: Uint8Array | null = null
  if (b.gear !== undefined) {
    const g = gearFor(entry, b.gear, loadBody(entry))
    gear = gearGlb(g.legs, rootMatrix(entry))
    entry.gear = gearEntry(entry.id, g)
    entry.gearHeightM = entry.gear.heightM
  }
  entry.lights = lightsFor(entry)
  entry.outline = outlineFor(entry)
  entry.profile = profileOf(entry, undefined, b.stations).profile
  // its own light copy for the traffic (lod.ts), not the base's
  delete entry.lod
  const full = readGlb(b.bytes)
  let lod: Uint8Array | null = null
  if (full.idx.length / 3 > LOD_TRIANGLES) {
    const l = lodOf(full, smoothDegOf(entry.id))
    lod = writeGlb(l)
    entry.lod = { uri: `models/${entry.id}/lod.glb`, triangles: l.idx.length / 3 }
  }
  return { entry, gear, lod }
}

/** Builds a recipe's package: model.glb, gear.glb (its own, or a copy of its base's), model.json. */
export function writePackage(id: string, r: Recipe, manifest: ModelManifest): ModelManifestEntry {
  const built = build(id, r, manifest)
  mkdirSync(join(MODELS, id), { recursive: true })
  writeFileSync(fileOf(id, 'model.glb'), built.bytes)
  const { entry, gear, lod } = measure(built)
  if (lod !== null) writeFileSync(fileOf(id, 'lod.glb'), lod)
  else rmSync(fileOf(id, 'lod.glb'), { force: true })
  if (gear !== null) writeFileSync(fileOf(id, 'gear.glb'), gear)
  else if (entry.gear) copyFileSync(fileOf(r.base, 'gear.glb'), fileOf(id, 'gear.glb'))
  writeModel(entry)
  return entry
}

const RENDER = fileURLToPath(new URL('./render.py', import.meta.url))

/** Renders a variant for checking: whole views, the left wingtip and the left nacelle up close. */
export function variantPng(e: ModelManifestEntry, dir: string): string {
  const p = e.profile!
  const tip: V3 = [p.winglet ? (p.winglet[0] + p.winglet[1]) / 2 : p.wing[3], p.winglet ? (p.winglet[4] + p.winglet[5]) / 2 : p.wing[4], p.winglet ? (p.winglet[2] + p.winglet[3]) / 2 : p.wing[1]]
  const eng = p.engines!
  const nac: V3 = [(eng[0] + eng[1]) / 2, (eng[4] + eng[5]) / 2, (eng[2] + eng[3]) / 2]
  const out = join(dir, `${e.id}-views.png`)
  const whole = { px: 900, centre: [0, 0, 0], extent: 1.05 * Math.max(2 * (p.winglet?.[1] ?? p.wing[3]), p.box[1] - p.box[0]), aspect: 0.5 }
  const views = [
    { name: 'front', dir: [0, 0, -1], up: [0, 1, 0], ...whole },
    { name: 'left side', dir: [-1, 0, 0], up: [0, 1, 0], ...whole },
    { name: '3/4 front left, above', dir: [-0.6, -0.45, -0.65], up: [0, 1, 0], ...whole },
    { name: '3/4 front left, ground level', dir: [-0.45, -0.12, -0.88], up: [0, 1, 0], ...whole },
    { name: 'left tip, front', dir: [0, 0, -1], up: [0, 1, 0], px: 900, centre: tip, extent: 4.5 },
    { name: 'left tip, from outboard', dir: [-1, 0, 0], up: [0, 1, 0], px: 900, centre: tip, extent: 4.5, clip: [0, tip[0] - 2.5] },
    { name: 'left tip, 3/4 rear above', dir: [-0.5, -0.5, 0.7], up: [0, 1, 0], px: 900, centre: tip, extent: 4.5 },
    { name: 'left tip, top', dir: [0, -1, 0], up: [0, 0, 1], px: 900, centre: tip, extent: 4.5 },
    { name: 'left nacelle, side', dir: [-1, 0, 0], up: [0, 1, 0], px: 900, centre: nac, extent: 7, clip: [0, nac[0] - 3] },
    { name: 'left nacelle, front', dir: [0, 0, -1], up: [0, 1, 0], px: 900, centre: nac, extent: 5 },
    { name: 'left nacelle, 3/4 front below', dir: [-0.5, 0.35, -0.8], up: [0, 1, 0], px: 900, centre: nac, extent: 7 },
    { name: 'left nacelle, 3/4 rear', dir: [-0.55, -0.2, 0.8], up: [0, 1, 0], px: 900, centre: nac, extent: 7 },
  ]
  const spec = { glb: join(PUBLIC, e.uri), turn: e.paint?.noseMinusZ === true, out, title: `${e.id} (tools/models/variants.ts)`, cols: 4, views }
  const specPath = join(dir, `${e.id}-views.json`)
  writeFileSync(specPath, JSON.stringify(spec))
  execFileSync('python3', [RENDER, specPath], { stdio: 'pipe' })
  return out
}

if (import.meta.main) {
  process.getBuiltinModule('node:os').setPriority(19) // gives way to whatever else runs on this machine
  const png = process.argv.indexOf('--png')
  const dir = png >= 0 ? process.argv[png + 1] : null
  const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--png')
  const all = recipes()
  for (const id of ids) if (!(id in all)) throw new Error(`no recipe with a base in public/models/${id}/recipe.json`)
  const todo = new Set(ids.length > 0 ? ids : Object.keys(all))
  while (todo.size > 0) {
    const id = [...todo].find((k) => !todo.has(all[k].base)) // a base before what is derived from it
    if (id === undefined) throw new Error(`recipes that are each other's base: ${[...todo].join(', ')}`)
    todo.delete(id)
    const entry = writePackage(id, all[id], readManifest())
    console.log(`${id}: ${entry.uri}, types ${(entry.types ?? []).join(' ')}; box ${JSON.stringify(entry.box)}`)
    if (dir !== null) console.log(`  ${variantPng(entry, dir)}`)
  }
}
