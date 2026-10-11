// client/history/flightBar.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// The bar and the pill import their CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { endLabel } = await import('./flightBar.ts')
const { pillText } = await import('../ui/timePill.ts')

// Local times, built in the test's own zone: the texts hold wherever the tests run.
const at = (y: number, d: number, h: number, min: number, s = 0): number => new Date(y, 9, d, h, min, s).getTime()

test('a flight\'s replay in words: the rail\'s ends say the day and the minute; the pill the weekday, the day and the second, the year when it is another', () => {
  assert.equal(endLabel(at(2026, 10, 6, 11, 43)), '10 Oct 06:11')
  assert.equal(endLabel(at(2026, 3, 23, 5)), '3 Oct 23:05')
  assert.equal(pillText(at(2026, 10, 6, 41, 17), at(2026, 11, 15, 0)), 'Sat 10 Oct · 06:41:17')
  assert.equal(pillText(at(2025, 10, 6, 41, 17), at(2026, 11, 15, 0)), 'Fri 10 Oct 2025 · 06:41:17')
})
