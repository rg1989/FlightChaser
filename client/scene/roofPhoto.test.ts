// client/scene/roofPhoto.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { photoSource } from './roofPhoto.ts'

test('photoSource: Esri on the key (row before column, the token on it), keyless EOX to its zoom 14, none for Bing through ion or no imagery', () => {
  const esri = photoSource({ imagery: 'esri', arcgisKey: 'K' })!
  assert.equal(esri.url(17, 78200, 53300), 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/17/53300/78200?token=K')
  assert.equal(esri.maxZ, 19)
  const eox = photoSource({ imagery: 'eox' })!
  assert.match(eox.url(14, 9775, 6662), /_3857\/default\/g\/14\/6662\/9775\.jpg$/)
  assert.equal(eox.maxZ, 14)
  assert.equal(photoSource({ imagery: 'esri', arcgisKey: null }), null)
  assert.equal(photoSource({ imagery: 'ion' }), null)
  assert.equal(photoSource({ imagery: 'none' }), null)
})
