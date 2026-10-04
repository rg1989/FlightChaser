// Timing probes for the chase's weather, for a QA run's eval step (qa-remote.sh; vite serves this file as it stands):
//   eval import("/.planning/tools/wx-probe.js").then((m) => m.pass())
// Each returns one line of text. They read window.weather3d and window.viewer (app.ts) and, with ?bench=1, the app's own
// User Timing measure fh:wx (how long the weather held the main thread in each frame).
// - pass(): what the cloud pass costs, look by look: the GPU's own time for its two stages (a timer query round each, where the
//   browser has EXT_disjoint_timer_query_webgl2) and the frames' times with the pass on and off, in turn, so that what else the page
//   is doing counts on both sides. Run it with UNCAP=1, or every frame takes the display's 16.7 ms.
// - rebuild(): the field built again n times (Weather3D.rebuildSky): the main thread's longest hold and the longest frame at each.
// - hud(): what the status line and the ahead strip cost each time they are worked out.
// - steady(): the frames and the pass over a while, with the pace's tier at each second.
import { PostProcessStage } from 'cesium'

const med = (a) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[a.length >> 1])
const pct = (a, p) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))])
const max = (a) => a.reduce((m, x) => Math.max(m, x), 0)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : 'n/a')
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : 'n/a')

/** The frames' times over s seconds, ms. */
async function frames(s) {
  const t = []
  let last = performance.now()
  const end = last + s * 1000
  while (last < end) {
    await new Promise(requestAnimationFrame)
    const n = performance.now()
    t.push(n - last)
    last = n
  }
  return t
}

let timer = null

/** The GPU's time for each of the pass's stages, ms a frame: { march: [], mix: [] }, filled while `on`; null where the browser has no timer query. */
function gpuTimer() {
  if (timer !== null) return timer
  const gl = window.viewer.scene.context._gl
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  if (ext === null) return null
  const t = { on: false, march: [], mix: [], waiting: [] }
  const execute = PostProcessStage.prototype.execute
  PostProcessStage.prototype.execute = function (...args) {
    const name = String(this.name)
    const key = name.startsWith('fh_cloud_march') ? 'march' : name.startsWith('fh_cloud_mix') ? 'mix' : null
    if (key === null || !t.on) return execute.apply(this, args)
    const q = gl.createQuery()
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q)
    execute.apply(this, args)
    gl.endQuery(ext.TIME_ELAPSED_EXT)
    t.waiting.push({ q, key })
  }
  window.viewer.scene.postRender.addEventListener(() => {
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT)
    while (t.waiting.length > 0 && gl.getQueryParameter(t.waiting[0].q, gl.QUERY_RESULT_AVAILABLE)) {
      const { q, key } = t.waiting.shift()
      if (!disjoint && t.on) t[key].push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
      gl.deleteQuery(q)
    }
  })
  return (timer = t)
}

/** The GPU's time for the pass over s seconds: the medians of the march's and the mix's, ms. */
async function gpu(s) {
  const t = gpuTimer()
  if (t === null) return { march: NaN, mix: NaN, frames: await frames(s) }
  t.march.length = t.mix.length = 0
  t.on = true
  const dts = await frames(s)
  t.on = false
  return { march: med(t.march), mix: med(t.mix), frames: dts }
}

const where = () => {
  const q = new URLSearchParams(location.search)
  return `${q.has('wxdemo') ? `demo ${q.get('wxdemo')}` : 'real'} cam ${q.get('cam')}`
}
const tier = () => {
  const c = window.weather3d.sky.clouds
  return `${c.scale ?? '-'}${c.tier === undefined ? '' : `/t${c.tier}`}`
}

export async function pass({ looks = ['natural', 'severity', 'blocks'], cycles = 5, onS = 0.8 } = {}) {
  const w = window.weather3d
  const c = w.sky.clouds
  const was = w.look
  const out = []
  for (const look of looks) {
    w.look = look
    await frames(0.6)
    const g = await gpu(1.5)
    const on = []
    const off = []
    for (let k = 0; k < cycles; k++) {
      c.show = true
      await frames(0.3)
      on.push(med(await frames(onS)))
      c.show = false
      await frames(0.3)
      off.push(med(await frames(onS)))
    }
    c.show = true
    const diff = on.map((v, i) => v - off[i])
    out.push(`${look}: gpu march ${f2(g.march)} mix ${f2(g.mix)} ms; frame on ${f1(med(on))} off ${f1(med(off))} diff ${f1(med(diff))} (${f1(Math.min(...diff))} to ${f1(Math.max(...diff))}) ms`)
    await frames(0.3)
  }
  w.look = was
  return `${where()} [${innerWidth}x${innerHeight}, march ${tier()}] ${out.join(' | ')}`
}

