// liveries/RYR/design.ts
// Ryanair (RYR; Ryanair UK RUK, Malta Air MAY and Buzz RYS fly the same paint), the current scheme on the 737-800 and
// the 737 MAX 8-200: a white aircraft with a large blue "RYANAIR" across the windows and a blue harp ahead of it, a
// yellow cheatline 0.2 m wide from under the chin to the tail cone, everything below it blue, a blue fin with a large
// yellow harp, white nacelles with a level yellow band and a blue underside, blue wingtip devices with a yellow
// "RYANAIR" on the outer face (white with a blue one on the inner face). Measurements: liveries/RYR/README.md (the
// dossier: d metres aft of the nose, h above the keel, on a 38.02 m 737-800), from the side-on photos 9H-QCE (right),
// 9H-QCC (left) and EI-HMY (737 MAX 8-200).
import { asset } from '../../client/livery/kit.ts'
import type { Design, Kit, Pt, Seg } from '../../client/livery/kit.ts'

// Paint colours (sRGB), from sunlit photo samples (dossier §3). The blue is between the photos' median (#162c70) and
// the wordmark file's digital blue (#073590).
const BLUE = '#0e2e80'
const YELLOW = '#f4c41e'
const WHITE = '#f7f7f8'
const GREY = '#b4b9bd' // Boeing grey: wings, tailplane
const LIP = '#b9b9b6' // bare metal: inlet lips, the leading-edge strips of the fin and the blended winglet
const METAL = '#5a5c60' // exhaust nozzles, the APU exhaust
const OUTLINE = '#c6cace' // door outlines

const REF_LEN = 38.02 // the dossier's 737-800, nose tip to tail-cone tip
const REF_H = 4.01 // its fuselage height

