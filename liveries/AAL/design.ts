// liveries/AAL/design.ts
// American Airlines (AAL; the American Eagle carriers Envoy ENY, PSA JIA and Piedmont PDT fly the same paint), the 2013
// livery: the whole aircraft in one silver-grey mica paint, a dark slate "American" title centred on the window row
// with the flight symbol at its nose end, and the flag: twelve horizontal rows from the fin tip down across the rear
// fuselage, red and white behind the fin's half-chord line, blue with thin white lines ahead of it. The flag's front
// edge is the fin's leading edge carried straight down, its aft edge the trailing edge carried down. Plain engines,
// plain wingtip devices (737: the flight symbol on the winglets' inner faces).
// Measurements: liveries/AAL/README.md (the dossier: h metres above the keel, z along the fuselage), from pixel scans
// of N407AN and N434AN (A321neo), N200NV and N955AN (737-800), N718AN (777-300ER), N826AN and N833AA (787-9).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Fill, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// Paint colours (sRGB), from sunlit photo samples (dossier §3).
const SILVER = '#c1c4c8' // the fuselage, the radome, the tail cone
const RED = { B: '#ea3324', M: '#d42628', D: '#bd1f26' } // the flag's red: bright, mid, dark
const WHITE = { W: '#f0f1f3', L: '#dcdfe4', G: '#cdd1d8' } // the flag's white: white, light grey, mid grey
const BLUE_BRIGHT = '#2a8ccf'
const BLUE = '#2269a4'
const NAVY = '#1c3f6e'
const EDGE = '#d9dbde' // the bare strip along the fin's leading edge
const NACELLE = '#c9ccd0'
const LIP = '#d6d7d8' // polished inlet lip
const METAL = '#55585c' // exhaust, core cowl, APU nozzle
const WING = '#b9bcc0' // wings, tailplane, pylons
const TIP = '#d3d5d7' // wingtip devices
const GLASS = '#15181c' // the cockpit windows
const OUTLINE = '#e9eaec' // door outlines

/**
 * The flag's rows, from the fin tip down: each row's tones from its top to its bottom (dossier §4.3). Rows 1–7 are
 * beside the blue, row 8 closes the blue below, rows 9–12 run on across the rear fuselage.
 */
const ROWS: string[][] = [
  [RED.M, RED.B], // row 1 is cut short by the tip: two tones show
  [WHITE.L, WHITE.W, WHITE.G],
  [RED.M, RED.D, RED.B],
  [WHITE.L, WHITE.G, WHITE.W],
  [RED.D, RED.B, RED.M],
  [WHITE.G, WHITE.W, WHITE.L],
  [RED.B, RED.D, RED.M],
  [WHITE.W, WHITE.G, WHITE.L],
  [RED.D, RED.B, RED.M],
  [WHITE.W, WHITE.G, WHITE.L],
  [RED.B, RED.D, RED.M],
  [WHITE.L, WHITE.G],
]

/** One aircraft family's measurements, in real metres: h above the keel, z aft of door 1's aft edge. */
interface Lay {
  H: number // the fuselage's height
  win?: number // the cabin window row's centre
  rows: number[] // the tops of rows 1–12 (row 1's is the fin tip) and the bottom of row 12
  door: [half: number, bottom: number, top: number] // door 1's outline
  symbol: [fore: number, aft: number, bottom: number, top: number]
  title: [fore: number, aft: number, cap: number] // its cap height; it is centred on the window row
  right: number // the right side's title sits this much further aft (its straight "n" cannot tuck under the blade)
}
/** A321neo: N407AN (left, level), N434AN, N426AN (right). */
const A32X: Lay = {
  H: 4.14, win: 2.7, rows: [10.06, 9.49, 8.73, 7.96, 7.18, 6.41, 5.66, 4.9, 4.08, 3.42, 2.7, 2.04, 1.59],
  door: [0.5, 1.5, 3.4], symbol: [0.38, 2.17, 2.01, 3.62], title: [2.3, 11.23, 1.35], right: 0.15,
}
/** 737-800: N200NV (left, level), N955AN (right). */
const B737: Lay = {
  H: 4.01, win: 2.47, rows: [11.58, 10.89, 10.05, 9.2, 8.35, 7.5, 6.65, 5.8, 4.95, 4.07, 3.09, 2.2, 1.73],
  door: [0.44, 1.45, 3.4], symbol: [0.22, 2.18, 1.68, 3.58], title: [2.01, 10.79, 1.39], right: 0.55,
}
/** 777-300ER: N718AN. */
const B777: Lay = {
  H: 6.2, rows: [15.1, 14.1, 12.9, 11.7, 10.45, 9.3, 8.05, 6.85, 5.7, 4.5, 3.25, 2.05, 1.57],
  door: [0.6, 1.9, 4.2], symbol: [0.85, 3.6, 2.65, 5.47], title: [3.8, 17.9, 2.15], right: 0.5,
}
/** 787-9: N826AN (left), N833AA (right). */
const B787: Lay = {
  H: 5.94, rows: [14.46, 13.5, 12.34, 11.2, 10.04, 8.9, 7.74, 6.6, 5.5, 4.4, 3.1, 1.9, 1.4],
  door: [0.85, 1.8, 4.1], symbol: [0.9, 3.5, 2.53, 5.17], title: [3.61, 16.6, 2.06], right: 0.5,
}

