// client/scene/wxGather.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeSatCut } from '../../shared/sat.ts'
import { MODEL_CLOUD_HPA, MODEL_WIND_HPA, type Metar, type ModelGrid } from '../../shared/wx.ts'
import { MAX_CLOUDS, PUFF_FILL, RADAR_LOOK, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, sequence, type CloudSpec } from './cloudField.ts'
import { NONE, type SourceTile } from './radar.ts'
import { radarCells } from './radarCells.ts'
import { SAT_GRID_N } from './satGrid.ts'
import { satBare, satBuffers, type SatPictures } from './satellite.ts'
import { gatherTransfers, gatherer, type GatherJob } from './wxGather.ts'

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

// ---- the weather satellite ------------------------------------------------------------------------------------------------------

const T0 = Date.UTC(2026, 9, 4, 4, 45)
const BLUE = [0, 0, 255] // 3,840 m
const RED = [254, 0, 0] // 12,800 m
/**
 * A frame's two pictures, 400 km square round the job's place (2.5 km a pixel): each pixel painted by where it is, km east and north
 * of the place: cloud with a top's colour, clear, or not processed.
 */
function pictures(paint: (east: number, north: number) => number[] | 'clear' | 'unseen', mask: (cloudy: boolean) => number[] = (cloudy) => (cloudy ? [255, 255, 255] : [0, 192, 0])): SatPictures {
  const n = 160
  const [dLat, dLon] = [200 / 111.195, 200 / (111.195 * Math.cos((LAT * Math.PI) / 180))]
  const p: SatPictures = { timeMs: T0, box: [LAT - dLat, LON - dLon, LAT + dLat, LON + dLon], n, mask: new Uint8ClampedArray(n * n * 4), tops: new Uint8ClampedArray(n * n * 4) }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const px = paint((i + 0.5) * 2.5 - 200, 200 - (j + 0.5) * 2.5)
      if (px === 'unseen') continue
      p.mask.set([...mask(px !== 'clear'), 255], 4 * (j * n + i))
      if (px !== 'clear') p.tops.set([...px, 255], 4 * (j * n + i))
    }
  }
  return p
}
const satJob = (sat: SatPictures | null, o: Partial<GatherJob> = {}): GatherJob => job({ sat, epochMs: T0 + 20 * 60_000, ...o })
/** Whether a cloud is one of the model's (they alone are cleared round the aircraft). */
const isModels = (c: CloudSpec): boolean => c.clearKm !== undefined
const topOf = (c: CloudSpec): number => c.heightM + (PUFF_FILL * c.scale[1]) / 2

test('gatherer with the satellite\'s pictures: the answer brings the satellite\'s grid over the field\'s square, and what the frame is: its time and its share of cloud', () => {
  const got = gatherer()(satJob(pictures((east) => (east < 0 ? BLUE : 'clear')), { grid: null })) // (no model: no wind to carry the cloud)
  const g = got.sat!
  assert.deepEqual([g.n, g.timeMs, g.cover.length], [SAT_GRID_N, T0, SAT_GRID_N ** 2])
  const cell = (east: number, north: number): number => Math.floor((north + 160) / 2.5) * g.n + Math.floor((east + 160) / 2.5)
  assert.ok(g.cover[cell(-50, 0)] > 0.99 && g.cover[cell(50, 0)] === 0)
  assert.ok(Math.abs(g.topM[cell(-50, 0)] - 3840) < 1)
  assert.deepEqual([got.satInfo!.timeMs, got.satInfo!.bad], [T0, false])
  assert.ok(Math.abs(got.satInfo!.cloudy - 0.5) < 0.03, String(got.satInfo!.cloudy))
  assert.ok(got.satInfo!.decodeMs > 0 && got.satInfo!.gridMs > 0)
  const none = gatherer()(satJob(null))
  assert.deepEqual([none.sat, none.satInfo], [null, null])
})

