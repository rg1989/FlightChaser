// server/flightSearch.test.ts
// The flight search on made-up skies: what an id is, whether it flies now, and the reading of the past, with every source faked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { FlightPlace, FlightSearchReply, TraceDay, TraceReply } from '../shared/api.ts'
import { SLOT_MS, newestSlotMs } from '../shared/history.ts'
import { ALIVE_MS, FlightSearch, UNANCHORED_DAYS, alongRoute, anchorOf, evenSlots, onRoute, sameTimeIn, spanUnder, stepFor, type FlightSearchDeps } from './flightSearch.ts'
import type { FlightRoute } from './flightRoutes.ts'
import { CallIndex } from './heatmap.ts'

const DAY = 24 * 3_600_000
const H = 3_600_000
const NOW = Date.UTC(2026, 9, 11, 12, 10)
const TODAY = Date.UTC(2026, 9, 11)
const OLDEST = Date.UTC(2026, 8, 1)

const place = (icao: string, lat: number, lon: number): FlightPlace => ({ icao, iata: icao.slice(1), name: icao, city: icao, lat, lon })
const DXB = place('OMDB', 25.25, 55.36)
const TLV = place('LLBG', 32.01, 34.89)
const OTP = place('LROP', 44.57, 26.09)

/** A flight in a made-up sky: hex flew callsign from t0 for durMin minutes (10 on the ground first, 5 after), from one place to another (Dubai to Tel Aviv unless said). */
interface Flown { hex: string; callsign: string; t0: number; durMin: number; way?: [FlightPlace, FlightPlace] }

/** Its trace leg: a point a minute, on the ground at both ends, straight from the one place to the other. */
function legOf(f: Flown, calls?: [number, string][]): TraceReply {
  const n = f.durMin + 1
  const t = Array.from({ length: n }, (_, i) => i * 60)
  const [a, b] = f.way ?? [DXB, TLV]
  return {
    hex: f.hex, callsign: f.callsign, calls: calls ?? [[0, f.callsign]], reg: 'A6-FEA', typeCode: 'B38M', t0Ms: f.t0,
    t, lat: t.map((_, i) => a.lat + ((b.lat - a.lat) * i) / (n - 1)), lon: t.map((_, i) => a.lon + ((b.lon - a.lon) * i) / (n - 1)),
    alt: t.map((_, i) => (i < 10 || i > n - 6 ? 'g' : 35000)), gs: t.map(() => 400), trk: t.map(() => 300), vs: t.map(() => 0), roll: t.map(() => 0), nM: t.map(() => 0),
  }
}

interface Sky {
  flown: Flown[]
  routes?: Record<string, FlightRoute | null | 'failed'>
  lists?: Record<string, Record<string, string> | 'failed'>
  iata?: Record<string, string>
  live?: (callsigns: readonly string[]) => { hex: string; callsign: string; lat?: number; lon?: number }[] | null
  down?: Set<number> // half hours that cannot be read
  board?: { arrival: boolean; times: number[] } | null // Ben Gurion's board for the ticket number (undefined: this sky has no board)
  legs?: (hex: string) => TraceReply[] | undefined // a trace other than one leg a flight
  cut?: boolean // a leg is given only as far as the span asked for holds it, as adsb.lol's day files give it
}

/** A leg's part inside [fromMs, toMs], or null when none of it is. */
function clip(l: TraceReply, fromMs: number, toMs: number): TraceReply | null {
  const keep = l.t.map((t, i) => (l.t0Ms + t * 1000 >= fromMs && l.t0Ms + t * 1000 <= toMs ? i : -1)).filter((i) => i >= 0)
  if (keep.length === 0) return null
  const t0 = l.t[keep[0]]
  const pick = <T,>(a: T[]): T[] => keep.map((i) => a[i])
  return { ...l, t0Ms: l.t0Ms + t0 * 1000, t: pick(l.t).map((t) => t - t0), lat: pick(l.lat), lon: pick(l.lon), alt: pick(l.alt), gs: pick(l.gs), trk: pick(l.trk), vs: pick(l.vs), roll: pick(l.roll), nM: pick(l.nM) }
}

