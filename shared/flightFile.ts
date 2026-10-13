// shared/flightFile.ts
// A flown flight as a file. No one format is the standard; these are the ones a past flight is found in, and each is read
// into the samples a recording holds (server/flightLog.ts), so an imported flight replays as a recorded one does:
//   Flight Chaser    a recording's own .jsonl (flightLog.ts): everything kept
//   ADS-B trace     readsb / tar1090 "trace_full_<hex>.json" (ADS-B Exchange, adsb.lol, adsb.fi, airplanes.live …): one
//                   aircraft's day, so often several flights; speed, track, rates, bank and airspeed where they were sent
//   OpenSky track   /api/tracks/all: {icao24, callsign, path: [[s, lat, lon, baro m, track, on ground], …]}
//   Flightradar24   CSV: Timestamp,UTC,Callsign,Position,Altitude,Speed,Direction (feet, knots; Altitude 0 on the ground)
//   KML             gx:Track elements (<when> + <gx:coord> lon lat m: tar1090's export, FlightAware), or placemarks that
//                   each hold a <when> and a <Point> (Flightradar24)
//   GPX             <trkpt lat lon> with <ele> (m) and <time>; <speed> (m/s) and <course> where given
// Checked on real files (2026-10-13): a trace of ADS-B Exchange and of adsb.lol, an OpenSky track, a Flightradar24 CSV, and
// tar1090's KML export in its source. FlightAware's and Flightradar24's KML are read as they are described, not from a file.
// None of them holds pitch and only the trace holds bank: a replay works both out from the path, as the live chase does
// (client/track/track.ts). Few name the aircraft, so whoever imports one may say what it was (withMeta).
// Heights in KML, GPX and the CSV are taken as above mean sea level. Where a format has no on-ground flag, a point with no
// height, or one of 0 or less, is on the ground: so Flightradar24 and tar1090 write them.
// ponytail: XML is read with patterns for the few tags above, not parsed; a KML holding a whole day stays one flight
// unless the aircraft landed and left unseen (cutAtStops).
import { distanceNm } from './geo.ts'
import { geoidN } from './geoid.ts'
import { classify } from './sample.ts'
import type { Quality, ReadsbAircraft, Sample } from './types.ts'

const FT = 0.3048
const KT = 1852 / 3600
/** The largest file read: a busy aircraft's day as a trace is a few MB. */
export const FILE_MAX_BYTES = 32 * 1024 * 1024
const MAX_POINTS = 400_000
const MIN_MS = Date.UTC(1980, 0, 1)
const MAX_MS = Date.UTC(2100, 0, 1)
const MIN_SPAN_MS = 2000 // under this there is nothing to play (scenarioPanel.ts MIN_PLAY_S)
const NAME_MAX = 60 // server/flightLog.ts NAME_MAX
/** The transponder address of a flight whose file names none. */
export const NO_HEX = '000000'

/** What a flight's fields may hold, as typed by hand: upper case, no spaces. */
export const FIELD = {
  callsign: /^[A-Z0-9]{2,8}$/, // ELY315
  reg: /^[A-Z0-9][A-Z0-9-]{1,9}$/, // 4X-EHA
  typeCode: /^[A-Z][A-Z0-9]{1,3}$/, // ICAO type designator: B738
  operator: /^[A-Z]{3}$/, // ICAO airline designator: ELY
} as const
const HEX = /^~?[0-9a-f]{6}$/
const ROUTE = /^[A-Z0-9]{3,4}(-[A-Z0-9]{3,4}){1,2}$/
const CATEGORY = /^[A-D][0-7]$/

/** What a file says of its flight, or what was said by hand; null: not known. */
export interface FlightMeta {
  hex: string | null
  callsign: string | null
  reg: string | null
  typeCode: string | null
  category: string | null // ADS-B emitter category
  operator: string | null // the airline when given by hand (ICAO designator); null: the callsign's
  name: string | null
  route: string | null // 'LLBG-EGLL'
}

export interface FileFlight {
  meta: FlightMeta
  samples: Sample[] // oldest first, two or more
}

