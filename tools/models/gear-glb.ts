// tools/models/gear-glb.ts
// Each airliner's landing gear: public/models/<id>/gear.glb and its model.json `gear` entry. The type models are joined
// meshes without gear (they sat on their engines). The gear is authored in the body frame (nose +X, left +Y, up +Z;
// metres, the models' own unit: every manifest scale is 1), one node per leg hinged at the top of its strut, under a
// root node that turns the body frame into the GLB's glTF frame (fixMatrix⁻¹ then GLTF_TO_CESIUM⁻¹, what Cesium and
// modelMatrixFor apply to the aircraft). The app swings each leg about its hinge to retract it (manifest legs: node,
// axis in the body frame, upDeg).
//
//   node tools/models/gear-glb.ts            print each model's `"gear": {…}` line
//   node tools/models/gear-glb.ts --write    write the GLBs, each model's gear line and its gearHeightM (wheels down)
//
// Layout per type from published dimensions (the package's recipe.json: gear; approximate; E175's wheelbase fitted to its model's wing; E190 from
// Embraer APM-1901 figures 2.1 and 7.1 and table 2.2, its gear 0.38 m forward of the published 4.13 m nose-gear station
// because this model's wing-root trailing edge ends just ahead of the published main gear line), the nose gear noseAftM
// behind the model's nose tip, the mains wheelbaseM behind it, trackM apart; each strut from inside the skin above it (a
// ray from below: the wing or the belly) down to its axle; the wheels touch clearanceM below the model's lowest point
// (its engines, or its belly).
import { writeFileSync } from 'node:fs'
import { Matrix3, Matrix4 } from 'cesium'
import { GLTF_TO_CESIUM, fixMatrix } from '../../client/scene/model.ts'
import type { ModelManifest, ModelManifestEntry } from '../../client/types.ts'
import { loadBody, ray, type Mesh } from './light-anchors.ts'
import { asked, fileOf, readManifest, recipeOf, writeModel } from './packages.ts'

type V = [number, number, number]

/** A type's gear, metres. Tyres: [diameter, width]. */
export interface GearSpec {
  noseAftM: number // nose gear axle behind the nose tip
  wheelbaseM: number // nose gear axle to the main (wing) gear's centre
  trackM: number // between the main legs' centre lines
  mains: 1 | 2 | 4 | 6 // wheels per main leg: single, dual, bogie of 2 or 3 axles
  mainTyre: [number, number]
  noseTyre: [number, number]
  noseWheels?: 1 | 2
  clearanceM: number // the wheels' bottom this far below the model's lowest point
  mainsRetract: 'inboard' | 'forward'
  /** Body gear (747, A380): this far behind the wing gear, this far apart (0: one leg on the centre line, node bodyC: A340, MD-11); wheels per leg (4 without it); 'aft': it swings back and up (forward without it). */
  body?: { aftM: number; trackM: number; wheels?: 2 | 4 | 6; retract?: 'forward' | 'aft' }
}

export interface Part {
  name: string
  color: V // linear RGB
  metallic: number
  roughness: number
  pos: number[]
  nrm: number[]
}

/** One leg: its node, its hinge (body frame, metres), its geometry relative to the hinge, and how it retracts. */
export interface Leg {
  node: string
  hinge: V
  parts: Part[]
  axis: V // body frame
  upDeg: number // retracted: this far about axis (right-handed)
}

export interface Gear {
  legs: Leg[]
  heightM: number // the model origin to the wheels' bottom, gear down
}

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Adds a triangle, wound counter-clockwise as seen from the side its normals point to (glTF front faces). */
function tri(p: Part, a: V, b: V, c: V, na: V, nb: V = na, nc: V = na): void {
  const g = cross(sub(b, a), sub(c, a))
  const [v, n] = dot(g, [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]]) >= 0 ? [[a, b, c], [na, nb, nc]] : [[a, c, b], [na, nc, nb]]
  for (const k of [0, 1, 2]) {
    p.pos.push(...v[k])
    p.nrm.push(...n[k])
  }
}

