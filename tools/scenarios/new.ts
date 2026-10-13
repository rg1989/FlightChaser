// tools/scenarios/new.ts
// Starts a scenario package from a flight file (KML, GPX, a Flightradar24 CSV, an ADS-B trace, an OpenSky track, or one
// of this app's own recordings: shared/flightFile.ts). It writes public/scenarios/<id>/ with scenario.json, track.csv
// and events.csv. The path and the attitude are those the app flies for that file as a recording
// (client/scenario/fromRecording.ts: the live chase's estimator, a row a second), so the package plays at once. Its words
// are left as TODO for the author, and the package test refuses a TODO (client/scenario/format.test.ts).
// docs/scenario-sdk.md is the procedure this command is a step of.
//
//   node tools/scenarios/new.ts <flight file> <id> --model <model id> [--flight <n>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseScenario, sToClock } from '../../client/scenario/format.ts'
import { recordingScenario } from '../../client/scenario/fromRecording.ts'
import { physicsReport } from '../../client/scenario/physics.ts'
import type { RecordingInfo } from '../../shared/api.ts'
import { NO_HEX, parseFlightFile, type FileFlight } from '../../shared/flightFile.ts'
import { PACKAGE_ID } from './packages.ts'

const HEARD_S = 5 // a row within this of a point of the file is the file's (q=A); farther, the app's own estimate (q=R)
const tenth = (v: number): string => (Math.round(v * 10) / 10 + 0).toFixed(1) // + 0: never '-0.0'
const utc = (ms: number): string => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
const span = (f: FileFlight): string => `${f.meta.callsign ?? f.meta.hex ?? 'no callsign'}, ${utc(f.samples[0].tMs)} to ${utc(f.samples[f.samples.length - 1].tMs)} UTC, ${f.samples.length} points`

