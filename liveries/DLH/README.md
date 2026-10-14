# Lufthansa (DLH): 2018 livery dossier (A320 family, A321neo, widebodies)

Research date: 2026-10-13. Refs folder: `data/livery-refs/DLH/` (git-ignored; 40 files, listed in its `refs.json`).
All file names below are relative to that folder. I looked at every photo (the full frame and zoomed crops) and
measured positions and colours from the pixels. The pixel numbers below are for the stored copies (1920 px wide).
A short name such as `D-AIEF_left` means the stored file `commons-D-AIEF_left_<date>.jpg`.

Coordinate convention (the same as the other dossiers; side elevation, the same for both sides):

- **z** = metres aft of the nose tip (0 = radome tip).
- **h** = metres above the keel of the constant-section fuselage (0 = keel, 4.14 = crown on the A320 family).
- Window row: window centres at **h 2.58** (glass about 0.28 m high; window pitch 0.536 m).

**The measurement master** is `commons-D-AIEF_left_2022-09-17.jpg` (A321neo, left side, on the ground, in sun).
Nose tip x = 79, tail-cone tip x = 1822 (the APU nozzle's lip runs on to x 1827): 1743 px = 44.51 m, so
**39.15 px/m** (39.27 with the lip: 0.3 % apart). Crown y = 562. The belly is in shadow, so I put the keel at
y = 724 (crown + 4.14 m). Three checks say the view is a true side elevation: the ring
on the fin is a circle (115 px wide, 114 px high), the far engine is hidden behind the near one, and the window
pitch comes out at 0.537 m (0.533 m real).

No other stored photo is a true side elevation of the fuselage:

- `commons-D-AIUB_right_2024-05-01.jpg` (A320, right) looks side-on, but the ring on its fin is 127 px wide and
  139 px high, the far engine shows 2.8 m ahead of the near one, and door 1 sits 0.8 m too far from the nose tip.
  Marks on the fuselage side are shifted aft against the outline. I used it for heights and for ratios only
  (title length in window pitches, ring size against fin height).
- `commons-D-AIEK_left_2022-12-06.jpg` and `commons-D-AIEP_left_2023-06-11.jpg` show the far engine ahead of the
  near one (parallax). Good for the look, not for metres.
- The two A321neo photos labelled "3/4 front" from MarcelX42 on the ground (`D-AIEL … 2022-05-28`,
  `D-AIEM … 2023-05-02`) are 30–38° off the beam (ring 99 × 126 px on D-AIEM).

A320 numbers are the A321neo numbers moved with the airframe: the nose section and the tail section are the same,
and the A321 is 6.94 m longer between them (37.57 m against 44.51 m). So z is the same up to the wing, and
z − 6.94 m for the rear door, the blue and the fin.

---

## 1. Identity

**Scheme:** the Lufthansa livery shown on 7 February 2018 on the Boeing 747-8 D-ABYA (first commercial flight
LH400 Frankfurt – New York;
[AirlineGeeks, 2018-02-11](https://airlinegeeks.com/2018/02/11/lufthansas-first-transatlantic-flight-in-its-new-livery/)).
It replaced the 1988 scheme (a blue fin with a yellow disc: see the D-AIUB and D-AISD photos named below). The
parts, all seen on the photos of section 2:

- a **white** fuselage all round: no cheatline, no grey belly, no belly title;
- a **dark blue** fin, and the same blue wrapped round the rear fuselage. Its front edge is one straight line that
  continues the fin's leading edge down to the keel. Its aft edge continues the fin's trailing edge. The tail cone
  aft of it is white again;
- a white **crane in a thin white ring** on both sides of the fin;
- **"Lufthansa"** in dark blue above the windows, just aft of door 1, on both sides;
- small dark blue crane roundels below the cockpit windows and on the wingtip devices;
- one small **yellow** panel beside each forward boarding door on the left side: the only yellow left;
- white engine nacelles with no marking;
- light grey wings and tailplane.

**Which aircraft wear it.** New aircraft come in it (the whole A321neo and A320neo fleet: D-AIEA is in it on
2020-01-26). Older aircraft were repainted over years, so the old scheme still flew next to it for a long time:

- D-AIUB: old scheme on 2019-05-31 (Commons "Tail of D-AIUB, Frankfurt Airport 2019.jpg", viewed, not stored; it
  already had the new roundel on the Sharklet), new scheme on 2024-05-01.
- D-AIUM: old scheme on 2022-11-02 (Commons "D-AIUM of Lufthansa 2022-11-02.jpg", preview viewed), new scheme on
  2024-08-13 (Commons, André Gerwing ID 021586, preview viewed) and on 2025-10-11.
- D-AISD: old scheme on 2023-08-12 (Commons "D-AISD A321 Lufthansa ARN 01.jpg", viewed, not stored), new scheme
  in its current planespotters photo.

All ten tracked airframes show the 2018 scheme in their current planespotters.net photo (the API gives no date):

| Hex | Registration | Type | Scheme | Evidence |
|---|---|---|---|---|
| 3c6664 | D-AISD | A321-231 | 2018 | `ps-3c6664-1923576.jpg` |
| 3c6676 | D-AISV | A321-231 | 2018 | `ps-3c6676-1947594.jpg`; `commons-D-AISV_right_2026-03-05.jpg` |
| 3c6648 | D-AIRH | A321-131 | 2018 | `ps-3c6648-1866923.jpg`; `commons-D-AIRH_left_2024-05-11.jpg` |
| 3c666b | D-AISK | A321-231 | 2018 | `ps-3c666b-1926928.jpg` |
| 3c66ad | D-AIUM | A320-214 (Sharklets) | 2018 | `ps-3c66ad-1910543.jpg`; `commons-D-AIUM_3q-rear-left_2025-10-11.jpg` |
| 3c66a8 | D-AIUH | A320-214 (Sharklets) | 2018 | `ps-3c66a8-1934111.jpg`; `commons-D-AIUH_3q-front-right_2023-05-04.jpg` |
| 3c66a6 | D-AIUF | A320-214 (Sharklets) | 2018 | `ps-3c66a6-1891741.jpg`; `commons-D-AIUF_3q-front-left_2023-10-30.jpg` |
| 3c66a2 | D-AIUB | A320-214 (Sharklets) | 2018 | `ps-3c66a2-1982940.jpg`; `commons-D-AIUB_right_2024-05-01.jpg` |
| 3c64a8 | D-AIEH | A321-271NX | 2018 | `ps-3c64a8-1953183.jpg`; `commons-D-AIEH_3q-front-right_2022-07-15.jpg` |
| 3c64aa | D-AIEJ | A321-271NX | 2018 | `ps-3c64aa-1991372.jpg`; `commons-D-AIEJ_below-left_2024-10-11.jpg` |

**Widebodies** wear the same scheme, built the same way: A350-900 (D-AIXA, 2026-02-18), Boeing 787-9 (D-ABPD,
2026-04-12), Boeing 747-400 (D-ABVW, 2026-03-08) are stored. Previews of an A330-300 (D-AIKD, 2018-09-30) and of
the 747-400 D-ABVU (2026-03-05) were viewed and show it too. Every widebody photo I saw shows the **right** side.

**Specials seen (not this dossier's scheme; their photos are not stored):**

- "**Fanhansa**" in place of "Lufthansa", everything else standard: D-AIEH on
  2024-11-03 and D-AIEO on 2024-06-23 (Commons, both viewed). D-AIEH is a tracked airframe; its current
  planespotters photo reads "Lufthansa" again. Paint it standard.
- D-AIEM on 2026-07-02 (Commons "D-AIEM AIRCRAFT Airbus A321-271NX -1a.jpg", viewed): an anniversary scheme with a
  large outline "100", photo panels along the windows and a small "Lufthansa" below the windows. The tail is
  standard. D-AIEM is not tracked.

---

## 2. Reference images

40 files: 10 planespotters.net thumbnails (the app's photo source, reference only), 24 photos from Wikimedia
Commons (the 1920 px copies) and 6 crops that I cut from larger copies of four of those Commons files. The type is
in `refs.json` too.

| File | View | Reg. | Type | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|---|
| `ps-3c6664-1923576.jpg` | right side | D-AISD | A321-231 | https://www.planespotters.net/photo/1923576/d-aisd-lufthansa-airbus-a321-231 | Gerrit Griem | reference only (planespotters.net) | not given |
| `ps-3c6676-1947594.jpg` | left side | D-AISV | A321-231 | https://www.planespotters.net/photo/1947594/d-aisv-lufthansa-airbus-a321-231 | Rui Marques™ | reference only (planespotters.net) | not given |
| `ps-3c6648-1866923.jpg` | right side | D-AIRH | A321-131 | https://www.planespotters.net/photo/1866923/d-airh-lufthansa-airbus-a321-131 | Eduardo Seijo | reference only (planespotters.net) | not given |
| `ps-3c666b-1926928.jpg` | 3/4 front left | D-AISK | A321-231 | https://www.planespotters.net/photo/1926928/d-aisk-lufthansa-airbus-a321-231 | Cornelius Grossmann | reference only (planespotters.net) | not given |
| `ps-3c66ad-1910543.jpg` | right side | D-AIUM | A320-214 | https://www.planespotters.net/photo/1910543/d-aium-lufthansa-airbus-a320-214-wl | Kim Philipp Piskol | reference only (planespotters.net) | not given |
| `ps-3c66a8-1934111.jpg` | right side | D-AIUH | A320-214 | https://www.planespotters.net/photo/1934111/d-aiuh-lufthansa-airbus-a320-214-wl | Rickard Andersson | reference only (planespotters.net) | not given |
| `ps-3c66a6-1891741.jpg` | 3/4 front left | D-AIUF | A320-214 | https://www.planespotters.net/photo/1891741/d-aiuf-lufthansa-airbus-a320-214-wl | Zoltán Gyurka | reference only (planespotters.net) | not given |
| `ps-3c66a2-1982940.jpg` | right side | D-AIUB | A320-214 | https://www.planespotters.net/photo/1982940/d-aiub-lufthansa-airbus-a320-214-wl | Rafal Pruszkowski | reference only (planespotters.net) | not given |
| `ps-3c64a8-1953183.jpg` | 3/4 front right | D-AIEH | A321neo | https://www.planespotters.net/photo/1953183/d-aieh-lufthansa-airbus-a321-271nx | Simon Prechtl | reference only (planespotters.net) | not given |
| `ps-3c64aa-1991372.jpg` | right side | D-AIEJ | A321neo | https://www.planespotters.net/photo/1991372/d-aiej-lufthansa-airbus-a321-271nx | András Soós | reference only (planespotters.net) | not given |
| `commons-D-AIEF_left_2022-09-17.jpg` | left side (the master) | D-AIEF | A321neo | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_%E2%80%98D-AIEF%E2%80%99_Lufthansa_(53696911603).jpg | Alan Wilson | CC BY-SA 2.0 | 2022-09-17 |
| `commons-D-AIEK_left_2022-12-06.jpg` | left side | D-AIEK | A321neo | https://commons.wikimedia.org/wiki/File:D-AIEK_of_Lufthansa_2022-12-06.jpg | Moritz 2011 | CC BY-SA 4.0 | 2022-12-06 |
| `commons-D-AIEP_left_2023-06-11.jpg` | left side (take-off run, low warm sun) | D-AIEP | A321neo | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Lufthansa_Airbus_A321-271NX_D-AIEP_(DSC09823).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-06-11 |
| `commons-D-AIEA_left_2020-01-26.jpg` | left side (overcast; German flag only) | D-AIEA | A321neo | https://commons.wikimedia.org/wiki/File:Lufthansa_-_Airbus_A321neo_in_Reykjavik_(Quintin_Soloviev).jpg | Quintin Soloviev | CC BY-SA 4.0 | 2020-01-26 |
| `commons-D-AIRH_left_2024-05-11.jpg` | left side (climbing; yellow panels at doors 1 and 2) | D-AIRH | A321-131 | https://commons.wikimedia.org/wiki/File:Lufthansa,_D-AIRH,_Airbus_A321-131_(53760932060).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-05-11 |
| `commons-D-AIEL_3q-front-left_2022-05-28.jpg` | 3/4 front left | D-AIEL | A321neo | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Lufthansa_Airbus_A321-271NX_D-AIEL_(DSC02633).jpg | MarcelX42 | CC BY-SA 4.0 | 2022-05-28 |
| `commons-D-AIUF_3q-front-left_2023-10-30.jpg` | 3/4 front left | D-AIUF | A320-214 | https://commons.wikimedia.org/wiki/File:Hannover_Airport_Lufthansa_Airbus_A320-214(WL)_D-AIUF_(DSC02876).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-10-30 |
| `commons-D-AIEL_3q-front-left_2026-06-09.jpg` | 3/4 front left (in flight; the newest photo) | D-AIEL | A321neo | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_10715,_D-AIEL)_2026-06-09_Andre_Gerwing_Collection_ID_029491.jpg | André Gerwing | CC BY-SA 4.0 | 2026-06-09 |
| `commons-D-AIUB_right_2024-05-01.jpg` | right side (about 20° from the front, see above) | D-AIUB | A320-214 | https://commons.wikimedia.org/wiki/File:Hannover_Airport_Lufthansa_Airbus_A320-214(WL)_D-AIUB_(DSC06243).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-05-01 |
| `commons-D-AISV_right_2026-03-05.jpg` | right side (in flight, long lens) | D-AISV | A321-231 | https://commons.wikimedia.org/wiki/File:D-AISV_AIRCRAFT_Airbus_A321-231_(1).jpg | Sg1959 | CC BY-SA 4.0 | 2026-03-05 |
| `commons-D-AIEM_3q-front-right_2023-05-02.jpg` | 3/4 front right | D-AIEM | A321neo | https://commons.wikimedia.org/wiki/File:Frankfurt_Airport_Lufthansa_Airbus_A321-271NX_D-AIEM_(DSC08712).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-05-02 |
| `commons-D-AIEF_3q-front-right_2023-05-03.jpg` | 3/4 front right | D-AIEF | A321neo | https://commons.wikimedia.org/wiki/File:Frankfurt_Airport_Lufthansa_Airbus_A321-271NX_D-AIEF_(DSC01382).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-05-03 |
| `commons-D-AIEH_3q-front-right_2022-07-15.jpg` | 3/4 front right (camera high: crown, wing, right Sharklet) | D-AIEH | A321neo | https://commons.wikimedia.org/wiki/File:Hannover_Airport_Lufthansa_Airbus_A321-271NX_D-AIEH_(DSC09587).jpg | MarcelX42 | CC BY-SA 4.0 | 2022-07-15 |
| `commons-D-AIUH_3q-front-right_2023-05-04.jpg` | 3/4 front right (in flight) | D-AIUH | A320-214 | https://commons.wikimedia.org/wiki/File:Frankfurt_Airport_Lufthansa_Airbus_A320-214(WL)_D-AIUH_(DSC02921).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-05-04 |
| `commons-D-AIEC_3q-front-right_2023-05-03.jpg` | 3/4 front right (in flight; German flag only) | D-AIEC | A321neo | https://commons.wikimedia.org/wiki/File:Frankfurt_Airport_Lufthansa_Airbus_A321-271NX_D-AIEC_(DSC00674).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-05-03 |
| `commons-D-AIEL_3q-front-right_2025-07-02.jpg` | 3/4 front right (in flight) | D-AIEL | A321neo | https://commons.wikimedia.org/wiki/File:D-AIEL_A321neo_Lufthansa_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2025-07-02 |
| `commons-D-AIUM_3q-rear-left_2025-10-11.jpg` | 3/4 rear left (at the gate) | D-AIUM | A320-214 | https://commons.wikimedia.org/wiki/File:D-AIUM_at_MUC_20251011.jpg | VynedJ | CC BY 4.0 | 2025-10-11 |
| `commons-D-AIEK_3q-rear-right_2025-07-09.jpg` | 3/4 rear right (in flight: blue under the tail, white tail cone) | D-AIEK | A321neo | https://commons.wikimedia.org/wiki/File:D-AIEK_A321neo_Lufthansa_SCQ_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2025-07-09 |
| `commons-D-AIEJ_below-left_2024-10-11.jpg` | below (left): the white belly | D-AIEJ | A321neo | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_10340,_D-AIEJ)_2024-10-11_Andre_Gerwing_Collection_ID_022219.jpg | André Gerwing | CC BY-SA 4.0 | 2024-10-11 |
| `commons-D-AIEN_below-right_2025-02-17.jpg` | below (right): the white belly, low light | D-AIEN | A321neo | https://commons.wikimedia.org/wiki/File:LH_A321_(D-AIEN),_Frankfurt_(P1033509).jpg | Matti Blume | CC BY-SA 4.0 | 2025-02-17 |
| `commons-D-AINU_engine_2019-05-11.jpg` | engine (right, outboard face), close-up | D-AINU | A320neo | https://commons.wikimedia.org/wiki/File:D-AINU_A320neo_Lufthansa_PW1100G_SCQ.jpg | Bene Riobó | CC BY-SA 4.0 | 2019-05-11 |
| `commons-D-ABVW_right_2026-03-08.jpg` | right side (climbing) | D-ABVW | Boeing 747-400 | https://commons.wikimedia.org/wiki/File:D-ABVW_AIRCRAFT_Boeing_747-430_-1.jpg | Sg1959 | CC BY-SA 4.0 | 2026-03-08 |
| `commons-D-AIXA_AIRCRAFT_Airbus_A350-941_1c_.jpg` | right side (a little from behind) | D-AIXA | A350-900 | https://commons.wikimedia.org/wiki/File:D-AIXA_AIRCRAFT_Airbus_A350-941_(1c).jpg | Sg1959 | CC BY-SA 4.0 | 2026-02-18 |
| `commons-Observation_Point_East_Frankfurt_20260412-P1075153_.jpg` | right side (dusk, not for colour) | D-ABPD | Boeing 787-9 | https://commons.wikimedia.org/wiki/File:Observation_Point_East,_Frankfurt_(20260412-P1075153).jpg | Matti Blume | CC BY-SA 4.0 | 2026-04-12 |
| `commons-D-AIEF_tail_2022-09-17.jpg` | tail (left), crop of the master | D-AIEF | A321neo | as the master | Alan Wilson | CC BY-SA 2.0 | 2022-09-17 |
| `commons-D-AIEF_forward-fuselage_2022-09-17.jpg` | forward fuselage (left), crop of the master | D-AIEF | A321neo | as the master | Alan Wilson | CC BY-SA 2.0 | 2022-09-17 |
| `commons-D-AIEF_winglet_2022-09-17.jpg` | winglet (left, outer face), crop of the master | D-AIEF | A321neo | as the master | Alan Wilson | CC BY-SA 2.0 | 2022-09-17 |
| `commons-D-AIEL_engine_2022-05-28.jpg` | engine (left, outboard face), crop | D-AIEL | A321neo | as `commons-D-AIEL_3q-front-left_2022-05-28.jpg` | MarcelX42 | CC BY-SA 4.0 | 2022-05-28 |
| `commons-D-AIEH_winglet_2022-07-15.jpg` | winglet (right, outer face), crop | D-AIEH | A321neo | as `commons-D-AIEH_3q-front-right_2022-07-15.jpg` | MarcelX42 | CC BY-SA 4.0 | 2022-07-15 |
| `commons-D-AIUB_tail_2024-05-01.jpg` | tail (right), crop | D-AIUB | A320-214 | as `commons-D-AIUB_right_2024-05-01.jpg` | MarcelX42 | CC BY-SA 4.0 | 2024-05-01 |

Missing views: no photo from straight below, no photo of a Sharklet's inner face closer than the far wing of the
side views, no left side of a widebody.

---

## 3. Colours

Lufthansa does not publish paint values. Sources for the brand colours are second-hand: the logo file from
Lufthansa's style guide on Commons is filled **#0A1D3D**; write-ups of lufthansa.com's styling give navy
**#05164D** and yellow **#FFAD00** (unofficial). Photo samples are medians of boxes on flat areas.

| Paint | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **Blue** (fin, rear fuselage, title, roundels) | **#0E1C4B** | Sunlit samples, hue 225–233°: fin #111636 and rear fuselage #121B48, #1D294F (`D-AIEF_left`); fin #121A3A, rear fuselage #171D42 (`D-AIEC_3q-front-right`); #131530, #141736 (`D-AIUH_3q-front-right`); #1C2340, #172244 (`D-ABVW_right`); #040D35 (`D-AIUB_right`, a contrasty photo). Title letters: #131839 (`D-AIEF_left`), #020C35 (`D-AIUB_right`): the same paint as the tail. The paint is glossy and very dark: it mirrors the sky, so the samples run from near-black to mid navy. #0E1C4B has the photos' hue (226°) at the bright end of the sunlit samples, between the photo median #121738 and the web navy #05164D. | Medium-high for the hue, medium for the lightness. #05164D is a fair alternative. |
| **White** (fuselage, nacelles, Sharklets, tail cone) | **#F4F5F6** | #F5F6F9 above the windows, #F1F1F3 below (`D-AIEF_left`); #F0F0F2 (`D-AISV_right`); #EAE9E5 (`D-AIEM_3q-front-right`); #E9EFF2 (`D-AIEH_3q-front-right`, overcast). | High. A neutral, bright white. |
| **Yellow** (door panel) | **#FAB41E** | #FAB424 (`D-AIEF_left`, sun), #FDB51C (`D-AIEP_left`), #F1B109 (`D-AIEL_3q-front-left_2022-05-28`, overcast), #FED43F (`D-AIUF_3q-front-left`). Web yellow #FFAD00. | High. |
| **Wing grey** | **#B9BCC0** | Upper surface #B4B4B4–#C0BFC1 beside a fuselage at #E9EFF2 (`D-AIEH_3q-front-right`, overcast). The standard Airbus grey, not a Lufthansa colour. | Medium-low. |
| **Tailplane** | **#C4C8CC** | Upper surface #C3C6CD–#C7CCD3 (`D-AIEH_3q-front-right`): a little lighter than the wing. Underside light grey (`D-AIEK_3q-rear-right`). | Low. |
| **Sharklet leading-edge band** | **#AEB2B7** | #A8A9B1–#B6B8BD beside the blade at #DEE1E2 (`D-AIEF_left`). | Medium. |
| **Inlet lip** (bare metal) | **#A7A8AC** | #979596 in shade (`D-AIEH_3q-front-right`); a matt grey ring in `D-AINU_engine`. | Medium. |
| **Exhaust, APU nozzle** | **#6E7074** | Dark metal in `D-AIEL_engine` and `D-AIEK_3q-rear-right`. | Low (an estimate). |
| **Registration** | **#101014** | Darkest tenth of the letters #010005 (`D-AIEF_left`): black or nearly so, not the title's blue. | Medium. |

---

## 4. Elements (side elevation)

Landmarks measured on the master (A321neo):

| Landmark | z (m) | h (m) | Pixels in the master |
|---|---|---|---|
| Cockpit windows with their black surround | 1.17 – 3.22 | 2.29 – 3.28 | x 125–205, y 595–635 |
| Door 1 | 4.44 – 5.45 | 1.53 – 3.59 | x 253–292, y 583–664 |
| Window row | | 2.44 – 2.72 | y 617–629 |
| Rear door (door 4) | 36.31 – 37.23 | 1.53 – 3.52 | x 1500–1537, y 586–664 |
| Fin: blue edge of the leading edge at the crown | 37.37 | 4.14 | x 1542, y 562 |
| Fin: trailing edge at the crown | 42.53 | 4.14 | x 1744, y 562 |
| Fin tip (leading / trailing corner) | 42.18 / 43.97 | 9.87 | x 1730 / 1800, y 338 |
| Tail-cone tip | 44.51 | | x 1822 |

**Fuselage base:** white #F4F5F6 over everything forward of the blue: radome, crown, sides, belly and belly
fairing. There is no belly line, no cheatline, no pinstripe (`D-AIEJ_below-left`, `D-AIEN_below-right`,
`D-AIEK_3q-rear-right`).

**The blue zone** is the fin carried down through the fuselage. Both edges are straight lines in side elevation.

- **Front edge:** the blue edge of the fin's leading edge, continued down to the keel. On the master one line,
  x = 1703.5 − 0.841·(y − 370), fits the edge from the fin (y 350) to the lower fuselage (y 696) within 2.2 px
  (0.06 m): 25 of 28 scanned rows (dropped: one row where a background object touches the fin, two rows at the
  door's outline). In metres, A321neo: **z = 33.89 + 0.841·h**: keel **z 33.9**, window row z 36.1,
  crown **z 37.4**, fin tip z 42.2. A320: **z = 26.95 + 0.841·h** (keel 27.0, crown 30.4). The line leans 40°
  from the vertical. It crosses the rear door: the door's upper forward corner is white, the rest of the door is
  blue. The registration and the flags stay in the white, about 1 m ahead of it. At the very bottom the edge turns
  forward faster in the photos, because the belly curves away; the model's projection does that by itself.
- **Aft edge:** the fin's trailing edge, continued down across the tail cone. On the master
  x = 1792.4 − 0.251·(y − 370) fits it from y 350 to y 638 within 4.2 px (20 of 24 scanned rows; the others hit
  the tailplane or the background). A321neo: **z = 42.53 − 0.251·(4.14 − h)**: z 42.5 at the crown, about z 42.0
  at the cone's underside. A320: 6.94 m less. So the last 2.0–2.5 m of the tail cone are white, with the
  bare-metal APU nozzle (the last 0.3 m) at the tip.
- The blue goes all round between the two lines, under the belly too (`D-AIEK_3q-rear-right`).
- Both sides are the same (`D-AIUB_tail`, `D-AISV_right` and the Commons photo of D-AIEO, right side, viewed: the
  line cuts the same corner of the right rear door).
- In photos that are not side-on the front edge looks bent (bowed aft from in front, bowed forward from below).
  That is the viewpoint: a straight line in the side drawing is right.

**Fin:** blue #0E1C4B on both sides, tip cap and rudder too. A thin **white strip** runs along the leading edge
from the root fairing to the tip, about **0.09 m** wide in side view (3 to 4 px on the master; `D-AIEF_tail`,
`D-AIUB_tail`). The curved fairing where the leading edge meets the crown is white.

**Fin art:** the crane in its ring, white, the 2018 logo with the thin ring (stroke 3 % of the diameter).

- Outer diameter **2.91 m** (master: 114 px; `D-AIUB_right`: 139 px high at 47.7 px/m = 2.91 m).
- Centre at **z 41.05, h 5.69** on the A321neo (master x 1686, y 501); A320 z 34.11. That is **1.55 m above the
  crown line**, 27 % of the fin's height (5.73 m from crown to tip), and 56 % of the local chord back from the
  leading edge. The ring takes 68 % of the chord at its height. It lies across the rudder hinge.
- The crane **flies towards the nose on both sides**: the logo as drawn on the left, mirrored on the right
  (`D-AIEF_tail` against `D-AIUB_tail`).

**Title "Lufthansa"** (the 2018 wordmark, dark blue #0E1C4B), on both sides:

- Box of the ink in side view: **z 5.95 – 12.16** (6.2 m long), **h 2.92 – 3.79** (0.87 m high; the capitals are
  0.84 m). Master: x 312–555, y 575.5–609.5.
- It starts **0.55 m aft of door 1's aft edge** (0.56 m on the master, 0.46 m on `D-AIUB_right`, 0.66 m on
  `D-AISV_right`). Its lower edge is **0.34 m above the window centres** (0.2 m above the glass), its top 1.21 m
  above them, 0.2 m higher than the top of door 1.
- The same size on the A320: 11.5 window pitches long on both the master and `D-AIUB_right`.
- The wordmark file is 6.03 : 1; on the photos the box is 7.15 : 1, because the letters lie on the shoulder of
  the fuselage and the side view shortens them. Stretch the file to the box.
- **Left side:** the "L" is next to door 1. **Right side:** the same box; the text still reads left to right,
  so the "L" is at the aft end and the last "a" is next to door 1. Not mirrored.

**Yellow panel:** a rectangle of yellow #FAB41E touching the aft edge of door 1, at the window row, **left side only**:
0.22 m long, 0.35 m high: z 5.44 – 5.66, h 2.43 – 2.77 (master x 292–300.5, y 615.5–629). The classic A321 with a
door 2 ahead of the wing has a second one aft of that door (`D-AIRH_left`). The A321neo has only the one
(a search of the master's whole fuselage band finds no other yellow but the flag's). None on the right side
(`D-AIUB_right`: no yellow pixel beside door 1).

**Crane roundel below the cockpit:** the crane in its ring in dark blue on the white, **0.56 m** across, both
sides, the crane flying towards the nose. Centre **z 2.93, h 1.68** (master x 183–204.5, y 647.5–669): below the
aft cockpit window, 0.9 m below the window-row line and 1.5 m ahead of door 1.

**Small markings** (skip, or draw last):

- The Star Alliance symbol in grey between the cockpit windows and door 1, at window height (z about 3.6 – 4.0).
- The type and the aircraft's name in two lines of dark text below the windows aft of door 1 ("Airbus A321neo /
  Forchheim": z 5.95 – 7.34, h 1.62 – 1.93), with the town's arms beside it. On the right side it is right-aligned
  towards door 1.
- The registration, 0.28 m high, below the windows ahead of the blue (z 31.7 – 33.0, h 1.69 – 1.97 on the
  A321neo), then the German flag (0.50 × 0.28 m) and the EU flag (0.45 × 0.28 m) towards the tail, on both
  sides. D-AIEA and D-AIEC carry the German flag only.
- Door outlines: thin grey on the white, thin white on the blue.

**Tailplane:** light grey #C4C8CC above and below, no livery colour. Where it crosses the blue the fuselage
behind it is blue.

**Wings:** light grey #B9BCC0. The flap-track fairings and the pylons are a paler grey-white
(`D-AIEH_3q-front-right`, `D-AIEL_engine`).

**Engine nacelles:** white #F4F5F6 all round, on every face of both engines, **with no title and no logo** (only
small stencils). The inlet lip is a bare matt-metal ring about 0.15 m deep. The exhaust nozzle and plug are dark
metal. Seen on the PW1100G of the neos (`D-AIEL_engine`, `D-AINU_engine`), on the CFM56 of the A320
(`D-AIUF_3q-front-left`) and on the V2500 of the A321 (`D-AISV_right`).

**Wingtip devices (Sharklets):**

- White on both faces, from the curved knee to the tip. A light grey band #AEB2B7 runs along the leading edge,
  about a fifth of the chord.
- A **crane roundel** in dark blue, **0.50 m** across, on the blade's lower part: its centre is 0.66 m above the
  bottom of the knee (a quarter of the device's 2.5 m height) and 41 % of the chord back from the leading edge
  (master x 1120.5–1139.5, y 607.5–626.5).
- It is on the **outer face** of both Sharklets (`D-AIEF_winglet`, `D-AIEH_winglet`, `D-AIEK_3q-rear-right`) and
  on the **inner face** (the far Sharklet in `D-AIEF_winglet` and in `D-AIEC_3q-front-right`). On the outer faces
  the crane flies towards the nose. On the inner faces the photos are too small to see which way.
- The small wingtip fences of the older A320 and A321 are plain white (`D-AISV_right`).

**Widebodies** (right sides only; rough numbers from photos that are not side-on):

- The same construction: white fuselage, the blue from the fin's leading-edge line and trailing-edge line carried
  down to the keel, a white tail cone behind it (`D-AIXA…`, `D-ABVW_right`; on the 787 the cone is hidden).
  On the A350 the front edge runs close behind door 4; on the 787 door 4 is in the blue.
- The title grows with the fuselage: on the 787-9 about 8.9 m long and 1.07 m high, that is 1.5 fuselage heights
  long, as on the A320 family (6.2 / 4.14). It sits above the windows aft of door 1 (about 1.3 m behind it on the
  787). On the 747-400 it sits between the two window rows.
- White nacelles and white winglets (A350, 747-400); the A350's winglet shows the roundel.

---

## 5. Side-elevation drawing steps

1. **Fill** fuselage and fin white #F4F5F6.
2. **Blue:** fill #0E1C4B between two straight lines, from below the keel to the fin tip:
   front line through (z 33.89, h 0) and (z 37.37, h 4.14) on the A321neo; aft line through (z 42.53, h 4.14)
   with z falling 0.251 m per metre down. On any model: take the fin's leading edge and trailing edge from the
   profile and continue both lines down past the keel. The fin itself is blue up to the tip.
3. **Leading-edge strip:** a white line 0.09 m wide along the fin's leading edge. The front line of step 2 is the
   aft side of this strip.
4. **Fin art:** `crane-white.svg`, 2.91 m across, centre 1.55 m above the crown line and 56 % of the chord back
   from the leading edge (A321neo z 41.05, h 5.69). Facing forward on both sides (`mirror: true`).
5. **Title:** `title.svg` stretched to the box z 5.95 – 12.16, h 2.92 – 3.79 (from 0.55 m aft of door 1; from
   0.34 m to 1.21 m above the window row). The same box on both sides, not mirrored. On a widebody: 1.5 fuselage
   heights long, 0.21 fuselage heights high.
6. **Yellow panel**, left side only: #FAB41E, z 5.44 – 5.66 (from door 1's aft edge, 0.22 m long),
   h 2.43 – 2.77. On a model with a door 2 ahead of the wing, one more aft of that door.
7. **Cockpit roundel:** `crane-blue.svg`, 0.56 m across, at z 2.93, h 1.68 (1.5 m ahead of door 1, 0.9 m below the
   window row), facing forward on both sides.
8. **APU nozzle:** the last 0.3 m of the tail cone #6E7074.
9. Skip the registration, the flags, the Star Alliance symbol and the name, or draw them from section 4.

**Flat colours:** wings #B9BCC0, tailplane #C4C8CC.

**Nacelle artwork:** white #F4F5F6; the inlet-lip ring #A7A8AC (the front 0.15 m); nothing else.

**Wingtip artwork:** white #F4F5F6; a leading-edge band #AEB2B7 over the first fifth of the chord;
`crane-blue.svg` 0.50 m across, a quarter of the way up, 41 % of the chord back, on both faces, facing forward.

---

## 6. Logos and wordmarks

| Graphic | Commons file | Licence on Commons (read through the API on 2026-10-13) | In `liveries/DLH/` | Use |
|---|---|---|---|---|
| **"Lufthansa" wordmark** (2018) | https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018.svg (author Lufthansa Group, from the style guide downloads, 2018-02-06) | `{{PD-textlogo}}` + `{{Trademark}}`: public domain, trademarked | `title.svg`: the eleven letter subpaths only, path data unchanged, cropped to the letters, recoloured #0A1D3D → #0E1C4B | The fuselage title. Plain letters: a safe PD-textlogo. |
| **Crane in a ring** (2018) | https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018_crane.svg (author Lufthansa Group, 2018-02-06) | `{{PD-textlogo}}` + `{{Trademark}}`: public domain, trademarked | `crane-white.svg` (fin) and `crane-blue.svg` (roundels): path data unchanged, size and fill set | Fin art and roundels. **Read the note below.** |

**The crane's licence.** Commons holds the crane as public domain (below the threshold of originality), and both
file pages carry that tag today. The tag is disputed on Commons and has not been tested:

- The deletion request for "File:Miles & More Lufthansa Logo.svg" (opened 2022-12-18: "the Lufthansa crane logo is
  clearly NOT public domain") was closed as **kept** on 2023-01-12, as a derivative of the 2018 logo file, with
  the remark "Will need a broader discussion if above TOO."
- A category discussion of February 2025 ("Crane logo is above TOO") was closed in October 2025 without a
  decision: no deletion request was filed.
- The crane is a drawing, not letters (Otto Firle, 1918; he died in 1966), so the public-domain claim rests only
  on the threshold of originality.

By the project's rule (a public-domain file from Commons, licence read on the file page) the two crane files may
be used, and they are in the folder. If the project wants no risk, replace them with a ring drawn with
`k.stroke` and leave the bird out; the title does not have this problem.

The Star Alliance symbol and the towns' arms: not fetched, not needed.

---

## 7. Fonts

None needed: the title is the wordmark file. Lufthansa's own typeface (used for the type and name line) is not
free. If the small texts are ever drawn, typeset them in an OFL grotesque (for example Inter SemiBold) and add the
font file and its licence to the folder and to `sources.json`.

---

## 8. Confidence and open questions

- **High:** the scheme and its parts; that it is the same on both sides apart from the yellow panel and the
  reading direction; white nacelles with no marking; the white tail cone; that all ten tracked airframes wear it.
- **High:** the blue's two edges are the fin's edge lines continued (measured on the master, seen in every side
  view of both sides).
- **Positions on the A321neo:** within ±0.15 m in z and ±0.08 m in h on the master. One master only: a second
  true side elevation was not found among the free photos.
- **Positions on the A320:** derived from the A321neo (same nose and tail sections), checked by eye and by ratios
  on `D-AIUB_right`. Not measured on a true side view. Likely within ±0.3 m.
- **Blue:** the hue is safe; how light to make it is a choice between #05164D, #0E1C4B and the darker photo median
  #121738.
- **Wing and tailplane greys:** estimates from one overcast photo.
- **Sharklet inner face:** the roundel is there, but its exact place and the crane's direction are not measured.
- **Widebodies:** only right sides, none side-on. Title size and place are rough. Whether widebodies have yellow
  panels at their left boarding doors was not seen. The 787's tail cone colour was not seen.
- **Crane licence:** see section 6.
- **Planespotters dates:** the API gives none, so "current" means the photo the API serves today.

Sources consulted: Wikimedia Commons (the files above, the category "Lufthansa livery (2018–)", the per-aircraft
categories, the two discussions named in section 6); the planespotters.net public API;
[AirlineGeeks, 2018-02-11](https://airlinegeeks.com/2018/02/11/lufthansas-first-transatlantic-flight-in-its-new-livery/)
and [aviation24.be](https://www.aviation24.be/airlines/lufthansa-group/lufthansa/will-new-livery-lufthansa-2018/)
(the 2018 introduction); [brandpalettes.com](https://brandpalettes.com/lufthansa-airlines-logo-colors/) and the
lufthansa.com style write-up at [shadcn.io](https://www.shadcn.io/design/lufthansa) (colour values, unofficial).

---

## 9. Lab check (2026-10-14)

Rendered on the A320neo, A321, A350-900, 747-400 and A340-300 and compared with the photos, view by view. Three rounds.
What the lab showed and what changed in `design.ts`:

- **Fixed:** a grey strip ran down the fin's trailing edge above the tail cone. The APU nozzle's box had no height
  limit. It now covers only the tail cone's tip.
- **Fixed:** the 747's title, roundels and flags were 25 % too large, because the hump made the fuselage look 8 m
  high. A double-deck's height now comes from the body's width (6.5 m). Its cockpit windows now sit on the hump.
- **Added:** the Star Alliance star as a thin grey outline (a plain star, not the logo), 0.65 m ahead of door 1,
  about 0.4 m across, on both sides. The cockpit windows grow less than the fuselage on the wide bodies.
- **Matches the photos:** the blue's front edge and its aft edge, the white tail cone, the crane in its ring, the
  title (text, size, place; it reads correctly on the right side, the "L" at the aft end), the yellow panel, the
  flags, the roundels on the nose and the Sharklets, the white engines, the white belly.
- **Still differs:** the shader's window row starts inside door 1 on the A320 family (the model's window range),
  and its windows are square. On the A350 and A340 a few black marks show on the white side near the wing and the
  rear door; they are on the model and appear in other airlines' paint too. The registration and the aircraft's name
  are not drawn.
