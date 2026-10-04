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
// - ab(): the pass as it was before perf-1 (wx-old-shaders.js: its shaders, generated from that commit) and a second copy of the pass
//   as it is now, both put in the scene after the one in use and drawn every frame, each timed: the same view, the same field, the
//   same moment. The machine these runs are made on is shared, and another program on its graphics card doubles a pass's time: the
//   two side by side take that alike, so their ratio stands where a time on its own does not. (The first pass after the scene's own
//   drawing pays for more than itself, so the pass in use is not one of the two; and the two are timed in both orders.)
// - tiers(): the pass's time at each tier of the pace (marchPace.ts), the tiers taken in turn, several rounds.
import { PostProcessStage, PostProcessStageComposite } from 'cesium'
import { OLD_MARCH, OLD_MIX } from './wx-old-shaders.js'

const med = (a) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[a.length >> 1])
const pct = (a, p) => (a.length === 0 ? NaN : [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))])
const max = (a) => a.reduce((m, x) => Math.max(m, x), 0)
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : 'n/a')
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : 'n/a')

/** The frames' times over s seconds, ms. at: an array that is given each frame's end, ms on the page's clock. each: called at every frame. */
async function frames(s, at, each) {
  const t = []
  let last = performance.now()
  const end = last + s * 1000
  while (last < end) {
    await new Promise(requestAnimationFrame)
    const n = performance.now()
    t.push(n - last)
    at?.push(n)
    each?.()
    last = n
  }
  return t
}

/** Whether the volume times its own pass (passTimer.ts, from the tiers on): the probe then reads that, and puts no query of its own round the pass in use (two cannot run at once). */
const timesItself = () => 'passMs' in window.weather3d.sky.clouds

let timer = null

/** The GPU's time for each of the pass's stages, ms a frame: { march: [], mix: [] }, filled while `on`; null where the browser has no timer query. */
function gpuTimer() {
  if (timer !== null) return timer
  const gl = window.viewer.scene.context._gl
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  if (ext === null) return null
  const t = { on: false, march: [], mix: [], marchOld: [], mixOld: [], marchNew: [], mixNew: [], waiting: [] }
  const execute = PostProcessStage.prototype.execute
  PostProcessStage.prototype.execute = function (...args) {
    const name = String(this.name)
    const which = name.endsWith('_old') ? 'Old' : name.endsWith('_new') ? 'New' : ''
    const key = name.startsWith('fh_cloud_march') ? `march${which}` : name.startsWith('fh_cloud_mix') ? `mix${which}` : null
    if (key === null || !t.on || (which === '' && timesItself())) return execute.apply(this, args)
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
  if (timesItself()) { // the pass's whole time, as the volume has it (one frame in four)
    const c = window.weather3d.sky.clouds
    const got = []
    const dts = await frames(s, undefined, () => Number.isFinite(c.passMs) && got.at(-1) !== c.passMs && got.push(c.passMs))
    return { march: med(got), mix: 0, marchLow: pct(got, 25), mixLow: 0, frames: dts, whole: true }
  }
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
    out.push(`${look}: gpu ${g.whole ? `pass ${f2(g.march)} (low ${f2(g.marchLow)})` : `march ${f2(g.march)} (low ${f2(g.marchLow)}) mix ${f2(g.mix)} (low ${f2(g.mixLow)})`} ms; frame on ${f1(med(on))} off ${f1(med(off))} diff ${f1(med(diff))} (${f1(Math.min(...diff))} to ${f1(Math.max(...diff))}) ms`)
    await frames(0.3)
  }
  w.look = was
  return `${where()} [${innerWidth}x${innerHeight}, march ${tier()}] ${out.join(' | ')}`
}

