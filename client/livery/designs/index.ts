// client/livery/designs/index.ts
// The airline designs drawn with the kit, by livery code. Each one is a folder: liveries/<CODE>/design.ts (its default
// export) with its logos, fonts and sources.json beside it. Nobody keeps a list: a folder dropped into liveries/ is
// found here. A design wins over the colours-only table entry of the same code, and names the other callsign codes
// that wear it (Design.aliases).
import type { Design } from '../kit.ts'

// Vite fills the list in when it bundles; under Node (the tests, the tools) the folders are read.
const found: Design[] = import.meta.env
  ? Object.values(import.meta.glob<Design>('/liveries/*/design.ts', { eager: true, import: 'default' }))
  : fromDisk()

function fromDisk(): Design[] {
  const fs = process.getBuiltinModule('node:fs')
  const require = process.getBuiltinModule('node:module').createRequire(import.meta.url)
  const dir = new URL('../../../liveries/', import.meta.url)
  return fs.readdirSync(dir).filter((c) => fs.existsSync(new URL(`${c}/design.ts`, dir))).sort()
    .map((c) => (require(new URL(`${c}/design.ts`, dir).pathname) as { default: Design }).default)
}

export const DESIGNS: Record<string, Design> = Object.fromEntries(found.map((d) => [d.code, d]))

/** Callsign code → the design code it flies in (Wizz Air Malta WMT → WZZ), from each design's aliases. */
export const DESIGN_ALIASES: Record<string, string> = Object.fromEntries(found.flatMap((d) => (d.aliases ?? []).map((a) => [a, d.code])))
