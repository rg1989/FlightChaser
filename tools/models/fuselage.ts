// tools/models/fuselage.ts
// The fuselage plug: makes a model's fuselage longer or shorter ahead of the wing and behind it, the way the members of
// an airliner family differ (the A319 is the A320 less 1.60 m of barrel ahead of the wing and 2.13 m behind it).
// tools/models/variants.ts calls it from build(), as its third op beside the wingtip and the nacelle.
//
// Frame: the paint frame (+x left wing, +y up, +z nose), metres; the sizes are the real aircraft's, used as mesh metres.
// A Paint's z values are in this frame already (client/scene/livery.ts turns the mesh first), so they need no turning.
//
// How, from the geometry alone:
// - The skin: the parts (profile.ts parts) on the fuselage (within 1.05 × bodyHalfWidth) that are a whole section, most
//   of its width and height. A fairing or a sponson is not: it covers a part of the section's height.
// - The barrels: the skin's section (its top and bottom, every body station) is constant where it slopes under 3 cm in
//   a metre from one station to the next. The forward barrel is the longest such run ahead of the wing root's leading
//   edge, the aft barrel the longest behind its trailing edge. They run on under the wing-to-body fairing, where the
//   skin is still a plain tube. Engines on the rear fuselage ride on the tail: the aft barrel ends a station ahead of
//   them. A recipe can give a barrel instead (to keep a door out of it, say).
// - The map: the wing stays. The nose section moves by foreM, the tail section by aftM, and the stations of each barrel
//   scale between its ends, so nothing tears. A barrel is not squeezed under 30 % of its length. What the skin itself
//   carries in a barrel is scaled with it: where the mesh has its windows in the skin (the 737-800), they come out
//   narrower or wider.
// - What moves how, part by part: the skin, and any part on the fuselage that spans a barrel, takes the map vertex by
//   vertex. Every other part keeps its shape. On the fuselage it holds on to the section it reaches: the wing's (a
//   fairing: it stays), the nose's, or the tail's (a fin, its dorsal fillet too); wholly inside a barrel (a door, an
//   antenna) it moves with its middle. Wider than the fuselage it stays (wing, nacelles, pylons, flap fairings), unless
//   it lies wholly behind the aft barrel and no further out than the tailplane reaches (tailplane, rear engines).
// - An airframe welded into one part (none of the type models today) goes vertex by vertex by the same rules.
// COLOR_0 is kept: it is a shade from the normal's y, and a constant section's normals do not change.
import type { ModelManifestEntry, ModelProfile, Paint } from '../../client/types.ts'
import type { GearSpec } from './gear-glb.ts'
import type { Stations } from './packages.ts'
import { partBoxes, parts, section } from './profile.ts'
import type { Work } from './variants.ts'

export interface FuselageOp {
  foreM?: number // the change of the fuselage's length ahead of the wing, metres (negative: shorter)
  aftM?: number // …and behind the wing
  fore?: [number, number] // the barrel to work in, metres aft of the base's nose tip [from, to]; absent: found on the mesh
  aft?: [number, number]
}

export interface Plugged {
  work: Work
  mapZ(z: number): number // where a fuselage station went (paint frame z): piecewise linear
  movePaint(p: Paint): Paint // the paint map after the op (a copy, to 1 cm)
  stations(s: Stations): Stations // the door and cockpit stations after the op
  gear(g: GearSpec): GearSpec // the gear's layout after the op
  lengthM: number // the change of the overall length
  barrels: { fore: [number, number]; aft: [number, number] } // the barrels worked in, metres aft of the base's nose tip
}

/** A barrel in the paint frame: the z of its tail end and of its nose end. */
type Barrel = [tail: number, nose: number]

const WIDE = 1.05 // a part within this × bodyHalfWidth is on the fuselage (the wing-to-body fairing too)
const SLOPE = 0.03 // a constant section: its top and bottom rise or fall under this (3 cm in a metre) from one body station to the next
const LEAST = 0.3 // a barrel keeps at least this share of its length

const cm = (x: number): number => Math.round(x * 100) / 100 + 0
/** 0 up to a, 1 from b, linear between. */
const ramp = (v: number, a: number, b: number): number => (b > a ? Math.max(0, Math.min(1, (v - a) / (b - a))) : v >= b ? 1 : 0)