test('gatherer with the satellite\'s pictures: the model\'s clouds are not drawn; an airport\'s layers are masked by the satellite, but not its FEW and SCT cumulus under 2 km of top, nor a tower', () => {
  const without = gatherer()(satJob(null, { tiles: [], metars: metars(4) })).clouds // (four stations leave the model room in the cap)
  assert.ok(without.some(isModels) && without.every((c) => c.masked === undefined))
  const got = gatherer()(satJob(pictures(() => BLUE), { tiles: [], metars: metars(4) })).clouds
  assert.ok(!got.some(isModels))
  const [small, layers] = [got.filter((c) => c.small === true), got.filter((c) => c.small !== true)]
  assert.ok(small.length > 20 && layers.length > 20, `${small.length} ${layers.length}`)
  assert.ok(small.every((c) => c.masked !== true), 'SCT at 2,500 ft: tops under 2 km')
  assert.ok(layers.every((c) => c.masked === true), 'OVC')
  // The same cumulus from a layer at 9,000 ft is no small cumulus to a satellite.
  const high = metars().map((m) => ({ ...m, clouds: m.clouds.map((c) => ({ ...c, baseFt: 9000 })) }))
  assert.ok(gatherer()(satJob(pictures(() => BLUE), { tiles: [], metars: high })).clouds.every((c) => c.masked === true))
  // A reported thundercloud's towers are not masked; nor are the radar's clouds.
  const cb = metars(3).map((m) => ({ ...m, clouds: [{ cover: 'BKN', baseFt: 3000, type: 'CB' as const }], raw: 'BKN030CB' }))
  const towers = gatherer()(satJob(pictures(() => BLUE), { tiles: [], metars: cb })).clouds.filter((c) => c.tower !== undefined)
  assert.ok(towers.length > 0 && towers.every((c) => c.masked !== true))
  const radar = gatherer()(satJob(pictures(() => BLUE), { metars: [] })).clouds
  assert.ok(radar.length > 0 && radar.every((c) => c.masked !== true))
})

test('gatherer with the satellite\'s pictures: a radar tower takes the satellite\'s top where that is higher than its own estimate, and keeps its own under a lower one', () => {
  const near: Partial<GatherJob> = { metars: [], grid: null, readKm: 100 } // (read to 100 km: every tower whole, and inside the field's square)
  const plain = gatherer()(satJob(null, near)).clouds
  /** Each tower's base and top. */
  const towersOf = (cs: CloudSpec[]): Map<number, [number, number]> => {
    const all = new Map<number, [number, number]>()
    for (const c of cs) {
      if (c.tower === undefined) continue
      const t = all.get(c.tower) ?? [Infinity, 0]
      all.set(c.tower, [Math.min(t[0], c.heightM - (PUFF_FILL * c.scale[1]) / 2), Math.max(t[1], topOf(c))])
    }
    return all
  }
  const own = towersOf(plain)
  assert.ok(own.size > 5 && [...own.values()].every(([, top]) => top < 12_000))
  const raised = towersOf(gatherer()(satJob(pictures(() => RED), near)).clouds)
  assert.equal(raised.size, own.size)
  for (const [id, [base, top]] of raised) {
    assert.ok(Math.abs(top - 12_800) < 1, `tower ${id}: ${top}`)
    assert.ok(Math.abs(base - own.get(id)![0]) < 1, `tower ${id} stands on its base: ${base}`)
  }
  const low = gatherer()(satJob(pictures(() => [43, 18, 13]), near)).clouds // 640 m: under every tower
  assert.deepEqual(low, plain)
  // Where the satellite sees clear, the radar's tower stands as it is.
  assert.deepEqual(gatherer()(satJob(pictures(() => 'clear'), near)).clouds, plain)
  // The deck's puffs (no tower) are as they were.
  const decks = (cs: CloudSpec[]): CloudSpec[] => cs.filter((c) => c.tower === undefined)
  assert.deepEqual(decks(gatherer()(satJob(pictures(() => RED), near)).clouds), decks(plain))
})

