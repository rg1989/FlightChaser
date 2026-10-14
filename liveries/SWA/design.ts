// liveries/SWA/design.ts
// Southwest Airlines (SWA), the 2014 "Heart" livery on the 737-700, 737-800 and 737 MAX 8: a blue aircraft with a large
// white "Southwest" on the forward fuselage, and three bands that rise aft from the belly across the rear fuselage and
// up the fin: yellow, red, then blue again, with a thin silver stripe on each boundary. A heart on the belly, blue
// engines with a white "Southwest♥com", wingtip devices in the fin's colours.
// Measurements: liveries/SWA/README.md (the dossier: z metres aft of the nose of the 737-800, h metres above the keel),
// from N8305E (left), N8524Z and N8988S (ground level) and N8781Q (right).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt, Seg } from '../../client/livery/kit.ts'

const BLUE = '#304cb2' // the logo's blue: fuselage, engines, tail cone, fin corner
const YELLOW = '#f9b612'
const RED = '#e51d23'
const SILVER = '#cccccc'
const WHITE = '#ffffff'
const LIP = '#c3c5c7' // bare-metal inlet lip
const METAL = '#857f78' // exhaust nozzle, plug, APU exhaust
const GREY = '#a9adb1' // wings, tailplane, pylons
const FONT = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif'

type XY = [number, number]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

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

// ---- The real aircraft (737-800), dossier §4 ----

const FUSE_H = 4.01 // fuselage height
const DOOR1 = 5.03 // door 1 and the rear door, centres
const REAR = 31.88
const TAIL = 38.02 // the tail cone's tip
const CROWN = 4.0 // the fin's base
const FIN_TOP = 11.15
const finLe = (h: number): number => 28.27 + 0.852 * h // the fin's leading edge (the straight part, extended to the crown)
const finTe = (h: number): number => 36.44 + 0.25 * h

/**
 * The six edges of the bands, [z, h] from under the keel upwards: blue | silver 1 | yellow | silver 2 | red | silver 3 |
 * blue. The first pair ends on the dorsal fairing, the second runs up the fin to its tip, the third leaves the fin
 * through its trailing edge (h 5.6 and 6.1). Below the keel and past the fin they are run on.
 */
const B1: XY[] = [[22.6, -0.5], [24.1, 0], [24.8, 0.25], [25.5, 0.5], [25.95, 0.75], [26.35, 1], [27.0, 1.5], [27.55, 2], [28.05, 2.5], [28.5, 3],
  [29.0, 3.5], [29.6, 4], [29.8, 4.25], [30.2, 4.8], [30.2, 13]]
const Y1: XY[] = [[23.0, -0.5], [24.5, 0], [25.15, 0.25], [25.75, 0.5], [26.2, 0.75], [26.6, 1], [27.25, 1.5], [27.8, 2], [28.3, 2.5], [28.85, 3],
  [29.3, 3.5], [29.9, 4], [30.1, 4.25], [30.5, 4.8], [30.5, 13]]
const Y2: XY[] = [[24.3, -0.5], [25.8, 0], [26.55, 0.25], [27.2, 0.5], [27.75, 0.75], [28.25, 1], [29.1, 1.5], [29.8, 2], [30.45, 2.5], [31.05, 3],
  [31.6, 3.5], [32.2, 4], [32.35, 4.25], [33.05, 5], [33.55, 5.5], [34.4, 6.5], [35.3, 7.5], [36.15, 8.5], [37.0, 9.5], [37.95, 10.5], [38.3, 10.9],
  [39.7, 12.5]]
const R2: XY[] = [[24.4, -0.5], [26.0, 0], [26.8, 0.25], [27.5, 0.5], [28.1, 0.75], [28.6, 1], [29.45, 1.5], [30.2, 2], [30.8, 2.5], [31.4, 3],
  [31.95, 3.5], [32.55, 4], [32.7, 4.25], [33.4, 5], [33.9, 5.5], [34.8, 6.5], [35.7, 7.5], [36.6, 8.5], [37.5, 9.5], [38.4, 10.5], [38.8, 10.9],
  [40.2, 12.5]]
