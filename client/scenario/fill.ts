// client/scenario/fill.ts
// A replay knows the whole flight, so where its samples are far apart (a file with a point every half minute, a hole in
// the reception of a recording) the aircraft should fly from one to the next, not coast and wait as the live chase must.
// The estimator a replay runs on (track.ts) is built for a sample every second or two: fed sparse ones it stops after 8 s
// (EXTRAP_S) and, across a turn, jumps to the next. So the gaps are filled first: a point every 2 s on the cubic through
// the two samples that leaves the first with its velocity and meets the second with its own (the speed and track it
// reported, or what the positions either side give), in latitude and longitude. Heights run straight from one to the
// other. Each filled point carries the speed and track of the curve, so the estimator sees one consistent path.
import { geoidN } from '../../shared/geoid.ts'
import type { Sample } from '../../shared/types.ts'

const FILL_OVER_MS = 8000 // track.ts EXTRAP_S: a longer gap is filled
const STEP_MS = 2000
const KT = 1852 / 3600
const DEG = 180 / Math.PI
const R = 6_371_000
const TAXI_KT = 3 // slower than this a reported track is noise (track.ts TAXI_MS)

const wrap180 = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180
const mix = (a: number | null, b: number | null, u: number): number | null => (a === null || b === null ? null : a + (b - a) * u)

/**
 * A sample's velocity in degrees of latitude and of longitude a second: the speed and track it reported, unless the way
 * to it and the way from it both say something else by more than half (a stale or wrong report: a track of 270° in the
 * middle of a flight east). Then, and where none was reported, the positions either side give it. One side alone may
 * differ: across a long gap the aircraft may have turned unseen, and its report is then the better guide.
 * ponytail: where a file's positions are multilateration's (hundreds of metres off) or bent by GPS interference, the path
 * through them asks for speeds no aircraft flies and the replay jerks; smoothing such a file as tools/scenarios/fuse.ts
 * smooths a scenario's sources is the way up.
 */
function velocity(s: readonly Sample[], i: number): [number, number] {
  const p = s[i]
  const perM = DEG / R
  const cos = Math.cos(p.lat / DEG)
  if (p.gsKt !== null && p.gsKt < TAXI_KT) return [0, 0]
  /** From sample a to sample b in degrees a second; null when they are the same sample. */
  const between = (a: Sample, b: Sample): [number, number] | null => (b.tMs > a.tMs ? [((b.lat - a.lat) * 1000) / (b.tMs - a.tMs), (wrap180(b.lon - a.lon) * 1000) / (b.tMs - a.tMs)] : null)
  const [prev, next] = [s[Math.max(0, i - 1)], s[Math.min(s.length - 1, i + 1)]]
  if (p.gsKt !== null && p.trackDeg !== null) {
    const v = p.gsKt * KT
    const [vn, ve] = [v * Math.cos(p.trackDeg / DEG), v * Math.sin(p.trackDeg / DEG)]
    const clashes = (c: [number, number] | null): boolean => c !== null && Math.hypot(vn - c[0] / perM, ve - (c[1] / perM) * cos) > 0.5 * Math.max(v, Math.hypot(c[0] / perM, (c[1] / perM) * cos))
    const sides = [between(prev, p), between(p, next)].filter((c) => c !== null)
    if (sides.length === 0 || !sides.every(clashes)) return [vn * perM, (ve * perM) / cos]
  }
  return between(prev, next) ?? [0, 0]
}

/** The samples (oldest first) with every gap of over 8 s filled, a point each 2 s or less. */
export function fillGaps(samples: readonly Sample[]): Sample[] {
  const out: Sample[] = []
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i]
    out.push(a)
    const b = samples[i + 1]
    if (b === undefined || b.tMs - a.tMs <= FILL_OVER_MS) continue
    const T = (b.tMs - a.tMs) / 1000
    const [va, vb] = [velocity(samples, i), velocity(samples, i + 1)]
    const d = [b.lat - a.lat, wrap180(b.lon - a.lon)]
    const n = Math.ceil((b.tMs - a.tMs) / STEP_MS)
    for (let k = 1; k < n; k++) {
      const u = k / n
      // Cubic Hermite from 0 to d over T seconds, and its rate.
      const at = (j: number): number => (u ** 3 - 2 * u * u + u) * T * va[j] + (3 * u * u - 2 * u ** 3) * d[j] + (u ** 3 - u * u) * T * vb[j]
      const rate = (j: number): number => (3 * u * u - 4 * u + 1) * va[j] + ((6 * u - 6 * u * u) * d[j]) / T + (3 * u * u - 2 * u) * vb[j]
      const lat = Math.max(-90, Math.min(90, a.lat + at(0)))
      const lon = wrap180(a.lon + at(1))
      const vn = (rate(0) / DEG) * R
      const ve = (rate(1) / DEG) * R * Math.cos(lat / DEG)
      const gs = Math.hypot(ve, vn)
      // Between the ground and the air: on the ground until the sample that says it flies; in the air, at a height no
      // one reported (the estimator carries the descent on), until the one that says it has landed.
      const onGround = a.onGround
      const tMs = Math.round(a.tMs + u * (b.tMs - a.tMs))
      out.push({
        ...a, tMs, rxMs: tMs, lat, lon, onGround,
        altBaroFt: onGround ? null : mix(a.altBaroFt, b.onGround ? null : b.altBaroFt, u),
        altGeomFt: onGround ? null : mix(a.altGeomFt, b.onGround ? null : b.altGeomFt, u),
        gsKt: gs / KT, trackDeg: gs > 0.5 ? (Math.atan2(ve, vn) * DEG + 360) % 360 : null,
        trueHeadingDeg: null, rollDeg: null, baroRateFpm: null, geomRateFpm: null, iasKt: null, tasKt: null,
        nM: geoidN(lat, lon),
      })
    }
  }
  return out
}
