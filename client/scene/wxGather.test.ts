// client/scene/wxGather.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODEL_CLOUD_HPA, MODEL_WIND_HPA, type Metar, type ModelGrid } from '../../shared/wx.ts'
import { MAX_CLOUDS, RADAR_LOOK, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, sequence } from './cloudField.ts'
import { NONE, type SourceTile } from './radar.ts'
import { radarCells } from './radarCells.ts'
import { gatherer, type GatherJob } from './wxGather.ts'

const [LAT, LON] = [37.6, -122.4]
const [READ_KM, REACH_KM] = [180, 150]

function metars(n = 12): Metar[] {
  const r = sequence(5)
  return Array.from({ length: n }, (_, k) => ({
    id: `K${k}`, name: null, lat: LAT - 0.8 + 1.6 * r(), lon: LON - 1 + 2 * r(), elevM: 20, obsMs: 0, cat: null, wdir: 270, wspd: 8, wgst: null, visKm: 10, visPlus: true,
    tempC: 15, dewC: 10, qnhHpa: 1013, wx: null, clouds: [{ cover: k % 3 === 0 ? 'OVC' : 'SCT', baseFt: 2500, type: null }], vertVisFt: null, raw: '',
  }))
}

function grid(): ModelGrid {
  const r = sequence(9)
  const n = 7
  const z = [110, 760, 1450, 3010, 4200, 5570, 7180, 9160, 10360, 11780]
  return {
    lat0: LAT - 0.75, lon0: LON - 0.75, step: 0.25, n, timeMs: 0, elevM: Array.from({ length: n * n }, () => 50),
    clouds: MODEL_CLOUD_HPA.map((hPa, l) => ({ hPa, cover: Array.from({ length: n * n }, () => Math.round(100 * r())), zM: Array.from({ length: n * n }, () => z[l]) })),
    winds: MODEL_WIND_HPA.map((hPa) => ({ hPa, kt: Array.from({ length: n * n }, () => 30), deg: Array.from({ length: n * n }, () => 270) })),
  }
}

/** The zoom-7 tiles round the place, each with rain in bands. */
function tiles(): GatherJob['tiles'] {
  const out: GatherJob['tiles'] = []
  radarCells((x, y) => {
    const tile: SourceTile = { dbz: new Int8Array(256 * 256).fill(NONE), snow: new Uint8Array(256 * 256) }
    for (let i = 0; i < tile.dbz.length; i++) if (Math.sin(i / 37) > 0.9) tile.dbz[i] = 20 + (i % 30)
    out.push({ x, y, tile })
    return null
  }, LAT, LON, { dLat: 0, dLon: 0 }, READ_KM)
  return out
}

const job = (o: Partial<GatherJob> = {}): GatherJob =>
  ({ id: 1, lat: LAT, lon: LON, metars: metars(), metarGen: 1, grid: grid(), modelGen: 1, tiles: tiles(), shift: { dLat: 0, dLon: 0 }, readKm: READ_KM, reachKm: REACH_KM, anew: false, ...o })

test('gatherer: the observed clouds nearest first, giving way to the radar\'s reserve; then the radar\'s, read as far as the job says; then the model\'s, in what is left of the cap', () => {
  const j = job({ id: 7 })
  const got = gatherer()(j)
  assert.equal(got.id, 7)
  const observed = observedClouds(j.metars, LAT, LON).specs
  const held = new Map(j.tiles.map((t) => [`${t.x}/${t.y}`, t.tile]))
  const radar = radarClouds(radarCells((x, y) => held.get(`${x}/${y}`) ?? null, LAT, LON, j.shift, READ_KM), radarBases(j.metars))
  const model = modelClouds(j.grid!, j.metars)
  assert.ok(observed.length > 0 && radar.length > RADAR_LOOK.reserve && model.length > 0, `${observed.length} ${radar.length} ${model.length}`)
  const expected = nearestClouds([observed], LAT, LON, MAX_CLOUDS - RADAR_LOOK.reserve)
  expected.push(...nearestClouds([radar], LAT, LON, MAX_CLOUDS - expected.length, READ_KM, () => REACH_KM))
  expected.push(...nearestClouds([model], LAT, LON, MAX_CLOUDS - expected.length))
  assert.deepEqual(got.clouds, expected)
  assert.ok(got.clouds.length <= MAX_CLOUDS)
})

test('gatherer: with no radar tile the observed clouds have the whole cap, and with no grid there are no model\'s clouds; the radar is read where the weather is (the place less the shift) and its clouds stand shifted', () => {
  const j = job({ tiles: [], grid: null })
  assert.deepEqual(gatherer()(j).clouds, nearestClouds([observedClouds(j.metars, LAT, LON).specs], LAT, LON, MAX_CLOUDS))
  const shift = { dLat: 0.5, dLon: -0.25 }
  const moved = job({ metars: [], grid: null, lat: LAT + shift.dLat, lon: LON + shift.dLon, shift })
  const plain = gatherer()(job({ metars: [], grid: null })).clouds
  const shifted = gatherer()(moved).clouds
  assert.ok(plain.length > 0)
  assert.equal(shifted.length, plain.length)
  assert.ok(Math.abs(shifted[0].lat - (plain[0].lat + 0.5)) < 0.02 && Math.abs(shifted[0].lon - (plain[0].lon - 0.25)) < 0.02)
})

test('gatherer: a station\'s clouds and the model\'s are made once for a generation of the reports and the grid, also when a job brings them as new objects (a worker\'s does); another generation, or anew, makes them again', () => {
  const gather = gatherer()
  const sky = (o: Partial<GatherJob>): GatherJob => job({ metars: metars(4), tiles: [], ...o }) // (no radar: its clouds are kept by nothing, made at every job)
  const first = gather(sky({})).clouds
  const seen = observedClouds(metars(4), LAT, LON).specs.length
  assert.ok(first.length - seen >= 5, `the model\'s clouds have room: ${seen} observed of ${first.length}`)
  const same = (a: typeof first, b: typeof first): number => a.filter((c) => b.includes(c)).length
  const again = gather(structuredClone(sky({ id: 2, lat: LAT + 0.01 }))).clouds // new objects, the same generations, the field's middle a km on
  assert.ok(same(first, again) >= 0.95 * first.length, `the same clouds, not new ones like them: ${same(first, again)} of ${first.length}`)
  const newer = gather(sky({ id: 3, metarGen: 2 })).clouds
  assert.deepEqual(newer, first, 'the same reports as another generation: clouds like them')
  assert.equal(same(first, newer), 0, 'but made again, the model\'s too (they lean on the reports)')
  const model = (cs: typeof first): typeof first => cs.slice(-5)
  assert.ok(model(gather(sky({ id: 4, metarGen: 2 })).clouds).every((c, k) => c === model(newer)[k]), 'the model\'s kept')
  assert.ok(model(gather(sky({ id: 5, metarGen: 2, modelGen: 2 })).clouds).every((c, k) => c !== model(newer)[k]), 'another generation of the grid')
  const kept = gather(sky({ id: 6, metarGen: 2, modelGen: 2 })).clouds
  const fresh = gather(sky({ id: 7, metarGen: 2, modelGen: 2, anew: true })).clouds
  assert.deepEqual(fresh, kept)
  assert.equal(same(kept, fresh), 0, 'anew: every cloud made again')
})

test('gatherer: a job that has crossed to a worker and its answer back (structured clones) give the same clouds', () => {
  const j = job()
  assert.deepEqual(structuredClone(gatherer()(structuredClone(j))).clouds, gatherer()(j).clouds)
})
