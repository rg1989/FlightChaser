// client/scene/cloudShaders.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOX_PAD_KM, MARCH_SHADER, MIX_SHADER, REACH_KM } from './cloudShaders.ts'
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

test('the march\'s tier (marchPace.ts): a ray\'s step budget is a number it is given (128 at the first tier), and with a smaller one its steps are longer by as much, so that it gets as far; the noise\'s finest octave is read only at detail 0', () => {
  for (const text of ['uniform float u_steps;', 'uniform float u_detail;', 'float(used) >= u_steps', 'float lean = 128.0 / u_steps;', 'max(0.0, float(used) - 0.6 * u_steps) / (u_steps / 12.0)', 'lod < 0.12 && u_detail < 0.5']) {
    assert.ok(MARCH_SHADER.includes(text), text)
  }
  assert.equal(MARCH_SHADER.split('for (int i = 0; i < 128; i++)').length, 3, 'both walks keep their loops of 128: the budget ends them sooner')
  assert.ok(MARCH_SHADER.includes('if (t >= tEnd || float(i) >= u_steps) break;'), 'the blocks\' walk too')
  assert.ok(!MIX_SHADER.includes('u_steps') && !MIX_SHADER.includes('u_detail'))
})

test('the cheap tiers (marchPace.ts): the samples toward the Sun that shade a cloud are a number the march is given: two, or one that weighs as much as the two, half-way between them; the mix is the same at every tier: the volumes from the nine march pixels round a pixel', () => {
  for (const text of ['uniform float u_shade;', 'u_shade > 1.5 ? exp(-(body(p + sun * 0.45, nr) * 1.1 + body(p + sun * 1.3, nr) * 1.6)) : exp(-body(p + sun * 0.9, nr) * 2.7)']) assert.ok(MARCH_SHADER.includes(text), text)
  assert.ok(MIX_SHADER.includes('bool even = u_look < 1.5;') && !MIX_SHADER.includes('u_shade'))
})

test('the march: a ray is clipped to the box the cover stands in, not to the whole field; a sample whose height no band near holds is not read from the field (nor the fine warp\'s noise for it); the edges are read only by a ray that passes the circle they stand in', () => {
  assert.ok(MARCH_SHADER.includes('uniform vec4 u_box;') && MARCH_SHADER.includes('(u_box.xy - ro.xy) / dir, tb = (u_box.zw - ro.xy) / dir'))
  assert.ok(!/\bBOX\b/.test(MARCH_SHADER.replace(/\/\/.*$/gm, '')), 'no other clip')
  assert.ok(MARCH_SHADER.includes('holds(pw, nr, gap) ? min(1.0, GAIN * cover(toMap(warpFine(pw, q)), nr, sev, rain, gap)) : 0.0'))
  assert.ok(MARCH_SHADER.includes('const float HOLD = 0.01;'))
  assert.ok(MARCH_SHADER.includes('vec3 warp(vec3 p, vec3 q) { return warpFine(warpWide(p, q), q); }'), 'the two warps together are the warp there was')
  assert.ok(MARCH_SHADER.includes('if (dot(off, off) <= u_edgeBound.z * u_edgeBound.z) hazards(ro, rd, tO, pix);'))
  assert.ok(Math.abs(BOX_PAD_KM - 8.1) < 1e-9, 'the clear-air map\'s margin (3.1 km) and the room for the map\'s bend (5 km)')
})
