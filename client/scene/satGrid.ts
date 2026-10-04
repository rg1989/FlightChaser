// client/scene/satGrid.ts
// The satellite's frame (satellite.ts) made into what a weather field takes (wxField.ts buildField): a grid over the field's own
// square, SAT_GRID_N cells a side (2.5 km, about a pixel of the satellite's), each with how much of it is cloud, that cloud's top
// and a base for it, and whether the satellite sees the cell at all. Pure (no Cesium, no DOM), so Node tests cover it; the weather's
// gatherer makes it (wxGather.ts), off the main thread.
// The satellite says WHERE cloud is and how high its top is. From a frame's pixels to the grid:
// - a cloudy pixel with no height (the heights are given in blocks, and not for every cloud: thin or broken cloud has none) takes the
//   nearest height within SAT_FILL_KM (fillTops); with none so near, the forecast model's highest cloudy level there, else
//   SAT_NO_TOP_M: estimates;
// - each cloudy pixel is moved to where its cloud stands now (satPlace.ts): back along the satellite's line of sight by its top's
//   height, and downwind by the model's wind at that height for the frame's age. The height it is moved by is the cloud's round it,
//   smoothed over about 15 km (smoothTops): the product's heights are steps, blocks of 9 to 15 km each of one height, and moved each
//   by its own a higher block would part from a lower one beside it and leave a strip of clear air that is not there (a real sky,
//   the Gulf of Lion on 2026-10-04, came out striped). A deck's own edge toward clear air is still moved by its whole height.
//   The moves are worked out at a few places of the frame and read between them;
// - every pixel the satellite sees, cloud or clear, lands on the grid as its share of the four cells round its place; a cell's
//   cover is the cloud's share of what landed on it (so the cover stays whole inside a cloud whose sloping top pulls its pixels
//   apart), softened over a cell each way (a few km), so a field's edge is no staircase of pixels.
// The satellite cannot see a cloud's base, nor any layer under the top one. A cell's base is taken, in this order (satBase):
// the nearest airport within SAT_STATION_KM that reports a layer under the top: its highest such layer; the forecast model's
// cloudy levels under the top at the place: the lowest of the run of them just under it; else the top less a thickness by its
// height (SAT_THICK: thin for high cloud, thicker for low and middle cloud). A report's or the model's base more than SAT_DEEP_M
// under the top is not this cloud's (the top is a higher layer's, which the report does not reach: an overcast at 300 m under
// cirrus at 10 km is two clouds, not one 10 km deep), and the next in the order is asked. Every base is an estimate.
// With ?wxat the frame's pixels are the weather's own place and the grid is the drawn sky's: a pixel is drawn at its place plus
// the shift, and its parallax is worked out where it really is.
import type { Metar, ModelGrid } from '../../shared/wx.ts'
import { cellAt, modelWindAt } from './modelWind.ts'
import { SAT_STEP_M, type SatFrame } from './satellite.ts'
import { driftKm, parallaxKm } from './satPlace.ts'
import { wrapLon } from './wxGeo.ts'

