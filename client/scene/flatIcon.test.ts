// client/scene/flatIcon.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flatIconGltf } from './flatIcon.ts'

test('flatIconGltf: a valid glTF of the stacked layers, its buffer the length it says, the top layer its own material', () => {
  const g = flatIconGltf('data:image/png;base64,AA==') as {
    buffers: { byteLength: number; uri: string }[]
    bufferViews: { byteOffset: number; byteLength: number }[]
    accessors: { count: number }[]
    meshes: { primitives: { material: number }[] }[]
    images: { uri: string }[]
  }
  const bytes = Buffer.from(g.buffers[0].uri.split(',')[1], 'base64')
  assert.equal(bytes.length, g.buffers[0].byteLength)
  for (const v of g.bufferViews) assert.ok(v.byteOffset + v.byteLength <= bytes.length)
  assert.equal(g.accessors[2].count + g.accessors[3].count, (g.accessors[0].count / 4) * 6, 'two triangles a layer')
  assert.deepEqual(g.meshes[0].primitives.map((p) => p.material), [0, 1])
  assert.equal(g.images[0].uri, 'data:image/png;base64,AA==')
  const pos = new Float32Array(bytes.buffer, bytes.byteOffset, 12)
  assert.deepEqual([...pos.slice(0, 3)], [0.5, 0.5, 0], 'the picture\'s top-left corner: nose end, left wing, on top')
})
