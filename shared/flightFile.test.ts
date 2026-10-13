// shared/flightFile.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FlightFileError, NO_HEX, parseFlightFile, toKml, withMeta } from './flightFile.ts'

const T0 = Date.UTC(2026, 8, 30, 3, 5, 0)
const iso = (s: number): string => new Date(T0 + s * 1000).toISOString()
const fails = (text: string, re: RegExp): void => void assert.throws(() => parseFlightFile(text), (e) => e instanceof FlightFileError && re.test(e.message))

test('Flightradar24 CSV: feet and knots, the quoted position, Altitude 0 on the ground, a speed of 0 in the air unknown', () => {
  const csv = [
    'Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction',
    `${T0 / 1000},${iso(0)},ELY315,"32.0100,34.8800",0,140,80`,
    `${T0 / 1000 + 10},${iso(10)},ELY315,"32.0120,34.8900",350,0,81`,
    `${T0 / 1000 + 20},${iso(20)},ELY315,"32.0140,34.9000",900,165,82`,
    '',
  ].join('\r\n')
  const { format, flights } = parseFlightFile(csv)
  assert.equal(format, 'Flightradar24 CSV')
  const [{ meta, samples: s }] = flights
  assert.equal(meta.callsign, 'ELY315')
  assert.equal(meta.hex, null)
  assert.deepEqual(s.map((x) => [x.tMs - T0, x.onGround, x.altBaroFt, x.gsKt, x.trackDeg]), [[0, true, null, 140, 80], [10_000, false, 350, null, 81], [20_000, false, 900, 165, 82]])
  assert.equal(s[0].hex, NO_HEX)
  assert.equal(s[0].callsign, 'ELY315')
  assert.ok(Math.abs(s[0].nM - 17) < 4, 'the geoid at Tel Aviv') // EGM96 there is about +17 m
})

test('KML: a gx:Track with its times and places interleaved or grouped; tar1090 names the aircraft; sections join', () => {
  const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Folder><Folder><name>4X-EHA track</name>
    <Placemark><name>4X-EHA</name><gx:Track><extrude>0</extrude>
      <when>${iso(0)}</when><when>${iso(5)}</when><gx:coord>34.88 32.01 0</gx:coord><gx:coord>34.89 32.012 0</gx:coord></gx:Track></Placemark>
    <Placemark><name>4X-EHA</name><gx:Track><altitudeMode>absolute</altitudeMode>
      <when>${iso(5)}</when><gx:coord>34.89 32.012 0</gx:coord>
      <when>${iso(10)}</when><gx:coord>34.90 32.014 304.8</gx:coord></gx:Track></Placemark></Folder></Folder></kml>`
  const { format, flights } = parseFlightFile(kml)
  assert.equal(format, 'KML')
  assert.equal(flights.length, 1)
  const [{ meta, samples: s }] = flights
  assert.equal(meta.reg, '4X-EHA')
  assert.equal(meta.name, '4X-EHA track')
  assert.deepEqual(s.map((x) => [x.tMs - T0, x.lat, x.lon, x.onGround, x.altBaroFt === null ? null : Math.round(x.altBaroFt)]), [[0, 32.01, 34.88, true, null], [5000, 32.012, 34.89, true, null], [10_000, 32.014, 34.9, false, 1000]])
})

test('KML: placemarks that each hold a time and a point; the names give the callsign and the route', () => {
  const pm = (s: number, c: string): string => `<Placemark><TimeStamp><when>${iso(s)}</when></TimeStamp><Point><altitudeMode>absolute</altitudeMode><coordinates>${c}</coordinates></Point></Placemark>`
  const kml = `<kml><Document><name>FlightAware &amp; co ELY315 30-Sep-2026 (LLBG-EGLL)</name><Placemark><name>LLBG Airport</name><Point><coordinates>34.88,32.01,0</coordinates></Point></Placemark>${pm(0, '34.88,32.01,300')}${pm(8, '34.9,32.02,600')}</Document></kml>`
  const [{ meta, samples }] = parseFlightFile(kml).flights
  assert.equal(meta.callsign, 'ELY315')
  assert.equal(meta.route, 'LLBG-EGLL')
  assert.equal(meta.name, 'FlightAware & co ELY315 30-Sep-2026 (LLBG-EGLL)')
  assert.equal(samples.length, 2, 'the airport placemark has no time: not a point of the flight')
})

test('GPX: track points with a height and a time; speed in m/s becomes knots', () => {
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Evening flight</name><trkseg>
    <trkpt lon="34.88" lat="32.01"><ele>120</ele><time>${iso(0)}</time><speed>51.4444</speed><course>90</course></trkpt>
    <trkpt lat="32.02" lon="34.90"><ele>300</ele><time>${iso(30)}</time></trkpt></trkseg></trk></gpx>`
  const { format, flights } = parseFlightFile(gpx)
  assert.equal(format, 'GPX')
  const [{ meta, samples: s }] = flights
  assert.equal(meta.name, 'Evening flight')
  assert.equal(meta.callsign, null)
  assert.deepEqual([s[0].lat, s[0].lon, Math.round(s[0].altBaroFt!), Math.round(s[0].gsKt!), s[0].trackDeg, s[1].gsKt], [32.01, 34.88, 394, 100, 90, null])
})