/** The grid's cells a side, over the field's square: 2.5 km each. */
export const SAT_GRID_N = 128
const FIELD_KM = 320 // wxField.ts FIELD_KM (not imported: that module reads this one's grid)
const CELL_KM = FIELD_KM / SAT_GRID_N
/** A cloud under this top, FEW or SCT in a report, is small cumulus: smaller than a pixel of the satellite, which cannot say where it is or is not. */
export const SAT_SMALL_CU_M = 2000
/** A cell's base comes from an airport's report within this. */
export const SAT_STATION_KM = 60
/** A cloudy pixel with no height takes the nearest height within this. */
export const SAT_FILL_KM = 40
/** With none so near, and no model: this top (an estimate: cloud the product gives no height for is mostly low). */
export const SAT_NO_TOP_M = 2500
/** A cloud's thickness by its top's height, m, in proportion between (estimates): thin for high cloud, thicker for low and middle cloud. */
export const SAT_THICK: readonly (readonly [topM: number, thickM: number])[] = [[1000, 600], [2500, 900], [5000, 1500], [8000, 1500], [10_000, 1000], [13_000, 800]]
/** A report's layer or a model's level more than this under a top is another cloud's base. */
export const SAT_DEEP_M = 3000
const THIN_M = 300 // a cloud is at least this thick
const OVER_GROUND_M = 50 // and its base at least this far over the ground
const MODEL_CLOUDY = 20 // % of cover at a model's level that is cloud (cloudField.ts MODEL_LOOK.minCover)
const LANDED_MIN = 0.3 // a cell's cover is its cloud's share of the pixels that landed on it, counted as this much of a cell at least
const NODES = 5 // the moves are worked out at this many places a side of the frame, and read between them
const PARALLAX_AT_M = 8000 // the parallax is worked out for this height, and taken in proportion to a pixel's (it is so to 1 % up to 16 km)
const SMOOTH_PX = 3 // the height a pixel is moved by is that of the cloud this many pixels round it (twice over: about 15 km each way)
// The frame's part worked on reaches this far from the field's middle: half the field, the room a cloud is moved by, and how far a height is taken from.
const WINDOW_KM = FIELD_KM / 2 + 100 + 40
const LEVELS = 50 // the heights a frame can hold: SAT_STEP_M apart
const KM_PER_DEG = 111.195 // of latitude, on a sphere of 6,371 km
const RAD = Math.PI / 180
const FT = 0.3048

/**
 * The satellite's cloud over a weather field's square: n × n cells, row by row from the south-west corner (as the field's texels).
 * cover: 0 … 1. topM, baseM: metres above sea level, where there is cover and a cell beyond it (0 elsewhere). seen: 0 where the
 * satellite says nothing of the cell (not processed, or outside the frame): there the weather is drawn as it is without a satellite.
 */
export interface SatGrid {
  timeMs: number // the frame's
  n: number
  cover: Float32Array
  topM: Float32Array
  baseM: Float32Array
  seen: Uint8Array
}

/** What a grid is made for. */
export interface SatGridJob {
  lat: number // the field's middle, as drawn
  lon: number
  shift: { dLat: number; dLon: number } // ?wxat: a pixel of the frame is drawn at its place plus this
  epochMs: number // the wall clock: the frame's age is from this
  metars: readonly Metar[] // as drawn
  model: ModelGrid | null // as drawn
}

/** The value at x of the line through points (x rising): the first's before the first, the last's after the last. */
function through(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return points[points.length - 1][1]
}

/**
 * A frame's tops with the holes filled: for each pixel that is cloud, its own height, else the nearest pixel's that has one within
 * reachPx (a pass down the picture and one back up, each pixel taking the nearest its neighbours know), else noTop(pixel). 0 where
 * there is no cloud.
 */
export function fillTops(f: SatFrame, reachPx: number, noTop: (p: number) => number): Uint16Array {
  const n = f.n
  const top = Uint16Array.from(f.topM)
  const far = new Float32Array(n * n)
  for (let p = 0; p < n * n; p++) far[p] = top[p] > 0 ? 0 : Infinity
  const take = (p: number, q: number, step: number): void => {
    if (far[q] + step < far[p]) {
      far[p] = far[q] + step
      top[p] = top[q]
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const p = j * n + i
      if (i > 0) take(p, p - 1, 1)
      if (j > 0) {
        take(p, p - n, 1)
        if (i > 0) take(p, p - n - 1, Math.SQRT2)
        if (i < n - 1) take(p, p - n + 1, Math.SQRT2)
      }
    }
  }
  for (let j = n - 1; j >= 0; j--) {
    for (let i = n - 1; i >= 0; i--) {
      const p = j * n + i
      if (i < n - 1) take(p, p + 1, 1)
      if (j < n - 1) {
        take(p, p + n, 1)
        if (i < n - 1) take(p, p + n + 1, Math.SQRT2)
        if (i > 0) take(p, p + n - 1, Math.SQRT2)
      }
    }
  }
  for (let p = 0; p < n * n; p++) {
    if (f.cloud[p] === 0 || f.seen[p] === 0) top[p] = 0
    else if (f.topM[p] === 0 && !(far[p] <= reachPx)) top[p] = noTop(p)
  }
  return top
}

