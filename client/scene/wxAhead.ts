// client/scene/wxAhead.ts
// What is ahead on this heading, pure (no Cesium, no DOM, so Node tests cover it): the path the aircraft flies if it changes neither track,
// speed nor climb (aheadPath), what the weather field and the hazard areas hold along it (aheadStatus: the status line's; aheadProfile: the
// ahead strip's side view, of the heights the way goes through: aheadWindow), and the words for it (statusWords). The 3-D view draws the path (Weather3D.setAhead) and the HUD (ui/wxHud.ts)
// shows the rest. Heights are metres above mean sea level, the weather field's own and the pilot's: a hazard area's base and top are read as
// that too (they are flight levels; weather3d.ts draws them at the same number of metres above the ellipsoid, a ponytail of wxGeo.ts).
// The severity scale, its names and colours are here, once, for everything that shows it (the status line, the strip, the menu's legend).
import type { Sigmet } from '../../shared/wx.ts'
import type { Units } from '../ui/units.ts'
import { columnAt, coverAt, coverIn, fieldColumn, type Cover, type WxField } from './wxField.ts'
import { ringContains, wrapLon, type Hazard } from './wxGeo.ts'
import { sigmetColor, sigmetLabel } from './wxText.ts'

export const AHEAD_MIN = 6 // the path: the aircraft now, then each minute to this many; the strip shows as far
export const AHEAD_KM = 80 // how far the status looks, whatever the speed
export const MIN_GS_KT = 40 // under this there is no way ahead (an aircraft taxiing or hovering has none)
export const IN_COVER = 0.3 // the field's cover above which the aircraft is in weather, and weather is on the path (the mock's)
export const STRIP_COVER = 0.25 // and above which the strip draws a cell
export const PROFILE_COLS = 160 // the strip's cells: along the path (the AHEAD_MIN minutes: 2.25 s of the way each) …
export const PROFILE_ROWS = 50 // … and up (a fiftieth of the heights shown: 60 m each, or 250 m of the whole sky)
export const PROFILE_SPAN_M = 3000 // how much height the strip shows round the way ahead (aheadWindow) …
export const PROFILE_TOP_M = 12_500 // … or the whole sky, from the sea up to this, when the viewer asks for it
const SPAN_NEAR = 1 / 3 // the window's middle is never further than this share of the span from the aircraft: a sixth of it stays clear over or under the aircraft
const SPAN_SLACK = 1 / 12 // and it may stand this share of the span off where it would best be before the window follows
const WORST_KM = 8 // the severity named for the first weather is the worst of this much of it
const KEPT_SPEED = 2 / PROFILE_COLS // a profile is kept while the minutes it shows are as long as the path's to within this: two cells at its far end
const STEP_KM = AHEAD_KM / PROFILE_COLS // the status looks along the path this often
const R_KM = 6371 // the sphere the field and the hazard areas are laid on (wxGeo.ts, wxField.ts)
const RAD = Math.PI / 180
const FT = 0.3048
const KM_PER_NM = 1.852

/** The severity scale (cloudField.ts SEV): 0 cloud, 1 light rain or snow, 2 heavy rain, 3 thunderstorm. */
export const SEV_COLOR: readonly string[] = ['#f2f5f8', '#58a6ff', '#ffbe3d', '#ff4d3d']
export const SEV_NAME: readonly string[] = ['cloud', 'light rain', 'heavy rain', 'a thunderstorm']
/** The whole step of the scale a field's severity (0 … 3, mixed between texels) falls on. */
export const sevOf = (s: number): number => Math.min(3, Math.max(0, Math.round(s)))

/** A place on the path: degrees, and metres above mean sea level. */
export interface AheadPoint {
  lat: number
  lon: number
  altM: number
}

/** The aircraft now, then where it is after each minute up to AHEAD_MIN; kmPerMin is one minute's way along the great circle. */
export interface AheadPath {
  points: AheadPoint[]
  kmPerMin: number
}

