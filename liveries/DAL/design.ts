// liveries/DAL/design.ts
// Delta Air Lines (DAL; Endeavor Air EDV flies Delta Connection in the same paint), the 2007 livery as flown today:
// a white aircraft with a low navy belly, the red widget and a navy "DELTA" above the forward windows, a navy fin with
// one very large red widget turned on its side (its point forward and up, cut by the fin's edges), navy engines with
// bare-metal lips, navy wingtip devices, and a white widget and "DELTA" on the belly under the wing.
// Dossier: liveries/DAL/README.md (the numbers below are from it, checked against the photos it lists).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt } from '../../client/livery/kit.ts'

// Paint colours (sRGB; dossier §3). The reds are the logo file's own; the navy is the photos' median.
const WHITE = '#f5f6f5'
const NAVY = '#12306e'
const RED = '#e31837' // the widget's bright facets
const RED_DARK = '#98002e' // its dark facets
const GREY = '#b6bbbf' // wings, tailplane, pylons
const LIP = '#c5c7c9' // bare-metal inlet lip, winglet leading edges
const NOZZLE = '#8f9296' // the exhaust nozzle
const METAL = '#4a4d52' // core plug, APU exhaust

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const smooth = (t: number): number => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** Where things are on one family (dossier §4 and §7), in metres on the real aircraft. */
interface Layout {
  start: number // the belly navy starts this far aft of the nose tip (0: at door 1)
  bellyFore: number // the navy edge ahead of the wing, as a fraction of the fuselage height
  bellyAft: number // … and aft of the wing
  end: number // the navy ends in a point this far ahead of the last door's forward edge
  title: [length: number, height: number, gap: number, base: number] // the title's length, its height in side view, its gap to door 1, its base above the window tops
  fin: [u: number, h: number, top: number] // the fin widget's notch (u, h) and its level upper edge (h)
  aft?: number // the title sits this much further aft than the door-1 rule says (the model's door 1 is not where the aircraft's is)
  boost?: number // the model's keel curves in under the side view, so the belly navy edge is drawn this much higher (default 1.3)
}

const B737: Layout = { start: 0, bellyFore: 0.14, bellyAft: 0.17, end: 1.7, title: [5.2, 0.66, 0.49, 0.15], fin: [0.52, 0.45, 0.725] }
const A320: Layout = { start: 2.4, bellyFore: 0.09, bellyAft: 0.13, end: 0.75, title: [4.7, 0.57, 0.45, 0.2], fin: [0.6, 0.39, 0.72] }
const B757: Layout = { start: 2.1, bellyFore: 0.12, bellyAft: 0.14, end: 1.4, title: [5.15, 0.63, 0.74, 0.1], fin: [0.52, 0.46, 0.74] }
const B767: Layout = { start: 0, bellyFore: 0.12, bellyAft: 0.16, end: 0.5, title: [7.6, 0.94, 0.93, 0.18], fin: [0.52, 0.45, 0.72], aft: 1.0 }
const A330: Layout = { start: 0, bellyFore: 0.1, bellyAft: 0.11, end: 1.7, title: [7.8, 0.94, 1.03, 0.18], fin: [0.55, 0.43, 0.76] }
const A350: Layout = { start: 0, bellyFore: 0.2, bellyAft: 0.2, end: 2.1, title: [9.2, 1.15, 0.76, 0.16], fin: [0.55, 0.43, 0.73], boost: 1.1 }

interface Frame {
  lay: Layout
  keel: number // the keel and the height of the constant section
  H: number
  door1: number
  airbus: boolean
}

function frame(k: Kit): Frame {
  const zRef = k.a.nose - 0.25 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zRef)
  const H = k.top(zRef) - keel
  // door 1, or (a model whose first measured door is not at the front) a place behind the cockpit
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 0.5 * H
  const m = k.model
  const airbus = m.startsWith('a')
  const lay = /^b7[3]|^b3[789]m/.test(m) ? B737 : /^a(31|32|19|20|21)/.test(m) ? A320 : m.startsWith('b75') ? B757 : m.startsWith('b76') ? B767
    : m.startsWith('a33') ? A330 : m.startsWith('a35') ? A350
    // a type that is not in the dossier: the 737's layout, the title by the fuselage height (dossier §7)
    : { ...B737, title: [1.3 * H, 0.165 * H, 0.5, 0.15] as Layout['title'], fin: [0.55, 0.43, 0.73] as Layout['fin'] }
  return { lay, keel, H, door1, airbus }
}

