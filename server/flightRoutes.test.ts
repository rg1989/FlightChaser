// server/flightRoutes.test.ts
// adsbdb's flight answers and an airline's callsign list, read and kept: a fake fetch, no network.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADSBDB_FLIGHT_URL, FlightRoutes, STANDING_URL, parseFlightRoute, parseStanding } from './flightRoutes.ts'

// adsbdb's answer for W43257, as it came on 2026-10-11 (the airports cut to the fields read).
const W43257 = {
  response: {
    flightroute: {
      callsign: 'W43257', callsign_icao: 'WMT3257', callsign_iata: 'W43257',
      airline: { name: 'Wizz Air Malta', icao: 'WMT', iata: 'W4', country: 'Malta', country_iso: 'MT', callsign: 'Wizzairmalta' },
      origin: { country_iso_name: 'RO', country_name: 'Romania', elevation: 314, iata_code: 'OTP', icao_code: 'LROP', latitude: 44.5711111, longitude: 26.085, municipality: 'Bucharest', name: 'Henri Coandă International Airport' },
      destination: { country_iso_name: 'IL', country_name: 'Israel', elevation: 135, iata_code: 'TLV', icao_code: 'LLBG', latitude: 32.01139831542969, longitude: 34.88669967651367, municipality: 'Tel Aviv', name: 'Ben Gurion International Airport' },
    },
  },
}

test('parseFlightRoute: the callsign the number reads as, the airline, both airports; null for an unknown number or a broken answer', () => {
  assert.deepEqual(parseFlightRoute(W43257), {
    callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' },
    from: { icao: 'LROP', iata: 'OTP', name: 'Henri Coandă International Airport', city: 'Bucharest', lat: 44.5711111, lon: 26.085 },
    to: { icao: 'LLBG', iata: 'TLV', name: 'Ben Gurion International Airport', city: 'Tel Aviv', lat: 32.01139831542969, lon: 34.88669967651367 },
  })
  assert.equal(parseFlightRoute({ response: 'unknown callsign' }), null)
  assert.equal(parseFlightRoute(null), null)
  const r = W43257.response.flightroute
  assert.equal(parseFlightRoute({ response: { flightroute: { ...r, destination: { ...r.destination, latitude: 'x' } } } }), null)
  assert.equal(parseFlightRoute({ response: { flightroute: { ...r, callsign_icao: 'TOO LONG CALLSIGN' } } }), null)
  assert.deepEqual(parseFlightRoute({ response: { flightroute: { ...r, airline: null } } })?.airline, null)
})

test('parseStanding: callsign and route of each row, the header, a blank line and a broken row skipped', () => {
  const csv = '﻿Callsign,Code,Number,AirlineCode,AirportCodes\r\nWMT7403,WMT,7403,WMT,LROP-LLBG\r\nWMT0E,WMT,0E,WMT,LIPZ-LRIA-LROP\r\n\r\nbroken\r\nWMT1,WMT,1,WMT,\r\n'
  assert.deepEqual([...parseStanding(csv)], [['WMT7403', 'LROP-LLBG'], ['WMT0E', 'LIPZ-LRIA-LROP']])
})

function upstream(answers: Record<string, { status: number; body: string } | 'down'>): { fetchFn: typeof fetch; asked: string[] } {
  const asked: string[] = []
  const fetchFn = (async (input: RequestInfo | URL) => {
    const url = String(input)
    asked.push(url)
    const a = answers[url] ?? { status: 404, body: '{"response":"unknown callsign"}' }
    if (a === 'down') throw new Error('network')
    return new Response(a.body, { status: a.status })
  }) as typeof fetch
  return { fetchFn, asked }
}

test('route: asked once and kept, an unknown number too; a failure is not kept; nothing that is no id is asked', async () => {
  let now = 1_000_000
  const answers: Record<string, { status: number; body: string } | 'down'> = {
    [`${ADSBDB_FLIGHT_URL}W43257`]: { status: 200, body: JSON.stringify(W43257) },
    [`${ADSBDB_FLIGHT_URL}DOWN1`]: 'down',
    [`${ADSBDB_FLIGHT_URL}BAD1`]: { status: 200, body: '<html>' },
    [`${ADSBDB_FLIGHT_URL}BUSY1`]: { status: 429, body: '' },
  }
  const up = upstream(answers)
  const r = new FlightRoutes({ userAgent: 'test', fetchFn: up.fetchFn, nowMs: () => now })
  const callsign = async (id: string): Promise<string | null> => {
    const got = await r.route(id)
    return got === null || got === 'failed' ? null : got.callsign
  }
  assert.equal(await callsign('W43257'), 'WMT3257')
  assert.equal(await callsign('W43257'), 'WMT3257')
  assert.equal(up.asked.length, 1)
  assert.equal(await r.route('XX999'), null)
  assert.equal(await r.route('XX999'), null)
  assert.equal(up.asked.length, 2) // "unknown" is kept too
  for (const id of ['DOWN1', 'BAD1', 'BUSY1']) assert.equal(await r.route(id), 'failed', id)
  assert.equal(await r.route('DOWN1'), 'failed')
  assert.equal(up.asked.length, 6) // a failure is asked again
  assert.equal(await r.route('w4 3257'), null) // not an id: never sent
  assert.equal(up.asked.length, 6)
  now += 2 * 3_600_000 // an unknown number is asked again after an hour, a route after six
  await r.route('XX999')
  await r.route('W43257')
  assert.equal(up.asked.length, 7)
})

test('callsigns: an airline\'s list by its designator, kept a day; none for an airline the list lacks', async () => {
  const up = upstream({ [`${STANDING_URL}W/WMT-all.csv`]: { status: 200, body: 'Callsign,Code,Number,AirlineCode,AirportCodes\nWMT7403,WMT,7403,WMT,LROP-LLBG\n' } })
  const r = new FlightRoutes({ userAgent: 'test', fetchFn: up.fetchFn, nowMs: () => 0 })
  assert.equal((await r.callsigns('WMT'))?.get('WMT7403'), 'LROP-LLBG')
  await r.callsigns('WMT')
  assert.equal(up.asked.length, 1)
  assert.equal(await r.callsigns('ZZZ'), null)
  assert.equal(await r.callsigns('ZZZ'), null)
  assert.equal(up.asked.length, 2)
  assert.equal(await r.callsigns('W4'), null) // not a designator: never sent
  assert.equal(up.asked.length, 2)
})
