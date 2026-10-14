// liveries/SWR/design.ts
// Swiss International Air Lines (SWR), the livery in use since January 2012: an all-white aircraft, the red SWISS
// wordmark across the window row of the forward fuselage, a red fin with the white Swiss cross between a white foot
// band and a white cap, plain white engines, and a red band with a small cross on the Sharklets and winglets.
// Dossier: liveries/SWR/README.md (every size below is from its tables, measured on the reference photos in
// data/livery-refs/SWR/, which git ignores).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt } from '../../client/livery/kit.ts'

const RED = '#dc1f26' // title, fin, wingtip bands: the median of the sunlit photos
const WHITE = '#f5f6f5'
const GREY = '#bcc1c6' // wings and tailplane
const LIP = '#d0cecb' // bare-metal inlet lip
const METAL = '#5f5a57' // exhaust nozzle and plug, APU exhaust
const STRIP = '#a5a1a1' // the Sharklet's leading-edge strip
const GLASS = '#16181c' // the cockpit windows
const STAR = '#6b6f78' // the Star Alliance star's outline

/** One type family's sizes on the real aircraft, in metres (dossier sections 4.2 and 4.3). */
interface Spec {
  bodyH: number // fuselage height
  len: number // the title's length in side elevation
  h: number // its height in side elevation (the S, top to bottom)
  up: number // its middle above the window row
  gap: number // from door 1's centre aft to the title's forward end
  between: boolean // the title is centred between door 1 and door 2 instead
  finH: number // the fin tip above the crown under the fin
  foot: number // the white foot band's height
  cap: number // the white cap's height
  cross: number // the cross's span over the red field's height
  drop: number // the cross's centre below the red field's mid-height
  apu: boolean // a round APU exhaust at the tail cone's tip (Airbus)
}

const A320: Spec = { bodyH: 4.14, len: 5.85, h: 1.28, up: 0.03, gap: 1.085, between: false, finH: 5.82, foot: 0.72, cap: 0.93, cross: 0.62, drop: 0, apu: true }
const A220: Spec = { bodyH: 3.7, len: 5.97, h: 1.4, up: 0.03, gap: 1.01, between: false, finH: 6.1, foot: 0.98, cap: 0.91, cross: 0.6, drop: 0, apu: false }
const A330: Spec = { bodyH: 5.64, len: 9.95, h: 2.24, up: -0.02, gap: 0.98, between: true, finH: 8.5, foot: 1.08, cap: 1.03, cross: 0.61, drop: 0, apu: true }
const B777: Spec = { bodyH: 6.2, len: 11.4, h: 2.57, up: -0.055, gap: 1.255, between: false, finH: 9.5, foot: 0.82, cap: 1.08, cross: 0.53, drop: 0.26, apu: false }

/** The sizes for a model: its own type family's, else the nearer of the narrow and the wide Airbus by fuselage height. */
function specOf(k: Kit, bodyH: number): Spec {
  const m = k.model
  if (/^a(31[89]|32[01]|19n|20n|21n)/.test(m)) return A320
  if (/^bcs[13]/.test(m)) return A220
  if (/^a3[34]/.test(m)) return A330
  if (/^b77/.test(m)) return B777
  return bodyH < 4.9 ? A320 : A330
}

const rect = (zFore: number, zAft: number, y0: number, y1: number): Pt[] => [[zFore, y0], [zFore, y1], [zAft, y1], [zAft, y0]]