export interface FlightFile {
  format: string // 'KML', 'Flightradar24 CSV' …
  flights: FileFlight[] // one or more
}

/** Why a file could not be read, in words for whoever picked it. */
export class FlightFileError extends Error {}

type Pt = { tMs: number; lat: number; lon: number } & Partial<Omit<Sample, 'tMs' | 'lat' | 'lon'>>

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** A cell or tag's text as a number; null when empty or not one (Number('') is 0). */
const cellNum = (s: string | undefined): number | null => (s === undefined || s.trim() === '' ? null : num(Number(s)))
const field = (v: unknown, re: RegExp): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase()
  return re.test(s) ? s : null
}

/** A name as kept: control characters out, trimmed, at most NAME_MAX; null when nothing is left. */
export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, NAME_MAX).trim()
  return s === '' ? null : s
}

/** Only what each field may hold: anything else is null. */
function cleanMeta(m: Partial<Record<keyof FlightMeta, unknown>>): FlightMeta {
  const hex = typeof m.hex === 'string' ? m.hex.trim().toLowerCase() : ''
  return {
    hex: HEX.test(hex) ? hex : null,
    callsign: field(m.callsign, FIELD.callsign),
    reg: field(m.reg, FIELD.reg),
    typeCode: field(m.typeCode, FIELD.typeCode),
    category: field(m.category, CATEGORY),
    operator: field(m.operator, FIELD.operator),
    name: cleanName(m.name),
    route: field(m.route, ROUTE),
  }
}

const QUALITIES: readonly Quality[] = ['adsb2', 'adsb01', 'mlat', 'other']

/**
 * The flight of these points: those with a time and a place on the globe, oldest first, one per time. null when under two
 * are left or they span under two seconds. Every sample is made here, field by field, so nothing else of a file is kept.
 */
function build(meta: Partial<Record<keyof FlightMeta, unknown>>, pts: readonly Pt[]): FileFlight | null {
  const m = cleanMeta(meta)
  const ok = pts
    .filter((p) => num(p.tMs) !== null && p.tMs >= MIN_MS && p.tMs <= MAX_MS && num(p.lat) !== null && Math.abs(p.lat) <= 90 && num(p.lon) !== null && Math.abs(p.lon) <= 180)
    .sort((a, b) => a.tMs - b.tMs)
    .filter((p, i, all) => i === 0 || p.tMs > all[i - 1].tMs)
  if (ok.length < 2 || ok[ok.length - 1].tMs - ok[0].tMs < MIN_SPAN_MS) return null
  if (ok.length > MAX_POINTS) throw new FlightFileError(`The file has ${ok.length.toLocaleString('en-US')} points: more than this app takes in one flight.`)
  const hex = m.hex ?? NO_HEX
  const samples = ok.map((p): Sample => {
    const baro = num(p.altBaroFt)
    const geom = num(p.altGeomFt)
    const flagged = typeof p.onGround === 'boolean'
    const onGround = flagged ? p.onGround === true : !((baro ?? 0) > 0 || (geom ?? 0) > 0)
    const tMs = Math.round(p.tMs)
    return {
      hex, tMs, rxMs: tMs, lat: p.lat, lon: p.lon, onGround,
      altBaroFt: onGround && !flagged ? null : baro, altGeomFt: onGround && !flagged ? null : geom,
      gsKt: num(p.gsKt), trackDeg: num(p.trackDeg), trueHeadingDeg: num(p.trueHeadingDeg), rollDeg: num(p.rollDeg),
      baroRateFpm: num(p.baroRateFpm), geomRateFpm: num(p.geomRateFpm), navQnhHpa: num(p.navQnhHpa),
      version: num(p.version), nic: num(p.nic),
      quality: QUALITIES.includes(p.quality as Quality) ? (p.quality as Quality) : 'adsb2',
      nM: geoidN(p.lat, p.lon),
      callsign: m.callsign, typeCode: m.typeCode, reg: m.reg,
      iasKt: num(p.iasKt), tasKt: num(p.tasKt), category: m.category,
    }
  })
  return { meta: m, samples }
}