function world(sky: Sky): { deps: FlightSearchDeps; read: number[]; days: string[]; clock: { now: number } } {
  const read: number[] = []
  const days: string[] = []
  const clock = { now: NOW }
  const deps: FlightSearchDeps = {
    nowMs: () => clock.now,
    route: async (id) => sky.routes?.[id] ?? null,
    airlineCallsigns: async (icao) => {
      const list = sky.lists?.[icao]
      return list === undefined ? null : list === 'failed' ? 'failed' : new Map(Object.entries(list))
    },
    icaoOf: (iata) => sky.iata?.[iata] ?? null,
    live: async (callsigns) => {
      const l = sky.live?.(callsigns)
      // (over Turkey: along the way from Bucharest to Tel Aviv)
      return l === undefined || l === null ? null : l.map((x) => ({ reg: null, typeCode: null, lat: 38, lon: 30.5, alt: 36000, gsKt: 450, ...x }))
    },
    calls: async (slotMs) => {
      read.push(slotMs)
      if (sky.down?.has(slotMs)) return 'unavailable'
      if (slotMs < OLDEST) return 'missing'
      if (slotMs > newestSlotMs(clock.now)) return 'unavailable'
      // In the air as the half hour begins: from its first point to its last.
      const there = sky.flown.filter((f) => f.t0 <= slotMs + 80_000 && f.t0 + f.durMin * 60_000 >= slotMs)
      return new CallIndex(8, `\n${there.map((f) => `${f.callsign}\t${f.hex}`).join('\n')}\n`)
    },
    day: async (hex, fromMs, toMs) => {
      days.push(`${hex}@${new Date(fromMs).toISOString().slice(0, 10)}`)
      const legs = sky.legs?.(hex) ?? sky.flown.filter((f) => f.hex === hex).map((f) => legOf(f))
      const whole = legs.filter((l) => l.t0Ms <= toMs && l.t0Ms + l.t.at(-1)! * 1000 >= fromMs).sort((a, b) => a.t0Ms - b.t0Ms)
      const got = sky.cut ? whole.flatMap((l) => clip(l, fromMs, toMs) ?? []) : whole
      return { hex, reg: 'A6-FEA', typeCode: 'B38M', fromMs, toMs, legs: got } satisfies TraceDay
    },
    oldestSlotMs: () => OLDEST,
    sleep: async () => {},
    ...(sky.board === undefined ? {} : { board: async () => sky.board ?? null }),
  }
  return { deps, read, days, clock }
}

/** One ask that must be answered: the id reads as a flight, and what it is could be found out. */
async function ask(s: FlightSearch, text: string, o: { scan?: boolean; days?: number; deep?: boolean } = {}): Promise<FlightSearchReply> {
  const r = await s.ask(text, o)
  assert.ok(r !== null && r !== 'failed', `no answer for ${text}`)
  return r
}

/** Asks until the reading of the past rests (done, failed or paused), as the page does once a second. */
async function settle(s: FlightSearch, text: string, o: { days?: number; deep?: boolean } = {}): Promise<FlightSearchReply> {
  for (let i = 0; i < 500; i++) {
    const r = await ask(s, text, { scan: true, ...o })
    if (r.scan.state !== 'running') return r
    await new Promise((go) => setImmediate(go))
  }
  throw new Error('the search never rested')
}

/** A flight every day at the same time for `n` days back from today, each day another aircraft. */
const daily = (callsign: string, hourUtc: number, durMin: number, n: number, way?: [FlightPlace, FlightPlace]): Flown[] =>
  Array.from({ length: n }, (_, d) => ({ hex: (0x896000 + d + Math.round(hourUtc * 100)).toString(16), callsign, t0: TODAY - d * DAY + hourUtc * H, durMin, way }))

test('evenSlots, sameTimeIn, stepFor, anchorOf: the half hours a pass reads', () => {
  const to = Date.UTC(2026, 9, 11, 12, 0)
  assert.deepEqual(evenSlots(to - 2 * H, to, 2), [to - SLOT_MS, to - 3 * SLOT_MS])
  assert.equal(evenSlots(to - DAY, to, 2).length, 24)
  assert.equal(evenSlots(to - DAY, to, 1).length, 48)
  const anchor = Date.UTC(2026, 9, 11, 4, 30)
  assert.equal(sameTimeIn(anchor, to - 2 * DAY, to - DAY), Date.UTC(2026, 9, 10, 4, 30))
  assert.equal(sameTimeIn(anchor, to - DAY, to), anchor)
  assert.equal(sameTimeIn(Date.UTC(2026, 9, 11, 18, 0), to - DAY, to), Date.UTC(2026, 9, 10, 18, 0)) // later in the day than the window's end: the day before
  assert.equal(sameTimeIn(anchor, to - DAY - 4 * H, to - DAY), null) // a window short of that time of day
  assert.equal(stepFor(null), 2)
  assert.equal(stepFor([DXB, TLV]), 3) // 1,150 nm: over three hours with the callsign set
  assert.equal(stepFor([OTP, place('LBSF', 42.7, 23.4)]), 1) // a short hop: every half hour
  assert.equal(stepFor([DXB, place('KJFK', 40.64, -73.78)]), 4) // never more than two hours apart
  const f = { hex: 'a', callsign: 'X1', reg: null, typeCode: null, from: { tMs: Date.UTC(2026, 9, 11, 3, 5), lat: 0, lon: 0, alt: 'g' as const }, to: { tMs: Date.UTC(2026, 9, 11, 6, 40), lat: 0, lon: 0, alt: 'g' as const } }
  assert.equal(anchorOf(f, 0), Date.UTC(2026, 9, 11, 5, 0)) // the half hour nearest its middle
  const short = { ...f, to: { ...f.to, tMs: Date.UTC(2026, 9, 11, 3, 20) } }
  assert.equal(anchorOf(short, 123), 123) // no half hour starts inside it: where it was found
})