/** A box around c with half sizes h. */
function box(p: Part, c: V, h: V): void {
  for (const axis of [0, 1, 2]) {
    for (const s of [-1, 1]) {
      const n: V = [0, 0, 0]
      n[axis] = s
      const [u, w] = [(axis + 1) % 3, (axis + 2) % 3]
      const corner = (du: number, dw: number): V => {
        const q: V = [...c]
        q[axis] += s * h[axis]
        q[u] += du * h[u]
        q[w] += dw * h[w]
        return q
      }
      tri(p, corner(-1, -1), corner(1, -1), corner(1, 1), n)
      tri(p, corner(-1, -1), corner(1, 1), corner(-1, 1), n)
    }
  }
}

/** A tyre on an axle along y (lateral): an eight-sided prism, smooth tread, flat sides. */
function wheel(p: Part, [cx, cy, cz]: V, r: number, halfW: number): void {
  const N = 8
  const at = (k: number): { x: number; z: number; n: V } => {
    const t = (2 * Math.PI * k) / N
    return { x: cx + r * Math.sin(t), z: cz - r * Math.cos(t), n: [Math.sin(t), 0, -Math.cos(t)] }
  }
  for (let k = 0; k < N; k++) {
    const [a, b] = [at(k), at(k + 1)]
    tri(p, [a.x, cy - halfW, a.z], [a.x, cy + halfW, a.z], [b.x, cy + halfW, b.z], a.n, a.n, b.n)
    tri(p, [a.x, cy - halfW, a.z], [b.x, cy + halfW, b.z], [b.x, cy - halfW, b.z], a.n, b.n, b.n)
    if (k === 0 || k === N - 1) continue
    for (const s of [-1, 1]) tri(p, [at(0).x, cy + s * halfW, at(0).z], [a.x, cy + s * halfW, a.z], [b.x, cy + s * halfW, b.z], [0, s, 0])
  }
}

const STRUT: Omit<Part, 'pos' | 'nrm'> = { name: 'strut', color: [0.55, 0.57, 0.6], metallic: 0.6, roughness: 0.45 }
const TYRE: Omit<Part, 'pos' | 'nrm'> = { name: 'tyre', color: [0.045, 0.045, 0.05], metallic: 0, roughness: 0.9 }
export const INSET_M = 0.3 // the strut's top this far inside the skin

/**
 * One leg hinged at (x, y, top): its strut down to the axle, the axle's wheels (1 central, 2 either side of the strut,
 * or bogies of 2 or 3 axles), all relative to the hinge. groundZ: the wheels' bottom, body frame.
 */
function leg(node: string, x: number, y: number, top: number, groundZ: number, wheels: number, [dia, w]: [number, number], axis: V, upDeg: number): Leg {
  const strut: Part = { ...STRUT, pos: [], nrm: [] }
  const tyre: Part = { ...TYRE, pos: [], nrm: [] }
  const r = dia / 2
  const axleZ = groundZ + r - top // relative to the hinge
  const s = Math.max(0.07, 0.1 * dia) // strut half thickness
  box(strut, [0, 0, axleZ / 2], [s, s, -axleZ / 2]) // from the hinge (inside the skin) to the axle
  const off = w / 2 + s + 0.04
  const axles = wheels === 6 ? [-1.45, 0, 1.45] : wheels === 4 ? [-0.73, 0.73] : [0]
  if (axles.length > 1) box(strut, [0, 0, axleZ], [Math.max(...axles) + s, s, s]) // bogie beam
  for (const ax of axles) {
    if (wheels === 1) {
      wheel(tyre, [ax, 0, axleZ], r, w / 2)
      continue
    }
    box(strut, [ax, 0, axleZ], [s * 0.7, off, s * 0.7]) // the axle, its ends inside the wheels
    for (const dy of [-off, off]) wheel(tyre, [ax, dy, axleZ], r, w / 2)
  }
  return { node, hinge: [x, y, top], parts: [strut, tyre], axis, upDeg }
}

/** Highest z below which a ray from under the model at (x, y) first meets its skin; null when it misses. */
export function skinAbove(m: Mesh, x: number, y: number, fromZ: number): number | null {
  const t = ray(m, [x, y, fromZ], [0, 0, 1])
  return t === null ? null : fromZ + t
}

