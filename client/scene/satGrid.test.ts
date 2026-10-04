// client/scene/satGrid.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MODEL_CLOUD_HPA, MODEL_WIND_HPA, type Metar, type ModelGrid } from '../../shared/wx.ts'
import { SAT_DEEP_M, SAT_GRID_N, SAT_NO_TOP_M, SAT_THICK, baseSources, fillTops, gridCloudy, satBase, satCell, satGrid, type SatGrid, type SatGridJob } from './satGrid.ts'
import type { SatFrame } from './satellite.ts'
import { parallaxKm } from './satPlace.ts'

const KM_PER_DEG = 111.195
const RAD = Math.PI / 180
const CELL_KM = 320 / SAT_GRID_N
const T0 = Date.UTC(2026, 9, 4, 4, 45)

/** A frame of `km` square round a place, 2.5 km a pixel: each pixel painted by where it is, km east and north of the place. */
function frame(lat: number, lon: number, paint: (east: number, north: number) => { cloud?: number; top?: number; unseen?: boolean }, km = 400): SatFrame {
  const n = km / 2.5
  const [dLat, dLon] = [km / 2 / KM_PER_DEG, km / 2 / (KM_PER_DEG * Math.cos(lat * RAD))]
  const f: SatFrame = { timeMs: T0, box: [lat - dLat, lon - dLon, lat + dLat, lon + dLon], n, cloud: new Uint8Array(n * n), seen: new Uint8Array(n * n).fill(1), topM: new Uint16Array(n * n) }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const px = paint((i + 0.5) * 2.5 - km / 2, km / 2 - (j + 0.5) * 2.5)
      f.cloud[j * n + i] = px.cloud ?? 0
      f.topM[j * n + i] = px.top ?? 0
      if (px.unseen) f.seen[j * n + i] = 0
    }
  }
  return f
}

const job = (lat: number, lon: number, more: Partial<SatGridJob> = {}): SatGridJob => ({ lat, lon, shift: { dLat: 0, dLon: 0 }, epochMs: T0, metars: [], model: null, ...more })
/** A block of cloud `half` km each way from (east, north). */
const block = (e0: number, n0: number, half: number, top: number) => (east: number, north: number) => (Math.abs(east - e0) < half && Math.abs(north - n0) < half ? { cloud: 255, top } : {})
/** The grid's cover: where its middle is (km east and north of the field's middle) and how much there is (km²). */
function middle(g: SatGrid): { east: number; north: number; km2: number } {
  let [sum, e, n] = [0, 0, 0]
  for (let j = 0; j < g.n; j++) {
    for (let i = 0; i < g.n; i++) {
      const c = g.cover[j * g.n + i]
      sum += c
      e += c * ((i + 0.5) * CELL_KM - 160)
      n += c * ((j + 0.5) * CELL_KM - 160)
    }
  }
  return { east: e / sum, north: n / sum, km2: sum * CELL_KM * CELL_KM }
}
const cellAt = (g: SatGrid, east: number, north: number): number => Math.floor((north + 160) / CELL_KM) * g.n + Math.floor((east + 160) / CELL_KM)

function metar(lat: number, lon: number, elevM: number, layers: [string, number][], more: Partial<Metar> = {}): Metar {
  return {
    id: `X${lat}${lon}`, name: null, lat, lon, elevM, obsMs: 0, cat: null, wdir: 270, wspd: 5, wgst: null, visKm: 10, visPlus: true, tempC: 15, dewC: 10, qnhHpa: 1013, wx: null,
    clouds: layers.map(([cover, baseFt]) => ({ cover, baseFt, type: null })), vertVisFt: null, raw: '', ...more,
  }
}