const R3: XY[] = [[25.6, -0.5], [27.7, 0], [28.8, 0.25], [29.9, 0.5], [30.65, 0.75], [31.4, 1], [32.45, 1.5], [33.3, 2], [34.0, 2.5], [34.65, 3],
  [35.25, 3.5], [35.9, 4], [36.1, 4.25], [36.8, 5], [37.25, 5.5], [37.97, 6.1], [39.0, 7]]
const B3: XY[] = [[26.2, -0.5], [28.3, 0], [29.3, 0.25], [30.15, 0.5], [31.0, 0.75], [31.65, 1], [32.8, 1.5], [33.65, 2], [34.4, 2.5], [35.05, 3],
  [35.65, 3.5], [36.25, 4], [36.5, 4.25], [37.2, 5], [37.84, 5.6], [38.9, 6.5]]

/**
 * Where the dossier's measurements land on this model: F a point of the forward fuselage (placed by door 1), A one of
 * the rear fuselage (by the rear door), P one of the bands: the rear fuselage below the crown, the model's fin above it
 * in fin fractions (the model's fin is not the size of the real one), blended between.
 */
function frame(k: Kit): { F: (z: number, h: number) => Pt; A: (z: number, h: number) => Pt; P: (z: number, h: number) => Pt; s: number; hs: number } {
  const zRef = k.a.nose - 0.25 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zRef)
  const hs = Math.max(0.05, (k.top(zRef) - keel) / FUSE_H)
  const s = Math.abs(hs - 1) < 0.03 ? 1 : hs // on a 737 the stations are true metres
  const rear = k.a.doors.length > 1 ? k.a.doors[k.a.doors.length - 1] : k.a.tail + (TAIL - REAR) * s
  const Y = (h: number): number => keel + h * hs
  const F = (z: number, h: number): Pt => [k.a.door1 + (DOOR1 - z) * s, Y(h)]
  const A = (z: number, h: number): Pt => [rear + (REAR - z) * s, Y(h)]
  const [fy0] = k.a.finRoot
  const [fy1] = k.a.finTip
  const onFin = (z: number, h: number): Pt => {
    const y = lerp(Y(CROWN), fy1, (h - CROWN) / (FIN_TOP - CROWN))
    return k.fin((z - finLe(h)) / (finTe(h) - finLe(h)), (y - fy0) / (fy1 - fy0 || 1))
  }
  const P = (z: number, h: number): Pt => {
    const w = smoothstep(3.4, 5.2, h)
    const a = A(z, h)
    if (w <= 0) return a
    const b = onFin(z, h)
    return [lerp(a[0], b[0], w), lerp(a[1], b[1], w)]
  }
  return { F, A, P, s, hs }
}

/** A rounded rectangle between two opposite corners, corner radius r, as a path. */
function roundRect(a: Pt, b: Pt, r: number): Seg[] {
  const [z0, z1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])]
  const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])]
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

const is737 = (k: Kit): boolean => /^b(73\d|3\dm)$/.test(k.model)
const isMax = (k: Kit): boolean => /^b3\dm$/.test(k.model)

/**
 * The tailplane root's side projection out to the body half-width, measured on the 737 meshes: the shader paints the
 * root with the skin atlas, and the real tailplane is plain grey. Null on other models.
 */
function stabRoot(k: Kit): Pt[] | null {
  if (!k.p.stab || !is737(k)) return null
  const z = k.p.stab[1] // the root leading edge
  const y = k.a.finRoot[0]
  return [[z + 0.12, y - 0.67], [z + 0.14, y - 0.62], [z - 0.84, y - 0.3], [z - 3.62, y - 0.3], [z - 3.4, y - 0.67]]
}

/** The tailplane root's lower surface in plan view (z, y across), both sides: from the tail cone out to 2.25 m. */
function stabRootBelow(k: Kit): Pt[][] {
  if (!k.p.stab || !is737(k)) return []
  const z = k.p.stab[1]
  const inner = (zz: number): number => Math.max(0.1, 0.9 + 0.23 * (zz - z - 0.18)) // the tail cone's half-width at the root
  const zs = [z + 0.15, z - 0.5, z - 1.2, z - 2, z - 2.8, z - 3.45]
  const one: Pt[] = [...zs.map((zz): Pt => [zz, inner(zz) - 0.02]), [z - 3.62, 2.25], [z - 0.88, 2.25]]
  return [one, one.map(([a, b]): Pt => [a, -b])]
}

