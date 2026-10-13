// tools/models/outline.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadBody, toModelFrame } from './light-anchors.ts'
import { CELLS, outlineFor, outlineOf, type Sphere } from './outline.ts'
import { readManifest } from './packages.ts'

const manifest = readManifest()
const inside = (o: Sphere[], x: number, y: number, z: number, tol = 0): boolean => o.some((s) => Math.hypot(x - s[0], y - s[1], z - s[2]) <= s[3] + tol)

test('outlineOf: one large triangle (three vertices) is covered all over, by spheres no wider than a cell\'s diagonal', () => {
  const m = { p: Float64Array.from([0, 0, 0, 10, 0, 0, 0, 10, 0]), tri: Uint32Array.from([0, 1, 2]) }
  const o = outlineOf(m, 5)
  for (let x = 0; x <= 10; x += 0.5) for (let y = 0; y <= 10 - x; y += 0.5) assert.ok(inside(o, x, y, 0, 1e-9), `(${x}, ${y}) is covered`)
  assert.ok(!inside(o, 8, 8, 0) && !inside(o, 5, 5, 3), 'not what is off the triangle')
  assert.ok(o.length <= 21, `a sphere for each cell it passes through: ${o.length}`)
  for (const s of o) assert.ok(s[3] <= Math.SQRT2 + 0.5 / Math.sqrt(3) + 1e-9, `r ${s[3]} of a flat piece in a cell 2 across, and to the next sample`)
})

test('every model\'s outline in the manifest is the measured one, covers its mesh and hugs it', () => {
  const measured = new Map(manifest.models.map((e) => [e.id, outlineFor(e)]))
  for (const e of manifest.models) {
    const o = measured.get(e.id)!
    assert.deepEqual(e.outline, o, `${e.id} outline`)
    const { p } = loadBody(e)
    let [lo, hi, out] = [Infinity, -Infinity, 0]
    for (let i = 0; i < p.length; i += 3) {
      const v = toModelFrame(e, [p[i], p[i + 1], p[i + 2]])
      if (!inside(o, v[0], v[1], v[2])) out++
      for (const c of v) [lo, hi] = [Math.min(lo, c), Math.max(hi, c)]
    }
    assert.equal(out, 0, `${e.id}: every vertex inside a sphere`)
    assert.ok(o.length <= 400, `${e.id}: ${o.length} spheres`)
    const cell = (hi - lo) / CELLS
    for (const s of o) assert.ok(s[3] <= 1.02 * cell + 0.02, `${e.id}: r ${s[3]} about a cell's half diagonal at most (cell ${cell})`)
  }
})

