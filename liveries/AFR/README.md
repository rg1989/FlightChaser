# Air France (AFR): livery dossier, the 2021 scheme

Research date: 2026-10-13. Types: Airbus A320 family (A320, A321), Airbus A350-900, Boeing 777-300ER.
Refs folder: `data/livery-refs/AFR/` (git-ignored; the photos never leave it). `hi/` in that folder holds the larger
copies that the pixel values below refer to. I looked at each photo (the full frame and zoomed crops with a pixel
ruler) and measured positions and colours from the pixels.

Coordinates (side elevation, the same for both sides):

- **z** = metres aft of the nose tip.
- **h** = metres above the keel of the constant-section fuselage. **H** = the fuselage height.
- A position "aft of door 1" is measured from the centre of the first passenger door. That is the safest anchor: it
  does not depend on the camera angle.

Type landmarks used. The z values are those of the model profiles in `public/models/<id>/model.json` (the door
spacing agrees with the photos); the length and H are the real aircraft's; the window row is read from the photos:

| Type | Length | H | Door 1 centre z | Cockpit glass aft edge z | Window row h | Other doors z |
|---|---|---|---|---|---|---|
| A320 | 37.57 m | 4.14 | 5.1 | 3.3 | 2.6 | rear door 30.1 |
| A321 | 44.51 m | 4.14 | 5.0 | 3.3 | 2.6 | door 2 at 13.8 |
| A350-900 | 66.8 m | 6.09 | 6.85 | 3.7 | 3.4 | door 2 at 18.9, door 3 at 38.1 |
| 777-300ER | 73.86 m | 6.20 | 6.8 | 3.0 | 3.6 | door 2 at 17.2, door 3 at 33.2 |

Scales: the height of the fuselage in the photo gives the vertical scale. The cabin-window pitch (A320 and 777:
0.533 m, A350: 0.635 m) and the door spacing give the scale along the fuselage. Most photos are taken from a little
ahead of the beam, so the two scales differ; where a photo is named below, both were measured on it.

---

## 1. Identity

**Scheme:** the Air France livery as refreshed in 2021. A white aircraft with:

- a very large navy **AIRFRANCE** wordmark with the red accent, above the windows, from door 1 aft;
- the **winged seahorse** (hippocampe ailé) in a navy ring between the cockpit windows and door 1;
- the same seahorse ring on each engine;
- a white fin with four swept stripes (three navy, one red) and a ring of 12 gold stars;
- navy wingtip devices;
- the aircraft's name in small letters under the windows aft of door 1.

No cheatline, no belly colour, no belly title.

**The fleet is in the middle of a repaint.** Three states fly today. Only the first is this dossier's subject:

| State | What tells it | Seen on (photo date) |
|---|---|---|
| **2021 scheme** | large wordmark + seahorse ring at the nose | A350: F-HTYO (2023-04), F-HTYP (2024-08), F-HTYQ (2023-09, 2026-01), F-HUVA (2023-08), F-HUVH (2026-07), F-HUVI (2026-07), F-HUVJ (2025-05, 2026-07), F-HUVL (2024-08), F-HUVM (2026-07), F-HUVN (2025-05). 777: F-GSQB (2025-05), F-GSQK (2026-07), F-GSQL (2026-09), F-GSQN (2025-06), F-GZNE (2025-08), F-GZNI (2025-12), F-GZNK (2026-09); large wordmark, nose too small to read: F-GZNH, F-GZNO (2026-09). A320: F-GKXO (2026-05, 2026-08), F-GKXP (2026-08), F-GKXZ (2026-02, 2026-09), F-HEPE (2026-08), F-HEPJ (2026-04). A321: F-GTAY (2026-09). A220: the three tracked ones (not a target type) |
| A350 before 2021 | the same large wordmark, but a grey SkyTeam logo and "AIRFRANCE KLM" at the nose, no seahorse ring | F-HTYF, F-HTYJ (2026-09-26), F-HTYH (2025-02) |
| 2009 scheme (777, A320 family) | a smaller wordmark (777: about 14 m long; A320: about 7.5 m long), a grey SkyTeam logo and "AIRFRANCE KLM" at the nose, no seahorse ring at the nose. Fin, engines (with the seahorse ring) and wingtips as in 2021 | 777: F-GSQT, F-GSQY, F-GZNB, F-GZNR (2026-09-26), F-GZNP (2026-03-13). A320: F-GKXY (2026-08-26), F-HBNJ (2026-06-01) |

The lists are what the photos show, not a full fleet census. Evidence for the rows that are not in `refs.json`: the
Commons files "Air France F-GSQT B777-300.jpg", "Air France F-GSQY B777-300.jpg", "Air France F-GZNB B777.jpg",
"Air France F-GZNR B777-300.jpg", "Air France F-GZNH B777-300.jpg", "Air France F-GZNO B777-300.jpg",
"Air France F-GSQN B777-300.jpg", "F-GZNP (55169564117).jpg", "Air France A320-214 F-GKXY.jpg",
"Airbus A320-214 (c-n 4908, F-HBNJ) 2026-06-01 Andre Gerwing Collection ID 029095.jpg", "Air France F-HTYF A350.jpg",
"Air France F-HTYJ A350-900.jpg", "Air France Airbus A350-900 F-HTYH on final approach to Boston Feb 2025 1.jpg",
"F-HTYO @ CDG, 2023-04-20.jpg" (viewed, not stored).

