// client/scene/sculptShadow.ts
// The sculpted bodies' shadow on the ground (sculptedClouds.ts says when and where; sculptMesh.ts shadowImage makes the image): one
// picture draped on the terrain over the field's square, by Cesium (a rectangle on the ground with the picture as its material).
// It is a faint tint: it places a cloud over the ground and leaves the map under it readable.
// A field's shadow replaces the one before: the new rectangle is added and the old one taken out a moment later (Cesium makes a
// ground rectangle over a few frames: taken out at once, there would be a blink with no shadow).
import { ClassificationType, CustomDataSource, ImageMaterialProperty, Rectangle, type Entity, type Viewer } from 'cesium'
import type { SculptShadow } from './sculptedClouds.ts'
import { FIELD_KM } from './wxField.ts'

const KM_PER_DEG = 111.195 // of latitude: the field's map
const OVERLAP_MS = 800 // the shadow before stays this long after the next is added

/** The shadow as a ground rectangle in the viewer, in a data source of its own. */
export function groundShadow(viewer: Viewer): SculptShadow {
  const source = new CustomDataSource('cloud-shadow')
  void viewer.dataSources.add(source)
  let shown: Entity | null = null
  let gone = false
  return {
    set(image, lat, lon) {
      if (gone) return
      const old = shown
      shown = null
      if (old !== null) setTimeout(() => !gone && source.entities.remove(old), image === null ? 0 : OVERLAP_MS)
      if (image === null) return
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d')!.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width, image.height), 0, 0)
      const dLat = FIELD_KM / 2 / KM_PER_DEG
      const dLon = FIELD_KM / 2 / (KM_PER_DEG * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
      shown = source.entities.add({
        rectangle: {
          coordinates: Rectangle.fromDegrees(lon - dLon, Math.max(-89.9, lat - dLat), lon + dLon, Math.min(89.9, lat + dLat)),
          material: new ImageMaterialProperty({ image: canvas, transparent: true }), classificationType: ClassificationType.TERRAIN,
        },
      })
    },
    destroy() {
      if (gone) return
      gone = true
      if (!viewer.isDestroyed()) void viewer.dataSources.remove(source, true)
    },
  }
}
