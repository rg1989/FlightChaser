// client/scene/weather3d.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import v8 from 'node:v8'
import vm from 'node:vm'
import { Cartesian3, Cartographic, ClassificationType, Color, JulianDate, Math as CesiumMath, StripeMaterialProperty } from 'cesium'
import type { CustomDataSource, Entity, Viewer } from 'cesium'
import { distanceNm } from '../../shared/geo.ts'
import { geoidN } from '../../shared/geoid.ts'
import { encodeSatCut } from '../../shared/sat.ts'
import { MODEL_CLOUD_HPA, MODEL_WIND_HPA, type Cloud, type Metar, type ModelGeo, type ModelGrid, type Sigmet } from '../../shared/wx.ts'
import type { TerrainFrame } from '../types.ts'
import { DEFAULT_UNITS, type Units } from '../ui/units.ts'
import { LOOKS, MAX_CLOUDS, MODEL_LOOK, PUFF_FILL, RADAR_LOOK, REBUILD_KM, modelClouds, nearestClouds, observedClouds, radarBases, radarClouds, type CloudSpec } from './cloudField.ts'
import type { Builder } from './fieldBuilder.ts'
import { fieldCentre } from './fieldPlace.ts'
import { fogNear, type Fog } from './groundFog.ts'
import type { LayerLabel } from './placeLabels.ts'
import { radarPixel, windOf, type Fall } from './precip.ts'
import { RadarSource, type SourceTile } from './radar.ts'
import { radarCells } from './radarCells.ts'
import { modelWindAt } from './modelWind.ts'
import { REACH_KM } from './cloudShaders.ts'
import { CloudVolume, type CloudLook, type HazardStyle } from './cloudVolume.ts'
import { bytesImage } from './gpuImage.ts'
import { countLayer } from './sculptGpu.ts'
import { SculptedClouds } from './sculptedClouds.ts'
import { makeField } from './wxFieldJob.ts'
import { SAT_GRID_N, type SatGrid } from './satGrid.ts'
import { SAT_CHECK_MS, SAT_KEEP_MS, SAT_LAYER, SAT_N, SatelliteSource, satBox, satCapsUrl, type SatFetch } from './satellite.ts'
import { HAZARD_KM, HttpError, MODEL_DWELL_MS, Weather3D, type Sky, type SkyClouds, echoShade, parseWxAt, parseWxBreak, parseWxDemo, parseWxSat, parseWxTier, satelliteFor, statusText3d } from './weather3d.ts'
import { aheadPath, type AheadPath } from './wxAhead.ts'
import { gatherer, type GatherJob, type Gathered } from './wxGather.ts'
import { demoSky } from './wxDemo.ts'
import { buildField, type WxField } from './wxField.ts'
import type { Hazard } from './wxGeo.ts'
import { MODEL_CREDIT, SAT_CREDIT, sigmetColor, sigmetLabel } from './wxText.ts'

type Ring = [number, number][]
const FT = 0.3048
const KM_PER_DEG = 111.195 // of latitude, on a sphere of 6,371 km
const NOW = JulianDate.now()
const lonlat = (c: Cartesian3): [number, number] => {
  const p = Cartographic.fromCartesian(c)
  return [CesiumMath.toDegrees(p.longitude), CesiumMath.toDegrees(p.latitude)]
}
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol

test('parseWxAt: ?wxat=lat,lon, in degrees; anything else is none', () => {
  assert.deepEqual(parseWxAt('?wxat=47.46,8.55'), { lat: 47.46, lon: 8.55 })
  assert.deepEqual(parseWxAt('?hex=4b1805&wxat=-33.9, 151.2&chase=1'), { lat: -33.9, lon: 151.2 })
  assert.deepEqual(parseWxAt('?wxat=-90,-180'), { lat: -90, lon: -180 })
  for (const bad of ['', '?hex=4b1805', '?wxat=', '?wxat=abc', '?wxat=47', '?wxat=47,8,1', '?wxat=,8', '?wxat=47,', '?wxat=91,0', '?wxat=0,181', '?wxat=NaN,1', '?wxat=1e999,1']) {
    assert.equal(parseWxAt(bad), null, bad)
  }
})

test('parseWxDemo: ?wxdemo=1 is the demo sky from its start, ?wxdemo=60 the aircraft 60 km along it; absent or not a number: the real weather', () => {
  assert.equal(parseWxDemo('?wxdemo=1'), 0)
  assert.equal(parseWxDemo('?hex=a831b2&chase=1&wx=1&wxdemo=60&cam=0,-12,600'), 60)
  assert.equal(parseWxDemo('?wxdemo=98'), 98)
  assert.equal(parseWxDemo('?wxdemo=12.5'), 12.5)
  for (const off of ['', '?wx=1', '?wxdemo=', '?wxdemo=on', '?wxdemo=NaN', '?wxdemo=1e999', '?wxdemo=6km']) assert.equal(parseWxDemo(off), null, off)
})

test('statusText3d: clouds from the airports held, the hazard areas, the forecast model\'s credit while a grid is held, a note; singular for one', () => {
  assert.equal(statusText3d({ airports: 3, areas: 2, model: false, note: '' }), 'Clouds from 3 airports · 2 hazard areas')
  assert.equal(statusText3d({ airports: 1, areas: 1, model: false, note: '' }), 'Clouds from 1 airport · 1 hazard area')
  assert.equal(statusText3d({ airports: 0, areas: 0, model: false, note: '' }), 'Clouds from 0 airports · 0 hazard areas')
  assert.equal(statusText3d({ airports: 3, areas: 0, model: false, note: 'some weather unavailable' }), 'Clouds from 3 airports · 0 hazard areas · some weather unavailable')
  assert.equal(MODEL_CREDIT, 'Weather data by Open-Meteo.com', 'the credit its licence (CC BY 4.0) asks for, as it words it')
  assert.equal(statusText3d({ airports: 3, areas: 2, model: true, note: '' }), 'Clouds from 3 airports · 2 hazard areas · Weather data by Open-Meteo.com')
  assert.equal(statusText3d({ airports: 1, areas: 0, model: true, note: 'some weather unavailable' }), 'Clouds from 1 airport · 0 hazard areas · Weather data by Open-Meteo.com · some weather unavailable')
  assert.equal(statusText3d({ airports: 0, areas: 0, model: true, note: '' }), 'Clouds from the forecast · 0 hazard areas · Weather data by Open-Meteo.com', 'over the sea')
})

test('statusText3d: while the satellite\'s frame is in use the line says so, with the frame\'s time, and carries EUMETSAT\'s credit after Open-Meteo\'s', () => {
  const sat = Date.UTC(2026, 9, 4, 14, 45)
  assert.equal(SAT_CREDIT, '© EUMETSAT')
  assert.equal(statusText3d({ airports: 3, areas: 2, model: true, sat, note: '' }), 'Clouds from 3 airports · cloud positions from Meteosat, 14:45 UTC · 2 hazard areas · Weather data by Open-Meteo.com · © EUMETSAT')
  assert.equal(statusText3d({ airports: 1, areas: 0, model: false, sat, note: 'some weather unavailable' }), 'Clouds from 1 airport · cloud positions from Meteosat, 14:45 UTC · 0 hazard areas · © EUMETSAT · some weather unavailable')
  // With no airport near (over the sea) the satellite draws the clouds, not the forecast: the forecast still gives their bases and the winds, so its credit stays.
  assert.equal(statusText3d({ airports: 0, areas: 1, model: true, sat, note: '' }), 'Cloud positions from Meteosat, 14:45 UTC · 1 hazard area · Weather data by Open-Meteo.com · © EUMETSAT')
  assert.equal(statusText3d({ airports: 0, areas: 0, model: false, sat, note: '' }), 'Cloud positions from Meteosat, 14:45 UTC · 0 hazard areas · © EUMETSAT')
  assert.equal(statusText3d({ airports: 3, areas: 2, model: true, sat: null, note: '' }), 'Clouds from 3 airports · 2 hazard areas · Weather data by Open-Meteo.com')
})

/** The ring a lon/lat box makes, closed as GeoJSON closes it. */
const box = (south: number, west: number, north: number, east: number): Ring => [[west, south], [east, south], [east, north], [west, north], [west, south]]

const sigmet = (o: Partial<Sigmet> & { rings: Ring[] }): Sigmet => ({ hazard: 'TS', qualifier: 'EMBD', base: null, top: 35000, until: '2026-10-03T06:00:00Z', raw: '', ...o })
const AC = { lat: 32.1, lon: 34.9, altM: 10_000 }
/** A box whose south edge is km due north of the aircraft, 2° wide round its meridian, height° tall. */
const northOf = (km: number, height = 1): Ring => box(AC.lat + km / KM_PER_DEG, AC.lon - 1, AC.lat + km / KM_PER_DEG + height, AC.lon + 1)

// ---- Weather3D --------------------------------------------------------------------------------------------------------

const HOST = 'https://tilecache.rainviewer.com'
const INDEX = { host: HOST, radar: { past: [{ time: 1759420200, path: '/v2/radar/old' }, { time: 1759420800, path: '/v2/radar/new' }] } }
/** A report of a clear sky (CAVOK) unless o says otherwise. */
const metar = (id: string, lat: number, lon: number, o: Partial<Metar> = {}): Metar => ({
  id, name: id, lat, lon, elevM: 30, obsMs: null, cat: 'VFR', wdir: null, wspd: 0, wgst: null, visKm: null, visPlus: true, tempC: null, dewC: null,
  qnhHpa: null, wx: null, clouds: [], vertVisFt: null, raw: `METAR ${id} 031200Z 27010KT CAVOK 25/12 Q1015`, ...o,
})
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))
const MIN = 60_000

type Kind = 'metar' | 'sigmet' | 'radar' | 'model'
interface LabelCall { key: string; rank: number; labels: LayerLabel[] }

/** What a fake sky was told: every draw, frame and set. */
function fakeSky() {
  return {
    clouds: {
      show: false, draws: [] as CloudSpec[][], ats: [] as { lat: number; lon: number }[], sats: [] as (SatGrid | null)[], frames: [] as [TerrainFrame, number][], fades: [] as Cartesian3[], destroyed: false,
      look: 'severity' as CloudLook, field: null as WxField | null, failed: false, tier: 0, passMs: Number.NaN,
      hazardSets: [] as { hazards: Hazard[]; style: HazardStyle; color: (h: Hazard) => string }[], aheads: [] as { path: AheadPath | null; show: { track: boolean; slice: boolean } }[],
      draw(specs: readonly CloudSpec[], at: { lat: number; lon: number }, sat: SatGrid | null = null) { this.draws.push([...specs]); this.ats.push({ ...at }); this.sats.push(sat) },
      setHazards(hazards: readonly Hazard[], style: HazardStyle, color: (h: Hazard) => string) { this.hazardSets.push({ hazards: [...hazards], style, color }) },
      setAhead(path: AheadPath | null, show: { track: boolean; slice: boolean }) { this.aheads.push({ path, show: { ...show } }) },
      frame(tf: TerrainFrame, night: number) { this.frames.push([{ ...tf }, night]) },
      fade(from: Cartesian3) { this.fades.push(Cartesian3.clone(from)) },
      destroy() { this.destroyed = true },
    },
    fog: {
      sets: [] as (Fog | null)[], frames: [] as [TerrainFrame, number][], destroyed: false,
      set(f: Fog | null) { this.sets.push(f) },
      frame(tf: TerrainFrame, night: number) { this.frames.push([{ ...tf }, night]) },
      destroy() { this.destroyed = true },
    },
    precip: {
      sets: [] as (Fall | null)[], aims: [] as number[], destroyed: false,
      set(f: Fall | null) { this.sets.push(f) },
      aim(headingRad: number) { this.aims.push(headingRad) },
      destroy() { this.destroyed = true },
    },
  }
}

const GRID_HOUR_MS = 1791014400_000 // 2026-10-03 08:00 UTC: the hour of every grid the rig gives
const CREDIT = ' · Weather data by Open-Meteo.com' // on the line while a grid is held
const ISA_Z: Readonly<Record<number, number>> = { 1000: 110, 925: 760, 850: 1460, 700: 3010, 600: 4200, 500: 5570, 400: 7180, 300: 9160, 250: 10360, 200: 11800 } // m
const WIND_KT = [10, 20, 40, 80, 90, 100] // from the west at 850, 700, 500, 300, 250 and 200 hPa
interface GridOptions {
  cover?: (hPa: number, place: number) => number
  wind?: (level: number, place: number) => [fromDeg: number, kt: number]
}
/** A model grid at geo: its cover from `cover` (none by default), the levels at the standard atmosphere's heights, sea level, the wind from the west. */
function gridFor(geo: ModelGeo, o: GridOptions = {}): ModelGrid {
  const per = <T>(f: (p: number) => T): T[] => Array.from({ length: geo.n * geo.n }, (_, p) => f(p))
  const wind = o.wind ?? ((l: number): [number, number] => [270, WIND_KT[l]])
  return {
    ...geo, timeMs: GRID_HOUR_MS, elevM: per(() => 0),
    clouds: MODEL_CLOUD_HPA.map((hPa) => ({ hPa, cover: per((p) => o.cover?.(hPa, p) ?? 0), zM: per(() => ISA_Z[hPa]) })),
    winds: MODEL_WIND_HPA.map((hPa, l) => ({ hPa, kt: per((p) => wind(l, p)[1]), deg: per((p) => wind(l, p)[0]) })),
  }
}
/** The grid server/wx.ts gives for the place a request asks about: 7 × 7 places 0.25° apart round the middle of its 0.5° cell. */
function geoOf(url: string): ModelGeo {
  const q = new URL(url, 'http://localhost').searchParams
  const middle = (v: number): number => (Math.floor(v / 0.5) + 0.5) * 0.5
  return { lat0: middle(Number(q.get('lat'))) - 0.75, lon0: middle(Number(q.get('lon'))) - 0.75, step: 0.25, n: 7 }
}

/**
 * A Weather3D over a fake viewer (its camera at the aircraft until moved), names overlay, sky, radar tiles and network: what
 * was asked, answered from `answers` (or failed, or held until release()). The model is asked at the first look (no dwell) unless
 * `dwell` asks for the real 10 s; `network` has it use its own getJson, over the global fetch; `demo`: ?wxdemo's km.
 */
function rig(o: { at?: { lat: number; lon: number }; dwell?: boolean; network?: boolean; demo?: number; tier?: number; gather?: Builder<GatherJob, Gathered>; satellite?: SatelliteSource; sky?: ReturnType<typeof fakeSky> & Pick<Sky, 'cloudsFor'>; look?: CloudLook } = {}) {
  const asked: string[] = []
  const answers: Record<'metar' | 'sigmet' | 'radar', unknown> = { metar: [], sigmet: [], radar: INDEX }
  const failing = new Set<Kind>()
  const hold = new Set<Kind>()
  const held: (() => void)[] = []
  const model = { make: (geo: ModelGeo): unknown => gridFor(geo), retryAfterS: undefined as number | undefined } // what the server would answer for a grid: nothing in the sky, by default; and the wait a failing ask's 503 names
  const getJson = async (url: string): Promise<unknown> => {
    asked.push(url)
    const kind: Kind = url.includes('/wx/metar') ? 'metar' : url.includes('/wx/sigmet') ? 'sigmet' : url.includes('/wx/model') ? 'model' : 'radar'
    const answer = kind === 'model' ? model.make(geoOf(url)) : structuredClone(answers[kind]) // as it is when asked
    if (hold.has(kind)) await new Promise<void>((resolve) => held.push(resolve)) // until release(), when it is answered or fails as `failing` then says
    if (failing.has(kind)) throw kind === 'model' && model.retryAfterS !== undefined ? new HttpError(503, model.retryAfterS) : new Error(`${kind} down`)
    return answer
  }
  const sources: CustomDataSource[] = []
  const removed: [CustomDataSource, boolean | undefined][] = []
  const camera = { positionCartographic: Cartographic.fromDegrees(AC.lon, AC.lat, AC.altM), heading: 0 }
  let ground: number | undefined
  let gone = false // the viewer destroyed
  const viewer = {
    dataSources: { add: async (ds: CustomDataSource) => void sources.push(ds), remove: async (ds: CustomDataSource, destroy?: boolean) => void removed.push([ds, destroy]) },
    isDestroyed: () => gone,
    camera,
    scene: { globe: { getHeight: (): number | undefined => ground }, skyAtmosphere: { saturationShift: 0, brightnessShift: 0 } },
  } as unknown as Viewer
  const labelCalls: LabelCall[] = []
  const labels = { setLayer: (key: string, rank: number, ls: readonly LayerLabel[]) => void labelCalls.push({ key, rank, labels: [...ls] }) }
  const lines: (string | null)[] = []
  let units: Units = DEFAULT_UNITS
  const sky = o.sky ?? fakeSky()
  const tiles = new Map<string, SourceTile>() // z/x/y
  const tileAsks: string[] = []
  const frameTiles = new Map<string, Map<string, SourceTile>>() // tiles of the frame whose URL has this in it, over `tiles`
  const tileHold = { on: false } // while on, a tile is answered only after releaseTiles()
  const tileHeld: (() => void)[] = []
  const tile = async (radar: RadarSource, z: number, x: number, y: number): Promise<SourceTile | null> => {
    const key = `${z}/${x}/${y}`
    tileAsks.push(key)
    if (tileHold.on) await new Promise<void>((resolve) => tileHeld.push(resolve))
    const own = [...frameTiles].find(([path]) => radar.url.includes(path))?.[1]
    return own?.get(key) ?? tiles.get(key) ?? null // as it is when answered
  }
  const epoch = { now: GRID_HOUR_MS + 30 * MIN } // the wall clock: half an hour into the hour the grids are for
  const shades: number[] = [] // what the sky's grey was handed on as
  const failedNotes: string[] = [] // what the app was told when the cloud pass failed
  const w = new Weather3D(viewer, {
    apiBase: '/api', labels, getJson: o.network ? undefined : getJson, onStatus: (t) => lines.push(t), units: () => units, at: o.at, sky, tile, epochMs: () => epoch.now,
    onShade: (s) => shades.push(s), dwellMs: o.dwell ? undefined : 0, demo: o.demo, onCloudsFailed: (note) => failedNotes.push(note), tier: o.tier, gather: o.gather, satellite: o.satellite ?? null, // (no satellite unless a test brings one: the default asks EUMETSAT)
    look: o.look,
  })
  return {
    w, asked, answers, model, epoch, failing, hold, sources, removed, labelCalls, lines, shades, failedNotes, sky, tiles, tileAsks, tileHold, frameTiles,
    releaseTiles: (newestFirst = false) => (newestFirst ? tileHeld.splice(0).reverse() : tileHeld.splice(0)).forEach((f) => f()),
    releaseSome: (n: number) => tileHeld.splice(0, n).forEach((f) => f()), // the first n tiles held
    held: () => tileHeld.length,
    setCamera: (lat: number, lon: number, hM: number): void => void Cartographic.fromDegrees(lon, lat, hM, camera.positionCartographic),
    setGround: (hM: number | undefined): void => void (ground = hM),
    setHeading: (rad: number): void => void (camera.heading = rad),
    destroyViewer: (): void => void (gone = true),
    release: () => held.splice(0).forEach((f) => f()),
    areas: (): Hazard[] => sky.clouds.hazardSets.at(-1)?.hazards ?? [], // the hazard areas the cloud pass holds now: it draws their edges
    handed: (): number => sky.clouds.hazardSets.length, // how often it was given them
    footprints: (): Entity[] => [...sources[0].entities.values], // a copy: the collection's own array changes as it does
    shown: (): LayerLabel[] => labelCalls.at(-1)?.labels ?? [], // the labels the overlay holds for the layer now
    asks: (what: 'metar' | 'sigmet' | 'weather-maps' | 'model'): string[] => asked.filter((u) => u.includes(what === 'metar' ? '/wx/metar' : what === 'sigmet' ? '/wx/sigmet' : what === 'model' ? '/wx/model' : 'weather-maps')),
    setUnits: (u: Units): void => void (units = u),
    skyShift: (): { saturationShift: number; brightnessShift: number } => (viewer.scene as unknown as { skyAtmosphere: { saturationShift: number; brightnessShift: number } }).skyAtmosphere,
  }
}
type Rig = ReturnType<typeof rig>

/** Shown, given the aircraft, and its first asks answered. */
async function open(r: Rig, at: { lat: number; lon: number; altM: number; trackDeg?: number; gsKt?: number } = AC, nowMs = 0): Promise<void> {
  r.w.show = true
  r.w.update(at, nowMs)
  await flush()
}

/** A footprint's two entities for a ring: its striped fill, and its outline. */
const fill = (e: Entity): { ring: [number, number][]; even: Color; odd: Color; repeat: number; across: boolean; onGround: boolean; turned: number; terrainOnly: boolean } => {
  const g = e.polygon!
  const m = (g.material as StripeMaterialProperty).getValue(NOW) as { evenColor: Color; oddColor: Color; repeat: number; horizontal: boolean }
  return {
    ring: (g.hierarchy!.getValue(NOW) as { positions: Cartesian3[] }).positions.map(lonlat), even: m.evenColor, odd: m.oddColor, repeat: m.repeat, across: m.horizontal,
    onGround: g.height === undefined && g.extrudedHeight === undefined, turned: g.stRotation!.getValue(NOW) as number,
    terrainOnly: g.classificationType!.getValue(NOW) === ClassificationType.TERRAIN,
  }
}
const outline = (e: Entity): { ring: [number, number][]; color: Color; width: number; clamped: boolean } => {
  const g = e.polyline!
  return {
    ring: (g.positions!.getValue(NOW) as Cartesian3[]).map(lonlat), color: (g.material.getValue(NOW) as { color: Color }).color,
    width: g.width!.getValue(NOW) as number, clamped: g.clampToGround!.getValue(NOW) as boolean,
  }
}

