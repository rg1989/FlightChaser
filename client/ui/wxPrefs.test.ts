// client/ui/wxPrefs.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VEIL } from '../scene/cloudShaders.ts'
import { DEFAULT_WX_PREFS, WX_PREFS_KEY, WX_URL_KEYS, dropWxAids, readWxPrefs, savedAfter, writeWxPrefs, type WxPrefs } from './wxPrefs.ts'

const DEFAULTS: WxPrefs = { look: 'severity', opacity: VEIL, hazard: 'curtain', track: true, slice: false, strip: true, view: 'path' }

test('nothing stored, nothing in the URL: severity colours, curtains, the track line and the strip on, the slice off; the key is fh.wx3d.v1', () => {
  assert.equal(WX_PREFS_KEY, 'fh.wx3d.v1')
  assert.deepEqual(DEFAULT_WX_PREFS, DEFAULTS)
  assert.deepEqual(readWxPrefs('', null), DEFAULTS)
  assert.deepEqual(readWxPrefs('?hex=4691c4&chase=1&wx=1', null), DEFAULTS) // other parameters are not ours
  const a = readWxPrefs('', null)
  a.look = 'sculpted' // the caller owns what it gets back
  assert.deepEqual(readWxPrefs('', null), DEFAULTS)
  assert.throws(() => (DEFAULT_WX_PREFS.track = false), TypeError) // shared: frozen
})

test('the stored JSON wins over the defaults, field by field', () => {
  assert.deepEqual(readWxPrefs('', '{"look":"sculpted","hazard":"fence","track":false,"slice":true,"strip":false}'), {
    look: 'sculpted', opacity: VEIL, hazard: 'fence', track: false, slice: true, strip: false, view: 'path',
  })
  assert.deepEqual(readWxPrefs('', '{"look":"natural"}'), { ...DEFAULTS, look: 'natural' })
  assert.deepEqual(readWxPrefs('', '{"hazard":"box","slice":true}'), { ...DEFAULTS, hazard: 'box', slice: true })
})

test('the URL aids (?wxlook, ?wxhaz, ?wxtrack, ?wxslice, ?wxstrip) win over the stored JSON, with or without the leading ?', () => {
  const stored = '{"look":"sculpted","hazard":"fence","track":false,"slice":false,"strip":false}'
  assert.deepEqual(readWxPrefs('?wxlook=natural', stored), { look: 'natural', opacity: VEIL, hazard: 'fence', track: false, slice: false, strip: false, view: 'path' })
  assert.deepEqual(readWxPrefs('?wxhaz=box', stored), { look: 'sculpted', opacity: VEIL, hazard: 'box', track: false, slice: false, strip: false, view: 'path' })
  assert.deepEqual(readWxPrefs('?wxtrack=1', stored), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: true, slice: false, strip: false, view: 'path' })
  assert.deepEqual(readWxPrefs('?wxslice=1', stored), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: false, slice: true, strip: false, view: 'path' })
  assert.deepEqual(readWxPrefs('?wxstrip=1', stored), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: false, slice: false, strip: true, view: 'path' })
  assert.deepEqual(readWxPrefs('wxlook=severity&wxhaz=curtain&wxtrack=1&wxslice=1&wxstrip=1', stored), { look: 'severity', opacity: VEIL, hazard: 'curtain', track: true, slice: true, strip: true, view: 'path' })
  assert.deepEqual(readWxPrefs('?wxtrack=0&wxstrip=0', null), { ...DEFAULTS, track: false, strip: false, view: 'path' }) // and over the defaults
  assert.deepEqual(readWxPrefs('?hex=a831b2&wxlook=natural&wx=1', null), { ...DEFAULTS, look: 'natural' })
  assert.deepEqual(readWxPrefs('?wxlook=natural&wxlook=sculpted', null), { ...DEFAULTS, look: 'natural' }) // the first one counts, as URLSearchParams.get
})

