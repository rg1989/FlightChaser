// client/scene/sculptInside.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PUFF_FILL } from './cloudField.ts'
import { EDGE_M, bodyAt, cloudBetween, type Depth, type Place } from './sculptInside.ts'
import { sculptMesh } from './sculptMesh.ts'
import { buildField, type FieldSpec } from './wxField.ts'

const [LAT, LON] = [47, 8]
const KM_LON = 111.195 * Math.cos((LAT * Math.PI) / 180)
const disc = (baseM: number, topM: number, wideM: number, sev = 0, east = 0, tower?: number): FieldSpec => ({
  lat: LAT, lon: LON + east / KM_LON, heightM: (baseM + topM) / 2, scale: [wideM, (topM - baseM) / PUFF_FILL], sev, tower,
})
const east = (km: number, altM: number): Place => ({ lat: LAT, lon: LON + km / KM_LON, altM })
// A deck of light rain from 2,000 to 3,500 m, its rim about 22 km out; and a storm 60 km east, 1,000 to 11,000 m.
const field = buildField([disc(2000, 3500, 80_000, 1), disc(1000, 11_000, 30_000, 3, 60, 0)], LAT, LON)
const mesh = sculptMesh(field)
const depth = (p: Place): Depth => bodyAt(mesh, field, p.lat, p.lon, p.altM, { depth: 0, sev: 0 })

test('bodyAt: wholly in a body well inside it, with its severity; outside above, below and beside it', () => {
  const mid = depth(east(0, 2750))
  assert.equal(mid.depth, 1)
  assert.ok(Math.abs(mid.sev - 1) < 1e-3)
  assert.equal(depth(east(0, 3600)).depth, 0, 'over its top')
  assert.equal(depth(east(0, 1900)).depth, 0, 'under its base')
  assert.equal(depth(east(35, 2750)).depth, 0, 'beside it')
  const storm = depth(east(60, 9000))
  assert.deepEqual([storm.depth, Math.round(storm.sev)], [1, 3])
  assert.deepEqual(bodyAt(null, field, LAT, LON, 2750, { depth: 5, sev: 5 }), { depth: 0, sev: 0 })
  assert.deepEqual(bodyAt(mesh, field, LAT + 3, LON, 2750, { depth: 5, sev: 5 }), { depth: 0, sev: 0 }, 'outside the field\'s square')
})

test('bodyAt: the depth grows from nothing at the surface to 1 from EDGE_M inside it', () => {
  assert.ok(Math.abs(depth(east(0, 3500 - EDGE_M / 2)).depth - 0.5) < 0.02, 'half-way under the top')
  assert.ok(Math.abs(depth(east(0, 2000 + EDGE_M / 4)).depth - 0.25) < 0.02, 'a quarter over the base')
  assert.equal(depth(east(0, 3500 - EDGE_M)).depth, 1)
})

test('bodyAt: it is the body as drawn, not the field: over a body\'s rounded shoulder there is no cloud, though the field has cover there', () => {
  // 1 km inside the deck's rim the top sheet is still rising: a place just under the deck's full top there is over the body.
  let rim = 0
  for (let km = 15; km < 30; km += 0.05) if (depth(east(km, 2100)).depth > 0) rim = km
  assert.ok(rim > 20 && rim < 26, `${rim}`)
  assert.equal(depth(east(rim - 0.4, 3400)).depth, 0)
  assert.ok(depth(east(rim - 0.4, 2100)).depth > 0)
  assert.equal(depth(east(rim - 3, 3400)).depth > 0.5, true, 'well inside, the body is at its full height')
})

test('cloudBetween: the cloud on a line is the depth added up along it, km, with the severity of what is met', () => {
  const through = cloudBetween(mesh, field, east(-10, 2750), east(10, 2750), 16, { depth: 0, sev: 0 })
  assert.ok(Math.abs(through.depth - 20) < 0.01 && Math.abs(through.sev - 1) < 1e-3, `${through.depth}`)
  const half = cloudBetween(mesh, field, east(0, 2750), east(0, 4250), 30, { depth: 0, sev: 0 }) // straight up: 750 m of it in the deck
  assert.ok(Math.abs(half.depth - 0.69) < 0.06, `${half.depth}`)
  assert.deepEqual(cloudBetween(mesh, field, east(-10, 5000), east(10, 5000), 8, { depth: 9, sev: 9 }), { depth: 0, sev: 0 }, 'over the deck: none')
  const near = cloudBetween(mesh, field, east(0, 2750), east(0.25, 2760), 4, { depth: 0, sev: 0 }) // a chase camera and its aircraft, both in the deck
  assert.ok(Math.abs(near.depth - 0.25) < 0.005)
  assert.deepEqual(cloudBetween(null, null, east(0, 2750), east(1, 2750), 4, { depth: 9, sev: 9 }), { depth: 0, sev: 0 })
})
