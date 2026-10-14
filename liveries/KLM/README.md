# KLM (KLM; KLM Cityhopper KLC): livery dossier for the Boeing 737-800, 777, 787 and Embraer 190

Research date: 2026-10-13. Refs folder: `data/livery-refs/KLM/` (git-ignored). Each file name below is in that folder.
The larger copies that I measured on are in `data/livery-refs/KLM/_hires/` (3840 px wide; not listed in `refs.json`).
I looked at each photo (the full frame and enlarged crops). I measured the positions and the colours from the pixels.
This dossier has not been checked by a second person.

Coordinates (side elevation, the same for both sides):

- **d** = metres aft of the nose tip, along the fuselage.
- **h** = metres above the keel of the constant-section fuselage (0 = lowest line of the main fuselage).
- **f** = h divided by the fuselage height (0 keel, 1 crown). This is the fraction that the kit's `k.at(z, f)` uses.

The scale of each type:

| Type | Master photo | Fuselage (nose tip to end of tail cone) | Fuselage height | Scale of the master |
|---|---|---|---|---|
| Boeing 737-800 | `_hires/bxb-left.jpg` (PH-BXB, left, true side-on) | 38.02 m | 4.01 m | 93.1 px/m. Nose tip x = 36, tail cone x = 3575, crown y = 1334, keel y = 1710 |
| Boeing 777-300ER | `_hires/bvs-right.jpg` (PH-BVS, right, true side-on) | 73.08 m | 6.20 m | 48.0 px/m. Nose tip x = 3737, crown y = 972, keel y = 1271 |
| Boeing 787-9 | `_hires/bhe-right.jpg` (PH-BHE, right, true side-on) | 62.81 m | 5.94 m | 56.2 px/m. Nose tip x = 3769, crown y = 1110, keel y = 1444 |
| Embraer 190 | `_hires/exv-left.jpg` (PH-EXV, left, seen a little from the front) and `commons-KLM_Embraer_E190STD_PH-EXY_…` (right) | 36.24 m | 3.35 m | about 96 px/m at the nose, 88 px/m at the tail (left); 40.4 px/m (right) |

Check of the 737 scale against the model `b738` (its `model.json` profile): door 1 centre at d 4.99 (model 5.03), rear
door centre at d 32.14 (model 31.89), aft edge of the cockpit windows at d 3.1 (model 2.92), fin trailing-edge root at
d 37.5 (model 37.61). The Embraer photos are oblique, so its lengths are good to about ±0.3 m. Use the model's landmarks
(door 1, the window row, the wing) to place things on the Embraer.

---

## 1. Identity

