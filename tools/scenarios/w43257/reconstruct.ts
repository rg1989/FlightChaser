// tools/scenarios/w43257/reconstruct.ts
// Builds public/scenarios/w43257/track.csv for Wizz Air 3257 (10 Oct 2026, Airbus A321 HA-LXF, callsign WMT7403,
// Bucharest → Tel Aviv, diverted to Larnaca), line-up to landing, from the aircraft's own broadcasts:
//   - 03:14–04:43, its ADS-B as adsb.lol's receivers heard it (the tar1090 trace of the day: GPS positions, pressure
//     and GNSS altitude, airspeed, ground velocity; ODbL), and as ADS-B Exchange's heard it where adsb.lol's did not
//     (the take-off roll; 03:47–03:53, 04:04–04:29 and 04:33–04:38 over Turkey);
//   - 04:43:27–05:21:49, no position: west of Cyprus the broadcasts stop carrying one (the satellite-navigation
//     interference of the eastern Mediterranean; the position quality falls to NIC 0 at 04:41:48). ADS-B Exchange's
//     receivers still hear the pressure altitude, the airspeed, the ground speed and the track, in three bursts
//     (04:51:49–04:53:58, 05:03:39–05:05:39, 05:09:47–05:12:06). The path there is those speeds and tracks flown on from
//     the last GPS position (dead reckoning). Not heard, and built:
//       · the turn back, somewhere in 04:53:58–05:03:39 (on 142° for Tel Aviv before, on 031° after): a left turn at 25°
//         of bank, begun at T1;
//       · the turn from 031° to 015°, somewhere in 05:05:39–05:09:47, begun at T2;
//     T1 and T2 are the pair that takes the path closest to where ADS-B Exchange's multilateration puts the aircraft at
//     05:05 and 05:11–05:12 (the fixes of each burst that fit the landing: its other fixes there, ~35 nm to the
//     west-south-west, would need 350 kt down the approach);
//       · 05:12:06–05:21:54, the approach: on along 015°, a left turn onto runway 22's centreline, down the 3° glidepath
//         to where the GPS position returns (05:21:49 and 05:21:54, on short final), slowing from 302 to 147 kt;
//   - the landing: 50 ft over the displaced threshold, touchdown 350 m past it, braking at 1.8 m/s² to taxi speed.
// Smoothed by the scenario builders' physics (tools/scenarios/fuse.ts). The attitude is the app's flight-mechanics model
// (client/track/attitude.ts) on that path.
//
//   node tools/scenarios/w43257/reconstruct.ts <adsb.lol trace_full_471f67.json> <ADS-B Exchange trace_full_471f67.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { AttitudeFilter, NORMAL_LIMITS, aeroPitchRoll } from '../../../client/track/attitude.ts'
import type { Knot3, Obs } from '../../../client/track/smoother.ts'
import { trueAirspeedKt } from '../../../client/track/airspeed.ts'
import { bearingDeg, destination, distanceNm } from '../../../shared/geo.ts'
import { geoidN } from '../../../shared/geoid.ts'
import { fuseGround, fuseHeight, knotAt, type HeightObs, type RateObs } from '../fuse.ts'

const FT = 0.3048
const KT = 1852 / 3600
const DEG = 180 / Math.PI
const DAY0 = Date.UTC(2026, 9, 10) / 1000
const M_PER_DEG = 111_195
const START = hms('03:14:50') // lined up, stopped
const ROLL_T0 = hms('03:15:08') // 27.5 kt 82 m on at 03:15:20
const LIFT_T = hms('03:15:56') // 159 kt on the runway at 03:15:53, ~100 ft up at 03:16:00
const GPS_LOST = hms('04:43:27') // the last broadcast with a position
const TURN_FROM = hms('04:53:58') // last heard on 142°
const TURN_BY = hms('05:03:39') // first heard on 031°
const LAST_VEL = hms('05:12:06') // last heard before the approach
const FIX = hms('05:21:54') // the last reception: short final, GPS position back
const POS_SD_M = 15
const VEL_SD_MS = 2
const ALT_SD_FT = 25
const BANK_DEG = 25 // the turn back
const TRK_B = 31.5 // heard 05:03:39–05:05:39
const TRK_C = 15.2 // heard 05:09:47–05:12:06
const W2 = 0.8 // °/s, the 16° turn onto 015°: ~15° of bank at 360 kt

function hms(s: string): number {
  const [h, m, sec] = s.split(':').map(Number)
  return h * 3600 + m * 60 + sec
}
const clock = (t: number): string => {
  const s = Math.round(t)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const dir = (deg: number): [number, number] => [Math.sin(deg / DEG), Math.cos(deg / DEG)]
const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1]
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

