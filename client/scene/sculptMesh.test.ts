// client/scene/sculptMesh.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PUFF_FILL } from './cloudField.ts'
import { BAND_TRIANGLES, SHADOW_ALPHA, SHADOW_N, SHADOW_RGB, SHADOW_SHIFT_KM, SHOULDER_MAX_KM, VERTEX_FLOATS, sculptMesh, shadowImage, shoulder, type SculptBand } from './sculptMesh.ts'
import { buildField, type FieldSpec } from './wxField.ts'

const [LAT, LON] = [47, 8]
/** A cloud wideM across from baseM to topM, at km east and north of the field's middle. */
const disc = (baseM: number, topM: number, wideM: number, sev = 0, east = 0, north = 0, tower?: number): FieldSpec => ({
  lat: LAT + north / 111.195, lon: LON + east / (111.195 * Math.cos((LAT * Math.PI) / 180)), heightM: (baseM + topM) / 2, scale: [wideM, (topM - baseM) / PUFF_FILL], sev, tower,
})
const F = VERTEX_FLOATS
const key = (v: Float32Array, i: number): string => `${v[i * F]},${v[i * F + 1]},${v[i * F + 2]}`

/** The band's triangles with corners in the same place joined: how many edges are not shared by exactly two triangles, and how many separate bodies there are. */
function shape(b: SculptBand): { open: number; bodies: number } {
  const id = new Map<string, number>()
  const of = (i: number): number => {
    const k = key(b.vertices, i)
    if (!id.has(k)) id.set(k, id.size)
    return id.get(k)!
  }
  const edges = new Map<string, number>()
  const parent: number[] = []
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  for (let t = 0; t < b.indices.length; t += 3) {
    const c = [of(b.indices[t]), of(b.indices[t + 1]), of(b.indices[t + 2])]
    for (const x of c) parent[x] ??= x
    for (let e = 0; e < 3; e++) {
      const [p, q] = [c[e], c[(e + 1) % 3]]
      const k = p < q ? `${p}-${q}` : `${q}-${p}`
      edges.set(k, (edges.get(k) ?? 0) + 1)
      parent[find(p)] = find(q)
    }
  }
  let open = 0
  for (const count of edges.values()) if (count !== 2) open++
  return { open, bodies: new Set(parent.map((_, x) => find(x))).size }
}

test('shoulder: nothing at the rim, the whole from one width in, rising between and level where it is whole', () => {
  assert.equal(shoulder(-1), 0)
  assert.equal(shoulder(0), 0)
  assert.equal(shoulder(1), 1)
  assert.equal(shoulder(7), 1)
  let last = 0
  for (let u = 0.05; u < 1; u += 0.05) {
    assert.ok(shoulder(u) > last)
    last = shoulder(u)
  }
  assert.ok(1 - shoulder(0.95) < 0.01, 'it comes to the top level')
})

test('sculptMesh: an empty field gives nothing', () => {
  const m = sculptMesh(buildField([], LAT, LON))
  assert.deepEqual(m.bands, [])
  assert.equal(m.triangles, 0)
  assert.equal(m.radiusM, 0)
})