**Scheme:** the KLM livery of 2014 (shown on 30 April 2014 according to norebbo.com; I did not find KLM's own release).
All the mainline types and KLM Cityhopper wear it. In side view:

- the **upper fuselage is light blue** from the nose tip to the end of the tail cone, including the whole radome;
- a **thin dark-blue line** divides the blue from the white. It is level along the cabin, a little below mid-height.
  Forward of the wing it **curves down and runs low under the nose**. Seen from the front it makes a "smile" across
  the chin. Aft, it rises with the tail cone and ends at the cone's end;
- everything **below the line is white**: the belly, the wing-to-body fairing, the underside of the nose aft of the
  radome;
- the **fin is white** with the KLM logo (a crown over the letters KLM) in light blue;
- the **title is white** on the blue above the windows: the crown, "KLM" and "Royal Dutch Airlines" (mainline) or
  "Cityhopper" (KLM Cityhopper);
- the **engines are white** with the small blue logo on each face;
- the **winglets are white** with the small blue logo on each face (737-800, Embraer 190). The 777 and the 787 have no
  winglets.

**How to tell the scheme before it (2002 to about 2020 on the last aircraft):** the dark line is straight to the nose
(no dip), a thin white line and a light-grey belly are below it, and "Royal Dutch Airlines" is in dark blue *below*
the line, not beside "KLM". Seen on PH-BXN on 2019-04-16 (Commons "ZRH PH-BXN.jpg", viewed, not stored). The same
aircraft wears the 2014 scheme on 2023-11-16 (Commons, André Gerwing, ID 003728, viewed, not stored).

**Who wears it:** KLM (callsign KLM, registrations PH-B…, PH-A…, PH-H…) and KLM Cityhopper (callsign KLC, PH-E…,
PH-N…). The two differ only in the second word of the title.

**Which photos show it:**

- 737-800: 18 stored photos of 14 aircraft, 2023-02 to 2026-09 (PH-BCA, BCH, BCK, BGA, BGB, BGC, BXB, BXC, BXF, BXG,
  BXH, BXI, BXU, BXV). I also looked at about 50 more Commons photos from 2023 to 2026 on contact sheets (not stored). All
  show the 2014 scheme.
- 777: PH-BQE (777-200ER, 2023), PH-BVN (2023), PH-BVC (2024), PH-BVS (2025), PH-BVW (2026).
- 787: PH-BHF (2022, 2023), PH-BHO (2022), PH-BKM (787-10, 2023), PH-BHE (2025).
- Embraer 190: PH-EZP (2024, 2026), PH-EXV (2024), PH-EXF (2026), PH-EZH (2026), PH-EXY (2026).
- Also in the scheme, from the tracked aircraft: the Airbus A321neo (PH-AXD, PH-AXG, PH-AXM) and the Embraer 195-E2
  (PH-NXY).

**The tracked aircraft** (the current planespotters.net API photo of each):

| Hex | Registration | Type | Scheme | Evidence |
|---|---|---|---|---|
| 484161 | PH-BXH | Boeing 737-800 | 2014 | `ps-484161-1961624.jpg` |
| 48415f | PH-BXF | Boeing 737-800 | 2014 | `ps-48415f-1914577.jpg` |
| 484442 | PH-BXU | Boeing 737-800 | 2014 | `ps-484442-1959190.jpg`; `commons-KLM_Boeing_737-800_PH-BXU_HEL_September_2025.jpg` |
| 484558 | PH-BGA | Boeing 737-800 | 2014 | `ps-484558-1930728.jpg` |
| 4867c2 | PH-AXG | Airbus A321neo | 2014 | `ps-4867c2-1979845.jpg` |
| 486898 | PH-AXM | Airbus A321neo | 2014 | `ps-486898-1991702.jpg` |
| 486742 | PH-AXD | Airbus A321neo | 2014 | `ps-486742-1975230.jpg` |
| 4868a6 | PH-NXY | Embraer 195-E2 (KLM Cityhopper) | 2014 | `ps-4868a6-1992006.jpg` |

**Exceptions** (special liveries; their photos are not in `refs.json`):

- **The first 787 nose (2015 to 2024).** The 787s were delivered with the dark line higher at the nose: it crosses the
  radome, and the lower part of the radome is white (`commons-KLM_Royal_Dutch_Airlines_PH-BHF_Boeing_787-9_…`, 2023;
  `commons-AMS_PH-BHF.jpg`, 2022). From January 2025 KLM repaints the 787 nose: the radome is all light blue and the
  line runs low under it, as on the other types (`commons-PH-BHE_B787-9_IAH_12-10-25_55094687921_.jpg`; aviacionline.com,
  2025-01-12, names PH-BHF and PH-BHE). I did not count how many 787s still have the first nose. Draw the 2025 nose.
- **787-9 without the crown.** PH-BHG on 2025-05-01 (Commons "PH-BHG@PEK (20250501083825).jpg", viewed, not stored):
  "KLM" only on the fuselage, the fin and the engines. No crown, no "Royal Dutch Airlines", no flags. A JetPhotos
  caption says the same of PH-BHI (April 2025) and calls it the successor of the KLM Asia marks. No free file is
  needed for it (it is the logo without its crown), but the app has no list of these aircraft. Paint them standard.
- **KLM Asia** (some 777-200ER, for example PH-BQH in 2023): "KLM ASIA" on the fuselage and on the fin, no crown.
- **PH-BVA "Orange Pride"** (777-300ER): an orange forward fuselage.
- **PH-BKA** (787-10): the large "100" mark of 2019 on the forward fuselage, still worn in April and May 2026.
- **PH-EZX** (Embraer 190): the SkyTeam alliance livery (metallic silver).
- In 2019 and 2020 many aircraft carried a small "100" beside the title (for example PH-BVO in March 2020).

---

## 2. Reference images

61 entries in `refs.json`: 8 planespotters.net thumbnails, 41 Commons photos (1920 px copies; 9 A330-300 photos were added on
2026-10-14) and 12 crops cut from the Commons photos. A crop has the source, author and licence of its photo. Commons dates are the EXIF dates.

| File | View | Aircraft | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|
| `ps-484161-1961624.jpg` | left side (flying) | PH-BXH, 737-800 | https://www.planespotters.net/photo/1961624/ph-bxh-klm-royal-dutch-airlines-boeing-737-8k2-wl | Gerrit Griem | reference only | unknown |
| `ps-48415f-1914577.jpg` | left side (climbing, from below) | PH-BXF, 737-800 | https://www.planespotters.net/photo/1914577/ph-bxf-klm-royal-dutch-airlines-boeing-737-8k2-wl | Graeme Williamson | reference only | unknown |
| `ps-484442-1959190.jpg` | left side (flying) | PH-BXU, 737-800 | https://www.planespotters.net/photo/1959190/ph-bxu-klm-royal-dutch-airlines-boeing-737-8bk-wl | Gerrit Griem | reference only | unknown |
| `ps-484558-1930728.jpg` | right side (flying) | PH-BGA, 737-800 | https://www.planespotters.net/photo/1930728/ph-bga-klm-royal-dutch-airlines-boeing-737-8k2-wl | Gerrit Griem | reference only | unknown |
| `ps-4867c2-1979845.jpg` | left side (flying) | PH-AXG, A321neo | https://www.planespotters.net/photo/1979845/ph-axg-klm-royal-dutch-airlines-airbus-a321-252nx | Jan Seler | reference only | unknown |
| `ps-486898-1991702.jpg` | right side (flying, from below) | PH-AXM, A321neo | https://www.planespotters.net/photo/1991702/ph-axm-klm-royal-dutch-airlines-airbus-a321-252nx | Gianluca Mantellini | reference only | unknown |
| `ps-486742-1975230.jpg` | left side (take-off) | PH-AXD, A321neo | https://www.planespotters.net/photo/1975230/ph-axd-klm-royal-dutch-airlines-airbus-a321-252nx | Kees Marijs | reference only | unknown |
| `ps-4868a6-1992006.jpg` | right side (flying) | PH-NXY, E195-E2 | https://www.planespotters.net/photo/1992006/ph-nxy-klm-cityhopper-embraer-e195-e2-erj-190-400-std | Moritz Babl | reference only | unknown |
| `commons-KLM_Royal_Dutch_Airlines_PH-BXB_Boeing_737-8K2_Amsterdam_Airport_Schiphol_AMS_EH.jpg` | **left side** (ground, true side-on; master) | PH-BXB, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXB_Boeing_737-8K2_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52723490982).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `commons-VIE_PH-BXG.jpg` | left side (ground, side in shade) | PH-BXG, 737-800 | https://commons.wikimedia.org/wiki/File:VIE_PH-BXG.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2023-07-13 |
| `commons-KLM_Royal_Dutch_Airlines_PH-BXI_Boeing_737-8K2_Amsterdam_Airport_Schiphol_AMS_EH.jpg` | **right side** (flying, almost side-on) | PH-BXI, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXI_Boeing_737-8K2_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52724264524).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `commons-PH-BCA_at_AMS_20260929.jpg` | 3/4 front left (ground) | PH-BCA, 737-800 | https://commons.wikimedia.org/wiki/File:PH-BCA_at_AMS_20260929.jpg | VynedJ | CC BY 4.0 | 2026-09-29 |
| `commons-KLM_Royal_Dutch_Airlines_PH-BCK_Boeing_737-8K2_Amsterdam_Airport_Schiphol_AMS_EH.jpg` | 3/4 front left (ground) | PH-BCK, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BCK_Boeing_737-8K2_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52724485263).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `commons-KLM_Boeing_737-8K2_PH-BCH_at_LHR.jpg` | 3/4 front left (from above; green cast) | PH-BCH, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Boeing_737-8K2_PH-BCH_at_LHR.jpg | DaHuzyBru | CC BY-SA 4.0 | 2023-10-05 |
| `commons-PH-BGC_737_KLM_ARN_01.jpg` | 3/4 front right (ground, sun) | PH-BGC, 737-800 | https://commons.wikimedia.org/wiki/File:PH-BGC_737_KLM_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2026-07-21 |
| `commons-KLM_Royal_Dutch_Airlines_PH-BXC_Boeing_737-8K2_Glasgow_International_Airport_GLA.jpg` | 3/4 front right (ground, overcast) | PH-BXC, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXC_Boeing_737-8K2_Glasgow_International_Airport_(GLA_EGPF)_(52700970041).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-18 |
| `commons-PH-BXC.jpg` | 3/4 front right (ground) | PH-BXC, 737-800 | https://commons.wikimedia.org/wiki/File:PH-BXC.jpg | Aviation400 | CC BY-SA 4.0 | 2024-08-16 |
| `commons-KLM_Boeing_737-800_PH-BXU_HEL_September_2025.jpg` | 3/4 front right (ground) | PH-BXU, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Boeing_737-800_(PH-BXU)_@_HEL,_September_2025.jpg | Stefalgo | CC BY 4.0 | 2025-09-09 |
| `commons-PH-BGB_737_KLM_ARN_01.jpg` | 3/4 front right (at the gate, from above: the line under the nose) | PH-BGB, 737-800 | https://commons.wikimedia.org/wiki/File:PH-BGB_737_KLM_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2025-07-02 |
| `commons-PH-BXC_GLA_52701385675.jpg` | 3/4 rear left (ground) | PH-BXC, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BXC_Boeing_737-8K2_Glasgow_International_Airport_(GLA_EGPF)_(52701385675).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-18 |
| `commons-KLM_Boeing_737_PH-BXV_Oslo_Gardermoen_2024_03_.jpg` | 3/4 rear right (at the gate, from above) | PH-BXV, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_Boeing_737_PH-BXV_Oslo_Gardermoen_2024_(03).jpg | Bahnfrend | CC BY-SA 4.0 | 2024 |
| `commons-KLM_PH-BXV_B737-800.jpg` | **below** (flying, from below on the right side) | PH-BXV, 737-800 | https://commons.wikimedia.org/wiki/File:KLM_PH-BXV_B737-800.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-05-01 |
| `commons-KLM_aircraft_parked_on_Schiphol_runway_during_corona_crisis_cropped_.jpg` | above (seven 777 and 787 from the air) | several | https://commons.wikimedia.org/wiki/File:KLM_aircraft_parked_on_Schiphol_runway_during_corona_crisis_(cropped).jpg | Ikreis | CC BY-SA 4.0 | 2020-04-15 |
| `commons-AMS_PH-BQE.jpg` | right side (ground, side in shade) | PH-BQE, 777-200ER | https://commons.wikimedia.org/wiki/File:AMS_PH-BQE.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2023-09-23 |
| `commons-_SGP-Singapore_KLM_Boeing_777-306ER_PH-BVS_WSSS_2025-08-30.jpg` | **right side** (ground, overcast, true side-on; master) | PH-BVS, 777-300ER | https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_KLM_Boeing_777-306ER_PH-BVS_@_WSSS_2025-08-30.jpg | S5A-0043 | CC BY 4.0 | 2025-08-30 |
| `commons-_SGP-Singapore_KLM_Boeing_777-300ER_PH-BVW_WSSS_2026-01-01.jpg` | left side (flying, from below; both engine faces) | PH-BVW, 777-300ER | https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_KLM_Boeing_777-300ER_PH-BVW_@_WSSS_2026-01-01.jpg | S5A-0043 | CC BY 4.0 | 2026-01-01 |
| `commons-AMS_PH-BVN.jpg` | 3/4 front left (ground, from above) | PH-BVN, 777-300ER | https://commons.wikimedia.org/wiki/File:AMS_PH-BVN.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2023-09-23 |
| `commons-PH-BVC_Schiphol_November_2024.jpg` | 3/4 front right (ground, overcast) | PH-BVC, 777-300ER | https://commons.wikimedia.org/wiki/File:PH-BVC_Schiphol,_November_2024.jpg | Gerard van der Schaaf | CC BY 4.0 | 2024-11-15 |
| `commons-KLM_Royal_Dutch_Airlines_PH-BHF_Boeing_787-9_Dreamliner_Amsterdam_Airport_Schiph.jpg` | left side (ground; the first 787 nose) | PH-BHF, 787-9 | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Airlines_PH-BHF_Boeing_787-9_Dreamliner_Amsterdam_Airport_Schiphol_(AMS_EHAM)_(52724015616).jpg | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `commons-PH-BHE_B787-9_IAH_12-10-25_55094687921_.jpg` | **right side** (ground, sun; the 2025 nose; master) | PH-BHE, 787-9 | https://commons.wikimedia.org/wiki/File:PH-BHE_B787-9,_IAH_12-10-25_(55094687921).jpg | Duncan Kirk | CC BY 4.0 | 2025-12-10 |
| `commons-PH-BKM_AMS_2023-08-07.jpg` | left side (ground; a 1200 px photo, enlarged) | PH-BKM, 787-10 | https://commons.wikimedia.org/wiki/File:PH-BKM_@_AMS,_2023-08-07.jpg | Anna Zvereva | CC BY-SA 2.0 | 2023-08-07 |
| `commons-AMS_PH-BHF.jpg` | 3/4 front right (at the gate; the first 787 nose) | PH-BHF, 787-9 | https://commons.wikimedia.org/wiki/File:AMS_PH-BHF.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2022-04-06 |
| `commons-AMS_PH-BHO.jpg` | 3/4 rear left (ground) | PH-BHO, 787-9 | https://commons.wikimedia.org/wiki/File:AMS_PH-BHO.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2022-04-06 |
| `commons-PH-EXV_Embraer_190_KLM_Cityhopper_Manchester.jpg` | **left side** (ground, sun; a little from the front; master) | PH-EXV, E190 | https://commons.wikimedia.org/wiki/File:PH-EXV_Embraer_190_KLM_Cityhopper,_Manchester.jpg | Ian Gratton | CC BY 2.0 | 2024-07-29 |
| `commons-PH-EZP_2026-10-07_Andre_Gerwing_031489.jpg` | left side (take-off roll, from above, hazy) | PH-EZP, E190 | https://commons.wikimedia.org/wiki/File:Embraer_ERJ-190-100_-_ERJ-190STD_(c-n_347,_PH-EZP)_2026-10-07_Andre_Gerwing_Collection_ID_031489.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons-PH-EZP_53726735447_.jpg` | left side (ground) | PH-EZP, E190 | https://commons.wikimedia.org/wiki/File:PH-EZP_(53726735447).jpg | Mike Burdett | CC BY-SA 2.0 | 2024-04-16 |
| `commons-KLM_Embraer_E190STD_PH-EXY_Landed_at_Amsterdam_Schipol_International_Airport.jpg` | **right side** (ground, a little from behind) | PH-EXY, E190 | https://commons.wikimedia.org/wiki/File:KLM_Embraer_E190STD_PH-EXY_Landed_at_Amsterdam_Schipol_International_Airport.jpg | Aryan loves planes | CC0 | 2026-09-30 |
| `commons-PH-EXF_AIRCRAFT_Embraer_E190STD_-1a.jpg` | right side (flying; both winglet faces) | PH-EXF, E190 | https://commons.wikimedia.org/wiki/File:PH-EXF_AIRCRAFT_Embraer_E190STD_-1a.jpg | Sg1959 | CC BY-SA 4.0 | 2026-03-05 |
| `commons-Embraer_ERJ-190-100_-_ERJ-190STD_c-n_347_PH-EZP_2026-10-07_Andre_Gerwing_Collect.jpg` | 3/4 front left (ground, from above) | PH-EZP, E190 | https://commons.wikimedia.org/wiki/File:Embraer_ERJ-190-100_-_ERJ-190STD_(c-n_347,_PH-EZP)_2026-10-07_Andre_Gerwing_Collection_ID_031475.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons-Embraer_ERJ-190-100_-_ERJ-190STD_c-n_319_PH-EZH_2026-06-11_Andre_Gerwing_Collect.jpg` | below (flying) | PH-EZH, E190 | https://commons.wikimedia.org/wiki/File:Embraer_ERJ-190-100_-_ERJ-190STD_(c-n_319,_PH-EZH)_2026-06-11_Andre_Gerwing_Collection_ID_029727.jpg | André Gerwing | CC BY-SA 4.0 | 2026-06-11 |
| `crop-PH-BXB-tail-left.jpg` | **tail** (fin and rear fuselage, left) | PH-BXB | cut from the PH-BXB photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `crop-PH-BXI-tail-right.jpg` | tail (fin, right) | PH-BXI | cut from the PH-BXI photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `crop-PH-BHE-tail-787.jpg` | tail (787 fin, right) | PH-BHE | cut from the PH-BHE photo | Duncan Kirk | CC BY 4.0 | 2025-12-10 |
| `crop-PH-BXB-engine-left.jpg` | **engine** (737 left engine, outboard face) | PH-BXB | cut from the PH-BXB photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `crop-PH-BVS-engine-777.jpg` | engine (777 right engine, outboard face) | PH-BVS | cut from the PH-BVS photo | S5A-0043 | CC BY 4.0 | 2025-08-30 |
| `crop-PH-BHE-engine-787.jpg` | engine (787 right engine, outboard face) | PH-BHE | cut from the PH-BHE photo | Duncan Kirk | CC BY 4.0 | 2025-12-10 |
| `crop-PH-EXV-engine-e190.jpg` | engine (Embraer left engine, outboard face) | PH-EXV | cut from the PH-EXV photo | Ian Gratton | CC BY 2.0 | 2024-07-29 |
| `crop-PH-BXB-winglet-outer.jpg` | **winglet** (737 left winglet, outer face) | PH-BXB | cut from the PH-BXB photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `crop-PH-BXV-winglet-inner.jpg` | winglet (737 left winglet, inner face, from below) | PH-BXV | cut from the PH-BXV photo | Zima Savolainen | CC BY-SA 4.0 | 2025-05-01 |
| `crop-PH-EXV-winglet-e190.jpg` | winglet (Embraer left winglet, outer face) | PH-EXV | cut from the PH-EXV photo | Ian Gratton | CC BY 2.0 | 2024-07-29 |
| `crop-PH-BXB-forward-left.jpg` | forward fuselage (nose, title, start of the line; left) | PH-BXB | cut from the PH-BXB photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `crop-PH-BXI-forward-right.jpg` | forward fuselage (nose and title; right) | PH-BXI | cut from the PH-BXI photo | Mitchul Hope | CC BY-SA 2.0 | 2023-02-28 |
| `commons-PH-AKA_A300-300_KLM_Miami_02-19-26_55146372991_.jpg` | left side (A330-300) | PH-AKA | https://commons.wikimedia.org/wiki/File:PH-AKA_A300-300,_KLM,_Miami_02-19-26_(55146372991).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-19 |
| `commons-KLM_Airbus_A330-300_PH-AKA_at_Schiphol_27-08-2021.jpg` | left side (A330-300) | PH-AKA | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKA_at_Schiphol_27-08-2021.jpg | Robbie Klinkenberg | CC BY-SA 4.0 | 2021-08-27 |
| `commons-KLM_Airbus_A330-300_PH-AKE_on_final_approach_to_Boston_Aug_2020_2.jpg` | 3/4 front left (A330-300) | PH-AKE | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKE_on_final_approach_to_Boston_Aug_2020_2.jpg | 4300streetcar | CC BY 4.0 | 2020-08-08 |
| `commons-KLM_Airbus_A330-300_PH-AKE_41565463471_.jpg` | left side (A330-300) | PH-AKE | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKE_(41565463471).jpg | Jeroen Stroes Aviation Photography from Netherlands | CC BY 2.0 | 2018-04-19 |
| `commons-PH-AKE_KLM_Royal_Dutch_Airlines_Airbus_A330-303_coming_in_from_Oranjestad_AUA_Am.jpg` | left side (A330-300) | PH-AKE | https://commons.wikimedia.org/wiki/File:PH-AKE_KLM_Royal_Dutch_Airlines_Airbus_A330-303_coming_in_from_Oranjestad_(AUA)_@_Amsterdam_-_Schiphol_(AMS)_-_27.05.2017_(34102706694).jpg | Oliver Holzbauer | CC BY-SA 2.0 | 2017-05-27 |
| `commons-PH-AKB_A330-300_KLM_Miami_02-20-26_55148389690_.jpg` | left side (A330-300) | PH-AKB | https://commons.wikimedia.org/wiki/File:PH-AKB_A330-300,_KLM,_Miami_02-20-26_(55148389690).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons-KLM_Airbus_A330-300_PH-AKF_MD1.jpg` | right side (A330-300) | PH-AKF | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKF_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-01-19 |
| `commons-KLM_Airbus_A330-300_PH-AKF_30667747398_.jpg` | right side (A330-300) | PH-AKF | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKF_(30667747398).jpg | Gerard van der Schaaf | CC BY 2.0 | 2016-08-17 |
| `commons-KLM_Airbus_A330-300_PH-AKF_25991344631_.jpg` | left side (A330-300) | PH-AKF | https://commons.wikimedia.org/wiki/File:KLM_Airbus_A330-300_PH-AKF_(25991344631).jpg | BriYYZ from Toronto, Canada | CC BY-SA 2.0 | 2016-03-26 |

