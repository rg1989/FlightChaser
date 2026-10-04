// Checks of the weather satellite's two routes in the chase, for a QA run's eval step (qa-remote.sh; vite serves this file as it stands):
//   eval import("/.planning/tools/sat-probe.js").then((m) => m.state())
//   eval import("/.planning/tools/sat-probe.js").then((m) => m.plan())
// They read window.weather3d (app.ts). Each returns one line of text.
// - state(): what frame is held and by which route it came (weather3d.satellite), the field's middle, the bench overlay's lines (with ?bench=1: the
//   frames, and how often the weather held one over 8 ms), and what the page asked of the app's server's route and of EUMETView:
//   each request's status, its size as sent and how long it took, and the server's own times (Server-Timing: decode, cut).
// - plan(): the weather field drawn over the page as two plans of its 320 km square, north up: its cover (white: cloud), and the top
//   of its highest cloud in the satellite pictures' own colours (320 m … 16,000 m). The next shot is the plans.
import { SAT_STEP_M, SAT_TOPS } from '/client/scene/satellite.ts'
import { BANDS, FIELD_N } from '/client/scene/wxField.ts'

export function state() {
  const w = window.weather3d
  const asks = performance.getEntriesByType('resource').filter((e) => e.name.includes('/wx/sat') || e.name.includes('view.eumetsat.int')).map((e) => {
    const u = new URL(e.name)
    const what = u.pathname.endsWith('/wx/sat') ? `server${u.searchParams.has('have') ? ' (have)' : ''}` : u.searchParams.get('request') === 'GetMap' ? `picture ${u.searchParams.get('layers')}` : 'capabilities'
    const timing = (e.serverTiming ?? []).map((t) => `${t.name} ${t.duration} ms`).join(', ')
    return `${what}: HTTP ${e.responseStatus}, ${e.encodedBodySize} B sent, ${Math.round(e.duration)} ms${timing === '' ? '' : ` [${timing}]`}`
  })
  const bench = (document.querySelector('.fh-bench')?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const f = w?.field ?? null
  const centre = f === null ? 'none' : `${(f.lat - w.shift.dLat).toFixed(4)},${(f.lon - w.shift.dLon).toFixed(4)}` // where the weather is (?wxat), not where it is drawn
  return `satellite ${JSON.stringify(w?.satellite ?? null)} | field centre ${centre} | line: ${document.querySelector('.fh-wx-line')?.textContent ?? ''} | asks: ${asks.join('; ') || 'none'} | bench: ${bench}`
}

export function plan() {
  const w = window.weather3d
  const f = w?.field ?? null
  const sat = w?.satellite ?? null
  const size = Math.min(window.innerWidth / 2, window.innerHeight - 60)
  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.style.cssText = 'position:fixed;inset:0;z-index:2147483647'
  const g = canvas.getContext('2d')
  g.fillStyle = '#0e121c'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = '#e8ecf2'
  g.font = '18px sans-serif'
  const route = sat === null ? 'no satellite frame' : `${sat.time} frame, ${sat.raw ? 'raw numbers from the server' : 'read from EUMETView\'s pictures'}${sat.used ? '' : ' (not in use)'}`
  g.fillText(`FlightHopper's weather field (320 km square, north up): its cover, and its highest top. ${route}`, 12, 36)
  if (f !== null) {
    const img = [g.createImageData(FIELD_N, FIELD_N), g.createImageData(FIELD_N, FIELD_N)]
    for (let j = 0; j < FIELD_N; j++) {
      for (let i = 0; i < FIELD_N; i++) {
        const t = j * FIELD_N + i
        let clear = 1
        let top = 0
        for (let b = 0; b < BANDS; b++) {
          clear *= 1 - f.cov[b][t]
          if (f.cov[b][t] >= 0.3) top = Math.max(top, f.top[b][t])
        }
        const p = 4 * ((FIELD_N - 1 - j) * FIELD_N + i) // north up
        const c = 1 - clear
        img[0].data.set([14 + 241 * c, 18 + 237 * c, 28 + 227 * c, 255], p)
        const k = Math.min(SAT_TOPS.length, Math.round(top / SAT_STEP_M))
        img[1].data.set(k < 1 ? [14, 18, 28, 255] : [...SAT_TOPS[k - 1], 255], p)
      }
    }
    const small = document.createElement('canvas')
    small.width = small.height = FIELD_N
    for (let k = 0; k < 2; k++) {
      small.getContext('2d').putImageData(img[k], 0, 0)
      g.imageSmoothingEnabled = false
      g.drawImage(small, k * (canvas.width / 2) + (canvas.width / 2 - size) / 2, 56, size, size)
    }
  }
  document.body.appendChild(canvas)
  return f === null ? 'no field' : `the plans are drawn (${route})`
}