// ---- the runways (public/scenarios/w43257/airport.json) -------------------------------------------------------------
const END08L = [44.5765, 26.0839] as const
const END26R = [44.5798, 26.1278] as const
const HDG08L = bearingDeg(END08L[0], END08L[1], END26R[0], END26R[1])
const LEN08L_M = distanceNm(END08L[0], END08L[1], END26R[0], END26R[1]) * 1852
const LINEUP = [44.576706, 26.084943] as const // where it stood 03:14:32–03:15:08
const along08L = (lat: number, lon: number): number => distanceNm(END08L[0], END08L[1], lat, lon) * 1852
const elev08L = (s: number): number => 313 + (303 - 313) * clamp01(s / LEN08L_M)
const END22 = [34.883202, 33.635498] as const
const END04 = [34.864185, 33.612255] as const
const HDG22 = bearingDeg(END22[0], END22[1], END04[0], END04[1])
const thr = destination(END22[0], END22[1], HDG22, (575 * FT) / 1852) // displaced 575 ft
const THR22 = [thr.lat, thr.lon] as const
const LEN22_M = distanceNm(THR22[0], THR22[1], END04[0], END04[1]) * 1852
const elev22 = (s: number): number => 6 + (11 - 6) * clamp01(s / LEN22_M)
// Larnaca, in metres east and north of the 22 threshold.
const c22 = Math.cos(THR22[0] / DEG)
const en22 = (lat: number, lon: number): [number, number] => [(lon - THR22[1]) * M_PER_DEG * c22, (lat - THR22[0]) * M_PER_DEG]
const ll22 = (e: number, n: number): [number, number] => [THR22[0] + n / M_PER_DEG, THR22[1] + e / (M_PER_DEG * c22)]
const out22 = dir(HDG22 - 180) // out along the approach
const glideFt = (alongM: number): number => elev22(0) + 50 + (alongM / FT) * Math.tan(3 / DEG)

// ---- the sources ----------------------------------------------------------------------------------------------------
// tar1090 trace rows: [dt, lat, lon, alt_baro | "ground", gs, track, flags, baro_rate, details | null, kind, alt_geom,
// geom_rate, ias, roll]; flags & 1: the first position after a pause. alt_geom is the GNSS height above the WGS84 ellipsoid.
type Row = [number, number, number, number | 'ground', number | null, number | null, number, number | null, Record<string, unknown> | null, string, number | null, number | null, number | null, number | null]
const [lolFile, adxFile] = process.argv.slice(2)
if (!lolFile || !adxFile) throw new Error('usage: reconstruct.ts <adsb.lol trace_full_471f67.json> <ADS-B Exchange trace_full_471f67.json>')
const load = (file: string): Array<{ t: number; r: Row }> => {
  const j = JSON.parse(readFileSync(file, 'utf8')) as { timestamp: number; trace: Row[] }
  return j.trace.map((r) => ({ t: j.timestamp + r[0] - DAY0, r })).filter(({ t }) => t >= START && t <= FIX + 1)
}
const lol = load(lolFile).filter(({ t, r }) => t <= GPS_LOST + 1 && (r[6] & 1) === 0)
const adx = load(adxFile)
const lolTimes = lol.map((p) => p.t)
/** Where adsb.lol heard nothing for over a minute: ADS-B Exchange fills in. */
const unheard = (t: number): boolean => {
  const i = lolTimes.findIndex((x) => x > t)
  const [a, b] = [i <= 0 ? (i === 0 ? -Infinity : lolTimes[lolTimes.length - 1]) : lolTimes[i - 1], i < 0 ? Infinity : lolTimes[i]]
  return b - a > 60 && t - a > 3 && b - t > 3
}
const gps = [...lol, ...adx.filter(({ t, r }) => t <= GPS_LOST + 1 && (r[6] & 1) === 0 && unheard(t))].sort((a, b) => a.t - b.t)
const lost = adx.filter(({ t, r }) => t > GPS_LOST + 1 && r[9] === 'mlat')
const fixes = adx.filter(({ t, r }) => t > LAST_VEL && r[9] === 'adsb_icao')
if (fixes.length === 0) throw new Error('no GPS position on the final')

