// client/scene/cloudShaders.ts
// The cloud volume's two shaders (cloudVolume.ts makes the pass of them and gives them their numbers: its setHazards, setAhead and
// fade are named below), and the numbers written into them.
// The pass is two stages, both on the scene's own colour:
// - the march, at half the size (scale: marchPace.ts makes it coarser when the frames are slow): the ray from the depth buffer (as
//   groundFog.ts reads it), walked in at most 128 steps. Through clear air it strides: to the heights of the next band that has
//   weather, or as far as the clear-air map (survey) says that band's cover is, whichever is further. Where it may meet cloud it
//   searches in steps that grow with the distance (over or under a layer, as long as the height between allows), and a step that lands
//   in cloud goes back: the cloud's near side is found (to a thirty-second of the step), and the cloud is walked in small steps from
//   there, longer ones where it is thin. Neighbouring pixels start their search a quarter of a step apart, in blocks of 2 × 2, and the
//   mix lays the four together: what one pixel's steps pass over the next one's find, with no random jitter, so no grain. The noise's
//   fine octaves fade where a step, or a far pixel, is too coarse to follow them. It gives the weather's colour, premultiplied, and
//   how much it covers. (Before the strides a ray near weather spent its steps on empty air, and what it met after that it read in
//   steps twenty times too long, by chance: a stipple at every ragged edge.)
// - the mix, at full size: the march laid over the scene, each pixel from the nine march pixels round it, weighed so that the four
//   starts count alike and the mix changes evenly from pixel to pixel (no march pixel shows as a block), those that saw about the
//   same depth weighing most (so the aircraft's outline stays sharp against cloud); and under it the clouds' shadows on what is
//   ground.
// The shader works in a frame of its own, so that it holds no large number: km east, north and up from the field's middle at sea level
// (localFrame; JS gives it u_eyeToLocal each frame, worked out in doubles). A point's height over the sea is z + (x² + y²) / 2R, and
// its place on the field's flat map follows from x and y (localToMap, the shader's toMap: to 40 m within 150 km, 100 m in the corners).
// Three images, the volume's own on the card (gpuImage.ts: their bytes are there as they are; the atlas's alpha is data, and nothing
// may premultiply it): the field's atlas (wxField.ts fieldAtlas); a noise volume of 64³ packed as 64 tiles (noiseAtlas); the clear-air
// map (survey). The density at a point
// is wxField.ts sampleField's (each band whose heights hold the point, cover × profile, the largest winning and giving the severity),
// taken where a domain warp puts the point and eroded by four octaves of the noise, as the approved mock does
// (.planning/mocks/chase-weather-mocks.html). In the two volume looks it is drawn times 1.5 and capped at 1 (GAIN, the mock's: bodies
// are solid, their edges crisp), so what is drawn is denser than sampleField's number; the blocks use the number as it is. The noise is
// fixed to the Earth, not to the field: a field built round another place keeps every cloud's detail.
// Three looks, switched on the fly (look): natural (sunlit white to shadowed blue-grey, by two samples toward the light; darker with
// severity), severity (the same, tinted by the severity's colour from light rain up) and blocks (the sky in cells of 1 × 1 km and 500 m
// of height, a cell solid when the field's cover at its middle is over 0.28: faces shaded by the way they face, darker edges, the
// severity's colour; from inside a body, a mist of its colour). The blocks are walked cell by cell: each step ends on the cell's far
// face, by the ray's way on the field's map at that cell, so the Earth's curve is in it and a face is exact as far as the walk gets:
// 128 cells where weather is near, and strides between. (The plan was steps of a quarter cell and a bisect back to the face: those
// reach 12 to 27 km, and a storm may stand 100 km off.) Under a
// cloud of light rain or more a thin veil of rain, streaked, falls to the ground. The cover fades to nothing between 130 and 150 km
// from the aircraft (fade). By night the light is dimmed as cloudField.ts sunBrightness says, and the shadows go.
// The same march draws what is see-through and thin, so that it sorts with the cloud (Cesium's own lines and volumes, drawn before the
// pass, would be painted over by any cloud behind them): the hazard areas' edges (setHazards) and the level slice (setAhead), each
// the approved mock's. A ray first finds where it meets each of them (at most 8: its events), puts them in order, and lays each
// over what it has gathered when its walk passes it; what is left is laid at the end, short of what the pixel shows.
// - A hazard area's edge is a wall over the line between two corners of its ring, from the area's base to its top, in one of three
//   styles (u_hazard): a curtain (a line at the top and one at the base, between them a veil strongest at the top and gone a quarter
//   of the way up, in pleats 2 km wide), a fence (the two lines and a post every 4 km) or a box (a faint fill, lines at its edges, and
//   the area's top face). The edges nearest the aircraft, at most 48, are given as an image of bytes (wxEdges.ts hazardEdges,
//   packEdges: two bytes a number, read with texelFetch).
// - The level slice is the field's cover at the aircraft's height within 60 km of it, filled in its severity's colour with a brighter
//   rim, with rings at 10, 20 and 40 km.
// - These are drawn at the march's half size: a line's widths are the mock's in the march's pixels, each two of the screen's.
// The track line (setAhead) is the mix's, at full size: the way ahead (wxAhead.ts aheadPath, seven places, given every frame as
// numbers) as a line two pixels wide: white-blue in clear air and, thicker, the severity's colour where the field's cover is over
// 0.3. Its minutes are the app's labels: a wider bead at each could not be made out under its label, and is not drawn. It is hidden
// by what is solid in front of it, and laid over the cloud. (In
// the march it was a soft band of six to eight pixels, and the cloud it marks hid its coloured stretch from outside; the march at
// full size draws it as thin, and on the check machine one frame in twenty then took 40 ms, not 19.) It and the slice read the
// field's cover as it is (not times GAIN), as the status line does (wxAhead.ts).
// ponytail: the track line is laid over the cloud, not sorted with it: where it passes behind a storm's tower it is drawn over the
// tower. Upgrade: the line as an event of the march, at the mix's size (the march would have to hand on the depth it hides to).
// ponytail: sea level is the geoid's at the field's middle, over the whole field (it differs by a few metres across it), and the blocks'
// cells and the rain's streaks are laid in the field's frame: they shift when the field is built round another place. Upgrade: a grid
// fixed to the Earth.
// ponytail: a band's shadow is its cover where the light's ray meets the band's lowest base, not the cloud's whole height marched
// toward the light. Upgrade: a few steps up the ray.
// ponytail: a ray keeps the first 8 events it finds (the aids, then the edges as they are listed, the nearest area first), not the 8
// nearest to it. Upgrade: a longer list, or the farthest given up for a nearer one.
import { NOISE_COLS, NOISE_KM, NOISE_MEAN, NOISE_N, NOISE_ROWS, NOISE_TILE } from './cloudNoise.ts'
import { AHEAD_MIN } from './wxAhead.ts'
import { ALONG_Q, EDGE_KM, EDGE_Q, EDGE_TEXELS, HEIGHT_Q, MAX_EDGES, POST_KM } from './wxEdges.ts'
import { BANDS, FALL, FALL_MAX_M, FIELD_KM, FIELD_N, HEIGHT_MAX_M, RISE, RISE_MAX_M, TOWER_BAND } from './wxField.ts'
import { NEAR_KM, NEAR_MAX_KM } from './wxSurvey.ts'

