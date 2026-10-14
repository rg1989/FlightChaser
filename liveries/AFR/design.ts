// liveries/AFR/design.ts
// Air France (AFR; HOP wears the same paint), the livery as refreshed in 2021: a white aircraft, a very large navy
// "AIRFRANCE" with the red accent above the windows from door 1 aft, the winged seahorse in a navy ring between the
// cockpit and door 1 and on each engine, a white fin with four swept stripes (three navy, one red) and a ring of 12
// gold stars, navy wingtip devices. No cheatline, no belly colour.
// Measurements: liveries/AFR/README.md (the dossier), and pixel scans of the side-on photos F-GKXO (A320, left),
// F-GSQB and F-GZNI (777-300ER, right) in data/livery-refs/AFR/ (git-ignored).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// Paint colours (sRGB) as the photos show them in daylight (dossier §3); the brand's navy #051039 is darker.
const NAVY = '#1b2b56'
const RED = '#e8303f'
const WHITE = '#f4f5f4'
const GOLD = '#f2b21e'
const GREY = '#b9bec4' // the makers' light grey: wings, tailplane
const LIGHT = '#c9ccd0' // the Sharklet's leading-edge band
const LIP = '#c6c7c8' // bare-metal inlet lip
const METAL = '#55585c' // exhaust, core cowl, APU outlet
const OUTLINE = '#c5c9ce' // door outlines
const GLASS = '#16181c' // the cockpit windows

const WORDMARK = asset('liveries/AFR/wordmark.svg') // 189 × 18: letters and accent x 0.38 … 188.27, caps y 2.03 … 16.81
const SEAHORSE = asset('liveries/AFR/seahorse-navy.svg') // 500 × 500, the ring 483 across; the horse faces left
const SEAHORSE_WHITE = asset('liveries/AFR/seahorse-white.svg')
const RING = 483.4 / 500 // the ring's outer diameter over the image's size

/** Where the fuselage art sits on one aircraft family (the real aircraft differ: dossier §4.2, §4.3, §4.6). */
interface Layout {
  start: number // the wordmark block's fore end, metres aft of door 1's centre
  length: number // the block (letters and accent), metres
  base: number // its baseline, as a fraction of the fuselage height above the keel
  cap: number // its cap top, the same way
  ring: number // the nose ring's outer diameter
  ringAt: number // its centre, as a fraction of the way from door 1's centre to the cockpit glass's aft edge
  ringUp: number // its centre above the window row
  engine: [d: number, aft: number, up: number, axis: number] // the nacelle ring: diameter, centre aft of the lip, above the axis; the axis as a fraction of the box height
  nozzle: number // the dark exhaust: this fraction of the nacelle box's length, from its aft end
}
/** A320 family (F-GKXO, F-HEPJ; the A321 F-GTAY wears the same block at the same place). */
const A32X: Layout = { start: 1.45, length: 11.6, base: 0.72, cap: 0.89, ring: 0.62, ringAt: 0.66, ringUp: 0, engine: [0.55, 0.6, 0.2, 0.39], nozzle: 0.3 }
/** A350 (F-HUVJ, F-HTYQ). */
const A350: Layout = { start: 1.1, length: 19.3, base: 0.69, cap: 0.885, ring: 1.1, ringAt: 0.575, ringUp: 0, engine: [0.78, 2.85, 0, 0.45], nozzle: 0.2 }
/** 777 (F-GSQB: the block from 1.6 m aft of door 1 to 2.9 m ahead of door 3; heights from F-GZNI). */
const B777: Layout = { start: 1.6, length: 21.8, base: 0.66, cap: 0.88, ring: 1.1, ringAt: 0.59, ringUp: 0.4, engine: [1.09, 2.85, 0, 0.485], nozzle: 0.22 }

interface Frame {
  lay: Layout
  s: number // the layout's scale on this model (1 on the family it was measured on)
  keel: number
  H: number // the fuselage height
  door1: number
}

function frame(k: Kit): Frame {
  const zRef = k.a.nose - 0.3 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zRef)
  const H = k.top(zRef) - keel
  // door 1, or (a model whose first measured door is not at the front) a place behind the cockpit
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 0.5 * H
  const m = k.model
  if (/^a3[12]\d$|^a2[01]n$/.test(m)) return { lay: A32X, s: 1, keel, H, door1 }
  if (m.startsWith('a35')) return { lay: A350, s: 1, keel, H, door1 }
  if (m.startsWith('b77')) return { lay: B777, s: 1, keel, H, door1 }
  // another type: the nearest family's layout at this fuselage's size
  return H > 5 ? { lay: A350, s: H / 6.09, keel, H, door1 } : { lay: A32X, s: H / 4.14, keel, H, door1 }
}