/** A model grid of 7 × 7 places round a place: the same everywhere. cover by level (MODEL_CLOUD_HPA's order), a wind for every level. */
function model(lat: number, lon: number, cover: number[], wind: { kt: number; deg: number } = { kt: 0, deg: 0 }, elevM = 0): ModelGrid {
  const n = 7
  const z = [110, 760, 1450, 3010, 4200, 5570, 7180, 9160, 10360, 11780]
  const all = <T>(v: T): T[] => Array.from({ length: n * n }, () => v)
  return {
    lat0: lat - 0.75, lon0: lon - 0.75, step: 0.25, n, timeMs: T0, elevM: all(elevM),
    clouds: MODEL_CLOUD_HPA.map((hPa, l) => ({ hPa, cover: all(cover[l] ?? 0), zM: all(z[l]) })),
    winds: MODEL_WIND_HPA.map((hPa) => ({ hPa, kt: all(wind.kt), deg: all(wind.deg) })),
  }
}

test('fillTops: a cloudy pixel with no height takes the nearest height within reach; with none so near, what it is told; no cloud, none', () => {
  const f = frame(0, 0, (east, north) => (north > 0 ? { cloud: 255, top: Math.abs(east + 90) < 1.3 && Math.abs(north - 50) < 1.3 ? 3200 : 0 } : {}), 200)
  const at = (east: number, north: number): number => Math.floor((100 - north) / 2.5) * f.n + Math.floor((east + 100) / 2.5)
  const tops = fillTops(f, 16, () => 2500)
  assert.equal(tops[at(-90, 50)], 3200)
  assert.equal(tops[at(-70, 60)], 3200) // 22 km off
  assert.equal(tops[at(-55, 50)], 3200) // 35 km
  assert.equal(tops[at(0, 50)], 2500) // 90 km: too far
  assert.equal(tops[at(-90, -20)], 0) // clear
})

test('satGrid: a block of cloud under the satellite stands in the grid where the picture has it, whole, with its top', () => {
  const g = satGrid(frame(0, 0, block(40, 20, 10, 3200)), job(0, 0))
  const m = middle(g)
  assert.ok(Math.abs(m.east - 40) < 0.3 && Math.abs(m.north - 20) < 0.3, JSON.stringify(m))
  assert.ok(Math.abs(m.km2 / 400 - 1) < 0.03, `${m.km2} km² of 400`)
  assert.ok(g.cover[cellAt(g, 40, 20)] > 0.99)
  assert.ok(Math.abs(g.topM[cellAt(g, 40, 20)] - 3200) < 1)
  assert.equal(g.cover[cellAt(g, -40, 20)], 0)
  assert.deepEqual([g.n, g.timeMs, g.cover.length], [SAT_GRID_N, T0, SAT_GRID_N ** 2])
})

test('satGrid: over Israel a 10 km top is moved 13 km back toward the point under the satellite; a low top hardly', () => {
  const high = middle(satGrid(frame(32, 35, block(0, 0, 15, 10_240)), job(32, 35)))
  const want = parallaxKm(32, 35, 10_240)
  assert.ok(Math.hypot(want.east, want.north) > 12.8)
  assert.ok(Math.abs(high.east - want.east) < 0.5 && Math.abs(high.north - want.north) < 0.5, `${JSON.stringify(high)} against ${JSON.stringify(want)}`)
  const low = middle(satGrid(frame(32, 35, block(0, 0, 15, 960)), job(32, 35)))
  assert.ok(Math.hypot(low.east, low.north) < 1.6, JSON.stringify(low))
})

test('satGrid: the cloud is carried by the model\'s wind at its top\'s level for the frame\'s age, 40 km at most; with no model, not at all', () => {
  const f = frame(32, 35, block(0, 0, 15, 5120))
  const par = parallaxKm(32, 35, 5120)
  const west = model(32, 35, [], { kt: 30, deg: 270 })
  const still = middle(satGrid(f, job(32, 35, { epochMs: T0 + 20 * 60_000 })))
  assert.ok(Math.abs(still.east - par.east) < 0.5)
  const blown = middle(satGrid(f, job(32, 35, { epochMs: T0 + 20 * 60_000, model: west })))
  assert.ok(Math.abs(blown.east - (par.east + 18.52)) < 0.5 && Math.abs(blown.north - par.north) < 0.5, JSON.stringify(blown))
  const long = middle(satGrid(f, job(32, 35, { epochMs: T0 + 90 * 60_000, model: west })))
  assert.ok(Math.abs(long.east - (par.east + 40)) < 0.5, JSON.stringify(long))
})

