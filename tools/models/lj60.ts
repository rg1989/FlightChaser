// tools/models/lj60.ts
// Builds public/models/lj60/model.glb: the Bombardier Learjet 60, lofted from its published sizes (length 17.88 m, span 13.35 m,
// height 4.47 m, wing 24.6 m²) and side photographs of N722BD (no freely licensed Learjet mesh exists:
// .planning/reports/aircraft-model-sources.md). Every part is a closed shell of its own, so the profile and outline tools see them
// apart. The frame is the type models' (nose −Z, up +Y, right wing +X); `s` below is metres aft of the nose, `y` above the
// fuselage's centre line. Then run gear-glb, light-anchors, profile, outline and lod on the package (docs/liveries.md, 2.3).
//
//   node tools/models/lj60.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { readGlb, writeGlb } from './glb.ts'
import { shade } from './variants.ts'

type V = [number, number, number]
const L = 17.88
const P = (x: number, y: number, s: number): V => [x, y, s - L / 2]

const positions: number[] = []
const dark: boolean[] = [] // per vertex: near-black (the fan, the jet pipe)
const tris: number[] = []

/** Lerp through a table [[u, v], …] with a smooth (Catmull-Rom) curve. */
function curve(table: readonly (readonly [number, number])[], u: number): number {
  if (u <= table[0][0]) return table[0][1]
  const n = table.length - 1
  if (u >= table[n][0]) return table[n][1]
  let i = 0
  while (table[i + 1][0] < u) i++
  const [u1, v1] = table[i]
  const [u2, v2] = table[i + 1]
  const slope = (j: number): number => (j <= 0 || j >= n ? (table[Math.min(j + 1, n)][1] - table[Math.max(j - 1, 0)][1]) / (table[Math.min(j + 1, n)][0] - table[Math.max(j - 1, 0)][0]) : (table[j + 1][1] - table[j - 1][1]) / (table[j + 1][0] - table[j - 1][0]))
  const h = u2 - u1
  const t = (u - u1) / h
  const [m1, m2] = [slope(i) * h, slope(i + 1) * h]
  return (2 * t ** 3 - 3 * t ** 2 + 1) * v1 + (t ** 3 - 2 * t ** 2 + t) * m1 + (-2 * t ** 3 + 3 * t ** 2) * v2 + (t ** 3 - t ** 2) * m2
}

/** A closed loft: rings of equal size, joined, each end closed with a fan round its middle. flip: the rings run the other way round. */
function loft(rings: V[][], flip = false, darkRings: (i: number) => boolean = () => false): void {
  const base = positions.length / 3
  const m = rings[0].length
  rings.forEach((r, i) => r.forEach((p) => {
    positions.push(...p)
    dark.push(darkRings(i))
  }))
  const quad = (a: number, b: number, c: number, d: number): void => {
    if (flip) tris.push(a, c, b, a, d, c)
    else tris.push(a, b, c, a, c, d)
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < m; j++) {
      const j1 = (j + 1) % m
      quad(base + i * m + j, base + i * m + j1, base + (i + 1) * m + j1, base + (i + 1) * m + j)
    }
  }
  for (const [ring, sign] of [[0, 1], [rings.length - 1, -1]] as const) {
    const c = rings[ring].reduce<V>((a, p) => [a[0] + p[0] / m, a[1] + p[1] / m, a[2] + p[2] / m], [0, 0, 0])
    const hub = positions.length / 3
    positions.push(...c)
    dark.push(darkRings(ring))
    for (let j = 0; j < m; j++) {
      const [a, b] = [base + ring * m + j, base + ring * m + (j + 1) % m]
      if ((sign > 0) !== flip) tris.push(hub, b, a)
      else tris.push(hub, a, b)
    }
  }
}

/** A thin airfoil's outline in its chord's plane: u along the chord 0 (leading edge) … 1, v across, thickness t of the chord. */
function airfoil(n: number, t: number): Array<[number, number]> {
  const half = (u: number): number => 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4)
  const out: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI
    const u = (1 + Math.cos(a)) / 2 // from the trailing edge along one side and back along the other: dense at the nose and the tail
    out.push([u, (a < Math.PI ? 1 : -1) * half(u)])
  }
  return out
}

