# City lights and borders as server tiles (2026-10-28)

The server now draws the lamp and border tiles (`server/tiles.ts`) and keeps them in `data/tiles/`. The page shows plain
imagery layers. Measured on the Ubuntu desktop (RTX 4090, headless Chrome, 1470 × 833), base commit e09d449 against the branch.

**Pictures.** The settled views are pixel-identical: Tel Aviv at night from 900 m (`harness/sun.html`) and FZ1073 at the
Saudi–Jordan border (`?scenario=fz1073&t=20400&cam=0,-20,500`). Both sides draw with Skia. [before-after.jpg](before-after.jpg)

**Loading.** At 2 s the base commit still smeared a coarse lamp tile over the city as a pale wash. The branch stays dark
until each ground tile's own lamps arrive. [loading.jpg](loading.jpg)

**Page main thread** (CPU profile, `.planning/tools/render-probe`):

| | Base | Branch |
|---|---|---|
| Fresh Tel Aviv night view, first 30 s: lamp drawing | 1,230 ms (49 street tiles, ~25 ms each) | 0 ms |
| Same: the dark-until-loaded rule | 13 ms (the `endUpdate` wrap) | 28 ms (cut-outs) |
| London night chase, 60 s of flight: lamp drawing | 219 ms | 0 ms |
| Same: the dark-until-loaded rule | 27 ms | 46 ms |

**Server.** A lamp tile takes 12–110 ms the first time (the art and the roads fetched), 0.1 ms from disk. A Tel Aviv
view and a minute over London left 681 files, 19 MB.

How the rule works now: one lamp layer per ground level below 12, so a tile never shows a coarser level's lamps
stretched; each such layer's `cutoutRectangle` covers the ground near the camera where that level is still 4 × too
blurry (`client/scene/nightLights.ts`).