test('ADS-B trace: a flight per leg, the ground flag, geometric heights and rates by their flags, what the aircraft sent', () => {
  const ac = { flight: 'FDB1073 ', true_heading: 31, nav_qnh: 1012.8, category: 'A3', version: 2, nic: 8 }
  const trace = {
    icao: '8965D1', r: 'A6-FKF', t: 'B38M', timestamp: T0 / 1000,
    trace: [
      [0, 25.26, 55.35, 'ground', 12, 30.9, 0, null, ac, 'adsb_icao', null, null, null, null],
      [10, 25.27, 55.36, 1200, 160, 31, 0, 2100, null, 'adsb_icao', 1500, 2200, 170, -3.5],
      [20, 25.28, 55.37, 2400, 180, 31, 12, 1800, null, 'mlat', null, null, null, null],
      [5000, 25.26, 55.35, 'ground', 0, 30.9, 2, null, { flight: 'FDB7AQ  ' }, 'adsb_icao', null, null, null, null],
      [5010, 25.26, 55.35, 'ground', 5, 30.9, 0, null, null, 'adsb_icao', null, null, null, null],
      [9000, 25.26, 55.35, 'ground', 0, 30.9, 2, null, null, 'adsb_icao', null, null, null, null],
    ],
  }
  const { format, flights } = parseFlightFile(JSON.stringify(trace))
  assert.equal(format, 'ADS-B trace')
  assert.equal(flights.length, 2, 'the third leg is one point: no flight')
  const [a, b] = flights
  assert.deepEqual(a.meta, { hex: '8965d1', callsign: 'FDB1073', reg: 'A6-FKF', typeCode: 'B38M', category: 'A3', operator: null, name: null, route: null })
  assert.equal(b.meta.callsign, 'FDB7AQ')
  const [g, air, geo] = a.samples
  assert.deepEqual([g.onGround, g.altBaroFt, g.trueHeadingDeg, g.navQnhHpa, g.quality], [true, null, 31, 1012.8, 'adsb2'])
  assert.deepEqual([air.altBaroFt, air.altGeomFt, air.baroRateFpm, air.geomRateFpm, air.iasKt, air.rollDeg, air.gsKt], [1200, 1500, 2100, 2200, 170, -3.5, 160])
  assert.deepEqual([geo.altBaroFt, geo.altGeomFt, geo.baroRateFpm, geo.geomRateFpm, geo.quality], [null, 2400, null, 1800, 'mlat'])
})