function side(k: Kit): void {
  const { F, A, P, s, hs } = frame(k)
  const far = k.a.tail - 40
  /** Everything aft of an edge. */
  const aft = (edge: XY[], color: string, place: (z: number, h: number) => Pt): void => {
    const pts = curve(edge).map(([z, h]) => place(z, h))
    k.poly([...pts, [far, pts[pts.length - 1][1]], [far, pts[0][1]]], color)
  }

  k.fill(BLUE)
  aft(B1, SILVER, A)
  aft(Y1, YELLOW, A)
  aft(Y2, SILVER, P)
  aft(R2, RED, P)
  aft(R3, SILVER, P)
  aft(B3, BLUE, P)

  // the APU exhaust at the tail cone's tip (the body table ends 1.65 m ahead of it): bare metal, below the fin
  const apu = A(TAIL - 0.4, 0)[0]
  k.poly([[apu, A(0, 0.4)[1]], [apu, A(0, FUSE_H - 0.1)[1]], [far, A(0, FUSE_H - 0.1)[1]], [far, A(0, 0.4)[1]]], METAL)
  // the tailplane root: grey
  const sr = stabRoot(k)
  if (sr) k.poly(sr, GREY)

  // a small flag on the yellow of the dorsal fairing, its canton to the nose on the left side and to the tail on the right
  {
    const [zs] = P(32.47, 4.38) // silver 2 at the flag's height
    const [z1, y0] = [zs + 0.92 * s, A(0, 4.2)[1]]
    const [w, h] = [0.62 * s, 0.34 * hs]
    k.poly([[z1, y0], [z1, y0 + h], [z1 - w, y0 + h], [z1 - w, y0]], '#f2f2f2')
    for (let i = 0; i < 4; i++) k.poly([[z1, y0 + (h * (2 * i)) / 7], [z1, y0 + (h * (2 * i + 1)) / 7], [z1 - w, y0 + (h * (2 * i + 1)) / 7], [z1 - w, y0 + (h * (2 * i)) / 7]], '#c8323c')
    const c0 = k.side === 'left' ? z1 : z1 - 0.6 * w
    k.poly([[c0, y0 + h * 0.46], [c0, y0 + h], [c0 - 0.4 * w, y0 + h], [c0 - 0.4 * w, y0 + h * 0.46]], '#3c3b6e')
  }

  // door outlines, white: the two passenger doors, and on the 737-800 and MAX 8 the two over-wing exits
  const d1 = k.a.door1
  k.stroke(roundRect([d1 + 0.4 * s, F(0, 1.7)[1]], [d1 - 0.4 * s, F(0, 3.5)[1]], 0.1), 0.045, WHITE)
  if (k.a.doors.length > 1) {
    const d2 = k.a.doors[k.a.doors.length - 1]
    k.stroke(roundRect([d2 + 0.37 * s, F(0, 1.6)[1]], [d2 - 0.37 * s, F(0, 3.45)[1]], 0.1), 0.045, WHITE)
  }
  if (k.model === 'b738' || k.model === 'b38m') {
    for (const [z0, z1] of [[16.3, 17.0], [17.3, 17.95]]) k.stroke(roundRect(F(z0, 1.95), F(z1, 3.0), 0.1), 0.04, WHITE)
  }

  // "Southwest", z 6.3–16.2 from just aft of door 1, baseline h 2.09, top of the "h" 3.55: the wordmark stretched to its
  // box (seen from the side the curve of the fuselage shortens the letters). It reads correctly on both sides: the "S"
  // by door 1 on the left, by the over-wing exits on the right.
  const [tz, ty] = F((6.3 + 16.2) / 2, (2.09 + 3.55) / 2)
  k.image(asset('liveries/SWA/title.svg'), { z: tz, y: ty, w: 9.9 * s, h: 1.46 * hs })
  // the small heart between door 1 and the title
  const [hz, hy] = F(5.7, 3.1)
  k.image(asset('liveries/SWA/heart.svg'), { z: hz, y: hy, w: 0.27 * s })
}

