// client/scene/satPlace.ts
// Where a cloud the weather satellite sees really stands now: the two moves between a pixel of its picture (satellite.ts) and the
// cloud's place in the sky drawn. Pure geometry (no Cesium, no DOM), so Node tests cover it.
// - Parallax. The satellite looks at the Earth slantwise, so a cloud top at a height is drawn in its picture where the line of sight
//   through it meets the ground: farther from the point under the satellite than the cloud is, by about the height times the tangent
//   of the angle the satellite stands from the zenith there. Over Israel that angle is 53° from Meteosat at 0°: a 10 km top is drawn
//   13 km out of place, to the north-east. parallaxKm gives the move back: along the line of sight up to the top's height, then
//   straight down. On a sphere of 6,371 km, as the weather's maps are.
// - Drift. A frame is 15 to 35 minutes old when it is drawn, and the cloud has gone with the wind since. driftKm moves it by the
//   wind at its top's level (the forecast model's: modelWind.ts) for the frame's age, DRIFT_MAX_KM at most: past that the wind's
//   guess says more than the picture.
// EUMETSAT's pictures are not corrected for parallax already: nothing read says, so it was checked (2026-10-04) with the same sky at
// the same frame from the two satellites, at 0° and at 45.5° E. High cloud (tops of 9 to 10.5 km) stood 15 km apart in the two
// pictures over Rhodes and 20 km apart over the south of France, east to west; the two parallaxes there differ by 12 and 18 km. Had
// the pictures been corrected, the cloud would stand at one place in both.
import type { ModelWind } from './modelWind.ts'
import { wrapLon } from './wxGeo.ts'

const EARTH_KM = 6371
const ORBIT_KM = 42_164 // a geostationary satellite's distance from the Earth's centre
const KM_PER_DEG = 111.195 // of latitude, on that sphere
const KM_PER_KT_H = 1.852
const RAD = Math.PI / 180
/** The longitude Meteosat's prime service stands over. */
export const SAT_LON = 0
/** A cloud is carried by the wind no farther than this. */
export const DRIFT_MAX_KM = 40

/** A move over the ground, km. */
export interface Move {
  east: number
  north: number
}

/** The place on the unit sphere, x toward 0° N 0° E, z toward the north pole. */
const unit = (lat: number, lon: number): [number, number, number] => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)]

/** From a place on the ground: the way to the satellite (a unit vector) and how far up that way points (the cosine of the satellite's zenith angle there). */
function sight(lat: number, lon: number, satLon: number): { p: [number, number, number]; e: [number, number, number]; up: number } {
  const p = unit(lat, lon)
  const s = unit(0, satLon)
  const d: [number, number, number] = [s[0] * ORBIT_KM - p[0] * EARTH_KM, s[1] * ORBIT_KM - p[1] * EARTH_KM, s[2] * ORBIT_KM - p[2] * EARTH_KM]
  const len = Math.hypot(d[0], d[1], d[2])
  const e: [number, number, number] = [d[0] / len, d[1] / len, d[2] / len]
  return { p, e, up: p[0] * e[0] + p[1] * e[1] + p[2] * e[2] }
}

/** How far the satellite over satLon stands from the zenith at a place, degrees: 0 under it, 90 where it is on the horizon. */
export function satZenithDeg(lat: number, lon: number, satLon = SAT_LON): number {
  return Math.acos(Math.min(1, Math.max(-1, sight(lat, lon, satLon).up))) / RAD
}

/**
 * The move from where the satellite's picture shows a cloud top (lat, lon) to where that top stands, for a top topM above the sea:
 * toward the point under the satellite. Nothing for a top at the ground, or at a place the satellite does not see.
 */
export function parallaxKm(lat: number, lon: number, topM: number, satLon = SAT_LON): Move {
  if (!(topM > 0) || !Number.isFinite(lat) || !Number.isFinite(lon)) return { east: 0, north: 0 }
  const { p, e, up } = sight(lat, lon, satLon)
  if (!(up > 0)) return { east: 0, north: 0 }
  // Along the line of sight from the ground, t km on, the height is h: (R p + t e)² = (R + h)².
  const h = topM / 1000
  const b = EARTH_KM * up
  const t = -b + Math.sqrt(b * b + 2 * EARTH_KM * h + h * h)
  const [x, y, z] = [EARTH_KM * p[0] + t * e[0], EARTH_KM * p[1] + t * e[1], EARTH_KM * p[2] + t * e[2]]
  const under = { lat: Math.asin(z / Math.hypot(x, y, z)) / RAD, lon: Math.atan2(y, x) / RAD }
  return { east: wrapLon(under.lon - lon) * KM_PER_DEG * Math.cos(lat * RAD), north: (under.lat - lat) * KM_PER_DEG }
}

/** The move of a cloud in ageMs with this wind (where it blows from, and how hard): downwind, DRIFT_MAX_KM at most. Nothing with no wind. */
export function driftKm(wind: ModelWind | null, ageMs: number): Move {
  if (wind === null || !(ageMs > 0) || !Number.isFinite(wind.fromDeg) || !Number.isFinite(wind.kt)) return { east: 0, north: 0 }
  const km = Math.min(DRIFT_MAX_KM, (wind.kt * KM_PER_KT_H * ageMs) / 3_600_000)
  // (+ 0: a wind from due west has no northward part, not a part of −0.)
  return { east: -km * Math.sin(wind.fromDeg * RAD) + 0, north: -km * Math.cos(wind.fromDeg * RAD) + 0 }
}