**Tracked aircraft** (the survey's hexes): F-GSQD, F-GSQB, F-GSQU, F-GZND (777), F-HUVU, F-HTYG (A350), F-HPNU, F-HOZB,
F-HPNY (A220). Their planespotters thumbnails all show the large wordmark. The 777 and A350 thumbnails are too small
to show the nose emblem, so F-HTYG may still be an "A350 before 2021".

**Two layouts of the 2021 scheme on the 777** (both fly today):

- (b) the usual one: a large seahorse ring (1.1 m) between the cockpit and door 1; the wordmark block starts about
  2.7 m aft of door 1. F-GSQB, F-GSQK, F-GZNE.
- (a) a small ring (0.64 m) directly behind the cockpit side window; on F-GZNI the wordmark block also sits about
  1.2 m further aft (it starts 3.9 m aft of door 1 and reaches door 3). F-GZNI, F-GZNK.

Paint (b).

---

## 2. Reference photos

47 photos are listed in `data/livery-refs/AFR/refs.json`: 9 planespotters thumbnails (the tracked aircraft; 420–500 px wide, no date in the API), 28 photos from Wikimedia Commons (1920 px copies) and 10 crops cut from them. All show the 2021 scheme. Photos of the older schemes were removed from the list.

| File | View | Registration | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|
| `ps-394a03-1989565.jpg` | right side (777-300ER, small thumbnail) | F-GSQD | https://www.planespotters.net/photo/1989565/f-gsqd-air-france-boeing-777-328er | Lei | planespotters.net: reference only | unknown |
| `ps-394a01-1950838.jpg` | 3/4 front left (777-300ER, flying, small thumbnail) | F-GSQB | https://www.planespotters.net/photo/1950838/f-gsqb-air-france-boeing-777-328er | Alon Varshaver | planespotters.net: reference only | unknown |
| `ps-394a14-1974508.jpg` | left side (777-300ER, flying, small thumbnail) | F-GSQU | https://www.planespotters.net/photo/1974508/f-gsqu-air-france-boeing-777-328er | Mehmed Bekir Cakmak | planespotters.net: reference only | unknown |
| `ps-3965a3-1977312.jpg` | 3/4 front right (777-300ER, flying, small thumbnail) | F-GZND | https://www.planespotters.net/photo/1977312/f-gznd-air-france-boeing-777-328er | BELUGA.LOVER | planespotters.net: reference only | unknown |
| `ps-39bdb4-1937940.jpg` | 3/4 rear right (A220-300: same scheme, another type) | F-HPNU | https://www.planespotters.net/photo/1937940/f-hpnu-air-france-airbus-a220-300-bd-500-1a11 | Christian Jilg | planespotters.net: reference only | unknown |
| `ps-39bb21-1945969.jpg` | right side (A220-300: same scheme, another type) | F-HOZB | https://www.planespotters.net/photo/1945969/f-hozb-air-france-airbus-a220-300-bd-500-1a11 | Adolfo Bento de Urquía | planespotters.net: reference only | unknown |
| `ps-39bdb8-1993373.jpg` | 3/4 front right (A220-300: same scheme, another type) | F-HPNY | https://www.planespotters.net/photo/1993373/f-hpny-air-france-airbus-a220-300-bd-500-1a11 | William Verguet | planespotters.net: reference only | unknown |
| `ps-39d2b4-1931504.jpg` | right side (A350-900, small thumbnail) | F-HUVU | https://www.planespotters.net/photo/1931504/f-huvu-air-france-airbus-a350-941 | KirkXWB | planespotters.net: reference only | unknown |
| `ps-39cf06-1780015.jpg` | below (A350-900, right side, small thumbnail) | F-HTYG | https://www.planespotters.net/photo/1780015/f-htyg-air-france-airbus-a350-941 | LookTheA380 | planespotters.net: reference only | unknown |
| `commons-An_Air_France_Boeing_777-300_taxing.jpg` | right side (777-300ER, hazy, through glass) | ? | https://commons.wikimedia.org/wiki/File:An_Air_France_Boeing_777-300_taxing.jpg | SuperCoolDude271 | CC BY 4.0 | 2025-06-22 |
| `commons-Air_France_A350-900_F-HTYQ_at_Boston.jpg` | left side (A350-900, sunlit, seen about 30 degrees from ahead) | F-HTYQ | https://commons.wikimedia.org/wiki/File:Air_France_A350-900_F-HTYQ_at_Boston.jpg | 4300streetcar | CC BY 4.0 | 2023-09-02 |
| `commons-Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg` | right side (A350-900, dusk light, seen about 29 degrees from ahead) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-07-04 |
| `commons-Air_France_Airbus_A350-900_F-HUVM_on_final_approach_to_Boston_July_2026_1.jpg` | left side (A350-900, flying, sunlit) | F-HUVM | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVM_on_final_approach_to_Boston_July_2026_1.jpg | 4300streetcar | CC BY 4.0 | 2026-07-08 |
| `commons-F-HUVL_CDG_2024-08-13.jpg` | right side (A350-900) | F-HUVL | https://commons.wikimedia.org/wiki/File:F-HUVL_@_CDG,_2024-08-13.jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-08-13 |
| `commons-F-HTYP_CDG_2024-08-14.jpg` | left side (A350-900) | F-HTYP | https://commons.wikimedia.org/wiki/File:F-HTYP_@_CDG,_2024-08-14.jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-08-14 |
| `commons-At_Paris_2026_054.jpg` | nose (A350-900, right side, close: roundel, accent, name) | F-HUVI | https://commons.wikimedia.org/wiki/File:At_Paris_2026_054.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2026-07-26 |
| `commons-Air_France_Airbus_A350-900_NPS_F-HUVJ_winglet.jpg` | winglet (A350-900, inner face, from the cabin) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_NPS_F-HUVJ_winglet.jpg | 4300streetcar | CC BY 4.0 | 2025-05-12 |
| `commons-Air_France_F-HUVJ_at_SFO.jpg` | 3/4 front left (A350-900, flying, sunlit) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_F-HUVJ_at_SFO.jpg | Ian Abbott | CC BY 4.0 | 2026-07-06 |
| `commons-F-HTYQ_-_Airbus_A350-941_-_Air_France_SJO_220126.jpg` | 3/4 front right (A350-900) | F-HTYQ | https://commons.wikimedia.org/wiki/File:F-HTYQ_-_Airbus_A350-941_-_Air_France_SJO_220126.jpg | kitmasterbloke | CC BY 4.0 | 2026-01-24 |
| `commons-Air_France_Airbus_A350-900_F-HUVJ_at_Boston_May_2025.jpg` | 3/4 front right (A350-900, at the gate) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_at_Boston_May_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-05-12 |
| `commons-F-HUVA_CDG_2023-08-06.jpg` | 3/4 rear right (A350-900, taking off) | F-HUVA | https://commons.wikimedia.org/wiki/File:F-HUVA_@_CDG,_2023-08-06.jpg | Charles | CC BY 2.0 | 2023-08-06 |
| `commons-Air_France_F-HUVN_A350-900.jpg` | below (A350-900) | F-HUVN | https://commons.wikimedia.org/wiki/File:Air_France_F-HUVN_A350-900.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-05-01 |
| `commons-Air_France_Airbus_A350-900_F-HUVH_departing_Boston_July_2026_1.jpg` | left side (A350-900, climbing, sunlit) | F-HUVH | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVH_departing_Boston_July_2026_1.jpg | 4300streetcar | CC BY 4.0 | 2026-07-19 |
| `commons-Air_France_F-GSQB_B777-300.jpg` | right side (777-300ER, sunlit) | F-GSQB | https://commons.wikimedia.org/wiki/File:Air_France_F-GSQB_B777-300.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-05-01 |
| `commons-F-GZNI_B777-300ER_Air_France_IAH_12-10-25_55094705611_.jpg` | right side (777-300ER, sunlit; odd airframe: small roundel, wordmark 2 m further back) | F-GZNI | https://commons.wikimedia.org/wiki/File:F-GZNI_B777-300ER,_Air_France,_IAH_12-10-25_(55094705611).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2025-12-10 |
| `commons-_SGP-Singapore_Air_France_Boeing_777-328ER_F-GZNE_WSSS_2025-08-30.jpg` | 3/4 front left (777-300ER) | F-GZNE | https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_Air_France_Boeing_777-328ER_F-GZNE_@_WSSS_2025-08-30.jpg | S5A-0043 | CC BY 4.0 | 2025-08-30 |
| `commons-Air_France_F-GZNK_B777-300.jpg` | left side (777-300ER, overcast) | F-GZNK | https://commons.wikimedia.org/wiki/File:Air_France_F-GZNK_B777-300.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-09-26 |
| `commons-Boeing_777-300_-_F-GSQL_from_Air_France_landing_at_LFBT_airport.jpg` | 3/4 front right (777-300ER, flying, sunlit) | F-GSQL | https://commons.wikimedia.org/wiki/File:Boeing_777-300_-_F-GSQL_from_Air_France_landing_at_LFBT_airport.jpg | Hugo LUC | CC BY-SA 4.0 | 2026-09-13 |
| `commons-At_Paris_2026_063.jpg` | 3/4 front right (777-300ER, at the gate) | F-GSQK | https://commons.wikimedia.org/wiki/File:At_Paris_2026_063.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2026-07-26 |
| `commons-Air_France_A320-214_F-GKXO.jpg` | left side (A320 with fences) | F-GKXO | https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-GKXO.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `commons-Air_France_A320-214_F-HEPE.jpg` | left side (A320 with blended tips) | F-HEPE | https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-HEPE.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `commons-Air_France_F-GKXZ_A320.jpg` | left side (A320, overcast) | F-GKXZ | https://commons.wikimedia.org/wiki/File:Air_France_F-GKXZ_A320.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-09-26 |
| `commons-Airbus_A320-214_c-n_3470_F-GKXP_2026-08-27_Andre_Gerwing_Collection_ID_030965.jp.jpg` | right side (A320, flying, sunlit) | F-GKXP | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_3470,_F-GKXP)_2026-08-27_Andre_Gerwing_Collection_ID_030965.jpg | André Gerwing | CC BY-SA 4.0 | 2026-08-27 |
| `commons-Airbus_A320-214_c-n_7873_F-HEPJ_2026-04-08_Andre_Gerwing_Collection_ID_028230.jp.jpg` | right side (A320 with blended tips, flying, sunlit) | F-HEPJ | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_7873,_F-HEPJ)_2026-04-08_Andre_Gerwing_Collection_ID_028230.jpg | André Gerwing | CC BY-SA 4.0 | 2026-04-08 |
| `commons-F-GKXZ_at_RAK_-_2026-02-04.jpg` | 3/4 front right (A320, sunlit) | F-GKXZ | https://commons.wikimedia.org/wiki/File:F-GKXZ_at_RAK_-_2026-02-04.jpg | 瑞丽江的河水 | CC BY-SA 4.0 | 2026-02-04 |
| `commons-Airbus_A320-214_c-n_3420_F-GKXO_2026-05-29_Andre_Gerwing_Collection_ID_029058.jp.jpg` | 3/4 front left (A320, flying) | F-GKXO | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_3420,_F-GKXO)_2026-05-29_Andre_Gerwing_Collection_ID_029058.jpg | André Gerwing | CC BY-SA 4.0 | 2026-05-29 |
| `commons-Air_France_F-GTAY_A321.jpg` | left side (A321, overcast) | F-GTAY | https://commons.wikimedia.org/wiki/File:Air_France_F-GTAY_A321.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-09-26 |
| `crop-tail-a320-left.jpg` | tail (A320, left) (cut from Air_France_A320-214_F-GKXO) | F-GKXO | https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-GKXO.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `crop-tail-b77w-right.jpg` | tail (777-300ER, right, sunlit) (cut from F-GZNI_B777-300ER_Air_France_IAH_12-10-25_55094705611_) | F-GZNI | https://commons.wikimedia.org/wiki/File:F-GZNI_B777-300ER,_Air_France,_IAH_12-10-25_(55094705611).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2025-12-10 |
| `crop-tail-a359-right.jpg` | tail (A350-900, right, dusk light) (cut from Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-07-04 |
| `crop-engine-a320-left.jpg` | engine (A320, CFM56, left, outboard face) (cut from Air_France_A320-214_F-GKXO) | F-GKXO | https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-GKXO.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `crop-engine-b77w-right.jpg` | engine (777-300ER, GE90, right, outboard face, sunlit) (cut from F-GZNI_B777-300ER_Air_France_IAH_12-10-25_55094705611_) | F-GZNI | https://commons.wikimedia.org/wiki/File:F-GZNI_B777-300ER,_Air_France,_IAH_12-10-25_(55094705611).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2025-12-10 |
| `crop-engine-a359-right.jpg` | engine (A350-900, Trent XWB, right, outboard face) (cut from Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-07-04 |
| `crop-winglet-a359-outer.jpg` | winglet (A350-900, right, outer face) (cut from Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026) | F-HUVJ | https://commons.wikimedia.org/wiki/File:Air_France_Airbus_A350-900_F-HUVJ_taxiing_at_Boston_July_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-07-04 |
| `crop-sharklet-a320.jpg` | winglet (A320 Sharklets: right outer face, left inner face) (cut from Airbus_A320-214_c-n_7873_F-HEPJ_2026-04-08_Andre_Gerwing_Collection_ID_028230.jp) | F-HEPJ | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_7873,_F-HEPJ)_2026-04-08_Andre_Gerwing_Collection_ID_028230.jpg | André Gerwing | CC BY-SA 4.0 | 2026-04-08 |
| `crop-nose-a320-left.jpg` | nose (A320, left: roundel, name, start of the wordmark) (cut from Air_France_A320-214_F-GKXO) | F-GKXO | https://commons.wikimedia.org/wiki/File:Air_France_A320-214_F-GKXO.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `crop-nose-b77w-right.jpg` | nose (777-300ER, right, sunlit: roundel, name, accent) (cut from Air_France_F-GSQB_B777-300) | F-GSQB | https://commons.wikimedia.org/wiki/File:Air_France_F-GSQB_B777-300.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-05-01 |

Also in the folder: `hi/` (15 larger copies, up to 3840 px, of the photos that were measured, and of `F-GZNP`, the 2009 scheme, see section 8) and `logos/` (the logo files as downloaded from Commons).

Most useful:

- A350: `…F-HUVJ_taxiing_at_Boston_July_2026` (right side, measured; dusk light, do not take colours from it),
  `…F-HTYQ_at_Boston` (left side, sunlit), `At_Paris_2026_054` (nose close-up), `…NPS_F-HUVJ_winglet` (inner face),
  `…F-HUVJ_at_SFO` (both engines, the belly, the outer face of the left winglet).
- 777: `F-GZNI_…IAH…` (right side, sunlit, almost side-on: sizes, fin, engine, colours), `…F-GSQB_B777-300` (right
  side, layout (b)), `…F-GZNE_WSSS…` (left side, layout (b)).
- A320: `…A320-214_F-GKXO` (left side, almost side-on: sizes, fin, engine), `…F-HEPJ…` (right side, Sharklets),
  `…F-GTAY_A321` (A321).

---

## 3. Colours

Brand values: the wordmark file on Commons (`wordmark.svg`) has navy **#051039** and red **#FF0000**. No paint
specification was found. Photo samples are medians of boxes on flat, sunlit areas.

| Paint | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **Navy** (wordmark, seahorse, fin stripes, wingtip devices) | **#1B2B56** | Sunlit: wordmark #293658, #263353 (`F-GZNI`, hue 223°); fin stripe #273153, #1E2848 (`F-GZNI`, hue 226°); winglet #0C2855 (`…F-HUVJ_winglet`, hard sun, hue 217°). Dusk: #172B52, #152648 (`…F-HUVJ_taxiing`). Photo hue 217–226°, value 0.28–0.35. The brand's #051039 (hue 227°, value 0.22) is the same hue but darker than the paint looks in daylight | Medium-high. #051039 is the alternative |
| **Red** (accent, fin stripe) | **#E8303F** | Sunlit: accent #E03948 (`F-GZNI`), #E5324A (`F-GSQB`); fin #F12C38 (`F-GZNI`). Overcast close-up: #F24A59 (`At_Paris_2026_054`). Photo hue 352–356°. The brand's #FF0000 is hue 0° | Medium-high. A little towards crimson from pure red |
| **White** (everything else on the fuselage, fin, nacelles) | **#F4F5F4** | #F7F6F5, #EEEFEB (fin, `F-GZNI`), #E4E7EC (crown), #EDEFEF (`F-GSQB`) | High |
| **Gold** (the 12 stars) | **#F2B21E** | Yellow-orange stars on the navy stripe (`crop-tail-a359-right`, `crop-tail-a320-left`). A few pixels each: an estimate | Low-medium |
| **Name letters** | navy, as above (they look grey because they are thin) | `At_Paris_2026_054` ("ALBI"), `F-HUVJ` ("PARIS") | Medium |
| **Inlet lip** | **#C6C7C8** | bare metal ring on all three engine types (`crop-engine-*`) | Medium |
| **Exhaust, core cowl, APU outlet** | **#55585C** | dark metal (`crop-engine-a320-left`) | Medium (an estimate) |
| **Wings, tailplane** | **#B9BEC4** | the makers' light grey, not a livery colour. Samples are full of sky reflection | Low (an estimate) |
| **Sharklet leading-edge band** | **#C9CCD0** | light grey band on the A320 Sharklet (`crop-sharklet-a320`) | Medium |

---

## 4. Elements (side elevation)

### 4.1 Fuselage

White from the radome to the tail cone, all round: sides, crown, belly and belly fairing
(`…F-HUVJ_at_SFO`, `…F-HUVN_A350-900` from below). No cheatline, no pinstripe, no grey belly. The cockpit windows have
no painted surround on the A320 and the 777; the A350 has its black window mask (the type's standard, part of the
model). The tail cone is white; the APU outlet is dark metal.

### 4.2 The wordmark

Text: **AIRFRANCE**, one word, navy capitals, upright (not italic; in oblique photos the letters look slanted because
the upper fuselage is further from the camera). After the "E" comes the **red accent**: a sliver that rises from a
point on the baseline to a flat top a little above the cap height, leaning the way a "/" leans. Use `wordmark.svg`.

It is painted on the upper fuselage, between the top of the windows and the crown, so it is much shorter in side
view than on the skin. In side elevation the block (letters and accent) is **16 to 17 times as long as the letters
are high** (the logo itself is 12.7 : 1). Stretch the image to the box.

| | A320 / A321 | A350-900 | 777-300ER (layout b) |
|---|---|---|---|
| Block length (letters + accent) | **11.6 m** | **19.3 m** | **21.5 m** |
| Letters only | 10.1 m | 16.2 m | 18.4 m |
| Block starts aft of door 1 centre | **1.5 m** (z 6.6) | **1.1 m** (z 8.0) | **2.7 m** (z 9.5) |
| Block ends | z 18.2 | z 27.3 | z 31.0 |
| Baseline h | **2.99** (0.72 H) | **4.18** (0.69 H) | **4.11** (0.66 H) |
| Cap top h | **3.68** (0.89 H) | **5.39** (0.885 H) | **5.46** (0.88 H) |
| Cap height in side view | 0.69 m | 1.21 m | 1.35 m |
| Accent top h (1.09 × cap) | 3.74 | 5.50 | 5.58 |
| Baseline above the window centres | 0.40 m | 0.79 m | 0.52 m |
| Image box for `wordmark.svg` (w × h, centre h) | 11.7 × 0.84, centre 3.35 | 19.4 × 1.47, centre 4.82 | 21.6 × 1.64, centre 4.82 |

(The image box is larger than the letters: in the 189 × 18 file the baseline is 6.6 % of the height above the bottom
edge and the cap height is 82 % of the height.)

Evidence:

- A320: `hi/…A320-214_F-GKXO` (3260 px, 83 px/m up, 84.5 px/m along). Letters x 548–1402, accent to x 1522, cap
  y 1060–1110, crown y 1034, keel y 1378, window centres y 1142, door 1 frame x 385–470. The camera is below the
  aircraft (it looks up about 7°), which lifts everything on the near side: the window row measures 2.84 m above
  the keel, the true value is 2.6 m. The h values in the table are corrected for that (measured: baseline 3.22, cap
  top 3.83).
  A321 `…F-GTAY_A321`: the same block at the same place (read at 1920 px: about 11.6 m long, from about 1.6 m aft of
  door 1).
- A350: `hi/…F-HUVJ_taxiing…` (3840 px, 55.5 px/m up, 48.7–50 px/m along). Letters x 2072–2860, accent to x 3023,
  cap y 1229–1296, crown y 1190, keel y 1528, window centres y 1340, door 1 centre x 3070, door 2 centre x 2466.
  Left side `hi/…F-HTYQ_at_Boston`: the "A" starts 0.4 m aft of the aft edge of door 1.
- 777: `hi/F-GZNI_…` (3840 px, 51.3 px/m up, 50 px/m along). Letters x 2100–3028, accent to x 3193 (21.9 m), cap
  69 px, crown y 1145, keel y 1463, window centres y 1279, door 1 centre x 3387, door 2 centre x 2867. `F-GSQB`
  (41 px/m): letters x 1871–2640, accent to x 2743 (21.3 m). The block start comes from `F-GSQB` (right side:
  2.8–3.0 m aft of door 1) and `F-GZNE` (left side: about 2.2 m, oblique photo).

**Left and right.** The block covers the same part of the fuselage on both sides and reads correctly on both. Left
side: the "A" is at the fore end (next to door 1) and the accent at the aft end. Right side: the accent is at the
fore end (next to door 1) and the "A" at the aft end. That is what the kit does with an image by default.

On the A320 the wordmark ends over the wing, above the over-wing exits. On the A321, the A350 and the 777 the top of
door 2 cuts into the lower part of the letters.

### 4.3 The seahorse ring at the nose

A thin **navy ring** with the navy **winged seahorse** inside, on the white skin (no filled disc)
(`At_Paris_2026_054`, close-up). The horse **faces the nose on both sides**: the right side shows the emblem as it
is drawn, the left side shows its mirror image (`…F-HUVJ_taxiing` right, `…F-HTYQ_at_Boston` left,
`crop-nose-a320-left`).

| | A320 / A321 | A350-900 | 777-300ER (b) | 777-300ER (a) |
|---|---|---|---|---|
| Outer diameter | **0.6 m** | **1.1 m** | **1.1 m** | 0.64 m |
| Centre, forward of door 1 centre | **1.15 m** (z 3.95) | **1.8 m** (z 5.05) | **2.2 m** (z 4.6) | 0.7 m aft of the cockpit glass |
| Centre as a fraction from door 1 centre to the cockpit glass aft edge | 0.66 | 0.575 | 0.59 | – |
| Centre h | 2.6 (on the window line) | 3.4 (on the window line) | 4.0 (0.4 m above the window line) | 3.45 (just below the window line) |

Evidence: A320 `F-GKXO` ring 49 × 47 px at 84 px/m, `F-HEPJ` 57 px against a 170 px door frame. A350 `F-HUVJ` ring
63 px against a 124 px door frame (the frame is 2.1 m), `F-HTYQ` 67 px against 134.5 px. 777 `F-GSQB` ring 43.5 px at
41 px/m, `F-GZNE` 34 px against a 60 px door frame.

### 4.4 The name and the small prints

- The aircraft's name (a French town: "PARIS", "MENTON", "ALBI", "BAYONNE", "BLOIS"…) in thin navy capitals, cap height
  0.12 m (A320) to 0.17 m (A350, 777), under the windows, starting about 1 m aft of door 1, on both sides. Every
  aircraft has another name: **skip it**.
- Near the rear door, under the windows: a small grey SkyTeam logo, "AIRFRANCE KLM GROUP" and the type ("AIRBUS A320",
  "AIRBUS A350-900", "BOEING 777-300ER"), each about 0.15 m high. Above the windows there: the registration in navy.
  **Skip** all of them (the SkyTeam logo is another owner's mark).

### 4.5 The fin

White, with **four straight stripes parallel to the fin's leading edge** (swept about 40–42° from the vertical;
exactly parallel on the A320 and the 777, within 3° on the A350, whose white band is about 0.1 m wider at the top),
the same on both sides. From the leading edge aft: a white band, **navy wide (N1)**, white, **navy
medium (N2)**, white, **navy hairline (N3)**, white, **red wide (R)**, then white to the trailing edge where the fin
is wide enough. The stripes run up to the fin tip and the trailing edge, which cut them off: N1 fills the tip from
the white band to the trailing edge corner; N2, N3 and R start at the trailing edge lower down.

All four end on **one horizontal line just above the fin root** (the foot line: about 0.55 m above the root on the
A320, 0.75 m on the A350 and the 777; 8–9 % of the fin height). The fin below the foot line is white. Each stripe ends
like the tip of a ski pointing forward: over the last metre the aft edge curves forward into the horizontal bottom
edge, and the bottom edge ends in a sharp point about 0.4 m forward of where the straight fore edge would meet the
foot line.

Where each stripe sits, measured along the fin chord at the foot line (0 = leading edge, 1 = trailing edge), with
the straight edges extended down to that line:

| | White band | N1 navy | N2 navy | N3 navy | R red |
|---|---|---|---|---|---|
| A320 (`F-GKXO`, left) | 0 – 0.15 | 0.15 – 0.305 | 0.37 – 0.43 | 0.50 – 0.52 | 0.61 – 0.78 |
| A350 (`F-HUVJ`, right) | 0 – 0.134 | 0.134 – 0.31 | 0.386 – 0.444 | 0.526 – 0.541 | 0.626 – 0.818 |
| 777 (`F-GZNI`, right) | 0 – 0.134 | 0.134 – 0.31 | 0.394 – 0.453 | 0.537 – 0.554 | 0.649 – 0.85 |
| Use | 0 – 0.14 | **0.14 – 0.31** | **0.385 – 0.445** | **0.525 – 0.54** | **0.63 – 0.82** |

Widths measured along the chord (horizontally), in metres:

| | White band | N1 | gap | N2 | gap | N3 | gap | R |
|---|---|---|---|---|---|---|---|---|
| A320 (84 px/m) | 0.76 | 0.86 | 0.35 | 0.31 | 0.39 | 0.12 | 0.45 | 0.94 |
| 777 (50 px/m) | 0.96 | 1.26 | 0.60 | 0.42 | 0.60 | 0.12 | 0.68 | 1.44 |

(A350: between the two; its photo is too oblique for metres. N3 is about 0.12 m on every type: a hairline.)

Evidence, 777 row scans on `hi/F-GZNI_…` (x in px, nose to the right): y 900: N3 423–427, N2 458–477, N1 505–569,
white band to 617; y 1000: R 418–477, N3 511–516, N2 547–566, N1 595–659, band to 707; y 1090: R 484–556,
N3 590–596, N2 626–647, N1 677–740. Every edge moves 0.89 px along per px down, and so does the leading edge. Foot
line y 1122, fin tip y 674. A320 on `hi/…F-GKXO`: y 900: N1 2701–2772, N2 2802–2827, N3 2861–2870, R 2909–2987;
foot line y 995, tip y 540.

**The stars:** a ring of 12 gold five-pointed stars (the European flag's ring, no blue field: the stars sit directly
on the navy), 0.5–0.65 m across, centred on the width of N1, about 1.2 m below the fin tip (A350: about 2 m), on
both sides. Plain kit discs or small star polygons are enough.

### 4.6 Engines

White nacelles (the same white), a bare-metal inlet lip, a dark metal exhaust. Each nacelle carries the **seahorse
ring** (navy, as at the nose) on its side:

| | A320 (CFM56) | A350 (Trent XWB) | 777 (GE90) |
|---|---|---|---|
| Ring diameter | 0.55 m | 0.78 m | 1.09 m |
| Centre aft of the front of the lip | 0.55 m | 2.85 m | 2.85 m |
| Centre height | 0.15 m above the nacelle axis | on the axis | on the axis |

Seen on the outboard faces (all three types) and on the inboard faces of the A350 (`…F-HUVJ_at_SFO`,
`…F-HUVN_A350-900`) and of the A320 (F-GKXY, an aircraft in the older scheme): paint it on every face. Where the
emblem is large enough to read (777 and A350, right engine, outboard face) the horse faces forward.

### 4.7 Wingtip devices

- **A320 with wingtip fences** (`F-GKXO`, `F-GTAY`): the fence is navy.
- **A320 with Sharklets** (`crop-sharklet-a320`, `F-HEPE`): the blade is navy on both faces, with a light grey band
  along the leading edge (about a fifth to a quarter of the chord) from the root to the tip. The curved root is wing
  grey. No emblem seen on either face.
- **A350 winglet** (`crop-winglet-a359-outer`, `…NPS_F-HUVJ_winglet`): navy on both faces from where the tip starts
  to curve up, with a thin bare-metal leading-edge strip (about 5 % of the chord). The part below the curve is the
  wing's colour; the edge between them follows the curve. **Outer face:** plain navy. **Inner face:** a white ring
  with the white seahorse (`seahorse-white.svg`), about 0.85 m across (a little over half the chord there), at
  mid-height of the upturned part, the horse facing the leading edge.
- **777-300ER:** raked wingtips, no device, wing colour.

The kit paints one wingtip atlas for both faces. The outer face is the one a side view shows: paint plain navy with
the leading-edge strip, and leave the inner emblem out unless the kit learns to tell the faces apart.

### 4.8 Wings and tailplane

The makers' light grey on the wings, the flap-track fairings and the pylons. The tailplane is light grey to white.
Under the left wing the registration is painted in black: skip. No livery colour here.

---

## 5. Left / right differences

- The colour fields (white fuselage, fin stripes, nacelles, wingtips) are the same on both sides.
- The wordmark is not mirrored: it reads correctly on both sides, so the accent is aft on the left side and forward
  on the right side (section 4.2).
- The seahorse **is** mirrored: it faces the nose on both sides, at the nose and on the engines (section 4.3). In the
  kit: an image whose horse faces left, drawn with `mirror: true`. `seahorse-navy.svg` is drawn that way.
- The fin is mirrored like the aircraft: N1 is at the leading edge on both sides, the red at the trailing edge.

---

## 6. Logos

| Graphic | Commons page | Licence on the page | File here | Use |
|---|---|---|---|---|
| AIRFRANCE wordmark with the accent | https://commons.wikimedia.org/wiki/File:Air_France_Logo.svg | `{{PD-textlogo}}` + `{{Trademark}}` (read on the page, 2026-10-13) | `wordmark.svg` (unchanged, 189 × 18, navy #051039, red #FF0000) | **Use.** Its two fills may be set to the paint colours of section 3 |
| Winged seahorse in a ring (the Air Orient emblem, Air France's since 1933) | https://commons.wikimedia.org/wiki/File:Logo_Air_Orient_-_Air_France.svg | `{{PD-France}}` + `{{Trademarked}}` (read on the page, 2026-10-13) | `seahorse-navy.svg`, `seahorse-white.svg` (mirrored and recoloured, shapes unchanged) | **Use** for the ring at the nose, on the engines and on the A350 winglet. It is the 1933 drawing. The aircraft wear a 2021 redrawing (five wing feathers, a simpler tail) for which Commons has no free file; at 0.6–1.1 m the difference does not show |
| The same emblem, colour raster | https://commons.wikimedia.org/wiki/File:AF_hippocampe_ailé.png | `{{PD-France}}` + `{{trademark}}` | not used (155 px raster with a red arc) | – |
| SkyTeam logo, "AIRFRANCE KLM GROUP" | – | not ours to use | – | Leave out |
| Ring of 12 stars | – | – | – | Draw with kit shapes |

If the PD-France tag of the seahorse is not enough for the project, drop the two seahorse files and draw a plain
navy ring (0.07 × its diameter thick) in each place.

## 7. Fonts

None. The wordmark is an image, and the only other lettering (the aircraft's name, the type, the registration) is
skipped.

---

## 8. Other schemes of the same airline (for `variants`, if wanted)

- **A350 before 2021:** paint as the 2021 scheme without the nose ring (section 1).
- **2009 scheme on the 777:** as 2021, but the wordmark block is about 14 m long (13.5 m on the oblique
  `hi/commons-F-GZNP_55169564117_.jpg`, 3/4 front left, 2026-03-13: letters x 572–1153, accent to x 1241, 46–55 px/m;
  about 14.7 m on a small side-on photo of F-GSQY), with a cap height of about 1.0 m in side view; it starts about
  1.7 m aft of door 1 centre, and there is no nose ring. Not measured closely. The F-GZNP photo is kept only as this
  evidence.
- **2009 scheme on the A320 family:** as 2021, but the wordmark block is about 7.5 m long with a cap height of about
  0.5 m, above the windows from just aft of door 1, and there is no nose ring (F-GKXY, 1920 px copy, 48 px/m; not
  measured closely).

Which registration wears which changes every month. The table in section 1 is a start, not a list to rely on.

---

## 9. How sure

- **High:** what the scheme consists of; that the wordmark is upright and reads correctly on both sides; that the
  seahorse faces the nose on both sides; the order and the direction of the fin stripes and that they are parallel
  to the leading edge; white engines with the ring; navy wingtip devices; no belly or tail-cone colour.
- **Wordmark size:** block length ±0.4 m; heights ±0.1 m (A350, 777), ±0.15 m (A320: corrected for a camera 7°
  below). The block start is ±0.3 m on the A320 and the A350 and ±0.5 m on the 777 (two layouts and oblique photos).
- **Fin stripes:** chord fractions ±0.01–0.02; the three types agree. The foot line height and the shape of the ski
  tips are read from crops (±0.15 m).
- **Seahorse rings:** diameters ±10 %; nose positions ±0.25 m. Engine ring positions ±0.3 m.
- **Colours:** navy and red are photo medians beside the brand values; the paint looks lighter than brand navy and a
  little more crimson than brand red. Wing grey, gold and metal are estimates.
- **Not seen:** the inner faces of the A320 Sharklets close up (no emblem at the size of the photos); the inboard
  engine faces of the 777; an A321 from the right; a 777 in layout (b) exactly side-on; a clean 3/4 rear view of the
  A320 and the 777.
- **Planespotters thumbnails:** the API gives no date and the copies are 420–500 px wide: reference only.

Sources: Wikimedia Commons (the files above and the categories "Current Airbus A350-900 of Air France", "Current
Boeing 777-300ER of Air France", "Current Airbus A320 of Air France", "Current Airbus A321 of Air France", "Air
France logos"); the planespotters.net public API; the model profiles in `public/models/`.

---

## 10. Lab check (2026-10-14)

Rendered on the A320, A350-900, 777-300ER and A220-300 and compared with the photos, view by view. Three rounds. What
the lab showed and what changed in `design.ts`:

- **Fixed:** the APU outlet's box had no height limit, so the fin's upper trailing edge came out grey. It now covers
  only the tail cone's tip.
- **Added:** the cockpit windows (dark, the Airbus outline on the model's measured aft edge; on the wide bodies they
  grow less than the fuselage).
- **Fixed:** the engine's dark exhaust zone also covered the pylon's fairing and showed as a dark box under the
  wing. It now stops at the pylon.
- **Matches the photos:** the navy wordmark with the red accent (text, size and place on both sides; the accent is at
  the aft end on the left and next to door 1 on the right), the seahorse ring by the cockpit, the fin's four stripes
  with their tips, the foot line and the ring of 12 stars, the navy wingtip devices, the white belly.
- **Still differs:** the engine's seahorse ring also shows on the inside of the air intake when seen from the front
  (the paint is projected by side position, so the inner wall takes it too). The aircraft's name and the small texts
  are not drawn. The shader's windows are square.