/** A rounded rectangle [z0 aft, z1 fore] × [y0, y1] with corner radius r, as a path. */
function roundRect(z0: number, z1: number, y0: number, y1: number, r: number): Seg[] {
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

/** A five-pointed star, one point up. */
function star(z: number, y: number, r: number): Pt[] {
  return Array.from({ length: 10 }, (_, i): Pt => {
    const a = (i * Math.PI) / 5
    const q = i % 2 === 0 ? r : 0.4 * r
    return [z + q * Math.sin(a), y + q * Math.cos(a)]
  })
}

// The fin's stripes along the chord at the foot line (0 leading edge … 1 trailing edge), their straight edges
// extended down to it: navy wide (N1), navy medium (N2), a navy hairline (N3), red wide (the three types agree
// within 0.02: dossier §4.5).
const STRIPES: Array<[fore: number, aft: number, color: string]> = [[0.14, 0.31, NAVY], [0.385, 0.445, NAVY], [0.522, 0.545, NAVY], [0.63, 0.82, RED]]
const FOOT = 0.085 // the foot line, as a fraction of the fin's height above its root

/**
 * The fin: four stripes parallel to the leading edge, cut off by the tip and the trailing edge, all ending on one
 * horizontal foot line. Each ends like the tip of a ski: over its last 0.3 m both edges bend forward, and the bottom
 * edge runs out to a sharp point 0.4 m ahead of the straight fore edge (F-GKXO, F-GZNI pixel scans). The stars: a
 * ring of 12, 0.55 m across, on the middle of N1, 1.2 m below the tip.
 */
function fin(k: Kit): void {
  const [y0, le0, te0] = k.a.finRoot
  const [y1, le1, te1] = k.a.finTip
  const hgt = y1 - y0
  if (!(hgt > 0.5)) return
  const sweep = (le1 - le0) / hgt // the leading edge: metres of z per metre up (negative: aft)
  const yf = y0 + FOOT * hgt
  const lef = le0 + sweep * (yf - y0)
  const chord = lef - (te0 + (te1 - te0) * FOOT)
  const s = Math.min(1, chord / 5.2)
  const [D, E] = [0.4 * s, 0.32 * s]
  const flick = (eta: number): number => (eta >= E ? 0 : D * (1 - eta / E) ** 1.45)
  const edge = (f: number, eta: number): Pt => [lef - f * chord + sweep * eta + flick(eta), yf + eta]
  const etas = [hgt + 2, ...Array.from({ length: 13 }, (_, i) => E * (1 - i / 12))]
  for (const [f0, f1, color] of STRIPES) k.poly([...etas.map((e) => edge(f0, e)), ...etas.map((e) => edge(f1, e)).reverse()], color)

  const eta = y1 - yf - 1.2 * s
  const [cz, cy] = edge((STRIPES[0][0] + STRIPES[0][1]) / 2, eta)
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    k.poly(star(cz + 0.25 * s * Math.sin(a), cy + 0.25 * s * Math.cos(a), 0.065 * s), GOLD)
  }
}

function side(k: Kit): void {
  const { lay, s, keel, H, door1 } = frame(k)
  const wide = H > 5
  k.fill(WHITE)
  if (k.model.startsWith('a')) { // the APU outlet: the tail cone's tip only (the fin's upper trailing edge also lies aft of it)
    const [nb, nt] = [k.bottom(k.a.tail) - 0.3, k.top(k.a.tail) + 0.3]
    k.poly([[k.a.tail + 0.3, nb], [k.a.tail + 0.3, nt], [k.a.tail - 3, nt], [k.a.tail - 3, nb]], METAL)
  }

  // The cockpit windows, dark (the mesh's glass takes the atlas like the skin): the Airbus outline, its aft edge on the
  // model's measured one (A320: 1.2 ... 3.0 m aft of the nose, 2.3 ... 3.1 m above the keel). On a larger fuselage the
  // windows grow less than the fuselage does, from the same top line.
  const hs = H / 4.14
  const gs = Math.min(hs, 1.2)
  const glass: Pt[] = [[1.2, 2.43], [1.35, 2.72], [1.62, 2.98], [2.0, 3.07], [2.7, 3.05], [2.93, 2.96], [3.03, 2.8], [3.04, 2.5], [2.98, 2.36], [2.0, 2.32], [1.4, 2.34]]
  k.poly(glass.map(([d, h]): Pt => [k.a.cockpit + (3.02 - d) * gs, keel + 3.07 * hs - (3.07 - h) * gs]), GLASS)

  // door outlines, thin grey on the white
  const [dw, d0, d1] = wide ? [1.15, -1.25, 0.95] : [0.9, -1.0, 1.0]
  for (const zc of k.a.doors.length ? k.a.doors : [door1]) k.stroke(roundRect(zc - dw / 2, zc + dw / 2, k.a.windowY + d0, k.a.windowY + d1, 0.12), 0.035, OUTLINE)

  fin(k)

  // The wordmark between the window tops and the crown, stretched to its painted box (side-on the curve of the upper
  // fuselage shortens it: the block is 16 to 17 cap heights long, the logo 12.7). It reads correctly on both sides and
  // covers the same stretch of fuselage: the accent is at the aft end on the left side, next to door 1 on the right.
  const len = lay.length * s
  const cap = (lay.cap - lay.base) * H
  k.image(WORDMARK, { z: door1 - lay.start * s - len / 2, y: keel + lay.base * H + 0.528 * cap, w: len * (189 / 187.89), h: cap * (18 / 14.78) })

  // The seahorse ring between the cockpit and door 1: it faces the nose on both sides.
  k.image(SEAHORSE, { z: door1 + lay.ringAt * (k.a.cockpit - door1), y: k.a.windowY + lay.ringUp * s, h: (lay.ring * s) / RING, mirror: true })
}

