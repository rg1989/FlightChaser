<!-- .planning/reports/aircraft-model-sources.md -->
# Aircraft models: what is missing, where free 3-D models exist, what to add first

Research only. Nothing was downloaded or changed in the repository; no account was made. Checked on **2026-10-04**. Not legal advice.

**How to read the evidence.** "Seen" means I read the page, directory listing or licence file myself through WebFetch (which returns a small-model summary of the page, so I asked for licence headlines and file names and noted when a file said nothing). "Helper" means a helper agent read it and I did not re-check it. "Earlier report" means `aircraft-models-research.md` in this folder (2026-09-23), which I wrote and re-use where I cite it. Where I could not see a licence text, the word is **not confirmed**.

**What the app has today** (read from `public/models/manifest.json` and `third_party/aircraft-models/README.md`): 18 own models: A320, A320neo, A321, A321neo, 737-800, 737 MAX 8, 777-300, 787-9, A330-300, A350-900, E175, E190, CRJ900, ATR 72-500, 747-400, Citation II (550), Cessna 182, EC135, plus Cesium Air as the last-resort default. Every other type is drawn as the nearest of these, chosen by `client/scene/modelFor.ts`: the exact designator, then a `PREFIX*` entry, then the ADS-B category fallback (A1 → C182, A2 → Citation, A3 → A320, A4 → A321, A5 → 787-9, A7 → EC135), then the type family. Two consequences matter for the question:

- **Fighters and anything else with no listed designator are drawn as airliners or light aircraft, by ADS-B category.** An F-16 reaching the type-family fallback gets the A320 (`fallback.jet`); a T-6 gets the Cessna 182 or the Citation depending on the category it broadcasts; a UH-60 gets the EC135 (any helicopter designator does). Only C-135/KC-135/E-3/E-6 (as the 747-400), P-8 (as the 737-800) and KC-46 (as the 787-9) have a hand-listed stand-in. (Read from `modelFor.ts` and `icons.ts`; I did not run the app.)
- **Many "types" are stand-ins of the wrong size.** For example 777-200 is drawn with the 74.4 m 777-300, 767-300 (54.9 m) with the 65.8 m 787-9, 737-700 with the 39.5 m 737-800, the Q400 (32.8 m) with the 27.2 m ATR, the A220 with the 737, the A380 with the 747.

---

## 1. Summary table

"Flies how much" is the active fleet in IATA's June 2025 figures (Cirium data) unless another source is named; for military and general aviation see section 2. "Work" classes: **W0** = a ready glTF 2.0 file in livetaiwan-aircraft-models (copy, rename, record the licence, then FlightHopper's own manifest/gear/light steps as for the E190); **W1** = Blender file or glTF 1.0 from fr24-3d-models (their `bl_join_blend.py` + `canonicalise.py`); **W2** = FlightGear AC3D `.ac` (Blender 4.3 + AC3D add-on, or Assimp; strip cockpit/pilot/payload; then `bl_join.py` + `canonicalise.py`); **W3** = textured web model (strip textures and decimate, e.g. gltf-transform).

### Batch 1 (16 types; "about 15")

| # | Type (ICAO) | Flies how much | Best source | Licence (what I saw) | Format | Work |
|---|---|---|---|---|---|---|
| 1 | A319 / A319neo / A318 (A319, A19N, A318) | A319 855 active | livetaiwan `flightairmap/A319.glb` (and `A318.glb`), from FAM `a320/glTF2/` | GPL-2.0-only, same folder as the A320 already shipped | glTF 2.0 GLB, 4,382 tris, 281 KB | W0 |
| 2 | 767 (B763, B762, B764; KC-46 stand-in) | 767-300 666 | livetaiwan `B763.glb` (FAM `b767`); `b762`, `b764` from fr24 | GPL-2.0 (`b767/COPYING` present, seen) | GLB 2.0, 2,654 tris, 107 KB | W0 |
| 3 | 777-200 (B772, B77L) | 777-200 592 | livetaiwan `fr24/b772.glb` (fr24 `source/b772`, from FGMEMBERS/777) | fr24 states GPL-2.0 for all but two models; upstream 777 mirror has no licence file (earlier report: FGAddon `777/LICENSE` is GPL-2.0) | GLB 2.0, 2,373 tris, 79 KB; `.blend` in fr24 | W0 |
| 4 | 787-8 (B788) | 369 | livetaiwan `B788.glb` (FAM `b788`) | GPL-2.0 (`b788/COPYING` seen) | GLB 2.0, 2,975 tris, 165 KB | W0 |
| 5 | A330-200 (A332) | 353 | livetaiwan `A332.glb` (FAM `a332`) | GPL-2.0 (`a332/COPYING` seen) | GLB 2.0, 3,607 tris, 155 KB | W0 |
| 6 | Dash 8 Q400 (DH8D) | 377 | fr24 `models/q400.glb` + `source/q400/q400.blend` (FGMEMBERS/Q400); newer: FGAddon `DHC-8` | Q400 repo: GPL-2.0 (`LICENSE.txt`, GitHub says GPL-2.0, seen); FGAddon DHC-8: `COPYING` GPL-2.0 text (seen) | glTF 1.0 GLB 2.4 MB, 12.3k tris (earlier report); `.ac` for FGAddon | W1 (W2 for FGAddon) |
| 7 | A220 (BCS3, BCS1) | 538 in fleet (Airbus, Aug 2026) | livetaiwan `BCS3.glb`, `BCS1.glb` (FAM `bcs1`); or fr24 `cs300`, `cs100` | Upstream FGMEMBERS/CSeries: GPL-2.0, `COPYING` seen; the FAM folder itself has **no licence file** (seen) | GLB 2.0, 6,396 tris, 216 KB | W0, record the upstream licence |
| 8 | A380 (A388) | 193 in fleet (Airbus) | livetaiwan `A380.glb` (FAM `a380`) | GPL-2.0 (`a380/COPYING` seen) | GLB 2.0, 7,288 tris, 386 KB | W0 |
| 9 | King Air 200/350 (BE20, B350) | nearly 7,800 delivered (Textron, 2023) | FGAddon `Beechcraft-King-Air` (variant not stated); GLB alternative: Skytrails `be20` | FGAddon `COPYING` = GPL-2.0 text (seen); Read-Me is a blank template. Skytrails: GPL v2 for the fgdata AI model (upstream file licence not confirmed) | AC3D (FGAddon) or GLB with textures (Skytrails) | W2 (or W0-like) |
| 10 | Pilatus PC-12 (PC12) | nearly 2,000 delivered by May 2023 (Pilatus) | livetaiwan `PC12.glb` (FAM `pc12`) | GPL-2.0 (`pc12/COPYING` seen) | GLB 2.0, 3,094 tris, 112 KB | W0 |
| 11 | Piper PA-28 (P28A, P28R) | 18,612 registrations; 120 Archers shipped Q1-Q3 2025 | livetaiwan `PA28.glb` (FAM `pa28`) | GPL-2.0 (`pa28/COPYING` seen) | GLB 2.0, 3,910 tris, 136 KB | W0 |
| 12 | Robinson R44 (R44) | 4,401 registrations; 118 shipped Q1-Q3 2025 | FGAddon `R44` (`Models/r44.ac`) | `COPYING` = GPL-2.0 text (seen); Read-Me names Emmanuel Baranger and states no licence | AC3D | W2 |
| 13 | UH-60 Black Hawk (H60) | about 4,000 flying in 36 nations (Lockheed) | FGAddon `UH-60` (`Models/uh60.ac`, 3.2 MB) | `COPYING` = GPL-2.0 text (seen); Read-Me states no licence | AC3D | W2 |
| 14 | C-130 Hercules (C130, C30J) | 570+ C-130J delivered (Lockheed); USAF 277 C-130H/J | FGAddon `C130` (`Models/c130.ac`, 3.5 MB) | `COPYING` = GPL-2.0 text (seen); Read-Me (Baranger) states no licence | AC3D | W2 |
| 15 | F-16 (F16) | about 3,100 operating (Lockheed, Oct 2025) | FGAddon `f16` (`Models/f16.ac`, 1.7 MB; `f16.blend` in tree) | `copyright.txt`: GPL v2 or later, Erik Hofman 2023 and `authors.txt` (seen); `LICENSE` = GPL-2.0 text | AC3D + Blender source | W2 |
| 16 | T-6 Texan II (T6) | 1,000+ delivered (Textron); USAF 442 | FGAddon `Beechcraft-T6-Texan-II` (`Models/t6II.ac`, 3.0 MB) | `COPYING` = GPL-2.0 text (seen, no "or later" grant in it); Read-Me states no licence | AC3D | W2 |

### Batch 2 (next ~25; sources and licences in §4.2)

757-200/-300 · 747-8 · MD-11 · A340 · 737 -600/-700/-900 and classic -300 · ATR 42 · CRJ700/CRJ200 · ERJ-145 · E170 · Cessna Caravan · TBM · SR22 · DA40/DA42 · Bell 206/407 · H125/EC130 · AH-64 · CH-47 · V-22 · KC-135 · E-3 · C-17 · A400M · Typhoon · F-35 · F-15 · F/A-18 · PC-21 · Gulfstream G550 · Falcon 50 · MD-80 · A300-600 · Citation Bravo/X.