type XY = [number, number]
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** The dossier's frame on this model: z of a point d metres aft of the nose, y of a point h metres above the keel. */
function frame(k: Kit): { Z: (d: number) => number; Y: (h: number) => number; s: number; hs: number } {
  // On the 737 meshes the stations are true metres (the body's last station is 1.65 m ahead of the tail cone's tip, so
  // k.a.length is not the aircraft's length); other models are scaled by their length.
  const s = /^b(73\d|3\dm)$/.test(k.model) ? 1 : k.a.length / REF_LEN
  const zMid = k.a.nose - 0.3 * k.a.length // the constant section, ahead of the wing
  const keel = k.bottom(zMid)
  const hs = (k.top(zMid) - keel) / REF_H
  return { Z: (d) => k.a.nose - d * s, Y: (h) => keel + h * hs, s, hs }
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

/** A path with every point moved by f. */
const moved = (d: Seg[], f: (x: number, y: number) => Pt): Seg[] =>
  d.map((s): Seg => {
    const o: Array<string | number> = [s[0]]
    for (let i = 1; i < s.length; i += 2) o.push(...f(s[i] as number, s[i + 1] as number))
    return o as Seg
  })

/** A rounded rectangle [z0 aft, z1 fore] × [y0, y1] with corner radius r, as a path. */
function roundRect(z0: number, z1: number, y0: number, y1: number, r: number): Seg[] {
  return [['M', z0 + r, y0], ['L', z1 - r, y0], ['Q', z1, y0, z1, y0 + r], ['L', z1, y1 - r], ['Q', z1, y1, z1 - r, y1],
    ['L', z0 + r, y1], ['Q', z0, y1, z0, y1 - r], ['L', z0, y0 + r], ['Q', z0, y0, z0 + r, y0], ['Z']]
}

// ---- The cheatline ----

/** The cheatline's centre line [d, h] (dossier §4: the mean of 9H-QCE, 9H-QCC and EI-HMY), run on past both ends. */
const CHEAT: XY[] = [
  [0.7, 0.5], [1.3, 0.63], [1.5, 0.66], [3.0, 0.89], [4.6, 1.05], [6.1, 1.17], [7.6, 1.26], [9.2, 1.35], [10.7, 1.42], [12.3, 1.48],
  [13.8, 1.54], [15.3, 1.59], [16.9, 1.62], [18.4, 1.64], [20.8, 1.65], [23.3, 1.66], [24.8, 1.66], [26.5, 1.7], [28.2, 1.75],
  [29.7, 1.82], [31.3, 1.93], [32.8, 2.07], [34.3, 2.27], [35.9, 2.53], [37.4, 2.88], [38.6, 3.2], [40, 3.6],
]
const CHEAT_W = 0.2

// ---- The harp ----

// The harp emblem has no free file (dossier §6), so it is drawn here from plain shapes that give its look: a round
// head, an arm that sweeps aft over the strings to a point, a body that curves down and aft to a point, four tapered
// strings. In a unit box: x 0 the forward edge … 1 the arm's point, y 0 the body's point … 1 the top. Proportions
// from 9H-QCE (right fin, side-on) and EI-IKI (left fin).
const HARP_FIGURE: Seg[] = [
  ['M', 0.07, 0.875], ['C', 0.0, 0.83, -0.02, 0.7, 0.045, 0.6], ['C', 0.16, 0.43, 0.42, 0.2, 0.573, 0], // neck, chest, down to the point
  ['C', 0.485, 0.22, 0.32, 0.44, 0.265, 0.62], ['C', 0.24, 0.7, 0.24, 0.77, 0.285, 0.815], // the inner edge up to the arm (the chest as thick as in the photos)
  ['C', 0.45, 0.85, 0.72, 0.8, 1, 0.893], // under the arm to its point
  ['C', 0.82, 0.95, 0.66, 1.005, 0.5, 1], ['C', 0.4, 0.995, 0.33, 0.96, 0.26, 0.9], ['Z'], // over the arm to the shoulder
]
const HARP_HEAD: [x: number, y: number, rx: number, ry: number] = [0.14, 0.925, 0.07, 0.062]
/** The strings, fore to aft: [top x, top y, point x, point y, half-width at the top]. */
const HARP_STRINGS: Array<[number, number, number, number, number]> = [
  [0.436, 0.79, 0.38, 0.526, 0.043], [0.564, 0.778, 0.45, 0.416, 0.044], [0.695, 0.768, 0.523, 0.292, 0.045], [0.827, 0.755, 0.595, 0.14, 0.047],
]

/** The harp: at(x, y) places a point of its unit box on the aircraft. */
function harp(k: Kit, at: (x: number, y: number) => Pt, color: string): void {
  k.path(moved(HARP_FIGURE, at), color)
  const [hx, hy, rx, ry] = HARP_HEAD
  const c = 0.5523
  k.path(moved([['M', hx + rx, hy], ['C', hx + rx, hy + c * ry, hx + c * rx, hy + ry, hx, hy + ry], ['C', hx - c * rx, hy + ry, hx - rx, hy + c * ry, hx - rx, hy],
    ['C', hx - rx, hy - c * ry, hx - c * rx, hy - ry, hx, hy - ry], ['C', hx + c * rx, hy - ry, hx + rx, hy - c * ry, hx + rx, hy], ['Z']], at), color)
  for (const [tx, ty, bx, by, w] of HARP_STRINGS) {
    k.path(moved([['M', tx - w, ty], ['C', tx - w, ty + 0.035, tx + w, ty + 0.035, tx + w, ty], ['L', bx, by], ['Z']], at), color)
  }
}

// ---- The wordmark as shapes ----

// The "RYANAIR" wordmark's outline (the path of title.svg: Commons File:Ryanair_wordmark.svg, public domain), for the
// wingtip devices, where it runs along the blade: the kit sets text and images level only.
const WORDMARK =
  'M 75.47842,9.6647758 72.614464,5.9906693 h -1.076869 v 3.6741065 h -3.284623 v -9.67013103 h 4.886497 c 3.572766,0 5.858056,1.00834173 5.858056,3.01162543 0,1.3538673 -1.312875,2.1957037 -3.09935,2.637622 l 3.152156,4.0202433 h -3.572158 v 3.04e-4 z m -2.496089,-7.984932 h -1.444736 v 2.6941818 h 1.628369 c 1.681351,0 2.548097,-0.456478 2.548097,-1.3403147 5e-6,-0.8699486 -0.761318,-1.3538671 -2.731667,-1.3538671 z M 62.142239,-0.00685088 h 3.283104 V 9.6632798 H 62.142239 Z M 57.465439,9.6648063 56.59775,7.6482137 H 52.473421 L 51.60674,9.6648063 h -3.362767 l 4.702135,-9.67013101 h 3.205571 l 4.70244,9.67013101 z M 55.389693,4.8854458 C 55.074477,4.1393309 54.654566,3.0197922 54.522674,2.537125 54.391103,3.0340161 54.023524,4.0701343 53.681845,4.8573337 l -0.499149,1.1751527 h 2.706482 L 55.389723,4.8855069 Z M 43.710816,9.6648063 40.322103,5.3548963 C 39.848837,4.7471441 39.270754,3.9592731 38.929745,3.3935212 c 0.0261,0.5945051 0.05212,1.5886229 0.05212,2.1960393 V 9.6647453 H 35.986664 V -0.00447005 H 39.29693 L 42.528446,4.237067 c 0.446772,0.5793042 1.103729,1.4780364 1.444736,2.016928 -0.02609,-0.5945053 -0.104741,-1.6441759 -0.104741,-2.2525995 v -4.00559083 h 2.994898 V 9.6650197 h -3.152461 z m -12.32384,0 -0.866346,-2.0165926 h -4.124022 l -0.866682,2.0165926 h -3.362768 l 4.702441,-9.67013101 h 3.205267 L 34.776695,9.6648063 Z M 29.312818,4.8854458 C 28.997296,4.1393309 28.577386,3.0197922 28.446135,2.537125 28.314242,3.0340161 27.946985,4.0701343 27.605306,4.8573337 l -0.49915,1.1751527 h 2.705811 L 29.312818,4.8855069 Z M 18.971172,6.0170107 V 9.6639525 H 15.68746 V 6.0447873 l -4.729302,-6.05096667 h 3.62588 l 1.418547,1.96161927 c 0.604546,0.8421721 1.209033,1.7961212 1.366503,2.2519276 0.183629,-0.4558368 0.788145,-1.4509316 1.366169,-2.2519276 l 1.418545,-1.96161927 H 23.72657 L 18.971019,6.0167054 Z M 7.2245315,9.6648673 4.3609142,5.9907604 H 3.2837115 V 9.6648673 H 0 v -9.67013097 h 4.8864972 c 3.5727681,0 5.8586688,1.00834177 5.8586688,3.01162557 0,1.3538671 -1.3137895,2.1957035 -3.0999602,2.6376218 L 10.797361,9.664226 H 7.2245924 v 3.059e-4 z M 4.7287826,1.6799354 H 3.2837115 v 2.6941817 h 1.6287001 c 1.6816583,0 2.5480963,-0.4564779 2.5480963,-1.3403147 3.358e-4,-0.8699485 -0.7609795,-1.353867 -2.7316643,-1.353867 z'
const WM_W = 79.05 // the wordmark's length and cap height in its own units
const WM_H = 9.665
const WM_ASPECT = WM_W / WM_H

/** The wordmark's path in its own units (x along the text, y down from the cap line): absolute M, L, C and Z. */
function wordmark(): Seg[] {
  const tok = WORDMARK.match(/[a-zA-Z]|-?[\d.]+(?:e-?\d+)?/g) ?? []
  const out: Seg[] = []
  let i = 0
  let cmd = ''
  let [x, y, sx, sy] = [0, 0, 0, 0]
  const num = (): number => Number(tok[i++])
  while (i < tok.length) {
    if (/^[a-zA-Z]$/.test(tok[i])) cmd = tok[i++] // a number such as 3.04e-4 holds a letter too
    const rel = cmd === cmd.toLowerCase()
    const [ox, oy] = rel ? [x, y] : [0, 0]
    const c = cmd.toUpperCase()
    if (c === 'Z') {
      out.push(['Z'])
      ;[x, y] = [sx, sy]
    } else if (c === 'M') {
      ;[x, y] = [ox + num(), oy + num()]
      ;[sx, sy] = [x, y]
      out.push(['M', x, y])
      cmd = rel ? 'l' : 'L' // further pairs are lines
    } else if (c === 'L') {
      ;[x, y] = [ox + num(), oy + num()]
      out.push(['L', x, y])
    } else if (c === 'H') {
      x = ox + num()
      out.push(['L', x, y])
    } else if (c === 'V') {
      y = oy + num()
      out.push(['L', x, y])
    } else if (c === 'C') {
      const p = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]
      out.push(['C', p[0], p[1], p[2], p[3], p[4], p[5]])
      ;[x, y] = [p[4], p[5]]
    } else {
      break // no other command is in the wordmark
    }
  }
  return out
}