/** The flight with some of its fields said by hand (null clears one); its samples carry them too. */
export function withMeta(f: FileFlight, over: Partial<FlightMeta>): FileFlight {
  return build({ ...f.meta, ...over }, f.samples)!
}

const STOP_GAP_MS = 15 * 60_000
const STOP_KT = 100 // slower than this over such a gap no airliner flew, where its points give no speed

/**
 * A flight cut where the aircraft plainly landed and left again unseen: two points in the air over 15 minutes apart that
 * it would have had to crawl between, at under half the speed it flew at either end. (A hole in the reception over an
 * ocean is crossed at cruising speed and stays one flight.) readsb marks a day's legs, but not such a one.
 */
function cutAtStops(f: FileFlight): (FileFlight | null)[] {
  const cuts = [0]
  f.samples.forEach((b, i) => {
    const a = f.samples[i - 1]
    if (a === undefined || a.onGround || b.onGround || b.tMs - a.tMs <= STOP_GAP_MS) return
    const kt = (distanceNm(a.lat, a.lon, b.lat, b.lon) * 3_600_000) / (b.tMs - a.tMs)
    const flown = Math.min(a.gsKt ?? Infinity, b.gsKt ?? Infinity)
    if (kt < (Number.isFinite(flown) ? flown / 2 : STOP_KT)) cuts.push(i)
  })
  return cuts.length === 1 ? [f] : cuts.map((from, k) => build(f.meta, f.samples.slice(from, cuts[k + 1])))
}

const NO_HEIGHTS = 'The file gives no heights, so there is no flight to fly. Each point needs its altitude.'
function needHeights(pts: readonly Pt[]): void {
  if (!pts.some((p) => (p.altBaroFt ?? 0) > 0)) throw new FlightFileError(NO_HEIGHTS)
}

// --- Flight Chaser's own recording ---

function fromJsonl(lines: readonly string[]): (FileFlight | null)[] {
  let head: Record<string, unknown> = {}
  let name: unknown = null
  let route: unknown = null
  const pts: Pt[] = []
  for (const line of lines) {
    let o: { flight?: unknown; s?: unknown; name?: unknown; route?: unknown }
    try {
      o = JSON.parse(line)
    } catch {
      continue // a line cut short
    }
    if (typeof o.s === 'object' && o.s !== null) pts.push(o.s as Pt)
    else if (typeof o.flight === 'object' && o.flight !== null) head = o.flight as Record<string, unknown>
    else if (typeof o.name === 'string') name = o.name
    else if (typeof o.route === 'string') route = o.route
  }
  return [build({ ...head, name, route: route ?? head.route }, pts)]
}

// --- readsb / tar1090 trace ---

/** One flight per leg: readsb marks a leg's first point (flag 2). Row layout: server/trace.ts. */
function fromTrace(o: Record<string, unknown>): (FileFlight | null)[] {
  const base = num(o.timestamp)
  if (base === null) throw new FlightFileError('This trace has no start time.')
  const legs: { pts: Pt[]; calls: Map<string, number>; category: unknown }[] = []
  for (const r of o.trace as unknown[]) {
    if (!Array.isArray(r)) continue
    const [dt, lat, lon, alt, gs, track, flagsRaw, vrate, ac, src, geomAlt, geomRate, ias, roll] = r as unknown[]
    if (num(dt) === null || num(lat) === null || num(lon) === null) continue
    const flags = num(flagsRaw) ?? 0
    if (legs.length === 0 || flags & 2) legs.push({ pts: [], calls: new Map(), category: null })
    const leg = legs[legs.length - 1]
    const a = (typeof ac === 'object' && ac !== null ? ac : {}) as Record<string, unknown>
    const flight = typeof a.flight === 'string' ? a.flight.trim() : ''
    if (flight !== '') leg.calls.set(flight, (leg.calls.get(flight) ?? 0) + 1)
    leg.category = a.category ?? leg.category
    const altFt = num(alt)
    leg.pts.push({
      tMs: (base + (dt as number)) * 1000, lat: lat as number, lon: lon as number, onGround: alt === 'ground',
      altBaroFt: flags & 8 ? null : altFt, altGeomFt: num(geomAlt) ?? (flags & 8 ? altFt : null),
      gsKt: num(gs), trackDeg: num(track), trueHeadingDeg: num(a.true_heading), rollDeg: num(roll),
      baroRateFpm: flags & 4 ? null : num(vrate), geomRateFpm: num(geomRate) ?? (flags & 4 ? num(vrate) : null),
      navQnhHpa: num(a.nav_qnh), version: num(a.version), nic: num(a.nic), iasKt: num(ias),
      quality: classify({ type: typeof src === 'string' ? src : undefined, version: num(a.version) ?? 2 } as ReadsbAircraft),
    })
  }
  return legs.map((leg) => {
    const callsign = [...leg.calls].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null // the one it sent most
    return build({ hex: o.icao, reg: o.r, typeCode: o.t, callsign, category: leg.category }, leg.pts)
  })
}

