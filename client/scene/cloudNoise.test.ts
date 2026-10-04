// client/scene/cloudNoise.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NOISE_MEAN, noiseAtlas } from './cloudNoise.ts'
import { MARCH_SHADER } from './cloudShaders.ts'

const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol

test('noiseAtlas: 64 slices of a smooth random volume that tiles (the mock\'s 32³, made twice as fine by a spline), in 8 × 8 tiles of 66 × 66: each slice with a rim of the far side\'s texels (so a bilinear mix wraps), R the slice and G the next', () => {
  const a = noiseAtlas()
  assert.deepEqual([a.width, a.height, a.data.length], [528, 528, 528 * 528 * 4])
  /** Slice z's texel (x, y), each −1 … 64 (the rim), channel c. */
  const px = (z: number, x: number, y: number, c: number): number => a.data[((Math.floor(z / 8) * 66 + 1 + y) * a.width + (z % 8) * 66 + 1 + x) * 4 + c]
  for (const z of [0, 7, 8, 19, 40, 63]) {
    for (const k of [0, 5, 31, 63]) {
      assert.equal(px(z, -1, k, 0), px(z, 63, k, 0))
      assert.equal(px(z, 64, k, 0), px(z, 0, k, 0))
      assert.equal(px(z, k, -1, 0), px(z, k, 63, 0))
      assert.equal(px(z, k, 64, 0), px(z, k, 0, 0))
      assert.equal(px(z, k, 3, 1), px((z + 1) % 64, k, 3, 0), 'G is the next slice')
      assert.equal(px(z, -1, 64, 1), px((z + 1) % 64, 63, 0, 0), 'in the rim too')
      assert.equal(px(z, k, 9, 3), 255)
    }
  }
  let [lo, hi, step, bend] = [255, 0, 0, 0]
  for (let z = 0; z < 64; z++) {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const v = px(z, x, y, 0)
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
        step += Math.abs(v - px(z, x + 1, y, 0)) + Math.abs(v - px(z, x, y + 1, 0)) + Math.abs(v - px(z, x, y, 1))
        bend = Math.max(bend, Math.abs(px(z, x - 1, y, 0) - 2 * v + px(z, x + 1, y, 0)))
      }
    }
  }
  assert.deepEqual([lo, hi], [0, 255], 'stretched over the whole range')
  assert.ok(step / (3 * 64 ** 3) < 15, `smooth: a texel differs from its neighbour by ${(step / (3 * 64 ** 3)).toFixed(1)} of 255 on average`)
  assert.ok(bend <= 24, `no crease: three texels in a row are ${bend} of 255 off a straight line at most `)
  assert.deepEqual(noiseAtlas().data, a.data, 'the same every time')
})

test('noiseAtlas: its mean is NOISE_MEAN (an octave of the detail that has faded is given as that), and the four octaves together are under a fifth almost nowhere (cloud thinner than that is never drawn)', () => {
  const a = noiseAtlas()
  const v = (x: number, y: number, z: number): number => a.data[((Math.floor(z / 8) * 66 + 1 + y) * a.width + (z % 8) * 66 + 1 + x) * 4] / 255
  let sum = 0
  for (let z = 0; z < 64; z++) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) sum += v(x, y, z)
  assert.ok(near(sum / 64 ** 3, NOISE_MEAN, 0.005), `mean ${sum / 64 ** 3}`)
  assert.ok(MARCH_SHADER.includes(`const float NOISE_MEAN = ${NOISE_MEAN};`))
  // The shader's fbm at many places (the nearest texel of each octave: the mix between texels lies between them).
  const at = (q: number): number => ((Math.floor(q * 64) % 64) + 64) % 64
  const octave = (x: number, y: number, z: number, k: number): number => v(at(x * k), at(y * k), at(z * k))
  let thin = 0
  const n = 200_000
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [(i * 0.618034) % 1, (i * 0.754878) % 1, (i * 0.569840) % 1]
    if (0.42 * octave(x, y, z, 1) + 0.27 * octave(x, y, z, 3) + 0.19 * octave(x, y, z, 8) + 0.12 * octave(x, y, z, 23) < 0.2) thin++
  }
  assert.ok(thin / n < 1e-3, `${thin} of ${n} places`)
})