Mitchul Hope's four photos (PH-BXB, PH-BXI, PH-BCK, PH-BHF) are strongly saturated. Use them for positions, not for
colours. Bene Riobó's PH-BGC photo makes the blue paler and less cyan than the others. Do not use it for colours.

---

## 3. Colours

Published values (none is a KLM paint specification):

- The Commons vector logo `File:KLM_logo.svg` is filled **#00A1E4**.
- The app's present `liveries.json` entry uses **#00A1DE**.
- norebbo.com (side-view drawings of the 2014 livery) uses #1FA4D7 for the top, #003E73 for the line and #FAFAFF for
  the belly, fin and engines. It calls the lower colour "a cool gray" that looks white.

Photo samples: the median of all pixels of one paint in a box on a flat area (tool: a pixel classifier on the stored
copies). H is the hue in degrees.

| Paint | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **KLM light blue** (upper fuselage; the logo on the fin, the engines and the winglets) | **#00A1DE** | In sun: #29B5F2 (PH-BHE, H 198), #0B98CD (PH-EXV, H 196; a dark exposure, its white is #C8D2CE), #4BB6F8 above the windows and #218ED4 below them (PH-EXY, H 203). Overcast: #43A6D8 (PH-BVS, H 200), #5192B6 (PH-EZP 2026, hazy, H 201). Side in shade: #1275B7 (PH-BQE, H 204), #0F70B8 (PH-BVN, H 206), #4CB4F4 (PH-BXG, H 203). Not used: #04C0FE (PH-BXB, saturated), #73ADEB (PH-BGC, H 211). The hue is 196 to 206°, median 201°. The logo on the fin has the fuselage's colour: #41B3EB against #29B5F2 (PH-BHE), #1694CA against #0B98CD (PH-EXV). | High for the hue. The brand value #00A1DE (H 197°) is at the cyan end of the photos. In sun the paint photographs a little lighter (about #1FAEEC). |
| **Dark blue** (the line) | **#0B3A7A** | In sun: #124086 (PH-BHE, H 216), #0E386E (PH-EXV, H 214), #032877 (PH-EXY, H 221). Overcast or shade: #142A4D (PH-BVS), #112952 (PH-BQE), #0C2048 (PH-BVN), #17284C (PH-EZP). Hue 214 to 221°. The line is only 6 to 14 px wide in the photos, so each sample has some light blue or white mixed in. | Medium. norebbo.com's #003E73 (H 208°) is an alternative, a little less violet. |
| **White** (belly, fin, engines, winglets) | **#F4F5F7** | Fuselage side below the line in sun: #E9E8E7 (PH-BHE), #EBEBEC (PH-BGC). Fin in sun: #EFEDEA (PH-BHE), #EEEEF0 (PH-BGC). Engine: #ECEBE7 (PH-BHE), #F3F4F4 (PH-BGC). The belly, the fin and the engines have the same white within the light's spread. | High. If the lower colour is a very light grey, the photos do not show it. |
| **Title white** | **#FFFFFF** | White vinyl or paint on the blue; no sample (the letters are too thin). | High |
| **Wing and tailplane grey** | **#A9B1B7** | Boeing's and Embraer's standard light grey, not a KLM colour. From above (`commons-KLM_Boeing_737-8K2_PH-BCH_at_LHR.jpg`, green cast): tailplane top #99BDBA against a white of #D2EEDD, so about three quarters of white. | Low (an estimate) |
| **Inlet lip** (bare metal) | **#B9BCBF** | A bright metal ring on each engine (`crop-PH-EXV-engine-e190.jpg`, `crop-PH-BHE-engine-787.jpg`). No clean sample. | Low (an estimate) |
| **Exhaust, tail-cone end** (bare metal) | **#55585C** | Dark metal in the engine crops and at the end of the tail cone (`commons-PH-EZP_2026-10-07_Andre_Gerwing_031489.jpg`). | Low (an estimate) |

