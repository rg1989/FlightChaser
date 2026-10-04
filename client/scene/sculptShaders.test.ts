// client/scene/sculptShaders.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BEHIND, EDGE_ALPHA, INSIDE_VEIL, LEVEL_M, LINE_ALPHA, NEAREST_FS, SCULPT_FS, SCULPT_VS, VEIL, severityRgb } from './sculptShaders.ts'
import { SEV_COLOR } from './wxAhead.ts'

const hex = (rgb: number[]): string => `#${rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`

test('severityRgb: the severity scale\'s four colours at the whole severities, mixed between them, held at the ends', () => {
  for (let s = 0; s <= 3; s++) assert.equal(hex(severityRgb(s)), SEV_COLOR[s])
  const mid = severityRgb(1.5)
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(mid[c] - (severityRgb(1)[c] + severityRgb(2)[c]) / 2) < 1e-9)
  assert.deepEqual([hex(severityRgb(-1)), hex(severityRgb(7)), hex(severityRgb(Number.NaN))], [SEV_COLOR[0], SEV_COLOR[3], SEV_COLOR[0]])
})

test('the look\'s numbers: a body veils what is behind it by about a third, less behind another surface and from inside, and its lines are firm', () => {
  assert.ok(VEIL > 0.28 && VEIL < 0.4)
  assert.ok(BEHIND < VEIL / 2 && INSIDE_VEIL < VEIL)
  assert.ok(EDGE_ALPHA > 0.9 && LINE_ALPHA > 2 * VEIL)
  assert.equal(LEVEL_M, 500)
})

test('the shaders: the view\'s drawing asks the nearest image and drops a far side that is not the nearest surface; the colours are the severity scale\'s; every number written is a float', () => {
  assert.match(SCULPT_FS, /uniform sampler2D u_nearest;/)
  assert.match(SCULPT_FS, /if \(!gl_FrontFacing && !first\) discard;/)
  for (const css of SEV_COLOR) assert.ok(SCULPT_FS.includes(severityRgb(SEV_COLOR.indexOf(css)).map((v) => v.toFixed(4)).join(', ')), css)
  assert.match(NEAREST_FS, /out_FragColor = vec4\(fhPack\(fhReach\(v_positionEC\)\), 1\.0\);/)
  assert.match(SCULPT_VS, /in vec4 body;/)
  for (const src of [SCULPT_FS, NEAREST_FS, SCULPT_VS]) assert.doesNotMatch(src.replace(/\/\/.*/g, ''), /(?<![\w.]|e-)\d+(?![\w.])/, 'a bare whole number among floats does not compile in GLSL')
})

test('the packed distance: three bytes hold it to a part in a million, and the nearest fragment of two is told from one a thousandth further', () => {
  // The shader's own arithmetic, in JS.
  const reach = (m: number): number => Math.min(0.999, Math.max(0, Math.log2(m + 1) / 32))
  const fract = (v: number): number => v - Math.floor(v)
  const pack = (v: number): number[] => {
    const enc = [fract(v), fract(v * 255), fract(v * 65025)]
    return [enc[0] - enc[1] / 255, enc[1] - enc[2] / 255, enc[2]].map((x) => Math.round(x * 255) / 255) // as a byte holds it
  }
  const unpack = (e: number[]): number => e[0] + e[1] / 255 + e[2] / 65025
  for (const m of [3, 250, 6000, 45_000, 300_000]) {
    const got = unpack(pack(reach(m)))
    assert.ok(Math.abs(got - reach(m)) < 2e-7, `${m} m: ${got} for ${reach(m)}`)
    assert.ok(reach(m * 1.001) - got > 2e-5, 'a surface a thousandth further is behind')
    assert.ok(Math.abs(reach(m * 1.0001) - got) < 2e-5, 'one a ten-thousandth further is the same surface')
  }
})
