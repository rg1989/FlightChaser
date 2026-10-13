// tools/models/packages.ts
// The aircraft model packages: every folder under public/models that holds a model.json. A package is the folder and
// nothing else: model.json (what the app reads), model.glb, gear.glb where the model has gear, and recipe.json (what the
// tools here build it from). Nobody keeps a list: Vite answers models/manifest.json with readManifest (vite.config.ts),
// and the tools and the tests read it here, so a folder dropped into public/models is found and checked.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModelManifest, ModelManifestEntry } from '../../client/types.ts'
import type { GearSpec } from './gear-glb.ts'
import type { NacelleOp, Wingtip } from './variants.ts'

export const MODELS = fileURLToPath(new URL('../../public/models/', import.meta.url))

/** Published door and cockpit stations: metres aft of the nose tip on the document's overall length (null: read off the mesh). */
export interface Stations {
  lengthM: number | null
  doors: number[] // the left passenger (and service) doors' centre lines, nose → tail; overwing exits are not doors
  cockpit: number // the aft edge of the cockpit side windows
  source: string
}

/** recipe.json: what the tools build a package from. With `base`, the model is derived from that package (variants.ts). */
export interface Recipe {
  base?: string
  name?: string // a derived model's name and types (a source model's are in its model.json)
  types?: string[]
  date?: string // when the derived model was last changed (it goes into the GLB's copyright line)
  wingtip?: Wingtip
  nacelle?: NacelleOp
  fuselage?: { foreM?: number; aftM?: number; fore?: [number, number]; aft?: [number, number] } // fuselage.ts
  stations?: Stations // profile.ts: the doors and the cockpit windows
  gear?: GearSpec // gear-glb.ts: the landing gear's layout
  /** rotor: a helicopter (profile.ts, light-anchors.ts); finBeacon: the upper beacon on the fin tip; noBellyBeacon; noWindows: no cabin window row to find. */
  flags?: Array<'rotor' | 'finBeacon' | 'noBellyBeacon' | 'noWindows'>
  windowPitchM?: number // the cabin windows' pitch (light-anchors.ts; an airliner's 0.51 m without it)
  wingRootOffsetM?: number // the wing-root lights this far outboard of the fuselage side (0.8 m without it)
  sources?: string[] // where the numbers come from
}

/** A package's files, by name. */
export const fileOf = (id: string, name: string, dir = MODELS): string => path.join(dir, id, name)

/** The package folders, by id. */
export function packageIds(dir = MODELS): string[] {
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, 'model.json'))).map((d) => d.name).sort()
}

/** The manifest the app loads: defaults.json (the default model, the category fallbacks) and every package's model.json. */
export function readManifest(dir = MODELS): ModelManifest {
  const models: ModelManifestEntry[] = []
  for (const id of packageIds(dir)) {
    try {
      models.push(JSON.parse(readFileSync(fileOf(id, 'model.json', dir), 'utf8')) as ModelManifestEntry)
    } catch (err) { // one broken package must not take the others with it
      console.warn(`public/models/${id}/model.json: ${(err as Error).message}`)
    }
  }
  return { ...(JSON.parse(readFileSync(path.join(dir, 'defaults.json'), 'utf8')) as Omit<ModelManifest, 'models'>), models }
}

/** A package's recipe.json, or an empty recipe. */
export function recipeOf(id: string, dir = MODELS): Recipe {
  const f = fileOf(id, 'recipe.json', dir)
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as Recipe) : {}
}

/** A recipe's setting, or its base's: a derived model is its base in all it does not say. */
export function setting<K extends 'flags' | 'windowPitchM' | 'wingRootOffsetM'>(id: string, key: K, dir = MODELS): Recipe[K] {
  const r = recipeOf(id, dir)
  return r[key] ?? (r.base === undefined ? undefined : setting(r.base, key, dir))
}

export const flagged = (id: string, flag: NonNullable<Recipe['flags']>[number]): boolean => setting(id, 'flags')?.includes(flag) === true

/** A value on one line: `{ "a": [1, 2], "b": 3 }`. */
export function inline(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`
  if (v !== null && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
  return JSON.stringify(v)
}

/** JSON with one field per line, a field that is itself a record of several fields opened one level more: lines a diff can show. */
export function fieldLines(o: object): string {
  const open = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 3
  const rows = Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => (open(v)
    ? `  ${JSON.stringify(k)}: {\n${Object.entries(v).filter(([, x]) => x !== undefined).map(([j, x]) => `    ${JSON.stringify(j)}: ${inline(x)}`).join(',\n')}\n  }`
    : `  ${JSON.stringify(k)}: ${inline(v)}`))
  return `{\n${rows.join(',\n')}\n}\n`
}

/** Writes a package's model.json. */
export function writeModel(e: ModelManifestEntry, dir = MODELS): void {
  writeFileSync(fileOf(e.id, 'model.json', dir), fieldLines(e))
}

/** The models a tool was asked for: the ids on its command line, else all. */
export function asked(manifest: ModelManifest, argv = process.argv.slice(2)): ModelManifestEntry[] {
  const ids = argv.filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--png'))
  for (const id of ids) if (!manifest.models.some((m) => m.id === id)) throw new Error(`no model package "${id}" in public/models`)
  return ids.length === 0 ? manifest.models : manifest.models.filter((m) => ids.includes(m.id))
}
