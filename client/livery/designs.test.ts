// client/livery/designs.test.ts
// Every airline design drawn on every painted model: finite numbers, valid colours, logo files that exist and have a
// recorded source and licence.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { DESIGNS } from './designs/index.ts'
import { drawDesign, profileOf } from './kit.ts'
import type { Op } from './kit.ts'
import type { ModelManifest } from '../types.ts'

const root = new URL('../../', import.meta.url)
const manifest: ModelManifest = JSON.parse(readFileSync(new URL('public/models/manifest.json', root), 'utf8'))
const COLOUR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([\d.,\s%]+\))$/i

const packages = new URL('liveries/', root)
const folders = readdirSync(packages).filter((f) => existsSync(new URL(`${f}/design.ts`, packages))) // a folder without a design is one being researched

test('every folder in liveries/ is a design whose code is the folder\'s name, and it names its sources', () => {
  assert.deepEqual(Object.keys(DESIGNS).sort(), folders.sort())
  for (const [code, d] of Object.entries(DESIGNS)) {
    assert.match(code, /^[A-Z0-9]{3}$/)
    for (const a of d.aliases ?? []) assert.ok(!(a in DESIGNS), `${code}: alias ${a} is a design of its own`)
    assert.ok(d.sources && d.sources.length > 0, `${code}: sources`)
    for (const c of [d.base, d.wing, d.stab, d.engineColor, d.wingletColor]) if (c !== undefined) assert.match(c, COLOUR, code)
  }
})

test('every design draws on every painted model with finite coordinates, valid colours and existing images', () => {
  const nums = (op: Op): number[] =>
    op.k === 'path' || op.k === 'stroke' || op.k === 'clip' ? op.d.flatMap((s) => s.slice(1) as number[]) : op.k === 'text' ? [op.z, op.y, op.capM, op.tracking] : op.k === 'image' ? [op.z, op.y, op.w ?? 1, op.h ?? 1] : op.k === 'wrap' ? op.box : []
  for (const [code, d] of Object.entries(DESIGNS)) {
    for (const m of manifest.models.filter((e) => e.paint)) {
      const ops = drawDesign(d, { id: m.id, profile: profileOf(m)!, paint: m.paint })
      for (const r of [ops.skin, ops.nacelle, ops.tip, ops.belly]) {
        for (const op of r ? [...r.left, ...r.right] : []) {
          for (const n of nums(op)) assert.ok(Number.isFinite(n), `${code} on ${m.id}: ${JSON.stringify(op).slice(0, 120)}`)
          if ('color' in op) for (const c of typeof op.color === 'string' ? [op.color] : op.color.stops.map((st) => st[1])) assert.match(c, COLOUR, `${code} on ${m.id}`)
          if (op.k === 'image' || op.k === 'wrap') {
            assert.ok(op.src.startsWith(`/liveries/${code}/`), `${code}: ${op.src} is a file in its own folder`)
            assert.ok(existsSync(new URL(op.src.slice(1), root)), `${code}: ${op.src} exists`)
          }
        }
      }
    }
  }
})

test('every file in a design folder has its source and licence in the folder\'s sources.json', () => {
  for (const code of folders) {
    const own = new Set(['design.ts', 'README.md', 'sources.json']) // the package's own text: all else came from somewhere
    const files = readdirSync(new URL(`${code}/`, packages)).filter((n) => !own.has(n))
    if (files.length === 0) continue
    const src: Record<string, { source: string; licence: string }> = JSON.parse(readFileSync(new URL(`${code}/sources.json`, packages), 'utf8'))
    for (const f of files) assert.ok(src[f]?.source && src[f]?.licence, `liveries/${code}/sources.json: "${f}" needs source and licence`)
    for (const font of DESIGNS[code].fonts ?? []) assert.ok(font.src.startsWith(`/liveries/${code}/`) && existsSync(new URL(font.src.slice(1), root)), `${code}: font ${font.src}`)
  }
})
