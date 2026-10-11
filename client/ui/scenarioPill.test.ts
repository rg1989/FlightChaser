// client/ui/scenarioPill.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// The pill imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { scenarioDay } = await import('./scenarioPill.ts')

test('scenarioDay: the scenario\'s own day at its clock, the day after once the clock passes 24 h, across a month and a year', () => {
  assert.equal(scenarioDay('1985-08-12', 18 * 3600 + 24 * 60), '12 Aug 1985')
  assert.equal(scenarioDay('1985-08-12', 0), '12 Aug 1985')
  assert.equal(scenarioDay('2026-09-30', 86_400 + 5), '1 Oct 2026')
  assert.equal(scenarioDay('2026-12-31', 86_400), '1 Jan 2027')
})
