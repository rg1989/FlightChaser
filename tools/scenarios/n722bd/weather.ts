// tools/scenarios/n722bd/weather.ts
// The rest of the package's weather/ after weather.py: metar.json, in the app's shape; model.json, Open-Meteo's grid at 18:00 UTC round
// the route (when it answers) or, from the Miami sounding of 12:00 UTC, heights and winds with no cloud cover; and wind.json for
// reconstruct.ts, [true altitude ft, from°, kt] from that sounding.
//   node tools/scenarios/n722bd/weather.ts <sources/wx> <package folder>
import { readFileSync, writeFileSync } from 'node:fs'
import { MODEL_CLOUD_HPA, MODEL_VARIABLES, MODEL_WIND_HPA, assembleModel, slimMetars, slimPlaces, type ModelPlace } from '../../../shared/wx.ts'

const [src, pkg] = process.argv.slice(2)
const AT_MS = Date.UTC(2026, 10, 1, 18)
writeFileSync(`${pkg}/weather/metar.json`, JSON.stringify(slimMetars(JSON.parse(readFileSync(`${src}/metar_1750.json`, 'utf8')))))

interface Level { pres: number; hght: number | null; tmpc: number | null; drct: number | null; sknt: number | null }
const raob = (JSON.parse(readFileSync(`${src}/raob.json`, 'utf8')) as { profiles: Array<{ profile: Level[] }> }).profiles[0].profile
const at = (hPa: number): Level => raob.reduce((a, b) => (Math.abs(b.pres - hPa) < Math.abs(a.pres - hPa) && b.hght !== null ? b : a))
writeFileSync(`${src}/wind.json`, JSON.stringify(raob.filter((l) => l.hght !== null && l.drct !== null && l.sknt !== null && l.pres % 50 === 0).map((l) => [l.hght! / 0.3048, l.drct, l.sknt])))

const geo = { lat0: 25.4, lon0: -82.5, step: 0.25, n: 11 }
const lats: number[] = []
const lons: number[] = []
for (let r = 0; r < geo.n; r++) for (let c = 0; c < geo.n; c++) {
  lats.push(geo.lat0 + r * geo.step)
  lons.push(geo.lon0 + c * geo.step)
}
const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&hourly=${MODEL_VARIABLES.join(',')}&wind_speed_unit=kn&start_hour=2026-11-01T18:00&end_hour=2026-11-01T18:00&timeformat=unixtime`
let places: ModelPlace[] | null = null
for (let i = 0; i < 5 && places === null; i++) {
  const r = await fetch(url).catch(() => null)
  if (r?.ok) places = slimPlaces(await r.json(), lats.length)
  else {
    console.log(`Open-Meteo: ${r?.status ?? 'no answer'}`)
    await new Promise((d) => setTimeout(d, 15_000))
  }
}
const fromModel = places !== null
places ??= lats.map(() => ({
  timeMs: AT_MS, elevM: 0, cover: MODEL_CLOUD_HPA.map(() => null),
  zM: MODEL_CLOUD_HPA.map((p) => at(p).hght), kt: MODEL_WIND_HPA.map((p) => at(p).sknt), deg: MODEL_WIND_HPA.map((p) => at(p).drct),
}))
writeFileSync(`${pkg}/weather/model.json`, JSON.stringify(assembleModel(geo, places)))
console.log(fromModel ? 'model: Open-Meteo' : 'model: the sounding (Open-Meteo did not answer)')
