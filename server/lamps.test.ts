// server/lamps.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Lamps, NIGHT_MAX_LEVEL, NIGHT_URL, composeLamps, glowAt, litOf, metresPerPx } from './lamps.ts'
import { encodePng } from './tiles.ts'

test('NIGHT_URL: GIBS VIIRS Black Marble 2016, Web Mercator Level8 PNG tiles, z/y/x', () => {
  assert.equal(
    NIGHT_URL,
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
  )
  assert.equal(NIGHT_MAX_LEVEL, 8) // GIBS answers z9 with HTTP 400
})

test("litOf: the sea and the unlit land (the art's blue-grey underlay) have no light; the art's white cores are full", () => {
  // Typical art over Israel by luminance band (2026-09-29): sea, desert, the underlay's brightest; a town; a core.
  for (const [r, g, b] of [[4, 5, 15], [0, 0, 0], [33, 31, 60], [46, 42, 69], [54, 49, 73]]) assert.equal(litOf(r, g, b), 0, `${[r, g, b]}`)
  const town = litOf(150, 122, 108)
  assert.ok(town > 0.3 && town < 0.45, `town ${town}`)
  assert.equal(litOf(255, 252, 245), 1)
  assert.equal(litOf(255, 255, 255), 1)
})

const TILE = 256
/** A lit grid (the art's light) of one value, or a function of the art pixel. */
const grid = (f: (x: number, y: number) => number): Float32Array => {
  const g = new Float32Array(TILE * TILE)
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) g[y * TILE + x] = f(x, y)
  return g
}
/** A tile's pixels with the drawn streets as alpha: road(x, y) in 0–1. */
const streets = (road: (x: number, y: number) => number): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(TILE * TILE * 4)
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px[(y * TILE + x) * 4 + 3] = 255 * road(x, y)
  return px
}
const at = (px: Uint8ClampedArray, x: number, y: number): number[] => [...px.subarray((y * TILE + x) * 4, (y * TILE + x) * 4 + 4)]

test('composeLamps: no light, nothing drawn — the unlit land and the sea stay transparent, streets or not', () => {
  for (const level of [5, 9, 13]) {
    const px = streets(() => 1)
    composeLamps(px, grid(() => 0), 0, 0, TILE, level)
    for (const [x, y] of [[0, 0], [128, 77], [255, 255]]) assert.equal(at(px, x, y)[3], 0, `level ${level}`)
  }
})

test("composeLamps: in a lit city the streets keep their lamps' colours, and the blocks between them glow faintly", () => {
  const px = streets((x) => (x % 16 === 0 ? 1 : 0)) // a street every 16 px…
  for (let i = 0; i < px.length; i += 4) [px[i], px[i + 1], px[i + 2]] = [255, 140, 40] // …of sodium lamps
  composeLamps(px, grid(() => 1), 0, 0, TILE, 13)
  assert.deepEqual(at(px, 32, 100), [255, 140, 40, 255]) // a lit street, full, its own colour
  const [r, g, b, a] = at(px, 40, 100)
  assert.equal(a, Math.round(255 * glowAt(13)))
  assert.ok(r === 255 && g > 190 && b > 120 && b < g, `a bright core glows warm white: ${[r, g, b]}`)
})

test('composeLamps: a dim town lights its streets fully once its light passes a third; a barely lit one partly', () => {
  const town = streets(() => 1)
  composeLamps(town, grid(() => 0.4), 0, 0, TILE, 13)
  assert.equal(at(town, 10, 10)[3], 255)
  const faint = streets(() => 1)
  composeLamps(faint, grid(() => 0.1), 0, 0, TILE, 13)
  assert.ok(at(faint, 10, 10)[3] < 100, 'a barely lit area lights its streets partly')
  const glow = streets(() => 0)
  composeLamps(glow, grid(() => 0.4), 0, 0, TILE, 13)
  const [r, g, b] = at(glow, 10, 10)
  assert.ok(r === 255 && g < 170 && b < 90, `a town's glow is sodium orange: ${[r, g, b]}`)
})

test('glowAt: all of the glow on coarse tiles; halved every two levels from 11, as the tiles draw the lamps themselves', () => {
  for (const level of [0, 8, 10, 11]) assert.equal(glowAt(level), glowAt(0))
  assert.ok(Math.abs(glowAt(13) - glowAt(11) / 2) < 1e-12)
  assert.ok(glowAt(14) < glowAt(13) && glowAt(13) < glowAt(12))
})

test('composeLamps below the street levels: the streets count as their mean in gold, whatever px held', () => {
  const coarse = streets(() => 1)
  composeLamps(coarse, grid(() => 1), 0, 0, TILE, 9)
  const [r, g, b, a] = at(coarse, 100, 100)
  assert.ok(a > 70 && a < 150, `a lit city from afar: ${a}`)
  assert.ok(r === 255 && g > 150 && b < g, `gold: ${[r, g, b]}`)
  const empty = streets(() => 0)
  composeLamps(empty, grid(() => 1), 0, 0, TILE, 9)
  assert.deepEqual(at(empty, 5, 5), at(coarse, 100, 100))
})

