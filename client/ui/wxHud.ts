// client/ui/wxHud.ts
// The chase weather's HUD, over the 3-D view (wxAhead.ts works out what it says): at the top centre under the search box
// - the status line: a chip with where the aircraft is ("In light rain", or "Clear air · a thunderstorm in 3 min"; a dot in the
//   severity's colour; "No weather data" with a grey dot until a weather source has answered) and, when a hazard area is on the path,
//   a chip under it edged in the area's own colour ("Inside hazard area · …", "Hazard area in 2 min · …"); each chip is one line;
// - while the aircraft is inside a hazard area and under its top, a red frame inset round the whole view: the answer to "am I in it?"
//   (red whatever the area's colour, and whatever style its edges are drawn in);
// - the ahead strip under them: a side view of the next 80 km on this heading (the weather's cells in the severity's colours, the hazard
//   areas dashed, each in its colour, the aircraft's way as a dashed line with a tick each minute, the heights in the frame's units).
//   A window under 480 px high has no room for it (wxHud.css): it is not drawn there.
// The app gives it what to say a few times a second (set) and whether the strip shows (setStrip: the Weather menu's choice). Nothing
// here is computed: set(null …) hides it all, and so does the app while the weather is hidden. The strip is painted again only when
// it would show something else (another profile, other units, another size, a way ahead that has moved a pixel): a profile lasts a
// second or more (wxAhead.ts keepProfile), and its up to 8,000 cells are not drawn four times a second. The cells go to the canvas
// as one picture, a pixel a cell (stripCells), stretched over the plot: as rectangles, one a cell, 600 to 1,500 of them took 2.5 to
// 7 ms of a frame on the check machine.
// At a look it first reads what is laid out (its height, the strip's width), then paints the strip, and then writes: a read after a
// write makes the browser lay the whole page out on the spot, which took 5 to 20 ms of a flight's frame when a chip's words changed;
// so the height it publishes and the width the strip is drawn at are those of the look before (a strip just shown is drawn at its
// usual width for a quarter second). A canvas's text is such a read too (the strip's labels and lines took 4 to 7 ms at a look that
// had written a chip's words, 1.2 ms at one that had not), and so is the font of the labels, the page's, which is asked for with
// the reads and not at a paint (3 to 5 ms, the same way). And it reads only when a part of it has changed size or the window has (a ResizeObserver tells it; where there is none, at every
// look): a read at a look that changed nothing would still make the browser lay out whatever the rest of the page changed in that
// frame. moved() tells the app the same, for where the chips and the strip stand. It publishes its height as
// --fh-wxhud-h on its root, which wxHud.css uses to stand the alert toasts under it.
// ponytail: the strip is not one of the flight-data frame's movable cards: it has a fixed place, and the frame keeps off it as it does off
// the search box (app.ts FRAME_COVERS). Upgrade: a block of the flight-data frame.
import { AHEAD_MIN, SEV_COLOR, STRIP_COVER, pathPointAt, sevOf, statusWords, type AheadPath, type AheadProfile, type AheadStatus } from '../scene/wxAhead.ts'
import { M_PER_FT, type Units } from './units.ts'
import './wxHud.css'

export interface WxHudHandle {
  /** What to show now: no status hides the whole HUD; no profile or path, just the strip. The strip is drawn only while it is on (setStrip). */
  set(status: AheadStatus | null, profile: AheadProfile | null, path: AheadPath | null, units: Units): void
  setStrip(on: boolean): void
  /** Whether its parts may stand elsewhere, or be of another size, than when this was last asked (the app then measures where they are, before the next set). */
  moved(): boolean
  destroy(): void
}

/** The parts of a canvas's 2-D context the strip draws with (a recording stand-in in tests). */
export type StripContext = Pick<CanvasRenderingContext2D,
  'clearRect' | 'fillRect' | 'strokeRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'fill' | 'fillText' | 'setLineDash' | 'drawImage'
  | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'font' | 'textAlign' | 'textBaseline' | 'globalAlpha' | 'imageSmoothingEnabled'>

