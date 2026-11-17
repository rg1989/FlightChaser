// server/flightWatch.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RecordingState } from '../shared/api.ts'
import { FlightWatch, type WatchFound } from './flightWatch.ts'
import type { EndReason } from './flightLog.ts'

const MIN = 60_000

function world() {
  const clock = { now: 1_000_000_000 }
  const sky = { live: [] as WatchFound['live'] }
  const recs = new Map<string, RecordingState>()
  const ended = new Map<string, EndReason>()
  const file = join(mkdtempSync(join(tmpdir(), 'watch-')), 'watch.json')
  const deps = {
    nowMs: () => clock.now,
    find: async (text: string): Promise<WatchFound | null> => (/^ey ?593$/i.test(text) ? { id: 'EY593', label: 'EY 593', route: 'AUH → TLV', live: sky.live } : null),
    recording: (hex: string) => recs.get(hex) ?? null,
    record: (hex: string) => {
      if (!recs.has(hex)) recs.set(hex, { hex, callsign: 'ETD5SM', file: `f-${hex}.jsonl`, startedMs: clock.now, samples: 0, lastMs: clock.now })
      return recs.get(hex)!
    },
    endedWhy: (hex: string) => ended.get(hex) ?? null,
  }
  return { clock, sky, recs, ended, file, deps }
}

test('a watched flight out of range is recorded once heard, kept through a gap, and done when it lands', async () => {
  const w = world()
  const watch = new FlightWatch(w.file, w.deps)
  assert.equal(await watch.set('nonsense', true), null)
  const put = await watch.set('ey 593', true)
  assert.ok(Array.isArray(put))
  const first = put[0]
  assert.deepEqual([first.id, first.label, first.hex, first.seen, first.ended], ['EY593', 'EY 593', null, false, null]) // out of range: waiting

  // Heard: recorded from now, on the map.
  w.sky.live = [{ hex: '89653a', callsign: 'ETD5SM' }]
  await watch.tick()
  let s = watch.list()[0]
  assert.deepEqual([s.hex, s.callsign, s.file, s.seen], ['89653a', 'ETD5SM', 'f-89653a.jsonl', true])

  // Silent for 40 min (its recording goes on): lost from the map, still watched.
  w.sky.live = []
  w.clock.now += 40 * MIN
  await watch.tick()
  s = watch.list()[0]
  assert.deepEqual([s.seen, s.ended, s.heardMs], [false, null, w.clock.now - 40 * MIN])

  // Landed: the recording ends; the watch says so for an hour, then goes. Kept in its file meanwhile.
  w.recs.delete('89653a')
  w.ended.set('89653a', 'landed')
  await watch.tick()
  assert.equal(watch.list()[0].ended, 'landed')
  assert.equal(new FlightWatch(w.file, w.deps).list()[0].ended, 'landed') // a restarted server reads it back
  w.clock.now += 61 * MIN
  await watch.tick()
  assert.deepEqual(watch.list(), [])
  assert.deepEqual(JSON.parse(readFileSync(w.file, 'utf8')), [])
})

test('a watch taken off goes at once; one never heard goes after a day', async () => {
  const w = world()
  const watch = new FlightWatch(w.file, w.deps)
  await watch.set('EY593', true)
  await watch.set('EY 593', true) // the same flight: once
  assert.equal(watch.size, 1)
  assert.deepEqual(await watch.set('EY593', false), [])
  await watch.set('EY593', true)
  w.clock.now += 24 * 60 * MIN
  await watch.tick()
  assert.equal(watch.size, 0)
})
