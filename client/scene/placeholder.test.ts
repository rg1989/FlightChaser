// client/scene/placeholder.test.ts
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CustomShaderMode, CustomShaderTranslucencyMode, LightingModel } from 'cesium'
import type { CustomShader, Model } from 'cesium'
import { DEFAULT_LOOK, INK, LOOK_NAMES, asPlaceholder, dress, parseGhost, placeholderShader, placeholderShaderText, setPlaceholderAid } from './placeholder.ts'
import type { PlaceholderLook } from './placeholder.ts'

afterEach(() => setPlaceholderAid(parseGhost('')))

interface FakeModel { customShader: CustomShader | undefined; backFaceCulling: boolean }
const fake = (): FakeModel => ({ customShader: undefined, backFaceCulling: true })
const asModel = (m: FakeModel): Model => m as unknown as Model

test('parseGhost: ?ghost=1|2|3 picks the look; without it, or with anything else, the app\'s own', () => {
  assert.deepEqual(parseGhost(''), { look: DEFAULT_LOOK, every: null })
  assert.deepEqual(parseGhost('?hex=a831b2&chase=1'), { look: DEFAULT_LOOK, every: null })
  for (const n of [1, 2, 3]) assert.deepEqual(parseGhost(`?hex=a831b2&ghost=${n}`), { look: n, every: null })
  for (const junk of ['4', '-1', 'x', '', '1.5', '2,every', 'all']) assert.deepEqual(parseGhost(`?ghost=${junk}`), { look: DEFAULT_LOOK, every: null }, junk)
})

test('parseGhost: ?ghost=2,all draws every aircraft as a placeholder and ?ghost=0 none (a cost comparison\'s two ends)', () => {
  assert.deepEqual(parseGhost('?ghost=2,all'), { look: 2, every: true })
  assert.deepEqual(parseGhost('?ghost=2%2Call'), { look: 2, every: true })
  assert.deepEqual(parseGhost('?ghost=0'), { look: DEFAULT_LOOK, every: false })
})

test('asPlaceholder: an aircraft on a stand-in or on the generic model is drawn as a placeholder, one on its own model is not', () => {
  assert.deepEqual([asPlaceholder('own'), asPlaceholder('standIn'), asPlaceholder('generic')], [false, true, true])
  setPlaceholderAid(parseGhost('?ghost=3,all'))
  assert.deepEqual([asPlaceholder('own'), asPlaceholder('standIn'), asPlaceholder('generic')], [true, true, true])
  setPlaceholderAid(parseGhost('?ghost=0'))
  assert.deepEqual([asPlaceholder('own'), asPlaceholder('standIn'), asPlaceholder('generic')], [false, false, false])
})

test('each look is one shader for every model: unlit, in the opaque pass (holes, not blending, so it has depth), with no uniform of a model', () => {
  const made = new Set<CustomShader>()
  for (const look of [1, 2, 3] as PlaceholderLook[]) {
    setPlaceholderAid({ look, every: null })
    const s = placeholderShader()
    assert.equal(placeholderShader(), s, 'the same shader every time')
    made.add(s)
    assert.equal(s.lightingModel, LightingModel.UNLIT)
    assert.equal(s.mode, CustomShaderMode.MODIFY_MATERIAL)
    assert.equal(s.translucencyMode, CustomShaderTranslucencyMode.INHERIT, 'never forced into the translucent pass')
    assert.deepEqual(Object.keys(s.uniforms), [])
    assert.equal(s.fragmentShaderText, placeholderShaderText(look))
    assert.match(s.fragmentShaderText!, /discard;/)
    assert.doesNotMatch(s.fragmentShaderText!, /material\.alpha\s*=/, 'no alpha is written: nothing is blended')
    assert.doesNotMatch(s.fragmentShaderText!, /texture\(/, 'no texture is read')
  }
  assert.equal(made.size, 3)
})

test('dress: the look\'s shader on the model, and only the frame shows its far side; off, the model is bare again and culls its back faces', () => {
  const m = fake()
  for (const look of [1, 2, 3] as PlaceholderLook[]) {
    setPlaceholderAid({ look, every: null })
    dress(asModel(m), true)
    assert.deepEqual([m.customShader, m.backFaceCulling], [placeholderShader(), look !== 2], LOOK_NAMES[look])
    dress(asModel(m), false)
    assert.deepEqual([m.customShader, m.backFaceCulling], [undefined, true], LOOK_NAMES[look])
  }
})

test('the placeholder\'s colour is the card line\'s (theme.css --fh-placeholder)', () => {
  const css = readFileSync(new URL('../ui/theme.css', import.meta.url), 'utf8')
  assert.equal(/--fh-placeholder:\s*(#[0-9a-f]{6})/.exec(css)?.[1], INK)
})