/**
 * The wordmark `len` metres long from `start` (the foot of its first letter) along the unit vector `along`, the tops
 * of the letters towards `up` (a unit vector): it reads correctly for a viewer who sees `up` a quarter turn
 * anticlockwise of `along`.
 */
function lettering(k: Kit, start: Pt, along: Pt, up: Pt, len: number, color: string): void {
  const m = len / WM_W
  k.path(moved(wordmark(), (x, y) => [start[0] + along[0] * x * m + up[0] * (WM_H - y) * m, start[1] + along[1] * x * m + up[1] * (WM_H - y) * m]), color)
}

// ---- The tailplane root (as on liveries/FDB: the same meshes) ----

/**
 * The tailplane root's side projection out to the body half-width, measured on the b738 / b38m mesh: the shader paints
 * the root with the skin atlas, and the tailplane is plain grey. Null on other models.
 */
function stabRoot(k: Kit): Pt[] | null {
  if (!k.p.stab || !(k.model === 'b738' || k.model === 'b38m')) return null
  const z = k.p.stab[1] // the root leading edge
  const y = k.a.finRoot[0]
  return [[z + 0.12, y - 0.67], [z + 0.14, y - 0.62], [z - 0.84, y - 0.3], [z - 3.62, y - 0.3], [z - 3.4, y - 0.67]]
}