/** The way ahead on a great circle along trackDeg at gsKt, the height changing by vsFpm each minute (never below 0). Null under MIN_GS_KT, or for a number that is no number. */
export function aheadPath(a: AheadPoint, trackDeg: number, gsKt: number, vsFpm: number): AheadPath | null {
  if (!(gsKt >= MIN_GS_KT) || ![a.lat, a.lon, a.altM, trackDeg, vsFpm].every(Number.isFinite)) return null
  const kmPerMin = (gsKt * KM_PER_NM) / 60
  const [sinLat, cosLat] = [Math.sin(a.lat * RAD), Math.cos(a.lat * RAD)]
  const points: AheadPoint[] = [{ lat: a.lat, lon: a.lon, altM: a.altM }]
  for (let i = 1; i <= AHEAD_MIN; i++) {
    const p = destination(sinLat, cosLat, a.lon, trackDeg * RAD, (i * kmPerMin) / R_KM, { lat: 0, lon: 0, altM: 0 })
    p.altM = Math.max(0, a.altM + vsFpm * FT * i)
    points.push(p)
  }
  return { points, kmPerMin }
}

/** The place the great circle from (lat, lon) leaves along `bearing` reaches after the angle `arc` (radians), written into out (its height left alone). */
function destination(sinLat: number, cosLat: number, lon: number, bearing: number, arc: number, out: AheadPoint): AheadPoint {
  const [sinArc, cosArc] = [Math.sin(arc), Math.cos(arc)]
  const sinLat2 = sinLat * cosArc + cosLat * sinArc * Math.cos(bearing)
  out.lat = Math.asin(Math.max(-1, Math.min(1, sinLat2))) / RAD
  out.lon = wrapLon(lon + Math.atan2(Math.sin(bearing) * sinArc * cosLat, cosArc - sinLat * sinLat2) / RAD)
  return out
}

/** Where the path stands km along it: its great circle (the way from its first point to its second) carried on past the last minute; its height straight between the minutes, and beyond the last the last minute's change, never below 0. */
function walker(path: AheadPath): (km: number, out: AheadPoint) => AheadPoint {
  const { points, kmPerMin } = path
  const [a, b] = [points[0], points[1]]
  const [lat1, lat2, dLon] = [a.lat * RAD, b.lat * RAD, (b.lon - a.lon) * RAD]
  const bearing = Math.atan2(Math.sin(dLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon))
  const [sinLat, cosLat] = [Math.sin(lat1), Math.cos(lat1)]
  const last = points.length - 2
  return (km, out) => {
    const m = Math.max(0, km) / kmPerMin
    const k = Math.min(Math.floor(m), last)
    destination(sinLat, cosLat, a.lon, bearing, Math.max(0, km) / R_KM, out)
    out.altM = Math.max(0, points[k].altM + (points[k + 1].altM - points[k].altM) * (m - k))
    return out
  }
}

/** The path's place and height km along it (into `out` when one is given). */
export function pathPointAt(path: AheadPath, km: number, out: AheadPoint = { lat: 0, lon: 0, altM: 0 }): AheadPoint {
  return walker(path)(km, out)
}

/** What the status line says of the weather and the hazard areas on the path. */
export interface AheadStatus {
  known: boolean // whether the sky is known at all (a weather source has answered): when not, nothing is said of the weather, and `cloud` is clear air
  cloud: { inside: boolean; sev: number; inMin: number | null } // inMin: minutes to the first weather on the path (0 inside it); null: none within reach. sev: inside, the weather the aircraft is in; else the worst of the first WORST_KM km of what is ahead
  hazard: { inside: boolean; inMin: number | null; text: string; color: string } | null // the hazard area the aircraft is in, else the nearest on the path, with its own colour (wxText.ts sigmetColor); null: none. Inside: from its base to under its top
}

/** Whether the point is in the hazard area's volume: within one of its rings, from its base up to under its top. */
const within = (h: Hazard, lat: number, lon: number, altM: number): boolean => altM >= h.baseM && altM < h.topM && h.rings.some((r) => ringContains(r, lat, lon))

