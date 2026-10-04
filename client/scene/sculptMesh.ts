// client/scene/sculptMesh.ts
// The weather field (wxField.ts) as sculpted bodies: the "Sculpted" look's clouds, built once per field as triangles the graphics card
// draws like any other solid, in place of a march through the field for every pixel of every frame (cloudVolume.ts). Pure (no Cesium, no
// DOM): the field's worker builds it (wxFieldJob.ts) and Node tests cover it.
// A body stands where a band's cover is above RIM_COVER. Its outline is the line where the cover is RIM_COVER, found between the
// nodes of a grid (marching squares: the outline's corners lie on the grid's edges, where the cover crosses), so it is a calm
// polygon, not the grid's stairs. Its underside is at the band's base; its top rises from the rim by how far in from the rim a
// place is (shoulder(): nothing at the rim, the whole of top − base once it is a shoulder's width in, a quarter of a sine wave
// between), so a body is a pillow with a rounded shoulder, a small cloud a dome, and a storm a tall rounded tower. The shoulder is
// as wide as the body is thick there, at most SHOULDER_MAX_KM, and no wider than the deepest place the way inward from there leads
// to is from the rim (so a body, or a limb of one, narrower than its shoulder still comes to its top, as a dome; but a limb less
// than 1/SLENDER of its height deep does not: a filament is a low ridge, not a blade).
// By the distance from the rim, not by the cover: the field's cover rises from RIM_COVER to its full value within 0.1 to 0.6 km of
// a cloud's edge, whatever the cloud's height, so a top that rose with the cover was a cliff at every rim and its level lines
// zigzagged. The distance is to the rim's own line (each node near it is measured to the outline's pieces in the cells round it,
// and the nodes further in to the nearest of those points, handed from node to node).
// In the towers' band the base is the lowest of what reaches a place and the top the highest (wxField.ts), so an anvil's underside
// is high and its storm's stem goes down to the storm's base.
// The grid is finer than the field where that shows and coarser where it does not. The field's square is cut into blocks of
// BLOCK_TEXELS texels a side (2.5 km). A block the rim or a shoulder passes through is cut into cells of half a texel (312 m: the
// cover between the texels is read with a smooth curve, Catmull-Rom's, so a cumulus two texels wide is a round pebble); a block that
// is all body and whose top and underside are level to within FLAT_M is a fan of at most a few triangles round its middle (its edge
// toward a finely cut block has that block's corners, so no gap opens between them); a block with no body is nothing. So the
// triangles go with the length of the rims, not with the area of the cloud. A band that would still take more than BAND_TRIANGLES
// (a sky of broken cover with no level part) is cut more coarsely: cells of a texel, then of two.
// A body is closed: its top sheet and its underside meet at the rim, in the same places. Each sheet has its own corners (the rim is a
// crease: the top's normals lean out, the underside's point down), and a corner's normal is the mean of its sheet's faces round it.
// A band's mesh is its own (no corner is shared between bands): the renderer writes a band to the card a frame.
// A corner is VERTEX_FLOATS numbers: its place, metres east, north and up in the frame at the field's middle on the ellipsoid (heights
// above the sea are laid as heights above the ellipsoid: the renderer lifts the frame by the geoid at the middle); its normal; its
// severity (0 … 3), its height above the sea (m: the shader draws the level lines from it), 1 on the underside, and how far in from
// the rim it is (m: the shader draws the rim's line from it).
// With its mesh a band brings its top sheet and its underside as two maps on the field's texels (roof, floor): what answers "is this
// place inside a body" (sculptInside.ts). And the mesh brings one image of the bodies' shadow on the ground (shadowImage): a faint
// tint under each body, soft at its edge, moved a little away from the light: enough to place a cloud over the ground, and no more,
// so that the map under it stays readable.
import { BANDS, FIELD_KM, FIELD_N, type Bitmap, type WxField } from './wxField.ts'

export const RIM_COVER = 0.4 // a body stands where the cover is above this
export const SHOULDER_MAX_KM = 2.5 // a body's top is rounded over at most this far in from its rim
export const VERTEX_FLOATS = 10 // x, y, z, the normal's x, y, z, the severity, the height above the sea, 1 on the underside, the distance in from the rim
export const BAND_TRIANGLES = 300_000 // a band of more than this is cut more coarsely
const BLOCK_TEXELS = 4 // a block's side, in the field's texels
const NODE_TEXELS: readonly number[] = [0.5, 1, 2] // the nodes' spacing at each level of cut, finest first
const FLAT_M = 30 // a block all of body whose top and underside are level to within this is not cut finely
const SMOOTH_KM = 0.6 // the bases and tops are smoothed before a body is shaped: over this far each way,
const HEIGHT_PASSES = 3 // this many times (σ 0.77 km at the finest cut)
const DEPTH_PASSES = 3 // and each node's own depth this many times
const SLENDER = 8 // a part of a body comes to its whole height only if it is at least this share of that height deep from its rim: a filament is a low ridge, not a blade
const EDGE_W = 1e-3 // a texel with heights and no cover (wxField.ts: just outside a cloud) weighs this in a node's heights
const HALF: readonly number[] = [-1 / 16, 9 / 16, 9 / 16, -1 / 16] // Catmull-Rom's weights half-way between two texels
const WHOLE: readonly number[] = [0, 1, 0, 0] // and on a texel
const TEXEL_KM = FIELD_KM / FIELD_N
const KM_PER_DEG = 111.195 // of latitude: the field's map (wxField.ts)
const RAD = Math.PI / 180
const A = 6378137 // WGS84's semi-major axis, m
const E2 = 6.69437999014e-3 // and its first eccentricity, squared
const F = VERTEX_FLOATS