/** The tailplane root's lower surface in plan view (z, y across), both sides: from the tail cone out to 2.25 m. */
function stabRootBelow(k: Kit): Pt[][] {
  if (!k.p.stab || !(k.model === 'b738' || k.model === 'b38m')) return []
  const z = k.p.stab[1]
  const inner = (zz: number): number => Math.max(0.1, 0.9 + 0.23 * (zz - z - 0.18)) // the tail cone's half-width at the root
  const zs = [z + 0.15, z - 0.5, z - 1.2, z - 2, z - 2.8, z - 3.45]
  const one: Pt[] = [...zs.map((zz): Pt => [zz, inner(zz) - 0.02]), [z - 3.62, 2.25], [z - 0.88, 2.25]]
  return [one, one.map(([a, b]): Pt => [a, -b])]
}

// ---- The design ----

function side(k: Kit): void {
  const { Z, Y, s, hs } = frame(k)
  k.fill(WHITE)

  // The belly and the cheatline: blue below the line's centre, the yellow band over the edge.
  const line = curve(CHEAT).map(([d, h]): Pt => [Z(d), Y(h)])
  const low = k.a.box[2] - 2
  k.poly([...line, [line[line.length - 1][0], low], [line[0][0], low]], BLUE)
  k.stroke(line, CHEAT_W * hs, YELLOW)
  // the APU exhaust: bare metal
  k.poly([[Z(37.62), Y(-2)], [Z(37.62), Y(3.9)], [k.a.tail - 4, Y(3.9)], [k.a.tail - 4, Y(-2)]], METAL)

  // The fin: blue down to its root, a bare-metal strip up its leading edge, the yellow harp.
  k.finFill(BLUE)
  k.clip('fin', () => {
    k.stroke([k.fin(0, 0.22), k.fin(0, 1.05)], 0.22, LIP)
    // the harp: from v 0.145 to 0.60 of the fin's height, the arm's point on the trailing edge, 0.92 of the chord long
    const [v0, v1] = [0.145, 0.6]
    const y0 = k.fin(0, v0)[1]
    const y1 = k.fin(0, v1)[1]
    const vArm = lerp(v0, v1, 0.893)
    const aft = k.fin(1, vArm)[0] + 0.03
    const w = 0.92 * (k.fin(0, vArm)[0] - k.fin(1, vArm)[0])
    harp(k, (x, y) => [aft + w * (1 - x), lerp(y0, y1, y)], YELLOW)
  })

  // The tailplane is plain grey: grey over its root's side projection (see stabRoot).
  const sr = stabRoot(k)
  if (sr) k.poly(sr, GREY)

  // Door outlines: thin grey lines on the white (they stay light across the cheatline and the belly), where the photos
  // show the doors (dossier §4: door 1 is 0.4 m further forward than the model's own; the 737 MAX 8-200 has a third door).
  const max = /^b3\dm$/.test(k.model)
  const doors: Array<[d0: number, d1: number, h0: number, h1: number]> = [
    k.side === 'left' ? [4.2, 5.1, 1.46, 3.41] : [4.1, 4.9, 1.46, 3.45],
    [31.7, 32.5, 1.5, 3.21],
  ]
  if (max) doors.push([24.8, 25.5, 1.5, 3.21])
  for (const [d0, d1, h0, h1] of doors) k.stroke(roundRect(Z(d1), Z(d0), Y(h0), Y(h1), 0.1), 0.03, OUTLINE)

  // The harp on the fuselage, between door 1 and the title, as tall as the title, the head forward on both sides.
  const base = k.a.windowY - 0.55 * hs // the title's baseline; the window row runs through the letters
  const cap = 1.4 * hs
  const [hz0, hz1] = [Z(5.3), Z(6.9)]
  harp(k, (x, y) => [lerp(hz0, hz1, x), base + (-0.02 + 1.02 * y) * cap], BLUE)

  // The title, d 7.3–20.1 with a cap height of 1.40 m, stretched to its painted box (the curve of the skin shortens
  // its height side-on). The kit keeps it reading forwards on the right side (the first "R" at the aft end).
  k.image(asset('liveries/RYR/title.svg'), { z: Z((7.3 + 20.1) / 2), y: base + cap / 2, w: 12.8 * s, h: cap })
}

