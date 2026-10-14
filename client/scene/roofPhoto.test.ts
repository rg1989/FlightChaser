// client/scene/roofPhoto.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mosaic, photoSource } from './roofPhoto.ts'

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

test('mosaic: a 404 at a zoom ends that zoom at once (the queued tiles are not asked for) and the picture comes a zoom shallower', async () => {
  const asked: string[] = []
  const canvases: { width: number; height: number }[] = []
  const saved = { fetch: globalThis.fetch, document: (globalThis as { document?: unknown }).document, cib: (globalThis as { createImageBitmap?: unknown }).createImageBitmap }
  Object.assign(globalThis, {
    document: { createElement: () => { const c = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }) }; canvases.push(c); return c } },
    createImageBitmap: async () => ({ close: () => {} }),
    fetch: async (url: string) => {
      asked.push(url)
      await new Promise((r) => setTimeout(r, 5))
      const z = Number(url.split('/')[0])
      return { status: z === 17 ? 404 : 200, ok: z !== 17, blob: async () => ({}) }
    },
  })
  try {
    const src = { url: (z: number, x: number, y: number) => `${z}/${x}/${y}`, maxZ: 19 }
    const c = await mosaic(src, 9775, 6662, 14, 17)
    assert.equal(c.width, 1024, 'zoom 16: 4 × 4 tiles of 256 px')
    const z17 = asked.filter((u) => u.startsWith('17/')).length
    assert.ok(z17 <= 12, `${z17} of 64 zoom-17 tiles asked for: only those already in flight`)
    assert.equal(asked.filter((u) => u.startsWith('16/')).length, 16)
    assert.deepEqual([canvases[0].width, canvases[0].height], [0, 0], 'the failed attempt\'s canvas is released')
  } finally {
    Object.assign(globalThis, { fetch: saved.fetch, document: saved.document, createImageBitmap: saved.cib })
  }
})
