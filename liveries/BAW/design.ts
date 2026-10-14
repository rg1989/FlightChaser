// liveries/BAW/design.ts
// British Airways (BAW; BA CityFlyer CFE and the Shuttle callsign SHT fly in the same paint), the "Chatham Dockyard"
// Union Flag scheme: a white aircraft with a navy belly below a level line, the red and navy ribbon emblem above the
// forward windows, the navy "BRITISH AIRWAYS" title under them, navy engines with bare-metal lips, and a fin painted
// as a waving piece of the Union Flag (red, navy, red) whose lowest band runs down into a red tail cone.
// Dossier: liveries/BAW/README.md (every number below is from it, or from the photos it lists).
//
// The emblem has no free file: it is drawn here from plain curves (a red ribbon folded over a navy wedge), not traced from artwork.
// Rendered and compared with the photos in five rounds (2026-10-14): the dossier's section 8 lists what changed and what still differs.
import { asset } from '../../client/livery/kit.ts'
import type { Design, Fill, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// Paint colours (sRGB), from sunlit photo samples (dossier §3).
const WHITE = '#f5f5f3'
const NAVY = '#1b2857' // belly, title, fin and emblem blue
const NAVY_COWL = '#1d3680' // the nacelles and the fin's navy band: the same paint, which photographs bluer on a sunlit cowl or fin (#1C3479, #013881) than on the shaded belly
const RED = '#d4202b'
const RED_DEEP = '#a9141d' // the fold shade on the fin's lower band
const SHADOW = '#c5cad1' // the painted shadow under the emblem
const ARMS = '#b9bdc4' // the coat of arms (silver grey)
const GREY = '#b6bbbf' // wings, tailplane, pylons
const LIP = '#c5c7ca' // bare-metal inlet lip
const NOZZLE = '#9a9da1' // the exhaust nozzle
const METAL = '#5a5d62' // core plug, APU exhaust
const DARK = '#2a2d33' // the 787's fin leading edge and tail cone tip
const OUTLINE = '#b4b9bf' // door outlines

type XY = [number, number]
type UH = [u: number, h: number]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const rgb = (c: string): number[] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
/** A colour between two hex colours (t 0: a, 1: b). */
const mix = (a: string, b: string, t: number): string => `#${rgb(a).map((v, i) => Math.round(lerp(v, rgb(b)[i], t)).toString(16).padStart(2, '0')).join('')}`

/** A Catmull-Rom curve through the points, n samples per span (both ends included). */
function curve(pts: XY[], n = 6): XY[] {
  if (pts.length < 3) return pts
  const out: XY[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const t = j / n
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** An edge run on in a straight line past its last point to u = to (and, with `from`, back past its first point). */
function run(edge: UH[], to: number, from?: number): UH[] {
  const n = edge.length
  const [a, b] = [edge[n - 2], edge[n - 1]]
  const out: UH[] = [...edge, [to, b[1] + ((b[1] - a[1]) / (b[0] - a[0])) * (to - b[0])]]
  if (from === undefined) return out
  const [c, d] = [edge[0], edge[1]]
  return [[from, c[1] + ((d[1] - c[1]) / (d[0] - c[0])) * (from - c[0])], ...out]
}

// ---- The fin art (dossier §4.2), in k.fin(u, h): u 0 leading edge … 1 trailing edge, h 0 root … 1 tip ----

interface FinArt {
  upper: [top: UH[], bottom: UH[]] // the upper red band
  navy: [top: UH[], bottom: UH[]] // the navy wedge, from its point at the leading edge
  lower: [top: UH[], bottom: UH[]] // the lower red band; its bottom edge leaves the fin and runs into the tail cone
}

/** The A320 family's fin (G-DBCB, G-TTNI). */
const FIN_NARROW: FinArt = {
  upper: [
    [[0, 0.54], [0.07, 0.58], [0.14, 0.63], [0.21, 0.68], [0.3, 0.73], [0.42, 0.76], [0.54, 0.8], [0.69, 0.825], [0.86, 0.85], [1, 0.865]],
    [[0, 0.36], [0.09, 0.37], [0.18, 0.39], [0.26, 0.42], [0.34, 0.46], [0.43, 0.49], [0.53, 0.52], [0.64, 0.54], [0.76, 0.563], [0.89, 0.585], [1, 0.595]],
  ],
  navy: [
    [[0.05, 0.28], [0.19, 0.27], [0.29, 0.28], [0.38, 0.29], [0.46, 0.32], [0.54, 0.365], [0.63, 0.4], [0.71, 0.43], [0.84, 0.45], [1, 0.46]],
    [[0.05, 0.28], [0.14, 0.25], [0.24, 0.22], [0.35, 0.21], [0.45, 0.21], [0.54, 0.215], [0.64, 0.22], [0.74, 0.21], [0.85, 0.19], [0.94, 0.17], [1, 0.165]],
  ],
  lower: [
    [[0.01, 0.19], [0.11, 0.16], [0.23, 0.13], [0.33, 0.11], [0.42, 0.11], [0.52, 0.105], [0.61, 0.1], [0.72, 0.085], [0.82, 0.07], [0.91, 0.06], [1, 0.05]],
    [[0, 0.09], [0.11, 0.02], [0.23, -0.04], [0.33, -0.07], [0.42, -0.08], [0.54, -0.08], [0.62, -0.08], [0.7, -0.09], [0.79, -0.12], [0.83, -0.15]],
  ],
}

/** The 777's and 787's fin (G-STBE; G-ZBKD agrees): the upper band starts higher up the leading edge. */
const FIN_WIDE: FinArt = {
  upper: [
    [[0.01, 0.69], [0.11, 0.74], [0.27, 0.79], [0.48, 0.82], [0.74, 0.845], [1, 0.85]],
    [[0.02, 0.41], [0.09, 0.42], [0.2, 0.46], [0.32, 0.5], [0.46, 0.54], [0.64, 0.56], [0.83, 0.57], [1, 0.575]],
  ],
  navy: [
    [[0.04, 0.32], [0.24, 0.31], [0.38, 0.32], [0.5, 0.35], [0.63, 0.4], [0.78, 0.435], [1, 0.45]],
    [[0.04, 0.32], [0.22, 0.27], [0.37, 0.26], [0.53, 0.26], [0.69, 0.25], [0.86, 0.225], [0.97, 0.205], [1, 0.2]],
  ],
  lower: [
    [[0.03, 0.22], [0.18, 0.18], [0.35, 0.15], [0.49, 0.14], [0.65, 0.12], [0.81, 0.09], [0.92, 0.07], [1, 0.055]],
    [[0.01, 0.12], [0.16, 0.05], [0.29, -0.02], [0.44, -0.05], [0.59, -0.06], [0.7, -0.07], [0.8, -0.11]],
  ],
}

// ---- Where things are on each family (dossier §4.4–4.6) ----

interface Layout {
  water: number // the belly line: metres below the window row
  lip: number // the bare-metal ring round the engine inlet
  emblem: [fore: number, aft: number, bottom: number, top: number] // z from door 1's centre (+ forward), y from the window row
  title: [fore: number, length: number, baseline: number] // its forward end from door 1's centre, its length, its baseline from the window row
  arms: [gap: number, size: number] // the coat of arms: its centre aft of the title's aft end, its height
  armsDoor2?: boolean // … or (787) aft of door 2
  door: [width: number, bottom: number, top: number] // a passenger door's outline, from the window row
  cut: [top: number, bottom: number] // the red tail cone starts this far ahead of the tail tip, at the crown and at the keel
  fin: FinArt
}

/** A320 family: G-TTNI (left) and G-TTNV (right). Other types (A319, A321, regional jets) take it scaled by their fuselage height. */
const NARROW: Layout = {
  water: 1.48, lip: 0.3, emblem: [1.18, -3.42, -0.2, 0.9], title: [-1.07, 6.6, -0.88], arms: [0.8, 0.8], door: [1.0, -0.95, 1.1], cut: [3.4, 2.0], fin: FIN_NARROW,
}
/** 777: G-STBE and G-STBG (left), G-STBL (right). */
const B777: Layout = {
  water: 1.95, lip: 0.5, emblem: [2.1, -5.0, -0.78, 1.04], title: [-1.8, 11.4, -1.57], arms: [1.75, 1.0], door: [1.3, -1.23, 1.0], cut: [5.3, 2.9], fin: FIN_WIDE,
}
/** 787: G-ZBKK (right), G-ZBKL (left). The coat of arms sits aft of door 2 (drawn there below). */
const B787: Layout = {
  water: 2.3, lip: 0.75, emblem: [1.99, -5.11, -0.91, 0.89], title: [-1.01, 10.0, -1.36], arms: [2.3, 0.95], armsDoor2: true, door: [1.3, -1.2, 1.0], cut: [6.0, 3.9], fin: FIN_WIDE,
}
/**
 * A380-800 (G-XLEA, left, in flight, a CC0 photo; the scale is the photo's 72.7 m). The title sits between the upper and
 * the main deck's window rows (the model draws only the main deck's, which is wc), the emblem on the upper deck's.
 */
const A380: Layout = {
  water: 2.35, lip: 0.6, emblem: [-0.6, -11.0, 1.1, 3.2], title: [-5.0, 15.8, 0.36], arms: [1.65, 1.0], door: [1.4, -1.2, 0.9], cut: [7.0, 3.8], fin: FIN_WIDE,
}

interface Frame {
  lay: Layout
  s: number // the layout's scale on this model (1 on the type it was measured on)
  wc: number // the cabin window row
  door1: number
  H: number // the fuselage height
  wide: boolean
}

function frame(k: Kit): Frame {
  const zRef = k.a.nose - 0.2 * k.a.length // the constant section, ahead of the wing
  const H = k.top(zRef) - k.bottom(zRef)
  const wide = H > 5
  // door 1, or (a model whose first measured door is not at the front) a place behind the cockpit
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 0.5 * H
  if (k.model.startsWith('b77') || k.model.startsWith('b74')) return { lay: B777, s: 1, wc: k.a.windowY, door1, H, wide }
  if (k.model.startsWith('b78') || k.model.startsWith('a35')) return { lay: B787, s: 1, wc: k.a.windowY, door1, H, wide }
  if (k.model.startsWith('a38')) return { lay: A380, s: 1, wc: k.a.windowY, door1, H, wide }
  return { lay: { ...NARROW, fin: wide ? FIN_WIDE : FIN_NARROW }, s: H / 4.2, wc: k.a.windowY, door1, H, wide }
}

/**
 * The tailplane's root in side view, where it lies inside the body's half-width: the paint shader gives that zone the
 * skin atlas, so the red of the tail cone would run out onto the grey tailplane. [aft of the root leading edge from,
 * to, y from the window row from, to], measured on each family's mesh.
 */
function stabRoot(k: Kit, wc: number): Pt[] | null {
  if (!k.p.stab) return null
  const m = k.model
  const r: [number, number, number, number] | null =
    /^a(31|32|20|21)/.test(m) ? [-0.15, 4.0, -0.1, 0.47]
    : m.startsWith('b77') ? [-0.2, 6.9, 0.56, 1.32]
    : m.startsWith('b78') ? [-0.2, 7.4, -0.32, 0.57]
    : m.startsWith('a35') ? [-0.2, 7.3, 0.28, 1.09]
    : null
  if (!r) return null
  const z = k.p.stab[1]
  return [[z - r[0], wc + r[2]], [z - r[0], wc + r[3]], [z - r[1], wc + r[3]], [z - r[1], wc + r[2]]]
}

/**
 * The ribbon emblem from plain curves (traced on the photos, not copied from a file), in the box zFore … zAft × yBottom …
 * yTop: a red ribbon that runs forward along the top, folds over at its front and comes back underneath as a navy wedge
 * whose point is at the bottom, 0.37 of the way aft; a pale painted shadow lies under each. Coordinates below: x 0
 * forward end … 1 aft end, y 0 bottom of the navy … 1 top of the red. In z and y its thick end is forward on both sides.
 */
function emblem(k: Kit, zFore: number, zAft: number, yBottom: number, yTop: number): void {
  const E = ([x, y]: XY): Pt => [lerp(zFore, zAft, x), lerp(yBottom, yTop, y)]
  const L = Math.abs(zFore - zAft)
  const red: XY[] = [
    ...curve([[0.11, 0.993], [0.22, 0.998], [0.38, 0.998], [0.55, 0.99], [0.7, 0.965], [0.82, 0.93], [0.92, 0.885], [1, 0.845]] as XY[], 5), // the top edge, falling to the point
    ...curve([[1, 0.845], [0.94, 0.8], [0.878, 0.76], [0.735, 0.69], [0.59, 0.655], [0.448, 0.64], [0.3, 0.625], [0.16, 0.61], [0.07, 0.6]] as XY[], 5), // the lower edge, back to the fold
    [0.03, 0.56], [0.004, 0.51], // the fold's lower end
    ...curve([[0.004, 0.51], [0.0, 0.62], [0.018, 0.78], [0.054, 0.94], [0.11, 0.993]] as XY[], 5), // up the fold
  ]
  const navy: XY[] = [
    ...curve([[0.01, 0.5], [0.075, 0.585], [0.16, 0.565], [0.233, 0.455], [0.305, 0.275], [0.37, 0.04]] as XY[], 5), // the upper edge, down to the point
    ...curve([[0.37, 0.04], [0.28, 0.012], [0.2, 0.02], [0.12, 0.07], [0.05, 0.17], [0.015, 0.3], [0.004, 0.42], [0.01, 0.5]] as XY[], 5), // the lower edge, back round the fold
  ]
  const dz = 0.004 * L
  const dy = 0.016 * (yTop - yBottom)
  for (const shape of [red, navy]) k.poly(shape.map(([x, y]): Pt => { const [z, h] = E([x, y]); return [z - dz, h - dy] }), SHADOW)
  k.poly(red.map(E), RED)
  k.poly(navy.map(E), NAVY)
}

/**
 * The coat of arms as a small silver-grey mark (a shield between two supporters, a crest above, a scroll below), in
 * plain shapes: at the atlas's scale the real one is a pale grey patch. size: its height in metres.
 */
function arms(k: Kit, zc: number, yc: number, size: number): void {
  const A = (x: number, y: number): Pt => [zc + x * size, yc + y * size]
  const pale = mix(ARMS, WHITE, 0.45)
  const w = 0.045 * size
  k.poly([A(-0.14, 0.14), A(0.14, 0.14), A(0.14, -0.04), A(0.08, -0.17), A(0, -0.23), A(-0.08, -0.17), A(-0.14, -0.04)], pale) // the shield
  k.stroke([A(-0.14, 0.14), A(0.14, 0.14), A(0.14, -0.04), A(0.08, -0.17), A(0, -0.23), A(-0.08, -0.17), A(-0.14, -0.04), A(-0.14, 0.14)], w, ARMS)
  k.circle(...A(0, 0.33), 0.085 * size, ARMS) // the crest
  k.poly([A(-0.09, 0.26), A(0.09, 0.26), A(0.11, 0.16), A(-0.11, 0.16)], ARMS) // the helm
  for (const sx of [-1, 1]) { // the supporters, leaning in
    k.poly(curve([[0.2, -0.2], [0.24, 0.02], [0.2, 0.22], [0.27, 0.34], [0.36, 0.3], [0.37, 0.12], [0.43, -0.02], [0.4, -0.2], [0.3, -0.24]] as XY[])
      .map(([x, y]) => A(sx * x, y)), ARMS)
  }
  k.stroke(curve([[-0.44, -0.3], [-0.22, -0.4], [0, -0.36], [0.22, -0.4], [0.44, -0.3]] as XY[]).map(([x, y]) => A(x, y)), 1.6 * w, ARMS) // the scroll
}

function side(k: Kit): void {
  const { lay, s, wc, door1, H, wide } = frame(k)
  const { nose, tail } = k.a
  const P = ([u, h]: UH): Pt => k.fin(u, h)

  k.fill(WHITE)

  // The belly: navy below a level line, from the lower radome to where the rising keel meets the line.
  const yW = wc - lay.water * s
  k.poly([[nose + 3, yW], [tail - 3, yW], [tail - 3, yW - 30], [nose + 3, yW - 30]], NAVY)

  // The fin: three bands that rise toward the trailing edge. Each is printed as a dot screen at its leading-edge end
  // (it fades into the white) and across a fold near the trailing edge: soft gradients along the chord here.
  const along = (band: [UH[], UH[]], stops: Array<[number, string]>): Fill => {
    const [z0, y0] = P([0, (band[0][0][1] + band[1][0][1]) / 2])
    const z1 = P([1, (band[0][band[0].length - 1][1] + band[1][band[1].length - 1][1]) / 2])[0]
    return { linear: [z0, y0, z1, y0], stops }
  }
  const { upper, navy, lower } = lay.fin
  k.poly([...curve(run(upper[0], 1.25, -0.2)), ...curve(run(upper[1], 1.25, -0.2)).reverse()].map(P),
    along(upper, [[0, mix(RED, WHITE, 0.8)], [0.09, mix(RED, WHITE, 0.45)], [0.22, RED], [0.7, RED], [0.78, mix(RED, WHITE, 0.3)], [0.9, mix(RED, WHITE, 0.36)], [0.955, RED], [1, RED]]))
  k.poly([...curve(run(navy[0], 1.25)), ...curve(run(navy[1], 1.25)).reverse()].map(P),
    along(navy, [[0, mix(NAVY_COWL, WHITE, 0.8)], [0.14, mix(NAVY_COWL, WHITE, 0.5)], [0.3, NAVY_COWL], [0.72, NAVY_COWL], [0.8, mix(NAVY_COWL, WHITE, 0.32)], [0.9, mix(NAVY_COWL, WHITE, 0.4)], [0.955, NAVY_COWL], [1, NAVY_COWL]]))

  // The lower red band and the tail cone, one shape: the band's bottom edge dips below the fin's root onto the crown,
  // then swings down across the tail cone on a slanted cut (further forward at the crown than at the keel).
  const cutTop = tail + lay.cut[0] * s
  const cutBottom = tail + lay.cut[1] * s
  const crownDip = (wide ? 0.75 : 0.5) * s
  const ct: Pt = [cutTop, k.top(cutTop) - crownDip]
  const cb: Pt = [cutBottom, k.bottom(cutBottom)]
  const slope = (cb[1] - ct[1]) / (cb[0] - ct[0])
  const bottom: Pt[] = [...run(lower[1], 1, -0.2).slice(0, -1).map(P).filter(([z]) => z > cutTop + 0.9 * s), ct, cb, [cb[0] - 2, cb[1] - 2 * slope]]
  const far = tail - 4
  const top = curve(run(lower[0], 1.6, -0.2)).map(P)
  const fold = lower[0][0][1]
  k.poly([...top, [far, top[top.length - 1][1]], [far, cb[1] - 6], [cb[0] - 2, cb[1] - 6], ...curve(bottom).reverse()],
    along([lower[0], [[0, fold - 0.1], [1, -0.02]]], [[0, mix(RED, WHITE, 0.8)], [0.08, mix(RED, WHITE, 0.45)], [0.2, RED], [0.46, RED], [0.55, RED_DEEP], [0.64, RED],
      [0.8, RED], [0.87, mix(RED, WHITE, 0.25)], [0.94, mix(RED, WHITE, 0.25)], [1, RED]]))

  // Only the tail cone's own height: the fin's trailing edge reaches aft of the cone's end, and must keep its paint.
  const cone = (z: number, color: string): void => {
    k.poly([[z, k.bottom(tail) - 0.5], [z, k.top(tail) + 0.2 * s], [tail - 4, k.top(tail) + 0.2 * s], [tail - 4, k.bottom(tail) - 0.5]], color)
  }
  if (k.model.startsWith('b78')) {
    // 787: a near-black strip along the fin's leading edge (on the fin only), and a near-black tail cone tip
    k.clip('fin', () => k.poly(([[-0.3, -0.06], [-0.3, 1.1], [0.065, 1.1], [0.065, -0.06]] as UH[]).map(P), DARK))
    cone(tail + 1.8, DARK)
  } else if (k.model.startsWith('b77')) {
    // 777: the APU outlet on the left of the tail cone's tip
    if (k.side === 'left') k.circle(tail + 0.75, (k.top(tail + 0.75) + k.bottom(tail + 0.75)) / 2 + 0.1, 0.33, METAL)
  } else {
    cone(tail + 0.3 * s, '#808387') // the APU exhaust ring
  }

  // The tailplane's root stays grey over the red.
  const sr = stabRoot(k, wc)
  if (sr) k.poly(sr, GREY)

  // The emblem above the forward windows, straddling door 1.
  const [ef, ea, eb, et] = lay.emblem
  emblem(k, door1 + ef * s, door1 + ea * s, wc + eb * s, wc + et * s)

  // Door outlines (thin grey; door 1's cuts through the emblem).
  const [dw, d0, d1] = lay.door
  for (const zc of k.a.doors.length ? k.a.doors : [door1]) {
    const [za, zf, ya, yb, r] = [zc - (dw / 2) * s, zc + (dw / 2) * s, wc + d0 * s, wc + d1 * s, 0.14 * s]
    const d: Seg[] = [['M', za + r, ya], ['L', zf - r, ya], ['Q', zf, ya, zf, ya + r], ['L', zf, yb - r], ['Q', zf, yb, zf - r, yb], ['L', za + r, yb], ['Q', za, yb, za, yb - r],
      ['L', za, ya + r], ['Q', za, ya, za + r, ya], ['Z']]
    k.stroke(d, 0.04, OUTLINE)
  }

  // The title under the windows, from just aft of door 1: the wordmark's box is its text box (11.36 : 1), so its height
  // is the cap height. It reads correctly on both sides and covers the same stretch of fuselage.
  const [tf, tl, tb] = lay.title
  const len = tl * s
  const cap = len / 11.36
  const zTitle = door1 + tf * s
  k.image(asset('liveries/BAW/title.svg'), { z: zTitle - len / 2, y: wc + tb * s + cap / 2, w: len })

  // The coat of arms on the title's line, aft of it (787: aft of door 2).
  const [gap, size] = lay.arms
  const door2 = k.a.doors[1]
  const zArms = lay.armsDoor2 && door2 !== undefined ? door2 - 0.65 - 1.1 : zTitle - len - gap * s
  arms(k, zArms, wc + tb * s + cap / 2, size * s)

  // The alliance roundel at window height just aft of door 1 (wide-bodies: of door 2 too): left side only.
  if (k.side === 'left') {
    const aft = (dw / 2 + 0.28) * s
    for (const zc of H > 5 && door2 !== undefined ? [door1, door2] : [door1]) k.image(asset('liveries/BAW/oneworld.svg'), { z: zc - aft, y: wc + 0.05 * s, h: 0.3 * Math.max(1, s) })
  }
}

const BAW: Design = {
  code: 'BAW',
  aliases: ['CFE', 'SHT'],
  name: 'British Airways (Chatham Dockyard Union Flag)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N_British_Airways,_Manchester.jpg (Ian Gratton, CC BY 2.0): A320neo, left side',
    'https://commons.wikimedia.org/wiki/File:G-TTNV_British_Airways_A20N_EGCC.jpg (Oscaracton, CC BY 4.0): A320neo, right side',
    'https://commons.wikimedia.org/wiki/File:G-DBCB_A319_British_Airways_tailfin_OPO.jpg (Bene Riobó, CC BY-SA 4.0): the fin art',
    'https://commons.wikimedia.org/wiki/File:At_Milan_2026_009.jpg (Mike Peel, CC BY-SA 4.0): the fin base and rear fuselage, right side',
    'https://commons.wikimedia.org/wiki/File:(GBR-London)_British_Airways_Boeing_777-36NER_G-STBE_@_EGLL_2025-06-17.jpg (S5A-0043, CC BY 4.0): 777-300ER, left side',
    'https://commons.wikimedia.org/wiki/File:G-STBG_(55229801898).jpg (Liam Thompson, CC BY-SA 4.0): 777-300ER, left side',
    'https://commons.wikimedia.org/wiki/File:G-STBL_LHR_310325.jpg (kitmasterbloke, CC BY 2.0): 777-300ER, right side',
    'https://commons.wikimedia.org/wiki/File:G-ZBKK,_London_Heathrow,_September_27th_2021_-_54966063262.jpg (Southsea_Matt, CC BY-SA 4.0): 787-9, forward fuselage',
    'https://commons.wikimedia.org/wiki/File:G-TTNB_-_Airbus_A320-251N_-_British_Airways_LHR_310326.jpg (kitmasterbloke, CC BY 4.0): the belly',
    'https://commons.wikimedia.org/wiki/File:2013Riat-4725.jpg (Jim.van.de.Burgt, CC0): A380-800, left side',
    'https://commons.wikimedia.org/wiki/File:Airbus_A380-841_(54951626330).jpg (Samson Ng, CC BY-SA 4.0): A380-800, right side',
    'https://commons.wikimedia.org/wiki/File:20230811_Boeing_787-9_of_British_Airways_(G-ZBKL)_at_SYD_03.jpg (Windmemories, CC BY-SA 4.0): 787-9, left side, the fin\'s trailing-edge heights',
    'https://commons.wikimedia.org/wiki/File:British_Airways_1997_wordmark.svg (PD-textlogo): the title',
    'https://commons.wikimedia.org/wiki/File:Oneworld_Logo.svg (PD-textlogo): the alliance roundel',
  ],
  base: WHITE,
  wing: GREY,
  stab: GREY,
  engineColor: NAVY_COWL,
  wingletColor: WHITE,
  side,
  engine(k) {
    // Navy all round, a bare-metal inlet lip, the exhaust nozzle and the dark core plug at the back. No title.
    const [z0, z1] = k.a.box
    const len = z1 - z0
    const f = frame(k)
    const lip = f.lay.lip * f.s // the bare-metal ring round the inlet: 0.3 m on the A320neo, wider on the big engines
    k.fill(NAVY_COWL)
    k.poly([[z0 + 0.2 * len, -99], [z0 + 0.2 * len, 99], [z0 - 1, 99], [z0 - 1, -99]], NOZZLE)
    k.poly([[z0 + 0.08 * len, -99], [z0 + 0.08 * len, 99], [z0 - 1, 99], [z0 - 1, -99]], METAL)
    k.poly([[z1 + 1, -99], [z1 + 1, 99], [z1 - lip, 99], [z1 - lip, -99]], LIP)
  },
  winglet(k) {
    k.fill(WHITE) // Sharklets: white on both faces, no marking
  },
}

export default BAW