test('Weather3D: hidden it asks for nothing and draws nothing, however often it is updated', async () => {
  const r = rig()
  assert.equal(r.w.show, false)
  r.answers.sigmet = [sigmet({ rings: [northOf(100)] })]
  for (let t = 0; t < 20 * MIN; t += 1000) r.w.update(AC, t)
  await flush()
  assert.deepEqual(r.asked, [])
  assert.deepEqual([r.handed(), r.footprints().length], [0, 0])
  assert.deepEqual(r.labelCalls, [])
  assert.deepEqual(r.lines, [])
  assert.equal(r.sources[0].show, false, 'its data source is in the viewer, hidden')
})

test('Weather3D: shown it asks at the first update with an aircraft: METARs of a whole-degree box 2° round it, SIGMETs, RainViewer\'s index; the model\'s grid once the aircraft has stayed 10 s', async () => {
  const r = rig({ dwell: true })
  r.w.show = true
  assert.deepEqual(r.asked, [], 'showing asks nothing: the aircraft is not known yet')
  r.w.update(null, 0)
  r.w.update({ lat: Number.NaN, lon: 34, altM: 0 }, 0)
  r.w.update({ lat: 32, lon: Number.POSITIVE_INFINITY, altM: 0 }, 0)
  assert.deepEqual(r.asked, [], 'no aircraft, or a place that is not one')
  r.w.update(AC, 0)
  await flush()
  assert.deepEqual(r.asks('metar'), ['/api/wx/metar?bbox=30,32,35,37']) // 30.1 → 30, 32.9 → 32, 34.1 → 35, 36.9 → 37
  assert.deepEqual(r.asks('sigmet'), ['/api/wx/sigmet'])
  assert.deepEqual(r.asks('weather-maps'), ['https://api.rainviewer.com/public/weather-maps.json'])
  assert.equal(r.asked.length, 3, 'the forecast is not asked at once: a grid is a lot of Open-Meteo\'s calls')
  r.w.update(AC, MODEL_DWELL_MS - 1000)
  r.w.update(AC, MODEL_DWELL_MS)
  await flush()
  assert.deepEqual(r.asks('model'), ['/api/wx/model?lat=32.1&lon=34.9'], 'the place the aircraft is at: the server snaps it to its cell')
  assert.equal(r.asked.length, 4)
})

test('Weather3D: the box is cut at the poles and the antimeridian', async () => {
  const north = rig()
  await open(north, { lat: 89.5, lon: 179.5, altM: 0 })
  assert.deepEqual(north.asks('metar'), ['/api/wx/metar?bbox=87,177,90,180'])
  const south = rig()
  await open(south, { lat: -89.5, lon: -179.5, altM: 0 })
  assert.deepEqual(south.asks('metar'), ['/api/wx/metar?bbox=-90,-180,-87,-177'])
})

test('Weather3D: update() runs every frame and looks once a second: the frames between ask, draw and write nothing', async () => {
  const r = rig()
  r.answers.sigmet = [sigmet({ rings: [northOf(100)] })]
  await open(r)
  const [asked, calls, handed] = [r.asked.length, r.labelCalls.length, r.handed()]
  assert.ok(asked > 0 && calls > 0 && handed > 0 && r.areas().length === 1)
  r.answers.sigmet = []
  const last = { ...AC, lat: AC.lat + 0.0999 }
  for (let t = 1; t < 1000; t++) r.w.update({ ...AC, lat: AC.lat + t * 1e-4 }, t) // 999 frames
  r.w.update(last, 999)
  await flush()
  assert.deepEqual([r.asked.length, r.labelCalls.length, r.handed()], [asked, calls, handed])
  assert.deepEqual(r.w.aircraft, last, 'the aircraft it holds is the newest frame\'s')
  r.w.update(AC, 5 * MIN - 500) // a look: nothing due yet
  r.w.update(AC, 5 * MIN) // the METARs are due, but half a second after a look is not a look
  await flush()
  assert.equal(r.asks('metar').length, 1)
  r.w.update(AC, 5 * MIN + 500)
  await flush()
  assert.equal(r.asks('metar').length, 2, 'asked at the next look')
})

test('Weather3D: METARs every 5 min, SIGMETs and the radar frame every 10, and METARs at once when the aircraft leaves its box', async () => {
  const r = rig()
  await open(r) // box 30,32,35,37
  const n = (): number[] => [r.asks('metar').length, r.asks('sigmet').length, r.asks('weather-maps').length]
  assert.deepEqual(n(), [1, 1, 1])
  r.w.update(AC, 5 * MIN - 1000)
  await flush()
  assert.deepEqual(n(), [1, 1, 1], 'not yet')
  r.w.update(AC, 5 * MIN)
  await flush()
  assert.deepEqual(n(), [2, 1, 1], 'METARs again, the same box')
  assert.equal(r.asks('metar')[1], r.asks('metar')[0])
  r.w.update({ ...AC, lat: AC.lat + 1 }, 5 * MIN + 1000) // inside the box (to 35°): nothing, though it is a new place
  await flush()
  assert.deepEqual(n(), [2, 1, 1])
  r.w.update({ ...AC, lat: 35.2 }, 5 * MIN + 2000) // out of it by the north: the new box, the 5 min not up
  await flush()
  assert.deepEqual(n(), [3, 1, 1])
  assert.equal(r.asks('metar')[2], '/api/wx/metar?bbox=33,32,38,37')
  r.w.update({ ...AC, lat: 35.2 }, 10 * MIN - 1000)
  await flush()
  assert.deepEqual(n(), [3, 1, 1])
  r.w.update({ ...AC, lat: 35.2 }, 10 * MIN)
  await flush()
  assert.deepEqual(n(), [3, 2, 2], 'SIGMETs and the radar frame at 10 min; the METARs of the new box are not due until 10 min 2 s')
  r.w.update({ ...AC, lat: 35.2 }, 10 * MIN + 2000)
  await flush()
  assert.deepEqual(n(), [4, 2, 2])
})

test('Weather3D: the aircraft on the box\'s edge is in it; one step beyond is out', async () => {
  const r = rig()
  await open(r, { lat: 32.5, lon: 34.5, altM: 0 }) // 30.5 → 30, 32.5 → 32, 34.5 → 35, 36.5 → 37
  assert.deepEqual(r.asks('metar'), ['/api/wx/metar?bbox=30,32,35,37'])
  r.w.update({ lat: 35, lon: 37, altM: 0 }, 1000)
  await flush()
  assert.equal(r.asks('metar').length, 1, 'on its north-east corner')
  r.w.update({ lat: 35, lon: 37.001, altM: 0 }, 2000)
  await flush()
  assert.equal(r.asks('metar').length, 2)
})

test('Weather3D: what it keeps for the pieces that draw: the METARs, the SIGMETs, the radar frame\'s RadarSource, the aircraft', async () => {
  const r = rig()
  assert.deepEqual([r.w.metars, r.w.sigmets, r.w.radar, r.w.aircraft], [[], [], null, null])
  r.answers.metar = [metar('LLBG', 32.01, 34.89), metar('LLHA', 32.81, 35.04)]
  r.answers.sigmet = [sigmet({ rings: [northOf(100)] })]
  await open(r)
  assert.deepEqual(r.w.metars.map((m) => m.id), ['LLBG', 'LLHA'])
  assert.equal(r.w.metars[0].elevM, 30)
  assert.equal(r.w.sigmets.length, 1)
  assert.ok(r.w.radar instanceof RadarSource)
  assert.equal(r.w.radar.url, `${HOST}/v2/radar/new/256/{z}/{x}/{y}/2/0_1.png`, 'the newest past frame')
  assert.deepEqual(r.w.aircraft, AC)
  assert.deepEqual(r.w.shift, { dLat: 0, dLon: 0 })
  const frame = r.w.radar
  r.w.update(AC, 10 * MIN)
  await flush()
  assert.equal(r.w.radar, frame, 'the same frame again: its source, and the tiles it holds, stay')
  r.answers.radar = { host: HOST, radar: { past: [{ time: 1759421400, path: '/v2/radar/newer' }] } }
  r.w.update(AC, 20 * MIN)
  await flush()
  assert.notEqual(r.w.radar, frame)
  assert.match(r.w.radar!.url, /\/v2\/radar\/newer\//)
})

test('Weather3D: the hazard areas within 800 km are handed to the cloud pass, which draws their edges: each with its base and top, the hazard\'s colour, the style (the box until another is set)', async () => {
  const r = rig()
  const ts = sigmet({ rings: [northOf(300, 2)], base: 18000, top: 35000 })
  const turb = sigmet({ hazard: 'TURB', qualifier: 'SEV', rings: [northOf(500, 2), northOf(2000, 2)] }) // base none: from the ground
  r.answers.sigmet = [ts, turb, sigmet({ rings: [northOf(900)] }), sigmet({ rings: [northOf(200)], top: null })]
  await open(r)
  assert.equal(r.handed(), 1)
  const got = r.sky.clouds.hazardSets[0]
  assert.equal(got.hazards.length, 2, 'the ring at 2,000 km, the area at 900 and the one without a top are not handed on')
  const [a, b] = got.hazards
  assert.deepEqual([a.baseM, a.topM, b.baseM, b.topM], [18000 * FT, 35000 * FT, 0, 35000 * FT])
  assert.deepEqual([a.rings.length, b.rings.length], [1, 1])
  assert.deepEqual([got.color(a), got.color(b)], [sigmetColor('TS'), sigmetColor('TURB')])
  assert.ok(a.rings[0].some(([lon, lat]) => near(lon, AC.lon - 1, 1e-6) && near(lat, AC.lat + 300 / KM_PER_DEG, 1e-6)), 'the ring as the SIGMET gives it')
  assert.equal(got.style, 'box')
  assert.deepEqual(got.hazards, r.w.hazards)
  assert.equal(r.footprints().length, 0, 'a box has no footprint, and no volume of Cesium\'s is drawn any more')
  assert.equal(r.sources[0].show, true)
})

test('Weather3D: the style is handed to the cloud pass when it is set, with the areas it holds; a curtain and a fence have each ring\'s footprint on the ground (its outline clamped to it, and a fill in stripes 3 km wide whatever the ring\'s size, at low alpha), a box none', async () => {
  const r = rig()
  r.w.hazardStyle = 'curtain'
  assert.deepEqual(r.sky.clouds.hazardSets.map((x) => [x.hazards.length, x.style]), [[0, 'curtain']], 'set before any area is known')
  const small = northOf(300, 1) // 2 degrees of longitude by 1 of latitude: 188 km by 111
  r.answers.sigmet = [sigmet({ rings: [small] }), sigmet({ hazard: 'ICE', qualifier: 'MOD', rings: [northOf(450, 2), northOf(700, 0.5)] })]
  await open(r)
  assert.deepEqual([r.handed(), r.areas().length, r.sky.clouds.hazardSets.at(-1)!.style], [2, 2, 'curtain'])
  const foot = r.footprints()
  assert.equal(foot.length, 6, 'a fill and an outline for each of the three rings')
  const fills = foot.filter((e) => e.polygon !== undefined).map(fill)
  const lines = foot.filter((e) => e.polyline !== undefined).map(outline)
  assert.deepEqual([fills.length, lines.length], [3, 3])
  const [red, blue] = [Color.fromCssColorString(sigmetColor('TS')), Color.fromCssColorString(sigmetColor('ICE'))]
  assert.ok(fills[0].even.equals(red.withAlpha(0.26)) && fills[0].odd.equals(red.withAlpha(0.09)), `${fills[0].even} ${fills[0].odd}`)
  assert.ok(fills[1].even.equals(blue.withAlpha(0.26)) && fills[2].odd.equals(blue.withAlpha(0.09)))
  assert.ok(fills.every((f) => f.onGround && f.terrainOnly && f.across && near(f.turned, Math.PI / 4, 1e-12)), 'on the ground; the stripes across the texture\'s upward axis, which is turned to the north-east: a diagonal hatch')
  assert.deepEqual(fills[0].ring.map(([lon, lat]) => [+lon.toFixed(6), +lat.toFixed(6)]), small.map(([lon, lat]) => [+lon.toFixed(6), +lat.toFixed(6)]))
  // the stripes are counted over the ring's extent north-eastward, each 3 km wide
  const diagonal = (ring: Ring): number => {
    const km = ring.map(([lon, lat]) => ((lon - ring[0][0]) * KM_PER_DEG * Math.cos((ring[0][1] * Math.PI) / 180) + (lat - ring[0][1]) * KM_PER_DEG) / Math.SQRT2)
    return Math.max(...km) - Math.min(...km)
  }
  assert.ok(near(diagonal(small), 207, 4), `${diagonal(small)} km`)
  assert.ok(near(fills[0].repeat, diagonal(small) / 3, 1e-9) && near(fills[1].repeat, diagonal(northOf(450, 2)) / 3, 1e-9) && near(fills[2].repeat, diagonal(northOf(700, 0.5)) / 3, 1e-9), `${fills.map((f) => f.repeat)}`)
  assert.ok(fills[1].repeat > 1.3 * fills[0].repeat && fills[2].repeat < fills[0].repeat, 'more stripes on a larger ring, not wider ones')
  assert.ok(lines.every((l) => l.clamped && l.width === 2.5))
  assert.ok(lines[0].color.equals(red.withAlpha(0.9)) && lines[1].color.equals(blue.withAlpha(0.9)))
  assert.deepEqual(lines[0].ring.length, small.length, 'closed, as the ring is')
  r.w.hazardStyle = 'fence'
  assert.deepEqual([r.handed(), r.areas().length, r.sky.clouds.hazardSets.at(-1)!.style], [3, 2, 'fence'], 'the same areas, the new style')
  assert.equal(r.footprints().length, 6)
  r.w.hazardStyle = 'fence'
  assert.equal(r.handed(), 3, 'the same style again: nothing handed')
  r.w.hazardStyle = 'box'
  assert.deepEqual([r.handed(), r.sky.clouds.hazardSets.at(-1)!.style, r.footprints().length], [4, 'box', 0])
  r.w.hazardStyle = 'curtain'
  assert.equal(r.footprints().length, 6)
  r.w.show = false
  assert.equal(r.sources[0].show, false, 'hidden with the weather')
  r.w.hazardStyle = 'fence'
  r.w.show = true
  assert.deepEqual([r.sources[0].show, r.footprints().length, r.sky.clouds.hazardSets.at(-1)!.style], [true, 6, 'fence'])
})

test('Weather3D: a ring given open is closed in its footprint\'s outline', async () => {
  const r = rig()
  r.w.hazardStyle = 'fence'
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 1).slice(0, 4)] })]
  await open(r)
  const line = outline(r.footprints().find((e) => e.polyline !== undefined)!)
  assert.equal(line.ring.length, 5)
  assert.ok(near(line.ring[4][0], line.ring[0][0], 1e-9) && near(line.ring[4][1], line.ring[0][1], 1e-9))
})

test('Weather3D: the reach is 800 km from the aircraft, and a ring across the far meridian is not in it (it was "inside")', async () => {
  assert.equal(HAZARD_KM, 800)
  const r = rig()
  r.answers.sigmet = [sigmet({ rings: [northOf(790)] }), sigmet({ rings: [northOf(810)] }), sigmet({ rings: [box(25, -150, 40, -140)] })] // the last is 150°W to 140°W
  await open(r) // over Tel Aviv
  assert.deepEqual([r.w.hazards.length, r.areas().length, r.shown().length], [1, 1, 1])
  const across: Ring = [[179, -1], [-179, -1], [-179, 1], [179, 1], [179, -1]]
  const far = rig()
  far.answers.sigmet = [sigmet({ rings: [across] })]
  await open(far, { lat: 0, lon: 0, altM: 0 })
  assert.deepEqual([far.w.hazards.length, far.areas().length, far.shown().length], [0, 0, 0])
  const inside = rig()
  inside.answers.sigmet = [sigmet({ rings: [across] })]
  await open(inside, { lat: 0, lon: 179.6, altM: 0 })
  assert.deepEqual([inside.w.hazards.length, inside.areas().length, inside.shown().length], [1, 1, 1])
})

test('Weather3D: each hazard area\'s name and levels is a label at its ring\'s middle, at the top height, through the names overlay (a rank above the cities)', async () => {
  const r = rig()
  const ts = sigmet({ rings: [northOf(300, 2)], base: 18000, top: 35000 })
  const ice = sigmet({ hazard: 'ICE', qualifier: 'MOD', top: 12000, rings: [northOf(500, 1), northOf(100, 1)] })
  r.answers.sigmet = [ts, ice]
  await open(r)
  assert.deepEqual(r.labelCalls.map((c) => [c.key, c.rank]), [['hazards', 1.5]])
  assert.equal(r.shown().length, 2)
  const [a, b] = r.shown()
  assert.equal(a.text, sigmetLabel(ts, DEFAULT_UNITS))
  assert.equal(a.text, 'Embedded thunderstorms · 18,000 to 35,000 ft')
  assert.equal(a.color, sigmetColor('TS'))
  assert.ok(near(Cartographic.fromCartesian(a.position).height, 35000 * FT, 1))
  const [lon, lat] = lonlat(a.position)
  assert.ok(near(lon, AC.lon, 0.01) && near(lat, AC.lat + 300 / KM_PER_DEG + 1, 0.05), `${lon}, ${lat}: the middle of the box`)
  assert.equal(b.text, 'Moderate icing · up to 12,000 ft')
  assert.equal(b.color, sigmetColor('ICE'))
  assert.ok(near(Cartographic.fromCartesian(b.position).height, 12000 * FT, 1))
  assert.ok(near(lonlat(b.position)[1], AC.lat + 100 / KM_PER_DEG + 0.5, 0.05), 'an area with two rings in reach: the label is at the nearer')
})

test('Weather3D: the hazard areas are handed to the cloud pass, the footprints drawn and the labels given again only when what they show changes; picked again once the aircraft has moved 10 km', async () => {
  const r = rig()
  r.w.hazardStyle = 'curtain'
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] }), sigmet({ rings: [northOf(797, 2)] })] // the second is 3 km from out of reach
  await open(r)
  const first = r.footprints()
  const [calls, handed] = [r.labelCalls.length, r.handed()]
  assert.deepEqual([r.areas().length, first.length], [2, 4])
  r.w.update({ ...AC, lat: AC.lat + 0.05 }, 2000) // 5.6 km on, nearer the second: the same picks, nothing drawn again
  assert.ok(r.handed() === handed && r.footprints().every((e, i) => e === first[i]), 'not handed again; the same entities, not new ones')
  assert.equal(r.labelCalls.length, calls, 'no new labels for the same picks')
  r.w.update({ ...AC, lat: AC.lat - 0.05 }, 3000) // 5.6 km south, so the second is 803 km off; but less than 10 km from where it was picked
  assert.equal(r.handed(), handed, 'not picked again yet')
  r.w.update({ ...AC, lat: AC.lat - 0.1 }, 4000) // 11 km south of that place: picked again, and the second is out of reach
  assert.deepEqual([r.handed(), r.areas().length, r.footprints().length], [handed + 1, 1, 2])
  assert.equal(r.shown().length, 1)
  assert.equal(r.labelCalls.length, calls + 1)
  const [foot, labelCalls] = [r.footprints(), r.labelCalls.length]
  r.w.update({ ...AC, lat: AC.lat - 0.1 }, 10 * MIN + 1000) // a new list of SIGMETs with the same two areas: nothing drawn again
  await flush()
  assert.equal(r.asks('sigmet').length, 2)
  assert.ok(r.handed() === handed + 1 && r.footprints()[0] === foot[0], 'the same entity')
  assert.equal(r.labelCalls.length, labelCalls)
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)], top: 36000 }), sigmet({ rings: [northOf(797, 2)] })] // the next list: one top has changed
  r.w.update({ ...AC, lat: AC.lat - 0.1 }, 20 * MIN + 2000)
  await flush()
  assert.equal(r.asks('sigmet').length, 3)
  assert.ok(r.handed() === handed + 2 && near(r.areas()[0].topM, 36000 * FT, 1e-9) && r.footprints()[0] !== foot[0], 'handed and drawn again')
  assert.equal(r.labelCalls.length, labelCalls + 1)
  assert.match(r.shown()[0].text, /up to 36,000 ft/)
})

test('Weather3D: a new list that changes a corner, a base, a word or the hazard is handed to the cloud pass again; one that changes what is not drawn is not', async () => {
  const area = (o: Partial<Sigmet> = {}, ring: Ring = northOf(300, 2)): Sigmet => sigmet({ rings: [ring], ...o })
  const r = rig()
  r.answers.sigmet = [area()]
  await open(r)
  let t = 0
  const next = async (list: Sigmet[]): Promise<number> => {
    r.answers.sigmet = list
    t += 10 * MIN
    r.w.update(AC, t)
    await flush()
    return r.handed()
  }
  assert.equal(await next([area({ raw: 'another text', until: '2026-10-04T00:00:00Z' })]), 1, 'what is not drawn')
  let n = 1
  for (const o of [{ base: 5000 }, { qualifier: 'SEV' }, { hazard: 'TURB' }]) assert.equal(await next([area(o)]), ++n, JSON.stringify(o))
  const moved = northOf(300, 2).map(([x, y], i) => (i === 2 ? [x + 0.05, y] : [x, y])) as Ring // a corner that is not the first
  assert.equal(await next([area({ hazard: 'TURB', qualifier: 'SEV', base: 5000 }, moved)]), ++n, 'a corner moved')
  assert.ok(r.areas()[0].rings[0].some(([lon]) => near(lon, AC.lon + 1.05, 1e-9)))
})

