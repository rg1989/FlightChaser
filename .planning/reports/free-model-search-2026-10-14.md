<!-- .planning/reports/free-model-search-2026-10-14.md -->
# Free 3-D models for the types still missing

Research only. Checked 2026-10-14 and 2026-10-15. Not legal advice. No model file was downloaded, no account was made, nothing in the repository was changed.

## How I checked

- **Licences:** I fetched the licence files, READMEs and `*-set.xml` files myself (curl on the FlightGear SVN, `gh api` on GitHub, the GitLab API for `fgdata`). I quote the words below. Sketchfab licences come from the public JSON API of each model page.
- **Sizes:** file sizes come from HTTP HEAD requests (no body). The only measured triangle counts are the ones in `livetaiwan`'s `docs/model-manifest.json`. For every other file I give the size in bytes, and a shape or scale claim is **not verified** (nobody opened the mesh).
- **Looks:** I looked at the Sketchfab preview image of 8 models. I did not render any FlightGear file.
- **"Real" lengths** in the notes are from memory (manufacturer figures), not from a source I read.
- **Licence rule I applied:** usable = GPL (any version), CC0, CC BY, CC BY-SA, MIT/BSD/Apache, stated in or beside the model. Not counted: NC, ND, store "royalty-free", no licence found, or a licence that depends on a doubtful origin.
- **Licence evidence, three levels** (column "Licence"): **Stated** = a README, `AUTHORS`, `set.xml` or licence note names the licence for this model. **File** = only a plain GPL text (`COPYING`/`LICENSE`) in the aircraft folder; FlightGear's rules back it, but the author wrote nothing. **Repo** = the whole `fgdata` base package is GPL v2. All three count as usable. "File" and "Repo" rows are marked.

## What is new in this search

1. **`fgdata` `AI/Aircraft` is the best source.** The earlier report met these files only through `skytrails` and called their licence unconfirmed; the base package's `LICENSE.md` (GPL v2) and `README.md` settle it for the whole package. It holds one low-poly AI-traffic `.ac` file per type (no cockpit expected; `skytrails` still removes gear, interior, props and lights from some), mostly by Ian (Yves) Tolosa. It has 747-8F, 777F / 777-200LR / 777-300ER, A300-600, A310, 717, MD-80, CRJ200, Dash 8-300, Beech 1900D, King Air 200, C172, Caravan, F-16, F-15 and F/A-18. Files are 60 KB to 1 MB. No helicopters.
2. **Ready GLBs exist for about half of the list:** `livetaiwan` (747-8, 767-200, 767-400, MD-11, CRJ200, Caravan) and the `skytrails` release v0.1.0 (777-300ER, CRJ200, Dash 8-300, King Air 200, C172, Caravan; textures kept, so strip them).
3. **Nothing usable for:** A330neo (one weak CC BY model), Phenom 300 (weak), G650 (weak), Global 6000, Citation CJ, KC-135, C-17, A400M. See section 2.

## Source keys (model URL = base + path in the table)

| Key | Base URL | Licence file or statement |
|---|---|---|
| FGD | `https://gitlab.com/flightgear/fgdata/-/blob/next/` | `LICENSE.md` (GNU GPL, Version 2, June 1991) and `README.md`: "The FlightGear base package is licensed under the GNU GPL." |
| FGA | `https://svn.code.sf.net/p/flightgear/fgaddon/trunk/Aircraft/` (HEAD r21772) | the file named in the row, same folder |
| FGM | `https://github.com/FGMEMBERS/<repo>/blob/master/` | the file named in the row, same repo |
| LT | `https://github.com/GoLocalNear/livetaiwan-aircraft-models/blob/main/` | LT labels everything GPL; use the **upstream** licence named in the row |
| FAM | `https://github.com/Ysurac/FlightAirMap-3dmodels/blob/master/` | the licence file in the same folder |
| FR24 | `https://github.com/Flightradar24/fr24-3d-models/blob/master/` | `README.md`: "All other models are licensed under GPLv2"; `LICENSE` = GPL v2 text |
| SKY | `https://github.com/stagworksde/skytrails-aircraft-models/releases/download/v0.1.0/` | `README.md` table: "built GLBs (release assets) ... GPL v2 (`COPYING.md`)"; each model's folder has `sources/fgdata/<f>/AUTHORS.md` |
| C172T | `https://github.com/c172p-team/c172p/blob/master/` | `CONTRIBUTING.md`, `LICENSE` |
| SF | the URL in the row | Sketchfab API: "CC Attribution (by) http://creativecommons.org/licenses/by/4.0/" |

