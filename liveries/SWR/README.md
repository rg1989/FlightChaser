# Swiss International Air Lines (SWR): livery dossier, the scheme worn today

Research date: 2026-10-13. Refs folder: `data/livery-refs/SWR/` (git-ignored). Paths that start with `commons/`,
`ps/` or `not-current/` are relative to that folder. I looked at each photo (the full frame, then zoomed crops with a
pixel grid). I measured the positions and the colours from the pixels.

Types covered: Airbus A320 family (A320, A320neo, A321, A321neo), Airbus A220-100 and -300, Airbus A330-300,
Boeing 777-300ER. All wear one scheme. The sizes differ per type: section 4 gives them per type.

Coordinate convention (side elevation, the same for both sides):

- **z** = metres aft of the nose tip.
- **h** = metres above the keel of the constant-section fuselage.
- **wY** = the height of the cabin window centres (the kit's `k.a.windowY`). The title is placed by it.
- **crown** = the top line of the constant-section fuselage. The fin art is placed by it.

Scale sources. Lengths along the fuselage were also counted in cabin window pitches (0.533 m on the Airbus types and
on the 777), because a photo taken a little ahead of abeam shortens lengths and moves the door away from the nose.

| Type, side | Master photo | Scale | Check |
|---|---|---|---|
| A320neo, right | `commons/HB-JDG_a20n_right_2024-06-15.jpg` (1200 px) | 30.1 px/m | Nose tip x 1167, APU tip x 40: 1127 px = 37.57 m. Window pitch 16.1 px. Fuselage 124 px = 4.12 m. True side-on: door 1 starts 7.95 window pitches aft of the nose tip. Camera about 5° above the fuselage centreline. `commons/HB-JDD_a20n_right_2024-06-16.jpg` gives the same numbers. |
| A320neo, left | `commons/HB-JDA_a20n_left_2023-08-13.jpg` (1920 px) | 47 px/m | Nose tip x 72, APU tip x 1812. Window pitch 25.4 px. True side-on (door 1: 8.07 pitches). Wet and overcast: the reds look brown, do not sample colours here. |
| A320neo, left, sunlit | `commons/HB-JDC_a20n_left-20deg_2023-06-11.jpg` (1920 px) | 47.3 px/m along the fuselage, 50 px/m up | About 20° ahead of abeam (the fin cross is 119 px wide and 130 px high). Good for colours and for close-ups. Not for z from the nose. |
| A321neo, right | `commons/HB-JPE_a21n_right_2025-06-27.jpg` (measured on the 4532 px original; the stored copy is 1920 px) | 88.9 px/m | Window pitch 47.4 px. About 15° ahead of abeam. Fuselage 368 px = 4.14 m. |
| A220-300, left | `commons/HB-JCJ_bcs3_left_2026-10-07.jpg` | 42.5 px/m | Nose tip x 121, tail cone x 1765: 1644 px = 38.71 m. |
| A220-300, right | `commons/HB-JCN_bcs3_right_2026-10-07.jpg` | 43.5 px/m | Nose tip x 1777, tail cone x 94. The frame leans about 1.7°. |
| A330-300, right | `commons/HB-JHH_a333_right_2026-04-18.jpg` | 29.1 px/m | Window pitch 15.5 px. Nose tip x 1897. Fuselage about 165 px = 5.7 m. True side-on. |
| A330-300, left | `commons/HB-JHL_a333_left-20deg_2026-02-20.jpg` | 29.1 px/m between doors 1 and 2 | About 20° ahead of abeam. Sunlit: good for colours. |
| 777-300ER, right | `commons/HB-JNH_b77w_right_2026-04-18.jpg` | 25.1 px/m | Nose tip x 1898, tail cone x 69: 1829 px = 73.1 m. Fuselage 156 px = 6.2 m. True side-on. |
| 777-300ER, left | `commons/HB-JNH_b77w_left_2026-10-07.jpg` | 21.5 px/m | From door 1 to door 2 (9.02 m on the right master). |

---

## 1. Identity

**Scheme:** the SWISS livery in use since January 2012. SWISS showed its new logo (a tail fin with the Swiss cross,
beside the word SWISS) in August 2011. The first aircraft in the matching livery was the A330-343 HB-JHK, delivered on
11 January 2012 (World Airline News, 15 January 2012: larger red titles that overlap the window line, the airline name
in four languages dropped, red tail with the white cross kept). The scheme before it (2002 to 2011) had a small
lowercase "swiss" title, the four names beside it and red squares on the engines: see `not-current/`.

The parts, seen on every stored photo of the current scheme:

- an all-white fuselage, belly included. No cheatline, no belly colour, no nose band;
- a large red **SWISS** title on the forward fuselage, across the window row, on both sides;
- a red fin with a white Swiss cross, a white cap at the fin's top and a white band at its foot;
- white engines with no marking;
- white wingtip devices with a red band and a white cross on both faces (the Sharklets of the A320neo, A321neo and
  A321, the winglets of the A220 and of the A330). The wingtip fences of the A320-214 and the raked tips of the 777
  have no marking;
- grey wings and tailplane.

Since 2025 some aircraft also carry a small **"Member of Lufthansa Group"** text above the windows near the rear
door (section 4.8). Lufthansa Group announced it for all its airlines (Horizont, 10 December 2025).

**Operator:** Swiss International Air Lines only (callsign SWR, registrations HB-). Edelweiss Air (EDW) and
Helvetic Airways (OAW) have their own paint. No alias.

**Exceptions:**

- **Star Alliance livery:** the A320-214s **HB-IJM, HB-IJN and HB-IJO** (Commons category "Swiss International Air
  Lines aircraft in Star Alliance livery": HB-IJN photographed in it on 2026-10-07, HB-IJO on 2025-09-24, HB-IJM on
  2023-06-18). No free artwork: paint them in the standard scheme.
- **A350-900 HB-IFA:** a special livery called "Wanderlust" (Commons file "SWISS A350 WANDERLUST ZURICH AIRPORT
  ZRH.jpg"; AirlineGeeks, 27 June 2025). The A350 is not covered by this dossier.
- Other special liveries were not searched.

The eight tracked aircraft all wear the standard scheme in their current planespotters photo:

| Hex | Registration | Type | Scheme | Evidence |
|---|---|---|---|---|
| 4b191f | HB-JNJ | 777-3DEER | standard | `ps/HB-JNJ.jpg`; `commons/HB-JNJ_b77w_below_2026-09-29.jpg` |
| 4b191d | HB-JNH | 777-3DEER | standard | `ps/HB-JNH.jpg`; `commons/HB-JNH_b77w_right_2026-04-18.jpg`, `commons/HB-JNH_b77w_left_2026-10-07.jpg` |
| 4b1917 | HB-JNB | 777-3DEER | standard | `ps/HB-JNB.jpg` |
| 4b191e | HB-JNI | 777-3DEER | standard | `ps/HB-JNI.jpg`; `commons/HB-JNI_b77w_left_2026-10-07.jpg` |
| 4b187a | HB-JHA | A330-343 | standard | `ps/HB-JHA.jpg` |
| 4b187b | HB-JHB | A330-343 | standard | `ps/HB-JHB.jpg`; `commons/HB-JHB_a333_right_2026-10-07.jpg` |
| 4b1883 | HB-JHJ | A330-343 | standard | `ps/HB-JHJ.jpg`; `commons/HB-JHJ_a333_3q-rear-left_2026-10-07.jpg` |
| 4b1885 | HB-JHL | A330-343 | standard | `ps/HB-JHL.jpg`; `commons/HB-JHL_a333_left-20deg_2026-02-20.jpg` |

---

## 2. Reference images

59 entries in `refs.json`: 8 planespotters thumbnails (`ps/`) and 51 Commons files (`commons/`: 39 photos at 1200 to
1920 px and 12 crops that I cut from the Commons originals). Commons licences, authors and dates come from the
Commons API. The two "2026-03-31" photos carry that date in their file title; the API gives 2026-04-06.

The tool's first run also fetched six photos from "Category:Airbus A320 of Swiss International Air Lines" that show
the 2002 to 2011 scheme or no livery at all (2004, 2011 and 2013 photos). I took them out of `refs.json` and moved
the files to `not-current/`.

The Commons categories that hold the photos are per aircraft: "Category:HB-JDA (aircraft)" and so on, under
"Current Airbus A320neo of Swiss International Air Lines", "Airbus A321neo of ...", "Airbus A220 of ...", "Current
Airbus A330-300 of ...", "Boeing 777 of ...", "Current Airbus A320 of ..." and "Current Airbus A321 of ...". The type
categories themselves hold no files.

| File | View | Registration | Type | Source | Photographer | Licence | Date |
|---|---|---|---|---|---|---|---|
| `ps/HB-JNJ.jpg` | right side (landing) | HB-JNJ | B77W | https://www.planespotters.net/photo/1986503/hb-jnj-swiss-boeing-777-3deer | leeseoya_aviation | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JNH.jpg` | right side (landing, low warm sun) | HB-JNH | B77W | https://www.planespotters.net/photo/1956099/hb-jnh-swiss-boeing-777-3deer | Martin Oswald | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JNB.jpg` | 3/4 front right (parked at night) | HB-JNB | B77W | https://www.planespotters.net/photo/1985670/hb-jnb-swiss-boeing-777-3deer | Kevin | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JNI.jpg` | right side (take-off) | HB-JNI | B77W | https://www.planespotters.net/photo/1975727/hb-jni-swiss-boeing-777-3deer | Marco Wolf | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JHA.jpg` | right side (landing) | HB-JHA | A333 | https://www.planespotters.net/photo/1989370/hb-jha-swiss-airbus-a330-343 | Mingfei S | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JHB.jpg` | 3/4 front right (flying, low warm sun) | HB-JHB | A333 | https://www.planespotters.net/photo/1971581/hb-jhb-swiss-airbus-a330-343 | Clemens Hager | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JHJ.jpg` | 3/4 front left (take-off) | HB-JHJ | A333 | https://www.planespotters.net/photo/1976699/hb-jhj-swiss-airbus-a330-343 | Philipp Greiml | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `ps/HB-JHL.jpg` | left side (take-off) | HB-JHL | A333 | https://www.planespotters.net/photo/1980535/hb-jhl-swiss-airbus-a330-343 | Fabian Behr | reference only (planespotters.net API thumbnail) | unknown (the API gives no date) |
| `commons/A320_left_Bilbao_2019-06-23.jpg` | left side (parked, stairs at the doors; hazy) | not read | A320 | https://commons.wikimedia.org/wiki/File:Swiss_Air_Airbus_A320-200_parked_at_Bilbao_Airport.jpg | Hugh Llewelyn from Keynsham, UK | CC BY-SA 2.0 | 2019-06-23 |
| `commons/HB-JDC_a20n_left-20deg_2023-06-11.jpg` | left side (taxiing; about 20° ahead of abeam, sunlit) | HB-JDC | A20N | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC01042).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-06-11 |
| `commons/HB-JDA_a20n_left_2023-08-13.jpg` | left side (taxiing; true side-on, wet and overcast) | HB-JDA | A20N | https://commons.wikimedia.org/wiki/File:HB-JDA_A320neo_Swiss_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2023-08-13 |
| `commons/HB-JDG_a20n_right_2024-06-15.jpg` | right side (taxiing; true side-on) | HB-JDG | A20N | https://commons.wikimedia.org/wiki/File:Swiss,_HB-JDG,_Airbus_A320-271N_(53814593972).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-06-15 |
| `commons/HB-JDD_a20n_right_2024-06-16.jpg` | right side (taxiing) | HB-JDD | A20N | https://commons.wikimedia.org/wiki/File:Swiss,_HB-JDD,_Airbus_A320-271N_(52661174774).jpg | Anna Zvereva | CC BY-SA 2.0 | 2024-06-16 |
| `commons/HB-JPC_a21n_left_2026-10-07.jpg` | left side (taxiing, distant) | HB-JPC | A21N | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_11298,_HB-JPC)_2026-10-07_Andre_Gerwing_Collection_ID_031482.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JPC_a21n_right_2026-10-07.jpg` | right side (taxiing) | HB-JPC | A21N | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_11298,_HB-JPC)_2026-10-07_Andre_Gerwing_Collection_ID_031483.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JPE_a21n_right_2025-06-27.jpg` | right side (take-off roll; about 15° ahead of abeam) | HB-JPE | A21N | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_(c-n_12436,_HB-JPE)_2025-06-27_Andre_Gerwing_Collection_ID_024290.jpg | André Gerwing | CC BY-SA 4.0 | 2025-06-27 |
| `commons/HB-JDA_a20n_3q-front-left_2026-10-07.jpg` | 3/4 front left (taxiing) | HB-JDA | A20N | https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_9246,_HB-JDA)_2026-10-07_Andre_Gerwing_Collection_ID_031519.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JDJ_a20n_3q-rear-right_2026-10-07.jpg` | 3/4 rear right (taxiing) | HB-JDJ | A20N | https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_12470,_HB-JDJ)_2026-10-07_Andre_Gerwing_Collection_ID_031346.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JDF_a20n_below_2026-03-31.jpg` | below (climbing; left side and belly) | HB-JDF | A20N | https://commons.wikimedia.org/wiki/File:HB-JDF_-_Airbus_A320-271N_-_Swiss_LHR_310326.jpg | kitmasterbloke | CC BY 4.0 | 2026-03-31 |
| `commons/HB-JDB_a20n_3q-front-right_2023-08-13.jpg` | 3/4 front right (parked at the gate) | HB-JDB | A20N | https://commons.wikimedia.org/wiki/File:HB-JDB_A320neo_Swiss_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2023-08-13 |
| `commons/HB-JPB_a21n_right_2022-05-09.jpg` | right side (taxiing) | HB-JPB | A21N | https://commons.wikimedia.org/wiki/File:Airbus_A321-271NX_%E2%80%98HB-JPB%E2%80%99_Swiss_International_Air_Lines.jpg | Alan Wilson | CC BY-SA 2.0 | 2022-05-09 |
| `commons/HB-JDC_a20n_3q-front-left_2022-07-10.jpg` | 3/4 front left (landing) | HB-JDC | A20N | https://commons.wikimedia.org/wiki/File:Berlin_Brandeburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC08519).jpg | MarcelX42 | CC BY-SA 4.0 | 2022-07-10 |
| `commons/HB-JCJ_bcs3_left_2026-10-07.jpg` | left side (taxiing) | HB-JCJ | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_BD-500-1A11_-_CS300_(c-n_55025,_HB-JCJ)_2026-10-07_Andre_Gerwing_Collection_ID_031360.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCN_bcs3_right_2026-10-07.jpg` | right side (taxiing) | HB-JCN | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_220-371_(c-n_55032,_HB-JCN)_2026-10-07_Andre_Gerwing_Collection_ID_031544.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JBI_bcs1_3q-front-left_2026-10-07.jpg` | 3/4 front left (taxiing) | HB-JBI | BCS1 | https://commons.wikimedia.org/wiki/File:Bombardier_BD-500-1A10_-_CS100_(c-n_50018,_HB-JBI)_2026-10-07_Andre_Gerwing_Collection_ID_031488.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCN_bcs3_3q-front-right_2026-10-07.jpg` | 3/4 front right (taxiing) | HB-JCN | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_220-371_(c-n_55032,_HB-JCN)_2026-10-07_Andre_Gerwing_Collection_ID_031543.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCI_bcs3_tail_2026-06-28.jpg` | tail, left side (parked) | HB-JCI | BCS3 | https://commons.wikimedia.org/wiki/File:SWISS_International_Air_Lines_HB-JCI_being_refueled_at_Zurich_airport.jpg | Stimpy | CC BY-SA 4.0 | 2026-06-28 |
| `commons/HB-JCI_bcs3_engine_2026-06-28.jpg` | engine, left, from ahead (parked; wide-angle) | HB-JCI | BCS3 | https://commons.wikimedia.org/wiki/File:SWISS_International_Air_Lines_A220-300_(HB-JCI)_being_refueled.jpg | Stimpy | CC BY-SA 4.0 | 2026-06-28 |
| `commons/HB-JCH_bcs3_below_2026-03-31.jpg` | below (climbing; left side and belly) | HB-JCH | BCS3 | https://commons.wikimedia.org/wiki/File:HB-JCH_-_Airbus_A220-300_-_Swiss_LHR_310326.jpg | kitmasterbloke | CC BY 4.0 | 2026-03-31 |
| `commons/HB-JCC_bcs3_left_2026-05-25.jpg` | left side (taxiing) | HB-JCC | BCS3 | https://commons.wikimedia.org/wiki/File:HB-JCC_Swiss_A220_EGCC.jpg | Oscaracton | CC BY 4.0 | 2026-05-25 |
| `commons/HB-JNH_b77w_left_2026-10-07.jpg` | left side (towed) | HB-JNH | B77W | https://commons.wikimedia.org/wiki/File:Boeing_777-3DEER_(c-n_62753,_HB-JNH)_2026-10-07_Andre_Gerwing_Collection_ID_031379.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JNH_b77w_right_2026-10-07.jpg` | right side (towed) | HB-JNH | B77W | https://commons.wikimedia.org/wiki/File:Boeing_777-3DEER_(c-n_62753,_HB-JNH)_2026-10-07_Andre_Gerwing_Collection_ID_031380.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JNH_b77w_right_2026-04-18.jpg` | right side (taxiing; true side-on) | not read | B77W | https://commons.wikimedia.org/wiki/File:20260418-DSC_9088-2.jpg | James E Selby | CC BY-SA 4.0 | 2026-04-18 |
| `commons/HB-JNG_b77w_3q-front-right_2019-09-24.jpg` | 3/4 front right (parked, through glass) | HB-JNG | B77W | https://commons.wikimedia.org/wiki/File:GRU_HB-JNG.jpg | Andrzej Otrębski | CC BY-SA 4.0 | 2019-09-24 |
| `commons/HB-JNJ_b77w_below_2026-09-29.jpg` | below (flying; right side and belly) | HB-JNJ | B77W | https://commons.wikimedia.org/wiki/File:Swiss_International_Air_Lines_HB-JNJ_run_LX138(Switzerland_Zurich_Airport_to_Hong_Kong_International_Airport)_29-09-2026(1).jpg | LN9267 | CC BY-SA 4.0 | 2026-09-29 |
| `commons/HB-JNK_b77w_left_2026-01-17.jpg` | left side (taxiing) | HB-JNK | B77W | https://commons.wikimedia.org/wiki/File:HB-JNK_(55049315500).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-01-17 |
| `commons/HB-JNI_b77w_left_2026-10-07.jpg` | left side (take-off) | HB-JNI | B77W | https://commons.wikimedia.org/wiki/File:Boeing_777-3DEER_(c-n_62754,_HB-JNI)_2026-10-07_Andre_Gerwing_Collection_ID_031459.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JHL_a333_left-20deg_2026-02-20.jpg` | left side (taxiing; about 20° ahead of abeam, sunlit) | HB-JHL | A333 | https://commons.wikimedia.org/wiki/File:HB-JHL_A330-300,_Swiss,_Miami_02-20-26_(55148200434).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons/HB-JHB_a333_right_2026-10-07.jpg` | right side (towed) | HB-JHB | A333 | https://commons.wikimedia.org/wiki/File:Airbus_A330-343X_(c-n_1018,_HB-JHB)_2026-10-07_Andre_Gerwing_Collection_ID_031350.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JHH_a333_right_2026-04-18.jpg` | right side (taxiing; true side-on) | not read | A333 | https://commons.wikimedia.org/wiki/File:20260418-DSC_8949.jpg | James E Selby | CC BY-SA 4.0 | 2026-04-18 |
| `commons/HB-JHD_a333_3q-front-right_2026-10-07.jpg` | 3/4 front right (taxiing) | HB-JHD | A333 | https://commons.wikimedia.org/wiki/File:Airbus_A330-343X_(c-n_1026,_HB-JHD)_2026-10-07_Andre_Gerwing_Collection_ID_031387.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JHF_a333_below_2025-09-01.jpg` | below (flying; plan view of the belly) | HB-JHF | A333 | https://commons.wikimedia.org/wiki/File:Swiss_Airbus_A330-300_HB-JHF_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2025-09-01 |
| `commons/HB-JHJ_a333_3q-rear-left_2026-10-07.jpg` | 3/4 rear left (take-off) | HB-JHJ | A333 | https://commons.wikimedia.org/wiki/File:Airbus_A330-343X_(c-n_1188,_HB-JHJ)_2026-10-07_Andre_Gerwing_Collection_ID_031330.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-IJL_a320_left_2026-10-07.jpg` | left side (taxiing; a little ahead of abeam) | HB-IJL | A320 | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_603,_HB-IJL)_2026-10-07_Andre_Gerwing_Collection_ID_031364.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-IJL_a320_right_2026-10-07.jpg` | right side (taxiing) | HB-IJL | A320 | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_603,_HB-IJL)_2026-10-07_Andre_Gerwing_Collection_ID_031451.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-ION_a321_left_2026-10-07.jpg` | left side (taxiing) | HB-ION | A321 | https://commons.wikimedia.org/wiki/File:Airbus_A321-212_(c-n_5567,_HB-ION)_2026-10-07_Andre_Gerwing_Collection_ID_031534.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-ION_a321_3q-front-right_2026-10-07.jpg` | 3/4 front right (taxiing) | HB-ION | A321 | https://commons.wikimedia.org/wiki/File:Airbus_A321-212_(c-n_5567,_HB-ION)_2026-10-07_Andre_Gerwing_Collection_ID_031409.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JDC_a20n_tail_2023-06-11.jpg` | tail, left side (crop) | HB-JDC | A20N | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC01042).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-06-11 |
| `commons/HB-JDC_a20n_engine_2023-06-11.jpg` | engine, left, outboard face (crop) | HB-JDC | A20N | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC01042).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-06-11 |
| `commons/HB-JDC_a20n_winglet-outer-left_2023-06-11.jpg` | winglet, left, outer face (crop) | HB-JDC | A20N | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_Swiss_Airbus_A320-271N_HB-JDC_(DSC01042).jpg | MarcelX42 | CC BY-SA 4.0 | 2023-06-11 |
| `commons/HB-JDJ_a20n_winglet-outer-right_2026-10-07.jpg` | winglet, right, outer face, seen from the back (crop) | HB-JDJ | A20N | https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_12470,_HB-JDJ)_2026-10-07_Andre_Gerwing_Collection_ID_031346.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JDJ_a20n_winglet-inner-left_2026-10-07.jpg` | winglet, left, inner face (crop) | HB-JDJ | A20N | https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_12470,_HB-JDJ)_2026-10-07_Andre_Gerwing_Collection_ID_031346.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JDA_a20n_winglet-left-from-ahead_2026-10-07.jpg` | winglet, left, leading edge (crop) | HB-JDA | A20N | https://commons.wikimedia.org/wiki/File:Airbus_A320-271N_(c-n_9246,_HB-JDA)_2026-10-07_Andre_Gerwing_Collection_ID_031519.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCN_bcs3_winglet-outer-right_2026-10-07.jpg` | winglet, right, outer face (crop) | HB-JCN | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_220-371_(c-n_55032,_HB-JCN)_2026-10-07_Andre_Gerwing_Collection_ID_031544.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCN_bcs3_winglet-inner-left_2026-10-07.jpg` | winglet, left, inner face (crop) | HB-JCN | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_220-371_(c-n_55032,_HB-JCN)_2026-10-07_Andre_Gerwing_Collection_ID_031544.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JCJ_bcs3_engine_2026-10-07.jpg` | engine, left, outboard face (crop) | HB-JCJ | BCS3 | https://commons.wikimedia.org/wiki/File:Bombardier_BD-500-1A11_-_CS300_(c-n_55025,_HB-JCJ)_2026-10-07_Andre_Gerwing_Collection_ID_031360.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JNH_b77w_engine_2026-10-07.jpg` | engine, left, outboard face (crop) | HB-JNH | B77W | https://commons.wikimedia.org/wiki/File:Boeing_777-3DEER_(c-n_62753,_HB-JNH)_2026-10-07_Andre_Gerwing_Collection_ID_031379.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons/HB-JHL_a333_winglet-outer-left_2026-02-20.jpg` | winglet, left, outer face (crop) | HB-JHL | A333 | https://commons.wikimedia.org/wiki/File:HB-JHL_A330-300,_Swiss,_Miami_02-20-26_(55148200434).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |
| `commons/HB-JHL_a333_engine_2026-02-20.jpg` | engine, left, outboard face (crop) | HB-JHL | A333 | https://commons.wikimedia.org/wiki/File:HB-JHL_A330-300,_Swiss,_Miami_02-20-26_(55148200434).jpg | DUNCAN KIRK from Coeur d'Alene, United States | CC BY 4.0 | 2026-02-20 |