test('Weather3D: a failure that comes late, for a box the aircraft has left, does not put the note up; nor a late answer take it down', async () => {
  const warn = console.warn
  const warned: unknown[][] = []
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    const r = rig()
    r.hold.add('metar')
    r.w.show = true
    r.w.update(AC, 0) // box 30,32,35,37: its answer is held
    r.hold.clear()
    r.answers.metar = [metar('NEW', 36, 35)]
    r.w.update({ ...AC, lat: 36 }, 1000) // out of it by the north: another box, answered at once
    await flush()
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 0 hazard areas${CREDIT}`)
    r.failing.add('metar')
    r.release() // the held ask for the box it left fails, late
    await flush()
    r.w.show = false // the line is written again from what is known: with no note
    r.w.show = true
    assert.ok(r.lines.every((line) => !/unavailable/.test(String(line))), 'no note, then or later')
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 0 hazard areas${CREDIT}`)
    assert.equal(warned.length, 0, 'not even a warning')
    // and the other way round: the current ask fails, the late one for the box it left is answered
    const s = rig()
    s.hold.add('metar')
    s.w.show = true
    s.w.update(AC, 0)
    s.hold.clear()
    s.failing.add('metar')
    s.w.update({ ...AC, lat: 36 }, 1000)
    await flush()
    assert.match(String(s.lines.at(-1)), /some weather unavailable$/)
    s.failing.clear()
    s.answers.metar = [metar('OLD', 32, 35)]
    s.release()
    await flush()
    s.w.show = false
    s.w.show = true
    assert.match(String(s.lines.at(-1)), /some weather unavailable$/, 'the note stays')
    assert.deepEqual(s.w.metars, [], 'and the late answer is not heard')
  } finally {
    console.warn = warn
  }
})

test('Weather3D: the labels are worded in the frame\'s units, and again when they change', async () => {
  const r = rig()
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)], top: 35000 })]
  await open(r)
  assert.equal(r.shown()[0].text, 'Embedded thunderstorms · up to 35,000 ft')
  r.setUnits({ ...DEFAULT_UNITS, alt: 'm' })
  r.w.update(AC, 1000)
  assert.equal(r.shown()[0].text, 'Embedded thunderstorms · up to 10,650 m')
  const calls = r.labelCalls.length
  const handed = r.handed()
  r.setUnits({ alt: 'm', speed: 'kmh', vs: 'ms' }) // a speed changes no height
  r.w.update(AC, 2000)
  assert.equal(r.labelCalls.length, calls)
  r.setUnits(DEFAULT_UNITS)
  r.w.update(AC, 3000)
  assert.equal(r.shown()[0].text, 'Embedded thunderstorms · up to 35,000 ft')
  assert.equal(r.handed(), handed, 'the areas are not handed to the cloud pass again for words')
})

test('Weather3D: hiding takes the cloud pass, the footprints and the labels away and asks no more; showing again has them back at once, asking only what is due', async () => {
  const r = rig()
  r.w.hazardStyle = 'curtain'
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
  await open(r)
  const first = r.footprints()
  const handed = r.handed()
  assert.equal(r.shown().length, 1)
  r.w.show = false
  assert.deepEqual([r.sources[0].show, r.sky.clouds.show], [false, false])
  assert.deepEqual(r.shown(), [], 'its labels are taken out of the overlay')
  assert.equal(r.labelCalls.at(-1)!.key, 'hazards')
  const asked = r.asked.length
  r.w.update(AC, 5 * MIN)
  r.w.update(AC, 30 * MIN)
  await flush()
  assert.equal(r.asked.length, asked, 'hidden: nothing asked, however late')
  r.w.show = true
  assert.deepEqual([r.sources[0].show, r.sky.clouds.show], [true, true])
  assert.equal(r.shown().length, 1, 'the labels are back with it, from what it holds')
  assert.ok(r.handed() === handed && r.areas().length === 1 && r.footprints().length === 2 && r.footprints()[0] === first[0], 'the pass kept its areas, the footprints were kept')
  r.w.update(AC, 30 * MIN)
  await flush()
  assert.equal(r.asks('metar').length, 2, 'asked again at the first update after: it is due')
  assert.equal(r.asks('sigmet').length, 2)
})

test('Weather3D: an answer that lands while it is hidden is kept, not drawn or written; shown again, it is drawn at once', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89)]
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
  r.hold.add('metar')
  r.hold.add('sigmet')
  r.w.show = true
  r.w.update(AC, 0)
  r.w.show = false
  const [lines, calls] = [r.lines.length, r.labelCalls.length]
  r.release()
  await flush()
  assert.deepEqual([r.w.metars.length, r.w.sigmets.length], [1, 1], 'kept')
  assert.deepEqual([r.lines.length, r.labelCalls.length, r.handed()], [lines, calls, 0], 'not drawn or written')
  r.w.show = true
  assert.equal(r.areas().length, 1)
  assert.equal(r.shown().length, 1)
  assert.equal(r.lines.at(-1), `Clouds from 1 airport · 1 hazard area${CREDIT}`)
})

test('Weather3D: the panel\'s line: the counts as they come, a note while a source is down, none written while hidden', async () => {
  const r = rig()
  r.w.show = true
  assert.deepEqual(r.lines, ['Clouds from 0 airports · 0 hazard areas'], 'at once: it takes the line from the top-down map\'s')
  r.answers.metar = [metar('LLBG', 32.01, 34.89), metar('LLHA', 32.81, 35.04), metar('LLMG', 32.5, 35.2)]
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] }), sigmet({ rings: [northOf(100)] })]
  r.w.update(AC, 0)
  await flush()
  assert.equal(r.lines.at(-1), `Clouds from 3 airports · 2 hazard areas${CREDIT}`)
  const n = r.lines.length
  r.w.update(AC, 1000)
  await flush()
  assert.equal(r.lines.length, n, 'a line is written when it changes')
  r.w.show = false
  r.answers.metar = []
  r.w.update(AC, 5 * MIN)
  await flush()
  assert.equal(r.lines.length, n, 'hidden, the app owns the line')
  r.w.show = true
  assert.equal(r.lines.at(-1), `Clouds from 3 airports · 2 hazard areas${CREDIT}`, 'again when shown, from what it holds')
})

