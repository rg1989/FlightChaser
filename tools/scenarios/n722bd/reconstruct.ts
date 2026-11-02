// tools/scenarios/n722bd/reconstruct.ts
// Builds public/scenarios/n722bd/track.csv for Learjet 60 N722BD (1 Nov 2026, Austin → North Eleuthera; lost near Greenacres,
// Florida) from the aircraft's own ADS-B broadcasts as adsb.lol's receivers heard them (its tar1090 trace of the day, ODbL):
// GPS positions at 1 to 2 Hz through the dive, and GNSS height. The barometric altitude sticks at 8,750 ft from 17:49:23 and the
// broadcast rates saturate at −32,640 ft/min: neither is used there. The trace has no airspeed, so the track has none either.
// The attitude is the app's flight-mechanics model (client/track/attitude.ts) on that path, with an upset's limits from the
// top of the zoom on. Near the vertical the turn rate over the ground says little of the true bank: the pilot's own call
// (60° at 17:49:06) is on the radio.
//
//   node tools/scenarios/n722bd/reconstruct.ts <adsb.lol trace_full_a9ab17.json> [wind json]
import { readFileSync, writeFileSync } from 'node:fs'
import { AttitudeFilter, NORMAL_LIMITS, UPSET_LIMITS, UPSET_RATES, aeroPitchRoll } from '../../../client/track/attitude.ts'
import type { Obs } from '../../../client/track/smoother.ts'
import { geoidN } from '../../../shared/geoid.ts'
import { fuseGround, fuseHeight, knotAt, type HeightObs } from '../fuse.ts'

