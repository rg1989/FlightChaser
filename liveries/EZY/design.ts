// liveries/EZY/design.ts
// easyJet (EZY; easyJet Europe EJU and easyJet Switzerland EZS wear the same paint), the 2015 livery on the A319, A320,
// A320neo and A321neo: a white aircraft, an orange cap over the cockpit windows that widens aft into a long wedge with
// the white "easyJet" title on it and runs out as a thin dart low behind the wing, a straight diagonal cut near the
// rear door to an all-round orange tail band, a white tail cone, an all-orange fin with a large white "easyJet" along
// its leading edge, orange engines with bare-metal lips, orange Sharklets with a grey leading-edge band.
// Measurements: liveries/EZY/README.md (the dossier: d metres aft of the nose, h above the keel of the 4.14 m fuselage,
// on the 37.57 m A320neo), from the side-on photos G-UZLS (left) and G-UZHT (right).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// The orange: the sunlit paint in the photos (hue 18–19°; Pantone 021 C by easyJet's brand manual), a little more
// saturated than the median because the model's lighting greys it. It is one paint everywhere.
const ORANGE = '#f4540e'
const WHITE = '#f5f5f5'
const GREY = '#d2d5d9' // wings, tailplane, pylons, the Sharklet's knee
const BAND = '#a9acb0' // the grey band on the Sharklet's leading edge
const LIP = '#c9c6c3' // bare-metal inlet lip
const METAL = '#4a4d52' // exhaust, core cowl, APU nozzle
const GLASS = '#16181c' // the cockpit windows
const OUTLINE = '#c2c6ca' // door outlines on the white

const REF_H = 4.14 // the real fuselage's height
const WIN_H = 2.69 // its window row's centre above the keel
const DOOR1 = 4.98 // door 1's centre, metres aft of the nose
const REAR = 7.97 // the rear door's centre, metres ahead of the tail tip (the same on the A319, A320 and A321)

// The wordmark file is 397.4 × 89.1 units: the top of the "J" to the foot of the "y"; the baseline 72.5 below the top.
const WORD_H = 89.1 / 397.4 // its height over its length
const BASELINE = 72.5 / 89.1
/** The wordmark turned to lie along a leading edge: the file nearest the edge's angle is stretched the last degree. */
const TURNED = [
  { deg: 47, up: 'title-up-47.svg', down: 'title-down-47.svg' },
  { deg: 50, up: 'title-up.svg', down: 'title-down.svg' },
]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const rad = (deg: number): number => (deg * Math.PI) / 180

/**
 * The dossier's frame on this model. Heights: the keel, the window row and the crown land on the model's own. Along
 * the fuselage the nose section is fixed to door 1 and the tail section to the rear door (the model's doors, else the
 * real aircraft's stations): N(d, h) is a point d metres aft of the nose, T(t, h) one t metres ahead of the tail tip.
 */
function frame(k: Kit): { N: (d: number, h: number) => Pt; T: (t: number, h: number) => Pt; Y: (h: number) => number; hs: number } {
  const zMid = k.a.nose - 0.3 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zMid)
  const crown = k.top(zMid)
  const hs = (crown - keel) / REF_H
  const win = Math.min(crown - 0.2 * hs, Math.max(keel + 0.2 * hs, k.a.windowY))
  const Y = (h: number): number => (h <= WIN_H ? keel + ((win - keel) * h) / WIN_H : win + ((crown - win) * (h - WIN_H)) / (REF_H - WIN_H))
  const door1 = k.a.door1 > k.a.nose - 0.25 * k.a.length ? k.a.door1 : k.a.nose - DOOR1 * hs
  const last = k.a.doors[k.a.doors.length - 1]
  const rear = k.a.doors.length > 1 && last < k.a.tail + 0.35 * k.a.length ? last : k.a.tail + REAR * hs
  return { N: (d, h) => [door1 + (DOOR1 - d) * hs, Y(h)], T: (t, h) => [rear + (t - REAR) * hs, Y(h)], Y, hs }
}

/** Everything aft of the straight line through a and b (extended far past both ends), as a polygon. */
function aftOf(a: Pt, b: Pt, k: Kit): Pt[] {
  const far = 60
  const n = Math.hypot(b[0] - a[0], b[1] - a[1])
  const [ux, uy] = [(b[0] - a[0]) / n, (b[1] - a[1]) / n]
  const p0: Pt = [a[0] - ux * far, a[1] - uy * far]
  const p1: Pt = [b[0] + ux * far, b[1] + uy * far]
  const aft = k.a.tail - far
  return [p0, p1, [aft, p1[1]], [aft, p0[1]]]
}