/** A horizontal observation, in degrees and true east/north m/s. */
interface HO { t: number; lat: number | null; lon: number | null; sd: number; ve: number | null; vn: number | null; sdV: number }
const hos: HO[] = []
const vObs: HeightObs[] = []
const rObs: RateObs[] = []
const iasPts: Array<{ t: number; kt: number }> = []
const windPts: Array<{ t: number; wx: number; wy: number }> = []
const deltas: Array<{ baro: number; d: number }> = [] // GNSS − pressure altitude by height: the day's air
const heard: number[] = [] // receptions with the aircraft's own position
const noteDetails = (t: number, r: Row): void => {
  const det = r[8]
  if (det !== null && typeof det.wd === 'number' && typeof det.ws === 'number' && typeof det.roll === 'number' && Math.abs(det.roll) < 5) {
    windPts.push({ t, wx: -Math.sin(det.wd / DEG) * det.ws * KT, wy: -Math.cos(det.wd / DEG) * det.ws * KT })
  }
  const ias = r[12]
  if (ias !== null && ias > 60) iasPts.push({ t, kt: ias })
}

// Lined up on 08L, then the roll as heard.
for (let t = START; t <= ROLL_T0 - 2; t += 1) {
  hos.push({ t, lat: LINEUP[0], lon: LINEUP[1], sd: 2, ve: 0, vn: 0, sdV: 0.3 })
  vObs.push({ t, hFt: elev08L(along08L(LINEUP[0], LINEUP[1])), sdFt: 3, sdT: 0 })
}
let lastPos = ''
let lastVel = ''
const heights: Array<{ t: number; baro: number; geom: number | null; lat: number; lon: number }> = []
for (const { t, r } of gps) {
  const [lat, lon, alt, gs, trk] = [r[1], r[2], r[3], r[4], r[5]]
  if (t < LIFT_T) {
    if (t < ROLL_T0 + 2) continue
    const [ue, un] = dir(HDG08L)
    hos.push({ t, lat, lon, sd: 5, ve: gs === null ? null : ue * gs * KT, vn: gs === null ? null : un * gs * KT, sdV: 1 })
    vObs.push({ t, hFt: elev08L(along08L(lat, lon)), sdFt: 3, sdT: 0 })
    heard.push(t)
    continue
  }
  if (alt === 'ground') continue
  const pos = `${lat},${lon}`
  const vel = `${gs},${trk}`
  const newPos = pos !== lastPos
  const newVel = gs !== null && trk !== null && vel !== lastVel
  lastPos = pos
  lastVel = vel
  if (newPos || newVel) {
    const [ve, vn] = newVel ? dir(trk!).map((c) => c * gs! * KT) : [null, null]
    hos.push({ t, lat: newPos ? lat : null, lon: newPos ? lon : null, sd: POS_SD_M, ve, vn, sdV: VEL_SD_MS })
  }
  if (newPos) heard.push(t)
  if (r[10] !== null) deltas.push({ baro: alt, d: r[10] - alt })
  heights.push({ t, baro: alt, geom: r[10], lat, lon })
  noteDetails(t, r)
}
/** Pressure altitude → above MSL, by the GNSS − pressure difference the flight itself measured near that height. */
function mslOf(baroFt: number, lat: number, lon: number): number {
  const near = deltas.filter((x) => Math.abs(x.baro - baroFt) < 3_000)
  const pick = near.length > 0 ? near : [...deltas].sort((a, b) => Math.abs(a.baro - baroFt) - Math.abs(b.baro - baroFt)).slice(0, 20)
  const d = pick.reduce((s, x) => s + x.d, 0) / pick.length
  return ((baroFt + d) * FT - geoidN(lat, lon)) / FT
}
for (const x of heights) {
  vObs.push({ t: x.t, hFt: x.geom !== null ? (x.geom * FT - geoidN(x.lat, x.lon)) / FT : mslOf(x.baro, x.lat, x.lon), sdFt: ALT_SD_FT, sdT: 0.5 })
}

// The GPS positions on the final: where and when the built approach must arrive.
const fix = fixes[fixes.length - 1]
const FIX_EN = en22(fix.r[1], fix.r[2])
const FIX_ALONG = dot(FIX_EN, out22) // metres before the threshold
const V_APP = (fix.r[4] ?? 147) * KT
// Without GNSS height: the pressure altitude scaled between the glidepath at that fix (it read 0 ft there) and the
// cruise's last GNSS heights (35,000 ft read; ~36,230 ft above the sea).
const cruise = heights.filter((x) => x.t > hms('04:35:00') && x.geom !== null)
const cruiseMsl = cruise.reduce((s, x) => s + (x.geom! * FT - geoidN(x.lat, x.lon)) / FT, 0) / cruise.length
const cruiseBaro = cruise.reduce((s, x) => s + x.baro, 0) / cruise.length
const OFF_FT = glideFt(FIX_ALONG) - (fix.r[3] as number)
const SCALE = (cruiseMsl - OFF_FT) / cruiseBaro
const cyMsl = (baroFt: number): number => OFF_FT + baroFt * SCALE

