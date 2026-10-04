// client/scene/fieldPlace.ts
// Where a weather field is built for an aircraft, and when the next one is due. Pure (no Cesium, no DOM), so Node tests cover it.
// The cloud volume shows a field's cover whole within 150 km of the field's middle, east–west and north–south (cloudShaders.ts RIM_KM:
// it fades out over the 8 km past that), and it shows the weather whole within 130 km of the aircraft (REACH_KM: fading to nothing at
// 150). So nothing of what is whole is cut while the aircraft is within FIELD_SLACK_KM, 20 km, of the field's middle on each axis: a
// square of 40 km. A field built round the aircraft's own place (as it was, and built again 30 km on) cuts the reach ahead from the
// first km flown. So a field is built round a place ahead of the aircraft on its track, as far ahead as leaves the aircraft just
// inside that square: 20 km on a track along an axis, 28 km on a diagonal. The aircraft then has the whole square to cross before
// the field runs out, 40 to 57 km, and the next field is asked for FIELD_LEAD_KM, 5 km, before it does. At 450 kt (13.9 km a minute)
// that is a field every 35 to 52 km, every 2.5 to 3.7 minutes (it was every 30 km, 2.2 minutes), asked for 22 s before it is needed;
// made off the main thread (fieldBuilder.ts), it is drawn a fraction of a second after it is asked for.
// An aircraft with no known track has its field round its own place, and the next when it is within 5 km of the square's side.
// Places are on the field's own flat map (wxField.ts: east–west by the longitude difference times cos(lat) of the field's middle).
import { wrapLon } from './wxGeo.ts'

/** The aircraft may stand this far from its field's middle, east–west and north–south, with nothing of the weather shown whole cut. */
export const FIELD_SLACK_KM = 20
/** The next field is asked for when the aircraft has this far left to fly inside that square. */
export const FIELD_LEAD_KM = 5
const ON_SIDE_KM = 1e-6 // an aircraft this little past the square's side is on it (a field's middle is laid so that it starts there)
const KM_PER_DEG = 111.195 // of latitude, on a sphere of 6,371 km
const RAD = Math.PI / 180
const kmPerLon = (lat: number): number => KM_PER_DEG * Math.max(0.01, Math.cos(lat * RAD))

/** The place a field is built round for an aircraft at lat, lon flying trackDeg (degrees true; none known: its own place). */
export function fieldCentre(lat: number, lon: number, trackDeg: number | undefined): { lat: number; lon: number } {
  if (trackDeg === undefined || !Number.isFinite(trackDeg)) return { lat, lon }
  const [east, north] = [Math.sin(trackDeg * RAD), Math.cos(trackDeg * RAD)]
  const ahead = FIELD_SLACK_KM / Math.max(Math.abs(east), Math.abs(north))
  const at = Math.min(89.9, Math.max(-89.9, lat + (ahead * north) / KM_PER_DEG))
  return { lat: at, lon: wrapLon(lon + (ahead * east) / kmPerLon(at)) }
}

/**
 * How far the aircraft at lat, lon can still fly along trackDeg before it leaves the square round the field's middle, km: nothing
 * once it is outside. With no track known, how far it is from the square's nearest side.
 */
export function fieldRoomKm(centre: { lat: number; lon: number }, lat: number, lon: number, trackDeg: number | undefined): number {
  const x = wrapLon(lon - centre.lon) * kmPerLon(centre.lat)
  const y = (lat - centre.lat) * KM_PER_DEG
  const S = FIELD_SLACK_KM
  if (!(Math.abs(x) <= S + ON_SIDE_KM && Math.abs(y) <= S + ON_SIDE_KM)) return 0
  if (trackDeg === undefined || !Number.isFinite(trackDeg)) return S - Math.max(Math.abs(x), Math.abs(y))
  const [east, north] = [Math.sin(trackDeg * RAD), Math.cos(trackDeg * RAD)]
  const to = (at: number, way: number): number => (Math.abs(way) < 1e-9 ? Infinity : ((way > 0 ? S : -S) - at) / way)
  return Math.max(0, Math.min(to(x, east), to(y, north)))
}

/** Whether the next field is due: the aircraft has less than FIELD_LEAD_KM left in the square of the field built round `centre` (none yet: due). */
export const fieldDue = (centre: { lat: number; lon: number }, lat: number, lon: number, trackDeg: number | undefined): boolean =>
  !(fieldRoomKm(centre, lat, lon, trackDeg) >= FIELD_LEAD_KM)
