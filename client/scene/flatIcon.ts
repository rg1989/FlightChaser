// client/scene/flatIcon.ts
// An aircraft icon that lies flat, for the tilted map: the icon's silhouette (icons.ts) as a 1 m square in the model's
// own frame (nose +X, left wing +Y, up +Z), with LAYERS − 1 darker copies stacked under it for a slight thickness. A glTF
// built here, texture and all, so no file is fetched. Unlit, so the altitude tint (Model.color) is the colour seen.

/** The layers: the icon on top, darker ones under it down to THICK (of the icon's side). */
const LAYERS = 4
const THICK = 0.07
const UNDER_SHADE = 0.35 // the layers under the top one, this bright

/** Little-endian bytes of the arrays, one after another, each starting on a 4-byte boundary. */
function pack(parts: (Float32Array | Uint16Array)[]): { bytes: Uint8Array; offsets: number[] } {
  const offsets: number[] = []
  let n = 0
  for (const p of parts) {
    offsets.push(n)
    n += Math.ceil(p.byteLength / 4) * 4
  }
  const bytes = new Uint8Array(n)
  parts.forEach((p, i) => bytes.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), offsets[i]))
  return { bytes, offsets }
}

const base64 = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

/**
 * The glTF (JSON) of a flat icon whose silhouette is the PNG at pngUri (a data: URI), nose up in the picture.
 */
export function flatIconGltf(pngUri: string): object {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let l = 0; l < LAYERS; l++) {
    const z = l === 0 ? 0 : (-l * THICK) / (LAYERS - 1) // the top layer at 0 (not −0)
    const at = pos.length / 3
    // Picture (u right, v down) → model: v = 0 (top) is the nose (+X), u = 0 (left) the left wing (+Y).
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      pos.push(0.5 - v, 0.5 - u, z)
      uv.push(u, v)
    }
    idx.push(at, at + 1, at + 2, at, at + 2, at + 3)
  }
  const positions = new Float32Array(pos)
  const { bytes, offsets } = pack([positions, new Float32Array(uv), new Uint16Array(idx)])
  const nV = LAYERS * 4
  const material = (shade: number) => ({
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [shade, shade, shade, 1], metallicFactor: 0, roughnessFactor: 1 },
    alphaMode: 'MASK', alphaCutoff: 0.5, doubleSided: true, extensions: { KHR_materials_unlit: {} },
  })
  return {
    asset: { version: '2.0' },
    extensionsUsed: ['KHR_materials_unlit'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [
        { attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0 }, // the top layer
        { attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 3, material: 1 }, // the ones under it
      ],
    }],
    materials: [material(1), material(UNDER_SHADE)],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ uri: pngUri }],
    buffers: [{ byteLength: bytes.length, uri: `data:application/octet-stream;base64,${base64(bytes)}` }],
    bufferViews: [
      { buffer: 0, byteOffset: offsets[0], byteLength: nV * 12, target: 34962 },
      { buffer: 0, byteOffset: offsets[1], byteLength: nV * 8, target: 34962 },
      { buffer: 0, byteOffset: offsets[2], byteLength: 6 * 2, target: 34963 },
      { buffer: 0, byteOffset: offsets[2] + 12, byteLength: (LAYERS - 1) * 6 * 2, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: nV, type: 'VEC3', min: [-0.5, -0.5, -THICK], max: [0.5, 0.5, 0] },
      { bufferView: 1, componentType: 5126, count: nV, type: 'VEC2' },
      { bufferView: 2, componentType: 5123, count: 6, type: 'SCALAR' },
      { bufferView: 3, componentType: 5123, count: (LAYERS - 1) * 6, type: 'SCALAR' },
    ],
  }
}