test('OpenSky track: metres become feet, the callsign is trimmed', () => {
  const o = { icao24: '8965d1', callsign: 'FDB1073 ', startTime: T0 / 1000, endTime: T0 / 1000 + 5, path: [[T0 / 1000, 25.27, 55.33, 0, 301, false], [T0 / 1000 + 5, 25.28, 55.32, 304.8, 302, false]] }
  const { format, flights } = parseFlightFile(JSON.stringify(o))
  assert.equal(format, 'OpenSky track')
  assert.equal(flights[0].meta.callsign, 'FDB1073')
  assert.deepEqual(flights[0].samples.map((s) => [s.onGround, Math.round(s.altBaroFt!), s.trackDeg]), [[false, 0, 301], [false, 1000, 302]])
})

test("the app's own recording: its header, its last name and route, its samples in order of time", () => {
  const s = (t: number, o = {}): string => JSON.stringify({ s: { hex: '4cae1d', tMs: T0 + t, rxMs: T0 + t + 300, lat: 32, lon: 34.9, onGround: false, altBaroFt: 8000, altGeomFt: 8400, gsKt: 300, rollDeg: 2, iasKt: 250, quality: 'adsb2', junk: 'x', ...o } })
  const text = [
    JSON.stringify({ flight: { v: 1, hex: '4cae1d', callsign: 'ITY810', reg: 'EI-HXG', typeCode: 'A21N', category: 'A3', route: null, source: 'adsbfi', by: 'hand', startedMs: T0 } }),
    s(4000), s(0), s(4000), '{"s":{"hex":"4cae1d","tMs":', JSON.stringify({ route: 'LIRF-LLBG' }), JSON.stringify({ name: 'Old' }), JSON.stringify({ name: 'Go-around' }),
    JSON.stringify({ end: { why: 'landed', endedMs: T0 + 9000, samples: 3 } }),
  ].join('\n')
  const { format, flights } = parseFlightFile(text)
  assert.equal(format, 'Flight Chaser')
  const [{ meta, samples }] = flights
  assert.deepEqual(meta, { hex: '4cae1d', callsign: 'ITY810', reg: 'EI-HXG', typeCode: 'A21N', category: 'A3', operator: null, name: 'Go-around', route: 'LIRF-LLBG' })
  assert.deepEqual(samples.map((x) => x.tMs - T0), [0, 4000])
  assert.deepEqual([samples[0].altGeomFt, samples[0].rollDeg, samples[0].iasKt, samples[0].typeCode], [8400, 2, 250, 'A21N'])
  assert.ok(!('junk' in samples[0]), 'only the fields of a sample are kept')
})

test('withMeta: what is said by hand goes into the flight and each of its samples; what a field cannot hold is dropped', () => {
  const [f] = parseFlightFile(`Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction\n${T0 / 1000},,,"32,34.9",500,150,80\n${T0 / 1000 + 9},,,"32.01,34.91",900,160,80\n`).flights
  assert.equal(f.meta.callsign, null)
  const g = withMeta(f, { callsign: 'ELY315', reg: '4X-EHA', typeCode: 'B789', operator: 'ELY', name: '  Home\u0007  ' })
  assert.deepEqual([g.meta.callsign, g.meta.reg, g.meta.typeCode, g.meta.operator, g.meta.name], ['ELY315', '4X-EHA', 'B789', 'ELY', 'Home'])
  assert.deepEqual([g.samples[1].callsign, g.samples[1].reg, g.samples[1].typeCode, g.samples[1].altBaroFt], ['ELY315', '4X-EHA', 'B789', 900])
  assert.equal(withMeta(g, { typeCode: 'a boeing', callsign: null }).meta.typeCode, null)
  assert.equal(withMeta(g, { callsign: null }).samples[0].callsign, null)
})

