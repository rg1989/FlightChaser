// How long the making of a weather field takes, piece by piece, in Node on the check machine (not a test of anything: it prints).
//   .planning/tools/remote-check.sh test .planning/tools/wx-build-time.test.ts
// Two skies: the demo sky (wxDemo.ts), and a heavy one of 700 specs (decks over half the square, cumulus, a line of storms), which is
// the most a build is ever given (cloudField.ts MAX_CLOUDS). Each piece is run once cold (as a page runs code it calls once every few
// minutes) and then warm (the median of 15).
import { test } from 'node:test'
import { PUFF_FILL, SEV, sequence, type CloudSpec } from '../../client/scene/cloudField.ts'
import { noiseAtlas } from '../../client/scene/cloudNoise.ts'
import { demoSky } from '../../client/scene/wxDemo.ts'
import { buildField, fieldAtlas } from '../../client/scene/wxField.ts'
import { survey } from '../../client/scene/wxSurvey.ts'

const LAT = 37.6
const LON = -122.4
const KM_PER_DEG = 111.195

function heavySky(): CloudSpec[] {
  const r = sequence(11)
  const at = (eastKm: number, northKm: number): { lat: number; lon: number } =>
    ({ lat: LAT + northKm / KM_PER_DEG, lon: LON + eastKm / (KM_PER_DEG * Math.cos((LAT * Math.PI) / 180)) })
  const puff = (baseM: number, topM: number, wide: number, eastKm: number, northKm: number, o: Partial<CloudSpec> = {}): CloudSpec => ({
    ...at(eastKm, northKm), heightM: (baseM + topM) / 2, groundM: 0, scale: [wide, (topM - baseM) / PUFF_FILL], maxSize: [20, 12, 12], slice: 0.3, brightness: 1, tint: 0, farKm: 150, ...o,
  })
  const out: CloudSpec[] = []
  for (let k = 0; k < 300; k++) out.push(puff(1200, 2200, 2500 + 2500 * r(), -150 + 300 * r(), -150 + 300 * r())) // cumulus everywhere
  for (let k = 0; k < 220; k++) out.push(puff(3000, 4200, 14_000 + 8000 * r(), -150 + 150 * r(), -150 + 300 * r())) // a deck over the west half
  for (let k = 0; k < 100; k++) out.push(puff(9000, 10_000, 20_000 + 10_000 * r(), -150 + 300 * r(), 150 * r(), { sev: SEV.cloud })) // cirrus over the north
  for (let k = 0; k < 80; k++) out.push(puff(1000, 4000 + 7000 * r(), 8000 + 4000 * r(), 40 + 60 * r(), -120 + 240 * r(), { tower: k % 10, sev: SEV.storm })) // a line of storms
  return out
}

function time(what: string, f: () => unknown): string {
  let t = performance.now()
  f()
  const cold = performance.now() - t
  const warm: number[] = []
  for (let k = 0; k < 15; k++) {
    t = performance.now()
    f()
    warm.push(performance.now() - t)
  }
  warm.sort((a, b) => a - b)
  return `${what}: cold ${cold.toFixed(1)} ms, warm ${warm[7].toFixed(1)} ms`
}

test('how long the field takes to make', () => {
  const lines: string[] = []
  const t = performance.now()
  noiseAtlas()
  lines.push(`noiseAtlas (once): ${(performance.now() - t).toFixed(0)} ms`)
  for (const [name, specs] of [['demo sky', demoSky(LAT, LON, 0, { altM: 5000, startKm: 60 }).specs], ['heavy sky', heavySky()]] as const) {
    const f = buildField(specs, LAT, LON)
    lines.push(`${name} (${specs.length} specs; bands ${f.lo.map((lo, b) => (lo > f.hi[b] ? '-' : 'x')).join('')}):`)
    lines.push(`  ${time('buildField', () => buildField(specs, LAT, LON))}`)
    lines.push(`  ${time('fieldAtlas', () => fieldAtlas(f))}`)
    lines.push(`  ${time('survey', () => survey(f))}`)
    lines.push(`  ${time('new arrays only (20 × 512²)', () => Array.from({ length: 20 }, () => new Float32Array(512 * 512)))}`)
  }
  console.log(lines.join('\n'))
})