/** What a base is chosen from: the airports that report a layer (each with its layers' bases above the sea, rising) and the model's grid. */
export interface BaseSources {
  stations: { lat: number; lon: number; elevM: number; bases: number[] }[]
  model: ModelGrid | null
}

/** The airports' layers and the model, as satBase reads them. */
export function baseSources(metars: readonly Metar[], model: ModelGrid | null): BaseSources {
  const stations: BaseSources['stations'] = []
  for (const m of metars) {
    if (m.elevM === null) continue
    const bases = m.clouds.filter((c) => c.baseFt !== null && ['FEW', 'SCT', 'BKN', 'OVC'].includes(c.cover)).map((c) => m.elevM! + c.baseFt! * FT)
    if (m.vertVisFt !== null) bases.push(m.elevM + m.vertVisFt * FT) // a sky hidden: the cloud's base is where the sight ends
    if (bases.length > 0) stations.push({ lat: m.lat, lon: m.lon, elevM: m.elevM, bases: bases.sort((a, b) => a - b) })
  }
  return { stations, model }
}

/** The model's place nearest lat, lon (its index), or −1 where the grid does not reach. */
function modelPlace(g: ModelGrid, lat: number, lon: number): number {
  const c = cellAt(g, lat, lon)
  return c === null ? -1 : (c.row + (c.ty >= 0.5 ? 1 : 0)) * g.n + c.col + (c.tx >= 0.5 ? 1 : 0)
}

/**
 * The base of the satellite's cloud at a place whose top is topM, and that top (raised where the ground stands in it): see the
 * header for the order. Metres above sea level.
 */
export function satBase(topM: number, lat: number, lon: number, from: BaseSources): { baseM: number; topM: number } {
  const kx = KM_PER_DEG * Math.cos(lat * RAD)
  let near: BaseSources['stations'][number] | null = null
  let nearKm2 = SAT_STATION_KM ** 2
  let ground = 0
  let groundKm2 = SAT_STATION_KM ** 2
  for (const s of from.stations) {
    const d2 = (wrapLon(s.lon - lon) * kx) ** 2 + ((s.lat - lat) * KM_PER_DEG) ** 2
    if (d2 <= groundKm2) [ground, groundKm2] = [s.elevM, d2]
    if (d2 <= nearKm2 && s.bases[0] <= topM - THIN_M) [near, nearKm2] = [s, d2]
  }
  const place = from.model === null ? -1 : modelPlace(from.model, lat, lon)
  if (place >= 0 && from.model!.elevM[place] !== null && from.model!.elevM[place] !== undefined) ground = from.model!.elevM[place]!
  let base = Number.NaN
  if (near !== null) {
    let b = near.bases[0]
    for (const x of near.bases) if (x <= topM - THIN_M) b = x // the highest layer under the top
    if (topM - b <= SAT_DEEP_M) base = b
  }
  if (Number.isNaN(base) && place >= 0) {
    const levels = from.model!.clouds
    const z = (l: number): number | null => {
      const cover = levels[l].cover[place]
      const zM = levels[l].zM[place]
      return cover !== null && cover !== undefined && cover >= MODEL_CLOUDY && zM !== null && zM !== undefined ? zM : null
    }
    let hi = -1 // the highest cloudy level under the top
    let hiZ = -Infinity
    for (let l = 0; l < levels.length; l++) {
      const zM = z(l)
      if (zM !== null && zM <= topM - THIN_M && zM > hiZ) [hi, hiZ] = [l, zM]
    }
    if (hi >= 0 && topM - hiZ <= SAT_DEEP_M) {
      base = hiZ
      for (let l = hi - 1; l >= 0; l--) { // (the levels are held the lowest first) down the run of cloudy levels under it
        const zM = z(l)
        if (zM === null || zM > base || topM - zM > SAT_DEEP_M) break
        base = zM
      }
    }
  }
  if (Number.isNaN(base)) base = topM - through(SAT_THICK, topM)
  base = Math.max(base, ground + OVER_GROUND_M)
  return { baseM: base, topM: Math.max(topM, base + THIN_M) }
}