### Not available as a free model, or only as a stand-in

Learjet 45/60 · Embraer Phenom 100/300 and Legacy · Embraer E2 family · COMAC C919 and ARJ21 (C909 is 154 active, IATA) · Sukhoi Superjet · KC-46 and P-8 (use the 767 and 737 stand-ins) · Challenger 350/604 (only a CRJ700-derived FlightGear model without a licence file) · Beechcraft Bonanza · Mooney · Saab 340 · Dornier 328 (FGAddon has `DO-228`, not the 328) · Airbus H145, AW139, H125 as such (nearest: EC130).

---

## 2. Ranked gap list: types with no model of their own

"Stand-in" is what `public/models/manifest.json` draws today; the size error compares the stand-in's `lengthM` with the length of the model that could replace it (from livetaiwan's `docs/model-manifest.json`, so both are measured on files, not recalled). Where I rank by my own judgement I say so.

### 2.1 Airliners, ranked by active fleet

Source of the fleet column: **IATA, "The global commercial aircraft fleet", August 2025, charts 3 to 6** (data as of June 2025; Cirium Fleets Analyzer). I opened the PDF and read the chart labels myself. Types IATA does not break out (inside "Other") use **Airbus Orders & Deliveries, August 2026, "In Fleet"** (earlier report; I did not reopen the workbook) or are marked as my judgement.

| Rank | ICAO | Type | Active (IATA Jun 2025) | Stand-in today | Stand-in vs replacement | Free model available |
|---|---|---|---|---|---|---|
| 1 | A319 (+A19N, A318) | A319 | 855 | `a320` | 38.2 m vs 33.9 m: 13 % long (A318: 21 %) | livetaiwan `A319.glb`, `A318.glb` (GPL-2.0, FAM) |
| 2 | B763 (+B762, B764) | 767-300 | 666 | `b789` (B76*) | 65.8 m vs 54.9 m: 20 % long | livetaiwan `B763.glb`; fr24 `b762`, `b764` |
| 3 | B737 (+B736, B739, B733-B735) | 737-700 | 654 | `b738` | 39.5 m vs 35.0 m (FG model; the real -700 is shorter): 13 % long | fr24 `b737`, `b736`, `b739`; FGAddon `737-300` (classic); licence for the NG ones is **not confirmed** upstream |
| 4 | B772 (+B77L) | 777-200 | 592 | `b773` | 74.4 m vs 64.5 m: 15 % long | livetaiwan `b772.glb` |
| 5 | DH8D (+DH8A-C) | Dash 8-400 | 377 | `at75` (DH8*) | 27.2 m vs 32.6 m: 17 % short | fr24 `q400.glb`; FGAddon `DHC-8` |
| 6 | B788 | 787-8 | 369 | `b789` | 65.8 m vs 56.6 m: 16 % long | livetaiwan `B788.glb` (FAM) |
| 7 | A332 | A330-200 | 353 | `a333` | 63.1 m vs 58.4 m: 8 % long | livetaiwan `A332.glb` (FAM) |
| 8 | E145 | ERJ-145 | 286 | `e75l` | 30.8 m vs 29.8 m | livetaiwan `E145.glb` (FAM) |
| 9 | CRJ7 | CRJ700 | 248 | `crj9` | 36.4 m vs 32.5 m: 12 % long | livetaiwan `CRJ7.glb`, fr24 `crj700` |
| 10 | SU95, C909 | Superjet 100 (139), ARJ21 (154) | 139 + 154 | `a320` (no listing) | wrong shape (rear-engine regional) | **none free found** |
| 11 | CRJ2 | CRJ200 | 172 | `crj9` | 36.4 m vs 29.0 m: 25 % long | livetaiwan `CRJ2.glb` |
| 12 | B752 (+B753) | 757-200 | 436 active in 2026 (Simple Flying, secondary; IATA lists "757 family" only in storage chart: 113 stored) | `a321` | 44.5 m vs 46.2 m | livetaiwan `B752.glb`, fr24 `b753`; FGAddon `757-200` (active, GPL) |
| 13 | BCS3, BCS1 | A220-300, -100 | 463 + 75 in fleet (Airbus Aug 2026); IATA WATS: 530k flights in 2025, +770 % since 2019 | `b738` (explicit) | same length, different shape | livetaiwan `BCS3.glb`, `BCS1.glb` |
| 14 | A388 | A380 | 193 in fleet (Airbus Aug 2026) | `b744` | length equal, span 65.4 m vs 80.4 m: 19 % short | livetaiwan `A380.glb` |
| 15 | AT45 / AT43 | ATR 42 | not broken out (inside "Other" turboprops 1,061) | `at75` | 27.2 m vs 22.8 m: 19 % long | livetaiwan `AT45.glb`, fr24 `atr42` |
| 16 | MD11 | MD-11 | not broken out (my judgement: mostly cargo carriers) | falls through to `b789` (heavy) | 65.8 m vs 61.6 m | livetaiwan `MD11.glb` (FAM, GPL-2.0-or-later); FGAddon `MD-11` (GPL-2.0) |
| 17 | B748 | 747-8 | 155 delivered (Boeing), 107 freighters (secondary) | `b744` | 71.0 m vs 76.6 m | livetaiwan `B748.glb` |
| 18 | A343, A346 | A340-300, -600 | not broken out | `b744` (A34*) | 71.0 m vs 63.8 m | livetaiwan `A343.glb` (711 KB, heavy); fr24 `a346` |
| 19 | MD81-MD88 | MD-80 | not broken out | `crj9` (MD8*) | 36.4 m vs about 45 m | FGAddon `MD-80` (GPL-2.0, active) |
| 20 | B39M, B37M, B3XM | 737 MAX 9 / 7 / 10 | 348 MAX 9 delivered (Boeing) | `b38m` | MAX 8 stand-in; length differs by up to 2.5 m | none needed |
| 21 | A306, A310 | A300-600, A310 | not broken out | `a333` | A333 63.1 m vs A300 54.1 m | FGAddon `A300-600` (`gpl-2.0.txt` seen, active) |

Regional turboprops with no listing and no free model at all in the three collections: **DHC-6 Twin Otter (DHC6) 209 active, Beech 1900D (B190) 175, Fairchild Metro (SW4) 122** (IATA chart 6). Today they fall to the category fallback (a Twin Otter listed as `A1`/light becomes the Cessna 182). FGAddon has `b1900d`, `Fairchild-Metroliner` and `dhc6`; I did not open their licence files.

Ranking judgement: IATA fleet counts are a proxy for "how often it flies". Flights per day rank the same way for the big families (737 about 29,600 a day, A320 23,800, A321 11,500 in 2025, IATA WATS) but under-state regional jets in the US (E175 and CRJ900 are 3rd and 8th by US scheduled flights, April 2025, Cirium via Simple Flying, secondary; earlier report).

### 2.2 Business jets and turboprops

No active-fleet census by type exists in a free primary source, so the proxy is **units delivered** (manufacturers) and **shipments in the first three quarters of 2025** (GAMA General Aviation Aircraft Shipment Report, 2025 Third Quarter, dated 2 Dec 2025; I opened the PDF and read the tables). The rank is my judgement from those two columns. Stand-ins: today every `C25*`, `C5*`, `C6*`, `GLF*`, `LJ*`, `FA*`, `CL*` and others in the `c550` list draw as the Citation II; King Air, Caravan, PC-12 and TBM are **not listed** and fall to the ADS-B-category fallback (Cessna 182 for `A1`, Citation for `A2`).

| Rank | Type (ICAO) | Delivered / in service (source) | GAMA Q1-Q3 2025 | Free model |
|---|---|---|---|---|
| 1 | King Air 90/200/250/350 (BE20, B350, BE9L) | nearly 7,800 delivered (Textron, 17 Oct 2023) | 31 (260: 15, 360: 16) | FGAddon `Beechcraft-King-Air` (variant unconfirmed); Skytrails `be20`; NASA B200 GLB |
| 2 | Citation family (C25x, C56X, C68A, C700) | 8,000th delivered Feb 2022 (Flying, secondary) | 122 (M2, CJ3+, CJ4, XLS+, Latitude, Longitude) | covered by `c550` (a Citation II) |
| 3 | Gulfstream large-cabin (GLF4, GLF5, GLF6, GLEX, G280) | more than 3,000 in service (General Dynamics 10-K for 2025); G450+G550 more than 1,650; G650 family more than 595 | 113 | FGMEMBERS `GulfstreamG550`; NASA G-III/IV/V GLBs |
| 4 | Cessna Caravan (C208) | 3,000th delivered Jan 2023 (Textron) | 63 (EX 58, 675: 5) | livetaiwan `C208.glb`, Skytrails `c208`, FGAddon |
| 5 | Challenger 300/350/604/605 (CL30, CL35, CL60) | 1,000th super-midsize Feb 2025 (Bombardier); Challenger 300 series almost 800 by Feb 2020 | 46 | Skytrails `cl60`; FGMEMBERS `Challenger650` (no licence file) |
| 6 | Falcon 2000/900/7X (F2TH, F900, FA7X) | 2,500 delivered (Oct 2025, press; Dassault page was blank) | 12 (first half only) | FGAddon `Falcon-50` |
| 7 | PC-12 (PC12) | nearly 2,000 by May 2023 (Pilatus); 82 delivered in 2025 | 45 | livetaiwan `PC12.glb` |
| 8 | Learjet 40/45/60/75 (LJ45, LJ60) | 3,043 built, production ended 2022 (search snippet only) | n/a | **none in FlightGear**; Sketchfab CC-BY only |
| 9 | Phenom 100/300 (E50P, E55P) | 900+ Phenom 300 in service (Embraer) | 58 | none free found |
| 10 | TBM 700-960 (TBM9, TBM8) | 1,294 delivered to 31 Dec 2025 (Daher) | 29 | FGAddon `daher-tbm-family` (GPL-3.0) |
| 11 | Twin Otter (DHC6), Metro (SW4), Beech 1900 (B190) | DHC-6-300 209 active, 1900D 175, SA227 122 (IATA chart 6) | n/a | FGAddon `dhc6`, `Fairchild-Metroliner`, `b1900d` (licences not opened) |
| 12 | PC-24, Citation Latitude/Longitude, Vision Jet | PC-24 29, Latitude 34, Longitude 14, SF50 72 shipped | | FGAddon `Pilatus-PC-24` |

