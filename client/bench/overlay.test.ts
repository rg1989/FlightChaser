// client/bench/overlay.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Viewer } from 'cesium'
import { BenchRecorder, countTextures, overlayText, summarizeFrames } from './overlay.ts'
import type { BenchReport } from './overlay.ts'
import type { RenderState } from '../types.ts'

const near = (a: number, b: number, tol: number, msg = ''): void => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b} (tol ${tol}) ${msg}`)
const noViewer = {} as Viewer

test('summarizeFrames: steady 60 Hz', () => {
  const s = summarizeFrames(Array.from({ length: 600 }, () => 1000 / 60))
  near(s.fpsP50, 60, 1e-9)
  near(s.fpsP5, 60, 1e-9)
  near(s.frameMsP95, 1000 / 60, 1e-9)
})

test('summarizeFrames: p50 fps = 1000 / median ms, p5 fps = 1000 / p95 ms, input untouched', () => {
  const ms = [...Array.from({ length: 10 }, () => 40), ...Array.from({ length: 90 }, () => 16)]
  const s = summarizeFrames(ms)
  near(s.fpsP50, 62.5, 1e-9)
  near(s.frameMsP95, 40, 1e-9, 'rank 0.95·99 = 94.05 sits inside the ten 40 ms frames')
  near(s.fpsP5, 25, 1e-9)
  assert.equal(ms[0], 40)
  const mixed = summarizeFrames([10, 20, 30, 40])
  near(mixed.fpsP50, 1000 / 25, 1e-9, 'median interpolates linearly: 25 ms')
  near(mixed.frameMsP95, 38.5, 1e-9)
})

test('summarizeFrames: no frames → NaN (JSON null), not a passing number', () => {
  const s = summarizeFrames([])
  assert.ok(Number.isNaN(s.fpsP50) && Number.isNaN(s.fpsP5) && Number.isNaN(s.frameMsP95))
})

test('BenchRecorder in node: counts frames and clearance; browser-only numbers are unknown', () => {
  const b = new BenchRecorder(noViewer)
  for (const c of [100, 20, 14, null, 3]) b.frame(null, c)
  const r: BenchReport = b.report()
  assert.equal(r.label, 'bench')
  assert.equal(r.frames, 5)
  assert.equal(r.minClearanceM, 3)
  assert.equal(r.clearanceViolations, 2, 'below the default 15 m: 14 and 3')
  assert.equal(r.heapMB, null, 'performance.memory is Chromium-only')
  assert.ok(Number.isNaN(r.longTasks) && Number.isNaN(r.longTaskMsMax), 'no Long Tasks API in node → unknown, not 0')
  assert.ok(r.frameMsP95 >= 0)
  assert.deepEqual(JSON.parse(JSON.stringify(r)).longTasks, null)
  b.destroy()
})

test('BenchRecorder: label and clearance threshold are options; no clearance seen → null', () => {
  const b = new BenchRecorder(noViewer, { label: 'ksfo-28l', minClearanceM: 25 })
  for (const c of [100, 20, 14, 3]) b.frame(null, c)
  assert.equal(b.report().label, 'ksfo-28l')
  assert.equal(b.report().clearanceViolations, 3)
  const none = new BenchRecorder(noViewer)
  none.frame(null, null)
  none.frame(null, null)
  assert.equal(none.report().minClearanceM, null)
  assert.equal(none.report().clearanceViolations, 0)
})

test('BenchRecorder.work: the weather\'s main-thread time in a frame: the longest, and how many frames it took more than 8 ms', () => {
  const b = new BenchRecorder(noViewer)
  assert.deepEqual([b.report().wxMsMax, b.report().wxOver], [0, 0], 'none told: none')
  for (const ms of [0.4, 8, 66.5, 2, 8.01]) b.work(ms)
  assert.equal(b.report().wxMsMax, 66.5)
  assert.equal(b.report().wxOver, 2, '66.5 and 8.01; 8 itself is not over')
  assert.equal(b.recent().wxOver, 2, 'counted over the whole run, as the long tasks are')
  b.destroy()
})

test('BenchRecorder.download needs a DOM', () => {
  assert.throws(() => new BenchRecorder(noViewer).download(), /DOM/)
})

test('overlayText: one line per fact; unknowns print n/a', () => {
  const r: BenchReport = {
    label: 'ksfo', frames: 1234, fpsP50: 59.94, fpsP5: 31.2, frameMsP95: 32.06, longTasks: NaN, longTaskMsMax: NaN,
    wxMsMax: 0, wxOver: 0, minClearanceM: null, clearanceViolations: 0, heapMB: null,
  }
  const state = { hex: '71bd79', mode: 'interp', altBaroFt: 3000, onGround: false } as RenderState
  assert.equal(
    overlayText(r, state, { width: 1920, height: 1080 }),
    [
      'bench ksfo · 1234 frames · 1920×1080 px',
      'fps p50 59.9 · p5 31.2 · frame p95 32.1 ms',
      'long tasks n/a · max n/a ms',
      'weather max 0.0 ms · over 8 ms 0',
      'clearance min n/a m · violations 0',
      'heap n/a MB',
      '71bd79 interp 3000 ft',
    ].join('\n'),
  )
  const full = overlayText({ ...r, longTasks: 2, longTaskMsMax: 87.4, wxMsMax: 65.26, wxOver: 3, minClearanceM: 212.46, clearanceViolations: 1, heapMB: 301.7 }, null)
  assert.match(full, /^bench ksfo · 1234 frames$/m)
  assert.match(full, /long tasks 2 · max 87 ms/)
  assert.match(full, /weather max 65.3 ms · over 8 ms 3/)
  assert.match(full, /clearance min 212 m · violations 1/)
  assert.match(full, /heap 302 MB/)
  assert.match(full, /no aircraft$/)
  assert.match(overlayText(r, { ...state, onGround: true, altBaroFt: null }), /71bd79 interp ground$/)
})

test('overlayText: with the chase\'s clouds given, one line more says how they are drawn: the march\'s tier, its size in pixels, and the pass\'s time on the graphics card (the march\'s and the mix\'s in brackets when the timer says; "no timer" when there is none); the textures alive stand with the heap', () => {
  const r: BenchReport = {
    label: 'a831b2', frames: 99, fpsP50: 30, fpsP5: 20, frameMsP95: 50, longTasks: 0, longTaskMsMax: 0, wxMsMax: 1, wxOver: 0, minClearanceM: null, clearanceViolations: 0, heapMB: 250,
  }
  const line = (clouds: Parameters<typeof overlayText>[3], textures?: number): string[] => overlayText(r, null, { width: 2000, height: 1030 }, clouds, textures).split('\n')
  const timed = line({ tier: 7, passMs: 2.43, parts: [1.61, 0.82], march: [400, 206], drawn: true }, 2249)
  assert.equal(timed.length, 8)
  assert.equal(timed[4], 'clouds tier 7 · march 400×206 px · pass 2.4 ms (1.6 + 0.8)', 'short: the search box covers the overlay\'s right end')
  assert.equal(timed[3], 'weather max 1.0 ms · over 8 ms 0', 'after the weather\'s own line')
  assert.equal(timed[6], 'heap 250 MB · textures 2249', 'the textures alive stand with the heap')
  assert.equal(line({ tier: 7, passMs: 2.43, parts: [], march: [400, 206], drawn: true }, 2249)[4], 'clouds tier 7 · march 400×206 px · pass 2.4 ms')
  assert.equal(line({ tier: 7, passMs: Number.NaN, parts: [], march: [400, 206], drawn: true }, 2249)[4], 'clouds tier 7 · march 400×206 px · pass: no timer')
  assert.equal(line({ tier: 3, passMs: 2.43, parts: [1.61, 0.82], march: [1000, 515], drawn: false })[4], 'clouds tier 3 · march 1000×515 px · no pass', 'nothing to draw: no pass in the scene')
  assert.deepEqual([line(null, 812)[4], line(null, 812)[6]], ['clouds off', 'heap 250 MB · textures 812'], 'the chase\'s weather is not shown')
  assert.equal(line(null, Number.NaN)[6], 'heap 250 MB · textures n/a', 'not counted')
  assert.deepEqual([line(undefined).length, line(undefined)[5]], [7, 'heap 250 MB'], 'not given: no such line, and no textures')
})

test('countTextures: the WebGL textures alive, counted from when it is called: each one made is one more, each deleted one less, once; asked again, the same count goes on; with no WebGL to count in, not a number', () => {
  const proto = { made: 0, createTexture(): object { this.made++; return {} }, deleteTexture(_t: object | null): void {} }
  const alive = countTextures([proto])
  const gl = Object.create(proto) as typeof proto
  const [, b] = [gl.createTexture(), gl.createTexture(), gl.createTexture()]
  assert.equal(alive(), 3)
  gl.deleteTexture(b)
  gl.deleteTexture(b)
  gl.deleteTexture(null)
  assert.equal(alive(), 2)
  const again = countTextures([proto])
  gl.createTexture()
  assert.deepEqual([alive(), again(), gl.made], [3, 3, 4], 'wrapped once: one more is one more')
  assert.ok(Number.isNaN(countTextures([])()))
})