Most useful: the masters in the scale table above; `commons/HB-JDC_a20n_tail_2023-06-11.jpg` (fin close-up, sunlit);
`commons/HB-JDC_a20n_engine_2023-06-11.jpg`, `commons/HB-JHL_a333_engine_2026-02-20.jpg`,
`commons/HB-JNH_b77w_engine_2026-10-07.jpg` and `commons/HB-JCJ_bcs3_engine_2026-10-07.jpg` (the plain nacelles);
`commons/HB-JDC_a20n_winglet-outer-left_2023-06-11.jpg` and `commons/HB-JDJ_a20n_winglet-inner-left_2026-10-07.jpg`
(both faces of a Sharklet); `commons/HB-JDF_a20n_below_2026-03-31.jpg` and `commons/HB-JHF_a333_below_2025-09-01.jpg`
(the plain belly).

---

## 3. Colours

No official paint specification was found. The logo files on Commons give two digital reds: **#E60005** ("Swiss
International Air Lines Logo 2011.svg") and **#CC0000** ("Swiss new.svg", which its uploader matched to the logo PNG
of swiss.com in 2015). Unofficial palette sites repeat #E60005.

Photo samples: the median of every red pixel of the title or of the fin, and medians of boxes on flat, sunlit
areas for the other paints.