/** "Southwest♥com" on a nacelle, centred at z, its baseline at y, the capital "S" capM tall; it reads from the reader's left. */
function engineTitle(k: Kit, z: number, y: number, capM: number): void {
  const asc = capM / 0.966 // the wordmark's height: the top of the "h" (the "S" is a little lower)
  const xh = 0.76 * asc // the small letters
  const ww = asc * (187.6 / 31.2)
  const heart = 0.5 * xh
  const gap = 0.07 * asc
  const com = 2.5 * asc // "com" in Source Sans 3 Bold at this size, about
  const total = ww + gap + heart + gap + com
  const d = k.side === 'left' ? -1 : 1 // the reading direction along z
  const start = z - (d * total) / 2
  k.image(asset('liveries/SWA/title.svg'), { z: start + (d * ww) / 2, y: y + asc / 2, w: ww, h: asc })
  k.image(asset('liveries/SWA/heart.svg'), { z: start + d * (ww + gap + heart / 2), y: y + heart * 0.45, w: heart })
  k.text('com', { z: start + d * (ww + 2 * gap + heart), y, capM: xh / 0.745, color: WHITE, font: FONT, weight: 700, align: d < 0 ? 'fore' : 'aft' })
}

export const SWA: Design = {
  code: 'SWA',
  name: 'Southwest Airlines (2014 Heart livery)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:N8305E_(55091684730).jpg (Liam Thompson, CC BY-SA 4.0): left side, the measurements',
    'https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-800_N8524Z_BWI_MD3.jpg (Acroterion, CC BY-SA 4.0): left side, ground level',
    'https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8988S_BWI_MD2.jpg (Acroterion, CC BY-SA 4.0): left side, the tail, the AT winglet',
    'https://commons.wikimedia.org/wiki/File:Southewest_Boeing_737-8MAX_N8781Q_Arriving_SFO_L1170923.jpg (Bill Abbott, CC BY-SA 4.0): right side',
    'https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8865L_BWI_MD1.jpg (Acroterion, CC BY-SA 4.0): the engine title',
    'https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-700_N947WN_BWI_MD1.jpg (Acroterion, CC BY-SA 4.0): the belly heart',
    'https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8919K_taking_off_from_Boston_Dec_2024_2.jpg (4300streetcar, CC BY 4.0): the belly',
    'https://commons.wikimedia.org/wiki/File:Southwest_Airlines_logo_2014.svg (PD-textlogo): the wordmark and the heart',
  ],
  base: BLUE,
  engineColor: BLUE,
  wingletColor: RED,
  wing: GREY,
  stab: GREY,
  fonts: [{ family: 'Source Sans 3', src: asset('liveries/SWA/SourceSans3-Bold.woff2'), weight: '700' }],
  side,

  belly(k) {
    const { F, s } = frame(k)
    for (const p of stabRootBelow(k)) k.poly(p, GREY)
    // the heart on the centre line ahead of the wing, 1.2 m from its point (to the tail) to its top (to the nose), its
    // yellow lobe to the left wing
    k.image(asset('liveries/SWA/heart-belly.svg'), { z: F(12, 0)[0], y: 0, w: 1.2 * s })
  },

  engine(k) {
    // The nacelle's side box, the inlet lip at zMax. Measured on the meshes: the fan cowl ends 3.76 m aft of the lip
    // and is 1.99 m across (737-800), 4.42 m and 2.33 m (MAX 8); the core nozzle and the plug behind it are bare metal.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const max = isMax(k)
    const cowl = max ? 4.42 : is737(k) ? 3.76 : 0.7 * (zMax - zMin)
    const dia = max ? 2.33 : is737(k) ? 1.99 : 0.88 * (yMax - yMin)
    const yc = yMin + dia / 2 // the axis
    const zx = zMax - cowl // the fan exit
    k.fill(BLUE)
    k.poly([[zx, yMin - 1], [zx, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yMin - 1]], METAL)
    if (max) {
      // LEAP-1B: the cowl ends in saw-tooth chevrons
      const n = 9
      const pitch = dia / n
      for (let i = 0; i < n; i++) {
        const y0 = yc - dia / 2 + i * pitch
        k.poly([[zx - 0.01, y0], [zx + 0.26, y0 + pitch / 2], [zx - 0.01, y0 + pitch]], METAL)
      }
    }
    // the pylon over the cowl's aft half and over the nozzle: grey
    k.poly([[zMax - 0.45 * cowl, yc + dia / 2 - 0.02], [zMax - 0.45 * cowl, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yc + 0.27 * dia], [zx, yc + 0.27 * dia],
      [zx, yc + dia / 2 - 0.02]], GREY)
    // the polished inlet lip
    const lip = max ? 0.34 : 0.15
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - lip, yMax + 1], [zMax - lip, yMin - 1]], LIP)
    // the title on every face, a little above the axis: the capital "S" 0.146 of the cowl's height (N8865L)
    const cap = 0.146 * dia
    engineTitle(k, zMax - 0.5 * cowl, yc + 0.08 * dia - cap / 2, cap)
  },

  winglet(k) {
    // The device's side box; both faces alike (the fin's colours on the upper blade, the lower blade and the junction
    // white). The upper blade from the wing-tip plane to its tip, t 0 … 1: its leading and trailing edges as measured on
    // the meshes (blended winglet: 737-800 model; AT winglet: MAX 8 model).
    const [z0, z1, y0, y1] = k.a.box
    const W = z1 - z0
    const max = isMax(k)
    const yb = max ? Math.max(y0, k.p.wing[4] + 0.17) : y0 // the blade's base
    const le = (t: number): number => z1 - (max ? 0.83 : 0.95) * W * t
    const te = (t: number): number => z1 - (max ? 0.64 : 0.67) * W - (max ? 0.36 : 0.33) * W * t
    const at = (c: number, t: number): Pt => [lerp(le(t), te(t), c), lerp(yb, y1, t)]
    const ts = [-0.3, 0, 0.25, 0.5, 0.75, 1, 1.15]
    const far = z0 - 3
    const [yLo, yHi] = [lerp(yb, y1, -0.3), lerp(yb, y1, 1.15)]
    // the yellow's aft edge, in chord fractions: a band of nearly constant width along the leading edge
    const yel = (t: number): number => (max ? lerp(0.27, 0.79, Math.max(0, t)) : lerp(0.3, 1.0, Math.max(0, t) / 0.92))
    const behind = (c: (t: number) => number, color: string): void => {
      k.poly([...ts.map((t): Pt => at(c(t), t)), [far, yHi], [far, yLo]], color)
    }
    k.fill(YELLOW)
    behind(yel, SILVER)
    behind((t) => yel(t) + 0.045 + 0.05 * Math.max(0, t), RED)
    // the blue lower aft corner, a silver stripe on its edge
    const corner: XY[] = max ? [[0.5, -0.1], [0.56, 0], [0.8, 0.13], [1.0, 0.3], [1.3, 0.6]] : [[0.62, -0.1], [0.7, 0], [0.86, 0.08], [1.0, 0.2], [1.3, 0.5]]
    const edge = (dc: number): Pt[] => curve(corner.map(([c, t]): XY => [c + dc, t])).map(([c, t]) => at(c, t))
    k.poly([...edge(-0.05), [far, lerp(yb, y1, 0.6)], [far, yLo]], SILVER)
    k.poly([...edge(0), [far, lerp(yb, y1, 0.6)], [far, yLo]], BLUE)
    if (max) {
      // the junction and the lower blade: white
      k.poly([[z0 - 1, yb], [z1 + 1, yb], [z1 + 1, y0 - 1], [z0 - 1, y0 - 1]], WHITE)
    } else {
      // the bare-metal leading-edge strip
      k.poly([[z1 + 2, yLo], [z1 + 2, yHi], at(0.04, 1.15), at(0.04, -0.3)], '#b4b8bc')
    }
  },
}

export default SWA