/** [1, 2, 1] / 4 along the rows, then the columns, in place: a cell's value spread over the one each side of it. */
function soften(a: Float32Array, n: number, tmp: Float32Array): void {
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i
      tmp[o] = 0.25 * a[i > 0 ? o - 1 : o] + 0.5 * a[o] + 0.25 * a[i < n - 1 ? o + 1 : o]
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = j * n + i
      a[o] = 0.25 * tmp[j > 0 ? o - n : o] + 0.5 * tmp[o] + 0.25 * tmp[j < n - 1 ? o + n : o]
    }
  }
}

/** The part of a frame m pixels square from pixel (i0, j0): a frame of its own. */
function cropFrame(f: SatFrame, i0: number, j0: number, m: number): SatFrame {
  const [south, west, north, east] = f.box
  const [dLatPx, dLonPx] = [(north - south) / f.n, (east - west) / f.n]
  const out: SatFrame = {
    timeMs: f.timeMs, n: m, box: [north - (j0 + m) * dLatPx, west + i0 * dLonPx, north - j0 * dLatPx, west + (i0 + m) * dLonPx],
    cloud: new Uint8Array(m * m), seen: new Uint8Array(m * m), topM: new Uint16Array(m * m),
  }
  for (let j = 0; j < m; j++) {
    const from = (j0 + j) * f.n + i0
    out.cloud.set(f.cloud.subarray(from, from + m), j * m)
    out.seen.set(f.seen.subarray(from, from + m), j * m)
    out.topM.set(f.topM.subarray(from, from + m), j * m)
  }
  return out
}

/**
 * The tops smoothed over the cloud round each pixel (a box of SMOOTH_PX each way, twice, by the pixels' cloud; clear pixels give
 * nothing): the height a pixel is moved by. A clear pixel within the boxes' reach of a cloud has that cloud's height (it is moved
 * with the cloud's edge); 0 where no cloud is near.
 */