/**
 * What the aircraft is in and what lies ahead: the field's cover at the aircraft (above IN_COVER: in weather), else the first place along
 * the path, looked at every half km to AHEAD_KM, where it is; and the hazard area the aircraft is in (above its base, under its top), else
 * the first one the path enters. `label` gives a hazard area's words. `known`: whether any weather source has answered; until one
 * has, the field (empty, not missing) says nothing, and is not read.
 */
export function aheadStatus(path: AheadPath, field: WxField | null, hazards: readonly Hazard[], label: (h: Hazard) => string, known = true): AheadStatus {
  const walk = walker(path)
  const [here, p, cell] = [path.points[0], { lat: 0, lon: 0, altM: 0 }, { cover: 0, sev: 0 }]
  let cloud: AheadStatus['cloud'] = { inside: false, sev: 0, inMin: null }
  if (known && field !== null && !field.empty) {
    if (coverAt(field, here.lat, here.lon, here.altM, cell).cover > IN_COVER) cloud = { inside: true, sev: sevOf(cell.sev), inMin: 0 }
    else {
      let [first, worst] = [-1, 0] // the first weather on the way, and the worst of its first WORST_KM km
      for (let i = 1; i <= PROFILE_COLS; i++) {
        const d = i * STEP_KM
        walk(d, p)
        if (coverAt(field, p.lat, p.lon, p.altM, cell).cover > IN_COVER) {
          if (first < 0) first = d
          if (d - first > WORST_KM) break
          worst = Math.max(worst, sevOf(cell.sev))
        } else if (first >= 0) break
      }
      if (first >= 0) cloud = { inside: false, sev: worst, inMin: first / path.kmPerMin }
    }
  }
  let hazard: AheadStatus['hazard'] = null
  const now = hazards.find((h) => within(h, here.lat, here.lon, here.altM))
  if (now !== undefined) hazard = { inside: true, inMin: 0, text: label(now), color: sigmetColor(now.sigmet.hazard) }
  else if (hazards.length > 0) {
    for (let i = 1; i <= PROFILE_COLS && hazard === null; i++) {
      const d = i * STEP_KM
      walk(d, p)
      const next = hazards.find((h) => within(h, p.lat, p.lon, p.altM))
      if (next !== undefined) hazard = { inside: false, inMin: d / path.kmPerMin, text: label(next), color: sigmetColor(next.sigmet.hazard) }
    }
  }
  return { known, cloud, hazard }
}

/** The heights the strip shows, metres above mean sea level. */
export interface AheadWindow {
  baseM: number
  topM: number
}

/**
 * The heights the strip shows for this way ahead: not the whole sky, where an aircraft at 2,000 ft and the cloud it is about to meet
 * are a few pixels, but PROFILE_SPAN_M of it, a whole row at a time, never under the sea: round the middle of the way's heights (now,
 * and each minute to AHEAD_MIN) when it holds them, else with the aircraft a sixth of the span from its top (a steep descent) or its
 * foot (a steep climb), so as much of the way as there is room for is in it. `was`: the window before. It is given back, itself,
 * while it still holds: the window follows only when it is more than a twelfth of the span off that place, and then by what it is
 * over; so in level flight it stands still, in a climb it goes up with the aircraft, and a vertical speed that wavers moves nothing.
 * Its span never changes of itself: `whole` (the viewer's choice) is the sky from the sea up instead.
 */
export function aheadWindow(path: AheadPath, was: AheadWindow | null = null, whole = false): AheadWindow {
  const span = whole ? PROFILE_TOP_M : PROFILE_SPAN_M
  const held = was !== null && was.topM - was.baseM === span
  let baseM = 0
  if (!whole) {
    let [lo, hi] = [Infinity, -Infinity]
    for (const p of path.points) {
      lo = Math.min(lo, p.altM)
      hi = Math.max(hi, p.altM)
    }
    const now = path.points[0].altM
    const best = Math.max(now - span * SPAN_NEAR, Math.min(now + span * SPAN_NEAR, (lo + hi) / 2))
    const centre = held ? Math.max(best - span * SPAN_SLACK, Math.min(best + span * SPAN_SLACK, was.baseM + span / 2)) : best
    const rowM = span / PROFILE_ROWS
    baseM = Math.max(0, Math.round((centre - span / 2) / rowM) * rowM)
  }
  return held && was.baseM === baseM ? was : { baseM, topM: baseM + span }
}

