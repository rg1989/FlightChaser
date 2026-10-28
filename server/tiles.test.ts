// server/tiles.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { Tiles, encodePng } from './tiles.ts'

/** A PNG's RGBA as encodePng wrote it: IHDR's size, IDAT inflated, the Sub filter undone. */
function decode(png: Buffer): { w: number; h: number; px: Uint8Array } {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const w = png.readUInt32BE(16)
  const h = png.readUInt32BE(20)
  const idat = png.indexOf('IDAT')
  const raw = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)))
  const px = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    assert.equal(raw[y * (1 + w * 4)], 1)
    for (let i = 0; i < w * 4; i++) px[y * w * 4 + i] = raw[y * (1 + w * 4) + 1 + i] + (i < 4 ? 0 : px[y * w * 4 + i - 4])
  }
  return { w, h, px }
}

test('encodePng: RGBA as it is, the colour of clear pixels kept (straight alpha: no dark fringe where the glow ends)', async () => {
  const px = new Uint8Array([255, 140, 40, 0, 255, 215, 160, 77, 1, 2, 3, 255, 250, 0, 9, 128])
  const got = decode(await encodePng(px, 2, 2))
  assert.deepEqual([got.w, got.h], [2, 2])
  assert.deepEqual([...got.px], [...px])
})

const ISRAEL = JSON.stringify({ lines: [[351000, 331000, 1000, -500]] }) // a line at 35.1°E–35.2°E, 33°N

async function withTiles(run: (t: Tiles, dir: string, asked: string[]) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'fh-tiles-'))
  const bordersFile = join(dir, 'borders.json')
  await writeFile(bordersFile, ISRAEL)
  const asked: string[] = []
  const get = (async (url: string) => (asked.push(String(url)), new Response(null, { status: 503 }))) as typeof fetch
  try {
    await run(new Tiles({ dir: join(dir, 'tiles'), bordersFile, get }), dir, asked)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('Tiles: a border tile drawn at its first ask and kept on disk, then sent from there; an empty one is one clear pixel', async () => {
  await withTiles(async (t, dir) => {
    const png = (await t.png('/api/tiles/borders/v1/4/9/6.png'))!
    assert.deepEqual([decode(png).w, decode(png).h], [256, 256])
    const file = join(dir, 'tiles/borders/v1/4/9/6.png')
    assert.deepEqual(await readFile(file), png)
    await writeFile(file, 'kept') // what is on disk is what is sent
    assert.equal(String(await t.png('/api/tiles/borders/v1/4/9/6.png')), 'kept')
    const empty = decode((await t.png('/api/tiles/borders/v1/4/0/0.png'))!)
    assert.deepEqual([empty.w, empty.h, ...empty.px], [1, 1, 0, 0, 0, 0])
    assert.deepEqual((await readdir(join(dir, 'tiles/borders/v1/4/9'))).sort(), ['6.png'], 'no temporary file left')
  })
})

test('Tiles: no tile for another path, version, kind, a level past the deepest or a tile off the level', async () => {
  await withTiles(async (t) => {
    for (const p of ['/api/tiles/borders/v2/4/9/6.png', '/api/tiles/roads/v1/4/9/6.png', '/api/tiles/borders/v1/4/9/6.jpg', '/api/tiles/borders/v1/19/0/0.png',
      '/api/tiles/lamps/v1/15/0/0.png', '/api/tiles/borders/v1/4/16/0.png', '/api/tiles/borders/v1/4/0/-1.png', '/api/tiles/borders/v1/4/9/6.png/x']) {
      assert.equal(await t.png(p), null, p)
    }
  })
})

test('Tiles: a lamp tile whose sources fail rejects and is not kept: the next ask draws it again', async () => {
  await withTiles(async (t, dir, asked) => {
    await assert.rejects(t.png('/api/tiles/lamps/v1/9/300/200.png'), /HTTP 503/)
    await assert.rejects(t.png('/api/tiles/lamps/v1/9/300/200.png'), /HTTP 503/)
    assert.equal(asked.length, 2)
    await assert.rejects(readdir(join(dir, 'tiles/lamps')))
  })
})

test('Tiles: asks for a tile while it is drawn share the drawing', async () => {
  await withTiles(async (t) => {
    const a = t.png('/api/tiles/borders/v1/4/9/6.png')
    assert.equal(t.png('/api/tiles/borders/v1/4/9/6.png'), a)
    await a
    assert.notEqual(t.png('/api/tiles/borders/v1/4/9/6.png'), a, 'drawn: the next ask reads the disk')
  })
})
