// client/ui/wxRadarCard.ts
// The radar map: a small floating card among the chase's instruments, north up, the aircraft in the middle. Under it a street map (OSM's
// tiles, dimmed by CSS), over it the rain the weather holds (Weather3D.echoAt: live the newest frame, in a scenario its own day's), the way
// flown and the aircraft. The Weather menu's "Radar map" shows it (wxPrefs.map). Drag it anywhere: the place is kept. The button in its head
// steps the range. It draws twice a second, not every frame: the rain under an aircraft does not change faster.
// In the Small instruments layout it stands under the frame's column of cards, as wide as they are. Otherwise it stays where it was dragged.
// ponytail: it is a card of its own, not one of the frame's four (frameLayout places those round the aircraft, with presets and variants).
// Upgrade: a fifth BlockId, if it should take part in the layouts.
import { h } from './instruments.ts'
import './wxRadarCard.css'

export const WX_RADAR_KEY = 'fh.wxRadar.v1'
export const RADAR_RANGES_NM = [25, 50, 100] as const
const SIZE = 216 // CSS pixels of the map
const CELLS = 108 // the rain's cells a side
const EVERY_MS = 500
const KM_PER_NM = 1.852
const EARTH_KM = 40_075
const RAD = Math.PI / 180

/** The usual radar colours, from light rain to hail, as [red, green, blue]; null: nothing worth showing. */
export function echoColor(dbz: number): readonly [number, number, number] | null {
  if (dbz < 15) return null
  if (dbz < 20) return [64, 170, 220]
  if (dbz < 30) return [46, 178, 76]
  if (dbz < 35) return [24, 132, 56]
  if (dbz < 40) return [250, 226, 58]
  if (dbz < 45) return [250, 170, 40]
  if (dbz < 50) return [244, 96, 32]
  if (dbz < 55) return [224, 36, 36]
  if (dbz < 60) return [168, 16, 40]
  return [214, 60, 214]
}

/** Web Mercator pixels at zoom z. */
export function mercator(lat: number, lon: number, z: number): [x: number, y: number] {
  const n = 256 * 2 ** z
  const s = Math.sin(lat * RAD)
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

/** The latitude of Mercator row y at zoom z. */
export function latOfRow(y: number, z: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (256 * 2 ** z)))) / RAD
}

/** The map's zoom for a range across its width, at a latitude, and the scale its tiles are drawn at (1 … 2). */
export function zoomFor(rangeNm: number, lat: number): { z: number; scale: number } {
  const exact = Math.log2(((SIZE / (rangeNm * KM_PER_NM)) * EARTH_KM * Math.cos(lat * RAD)) / 256)
  const z = Math.max(1, Math.min(14, Math.floor(exact)))
  return { z, scale: 2 ** (exact - z) }
}

export interface RadarCardView {
  lat: number
  lon: number
  trackDeg: number
  echoAt: (lat: number, lon: number) => number | null // dBZ; null: none, or not known
  flown?: readonly { lat: number; lon: number }[] // the way flown, when the caller knows it (a scenario); else the card keeps its own
}

export interface RadarCard {
  show(on: boolean): void
  dock(column: { x: number; y: number; w: number; h: number } | null): void // stands under this column of cards, its width; null: where it was dragged
  update(v: RadarCardView, nowMs: number): void
  destroy(): void
}

interface Saved { x: number | null; y: number | null; range: number }

function readSaved(): Saved {
  try {
    const o = JSON.parse(localStorage.getItem(WX_RADAR_KEY) ?? 'null') as Partial<Saved> | null
    const pos = (v: unknown): number | null => (typeof v === 'number' && v >= 0 && v <= 1 ? v : null)
    return { x: pos(o?.x), y: pos(o?.y), range: RADAR_RANGES_NM.includes(o?.range as 25) ? o!.range! : 50 }
  } catch {
    return { x: null, y: null, range: 50 }
  }
}

