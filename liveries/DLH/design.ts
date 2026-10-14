// liveries/DLH/design.ts
// Lufthansa (DLH; Lufthansa CityLine CLH wears the same paint), the 2018 livery: a white aircraft with no cheatline and
// no belly colour; a dark blue fin whose blue runs down round the rear fuselage between two straight lines (the fin's
// leading edge and its trailing edge, both continued down to the keel), a white tail cone behind it; a white crane in a
// thin ring on the fin; "Lufthansa" in blue above the windows aft of door 1; small blue crane roundels below the cockpit
// and on the Sharklets; one yellow panel beside the forward left door; white engines with no marking.
// Measurements: liveries/DLH/README.md (the dossier: z metres aft of the nose, h above the keel, on the 44.51 m A321neo
// D-AIEF, a true side view). Things are placed from the model's own door 1, cockpit, window row and fin.
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// Paint colours (sRGB), from sunlit photo samples (dossier §3).
const BLUE = '#0e1c4b' // fin, rear fuselage, title, roundels (the logo files carry the same value)
const WHITE = '#f4f5f6'
const YELLOW = '#fab41e' // the door panel
const WING = '#b9bcc0' // Airbus light grey
const STAB = '#c4c8cc' // the tailplane, a little lighter
const BAND = '#aeb2b7' // the Sharklet's leading-edge band
const LIP = '#a7a8ac' // bare-metal inlet lip
const METAL = '#6e7074' // exhaust, APU nozzle
const GLASS = '#16181c' // the cockpit windows
const OUTLINE = '#c3c7cb' // door outlines on the white
const SILL = '#a4a8ad' // the scuff plate under a door
const STAR = '#6b6f78' // the Star Alliance star's outline

const REF_H = 4.14 // the A320 family's fuselage height: the dossier's sizes are for it
const LE_STRIP = 0.09 // the white strip along the fin's leading edge, in side view

interface Frame {
  hs: number // this fuselage's height over the A320's: titles and roundels grow with the fuselage
  keel: number
  wy: number // the window row
  door1: number
  front: (y: number) => number // the blue's front edge: z at height y
  aft: (y: number) => number // its aft edge
  blue: Pt[] // the blue zone
}

/** The model's landmarks the paint hangs on. */
function frame(k: Kit): Frame {
  const zRef = k.a.nose - 0.3 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zRef)
  // A double-deck's hump lies over the section ahead of the wing: its height is the main deck's, from the body's width.
  const H = k.model.startsWith('b74') || k.model.startsWith('a38') ? (2 * (k.paint?.bodyHalfWidth ?? 3.63)) / 1.12 : k.top(zRef) - keel
  const hs = H / REF_H
  // door 1, or (a model whose first measured door is not at the front) a place behind the cockpit
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 0.45 * H
  // The fin's leading and trailing edge as lines (z at height y). The blue lies between them, from below the keel up:
  // its front edge is the leading-edge line (less the white strip), straight down to the keel; its aft edge is the
  // trailing-edge line across the tail cone. Above the tail cone everything behind the front edge is fin, and blue.
  const [y0, le0, te0] = k.a.finRoot
  const [y1, le1, te1] = k.a.finTip
  const front = (y: number): number => le0 + ((le1 - le0) * (y - y0)) / (y1 - y0) - LE_STRIP * hs
  const aft = (y: number): number => te0 + ((te1 - te0) * (y - y0)) / (y1 - y0)
  const lo = k.a.box[2] - 3
  const hi = k.a.box[3] + 3
  const far = k.a.tail - 5
  const cone = k.top(te0) + 0.05 // the tail cone's crown under the trailing edge
  const blue: Pt[] = [[front(lo), lo], [front(hi), hi], [far, hi], [far, cone], [aft(cone), cone], [aft(lo), lo]]
  return { hs, keel, wy: k.a.windowY, door1, front, aft, blue }
}

