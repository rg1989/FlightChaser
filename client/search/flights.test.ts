// client/search/flights.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { FlightPlace, FlightSearchReply, PastFlight } from '../../shared/api.ts'
import { clockText, dayText, durationText, flightRecent, flightView, flownRow, liveRow, nextDays, similarRow, type FlightEnv, type FlightLookup } from './flights.ts'

// Local times: built with the Date constructor's own zone, so the texts hold in any zone the tests run in.
const at = (d: number, h: number, min = 0): number => new Date(2026, 9, d, h, min).getTime()
const NOW = at(11, 15, 30)
const env: FlightEnv = {
  nowMs: NOW,
  cityOf: (icao) => ({ LLBG: 'Tel Aviv', EGLL: 'London', LROP: 'Otopeni', LCLK: 'Larnaca' })[icao] ?? null,
  near: (lat) => (Math.abs(lat - 44.57) < 0.1 ? 'LROP' : Math.abs(lat - 32.0) < 0.1 ? 'LLBG' : Math.abs(lat - 34.88) < 0.1 ? 'LCLK' : null),
}
const OTP: FlightPlace = { icao: 'LROP', iata: 'OTP', name: 'Henri Coandă International Airport', city: 'Bucharest', lat: 44.57, lon: 26.09 }
const TLV: FlightPlace = { icao: 'LLBG', iata: 'TLV', name: 'Ben Gurion International Airport', city: 'Tel Aviv', lat: 32.01, lon: 34.89 }
const flown = (d: number, h: number, min: number, o: Partial<PastFlight> = {}): PastFlight => ({
  hex: '471f67', callsign: 'WMT7403', reg: 'HA-LXF', typeCode: 'A321',
  from: { tMs: at(d, h), lat: 44.57, lon: 26.08, alt: 'g' }, to: { tMs: at(d, h, min), lat: 32.0, lon: 34.89, alt: 'g' }, ...o,
})
const reply = (o: Partial<FlightSearchReply> = {}): FlightSearchReply => ({
  id: 'W43257', ticket: 'W4 3257', callsigns: ['WMT7403'], byRoute: false, airline: 'Wizz Air Malta', route: [OTP, TLV], known: true, live: [], past: [],
  scan: { state: 'idle', fromMs: null, oldestMs: at(1, 0), more: true }, similar: [], ...o,
})
const look = (o: Partial<FlightLookup> = {}): FlightLookup => ({ id: 'W43257', state: 'ok', reply: reply(), past: false, days: 14, deep: false, ...o })

test('dayText, clockText, durationText: a day, a time of day, a length', () => {
  assert.equal(dayText(at(10, 6, 11)), 'Sat 10 Oct')
  assert.equal(clockText(at(10, 6, 5)), '06:05')
  assert.equal(durationText(46 * 60_000), '46 min')
  assert.equal(durationText((2 * 60 + 6) * 60_000), '2 h 06 min')
})

test('flownRow: the day and the times; where it went, its callsign, aircraft and length; its replay with a title and both ends', () => {
  const r = flownRow(flown(10, 6, 146), env, 'W4 3257', [OTP, TLV])
  assert.equal(r.kind, 'flown')
  assert.equal(r.label, 'Sat 10 Oct · 06:00 – 08:26 · 2 h 26 min')
  assert.equal(r.sub, 'Bucharest → Tel Aviv · WMT7403 · A321 HA-LXF') // the route's word for its airport's city, not the places file's (Otopeni)
  assert.deepEqual(r.go, { to: 'past', hex: '471f67', callsign: 'WMT7403', fromMs: at(10, 6), toMs: at(10, 8, 26), title: 'W4 3257 · WMT7403', ends: [44.57, 26.08, 32, 34.89] })
  // Lost on its way, first heard after take-off, over midnight; looked up by its callsign.
  const lost = flownRow(flown(10, 23, 92, { from: { tMs: at(10, 23), lat: 40, lon: 28, alt: 12_000 }, to: { tMs: at(10, 24, 32), lat: 35.4, lon: 31.4, alt: 35_000 } }), env)
  assert.equal(lost.label, 'Sat 10 Oct · 23:00 – 00:32 (+1) · 1 h 32 min')
  assert.equal(lost.sub, 'first heard at 12,000 ft → last heard at 35,000 ft · WMT7403 · A321 HA-LXF')
  assert.equal(lost.go.to === 'past' && lost.go.title, 'WMT7403')
  // Low by an airport is that airport; low nowhere near one is said as heard.
  assert.match(flownRow(flown(10, 6, 30, { to: { tMs: at(10, 6, 30), lat: 32.06, lon: 34.8, alt: 1975 } }), env).sub, /^Otopeni → Tel Aviv/)
  // An airport that is not the route's (a diversion's): its city from the places file.
  assert.match(flownRow(flown(10, 6, 30, { from: { tMs: at(10, 6), lat: 34.89, lon: 33.64, alt: 1375 } }), env, null, [OTP, TLV]).sub, /^Larnaca → Tel Aviv/)
  assert.match(flownRow(flown(10, 6, 30, { to: { tMs: at(10, 6, 30), lat: 10, lon: 10, alt: 1975 } }), env).sub, /→ last heard at 2,000 ft/)
})