| Paint | Recommended sRGB | Evidence and spread | Trust |
|---|---|---|---|
| **SWISS red** (title, fin, wingtip bands) | **#DC1F26** | Sunlit, title / fin: #E82A2E / #DC2829 (`HB-JDC_a20n_left-20deg`), #D41F2A / #DF242C (`HB-JNH_b77w_left`), #DA101A / #D70A0E (`HB-JHL_a333_left-20deg`), title #DD012C (`HB-JHH_a333_right`). Median #DC1F2A: hue 356° to 360°, saturation 0.82 to 1.0, value 0.83 to 0.91. Dull light: #AC050E (`HB-JCJ_bcs3_left`), #9E060F (`HB-IJL_a320_left`), #B1211C (`HB-JDG_a20n_right`). The title and the fin are the same red on every photo. | High for the hue: a pure red, not orange, not crimson. Medium for the exact value: the photo median lies between the two logo values. |
| **White** (fuselage, belly, fin cap and foot, cross, engines, wingtip devices) | **#F5F6F5** | Fuselage in sun: #E6E8E8 (`HB-JDC_a20n_left-20deg`), #F1F3F2 (`HB-JHL_a333_left-20deg`), #F4F6F8 (`HB-JNH_b77w_right_2026-04-18`), #FAFBFB (`HB-JHH_a333_right`). Fin cap #DEE0DF and cross #DFE0E0 beside fuselage #E6E8E8 (`HB-JDC`): one white. Nacelle #EBEDEC (`HB-JDC_a20n_engine`), #F5F5F1 (`HB-JHL_a333_engine`). | High: a neutral white. |
| **Wing and tailplane grey** | **#BCC1C6** | `HB-JDJ_a20n_3q-rear-right`: wing top #A2AEC2 and tailplane top #ACB4C8 beside fuselage white #CCD0DC, so 0.80 to 0.84 of the white, with blue sky in them. | Low-medium (an estimate). |
| **Inlet lip** (bare metal) | **#D0CECB** | #D3D1CF (A320neo), #D7D4D0 (A330), #CFCCD0 (A220). | Medium. |
| **Exhaust nozzle and plug** | **#5F5A57** | Plug #49413A (A320neo), #6D625E (777); nozzle band #736D6B (A330). The 777's outer nozzle is lighter metal, #C7C3C4. | Medium-low. |
| **Sharklet leading-edge strip** | **#A5A1A1** | `HB-JDC_a20n_winglet-outer-left`. | Medium. |
| **Registration** (not drawn) | #111111 | Darkest pixels #000005 (`HB-JCJ_bcs3_left`). | High. |
| **"Member of Lufthansa Group"** (not drawn) | #0A1430 | Darkest pixel #000714 (`HB-JCJ_bcs3_left`): a very dark blue. | Low (thin letters). |

