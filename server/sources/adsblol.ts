// server/sources/adsblol.ts
// adsb.lol v2 as a Source. Routes verified against github.com/adsblol/api src/adsb_api/utils/api_v2.py:
// /v2/point/{lat}/{lon}/{radius} → readsb circle= (radius int, 0..250 nm); /v2/hex/{hexes} → readsb find_hex= (comma list).
import { normalizeAdsblol } from '../../shared/readsb.ts'
import { fetchSnapshot, hexList } from './http.ts'
import type { Source } from './types.ts'

export const ADSBLOL_BASE = 'https://api.adsb.lol'
const MAX_RADIUS_NM = 250
// ponytail: 100 per batch keeps one chase request small; the upstream allows 1000. Raise it only if chases exceed 100.
const MAX_HEXES = 100

export function makeAdsblol(opts: { userAgent: string; baseUrl?: string; timeoutMs?: number }): Source {
  const base = (opts.baseUrl ?? ADSBLOL_BASE).replace(/\/+$/, '')
  const get = (path: string) => fetchSnapshot(base + path, normalizeAdsblol, { userAgent: opts.userAgent, timeoutMs: opts.timeoutMs })
  return {
    caps: { kind: 'adsblol', fullSnapshot: false, maxRps: 1, coverage: null, attribution: 'adsb.lol (ODbL 1.0)' },
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