/**
 * A type that was not measured: the rules that hold on the four that were. The rows are one even stack from the fin
 * tip (row 1 three quarters of a row, row 12 half a row) down to 0.4 of the fuselage height on a narrow body and 0.25
 * on a wide one; the title's cap height is a third of the fuselage height; the symbol's top is at 0.87 of it.
 */
function unmeasured(H: number, tip: number, win: number): Lay {
  const bottom = (H < 4.6 ? 0.4 : 0.25) * H
  const row = (tip - bottom) / 11.25
  const rows = [tip, tip - 0.75 * row]
  for (let i = 2; i < 12; i++) rows.push(rows[i - 1] - row)
  rows.push(bottom)
  const cap = 0.34 * H
  const wide = H > 4.6
  const fore = (wide ? 0.145 : 0.07) * H
  return {
    H, win, rows, door: [0.11 * H, 0.36 * H, 0.82 * H], symbol: [fore, fore + 0.45 * H, win - cap / 2, 0.87 * H],
    title: [fore + 0.48 * H, fore + 0.48 * H + 6.45 * cap, cap], right: 0.08 * H,
  }
}

function family(model: string): Lay | null {
  if (/^a(31|32|19n|20n|21n)/.test(model)) return A32X
  if (/^b(73|3[789]m)/.test(model)) return B737
  if (model.startsWith('b77')) return B777
  if (model.startsWith('b78')) return B787
  return null
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * The dossier's frame on this model. Y(h): the keel, the window row, the crown and the fin tip land on the model's
 * own. Z(d): d metres aft of door 1's aft edge. The door's aft edge is the measured door's, or 0.1 m ahead of the
 * cabin window row where the row starts further forward (the 737 package's door station overlaps its first windows).
 */
function frame(k: Kit): { lay: Lay; Y: (h: number) => number; Z: (d: number) => number; s: number; doorAft: number } {
  const front = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 2.2 // a model whose first door is not at the front
  const zRef = (front + k.a.wingLe) / 2 // the constant section ahead of the wing
  const keel = k.bottom(zRef)
  const crown = k.top(zRef)
  const tip = k.a.finTip[0]
  const lay = family(k.model) ?? unmeasured(crown - keel, tip - keel, k.a.windowY - keel)
  const s = (crown - keel) / lay.H
  const marks: Array<[h: number, y: number]> = [[0, keel], [lay.H, crown], [lay.rows[0], Math.max(tip, crown + 0.5)]]
  if (lay.win !== undefined && k.a.windowY > keel + 0.2 && k.a.windowY < crown - 0.2) marks.splice(1, 0, [lay.win, k.a.windowY])
  const Y = (h: number): number => {
    let i = 0
    while (i < marks.length - 2 && h > marks[i + 1][0]) i++
    const [h0, y0] = marks[i]
    const [h1, y1] = marks[i + 1]
    return y0 + ((y1 - y0) * (h - h0)) / (h1 - h0)
  }
  const rowStart = k.paint?.windows?.[2]
  const doorAft = Math.max(front - lay.door[0] * s, rowStart !== undefined && Math.abs(rowStart - front) < 2 ? rowStart + 0.1 : -Infinity)
  return { lay, Y, Z: (d) => doorAft - d * s, s, doorAft }
}

/** A rounded rectangle [z0 aft, z1 fore] × [y0, y1] with corner radius r, as a path. */
function roundRect(z0: number, z1: number, y0: number, y1: number, r: number): Seg[] {
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

/**
 * The flight symbol in the box [fore … aft] × [bottom … top], from plain shapes of our own (the airline's artwork is
 * not free: dossier §6): a red blade that leans aft from a point at the lower forward corner, a blue blade that leans
 * on up to a point at the upper aft corner, and a light piece between them with a short point towards the nose.
 * `a` is +1 where larger z is aft (the wingtip atlas's inner face) and −1 on the fuselage.
 */
function symbol(k: Kit, fore: number, aft: number, bottom: number, top: number): void {
  const P = (u: number, v: number): [number, number] => [lerp(fore, aft, u), lerp(bottom, top, v)]
  const path = (d: Array<['M' | 'L', number, number] | ['Q', number, number, number, number] | ['Z']>): Seg[] =>
    d.map((s): Seg => (s[0] === 'Z' ? ['Z'] : s[0] === 'Q' ? ['Q', ...P(s[1], s[2]), ...P(s[3], s[4])] : [s[0], ...P(s[1], s[2])]))
  const up = (v0: number, v1: number, c0: string, c1: string): Fill => ({ linear: [...P(0.5, v0), ...P(0.5, v1)], stops: [[0, c0], [1, c1]] })
  // the light piece first: the blades lie over its edges
  k.path(path([['M', 0.2, 0.555], ['Q', 0.36, 0.67, 0.66, 0.635], ['Q', 0.71, 0.6, 0.66, 0.5], ['L', 0.56, 0.34], ['L', 0.4, 0.5], ['Z']]),
    { linear: [...P(0.2, 0.55), ...P(0.68, 0.55)], stops: [[0, '#a9adb3'], [0.55, '#dfe2e5'], [1, '#eceef0']] })
  k.path(path([['M', 0, 0], ['L', 0.335, 0.52], ['Q', 0.37, 0.565, 0.43, 0.54], ['Q', 0.53, 0.5, 0.505, 0.4], ['L', 0.435, 0.1], ['Q', 0.42, 0.04, 0.35, 0.035], ['Z']]),
    up(0, 0.55, '#a81d2c', '#c9293a'))
  k.path(path([['M', 0.455, 0.67], ['L', 0.67, 0.68], ['Q', 0.75, 0.69, 0.8, 0.76], ['L', 1, 1], ['L', 0.87, 0.995], ['Q', 0.77, 0.985, 0.71, 0.925], ['Z']]),
    up(0.67, 1, '#1f6aa5', '#2f8fd0'))
}

function side(k: Kit): void {
  const { lay, Y, Z, s, doorAft } = frame(k)
  const left = k.side === 'left'
  k.fill(SILVER)

  // The cockpit windows, dark: a band from the windscreen's foot back to the measured aft edge of the side windows.
  const ck = k.a.cockpit
  const cy = (f: number): number => k.at(ck, f)
  if (k.model.startsWith('b7') || k.model.startsWith('b3')) {
    // Boeing: the side windows' lower edge runs level, the upper edge slopes down to the windscreen
    k.poly([[ck, cy(0.62)], [ck, cy(0.82)], [ck + 0.55 * s, cy(0.86)], [ck + 1.2 * s, cy(0.8)], [ck + 1.75 * s, cy(0.66)], [ck + 1.7 * s, cy(0.6)], [ck + 0.9 * s, cy(0.58)]], GLASS)
  } else {
    k.poly([[ck, cy(0.6)], [ck + 0.05 * s, cy(0.78)], [ck + 0.3 * s, cy(0.84)], [ck + 1.0 * s, cy(0.84)], [ck + 1.45 * s, cy(0.76)], [ck + 1.8 * s, cy(0.62)], [ck + 1.6 * s, cy(0.58)], [ck + 0.9 * s, cy(0.56)]], GLASS)
  }

  // ---- The flag ----
  const [y0, le0, te0] = k.a.finRoot
  const [y1, le1, te1] = k.a.finTip
  const le = (y: number): number => le0 + ((le1 - le0) * (y - y0)) / (y1 - y0) // the leading-edge line, carried on down
  const te = (y: number): number => te0 + ((te1 - te0) * (y - y0)) / (y1 - y0)
  const half = (y: number): number => (le(y) + te(y)) / 2 // the diagonal: half the fin's chord
  const R = lay.rows.map(Y)
  const top = y1 + 1.5
  const far = k.a.tail - 6
  const fore = k.a.nose + 6
  const row = R[2] - R[3] // a full row on the fin
  // the field: behind the leading-edge line from the tip to the bottom of row 12; below the fin also ahead of the
  // trailing-edge line (the tail cone behind it is silver)
  const field: Pt[] = [[le(top), top], [le(R[12]), R[12]], [te(R[12]), R[12]], [te(y0 + 0.1), y0 + 0.1], [far, y0 + 0.1], [far, top]]
  k.clip(field, () => {
    ROWS.forEach((tones, i) => {
      tones.forEach((tone, j) => {
        const a = i === 0 && j === 0 ? top : lerp(R[i], R[i + 1], j / tones.length)
        const b = lerp(R[i], R[i + 1], (j + 1) / tones.length)
        k.poly([[fore, a], [far, a], [far, b], [fore, b]], tone)
      })
    })
    // the blue: rows 1–7 ahead of the diagonal, each band three runs of blue that fade between navy and bright blue in
    // turn (a weave), with a white line along the top of bands 2–7
    k.clip([[fore, top], [half(top), top], [half(R[7]), R[7]], [fore, R[7]]], () => {
      const line = 0.18 * row
      for (let i = 0; i < 7; i++) {
        const a = i === 0 ? top : R[i] - line
        const b = R[i + 1]
        if (i > 0) k.poly([[fore, R[i]], [far, R[i]], [far, a], [fore, a]], WHITE.W)
        const runs = i === 0 ? 2 : 3
        for (let j = 0; j < runs; j++) {
          const ya = i === 0 && j === 0 ? top : lerp(i === 0 ? R[0] : a, b, j / runs)
          const yb = lerp(i === 0 ? R[0] : a, b, (j + 1) / runs)
          const ym = (Math.min(ya, R[0]) + yb) / 2
          const kind = (i + (j === runs - 1 ? 1 : 0) + (j === 1 ? 2 : 0)) % 4
          const stops: Array<[number, string]> = kind === 0 ? [[0, NAVY], [0.5, BLUE], [1, BLUE_BRIGHT]]
            : kind === 1 ? [[0, BLUE_BRIGHT], [0.5, BLUE], [1, NAVY]]
            : kind === 2 ? [[0, BLUE], [0.45, BLUE_BRIGHT], [1, BLUE]]
            : [[0, NAVY], [0.55, BLUE_BRIGHT], [1, NAVY]]
          k.poly([[fore, ya], [far, ya], [far, yb], [fore, yb]], { linear: [le(ym), ym, half(ym), ym], stops })
        }
      }
    })
  })
  // the bare strip along the fin's leading edge
  const foot = Math.max(R[8], y0)
  k.poly([[le(foot), foot], [le(top), top], [le(top) - 0.12 * s, top], [le(foot) - 0.12 * s, foot]], EDGE)
  // the APU nozzle
  const [apu0, apu1] = [k.bottom(k.a.tail + 0.3) - 0.3, k.top(k.a.tail + 0.3) + 0.15] // the cone's tip only (a taller shape would paint the rudder)
  k.poly([[k.a.tail + 0.3 * s, apu0], [k.a.tail + 0.3 * s, apu1], [k.a.tail - 0.4, apu1], [k.a.tail - 0.4, apu0]], METAL)

  // ---- The symbol and the title ----
  const [sf, sa, sb, st] = lay.symbol
  symbol(k, Z(sf), Z(sa), Y(sb), Y(st))
  // The title: the wordmark's box is 790.12 × 139.24 with its cap line 5.3 below the top and its baseline 1.94 above
  // the bottom (132 between them), stretched to the measured length (the letters' tops curve away side-on). It reads
  // correctly on both sides: the "A" is next to the symbol on the left and at the aft end on the right.
  const [tf, ta, cap] = lay.title
  const capM = cap * s
  const win = lay.win !== undefined ? Y(lay.win) : k.a.windowY
  const base = win - capM / 2
  const shift = left ? 0 : lay.right
  k.image(asset('liveries/AAL/title.svg'), { z: Z((tf + ta) / 2 + shift), y: base + (capM * (137.3 - 139.24 / 2)) / 132, w: (ta - tf) * s, h: (capM * 139.24) / 132 })

  // door outlines: thin, light (they show on the red rows and faintly on the silver)
  const [dh, db, dt] = lay.door
  k.a.doors.forEach((zc, i) => {
    const first = i === 0 && zc > k.a.nose - 0.25 * k.a.length
    const c = first ? doorAft + dh * s : zc
    const w = (first ? dh : dh * 0.88) * s
    k.stroke(roundRect(c - w, c + w, Y(db + (first ? 0 : 0.05)), Y(dt - (first ? 0 : 0.05)), 0.12 * s), 0.04, OUTLINE)
  })
}

export const AAL: Design = {
  code: 'AAL',
  aliases: ['ENY', 'JIA', 'PDT'],
  name: 'American Airlines, 2013 livery',
  sources: [
    'https://commons.wikimedia.org/wiki/File:N407AN_(55104865507).jpg (Liam Thompson, CC BY-SA 4.0): A321neo, left side, level',
    'https://commons.wikimedia.org/wiki/File:American_Airbus_A321neo_N434AN_on_final_approach_to_Boston_December_2025.jpg (4300streetcar, CC BY 4.0): A321neo, left side in sun, the colours',
    'https://commons.wikimedia.org/wiki/File:N426AN_(55077416491).jpg (Liam Thompson, CC BY-SA 4.0): A321neo, right side',
    'https://commons.wikimedia.org/wiki/File:N200NV_@_BOS,_2023-07-28.jpg (Steve Knight, CC BY 2.0): 737-800, left side, level',
    'https://commons.wikimedia.org/wiki/File:Boeing_737-823(WL)_(N955AN,_msn_29540,_ln_762)_(3-11-2024).jpg (ZLEA, CC BY-SA 4.0): 737-800, right side',
    'https://commons.wikimedia.org/wiki/File:N814NN_B737-800_American_Airlines_@_MIA,_December_2016_(01).jpg (JTOcchialini, CC BY-SA 2.0): 737-800 fin in sun',
    'https://commons.wikimedia.org/wiki/File:American_Boeing_737-800_N965AN_BWI_MD2.jpg (Acroterion, CC BY-SA 4.0): 737-800 winglets, inner faces',
    'https://commons.wikimedia.org/wiki/File:N537UW_American_Airlines_Airbus_A321.jpg (Tomás Del Coro, CC BY-SA 2.0): A321-200',
    'https://commons.wikimedia.org/wiki/File:American_Airlines_N718AN_Boeing_777-323(ER)_Sydney_Kingsford_Smith_International_Airport_(SYD_YSSY)_(52576478367).jpg (Mitchul Hope, CC BY-SA 2.0): 777-300ER',
    'https://commons.wikimedia.org/wiki/File:American_Airlines-_Boeing_787-9_Dreamliner_-_N826AN_(54904350522).jpg (Umedha Hettigoda, CC BY-SA 4.0): 787-9',
    'https://commons.wikimedia.org/wiki/File:American_Airlines_wordmark_(2013).svg (PD-textlogo): the title',
  ],
  base: SILVER,
  wing: WING,
  stab: WING,
  engineColor: NACELLE,
  wingletColor: TIP,
  side,

  engine(k) {
    // Plain silver cowls (no title, no logo), a polished inlet lip, the dark core cowl and nozzle at the back.
    const [z0, z1] = [k.a.box[0], k.a.box[1]]
    k.fill(NACELLE)
    k.poly([[z1 - 0.18, -99], [z1 - 0.18, 99], [z1 + 1, 99], [z1 + 1, -99]], LIP)
    k.poly([[z0 - 1, -99], [z0 - 1, 99], [z0 + 0.16 * (z1 - z0), 99], [z0 + 0.16 * (z1 - z0), -99]], METAL)
  },

  winglet(k) {
    // The tip atlas's "left" half paints both outboard faces, its "right" half both inboard faces. Plain light grey;
    // on the 737's blended winglets the inner face carries the flight symbol on the middle of the blade (N965AN,
    // N968NN, N943NN), about half the blade's height.
    k.fill(TIP)
    if (k.side === 'right' && /^b73/.test(k.model)) {
      const [z0, z1, y0, y1] = k.a.box
      const h = 0.5 * (y1 - y0)
      const zc = lerp(z0, z1, 0.42)
      const yc = lerp(y0, y1, 0.5)
      symbol(k, zc + 0.5 * h, zc - 0.5 * h, yc - 0.5 * h, yc + 0.5 * h)
    }
  },
}

export default AAL
