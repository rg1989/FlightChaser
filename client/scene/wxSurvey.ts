// client/scene/wxSurvey.ts
// What the cloud volume's march asks of a weather field before it walks it (cloudShaders.ts): the clear-air map, and which bands rain.
// Pure (no Cesium, no DOM), so Node tests cover it.
import { BANDS, FIELD_KM, FIELD_N, type Bitmap, type WxField } from './wxField.ts'

export const NEAR_N = 256 // the clear-air map's side: cells of 1.25 km
export const NEAR_KM = FIELD_KM / NEAR_N
/** The farthest the clear-air map tells, km: a byte's step is 0.2 km. */
export const NEAR_MAX_KM = 51
const OCTAGON = 1 / Math.cos(Math.PI / 8) // a way made of steps to the eight cells round a cell is at most this much longer than the straight one (1.082)

/**
 * What the march asks of a field before it walks it: `near`, the clear-air map: how far it is, over the map, from each cell's middle
 * to the nearest cover of a band (256 × 256 cells of 1.25 km, the first row the south; a byte is NEAR_MAX_KM / 255, so 255 is 51 km
 * or more. R is the lowest layer band's, G the next one's, B the two high ones' together, A the towers'), so that a ray in clear air
 * strides to the weather and does not search for it. A word is never more than the true distance (a stride passes over nothing): the
 * way is counted in steps to the eight cells round, which is at most 8 % longer than the straight one, so it is taken that much
 * shorter, and half a cell's diagonal is taken off for the cover's place inside its cell. And `wet`, per band, whether rain falls
 * from it (cover with a severity of light rain or more).
 */
export function survey(f: WxField): { near: Bitmap; wet: boolean[] } {
  const n = NEAR_N
  const per = FIELD_N / n
  const wet = Array.from({ length: BANDS }, () => false)
  const far = 4 * n // further, in cells, than any way across the map
  const ways = Array.from({ length: 4 }, () => new Float32Array(n * n).fill(far))
  const any = [false, false, false, false]
  for (let b = 0; b < BANDS; b++) {
    if (f.lo[b] > f.hi[b]) continue
    const [cov, sev, way] = [f.cov[b], f.sev[b], ways[NEAR_CHANNEL[b]]]
    any[NEAR_CHANNEL[b]] = true
    let rains = false
    for (let j = 0, o = 0; j < FIELD_N; j++) {
      const row = Math.floor(j / per) * n
      for (let i = 0; i < FIELD_N; i++, o++) {
        if (!(cov[o] > 0)) continue
        way[row + Math.floor(i / per)] = 0
        if (sev[o] >= 0.5) rains = true
      }
    }
    wet[b] = rains
  }
  const data = new Uint8ClampedArray(n * n * 4).fill(255)
  for (let c = 0; c < 4; c++) {
    if (!any[c]) continue
    const w = ways[c]
    // each cell's shortest way to a cell with cover: from the cells before it in a sweep up the map, then from those after it in a sweep down
    for (let o = 0; o < n * n; o++) {
      if (w[o] === 0) continue
      const [i, up] = [o % n, o >= n]
      let v = w[o]
      if (i > 0) v = Math.min(v, w[o - 1] + 1)
      if (up) v = Math.min(v, w[o - n] + 1, i > 0 ? w[o - n - 1] + Math.SQRT2 : far, i < n - 1 ? w[o - n + 1] + Math.SQRT2 : far)
      w[o] = v
    }
    for (let o = n * n - 1; o >= 0; o--) {
      const [i, down] = [o % n, o < n * (n - 1)]
      let v = w[o]
      if (v > 0 && i < n - 1) v = Math.min(v, w[o + 1] + 1)
      if (v > 0 && down) v = Math.min(v, w[o + n] + 1, i < n - 1 ? w[o + n + 1] + Math.SQRT2 : far, i > 0 ? w[o + n - 1] + Math.SQRT2 : far)
      w[o] = v
      data[o * 4 + c] = Math.floor(Math.min(1, (Math.max(0, v / OCTAGON - Math.SQRT1_2) * NEAR_KM) / NEAR_MAX_KM) * 255)
    }
  }
  return { near: { data, width: n, height: n }, wet }
}
const NEAR_CHANNEL: readonly number[] = [0, 1, 2, 2, 3] // the clear-air map's channel for each band (the shader's clearOf)
