// liveries/UAL/design.ts
// United Airlines (UAL; Air Wisconsin ASH, CommuteAir UCA and GoJets GJS fly United Express in the same paint), the
// 2019 scheme: a white aircraft with a grey belly, a thin dark-blue swoop along the lower fuselage, "UNITED" in blue
// capitals through the window row, a blue fin with a sky-blue globe and a fade to sky blue at the tip, blue engines
// with a bare-metal lip, blue wingtip devices. Dossier: liveries/UAL/README.md (positions are metres aft of the nose,
// h above the keel, measured on a 737 MAX 8 and checked on the 737-800, A320, 777 and 787).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt } from '../../client/livery/kit.ts'

const WHITE = '#f5f5f3'
const BLUE = '#1a49a8' // United Blue: title, engines, wingtips, the globe's ground
const SKY = '#8bcdf5' // Sky Blue (photo median #80c4f0, a little lighter: the model's fin renders about 15 % darker than the photos)
const SWOOP = '#0e1b4d' // Rhapsody Blue: the pinstripe
const GREY = '#c4c5c4' // Runway Gray: the belly
const LIP = '#b4b5b9' // bare-metal inlet lip
const EXHAUST = '#8a8680' // bare-metal exhaust and chevrons
const CONE = '#807c78' // the APU cone
const WING = '#b9bdc1'
const FADE_DARK = '#1a3d92' // (the dossier's #123376 lightened: the model's fin renders about 15 % darker than the photos)

// ---------------------------------------------------------------------------------------------------------------------
// small helpers

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}

const rgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
const hex = (v: [number, number, number]): string => '#' + v.map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('')
/** A colour along a ramp of [position, colour] stops. */
function ramp(stops: Array<[number, string]>, s: number): string {
  if (s <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (s <= stops[i][0]) {
      const t = (s - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])
      const a = rgb(stops[i - 1][1])
      const b = rgb(stops[i][1])
      return hex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)])
    }
  }
  return stops[stops.length - 1][1]
}

/** A monotone cubic through the points (x rising): no overshoot between them. */
function mono(pts: Array<[number, number]>): (x: number) => number {
  const n = pts.length
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0])
  const sl = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i])
  const m = pts.map((_, i) => (i === 0 ? sl[0] : i === n - 1 ? sl[n - 2] : sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2))
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1] + m[0] * (x - pts[0][0])
    if (x >= pts[n - 1][0]) return pts[n - 1][1]
    let i = 0
    while (x > pts[i + 1][0]) i++
    const t = (x - pts[i][0]) / dx[i]
    const [t2, t3] = [t * t, t * t * t]
    return (2 * t3 - 3 * t2 + 1) * pts[i][1] + (t3 - 2 * t2 + t) * dx[i] * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1][1] + (t3 - t2) * dx[i] * m[i + 1]
  }
}

/** The fuselage height at the constant section, and whether this is a wide-body (777, 787, 767 and up). */
function bodyHeight(k: Kit): number {
  const z = k.a.nose - 0.3 * k.a.length
  return k.top(z) - k.bottom(z)
}
const isWide = (k: Kit): boolean => bodyHeight(k) > 4.7

// ---------------------------------------------------------------------------------------------------------------------
// the swoop and the belly

/** The swoop's centre on the 737 MAX 8 master: [metres aft of the nose, metres above the keel] (dossier 4.1). */
const SWOOP_MASTER: Array<[number, number]> = [
  [1.9, 0.57], [2.6, 0.73], [3.2, 0.87], [4.1, 1.05], [4.75, 1.14], [6.05, 1.3], [7.3, 1.39], [8.6, 1.45], [10, 1.47], [12.5, 1.47],
  [16, 1.38], [19.5, 1.12], [22.9, 0.94], [24.2, 0.94], [25.5, 1.0], [26.8, 1.13], [28.1, 1.3], [29.4, 1.49], [30.1, 1.62],
  [31.4, 1.89], [32.7, 2.21], [34.0, 2.57], [35.0, 2.88], [35.85, 3.06],
]
const MASTER_ANCHORS = [0, 8.6, 12.5, 22.9, 35.85] // nose, end of the climb out of the belly, wing root, lowest point, tailplane root
const swoopH = mono(SWOOP_MASTER)

