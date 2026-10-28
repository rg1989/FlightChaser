// shared/tiles.ts
// The pictures the server draws for the globe (server/tiles.ts), under the API's base. The browser keeps a tile for a
// year: a change to how a kind is drawn raises its version here, and every page asks for the new tiles.
export const LAMPS_TILES = 'tiles/lamps/v1/{z}/{x}/{y}.png'
export const LAMPS_MAX_LEVEL = 14 // OpenFreeMap's deepest tiles: every street from z13, service roads at z14
export const BORDERS_TILES = 'tiles/borders/v1/{z}/{x}/{y}.png'
export const BORDERS_MAX_LEVEL = 18
