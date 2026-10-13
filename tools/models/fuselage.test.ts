// tools/models/fuselage.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { ModelManifest, ModelManifestEntry, ModelProfile, Paint } from '../../client/types.ts'
import { applyFuselage, type FuselageOp, type Plugged } from './fuselage.ts'
import type { GearSpec } from './gear-glb.ts'
import { readGlb } from './glb.ts'
import type { Stations } from './packages.ts'
import { partBoxes, parts, profileOf, section } from './profile.ts'
import { meshOf, toWork, type Work } from './variants.ts'

/** The manifest: every package's model.json (packages.ts), or the one file it was before the packages. */
async function readModels(): Promise<ModelManifest> {
  try {
    return (await import('./packages.ts')).readManifest()
  } catch {
    return JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8'))
  }
}
const manifest = await readModels()
const byId = (id: string): ModelManifestEntry => manifest.models.find((m) => m.id === id)!
const workOf = (e: ModelManifestEntry): Work => toWork(readGlb(new Uint8Array(readFileSync(new URL(`../../public/${e.uri}`, import.meta.url)))), e)
const near = (a: number, b: number, tol: number, msg = ''): void => assert.ok(Math.abs(a - b) <= tol, `${msg} got ${a}, expected ${b} ± ${tol}`)

/** The painted source models the op must work on. */
const BASES = ['a320', 'a321', 'b738', 'b773', 'b789', 'a333', 'a359', 'e75l', 'e190', 'crj9', 'at75']

/**
 * Real family members, each from its base. The length ahead of the wing is the difference of the wheelbases (the nose
 * gear is on the nose section, the main gear on the wing); the rest of the difference in overall length is behind it.
 * - A319: Airbus AC A319 and AC A320 (Rev Jun 2024): 33.84 m and 37.57 m long, wheelbase 11.04 m and 12.64 m.
 * - 737-700, 737-900: Boeing D6-58325-7 Rev C (Oct 2025), https://www.boeing.com/content/dam/boeing/v2/airports/acaps/737NG_REV_C.pdf:
 *   110 ft 4 in (33.63 m), 129 ft 6 in (39.47 m) and 138 ft 2 in (42.11 m) long (section 1.3, figures 2.2.3, 2.2.5,
 *   2.2.7); wheelbase 12.60 m, 15.60 m and 17.17 m (the same figures; table 4.3.1, column X). So the 737-800 has 3.00 m
 *   (118 in) more than the 737-700 ahead of the wing and 2.84 m (112 in) more behind it; the 737-900 has 1.57 m (62 in)
 *   and 1.07 m (42 in) more than the 737-800. Flight International, 19 Nov 1997, on the 737-900: "a 1.57m plug forward
 *   of the wing and a 1.06m plug aft". Section 1.3 of the Boeing document says 54 in and 42 in, 8 in less than its own
 *   two lengths.
 * - CRJ700: Flight International on the CRJ900 (2001, 2002): fuselage plugs of 2.29 m forward and 1.57 m aft of the wing.
 * - ATR 42: ATR's sheets: the ATR 42 is 22.67 m long with a wheelbase of 8.78 m, the ATR 72 27.17 m and 10.77 m.
 */
const CASES: Array<{ name: string; base: string; op: Required<Pick<FuselageOp, 'foreM' | 'aftM'>>; lengths?: [number, number] }> = [
  { name: 'A319', base: 'a320', op: { foreM: -1.6, aftM: -2.13 }, lengths: [37.57, 33.84] },
  { name: '737-700', base: 'b738', op: { foreM: -3.0, aftM: -2.84 }, lengths: [39.47, 33.63] },
  { name: '737-900', base: 'b738', op: { foreM: 1.57, aftM: 1.07 }, lengths: [39.47, 42.11] },
  { name: 'CRJ700', base: 'crj9', op: { foreM: -2.29, aftM: -1.57 } },
  { name: 'ATR 42', base: 'at75', op: { foreM: -1.99, aftM: -2.51 }, lengths: [27.17, 22.67] },
]