/**
 * The swoop on this model: the centre's height y(z) and the belly line (the grey's upper edge) under it. The forward
 * part is placed from the nose, the dip from the wing root's trailing edge, the end from the tailplane root: the
 * landmarks, not one model's numbers.
 */
function swoopOf(k: Kit): { y: (z: number) => number; grey: (z: number) => number; dEnd: number } {
  const nose = k.a.nose
  const wide = isWide(k)
  const hs = wide ? 1.15 : 1 // the 777 and 787 fuselages are bigger: the same swoop, 15 % higher above the keel
  const keel = k.bottom(nose - 12)
  const dFwd = Math.max(10, nose - k.a.wingLe - 2.5)
  const dLow = Math.max(dFwd + 3, nose - k.a.wingTe + 2.3)
  const stab = k.p.stab
  const dEnd = Math.max(dLow + 4, stab ? nose - stab[1] : k.a.length * 0.93)
  const anchors = [0, 8.6, dFwd, dLow, dEnd]
  // model d → master d, piecewise linear between the anchors
  const toMaster = (d: number): number => {
    for (let i = 1; i < anchors.length; i++) {
      if (d <= anchors[i] || i === anchors.length - 1) {
        const t = (d - anchors[i - 1]) / (anchors[i] - anchors[i - 1])
        return lerp(MASTER_ANCHORS[i - 1], MASTER_ANCHORS[i], t)
      }
    }
    return d
  }
  const zEnd = nose - dEnd
  const fEnd = 0.53 // the swoop ends at 0.53 of the local fuselage height at the tailplane root
  const corr = k.at(zEnd, fEnd) - (keel + hs * swoopH(35.85))
  const y = (z: number): number => {
    const d = nose - z
    const dm = toMaster(d)
    let v = keel + hs * swoopH(dm)
    if (d > dLow) v += corr * smooth(((d - dLow) / (dEnd - dLow)) ** 1.5)
    if (d >= dEnd) v = k.at(z, fEnd) // beyond the end the belly line keeps its fraction
    // ahead of the climb out of the belly the line hugs the keel (the U under the nose)
    if (d < 4) v = Math.max(v, k.bottom(z) + 0.12)
    return v
  }
  const gap = (d: number): number => lerp(0.05, 0.29, smooth((d - 3.2) / 3.3)) * (d > dLow ? lerp(1, 0.75, smooth((d - dLow) / 6)) : 1)
  const grey = (z: number): number => (nose - z >= dEnd ? k.at(z, fEnd) : y(z) - gap(nose - z))
  return { y, grey, dEnd }
}

// ---------------------------------------------------------------------------------------------------------------------
// the fin: a globe

// The 737 MAX 8 master's fin (dossier 4.4), in metres aft of the nose and above the crown: the leading and trailing edge
// at the crown and at the tip. The art is drawn in this frame and mapped onto the model's fin by (u, v).
const FIN_H = 6.6
const LE = [30.8, 36.6]
const TE = [36.1, 37.8]
function finPt(k: Kit, x: number, h: number): Pt {
  const v = h / FIN_H
  const le = lerp(LE[0], LE[1], v)
  const te = lerp(TE[0], TE[1], v)
  return k.fin((x - le) / (te - le), v)
}

type V3 = [number, number, number]
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