test('Weather3D: a failed ask is one warning (one for a whole outage: its retries are quiet), a note on the line, the rest still drawn, and asked again in 30 s', async () => {
  const warned: unknown[][] = []
  const warn = console.warn
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    const r = rig()
    r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
    r.failing.add('metar')
    await open(r)
    assert.equal(r.asks('metar').length, 1)
    assert.equal(warned.length, 1)
    assert.match(String(warned[0][0]), /FlightHopper: 3-D weather .*wx\/metar/)
    assert.equal(r.lines.at(-1), `Clouds from the forecast · 1 hazard area${CREDIT} · some weather unavailable`)
    assert.equal(r.areas().length, 1, 'the hazard areas came')
    r.w.update(AC, 29_000)
    await flush()
    assert.equal(r.asks('metar').length, 1)
    r.w.update(AC, 30_000)
    await flush()
    assert.equal(r.asks('metar').length, 2, 'asked again after 30 s, not 5 min')
    assert.equal(warned.length, 1, 'the same outage: no second warning')
    r.failing.clear()
    r.answers.metar = [metar('LLBG', 32.01, 34.89)]
    r.w.update(AC, 61_000)
    await flush()
    assert.equal(r.asks('metar').length, 3)
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 1 hazard area${CREDIT}`, 'the note goes when it is answered')
    r.w.update(AC, 61_000 + 4 * MIN)
    await flush()
    assert.equal(r.asks('metar').length, 3, 'and then the usual 5 min')
    r.failing.add('sigmet')
    r.failing.add('radar')
    r.w.update(AC, 10 * MIN + 1000)
    await flush()
    assert.match(String(r.lines.at(-1)), /some weather unavailable$/)
    assert.equal(r.areas().length, 1, 'the hazard areas it had stay')
    assert.equal(r.asks('sigmet').length, 2)
    r.w.update(AC, 10 * MIN + 31_000)
    await flush()
    assert.equal(r.asks('sigmet').length, 3, 'the SIGMETs and the radar are asked again after 30 s too')
    assert.equal(r.asks('weather-maps').length, 3)
    assert.equal(warned.length, 3, 'they went down for the first time: a warning each, none for their retry')
  } finally {
    console.warn = warn
  }
})

test('Weather3D: an answer that is not what it should be is a failed ask, not a crash', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const r = rig()
    r.answers.metar = { error: 'x' }
    r.answers.sigmet = 'nope'
    r.answers.radar = { host: HOST }
    await open(r)
    assert.deepEqual([r.w.metars, r.w.sigmets, r.w.radar], [[], [], null])
    assert.match(String(r.lines.at(-1)), /some weather unavailable$/)
    const s = rig()
    s.answers.metar = [{ id: 'NOPOS' }, metar('LLBG', 32.01, 34.89)] // no position: not a station
    s.answers.sigmet = [{ hazard: 'TS' }, sigmet({ rings: [northOf(100)] })] // no rings
    await open(s)
    assert.deepEqual(s.w.metars.map((m) => m.id), ['LLBG'])
    assert.equal(s.w.sigmets.length, 1)
  } finally {
    console.warn = warn
  }
})

test('Weather3D: an answer for a box the aircraft has left is dropped', async () => {
  const r = rig()
  r.hold.add('metar')
  r.answers.metar = [metar('OLD', 32, 35)]
  r.w.show = true
  r.w.update(AC, 0) // box 30,32,35,37: its answer is held
  r.hold.clear()
  r.answers.metar = [metar('NEW', 36, 35)]
  r.w.update({ ...AC, lat: 36 }, 1000) // out of it by the north: another box, answered at once
  await flush()
  assert.deepEqual(r.w.metars.map((m) => m.id), ['NEW'])
  r.release() // the held answer, for the box it left, lands late
  await flush()
  assert.deepEqual(r.w.metars.map((m) => m.id), ['NEW'])
})

test('Weather3D: ?wxat takes its weather from round that place and shifts it onto the aircraft, which then flies through that sky', async () => {
  const zurich = { lat: 47.4, lon: 8.5 }
  const r = rig({ at: zurich })
  r.answers.metar = [metar('LSZH', 47.46, 8.55)]
  r.answers.sigmet = [sigmet({ rings: [box(47, 8, 48, 9)] }), sigmet({ rings: [box(40, 8, 41, 9)] })] // over Zurich; 700 km south of it
  await open(r) // the aircraft is over Haifa
  assert.deepEqual(r.asks('metar'), ['/api/wx/metar?bbox=45,6,50,11'], 'the box is round Zurich: the aircraft is at that place')
  const d = { dLat: AC.lat - zurich.lat, dLon: AC.lon - zurich.lon }
  assert.deepEqual(r.w.shift, d)
  assert.ok(near(r.w.metars[0].lat, 47.46 + d.dLat, 1e-9) && near(r.w.metars[0].lon, 8.55 + d.dLon, 1e-9), 'LSZH where it is drawn: by the aircraft')
  assert.equal(r.w.metars[0].id, 'LSZH')
  assert.equal(r.w.sigmets.length, 2)
  assert.ok(r.w.sigmets[0].rings[0].every(([lon, lat]) => near(lat, 32.1, 1) && near(lon, 34.9, 1)), 'the ring over Zurich is over the aircraft')
  assert.equal(r.w.hazards.length, 2, 'both within 800 km of the aircraft, as they are of Zurich')
  assert.ok(r.areas()[0].rings[0].every(([lon, lat]) => near(lat, 32.1, 1) && near(lon, 34.9, 1)), 'drawn over the aircraft')
  const [llon, llat] = lonlat(r.shown()[0].position)
  assert.ok(near(llat, 32.2, 0.05) && near(llon, 34.9, 0.05), `${llon}, ${llat}: the label is in the shifted sky too`)
  assert.equal(r.w.radar!.url, `${HOST}/v2/radar/new/256/{z}/{x}/{y}/2/0_1.png`, 'the radar is RainViewer\'s, unshifted: it is sampled at the place less the shift')
  // the shift stays: an aircraft a degree north is a degree north in Zurich's sky
  r.w.update({ ...AC, lat: AC.lat + 1 }, 5 * MIN)
  await flush()
  assert.deepEqual(r.w.shift, d)
  assert.equal(r.asks('metar').at(-1), '/api/wx/metar?bbox=46,6,51,11') // 48.4 ± 2
})

test('Weather3D: without ?wxat nothing is shifted', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89)]
  r.answers.sigmet = [sigmet({ rings: [northOf(100)] })]
  await open(r)
  assert.deepEqual(r.w.shift, { dLat: 0, dLon: 0 })
  assert.deepEqual([r.w.metars[0].lat, r.w.metars[0].lon], [32.01, 34.89])
  assert.deepEqual(r.w.sigmets[0].rings[0], northOf(100))
})

test('Weather3D: destroy hides it, takes its labels and its data source away, ends its asking, and ignores late answers; twice is harmless', async () => {
  const r = rig()
  r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
  await open(r)
  const asked = r.asked.length
  r.w.destroy()
  r.w.destroy()
  assert.equal(r.w.show, false)
  assert.deepEqual(r.shown(), [])
  assert.deepEqual(r.removed.map(([ds, destroy]) => [ds === r.sources[0], destroy]), [[true, true]])
  r.w.show = true
  assert.equal(r.w.show, false, 'it stays down')
  r.w.update(AC, 30 * MIN)
  await flush()
  assert.equal(r.asked.length, asked)
  const late = rig()
  late.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
  late.answers.metar = [metar('LLBG', 32.01, 34.89)]
  late.hold.add('metar')
  late.hold.add('sigmet')
  late.w.show = true
  late.w.update(AC, 0)
  late.w.destroy() // the answers are still on their way
  late.release()
  await flush()
  assert.deepEqual([late.areas(), late.footprints()], [[], []])
  assert.deepEqual(late.w.metars, [])
  assert.deepEqual(late.w.sigmets, [])
  assert.deepEqual(late.shown(), [])
})

// ---- the sky: clouds, fog, rain and snow --------------------------------------------------------------------------------

const KM_PER_NM = 1.852
const kmFrom = (c: { lat: number; lon: number }, a: { lat: number; lon: number }): number => distanceNm(c.lat, c.lon, a.lat, a.lon) * KM_PER_NM
const layer = (cover: string, baseFt: number, type: 'CB' | 'TCU' | null = null): Cloud => ({ cover, baseFt, type })
const north = (km: number): typeof AC => ({ ...AC, lat: AC.lat + km / KM_PER_DEG })
const TRUE = { fSampled: 1, fNow: 1, relHM: 0 }

test('Weather3D: clouds from the reports round the aircraft, built when they come and drawn the frame after; the line counts the airports they come from', async () => {
  const r = rig()
  r.answers.metar = [
    metar('LLBG', 32.01, 34.89, { clouds: [layer('SCT', 3000)] }),
    metar('LLHA', 32.81, 35.04, { clouds: [layer('BKN', 2500, 'CB')] }),
    metar('LLER', 29.94, 35.0), // CAVOK, 240 km south: out of reach
    metar('SILENT', 32.3, 34.9, { raw: 'METAR SILENT 031200Z AUTO 27010KT 9999 25/12 Q1015' }), // says nothing of the sky
  ]
  await open(r)
  assert.equal(r.sky.clouds.draws.length, 0, 'built at the look, not drawn in it')
  assert.equal(r.sky.clouds.show, true)
  r.w.update(AC, 16)
  assert.equal(r.sky.clouds.draws.length, 1)
  const drawn = r.sky.clouds.draws[0]
  assert.deepEqual(drawn, nearestClouds([observedClouds(r.w.metars, AC.lat, AC.lon).specs], AC.lat, AC.lon))
  assert.ok(drawn.length > 0 && drawn.every((c) => kmFrom(c, AC) <= 150))
  assert.equal(r.lines.at(-1), `Clouds from 2 airports · 0 hazard areas${CREDIT}`, 'LLBG and LLHA; LLER is too far, SILENT says nothing of the sky')
  r.w.update(AC, 32)
  assert.equal(r.sky.clouds.draws.length, 1, 'drawn once')
})

test('Weather3D: the clouds are built again for a new list of reports, or when the aircraft has less than 5 km left in the square its field serves it in (with no track: 15 km from where the field was built); not before', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  const draws = (): number => r.sky.clouds.draws.length
  assert.equal(draws(), 1)
  r.w.update(north(14.5), 1000) // a look
  r.w.update(north(14.5), 1016)
  assert.equal(draws(), 1, '14.5 km: not yet')
  r.w.update(north(15.5), 2000)
  r.w.update(north(15.5), 2016)
  assert.equal(draws(), 2, '4.5 km from the square\'s side')
  r.w.update(north(15.5), 5 * MIN) // the METARs again: a new list, the same words
  await flush()
  r.w.update(north(15.5), 5 * MIN + 16)
  assert.equal(draws(), 3)
  assert.deepEqual(r.sky.clouds.draws[2], r.sky.clouds.draws[1], 'the same reports draw the same sky')
})

test('Weather3D: every frame the clouds and the fog follow the relief drawn and the Sun\'s night, with or without an aircraft; hidden, nothing', async () => {
  const r = rig()
  await open(r)
  const flat = { fSampled: 0, fNow: 0, relHM: 120 }
  r.w.setNight(0.6)
  r.w.update(AC, 10, flat)
  assert.deepEqual(r.sky.clouds.frames.at(-1), [flat, 0.6])
  assert.deepEqual(r.sky.fog.frames.at(-1), [flat, 0.6])
  r.w.update(null, 20, TRUE)
  assert.deepEqual(r.sky.clouds.frames.at(-1), [TRUE, 0.6])
  r.w.setNight(Number.NaN)
  r.w.update(AC, 30)
  assert.deepEqual(r.sky.clouds.frames.at(-1), [TRUE, 0], 'no relief given: the true one; no night known: day')
  r.w.show = false
  const n = r.sky.clouds.frames.length
  r.w.update(AC, 40, flat)
  assert.equal(r.sky.clouds.frames.length, n)
  assert.equal(r.sky.clouds.show, false)
})

test('Weather3D: fog round a foggy station near the aircraft, none away from it; hidden, none', async () => {
  const r = rig()
  r.answers.metar = [metar('FOGGY', 32.12, 34.95, { wx: 'FG', visKm: 0.2, visPlus: false })]
  await open(r)
  const f = r.sky.fog.sets.at(-1)
  assert.ok(f !== null && f !== undefined)
  assert.deepEqual(f, fogNear(r.w.metars, AC.lat, AC.lon))
  r.w.update(north(60), 1000)
  assert.equal(r.sky.fog.sets.at(-1), null, '60 km off')
  r.w.update(AC, 2000)
  assert.ok(r.sky.fog.sets.at(-1) !== null)
  r.w.show = false
  assert.equal(r.sky.fog.sets.at(-1), null)
})

test('Weather3D: rain from the nearest station\'s weather, only below its cloud base + 300 m; drifting with its wind', async () => {
  const r = rig()
  const wet = metar('WET', 32.12, 34.95, { wx: '+RA', wdir: 270, wspd: 12, clouds: [layer('BKN', 3000)] })
  r.answers.metar = [wet]
  await open(r) // the camera at the aircraft's 10 km
  assert.equal(r.sky.precip.sets.at(-1), null, 'above the cloud')
  const top = 30 + 3000 * FT + geoidN(wet.lat, wet.lon) + 300
  r.setCamera(AC.lat, AC.lon, top - 1)
  r.w.setNight(0.25)
  r.w.update(AC, 1000)
  assert.deepEqual(r.sky.precip.sets.at(-1), { kind: 'rain', intensity: 1, wind: windOf(wet), night: 0.25 })
  r.setCamera(AC.lat, AC.lon, top + 1)
  r.w.update(AC, 2000)
  assert.equal(r.sky.precip.sets.at(-1), null)
  r.setCamera(AC.lat, AC.lon, top - 1)
  r.w.update(AC, 3000, { fSampled: 0, fNow: 0, relHM: 0 }) // flattened: the station's ground drawn at 0
  r.w.update(AC, 4000, { fSampled: 0, fNow: 0, relHM: 0 })
  assert.equal(r.sky.precip.sets.at(-1), null, 'the base came down with its ground')
  r.setCamera(AC.lat + 0.4, AC.lon, 500) // 33 km from the station
  r.w.update(AC, 5000, TRUE)
  assert.equal(r.sky.precip.sets.at(-1), null, 'no station within 30 km of the camera')
})

test('Weather3D: rain or snow from the radar under the camera, its place less the ?wxat shift; 3 km over the ground where no base is known', async () => {
  const zurich = { lat: 47.4, lon: 8.5 }
  const r = rig({ at: zurich })
  r.setGround(400)
  r.setCamera(AC.lat, AC.lon, 3300)
  const { x, y, px, py } = radarPixel(zurich.lat, zurich.lon) // the camera, at the aircraft, is at Zurich in the radar's own sky
  const t: SourceTile = { dbz: new Int8Array(256 * 256).fill(-128), snow: new Uint8Array(256 * 256) }
  t.dbz[py * 256 + px] = 30
  r.tiles.set(`7/${x}/${y}`, t)
  await open(r) // the tile is asked for at the first look with a radar frame, and lands after it
  assert.equal(r.tileAsks.filter((k) => k === `7/${x}/${y}`).length, 1, 'the camera\'s tile, once (the clouds ask for those the radius reaches too: radar clouds)')
  r.w.update(AC, 1000)
  assert.deepEqual(r.sky.precip.sets.at(-1), { kind: 'rain', intensity: 0.5, wind: { east: 0, north: 0 }, night: 0 }, 'no station: no wind')
  t.snow[py * 256 + px] = 1
  r.w.update(AC, 2000)
  assert.equal(r.sky.precip.sets.at(-1)?.kind, 'snow')
  assert.equal(r.tileAsks.filter((k) => k === `7/${x}/${y}`).length, 1, 'the tile asked once')
  r.setCamera(AC.lat, AC.lon, 3500) // 3 km over the 400 m ground is 3,400 m
  r.w.update(AC, 4000)
  assert.equal(r.sky.precip.sets.at(-1), null)
  r.setCamera(AC.lat, AC.lon, 3300)
  r.w.update(AC, 5000)
  assert.ok(r.sky.precip.sets.at(-1) !== null)
  r.w.show = false
  assert.equal(r.sky.precip.sets.at(-1), null, 'hidden: nothing falls')
})

test('Weather3D: a sky\'s clouds are gathered by the gatherer it is given (in a page a worker: the frames do not wait for it): asked at the look with the reports, the grid and the radar\'s tiles held, the answer drawn the frame after it comes, an answer a later ask has overtaken not at all; destroy ends it', async () => {
  const asks: { job: GatherJob; done: (got: Gathered) => void }[] = []
  let ended = 0
  const r = rig({ gather: { ask: (job, done) => void asks.push({ job, done }), destroy: () => void ended++ } })
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('SCT', 3000)] }), metar('LLHA', 32.81, 35.04, { clouds: [layer('BKN', 2500)] })]
  await open(r)
  assert.ok(asks.length >= 1)
  const first = asks.at(-1)!
  const centre = fieldCentre(AC.lat, AC.lon, undefined)
  assert.deepEqual([first.job.lat, first.job.lon, first.job.metars, first.job.readKm, first.job.reachKm, first.job.anew], [centre.lat, centre.lon, r.w.metars, READ_KM, REACH_KM[1], false])
  assert.match(r.lines.at(-1)!, /2 airports/, 'the line counts the stations at the look: it does not wait for the clouds')
  for (const t of [16, 32, 48]) r.w.update(AC, t)
  assert.equal(r.sky.clouds.draws.length, 0, 'no answer yet: nothing drawn, and the frames go on')
  const answer = (a: typeof first): Gathered => gatherer()(a.job)
  first.done(answer(first))
  assert.equal(r.sky.clouds.draws.length, 0, 'the answer has come: drawn at the next frame')
  r.w.update(AC, 64)
  assert.deepEqual(r.sky.clouds.draws, [nearestClouds([observedClouds(r.w.metars, AC.lat, AC.lon).specs], AC.lat, AC.lon)])
  r.w.rebuildSky()
  r.w.rebuildSky(false)
  const [older, newer] = asks.slice(-2)
  assert.deepEqual([older.job.anew, newer.job.anew, newer.job.id > older.job.id, newer.job.metarGen === older.job.metarGen], [true, false, true, true])
  newer.done(answer(newer))
  older.done(answer(older)) // overtaken, and late
  r.w.update(AC, 80)
  r.w.update(AC, 96)
  assert.equal(r.sky.clouds.draws.length, 2, 'the later ask\'s answer, once')
  r.w.destroy()
  assert.equal(ended, 1)
})

test('Weather3D: rebuildSky builds the clouds again at once (a check aid for the look constants), drawn the frame after', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  assert.equal(r.sky.clouds.draws.length, 1)
  r.w.rebuildSky()
  r.w.update(AC, 32)
  assert.equal(r.sky.clouds.draws.length, 2)
  assert.deepEqual(r.sky.clouds.draws[1], r.sky.clouds.draws[0])
  assert.equal(r.w.sky, r.sky, 'the sky\'s parts, for the console')
})

test('Weather3D: destroy destroys the sky\'s parts', async () => {
  const r = rig()
  await open(r)
  r.w.destroy()
  assert.deepEqual([r.sky.clouds.destroyed, r.sky.fog.destroyed, r.sky.precip.destroyed], [true, true, true])
})

test('Weather3D: destroyed after the viewer, it touches nothing of Cesium\'s (no fog set, nothing hidden or destroyed there), but takes its overlay away', async () => {
  const r = rig()
  await open(r)
  const [fogSets, removed] = [r.sky.fog.sets.length, r.removed.length]
  r.destroyViewer()
  r.w.destroy()
  assert.equal(r.sky.fog.sets.length, fogSets)
  assert.equal(r.removed.length, removed)
  assert.deepEqual([r.sky.clouds.destroyed, r.sky.fog.destroyed, r.sky.clouds.show, r.sky.precip.destroyed], [false, false, true, true])
  assert.equal(r.w.show, false)
})

test('Weather3D: the clouds are faded at each look from where the aircraft is', async () => {
  const r = rig()
  await open(r)
  const want = Cartesian3.fromDegrees(AC.lon, AC.lat, AC.altM)
  assert.ok(Cartesian3.equalsEpsilon(r.sky.clouds.fades.at(-1)!, want, 0, 1e-6))
  const n = r.sky.clouds.fades.length
  r.w.update(north(5), 500)
  assert.equal(r.sky.clouds.fades.length, n, 'between looks: no fade')
  r.w.update(north(5), 1000)
  assert.ok(Cartesian3.equalsEpsilon(r.sky.clouds.fades.at(-1)!, Cartesian3.fromDegrees(AC.lon, north(5).lat, AC.altM), 0, 1e-6))
})

test('Weather3D: while something falls the overlay is aimed for the camera\'s heading, at most four times a second; never while nothing falls', async () => {
  const r = rig()
  const wet = metar('WET', 32.12, 34.95, { wx: '+RA', wdir: 270, wspd: 12, clouds: [layer('BKN', 3000)] })
  r.answers.metar = [wet]
  await open(r) // the camera above the cloud: nothing falls
  for (let t = 10; t < 990; t += 16) r.w.update(AC, t)
  assert.deepEqual(r.sky.precip.aims, [])
  r.setCamera(AC.lat, AC.lon, 500)
  r.setHeading(1.2)
  r.w.update(AC, 1000) // a look: it rains
  for (let t = 1016; t < 2000; t += 16) r.w.update(AC, t)
  assert.ok(r.sky.precip.aims.length >= 4 && r.sky.precip.aims.length <= 5, `${r.sky.precip.aims.length} aims in a second`)
  assert.ok(r.sky.precip.aims.every((h) => h === 1.2))
  r.setCamera(AC.lat, AC.lon, 10_000)
  r.w.update(AC, 2000) // a look: above the cloud again
  const n = r.sky.precip.aims.length
  for (let t = 2016; t < 2900; t += 16) r.w.update(AC, t)
  assert.equal(r.sky.precip.aims.length, n)
})

test('Weather3D: rebuildSky works the clouds out again from the reports, so a changed look shows (a check aid)', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  const saved = LOOKS.FEW.w
  try {
    ;(LOOKS.FEW as { w: readonly [number, number] }).w = [5000, 5000]
    r.w.update(north(1), 1000) // a look, no rebuild due
    r.w.update(north(1), 1016)
    assert.equal(r.sky.clouds.draws.length, 1)
    r.w.rebuildSky()
    r.w.update(north(1), 1032)
    assert.equal(r.sky.clouds.draws.length, 2)
    assert.ok(r.sky.clouds.draws[1].length > 0 && r.sky.clouds.draws[1].every((c) => c.scale[0] === 5000), 'the new look')
  } finally {
    ;(LOOKS.FEW as { w: readonly [number, number] }).w = saved
  }
})

test('Weather3D: the relief is read from each frame, not kept (Topography reuses its object)', async () => {
  const r = rig()
  const wet = metar('WET', 32.12, 34.95, { wx: '+RA', clouds: [layer('BKN', 3000)] })
  r.answers.metar = [wet]
  const top = 30 + 3000 * FT + geoidN(wet.lat, wet.lon) + 300
  r.setCamera(AC.lat, AC.lon, top - 1)
  await open(r)
  assert.ok(r.sky.precip.sets.at(-1) !== null, 'under the cloud: rain')
  const tf = { fSampled: 0, fNow: 0, relHM: 0 } // flat: the station's ground drawn at 0, its cloud base with it
  r.w.update(AC, 100, tf)
  Object.assign(tf, { fSampled: 1, fNow: 1, relHM: 0 }) // the object reused for a later frame
  r.w.rebuildSky()
  assert.equal(r.sky.precip.sets.at(-1), null, 'the flat relief this frame gave')
})

test('Weather3D: under a nearby station’s overcast the sky greys, easing in; above the deck or hidden it is the sky’s own again', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', AC.lat, AC.lon, { elevM: 30, clouds: [{ cover: 'OVC', baseFt: 2000, type: null }] })]
  r.setCamera(AC.lat, AC.lon, 200) // under the deck (base 30 + 610 m)
  await open(r)
  for (let t = 1000; t <= 12_000; t += 100) r.w.update(AC, t) // a look a second, eased every frame
  assert.ok(r.skyShift().saturationShift < -0.6, `${r.skyShift().saturationShift}`) // about 0.75 × 0.85
  assert.ok(r.skyShift().brightnessShift < -0.24, `${r.skyShift().brightnessShift}`)
  r.setCamera(AC.lat, AC.lon, 3000) // above it
  for (let t = 12_100; t <= 30_000; t += 100) r.w.update(AC, t)
  assert.equal(r.skyShift().saturationShift, -0)
  r.setCamera(AC.lat, AC.lon, 200)
  for (let t = 30_100; t <= 45_000; t += 100) r.w.update(AC, t)
  assert.ok(r.skyShift().saturationShift < -0.6)
  r.w.show = false // hidden: the sky's own colours at once
  assert.equal(r.skyShift().saturationShift, -0)
  assert.equal(r.skyShift().brightnessShift, -0)
})

test('Weather3D: the sky\'s grey is handed on as it is written (the Sun dims by it too): eased in, in steps up to the target, and 0 as soon as it is hidden', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', AC.lat, AC.lon, { elevM: 30, clouds: [{ cover: 'OVC', baseFt: 2000, type: null }] })]
  r.setCamera(AC.lat, AC.lon, 200) // under the deck
  await open(r)
  assert.deepEqual(r.shades, [], 'a clear sky: nothing written, nothing handed on')
  for (let t = 1000; t <= 12_000; t += 100) r.w.update(AC, t)
  const eased = [...r.shades]
  assert.ok(eased.length > 5 && eased.every((v, i) => v > (eased[i - 1] ?? 0) && v <= 1), `rising: ${eased}`)
  const grey = eased.at(-1)!
  assert.ok(grey > 0.8, `${grey}: at the target`)
  assert.equal(r.skyShift().saturationShift, -0.75 * grey, 'the value the sky was written with')
  assert.equal(r.skyShift().brightnessShift, -0.3 * grey)
  r.setCamera(AC.lat, AC.lon, 3000) // above the deck: back to the sky's own
  for (let t = 12_100; t <= 30_000; t += 100) r.w.update(AC, t)
  assert.equal(r.shades.at(-1), 0)
  assert.ok(r.shades.length > eased.length && r.shades.every((v) => v >= 0 && v <= 1))
  r.setCamera(AC.lat, AC.lon, 200)
  for (let t = 30_100; t <= 45_000; t += 100) r.w.update(AC, t)
  assert.ok(r.shades.at(-1)! > 0.8)
  r.w.show = false // hidden, grey as it is: the Sun is told at once
  assert.equal(r.shades.at(-1), 0)
  assert.equal(r.skyShift().saturationShift, -0)
})


// ---- the radar's clouds (their rain is the volume pass's: cloudVolume.ts) ----------------------------------------------------------

/** Radar tiles (zoom 7, keyed 'z/x/y') with one pixel of echo for each place given: km east and north of `at`, dBZ, snow. */
function echoTiles(at: { lat: number; lon: number }, echoes: [number, number, number, boolean?][]): Map<string, SourceTile> {
  const out = new Map<string, SourceTile>()
  for (const [east, north, dbz, snow] of echoes) {
    const { x, y, px, py } = radarPixel(at.lat + north / KM_PER_DEG, at.lon + east / (KM_PER_DEG * Math.cos((at.lat * Math.PI) / 180)))
    let t = out.get(`7/${x}/${y}`)
    if (t === undefined) out.set(`7/${x}/${y}`, (t = { dbz: new Int8Array(65536).fill(-128), snow: new Uint8Array(65536) }))
    t.dbz[py * 256 + px] = dbz
    t.snow[py * 256 + px] = snow ? 1 : 0
  }
  return out
}
const giveTiles = (r: Rig, tiles: Map<string, SourceTile>): void => tiles.forEach((t, k) => r.tiles.set(k, t))
const tileGetter = (r: Rig) => (x: number, y: number): SourceTile | null => r.tiles.get(`7/${x}/${y}`) ?? null
const towerPuffs = (cs: readonly CloudSpec[]): CloudSpec[] => cs.filter((c) => c.tower !== undefined)
/** The radar is read this far from the aircraft: as far as the cloud pass shows a cloud, and the way to the next build past that. */
const READ_KM = REACH_KM[1] + REBUILD_KM
/** What a look builds, as the frames after it draw it: the look builds the observed clouds, the next frame the radar's part, the one after draws them. */
const drawn = (r: Rig, at: typeof AC, t: number): void => [0, 16, 32, 48].forEach((d) => r.w.update(at, t + d)) // a fourth frame in case a draw of the last build came first
/** A tower's height from its base to its top, by its puffs. */
const towerHeight = (cs: readonly CloudSpec[]): number => Math.max(...cs.map((c) => c.heightM + (PUFF_FILL * c.scale[1]) / 2)) - Math.min(...cs.map((c) => c.heightM - (PUFF_FILL * c.scale[1]) / 2))

test('Weather3D: rain clouds from the radar within 100 km of the aircraft: its tiles asked for once each, built when they have come, drawn the frame after, on the nearest station\'s ceiling', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50], [-15, 10, 42], [0, 30, 22], [40, 0, 60, true]])) // heavy rain 20 km east, rain 15 west, light rain 30 north, snow 40 east
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { elevM: 30, clouds: [layer('BKN', 2000)] })]
  await open(r) // the tiles are asked for and have come
  for (const k of r.tiles.keys()) assert.equal(r.tileAsks.filter((a) => a === k).length, 1, `${k} asked once`)
  assert.ok(r.tileAsks.every((k) => k.startsWith('7/')), 'zoom 7: RainViewer\'s deepest')
  r.w.update(AC, 16)
  assert.equal(towerPuffs(r.sky.clouds.draws.at(-1)!).length, 0, 'the first build was before the tiles had come')
  r.w.update(AC, 1000) // a look: new radar data; the observed clouds are built, the radar's part at the next frame
  assert.equal(r.sky.clouds.draws.length, 1, 'built, not yet drawn')
  r.w.update(AC, 1016)
  assert.equal(r.sky.clouds.draws.length, 1, 'the radar\'s part built, not yet drawn')
  r.w.update(AC, 1032)
  assert.equal(r.sky.clouds.draws.length, 2)
  const sky = r.sky.clouds.draws.at(-1)!
  const cells = radarCells(tileGetter(r), AC.lat, AC.lon, undefined, READ_KM)
  const base = radarBases(r.w.metars)
  const expected = radarClouds(cells, base)
  assert.ok(expected.length >= 10)
  for (const e of expected) assert.ok(sky.some((c) => isDeepStrictEqual(c, e)), 'the radar\'s clouds, as radarClouds makes them from the cells and the reports')
  const towers = [...new Set(towerPuffs(sky).map((c) => c.tower))]
  assert.equal(towers.length, 2, 'the 50 and the 42 dBZ blocks are towers; the 22 dBZ rain and the snow are decks')
  const ceiling = 30 + 2000 * FT
  assert.ok(near(Math.min(...towerPuffs(sky).map((c) => c.heightM - (PUFF_FILL * c.scale[1]) / 2)), ceiling, 1e-6), 'on LLBG\'s ceiling')
  assert.equal(expected.filter((c) => c.tower === undefined).length, 2, 'the 22 dBZ rain and the snow: two decks')
  assert.ok(expected.filter((c) => c.tower === undefined).every((c) => near(c.heightM - (PUFF_FILL * c.scale[1]) / 2, ceiling, 1e-6) && c.groundM === 30), 'at the ceiling')
  assert.deepEqual(r.sky.clouds.ats.at(-1), { lat: AC.lat, lon: AC.lon }, 'drawn round the aircraft')
})

test('Weather3D: without the radar\'s tiles yet it builds without its clouds, and builds again when they come (not at every look)', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  r.tileHold.on = true
  await open(r)
  for (const t of [16, 1000, 1016, 2000, 2016]) r.w.update(AC, t)
  assert.ok(r.sky.clouds.draws.length >= 1 && r.sky.clouds.draws.every((d) => towerPuffs(d).length === 0))
  const waiting = r.sky.clouds.draws.length
  assert.equal(new Set(r.tileAsks).size, r.tileAsks.length, 'asked once while it waits')
  assert.equal(waiting, r.sky.clouds.draws.length, 'nothing to build while it waits')
  r.tileHold.on = false
  r.releaseTiles()
  await flush()
  drawn(r, AC, 3000)
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0, 'built when the tile came')
  const clouds = r.sky.clouds.draws.length
  for (const t of [4000, 4016, 5000, 5016, 6000, 6016]) r.w.update(AC, t)
  assert.equal(r.sky.clouds.draws.length, clouds, 'nothing new, nothing built')
})

test('Weather3D: a newer radar frame keeps drawing the old frame\'s clouds until its own tiles come, then swaps (no gap)', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  await open(r)
  drawn(r, AC, 1000)
  assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 8500, 1e-6), '50 dBZ: 8.5 km')
  r.answers.radar = { host: HOST, radar: { past: [{ time: 1759421400, path: '/v2/radar/newer' }] } }
  giveTiles(r, echoTiles(AC, [[20, 0, 60]])) // what the newer frame says
  r.tileHold.on = true
  r.w.update(AC, 10 * MIN) // the radar frame and the METARs are due again
  await flush()
  assert.equal(r.w.radar!.url, `${HOST}/v2/radar/newer/256/{z}/{x}/{y}/2/0_1.png`)
  drawn(r, AC, 10 * MIN + 1000)
  assert.ok(r.tileAsks.length >= 2, 'the newer frame\'s tile asked for')
  assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 8500, 1e-6), 'still the old frame\'s, not a gap')
  r.tileHold.on = false
  r.releaseTiles()
  await flush()
  drawn(r, AC, 10 * MIN + 2000)
  assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 10_000, 1e-6), 'then the newer: 60 dBZ, 10 km')
})

test('Weather3D: ?wxat reads the radar where the aircraft is in the weather\'s own place and draws the clouds where the sky is drawn (shifted)', async () => {
  const zurich = { lat: 47.4, lon: 8.5 }
  const r = rig({ at: zurich })
  giveTiles(r, echoTiles(zurich, [[20, 0, 50], [0, -25, 40]]))
  await open(r)
  drawn(r, AC, 1000)
  const shift = r.w.shift
  assert.ok(near(shift.dLat, AC.lat - zurich.lat, 1e-12))
  const cells = radarCells(tileGetter(r), AC.lat - shift.dLat, AC.lon - shift.dLon, shift, READ_KM)
  assert.equal(cells.length, 2)
  const sky = r.sky.clouds.draws.at(-1)!
  assert.deepEqual(sky, nearestClouds([radarClouds(cells, radarBases(r.w.metars))], AC.lat, AC.lon))
  assert.ok(towerPuffs(sky).length > 0 && towerPuffs(sky).every((c) => kmFrom(c, AC) < 100), 'round the aircraft: Zurich\'s sky moved onto it')
  assert.ok(r.tileAsks.every((k) => { const [, x] = k.split('/').map(Number); return x >= 60 && x <= 70 }), 'the tiles round Zurich, not round Haifa (x 76)')
})

test('Weather3D: the radar\'s clouds keep a place in the 700 (RADAR_LOOK.reserve): the observed clouds give way, the farthest first; with none kept they come first', async () => {
  const stations = Array.from({ length: 12 }, (_, i) => metar(`S${i}`, 32.1 + ((i % 4) - 1.5) * 0.25, 34.9 + (Math.floor(i / 4) - 1) * 0.3, { elevM: 30, clouds: [layer('OVC', 1500)] }))
  const run = async (): Promise<{ drawn: CloudSpec[]; expected: CloudSpec[] }> => {
    const r = rig()
    giveTiles(r, echoTiles(AC, [[20, 0, 50], [-15, 10, 42], [5, -20, 38]]))
    r.answers.metar = stations
    await open(r)
    drawn(r, AC, 1000)
    const expected = radarClouds(radarCells(tileGetter(r), AC.lat, AC.lon, undefined, READ_KM), radarBases(r.w.metars))
    return { drawn: r.sky.clouds.draws.at(-1)!, expected }
  }
  const kept = await run()
  assert.equal(kept.drawn.length, MAX_CLOUDS)
  assert.ok(kept.expected.length > 10 && kept.expected.every((e) => kept.drawn.some((c) => isDeepStrictEqual(c, e))), 'every cloud of the radar is drawn')
  const was = RADAR_LOOK.reserve
  try {
    RADAR_LOOK.reserve = 0
    const first = await run()
    assert.equal(first.drawn.length, MAX_CLOUDS)
    assert.equal(towerPuffs(first.drawn).length, 0, 'the observed clouds fill the 700: none left for the radar\'s')
  } finally {
    RADAR_LOOK.reserve = was
  }
})

test('Weather3D: rebuildSky builds the radar\'s clouds again as RADAR_LOOK says now (a check aid)', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  await open(r)
  drawn(r, AC, 1000)
  assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 8500, 1e-6))
  const was = RADAR_LOOK.tops
  try {
    ;(RADAR_LOOK as { tops: readonly (readonly [number, number])[] }).tops = [[30, 1000], [45, 2000], [55, 3000]]
    r.w.rebuildSky()
    drawn(r, AC, 1048) // not a look: the frames after the rebuild
    assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 2500, 1e-6))
  } finally {
    ;(RADAR_LOOK as { tops: readonly (readonly [number, number])[] }).tops = was
  }
})

test('Weather3D: hidden, nothing of the radar is asked', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  await open(r)
  r.w.show = false
  const [frames, asks] = [r.sky.clouds.frames.length, r.tileAsks.length]
  r.w.update(north(40), 5 * MIN, { fSampled: 0, fNow: 0, relHM: 120 })
  await flush()
  assert.equal(r.sky.clouds.frames.length, frames)
  assert.equal(r.tileAsks.length, asks, 'hidden: nothing asked')
  r.w.show = true
  assert.equal(r.sky.clouds.show, true)
})

test('Weather3D: the radar\'s clouds are built again when the next field is due, from the tiles it has', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  await open(r)
  drawn(r, AC, 1000)
  const draws = (): number => r.sky.clouds.draws.length
  const n = draws()
  drawn(r, north(14.5), 2000)
  assert.equal(draws(), n, '14.5 km: not yet')
  drawn(r, north(15.5), 3000)
  assert.equal(draws(), n + 1)
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0, 'the cell is still within 100 km')
  assert.ok(near(r.sky.clouds.ats.at(-1)!.lat, north(15.5).lat, 1e-9), 'drawn round where the aircraft is now (it has no track)')
})

test('Weather3D: the radar frame answered after the reports: the next look builds the radar\'s clouds from its tiles (here in the tile below the camera\'s, which only the clouds read)', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[0, -20, 50]]))
  assert.ok(r.tiles.size === 1 && !r.tiles.has(`7/${radarPixel(AC.lat, AC.lon).x}/${radarPixel(AC.lat, AC.lon).y}`), 'not the camera\'s tile')
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { elevM: 30, clouds: [layer('BKN', 2000)] })]
  r.hold.add('radar')
  await open(r) // the reports are in, the radar's answer is held
  r.w.update(AC, 16)
  assert.equal(r.tileAsks.length, 0, 'no frame: no tile to ask for')
  assert.equal(towerPuffs(r.sky.clouds.draws.at(-1)!).length, 0)
  r.hold.clear()
  r.release()
  await flush()
  drawn(r, AC, 1000) // a look: the radar is known; its tiles are asked for
  await flush()
  drawn(r, AC, 2000) // a look: they have come
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0)
})

test('Weather3D: over a long flight only the latest 16 radar tiles are kept; one given up is asked for again when it is wanted (the source has it), and its clouds come back', async () => {
  const r = rig()
  const home = { lat: 0, lon: 0 }
  giveTiles(r, echoTiles(home, [[10, 0, 50]]))
  await open(r, { lat: 0, lon: 0, altM: 10_000 })
  drawn(r, { lat: 0, lon: 0, altM: 10_000 }, 1000)
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0, 'home: a tower')
  const homeKey = `7/${radarPixel(0, 0).x}/${radarPixel(0, 0).y}`
  const asksOfHome = (): number => r.tileAsks.filter((k) => k === homeKey).length
  assert.equal(asksOfHome(), 1)
  let t = 2000
  for (let lon = 3; lon <= 60; lon += 3) { // 20 steps of 3°: a tile or two each, more than 16 in all
    r.w.update({ lat: 0, lon, altM: 10_000 }, t)
    await flush()
    t += 1000
  }
  assert.ok(new Set(r.tileAsks).size > 16, `${new Set(r.tileAsks).size} tiles asked for`)
  assert.equal(asksOfHome(), 1, 'asked once so far')
  drawn(r, { lat: 0, lon: 0, altM: 10_000 }, t) // back where it began: a look, the radar's part (the tile is asked for again)
  await flush()
  assert.equal(asksOfHome(), 2, 'given up, so asked for again')
  drawn(r, { lat: 0, lon: 0, altM: 10_000 }, t + 1000)
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0, 'its tower is back')
})

test('Weather3D: a late tile of an older frame does not replace the newest frame\'s', async () => {
  const r = rig()
  r.frameTiles.set('/v2/radar/new/', echoTiles(AC, [[20, 0, 50]])) // INDEX's newest frame: 50 dBZ, 8.5 km
  r.frameTiles.set('/v2/radar/newer', echoTiles(AC, [[20, 0, 60]])) // the frame after: 60 dBZ, 10 km
  r.tileHold.on = true
  await open(r) // the first frame's tiles are asked for, and held
  r.w.update(AC, 1000)
  r.answers.radar = { host: HOST, radar: { past: [{ time: 1759421400, path: '/v2/radar/newer' }] } }
  r.w.update(AC, 10 * MIN)
  await flush()
  drawn(r, AC, 10 * MIN + 1000) // the newer frame's tiles are asked for, and held
  assert.ok(r.tileAsks.length >= 2)
  r.releaseTiles(true) // the newer frame's first, then the older's, late
  await flush()
  drawn(r, AC, 10 * MIN + 2000)
  assert.ok(near(towerHeight(towerPuffs(r.sky.clouds.draws.at(-1)!)), 10_000, 1e-6), 'the newer frame\'s tile stands')
})

test('Weather3D: the radar is read as far as the cloud pass shows a cloud round the aircraft (150 km) and 30 km past that, round the field\'s middle (the aircraft is never more than 28 km from it): a storm past the reach is in the sky that is built, where the pass shows nothing yet, so it comes in through the reach\'s fade as the aircraft closes; and what the next build adds is out of the reach too', async () => {
  const r = rig()
  const east = (km: number): typeof AC & { trackDeg: number } => ({ ...AC, trackDeg: 90, lon: AC.lon + km / (KM_PER_DEG * Math.cos((AC.lat * Math.PI) / 180)) })
  assert.deepEqual([REACH_KM, REBUILD_KM, READ_KM], [[130, 150], 30, 180])
  // flying east, the field's middle is 20 km east of the aircraft: a storm 185 km east is 165 km from it, one 215 km east is 195 km
  giveTiles(r, echoTiles(AC, [[185, 0, 50], [-92, 15, 42], [0, 20, 40], [215, 0, 50]])) // a storm past the reach, one in it, one near, one past what is read
  await open(r, east(0))
  drawn(r, east(0), 1000)
  const middle = r.sky.clouds.ats.at(-1)!
  assert.ok(near(kmFrom(middle, AC), 20, 0.05) && middle.lon > AC.lon, 'the field is built round the place 20 km ahead')
  const puffs = towerPuffs(r.sky.clouds.draws.at(-1)!)
  assert.equal(new Set(puffs.map((c) => c.tower)).size, 3, 'three storms are built: the one 195 km from the field\'s middle is not read yet')
  const outer = puffs.filter((c) => kmFrom(c, AC) > REACH_KM[1])
  assert.ok(outer.length >= 5 && outer.every((c) => c.lon > AC.lon + 1 && kmFrom(c, middle) < READ_KM), `${outer.length} puffs of the storm 185 km east: built, where the pass shows nothing yet`)
  assert.ok(puffs.some((c) => kmFrom(c, AC) > 80 && kmFrom(c, AC) < REACH_KM[0] && c.lon < AC.lon), 'the storm 93 km west is built too: whatever its puffs\' own fade (100 km), the pass shows it')
  const draws = r.sky.clouds.draws.length
  drawn(r, east(34), 2000) // flown 34 km toward the east storm: 6 km of the square left; the storm is 151 km off
  assert.equal(r.sky.clouds.draws.length, draws, 'no new build')
  drawn(r, east(36), 3000)
  assert.equal(r.sky.clouds.draws.length, draws + 1, 'a build, 4 km before the square\'s side')
  assert.ok(near(kmFrom(r.sky.clouds.ats.at(-1)!, east(36)), 20, 0.05), 'round the place 20 km ahead again')
  const next = towerPuffs(r.sky.clouds.draws.at(-1)!)
  const same = (a: CloudSpec, b: CloudSpec): boolean => a.lat === b.lat && a.lon === b.lon && a.heightM === b.heightM
  const shown = next.filter((c) => kmFrom(c, east(36)) <= REACH_KM[1])
  assert.ok(shown.some((c) => c.lon > AC.lon + 1) && shown.every((c) => puffs.some((p) => same(p, c))), 'every puff the pass shows after the build was in the sky before it: the east storm, 149 km off, does not appear with the build')
  const added = next.filter((c) => !puffs.some((p) => same(p, c)))
  assert.ok(added.length >= 5 && added.every((c) => kmFrom(c, east(36)) > REACH_KM[1]), `${added.length} puffs of the storm that was 215 km off: what the build adds is out of the pass's reach`)
})