/** The wing-to-body fairing's ends (fore, aft): where the keel bulges below the constant section, else by the wing root. */
function fairing(k: Kit, keel: number): [number, number] {
  const zs = k.stations(k.a.wingLe + 4, k.a.wingTe - 5, 0.25).filter((z) => k.bottom(z) < keel - 0.04)
  return zs.length >= 4 ? [zs[0], zs[zs.length - 1]] : [k.a.wingLe + 1.5, k.a.wingTe - 2.5]
}

/** The upper edge of the belly navy, nose to tail: a low boat shape, highest aft of the wing, ending in a point. */
function bellyEdge(k: Kit, f: Frame): Pt[] {
  const { lay, keel, H } = f
  const zS = lay.start > 0 ? k.a.nose - lay.start : f.door1 - 0.15
  const last = k.a.doors.length > 1 ? k.a.doors[k.a.doors.length - 1] : k.a.tail + 0.15 * k.a.length
  const zE = Math.min(last + 0.42 + lay.end, k.a.wingTe - 3)
  const [hF, hA] = [lay.bellyFore * H * (lay.boost ?? 1.3), lay.bellyAft * H * (lay.boost ?? 1.3)]
  const pts: Pt[] = []
  // ahead of the wing: up from the keel in a shallow arc
  for (const z of k.stations(zS, k.a.wingLe, 0.25)) {
    const t = (zS - z) / (zS - k.a.wingLe)
    pts.push([z, Math.max(k.bottom(z), keel) + hF * (1 - Math.pow(1 - t, 3))])
  }
  // behind the wing (hidden from the side) it rises to its height aft of the fairing
  for (const z of k.stations(k.a.wingLe, k.a.wingTe, 0.25).slice(1)) pts.push([z, keel + lerp(hF, hA, smooth((k.a.wingLe - z) / Math.max(0.5, k.a.wingLe - k.a.wingTe)))])
  // then a straight line to the point where it meets the upswept keel
  pts.push([zE, k.bottom(zE)])
  return pts
}

function side(k: Kit): void {
  const f = frame(k)
  const { lay } = f
  k.fill(WHITE)

  // the belly
  const edge = bellyEdge(k, f)
  // The keel's lowest 0.3 m is seen at a grazing angle and renders almost black, so the navy there goes a little lighter
  // towards the keel: it then reads as navy, as in the photos (N436DX, N818DA).
  k.poly([...edge, [edge[edge.length - 1][0], f.keel - 3], [edge[0][0], f.keel - 3]], { linear: [0, f.keel + 0.45, 0, f.keel - 0.1], stops: [[0, NAVY], [1, '#2f5fb2']] })

  // the fin: navy to a straight line at its root, and over it the widget turned on its side. The file shows the left
  // side (point forward and up); mirrored on the right, so the point is forward there too. Its notch is the point
  // (218.1, 140.7) of 500 × 450 units, its upper edge is y = 0.
  const [u, h, top] = lay.fin
  const finH = k.a.finTip[0] - k.a.finRoot[0]
  const unit = ((top - h) * finH) / 140.7
  const [nz, ny] = k.fin(u, h)
  k.finFill(NAVY, { down: 0.04 })
  k.clip('fin', () => {
    k.image(asset('liveries/DAL/fin-widget.svg'), { z: nz - (250 - 218.1) * unit, y: ny - (225 - 140.7) * unit, w: 500 * unit, h: 450 * unit, mirror: true })
  })

  // the APU exhaust: bare metal
  // (only the cone's tip: the fin's trailing edge overhangs the tail on some models, and a taller shape would paint the rudder)
  const apu0 = k.bottom(k.a.tail + 0.3) - 0.3
  const apu1 = k.top(k.a.tail + 0.3) + 0.1
  k.poly([[k.a.tail + 0.28, apu0], [k.a.tail + 0.28, apu1], [k.a.tail - 2, apu1], [k.a.tail - 2, apu0]], METAL)

  // the title above the windows, just aft of door 1, stretched to its side-elevation box (the skin leans away there).
  // It reads widget-then-DELTA on both sides over the same stretch of fuselage (the kit flips it on the right).
  const [len, th, gap, base] = lay.title
  const fore = f.door1 - 0.45 - gap - (lay.aft ?? 0)
  k.image(asset('liveries/DAL/title.svg'), { z: fore - len / 2, y: k.a.windowY + 0.17 + base + th / 2, w: len, h: th })
}

/** Linear interpolation through [x, y] points (x rising), clamped at both ends. */
function table(pts: Array<[number, number]>, x: number): number {
  if (x <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]))
  }
  return pts[pts.length - 1][1]
}