export const RYR: Design = {
  code: 'RYR',
  aliases: ['RUK', 'MAY', 'RYS'],
  name: 'Ryanair (current scheme)',
  sources: [
    'https://commons.wikimedia.org/wiki/File:Ryanair,_9H-QCE,_Boeing_737-8AS_(53760697848).jpg (Anna Zvereva, CC BY-SA 2.0): right side, the measurements',
    'https://commons.wikimedia.org/wiki/File:Ryanair,_9H-QCC,_Boeing_737-8AS_(53760697933).jpg (Anna Zvereva, CC BY-SA 2.0): left side',
    'https://commons.wikimedia.org/wiki/File:Ryanair,_EI-HMY,_Boeing_737-8200_MAX_(52550445881).jpg (Anna Zvereva, CC BY-SA 2.0): 737 MAX 8-200, right side',
    'https://commons.wikimedia.org/wiki/File:Ryanair,_EI-HMX,_Boeing_737-8200_MAX_(52074946745).jpg (Anna Zvereva, CC BY-SA 2.0): 737 MAX 8-200, left side',
    'https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Ryanair_Boeing_737-8200_MAX_EI-IKI_(DSC00687).jpg (MarcelX42, CC BY-SA 4.0): colours, fin, engine, wingtip',
    'https://commons.wikimedia.org/wiki/File:9H-QFK_737_Ryanair_winglet_ARN.jpg (Bene Riobó, CC BY-SA 4.0): fin and blended winglet, right side',
    'https://commons.wikimedia.org/wiki/File:9H-QBM_737_Ryanair_winglet.jpg (Bene Riobó, CC BY-SA 4.0): winglet, inner face',
    'https://commons.wikimedia.org/wiki/File:Ryanair_EI-IJT_at_Cork_Airport_6_-_53823501962.jpg (Tim Sheerman-Chase, CC BY 2.0): nose, the harp close up',
    'https://commons.wikimedia.org/wiki/File:Boeing_737-8-200_MAX_(c-n_67103,_EI-IJP)_2026-03-17_Andre_Gerwing_Collection_ID_028019.jpg (André Gerwing, CC BY-SA 4.0): belly',
    'https://commons.wikimedia.org/wiki/File:Ryanair_wordmark.svg (public domain, PD-shape): the title',
  ],
  base: WHITE,
  wing: GREY,
  stab: GREY,
  engineColor: WHITE,
  wingletColor: BLUE,
  side,

  belly(k) {
    for (const p of stabRootBelow(k)) k.poly(p, GREY)
  },

  engine(k) {
    // The nacelle's side box (the inlet at zMax; the box's top is the pylon): white, a level yellow band 0.23 m wide
    // whose lower edge is 0.31 of the box's height up, blue below it. The fan cowl is 3.95 m long on the CFM56-7B and
    // 4.7 m on the LEAP-1B; the nozzle behind it is dark metal, the pylon over that white. The inlet lip is bare metal.
    const [zMin, zMax, yMin, yMax] = k.a.box
    const max = /^b3\dm$/.test(k.model) // a 737 MAX
    const band = yMin + 0.31 * (yMax - yMin)
    const cowl = zMax - (max ? 4.7 : 3.95)
    k.fill(WHITE)
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, band + 0.1], [zMin - 1, band + 0.1], [zMin - 1, yMin - 1]], BLUE)
    k.poly([[zMax + 1, band], [zMax + 1, band + 0.23], [zMin - 1, band + 0.23], [zMin - 1, band]], YELLOW)
    k.poly([[cowl, yMin - 1], [cowl, yMax - 0.55], [zMin - 1, yMax - 0.55], [zMin - 1, yMin - 1]], METAL)
    const lip = max ? 0.4 : 0.3
    k.poly([[zMax + 1, yMin - 1], [zMax + 1, yMax + 1], [zMax - lip, yMax + 1], [zMax - lip, yMin - 1]], LIP)
  },

  winglet(k) {
    // The device's side box. The tip atlas's "left" half paints both outboard faces, its "right" half both inboard
    // faces (client/scene/livery.ts). The upper blade's leading and trailing edges from the wing-tip plane (t 0) to
    // its tip (t 1), as box fractions measured on the meshes: the 737-800's blended winglet, the MAX's split winglet.
    const [z0, z1, y0, y1] = k.a.box
    const w = z1 - z0
    const max = /^b3\dm$/.test(k.model)
    const rootY = Math.max(y0, k.p.wing[4])
    const [a, b] = max ? [0.13, 0.62] : [0.265, 0.674]
    const Yt = (t: number): number => lerp(rootY, y1, t)
    const le = (t: number): number => lerp(z1, z0 + a * w, t)
    const te = (t: number): number => lerp(z1 - b * w, z0, t)
    const mid = (t: number): Pt => [(le(t) + te(t)) / 2, Yt(t)]
    const outer = k.side === 'left'
    k.fill(outer ? BLUE : WHITE)
    // the MAX's lower blade: yellow on both faces
    if (max) k.poly([[z1 + 1, rootY - 0.08], [z0 - 1, rootY - 0.08], [z0 - 1, y0 - 1], [z1 + 1, y0 - 1]], YELLOW)
    // the blended winglet's leading edge: a bare-metal strip
    if (!max) k.stroke([[le(-0.2) , Yt(-0.2)], [le(1.2), Yt(1.2)]], 0.2, LIP)
    // "RYANAIR" along the blade from 0.20 to 0.89 of its length, on its middle, the tops of the letters to the
    // leading edge: yellow on the outer face, read from the root up; blue on the inner face, read from the tip down.
    // ponytail: one half paints the same face of both wings, so the right wing's device shows the left one's lettering
    // mirrored; lettering that reads on both needs the tip atlas to tell the wings apart (livery.ts).
    const [m0, m1] = [mid(0.2), mid(0.89)]
    const len = Math.hypot(m1[0] - m0[0], m1[1] - m0[1])
    if (!(len > 0.2)) return
    const dir: Pt = [(m1[0] - m0[0]) / len, (m1[1] - m0[1]) / len] // up the blade
    const up: Pt = [dir[1], -dir[0]] // across it, to the leading edge
    const capM = len / WM_ASPECT
    const foot = (p: Pt): Pt => [p[0] - (up[0] * capM) / 2, p[1] - (up[1] * capM) / 2]
    if (outer) lettering(k, foot(m0), dir, up, len, YELLOW)
    else lettering(k, foot(m1), [-dir[0], -dir[1]], up, len, BLUE)
  },
}

export default RYR
