# American Airlines (AAL): livery dossier, the 2013 scheme

Research date: 2026-10-13. Refs folder: `data/livery-refs/AAL/` (git-ignored; the photos stay there). File names
in this document are relative to that folder. The full-size originals that I measured are in `scratch/orig/`.
I looked at every listed photo. Positions and colours come from pixel scans of the full-size originals, not from
the eye. The design is `design.ts`; section 9 says how its renders compare with the photos.

Coordinate convention (the same as the other dossiers; side elevation, the same for both sides):

- **z** = metres aft of the nose tip.
- **h** = metres above the keel of the constant-section fuselage.
- Sizes are **as seen side-on** (the kit paints a side projection). Where the skin curves away, the size along the
  skin is larger; I give it where it matters.

Scale sources (source pixels of the originals):

| Type | Photo | Nose tip x | Tail x | Scale | Keel y / crown y | Check |
|---|---|---|---|---|---|---|
| A321neo, left | `commons-N407AN_55104865507_.jpg` (level, long lens) | 141 | 3903 (APU cone) | 84.5 px/m (44.51 m) | 1547 / 1197 | rear door at z 36.0–36.95; fin tip corners at z 42.0 / 43.9, as in the Wizz Air dossier |
| A321neo, left | `commons-American_Airbus_A321neo_N434AN_…` (in flight, sun) | 405 | 7135 | 151.2 px/m | (seen from below: no h from this photo) | window pitch 81 px = 0.535 m |
| A321neo, right | `commons-N426AN_55077416491_.jpg` | 3910 | not seen | 82.7 px/m (from the title's length) | 1627 / 1300 | door 1 is 83 px = 1.0 m wide |
| 737-800, left | `commons-N200NV_BOS_2023-07-28.jpg` (level) | 619 | 4435 (cone), 4542 (stabiliser tip) | 100 px/m (38.0 m fuselage, 39.47 m overall) | 1357 / 956 | two windows 99 px apart = 2 × 0.508 m |
| 737-800, right | `commons-Boeing_737-823_WL_N955AN_…` | 5297 | not measured | 113 px/m (from the title's length) | - | read from a gridded enlargement, ±0.15 m |
| 777-300ER, left | `commons-American_Airlines_N718AN_…` (panning shot) | 290 | 5860 | 75 px/m (73.86 m) | 2463 / 2003 | fuselage 460 px = 6.13 m (6.20 expected) |
| 787-9, left | `commons-American_Airlines-_Boeing_787-9_Dreamliner_-_N826AN_…` | 317 | 3512 | 50.9 px/m (62.81 m) | 1334 / 1032 | - |
| 787-9, right | `commons-American_Airlines_Boeing_787-9_N833AA_…` | 4955 | not measured | 67.4 px/m (from the title's length) | - | read from a gridded enlargement |

The two A321neo left photos disagree by 0.4 m in absolute z (N434AN puts everything 0.4 m further aft). Positions
relative to door 1 agree to 0.1 m. I use the level photo (N407AN) for absolute values. Anchor the design on the
model's door 1, window row and fin, not on absolute z.

---

## 1. Identity

**Scheme:** the livery that American Airlines introduced on 17 January 2013 with its new logo (Wikipedia,
"American Airlines", section "Aircraft livery"; the design is by FutureBrand). It replaced the polished bare-metal
scheme with the red, white and blue cheatline and the "AA" eagle on the fin. Every 2021–2026 photo of a standard
aircraft in the refs folder shows it unchanged. The parts:

- the whole fuselage, radome and engines in one **silver-grey mica paint** (all round: crown, sides, belly). No
  cheatline, no belly colour, no nose band;
- a large dark slate **"American"** title on the forward fuselage, centred on the window row, with the
  **flight symbol** (a red blade below, a blue blade above, a light grey "eagle's head" between) at its nose end;
- the **flag fin**: horizontal red and white rows over the aft half of the fin, blue rows with thin white lines
  over the forward half, and the same rows carried on as two red and two white bands across the rear fuselage.
  The flag's front edge on the fuselage is the fin's leading-edge line continued straight down;
- plain engines and plain wingtip devices (737-800: the flight symbol on the inner face of the winglets).

**Types that wear it:** all of them. Photos in the refs folder: A321-200 (5), A321neo (20), 737-800 (15),
777-200ER (3), 777-300ER (3), 787-8 (2), 787-9 (4). The layout is the same on every type; the sizes follow the
fuselage (section 4).

**The eight tracked airframes** (the planespotters photo of each, viewed; the API gives no date):

| Hex | Registration | Type | Scheme | Evidence |
|---|---|---|---|---|
| a009a4 | N101NN | A321-231 (Sharklets) | standard 2013 | `ps-a009a4-1696926.jpg` |
| a01112 | N103NN | A321-231 (Sharklets) | standard 2013 | `ps-a01112-1710306.jpg` |
| a01880 | N105NN | A321-231 (Sharklets) | standard 2013 | `ps-a01880-1789927.jpg` (night) |
| a03765 | N113AN | A321-231 (Sharklets) | standard 2013 | `ps-a03765-1571040.jpg` |
| aaf1f2 | N804NN | 737-823 (winglets) | standard 2013 | `ps-aaf1f2-1953103.jpg` |
| ac7b8a | N903NN | 737-823 (winglets) | standard 2013 | `ps-ac7b8a-1888562.jpg` |
| ab5993 | N830NN | 737-823 (winglets) | standard 2013 | `ps-ab5993-1654703.jpg` |
| adaee8 | N981AN | 737-823 (winglets) | standard 2013 | `ps-adaee8-1756320.jpg` |

**Not this scheme (removed from `refs.json`, files moved to `unused/`):**

- **N916NN, "Reno Air" heritage livery** (737-800, Commons photo of September 2023): a green cheatline and a
  teal fin with mountains. A special. American flies more heritage aircraft (I saw the title "N735AT … (retro
  livery)" for a 777-300ER in the Commons listing and did not open it). None of the eight tracked airframes is one.
  There is no free artwork for them: paint such an aircraft in the standard scheme.
- Seven Commons photos of 2009–2012 in the **old polished-metal scheme** ("AA" fin, red/white/blue cheatline,
  "AA.com" winglets), and one flight-deck photo.

---

## 2. Reference images

53 entries in `refs.json`: 8 planespotters.net API thumbnails (reference only), 40 Wikimedia Commons photos
(1920 px copies; licence, author and date from the Commons API) and 5 crops of those (`crop-…`, for the engine,
wingtip and tail views). The full-size Commons files of 15 photos are also there (`scratch/orig/`).

| File | View | Registration | Type | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|---|
| `ps-a009a4-1696926.jpg` | left side (A321-200, climbing) | N101NN | A321-200 | https://www.planespotters.net/photo/1696926/n101nn-american-airlines-airbus-a321-231-wl | Valentin Römer | reference only | unknown |
| `ps-a01112-1710306.jpg` | left side (A321-200, on approach) | N103NN | A321-200 | https://www.planespotters.net/photo/1710306/n103nn-american-airlines-airbus-a321-231-wl | Chris Pitchacaren | reference only | unknown |
| `ps-a01880-1789927.jpg` | right side (A321-200, on the ground at night: not for colour) | N105NN | A321-200 | https://www.planespotters.net/photo/1789927/n105nn-american-airlines-airbus-a321-231-wl | KirkXWB | reference only | unknown |
| `ps-a03765-1571040.jpg` | left side (A321-200, on approach) | N113AN | A321-200 | https://www.planespotters.net/photo/1571040/n113an-american-airlines-airbus-a321-231-wl | Demo Borstell | reference only | unknown |
| `ps-aaf1f2-1953103.jpg` | left side (737-800, on approach) | N804NN | 737-800 | https://www.planespotters.net/photo/1953103/n804nn-american-airlines-boeing-737-823-wl | Marvin Knitl | reference only | unknown |
| `ps-ac7b8a-1888562.jpg` | right side (737-800, landing) | N903NN | 737-800 | https://www.planespotters.net/photo/1888562/n903nn-american-airlines-boeing-737-823-wl | Oleg Zharikov | reference only | unknown |
| `ps-ab5993-1654703.jpg` | right side (737-800, taxiing) | N830NN | 737-800 | https://www.planespotters.net/photo/1654703/n830nn-american-airlines-boeing-737-823-wl | Jacob Reppert | reference only | unknown |
| `ps-adaee8-1756320.jpg` | right side (737-800, on approach) | N981AN | 737-800 | https://www.planespotters.net/photo/1756320/n981an-american-airlines-boeing-737-823-wl | Wolfgang Kaiser | reference only | unknown |
| `commons-N449AN.jpg` | left side (A321neo, in flight) | N449AN | A321neo | https://commons.wikimedia.org/wiki/File:N449AN.jpg | Liam Thompson | CC BY-SA 4.0 | 2026-05-02 |
| `commons-N407AN_55104865507_.jpg` | left side (A321neo, taxiing, level, overcast: the measurement master) | N407AN | A321neo | https://commons.wikimedia.org/wiki/File:N407AN_(55104865507).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-02-16 |
| `commons-N406AN_55106126130_.jpg` | left side (A321neo, taxiing) | N406AN | A321neo | https://commons.wikimedia.org/wiki/File:N406AN_(55106126130).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-02-16 |
| `commons-American_Airbus_A321neo_N434AN_on_final_approach_to_Boston_December_2025.jpg` | left side (A321neo, on approach, sunlit: the colour master) | N434AN | A321neo | https://commons.wikimedia.org/wiki/File:American_Airbus_A321neo_N434AN_on_final_approach_to_Boston_December_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-12-31 |
| `commons-Airbus_A321-253NX_N412UW_cn_9224_3-11-2024_.jpg` | right side (A321neo, taxiing, low warm sun) | N412UW | A321neo | https://commons.wikimedia.org/wiki/File:Airbus_A321-253NX_(N412UW,_cn_9224)_(3-11-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-11 |
| `commons-N426AN_55077416491_.jpg` | right side (A321neo, taxiing, sun: the right-side master) | N426AN | A321neo | https://commons.wikimedia.org/wiki/File:N426AN_(55077416491).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-01-25 |
| `commons-N457AM_55037653692_.jpg` | right side (A321neo, taxiing) | N457AM | A321neo | https://commons.wikimedia.org/wiki/File:N457AM_(55037653692).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-01-10 |
| `commons-N454AL_BOS_2024-03-14.jpg` | right side (A321neo, taxiing) | N454AL | A321neo | https://commons.wikimedia.org/wiki/File:N454AL_@_BOS,_2024-03-14.jpg | Tim | CC0 | 2024-03-14 |
| `commons-N418AN_DFW_2024-10-25.jpg` | right side (A321neo, on approach) | N418AN | A321neo | https://commons.wikimedia.org/wiki/File:N418AN_@_DFW,_2024-10-25.jpg | Greg Gayden | CC BY-SA 2.0 | 2024-10-25 |
| `commons-N420AN_SFO_2023-03-09.jpg` | 3/4 front left (A321neo, taxiing) | N420AN | A321neo | https://commons.wikimedia.org/wiki/File:N420AN_@_SFO,_2023-03-09.jpg | Steve Knight | CC BY 2.0 | 2023-03-09 |
| `commons-N430AN_LAS_2024-01-08.jpg` | 3/4 front left (A321neo, on approach) | N430AN | A321neo | https://commons.wikimedia.org/wiki/File:N430AN_@_LAS,_2024-01-08.jpg | Tomás Del Coro | CC BY-SA 2.0 | 2024-01-08 |
| `commons-N408AN_DCA_2022-04-15.jpg` | right side (A321neo, on approach, sunlit) | N408AN | A321neo | https://commons.wikimedia.org/wiki/File:N408AN_@_DCA,_2022-04-15.jpg | Mogami Kariya | CC BY-SA 2.0 | 2022-04-15 |
| `commons-American_Airbus_A321neo_N453AA_departing_Boston_August_2025.jpg` | below (A321neo, right side and belly, climbing) | N453AA | A321neo | https://commons.wikimedia.org/wiki/File:American_Airbus_A321neo_N453AA_departing_Boston_August_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-08-23 |
| `commons-Airbus_A321-253N_N958XV_cn_8819_2-12-2026_.jpg` | below (A321neo, belly, climbing away) | N958XV | A321neo | https://commons.wikimedia.org/wiki/File:Airbus_A321-253N_(N958XV,_cn_8819)_(2-12-2026).jpg | ZLEA | CC BY-SA 4.0 | 2026-02-12 |
| `commons-AA_A321neo_at_Chicago_O_Hare_gate_K16_June_2025.jpg` | 3/4 front left (A321neo at the gate, seen from ahead) | - | A321neo | https://commons.wikimedia.org/wiki/File:AA_A321neo_at_Chicago_O%27Hare_gate_K16_June_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-06-10 |
| `commons-N449AN_-_MIA.jpg` | winglet (inner face of an Airbus Sharklet from the cabin: plain; N449AN left side beyond) | N449AN | A321neo | https://commons.wikimedia.org/wiki/File:N449AN_-_MIA.jpg | Cuban Boy | CC BY 4.0 | 2024-06-13 |
| `commons-N409AA_BOS_2022-06-09.jpg` | below (A321neo, 3/4 rear right from below) | N409AA | A321neo | https://commons.wikimedia.org/wiki/File:N409AA_@_BOS,_2022-06-09.jpg | Tim | CC0 | 2022-06-09 |
| `commons-N537UW_American_Airlines_Airbus_A321.jpg` | 3/4 front left (A321-200, on approach) | N537UW | A321 | https://commons.wikimedia.org/wiki/File:N537UW_American_Airlines_Airbus_A321.jpg | Tomás Del Coro | CC BY-SA 2.0 | 2021-04-30 |
| `commons-Airbus_A321_wingtip_fence.jpg` | winglet (wingtip fence of an A321-200 without Sharklets: plain) | - | A321 | https://commons.wikimedia.org/wiki/File:Airbus_A321_wingtip_fence.jpg | 4300streetcar | CC BY 4.0 | 2025-06-09 |
| `commons-American_Boeing_737-800_N923NN_DCA_VA1.jpg` | right side (737-800, on approach) | N923NN | 737-800 | https://commons.wikimedia.org/wiki/File:American_Boeing_737-800_N923NN_DCA_VA1.jpg | Acroterion | CC BY-SA 4.0 | 2024-07-31 |
| `commons-Boeing_737-823_WL_N955AN_msn_29540_ln_762_3-11-2024_.jpg` | right side (737-800, taxiing, low warm sun: the 737 right-side master) | N955AN | 737-800 | https://commons.wikimedia.org/wiki/File:Boeing_737-823(WL)_(N955AN,_msn_29540,_ln_762)_(3-11-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-11 |
| `commons-N200NV_BOS_2023-07-28.jpg` | left side (737-800, taxiing, level: the 737 left-side master) | N200NV | 737-800 | https://commons.wikimedia.org/wiki/File:N200NV_@_BOS,_2023-07-28.jpg | Steve Knight | CC BY 2.0 | 2023-07-28 |
| `commons-American_Boeing_737-800_N965AN_BWI_MD2.jpg` | left side (737-800, in flight) | N965AN | 737-800 | https://commons.wikimedia.org/wiki/File:American_Boeing_737-800_N965AN_BWI_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2025-11-04 |
| `commons-N968NN_55170853645_.jpg` | left side (737-800, in flight, low angle) | N968NN | 737-800 | https://commons.wikimedia.org/wiki/File:N968NN_(55170853645).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-03-13 |
| `commons-N943NN_LAX_2023-09-25.jpg` | 3/4 rear left (737-800 at the gate) | N943NN | 737-800 | https://commons.wikimedia.org/wiki/File:N943NN_@_LAX,_2023-09-25.jpg | Ian Gratton | CC BY 2.0 | 2023-09-25 |
| `commons-American_737-800_N959AN_taking_off_from_Boston_Dec_2024_1.jpg` | below (737-800, right side and belly, climbing) | N959AN | 737-800 | https://commons.wikimedia.org/wiki/File:American_737-800_N959AN_taking_off_from_Boston_Dec_2024_1.jpg | 4300streetcar | CC BY 4.0 | 2024-12-27 |
| `commons-Boeing_737-823_WL_N885NN_American_Airlines.jpg` | 3/4 front left (737-800, on approach) | N885NN | 737-800 | https://commons.wikimedia.org/wiki/File:Boeing_737-823(WL)_N885NN_American_Airlines.jpg | William Musculus | CC BY-SA 4.0 | 2023-12-18 |
| `commons-N814NN_B737-800_American_Airlines_MIA_December_2016_01_.jpg` | tail (737-800, right side of the fin, sunlit close-up) | N814NN | 737-800 | https://commons.wikimedia.org/wiki/File:N814NN_B737-800_American_Airlines_@_MIA,_December_2016_(01).jpg | JTOcchialini | CC BY-SA 2.0 | 2016-12-01 |
| `commons-American_Airlines_N718AN_Boeing_777-323_ER_Sydney_Kingsford_Smith_International_.jpg` | left side (777-300ER, landing) | N718AN | 777-300ER | https://commons.wikimedia.org/wiki/File:American_Airlines_N718AN_Boeing_777-323(ER)_Sydney_Kingsford_Smith_International_Airport_(SYD_YSSY)_(52576478367).jpg | Mitchul Hope | CC BY-SA 2.0 | 2022-12-21 |
| `commons-20250313_Boeing_777-323ER_of_American_Airlines_N729AN_taking_off_at_SYD.jpg` | right side (777-300ER, rotating) | N729AN | 777-300ER | https://commons.wikimedia.org/wiki/File:20250313_Boeing_777-323ER_of_American_Airlines_(N729AN)_taking_off_at_SYD.jpg | Windmemories | CC BY-SA 4.0 | 2025-03-13 |
| `commons-N762AN_777_American_MAD_01.jpg` | right side (777-200ER, taxiing) | N762AN | 777-200ER | https://commons.wikimedia.org/wiki/File:N762AN_777_American_MAD_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2024-01-05 |
| `commons-N725AN_55170461221_.jpg` | left side (777-300ER, taxiing) | N725AN | 777-300ER | https://commons.wikimedia.org/wiki/File:N725AN_(55170461221).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-03-13 |
| `commons-N787AL_777_American_tailfin_SCQ.jpg` | tail (777-200ER, right side of the fin) | N787AL | 777-200ER | https://commons.wikimedia.org/wiki/File:N787AL_777_American_tailfin_SCQ.jpg | Bene Riobó | CC BY-SA 4.0 | 2017-04-13 |
| `commons-N772AN_Boeing_772_American_Tail_13894646985_.jpg` | tail (777-200ER, right side of the fin, from below) | N772AN | 777-200ER | https://commons.wikimedia.org/wiki/File:N772AN_Boeing_772_American_Tail_(13894646985).jpg | Aeroprints.com | CC BY-SA 3.0 | 2014-04-14 |
| `commons-American_Airlines_N802AN_B787.jpg` | left side (787-8, taxiing, overcast) | N802AN | 787-8 | https://commons.wikimedia.org/wiki/File:American_Airlines_N802AN_B787.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-09-26 |
| `commons-American_Airlines-_Boeing_787-9_Dreamliner_-_N826AN_54904350522_.jpg` | left side (787-9, taxiing, sun) | N826AN | 787-9 | https://commons.wikimedia.org/wiki/File:American_Airlines-_Boeing_787-9_Dreamliner_-_N826AN_(54904350522).jpg | Umedha Hettigoda | CC BY-SA 4.0 | 2025-11-04 |
| `commons-American_Airlines_Boeing_787-9_N833AA_LHR_April_2025.jpg` | right side (787-9, taxiing, sun) | N833AA | 787-9 | https://commons.wikimedia.org/wiki/File:American_Airlines_Boeing_787-9_(N833AA)_@_LHR,_April_2025.jpg | kitmasterbloke | CC BY 2.0 | 2025-04-13 |
| `commons-Boeing_787-8_Dreamliner_N872AN_msn_65992_ln_1025_3-11-2024_.jpg` | right side (787-8, taxiing, low sun) | N872AN | 787-8 | https://commons.wikimedia.org/wiki/File:Boeing_787-8_Dreamliner_(N872AN,_msn_65992,_ln_1025)_(3-11-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-11 |
| `commons-Tailfin_AA_B787-9_N836AA_.jpg` | tail (787-9, right side of the fin, low sun) | N836AA | 787-9 | https://commons.wikimedia.org/wiki/File:Tailfin_AA_B787-9_(N836AA).jpg | Radomianin | CC BY-SA 4.0 | see the Commons page |
| `commons-American_Airlines_Boeing_787-9_N827AN_LHR_July_2024_01_.jpg` | 3/4 front right (787-9 at the gate) | N827AN | 787-9 | https://commons.wikimedia.org/wiki/File:American_Airlines_Boeing_787-9_(N827AN)_@_LHR,_July_2024_(01).jpg | Mike Peel. | CC BY-SA 4.0 | 2024-07-21 |
| `crop-N434AN-engine.jpg` | engine (A321neo, left engine outboard face, sunlit; the right engine behind) | N434AN | A321neo | https://commons.wikimedia.org/wiki/File:American_Airbus_A321neo_N434AN_on_final_approach_to_Boston_December_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-12-31 |
| `crop-N434AN-sharklet-outer.jpg` | winglet (A321neo, outer face of the left Sharklet, sunlit: plain) | N434AN | A321neo | https://commons.wikimedia.org/wiki/File:American_Airbus_A321neo_N434AN_on_final_approach_to_Boston_December_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-12-31 |
| `crop-N407AN-tail.jpg` | tail (A321neo, left side, level: the fin measurement master) | N407AN | A321neo | https://commons.wikimedia.org/wiki/File:N407AN_(55104865507).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-02-16 |
| `crop-N965AN-winglet-inner.jpg` | winglet (737-800, inner face of the right winglet with the flight symbol, from below) | N965AN | 737-800 | https://commons.wikimedia.org/wiki/File:American_Boeing_737-800_N965AN_BWI_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2025-11-04 |
| `crop-N200NV-winglet-outer.jpg` | winglet (737-800, outer face of the left winglet: plain) | N200NV | 737-800 | https://commons.wikimedia.org/wiki/File:N200NV_@_BOS,_2023-07-28.jpg | Steve Knight | CC BY 2.0 | 2023-07-28 |

Most useful: `commons-N407AN_55104865507_.jpg` (A321neo left, level: the measurement master),
`commons-American_Airbus_A321neo_N434AN_…` (A321neo left in sun: the colour master, every flag band sampled),
`commons-N426AN_55077416491_.jpg` (A321neo right), `commons-N200NV_BOS_2023-07-28.jpg` (737-800 left),
`commons-N814NN_…` (737 fin close-up in sun), `crop-N965AN-winglet-inner.jpg` (the 737 winglet symbol).

---

## 3. Colours

No paint specification was found. Third-party brand pages (unofficial) give red **#C30019**, blue **#0078D2**,
slate **#36495A** (brandcolorcode.com) and #DE1B23, #13AFEB, #45596A, grey #A5B5BE (brandpalettes.com). The
Commons wordmark file is filled **#334357**. The photo samples are medians of pixel classes or of boxes on sunlit,
flat areas. "Sun" = `N434AN` (clear sun, neutral), "low sun" = `N200NV` (warm), "overcast" = `N407AN`.

| Paint | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **Fuselage silver-grey mica** (fuselage, radome, tail cone, engines) | **#C1C4C8** | Sun: #B3B8C8 above the windows, #B9BAC1 below the title. Low sun: #C8CAC9 upper, #BEBAB4 lower. Overcast: #CCD2D9. `N426AN` sun: #C1C4C9. 787 `N833AA`: #BCBBBA. 777 `N718AN`: #CCCCC4. It is a light grey with a faint cool cast and a soft metallic sheen: darker than the fin's white (#E4E5EA in the same photo) by about a fifth, and a little darker than the fin's mid grey. | Medium-high. A flat colour cannot show the mica; in shade the lower fuselage goes much darker (#4A4845 overcast). |
| **Title slate** ("American") | **#44546A** | Wordmark file #334357 (hue 213°). Strokes in photos: sun #5E7188, `N426AN` #425364, overcast #404D5F–#576779, low sun #4D5156–#5C6069, 787 #48556E, 777 #45464E–#51525B. All blue-grey, hue 205–220°, lighter than the file's value (gloss and haze). | Medium-high. #334357 is the official alternative. |
| **Flag red, three tones** | bright **#EA3324**, mid **#D42628**, dark **#BD1F26** | Sun: #FA4439 / #E5313C / #CC2F3E. Low sun: #D8290F / #CC2116 / #BF1B12. `N814NN` sun (hard processing): #EB1700 / #C00600 / #A50500. Overcast: #C42E42. The bright tone is an orange-red, the dark one a crimson. | Medium-high for the three steps, medium for each hex. |
| **Flag white, three tones** | white **#E6E7EA**, light grey **#CFD2D7**, mid grey **#BFC3CB** | Sun: #E4E5EA / #CCD0D9 / #BEC5D3. Low sun: #DDDDDD / #CCCCCB / #C4C3C6. | Medium-high. |
| **Flag blue** (a weave of horizontal gradients) | bright **#2A8CCF**, mean **#2269A4**, navy **#1C3F6E** | Sun, 63 samples over the seven blue rows: brightest #2A8DCE–#35A4F1, darkest #1C3D69–#1D335A, the rest between (#216399–#2572AB). Low sun: #2578AB bright, #213657 navy. `N814NN`: #065E93 / #06204E. | Medium. The pattern is simplified (section 4). |
| **Symbol red** | **#C4283A**, darker toward the lower forward tip (#9E1B2A) | Sun #BD3B43 (#B33940–#C73E46); low sun #9D2C1C; `N426AN` #86131D; overcast #7F282B. | Medium. |
| **Symbol blue** | **#2F8FD0** at the top to **#1F6AA5** at the bottom | Sun #2983C3 (#2271AC–#329BDE); low sun #2578AD; `N426AN` #377EAD; overcast #4C89B6. | Medium. |
| **Symbol head** (the piece between the blades) | **#DFE2E5** to **#A9ADB3** | A light piece with a soft grey gradient, lighter than the fuselage at its aft end (`N200NV`, `N434AN` enlargements). Not sampled by number. | Low-medium. |
| **Engine nacelles** | **#C9CCD0** | The fuselage paint. Sun, side of the nacelle: #D8D9E0; low sun #CACAC8. They look a little lighter than the fuselage because they face the light. | Medium. |
| **Inlet lip** (bare metal) | **#D6D7D8** | A polished ring, bright with dark reflections (`crop-N434AN-engine.jpg`). | Medium (an estimate). |
| **Exhaust, core cowl, APU nozzle** | **#55585C** | Dark metal (`crop-N434AN-engine.jpg`, `crop-N407AN-tail.jpg`). | Medium (an estimate). |
| **Wings, tailplane, flap fairings, pylons** | **#B9BCC0** | The maker's light grey; samples are full of reflections. Not an airline colour. | Low-medium (an estimate). |
| **Wingtip devices** | **#D3D5D7** | Outer face of the 737 winglet #CACAC6 (low sun); A321neo Sharklet outer face light grey to white in sun. | Medium. |
| **Cockpit glass** | **#15181C** | Near black in every photo. | High. |

---

## 4. Elements (side elevation)

### 4.1 Fuselage

One colour, #C1C4C8, from the radome tip to the tail cone, all round. No cheatline, no belly line, no grey belly,
no nose band (`N453AA` and `N959AN` from below: the belly, the belly fairing and the gear doors are the same
silver; there is **no belly title**). Door outlines: thin and white where they cross the red bands and on most
aircraft elsewhere; `N200NV` has a dark grey outline on its rear door. The windows have no surround.

### 4.2 Flight symbol and title

Rules that hold on every type measured:

- The title is the 2013 wordmark "American" (capital A, lowercase "merican"), as in `title.svg`. Its length is
  6.3 to 6.5 times its cap height as seen side-on (6.0 in the flat file: the tops of the letters curve away).
- The title is **centred on the window row**: the windows run through the middle of the letters.
- The cap height seen side-on is about a third of the fuselage height (0.33–0.35).
- The symbol stands on the title's baseline and rises above the cap line. Its forward lower tip is the red blade.
  The blue blade is the upper, aft part. The symbol leans the same way on both sides: bottom forward, top aft.
- From the nose: door 1, then the symbol, then the title. The symbol is at the nose end of the title on **both**
  sides.

| Type (photo) | Door 1, z | Symbol box, z | Symbol box, h | Title, z | Baseline h / cap top h | Cap height | Window centre h |
|---|---|---|---|---|---|---|---|
| A321neo left (`N407AN`) | 4.3 – 5.3 (from the title; door-relative values from `N434AN`) | 5.67 – 7.49 (1.82 m) | 2.01 – 3.62 (1.61 m; 1.8 m along the skin) | 7.55 – 16.41 (8.86 m; 8.93 m on `N434AN`) | 2.02 / 3.37 | 1.35 m (1.47 m along the skin); x-height 1.05 m | 2.7 |
| A321neo right (`N426AN`) | same | same station, mirrored | same | 7.7 – 16.55 (0.15 m further aft) | 1.99 / 3.37 | 1.38 m | - |
| 737-800 left (`N200NV`) | 3.87 – 4.75 | 4.97 – 6.93 (1.96 m) | 1.54 – 3.45 (1.91 m) | 6.76 – 15.54 (8.78 m) | 1.64 / 3.03 | 1.39 m | 2.27 |
| 737-800 right (`N955AN`) | same | same station, mirrored | - | about 7.3 – 16.1 (0.5 m further aft) | - | - | - |
| 777-300ER left (`N718AN`) | 5.2 – 6.4 | 7.3 – 10.0 (2.7 m) | 2.65 – 5.47 (2.8 m) | 10.2 – 24.3 (14.1 m) | 2.64 / 4.8 | about 2.15 m | - |
| 787-9 left (`N826AN`) | 6.8 – 8.5 | 9.4 – 12.0 (2.6 m) | 2.53 – 5.17 (2.6 m) | 12.1 – 25.1 (13.0 m) | 2.55 / 4.62 | 2.06 m | - |
| 787-9 right (`N833AA`) | same | same station, mirrored | - | about 0.5 m further aft than on the left | - | - | - |

Door-relative positions (metres aft of door 1's aft edge), the robust numbers:

| | Symbol starts | Symbol ends | Title starts | Title ends |
|---|---|---|---|---|
| A321neo left (`N434AN`) | 0.38 | 2.17 | 2.30 | 11.23 |
| A321neo right (`N426AN`) | 0.34 | 2.09 | 2.47 | 11.33 |
| 737-800 left (`N200NV`) | 0.22 | 2.18 | 2.01 | 10.79 |
| 737-800 right (`N955AN`) | 0.21 | 2.22 | 2.58 | 11.38 |
| 787-9 left (`N826AN`) | 0.90 | 3.50 | 3.61 | 16.6 |
| 787-9 right (`N833AA`) | 0.82 | 3.81 | 4.14 | 17.1 |
| 777-300ER left (`N718AN`) | 0.85 | 3.6 | 3.8 | 17.9 |

**The symbol's parts** (A321neo left, `N407AN`; the other types scale with the box):

- **Red blade:** z 5.67 – 6.69, h 2.01 – 2.86. A slanted blade: a pointed tip at the lower forward corner on the
  baseline, a rounded upper aft corner. It covers one cabin window (the window shows through it).
- **Head:** a light grey curved piece on top of the red blade, h 2.86 – 3.11, z about 6.2 – 7.0, with a short
  point toward the nose (the beak).
- **Blue blade:** z 6.67 – 7.49, h 3.11 – 3.62. A slanted bar from the head up and aft to a point. On the left
  side its tip ends over the foot of the "A" (0.06 m before it on the A321neo, 0.17 m past it on the 737).
- On the 737 the measured box is squarer and bigger (1.96 × 1.91 m against 1.82 × 1.61 m). Part of that is the
  flatter fuselage side; I did not resolve the rest.
- A small blue disc sits between door 1 and the symbol at window height (seen on `N434AN`, `N200NV`, `N826AN`):
  probably the alliance roundel. Skip.

**Left / right:** on the left the order from the nose is symbol, "American" (the "A" next to the symbol). On the
right the text still reads left to right, so the "A" is at the aft end and the "n" is next to the symbol; the
symbol is mirrored so that it leans the same way. The right-side title sits 0.15 m (A321neo) to 0.5 m (737, 787)
further aft than the left one, because the straight "n" cannot tuck under the blue blade as the slanted "A" does.
The gap at the baseline between the red blade and the title is 0.86 m on the left and 1.12 m on the right
(A321neo).

**Doors in the title:** on the 777-300ER door 2 (z 15.3 – 16.6) cuts through "er"; on the 787-9 door 2
(z 20.4 – 21.8) cuts through "ca". The title is painted across the doors. On the 737-800 and A321neo the title
ends before the next door or exit.

**Skip:** the registration and fleet number (dark slate, below the windows ahead of the rearmost door, with a
small US flag), the type name near door 1 ("A321neo"), the nose-gear door codes.

### 4.3 The flag: fin and rear fuselage

The art is a stack of **twelve horizontal rows**, counted down from the fin tip. In the aft zone the rows are
red (odd) and white (even). Every row is three equal sub-bands of slightly different tone.

**Geometry (A321neo, `crop-N407AN-tail.jpg`):**

- **Front edge:** the fin's leading edge, and below the fin the same straight line carried on across the rear
  fuselage: **z = 33.30 + 0.865 · h** from the fin tip (z 42.0, h 10.06) down to the bottom of row 12
  (z 34.67, h 1.59). Checked at three points to 0.03 m. Ahead of the line the fuselage is silver.
- **Diagonal** (blue ahead, red and white behind): a straight line at **half the fin's chord**, from the tip
  (z 42.96, h 10.06; 51 % of the chord) to the bottom of row 7 (z 40.09, h 4.90; 49 %).
  z = 40.09 + 0.556 · (h − 4.90).
- **Trailing edge:** z 43.88 at the tip, z 42.6 at h 4.90. The art runs to the trailing edge and over the rudder.
- **Rows 1 – 7** (the fin beside the blue), **row 8** (white, the full chord, at the foot of the blue),
  **row 9** (red, the full chord, on the fin root and the fuselage crown), **row 10** (white), **row 11** (red,
  the band through the rearmost door), **row 12** (a light sliver under it).
- Rows 9 – 12 run aft from the front edge along the fuselage to the fin's trailing edge (row 9) or to the upswept
  underside of the tail (rows 10 – 12, to about z 41.9). The last 2 m of the tail cone are silver; the APU
  exhaust is dark metal.
- **Leading-edge strip:** a narrow white or bare strip, about 0.1 m, along the fin's leading edge.

Row boundaries, h in metres (top of each row; the last value is the bottom of row 12):

| Row | Colour (aft zone) | A321neo (`N407AN`) | 737-800 (`N200NV`) | 777-300ER (`N718AN`) | 787-9 (`N826AN`) |
|---|---|---|---|---|---|
| fin tip | | 10.06 | 11.58 | 15.1 | 14.46 |
| 1 | red | 10.06 | 11.58 | 15.1 | 14.46 |
| 2 | white | 9.49 | 10.89 | 14.1 | 13.50 |
| 3 | red | 8.73 | 10.05 | 12.9 | 12.34 |
| 4 | white | 7.96 | 9.20 | 11.7 | 11.20 |
| 5 | red | 7.18 | 8.35 | 10.45 | 10.04 |
| 6 | white | 6.41 | 7.50 | 9.3 | 8.90 |
| 7 | red | 5.66 | 6.65 | 8.05 | 7.74 |
| 8 | white, full chord | 4.90 | 5.80 | 6.85 | 6.60 |
| 9 | red, full chord | 4.08 | 4.95 | 5.7 | 5.5 |
| 10 | white | 3.42 | 4.07 | 4.5 | 4.4 |
| 11 | red | 2.70 | 3.09 | 3.25 | 3.1 |
| 12 | light | 2.04 | 2.20 | 2.05 | 1.9 |
| bottom | | 1.59 | 1.73 | 1.57 | 1.4 |
| row height on the fin | | 0.77 m (row 1: 0.57) | 0.85 m (row 1: 0.69) | 1.21 m (row 1: 1.0) | 1.15 m (row 1: 0.96) |
| crown h / fuselage height | | 4.14 | 4.01 | 6.20 | 5.94 |

On the A321neo the fuselage rows are a little lower than the fin rows (row 9: 0.66 m, row 10: 0.72, row 11: 0.66,
row 12: 0.45). On the 737 they are not (0.88, 0.98, 0.89, 0.47). The 777 and 787 values below row 8 are partly
hidden by the wing and the tailplane (±0.2 m). The 737 and 777 fin-tip heights may be 2–5 % out (scale).

Where the rows sit against landmarks:

- **Row 11 (the lower red band)** covers the rearmost door. Its lower forward tip is 0.9 m ahead of that door's
  forward edge on the A321neo (z 35.07; door 36.0 – 36.95), 0.9 – 1.3 m ahead on the 737 (door z 31.5 – 32.3) and
  0.7 m ahead on the 787-9. On the A321neo its top is at window-centre height (h 2.70) and its bottom at the
  title's baseline height (h 2.04). On the 737 the window row runs along its lower edge (h 2.27).
- **Row 9 (the upper red band)** sits on the fuselage crown and the fin root on the A321neo and the 737; on the
  777 and 787 it is wholly below the crown.
- **737-800 front edge:** through (z 32.35, h 4.57) and (z 30.61, h 2.67): z = 28.17 + 0.916 · h. It lies
  0.2 – 0.4 m ahead of the fin's leading-edge line (slope 0.79), which meets a dorsal fairing there.
- **777-300ER front edge:** the leading-edge line again: z = 54.3 + 1.03 · h, through (59.5, 5.1) and (57.1, 2.77).
  Rearmost door at z 57.6 – 58.9.
- **787-9 front edge:** parallel to the fin's leading edge and about 0.9 m aft of its straight extension (the fin
  has a curved fillet at its foot). Row 11's forward edge runs from the rearmost door's forward edge at the top
  to 0.7 m ahead of it at the bottom.

**Sub-band order** (top to bottom in each row; B = bright red, M = mid red, D = dark red; W = white, L = light
grey, G = mid grey). The same order on the A321neo (`N434AN`), the 737 left (`N200NV`) and the 737 right
(`N814NN`):

| Row | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Tones | M, M, B | L, W, G | M, D, B | L, G, W | D, B, M | G, W, L | B, D, M | W, G, L | D, B, M | W, G, L | B, D, M | L, G |

Row 1 is cut short by the tip (two tones show). Rows 9 and 11 are less sure (the tailplane shades row 11; its
last tone is a guess).

**The blue zone** (ahead of the diagonal, rows 1 – 7): seven blue bands. From row 2 down each band has a
**white line 0.14 m high along its top** (six lines; on the A321neo). Each blue band is three sub-bands, and each
sub-band is a horizontal gradient between navy #1C3F6E and bright blue #2A8CCF. Neighbouring sub-bands run in
opposite directions, which gives a woven look. A fair simplification: in each band, top sub-band navy at the
leading edge to bright at the diagonal, middle sub-band the same, bottom sub-band bright to navy; swap the
direction in every other band. Row 8 (white) closes the blue zone below.

**Left / right:** the flag is a mirror image. On both sides the blue is forward, the red and white are aft, and
the sub-bands come in the same order from the top (`N814NN`, `N426AN`, `N833AA`, `N955AN`).

**Fin tip cap:** painted through (red aft, blue forward).

### 4.4 Tailplane, wings

Light grey #B9BCC0 above and below, bare-metal leading edges. No livery colour. The tailplane hides part of rows
10 – 12 in side views. Under the wing: a small fleet number (seen on `N453AA`): skip.

### 4.5 Engines

- Nacelles in the fuselage silver, all round, on every type. **No title, no logo** (`crop-N434AN-engine.jpg`,
  `N430AN`, `N885NN`, `N718AN`, `N826AN`: both faces of both engines plain). Only small red warning stencils.
- Inlet lip: a bare polished ring. Pylons: light grey. Exhaust nozzle, core cowl and plug: dark metal.
- 787: the nacelle has a sawtooth (chevron) trailing edge (`N833AA`). 777-300ER: the largest nacelles, plain.

### 4.6 Wingtip devices

- **A321neo and A321-200 Sharklets:** plain light grey to white, **both faces, no logo**. Outer face:
  `crop-N434AN-sharklet-outer.jpg`. Inner face: `commons-N449AN_-_MIA.jpg` (seen from the cabin).
- **A321-200 with wingtip fences** (older aircraft): plain (`commons-Airbus_A321_wingtip_fence.jpg`).
- **737-800 blended winglets:** light grey #D3D5D7 with a bare-metal leading-edge strip. **Outer face plain**
  (`crop-N200NV-winglet-outer.jpg`, `N885NN`, `N923NN`). **Inner face: the flight symbol**, red blade low and
  blue blade above it, on the middle of the blade, on `N965AN`, `N968NN` and `N943NN`
  (`crop-N965AN-winglet-inner.jpg`). `N200NV` has plain inner faces too. The symbol is about half the blade's
  height (an estimate from small crops). I did not check split-scimitar aircraft.
- **777, 787:** raked wingtips, no device, wing grey.

---

## 5. Side-elevation drawing steps

### LEFT side

1. **Fill** the fuselage and fin #C1C4C8.
2. **Flag, aft zone:** clip to everything aft of the front-edge line (the fin's leading edge continued down) and
   above the bottom of row 12. Paint the twelve rows from the fin tip down with the heights of the table for the
   model's type, each as three sub-bands in the order of section 4.3. Row 1 is the short one.
3. **Flag, blue zone:** inside the fin, ahead of the half-chord diagonal and above the top of row 8: the seven
   blue bands with their gradients, and a white line 0.14 m high (scaled with the row height) along the top of
   bands 2 – 7.
4. **Tail cone:** silver for the last 2 m; the APU nozzle #55585C.
5. **Symbol:** in its box (section 4.2), standing on the title's baseline, 0.2 – 0.4 m aft of door 1 on the
   narrow-bodies and 0.85 m aft of it on the wide-bodies. Red blade at the lower forward corner, head, blue blade
   up and aft.
6. **Title:** `title.svg`, its baseline and cap line placed symmetrically about the window row
   (cap height 0.33 – 0.35 of the fuselage height), its "A" starting where the symbol's box ends. Stretch it to
   the measured length (6.4 × the cap height): the file is 5.99 : 1 between its cap line and baseline.
7. **Cockpit glass** #15181C if the model does not have it. Door outlines: thin white, optional.

### RIGHT side (differences)

- Colour fields: the mirror image. Nothing else changes.
- Symbol: the same station, **mirrored** (`mirror: true`).
- Title: not mirrored. It reads left to right, so the "A" is at the aft end. Move it 0.15 m (A321neo) to 0.5 m
  (737, 787) aft of the left side's span.

### Engines, wingtips, flat colours

- Engine: #C9CCD0, lip ring #D6D7D8 (the front 0.15 m), exhaust #55585C aft of the reverser, pylon #B9BCC0.
- Wingtip device: #D3D5D7. On the 737-800 the inner face may carry the symbol; the kit paints one artwork for
  both faces, so leave it out unless the kit can paint the faces apart.
- Wings and tailplane: #B9BCC0.

---

## 6. Logos and wordmarks

| Graphic | Commons file | Licence | In `liveries/AAL/` | Use |
|---|---|---|---|---|
| **"American" title** | https://commons.wikimedia.org/wiki/File:American_Airlines_wordmark_(2013).svg ("American Airlines" in two words, 245 × 24) | **PD-textlogo (simple)**, with the Trademarked tag (read from the file page through the API on 2026-10-13) | `title.svg`: the word "American" only, the letter outlines unchanged, fill #334357 | **Usable.** Recolour to #44546A if the design follows the photos. |
| **Flight symbol** | https://commons.wikimedia.org/wiki/File:AA_Symbol.svg (and "Black AA Symbol.svg"), uploaded 2026-04-05, tagged PD-textlogo | **Not safe.** The English Wikipedia keeps the 2013 logo as non-free and says it was deleted on Commons: the U.S. Copyright Office ruled the flight symbol copyrightable in December 2018 (registration VA0002130520). The Commons tag contradicts that ruling. The file's colours (#1976D2, #FF1744, #B0BEC5) are the uploader's, not the airline's. | not copied | **Do not use the file.** Draw two plain blades (a red one and a blue one) and a light piece between them with kit shapes, placed and sized as in section 4.2, or leave the symbol out. |
| Heritage and special liveries | none | - | - | Leave out. |

Viewed and not used: "Logo text American Airlines (1967-2013).png" (the old wordmark).

## 7. Fonts

None are needed: the title is a vector file. The wordmark is custom lettering (a humanist sans with a
double-storey "a"); I did not look for an OFL match. The registration and the small texts are skipped.

---

## 8. Confidence and open questions

- **High:** the scheme and its parts; that it is the same on all seven types seen and on the eight tracked
  airframes; the left/right rules (symbol mirrored at the nose end, title not mirrored, flag mirrored); the row
  count and colours of the flag; plain engines; plain Sharklets.
- **Medium-high:** the A321neo and 737-800 positions (±0.15 m relative to door 1 and to the fin; ±0.4 m in
  absolute z, see the scale note); the sub-band order of rows 1 – 8; the colours.
- **Medium:** the 777-300ER and 787-9 numbers (one photo per side, scale ±3–5 %; rows 9 – 12 partly hidden).
  The 777-200ER, 787-8 and A321-200 were not measured; by eye they follow their sister types.
- **Low-medium:** the blue zone's gradient pattern (simplified); the symbol's exact outline (described, not
  traced, on purpose); wing grey.
- **Open:**
  1. The flight symbol has no free file. Draw it from plain shapes or leave it out?
  2. 737-800 winglets: three aircraft carry the symbol on the inner face, one does not. Which is the rule, and
     what do split-scimitar aircraft carry?
  3. The 0.4 m disagreement in absolute z between the two A321neo left photos.
  4. Why the measured symbol is larger on the 737 than on the A321neo.
  5. Heritage and special aircraft are not listed by registration. If one is tracked later it will be painted
     in the standard scheme.

Sources consulted: Wikimedia Commons (the files above, their licences through the API; the two logo file pages);
planespotters.net public API (8 requests); [Wikipedia: American Airlines](https://en.wikipedia.org/wiki/American_Airlines)
(the 2013 livery, the copyright ruling) and its file page
[American Airlines logo 2013.svg](https://en.wikipedia.org/wiki/File:American_Airlines_logo_2013.svg) (non-free,
the Copyright Office ruling); [brandcolorcode.com](https://www.brandcolorcode.com/american-airlines) and
[brandpalettes.com](https://brandpalettes.com/american-airlines-color-codes/) (unofficial colour values).
Type dimensions (lengths 44.51, 39.47, 73.86, 62.81 m; fuselage heights 4.14, 4.01, 6.20, 5.94 m) are the makers'
published figures, from memory.

---

## 9. Render check (2026-10-14)

Rendered on the QA machine in three rounds (b738, a321, b789, b772 against the photos of section 2, all twelve
views each), then the design test.

**What matches the photos:** the silver fuselage, engines and tail cone; the title, its text, size and place on
both sides ("American" with the symbol at its nose end on the left, the symbol nearer the nose on the right); the
flight symbol drawn from plain shapes; the flag: blue rows with white lines ahead of the fin's half-chord line, red
and white rows behind it, carried on across the rear fuselage under the tailplane; the door outlines; plain
engines and wingtips, the symbol on the 737 winglets' inner faces.

**Changed after the first render:**

- The title is lighter (#47596F, the file's #334357 was darker than the photos' strokes).
- The flag's white rows are brighter (they read grey on the silver).
- The APU nozzle shape was too tall; it is now the cone's tip.

**Still different:** the blue rows are smoother than the photos' weave; the cockpit windows are one dark shape; the
787-9 title may sit up to 1.4 m aft of its place in the one side-on photo (the model's door 1 is the anchor); the
A321neo Sharklets are plain grey on both faces as in the photos, but the a321 model has none.