export const R_KM = 6371 // the sphere the heights curve over
export const ATLAS_W = 3 * FIELD_N // wxField.ts fieldAtlas: 3 × 2 tiles
export const ATLAS_H = 2 * FIELD_N
const WARP_KM = 2.2 // the warp moves a sample no further than this over the map (1.525 km each way)
// What the march takes off the clear-air map's word before it strides: the word is mixed from the four cells round a place, each as
// much as half a cell's diagonal from it, and the sample taken there is read where the warp puts it. (A block's middle, 0.7 km from
// its corner, and the light's two samples, 1.3 km off at most, are nearer than the warp's reach.)
const CLEAR_MARGIN_KM = Math.ceil((Math.SQRT1_2 * NEAR_KM + WARP_KM) * 10) / 10
const STRIDE_KM = 20 // the longest stride: the ray's height is taken to change evenly along it, and over this far the Earth's curve adds 30 m
const SEARCH = 0.035 // a search step is this share of the distance from the camera (SEARCH_MIN_KM at least) …
const SEARCH_MIN_KM = 0.15
const SEARCH_UP_KM = 0.25 // … and climbs or sinks no more than this: the thinnest cloud is 0.45 km
// Over or under a layer's cloud a search step may be as long as the height between them allows, taking the cloud's top and base to
// rise or sink no steeper than this (1: 45°; the warp bends them by a third of that, and a puff next to a lower one stands as a
// wall, but is wider than it is taller). Not by a tower: its sides are walls, and its anvil overhangs.
const SLOPE = 1
const STAY_KM = 0.4 // out of a cloud, the ray keeps to small steps this far
const STEPS = 128 // of the march, at most (the mock's)
// Cover times profile times GAIN under this is no cloud: the noise would have to be under a fifth to leave any of it, which it is at
// fewer than one place in a thousand (tested). The march searches up to where there is more, not through this thin rind.
const ERODE = 0.74 // the noise, 0 … 1, eats this much of the cover at most (the mock's)
const THIN_STEP = 0.25 // in thin cloud a step is as long as hides this much (an optical depth), four small steps at most
const THIN = ERODE * 0.2
/** The cover fades to nothing between these, km from the aircraft: what Weather3D reads its sources by. */
export const REACH_KM: readonly [number, number] = [130, 150]
export const RIM_KM: readonly [number, number] = [150, 158] // and at the square's rim (what fieldPlace.ts places a field by)
const BOX_KM = 165 // the ray is clipped to this in the frame: the field's 160 km and room for the map's bend
/** A ray is walked only over the box the field's cover stands in (wxSurvey.ts survey), grown by this, km: the margin the clear-air map is read with, and the room for the map's bend. */
export const BOX_PAD_KM = CLEAR_MARGIN_KM + BOX_KM - FIELD_KM / 2
const HOLD_KM = 0.01 // a sample this near a band's heights is read from the field, not judged by its height alone (the fine warp moves its height on the curved Earth by 8 m at most)
const GAIN = 1.5 // the field's cover × profile is drawn times this, capped at 1 (the mock's): bodies are solid, their edges crisp
const SIGMA = 7 // extinction per km of full cloud (the mock's) …
const SIGMA_STORM = 11 // … and in heavy rain and storms
const RAIN = 0.1 // the rain's veil: this share of its cloud's extinction …
const RAIN_MOST = 0.5 // … and however much rain the ray passes, it hides no more than this of what is behind: a veil, not a wall
const FILL = 0.28 // blocks: a cell is solid when the field's cover at its middle is over this
const SHADOW_LOW = 0.26 // the light's ray is taken no flatter than 15° for the shadows (a 2° sun would lay them 40 km off)
// The mix: a march pixel weighs 1 / (1 + (its depth's difference from the pixel's / this)²). Depths are logarithmic: 0.01 is a quarter
// farther or nearer, so the ground's own slope changes nothing, and an aircraft against the cloud behind it changes everything.
const DEPTH_SAME = 0.01
const EVENTS = 8 // what is see-through and thin on one ray, at most (the mock's)
export const PATH_N = AHEAD_MIN + 1 // the way ahead's places: the aircraft, then each minute

const glsl = (n: number): string => (Number.isInteger(n) ? `${n}.0` : String(n))

/**
 * What both shaders share: the frame's place on the map, the reach, a band's texel, the field's cover at a place, the severity's
 * colour. Lengths are km. Each shader declares the uniforms these read (u_field, u_map, u_plane, u_lo, u_hi).
 */
const SHARED = `
const float INV_R = ${glsl(1 / R_KM)};
const float FIELD_N = ${glsl(FIELD_N)};
const float FIELD_KM = ${glsl(FIELD_KM)};
const vec2 ATLAS = vec2(${glsl(ATLAS_W)}, ${glsl(ATLAS_H)});
const float HEIGHT_MAX = ${glsl(HEIGHT_MAX_M / 1000)};

// A place of the frame as the field maps it: km east and north on its flat map, km above the sea (cloudVolume.ts localToMap).
vec3 toMap(vec3 p) {
  float h = p.z + dot(p.xy, p.xy) * (0.5 * INV_R);
  vec2 e = p.xy * (1.0 - h * INV_R);
  vec2 e2 = e * e;
  float t = u_map.z, c = INV_R * INV_R;
  float east = e.x * (1.0 + t * e.y + (t * t + 0.5 * c) * e2.y + (c / 6.0 - t * t / 3.0) * e2.x);
  float north = e.y - 0.5 * t * e2.x * (1.0 + t * e.y) + (c / 6.0) * e2.y * e.y;
  return vec3(u_map.x * east, u_map.y * north, h);
}

// How much of the field shows at a place of the map: all of it near the aircraft, none far from it or at the square's rim.
float reach(vec2 m) {
  vec2 a = abs(m);
  return (1.0 - smoothstep(${glsl(REACH_KM[0])}, ${glsl(REACH_KM[1])}, length(m - u_plane))) * (1.0 - smoothstep(${glsl(RIM_KM[0])}, ${glsl(RIM_KM[1])}, max(a.x, a.y)));
}

// Band b's texel at a place of the map, mixed from the four round it: cover, base and top (over HEIGHT_MAX), severity (over 3).
// The image's first row is the texture's first, v = 0 (cloudVolume.ts tileUv).
vec4 band(int b, vec2 m) {
  vec2 c = clamp(m * (FIELD_N / FIELD_KM) + (FIELD_N - 1.0) * 0.5, 0.0, FIELD_N - 1.0) + 0.5;
  vec2 px = vec2(mod(float(b), 3.0), floor(float(b) / 3.0)) * FIELD_N + c;
  return textureLod(u_field, px / ATLAS, 0.0);
}

// The severity's colour: cloud, light rain, heavy rain, thunderstorm (#f2f5f8, #58a6ff, #ffbe3d, #ff4d3d).
vec3 sevCol(float s) {
  vec3 c0 = vec3(0.95, 0.96, 0.97), c1 = vec3(0.345, 0.65, 1.0), c2 = vec3(1.0, 0.745, 0.24), c3 = vec3(1.0, 0.3, 0.24);
  return s < 1.0 ? mix(c0, c1, s) : s < 2.0 ? mix(c1, c2, s - 1.0) : mix(c2, c3, clamp(s - 2.0, 0.0, 1.0));
}

// wxField.ts profile(): 0 … 1 across a band's cloud at height h, from base b to top t.
float prof(float h, float b, float t) {
  float d = t - b;
  if (d <= 0.0) return 0.0;
  float rise = min(${glsl(RISE)} * d, ${glsl(RISE_MAX_M / 1000)});
  float fall = min(${glsl(1 - FALL)} * d, ${glsl(FALL_MAX_M / 1000)});
  return smoothstep(0.0, rise, h - b) * (1.0 - smoothstep(t - fall, t, h));
}

// The field's cover at a place of the map as it is (wxField.ts sampleField: the most cloud any band has there, 0 to 1), and its
// severity; within the reach.
float fieldCover(vec3 m, out float sev) {
  sev = 0.0;
  if (abs(m.x) > 0.5 * FIELD_KM || abs(m.y) > 0.5 * FIELD_KM) return 0.0;
  float most = 0.0;
  for (int b = 0; b < ${BANDS}; b++) {
    if (u_lo[b] > u_hi[b] || m.z < u_lo[b] || m.z > u_hi[b]) continue;
    vec4 f = band(b, m.xy);
    float d = f.r * prof(m.z, f.g * HEIGHT_MAX, f.b * HEIGHT_MAX);
    if (d > most) { most = d; sev = f.a * 3.0; }
  }
  return most * reach(m.xy);
}
`