// ---- the fuselage ---------------------------------------------------------------------------------------------------
const TOP = [[0, -0.52], [0.1, -0.43], [0.3, -0.3], [0.7, -0.12], [1.2, 0.06], [1.8, 0.26], [2.4, 0.56], [3, 0.84], [3.6, 0.94], [5, 0.96], [8, 0.96], [11, 0.95], [12.5, 0.92], [14, 0.84], [15, 0.74], [15.9, 0.62], [16.55, 0.5]] as const
const BOT = [[0, -0.56], [0.1, -0.66], [0.3, -0.74], [0.7, -0.82], [1.2, -0.88], [1.8, -0.92], [2.4, -0.94], [3, -0.95], [5, -0.95], [8, -0.95], [11, -0.93], [12.5, -0.72], [14, -0.36], [15, -0.08], [15.9, 0.14], [16.55, 0.34]] as const
const WID = [[0, 0.04], [0.1, 0.16], [0.3, 0.28], [0.7, 0.44], [1.2, 0.6], [1.8, 0.74], [2.4, 0.85], [3, 0.92], [3.6, 0.96], [5, 0.97], [8, 0.97], [11, 0.95], [12.5, 0.86], [14, 0.66], [15, 0.46], [15.9, 0.24], [16.55, 0.06]] as const
{
  const rings: V[][] = []
  const stations: number[] = []
  for (let s = 0; s < 3; s += 0.1) stations.push(s)
  for (let s = 3; s < 16.55; s += 0.25) stations.push(s)
  stations.push(16.55)
  for (const s of stations) {
    const [t, b, w] = [curve(TOP, s), curve(BOT, s), curve(WID, s)]
    const [yc, h] = [(t + b) / 2, (t - b) / 2]
    const ring: V[] = []
    for (let j = 0; j < 48; j++) {
      const a = (j / 48) * 2 * Math.PI
      const [c, n] = [Math.cos(a), Math.sin(a)]
      const k = 2 / 2.25 // a little squarer than an ellipse, as the Learjet's section is
      ring.push(P(Math.sign(c) * Math.abs(c) ** k * w, yc + Math.sign(n) * Math.abs(n) ** k * h, s))
    }
    rings.push(ring)
  }
  loft(rings)
}

// The wing's fairing under the fuselage.
{
  const rings: V[][] = []
  for (let s = 6.7; s <= 12.8; s += 0.3) {
    const u = (s - 6.7) / 6.1
    const e = Math.sin(Math.PI * Math.min(1, u)) ** 0.45
    const ring: V[] = []
    for (let j = 0; j < 32; j++) {
      const a = (j / 32) * 2 * Math.PI
      ring.push(P(Math.cos(a) * 1.18 * e, -0.74 + Math.sin(a) * 0.34 * e + 0.12 * u * u, s))
    }
    rings.push(ring)
  }
  loft(rings)
}

/** A surface from two edges: at each height u the chord from le(u) to te(u), its plane the one through the place p(u) along s and `across`. */
function blade(n: number, us: readonly number[], at: (u: number) => { le: number; te: number; x: number; y: number; t: number; ax?: number; ay?: number }, flip: boolean): void {
  const rings = us.map((u) => {
    const c = at(u)
    const [ax, ay] = [c.ax ?? 0, c.ay ?? 1] // the direction of the thickness
    return airfoil(n, c.t).map(([v, w]) => {
      const chord = c.te - c.le
      return P(c.x + ax * w * chord, c.y + ay * w * chord, c.le + v * chord)
    })
  })
  loft(rings, flip)
}
const steps = (n: number): number[] => Array.from({ length: n + 1 }, (_, i) => i / n)