interface Loaded { e: ModelManifestEntry; paint: Paint; profile: ModelProfile; work: Work }
const loaded = new Map<string, Loaded>()
function load(id: string): Loaded {
  let l = loaded.get(id)
  if (l === undefined) {
    const e = byId(id)
    loaded.set(id, (l = { e, paint: e.paint!, profile: e.profile ?? profileOf(e).profile, work: workOf(e) }))
  }
  return l
}
const plug = (id: string, op: FuselageOp): Plugged => applyFuselage(load(id).work, op, load(id).e, load(id).profile)
const built = CASES.map((c) => ({ ...c, ...load(c.base), r: plug(c.base, c.op) }))

const vertices = (w: Work): number => w.p.length / 3
/** [zMin, zMax, the widest |x|] of a mesh. */
function extent(w: Work): [number, number, number] {
  let [z0, z1, x] = [Infinity, -Infinity, 0]
  for (let i = 0; i < w.p.length; i += 3) [z0, z1, x] = [Math.min(z0, w.p[i + 2]), Math.max(z1, w.p[i + 2]), Math.max(x, Math.abs(w.p[i]))]
  return [z0, z1, x]
}
/** How far each vertex that `pick` takes moved along z: [least, most, how many]. */
function moved(a: Work, b: Work, pick: (x: number, y: number, z: number) => boolean): [number, number, number] {
  let [lo, hi, n] = [Infinity, -Infinity, 0]
  for (let i = 0; i < a.p.length; i += 3) {
    if (!pick(a.p[i], a.p[i + 1], a.p[i + 2])) continue
    const d = b.p[i + 2] - a.p[i + 2]
    ;[lo, hi, n] = [Math.min(lo, d), Math.max(hi, d), n + 1]
  }
  return [lo, hi, n]
}
/** Each triangle's normal, its length twice the area. */
function faces(w: Work): number[][] {
  const out: number[][] = []
  for (let t = 0; t < w.tri.length; t += 3) {
    const [a, b, c] = [3 * w.tri[t], 3 * w.tri[t + 1], 3 * w.tri[t + 2]]
    const [u, v] = [[0, 1, 2].map((k) => w.p[b + k] - w.p[a + k]), [0, 1, 2].map((k) => w.p[c + k] - w.p[a + k])]
    out.push([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])
  }
  return out
}
/** Engines on the rear fuselage: their box wholly behind the wing root. */
const rearEngines = (l: Loaded): boolean => l.profile.engines !== null && l.profile.engines[3] < l.profile.wing[1]
/** Where the tail's parts begin: a metre ahead of the tailplane's leading edge, or of the rear engines' inlets. */
const tailFront = (l: Loaded): number => Math.max(l.profile.stab![1], rearEngines(l) ? l.paint.engines[3] : -Infinity) + 1
/** Wider than the fuselage and ahead of the tail: the wing and all that hangs on it. */
const onWing = (l: Loaded) => (x: number, _y: number, z: number): boolean => Math.abs(x) > 1.05 * l.paint.bodyHalfWidth && z > tailFront(l)

/**
 * No triangle turned over or squashed to nothing; every normal still a unit vector. The base's own slivers, under 2 cm
 * wide and over 25 times as long, are counted apart: a decimated skin has a few, metres long, from one ring to a far
 * one, and a hairline across a barrel's end has no face to keep. No more than six of them may turn.
 */
function sound(a: Work, b: Work, least: number, msg: string): void {
  const [f0, f1] = [faces(a), faces(b)]
  let turned = 0
  for (let t = 0; t < f0.length; t++) {
    const area = Math.hypot(...f0[t])
    if (area < 1e-9) continue // no area at all
    const v = [0, 1, 2].map((k) => [0, 1, 2].map((c) => a.p[3 * a.tri[3 * t + k] + c]))
    const longest = Math.max(...[0, 1, 2].map((k) => Math.hypot(...v[k].map((q, c) => q - v[(k + 1) % 3][c]))))
    const kept = f0[t][0] * f1[t][0] + f0[t][1] * f1[t][1] + f0[t][2] * f1[t][2] > 0
    if (area < 0.02 * longest && area < longest * longest / 25) { // its width: twice its area over its longest side
      if (!kept) turned++
      continue
    }
    assert.ok(kept, `${msg}: triangle ${t} turned over`)
    assert.ok(Math.hypot(...f1[t]) >= least * area, `${msg}: triangle ${t} squashed (${Math.hypot(...f1[t]) / area} of its area)`)
  }
  assert.ok(turned <= 6, `${msg}: ${turned} slivers turned over`)
  for (let i = 0; i < a.n.length; i += 3) near(Math.hypot(b.n[i], b.n[i + 1], b.n[i + 2]), Math.hypot(a.n[i], a.n[i + 1], a.n[i + 2]), 1e-6, `${msg}: normal ${i / 3}`)
}

