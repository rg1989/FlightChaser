// shared/sat.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeSatCut, encodeSatCut, type SatCut } from './sat.ts'

const cut = (n: number): SatCut => ({
  timeMs: Date.UTC(2026, 9, 4, 10, 30),
  box: [27.7533, 29.4534, 36.7467, 40.0466],
  n,
  cloud: Uint8Array.from({ length: n * n }, (_, i) => (i % 3 === 0 ? 255 : 0)),
  seen: Uint8Array.from({ length: n * n }, (_, i) => (i % 7 === 0 ? 0 : 1)),
  topM: Uint16Array.from({ length: n * n }, (_, i) => (i % 3 === 0 ? 320 * (1 + (i % 47)) : 0)),
})

test('encodeSatCut, decodeSatCut: a frame comes back as it was sent, an odd number of cells a side too', () => {
  for (const n of [1, 2, 3, 400]) {
    const sent = cut(n)
    const bytes = encodeSatCut(sent)
    assert.equal(bytes.length, 48 + 4 * n * n, `${n}: a header, a byte a cell twice, two bytes a cell`)
    const got = decodeSatCut(bytes.buffer)
    assert.ok(got !== null)
    assert.deepEqual([got.timeMs, got.box, got.n], [sent.timeMs, sent.box, n])
    assert.deepEqual(got.cloud, sent.cloud)
    assert.deepEqual(got.seen, sent.seen)
    assert.deepEqual(got.topM, sent.topM)
  }
})

test('encodeSatCut: the bytes are the format\'s: its name, the size, the time and the box as little-endian numbers, then the three planes', () => {
  const bytes = encodeSatCut({ timeMs: 1, box: [-1.5, 2, 3, 4], n: 1, cloud: Uint8Array.of(255), seen: Uint8Array.of(1), topM: Uint16Array.of(0x3c00) })
  const dv = new DataView(bytes.buffer)
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 4)), 'FHS1')
  assert.deepEqual([dv.getUint32(4, true), dv.getFloat64(8, true), dv.getFloat64(16, true), dv.getFloat64(24, true), dv.getFloat64(32, true), dv.getFloat64(40, true)], [1, 1, -1.5, 2, 3, 4])
  assert.deepEqual([...bytes.subarray(48)], [255, 1, 0x00, 0x3c], 'cloud, seen, and the top with its low byte first: 15,360 m')
})

test('decodeSatCut: the planes are read where they lie in the answer, not copied (a 640 KB answer costs the page nothing to read)', () => {
  const bytes = encodeSatCut(cut(400))
  const got = decodeSatCut(bytes.buffer)!
  assert.ok(got.cloud.buffer === bytes.buffer && got.seen.buffer === bytes.buffer && got.topM.buffer === bytes.buffer)
})

test('decodeSatCut: bytes that are no frame are none: another format, a body cut short or too long, no cells, a time or a box that is no number', () => {
  const good = encodeSatCut(cut(2))
  assert.ok(decodeSatCut(good.buffer) !== null)
  const changed = (change: (b: Uint8Array, dv: DataView) => void): ArrayBuffer => {
    const b = good.slice()
    change(b, new DataView(b.buffer))
    return b.buffer
  }
  assert.equal(decodeSatCut(changed((b) => void (b[3] = 0x32))), null, 'FHS2')
  assert.equal(decodeSatCut(good.slice(0, 60).buffer), null)
  assert.equal(decodeSatCut(good.slice(0, 20).buffer), null)
  assert.equal(decodeSatCut(new Uint8Array(good.length + 1).fill(0).buffer), null)
  assert.equal(decodeSatCut(changed((_, dv) => dv.setUint32(4, 0, true))), null, 'no cells')
  assert.equal(decodeSatCut(changed((_, dv) => dv.setUint32(4, 3, true))), null, 'more cells than bytes')
  assert.equal(decodeSatCut(changed((_, dv) => dv.setFloat64(8, Number.NaN, true))), null)
  assert.equal(decodeSatCut(changed((_, dv) => dv.setFloat64(32, Number.POSITIVE_INFINITY, true))), null)
  assert.equal(decodeSatCut(new TextEncoder().encode('{"error":"no EUMETSAT credentials"}').buffer), null, 'a JSON error is no frame')
  assert.equal(decodeSatCut(new ArrayBuffer(0)), null)
})
