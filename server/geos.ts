// server/geos.ts
// Where a place on the Earth falls in a geostationary satellite's picture: the "normalized geostationary projection" of the CGMS
// LRIT/HRIT Global Specification (CGMS 03, issue 2.8, §4.4.3.2), which Meteosat's pictures and the products made from them are laid
// out in. Pure geometry: the satellite stands over the equator at a longitude, 42,164 km from the Earth's centre; a place is seen at
// two angles from the line to the point under the satellite, east and north; a picture's pixels are even steps of those angles.
// SEVIRI's picture (Meteosat Second Generation's imager, whose cloud mask and cloud top height server/eumetsat.ts reads) is 3,712
// pixels a side, 2^16 / 13,642,337 degrees a pixel (the specification's CFAC and LFAC: 3.0 km under the satellite), the point under
// the satellite in the middle of pixel 1856 counted from 1 (COFF, LOFF), the first pixel in the south-east corner, a row running
// west and the rows north. The products' own GRIB grid says the same (Xp = Yp = 1856, scanning mode 0xC0), and the heights' grid,
// in blocks of three pixels, says 619 of 1,237: block 619 is pixels 1855 to 1857, its middle pixel 1856. Two things do not agree
// with it by half a pixel, and are left as they are (a pixel is 3 to 5 km; checked on the frame of 2026-10-04 10:30 UTC):
// - EUMETView's picture of the same mask (the keyless route, client/scene/satellite.ts) matches these pixels best when they are
//   moved half a pixel west and north (93.5 to 97 % of 4 boxes' cells the same class, against 91 to 96 % unmoved): its picture
//   stands about 2 km south-east of this grid's;
// - the mask's processed disc is even about pixel 1855 (from 0) south to north, and about 1855.5 east to west.
// ponytail: the Earth's edge is where the line of sight grazes the ellipsoid; mountains and the atmosphere are not in it. No
// inverse (a pixel's place): the cut-out goes from places to pixels. Upgrade: the inverse, if a product is ever read pixel by pixel.

const RAD = Math.PI / 180

/** The specification's Earth and orbit, km. */
export const GEOS = { reqKm: 6378.169, rpolKm: 6356.5838, hKm: 42164 } as const
const FLAT = GEOS.rpolKm ** 2 / GEOS.reqKm ** 2 // 0.993243: the polar radius to the equatorial, squared
const EDGE_KM = GEOS.reqKm ** 2 / GEOS.hKm // a place is seen when it stands more than this far towards the satellite from the Earth's centre: there the line of sight grazes the ellipsoid

/** SEVIRI's picture: pixels a side, the pixel (from 0) the point under the satellite is the middle of, pixels to a degree of view, and the heights' blocks. */
export const SEVIRI = { n: 3712, mid: 1855, perDeg: 13_642_337 / 65_536, block: 3, blocks: 1237 } as const

/**
 * The angles a place is seen at from a satellite over the equator at subLon: east (plus) of the point under it, and north (plus),
 * degrees. Null for a place the satellite does not see (past the Earth's edge), or no place.
 */
export function geosAngles(lat: number, lon: number, subLon: number): [east: number, north: number] | null {
  const cLat = Math.atan(FLAT * Math.tan(lat * RAD)) // the latitude from the Earth's centre
  const rl = GEOS.rpolKm / Math.sqrt(1 - (1 - FLAT) * Math.cos(cLat) ** 2) // and the distance
  const across = rl * Math.cos(cLat)
  const toward = across * Math.cos((lon - subLon) * RAD)
  if (!(toward > EDGE_KM)) return null // (not a number: not seen)
  const r1 = GEOS.hKm - toward
  const r2 = across * Math.sin((lon - subLon) * RAD)
  const r3 = rl * Math.sin(cLat)
  return [Math.atan(r2 / r1) / RAD, Math.asin(r3 / Math.sqrt(r1 * r1 + r2 * r2 + r3 * r3)) / RAD]
}

/**
 * Where a place falls in SEVIRI's picture from a satellite at subLon: its column (from 0 in the east) and row (from 0 in the
 * south), with fractions: a whole number is a pixel's middle. Null for a place the satellite does not see.
 */
export function seviriPixel(lat: number, lon: number, subLon: number): [col: number, row: number] | null {
  const a = geosAngles(lat, lon, subLon)
  return a === null ? null : [SEVIRI.mid - a[0] * SEVIRI.perDeg, SEVIRI.mid + a[1] * SEVIRI.perDeg]
}

/**
 * The pixels of SEVIRI's picture for a lattice of places: n × n cells over a box (south, west, north, east, degrees; east may run
 * past 180), row by row from the north-west, a cell's middle half a cell in. Each cell's pixel is the one its middle falls in, as
 * row × 3712 + column (the products' own order); −1 for a cell the satellite does not see. The same geometry as geosAngles, a
 * row's and a column's parts worked out once.
 */
export function seviriLattice(box: readonly [south: number, west: number, north: number, east: number], n: number, subLon: number): Int32Array {
  const out = new Int32Array(n * n)
  const cosLon = new Float64Array(n)
  const sinLon = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const d = (box[1] + ((i + 0.5) / n) * (box[3] - box[1]) - subLon) * RAD
    cosLon[i] = Math.cos(d)
    sinLon[i] = Math.sin(d)
  }
  const k = SEVIRI.perDeg / RAD
  for (let j = 0; j < n; j++) {
    const cLat = Math.atan(FLAT * Math.tan((box[2] - ((j + 0.5) / n) * (box[2] - box[0])) * RAD))
    const rl = GEOS.rpolKm / Math.sqrt(1 - (1 - FLAT) * Math.cos(cLat) ** 2)
    const across = rl * Math.cos(cLat)
    const r3 = rl * Math.sin(cLat)
    for (let i = 0, cell = j * n; i < n; i++, cell++) {
      const toward = across * cosLon[i]
      if (!(toward > EDGE_KM)) {
        out[cell] = -1
        continue
      }
      const r1 = GEOS.hKm - toward
      const r2 = across * sinLon[i]
      const col = Math.round(SEVIRI.mid - Math.atan(r2 / r1) * k)
      const row = Math.round(SEVIRI.mid + Math.asin(r3 / Math.sqrt(r1 * r1 + r2 * r2 + r3 * r3)) * k)
      out[cell] = col >= 0 && col < SEVIRI.n && row >= 0 && row < SEVIRI.n ? row * SEVIRI.n + col : -1
    }
  }
  return out
}
