# Ryanair (RYR / RUK / MAY / RYS): Boeing 737-800 (B738) and 737 MAX 8-200 (B38M) livery dossier

Research date: 2026-10-13. Refs folder: `data/livery-refs/RYR/` (git-ignored; `refs.json` lists each photo's view).
Every fact about the paint comes from a named photo in that folder. I looked at each photo (the full frame plus
zoomed crops) and I measured the positions and the colours from the pixels. The app paints Ryanair UK (RUK), Malta Air (MAY) and Buzz /
Ryanair Sun (RYS) aircraft with this same mainline scheme.

Coordinate convention (side elevation, the same for both sides):

- **z** = metres aft of the nose tip. 0 = radome tip. The tail-cone tip is at **z 38.0 on the 737-800** and at
  **z 39.1 on the 737 MAX 8-200** (its tail cone is longer). The 39.5 m overall length of the 737-800 is to the tips
  of the tailplane, which reach aft of the tail cone.
- **h** = metres above the keel of the constant-section fuselage (0 = lowest line of the main fuselage; crown = 4.01).
- Window row: window centres at h ≈ 2.48.
- Fin art: **u** = 0 at the fin's leading edge to 1 at its trailing edge, **v** = 0 at the fin root to 1 at the tip
  (the kit's `k.fin(u, v)`).

Scale sources (all 1200 px wide copies):

- **Right side, 737-800:** `commons-9H-QCE_right_2024-05-06.jpg`, a true side-on taxi shot. Nose tip x = 1173.4 px,
  tail-cone tip x = 91.5 px: 1082 px = 38.02 m, so 28.5 px/m. At x = 500 the crown is at y = 322.3 and the keel at
  y = 437: 114.7 px = 4.01 m, so 28.6 px/m. The two scales agree, so the photo is side-on.
- **Left side, 737-800:** `commons-9H-QCC_left_2024-05-10.jpg`. This photo has perspective (the nose is nearer the
  camera: about 30 px/m at the nose and 25 px/m at the tail). I fitted a projective map,
  z = 0.033404 (x − 26.7) / (1 − 0.000064 x), to nine landmarks that are the same on both sides (the cockpit windows,
  the two over-wing exits, the rear door, the tail-cone tip), with their z from the right-side photo. The fit is
  good to 0.09 m (rms).
- **Right side, 737 MAX 8-200:** `commons-EI-HMY_right_2022-11-06.jpg`, side-on. Crown y = 327.5, keel y = 443 at
  x = 500: 115.5 px = 4.01 m, so 28.8 px/m. Nose tip x = 1169, tip of the APU cone x = 44.5: z 39.05.
- **Left side, 737 MAX 8-200:** `commons-EI-HMX_left_2022-05-08.jpg` (nose tip x = 28.5, APU cone tip x = 1149:
  28.7 px/m). Used only for the forward fuselage.

The three photos that show the whole cheatline give the same curve to within 0.1 m in h. Lengthwise the photos agree
to about 0.3 m.

---

## 1. Identity

**Scheme:** the current Ryanair livery. The parts (each seen on several photos of section 2):

- a white upper fuselage with a large blue **RYANAIR** title, in upright capitals, across the window row from behind
  door 1 to the wing's trailing edge, and a blue harp emblem between door 1 and the title;
- a **yellow cheatline**, 0.2 m wide, along the whole fuselage. It starts under the chin behind the radome, rises
  along the lower fuselage and sweeps up to the end of the tail cone;
- a **blue belly**: everything below the cheatline, all round the underside;
- a **blue fin** with a large **yellow harp** on both sides;
- white engine nacelles with a level yellow band and a blue underside;
- blue wingtip devices with a yellow "RYANAIR" on the outer face, and a white inner face with a blue "RYANAIR".

**When:** the stored photos show this scheme from June 2019 to September 2026. A Commons photo of June 2013 (EI-DYT;
viewed, not stored) shows the scheme before it: the same layout, but a slanted title, a smaller and thinner harp on
the fin, and a darker, more orange cheatline. The Commons wordmark file gives 2013 as the year of the upright
logotype. The app's present title decal (`public/liveries/RYR-title.png`) is an older slanted logotype with rounded
letters: it is not what the aircraft wear.

**Operators:** Ryanair DAC (EI- register), Malta Air (9H-), Ryanair UK (G-) and Buzz (SP-) aircraft in this scheme
differ only in the registration and the small flag in front of it (the Irish flag on EI-IKI, the Maltese flag on
9H-QCE). Evidence: 9H-QCC, 9H-QCE, 9H-QDP, 9H-QCY, 9H-QFK, 9H-VVF, 9H-VVJ (Malta) and G-RUKG (UK) are the same as the
EI- aircraft. I did not look at SP- aircraft, nor for the few aircraft that Malta Air and Buzz have in their own
colours: the task is to paint all of them in the mainline scheme. Registrations and flags are left out of the
design.

**Tracked aircraft** (the eight hexes of the survey). Each one's current planespotters.net photo shows the current
scheme:

| Registration | Hex | Type (from the photo's page) | Wingtip device | Scheme | Evidence |
|---|---|---|---|---|---|
| 9H-QCF | 4d2234 | 737-8AS (Malta Air) | split scimitar (yellow strake) | current | `ps-4d2234-1952522.jpg` |
| EI-EKN | 4ca80e | 737-8AS | blended | current | `ps-4ca80e-1859157.jpg` |
| 9H-QDP | 4d2286 | 737-8AS (Malta Air) | split scimitar | current | `ps-4d2286-1990051.jpg`, `commons-9H-QDP_left_2024-10-03.jpg` |
| EI-DLY | 4ca304 | 737-8AS | split scimitar | current | `ps-4ca304-1875980.jpg` |
| EI-IJO | 4cae64 | 737-8200 MAX | MAX split winglet | current | `ps-4cae64-1912739.jpg` |
| EI-IJP | 4cae65 | 737-8200 MAX | MAX split winglet | current | `ps-4cae65-1940518.jpg`, `commons-EI-IJP_left-low_2026-03-17.jpg` |
| EI-IKK | 4cae8d | 737-8200 MAX | MAX split winglet | current | `ps-4cae8d-1879713.jpg` |
| EI-IHK | 4cadf6 | 737-8200 MAX | MAX split winglet | current | `ps-4cadf6-1984606.jpg` |

No special livery is among them. I did not search for special liveries.

---

## 2. Reference images

43 photos, all in `data/livery-refs/RYR/`: 8 planespotters.net thumbnails (from `tools/liveries/refs.ts`), 6 Commons
photos that the tool fetched from "Category:Boeing 737-800 of Ryanair", 24 more Commons photos that I chose by search,
and 5 crops of two of them (EI-IKI and EI-ENW, cut from the 3840 px copies). The Commons licences, authors and dates
are from the Commons API. The planespotters API gives no date.

Not kept from the tool's run: a 2013 photo of the scheme before this one (Aéroport de Dole-Jura 008), three photos
with the aircraft too small in the frame, and a cabin-window photo of a winglet in dusk light. Not kept from my
search: 19 photos that repeat a kept view, show a cabin or are taken through glass.

| File | View | Registration | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|
| `ps-4d2234-1952522.jpg` | 3/4 front left (night) | 9H-QCF | https://www.planespotters.net/photo/1952522/9h-qcf-malta-air-boeing-737-8as-wl | silend_ruso | reference only (planespotters.net) | not given |
| `ps-4ca80e-1859157.jpg` | left side | EI-EKN | https://www.planespotters.net/photo/1859157/ei-ekn-ryanair-boeing-737-8as-wl | Florencio Martin Melian | reference only (planespotters.net) | not given |
| `ps-4d2286-1990051.jpg` | right side | 9H-QDP | https://www.planespotters.net/photo/1990051/9h-qdp-malta-air-boeing-737-8as-wl | Rafal Pruszkowski | reference only (planespotters.net) | not given |
| `ps-4ca304-1875980.jpg` | left side | EI-DLY | https://www.planespotters.net/photo/1875980/ei-dly-ryanair-boeing-737-8as-wl | Alexander Jeglitsch | reference only (planespotters.net) | not given |
| `ps-4cae64-1912739.jpg` | left side (737 MAX 8-200) | EI-IJO | https://www.planespotters.net/photo/1912739/ei-ijo-ryanair-boeing-737-8200-max | Karl Dittlbacher | reference only (planespotters.net) | not given |
| `ps-4cae65-1940518.jpg` | left side (737 MAX 8-200, in flight) | EI-IJP | https://www.planespotters.net/photo/1940518/ei-ijp-ryanair-boeing-737-8200-max | Karl Dittlbacher | reference only (planespotters.net) | not given |
| `ps-4cae8d-1879713.jpg` | left side (737 MAX 8-200, in flight) | EI-IKK | https://www.planespotters.net/photo/1879713/ei-ikk-ryanair-boeing-737-8200-max | Daniel Nagy | reference only (planespotters.net) | not given |
| `ps-4cadf6-1984606.jpg` | left side (737 MAX 8-200, in flight) | EI-IHK | https://www.planespotters.net/photo/1984606/ei-ihk-ryanair-boeing-737-8200-max | Karl Dittlbacher | reference only (planespotters.net) | not given |
| `commons-Ryanair_Boeing_737-8AS.jpg` | 3/4 front left (close, on the apron) | 9H-QDL | https://commons.wikimedia.org/wiki/File:Ryanair_Boeing_737-8AS.jpg | Tobias18967 | CC BY-SA 4.0 | 2022-04-17 |
| `commons-Embarque_por_escalerilla_en_un_Boeing_737-800_de_Ryanair.jpg` | 3/4 rear left (rear fuselage close-up) | 9H-QE? | https://commons.wikimedia.org/wiki/File:Embarque_por_escalerilla_en_un_Boeing_737-800_de_Ryanair.jpg | Wilfredor | CC0 | 2024-02-14 |
| `commons-Ryanair_-_Boeing_737-800_2.jpg` | 3/4 front left (dusk) | EI-EB? | https://commons.wikimedia.org/wiki/File:Ryanair_-_Boeing_737-800_2.jpg | Moktarama | CC BY-SA 3.0 | 2019-06-02 |
| `commons-Ryanair_a_roport_la_Rochelle_2019.jpg` | 3/4 front right | ? | https://commons.wikimedia.org/wiki/File:Ryanair_a%C3%A9roport_la_Rochelle_2019.jpg | Nuiteux731 | CC BY-SA 4.0 | 2019-06-20 |
| `commons-At_Cagliari_Sardinia_2019_220.jpg` | nose (chin from the front left, low) | ? | https://commons.wikimedia.org/wiki/File:At_Cagliari,_Sardinia_2019_220.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2019-12-11 |
| `commons-Rivedoux-Plage_seen_from_Ryanair.jpg` | winglet (inner face, left wing, blended, from the cabin) | ? | https://commons.wikimedia.org/wiki/File:Rivedoux-Plage_seen_from_Ryanair.jpg | Didier Duforest | CC BY-SA 4.0 | 2018-07-17 |
| `commons-9H-QCC_left_2024-05-10.jpg` | left side | 9H-QCC | https://commons.wikimedia.org/wiki/File:Ryanair,_9H-QCC,_Boeing_737-8AS_(53760697933).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-05-10 |
| `commons-9H-QDP_left_2024-10-03.jpg` | left side | 9H-QDP | https://commons.wikimedia.org/wiki/File:Ryanair,_9H-QDP,_Boeing_737-8AS_(54049906167).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-10-03 |
| `commons-9H-QCE_right_2024-05-06.jpg` | right side | 9H-QCE | https://commons.wikimedia.org/wiki/File:Ryanair,_9H-QCE,_Boeing_737-8AS_(53760697848).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-05-06 |
| `commons-EI-ENW_left-low_2026-09-15.jpg` | below (3/4 front left, in flight) | EI-ENW | https://commons.wikimedia.org/wiki/File:Boeing_737-8AS_(c-n_40306,_EI-ENW)_2026-09-15_Andre_Gerwing_Collection_ID_031118.jpg | André Gerwing | CC BY-SA 4.0 | 2026-09-15 |
| `commons-9H-QCY_right-low_2026-05-07.jpg` | right side (in flight, low angle) | 9H-QCY | https://commons.wikimedia.org/wiki/File:Boeing_737-8AS_(c-n_44747,_9H-QCY)_2026-05-07_Andre_Gerwing_Collection_ID_028633.jpg | André Gerwing | CC BY-SA 4.0 | 2026-05-07 |
| `commons-G-RUKG_right-low_2026-02-25.jpg` | right side (in flight, low angle; Ryanair UK) | G-RUKG | https://commons.wikimedia.org/wiki/File:Boeing_737-8AS_(c-n_36575,_G-RUKG)_2026-02-25_Andre_Gerwing_Collection_ID_027942.jpg | André Gerwing | CC BY-SA 4.0 | 2026-02-25 |
| `commons-9H-QFK_tail-winglet-right_2026-07-21.jpg` | tail (right side) and right winglet, outer face | 9H-QFK | https://commons.wikimedia.org/wiki/File:9H-QFK_737_Ryanair_winglet_ARN.jpg | Bene Riobó | CC BY-SA 4.0 | 2026-07-21 |
| `commons-9H-QBM_winglet-inner_2024-11-09.jpg` | winglet (inner face, split scimitar, from the cabin) | 9H-QBM | https://commons.wikimedia.org/wiki/File:9H-QBM_737_Ryanair_winglet.jpg | Bene Riobó | CC BY-SA 4.0 | 2024-11-09 |
| `commons-EI-IKI_3q-front-left_2024-09-14.jpg` | 3/4 front left (737 MAX 8-200) | EI-IKI | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Ryanair_Boeing_737-8200_MAX_EI-IKI_(DSC00687).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-09-14 |
| `commons-EI-HMX_left_2022-05-08.jpg` | left side (737 MAX 8-200) | EI-HMX | https://commons.wikimedia.org/wiki/File:Ryanair,_EI-HMX,_Boeing_737-8200_MAX_(52074946745).jpg | Anna Zvereva | CC BY-SA 2.0 | 2022-05-08 |
| `commons-9H-VVJ_left_2025-03-20.jpg` | left side (737 MAX 8-200) | 9H-VVJ | https://commons.wikimedia.org/wiki/File:Ryanair,_9H-VVJ,_Boeing_737-8200_MAX_(54403420406).jpg | Anna Zvereva | CC BY-SA 2.0 | 2025-03-20 |
| `commons-EI-HMY_right_2022-11-06.jpg` | right side (737 MAX 8-200) | EI-HMY | https://commons.wikimedia.org/wiki/File:Ryanair,_EI-HMY,_Boeing_737-8200_MAX_(52550445881).jpg | Anna Zvereva | CC BY-SA 2.0 | 2022-11-06 |
| `commons-9H-VVF_right_2023-03-25.jpg` | right side (737 MAX 8-200) | 9H-VVF | https://commons.wikimedia.org/wiki/File:Ryanair,_9H-VVF,_Boeing_737-8200_MAX_(52887459908).jpg | Anna Zvereva | CC BY-SA 2.0 | 2023-03-25 |
| `commons-EI-HGR_left_2023-01-28.jpg` | left side (737 MAX 8-200, a little from the front) | EI-HGR | https://commons.wikimedia.org/wiki/File:EI-HGR_Ryanair_Boeing_737-8200_MAX_STN_280123.jpg | kitmasterbloke | CC BY 2.0 | 2023-01-28 |
| `commons-EI-HAW_right_2023-01-28.jpg` | right side (737 MAX 8-200, a little from the front) | EI-HAW | https://commons.wikimedia.org/wiki/File:EI-HAW_Ryanair_Boeing_737-8200_MAX_STN_280123.jpg | kitmasterbloke | CC BY 2.0 | 2023-01-28 |
| `commons-EI-HEZ_3q-front-right_2021-12-16.jpg` | 3/4 front right (737 MAX 8-200) | EI-HEZ | https://commons.wikimedia.org/wiki/File:EI-HEZ_Ryanair_Boeing_737-8200_MAX_close_STN_161221.jpg | kitmasterbloke | CC BY 2.0 | 2021-12-16 |
| `commons-EI-IJP_left-low_2026-03-17.jpg` | below (left side, in flight, 737 MAX 8-200) | EI-IJP | https://commons.wikimedia.org/wiki/File:Boeing_737-8-200_MAX_(c-n_67103,_EI-IJP)_2026-03-17_Andre_Gerwing_Collection_ID_028019.jpg | André Gerwing | CC BY-SA 4.0 | 2026-03-17 |
| `commons-EI-IHY_left-low_2026-01-16.jpg` | left side (in flight, low angle, 737 MAX 8-200) | EI-IHY | https://commons.wikimedia.org/wiki/File:Boeing_737-8-200_MAX_(c-n_67095,_EI-IHY)_2026-01-16_Andre_Gerwing_Collection_ID_027721.jpg | André Gerwing | CC BY-SA 4.0 | 2026-01-16 |
| `commons-EI-IGZ_right-low_2025-05-15.jpg` | right side (in flight, low angle, 737 MAX 8-200) | EI-IGZ | https://commons.wikimedia.org/wiki/File:EI-IGZ_STN_130525.jpg | kitmasterbloke | CC BY 2.0 | 2025-05-15 |
| `commons-EI-IJT_engine-front_2024-06-29.jpg` | engine (left LEAP-1B from the front, 737 MAX 8-200) | EI-IJT | https://commons.wikimedia.org/wiki/File:Ryanair_EI-IJT_at_Cork_Airport_5.jpg | Tim Sheerman-Chase | CC BY 2.0 | 2024-06-29 |
| `commons-EI-IJT_nose-left_2024-06-29.jpg` | nose (left side: harp, door 1, cheatline; 737 MAX 8-200) | EI-IJT | https://commons.wikimedia.org/wiki/File:Ryanair_EI-IJT_at_Cork_Airport_6_-_53823501962.jpg | Tim Sheerman-Chase | CC BY 2.0 | 2024-06-29 |
| `commons-EI-IJR_3q-front-right_2024-06-26.jpg` | 3/4 front right (high angle, 737 MAX 8-200) | EI-IJR | https://commons.wikimedia.org/wiki/File:Ryanair_EI-IJR_at_Gatwick_1.jpg | Tim Sheerman-Chase | CC BY 2.0 | 2024-06-26 |
| `commons-EI-IJR_winglet-outer-left_2024-06-26.jpg` | winglet (outer face, left wing, MAX split winglet, seen from behind) | EI-IJR | https://commons.wikimedia.org/wiki/File:Ryanair_EI-IJR_at_Gatwick_2.jpg | Tim Sheerman-Chase | CC BY 2.0 | 2024-06-26 |
| `commons-EI-ILI_winglet-inner_2026-07-21.jpg` | winglet (inner face, MAX split winglet) | EI-ILI | https://commons.wikimedia.org/wiki/File:EI-ILI_737_MAX_Ryanair_winglet_ARN.jpg | Bene Riobó | CC BY-SA 4.0 | 2026-07-21 |
| `commons-EI-IKI_tail-left_2024-09-14.jpg` | tail (left side; crop) | EI-IKI | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Ryanair_Boeing_737-8200_MAX_EI-IKI_(DSC00687).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-09-14 |
| `commons-EI-IKI_engine-left_2024-09-14.jpg` | engine (left LEAP-1B, outboard face; crop) | EI-IKI | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Ryanair_Boeing_737-8200_MAX_EI-IKI_(DSC00687).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-09-14 |
| `commons-EI-IKI_winglet-outer-left_2024-09-14.jpg` | winglet (outer face, left wing, MAX split winglet; crop) | EI-IKI | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Ryanair_Boeing_737-8200_MAX_EI-IKI_(DSC00687).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-09-14 |
| `commons-EI-ENW_engines_2026-09-15.jpg` | engine (both CFM56 nacelles from the front left, 737-800; crop) | EI-ENW | https://commons.wikimedia.org/wiki/File:Boeing_737-8AS_(c-n_40306,_EI-ENW)_2026-09-15_Andre_Gerwing_Collection_ID_031118.jpg | André Gerwing | CC BY-SA 4.0 | 2026-09-15 |
| `commons-EI-ENW_winglet-outer-left_2026-09-15.jpg` | winglet (outer face, left wing, blended; crop) | EI-ENW | https://commons.wikimedia.org/wiki/File:Boeing_737-8AS_(c-n_40306,_EI-ENW)_2026-09-15_Andre_Gerwing_Collection_ID_031118.jpg | André Gerwing | CC BY-SA 4.0 | 2026-09-15 |

`9H-QDL` is read from the letters "QDL" on the nose-gear door. `9H-QE?` and `EI-EB?`: the last letter is hidden.

Most useful: `commons-9H-QCE_right_2024-05-06.jpg` (the measurement master, right side),
`commons-9H-QCC_left_2024-05-10.jpg` (left side), `commons-EI-HMY_right_2022-11-06.jpg` and
`commons-EI-HMX_left_2022-05-08.jpg` (737 MAX 8-200), `commons-EI-IKI_3q-front-left_2024-09-14.jpg` and its three
crops (colours in full sun; fin, engine and winglet of the MAX), `commons-9H-QFK_tail-winglet-right_2026-07-21.jpg`
(fin and blended winglet close up), `commons-EI-IJT_engine-front_2024-06-29.jpg` and
`commons-EI-IJT_nose-left_2024-06-29.jpg` (close-ups), `commons-EI-IJP_left-low_2026-03-17.jpg` and
`commons-EI-ENW_left-low_2026-09-15.jpg` (the belly).

---

## 3. Colours

No official paint specification was found. The only brand value at hand is the fill of the Commons wordmark file,
**#073590**. Photo samples are medians of boxes on flat areas; H is the hue in degrees.

| Paint | Recommended sRGB | Evidence and spread | Trust |
|---|---|---|---|
| **Ryanair blue** (fin, belly, title, harp on the fuselage, nacelle underside, outer face of the wingtip devices) | **#0E2E80** | Fin in sun: #012476 (`EI-IKI_3q-front-left`, a contrasty photo; H 222°), #162E68 (`9H-QCC_left`), #18296B (`EI-HMX_left`), #203373 (`EI-HMY_right`), fin base #1E316F (`9H-QCC_left`). Title in sun: #02247A (`EI-IKI`), #182761 (`EI-HMX`), #213368 (`EI-HMY`): the same paint as the fin. Overcast: #29396D (`EI-HGR_left`), #162246 (`9H-VVJ_left`), #1A2746 (`9H-QCE_right`). In flight against a blue sky the fin reflects the sky (#374786 `EI-ENW`, #395F9F `EI-IHY`): not used. The belly side faces down and reads darker (#011453 `EI-IKI`, #060C3C `EI-ENW`); where the sun reaches it under the nose it is the same blue as the title (`EI-IJP_left-low`). Sunlit hue 222–228°. | Medium-high. The sunlit photo median is about #162C70 (H 225°, V 0.44). The brand's digital #073590 (H 220°, V 0.56) is lighter. #0E2E80 is between the two. It is a deep royal blue, not a black navy. |
| **Ryanair yellow** (cheatline, harp on the fin, nacelle band, title on the wingtip devices, lower blade and strake of the wingtip devices) | **#F4C41E** | Fin harp in sun: #FDCB05 (`EI-IKI`), #F1C72E (`9H-QCC_left`), #FFD53C (`EI-HMX`), #FFD750 (`EI-HMY`). Cheatline in sun: #FAC003 (`EI-IKI`), #EDBE21 (`9H-QCC`), #E1B016 (`EI-HMX`), #EDB821 (`EI-HMY`). Nacelle band #F7BF03, lower winglet blade #F1BE0C (`EI-IKI`). Overcast: #E4B02A (`EI-HGR`), #D9B028 (`9H-VVJ`), #E0B622 (`9H-QCE`). Hue 43–51°, sunlit median 47°. | High. A warm, full yellow: not lemon, not orange. |
| **White** (upper fuselage, radome, nacelles, inner face of the wingtip devices, pylons) | **#F7F7F8** | Fuselage in sun: #FAFAFB (`9H-QCC_left`), #F9F9FA (`EI-HMX_left`), #E5E6E6 (`EI-IKI`), #EAEAEE (`9H-QFK`). Nacelle in the same photos: #E3E3E3 (`EI-IKI`), #F3F3F4 (`EI-HMX`): the same white. | High. |
| **Wing and tailplane grey** | **#B4B9BD** | Boeing light grey, not a Ryanair colour. No usable sample: the wing surfaces in the photos mirror the sky or the ground. The value is near the flydubai dossier's #BABEC2 for the same type. | Low (an estimate). |
| **Inlet lip, leading-edge strips of the fin and of the blended winglet** (bare metal) | **#B9B9B6** | Lip of the LEAP-1B in sun #C2C0BD (`EI-IKI_engine-left`), sky-lit #767C87 (`EI-HMY_right`). The lip is satin, not mirror-polished (`EI-IJT_engine-front`). | Medium-low. |
| **Exhaust nozzle, APU exhaust** | **#5A5C60** | Dark metal on `9H-QCC_left`, `EI-HMX_left`, `EI-IJP_left-low`. | Low (an estimate). |
| **Door outlines** | **#C6CACE** on white | Thin grey lines (`9H-QCE_right`, `EI-IJT_nose-left`). Where the rear doors cross the cheatline and the belly the outline stays light. | Medium. |

There is no black anti-glare panel and no dark mask round the cockpit windows: the nose is white up to the glass
(`EI-IJT_nose-left`, `commons-Ryanair_Boeing_737-8AS.jpg`).

---

## 4. Elements (side elevation)

Airframe landmarks that I measured (737-800; the MAX 8-200 is the same forward of the tail cone):

| Landmark | z (m aft of the nose) | h (m above the keel) |
|---|---|---|
| Radome joint | 1.1–1.2 | |
| Cockpit windows | 1.5 – 3.0 | |
| Door 1 left (L1) | 4.2 – 5.1 (0.85 m wide) | 1.46 – 3.41 |
| Door 1 right (R1) | 4.1 – 4.9 (0.77 m wide) | 1.46 – 3.45 |
| Engine inlet lip | 13.0 (737-800, `9H-QCE_right`) | nacelle top ≈ 1.2 |
| Two over-wing exits, each side | 16.4 – 17.0 and 17.4 – 18.05 | 1.9 – 3.0 |
| Mid exit door, each side (MAX 8-200 only) | ≈ 24.8 – 25.5 (`EI-HMY_right`) | |
| Rear doors (L2, R2) | 31.7 – 32.5 | 1.50 – 3.21 |
| Dorsal fairing of the fin starts on the crown | 28.9 | 4.0 |
| Fin trailing edge at the root | 37.4 | 3.3 |
| Fin tip (leading / trailing corner) | 37.8 / 39.3 | 10.9 in the photo (see section 7) |
| Tail-cone tip | 38.0 (737-800), 39.05 (MAX 8-200) | |

**Fuselage base colour:** white #F7F7F8 above the cheatline, from the radome tip to the tail cone, crown included.
The radome is the same white.

**Cheatline (yellow, both sides alike):** one band of constant width, **0.20 m** (medians 0.19, 0.20 and 0.21 m
over about 650 pixel columns of three photos). It has no pinstripe and no gap: white touches it above and blue below
(`EI-IJT_nose-left`). Its centre line:

| z | 1.3 | 1.5 | 3.0 | 4.6 | 6.1 | 7.6 | 9.2 | 10.7 | 12.3 | 13.8 | 15.3 | 16.9 | 18.4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| h (centre) | 0.63 | 0.66 | 0.89 | 1.05 | 1.17 | 1.26 | 1.35 | 1.42 | 1.48 | 1.54 | 1.59 | 1.62 | 1.64 |

| z | 23.3 | 24.8 | 26.5 | 28.2 | 29.7 | 31.3 | 32.8 | 34.3 | 35.9 | 37.4 |
|---|---|---|---|---|---|---|---|---|---|---|
| h (centre) | 1.66 | 1.66 | 1.70 | 1.75 | 1.82 | 1.93 | 2.07 | 2.27 | 2.53 | 2.88 |

These are the means of `9H-QCE_right`, `9H-QCC_left` and `EI-HMY_right` (MAX). The right-side photos read 0.05–0.1 m
higher than the left-side photo over the whole length; I take that as measurement bias, not as a difference between
the sides. The shape:

- It **starts at z ≈ 1.3, h ≈ 0.6**, just behind the radome joint, where the bands of the two sides meet under the
  chin (`commons-At_Cagliari_Sardinia_2019_220.jpg`, `EI-ENW_left-low`). The radome is all white.
- It rises quickly along the nose and then more and more slowly. It passes 0.3 m under the sill of door 1.
- It is almost level, h ≈ 1.6–1.7, from the wing's leading edge to z ≈ 26. That is 41 % of the fuselage height.
  Between z ≈ 18.5 and 23 the wing and the engine hide it in side views; it runs on unbroken just above the wing
  root (`EI-IKI_3q-front-left`, `EI-IJT_engine-front`).
- Aft of z ≈ 27 it curves up with the upswept rear fuselage. It crosses the lower third of the rear doors and runs
  under the tailplane root to the end of the paint: z ≈ 37.6 on the 737-800 (the last 0.4 m is the APU exhaust),
  z ≈ 38.4, h ≈ 3.2 on the MAX 8-200 (then the bare-metal APU cone to z 39.05).

**Belly (blue):** everything below the cheatline is blue #0E2E80, all round the underside, from the point under the
chin at z ≈ 1.3 to the tail cone: the lower fuselage sides, the keel, the wing-to-body fairing and the upswept rear
underside (`EI-IJP_left-low`, `EI-ENW_left-low`). In side view the blue is 0.2 m deep at z 1.5, 1.5 m deep at
mid-fuselage, 0.7 m deep at z 36 and 0.4 m deep at z 37.3. There is no title and no other mark on the belly. The
nose-gear doors are blue with the last three letters of the registration in white (skip).

**Title "RYANAIR"** (blue #0E2E80, upright bold wide capitals: the Commons wordmark, see section 6):

- Height: **cap height 1.40 m** in side view (1.38–1.43 m on three photos), **baseline h 1.93, top h 3.33**. The
  letters wrap on the curved skin, where they are about 1.5 m tall. The window row (h 2.48) runs through the middle
  of the letters and the windows show in them. The top of the letters is 0.1 m below the top of door 1.
- Length: **12.8 m** (12.67–12.88 m), from **z ≈ 7.3 to z ≈ 20.1**. It ends 2.1–2.3 m aft of the aft over-wing
  exit, above the wing's trailing edge.
- Left side: it reads nose to tail, the first "R" at z ≈ 7.3–7.6. Measured: 7.61–20.35 (`9H-QCC_left`), starts at
  6.94 (`EI-HMX_left`). The two exits lie on the second "A" and on the "I".
- Right side: it reads tail to nose and is **not mirrored**. The first "R" is at the aft end, z 18.4–20.1, and the
  last "R" ends at z ≈ 7.25, next to the harp. Measured: 7.24–20.12 (`9H-QCE_right`), 7.26–19.93 (`EI-HMY_right`).
  The two exits lie on the "Y".
- In side view the title's box is 9.2 : 1 (12.85 m : 1.40 m). The wordmark file is 8.18 : 1. The curve of the
  fuselage shortens the seen height by about 7 %; the rest is wider spacing or my error. Stretch the image to the
  box.

**Harp on the fuselage** (blue #0E2E80, one on each side, between door 1 and the title):

- Box: **z 5.2 – 6.9, h 1.95 – 3.32** (1.5–1.6 m long, 1.37 m high: the height of the title). Measured: left
  5.66–7.13 (`9H-QCC_left`), 5.36–6.75 (`EI-HMX_left`); right 5.21–6.79 (`9H-QCE_right`), 4.97–6.63
  (`EI-HMY_right`). It stands 0.1–0.6 m aft of the door frame and 0.2–0.5 m from the title.
- It **faces forward on both sides** (mirrored): the figure's head is at the top forward corner, the long arm sweeps
  aft along the top to a point, the body curves down and aft to a point at the bottom, and four strings hang between
  arm and body. The first two cabin windows show through it. Close-up: `EI-IJT_nose-left`.

**Fin (both sides alike, art mirrored):**

- The whole fin and rudder are blue #0E2E80, from the tip down to the fin root, the dorsal fairing included. The blue
  ends where the fin meets the fuselage: its lower edge is the crown line, from (z 28.9, h 4.0) to (z 37.4, h 3.3).
  The fuselage below it is white (`9H-QCE_right`, `9H-QFK_tail-winglet-right`).
- The leading edge has a narrow bare-metal strip (about 0.1 m; `EI-IKI_tail-left`, `9H-QFK_tail-winglet-right`).
- **Harp (yellow #F4C41E):** about **3.3 m × 3.3 m**. It reaches from **v 0.14 to v 0.60** of the fin's height, and
  from about 0.35 m behind the leading edge to the trailing edge. Measured: right z 35.14–38.44, top 2.84 m and
  bottom 6.13 m below the fin tip (`9H-QCE_right`); left v 0.137–0.599 (`9H-QCC_left`).
- Its shape (the figure faces the leading edge on both sides): the head is at u ≈ 0.09, v ≈ 0.42–0.50; the arm
  rises over the strings to the top (v 0.60) and tapers to a point on the trailing edge at v ≈ 0.57; the body
  curves down and aft to a sharp point at u ≈ 0.8, v 0.14; four tapered strings hang from the arm, the aftmost the
  longest. Close-ups: `commons-EI-IKI_tail-left_2024-09-14.jpg` (left), `9H-QFK_tail-winglet-right` (right).
- Nothing else is on the fin.

**Tail cone:** white above the cheatline, blue below it, to the end. The APU exhaust is bare metal: a short stub on
the 737-800, a pointed cone 0.6 m long on the MAX 8-200 (`EI-HMX_left`, `EI-HMY_right`).

**Tailplane and wings:** Boeing grey #B4B9BD on both surfaces, no livery colour. The tailplane's root fairing is
white.

**Engine nacelles** (both engines and both faces alike; no title on them):

- White #F7F7F8 above, a **level yellow band 0.23 m wide**, blue #0E2E80 below. The band's lower edge is 0.6–0.65 m
  above the nacelle's lowest line. Measured from the bottom of the nacelle: 737-800 (CFM56-7B, 1.96 m tall) blue to
  31 %, yellow from 31 % to 43 %; MAX 8-200 (LEAP-1B, 2.3 m tall) blue to 29 %, yellow from 29 % to 39 %
  (`9H-QCE_right`, `EI-HMY_right`). The blue covers the whole underside (`EI-ENW_engines`).
- The band runs from the inlet lip to the end of the cowl. The inlet lip is bare satin metal: in side view a ring
  about 0.3 m long on the 737-800 and 0.4 m long on the MAX. The exhaust nozzle is bare dark metal. On the MAX the
  cowl ends in sawtooth chevrons, painted like the cowl.
- The band is not at the height of the fuselage cheatline. The pylons are white.
- Evidence for the inboard faces: `commons-EI-ENW_engines_2026-09-15.jpg` (right engine, inboard face).

**Wingtip devices.** Three kinds fly; the paint is the same idea on all:

- **Outer face** (seen from the side): the upper blade is **blue #0E2E80 with a yellow "RYANAIR"** along it. The
  text is the wordmark, about 1.6 m long with a cap height of about 0.2 m, on about 65 % of the blade's length,
  nearer the tip than the root. Its baseline leans aft about 35–40° from the vertical, along the blade. The tops of
  the letters point forward (to the leading edge): on the left wing it reads from the root up to the tip, on the
  right wing from the tip down to the root. So it reads correctly on both sides. Evidence: `EI-ENW_winglet-outer-left`
  (left), `9H-QFK_tail-winglet-right` (right), `EI-IKI_winglet-outer-left` (MAX, left).
- **Inner face:** the upper blade is **white with a blue "RYANAIR"**, the same size, tops to the leading edge, read
  from the tip down to the root on the left wing (`commons-Rivedoux-Plage_seen_from_Ryanair.jpg`,
  `9H-QBM_winglet-inner`, `EI-ILI_winglet-inner`; also the far winglet on `9H-QCC_left` and `9H-QCE_right`). I have
  no photo of the right wing's inner face close up; the far winglet on `9H-QCC_left` shows it white with blue letters.
- **Blended winglet** (737-800): one blade. A bare-metal strip runs along the leading edge. The curved foot is blue
  on the outer face.
- **Split scimitar winglet** (many 737-800, for example 9H-QCC, 9H-QDP, 9H-QCY, G-RUKG, 9H-QBM): as the blended
  winglet, with a **yellow** strake below the wing tip, yellow on both faces (`9H-QCC_left`, `9H-QBM_winglet-inner`).
- **MAX split winglet** (737 MAX 8-200): upper blade as above; the **lower blade is yellow** on both faces
  (`EI-IKI_winglet-outer-left`, `EI-ILI_winglet-inner`, `EI-IJR_winglet-outer-left`).

**Other marks (skip):** the registration in small blue capitals above the windows aft of the wing (z ≈ 28.2–30.6,
h ≈ 3.0–3.2 on `9H-QCE_right`) with the national flag in front of it; the registration in black under the left wing
(`EI-IJP_left-low`); small grey stencils.

---

## 5. Side-elevation drawing steps

### LEFT side (nose at the left)

1. **Fill** the fuselage white #F7F7F8.
2. **Belly:** fill everything below the cheatline's centre line (section 4) blue #0E2E80, from z 1.3 to past the
   tail, down past the keel.
3. **Cheatline:** stroke the centre line 0.20 m wide in yellow #F4C41E, from z 1.3 to the end of the paint. Let it
   and the blue run a little past the tail-cone tip of the model, and paint the APU exhaust dark metal #5A5C60 over
   them (the last 0.4 m).
4. **Fin:** fill the fin blue #0E2E80 from its measured outline, down to the fin root and no further.
5. **Fin harp:** yellow, from plain shapes (section 6), in the box v 0.14–0.60, from 0.35 m behind the leading edge
   to the trailing edge, the head towards the leading edge.
6. **Title:** `title.svg` in the box **z 7.3–20.1, h 1.93–3.33**, stretched to fill it. It reads nose to tail.
7. **Fuselage harp:** blue, from plain shapes, in the box **z 5.2–6.9, h 1.95–3.32**, the head towards the nose.
8. Door outlines (optional): thin grey lines; skip the registration, the flag and the stencils.

### RIGHT side (differences from the left)

- The colour fields, the cheatline and the fin are the **same**.
- **Title:** the same box, **not mirrored**: the first "R" is at the aft end (z ≈ 20.1).
- **Harps** (fuselage and fin): **mirrored**, so that the head points forward on this side also. Shapes drawn in
  z and h do this by themselves.

### Flat colours

Wings, tailplane and flap fairings #B4B9BD. Pylons white.

### Nacelle artwork (both engines, all faces)

White #F7F7F8. Blue #0E2E80 below 30 % of the nacelle's height. A level yellow band #F4C41E from 30 % to 41 %
(0.23 m). Inlet-lip ring #B9B9B6 (0.3 m on the 737-800, 0.4 m on the MAX). Exhaust #5A5C60. No text.

### Wingtip artwork

Upper blade blue #0E2E80 with the wordmark's path (drawn by design.ts, yellow) along it (1.6 m long, leaning aft 35–40° from the vertical, on the
upper two thirds of the blade, tops of the letters to the leading edge). MAX lower blade yellow #F4C41E. Blended
winglet: a leading-edge strip #B9B9B6. The kit draws one artwork per device: use the outer face. The white inner face
with the blue title (`title.svg`) then stays undrawn.

---

## 6. Logos and wordmarks

| Graphic | Commons file | Licence | In `liveries/RYR/` | Use |
|---|---|---|---|---|
| **RYANAIR wordmark** (upright capitals; fuselage title, wingtip devices) | https://commons.wikimedia.org/wiki/File:Ryanair_wordmark.svg | **Public domain**: the page carries `{{PD-shape}}` and `{{Trademark}}` (read on 2026-10-13); author Ryanair Holdings plc, source ryanair.com, 2013. The trademark still applies. | `title.svg` (blue #0E2E80): the file's one path, unchanged, 79.05 × 9.66 units (8.18 : 1), recoloured from #073590. The wingtip lettering is the same path, drawn in yellow or blue by design.ts. | **Usable.** The letters are the ones on the aircraft: the widths of R, Y and A on `9H-QCE_right` match the file to within 5 % once the 7 % of section 4 is taken off. |
| Harp emblem (fin and fuselage) | none | No file of the harp is on Commons (searched the Ryanair category, the Irish airline logo category, and eleven likely file names). | – | **Draw it with plain kit shapes** that give the look (a head, a long arm, a curved body that ends in a point, four tapered strings) and are not a copy of the artwork, or leave it out. Without it the fin is plain blue, which is a visible loss. |
| Older logotype (slanted, rounded letters on a yellow box) | https://commons.wikimedia.org/wiki/File:Ryanair_logo.svg | PD-textlogo + Trademark | – | **Do not use.** It is not on the aircraft. The app's `RYR-title.png` is made from it. |
| A side-view drawing "Ryanair B737-800.svg" | https://commons.wikimedia.org/wiki/File:Ryanair_B737-800.svg | Tagged CC BY-SA 4.0, but the page names Ryanair and Revell (a model-kit maker) as author and source. The licence claim is doubtful. | – | **Do not use.** |

**Fonts:** none are needed. The only text in the design is the wordmark, which is an image. The registration is left
out.

---

## 7. Geometry facts for the model

- **Types:** 737-8AS (737-800 with winglets) and 737-8200 (737 MAX 8-200). Fuselage 3.76 m wide and 4.01 m high on
  both. Nose tip to tail-cone tip: 37.8 m on `9H-QCE_right` from the scale of its fuselage height (737-800; the
  model has 38.02 m, which I use), 39.05 m on `EI-HMY_right` (MAX: the tail cone is longer and ends in a pointed APU
  exhaust).
- **The models** (`public/models/b738/model.json`, `b38m/model.json`) have the same body: nose to tail-cone tip
  38.02 m, crown 3.96 m above the keel, door 1 at z 5.03, rear door at z 31.89, cockpit windows' aft edge at z 2.92,
  wing root z 15.0–20.6, fin root at h 3.77, fin tip at h 11.31 (z 37.4–39.4). The z values of this dossier fit them
  as they are. The photos put door 1 about 0.4 m further forward than the model does (L1 centre z 4.65). If the
  design draws door outlines from the model's doors, start the harp 0.3 m aft of the model's door frame.
- **Fin height:** the fin tip is 6.9 m above the crown line on `9H-QCE_right` (h 10.9). The flydubai dossier
  measured h 11.2–11.3 on a 737-8 and the model has 11.31. Use the fin fractions (v) for the harp, not h.
- **Engines:** 737-800: CFM56-7B, a nacelle 1.96 m tall, plain exhaust. MAX: LEAP-1B, 2.3 m tall, chevrons on the
  cowl's trailing edge.
- **Wingtip devices:** the `b738` model has the blended winglet; the split scimitar's yellow strake is not modelled.
  The `b38m` model has the MAX split winglet (upper blade and lower blade).
- **Doors:** two each side on the 737-800, plus two over-wing exits each side. The MAX 8-200 has one more exit door
  each side aft of the wing (z 24.8–25.5).
- **Differences from the app's present `liveries.json` entry** (`base #f7f7f7, belly #073590, fin #073590,
  engine #073590, title`): there is no cheatline; the engines are all blue, but the real ones are white with a
  yellow band and a blue underside; the fin has no harp; the title decal is the older slanted logotype.

---

## 8. Confidence and open questions

- **High:** the layout (white top, yellow cheatline, blue belly, blue fin with yellow harp, banded white nacelles,
  blue wingtip devices with a yellow title); the cheatline's width and curve (three photos agree to 0.1 m); the
  title's text, height and baseline; that text is never mirrored and the harps always face forward; the yellow.
- **Lengthwise positions:** ±0.3 m. On the left side the two photos differ by 0.3–0.6 m for the harp and the start
  of the title. Part of that is the perspective of `9H-QCC_left`; part may be real spread between airframes. The
  right-side numbers are the better ones, and I use the same numbers for both sides.
- **Blue:** medium-high. The photos give a darker blue than the brand's digital #073590. #0E2E80 is a compromise;
  #073590 is the alternative if the model looks too dark beside the photos in sun.
- **Harp:** the place and size are measured (medium-high). The shape cannot be taken from a file: it must be drawn
  from plain shapes, so it will only be like the real one.
- **Fin root:** I have no view from above. I take it that the blue stops at the fin root and that the crown is white.
- **Wingtip devices:** the size and place of the title on the blade are estimates from oblique photos (medium). The
  inner face of the right wing's device is seen only from far away.
- **Wing grey, inlet lip, exhaust:** estimates.
- **Not checked:** aircraft of Buzz (SP-), the Malta Air and Buzz own-colour aircraft, special liveries, and the
  date of the change from the slanted title (between June 2013 and June 2019 on the photos I looked at closely).

Sources: Wikimedia Commons (the files above, the category "Boeing 737-800 of Ryanair" and a file search); the
planespotters.net public API; the models' `model.json`; the `client/scene/liveries.json` RYR entry.

---

## 9. Rendered check (2026-10-14)

Five renders of `b738:RYR` and `b38m:RYR` against the photos (9H-QCC, 9H-QCE, EI-HMX, EI-HMY, EI-IKI, EI-IJT, EI-ENW and the winglet photos).

- Fixed: the wingtip lettering showed only its first "R" (a number such as `3.04e-4` was read as a command while parsing the wordmark path); it now runs the whole blade, as on EI-ENW and EI-IKI.
- Fixed: the door outlines now stand where the photos put them (door 1 at d 4.2–5.1 on the left and 4.1–4.9 on the right, the rear door at d 31.7–32.5, and the MAX's third door at d 24.8–25.5), not on the model's doors: the harp no longer overlaps door 1.
- Fixed: the design scaled every station by the body's length over 38.02 m, but the 737 meshes' body table ends 1.65 m ahead of the tail cone's tip, so the title, the harp, the cheatline's rise and the rear door sat up to 1.6 m too far forward. On the 737s the stations are now true metres (title d 7.3–20.1, rear door d 31.7–32.5 match 9H-QCE to a few cm).
- Fixed: the bare-metal APU patch now stops at the crown (it reached 2 m up the fin's trailing edge).
- Tuned: the harp's strings are thicker (as thick as on EI-IJT and 9H-QCE), the head smaller, the chest thicker; the nacelle's blue underside is a little taller (the band's lower edge at 0.31 of the nacelle's height).
- Matches: the cheatline on both sides, the title's text, size and place on both sides (reads forwards on both), the harps, the blue fin with the metal leading edge, the nacelle bands, the blue and white wingtip faces, the MAX's yellow lower blade.
- Still differs: the harp is a plain-shape version (a little thinner than the real emblem); the 737-800 model has the blended winglet, so the scimitar's yellow strake is missing; the nose-gear door takes the fuselage's yellow line (the real one is plain blue); the windows come from the shader and run a little further aft than the real ones.