// ---- 04:43–05:12 without a position: the heard speeds and tracks flown on -------------------------------------------
const lastGps = gps[gps.length - 1]
const vel: Array<{ t: number; gs: number; trk: number }> = [{ t: lastGps.t, gs: lastGps.r[4]!, trk: lastGps.r[5]! }]
for (const { t, r } of lost) {
  const alt = r[3] as number
  vObs.push({ t, hFt: cyMsl(alt), sdFt: 30, sdT: 0.5 })
  if (r[7] !== null) rObs.push({ t, vFtS: (r[7] / 60) * SCALE, sdFtS: 3 })
  if (r[4] !== null && r[5] !== null) vel.push({ t, gs: r[4], trk: r[5] })
  noteDetails(t, r)
}
const lerpOn = <K extends 'gs' | 'trk'>(k: K, t: number, to = Infinity): number => {
  const v = vel.filter((x) => x.t <= to)
  const i = v.findIndex((x) => x.t >= t)
  if (i === 0) return v[0][k]
  if (i < 0) return v[v.length - 1][k]
  const [a, b] = [v[i - 1], v[i]]
  return a[k] + ((t - a.t) / Math.max(1e-9, b.t - a.t)) * (b[k] - a[k])
}
const TRK_A = lerpOn('trk', TURN_FROM, TURN_FROM)
const W1 = ((9.81 * Math.tan(BANK_DEG / DEG)) / (lerpOn('gs', TURN_FROM) * KT)) * DEG // °/s
const TURN1_S = (TRK_A - TRK_B) / W1
const TURN2_S = (TRK_B - TRK_C) / W2
const trkAt = (t: number, T1: number, T2: number): number => {
  if (t < T1) return lerpOn('trk', t, TURN_FROM)
  if (t < T1 + TURN1_S) return TRK_A - W1 * (t - T1)
  if (t < T2) return TRK_B
  if (t < T2 + TURN2_S) return TRK_B - W2 * (t - T2)
  return TRK_C
}
function deadReckon(T1: number, T2: number): Array<{ t: number; lat: number; lon: number; trk: number; gs: number }> {
  let [lat, lon] = [lastGps.r[1], lastGps.r[2]]
  const out = [{ t: GPS_LOST, lat, lon, trk: lastGps.r[5]!, gs: lastGps.r[4]! }]
  for (let t = GPS_LOST; t < LAST_VEL; t += 1) {
    const [trk, gs] = [trkAt(t + 0.5, T1, T2), lerpOn('gs', t + 0.5)]
    const p = destination(lat, lon, trk, gs / 3600)
    lat = p.lat
    lon = p.lon
    out.push({ t: t + 1, lat, lon, trk: trkAt(t + 1, T1, T2), gs: lerpOn('gs', t + 1) })
  }
  return out
}
// The multilateration fixes that fit the landing: each burst's as one place and time.
const burst = (from: string, to: string): { t: number; lat: number; lon: number } => {
  const b = lost.filter(({ t }) => t >= hms(from) && t <= hms(to))
  const mean = (f: (x: { t: number; r: Row }) => number): number => b.reduce((s, x) => s + f(x), 0) / b.length
  return { t: Math.round(mean((x) => x.t)), lat: mean((x) => x.r[1]), lon: mean((x) => x.r[2]) }
}
const MLAT = [burst('05:05:00', '05:05:40'), burst('05:11:20', '05:12:07')]
let best = { T1: 0, T2: 0, err: Infinity, miss: [0, 0] }
for (let T1 = TURN_FROM; T1 + TURN1_S <= TURN_BY; T1 += 5) {
  for (let T2 = hms('05:05:40'); T2 + TURN2_S <= hms('05:09:47'); T2 += 5) {
    const path = deadReckon(T1, T2)
    const miss = MLAT.map((m) => {
      const p = path[m.t - GPS_LOST]
      return distanceNm(p.lat, p.lon, m.lat, m.lon)
    })
    const err = miss[0] ** 2 + miss[1] ** 2
    if (err < best.err) best = { T1, T2, err, miss }
  }
}
const drPath = deadReckon(best.T1, best.T2)
for (const p of drPath) {
  if (p.t === GPS_LOST || p.t % 2 !== 0) continue
  const [ue, un] = dir(p.trk)
  hos.push({ t: p.t, lat: p.lat, lon: p.lon, sd: 30, ve: ue * p.gs * KT, vn: un * p.gs * KT, sdV: 3 })
}
console.log(`turn back ${clock(best.T1)}–${clock(best.T1 + TURN1_S)} (${W1.toFixed(2)}°/s), onto 015° ${clock(best.T2)}; off the multilateration by ${best.miss.map((m) => m.toFixed(1)).join(' and ')} nm`)

