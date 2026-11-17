// client/ui/watchList.ts
// The watch list (server/flightWatch.ts) on the page: the flights put on it with the eye (the search's flight, the
// flight card), asked for every 15 s. The server looks them up and records them even while no page is open; here a
// change shows as a toast at the top centre (the Events toasts, ui/alerts.ts notice): heard, out of range, landed or
// lost. The Watching panel lists them, each with its state and a remove button; a row of one in range selects it.
import type { WatchState } from '../../shared/api.ts'
import { parseFlightId } from '../../shared/flightId.ts'
import { clockText } from '../search/flights.ts'
import { icon } from './icons.ts'
import './watchList.css'

const POLL_MS = 15_000

export interface Toast {
  title: string
  text: string
}

/** What a poll changed, as toasts: a watch heard (in range), gone out of range, or ended. A new or removed one: none. */
export function watchToasts(prev: readonly WatchState[], next: readonly WatchState[]): Toast[] {
  const out: Toast[] = []
  for (const n of next) {
    const p = prev.find((w) => w.id === n.id)
    if (p === undefined) continue
    if (n.ended !== null && p.ended === null) {
      out.push(n.ended === 'landed'
        ? { title: `${n.label} landed`, text: n.heardMs === null ? 'Its recording is in Recordings.' : `Landed ${clockText(n.heardMs)} · its recording is in Recordings.` }
        : { title: `${n.label} lost`, text: 'Not heard for hours: no longer watched.' })
    } else if (n.seen && !p.seen) {
      out.push({ title: `${n.label} is in range`, text: n.callsign === null ? 'Recording.' : `Heard as ${n.callsign} · recording.` })
    } else if (!n.seen && p.seen && n.ended === null) {
      out.push({ title: `${n.label} out of range`, text: n.heardMs === null ? 'Still watching.' : `Last heard ${clockText(n.heardMs)} · still watching.` })
    }
  }
  return out
}

/** A watch's state in a few words, for its row. */
export function watchLine(w: WatchState): string {
  if (w.ended === 'landed') return w.heardMs === null ? 'Landed' : `Landed ${clockText(w.heardMs)}`
  if (w.ended === 'lost') return 'Lost'
  if (w.seen) return w.callsign === null ? 'In range' : `In range · ${w.callsign}`
  if (w.heardMs !== null) return `Out of range · last heard ${clockText(w.heardMs)}`
  return 'Waiting to be heard'
}

/** The id the server keys a watch by, from the text as typed ('EY 593' → 'EY593'); null when it is no flight. */
export function watchId(text: string): string | null {
  return parseFlightId(text)?.id ?? null
}

export interface WatchModel {
  readonly list: readonly WatchState[] | null // null: this server has no watch list (or has not answered yet)
  isWatched(text: string): boolean
  toggle(text: string, on: boolean): Promise<void>
  subscribe(fn: () => void): () => void
  refresh(): void
  destroy(): void
}

export interface WatchModelOpts {
  get(): Promise<WatchState[] | null> // ApiClient.watches
  set(text: string, on: boolean): Promise<WatchState[]> // ApiClient.watch
  notice(title: string, text: string): void // a toast at the top centre
}

