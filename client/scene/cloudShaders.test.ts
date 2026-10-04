// client/scene/cloudShaders.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MARCH_SHADER, MIX_SHADER, REACH_KM } from './cloudShaders.ts'
import { EDGE_TOP_KM, POST_KM } from './wxEdges.ts'
import { FIELD_KM } from './wxField.ts'

test('the shaders: each is given the reach the radar is read by (REACH_KM), the image\'s numbers and the loops\' bounds as the packing has them; its braces and brackets close', () => {
  assert.deepEqual(REACH_KM, [130, 150])
  assert.ok(MARCH_SHADER.includes('smoothstep(130.0, 150.0, length(m - u_plane))') && MIX_SHADER.includes('smoothstep(130.0, 150.0, length(m - u_plane))'))
  for (const text of ['const float EDGE_KM = 819.2;', 'const float EDGE_Q = 0.025;', `const float HEIGHT_Q = ${EDGE_TOP_KM / 65536};`, `const float ALONG_Q = ${POST_KM / 65536};`, 'const float POST_KM = 4.0;', 'k < 48;', 'int x = k * 5;']) {
    assert.ok(MARCH_SHADER.includes(text), text)
  }
  assert.ok(MARCH_SHADER.includes('const float NEAR_MAX = 51.0;'), 'the clear-air map\'s range, as survey packs it')
  const margin = Number(/const float MARGIN = ([\d.]+);/.exec(MARCH_SHADER)?.[1])
  assert.ok(margin >= Math.SQRT1_2 * (FIELD_KM / 256) + 2.16 && margin < 3.5, `MARGIN ${margin}: the map's cell (its half diagonal, between four words) and the warp's reach (1.525 km each way)`)
  for (const text of ['uniform float u_path[21];', 'i < 6;']) assert.ok(MIX_SHADER.includes(text) && !MARCH_SHADER.includes(text), `${text}: the track line is the mix's`)
  for (const src of [MARCH_SHADER, MIX_SHADER]) {
    const code = src.replace(/\/\/.*$/gm, '')
    for (const [open, close] of ['{}', '()', '[]']) assert.equal(code.split(open).length, code.split(close).length, `${open}${close}`)
    assert.ok(!/[^\x00-\x7f]/.test(code), 'outside its comments, plain ASCII')
  }
})