/** e's gear from its spec, measured on its mesh (body frame). */
export function gearFor(e: ModelManifestEntry, spec: GearSpec, m: Mesh): Gear {
  let noseX = -Infinity
  let lowZ = Infinity
  for (let i = 0; i < m.p.length; i += 3) {
    noseX = Math.max(noseX, m.p[i])
    lowZ = Math.min(lowZ, m.p[i + 2])
  }
  const groundZ = lowZ - spec.clearanceM
  const from = lowZ - 5
  /**
   * Where a leg meant for (x, y) hangs from: the skin above it (a low wing's root, the belly, a gear fairing) if that is
   * within reach of the belly there (1.5 m, 3.5 % of the length on a big jet: a 777's wing root is 2 m up), else the
   * nearest such skin further inboard (a high wing's gear fairings: ATR 72).
   */
  const reach = Math.max(1.5, 0.035 * e.lengthM)
  const mount = (x: number, y: number): { y: number; top: number } => {
    const belly = skinAbove(m, x, 0, from) ?? lowZ + 1
    for (let f = 1; f > 0.3; f -= 0.05) {
      const z = skinAbove(m, x, y * f, from)
      if (z !== null && z < belly + reach) return { y: y * f, top: z + INSET_M }
    }
    return { y: 0, top: belly + INSET_M }
  }
  const xNose = noseX - spec.noseAftM
  const xMain = xNose - spec.wheelbaseM
  const fwd: V = [0, 1, 0] // about the left axis, −90°: the leg swings forward and up
  const at = (node: string, x: number, y: number, wheels: number, tyre: [number, number], axis: V, upDeg: number): Leg => {
    const p = mount(x, y)
    return leg(node, x, p.y, p.top, groundZ, wheels, tyre, axis, upDeg)
  }
  const legs: Leg[] = [at('nose', xNose, 0, spec.noseWheels ?? 2, spec.noseTyre, fwd, -90)]
  for (const [node, y] of [['mainL', spec.trackM / 2], ['mainR', -spec.trackM / 2]] as const) {
    legs.push(spec.mainsRetract === 'forward' ? at(node, xMain, y, spec.mains, spec.mainTyre, fwd, -90) : at(node, xMain, y, spec.mains, spec.mainTyre, [1, 0, 0], y > 0 ? -90 : 90)) // inboard: about the nose axis
  }
  if (spec.body) {
    const xb = xMain - spec.body.aftM
    const bodyLegs: Array<[string, number]> = spec.body.trackM === 0 ? [['bodyC', 0]] : [['bodyL', spec.body.trackM / 2], ['bodyR', -spec.body.trackM / 2]]
    for (const [node, y] of bodyLegs) legs.push(at(node, xb, y, spec.body.wheels ?? 4, spec.mainTyre, fwd, spec.body.retract === 'aft' ? 90 : -90))
  }
  return { legs, heightM: -groundZ * e.scale }
}

const pad = (b: Uint8Array, fill: number): Uint8Array => {
  const out = new Uint8Array(Math.ceil(b.length / 4) * 4).fill(fill)
  out.set(b)
  return out
}

/** The root node's matrix: the body frame into e's glTF frame, (fixMatrix · GLTF_TO_CESIUM)⁻¹, column-major. */
export function rootMatrix(e: ModelManifestEntry): number[] {
  const fixInv = Matrix4.fromRotationTranslation(Matrix3.transpose(fixMatrix(e), new Matrix3()))
  const m = Matrix4.multiply(Matrix4.inverseTransformation(GLTF_TO_CESIUM, new Matrix4()), fixInv, new Matrix4())
  return Matrix4.toArray(m).map((v) => Math.round(v * 1e9) / 1e9 + 0)
}