test('the overall length changes by foreM + aftM; the span, the triangles and the vertices do not; nothing moves sideways or up', () => {
  for (const { name, work, op, r, lengths } of built) {
    const [a, b] = [extent(work), extent(r.work)]
    near(b[1] - b[0] - (a[1] - a[0]), op.foreM + op.aftM, 0.02, `${name} length`)
    near(r.lengthM, op.foreM + op.aftM, 1e-9, `${name} lengthM`)
    if (lengths) near(lengths[0] + r.lengthM, lengths[1], 0.011, `${name} published length`)
    near(b[1] - a[1], op.foreM, 1e-9, `${name}: the nose tip moves by foreM`)
    assert.equal(b[2], a[2], `${name} span`)
    assert.equal(vertices(r.work), vertices(work), `${name} vertices`)
    assert.deepEqual(r.work.tri, work.tri, `${name} triangles`)
    assert.deepEqual(r.work.c, work.c, `${name} colours`)
    for (let i = 0; i < work.p.length; i += 3) assert.ok(r.work.p[i] === work.p[i] && r.work.p[i + 1] === work.p[i + 1], `${name}: vertex ${i / 3} left its section`)
  }
})

test('the wing stays, with its nacelles, pylons and fairings', () => {
  for (const l of built) {
    const [lo, hi, n] = moved(l.work, l.r.work, onWing(l))
    assert.ok(n > 100, `${l.name}: wing vertices found (${n})`)
    assert.ok(lo === 0 && hi === 0, `${l.name}: the wing moved (${lo} … ${hi})`)
    // the wing-to-body fairing: the parts on the fuselage, not the skin, that reach the wing root's chord
    const part = parts(meshOf(l.work))
    for (const { box: b, n: tris } of partBoxes(meshOf(l.work), part).values()) {
      if (tris < 80 || b[5] - b[4] > 0.5 * l.e.lengthM || b[4] > l.profile.wing[0] || b[5] < l.profile.wing[1] || Math.max(-b[0], b[1]) > 1.05 * l.paint.bodyHalfWidth) continue
      const d = moved(l.work, l.r.work, (x, y, z) => x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3] && z >= b[4] && z <= b[5] && Math.abs(x) > 0.95 * l.paint.bodyHalfWidth)
      assert.ok(d[2] === 0 || (d[0] === 0 && d[1] === 0), `${l.name}: the fairing's side moved (${d})`)
    }
  }
})

test('the fin, the tailplane and engines on the rear fuselage move with the tail, as they are', () => {
  for (const l of built) {
    const { name, work, r, paint, profile, op } = l
    const rigid = (what: string, pick: (x: number, y: number, z: number) => boolean): void => {
      const [lo, hi, n] = moved(work, r.work, pick)
      assert.ok(n >= 6, `${name}: ${what} found (${n} vertices)`)
      near(lo, -op.aftM, 1e-9, `${name} ${what}`)
      near(hi, -op.aftM, 1e-9, `${name} ${what}`)
    }
    rigid('fin', (x, y, z) => Math.abs(x) < Math.min(paint.fin.halfWidth, 0.7) && y > paint.fin.aboveY + 0.5 && z < paint.fin.behindZ)
    rigid('tailplane', (x, _y, z) => Math.abs(x) > 1.05 * paint.bodyHalfWidth && Math.abs(x) <= profile.stab![2] + 0.01 && z <= profile.stab![1] + 0.01)
    if (rearEngines(l)) rigid('rear engines', (x, _y, z) => Math.abs(x) >= paint.engines[0] && Math.abs(x) <= paint.engines[1] && z >= paint.engines[2] - 0.05 && z <= paint.engines[3] + 0.05)
  }
  assert.ok(rearEngines(load('crj9')) && !rearEngines(load('a320')) && !rearEngines(load('at75')), 'the CRJ900 has its engines on the rear fuselage')
})