function smoothTops(tops: Uint16Array, cloud: Uint8Array, n: number): Float32Array {
  let h = new Float32Array(n * n) // cloud × top
  let c = new Float32Array(n * n) // cloud
  for (let p = 0; p < n * n; p++) {
    c[p] = tops[p] > 0 ? cloud[p] / 255 : 0
    h[p] = c[p] * tops[p]
  }
  let [h2, c2] = [new Float32Array(n * n), new Float32Array(n * n)]
  /** A running box along the rows (step 1) or the columns (step n) of `from`, into `to`. */
  const box = (from: Float32Array, to: Float32Array, step: number): void => {
    const [lines, along] = step === 1 ? [n, 1] : [1, n]
    for (let l = 0; l < n; l++) {
      const first = step === 1 ? l * lines : l
      let sum = 0
      for (let k = 0; k <= SMOOTH_PX && k < n; k++) sum += from[first + k * along]
      for (let k = 0; k < n; k++) {
        to[first + k * along] = sum
        if (k + SMOOTH_PX + 1 < n) sum += from[first + (k + SMOOTH_PX + 1) * along]
        if (k - SMOOTH_PX >= 0) sum -= from[first + (k - SMOOTH_PX) * along]
      }
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    box(h, h2, 1)
    box(h2, h, n)
    box(c, c2, 1)
    box(c2, c, n)
  }
  ;[h2, c2] = [h, c]
  const out = new Float32Array(n * n)
  for (let p = 0; p < n * n; p++) if (c2[p] > 1e-6) out[p] = h2[p] / c2[p]
  return out
}

/**
 * The grid of a frame for a field: see the header. The frame's box is the weather's own (the pixels as the satellite's picture has
 * them); what comes out is laid round the field's middle as drawn.
 */
export function satGrid(whole: SatFrame, job: SatGridJob): SatGrid {
  const N = SAT_GRID_N
  const { dLat, dLon } = job.shift
  const kx = KM_PER_DEG * Math.max(0.01, Math.cos(job.lat * RAD)) // the field's map: km per degree of longitude
  // Only the frame's part that can reach the field is worked on: the field's square, the room a cloud is moved by, and the reach a
  // height is taken from. A square of pixels, kept inside the frame.
  const f = ((): SatFrame => {
    const [south, west, north, east] = whole.box
    const [dLatPx, dLonPx] = [(north - south) / whole.n, (east - west) / whole.n]
    const m = Math.min(whole.n, Math.ceil((2 * WINDOW_KM) / KM_PER_DEG / dLatPx))
    if (m >= whole.n) return whole
    const at = (px: number): number => Math.min(whole.n - m, Math.max(0, Math.round(px - m / 2)))
    return cropFrame(whole, at(wrapLon(job.lon - dLon - west) / dLonPx), at((north - (job.lat - dLat)) / dLatPx), m)
  })()
  const n = f.n
  const [south, west, north, east] = f.box
  const [dLatPx, dLonPx] = [(north - south) / n, (east - west) / n]
  const ageMs = job.epochMs - f.timeMs
  const model = job.model

  // A cloudy pixel with no height near: the model's highest cloudy level there, and a thickness over it.
  const modelTops = new Map<number, number>()
  const noTop = (p: number): number => {
    if (model === null) return SAT_NO_TOP_M
    const place = modelPlace(model, north - (Math.floor(p / n) + 0.5) * dLatPx + dLat, west + ((p % n) + 0.5) * dLonPx + dLon)
    let top = modelTops.get(place)
    if (top === undefined) {
      let z = -Infinity
      if (place >= 0) for (const l of model.clouds) if ((l.cover[place] ?? 0) >= MODEL_CLOUDY && (l.zM[place] ?? -Infinity) > z) z = l.zM[place]!
      top = z === -Infinity ? SAT_NO_TOP_M : Math.min(LEVELS * SAT_STEP_M, z + through(SAT_THICK, z))
      modelTops.set(place, top)
    }
    return top
  }
  const tops = fillTops(f, SAT_FILL_KM / (dLatPx * KM_PER_DEG), noTop)
  const moved = smoothTops(tops, f.cloud, n) // the height each pixel is moved by

  // The moves, at NODES × NODES places of the frame and read between them (east and north, km): the parallax of a km of height
  // (it grows in proportion to the height), and each level's drift, worked out when a pixel of that level is met.
  const parallax = new Float32Array(NODES * NODES * 2)
  const nodeAt = (a: number, b: number): [lat: number, lon: number] => [north - (b / (NODES - 1)) * (north - south), west + (a / (NODES - 1)) * (east - west)] // the weather's own place
  for (let b = 0; b < NODES; b++) {
    for (let a = 0; a < NODES; a++) {
      const par = parallaxKm(...nodeAt(a, b), PARALLAX_AT_M)
      parallax[(b * NODES + a) * 2] = par.east / PARALLAX_AT_M
      parallax[(b * NODES + a) * 2 + 1] = par.north / PARALLAX_AT_M
    }
  }
  const drifts: (Float32Array | undefined)[] = []
  const driftOf = (level: number): Float32Array => {
    const m = new Float32Array(NODES * NODES * 2)
    if (model === null) return m
    for (let b = 0; b < NODES; b++) {
      for (let a = 0; a < NODES; a++) {
        const [lat, lon] = nodeAt(a, b)
        // The model's grid is smaller than the frame: beyond it, its wind at its nearest edge.
        const drift = driftKm(modelWindAt(
          model, Math.min(model.lat0 + (model.n - 1) * model.step, Math.max(model.lat0, lat + dLat)),
          model.lon0 + Math.min((model.n - 1) * model.step, Math.max(0, wrapLon(lon + dLon - model.lon0))), (level * SAT_STEP_M) / FT,
        ), ageMs)
        m[(b * NODES + a) * 2] = drift.east
        m[(b * NODES + a) * 2 + 1] = drift.north
      }
    }
    return m
  }

  // Every pixel the satellite sees, cloud or clear, is moved and lands on the four cells round its place, by its size in cells. A
  // cell's cover is then the cloud's share of what landed on it: where a sloping top pulls the pixels apart (a higher one is moved
  // farther) less lands, of cloud and of all alike, and the cover stays whole.
  const cover = new Float32Array(N * N)
  const landed = new Float32Array(N * N) // of cloud and clear alike
  const weighed = new Float32Array(N * N) // cover × top, for the cells' tops
  const area = (dLonPx * kx * dLatPx * KM_PER_DEG) / (CELL_KM * CELL_KM) // a pixel's size, in cells
  for (let j = 0; j < n; j++) {
    const lat = north - (j + 0.5) * dLatPx + dLat
    const y0 = (lat - job.lat) * KM_PER_DEG
    const nb = (j + 0.5) / n * (NODES - 1)
    const b0 = Math.min(NODES - 2, Math.floor(nb))
    const tb = nb - b0
    for (let i = 0; i < n; i++) {
      const p = j * n + i
      if (f.seen[p] === 0) continue
      const top = tops[p]
      const by = moved[p] // the height it is moved by, m
      // Its drift is read between the two levels round that height: taken a level at a time, a wind that grows with height would
      // carry each step of a sloping top apart from the next (3 km a step under a jet), and tear the deck into strips.
      const level = Math.min(LEVELS, Math.max(1, by / SAT_STEP_M))
      const l0 = Math.min(LEVELS - 1, Math.floor(level))
      const tl = level - l0
      const d0 = (drifts[l0] ??= driftOf(l0))
      const d1 = (drifts[l0 + 1] ??= driftOf(l0 + 1))
      const na = (i + 0.5) / n * (NODES - 1)
      const a0 = Math.min(NODES - 2, Math.floor(na))
      const ta = na - a0
      const k = (b0 * NODES + a0) * 2
      const w00 = (1 - ta) * (1 - tb)
      const w10 = ta * (1 - tb)
      const w01 = (1 - ta) * tb
      const w11 = ta * tb
      /** The move's part e (0 east, 1 north) at node k + o: the parallax of the height, and the drift between the two levels. */
      const at = (o: number, e: number): number => by * parallax[k + o + e] + (1 - tl) * d0[k + o + e] + tl * d1[k + o + e]
      const moveE = w00 * at(0, 0) + w10 * at(2, 0) + w01 * at(2 * NODES, 0) + w11 * at(2 * NODES + 2, 0)
      const moveN = w00 * at(0, 1) + w10 * at(2, 1) + w01 * at(2 * NODES, 1) + w11 * at(2 * NODES + 2, 1)
      const u = (wrapLon(west + (i + 0.5) * dLonPx + dLon - job.lon) * kx + moveE + FIELD_KM / 2) / CELL_KM - 0.5
      const v = (y0 + moveN + FIELD_KM / 2) / CELL_KM - 0.5
      if (!(u > -1 && u < N && v > -1 && v < N)) continue
      const [ci, cj] = [Math.floor(u), Math.floor(v)]
      const [fu, fv] = [u - ci, v - cj]
      const share = f.cloud[p] / 255
      for (let c = 0; c < 4; c++) {
        const [x, y] = [ci + (c & 1), cj + (c >> 1)]
        if (x < 0 || x >= N || y < 0 || y >= N) continue
        const w = area * ((c & 1) === 1 ? fu : 1 - fu) * ((c >> 1) === 1 ? fv : 1 - fv)
        landed[y * N + x] += w
        cover[y * N + x] += w * share
        weighed[y * N + x] += w * share * top
      }
    }
  }
  // A cell's cover: the cloud's share of what landed (of at least LANDED_MIN of a cell: a cell that little reached is not made
  // whole by a wisp). Its top is its cloud's own (before the softening mixes neighbours in), then spread with the cover.
  for (let o = 0; o < N * N; o++) {
    if (cover[o] === 0) continue
    const of = Math.max(landed[o], LANDED_MIN, cover[o])
    weighed[o] /= of
    cover[o] /= of
  }
  const tmp = new Float32Array(N * N)
  soften(cover, N, tmp)
  soften(weighed, N, tmp)
  const topM = new Float32Array(N * N)
  for (let o = 0; o < N * N; o++) {
    if (cover[o] < 1e-3) cover[o] = 0
    else topM[o] = weighed[o] / cover[o]
  }
  // A cell beyond the cover takes its neighbours' top (by their cover): a field reads heights a cell past a cloud's edge.
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const o = j * N + i
      if (cover[o] > 0) continue
      let [sum, by] = [0, 0]
      for (let y = Math.max(0, j - 1); y <= Math.min(N - 1, j + 1); y++) {
        for (let x = Math.max(0, i - 1); x <= Math.min(N - 1, i + 1); x++) {
          sum += cover[y * N + x] * topM[y * N + x]
          by += cover[y * N + x]
        }
      }
      if (by > 0) tmp[o] = sum / by
      else tmp[o] = 0
    }
  }
  for (let o = 0; o < N * N; o++) if (cover[o] === 0) topM[o] = tmp[o]

  const from = baseSources(job.metars, model)
  const baseM = new Float32Array(N * N)
  const seen = new Uint8Array(N * N)
  for (let j = 0; j < N; j++) {
    const lat = job.lat + ((j + 0.5) * CELL_KM - FIELD_KM / 2) / KM_PER_DEG
    const pj = Math.floor((north - (lat - dLat)) / dLatPx)
    for (let i = 0; i < N; i++) {
      const o = j * N + i
      const lon = job.lon + ((i + 0.5) * CELL_KM - FIELD_KM / 2) / kx
      const pi = Math.floor(wrapLon(lon - dLon - west) / dLonPx)
      seen[o] = pi >= 0 && pi < n && pj >= 0 && pj < n ? f.seen[pj * n + pi] : 0
      if (topM[o] > 0) {
        const b = satBase(topM[o], lat, lon, from)
        baseM[o] = b.baseM
        topM[o] = b.topM
      }
    }
  }
  return { timeMs: f.timeMs, n: N, cover, topM, baseM, seen }
}

/** The grid's cell at a place of the field built round lat0, lon0 (its index), or −1 outside the square. */
export function satCell(g: SatGrid, lat0: number, lon0: number, lat: number, lon: number): number {
  const kx = KM_PER_DEG * Math.max(0.01, Math.cos(lat0 * RAD))
  const i = Math.floor((wrapLon(lon - lon0) * kx + FIELD_KM / 2) / (FIELD_KM / g.n))
  const j = Math.floor(((lat - lat0) * KM_PER_DEG + FIELD_KM / 2) / (FIELD_KM / g.n))
  return i >= 0 && i < g.n && j >= 0 && j < g.n ? j * g.n + i : -1
}

/** The share of the cells the satellite sees that are cloud (half cover or more); 0 when it sees none. */
export function gridCloudy(g: SatGrid): number {
  let [seen, cloudy] = [0, 0]
  for (let o = 0; o < g.cover.length; o++) {
    if (g.seen[o] === 0) continue
    seen++
    if (g.cover[o] >= 0.5) cloudy++
  }
  return seen === 0 ? 0 : cloudy / seen
}
