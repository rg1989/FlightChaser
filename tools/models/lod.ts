// tools/models/lod.ts
// The light copy of a model that the chase's traffic draws: lod.glb, the full mesh (model.glb) simplified to at most
// LOD_TRIANGLES (detail.ts simplified: meshoptimizer's edge collapse) and shaded again as one smooth skin. Up to 30
// traffic aircraft are drawn at once, most of them far and small: each costs about what a model cost before the meshes
// were rebuilt in full (3,000 to 11,000 triangles). The chased aircraft, and a traffic aircraft near enough to be large
// in the view, are drawn on model.glb (client/scene/traffic.ts FULL_PX).
//
//   node tools/models/lod.ts [id…]      lod.glb and model.json's `lod` for each package (every one without ids)
//
// detail.ts runs it on each model it writes, and variants.ts makes a derived model's the same way; lod.test.ts checks that every lod.glb is up to date.
// A model of LOD_TRIANGLES or fewer has no light copy: the traffic draws model.glb.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { bounds, GLASS, shaded, simplified, SMOOTH_DEG, weld, type Tris } from './detail.ts'
import { readGlb, writeGlb, type Glb } from './glb.ts'
import { asked, fileOf, readManifest, recipeOf, writeModel } from './packages.ts'

/** The most triangles a light copy has. */
export const LOD_TRIANGLES = 6000
/** The most the simplifier moves the surface, a share of the model's size (5 cm on a 50 m airliner), raised up to 8 times when the target needs it. */
export const LOD_ERROR = 0.001

/** The light copy of a full mesh: welded where its shading or its glass split it, simplified, shaded as a smooth skin (glass stays dark). */
export function lodOf(g: Glb, smoothDeg = SMOOTH_DEG): Glb {
  // owner 1: a triangle of glass (all three corners dark), 0: the skin
  const dark = (v: number): boolean => g.col[4 * v] <= GLASS
  const owner = Uint16Array.from({ length: g.idx.length / 3 }, (_, f) => (dark(g.idx[3 * f]) && dark(g.idx[3 * f + 1]) && dark(g.idx[3 * f + 2]) ? 1 : 0))
  const t: Tris = { p: Float64Array.from(g.pos), tri: g.idx, owner }
  const w = weld(t, 1e-6 * bounds(t.p).diag)
  const s = simplified(w, LOD_TRIANGLES, LOD_ERROR, 8 * LOD_ERROR)
  return { json: structuredClone(g.json), ...shaded(s, smoothDeg, (f) => s.owner?.[f] === 1) }
}

/** The smoothDeg a package was shaded with (recipe.json mesh, or its base's). */
export function smoothDegOf(id: string): number {
  const r = recipeOf(id)
  return r.mesh?.smoothDeg ?? (r.base === undefined ? SMOOTH_DEG : smoothDegOf(r.base))
}

if (import.meta.main) {
  for (const e of asked(readManifest())) {
    const file = fileOf(e.id, 'lod.glb')
    let g: Glb
    try {
      g = readGlb(new Uint8Array(readFileSync(fileOf(e.id, 'model.glb'))))
    } catch (err) { // not the one-primitive layout (the default model, Cesium's): drawn as it is
      console.log(`${e.id}: no light copy: ${(err as Error).message}`)
      continue
    }
    const full = g.idx.length / 3
    if (full <= LOD_TRIANGLES) {
      if (existsSync(file)) rmSync(file)
      if (e.lod !== undefined) { delete e.lod; writeModel(e) }
      console.log(`${e.id}: ${full} triangles: light enough, no light copy`)
      continue
    }
    const lod = lodOf(g, smoothDegOf(e.id))
    writeFileSync(file, writeGlb(lod))
    e.lod = { uri: `models/${e.id}/lod.glb`, triangles: lod.idx.length / 3 }
    writeModel(e)
    console.log(`${e.id}: ${full} → ${e.lod.triangles} triangles (lod.glb)`)
  }
}