---

## 4. Elements (side elevation)

### 4.1 Fuselage

White #F5F6F5 from the nose tip to the tail cone, all round: sides, crown, belly, wing-to-body fairing, radome
(`HB-JDF_a20n_below`, `HB-JCH_bcs3_below`, `HB-JHF_a333_below`, `HB-JNJ_b77w_below`). There is no belly line, no
cheatline and no swoosh. The cockpit windows have the manufacturer's thin dark frames only. No belly title.

### 4.2 The title

Text: **SWISS**, capitals, in red #DC1F26. It is the wordmark of the logo, not a font (section 6). One title on each
side, on the forward fuselage, centred on the window row. The windows run through the letters.

The painted title is the logo's wordmark: the letters start and end at the same fractions of its length (first S
0 to 0.17, W 0.18 to 0.51, I 0.54 to 0.59, S 0.62 to 0.80, S 0.82 to 1; the file: 0.178, 0.183 to 0.515, 0.537 to
0.595, 0.621 to 0.800, 0.820) on the A320neo, A321neo, A220, A330 and 777. On the skin it keeps the wordmark's
proportions (length 4.25 × the height of the S; measured 4.1 to 4.3). Seen from the side, the curve of the fuselage
makes it 4% to 6% lower. Draw the side-elevation box below and stretch the wordmark to it.