// ---- 05:12–05:21:54, the approach: on along 015°, a left turn onto the centreline, down the glidepath -----------------
const ground: Array<[number, number]> = [[START, LIFT_T]]
let TD = 0
let END = 0
let finalFrom = 0
{
  const R = 3000 // m: ~25° of bank at 230 kt
  const last = drPath[drPath.length - 1]
  const P = en22(last.lat, last.lon)
  const T = FIX - LAST_VEL
  const v0 = last.gs * KT
  // Straight from there to a left turn (its centre south-east of the centreline) that ends on the final D out. Slowing
  // evenly from the heard 302 kt to the approach speed by tB, that speed held after: D is the one with tB two minutes
  // (~5 nm) before the fix. (Straight on along 015° instead would meet the centreline 18 nm out: 47 nm in under 10 min.)
  const route = (D: number): { poly: Array<[number, number]>; arcEnd: number; h1: number; x: number; sweep: number } => {
    const F: [number, number] = [out22[0] * D, out22[1] * D]
    const C: [number, number] = [F[0] + dir(HDG22 - 90)[0] * R, F[1] + dir(HDG22 - 90)[1] * R]
    const d = Math.hypot(C[0] - P[0], C[1] - P[1])
    const h1 = Math.atan2(C[0] - P[0], C[1] - P[1]) * DEG + Math.asin(R / d) * DEG // the centre stays on the left
    const x = Math.sqrt(d * d - R * R)
    const sweep = (((h1 - HDG22) % 360) + 360) % 360
    const poly: Array<[number, number]> = []
    for (let s = 0; s < x; s += 50) poly.push([P[0] + dir(h1)[0] * s, P[1] + dir(h1)[1] * s])
    for (let a = 0; a <= sweep; a += 1) poly.push([C[0] + dir(h1 - a + 90)[0] * R, C[1] + dir(h1 - a + 90)[1] * R])
    const arcEnd = poly.length
    for (let s = D; s > FIX_ALONG; s -= 50) poly.push([out22[0] * s, out22[1] * s])
    poly.push([out22[0] * FIX_ALONG, out22[1] * FIX_ALONG])
    return { poly, arcEnd, h1, x, sweep }
  }
  const lengthOf = (poly: Array<[number, number]>): number[] => {
    const cum = [0]
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]))
    return cum
  }
  const tBOf = (L: number): number => (L - V_APP * T) / ((v0 - V_APP) / 2)
  let D = 5 * 1852
  for (let d = 5 * 1852; d <= 15 * 1852; d += 100) {
    const cumD = lengthOf(route(d).poly)
    if (Math.abs(tBOf(cumD[cumD.length - 1]) - (T - 120)) < Math.abs(tBOf(lengthOf(route(D).poly).at(-1)!) - (T - 120))) D = d
  }
  const { poly, arcEnd, h1, x, sweep } = route(D)
  const cum = lengthOf(poly)
  const L = cum[cum.length - 1]
  const tA = 0
  const tB = tBOf(L)
  if (tB < 60 || tB > T) throw new Error(`the approach is ${(L / 1852).toFixed(1)} nm in ${T} s: no such speeds (tB ${tB.toFixed(0)})`)
  const sAt = (t: number): number => {
    const b = Math.min(t, tB)
    const acc = (V_APP - v0) / tB
    return v0 * b + 0.5 * acc * b * b + V_APP * Math.max(0, t - tB)
  }
  let j = 1
  for (let t = 2; t < T; t += 2) {
    const s = sAt(t)
    while (j < cum.length - 1 && cum[j] < s) j++
    const u = (s - cum[j - 1]) / Math.max(1e-9, cum[j] - cum[j - 1])
    const [e, n] = [poly[j - 1][0] + u * (poly[j][0] - poly[j - 1][0]), poly[j - 1][1] + u * (poly[j][1] - poly[j - 1][1])]
    const [lat, lon] = ll22(e, n)
    hos.push({ t: LAST_VEL + t, lat, lon, sd: 30, ve: null, vn: null, sdV: 0 })
    if (j >= arcEnd) {
      if (finalFrom === 0) finalFrom = LAST_VEL + t
      vObs.push({ t: LAST_VEL + t, hFt: glideFt(dot([e, n], out22)), sdFt: 30, sdT: 0 })
    }
  }
  console.log(`approach: ${(x / 1852).toFixed(1)} nm on ${h1.toFixed(0)}°, a ${sweep.toFixed(0)}° left turn, final from ${(D / 1852).toFixed(1)} nm (${glideFt(D).toFixed(0)} ft), ${(L / 1852).toFixed(1)} nm in all; ${(v0 / KT).toFixed(0)} kt held ${tA.toFixed(0)} s, ${(V_APP / KT).toFixed(0)} kt from ${clock(LAST_VEL + tB)}`)

  // The GPS positions on short final, then the landing.
  for (const f of fixes) {
    const [ue, un] = dir(HDG22).map((c) => c * (f.r[4] ?? 147) * KT)
    hos.push({ t: f.t, lat: f.r[1], lon: f.r[2], sd: 10, ve: ue, vn: un, sdV: 2 })
    heard.push(f.t)
    noteDetails(f.t, f.r)
  }
  const TD_M = 350
  const BRAKE = 1.8
  const TAXI_MS = 12
  const thrT = FIX + FIX_ALONG / V_APP
  TD = FIX + (FIX_ALONG + TD_M) / V_APP
  END = Math.round(TD + 40)
  vObs.push({ t: FIX, hFt: glideFt(FIX_ALONG), sdFt: 10, sdT: 0 })
  for (let t = FIX + 1; t <= END + 1e-9; t += 1) {
    let s = V_APP * (Math.min(t, TD) - FIX) // along the final, from the fix
    let v = V_APP
    if (t > TD) {
      const tr = t - TD
      const tBrake = (V_APP - TAXI_MS) / BRAKE
      const b = Math.min(tr, tBrake)
      s = FIX_ALONG + TD_M + V_APP * b - 0.5 * BRAKE * b * b + TAXI_MS * Math.max(0, tr - tBrake)
      v = tr < tBrake ? V_APP - BRAKE * tr : TAXI_MS
    }
    const along = FIX_ALONG - s // out from the threshold (negative on the runway)
    const [lat, lon] = ll22(out22[0] * along, out22[1] * along)
    hos.push({ t, lat, lon, sd: t > TD ? 3 : 10, ve: -out22[0] * v, vn: -out22[1] * v, sdV: t > TD ? 0.5 : 2 })
    if (t >= TD) vObs.push({ t, hFt: elev22(-along), sdFt: 3, sdT: 0 })
    else if (t < thrT) vObs.push({ t, hFt: glideFt(along), sdFt: 10, sdT: 0 })
    else {
      const u = (t - thrT) / (TD - thrT)
      vObs.push({ t, hFt: elev22(-along) + 50 * (1 - u) ** 2, sdFt: 5, sdT: 0 })
      rObs.push({ t, vFtS: (-2 * 50 * (1 - u)) / (TD - thrT), sdFtS: 1 })
    }
  }
  vObs.push({ t: TD, hFt: elev22(TD_M), sdFt: 3, sdT: 0 })
  ground.push([TD, END])
}
vObs.sort((a, b) => a.t - b.t)
heard.sort((a, b) => a - b)