export async function rebuild({ n = 5, gapS = 3, anew = true } = {}) {
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
    w.rebuildSky(anew)
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
  return `${where()} rebuild x${n}${anew ? '' : ' (the sources\' clouds kept, as when the next field is due)'} [${sky}; metars ${w.metars.length}, model ${w.model !== null}, radar ${w.radar !== null}, hazards ${w.hazards.length}; first draw ${f1(first)} ms; long tasks before ${before} (max ${f1(max(long.slice(0, before).map((l) => l.ms)))} ms)]: `
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
  const rows = []
  for (let k = 0; k < s; k++) {
    const g = await gpu(1)
    rows.push(`${tier()}:${f1(med(g.frames))}(${f1(g.march + g.mix)})`)
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

/** A pass made beside the one in the scene (not yet in the scene), reading the same images and numbers: the pass as it was before perf-1 ('old'), or as it is now ('new'). */
function passOf(live, which, shaders) {
  // The old shaders read an image Cesium had flipped; the volume's own images are not: the same texels, read the other way up.
  const unflip = (src) => src.replace('vec2(px.x / ATLAS.x, 1.0 - px.y / ATLAS.y)', 'px / ATLAS').replaceAll('vec2(m.x / FIELD_KM + 0.5, 0.5 - m.y / FIELD_KM)', 'm.xy / FIELD_KM + 0.5')
    .replace(/vec2\(px\.x \/ ([\d.]+), 1\.0 - px\.y \/ ([\d.]+)\)/, 'px / vec2($1, $2)')
  const [marchSrc, mixSrc] = which === 'old' ? [unflip(OLD_MARCH), unflip(OLD_MIX)] : [shaders.MARCH_SHADER, shaders.MIX_SHADER]
  const uniforms = (src, map) => Object.fromEntries([...src.matchAll(/^uniform\s+\w+\s+(\w+)/gm)].map((m) => m[1]).filter((n) => !['colorTexture', 'depthTexture', 'u_march'].includes(n)).map((n) => [n, map[n]]))
  const march = new PostProcessStage({ name: `fh_cloud_march_${which}`, fragmentShader: marchSrc, textureScale: live.march.textureScale, uniforms: uniforms(marchSrc, live.march._uniformMap) })
  const mix = new PostProcessStage({ name: `fh_cloud_mix_${which}`, fragmentShader: mixSrc, uniforms: { ...uniforms(mixSrc, live.mix._uniformMap), u_march: march.name } })
  const missing = [...Object.entries(march.uniforms), ...Object.entries(mix.uniforms)].filter(([, v]) => v === undefined).map(([n]) => n)
  return { pass: new PostProcessStageComposite({ name: `fh_cloud_${which}`, stages: [march, mix], inputPreviousStageTexture: false }), missing }
}
const oldPass = (live) => {
  const { pass, missing } = passOf(live, 'old')
  return { old: pass, missing }
}

export async function ab({ looks = ['natural', 'severity', 'blocks'], s = 2 } = {}) {
  const w = window.weather3d
  const t = gpuTimer()
  const live = livePass()
  if (t === null || live === null) return `${where()} ab: ${t === null ? 'no timer query' : 'no pass in the scene'}`
  const shaders = await import('/client/scene/cloudShaders.ts')
  const was = w.look
  const out = []
  let lost = []
  for (const look of looks) {
    w.look = look
    const got = { old: [], new: [], oldMarch: [], newMarch: [] }
    for (const order of [['old', 'new'], ['new', 'old']]) {
      const made = order.map((which) => passOf(live, which, shaders))
      lost = made.flatMap((m) => m.missing)
      for (const m of made) live.stages.add(m.pass)
      await frames(0.8)
      for (const k of ['marchOld', 'mixOld', 'marchNew', 'mixNew']) t[k].length = 0
      t.on = true
      await frames(s)
      t.on = false
      got.old.push(med(t.marchOld) + med(t.mixOld))
      got.new.push(med(t.marchNew) + med(t.mixNew))
      got.oldMarch.push(med(t.marchOld))
      got.newMarch.push(med(t.marchNew))
      for (const m of made) live.stages.remove(m.pass)
      await frames(0.2)
    }
    const mean = (a) => (a[0] + a[1]) / 2
    out.push(`${look}: was ${f2(mean(got.old))} ms (march ${f2(mean(got.oldMarch))}; drawn first ${f2(got.old[0])}, second ${f2(got.old[1])}), is ${f2(mean(got.new))} ms (march ${f2(mean(got.newMarch))}; second ${f2(got.new[0])}, first ${f2(got.new[1])}): ${f2(mean(got.old) / mean(got.new))} times quicker`)
  }
  w.look = was
  return `${where()} [${innerWidth}x${innerHeight}, march ${tier()}] the old pass and the new side by side (march + mix)${lost.length > 0 ? `; UNIFORMS MISSING: ${lost}` : ''}: ${out.join(' | ')}`
}

/**
 * Whether the pass draws what it drew before perf-1: the same frame drawn with the new pass, then with the old one in its place, then
 * with the new one again (what differs between the first and the third is the scene's own change from one frame to the next: the
 * sea's waves), and the pictures compared, pixel by pixel.
 */
export async function same({ looks = ['natural', 'severity', 'blocks'] } = {}) {
  const w = window.weather3d
  const live = livePass()
  if (live === null) return `${where()} same: no pass in the scene`
  const v = window.viewer
  const gl = v.scene.context._gl
  const [W, H] = [gl.drawingBufferWidth, gl.drawingBufferHeight]
  const { old, missing } = oldPass(live)
  old.enabled = false
  live.stages.add(old)
  const grab = (newOne) => {
    live.pass.enabled = newOne
    old.enabled = !newOne
    const time = v.clock.currentTime
    for (let k = 0; k < 3; k++) v.scene.render(time) // the stage that was off is made ready again in the first
    const px = new Uint8Array(W * H * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return px
  }
  const differ = (a, b) => {
    let [sum, most, over] = [0, 0, 0]
    for (let o = 0; o < a.length; o += 4) {
      const d = Math.max(Math.abs(a[o] - b[o]), Math.abs(a[o + 1] - b[o + 1]), Math.abs(a[o + 2] - b[o + 2]))
      sum += d
      if (d > most) most = d
      if (d > 8) over++
    }
    return `mean ${f2(sum / (a.length / 4))} of 255, ${f2((100 * over) / (a.length / 4))} % of pixels over 8, most ${most}`
  }
  const was = w.look
  const out = []
  for (const look of looks) {
    w.look = look
    await frames(1)
    const [a, b, c] = [grab(true), grab(false), grab(true)]
    out.push(`${look}: new against old: ${differ(a, b)}; new against new again: ${differ(a, c)}`)
  }
  w.look = was
  live.pass.enabled = true
  live.stages.remove(old)
  return `${where()} [${W}x${H}] the picture${missing.length > 0 ? `; UNIFORMS MISSING: ${missing}` : ''}: ${out.join(' | ')}`
}

/** Hazard areas of 48 edges in all (two rings of 24 corners round the aircraft, 25 and 45 km out), in the style given: the most the march is ever given. */
export function edges48(style = 'box') {
  const w = window.weather3d
  const a = w.aircraft
  if (a === null) return 'edges48: no aircraft'
  const ring = (km) => Array.from({ length: 25 }, (_, i) => [a.lon + (km * Math.cos((2 * Math.PI * i) / 24)) / (111.195 * Math.cos((a.lat * Math.PI) / 180)), a.lat + (km * Math.sin((2 * Math.PI * i) / 24)) / 111.195])
  const area = (km, topM) => {
    const r = ring(km)
    return { sigmet: { hazard: 'TS', qualifier: 'EMBD', base: null, top: topM / 0.3048, until: '', raw: '', rings: [r] }, rings: [r], nearest: r, baseM: 0, topM, key: `probe${km}` }
  }
  w.sky.clouds.setHazards([area(25, 9000), area(45, 11000)], style, () => '#ff5a5a')
  return `edges48: two rings of 24 edges, ${style}`
}

export async function tiers({ looks = ['natural'], rounds = 3, s = 1 } = {}) {
  const w = window.weather3d
  const c = w.sky.clouds
  if (typeof w.holdTier !== 'function') return `${where()} tiers: no tiers`
  const was = w.look
  const n = 6
  const out = []
  for (const look of looks) {
    w.look = look
    const got = Array.from({ length: n }, () => [])
    const frame = Array.from({ length: n }, () => [])
    for (let r = 0; r < rounds; r++) {
      for (let k = 0; k < n; k++) {
        w.holdTier(k)
        await frames(0.6)
        const g = await gpu(s)
        if (c.tier === k) {
          got[k].push(g.march + g.mix)
          frame[k].push(med(g.frames))
        }
      }
    }
    const ms = got.map(med)
    out.push(`${look}: ${ms.map((v, k) => `t${k} ${f2(v)}`).join(', ')} ms on the GPU; of the first tier's: ${ms.map((v) => f2(v / ms[0])).join(' ')}; frames ${frame.map((f) => f1(med(f))).join(' ')} ms`)
  }
  w.look = was
  w.holdTier(null)
  return `${where()} [${innerWidth}x${innerHeight}] the pass at each tier (march + mix): ${out.join(' | ')}`
}

/**
 * A flight of s seconds as it is, with no rebuild asked for: each new field that comes into use (the next one being due, 35 km on),
 * with the weather's longest hold of the main thread and the longest frame in the two seconds round it; and over the whole flight,
 * the weather's longest hold, the frames it took more than 8 ms, and the long tasks.
 */
export async function flown({ s = 240 } = {}) {
  const w = window.weather3d
  const long = []
  const po = new PerformanceObserver((l) => {
    for (const e of l.getEntries()) long.push({ t: e.startTime, ms: e.duration })
  })
  po.observe({ type: 'longtask' })
  performance.clearMeasures('fh:wx')
  performance.clearMeasures('fh:wx-ahead')
  const t0 = performance.now()
  const ends = []
  const swaps = []
  let [field, start] = [w.field, w.aircraft === null ? null : { ...w.aircraft }]
  const dts = await frames(s, ends, () => {
    if (w.field !== field) {
      field = w.field
      swaps.push(performance.now())
    }
  })
  po.disconnect()
  const wx = performance.getEntriesByName('fh:wx')
  const km = start === null || w.aircraft === null ? NaN : Math.hypot((w.aircraft.lat - start.lat) * 111.195, (w.aircraft.lon - start.lon) * 111.195 * Math.cos((start.lat * Math.PI) / 180))
  const round = swaps.map((at) => {
    const near = (t) => Math.abs(t - at) <= 1000
    return `at ${Math.round((at - t0) / 1000)} s: weather ${f1(max(wx.filter((e) => near(e.startTime)).map((e) => e.duration)))} ms, frame ${f1(max(dts.filter((_, i) => near(ends[i]))))} ms`
  })
  const ahead = performance.getEntriesByName('fh:wx-ahead')
  const part = (e) => {
    const a = ahead.find((x) => Math.abs(x.startTime + x.duration - (e.startTime + e.duration)) < 0.5)
    return a === undefined ? '' : ` (the way ahead and the HUD ${f1(a.duration)})`
  }
  const top = [...wx].sort((a, b) => b.duration - a.duration).slice(0, 8).map((e) => `${f1(e.duration)} ms at ${f1((e.startTime - t0) / 1000)} s${part(e)}`).join(', ')
  return `${where()} flown ${Math.round(s)} s, ${f1(km)} km: ${swaps.length} new field${swaps.length === 1 ? '' : 's'} [${round.join('; ')}]; the weather's longest hold ${f1(max(wx.map((e) => e.duration)))} ms, ${wx.filter((e) => e.duration > 8).length} frames over 8 ms, its longest: ${top}; frames median ${f1(med(dts))} p99 ${f1(pct(dts, 99))} max ${f1(max(dts))} ms; long tasks ${long.length} (max ${f1(max(long.map((l) => l.ms)))} ms); sky: ${w.metars.length} reports, model ${w.model !== null}, radar ${w.radar !== null}${modelAsks === null ? '' : `, forecast asks answered in the page ${modelAsks}`}`
}

let modelAsks = null // realSky: how many asks for the model's grid the page answered itself

/**
 * For a flight in the real sky that must not ask the forecast feed (it has a daily budget): load the page with wx=0; this then
 * answers the page's asks for the model's grid itself, with a made-up grid round the place asked (cloud at every level, by a fixed
 * sequence), and shows the weather. The reports, the hazard areas and the radar are the real ones.
 */
export function realSky() {
  const real = window.fetch
  modelAsks = 0
  window.fetch = (url, init) => {
    const u = new URL(String(url instanceof Request ? url.url : url), location.href)
    if (!u.pathname.endsWith('/wx/model')) return real(url, init)
    modelAsks++
    const [lat, lon, n, step] = [Number(u.searchParams.get('lat')), Number(u.searchParams.get('lon')), 13, 0.25]
    let seed = 7
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const z = [110, 760, 1450, 3010, 4200, 5570, 7180, 9160, 10360, 11780]
    const grid = {
      lat0: lat - (step * (n - 1)) / 2, lon0: lon - (step * (n - 1)) / 2, step, n, timeMs: Date.now(), elevM: Array(n * n).fill(50),
      clouds: [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200].map((hPa, l) => ({ hPa, cover: Array.from({ length: n * n }, () => Math.round(100 * r())), zM: Array(n * n).fill(z[l]) })),
      winds: [850, 700, 500, 300, 250, 200].map((hPa) => ({ hPa, kt: Array(n * n).fill(30), deg: Array(n * n).fill(270) })),
    }
    return Promise.resolve(new Response(JSON.stringify(grid), { status: 200, headers: { 'content-type': 'application/json' } }))
  }
  window.weather3d.show = true
  return `${where()} the weather shown; the forecast is answered in the page`
}

/** The first load: the frames in which the weather held the main thread longest since the page began, and when (s after the first of them). */
export async function first() {
  const all = performance.getEntriesByName('fh:wx')
  if (all.length === 0) return `${where()} first: no fh:wx measure (?bench=1)`
  const t0 = all[0].startTime
  const top = [...all].sort((a, b) => b.duration - a.duration).slice(0, 6)
  return `${where()} the first load: ${all.length} frames; the weather's longest holds: ${top.map((e) => `${f1(e.duration)} ms at ${f1((e.startTime - t0) / 1000)} s`).join(', ')}; over 8 ms: ${all.filter((e) => e.duration > 8).length}`
}