test('Weather3D: tiles that come one by one are built from once, when the last has come; one that is slow is not waited for past 3 s', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[0, 0, 40], [0, -35, 45], [-40, 0, 42]])) // three tiles of the box have an echo
  r.tileHold.on = true
  await open(r)
  drawn(r, AC, 1000) // asks the tiles
  const asked = r.held()
  assert.ok(asked >= 4, `${asked} tiles asked for, held`)
  const draws = (): number => r.sky.clouds.draws.length
  r.releaseSome(1)
  await flush()
  const n = draws()
  drawn(r, AC, 2000)
  assert.equal(draws(), n, 'one has come, the others are on their way: no build for it alone')
  r.releaseSome(asked - 2)
  await flush()
  drawn(r, AC, 3000)
  assert.equal(draws(), n, 'one is still on its way: not yet')
  r.tileHold.on = false
  r.releaseTiles()
  await flush()
  drawn(r, AC, 4000)
  assert.equal(draws(), n + 1, 'the last has come: one build, from them all')
  assert.equal(new Set(towerPuffs(r.sky.clouds.draws.at(-1)!).map((c) => c.tower)).size, 3)
  drawn(r, AC, 5000)
  drawn(r, AC, 6000)
  assert.equal(draws(), n + 1, 'and no more')
  // a tile that never comes
  const slow = rig()
  giveTiles(slow, echoTiles(AC, [[0, 0, 40], [0, -35, 45]]))
  slow.tileHold.on = true
  await open(slow)
  drawn(slow, AC, 1000)
  const total = slow.held()
  slow.releaseSome(total - 1) // all but one
  await flush()
  const m = slow.sky.clouds.draws.length
  drawn(slow, AC, 2000)
  drawn(slow, AC, 3000)
  assert.equal(slow.sky.clouds.draws.length, m, 'waiting for the last: 1 s, 2 s')
  drawn(slow, AC, 4500)
  assert.equal(slow.sky.clouds.draws.length, m + 1, 'then built from the ones that came: it is not waited for forever')
  assert.ok(towerPuffs(slow.sky.clouds.draws.at(-1)!).length > 0)
})

test('Weather3D: the box the radar is read in is kept in memory whatever the latitude: at 78°N its 7 tiles across are held, none asked for again, no build at every look', async () => {
  const r = rig()
  const at = { lat: 78, lon: 20, altM: 10_000 }
  const echoes: [number, number, number][] = []
  for (let e = -128; e <= 128; e += 16) for (let n = -128; n <= 128; n += 16) echoes.push([e, n, 40])
  giveTiles(r, echoTiles(at, echoes))
  assert.ok(r.tiles.size > 16, `${r.tiles.size} tiles hold an echo: more than the 16 kept at the very least`)
  await open(r, at)
  for (let t = 1000; t <= 12_000; t += 1000) {
    drawn(r, at, t)
    await flush()
  }
  assert.ok(new Set(r.tileAsks).size > 16, `${new Set(r.tileAsks).size} tiles asked for`)
  assert.equal(r.tileAsks.length, new Set(r.tileAsks).size, 'each once: none given up and asked for again')
  const draws = r.sky.clouds.draws.length
  drawn(r, at, 13_000)
  drawn(r, at, 14_000)
  assert.equal(r.sky.clouds.draws.length, draws, 'settled: nothing built at each look')
})

test('Weather3D: the radar frames it has left do not stay in memory: its tiles hold the frame\'s URL, not the source (which holds every tile of its frame), so a frame whose tiles were not asked again is let go', async () => {
  v8.setFlagsFromString('--expose-gc')
  const gc = vm.runInNewContext('gc') as () => void
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50]]))
  await open(r)
  drawn(r, AC, 1000)
  const old = (() => new WeakRef(r.w.radar!))()
  assert.ok(towerPuffs(r.sky.clouds.draws.at(-1)!).length > 0, 'its tiles are held')
  r.answers.radar = { host: HOST, radar: { past: [{ time: 1759421400, path: '/v2/radar/newer' }] } }
  drawn(r, AC, 5 * MIN + 1000) // the METARs again, so that they are not due with the radar frame at 10 min (their answer would build the sky at the old place)
  await flush()
  drawn(r, AC, 10 * MIN) // the look that asks for the newer frame: nothing of it yet
  await flush()
  const far = { lat: AC.lat, lon: AC.lon + 6, altM: AC.altM } // 570 km on: the newer frame's tiles are others; the old frame's stay in the store until it is full
  drawn(r, far, 10 * MIN + 1000)
  await flush()
  drawn(r, far, 10 * MIN + 2000)
  assert.ok(r.w.radar!.url.includes('newer'))
  for (let i = 0; i < 3; i++) {
    gc() // (not after a deref in the same job: deref keeps its target alive until the job ends)
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
  }
  assert.equal(old.deref(), undefined, 'the older frame\'s source is gone')
})

test('echoShade: rain on the radar over the camera greys the sky by its strength', () => {
  assert.equal(echoShade(5), 0)
  assert.equal(echoShade(15), 0.5)
  assert.equal(echoShade(32), 0.75)
  assert.equal(echoShade(48), 0.9)
})


// ---- the model: clouds where nothing else says, the wind aloft ---------------------------------------------------------------

const cloudKey = (c: CloudSpec): string => `${c.lon}|${c.lat}|${c.heightM}|${c.scale[0]}`
const keysOf = (cs: readonly CloudSpec[]): Set<string> => new Set(cs.map(cloudKey))
/** A grid of mid and high cloud everywhere. */
const CLOUDY = (geo: ModelGeo): ModelGrid => gridFor(geo, { cover: (hPa) => (hPa === 600 || hPa === 250 ? 70 : 0) })

test('Weather3D: the model\'s grid is asked for at the first look with an aircraft (the 10 s dwell off), again after 30 min, and when the aircraft leaves the inner half of the grid it holds, not within 30 s of the last ask', async () => {
  const r = rig()
  await open(r)
  assert.deepEqual(r.asks('model'), ['/api/wx/model?lat=32.1&lon=34.9'])
  const first = r.w.model!
  assert.deepEqual([first.lat0, first.lon0, first.step, first.n], [31.5, 34, 0.25, 7], 'the cell 32 to 32.5°N, 34.5 to 35°E: its grid from 31.5°N 34°E, its middle at 32.25°N 34.75°E')
  for (const [at, t] of [[{ ...AC, lat: 32.62 }, 5000], [{ ...AC, lat: 31.88 }, 6000], [{ ...AC, lon: 35.12 }, 7000], [{ ...AC, lon: 34.38 }, 8000]] as const) r.w.update(at, t) // 0.37° from the middle: inside
  await flush()
  assert.equal(r.asks('model').length, 1)
  r.w.update({ ...AC, lat: 32.63 }, 10_000) // out of the inner half (0.375°), 10 s after the ask
  await flush()
  assert.equal(r.asks('model').length, 1, 'not within 30 s of the last ask')
  r.w.update({ ...AC, lat: 32.63 }, 30_000)
  await flush()
  assert.deepEqual(r.asks('model').slice(1), ['/api/wx/model?lat=32.63&lon=34.9'])
  assert.equal(r.w.model!.lat0, 32, 'the cell north of it: its grid from 32°N')
  for (const t of [31_000, 40_000, 90_000]) r.w.update({ ...AC, lat: 32.63 }, t)
  r.w.update({ ...AC, lat: 32.4 }, 100_000)
  await flush()
  assert.equal(r.asks('model').length, 2, 'inside the new grid\'s inner half: nothing more')
  r.w.update({ ...AC, lat: 32.63 }, 30_000 + 30 * MIN - 1000)
  await flush()
  assert.equal(r.asks('model').length, 2, 'not yet: 30 min from the last ask')
  r.w.update({ ...AC, lat: 32.63 }, 30_000 + 30 * MIN)
  await flush()
  assert.deepEqual(r.asks('model').slice(2), [r.asks('model')[1]], 'after 30 min, the same place')
})

test('Weather3D: a failed model ask is one warning and a note on the line, asked again in 30 s, the rest still drawn; an answer that is not a grid is a failed ask too', async () => {
  const warned: unknown[][] = []
  const warn = console.warn
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    const r = rig()
    r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
    r.failing.add('model')
    await open(r)
    assert.equal(r.asks('model').length, 1)
    assert.equal(warned.length, 1)
    assert.match(String(warned[0][0]), /FlightHopper: 3-D weather .*wx\/model/)
    assert.equal(r.lines.at(-1), 'Clouds from 0 airports · 1 hazard area · some weather unavailable')
    assert.equal(r.w.model, null)
    assert.equal(r.areas().length, 1, 'the rest came')
    r.w.update(AC, 29_000)
    await flush()
    assert.equal(r.asks('model').length, 1)
    r.w.update(AC, 30_000)
    await flush()
    assert.equal(r.asks('model').length, 2, 'asked again after 30 s, not 30 min')
    assert.equal(warned.length, 1, 'the retry is the same outage: no second warning')
    r.failing.clear()
    r.w.update(AC, 61_000)
    await flush()
    assert.equal(r.asks('model').length, 3)
    assert.equal(r.lines.at(-1), `Clouds from the forecast · 1 hazard area${CREDIT}`, 'the note goes when it is answered, and the credit comes with the grid')
    assert.notEqual(r.w.model, null)
    r.w.update(AC, 61_000 + 29 * MIN)
    await flush()
    assert.equal(r.asks('model').length, 3, 'and then the usual 30 min')

    const good = gridFor({ lat0: 31.5, lon0: 34, step: 0.25, n: 7 })
    for (const [name, bad] of Object.entries({
      error: { error: 'nope' }, null: null, text: 'x', list: [], empty: {}, noPlaces: { ...good, n: 0 }, wrongN: { ...good, n: 'x' }, noStep: { ...good, step: 0 },
      noOrigin: { ...good, lat0: null }, noClouds: { ...good, clouds: 'none' }, noWinds: { ...good, winds: null }, noGround: { ...good, elevM: 4 }, badLevel: { ...good, clouds: [{ hPa: 700 }] },
    })) {
      const s = rig()
      s.model.make = () => bad
      await open(s)
      assert.equal(s.w.model, null, name)
      assert.match(String(s.lines.at(-1)), /some weather unavailable$/, name)
    }
  } finally {
    console.warn = warn
  }
})

test('Weather3D: after a 503 that says when the server will ask Open-Meteo again, the model is not asked before then (30 min at most), the grid held drawing meanwhile; one warning for the outage, which the next answer ends', async () => {
  const warned: unknown[][] = []
  const warn = console.warn
  console.warn = (...a: unknown[]) => void warned.push(a)
  try {
    const r = rig()
    r.model.make = CLOUDY
    await open(r) // the grid from 31.5°N
    const first = r.w.model!
    const out = { ...AC, lat: 32.63 } // out of its inner half: the grid north of it is wanted
    r.failing.add('model')
    r.model.retryAfterS = 600
    r.w.update(out, 40_000)
    await flush()
    assert.equal(r.asks('model').length, 2)
    assert.equal(warned.length, 1)
    assert.match(String(warned[0][1]), /HTTP 503/)
    assert.match(String(r.lines.at(-1)), /Open-Meteo.* · some weather unavailable$/, 'a note, and the grid held is still in use')
    for (let t = 45_000; t < 640_000; t += 5000) r.w.update(out, t) // a look every 5 s
    await flush()
    assert.equal(r.asks('model').length, 2, 'not asked in the 600 s it said, though a grid is wanted and its usual 30 s have gone by twenty times')
    assert.equal(r.w.model, first, 'the grid held is kept')
    assert.ok(r.sky.clouds.draws.at(-1)!.length > 100, 'and its clouds are drawn (built again, 59 km on, at the first look after the failure)')
    r.model.retryAfterS = 2400 // 40 min: a wait is never longer than the usual 30
    r.w.update(out, 640_000)
    await flush()
    assert.equal(r.asks('model').length, 3, 'asked when the 600 s are up')
    assert.equal(warned.length, 1, 'the same outage: no second warning')
    r.w.update(out, 640_000 + 30 * MIN - 1000)
    await flush()
    assert.equal(r.asks('model').length, 3, 'not yet')
    r.failing.clear()
    r.w.update(out, 640_000 + 30 * MIN)
    await flush()
    assert.equal(r.asks('model').length, 4, 'after 30 min, not 40')
    assert.equal(r.w.model!.lat0, 32, 'answered: the cell north')
    assert.equal(r.lines.at(-1), `Clouds from the forecast · 0 hazard areas${CREDIT}`, 'the outage is over: no note')
    r.failing.add('model') // the next failure is another outage
    r.model.retryAfterS = undefined
    r.w.update(out, 640_000 + 60 * MIN)
    await flush()
    assert.equal(warned.length, 2)
    r.w.update(out, 640_000 + 60 * MIN + 29_000)
    await flush()
    assert.equal(r.asks('model').length, 5)
    r.w.update(out, 640_000 + 60 * MIN + 30_000)
    await flush()
    assert.equal(r.asks('model').length, 6, 'no wait named: the usual 30 s')
    assert.equal(warned.length, 2)
  } finally {
    console.warn = warn
  }
})

test('Weather3D: its own getJson reads a 503\'s retryAfterS from the server\'s JSON body into the model\'s wait; a body with no number, or that is no JSON, leaves the usual 30 s', async () => {
  const asked: string[] = []
  const body = { text: '{"error":"the hour\'s allowance of calls is used","retryAfterS":900}' }
  const fetched = globalThis.fetch
  const warn = console.warn
  globalThis.fetch = (async (url: string) => {
    asked.push(url)
    if (url.includes('/wx/model')) return new Response(body.text, { status: 503 })
    return new Response(JSON.stringify(url.includes('/wx/') ? [] : INDEX))
  }) as unknown as typeof fetch
  console.warn = () => {}
  try {
    const r = rig({ network: true })
    const models = async (): Promise<number> => {
      await flush()
      await flush() // a Response's body takes a tick more
      return asked.filter((u) => u.includes('/wx/model')).length
    }
    r.w.show = true
    r.w.update(AC, 0)
    assert.equal(await models(), 1)
    r.w.update(AC, 30_000)
    r.w.update(AC, 899_000)
    assert.equal(await models(), 1, 'its body said 900 s')
    body.text = '<html>bad gateway</html>' // no JSON: the usual wait
    r.w.update(AC, 900_000)
    assert.equal(await models(), 2, 'asked at 900 s')
    r.w.update(AC, 929_000)
    assert.equal(await models(), 2)
    body.text = '{"error":"x"}' // JSON, no number
    r.w.update(AC, 930_000)
    assert.equal(await models(), 3)
    body.text = '{"error":"x","retryAfterS":"soon"}' // not a number
    r.w.update(AC, 960_000)
    assert.equal(await models(), 4, '30 s on')
    r.w.update(AC, 989_000)
    assert.equal(await models(), 4)
    r.w.update(AC, 990_000)
    assert.equal(await models(), 5, 'and 30 s on again')
  } finally {
    globalThis.fetch = fetched
    console.warn = warn
  }
})

