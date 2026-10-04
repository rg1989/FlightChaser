// client/scene/gpuImage.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bytesImage } from './gpuImage.ts'

test('bytesImage: the stand-in where there is no graphics card: an image of zeros, written piece by piece at a column and a row (row 0 the first), its bytes what a sampler would be given', () => {
  const im = bytesImage(4, 3)
  assert.deepEqual([im.width, im.height, im.data.length], [4, 3, 48])
  assert.ok(im.data.every((b) => b === 0))
  assert.equal(im.texture, im, 'what a uniform is given is the image itself: its bytes can be looked at')
  im.write({ data: Uint8ClampedArray.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), width: 2, height: 2 }, 1, 1)
  const px = (x: number, y: number): number[] => [...im.data.subarray((y * 4 + x) * 4, (y * 4 + x) * 4 + 4)]
  assert.deepEqual([px(1, 1), px(2, 1), px(1, 2), px(2, 2)], [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]])
  assert.deepEqual([px(0, 0), px(3, 2), px(0, 1), px(3, 1)], [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'nothing else is touched')
  im.write({ data: Uint8ClampedArray.from([255, 254, 253, 252]), width: 1, height: 1 }, 2, 1)
  assert.deepEqual(px(2, 1), [255, 254, 253, 252], 'a later piece lies over an earlier one')
  assert.equal(im.destroyed, false)
  im.destroy()
  assert.equal(im.destroyed, true)
})