test('sculptMesh: one disc of cover is one closed body, from its base to its top, with a rim of no thickness', () => {
  const m = sculptMesh(buildField([disc(1000, 3000, 40_000, 2)], LAT, LON))
  assert.equal(m.bands.length, 1)
  const b = m.bands[0]
  assert.equal(b.band, 0)
  assert.deepEqual(shape(b), { open: 0, bodies: 1 })
  assert.equal(m.triangles, b.indices.length / 3)
  const v = b.vertices
  const n = v.length / F
  let [lo, hi, rim] = [Infinity, -Infinity, 0]
  const under = new Set<string>()
  for (let i = 0; i < n; i++) if (v[i * F + 8] === 1) under.add(key(v, i))
  for (let i = 0; i < n; i++) {
    const h = v[i * F + 7]
    lo = Math.min(lo, h)
    hi = Math.max(hi, h)
    assert.ok(Math.abs(v[i * F + 6] - 2) < 1e-3, 'the severity is the disc\'s')
    assert.ok(Math.abs(Math.hypot(v[i * F + 3], v[i * F + 4], v[i * F + 5]) - 1) < 1e-3, 'a normal is a unit long')
    if (v[i * F + 8] === 1) {
      assert.ok(Math.abs(h - 1000) < 1, 'the underside is at the base')
      assert.ok(v[i * F + 5] < -0.99, 'and looks down')
    } else if (under.has(key(v, i))) {
      rim++ // a corner of the top sheet in the same place as one of the underside
      assert.ok(Math.abs(h - 1000) < 1, 'the rim is at the base: no thickness')
    } else assert.ok(h > 1000 && v[i * F + 5] > 0, 'the top sheet is over the base and looks up')
  }
  assert.ok(Math.abs(lo - 1000) < 1 && Math.abs(hi - 3000) < 1, `from the base to the top: ${lo} … ${hi}`)
  assert.ok(rim > 20, 'the rim goes all the way round')
  // The disc's radius is 0.36 of its width (14.4 km); the cover is 0.4 a little inside it.
  let far = 0
  for (let i = 0; i < n; i++) far = Math.max(far, Math.hypot(v[i * F], v[i * F + 1]))
  assert.ok(far > 9_000 && far < 14_400, `the rim's reach: ${far}`)
  assert.ok(Math.abs(m.radiusM - far) < 500)
})

test('sculptMesh: two bands over each other are two bodies with no corner in common', () => {
  const m = sculptMesh(buildField([disc(1000, 2500, 30_000), disc(5000, 6000, 30_000, 1)], LAT, LON))
  assert.deepEqual(m.bands.map((b) => b.band), [0, 2])
  const places = m.bands.map((b) => new Set(Array.from({ length: b.vertices.length / F }, (_, i) => key(b.vertices, i))))
  for (const p of places[0]) assert.ok(!places[1].has(p))
  for (const [k, b] of m.bands.entries()) {
    assert.deepEqual(shape(b), { open: 0, bodies: 1 })
    assert.ok(b.indices.every((i) => i < b.vertices.length / F), 'a band\'s triangles name its own corners')
    const heights = Array.from({ length: b.vertices.length / F }, (_, i) => b.vertices[i * F + 7])
    assert.ok(Math.min(...heights) >= [999, 4999][k] && Math.max(...heights) <= [2501, 6001][k])
  }
})

test('sculptMesh: a storm in the towers\' band stands to its top, and a cloud at the field\'s edge is closed there', () => {
  const m = sculptMesh(buildField([disc(1000, 11_000, 20_000, 3, 0, 0, 0), disc(1500, 2500, 60_000, 0, 150, 0)], LAT, LON))
  assert.deepEqual(m.bands.map((b) => b.band), [0, 4])
  for (const b of m.bands) assert.equal(shape(b).open, 0)
  const tower = m.bands[1].vertices
  let hi = 0
  for (let o = 0; o < tower.length; o += F) hi = Math.max(hi, tower[o + 7])
  assert.ok(Math.abs(hi - 11_000) < 1)
})

test('sculptMesh: a cumulus two texels wide is a round pebble, not a four-sided gem; a wide deck is mostly a few large triangles', () => {
  const small = sculptMesh(buildField([disc(1500, 2300, 3500)], LAT, LON)).bands[0]
  assert.deepEqual(shape(small), { open: 0, bodies: 1 })
  const rim = new Set<string>()
  for (let i = 0; i < small.vertices.length / F; i++) if (small.vertices[i * F + 8] === 0 && Math.abs(small.vertices[i * F + 7] - 1500) < 1) rim.add(key(small.vertices, i))
  assert.ok(rim.size >= 12, `its outline has ${rim.size} corners`)
  // A deck 100 km wide: 2,900 km² inside its rim, 119,000 triangles were it cut finely all over. Its level middle is not.
  const deck = sculptMesh(buildField([disc(3000, 4000, 100_000)], LAT, LON))
  assert.deepEqual(shape(deck.bands[0]), { open: 0, bodies: 1 })
  assert.ok(deck.triangles < 50_000, `${deck.triangles} triangles`)
})