/** A rounded rectangle [z0 aft, z1 fore] × [y0, y1] with corner radius r, as a path. */
function roundRect(z0: number, z1: number, y0: number, y1: number, r: number): Seg[] {
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

/**
 * The tailplane's root in side view, where it lies inside the body's half-width: the paint shader gives that zone the
 * skin atlas, so the blue of the rear fuselage would run out onto the grey tailplane. Measured on the a320 and a21n
 * meshes (the same tail on the whole family): from 0.15 m ahead of the root's leading edge to 3.95 m behind it, from
 * 0.06 m below the window row to 0.47 m above it. The fuselage flank in there is behind the tailplane. Null elsewhere.
 */
function stabRoot(k: Kit, wy: number): Pt[] | null {
  if (!k.p.stab || !/^a(31|32|20|21)/.test(k.model)) return null
  const z = k.p.stab[1]
  return [[z + 0.15, wy - 0.06], [z + 0.15, wy + 0.47], [z - 3.95, wy + 0.47], [z - 3.95, wy - 0.06]]
}

function side(k: Kit): void {
  const f = frame(k)
  const { hs, keel, wy, door1 } = f
  const left = k.side === 'left'

  k.fill(WHITE)

  // The cockpit windows, dark (the mesh's glass takes the atlas like the skin): the Airbus outline, its aft edge on the
  // model's measured one (D-AIEF: 1.2 … 3.0 m aft of the nose, 2.3 … 3.1 m above the keel).
  const glass: Pt[] = [[1.2, 2.43], [1.35, 2.72], [1.62, 2.98], [2.0, 3.07], [2.7, 3.05], [2.93, 2.96], [3.03, 2.8], [3.04, 2.5], [2.98, 2.36], [2.0, 2.32], [1.4, 2.34]]
  // On a double-deck the cockpit is on the hump: its top 0.5 m under the crown there.
  const hump = k.model.startsWith('b74') || k.model.startsWith('a38')
  // On a larger fuselage the windows grow less than the fuselage does, from the same top line.
  const gs = Math.min(hs, 1.2)
  const gt = hump ? k.top(k.a.cockpit) - 0.5 : keel + 3.07 * hs // the windows' top line
  k.poly(glass.map(([d, h]): Pt => [k.a.cockpit + (3.02 - d) * gs, gt - (3.07 - h) * gs]), GLASS)

  // The blue: the fin and the rear fuselage all round, the tail cone behind it white, the APU nozzle bare metal.
  k.poly(f.blue, BLUE)
  const sr = stabRoot(k, wy)
  if (sr) k.poly(sr, STAB)
  // The APU nozzle: the tip of the tail cone only (the fin's upper trailing edge also lies aft of the cone's tip).
  const nb = k.bottom(k.a.tail) - 0.3
  const nt = k.top(k.a.tail) + 0.3
  k.poly([[k.a.tail + 0.3 * hs, nb], [k.a.tail + 0.3 * hs, nt], [k.a.tail - 5, nt], [k.a.tail - 5, nb]], METAL)

  // Door outlines: thin grey on the white, thin white on the blue (the front edge cuts the rear door: its upper forward
  // corner is white). A scuff plate under each door.
  const doors = (color: string, sill: string): void => {
    k.a.doors.forEach((zc, i) => {
      const [w, top] = i === 0 ? [1.0, 1.01] : [0.92, 0.94]
      const y0 = wy - 1.05
      k.poly([[zc + w / 2 + 0.08, y0 + 0.02], [zc - w / 2 - 0.08, y0 + 0.02], [zc - w / 2 - 0.08, y0 - 0.1], [zc + w / 2 + 0.08, y0 - 0.1]], sill)
      k.stroke(roundRect(zc - w / 2, zc + w / 2, y0, wy + top, 0.12), 0.04, color)
    })
  }
  doors(OUTLINE, SILL)
  k.clip(f.blue, () => doors(WHITE, SILL))

  // The yellow panel at the window row, touching the aft edge of the forward boarding door: left side only. A
  // single-aisle aircraft with a second door ahead of the wing (the A321ceo) has one more aft of that door (D-AIRH).
  if (left) {
    const single = hs < 1.2
    k.a.doors.forEach((zc, i) => {
      const fwd = i === 0 ? zc === door1 : single && zc > k.a.wingLe
      if (!fwd) return
      const z1 = zc - (i === 0 ? 0.5 : 0.46)
      k.poly([[z1, wy - 0.15 * hs], [z1, wy + 0.19 * hs], [z1 - 0.22 * hs, wy + 0.19 * hs], [z1 - 0.22 * hs, wy - 0.15 * hs]], YELLOW)
    })
  }

  // "Lufthansa" above the windows from 0.55 m aft of door 1: 6.21 m long, from 0.34 m to 1.21 m above the window row
  // (the wordmark stretched to its side-view box: it lies on the fuselage's shoulder). The same box on both sides; it
  // reads from the left on both, so the "L" is by the door on the left side and at the aft end on the right.
  const t0 = door1 - 0.5 - 0.55 * hs
  k.image(asset('liveries/DLH/title.svg'), { z: t0 - (6.21 * hs) / 2, y: wy + ((0.34 + 1.21) / 2) * hs, w: 6.21 * hs, h: 0.87 * hs })

  // The Star Alliance star between the cockpit windows and the door, a little above the window row: a thin grey outline.
  const sz = door1 + 0.5 + 0.65 * hs
  const sy = wy + 0.16 * hs
  const star: Pt[] = Array.from({ length: 11 }, (_, i): Pt => {
    const r = (i % 2 === 0 ? 0.2 : 0.085) * hs
    const a = Math.PI / 2 + (i * Math.PI) / 5
    return [sz + r * Math.cos(a), sy + r * Math.sin(a)]
  })
  k.stroke(star, 0.03 * hs, STAR)

  // The crane roundel below the aft cockpit window: 0.56 m across, 0.9 m below the window row, flying forward.
  k.image(asset('liveries/DLH/crane-blue.svg'), { z: k.a.cockpit + 0.29 * hs, y: wy - 0.9 * hs, w: 0.56 * hs, mirror: true })

  // The flags below the windows ahead of the blue, the German one then the European one towards the tail, on both
  // sides (the registration ahead of them is the aircraft's own: not drawn).
  const fy = wy - 0.75 * hs
  const fh = 0.28 * hs
  const eu = f.front(fy) + 1.1 * hs // the European flag's aft edge
  const de = eu + (0.46 + 0.13) * hs
  const flag = (z0: number, w: number, y0: number, h: number, color: string): void => void k.poly([[z0 + w, y0], [z0 + w, y0 + h], [z0, y0 + h], [z0, y0]], color)
  flag(de, 0.5 * hs, fy + fh / 6, fh / 3, '#111111')
  flag(de, 0.5 * hs, fy - fh / 6, fh / 3, '#dd0000')
  flag(de, 0.5 * hs, fy - fh / 2, fh / 3, '#ffce00')
  flag(eu, 0.46 * hs, fy - fh / 2, fh, '#003399')
  for (let i = 0; i < 12; i++) k.circle(eu + 0.23 * hs + 0.085 * hs * Math.cos((i * Math.PI) / 6), fy + 0.085 * hs * Math.sin((i * Math.PI) / 6), 0.014 * hs, '#ffcc00')

  // The crane in its ring on the fin, white: its centre 27 % of the way from the crown line to the fin's tip and 56 % of
  // the chord back from the leading edge, 68 % of the chord across (2.91 m on the A320 family), flying forward on both
  // sides.
  const crown = keel + REF_H * hs
  const cy = crown + 0.27 * (k.a.finTip[0] - crown)
  const le = f.front(cy) + LE_STRIP * hs
  const chord = le - f.aft(cy)
  k.image(asset('liveries/DLH/crane-white.svg'), { z: le - 0.56 * chord, y: cy, w: 0.68 * chord, mirror: true })
}

export const DLH: Design = {
  code: 'DLH',
  aliases: ['CLH'],
  name: 'Lufthansa (2018 livery)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_%E2%80%98D-AIEF%E2%80%99_Lufthansa_(53696911603).jpg (Alan Wilson, CC BY-SA 2.0): left side, the measurement master',
    'https://commons.wikimedia.org/wiki/File:Hannover_Airport_Lufthansa_Airbus_A320-214(WL)_D-AIUB_(DSC06243).jpg (MarcelX42, CC BY-SA 4.0): right side, A320',
    'https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Lufthansa_Airbus_A321-271NX_D-AIEL_(DSC02633).jpg (MarcelX42, CC BY-SA 4.0): 3/4 front left, engine',
    'https://commons.wikimedia.org/wiki/File:Hannover_Airport_Lufthansa_Airbus_A321-271NX_D-AIEH_(DSC09587).jpg (MarcelX42, CC BY-SA 4.0): from above, the right Sharklet',
    'https://commons.wikimedia.org/wiki/File:D-AIEK_A321neo_Lufthansa_SCQ_01.jpg (Bene Riobó, CC BY-SA 4.0): 3/4 rear right, the blue under the tail',
    'https://commons.wikimedia.org/wiki/File:D-AIUM_at_MUC_20251011.jpg (VynedJ, CC BY 4.0): 3/4 rear left, A320',
    'https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_10340,_D-AIEJ)_2024-10-11_Andre_Gerwing_Collection_ID_022219.jpg (André Gerwing, CC BY-SA 4.0): the white belly',
    'https://commons.wikimedia.org/wiki/File:Lufthansa,_D-AIRH,_Airbus_A321-131_(53760932060).jpg (Anna Zvereva, CC BY-SA 2.0): the second yellow panel of the A321ceo',
    'https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018.svg (PD-textlogo): the title',
    'https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018_crane.svg (PD-textlogo): the crane',
    'liveries/DLH/README.md',
  ],
  base: WHITE,
  wing: WING,
  stab: STAB,
  engineColor: WHITE,
  wingletColor: WHITE,
  side,

  engine(k) {
    // White cowls with no marking, a bare-metal inlet lip (the front 0.15 m), the dark core nozzle and plug at the back
    // below the pylon.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const zc = zMax - 0.685 * (zMax - zMin) // where the fan cowl and the reverser end
    const yp = yMin + 0.67 * (yMax - yMin) // the pylon above
    k.fill(WHITE)
    k.poly([[zc, yMin - 1], [zc, yp], [zMin - 1, yp], [zMin - 1, yMin - 1]], METAL)
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - 0.15, yMax + 1], [zMax - 0.15, yMin - 1]], LIP)
  },

  winglet(k) {
    // The Sharklet's side box (a21n: z -5.45 … -3.13, y -2.31 … 0.11). White on both faces from the knee to the tip, a
    // light grey band along the leading edge (a fifth of the chord), a blue crane roundel 0.5 m across on the blade's
    // lower part: 0.66 m above the bottom of the knee, 41 % of the chord back, on both faces, flying forward.
    // The mesh: the knee is the lowest 0.4 m; the leading edge is 0.3 m aft of zMax at the top of the knee and swept
    // 0.775 m aft per metre up; the chord is 1.0 m there and 0.47 m at the tip.
    const [, zMax, yMin, yMax] = k.a.box
    const knee = yMin + 0.4
    const le = (y: number): number => zMax - 0.3 - 0.775 * (y - knee)
    const chord = (y: number): number => Math.max(0.3, 1.0 - ((1.0 - 0.47) * (y - knee)) / (yMax - knee))
    k.fill(WHITE)
    k.poly([[le(knee) + 1, knee], [le(yMax + 1) + 1, yMax + 1], [le(yMax + 1) - 0.2 * chord(yMax + 1), yMax + 1], [le(knee) - 0.2 * chord(knee), knee]], BAND)
    const ry = yMin + 0.66
    k.image(asset('liveries/DLH/crane-blue.svg'), { z: le(ry) - 0.41 * chord(ry), y: ry, w: 0.5, mirror: true })
  },
}

export default DLH