/** One band's bodies: its corners (VERTEX_FLOATS numbers each) and its triangles (three corners each, counter-clockwise from outside). */
export interface SculptBand {
  band: number
  vertices: Float32Array
  indices: Uint32Array
  roof: Float32Array // the top sheet's height on the field's texels, m above the sea; 0 outside a body (sculptInside.ts asks it)
  floor: Float32Array // and the underside's
}

/** A field's bodies: a mesh for each band that has one, round the field's middle (lat, lon); how far the farthest corner is from it, m; how many triangles in all; how long the building took, ms. */
export interface SculptMesh {
  lat: number
  lon: number
  bands: SculptBand[]
  radiusM: number
  triangles: number
  shadow: Bitmap | null // the bodies' shadow on the ground, over the field's square, the first row the north; none with no body
  ms: number
}

/** A body's thickness as a share of top − base, by how far in from the rim a place is, in shoulder widths: nothing at the rim, the whole from one width in, a quarter of a sine wave between (level where it is full). */
export function shoulder(widths: number): number {
  return widths > 0 ? (widths < 1 ? Math.sin((Math.PI / 2) * widths) : 1) : 0
}

/** The frame at a place on the ellipsoid: its origin in the Earth's axes and its east, north and up there. */
interface Frame {
  lat: number
  lon: number
  o: [number, number, number]
  e: [number, number, number]
  n: [number, number, number]
  u: [number, number, number]
}

function frameAt(lat: number, lon: number): Frame {
  const [sp, cp, sl, cl] = [Math.sin(lat * RAD), Math.cos(lat * RAD), Math.sin(lon * RAD), Math.cos(lon * RAD)]
  const N = A / Math.sqrt(1 - E2 * sp * sp)
  return { lat, lon, o: [N * cp * cl, N * cp * sl, N * (1 - E2) * sp], e: [-sl, cl, 0], n: [-sp * cl, -sp * sl, cp], u: [cp * cl, cp * sl, sp] }
}

/** A place of the field's map (km east and north of its middle) at hM over the ellipsoid, in the frame: written to out[0 … 2], metres. */
function place(fr: Frame, eastKm: number, northKm: number, hM: number, out: Float64Array): void {
  const lat = (fr.lat + northKm / KM_PER_DEG) * RAD
  const lon = (fr.lon + eastKm / (KM_PER_DEG * Math.max(0.01, Math.cos(fr.lat * RAD)))) * RAD
  const [sp, cp] = [Math.sin(lat), Math.cos(lat)]
  const N = A / Math.sqrt(1 - E2 * sp * sp)
  const x = (N + hM) * cp * Math.cos(lon) - fr.o[0]
  const y = (N + hM) * cp * Math.sin(lon) - fr.o[1]
  const z = (N * (1 - E2) + hM) * sp - fr.o[2]
  out[0] = fr.e[0] * x + fr.e[1] * y + fr.e[2] * z
  out[1] = fr.n[0] * x + fr.n[1] * y + fr.n[2] * z
  out[2] = fr.u[0] * x + fr.u[1] * y + fr.u[2] * z
}

/** A band's nodes at one level of cut, n a side: what each holds once it is read (seen), and the corners laid on it and on the grid's edges from it. The arrays are kept from band to band and field to field (30 MB at the finest level: the worker's). */
interface Grid {
  n: number
  box: [number, number, number, number] // the nodes that may hold cover: columns box[0] … box[2], rows box[1] … box[3] (none: box[0] > box[2])
  cov: Float32Array
  base: Float32Array
  top: Float32Array
  sev: Float32Array
  seen: Uint8Array // 1: read; 2: read, and it has heights
  far: Float32Array // an inside node's distance from the rim, in cells
  px: Float32Array // the rim's point nearest it, in nodes
  py: Float32Array
  ztop: Float32Array // an inside node's top, m above the sea
  node: Int32Array // a node's top corner (its underside's is the next); −1: none yet
  across: Int32Array // the rim's corner pair on the edge from a node to the next eastward
  up: Int32Array // and to the next northward
}