test('no triangle is turned over or squashed, and the normals stay unit vectors', () => {
  for (const { name, work, r } of built) sound(work, r.work, 0.25, name)
})

test('a barrel is constant from end to end, and the skin keeps its section in it: the same top, bottom and width at the station it moved to', () => {
  for (const { name, e, work, r, paint, profile } of built) {
    const [m0, m1] = [meshOf(work), meshOf(r.work)]
    const part = parts(m0) // the same triangles in both meshes
    const boxes = partBoxes(m0, part)
    const skin = (t: number): boolean => { // the long parts within the fuselage's width
      const b = boxes.get(part[t])!.box
      return Math.max(-b[0], b[1]) <= 1.05 * paint.bodyHalfWidth && b[5] - b[4] > 0.4 * e.lengthM
    }
    const shape = (m: typeof m0, z: number): number[] => {
      const s = section(m, 2, z, skin)
      let [bottom, top, wide] = [Infinity, -Infinity, 0]
      for (let k = 0; k < s.length; k += 2) [bottom, top, wide] = [Math.min(bottom, s[k + 1]), Math.max(top, s[k + 1]), Math.max(wide, Math.abs(s[k]))]
      return [bottom, top, wide]
    }
    const nose = profile.body[0][0]
    for (const [from, to] of [r.barrels.fore, r.barrels.aft]) {
      assert.ok(to - from > 2, `${name}: a barrel of ${to - from} m`)
      const ends = [0.01, 0.5, 0.99].map((f) => shape(m0, nose - (from + f * (to - from))))
      for (const k of [0, 1]) for (const end of [0, 2]) near(ends[end][k], ends[1][k], 0.03 * 0.5 * (to - from) + 0.005, `${name}: the barrel ${from} m … ${to} m is not constant (${['bottom', 'top'][k]})`)
      for (const f of [0.2, 0.5, 0.8]) {
        const z = nose - (from + f * (to - from))
        const [a, b] = [shape(m0, z), shape(m1, r.mapZ(z))]
        assert.ok(a[1] - a[0] > 2, `${name}: a section at z = ${z}`)
        for (const k of [0, 1, 2]) near(b[k], a[k], 0.01, `${name} at z = ${z.toFixed(2)} (${['bottom', 'top', 'half-width'][k]})`)
      }
    }
  }
})

test('the barrels lie between the wing root and the fin, one ahead and one behind, and the map is continuous', () => {
  for (const { name, r, profile, op } of built) {
    const nose = profile.body[0][0]
    const [f, a] = [r.barrels.fore.map((d) => nose - d), r.barrels.aft.map((d) => nose - d)] // z: [nose end, tail end]
    assert.ok(f[0] > f[1] && f[1] >= profile.wing[0] - 0.01, `${name}: the forward barrel ahead of the wing root (${f})`)
    assert.ok(a[0] <= profile.wing[1] + 0.01 && a[0] > a[1] && a[1] > profile.finRoot[1], `${name}: the aft barrel between the wing root and the fin (${a})`)
    near(r.mapZ(nose), nose + op.foreM, 1e-9, `${name} nose`)
    near(r.mapZ((profile.wing[0] + profile.wing[1]) / 2), (profile.wing[0] + profile.wing[1]) / 2, 1e-9, `${name} wing`)
    near(r.mapZ(profile.finRoot[2]), profile.finRoot[2] - op.aftM, 1e-9, `${name} tail`)
    for (let z = nose; z > profile.box[0]; z -= 0.05) {
      const step = r.mapZ(z) - r.mapZ(z - 0.05)
      assert.ok(step > 0.3 * 0.05 - 1e-9 && step < 3 * 0.05, `${name}: the map at z = ${z} (${step})`)
    }
  }
})