export function mountRadarCard(parent: HTMLElement): RadarCard {
  const saved = readSaved()
  const write = (): void => {
    try {
      localStorage.setItem(WX_RADAR_KEY, JSON.stringify(saved))
    } catch { /* storage blocked: the place lasts this visit */ }
  }
  const root = h('div', 'fh-wxr')
  const head = h('div', 'fh-wxr-head')
  const rangeBtn = h('button', 'fh-wxr-range')
  rangeBtn.type = 'button'
  rangeBtn.title = 'Change the range'
  head.append(h('span', 'fh-wxr-title', 'Radar'), rangeBtn)
  const map = h('div', 'fh-wxr-map')
  const tiles = h('div', 'fh-wxr-tiles')
  const canvas = h('canvas', 'fh-wxr-over')
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1)
  canvas.width = canvas.height = SIZE * dpr
  map.append(tiles, canvas, h('span', 'fh-wxr-north', 'N'), h('span', 'fh-wxr-credit', '© OpenStreetMap'))
  root.append(head, map)
  parent.append(root)
  const ctx = canvas.getContext('2d')
  const rain = h('canvas', '')
  rain.width = rain.height = CELLS
  const rainCtx = rain.getContext('2d')
  const image = rainCtx?.createImageData(CELLS, CELLS) ?? null

  let docked: { x: number; y: number; w: number; h: number } | null = null
  const place = (): void => {
    root.classList.toggle('docked', docked !== null)
    if (docked !== null) {
      root.style.left = `${docked.x}px`
      root.style.top = `${docked.y + docked.h + 5}px`
      root.style.right = root.style.bottom = 'auto'
      root.style.transform = `scale(${docked.w / (SIZE + 18)})` // (the card: the map, its padding, its border)
      return
    }
    root.style.transform = ''
    root.style.left = root.style.top = root.style.right = root.style.bottom = ''
    if (saved.x === null || saved.y === null) return
    const [w, h0] = [parent.clientWidth - root.offsetWidth, parent.clientHeight - root.offsetHeight]
    root.style.left = `${Math.max(0, saved.x * w)}px`
    root.style.top = `${Math.max(0, saved.y * h0)}px`
    root.style.right = root.style.bottom = 'auto'
  }
  let dragging: { dx: number; dy: number } | null = null
  const onDown = (e: PointerEvent): void => {
    if ((e.target as Element).closest('button') !== null || docked !== null) return
    const r = root.getBoundingClientRect()
    dragging = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    root.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onMove = (e: PointerEvent): void => {
    if (dragging === null) return
    const p = parent.getBoundingClientRect()
    const clamp = (v: number): number => Math.min(1, Math.max(0, v))
    saved.x = clamp((e.clientX - p.left - dragging.dx) / Math.max(1, p.width - root.offsetWidth))
    saved.y = clamp((e.clientY - p.top - dragging.dy) / Math.max(1, p.height - root.offsetHeight))
    place()
  }
  const onUp = (): void => {
    if (dragging !== null) write()
    dragging = null
  }
  root.addEventListener('pointerdown', onDown)
  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerup', onUp)
  root.addEventListener('pointercancel', onUp)
  addEventListener('resize', place)

  const shown = new Map<string, HTMLImageElement>()
  const own: { lat: number; lon: number }[] = []
  let last: RadarCardView | null = null
  let dueMs = -Infinity
  let on = false

  const label = (): void => {
    rangeBtn.textContent = `${saved.range} nm`
  }
  label()
  rangeBtn.addEventListener('click', () => {
    saved.range = RADAR_RANGES_NM[(RADAR_RANGES_NM.indexOf(saved.range as 25) + 1) % RADAR_RANGES_NM.length]
    label()
    write()
    dueMs = -Infinity
    if (last !== null) draw(last)
  })

  function drawTiles(v: RadarCardView, z: number, scale: number): void {
    const [cx, cy] = mercator(v.lat, v.lon, z)
    const half = SIZE / 2 / scale
    const n = 2 ** z
    const want = new Set<string>()
    tiles.style.transform = `scale(${scale})`
    tiles.style.transformOrigin = '50% 50%'
    for (let ty = Math.floor((cy - half) / 256); ty <= Math.floor((cy + half) / 256); ty++) {
      for (let tx = Math.floor((cx - half) / 256); tx <= Math.floor((cx + half) / 256); tx++) {
        if (ty < 0 || ty >= n) continue
        const key = `${z}/${((tx % n) + n) % n}/${ty}`
        want.add(key)
        let img = shown.get(key)
        if (img === undefined) {
          img = h('img', 'fh-wxr-tile')
          img.alt = ''
          img.draggable = false
          img.src = `https://tile.openstreetmap.org/${key}.png`
          shown.set(key, img)
          tiles.append(img)
        }
        img.style.left = `${tx * 256 - cx + SIZE / 2}px`
        img.style.top = `${ty * 256 - cy + SIZE / 2}px`
      }
    }
    for (const [key, img] of shown) {
      if (want.has(key)) continue
      img.remove()
      shown.delete(key)
    }
  }

  function draw(v: RadarCardView): void {
    if (ctx === null || rainCtx === null || image === null) return
    const { z, scale } = zoomFor(saved.range, v.lat)
    drawTiles(v, z, scale)
    const [cx, cy] = mercator(v.lat, v.lon, z)
    const perCell = SIZE / CELLS / scale // Mercator pixels of the map's zoom to a cell
    const worldX = 256 * 2 ** z
    for (let j = 0; j < CELLS; j++) {
      const lat = latOfRow(cy + (j + 0.5 - CELLS / 2) * perCell, z)
      for (let i = 0; i < CELLS; i++) {
        const lon = ((cx + (i + 0.5 - CELLS / 2) * perCell) / worldX) * 360 - 180
        const dbz = v.echoAt(lat, lon)
        const c = dbz === null ? null : echoColor(dbz)
        const o = (j * CELLS + i) * 4
        image.data[o] = c?.[0] ?? 0
        image.data[o + 1] = c?.[1] ?? 0
        image.data[o + 2] = c?.[2] ?? 0
        image.data[o + 3] = c === null ? 0 : 170
      }
    }
    rainCtx.putImageData(image, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(rain, 0, 0, SIZE, SIZE)
    const at = (lat: number, lon: number): [number, number] => {
      const [x, y] = mercator(lat, lon, z)
      return [(x - cx) * scale + SIZE / 2, (y - cy) * scale + SIZE / 2]
    }
    // The way flown.
    const way = v.flown ?? own
    ctx.beginPath()
    way.forEach((p, i) => {
      const [x, y] = at(p.lat, p.lon)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(SIZE / 2, SIZE / 2)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3.5
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.stroke()
    ctx.lineWidth = 1.75
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    // The aircraft.
    ctx.save()
    ctx.translate(SIZE / 2, SIZE / 2)
    ctx.rotate(v.trackDeg * RAD)
    ctx.beginPath()
    ctx.moveTo(0, -9)
    ctx.lineTo(6.5, 7)
    ctx.lineTo(0, 3.5)
    ctx.lineTo(-6.5, 7)
    ctx.closePath()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.stroke()
    ctx.fillStyle = '#ffbe3b'
    ctx.fill()
    ctx.restore()
  }

  return {
    show(next) {
      on = next
      root.classList.toggle('on', next)
      if (next) {
        place()
        dueMs = -Infinity
      }
    },
    dock(column) {
      docked = column
      place()
    },
    update(v, nowMs) {
      last = v
      if (!on || nowMs < dueMs) return
      dueMs = nowMs + EVERY_MS
      if (v.flown === undefined) {
        const end = own[own.length - 1]
        if (end !== undefined && Math.hypot(end.lat - v.lat, end.lon - v.lon) > 0.2) own.length = 0 // another aircraft, or a jump
        own.push({ lat: v.lat, lon: v.lon })
        if (own.length > 1600) own.splice(0, 400)
      }
      draw(v)
    },
    destroy() {
      removeEventListener('resize', place)
      root.remove()
    },
  }
}