| Type | Box in z (aft of the nose tip) | Length | Height in side elevation (the S, top to bottom) | Height on the skin | Bottom, top (from wY) | Place by the doors |
|---|---|---|---|---|---|---|
| A320, A320neo, A321, A321neo | 5.85 to 11.70 | 5.85 m (10.9 to 11.2 window pitches on 6 photos) | 1.28 m (31% of the fuselage height) | 1.36 m | wY − 0.61, wY + 0.67 | Starts 0.47 m aft of door 1's aft edge (0.44 to 0.52 on 4 photos; 0.60 on the A321neo photo, which is not side-on). |
| A220-300 (and -100) | 6.4 to 12.35 | 5.97 m (11 windows lie inside it on each side) | 1.40 m (38% to 40%) | 1.47 m | wY − 0.67, wY + 0.73 | Starts 0.15 m ahead of the centre of the first cabin window, on both sides. That is 0.64 m aft of door L1's aft edge. Door R1's aft edge is 1.14 m ahead of the title (R1 is narrower and sits about 0.5 m further forward than L1): do not place the right title by door R1. |
| A330-300 | 6.65 to 16.6 | 9.95 m (9.91 right, 9.97 left) | 2.24 m (40%) | 2.37 m | wY − 1.14, wY + 1.10 | Centred between door 1 and door 2: 0.35 m clear of each (0.29 to 0.45). |
| 777-300ER | 7.45 to 18.85 | 11.4 m (11.43 right, 11.47 left) | 2.57 m (41%) | 2.67 m | wY − 1.34, wY + 1.23 | Starts 0.6 m aft of door 1's aft edge (0.53 left, 0.68 right). It runs **across door 2**, which lies 8.3 to 9.6 m aft of the title's forward end. |

The cap height (the flat letters W and I) is 0.95 × the height of the S: 1.22 m, 1.33 m, 2.13 m and 2.44 m in side
elevation. The S goes 2% above and 3% below the flat letters.

Evidence (pixels): A320neo right `HB-JDG`: red box x 820 to 994, y 341 to 380, door 1 at x 1008 to 1039, window row
y 363.5, crown y 312.5, keel y 437. A320neo left `HB-JDA`: x 350 to 629, door 1 at x 277 to 329.5. A321neo `HB-JPE`
(original): x 3128 to 3647, y 1450 to 1563, window row y 1507, crown y 1375, keel y 1743. A220 left `HB-JCJ`: x 400
to 655, y 578 to 637; right `HB-JCN`: x 1250 to 1507, y 616 to 679. A330 right `HB-JHH`: x 1417 to 1704, y 572 to
636, doors at x 1712 to 1752 and 1367 to 1404; left `HB-JHL`: x 242 to 531, doors at x 194 to 231 and 540 to 579.
777 right `HB-JNH` (2026-04-18): x 1425 to 1711, y 565 to 629, doors at x 1728 to 1757 and 1470 to 1502; left
`HB-JNH` (2026-10-07): x 282 to 527, doors at x 244 to 270 and 463 to 490.