test('movePaint: the fin and its marks with the tail, the window row and the title with the skin, wing engines where they were', () => {
  for (const l of built) {
    const { name, paint, r, op } = l
    const before = structuredClone(paint)
    const p = r.movePaint(paint)
    assert.deepEqual(paint, before, `${name}: the base's paint map is not touched`)
    near(p.fin.behindZ, paint.fin.behindZ - op.aftM, 0.0051, `${name} fin.behindZ`)
    near(p.finSplit[1], paint.finSplit[1] - op.aftM, 0.0051, `${name} finSplit`)
    near(p.finLogo[0], paint.finLogo[0] - op.aftM, 0.0051, `${name} finLogo`)
    near(p.title[0], r.mapZ(paint.title[0]), 0.0051, `${name} title`)
    near(p.windows![1], r.mapZ(paint.windows![1]), 0.0051, `${name} windows aft`)
    near(p.windows![2], r.mapZ(paint.windows![2]), 0.0051, `${name} windows fore`)
    near(p.windows![2] - p.windows![1] - (paint.windows![2] - paint.windows![1]), op.foreM + op.aftM, 0.5, `${name}: the window row changes with the cabin`)
    assert.deepEqual([p.fin.aboveY, p.fin.halfWidth, p.finSplit[0], p.finSplit[2], p.finLogo.slice(1), p.title.slice(1), p.windows![0], p.windows![3], p.bodyHalfWidth, p.bellyBelowY, p.noseMinusZ],
      [paint.fin.aboveY, paint.fin.halfWidth, paint.finSplit[0], paint.finSplit[2], paint.finLogo.slice(1), paint.title.slice(1), paint.windows![0], paint.windows![3], paint.bodyHalfWidth, paint.bellyBelowY, paint.noseMinusZ], `${name}: nothing else changes`)
    const engines = rearEngines(l) ? [paint.engines[0], paint.engines[1], paint.engines[2] - op.aftM, paint.engines[3] - op.aftM] : paint.engines
    for (const k of [0, 1, 2, 3]) near(p.engines[k], engines[k], 0.0051, `${name} engines[${k}]`)
    if (paint.cut) {
      near(p.cut!.tailConeZ, paint.cut.tailConeZ - op.aftM, 0.0051, `${name} cut.tailConeZ`)
      for (const k of [0, 3]) assert.equal(p.cut!.finEdges[k], paint.cut.finEdges[k], `${name}: the fin edges' heights`)
      for (const k of [1, 2, 4, 5]) near(p.cut!.finEdges[k], paint.cut.finEdges[k] - op.aftM, 0.0051, `${name} cut.finEdges[${k}]`)
    }
  }
  assert.ok(load('b738').paint.cut !== undefined, 'the 737-800 has a damage map to move')
  // a decal box over the whole fuselage ends where the nose and the tail went
  const body = built[0].r.movePaint({ ...built[0].paint, body: [19, -19, -5, -1] }).body!
  assert.deepEqual(body, [17.4, -16.87, -5, -1])
})