const UNKNOWN_COLOR = 'var(--fh-muted)' // the status dot while the sky is not known
const PATH_COLOR = '#ffd23f' // the traffic's yellow (theme.css --fh-traffic): the aircraft and its way
const AXIS_COLOR = '#8e9aab' // theme.css --fh-muted
const GRID_COLOR = 'rgba(142, 154, 171, 0.25)'
const PLOT_COLOR = 'rgba(255, 255, 255, 0.045)'
const FONT_PX = 11
const FALLBACK_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
const STRIP_W = 400 // the strip's drawn size when the page has not laid it out (a test)
const STRIP_RATIO = 0.28 // its height of its width; the canvas's CSS keeps the same shape
const PAD = { left: 58, right: 8, rightBoth: 58, top: 6, bottom: 18 } // CSS px round the plot: the height labels at its left (and right, in both units), the minutes under it
const TICK_PX = 6
const MIN_LABEL_GAP_PX = 44 // the least room between two minute labels: a slow aircraft's minutes are close, and every other is named
const MIN_LABEL_PX = 34 // a minute label's width, about ("6 min" at 11 px)
const GRID_FT = [10_000, 20_000, 30_000, 40_000] // the gridlines, in the unit the strip's heights are in
const GRID_M = [3000, 6000, 9000, 12_000]
const TRACE_STEP_KM = 5

/** The plot's rectangle inside a strip of w × h CSS px, its heights in these units. */
export function stripPlot(w: number, h: number, units: Units): { x0: number; y0: number; x1: number; y1: number } {
  return { x0: PAD.left, y0: PAD.top, x1: w - (units.alt === 'ft+m' ? PAD.rightBoth : PAD.right), y1: h - PAD.bottom }
}

const thousands = (n: number): string => n.toLocaleString('en-US')
const SEV_RGB = SEV_COLOR.map((c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16))) // the severity's colours as red, green, blue

/**
 * The strip's cells as a picture of cols × rows pixels, the top row first (red, green, blue, alpha a pixel): a cell where the cover
 * is over STRIP_COVER, in its severity's colour, the more solid the cover the stronger (0.35 + cover, to 1); clear elsewhere. Into
 * `out` when one is given.
 */
export function stripCells(profile: AheadProfile, out: Uint8ClampedArray = new Uint8ClampedArray(profile.cols * profile.rows * 4)): Uint8ClampedArray {
  const { cols, rows, cover, sev } = profile
  for (let j = 0; j < rows; j++) {
    for (let i = 0, at = (rows - 1 - j) * cols * 4; i < cols; i++, at += 4) {
      const c = cover[j * cols + i]
      if (!(c > STRIP_COVER)) {
        out[at] = out[at + 1] = out[at + 2] = out[at + 3] = 0
        continue
      }
      const rgb = SEV_RGB[sevOf(sev[j * cols + i])]
      out[at] = rgb[0]
      out[at + 1] = rgb[1]
      out[at + 2] = rgb[2]
      out[at + 3] = Math.round(255 * Math.min(1, 0.35 + c))
    }
  }
  return out
}

/**
 * The ahead strip on a canvas of w × h CSS px (its context scaled to them): the cells' picture (stripCells, on a canvas of its own:
 * `cells`; none: no cell is drawn) over the plot, the hazard areas the path crosses (a dashed box in the area's colour, base to top),
 * the gridlines with their heights in the frame's units (feet, metres, or feet at the left and metres at the right), the minutes
 * under the plot, and the way ahead as a dashed line from a marker for the aircraft.
 */
