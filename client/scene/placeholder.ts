// client/scene/placeholder.ts
// The look of an aircraft drawn on a model that is not its own (modelFor.ts: a stand-in, or the generic one): at first
// glance a placeholder, not an aircraft. No livery, no sunlight on it: one flat colour of its own that no aircraft
// wears, the same by day and by night, with the scene showing through it.
// It is drawn in the opaque pass, with holes (discard), never blended. Every pixel it draws has its depth, so the
// ground, the buildings and the weather's cloud pass (cloudVolume.ts reads the depth buffer) sort with it as with a real
// model: cloud in front veils it, cloud behind shows through its holes and is not laid over its lines. A blended model
// writes no depth, and the cloud pass would then draw every cloud behind it over it. The holes and lines are two pixels
// wide at least: the cloud march runs at half the size, and both what is drawn and what is not reach it.
// Three looks, of which one is the app's (DEFAULT_LOOK); ?ghost= picks another, for checking (parseGhost).
// One shader per look serves every placeholder, chased and traffic, and their landing gear: it holds nothing of the
// model (its sizes come from the matrix the model is drawn with), so there is no texture and no atlas to make, and one
// draw per model as before.
import { Color, CustomShader, CustomShaderMode, LightingModel } from 'cesium'
import type { Model } from 'cesium'
import type { ModelFit } from './modelFor.ts'

/** 1: a hologram (a glowing outline, scan lines inside); 2: a frame (a wire grid, the far side through it); 3: a flat ghost (a pale hatch, a dashed outline). */
export type PlaceholderLook = 1 | 2 | 3
export const LOOK_NAMES: Record<PlaceholderLook, string> = { 1: 'hologram', 2: 'frame', 3: 'flat ghost' }
export const DEFAULT_LOOK: PlaceholderLook = 2

/** The placeholder's colours (sRGB). INK is theme.css's --fh-placeholder: the card's line is in it. */
export const INK = '#7fe6ff'
const GLOW = '#e2fbff' // the hologram's outline
const DEEP = '#1596c8' // the hologram's scan lines where the surface faces the eye; the frame's far side; the flat ghost's outline
const PALE = '#d3f1ff' // the flat ghost's body

// ---------- the check aid ----------

/** What ?ghost= asks for: the look, and whether every aircraft (true) or none (false) is drawn as a placeholder (null: as its model fits). */
export interface PlaceholderAid { look: PlaceholderLook; every: boolean | null }

/**
 * ?ghost=1|2|3: the placeholders in that look. ?ghost=2,all: every aircraft as a placeholder; ?ghost=0: none, each on
 * its model in its livery as before (the two ends of a cost comparison). Anything else: the app's look.
 */
export function parseGhost(search: string): PlaceholderAid {
  const m = /^([0-3])(,all)?$/.exec(new URLSearchParams(search).get('ghost') ?? '')
  if (m === null) return { look: DEFAULT_LOOK, every: null }
  if (m[1] === '0') return { look: DEFAULT_LOOK, every: false }
  return { look: Number(m[1]) as PlaceholderLook, every: m[2] === undefined ? null : true }
}

let aid: PlaceholderAid = { look: DEFAULT_LOOK, every: null }

/** The look and the aid in use from now on (the app sets it once, before any model is drawn). */
export function setPlaceholderAid(a: PlaceholderAid): void {
  aid = a
}

/** Whether an aircraft whose model fits it so is drawn as a placeholder: any model but its own. */
export const asPlaceholder = (fit: ModelFit): boolean => aid.every ?? fit !== 'own'

// ---------- the shaders ----------

/** An sRGB colour as a GLSL vec3 in linear light (the unlit model's colour is converted back on its way out). */
function linear(hex: string): string {
  const c = Color.fromCssColorString(hex)
  const f = (v: number): string => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).toFixed(4)
  return `vec3(${f(c.red)}, ${f(c.green)}, ${f(c.blue)})`
}

// Sizes on the aircraft are in metres as drawn: the mesh's units times the scale in the matrix the model is drawn with
// (its own, and a far model's enlargement). A pattern's step is doubled until it is wide enough on screen, by the
// model's own depth, so that the whole model has one step and a far one is not a smear.
// The outline is where the surface turns away from the eye, a constant few pixels wide whatever the body's girth: the
// facing's own change per pixel says how far that is. (A plate seen face-on has no such edge: a wing from above shows
// its leading edge, not its tip.)
const SHARED = `
float fhScale() {
  return length(czm_modelView[0].xyz);
}
float fhStep(float baseM, float leastPx) {
  float pxPerM = 0.5 * czm_viewport.w * czm_projection[1][1] / max(-czm_modelView[3].z, 1.0);
  return baseM * exp2(ceil(max(0.0, log2(leastPx / (baseM * pxPerM)))));
}
// 0 where the surface turns away from the eye, 1 where it faces it.
float fhFacing(vec3 normalEC, vec3 positionEC) {
  return abs(dot(normalize(normalEC), normalize(positionEC)));
}
// Pixels from here to the outline.
float fhToOutline(float facing) {
  return facing / max(fwidth(facing), 1.0e-4);
}`

