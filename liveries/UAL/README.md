# United Airlines (UAL): livery dossier, the 2019 scheme

Research date: 2026-10-13. Refs folder: `data/livery-refs/UAL/` (git-ignored). Each file name below is a file in that
folder. I looked at each photo (the full frame and crops). I measured positions and colours from the pixels.

The scheme: the livery that United showed on 24 April 2019 (the brief calls it "Evo Blue"; United's release gives it
no name). Blue fin with the globe in sky blue, blue engines and wingtips, a thin dark-blue swoop along the lower
fuselage, a grey belly, a large blue UNITED title. It replaced the 2010 scheme (gold globe, gold cheatline, small
title, white engines).

Coordinate convention (side elevation, the same for both sides):

- **z** = metres aft of the nose tip. On the 737 MAX 8 master the tail-cone tip is z 38.0.
- **h** = metres above the keel of the constant section (0 = lowest line of the main fuselage).
- **f** = h as a fraction of the local fuselage height (0 keel, 1 crown): the kit's `k.at(z, f)`.
- On the fin: **u** 0 leading edge … 1 trailing edge, **v** 0 root … 1 tip: the kit's `k.fin(u, v)`.

Scale source: `commons-N47370_…-3840.jpg` (737 MAX 8, left side, on the ground, sun; the 3840 px copy of the master).
Nose tip at x 60 px, tail-cone tip at x 3578 px: 3518 px = 38.0 m, so 92.6 px/m. Crown at y 1102 px. The keel is in
shadow in the photo; I put it 4.01 m below the crown (y 1473 px), which also puts the crown 5.2 m above the ground
line of the wheels. Cabin window centres at y 1239 px (h 2.53). The window pitch is 47.6 px (0.51 m) at the front and
at the back, so the scale does not change along the fuselage.

The model's landmarks are not the photo's: the photo puts door 1 at z 4.3–5.0 and the model (`b38m`) puts its centre
at 5.0. So each position below also names a landmark (door, window row, exit). Use the landmark.

---

## 1. Identity

**What the release says** (United, 24 April 2019): the tail has a gradient in three blues (Rhapsody Blue, United
Blue, Sky Blue) and the globe is mostly Sky Blue; the engines and the wingtips are United Blue; the swoop of the 787
fleet goes on all aircraft, in Rhapsody Blue; the lower half of the body is Runway Gray; the name is larger; the
phrase "Connecting people. Uniting the world." is near the door. The first aircraft in the scheme was a 737-800. The
release gives no colour values.

**What the photos show** (all types, both sides):

- white upper fuselage, white radome;
- a dark navy pinstripe (the swoop), 0.10 m wide, from under the nose to the tailplane root: it climbs from the nose,
  runs level ahead of the wing, goes behind the wing, comes out lower aft of the wing and climbs to the tail;
- a grey belly. Its upper edge is parallel to the swoop and about 0.3 m below it, so a white band lies between the
  swoop and the grey;
- **UNITED** in blue capitals on the forward fuselage, through the window row;
- a blue fin with a large sky-blue globe grid in its lower aft part and a dotted fade to sky blue at the tip;
- blue engine nacelles with a bare-metal inlet lip, no title;
- blue wingtip devices.

**Which aircraft wear it.** The repaint is not complete. What I saw, by type (2025 and 2026 photos on Commons):

| Type | In the 2019 scheme | Still in the 2010 scheme |
|---|---|---|
| 737 MAX 8 | every exterior photo of 2021–2026 in the Commons category (about 60 viewed) | none seen |
| 737 MAX 9 | the 4 tracked aircraft (planespotters) | not checked on Commons |
| 737-800 | 12 of 12 viewed (2024–2026) | none seen |
| 737-900, -900ER | 11 of 12 viewed | N31412 (2025-12-10) |
| A320 | N473UA, N1902U (2026-08) | not checked further |
| 777-300ER | N2251U (2026-03), N2749U (2026-05), N2352U (2026-04), N2737U (2025-12) | N2639U (2026-05), N2534U (2026-04), N2138U (2026-04), N2846U (2026-04), N2645U (2026-02), N2644U (2026-01), N2333U (2026-01) |
| 787-9 | N24980, N24990, N24993, N22995, N29991, N26996, N29989, N24976, N25982 | N24972 (2026-07), N24974 (2026-08), N24973 (2026-04), N27959, N27958 (2026-03), N26967 (2026-01), N17963 (2026-02), N27965 (2025-12) |
| 787-10 | N13018 (2026-03), N13013 (2026-01), N14001 (2026-04) | N12006 (2026-06), N16008 (2026-02) |

The old-scheme photos are not in the refs folder. Their Commons files: `File:N24972.jpg`, `File:N24974.jpg`,
`File:United Airlines Boeing 787-9 N17963 taxiing at San Francisco February 2026.jpg`,
`File:N31412 B737-900, United, IAH 12-10-25 (55093797557).jpg`; the others I saw as 640 px thumbnails only.

The app paints one livery per airline: paint every United aircraft in the 2019 scheme. If the 2010 scheme is wanted
later, it is a second variant with a registration list (see section 8).

**Specials** (not the scheme, not painted):

- N76516 (737-800, tracked, hex aa56b5): Star Alliance livery (white, black fin with the star, "STAR ALLIANCE"
  titles). Seen on its planespotters thumbnail, which I removed. Paint it in the standard scheme.
