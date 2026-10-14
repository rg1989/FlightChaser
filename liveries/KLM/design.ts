// liveries/KLM/design.ts
// KLM (KLM; KLM Cityhopper KLC wears the same paint), the 2014 livery: light blue above a thin dark-blue line that is
// level along the cabin and sweeps down under the nose, white below it, a white fin with the crown-and-KLM logo in
// light blue, the white title above the windows (the logo, then "Royal Dutch Airlines", or "Cityhopper" on the
// Embraers), white engines and winglets with the small blue logo.
// Dossier: liveries/KLM/README.md. The line, the title and the logos were measured on the side-on photos PH-BXB
// (737-800, left), PH-BVS (777-300ER, right), PH-BHE (787-9, right), PH-AKA (A330-300, left) and PH-EXV / PH-EXY (Embraer 190), in metres aft
// of the nose (d) and above the keel of the constant section (h), and are placed by each model's landmarks: door 1,
// the wing root or door 2, the window row, the fin's chord.
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt } from '../../client/livery/kit.ts'

// Paint colours (sRGB; dossier §3).
const BLUE = '#00a1de' // KLM light blue: the upper fuselage, the logos
const DARK = '#0d3c84' // the line
const WHITE = '#f4f5f7' // belly, fin, engines, winglets
const TITLE = '#ffffff'
const GREY = '#a9b1b7' // wings, tailplane
const LIP = '#b9bcbf' // bare-metal inlet lip
const METAL = '#55585c' // exhaust, APU outlet

const LOGO = asset('liveries/KLM/logo.svg')
const LOGO_WHITE = asset('liveries/KLM/logo-white.svg')
const LOGO_ASPECT = 350 / 203.53 // the file: the letters span its width, the crown sits centred over them
const FONT = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif'
const CAP_EM = 0.66 // Source Sans 3: cap height over the em

type XY = [number, number]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x))
/** A smooth maximum: never below either value, rounded over e where they cross. */
const smax = (a: number, b: number, e = 0.06): number => 0.5 * (a + b + Math.sqrt((a - b) ** 2 + e * e))