The window row sits at 46% to 52% of the title's height on every type: the title is centred on the windows, at most
0.05 m high.

### 4.3 The fin

Both sides alike:

- a **white band at the foot**, from the fuselage up to a horizontal line;
- a **red field** #DC1F26 between two horizontal lines (parallel to the fuselage axis), from the fin's leading edge
  to the rudder's trailing edge. The rudder is red with the fin;
- a **white cap** above the upper line, to the fin tip, about 1 m high on every type;
- a **white Swiss cross** in the red field. Each bar is 0.30 × the cross's span wide (span = 3.33 × bar width:
  the proportions of the cross of the Swiss flag). The bars are upright and level with the fuselage axis, not with
  the fin's sweep;
- the fin's leading edge keeps a light strip about 0.15 m wide (measured along the fuselage axis) that is not red
  (`HB-JDC_a20n_tail`, `HB-JPE`: red ends 14 px, 0.16 m, short of the leading edge).

Heights above the crown line:

| Type | Fin tip | Foot band (white) | Red field | Cap (white) | Cross span | Bar width | Cross centre |
|---|---|---|---|---|---|---|---|
| A320 family | 5.82 m | 0 to 0.72 m | 0.72 to 4.89 m (4.2 m) | top 0.93 m | 2.60 m | 0.78 m | at the red field's mid-height, 2.80 m |
| A220-300 | 6.1 m | 0 to 0.98 m | 0.98 to 5.2 m (4.24 m) | top 0.91 m | 2.58 m | 0.76 m | mid-height, 3.1 m |
| A330-300 | 8.5 m | 0 to 1.08 m | 1.08 to 7.5 m (6.4 m) | top 1.03 m | 3.86 m | 1.13 m | mid-height, 4.3 m |
| 777-300ER | 9.5 m | 0 to 0.82 m | 0.82 to 8.4 m (7.6 m) | top 1.08 m | 4.04 m | 1.20 m | 0.26 m below mid-height, 4.36 m |

As fractions of the height from the crown line to the fin tip, the red field covers 0.12 to 0.84 (A320 family),
0.16 to 0.85 (A220), 0.13 to 0.88 (A330) and 0.09 to 0.89 (777). The cross's span is 62% of the red field's height
(A320 family 0.62, A220 0.60, A330 0.61) and 53% on the 777.

Along the chord, the cross's centre lies a little aft of the middle of the red field at its height: 53% to 55% of
the way from the leading edge to the trailing edge (A320neo 0.53, A321neo 0.53, A220 0.55, 777 0.54).

Evidence (pixels): A320neo `HB-JDG`: fin tip y 143, red y 171 to 297, crown under the fin y 318, cross x 97 to 175,
y 195 to 273, bars 23 to 24 px; `HB-JDD`: red 126 rows, cross 78 × 78 px, bars 23 to 24 px. A321neo `HB-JPE`
(original): tip y 858, red y 941 to 1309, crown y 1375, cross 221 × 229 px, bars 63 to 68 px. A220 `HB-JCJ`: tip
y 287, red y 326 to 505, crown y 547, cross 106 × 109 px; `HB-JCN`: red y 334 to 521, cross 110 × 113 px, bars 33
to 34 px. A330 `HB-JHH`: tip y 288, red y 318 to 503, crown under the fin y 535, cross 111 × 113 px, bar 32 px;
`HB-JHL`: red y 349 to 528, cross 103 × 110 px. 777 `HB-JNH` (2026-04-18): tip y 287, red y 314 to 504, crown under
the fin y 525, cross x 129 to 229, y 365 to 466, bars 30 px; (2026-10-07): red y 306 to 491, cross y 357 to 455.

### 4.4 Tail cone

White to the end. The APU exhaust at the tip is bare dark metal (`HB-JDG`, `HB-JDJ_a20n_3q-rear-right`). The
tailplane's root fairing is white.

### 4.5 Engines

White #F5F6F5 nacelles on every type, with **no title and no logo** on either face (`HB-JDC_a20n_engine`,
`HB-JHL_a333_engine`, `HB-JNH_b77w_engine`, `HB-JCJ_bcs3_engine`; inboard faces in `HB-JDF_a20n_below` and
`HB-JDC_a20n_3q-front-left`). The inlet lip is a bare-metal ring #D0CECB, about 0.15 m. The exhaust nozzle and plug
are dark metal #5F5A57. The pylons look white. Small red maintenance marks only: skip.

The black grid on the nacelle in `HB-JDC_a20n_engine` is the open thrust reverser, not paint.

### 4.6 Wingtip devices

**Sharklets (A320neo, A321neo, A321-212):** white blade and knee, a grey leading-edge strip #A5A1A1 (about a fifth
of the chord), and a **red band** #DC1F26 with a **white cross** on **both faces**. The band's upper and lower edges
are level (parallel to the fuselage axis); its ends follow the blade's leading-edge strip and its trailing edge. The
band covers 32% to 63% of the device's height, measured from the bottom of the knee to the tip: about 0.75 m of a
2.4 m device (0.30 to 0.62 on `HB-JDC_a20n_winglet-outer-left`, 0.34 to 0.63 on
`HB-JDJ_a20n_winglet-outer-right`). The cross is centred in the band; its span is about 0.6 × the band's height
(0.42 to 0.45 m), its bars about 0.13 m wide. Inner face: `HB-JDJ_a20n_winglet-inner-left`, and the far Sharklet in
`HB-JDD_a20n_right` and `HB-ION_a321_3q-front-right`.

**A220 winglets:** white, with a white tip cap (about the top fifth), a red band (about the middle half) and a white
foot (about the lower third). White cross centred in the band. Both faces (`HB-JCN_bcs3_winglet-outer-right`,
`HB-JCN_bcs3_winglet-inner-left`).

**A330 winglets:** white tip cap (the top 15%), red band (the next 64%), white foot (the lowest 20%). White cross
centred in the band, span about 0.6 × the band's height. Both faces (`HB-JHL_a333_winglet-outer-left`; the far
winglets in `HB-JHD_a333_3q-front-right` and `HB-JHJ_a333_3q-rear-left`).

**A320-214 wingtip fences:** white, no marking (`HB-IJL_a320_left`, `commons/A320_left_Bilbao_2019-06-23.jpg`).