test('composeLamps samples its part of the art: a deeper tile covers [ox, ox + span) of the level-8 grid, bilinear', () => {
  // The art lit only in its east half (x ≥ 128). A level-9 tile over the west half is dark; one over the east half lit.
  const art = grid((x) => (x >= 128 ? 1 : 0))
  const west = streets(() => 1)
  composeLamps(west, art, 0, 0, 128, 13)
  assert.equal(at(west, 100, 50)[3], 0)
  const east = streets(() => 1)
  composeLamps(east, art, 128, 0, 128, 13)
  assert.equal(at(east, 100, 50)[3], 255)
  // across the edge the light ramps over one art pixel (two tile pixels here), not a hard step
  const edge = streets(() => 1)
  composeLamps(edge, art, 64, 0, 128, 13)
  const row = [124, 126, 127, 128, 129, 131].map((x) => at(edge, x, 10)[3])
  assert.ok(row[0] === 0 && row[5] === 255 && row.some((v) => v > 0 && v < 255), `${row}`)
})

test('metresPerPx: Web Mercator ground resolution of a tile row (156 km/px at z0 on the equator; ~8.1 m at z14 over Tel Aviv)', () => {
  assert.ok(Math.abs(metresPerPx(0, 0) - 156_543.03) < 0.01) // the one z0 tile spans ±85°: its middle row is the equator
  const z14TelAviv = metresPerPx(14, 6649) // 32.07° N
  assert.ok(Math.abs(z14TelAviv - 8.1) < 0.05, `${z14TelAviv}`)
  assert.ok(Math.abs(metresPerPx(13, 3324) / metresPerPx(14, 6649) - 2) < 0.01)
})

/** A fetch that answers from a table by URL prefix (the first match), and counts what it was asked. */
function fakeFetch(answers: [string, () => Response][]) {
  const asked: string[] = []
  const get = (async (url: string) => {
    asked.push(String(url))
    const a = answers.find(([p]) => String(url).startsWith(p))
    return a ? a[1]() : new Response(null, { status: 404 })
  }) as typeof fetch
  return { get, asked }
}
const GIBS = NIGHT_URL.split('{z}')[0]
const art = async (rgb: number[]): Promise<Response> => {
  const px = new Uint8Array(TILE * TILE * 4)
  for (let i = 0; i < px.length; i += 4) px.set([...rgb, 255], i)
  return new Response(new Uint8Array(await encodePng(px, TILE, TILE)))
}

test('Lamps.tile: a coarse tile over a lit city is its glow, gold; over the dark, nothing (null); the art is fetched once for the tiles under it', async () => {
  const white = await art([255, 255, 255])
  const { get, asked } = fakeFetch([[GIBS, () => white.clone()]])
  const lamps = new Lamps(get)
  const a = (await lamps.tile(9, 300, 200))!
  const b = (await lamps.tile(9, 301, 201))!
  assert.deepEqual(asked, [`${GIBS}${NIGHT_MAX_LEVEL}/100/150.png`], 'z/y/x: the level-8 tile above both, once')
  assert.ok(a[3] > 70 && a[3] < 150 && a[0] === 255, `a lit city from afar: ${[...a.subarray(0, 4)]}`)
  assert.deepEqual([...b.subarray(0, 4)], [...a.subarray(0, 4)])
  const dark = await art([4, 5, 15]) // the sea
  assert.equal(await new Lamps(fakeFetch([[GIBS, () => dark.clone()]]).get).tile(7, 10, 10), null)
})

test('Lamps.tile: a street-level tile with no roads where OpenFreeMap has none (404) is the glow alone; a failing source rejects and is asked again', async () => {
  const white = await art([255, 255, 255])
  let gibsUp = false
  const { get, asked } = fakeFetch([
    [GIBS, () => (gibsUp ? white.clone() : new Response(null, { status: 503 }))],
    ['https://tiles.openfreemap.org/planet/20261001/', () => new Response(null, { status: 404 })],
    ['https://tiles.openfreemap.org/planet', () => Response.json({ tiles: ['https://tiles.openfreemap.org/planet/20261001/{z}/{x}/{y}.pbf'] })],
  ])
  const lamps = new Lamps(get)
  await assert.rejects(lamps.tile(13, 4887, 3324), /HTTP 503/)
  gibsUp = true
  const px = (await lamps.tile(13, 4887, 3324))!
  assert.equal(px[3], Math.round(255 * glowAt(13)))
  assert.equal(asked.filter((u) => u.startsWith(GIBS)).length, 2, 'the failed art asked again')
  assert.ok(asked.includes('https://tiles.openfreemap.org/planet/20261001/13/4887/3324.pbf'))
  const elsewhere = new Lamps(fakeFetch([[GIBS, () => white.clone()], ['https://tiles.openfreemap.org/planet', () => Response.json({ tiles: ['https://evil.example/{z}/{x}/{y}.pbf'] })]]).get)
  await assert.rejects(elsewhere.tile(13, 4887, 3324), /unexpected tile URL/, 'the TileJSON may not send us elsewhere')
})