- Known from Commons file titles only, not viewed: N75435 (737-900ER, Continental retro), N24988 (787-9, "The future
  is SAF"), N61101 (787-9, "100 Years"), an A320 "retrojet".

**The tracked aircraft** (the ten hexes of the brief):

| Hex | Registration | Type | Scheme on its planespotters photo |
|---|---|---|---|
| a12aeb | N17438 | 737 MAX 9 | 2019 |
| a2bbac | N27519 | 737 MAX 9 | 2019 |
| aa7ebc | N77552 | 737 MAX 9 | 2019 |
| a12a82 | N17408 | 737 MAX 9 | 2019 |
| a5cc3c | N47298 | 737 MAX 8 | 2019 |
| a12796 | N17361 | 737 MAX 8 | 2019 |
| a441f5 | N37348 | 737 MAX 8 | 2019 |
| a2b134 | N27267 | 737 MAX 8 | 2019 |
| aa56b5 | N76516 | 737-800 | Star Alliance special |
| a48dea | N39297 | 737-800 | 2019 |

---

## 2. Reference images

56 files are listed in `refs.json`. The Commons photos are 1920 px copies. The `-crop-` files are crops that I cut from
the full-size copies (`…-3840.jpg`, six files, kept in the folder but not listed). The planespotters files are the
API's thumbnails (420 px): good for the scheme, not for measuring. Dates are the photos' "taken" dates from Commons.
The registration of the Nuuk photo is from the fleet number 7301 on its nose gear door.

| File | View | Registration | Source | Photographer | Licence | Date |
|---|---|---|---|---|---|---|
| `commons-N47370_B737_MAX_8_United_Fort_Lauderdale_02-18-26_55114317223_-1920.jpg` | left side (737 MAX 8, sun; the measurement master) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N17317_B_37_MAX_8_United_Fort_Lauderdale_02-20-26_55150272854_-1920.jpg` | right side (737 MAX 8, sun, landing) | N17317 | https://commons.wikimedia.org/wiki/File:N17317_B%2637_MAX_8,_United,_Fort_Lauderdale_02-20-26_(55150272854).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons-United_737_MAX_N17316-1920.jpg` | right side (737 MAX 8, overcast) | N17316 | https://commons.wikimedia.org/wiki/File:United_737_MAX_N17316.jpg | Ziongarage | CC0 | 2024-04-04 |
| `commons-United_737-8_MAX_N27269_on_final_approach_to_Boston_Nov_2024-1920.jpg` | right side (737 MAX 8, landing) | N27269 | https://commons.wikimedia.org/wiki/File:United_737-8_MAX_N27269_on_final_approach_to_Boston_Nov_2024.jpg | 4300streetcar | CC BY 4.0 | 2024-11-29 |
| `commons-United_Boeing_737-8_MAX_N27268_BWI_MD1-1920.jpg` | left side (737 MAX 8, overcast, landing) | N27268 | https://commons.wikimedia.org/wiki/File:United_Boeing_737-8_MAX_N27268_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-02-26 |
| `commons-United_Airlines_Boeing_737_MAX_8_N27366_IND.jpg` | left side (737 MAX 8, overcast) | N27366 | https://commons.wikimedia.org/wiki/File:United_Airlines_Boeing_737_MAX_8_N27366_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2025-12-07 |
| `commons-United_N47343_Boeing_737-Max8_DEN1125_55126305370_.jpg` | left side (737 MAX 8) | N47343 | https://commons.wikimedia.org/wiki/File:United_N47343_Boeing_737-Max8_DEN1125_(55126305370).jpg | formulanone | CC BY-SA 4.0 | 2025-11-10 |
| `commons-United_Airlines_Boeing_737_MAX_8_N37353_IND-1920.jpg` | 3/4 front right (737 MAX 8, low sun, snow) | N37353 | https://commons.wikimedia.org/wiki/File:United_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N37353%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-Boeing_737-8_MAX_-_N27251_-_United_Airlines_-_Guatemala_City_La_Aurora_-_MGGT_Gu-1920.jpg` | 3/4 front right (737 MAX 8) | N27251 | https://commons.wikimedia.org/wiki/File:Boeing_737-8_MAX_-_N27251_-_United_Airlines_-_Guatemala_City_La_Aurora_-_MGGT,_Guatemala.jpg | Rene Hernandez2 | CC BY-SA 4.0 | 2025-10-02 |
| `commons-United_Airlines_737_MAX_8_in_Nuuk_Greenland-1920.jpg` | 3/4 front left (737 MAX 8, at the stairs) | N17301 | https://commons.wikimedia.org/wiki/File:United_Airlines_737_MAX_8_in_Nuuk,_Greenland.jpg | Quintin Soloviev | CC BY 4.0 | 2025-06-22 |
| `commons-United_Boeing_737-8_MAX_N77259_BWI_MD1-1920.jpg` | 3/4 front left (737 MAX 8, landing, seen from low down) | N77259 | https://commons.wikimedia.org/wiki/File:United_Boeing_737-8_MAX_N77259_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2025-05-22 |
| `commons-United_Boeing_737-8_MAX_N17322_planform-1920.jpg` | below (737 MAX 8, plan view) | N17322 | https://commons.wikimedia.org/wiki/File:United_Boeing_737-8_MAX_N17322_planform.jpg | 4300streetcar | CC BY 4.0 | 2025-01-12 |
| `commons-N47370-crop-tail.jpg` | tail (left side, 737 MAX 8; crop) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N17317-crop-tail-right.jpg` | tail (right side, 737 MAX 8; crop) | N17317 | https://commons.wikimedia.org/wiki/File:N17317_B%2637_MAX_8,_United,_Fort_Lauderdale_02-20-26_(55150272854).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons-N37353-crop-tail-right.jpg` | tail (right side, 737 MAX 8; crop) | N37353 | https://commons.wikimedia.org/wiki/File:United_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N37353%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-N47370-crop-forward.jpg` | forward fuselage (left side, 737 MAX 8; crop) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N17317-crop-forward-right.jpg` | forward fuselage (right side, 737 MAX 8; crop) | N17317 | https://commons.wikimedia.org/wiki/File:N17317_B%2637_MAX_8,_United,_Fort_Lauderdale_02-20-26_(55150272854).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons-N37353-crop-forward-right.jpg` | forward fuselage (right side, 737 MAX 8; crop) | N37353 | https://commons.wikimedia.org/wiki/File:United_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N37353%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-N47370-crop-aft.jpg` | left side (737 MAX 8; crop of the last third) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N47370-crop-engine.jpg` | engine (left, outboard face, 737 MAX 8 LEAP-1B; crop) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N37353-crop-engine-right.jpg` | engine (right, outboard face and inlet, 737 MAX 8; crop) | N37353 | https://commons.wikimedia.org/wiki/File:United_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N37353%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-N47370-crop-winglet.jpg` | winglet (left wing, outer face, 737 MAX; crop) | N47370 | https://commons.wikimedia.org/wiki/File:N47370_B737_MAX_8,_United,_Fort_Lauderdale_02-18-26_(55114317223).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-N17317-crop-winglet-inner.jpg` | winglet (left wing, inner face, 737 MAX; crop) | N17317 | https://commons.wikimedia.org/wiki/File:N17317_B%2637_MAX_8,_United,_Fort_Lauderdale_02-20-26_(55150272854).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons-N37353-crop-winglet-right.jpg` | winglet (right wing, outer face, 737 MAX; crop) | N37353 | https://commons.wikimedia.org/wiki/File:United_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N37353%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-N76519_B737-800_United_El_Paso_02-04-26_55104191755_-1920.jpg` | left side (737-800, sun) | N76519 | https://commons.wikimedia.org/wiki/File:N76519_B737-800,_United,_El_Paso_02-04-26_(55104191755).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-04 |
| `commons-N34222_B737-800_United_Bozeman_07-27-26_55480710477_-1920.jpg` | right side (737-800, landing) | N34222 | https://commons.wikimedia.org/wiki/File:N34222_B737-800,_United,_Bozeman_07-27-26_(55480710477).jpg | DUNCAN KIRK | CC BY 4.0 | 2026-07-27 |
| `commons-N73270_B737-800_United_Taipei_Taoyuan_11-08-25_55045313856_-1920.jpg` | right side (737-800) | N73270 | https://commons.wikimedia.org/wiki/File:N73270_B737-800,_United,_Taipei_Taoyuan_11-08-25_(55045313856).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2025-11-07 |
| `commons-United_Boeing_737-800_N12218_planform-1920.jpg` | below (737-800, plan view) | N12218 | https://commons.wikimedia.org/wiki/File:United_Boeing_737-800_N12218_planform.jpg | 4300streetcar | CC BY 4.0 | 2025-01-04 |
| `commons-N76519-crop-tail.jpg` | tail (left side, 737-800, sun: the dot gradient; crop) | N76519 | https://commons.wikimedia.org/wiki/File:N76519_B737-800,_United,_El_Paso_02-04-26_(55104191755).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-04 |
| `commons-N76519-crop-engine.jpg` | engine (left, outboard face, 737-800 CFM56; crop) | N76519 | https://commons.wikimedia.org/wiki/File:N76519_B737-800,_United,_El_Paso_02-04-26_(55104191755).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-04 |
| `commons-N76519-crop-winglet.jpg` | winglet (left wing, outer face, split scimitar; crop) | N76519 | https://commons.wikimedia.org/wiki/File:N76519_B737-800,_United,_El_Paso_02-04-26_(55104191755).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-04 |
| `commons-N34222-crop-winglets.jpg` | winglet (right wing outer face and left wing inner face, split scimitar; crop) | N34222 | https://commons.wikimedia.org/wiki/File:N34222_B737-800,_United,_Bozeman_07-27-26_(55480710477).jpg | DUNCAN KIRK | CC BY 4.0 | 2026-07-27 |
| `commons-N66893_B737-900ER_United_IAH_12-10-25_55094826885_-1920.jpg` | left side (737-900ER) | N66893 | https://commons.wikimedia.org/wiki/File:N66893_B737-900ER,_United,_IAH_12-10-25_(55094826885).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2025-12-10 |
| `commons-N75429_B737-900ER_United_SeaTac_08-31-24_55178781371_-1920.jpg` | right side (737-900ER) | N75429 | https://commons.wikimedia.org/wiki/File:N75429_B737-900ER,_United,_SeaTac_08-31-24_(55178781371).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2024-09-01 |
| `commons-United_Boeing_737-900ER_N69819_at_gate_B25_at_Boston_January_2026-1920.jpg` | 3/4 rear left (737-900ER at the gate) | N69819 | https://commons.wikimedia.org/wiki/File:United_Boeing_737-900ER_N69819_at_gate_B25_at_Boston_January_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-01-28 |
| `commons-N473UA_A320_United_Reno_08-27-26_55503789255_-1920.jpg` | left side (A320, landing) | N473UA | https://commons.wikimedia.org/wiki/File:N473UA_A320,_United,_Reno_08-27-26_(55503789255).jpg | DUNCAN KIRK | CC BY 4.0 | 2026-08-28 |
| `commons-N1902U_A320_United_Reno_08-26-26_55503426896_-1920.jpg` | right side (A320, landing) | N1902U | https://commons.wikimedia.org/wiki/File:N1902U_A320,_United,_Reno_08-26-26_(55503426896).jpg | DUNCAN KIRK | CC BY 4.0 | 2026-08-27 |
| `commons-Boeing_777-300ER_N2251U_United_Airlines_55498379003_-1920.jpg` | right side (777-300ER) | N2251U | https://commons.wikimedia.org/wiki/File:Boeing_777-300ER_%E2%80%98N2251U%E2%80%99_United_Airlines_(55498379003).jpg | Alan Wilson | CC BY-SA 4.0 | 2026-03-16 |
| `commons-Boeing_777-300ER_N2251U_United_Airlines_55488185776_-1920.jpg` | 3/4 front left (777-300ER) | N2251U | https://commons.wikimedia.org/wiki/File:Boeing_777-300ER_%E2%80%98N2251U%E2%80%99_United_Airlines_(55488185776).jpg | Alan Wilson | CC BY-SA 4.0 | 2026-03-16 |
| `commons-N2749U_NRT_2026-05-24-1920.jpg` | left side (777-300ER) | N2749U | https://commons.wikimedia.org/wiki/File:N2749U_NRT_2026-05-24.jpg | LMP 2001 | CC BY-SA 4.0 | 2026-05-24 |
| `commons-N24990_PEK_20250503133903_-1920.jpg` | left side (787-9, landing, seen from low down) | N24990 | https://commons.wikimedia.org/wiki/File:N24990@PEK_(20250503133903).jpg | N509FZ | CC BY-SA 4.0 | 2025-05-03 |
| `commons-20260614_Boeing_787-9_of_United_Airlines_N22995_taxiing_at_HKG-1920.jpg` | left side (787-9) | N22995 | https://commons.wikimedia.org/wiki/File:20260614_Boeing_787-9_of_United_Airlines_(N22995)_taxiing_at_HKG.jpg | Windmemories | CC BY-SA 4.0 | 2026-06-14 |
| `commons-N24993_NRT_2026-05-24-1920.jpg` | 3/4 rear right (787-9) | N24993 | https://commons.wikimedia.org/wiki/File:N24993_NRT_2026-05-24.jpg | LMP 2001 | CC BY-SA 4.0 | 2026-05-24 |
| `commons-United_Airlines_Boeing_787-9_N24980_at_Narita_June_2025_1-1920.jpg` | 3/4 front right (787-9 at the gate) | N24980 | https://commons.wikimedia.org/wiki/File:United_Airlines_Boeing_787-9_N24980_at_Narita_June_2025_1.jpg | 4300streetcar | CC BY 4.0 | 2025-06-06 |
| `commons-United_Airlines_Boeing_787-9_N24980_at_Narita_June_2025_2-1920.jpg` | engine (right, inlet and outboard face, 787-9 GEnx) | N24980 | https://commons.wikimedia.org/wiki/File:United_Airlines_Boeing_787-9_N24980_at_Narita_June_2025_2.jpg | 4300streetcar | CC BY 4.0 | 2025-06-06 |
| `commons-N13018_55170461186_-1920.jpg` | left side (787-10) | N13018 | https://commons.wikimedia.org/wiki/File:N13018_(55170461186).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-03-13 |
| `commons-N13013_55077776830_-1920.jpg` | right side (787-10) | N13013 | https://commons.wikimedia.org/wiki/File:N13013_(55077776830).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-01-25 |
| `ps-a12aeb-1922371.jpg` | left side (737 MAX 9, small) | N17438 | https://www.planespotters.net/photo/1922371/n17438-united-airlines-boeing-737-9-max | Jacob Reppert | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a12a82-1914400.jpg` | right side (737 MAX 9, small) | N17408 | https://www.planespotters.net/photo/1914400/n17408-united-airlines-boeing-737-9-max | Sayo Hikawa | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a2bbac-1932828.jpg` | 3/4 front right (737 MAX 9, landing, small) | N27519 | https://www.planespotters.net/photo/1932828/n27519-united-airlines-boeing-737-9-max | Brian Casity | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-aa7ebc-1825826.jpg` | 3/4 front right (737 MAX 9, small) | N77552 | https://www.planespotters.net/photo/1825826/n77552-united-airlines-boeing-737-9-max | Ethan Yang | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a5cc3c-1893699.jpg` | right side (737 MAX 8, small) | N47298 | https://www.planespotters.net/photo/1893699/n47298-united-airlines-boeing-737-8-max | M Kramer | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a12796-1744822.jpg` | 3/4 rear right (737 MAX 8, night, small) | N17361 | https://www.planespotters.net/photo/1744822/n17361-united-airlines-boeing-737-8-max | MINXUAN ZHANG | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a441f5-1923004.jpg` | left side (737 MAX 8, take-off, small) | N37348 | https://www.planespotters.net/photo/1923004/n37348-united-airlines-boeing-737-8-max | Santiago Torres | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a2b134-1971799.jpg` | left side (737 MAX 8, landing, small) | N27267 | https://www.planespotters.net/photo/1971799/n27267-united-airlines-boeing-737-8-max | Michael Rodeback | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps-a48dea-1902140.jpg` | left side (737-800, landing, small) | N39297 | https://www.planespotters.net/photo/1902140/n39297-united-airlines-boeing-737-824-wl | RK | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |

Most useful:

- `commons-N47370_…-1920.jpg` and its crops: the left-side master (swoop, title, fin, engine, winglet).
- `commons-N17317_…-1920.jpg`, `commons-N34222_…-1920.jpg`: the right side.
- `commons-N76519-crop-tail.jpg`: the fin in sharp sun (the dot fade, the globe).
- `commons-United_Boeing_737-8_MAX_N17322_planform-1920.jpg`: the belly and the loop of the swoop under the nose.
- `commons-N473UA_…`, `commons-N1902U_…` (A320), `commons-Boeing_777-300ER_N2251U_…` (777), `commons-N24990_…`,
  `commons-N13018_…` (787): the same scheme on the other types.

---

## 3. Colours

No official values were found: the release names the colours and gives no numbers; a search for a brand colour list
found none. The values below are medians of photo samples on sunlit areas. Photos differ much in exposure and in
processing, so each blue is good to about ±8° of hue and ±10 % of brightness.

| Paint (United's name) | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **White** (upper fuselage, radome) | **#F5F5F3** | #F3F4F1 (`N47370`), #F9F9F9 (`N17317`), #EBECEF (`N76519`), #FAFAFC (`N24990`). | High |
| **United Blue** (title, engines, wingtips, ground of the globe) | **#1A49A8** | Title, sunlit: #1349A5 (`N17317`), #2253AD (`N76519`), #2952BC (`N473UA`), #3E5AAE (`N47370`, hazy). Engine, sunlit side: #0A3D97, #1144A1, #254DB4. Globe ground: #1346A2 (`N76519`), #0D4096 (`N17317`). Hue 218–225°. Two photos are far off and not used: #3261DB (`N2251U`, bright) and #025FD1 (`N24990`, saturated). The title and the engines are the same blue within the light. | Medium-high |
| **Sky Blue** (globe bands, tip of the fin) | **#80C4F0** | Globe bands: #7FC7F3 (`N76519`), #88D0FA (`N2251U`), #B0D5EF (`N47370`, hazy). Fin tip: #7EC0E9 (`N17317`), #81BCEC (`N24990`), #82B8E3 (`N76519`). Hue 203–207°. | Medium-high |
| **Rhapsody Blue** (the swoop) | **#0E1B4D** | Swoop where it is 10 px wide: #0C1641, #01113D (`N69819` at the gate, fuselage in light shade). Thin samples are darker and greyer (#18193C, #131422, #0F101E); a saturated photo gives #032470 (`N37353`). The darkest part of the fin, just above the globe, is #10205B–#122971 on `N76519` (see 4.4). | Medium |
| **Runway Gray** (belly) | **#C4C5C4** | The step in brightness across the edge of the grey, same panel, same light: grey / white = 0.75 (`N47370`: #ABAAA7 under #E4E3DE), 0.81 (`N69819`), 0.80 (`N17317`), 0.86 (`N37353`, low sun), 0.71 (`N27268`, processed). Median 0.80 of the white. Seen from below in open shade the belly (#898C9D) is as dark as the grey wing underside (#8F96AC) (`N17322_planform`). Neutral, no blue cast. | Medium |
| **Inlet lip** (bare metal) | **#B4B5B9** | #AAA7AC, #B3B2B9 (`N47370`). | Medium |
| **Exhaust, chevrons** (bare metal) | **#8A8680** | #8C847B (`N47370`, chevrons). The CFM56 nozzle is darker: #6F675C (`N76519`). | Medium |
| **Wing and tailplane grey** | **#B9BDC1** | Not sampled: the wings reflect the sky or the ground in every photo. Standard Boeing and Airbus grey, an estimate. | Low |

---

## 4. Elements (side elevation)

Numbers are from the 737 MAX 8 master (`N47370`, left side) unless a type is named. The scheme is the same on both
sides: I traced the swoop on the right side too (`N17317`) and it has the same shape.

Landmarks on the master:

| Landmark | z (m) | h (m) |
|---|---|---|
| Cockpit windows | 2.0 – 2.9 | 2.4 – 2.85 |
| Door 1, left | 4.27 – 5.03 | 1.51 (sill) – 3.48 |
| Cabin windows (centres; 0.32 m tall) | – | 2.53 |
| Engine: inlet lip / end of the blue cowl | 12.35 / 16.3 | – |
| Forward over-wing exit, aft edge | 16.6 | – |
| Aft door, left | 31.0 – 31.7 | – |
| Crown | – | 4.01 |
| Fin: leading edge at the crown / trailing edge at the crown | 30.8 / 36.1 | 4.01 |
| Fin tip: leading corner / trailing corner | 36.6 / 37.8 | 10.6 |

### 4.1 The swoop (Rhapsody Blue pinstripe)

One line on each side, 0.10 m wide ahead of the wing (9–10 px) and 0.08 m aft of it (7–8 px). Its centre:

| z (m) | h (m) | Note |
|---|---|---|
| 1.9 | 0.57 | comes up from the belly, aft of the radome |
| 2.6 | 0.73 | |
| 3.2 | 0.87 | |
| 4.1 | 1.05 | |
| 4.75 | 1.14 | 0.4 m below the sill of door 1 |
| 6.05 | 1.30 | |
| 7.3 | 1.39 | |
| 8.6 | 1.45 | |
| 10.0 – 12.5 | 1.47 | level: f 0.37, 1.06 m below the window centres |
| 13 – 22.6 | – | hidden by the engine, the wing and the flap fairings |
| 22.9 – 24.2 | 0.94 | lowest: f 0.23 |
| 25.5 | 1.00 | |
| 26.8 | 1.13 | |
| 28.1 | 1.30 | |
| 29.4 | 1.49 | |
| 30.1 | 1.62 | f 0.29 of the local height (the keel rises here) |
| 31.4 | 1.89 | crosses the lower quarter of the aft door |
| 32.7 | 2.21 | f 0.37 |
| 34.0 | 2.57 | |
| 35.0 | 2.88 | |
| 35.85 | 3.06 | ends at the root of the tailplane's leading edge, f 0.53 |

- Ahead of the wing the line runs into the wing root above the engine (`N37353-crop-forward-right`,
  `N69819` at the gate). Aft of the wing it comes out below the flap fairings. Join the two parts with a smooth
  curve from h 1.47 at z 13 to h 0.94 at z 23: the wing hides it.
- **From below** (`N17322_planform`, `N12218_planform`): the two lines join under the nose in a U. The apex is on
  the centreline at z ≈ 1.75, ahead of the nose gear doors. The lines run along the two edges of the belly and do not
  cross it again. Nothing else is painted on the belly: no title, no logo.
- Right side: the same (`N17317`: level part highest at z 8–9.3, lowest at z 24.5–26, the same climb to the tail; the
  aircraft is 2.7° nose-up in that photo).

### 4.2 The grey belly (Runway Gray)

Everything below a line that is parallel to the swoop and 0.30 m below its centre (0.26–0.29 m measured at z 4–12;
`N47370-crop-forward`, `N37353-crop-forward-right`, `N69819`). Between the swoop and the grey there is a white band,
the same white as above the swoop: across the swoop itself the colour does not change (#CFD8D3 above, #CFD8D1 below,
`N69819`). The edge of the grey is sharp. Near the nose the gap closes (0.05 m at z 3.2) and the grey follows the U
under the nose. Aft of the wing the gap measures 0.15 m (z 26–29; the surface there faces down, so it is
foreshortened). The grey goes on under the tailplane to the tail cone. The wing-to-body fairing looks grey below
the same line (`N69819`, `N17322_planform`); no photo shows it well from the side.

### 4.3 The title

- Text: **UNITED**, capitals, the wordmark's own letters (`title.svg`). United Blue. No outline, no shadow.
- Place, left side: **z 6.54 – 16.69** (10.15 m). The U starts 1.5 m aft of the aft edge of door 1. The D ends at
  the aft edge of the forward over-wing exit and lies over that exit.
- Height: cap top **h 3.33**, baseline **h 2.17**: cap height **1.16 m** in side view. The baseline is 0.36 m below
  the window centres and the cap top is 0.80 m above them (0.68 m below the crown). The window row runs through the
  lower half of the letters; the windows stay as they are.
- Letters, as fractions of the title's length (the same in the photo and in `title.svg`, within 1 %): U 0–0.142,
  N 0.199–0.338, I 0.401–0.439, T 0.493–0.625, E 0.678–0.798, D 0.856–1.
- In side view the title is flatter (10.15 : 1.16 = 8.75) than the artwork (8.09), because the letters go over the
  curve towards the crown. `k.image` takes both `w` and `h` and stretches: give both.
- **Right side:** the same span, read from the right, so the U is at the aft end and the D is nearest the nose. Not
  mirrored. Measured z 7.0–17.0 (`N17317`, 737 MAX 8) and z 6.7–16.6 (`N34222`, 737-800). On `N17317` the U ends at
  the aft edge of the forward over-wing exit, as the D does on the left. Use the left side's span for both sides.

Small markings, all skipped: the Star Alliance emblem (grey outline, 0.5 m, between the cockpit windows and door 1,
both sides); "Connecting people. Uniting the world." (cap height about 0.06 m, below it); the registration in dark
blue above the windows ahead of the aft door, with the US flag aft of it; the four-digit fleet number near the aft
door and on the nose gear door; "DREAMLINER" in grey below the windows of the 787.

### 4.4 The fin

Both sides are the same in the aircraft's frame: the right side is the mirror image of the left (the pole of the
globe is towards the leading edge on both; `N47370-crop-tail`, `N17317-crop-tail-right`).

- The whole fin is painted, the rudder too, from the straight leading-edge line to the trailing edge and from the
  root to the tip. The paint stops at the fin root: the fuselage under the fin is white. The curved dorsal fairing
  ahead of the leading-edge line is white.
- **The globe** is a disc larger than the lower fin: centre at **u 0.35, v 0.15**, radius **0.51 × the fin's height**
  (3.4 m on the 737). Its edge is an arc that leaves the leading edge at **v 0.64** and meets the trailing edge at
  **v 0.26** (0.63 and 0.26 on the 737-800, `N76519-crop-tail`). A white line about 0.05 m wide runs along this arc.
  Below the arc everything is the globe; the fin's root cuts the disc.
- **Inside the disc:** United Blue ground with Sky Blue bands.
  - The pole is on the leading edge at v ≈ 0.55, about 0.6 m below the point where the arc leaves the leading edge.
  - About 10 Sky Blue bands fan out from the pole, from straight down along the leading edge round to nearly along
    the arc. They are thin at the pole and widen outwards; near the fin root a band is about 0.4 m wide and the blue
    gap beside it about 0.6 m.
  - Three blue rings cut the bands. Straight below the pole they are about 0.7 m, 1.6 m and 2.7 m from it, each about
    0.13 m wide; a thin Sky Blue line runs along the outer side of each. The rings are not centred on the pole: they
    open towards the centre of the disc, as circles on a ball do.
  - Just inside the arc, towards the trailing edge, the outermost zone is mostly Sky Blue.
- **Above the arc:** a plain field with a fade. Just outside the arc it is darker than United Blue, it is United
  Blue (#14429A) about 2 m below the tip, and it ends in Sky Blue at the tip. The light part is a
  halftone: Sky Blue dots on blue, the dots growing towards the tip. Averaged over the dots, mid-chord
  (`N76519-crop-tail`): v 1.00 #6FA6D2; v 0.87 #4672A8; v 0.75 #1F4A9C; v 0.60 #133789; v 0.47 (at the arc) #10205B.
  The lines of equal colour follow the arc, so this is a radial fade about the centre of the disc. From a distance it
  reads as a smooth fade; the dots show only in close-ups.
- How dark the field is at the arc differs between photos: 0.57 of the brightness of the globe's ground on `N76519`,
  0.75 on `N27269` and `N473UA`, no difference on `N17317`, `N17316` and `N2251U`. Use a moderate value: **#123376**
  (United Blue × 0.7).

### 4.5 The tail cone

White above the swoop's end, grey below. The APU cone tip is bare dark metal (about #807C78). No colour band.

### 4.6 Engines

All faces of both nacelles are alike. No title, no logo: only small stencils and one thin vertical line.

- Cowl: United Blue all round.
- Inlet lip: bare metal ring. 0.41 m of a 3.98 m cowl on the LEAP-1B (10 %); narrower on the CFM56 (about 6 %,
  `N76519-crop-engine`); wide on the GEnx (`…N24980_at_Narita_June_2025_2`).
- Aft end: bare metal. Chevrons on the LEAP-1B and the GEnx (the last 8 %), a plain dark nozzle on the CFM56, the
  V2500 and the GE90.
- Pylons: white or light grey (not sampled well).

### 4.7 Wingtip devices

- **737 MAX (Advanced Technology winglet, two blades):** United Blue, both blades, both faces
  (`N47370-crop-winglet` outer face, `N17317-crop-winglet-inner` inner face). No logo. The joint with the wing is
  bare metal.
- **737-800, -900ER (split scimitar):** United Blue, both blades, both faces, with a bare-metal strip along the
  leading edge of each blade, about 15 % of the chord (`N76519-crop-winglet` outer face, `N34222-crop-winglets` inner
  face of the far winglet). No logo.
- **A320 (wingtip fence):** United Blue, both faces (`N473UA`, `N1902U`). The United A320s in the photos have fences,
  not Sharklets.
- **777, 787:** no device; the raked tips are wing grey.

### 4.8 The other types

The same parts in the same order. What differs is size and place. These numbers are from one or two photos each and
are less sure (±0.5 m in z).

| | 737-800, MAX 8, MAX 9, -900ER | A320 | 777-300ER | 787-9, 787-10 |
|---|---|---|---|---|
| Title length × cap height | 10.15 × 1.16 m | 10.1 × 1.1 m | 14.4 × 1.7 m | 14.9 × 1.7 m (787-9) |
| Title starts | 1.5 m aft of door 1 | 1.45 m aft of door 1 | 2.4 m aft of door 1 | 2.3 m aft of door 1 |
| Title ends | at the forward over-wing exit | about 1.6 m aft of the over-wing exits | aft of door 2 | aft of door 2 |
| What crosses the title | window row | window row; the exits are under the E | window row; door 2 is between I and T | window row; door 2 is between T and E |
| Swoop, level part ahead of the wing | h 1.47 (f 0.37) | h ≈ 1.6 (f 0.39) | f ≈ 0.2–0.3 | f ≈ 0.26–0.30 |
| Swoop ends | at the tailplane root | at the tail-cone tip, under the tailplane | at the tailplane root | at the tailplane root |
| Globe arc | leading edge v 0.64, trailing edge v 0.26 | about the same | about the same | about the same |

- On every type the level part of the swoop is about 1.5 m above the keel and runs into the wing root. On the
  narrow-bodies that is 1.0–1.1 m below the window centres; on the 777 it is far below the windows.
- A320 swoop, measured (`N473UA`, left; the photo is from a little below): z 3.4 h 1.14; z 5.7 h 1.40; z 7.9 h 1.54;
  z 10.2 h 1.60; then hidden; z 23.6 h 0.95; z 25.9 h 1.03; z 28.1 h 1.25; z 30.3 h 1.60; z 32.6 h 2.05; z 37.0
  h 3.3 near the tail-cone tip (this last point is less sure).
- A320 title: z 7.0–17.15 on the left (`N473UA`), z 7.5–17.6 on the right (`N1902U`); 1.45 m from door 1 on both.
- 777-300ER title, right side (`N2251U`): z 9.0–23.4.
- 787-9 title, left side (`N24990`): z 8.6 to about 23.5 (the engine hides the E and the D; the end is from the
  letter spacing).
- 737-900ER and 737 MAX 9: not measured. The title looks the same size and starts at the same distance from door 1
  (`N66893`, `N75429`, the planespotters thumbnails).

### 4.9 Left and right

The paint is symmetric: swoop, grey belly, fin, engines and wingtips are mirror images. The title is the one part
that is not mirrored: it reads UNITED on both sides and covers the same span.

---

## 5. Drawing steps

One side at a time; the kit flips the title on the right side by itself.

1. `k.fill` white #F5F5F3.
2. Grey belly #C4C5C4: `k.below` a fraction that follows the swoop, 0.30 m lower (f − 0.075 on the 737). Let it reach
   past the nose and the tail.
3. The swoop: `k.stroke` 0.10 m wide, #0E1B4D, through the points of 4.1 (`[k.a.nose − z, k.at(k.a.nose − z, f)]`),
   with the smooth join behind the wing. Start it below the keel at z 1.5 so that it wraps under the nose.
4. The title: `k.image(asset('liveries/UAL/title.svg'), { z, y, w: 10.15, h: 1.20 })`. The image box is the ink box:
   its top is the cap top and the baseline is 0.04 m above its bottom, so its centre is **0.20 m above the window
   centres** (`k.a.windowY + 0.20`) and, along the fuselage, 6.6 m aft of the aft edge of door 1. On the 777 and the
   787: `w` 14.4–14.9, `h` 1.75.
5. The fin, inside `k.clip('fin', …)`:
   - fill with the radial fade about the disc's centre `k.fin(0.35, 0.15)`, in units of the disc's radius: #123376 at
     1.0, #1A49A8 at 1.5, #4672A8 at 1.75, #6FA6D2 at 2.0 (the tip corners are at 1.9 and 2.1);
   - the disc (radius 0.51 × the fin's height) in #1A49A8; a white line 0.05 m wide on its edge;
   - the Sky Blue bands from the pole `k.fin(0, 0.55)` as wedges (`k.poly`), then the three blue rings and their thin
     Sky Blue lines (`k.stroke`) to cut them.
   Draw the grid with these plain shapes. Do not trace the logo.
6. `belly(k)`: the U of the swoop under the nose (apex z 1.75), on grey.
7. `engine(k)`: fill #1A49A8; the front 10 % #B4B5B9; the last 8 % #8A8680.
8. `winglet(k)`: fill #1A49A8; on the 737-800 model a leading-edge strip #B4B5B9, 15 % of the chord.
9. Flat colours: `wing` and `stab` #B9BDC1, `engineColor` #1A49A8, `base` #F5F5F3.

---

## 6. Logos and fonts

| Graphic | Commons file | Licence | In `liveries/UAL/` | Use |
|---|---|---|---|---|
| **UNITED wordmark** (the title) | https://commons.wikimedia.org/wiki/File:United_Airlines_wordmark.svg | **PD-textlogo** + Trademarked (read on the file page, 2026-10-13; the file version of 2026-10-09) | `title.svg` | Use it. It is the livery's own letters and spacing: its six letter boxes match the photo within 1 %. I changed two things: the viewBox is the ink box (2614 × 336: caps 323 high, the bowl of the U goes 11 below the baseline), and the colour is #1A49A8 (it was #1414D2). |
| **Globe** (the fin) | none | The category "United Airlines logos" on Commons has wordmarks and logos from before 2010 only; a search found no globe file | – | Draw it with plain shapes (section 4.4). |
| United Express wordmark (2019) | https://commons.wikimedia.org/wiki/File:Logo_wordmark_United_Express_(2019).svg | PD-textlogo | not copied | Not needed: the regional aircraft are not in this dossier. |
| Star Alliance emblem | https://commons.wikimedia.org/wiki/File:Star_Alliance_Logo.svg | PD-textlogo | not copied | Skipped: 0.5 m, not seen at flight distance. |

**Fonts:** none. The one title is the wordmark file. Nothing is typeset.

---

## 7. Type notes

- **737 MAX 8:** length 39.5 m, fuselage 38.0 m to the tail-cone tip, 4.01 m high. LEAP-1B engines with chevrons.
  Advanced Technology winglets. Two over-wing exits a side.
- **737-800, -900ER:** CFM56-7B, plain nozzle. Split scimitar winglets on the two that I checked in close-up
  (N76519, N34222); the others look the same at small size.
- **A320:** IAE V2500 (long cowl, `N473UA`), wingtip fences.
- **777-300ER:** GE90-115B. **787-9, -10:** GEnx with chevrons.
- The 737 fin in the photo is 6.6 m high above the crown; the model's (`b38m`) is 7.5 m. Use the fin coordinates
  (u, v), not metres, for the fin art.

---

## 8. Confidence and open questions

- **High:** the parts of the scheme and their order; that it is the same on both sides; the title's letters, length
  and place on the 737; the swoop's path on the 737 where it can be seen; the white band between the swoop and the
  grey; blue engines with a bare lip and no title; blue wingtip devices on both faces.
- **Medium:** the colour values (no official numbers; photo medians). The grey of the belly is the least sure: it
  comes from brightness steps and from one view from below.
- **Medium:** the fin. The arc of the globe is measured on two aircraft. The grid (number of bands, places of the
  rings) is counted on crops, good enough to draw the look, not a survey. The dark part of the fade above the arc is
  measured on one sharp photo (`N76519`) and does not show in hazy photos.
- **Low-medium:** the numbers for the A320, the 777 and the 787 (one or two photos each, some from below). The
  swoop's height on the 777 is the least sure (f 0.2–0.3): the one side-on photo is taken from above.
- **Positions:** ±0.3 m in z and ±0.05 m in h on the 737 master. Between photos the nose reference moves by up to
  0.5 m, so the landmark (door, exit, window row) is better than the z.
- **Not seen:** the swoop behind the wing (z 13–22.6); the inner face of a 737 MAX winglet from close up (seen only
  at a distance: blue); the inner face of an A320 fence from close up.
- **Open: two schemes.** Part of the 777 and 787 fleets, and at least one 737-900, still fly in the 2010 scheme.
  This dossier describes the 2019 scheme only. If both are wanted: `variants` with the 2010 registrations, and
  `defaultVariant` the 2019 scheme. The lists above are a start, not complete, and repaints change them.
- **Open: the right-side title.** One right-side photo (`N17317`) puts it 0.4 m further aft than the left; another
  (`N34222`) puts it where the left is. I treat it as the same span.
- **Open: the registration of the Nuuk photo** (N17301) is from the fleet number, not read from the fuselage.

Sources: Wikimedia Commons (the files above; categories "Boeing 737-8 MAX of United Airlines", "Boeing 737-800 of
United Airlines", "Boeing 737-900 of United Airlines", "Airbus A320 of United Airlines", "Current Boeing 787-9 of
United Airlines", "Current Boeing 787-10 of United Airlines", "Boeing 777-300ER of United Airlines", "United Airlines
logos"); the planespotters.net public API;
[United, "Out with the Gold, in with the Blue" (2019-04-24)](https://united.mediaroom.com/2019-04-24-Out-with-the-Gold-in-with-the-Blue-United-Airlines-Unveils-its-Next-Fleet-Paint-Design)
(the colour names and where each goes);
[AkzoNobel, "AkzoNobel creates modern look for United Airlines"](https://aerospace.akzonobel.com/news-and-stories/akzonobel-creates-modern-look-for-united-airlines)
(found by search, not read: it may give the paint codes); the models' profiles in `public/models/*/model.json`.

---

## 9. Render check (2026-10-14)

Rendered on the QA machine in five rounds (b39m, b789, b772, a320 against the photos of section 2, all twelve views
each), then the design test.

**What matches the photos:** the white upper fuselage; the thin navy swoop from under the nose, over the wing and up
to the tailplane root; the grey belly; UNITED through the window row with the right letters, size and place on both
sides; the fin (globe with sky bands and rings, the white arc, the fade to the tip, the white dorsal fairing);
blue engines with the bare lip and, on the 737 MAX and 787, the chevrons; blue winglets; the U of the swoop seen from
below.

**Changed after the first render:**

- 787 title: it was placed from the model's second door, which put it 3 m too far aft. It now starts a fixed
  distance aft of door 1 (2.85 m on the wide-bodies, 1.9 m on the narrow ones, from the door's centre). "Wide" is
  now the fuselage height (above 4.7 m), so the 767 counts as wide.
- Globe: the sky bands are wider (12 of every 19 degrees), the rings thicker, the sky a little lighter, and the
  fade above the arc lighter: the model's fin renders about 15 % darker than the photos.
- Engines: chevrons on the LEAP and GEnx, a wider lip.
- The APU cone shape was too tall and painted a grey block over the fin's trailing-edge root; it is now the cone's
  tip.

**Still different:** the dot screen on the fade is drawn as a smooth gradient; no star emblem, no small texts, no
fleet number; the A320 model has no tip devices, so the fences are not painted; the 777 title is measured on the
-300ER and used on the -200 as it is.