test('liveRow, similarRow: a flight in the air, a flight like the one typed', () => {
  const l = liveRow({ hex: '471f67', callsign: 'WMT7403', reg: 'HA-LXF', typeCode: 'A321', lat: 38, lon: 30, alt: 35_025, gsKt: 440, sinceMs: at(11, 14, 5) })
  assert.equal(l.label, 'WMT7403')
  assert.equal(l.sub, 'In the air now · 35,000 ft · since 14:05 · A321 · HA-LXF')
  assert.deepEqual(l.go, { to: 'live', hex: '471f67', lat: 38, lon: 30 })
  assert.equal(liveRow({ hex: '471f67', callsign: 'WMT7403', reg: null, typeCode: null, lat: 1, lon: 2, alt: 'g', gsKt: 3, sinceMs: null }).sub, 'On the ground')
  const s = similarRow({ id: 'ELY315', route: 'LLBG-EGLL', flying: true }, env)
  assert.equal(s.kind, 'similar')
  assert.equal(s.sub, 'Tel Aviv → London · in the air now')
  assert.deepEqual(s.go, { to: 'find', q: 'ELY315' })
  assert.equal(similarRow({ id: 'ELY31', route: 'LLBG-XXXX', flying: false }, env).sub, 'Tel Aviv → XXXX') // a code the places lack stays a code
})

test('flightView: nothing before the lookup; the heading with its route; not in the air; the search of the past as it goes', () => {
  assert.equal(flightView(null, env, 0), null)
  assert.equal(flightView(look({ state: 'wait', reply: null }), env, 0), null) // the typing has not paused yet
  assert.deepEqual(flightView(look({ state: 'loading', reply: null }), env, 0), { title: 'W43257', route: null, notes: ['Looking the flight up…'], busy: true, doing: null, rows: [] })
  const first = flightView(look(), env, 0)!
  assert.equal(first.title, 'W4 3257 · Wizz Air Malta')
  assert.equal(first.route, 'Bucharest OTP → Tel Aviv TLV')
  assert.deepEqual(first.notes, ['Callsign WMT7403.', 'Not in the air now.'])
  assert.deepEqual([first.busy, first.doing], [false, null])
  // Its past asked for and being read: a note says how far, the rows come as they are found.
  const running = flightView(look({ past: true, reply: reply({ past: [flown(11, 6, 146)], scan: { state: 'running', fromMs: at(9, 15), oldestMs: at(1, 0), more: true } }) }), env, 0)!
  assert.deepEqual(running.notes, ['Callsign WMT7403.', 'Not in the air now.', 'Searching the past days… back to Fri 9 Oct'])
  assert.deepEqual([running.busy, running.doing], [true, 'Searching the past days… back to Fri 9 Oct'])
  assert.deepEqual(running.rows.map((r) => r.kind), ['flown'])
  // Done: the flights, and a line to go further back while adsb.lol has more.
  const done = flightView(look({ past: true, reply: reply({ past: [flown(11, 6, 146), flown(10, 6, 146)], scan: { state: 'done', fromMs: at(11, 15) - 14 * 86_400_000, oldestMs: at(1, 0), more: true } }) }), env, 0)!
  assert.equal(done.busy, false)
  assert.deepEqual(done.rows.map((r) => r.kind), ['flown', 'flown', 'more'])
  assert.equal(done.rows[2].label, 'Search older days')
  assert.deepEqual(done.rows[2].go, { to: 'more', days: 28, deep: true })
  // Nothing found in what was read: said, with the line to read on.
  const none = flightView(look({ past: true, reply: reply({ scan: { state: 'done', fromMs: at(9, 15, 30), oldestMs: at(1, 0), more: true } }) }), env, 0)!
  assert.deepEqual(none.notes, ['Callsign WMT7403.', 'Not in the air now.', 'No flight heard in the last 2 days.'])
  assert.equal(none.rows[0].label, 'Search the last 7 days')
  assert.deepEqual(none.rows[0].go, { to: 'more', days: 7, deep: true })
  // Everything adsb.lol keeps is read: no more to ask for.
  const all = flightView(look({ past: true, reply: reply({ scan: { state: 'done', fromMs: at(1, 0), oldestMs: at(1, 0), more: false } }) }), env, 0)!
  assert.deepEqual(all.rows, [])
})

