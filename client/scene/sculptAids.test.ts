// client/scene/sculptAids.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Cartesian3, Color, PrimitiveCollection, type PolylineCollection, type Viewer } from 'cesium'
import { sceneAids } from './sculptAids.ts'
import { severityRgb } from './sculptShaders.ts'

// Cesium's Material asks whether a value is one of the browser's picture kinds: Node has none of them.
for (const name of ['HTMLCanvasElement', 'HTMLImageElement', 'ImageBitmap', 'OffscreenCanvas']) (globalThis as Record<string, unknown>)[name] ??= class {}

const scene = (): { viewer: Viewer; primitives: PrimitiveCollection } => {
  const primitives = new PrimitiveCollection()
  return { primitives, viewer: { dataSources: { add: async () => undefined, remove: async () => true }, scene: { primitives }, isDestroyed: () => false } as unknown as Viewer }
}
const way = [0, 1, 2, 3].map((k) => Cartesian3.fromDegrees(34 + k / 100, 32, 3000))

test('the track line: a piece in weather is drawn in its severity\'s colour, a piece in clear air is not drawn', () => {
  const { viewer, primitives } = scene()
  const aids = sceneAids(viewer)
  aids.track(way, [2, -1, 3])
  const lines = primitives.get(0) as PolylineCollection
  assert.deepEqual([0, 1, 2].map((k) => lines.get(k).show), [true, false, true])
  for (const [k, sev] of [[0, 2], [2, 3]]) assert.ok(Color.equals(lines.get(k).material.uniforms.color as Color, new Color(...severityRgb(sev), 1)), `piece ${k}`)
  aids.track(way, [-1, 1, -1])
  assert.deepEqual([0, 1, 2].map((k) => lines.get(k).show), [false, true, false])
  assert.ok(Color.equals(lines.get(1).material.uniforms.color as Color, new Color(...severityRgb(1), 1)))
})

test('leaving the look with pieces of one severity on the line: the aids leave the scene without an error (each piece has a material of its own: Cesium destroys a polyline\'s material with it, and a shared one twice)', () => {
  const { viewer, primitives } = scene()
  const aids = sceneAids(viewer)
  aids.track(way, [2, 2, 2])
  assert.equal(primitives.length, 1)
  aids.destroy()
  assert.equal(primitives.length, 0)
  aids.destroy() // and once more is nothing
})