Work classes: **Ready** = GLB, no Blender needed. **Convert** = one low-poly AC3D file (up to about 1 MB): AC3D import (Blender 4.3 add-on or Assimp), then the existing pipeline. **Heavy** = FGAddon/FGMEMBERS file of 1.5 MB or more; interior, cockpit and pilot are in separate files by folder layout, but gear, props and lights are inside and must be removed. **Weak** = licence fine, shape or origin doubtful.

## 1. Usable candidates (value order of the request; best first inside each type)

| Type | Source and path | Licence (words) | Format, size | Quality, scale | Notes |
|---|---|---|---|---|---|
| **747-8i** | LT `models/fr24/b748.glb` (5,634 tris, 241 KB) and `models/flightairmap/B748.glb` (5,649 tris, 294 KB). Upstream: FGAddon `747-8i`, FAM `b748` | **Stated.** FGA `747-8i/README`: "Released under the following license: GPL 2.0"; `747-8i/LICENSE` = GPL v2 text; FAM `b748/LICENSE` = GPL v2 text | glTF 2.0 GLB, no textures | **Ready.** Whole exterior. 76.6 m long, span 68.4 m (real 76.3 / 68.4). Pick. | Passenger version only. Authors: John Williams, Grupo FGBr (Aurino das Neves, Isaias Prestes, Rick Britto, Wagner Silva), Gijs de Rooy (README) |
| **747-8F** | FGD `AI/Aircraft/747/Models/74N.ac` (1.12 MB) | **Repo.** `74N-main.xml`: "Boeing 747-8 Freighter", "Ian(Yves) Tolosa. Dec 2016" | AC3D | **Convert.** Low-poly exterior. Not measured. Pick. | Alternative (Heavy): FGA `747-8i/Models/747-8F.ac` (1.75 MB), own freighter fuselage by John Williams, same README |
| **767-400** | LT `models/fr24/b764.glb` (2,658 tris, 101 KB, 61.2 m, span 51.8) | **Stated + File.** Upstream FGM `767`: `COPYING` = GPL v2 text; `Documentation/General_Background.txt`: "in convergence with the GNU GPL License, meaning it is free to enhance, free to redistribute"; FR24 README: "All other models are licensed under GPLv2" | glTF 2.0 GLB | **Ready.** Whole exterior; real 61.4 m. Pick. | **Two licence texts in the upstream repo:** root `COPYING` is GPL v2, `Documentation/License.txt` is GPL v3 (bilingual). Both allow redistribution; record both. Authors in `767-200-set.xml`: Peter Brendt, Liam Gathercole, Isaias V. Prestes, Israel Hernandez (IAHM-COL) |
| **767-200** | LT `models/fr24/b762.glb` (2,524 tris, 77 KB, 50.4 m, span 46.3) | same as 767-400 | glTF 2.0 GLB | **Ready.** About 4 % long (real 48.5 m). | Blender sources if wanted: FGM `767/Models/767-2C.ac` (2.15 MB), `767-400.ac` (2.28 MB); FR24 `source/b762/767-200.blend` (3.2 MB) |
| **777-300ER** | FGD `AI/Aircraft/777/Models/77W.ac` (529 KB). Ready GLB: SKY `ac_b77w-4e801325.glb` (156 KB, 3,000-triangle budget) | **Repo.** `77W-main.xml`: "Boeing 777-300 ER", "Ian(Yves) Tolosa. September 2016" | AC3D; GLB with textures | **Convert** (or **Ready** after stripping textures). Pick. | SKY checks length to within 10 % of real (its README step 8). Alternative (Heavy): FGA `777/Models/777-300ER.ac` (2.16 MB, same byte size as `777-300.ac`, so probably the same geometry); `777/LICENSE` = GPL v2 text, `AUTHORS`: Syd Adams, Justin Smithies, Karla and others |
| **777-200F** and **777-200LR** | FGD `AI/Aircraft/777/Models/77F.ac` and `77L.ac` (528,392 bytes each) | **Repo.** `77F-main.xml`: "Boeing 777-200 Freighter"; `77L-main.xml`: "Boeing 777-200 LR" | AC3D | **Convert.** The two files have the same size to the byte: probably the same geometry with different textures (a freighter has no windows). | FGAddon `777` has `777-200LR.ac` (1.75 MB) and its `777-200F.xml` reuses it, so FGAddon has no separate freighter mesh either |
| **A300-600** (and 600F) | FGD `AI/Aircraft/A300/Models/AB6.ac` (655 KB; "Airbus A300-600", "Ian(Yves) Tolosa. Dec 2018") and `ABY.ac` ("A300-600 Freighter") | **Repo** | AC3D | **Convert.** Not measured. Pick. | `A300.ac` (403 KB, Brett Harrison) is the older short A300B4 |
| | FGA `A300-600/Models/Fuselage.ac` (679 KB) + `Wings.ac` (1.5 MB) + `Tail.ac` (111 KB) + `GE-CF6.ac` (560 KB) | **File.** `gpl-2.0.txt` (GPL v2 text); `README.md` is two words; `A300-603-set.xml`: "Models: Toryx, Airbus330, Pierre Duval" | AC3D, four parts to join | **Heavy** | |
| **A310** | FGD `AI/Aircraft/A310/Models/A310.ac` (311 KB) | **Repo.** No author in the files (fgdata history: Torsten Dreyer, Yves Tolosa-Joas, Olivier Jacq, Karel Klimes) | AC3D | **Convert.** Not measured. Pick. | |
| | FGM `A310`: `Models/Fuselage.ac` (649 KB), `Wings-200.ac` (404 KB), `Wings-300.ac` (422 KB), `Tail.ac` (98 KB), CF6 / PW engine files | **Stated.** `README.md`: "License: GPL2+"; also `COPYING`, `gpl-2.0.txt` | AC3D, parts | **Heavy.** Authors: Toryx, Pierre Duval, Ja Sam Niko | Variants -204, -222, -308, -324 |
| **A330neo** | SF `https://sketchfab.com/3d-models/a330-900-plane-21495dca19a94a959a7bf879adc4dc5d` (Greg, `@gregoirebonnin`, 2021-03-31) | **Stated (Sketchfab).** CC BY 4.0 | Sketchfab download (needs a Sketchfab login). 10,936 faces | **Weak.** Description: "Flying A330-900 model with 2 turbines." The preview shows a complete, simple airliner with raked tips. Scale unknown. | Needs a credit line. Only A330neo found. Better: keep the A330-300 stand-in unless the user wants the new engines |
| **717-200** | FGD `AI/Aircraft/717/Models/717.ac` (381 KB; "Boeing 717", Brett Harrison) | **Repo** | AC3D | **Convert.** Not measured. Pick. | The only 717 that counts. FGAddon `717` is not counted (see section 3: its mesh comes from a CC-licensed MD-81 and the README asks for permission) |
| **MD-80** (MD-81/82/83/87) | FGD `AI/Aircraft/MD80/Models/md-80.ac` (95 KB, very low poly; Innis Cunningham) | **Repo** | AC3D | **Convert.** Probably crude. Not measured. | |
| | FGA `MD-80/Models/mesh_airframe.ac` (1.5 MB) and `mesh_airframe_87.ac` (1.5 MB, MD-87) | **Stated.** `LICENSE` = GPL v2 text; `Docs/THANKS.md`: "Gary Neely/Buckaroo: Relicensing his MD-81 as GPL V2!"; `MD-81-set.xml`: "Copyright (c) 2026 Josh Davidson (Octal450)" | AC3D | **Heavy.** Good detail (2026). Pick if the AI file is too crude. | |
| **MD-11** | LT `models/flightairmap/MD11.glb` (10,247 tris, 406 KB, 61.6 m, span 51.9). Upstream FAM `md11` | **Stated.** FAM `md11/LICENSE`: "under the terms of the GNU General Public License ... either version 2 of the License, or any later version." | glTF 2.0 GLB | **Ready.** Whole exterior; real 61.6 m. Pick. | Triangle count is high for LT; the pipeline decimates anyway. Freighter: FGA `MD-11/Models/MD-11F-GE.ac` (6.5 MB, Octal450, `LICENSE` GPL v2, models by Juuso Tapaninen per FGM `MD-11/AUTHORS`): Heavy |
| **CRJ200** | FGD `AI/Aircraft/CR2/Models/CR2.ac` (589 KB; "Bombardier Canadair Regional Jet CRJ200 (CL-600-2B19)", "Ian (Yves) Tolosa, December 2019"). Ready GLB: SKY `ac_crj2-a760fdf0.glb` (137 KB, 2,000-triangle budget) | **Repo** | AC3D; GLB with textures | **Convert / Ready.** Pick. | |
| | LT `models/flightairmap/CRJ2.glb` (1,151 tris, 62 KB, 29.0 m, span 22.9) | **File.** FAM `crj2/COPYING.txt` = GPL v2 text. Built from FGA `CRJ-200`, whose `README.txt` says "roughly based on the 787 ... Using materials from: Boeing 737, 767-400, 777-200, Citation-Bravo, F-16" | glTF 2.0 GLB | **Weak.** 8 % too long (real 26.8 m); crude. | |
| | FGM `CRJ200/Models/crj-200.ac` (2.26 MB; D-ECHO) | **Stated.** `LICENSE`: "All files in this project are licensed under the GNU General Public License, version 2 or above." (and says only the GPL part of CRJ700-family was used) | AC3D | **Heavy.** "More smooth exterior model" | Last push 2019 |
| **Dash 8-300** | FGD `AI/Aircraft/DH3/Models/DH3.ac` (371 KB; "Bombardier Dash-8, Series 300 (Model 311)", Ian Tolosa). Ready GLB: SKY `ac_dh8c-95e6aeb4.glb` (122 KB, 2,000-triangle budget) | **Repo** | AC3D; GLB with textures | **Convert / Ready.** Pick. | |
| | FGA `DHC-8/Models/DH8C.ac` (2.83 MB) | **Stated.** `README.md` LICENSE: "either version 2 of the License, or (at your option) any later version"; `COPYING` = GPL v2 text | AC3D | **Heavy.** Authors: MaverickAlex, Florian K, Bea Wolf (D-ECHO), Joshua Davidson | Same folder has `DH8D.ac` (Q400, 1.34 MB) |
| **Dash 8-100** (and -200) | FGA `DHC-8/Models/DH8B.ac` (2.77 MB) | same as above | AC3D | **Heavy.** `DH8A.xml` only points to `DH8B.xml`, so the -100 and -200 share this mesh (same airframe, different engines). | Only source for a Q100/Q200 |
| **Cessna 172** | FGD `AI/Aircraft/c172/Models/c172p.ac` (211 KB). Ready GLB: SKY `ac_c172-91309060.glb` (64 KB, 1,500-triangle budget) | **Repo** | AC3D; GLB with textures | **Convert / Ready.** Pick. | The model file names its author as "me" only |
| | C172T `Models/c172-common.ac` (3.2 MB) | **Stated.** `CONTRIBUTING.md`: "This project is licensed under the GPL version 2 or later." `LICENSE` = GPL v2 text. `Thanks` lists CC BY / CC0 sounds (not the mesh) | AC3D | **Heavy.** Detailed; may contain interior. Active (pushed 2026-10-05). | Not needed if the AI file is enough |
| | SF/OGA `https://opengameart.org/content/cessna-172` (mvdwoude, `cessna_172.blend`, 4.3 MB) | **Stated.** "CC-BY 4.0" and "CC-BY-SA 4.0" (choose CC BY); copyright notice "MvdW" | `.blend` | **Weak.** "A low poly of a cessna 172 general aviation plane on a field of grass": a scene, not the aircraft alone; triangle count not stated | Backup only |
| **Cessna 208 Caravan** | LT `models/flightairmap/C208.glb` (4,000 tris, 137 KB, 12.6 m, span 15.9). Upstream FAM `c208` | **File.** FAM `c208/COPYING` = GPL v2 text | glTF 2.0 GLB | **Ready.** Whole exterior; real 12.7 m (208B). Pick. | |
| | FGA `Cessna-208B/Models/Exterior.ac` (4.6 MB) + `cargo_pod.ac` (2.5 MB) | **Stated.** `C208B-set.xml` header: GPL "either version 2 of the License, or ..." (Copyright ePilot, D-ECHO, Emmanuel Baranger) | AC3D | **Heavy** | FGD `AI/.../Cessna208Caravan/Models/caravan.ac` (1.5 MB, **Repo**, no author named) and SKY `ac_c208-e2deca58.glb` (125 KB) also exist |
| **King Air 200 / B200** | FGD `AI/Aircraft/beech-200/Models/beech-200.ac` (447 KB; "Beech 200 Super King Air", Brett Harrison). Ready GLB: SKY `ac_be20-fddbf056.glb` (100 KB, 1,500-triangle budget) | **Repo** | AC3D; GLB with textures | **Convert / Ready.** Pick for B200. | |
| **King Air 350** | FGM `KingAir-350/Models/KingAir.ac` (6.4 MB) | **Stated.** `README.md`: "License: GPL version 2+" (2016-2017 SM, D-ECHO, Lesbof, Bomber, it0uchpods, GabrielYV, IAHM-COL, JWocky); `COPYING` = GPL v2 text | AC3D | **Heavy.** The only real 350. Last push 2023-10-29. | The 350 differs from the 200 by a longer fuselage (14.2 m vs 13.3 m, from memory) and a four-blade prop; the B200 model is close enough for small icons |
| | FGA `Beechcraft-King-Air/Models/kingair.ac` (3.6 MB; Emmanuel Baranger) | **File.** `COPYING` = GPL v2 text; `Read-Me.txt` is an empty template | AC3D | **Heavy.** Variant not stated ("Super King Air") | |
| **Beech 1900D** | FGD `AI/Aircraft/b1900d/Models/b1900d.ac` (1.04 MB) | **Repo.** No author named (history: Joshua Murphy, Torsten Dreyer) | AC3D | **Convert.** Larger than other AI files; not measured | FGA `b1900d` has **no** licence file (see rejected). Sketchfab backup: `https://sketchfab.com/3d-models/beechcraft-1900-a3830815fc4545038c2ce5ccea913705` (CC BY 4.0, 12,288 faces, "This may not be exact."): Weak |
| **Diamond DA40 / DA42** | FGA `DA40/Models/da40.ac` (1.29 MB; DA40 NG) | **File.** `COPYING` = GPL v2 text; `THANKS.md`: authors "see author list in da40-base.xml" | AC3D | **Heavy** | Also FGA `Diamond-Da40/Models/da40.ac` (1.6 MB, Baranger) and `Diamond-Da42/Models/da42.ac` (2.56 MB), both `COPYING` GPL v2 (**File**). FGD `AI/Aircraft/Diamond-Da42/Models/da42.ac` is 2.0 MB (not low poly) |
| **Embraer Phenom 300** | SF `https://sketchfab.com/3d-models/embraer-phenom-300-private-jet-full-interior-ece5ca34e7074113b9ab7c33734e2d5d` (Mixmamo.studio, 2025-10-04) | **Stated (Sketchfab).** CC BY 4.0 | 79,099 faces | **Weak.** "Full Interior": the cabin must be stripped. A studio account that markets free models; origin not stated. | Only other: `https://sketchfab.com/3d-models/embraer--phenom-300e-ar-v006-8087da16bf3e43f1b79ddb05b91ae246` (ryan_cd, CC BY 4.0, 116,498 faces, no description) |
| **Gulfstream G650** | SF `https://sketchfab.com/3d-models/gulfstream-g650er-b88fa0194c2b49ef8560337ab96d7579` (Luca Martina, 2025-04-25) | **Stated (Sketchfab).** CC BY 4.0 | 379,286 faces | **Weak (heavy).** The preview shows a clean, complete, white exterior. Needs strong decimation. | |
| | FGM `GulfstreamG550/Models/GulfstreamG550.ac` (1.97 MB; "xsaint,2009") | **File.** `COPYING` = GPL v2 text; README says "Alpha - Early" and comes from a site called UnitedFreeWorld | AC3D | **Weak.** It is a G550 (29.4 m; G650 is 30.4 m, from memory). Early model. | Acceptable as a large-cabin Gulfstream stand-in |
| **Robinson R44** | FGA `R44/Models/r44.ac` (1.23 MB; Emmanuel Baranger 3D/FDM) | **File.** `COPYING` = GPL v2 text; `Read-Me.txt` is an empty template | AC3D | **Heavy** but the lightest of the helicopters. Pick. | Older mirror: FGM `R44` (GPL-2.0 on GitHub, pushed 2020-03-06) |
| **Airbus H125 (AS350)** | FGM `AS350/Models/as350a-test.ac` (4.9 MB) + `pilot.ac` (318 KB) | **Stated.** `AS350-set.xml`: `<license>GPL v2</license>`; author "StuartC, Maik Justus (FDM)"; `COPYING` = GPL v2 text; FGUK hangar | AC3D | **Heavy.** File name says "test". | The only true AS350 (open tail rotor). FGA `ec130` (H130, shrouded tail rotor, `<license>GPL v2</license>`, 5.6 MB) is the wrong tail |
| **Bell 407** | FGM `bell407/Models/Bell407.ac` (3.7 MB) | **Stated.** `Bell-407-set.xml`: `<license>GPL v2</license>`, "StuartC, Maik Justus (FDM)"; `COPYING` = GPL v2 text | AC3D | **Heavy** | |
| **Bell 206** | FGM `Bell-206/Models/bell206.ac` (2.65 MB) | **Stated.** `bell206-set.xml`: `<license>GPL v2</license>`, "Mojo (3D), StuartC" | AC3D | **Heavy** | Also FGA `Bell-206-JetRanger/Models/jetranger.ac` (3.17 MB, **File**, `COPYING` GPL v2) |
| **Airbus H145** | FGM `ec145/Models/ec145.ac` (1.39 MB) | **Stated.** `ec145-set.xml`: `<license>GPL v2</license>`; authors "Melchior Franz (Nasal + config), Heiko Schulz, Maik Justus, StuartC (FDM)"; `COPYING` | AC3D | **Heavy** (1.4 MB, the lightest Eurocopter file). It is the older EC145, not the T2 | Interior is a separate 890 KB file |
| **C-130 Hercules** | FGA `C130/Models/c130.ac` (3.45 MB) | **File.** `COPYING` = GPL v2 text; `c130-set.xml`: "BARANGER Emmanuel (3D/FDM)", "FABERT Didier (texture)" | AC3D | **Heavy.** Variants C-130, C-130K, KC-130, AC-130 | |
| **F-16** | FGD `AI/Aircraft/f16/Models/f-16_lowpoly.ac` (61 KB) | **Repo.** History: Richard Harrison | AC3D | **Convert.** Tiny, so crude. Not measured. | |
| | FGA `f16/Models/f16.ac` (1.72 MB) | **Stated.** `copyright.txt`: "Copyright (C) 2023 Erik Hofman ... either version 2 of the License, or (at your option) any later version"; `authors.txt`; `LICENSE` = GPL v2 text | AC3D (`f16.blend`, 1.64 MB, in the folder) | **Heavy.** Best licence evidence of all the military types. Pick. | One mesh for all blocks; pilot, pylons and brakes are separate files |

