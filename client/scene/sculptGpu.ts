// client/scene/sculptGpu.ts
// The sculpted bodies on the graphics card (sculptedClouds.ts owns them): each band's mesh (sculptMesh.ts) is a vertex array of its
// own, written to the card as it is (two buffers: no work on its numbers here, so a band costs a frame a few ms), and drawn by two
// draw commands with sculptShaders.ts's shaders: one into the layer's own image, which keeps each pixel's nearest fragment's
// distance, and one into the view, blended, which draws only that nearest surface (sculptShaders.ts says why). No face is culled:
// the camera inside a body has the body's far side, from within, as its nearest surface.
// The second command is in Cesium's translucent pass: it tests the view's depth (the aircraft, the terrain and the buildings hide a
// body behind them) and writes none, so a cloud hides nothing and nothing else is sorted against it. The first is in the opaque
// pass, with a command before it that clears the layer's image: Cesium runs the passes in that order in each of its depth ranges, so
// the image a range's second drawing reads is that range's own.
// The layer is a primitive of Cesium's scene (scene.primitives takes anything with update, isDestroyed and destroy): each frame it
// hands the frame's command list the commands of the bodies in use. The corners are in a frame of their own (metres round the field's
// middle), so their floats hold; Cesium works the model-view matrix out in doubles.
// Where there is no graphics card (Node's tests) the layer is countLayer: it counts what would be made and drawn.
// ponytail: tied to Cesium 1.145's renderer (Buffer, VertexArray, ShaderProgram, RenderState, DrawCommand, ClearCommand, Framebuffer,
// Renderbuffer, Texture, Sampler, Pass: private classes, exported at runtime and missing from Cesium.d.ts, as gpuImage.ts's Texture;
// FrameState's commandList and passes; a draw command's own framebuffer; and the order of the passes). Upgrade: check them on a
// Cesium bump; the check run's bodies are the test.
import {
  BlendingState, BoundingSphere, Color, ComponentDatatype, IndexDatatype, Matrix4, PixelDatatype, PixelFormat, PrimitiveType,
  // @ts-expect-error: private, not in Cesium.d.ts
  Buffer,
  // @ts-expect-error: private, not in Cesium.d.ts
  BufferUsage,
  // @ts-expect-error: private, not in Cesium.d.ts
  ClearCommand,
  // @ts-expect-error: private, not in Cesium.d.ts
  DrawCommand,
  // @ts-expect-error: private, not in Cesium.d.ts
  Framebuffer,
  // @ts-expect-error: private, not in Cesium.d.ts
  Pass,
  // @ts-expect-error: private, not in Cesium.d.ts
  Renderbuffer,
  // @ts-expect-error: private, not in Cesium.d.ts
  RenderbufferFormat,
  // @ts-expect-error: private, not in Cesium.d.ts
  RenderState,
  // @ts-expect-error: private, not in Cesium.d.ts
  Sampler,
  // @ts-expect-error: private, not in Cesium.d.ts
  ShaderProgram,
  // @ts-expect-error: private, not in Cesium.d.ts
  Texture,
  // @ts-expect-error: private, not in Cesium.d.ts
  VertexArray,
} from 'cesium'
import { VERTEX_FLOATS, type SculptBand } from './sculptMesh.ts'
import { NEAREST_FS, SCULPT_FS, SCULPT_VS } from './sculptShaders.ts'

/** A band's mesh on the card. */
export interface SculptBody {
  readonly triangles: number
  destroy(): void
}

/** The shader's numbers, read each frame as Cesium draws. */
export interface SculptUniforms {
  light: number // the Sun's brightness (cloudField.ts sunBrightness)
  opacity: number // the opacity chosen, as a share of the look's own (1); 0: nothing is drawn
}

/** What draws the bodies: a primitive of the scene's. */
export interface SculptLayer {
  /** A band's mesh written to the card; drawn once it is among those given to `use`. */
  make(band: SculptBand): SculptBody
  /** The bodies drawn from now on (made by this layer), the frame their corners are in (to the world's), and how far the farthest corner is from its origin, m. */
  use(bodies: readonly SculptBody[], frame: Matrix4, radiusM: number): void
  update(frameState: unknown): void
  isDestroyed(): boolean
  destroy(): void
}

export type MakeLayer = (uniforms: SculptUniforms) => SculptLayer

/** A layer with no graphics card: it counts the bodies made and not yet destroyed (live), and holds those in use. */
export function countLayer(): SculptLayer & { live: number; made: number; used: readonly SculptBody[]; destroyed: boolean } {
  const layer = {
    live: 0, made: 0, used: [] as readonly SculptBody[], destroyed: false,
    make(band: SculptBand): SculptBody {
      layer.live++
      layer.made++
      let gone = false
      return {
        triangles: band.indices.length / 3,
        destroy: () => {
          if (!gone) layer.live--
          gone = true
        },
      }
    },
    use(bodies: readonly SculptBody[]): void {
      layer.used = bodies
    },
    update(): void {},
    isDestroyed: (): boolean => layer.destroyed,
    destroy(): void {
      layer.destroyed = true
    },
  }
  return layer
}

