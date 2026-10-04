// client/scene/sculptShaders.ts
// The sculpted bodies' shaders (sculptGpu.ts draws sculptMesh.ts's triangles with them). Pure strings, so Node tests can read them.
// A body is see-through: what is behind it (the ground, the map's roads and names, the aircraft, another cloud) stays readable. The
// surface nearest the eye veils what is behind it by VEIL, a little more where it turns away from the eye (as a real veil is thicker
// seen edge-on); a body's near side seen through another surface (a storm behind a deck, a cloud behind a cloud) by BEHIND only,
// so that a row of bodies does not add up to a wall; and a body's far side is not drawn at all, unless it is the nearest surface: the
// inside of the body the camera is in, a thinner veil (INSIDE_VEIL), lighter.
// What carries a body's shape is firm: the rim (where the top sheet meets the underside) and the outline (where the surface turns
// away from the eye), a bright line EDGE_PX wide at any distance; and round the sides a line at every LEVEL_M of height above the
// sea, drawn from the corner's height (gone where a face is level, and where the lines would stand closer than a few pixels). Each
// line has a darker line on either side (inside the rim's), so that it reads over a dark picture and over a pale map alike. Behind
// another surface the rim and the outline are fainter (BEHIND_LINES) and there are no level lines: a storm of many limbs was a
// scribble of them.
// "Nearest" is asked of an image of the layer's own: the triangles are drawn first (NEAREST_FS) into it, with depth, where each pixel
// keeps how far its nearest fragment is from the eye (packed in its three colour bytes, as a logarithm: a part in a million); then
// (SCULPT_FS) into the view, blended, where a fragment within NEAR_EPS of the pixel's nearest is the nearest. The view's own depth
// is tested and not written: nothing else in the scene is hidden by a cloud or sorted against it.
// The colour is the severity's (wxAhead.ts SEV_COLOR, mixed between whole severities, so a body's colours run softly into each
// other), lit simply: a strong ambient term, more from above than from below, and the scene's light on the faces turned to it; the
// underside a little darker; all of it times the Sun's brightness (u_light: cloudField.ts sunBrightness).
import { SEV_COLOR } from './wxAhead.ts'

export const LEVEL_M = 500 // a level line at every this much height above the sea
export const VEIL = 0.34 // the surface nearest the eye veils what is behind it by this: about a third
export const GLANCE = 0.3 // more, where it turns away from the eye
export const BEHIND = 0.04 // a body's near side behind another surface, by this: next to nothing, so that layer over layer of an overcast does not hide the ground
export const INSIDE_VEIL = 0.2 // and the inside of the body the camera is in, by this
export const EDGE_ALPHA = 0.95 // the rim's and the outline's line
export const LINE_ALPHA = 0.8 // a level line
export const CASING_ALPHA = 0.5 // the darker line beside each
export const BEHIND_LINES = 0.55 // the lines of a surface behind another are times this
export const EDGE_PX = 1.3 // the rim's and the outline's line is this wide; a level line a little thinner
export const INK = 0.4 // the darker lines are the severity's colour times this
export const AMBIENT = 0.7 // of the colour, whatever the light
export const SKY_LIGHT = 0.14 // more, by how far a face looks up
export const SUN_LIGHT = 0.22 // more, by how far it faces the scene's light
export const UNDERSIDE = 0.86 // the underside's colour is times this
export const INSIDE = 0.4 // the inside of a body is this far toward white
export const NEAR_EPS = 2e-5 // of the packed distance: a fragment this much further than the nearest is still the nearest (0.04 % of its distance)

/** A severity's colour (0 … 3, mixed between whole severities as the shader mixes them), each part 0 … 1. */
export function severityRgb(sev: number): [number, number, number] {
  const s = Math.min(3, Math.max(0, Number.isFinite(sev) ? sev : 0))
  const i = Math.min(2, Math.floor(s))
  const part = (css: string, o: number): number => parseInt(css.slice(o, o + 2), 16) / 255
  return [1, 3, 5].map((o) => part(SEV_COLOR[i], o) + (part(SEV_COLOR[i + 1], o) - part(SEV_COLOR[i], o)) * (s - i)) as [number, number, number]
}

const rgb = (css: string): string => [1, 3, 5].map((o) => (parseInt(css.slice(o, o + 2), 16) / 255).toFixed(4)).join(', ')
const f = (n: number): string => (Number.isInteger(n) ? `${n}.0` : String(n))

export const SCULPT_VS = `
in vec3 position;
in vec3 normal;
in vec4 body; // the severity, the height above the sea (m), 1 on the underside, the distance in from the rim (m)
out vec3 v_positionEC;
out vec3 v_normalEC;
out vec3 v_upEC;
out vec4 v_body;

void main() {
  vec4 p = czm_modelView * vec4(position, 1.0);
  v_positionEC = p.xyz;
  v_normalEC = czm_normal * normal;
  v_upEC = czm_normal * vec3(0.0, 0.0, 1.0);
  v_body = body;
  gl_Position = czm_projection * p;
}
`