test('a URL value that is not one of the choices is ignored: the stored value or the default stands', () => {
  const stored = '{"look":"sculpted","hazard":"fence","track":false,"slice":true}'
  for (const v of ['', 'fog', 'NATURAL', ' natural', 'natural ', 'true', '0', '1']) {
    assert.equal(readWxPrefs(`?wxlook=${v}`, stored).look, 'sculpted', `?wxlook=${v}`)
    assert.equal(readWxPrefs(`?wxlook=${v}`, null).look, 'severity', `?wxlook=${v}`)
  }
  for (const v of ['', 'wall', 'BOX', 'curtains', '1']) {
    assert.equal(readWxPrefs(`?wxhaz=${v}`, stored).hazard, 'fence', `?wxhaz=${v}`)
    assert.equal(readWxPrefs(`?wxhaz=${v}`, null).hazard, 'curtain', `?wxhaz=${v}`)
  }
  for (const v of ['', 'true', 'false', 'on', 'off', '2', ' 1', '01']) {
    const q = `?wxtrack=${v}&wxslice=${v}&wxstrip=${v}`
    assert.deepEqual(readWxPrefs(q, stored), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: false, slice: true, strip: true, view: 'path' }, q)
    assert.deepEqual(readWxPrefs(q, null), DEFAULTS, q)
  }
  assert.deepEqual(readWxPrefs('?WXLOOK=natural&WxHaz=box', null), DEFAULTS) // names are case-sensitive
})

test('corrupt, partial or mistyped stored JSON falls back per field and never throws', () => {
  for (const bad of ['', 'not json', '{"look":', 'null', '42', '"look"', 'true', '[1,2]', '{}']) {
    assert.deepEqual(readWxPrefs('', bad), DEFAULTS, bad)
  }
  // Only a real choice or a real boolean counts.
  assert.deepEqual(readWxPrefs('', '{"look":3,"hazard":null,"track":"yes","slice":1,"strip":0}'), DEFAULTS)
  assert.deepEqual(readWxPrefs('', '{"look":"fog","hazard":"wall","track":false}'), { ...DEFAULTS, track: false })
  assert.deepEqual(readWxPrefs('', '{"look":"sculpted","extra":true}'), { ...DEFAULTS, look: 'sculpted' })
  assert.deepEqual(readWxPrefs('?wxlook=natural', 'not json'), { ...DEFAULTS, look: 'natural' }) // the URL still applies over a corrupt value
  assert.doesNotThrow(() => readWxPrefs('?%E0%A4%A', '{"look":'))
})

test('writeWxPrefs stores the six fields as JSON under fh.wx3d.v1, and readWxPrefs reads them back', () => {
  const store = new Map<string, string>()
  const storage = { setItem: (k: string, v: string): void => void store.set(k, v) }
  const p: WxPrefs = { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: false, slice: true, strip: false, view: 'path' }
  writeWxPrefs({ ...p, extra: 1 } as WxPrefs, storage)
  assert.deepEqual([...store.keys()], [WX_PREFS_KEY])
  assert.deepEqual(JSON.parse(store.get(WX_PREFS_KEY) ?? ''), p)
  for (const look of ['natural', 'severity', 'sculpted'] as const) {
    for (const hazard of ['curtain', 'fence', 'box'] as const) {
      for (const track of [false, true]) {
        const q: WxPrefs = { look, opacity: track ? 0 : 0.4, hazard, track, slice: !track, strip: track, view: track ? 'sky' : 'path' }
        writeWxPrefs(q, storage)
        assert.deepEqual(readWxPrefs('', store.get(WX_PREFS_KEY) ?? null), q)
      }
    }
  }
})

