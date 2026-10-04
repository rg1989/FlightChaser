// How long the gathering of a real sky's clouds takes on the main thread when a weather field is built (Weather3D #buildClouds and
// #buildRadar), piece by piece, in Node on the check machine (not a test of anything: it prints).
//   .planning/tools/remote-check.sh test .planning/tools/wx-gather-time.test.ts
// A made-up sky: 37 stations with two layers each, a model grid of 13 × 13 places, and radar tiles with rain over about a seventh of
// the area ("showers") or over half of it ("rain"). Each piece is run once cold and then warm (the median of 15).
import { test } from 'node:test'
import { MODEL_CLOUD_HPA, MODEL_WIND_HPA, type Metar, type ModelGrid } from '../../shared/wx.ts'
import { MAX_CLOUDS, RADAR_LOOK, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, sequence } from '../../client/scene/cloudField.ts'
import { NONE, type SourceTile } from '../../client/scene/radar.ts'
import { radarCells } from '../../client/scene/radarCells.ts'

const LAT = 37.6
const LON = -122.4
const READ_KM = 180 // weather3d.ts RADAR_READ_KM

function metars(): Metar[] {
  const r = sequence(5)
  return Array.from({ length: 37 }, (_, k) => ({
    id: `K${k}`, name: null, lat: LAT - 1.6 + 3.2 * r(), lon: LON - 2 + 4 * r(), elevM: 20, obsMs: 0, cat: null, wdir: 270, wspd: 8, wgst: null, visKm: 10, visPlus: true,
    tempC: 15, dewC: 10, qnhHpa: 1013, wx: null, clouds: [{ cover: k % 3 === 0 ? 'OVC' : 'BKN', baseFt: 2500, type: null }, { cover: 'BKN', baseFt: 9000, type: null }], vertVisFt: null, raw: '',
  }))
}

function grid(): ModelGrid {
  const r = sequence(9)
  const n = 13
  const places = n * n
  const z = [110, 760, 1450, 3010, 4200, 5570, 7180, 9160, 10360, 11780]
  return {
    lat0: LAT - 1.5, lon0: LON - 1.5, step: 0.25, n, timeMs: 0, elevM: Array.from({ length: places }, () => 50),
    clouds: MODEL_CLOUD_HPA.map((hPa, l) => ({ hPa, cover: Array.from({ length: places }, () => Math.round(100 * r())), zM: Array.from({ length: places }, () => z[l]) })),
    winds: MODEL_WIND_HPA.map((hPa) => ({ hPa, kt: Array.from({ length: places }, () => 30), deg: Array.from({ length: places }, () => 270) })),
  }
}

/** Radar tiles with an echo where a slow wave is over `over` (0 … 1: the lower, the more rain). */
function tiles(over: number): (x: number, y: number) => SourceTile {
  const held = new Map<string, SourceTile>()
  return (x, y) => {
    let t = held.get(`${x}/${y}`)
    if (t === undefined) {
      t = { dbz: new Int8Array(256 * 256).fill(NONE), snow: new Uint8Array(256 * 256) }
      for (let j = 0; j < 256; j++) {
        for (let i = 0; i < 256; i++) {
          const w = (Math.sin((x * 256 + i) / 23) * Math.cos((y * 256 + j) / 31) + 1) / 2
          if (w > over) t.dbz[j * 256 + i] = Math.round(15 + 40 * ((w - over) / (1 - over)))
        }
      }
      held.set(`${x}/${y}`, t)
    }
    return t
  }
}

function time(what: string, f: () => unknown): string {
  let t = performance.now()
  f()
  const cold = performance.now() - t
  const warm: number[] = []
  for (let k = 0; k < 15; k++) {
    t = performance.now()
    f()
    warm.push(performance.now() - t)
  }
  warm.sort((a, b) => a - b)
  return `${what}: cold ${cold.toFixed(1)} ms, warm ${warm[7].toFixed(1)} ms`
}

test('how long the sky\'s clouds take to gather', () => {
  const lines: string[] = []
  const ms = metars()
  const g = grid()
  lines.push(time('observedClouds, every station anew', () => observedClouds(ms, LAT, LON, { cache: new WeakMap() })))
  const cache = new WeakMap<Metar, ReturnType<typeof observedClouds>['specs']>()
  const observed = observedClouds(ms, LAT, LON, { cache }).specs
  lines.push(time(`observedClouds, the stations' clouds kept (${observed.length} clouds)`, () => observedClouds(ms, LAT, LON, { cache })))
  const model = modelClouds(g, ms)
  lines.push(time(`modelClouds (${model.length} clouds)`, () => modelClouds(g, ms)))
  lines.push(time('radarBases', () => radarBases(ms)))
  for (const [name, over] of [['showers', 0.85], ['rain', 0.5]] as const) {
    const tile = tiles(over)
    const cells = radarCells(tile, LAT, LON, { dLat: 0, dLon: 0 }, READ_KM)
    const radar = radarClouds(cells, radarBases(ms))
    lines.push(`${name}: ${cells.length} cells with an echo, ${radar.length} clouds of the radar's`)
    lines.push(`  ${time('radarCells', () => radarCells(tile, LAT, LON, { dLat: 0, dLon: 0 }, READ_KM))}`)
    lines.push(`  ${time('radarClouds', () => radarClouds(cells, radarBases(ms)))}`)
    lines.push(`  ${time('nearestClouds, the three groups', () => {
      const room = MAX_CLOUDS - Math.min(radar.length, RADAR_LOOK.reserve)
      const clouds = nearestClouds([observed], LAT, LON, room)
      clouds.push(...nearestClouds([radar], LAT, LON, MAX_CLOUDS - clouds.length, READ_KM, () => 130))
      clouds.push(...nearestClouds([model], LAT, LON, MAX_CLOUDS - clouds.length))
      return clouds
    })}`)
  }
  console.log(lines.join('\n'))
})