const grids = new Map<number, Grid>()

function gridOf(n: number): Grid {
  let g = grids.get(n)
  if (g === undefined) {
    const cells = n * n
    g = {
      n, box: [1, 1, 0, 0], cov: new Float32Array(cells), base: new Float32Array(cells), top: new Float32Array(cells), sev: new Float32Array(cells), seen: new Uint8Array(cells),
      far: new Float32Array(cells), px: new Float32Array(cells), py: new Float32Array(cells), ztop: new Float32Array(cells),
      node: new Int32Array(cells), across: new Int32Array(cells), up: new Int32Array(cells),
    }
    grids.set(n, g)
  }
  g.seen.fill(0)
  g.cov.fill(0) // (a node not read is outside every body)
  g.node.fill(-1)
  g.across.fill(-1)
  g.up.fill(-1)
  return g
}

const clampT = (t: number): number => (t < 0 ? 0 : t > FIELD_N - 1 ? FIELD_N - 1 : t)

/**
 * Node (i, j) of the grid read from band b of the field, at `step` texels a node: its cover, and its base, top and severity by the
 * cover of the texels it is read from. At half a texel the cover between texels follows Catmull-Rom's curve through them (kept
 * within 0 … 1); at one texel a node is a texel; at two it is the highest cover of the texels round it, so that a small cloud is not
 * lost. The grid's outer ring has no cover: a body ends inside the field.
 */
function read(g: Grid, f: WxField, b: number, step: number, i: number, j: number, nearby: Uint8Array): void {
  const k = j * g.n + i
  if (g.seen[k] !== 0) return
  if (nearby[clampT(Math.floor(j * step)) * FIELD_N + clampT(Math.floor(i * step))] === 0) {
    g.seen[k] = 1 // no cover within two texels: nothing to read
    return
  }
  const [C, B, T, S] = [f.cov[b], f.base[b], f.top[b], f.sev[b]]
  let cover = 0
  let [x0, x1, y0, y1] = [0, 0, 0, 0] // the texels its heights are read from
  if (step === 0.5) {
    const [tx, ty] = [i >> 1, j >> 1]
    const [wx, wy] = [(i & 1) === 1 ? HALF : WHOLE, (j & 1) === 1 ? HALF : WHOLE]
    for (let q = 0; q < 4; q++) {
      if (wy[q] === 0) continue
      const row = clampT(ty - 1 + q) * FIELD_N
      for (let p = 0; p < 4; p++) if (wx[p] !== 0) cover += wy[q] * wx[p] * C[row + clampT(tx - 1 + p)]
    }
    cover = cover < 0 ? 0 : cover > 1 ? 1 : cover
    ;[x0, x1, y0, y1] = [tx, tx + (i & 1), ty, ty + (j & 1)]
  } else {
    const reach = step === 1 ? 0 : 1
    ;[x0, x1, y0, y1] = [i * step - reach, i * step + reach, j * step - reach, j * step + reach]
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cover = Math.max(cover, C[clampT(y) * FIELD_N + clampT(x)])
  }
  let [w, bs, ts, ss] = [0, 0, 0, 0]
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const o = clampT(y) * FIELD_N + clampT(x)
      if (!(C[o] > 0 || T[o] > 0)) continue
      const wt = C[o] + EDGE_W
      w += wt
      bs += wt * B[o]
      ts += wt * T[o]
      ss += wt * S[o]
    }
  }
  g.cov[k] = i === 0 || j === 0 || i === g.n - 1 || j === g.n - 1 || w === 0 ? 0 : cover
  g.base[k] = w > 0 ? bs / w : 0
  g.top[k] = w > 0 ? ts / w : 0
  g.sev[k] = w > 0 ? ss / w : 0
  g.seen[k] = w > 0 ? 2 : 1
}

/** How far the point (x, y) is from the piece of line a → b, and the piece's point nearest it, written to `at`. */
function toPiece(x: number, y: number, ax: number, ay: number, bx: number, by: number, at: Float64Array): number {
  const [dx, dy] = [bx - ax, by - ay]
  const len = dx * dx + dy * dy
  const t = len > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len)) : 0
  at[0] = ax + t * dx
  at[1] = ay + t * dy
  return Math.hypot(x - at[0], y - at[1])
}

/**
 * The heights smoothed over the nodes that have them (seen 2), each among those of its row within r nodes of it, then of its column:
 * `passes` times (three passes of such a mean are near enough a bell curve, σ = √(r(r + 1)) nodes). Within the grid's box.
 */
