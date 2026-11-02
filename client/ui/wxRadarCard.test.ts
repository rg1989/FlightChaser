// client/ui/wxRadarCard.test.ts
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

// wxRadarCard.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { echoColor, latOfRow, mercator, zoomFor } = await import('./wxRadarCard.ts')

test('echoColor: nothing under 15 dBZ, then green to yellow to red to magenta as the rain grows', () => {
  assert.equal(echoColor(14), null)
  assert.deepEqual(echoColor(25), [46, 178, 76])
  assert.deepEqual(echoColor(37), [250, 226, 58])
  assert.deepEqual(echoColor(52), [224, 36, 36])
  assert.deepEqual(echoColor(63), [214, 60, 214])
})

test('mercator and latOfRow are each other\'s inverse', () => {
  const [, y] = mercator(26.7, -80.2, 8)
  assert.ok(Math.abs(latOfRow(y, 8) - 26.7) < 1e-9)
})

test('zoomFor: a wider range takes a lower zoom; the scale stays within 1 to 2', () => {
  const near = zoomFor(25, 26.7)
  const far = zoomFor(100, 26.7)
  assert.equal(near.z - far.z, 2)
  for (const v of [near, far]) assert.ok(v.scale >= 1 && v.scale < 2)
})
