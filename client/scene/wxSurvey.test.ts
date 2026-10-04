// client/scene/wxSurvey.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PUFF_FILL, SEV, type CloudSpec } from './cloudField.ts'
import { BANDS, FIELD_KM, FIELD_N, buildField } from './wxField.ts'
import { NEAR_MAX_KM, survey } from './wxSurvey.ts'

const TEXEL_KM = FIELD_KM / FIELD_N
const KM_PER_DEG = 111.195
const LAT = 37.6
const LON = -122.4
const RAD = Math.PI / 180
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol
/** The place eastKm and northKm of (lat, lon), on the field's flat map round it. */
const at = (eastKm: number, northKm: number, lat = LAT, lon = LON): { lat: number; lon: number } =>
  ({ lat: lat + northKm / KM_PER_DEG, lon: lon + eastKm / (KM_PER_DEG * Math.cos(lat * RAD)) })
/** A puff whose base and top are given; wide: its billboard's width, m. */
function puff(baseM: number, topM: number, o: Partial<CloudSpec> & { eastKm?: number; northKm?: number; wide?: number } = {}): CloudSpec {
  const { eastKm = 0, northKm = 0, wide = 3000, ...rest } = o
  return {
    ...at(eastKm, northKm), heightM: (baseM + topM) / 2, groundM: 0, scale: [wide, (topM - baseM) / PUFF_FILL], maxSize: [20, 12, 12], slice: 0.3,
    brightness: 1, tint: 0, farKm: 100, ...rest,
  }
}
/** Where the middle of the field's texel (i, j) is, km east and north of its middle. */
const middleOf = (i: number, j: number): [number, number] => [(i - (FIELD_N - 1) / 2) * TEXEL_KM, (j - (FIELD_N - 1) / 2) * TEXEL_KM]

test('survey: the clear-air map: how far it is from each cell of 1.25 km to a band\'s weather (R, G the two low layer bands, B the two high, A the towers; a byte is 0.2 km, 51 km at most, the first row the south), never more than it truly is and not much less; and which bands rain', () => {
  const f = buildField([
    puff(1500, 2500, { eastKm: 22, northKm: -31 }), puff(7000, 8700, { eastKm: -80, northKm: 60, wide: 10_000, sev: SEV.light }),
    puff(1000, 9000, { eastKm: 100, northKm: 100, wide: 8000, tower: 1, sev: SEV.storm }), puff(3000, 4000, { eastKm: -120, northKm: -120 }), puff(9000, 10_000, { eastKm: -80, northKm: -20 }),
  ], LAT, LON)
  const s = survey(f)
  const N = 256
  assert.equal(NEAR_MAX_KM, 51)
  assert.deepEqual([s.near.width, s.near.height, s.near.data.length], [N, N, N * N * 4])
  const CELL = FIELD_KM / N
  /** The cell of a place, R, G, B, A, in km. */
  const cell = (eastKm: number, northKm: number): number[] => {
    const o = (Math.floor((northKm + 160) / CELL) * N + Math.floor((eastKm + 160) / CELL)) * 4
    return [...s.near.data.subarray(o, o + 4)].map((b) => (b / 255) * NEAR_MAX_KM)
  }
  assert.deepEqual(cell(22, -31), [0, 51, 51, 51], 'at the cumulus: the lowest band is here, the others more than 51 km off')
  assert.deepEqual(cell(22, 31).map(Math.round), [51, 51, 51, 51], 'north is not south')
  assert.equal(cell(-80, 60)[2], 0, 'the rain deck, based at 7,000 m: a high band')
  assert.equal(cell(-80, -20)[2], 0, 'cirrus at 9,000 m: the other high band, the same channel')
  assert.equal(cell(-120, -120)[1], 0, 'based at 3,000 m: the second band')
  assert.equal(cell(100, 100)[3], 0, 'the tower')
  assert.ok(near(cell(42, -31)[0], 17.5, 1.5), `20 km east of the cumulus (its rim is 1 km out): ${cell(42, -31)[0]} km, a little under the 19 there are`)
  // Against the field itself: from a cell's middle to the middle of the nearest texel with cover, band by band.
  const CHANNEL = [0, 1, 2, 2, 3]
  const covered: [number, number][][] = [[], [], [], []]
  for (let b = 0; b < BANDS; b++) f.cov[b].forEach((c, o) => { if (c > 0) covered[CHANNEL[b]].push(middleOf(o % FIELD_N, Math.floor(o / FIELD_N))) })
  assert.ok(covered.every((list) => list.length > 0))
  let [over, under] = [-Infinity, -Infinity]
  for (let j = 3; j < N; j += 9) {
    for (let i = 5; i < N; i += 9) {
      const [x, y] = [(i + 0.5) * CELL - 160, (j + 0.5) * CELL - 160]
      for (let c = 0; c < 4; c++) {
        const truly = Math.min(...covered[c].map(([cx, cy]) => Math.hypot(cx - x, cy - y)))
        const said = (s.near.data[(j * N + i) * 4 + c] / 255) * NEAR_MAX_KM
        over = Math.max(over, said - truly)
        under = Math.max(under, 0.92 * Math.min(truly, NEAR_MAX_KM) - said)
      }
    }
  }
  assert.ok(over <= 0, `never further than it is (a ray strides that far unseen): ${over} km over`)
  assert.ok(under <= 1.6, `and not much nearer: ${under} km under 92 % of it`)
  assert.deepEqual(s.wet, [false, false, true, false, true], 'the deck of light rain and the storm')
  const none = survey(buildField([], LAT, LON))
  assert.deepEqual(none.wet, [false, false, false, false, false])
  assert.ok(none.near.data.every((b) => b === 255), 'no weather: clear everywhere')
})
