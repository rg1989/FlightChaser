// tools/scenarios/packages.ts
// The scenario packages in a folder: every sub-folder that holds a scenario.json, the oldest flight first (its
// manifest's date, then its id). Nobody keeps a list: Vite answers scenarios/index.json with this (vite.config.ts), and
// the tests that check every package read it, so a package dropped into public/scenarios is found and checked.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/** A package's folder name: 1 to 64 letters, digits, _ or -, starting with a letter or a digit (docs/scenarios.md 1.1). */
export const PACKAGE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

export function packageIds(root: string): string[] {
  const dated = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(root, d.name, 'scenario.json')))
    .map((d) => {
      let date = '' // a manifest that cannot be read still counts: the loader then says what is wrong with it
      try {
        const m = JSON.parse(readFileSync(path.join(root, d.name, 'scenario.json'), 'utf8')) as { date?: unknown }
        if (typeof m.date === 'string') date = m.date
      } catch {}
      return { id: d.name, date }
    })
  return dated.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map((p) => p.id)
}