test('gatherer with the satellite\'s pictures: where the satellite does not see, the model\'s clouds stand; where it sees nothing at all, the sky is gathered as without it', () => {
  const half = gatherer()(satJob(pictures((east) => (east > 0 ? 'unseen' : 'clear')), { tiles: [], metars: [] }))
  const models = half.clouds.filter(isModels)
  assert.ok(models.length > 0 && models.every((c) => c.lon > LON - 0.03), 'the model\'s, in the half not seen')
  assert.ok(half.sat !== null)
  const blind = gatherer()(satJob(pictures(() => 'unseen')))
  assert.equal(blind.sat, null)
  assert.deepEqual(blind.clouds, gatherer()(satJob(null)).clouds)
  assert.deepEqual([blind.satInfo!.bad, blind.satInfo!.cloudy], [false, 0])
})

test('gatherer with the satellite\'s pictures: pictures in colours it does not know are said to be bad, and the sky is gathered as without a satellite', () => {
  const got = gatherer()(satJob(pictures(() => BLUE, () => [200, 40, 40])))
  assert.equal(got.satInfo!.bad, true)
  assert.equal(got.sat, null)
  assert.deepEqual(got.clouds, gatherer()(satJob(null)).clouds)
})

test('gatherer with the satellite\'s pictures: a frame\'s colours are read once, and kept for the jobs that bring the same frame (as new objects, from a worker\'s job); another frame is read', () => {
  const gather = gatherer()
  const p = pictures(() => BLUE)
  assert.ok(gather(satJob(p)).satInfo!.decodeMs > 0)
  assert.equal(gather(structuredClone(satJob(p, { id: 2 }))).satInfo!.decodeMs, 0)
  assert.ok(gather(satJob({ ...p, timeMs: T0 + 15 * 60_000 }, { id: 3 })).satInfo!.decodeMs > 0)
  assert.ok(gather(satJob(p, { id: 4, anew: true })).satInfo!.decodeMs > 0)
})

test('gatherer with the satellite\'s pictures: the answer crosses back from a worker with its grid whole, the grid\'s arrays handed over', () => {
  const got = gatherer()(satJob(pictures((east) => (east < 0 ? BLUE : 'clear'))))
  const list = gatherTransfers(got)
  assert.equal(list.length, 4)
  assert.deepEqual(new Set(list), new Set([got.sat!.cover.buffer, got.sat!.topM.buffer, got.sat!.baseM.buffer, got.sat!.seen.buffer]))
  const crossed = structuredClone(got, { transfer: list })
  assert.equal(crossed.sat!.cover.length, SAT_GRID_N ** 2)
  assert.equal(got.sat!.cover.length, 0, 'handed over')
  assert.deepEqual(gatherTransfers(gatherer()(satJob(null))), [])
})

test('gatherer with the satellite\'s pictures: a job that brings a frame without its pixels uses the frame it read at a job before; if it has read none it says the frame is missing, and gathers the sky as without a satellite', () => {
  const p = pictures((east) => (east < 0 ? BLUE : 'clear'))
  const bare: SatPictures = { ...p, mask: new Uint8ClampedArray(0), tops: new Uint8ClampedArray(0) }
  const gather = gatherer()
  const first = gather(satJob(p, { grid: null }))
  const again = gather(satJob(bare, { id: 2, grid: null }))
  assert.deepEqual([again.satInfo!.missing, again.satInfo!.bad, again.satInfo!.decodeMs], [false, false, 0])
  assert.deepEqual(again.sat!.cover, first.sat!.cover)
  assert.deepEqual(again.clouds, first.clouds)
  assert.equal(first.satInfo!.missing, false)
  // anew drops the reports' and the model's clouds; a frame is read again only when its pixels come with the job.
  assert.equal(gather(satJob(bare, { id: 3, grid: null, anew: true })).satInfo!.missing, false)
  const fresh = gatherer()(satJob(bare, { grid: null })) // (a worker started again, or this thread standing in for it)
  assert.deepEqual([fresh.satInfo!.missing, fresh.satInfo!.bad, fresh.sat], [true, false, null])
  assert.deepEqual(fresh.clouds, gatherer()(satJob(null, { grid: null })).clouds)
  const other = gather(satJob({ ...bare, timeMs: T0 + 15 * 60_000 }, { id: 4, grid: null }))
  assert.equal(other.satInfo!.missing, true, 'another frame, without its pixels')
})