**777-300ER:** raked wingtips, no device, wing grey.

### 4.7 Wings and tailplane

Grey #BCC1C6 on the upper and lower surfaces, with the manufacturer's bare-metal leading edges. No livery colour.
The registration is painted in black under the left wing (`HB-JDF_a20n_below`, `HB-JCH_bcs3_below`): skip.

### 4.8 Small markings (not drawn)

- **Registration:** black capitals about 0.3 m high, below the window row just forward of the rearmost door, on both
  sides. Its last two letters are also on the nose and on the nose-gear door.
- **Star Alliance logo:** a small grey star mark between the cockpit windows and door 1, both sides. Another
  organisation's trademark: leave it out.
- **Aircraft name:** small red text below that mark ("Pontresina" on HB-JDC, "Engelberg" on HB-JDA, "Rütli" on
  HB-JCJ, "Nyon" on HB-IJL). It differs per aircraft: leave it out.
- **"Member of Lufthansa Group":** two lines of dark blue text ("Member of" over "LUFTHANSA GROUP"), above the window
  row just forward of the rearmost door, both sides. About 3.0 m long with 0.2 m capitals on the A220-300, 4.0 m long
  on the A330. Seen on HB-JCJ, HB-JCN and HB-JCC (A220-300, May and October 2026) and HB-JHH (A330, April 2026). Not
  on HB-JHL (February 2026), HB-JHB, HB-JNH, HB-JPC, HB-JDJ, HB-IJL or HB-ION (October 2026). Most of the fleet does
  not have it yet, and it names another company: leave it out.
- Door outlines: thin grey lines on the white.

### 4.9 Left and right

The scheme is the same on both sides: the same title box, the same fin, the same wingtip bands. The title is not
mirrored. On the left the first S is nearest the nose. On the right the word still reads SWISS, so the first S is at
the aft end of the box and the last S is nearest door 1 (`HB-JDG`, `HB-JHH`, `HB-JNH`). The cross is the same from
both sides. On the 777 the title crosses door 2 on both sides: on the left door 2 lies under the fourth letter, on the
right under the first S and the W.

---

## 5. Drawing steps

For every type (the kit draws one side; the right side uses the same shapes):

1. **Fill** the whole elevation white #F5F6F5.
2. **Fin:** inside the fin's outline, fill red #DC1F26 between two level lines: the lower one at the crown line plus
   the foot band of the table in 4.3 (0.72 m A320 family, 0.98 m A220, 1.08 m A330, 0.82 m 777), the upper one at
   the fin tip minus the cap (0.93 m A320 family, 0.91 m A220,
   1.03 m A330, 1.08 m 777). If the model's fin is taller or shorter than the real one, keep the cap and the foot
   band in metres and let the red field take the difference.
3. **Leading-edge strip:** leave or redraw a white strip 0.15 m wide along the fin's leading edge.
4. **Cross:** two white rectangles, level and upright. Span = 0.62 × the red field's height (0.53 on the 777), bar
   width = 0.30 × the span. Centre: the red field's mid-height (0.26 m lower on the 777), and 54% of the way from the
   leading edge to the trailing edge at that height.
5. **Title:** place `title.svg` in the box of the table in 4.2, stretched to the box's length and its side-elevation
   height. Take the vertical place from the window row (bottom and top from wY). Take the forward end from door 1
   where the table says so. Do not mirror it on the right side.
6. **APU exhaust:** dark metal #5F5A57 on the last 0.3 m of the tail cone.
7. Skip the registration, the Star Alliance mark, the name and the Lufthansa Group text.

Flat colours: `base` #F5F6F5, `wing` #BCC1C6, `stab` #BCC1C6, `engineColor` #F5F6F5, `wingletColor` #F5F6F5.

**Engine:** white; the front 0.15 m (the inlet lip) #D0CECB; the nozzle and plug aft of the cowl #5F5A57. No text.

**Wingtip device** (Sharklet, A220 winglet, A330 winglet; both faces): white; a leading-edge strip #A5A1A1 on the
Sharklet; a red band between two level lines (Sharklet 32% to 63% of the device's height, A220 about 32% to 80%,
A330 20% to 85%); a white cross centred in the band, span 0.6 × the band's height, bar 0.30 × the span. Models with a
wingtip fence or no device: no marking.

**Belly:** nothing.

---

## 6. Logos, wordmarks and fonts

| Graphic | Commons file | Licence | In `liveries/SWR/` | Use |
|---|---|---|---|---|
| **SWISS wordmark** (the title) | https://commons.wikimedia.org/wiki/File:Swiss_new.svg (the logo since October 2011: tail-fin emblem and wordmark, #CC0000) | **PD-textlogo** + Trademark (the file page carries `{{PD-textlogo}}` and `{{Trademark}}`; author "unknown") | `title.svg`: the letter path only, unchanged, recoloured to #DC1F26, viewBox cropped to the ink (198.72 × 46.75 units, 4.25:1) | **Use it** for the title. The letters match the aircraft's (bold grotesque capitals, level stroke ends on the S, pointed W). |
| The same logo, another drawing | https://commons.wikimedia.org/wiki/File:Swiss_International_Air_Lines_Logo_2011.svg (#E60005) | PD-textlogo + Trademark | not stored | A spare source of the same wordmark. |
| Tail-fin emblem of the logo | part of both files | PD-textlogo + Trademark | not stored | Not painted on the aircraft as a logo. Not needed. |
| **White cross** (fin, wingtips) | none needed | The Swiss cross is two rectangles | drawn with kit shapes | Draw it: bar = 0.30 × span. |
| 2002 to 2011 logo | https://commons.wikimedia.org/wiki/File:Swiss_International_Air_Lines.svg | PD-textlogo + Trademark | not stored | **Do not use**: the old scheme. |
| Star Alliance mark, "Lufthansa Group" | none taken | other organisations' marks | not stored | Leave out. |

**Fonts:** none needed. The title is the logo's own lettering, taken as outlines from the public-domain file. No OFL
font was compared with it, because none is used.

---

## 7. Geometry facts for the models

Manufacturer dimensions are from memory; each was checked against the scale of a master photo (table at the top).