/** Asks for the list at once (on the next turn) and every 15 s (stops for good on a server without one); toasts what changed after the first answer. */
export function watchModel(opts: WatchModelOpts): WatchModel {
  let list: WatchState[] | null = null
  let primed = false // the first answer came: what it held was not new
  let destroyed = false
  const subs = new Set<() => void>()
  const mine = (text: string): WatchState | undefined => {
    const id = watchId(text)
    return id === null ? undefined : (list ?? []).find((w) => w.id === id || w.callsign === id)
  }
  const apply = (next: WatchState[] | null): void => {
    if (destroyed) return
    if (next !== null && list !== null && primed) for (const t of watchToasts(list, next)) opts.notice(t.title, t.text)
    list = next
    primed = true
    for (const fn of subs) fn()
  }
  const poll = (): void => {
    opts.get().then((next) => {
      apply(next)
      if (next === null) clearInterval(timer) // no watch list on this server
    }, (e: unknown) => console.warn('watch: the list could not be read:', e)) // the last list stays
  }
  const timer = setInterval(poll, POLL_MS)
  setTimeout(poll, 0) // after the caller's own start (the app makes its ApiClient later in the same run)
  return {
    get list() {
      return list
    },
    isWatched(text) {
      return mine(text) !== undefined
    },
    async toggle(text, on) {
      // Off: the watch it names (by its number, or by the callsign it was heard as: the card's ETD5SM is EY 593's).
      apply(await opts.set(on ? text : (mine(text)?.id ?? text), on))
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    refresh: poll,
    destroy() {
      destroyed = true
      clearInterval(timer)
      subs.clear()
    },
  }
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  if (text !== '') el.textContent = text
  return el
}

/**
 * An eye toggle for one flight: pressed while it is on the watch list. idOf says which flight (null: none, the button
 * hides). Call sync() when idOf's answer may have changed; the model's changes repaint it by themselves.
 */
export function watchButton(model: WatchModel, idOf: () => string | null, className = 'fh-ibtn fh-sm'): { el: HTMLButtonElement; sync(): void; destroy(): void } {
  const el = h('button', `${className} fh-watchbtn`)
  el.type = 'button'
  el.append(icon('eye', 16))
  let busy = false
  const sync = (): void => {
    const id = idOf()
    el.hidden = id === null || model.list === null
    const on = id !== null && model.isWatched(id)
    el.setAttribute('aria-pressed', String(on))
    el.classList.toggle('fh-on', on)
    const label = on ? 'Stop watching' : 'Watch this flight'
    el.setAttribute('aria-label', label)
    el.title = on ? label : 'Watch this flight: recorded whenever it is heard, even while this page is closed'
    el.disabled = busy
  }
  el.addEventListener('pointerdown', (e) => e.preventDefault()) // the search box keeps its focus (and stays open)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    const id = idOf()
    if (id === null || busy) return
    busy = true
    sync()
    model.toggle(id, !model.isWatched(id)).catch((err: unknown) => console.warn('watch: toggle failed:', err)).finally(() => {
      busy = false
      sync()
    })
  })
  const off = model.subscribe(sync)
  // The first paint waits for the caller to finish building: idOf may read what it declares after making the button (the
  // search box's lookup: reading it now threw "Cannot access 'look' before initialization" and stopped the app's start).
  el.hidden = true
  let gone = false
  queueMicrotask(() => gone || sync())
  return { el, sync, destroy: () => ((gone = true), off(), el.remove()) }
}

/** The Watching panel's body: a row a watch (eye, name and route, state; remove), or a line saying how to add one. */
export function mountWatchPanel(body: HTMLElement, model: WatchModel, opts: { onPick(hex: string): void }): { destroy(): void } {
  const root = h('div', 'fh-watch')
  body.append(root)
  const paint = (): void => {
    const list = model.list ?? []
    if (list.length === 0) {
      root.replaceChildren(h('p', 'fh-watch-empty', 'Nothing watched. Press the eye on a flight in the search, or on its card, to watch it.'))
      return
    }
    const ul = h('ul', 'fh-watch-list')
    for (const w of list) {
      const li = h('li', 'fh-watch-row')
      li.dataset.state = w.ended ?? (w.seen ? 'seen' : w.heardMs !== null ? 'out' : 'wait')
      const main = h('button', 'fh-watch-main')
      main.type = 'button'
      const pickable = w.seen && w.hex !== null
      main.disabled = !pickable
      if (pickable) main.title = `Show ${w.callsign ?? w.label} on the map`
      const text = h('span', 'fh-watch-text')
      const name = h('span', 'fh-watch-name', w.label)
      if (w.route !== null) name.append(h('span', 'fh-watch-route', ` · ${w.route}`))
      text.append(name, h('span', 'fh-watch-state', watchLine(w)))
      main.append(icon('eye', 16), text)
      main.addEventListener('click', () => {
        if (pickable) opts.onPick(w.hex!)
      })
      const rm = h('button', 'fh-ibtn fh-sm fh-watch-rm')
      rm.type = 'button'
      rm.setAttribute('aria-label', `Stop watching ${w.label}`)
      rm.title = 'Stop watching'
      rm.append(icon('x', 16))
      rm.addEventListener('click', () => {
        rm.disabled = true
        model.toggle(w.id, false).catch((e: unknown) => {
          rm.disabled = false
          console.warn('watch: remove failed:', e)
        })
      })
      li.append(main, rm)
      ul.append(li)
    }
    root.replaceChildren(ul)
  }
  const off = model.subscribe(paint)
  paint()
  return { destroy: () => (off(), root.remove()) }
}
