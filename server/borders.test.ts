// server/borders.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bordersFrom } from '../tools/build-map-overlays.ts'
import { borderTile, decodeBorders, strokeRuns, tileRuns } from './borders.ts'

test('decodeBorders: the first point, then each step from the one before, in 1e-4°; each line\'s box', () => {
  const [a, b] = decodeBorders({ lines: [[347800, 320800, 1, 2, 199, -998], [-1225000, 377000, 10, -10]] })
  assert.ok(a.pts instanceof Float64Array)
  assert.deepEqual([...a.pts], [34.78, 32.08, 34.7801, 32.0802, 34.8, 31.9804])
  assert.deepEqual([a.west, a.south, a.east, a.north], [34.78, 31.9804, 34.8, 32.0802])
  assert.deepEqual([...b.pts], [-122.5, 37.7, -122.499, 37.699])
  assert.deepEqual([b.west, b.south, b.east, b.north], [-122.5, 37.699, -122.499, 37.7])
})

test('the borders file round trip: what tools/build-map-overlays.ts writes decodes back to its points, to 1e-4°', () => {
  const a = [[-117.12345, 32.53], [-116.9, 32.6], [-114.7, 32.72]]
  const b = [[34.25, 31.32], [34.267, 31.22]]
  const line = (coordinates: number[][]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })
  const got = decodeBorders(bordersFrom({ type: 'FeatureCollection', features: [line(a), line(b)] }))
  const want = [a, b].map((l) => l.flatMap(([lon, lat]) => [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4]))
  assert.deepEqual(got.map((l) => [...l.pts]), want)
})

/** A border line straight from degree pairs (decodeBorders' shape). */
const border = (...pairs: [number, number][]) => decodeBorders({ lines: [pairs.flatMap(([lon, lat], i) => i === 0
  ? [Math.round(lon * 1e4), Math.round(lat * 1e4)]
  : [Math.round(lon * 1e4) - Math.round(pairs[i - 1][0] * 1e4), Math.round(lat * 1e4) - Math.round(pairs[i - 1][1] * 1e4)])] })[0]
const close = (got: number[], want: number[], tol = 0.05): boolean => got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) <= tol)

test('tileRuns: a line across the world tile, in its pixels (Web Mercator, 256 px)', () => {
  const runs = tileRuns([border([-90, 0], [90, 0])], 0, 0, 0)
  assert.equal(runs.length, 1)
  assert.ok(close(runs[0], [64, 128, 192, 128]), String(runs[0]))
})

test('tileRuns: a line crossing a deeper tile draws along it, edge to edge; one far from the tile draws nothing', () => {
  const y40 = 131.7 // 40°N in tile (2, 1) of level 2
  const runs = tileRuns([border([-45, 40], [45, 40], [135, 40]), border([-100, -40], [-90, -40])], 2, 1, 2)
  assert.equal(runs.length, 1, 'the far line has no run')
  assert.ok(close(runs[0], [-128, y40, 128, y40, 384, y40], 0.1), String(runs[0]))
})

test('tileRuns: only the stretch near the tile, not a long line\'s whole length; a line whose box covers the tile but that passes by it draws nothing', () => {
  // Along 10°N from 170°W to 10°E: in tile (1, 3) of level 3 (135°–90°W, 0°–41°N) only the steps through it, and one each side.
  const long = border(...Array.from({ length: 19 }, (_, i): [number, number] => [-170 + i * 10, 10]))
  const runs = tileRuns([long], 1, 3, 3)
  assert.equal(runs.length, 1)
  const xs = runs[0].filter((_, i) => i % 2 === 0)
  assert.ok(xs.length <= 8 && xs.length >= 5, `${xs.length} points`)
  assert.ok(xs[0] < 0 && xs[xs.length - 1] > 256, String(xs))
  // An L round the tile's corner: its box holds the tile (0°–90°E, 0°–66.5°N at level 2), its lines never come near.
  assert.deepEqual(tileRuns([border([-10, 80], [100, 80], [100, -10])], 2, 1, 2), [])
})

test('tileRuns: a line within the 2-px margin outside a tile still draws (its halo reaches in); one 3 px out does not', () => {
  // Tile (0, 0) of level 1 ends at 0°E, x 256; 1.0547°E is x 257.5 and 2.109°E x 259.
  assert.equal(tileRuns([border([1.0547, 10], [1.0547, 20])], 0, 0, 1).length, 1)
  assert.equal(tileRuns([border([2.109, 10], [2.109, 20])], 0, 0, 1).length, 0)
})

/** A 2-D context that records what is drawn: each stroke with its style, width and path. */
function recorder() {
  const strokes: { style: string; width: number; join: string; cap: string; path: number[][] }[] = []
  let path: number[][] = []
  const ctx = {
    strokeStyle: '', lineWidth: 1, lineJoin: 'miter', lineCap: 'butt',
    beginPath: (): void => void (path = []),
    moveTo: (x: number, y: number): void => void path.push([x, y]),
    lineTo: (x: number, y: number): void => void path[path.length - 1].push(x, y),
    stroke: (): void => void strokes.push({ style: ctx.strokeStyle, width: ctx.lineWidth, join: ctx.lineJoin, cap: ctx.lineCap, path: path.map((r) => [...r]) }),
  }
  return { ctx, strokes }
}

test('strokeRuns: a dark 3-px halo under a light 1.4-px line, round joins, both along every run', () => {
  const { ctx, strokes } = recorder()
  const runs = [[0, 10, 50, 12, 100, 30], [200, 0, 210, 256]]
  strokeRuns(ctx as unknown as CanvasRenderingContext2D, runs)
  assert.deepEqual(strokes.map((s) => [s.style, s.width, s.join, s.cap]), [
    ['rgba(0, 0, 0, 0.45)', 3, 'round', 'round'],
    ['rgba(255, 238, 205, 0.92)', 1.4, 'round', 'round'],
  ])
  for (const s of strokes) assert.deepEqual(s.path, runs)
})

test('borderTile: a line near the tile, drawn: the light line over its dark halo, clear elsewhere; no line near: null', () => {
  const lines = border([35.15, 20], [35.15, 40]) // a meridian across tile (9, 6, 4): 22.5–45°E, 21.8–40.9°N
  const px = borderTile([lines], 9, 6, 4)!
  const x = Math.floor(((35.15 + 180) / 360 * 16 - 9) * 256) // the line's pixel column (row 180 is ~28°N)
  const at = (c: number): number[] => [...px.subarray((180 * 256 + c) * 4, (180 * 256 + c) * 4 + 4)]
  assert.ok(at(x)[0] > 200 && at(x)[3] > 200, `the line: ${at(x)}`)
  assert.deepEqual(at(x + 10), [0, 0, 0, 0])
  assert.equal(borderTile([lines], 0, 0, 4), null)
})