/** The ahead strip's side view: PROFILE_COLS × PROFILE_ROWS cells; cell (i, j) is at index j × cols + i, i counting from the aircraft out and j from the window's base up. */
export interface AheadProfile extends AheadWindow {
  cols: number
  rows: number
  kmAhead: number // AHEAD_MIN minutes of the way, at the speed it was made at
  cover: Float32Array // the field's cover at each cell's middle, on the path (wxField.ts coverAt)
  sev: Float32Array // and its severity
  hazards: { fromKm: number; toKm: number; baseM: number; topM: number; color: string }[] // each stretch of the path inside a hazard area's rings, nearest first, with the area's heights and its colour (wxText.ts sigmetColor)
  contacts: { fromKm: number; toKm: number; sev: number }[] // each stretch of the way that is in weather (the field's cover at the way's own height above IN_COVER, the status line's measure), nearest first, with the worst severity in it
}

/**
 * The field along the path, 160 cells along its AHEAD_MIN minutes by 50 up the heights shown (`win`: aheadWindow's); where the path
 * is inside a hazard area; and where the way itself is in weather. Each place on the path is read from the field once, for all its
 * fifty heights and the way's own (wxField.ts columnAt). `reuse`: a profile made before, whose arrays this one fills and has (the
 * profile given back is a new object: one that shows it sees that it is another).
 */
export function aheadProfile(path: AheadPath, field: WxField | null, hazards: readonly Hazard[], reuse?: AheadProfile, win: AheadWindow = aheadWindow(path)): AheadProfile {
  const [cols, rows] = [PROFILE_COLS, PROFILE_ROWS]
  const [cover, sev] = reuse === undefined ? [new Float32Array(cols * rows), new Float32Array(cols * rows)] : [reuse.cover, reuse.sev]
  const out: AheadProfile['hazards'] = []
  const contacts: AheadProfile['contacts'] = []
  const walk = walker(path)
  const p = { lat: 0, lon: 0, altM: 0 }
  const cell: Cover = { cover: 0, sev: 0 }
  const col = fieldColumn()
  const live = field !== null && !field.empty
  if (reuse !== undefined && !live) {
    cover.fill(0)
    sev.fill(0)
  }
  const kmAhead = AHEAD_MIN * path.kmPerMin
  const stepKm = kmAhead / cols
  const { baseM, topM } = win
  const rowM = (topM - baseM) / rows
  const open = hazards.map(() => -1) // each hazard area: the column its run in progress began at
  const close = (k: number, end: number): void => {
    out.push({ fromKm: open[k] * stepKm, toKm: end * stepKm, baseM: hazards[k].baseM, topM: hazards[k].topM, color: sigmetColor(hazards[k].sigmet.hazard) })
  }
  let [met, worst] = [-1, 0] // the column the weather the way is in began at, and the worst of it so far
  for (let i = 0; i < cols; i++) {
    walk((i + 0.5) * stepKm, p)
    let inside = false
    if (live) {
      columnAt(field, p.lat, p.lon, col)
      for (let j = 0; j < rows; j++) {
        coverIn(col, baseM + (j + 0.5) * rowM, cell)
        cover[j * cols + i] = cell.cover
        sev[j * cols + i] = cell.sev
      }
      inside = coverIn(col, p.altM, cell).cover > IN_COVER
    }
    if (inside) {
      if (met < 0) [met, worst] = [i, 0]
      worst = Math.max(worst, sevOf(cell.sev))
    } else if (met >= 0) {
      contacts.push({ fromKm: met * stepKm, toKm: i * stepKm, sev: worst })
      met = -1
    }
    hazards.forEach((h, k) => {
      const on = h.rings.some((r) => ringContains(r, p.lat, p.lon))
      if (on && open[k] < 0) open[k] = i
      else if (!on && open[k] >= 0) {
        close(k, i)
        open[k] = -1
      }
    })
  }
  if (met >= 0) contacts.push({ fromKm: met * stepKm, toKm: kmAhead, sev: worst }) // still in it at the strip's end
  for (let k = 0; k < hazards.length; k++) if (open[k] >= 0) close(k, cols) // still on at the strip's end
  out.sort((a, b) => a.fromKm - b.fromKm)
  return { cols, rows, kmAhead, baseM, topM, cover, sev, hazards: out, contacts }
}