### Extras seen on the way (not on the request list, all licences read)

| Type | Source and path | Licence | Size | Notes |
|---|---|---|---|---|
| F-15 | FGD `AI/Aircraft/F-15/Models/F-15-lowpoly.ac` | **Repo** (history: Richard Harrison) | 139 KB | Convert |
| F/A-18 | FGD `AI/Aircraft/F-18/Models/F-18-model.ac` | **Repo** (Richard Harrison) | 407 KB | Convert |
| F-35B | FGA `F-35B/Models/F-35B.ac`, licence `F-35B/License.txt` | **File.** GNU GPL, Version **3**, 29 June 2007 | 1.63 MB | Heavy. Lift-fan variant; keep GPL-3.0 apart from GPL-2.0-only meshes |
| AH-64 | FGA `apache/Models/apachemodel/apache.ac`, statement `read-me.txt` | **Stated.** "License GPL(see the GPL license online for details)" (Alex Park, 2008): no version | 4.8 MB | Heavy |
| UH-60 | FGA `UH-60/Models/uh60.ac` | **File.** `COPYING` GPL v2 (Baranger) | 3.17 MB | Heavy |
| MQ-9 | FGA `MQ-9/Models/MQ-9.ac` | **Stated.** `README.txt`: "License: GNU General Public License"; `License` = GPL v2 text (Petar Jedvaj, 2016) | 3.67 MB | Heavy |
| Typhoon | FGA `eurofighter/Models/typhoon.ac` | **Stated.** `README`: "This model is released under the terms of the GPLv2" (Maverick Alex) | 3.45 MB | Heavy |