test('satGrid: with ?wxat the picture\'s pixels are drawn at their place plus the shift, and their parallax is that of where they are', () => {
  const [lat, lon] = [37.6, -122.4] // the aircraft
  const g = satGrid(frame(50, 8, block(0, 0, 15, 8000)), job(lat, lon, { shift: { dLat: lat - 50, dLon: lon - 8 } }))
  const m = middle(g)
  const want = parallaxKm(50, 8, 8000)
  assert.ok(Math.abs(m.east - want.east) < 0.6 && Math.abs(m.north - want.north) < 0.6, `${JSON.stringify(m)} against ${JSON.stringify(want)}`)
  assert.equal(g.seen[cellAt(g, 0, 0)], 1)
})

test('satGrid: the cover is softened over a cell each way: whole inside a cloud, none two cells outside it, between at its edge', () => {
  const g = satGrid(frame(0, 0, (_east, north) => (north > 0 ? { cloud: 255, top: 1600 } : {})), job(0, 0))
  assert.ok(g.cover[cellAt(g, 0, 20)] > 0.999)
  assert.equal(g.cover[cellAt(g, 0, -6)], 0)
  const edge = [g.cover[cellAt(g, 0, -1.2)], g.cover[cellAt(g, 0, 1.2)]]
  assert.ok(edge[0] > 0.1 && edge[0] < 0.5 && edge[1] > 0.5 && edge[1] < 0.95, String(edge))
})

test('satGrid: a cell is not seen where the picture is not processed, nor outside the picture', () => {
  const g = satGrid(frame(0, 0, (east) => ({ cloud: 255, top: 1600, unseen: east > 0 }), 200), job(0, 0))
  assert.equal(g.seen[cellAt(g, -50, 0)], 1)
  assert.equal(g.seen[cellAt(g, 50, 0)], 0)
  assert.equal(g.seen[cellAt(g, -130, 0)], 0) // the picture ends 100 km out
  assert.ok(g.cover[cellAt(g, -50, 0)] > 0.99)
  assert.equal(g.cover[cellAt(g, 50, 0)], 0) // what is not processed is no cloud of the satellite's
  assert.ok(Math.abs(gridCloudy(g) - 1) < 0.05)
})

test('satGrid: cloud the product gives no height takes its neighbours\' top; with none near, the model\'s highest cloudy level and a thickness, else SAT_NO_TOP_M', () => {
  const holed = satGrid(frame(0, 0, (east, north) => (Math.abs(east) < 30 && Math.abs(north) < 30 ? { cloud: 255, top: east < 0 ? 6400 : 0 } : {})), job(0, 0))
  assert.ok(Math.abs(holed.topM[cellAt(holed, 20, 0)] - 6400) < 1)
  const bare = frame(0, 0, block(0, 0, 20, 0))
  assert.ok(Math.abs(satGrid(bare, job(0, 0)).topM[cellAt(holed, 0, 0)] - SAT_NO_TOP_M) < 1)
  const cirrus = model(0, 0, [0, 0, 0, 0, 0, 0, 0, 60]) // 300 hPa, 9,160 m
  assert.ok(Math.abs(satGrid(bare, job(0, 0, { model: cirrus })).topM[cellAt(holed, 0, 0)] - (9160 + 1210)) < 1) // a top at 9,160 m is 1,210 m thick
})

test('satBase: the nearest airport\'s highest layer under the top, within 60 km', () => {
  const from = baseSources([metar(0.2, 0, 100, [['SCT', 1640], ['BKN', 4593]])], null) // 22 km north: 600 m and 1,500 m above the sea
  assert.ok(Math.abs(satBase(2500, 0, 0, from).baseM - 1500) < 1)
  assert.ok(Math.abs(satBase(1200, 0, 0, from).baseM - 600) < 1) // (the 1,500 m layer is not under this top)
  assert.equal(satBase(2500, 0, 0, from).topM, 2500)
  // 80 km away it says nothing: the thickness of a 2,500 m top
  assert.ok(Math.abs(satBase(2500, 0.92, 0, from).baseM - 1600) < 1)
  // A sky hidden is a base too.
  assert.ok(Math.abs(satBase(1500, 0, 0, baseSources([metar(0.1, 0, 50, [], { vertVisFt: 300 })], null)).baseM - 141.44) < 1)
})