const AFR: Design = {
  code: 'AFR',
  aliases: ['HOP'],
  name: 'Air France (2021 livery)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-GKXO.jpg (Zima Savolainen-Schtakleff, CC BY-SA 4.0): A320, left side; the fin, the engine',
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_7873,_F-HEPJ)_2026-04-08_Andre_Gerwing_Collection_ID_028230.jpg (André Gerwing, CC BY-SA 4.0): A320, right side; the Sharklets',
    'https://commons.wikimedia.org/wiki/File:F-GZNI_B777-300ER,_Air_France,_IAH_12-10-25_(55094705611).jpg (Duncan Kirk, CC BY 4.0): 777-300ER, right side; the fin, the engine',
    'https://commons.wikimedia.org/wiki/File:Air_France_F-GSQB_B777-300.jpg (Zima Savolainen, CC BY-SA 4.0): 777-300ER, right side; the nose ring, the wordmark between the doors',
    'https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_Air_France_Boeing_777-328ER_F-GZNE_@_WSSS_2025-08-30.jpg (S5A-0043, CC BY 4.0): 777-300ER, left side',
    'https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg (4300streetcar, CC BY 4.0): A350-900, right side',
    'https://commons.wikimedia.org/wiki/File:At_Paris_2026_054.jpg (Mike Peel, CC BY-SA 4.0): the nose ring and the accent, close',
    'https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_NPS_F-HUVJ_winglet.jpg (4300streetcar, CC BY 4.0): the A350 winglet, inner face',
    'https://commons.wikimedia.org/wiki/File:Air_France_Logo.svg (PD-textlogo): the wordmark',
    'https://commons.wikimedia.org/wiki/File:Logo_Air_Orient_-_Air_France.svg (PD-France): the winged seahorse',
  ],
  base: WHITE,
  wing: GREY,
  stab: GREY,
  engineColor: WHITE,
  wingletColor: NAVY,
  side,

  engine(k) {
    // White cowls, a bare-metal inlet lip, the dark exhaust at the back, and the seahorse ring on every face (it faces
    // forward on both).
    const { lay, s } = frame(k)
    const [z0, z1, y0, y1] = k.a.box
    const [d, aft, up, axis] = lay.engine
    k.fill(WHITE)
    const yp = y0 + 0.67 * (y1 - y0) // below the pylon only: the pylon's fairing stays light
    k.poly([[z0 + lay.nozzle * (z1 - z0), y0 - 1], [z0 + lay.nozzle * (z1 - z0), yp], [z0 - 1, yp], [z0 - 1, y0 - 1]], METAL)
    k.poly([[z1 - 0.07 * (y1 - y0), -99], [z1 - 0.07 * (y1 - y0), 99], [z1 + 1, 99], [z1 + 1, -99]], LIP)
    k.image(SEAHORSE, { z: z1 - aft * s, y: y0 + axis * (y1 - y0) + up * s, h: (d * s) / RING, mirror: true })
  },

  winglet(k) {
    // The tip atlas's "left" half paints both outboard faces, its "right" half both inboard faces.
    const [zMin, zMax, yMin, yMax] = k.a.box
    k.fill(NAVY)
    if (k.model.startsWith('a35')) {
      // A350: navy from where the tip curves up; the white seahorse on the inner face, facing the leading edge
      k.poly([[zMin - 1, yMin - 1], [zMax + 1, yMin - 1], [zMax + 1, yMin + 0.3], [zMin - 1, yMin + 0.3]], GREY)
      if (k.side === 'right') k.image(SEAHORSE_WHITE, { z: zMin + 0.4 * (zMax - zMin), y: yMin + 0.6 * (yMax - yMin), h: 0.85 / RING, mirror: true })
      return
    }
    // A320 Sharklet: the knee (its lowest 0.4 m) wing grey, the blade navy with a light grey band along the leading
    // edge (a fifth of the chord). The mesh: the leading edge 0.3 m aft of zMax at the top of the knee, swept 0.775 m
    // aft per metre up; the chord 1.0 m there, 0.47 m at the tip.
    const knee = yMin + 0.4
    const le = (y: number): number => zMax - 0.3 - 0.775 * (y - knee)
    const chord = (y: number): number => Math.max(0.3, 1.0 - ((1.0 - 0.47) * (y - knee)) / (yMax - knee))
    k.poly([[le(yMin - 1) + 1, yMin - 1], [le(yMax + 1) + 1, yMax + 1], [le(yMax + 1) - 0.22 * chord(yMax + 1), yMax + 1],
      [le(yMin - 1) - 0.22 * chord(yMin - 1), yMin - 1]], LIGHT)
    k.poly([[zMin - 1, yMin - 1], [zMax + 1, yMin - 1], [zMax + 1, knee], [zMin - 1, knee]], GREY)
  },
}

export default AFR
