// client/ui/pictureSwitch.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  load: (url, context, nextLoad) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : nextLoad(url, context)),
})
const { pictureText, readPicture } = await import('./pictureSwitch.ts')

test('readPicture: the view as designed unless the person turned Smoother on', () => {
  assert.equal(readPicture(null), 'full')
  assert.equal(readPicture('smooth'), 'smooth')
  assert.equal(readPicture('full'), 'full')
  assert.equal(readPicture('anything'), 'full')
})

test('pictureText: the first line says why the card is there, the switch is Performance mode; the tooltip says what each position does, and with it on, what is given up now', () => {
  const off = pictureText({ offered: true, picture: 'full', level: 0 })
  assert.equal(off.why, 'Graphics at full load: the view may stutter.')
  assert.equal(off.label, 'Performance mode')
  assert.match(off.tip, /^On: softer edges, no sun glare and fewer pixels/m)
  assert.match(off.tip, /^Off: full quality/m)
  const on = pictureText({ offered: true, picture: 'smooth', level: 2 })
  assert.equal(on.why, 'Performance mode: a softer picture keeps the view smooth.')
  assert.equal(on.label, 'Performance mode')
  assert.match(on.tip, /^Now: softer edges, no sun glare, 85 % of the pixels\./m)
  assert.match(on.tip, /^Off: full quality/m)
  assert.doesNotMatch(pictureText({ offered: true, picture: 'smooth', level: 0 }).tip, /Now:/, 'nothing given up at the level as designed')
})
