// client/scene/roofPhoto.ts
// The satellite picture over one building tile, as one image for the buildings layer to lay on its roofs: the base imagery's own
// tiles at a deeper zoom, drawn side by side. They are the URLs the globe asks for itself, so the browser's cache serves both.
// Free sources only: Esri World Imagery on the user's key (its free allowance), else the keyless EOX Sentinel-2 (10 m a pixel:
// a colour per building, no detail). Bing through ion has no tile URL of its own: no picture, the buildings stay clay.
import {
  TextureMagnificationFilter,
  TextureMinificationFilter,
  // @ts-expect-error: private, not in Cesium.d.ts (as gpuImage.ts's)
  Sampler,
  // @ts-expect-error: private, not in Cesium.d.ts
  Texture,
} from 'cesium'
import type { ClientConfig } from '../types.ts'
import { EOX_URL, ESRI_URL } from './imagery.ts'

export interface PhotoSource {
  url(z: number, x: number, y: number): string
  maxZ: number // the deepest zoom worth asking for
}

const fill = (template: string, z: number, x: number, y: number): string => template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))

/** Where the roofs' picture comes from for the configured imagery; null where there is none to take. */
export function photoSource(cfg: Pick<ClientConfig, 'imagery' | 'arcgisKey'>): PhotoSource | null {
  if (cfg.imagery === 'esri' && cfg.arcgisKey) return { url: (z, x, y) => `${fill(ESRI_URL, z, x, y)}?token=${cfg.arcgisKey}`, maxZ: 19 }
  if (cfg.imagery === 'eox') return { url: (z, x, y) => fill(EOX_URL, z, x, y), maxZ: 14 }
  return null
}

const TILE_PX = 256
const MAX_FETCHES = 12 // across all mosaics: the globe loads its own imagery at the same time
let fetching = 0
const waiting: (() => void)[] = []
async function pooled<T>(job: () => Promise<T>): Promise<T> {
  if (fetching >= MAX_FETCHES) await new Promise<void>((r) => waiting.push(r))
  fetching++
  try {
    return await job()
  } finally {
    fetching--
    waiting.shift()?.()
  }
}

class NoDeeperTile extends Error {}

async function mosaicAt(src: PhotoSource, x: number, y: number, n: number, z: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n * TILE_PX
  const ctx = canvas.getContext('2d')!
  await Promise.all(
    Array.from({ length: n * n }, async (_, i) => {
      const [dx, dy] = [i % n, Math.floor(i / n)]
      const bmp = await pooled(async () => {
        const res = await fetch(src.url(z, x * n + dx, y * n + dy))
        if (res.status === 404) throw new NoDeeperTile()
        if (!res.ok) throw new Error(`imagery tile: HTTP ${res.status}`)
        return createImageBitmap(await res.blob()) // Esri without a token answers 200 with JSON: this throws
      })
      ctx.drawImage(bmp, dx * TILE_PX, dy * TILE_PX, TILE_PX, TILE_PX)
      bmp.close()
    }),
  )
  return canvas
}

/**
 * The picture over tile x/y of zoom tileZ, from the source's tiles at zoom z (north up). Where the source has no tile that deep
 * (404), one zoom shallower, down to tileZ.
 */
export async function mosaic(src: PhotoSource, x: number, y: number, tileZ: number, z: number): Promise<HTMLCanvasElement> {
  for (let at = Math.min(z, src.maxZ); ; at--) {
    try {
      return await mosaicAt(src, x, y, 2 ** (at - tileZ), at)
    } catch (e) {
      if (!(e instanceof NoDeeperTile) || at <= tileZ) throw e
    }
  }
}

export interface PhotoTexture {
  destroy(): void
}

/** The picture on the graphics card, with mipmaps: roofs far away must not sparkle, and a wall takes its roof's mean colour from a small level. */
export function photoTexture(context: unknown, canvas: HTMLCanvasElement): PhotoTexture {
  const texture = new Texture({
    context,
    source: canvas,
    sampler: new Sampler({ minificationFilter: TextureMinificationFilter.LINEAR_MIPMAP_LINEAR, magnificationFilter: TextureMagnificationFilter.LINEAR, maximumAnisotropy: 8 }),
  })
  texture.generateMipmap()
  return texture as PhotoTexture
}