export function drawStrip(ctx: StripContext, w: number, h: number, profile: AheadProfile, path: AheadPath, units: Units, family = FALLBACK_FONT, cells: CanvasImageSource | null = null): void {
  const { x0, y0, x1, y1 } = stripPlot(w, h, units)
  const [pw, ph] = [x1 - x0, y1 - y0]
  const X = (km: number): number => x0 + (km / profile.kmAhead) * pw
  const Y = (m: number): number => y1 - (Math.min(m, profile.topM) / profile.topM) * ph
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = PLOT_COLOR
  ctx.fillRect(x0, y0, pw, ph)
  for (const z of profile.hazards) { // the hazard areas: from the base to the top, over the stretch of the path inside, each in its own colour
    const [ax, ay, bx, by] = [X(z.fromKm), Y(z.topM), X(z.toKm), Y(z.baseM)]
    ctx.globalAlpha = 0.14
    ctx.fillStyle = z.color
    ctx.fillRect(ax, ay, bx - ax, by - ay)
    ctx.globalAlpha = 1
  }
  if (cells !== null) {
    ctx.imageSmoothingEnabled = false // a cell is a block
    ctx.drawImage(cells, x0, y0, pw, ph)
  }
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  for (const z of profile.hazards) {
    ctx.strokeStyle = z.color
    ctx.strokeRect(X(z.fromKm), Y(z.topM), X(z.toKm) - X(z.fromKm), Y(z.baseM) - Y(z.topM))
  }
  ctx.setLineDash([])
  // The heights.
  ctx.font = `500 ${FONT_PX}px ${family}`
  ctx.fillStyle = AXIS_COLOR
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.textBaseline = 'middle'
  const metres = units.alt === 'm'
  for (const n of metres ? GRID_M : GRID_FT) {
    const y = Y(metres ? n : n * M_PER_FT)
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.fillText(`${thousands(n)} ${metres ? 'm' : 'ft'}`, x0 - 5, y)
    if (units.alt === 'ft+m') { // the same line in metres at the right, to the nearest 50
      ctx.textAlign = 'left'
      ctx.fillText(`${thousands(Math.round((n * M_PER_FT) / 50) * 50)} m`, x1 + 5, y)
    }
  }
  // The minutes: a tick each, and the number under it where there is room.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  let named = -Infinity
  for (let m = 1; m <= AHEAD_MIN; m++) {
    const km = m * path.kmPerMin
    if (km > profile.kmAhead) break
    const x = X(km)
    ctx.beginPath()
    ctx.moveTo(x, y1)
    ctx.lineTo(x, y1 - TICK_PX)
    ctx.stroke()
    if (x - named < MIN_LABEL_GAP_PX) continue
    named = x
    const inside = x + MIN_LABEL_PX / 2 <= w // a minute at the plot's far edge: its label ends at the strip's edge, not past it
    ctx.textAlign = inside ? 'center' : 'right'
    ctx.fillText(`${m} min`, inside ? x : w - 1, y1 + 4)
  }
  // The way ahead, from the aircraft.
  ctx.strokeStyle = PATH_COLOR
  ctx.lineWidth = 2
  ctx.setLineDash([6, 3.5])
  ctx.beginPath()
  ctx.moveTo(x0, Y(path.points[0].altM))
  for (let km = TRACE_STEP_KM; km < profile.kmAhead; km += TRACE_STEP_KM) ctx.lineTo(X(km), Y(pathPointAt(path, km).altM))
  ctx.lineTo(x1, Y(pathPointAt(path, profile.kmAhead).altM))
  ctx.stroke()
  ctx.setLineDash([])
  const y = Y(path.points[0].altM)
  ctx.fillStyle = PATH_COLOR
  ctx.beginPath()
  ctx.moveTo(x0 + 8, y)
  ctx.lineTo(x0, y - 4)
  ctx.lineTo(x0, y + 4)
  ctx.fill()
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  if (text !== '') el.textContent = text
  return el
}