test('flightView: in the air now; flown under other callsigns; adsb.lol could not be read; the server did not answer', () => {
  const live = flightView(look({ reply: reply({ live: [{ hex: '471f67', callsign: 'WMT7403', reg: 'HA-LXF', typeCode: 'A321', lat: 38, lon: 30, alt: 35_000, gsKt: 440, sinceMs: null }] }) }), env, 0)!
  assert.deepEqual(live.rows.map((r) => r.kind), ['live'])
  assert.deepEqual(live.notes, ['Callsign WMT7403.'])
  // No live lookup on this server (a replay): nothing is said of the air now. A callsign typed: it is not said again.
  assert.deepEqual(flightView(look({ reply: reply({ live: null }) }), env, 0)!.notes, ['Callsign WMT7403.'])
  assert.deepEqual(flightView(look({ reply: reply({ live: null, ticket: null, id: 'WMT7403' }) }), env, 0)!.notes, [])
  assert.match(flightView(look({ reply: reply({ byRoute: true }) }), env, 0)!.notes[0], /^Wizz Air Malta flies this route under other callsigns/)
  const failed = flightView(look({ past: true, reply: reply({ scan: { state: 'failed', fromMs: at(9, 15), oldestMs: at(1, 0), more: true } }) }), env, 0)!
  assert.equal(failed.notes.at(-1), 'The past days could not be read from adsb.lol.')
  assert.equal(failed.rows.at(-1)?.label, 'Try again')
  const down = flightView(look({ state: 'error', reply: null }), env, 0)!
  assert.deepEqual(down.notes, ['The FlightHopper server did not answer.'])
  assert.equal(down.rows[0].label, 'Try again')
  // …or stopped answering while the past was searched: what it found stays, nothing spins, the search is offered again.
  const lost = flightView(look({ state: 'error', past: true, reply: reply({ past: [flown(10, 6, 92)], scan: { state: 'running', fromMs: at(9, 15), oldestMs: at(1, 0), more: true } }) }), env, 0)!
  assert.deepEqual([lost.notes.at(-1), lost.busy, lost.rows.map((r) => r.kind)], ['The FlightHopper server did not answer.', false, ['flown', 'more']])
})

test('flightView: nothing known under the id: the flights like it, marked; alone, a line to search anyway; among other rows, nothing', () => {
  const r = reply({ id: 'LY316', ticket: 'LY 316', airline: null, route: null, known: false, live: [], similar: [{ id: 'ELY315', route: 'LLBG-EGLL', flying: false }] })
  const v = flightView(look({ id: 'LY316', reply: r }), env, 3)!
  assert.equal(v.title, 'LY 316')
  assert.deepEqual(v.notes, ['No flight is known as LY316. These are close to it:'])
  assert.deepEqual(v.rows.map((x) => [x.kind, x.label]), [['similar', 'ELY315'], ['more', 'Search the past days anyway']])
  const alone = flightView(look({ id: 'LY316', reply: { ...r, similar: [] } }), env, 0)!
  assert.deepEqual(alone.notes, ['No flight is known as LY316.'])
  assert.deepEqual(alone.rows.map((x) => x.label), ['Search the past days anyway'])
  assert.equal(flightView(look({ id: 'LY316', reply: { ...r, similar: [] } }), env, 2), null) // other rows match: no line that says nothing
  // An id that reads as an aircraft type: only offered.
  const offer = flightView(look({ id: 'A320', state: 'offer', reply: null }), env, 5)!
  assert.deepEqual(offer.rows.map((x) => [x.label, x.go]), [['Look up flight A320', { to: 'find', q: 'A320' }]])
})

test('nextDays, flightRecent: how far back the next ask goes; a looked-up flight as a past pick', () => {
  assert.equal(nextDays(2), 7)
  assert.equal(nextDays(14), 28)
  assert.equal(nextDays(28), 42)
  assert.equal(nextDays(42), null)
  assert.deepEqual(flightRecent(reply()), { key: 'find:W43257', kind: 'flight', label: 'W4 3257', sub: 'Wizz Air Malta · Bucharest → Tel Aviv', iso2: null, go: { to: 'find', q: 'W43257' } })
})