test('writeWxPrefs never throws: no storage, private mode, a full quota', () => {
  assert.doesNotThrow(() => writeWxPrefs(DEFAULTS, null))
  let calls = 0
  const failing = (name: string) => ({
    setItem: (): void => {
      calls++
      throw new DOMException('refused', name)
    },
  })
  assert.doesNotThrow(() => writeWxPrefs(DEFAULTS, failing('QuotaExceededError')))
  assert.doesNotThrow(() => writeWxPrefs(DEFAULTS, failing('SecurityError')))
  assert.equal(calls, 2) // it did try
})

test('dropWxAids: the aids of the choices that changed leave the address, the rest of it stays as it was', () => {
  assert.deepEqual(WX_URL_KEYS, { look: 'wxlook', opacity: 'wxopacity', hazard: 'wxhaz', track: 'wxtrack', slice: 'wxslice', strip: 'wxstrip', view: 'wxview' })
  assert.equal(dropWxAids('?hex=a831b2&chase=1&wxlook=natural&wxhaz=box', ['look']), '?hex=a831b2&chase=1&wxhaz=box')
  assert.equal(dropWxAids('?wxlook=natural&wxhaz=box&wxtrack=0&wxslice=1&wxstrip=0', ['hazard', 'strip']), '?wxlook=natural&wxtrack=0&wxslice=1')
  assert.equal(dropWxAids('?wxlook=natural', ['look']), '', 'nothing left: no ?')
  assert.equal(dropWxAids('wxlook=natural&at=32.0,34.8,12', ['look']), '?at=32.0,34.8,12', 'the commas stay as they are (urlState.ts writes them so)')
  // Nothing of ours to take out: the very same string, so the app does not touch the address.
  assert.equal(dropWxAids('?hex=a831b2&at=32.0%2C34.8%2C12', ['look', 'track']), '?hex=a831b2&at=32.0%2C34.8%2C12')
  assert.equal(dropWxAids('?wxlook=natural', []), '?wxlook=natural')
  assert.equal(dropWxAids('', ['look']), '')
})

test('savedAfter: a choice made in the menu is written onto what was saved; a URL aid in force for this load is not, unless it is the field that changed', () => {
  // Sculpted was saved; the link asks for Natural and for the level slice, for this load.
  const stored = '{"look":"sculpted","hazard":"fence","track":true,"slice":false,"strip":true}'
  const saved = readWxPrefs('', stored)
  const inForce = readWxPrefs('?wxlook=natural&wxslice=1', stored)
  assert.deepEqual(inForce, { look: 'natural', opacity: VEIL, hazard: 'fence', track: true, slice: true, strip: true, view: 'path' })
  // The person turns the ahead strip off, and nothing else.
  const next = { ...inForce, strip: false }
  assert.deepEqual(savedAfter(saved, inForce, next), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: true, slice: false, strip: false, view: 'path' }, 'Sculpted stays saved, and the slice stays off')
  assert.deepEqual(saved, { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: true, slice: false, strip: true, view: 'path' }, 'what was saved is not changed in place')
  // The person then picks Severity colours over the link's Natural: that is their choice, and is saved.
  const after = savedAfter(savedAfter(saved, inForce, next), next, { ...next, look: 'severity' })
  assert.deepEqual(after, { look: 'severity', opacity: VEIL, hazard: 'fence', track: true, slice: false, strip: false, view: 'path' })
  // A choice back to what the link had asked for is a choice too.
  assert.equal(savedAfter(saved, { ...inForce, slice: false }, inForce).slice, true)
  assert.deepEqual(savedAfter(saved, inForce, inForce), saved, 'nothing changed: nothing written')
  // What is stored is what a load without the link reads back.
  const store = new Map<string, string>()
  writeWxPrefs(savedAfter(saved, inForce, next), { setItem: (k, v) => void store.set(k, v) })
  assert.deepEqual(readWxPrefs('', store.get(WX_PREFS_KEY)!), { look: 'sculpted', opacity: VEIL, hazard: 'fence', track: true, slice: false, strip: false, view: 'path' })
})

