// server/sources/adsblol.ts
// adsb.lol v2 as a Source. Routes verified against github.com/adsblol/api src/adsb_api/utils/api_v2.py:
// /v2/point/{lat}/{lon}/{radius} → readsb circle= (radius int, 0..250 nm); /v2/hex/{hexes} → readsb find_hex= (comma list).
// Its limit per address is not published ("dynamic based on the environment load"). Measured from this IP: clean for a
// day at one request per 25–38 s, refused at 0.08 req/s (2026-09-22); at once, 3 answers then a 429 (2026-10-13 and
// 2026-10-15), or 9 after a quiet spell (2026-10-15). So: 0.04 req/s (config.ts) with a burst of 3.
import { normalizeAdsblol } from '../../shared/readsb.ts'
import { fetchSnapshot, hexList } from './http.ts'
import type { FetchResult, Source } from './types.ts'

export const ADSBLOL_BASE = 'https://api.adsb.lol'
const MAX_RADIUS_NM = 250
// ponytail: 100 per batch keeps one chase request small; the upstream allows 1000. Raise it only if chases exceed 100.
const MAX_HEXES = 100

/**
 * The aircraft's own word that its position is worthless (nic 0 and nac_p 0: GPS jammed or spoofed, as over Israel most
 * days): adsb.fi withholds such a position and still lists the aircraft as heard; adsb.lol serves it. Merged with
 * adsb.fi, adsb.lol's are withheld the same way, or a track would jump between the true position and a spoofed one.
 */
export function withholdJammed(r: FetchResult): FetchResult {
  for (const ac of r.snapshot?.aircraft ?? []) {
    if (ac.nic === 0 && ac.nac_p === 0) {
      delete ac.lat
      delete ac.lon
      delete ac.seen_pos
    }
  }
  return r
}

export function makeAdsblol(opts: { userAgent: string; baseUrl?: string; timeoutMs?: number; withholdJammed?: boolean }): Source {
  const base = (opts.baseUrl ?? ADSBLOL_BASE).replace(/\/+$/, '')
  const get = async (path: string) => {
    const r = await fetchSnapshot(base + path, normalizeAdsblol, { userAgent: opts.userAgent, timeoutMs: opts.timeoutMs })
    return opts.withholdJammed ? withholdJammed(r) : r
  }
  return {
    caps: { kind: 'adsblol', fullSnapshot: false, maxRps: 1, burst: 3, maxHexes: MAX_HEXES, coverage: null, attribution: 'adsb.lol (ODbL 1.0)' },
    async circle(lat, lon, radiusNm) {
      return get(`/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${Math.min(MAX_RADIUS_NM, Math.round(radiusNm))}`)
    },
    async hexes(hexes) {
      return get(`/v2/hex/${hexList(hexes, MAX_HEXES)}`)
    },
    // /v2/callsign/{callsigns} → readsb find_callsign= (a comma list), as /v2/hex: the flight search (server/flightSearch.ts).
    async callsign(callsigns) {
      const list = [...new Set(callsigns.map((c) => c.trim().toUpperCase()))].filter((c) => /^[A-Z0-9]{3,8}$/.test(c)).slice(0, 20)
      if (list.length === 0) throw new Error('no callsign') // never: the caller sends what parseFlightId passed
      return get(`/v2/callsign/${list.join(',')}`)
    },
    async all() {
      throw new Error('unsupported')
    },
  }
}
