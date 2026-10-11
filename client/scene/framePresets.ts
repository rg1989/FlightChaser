// client/scene/framePresets.ts
// The flight-data frame's ready-made layouts (scene/flightFrame.ts, its edit mode's Preset menu): three, each with three
// options. An option says which variant every card takes (the full instrument, a smaller one, the figures alone), where
// the cards go (round the aircraft as the frame lays them out, or docked: dockAt), and their colours. The viewer's own
// layout ("Custom", ui/framePrefs.ts) is made of the same variants and looks, a card at a time. Pure.
import type { Look, PresetId } from '../ui/framePrefs.ts'
import type { BlockId, BlockSize, Rect } from './flightFrame.ts'

/** Where docked cards go: a cluster in the bottom left corner, one row along the bottom, or one card at each edge. */
export type Dock = 'corner' | 'row' | 'edges'
export interface PresetOption { name: string; variant: number; dock: Dock | null; look: Look }
export type ReadyId = Exclude<PresetId, 'custom'>

export const PRESET_NAMES: Record<PresetId, string> = { custom: 'Custom', compact: 'Compact', stylistic: 'Stylistic', detailed: 'Detailed' }
export const VARIANT_NAMES = ['Full', 'Compact', 'Mini'] as const
export const LOOK_NAMES: Record<Look, string> = { glass: 'Glass', hud: 'HUD green', amber: 'Amber', ice: 'Ice' }

export const PRESETS: Record<ReadyId, readonly PresetOption[]> = {
  // Small and out of the way: the figures alone in a corner or along the bottom, or small tapes by the aircraft.
  compact: [
    { name: 'Corner', variant: 2, dock: 'corner', look: 'glass' },
    { name: 'Strip', variant: 2, dock: 'row', look: 'glass' },
    { name: 'Small tapes', variant: 1, dock: null, look: 'glass' },
  ],
  // The full instruments in other colours.
  stylistic: [
    { name: LOOK_NAMES.hud, variant: 0, dock: null, look: 'hud' },
    { name: LOOK_NAMES.amber, variant: 0, dock: null, look: 'amber' },
    { name: LOOK_NAMES.ice, variant: 0, dock: null, look: 'ice' },
  ],
  // Every instrument at full size: round the aircraft, at the view's edges, or as a panel along the bottom.
  detailed: [
    { name: 'Round the aircraft', variant: 0, dock: null, look: 'glass' },
    { name: 'At the edges', variant: 0, dock: 'edges', look: 'glass' },
    { name: 'Bottom panel', variant: 0, dock: 'row', look: 'glass' },
  ],
}

/** The option of a ready-made layout that prefs name (its first for none, or one out of range). */
export const optionOf = (preset: ReadyId, option: Partial<Record<PresetId, number>> | undefined): PresetOption =>
  PRESETS[preset][option?.[preset] ?? 0] ?? PRESETS[preset][0]

const ROW: readonly BlockId[] = ['left', 'top', 'bottom', 'right'] // as round the aircraft: altitude, heading, attitude, speed
const GRID: readonly (readonly BlockId[])[] = [['top', 'bottom'], ['left', 'right']] // the corner's cluster, row by row

/**
 * Where a dock puts the cards that have a size, top-left each: null when it has no room there (the cards then go round the
 * aircraft). The edges are the safe rectangle's (the frame's own room). The corner and the row rest on the bottom of the
 * view, lifted over each cover they would meet there (the play bar, the captions' band, the layout button), so the corner
 * is the view's own, not the safe rectangle's, which a button in that corner pushes in.
 */
export function dockAt(
  dock: Dock, sizes: Partial<Record<BlockId, BlockSize>>, safe: Rect, view: Rect, covers: readonly Rect[], gap: number,
): Partial<Record<BlockId, { x: number; y: number }>> | null {
  const out: Partial<Record<BlockId, { x: number; y: number }>> = {}
  const meets = (x: number, y: number, w: number, h: number): Rect | undefined =>
    covers.find((c) => c.w > 0 && c.h > 0 && x < c.x + c.w + gap && c.x < x + w + gap && y < c.y + c.h + gap && c.y < y + h + gap)
  /** A w × h group at x, resting on the bottom of the view, over every cover it would meet there; null: no room above them. */
  const rest = (x: number, w: number, h: number): number | null => {
    let y = view.y + view.h - h
    for (let c = meets(x, y, w, h); c !== undefined; c = meets(x, y, w, h)) y = c.y - gap - h
    return y >= safe.y ? y : null
  }
  if (dock === 'edges') {
    // The heading and the attitude over and under the view's middle (the aircraft's), kept inside the frame's room.
    const mid = { x: view.x + view.w / 2, y: safe.y + safe.h / 2 }
    const inX = (x: number, b: BlockSize): number => Math.min(Math.max(x, safe.x), safe.x + safe.w - b.w)
    const at: Record<BlockId, (b: BlockSize) => { x: number; y: number }> = {
      left: (b) => ({ x: safe.x, y: mid.y - (b.ay ?? b.h / 2) }),
      right: (b) => ({ x: safe.x + safe.w - b.w, y: mid.y - (b.ay ?? b.h / 2) }),
      top: (b) => ({ x: inX(mid.x - (b.ax ?? b.w / 2), b), y: safe.y }),
      bottom: (b) => ({ x: inX(mid.x - (b.ax ?? b.w / 2), b), y: safe.y + safe.h - b.h }),
    }
    for (const id of ROW) {
      const b = sizes[id]
      if (b === undefined) continue
      if (b.w > safe.w || b.h > safe.h) return null
      out[id] = at[id](b)
    }
    // The tapes at the sides need the width the heading and the attitude take between them.
    const [l, r, t] = [sizes.left, sizes.right, sizes.top ?? sizes.bottom]
    return l !== undefined && r !== undefined && t !== undefined && l.w + r.w + t.w + 2 * gap > safe.w ? null : out
  }
  if (dock === 'row') {
    const ids = ROW.filter((id) => sizes[id] !== undefined)
    const w = ids.reduce((n, id) => n + sizes[id]!.w, 0) + gap * Math.max(0, ids.length - 1)
    const h = Math.max(0, ...ids.map((id) => sizes[id]!.h))
    if (w > safe.w || h > safe.h) return null
    const x0 = Math.min(Math.max(view.x + (view.w - w) / 2, safe.x), safe.x + safe.w - w) // centred on the view, inside the frame's room
    const y = rest(x0, w, h)
    if (y === null) return null
    let x = x0
    for (const id of ids) {
      out[id] = { x, y: y + h - sizes[id]!.h } // on one base line
      x += sizes[id]!.w + gap
    }
    return out
  }
  // The corner: two columns, each as wide as its widest card, the rows as high as their highest.
  const colW = [0, 1].map((c) => Math.max(0, ...GRID.map((row) => sizes[row[c]]?.w ?? 0)))
  const rowH = GRID.map((row) => Math.max(0, ...row.map((id) => sizes[id]?.h ?? 0)))
  const small = gap / 2
  const w = colW[0] + colW[1] + (colW[0] > 0 && colW[1] > 0 ? small : 0)
  const h = rowH[0] + rowH[1] + (rowH[0] > 0 && rowH[1] > 0 ? small : 0)
  if (w > view.w || h > safe.h) return null
  const y0 = rest(view.x, w, h)
  if (y0 === null) return null
  GRID.forEach((row, r) => row.forEach((id, c) => {
    if (sizes[id] !== undefined) out[id] = { x: view.x + (c === 0 ? 0 : colW[0] + small), y: y0 + (r === 0 ? 0 : rowH[0] + small) }
  }))
  return out
}