const GLOBE_C: Pt = [33.31, 0.99] // the disc's centre in the fin frame: u 0.35, v 0.15
const GLOBE_R = 3.4 // its radius: 0.51 of the fin's height
const GLOBE_POLE: [number, number] = [0.2, 0.776] // where the pole stands on the disc, in radii: on the leading edge at v 0.55
const BAND_STEP = 19 // degrees of longitude from one sky band to the next
const BAND_WIDTH = 12 // degrees of longitude one sky band covers (the sky is a little over half of each pitch, N76519)
const RINGS = [17, 34, 51] // the three blue rings, as degrees from the pole (0.7, 1.6 and 2.7 m straight below it)

function drawFin(k: Kit): void {
  const P = (x: number, h: number): Pt => finPt(k, x, h)
  const [cx, cy] = GLOBE_C
  const R = GLOBE_R
  const nz = Math.sqrt(1 - GLOBE_POLE[0] ** 2 - GLOBE_POLE[1] ** 2)
  const N: V3 = [GLOBE_POLE[0], GLOBE_POLE[1], nz]
  const up = Math.hypot(N[0], N[1])
  // λ 0: the meridian that runs straight down the screen from the pole
  const u0: V3 = [-nz * N[0] / up, -nz * N[1] / up, up]
  const u90 = cross(N, u0)
  const at = (theta: number, lam: number): V3 => {
    const [c, s] = [Math.cos(theta), Math.sin(theta)]
    const [cl, sl] = [Math.cos(lam), Math.sin(lam)]
    return [c * N[0] + s * (cl * u0[0] + sl * u90[0]), c * N[1] + s * (cl * u0[1] + sl * u90[1]), c * N[2] + s * (cl * u0[2] + sl * u90[2])]
  }
  const toFin = (p: V3): Pt => P(cx + R * p[0], cy + R * p[1])
  const rad = Math.PI / 180
  /** The meridian's last visible colatitude (where it passes behind the limb). */
  const limit = (lam: number): number => {
    let th = 0
    while (th < Math.PI && at(th, lam)[2] > 0) th += 0.5 * rad
    return th - 0.25 * rad
  }
  /** Visible runs of a circle of latitude, as point lists in fin frame. */
  const ring = (theta: number): Pt[][] => {
    const runs: Pt[][] = []
    let run: Pt[] = []
    for (let a = 0; a <= 360; a += 2) {
      const p = at(theta, a * rad)
      if (p[2] > 0) run.push(toFin(p))
      else if (run.length) { runs.push(run); run = [] }
    }
    if (run.length) runs.push(run)
    return runs
  }

  // the clip is the fin's measured outline, which follows the crown below it (no paint on the fuselage), cut at its leading-edge
  // line (the dorsal fairing ahead of it stays white)
  k.clip(k.finOutline(), () => {
    // keep the dorsal fairing (ahead of the leading-edge line) and everything below the root white
    k.clip([k.fin(0, -0.1), k.fin(0, 1.05), k.fin(1.02, 1.05), k.fin(1.02, -0.1)], () => {
      // the fade above the globe: concentric rings about the disc's centre, dark at the arc, sky at the tip
      const fade: Array<[number, string]> = [[1.0, FADE_DARK], [1.45, '#2759bb'], [1.75, '#4a85d0'], [2.0, '#7cb8e8'], [2.2, '#93cdf2']]
      k.fill(ramp(fade, 2.3))
      for (let s = 2.3; s >= 1.0; s -= 0.015) {
        const pts: Pt[] = []
        for (let a = 0; a < 360; a += 5) pts.push(P(cx + R * s * Math.cos(a * rad), cy + R * s * Math.sin(a * rad)))
        k.poly(pts, ramp(fade, s))
      }
      // the globe: a blue disc with sky bands from the pole, three blue rings, a sky rim
      const disc: Pt[] = []
      for (let a = 0; a < 360; a += 4) disc.push(P(cx + R * Math.cos(a * rad), cy + R * Math.sin(a * rad)))
      k.poly(disc, BLUE)
      for (let a = -140; a < 200; a += BAND_STEP) {
        const l0 = a * rad
        const l1 = (a + BAND_WIDTH) * rad
        const edge = (lam: number): Pt[] => {
          const out: Pt[] = []
          const m = limit(lam)
          for (let i = 0; i <= 40; i++) out.push(toFin(at((m * i) / 40, lam)))
          return out
        }
        const rim: Pt[] = []
        const m0 = limit(l0)
        const m1 = limit(l1)
        for (let i = 0; i <= 6; i++) {
          const lam = lerp(l0, l1, i / 6)
          rim.push(toFin(at(lerp(m0, m1, i / 6), lam)))
        }
        k.poly([...edge(l0), ...rim, ...edge(l1).reverse()], SKY)
      }
      // the rim: a sky ring just inside the arc and a thin blue line inside it
      const circle = (r: number): Pt[] => {
        const pts: Pt[] = []
        for (let a = 0; a <= 360; a += 4) pts.push(P(cx + r * Math.cos(a * rad), cy + r * Math.sin(a * rad)))
        return pts
      }
      k.stroke(circle(R - 0.17), 0.34, SKY)
      k.stroke(circle(R - 0.5), 0.12, BLUE)
      // the rings: blue, each with a thin sky line on its outer side
      for (const deg of RINGS) {
        for (const run of ring(deg * rad)) k.stroke(run, 0.2, BLUE)
        for (const run of ring((deg + 2.4) * rad)) k.stroke(run, 0.06, SKY)
      }
      // the white line on the arc
      k.stroke(circle(R + 0.01), 0.06, '#eef2f7')
    })
    // a light line along the leading edge
    k.stroke([finPt(k, LE[0], 0), finPt(k, LE[1], FIN_H)], 0.06, '#dbe4f2')
  })
}