/** The aircraft's own wind (m/s, the vector it blows toward): its reports within ±90 s averaged. */
function ownWind(t: number): [number, number] | null {
  const near = windPts.filter((w) => Math.abs(w.t - t) <= 90)
  return near.length === 0 ? null : [near.reduce((a, w) => a + w.wx, 0) / near.length, near.reduce((a, w) => a + w.wy, 0) / near.length]
}
iasPts.sort((a, b) => a.t - b.t)
/** Calibrated airspeed (kt) where heard, linear between receptions up to 30 s apart; null elsewhere. */
function casAt(t: number): number | null {
  const i = iasPts.findIndex((p) => p.t >= t)
  if (i < 0) return null
  if (i === 0) return iasPts[0].t - t < 2 ? iasPts[0].kt : null
  const [a, b] = [iasPts[i - 1], iasPts[i]]
  if (b.t - a.t > 30) return null
  return a.kt + ((t - a.t) / Math.max(1e-9, b.t - a.t)) * (b.kt - a.kt)
}

// ---- smooth ---------------------------------------------------------------------------------------------------------
const Q_H = 1
const Q_V = 1
const LIM_H = { v: 400, a: 35 }
const LIM_V = { v: 120, a: 35 }
const kv = fuseHeight(vObs, rObs, { q: Q_V, lim: LIM_V, casAt, energyFrom: LIFT_T + 10, energyTo: FIX })
const onGround = (t: number): boolean => ground.some(([a, b]) => t >= a && t <= b)
const airAt = (t: number): { air: number; hM: number } | null => {
  const cas = casAt(t)
  if (cas === null || onGround(t)) return null
  const h = knotAt(kv, t)
  const tas = trueAirspeedKt(cas, h.p / FT) * KT
  return { air: Math.sqrt(Math.max(0, tas * tas - h.v * h.v)), hM: h.p }
}
// Over the ground, in pieces a few hundred kilometres across, each on its own plane (east scaled by the cosine of its
// middle latitude; velocities in and out rescaled exactly), joined where both hold the same receptions.
interface Piece { to: number; lat0: number; lon0: number; ke: Knot3[]; kn: Knot3[]; wind: Array<{ t: number; wx: number; wy: number }> }
const pieces: Piece[] = [
  { to: hms('03:45:00'), lat0: 43.4, lon0: 27.4 },
  { to: hms('04:12:00'), lat0: 40.6, lon0: 29.0 },
  { to: hms('04:36:00'), lat0: 37.6, lon0: 30.4 },
  { to: hms('04:58:00'), lat0: 35.2, lon0: 31.7 },
  { to: END + 1, lat0: 34.3, lon0: 33.2 },
].map((p, i, all) => {
  const from = i === 0 ? -Infinity : all[i - 1].to
  const c0 = Math.cos(p.lat0 / DEG)
  const sel = hos.filter((o) => o.t >= from - 120 && o.t <= p.to + 120).sort((a, b) => a.t - b.t)
    .filter((o, j, xs) => j === 0 || o.t > xs[j - 1].t)
  const k = (lat: number | null): number => c0 / Math.cos((lat ?? p.lat0) / DEG) // grid east per true east
  const e: Obs[] = sel.map((o) => ({ t: o.t, p: o.lon === null ? null : (o.lon - p.lon0) * M_PER_DEG * c0, rp: o.sd ** 2, v: o.ve === null ? null : o.ve * k(o.lat), rv: o.sdV ** 2 }))
  const n: Obs[] = sel.map((o) => ({ t: o.t, p: o.lat === null ? null : (o.lat - p.lat0) * M_PER_DEG, rp: o.sd ** 2, v: o.vn, rv: o.sdV ** 2 }))
  const g = fuseGround(e, n, airAt, Q_H, LIM_H)
  if (g.turns.length > 0) console.log(`turns flown again: ${g.turns.map((s) => `${clock(s.t0)}–${clock(s.t1)} ${s.circles} circle(s), bank ≤ ${s.maxBankDeg.toFixed(0)}°`).join('; ')}`)
  return { ...p, ke: g.e, kn: g.n, wind: g.wind }
})
/** The path at t: degrees, and true east/north velocity (m/s) and acceleration (m/s²). */
function pathAt(t: number): { lat: number; lon: number; ve: number; vn: number; ae: number; an: number; piece: Piece } {
  const p = pieces.find((x) => t < x.to) ?? pieces[pieces.length - 1]
  const e = knotAt(p.ke, t)
  const n = knotAt(p.kn, t)
  const lat = p.lat0 + n.p / M_PER_DEG
  const c0 = Math.cos(p.lat0 / DEG)
  const k = Math.cos(lat / DEG) / c0
  return { lat, lon: p.lon0 + e.p / (M_PER_DEG * c0), ve: e.v * k, vn: n.v, ae: e.a * k, an: n.a, piece: p }
}
function windAt(t: number, p: Piece): [number, number] | null {
  const w = p.wind
  if (w.length === 0) return null
  const i = w.findIndex((x) => x.t >= t)
  if (i === 0) return [w[0].wx, w[0].wy]
  if (i < 0) return [w[w.length - 1].wx, w[w.length - 1].wy]
  const [a, b] = [w[i - 1], w[i]]
  const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0
  return [a.wx + u * (b.wx - a.wx), a.wy + u * (b.wy - a.wy)]
}

