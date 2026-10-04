// client/scene/cloudNoise.ts
// The noise the cloud volume's march erodes its clouds by and bends them with (cloudShaders.ts noise(), fbm(), warp()), as an image.
// Pure (no Cesium, no DOM), so Node tests cover it.
import { sequence } from './cloudField.ts'
import type { Bitmap } from './wxField.ts'

const NOISE_M = 32 // the noise is made in a volume of this side (the mock's) …
export const NOISE_N = 2 * NOISE_M // … and given to the shader at twice that, so that its texels do not show in a cloud near the camera
export const NOISE_TILE = NOISE_N + 2 // a slice and its rim
export const NOISE_COLS = 8
export const NOISE_ROWS = NOISE_N / NOISE_COLS
export const NOISE_KM = 32 // its longest period: the octaves and the warp are whole fractions of it, so a shift of 32 km changes nothing
const NOISE_SEED = 5
/** The noise's mean, of 1 (it is the same noise every time: tested). An octave too fine for a step is given as this. */
export const NOISE_MEAN = 0.55

let noiseMade: Bitmap | null = null

/** A periodic volume of side n along each axis, twice as fine along the axis of stride `step`: the cubic B-spline through its values (smooth, no creases). */
function twice(v: Float32Array, dims: readonly [number, number, number], axis: 0 | 1 | 2): Float32Array {
  const out = [...dims] as [number, number, number]
  out[axis] *= 2
  const o = new Float32Array(out[0] * out[1] * out[2])
  const n = dims[axis]
  const stride = axis === 0 ? 1 : axis === 1 ? dims[0] : dims[0] * dims[1] // one place on along the axis, in v
  let k = 0
  for (let z = 0; z < out[2]; z++) {
    for (let y = 0; y < out[1]; y++) {
      for (let x = 0; x < out[0]; x++) {
        const along = axis === 0 ? x : axis === 1 ? y : z
        const j = along >> 1
        const row = axis === 0 ? (z * dims[1] + y) * dims[0] : axis === 1 ? z * dims[1] * dims[0] + x : y * dims[0] + x // the first of v's values on this line along the axis
        const a = v[row + ((j + n - 1) % n) * stride]
        const b = v[row + j * stride]
        const c = v[row + ((j + 1) % n) * stride]
        // on a value's own place the spline weighs it and its neighbours 1 : 4 : 1; half-way between two, the four round 1 : 23 : 23 : 1
        o[k++] = along % 2 === 0 ? (a + 4 * b + c) / 6 : (a + 23 * b + 23 * c + v[row + ((j + 2) % n) * stride]) / 48
      }
    }
  }
  return o
}

/**
 * The noise the clouds are eroded by, the mock's: random values in a volume of 32³, smoothed twice over each texel's 27 neighbours
 * (round the volume's sides, so it tiles). Made twice as fine each way by a cubic spline (64³: the GPU's straight mix between texels
 * then follows a smooth curve, and no texel shows where the noise cuts a cloud's edge near the camera) and stretched over 0 … 255.
 * As an image: 8 × 8 tiles of 66 × 66, slice z at column z % 8 and row ⌊z / 8⌋, each with a rim of one texel from its far side so
 * that a bilinear mix at its edge wraps; R the slice's value, G the next slice's (so one read gives both to mix for the third axis).
 * The same every time (made once).
 */
export function noiseAtlas(): Bitmap {
  if (noiseMade !== null) return noiseMade
  const M = NOISE_M
  const r = sequence(NOISE_SEED)
  let v: Float32Array = Float32Array.from({ length: M * M * M }, r)
  const wrap = (i: number, n: number): number => (i + n) % n
  for (let pass = 0; pass < 2; pass++) {
    const o = new Float32Array(M * M * M)
    for (let z = 0; z < M; z++) {
      for (let y = 0; y < M; y++) {
        for (let x = 0; x < M; x++) {
          let s = 0
          for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += v[(wrap(z + c, M) * M + wrap(y + b, M)) * M + wrap(x + a, M)]
          o[(z * M + y) * M + x] = s / 27
        }
      }
    }
    v = o
  }
  v = twice(twice(twice(v, [M, M, M], 0), [2 * M, M, M], 1), [2 * M, 2 * M, M], 2)
  const N = NOISE_N
  let [lo, hi] = [1, 0]
  for (const x of v) [lo, hi] = [Math.min(lo, x), Math.max(hi, x)]
  const [width, height] = [NOISE_COLS * NOISE_TILE, NOISE_ROWS * NOISE_TILE]
  const data = new Uint8ClampedArray(width * height * 4)
  const byte = (z: number, y: number, x: number): number => ((v[(wrap(z, N) * N + wrap(y, N)) * N + wrap(x, N)] - lo) / (hi - lo)) * 255
  for (let z = 0; z < N; z++) {
    const [x0, y0] = [(z % NOISE_COLS) * NOISE_TILE + 1, Math.floor(z / NOISE_COLS) * NOISE_TILE + 1]
    for (let y = -1; y <= N; y++) {
      for (let x = -1; x <= N; x++) {
        const o = ((y0 + y) * width + x0 + x) * 4
        data[o] = byte(z, y, x)
        data[o + 1] = byte(z + 1, y, x)
        data[o + 3] = 255
      }
    }
  }
  return (noiseMade = { data, width, height })
}