The cockpit windows have no dark surround: the blue goes to the window frames (`crop-PH-BXB-forward-left.jpg`).

---

## 4. Elements (side elevation)

### 4.1 Boeing 737-800 (measured on `_hires/bxb-left.jpg`)

Landmarks of the type in the photo:

| Landmark | d (m) | h (m) |
|---|---|---|
| Cockpit windows | 1.5 – 3.1 | 2.2 – 2.8 |
| Radome joint | 1.2 | |
| Door 1 (left) | 4.55 – 5.42 | 1.5 – 3.4 |
| Cabin window row | first window at 5.97 | centre 2.46 (windows 0.36 high) |
| Engine: inlet lip / end of the exhaust | 13.4 / 17.3 | top +1.33, bottom −0.71 (below the keel) |
| Over-wing exits (2) | 16.6 – 17.8 | |
| Rear door (left) | 31.8 – 32.5 | |
| Dorsal fillet starts | 28.9 | 4.0 |
| Fin leading edge, extended down to the crown | 31.65 | 4.0 |
| Fin tip: leading-edge corner / trailing-edge corner | 37.7 / 39.2 | 11.0 |
| Fin trailing-edge root | 37.5 | 3.85 |
| End of the tail cone | 38.0 | 2.6 – 3.2 |

**Base:** light blue #00A1DE on everything above the dark line: the radome, the cockpit area, the crown, the sides
down to the line, the rear fuselage and the tail cone to its end. White #F4F5F7 on everything below the line.