/**
 * The march (see the header). Its output is the weather's colour, premultiplied, and how much of the pixel it covers.
 */
export const MARCH_SHADER = `
uniform sampler2D depthTexture;
uniform sampler2D u_field; // wxField.ts fieldAtlas
uniform sampler2D u_noise; // noiseAtlas
uniform sampler2D u_near; // survey: where each band has weather, coarsely
uniform mat4 u_eyeToLocal; // eye metres to the frame, km
uniform mat4 u_noiseFrame; // the frame to the noise's own, fixed to the Earth, in periods of ${NOISE_KM} km
uniform vec3 u_map; // toMap's scale east and north, and tan(latitude) / R
uniform float u_lo[${BANDS}]; // each band's lowest base, km
uniform float u_hi[${BANDS}]; // and highest top
uniform float u_floor[${BANDS}]; // how low it is read: its lowest base, or the sea when rain falls from it
uniform float u_top; // the highest top of all (with no cloud: under the ground)
uniform vec2 u_plane; // the aircraft on the map: the reach is round it
uniform float u_look; // 0 natural, 1 severity colours, 2 blocks
uniform float u_light; // the Sun's brightness: 1 by day
uniform sampler2D u_edges; // packEdges: the hazard areas' edges, ${EDGE_TEXELS} texels each, in one row
uniform float u_edgeCount; // how many of them
uniform vec3 u_edgeBound; // a circle on the frame's ground that holds them all: its middle and its radius, km (wxEdges.ts edgeBound)
uniform vec4 u_box; // the box the field's cover stands in, in the frame: west, south, east, north, km (with the margin: BOX_PAD_KM)
uniform float u_hazard; // how they are drawn: 0 a curtain, 1 a fence, 2 a box
uniform vec3 u_aircraft; // the aircraft in the frame, km: the level slice is at its height, round it
uniform vec2 u_aids; // 1 where it shows: x the track line (the mix draws it), y the level slice
in vec2 v_textureCoordinates;
${SHARED}
const vec3 HAZE = vec3(0.66, 0.76, 0.88); // the air's colour over a long way
const float GAIN = ${glsl(GAIN)};
const float NEAR_MAX = ${glsl(NEAR_MAX_KM)}; // the clear-air map's 1 is this far, km
const float MARGIN = ${glsl(CLEAR_MARGIN_KM)}; // and this is taken off its word: the map's coarseness and the warp's reach
const float STRIDE = ${glsl(STRIDE_KM)}; // the longest stride through clear air
const float THIN = ${glsl(THIN)}; // cover times profile times GAIN under this is no cloud: the noise eats it all
const float NOISE_MEAN = ${glsl(NOISE_MEAN)};
const float HOLD = ${glsl(HOLD_KM)};
const float PAD = 1.0; // the warp moves a sample's height by 0.9 km at most
const vec3 CELL = vec3(1.0, 1.0, 0.5); // blocks: a cell's size east, north and up
const float EDGE_KM = ${glsl(EDGE_KM)}; // packEdges: an edge's end is packed over this far each way,
const float EDGE_Q = ${glsl(EDGE_Q)}; // this far apart;
const float HEIGHT_Q = ${glsl(HEIGHT_Q)}; // a height this far apart, from the sea;
const float ALONG_Q = ${glsl(ALONG_Q)}; // and likewise where a cut edge's posts count from
const float POST_KM = ${glsl(POST_KM)}; // a fence's posts; a curtain's pleats are half of it wide

// What is see-through and thin on this ray (a hazard area's wall or top face, the level slice): each a place along the ray and a
// colour, premultiplied, with how much it covers. gN are held; gI of them are laid over what the ray has gathered.
float gT[${EVENTS}];
vec4 gC[${EVENTS}];
int gN = 0;
int gI = 0;

// Extinction per km of full cloud: more in heavy rain and storms.
float sigma(float sev) { return sev > 1.5 ? ${glsl(SIGMA_STORM)} : ${glsl(SIGMA)}; }

// The clear-air map's word for band b (survey), less the margin: how far the ray may go over the map, km, before the band's cover may
// be met; 0 or under: it may be here.
float clearOf(vec4 nr, int b) { return (b == 0 ? nr.r : b == 1 ? nr.g : b < 4 ? nr.b : nr.a) * NEAR_MAX - MARGIN; }

// What a ray may meet where it is, at the height h, climbing dh per km and going hs km over the map per km (nr: the clear-air map
// there; pad: how far from h a sample may be read): 2, cloud (a band holds the height and its cover is within the margin); 1, only
// rain (under such a band, when rain falls from it); 0, nothing. room: how far the ray can go before it may meet a band it does not
// meet here: until it is in the band's heights or, if that is further, until the band's cover is within the margin (STRIDE at most).
// edge: how far to the cloud's heights of a band whose rain the ray is in (1e9: never).
int meets(vec4 nr, float h, float dh, float hs, float pad, out float room, out float edge) {
  room = STRIDE;
  edge = 1.0e9;
  int kind = 0;
  for (int b = 0; b < ${BANDS}; b++) {
    if (u_lo[b] > u_hi[b]) continue;
    float lo = u_lo[b] - pad, hi = u_hi[b] + pad, low = min(u_floor[b], lo);
    float up = h > hi ? (dh < 0.0 ? (hi - h) / dh : 1.0e9) : h < low ? (dh > 0.0 ? (low - h) / dh : 1.0e9) : 0.0;
    float f = max(up, clearOf(nr, b) / hs);
    if (f > 0.0) room = min(room, f);
    else if (h >= lo) kind = 2;
    else {
      if (kind < 1) kind = 1;
      if (dh > 0.0) edge = min(edge, (lo - h) / dh);
    }
  }
  return kind;
}

// The field at a place of the map (wxField.ts sampleField): the most cloud any band has there, 0 … 1, and its severity. rain: under a
// band's cloud of light rain or more, how much rain falls there and its severity. nr: the clear-air map where the ray is (a band whose
// cover is beyond the margin is not read). gap: how far the place is, in height, over or under the cloud of every band that has cover
// near (0: beside a cloud, in one's heights, or by a tower; 1e9: no band has any near).
float cover(vec3 m, vec4 nr, out float sev, out vec2 rain, out float gap) {
  sev = 0.0;
  rain = vec2(0.0);
  gap = 1.0e9;
  if (abs(m.x) > 0.5 * FIELD_KM || abs(m.y) > 0.5 * FIELD_KM) return 0.0;
  float most = 0.0;
  for (int b = 0; b < ${BANDS}; b++) {
    if (u_lo[b] > u_hi[b] || clearOf(nr, b) > 0.0) continue;
    if (m.z > u_hi[b]) { gap = min(gap, m.z - u_hi[b]); continue; }
    if (m.z < u_floor[b]) { gap = min(gap, u_floor[b] - m.z); continue; }
    vec4 f = band(b, m.xy);
    if (f.r <= 0.0 || b == ${TOWER_BAND}) gap = 0.0;
    if (f.r <= 0.0) continue;
    float base = f.g * HEIGHT_MAX, top = f.b * HEIGHT_MAX;
    if (m.z < base) {
      float r = f.r * smoothstep(0.5, 1.0, f.a * 3.0);
      if (r > rain.x) rain = vec2(r, f.a * 3.0);
      gap = min(gap, base - m.z);
      continue;
    }
    gap = min(gap, max(m.z - top, 0.0));
    float d = f.r * prof(m.z, base, top);
    if (d > most) { most = d; sev = f.a * 3.0; }
  }
  float k = reach(m.xy);
  rain.x *= k;
  return most * k;
}

// The cloud at a place of the frame, with no detail: what the light is dimmed by on its way.
float body(vec3 p, vec4 nr) {
  float s, g;
  vec2 r;
  return min(1.0, GAIN * cover(toMap(p), nr, s, r, g));
}

// The noise at q, in its periods: slice ⌊z⌋ and the next from one read (R and G), mixed; a tile's rim makes the read wrap.
float noise(vec3 q) {
  vec3 f = fract(q) * ${glsl(NOISE_N)};
  float z = min(floor(f.z), ${glsl(NOISE_N - 1)});
  vec2 px = vec2(mod(z, ${glsl(NOISE_COLS)}), floor(z / ${glsl(NOISE_COLS)})) * ${glsl(NOISE_TILE)} + 1.0 + f.xy;
  vec2 v = textureLod(u_noise, px / vec2(${glsl(NOISE_COLS * NOISE_TILE)}, ${glsl(NOISE_ROWS * NOISE_TILE)}), 0.0).rg;
  return mix(v.r, v.g, f.z - z);
}

// Four octaves, of 32, 10.7, 4 and 1.4 km (the mock's, with a little more weight on the two fine ones: the field's small clouds are a
// few texels wide, and their edges are the noise's to draw). The noise's lumps are about three of its 32 cells across: 3 km, 1 km,
// 0.35 km and 0.12 km in the four octaves. lod: what a sample stands for, km: the march's step there, or three march pixels' width
// if that is more. An octave whose lumps are smaller than that goes to the noise's mean (fading from half their size): a long step,
// or a far pixel, then reads a smoother cloud, the same from pixel to pixel, where it would read a chance place of the detail (a
// grain).
float fbm(vec3 q, float lod) {
  float fine = lod < 0.12 ? mix(noise(q * 23.0), NOISE_MEAN, smoothstep(0.06, 0.12, lod)) : NOISE_MEAN;
  float mid = lod < 0.35 ? mix(noise(q * 8.0), NOISE_MEAN, smoothstep(0.17, 0.35, lod)) : NOISE_MEAN;
  float wide = lod < 1.0 ? mix(noise(q * 3.0), NOISE_MEAN, smoothstep(0.5, 1.0, lod)) : NOISE_MEAN;
  return 0.42 * noise(q) + 0.27 * wide + 0.19 * mid + 0.12 * fine;
}

// The place the field is read at for p: moved by up to 1.3 km each way and 0.9 km up or down, smoothly (over 16 km), so that a disc
// is not a disc (the wide warp), and by 0.22 km more each way over 4 km, with no change of height, so that the field's texels do not
// show in a small cloud's outline (the fine warp).
vec3 warpWide(vec3 p, vec3 q) {
  float a = noise(q * 2.0) - 0.5, b = noise(q * 2.0 + vec3(0.37, 0.11, 0.53)) - 0.5;
  return p + vec3(a, b, 0.35 * (a + b)) * 2.6;
}
vec3 warpFine(vec3 pw, vec3 q) {
  float c = noise(q * 8.0 + vec3(0.71, 0.23, 0.47)) - 0.5, d = noise(q * 8.0 + vec3(0.19, 0.83, 0.61)) - 0.5;
  return pw + vec3(c, d, 0.0) * 0.45;
}
vec3 warp(vec3 p, vec3 q) { return warpFine(warpWide(p, q), q); }

// Whether the field may hold cloud or rain at the height the wide warp has put a sample (pw; the fine warp leaves the height): some
// band whose cover is within the margin (nr: the clear-air map where the ray is) holds that height, down to its rain's floor. When
// none does the field need not be read there, nor the fine warp's noise: gap is then what cover() would say, how far the sample is
// over or under the bands near. (A ray near weather samples the bands' heights and 1 km over and under them, the warp's reach: more
// than half of those samples end here.)
bool holds(vec3 pw, vec4 nr, out float gap) {
  float h = pw.z + dot(pw.xy, pw.xy) * (0.5 * INV_R);
  gap = 1.0e9;
  bool any = false;
  for (int b = 0; b < ${BANDS}; b++) {
    if (u_lo[b] > u_hi[b] || clearOf(nr, b) > 0.0) continue;
    if (h > u_hi[b] + HOLD) gap = min(gap, h - u_hi[b]);
    else if (h < u_floor[b] - HOLD) gap = min(gap, u_floor[b] - h);
    else any = true;
  }
  return any;
}

// Where along the ray its height over the sea is H: the two places (the height is a parabola along it), the nearer first; none:
// (1e9, −1e9). The roots the stable way: no cancellation in the shader's floats.
vec2 atHeight(vec3 ro, vec3 rd, float H) {
  float a = max(dot(rd.xy, rd.xy), 1.0e-9) * (0.5 * INV_R);
  float b = rd.z + dot(ro.xy, rd.xy) * INV_R;
  float c = ro.z + dot(ro.xy, ro.xy) * (0.5 * INV_R) - H;
  float disc = b * b - 4.0 * a * c;
  if (disc < 0.0) return vec2(1.0e9, -1.0e9);
  float q = -0.5 * (b + (b >= 0.0 ? 1.0 : -1.0) * sqrt(disc));
  float r0 = q / a, r1 = q != 0.0 ? c / q : r0;
  return vec2(min(r0, r1), max(r0, r1));
}

// The rain's colour for the look: grey-blue, or its severity's.
vec3 rainCol(float sev) {
  vec3 c = vec3(0.5, 0.56, 0.66);
  return u_look < 0.5 ? c : u_look < 1.5 ? mix(c, sevCol(sev), 0.62) : sevCol(sev) * 0.85;
}

// The rain's streaks at a place of the frame, t km along the ray: shafts a few km wide, and thin upright lines in them near the
// camera (far off those would shimmer).
float streaks(vec3 p, float t) {
  float shaft = smoothstep(0.25, 0.75, noise(vec3(p.xy / 19.0, p.z / 60.0)));
  float line = smoothstep(0.3, 0.7, noise(vec3(p.xy / 3.2, p.z / 40.0)));
  return (0.25 + 1.5 * shaft) * mix(0.3 + 1.4 * line, 1.0, smoothstep(6.0, 18.0, t));
}

// How far a colour t km off has gone to the air's: by 63 % at 120 km (the mock's) in the natural look, at twice that where the colour is
// the severity's and has to be read from afar.
float hazed(float t) { return 1.0 - exp(-t / (u_look < 0.5 ? 120.0 : 240.0)); }

// One more event: t km along the ray, the colour c covering a of the pixel. One that covers next to nothing, or lies behind, is none.
void ev(float t, vec3 c, float a) {
  if (gN < ${EVENTS} && a > 0.004 && t > 0.0) {
    gT[gN] = t;
    gC[gN] = vec4(c * a, a);
    gN++;
  }
}

// The events put in the ray's order, the nearest first.
void sortEvents() {
  for (int i = 1; i < ${EVENTS}; i++) {
    if (i >= gN) break;
    float t = gT[i];
    vec4 c = gC[i];
    int j = i - 1;
    for (int k = 0; k < ${EVENTS}; k++) {
      if (j < 0) break;
      if (gT[j] <= t) break;
      gT[j + 1] = gT[j];
      gC[j + 1] = gC[j];
      j--;
    }
    gT[j + 1] = t;
    gC[j + 1] = c;
  }
}

// The events nearer than t that are not laid yet, laid over what the ray has gathered so far: they take what it leaves.
void lay(float t, inout vec3 col, inout float A) {
  for (int k = 0; k < ${EVENTS}; k++) {
    if (gI >= gN) break;
    if (gT[gI] >= t) break;
    col += (1.0 - A) * gC[gI].rgb;
    A += (1.0 - A) * gC[gI].a;
    gI++;
  }
}

// Two bytes of the edges' image as the number they hold, 0 to 65535 (wxEdges.ts packEdges: the high byte first).
float word(vec2 b) {
  vec2 n = floor(b * 255.0 + 0.5);
  return n.x * 256.0 + n.y;
}

// The hazard areas' edges (packEdges), each a wall over the line between its two ends, from its area's base to its top, in the style
// chosen (the mock's). For a box the area's top face is laid too: where the ray meets the top height, if that place is inside the
// area's rings, which it is when a line from it eastward crosses an odd number of the area's edges (they are listed together, the
// first of them marked; an area with an edge missing has no top face).
void hazards(vec3 ro, vec3 rd, float tO, float pix) {
  bool box = u_hazard > 1.5;
  bool face = false; // the area being read has a top face this ray can meet
  bool inside = false; // and meets it inside the area, by the edges read so far
  float faceT = 0.0;
  vec2 faceP = vec2(0.0);
  vec3 faceC = vec3(0.0);
  for (int k = 0; k < ${MAX_EDGES}; k++) {
    if (float(k) >= u_edgeCount) break;
    int x = k * ${EDGE_TEXELS};
    vec4 ea = texelFetch(u_edges, ivec2(x, 0), 0);
    vec4 eb = texelFetch(u_edges, ivec2(x + 1, 0), 0);
    vec2 a = vec2(word(ea.rg), word(ea.ba)) * EDGE_Q - EDGE_KM;
    vec2 b = vec2(word(eb.rg), word(eb.ba)) * EDGE_Q - EDGE_KM;
    if (box) {
      vec4 ec = texelFetch(u_edges, ivec2(x + 3, 0), 0);
      float flags = floor(ec.a * 255.0 + 0.5);
      if (mod(flags, 2.0) > 0.5) {
        // the first edge of an area: the area before it is read, and its top face laid if the ray met it; then this area's
        if (face && inside) ev(faceT, faceC, 0.1);
        vec2 hs = atHeight(ro, rd, word(texelFetch(u_edges, ivec2(x + 2, 0), 0).ba) * HEIGHT_Q);
        faceT = hs.x > 0.0 ? hs.x : hs.y;
        face = flags > 1.5 && faceT > 0.0 && faceT < tO;
        inside = false;
        faceP = ro.xy + rd.xy * faceT;
        faceC = ec.rgb;
      }
      if (face && ((a.y > faceP.y) != (b.y > faceP.y)) && faceP.x < (b.x - a.x) * (faceP.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    vec2 e = b - a;
    vec2 n = vec2(e.y, -e.x);
    float den = dot(n, rd.xy);
    if (abs(den) < 1.0e-6) continue;
    float t = dot(n, a - ro.xy) / den;
    if (t <= 0.0 || t > tO) continue;
    vec3 h = ro + rd * t;
    float u = dot(h.xy - a, e) / dot(e, e);
    if (u < 0.0 || u > 1.0) continue;
    vec4 eh = texelFetch(u_edges, ivec2(x + 2, 0), 0);
    float base = word(eh.rg) * HEIGHT_Q;
    float top = word(eh.ba) * HEIGHT_Q;
    float hz = h.z + dot(h.xy, h.xy) * (0.5 * INV_R); // the place's height over the sea
    if (hz < base || hz > top) continue;
    float len = length(e);
    float s = u * len + word(texelFetch(u_edges, ivec2(x + 4, 0), 0).rg) * ALONG_Q; // km along the edge from the corner it began at
    float lw = max(0.06, 2.2 * pix * t);
    float up = 1.0 - smoothstep(lw * 0.5, lw, top - hz);
    float low = 1.0 - smoothstep(lw * 0.5, lw, hz - base);
    float al;
    if (box) {
      float corner = 1.0 - smoothstep(lw * 0.5, lw, min(u, 1.0 - u) * len);
      al = max(0.11, 0.34 * max(max(up, low), corner));
    } else if (u_hazard > 0.5) {
      float post = 1.0 - smoothstep(lw * 0.4, lw * 0.9, abs(fract(s / POST_KM + 0.5) - 0.5) * POST_KM);
      al = max(max(up * 0.9, low * 0.6), post * 0.72);
    } else {
      float pleat = 0.78 + 0.22 * step(0.5, fract(s / (0.5 * POST_KM)));
      float v = (hz - base) / max(top - base, 1.0e-3); // the share of the way up
      al = max(max(up * 0.9, low * 0.6), 0.36 * pow(smoothstep(0.25, 1.0, v), 1.4) * pleat);
    }
    ev(t, texelFetch(u_edges, ivec2(x + 3, 0), 0).rgb, al);
  }
  if (face && inside) ev(faceT, faceC, 0.1);
}

// The level slice (the mock's): where the ray meets the aircraft's height within 60 km of it, the field's cover there, filled in its
// severity's colour with a brighter rim; rings at 10, 20 and 40 km; fading out at the edge.
void slice(vec3 ro, vec3 rd, float tO, float pix) {
  vec2 hs = atHeight(ro, rd, u_aircraft.z + dot(u_aircraft.xy, u_aircraft.xy) * (0.5 * INV_R));
  float t = hs.x > 0.0 ? hs.x : hs.y;
  if (t <= 0.0 || t >= tO) return;
  vec3 h = ro + rd * t;
  float r = length(h.xy - u_aircraft.xy);
  if (r >= 60.0) return;
  float sev;
  float d = fieldCover(toMap(h), sev);
  float lw = max(0.05, 1.6 * pix * t);
  float fill = smoothstep(0.22, 0.4, d);
  float rim = fill * (1.0 - smoothstep(0.4, 0.9, d));
  float ring = max(max(1.0 - smoothstep(lw * 0.5, lw, abs(r - 10.0)), 1.0 - smoothstep(lw * 0.5, lw, abs(r - 20.0))), 1.0 - smoothstep(lw * 0.5, lw, abs(r - 40.0)));
  float fade = 1.0 - smoothstep(52.0, 60.0, r);
  ev(t, mix(vec3(0.8, 0.9, 1.0), sevCol(sev), fill), fade * max(max(0.05, ring * 0.34), max(fill * 0.5, rim * 0.85)));
}

void main() {
  out_FragColor = vec4(0.0);
  float depth = texture(depthTexture, v_textureCoordinates).r;
  vec4 eye = czm_windowToEyeCoordinates(v_textureCoordinates * czm_viewport.zw + czm_viewport.xy, depth);
  vec3 pe = eye.xyz / eye.w;
  float tO = depth >= 1.0 ? 1.0e9 : length(pe) * 0.001; // km to what the pixel shows; the sky: none
  vec3 ro = u_eyeToLocal[3].xyz;
  vec3 rd = normalize(mat3(u_eyeToLocal) * pe);
  vec3 sun = normalize(mat3(u_eyeToLocal) * czm_lightDirectionEC);
  float pix = 2.0 / (czm_projection[1][1] * czm_viewport.w); // a march pixel, radians

  // What is see-through and thin on this ray, the level slice first (should the list fill, it is in it), in the ray's order.
  gN = 0;
  gI = 0;
  if (u_aids.y > 0.5) slice(ro, rd, tO, pix);
  if (u_edgeCount > 0.5) {
    // only by a ray that passes over the circle the edges stand in, short of what the pixel shows
    vec2 w = u_edgeBound.xy - ro.xy;
    float along = dot(rd.xy, rd.xy);
    vec2 off = w - rd.xy * (along > 1.0e-12 ? clamp(dot(w, rd.xy) / along, 0.0, tO) : 0.0);
    if (dot(off, off) <= u_edgeBound.z * u_edgeBound.z) hazards(ro, rd, tO, pix);
  }
  sortEvents();

  // The part of the ray worth walking: under the highest top, over the box the cover stands in, short of what the pixel shows.
  vec2 top = atHeight(ro, rd, u_top + PAD);
  vec2 dir = vec2(abs(rd.x) < 1.0e-6 ? 1.0e-6 : rd.x, abs(rd.y) < 1.0e-6 ? 1.0e-6 : rd.y);
  vec2 ta = (u_box.xy - ro.xy) / dir, tb = (u_box.zw - ro.xy) / dir;
  vec2 tn = min(ta, tb), tf = max(ta, tb);
  float tS = max(max(tn.x, tn.y), max(top.x, 0.0));
  float tEnd = min(min(tf.x, tf.y), min(top.y, tO));
  if (tS >= tEnd && gN == 0) return; // no cloud to walk and nothing to lay (with only events, neither walk below takes a step)

  // Each march pixel starts a share of a step further on than its neighbour, the four of a 2 × 2 block a quarter apart: the mix
  // lays the four together, so what one pixel's steps pass over the next one's find.
  ivec2 pq = ivec2(gl_FragCoord.xy) & 1;
  float phase = float((pq.x * 2 + pq.y * 3) & 3) * 0.25;

  vec3 col = vec3(0.0);
  float A = 0.0;
  float tauR = 0.0; // the rain passed so far: its veil never hides more than RAIN_MOST of what is behind it
  float mist = 0.0, mistSev = 0.0; // blocks: the length of the ray inside the body the camera is in, and its severity

  if (u_look < 1.5) {
    // Clouds as volumes. The ray strides through clear air: to the heights of the next band that has weather, or as far as the
    // clear-air map says that band's cover is, whichever is further. Where it may meet cloud it is searched in steps that cannot pass
    // over a cloud unseen for long (over or under a cloud, as long as the height between them allows); a step that lands in cloud
    // goes back, the stretch before it is walked again in quarters, and the cloud's near side is then found by halving the last
    // quarter three times: the cloud is walked from its own edge, not from a step's place, so its shading is smooth from pixel to
    // pixel. (There too the four pixels of a block start a quarter of a small step apart: the noise is finer than the steps, and
    // their mean reads it four times as closely.) In cloud, where the noise has eaten it away, and for a little way past it, the
    // steps are small; smallest while little is hidden yet, where the light changes fast. A ray that has used three fifths of its
    // steps takes longer and longer ones (twenty times at the last), so that it ends coarser, not short; the noise's fine octaves
    // fade for a step too long to follow them (fbm), so a long step reads a smoother cloud and not a chance place of the detail.
    float t = tS + phase * max(${glsl(SEARCH_MIN_KM)}, ${glsl(SEARCH)} * tS);
    float tLast = t, fineTo = -1.0, walk = 0.03;
    float by = -1.0; // cloud was met short of here: no long steps yet (a cloud's edge is in folds, and long steps would catch some and not others)
    bool searched = false; // the last step was a search step
    bool edging = false; // walking back up to a cloud: its near side is still to find
    int used = 0; // steps taken, the halvings too
    float pace = 0.03; // the last step taken in cloud: the next sample's detail is read as coarsely (fbm)
    float hs = 1.04 * length(rd.xy) + 1.0e-4; // the ray's way over the map, km per km, at most
    for (int i = 0; i < ${STEPS}; i++) {
      if (t >= tEnd || A > 0.985 || used >= ${STEPS}) break;
      used++;
      float late = max(0.0, float(used) - ${glsl(STEPS * 0.6)}) / ${glsl(STEPS / 12)};
      float stretch = 1.0 + late * late;
      vec3 p = ro + rd * t;
      vec3 m = toMap(p);
      float dh = rd.z + dot(p.xy, rd.xy) * INV_R; // the ray's climb here, km per km
      vec4 nr = textureLod(u_near, m.xy / FIELD_KM + 0.5, 0.0);
      float room, edge;
      int kind = meets(nr, m.z, dh, hs, PAD, room, edge);
      if (kind == 0) {
        float least = max(${glsl(SEARCH_MIN_KM)}, ${glsl(SEARCH)} * t);
        bool up = t < fineTo; // walking back up to a cloud: in the walk's steps
        // A stride, to where the band's weather may begin; from there (or from here, when there is little room: the ray runs along
        // the rim of a band's margin, or between two, and strides would be many and short) a step as in a search, of the pixel's own
        // share: a stride ends at the same place for all four pixels of a block, and their searches should not.
        bool strode = room >= least;
        if (strode) t += room + 2.0e-3;
        tLast = t;
        t += up ? walk : (strode ? phase : 1.0) * max(${glsl(SEARCH_MIN_KM)}, ${glsl(SEARCH)} * t) * stretch;
        searched = !up;
        edging = up;
        continue;
      }
      vec3 q = (u_noiseFrame * vec4(p, 1.0)).xyz;
      float sev = 0.0, gap;
      vec2 rain = vec2(0.0);
      vec3 pw = warpWide(p, q);
      float dm = holds(pw, nr, gap) ? min(1.0, GAIN * cover(toMap(warpFine(pw, q)), nr, sev, rain, gap)) : 0.0;
      float small = clamp(0.018 * t, 0.03, max(0.1, 0.004 * t)); // a small step here: finer near the camera, where a pixel sees less
      float ds = clamp(0.018 * t, 0.03, max(0.1, 0.004 * t) + 0.6 * A) * stretch;
      if (dm > THIN) {
        if (searched && t > fineTo) { fineTo = t; walk = max(0.03, 0.25 * (t - tLast)); t = tLast + walk; searched = false; edging = true; continue; }
        searched = false;
        if (edging) {
          edging = false;
          float clear = tLast;
          for (int k = 0; k < 3; k++) {
            float mid = 0.5 * (clear + t);
            vec3 pm = ro + rd * mid;
            float s2, g2;
            vec2 r2;
            if (GAIN * cover(toMap(warp(pm, (u_noiseFrame * vec4(pm, 1.0)).xyz)), nr, s2, r2, g2) > THIN) t = mid;
            else clear = mid;
          }
          used += 3;
          t += phase * small; // from the edge found, each of the four pixels its share of a step in
          continue;
        }
        by = t + ${glsl(STAY_KM)};
        float n = fbm(q, max(pace, 3.0 * pix * t));
        float d = clamp((dm - n * ${glsl(ERODE)}) / (1.0 - n * ${glsl(ERODE)}), 0.0, 1.0);
        if (d <= 0.01) ds = min(ds, small * stretch); // eaten away by the noise here: steps that still find where it is not
        else {
          // thin cloud hides little in a step, and a ray through a long veil of it has many to take: longer ones, up to four small ones
          ds = max(ds, min(${glsl(THIN_STEP)} / (sigma(sev) * d), 4.0 * small) * stretch);
          float sh = exp(-(body(p + sun * 0.45, nr) * 1.1 + body(p + sun * 1.3, nr) * 1.6));
          vec3 c = mix(vec3(0.36, 0.42, 0.52), vec3(1.0, 0.98, 0.95), sh);
          c *= sev < 1.5 ? mix(1.0, 0.86, sev) : mix(0.8, 0.6, clamp(sev - 2.0, 0.0, 1.0));
          if (u_look > 0.5) c = mix(c, sevCol(sev) * (0.7 + 0.3 * sh), 0.62 * smoothstep(0.3, 0.7, sev));
          c = mix(c, HAZE, hazed(t)) * u_light;
          float a = 1.0 - exp(-d * sigma(sev) * min(ds, tEnd - t));
          lay(t, col, A);
          col += (1.0 - A) * a * c;
          A += (1.0 - A) * a;
        }
        pace = ds;
      } else {
        pace = small;
        if (t < fineTo) { ds = walk; searched = false; edging = true; } // walking up to the cloud a search step found
        else if (t < by) { ds = small * stretch; searched = false; } // just out of cloud
        else if (kind == 2) {
          // a search step: by the distance, climbing or sinking little; or, over or under a cloud, as far as the height between allows
          float least = ${glsl(SEARCH_MIN_KM)};
          ds = min(max(least, ${glsl(SEARCH)} * t), max(least, ${glsl(SEARCH_UP_KM)} / max(abs(dh), 1.0e-4)));
          ds = max(ds, min(gap / (abs(dh) + ${glsl(SLOPE)}), STRIDE)) * stretch;
          searched = true;
        }
        else { ds = min(min(max(0.12, 0.07 * t), room), edge) + 2.0e-3; searched = false; }
        if (rain.x > 0.0) {
          float tau = tauR + rain.x * streaks(p, t) * ${glsl(RAIN)} * sigma(rain.y) * min(ds, tEnd - t);
          float a = ${glsl(RAIN_MOST)} * (exp(-tauR) - exp(-tau));
          tauR = tau;
          lay(t, col, A);
          col += (1.0 - A) * a * mix(rainCol(rain.y), HAZE, hazed(t)) * u_light;
          A += (1.0 - A) * a;
        }
      }
      tLast = t;
      t += ds;
    }
  } else {
    // Clouds as blocks: the sky in cells, walked cell by cell where a band with weather near holds the height. The ray's way through
    // the cells is worked out again in each (the map's heights curve with the Earth), so each step ends on the cell's far face.
    float t = tS;
    bool inBody = false;
    vec3 face = vec3(0.0, 0.0, rd.z < 0.0 ? 1.0 : -1.0); // the face the ray came in by: a top or a bottom at first
    float tB = -1.0, sevB = 0.0;
    vec3 mB = vec3(0.0);
    float hs = 1.04 * length(rd.xy) + 1.0e-4; // the ray's way over the map, km per km, at most
    for (int i = 0; i < ${STEPS}; i++) {
      if (t >= tEnd) break;
      vec3 p = ro + rd * t;
      vec3 m = toMap(p);
      float dh = rd.z + dot(p.xy, rd.xy) * INV_R;
      vec4 nr = textureLod(u_near, m.xy / FIELD_KM + 0.5, 0.0);
      float room, edge, gap;
      int kind = meets(nr, m.z, dh, hs, 0.5 * CELL.z, room, edge);
      float sev;
      vec2 rain;
      float adv;
      bool filled = false;
      if (kind < 2) {
        // nothing here, or only rain: on to the next band's heights, or as far as the clear-air map vouches for
        adv = min(room, edge);
        if (kind == 1) { adv = min(adv, max(0.12, 0.07 * t)); cover(m, nr, sev, rain, gap); }
        else rain = vec2(0.0);
        inBody = false;
        face = vec3(0.0, 0.0, dh < 0.0 ? 1.0 : -1.0);
      } else {
        vec3 cell = floor(m / CELL);
        filled = cover((cell + 0.5) * CELL, nr, sev, rain, gap) > ${glsl(FILL)};
        if (i == 0 && filled && tS <= 0.0) { inBody = true; mistSev = sev; }
        if (filled && !inBody) { tB = t; sevB = sev; mB = m; break; }
        vec3 dm = vec3(u_map.xy * rd.xy, dh); // the ray's way on the map here
        vec3 sg = vec3(dm.x >= 0.0 ? 1.0 : -1.0, dm.y >= 0.0 ? 1.0 : -1.0, dm.z >= 0.0 ? 1.0 : -1.0);
        vec3 tM = ((cell + max(sg, 0.0)) * CELL - m) / (sg * max(abs(dm), vec3(1.0e-6)));
        if (tM.x < tM.y && tM.x < tM.z) { adv = tM.x; face = vec3(-sg.x, 0.0, 0.0); }
        else if (tM.y < tM.z) { adv = tM.y; face = vec3(0.0, -sg.y, 0.0); }
        else { adv = tM.z; face = vec3(0.0, 0.0, -sg.z); }
        if (inBody) {
          if (filled) mist = min(t + max(adv, 0.0), tEnd);
          else inBody = false;
        }
        if (filled) rain = vec2(0.0);
        adv = max(adv, 0.0);
      }
      if (rain.x > 0.0) {
        float tau = tauR + rain.x * ${glsl(RAIN)} * sigma(rain.y) * min(adv, tEnd - t);
        float a = ${glsl(RAIN_MOST)} * (exp(-tauR) - exp(-tau));
        tauR = tau;
        lay(t, col, A);
        col += (1.0 - A) * a * mix(rainCol(rain.y), HAZE, hazed(t)) * u_light;
        A += (1.0 - A) * a;
      }
      t += adv + 2.0e-3; // 2 m into what is next
    }
    if (tB >= 0.0) {
      vec3 f = fract(mB / CELL);
      vec2 e = abs(face.x) > 0.5 ? f.yz : abs(face.y) > 0.5 ? f.xz : f.xy;
      vec2 de = min(e, 1.0 - e) * (abs(face.z) > 0.5 ? vec2(1.0) : vec2(1.0, 0.5));
      float lw = max(0.035, 1.5 * pix * tB);
      float line = 1.0 - smoothstep(lw * 0.5, lw, min(de.x, de.y));
      float shade = face.z > 0.5 ? 1.0 : face.z < -0.5 ? 0.55 : abs(face.x) > 0.5 ? 0.84 : 0.7;
      vec3 bc = sevB < 0.5 ? mix(vec3(0.6, 0.68, 0.8), vec3(0.96, 0.97, 0.98), shade) : sevCol(sevB) * shade;
      bc *= 1.0 - 0.22 * line;
      lay(tB, col, A);
      col += (1.0 - A) * mix(bc, HAZE, hazed(tB)) * u_light;
      A = 1.0;
    }
  }
  lay(tO, col, A); // what the walk did not pass, short of what the pixel shows
  // From inside a block's body: its mist over everything, as thick as the cloud it stands for.
  float fogA = 1.0 - exp(-sigma(mistSev) * mist);
  vec3 fogC = (mistSev < 0.5 ? vec3(0.86, 0.89, 0.93) : sevCol(mistSev) * 0.85) * u_light;
  out_FragColor = vec4(mix(col, fogC, fogA), 1.0 - (1.0 - fogA) * (1.0 - A));
}
`