// The A350 winglet in its side box (measured on the a359 mesh with a grid): t 0 at the box's bottom to 1 at its top, f the
// distance from zMax (the fore edge) towards zMin as a fraction of the box's length. Leading and trailing edge.
const A350_LE: Array<[number, number]> = [[-0.3, -0.05], [0, 0], [0.19, 0.086], [0.39, 0.215], [0.59, 0.344], [0.77, 0.473], [0.9, 0.624], [0.99, 0.839], [1.3, 1.1]]
const A350_TE: Array<[number, number]> = [[-0.3, 0.5], [0, 0.548], [0.16, 0.57], [0.3, 0.6], [0.48, 0.69], [0.64, 0.76], [0.83, 0.88], [0.985, 1.0], [1.3, 1.2]]
const A350_KNEE = 0.22 // the white knee ends here (t)
// The widget on the Delta A350's winglet, traced on the cabin-window photo of the left winglet's inner face (N512DN): pixel
// coordinates [x, y] (the photo's forward is to the right); PH_TE and PH_LE give the blade's trailing and leading edge x by y.
const PH_TE: Array<[y: number, x: number]> = [[160, 455], [320, 600], [520, 760], [655, 885]]
const PH_LE: Array<[y: number, x: number]> = [[160, 520], [190, 600], [320, 790], [495, 985], [660, 1245]]
const PH_RED1: Array<[number, number]> = [[648, 318], [905, 437], [860, 457], [655, 340]]
const PH_RED2: Array<[number, number]> = [[600, 322], [826, 490], [758, 516]]
const PH_DARK2: Array<[number, number]> = [[758, 516], [826, 490], [850, 600], [884, 652]]
const PH_DARK3: Array<[number, number]> = [[860, 458], [905, 437], [985, 495], [920, 655], [898, 655], [880, 585]]

function a350Winglet(k: Kit): void {
  const [zMin, zMax, yMin, yMax] = k.a.box
  const len = zMax - zMin
  const hgt = yMax - yMin
  const zLe = (t: number): number => zMax - table(A350_LE, t) * len
  const zTe = (t: number): number => zMax - table(A350_TE, t) * len
  const yAt = (t: number): number => yMin + t * hgt
  /** A point of the photo (x, y) on the blade: s 0 at the trailing edge to 1 at the leading edge, then the box. */
  const onBlade = ([x, y]: [number, number]): Pt => {
    const tp = (655 - y) / 495
    const t = A350_KNEE + (1 - A350_KNEE) * tp
    const te = table(PH_TE, y)
    const le = table(PH_LE, y)
    const sv = (x - te) / (le - te)
    return [zTe(t) + sv * (zLe(t) - zTe(t)), yAt(t)]
  }
  k.fill(NAVY)
  k.poly(PH_RED1.map(onBlade), RED)
  k.poly(PH_RED2.map(onBlade), RED)
  k.poly(PH_DARK2.map(onBlade), RED_DARK)
  k.poly(PH_DARK3.map(onBlade), RED_DARK)
  // the white leading edge, a thin strip along it from the knee up
  const ts = [A350_KNEE, 0.4, 0.6, 0.8, 1.0, 1.2]
  k.poly([...ts.map((t): Pt => [zLe(t) + 0.5, yAt(t)]), ...ts.slice().reverse().map((t): Pt => [zLe(t) - 0.07, yAt(t)])], WHITE)
  // the knee: white, cut level
  k.poly([[zMax + 2, yMin - 2], [zMin - 2, yMin - 2], [zMin - 2, yAt(A350_KNEE)], [zMax + 2, yAt(A350_KNEE)]], WHITE)
}

