// client/scene/cloudShaders.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOX_PAD_KM, MARCH_SHADER, MIX_SHADER, REACH_KM, VEIL, veiled } from './cloudShaders.ts'
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
  assert.equal(MARCH_SHADER.split('for (int i = 0; i < 128; i++)').length, 2, 'the walk keeps its loop of 128: the budget ends it sooner')
  assert.ok(!MIX_SHADER.includes('u_steps') && !MIX_SHADER.includes('u_detail'))
})

test('the cheap tiers (marchPace.ts): a smaller step budget lengthens the search\'s steps, not the steps through dense cloud: the veil\'s cap ends that walk after a few, and each gives the cloud\'s colour a sample (one long step gave it one, and a cheap tier\'s clouds were flat patches); the light is two samples toward the Sun at every tier, and the mix the same', () => {
  assert.ok(MARCH_SHADER.includes('ds = max(ds / lean, min(0.25 / (sigma(sev) * d), 4.0 * small) * stretch);'))
  assert.ok(MARCH_SHADER.includes('float sh = exp(-(body(p + sun * 0.45, nr) * 1.1 + body(p + sun * 1.3, nr) * 1.6));') && !MARCH_SHADER.includes('u_shade'))
  assert.ok(MIX_SHADER.includes('vec2 lo = 0.25 - 0.5 * d, mid = vec2(0.5), hi = 0.25 + 0.5 * d;'))
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

test('the clouds are see-through: a ray\'s weather hides no more than the opacity chosen of what is behind it (VEIL until one is, a little over half: the ground, the roads and the names stay readable through a cloud, and the aircraft in thick cloud is veiled, not gone), in both looks, and the march ends when it has hidden that much; at none, no cloud is drawn and no step taken', () => {
  assert.ok(VEIL >= 0.55 && VEIL <= 0.6, `${VEIL}`)
  // the rule, as the shader has it: a part adds what it would, or what is left under the cap
  assert.equal(veiled(0.2, 0), 0.2, 'under the cap: as it is')
  assert.ok(Math.abs(veiled(0.9, 0) - VEIL) < 1e-12, 'a thick cloud at once: the cap')
  assert.equal(veiled(0.5, VEIL), 0, 'at the cap: nothing more')
  assert.equal(veiled(0.5, 0.9), 0, 'over it (a hazard area\'s line was laid first): nothing more')
  let hidden = 0
  for (const part of [0.1, 0.3, 0.05, 0.6, 0.9, 0.2]) hidden += (1 - hidden) * veiled(part, hidden)
  assert.ok(Math.abs(hidden - VEIL) < 1e-12, `part after part, a ray hides ${hidden}`)
  // another opacity is another cap: a fainter cloud, a solid one, none
  assert.equal(veiled(0.9, 0, 0.3), 0.3)
  assert.equal(veiled(0.9, 0, 1), 0.9, 'solid: as it is')
  assert.equal(veiled(0.9, 0, 0), 0, 'none: nothing is laid')
  for (const text of [
    'uniform float u_veil;',
    'float veiled(float a, float A) { return min(a, max(0.0, (u_veil - A) / max(1.0 - A, 1.0e-4))); }',
    'if (t >= tEnd || A >= u_veil - 0.002 || float(used) >= u_steps) break;', // the walk ends at the cap: at none, before its first step
  ]) assert.ok(MARCH_SHADER.includes(text), text)
  assert.equal(MARCH_SHADER.split('a = veiled(a, A);').length - 1, 2, 'the cloud\'s part and the rain\'s')
  assert.ok(!/blocks|u_look < 1\.5/.test(MARCH_SHADER + MIX_SHADER), 'the blocks are gone')
  assert.ok(!MARCH_SHADER.includes('0.985') && !MARCH_SHADER.includes('A = 1.0;'), 'nothing is solid any more')
})

test('a hazard area has a roof in every style: its top face, faint, is laid where the ray meets the top height inside the area, whatever u_hazard says', () => {
  const body = MARCH_SHADER.slice(MARCH_SHADER.indexOf('void hazards('), MARCH_SHADER.indexOf('// The level slice'))
  assert.equal(body.split('if (face && inside) ev(faceT, faceC, 0.1);').length - 1, 2, 'between two areas, and after the last')
  const face = body.slice(body.indexOf('vec4 ec ='), body.indexOf('vec2 e = b - a;'))
  assert.ok(face.includes('inside = !inside;') && !face.includes('box'), 'the face is found for a curtain and a fence too')
})