test('spanUnder: a leg cut to its part under the callsign, and to its time in the air with the taxi before and after', () => {
  // Three hours in one leg: at the gate 50 min, in the air 60, at the gate 70 with the callsign still set.
  const t = Array.from({ length: 181 }, (_, i) => i * 60)
  const leg: TraceReply = {
    hex: 'a', callsign: 'AB1', calls: [[0, 'AB1']], reg: null, typeCode: null, t0Ms: 1_000_000,
    t, lat: t.map(() => 0), lon: t.map(() => 0), alt: t.map((_, i) => (i >= 50 && i <= 110 ? 30000 : 'g')), gs: [], trk: [], vs: [], roll: [], nM: [],
  }
  assert.deepEqual(spanUnder(leg, 'AB1', 1_000_000 + 80 * 60_000), [20, 120]) // 30 min before take-off, 10 after landing
  assert.equal(spanUnder(leg, 'ZZ9', 1_000_000 + 80 * 60_000), null)
  // A turnround in one leg: the arrival under AB1, the departure under AB2 from minute 130.
  const turn = { ...leg, calls: [[0, 'AB1'], [130 * 60, 'AB2']] as [number, string][], alt: t.map((_, i) => ((i >= 50 && i <= 110) || i >= 150 ? 30000 : 'g')) }
  assert.deepEqual(spanUnder(turn, 'AB1', 1_000_000 + 80 * 60_000), [20, 120])
  assert.deepEqual(spanUnder(turn, 'AB2', 1_000_000 + 160 * 60_000), [130, 180]) // from where it began to send it
  assert.equal(spanUnder(turn, 'AB2', 1_000_000 + 60 * 60_000), null) // not what it sent then
  // No callsign in the trace: the whole leg, cut to the flight.
  assert.deepEqual(spanUnder({ ...leg, calls: [] }, 'AB1', 1_000_000), [20, 120])
  // Never off the ground: all of it.
  assert.deepEqual(spanUnder({ ...leg, alt: t.map(() => 'g' as const) }, 'AB1', 1_000_000), [0, 180])
})

test('a ticket number its airline flies under: the route, the one callsign, every day it flew, read at one half hour a day', async () => {
  const w = world({
    flown: daily('FDB1073', 3, 210, 14),
    routes: { FZ1073: { callsign: 'FDB1073', airline: { name: 'Fly Dubai', icao: 'FDB' }, from: DXB, to: TLV } },
    lists: { FDB: { FDB1073: 'OMDB-LLBG', FDB1081: 'OMDB-LLBG' } },
  })
  const s = new FlightSearch(w.deps)
  const first = await ask(s, 'fz 1073')
  assert.equal(first.id, 'FZ1073')
  assert.equal(first.ticket, 'FZ 1073')
  assert.equal(first.airline, 'Fly Dubai')
  assert.deepEqual(first.route, [DXB, TLV])
  assert.deepEqual(first.callsigns, ['FDB1073']) // its own callsign is in the airline's list: the route's others are other flights
  assert.equal(first.byRoute, false)
  assert.equal(first.known, true)
  assert.deepEqual(first.live, null) // this sky cannot be asked who flies now
  assert.deepEqual(first.scan, { state: 'idle', fromMs: null, oldestMs: OLDEST, more: true })
  assert.equal(w.read.length, 0) // nothing of the past is read until it is asked for

  const r = await settle(s, 'FZ1073')
  assert.equal(r.scan.state, 'done')
  assert.equal(r.past.length, 14)
  assert.deepEqual(r.past.map((f) => f.from.tMs), daily('FDB1073', 3, 210, 14).map((f) => f.t0)) // newest first, from the gate
  assert.equal(r.past[0].callsign, 'FDB1073')
  assert.equal(r.past[0].reg, 'A6-FEA')
  assert.equal(r.past[0].to.tMs, TODAY + 3 * H + 210 * 60_000)
  assert.equal(r.scan.fromMs, newestSlotMs(NOW) + SLOT_MS - 14 * DAY)
  // The newest day at even steps (16 half hours, 90 min apart), then one half hour for each of the 13 days before.
  // (a day's half hour is asked for ahead of its turn too: counted once, as the store downloads it once)
  const slots = (): number => new Set(w.read).size
  assert.equal(slots(), 16 + 13)
  assert.ok(Math.min(...w.read) >= r.scan.fromMs!, 'nothing older than asked for is read')
  assert.equal(new Set(w.days).size, 14) // one trace a flight
  // Asked again: what it has, at no cost.
  const again = await ask(s, 'FZ1073', { scan: true })
  assert.equal(again.past.length, 14)
  assert.equal(slots(), 29)
  // Further back when asked.
  const more = await settle(s, 'FZ1073', { days: 16 })
  assert.equal(more.past.length, 14)
  assert.equal(slots(), 29 + 2 * 7) // two days with no flight: each tried at seven half hours
})