// --- OpenSky ---

function fromOpenSky(o: Record<string, unknown>): (FileFlight | null)[] {
  const pts: Pt[] = []
  for (const r of o.path as unknown[]) {
    if (!Array.isArray(r)) continue
    const [t, lat, lon, altM, track, gnd] = r as unknown[]
    if (num(t) === null || num(lat) === null || num(lon) === null) continue
    const m = num(altM)
    pts.push({ tMs: (t as number) * 1000, lat: lat as number, lon: lon as number, onGround: gnd === true, altBaroFt: m === null ? null : m / FT, trackDeg: num(track) })
  }
  return [build({ hex: o.icao24, callsign: o.callsign }, pts)]
}

// --- Flightradar24 CSV ---

/** A CSV line's cells: commas split, except inside double quotes ("32.01,34.88" is one cell). */
function cells(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

function fromCsv(lines: readonly string[]): (FileFlight | null)[] {
  const head = cells(lines[0]).map((c) => c.toLowerCase())
  const col = (...names: string[]): number => head.findIndex((c) => names.includes(c))
  const [iT, iUtc, iPos, iLat, iLon, iAlt, iGs, iTrk, iCs] = [col('timestamp'), col('utc'), col('position'), col('latitude', 'lat'), col('longitude', 'lon', 'lng'), col('altitude'), col('speed'), col('direction'), col('callsign')]
  if ((iT < 0 && iUtc < 0) || (iPos < 0 && (iLat < 0 || iLon < 0)) || iAlt < 0) {
    throw new FlightFileError('This CSV is not a flight as Flightradar24 writes one. Its first line must name the columns Timestamp or UTC, Position, and Altitude.')
  }
  const pts: Pt[] = []
  let callsign: string | null = null
  for (const line of lines.slice(1)) {
    const c = cells(line)
    const t = iT >= 0 ? cellNum(c[iT]) : null
    const tMs = t !== null ? t * 1000 : iUtc >= 0 ? Date.parse(c[iUtc] ?? '') : NaN
    const [lat, lon] = iPos >= 0 ? (c[iPos] ?? '').split(',').map(cellNum) : [cellNum(c[iLat]), cellNum(c[iLon])]
    if (!Number.isFinite(tMs) || lat == null || lon == null) continue
    const alt = cellNum(c[iAlt])
    const gs = iGs >= 0 ? cellNum(c[iGs]) : null
    callsign ??= iCs >= 0 && c[iCs] ? c[iCs] : null
    // A speed of 0 in the air is one that was not known.
    pts.push({ tMs, lat, lon, altBaroFt: alt, gsKt: (alt ?? 0) > 0 && gs === 0 ? null : gs, trackDeg: iTrk >= 0 ? cellNum(c[iTrk]) : null })
  }
  needHeights(pts)
  return [build({ callsign }, pts)]
}

// --- KML and GPX ---

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
const unescapeXml = (s: string): string => s.replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITIES[e])
const escapeXml = (s: string): string => s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))

