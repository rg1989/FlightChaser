// client/scene/modelFor.ts
// Which 3-D model draws an aircraft, and whether it is the aircraft's own: the one listing its ICAO type designator as
// its own (types) or as one it stands in for (standIns), else its family's generic one (manifest fallback).
import type { ModelManifest, ModelManifestEntry } from '../types.ts'
import { iconFor } from './icons.ts'

/**
 * How a model fits the aircraft drawn on it: 'own', the model is of its type or its type's family; 'standIn', a model of
 * another aircraft, the nearest shape there is; 'generic', no model lists its type (or the type is unknown) and it flies
 * its category's. Anything but 'own' is drawn as a placeholder, without a livery (placeholder.ts).
 */
export type ModelFit = 'own' | 'standIn' | 'generic'

export interface Picked { entry: ModelManifestEntry; fit: ModelFit }

/**
 * Picks a manifest model per aircraft. Order: an entry listing the designator exactly (in types: its own; in standIns: a
 * stand-in); the longest "PREFIX*" listed in either; then the generic ones: a helicopter designator → fallback.heli; the
 * ADS-B category's fallback (A2 small jets → the bizjet); the type family's (iconFor: light / jet / heavy); the default.
 * Throws on a fallback that names no model.
 */
export class ModelPicker {
  readonly #byId = new Map<string, ModelManifestEntry>()
  readonly #exact = new Map<string, Picked>()
  readonly #prefixes: [string, Picked][] = []
  readonly #generic = new Map<ModelManifestEntry, Picked>()
  readonly #fallback: Record<string, string>
  readonly #default: ModelManifestEntry

  constructor(man: ModelManifest) {
    for (const m of man.models) {
      this.#byId.set(m.id, m)
      this.#generic.set(m, { entry: m, fit: 'generic' })
      // One answer per entry and fit, made here: pick() hands the same object out every time.
      for (const [list, fit] of [[m.types, 'own'], [m.standIns, 'standIn']] as const) {
        const p: Picked = { entry: m, fit }
        for (const t of list ?? []) {
          if (t.endsWith('*')) this.#prefixes.push([t.slice(0, -1), p])
          else this.#exact.set(t, p)
        }
      }
    }
    this.#prefixes.sort((a, b) => b[0].length - a[0].length)
    this.#fallback = man.fallback ?? {}
    for (const id of [man.default, ...Object.values(this.#fallback)]) if (!this.#byId.has(id)) throw new Error(`manifest names no model "${id}"`)
    this.#default = this.#byId.get(man.default)!
  }

  get models(): readonly ModelManifestEntry[] {
    return [...this.#byId.values()]
  }

  /** The model that draws this aircraft and how it fits. The answers are shared objects: compare them, do not change them. */
  pick(typeCode: string | null, category: string | null): Picked {
    const t = typeCode ? typeCode.toUpperCase() : null
    if (t !== null) {
      const hit = this.#exact.get(t) ?? this.#prefixes.find(([p]) => t.startsWith(p))?.[1]
      if (hit) return hit
    }
    const kind = iconFor(category, t)
    const id = kind === 'heli' ? this.#fallback.heli : ((category ? this.#fallback[category] : undefined) ?? this.#fallback[kind])
    return this.#generic.get((id === undefined ? undefined : this.#byId.get(id)) ?? this.#default)!
  }

  /** The model alone (pick's entry). */
  for(typeCode: string | null, category: string | null): ModelManifestEntry {
    return this.pick(typeCode, category).entry
  }
}

/** "an Airbus A321", "a Boeing 787-9": "an" before a vowel sound ("a Eurocopter"). */
const withArticle = (name: string): string => `${/^(?:[AIO]|E(?!u))/i.test(name) ? 'an' : 'a'} ${name}`

/**
 * The flight card's words for an aircraft that is not drawn on its own model: a stand-in names the model drawn (its
 * `name`, else its id) and the type there is no model of; the generic one says it is a placeholder. null on its own model.
 */
export function placeholderWords(p: Picked, typeCode: string | null): string | null {
  if (p.fit === 'own') return null
  const type = typeCode?.trim().toUpperCase() || null
  if (type === null) return 'Placeholder model: type unknown'
  if (p.fit === 'generic') return `Placeholder model: no ${type} model yet`
  return `Shown as ${withArticle(p.entry.name ?? p.entry.id.toUpperCase())}: no ${type} model yet`
}
