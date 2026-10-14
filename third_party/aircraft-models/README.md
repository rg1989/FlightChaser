# Aircraft models: GPL corresponding source

This folder is the corresponding source for the aircraft models in `public/models/`: 25 built from the files here,
and 16 derived from those by a recipe (see [Derived](#derived)).

The models are GPL-licensed. The GPL says that whoever distributes the models must also make the source available. This
folder keeps that source in this repository, next to the models, so Flight Chaser meets that obligation itself.

`public/models/cesium-air/` is not part of this set. It comes from CesiumJS under Apache-2.0.

## Contents

| Path | What it is |
|---|---|
| `source/flightairmap-glb/` | The 18 upstream glTF 2.0 files from FlightAirMap-3dmodels. Unchanged. |
| `source/fr24-blend/` | The 7 upstream Blender files from fr24-3d-models. Unchanged. |
| `scripts/` | The conversion scripts from livetaiwan-aircraft-models, which made the first versions of the models. Unchanged. |
| `LICENSE-GPL-2.0` | The GPL version 2 text (from livetaiwan-aircraft-models). |
| `LICENSE-GPL-3.0` | The GPL version 3 text (from https://www.gnu.org/licenses/gpl-3.0.txt). `at75` is GPL-3.0. |
| `licences.json` | Licence, authors, upstream file and source file of each model built here. |

Every file in `source/` is byte-identical to the upstream file. We checked this with git blob hashes against the upstream repositories.

## Models

Upstream commits:

- FAM = [Ysurac/FlightAirMap-3dmodels](https://github.com/Ysurac/FlightAirMap-3dmodels) at `0906d9ba1bdd906ce45807e45ed706c09912db19`.
- FR24 = [Flightradar24/fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models) at `dd53267690c6a4ecbb290a3acf0284333a5d68a9`.
- livetaiwan = [GoLocalNear/livetaiwan-aircraft-models](https://github.com/GoLocalNear/livetaiwan-aircraft-models) at `00d6a934afba5314e81d5b40a99f5aacdb51b953`.

| Package | Aircraft | Upstream file | Here | Licence | Original FlightGear authors |
|---|---|---|---|---|---|
| `a320` | Airbus A320 | FAM `a320/glTF2/A320.glb` | `flightairmap-glb/A320.glb` | GPL-2.0-only | FlightGear A320-family authors (fredb, curt, mfranz, Ryan Miller, Durk Talsma, janodesbois, F-JJTH, James Turner) |
| `a321` | Airbus A321 | FAM `a320/glTF2/A321.glb` | `flightairmap-glb/A321.glb` | GPL-2.0-only | FlightGear A320-family authors (fredb, curt, mfranz, Ryan Miller, Durk Talsma, janodesbois, F-JJTH, James Turner) |
| `a333` | Airbus A330-300 | FAM `a333/glTF2/A333.glb` | `flightairmap-glb/A333.glb` | GPL-2.0-only | Narendran Muraleedharan (FlightGear A330-300) |
| `a343` | Airbus A340-300 | FAM `a343/glTF2/A343.glb` | `flightairmap-glb/A343.glb` | GPL-2.0-only | Andino and the FlightGear A340-313X authors (Skyop, Ampere K. Hardraade, Isaias V Prestes, Gijs de Rooy, Simon; kept up by it0uchpods) |
| `a359` | Airbus A350-900 | FAM `a350/glTF2/A350.glb` | `flightairmap-glb/A350.glb` | GPL-2.0-or-later | Juuso Tapaninen (jormapaappa1235), Brendan O'Gara (Sbyx), Chris Leung, Chris Andrews, Joshua Davidson (FlightGear A350XWB) |
| `a388` | Airbus A380-800 | FAM `a380/glTF2/A380.glb` | `flightairmap-glb/A380.glb` | GPL-2.0-only | K. Ampere, I. Cunningham, F. Dalvi and S. Hamilton (exterior 3D), with edits by J. Tapaninen, S. Toryx and Narendran Muraleedharan (FlightGear A380-omega) |
| `at75` | ATR 72 | FAM `atr72/glTF2/AT75.glb` | `flightairmap-glb/AT75.glb` | GPL-3.0-only | Narendran Muraleedharan, Donald Belcham, Dwayne Gable, Oliver (ot-666), camelon (FlightGear ATR72) |
| `b738` | Boeing 737-800 | FR24 `source/b738/737.blend` | `fr24-blend/b738.blend` | GPL-2.0-only | Innis Cunningham (3D) and the FlightGear 737-800 authors |
| `b744` | Boeing 747-400 | FR24 `source/b744/747.blend` | `fr24-blend/b744.blend` | GPL-2.0-only | Gijs de Rooy and the FlightGear 747-400 authors |
| `b752` | Boeing 757-200 | FAM `b752/glTF2/B752.glb` | `flightairmap-glb/B752.glb` | GPL-2.0-or-later | Liam Gathercole, Skyop, Isais Prestes (FlightGear 757-200), exterior reworked by Juuso Tapaninen, further models by John Williams (tikibar) |
| `b763` | Boeing 767-300 | FAM `b767/glTF2/B763.glb` | `flightairmap-glb/B763.glb` | GPL-2.0-only | Liam Gathercole and Isaias V. Prestes (3D), Peter Brendt (FlightGear 767) |
| `b773` | Boeing 777-300 | FR24 `source/b773/777-300.blend` | `fr24-blend/b773.blend` | GPL-2.0-only | Syd Adams (3D) and the FlightGear 777 authors |
| `b789` | Boeing 787-9 | FR24 `source/b789/787-900.blend` | `fr24-blend/b789.blend` | GPL-2.0-only | Jonathan Redpath and MSA-S23 (787-9 3D), after the FlightGear 787-8 by Joshua W and others |
| `bcs3` | Airbus A220-300 | FAM `bcs1/glTF2/BCS3.glb` | `flightairmap-glb/BCS3.glb` | GPL-2.0-or-later | FlightGear CSeries authors (ACJZA, Joshua Davidson (it0uchpods/411), Jonathan Redpath, D-ECHO, Pakistan-1, Gabriel Hernandez) |
| `c182` | Cessna 182 | FAM `c182/glTF2/C182.glb` | `flightairmap-glb/C182.glb` | GPL-2.0-only | Heiko Schulz (3D) and the FlightGear c182s authors |
| `c550` | Cessna Citation II | FR24 `source/citation/citation.blend` | `fr24-blend/citation.blend` | GPL-2.0-only | Curtis L. Olson, Ludovic Brenta, chris_blues (FlightGear Citation II) |
| `crj9` | Bombardier CRJ900 | FAM `crj9/glTF2/CRJ9.glb` | `flightairmap-glb/CRJ9.glb` | GPL-2.0-or-later | Ryan Miller (FlightGear CRJ700-family 3D and FDM) |
| `dh8d` | De Havilland Canada Dash 8-400 | FR24 `source/q400/q400.blend` | `fr24-blend/q400.blend` | GPL-2.0-only | Alex Park (MaverickAlex), Florian K, D-ECHO, Andreas Spiekermann (FlightGear Q400) |
| `e145` | Embraer ERJ-145 | FAM `e145/glTF2/E145.glb` | `flightairmap-glb/E145.glb` | GPL-2.0-only | Emmanuel Baranger (FlightGear Embraer-ERJ-145 3D and FDM) |
| `e190` | Embraer 190 | FAM `e190/glTF2/E190.glb` | `flightairmap-glb/E190.glb` | GPL-2.0-only | Narendran Muraleedharan (FlightGear E-jet-family) |
| `e75l` | Embraer 175 | FAM `e190/glTF2/E75L.glb` | `flightairmap-glb/E75L.glb` | GPL-2.0-only | Narendran Muraleedharan (FlightGear E-jet-family) |
| `ec135` | Eurocopter EC135 | FR24 `source/ec135/ec135.blend` | `fr24-blend/ec135.blend` | GPL-2.0-only | Heiko Schulz (3D) and the FlightGear ec135 authors |
| `p28a` | Piper PA-28 | FAM `pa28/glTF2/PA28.glb` | `flightairmap-glb/PA28.glb` | GPL-2.0-only | Emmanuel Baranger (FlightGear Piper PA-28, 3D and FDM) and 5H1N0B1 (systems) |
| `pc12` | Pilatus PC-12 | FAM `pc12/glTF2/PC12.glb` | `flightairmap-glb/PC12.glb` | GPL-2.0-only | Emmanuel Baranger (FlightGear PC-12, 3D and FDM) |
| `sr22` | Cirrus SR22 | FAM `sr22/glTF2/SR22.glb` | `flightairmap-glb/SR22.glb` | GPL-2.0-only | Emmanuel Baranger (FlightGear Cirrus-SR22 3D and FDM) |

Authors come from the `AUTHORS`, `README` or `-set.xml` files of each FGMEMBERS repository.

### How we decided each licence

livetaiwan labels every file "GPL-2.0-or-later". That label is wrong for some files, so we used the upstream licence of each file instead.

- **FAM files.** FAM has no licence for the whole repository. Each aircraft folder has its own licence file.
  - `a320`, `a333`, `e190`, `c182`: the file is the plain GPL-2.0 text. No file says "or any later version", so we record GPL-2.0-only.
  - `a350`: the file is the plain GPL-2.0 text. The upstream FGMEMBERS/A350XWB README says "Released under GPL2+", so we record GPL-2.0-or-later.
  - `crj9`: the file says "GNU General Public License, version 2 or above", so we record GPL-2.0-or-later.
  - `atr72`: the English part of the file is the GPL-3.0 text. The upstream FGMEMBERS/ATR72 README says "This aircraft is released under the GNU GPL v3 License". Neither says "or later", so we record GPL-3.0-only. (FAM's `atr72/LICENCE.txt` is the same file as its `b707/LICENCE.txt`. Its Portuguese part is a translation of GPL-2.0. The README statement is the one we rely on.)
- **FR24 files.** The FR24 `LICENSE` is the GPL-2.0 text. The FR24 README says "All other models are licensed under GPLv2", with no "or later". So all 7 are GPL-2.0-only. This includes `c550`, although its FlightGear upstream (FGMEMBERS/Citation) is GPL-2.0-or-later.
- **Gaps upstream of FR24.** The FGMEMBERS/777 mirror has no licence file. For `b773` we rely on the FR24 statement. The FlightGear FGAddon copy of the 777 has a GPL-2.0 `LICENSE`.

Each GLB that came from livetaiwan still has livetaiwan's `asset.copyright` string, "GPL-2.0-or-later, derived from FlightGear / FGMEMBERS / Flightradar24 fr24-3d-models". We did not change these files. `licences.json` and this README have the correct licence for each file.

`e190.glb` did not come from livetaiwan. FlightHopper built it and wrote the correct licence in its `asset.copyright`: "GPL-2.0-only, derived from FlightGear E-jet-family (Narendran Muraleedharan) via FlightAirMap-3dmodels".

- **The models added on 2026-10-13.** `a343`, `a388`, `b763`, `e145`, `p28a`, `pc12`, `sr22`: the FAM folder's licence file
  is the plain GPL-2.0 text, so we record GPL-2.0-only. `b752`: the FAM folder's `LICENSE` says "either version 2 of the
  License, or any later version": GPL-2.0-or-later. `bcs3`: the FAM folder has no licence file; it pins FGMEMBERS/CSeries,
  whose `COPYING` is the GPL-2.0 text and whose README says "GPL2+": GPL-2.0-or-later. `dh8d`: FR24, as above, GPL-2.0-only.

## Modified

Each model is a modified version of its upstream file.

- **livetaiwan (2026-08-19)** made the first web versions of 14 of them: all objects joined into one mesh with one
  material, decimated to about 20 % of the triangles, textures removed, turned to one axis convention (`+X` right wing,
  `+Y` up, `-Z` nose), the origin moved to the centre, a `COLOR_0` shade added from the normals. Flight Chaser built the
  others the same way with the scripts here (2026-09-28 and 2026-10-13).
- **Flight Chaser (2026-10-14)** rebuilt every model from its unchanged source here with `tools/models/detail.ts`: the
  whole surface, laid over the earlier mesh in the same frame and size, without what that mesh left out (a part far from
  it, and the objects its `recipe.json` names: propeller discs, a wing-tip pod, the 757's winglets), subdivided where
  the source is coarse, shaded as one smooth skin, and simplified where the file would be over 1 MB. The see-through
  cockpit glass is drawn dark. Each GLB's `asset.copyright` says what it was made from and when; the licence does not change.
- **Light copies.** `lod.glb` in each package is its `model.glb` simplified to at most 6,000 triangles
  (`tools/models/lod.ts`), for the traffic far from the camera.

### Derived

These models are made from another package by its `recipe.json` (a longer or shorter fuselage, a wingtip device, larger
nacelles) with `tools/models/variants.ts`. They have the licence and the authors of their base.

| Package | Aircraft | Base |
|---|---|---|
| `a20n` | Airbus A320neo | `a320` |
| `a21n` | Airbus A321neo | `a321` |
| `a319` | Airbus A319 | `a320` |
| `a332` | Airbus A330-200 | `a333` |
| `a35k` | Airbus A350-1000 | `a359` |
| `at45` | ATR 42 | `at75` |
| `b38m` | Boeing 737 MAX 8 | `b738` |
| `b39m` | Boeing 737 MAX 9 | `b38m` |
| `b737` | Boeing 737-700 | `b738` |
| `b739` | Boeing 737-900 | `b738` |
| `b772` | Boeing 777-200 | `b773` |
| `b788` | Boeing 787-8 | `b789` |
| `b78x` | Boeing 787-10 | `b789` |
| `crj7` | Bombardier CRJ700 | `crj9` |
| `e170` | Embraer 170 | `e75l` |
| `e195` | Embraer 195 | `e190` |

## How to rebuild

From the repository root, with Node.js 24 and Blender 4.x or 5.x (`BLENDER=<path>` if it is not on the path):

```bash
node tools/models/detail.ts <id>      # a model from its source here: model.glb, model.json measured again, lod.glb
node tools/models/variants.ts         # the derived models
node tools/models/gear-glb.ts --write # the landing gear
```

`detail.ts` lays the source over the earlier mesh, which it keeps in `.work/shipped-models/` (not in git: the earlier
mesh is `git show <commit before the re-mesh>:public/models/<id>/model.glb`). `docs/liveries.md` Part 2 says how to add a model.

The FAM upstream folders also contain Blender files (for example `a320/a320.blend`). FAM made its glTF files from those,
and the models here are built from the glTF files.

## Credits

The aircraft are the work of the FlightGear community. Thanks to:

- [FlightGear](https://www.flightgear.org/) and the authors of each aircraft (see the table).
- [FGMEMBERS](https://github.com/FGMEMBERS), who keep the FlightGear aircraft repositories.
- [Flightradar24](https://github.com/Flightradar24/fr24-3d-models), who converted 7 of the models and published the Blender files.
- [Ysurac / FlightAirMap](https://github.com/Ysurac/FlightAirMap-3dmodels), who converted 18 of the models to glTF 2.0.
- [GoLocalNear / livetaiwan-aircraft-models](https://github.com/GoLocalNear/livetaiwan-aircraft-models), who made the first web-ready versions of 14 of them and wrote the scripts.
