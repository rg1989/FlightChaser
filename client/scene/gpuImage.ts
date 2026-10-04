// client/scene/gpuImage.ts
// An image on the graphics card that its owner writes itself, whole or a piece at a time, and hands to a shader's sampler: the cloud
// volume's field, clear-air map, noise and hazard edges (cloudVolume.ts). Cesium's own way for a post-process stage is an ImageData it
// uploads when the stage is made, so that other bytes are another stage, and 6 MB go to the card in one frame; an image of the
// volume's own is written a band a frame, and the stage that reads it stands.
// The bytes go up as they are: nothing is premultiplied (an alpha here is data), and nothing is flipped: the first row written is
// the texture's first (v = 0).
// In the app an image is a Cesium Texture (a private class of Cesium's renderer, exported at runtime and missing from Cesium.d.ts:
// a Cesium that drops it fails the build, as imageryFade.ts says of its own); where there is no graphics card (Node's tests) it is
// its bytes.
// ponytail: tied to Cesium 1.145's Texture (its constructor's options and copyFrom) and to a post-process stage taking a function
// that gives a Texture for a sampler (PostProcessStage.js createUniformMap). Upgrade: check both on a Cesium bump; the check run's
// clouds are the test.
import {
  PixelDatatype, PixelFormat,
  // @ts-expect-error: private, not in Cesium.d.ts
  Texture,
} from 'cesium'
import type { Bitmap } from './wxField.ts'

export interface GpuImage {
  readonly width: number
  readonly height: number
  /** What a shader's sampler is given. */
  readonly texture: unknown
  /** The bytes of `part` in place of what the image holds from column x and row y on (row 0: the image's first row). */
  write(part: Bitmap, x: number, y: number): void
  destroy(): void
}

/** Makes an image of width × height texels, all zero until written. */
export type MakeImage = (width: number, height: number) => GpuImage

/** An image that is its bytes (no graphics card): what is written can be read back from `data`. */
export function bytesImage(width: number, height: number): GpuImage & Bitmap & { destroyed: boolean } {
  const data = new Uint8ClampedArray(width * height * 4)
  const im = {
    width, height, data, destroyed: false, texture: null as unknown,
    write(part: Bitmap, x: number, y: number): void {
      for (let r = 0; r < part.height; r++) data.set(part.data.subarray(r * part.width * 4, (r + 1) * part.width * 4), ((y + r) * width + x) * 4)
    },
    destroy(): void {
      im.destroyed = true
    },
  }
  im.texture = im
  return im
}

/** Images as Cesium textures in a scene's context (Scene.context: private, there at runtime). */
export function textureImages(context: unknown): MakeImage {
  return (width, height) => {
    const texture = new Texture({ context, width, height, pixelFormat: PixelFormat.RGBA, pixelDatatype: PixelDatatype.UNSIGNED_BYTE, flipY: false })
    return {
      width, height, texture,
      write: (part, x, y) => texture.copyFrom({
        source: { width: part.width, height: part.height, arrayBufferView: new Uint8Array(part.data.buffer, part.data.byteOffset, part.data.byteLength) }, xOffset: x, yOffset: y,
      }),
      destroy: () => void texture.destroy(),
    }
  }
}