/** Every <name> in the file, in order. */
function namesOf(xml: string): string[] {
  return [...xml.matchAll(/<name>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/g)].map((m) => unescapeXml(m[1].trim())).filter((n) => n !== '')
}

/**
 * What a file's names say of its flight, for the form to show and whoever imports to put right: an airline callsign
 * anywhere in them (ELY315), a route in brackets ("(LLBG-EGLL)"), and tar1090's "<registration or address> track".
 */
function guessMeta(names: readonly string[]): Partial<Record<keyof FlightMeta, unknown>> {
  const all = names.join(' | ')
  const route = /\(([A-Z]{4})\s*[-–\/]\s*([A-Z]{4})\)/.exec(all)
  const tar = /^(\S+) track$/.exec(names[0] ?? '')?.[1] ?? null
  const isHex = tar !== null && /^[0-9a-fA-F]{6}$/.test(tar)
  return {
    name: names[0] ?? null,
    callsign: /\b[A-Z]{3}\d[A-Z0-9]{0,4}\b/.exec(all)?.[0] ?? null,
    route: route === null ? null : `${route[1]}-${route[2]}`,
    hex: isHex ? tar : null,
    reg: isHex ? null : tar,
  }
}

/** A point of a height in metres above mean sea level. */
const xmlPt = (tMs: number, lat: number | null, lon: number | null, altM: number | null): Pt | null =>
  lat === null || lon === null ? null : { tMs, lat, lon, altBaroFt: altM === null ? null : altM / FT }

function fromKml(xml: string): (FileFlight | null)[] {
  const pts: (Pt | null)[] = []
  // gx:Track (KML 2.2) or Track (2.3): its <when>s and its <coord>s pair up in order, whether interleaved or grouped.
  for (const track of xml.matchAll(/<(?:\w+:)?Track\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Track>/g)) {
    const whens = [...track[1].matchAll(/<(?:\w+:)?when>([^<]*)</g)].map((m) => Date.parse(m[1].trim()))
    const coords = [...track[1].matchAll(/<(?:\w+:)?coord>([^<]*)</g)].map((m) => m[1].trim().split(/\s+/).map(cellNum))
    for (let i = 0; i < Math.min(whens.length, coords.length); i++) pts.push(xmlPt(whens[i], coords[i][1] ?? null, coords[i][0] ?? null, coords[i][2] ?? null))
  }
  if (pts.length === 0) {
    for (const pm of xml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/g)) {
      const when = /<when>([^<]*)</.exec(pm[1])
      const c = /<Point\b[^>]*>[\s\S]*?<coordinates>([^<]*)</.exec(pm[1])?.[1].trim().split(/[\s,]+/).map(cellNum)
      if (when && c) pts.push(xmlPt(Date.parse(when[1].trim()), c[1] ?? null, c[0] ?? null, c[2] ?? null))
    }
  }
  const got = pts.filter((p): p is Pt => p !== null)
  if (got.length === 0) {
    throw new FlightFileError(/<coordinates>/.test(xml) ? 'This KML holds a path without times. A flight needs the time of each point.' : 'This KML holds no track.')
  }
  needHeights(got)
  return [build(guessMeta(namesOf(xml)), got)]
}

function fromGpx(xml: string): (FileFlight | null)[] {
  const pts: Pt[] = []
  let any = false
  for (const m of xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g)) {
    any = true
    const attr = (n: string): number | null => cellNum(new RegExp(`\\b${n}\\s*=\\s*["']([^"']*)["']`).exec(m[1])?.[1])
    const tag = (n: string): string | undefined => new RegExp(`<(?:\\w+:)?${n}>([^<]*)<`).exec(m[2])?.[1]
    const tMs = Date.parse((tag('time') ?? '').trim())
    const p = xmlPt(tMs, attr('lat'), attr('lon'), cellNum(tag('ele')))
    if (p === null) continue
    const speed = cellNum(tag('speed'))
    pts.push({ ...p, gsKt: speed === null ? null : speed / KT, trackDeg: cellNum(tag('course')) })
  }
  if (!pts.some((p) => Number.isFinite(p.tMs))) {
    throw new FlightFileError(any ? 'This GPX holds a path without times. A flight needs the time of each point.' : 'This GPX holds no track.')
  }
  needHeights(pts)
  return [build(guessMeta(namesOf(xml)), pts)]
}