test('sculptMesh: a band that would take too many triangles is cut more coarsely, and is closed still', () => {
  // Ragged cover everywhere: 1,600 small clouds, no level part.
  const specs: FieldSpec[] = []
  for (let y = -150; y <= 150; y += 7.5) for (let x = -150; x <= 150; x += 7.5) specs.push(disc(1000 + ((x * 7 + y * 13) % 400), 2600, 9000 + ((x * 3 + y * 5) % 3000), 0, x, y))
  const m = sculptMesh(buildField(specs, LAT, LON))
  assert.equal(m.bands.length, 1)
  const finest = 4 * 1024 * 1024 * 0.6 // were it cut finely all over: more than half the square is cover
  assert.ok(finest > 10 * BAND_TRIANGLES && m.triangles <= 262_144, `${m.triangles} triangles: the coarsest cut's most`)
  assert.equal(shape(m.bands[0]).open, 0)
})

test('sculptMesh: a top rises by the distance in from the rim: a deck is level from a shoulder\'s width in, a small cloud is a dome that comes to its top, a storm a rounded tower', () => {
  /** The top sheet's corners: how far each is from the body's middle (km) and how high (m). */
  const tops = (b: SculptBand): [number, number][] => Array.from({ length: b.vertices.length / F }, (_, i) => i).filter((i) => b.vertices[i * F + 8] === 0)
    .map((i): [number, number] => [Math.hypot(b.vertices[i * F], b.vertices[i * F + 1]) / 1000, b.vertices[i * F + 7]])
  // A deck 1.5 km thick, its rim about 22 km out: the shoulder is as wide as the deck is thick.
  const deck = tops(sculptMesh(buildField([disc(2000, 3500, 80_000)], LAT, LON)).bands[0])
  const rim = Math.max(...deck.map(([r]) => r))
  assert.ok(rim > 20 && rim < 26, `${rim}`)
  for (const [r, h] of deck) {
    if (r < rim - 1.8) assert.ok(Math.abs(h - 3500) < 1, `level at ${r} km: ${h}`)
    else if (r > rim - 1.2 && r < rim - 0.3) assert.ok(h > 2000 && h < 3499, `the shoulder at ${r} km: ${h}`)
  }
  const half = deck.filter(([r]) => Math.abs(rim - 0.75 - r) < 0.1).map(([, h]) => h) // half-way up the shoulder's width: 71 % of the way up
  assert.ok(half.length > 10 && half.every((h) => Math.abs(h - (2000 + 1500 * Math.SQRT1_2)) < 200), `${half.slice(0, 5)}`)
  // A cumulus 2.5 km across and 1.2 km thick: narrower than its shoulder would be, it still comes to its top, in its middle only.
  const small = tops(sculptMesh(buildField([disc(1500, 2700, 3500)], LAT, LON)).bands[0])
  assert.ok(Math.abs(Math.max(...small.map(([, h]) => h)) - 2700) < 1)
  assert.ok(small.filter(([, h]) => h > 2650).every(([r]) => r < 0.5), 'only its middle is at the top: a dome, not a table')
  // A storm 10 km tall: its shoulder is SHOULDER_MAX_KM wide, not 10 km.
  const storm = tops(sculptMesh(buildField([disc(1000, 11_000, 30_000, 3, 0, 0, 0)], LAT, LON)).bands[0])
  const edge = Math.max(...storm.map(([r]) => r))
  for (const [r, h] of storm) if (r < edge - SHOULDER_MAX_KM - 0.5) assert.ok(Math.abs(h - 11_000) < 1, `at ${r} km of ${edge}: ${h}`)
  assert.ok(storm.some(([r, h]) => r > edge - SHOULDER_MAX_KM + 0.5 && h < 10_000))
})

