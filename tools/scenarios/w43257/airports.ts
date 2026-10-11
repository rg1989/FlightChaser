// tools/scenarios/w43257/airports.ts
// Writes public/scenarios/w43257/airport.json: Bucharest Henri Coandă (LROP), where Wizz Air 3257 took off, and Larnaca
// (LCLK), where it landed, in the app's Airport shape (shared/airports.ts). Runway ends, end elevations, widths and
// Larnaca's displaced 22 threshold (575 ft) from OurAirports (public domain). Heights: MSL + EGM96.
//
//   node tools/scenarios/w43257/airports.ts
import { writeFileSync } from 'node:fs'
import type { Airport, RunwayEnd } from '../../../shared/airports.ts'
import { bearingDeg, destination } from '../../../shared/geo.ts'
import { geoidN } from '../../../shared/geoid.ts'

const FT = 0.3048
const r2 = (v: number): number => Math.round(v * 100) / 100
const r1 = (v: number): number => Math.round(v * 10) / 10

type End = { ident: string; lat: number; lon: number; elevFt: number; displacedFt?: number }

function runway(a: End, b: End, widthFt: number, surface: string): Airport['runways'][number] {
  const end = (e: End, to: End): RunwayEnd => {
    const hdg = bearingDeg(e.lat, e.lon, to.lat, to.lon)
    const thr = destination(e.lat, e.lon, hdg, ((e.displacedFt ?? 0) * FT) / 1852)
    return {
      ident: e.ident, lat: e.lat, lon: e.lon, thrLat: thr.lat, thrLon: thr.lon, displacedFt: e.displacedFt ?? 0, elevFt: e.elevFt,
      hdgTrueDeg: r1(hdg), thrHaeM: r2(e.elevFt * FT + geoidN(thr.lat, thr.lon)),
    }
  }
  const m = Math.hypot((b.lat - a.lat) * 111_195, (b.lon - a.lon) * 111_195 * Math.cos((a.lat * Math.PI) / 180))
  return { lengthFt: Math.round(m / FT), widthFt, surface, ends: [end(a, b), end(b, a)] }
}

const SOURCE = 'Runway ends, end elevations and widths from OurAirports (public domain). Heights: MSL + EGM96.'
const airport = (ident: string, name: string, lat: number, lon: number, elevFt: number, rws: Airport['runways']): Airport & { source: string } =>
  ({ ident, name, source: SOURCE, lat, lon, elevFt, nM: r2(geoidN(lat, lon)), runways: rws })

const out = [
  airport('LROP', 'Bucharest Henri Coandă International Airport', 44.571792, 26.103285, 314, [
    runway({ ident: '08L', lat: 44.5765, lon: 26.0839, elevFt: 313 }, { ident: '26R', lat: 44.5798, lon: 26.1278, elevFt: 303 }, 148, 'ASP'),
    runway({ ident: '08R', lat: 44.5645, lon: 26.0766, elevFt: 314 }, { ident: '26L', lat: 44.5678, lon: 26.1204, elevFt: 303 }, 148, 'ASP'),
  ]),
  airport('LCLK', 'Larnaca International Airport', 34.875099, 33.624901, 8, [
    runway({ ident: '04', lat: 34.864185, lon: 33.612255, elevFt: 11 }, { ident: '22', lat: 34.883202, lon: 33.635498, elevFt: 6, displacedFt: 575 }, 148, 'ASP'),
  ]),
]

writeFileSync(new URL('../../../public/scenarios/w43257/airport.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`)
console.log(out.map((a) => `${a.ident}: ${a.runways.map((r) => `${r.ends[0].ident}/${r.ends[1].ident} ${r.lengthFt} ft, ${r.ends[0].hdgTrueDeg}°`).join('; ')}`).join('\n'))
