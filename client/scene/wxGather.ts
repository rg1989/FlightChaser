// client/scene/wxGather.ts
// A sky's clouds gathered from its sources for one weather field: the reports' (cloudField.ts observedClouds), the radar's (radarCells,
// radarClouds) and the model's (modelClouds), within the one cap, as Weather3D lays them: the observed nearest first, giving way to
// the radar's reserve; then the radar's; then the model's, a forecast, in what is left. Pure (no Cesium, no DOM), so Node tests
// cover it, and a worker of its own does it in a page (wxGather.worker.ts; Weather3D asks): in a rainy sky it is 10 to 25 ms of
// work (the radar's clouds 4 to 15 ms, every station's anew 9 ms, the model's 3.5 ms: Node on the check machine, warm), which held
// a frame 21 ms at a field's rebuild in a flight.
// A gatherer keeps what repeats from job to job: each report's clouds and the model's, for a generation of the reports and of the
// grid (a number the asker counts up when it has others). A worker's job brings the reports as new objects every time, so the
// first of a generation are held, and the clouds are found again by them.
import type { Metar, ModelGrid } from '../../shared/wx.ts'
import { MAX_CLOUDS, RADAR_LOOK, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, type CloudSpec } from './cloudField.ts'
import type { SourceTile } from './radar.ts'
import { radarCells, type Shift } from './radarCells.ts'
import { wrapLon } from './wxGeo.ts'

export interface GatherJob {
  id: number // the answer's
  lat: number // the field's middle
  lon: number
  metars: readonly Metar[] // the reports held, as drawn (shifted)
  metarGen: number // their generation
  grid: ModelGrid | null // the model's grid, as drawn; null: none, or too old
  modelGen: number
  tiles: { x: number; y: number; tile: SourceTile }[] // the radar's decoded zoom-7 tiles held, of those readKm reaches
  shift: Shift // ?wxat: the radar is read at the place less this, and its cells stand at theirs plus it
  readKm: number // how far the radar is read
  reachKm: number // and where its clouds have faded out, whatever their puffs' own fade
  anew: boolean // what is kept is dropped first (a check aid: Weather3D rebuildSky)
}

export interface Gathered {
  id: number
  clouds: CloudSpec[] // at most MAX_CLOUDS
}

/** A gatherer, with what it keeps from job to job. */
export function gatherer(): (job: GatherJob) => Gathered {
  let made = new WeakMap<Metar, CloudSpec[]>() // each report's clouds (observedClouds' cache)
  let held: { gen: number; metars: readonly Metar[] } | null = null // the reports of the generation in hand
  let model: { metarGen: number; modelGen: number; specs: CloudSpec[] } | null = null // the model's clouds, for the grid and the reports they lean on
  return (job) => {
    if (job.anew) {
      made = new WeakMap()
      model = null
    }
    if (held === null || held.gen !== job.metarGen) held = { gen: job.metarGen, metars: job.metars }
    const metars = held.metars
    const observed = observedClouds(metars, job.lat, job.lon, { cache: made }).specs
    const tiles = new Map(job.tiles.map((t) => [t.x * 4096 + t.y, t.tile]))
    const cells = radarCells((x, y) => tiles.get(x * 4096 + y) ?? null, job.lat - job.shift.dLat, wrapLon(job.lon - job.shift.dLon), job.shift, job.readKm)
    const radar = cells.length === 0 ? [] : radarClouds(cells, radarBases(metars))
    if (job.grid !== null && (model === null || model.metarGen !== job.metarGen || model.modelGen !== job.modelGen)) {
      model = { metarGen: job.metarGen, modelGen: job.modelGen, specs: modelClouds(job.grid, metars) }
    }
    // The radar's are kept as far as they were read, whatever their puffs' own fade: the volume fades every cloud by its one reach.
    const clouds = nearestClouds([observed], job.lat, job.lon, radar.length === 0 ? MAX_CLOUDS : MAX_CLOUDS - Math.min(radar.length, RADAR_LOOK.reserve))
    clouds.push(...nearestClouds([radar], job.lat, job.lon, MAX_CLOUDS - clouds.length, job.readKm, () => job.reachKm))
    clouds.push(...nearestClouds([job.grid === null ? [] : model!.specs], job.lat, job.lon, MAX_CLOUDS - clouds.length))
    return { id: job.id, clouds }
  }
}