/** A glTF 2.0 binary: a root node (matrix) with one child node per leg (translation: its hinge), one mesh each. */
export function glb(legs: Leg[], root: number[]): Uint8Array {
  const arrays: Float32Array[] = []
  const bufferViews: object[] = []
  const accessors: object[] = []
  let offset = 0
  const add = (data: number[], bounds: boolean): number => {
    const a = new Float32Array(data)
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: a.byteLength, target: 34962 })
    const acc: Record<string, unknown> = { bufferView: bufferViews.length - 1, componentType: 5126, count: a.length / 3, type: 'VEC3' }
    if (bounds) {
      acc.min = [0, 1, 2].map((c) => Math.min(...a.filter((_, i) => i % 3 === c)))
      acc.max = [0, 1, 2].map((c) => Math.max(...a.filter((_, i) => i % 3 === c)))
    }
    accessors.push(acc)
    arrays.push(a)
    offset += a.byteLength
    return accessors.length - 1
  }
  const meshes = legs.map((l) => ({
    name: l.node,
    primitives: l.parts.filter((p) => p.pos.length > 0).map((p) => ({ attributes: { POSITION: add(p.pos, true), NORMAL: add(p.nrm, false) }, material: p.name === 'strut' ? 0 : 1 })),
  }))
  const gltf = {
    asset: { version: '2.0', generator: 'FlightHopper tools/models/gear-glb.ts' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'gear', matrix: root, children: legs.map((_, i) => i + 1) }, ...legs.map((l, i) => ({ name: l.node, translation: l.hinge, mesh: i }))],
    meshes,
    materials: [STRUT, TYRE].map((p) => ({ name: p.name, pbrMetallicRoughness: { baseColorFactor: [...p.color, 1], metallicFactor: p.metallic, roughnessFactor: p.roughness } })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  }
  const json = pad(new TextEncoder().encode(JSON.stringify(gltf)), 0x20)
  const bin = new Uint8Array(offset)
  let o = 0
  for (const a of arrays) {
    bin.set(new Uint8Array(a.buffer), o)
    o += a.byteLength
  }
  const out = new Uint8Array(12 + 8 + json.length + 8 + bin.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, 0x46546c67, true) // 'glTF'
  dv.setUint32(4, 2, true)
  dv.setUint32(8, out.length, true)
  dv.setUint32(12, json.length, true)
  dv.setUint32(16, 0x4e4f534a, true) // 'JSON'
  out.set(json, 20)
  dv.setUint32(20 + json.length, bin.length, true)
  dv.setUint32(24 + json.length, 0x004e4942, true) // 'BIN'
  out.set(bin, 28 + json.length)
  return out
}

export const gearUri = (id: string): string => `models/${id}/gear.glb`
const cm = (x: number): number => Math.round(x * 100) / 100 + 0

/** The manifest entry for a gear: where it is, how high it stands, how each leg retracts. */
export function gearEntry(id: string, g: Gear): NonNullable<ModelManifestEntry['gear']> {
  return { uri: gearUri(id), heightM: cm(g.heightM), legs: g.legs.map((l) => ({ node: l.node, axis: l.axis, upDeg: l.upDeg })) }
}

/** Every geared model of the manifest: its GLB bytes and manifest entry. */
export function allGear(manifest: ModelManifest): Array<{ e: ModelManifestEntry; bytes: Uint8Array; entry: NonNullable<ModelManifestEntry['gear']> }> {
  return manifest.models.flatMap((e) => {
    const r = recipeOf(e.id)
    const spec = r.base === undefined ? r.gear : undefined // a derived model's gear is variants.ts's work
    if (spec === undefined) return []
    const g = gearFor(e, spec, loadBody(e))
    return [{ e, bytes: glb(g.legs, rootMatrix(e)), entry: gearEntry(e.id, g) }]
  })
}

/** The manifest line: `"gear": { … }`, the manifest's one-line-per-field style. */
export function gearLine(g: NonNullable<ModelManifestEntry['gear']>): string {
  const legs = (g.legs ?? []).map((l) => `{ "node": "${l.node}", "axis": [${l.axis.join(', ')}], "upDeg": ${l.upDeg} }`).join(', ')
  return `"gear": { "uri": "${g.uri}", "heightM": ${g.heightM}, "legs": [${legs}] }`
}

if (import.meta.main) {
  process.getBuiltinModule('node:os').setPriority(19) // gives way to whatever else runs on this machine
  const manifest = readManifest()
  const write = process.argv.includes('--write')
  const ids = new Set(asked(manifest).map((e) => e.id))
  for (const { e, bytes, entry } of allGear(manifest)) {
    if (!ids.has(e.id)) continue
    console.log(`${e.id}: ${gearLine(entry)}`)
    if (!write) continue
    writeFileSync(fileOf(e.id, 'gear.glb'), bytes)
    // gearHeightM: the model stands on its wheels. The fields keep their places (gear after scale in a new entry).
    const { gear: _old, gearHeightM: _h, ...rest } = e
    const fields: Array<[string, unknown]> = Object.entries(rest)
    fields.splice(Object.keys(rest).indexOf('forwardAxisFix') + 1, 0, ['gearHeightM', entry.heightM])
    fields.splice(fields.findIndex(([k]) => k === 'scale') + 1, 0, ['gear', entry])
    writeModel(Object.fromEntries(fields) as unknown as ModelManifestEntry)
  }
}