test('toKml: read back, the flight is the same; a point in the air without a height is left out', () => {
  const [f] = parseFlightFile(JSON.stringify({ icao: '738abc', timestamp: T0 / 1000, trace: [
    [0, 32.01, 34.88, 'ground', 20, 80, 0, null, null, 'adsb_icao', null, null, null, null],
    [10, 32.012, 34.89, 1000, 150, 80, 0, null, null, 'adsb_icao', null, null, null, null],
    [15, 32.013, 34.895, null, 150, 80, 0, null, null, 'adsb_icao', null, null, null, null],
    [20, 32.014, 34.9, 2000, 170, 80, 0, null, null, 'adsb_icao', 2100, null, null, null],
    [30, 32.016, 34.91, 'ground', 90, 80, 0, null, null, 'adsb_icao', null, null, null, null],
  ] })).flights
  const kml = toKml('ELY315 <test>', '4X-EHA & B738', f.samples)
  assert.match(kml, /<name>ELY315 &lt;test&gt;<\/name>/)
  assert.equal(kml.match(/<gx:Track>/g)?.length, 3, 'ground, air, ground')
  const [back] = parseFlightFile(kml).flights
  assert.equal(back.meta.callsign, 'ELY315')
  assert.deepEqual(back.samples.map((s) => [s.tMs - T0, s.lat, s.lon, s.onGround]), [[0, 32.01, 34.88, true], [10_000, 32.012, 34.89, false], [20_000, 32.014, 34.9, false], [30_000, 32.016, 34.91, true]])
  assert.ok(Math.abs(back.samples[1].altBaroFt! - 1000) < 2)
  // A geometric height is above the ellipsoid; the KML's is above mean sea level: lower by the geoid (about 17 m here).
  assert.ok(Math.abs(back.samples[2].altBaroFt! - (2100 - f.samples[3].nM / 0.3048)) < 2)
})

test('what cannot be read says why', () => {
  fails('hello', /Not a flight file/)
  fails('<html><body>x</body></html>', /Not a flight file/)
  fails('{"a":1}', /Not a flight file/)
  fails('a,b\n1,2\n', /Timestamp or UTC, Position, and Altitude/)
  fails('<kml><Placemark><LineString><coordinates>34.8,32,100 34.9,32.1,200</coordinates></LineString></Placemark></kml>', /without times/)
  fails('<kml><Document/></kml>', /no track/)
  fails(`<gpx><trk><trkseg><trkpt lat="32" lon="34.9"><ele>100</ele></trkpt></trkseg></trk></gpx>`, /without times/)
  fails(`<kml><gx:Track><when>${iso(0)}</when><gx:coord>34.88 32.01</gx:coord><when>${iso(9)}</when><gx:coord>34.9 32.02</gx:coord></gx:Track></kml>`, /no heights/)
  fails(`Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction\n${T0 / 1000},,X,"32,34.9",500,150,80\n`, /holds no flight/)
  fails(`Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction\n${T0 / 1000},,X,"32,34.9",500,150,80\n${T0 / 1000 + 5},,X,"132,34.9",500,150,80\n`, /holds no flight/)
})

test('a flight is cut where the aircraft landed and left unseen: far apart in time, close in place, both in the air', () => {
  const row = (s: number, lon: number, gs = 400): string => `${T0 / 1000 + s},,ELY1,"32,${lon}",30000,${gs},90`
  const head = 'Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction'
  // 3 h between points 50 nm apart: no flight at 17 kt. Then 3 h between points 1,200 nm apart: a hole over an ocean.
  const stop = parseFlightFile([head, row(0, 30), row(60, 30.13), row(60 + 10_800, 31.1), row(120 + 10_800, 31.23)].join('\n'))
  assert.deepEqual(stop.flights.map((f) => f.samples.length), [2, 2])
  const ocean = parseFlightFile([head, row(0, 30), row(60, 30.13), row(60 + 10_800, 53.7), row(120 + 10_800, 53.83)].join('\n'))
  assert.deepEqual(ocean.flights.map((f) => f.samples.length), [4])
})