test('HttpError: the status, and a retryAfterS only when it is a number above zero', () => {
  const e = new HttpError(503, 900)
  assert.deepEqual([e.message, e.status, e.retryAfterS, e instanceof Error], ['HTTP 503', 503, 900, true])
  for (const bad of [undefined, null, 0, -3, Number.NaN, Number.POSITIVE_INFINITY, '900', {}]) assert.equal(new HttpError(502, bad).retryAfterS, undefined, String(bad))
})

test('Weather3D: the model is asked for once the aircraft has stayed 10 s: hops to other cells, each within 10 s of the one before, ask nothing; staying 10 s asks once', async () => {
  assert.equal(MODEL_DWELL_MS, 10_000)
  const r = rig({ dwell: true })
  const at = (lat: number, lon: number): typeof AC => ({ lat, lon, altM: 10_000 })
  r.w.show = true
  r.w.update(AC, 0) // Haifa
  r.w.update(AC, MODEL_DWELL_MS - 1000)
  await flush()
  assert.deepEqual(r.asks('model'), [], 'not before the 10 s')
  r.w.update(at(47.4, 8.5), MODEL_DWELL_MS) // a hop, just when they would have been up: Zurich
  r.w.update(at(-33.9, 151.2), 18_000) // 8 s on, another: Sydney
  r.w.update(at(40.6, -73.8), 26_000) // and another: New York
  r.w.update(at(40.6, -73.8), 35_000)
  await flush()
  assert.deepEqual(r.asks('model'), [], 'three hops, none of them stayed 10 s')
  assert.equal(r.w.model, null)
  r.w.update(at(40.6, -73.8), 36_000)
  await flush()
  assert.deepEqual(r.asks('model'), ['/api/wx/model?lat=40.6&lon=-73.8'], 'it has stayed 10 s: asked, once, for where it is')
  for (let t = 37_000; t < 120_000; t += 1000) r.w.update(at(40.6, -73.8), t)
  await flush()
  assert.equal(r.asks('model').length, 1, 'and no more')
  assert.notEqual(r.w.model, null)
})

test('Weather3D: the first ask after the weather is shown waits 10 s too, even for a grid held that is due: hiding and showing starts the 10 s over', async () => {
  const r = rig({ dwell: true })
  r.w.show = true
  r.w.update(AC, 0)
  r.w.update(AC, MODEL_DWELL_MS)
  await flush()
  assert.deepEqual(r.asks('model'), ['/api/wx/model?lat=32.1&lon=34.9'], 'staying 10 s: asked')
  r.w.show = false
  const back = 30 * MIN + 60_000 // its grid is due again
  r.w.show = true
  r.w.update(AC, back)
  r.w.update(AC, back + MODEL_DWELL_MS - 1000)
  await flush()
  assert.equal(r.asks('model').length, 1, 'shown again: the 10 s begin again')
  r.w.update(AC, back + MODEL_DWELL_MS)
  await flush()
  assert.equal(r.asks('model').length, 2)
})

test('Weather3D: a jet that crosses into the next cell is asked for 10 s after it leaves the inner half of its grid, which draws meanwhile; one that turns back inside before then is not', async () => {
  const r = rig({ dwell: true })
  r.model.make = CLOUDY
  r.w.show = true
  r.w.update(AC, 0)
  r.w.update(AC, MODEL_DWELL_MS)
  await flush()
  const first = r.w.model!
  assert.equal(first.lat0, 31.5, 'the cell 32 to 32.5°N: its inner half reaches 32.625')
  const jet = (lat: number): typeof AC => ({ ...AC, lat })
  r.w.update(jet(32.5), 90_000) // 80 s on, flying north inside it
  r.w.update(jet(32.6), 95_000)
  r.w.update(jet(32.63), 100_000) // out of the inner half, in the next cell
  drawn(r, jet(32.64), 105_000)
  assert.equal(r.asks('model').length, 1, '5 s after the crossing: not asked, though the last ask is 95 s ago')
  assert.equal(r.w.model, first, 'the grid held is in use')
  assert.ok(r.w.windAt(32.64, AC.lon, 30_000) !== null && r.sky.clouds.draws.at(-1)!.length > 100, 'its wind and its clouds')
  r.w.update(jet(32.65), 109_000)
  await flush()
  assert.equal(r.asks('model').length, 1, '9 s')
  r.w.update(jet(32.66), 110_000)
  await flush()
  assert.deepEqual(r.asks('model').slice(1), ['/api/wx/model?lat=32.66&lon=34.9'], '10 s after the crossing: asked once, for where it is now')
  assert.equal(r.w.model!.lat0, 32, 'the grid of the cell north')
  // The new grid reaches 33.125: out of it at 33.13, and back inside it 5 s on
  r.w.update(jet(33.13), 200_000)
  r.w.update(jet(33.1), 205_000)
  r.w.update(jet(33.1), 215_000)
  await flush()
  assert.equal(r.asks('model').length, 2, 'it turned back: the grid held serves it again, nothing asked')
})

test('Weather3D: an answer to an ask that has been replaced by a later one is not heard; destroyed, none is', async () => {
  const r = rig()
  await open(r) // the grid from 31.5°N
  r.hold.add('model')
  r.w.update({ ...AC, lat: 32.7 }, 30_000) // out of its inner half: asked for the cell north (32.5 to 33°N), held
  r.hold.clear()
  r.w.update({ ...AC, lat: 33.3 }, 60_000) // the first answer has not come, and the aircraft is farther on: asked for the cell at 33°N, answered at once
  await flush()
  assert.equal(r.asks('model').length, 3)
  assert.equal(r.w.model!.lat0, 32.5)
  r.release() // the second ask's answer lands late
  await flush()
  assert.equal(r.w.model!.lat0, 32.5, 'it does not replace the newer one')
  const late = rig()
  late.hold.add('model')
  late.w.show = true
  late.w.update(AC, 0)
  late.w.destroy()
  late.release()
  await flush()
  assert.equal(late.w.model, null)
})

test('Weather3D: ?wxat asks for the model round that place and keeps its grid where it is drawn, over the aircraft', async () => {
  const zurich = { lat: 47.4, lon: 8.5 }
  const r = rig({ at: zurich })
  r.model.make = CLOUDY
  await open(r) // the aircraft is over Haifa
  assert.deepEqual(r.asks('model'), ['/api/wx/model?lat=47.4&lon=8.5'], 'the place the aircraft is at in Zurich\'s sky')
  const d = r.w.shift
  const g = r.w.model!
  assert.ok(near(g.lat0, 46.5 + d.dLat, 1e-9) && near(g.lon0, 8 + d.dLon, 1e-9), `${g.lat0}, ${g.lon0}: Zurich\'s grid (from 46.5°N 8°E) moved onto the aircraft`)
  assert.notEqual(r.w.windAt(AC.lat, AC.lon, 30_000), null, 'the grid is round the aircraft')
  assert.equal(r.w.windAt(zurich.lat, zurich.lon, 30_000), null, 'not round Zurich: its sky is drawn over Haifa')
  drawn(r, AC, 1000)
  const sky = r.sky.clouds.draws.at(-1)!
  assert.ok(sky.length > 100 && sky.every((c) => kmFrom(c, AC) <= 150), 'its clouds round the aircraft')
})

test('Weather3D: the model\'s clouds are built when the grid comes and drawn the frame after, from the grid and the reports held, after the observed ones', async () => {
  const r = rig()
  r.model.make = CLOUDY
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  assert.equal(r.sky.clouds.draws.length, 0, 'built at the look, not drawn in it')
  r.w.update(AC, 16)
  assert.equal(r.sky.clouds.draws.length, 1)
  const observed = observedClouds(r.w.metars, AC.lat, AC.lon).specs
  const model = modelClouds(r.w.model!, r.w.metars)
  assert.ok(observed.length > 0 && model.length > 300 && model.length <= MODEL_LOOK.max)
  const sky = r.sky.clouds.draws[0]
  assert.deepEqual(sky, nearestClouds([observed, model], AC.lat, AC.lon))
  const seen = nearestClouds([observed], AC.lat, AC.lon)
  assert.deepEqual(sky.slice(0, seen.length), seen, 'the observed first')
  assert.ok(sky.length === seen.length + model.length && sky.every((c) => kmFrom(c, AC) <= 150), 'then all of the model\'s that are within reach')
  assert.equal(r.lines.at(-1), `Clouds from 1 airport · 0 hazard areas${CREDIT}`, 'the line counts airports, as it did')
  r.w.update(AC, 32)
  assert.equal(r.sky.clouds.draws.length, 1, 'drawn once')
})

test('Weather3D: with no grid yet, or one with no cloud, the sky is the observed and the radar\'s as before', async () => {
  const r = rig()
  r.hold.add('model')
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('SCT', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  assert.deepEqual(r.sky.clouds.draws.at(-1), nearestClouds([observedClouds(r.w.metars, AC.lat, AC.lon).specs], AC.lat, AC.lon))
  const n = r.sky.clouds.draws.length
  r.hold.clear()
  r.release() // the grid comes: clear
  await flush()
  r.w.update(AC, 32)
  r.w.update(AC, 48)
  assert.deepEqual(r.sky.clouds.draws.at(-1), r.sky.clouds.draws[0])
  assert.ok(r.sky.clouds.draws.length <= n + 1, 'built again for the grid, the same sky')
  assert.equal(r.w.model!.clouds.every((l) => l.cover.every((c) => c === 0)), true)
})

test('Weather3D: the 700 are the observed clouds first, the radar\'s, then the model\'s, each nearest first: the model fills what is left', async () => {
  const r = rig()
  giveTiles(r, echoTiles(AC, [[20, 0, 50], [-15, 10, 42]]))
  r.model.make = CLOUDY
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { elevM: 30, clouds: [layer('SCT', 2000)] })]
  await open(r)
  drawn(r, AC, 1000)
  const sky = r.sky.clouds.draws.at(-1)!
  const observed = keysOf(observedClouds(r.w.metars, AC.lat, AC.lon).specs)
  const radar = keysOf(radarClouds(radarCells(tileGetter(r), AC.lat, AC.lon, undefined, READ_KM), radarBases(r.w.metars)))
  const model = keysOf(modelClouds(r.w.model!, r.w.metars))
  const group = sky.map((c) => (observed.has(cloudKey(c)) ? 0 : radar.has(cloudKey(c)) ? 1 : model.has(cloudKey(c)) ? 2 : -1))
  assert.ok(!group.includes(-1), 'every cloud is one of the three sources\'')
  assert.deepEqual(group, [...group].sort((a, b) => a - b), 'in order: observed, radar\'s, model\'s')
  assert.deepEqual([...new Set(group)], [0, 1, 2])
  assert.ok(sky.length <= MAX_CLOUDS)
})

test('Weather3D: where the observed clouds fill the 700 the model\'s are not drawn at all', async () => {
  const stations = Array.from({ length: 12 }, (_, i) => metar(`S${i}`, 32.1 + ((i % 4) - 1.5) * 0.25, 34.9 + (Math.floor(i / 4) - 1) * 0.3, { elevM: 30, clouds: [layer('OVC', 1500)] }))
  const r = rig()
  r.model.make = CLOUDY
  r.answers.metar = stations
  await open(r)
  drawn(r, AC, 1000)
  const sky = r.sky.clouds.draws.at(-1)!
  assert.equal(sky.length, MAX_CLOUDS)
  const model = keysOf(modelClouds(r.w.model!, r.w.metars))
  assert.ok(model.size > 300 && model.size <= MODEL_LOOK.max)
  assert.ok(!sky.some((c) => model.has(cloudKey(c))), 'none of the model\'s')
})

test('Weather3D: the model\'s low clouds are left out near the reports it holds (observations win), as modelClouds says; a report that comes later takes them away', async () => {
  const r = rig()
  r.model.make = (geo) => gridFor(geo, { cover: (hPa) => (hPa === 925 ? 70 : 0) })
  const lowNearStation = (): CloudSpec[] => r.sky.clouds.draws.at(-1)!.filter((c) => near(c.heightM - (PUFF_FILL * c.scale[1]) / 2, 760, 1e-6) && Math.abs(c.lat - 32.25) < 0.37 && Math.abs(c.lon - 34.75) < 0.37)
  await open(r)
  drawn(r, AC, 1000)
  assert.ok(lowNearStation().length > 10, 'no report: the model\'s low deck over the block of places round the middle')
  r.answers.metar = [metar('LLBG', 32.25, 34.75, { clouds: [layer('FEW', 3000)] })] // over the middle place of the grid, at the next list
  r.w.update(AC, 5 * MIN)
  await flush()
  drawn(r, AC, 5 * MIN + 1000)
  const model = modelClouds(r.w.model!, r.w.metars)
  assert.notDeepEqual(model, modelClouds(r.w.model!, []), 'the report counts')
  const sky = keysOf(r.sky.clouds.draws.at(-1)!)
  assert.ok(model.length > 100 && model.every((c) => sky.has(cloudKey(c))), 'its clouds are the ones drawn')
  assert.equal(lowNearStation().filter((c) => keysOf(model).has(cloudKey(c))).length, 0, 'none of the model\'s in the block of places within 40 km of the station')
})

test('Weather3D: a new grid builds the sky again from it, with nothing else new (the aircraft has left the inner half of the old one, 14 km on)', async () => {
  const r = rig()
  const at = { ...AC, lat: 32.0 } // the cell 32 to 32.5°N: the aircraft is 0.25° south of its grid's middle
  await open(r, at)
  drawn(r, at, 1000)
  assert.equal(r.sky.clouds.draws.at(-1)!.length, 0, 'a clear grid')
  const draws = r.sky.clouds.draws.length
  r.model.make = CLOUDY
  const south = { ...at, lat: 31.87 } // 0.38° from the middle: out of the inner half, 14 km from where the clouds were built
  r.w.update(south, 30_000)
  await flush()
  assert.equal(r.asks('model').length, 2)
  assert.equal(r.asks('metar').length, 1, 'nothing else asked')
  drawn(r, south, 31_000)
  assert.ok(r.sky.clouds.draws.length > draws && r.sky.clouds.draws.at(-1)!.length > 100, 'built again for the new grid')
  assert.deepEqual(r.sky.clouds.draws.at(-1), nearestClouds([modelClouds(r.w.model!, r.w.metars)], south.lat, south.lon))
})

test('Weather3D: the model\'s clouds are worked out once for a grid and the reports, not at every rebuild: a radar tile or the next field builds the sky again from the same clouds', async () => {
  const r = rig()
  r.model.make = CLOUDY
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  const model = keysOf(modelClouds(r.w.model!, r.w.metars))
  const first = r.sky.clouds.draws[0].filter((c) => model.has(cloudKey(c)))
  assert.ok(first.length > 100)
  r.w.update(north(15.5), 2000) // the next field is due: built again
  r.w.update(north(15.5), 2016)
  assert.equal(r.sky.clouds.draws.length, 2)
  const second = r.sky.clouds.draws[1].filter((c) => model.has(cloudKey(c)))
  assert.ok(second.length > 100 && second.every((c) => first.includes(c)), 'the same objects')
  r.w.rebuildSky(false) // a check aid: built again as when the next field is due, the sources' clouds kept
  r.w.update(north(15.5), 2032)
  r.w.update(north(15.5), 2048)
  assert.equal(r.sky.clouds.draws.length, 3)
  assert.ok(r.sky.clouds.draws[2].filter((c) => model.has(cloudKey(c))).every((c) => first.includes(c)), 'the same objects still')
})

test('Weather3D: rebuildSky works the model\'s clouds out again from the grid, so a changed look shows (a check aid)', async () => {
  const r = rig()
  r.model.make = (geo) => gridFor(geo, { cover: (hPa, p) => (hPa === 925 && p === 24 ? 30 : 0) }) // a scattered low layer over the middle place
  await open(r)
  r.w.update(AC, 16)
  const was = MODEL_LOOK.low.density
  const before = r.sky.clouds.draws[0].length
  assert.ok(before > 20)
  try {
    ;(MODEL_LOOK.low as { density: number }).density = was / 2
    r.w.update(AC, 1000) // a look, no rebuild due
    r.w.update(AC, 1016)
    assert.equal(r.sky.clouds.draws.length, 1)
    r.w.rebuildSky()
    r.w.update(AC, 1032)
    assert.equal(r.sky.clouds.draws.length, 2)
    assert.ok(near(r.sky.clouds.draws[1].length, before / 2, 1), `${r.sky.clouds.draws[1].length} against half of ${before}`)
  } finally {
    ;(MODEL_LOOK.low as { density: number }).density = was
  }
})

test('Weather3D: the model\'s wind at a place and pressure altitude, from the grid as drawn; none while hidden, before the grid has come, or outside it', async () => {
  const r = rig()
  assert.equal(r.w.windAt(AC.lat, AC.lon, 30_000), null, 'hidden, no grid')
  assert.equal(r.w.model, null)
  r.hold.add('model')
  r.w.show = true
  r.w.update(AC, 0)
  assert.equal(r.w.windAt(AC.lat, AC.lon, 30_000), null, 'asked, not answered')
  r.hold.clear()
  r.release()
  await flush()
  const w = r.w.windAt(AC.lat, AC.lon, 30_000)!
  assert.deepEqual(w, modelWindAt(r.w.model!, AC.lat, AC.lon, 30_000))
  assert.ok(near(w.kt, 80, 0.3) && near(w.fromDeg, 270, 0.5), `${w.kt} kt from ${w.fromDeg}: the 300 hPa wind, 30,000 ft being 301 hPa`)
  assert.ok(near(r.w.windAt(AC.lat, AC.lon, 18_289)!.kt, 40, 0.3), 'the 500 hPa wind at 18,289 ft')
  assert.equal(r.w.windAt(40, AC.lon, 30_000), null, 'north of the grid')
  r.w.show = false
  assert.equal(r.w.windAt(AC.lat, AC.lon, 30_000), null, 'hidden: none')
  assert.notEqual(r.w.model, null, 'its grid is kept')
  r.w.show = true
  assert.deepEqual(r.w.windAt(AC.lat, AC.lon, 30_000), w, 'shown again: from what it holds')
})

test('Weather3D: a grid that lands while it is hidden is kept, not drawn; shown again, its clouds are built at once', async () => {
  const r = rig()
  r.model.make = CLOUDY
  r.hold.add('model')
  r.w.show = true
  r.w.update(AC, 0)
  r.w.show = false
  r.hold.clear()
  r.release()
  await flush()
  assert.notEqual(r.w.model, null, 'kept')
  const draws = r.sky.clouds.draws.length
  r.w.update(AC, 16)
  assert.equal(r.sky.clouds.draws.length, draws, 'hidden: nothing built or drawn')
  r.w.show = true
  r.w.update(AC, 32)
  r.w.update(AC, 48)
  assert.ok(r.sky.clouds.draws.length > draws && r.sky.clouds.draws.at(-1)!.length > 100, 'shown: built from what it holds')
})

test('Weather3D: while a model grid is held the line carries Open-Meteo\'s credit, after the counts and before a note; not before the grid has come, nor if it never does', async () => {
  const r = rig()
  r.hold.add('model')
  r.w.show = true
  r.w.update(AC, 0)
  await flush()
  assert.equal(r.lines.at(-1), 'Clouds from 0 airports · 0 hazard areas', 'asked, not here yet: no credit')
  r.hold.clear()
  r.release()
  await flush()
  assert.equal(r.lines.at(-1), 'Clouds from the forecast · 0 hazard areas · Weather data by Open-Meteo.com')
  r.failing.add('sigmet')
  r.w.update(AC, 10 * MIN + 1000)
  await flush()
  assert.equal(r.lines.at(-1), 'Clouds from the forecast · 0 hazard areas · Weather data by Open-Meteo.com · some weather unavailable', 'a note goes after it')
  const warn = console.warn
  console.warn = () => {}
  try {
    const down = rig()
    down.failing.add('model')
    await open(down)
    assert.equal(down.lines.at(-1), 'Clouds from 0 airports · 0 hazard areas · some weather unavailable', 'no grid: no credit')
  } finally {
    console.warn = warn
  }
})

