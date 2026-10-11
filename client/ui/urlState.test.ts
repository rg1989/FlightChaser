// client/ui/urlState.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PREFS, readScenePrefs } from './scenePrefs.ts'
import { readFlight, readHist, readScenario, readView, writeUrl } from './urlState.ts'

test('writeUrl: camera, chase, orbit and non-default toggles; other parameters kept; round trip through readView', () => {
  const url = writeUrl('?bench=1&at=1,2,3&glass=1', {
    at: { lat: 32.011449, lon: 34.886712, heightKm: 312.44 },
    hex: 'a1b2c3',
    chase: true,
    cam: { headingDeg: 12.4, pitchDeg: -12.2, rangeM: 150.4 },
    prefs: { ...DEFAULT_PREFS, topo: false },
  })
  assert.equal(url, '?bench=1&at=32.0114,34.8867,312&hex=a1b2c3&chase=1&cam=12,-12,150&topo=0')
  assert.deepEqual(readView(url), { at: { lat: 32.0114, lon: 34.8867, heightKm: 312 }, cam: { headingDeg: 12, pitchDeg: -12, rangeM: 150 }, chase: true })
})

test('writeUrl: roads and places each have their parameter, written when off their default; a reload reads them back', () => {
  const none = { at: null, hex: null, chase: false, cam: null }
  const prefs = { ...DEFAULT_PREFS, roads: true, places: false }
  const url = writeUrl('?places=1&tv=1', { ...none, prefs })
  assert.equal(url, '?tv=1&roads=1&places=0')
  assert.deepEqual(readScenePrefs(url, '{"roads":false,"places":true}'), prefs)
  assert.equal(writeUrl(url, { ...none, prefs: DEFAULT_PREFS }), '?tv=1', 'the defaults: neither')
})

test('writeUrl: a focused aircraft on the map keeps hex but writes no chase or cam; chase needs a hex', () => {
  const focus = writeUrl('?chase=1&cam=1,2,3', { at: { lat: 1, lon: 2, heightKm: 30 }, hex: 'a1b2c3', chase: false, cam: { headingDeg: 1, pitchDeg: 2, rangeM: 3 }, prefs: DEFAULT_PREFS })
  assert.equal(focus, '?at=1.0000,2.0000,30&hex=a1b2c3')
  assert.equal(readView(focus).chase, false)
  assert.equal(readView('?chase=1').chase, false, 'no aircraft to chase')
  assert.equal(readView('?hex=zz&chase=1').chase, false)
  assert.equal(readView('?hex=~a1b2c3&chase=1').chase, true)
})

test('writeUrl: browse drops hex, chase and cam; defaults write nothing; small heights keep 3 significant digits', () => {
  assert.equal(writeUrl('?hex=a1b2c3&cam=1,2,3', { at: { lat: -33.9, lon: 151.2, heightKm: 2.345 }, hex: null, chase: true, cam: { headingDeg: 0, pitchDeg: 0, rangeM: 1 }, prefs: DEFAULT_PREFS }), '?at=-33.9000,151.2000,2.35')
  assert.equal(writeUrl('', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS }), '')
})

test('writeUrl: the TV kiosk\'s ?tv=1 stays through every view, a scenario too', () => {
  assert.equal(writeUrl('?tv=1', { at: { lat: 1, lon: 2, heightKm: 30 }, hex: 'a1b2c3', chase: true, cam: { headingDeg: 1, pitchDeg: 2, rangeM: 3 }, prefs: DEFAULT_PREFS }), '?tv=1&at=1.0000,2.0000,30&hex=a1b2c3&chase=1&cam=1,2,3')
  assert.equal(writeUrl('?tv=1&at=1,2,3', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS, scenario: { id: 'demo', t: 5 } }), '?tv=1&scenario=demo&t=5')
  assert.equal(writeUrl('?tv=1&scenario=demo&t=5', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS }), '?tv=1')
})

test('writeUrl: a running scenario writes its id, t in whole seconds and the orbit; no at, hex or chase', () => {
  const url = writeUrl('?bench=1&at=1,2,3&hex=a1b2c3&chase=1&scenarioBase=/harness/fixtures/', {
    at: { lat: 35.5, lon: 139.8, heightKm: 1 }, hex: 'a1b2c3', chase: true, cam: { headingDeg: 12.4, pitchDeg: -12.2, rangeM: 150.4 }, prefs: DEFAULT_PREFS,
    scenario: { id: 'jal123', t: 66275.9 },
  })
  assert.equal(url, '?bench=1&scenarioBase=%2Fharness%2Ffixtures%2F&scenario=jal123&t=66275&cam=12,-12,150')
  assert.deepEqual(readScenario(url), { id: 'jal123', t: 66275, map: false })
  assert.deepEqual(readView(url).cam, { headingDeg: 12, pitchDeg: -12, rangeM: 150 })
  assert.equal(writeUrl('?scenario=jal123&t=1&cam=1,2,3', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS }), '', 'left: all of it goes')
  assert.equal(writeUrl('', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS, scenario: { id: 'demo', t: 5 } }), '?scenario=demo&t=5')
})