test('satBase: a layer more than SAT_DEEP_M under the top is another cloud\'s: the model is asked, then the thickness by the top\'s height', () => {
  assert.equal(SAT_DEEP_M, 3000)
  const station = [metar(0.1, 0, 0, [['OVC', 984]])] // 300 m
  assert.ok(Math.abs(satBase(10_000, 0, 0, baseSources(station, null)).baseM - 9000) < 1) // cirrus over a low overcast
  assert.ok(Math.abs(satBase(3200, 0, 0, baseSources(station, null)).baseM - 300) < 1) // 2,900 m deep: the report's
  // The model: the lowest of the run of cloudy levels just under the top.
  const layered = model(0, 0, [0, 0, 80, 50, 40, 0, 0, 0, 0, 0]) // 1,450, 3,010 and 4,200 m
  assert.ok(Math.abs(satBase(5000, 0, 0, baseSources([], layered)).baseM - 3010) < 1) // (1,450 m is more than 3,000 m under)
  assert.ok(Math.abs(satBase(5000, 0, 0, baseSources([], model(0, 0, [0, 0, 80, 0, 40]))).baseM - 4200) < 1) // (a clear level between)
  assert.ok(Math.abs(satBase(5000, 0, 0, baseSources([], model(0, 0, [0, 0, 80]))).baseM - 3500) < 1) // none within reach: 1,500 m thick
  assert.ok(Math.abs(satBase(5000, 0, 0, baseSources(station, layered)).baseM - 3010) < 1)
  // An airport's layer comes before the model's.
  assert.ok(Math.abs(satBase(5000, 0, 0, baseSources([metar(0.1, 0, 0, [['BKN', 12_000]])], layered)).baseM - 3657.6) < 1)
})

test('satBase: the thickness is thin for high cloud and thicker for low and middle cloud; a base stays over the ground, and the cloud 300 m thick', () => {
  const none = baseSources([], null)
  const thick = (top: number): number => top - satBase(top, 0, 0, none).baseM
  assert.deepEqual([thick(1000), thick(2500), thick(5000), thick(8000), thick(10_000), thick(14_000)], [600, 900, 1500, 1500, 1000, 800])
  assert.ok(thick(6000) > thick(2500) && thick(6000) > thick(12_000))
  assert.equal(SAT_THICK.length, 6)
  const high = baseSources([], model(0, 0, [], undefined, 1800)) // the model's ground at 1,800 m
  assert.deepEqual(satBase(2000, 0, 0, high), { baseM: 1850, topM: 2150 })
  assert.deepEqual(satBase(320, 0, 0, none), { baseM: 50, topM: 350 })
})

test('satGrid: every cell with cover has a top and a base under it, and so has the cell just beyond the cloud\'s edge', () => {
  const g = satGrid(frame(0, 0, block(0, 0, 20, 3200)), job(0, 0, { metars: [metar(0.1, 0.1, 0, [['BKN', 6562]])] })) // 2,000 m
  for (let o = 0; o < g.cover.length; o++) {
    if (g.cover[o] > 0) assert.ok(g.topM[o] > g.baseM[o] && g.baseM[o] > 0, `cell ${o}`)
  }
  const inside = cellAt(g, 0, 0)
  assert.ok(Math.abs(g.topM[inside] - 3200) < 1 && Math.abs(g.baseM[inside] - 2000) < 1)
  const beyond = cellAt(g, 23.7, 0) // the cover ends at 22.5 km
  assert.equal(g.cover[beyond], 0)
  assert.ok(Math.abs(g.topM[beyond] - 3200) < 1 && Math.abs(g.baseM[beyond] - 2000) < 1)
  assert.equal(g.topM[cellAt(g, 60, 0)], 0)
})