/** What of Cesium's graphics context the layer reads: the size of what it draws into. */
interface Context {
  drawingBufferWidth: number
  drawingBufferHeight: number
}

/** Layers in a scene's graphics context (Scene.context: private, there at runtime). */
export function gpuLayers(context: unknown): MakeLayer {
  return (uniforms) => {
    const attributeLocations = { position: 0, normal: 1, body: 2 }
    const nearestProgram = ShaderProgram.fromCache({ context, vertexShaderSource: SCULPT_VS, fragmentShaderSource: NEAREST_FS, attributeLocations })
    const program = ShaderProgram.fromCache({ context, vertexShaderSource: SCULPT_VS, fragmentShaderSource: SCULPT_FS, attributeLocations })
    const nearestState = RenderState.fromCache({ depthTest: { enabled: true }, depthMask: true, cull: { enabled: false } })
    const state = RenderState.fromCache({ depthTest: { enabled: true }, depthMask: false, cull: { enabled: false }, blending: BlendingState.ALPHA_BLEND })
    const frame = Matrix4.clone(Matrix4.IDENTITY) // the commands hold these two objects: written in place
    const sphere = new BoundingSphere()
    // The layer's own image, the size of the view: made at the first frame, and again when the view's size changes.
    let image: { framebuffer: { destroy(): void }; texture: unknown; width: number; height: number } | null = null
    const clear = new ClearCommand({ color: new Color(1, 1, 1, 1), depth: 1, pass: Pass.OPAQUE })
    const uniformMap = { u_light: (): number => uniforms.light, u_opacity: (): number => uniforms.opacity, u_nearest: (): unknown => image!.texture }
    const commands = new Map<SculptBody, { nearest: { framebuffer: unknown }; drawn: unknown }>()
    let used: { nearest: { framebuffer: unknown }; drawn: unknown }[] = []
    let destroyed = false
    const size = (): void => {
      const { drawingBufferWidth: width, drawingBufferHeight: height } = context as Context
      if (image !== null && image.width === width && image.height === height) return
      image?.framebuffer.destroy()
      const texture = new Texture({ context, width, height, pixelFormat: PixelFormat.RGBA, pixelDatatype: PixelDatatype.UNSIGNED_BYTE, sampler: Sampler.NEAREST })
      const framebuffer = new Framebuffer({
        context, colorTextures: [texture], depthStencilRenderbuffer: new Renderbuffer({ context, width, height, format: RenderbufferFormat.DEPTH_STENCIL }), destroyAttachments: true,
      })
      image = { framebuffer, texture, width, height }
      clear.framebuffer = framebuffer
      for (const c of commands.values()) c.nearest.framebuffer = framebuffer
    }
    const layer: SculptLayer = {
      make(band) {
        const vertexBuffer = Buffer.createVertexBuffer({ context, typedArray: band.vertices, usage: BufferUsage.STATIC_DRAW })
        const indexBuffer = Buffer.createIndexBuffer({ context, typedArray: band.indices, usage: BufferUsage.STATIC_DRAW, indexDatatype: IndexDatatype.UNSIGNED_INT })
        const part = (index: number, offset: number, count: number): object => ({
          index, vertexBuffer, componentsPerAttribute: count, componentDatatype: ComponentDatatype.FLOAT, offsetInBytes: offset * 4, strideInBytes: VERTEX_FLOATS * 4,
        })
        const vertexArray = new VertexArray({ context, attributes: [part(0, 0, 3), part(1, 3, 3), part(2, 6, 4)], indexBuffer }) // (and destroys its buffers with itself)
        const body: SculptBody = {
          triangles: band.indices.length / 3,
          destroy: () => {
            if (commands.delete(body)) vertexArray.destroy()
          },
        }
        const shared = { vertexArray, modelMatrix: frame, boundingVolume: sphere, primitiveType: PrimitiveType.TRIANGLES, owner: layer }
        commands.set(body, {
          nearest: new DrawCommand({ ...shared, shaderProgram: nearestProgram, renderState: nearestState, uniformMap: {}, pass: Pass.OPAQUE, framebuffer: image?.framebuffer }),
          drawn: new DrawCommand({ ...shared, shaderProgram: program, renderState: state, uniformMap, pass: Pass.TRANSLUCENT }),
        })
        return body
      },
      use(bodies, to, radiusM) {
        used = bodies.flatMap((b) => (commands.has(b) ? [commands.get(b)!] : []))
        Matrix4.clone(to, frame)
        Matrix4.getTranslation(to, sphere.center)
        sphere.radius = radiusM
      },
      update(frameState) {
        const fs = frameState as { passes: { render: boolean }; commandList: unknown[] }
        if (destroyed || !fs.passes.render || used.length === 0 || !(uniforms.opacity > 0)) return
        size()
        fs.commandList.push(clear)
        for (const c of used) fs.commandList.push(c.nearest)
        for (const c of used) fs.commandList.push(c.drawn)
      },
      isDestroyed: () => destroyed,
      destroy() {
        if (destroyed) return
        destroyed = true
        used = []
        for (const body of [...commands.keys()]) body.destroy()
        image?.framebuffer.destroy()
        image = null
        nearestProgram.destroy()
        program.destroy()
      },
    }
    return layer
  }
}