test('a day it did not fly, and a time that moves: the half hours round its time are tried, and the next day follows where it was found', async () => {
  // Days 0-4 at 03:00, day 5 none, days 6-9 an hour and a half later.
  const flown = [...daily('FDB1073', 3, 210, 5), ...daily('FDB1073', 4.5, 210, 10).slice(6)]
  const w = world({ flown, routes: { FZ1073: { callsign: 'FDB1073', airline: { name: 'Fly Dubai', icao: 'FDB' }, from: DXB, to: TLV } }, lists: { FDB: { FDB1073: 'OMDB-LLBG' } } })
  const r = await settle(new FlightSearch(w.deps), 'FZ1073', { days: 10 })
  assert.equal(r.past.length, 9)
  assert.deepEqual(r.past.map((f) => f.from.tMs).sort(), flown.map((f) => f.t0).sort())
})

test('alongRoute, onRoute: a flight of a route has both its ends along it and goes its way', () => {
  const route: [FlightPlace, FlightPlace] = [OTP, TLV]
  const end = (lat: number, lon: number) => ({ tMs: 0, lat, lon, alt: 'g' as const })
  assert.equal(alongRoute({ lat: 38, lon: 30.5 }, route), true) // over Turkey, on the way
  assert.equal(alongRoute({ lat: 52.45, lon: -1.75 }, route), false) // Birmingham
  assert.equal(onRoute({ from: end(44.57, 26.09), to: end(35.42, 31.43) }, route), true) // lost south of Turkey: still the route's
  assert.equal(onRoute({ from: end(52.45, -1.75), to: end(44.3, 23.9) }, route), false) // Birmingham to Craiova: one end is along it, the other is not
  assert.equal(onRoute({ from: end(32.01, 34.89), to: end(44.57, 26.09) }, route), false) // the way back
  assert.equal(onRoute({ from: end(40, 29), to: end(36, 31) }, route), true) // heard only in the middle
  assert.equal(onRoute({ from: end(34.88, 33.63), to: end(32.0, 34.89) }, route), true) // from Larnaca: the leg that flew on after a diversion
  assert.equal(onRoute({ from: end(44.57, 26.09), to: end(41.0, 16.8) }, route), true) // it left Bucharest and went elsewhere: its departure all the same
  assert.equal(onRoute({ from: end(41.0, 16.8), to: end(37.9, 23.9) }, route), false) // neither end is the route's, and it is nowhere along it
})

test('a flight not heard to its route\'s end: the hours after it are read for what flew on under its callsign, at any time of day', async () => {
  const way: [FlightPlace, FlightPlace] = [OTP, TLV]
  const LCA = place('LCLK', 34.88, 33.63)
  const lost = place('SEA', 35.4, 31.4) // where it was last heard, south of Turkey
  const sky: Sky = {
    flown: [
      ...daily('WMT3257', 3, 150, 5, way).filter((f) => f.t0 !== TODAY - 3 * DAY + 3 * H),
      { hex: '471aaa', callsign: 'WMT3257', t0: TODAY - 3 * DAY + 3 * H, durMin: 95, way: [OTP, lost] }, // three days ago: lost on its way (it landed at Larnaca)
      { hex: '471bbb', callsign: 'WMT3257', t0: TODAY - 3 * DAY + 12.4 * H, durMin: 50, way: [LCA, TLV] }, // …and flown on that afternoon, on another aircraft
    ],
    routes: { W43257: { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV } },
    lists: { WMT: { WMT3257: 'LROP-LLBG' } },
  }
  const w = world(sky)
  const r = await settle(new FlightSearch(w.deps), 'W43257', { days: 5 })
  assert.equal(r.past.length, 6)
  assert.deepEqual(r.past.filter((f) => f.from.tMs > TODAY - 3 * DAY && f.from.tMs < TODAY - 2 * DAY).map((f) => f.hex), ['471bbb', '471aaa'])
  // The afternoon leg gave the days before no time of day: each is still read at the morning's half hour alone.
  // The newest day; a half hour a day before it; the 12 h after the lost flight (every hour); and one more: the day after it
  // was asked for ahead at the usual half hour, and then read at the lost flight's (its middle came earlier).
  assert.equal(new Set(w.read).size, 24 + 4 + 12 + 1)
})