const DAL: Design = {
  code: 'DAL',
  aliases: ['EDV'],
  name: 'Delta Air Lines, 2007 livery',
  sources: [
    'https://commons.wikimedia.org/wiki/File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg (ZLEA, CC BY-SA 4.0): 737 left side',
    'https://commons.wikimedia.org/wiki/File:N818DA_(55216438608).jpg (Liam Thompson, CC BY-SA 4.0): 737 right side',
    'https://commons.wikimedia.org/wiki/File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg (Acroterion, CC BY-SA 4.0): fin, engine',
    'https://commons.wikimedia.org/wiki/File:Delta_Airbus_A321_N346DN_BWI_MD1.jpg (Acroterion, CC BY-SA 4.0): A321 left side',
    'https://commons.wikimedia.org/wiki/File:Delta_Airbus_A321_N397DN_taxiing_at_Boston_July_2026.jpg (4300streetcar, CC BY 4.0): A321 right side',
    'https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A321_N101DQ_planform_view_January_2025.jpg (4300streetcar, CC BY 4.0): belly',
    'https://commons.wikimedia.org/wiki/File:Delta_Airlines_Airbus_A321neo_N572DT_at_Seattle-Tacoma_May_2026.jpg (4300streetcar, CC BY 4.0): title, Sharklets',
    'https://commons.wikimedia.org/wiki/File:N687DL_-_Boeing_757-232_-_Delta_Air_Lines_SJO_220126_-_55059043154.jpg (kitmasterbloke, CC BY 4.0): right fin',
    'https://commons.wikimedia.org/wiki/File:Delta_logo.svg (PD-textlogo): the title',
    'https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_rotated_symbol.svg (PD-textlogo): the fin widget',
  ],
  base: WHITE,
  engineColor: NAVY,
  wingletColor: NAVY,
  wing: GREY,
  stab: GREY,
  side,

  engine(k) {
    // the nacelle's side box, the inlet at zMax: navy fan cowl and reverser, a bare-metal lip, the nozzle and plug aft
    const [zMin, zMax, yMin, yMax] = k.a.box
    const len = zMax - zMin
    k.fill(NAVY)
    k.poly([[zMax - 0.66 * len, yMin - 1], [zMax - 0.66 * len, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yMin - 1]], NOZZLE)
    k.poly([[zMax - 0.8 * len, yMin - 1], [zMax - 0.8 * len, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yMin - 1]], METAL)
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - 0.16, yMax + 1], [zMax - 0.16, yMin - 1]], LIP)
  },

  winglet(k) {
    // The tip atlas's "left" half paints both outboard faces, its "right" half both inboard faces, the nose at the left
    // in both: a design drawn in (z, y) with the widget's point towards the nose is right on all four faces.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const len = zMax - zMin
    const hgt = yMax - yMin
    if (k.model === 'a359' || k.model === 'a35k') return a350Winglet(k)
    if (k.model === 'a20n' || k.model === 'a21n') {
      // the Sharklet: the knee (its lowest 0.4 m) white and cut level, the blade navy with a white leading-edge band, a third
      // of the chord at the root and a fifth at the tip (N572DT). The mesh: its leading edge 0.3 m aft of zMax at the top of the
      // knee and swept 0.775 m aft per metre up; the chord 1.0 m there, 0.47 m at the tip.
      const knee = yMin + 0.4
      const le = (y: number): number => zMax - 0.3 - 0.775 * (y - knee)
      const chord = (y: number): number => Math.max(0.3, 1.0 - ((1.0 - 0.47) * (y - knee)) / (yMax - knee))
      const band = (y: number): number => chord(y) * lerp(0.33, 0.2, (y - knee) / (yMax - knee))
      k.fill(NAVY)
      k.poly([[le(knee) + 1, knee], [le(yMax + 1) + 1, yMax + 1], [le(yMax + 1) - band(yMax + 1), yMax + 1], [le(knee) - band(knee), knee]], WHITE)
      k.poly([[zMin - 1, yMin - 1], [zMax + 1, yMin - 1], [zMax + 1, knee], [zMin - 1, knee]], WHITE)
      return
    }
    const lead = (y: number): number => lerp(zMax, zMin + 0.3 * len, (y - yMin) / hgt)
    const band = (w: number, color: string): void => {
      k.poly([[lead(yMin - 1) + 1, yMin - 1], [lead(yMax + 1) + 1, yMax + 1], [lead(yMax + 1) - w, yMax + 1], [lead(yMin - 1) - w, yMin - 1]], color)
    }
    k.fill(NAVY)
    if (k.side === 'left') band(0.06, LIP)
    else band(0.25, WHITE)
  },

  belly(k) {
    const f = frame(k)
    const half = k.a.box[3]
    const [z0, z1] = fairing(k, f.keel)
    // the whole underside of the wing-to-body fairing is navy (the lens fore and aft of it comes from the side view)
    const w = 0.9 * (half - 0.1)
    const lens = 0.5 * w
    k.poly([[z0 + 1.2, lens], [z0 - 0.6, w], [z1 + 0.6, w], [z1 - 1.2, lens], [z1 - 1.2, -lens], [z1 + 0.6, -w], [z0 - 0.6, -w], [z0 + 1.2, -lens]], NAVY)
    // the white widget and DELTA on it, on the centreline, nose to tail, the letter tops to port
    const len = Math.min(2.08 * f.H, z0 - z1 - 2.4)
    k.image(asset('liveries/DAL/title-white.svg'), { z: (z0 + z1) / 2, y: 0, w: len })
  },
}

export default DAL
