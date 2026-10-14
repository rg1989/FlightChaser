// client/scene/canvasSize.ts
/**
 * The canvas's size as the last layout left it, kept by a ResizeObserver in place of the canvas's own clientWidth and clientHeight.
 * Cesium reads them on every projection (SceneTransforms: the brackets, the flight-data frame, the names, the runways' markers)
 * and the app reads them too; each read after a write to the page in the same frame makes the browser lay the page out again
 * (forced layouts: 0.5–2 ms a frame in a chase, measured). An observer reports after layout, so the size it keeps is the laid-out
 * one, and a resize reaches Cesium's own resize check at the next frame. Returns the undo (none where there is no observer).
 */
export function keepCanvasSize(canvas: HTMLElement): () => void {
  const R = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
  const width = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')?.get
  const height = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')?.get
  if (R === undefined || width === undefined || height === undefined) return () => {}
  let [w, h] = [width.call(canvas) as number, height.call(canvas) as number]
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, get: () => w })
  Object.defineProperty(canvas, 'clientHeight', { configurable: true, get: () => h })
  const ro = new R(() => {
    w = width.call(canvas) as number // (the layout is fresh here: no forced layout)
    h = height.call(canvas) as number
  })
  ro.observe(canvas)
  return () => {
    ro.disconnect()
    delete (canvas as { clientWidth?: number }).clientWidth
    delete (canvas as { clientHeight?: number }).clientHeight
  }
}