test('Weather3D: a grid whose hour is more than 3 h old is no grid: no wind, no clouds, no credit, and it is asked for again at the next look; 3 h exactly, or no hour known, is kept', async () => {
  const r = rig()
  r.model.make = CLOUDY
  await open(r)
  drawn(r, AC, 1000)
  const modelPuffs = (): number => r.sky.clouds.draws.at(-1)!.length
  assert.ok(modelPuffs() > 100 && r.w.windAt(AC.lat, AC.lon, 30_000) !== null && /Open-Meteo/.test(String(r.lines.at(-1))))
  r.epoch.now = GRID_HOUR_MS + 3 * 60 * MIN // 3 h exactly
  drawn(r, AC, 40_000)
  await flush()
  assert.equal(r.asks('model').length, 1, 'not asked for again: it is not too old')
  assert.ok(r.w.windAt(AC.lat, AC.lon, 30_000) !== null && modelPuffs() > 100)
  r.epoch.now += 1
  r.model.make = (geo) => ({ ...CLOUDY(geo), timeMs: r.epoch.now - 10 * MIN }) // the next answer is for a fresh hour
  assert.equal(r.w.windAt(AC.lat, AC.lon, 30_000), null, 'no wind from it, at once')
  r.w.update(AC, 41_000) // a look: the clouds are built without it; it is asked for again
  assert.equal(r.asks('model').length, 2, 'asked at the first look after, 40 s from the last ask')
  assert.equal(r.lines.at(-1), 'Clouds from 0 airports · 0 hazard areas', 'no credit while there is no grid in use')
  r.w.update(AC, 41_016)
  r.w.update(AC, 41_032)
  assert.equal(modelPuffs(), 0, 'its clouds are gone')
  await flush() // the new grid comes
  assert.ok(r.w.windAt(AC.lat, AC.lon, 30_000) !== null)
  drawn(r, AC, 42_000)
  assert.ok(modelPuffs() > 100 && /Open-Meteo/.test(String(r.lines.at(-1))), 'the new grid is in use: its clouds, its credit')
  // no hour known: kept however long
  const open_ = rig()
  open_.model.make = (geo) => ({ ...gridFor(geo), timeMs: null })
  await open(open_)
  open_.epoch.now = GRID_HOUR_MS + 100 * 60 * MIN
  open_.w.update(AC, 40_000)
  await flush()
  assert.equal(open_.asks('model').length, 1)
  assert.ok(open_.w.windAt(AC.lat, AC.lon, 30_000) !== null)
})

test('Weather3D: a grid too old that the server keeps serving is asked for no more than every 30 s', async () => {
  const r = rig()
  r.model.make = (geo) => ({ ...gridFor(geo), timeMs: GRID_HOUR_MS - 4 * 60 * MIN }) // 4 h 30 min old when it comes: the server holds nothing newer
  await open(r)
  for (let t = 1000; t < 100_000; t += 1000) r.w.update(AC, t)
  await flush()
  assert.deepEqual(r.asks('model').length, 4, 'at 0, 30, 60 and 90 s')
  assert.equal(r.w.windAt(AC.lat, AC.lon, 30_000), null)
})

// ---- the demo sky (?wxdemo) and the cloud volume's look -------------------------------------------------------------------------

test('Weather3D: ?wxdemo asks for no weather at all: the demo sky, laid out once from the aircraft\'s first place, track and height, is drawn round the place ahead of the aircraft, with its hazard area', async () => {
  const r = rig({ demo: 60 })
  r.w.show = true
  r.w.update({ ...AC, trackDeg: 285 }, 0)
  await flush()
  for (const t of [16, 32, 1000, 1016, 61_000, 61_016, 11 * MIN, 11 * MIN + 16, 31 * MIN, 31 * MIN + 16]) r.w.update({ ...AC, trackDeg: 285 }, t)
  await flush()
  assert.deepEqual(r.asked, [], 'no report, no hazard list, no radar frame, no forecast')
  assert.deepEqual(r.tileAsks, [])
  const sky = demoSky(AC.lat, AC.lon, 285, { altM: AC.altM - geoidN(AC.lat, AC.lon), startKm: 60 })
  assert.equal(r.sky.clouds.draws.length, 1, 'built once while the aircraft stays')
  assert.deepEqual(r.sky.clouds.draws[0], sky.specs)
  assert.deepEqual(r.sky.clouds.ats[0], fieldCentre(AC.lat, AC.lon, 285))
  const inIt = (c: CloudSpec): boolean => (c.sev ?? 0) === 1 && c.heightM - (PUFF_FILL * c.scale[1]) / 2 < AC.altM && c.heightM + (PUFF_FILL * c.scale[1]) / 2 > AC.altM
  assert.ok(r.sky.clouds.draws[0].filter(inIt).length >= 40, 'the rain layer is round the aircraft\'s height (10 km, less the geoid)')
  assert.deepEqual(r.w.sigmets, sky.sigmets)
  assert.equal(r.w.hazards.length, 1)
  assert.equal(r.areas().length, 1, 'its hazard area is handed to the cloud pass')
  assert.equal(r.shown().length, 1)
  assert.equal(r.lines.at(-1), 'Clouds from 0 airports · 1 hazard area')
  assert.equal(r.sky.fog.sets.at(-1), null)
  assert.equal(r.sky.precip.sets.at(-1), null)
  // 31 km north, on another track (the one it turns to changes the sky's lie no more): the next field, round the place ahead of it there: the same sky, where it was laid
  r.w.update({ ...north(31), trackDeg: 10 }, 32 * MIN)
  r.w.update({ ...north(31), trackDeg: 10 }, 32 * MIN + 16)
  r.w.update({ ...north(31), trackDeg: 10 }, 32 * MIN + 32)
  assert.equal(r.sky.clouds.draws.length, 2)
  assert.deepEqual(r.sky.clouds.draws[1], sky.specs)
  assert.deepEqual(r.sky.clouds.ats[1], fieldCentre(north(31).lat, AC.lon, 10))
  assert.deepEqual(r.asked, [])
})

test('Weather3D: ?wxdemo=1 lays the sky from its start, due north when the aircraft has no track; hidden and shown again it is the same sky', async () => {
  const r = rig({ demo: 0 })
  await open(r)
  r.w.update(AC, 16)
  const sky = demoSky(AC.lat, AC.lon, 0, { altM: AC.altM - geoidN(AC.lat, AC.lon), startKm: 0 })
  assert.deepEqual(r.sky.clouds.draws[0], sky.specs)
  assert.ok(sky.specs.filter((c) => c.sev === 3).every((c) => c.lat > AC.lat + 0.5), 'the storm is ahead: north')
  r.w.show = false
  r.w.update(north(50), 5000)
  r.w.show = true
  r.w.update(north(50), 6000)
  r.w.update(north(50), 6016)
  r.w.update(north(50), 6032)
  assert.deepEqual(r.sky.clouds.draws.at(-1), sky.specs, 'not laid again from where it is shown')
  assert.deepEqual(r.sky.clouds.ats.at(-1), { lat: north(50).lat, lon: AC.lon })
  assert.deepEqual(r.asked, [])
})

test('Weather3D: a field is built round a place ahead of the aircraft on its track (fieldPlace.ts), and every source\'s clouds are read round that place; the next is built 5 km before the aircraft leaves the square the field serves it in, 35 km on along an axis; an aircraft at a taxi\'s pace has its field round itself, whatever way it points', async () => {
  const r = rig()
  const ahead = north(20)
  r.answers.metar = [metar('LLBG', ahead.lat + 0.01, 34.89, { clouds: [layer('FEW', 3000)] }), metar('FAR', north(165).lat, 34.9, { clouds: [layer('OVC', 4000)] }), metar('BACK', north(-170).lat, 34.9, { clouds: [layer('OVC', 4000)] })]
  const flying = (km: number): typeof AC & { trackDeg: number; gsKt: number } => ({ ...north(km), trackDeg: 0, gsKt: 450 })
  await open(r, flying(0))
  r.w.update(flying(0), 16)
  assert.deepEqual(r.sky.clouds.ats, [fieldCentre(AC.lat, AC.lon, 0)])
  assert.ok(near(kmFrom(r.sky.clouds.ats[0], AC), 20, 0.05), `${kmFrom(r.sky.clouds.ats[0], AC)} km ahead`)
  const drawn0 = r.sky.clouds.draws[0]
  assert.ok(drawn0.some((c) => kmFrom(c, AC) > 152 && c.lat > AC.lat), 'the deck round the station 165 km ahead reaches within 150 km of the field\'s middle: in the sky, past 150 km from the aircraft')
  assert.ok(!drawn0.some((c) => c.lat < north(-100).lat), 'the deck round the station 170 km behind comes within 145 km of the aircraft, and no nearer than 165 km to the field\'s middle: not in the sky')
  const draws = (): number => r.sky.clouds.draws.length
  for (const [km, t] of [[20, 1000], [34, 2000]]) {
    r.w.update(flying(km), t)
    r.w.update(flying(km), t + 16)
  }
  assert.equal(draws(), 1, '34 km on, past the field\'s middle: 6 km of the square left')
  r.w.update(flying(35.5), 3000)
  r.w.update(flying(35.5), 3016)
  assert.equal(draws(), 2)
  assert.deepEqual(r.sky.clouds.ats[1], fieldCentre(flying(35.5).lat, AC.lon, 0))
  const s = rig()
  await open(s, { ...AC, trackDeg: 0, gsKt: 12 })
  s.w.update({ ...AC, trackDeg: 0, gsKt: 12 }, 16)
  assert.deepEqual(s.sky.clouds.ats, [{ lat: AC.lat, lon: AC.lon }], 'taxiing: no way ahead')
  s.w.update({ ...AC, trackDeg: 180, gsKt: 3 }, 1000)
  s.w.update({ ...AC, trackDeg: 180, gsKt: 3 }, 1016)
  assert.equal(s.sky.clouds.draws.length, 1, 'turned on the spot: nothing is built')
})

test('Weather3D: without ?wxdemo the clouds are drawn round the aircraft\'s place when they were built, when it has no track', async () => {
  const r = rig()
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('FEW', 3000)] })]
  await open(r)
  r.w.update(AC, 16)
  assert.deepEqual(r.sky.clouds.ats, [{ lat: AC.lat, lon: AC.lon }])
  assert.ok(r.asked.length >= 3, 'and the weather is asked for')
})

test('Weather3D: the look is the cloud volume\'s, set on the fly and kept; the weather field is the one the volume built', async () => {
  const r = rig()
  assert.equal(r.w.look, 'severity')
  r.w.look = 'blocks'
  assert.deepEqual([r.w.look, r.sky.clouds.look], ['blocks', 'blocks'])
  r.w.look = 'natural'
  assert.deepEqual([r.w.look, r.sky.clouds.look], ['natural', 'natural'])
  assert.equal(r.w.field, null)
  const f = buildField([], AC.lat, AC.lon)
  r.sky.clouds.field = f
  assert.equal(r.w.field, f)
})

test('Weather3D: the hazard areas\' style (the box until set) is kept as given; the way ahead and its two aids are kept, and while the weather shows handed to the cloud pass at every call; hidden, nothing is handed on, and the pass is told once that there is no way ahead; the flags are copied', () => {
  const r = rig()
  assert.equal(r.w.hazardStyle, 'box')
  for (const style of ['curtain', 'fence', 'box'] as HazardStyle[]) {
    r.w.hazardStyle = style
    assert.equal(r.w.hazardStyle, style)
  }
  assert.equal(r.w.ahead, null)
  assert.deepEqual(r.w.aheadShow, { track: false, slice: false }, 'nothing is asked for until told')
  const path = aheadPath(AC, 90, 400, 0)!
  r.w.setAhead(path, { track: true, slice: false })
  assert.equal(r.w.ahead, path)
  assert.deepEqual(r.w.aheadShow, { track: true, slice: false })
  r.w.setAhead(null, { track: false, slice: true })
  assert.equal(r.w.ahead, null)
  assert.deepEqual(r.w.aheadShow, { track: false, slice: true })
  const flags = { track: true, slice: true }
  r.w.setAhead(path, flags)
  flags.track = false
  assert.deepEqual(r.w.aheadShow, { track: true, slice: true }, 'the caller\'s object is not kept')
  assert.equal(r.sky.clouds.aheads.length, 0, 'hidden: the pass is given nothing (nothing runs for a hidden weather, frame by frame)')
  r.w.show = true
  r.w.setAhead(path, { track: true, slice: false })
  r.w.setAhead(null, { track: false, slice: true })
  r.w.setAhead(path, { track: true, slice: true })
  assert.deepEqual(r.sky.clouds.aheads, [{ path, show: { track: true, slice: false } }, { path: null, show: { track: false, slice: true } }, { path, show: { track: true, slice: true } }])
  assert.equal(r.sky.clouds.aheads[0].path, path, 'the path itself, not a copy: it is given every frame')
  r.w.show = false
  assert.deepEqual(r.sky.clouds.aheads.slice(3), [{ path: null, show: { track: true, slice: true } }], 'hidden: no way ahead is left with the pass')
  r.w.setAhead(path, { track: true, slice: true })
  assert.equal(r.sky.clouds.aheads.length, 4)
  assert.equal(r.labelCalls.some((c) => c.key === 'ahead'), false, 'the minute labels are the app\'s, not Weather3D\'s')
})

test('Weather3D: when the cloud pass has failed (a render error took it out for good) the line says so, after a note of a source that is down, and the app is told once, with the words; the hazard areas, whose edges the pass drew, are then marked on the ground in every style, the box too; the rest of the weather goes on', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const r = rig()
    r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('BKN', 3000)] })]
    r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
    await open(r)
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 1 hazard area${CREDIT}`)
    assert.deepEqual([r.w.hazardStyle, r.footprints().length, r.w.cloudsFailed, r.failedNotes.length], ['box', 0, false, 0], 'a box has no footprint while the pass draws it')
    const [fog, rain] = [r.sky.fog.sets.length, r.sky.precip.sets.length]
    r.sky.clouds.failed = true
    r.w.update(AC, 1000) // the next look
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 1 hazard area${CREDIT} · 3-D clouds stopped after a drawing error`)
    assert.equal(r.w.cloudsFailed, true)
    assert.deepEqual(r.failedNotes, ['3-D clouds stopped after a drawing error'])
    assert.equal(r.footprints().length, 2, 'the box\'s ring on the ground now: its fill and its outline')
    r.w.hazardStyle = 'curtain'
    r.w.hazardStyle = 'box'
    assert.equal(r.footprints().length, 2, 'whatever the style')
    r.w.update(AC, 2000)
    r.w.update(AC, 3000)
    assert.equal(r.failedNotes.length, 1, 'told once')
    assert.deepEqual([r.shown().length, r.sky.fog.sets.length, r.sky.precip.sets.length], [1, fog + 3, rain + 3], 'the labels stay, and the fog and the rain are looked at as before')
    const draws = r.sky.clouds.draws.length
    r.w.update(north(31), 4000)
    r.w.update(north(31), 4016)
    r.w.update(north(31), 4032)
    assert.equal(r.sky.clouds.draws.length, draws + 1, 'the field is still built: the status line and the ahead strip ask it')
    r.failing.add('sigmet')
    r.w.update(north(31), 10 * MIN + 3000)
    await flush()
    assert.equal(r.lines.at(-1), `Clouds from 1 airport · 1 hazard area${CREDIT} · some weather unavailable · 3-D clouds stopped after a drawing error`)
  } finally {
    console.warn = warn
  }
})

test('Weather3D: the sky is known once a source of clouds has answered (the reports, the radar\'s frame or the forecast; the demo sky as soon as it is laid): before that, and while every one of them has only failed, it is not, whatever the hazard list says', async () => {
  const warn = console.warn
  console.warn = () => {}
  try {
    const r = rig()
    assert.equal(r.w.known, false, 'hidden, nothing asked')
    r.answers.sigmet = [sigmet({ rings: [northOf(300, 2)] })]
    for (const feed of ['metar', 'radar', 'model'] as const) r.failing.add(feed)
    await open(r)
    assert.equal(r.w.hazards.length, 1, 'the hazard areas came')
    assert.equal(r.w.known, false, 'no cloud source has answered: an empty sky is not a clear one')
    r.failing.delete('radar')
    r.w.update(AC, 31_000) // asked again after 30 s
    await flush()
    assert.equal(r.w.known, true, 'the radar\'s frame came')
    r.failing.add('radar')
    r.w.update(AC, 11 * MIN)
    await flush()
    assert.equal(r.w.known, true, 'a source that goes down afterwards leaves what it gave (the line notes it)')
    const reports = rig()
    reports.failing.add('radar')
    reports.failing.add('model')
    await open(reports)
    assert.equal(reports.w.known, false, 'an answer with no station in it (the open sea) says nothing of the sky')
    reports.answers.metar = [metar('LLBG', 32.01, 34.89)]
    reports.w.update(AC, 5 * MIN + 1000)
    await flush()
    assert.equal(reports.w.known, true, 'a report, even of a clear sky')
    const demo = rig({ demo: 0 })
    assert.equal(demo.w.known, false)
    await open(demo)
    assert.equal(demo.w.known, true, 'the demo sky is the whole sky')
  } finally {
    console.warn = warn
  }
})

test('Weather3D: the frames\' times, and the cloud pass\'s own time where the volume can tell it, set the tier the cloud march is walked at (marchPace.ts): frames the pass makes slow for a while make it coarser; with no word of the pass\'s time, a descent that does not make the frames quicker is taken back and left; hidden and shown again, it starts over at the first tier', async () => {
  const r = rig({ demo: 0 })
  await open(r)
  assert.deepEqual([r.sky.clouds.tier, r.w.tier], [0, 0])
  const seen = [0]
  let t = 0
  const frames = (ms: number, seconds: number): void => {
    for (const end = t + seconds * 1000; t < end;) {
      t += ms
      r.w.update(AC, t)
      if (r.sky.clouds.tier !== seen.at(-1)) seen.push(r.sky.clouds.tier)
    }
  }
  frames(16.7, 20)
  assert.deepEqual(seen, [0], 'quick frames: the first tier')
  frames(33, 7)
  assert.deepEqual(seen, [0, 1], 'slow for a while: coarser')
  frames(33, 30)
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 0], 'no quicker at the march\'s first smaller size: back, the slowness is not the march\'s')
  frames(33, 60)
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 0], 'and left there')
  r.w.show = false
  r.w.show = true
  t += 60_000 // the gap while hidden is not a frame
  frames(40, 14)
  assert.equal(r.sky.clouds.tier, 1, 'shown again: it tries again (after the eight seconds a start is given)')
  r.w.show = false
  assert.equal(r.sky.clouds.tier, 0, 'hidden: back to the first tier for the next time')
  // the pass's own time, when the volume has it: 20 of the frame's 33 ms are the pass's, so the pass is what is slow, and a coarser tier is kept though this stand-in's frames get no quicker
  const timed = rig({ demo: 0 })
  timed.sky.clouds.passMs = 20
  await open(timed)
  for (let ms = 33; ms < 60_000; ms += 33) timed.w.update(AC, ms)
  assert.deepEqual([timed.sky.clouds.tier, timed.w.tier], [5, 5], 'down to the last tier, and no further')
  // ?wxtier holds a tier, whatever the frames' times
  const held = rig({ demo: 0, tier: 4 })
  await open(held)
  for (let ms = 40; ms < 30_000; ms += 40) held.w.update(AC, ms)
  assert.deepEqual([held.sky.clouds.tier, held.w.tier], [4, 4])
  held.w.holdTier(2) // and so does holdTier, from the console, until it lets go
  held.w.update(AC, 30_040)
  assert.equal(held.sky.clouds.tier, 2)
  held.w.holdTier(9)
  held.w.update(AC, 30_080)
  assert.equal(held.sky.clouds.tier, 0, 'no such tier: the pace\'s again, which stands at the first')
})

test('parseWxBreak, parseWxTier: ?wxbreak=1 breaks the cloud pass\'s shader on purpose; ?wxtier holds the march at one of its six tiers; anything else is neither', () => {
  assert.equal(parseWxBreak('?hex=a831b2&wxbreak=1'), true)
  for (const off of ['', '?wxbreak=0', '?wxbreak=', '?wxbreak=true', '?wx=1']) assert.equal(parseWxBreak(off), false, off)
  assert.deepEqual(['?wxtier=0', '?wxtier=3', '?wx=1&wxtier=5'].map(parseWxTier), [0, 3, 5])
  for (const off of ['', '?wxtier=', '?wxtier=6', '?wxtier=-1', '?wxtier=1.5', '?wxtier=half', '?wxscale=0.5']) assert.equal(parseWxTier(off), null, off)
})

// ---- the weather satellite ------------------------------------------------------------------------------------------------------

test('parseWxSat: ?wxsat=0 turns the satellite off for a load; ?wxsat=pictures keeps it to EUMETView\'s pictures; anything else leaves it on, the app\'s server\'s frames first', () => {
  assert.equal(parseWxSat('?wxsat=0'), 'none')
  assert.equal(parseWxSat('?hex=a831b2&wx=1&wxsat=0&chase=1'), 'none')
  assert.equal(parseWxSat('?hex=a831b2&wx=1&wxsat=pictures&chase=1'), 'pictures')
  for (const on of ['', '?wx=1', '?wxsat=1', '?wxsat=', '?wxsat=off']) assert.equal(parseWxSat(on), 'server', on)
})

const SAT_T0 = GRID_HOUR_MS + 10 * MIN // the satellite's newest frame: 20 min before the rig's wall clock
/** A stand-in for EUMETView: a frame at `newest`, cloud (3,840 m) over the picture's western half; what was asked of it. */
function eumetview(o: { mask?: [number, number, number] } = {}): SatFetch & { asked: string[]; newest: number; fail: boolean } {
  const s = {
    asked: [] as string[], newest: SAT_T0, fail: false,
    text(url: string): Promise<string> {
      s.asked.push(url)
      return s.fail ? Promise.reject(new Error('HTTP 503')) : Promise.resolve(`<Dimension name="time" default="${new Date(s.newest).toISOString()}">`)
    },
    pixels(url: string, n: number): Promise<{ rgba: Uint8ClampedArray; bytes: number }> {
      s.asked.push(url)
      if (s.fail) return Promise.reject(new Error('HTTP 503'))
      const rgba = new Uint8ClampedArray(n * n * 4)
      for (let p = 0; p < n * n; p++) {
        const cloudy = p % n < n / 2
        if (url.includes(SAT_LAYER.top)) rgba.set(cloudy ? [0, 0, 255, 255] : [0, 0, 0, 0], 4 * p)
        else rgba.set([...(cloudy ? (o.mask ?? [255, 255, 255]) : [0, 192, 0]), 255], 4 * p)
      }
      return Promise.resolve({ rgba, bytes: 4000 })
    },
  }
  return s
}
/** The looks of the seconds from `from` to `to`, each given time to be answered. */
async function looks(r: Rig, from: number, to: number, at: { lat: number; lon: number; altM: number } = AC): Promise<void> {
  for (let t = from; t <= to; t += 1000) {
    r.w.update(at, t)
    await flush()
  }
}