test('a ticket number flown under other callsigns: its airline\'s callsigns on the route join when the newest day has none under its own', async () => {
  const way: [FlightPlace, FlightPlace] = [OTP, TLV]
  const sky: Sky = {
    flown: [...daily('WMT7403', 3, 150, 3, way), ...daily('WMT4470', 12.5, 150, 3, way).slice(1)],
    routes: { W43257: { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV } },
    lists: { WMT: { WMT7403: 'LROP-LLBG', WMT4470: 'LROP-LLBG', WMT0AN: 'EDJA-LROP' } },
  }
  const w = world(sky)
  const s = new FlightSearch(w.deps)
  const first = await ask(s, 'W43257')
  assert.deepEqual(first.callsigns, ['WMT3257']) // its own first: most airlines fly under their ticket numbers
  assert.equal(first.byRoute, false)
  assert.equal(first.known, true)
  const r = await settle(s, 'W43257', { days: 3 })
  assert.deepEqual(r.callsigns, ['WMT3257', 'WMT7403', 'WMT4470'])
  assert.equal(r.byRoute, true)
  assert.deepEqual(r.past.map((f) => f.callsign), ['WMT7403', 'WMT4470', 'WMT7403', 'WMT4470', 'WMT7403']) // both of the route's daily flights
  // The newest day's half hours once (read again for the others from memory); then a half hour a flight (3), and seven for
  // the one that did not fly on the last day.
  assert.equal(new Set(w.read).size, 24 + 3 + 7)
  // Its own callsign flies the route: the others never join.
  const own = world({ ...sky, flown: [...sky.flown, ...daily('WMT3257', 6, 150, 2, way)] })
  const o = await settle(new FlightSearch(own.deps), 'W43257', { days: 3 })
  assert.equal(o.byRoute, false)
  assert.deepEqual(o.callsigns, ['WMT3257'])
  assert.deepEqual(o.past.map((f) => f.callsign), ['WMT3257', 'WMT3257'])
  // One of the others in the air now and its own not: they join at once.
  const live = world({ ...sky, live: () => [{ hex: '471f67', callsign: 'WMT7403' }] })
  const l = await ask(new FlightSearch(live.deps), 'W43257')
  assert.equal(l.byRoute, true)
  assert.deepEqual(l.live?.map((x) => x.callsign), ['WMT7403'])
  // …but not one that is nowhere near the route (the callsign is flown elsewhere today).
  const far = world({ ...sky, live: () => [{ hex: '471f67', callsign: 'WMT7403', lat: 52, lon: 0 }] })
  const f = await ask(new FlightSearch(far.deps), 'W43257')
  assert.equal(f.byRoute, false)
  assert.deepEqual(f.live, [])
})

test('a flight to Ben Gurion under other callsigns: the board\'s times say which callsign is the number\'s, and only its flights are listed', async () => {
  const way: [FlightPlace, FlightPlace] = [OTP, TLV]
  const sky: Sky = {
    // The morning flight lands 05:30 UTC (the ticket W4 3257), the afternoon one 15:00 (another ticket).
    flown: [...daily('WMT7403', 3, 150, 5, way), ...daily('WMT4470', 12.5, 150, 5, way).slice(1)],
    routes: { W43257: { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV } },
    lists: { WMT: { WMT7403: 'LROP-LLBG', WMT4470: 'LROP-LLBG' } },
    board: { arrival: true, times: [TODAY - DAY + 5.6 * H, TODAY + 5.6 * H, TODAY + DAY + 5.4 * H] },
  }
  const w = world(sky)
  const r = await settle(new FlightSearch(w.deps), 'W43257', { days: 5 })
  assert.deepEqual(r.callsigns, ['WMT7403'])
  assert.equal(r.byRoute, false)
  assert.deepEqual(r.past.map((f) => f.callsign), ['WMT7403', 'WMT7403', 'WMT7403', 'WMT7403', 'WMT7403'])
  assert.equal(new Set(w.read).size, 24 + 4) // the days before are read for the one callsign's time of day only
  // The board lists no such flight, or lists it as a departure, or its times fit no flight heard: every callsign stays.
  for (const board of [null, { arrival: false, times: sky.board!.times }, { arrival: true, times: [TODAY + 20 * H] }]) {
    const all = await settle(new FlightSearch(world({ ...sky, board }).deps), 'W43257', { days: 2 })
    assert.equal(all.byRoute, true, JSON.stringify(board))
    assert.deepEqual(new Set(all.past.map((f) => f.callsign)), new Set(['WMT7403', 'WMT4470']))
  }
})