export async function rebuild({ n = 5, gapS = 3 } = {}) {
  const w = window.weather3d
  const long = []
  const po = new PerformanceObserver((l) => {
    for (const e of l.getEntries()) long.push({ t: e.startTime, ms: e.duration })
  })
  po.observe({ type: 'longtask', buffered: true })
  await frames(0.2)
  const before = long.length
  const first = w.drawMs
  const rows = []
  const t00 = performance.now()
  for (let k = 0; k < n; k++) {
    performance.clearMeasures('fh:wx')
    const t0 = performance.now()
    w.rebuildSky()
    const call = performance.now() - t0
    const dts = await frames(gapS)
    const wx = performance.getEntriesByName('fh:wx').map((e) => e.duration).sort((a, b) => b - a)
    rows.push({ call, wx: wx.slice(0, 3), over: wx.filter((x) => x > 8).length, frameMax: max(dts), frameMed: med(dts), draw: w.drawMs })
  }
  await frames(0.3)
  po.disconnect()
  const since = long.filter((l) => l.t >= t00)
  const f = w.field
  const sky = f === null || f === undefined ? 'no field' : `bands ${f.lo.map((lo, b) => (lo > f.hi[b] ? '-' : `${Math.round(lo)}-${Math.round(f.hi[b])}`)).join(' ')}`
  return `${where()} rebuild x${n} [${sky}; metars ${w.metars.length}, model ${w.model !== null}, radar ${w.radar !== null}, hazards ${w.hazards.length}; first draw ${f1(first)} ms; long tasks before ${before} (max ${f1(max(long.slice(0, before).map((l) => l.ms)))} ms)]: `
    + rows.map((r) => `call ${f1(r.call)} wx ${r.wx.map(f1).join('/')} (${r.over} over 8) frame max ${f1(r.frameMax)} med ${f1(r.frameMed)} draw ${f1(r.draw)}`).join(' | ')
    + ` || long tasks in the rebuilds ${since.length} (max ${f1(max(since.map((l) => l.ms)))} ms); worst wx ${f1(max(rows.map((r) => r.wx[0] ?? 0)))} ms, worst frame ${f1(max(rows.map((r) => r.frameMax)))} ms`
}

export async function hud({ s = 6, n = 200 } = {}) {
  const w = window.weather3d
  performance.clearMeasures('fh:wx')
  const t0 = performance.now()
  await frames(s)
  const all = performance.getEntriesByName('fh:wx')
  const looks = new Map() // the longest hold in each quarter second: the frame the status line and the strip were worked out in
  for (const e of all) {
    const k = Math.floor((e.startTime - t0) / 250)
    looks.set(k, Math.max(looks.get(k) ?? 0, e.duration))
  }
  const per = [...looks.values()]
  const { aheadStatus, aheadProfile } = await import('/client/scene/wxAhead.ts')
  const path = w.ahead
  let pure = 'no way ahead'
  if (path !== null) {
    const label = () => 'area'
    let t = performance.now()
    for (let i = 0; i < n; i++) aheadStatus(path, w.field, w.hazards, label, w.known)
    const status = (performance.now() - t) / n
    t = performance.now()
    for (let i = 0; i < n; i++) aheadProfile(path, w.field, w.hazards)
    pure = `aheadStatus ${f2(status)} ms, aheadProfile ${f2((performance.now() - t) / n)} ms a call (${n} calls)`
  }
  const d = all.map((e) => e.duration)
  return `${where()} hud [strip ${document.querySelector('.fh-wxhud-strip')?.hidden === false}]: fh:wx a frame median ${f2(med(d))} p99 ${f2(pct(d, 99))} max ${f2(max(d))} ms; the quarter second's longest: median ${f2(med(per))} max ${f2(max(per))} ms; ${pure}`
}

export async function steady({ s = 20 } = {}) {
  const w = window.weather3d
  const t = gpuTimer()
  const rows = []
  for (let k = 0; k < s; k++) {
    if (t !== null) {
      t.march.length = t.mix.length = 0
      t.on = true
    }
    const dts = await frames(1)
    if (t !== null) t.on = false
    rows.push(`${tier()}:${f1(med(dts))}${t === null ? '' : `(${f1(med(t.march) + med(t.mix))})`}`)
  }
  return `${where()} [${innerWidth}x${innerHeight}, ${w.look}] each second, tier:frame ms(pass gpu ms): ${rows.join(' ')}`
}

/** The frames' times with the weather off altogether, for the size: what the pace has to hold. */
export async function bare({ s = 4 } = {}) {
  const c = window.weather3d.sky.clouds
  c.show = false
  await frames(0.5)
  const dts = await frames(s)
  c.show = true
  return `${where()} [${innerWidth}x${innerHeight}] no cloud pass: frame median ${f1(med(dts))} p95 ${f1(pct(dts, 95))} ms`
}