// ---- attitude and rows ----------------------------------------------------------------------------------------------
const within = (xs: readonly number[], t: number, s: number): boolean => {
  let lo = 0
  let hi = xs.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= t) lo = mid
    else hi = mid
  }
  return Math.min(Math.abs(xs[lo] - t), Math.abs(xs[hi] - t)) <= s
}
// A row a second around the take-off and from the turn back on; every 4 s between (the player interpolates).
const dense = (t: number): boolean => t < hms('03:20:00') || t >= hms('04:53:00')
const filt = new AttitudeFilter(4)
const rows: string[] = ['time,lat,lon,alt_ft,hdg,pitch,roll,gnd,ias_kt,wind_dir,wind_kt,q,src']
let lastTrk = HDG08L
let levelAt = 0
let maxSink = 0
const SUB = 0.5
for (let t = START; t <= END + 1e-9; t += SUB) {
  const s = pathAt(t)
  const h = knotAt(kv, t)
  const gnd = onGround(t)
  const gs = Math.hypot(s.ve, s.vn)
  const trk = gs > 3 ? Math.atan2(s.ve, s.vn) * DEG : lastTrk
  lastTrk = trk
  const turn = gs > 3 ? ((s.vn * s.ae - s.ve * s.an) / (gs * gs)) * DEG : 0
  const along = gs > 3 ? (s.ve * s.ae + s.vn * s.an) / gs : 0
  const cas = casAt(t)
  const pr = aeroPitchRoll({
    gsMs: gs, vsMs: gnd ? 0 : h.v, turnRateDegS: turn, alongMs2: along, easKt: cas, altM: h.p, onGround: gnd, category: 'A3',
  }, NORMAL_LIMITS)
  // Rotation: the nose comes up over the last 3 s of the roll; at the touchdown the flare's nose-up lowers over 4 s.
  const rot = t > LIFT_T - 3 && t <= LIFT_T ? ((t - (LIFT_T - 3)) / 3) * 8 : t >= TD && t < TD + 4 ? 4 * (1 - (t - TD) / 4) : 0
  // The nose points where the aircraft goes through the air: its ground velocity less the wind it reported (the fit where
  // it reported none).
  const w = ownWind(t) ?? windAt(t, s.piece)
  const [ax, ay] = w === null ? [s.ve, s.vn] : [s.ve - w[0], s.vn - w[1]]
  const hdgAir = Math.hypot(ax, ay) > 3 ? Math.atan2(ax, ay) * DEG : trk
  const att = filt.step({ headingDeg: gnd ? (t < TD ? HDG08L : HDG22) : hdgAir, pitchDeg: gnd ? rot : pr.pitchDeg, rollDeg: gnd ? 0 : pr.rollDeg }, SUB)
  if (levelAt === 0 && h.p / FT > cruiseMsl - 150) levelAt = t
  if (t > LAST_VEL && !gnd) maxSink = Math.min(maxSink, (h.v / FT) * 60)
  if (Math.abs(t - Math.round(t)) > 1e-6 || (!dense(t) && Math.round(t) % 4 !== 0 && t < END)) continue
  const hdg = (Math.round((((att.headingDeg % 360) + 360) % 360) * 10) / 10) % 360
  const hFt = gnd && t < TD ? elev08L(along08L(s.lat, s.lon)) : h.p / FT
  rows.push([
    clock(t), s.lat.toFixed(6), s.lon.toFixed(6), hFt.toFixed(0), hdg.toFixed(1), att.pitchDeg.toFixed(1), att.rollDeg.toFixed(1),
    gnd ? '1' : '', cas !== null ? cas.toFixed(0) : '',
    w === null ? '' : ((Math.atan2(-w[0], -w[1]) * DEG + 360) % 360).toFixed(0), w === null ? '' : (Math.hypot(w[0], w[1]) / KT).toFixed(0),
    within(heard, t, 5) ? 'A' : 'R', t <= GPS_LOST && within(lolTimes, t, 60) ? 'ADSBLOL' : 'ADSBX',
  ].join(','))
}
writeFileSync(new URL('../../../public/scenarios/w43257/track.csv', import.meta.url), `${rows.join('\n')}\n`)
const at = (t: number): string => {
  const p = pathAt(t)
  return `${p.lat.toFixed(3)}N ${p.lon.toFixed(3)}E ${(knotAt(kv, t).p / FT).toFixed(0)} ft`
}
console.log(`${rows.length - 1} rows, ${clock(START)}–${clock(END)}; receptions ${heard.length}, altitudes ${vObs.length}, airspeeds ${iasPts.length}`)
console.log(`level ${clock(levelAt)} at ${cruiseMsl.toFixed(0)} ft; GPS lost at ${at(GPS_LOST)}; turn back at ${at(best.T1)}; ${clock(LAST_VEL)} at ${at(LAST_VEL)}`)
console.log(`final from ${clock(finalFrom)}, fix ${FIX_ALONG.toFixed(0)} m out at ${glideFt(FIX_ALONG).toFixed(0)} ft, touchdown ${clock(TD)}, end ${clock(END)}; steepest after ${clock(LAST_VEL)}: ${maxSink.toFixed(0)} ft/min`)