test('a ticket number whose own callsign is another flight\'s: that callsign is not looked for, and a flight off the route is not listed', async () => {
  const way: [FlightPlace, FlightPlace] = [OTP, TLV]
  const BHX = place('EGBB', 52.45, -1.75)
  const CRA = place('LRCV', 44.32, 23.89)
  const sky: Sky = {
    // WMT3257 flies Birmingham to Craiova every day; the ticket W4 3257 is flown as WMT7403.
    flown: [...daily('WMT3257', 8, 180, 3, [BHX, CRA]), ...daily('WMT7403', 3, 150, 3, way)],
    routes: { W43257: { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV } },
    lists: { WMT: { WMT3257: 'EGBB-LRCV', WMT7403: 'LROP-LLBG' } },
    live: () => [{ hex: 'abc123', callsign: 'WMT3257' }],
  }
  const s = new FlightSearch(world(sky).deps)
  const first = await ask(s, 'W43257')
  assert.deepEqual(first.callsigns, ['WMT7403'])
  assert.equal(first.byRoute, true)
  assert.deepEqual(first.live, []) // WMT3257 in the air is the other flight
  const r = await settle(s, 'W43257', { days: 3 })
  assert.deepEqual(r.past.map((f) => f.callsign), ['WMT7403', 'WMT7403', 'WMT7403'])
  // The list does not know the callsign is another flight's: its flights are found, and dropped for not lying on the route.
  const unlisted = world({ ...sky, lists: { WMT: { WMT7403: 'LROP-LLBG' } }, live: undefined })
  const u = await settle(new FlightSearch(unlisted.deps), 'W43257', { days: 3 })
  assert.deepEqual(u.past.map((f) => f.callsign), ['WMT7403', 'WMT7403', 'WMT7403'])
  assert.equal(u.byRoute, true)
})

test('nothing known under the id: nothing of the past is read by itself, and ids one slip away are offered, those in the air first', async () => {
  const w = world({
    flown: [{ hex: '738a10', callsign: 'ELY317', t0: NOW - 2 * H, durMin: 300 }],
    lists: { ELY: { ELY315: 'LLBG-EGLL', ELY317: 'LLBG-EGLL', ELY001: 'LLBG-KJFK', ELY3157: 'LLBG-XXXX'.slice(0, 9) } },
    iata: { LY: 'ELY' },
    live: () => [],
  })
  const s = new FlightSearch(w.deps)
  const r = await ask(s, 'LY316')
  assert.equal(r.known, false)
  assert.deepEqual(r.callsigns, ['ELY316']) // the app's own table of airlines says LY is ELY
  assert.deepEqual(r.live, [])
  assert.deepEqual(r.similar, [{ id: 'ELY317', route: 'LLBG-EGLL', flying: true }, { id: 'ELY315', route: 'LLBG-EGLL', flying: false }])
  assert.equal(r.scan.state, 'idle')
  assert.equal(w.read.length, 1) // the newest half hour, for who is in the air
  // A callsign typed that nobody knows, with no airline: the id itself, nothing like it.
  const raw = await ask(s, 'N123AB')
  assert.deepEqual(raw.callsigns, ['N123AB'])
  assert.equal(raw.known, false)
  assert.deepEqual(raw.similar, [])
  assert.equal(await s.ask('London'), null)
})

test('a known flight that nobody flew: two days are read and no more, until asked to go on', async () => {
  const w = world({ flown: [], routes: { FZ1073: { callsign: 'FDB1073', airline: { name: 'Fly Dubai', icao: 'FDB' }, from: DXB, to: TLV } }, lists: { FDB: { FDB1073: 'OMDB-LLBG' } } })
  const s = new FlightSearch(w.deps)
  const r = await settle(s, 'FZ1073')
  assert.equal(r.scan.state, 'done')
  assert.equal(r.past.length, 0)
  assert.equal(r.scan.more, true)
  assert.equal(r.scan.fromMs, newestSlotMs(NOW) + SLOT_MS - UNANCHORED_DAYS * DAY)
  assert.equal(w.read.length, 16 * UNANCHORED_DAYS)
  // The default ask named 14 days, which stand for a flight that is found: with none found, only a deep ask's own days count.
  const deep = await settle(s, 'FZ1073', { days: 4, deep: true })
  assert.equal(deep.scan.fromMs, newestSlotMs(NOW) + SLOT_MS - 4 * DAY)
  assert.equal(w.read.length, 16 * 4)
})

test('the reading goes on only while it is asked for, and from where it stopped', async () => {
  const w = world({ flown: daily('FDB1073', 3, 210, 14), routes: { FZ1073: { callsign: 'FDB1073', airline: null, from: DXB, to: TLV } }, lists: {} })
  const s = new FlightSearch(w.deps)
  const r1 = await ask(s, 'FZ1073', { scan: true })
  assert.equal(r1.scan.state, 'running')
  w.clock.now += ALIVE_MS + 1 // the page went elsewhere
  await new Promise((go) => setTimeout(go, 20))
  const paused = await ask(s, 'FZ1073')
  assert.equal(paused.scan.state, 'idle')
  const readSoFar = w.read.length
  assert.ok(readSoFar < 29, `stopped early (${readSoFar} read)`)
  await new Promise((go) => setTimeout(go, 20))
  assert.equal(w.read.length, readSoFar) // nothing more by itself
  const r = await settle(s, 'FZ1073')
  assert.equal(r.scan.state, 'done')
  assert.equal(r.past.length, 14)
})