const FT = 0.3048
const KT = 1852 / 3600
const DEG = 180 / Math.PI
const DAY0 = Date.UTC(2026, 10, 1) / 1000
const M_PER_DEG = 111_195
const LOCAL_H = -5 // EST: daylight saving ended that morning
const hms = (s: string): number => { // UTC
  const [h, m, sec] = s.split(':').map(Number)
  return h * 3600 + m * 60 + sec
}
const clock = (t: number): string => { // on the package's local clock
  const s = Math.round(t) + LOCAL_H * 3600
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const FROM = hms('17:28:30')
const START = hms('17:29:40')
const UPSET_FROM = hms('17:48:10') // the top of the zoom

const trace = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { timestamp: number; trace: unknown[][] }
interface Pt { t: number; lat: number; lon: number; geomFt: number | null; gsKt: number; trk: number }
const pts: Pt[] = trace.trace.map((p) => ({
  t: trace.timestamp - DAY0 + (p[0] as number), lat: p[1] as number, lon: p[2] as number,
  geomFt: typeof p[10] === 'number' ? p[10] : null, gsKt: p[4] as number, trk: p[5] as number,
})).filter((p) => p.t >= FROM)
const END = Math.floor(pts[pts.length - 1].t)

const lat0 = 26.65
const lon0 = -81.2
const c0 = Math.cos(lat0 / DEG)
const k = (lat: number): number => c0 / Math.cos(lat / DEG) // grid east per true east
const POS_SD_M = 15
const VEL_SD_MS = 2
const uniq = pts.filter((p, i) => i === 0 || p.t > pts[i - 1].t)
const e: Obs[] = uniq.map((p) => ({ t: p.t, p: (p.lon - lon0) * M_PER_DEG * c0, rp: POS_SD_M ** 2, v: p.gsKt * KT * Math.sin(p.trk / DEG) * k(p.lat), rv: VEL_SD_MS ** 2 }))
const n: Obs[] = uniq.map((p) => ({ t: p.t, p: (p.lat - lat0) * M_PER_DEG, rp: POS_SD_M ** 2, v: p.gsKt * KT * Math.cos(p.trk / DEG), rv: VEL_SD_MS ** 2 }))
const ground = fuseGround(e, n, () => null, 2, { v: 400, a: 40 })
// GNSS height (above the ellipsoid) to above mean sea level.
const heights: HeightObs[] = uniq.filter((p) => p.geomFt !== null).map((p) => ({ t: p.t, hFt: p.geomFt! - geoidN(p.lat, p.lon) / FT, sdFt: 40, sdT: 0 }))
const kv = fuseHeight(heights, [], { q: 8, lim: { v: 340, a: 60 } }) // the last seconds fall near 290 m/s

// The wind at the aircraft's height, from the model archive (weather.ts writes it): [hFt, from°, kt] by height. None: no wind columns.
const windTable = process.argv[3] ? (JSON.parse(readFileSync(process.argv[3], 'utf8')) as Array<[number, number, number]>).sort((a, b) => a[0] - b[0]) : null
const windAt = (hFt: number): [number, number] | null => { // the vector it blows toward, m/s
  if (windTable === null) return null
  const i = windTable.findIndex((w) => w[0] >= hFt)
  const [a, b] = i <= 0 ? [windTable[Math.max(i, 0)], windTable[Math.max(i, 0)]] : [windTable[i - 1], windTable[i]]
  const u = b[0] === a[0] ? 0 : (hFt - a[0]) / (b[0] - a[0])
  const v = (w: number[]): [number, number] => [-w[2] * KT * Math.sin(w[1] / DEG), -w[2] * KT * Math.cos(w[1] / DEG)]
  const [va, vb] = [v(a), v(b)]
  return [va[0] + u * (vb[0] - va[0]), va[1] + u * (vb[1] - va[1])]
}

const SUB = 0.25
const filt = new AttitudeFilter(4, UPSET_RATES)
const rows = ['time,lat,lon,alt_ft,hdg,pitch,roll,wind_dir,wind_kt,q,src']
let vs = 0
for (let t = START - 20; t <= END + 1e-9; t += SUB) {
  const ke = knotAt(ground.e, t)
  const kn = knotAt(ground.n, t)
  const h = knotAt(kv, t)
  const lat = lat0 + kn.p / M_PER_DEG
  const lon = lon0 + ke.p / M_PER_DEG / c0
  const ve = ke.v / k(lat)
  const gs = Math.hypot(ve, kn.v)
  const turn = ((kn.v * ke.a / k(lat) - ve * kn.a) / (gs * gs)) * DEG
  const along = (ve * ke.a / k(lat) + kn.v * kn.a) / gs
  vs = h.v
  const pr = aeroPitchRoll({ gsMs: gs, vsMs: vs, turnRateDegS: turn, alongMs2: along, easKt: null, altM: h.p, onGround: false, category: 'A2' }, t >= UPSET_FROM ? UPSET_LIMITS : NORMAL_LIMITS)
  const w = windAt(h.p / FT)
  const [ax, ay] = w === null ? [ve, kn.v] : [ve - w[0], kn.v - w[1]]
  const att = filt.step({ headingDeg: Math.atan2(ax, ay) * DEG, pitchDeg: pr.pitchDeg, rollDeg: pr.rollDeg }, SUB)
  if (t < START || Math.abs(t - Math.round(t)) > 1e-6) continue
  const hdg = (Math.round((((att.headingDeg % 360) + 360) % 360) * 10) / 10) % 360
  rows.push([
    clock(t), lat.toFixed(6), lon.toFixed(6), (h.p / FT).toFixed(0), hdg.toFixed(1), att.pitchDeg.toFixed(1), att.rollDeg.toFixed(1),
    w === null ? '' : ((Math.atan2(-w[0], -w[1]) * DEG + 360) % 360).toFixed(0), w === null ? '' : (Math.hypot(w[0], w[1]) / KT).toFixed(0),
    'R', 'ADSBLOL',
  ].join(','))
}
writeFileSync(new URL('../../../public/scenarios/n722bd/track.csv', import.meta.url), `${rows.join('\n')}\n`)
console.log(`${rows.length - 1} rows, ${clock(START)}–${clock(END)} EST from ${uniq.length} receptions`)
for (const s of ['17:47:00', '17:48:14', '17:48:30', '17:48:42', '17:49:04', '17:49:15', '17:49:25', '17:49:32']) {
  const r = rows.find((x) => x.startsWith(clock(hms(s))))
  console.log(s, r)
}
