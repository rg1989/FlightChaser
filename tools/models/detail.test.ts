// tools/models/detail.test.ts
// detail.ts on meshes made here (no Blender, no package): the registration, the mask, the subdivision, the written
// GLB's layout, and smoothness.ts's measure.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFit, bounds, mask, moved, notice, pick, rebuild, register, shaded, subdivide, weld, GLASS, type Tris } from './detail.ts'
import { readGlb, writeGlb, type Glb } from './glb.ts'
import { measure, ringSides } from './smoothness.ts'

/** A closed tube along x from 0 to `length`, `sides` round and `rings` long, of radius r(x / length). Faces outward. */
function tube(sides: number, rings: number, length: number, r: (u: number) => number): Tris {
  const p: number[] = []
  const tri: number[] = []
  for (let i = 0; i <= rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = (2 * Math.PI * j) / sides
      p.push((length * i) / rings, r(i / rings) * Math.cos(a), r(i / rings) * Math.sin(a))
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const [a, b, c, d] = [i * sides + j, i * sides + ((j + 1) % sides), (i + 1) * sides + j, (i + 1) * sides + ((j + 1) % sides)]
      tri.push(a, c, b, b, c, d)
    }
  }
  const [c0, c1] = [p.length / 3, p.length / 3 + 1]
  p.push(0, 0, 0, length, 0, 0)
  for (let j = 0; j < sides; j++) tri.push(c0, j, (j + 1) % sides, c1, rings * sides + ((j + 1) % sides), rings * sides + j)
  return { p: Float64Array.from(p), tri: Uint32Array.from(tri) }
}

/** A box with its own eight vertices. Faces outward. */
function box(lo: number[], hi: number[]): Tris {
  const p: number[] = []
  for (let i = 0; i < 8; i++) p.push(i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2])
  return { p: Float64Array.from(p), tri: Uint32Array.from([0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, 0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, 0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5]) }
}

function join(...parts: Tris[]): Tris {
  const p: number[] = []
  const tri: number[] = []
  const owner: number[] = []
  parts.forEach((m, k) => {
    const base = p.length / 3
    p.push(...m.p)
    for (const i of m.tri) tri.push(base + i)
    for (let f = 0; f < m.tri.length / 3; f++) owner.push(k)
  })
  return { p: Float64Array.from(p), tri: Uint32Array.from(tri), owner: Uint16Array.from(owner) }
}

/** An aircraft of sorts, 30 long: a tapering body, a fin on top at the back, a wing to one side only (no way round but one fits). */
const body = (u: number): number => 2 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * u) ** 0.6) + 0.3
const craft = (sides: number, rings: number): Tris => join(tube(sides, rings, 30, body), box([24, -0.2, 1], [29, 0.2, 6]), box([10, 1, -0.3], [14, 12, 0.3]))

const TURN = { m: [0, 0, 1, 1, 0, 0, 0, 1, 0], s: 2.5, t: [7, -3, 40] as [number, number, number] }

test('register: finds the turn, the scale and the move of a source over the coarse mesh made from it', () => {
  const source = craft(48, 40)
  const coarse = craft(12, 8)
  const old: Tris = { p: applyFit(TURN, coarse.p), tri: coarse.tri }
  const fit = register(old, weld(source, 1e-6))
  assert.deepEqual(fit.m, TURN.m)
  assert.equal(fit.mirrored, false)
  assert.ok(Math.abs(fit.s - TURN.s) < 0.01 * TURN.s, `scale ${fit.s}`)
  for (let d = 0; d < 3; d++) assert.ok(Math.abs(fit.t[d] - TURN.t[d]) < 0.2, `move ${fit.t}`)
  const long = bounds(old.p).long
  assert.ok(fit.median < 0.001 * long && fit.p95 < 0.01 * long, `fit ${fit.median} / ${fit.p95}`)
})