test('Weather3D with the satellite: its newest frame is asked for round the aircraft; when it has come the sky is gathered again with its pictures, and the cloud volume is given the satellite\'s grid with the clouds', async () => {
  const server = eumetview()
  const r = rig({ satellite: new SatelliteSource({ fetch: server }) })
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('BKN', 3000)] })]
  assert.equal(r.w.satellite, null)
  await open(r)
  const box = satBox(AC.lat, AC.lon)
  assert.deepEqual(server.asked.slice(0, 3).map((u) => u.split('&bbox=')[0]), [satCapsUrl(), ...[SAT_LAYER.mask, SAT_LAYER.top].map((l) => `https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetMap&layers=${l}&styles=&format=image/png&transparent=true&crs=EPSG:4326`)])
  assert.ok(server.asked[1].includes(`&bbox=${box.join(',')}&`))
  await looks(r, 1000, 3000)
  const g = r.sky.clouds.sats.at(-1)!
  assert.ok(g !== null && g.n === SAT_GRID_N && g.timeMs === SAT_T0)
  assert.deepEqual(r.sky.clouds.ats.at(-1), fieldCentre(AC.lat, AC.lon, undefined))
  assert.ok(r.sky.clouds.draws.at(-1)!.some((c) => c.masked === true), 'the airport\'s broken layer stands where the satellite sees cloud')
  const sat = r.w.satellite!
  assert.deepEqual([sat.timeMs, sat.time, sat.used, sat.bytes], [SAT_T0, '08:10 UTC', true, 8000])
  assert.ok(sat.cloudy! > 0.3 && sat.cloudy! < 0.7, String(sat.cloudy))
  assert.equal(r.w.known, true)
  assert.equal(server.asked.length, 3, 'two pictures for the frame')
  assert.equal(r.lines.at(-1), 'Clouds from 1 airport · cloud positions from Meteosat, 08:10 UTC · 0 hazard areas · Weather data by Open-Meteo.com · © EUMETSAT')
})

test('Weather3D with the satellite: the pictures are read where the weather is (?wxat: the aircraft\'s place less the shift), and the job says by how much they are moved', async () => {
  const asks: GatherJob[] = []
  const gather = gatherer()
  const server = eumetview()
  const SFO = { lat: 37.6, lon: -122.4, altM: 3000 }
  const r = rig({ at: { lat: 50, lon: 8 }, satellite: new SatelliteSource({ fetch: server }), gather: { ask: (job, done) => { asks.push(job); done(gather(job)) }, destroy: () => {} } })
  await open(r, SFO)
  await looks(r, 1000, 3000, SFO)
  assert.ok(server.asked[1].includes(`&bbox=${satBox(50, 8).join(',')}&`))
  const job = asks.at(-1)!
  assert.deepEqual(job.sat!.box, satBox(50, 8))
  assert.ok(near(job.shift.dLat, 37.6 - 50, 1e-9) && near(job.shift.dLon, -122.4 - 8, 1e-9))
  assert.equal(job.epochMs, r.epoch.now)
  assert.ok(r.sky.clouds.sats.at(-1) !== null)
  // Without ?wxat an aircraft at San Francisco is outside the satellite's view: nothing is asked of it.
  const far = eumetview()
  const out = rig({ satellite: new SatelliteSource({ fetch: far }) })
  await open(out, SFO)
  await looks(out, 1000, 3000, SFO)
  assert.deepEqual(far.asked, [])
  assert.equal(out.sky.clouds.sats.at(-1), null)
  assert.equal(out.w.satellite, null)
})

test('Weather3D with the satellite: a newer frame builds the sky again; with no satellite (?wxsat=0), in the demo sky and while hidden nothing is asked of it', async () => {
  const server = eumetview()
  const r = rig({ satellite: new SatelliteSource({ fetch: server }) })
  await open(r)
  await looks(r, 1000, 3000)
  const before = r.sky.clouds.draws.length
  server.newest = SAT_T0 + 15 * MIN
  r.epoch.now += 5 * MIN
  await looks(r, SAT_CHECK_MS, SAT_CHECK_MS + 3000)
  assert.ok(r.sky.clouds.draws.length > before, 'built again (the reports, asked again at the same minute, build it once more)')
  assert.equal(r.sky.clouds.sats.at(-1)!.timeMs, SAT_T0 + 15 * MIN)
  assert.equal(r.w.satellite!.time, '08:25 UTC')
  r.w.show = false
  const asked = server.asked.length
  for (let t = 2 * SAT_CHECK_MS; t < 4 * SAT_CHECK_MS; t += 1000) r.w.update(AC, t)
  await flush()
  assert.equal(server.asked.length, asked, 'hidden')
  const off = rig() // ?wxsat=0: no source
  await open(off)
  await looks(off, 1000, 3000)
  assert.deepEqual([off.w.satellite, off.sky.clouds.sats.at(-1)], [null, null])
  const demoServer = eumetview()
  const demo = rig({ demo: 0, satellite: new SatelliteSource({ fetch: demoServer }) })
  await open(demo)
  await looks(demo, 1000, 3000)
  assert.deepEqual(demoServer.asked, [])
  assert.equal(demo.sky.clouds.sats.at(-1), null, 'the demo sky is untouched by the satellite')
})

test('Weather3D with the satellite: a frame the source has not answered for in 45 min is used no longer: the sky is built again as it is without a satellite, and the line notes the outage', async () => {
  const server = eumetview()
  const r = rig({ satellite: new SatelliteSource({ fetch: server }) })
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('BKN', 3000)] })]
  const warn = console.warn
  console.warn = () => {}
  try {
    await open(r)
    await looks(r, 1000, 3000)
    assert.ok(r.sky.clouds.sats.at(-1) !== null)
    server.fail = true
    r.epoch.now += 5 * MIN
    await looks(r, SAT_CHECK_MS, SAT_CHECK_MS + 2000)
    assert.ok(r.sky.clouds.sats.at(-1) !== null, 'a failed ask keeps the last frame')
    assert.equal(r.w.satellite!.used, true)
    assert.match(r.lines.at(-1)!, /some weather unavailable/)
    const before = r.sky.clouds.draws.length
    r.epoch.now += SAT_KEEP_MS
    await looks(r, 2 * SAT_CHECK_MS, 2 * SAT_CHECK_MS + 3000)
    assert.equal(r.sky.clouds.draws.length, before + 1, 'built again')
    assert.equal(r.sky.clouds.sats.at(-1), null)
    assert.ok(r.sky.clouds.draws.at(-1)!.every((c) => c.masked !== true))
    assert.equal(r.w.satellite!.used, false)
    assert.equal(r.lines.at(-1), 'Clouds from 1 airport · 0 hazard areas · Weather data by Open-Meteo.com · some weather unavailable', 'no word of the satellite, nor its credit, while its frame is not in use')
  } finally {
    console.warn = warn
  }
})

test('Weather3D with the satellite: pictures the gatherer cannot read are dropped: the sky is as without a satellite, the source is down', async () => {
  const server = eumetview({ mask: [200, 40, 40] })
  const source = new SatelliteSource({ fetch: server })
  const r = rig({ satellite: source })
  const warn = console.warn
  console.warn = () => {}
  try {
    await open(r)
    await looks(r, 1000, 4000)
  } finally {
    console.warn = warn
  }
  assert.equal(source.pictures, null)
  assert.equal(source.down, true)
  assert.equal(r.sky.clouds.sats.at(-1), null)
  assert.equal(r.w.satellite, null)
  assert.match(r.lines.at(-1)!, /some weather unavailable/)
})

test('Weather3D with the satellite: a frame\'s pixels go to the gatherer once, handed over; the jobs after bring the frame without them; a gatherer that has lost the frame gets the pixels again, or, when they are gone, the pictures are fetched again', async () => {
  const asks: { job: GatherJob; transfer: Transferable[] | undefined; pixels: number }[] = []
  const gather = { now: gatherer() }
  const server = eumetview()
  const source = new SatelliteSource({ fetch: server })
  const r = rig({ satellite: source, gather: { ask: (job, done, transfer) => { asks.push({ job, transfer, pixels: job.sat?.mask.length ?? -1 }); done(gather.now(job)) }, destroy: () => {} } })
  await open(r)
  await looks(r, 1000, 3000)
  const first = asks.find((a) => a.pixels > 0)!
  assert.deepEqual(first.transfer, [first.job.sat!.mask.buffer, first.job.sat!.tops.buffer])
  r.w.rebuildSky(false)
  r.w.update(AC, 3016)
  assert.deepEqual([asks.at(-1)!.pixels, asks.at(-1)!.transfer, asks.at(-1)!.job.sat!.timeMs], [0, [], SAT_T0], 'the frame, without its pixels')
  assert.ok(r.sky.clouds.sats.at(-1) !== null)
  // The gatherer is another (its worker failed, and this thread stands in): it has not the frame. The pixels are still here: sent again.
  gather.now = gatherer()
  r.w.rebuildSky(false)
  await looks(r, 4000, 6000)
  assert.ok(asks.at(-1)!.pixels > 0, 'sent again with its pixels')
  assert.ok(r.sky.clouds.sats.at(-1) !== null)
  // Lost again, and the pixels gone with the worker they were handed to: the pictures are fetched again (the browser has them).
  gather.now = gatherer()
  structuredClone(source.pictures!.mask.buffer, { transfer: [source.pictures!.mask.buffer] })
  structuredClone(source.pictures!.tops.buffer, { transfer: [source.pictures!.tops.buffer] })
  const fetched = server.asked.length
  r.w.rebuildSky(false)
  await looks(r, 7000, 11_000)
  assert.equal(server.asked.length, fetched + 2)
  assert.ok(asks.at(-1)!.pixels > 0 && r.sky.clouds.sats.at(-1) !== null)
  assert.equal(source.down, false)
})

/** EUMETView and, before it, the app's server's route: its frame is 15 minutes newer than the pictures', cloud (5,120 m) over the box's western half. */
function appServer() {
  const s = Object.assign(eumetview(), {
    status: 200,
    raw(url: string): Promise<{ status: number; body: ArrayBuffer | null; bytes: number }> {
      s.asked.push(url)
      const q = new URL(url, 'http://localhost').searchParams
      if (s.status !== 200) return Promise.resolve({ status: s.status, body: null, bytes: 0 })
      if (q.get('have') === String(SAT_T0 + 15 * MIN)) return Promise.resolve({ status: 204, body: null, bytes: 0 })
      const n = Number(q.get('n'))
      const west = (p: number): boolean => p % n < n / 2
      const body = encodeSatCut({
        timeMs: SAT_T0 + 15 * MIN, box: q.get('bbox')!.split(',').map(Number) as [number, number, number, number], n,
        cloud: Uint8Array.from({ length: n * n }, (_, p) => (west(p) ? 255 : 0)), seen: new Uint8Array(n * n).fill(1), topM: Uint16Array.from({ length: n * n }, (_, p) => (west(p) ? 5120 : 0)),
      }).buffer
      return Promise.resolve({ status: 200, body, bytes: 30_000 })
    },
  })
  return s
}

test('Weather3D with the satellite through the app\'s server: the frame\'s numbers go to the gatherer once, handed over as the one answer, and then the frame without them; the sky and the line are as with the pictures, and satellite.raw says which route the frame came by', async () => {
  const asks: { job: GatherJob; transfer: Transferable[] | undefined; bytes: number }[] = []
  const gather = gatherer()
  const server = appServer()
  const r = rig({ satellite: new SatelliteSource({ fetch: server, raw: '/api/wx/sat' }), gather: { ask: (job, done, transfer) => { asks.push({ job, transfer, bytes: job.sat?.raw?.length ?? -1 }); done(gather(job)) }, destroy: () => {} } })
  r.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('BKN', 3000)] })]
  await open(r)
  await looks(r, 1000, 3000)
  assert.deepEqual(server.asked, [`/api/wx/sat?bbox=${satBox(AC.lat, AC.lon).join(',')}&n=${SAT_N}`], 'the server, and nothing of EUMETView')
  const first = asks.find((a) => a.bytes > 0)!
  assert.deepEqual([first.bytes, first.job.sat!.mask.length], [48 + 4 * SAT_N * SAT_N, 0])
  assert.deepEqual(first.transfer, [first.job.sat!.raw!.buffer])
  const g = r.sky.clouds.sats.at(-1)!
  assert.ok(g !== null && g.n === SAT_GRID_N && g.timeMs === SAT_T0 + 15 * MIN)
  assert.ok(r.sky.clouds.draws.at(-1)!.some((c) => c.masked === true))
  const sat = r.w.satellite!
  assert.deepEqual([sat.raw, sat.timeMs, sat.time, sat.used, sat.bytes], [true, SAT_T0 + 15 * MIN, '08:25 UTC', true, 30_000])
  assert.ok(sat.decodeMs !== null && sat.decodeMs >= 0 && sat.decodeMs < 50 && sat.gridMs! > 0, `the numbers took next to nothing to read: ${sat.decodeMs} ms`)
  assert.ok(sat.cloudy! > 0.3 && sat.cloudy! < 0.7, String(sat.cloudy))
  assert.equal(r.lines.at(-1), 'Clouds from 1 airport · cloud positions from Meteosat, 08:25 UTC · 0 hazard areas · Weather data by Open-Meteo.com · © EUMETSAT', 'the line does not say the route')
  r.w.rebuildSky(false)
  r.w.update(AC, 3016)
  assert.deepEqual([asks.at(-1)!.bytes, asks.at(-1)!.transfer, asks.at(-1)!.job.sat!.timeMs], [0, [], SAT_T0 + 15 * MIN], 'the frame, without its bytes')
  assert.ok(r.sky.clouds.sats.at(-1) !== null)
  // The pictures' route says so.
  const pictures = rig({ satellite: new SatelliteSource({ fetch: eumetview() }) })
  await open(pictures)
  await looks(pictures, 1000, 3000)
  assert.deepEqual([pictures.w.satellite!.raw, pictures.w.satellite!.timeMs], [false, SAT_T0])
})

test('Weather3D with the satellite through the app\'s server: a server with no key leaves the sky as the pictures make it', async () => {
  const server = appServer()
  server.status = 404
  const r = rig({ satellite: new SatelliteSource({ fetch: server, raw: '/api/wx/sat' }) })
  const plain = rig({ satellite: new SatelliteSource({ fetch: eumetview() }) })
  for (const x of [r, plain]) {
    x.answers.metar = [metar('LLBG', 32.01, 34.89, { clouds: [layer('BKN', 3000)] })]
    await open(x)
    await looks(x, 1000, 3000)
  }
  assert.equal(server.asked.length, 4, 'the server once, then the pictures\' three')
  assert.deepEqual([r.w.satellite!.raw, r.w.satellite!.timeMs], [false, SAT_T0])
  assert.deepEqual(r.sky.clouds.sats.at(-1), plain.sky.clouds.sats.at(-1))
  assert.deepEqual(r.sky.clouds.draws.at(-1), plain.sky.clouds.draws.at(-1))
  assert.equal(r.lines.at(-1), plain.lines.at(-1))
})

test('satelliteFor: the app\'s server\'s route first by default; ?wxsat=pictures: EUMETView\'s pictures alone; ?wxsat=0: no satellite', async () => {
  assert.equal(satelliteFor('none', '/api'), null)
  const server = appServer()
  const withServer = satelliteFor('server', '/api', server)!
  const picturesOnly = satelliteFor('pictures', '/api', server)!
  withServer.look(0, SAT_T0 + 20 * MIN, AC.lat, AC.lon)
  await flush()
  assert.deepEqual(server.asked.map((u) => u.split('?')[0]), ['/api/wx/sat'])
  server.asked.length = 0
  picturesOnly.look(0, SAT_T0 + 20 * MIN, AC.lat, AC.lon)
  await flush()
  assert.equal(server.asked[0], satCapsUrl())
  assert.ok(server.asked.every((u) => !u.startsWith('/api/')))
})

// ---- the Sculpted look: another renderer behind the same seam ---------------------------------------------------------------

test('Weather3D: to the Sculpted look and back the renderer changes: the one in use is destroyed, the other made, shown as the weather is, and given the hazard areas, the way ahead and the clouds last drawn; between the volume\'s three looks nothing is made', async () => {
  const sky = fakeSky() as ReturnType<typeof fakeSky> & Pick<Sky, 'cloudsFor'>
  const made: { look: CloudLook; clouds: ReturnType<typeof fakeSky>['clouds'] }[] = []
  sky.cloudsFor = (look) => {
    made.push({ look, clouds: fakeSky().clouds })
    return made.at(-1)!.clouds
  }
  const first = sky.clouds
  const r = rig({ demo: 0, sky })
  await open(r)
  r.w.update(AC, 16)
  r.w.setAhead(aheadPath({ ...AC }, 90, 400, 0), { track: true, slice: false })
  assert.deepEqual([first.draws.length, first.hazardSets.at(-1)!.hazards.length, first.show], [1, 1, true])
  r.w.look = 'blocks'
  r.w.look = 'natural'
  assert.deepEqual([made.length, first.look, first.destroyed], [0, 'natural', false], 'the volume draws all three: nothing is made')
  r.w.look = 'sculpted'
  assert.deepEqual([made.map((m) => m.look), first.destroyed, sky.clouds === made[0].clouds], [['sculpted'], true, true])
  const second = made[0].clouds
  assert.deepEqual([second.show, second.look, second.hazardSets.at(-1)!.hazards.length, second.aheads.at(-1)!.show, second.fades.length], [true, 'sculpted', 1, { track: true, slice: false }, 1])
  assert.equal(second.draws.length, 0, 'the clouds at the next frame, not within the click')
  r.w.update(AC, 32)
  assert.deepEqual([second.draws.length, second.draws[0], second.ats[0]], [1, first.draws[0], first.ats[0]], 'what the volume was last given')
  r.w.update(AC, 48)
  assert.equal(second.draws.length, 1, 'once')
  r.w.look = 'sculpted'
  assert.equal(made.length, 1, 'the same look again: nothing')
  r.w.look = 'severity'
  assert.deepEqual([made.map((m) => m.look), second.destroyed, r.w.look], [['sculpted', 'severity'], true, 'severity'])
  r.w.update(AC, 64)
  assert.equal(made[1].clouds.draws.length, 1)
  // Hidden, the renderer made is hidden, and is given the clouds when the weather shows again.
  r.w.show = false
  r.w.look = 'sculpted'
  assert.deepEqual([made[2].clouds.show, made[2].clouds.hazardSets.length, made[2].clouds.draws.length], [false, 0, 0])
  r.w.show = true
  r.w.update(AC, 80)
  assert.deepEqual([made[2].clouds.show, made[2].clouds.draws.length], [true, 1])
})

test('Weather3D: the look it starts with is the one it is given, and a sky with one renderer is given every look', async () => {
  const r = rig({ demo: 0, look: 'sculpted' })
  assert.equal(r.w.look, 'sculpted')
  r.w.look = 'blocks'
  assert.deepEqual([r.sky.clouds.look, r.sky.clouds.destroyed], ['blocks', false])
})

test('Weather3D: the renderers themselves: in the Sculpted look there is no post-process stage in the scene, in the others no primitive, and nothing of the one left behind on the card', async () => {
  const stages: unknown[] = []
  const primitives: unknown[] = []
  const layers: ReturnType<typeof countLayer>[] = []
  const images: ReturnType<typeof bytesImage>[] = []
  const scene = {
    postProcessStages: { add: (x: unknown) => (stages.push(x), x), remove: (x: unknown) => (stages.splice(stages.indexOf(x), 1), true) },
    primitives: { add: (x: unknown) => (primitives.push(x), x), remove: (x: unknown) => primitives.includes(x) && (primitives.splice(primitives.indexOf(x), 1), true) },
    camera: { inverseViewMatrix: {}, positionCartographic: Cartographic.fromDegrees(AC.lon, AC.lat, AC.altM) },
  }
  const here = { ask: (job: Parameters<typeof makeField>[0], done: (made: ReturnType<typeof makeField>) => void): void => done(makeField(job)), destroy: (): void => {} }
  const renderers: CloudLook[] = []
  const cloudsFor = (look: CloudLook): SkyClouds => {
    renderers.push(look)
    return look === 'sculpted'
      ? new SculptedClouds(scene as never, { builder: here, layer: () => (layers.push(countLayer()), layers.at(-1)!) })
      : new CloudVolume(scene as never, { builder: here, images: (w, h) => (images.push(bytesImage(w, h)), images.at(-1)!), timer: null })
  }
  const sky = { ...fakeSky(), clouds: cloudsFor('severity'), cloudsFor } as unknown as ReturnType<typeof fakeSky> & Pick<Sky, 'cloudsFor'>
  const r = rig({ demo: 0, sky, look: 'severity' })
  const frames = (from: number): void => {
    for (let t = from; t < from + 160; t += 16) r.w.update(AC, t)
  }
  await open(r)
  frames(16)
  assert.deepEqual([stages.length, primitives.length, images.some((i) => !i.destroyed)], [1, 0, true], 'the volume: its pass, its images')
  r.w.look = 'sculpted'
  frames(200)
  assert.deepEqual([stages.length, primitives.length, images.every((i) => i.destroyed)], [0, 1, true], 'the bodies: no pass at all, no image left')
  assert.ok(layers[0].live > 0 && (sky.clouds as SkyClouds).stats!.triangles > 1000)
  assert.ok(r.w.field !== null && !r.w.field.empty, 'the status line has its field again')
  r.w.look = 'blocks'
  frames(400)
  assert.deepEqual([stages.length, primitives.length, layers.reduce((n, l) => n + l.live, 0), layers.every((l) => l.destroyed)], [1, 0, 0, true], 'the volume again: no primitive, no body left')
  r.w.look = 'natural'
  assert.deepEqual(renderers, ['severity', 'sculpted', 'blocks'], 'a renderer is made when its look is asked for, not before')
  r.w.show = false
  assert.deepEqual([stages.length, primitives.length], [0, 0])
})