function smoothHeights(a: Float32Array, g: Grid, r: number, passes: number): void {
  const { n, seen, box } = g
  const [i0, j0, i1, j1] = box
  const sum = new Float64Array(n + 1) // a row's or a column's running sums: the values, and how many
  const count = new Float64Array(n + 1)
  const line = (from: number, stride: number, len: number): void => {
    for (let t = 0, k = from; t < len; t++, k += stride) {
      const has = seen[k] === 2
      sum[t + 1] = sum[t] + (has ? a[k] : 0)
      count[t + 1] = count[t] + (has ? 1 : 0)
    }
    for (let t = 0, k = from; t < len; t++, k += stride) {
      if (seen[k] !== 2) continue
      const [lo, hi] = [Math.max(0, t - r), Math.min(len, t + r + 1)]
      a[k] = (sum[hi] - sum[lo]) / (count[hi] - count[lo])
    }
  }
  for (let pass = 0; pass < passes; pass++) {
    for (let j = j0; j <= j1; j++) line(j * n + i0, 1, i1 - i0 + 1)
    for (let i = i0; i <= i1; i++) line(j0 * n + i, n, j1 - j0 + 1)
  }
}

/**
 * Every inside node's top (g.ztop), from how far in from the rim it is (g.far, in cells of cellKm): see the header. The heights are
 * smoothed first (a step in them, as between a storm's tower and its anvil, is a ramp: a wall inside a body had ragged triangles).
 * Then the nodes of the cells the rim passes through are each measured to the rim's pieces in those cells; the rest, inward, each
 * take the nearest of their neighbours' rim points (twice each way over the grid: the points go round corners). A node's shoulder
 * is no wider than its own depth: the deepest place its way inward leads to (so each limb of a body is a dome of its own).
 */
function tops(g: Grid, cellKm: number): void {
  const { n, cov, base, top, far, px, py, ztop } = g
  const [i0, j0, i1, j1] = g.box
  const inside = (k: number): boolean => cov[k] > RIM_COVER
  const r = Math.max(1, Math.round(SMOOTH_KM / cellKm))
  smoothHeights(base, g, r, HEIGHT_PASSES)
  smoothHeights(top, g, r, HEIGHT_PASSES)
  for (let j = j0 - 1; j <= j1 + 1; j++) far.fill(Infinity, j * n + i0 - 1, j * n + i1 + 2)
  const cut = new Float64Array(8) // the rim's points on a cell's four edges, x and y
  const on = [false, false, false, false]
  const ins = [false, false, false, false]
  const corner = [0, 0, 0, 0]
  const cx = [0, 0, 0, 0]
  const cy = [0, 0, 0, 0]
  const at = new Float64Array(2)
  for (let j = j0 - 1; j <= j1; j++) {
    for (let i = i0 - 1, k = j * n + i; i <= i1; i++, k++) {
      const a = cov[k] > RIM_COVER
      if (a === cov[k + 1] > RIM_COVER && a === cov[k + n] > RIM_COVER && a === cov[k + n + 1] > RIM_COVER) continue
      corner[0] = k // counter-clockwise: east, then north
      corner[1] = k + 1
      corner[2] = k + n + 1
      corner[3] = k + n
      cx[0] = cx[3] = i
      cx[1] = cx[2] = i + 1
      cy[0] = cy[1] = j
      cy[2] = cy[3] = j + 1
      for (let c = 0; c < 4; c++) ins[c] = inside(corner[c])
      for (let e = 0; e < 4; e++) {
        const z = (e + 1) % 4
        on[e] = ins[e] !== ins[z]
        if (!on[e]) continue
        const t = (RIM_COVER - cov[corner[e]]) / (cov[corner[z]] - cov[corner[e]])
        cut[2 * e] = cx[e] + (cx[z] - cx[e]) * t
        cut[2 * e + 1] = cy[e] + (cy[z] - cy[e]) * t
      }
      // The rim's pieces in the cell: from the cut on an edge that leaves the body (going round) to the next cut, which enters it again.
      for (let e = 0; e < 4; e++) {
        if (!on[e] || !ins[e]) continue
        let z = (e + 1) % 4
        while (!on[z]) z = (z + 1) % 4
        for (let c = 0; c < 4; c++) {
          if (!ins[c]) continue
          const d = toPiece(cx[c], cy[c], cut[2 * e], cut[2 * e + 1], cut[2 * z], cut[2 * z + 1], at)
          if (d < far[corner[c]]) {
            far[corner[c]] = d
            px[corner[c]] = at[0]
            py[corner[c]] = at[1]
          }
        }
      }
    }
  }
  const take = (k: number, i: number, j: number, q: number): void => {
    if (far[q] === Infinity) return // (outside, or not reached yet)
    const d = Math.hypot(i - px[q], j - py[q])
    if (d < far[k]) {
      far[k] = d
      px[k] = px[q]
      py[k] = py[q]
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let j = j0; j <= j1; j++) {
      for (let i = i0, k = j * n + i0; i <= i1; i++, k++) {
        if (!inside(k)) continue
        take(k, i, j, k - 1)
        take(k, i, j, k - n)
        take(k, i, j, k - n - 1)
        take(k, i, j, k - n + 1)
      }
    }
    for (let j = j1; j >= j0; j--) {
      for (let i = i1, k = j * n + i1; i >= i0; i--, k--) {
        if (!inside(k)) continue
        take(k, i, j, k + 1)
        take(k, i, j, k + n)
        take(k, i, j, k + n + 1)
        take(k, i, j, k + n - 1)
      }
    }
  }
  // Each node's own depth: the distance from the rim of the deepest place its way inward leads to (from node to the neighbour furthest
  // in, until none is further), at most a shoulder's greatest width; smoothed, so that where two ways part the top has no step.
  const reach = SHOULDER_MAX_KM / cellKm // a shoulder's greatest width, in cells
  const deep = px // (the rim's points are done with)
  /** Each node of the box, a row at a time. */
  const each = (f: (k: number) => void): void => {
    for (let j = j0; j <= j1; j++) for (let i = i0, k = j * n + i0; i <= i1; i++, k++) f(k)
  }
  each((k) => void (deep[k] = !inside(k) ? 0 : far[k] >= reach ? reach : -1))
  const way: number[] = []
  each((k0) => {
    if (deep[k0] >= 0) return
    way.length = 0
    let k = k0
    while (deep[k] < 0) {
      way.push(k)
      let best = k
      for (let dj = -n; dj <= n; dj += n) for (let di = -1; di <= 1; di++) if (far[k + dj + di] > far[best] && inside(k + dj + di)) best = k + dj + di
      if (best === k) deep[k] = Math.min(far[k], reach)
      k = best
    }
    for (const q of way) deep[q] = deep[k]
  })
  for (let pass = 0; pass < DEPTH_PASSES; pass++) {
    for (const d of [1, n]) {
      each((k) => {
        if (!inside(k)) return
        const [w0, w1] = [inside(k - d) ? 0.25 : 0, inside(k + d) ? 0.25 : 0]
        py[k] = (w0 * deep[k - d] + 0.5 * deep[k] + w1 * deep[k + d]) / (w0 + 0.5 + w1)
      })
      each((k) => {
        if (inside(k)) deep[k] = py[k]
      })
    }
  }
  each((k) => {
    if (!inside(k)) return
    const h = Math.max(0, top[k] - base[k])
    const width = Math.min(h / 1000, SHOULDER_MAX_KM, Math.max(deep[k] * cellKm, h / 1000 / SLENDER))
    ztop[k] = base[k] + h * (width > 0 ? shoulder(((far[k] === Infinity ? reach : far[k]) * cellKm) / width) : 1)
  })
}