function side(k: Kit): void {
  const zMid = k.a.nose - 0.3 * k.a.length // the constant section, ahead of the wing
  const bodyH = k.top(zMid) - k.bottom(zMid)
  const spec = specOf(k, bodyH)
  const q = bodyH / spec.bodyH // this model's size against the real aircraft

  k.fill(WHITE) // all round: no belly colour, no cheatline

  // The cockpit windows, dark (the mesh's glass takes the atlas like the skin): the Airbus outline, its aft edge on the
  // model's measured one (D-AIEF: 1.2 ... 3.0 m aft of the nose, 2.3 ... 3.1 m above the keel on the A320). On a larger
  // fuselage the windows grow less than the fuselage does, from the same top line.
  const keel = k.bottom(zMid)
  const hs = bodyH / 4.14
  const gs = Math.min(hs, 1.2)
  const glass: Pt[] = [[1.2, 2.43], [1.35, 2.72], [1.62, 2.98], [2.0, 3.07], [2.7, 3.05], [2.93, 2.96], [3.03, 2.8], [3.04, 2.5], [2.98, 2.36], [2.0, 2.32], [1.4, 2.34]]
  k.poly(glass.map(([d, h]): Pt => [k.a.cockpit + (3.02 - d) * gs, keel + 3.07 * hs - (3.07 - h) * gs]), GLASS)

  // The fin. A red field between two level lines, from the leading-edge strip to past the rudder; the foot band and
  // the cap stay white. The bands keep their share of the fin's height above the crown under it.
  const [ry, rle, rte] = k.a.finRoot
  const [ty, tle, tte] = k.a.finTip
  const le = (y: number): number => rle + ((tle - rle) * (y - ry)) / (ty - ry)
  const te = (y: number): number => rte + ((tte - rte) * (y - ry)) / (ty - ry)
  const crown = k.top((rle + rte) / 2)
  const f = (ty - crown) / spec.finH
  const y0 = crown + spec.foot * f
  const y1 = ty - spec.cap * f
  const strip = 0.15 * q // the unpainted leading-edge strip, along the fuselage axis
  const aft = Math.min(k.a.tail, tte) - 3
  k.poly([[le(y0) - strip, y0], [le(y1) - strip, y1], [aft, y1], [aft, y0]], RED)

  // The cross: upright, level with the fuselage axis, bars 0.30 of its span; a little aft of the middle of the chord.
  const yc = (y0 + y1) / 2 - spec.drop * f
  const chord = le(yc) - te(yc)
  const zc = le(yc) - 0.54 * chord
  const span = Math.min(spec.cross * (y1 - y0), 0.71 * chord)
  const bar = 0.3 * span
  k.poly(rect(zc + span / 2, zc - span / 2, yc - bar / 2, yc + bar / 2), WHITE)
  k.poly(rect(zc + bar / 2, zc - bar / 2, yc - span / 2, yc + span / 2), WHITE)

  // The APU exhaust at the tip of the tail cone: bare dark metal.
  if (spec.apu) {
    const zt = k.a.tail + 0.3 * q
    k.poly(rect(zt, k.a.tail - 2, k.bottom(zt) - 0.3, k.top(zt) + 0.1), METAL)
  }

  // The Star Alliance star between the cockpit windows and door 1, level with the window row: a thin grey outline.
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 2.2 * q
  const sz = door1 + 0.5 * q + 0.6 * q
  const sy = k.a.windowY + 0.1 * q
  const star: Pt[] = Array.from({ length: 11 }, (_, i): Pt => {
    const r = (i % 2 === 0 ? 0.2 : 0.085) * q
    const a = Math.PI / 2 + (i * Math.PI) / 5
    return [sz + r * Math.cos(a), sy + r * Math.sin(a)]
  })
  if (sz < k.a.cockpit - 0.3) k.stroke(star, 0.03 * q, STAR)

  // The title: the wordmark stretched to its box in side elevation (the fuselage's curve makes it lower than on the
  // skin), its middle on the window row, its forward end just aft of door 1. It reads SWISS on both sides.
  const front = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.cockpit - 2.2 * q
  const door2 = k.a.doors.find((z) => z < front - 4 * q)
  const len = spec.len * q
  const zTitle = spec.between && door2 !== undefined ? (front + door2) / 2 : front - spec.gap * q - len / 2
  k.image(asset('liveries/SWR/title.svg'), { z: zTitle, y: k.a.windowY + spec.up * q, w: len, h: spec.h * q })
}

