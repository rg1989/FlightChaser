import type { Sample } from './types.ts'

const SAME_POSITION_MS = 1000

/**
 * Drops re-served and out-of-order positions. adsb.lol often re-serves the same position;
 * its tMs then repeats within a few ms of rounding. Genuine ADS-B positions are ≥ ~500 ms apart.
 * The same position from the other network (ADSB_SOURCE=adsbfi,adsblol) is stamped by that network's clock and receive
 * time: 23–104 ms apart, measured 2026-10-15. So an identical position is new only a second or more later (a parked
 * aircraft's next one).
 */
export class Deduper {
  #last = new Map<string, { tMs: number; lat: number; lon: number }>()

  accept(s: Sample): boolean {
    const p = this.#last.get(s.hex)
    if (p) {
      const dt = s.tMs - p.tMs
      if (dt <= 5) return false
      if (dt < SAME_POSITION_MS && s.lat === p.lat && s.lon === p.lon) return false
    }
    this.#last.set(s.hex, { tMs: s.tMs, lat: s.lat, lon: s.lon })
    return true
  }

  forget(hex: string): void {
    this.#last.delete(hex)
  }
}