/** The bodies of band b of the field in the frame fr, cut at `level` (0 the finest) or, when that takes too many triangles, more coarsely; none when the band has no body. */
function sculptBand(f: WxField, b: number, fr: Frame, level: number): SculptBand | null {
  if (f.lo[b] > f.hi[b]) return null
  const step = NODE_TEXELS[level]
  const s = BLOCK_TEXELS / step // cells a block's side
  const nb = FIELD_N / BLOCK_TEXELS // blocks a side
  const n = nb * s + 1
  const g = gridOf(n)
  const { cov, base, top, sev, seen, node, across, up, ztop, far } = g
  const C = f.cov[b]
  const zTop = (k: number): number => ztop[k]

  // The blocks: which have cover in or next to them (only their nodes are read), and of those which are cut finely (1) and which are level (2).
  const near = new Uint8Array(nb * nb)
  for (let bj = 0; bj < nb; bj++) {
    for (let bi = 0; bi < nb; bi++) {
      let any = false
      for (let y = bj * BLOCK_TEXELS; y < (bj + 1) * BLOCK_TEXELS && !any; y++) for (let x = bi * BLOCK_TEXELS; x < (bi + 1) * BLOCK_TEXELS; x++) if (C[y * FIELD_N + x] > 0) { any = true; break }
      if (!any) continue
      for (let y = Math.max(0, bj - 1); y <= Math.min(nb - 1, bj + 1); y++) for (let x = Math.max(0, bi - 1); x <= Math.min(nb - 1, bi + 1); x++) near[y * nb + x] = 1
    }
  }
  // The texels with cover within two texels of them (a node elsewhere has none: it is not read), and the box of nodes they span.
  const nearby = new Uint8Array(FIELD_N * FIELD_N)
  let [x0, y0, x1, y1] = [FIELD_N, FIELD_N, -1, -1]
  for (let y = 0; y < FIELD_N; y++) {
    for (let x = 0, o = y * FIELD_N; x < FIELD_N; x++, o++) {
      if (!(C[o] > 0)) continue
      for (let v = Math.max(0, y - 2); v <= Math.min(FIELD_N - 1, y + 2); v++) nearby.fill(1, v * FIELD_N + Math.max(0, x - 2), v * FIELD_N + Math.min(FIELD_N - 1, x + 2) + 1)
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return null
  const edge = (t: number): number => Math.min(n - 2, Math.max(1, t))
  g.box = [edge(Math.floor((x0 - 2) / step)), edge(Math.floor((y0 - 2) / step)), edge(Math.ceil((x1 + 2) / step)), edge(Math.ceil((y1 + 2) / step))]
  let any = false
  for (let bj = 0; bj < nb; bj++) {
    for (let bi = 0; bi < nb; bi++) {
      if (near[bj * nb + bi] === 0) continue
      for (let j = bj * s; j <= bj * s + s; j++) {
        for (let i = bi * s; i <= bi * s + s; i++) {
          read(g, f, b, step, i, j, nearby)
          if (cov[j * n + i] > RIM_COVER) any = true
        }
      }
    }
  }
  if (!any) return null
  tops(g, step * TEXEL_KM)
  const kind = new Uint8Array(nb * nb)
  let estimate = 0
  for (let bj = 0; bj < nb; bj++) {
    for (let bi = 0; bi < nb; bi++) {
      if (near[bj * nb + bi] === 0) continue
      const [i0, j0] = [bi * s, bj * s]
      let inside = 0
      for (let j = j0; j <= j0 + s; j++) for (let i = i0; i <= i0 + s; i++) if (cov[j * n + i] > RIM_COVER) inside++
      if (inside === 0) continue
      let flat = inside === (s + 1) * (s + 1)
      if (flat) {
        const [k00, k10, k01, k11] = [j0 * n + i0, j0 * n + i0 + s, (j0 + s) * n + i0, (j0 + s) * n + i0 + s]
        const [t00, t10, t01, t11] = [zTop(k00), zTop(k10), zTop(k01), zTop(k11)]
        for (let j = 0; j <= s && flat; j++) {
          for (let i = 0; i <= s; i++) {
            const k = (j0 + j) * n + i0 + i
            const [u, v] = [i / s, j / s]
            const flatTop = (t00 * (1 - u) + t10 * u) * (1 - v) + (t01 * (1 - u) + t11 * u) * v
            const flatBase = (base[k00] * (1 - u) + base[k10] * u) * (1 - v) + (base[k01] * (1 - u) + base[k11] * u) * v
            if (Math.abs(zTop(k) - flatTop) > FLAT_M || Math.abs(base[k] - flatBase) > FLAT_M) { flat = false; break }
          }
        }
      }
      kind[bj * nb + bi] = flat ? 2 : 1
      estimate += flat ? 8 : 4 * inside
    }
  }
  if (estimate === 0) return null
  if (estimate > BAND_TRIANGLES && level + 1 < NODE_TEXELS.length) return sculptBand(f, b, fr, level + 1)

  // The corners, laid as they are first named: a pair (top sheet, underside) for a node inside a body and for an edge of the grid the rim crosses.
  let vertices = new Float32Array(F * 4096)
  let pairs = 0
  let indices = new Uint32Array(3 * 8192)
  let at = 0
  const p = new Float64Array(3)
  const km = (i: number): number => (i * step + 0.5) * TEXEL_KM - FIELD_KM / 2 // a node's place on the map
  /** A pair of corners at a place of the map: the top sheet's at topM, the underside's at baseM. Its top corner's number. */
  const lay = (eastKm: number, northKm: number, baseM: number, topM: number, sv: number, inM: number): number => {
    if ((2 * pairs + 2) * F > vertices.length) {
      const more = new Float32Array(vertices.length * 2)
      more.set(vertices)
      vertices = more
    }
    for (let under = 0; under < 2; under++) {
      const h = under === 1 ? baseM : topM
      place(fr, eastKm, northKm, h, p)
      const o = (2 * pairs + under) * F
      vertices[o] = p[0]
      vertices[o + 1] = p[1]
      vertices[o + 2] = p[2]
      vertices[o + 6] = sv
      vertices[o + 7] = h
      vertices[o + 8] = under
      vertices[o + 9] = inM
    }
    return 2 * pairs++
  }
  const corner = (i: number, j: number): number => {
    const k = j * n + i
    if (node[k] < 0) node[k] = lay(km(i), km(j), base[k], zTop(k), sev[k], Math.min(far[k], n) * step * TEXEL_KM * 1000)
    return node[k]
  }
  /** The rim's pair on the edge from node (i, j) to the next east (di) or north (dj): where the cover crosses RIM_COVER, at the base (the inside node's, or between the two where both have heights). */
  const rim = (i: number, j: number, di: number, dj: number): number => {
    const k = j * n + i
    const held = di === 1 ? across : up
    if (held[k] >= 0) return held[k]
    const q = k + di + dj * n
    const t = (RIM_COVER - cov[k]) / (cov[q] - cov[k]) // from k toward q
    const [a, z] = cov[k] > RIM_COVER ? [k, q] : [q, k] // the inside node, the outside one
    const part = cov[k] > RIM_COVER ? t : 1 - t // from the inside node
    const both = seen[z] === 2
    const h = both ? base[a] + (base[z] - base[a]) * part : base[a]
    return (held[k] = lay(km(i) + di * t * step * TEXEL_KM, km(j) + dj * t * step * TEXEL_KM, h, h, both ? sev[a] + (sev[z] - sev[a]) * part : sev[a], 0))
  }
  /** A triangle of the top sheet (counter-clockwise from above), and the same of the underside, turned over. */
  const face = (a: number, bb: number, c: number): void => {
    if (at + 6 > indices.length) {
      const more = new Uint32Array(indices.length * 2)
      more.set(indices)
      indices = more
    }
    indices[at++] = a
    indices[at++] = bb
    indices[at++] = c
    indices[at++] = a + 1
    indices[at++] = c + 1
    indices[at++] = bb + 1
  }
  const poly: number[] = []
  const inBody = (i: number, j: number): boolean => cov[j * n + i] > RIM_COVER
  for (let bj = 0; bj < nb; bj++) {
    for (let bi = 0; bi < nb; bi++) {
      const what = kind[bj * nb + bi]
      if (what === 0) continue
      const [i0, j0] = [bi * s, bj * s]
      if (what === 2) {
        // A level block: a fan round its middle. An edge toward a finely cut block has that block's corners along it.
        const fine = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < nb && y < nb && kind[y * nb + x] === 1
        poly.length = 0
        const [south, east, north, west] = [fine(bi, bj - 1) ? 1 : s, fine(bi + 1, bj) ? 1 : s, fine(bi, bj + 1) ? 1 : s, fine(bi - 1, bj) ? 1 : s]
        for (let i = 0; i < s; i += south) poly.push(corner(i0 + i, j0))
        for (let j = 0; j < s; j += east) poly.push(corner(i0 + s, j0 + j))
        for (let i = s; i > 0; i -= north) poly.push(corner(i0 + i, j0 + s))
        for (let j = s; j > 0; j -= west) poly.push(corner(i0, j0 + j))
        const mid = corner(i0 + s / 2, j0 + s / 2)
        for (let c = 0; c < poly.length; c++) face(mid, poly[c], poly[(c + 1) % poly.length])
        continue
      }
      // A finely cut block: in each of its cells the part inside a body is a polygon (its inside nodes and the rim's corners on its
      // edges, counter-clockwise from above), cut into a fan.
      for (let j = j0; j < j0 + s; j++) {
        for (let i = i0; i < i0 + s; i++) {
          const [a, bb, c, d] = [inBody(i, j), inBody(i + 1, j), inBody(i + 1, j + 1), inBody(i, j + 1)]
          if (!(a || bb || c || d)) continue
          poly.length = 0
          if (a) poly.push(corner(i, j))
          if (a !== bb) poly.push(rim(i, j, 1, 0))
          if (bb) poly.push(corner(i + 1, j))
          if (bb !== c) poly.push(rim(i + 1, j, 0, 1))
          if (c) poly.push(corner(i + 1, j + 1))
          if (c !== d) poly.push(rim(i, j + 1, 1, 0))
          if (d) poly.push(corner(i, j + 1))
          if (d !== a) poly.push(rim(i, j, 0, 1))
          for (let m = 1; m + 1 < poly.length; m++) face(poly[0], poly[m], poly[m + 1])
        }
      }
    }
  }
  if (at === 0) return null
  if (at / 3 > BAND_TRIANGLES && level + 1 < NODE_TEXELS.length) return sculptBand(f, b, fr, level + 1)
  const band: SculptBand = { band: b, vertices: vertices.slice(0, 2 * pairs * F), indices: indices.slice(0, at), roof: new Float32Array(FIELD_N * FIELD_N), floor: new Float32Array(FIELD_N * FIELD_N) }
  normals(band.vertices, band.indices)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const k = Math.min(n - 1, Math.round(y / step)) * n + Math.min(n - 1, Math.round(x / step)) // the node on the texel, or the nearest to it
      if (!(cov[k] > RIM_COVER)) continue
      band.roof[y * FIELD_N + x] = ztop[k]
      band.floor[y * FIELD_N + x] = base[k]
    }
  }
  return band
}

