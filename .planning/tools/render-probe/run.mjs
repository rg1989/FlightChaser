// node run.mjs <cdpPort> <url> <outPrefix> <mode: static|fly> [preset JS run in the page once the viewer exists]
// static: settle, then each experiment in EXPS (env, JSON [[name, js], …]) → sample + shot. fly: sample in 10 s windows for FLY_S seconds.
import { readFileSync, writeFileSync } from 'node:fs'
const [port, url, out, mode, preset = ''] = process.argv.slice(2)
const W = +(process.env.W ?? 1470), H = +(process.env.H ?? 833)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 120; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.some((t) => t.type === 'page')) break } catch {} await sleep(500) }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const waits = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id !== undefined) return void waits.get(m.id)?.(m); if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.exception?.description?.slice(0, 300)) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waits.set(i, (m) => { waits.delete(i); res(m.result ?? { error: m.error }) }); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.exceptionDetails ? `THROWN ${r.exceptionDetails.exception?.description}` : r.result?.value }
const shot = async (f) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }); if (r.data) writeFileSync(f, Buffer.from(r.data, 'base64')) }
for (const d of ['Runtime', 'Page']) await send(`${d}.enable`)
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
const prefs = process.env.PREFS ?? '{"topo":true,"light":true,"buildings":true,"glass":false,"textures":true,"mapTop":true,"mapChase":false,"dark":false,"roads":true,"places":true,"wx":true}'
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('fh.setup.v1', '1'); localStorage.setItem('fh.scene.v1', ${JSON.stringify(prefs)}) } catch {}` })
await send('Page.navigate', { url })
let up = false
for (let i = 0; i < 240 && !(up = (await ev('!!(window.viewer && window.viewer.scene)')) === true); i++) await sleep(250)
if (!up) { console.log('NO VIEWER: page never made one (no WebGL context?)'); process.exit(2) }
if (preset) console.log('preset', await ev(preset))
console.log('probe', await ev(readFileSync(new URL('./probe.js', import.meta.url), 'utf8')))
const settle = async (minS, maxS) => {
  const t0 = Date.now()
  await sleep(minS * 1000)
  while (Date.now() - t0 < maxS * 1000 && (await ev('window.viewer.scene.globe.tilesLoaded')) !== true) await sleep(500)
  await sleep(2500)
  return ((Date.now() - t0) / 1000).toFixed(1)
}
const results = []
if (mode === 'static') {
  console.log('settled after', await settle(+(process.env.SETTLE ?? 30), +(process.env.SETTLE_MAX ?? 90)), 's')
  await ev('__probe.since()')
  const exps = JSON.parse(process.env.EXPS ?? '[["base",""]]')
  for (const [name, js] of exps) {
    if (js) console.log(name, 'apply', await ev(js))
    const settledS = js ? await settle(+(process.env.EXP_MIN ?? 3), +(process.env.EXP_MAX ?? 45)) : 0
    const r = await ev('Promise.race([__probe.sample(90), new Promise((res) => setTimeout(() => res({ timedOut: true, total: {}, by: {}, globe: {} }), 60000))])')
    r.name = name; r.settledS = settledS; r.net = await ev('__probe.since()')
    results.push(r)
    console.log(name, JSON.stringify({ gpu: r.gpuMs, gpuP95: r.gpuP95, cpu: r.cpuMs, total: r.total, tiles: r.globe?.tiles, levels: r.globe?.levels, by: r.by, net: r.net }))
    await shot(`${out}-${name}.jpg`)
  }
} else {
  await sleep(+(process.env.SETTLE ?? 20) * 1000)
  await ev('__probe.since()')
  const profiling = process.env.PROFILE !== '0'
  if (profiling) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 500 }); await send('Profiler.start') }
  const n = Math.round(+(process.env.FLY_S ?? 60) / 10)
  for (let i = 0; i < n; i++) {
    const t0 = Date.now()
    const r = await ev('__probe.sample(300)') // ~5 s at 60 fps
    await sleep(Math.max(0, 10000 - (Date.now() - t0)))
    r.name = `w${i}`; r.net = await ev('__probe.since()'); r.wallS = (Date.now() - t0) / 1000
    results.push(r)
    console.log(r.name, JSON.stringify({ frames: r.frames, gpu: r.gpuMs, gpuP95: r.gpuP95, cpu: r.cpuMs, cpuP95: r.cpuP95, total: r.total, tiles: r.globe?.tiles, net: Object.fromEntries(Object.entries(r.net.hosts).map(([h, x]) => [h.slice(0, 22), x.n])), long: [r.net.longTasks, r.net.longMs, r.net.longMax], gaps: [r.net.frames, r.net.over34, r.net.over50, r.net.over100, r.net.gapMax] }))
    if (i === 0 || i === n - 1) await shot(`${out}-${r.name}.jpg`)
  }
  if (!profiling) { writeFileSync(`${out}.json`, JSON.stringify(results, null, 1)); ws.close(); process.exit(0) }
  const { profile } = await send('Profiler.stop')
  writeFileSync(`${out}.cpuprofile`, JSON.stringify(profile))
  // where the main thread goes: self time by our module (the deepest frame under /client/ on each sampled stack, else the top library frame),
  // overall and inside tasks longer than 50 ms
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const parent = new Map()
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id)
  const label = (id) => {
    let lib = null
    for (let x = id; x !== undefined; x = parent.get(x)) {
      const f = byId.get(x).callFrame
      const u = f.url.replace(/^.*?\/(client|node_modules\/\.vite\/deps|node_modules|@fs)\//, '$1/').replace(/\?.*$/, '')
      if (u.startsWith('client/')) return `${u}:${f.functionName || '(anon)'}`
      if (lib === null && f.url) lib = `${u.replace(/^.*\//, '')}:${f.functionName || '(anon)'}`
    }
    return byId.get(id).callFrame.functionName || lib || '?'
  }
  const own = (id) => { const f = byId.get(id).callFrame; return `${f.url.replace(/^.*\//, '').replace(/\?.*$/, '')}:${f.functionName || '(anon)'}` }
  const idle = (id) => ['(idle)', '(program)', '(garbage collector)'].includes(byId.get(id).callFrame.functionName)
  let t = profile.startTime
  const ts = profile.timeDeltas.map((d) => (t += d))
  const all = {}, inLong = {}, ownAll = {}
  let runStart = 0, run = []
  const flush = () => { if (run.length && (ts[run.at(-1)] - ts[run[0]]) / 1000 > 50) for (const i of run) { const k = label(profile.samples[i]); inLong[k] = (inLong[k] ?? 0) + 0.5 } run = [] }
  for (let i = 0; i < profile.samples.length; i++) {
    const s = profile.samples[i]
    if (idle(s)) { if (byId.get(s).callFrame.functionName === '(garbage collector)') { all['(gc)'] = (all['(gc)'] ?? 0) + 0.5; run.push(i) } else flush(); continue }
    const k = label(s); all[k] = (all[k] ?? 0) + 0.5
    const o = own(s); ownAll[o] = (ownAll[o] ?? 0) + 0.5
    if (run.length && ts[i] - ts[run.at(-1)] > 3000) flush()
    run.push(i)
  }
  flush()
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(0).padStart(6)} ms  ${k}`).join('\n')
  const span = (ts.at(-1) - ts[0]) / 1e6
  console.log(`--- main thread by our module, ${span.toFixed(0)} s profiled ---\n` + top(all, 25))
  console.log(`--- inside tasks > 50 ms ---\n` + top(inLong, 25))
  console.log(`--- by own function ---\n` + top(ownAll, 20))
}
writeFileSync(`${out}.json`, JSON.stringify(results, null, 1))
ws.close()