/**
 * The mix (see the header): the scene, the clouds' shadows on its ground, and the march over it.
 */
export const MIX_SHADER = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform sampler2D u_march; // the march's output, at half the size
uniform sampler2D u_field;
uniform mat4 u_eyeToLocal;
uniform vec3 u_map;
uniform float u_lo[${BANDS}]; // each band's lowest base, km
uniform float u_hi[${BANDS}];
uniform vec2 u_plane;
uniform float u_shadow; // how dark full cover's shadow is: none by night
uniform float u_look; // 2: blocks
uniform float u_path[${PATH_N * 3}]; // the way ahead in the frame, km: the aircraft, then where it is after each minute (x, y, z of each)
uniform vec2 u_aids; // 1 where it shows: x the track line, y the level slice (the march draws that)
in vec2 v_textureCoordinates;
${SHARED}
// The track line (the mock's): the way ahead as a line two pixels wide at any distance; white-blue in clear air and, thicker, the
// severity's colour where the field's cover is over 0.3. (The minutes on it are the app's labels, "1 min" to "6 min"; a bead under
// each could not be made out, and is not drawn.) Of the stretches between the path's places, the one this ray passes nearest, by
// the angle between them; the field is read only by a ray near it. Its colour, and how much of the pixel it covers. Hidden by what
// is solid in front of it (tO: km to what the pixel shows), not by cloud: see the header.
vec4 track(vec3 ro, vec3 rd, float tO, float pix) {
  float off = 1.0e9; // the angle from the ray to the nearest stretch
  float at = 0.0; // how far along the ray that is
  vec3 q = vec3(0.0); // the stretch's place nearest the ray
  for (int i = 0; i < ${PATH_N - 1}; i++) {
    vec3 p0 = vec3(u_path[3 * i], u_path[3 * i + 1], u_path[3 * i + 2]);
    vec3 d = vec3(u_path[3 * i + 3], u_path[3 * i + 4], u_path[3 * i + 5]) - p0;
    float len = length(d);
    if (len < 1.0e-4) continue;
    vec3 f = d / len;
    float b = dot(rd, f);
    float den = 1.0 - b * b;
    if (den <= 1.0e-6) continue;
    vec3 w = ro - p0;
    float tc = clamp((dot(f, w) - b * dot(rd, w)) / den, 0.0, len);
    vec3 c = p0 + f * tc;
    float sc = dot(c - ro, rd);
    if (sc <= 0.0 || sc >= tO) continue;
    float a = length(ro + rd * sc - c) / sc;
    if (a < off) {
      off = a;
      at = sc;
      q = c;
    }
  }
  if (off >= 1.0e9) return vec4(0.0);
  float wide = max(0.0004, 1.4 * pix * at);
  float dist = off * at;
  if (dist >= wide * 2.5) return vec4(0.0); // the widest the line gets: in cloud (1.9 times), out to its soft edge (1.3 times)
  float sev;
  float inC = smoothstep(0.2, 0.35, fieldCover(toMap(q), sev));
  float lw = wide * (1.0 + 0.9 * inC);
  float al = 1.0 - smoothstep(lw * 0.5, lw * 1.3, dist);
  return vec4(mix(vec3(0.78, 0.92, 1.0), sevCol(sev), inC), al * mix(0.8, 1.0, inC));
}

