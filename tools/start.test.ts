// tools/start.test.ts
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildDue, newestMs, nodeOk, openCommand, serverEnv, startArgs } from './start.ts'

test('Node 24.2 and newer run the app; older ones and nonsense do not', () => {
  assert.equal(nodeOk('24.2.0'), true)
  assert.equal(nodeOk('v24.14.0'), true)
  assert.equal(nodeOk('25.0.0'), true)
  assert.equal(nodeOk('24.1.9'), false)
  assert.equal(nodeOk('22.20.0'), false)
  assert.equal(nodeOk(''), false)
})

test('the options: live on port 8787 and the browser opened unless told otherwise', () => {
  assert.deepEqual(startArgs([]), { port: 8787, open: true, build: false })
  assert.deepEqual(startArgs(['--port', '9000', '--no-open', '--build']), { port: 9000, open: false, build: true })
  assert.throws(() => startArgs(['--port', 'x']), /--port must be 1 to 65535/)
  assert.throws(() => startArgs(['--port', '0']), /--port/)
  assert.throws(() => startArgs(['--nope']))
})

test('the server: adsb.fi under its limit whatever the environment says, flights and alerts into data/ unless it names a folder', () => {
  const live = serverEnv(startArgs([]), { MAX_RPS: '5', ADSB_SOURCE: 'adsblol' })
  assert.deepEqual(live, { PORT: '8787', RECORD_DIR: '', ADSB_SOURCE: 'adsbfi,adsblol', MAX_RPS: '0.9', FLIGHTS_DIR: 'data/flights', EVENTS_DIR: 'data/events' })
  assert.equal(serverEnv(startArgs([]), { FLIGHTS_DIR: 'mine', EVENTS_DIR: '' }).FLIGHTS_DIR, 'mine')
  assert.equal(serverEnv(startArgs([]), { FLIGHTS_DIR: 'mine', EVENTS_DIR: '' }).EVENTS_DIR, 'data/events')
})

test('the port asked for is the server\'s', () => {
  assert.equal(serverEnv(startArgs(['--port', '8790']), {}).PORT, '8790')
})

test('the browser is opened with the system\'s own command', () => {
  assert.deepEqual(openCommand('darwin', 'http://localhost:8787/'), ['open', ['http://localhost:8787/']])
  assert.deepEqual(openCommand('linux', 'http://localhost:8787/'), ['xdg-open', ['http://localhost:8787/']])
  assert.deepEqual(openCommand('win32', 'http://localhost:8787/'), ['cmd', ['/c', 'start', '', 'http://localhost:8787/']])
})

test('a build is due when there is none, and when a source is newer than it', () => {
  const root = mkdtempSync(join(tmpdir(), 'fc-start-'))
  try {
    mkdirSync(join(root, 'client', 'ui'), { recursive: true })
    writeFileSync(join(root, 'client', 'ui', 'a.ts'), '')
    assert.equal(buildDue(root), true) // no dist/index.html
    mkdirSync(join(root, 'dist'))
    writeFileSync(join(root, 'dist', 'index.html'), '')
    const at = (path: string, s: number): void => utimesSync(join(root, path), s, s)
    at('client/ui/a.ts', 1000)
    at('dist/index.html', 2000)
    assert.equal(buildDue(root), false)
    assert.equal(newestMs([join(root, 'client'), join(root, 'missing')]), 1_000_000)
    at('client/ui/a.ts', 3000)
    assert.equal(buildDue(root), true)
    at('client/ui/a.ts', 1000)
    writeFileSync(join(root, '.env.local'), 'VITE_ARCGIS_KEY=x\n') // a key added after the build: it is built in again
    assert.equal(buildDue(root), true)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