/** A profile, and what it was made of: the field, the hazard areas, and the two ends of its path (the aircraft, and the strip's far end). */
export interface KeptProfile {
  profile: AheadProfile
  field: WxField | null
  hazards: readonly Hazard[]
  from: { lat: number; lon: number }
  to: { lat: number; lon: number }
}

/** Km between two places near each other, on the plane round the first. */
const kmApart = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number =>
  Math.hypot((b.lat - a.lat) * RAD * R_KM, wrapLon(b.lon - a.lon) * RAD * R_KM * Math.cos(a.lat * RAD))

/**
 * The strip's profile for this path, field and hazard areas: the one kept, while it would show the same (the same field, the same
 * list of hazard areas, the same heights (aheadWindow, from the kept one's; `whole`: the whole sky), minutes as long as the path's
 * to within two cells, and a path whose first place and whose place at the strip's far end have each moved less than half a cell
 * since it was made); else made again, in the kept one's arrays. That is once a second or so, where the strip is looked at four
 * times a second.
 */
export function keepProfile(kept: KeptProfile | null, path: AheadPath, field: WxField | null, hazards: readonly Hazard[], whole = false): KeptProfile {
  const win = aheadWindow(path, kept?.profile ?? null, whole)
  const from = path.points[0]
  if (kept !== null && win === kept.profile && kept.field === field && kept.hazards === hazards) {
    const { kmAhead, cols } = kept.profile
    const halfCell = (0.5 * kmAhead) / cols
    if (Math.abs(AHEAD_MIN * path.kmPerMin - kmAhead) < KEPT_SPEED * kmAhead && kmApart(kept.from, from) < halfCell && kmApart(kept.to, pathPointAt(path, kmAhead)) < halfCell) return kept
  }
  const profile = aheadProfile(path, field, hazards, kept?.profile, win)
  const to = pathPointAt(path, profile.kmAhead)
  return { profile, field, hazards, from: { lat: from.lat, lon: from.lon }, to: { lat: to.lat, lon: to.lon } }
}

/**
 * The status line in words: the weather ("In light rain", "Clear air · a thunderstorm in 3 min", "Clear air ahead"; "No weather data" while the sky is not known)
 * with its severity's step (null: none ahead), and the hazard area ("Inside hazard area · …", "Hazard area in 2 min · …"), or null.
 */
export function statusWords(s: AheadStatus): { cloud: string; sev: number | null; hazard: string | null } {
  const { inside, inMin } = s.cloud
  const sev = sevOf(s.cloud.sev)
  let cloud = s.known ? 'Clear air ahead' : 'No weather data'
  let step: number | null = null
  if (s.known && inside) [cloud, step] = [`In ${SEV_NAME[sev]}`, sev]
  else if (s.known && inMin !== null) [cloud, step] = [`Clear air · ${SEV_NAME[sev]} in ${inMin < 1 ? 'under a minute' : `${Math.round(inMin)} min`}`, sev]
  const h = s.hazard
  const hazard = h === null ? null : h.inside ? `Inside hazard area · ${h.text}` : `Hazard area ${h.inMin === null ? 'ahead' : `in ${Math.max(1, Math.round(h.inMin))} min`} · ${h.text}`
  return { cloud, sev: step, hazard }
}

/**
 * A hazard area's name and heights as a phrase to follow "Inside hazard area ·": the map label's words ("Embedded thunderstorms · up to
 * 35,000 ft") with the first one lowercase (a code that has no words, "SQL", keeps its capitals) and a comma for the dot.
 */
export function hazardWords(s: Sigmet, u: Units): string {
  const label = sigmetLabel(s, u)
  return label.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase()).replace(' · ', ', ')
}