/** Each corner's normal: the mean of the faces round it, by their size (a corner with no face of any size: straight up, or down on the underside). */
function normals(v: Float32Array, indices: Uint32Array): void {
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t] * F, indices[t + 1] * F, indices[t + 2] * F]
    const [ux, uy, uz] = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]]
    const [wx, wy, wz] = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]]
    const [nx, ny, nz] = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx]
    for (const o of [a, b, c]) {
      v[o + 3] += nx
      v[o + 4] += ny
      v[o + 5] += nz
    }
  }
  for (let o = 0; o < v.length; o += F) {
    const len = Math.hypot(v[o + 3], v[o + 4], v[o + 5])
    if (len > 0) {
      v[o + 3] /= len
      v[o + 4] /= len
      v[o + 5] /= len
    } else {
      v[o + 3] = v[o + 4] = 0
      v[o + 5] = v[o + 8] > 0 ? -1 : 1
    }
  }
}

export const SHADOW_N = 256 // the shadow image's side: 1.25 km a pixel
export const SHADOW_ALPHA = 0.2 // under the middle of a body the ground is tinted by this: faint, the map stays readable
export const SHADOW_RGB: readonly [number, number, number] = [10, 16, 28]
export const SHADOW_SHIFT_KM = 2 // a shadow is moved away from the light by its body's height over the light's slope, at most this far: it stays by its body
const SHADOW_SOFT = 1 // its edge is softened over this many pixels each way, twice