## 2. Types with nothing usable found

| Type | What exists | Why it does not count |
|---|---|---|
| **A330neo** | One weak CC BY Sketchfab model (table above). Nothing from FlightGear, GitHub, NASA | No FlightGear A330neo exists (the IDG A330 pack has the -200/-300/MRTT only). The Headwind A339X is CC BY-NC-SA (rejected below) |
| **Phenom 300** | Two CC BY Sketchfab models, weak (above) | One has a full interior, the other has no description. Nothing from FlightGear |
| **G650** | A heavy CC BY model and an early G550 (above) | Not the G650 as such |
| **Bombardier Global 6000** | None | Only paid or "royalty-free" store models. The nearest free shape is the Challenger 604 (FGD `AI/Aircraft/Bombardier-Challenger/Models/chal604.ac`, 336 KB, **Repo**), 20.9 m against 30.3 m: wrong size |
| **Citation CJ1-CJ4** | None | No CJ in FlightGear or on Sketchfab (CC BY). The app already has the Citation II (C550); FGD has a Citation Bravo (`Citation-Bravo/Models/bravo.ac`, 663 KB, **Repo**) |
| **KC-135** | FGA `KC135` and FGM `KC135` | No licence file, no statement in `KC135-set.xml` or any README: **unclear**. The Sketchfab KC-135 is a game rip (below). Nearest: LT `models/flightairmap/707.glb` (3,173 tris, 45.6 m; FAM `b707/LICENCE.txt` is GPL **v3**), which is a 707-320 with other engines and 10 % too long |
| **C-17** | FGM `C-17`, Sketchfab models | FlightGear model rests on a non-commercial X-Plane model (below). Sketchfab CC BY models have no stated origin |
| **A400M** | FGM `a400m`, one Sketchfab model | Unclear origin and crude (below) |