**The dark line.** 0.15 m wide (12 to 16 px at 93 px/m). Its centre, by pixel scan:

| d (m) | 0.3 – 1.2 | 1.8 | 3.9 | 5.2 | 6.1 | 7.1 | 8.2 | 9.3 | 10.4 | 12.5 | 13.6 | 14.7 | 15.7 | 24.3 | 29.7 | 31.8 | 32.9 | 34.0 | 35.1 | 37.6 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| h (m) | on the nose's lower outline | 0.81 | 0.83 | 0.94 | 1.04 | 1.19 | 1.35 | 1.53 | 1.66 | 1.81 | 1.86 | 1.89 | 1.90 | 1.93 | 1.94 | 1.99 | 2.06 | 2.18 | 2.32 | 2.67 |

- At the nose the line starts just under the nose tip (about 0.15 m below the tip's height) and follows the lower
  outline of the radome down and aft. In side view the radome is light blue to its lower edge. From the radome joint
  (d 1.2) the line leaves the outline and white shows below it (`crop-PH-BXB-forward-left.jpg`). Seen from the front,
  the line joins under the chin (`commons-PH-BGB_737_KLM_ARN_01.jpg`).
- It is level at h 0.81 to 0.83 (f 0.20) from d 1.2 to d 4, under the cockpit and door 1.
- It rises in a smooth S-curve from d 4 to d 15, and is level at h 1.90 to 1.94 (**f 0.48**) from d 15 (the wing's
  leading edge at the root) to d 30. It passes just above the wing root and about 0.35 m below the windows' lower edge.
- Aft of d 30 it rises with the underside of the rear fuselage and ends at the lower corner of the tail cone's end
  (d 37.6, h 2.67).
- No second line, no pinstripe, no grey band.

**Title** (left side), white, above the window row:

| Part | d (m) | h (m) | Size |
|---|---|---|---|
| Crown | 7.03 – 8.07 | 3.29 – 3.68 | 1.04 m wide, centred over "KLM" |
| "KLM" | 6.47 – 8.60 | baseline 2.73, top 3.21 | 2.14 m wide, cap height 0.49 m as seen side-on |
| "Royal Dutch Airlines" | 8.85 – 12.71 | baseline 2.73 (the same as "KLM") | 3.86 m long; capitals about 0.24 m, ascenders 0.29 m, x-height about 0.17 m |

- "KLM" starts 1.05 m aft of door 1's aft edge, above the second window. "Airlines" ends above the 13th window.
- The crown and "KLM" are the logo file (section 6) in white, 2.14 m wide. On the aircraft the logo is about 8 %
  flatter than the file (width to height of the letters 4.37 in the photo, 3.99 in the file), because the upper side
  of the fuselage curves away. Stretch the image to the box, as the Wizz Air design does.
- "Royal Dutch Airlines": a bold humanist sans-serif, capitals and lower case, a double-storey "a", a straight-tailed
  "y" (`crop-PH-BXB-forward-left.jpg`).

**Not needed for the model** (small marks): the registration in white above the windows just forward of the rear door
(d 27.8 – 29.45, capitals 0.28 m) with the Dutch and the EU flag aft of it; "The Flying Dutchman" in small dark-blue
italics on the white below the line (d 27.8 – 29.8, h 1.54, both sides); the aircraft's name in small white letters
under the windows aft of door 1; the SkyTeam roundel and "AIRFRANCE KLM" in white between the cockpit and door 1;
"BOEING 737-800" in small dark letters under the fin.

**Fin.** White #F4F5F7 on both faces, including the dorsal fillet and the fin tip. The white meets the blue fuselage
along the foot of the fin and of the fillet. There is no dark line there. The logo is light blue #00A1DE:

| Part | d (m) | h (m) | Size |
|---|---|---|---|
| Crown | 35.3 – 36.9 | 6.78 – 7.68 | 1.58 m wide, 0.90 m high |
| "KLM" | 34.5 – 37.7 | baseline 5.75, top 6.57 | 3.23 m wide, cap height 0.82 m |

- The whole logo is 3.23 m wide and 1.93 m high: the logo file at 3.23 m width (the file gives 1.88 m).
- In fin terms: the logo's foot is at 0.26 of the fin's height (fuselage crown to tip) and its top at 0.53. At the
  height of "KLM" the fin is 4.5 m from leading to trailing edge. "KLM" takes 0.72 of that. It sits towards the
  trailing edge: 0.97 m of white ahead of the "K", 0.31 m behind the "M". The centre is at 0.57 of the chord.
- The fin's leading edge is swept 40° from the vertical in the photo.

**Rear fuselage and tail cone.** Light blue above the line to the end of the cone. The end of the cone (the APU
exhaust) is a small ring of bare metal. The tailplane's fairing on the fuselage is blue.

**Tailplane and wings.** Light grey on the upper and the lower surface. No livery colour
(`commons-KLM_Boeing_737-8K2_PH-BCH_at_LHR.jpg`, `commons-KLM_PH-BXV_B737-800.jpg`).

**Engines** (CFM56-7B). The nacelle is white all round. The inlet lip is a ring of bare metal. The exhaust is dark
metal. The logo (crown over "KLM") is light blue on the fan cowl: 0.97 m wide (0.55 m high with its crown), its
centre 1.55 m aft of the lip and about 0.15 m above the nacelle's centreline (the nacelle is 2.0 m high in the photo).
It is on the outboard face and on the inboard face of each engine (`crop-PH-BXB-engine-left.jpg`; both faces in
`commons-KLM_PH-BXV_B737-800.jpg`). It reads correctly on each face. Small maintenance marks are below it: skip.

**Winglets** (blended winglets). The blade is white on both faces. The curved blend at its foot is wing grey. The
leading edge has a narrow bare-metal strip. The logo is light blue on **both faces**: about 0.7 m wide, its centre at
about 45 % of the blade's height above the blend, towards the trailing edge (it takes about 0.7 of the chord there).
Outer face: `crop-PH-BXB-winglet-outer.jpg`. Inner face: `crop-PH-BXV-winglet-inner.jpg` and
`commons-KLM_Boeing_737-8K2_PH-BCH_at_LHR.jpg`.

**Seen from below** (`commons-KLM_PH-BXV_B737-800.jpg`): the belly is white with no title. The registration is in
black under the left wing: skip.

### 4.2 The other types

The scheme is the same. The line, the title and the logos scale with the aircraft. Values from the master photos:

| | 737-800 | Embraer 190 | 777-300ER | 787-9 (2025 nose) |
|---|---|---|---|---|
| Line width | 0.15 m | 0.13 – 0.15 m | 0.25 m | 0.23 m |
| Line, level part: h (f) | 1.93 m (0.48) | 1.3 m (0.39) | 2.83 m (0.455) | 2.68 m (0.45) |
| Level from d | 15 m (wing root) | 10 – 13 m | 17 m (door 2) | 19 – 24 m (aft of door 2) |
| Line, lowest part: h (f) at d | 0.81 m (0.20) at 1.2 – 4 m | about 0.35 m (0.10) at 2 – 4 m | 1.53 m (0.25) at 1.5 – 3.5 m | 0.36 m (0.06) at 2 – 4 m |
| Door 1 / door 2 (d) | 4.55 – 5.42 / none | about 4.6 – 5.6 / none | 5.1 – 6.35 / 15.2 – 16.5 | 5.9 – 7.2 / 18.5 – 19.8 |
| Title block (d) | 6.47 – 12.71 | starts about 1.4 m aft of door 1, about 4.7 m long | 6.96 – 14.60 | 9.15 – 16.83 |
| "KLM": width, cap height (side-on) | 2.14 m, 0.49 m | about 1.8 m, 0.40 m | 3.06 m, 0.71 m | 2.85 m, 0.64 m |
| "KLM" baseline: h (f) | 2.73 m (0.68) | about 2.37 m (0.71) | 3.94 m (0.635) | 4.02 m (0.68) |
| Second word | "Royal Dutch Airlines", 3.86 m, ascenders 0.29 m | "Cityhopper", about 2.6 m, capitals about 0.31 m | "Royal Dutch Airlines", 4.27 m, ascenders 0.35 m | "Royal Dutch Airlines", 4.6 m, ascenders 0.39 m |
| Fin logo width | 3.23 m | about 2.5 m | 5.65 m | 4.54 m |
| Fin logo: foot – top (fraction of fin height) | 0.26 – 0.53 | 0.28 – 0.59 | about 0.22 – 0.54 | 0.24 – 0.53 |
| Engine logo width | 0.97 m | about 0.55 m | 1.04 m | 0.87 m |
| Wingtip device | winglet, logo on both faces | winglet, logo on both faces | none (raked tip, grey) | none (raked tip, grey) |

Line centres by pixel scan (d m : h m):

- **777-300ER** (`_hires/bvs-right.jpg`): 0.8 : 1.75, 1.8 : 1.53, 2.85 : 1.53, 4.9 : 1.62, 6.0 : 1.72, 7.0 : 1.82,
  8.1 : 1.96, 9.1 : 2.10, 11.2 : 2.36, 13.3 : 2.60, 17.4 : 2.82, 19.5 : 2.86, level to about 60, 63.3 : 2.78
  (the photo falls a little to the tail), 71.6 : 3.45.
- **787-9, 2025 nose** (`_hires/bhe-right.jpg`): 0.5 : 0.71, 1.2 : 0.54, 2.1 : 0.39, 3.0 : 0.36, 3.9 : 0.40,
  4.8 : 0.49, 5.7 : 0.60, 6.6 : 0.75, 8.3 : 1.09, 10.1 : 1.48, 11.9 : 1.84, 13.7 : 2.16, 15.5 : 2.36, 17.2 : 2.47,
  24.4 : 2.68, then level (the photo rises 9 px to the tail, the crown and the line together). On the 787 the line
  runs along the very bottom of the nose: almost the whole nose is blue.
- **Embraer 190** (right side, `commons-KLM_Embraer_E190STD_PH-EXY_…`, 40.4 px/m): 2.85 : 0.36, 4.1 : 0.50,
  5.3 : 0.66, 6.6 : 0.84, 7.8 : 1.02, 10.3 : 1.23, level at 1.28 to 1.34 (d is good to ±0.3 m: the nose tip is not
  sharp in this photo). The left photo gives the same shape: lowest
  at f 0.10 under the cockpit, level at f 0.40.

Notes per type:

- **Embraer 190** (KLM Cityhopper). The title is the crown and "KLM" as on the mainline, then **"Cityhopper"** in a
  *light or regular* weight of the same typeface (thin strokes), on the same baseline. Its capital "C" is about 0.78
  of the height of "KLM" (`commons-PH-EXV_Embraer_190_KLM_Cityhopper_Manchester.jpg`). The registration and the flags
  are above the windows forward of the rear door. The engines (CF34-10E) are white with the logo and a bare-metal lip.
  The winglets are white with the logo on both faces (outer: `crop-PH-EXV-winglet-e190.jpg`; both faces:
  `commons-PH-EXF_AIRCRAFT_Embraer_E190STD_-1a.jpg`, the right winglet's outer face and the left winglet's inner face). The end of the tail cone is bare metal.
- **777** (200ER and 300ER). The title block fills the space between door 1 and door 2 with about 0.6 m to each door.
  "KLM" is larger against "Royal Dutch Airlines" than on the 737 (the second word is 1.4 times the length of "KLM";
  on the 737 it is 1.8 times). The engine logo is on the forward half of the fan cowl, on the centreline, its centre
  about 2.0 m aft of the lip, on the outboard and the inboard face
  (`commons-_SGP-Singapore_KLM_Boeing_777-300ER_PH-BVW_WSSS_2026-01-01.jpg`).
- **787** (-9 and -10). The title block is between door 1 and door 2, with about 1.9 m to door 1 and 1.7 m to door 2.
  On PH-BHE (repainted in 2025) "Royal Dutch Airlines" is in a lighter weight (regular or medium) than the bold of
  the 737 and the 777. The engine logo is on the centreline, its centre about 2.3 m aft of the lip. The chevron
  exhaust is bare metal.

### 4.2a Airbus A330-300 (measured 2026-10-14 on `commons-PH-AKA_A300-300_KLM_Miami_02-19-26_55146372991_.jpg`)

PH-AKA, left, true side-on (1920 px; the fuselage is 63.7 m = 1792 px, 28.15 px/m, the nose tip at x 38). Cross-checked
on PH-AKF (right side). The first draft painted the A330 with the 777's numbers: its title started 0.9 m too far
forward and the fin logo sat too low.

| Element | Value |
|---|---|
| Doors (centres) | d 6.04 and 18.3 (the model: 5.79 and 17.56) |
| Title | "KLM" d 7.96 – 10.55 (2.6 m wide, cap height 0.6 m), 1.9 m aft of door 1's centre; "Royal Dutch Airlines" d 10.8 – 15.35 (4.55 m, 1.75 times "KLM": the 737's proportion, not the 777's); baseline 0.36 m above the window row |
| Dark line | 0.2 m wide; its centre below the window row: d 2.6–4.7: 2.1 m, 6.8: 1.97, 9.0: 1.76, 11.1: 1.51, 13.2: 1.26, 15.3: 0.98, 17.5: 0.82, 19.6: 0.73, then level at 0.66 m (d 21.7 to 49.4), 53.7: 0.52, 55.8: 0.43 (pixel scan) |
| Fin logo | centre at 0.56 of the chord, 0.72 of the chord wide, its foot 0.26 up the fin |
| Engine logo | as the 777's (1.0 m wide, 2.0 m aft of the lip) |
| Winglet | white, the logo small (0.36 of the box) and at its middle |

The design has its own `A330` layout (model metres, window-row based) for `a33…` models. A second landmark (door 2 or
the wing root) is used only if the model has it within 1.2 m of where the photo puts it: the A330-200's door 2 is 3.4 m
nearer, and stretching the title to it would shrink the title.

### 4.3 Left and right

- The colour fields are the same on both sides: the same line, the same white fin, the same engines.
- **Title:** it reads correctly on both sides and covers the **same span of the fuselage**. On the left "KLM" is at
  the forward end and the second word runs aft. On the right "KLM" is at the aft end and the second word runs towards
  the nose. Checked on the 737 by counting windows: the block covers windows 2 to 13 aft of door 1 on the left
  (`crop-PH-BXB-forward-left.jpg`) and on the right (`crop-PH-BXI-forward-right.jpg`). This is what the kit does with
  a text or an image by default. Do not set `mirror`.
- **Fin logo:** it reads correctly on both faces and sits towards the trailing edge on both
  (`crop-PH-BXB-tail-left.jpg`, `crop-PH-BXI-tail-right.jpg`). The same: the kit's default.
- **Engines and winglets:** the logo reads correctly on each face.
- Door 1 on the right of the 737 is a little narrower than on the left (`crop-PH-BXI-forward-right.jpg`). This matters
  only if the design draws door outlines.

---

## 5. Side-elevation drawing steps

For each model, take d and h from the type's column or list in section 4 and scale them to the model
(d by the model's fuselage length, h by its fuselage height), as `frame()` does in `liveries/WZZ/design.ts`.

### Left side

1. **Fill** the whole elevation light blue #00A1DE: the fuselage from the nose to the end of the tail cone.
2. **White below the line:** fill everything below the line's centre curve white #F4F5F7, from the radome joint to the
   tail. Let it run below the keel.
3. **The line:** stroke the centre curve in dark blue #0B3A7A, 0.15 m wide on the 737 (0.04 of the fuselage height on
   every type). At the nose, take it down to the nose's lower outline and forward along it to just under the tip.
4. **Fin:** fill the fin (and the dorsal fillet, if the model's fin outline holds it) white #F4F5F7.
5. **Fin logo:** `logo.svg`, its centre at about 0.57 of the chord and 0.40 of the fin's height, 3.23 m wide on the
   737 (0.72 of the chord at that height on every type).
6. **Title:** `logo-white.svg` stretched to the "KLM" box (737: d 6.47 – 8.60, h 2.73 – 3.68 with the crown). Then
   the second word in white Source Sans 3: "Royal Dutch Airlines" in Bold, from d 8.85 to d 12.71 on the baseline
   h 2.73, or "Cityhopper" in Regular for the callsign KLC.
7. **Tail-cone end:** dark metal #55585C on the last 0.3 m.
8. Skip the registration, the flags, the names and the alliance marks. Door outlines, if drawn: thin white lines on
   the blue, thin grey lines on the white.

### Right side

The same calls. The kit flips the title and the fin logo so that they read correctly over the same span.

### Flat colours

Wings, tailplane, pylons, flap-track fairings: light grey #A9B1B7.

### Engine artwork (each engine, both faces)

White #F4F5F7. A bare-metal ring #B9BCBF at the inlet (about 0.1 m on the 737, wider on the 787). `logo.svg` on the fan
cowl: 0.97 m wide on the 737, its centre 1.55 m aft of the lip and 0.15 m above the centreline. Dark metal #55585C aft
of the cowl.

### Wingtip artwork (737-800, Embraer 190)

White #F4F5F7 on both faces, wing grey on the blend at the foot. `logo.svg` on both faces: about 0.7 m wide on the
737, at 45 % of the blade's height, towards the trailing edge.

---

## 6. Logos and fonts

| Graphic | Commons file | Licence | In `liveries/KLM/` | Use |
|---|---|---|---|---|
| **The KLM logo** (the crown: four discs, a bar and a cross, over the letters KLM) | https://commons.wikimedia.org/wiki/File:KLM_logo.svg | **PD-textlogo** and `{{Trademarked}}` (read on the file page on 2026-10-13). Designed by F.H.K. Henrion in 1961, changed by Chris Ludlow in 1991, according to the page. | `logo.svg`, unchanged (350 × 203.53, two paths, fill #00A1E4) | The fin, the engines, the winglets |
| The same in white | the same file | the same | `logo-white.svg`: the fill changed to #FFFFFF, nothing else | The crown and "KLM" of the fuselage title |
| "Royal Dutch Airlines", "Cityhopper" | none. Commons has no free file of the full title. | | typeset | Source Sans 3 (below) |
| A second vector of the same logo | https://commons.wikimedia.org/wiki/File:KLM_Royal_Dutch_Logo_Skyteam_2011.svg | PD-textlogo | not used | The same crown and letters in #169DD9 |
| The crown alone | https://commons.wikimedia.org/wiki/File:KLM_crown_logo.svg | CC BY-SA 3.0 | not used | Not needed: `logo.svg` holds the crown |
| SkyTeam roundel, "AIRFRANCE KLM" | not looked for | | none | Leave out |

The logo file matches the aircraft: on the fin the crown is 0.49 of the width of "KLM" (0.487 in the file).

**Fonts.** KLM's title typeface is its own (I believe it is called Noa; not verified). It is not free. The nearest
open font I chose by eye is **Source Sans 3** (Adobe, SIL Open Font License 1.1): a humanist sans-serif with the same
double-storey "a", straight-tailed "y" and slanted cut on the "t". I did not render the two side by side.

| File | Use | Source | Licence |
|---|---|---|---|
| `SourceSans3-Bold.woff2` | "Royal Dutch Airlines" | https://github.com/adobe-fonts/source-sans (release branch, `WOFF2/TTF/SourceSans3-Bold.ttf.woff2`) | SIL OFL 1.1 |
| `SourceSans3-Regular.woff2` | "Cityhopper" | the same, `SourceSans3-Regular.ttf.woff2` | SIL OFL 1.1 |
| `SourceSans3-OFL.txt` | the licence text | the same, `LICENSE.md` | SIL OFL 1.1 |

All five files are in `sources.json`.

---

## 7. Differences from the app's present `liveries.json` entry

`"KLM": { "base": "#00a1de", "belly": "#f7f7f7", "fin": "#00a1de", "engine": "#d0d5da", "title": true, "finLogo": true }`,
with KLC aliased to KLM:

- The fin is white with a blue logo, not blue.
- The engines are white with a blue logo, not grey.
- The blue and the white are divided by the dark line that dips under the nose, not by a straight belly edge.
- The title has a second word, and KLC needs "Cityhopper".

---

## 8. Confidence and open questions

- **High:** the scheme and its parts on all four types; the white fin and its logo; the white engines and winglets
  with the logo on both faces; the title's text and its reading on each side; the hue of the light blue.
- **737-800 positions:** ±0.1 m in d and ±0.05 m in h on the left side (one true side-on photo, checked against four
  model landmarks). The right side was checked for symmetry by window count, not measured in metres.
- **777 and 787 positions:** ±0.3 m in d, ±0.1 m in h (one side-on photo each, right side). The left side is assumed to
  be the mirror image; `commons-AMS_PH-BVN.jpg` and the PH-BHF photo agree by eye.
- **Embraer 190 positions:** ±0.3 m. Both photos are oblique. Its title sizes are estimates.
- **Fin logo on the 777, 787 and Embraer:** the width is measured. The place on the fin is given as fractions read
  from the photos, not scanned against the fin's outline.
- **Open:**
  1. The dark blue's exact value (#0B3A7A from the photos, #003E73 on norebbo.com).
  2. Whether the lower colour is white or a very light grey.
  3. The name and the weights of KLM's typeface, and how close Source Sans 3 is. On the repainted 787 the second word
     looks lighter than bold.
  4. How many 787s still have the first nose, and which 787-9s fly without the crown. The app paints all of them
     standard.
  5. The grey of the wings and the metal colours are estimates.
  6. The Airbus A321neo and Embraer 195-E2 were not measured (the A330-300 was, on 2026-10-14; the A330-200 takes its layout). The tracked A321neo and E195-E2 show the same
     scheme in their thumbnails.
  7. No stored photo shows the inboard face of a 787 engine. It is assumed to carry the logo as on the 737, the 777
     and the Embraer.

Sources: Wikimedia Commons (the files above and the categories "Current Boeing 737-800 of KLM", "Current Boeing
777-300ER of KLM", "Current Boeing 787-9 of KLM", "Current Boeing 787-10 of KLM", "Current Embraer 190 of KLM
cityhopper", "Boeing 777 of KLM at Amsterdam Airport Schiphol", "KLM logos"); planespotters.net public API;
[norebbo.com, "The new KLM livery"](https://www.norebbo.com/?p=6121) (colour values of its drawings; the 2014 date);
[aviacionline.com, "KLM introduces light blue radome for Boeing 787 fleet" (2025-01-12)](https://aviacionline.com/klm-introduces-light-blue-radome-for-boeing-787-fleet);
[JetPhotos photo 11697471](https://www.jetphotos.com/photo/11697471) (caption on PH-BHI, from a search result, not
opened); [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans); the `client/scene/liveries.json` KLM
entry; the `public/models/b738/model.json` profile.

---

## 9. Changes after rendering and comparing (2026-10-14, four rounds on b738, b789, b772, a333)

- The metal end piece of the tail cone covered the whole height behind the cone's tip, so on the 737 (whose fin reaches
  aft of the cone) it painted the fin's trailing edge dark grey. It is now limited to the cone's own height and is 0.25 m long.
- The A330-300 has its own layout (4.2a).
- The dark line: 0.165 m wide on the 737 (was 0.15) and #0D3C84 (was #0B3A7A): the line in the photos is thicker and bluer
  than the first draft rendered.
- The 787's "Royal Dutch Airlines" is Bold like the others (the Regular weight rendered too thin to read; the 2025 repaint's
  lighter weight is only slightly lighter in the photos).
- The winglet logo is 0.36 of the winglet's chord (it filled the winglet in the first render; the photos show about 0.65 of the blade's width at that height).
- A second landmark (door 2, the wing root) counts only within 1.2 m of its expected place.

Still different from the photos: the model's window row starts two windows ahead of the real one on the 737 (the window
rows are the model's, not the paint's); the registration, flags, names and alliance marks are not painted (skipped on purpose).