test('shadowImage: a faint tint under each body, soft at its rim, the north at the top; moved away from the light by the body\'s height, a little', () => {
  assert.equal(sculptMesh(buildField([], LAT, LON)).shadow, null)
  assert.equal(shadowImage([], null), null)
  const KM = 320 / SHADOW_N // a pixel
  /** The shadow's weight (its alphas added), and its middle: km east and north of the field's. */
  const middle = (im: { data: Uint8ClampedArray }): { sum: number; east: number; north: number; most: number } => {
    let [sum, x, y, most] = [0, 0, 0, 0]
    for (let j = 0; j < SHADOW_N; j++) {
      for (let i = 0; i < SHADOW_N; i++) {
        const a = im.data[(j * SHADOW_N + i) * 4 + 3]
        sum += a
        x += a * ((i + 0.5) * KM - 160)
        y += a * (160 - (j + 0.5) * KM)
        most = Math.max(most, a)
      }
    }
    return { sum, east: x / sum, north: y / sum, most }
  }
  // A deck 30 km wide, 40 km north-east of the middle, its base at 1,000 m; the light overhead.
  const deck = sculptMesh(buildField([disc(1000, 2500, 30_000, 0, 40, 40)], LAT, LON))
  const im = deck.shadow!
  assert.deepEqual([im.width, im.height, im.data.length], [SHADOW_N, SHADOW_N, SHADOW_N * SHADOW_N * 4])
  const m = middle(im)
  assert.ok(Math.abs(m.east - 40) < 0.7 && Math.abs(m.north - 40) < 0.7, `under the deck: ${m.east}, ${m.north}`)
  assert.equal(m.most, Math.round(SHADOW_ALPHA * 255), 'faint: the map under it stays readable')
  assert.ok(SHADOW_ALPHA <= 0.25)
  const at = (east: number, north: number): number[] => [...im.data.subarray((Math.floor((160 - north) / KM) * SHADOW_N + Math.floor((east + 160) / KM)) * 4).subarray(0, 4)]
  assert.deepEqual(at(40, 40), [...SHADOW_RGB, Math.round(SHADOW_ALPHA * 255)])
  assert.equal(at(40, -40)[3], 0, 'none to the south: the first row is the north')
  assert.equal(at(-40, 40)[3], 0)
  const soft = new Set(im.data.filter((_, k) => k % 4 === 3))
  assert.ok(soft.size > 6, 'its edge runs through the alphas between')
  // The light from the west, 45° up: the shadow lies a kilometre east (the base's height); a deck with its base at 8 km no further than SHADOW_SHIFT_KM.
  const west: [number, number, number] = [-Math.SQRT1_2, 0, Math.SQRT1_2]
  const low = middle(sculptMesh(buildField([disc(1000, 2500, 30_000, 0, 40, 40)], LAT, LON), west).shadow!)
  assert.ok(low.east - m.east > 0.4 && low.east - m.east < 1.7 && Math.abs(low.north - m.north) < 0.3, `${low.east - m.east}`)
  const high = middle(sculptMesh(buildField([disc(8000, 9500, 30_000, 0, 40, 40)], LAT, LON), west).shadow!)
  assert.ok(high.east - m.east > 1.2 && high.east - m.east < SHADOW_SHIFT_KM + 0.7, `${high.east - m.east}`)
  // The light under the horizon (night): no further either.
  const night = middle(sculptMesh(buildField([disc(8000, 9500, 30_000, 0, 40, 40)], LAT, LON), [1, 0, -0.2]).shadow!)
  assert.ok(Math.abs(night.east - m.east) < SHADOW_SHIFT_KM + 0.7)
})

test('sculptMesh: an overcast sky in four layers with storms through them is built within its triangles (1.3 s under Node alone on the check machine: no time is asserted, the whole suite runs many files at once)', () => {
  // Decks 300 km wide in each layer band, their rims ragged with smaller clouds, and twelve storms.
  const specs: FieldSpec[] = [disc(900, 1800, 600_000), disc(2600, 3800, 560_000), disc(5200, 6500, 500_000, 1), disc(9000, 10_000, 620_000)]
  for (let k = 0; k < 160; k++) specs.push(disc(1000 + (k % 4) * 2400, 2200 + (k % 4) * 2400, 12_000 + (k % 7) * 3000, k % 2, ((k * 37) % 300) - 150, ((k * 91) % 300) - 150))
  for (let k = 0; k < 12; k++) specs.push(disc(1000, 9000 + (k % 3) * 1000, 12_000, 3, ((k * 53) % 240) - 120, ((k * 29) % 240) - 120, k))
  const field = buildField(specs, LAT, LON)
  const m = sculptMesh(field)
  assert.equal(m.bands.length, 5)
  for (const b of m.bands) {
    assert.ok(b.indices.length / 3 <= BAND_TRIANGLES, `band ${b.band}: ${b.indices.length / 3}`)
    assert.equal(shape(b).open, 0)
  }
  assert.ok(m.ms > 0)
})