// ---------------------------------------------------------------------------------------------------------------------

export const UAL: Design = {
  code: 'UAL',
  aliases: ['ASH', 'UCA', 'GJS'],
  name: 'United Airlines, 2019 scheme',
  sources: [
    'https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg',
    'https://commons.wikimedia.org/wiki/File:N17317_B%2637_MAX_8,_United,_Fort_Lauderdale_02-20-26_(55150272854).jpg',
    'https://commons.wikimedia.org/wiki/File:N76519_B737-800,_United,_El_Paso_02-04-26_(55104191755).jpg',
    'https://commons.wikimedia.org/wiki/File:N34222_B737-800,_United,_Bozeman_07-27-26_(55480710477).jpg',
    'https://commons.wikimedia.org/wiki/File:Boeing_777-300ER_%E2%80%98N2251U%E2%80%99_United_Airlines_(55498379003).jpg',
    'https://commons.wikimedia.org/wiki/File:N2749U_NRT_2026-05-24.jpg',
    'https://commons.wikimedia.org/wiki/File:United_Airlines_wordmark.svg',
    'https://united.mediaroom.com/2019-04-24-Out-with-the-Gold-in-with-the-Blue-United-Airlines-Unveils-its-Next-Fleet-Paint-Design',
  ],
  base: WHITE,
  engineColor: BLUE,
  wingletColor: BLUE,
  wing: WING,
  stab: WING,

  side(k) {
    const nose = k.a.nose
    const wide = isWide(k)
    const sw = swoopOf(k)
    k.fill(WHITE)

    // the grey belly: below a line parallel to the swoop (0.3 m under it), reaching past the nose and the tail
    const zs = k.stations(nose + 0.6, k.a.tail - 0.6, 0.2)
    k.poly([...zs.map((z): Pt => [z, sw.grey(z)]), ...zs.slice().reverse().map((z): Pt => [z, k.bottom(z) - 1.2])], GREY)
    // the APU cone: bare dark metal
    // (only the cone's tip: the fin's trailing edge overhangs the tail on some models, and a taller shape would paint the rudder)
    const [cone0, cone1] = [k.at(k.a.tail + 0.7, -0.3), k.at(k.a.tail + 0.7, 1.15)]
    k.poly([[k.a.tail + 0.7, cone0], [k.a.tail + 0.7, cone1], [k.a.tail - 2, cone1], [k.a.tail - 2, cone0]], CONE)

    // the swoop: a pinstripe from under the nose to the tailplane root
    const line = k.stations(nose - 1.5, nose - sw.dEnd - 0.2, 0.15).map((z): Pt => [z, sw.y(z)])
    k.stroke(line, 0.11, SWOOP)

    // the title, through the window row; it reads UNITED on both sides and covers the same span. It starts a fixed distance aft
    // of door 1 (dossier 4.8: 1.5 m on the narrow-bodies, about 2.4 m on the 777 and 787; the doors' own places differ per model).
    const doorDist = nose - k.a.door1
    const H = bodyHeight(k)
    const [tw, th, from, lift] = wide
      ? [/^b7[78]/.test(k.model) ? 14.6 : 2.45 * H, (/^b7[78]/.test(k.model) ? 14.6 : 2.45 * H) * 0.12, doorDist + 2.85, 0.28]
      : [10.15, 1.2, doorDist + 1.9, 0.2]
    k.image(asset('liveries/UAL/title.svg'), { z: nose - from - tw / 2, y: k.a.windowY + lift, w: tw, h: th })

    // the fin
    drawFin(k)
  },

  engine(k) {
    // the nacelle's side box: the inlet lip at zMax; the blue cowl ends short of the exhaust. The LEAP-1B (737 MAX) and the GEnx
    // (787) have chevrons: the blue ends in a saw-tooth against the bare metal (N47370, N24980).
    const [zMin, zMax, yMin, yMax] = k.a.box
    const len = zMax - zMin
    const wide = isWide(k)
    const chevrons = /^b3[789]m|^b78/.test(k.model)
    const cowl = wide ? 0.68 : chevrons ? 0.72 : 0.78
    const edge = zMax - cowl * len
    k.fill(BLUE)
    if (chevrons) {
      const teeth = 8
      const depth = 0.075 * len
      const h = (yMax - yMin + 2) / teeth
      const pts: Pt[] = [[zMin - 1, yMax + 1], [edge, yMax + 1]]
      for (let i = 0; i < teeth; i++) {
        const y0 = yMax + 1 - i * h
        pts.push([edge - depth, y0 - h / 2], [edge, y0 - h])
      }
      pts.push([zMin - 1, yMin - 1])
      k.poly(pts, EXHAUST)
    } else {
      k.poly([[edge, yMin - 1], [edge, yMax + 1], [zMin - 1, yMax + 1], [zMin - 1, yMin - 1]], EXHAUST)
    }
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - 0.09 * len, yMax + 1], [zMax - 0.09 * len, yMin - 1]], LIP)
  },

  winglet(k) {
    const [zMin, zMax, yMin, yMax] = k.a.box
    k.fill(BLUE)
    k.poly([[zMin - 1, yMin - 1], [zMax + 1, yMin - 1], [zMax + 1, yMin + 0.2], [zMin - 1, yMin + 0.2]], LIP)
  },

  belly(k) {
    // seen from below: the swoop's two lines join in a U ahead of the nose gear doors (apex 1.75 m aft of the nose)
    const nose = k.a.nose
    const half = 1.9
    const pts: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      pts.push([nose - 1.75 - 4.6 * t, half * Math.sqrt(1 - (1 - t) ** 2)])
    }
    const left = pts
    const right = pts.map(([z, y]): Pt => [z, -y])
    k.stroke([...left.slice().reverse(), ...right.slice(1)], 0.11, SWOOP)
    k.stroke([[nose - 6.3, half], [nose - 9, half]], 0.11, SWOOP)
    k.stroke([[nose - 6.3, -half], [nose - 9, -half]], 0.11, SWOOP)
  },
}

export default UAL
