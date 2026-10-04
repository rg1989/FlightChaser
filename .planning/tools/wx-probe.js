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
// - ab(): the pass as it was before perf-1 (wx-old-shaders.js: its shaders, generated from that commit) put in the scene beside the
//   one in use, both drawn every frame, each timed: the same view, the same field, the same moment. The machine these runs are made
//   on is shared, and another program on its graphics card doubles a pass's time: the two side by side take that alike, so their
//   ratio stands where a time on its own does not.
// - tiers(): the pass's time at each tier of the pace (marchPace.ts), the tiers taken in turn, several rounds.
import { PostProcessStage, PostProcessStageComposite } from 'cesium'
import { OLD_MARCH, OLD_MIX } from './wx-old-shaders.js'

const med = (a) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[a.length >> 1])
const pct = (a, p) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))])
const max = (a) => a.reduce((m, x) => Math.max(m, x), 0)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : 'n/a')
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : 'n/a')

/** The frames' times over s seconds, ms. at: an array that is given each frame's end, ms on the page's clock. */
async function frames(s, at) {
  const t = []
  let last = performance.now()
  const end = last + s * 1000
  while (last < end) {
    await new Promise(requestAnimationFrame)
    const n = performance.now()
    t.push(n - last)
    at?.push(n)
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
  const t = { on: false, march: [], mix: [], marchOld: [], mixOld: [], waiting: [] }
  const execute = PostProcessStage.prototype.execute
  PostProcessStage.prototype.execute = function (...args) {
    const name = String(this.name)
    const old = name.endsWith('_old') ? 'Old' : ''
    const key = name.startsWith('fh_cloud_march') ? `march${old}` : name.startsWith('fh_cloud_mix') ? `mix${old}` : null
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

/**
 * The GPU's time for the pass over s seconds, ms a frame: the march's and the mix's medians, and each one's lower quartile (another
 * program on the same graphics card stretches some frames' times; the quick ones are the pass's own).
 */
async function gpu(s) {
  const t = gpuTimer()
  if (t === null) return { march: NaN, mix: NaN, marchLow: NaN, mixLow: NaN, frames: await frames(s) }
  t.march.length = t.mix.length = 0
  t.on = true
  const dts = await frames(s)
  t.on = false
  return { march: med(t.march), mix: med(t.mix), marchLow: pct(t.march, 25), mixLow: pct(t.mix, 25), frames: dts }
}

const where = () => {
  const q = new URLSearchParams(location.search)
  return `${q.has('wxdemo') ? `demo ${q.get('wxdemo')}` : 'real'} cam ${q.get('cam')}`
}
const tier = () => {
  const c = window.weather3d.sky.clouds
  return `${c.scale ?? '-'}${c.tier === undefined ? '' : `/t${c.tier}`}`
}

export async function pass({ looks = ['natural', 'severity', 'blocks'], cycles = 3, onS = 0.7 } = {}) {
  const w = window.weather3d
  const c = w.sky.clouds
  const was = w.look
  const out = []
  for (const look of looks) {
    w.look = look
    await frames(0.6)
    const g = await gpu(2)
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
    out.push(`${look}: gpu march ${f2(g.march)} (low ${f2(g.marchLow)}) mix ${f2(g.mix)} (low ${f2(g.mixLow)}) ms; frame on ${f1(med(on))} off ${f1(med(off))} diff ${f1(med(diff))} (${f1(Math.min(...diff))} to ${f1(Math.max(...diff))}) ms`)
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
    const ends = []
    const dts = await frames(gapS, ends)
    const wx = performance.getEntriesByName('fh:wx').map((e) => e.duration).sort((a, b) => b - a)
    const slow = dts.map((dt, i) => ({ dt, at: ends[i] - t0 })).sort((a, b) => b.dt - a.dt).slice(0, 3).map((x) => `${f1(x.dt)}@${Math.round(x.at)}`).join(' ')
    const held = performance.getEntriesByName('fh:wx').filter((e) => e.duration > 1.5).map((e) => `${f1(e.duration)}@${Math.round(e.startTime - t0)}`).join(' ')
    rows.push({ call, wx: wx.slice(0, 3), over: wx.filter((x) => x > 8).length, frameMax: max(dts), frameMed: med(dts), draw: w.drawMs, slow, held, made: w.sky.clouds.madeMs })
  }
  await frames(0.3)
  po.disconnect()
  const since = long.filter((l) => l.t >= t00)
  const f = w.field
  const sky = f === null || f === undefined ? 'no field' : `bands ${f.lo.map((lo, b) => (lo > f.hi[b] ? '-' : `${Math.round(lo)}-${Math.round(f.hi[b])}`)).join(' ')}`
  return `${where()} rebuild x${n} [${sky}; metars ${w.metars.length}, model ${w.model !== null}, radar ${w.radar !== null}, hazards ${w.hazards.length}; first draw ${f1(first)} ms; long tasks before ${before} (max ${f1(max(long.slice(0, before).map((l) => l.ms)))} ms)]: `
    + rows.map((r) => `call ${f1(r.call)} wx ${r.wx.map(f1).join('/')} (${r.over} over 8) frame max ${f1(r.frameMax)} med ${f1(r.frameMed)} draw ${f1(r.draw)}${r.made === undefined ? '' : ` made in ${f1(r.made)}`} [longest frames ms@ms after the call: ${r.slow}; wx over 1.5: ${r.held}]`).join(' | ')
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

/** The pass in the scene: Cloud Volume's composite, and its two stages. */
function livePass() {
  const stages = window.viewer.scene.postProcessStages
  for (let i = 0; i < stages.length; i++) {
    const c = stages.get(i)
    if (/^fh_cloud_\d+$/.test(String(c.name))) return { stages, pass: c, march: c.get(0), mix: c.get(1) }
  }
  return null
}

export async function ab({ looks = ['natural', 'severity', 'blocks'], s = 3 } = {}) {
  const w = window.weather3d
  const t = gpuTimer()
  const live = livePass()
  if (t === null || live === null) return `${where()} ab: ${t === null ? 'no timer query' : 'no pass in the scene'}`
  // The old shaders read an image Cesium had flipped; the volume's own images are not: the same texels, read the other way up.
  const unflip = (src) => src.replace('vec2(px.x / ATLAS.x, 1.0 - px.y / ATLAS.y)', 'px / ATLAS').replaceAll('vec2(m.x / FIELD_KM + 0.5, 0.5 - m.y / FIELD_KM)', 'm.xy / FIELD_KM + 0.5')
    .replace(/vec2\(px\.x \/ ([\d.]+), 1\.0 - px\.y \/ ([\d.]+)\)/, 'px / vec2($1, $2)')
  const uniforms = (src, map) => Object.fromEntries([...src.matchAll(/^uniform\s+\w+\s+(\w+)/gm)].map((m) => m[1]).filter((n) => !['colorTexture', 'depthTexture', 'u_march'].includes(n)).map((n) => [n, map[n]]))
  const march = new PostProcessStage({ name: 'fh_cloud_march_old', fragmentShader: unflip(OLD_MARCH), textureScale: live.march.textureScale, uniforms: uniforms(OLD_MARCH, live.march._uniformMap) })
  const mix = new PostProcessStage({ name: 'fh_cloud_mix_old', fragmentShader: unflip(OLD_MIX), uniforms: { ...uniforms(OLD_MIX, live.mix._uniformMap), u_march: march.name } })
  const missing = [...Object.entries(march.uniforms), ...Object.entries(mix.uniforms)].filter(([, v]) => v === undefined).map(([n]) => n)
  const old = new PostProcessStageComposite({ name: 'fh_cloud_old', stages: [march, mix], inputPreviousStageTexture: false })
  live.stages.add(old)
  const was = w.look
  const out = []
  for (const look of looks) {
    w.look = look
    await frames(1)
    for (const k of ['march', 'mix', 'marchOld', 'mixOld']) t[k].length = 0
    t.on = true
    await frames(s)
    t.on = false
    const [n, o] = [med(t.march) + med(t.mix), med(t.marchOld) + med(t.mixOld)]
    out.push(`${look}: was ${f2(med(t.marchOld))} + ${f2(med(t.mixOld))} ms, is ${f2(med(t.march))} + ${f2(med(t.mix))} ms: ${f2(o / n)} times quicker (${t.march.length} frames)`)
  }
  w.look = was
  live.stages.remove(old)
  return `${where()} [${innerWidth}x${innerHeight}, march ${tier()}] old pass beside the new (march + mix)${missing.length > 0 ? `; UNIFORMS MISSING: ${missing}` : ''}: ${out.join(' | ')}`
}

export async function tiers({ looks = ['natural'], rounds = 3, s = 1 } = {}) {
  const w = window.weather3d
  const c = w.sky.clouds
  const t = gpuTimer()
  if (t === null || c.tier === undefined) return `${where()} tiers: ${t === null ? 'no timer query' : 'no tiers'}`
  const [was, held] = [w.look, c.tier]
  const n = c.tiers ?? 6
  const out = []
  for (const look of looks) {
    w.look = look
    const got = Array.from({ length: n }, () => [])
    for (let r = 0; r < rounds; r++) {
      for (let k = 0; k < n; k++) {
        c.tier = k
        await frames(0.5)
        const g = await gpu(s)
        got[k].push(g.march + g.mix)
      }
    }
    const ms = got.map(med)
    out.push(`${look}: ${ms.map((v, k) => `t${k} ${f2(v)}`).join(', ')} ms; of the first tier's: ${ms.map((v) => f2(v / ms[0])).join(' ')}`)
  }
  w.look = was
  c.tier = held
  return `${where()} [${innerWidth}x${innerHeight}] the pass at each tier (march + mix): ${out.join(' | ')}`
}

/** The first load: the frames in which the weather held the main thread longest since the page began, and when (s after the first of them). */
export async function first() {
  const all = performance.getEntriesByName('fh:wx')
  if (all.length === 0) return `${where()} first: no fh:wx measure (?bench=1)`
  const t0 = all[0].startTime
  const top = [...all].sort((a, b) => b.duration - a.duration).slice(0, 6)
  return `${where()} the first load: ${all.length} frames; the weather's longest holds: ${top.map((e) => `${f1(e.duration)} ms at ${f1((e.startTime - t0) / 1000)} s`).join(', ')}; over 8 ms: ${all.filter((e) => e.duration > 8).length}`
}
