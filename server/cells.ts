// server/cells.ts
import { distanceNm } from '../shared/geo.ts'

/**
 * One fixed upstream query circle. The globe is tiled into 1,332 cells so that every client view maps to a few
 * shared queries (many viewers of one area cost the upstream nothing extra).
 */
export interface Cell {
  id: string
  lat: number
  lon: number
  radiusNm: number
}

// 32 bands of 5.625°: about the side of the largest square cell whose circle (half-diagonal + 10 nm) fits in the
// upstream's 250 nm. Bigger cells, fewer requests: a 400 nm view over Europe takes 10, where 4° cells took 19.
// ponytail: square cells, so each keeps a lat/lon box (cellBox, which the map veils). Hexagons would take about 1.3×
// fewer requests, and hexagons on the map.
const BANDS = 32
const BAND_DEG = 180 / BANDS
const MARGIN_NM = 10
const MAX_RADIUS_NM = 250 // the most adsb.fi and adsb.lol take

/** How far a band's cell reaches from its centre (to its farthest corner), with cols columns in the band. */
function halfDiagNm(band: number, cols: number): number {
  const lat = -90 + (band + 0.5) * BAND_DEG
  const west = -180 / cols
  // The farthest points of a lat/lon rectangle from its centre are its corners; the equatorward ones are farther.
  return Math.max(distanceNm(lat, 0, lat - BAND_DEG / 2, west), distanceNm(lat, 0, lat + BAND_DEG / 2, west))
}

/** Columns in each band: the fewest whose circles still fit in 250 nm, so each cell is as wide as the upstream allows. */
const COLS = Array.from({ length: BANDS }, (_, band) => {
  let cols = 1
  while (halfDiagNm(band, cols) + MARGIN_NM > MAX_RADIUS_NM) cols++
  return cols
})

function makeCell(band: number, col: number): Cell {
  const step = 360 / COLS[band]
  const lat = -90 + (band + 0.5) * BAND_DEG
  const lon = -180 + (col + 0.5) * step
  // ceil: the upstream URL carries whole nm, and rounding down would shave the margin. It stays ≤ 250 (COLS).
  return Object.freeze({ id: `b${band}:${col}`, lat, lon, radiusNm: Math.ceil(halfDiagNm(band, COLS[band]) + MARGIN_NM) })
}

const ALL: Cell[] = []
const BY_ID = new Map<string, Cell>()
for (let band = 0; band < BANDS; band++) {
  for (let col = 0; col < COLS[band]; col++) {
    const cell = makeCell(band, col)
    ALL.push(cell)
    BY_ID.set(cell.id, cell)
  }
}

/** Cells whose query circle intersects the view circle. Together they cover every point of the view. */
export function cellsForView(lat: number, lon: number, radiusNm: number): Cell[] {
  // ponytail: brute force over all 1,332 cells (≈ 0.06 ms per call), which also makes poles and the antimeridian
  // free of special cases. Upgrade to a band/column range scan if it ever shows up in a profile.
  return ALL.filter((c) => distanceNm(lat, lon, c.lat, c.lon) <= c.radiusNm + radiusNm)
}

/** The cell's own lat/lon box, [south, north, west, east] in degrees: the cells tile the globe, each circle covers its box. */
export function cellBox(c: Cell): [number, number, number, number] {
  const half = 180 / COLS[Math.floor((c.lat + 90) / BAND_DEG)]
  const r = (v: number): number => Math.round(v * 1e4) / 1e4 // 4 decimals: ~10 m, and a short JSON number
  return [c.lat - BAND_DEG / 2, c.lat + BAND_DEG / 2, r(c.lon - half), r(c.lon + half)]
}

export function cellById(id: string): Cell {
  const c = BY_ID.get(id)
  if (!c) throw new Error(`unknown cell id: ${id}`)
  return c
}