// ---- the wings and winglets -----------------------------------------------------------------------------------------
const HALF = 6.32 // the wing's tip, before the winglet
const WING_Y0 = -0.74
const DIHEDRAL = Math.tan((2.5 * Math.PI) / 180)
for (const side of [1, -1]) {
  blade(32, steps(24), (u) => {
    const x = 0.5 + u * (HALF - 0.5)
    const chord = 3.3 + u * (1.03 - 3.3) + 0.55 * Math.max(0, 0.2 - u) ** 2 / 0.04 // a little longer at the root
    const le = 7.7 + u * (10.02 - 7.7)
    return { le, te: le + chord, x: side * x, y: WING_Y0 + (x - 0.5) * DIHEDRAL, t: 0.13 - 0.03 * u }
  }, side > 0)
  // The winglet: up from the tip, canted out, swept hard.
  const tipY = WING_Y0 + (HALF - 0.5) * DIHEDRAL
  blade(24, steps(10), (u) => {
    const b = u ** 0.7 // a quick bend out of the wing
    const le = 10.02 + 1.42 * u
    const chord = 1.03 + (0.34 - 1.03) * b
    return { le, te: le + chord, x: side * (HALF + 0.36 * b), y: tipY + 0.1 * u + 1.0 * b, t: 0.09, ax: side, ay: -0.3 }
  }, side > 0)
}

// ---- the engines ----------------------------------------------------------------------------------------------------
const NAC_Y = 0.63
const NAC_X = 1.55
const NACELLE = [[0, 0.02, 1], [0.32, 0.36, 1], [0.32, 0.4, 1], [0.03, 0.44, 0], [0, 0.47, 0], [0.04, 0.5, 0], [0.2, 0.53, 0], [0.6, 0.55, 0], [1.2, 0.56, 0], [1.8, 0.53, 0], [2.3, 0.46, 0], [2.65, 0.39, 0], [2.95, 0.34, 0], [2.95, 0.3, 1], [2.75, 0.3, 1], [2.75, 0.02, 1]] as const
for (const side of [1, -1]) {
  const rings = NACELLE.map(([d, r]) => {
    const ring: V[] = []
    for (let j = 0; j < 36; j++) {
      const a = (j / 36) * 2 * Math.PI
      ring.push(P(side * NAC_X + Math.cos(a) * r, NAC_Y + Math.sin(a) * r, 10.55 + d))
    }
    return ring
  })
  loft(rings, false, (i) => NACELLE[i][2] === 1)
  // The pylon: from the fuselage's skin into the nacelle.
  blade(16, steps(3), (u) => ({ le: 11.15, te: 13.05, x: side * (0.5 + u * 0.85), y: 0.52 + u * 0.11, t: 0.1, ax: 0, ay: 1 }), side > 0)
}

// ---- the fin, the tip pod, the tailplane ----------------------------------------------------------------------------
const FIN_LE = [[0.74, 12.75], [0.95, 13.62], [1.25, 14.12], [2.82, 15.88]] as const
const FIN_TE = [[0.74, 16.38], [2.82, 16.98]] as const
{
  const rings = steps(18).map((u) => {
    const y = 0.74 + u * (2.82 - 0.74)
    const lin = (t: readonly (readonly [number, number])[]): number => {
      let i = 0
      while (i + 2 < t.length && t[i + 1][0] < y) i++
      return t[i][1] + ((y - t[i][0]) / (t[i + 1][0] - t[i][0])) * (t[i + 1][1] - t[i][1])
    }
    const [le, te] = [lin(FIN_LE), lin(FIN_TE)]
    const half = 0.2 - u * 0.12 // metres, the fin's half thickness
    return airfoil(24, 0.12).map(([v, w]) => P((w / 0.06) * half * 0.5, y, le + v * (te - le)))
  })
  loft(rings)
}
{
  const rings: V[][] = []
  for (const [s, r] of [[15.62, 0.01], [15.75, 0.06], [15.95, 0.11], [16.3, 0.14], [16.85, 0.13], [17.15, 0.08], [17.34, 0.015]] as const) {
    const ring: V[] = []
    for (let j = 0; j < 18; j++) {
      const a = (j / 18) * 2 * Math.PI
      ring.push(P(Math.cos(a) * r, 2.84 + Math.sin(a) * r * 0.95, s))
    }
    rings.push(ring)
  }
  loft(rings)
}
for (const side of [1, -1]) {
  blade(24, steps(10), (u) => {
    const le = 15.9 + u * 1.2
    const chord = 1.32 + u * (0.76 - 1.32)
    return { le, te: le + chord, x: side * (0.04 + u * 2.2), y: 2.84 + 0.02 * u, t: 0.09 }
  }, side > 0)
}

