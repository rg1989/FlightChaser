// In-page measuring probe (QA only, never shipped). Installs once; window.__probe.sample(n) → per-kind draws/triangles, GPU and CPU ms.
(() => {
  if (window.__probe) return 'already'
  const v = window.viewer, s = v.scene, ctx = s.context, gl = ctx._gl
  const kinds = new WeakMap()
  const shaderKind = (sp) => {
    let k = kinds.get(sp)
    if (k !== undefined) return k
    const t = (sp?._vertexShaderText ?? '') + (sp?._fragmentShaderText ?? '')
    k = /czm_batchTable_ground|\bfch\b/.test(t) ? 'buildings' : null
    kinds.set(sp, k)
    return k
  }
  const kindOf = (cmd) => {
    const o = cmd.owner
    const n = o?.constructor?.name ?? 'none'
    if (n === 'QuadtreeTile' || n === 'GlobeSurfaceTile') return 'globe'
    const sk = shaderKind(cmd.shaderProgram ?? cmd._shaderProgram)
    if (sk) return sk
    if (n === 'Model' || n === 'ModelRuntimePrimitive' || o?._model) return 'model'
    if (n === 'PostProcessStage' || n === 'PostProcessStageComposite') return 'postprocess:' + (o?.name ?? '?').slice(0, 24)
    return n
  }
  const owners = {}
  let rec = null
  const draw = ctx.draw
  ctx.draw = function (cmd, ...rest) {
    if (rec) {
      const k = kindOf(cmd)
      const e = (rec.by[k] ??= { draws: 0, tris: 0 })
      e.draws++
      const va = cmd.vertexArray
      const count = cmd.count ?? va?.numberOfIndices ?? va?.numberOfVertices ?? 0
      const inst = cmd.instanceCount || 1
      if (cmd.primitiveType === 4 || cmd.primitiveType === undefined) e.tris += (count / 3) * inst
      ;(owners[k] ??= new Set()).add(cmd.owner)
    }
    return draw.call(this, cmd, ...rest)
  }
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const pending = []
  let q = null, t0 = 0, frame = 0
  const gpu = [], cpu = []
  s.preUpdate.addEventListener(() => { t0 = performance.now(); frame++ })
  s.preRender.addEventListener(() => {
    if (!ext || q || frame % 2) return
    if (gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) return
    q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q)
  })
  s.postRender.addEventListener(() => {
    if (rec) cpu.push(performance.now() - t0)
    if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push({ q, rec: !!rec }); q = null }
    while (pending.length && gl.getQueryParameter(pending[0].q, gl.QUERY_RESULT_AVAILABLE)) {
      const p = pending.shift()
      const ns = gl.getQueryParameter(p.q, gl.QUERY_RESULT)
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && p.rec) gpu.push(ns / 1e6)
      gl.deleteQuery(p.q)
    }
  })
  const hosts = {}
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { try { const h = new URL(e.name).host; const x = (hosts[h] ??= { n: 0, kb: 0 }); x.n++; x.kb += (e.transferSize || e.encodedBodySize || 0) / 1024 } catch {} } }).observe({ type: 'resource', buffered: false })
  const longs = []
  const gaps = []
  let lastRaf = 0
  const raf = (t) => { if (lastRaf) gaps.push(t - lastRaf); lastRaf = t; requestAnimationFrame(raf) }
  requestAnimationFrame(raf)
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(e.duration) }).observe({ type: 'longtask', buffered: false }) } catch {}
  const med = (a) => { if (!a.length) return null; const b = a.toSorted((x, y) => x - y); return +b[Math.floor(b.length / 2)].toFixed(2) }
  const p95 = (a) => { if (!a.length) return null; const b = a.toSorted((x, y) => x - y); return +b[Math.floor(b.length * 0.95)].toFixed(2) }
  const globeInfo = () => {
    const tl = s.globe?._surface?._tilesToRender ?? []
    const lv = {}
    for (const t of tl) lv[t.level] = (lv[t.level] ?? 0) + 1
    return { tiles: tl.length, levels: lv, layers: v.imageryLayers.length, shownLayers: Array.from({ length: v.imageryLayers.length }, (_, i) => v.imageryLayers.get(i)).filter((l) => l.show && l.alpha > 0).length }
  }
  window.__probe = {
    owners,
    // n frames of draws by kind (means), GPU ms (median, p95), CPU ms in Cesium's render (median, p95)
    async sample(n = 60) {
      gpu.length = 0; cpu.length = 0
      const frames = []
      let left = n
      await new Promise((res) => {
        const tick = () => {
          if (rec) frames.push(rec)
          if (left-- <= 0) { rec = null; s.postRender.removeEventListener(tick); return res() }
          rec = { by: {} }
        }
        s.postRender.addEventListener(tick)
      })
      await new Promise((r) => setTimeout(r, 400)) // late timer answers
      const by = {}
      for (const f of frames) for (const [k, e] of Object.entries(f.by)) { const x = (by[k] ??= { draws: 0, ktris: 0 }); x.draws += e.draws / frames.length; x.ktris += e.tris / frames.length / 1000 }
      for (const x of Object.values(by)) { x.draws = Math.round(x.draws); x.ktris = +x.ktris.toFixed(1) }
      const tot = Object.values(by).reduce((a, x) => ({ draws: a.draws + x.draws, ktris: +(a.ktris + x.ktris).toFixed(1) }), { draws: 0, ktris: 0 })
      return { frames: frames.length, gpuMs: med(gpu), gpuP95: p95(gpu), gpuN: gpu.length, cpuMs: med(cpu), cpuP95: p95(cpu), total: tot, by, globe: globeInfo(), sse: s.globe.maximumScreenSpaceError, fogSse: s.fog.screenSpaceErrorFactor, fogOn: s.fog.enabled }
    },
    // network + long tasks since the last call
    since() { const r = { hosts: JSON.parse(JSON.stringify(hosts)), longTasks: longs.length, longMs: +longs.reduce((a, b) => a + b, 0).toFixed(0), longMax: +Math.max(0, ...longs).toFixed(0), frames: gaps.length, over34: gaps.filter((g) => g > 34).length, over50: gaps.filter((g) => g > 50).length, over100: gaps.filter((g) => g > 100).length, gapMax: +Math.max(0, ...gaps).toFixed(0) }; for (const k in hosts) delete hosts[k]; longs.length = 0; gaps.length = 0; return r },
    hide(kind, show = false) { let n = 0; for (const [k, set] of Object.entries(owners)) if (k === kind || (kind.endsWith('*') && k.startsWith(kind.slice(0, -1)))) for (const o of set) { if (o && 'show' in o) { o.show = show; n++ } else if (o && 'enabled' in o) { o.enabled = show; n++ } } return n },
    keep() { const sc = s; window.__d = { msaa: sc.msaaSamples, bloom: sc.postProcessStages.bloom.enabled, fxaa: sc.postProcessStages.fxaa.enabled, sky: sc.skyAtmosphere?.show, gatm: sc.globe.showGroundAtmosphere, light: sc.globe.enableLighting, res: v.resolutionScale, fog: sc.fog.screenSpaceErrorFactor, sse: sc.globe.maximumScreenSpaceError }; return window.__d },
    restore() { const d = window.__d, sc = s; sc.msaaSamples = d.msaa; sc.postProcessStages.bloom.enabled = d.bloom; sc.postProcessStages.fxaa.enabled = d.fxaa; if (sc.skyAtmosphere) sc.skyAtmosphere.show = d.sky; sc.globe.showGroundAtmosphere = d.gatm; sc.globe.enableLighting = d.light; v.resolutionScale = d.res; sc.fog.screenSpaceErrorFactor = d.fog; sc.globe.maximumScreenSpaceError = d.sse; for (const k of Object.keys(owners)) this.hide(k, true); return 1 },
  }
  return 'installed ' + (ext ? 'with timer' : 'NO timer')
})()