test('the Sculpted look: ?wxlook=sculpted and a stored "sculpted" are read, and written back', () => {
  assert.deepEqual(readWxPrefs('?wxlook=sculpted', null), { ...DEFAULTS, look: 'sculpted' })
  assert.deepEqual(readWxPrefs('', '{"look":"sculpted"}'), { ...DEFAULTS, look: 'sculpted' })
  assert.deepEqual(readWxPrefs('?wxlook=severity', '{"look":"sculpted"}'), DEFAULTS)
  assert.equal(readWxPrefs('?wxlook=Sculpted', null).look, 'severity') // the word as it is, no other
  let stored: string | null = null
  writeWxPrefs({ ...DEFAULTS, look: 'sculpted' }, { setItem: (_k, v) => void (stored = v) })
  assert.equal(readWxPrefs('', stored).look, 'sculpted')
  assert.equal(dropWxAids('?hex=a831b2&wxlook=sculpted&wx=1', ['look']), '?hex=a831b2&wx=1')
})

test('the Blocks look is no more: a stored "blocks" and ?wxlook=blocks are the default\'s, and nothing else of what was stored is lost', () => {
  assert.deepEqual(readWxPrefs('', '{"look":"blocks","hazard":"fence","track":false,"slice":true,"strip":false}'), { look: 'severity', opacity: VEIL, hazard: 'fence', track: false, slice: true, strip: false, view: 'path' })
  assert.equal(readWxPrefs('?wxlook=blocks', '{"look":"natural"}').look, 'natural')
})

test('the clouds\' opacity: VEIL until chosen; a stored number from 0 to 1 is read, 0 (no clouds) too; ?wxopacity=0…100 wins, in hundredths; anything else is ignored', () => {
  assert.equal(DEFAULT_WX_PREFS.opacity, VEIL)
  assert.equal(readWxPrefs('', '{"opacity":0.3}').opacity, 0.3)
  assert.equal(readWxPrefs('', '{"opacity":0}').opacity, 0)
  assert.equal(readWxPrefs('', '{"opacity":1}').opacity, 1)
  for (const bad of ['-0.1', '1.5', '"0.3"', 'null', 'true', '[]']) assert.equal(readWxPrefs('', `{"opacity":${bad}}`).opacity, VEIL, bad)
  assert.equal(readWxPrefs('?wxopacity=0', '{"opacity":0.3}').opacity, 0)
  assert.equal(readWxPrefs('?wxopacity=40', '{"opacity":0.3}').opacity, 0.4)
  assert.equal(readWxPrefs('?wxopacity=100', null).opacity, 1)
  for (const bad of ['', '-1', '101', '4.5', 'half', ' 40', '1000']) assert.equal(readWxPrefs(`?wxopacity=${bad}`, '{"opacity":0.3}').opacity, 0.3, `?wxopacity=${bad}`)
  assert.equal(dropWxAids('?hex=a831b2&wxopacity=40', ['opacity']), '?hex=a831b2')
  assert.deepEqual(savedAfter(DEFAULT_WX_PREFS, DEFAULT_WX_PREFS, { ...DEFAULT_WX_PREFS, opacity: 0.2 }), { ...DEFAULT_WX_PREFS, opacity: 0.2 })
})

test('the heights the ahead strip shows (its own two buttons): round the aircraft\'s way unless the whole sky was chosen; stored, and ?wxview=path|sky wins for the load', () => {
  assert.equal(DEFAULT_WX_PREFS.view, 'path')
  assert.equal(readWxPrefs('', '{"view":"sky"}').view, 'sky')
  assert.equal(readWxPrefs('?wxview=path', '{"view":"sky"}').view, 'path')
  assert.equal(readWxPrefs('?wxview=sky', null).view, 'sky')
  for (const bad of ['{"view":"all"}', '{"view":1}', '{}']) assert.equal(readWxPrefs('?wxview=whole', bad).view, 'path', bad)
  assert.equal(dropWxAids('?hex=a831b2&wxview=sky', ['view']), '?hex=a831b2')
})
