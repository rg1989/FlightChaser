// A soak's counters, for a QA run (qa-remote.sh): what is alive in the page and what a frame costs, sampled over many minutes, so
// that what grows shows. A classic script, run before the app's own by a `preload` step that reads it from vite as it stands:
//   preload { const x = new XMLHttpRequest(); x.open('GET', '/.planning/tools/perf2-pre.js', false); x.send(); (0, eval)(x.responseText) }
// (a preload counts for the pages loaded after it: give it an entry of its own before the soak's, e.g. "pre|wx=0&setup=0|preload …").
// A quick card that is not kept busy slows its clock, and a pass's time read then is too long and wavers (2 to 4 times, on the
// check machine's RTX 4090 at a third of its load). `eval __fhBurn()` keeps it busy: one more stage after the cloud pass, which
// only burns the card's time, made heavier until the frames wait for the card. The pass's time read then is the card's own at
// full clock. __fhTiers() times each tier's pass; __fhWatch() follows the pace's tier over a while.
// (`viewer.resolutionScale = 3.16` draws the view at ten times the pixels, but in this headless Chromium a frame's time then
// goes with the canvas's size whatever is drawn, 75 ms at 20 megapixels: it is no stand-in for a slow card's frames.)
// Then `eval __fhs()` at each sample: one object of numbers since the sample before (frames, long tasks, the weather's hold, uploads,
// draws, worker messages, requests) and of what is alive now (WebGL objects, workers, timers, listeners, DOM nodes, the scene's parts,
// the heap). It reads window.viewer and window.weather3d (app.ts); with ?bench=1 the app's User Timing measures too, which it clears
// at each sample (they pile up at six a frame).
(() => {
  if (window.__fhs !== undefined) return
  const c = { alive: {}, made: {}, calls: {}, bytes: 0, draws: 0, raf: 0, posts: {}, answers: {}, listeners: 0, timeouts: 0, fetches: {} }
  const G = typeof WebGL2RenderingContext === 'undefined' ? null : WebGL2RenderingContext.prototype
  if (G !== null) {
    for (const k of ['Texture', 'Framebuffer', 'Renderbuffer', 'Buffer', 'Program', 'Shader', 'Query', 'VertexArray', 'Sampler']) {
      const live = (c.alive[k] = new Set())
      c.made[k] = 0
      const [mk, rm] = [G[`create${k}`], G[`delete${k}`]]
      G[`create${k}`] = function (...a) {
        const o = mk.apply(this, a)
        live.add(o)
        c.made[k]++
        return o
      }
      G[`delete${k}`] = function (o, ...a) {
        live.delete(o)
        return rm.call(this, o, ...a)
      }
    }
    for (const k of ['texImage2D', 'texSubImage2D', 'texStorage2D', 'compileShader', 'linkProgram', 'readPixels', 'bindFramebuffer', 'useProgram', 'beginQuery', 'getQueryParameter', 'clientWaitSync', 'getError', 'finish', 'flush']) {
      const f = G[k]
      c.calls[k] = 0
      G[k] = function (...a) {
        c.calls[k]++
        if (k === 'texImage2D' || k === 'texSubImage2D') {
          const src = a[a.length - 1]
          c.bytes += src !== null && typeof src === 'object' && 'byteLength' in src ? src.byteLength : typeof a[a.length - 2] === 'object' && a[a.length - 2] !== null && 'byteLength' in a[a.length - 2] ? a[a.length - 2].byteLength : 0
        }
        return f.apply(this, a)
      }
    }
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const f = G[k]
      G[k] = function (...a) {
        c.draws++
        return f.apply(this, a)
      }
    }
  }
  // Workers alive, by their script's name, with what is sent to them and what they answer.
  const workers = new Set()
  const W = window.Worker
  window.Worker = class extends W {
    constructor(url, opts) {
      super(url, opts)
      this.__name = String(url).split('/').pop().split('?')[0].slice(0, 40)
      workers.add(this)
      this.addEventListener('message', () => (c.answers[this.__name] = (c.answers[this.__name] ?? 0) + 1))
    }
    postMessage(...a) {
      c.posts[this.__name] = (c.posts[this.__name] ?? 0) + 1
      return super.postMessage(...a)
    }
    terminate() {
      workers.delete(this)
      return super.terminate()
    }
  }
  // Timers and listeners.
  const intervals = new Set()
  const [si, ci, st, ct] = [window.setInterval, window.clearInterval, window.setTimeout, window.clearTimeout]
  window.setInterval = (f, ...a) => {
    const id = si(f, ...a)
    intervals.add(id)
    return id
  }
  window.clearInterval = (id) => {
    intervals.delete(id)
    return ci(id)
  }
  const pending = new Set()
  window.setTimeout = (f, ms, ...a) => {
    c.timeouts++
    const id = st((...b) => {
      pending.delete(id)
      return typeof f === 'function' ? f(...b) : undefined
    }, ms, ...a)
    pending.add(id)
    return id
  }
  window.clearTimeout = (id) => {
    pending.delete(id)
    return ct(id)
  }
  const [ael, rel] = [EventTarget.prototype.addEventListener, EventTarget.prototype.removeEventListener]
  EventTarget.prototype.addEventListener = function (...a) {
    c.listeners++
    return ael.apply(this, a)
  }
  EventTarget.prototype.removeEventListener = function (...a) {
    c.listeners--
    return rel.apply(this, a)
  }
  const raf = window.requestAnimationFrame
  window.requestAnimationFrame = (f) => {
    c.raf++
    return raf(f)
  }
  const fetch0 = window.fetch
  window.fetch = (...a) => {
    const u = String(a[0]?.url ?? a[0])
    const key = u.startsWith('http') ? new URL(u).host + new URL(u).pathname.split('/').slice(0, 4).join('/') : u.split('?')[0]
    c.fetches[key.slice(0, 60)] = (c.fetches[key.slice(0, 60)] ?? 0) + 1
    return fetch0(...a)
  }
  // Frames, long tasks and the app's measures since the last sample.
  let frames = []
  let last = performance.now()
  const tick = () => {
    const n = performance.now()
    frames.push(n - last)
    last = n
    raf(tick)
  }
  raf(tick)
  const tasks = []
  const measures = {}
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) tasks.push(e.duration)
    }).observe({ type: 'longtask' })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const m = (measures[e.name] ??= { n: 0, sum: 0, max: 0, over8: 0 })
        m.n++
        m.sum += e.duration
        if (e.duration > m.max) m.max = e.duration
        if (e.duration > 8) m.over8++
      }
    }).observe({ type: 'measure' })
  } catch {}
  const r1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null)
  const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null)
  const pct = (a, p) => (a.length === 0 ? NaN : a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))])
  const t0 = performance.now()
  let [hooked, renders, prevRenders] = [false, 0, 0] // the frames Cesium has drawn (counted from the first sample on)
  let prev = { made: {}, calls: {}, bytes: 0, draws: 0, raf: 0, posts: {}, answers: {}, timeouts: 0, fetches: {} }
  const delta = (now, was) => Object.fromEntries(Object.entries(now).map(([k, v]) => [k, v - (was[k] ?? 0)]).filter(([, v]) => v !== 0))
  window.__fhc = c
  window.__fhs = () => {
    const tS = performance.now()
    const f = frames.sort((a, b) => a - b)
    frames = []
    const n = f.length
    const sum = f.reduce((s, x) => s + x, 0)
    const out = { t: Math.round((tS - t0) / 1000), fr: { n, mean: r2(sum / n), p50: r2(pct(f, 50)), p95: r2(pct(f, 95)), p99: r2(pct(f, 99)), max: r1(f[n - 1]) } }
    out.long = { n: tasks.length, max: Math.round(tasks.reduce((m, x) => Math.max(m, x), 0)), sum: Math.round(tasks.reduce((s, x) => s + x, 0)) }
    tasks.length = 0
    out.meas = Object.fromEntries(Object.entries(measures).map(([k, m]) => [k.replace('fh:', ''), [r2(m.sum / m.n), r1(m.max), m.over8]]))
    for (const k of Object.keys(measures)) delete measures[k]
    out.perfEntries = performance.getEntriesByType('measure').length
    performance.clearMeasures()
    performance.clearMarks()
    const mem = performance.memory
    out.heapMB = mem ? r1(mem.usedJSHeapSize / 2 ** 20) : null
    out.heapTotMB = mem ? r1(mem.totalJSHeapSize / 2 ** 20) : null
    out.gl = Object.fromEntries(Object.entries(c.alive).map(([k, s]) => [k, s.size]))
    out.glMade = delta(c.made, prev.made)
    out.glCalls = delta(c.calls, prev.calls)
    out.upMB = r2((c.bytes - prev.bytes) / 2 ** 20)
    out.drawsPerFrame = r1((c.draws - prev.draws) / Math.max(1, n))
    out.rafPerFrame = r2((c.raf - prev.raf) / Math.max(1, n))
    out.workers = [...workers].reduce((o, w) => ((o[w.__name] = (o[w.__name] ?? 0) + 1), o), {})
    out.posts = delta(c.posts, prev.posts)
    out.answers = delta(c.answers, prev.answers)
    out.intervals = intervals.size
    out.timeoutsPending = pending.size
    out.timeoutsSet = c.timeouts - prev.timeouts
    out.listeners = c.listeners
    out.fetches = delta(c.fetches, prev.fetches)
    prev = { made: { ...c.made }, calls: { ...c.calls }, bytes: c.bytes, draws: c.draws, raf: c.raf, posts: { ...c.posts }, answers: { ...c.answers }, timeouts: c.timeouts, fetches: { ...c.fetches } }
    // The page's elements: all of them, and the five classes with the most.
    const all = document.getElementsByTagName('*')
    const by = {}
    for (const e of all) {
      const k = typeof e.className === 'string' && e.className !== '' ? e.className.split(' ')[0] : e.tagName.toLowerCase()
      by[k] = (by[k] ?? 0) + 1
    }
    out.dom = { n: all.length, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(' ') }
    const v = window.viewer
    if (v !== undefined && !v.isDestroyed()) {
      const s = v.scene
      const surf = s.globe?._surface
      const count = (p) => (p === undefined || p === null ? null : typeof p.length === 'number' ? p.length : null)
      const deep = (p, d = 0) => {
        if (p === undefined || p === null || d > 4 || typeof p.length !== 'number' || typeof p.get !== 'function') return 1
        let k = 0
        for (let i = 0; i < p.length; i++) k += deep(p.get(i), d + 1)
        return k
      }
      let ents = v.entities.values.length
      for (let i = 0; i < v.dataSources.length; i++) ents += v.dataSources.get(i).entities.values.length
      out.scene = {
        prims: count(s.primitives), primsDeep: deep(s.primitives), ground: count(s.groundPrimitives), stages: count(s.postProcessStages), commands: s.frameState?.commandList?.length ?? null,
        sources: v.dataSources.length, entities: ents, imagery: v.imageryLayers.length, tiles: surf?._tilesToRender?.length ?? null, tilesHeld: surf?._tileReplacementQueue?.count ?? null,
        shaders: s.context?.shaderCache?.numberOfShaders ?? null, picks: s.context?._pickObjects ? Object.keys(s.context._pickObjects).length : null,
        canvas: `${v.canvas.width}x${v.canvas.height}`, preUpdate: s.preUpdate?.numberOfListeners ?? null, postRender: s.postRender?.numberOfListeners ?? null, preRender: s.preRender?.numberOfListeners ?? null,
      }
    }
    if (v !== undefined && !hooked) {
      hooked = true
      v.scene.postRender.addEventListener(() => renders++)
    }
    out.renders = renders - prevRenders
    prevRenders = renders
    const w = window.weather3d
    if (w !== undefined) {
      const sat = w.satellite
      const a = w.aircraft
      out.wx = {
        show: w.show, tier: w.tier, scale: w.sky.clouds.scale, passMs: r2(w.sky.clouds.passMs), metars: w.metars.length, sigmets: w.sigmets.length, hazards: w.hazards.length, known: w.known,
        field: w.field === null ? null : w.field.empty ? 'empty' : 'cloud', drawMs: r1(w.drawMs), madeMs: r1(w.sky.clouds.madeMs), failed: w.cloudsFailed,
        sat: sat === null ? null : `${sat.time}${sat.raw ? ' raw' : ' pics'}${sat.used ? ' used' : ''} cloudy ${r2(sat.cloudy)}`, at: a === null ? null : `${a.lat.toFixed(3)},${a.lon.toFixed(3)},${Math.round(a.altM)}`,
      }
    }
    out.tookMs = r1(performance.now() - tS)
    return out
  }
  // The pass's time on the graphics card at each of the first n tiers (marchPace.ts), each held for `secs` seconds after a second and
  // a half for its pass to be made: [tier, the march's share of the view, the pass's median ms, its 95th percentile, the frames' median ms].
  window.__fhTiers = async (n = 6, secs = 3) => {
    const w = window.weather3d
    const out = []
    for (let k = 0; k < n; k++) {
      w.holdTier(k)
      await new Promise((r) => st(r, 1500))
      const [p, f] = [[], []]
      let was = performance.now()
      const end = was + secs * 1000
      while (was < end) {
        await new Promise(raf)
        const now = performance.now()
        f.push(now - was)
        was = now
        const ms = w.sky.clouds.passMs
        if (Number.isFinite(ms)) p.push(ms)
      }
      p.sort((a, b) => a - b)
      f.sort((a, b) => a - b)
      const parts = w.sky.clouds.passParts
      out.push([w.tier, w.sky.clouds.scale, r2(pct(p, 50)), r2(pct(p, 95)), r2(pct(f, 50)), ...(parts === undefined ? [] : parts.map(r2))])
    }
    w.holdTier(null)
    return out
  }
  // The graphics card kept busy: a stage after the cloud pass that only burns time (a loop of sines for every pixel), made heavier
  // until a frame takes `frameMs` or more (the frames then wait for the card: it runs at full clock). Gives the loop's length and
  // the frames' median time with it. __fhBurn(0) takes the stage out.
  let burner = null
  window.__fhBurn = async (frameMs = 30) => {
    const v = window.viewer
    const stages = v.scene.postProcessStages
    if (burner !== null) {
      stages.remove(burner.stage)
      burner = null
    }
    if (!(frameMs > 0)) return null
    const Stage = stages.fxaa.constructor
    const b = { k: 32, stage: null }
    b.stage = new Stage({
      name: 'fh_perf2_burn',
      fragmentShader: `uniform sampler2D colorTexture; uniform float u_k; in vec2 v_textureCoordinates;
        void main() {
          vec4 c = texture(colorTexture, v_textureCoordinates);
          float a = 0.0;
          for (int i = 0; i < 262144; i++) { if (float(i) >= u_k) break; a += sin(float(i) * 0.37 + c.r + a * 0.001); }
          out_FragColor = c + vec4(a * 1.0e-9);
        }`,
      uniforms: { u_k: () => b.k },
    })
    stages.add(b.stage)
    burner = b
    const median = async (ms) => {
      const f = []
      let was = performance.now()
      const end = was + ms
      while (was < end) {
        await new Promise(raf)
        const now = performance.now()
        f.push(now - was)
        was = now
      }
      f.sort((x, y) => x - y)
      return pct(f, 50)
    }
    await median(1500)
    let m = await median(1000)
    while (m < frameMs && b.k < 262000) {
      b.k = Math.min(262000, Math.ceil(b.k * Math.max(1.25, Math.min(2, frameMs / Math.max(m, 1)))))
      await median(600)
      m = await median(1000)
    }
    return [b.k, r1(m)]
  }
  // The pace followed for `secs` seconds: every `every` seconds [seconds on, the tier, the pass's ms, its parts, the frames' median ms and their 95th percentile].
  window.__fhWatch = async (secs = 60, every = 5) => {
    const w = window.weather3d
    const out = []
    const begin = performance.now()
    while (performance.now() - begin < secs * 1000) {
      const f = []
      let was = performance.now()
      const end = was + every * 1000
      while (was < end) {
        await new Promise(raf)
        const now = performance.now()
        f.push(now - was)
        was = now
      }
      f.sort((a, b) => a - b)
      const parts = w.sky.clouds.passParts
      out.push([Math.round((was - begin) / 1000), w.tier, r2(w.sky.clouds.passMs), parts === undefined ? null : parts.map(r2).join('+'), r1(pct(f, 50)), r1(pct(f, 95))])
    }
    return out
  }
  // The chase camera taken to `rangeM` from the aircraft by a wheel event on the canvas (the orbit's own zoom); the distance after it.
  window.__fhZoom = async (rangeM) => {
    const v = window.viewer
    const a = window.weather3d.aircraft
    const R = 6371000
    const far = () => {
      const C = v.camera.positionCartographic
      const [la, lo] = [(a.lat * Math.PI) / 180, (a.lon * Math.PI) / 180]
      const ground = R * Math.hypot((C.latitude - la), (C.longitude - lo) * Math.cos(la))
      return Math.hypot(ground, C.height - a.altM)
    }
    const d = far()
    v.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: Math.log(rangeM / d) / 0.0015, deltaMode: 0, bubbles: true, cancelable: true, clientX: v.canvas.clientWidth / 2, clientY: v.canvas.clientHeight / 2 }))
    await new Promise((r) => st(r, 1500))
    return [Math.round(d), Math.round(far())]
  }
})()
