// client/scene/canvasSize.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keepCanvasSize } from './canvasSize.ts'

/** An element whose layout size is `layout` (each read of it counted: a layout in a browser), and an observer the test fires. */
function setup() {
  const layout = { w: 1470, h: 833, reads: 0 }
  class FakeElement {}
  Object.defineProperty(FakeElement.prototype, 'clientWidth', { configurable: true, get() { layout.reads++; return layout.w } })
  Object.defineProperty(FakeElement.prototype, 'clientHeight', { configurable: true, get() { layout.reads++; return layout.h } })
  const observers: { cb: () => void; on: boolean }[] = []
  class FakeObserver {
    #o: { cb: () => void; on: boolean }
    constructor(cb: () => void) { this.#o = { cb, on: false }; observers.push(this.#o) }
    observe() { this.#o.on = true }
    disconnect() { this.#o.on = false }
  }
  const g = globalThis as Record<string, unknown>
  const saved = [g.Element, g.ResizeObserver]
  g.Element = FakeElement
  g.ResizeObserver = FakeObserver
  const el = new FakeElement() as unknown as HTMLElement
  return { layout, el, fire: () => observers.filter((o) => o.on).forEach((o) => o.cb()), restore: () => ([g.Element, g.ResizeObserver] = saved) }
}

test('keepCanvasSize: reads of the canvas size give the size the last layout left, without a layout of their own; a resize is taken when the observer reports it; the undo gives the canvas its own size again', () => {
  const { layout, el, fire, restore } = setup()
  try {
    const undo = keepCanvasSize(el)
    const before = layout.reads
    for (let k = 0; k < 100; k++) assert.deepEqual([el.clientWidth, el.clientHeight], [1470, 833])
    assert.equal(layout.reads, before, 'a hundred reads, no layout')
    layout.w = 2560
    layout.h = 1440
    assert.equal(el.clientWidth, 1470, 'until the observer reports, the laid-out size')
    fire()
    assert.deepEqual([el.clientWidth, el.clientHeight], [2560, 1440])
    undo()
    layout.w = 800
    assert.equal(el.clientWidth, 800, 'undone: the element\'s own')
    fire()
    assert.equal(el.clientWidth, 800)
  } finally {
    restore()
  }
})

test('keepCanvasSize: without a ResizeObserver nothing changes', () => {
  const { layout, el, restore } = setup()
  const g = globalThis as Record<string, unknown>
  const ro = g.ResizeObserver
  g.ResizeObserver = undefined
  try {
    keepCanvasSize(el)
    layout.w = 999
    assert.equal(el.clientWidth, 999)
  } finally {
    g.ResizeObserver = ro
    restore()
  }
})
