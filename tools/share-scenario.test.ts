// tools/share-scenario.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileFor, rangeOf } from './share-scenario.ts'

test('fileFor: files under the root only; never the API or a way out', () => {
  assert.equal(fileFor('/r', '/'), '/r/index.html')
  assert.equal(fileFor('/r', '/scenarios/a/track.csv'), '/r/scenarios/a/track.csv')
  for (const bad of ['/api', '/api/recordings', '/../secret', '/%2e%2e/secret', '/a/../../secret', '/%00', '/%']) assert.equal(fileFor('/r', bad), null, bad)
})

test('rangeOf: the byte ranges a media element asks for; anything else is the whole file', () => {
  assert.deepEqual(rangeOf('bytes=0-', 100), [0, 99])
  assert.deepEqual(rangeOf('bytes=10-19', 100), [10, 19])
  assert.deepEqual(rangeOf('bytes=-5', 100), [95, 99])
  assert.deepEqual(rangeOf('bytes=90-500', 100), [90, 99])
  for (const none of [undefined, 'bytes=-', 'bytes=200-', 'items=0-1']) assert.equal(rangeOf(none, 100), null, String(none))
})