export function mountWxHud(root: HTMLElement): WxHudHandle {
  const veil = h('div', 'fh-wxhud-veil')
  veil.setAttribute('aria-hidden', 'true')
  const box = h('div', 'fh-wxhud')
  const lines = h('div', 'fh-wxhud-lines')
  lines.setAttribute('role', 'status')
  const cloudChip = h('div', 'fh-glass fh-wxhud-chip')
  const dot = h('i', 'fh-wxhud-dot')
  const cloudText = h('span', 'fh-wxhud-text')
  cloudChip.append(dot, cloudText)
  const hazardChip = h('div', 'fh-glass fh-wxhud-chip fh-wxhud-hazard')
  const hazardText = h('span', 'fh-wxhud-text')
  hazardChip.append(hazardText)
  lines.append(cloudChip, hazardChip)
  const strip = h('div', 'fh-glass fh-wxhud-strip')
  const canvas = h('canvas', 'fh-wxhud-cv')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Side view of the weather on this heading, 80 km ahead')
  strip.append(h('div', 'fh-wxhud-strip-h', 'Ahead on this heading'), canvas)
  box.append(lines, strip)
  for (const el of [veil, box, hazardChip, strip]) el.hidden = true
  root.append(veil, box)

  let stripOn = true
  let last: { status: AheadStatus | null; profile: AheadProfile | null; path: AheadPath | null; units: Units } | null = null
  let published = 0
  let painted: (string | number | AheadProfile)[] = [] // what the strip's picture was painted from (paintStrip)
  let stripW = 0 // the strip's width as the page last laid it out, CSS px; 0: not laid out yet, or taken away by the stylesheet (a short window)
  let stripGone = false // the stylesheet has taken the strip away
  let font = FALLBACK_FONT // the font the page gives the canvas, as last asked (measure)
  const cells = document.createElement('canvas') // the strip's cells as a picture, a pixel a cell (stripCells): not in the page
  let cellsImage: ImageData | null = null
  let stale = true // what is laid out may be other than was last read here
  let astir = true // … or than the app was last told (moved)
  const mark = (): void => {
    stale = astir = true
  }
  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(mark) : null
  if (watch !== null) for (const el of [box, cloudChip, hazardChip, strip]) watch.observe(el)
  if (typeof window !== 'undefined') window.addEventListener('resize', mark)
  let dotColor = ''
  let hazardColor = ''

  /** Text and visibility written only when they change: the line says the same thing most of the time. */
  const say = (el: HTMLElement, text: string): void => {
    if (el.textContent !== text) el.textContent = text
  }
  const show = (el: HTMLElement, on: boolean): void => {
    if (el.hidden === on) el.hidden = !on // (hidden is the opposite of on)
  }

  function paintStrip(profile: AheadProfile, path: AheadPath, units: Units): void {
    const [ctx, cellsCtx] = typeof canvas.getContext === 'function' ? [canvas.getContext('2d'), cells.getContext('2d')] : [null, null]
    if (ctx === null || cellsCtx === null || stripGone) return
    const w = Math.max(220, Math.round(stripW || STRIP_W)) // as the look before found it laid out; a strip just shown: its usual width
    const hh = Math.round(w * STRIP_RATIO)
    const r = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1)
    // What the picture depends on: the profile, the units, the size, and the way ahead to the pixel (its height now, half-way and at
    // the far end, which give its line, and a minute's length, which gives the ticks). The same again: the picture stands.
    const { x0, y0, x1, y1 } = stripPlot(w, hh, units)
    const row = (km: number): number => Math.round(((y1 - y0) * Math.min(pathPointAt(path, km).altM, profile.topM)) / profile.topM)
    const now = [profile, units.alt, w, hh, r, row(0), row(profile.kmAhead / 2), row(profile.kmAhead), Math.round(((x1 - x0) * path.kmPerMin) / profile.kmAhead)]
    if (now.length === painted.length && now.every((v, k) => v === painted[k])) return
    painted = now
    if (canvas.width !== Math.round(w * r) || canvas.height !== Math.round(hh * r)) {
      canvas.width = Math.round(w * r)
      canvas.height = Math.round(hh * r)
    }
    if (cellsImage === null || cells.width !== profile.cols || cells.height !== profile.rows) {
      cells.width = profile.cols
      cells.height = profile.rows
      cellsImage = cellsCtx.createImageData(profile.cols, profile.rows)
    }
    stripCells(profile, cellsImage.data)
    cellsCtx.putImageData(cellsImage, 0, 0)
    ctx.setTransform(r, 0, 0, r, 0, 0)
    drawStrip(ctx, w, hh, profile, path, units, font, cells)
  }

  function publish(): void {
    const height = box.hidden ? 0 : Math.ceil(box.offsetHeight || 0)
    if (height === published) return
    published = height
    if (height === 0) root.style.removeProperty('--fh-wxhud-h')
    else root.style.setProperty('--fh-wxhud-h', `${height}px`)
  }

  /** What the page has laid out since the last look, read before this look writes anything: the HUD's height (published), the strip's width, and the canvas's font. */
  function measure(): void {
    if (watch !== null && !stale) return
    stale = false
    font = (typeof getComputedStyle === 'function' ? getComputedStyle(canvas).fontFamily : '') || FALLBACK_FONT
    if (!box.hidden) publish()
    if (box.hidden || strip.hidden) return
    stripW = canvas.clientWidth
    stripGone = stripW === 0 && typeof getComputedStyle === 'function' && getComputedStyle(strip).display === 'none' // a short window: the stylesheet has taken the strip away
  }

  function apply(): void {
    measure()
    const s = last?.status ?? null
    if (last === null || s === null) {
      show(box, false)
      show(veil, false)
      publish() // (hidden: nothing is read)
      return
    }
    const words = statusWords(s)
    const drawn = stripOn && last.profile !== null && last.path !== null
    if (drawn) paintStrip(last.profile!, last.path!, last.units) // (before anything is written: its text asks for the page's styles)
    show(box, true)
    say(cloudText, words.cloud)
    const color = !s.known ? UNKNOWN_COLOR : words.sev === null ? 'var(--fh-ok)' : SEV_COLOR[words.sev]
    if (color !== dotColor) dot.style.setProperty('--c', (dotColor = color))
    show(hazardChip, words.hazard !== null)
    if (words.hazard !== null) say(hazardText, words.hazard)
    if (s.hazard !== null && s.hazard.color !== hazardColor) hazardChip.style.setProperty('--hz', (hazardColor = s.hazard.color))
    show(veil, s.hazard?.inside === true)
    show(strip, drawn)
  }

  return {
    set(status, profile, path, units) {
      last = { status, profile, path, units }
      apply()
    },
    setStrip(on) {
      if (on === stripOn) return
      stripOn = on
      apply()
    },
    moved() {
      const was = astir || watch === null
      astir = false
      return was
    },
    destroy() {
      watch?.disconnect()
      if (typeof window !== 'undefined') window.removeEventListener('resize', mark)
      veil.remove()
      box.remove()
      root.style.removeProperty('--fh-wxhud-h')
    },
  }
}