test('a half hour that cannot be read: tried again, then the search says so and goes on from there when asked again', async () => {
  const down = new Set<number>([Date.UTC(2026, 9, 8, 5, 0)])
  const w = world({ flown: daily('FDB1073', 3, 210, 14), routes: { FZ1073: { callsign: 'FDB1073', airline: null, from: DXB, to: TLV } }, down })
  const s = new FlightSearch(w.deps)
  const r = await settle(s, 'FZ1073')
  assert.equal(r.scan.state, 'failed')
  assert.equal(r.past.length, 3) // today and the two days before
  assert.ok(w.read.filter((x) => x === Date.UTC(2026, 9, 8, 5, 0)).length >= 3) // three tries
  down.clear()
  assert.equal((await ask(s, 'FZ1073', { scan: true })).scan.state, 'failed') // the next poll does not start it again
  w.clock.now += 5000 // Retry, a while after
  const ok = await settle(s, 'FZ1073')
  assert.equal(ok.scan.state, 'done')
  assert.equal(ok.past.length, 14)
  // adsb.lol late with its newest half hour: asked once, not waited for, and the days are read without it.
  const late = world({ flown: daily('FDB1073', 3, 210, 14), routes: { FZ1073: { callsign: 'FDB1073', airline: null, from: DXB, to: TLV } }, down: new Set([newestSlotMs(NOW)]) })
  const r2 = await settle(new FlightSearch(late.deps), 'FZ1073')
  assert.deepEqual([r2.scan.state, r2.past.length, late.read.filter((x) => x === newestSlotMs(NOW)).length], ['done', 14, 1])
})

test('in the air now: the live flight with since when, kept out of the past; a callsign typed is searched as it is', async () => {
  const flying: Flown = { hex: '896abc', callsign: 'FDB1073', t0: NOW - 100 * 60_000, durMin: 100 }
  const w = world({
    flown: [flying, ...daily('FDB1073', 9.5, 200, 4).slice(1)],
    routes: { FDB1073: { callsign: 'FDB1073', airline: { name: 'Fly Dubai', icao: 'FDB' }, from: DXB, to: TLV } },
    lists: { FDB: { FDB1073: 'OMDB-LLBG' } },
    live: (callsigns) => (callsigns.includes('FDB1073') ? [{ hex: '896abc', callsign: 'FDB1073' }] : []),
  })
  const s = new FlightSearch(w.deps)
  const first = await ask(s, 'fdb1073')
  assert.equal(first.ticket, null) // a callsign: no ticket number is made up for it
  assert.equal(first.live?.length, 1)
  assert.equal(first.live![0].hex, '896abc')
  await new Promise((go) => setImmediate(go))
  const r = await settle(s, 'FDB1073', { days: 4 })
  assert.equal(r.live![0].sinceMs, flying.t0) // from its trace
  assert.equal(r.past.length, 3) // the flight in the air is not of the past
  assert.ok(r.past.every((f) => f.hex !== '896abc'))
})

test('a search kept too long is begun afresh: its past would end where its first ask began', async () => {
  // (a flight a day at 03:00, tomorrow's too: not flown yet at the first ask)
  const flown = [...daily('FDB1073', 3, 210, 14), { hex: '896fff', callsign: 'FDB1073', t0: TODAY + DAY + 3 * H, durMin: 210 }]
  const w = world({ flown, routes: { FZ1073: { callsign: 'FDB1073', airline: null, from: DXB, to: TLV } } })
  const s = new FlightSearch(w.deps)
  assert.equal((await settle(s, 'FZ1073')).past.length, 14)
  w.clock.now += 10 * 60_000 // a while after: the same search, as it was
  const kept = await ask(s, 'FZ1073')
  assert.deepEqual([kept.scan.state, kept.past.length], ['done', 14])
  w.clock.now += DAY
  const fresh = await ask(s, 'FZ1073')
  assert.deepEqual([fresh.scan.state, fresh.past.length], ['idle', 0])
  const r = await settle(s, 'FZ1073')
  assert.equal(r.past.length, 14) // the newest 14 days: tomorrow's flight is in, the oldest is out
  assert.equal(r.past[0].hex, '896fff')
})