## 3. Rejected or not counted

| Candidate | Reason |
|---|---|
| FGM `C-17` (GPL-3.0 on GitHub) | `README.md`: "3D Aircraft Model and Textures, converted from X-Plane". `Docs/Readme_C17_3D_Model_Authors.md` gives the copyright as 2006 Adam Fothergill, "All rights reserved." and says "This aircraft is free for personal non-commercial use." The only permission is a 2009 e-mail ("Sure, should be no problem here") to the FlightGear developer. Not a clear grant: **not counted** |
| FGA `717/Models/717-200.ac` (1.94 MB; GPL v2 `LICENSE.txt`) | `README.txt` says "By Skyop and Gary Neely, licensed under the GNU GPL2" and thanks Gary Neely "for allowing me to adapt his MD-81 model ... and release everything under the GPL2". It then warns: "THE MD-81 IS UNDER A CREATIVE COMMONS LICENSE, AND IS NOT COMPATIBLE WITH THE GNU GPL. IF YOU ARE ADAPTING ANY PART OF THIS MODEL, WE REQUEST THAT YOU ASK GARY NEELY FOR PERMISSION." We would adapt the mesh, so the request applies: **unclear, not counted**. (The MD-80 `THANKS.md` later records his relicensing of the MD-81 to GPL v2, which probably settles it; ask him or the FGAddon maintainers before using this file.) |
| FGA `KC135`, `E3B`, `ch47`, `f18`, `F-15`, `b1900d`, `Citation-Bravo`, `CitationX`, `A340-600`, `kodiak`, `beech99` | No `COPYING`/`LICENSE`, and nothing in README or `set.xml` names a licence. FlightGear policy may cover them, but I could not read it: **unclear**. (For `b1900d`, `F-15`, `f18` and the Bravo, the `fgdata` AI copy has a clear licence, see section 1.) |
| FGM `a400m` | `COPYING` is GPL v2, but `a400m-set.xml` names the 3-D author as "Anon", the README is a bare FGUK link, and the mesh is 7.9 MB: **unclear origin** |
| FGM `Challenger650` | No licence file; built on the CRJ700-family (whose non-GPL release is CC BY 4.0 for models): **unclear** |
| LT `B407.glb` / FAM `b407` | FAM `b407` has no licence file and no statement of origin. Take the Bell 407 from FGM `bell407` (licence stated) instead |
| SF `Boeing KC-135R Stratotanker` (MirzaArrafiERV_45, CC BY, 105,935 faces) | Description: "Convert from the game MFS (Microsoft Flight Simulator)". A game rip: the uploader cannot license it |
| SF `C-17_globemaster_lll (1)` (i_am_dead.) | Description: "also credits to martusmartus7878": a re-upload of someone else's work |
| SF `C17` (manilov.ap, CC BY, 21,930 faces) and other manilov.ap uploads | A bulk uploader (60+ aircraft, same days in 2017); the description is copied from Wikipedia; no statement that the model is the uploader's own. **Not counted.** The preview looks fine |
| SF `Airbus A400M Atlas` (Spark_Customs, CC BY, 41,314 faces) | The preview shows a crude tube with the wrong nose and tail. A "3D printable" bulk uploader |
| SF `Airbus A330neo`, `Airbus_a330-900_neo`, `A330-900Neo`, `Bombardier_Global_7500` (mhmdshwatahmdmhdy922, CC BY) | No descriptions; one account posting many airliners in days; origin unknown: **not counted** |
| SF `Gulfstream G600` (RBG_illustrations, CC BY, 7,138 faces) | A G600, not a G650; the preview shows a painted, fake "Gulf Stream" livery. Weak |
| SF C-130 models (Tyler_Dave 25,501 faces; others) | Not checked in depth: FGAddon has a C-130 with a clear licence |
| Headwind A339X (`github.com/headwind-msfs/a330-900`) | README: "The artistic assets within this repository, including models and textures, are licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC 4.0)." Non-commercial |
| NASA Airborne Science 3-D gallery (`airbornescience.nasa.gov/content/3D_Models_Gallery`): B200, C-130 (WFF), G3/G4/G5, HU-25, P-3, Twin Otter, DC-8, others, GLB | The page states **no licence, copyright, usage terms or credit** (I read it today; the earlier report says the same). Possibly free under NASA's general media rules, but unstated: **unclear**. Large files (earlier report: 11.7-48 MB), and NASA marks on the real aircraft may be in the textures |
| NASA-3D-Resources (`github.com/nasa/NASA-3D-Resources`), Smithsonian 3D | NASA-3D-Resources: no airliner, business jet, helicopter or military type in the folder list (only Global Hawk, X-57, Ingenuity, spacecraft). Smithsonian 3D: a web search found none of the types (the earlier report got 403 from 3d.si.edu; I did not retry) |
| Free3D "Global Express 6000 v00/v07", CGTrader (G650, Phenom 300, BD-700), TurboSquid "Global 6000 rigged", RenderHub, 3DRush, GreatCatalog | Store licences: "royalty-free", "Editorial Uses Only", "Extended Use License", subscription. Not allowed |
| `amvlab/aircraft-models` (CC BY 4.0) | Licence is fine, but it only holds A320, A350, A380, B737, B787, a drone and an eVTOL: nothing missing |
| FGA `CRJ700-family` | Not on the list (the app has CRJ700/900). Noted: its models are **CC BY 4.0** (`LICENSE`: "All models (AC3D format) and textures ... are licensed under Creative Commons Attribution 4.0 Unported (CC-BY)"), so a credit line is needed, not source disclosure |