// A propeller's disc and whatever else the model draws see-through is no part of a placeholder.
const SOLID_ONLY = 'if (material.alpha < 0.98) discard;'

/**
 * The hologram: a glowing outline, and inside it scan lines, two screen pixels on and four off, brighter where the
 * surface turns away from the eye.
 */
const HOLOGRAM = `${SHARED}
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  ${SOLID_ONLY}
  float facing = fhFacing(fsInput.attributes.normalEC, fsInput.attributes.positionEC);
  bool outline = fhToOutline(facing) < 5.0;
  if (!outline && mod(gl_FragCoord.y, 6.0) >= 2.0) discard;
  material.diffuse = outline ? ${linear(GLOW)} : mix(${linear(INK)}, ${linear(DEEP)}, smoothstep(0.1, 0.8, facing));
}`

/**
 * The frame: a grid of planes 3 m apart along the aircraft's three axes (rings round the fuselage, ribs and spars on
 * the wings), each line two pixels wide, and the outline; nothing between them. Both sides are drawn, the far one
 * deeper, so it reads as a wire frame. No plane lies on the centre line: the fin's two sides would light up whole.
 */
const FRAME = `${SHARED}
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  ${SOLID_ONLY}
  vec3 q = fsInput.attributes.positionMC * fhScale() / fhStep(3.0, 7.0) + vec3(0.5, 0.0, 0.0);
  vec3 toLine = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), 1.0e-6); // pixels to the nearest plane, along each axis
  float facing = fhFacing(fsInput.attributes.normalEC, fsInput.attributes.positionEC);
  if (min(min(toLine.x, toLine.y), toLine.z) > 1.0 && fhToOutline(facing) > 4.0) discard;
  material.diffuse = gl_FrontFacing ? ${linear(INK)} : ${linear(DEEP)};
}`

/**
 * The flat ghost: one pale colour over half the pixels (a diagonal hatch, two on and two off, which reads as a
 * see-through skin) and a dashed outline in a deeper tone, its dashes about 1 m long along the aircraft.
 */
const GHOST = `${SHARED}
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
  ${SOLID_ONLY}
  float facing = fhFacing(fsInput.attributes.normalEC, fsInput.attributes.positionEC);
  if (fhToOutline(facing) < 5.0) {
    vec3 p = fsInput.attributes.positionMC * fhScale() / fhStep(2.0, 10.0);
    if (fract(p.x + p.y + p.z) > 0.55) discard;
    material.diffuse = ${linear(DEEP)};
    return;
  }
  if (mod(gl_FragCoord.x + gl_FragCoord.y, 4.0) >= 2.0) discard;
  material.diffuse = ${linear(PALE)};
}`

const TEXT: Record<PlaceholderLook, string> = { 1: HOLOGRAM, 2: FRAME, 3: GHOST }

/** A look's fragment shader (Cesium CustomShader text). */
export const placeholderShaderText = (look: PlaceholderLook): string => TEXT[look]

const shaders = new Map<PlaceholderLook, CustomShader>()

/** The one shader of the look in use: unlit, in the opaque pass (the model's own see-through parts are discarded). */
export function placeholderShader(): CustomShader {
  let s = shaders.get(aid.look)
  if (s === undefined) {
    s = new CustomShader({ mode: CustomShaderMode.MODIFY_MATERIAL, lightingModel: LightingModel.UNLIT, fragmentShaderText: TEXT[aid.look] })
    shaders.set(aid.look, s)
  }
  return s
}

/** What dress() sets of a Cesium Model (which takes undefined for "no shader", though its typings do not say so). */
type Dressable = { customShader: CustomShader | undefined } & Pick<Model, 'backFaceCulling'>

/**
 * Dresses a model (an aircraft's, a landing gear's) as a placeholder in the look in use, or (on false) takes that off:
 * no shader (its owner paints it again), back faces culled.
 */
export function dress(model: Model, on: boolean): void {
  const m: Dressable = model
  m.customShader = on ? placeholderShader() : undefined
  m.backFaceCulling = !(on && aid.look === 2) // the frame shows its far side
}