void main() {
  vec4 scene = texture(colorTexture, v_textureCoordinates);
  float depth = texture(depthTexture, v_textureCoordinates).r;
  vec4 eye = czm_windowToEyeCoordinates(v_textureCoordinates * czm_viewport.zw + czm_viewport.xy, depth);
  vec3 pe = eye.xyz / eye.w;

  // The clouds' shadows on what is ground: each band's cover where the light's ray from here meets the band's lowest base.
  if (depth < 1.0 && u_shadow > 0.0) {
    vec3 m = toMap((u_eyeToLocal * vec4(pe, 1.0)).xyz);
    vec3 sun = normalize(mat3(u_eyeToLocal) * czm_lightDirectionEC);
    vec2 slope = sun.xy / max(sun.z, ${glsl(SHADOW_LOW)});
    float sh = 0.0;
    for (int b = 0; b < ${BANDS}; b++) {
      if (u_lo[b] > u_hi[b] || m.z >= u_lo[b]) continue;
      vec2 at = m.xy + slope * (u_lo[b] - m.z);
      if (abs(at.x) > 0.5 * FIELD_KM || abs(at.y) > 0.5 * FIELD_KM) continue;
      sh = max(sh, smoothstep(0.2, 0.8, band(b, at).r) * reach(at));
    }
    scene.rgb *= 1.0 - u_shadow * sh * smoothstep(0.03, 0.3, sun.z);
  }

  // The march, from its smaller size: the nine march pixels round this one. For the volumes, each row and column of three weighs a
  // half for the middle one and shares the other half between the two beside it by their nearness: wherever the pixel lies, the four
  // starts of the march's steps then count alike (their mean is a march of four times the steps), and the mix changes evenly from one
  // pixel to the next, so no march pixel shows as a block. For the blocks, whose march has no such starts, the four nearest by their
  // nearness. Those that saw about the same depth as this pixel weigh most, so the aircraft's and the terrain's outlines stay sharp.
  bool even = u_look < 1.5;
  vec2 size = vec2(textureSize(u_march, 0));
  vec2 g = v_textureCoordinates * size - 0.5;
  vec2 c = floor(g + 0.5), d = g - c; // the nearest march pixel, and how far this pixel is from its middle: -1/2 to 1/2
  vec2 lo = even ? 0.25 - 0.5 * d : max(-d, 0.0), mid = even ? vec2(0.5) : 1.0 - abs(d), hi = even ? 0.25 + 0.5 * d : max(d, 0.0);
  vec4 sum = vec4(0.0);
  float weights = 0.0;
  for (int k = 0; k < 9; k++) {
    ivec2 o = ivec2(k % 3, k / 3) - 1;
    float w = (o.x < 0 ? lo.x : o.x > 0 ? hi.x : mid.x) * (o.y < 0 ? lo.y : o.y > 0 ? hi.y : mid.y);
    if (w <= 0.0) continue;
    vec2 uv = (c + vec2(o) + 0.5) / size;
    float dd = (texture(depthTexture, uv).r - depth) / ${glsl(DEPTH_SAME)};
    w /= 1.0 + dd * dd;
    sum += w * texture(u_march, uv);
    weights += w;
  }
  vec4 cloud = sum / max(weights, 1.0e-9);
  vec3 col = scene.rgb * (1.0 - cloud.a) + cloud.rgb;

  // The track line, at this stage's own size, over the cloud.
  if (u_aids.x > 0.5) {
    vec4 line = track(u_eyeToLocal[3].xyz, normalize(mat3(u_eyeToLocal) * pe), depth >= 1.0 ? 1.0e9 : length(pe) * 0.001, 2.0 / (czm_projection[1][1] * czm_viewport.w));
    col = mix(col, line.rgb, line.a);
  }
  out_FragColor = vec4(col, scene.a);
}
`