/** A rounded rectangle [z0 aft, z1 fore] × [y0, y1] with corner radius r, as a path. */
function roundRect(z0: number, z1: number, y0: number, y1: number, r: number): Seg[] {
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

/**
 * The wordmark along a line that leans aft as it rises, `deg` from the horizontal: its centre at (z, y), `len` metres
 * long. reads 'up': the "e" at the lower end (the left side of the fin); 'down': the "e" at the upper end (the right
 * side). The tops of the letters point up and forward on both.
 */
function slanted(k: Kit, z: number, y: number, len: number, deg: number, reads: 'up' | 'down'): void {
  const f = TURNED.reduce((a, b) => (Math.abs(b.deg - deg) < Math.abs(a.deg - deg) ? b : a))
  const [t, m] = [rad(f.deg), rad(deg)]
  const hgt = len * WORD_H
  const w = ((len * Math.cos(t) + hgt * Math.sin(t)) * Math.cos(m)) / Math.cos(t)
  const h = ((len * Math.sin(t) + hgt * Math.cos(t)) * Math.sin(m)) / Math.sin(t)
  k.image(asset(`liveries/EZY/${reads === 'up' ? f.up : f.down}`), { z, y, w, h })
}

function side(k: Kit): void {
  const { N, T, Y, hs } = frame(k)
  const left = k.side === 'left'
  k.fill(WHITE)

  // The cap and the wedge, one shape with two straight edges: the lower edge level over the cockpit windows to just
  // ahead of door 1, then one line down to the tip P low behind the wing; the upper edge leaves the crown above the
  // end of the title and runs to P.
  const P = T(12.0, 0.5)
  const wedge: Pt[] = [N(-4, 3.05), N(4.2, 3.03), P, N(10.5, REF_H), N(10.5, 8), N(-4, 8)]
  k.poly(wedge, ORANGE)

  // The tail band: all-round orange aft of a straight cut that passes 0.3 m ahead of the rear door at window height
  // and meets the crown at the fin's leading edge; then the white tail cone, from a line that continues the rudder's
  // trailing edge down across the fuselage, and the dark APU nozzle.
  const cut: [Pt, Pt] = [T(11.15, 0), T(11.15 - 0.87 * REF_H, REF_H)]
  const band = aftOf(cut[0], cut[1], k)
  k.poly(band, ORANGE)
  const te0 = k.fin(1, 0)
  const te1 = k.fin(1, 1)
  const lean = (te1[0] - te0[0]) / (te1[1] - te0[1]) // the rudder's trailing edge: metres aft per metre up (negative)
  k.poly([[te0[0], te0[1]], [te0[0] - lean * 12, te0[1] - 12], [k.a.tail - 5, te0[1] - 12], [k.a.tail - 5, te0[1]]], WHITE)
  k.poly([[k.a.tail + 0.3 * hs, -99], [k.a.tail + 0.3 * hs, 99], [k.a.tail - 5, 99], [k.a.tail - 5, -99]], METAL)

  // The fin: orange with its tip and rudder, a white strip along the leading edge that widens into the white dorsal
  // fillet at its foot.
  const [fy0] = k.a.finRoot
  const [fy1] = k.a.finTip
  const hf = (y: number): number => (y - fy0) / (fy1 - fy0)
  k.poly(k.finOutline(), ORANGE)
  const foot = k.fin(0, 0)
  const crownF = k.top(foot[0]) // the crown where the fin's leading edge meets it
  k.clip('fin', () => {
    const e = k.fin(0, hf(crownF + 1.1 * hs))
    const g: Pt = [k.fin(0, hf(crownF))[0] - 1.0 * hs, crownF - 0.2]
    k.poly([g, e, [e[0] + 6, e[1]], [g[0] + 6, g[1]]], WHITE)
    k.stroke([k.fin(0, -0.2), k.fin(0, 1.2)], 0.24, WHITE)
  })

  // The cockpit windows, dark with light frames: the Airbus's windshield pane and two side panes, 0.5 m tall, the row
  // level with the cabin windows' tops (G-UZLS, G-UZHN); the aft edge on the model's measured one.
  const cz = (d: number): number => k.a.cockpit + (3.2 - d) * hs
  const pane = (pts: Array<[number, number]>): Pt[] => pts.map(([d, h]): Pt => [cz(d), Y(h)])
  k.poly(pane([[1.42, 2.6], [1.58, 2.82], [1.86, 2.93], [2.22, 2.96], [2.84, 2.96], [3.1, 2.92], [3.2, 2.8], [3.21, 2.56], [3.14, 2.5], [2.2, 2.48], [1.66, 2.51]]), GLASS)
  for (const d of [2.26, 2.72]) k.stroke([[cz(d), Y(2.45)], [cz(d), Y(3.0)]], 0.07, OUTLINE)

  // Door and over-wing exit outlines: grey on the white, white on the orange. Two exits a side on every type; on the
  // A321neo they sit further aft over the wing.
  const exits = k.a.wingLe - (k.model.startsWith('a21') ? 0.7 : 1.86) * hs
  const outlines = (color: string): void => {
    k.a.doors.forEach((zc, i) => {
      const [h0, h1] = i === 0 ? [1.72, 3.62] : [1.78, 3.62]
      k.stroke(roundRect(zc - 0.45 * hs, zc + 0.45 * hs, Y(h0), Y(h1), 0.12), 0.04, color)
    })
    for (const c of [0.42, -0.42]) k.stroke(roundRect(exits + (c - 0.34) * hs, exits + (c + 0.34) * hs, Y(1.92), Y(3.2), 0.1), 0.04, color)
  }
  outlines(OUTLINE)
  k.clip(wedge, () => outlines(WHITE))
  k.clip(band, () => outlines(WHITE))

  // The title on the wedge above the windows, from 0.45 m aft of door 1: 5.35 m long; side-on the crown's curve shows
  // it 0.97 m high (the top of the "J" to the foot of the "y", which hangs between two windows). It reads correctly
  // on both sides: the "e" nearest the nose on the left, at the aft end on the right.
  const [tz] = N((5.95 + 11.3) / 2, 0)
  k.image(asset('liveries/EZY/title.svg'), { z: tz, y: (Y(2.73) + Y(3.7)) / 2, w: 5.35 * hs, h: Y(3.7) - Y(2.73) })

  // The fin title along the leading edge, the letters' tops towards it: upwards on the left side ("e" at the root),
  // downwards on the right ("e" at the tip). On the aircraft it is 6.25 m long, its top 0.3 m behind the leading edge,
  // from 0.55 m above the crown to 0.5 m below the tip. Here it spans the model's fin the same way, then shrinks until
  // the foot of the "t" (at the upper end, on the baseline) is clear of the trailing edge.
  const le0 = k.fin(0, 0)
  const le1 = k.fin(0, 1)
  const a = Math.atan2(le1[1] - le0[1], le0[0] - le1[0]) // the leading edge's angle from the horizontal
  const [ca, sa] = [Math.cos(a), Math.sin(a)]
  const yLo = crownF + 0.5 * hs
  let len = (fy1 - 0.5 * hs - yLo) / sa
  let mid: Pt = [0, 0]
  for (let i = 0; i < 60; i++) {
    const c = 0.16 * len // the middle line's distance behind the leading edge
    const start = k.fin(0, hf(yLo + c * ca)) // the leading edge beside the lower end
    const m0: Pt = [start[0] - c * sa, yLo]
    mid = [m0[0] - (len / 2) * ca, m0[1] + (len / 2) * sa]
    const drop = (BASELINE - 0.5) * WORD_H * len // the baseline below the middle line
    const tFoot: Pt = [m0[0] - 0.97 * len * ca - drop * sa, m0[1] + 0.97 * len * sa - drop * ca]
    const te = lerp(te0[0], te1[0], hf(tFoot[1]))
    if (tFoot[0] - te >= 0.22 * hs || len < 2) break
    len *= 0.98
  }
  slanted(k, mid[0], mid[1], len, (a * 180) / Math.PI, left ? 'up' : 'down')
}

export const EZY: Design = {
  code: 'EZY',
  aliases: ['EJU', 'EZS'],
  name: 'easyJet, 2015 livery',
  sources: [
    'https://commons.wikimedia.org/wiki/File:G-UZLS_@_STN,_2024-06-22.jpg (Steve Knight, CC BY 2.0): left side',
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-251N_(c-n_8662,_G-UZHT)_2026-01-19_Andre_Gerwing_Collection_ID_027759.jpg (André Gerwing, CC BY-SA 4.0): right side',
    'https://commons.wikimedia.org/wiki/File:Easyjet_A320-251N_G-UZLT.jpg (Zima Savolainen-Schtakleff, CC BY-SA 4.0): left side, fin, Sharklet outer face',
    'https://commons.wikimedia.org/wiki/File:G-UZMG_easyJet_A21N_EGCC.jpg (Oscaracton, CC BY 4.0): A321neo, right fin',
    'https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_6257,_OE-IWW)_2026-10-07_Andre_Gerwing_Collection_ID_031374.jpg (André Gerwing, CC BY-SA 4.0): A320, CFM56 nacelle',
    'https://commons.wikimedia.org/wiki/File:(GBR-Greater_Manchester)_EasyJet_Airbus_A320-251N_G-UZEF_@_EGCC_2025-06-09.jpg (S5A-0043, CC BY 4.0): the cap and the crown',
    'https://commons.wikimedia.org/wiki/File:Airbus_A319-111_(c-n_4129,_OE-LQW)_2026-06-10_Andre_Gerwing_Collection_ID_029643.jpg (André Gerwing, CC BY-SA 4.0): from below',
    'https://commons.wikimedia.org/wiki/File:Slats_and_winglet,_%C3%89piais-l%C3%A8s-Louvres_(SIAE2200)_(cropped).jpg (Matti Blume, CC BY-SA 4.0): Sharklet inner face',
    'https://commons.wikimedia.org/wiki/File:EasyJet_logo.svg (PD-textlogo): the wordmark',
  ],
  base: WHITE,
  wing: GREY,
  stab: GREY,
  engineColor: ORANGE,
  wingletColor: ORANGE,
  side,

  engine(k) {
    // Orange all round with a bare-metal inlet lip; the core cowl, nozzle and plug dark metal; the pylon light grey.
    // No title. The nacelle's side box: the lip at zMax; the fan cowl and reverser end 3.75 m aft of it.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const zc = zMax - 3.75
    const yc = yMin + 1.27 // the nacelle's axis
    const lip = /^a\d\dn$/.test(k.model) ? 0.4 : 0.3 // the ring seen from the front: thicker than the side view shows
    k.fill(ORANGE)
    k.poly([[zc, yMin - 1], [zc, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yMin - 1]], METAL)
    k.poly([[zMax - 1.9, yc + 1.33], [zMax - 1.9, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yc + 0.7], [zc, yc + 0.7], [zc, yc + 1.33]], GREY)
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - lip, yMax + 1], [zMax - lip, yMin - 1]], LIP)
  },

  winglet(k) {
    // The Sharklet's side box: the knee (its lowest 0.4 m) wing grey, the blade orange on both faces with a grey band
    // along the leading edge, a third of the chord at the knee and a quarter at the tip. The mesh: the leading edge
    // 0.3 m aft of zMax at the top of the knee, swept 0.775 m aft per metre up; the chord 1.0 m there, 0.47 m at the tip.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const knee = yMin + 0.4
    const le = (y: number): number => zMax - 0.3 - 0.775 * (y - knee)
    const chord = (y: number): number => Math.max(0.3, 1.0 - ((1.0 - 0.47) * (y - knee)) / (yMax - knee))
    const band = (y: number): number => chord(y) * lerp(1 / 3, 1 / 4, (y - knee) / (yMax - knee))
    k.fill(ORANGE)
    k.poly([[le(yMin - 1) + 1, yMin - 1], [le(yMax + 1) + 1, yMax + 1], [le(yMax + 1) - band(yMax + 1), yMax + 1], [le(yMin - 1) - band(yMin - 1), yMin - 1]], BAND)
    k.poly([[zMin - 1, yMin - 1], [zMax + 1, yMin - 1], [zMax + 1, knee], [zMin - 1, knee]], GREY)
    if (k.side === 'right') {
      // The tip atlas's "left" half paints both outer faces (plain), its "right" half both inner faces: the white
      // wordmark along the blade, the letters' tops to the leading edge, the "e" at the tip (the left Sharklet).
      // ponytail: one half paints both inner faces, so the right Sharklet shows the left one's wordmark mirrored (on
      // the aircraft its "t" is at the tip); a readable wordmark on both needs a third tip-atlas region.
      const y = lerp(knee, yMax, 0.5)
      const deg = (Math.atan2(1, 0.775) * 180) / Math.PI
      slanted(k, le(y) - 0.64 * chord(y), y, 1.45, deg, 'down')
    }
  },
}

export default EZY