## 4. Licence and credit duties for what is counted

- **GPL-2.0 vs GPL-3.0:** FGA `F-35B`, `OH-58D`, `767-300` (GPL v3 text) and FAM `b707` are GPL-3.0; most others are GPL v2 or "v2 or later". Do not merge a GPL-2.0-only mesh and a GPL-3.0 mesh into one GLB. The repository's `third_party/aircraft-models/` already holds both licence texts.
- **Source:** the GPL needs the corresponding source in the repository (as `third_party/aircraft-models/` does): keep the original `.ac`/`.glb`/`.blend`, the licence file, the SVN revision or Git commit, and the author lines.
- **LT blanket label:** LT calls every file GPL; record the upstream licence from the row instead.
- **767 upstream:** keep both texts (GPL v2 `COPYING`, GPL v3 `Documentation/License.txt`).
- **CC BY rows (Sketchfab, OGA, CRJ700-family):** credit title, author, URL, licence, and "modified"; record the licence on the day of download.

## 5. Not confirmed

- Triangle counts of every file except LT's (no downloads). Scale and shape of FGD, FGA, FGM and SKY models are unchecked; SKY checks length within 10 % in its own build.
- Whether a FlightGear "File"-level folder (only a `COPYING`) reflects the author's wish. The earlier report could not read FlightGear's FGAddon policy page (wiki, 403); I did not retry.
- `77F.ac` and `77L.ac` being the same geometry (same byte size only).
- Whether `777-300ER.ac` and `777-300.ac` in FGAddon are the same file (same byte size only).
- Whether the Sketchfab downloads work for this user (login needed); I did not log in.
- SKY release GLBs keep textures (JPEG up to 1,024 px) and may use meshopt; the earlier report flagged this for the pipeline.
- Real-world lengths and spans in notes are from memory.