test('satCell: the grid\'s cell at a place of the field, or none outside its square', () => {
  const g = satGrid(frame(32, 35, block(50, -30, 10, 3200)), job(32, 35))
  const cell = satCell(g, 32, 35, 32 - 30 / KM_PER_DEG, 35 + 50 / (KM_PER_DEG * Math.cos(32 * RAD)))
  assert.ok(g.cover[cell] > 0.9)
  assert.equal(satCell(g, 32, 35, 34, 35), -1)
})

test('satGrid: two decks side by side whose tops differ have no gap between them (the heights the moves are worked out from are smoothed: the blocks of the product are steps, a cloud\'s top is not)', () => {
  // Over Israel a top is moved south-west: a high deck south of a low one moves away from it. Taken pixel by pixel, a gap of 8 km would open.
  const g = satGrid(frame(32, 35, (_east, north) => ({ cloud: 255, top: north < 0 ? 10_240 : 1920 })), job(32, 35))
  let least = 1
  for (let north = -80; north <= 80; north += CELL_KM) least = Math.min(least, g.cover[cellAt(g, 0, north)])
  assert.ok(least > 0.67, `the least cover on a line across the two: ${least}`)
  // Far from where they meet each stands where its own top puts it.
  assert.ok(Math.abs(g.topM[cellAt(g, 0, 100)] - 1920) < 1 && Math.abs(g.topM[cellAt(g, 0, -100)] - 10_240) < 1)
  const edge = satGrid(frame(32, 35, (east, north) => (east < 0 ? { cloud: 255, top: north < 0 ? 10_240 : 1920 } : {})), job(32, 35))
  const high = parallaxKm(32, 35, 10_240)
  // The high deck's own edge (toward clear air) is moved by its whole parallax, not by a share of it.
  const row = (north: number): number[] => Array.from({ length: 40 }, (_, k) => edge.cover[cellAt(edge, -50 + k * CELL_KM, north)])
  const ends = (cs: number[]): number => -50 + CELL_KM * (cs.findIndex((c) => c < 0.5) + 0.5 - (0.5 - cs[cs.findIndex((c) => c < 0.5)]) / (cs[cs.findIndex((c) => c < 0.5) - 1] - cs[cs.findIndex((c) => c < 0.5)]) - 0.5)
  assert.ok(Math.abs(ends(row(-100)) - high.east) < 1.5, `${ends(row(-100))} against ${high.east}`)
})

test('satGrid: a frame far larger than the field gives the same grid as its part round the field (only what can reach the field is worked on)', () => {
  const paint = (east: number, north: number): { cloud?: number; top?: number } => (Math.sin(east / 23) * Math.cos(north / 31) > 0.2 ? { cloud: 255, top: 320 * (4 + Math.round(8 + 8 * Math.sin(east / 61))) } : {})
  const large = satGrid(frame(32, 35, paint, 1000), job(32, 35))
  const small = satGrid(frame(32, 35, paint, 700), job(32, 35))
  let worst = 0
  for (let o = 0; o < large.cover.length; o++) worst = Math.max(worst, Math.abs(large.cover[o] - small.cover[o]))
  assert.ok(worst < 0.02, `the covers differ by ${worst} at most`)
})

test('satGrid: inside a cloud whose top slopes the cover stays whole (the pixels are pulled apart where a higher top is moved farther: the cover is their cloud\'s share of what lands in a cell, not its sum)', () => {
  // Over Israel: a deck whose top climbs from 2 km to 12 km over 100 km southward. Its pixels land up to 13 km apart from where they lay side by side.
  const g = satGrid(frame(32, 35, (_east, north) => ({ cloud: 255, top: 320 * Math.round((2000 + 100 * Math.min(100, Math.max(0, 40 - north))) / 320) })), job(32, 35))
  let [least, most] = [1, 0]
  for (let north = -110; north <= 90; north += CELL_KM) for (const east of [-60, 0, 60]) {
    least = Math.min(least, g.cover[cellAt(g, east, north)])
    most = Math.max(most, g.cover[cellAt(g, east, north)])
  }
  assert.ok(least > 0.97 && most <= 1, `the cover inside the deck: ${least} … ${most}`)
})