test('a scenario on its top-down map says ?view=map in place of the chase orbit, and a reload reads it back', () => {
  const state = { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS }
  const url = writeUrl('?scenario=jal123&t=1&cam=10,-20,300', { ...state, scenario: { id: 'jal123', t: 66275.4, map: true } })
  assert.equal(url, '?scenario=jal123&t=66275&view=map')
  assert.deepEqual(readScenario(url), { id: 'jal123', t: 66275, map: true })
  const back = writeUrl(url, { ...state, cam: { headingDeg: 10, pitchDeg: -20, rangeM: 300 }, scenario: { id: 'jal123', t: 66280 } })
  assert.equal(back, '?scenario=jal123&t=66280&cam=10,-20,300') // the 3-D view again: no ?view
})

test('readScenario: an id of letters, digits, - and _; t a number of seconds, else null; no id, no scenario', () => {
  assert.deepEqual(readScenario('?scenario=jal123&t=65475'), { id: 'jal123', t: 65475, map: false })
  assert.deepEqual(readScenario('?scenario=demo'), { id: 'demo', t: null, map: false })
  assert.deepEqual(readScenario('?scenario=demo&t=abc'), { id: 'demo', t: null, map: false })
  assert.deepEqual(readScenario('?scenario=demo&t=-5'), { id: 'demo', t: null, map: false })
  assert.deepEqual(readScenario('?scenario=my_scn-2&t=12.5'), { id: 'my_scn-2', t: 12.5, map: false })
  for (const q of ['', '?t=5', '?scenario=', '?scenario=../x', '?scenario=a/b', '?scenario=%3Cb%3E']) assert.equal(readScenario(q), null, q)
})

test('readView: malformed or out-of-range values are null', () => {
  for (const q of ['?at=1,2', '?at=91,0,10', '?at=0,181,10', '?at=0,0,-1', '?at=a,b,c', '?at=,,']) assert.equal(readView(q).at, null, q)
  assert.deepEqual(readView('?at=12.9,77.6,-0.04').at, { lat: 12.9, lon: 77.6, heightKm: -0.04 }, 'a chase camera below the ellipsoid')
  assert.equal(readView('?cam=1,2').cam, null)
  assert.equal(readView('?cam=0,-10,0').cam, null)
  assert.deepEqual(readView('').cam, null)
})

test('a recording replay names its file in ?scenario=rec:…, and a reload reads it back; odd ids are refused', () => {
  const id = 'rec:2026-09-30/002932Z-ITY810-4cae1d'
  const url = writeUrl('', { at: null, hex: null, chase: false, cam: null, prefs: DEFAULT_PREFS, scenario: { id, t: 1771.4 } })
  assert.equal(readScenario(url)?.id, id)
  for (const bad of ['rec:../x', 'rec:2026-09-30/../../x', 'rec:', 'rec:2026-09-30/002932Z-ITY810-4cae1d.jsonl']) assert.equal(readScenario(`?scenario=${encodeURIComponent(bad)}`), null, bad)
})

test('a replay writes ?hist=<unix s> beside the view and the focus, and a reload reads it back as ms', () => {
  const s = { at: { lat: 32, lon: 34.8, heightKm: 120 }, hex: '4691c4', chase: false, cam: null, prefs: DEFAULT_PREFS, hist: 1_790_088_235_900 }
  const out = writeUrl('?tv=1', s)
  assert.equal(new URLSearchParams(out).get('hist'), '1790088235')
  assert.equal(new URLSearchParams(out).get('hex'), '4691c4')
  assert.equal(readHist(out), 1_790_088_235_000)
  assert.equal(new URLSearchParams(writeUrl(out, { ...s, hist: null })).get('hist'), null, 'live again: gone')
  for (const bad of ['?hist=', '?hist=abc', '?hist=-5', '?hist=12.5', '?hist=100']) assert.equal(readHist(bad), null, bad)
})

test('one flight\'s replay adds ?fl=<first s>,<last s>,<callsign>, whole seconds outward; read back; gone when live or unselected', () => {
  const flight = { callsign: 'WMT7403', fromMs: 1_791_601_897_400, toMs: 1_791_607_408_200 }
  const s = { at: { lat: 39.8, lon: 25.9, heightKm: 2220 }, hex: '471f67', chase: false, cam: null, prefs: DEFAULT_PREFS, hist: 1_791_601_944_000, flight }
  const out = writeUrl('', s)
  assert.equal(out, '?at=39.8000,25.9000,2220&hex=471f67&hist=1791601944&fl=1791601897,1791607409,WMT7403')
  assert.deepEqual(readFlight(out), { callsign: 'WMT7403', fromMs: 1_791_601_897_000, toMs: 1_791_607_409_000 })
  assert.equal(new URLSearchParams(writeUrl(out, { ...s, hist: null })).get('fl'), null, 'live again: gone')
  assert.equal(new URLSearchParams(writeUrl(out, { ...s, hex: null })).get('fl'), null, 'no aircraft: no flight')
  // Not a flight: no callsign, ends the wrong way round, longer than two days, before the archive, words.
  for (const bad of ['', '?fl=', '?fl=1791601897,1791607409', '?fl=1791607409,1791601897,WMT7403', '?fl=1791601897,1791801897,WMT7403', '?fl=100000000,100003600,WMT7403', '?fl=a,b,c', '?fl=1791601897,1791607409,wmt 7403']) {
    assert.equal(readFlight(bad), null, bad)
  }
})
