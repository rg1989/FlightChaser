// server/tiles.ts
// GET /api/tiles/lamps/v1/{z}/{x}/{y}.png and /api/tiles/borders/v1/… (shared/tiles.ts): each tile drawn here at its first
// ask (lamps.ts, borders.ts), kept on disk and sent with a year's cache, so the page only shows pictures. A tile with
// nothing on it is one clear pixel (a 4-byte texture, not 256 KB).
// ponytail: the folder is never trimmed (a lamp tile is a few KB to ~140 KB; most border tiles are 1 px). Delete it to
// free the space; add a size cap if it grows past what a disk shrugs at. A tile is drawn on the server's one thread
// (10–40 ms a lamp tile, once; the PNG's deflate off it): a worker pool if API answers lag while a new city is drawn.
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { crc32, deflate } from 'node:zlib'
import { BORDERS_MAX_LEVEL, BORDERS_TILES, LAMPS_MAX_LEVEL, LAMPS_TILES } from '../shared/tiles.ts'
import { borderTile, decodeBorders, type BorderLine } from './borders.ts'
import { Lamps } from './lamps.ts'

const TILE = 256
const deflateAsync = promisify(deflate)

/** The PNG of a w × h RGBA image as it is: straight alpha, the colour of clear pixels kept (a canvas would lose it). */
export async function encodePng(px: Uint8Array | Uint8ClampedArray, w: number, h: number): Promise<Buffer> {
  const row = 1 + w * 4
  const raw = Buffer.alloc(h * row)
  for (let y = 0; y < h; y++) {
    raw[y * row] = 1 // filter Sub: each byte less the one a pixel to its left (the smooth glow packs well)
    for (let i = 0; i < w * 4; i++) raw[y * row + 1 + i] = px[y * w * 4 + i] - (i < 4 ? 0 : px[y * w * 4 + i - 4]) // mod 256
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bits per channel
  ihdr[9] = 6 // RGBA
  const chunk = (type: string, data: Buffer): Buffer => {
    const b = Buffer.alloc(12 + data.length)
    b.writeUInt32BE(data.length, 0)
    b.write(type, 4, 'latin1')
    data.copy(b, 8)
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length)
    return b
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', await deflateAsync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/** A template's path under /api/ as a pattern: z, x, y captured. */
const route = (template: string): RegExp => new RegExp(`^/api/${template.replace('.', '\\.').replace('{z}/{x}/{y}', '(\\d+)/(\\d+)/(\\d+)')}$`)
/** Where a template's tiles are kept under the folder: its kind and version (lamps/v1). */
const folder = (template: string): string => template.split('/{')[0].replace(/^tiles\//, '')
const KINDS = [
  { lamps: true, route: route(LAMPS_TILES), dir: folder(LAMPS_TILES), maxLevel: LAMPS_MAX_LEVEL },
  { lamps: false, route: route(BORDERS_TILES), dir: folder(BORDERS_TILES), maxLevel: BORDERS_MAX_LEVEL },
]

export interface TilesOptions {
  dir: string | null // where tiles are kept (TILES_DIR); null: drawn at each ask
  bordersFile: string // public/map/borders.json
  get?: typeof fetch // the lamps' sources (tests)
}

export class Tiles {
  readonly #dir: string | null
  readonly #bordersFile: string
  readonly #lamps: Lamps
  readonly #drawing = new Map<string, Promise<Buffer>>() // a tile asked for again while it is drawn waits for that one
  #borders: Promise<BorderLine[]> | null = null
  #blank: Promise<Buffer> | null = null

  constructor(opts: TilesOptions) {
    this.#dir = opts.dir
    this.#bordersFile = opts.bordersFile
    this.#lamps = new Lamps(opts.get)
  }

  /** The PNG at an /api/tiles/ path; null: no such tile. Rejects when a source fails (nothing is kept then). */
  png(pathname: string): Promise<Buffer | null> {
    for (const kind of KINDS) {
      const m = kind.route.exec(pathname)
      if (!m) continue
      const [z, x, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
      if (z > kind.maxLevel || x >= 2 ** z || y >= 2 ** z) return Promise.resolve(null)
      const key = `${kind.dir}/${z}/${x}/${y}.png`
      let p = this.#drawing.get(key)
      if (!p) {
        p = this.#kept(key, () => (kind.lamps ? this.#lamps.tile(z, x, y) : this.#border(z, x, y))).finally(() => this.#drawing.delete(key))
        this.#drawing.set(key, p)
      }
      return p
    }
    return Promise.resolve(null)
  }

  /** The tile from disk, or drawn and written there (whole or not at all: a temporary file renamed). */
  async #kept(key: string, draw: () => Promise<Uint8ClampedArray | null>): Promise<Buffer> {
    const file = this.#dir === null ? null : join(this.#dir, key)
    if (file !== null) {
      try {
        return await readFile(file)
      } catch {} // not drawn yet
    }
    const px = await draw()
    const png = px === null ? await (this.#blank ??= encodePng(new Uint8Array(4), 1, 1)) : await encodePng(px, TILE, TILE)
    if (file !== null) {
      await mkdir(dirname(file), { recursive: true })
      const tmp = `${file}.${process.pid}.tmp`
      await writeFile(tmp, png)
      await rename(tmp, file)
    }
    return png
  }

  async #border(z: number, x: number, y: number): Promise<Uint8ClampedArray | null> {
    this.#borders ??= readFile(this.#bordersFile, 'utf8')
      .then((t) => decodeBorders(JSON.parse(t)))
      .catch((e: unknown) => {
        this.#borders = null // read again at the next ask
        throw e
      })
    return borderTile(await this.#borders, x, y, z)
  }
}
