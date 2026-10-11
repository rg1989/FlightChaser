// client/history/flightBar.ts
// The time bar of one past flight's replay (a flight picked in the search box: app.ts replayFlight): the play bar
// (ui/playbar.ts) over that flight alone, from its first point heard to its last, with both moments written under the
// rail's ends, the replay's clock and day beside the play button, and × to go back to live. It stands where History's
// day bar stands and answers to the same handle, so History drives either; what belongs to a day (the hatches, the legs,
// the Go to popover) is not here. Times in the browser's zone, as History's.
import { mountPlaybar } from '../ui/playbar.ts'
import { inputTime, localClock, localDay, type HistoryBarHandle } from './bar.ts'

/** A moment as an end of the rail says it: '10 Oct 06:11' (History's day label without its weekday, and the minute). */
export const endLabel = (tMs: number): string => `${localDay(tMs).label.slice(4)} ${inputTime(tMs)}`

export interface FlightBarOpts {
  title: string // what is replayed: 'W4 3257 · WMT7403'
  fromMs: number // the flight's first point heard…
  toMs: number // …and its last
  zone: string // the clock's zone, short: 'GMT+3'
  onToggle(): void
  onSeek(tMs: number): void
  onRate(): void
  onClose(): void // ×: back to live
}

export function mountFlightBar(root: HTMLElement, o: FlightBarOpts): HistoryBarHandle {
  const span = Math.max(1, (o.toMs - o.fromMs) / 1000)
  const bar = mountPlaybar(root, {
    start: 0, stop: span, end: span, marks: [], clockLabel: o.zone, title: `Replay · ${o.title}`,
    onToggle: o.onToggle,
    onSeek: (t) => o.onSeek(o.fromMs + t * 1000),
    onRate: o.onRate,
    onExit: o.onClose,
    exitLabel: 'Close the replay: back to live',
    scale: [{ t: 0, label: endLabel(o.fromMs) }, { t: span, label: endLabel(o.toMs) }],
    className: 'fh-flightbar',
    timeLabel: 'Replay time',
  })
  return {
    update(v) {
      // The day under the clock, in the phase's line: the flight may cross midnight.
      bar.update({ t: (v.tMs - o.fromMs) / 1000, playing: v.playing, rate: v.rate, clock: localClock(v.tMs), phase: `${localDay(v.tMs).label} ${new Date(v.tMs).getFullYear()}` })
      bar.setBusy(v.loading)
    },
    setBounds() {}, // the flight is the whole rail
    setMissing() {},
    setLegs() {},
    setNote: (text) => bar.setNote(text),
    openGoTo() {},
    closeGoTo: () => false,
    destroy: () => bar.destroy(),
  }
}
