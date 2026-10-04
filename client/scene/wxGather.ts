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
// With the weather satellite's pictures in the job (satellite.ts: a frame in use) the satellite decides where cloud is and how high
// its top is, and the sources say the rest:
// - the pictures' colours are read here (decodeFrame: 4 to 16 ms, so not in a frame), once for a frame, and the frame made into a
//   grid over the field's square (satGrid.ts), which the answer brings: the field takes it as cover directly;
// - the model's clouds, placed by a random rule, are not drawn where the satellite sees (the model still gives the grid its bases
//   and its winds);
// - an airport's layers are marked `masked`: the field lets them stand only where the satellite sees cloud. Not its FEW and SCT
//   cumulus whose tops are under SAT_SMALL_CU_M over the ground (a pixel of 3 to 5 km cannot see them: they stay as they are), nor
//   the towers of a reported CB or TCU (they carry the storm's severity, which the satellite does not give);
// - the radar's clouds stay where the radar puts them; a tower whose estimated top is under the satellite's top at its place is
//   stretched up to it from its base.
// Pictures in colours not known are said to be bad (the asker drops them), and a frame that sees nothing of the square is as no
// frame: the sky is gathered as it is without a satellite.
import type { Metar, ModelGrid } from '../../shared/wx.ts'
import { MAX_CLOUDS, PUFF_FILL, RADAR_LOOK, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, type CloudSpec } from './cloudField.ts'
import type { SourceTile } from './radar.ts'
import { radarCells, type Shift } from './radarCells.ts'
import { SAT_SMALL_CU_M, gridCloudy, satCell, satGrid, type SatGrid } from './satGrid.ts'
import { decodeFrame, type SatFrame, type SatPictures } from './satellite.ts'
import { wrapLon } from './wxGeo.ts'

const TOWER_UNDER = 0.5 // a tower takes the satellite's top where the satellite's cover at its place is at least this

export interface GatherJob {
  id: number // the answer's
  lat: number // the field's middle
  lon: number
  metars: readonly Metar[] // the reports held, as drawn (shifted)
  metarGen: number // their generation
  grid: ModelGrid | null // the model's grid, as drawn; null: none, or too old
  modelGen: number
  tiles: { x: number; y: number; tile: SourceTile }[] // the radar's decoded zoom-7 tiles held, of those readKm reaches
  shift: Shift // ?wxat: the radar is read at the place less this, and its cells stand at theirs plus it; the satellite's pixels likewise
  readKm: number // how far the radar is read
  reachKm: number // and where its clouds have faded out, whatever their puffs' own fade
  anew: boolean // what is kept is dropped first (a check aid: Weather3D rebuildSky)
  sat?: SatPictures | null // the weather satellite's frame in use, as its pictures came (where the weather is: not shifted); none: no satellite
  epochMs?: number // the wall clock: the frame's age is from this
}

/** What a gathering says of the satellite's frame it was given. */
export interface SatInfo {
  timeMs: number // the frame's own time
  bad: boolean // its pictures' colours are not the ones known: it is not used, and should be dropped
  cloudy: number // the share of the field's square it sees that is cloud (0 when it sees none of it)
  decodeMs: number // how long the pictures' colours took to read; 0 when the frame was kept from a job before
  gridMs: number // and the grid to make
}

export interface Gathered {
  id: number
  clouds: CloudSpec[] // at most MAX_CLOUDS
  sat: SatGrid | null // the satellite's cloud over the field's square; null with no frame, a bad one, or one that sees nothing of the square
  satInfo: SatInfo | null // null when the job had no frame
}

/** The answer's arrays that a worker hands over with it: the satellite's grid's. */
export function gatherTransfers(got: Gathered): ArrayBuffer[] {
  return got.sat === null ? [] : [got.sat.cover, got.sat.topM, got.sat.baseM, got.sat.seen].map((a) => a.buffer as ArrayBuffer)
}

/** Whether an observed cloud is one the satellite can speak of: a layer's puff (no tower), and not small cumulus (FEW or SCT with its top under SAT_SMALL_CU_M over its ground). */
const maskable = (c: CloudSpec): boolean => c.tower === undefined && !(c.small === true && c.heightM + (PUFF_FILL * c.scale[1]) / 2 - c.groundM <= SAT_SMALL_CU_M)

/**
 * The radar's clouds with each tower that stands under a higher top of the satellite's stretched up to it from its base (its puffs'
 * heights and middles grow in proportion; an anvil rises with the top). The others are the same objects.
 */
