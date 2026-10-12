// A small CDP driver on Node's own WebSocket: node driver.mjs <port> "<step>" …
// steps: size W H DPR | go URL | wait S | eval JS | until JS | click CSS | clickxy X Y | shot FILE [x y w h] | log
import { readFileSync, writeFileSync } from 'node:fs'
const [port, ...steps] = process.argv.slice(2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 90; i++) {
  try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.some((t) => t.type === 'page')) break } catch {}
  await sleep(500)
}
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const waits = new Map()
const notes = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id !== undefined) return void waits.get(m.id)?.(m)
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    notes.push(`EXCEPTION ${d.exception?.description ?? d.text}\n      ${(d.stackTrace?.callFrames ?? []).slice(0, 14).map((f) => `${f.functionName || '(anon)'} ${f.url.replace(/^.*\/(client|node_modules)\//, '$1/').replace(/\?.*$/, '')}:${f.lineNumber + 1}`).join('\n      ')}`.slice(0, 2500))
    if (d.exception?.objectId) send('Runtime.callFunctionOn', { objectId: d.exception.objectId, functionDeclaration: 'function () { return String(this.message) }', returnByValue: true }).then((r) => console.log(`  [exception message] ${r.result?.value}`))
  }
  else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) notes.push(`console.${m.params.type} ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 700))
  else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') notes.push(`log ${m.params.entry.text} ${m.params.entry.url ?? ''}`.slice(0, 400))
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waits.set(i, (m) => { waits.delete(i); res(m.result ?? { error: m.error }) }); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return r.exceptionDetails ? `THROWN ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}` : r.result?.value
}
for (const d of ['Runtime', 'Page', 'Log']) await send(`${d}.enable`)
await send('Emulation.setFocusEmulationEnabled', { enabled: true })
const flush = (tag) => { for (const n of notes.splice(0)) console.log(`  [${tag}] ${n}`) }
for (const step of steps) {
  const [cmd, ...rest] = step.split(' ')
  const arg = rest.join(' ')
  const t0 = Date.now()
  if (cmd === 'size') { const [w, h, dpr] = rest.map(Number); await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr || 1, mobile: false }) }
  else if (cmd === 'go') await send('Page.navigate', { url: arg })
  else if (cmd === 'wait') await sleep(Number(arg) * 1000)
  else if (cmd === 'eval') console.log(`eval> ${JSON.stringify(await evalJs(arg))}`)
  else if (cmd === 'evalfile') console.log(`evalfile> ${JSON.stringify(await evalJs(readFileSync(arg, 'utf8')), null, 1)}`)
  else if (cmd === 'until') { let ok = false; for (let i = 0; i < 100 && !(ok = (await evalJs(arg)) === true); i++) await sleep(250); console.log(`until ${ok ? 'ok' : 'TIMED OUT'} after ${Date.now() - t0} ms: ${arg.slice(0, 90)}`) }
  else if (cmd === 'click') {
    const p = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(arg)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
    if (!Array.isArray(p)) console.log(`click: NOT FOUND ${arg}`)
    else for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p[0], y: p[1], button: 'left', clickCount: 1 })
  }
  else if (cmd === 'shot') {
    const [file, x, y, w, h] = rest
    const clip = w ? { clip: { x: +x, y: +y, width: +w, height: +h, scale: 1 } } : {}
    const r = await send('Page.captureScreenshot', { format: 'png', ...clip })
    if (r.data) writeFileSync(file, Buffer.from(r.data, 'base64')); else console.log(`shot failed ${JSON.stringify(r).slice(0, 200)}`)
  }
  else if (cmd === 'log') flush('log')
  else console.log(`unknown step ${step}`)
  flush(cmd)
}
ws.close()
