// client/ui/watchList.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import type { WatchState } from '../../shared/api.ts'

// watchList.ts imports its CSS for Vite. Node cannot load CSS, so this test process loads every .css as an empty module.
registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { watchId, watchLine, watchModel, watchToasts } = await import('./watchList.ts')
const { clockText } = await import('../search/flights.ts')

const T = new Date(2026, 10, 17, 10, 31).getTime()
const w = (o: Partial<WatchState> = {}): WatchState => ({
  id: 'EY593', label: 'EY 593', route: 'AUH → TLV', sinceMs: T - 3_600_000, hex: null, callsign: null, heardMs: null, seen: false, file: null, ended: null, ...o,
})
const heard = w({ hex: '89653a', callsign: 'ETD5SM', heardMs: T, seen: true, file: '2026-11-17/061500Z-ETD5SM-89653a.jsonl' })

test('watchId: the server\'s key from the text as typed; null for no flight', () => {
  assert.equal(watchId('ey 593'), 'EY593')
  assert.equal(watchId('ETD5SM'), 'ETD5SM')
  assert.equal(watchId('hello'), null)
})

test('watchLine: waiting, in range, out of range, landed, lost', () => {
  assert.equal(watchLine(w()), 'Waiting to be heard')
  assert.equal(watchLine(heard), 'In range · ETD5SM')
  assert.equal(watchLine({ ...heard, seen: false }), `Out of range · last heard ${clockText(T)}`)
  assert.equal(watchLine({ ...heard, seen: false, ended: 'landed' }), `Landed ${clockText(T)}`)
  assert.equal(watchLine({ ...heard, seen: false, ended: 'lost' }), 'Lost')
})

test('watchToasts: heard, out of range, landed, lost; a new or removed watch says nothing', () => {
  assert.deepEqual(watchToasts([w()], [heard]), [{ title: 'EY 593 is in range', text: 'Heard as ETD5SM · recording.' }])
  assert.deepEqual(watchToasts([heard], [{ ...heard, seen: false }]), [{ title: 'EY 593 out of range', text: `Last heard ${clockText(T)} · still watching.` }])
  assert.equal(watchToasts([heard], [{ ...heard, seen: false, ended: 'landed' }])[0].title, 'EY 593 landed')
  assert.equal(watchToasts([{ ...heard, seen: false }], [{ ...heard, seen: false, ended: 'lost' }])[0].title, 'EY 593 lost')
  assert.deepEqual(watchToasts([], [heard]), [])
  assert.deepEqual(watchToasts([heard], []), [])
  assert.deepEqual(watchToasts([heard], [heard]), [])
})

test('watchModel: no toast for the first answer; then what changed; a toggle applies the list it gets back', async () => {
  const answers: (WatchState[] | null)[] = [[w()], [heard]]
  const toasts: string[] = []
  const sent: string[] = []
  const m = watchModel({
    get: async () => answers.shift() ?? [heard],
    set: async (text, on) => (sent.push(`${text} ${on}`), on ? [heard, w({ id: 'AEE4266', label: 'AEE4266' })] : []),
    notice: (title) => toasts.push(title),
  })
  const tick = (): Promise<void> => new Promise((go) => setTimeout(go, 5))
  await tick()
  assert.deepEqual(m.list, [w()])
  assert.deepEqual(toasts, [])
  m.refresh()
  await tick()
  assert.deepEqual(toasts, ['EY 593 is in range'])
  assert.equal(m.isWatched('ey 593'), true)
  assert.equal(m.isWatched('ETD5SM'), true) // the card of the aircraft it was heard as: the same watch
  assert.equal(m.isWatched('AEE4266'), false)
  await m.toggle('AEE4266', true)
  assert.equal(m.isWatched('AEE4266'), true)
  await m.toggle('ETD5SM', false) // off from that card: the watch it belongs to goes
  assert.deepEqual(sent, ['AEE4266 true', 'EY593 false'])
  assert.deepEqual(m.list, [])
  m.destroy()
})

test('watchModel: a server without a watch list (404) leaves the list null', async () => {
  const m = watchModel({ get: async () => null, set: async () => [], notice: () => {} })
  await new Promise((go) => setTimeout(go, 5))
  assert.equal(m.list, null)
  m.destroy()
})