test('stations and gear: the A319, the 737-700 and the 737-900 come out with their published doors, lengths and wheelbases', () => {
  const a320: Stations = { lengthM: 37.57, doors: [5.04, 29.53], cockpit: 3.26, source: 'AC A320' }
  const b738: Stations = { lengthM: 39.47, doors: [5.03, 31.88], cockpit: 2.92, source: 'D6-58325-7' }
  const gear = (wheelbaseM: number): GearSpec => ({ noseAftM: 5.1, wheelbaseM, trackM: 7.59, mains: 2, mainTyre: [1.17, 0.43], noseTyre: [0.76, 0.22], clearanceM: 0.55, mainsRetract: 'inboard' })
  const [a319, b737, b739] = built.map((b) => b.r)
  // AC A319: door 4L 25.81 m from the nose, 33.84 m long, wheelbase 11.04 m
  assert.deepEqual(a319.stations(a320), { lengthM: 33.84, doors: [5.04, 25.8], cockpit: 3.26, source: 'AC A320' })
  assert.deepEqual(a319.gear(gear(12.64)), gear(11.04))
  // D6-58325-7: aft entry door 26.04 m (737-700) from the nose; 34.52 m on the 737-900 (the 737-800's and 2.64 m)
  assert.deepEqual(b737.stations(b738), { lengthM: 33.63, doors: [5.03, 26.04], cockpit: 2.92, source: 'D6-58325-7' })
  assert.deepEqual(b737.gear(gear(15.6)), gear(12.6))
  assert.deepEqual(b739.stations(b738), { lengthM: 42.11, doors: [5.03, 34.52], cockpit: 2.92, source: 'D6-58325-7' })
  assert.deepEqual(b739.gear(gear(15.6)), gear(17.17))
  assert.deepEqual(a320.doors, [5.04, 29.53], 'the base\'s stations are not touched')
  // every station by where it is: before the forward barrel as it was, between the barrels + foreM, behind the aft one
  // + foreM + aftM, inside a barrel in proportion (the barrels in the document's metres: its length over the mesh's)
  const [z0, z1] = extent(load('a320').work)
  const k = 37.57 / (z1 - z0)
  const [f, a] = [a319.barrels.fore.map((d) => k * d), a319.barrels.aft.map((d) => k * d)]
  const at = (d: number): number => a319.stations({ ...a320, doors: [d] }).doors[0]
  near(at(f[0] - 0.5), f[0] - 0.5, 0.0051)
  near(at((f[0] + f[1]) / 2), (f[0] + f[1]) / 2 - 0.8, 0.0051, 'the middle of the forward barrel: half of foreM')
  near(at((f[1] + a[0]) / 2), (f[1] + a[0]) / 2 - 1.6, 0.0051, 'over the wing')
  near(at(a[0] + 0.25 * (a[1] - a[0])), a[0] + 0.25 * (a[1] - a[0]) - 1.6 - 0.25 * 2.13, 0.0051, 'a quarter into the aft barrel')
  near(at(a[1] + 0.5), a[1] + 0.5 - 3.73, 0.0051)
  // a mesh that is its own document (lengthM null) keeps null
  assert.equal(a319.stations({ ...a320, lengthM: null }).lengthM, null)
})

test('a change the barrel cannot take throws, and says how long the barrel is; a barrel can be given', () => {
  assert.throws(() => plug('a320', { foreM: -20 }), /a320: the forward barrel is \d+\.\d\d m long \(\d+\.\d\d m to \d+\.\d\d m aft of the nose\).*-20\.00 m was asked/)
  assert.throws(() => plug('a320', { aftM: -20 }), /the aft barrel is/)
  const found = plug('a320', {}).barrels
  const r = plug('a320', { foreM: -1, fore: [found.fore[0] + 1, found.fore[1] - 1] })
  near(r.barrels.fore[0], found.fore[0] + 1, 0.011, 'the barrel given, from')
  near(r.barrels.fore[1], found.fore[1] - 1, 0.011, 'the barrel given, to')
  near(extent(r.work)[1], extent(load('a320').work)[1] - 1, 1e-9, 'the nose, 1 m back')
  assert.throws(() => plug('a320', { foreM: -1, fore: [8, 9] }), /the forward barrel is 1\.00 m long/)
  assert.throws(() => plug('a320', { fore: [9, 8] }), /wrong way round/)
  // no change: the mesh as it was
  assert.deepEqual(plug('a320', {}).work.p, load('a320').work.p)
})

test('every painted base takes a metre off and a metre on, ahead of the wing and behind it', () => {
  for (const id of BASES) {
    const l = load(id)
    const a = extent(l.work)
    for (const d of [-1, 1]) {
      const r = plug(id, { foreM: d, aftM: d })
      const b = extent(r.work)
      near(b[1] - b[0] - (a[1] - a[0]), 2 * d, 0.02, `${id} ${d} length`)
      assert.equal(b[2], a[2], `${id} span`)
      const wing = moved(l.work, r.work, onWing(l))
      assert.ok(wing[2] > 100 && wing[0] === 0 && wing[1] === 0, `${id} ${d}: the wing stays (${wing})`)
      const tail = moved(l.work, r.work, (x, _y, z) => Math.abs(x) > 1.05 * l.paint.bodyHalfWidth && Math.abs(x) <= l.profile.stab![2] + 0.01 && z <= l.profile.stab![1] + 0.01)
      assert.ok(tail[2] >= 6 && Math.abs(tail[0] + d) < 1e-9 && Math.abs(tail[1] + d) < 1e-9, `${id} ${d}: the tailplane with the tail (${tail})`)
      sound(l.work, r.work, 0.25, `${id} ${d}`)
    }
  }
})

