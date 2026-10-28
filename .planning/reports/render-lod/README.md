# What a chase frame costs, and far detail in steps (2026-10-28)

**Verdict.** Triangles are not what makes the chase stutter. A London approach with buildings, traffic and place names is about
150 draw calls and 580k triangles a frame, and 80 % of both are ground tiles. What costs is (1) the processor's work per ground
tile, (2) per-pixel passes on the graphics chip (anti-aliasing, clouds), and (3) work done in the page while tiles stream in.
Far ground in steps (built, below) cuts the ground tiles by a third with no visible change.

## Measured

Headless Chrome on the Ubuntu desktop (RTX 4090), the app's own replay and scenarios, `governor=0` (every frame, full quality).
The 4090 shows draw calls, triangles, tiles and processor time; it does not show the M2's graphics time (see "Next").

| Chase view, 1470×833 | Draw calls | Triangles | Ground tiles | Processor per frame |
|---|---|---|---|---|
| London at 6,000 ft, buildings + traffic | 150 | 583k (ground 477k, buildings 30–300k, aircraft 37–90k) | 122 | 3.6 ms |
| Same at 2940×1666 (about the 27" screen) | 376 | 1,089k | 336 | 7.8 ms |
| FL360 cruise | 88 | 367k | 67 | 1.7 ms |

- Main thread in a minute of flight: 33 % busy. Cesium's drawing is 64 % of that; the ground tiles drive about 35–40 % (their draw
  commands and tile selection). Traffic 5 %, roof pictures 5 %.
- While flying: 20–38 satellite tiles fetched, decoded and uploaded a second.
- Graphics chip at 2940×1666 (where the 4090 is the limit): 4× anti-aliasing 19 % of the frame, the clouds 17 %, buildings 1 %.
  Fewer ground triangles saved nothing there: that frame was busy with pixels.
- Traffic brackets read the depth buffer back twice every 100 ms (`traffic.ts #dropOccluded`, Chrome logs "GPU stall due to
  ReadPixel"), and Cesium copies the whole depth buffer every frame for it (`useDepthPicking`). Each read makes the processor wait
  for the graphics chip: harmless on the 4090, a likely stutter on a chip that is the limit.

## Built: far ground in steps

`client/scene/viewer.ts FAR_GROUND_SSE = 12`: Cesium's own setting (`scene.fog.screenSpaceErrorFactor`, default 2), no patch.
Cesium forgives a ground tile up to that many pixels of detail error as the distance haze thickens, so near ground keeps all its
detail and each step farther out comes from a coarser tile. Looking straight down there is no haze: the top-down map is unchanged.

| Same frame, before → after | Ground tiles | Draw calls | Triangles | Processor per frame |
|---|---|---|---|---|
| Mt Fuji, 24,000 ft | 78 → 50 | 92 → 64 | 524k → 377k | 2.2 → 1.5 ms |
| Lisbon, 3,900 ft | 115 → 76 | 129 → 90 | 357k → 217k | 2.4 → 1.9 ms |
| London, 6,000 ft, live (the app as changed) | 118 → 79 | 150 → 112 | 583k → 370k | 3.3 → 2.7 ms |
| London at 2940×1666 (strength 16) | 336 → 215 | 376 → 249 | 1,089k → 801k | 7.8 → 6.6 ms |
| Top-down map | 24 → 24 | 34 → 34 | same | same |

Fewer far tiles also means fewer satellite tiles fetched and uploaded. Pictures: `far-ground-before-after.jpg`. Strength 24 saves a
little more (Fuji 41 tiles) and starts to soften the middle distance; Cesium's other knob (`globe.maximumScreenSpaceError`) blurs
the near ground too, so it was not used.

## Next, each a standard piece

1. **Traffic brackets: done (2026-10-28).** The hill check and its depth reads are gone (the user: brackets may show behind
   hills); `useDepthPicking` off for good; a plane that would be under 3 px at true size is drawn as its brackets alone.
2. **Buildings as 3D Tiles from our server.** The OGC format Cesium streams itself: the server builds the tiles from the same OSM
   data and ground heights, with simpler parent tiles (big buildings as blocks) for far away. Cesium then picks levels by distance,
   decodes in workers and keeps to a memory budget. It replaces the per-tile building and roof-picture code in the page, which uses
   private Cesium classes.
3. **Night lamps and borders as server tiles.** Today the page draws them, 3–25 ms a lamp tile and ~210 tiles for a fresh night
   view. The server would draw each tile once and keep it on disk; the page only shows pictures.
4. **Live aircraft pushed.** One WebSocket per page; the server sends each area's changes once a second in a compact binary form,
   decoded in a worker. Today every page polls JSON and the server works out each view per request.
5. **The Cesium patches out**: imagery cross-fade, the lamps' `endUpdate` wrap, the cloud pass timer, the canvas size getters.
6. **The M2 numbers.** The same probe on the MacBook when it is free, to rank 1–4 by graphics time on the user's own chip.

## How to measure again

`.planning/tools/render-probe/` (`probe.js` in the page: draw calls and triangles by kind, graphics and processor time, tiles,
network, long tasks; `run.mjs` drives Chrome; `remote.sh` runs on the Ubuntu desktop). Views used: `scenario=jal123&t=66973&cam=0,-6,400`,
`scenario=kc1388&t=48926&cam=0,-8,400`, `scenario=fz1073&t=15600&cam=0,-5,400`, live replay `hex=400960&chase=1&cam=0,-8,300`
(Heathrow arrivals), each with `governor=0`.