/** A Catmull-Rom curve through the points, n samples per span (both ends included). */
function curve(pts: XY[], n = 8): XY[] {
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

// ---- Where things are on each family (dossier §4), in metres on the measured aircraft ----

interface Layout {
  H: number // the measured aircraft's fuselage height: every length below scales with the model's
  door1: number // door 1's centre, metres aft of the nose
  anchor: ['wing' | 'door2', number] // a second landmark and its d: the wing root's leading edge, or door 2's centre
  line: XY[] // the dark line's centre from under the nose to the level part: [d, h]
  tail: XY[] // … and over the rear fuselage: [metres ahead of the tail cone's end, h]
  width: number // the line's width
  meet: number // d where the line reaches the nose's lower outline (the two sides join there under the chin)
  title: {
    fore: number // the block's forward end, aft of door 1's centre
    klm: number // the width of "KLM"
    base: number // the baseline, above the window row's centre
    gap: number // between "KLM" and the second word
    word: [text: string, length: number, cap: number, weight: number, em: number] // em: the text's length over its font size, untracked
  }
  lobe: number // the radius of the fuselage's upper lobe (the title is painted on it)
  fin: [u: number, width: number, foot: number] // the fin logo: its centre along the chord, its width over the chord at the letters, its foot up the fin
  engine: [width: number, aft: number, up: number, lip: number, hot: number] // the cowl logo: width, centre aft of the lip and above the axis; the lip's width; the bare exhaust's length over the nacelle's
  apu: boolean // a bare-metal outlet at the tail cone's end
}

/** 737-800 (PH-BXB, left, true side-on). Other narrow-bodies take it scaled by their fuselage height. */
const B737: Layout = {
  H: 4.01, door1: 4.99, anchor: ['wing', 15.0], width: 0.165, meet: 0.35,
  line: [[0.35, 0.81], [1.8, 0.81], [3.9, 0.83], [5.2, 0.94], [6.1, 1.04], [7.1, 1.19], [8.2, 1.35], [9.3, 1.53], [10.4, 1.66], [12.5, 1.81], [13.6, 1.86],
    [14.7, 1.89], [15.7, 1.9], [19, 1.92], [24.3, 1.93]],
  tail: [[8.3, 1.94], [6.2, 1.99], [5.1, 2.06], [4.0, 2.18], [2.9, 2.32], [0.4, 2.67]],
  title: { fore: 1.48, klm: 2.14, base: 0.27, gap: 0.25, word: ['Royal Dutch Airlines', 3.86, 0.265, 700, 8.63] },
  lobe: 1.88, fin: [0.576, 0.716, 0.266], engine: [0.97, 1.55, 0.15, 0.1, 0.14], apu: true,
}
/** 777-300ER (PH-BVS, right; d by the photo's doors, which the model's match). Other wide-bodies take it scaled. */
const B777: Layout = {
  H: 6.2, door1: 6.8, anchor: ['door2', 17.2], width: 0.25, meet: 0.2,
  line: [[0.2, 1.58], [0.97, 1.58], [2.19, 1.54], [3.41, 1.56], [4.62, 1.59], [7.03, 1.725], [9.18, 1.9], [11.34, 2.11], [13.49, 2.33], [15.65, 2.57], [17.79, 2.76],
    [18.86, 2.81], [20.5, 2.85], [24, 2.86]],
  tail: [[14, 2.86], [8.6, 3.0], [4.5, 3.21], [1.76, 3.45], [0.4, 3.62], [0, 3.66]],
  title: { fore: 1.23, klm: 3.19, base: 0.38, gap: 0.26, word: ['Royal Dutch Airlines', 4.49, 0.3, 700, 8.63] },
  lobe: 3.1, fin: [0.526, 0.8, 0.167], engine: [1.03, 2.03, 0, 0.22, 0.12], apu: false,
}
/** 787-9 with the 2025 nose (PH-BHE, right). */
const B787: Layout = {
  H: 5.94, door1: 6.55, anchor: ['door2', 19.15], width: 0.23, meet: 0.3,
  line: [[0.3, 0.38], [2.1, 0.38], [3.0, 0.36], [3.9, 0.4], [4.8, 0.49], [5.7, 0.6], [6.6, 0.75], [8.3, 1.09], [10.1, 1.48], [11.9, 1.84], [13.7, 2.16], [15.5, 2.36],
    [17.2, 2.47], [20.5, 2.6], [24.4, 2.68], [28, 2.68]],
  tail: [[13, 2.68], [8, 2.82], [4.2, 3.02], [1.6, 3.25], [0, 3.45]],
  title: { fore: 2.6, klm: 2.85, base: 0.44, gap: 0.23, word: ['Royal Dutch Airlines', 4.6, 0.34, 700, 8.63] },
  lobe: 2.9, fin: [0.55, 0.74, 0.22], engine: [0.87, 2.3, 0, 0.25, 0.12], apu: false,
}
/**
 * A330-300 (PH-AKA, left, true side-on; d by its photo, 28.15 px/m, doors at d 6.04 and 18.3). The line's h is from the
 * window row (3.56 m above the keel on the model) and the line's drop below it as measured: 0.66 m on the level part.
 */
const A330: Layout = {
  H: 5.91, door1: 6.04, anchor: ['door2', 18.3], width: 0.22, meet: 0.35,
  line: [[0.35, 1.46], [2.6, 1.46], [4.7, 1.46], [6.8, 1.59], [9.0, 1.8], [11.1, 2.05], [13.2, 2.3], [15.3, 2.58], [17.5, 2.74], [19.6, 2.83], [21.7, 2.87],
    [23.9, 2.9], [30, 2.9], [40.9, 2.87], [49.4, 2.94], [53.7, 3.04]],
  tail: [[8.3, 3.05], [6, 3.12], [4.2, 3.25], [2.2, 3.42], [0.4, 3.62], [0, 3.66]],
  title: { fore: 1.92, klm: 2.6, base: 0.36, gap: 0.3, word: ['Royal Dutch Airlines', 4.55, 0.32, 700, 8.63] },
  lobe: 2.95, fin: [0.56, 0.72, 0.26], engine: [1.03, 2.0, 0, 0.22, 0.12], apu: false,
}
/** Embraer 190 (PH-EXV, left; PH-EXY, right): KLM Cityhopper. */
const E190: Layout = {
  H: 3.35, door1: 5.1, anchor: ['wing', 13.1], width: 0.14, meet: 0.35,
  line: [[0.35, 0.34], [2.0, 0.34], [2.85, 0.36], [4.1, 0.5], [5.3, 0.66], [6.6, 0.84], [7.8, 1.02], [9.0, 1.14], [10.3, 1.23], [11.6, 1.29], [13, 1.31], [16, 1.31]],
  tail: [[8, 1.31], [6, 1.38], [4.5, 1.5], [3, 1.68], [1.5, 1.9], [0.3, 2.1]],
  title: { fore: 1.9, klm: 1.8, base: 0.3, gap: 0.3, word: ['Cityhopper', 2.6, 0.31, 400, 4.6] },
  lobe: 1.5, fin: [0.56, 0.7, 0.28], engine: [0.55, 0.9, 0, 0.08, 0.12], apu: true,
}

function layoutOf(model: string, H: number): Layout {
  if (model.startsWith('b77')) return B777
  if (model.startsWith('b78')) return B787
  if (model.startsWith('a33')) return A330
  if (/^e(1[79]\d|75|29)/.test(model)) return E190
  return H > 5 ? B777 : B737
}

interface Frame {
  lay: Layout
  s: number // model metres per measured metre
  door1: number
  Z: (d: number) => number // model z of a point d metres aft of the nose on the measured aircraft
  Y: (h: number) => number // model y of a point h metres above its keel
}

function frame(k: Kit): Frame {
  const { nose, length } = k.a
  const zRef = nose - 0.2 * length // the constant section, ahead of the wing
  const keel = k.bottom(zRef)
  const H = Math.max(0.5, k.top(zRef) - keel)
  const lay = layoutOf(k.model, H)
  const s = H / lay.H
  // door 1, or (a model whose first measured door is not at the front) where it would be
  const door1 = k.a.door1 < nose - 0.03 * length && k.a.door1 > nose - 0.25 * length ? k.a.door1 : nose - lay.door1 * s
  // the second landmark, if the model has it near where the measured aircraft does
  const [kind, dA] = lay.anchor
  const want = door1 - (dA - lay.door1) * s
  const reach = Math.min(0.4 * (door1 - want), 1.2 * s) // a second landmark within 1.2 m: a different door spacing is no reason to stretch the title
  const got = kind === 'wing' ? k.a.wingLe : k.a.doors.find((z) => z < door1 - 2 && Math.abs(z - want) < reach)
  const second = got !== undefined && Math.abs(got - want) < reach ? got : want
  const Z = (d: number): number =>
    d <= lay.door1 ? lerp(nose, door1, d / lay.door1) : d <= dA ? lerp(door1, second, (d - lay.door1) / (dA - lay.door1)) : second - (d - dA) * s
  return { lay, s, door1, Z, Y: (h) => keel + h * s }
}

/** The dark line's centre, from where it meets the nose's lower outline to past the tail. */
function lineOf(k: Kit, f: Frame): Pt[] {
  const { lay, s, door1, Z, Y } = f
  const knots: XY[] = lay.line.map(([d, h]): XY => [Z(d), Y(h)])
  const last = knots[knots.length - 1][0]
  for (const [dT, h] of lay.tail) {
    const z = k.a.tail + dT * s
    if (z < knots[knots.length - 1][0] - 0.5 && z < last - 1) knots.push([z, Y(h)])
  }
  const end = knots[knots.length - 1]
  knots.push([Math.min(end[0], k.a.tail) - 2, end[1]])
  // Under the nose the line never dips below the lower outline: it runs along it and ends on it.
  const zMeet = Z(lay.meet)
  const lift = 0.6 * lay.width * s
  const pts = curve(knots).map(([z, y]): Pt => (z > door1 ? [z, smax(y, k.bottom(z) + lift * clamp((zMeet - z) / (0.5 * s), 0, 1))] : [z, y]))
  return [[zMeet + 0.04, k.bottom(zMeet + 0.04)], ...pts]
}

/**
 * The logo as it lies on the fuselage's upper lobe (radius R, its axis at yc): undistorted along the skin, so in side
 * elevation each strip of it is squeezed more the higher it is (the crown is flatter than the letters under it).
 * zc: its centre; w: its width; base: the letters' baseline in side elevation.
 */
function onLobe(k: Kit, src: string, zc: number, w: number, base: number, yc: number, R: number, n = 12): void {
  const tall = w / LOGO_ASPECT // its height along the skin
  const a0 = Math.asin(clamp((base - yc) / R, -0.9, 0.9))
  for (let j = 0; j < n; j++) {
    const a = a0 + (tall * j) / n / R
    const b = a0 + (tall * (j + 1)) / n / R
    if (b > 1.45) break // over the crown
    const y0 = yc + R * Math.sin(a)
    const y1 = yc + R * Math.sin(b)
    const h = n * (y1 - y0) // the whole image at this strip's squeeze
    const bottom = y0 - (h * j) / n
    k.clip([[zc - w, y0 - 0.004], [zc + w, y0 - 0.004], [zc + w, y1 + 0.004], [zc - w, y1 + 0.004]], () => {
      k.image(src, { z: zc, y: bottom + h / 2, w, h })
    })
  }
}

function side(k: Kit): void {
  const f = frame(k)
  const { lay, s, door1 } = f
  const { tail } = k.a

  k.fill(BLUE)

  // White below the line, the line over the edge.
  const line = lineOf(k, f)
  const low = k.a.box[2] - 5
  k.poly([...line, [line[line.length - 1][0], low], [line[0][0], low]], WHITE)
  k.stroke(line, lay.width * s, DARK)

  // The APU outlet at the tail cone's end: bare metal.
  // (only the cone's own height: the fin's trailing edge reaches aft of the cone's end and must stay white)
  if (lay.apu) k.poly([[tail + 0.25 * s, k.bottom(tail) - 0.5], [tail + 0.25 * s, k.top(tail) + 0.2 * s], [tail - 4, k.top(tail) + 0.2 * s], [tail - 4, k.bottom(tail) - 0.5]], METAL)

  // The fin: white, the logo in light blue towards the trailing edge (it reads correctly on both faces).
  k.finFill(WHITE, { down: 0 })
  const [uc, wf, foot] = lay.fin
  const finH = Math.max(0.5, k.a.finTip[0] - k.a.finRoot[0])
  const chord = (v: number): number => k.fin(0, v)[0] - k.fin(1, v)[0]
  let w = wf * chord(foot + 0.06)
  w = wf * chord(foot + (0.125 * w) / finH) // the letters' mid-height is an eighth of the logo's width above its foot
  const mid = foot + (0.125 * w) / finH
  k.image(LOGO, { z: k.fin(uc, mid)[0], y: k.fin(0, foot)[1] + w / LOGO_ASPECT / 2, w })

  // The title above the windows, aft of door 1: the logo in white, then the second word on its baseline. It covers the
  // same stretch of fuselage on both sides and reads correctly on each: the logo is at the forward end on the left
  // side and at the aft end on the right side.
  const t = lay.title
  const [text, length, cap, weight, em] = t.word
  const fore = door1 - t.fore * s
  const block = (t.klm + t.gap + length) * s
  const base = k.a.windowY + t.base * s
  const zLogo = k.side === 'left' ? fore - (t.klm * s) / 2 : fore - block + (t.klm * s) / 2
  const R = lay.lobe * s
  onLobe(k, LOGO_WHITE, zLogo, t.klm * s, base, k.top(zLogo) - R, R)
  // the word, spaced out to its painted length
  const size = (cap * s) / CAP_EM
  const tracking = clamp(((length * s) / size - em) / text.length, -0.02, 0.12)
  if (k.side === 'left') k.text(text, { z: fore - (t.klm + t.gap) * s, y: base, capM: cap * s, color: TITLE, font: FONT, weight, align: 'fore', tracking })
  else k.text(text, { z: fore - block + (t.klm + t.gap) * s, y: base, capM: cap * s, color: TITLE, font: FONT, weight, align: 'aft', tracking })
}

const KLM: Design = {
  code: 'KLM',
  aliases: ['KLC'],
  name: 'KLM (2014 livery)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXB_Boeing_737-8K2_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52723490982).jpg (Mitchul Hope, CC BY-SA 2.0): 737-800, left side',
    'https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXI_Boeing_737-8K2_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52724264524).jpg (Mitchul Hope, CC BY-SA 2.0): 737-800, right side',
    'https://commons.wikimedia.org/wiki/File:PH-BGB_737_KLM_ARN_01.jpg (Bene Riobó, CC BY-SA 4.0): the line under the nose',
    'https://commons.wikimedia.org/wiki/File:KLM_PH-BXV_B737-800.jpg (Zima Savolainen, CC BY-SA 4.0): from below, the winglets\' inner faces',
    'https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_KLM_Boeing_777-306ER_PH-BVS_@_WSSS_2025-08-30.jpg (S5A-0043, CC BY 4.0): 777-300ER, right side',
    'https://commons.wikimedia.org/wiki/File:AMS_PH-BVN.jpg (Andrzej Otrębski, CC BY-SA 4.0): 777-300ER, left side from the front',
    'https://commons.wikimedia.org/wiki/File:PH-BHE_B787-9,_IAH_12-10-25_(55094687921).jpg (Duncan Kirk, CC BY 4.0): 787-9, right side',
    'https://commons.wikimedia.org/wiki/File:PH-EXV_Embraer_190_KLM_Cityhopper,_Manchester.jpg (Ian Gratton, CC BY 2.0): Embraer 190, left side',
    'https://commons.wikimedia.org/wiki/File:KLM_Embraer_E190STD_PH-EXY_Landed_at_Amsterdam_Schipol_International_Airport.jpg (Aryan loves planes, CC0): Embraer 190, right side',
    'https://commons.wikimedia.org/wiki/File:PH-AKA_A300-300,_KLM,_Miami_02-19-26_(55146372991).jpg (Duncan Kirk, CC BY 4.0): A330-300, left side',
    'https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKF_(30667747398).jpg (Gerard van der Schaaf, CC BY 2.0): A330-300, right side',
    'https://commons.wikimedia.org/wiki/File:KLM_logo.svg (PD-textlogo): the logo',
    'https://github.com/adobe-fonts/source-sans (SIL OFL 1.1): the second word of the title',
  ],
  base: BLUE,
  wing: GREY,
  stab: GREY,
  engineColor: WHITE,
  wingletColor: WHITE,
  fonts: [
    { family: 'Source Sans 3', src: asset('liveries/KLM/SourceSans3-Bold.woff2'), weight: '700' },
    { family: 'Source Sans 3', src: asset('liveries/KLM/SourceSans3-Regular.woff2'), weight: '400' },
  ],
  side,

  engine(k) {
    // White all round, a bare-metal inlet lip, the bare exhaust at the back; the logo on the fan cowl, on each face.
    const { lay, s } = frame(k)
    const [z0, z1, y0, y1] = k.a.box
    const [w, aft, up, lip, hot] = lay.engine
    k.fill(WHITE)
    k.poly([[z0 + hot * (z1 - z0), -99], [z0 + hot * (z1 - z0), 99], [z0 - 1, 99], [z0 - 1, -99]], METAL)
    k.poly([[z1 + 1, -99], [z1 + 1, 99], [z1 - lip * s, 99], [z1 - lip * s, -99]], LIP)
    k.image(LOGO, { z: z1 - aft * s, y: (y0 + y1) / 2 + up * s, w: w * s })
  },

  winglet(k) {
    // White on both faces, the wing's grey on the blend at the foot, the logo on both faces.
    const [z0, z1, y0, y1] = k.a.box
    k.fill(WHITE)
    k.poly([[z0 - 1, y0 - 1], [z1 + 1, y0 - 1], [z1 + 1, y0 + 0.18 * (y1 - y0)], [z0 - 1, y0 + 0.18 * (y1 - y0)]], GREY)
    k.image(LOGO, { z: lerp(z0, z1, 0.45), y: lerp(y0, y1, 0.5), w: 0.36 * (z1 - z0) })
  },
}

export default KLM