test('an airframe welded into one part goes vertex by vertex: the fuselage by the map, the tailplane with the tail, the wing not at all', () => {
  // a tube of radius 1 from z = 10 to −10, constant from 8 to −6, with a wing and a tailplane sharing its side vertices
  const zs = Array.from({ length: 21 }, (_, i) => 10 - i)
  const radius = (z: number): number => (z > 8 ? 1 - 0.45 * (z - 8) : z < -6 ? 1 + 0.2 * (z + 6) : 1)
  const w: Work = { p: [], n: [], c: [], tri: [] }
  const add = (x: number, y: number, z: number): number => {
    w.p.push(x, y, z)
    w.n.push(...[x, y, 0].map((v) => v / (Math.hypot(x, y) || 1)))
    w.c.push(200, 200, 200, 255)
    return w.p.length / 3 - 1
  }
  for (const z of zs) for (let j = 0; j < 8; j++) add(radius(z) * Math.cos((j * Math.PI) / 4), radius(z) * Math.sin((j * Math.PI) / 4), z)
  for (let i = 0; i + 1 < zs.length; i++) {
    for (let j = 0; j < 8; j++) {
      const [a, b, c, d] = [8 * i + j, 8 * i + ((j + 1) % 8), 8 * (i + 1) + ((j + 1) % 8), 8 * (i + 1) + j]
      w.tri.push(a, b, c, a, c, d)
    }
  }
  const ring = (z: number, side: 0 | 4): number => 8 * zs.indexOf(z) + side // the vertex on the left (0) or right (4) side
  const tips = [add(8, 0, -1), add(-8, 0, -1), add(3, 0, -9.5), add(-3, 0, -9.5)]
  w.tri.push(ring(1, 0), tips[0], ring(0, 0), ring(1, 4), ring(0, 4), tips[1], ring(-8, 0), tips[2], ring(-9, 0), ring(-8, 4), ring(-9, 4), tips[3])
  const body: ModelProfile['body'] = [[10, 0, 0]]
  for (let z = 9.98; z > -10; z -= 0.25) body.push([z, -radius(z), radius(z)])
  const profile = { body, wing: [1, 0, 0, 8, 0], engines: null, stab: [-9.5, -8, 3] } as unknown as ModelProfile
  const e = { id: 'welded', paint: { bodyHalfWidth: 1.1, engines: [0, 0, 0, 0] } } as unknown as ModelManifestEntry
  assert.equal(new Set(parts(meshOf(w))).size, 1, 'one part')
  const r = applyFuselage(w, { foreM: -2, aftM: -2 }, e, profile)
  near(r.barrels.fore[0], 2, 0.3, 'the forward barrel from the nose cone')
  near(r.barrels.fore[1], 9, 0.06, '… to the wing root')
  near(r.barrels.aft[0], 10, 0.06, 'the aft barrel from the wing root')
  near(r.barrels.aft[1], 16, 0.3, '… to the tail cone')
  const z = (i: number): number => r.work.p[3 * i + 2]
  assert.deepEqual([z(ring(10, 0)), z(ring(1, 0)), z(ring(0, 4)), z(ring(-10, 0))], [8, 1, 0, -8], 'nose, wing root, tail')
  assert.deepEqual(tips.map(z), [-1, -1, -7.5, -7.5], 'the wing tips stay, the tailplane tips go with the tail')
  const [a, b] = [extent(w), extent(r.work)]
  near(b[1] - b[0], a[1] - a[0] - 4, 1e-9)
  sound(w, r.work, 0.25, 'welded')
})
