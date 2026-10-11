// client/scenario/routePath.ts
// A scenario's whole flight for the top-down map: its path as the route line draws it (scene/routeLine.ts: coloured by
// altitude), the timeline's marks at the places the aircraft was then, and the box that holds it all. Sampled from the
// pose track the aircraft itself flies (pose.ts), so its icon and the marks sit on the line.
import type { PathPoint } from '../scene/routeLine.ts'
import { PoseTrack } from './pose.ts'
import { marks } from './timeline.ts'
import type { Scenario } from './types.ts'

/** A timeline mark where the aircraft was at its time. */
export interface RouteMark {
  t: number
  label: string
  lat: number
  lon: number
  hM: number
}

export interface ScenarioRoute {
  path: PathPoint[] // tMs: the scenario clock in ms
  marks: RouteMark[]
  // ponytail: no flight across the antimeridian yet; one would need west > east here, as RectDeg allows.
  box: { west: number; south: number; east: number; north: number }
}

const MAX_POINTS = 4000 // a point a second up to 67 minutes, then evenly fewer: a 3-hour flight has one every 2.7 s

export function scenarioRoute(s: Pick<Scenario, 'track' | 'events' | 'start' | 'end'>): ScenarioRoute {
  const pose = new PoseTrack(s.track)
  const n = Math.max(1, Math.min(MAX_POINTS, Math.ceil(s.end - s.start)))
  const path: PathPoint[] = []
  const box = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity }
  for (let i = 0; i <= n; i++) {
    const t = s.start + ((s.end - s.start) * i) / n
    const p = pose.stateAt(t) // one reused object: copied here
    path.push({ tMs: t * 1000, lat: p.lat, lon: p.lon, hM: p.hM, altFt: p.altBaroFt, onGround: p.onGround })
    box.west = Math.min(box.west, p.lon)
    box.east = Math.max(box.east, p.lon)
    box.south = Math.min(box.south, p.lat)
    box.north = Math.max(box.north, p.lat)
  }
  const on = marks(s.events).filter((m) => m.t >= s.start && m.t <= s.end).map((m) => {
    const p = pose.stateAt(m.t)
    return { t: m.t, label: m.label, lat: p.lat, lon: p.lon, hM: p.hM }
  })
  return { path, marks: on, box }
}