test('register: a mirrored source is found as mirrored', () => {
  const source = craft(48, 40)
  const flipped: Tris = { p: source.p.map((v, i) => (i % 3 === 1 ? -v : v)), tri: source.tri }
  const fit = register(craft(12, 8), weld(flipped, 1e-6))
  assert.equal(fit.mirrored, true)
  assert.deepEqual(fit.m, [1, 0, 0, 0, -1, 0, 0, 0, 1])
})

test('mask: a part the old mesh never had goes whole, a part it has stays whole', () => {
  const old = craft(12, 8)
  const pilot = box([40, 0, 0], [41, 1, 1]) // far from everything
  const source = join(tube(48, 40, 30, body), box([24, -0.2, 1], [29, 0.2, 6]), box([10, 1, -0.3], [14, 12, 0.3]), pilot)
  const keep = mask(source, old, 0.3)
  const kept = pick(source, keep)
  assert.equal(keep.filter((k) => !k).length, 12, "the pilot's twelve triangles")
  assert.ok(keep.every((k, f) => k === (source.owner![f] !== 3)))
  assert.equal(kept.tri.length / 3, source.tri.length / 3 - 12)
  assert.ok(bounds(kept.p).hi[0] <= 30.001)
})

test('subdivide: the new vertices lie on the curve, the old ones stay, sharp edges and flat faces are not cut', () => {
  const coarse = weld(tube(12, 4, 10, () => 2), 1e-6)
  const { mesh, cut } = subdivide(coarse, 35, 6, 0.01)
  assert.ok(cut > 0)
  assert.deepEqual(Array.from(mesh.p.subarray(0, coarse.p.length)), Array.from(coarse.p), 'the old vertices do not move')
  let worst = 0
  for (let i = coarse.p.length; i < mesh.p.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(mesh.p[i + 1], mesh.p[i + 2]) - 2))
  assert.ok(worst < 0.02, `a new vertex is ${worst} off the cylinder (a plain midpoint would be 0.068 inside)`)
  const [before, after] = [measure(shaded(coarse, 35)), measure(shaded(mesh, 35))]
  assert.ok(after.p50 < 0.6 * before.p50, `${before.p50}° → ${after.p50}°`)
  const cube = weld(box([0, 0, 0], [1, 1, 1]), 1e-6)
  assert.equal(subdivide(cube, 35, 6, 0.01).cut, 0)
})

test('shaded: one normal across a curved edge, two across a sharp one; glass is dark and keeps the normal', () => {
  const m = weld(tube(24, 2, 10, () => 2), 1e-6)
  const s = shaded(m, 35)
  assert.equal(s.pos.length / 3, 24 * 3 + 2 * 24 + 2, 'a vertex per ring place for the skin, and one more on each cap rim, and the cap centres')
  for (let i = 0; i < s.nrm.length; i += 3) assert.ok(Math.abs(Math.hypot(s.nrm[i], s.nrm[i + 1], s.nrm[i + 2]) - 1) < 1e-5)
  const dark = shaded(m, 35, (f) => f === 0)
  const glass = [...dark.idx.subarray(0, 3)]
  for (const v of glass) assert.equal(dark.col[4 * v], GLASS)
  assert.equal(dark.col.filter((c, i) => i % 4 === 0 && c === GLASS).length, 3)
})