export const SWR: Design = {
  code: 'SWR',
  name: 'Swiss International Air Lines (2012 livery)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_603,_HB-IJL)_2026-10-07_Andre_Gerwing_Collection_ID_031364.jpg (André Gerwing, CC BY-SA 4.0): A320, left side',
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_603,_HB-IJL)_2026-10-07_Andre_Gerwing_Collection_ID_031451.jpg (André Gerwing, CC BY-SA 4.0): A320, right side',
    'https://commons.wikimedia.org/wiki/File:Swiss,_HB-JDG,_Airbus_A320-271N_(53814593972).jpg (Anna Zvereva, CC BY-SA 2.0): A320neo, right side, the scale master',
    'https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC01042).jpg (MarcelX42, CC BY-SA 4.0): colours, fin, engine, Sharklet',
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_12470,_HB-JDJ)_2026-10-07_Andre_Gerwing_Collection_ID_031346.jpg (André Gerwing, CC BY-SA 4.0): Sharklet, both faces',
    'https://commons.wikimedia.org/wiki/File:20260418-DSC_9088-2.jpg (James E Selby, CC BY-SA 4.0): 777-300ER, right side, the scale master',
    'https://commons.wikimedia.org/wiki/File:Boeing_777-3DEER_(c-n_62753,_HB-JNH)_2026-10-07_Andre_Gerwing_Collection_ID_031379.jpg (André Gerwing, CC BY-SA 4.0): 777-300ER, left side, engine',
    'https://commons.wikimedia.org/wiki/File:20260418-DSC_8949.jpg (James E Selby, CC BY-SA 4.0): A330-300, right side',
    'https://commons.wikimedia.org/wiki/File:HB-JHL_A330-300,_Swiss,_Miami_02-20-26_(55148200434).jpg (DUNCAN KIRK, CC BY 4.0): A330-300, left side, winglet',
    'https://commons.wikimedia.org/wiki/File:Bombardier_BD-500-1A11_-_CS300_(c-n_55025,_HB-JCJ)_2026-10-07_Andre_Gerwing_Collection_ID_031360.jpg (André Gerwing, CC BY-SA 4.0): A220-300, left side',
    'https://commons.wikimedia.org/wiki/File:Swiss_new.svg (PD-textlogo): the title',
  ],
  base: WHITE,
  wing: GREY,
  stab: GREY,
  engineColor: WHITE,
  wingletColor: WHITE,
  side,

  engine(k) {
    // Plain white cowls with no title: a bare-metal inlet lip, the dark nozzle and plug at the back.
    const [z0, z1, y0, y1] = k.a.box
    const len = z1 - z0
    k.fill(WHITE)
    k.poly(rect(z0 + 0.18 * len, z0 - 1, -99, y0 + 0.67 * (y1 - y0)), METAL) // below the pylon only
    k.poly(rect(z1 + 1, z1 - 0.035 * len, -99, 99), LIP)
  },

  winglet(k) {
    // Sharklets and winglets, both faces alike: white, a red band between two level lines with a white cross in it.
    // The band's share of the device's height: Sharklet 32 % to 63 %, A220 winglet 32 % to 80 %, A330 winglet 20 % to 85 %.
    const [z0, z1, y0, y1] = k.a.box
    const H = y1 - y0
    const m = k.model
    const [b0, b1] = /^bcs/.test(m) ? [0.32, 0.8] : /^a3[34]/.test(m) ? [0.2, 0.85] : [0.32, 0.63]
    const [ya, yb] = [y0 + b0 * H, y0 + b1 * H]
    k.fill(WHITE)
    k.poly(rect(z1 + 2, z0 - 2, ya, yb), RED)
    // The blade's leading edge and chord at the band's height. The Airbus Sharklet mesh: the leading edge 0.3 m aft of
    // the box's front at the top of the knee (0.4 m up), swept 0.775 m aft per metre up; the chord 1.0 m there and
    // 0.47 m at the tip. Other devices (the A220 and A330 winglets): a line from the box's front at its foot, 0.66 of its
    // length aft at its top, and a chord of 0.55 of its length (measured on the lab's winglet views).
    const sharklet = /^a(19n|20n|21n|32[01])/.test(m)
    const yc = (ya + yb) / 2
    const knee = y0 + 0.4
    const leAt = (y: number): number => (sharklet ? z1 - 0.3 - 0.775 * (y - knee) : z1 - (0.66 * (z1 - z0) * (y - y0)) / H)
    const chordAt = (y: number): number => (sharklet ? Math.max(0.3, 1.0 - (0.53 * (y - knee)) / (y1 - knee)) : 0.55 * (z1 - z0))
    const edge = sharklet ? 0.2 : 0
    if (sharklet) {
      // the grey leading-edge strip, a fifth of the chord, over the band's forward end
      k.poly([[leAt(y0 - 1) + 1, y0 - 1], [leAt(y1 + 1) + 1, y1 + 1], [leAt(y1 + 1) - edge * chordAt(y1 + 1), y1 + 1],
        [leAt(y0 - 1) - edge * chordAt(y0 - 1), y0 - 1]], STRIP)
    }
    const zc = leAt(yc) - (edge + (1 - edge) / 2) * chordAt(yc)
    const span = Math.min(0.6 * (yb - ya), 0.6 * (1 - edge) * chordAt(yc))
    const bar = 0.3 * span
    k.poly(rect(zc + span / 2, zc - span / 2, yc - bar / 2, yc + bar / 2), WHITE)
    k.poly(rect(zc + bar / 2, zc - bar / 2, yc - span / 2, yc + span / 2), WHITE)
  },
}

export default SWR