test('a route list that does not answer: a ticket number is not guessed at, nor kept, and the next ask tries again; a callsign is searched as it is', async () => {
  const routes: Record<string, FlightRoute | null | 'failed'> = { W43257: 'failed', ELY315: 'failed' }
  const lists: Record<string, Record<string, string> | 'failed'> = { WMT: { WMT7403: 'LROP-LLBG' } }
  const w = world({ flown: daily('WMT7403', 4, 150, 3, [OTP, TLV]), routes, lists, live: () => [] })
  const s = new FlightSearch(w.deps)
  assert.equal(await s.ask('W43257'), 'failed')
  assert.equal(await s.ask('W43257', { scan: true }), 'failed')
  assert.equal(w.read.length, 0) // nothing of the past was read for it
  routes.W43257 = { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV }
  lists.WMT = 'failed' // adsbdb answers now, the airline's callsign list does not
  assert.equal(await s.ask('W43257'), 'failed')
  lists.WMT = { WMT7403: 'LROP-LLBG' }
  const ok = await ask(s, 'W43257')
  assert.deepEqual([ok.known, ok.route?.[1].icao], [true, 'LLBG'])
  // A callsign needs neither: it is looked for as typed, with no route to show.
  const raw = await ask(s, 'ELY315')
  assert.deepEqual([raw.callsigns, raw.route, raw.live], [['ELY315'], null, []])
})

test('a flight across midnight UTC beside another of the same aircraft: each is listed once and whole', async () => {
  // adsb.lol gives a day at a time: the night flight comes in two parts, and the morning one's day holds the second part.
  const night: Flown = { hex: 'a1b2c3', callsign: 'N123AB', t0: TODAY - 2 * H, durMin: 240 }
  const morning: Flown = { hex: 'a1b2c3', callsign: 'N123AB', t0: TODAY + 6 * H, durMin: 120 }
  const w = world({ flown: [night, morning], cut: true, live: () => [] })
  const r = await settle(new FlightSearch(w.deps), 'N123AB', { days: 2, deep: true })
  assert.equal(r.scan.state, 'done')
  // (10 minutes on the ground first and 5 after; shown from 30 minutes before the first point in the air at most)
  assert.deepEqual(r.past.map((f) => [f.from.tMs, f.to.tMs]), [[morning.t0, morning.t0 + 120 * 60_000], [night.t0, night.t0 + 240 * 60_000]])
})

test('a number whose own callsign the list gives another route, with no other on its route: that callsign is still searched, on the route', async () => {
  const routes = { W43257: { callsign: 'WMT3257', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: TLV } }
  const w = world({ flown: daily('WMT3257', 4, 150, 3, [OTP, TLV]), routes, lists: { WMT: { WMT3257: 'EGBB-LRCV' } }, live: () => [] })
  const s = new FlightSearch(w.deps)
  const first = await ask(s, 'W43257')
  assert.deepEqual([first.known, first.callsigns, first.byRoute], [true, ['WMT3257'], false])
  const r = await settle(s, 'W43257')
  assert.deepEqual([r.scan.state, r.past.length], ['done', 3])
})

test('two flights of a route within the hour of each other: each is followed at its own time of day', async () => {
  const SOF = place('LBSF', 42.7, 23.4)
  const routes = { W4999: { callsign: 'WMT999', airline: { name: 'Wizz Air Malta', icao: 'WMT' }, from: OTP, to: SOF } }
  const flown = [...daily('WMT1111', 6, 50, 5, [OTP, SOF]), ...daily('WMT2222', 7, 50, 5, [OTP, SOF])]
  const w = world({ flown, routes, lists: { WMT: { WMT1111: 'LROP-LBSF', WMT2222: 'LROP-LBSF' } }, live: () => [] })
  const r = await settle(new FlightSearch(w.deps), 'W4999')
  assert.deepEqual([r.scan.state, r.byRoute, r.past.filter((f) => f.callsign === 'WMT1111').length, r.past.filter((f) => f.callsign === 'WMT2222').length], ['done', true, 5, 5])
})

test('flights never heard to their route\'s end: the hours after are read for the newest three only', async () => {
  const short = place('LTAI', 36.9, 30.8) // Antalya: 300 nm short of Tel Aviv
  const routes = { W43257: { callsign: 'WMT7403', airline: null, from: OTP, to: TLV } }
  const w = world({ flown: daily('WMT7403', 4, 100, 10, [OTP, short]), routes, live: () => [] })
  const r = await settle(new FlightSearch(w.deps), 'W43257')
  assert.deepEqual([r.scan.state, r.past.length], ['done', 10])
  // The newest day evenly; a half hour for each of the nine days before with a flight, seven for each of the four without;
  // and the 12 h after three of the flights, not after all nine.
  const step = stepFor([OTP, TLV])
  const most = 48 / step + 9 + 4 * 7 + 3 * (24 / step)
  assert.ok(new Set(w.read).size <= most, `${new Set(w.read).size} half hours read, ${most} at most`)
})