test('rebuild: the written GLB is the layout glb.ts reads, in the old mesh\'s frame', () => {
  const coarse = craft(12, 8)
  const oldTris: Tris = { p: applyFit(TURN, coarse.p), tri: coarse.tri }
  const flat = shaded(oldTris, 0) // every face flat, as most shipped meshes were
  const old: Glb = { json: { asset: { version: '2.0', copyright: 'someone' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'craft' }], meshes: [{ primitives: [{}] }], materials: [{}] }, ...flat }
  const b = rebuild(readGlb(writeGlb(old)), craft(48, 40), { subdivide: 0, scale: TURN.s })
  const g = readGlb(writeGlb(b.glb))
  assert.equal(g.json.meshes.length, 1)
  assert.equal(g.json.meshes[0].primitives.length, 1)
  assert.deepEqual(Object.keys(g.json.meshes[0].primitives[0].attributes).sort(), ['COLOR_0', 'NORMAL', 'POSITION'])
  assert.equal(g.json.accessors[g.json.meshes[0].primitives[0].indices].componentType, 5123, '16-bit indices under 65,536 vertices')
  assert.deepEqual(g.json.nodes, old.json.nodes)
  assert.equal(b.dropped.size, 0)
  const [was, now] = [bounds(oldTris.p), bounds(Float64Array.from(g.pos))]
  for (let d = 0; d < 3; d++) {
    assert.ok(Math.abs(was.lo[d] - now.lo[d]) < 0.2 && Math.abs(was.hi[d] - now.hi[d]) < 0.2, `axis ${d}: ${was.lo[d]}…${was.hi[d]} → ${now.lo[d]}…${now.hi[d]}`)
  }
  const [s0, s1] = [measure(old), measure(g)]
  assert.ok(s0.hard > 80 && s1.hard < 5, `hard ${s0.hard} % → ${s1.hard} %`)
  assert.ok(s1.p50 < 0.5 * s0.p50)
  // a source that is another aircraft is refused
  assert.throws(() => rebuild(old, join(tube(48, 40, 30, () => 4), box([0, 5, 5], [30, 9, 9])), { subdivide: 0 }), /does not lie on the mesh it replaces/)
})

test('rebuild: without "subdivide" a coarse source is cut until it reaches the target\'s turn', () => {
  const coarse = craft(14, 10)
  const old: Glb = { json: { asset: { version: '2.0' }, nodes: [{ mesh: 0 }], meshes: [{ primitives: [{}] }] }, ...shaded(coarse, 0) }
  const none = rebuild(old, craft(14, 10), { subdivide: 0 })
  const auto = rebuild(old, craft(14, 10))
  assert.equal(none.cuts.length, 0)
  assert.ok(auto.cuts.length >= 1)
  assert.ok(measure(auto.glb).p50 < 0.6 * measure(none.glb).p50)
  assert.ok(ringSides({ p: Float64Array.from(auto.glb.pos), tri: auto.glb.idx }, 15) >= 2 * 14)
})

test('smoothness: a coarse and a fine cylinder, flat and smooth', () => {
  const [coarse, fine] = [weld(tube(8, 4, 10, () => 2), 1e-6), weld(tube(72, 4, 10, () => 2), 1e-6)]
  const c = measure(shaded(coarse, 0))
  assert.ok(Math.abs(c.p50 - 45) < 0.01 && c.hard > 99, `${c.p50}° ${c.hard} %`)
  const f = measure(shaded(fine, 35))
  assert.ok(Math.abs(f.p50 - 5) < 0.01 && Math.abs(f.p90 - 5) < 0.01 && f.hard === 0, `${f.p50}° ${f.hard} %`)
  assert.equal(f.triangles, 72 * 4 * 2 + 2 * 72)
  assert.equal(ringSides(coarse, 5), 8)
  assert.equal(ringSides(fine, 5), 72)
})

test('notice: an earlier re-mesh note is replaced, not stacked; moved: one line per measured field', () => {
  const once = notice('CC BY 4.0 someone', 'a/b.glb', '2026-01-01')
  assert.equal(notice(once, 'a/b.glb', '2026-02-02'), once.replace('2026-01-01', '2026-02-02'))
  const lines = moved({ box: { half: 2 }, lights: { tail: [1, 2, 3] }, profile: { doors: [1, 2] } }, { box: { half: 2 }, lights: { tail: [1, 2, 3.25] }, profile: { doors: [1, 2] } })
  assert.ok(lines.includes('box: the same'))
  assert.ok(lines.some((l) => /^lights: 1 of 3 numbers moved, 0\.25 at most/.test(l)), lines.join('\n'))
})