## Summary

1. The `fgdata` base package (`AI/Aircraft`, GPL v2) is the best new source: one light AI-traffic file each for 747-8F, 777F/-200LR/-300ER, A300-600, A310, 717, MD-80, CRJ200, Dash 8-300, Beech 1900D, King Air 200, C172, F-16 (plus F-15, F/A-18).
2. Ready GLBs, no Blender: 747-8i, 767-200, 767-400, MD-11, Caravan (`livetaiwan`), and 777-300ER, CRJ200, Dash 8-300, King Air 200, C172 (`skytrails` release, textures to strip).
3. Heavy conversions from FGAddon/FGMEMBERS (licence read): King Air 350, Dash 8-100, DA40/DA42, R44, H125, Bell 407/206, H145, C-130, F-16 (full), MD-80.
4. Every counted model is GPL (v2, v2+ or v3) or CC BY; I counted none with NC, ND, store or unclear terms.
5. Nothing usable: A330neo, Phenom 300, G650, Global 6000, Citation CJ, KC-135, C-17, A400M (weak CC BY Sketchfab models exist for the first three).
6. The C-17 in FGMEMBERS says GPL-3.0 but rests on an "All rights reserved ... non-commercial" X-Plane model: rejected.
7. FGAddon's 717 and MD-80 come from Gary Neely's once-CC MD-81: the MD-80 records his relicensing to GPL v2 (counted); the 717 README still asks for his permission to adapt (not counted; the `fgdata` AI 717 is used instead).
8. The 767 upstream carries both a GPL v2 `COPYING` and a GPL v3 `License.txt`: record both.
9. Several FGAddon folders (KC-135, E-3, CH-47, F/A-18, F-15, Beech 1900D, Citation Bravo/X) have no licence statement: unclear, not counted (the `fgdata` AI copies of F-15, F/A-18, 1900D and Bravo are clear).
10. No file was downloaded and no mesh opened: triangle counts exist only for the `livetaiwan` files; everything else is file size.