### 2.3 Light aircraft and helicopters

Counts of registered aircraft come from two registration databases (earlier report; OpenSky's is "unlicensed", the ADS-B Exchange file must not be shipped), so they only rank types. Shipments are GAMA Q1-Q3 2025 (read myself).

| Rank (my judgement) | Type (ICAO) | Registrations / production | GAMA Q1-Q3 2025 | Stand-in today | Free model |
|---|---|---|---|---|---|
| 1 | Cessna 172 (C172) | 28,541 ADS-B Exchange rows; 44,000+ built (secondary) | 148 (172S) | `c182` (listed; 8.5 m vs 8.3 m: fine) | keep the 182 |
| 2 | Piper PA-28 (P28A, P28R) | 18,612 rows (P28A) | 120 (Archer) | `c182` (`P28*`): **high-wing instead of low-wing** | livetaiwan `PA28.glb`, FGAddon `Piper-PA-28` |
| 3 | Cessna 182 (C182) | 13,897 rows | 29 | own model | |
| 4 | Cirrus SR22/SR22T (SR22, S22T) | 5,507 + 3,588 rows; 11,000th SR delivered (Cirrus, per earlier report) | SR20 109, SR22 110, SR22T 264 | `c182` (`SR2*`; `S22T` is not matched by `SR2*` and falls through): wrong wing | livetaiwan `SR22.glb` |
| 5 | Robinson R44 (R44), R22 | 4,401 rows; 5,000th Raven II Aug 2026 (earlier report) | R44 118, R22 12, R66 50 | `ec135` (helicopter fallback) | FGAddon `R44`, `R22` |
| 6 | Airbus H125/AS350 (AS50) | about 4,200 in service (Airbus H125 page, undated) | 71 | `ec135` | FGAddon `ec130` (nearest) |
| 7 | Bell 206 (B06), Bell 407 | 3,334 / 1,571 rows; 1,642 civil 407s in use (snippet) | 407GXi 27, 505 44, 429 12 | `ec135` | livetaiwan `B407.glb` (no licence file), FGAddon `Bell-206-JetRanger` |
| 8 | H135 (EC35) | over 1,600 delivered (Airbus H135 page, earlier report) | 28 | own model | |
| 9 | Diamond DA40/DA42/DA62 | DA40: 2,200 delivered by end 2020 (snippet) | 56 / 36 / 53 | `c182` (light fallback) | FGAddon `Diamond-Da40`, `Diamond-Da42` |
| 10 | H145, AW139 (EC45, A139) | AW139 more than 1,200 delivered (snippet) | 53 / 47 | `ec135` | none (nearest EC135) |
| 11 | Bonanza (BE35, BE36), Mooney, Pipers | Textron is discontinuing the Bonanza | G36: 6 | `c182` | none found |

### 2.4 Military

Fleet and delivery totals are manufacturer pages or the USAF inventory (Air & Space Forces Magazine almanac, as of 2023-09-30; I read the table). **Nothing published ranks military types by how often they show on public ADS-B.** The best quantitative evidence is the OpenSky paper (Schafer et al., DASC 2017, https://s3.opensky-network.org/website-public-files/publications/dasc17.pdf; I opened it): of **6,024** distinct military aircraft whose Mode S transponder OpenSky saw in April 2017, transport aircraft were 1,691 (28.1 %), trainers 1,356 (22.5 %), helicopters 924 (15.3 %), business jets 486 (8.1 %), fighter/attack 409 (6.8 %), tankers 325 (5.4 %), surveillance 214 (3.6 %), UAV 12, uncategorised 607. Only 42.9 % of the state aircraft used ADS-B; tankers had the highest equipage; the paper saw 2 MQ-9 and 3 RQ-4. A 2024 forum post counted ADS-B Exchange database rows (hex codes, not sightings): C-130 628, C-30J 525, KC-135 408, C-5/C-17 327, V-22 260, E-6B/E-3B 62 (secondary).

Every military designator below is **drawn today with another aircraft's model** (an airliner, a light aircraft or the EC135 helicopter), including the hand-listed C-135/KC-135/E-3/E-6 (as the 747-400), P-8 (737-800) and KC-46 (787-9).

| Rank (my judgement) | Type (ICAO) | Fleet / deliveries (source) | Stand-in today | Free model |
|---|---|---|---|---|
| 1 | C-130 Hercules (C130, C30J) | 570+ C-130J delivered, 27 nations, Israel an operator (Lockheed fast facts, Sep 2026); USAF 151 C-130J + 126 C-130H | category fallback (A320 or A321) | FGAddon `C130`; NASA C-130 GLB |
| 2 | KC-135 (K35R) | USAF 376 (325 R + 51 T) | `b744` (listed) | FGAddon `KC135` (no licence file) |
| 3 | C-17 (C17) | USAF 222; 279 built (snippet only) | category fallback | FGMEMBERS `C-17` (X-Plane origin); Sketchfab |
| 4 | UH-60 (H60) | about 4,000 flying in 36 nations (Lockheed Sikorsky page); USAF 61 HH-60G; 47 Black Hawks shipped Q1-Q3 2025 (GAMA) | `ec135` (heli fallback) | FGAddon `UH-60` |
| 5 | F-16 (F16) | about 3,100 operating in 29 nations (Lockheed, Oct 2025); USAF 862 | category fallback (A320) | FGAddon `f16` |
| 6 | T-6 Texan II (T6) | 1,000th delivered Oct 2022, 14 nations incl. Israel (Textron); USAF 442 T-6A | category fallback (Cessna 182 if `A1`) | FGAddon `Beechcraft-T6-Texan-II` |
| 7 | KC-46 (K46) | 100th delivered Dec 2025 (press); USAF 72 | `b789` (listed) | none; 767 model |
| 8 | P-8 (P8) | 170+ delivered, 9 nations (Boeing) | `b738` (listed; right airframe) | none needed |
| 9 | CH-47 (H47) | no total published by Boeing | `ec135` | FGAddon `ch47` (no licence file) |
| 10 | AH-64 (H64) | 2,875+ produced, 19 nations, Israel included (Boeing, Nov 2025) | `ec135` | FGAddon `apache` |
| 11 | V-22 (V22) | fleet of 450 (Bell); USAF 52 CV-22B | category fallback | FGAddon `V22-Osprey` |
| 12 | F-35 (F35) | nearly 1,300 delivered, 191 in 2025 (press); USAF 408 F-35A | category fallback | FGAddon `F-35B` (B only); Sketchfab |
| 13 | E-3 (E3TF, E3CF) | USAF 15 | `b744` (listed) | FGAddon `E3B` (no licence file) |
| 14 | F-15 (F15, F15E) | USAF 218 F-15E | category fallback | FGAddon `F-15` (no licence statement) |
| 15 | A400M (A400), C-27J, C-295, KC-390 | A400M about 130 (snippet), 10 operators (Airbus, Nov 2025); C-27J 100 sold; C295 300 orders | category fallback | FGMEMBERS `a400m`; Sketchfab |
| 16 | Eurofighter (EUFI), F/A-18 (F18H/S), Tornado, Rafale, Gripen | Typhoon 613 delivered Sep 2025 (secondary); Rafale 300th delivered Oct 2025 | category fallback | FGAddon `eurofighter`; Sketchfab |
| 17 | A330 MRTT | 84 orders from 17 customers (Airbus, Jun 2025) | `a333` (listed `A33*`) | none needed |
| 18 | MQ-9, RQ-4, Hermes/Heron | USAF 244 MQ-9A | category fallback | FGAddon `MQ-9` (not opened); NASA Global Hawk GLB |

**For the Israel default view** (my inference, not a counted statistic): the IAF's own jets rarely appear on public ADS-B (The Aviationist, 2020, on the F-35I; helper), so what the map shows over Israel is mostly the US/allied tankers and transports (a 28 Feb 2026 report names KC-46A and KC-135R tankers returning to Tel Aviv, itamilradar.com, secondary), civil traffic, and helicopters. The IAF types that exist as FlightGear models: C-130, F-16, F-15, F-35B, AH-64, UH-60, T-6, a 707 (`707`) and a Gulfstream G550 (FGMEMBERS); fleet counts for them came from an aggregator page I could not open (snippet only), so I do not quote them. Ben Gurion's own annual report (IAA, 2025: 140,736 movements) gives no breakdown by aircraft type.

### 2.5 Where the figures in §2 come from

Read by me: IATA fleet report (PDF, charts 1 to 6): https://www.iata.org/en/iata-repository/publications/economic-reports/the-global-commercial-aircraft-fleet/ · GAMA, General Aviation Aircraft Shipment Report, 2025 Third Quarter (2 Dec 2025): https://gama.aero/wp-content/uploads/2025ShipmentReport_12-02.pdf · USAF inventory table: https://www.airandspaceforces.com/article/2024-usaf-ussf-almanac-equipment/ · OpenSky, DASC 2017, Table II: https://s3.opensky-network.org/website-public-files/publications/dasc17.pdf.

Read by a helper (page text came through the fetch tool's summary; quotes not re-checked by me): Lockheed Martin C-130J and F-16 fast-facts PDFs (lockheedmartin.com/content/dam/lockheed-martin/aero/documents/…); Boeing P-8, AH-64 and F/A-18 pages (boeing.com/defense/…); Lockheed Sikorsky S-70 page; Bell V-22 page (bellflight.com/products/bell-boeing-v-22); Textron T-6 1,000th delivery (media.txtav.com/219204-…), King Air (media.txtav.com/231060-…) and Caravan (investor.textron.com, 13 Jan 2023); Pilatus annual report 2025 (pilatus-aircraft.com/en/news/annual-report-2025); Daher 2025 deliveries (tbm.aero/news/card/…/212); Bombardier 1,000th super-midsize (bombardier.com, 27 Feb 2025); General Dynamics 10-K for 2025 (sec.gov, Gulfstream fleet); Airbus H125 page, A330 MRTT (Jun 2025) and A400M (Nov 2025) releases; Leonardo C-27J release (14 May 2026); Breaking Defense on F-35 deliveries (8 Jan 2026); Stripes on the 100th KC-46A (5 Dec 2025). "Snippet" in a cell means only a search-result excerpt, no page read. Wikipedia and Simple Flying are secondary and are labelled so. The ADS-B Exchange and OpenSky registration counts are from the earlier report.

## 3. Sources, one section each

### 3.1 The three collections already in use: what is still untaken

All three are GPL and already in the project's pipeline. **No military aircraft in any of them** except types that are also civil (PC-21 trainer, DHC-4 Caribou, Tu-134, P-40 warbird, a 707 that stands in for tankers).

**Flightradar24/fr24-3d-models** (https://github.com/Flightradar24/fr24-3d-models, seen)
- `models/` has 41 files (names and sizes seen through the GitHub contents API): a318, a319, a320, a321, a332, a333, a343, a346, a359, a380, an225 (`.gltf`), ask21, atr42, b736, b737, b738, b739, b744, b748, b752, b753, b762, b763, b764, b772, b773, b788, b789, bae146, beluga, citation, crj700, crj900, cs100, cs300, e170, e190, `heli.glb`, millennium_falcon (`.gltf`), pa28, q400. `source/` has 39 folders with the Blender files (for example a350, citation, ec135, q400; none for an225 or the Falcon). `heli.glb` has no source folder of its own; because `source/ec135` exists and `models/` has no `ec135.glb`, it is probably the EC135, but that is **not confirmed**.
- Licence: README says GPLv2 for everything except the Millennium Falcon (CC BY 4.0) and a 3D Warehouse Santa; the credits table names each FGMEMBERS upstream (seen). Last commit 2020-01-16 (earlier report).
- Format: glTF 1.0 GLB plus `.blend`. Untaken types of interest: b762/b763/b764, b772, b788, b748, b752/b753, a318/a319, a332, a343/a346, a380, atr42, **q400** (the only copy of the Q400 in these collections), cs100/cs300, crj700, e170, bae146, beluga, an225.
- Upstream licence gaps: `FGMEMBERS/737NG` (b736, b737, b739) and `FGMEMBERS/777` mirrors carry no licence file, and FGAddon `Aircraft/737NG` has no licence file in its listing (seen today). The 777 has a GPL-2.0 `LICENSE` in FGAddon (earlier report). The 737-800 is covered by `FGMEMBERS/737-800` (GPL-2.0, already shipped).

**Ysurac/FlightAirMap-3dmodels** (https://github.com/Ysurac/FlightAirMap-3dmodels, seen)
- Root folders (seen): a320, a332, a333, a343, a350, a380, ask21, atr42, atr72, b407, b707, b744, b748, b752, b767, b777, b788, bcs1, c182, c208, c421, c550, crj2, crj9, dhc4, dr40, e145, e190, ec35, gazl, md11, p40, pa18, pa22, pa28, pa32, paraglider, pc12, pc21, sr22, t134, ulac. The A318/A319 live in `a320/glTF2/` beside A320/A321 (seen).
- Licence: no top-level file; each folder has its own. Seen today: `COPYING` in b788, b767, a332, a380, dhc4, pc12, pa28, sr22; `LICENSE` in b752, b748, md11; `License.txt` in pc21 (GPL-3.0 English text, 35 KB). **bcs1 and b407 have no licence file** (seen). The earlier report records `atr72`, `b707` and `pc21` as GPL-3.0, `b752`/`md11` as GPL-2.0-or-later (their `LICENSE` has the "or any later version" notice).
- Each folder is a git submodule pointer to its FlightGear upstream (the 0-byte entries such as `CSeries`, `747-8i`, `A380-omega`) plus a Blender file and `glTF2/`; sizes of the Blender files seen: bcs1 5.9 MB, a380 9.6 MB, md11 5.9 MB, pc21 2.1 MB, dhc4 2.8 MB, b748 4.6 MB.

**GoLocalNear/livetaiwan-aircraft-models** (https://github.com/GoLocalNear/livetaiwan-aircraft-models, seen)
- 68 web-ready GLBs under `models/flightairmap/` (48) and `models/fr24/` (20), all glTF 2.0, one mesh, no textures, `COLOR_0` shading, one axis convention. Its `docs/model-manifest.json` gives triangles, KB, length and span for each. One commit (2026-08-19), 0 stars; FlightHopper's README already checked each shipped file against the upstream hashes.
- **Not yet taken by FlightHopper**, with measured numbers from `docs/model-manifest.json` (tris / KB / length m): 707 (3,173 / 214 / 45.6), 757 = B752 (6,690 / 272 / 46.2), A318 (4,193 / 273 / 31.7), A319 (4,382 / 281 / 33.9), A332 (3,607 / 155 / 58.4), A343 (12,236 / 711 / 63.8), A380 (7,288 / 386 / 72.7), AS21 glider (3,300 / 125), AT45 (4,779 / 218 / 22.8), B407 (4,984 / 233 / 13.1), B748 (5,649 / 294 / 76.6), B763 = B767 (2,654 / 107 / 54.9), B788 (2,975 / 165 / 56.7), BCS1 (5,183 / 213 / 35.1), BCS3 (6,396 / 216 / 38.2), C208 (4,000 / 137 / 12.6), C421 (3,287 / 114), CRJ2 (1,151 / 62 / 29.0), CRJ7 (3,008 / 150 / 32.5), DHC4 (3,934 / 167 / 22.1), DR40 (3,219 / 117), E145 (3,500 / 127 / 29.8), E170 (3,980 / 154 / 29.8), GAZL Gazelle (15,977 / 715 / 10.6), MD11 (10,247 / 406 / 61.6), P40 (4,746 / 136), PA18, PA22, PA28 (3,910 / 136 / 7.2), PA32, PC12 (3,094 / 112 / 14.4), PC21 (3,075 / 124 / 9.9), SR22 (4,600 / 156 / 7.9), T134 (4,652 / 177 / 41.6), and from fr24: b736, b737, b739, b753, b762, b764, b772 (2,373 / 79 / 64.5), bae146, beluga, cs100, crj700, e170. Gear is not modelled in any of them (FlightHopper builds `<id>-gear.glb` from `tools/models/gear-glb.ts`).
- Caveats: livetaiwan labels everything GPL-2.0-or-later, which is wrong for several files (FlightHopper already records the upstream licence per file). Its helicopter orientation is by file name in `canonicalise.py`, so a new helicopter needs a case there.

### 3.2 FlightGear FGAddon (the pool for military, helicopters, bizjets and turboprops)

- **Where:** SVN trunk, https://sourceforge.net/p/flightgear/fgaddon/HEAD/tree/trunk/Aircraft/ (directory listing at https://svn.code.sf.net/p/flightgear/fgaddon/trunk/Aircraft/, seen: several hundred aircraft folders). Last commits are recent (July to September 2026 on several). The FGAddon wiki page returned 403 today; the policy quote ("strongly recommended … GPLv2+") is from the earlier report (https://wiki.flightgear.org/FGAddon, 2026-09-23).
- **Format:** AC3D `.ac` plus XML animation/properties; textures in `Models/` and `Liveries/`. Gear, propellers, rotors, pilots, cockpit and payload are separate `.ac` objects or sub-models, which a conversion has to drop (FlightHopper draws its own gear from `gear-glb.ts`). No polygon counts are stated; file sizes are the only measure (AC3D text, includes UVs).
- **Conversion:** `NikolaiVChr/Blender-AC3D` (GPL-2.0-or-later; README lists Blender 4.3, 4.1, 4.0 and older, **no 5.x**: not confirmed to work with the Blender 5.2 FlightHopper used for the E190) or Assimp (its file-format list names AC3D as an importer and glTF 2.0 as a "partial" exporter, https://github.com/assimp/assimp/blob/master/doc/Fileformats.md, seen). Then the existing `bl_join.py` + `canonicalise.py`.
- **Licence rule of thumb:** each aircraft folder carries its own licence file; FGAddon policy is GPLv2+, but a folder can differ (the TBM, PC-21, F-35B and 737-300 are GPL-3.0). "Seen" below means I opened the file and read its heading; "listed" means the file is in the folder listing but I did not open it.

| Aircraft (folder) | Licence evidence | Model file seen | Notes |
|---|---|---|---|
| **C-130** (`C130`) | `COPYING` GPL-2.0 text, seen; `Read-Me.txt` names Emmanuel Baranger, no licence statement | `Models/c130.ac` **3.5 MB** | variants C-130, C-130K, AC-130, KC-130 |
| **F-16** (`f16`) | `copyright.txt`: GPL v2 or later, Erik Hofman 2023 + contributors in `authors.txt`; `LICENSE` GPL-2.0 text; seen | `Models/f16.ac` **1.7 MB** (109,000 lines), `f16.blend`, separate nozzle/brake/pylon parts | the cleanest military licence |
| **F-35B** (`F-35B`) | `License.txt` = **GPL-3.0** text, seen | `Models/F-35B.ac` 1.6 MB (94,712 lines) | B variant (lift fan) only; no F-35A/I |
| **Eurofighter Typhoon** (`eurofighter`) | `README`: "released under the terms of the GPLv2" (seen); model by Maverick Alex, textures AlMurSi | `Models/typhoon.ac` 3.5 MB | includes weapons/tanks as separate `.ac` |
| **F-15** (`F-15`) | `README.txt` names Richard Harrison (2015), **states no licence**; no COPYING listed | `Models/f15c.ac` (size not seen) | licence **not confirmed** |
| **F/A-18** (`f18`; do not confuse with `Hornet`, an autogyro) | no licence file listed | not seen | licence **not confirmed** |
| **KC-135** (`KC135`) | no licence file listed; `KC135-set.xml` credits Innis Cunningham, Vivian Meazza, David Culp, Julien Pierru, states no licence | `Models/KC135.ac` **531 kB** (30,547 lines) | light and simple; licence **not confirmed** |
| **E-3** (`E3B`) | no licence file listed | `Models/E3B.ac` (size not seen) | licence **not confirmed** |
| **UH-60** (`UH-60`) | `COPYING` GPL-2.0 text, seen; `Read-Me.txt` Baranger, no licence statement | `Models/uh60.ac` **3.2 MB** | rotors are separate objects |
| **AH-64** (`apache`) | `read-me.txt`: model by Alex Park (2008), "GPL" without version (seen) | `Models/apachemodel/apache.ac` (size not seen) | cockpit parts reuse A-10 art |
| **CH-47** (`ch47`) | no licence file listed | `Models/ch47.ac` 1.6 MB (72,229 lines) | licence **not confirmed** |
| **V-22** (`V22-Osprey`) | `COPYING` listed (dated 2014-09-09, text not opened), `Read-Me.txt` credits Oliver Thurau (3D upgrade), Detlef Faber, Maik Justus, Paolo Amoroso, no licence statement | `Models/v22.ac` (size not seen) | tilt-rotor needs a pose choice |
| **T-6 Texan II** (`Beechcraft-T6-Texan-II`) | `COPYING` GPL-2.0 text, seen (no "or later" grant); `Read-Me.txt` Baranger | `Models/t6II.ac` **3.0 MB** | |
| **PC-21** (`PC-21`) | `License.txt` = GPL-3.0 text, seen | not seen | FAM's `pc21` is the same model in glTF |
| **B-52F** (`B-52F`) | `COPYING` listed | not seen | rare on ADS-B |
| 757-200/-300 (`757-200`) | `LICENSE` GPL-2.0 text (18.7 KB), seen; `AUTHORS` | not seen | active in 2026 |
| 767-300 (`767-300`) | `LICENCE`: **English GPL-3.0 + a Portuguese GPL-2.0 translation**, seen (the same bilingual file as the ATR72's) | not seen | FAM's `b767` has a plain GPL-2.0 `COPYING` instead |
| 737-300 (`737-300`) | `LICENSE.md` = **GPL-3.0**, seen | not seen | classic B733; 737NG folder has no licence file |
| MD-80 (`MD-80`), MD-11 (`MD-11`) | `LICENSE` GPL-2.0 text for both, seen (Octal450) | not seen | updated 2026-09 |
| A300-600 (`A300-600`) | `gpl-2.0.txt` listed, README.md | not seen | |
| DHC-8 (`DHC-8`) | `COPYING` GPL-2.0 text, seen | not seen | -100/-200/-300/-400 in one aircraft |
| Falcon 50 (`Falcon-50`) | `COPYING` listed, `Read-Me.txt` | not seen | for F2TH/FA7X stand-in |
| King Air (`Beechcraft-King-Air`) | `COPYING` GPL-2.0 text, seen; `Read-Me.txt` is a blank template (Baranger) | not seen | variant not stated: **not confirmed** (B200 or 350) |
| TBM (`daher-tbm-family`) | `LICENSE` = **GPL-3.0**, seen; thefgfseagle, 2023 | not seen | do not confuse with `TBM-Avenger` (a WWII bomber) |
| Caravan (`Cessna-208-Caravan`), PA-28 (`Piper-PA-28`), SR22 (`Cirrus-SR22`), DA40 (`Diamond-Da40`), DA42 (`Diamond-Da42`) | `COPYING` listed for all; helijah is the maintainer of each | not seen | all GPL by folder policy; text not opened |
| R44 (`R44`) | `COPYING` GPL-2.0 text, seen; Read-Me Baranger | `Models/r44.ac` (size not seen) | R44 Clipper and Raven |
| Bell 206 (`Bell-206-JetRanger`), EC130 (`ec130`, = H130), Bo105 (`bo105`) | `COPYING` listed for all three (the Bo105's is described as GPLv2 in the listing summary) | not seen | EC130 is the nearest to an AS350/H125 |
| Cessna 172: not in FGAddon as such (`c172r`, `c182s` exist); the maintained model is **github.com/c172p-team/c172p** | GPL-2.0 (repository footer, seen) | `Models/c172-common.ac` 3.2 MB (earlier report) | heavy interior; stripping needed |

Not in FGAddon: C-17, A400M, KC-46, P-8, Learjet, Challenger, Gulfstream, Phenom, E-jets beyond the ERJ-145, any Superjet/ARJ21/C919.

### 3.3 FlightGear FGMEMBERS on GitHub

- 886 repositories (https://github.com/orgs/FGMEMBERS/repositories, seen). Most are mirrors last pushed in 2019; the maintained versions are in FGAddon. Useful because it holds types FGAddon lacks. GitHub's `license.spdx_id` is only a hint (it reads the repo's licence file).

| Repo | spdx / licence evidence | Notes |
|---|---|---|
| `C-17` | GPL-3.0; `LICENSE.md`; README: "GPL version 3 or later" | **README says the 3D model and textures were "converted from X-Plane"** (Dave Austin, Adam Fothergill). The licence of the X-Plane original is **not confirmed**; treat provenance as a risk. Pushed 2024-05-02, 192 MB repo |
| `a400m` | GPL-2.0; `COPYING` present | "FG DEMO" from the FGUK hangar; README gives no author and no licence; 4 commits; `Models/A-400M.ac`. Provenance weak |
| `GulfstreamG550` | GPL-2.0; `COPYING` present | by xsaint, "early development" (his Readme); the only Gulfstream |
| `Challenger650` | none (GitHub); README says GPL v2.0 | built on the CRJ700-family by Ryan Miller; whether the mesh is new is not stated; **no licence file** |
| `Falcon-50` | GPL-2.0 | (also in FGAddon) |
| `Tornado`, `BAE-Hawk`, `RafaleB`, `Hawker-Siddeley-Nimrod` | GPL-2.0 | FGUK hangar and others; licence files not opened |
| `V22-Osprey`, `V-22`, `R44`, `Diamond-Da40`, `Diamond-Da42` | GPL-2.0 | same aircraft as the FGAddon versions, older |
| `CSeries` | GPL-2.0; `COPYING` present | A220; authors ACJZA, Joshua Davidson, Jonathan Redpath, D-ECHO, Pakistan-1; this is the upstream of FAM `bcs1` and fr24 `cs100/cs300` |
| `Q400` | GPL-2.0; `LICENSE.txt` present | README says the repo is outdated; credits FlorianK (models and textures) |
| `c172p` mirror | none | use the c172p-team repository instead |

### 3.4 stagworksde/skytrails-aircraft-models (new; pre-built GLBs from FlightGear's AI models)

- https://github.com/stagworksde/skytrails-aircraft-models (seen). One commit, 0 stars; **release v0.1.0 of 2026-09-25** has 69 GLB assets (33 models, each with a separate small `_strobe` GLB). Brand-new and unproven, like livetaiwan.
- **What it is:** a pipeline that takes the low-polygon AI-traffic models from FlightGear's base package (`fgdata/AI/Aircraft`), removes gear, interior and propellers, keeps a neutral white default paint, simplifies with meshoptimizer to a per-model triangle budget (1,200 to 3,000), and writes GLB with nav lights. README: models are GPL v2 (`COPYING.md` is the plain GPL-2.0 text, seen), the pipeline code is MIT; authors are kept in `sources/fgdata/*/AUTHORS.md` and in each GLB's `asset.copyright`; a note in the README says GPL v2 and the Apple App Store rules are widely considered incompatible, so the app downloads the models at run time. Release assets seen: A220 148 KB, A320 184 KB, A330 174 KB, A340-300 187 KB, A350 155 KB.
- **Models (from `models.ts`, seen), id → FlightGear folder, triangle budget:** c172 1500, pa18 (Cub) 1500, c182 1500, c208 (Caravan) 1500, pa28 1500, dr40 1500, da42 1500, c310 1500, **be20 (King Air 200) 1500**, fk9 1500, centrair101 1200, a220 3000, a320 3000, a333 3000, a343 3000, a359 3000, a380 3000, b738 3000, b744 3000, b752 3000, b77w 3000, e190 3000, **e195** 3000, at72 2000, dh8c 2000, dh8d 2000, crj2 2000, crj7 2000, e145 2000, **sf34 (Saab 340)** 2000, c550 (Citation Bravo) 1500, **cl60 (Challenger 604)** 1500, **legacy (Embraer Legacy)** 2000.
- **Why it matters:** it is the only free source found for the Saab 340, King Air 200, Challenger 604 and Embraer Legacy/E195 shapes, and it is already glTF with gear removed. **Cautions:** the textures are kept (FlightHopper's pipeline strips them), the file may use meshopt (`EXT_meshopt_compression` is not confirmed; `measureGlb` rejects `extensionsRequired`), triangle counts are budgets not measurements, the upstream AI models' per-file licences are **not confirmed** (they sit in fgdata, not FGAddon), and no military or helicopter model is included.

### 3.5 NASA

- **Reuse rule** (https://www.nasa.gov/nasa-brand-center/images-and-media/, seen): NASA content, including 3-D model files, "texture maps and polygon data", is generally not subject to US copyright and may be used for educational or informational purposes, without implying NASA endorsement. The same page says the NASA insignia, logotype and identifiers "are not in the public domain" and restricts using them, including with AI-generated imagery. **Flag:** a model textured with the meatball or wordmark needs the logos removed.
- **Airborne Science 3-D models gallery** (https://airbornescience.nasa.gov/content/3D_Models_Gallery, seen; page updated 2024-09-22): GLB and USDZ, an "Air" and a "Ground" variant of each. **The page states no licence, credit, file size or polygon count.** Aircraft listed: B200 (King Air 200), C-20A, C-130, DC-8, ER-2, G3, G4, G5 (Gulfstream III/IV/V), HU-25 (Falcon 20), P-3, SIERRA (a small UAS), Twin Otter, WB-57. Helper reading of the file names and variants: `<NAME>_AIR_0824.glb`; WP-3D, B200 and Gulfstream variants exist in NASA and NOAA schemes. Earlier report: 11.7 to 48 MB per file. Whether the textures carry NASA/NOAA insignia: **not confirmed** (the real aircraft do).
- **NASA 3D Resources** (https://github.com/nasa/NASA-3D-Resources, https://science.nasa.gov/3d-resources/): helper found one aircraft that matters, the **Global Hawk** (GLB 1,184,092 bytes; legacy 3DS 19,140 polygons; data.gov record says "License not specified") plus the X-57 research aircraft, a 1/200 SOFIA (747SP) print kit and Ingenuity. No airliner, helicopter or fighter.
- **Verdict:** usable only for the C-130, P-3, King Air 200, Gulfstream III/IV/V, DC-8 and Falcon 20 shapes. The files are large (11.7 to 48 MB per the earlier report), need decimation like livetaiwan's, and may carry NASA/NOAA insignia. For the C-130 the FlightGear model is lighter and has a clear licence file. The Gulfstream IV/V are the only free Gulfstreams other than the G550 in FGMEMBERS.

### 3.6 Smithsonian, Wikimedia Commons, other institutions, government

All from the helper; I confirmed only the NASA pages above.
- **Smithsonian 3D** (3d.si.edu, CC0): the site returned 403 to every URL; the Open Access API and Sketchfab show the 1903 Wright Flyer, Bell X-1 and Space Shuttle Discovery. **No modern type.**
- **Wikimedia Commons** (https://commons.wikimedia.org/wiki/Commons:3D_models): accepts only untextured STL. `Category:3D models of aircraft` (44 files) holds renders only, mostly NASA gallery images; a G550 CAEW render is CC BY-SA 4.0 (**flag**, and a render, not a model).
- **Other museums:** Ingenium (Canada) has First World War aircraft only; the Bristol F.2B is CC0 and two others are CC BY-NC (**flag**).
- **Government and military releases (US DoD, DVIDS, af.mil, navy.mil, army.mil, AFRL, NAVAIR, FAA, NTSB, USGS; UK OGL, Canada, Australia, Bundeswehr, FMV, Israel, NATO):** nothing found that releases a 3-D aircraft model. The "US federal works are public domain" rule cannot be tied to any model page except NASA's, and contractor-made geometry is not automatically public domain.
- Sources to skip: 3d.si.edu, airandspace.si.edu, ingeniumcanada.org (403), web.archive.org (refused by the fetch tool), hangar.openvsp.org (certificate error; the OpenVSP hangar's licence is unconfirmed), NASA's own Sketchfab account (no aircraft, mostly CC BY-NC).

### 3.7 Sketchfab (public JSON API; downloading needs a login I did not make)

- **Licence terms** (helper, from Sketchfab's pages): CC BY 4.0 needs the creator, a notice of the licence and a link to the material, a note if modified; Sketchfab's own suggested credit is "This work is based on [Model] by [Author] licensed under CC BY 4.0." Its download guidelines ask apps to show the licence, the creator's username and a link to the model, and the credit must follow the asset. Sketchfab's terms add no duty beyond the licence for CC downloads (helper summary of a JavaScript-rendered page: **not confirmed** on the page itself). Earlier report: Sketchfab "Standard" and Fab "Standard" licences forbid shipping the file; ND models cannot be decimated; BY-SA forces the same licence on the edit.
- **CC0:** searched for F-16, F-35, Learjet and others through the API: **zero aircraft.** The only CC0 aircraft are First World War museum models and the Wright Flyer.
- **CC BY 4.0 candidates I confirmed through the API** (uid, author, faces):

| Type | Model | Faces | Note |
|---|---|---|---|
| C-130 | `5acfb2eb4f204f51ab418856c116b68e`, Dave Love SketchFab | 25,501 | published 2026-07-09 (helper) |
| C-130 | `ce61f8750c9346a8b2e4e4160bd6c845`, manilov.ap | 30,900 | 2017, bulk uploader |
| A400M | `3469fd009fc548f5a4e89b9da87325e3`, Spark_Customs | 41,314 | 2025 |
| F-35 | `561b5c56fbf94636a465f998e9af1224`, SIpriv ("Low poly F-35") | 7,689 | |
| F-35B | `5d54a6af45974ad386ae74d42b33374a`, AF267 | 12,259 | |
| F/A-18E | `4878534c1a364ebc91a5f48fb3c2c959`, SIpriv ("Low poly F18") | 5,351 | |
| F/A-18E | `4824be73a90843e3af050a9794b341d2`, Spark_Customs | 32,456 | |
| Learjet 45 | `0a47767ccd084aef98b1a0f9210c433e`, rammgraffic | 29,313 | |
| Learjet (low) | `3236990c7a7a46d0b71607f2263dfa46`, Marco Fischer | 7,802 | "Versuch 2" |
| T-6 Texan (WWII) | `b5298f03e97e4624a41df3482fcfe508`, helijah | 232,716 | the old Harvard, not the T-6 Texan II; helijah is a FlightGear author |
| F-16 | uploaders karelkiers 2,762, R7Design 4,504, Usman Zia 2,611 | | helper; uids not recorded |
| UH-60 | Timing 2,020; Yi Tsung Lee 12,606 | | helper |
| CH-47 | Machine Meza 1,552; Artjomka81 29,542 | | helper |
| V-22 | Timing 19,918 | | helper |
| E-3 | manilov.ap 12,082; Spark_Customs 58,142 | | helper |
| C-17 | manilov.ap 21,930 | | helper |
| KC-46 / P-8 | Spark_Customs 319,580 / 97,916; Arrafi 42,265 | | heavy; see warning |

- **Provenance warnings:** (a) uploader Arrafi tags uploads "createdwithai" and has a model whose face count equals another uploader's CC BY-NC-SA model, so his CC-BY label is not trustworthy (helper). (b) Models titled "(DCS World)" are game rips. (c) manilov.ap (60+ aircraft, 2017) and Spark_Customs (many in 2024 to 2025, "3D Printable" titles) are bulk uploaders; whether they are original is **not confirmed**. (d) A Sketchfab "reupload" label appears on KOG_THORNS's C-130J. (e) helijah's Sketchfab uploads (AC-130 176,612 faces, UH-60 47,763, T-6 232,716) may be FlightGear Baranger-hangar models (his Read-Me points to helijah.free.fr): identity **not confirmed**; if they are, the Sketchfab "CC-BY" label and the FlightGear GPL differ.
- **Verdict:** a way to get a Learjet, F-35, F/A-18, KC-46, P-8 or A400M when no FlightGear model exists, at the cost of per-model credit, a login, uncertain provenance and a texture-strip/decimate job (W3).

### 3.8 Poly Pizza

Helper read the search pages and five model pages: licence is **CC BY 3.0** (the search page's "CC0" label for the Poly-by-Google group was wrong on the model page). Type-specific items: a Boeing 747 (Miha Lunar, https://poly.pizza/m/49CLof4tP2V, OBJ and glTF) and an Airco DH2. Everything else is a generic jet, fighter or helicopter. Triangle counts not shown. **Nothing useful for the wanted types.**

### 3.9 Blend Swap and OpenGameArt

- **Blend Swap** (helper; I re-opened `/blend/4383`, `/blend/16639`, `/blend/22200`): all models are `.blend` (Blender 2.4x to 2.7x, old); a per-model Creative Commons licence; the F-16 page says an account login is needed to download, the UH-60 and CH-47 pages say none. The site's terms say users must respect the attached CC licence, with a daily download limit for free accounts (helper). CC0 items worth a look: **UH-60 "BlackHawk modified"** (`/blend/4383`, ChrisKuhn, about 25,000 polys; "inspired by" a UH-60, with added missiles and gun, so not an accurate Black Hawk); **F-16** (`/blend/16639`, GreenMotion, 181 KB); **F-15E** (`/blend/17665`, 2 MB); **CH-47** (`/blend/22200`, Artjomka81, 3.3 MB, mid-poly); Cessna 208 (`/blend/8327`, `/blend/8328`), R22 (`/blend/7615`), Dash 8 Q400 (`/blend/24464`), 747-400 (`/blend/11887`), 727 (`/blend/3244`). **Flags:** CC-BY-SA (737-800, A400M, V-22, ERJ 145, one UH-60, Bell 206B, UH-1), CC-BY-NC (A380, Typhoon, F-15 Eagle, Su-27) and CC-BY-NC-SA (787, one UH-60) must not be used as-is.
- **OpenGameArt** (helper): almost all generic. Type-specific and usable: a CC0 F-117 (FBX, 1,486 tris), a CC0 Antonov An-2 (1,848 tris) and An-28, a GPL-3.0 Tornado IDS (OBJ, unrigged), a CC-BY 4.0 Apache-style helicopter (2,624 tris, generic), a CC-BY 4.0 / CC-BY-SA 4.0 Cessna 172 (`.blend`), a CC-BY Learjet "resembles Learjet 75" (`.blend`). Several carry OGA-BY 3.0 (attribution-only; treat as CC-BY). None for F-16, C-130, UH-60, CH-47, V-22 or any current airliner.

### 3.10 Other simulators and open-source aircraft

All **flag or reject**. FlyByWire A32NX/A380X: code GPLv3 but "original 3D assets" **CC BY-NC 4.0** (seen on the repository page). Headwind A339X: models CC BY-NC 4.0 and the A330neo model is not open (helper). Stratosphere 777-300ER (X-Plane): CC BY-NC-SA (search snippet only, **not confirmed**). Microsoft Flight Simulator's own assets: Microsoft's Game Content Usage Rules, no extraction. x-plane.org freeware: per-author terms, nothing confirmed reusable. Laminar's default aircraft: "no redistribution of the artwork" (earlier report). Open-source MSFS/X-Plane projects under GPL-3.0 (a 777 and an ATR 72-500 in OBJ via XPlane2Blender; an A321neo) have unclear model provenance (helper): **not worth the work** when FlightGear models exist.

### 3.11 Prior art for the same job

- **kewonit/aeris** (AGPL-3.0): 13 GLBs (2.6 MB) including "fighter", "drone", "glider" and "helicopter" silhouettes. Its `NOTICE.md` (seen) names only FlightAirMap-3dmodels and fr24-3d-models as sources and says GPL-2.0; **which file the fighter and drone came from is not stated and neither repository has a fighter or drone** (FAM has a P-40 only): provenance **not confirmed**, do not copy.
- **hook-365/adsb-3d** (MIT code, GPL-2.0+ shape data from tar1090): draws aircraft procedurally from tar1090's SVG shapes, including a C-17 T-tail and helicopter rotors (seen). A different design that gives every shape (fighters included) without any model file.
- **bilawalsidhu/gods-eye-view**: ships Sketchfab CC-BY GLBs with a credits table (earlier report); a good template for the credits screen.

---

## 4. Recommendation

### 4.1 First batch: 16 types, in this order of work

Ranked by how much a wrong shape shows (fleet size times size error), with the cheapest first inside each tier. The table in section 1 has source, licence, format and work class for each.

1. **Nine copies from livetaiwan (W0), about 1.6 MB in all:** A319 (and A318), 767, 777-200, 787-8, A330-200, A220-300 (and -100), A380, PC-12, PA-28. They need no Blender work: copy the file and its upstream licence (already in `third_party/aircraft-models/source/` for A320; add `COPYING` of `b767`, `b788`, `a332`, `a380`, `pc12`, `pa28`, the CSeries `COPYING` for the A220, the `b772` entry for fr24), set `forwardAxisFix` (+90 like the others), `lengthM`, the `types` list, and run FlightHopper's own steps (box, lights, outline, profile, paint; airliner gear from `tools/models/gear-glb.ts` with a published-dimension `GEAR` entry per type, as was done for the E190). Widebody and 767 fixes remove 15 to 20 % size errors that are visible next to a 777-300 or 787-9.
2. **One Blender conversion (W1): Dash 8 Q400** from `fr24-3d-models/source/q400/q400.blend` with livetaiwan's `bl_join_blend.py`. 377 aircraft in service and a 17 % wrong length today. (FGAddon `DHC-8` is the newer alternative with a `COPYING`, but it is AC3D.)
3. **Six AC3D conversions from FGAddon (W2):** King Air, R44, UH-60, C-130, F-16, T-6 (for the King Air, the Skytrails GLB is a quicker but unproven alternative). Delete the cockpit, pilot, payload, gear, propellers and rotor discs where they are separate objects; join, decimate to about 20 % (the 3 to 3.5 MB `.ac` files will end near 150 to 300 KB), orient, centre. Keep `*.ac`, XML, textures, `COPYING` and the SVN revision in `third_party/aircraft-models/source/fgaddon/<aircraft>/`. Try Blender 4.3 with the AC3D add-on for the import and the existing 5.2 pipeline afterwards, or Assimp; neither route is tested here.

Why these four military types first (a transport, a helicopter, a fighter and a trainer): transports, trainers and helicopters are the military categories that broadcast most (OpenSky 2017: 28 %, 22 % and 15 % of the 6,024 military aircraft seen), the C-130, UH-60, F-16 and T-6 are the largest fleets of their kind (§2.4), and all four have a FlightGear model with a licence file I read. The KC-135 would rank second by fleet, but its folder lists **no licence file**; the same holds for E-3, F-15, F/A-18 and CH-47, so they wait for a licence check (ask the FGAddon maintainers, or read each model's `-set.xml` and Read-Me history).

### 4.2 Second batch: about 25 types

| Type | Source and licence | Work |
|---|---|---|
| 757-200/-300 | livetaiwan `B752.glb` (FAM `b752`, GPL-2.0-or-later) | W0 |
| 747-8 (B748) | livetaiwan `B748.glb` (FAM `b748/LICENSE`, GPL-2.0) | W0 |
| MD-11 | livetaiwan `MD11.glb` (FAM `md11/LICENSE`, GPL-2.0-or-later) | W0 |
| A340-300/-600 | livetaiwan `A343.glb` (711 KB, FAM, GPL-2.0), fr24 `a346` | W0 / W1 |
| ATR 42 | livetaiwan `AT45.glb` (FAM `atr42`, GPL-2.0) | W0 |
| CRJ700, CRJ200, ERJ-145, E170 | livetaiwan `CRJ7`, `CRJ2`, `E145`, `E170` (FAM, GPL-2.0 / 2.0+) | W0 |
| 737-700/-600/-900 | fr24 `b737`, `b736`, `b739` (FR24 states GPL-2.0, upstream FGMEMBERS/737NG has no licence file: **flag**), or derive the -700 from the shipped `b738` with the `variants.ts` tool (fuselage shortened; licence then fully confirmed) | W0 or tool |
| 737-300/-400/-500 | FGAddon `737-300` (**GPL-3.0**, keep separate from GPL-2.0-only meshes) | W2 |
| MD-80 series | FGAddon `MD-80` (GPL-2.0, updated 2026-09) | W2 |
| A300-600/A310 | FGAddon `A300-600` (GPL-2.0 text listed) | W2 |
| Cessna Caravan (C208) | livetaiwan `C208.glb` (FAM `c208`) | W0 |
| SR22 | livetaiwan `SR22.glb` (FAM `sr22`) | W0 |
| TBM 900 series | FGAddon `daher-tbm-family` (**GPL-3.0**) | W2 |
| DA40, DA42 | FGAddon `Diamond-Da40/Da42` (`COPYING`) | W2 |
| Cessna 172 | keep the 182 stand-in (8.5 m vs 8.3 m); c172p-team model only if the high-wing look matters | W2, heavy |
| Bell 206/407 | livetaiwan `B407.glb` (FAM `b407`: **no licence file**) or FGAddon `Bell-206-JetRanger` (`COPYING`) | W0 / W2 |
| H125 / EC130 | FGAddon `ec130` (`COPYING`) | W2 |
| AH-64 | FGAddon `apache` (GPL, version not stated) | W2 |
| V-22 | FGAddon `V22-Osprey` | W2 |
| CH-47, KC-135, E-3, F-15, F/A-18 | FGAddon; **licence not confirmed** for each folder | W2 after the check |
| F-35 | FGAddon `F-35B` (**GPL-3.0**, B variant) or Sketchfab low-poly CC-BY | W2 / W3 |
| Typhoon | FGAddon `eurofighter` (GPLv2 README) | W2 |
| PC-21 | livetaiwan `PC21.glb` (**GPL-3.0**) | W0 |
| C-17 | FGMEMBERS `C-17` (GPL-3.0+, but "converted from X-Plane": **provenance risk**) or Sketchfab CC-BY | W2 / W3 |
| A400M | FGMEMBERS `a400m` ("FG DEMO", author unknown) or Sketchfab CC-BY (Spark_Customs, 41k faces) | W2 / W3 |
| Gulfstream G550 | FGMEMBERS `GulfstreamG550` (GPL-2.0, early development) or NASA G-IV/G-V | W2 |
| Falcon 50 (F2TH/FA7X stand-in), PC-24 | FGAddon `Falcon-50`, `Pilatus-PC-24` | W2 |
| Challenger 350/604, Embraer Legacy, Saab 340 | Skytrails `cl60`, `legacy`, `sf34` | W0-like |
| Learjet 45/60 | Sketchfab CC-BY (rammgraffic, 29k faces) only | W3 |

### 4.3 What is different about military aircraft

- **Coverage:** none of the three GLB collections has a military type; every military model in the first batch is a W2 conversion from FlightGear's AC3D, and the free models are variant-specific (the F-35B has the lift fan, the F-16 file is one mesh for all blocks, "T-6" on Sketchfab is the WWII Harvard).
- **Accuracy:** FlightGear military models are sim-grade but hobbyist; several are old (the Apache from 2008). Expect shape errors of a few per cent; compare lengths against the manufacturer's figures before shipping, as FlightHopper did for the E190 and the sharklet recipes.
- **Licences are more mixed:** F-16 GPL-2.0+; C-130, UH-60, T-6, R44, King Air GPL-2.0 `COPYING`; Typhoon GPLv2; F-35B, PC-21, TBM, 737-300 GPL-3.0; KC-135, E-3, F-15, F/A-18, CH-47 no licence file; C-17 GPL-3.0+ with an X-Plane origin. US military aircraft being government property does not make a hobbyist's 3-D model public domain. No government or museum source (§3.5, §3.6) holds a current military aircraft except NASA's C-130 and P-3.
- **Paint:** military liveries are grey or camouflage. FlightHopper's manifest has a `paint` block per model, so a type model can carry its own base colour; FlightGear liveries are texture-based and are dropped by the pipeline.
- **Missing types:** KC-46 and P-8 (shapes of the 767 and 737: keep the stand-ins, now with the correct 767 and 737 models), E-7, RQ-4 (NASA Global Hawk GLB exists, with an insignia caveat), MQ-9 (FGAddon has `MQ-9`; not read), Hermes/Heron, C-27J, KC-390 (Sketchfab only), CN-235/C-295 (FGAddon `Casa-212`/`EADS-HC-144`, not read).
- **ADS-B reality:** many military aircraft do not transmit or are filtered; fighters are rare. See §2.4 for what a map actually shows.

### 4.4 Process and licence duties (same as for the shipped 18)

- Per file: record the upstream licence in `licences.json` and the manifest (not livetaiwan's blanket label); keep the corresponding source in `third_party/aircraft-models/source/`; add a "modified by FlightHopper" notice in `asset.copyright`.
- GPL-3.0 (ATR 72 today; add 737-300, TBM, F-35B, PC-21, C-17) and GPL-2.0-only meshes can sit side by side but must not be merged into one GLB (earlier report, §F).
- CC-BY models (Sketchfab, Blend Swap, OGA): a credits entry with title, author, model URL, licence and a "modified" note; record the licence on the day of download. Do not take CC-BY-SA, -NC or -ND models.
- Do not take anything from a Sketchfab uploader whose provenance is doubtful (§3.7).

---

## 5. Not confirmed

- **Licence file not seen or not stating a licence:** FGAddon `KC135`, `E3B`, `f18`, `ch47`, `F-15` (README gives the author, no licence); `apache` says "GPL" without a version; `Beechcraft-King-Air`, `C130`, `UH-60`, `R44`, `T6` have a plain GPL-2.0 `COPYING` but their Read-Me files state no licence (the `COPYING` is a copy of the licence text, not a statement that the model's author chose it, though FGAddon policy supports it).
- **Not opened:** `COPYING`/`LICENSE` text of FGAddon `V22-Osprey`, `Falcon-50`, `Cessna-208-Caravan`, `Piper-PA-28`, `Cirrus-SR22`, `Diamond-Da40/Da42`, `Bell-206-JetRanger`, `ec130`, `bo105`, `B-52F`, `A300-600`; GitHub `Tornado`, `BAE-Hawk`, `RafaleB`.
- **FAM `b407` and `bcs1`** have no licence file; the A220's upstream (`FGMEMBERS/CSeries`) has a GPL-2.0 `COPYING`, the Bell 407's upstream was not found.
- **fr24 `b736`/`b737`/`b739`:** upstream FGMEMBERS/737NG and FGAddon `737NG` have no licence file. **fr24 `b772`/`b773`:** the FGMEMBERS/777 mirror has no licence file; the FGAddon `777/LICENSE` is from the earlier report.
- **C-17 (FGMEMBERS):** README says the model was converted from X-Plane; the X-Plane original's licence is not known.
- **A400M (FGMEMBERS):** author and licence statement not given in README; the `COPYING` is GPL-2.0 per GitHub.
- **Skytrails:** upstream per-model licences inside fgdata; whether the GLBs use meshopt compression; triangle counts (only budgets).
- **FlightGear AC3D import:** the Blender-AC3D add-on lists Blender up to 4.3; Assimp's glTF export is "partial"; neither tested here.
- **NASA Airborne Science GLBs:** no licence on the page; file sizes and polygon counts not stated; insignia in textures not checked.
- **Sketchfab/Blend Swap/OGA claims by the helpers:** I re-opened only the models marked "I re-opened" or confirmed through the Sketchfab API above; the other rows (and everything about uploaders Arrafi, KOG_THORNS, helijah) are helper readings. Blend Swap and Sketchfab downloads need a login that I did not make.
- **`heli.glb` in fr24:** identity not confirmed (probably the EC135).
- **Fleet figures** marked "secondary" or "from memory" (757 active count, real lengths of A300, MD-80 and 737 variants) are not from the manufacturer or IATA.
- **FGAddon `MQ-9`, `Casa-212`, `EADS-HC-144`, `IL-76`, `b1900d`, `Fairchild-Metroliner`, `dhc6`:** exist in the directory listing; not opened.
- **Search-snippet-only figures** (no page read): C-17 279 built, A400M about 130 delivered, Learjet 3,043 built, DA40 2,200 delivered, AW139 more than 1,200, Phenom 300 906 delivered, 407 fleet 1,642, IAF fleet counts. **Secondary:** Typhoon 613 delivered, 757 active count, KC-46/KC-135 over Tel Aviv, Citation 8,000th.
- **Sizes and triangle counts** for the livetaiwan files come from its `docs/model-manifest.json` (read today); I measured none myself this session. The Q400's 12.3k triangles and the FAM originals' sizes come from the earlier report's measurements.
- **Not done:** no file was downloaded, so no conversion, no AC3D import and no licence text inside a GLB or `.blend` was checked; Sketchfab and Blend Swap model pages beyond those named were not opened; the Sketchfab helper that was to sweep every type did not finish, so the Sketchfab table (§3.7) lists only what I confirmed through the API plus the other helper's rows.