/** The same frame as numbers, as the app's server's route gives it (shared/sat.ts): a top of 3,840 m where pictures(…) paints BLUE. */
function numbers(paint: (east: number, north: number) => number | 'clear' | 'unseen'): SatPictures {
  const p = pictures(() => 'unseen')
  const n = p.n
  const [cloud, seen, topM] = [new Uint8Array(n * n), new Uint8Array(n * n), new Uint16Array(n * n)]
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const px = paint((i + 0.5) * 2.5 - 200, 200 - (j + 0.5) * 2.5)
      if (px === 'unseen') continue
      seen[j * n + i] = 1
      if (px !== 'clear') [cloud[j * n + i], topM[j * n + i]] = [255, px]
    }
  }
  return { ...p, mask: new Uint8ClampedArray(0), tops: new Uint8ClampedArray(0), raw: encodeSatCut({ timeMs: p.timeMs, box: p.box, n, cloud, seen, topM }) }
}

test('gatherer with the satellite\'s frame as numbers (the server\'s route): they are used as they are, and give the grid that pictures of the same sky give', () => {
  const sky = (east: number, north: number): 'clear' | 'unseen' | null => (north > 150 ? 'unseen' : east < 0 ? null : 'clear')
  const fromPictures = gatherer()(satJob(pictures((e, n) => sky(e, n) ?? BLUE), { grid: null }))
  const got = gatherer()(satJob(numbers((e, n) => sky(e, n) ?? 3840), { grid: null }))
  assert.deepEqual([got.satInfo!.timeMs, got.satInfo!.bad, got.satInfo!.missing], [T0, false, false])
  assert.deepEqual(got.sat!.cover, fromPictures.sat!.cover)
  assert.deepEqual(got.sat!.topM, fromPictures.sat!.topM)
  assert.deepEqual(got.sat!.seen, fromPictures.sat!.seen)
  assert.deepEqual(got.clouds, fromPictures.clouds)
  assert.equal(got.satInfo!.cloudy, fromPictures.satInfo!.cloudy)
  // A height the pictures have no colour for is kept as it is: the numbers are not rounded to the fifty colours.
  const odd = gatherer()(satJob(numbers((e) => (e < 0 ? 4000 : 'clear')), { grid: null }))
  const cell = Math.floor((0 + 160) / 2.5) * odd.sat!.n + Math.floor((-50 + 160) / 2.5)
  assert.ok(Math.abs(odd.sat!.topM[cell] - 4000) < 1, String(odd.sat!.topM[cell]))
})

test('gatherer with the satellite\'s frame as numbers: read once and kept, as the pictures are: a job that brings the frame without its bytes uses it; a gatherer that has not read it says it is missing; the pictures of the same time are another frame; bytes that are not the frame are bad', () => {
  const p = numbers((east) => (east < 0 ? 3840 : 'clear'))
  const bare = satBare(p)
  const gather = gatherer()
  const first = gather(satJob(p, { grid: null }))
  const again = gather(structuredClone(satJob(bare, { id: 2, grid: null })))
  assert.deepEqual([again.satInfo!.missing, again.satInfo!.bad, again.satInfo!.decodeMs], [false, false, 0])
  assert.deepEqual(again.sat!.cover, first.sat!.cover)
  const crossed = structuredClone(satJob(p, { id: 3, grid: null }), { transfer: satBuffers(p) }) // as it goes to a worker: the answer's bytes handed over
  assert.equal(p.raw!.length, 0, 'handed over')
  assert.deepEqual(gatherer()(crossed).sat!.cover, first.sat!.cover)
  assert.deepEqual([gatherer()(satJob(bare, { grid: null })).satInfo!.missing, gatherer()(satJob(bare, { grid: null })).sat], [true, null])
  const other = gather(satJob(satBare(pictures(() => BLUE)), { id: 4, grid: null }))
  assert.equal(other.satInfo!.missing, true, 'the pictures of that time, without their pixels: not the frame read')
  const wrong = numbers(() => 3840)
  const bad = gatherer()(satJob({ ...wrong, raw: wrong.raw!.slice(0, 4000) }, { grid: null }))
  assert.deepEqual([bad.satInfo!.bad, bad.sat], [true, null])
})