/** The package's three files for one flight of a flight file's text. Throws with words for whoever runs it. */
export function packageFromFlight(text: string, o: { id: string; model: string; fileName: string; flight?: number }): Record<'scenario.json' | 'track.csv' | 'events.csv', string> {
  const file = parseFlightFile(text)
  if (file.flights.length > 1 && o.flight === undefined) {
    throw new Error(`The file holds ${file.flights.length} flights. Pick one with --flight <n>:\n${file.flights.map((f, i) => `  ${i}: ${span(f)}`).join('\n')}`)
  }
  const f = file.flights[o.flight ?? 0]
  if (f === undefined) throw new Error(`No flight ${o.flight} in the file: it holds ${file.flights.length}.`)
  const { meta, samples } = f
  const [first, last] = [samples[0].tMs, samples[samples.length - 1].tMs]
  const info: RecordingInfo = {
    file: `${o.id}.jsonl`, name: meta.name, hex: meta.hex ?? NO_HEX, callsign: meta.callsign, reg: meta.reg, typeCode: meta.typeCode,
    category: meta.category, military: false, route: meta.route, source: `${file.format} file`, startedMs: first, firstMs: first, lastMs: last,
    samples: samples.length, ended: { why: 'imported', endedMs: last }, active: false,
  }
  const scn = recordingScenario({ info, samples }, o.model)
  if (scn === null) throw new Error('The flight is too short to play: under two seconds of track.')

  // On the ground the estimator may have no height for the aircraft (0): a stretch there takes the height the aircraft
  // leaves it at, or met it at: the runway's, to within the first or last second in the air.
  for (let i = 0; i < scn.track.length; i++) {
    if (!scn.track[i].gnd) continue
    let j = i
    while (j + 1 < scn.track.length && scn.track[j + 1].gnd) j++
    const air = scn.track[j + 1] ?? scn.track[i - 1]
    if (air !== undefined) for (let k = i; k <= j; k++) scn.track[k].altFt = air.altFt
    i = j
  }
  const times = samples.map((s) => s.tMs / 1000 - scn.t0UtcMs / 1000)
  let at = 0
  const heard = (t: number): boolean => {
    while (at < times.length - 1 && times[at + 1] <= t) at++
    return Math.min(Math.abs(times[at] - t), Math.abs((times[at + 1] ?? Infinity) - t)) <= HEARD_S
  }
  const decimals = first % 1000 === 0 ? 0 : 3
  const track = ['time,lat,lon,alt_ft,hdg,pitch,roll,gnd,ias_kt,q,src']
  for (const r of scn.track) {
    const hdg = (Math.round((((r.hdg % 360) + 360) % 360) * 10) / 10) % 360
    track.push([
      sToClock(r.t, decimals), r.lat.toFixed(6), r.lon.toFixed(6), r.altFt.toFixed(0), hdg.toFixed(1), tenth(r.pitch), tenth(r.roll),
      r.gnd ? '1' : '', r.iasKt === null ? '' : r.iasKt.toFixed(0), heard(r.t) ? 'A' : 'R', 'TRACK',
    ].join(','))
  }
  const events = ['time,type,value,label,src', ...scn.events.map((e) => `${sToClock(e.t, decimals)},${e.type},,${e.label},TRACK`)]
  const manifest = {
    format: 1,
    id: o.id,
    title: scn.title,
    subtitle: scn.subtitle || 'TODO: the route, as "From → To"',
    date: scn.date,
    utcOffset: '+00:00',
    clockLabel: 'UTC',
    start: sToClock(Math.ceil(scn.start)),
    end: sToClock(Math.floor(scn.end)),
    note: 'TODO: one or two sentences for the card: what this flight is, and that the attitude is computed from the path.',
    summary: [],
    crew: [],
    aircraft: { registration: meta.reg ?? '', type: meta.typeCode ?? '', callsign: meta.callsign ?? '', operator: '', model: o.model },
    speakers: {},
    sources: [{
      id: 'TRACK',
      title: `${file.format} file ${o.fileName}`,
      url: 'TODO: where the file comes from',
      note: `TODO: who published the file and under which terms. Rows q=A lie within ${HEARD_S} s of a point of the file; rows q=R are flown between its points. The attitude is computed from the path (tools/scenarios/new.ts), not recorded.`,
    }],
  }
  return { 'scenario.json': `${JSON.stringify(manifest, null, 2)}\n`, 'track.csv': `${track.join('\n')}\n`, 'events.csv': `${events.join('\n')}\n` }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const opt = (name: string): string | undefined => {
    const i = args.indexOf(name)
    return i < 0 ? undefined : args.splice(i, 2)[1]
  }
  const [model, flight] = [opt('--model'), opt('--flight')]
  const [fileName, id] = args
  const root = path.resolve(import.meta.dirname, '../../public')
  const models = (JSON.parse(readFileSync(path.join(root, 'models/manifest.json'), 'utf8')) as { models: { id: string; name?: string }[] }).models
  try {
    const modelList = `The models:\n${models.map((m) => `  ${m.id}${m.name ? `  ${m.name}` : ''}`).join('\n')}`
    if (fileName === undefined || id === undefined) throw new Error(`usage: node tools/scenarios/new.ts <flight file> <id> --model <model id> [--flight <n>]\n${modelList}`)
    if (!PACKAGE_ID.test(id)) throw new Error(`The id ${JSON.stringify(id)} cannot name a folder: 1 to 64 letters, digits, _ or -, starting with a letter or a digit.`)
    if (model === undefined || !models.some((m) => m.id === model)) throw new Error(`--model must name a model. ${modelList}`)
    const dir = path.join(root, 'scenarios', id)
    if (existsSync(dir)) throw new Error(`${dir} is there already. Pick another id, or remove the folder first.`)
    const files = packageFromFlight(readFileSync(fileName, 'utf8'), { id, model, fileName: path.basename(fileName), flight: flight === undefined ? undefined : Number(flight) })
    mkdirSync(dir, { recursive: true })
    for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text)
    const scn = parseScenario({ base: '', manifest: JSON.parse(files['scenario.json']), track: files['track.csv'], events: files['events.csv'], transcript: null, present: { body: false, finLogo: false, audio: false } })
    const physics = physicsReport(scn.track)
    console.log(`${dir}: ${scn.track.length} track rows, ${sToClock(scn.start)} to ${sToClock(scn.end)} UTC on ${scn.date}. It plays at /?scenario=${id}.`)
    if (physics.problems.length > 0) {
      throw new Error(`The track does not fly like an aircraft, so the package is not ready (docs/scenario-sdk.md, section 10):\n${physics.problems.map((p) => `  ${p}`).join('\n')}`)
    }
    if (physics.rows === 0) console.log('The file gives no airspeed, so the physics check cannot judge this track: watch the whole flight in the app (docs/scenario-sdk.md, section 5.4).')
    console.log('Next: docs/scenario-sdk.md, section 5.4.')
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}
