// client/scene/sculptShadow.ts
// The sculpted bodies' shadow on the ground (sculptedClouds.ts says when and where; sculptMesh.ts shadowImage makes the image): one
// picture over the field's square, laid on the globe as an imagery layer of its own, over the map's. It is a faint tint: it places a
// cloud over the ground and leaves the map under it readable.
// As an imagery layer it costs a frame next to nothing: the globe's tiles are drawn with one picture more. (As a rectangle draped on
// the ground it was three more drawings of the whole view, each frame: 0.5 ms of an 11 ms frame on the check machine, as much as the
// bodies themselves.)
// A field's shadow replaces the one before: the new layer is added and the old one taken out a moment later (a layer's picture is on
// the tiles a few frames after it is added: taken out at once, there would be a blink with no shadow). The layer stays the top one:
// when the app adds a layer of its own (the street map), the shadow is raised over it again.
import { ImageryLayer, Rectangle, SingleTileImageryProvider, type Viewer } from 'cesium'
import type { SculptShadow } from './sculptedClouds.ts'
import { FIELD_KM } from './wxField.ts'

const KM_PER_DEG = 111.195 // of latitude: the field's map
const OVERLAP_MS = 800 // the shadow before stays this long after the next is added

/** The shadow as an imagery layer of the viewer's globe. */
export function groundShadow(viewer: Viewer): SculptShadow {
  const layers = viewer.imageryLayers
  let shown: ImageryLayer | null = null
  let gone = false
  const drop = (layer: ImageryLayer): void => {
    if (!viewer.isDestroyed() && layers.contains(layer)) layers.remove(layer, true)
  }
  const unlisten = layers.layerAdded.addEventListener(() => {
    if (shown !== null && layers.contains(shown) && layers.indexOf(shown) !== layers.length - 1) layers.raiseToTop(shown)
  })
  return {
    set(image, lat, lon) {
      if (gone) return
      const old = shown
      shown = null
      if (old !== null) {
        if (image === null) drop(old)
        else setTimeout(() => drop(old), OVERLAP_MS)
      }
      if (image === null) return
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d')!.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0)
      const dLat = FIELD_KM / 2 / KM_PER_DEG
      const dLon = FIELD_KM / 2 / (KM_PER_DEG * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
      const rectangle = Rectangle.fromDegrees(lon - dLon, Math.max(-89.9, lat - dLat), lon + dLon, Math.min(89.9, lat + dLat))
      const layer = new ImageryLayer(new SingleTileImageryProvider({ url: canvas.toDataURL('image/png'), rectangle, tileWidth: image.width, tileHeight: image.height }))
      shown = layer // (before it is added: the listener above then leaves it be)
      layers.add(layer)
    },
    destroy() {
      if (gone) return
      gone = true
      unlisten()
      if (shown !== null) drop(shown)
      shown = null
    },
  }
}