| Type (app model) | Length | Fuselage width × height | Door 1 (z, outline) | Engines | Wingtip |
|---|---|---|---|---|---|
| A320neo (`a20n`) | 37.57 m | 3.95 × 4.14 m | 4.25 to 5.28 | PW1100G (A320-271N) | Sharklet, 2.4 m |
| A320-214 (`a320`) | 37.57 m | 3.95 × 4.14 m | as A320neo | CFM56-5B | wingtip fence on HB-IJL |
| A321neo (`a21n`) | 44.51 m | 3.95 × 4.14 m | as A320neo | PW1100G (A321-271NX) | Sharklet |
| A321-111, -212 (`a321`) | 44.51 m | 3.95 × 4.14 m | as A320neo | CFM56-5B | Sharklet on HB-ION (-212); not checked on the -111 |
| A220-300, -100 (`bcs3`) | 38.71 m, 35.0 m | 3.5 × 3.7 m | L1: 4.85 to 5.93 (±0.2); R1 about 0.5 m further forward | PW1500G | canted winglet |
| A330-343 (`a333`) | 63.66 m | 5.64 m | 4.99 to 6.35; door 2: 16.95 to 18.25 | Trent 700 | winglet |
| 777-3DEER (`b773`) | 73.86 m (fuselage 73.1 m) | 6.20 m | 5.61 to 6.78; door 2: 15.8 to 17.06 | GE90-115B | raked tip, none |

- The engine and type names are from the Commons file titles (A320-271N, A321-271NX, A330-343X, 777-3DEER).
- The models' doors and noses do not sit exactly where the real ones do (for example `a20n`: door 1 centre 5.13 m
  aft of the nose, real 4.77 m). Place the title from the model's door 1 and window row, not from z alone.
- Differences from the app's `liveries.json` entry (`"SWR": {"base": "#f7f7f7", "fin": "#e30613", "title": true,
  "finLogo": true}`): the fin is not red all over (white cap and white foot band), the title is much larger than a
  decal above the windows, and the wingtip devices carry the red band and cross.

---

## 8. Confidence and open questions

- **High:** the scheme and its parts on all four type families; that both sides are alike and the title is never
  mirrored; plain white engines and belly; the fin's three bands and the cross's proportions; the wingtip bands on
  both faces of Sharklets, A220 winglets and A330 winglets.
- **Title size and place:** length within ±0.1 m (A320 family, A220) and ±0.15 m (A330, 777); z within ±0.15 m;
  height within ±0.05 m (narrowbodies) and ±0.1 m (widebodies). The height on the skin assumes a round section and
  the window row as the reference.
- **Fin bands:** cap height within ±0.05 m. The foot band's height depends on where I put the crown line under the
  fin: ±0.1 m on the A320 family and the 777, ±0.2 m on the A220 and the A330 (the two A220 photos give 0.72 m
  and 0.98 m; the two A330 photos 1.0 m and 1.1 m).
- **Red:** #DC1F26 is the median of sunlit photos. The logo files say #E60005 and #CC0000. Any of the three is a
  fair choice; in a dull render #E60005 may look closer.
- **Wing grey, exhaust metal:** estimates.
- **Wingtip bands:** the Sharklet numbers come from two crops and agree within 0.04 of the height. The A220 and A330
  winglet fractions come from one crop each, seen at an angle: ±0.05.
- **A220-100:** only one photo (`HB-JBI_bcs1_3q-front-left`), not side-on. It shows the same title and fin. I
  assume the A220-300's numbers.
- **A321-111 (HB-IOD, HB-IOF):** not looked at closely. They may have wingtip fences.
- **A340-300 and A350-900:** not covered. The A340 has the A330's fuselage: the A330 numbers should fit.
- **"Member of Lufthansa Group":** on 4 of the aircraft seen in 2026 and spreading. Left out.
- **Planespotters dates:** the API gives none. Every planespotters thumbnail is "reference only".
- **Spot check (2026-10-13, a second agent):**
  - The agent opened 12 stored photos: 6 full photos (A320neo, A220-300, A330-300, 777-300ER), 1 fin crop, 1 engine
    crop and 4 wingtip crops. Each photo shows the scheme of section 1.
  - The agent measured 5 master photos again. The title boxes agree within 1 px (`HB-JDG`, `HB-JHL`, `HB-JNH` left,
    `HB-JCJ`). The red rows of the fin on `HB-JDG` agree (y 171 to 297).
  - The sunlit reds agree within 2 units per channel (`HB-JDC`, `HB-JHL`, `HB-JNH`). The whites agree within 4 units
    (`HB-JDC`, `HB-JHL`).
  - The Commons API gives `PD-textlogo` and `Trademark` for "Swiss new.svg". The path in `title.svg` is the same as
    the path in that file.
  - The table in section 2 and `refs.json` have the same 59 entries. Each file is on the disk.
  - The agent did not check the other figures.

Sources consulted: Wikimedia Commons (the files above, read through the API); planespotters.net public API;
[World Airline News, "Swiss International Air Lines updates its livery" (2012-01-15)](https://worldairlinenews.com/2012/01/15/swiss-international-air-lines-updates-its-livery/);
[Business Traveller, "Swiss unveils new logo and tagline" (2011-08-23)](https://www.businesstraveller.com/news/2011/08/23/swiss-unveils-new-logo-and-tagline/) (search summary only);
[Horizont, "Swiss weist sich sichtbarer als Member of Lufthansa Group aus" (2025-12-10)](https://www.horizont.net/schweiz/nachrichten/neues-markendesign-swiss-weist-sich-sichtbarer-als-member-of-lufthansa-group-aus-232370);
[AirlineGeeks, "Livery of the Week: Swiss' First Airbus A350-900" (2025-06-27)](https://airlinegeeks.com/2025/06/27/livery-of-the-week-swiss-first-airbus-a350-900/) (search summary only);
[brandcolorcode.com, Swiss International Air Lines](https://www.brandcolorcode.com/swiss-international-air-lines) (unofficial, search summary only);
the `client/scene/liveries.json` SWR entry.

---

## 9. Lab check (2026-10-14)

Rendered on the A320neo, A321neo, A330-300, 777-300ER and A220-300 and compared with the photos, view by view. Three
rounds. What the lab showed and what changed in `design.ts`:

- **Added:** the cockpit windows (dark, the Airbus outline on the model's measured aft edge; on the wide bodies they
  grow less than the fuselage) and the Star Alliance star as a thin grey outline, 0.6 m ahead of door 1.
- **Fixed:** the engine's dark nozzle zone also covered the pylon's fairing and showed as a black box under the wing.
  It now stops at the pylon.
- **Fixed:** on the A220 and A330 winglets the cross sat against the leading edge. The leading edge and chord are now
  measured from the lab's views (0.66 and 0.55 of the box length), so the cross is in the middle of the red band.
- **Matches the photos:** the red title (text, size, place; it reads correctly on both sides), the red fin with the
  white foot band, cap and cross, the plain white engines, the red band and cross on the Sharklets and winglets, the
  white belly, the grey wings.
- **Still differs:** the "Member of Lufthansa Group" text on aircraft painted since 2025 is not drawn, nor are the
  registration and the name. The shader's windows are square.