// ---- the delta fins, under the tail -----------------------------------------------------------------------------------
for (const side of [1, -1]) {
  blade(16, steps(6), (u) => {
    const le = 14.1 + u * 2.0
    const te = 16.75 + u * 0.3
    return { le, te, x: side * (0.22 + u * 0.72), y: 0.02 - u * 0.5, t: 0.03, ax: 0.5 * side, ay: 0.87 }
  }, side > 0)
}

// ---- normals: smooth within a part, sharp at a trailing edge, a lip or a cap -------------------------------------------
const SMOOTH = Math.cos((40 * Math.PI) / 180)
const nv = positions.length / 3
const nt = tris.length / 3
const faceN = new Float32Array(nt * 3)
const byVertex: number[][] = Array.from({ length: nv }, () => [])
for (let t = 0; t < nt; t++) {
  const [a, b, c] = [tris[3 * t], tris[3 * t + 1], tris[3 * t + 2]]
  const u = [positions[3 * b] - positions[3 * a], positions[3 * b + 1] - positions[3 * a + 1], positions[3 * b + 2] - positions[3 * a + 2]]
  const v = [positions[3 * c] - positions[3 * a], positions[3 * c + 1] - positions[3 * a + 1], positions[3 * c + 2] - positions[3 * a + 2]]
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const len = Math.hypot(n[0], n[1], n[2]) || 1
  faceN.set([n[0] / len, n[1] / len, n[2] / len], 3 * t)
  byVertex[a].push(t)
  byVertex[b].push(t)
  byVertex[c].push(t)
}
const outPos: number[] = []
const outNrm: number[] = []
const outCol: number[] = []
const outIdx: number[] = []
const seen = new Map<string, number>()
for (let t = 0; t < nt; t++) {
  for (let k = 0; k < 3; k++) {
    const v = tris[3 * t + k]
    let [x, y, z] = [0, 0, 0]
    for (const f of byVertex[v]) {
      const dot = faceN[3 * t] * faceN[3 * f] + faceN[3 * t + 1] * faceN[3 * f + 1] + faceN[3 * t + 2] * faceN[3 * f + 2]
      if (dot < SMOOTH) continue
      x += faceN[3 * f]
      y += faceN[3 * f + 1]
      z += faceN[3 * f + 2]
    }
    const len = Math.hypot(x, y, z) || 1
    const n: V = [x / len, y / len, z / len]
    const key = `${v}:${n.map((c) => c.toFixed(2)).join(',')}`
    let i = seen.get(key)
    if (i === undefined) {
      i = outPos.length / 3
      seen.set(key, i)
      outPos.push(positions[3 * v], positions[3 * v + 1], positions[3 * v + 2])
      outNrm.push(...n)
      const c = dark[v] ? 8 : shade(n[1]) // near-black: the shader's dark glass, here the fan and the jet pipe
      outCol.push(c, c, c, 255)
    }
    outIdx.push(i)
  }
}

const dir = new URL('../../public/models/lj60/', import.meta.url)
const template = readGlb(new Uint8Array(readFileSync(new URL('../../public/models/c550/model.glb', import.meta.url))))
const json = {
  ...template.json,
  asset: { version: '2.0', generator: 'Flight Chaser tools/models/lj60.ts', copyright: 'MIT, Flight Chaser: lofted by tools/models/lj60.ts from the Learjet 60\'s published sizes and photographs of N722BD' },
  nodes: [{ mesh: 0, name: 'lj60' }],
  meshes: [{ ...template.json.meshes[0], name: 'lj60' }],
}
writeFileSync(new URL('model.glb', dir), writeGlb({ json, pos: new Float32Array(outPos), nrm: new Float32Array(outNrm), col: new Uint8Array(outCol), idx: new Uint32Array(outIdx) }))
console.log(`lj60: ${outIdx.length / 3} triangles, ${outPos.length / 3} vertices`)