/**
 * The bodies' shadow on the ground as an image over the field's square (SHADOW_N a side, the first row the north, as a canvas has
 * it): SHADOW_RGB, its alpha SHADOW_ALPHA under a body and falling softly to nothing past its rim. Each band's shadow is moved away
 * from the light (the unit vector toward it: east, north, up at the field's middle; null: straight overhead) by the band's lowest
 * base over the light's slope, at most SHADOW_SHIFT_KM. None with no body.
 */
export function shadowImage(bands: readonly SculptBand[], light: readonly [number, number, number] | null): Bitmap | null {
  if (bands.length === 0) return null
  const n = SHADOW_N
  const per = FIELD_N / n
  let cover = new Float32Array(n * n)
  for (const band of bands) {
    let lowest = Infinity
    for (let o = 0; o < band.floor.length; o++) if (band.roof[o] > band.floor[o] && band.floor[o] < lowest) lowest = band.floor[o]
    if (lowest === Infinity) continue
    const up = light === null ? 1 : Math.max(0.05, light[2])
    const reach = light === null ? 0 : Math.min(SHADOW_SHIFT_KM, (lowest / 1000) * (Math.hypot(light[0], light[1]) / up))
    const flat = light === null ? 0 : Math.hypot(light[0], light[1])
    const [dx, dy] = flat > 0 ? [(-light![0] / flat) * reach / TEXEL_KM, (-light![1] / flat) * reach / TEXEL_KM] : [0, 0] // texels
    for (let y = 0; y < FIELD_N; y++) {
      for (let x = 0, o = y * FIELD_N; x < FIELD_N; x++, o++) {
        if (!(band.roof[o] > band.floor[o])) continue
        const [i, j] = [Math.floor((x + dx) / per), Math.floor((y + dy) / per)]
        if (i >= 0 && i < n && j >= 0 && j < n) cover[j * n + i] = 1
      }
    }
  }
  let tmp = new Float32Array(n * n)
  for (let pass = 0; pass < 2; pass++) {
    for (const d of [1, n]) { // east–west, then north–south
      for (let k = 0; k < n * n; k++) {
        let [sum, count] = [0, 0]
        for (let t = -SHADOW_SOFT; t <= SHADOW_SOFT; t++) {
          const q = k + t * d
          if (q < 0 || q >= n * n || (d === 1 && Math.floor(q / n) !== Math.floor(k / n))) continue
          sum += cover[q]
          count++
        }
        tmp[k] = sum / count
      }
      ;[cover, tmp] = [tmp, cover]
    }
  }
  const data = new Uint8ClampedArray(n * n * 4)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = ((n - 1 - j) * n + i) * 4 // the image's first row is the north
      data[o] = SHADOW_RGB[0]
      data[o + 1] = SHADOW_RGB[1]
      data[o + 2] = SHADOW_RGB[2]
      data[o + 3] = cover[j * n + i] * SHADOW_ALPHA * 255
    }
  }
  return { data, width: n, height: n }
}

/**
 * The field's bodies (see the header). light: the unit vector toward the scene's light at the field's middle (east, north, up), for
 * the shadow; none: overhead. level: the cut to start from (0, the finest, unless a test asks for a coarser one). An empty field has none.
 */
export function sculptMesh(f: WxField, light: readonly [number, number, number] | null = null, level = 0): SculptMesh {
  const t0 = performance.now()
  const mesh: SculptMesh = { lat: f.lat, lon: f.lon, bands: [], radiusM: 0, triangles: 0, shadow: null, ms: 0 }
  if (!f.empty) {
    const fr = frameAt(f.lat, f.lon)
    for (let b = 0; b < BANDS; b++) {
      const band = sculptBand(f, b, fr, level)
      if (band === null) continue
      mesh.bands.push(band)
      mesh.triangles += band.indices.length / 3
      const v = band.vertices
      for (let o = 0; o < v.length; o += F) mesh.radiusM = Math.max(mesh.radiusM, Math.hypot(v[o], v[o + 1], v[o + 2]))
    }
    mesh.shadow = shadowImage(mesh.bands, light)
  }
  mesh.ms = performance.now() - t0
  return mesh
}
