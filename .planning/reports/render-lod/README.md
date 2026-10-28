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

## On the user's MacBook Air (M2), measured 2026-10-28 16:01–16:10

London approach, live replay, every layer on, weather on (`wxdemo=30`), `governor=0` (4× MSAA, full size). Graphics time per frame:

| Change | 1470×833 (laptop) | 2560×1440 (27") |
|---|---|---|
| As drawn | 15.1 ms | 45.9 ms (about 22 frames a second) |
| Clouds off | 6.4 ms | 19.3 ms |
| Cheaper edge filter (FXAA for 4× MSAA) | 10.7 ms | 30.0 ms |
| Half the resolution | 6.1 ms | 11.3 ms |
| Sun glow off | 14.7 ms | 43.8 ms |
| Buildings hidden | 13.4 ms | 46.1 ms |
| Traffic and own aircraft hidden | 14.6 ms | 46.1 ms |

- A 40-second flight at 27": 47–49 ms a frame, 50–71 frames longer than 50 ms in every 10 seconds. That is the stutter.
- The clouds were at their cheapest step already (march at 0.16 of the screen, 40 steps). Their own timer said 52 ms (march 23,
  blend 30), more than the frame: Apple's timer reads high, but switching them off saved 26 ms. The blend runs at full size and
  reads about 20 textures a pixel (nine from the scene's depth), cloud or no cloud; on the 4090 it is 0.07 ms.
- Triangles cost the M2's chip nothing measurable. Far ground in steps (Mt Fuji, 2560×1440, no weather): graphics 22.8 → 21.0 ms,
  processor 13.8 → 10.0 ms a frame, 169 → 103 tiles.
- Processor time per frame at 27": 13–15 ms, near the 16.7 ms of a sixtieth by itself.

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

## Next

1. **The clouds on Apple chips** (the largest cost on the M2 by far): the blend skips pixels with no cloud near, and reads the
   march's own small depth instead of the full-size one nine times; then measure again on the M2.
2. **Traffic brackets: done** (`d485d41`). No depth reads (the user: brackets may show behind hills); `useDepthPicking` off for good;
   a plane under 3 px at true size is its brackets alone.
3. **Night lamps and borders drawn by the server: done** (`07eda21`, `.planning/reports/server-tiles/`).
4. **Anti-aliasing at 27"**: 16 ms of the frame; Performance mode already trades it, at the user's word.
5. Stopped at the user's word as little gain for the stutter: buildings as 3D Tiles, live aircraft over a WebSocket.

## How to measure again

`.planning/tools/render-probe/` (`probe.js` in the page: draw calls and triangles by kind, graphics and processor time, tiles,
network, long tasks; `run.mjs` drives Chrome; `remote.sh` runs on the Ubuntu desktop, `mac.sh` on the Mac when it is idle). Views used: `scenario=jal123&t=66973&cam=0,-6,400`,
`scenario=kc1388&t=48926&cam=0,-8,400`, `scenario=fz1073&t=15600&cam=0,-5,400`, live replay `hex=400960&chase=1&cam=0,-8,300`
(Heathrow arrivals), each with `governor=0`.