// --- reading ---

const NOT_A_FLIGHT = 'Not a flight file this app reads. It reads KML, GPX, Flightradar24 CSV, ADS-B trace JSON, OpenSky tracks and its own recordings.'

/** The flights in a file's text, the format told from the text itself. Throws a FlightFileError that says why not. */
export function parseFlightFile(text: string): FlightFile {
  const t = text.replace(/^﻿/, '').trim()
  let format: string
  let flights: (FileFlight | null)[]
  if (t.startsWith('<')) {
    if (/<gpx[\s>]/i.test(t)) [format, flights] = ['GPX', fromGpx(t)]
    else if (/<kml[\s>]/i.test(t)) [format, flights] = ['KML', fromKml(t)]
    else throw new FlightFileError(NOT_A_FLIGHT)
  } else if (t.startsWith('{')) {
    let o: Record<string, unknown> | null = null
    try {
      o = JSON.parse(t) as Record<string, unknown>
    } catch {
      // not one JSON value: a recording, one a line
    }
    if (o === null || 'flight' in o) [format, flights] = ['Flight Chaser', fromJsonl(t.split('\n'))]
    else if (Array.isArray(o.trace)) [format, flights] = ['ADS-B trace', fromTrace(o)]
    else if (Array.isArray(o.path)) [format, flights] = ['OpenSky track', fromOpenSky(o)]
    else throw new FlightFileError(NOT_A_FLIGHT)
  } else if (/^[^\n]*,[^\n]*\n/.test(t)) [format, flights] = ['Flightradar24 CSV', fromCsv(t.split('\n').filter((l) => l.trim() !== ''))]
  else throw new FlightFileError(NOT_A_FLIGHT)
  const got = flights.flatMap((f) => (f === null ? [] : cutAtStops(f))).filter((f): f is FileFlight => f !== null)
  if (got.length === 0) throw new FlightFileError('The file holds no flight: under two points with a time and a place, or under two seconds of them.')
  return { format, flights: got }
}

// --- writing ---

/**
 * The samples as KML for Google Earth and other programs: gx:Track elements, a new one each time the aircraft leaves or
 * meets the ground, as tar1090 writes them (in the air: metres above mean sea level; on the ground: clamped to it, which
 * is Google Earth's default). A point in the air without a height is left out. Read back by parseFlightFile.
 */
export function toKml(title: string, description: string, samples: readonly Sample[]): string {
  const sections: { ground: boolean; whens: string[]; coords: string[] }[] = []
  for (const s of samples) {
    const m = s.onGround ? 0 : s.altGeomFt !== null ? s.altGeomFt * FT - s.nM : s.altBaroFt !== null ? s.altBaroFt * FT : null
    if (m === null) continue
    let sec = sections[sections.length - 1]
    if (sec === undefined || sec.ground !== s.onGround) sections.push((sec = { ground: s.onGround, whens: [], coords: [] }))
    sec.whens.push(`<when>${new Date(s.tMs).toISOString()}</when>`)
    sec.coords.push(`<gx:coord>${s.lon} ${s.lat} ${Math.round(m)}</gx:coord>`)
  }
  const name = `<name>${escapeXml(title)}</name>`
  const marks = sections.map(
    (sec) => `<Placemark>${name}<gx:Track>${sec.ground ? '' : '<altitudeMode>absolute</altitudeMode>'}\n${sec.whens.join('\n')}\n${sec.coords.join('\n')}\n</gx:Track></Placemark>`,
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">',
    `<Document>${name}<description>${escapeXml(description)}</description>`,
    ...marks,
    '</Document></kml>',
    '',
  ].join('\n')
}