function raiseTowers(radar: CloudSpec[], g: SatGrid, lat: number, lon: number): CloudSpec[] {
  const towers = new Map<number, { base: number; top: number; first: CloudSpec }>()
  for (const c of radar) {
    if (c.tower === undefined) continue
    const half = (PUFF_FILL * c.scale[1]) / 2
    const t = towers.get(c.tower)
    if (t === undefined) towers.set(c.tower, { base: c.heightM - half, top: c.heightM + half, first: c })
    else [t.base, t.top] = [Math.min(t.base, c.heightM - half), Math.max(t.top, c.heightM + half)]
  }
  const grow = new Map<number, { base: number; by: number }>()
  for (const [id, t] of towers) {
    const cell = satCell(g, lat, lon, t.first.lat, t.first.lon) // (a tower's first puff is at its base, on its axis or beside it)
    if (cell >= 0 && g.cover[cell] >= TOWER_UNDER && g.topM[cell] > t.top && t.top > t.base) grow.set(id, { base: t.base, by: (g.topM[cell] - t.base) / (t.top - t.base) })
  }
  if (grow.size === 0) return radar
  return radar.map((c) => {
    const k = c.tower === undefined ? undefined : grow.get(c.tower)
    return k === undefined ? c : { ...c, heightM: k.base + (c.heightM - k.base) * k.by, scale: [c.scale[0], c.scale[1] * k.by] }
  })
}

/** A gatherer, with what it keeps from job to job. */
export function gatherer(): (job: GatherJob) => Gathered {
  let made = new WeakMap<Metar, CloudSpec[]>() // each report's clouds (observedClouds' cache)
  let held: { gen: number; metars: readonly Metar[] } | null = null // the reports of the generation in hand
  let model: { metarGen: number; modelGen: number; specs: CloudSpec[] } | null = null // the model's clouds, for the grid and the reports they lean on
  let frame: { key: string; frame: SatFrame | null } | null = null // the satellite's frame read from its pictures (null: bad), for the pictures it was read from
  return (job) => {
    if (job.anew) {
      made = new WeakMap()
      model = null
      frame = null
    }
    if (held === null || held.gen !== job.metarGen) held = { gen: job.metarGen, metars: job.metars }
    const metars = held.metars
    let sat: SatGrid | null = null
    let satInfo: SatInfo | null = null
    const p = job.sat ?? null
    if (p !== null) {
      const key = `${p.timeMs}|${p.n}|${p.box.join()}`
      let decodeMs = 0
      if (frame === null || frame.key !== key) {
        const t0 = performance.now()
        frame = { key, frame: decodeFrame(p) }
        decodeMs = performance.now() - t0
      }
      satInfo = { timeMs: p.timeMs, bad: frame.frame === null, cloudy: 0, decodeMs, gridMs: 0 }
      if (frame.frame !== null) {
        const t0 = performance.now()
        const g = satGrid(frame.frame, { lat: job.lat, lon: job.lon, shift: job.shift, epochMs: job.epochMs ?? p.timeMs, metars, model: job.grid })
        satInfo.gridMs = performance.now() - t0
        if (g.seen.some((s) => s === 1)) {
          sat = g
          satInfo.cloudy = gridCloudy(g)
        }
      }
    }
    const seenAt = (c: CloudSpec): boolean => {
      const cell = satCell(sat!, job.lat, job.lon, c.lat, c.lon)
      return cell >= 0 && sat!.seen[cell] === 1
    }
    let observed = observedClouds(metars, job.lat, job.lon, { cache: made }).specs
    if (sat !== null) observed = observed.map((c) => (maskable(c) ? { ...c, masked: true } : c))
    const tiles = new Map(job.tiles.map((t) => [t.x * 4096 + t.y, t.tile]))
    const cells = radarCells((x, y) => tiles.get(x * 4096 + y) ?? null, job.lat - job.shift.dLat, wrapLon(job.lon - job.shift.dLon), job.shift, job.readKm)
    let radar = cells.length === 0 ? [] : radarClouds(cells, radarBases(metars))
    if (sat !== null) radar = raiseTowers(radar, sat, job.lat, job.lon)
    if (job.grid !== null && (model === null || model.metarGen !== job.metarGen || model.modelGen !== job.modelGen)) {
      model = { metarGen: job.metarGen, modelGen: job.modelGen, specs: modelClouds(job.grid, metars) }
    }
    let models = job.grid === null ? [] : model!.specs
    if (sat !== null) models = models.filter((c) => !seenAt(c)) // where the satellite sees, it says where cloud is: not the model's rule
    // The radar's are kept as far as they were read, whatever their puffs' own fade: the volume fades every cloud by its one reach.
    const clouds = nearestClouds([observed], job.lat, job.lon, radar.length === 0 ? MAX_CLOUDS : MAX_CLOUDS - Math.min(radar.length, RADAR_LOOK.reserve))
    clouds.push(...nearestClouds([radar], job.lat, job.lon, MAX_CLOUDS - clouds.length, job.readKm, () => job.reachKm))
    clouds.push(...nearestClouds([models], job.lat, job.lon, MAX_CLOUDS - clouds.length))
    return { id: job.id, clouds, sat, satInfo }
  }
}