// How far a fragment is from the eye, 0 … 1 (a logarithm: 1 m to 4,000,000 km), and that number in and out of three bytes.
const REACH = `
float fhReach(vec3 positionEC) {
  return clamp(log2(length(positionEC) + 1.0) / 32.0, 0.0, 0.999);
}
vec3 fhPack(float v) {
  vec3 enc = fract(v * vec3(1.0, 255.0, 65025.0));
  enc.xy -= enc.yz / 255.0;
  return enc;
}
float fhUnpack(vec3 enc) {
  return dot(enc, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
`

/** The first drawing, into the layer's own image: each pixel's nearest fragment's distance. */
export const NEAREST_FS = `
in vec3 v_positionEC;
${REACH}
void main() {
  out_FragColor = vec4(fhPack(fhReach(v_positionEC)), 1.0);
}
`

/** The second, into the view. */
export const SCULPT_FS = `
uniform float u_light; // the Sun's brightness: 1 by day
uniform float u_opacity; // the opacity chosen, as a share of the look's own: 1 as it is here
uniform sampler2D u_nearest; // each pixel's nearest fragment's distance, packed
in vec3 v_positionEC;
in vec3 v_normalEC;
in vec3 v_upEC;
in vec4 v_body;
${REACH}
vec3 severity(float s) {
  vec3 c = mix(vec3(${rgb(SEV_COLOR[0])}), vec3(${rgb(SEV_COLOR[1])}), clamp(s, 0.0, 1.0));
  c = mix(c, vec3(${rgb(SEV_COLOR[2])}), clamp(s - 1.0, 0.0, 1.0));
  return mix(c, vec3(${rgb(SEV_COLOR[3])}), clamp(s - 2.0, 0.0, 1.0));
}

void main() {
  bool first = fhReach(v_positionEC) <= fhUnpack(texture(u_nearest, gl_FragCoord.xy / czm_viewport.zw).rgb) + ${f(NEAR_EPS)};
  if (!gl_FrontFacing && !first) discard; // a far side, of a body the camera is not in
  vec3 n = normalize(v_normalEC);
  if (!gl_FrontFacing) n = -n;
  vec3 up = normalize(v_upEC);
  float lift = dot(n, up);
  float lit = ${f(AMBIENT)} + ${f(SKY_LIGHT)} * (0.5 + 0.5 * lift) + ${f(SUN_LIGHT)} * max(dot(n, czm_lightDirectionEC), 0.0);
  vec3 tint = severity(v_body.x);
  vec3 c = tint * lit * mix(1.0, ${f(UNDERSIDE)}, v_body.z);
  float facing = abs(dot(n, normalize(v_positionEC)));
  float a = !gl_FrontFacing ? ${f(INSIDE_VEIL)} : first ? ${f(VEIL)} + ${f(GLANCE)} * (1.0 - facing) * (1.0 - facing) : ${f(BEHIND)};
  if (!gl_FrontFacing) c = mix(c, vec3(1.0), ${f(INSIDE)});
  float firm = first ? 1.0 : ${f(BEHIND_LINES)}; // the rim and the outline; a surface behind another has no level lines
  vec3 ink = tint * ${f(INK)};
  // The level lines: pixels from here to the nearest.
  float h = v_body.y / ${f(LEVEL_M)};
  float w = max(fwidth(h), 1.0e-5);
  float level = abs(fract(h - 0.5) - 0.5) / w;
  float shown = (first ? 1.0 : 0.0) * smoothstep(0.02, 0.2, 1.0 - abs(lift)) * (1.0 - smoothstep(0.12, 0.3, w));
  float line = (1.0 - smoothstep(0.5, 1.2, level)) * shown;
  float casing = (1.0 - smoothstep(1.6, 2.4, level)) * shown * (1.0 - line);
  c = mix(c, ink, casing);
  a = mix(a, ${f(CASING_ALPHA)}, casing);
  c = mix(c, mix(tint, vec3(1.0), 0.45), line);
  a = mix(a, ${f(LINE_ALPHA)}, line);
  // The rim and the outline: pixels from here to the nearer of them.
  // (The outline only where the surface does turn away: between two facets of a steep side the facing changes fast too.)
  float px = min(v_body.w / max(fwidth(v_body.w), 1.0e-4), facing / max(fwidth(facing), 1.0e-4) + 40.0 * smoothstep(0.2, 0.45, facing));
  float edge = (1.0 - smoothstep(${f(EDGE_PX)}, ${f(EDGE_PX + 1)}, px)) * firm;
  float inner = (1.0 - smoothstep(${f(2 * EDGE_PX + 1)}, ${f(2 * EDGE_PX + 2)}, px)) * firm * (1.0 - edge);
  c = mix(c, ink, inner);
  a = mix(a, ${f(CASING_ALPHA)}, inner);
  c = mix(c, mix(tint, vec3(1.0), 0.7), edge);
  a = mix(a, ${f(EDGE_ALPHA)}, edge);
  out_FragColor = vec4(c * u_light, min(1.0, a * u_opacity));
}
`