export function applyFuselage(w: Work, op: FuselageOp, base: ModelManifestEntry, profile: ModelProfile): Plugged {
  const P = base.paint
  if (P === undefined) throw new Error(`${base.id}: no paint map (its fuselage width is needed)`)
  const [foreM, aftM] = [op.foreM ?? 0, op.aftM ?? 0]
  const hw = WIDE * P.bodyHalfWidth
  const m = { p: Float64Array.from(w.p), tri: Uint32Array.from(w.tri) }
  const part = parts(m)
  const boxes = partBoxes(m, part)
  const nose = profile.body[0][0]
  const [rootLe, rootTe] = profile.wing
  const long = nose - profile.body[profile.body.length - 1][0]
  const tall = Math.max(...profile.body.map(([, bottom, top]) => top - bottom))
  const onBody = (b: number[]): boolean => Math.max(-b[0], b[1]) <= hw
  const welded = (b: number[]): boolean => !onBody(b) && b[5] - b[4] >= 0.75 * long // wing and fuselage in one part
  const skin = new Set([...boxes].filter(([, { box: b }]) => welded(b) || (onBody(b) && b[1] - b[0] >= 1.5 * P.bodyHalfWidth && b[3] - b[2] >= 0.7 * tall)).map(([k]) => k))

  /** The skin's bottom and top at a station (within the fuselage's width), or null where there is none. */
  const outline = (z: number): [number, number] | null => {
    const s = section(m, 2, z, (t) => skin.has(part[t]))
    let [bottom, top] = [Infinity, -Infinity]
    for (let k = 0; k < s.length; k += 4) {
      if (Math.abs(s[k]) > hw || Math.abs(s[k + 2]) > hw) continue
      ;[bottom, top] = [Math.min(bottom, s[k + 1], s[k + 3]), Math.max(top, s[k + 1], s[k + 3])]
    }
    return top > bottom ? [bottom, top] : null
  }
  /** The longest stretch between two z where the skin's section is constant: a run of body stations, each end then taken out to where the section changes. */
  const constant = (from: number, to: number): Barrel | null => {
    const same = (a: [number, number] | null, b: [number, number] | null, tol: number): boolean => a !== null && b !== null && Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol
    let [best, run, last]: [Barrel | null, Barrel | null, [number, number] | null] = [null, null, null]
    for (const [z] of profile.body) { // nose → tail
      const o = z > from && z < to ? outline(z) : null
      if (run !== null && same(o, last, SLOPE * (run[0] - z))) run[0] = z
      else run = o === null ? null : [z, z]
      last = o
      if (run !== null && (best === null || run[1] - run[0] > best[1] - best[0])) best = [run[0], run[1]]
    }
    if (best === null) return null
    for (const [end, dir] of [[0, -1], [1, 1]] as const) { // the stations are 0.25 m apart: on in steps of 5 cm while the section holds
      const o = outline(best[end])
      for (let k = 0; k < 5 && best[end] + dir * 0.05 > from && best[end] + dir * 0.05 < to && same(outline(best[end] + dir * 0.05), o, 0.005); k++) best[end] += dir * 0.05
    }
    return best
  }
  /** The barrel to work in on one side of the wing: the one given, else the one found; long enough for the change. */
  const barrel = (name: string, given: [number, number] | undefined, change: number, from: number, to: number, none: number): Barrel => {
    const b: Barrel = given ? [nose - given[1], nose - given[0]] : (constant(from, to) ?? [none, none])
    const len = b[1] - b[0]
    if (len < 0) throw new Error(`${base.id}: the ${name} barrel runs from ${given![0]} m to ${given![1]} m aft of the nose: the wrong way round`)
    if (change !== 0 && len === 0) throw new Error(`${base.id}: no constant section found for the ${name} barrel: give it in the op`)
    if (len + change < LEAST * len) {
      throw new Error(`${base.id}: the ${name} barrel is ${len.toFixed(2)} m long (${(nose - b[1]).toFixed(2)} m to ${(nose - b[0]).toFixed(2)} m aft of the nose) and ` +
        `keeps at least ${LEAST * 100} % of that: it can lose ${((1 - LEAST) * len).toFixed(2)} m, and a change of ${change.toFixed(2)} m was asked`)
    }
    return b
  }
  // engines on the rear fuselage (wholly behind the wing root) ride on the tail: the aft barrel ends ahead of them
  const engineFront = profile.engines === null ? -Infinity : Math.max(profile.engines[3], P.engines[3])
  const F = barrel('forward', op.fore, foreM, rootLe, Infinity, rootLe)
  const A = barrel('aft', op.aft, aftM, engineFront < rootTe ? engineFront + 0.25 : -Infinity, rootTe, rootTe)
  if (A[1] > F[0]) throw new Error(`${base.id}: the aft barrel must lie behind the forward one`)

  const mapZ = (z: number): number => z + foreM * ramp(z, F[0], F[1]) - aftM * (1 - ramp(z, A[0], A[1]))
  /** dz′/dz of the map: under or over 1 inside a barrel. */
  const slope = (z: number): number => 1 + (z > F[0] && z < F[1] ? foreM / (F[1] - F[0]) : 0) + (z > A[0] && z < A[1] ? aftM / (A[1] - A[0]) : 0)
  /** The station a rigid part on the fuselage holds on to: the wing's section if it reaches it, else the nose's, else the tail's; inside a barrel, its middle. */
  const hold = (z0: number, z1: number): number => (z1 > A[1] && z0 < F[0] ? (A[1] + F[0]) / 2 : z1 > F[1] ? z1 : z0 < A[0] ? z0 : (z0 + z1) / 2)
  const reach = profile.stab === null ? Infinity : profile.stab[2] + 0.05 // the tail's parts lie no further out than the tailplane's tips
  const onTail = (x: number, z: number): boolean => z <= A[0] && Math.abs(x) <= reach

  // each part: a rigid shift, or none (its vertices take the map one by one)
  const shift = new Map<number, number>()
  for (const [k, { box: b }] of boxes) {
    if (skin.has(k) || (onBody(b) && [F, A].some((s) => s[1] > s[0] && b[4] <= s[0] && b[5] >= s[1]))) continue
    const q = hold(b[4], b[5])
    const inner = b[0] * b[1] <= 0 ? 0 : Math.min(Math.abs(b[0]), Math.abs(b[1]))
    shift.set(k, onBody(b) ? mapZ(q) - q : b[4] >= F[1] ? foreM : onTail(inner, b[5]) ? -aftM : 0)
  }
  const p = [...w.p]
  const n = [...w.n]
  const done = new Uint8Array(p.length / 3)
  for (let t = 0; t < part.length; t++) {
    const dz = shift.get(part[t])
    for (let k = 0; k < 3; k++) {
      const i = 3 * w.tri[3 * t + k]
      if (done[i / 3]) continue
      done[i / 3] = 1
      const [x, z] = [w.p[i], w.p[i + 2]]
      if (dz !== undefined) p[i + 2] = z + dz
      else if (Math.abs(x) > hw) p[i + 2] = onTail(x, z) ? z - aftM : z // a welded airframe's wing and tail
      else {
        p[i + 2] = mapZ(z)
        const len = Math.hypot(w.n[i], w.n[i + 1], w.n[i + 2] / slope(z)) || 1 // a scaled surface's normal: z over the scale
        ;[n[i], n[i + 1], n[i + 2]] = [w.n[i] / len, w.n[i + 1] / len, w.n[i + 2] / slope(z) / len]
      }
    }
  }

  let [zMin, zMax] = [Infinity, -Infinity]
  for (let i = 2; i < w.p.length; i += 3) [zMin, zMax] = [Math.min(zMin, w.p[i]), Math.max(zMax, w.p[i])]
  return {
    work: { p, n, c: [...w.c], tri: [...w.tri] },
    mapZ,
    lengthM: foreM + aftM,
    barrels: { fore: [cm(nose - F[1]), cm(nose - F[0])], aft: [cm(nose - A[1]), cm(nose - A[0])] },
    movePaint(paint) {
      const q = structuredClone(paint)
      const tail = (z: number): number => cm(z - aftM) // the fin and all on it: rigid, with the tail section
      const on = (z: number): number => cm(mapZ(z)) // on the fuselage's skin
      q.fin.behindZ = tail(q.fin.behindZ)
      q.finSplit[1] = tail(q.finSplit[1])
      q.finLogo[0] = tail(q.finLogo[0])
      q.title[0] = on(q.title[0])
      if (q.windows) [q.windows[1], q.windows[2]] = [on(q.windows[1]), on(q.windows[2])]
      if (q.body) [q.body[0], q.body[1]] = [on(q.body[0]), on(q.body[1])]
      if (q.cut) {
        q.cut.tailConeZ = tail(q.cut.tailConeZ)
        for (const k of [1, 2, 4, 5]) q.cut.finEdges[k] = tail(q.cut.finEdges[k])
      }
      if (q.engines[1] > q.engines[0] && q.engines[3] <= A[0]) [q.engines[2], q.engines[3]] = [tail(q.engines[2]), tail(q.engines[3])] // rear engines; on the wing they stay
      return q
    },
    stations(s) {
      // in the document's metres aft of the nose: the barrels' ends from the mesh, scaled to the document's length
      const k = s.lengthM === null ? 1 : s.lengthM / (zMax - zMin)
      const at = (d: number): number => cm(d + foreM * ramp(d, k * (nose - F[1]), k * (nose - F[0])) + aftM * ramp(d, k * (nose - A[1]), k * (nose - A[0])))
      return { ...s, lengthM: s.lengthM === null ? null : cm(s.lengthM + foreM + aftM), doors: s.doors.map(at), cockpit: at(s.cockpit) }
    },
    // the nose gear rides on the nose section, the mains on the wing: a shorter forward fuselage, a shorter wheelbase
    gear: (g) => ({ ...structuredClone(g), wheelbaseM: cm(g.wheelbaseM + foreM) }),
  }
}
