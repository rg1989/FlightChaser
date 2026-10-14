# Delta Air Lines (DAL): livery dossier, the 2007 scheme as flown today

Research date: 2026-10-13. Refs folder: `data/livery-refs/DAL/` (git-ignored; 47 photos listed in its `refs.json`).
I looked at every photo, full frame and in zoomed crops. Positions come from pixel scans and from the crops; colours
are medians of small boxes, read after converting the photo to sRGB. Nobody has checked this dossier a second time.

One design paints every type, so most positions are given against landmarks (door 1, the window row, the fin, the
wing fairing) and as fractions. Metres are given for the Boeing 737-900ER and, in section 7, for five more types.

Conventions (the same as the other dossiers; side elevation, both sides alike unless said):

- **z** = metres aft of the nose tip. **h** = metres above the keel of the constant-section fuselage.
- **f** = fraction of the local fuselage height (0 keel, 1 crown), as `k.at(z, f)` takes it.
- **Fin coordinates (u, h)** as `k.fin(u, h)` takes them: u = 0 leading edge … 1 trailing edge (the straight leading
  edge, without the dorsal fillet), h = 0 the fin root at the crown … 1 the tip.
- Pixel values are for a 3840 px wide copy of the photo (fetched to measure, not stored). The stored copies are
  1920 px wide: halve the values.

Scale sources (all true side-on unless said):

| Type | Photo | Scale | Check |
|---|---|---|---|
| 737-900ER, left | `commons-Boeing_737-9GP_ER_WL_N959DZ_…` (overcast, taxiing) | 74.0 px/m, from the window pitch (37.6 px = 0.508 m) | nose tip x 318, tail cone x 3342: 40.9 m (40.67 m real); crown to keel 291 px = 3.93 m (4.01 m real) |
| 737-900ER, right | `commons-N818DA_55216438608_.jpg` | positions by ratio only | high sun: the white side is in shade |
| A321, left | `commons-Delta_Airbus_A321_N346DN_BWI_MD1.jpg` (in flight, nose up 3°) | 77.2 px/m, window pitch 0.533 m | nose to tail 3456 px = 44.8 m (44.51 m real) |
| 757-200, left | `commons-N723TW.jpg` (in flight) | 62 px/m, window pitch 0.508 m | nose to tail cone 2888 px = 46.6 m (46.97 m real) |
| 767-300ER, left | `commons-N193DN_767_Delta_ARN_01.jpg` | 62.6 px/m, from the length (53.67 m) | window pitch comes out 0.57 m |
| A330-900, left | `commons-Airbus_A330_N436DX_Taxiing_in_Boston_March_2026.jpg` | 54.8 px/m, from the length and the window pitch 0.533 m | crown to keel 5.47 m (5.64 m real) |
| A350-900, right | `commons-Airbus_A350-941_N512DN_3512_…` (from a terrace) | 49.5 px/m, from the length; window pitch comes out 0.65 m (0.635 m real) | seen from a little above: heights on the upper fuselage read large |

---

## 1. Identity

**Scheme:** the livery Delta introduced in 2007 after its bankruptcy. Wikipedia's Delta Air Lines article calls it
"Upward & Onward" (the task sheet says "Onward and Upward") and says that the repaint of the whole fleet, the
aircraft that came from Northwest included, took four years. Every Delta photo that I looked at shows it, except
the specials listed below (the dated photos are from January 2025 to October 2026). Its parts (seen on every type
in the refs):

- a white fuselage, radome to tail cone, with no cheatline;
- a dark blue belly: seen from below it is a long lens with rounded ends; from the side it is a low, flat boat
  shape under the white;
- the red widget and **DELTA** in dark blue above the window row, just aft of door 1, on both sides;
- a small US flag and the registration above the windows, just ahead of the last door;
- a dark blue fin with a very large red widget turned on its side, its point forward and up, cut by the fin's
  edges; the fleet number in small white figures at the top;
- dark blue engine nacelles with bare-metal inlet lips; no title on them;
- dark blue wingtip devices; the A350's carry the widget on both faces;
- a large white widget and DELTA on the blue belly, under the wing.

**Aircraft that wear it:** every type asked for, in all its versions. Seen in the refs: Boeing 737-900ER (N803DN,
N818DA, N837DN, N917DU, N959DZ and the tracked N854DN, N894DN, N941DZ), 757-200 (N662DN, N664DN, N687DL, N713TW,
N723TW, N823DX, N900PC), 757-300 (N581NW, N591NW), 767-300ER (N185DN, N193DN, N195DN), 767-400ER (N826MH), Airbus
A321 (N101DQ, N346DN, N393DN, N397DN), A321neo (N572DT, N701DH), A330-200 (N853NW), A330-300 (N809NW), A330-900
(N404DX, N410DZ, N436DX), A350-900 (N503DN, N507DN, N512DN, N519DN). The other Delta aircraft in the background
of `…N393DN.jpg` and `…N581NW…` wear it too.

**The eight tracked airframes** (`--hex`), all in the standard scheme in their current planespotters photo:
ab2760 N818DA, ad1142 N941DZ, ac5488 N894DN, abb68c N854DN (737-900ER); a988f0 N713TW, ab3c61 N823DX, a8c36d N664DN,
a9b06f N723TW (757-200).

**Not the standard scheme (photos looked at, then removed from the refs):**

- **N527DN** (A350-900): the blue and white "100 YEARS" livery, with a blue and grey widget on the fin (Commons,
  "Delta Air Lines (N527DN) Airbus A350-941 taxiing at Sydney Airport", Bidgee, 2026-01-08). No free artwork: paint
  it standard.
- **N16065** (767-300ER): standard, plus a signature and "ANDREW YOUNG, ATLANTA'S AMBASSADOR TO THE WORLD" under
  the cockpit (Commons, "N16065 767 Delta OPO 01", 2026-08-03). Ignore the dedication.
- From Commons file titles only, not looked at: N411DX "Team USA" (A330-900, 2025), N809DA "Spirit of Seattle"
  (737-900ER), N171DZ "80th Anniversary D-Day" (767-300ER).

**Delta Connection** (regional jets; `EDV` is an alias of `DAL` in `client/scene/liveries.json`): the same white,
blue belly, fin and engines, but the title is DELTA with a small "CONNECTION" under it (N210JQ in the background of
`…N393DN.jpg`; a jet bridge hides the place of the widget). This dossier does not cover it.

---

## 2. Reference images

| File | View | Aircraft | What it shows | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|---|
| `ps-ab2760-1767786.jpg` | right side | N818DA, B737-900ER | on the runway; thumbnail | https://www.planespotters.net/photo/1767786/n818da-delta-air-lines-boeing-737-932er-wl | Joshua Bully \| DOMINICA AVIATION | reference only (planespotters.net thumbnail) | not given |
| `ps-ad1142-1510852.jpg` | right side | N941DZ, B737-900ER | in flight, gear down; thumbnail | https://www.planespotters.net/photo/1510852/n941dz-delta-air-lines-boeing-737-9gper-wl | Stephen J Stein | reference only (planespotters.net thumbnail) | not given |
| `ps-ac5488-1981091.jpg` | right side | N894DN, B737-900ER | in flight, gear down; thumbnail | https://www.planespotters.net/photo/1981091/n894dn-delta-air-lines-boeing-737-932er-wl | OMGcat | reference only (planespotters.net thumbnail) | not given |
| `ps-abb68c-1598233.jpg` | right side | N854DN, B737-900ER | in flight, gear down; thumbnail | https://www.planespotters.net/photo/1598233/n854dn-delta-air-lines-boeing-737-932er-wl | Andri Cueni | reference only (planespotters.net thumbnail) | not given |
| `ps-a988f0-1991859.jpg` | left side | N713TW, B757-200 (winglets) | climbing, seen from a little under the beam; thumbnail | https://www.planespotters.net/photo/1991859/n713tw-delta-air-lines-boeing-757-2q8-wl | Martin Oswald | reference only (planespotters.net thumbnail) | not given |
| `ps-ab3c61-1894613.jpg` | below | N823DX, B757-200 (winglets) | climbing turn: the blue belly and its white DELTA title; thumbnail | https://www.planespotters.net/photo/1894613/n823dx-delta-air-lines-boeing-757-26d-wl | Nick Sheeder | reference only (planespotters.net thumbnail) | not given |
| `ps-a8c36d-1909654.jpg` | left side | N664DN, B757-200 (no winglets) | landing; thumbnail | https://www.planespotters.net/photo/1909654/n664dn-delta-air-lines-boeing-757-232 | Stephen Lian | reference only (planespotters.net thumbnail) | not given |
| `ps-a9b06f-1958972.jpg` | right side | N723TW, B757-200 (winglets) | on approach; thumbnail | https://www.planespotters.net/photo/1958972/n723tw-delta-air-lines-boeing-757-231-wl | Jason D’Adamo | reference only (planespotters.net thumbnail) | not given |
| `commons-Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg` | 3/4 front left | N803DN, B737-900ER | on the ground, about 30 degrees ahead of the beam; sun and cloud; the source of the left tail and left engine crops | https://commons.wikimedia.org/wiki/File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-06 |
| `commons-Delta_Boeing_737-900ER_N917DU_BWI_MD1.jpg` | left side | N917DU, B737-900ER | in flight, gear down, seen from a little under the beam: the belly blue starts at the nose-gear bay | https://commons.wikimedia.org/wiki/File:Delta_Boeing_737-900ER_N917DU_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-06-04 |
| `commons-Boeing_737-932_ER_WL_N837DN_msn_31948_ln_5332_2-8-2026_.jpg` | 3/4 rear left | N837DN, B737-900ER | climbing, seen from under and behind; low warm sun: not for colour | https://commons.wikimedia.org/wiki/File:Boeing_737-932(ER)(WL)_(N837DN,_msn_31948,_ln_5332)_(2-8-2026).jpg | ZLEA | CC BY-SA 4.0 | 2026-02-08 |
| `commons-Boeing_737-9GP_ER_WL_N959DZ_msn_39880_ln_5081_1-18-2026_.jpg` | left side | N959DZ, B737-900ER | taxiing, overcast, true side-on: the measurement master for the 737 (74 px/m in the 3840 px copy) | https://commons.wikimedia.org/wiki/File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg | ZLEA | CC BY-SA 4.0 | 2026-01-18 |
| `commons-N818DA_55216438608_.jpg` | right side | N818DA, B737-900ER | on the runway, high sun (the side of the white fuselage is in shade): positions, not colour | https://commons.wikimedia.org/wiki/File:N818DA_(55216438608).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-04-04 |
| `commons-Delta_Airbus_A321_N346DN_BWI_MD1.jpg` | left side | N346DN, A321-200 | in flight, gear down, sunlit; Display P3 profile (convert before sampling) | https://commons.wikimedia.org/wiki/File:Delta_Airbus_A321_N346DN_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-09-24 |
| `commons-Delta_Airbus_A321_N397DN_taxiing_at_Boston_July_2026.jpg` | 3/4 front right | N397DN, A321-200 | taxiing, hazy, about 25 degrees ahead of the beam; the letters lean because of the angle, they are upright | https://commons.wikimedia.org/wiki/File:Delta_Airbus_A321_N397DN_taxiing_at_Boston_July_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-07-04 |
| `commons-Delta_Air_Lines_Airbus_A321_N101DQ_planform_view_January_2025.jpg` | below | N101DQ, A321-200 | straight from under: the blue lens of the belly, the white widget and DELTA on the wing fairing | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A321_N101DQ_planform_view_January_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-01-04 |
| `commons-Airbus_A321-211_-_Delta_Air_Lines_-_N393DN.jpg` | left side | N393DN, A321-200 | at the gate, from a terrace over the left side: crown, both Sharklets; an A220, an E175 and a 737 of Delta behind | https://commons.wikimedia.org/wiki/File:Airbus_A321-211_-_Delta_Air_Lines_-_N393DN.jpg | Oleg Yunakov | CC BY-SA 4.0 | 2026-06-19 |
| `commons-Hamburg-Finkenwerder_Airport_Delta_Air_Lines_Airbus_A321-271NX_N701DH_DSC04004_..jpg` | 3/4 front right | N701DH, A321neo | before delivery (test registration D-AZYN), low warm sun: not for colour | https://commons.wikimedia.org/wiki/File:Hamburg-Finkenwerder_Airport_Delta_Air_Lines_Airbus_A321-271NX_N701DH_(DSC04004).jpg | MarcelX42 | CC BY-SA 4.0 | 2026-03-05 |
| `commons-Delta_Airlines_Airbus_A321neo_N572DT_at_Seattle-Tacoma_May_2026.jpg` | left side | N572DT, A321neo | at the gate, from over the left side, overcast evening; a 757-300 (N591NW) behind | https://commons.wikimedia.org/wiki/File:Delta_Airlines_Airbus_A321neo_N572DT_at_Seattle-Tacoma_May_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-05-08 |
| `commons-N723TW.jpg` | left side | N723TW, B757-200 (winglets) | in flight, gear down, sunlit from over the top: the measurement master for the 757 | https://commons.wikimedia.org/wiki/File:N723TW.jpg | Liam Thompson | CC BY-SA 4.0 | 2026-08-22 |
| `commons-Delta_Air_Lines_Boeing_757-200_N662DN_departing_Boston_July_2026_1.jpg` | below | N662DN, B757-200 (no winglets) | climbing, seen from under the left side: belly, DELTA title on the belly, left engine | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Boeing_757-200_N662DN_departing_Boston_July_2026_1.jpg | 4300streetcar | CC BY 4.0 | 2026-07-19 |
| `commons-N687DL_-_Boeing_757-232_-_Delta_Air_Lines_SJO_220126_-_55059043154.jpg` | right side | N687DL, B757-200 (winglets) | on the ground, from a terrace; the tail is nearer than the nose; both winglets show (the near one its outer face, the far one its inner face); the source of the right tail crop | https://commons.wikimedia.org/wiki/File:N687DL_-_Boeing_757-232_-_Delta_Air_Lines_SJO_220126_-_55059043154.jpg | kitmasterbloke | CC BY 4.0 | 2026-01-24 |
| `commons-Delta_Air_Lines_Boeing_757-300_N581NW_at_Seattle-Tacoma_May_2026.jpg` | 3/4 rear right | N581NW, B757-300 (winglets) | pushed back, from a terrace over it: crown, tail cone, both winglets | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Boeing_757-300_N581NW_at_Seattle-Tacoma_May_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-05-08 |
| `commons-N900PC_Delta_Air_Lines_Boeing_757-26D_s_n_28446_54570593466_.jpg` | 3/4 front left | N900PC, B757-200 (winglets) | on approach from under; strongly saturated: not for colour | https://commons.wikimedia.org/wiki/File:N900PC_Delta_Air_Lines_Boeing_757-26D_s_n_28446_(54570593466).jpg | Tomás Del Coro from Fabulous Las Vegas, Nevada, USA | CC BY-SA 4.0 | 2025-05-15 |
| `commons-Boeing_767-332ER_c-n_27961_N185DN_2026-10-07_Andre_Gerwing_Collection_ID_031311..jpg` | 3/4 front right | N185DN, B767-300ER (winglets) | taxiing, sunlit | https://commons.wikimedia.org/wiki/File:Boeing_767-332ER_(c-n_27961,_N185DN)_2026-10-07_Andre_Gerwing_Collection_ID_031311.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons-Boeing_767-432ER_c-n_29713_N826MH_2026-01-12_Andre_Gerwing_Collection_ID_027655..jpg` | right side | N826MH, B767-400ER (raked wingtips) | on approach under an overcast, seen from under the beam: the belly title is upside down from this side | https://commons.wikimedia.org/wiki/File:Boeing_767-432ER_(c-n_29713,_N826MH)_2026-01-12_Andre_Gerwing_Collection_ID_027655.jpg | André Gerwing | CC BY-SA 4.0 | 2026-01-12 |
| `commons-N193DN_767_Delta_ARN_01.jpg` | left side | N193DN, B767-300ER (winglets) | taxiing, sunlit, true side-on: the measurement master for the 767; ProPhoto RGB profile (the reds look orange unless converted) | https://commons.wikimedia.org/wiki/File:N193DN_767_Delta_ARN_01.jpg | Bene Riobó | CC BY-SA 4.0 | 2026-07-21 |
| `commons-N195DN_Delta_B763_EGPH.jpg` | left side | N195DN, B767-300ER (winglets) | on approach, cloudy | https://commons.wikimedia.org/wiki/File:N195DN_Delta_B763_EGPH.jpg | Oscaracton | CC BY 4.0 | 2026-05-31 |
| `commons-Airbus_A330-223_c-n_618_N853NW_2026-10-07_Andre_Gerwing_Collection_ID_031331.jpg` | 3/4 front left | N853NW, A330-200 | taking off, from under: engines, belly, nose-gear door number | https://commons.wikimedia.org/wiki/File:Airbus_A330-223_(c-n_618,_N853NW)_2026-10-07_Andre_Gerwing_Collection_ID_031331.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons-N404DX_at_AMS_20260929.jpg` | right side | N404DX, A330-900 | taxiing, sunlit, through glass (soft) | https://commons.wikimedia.org/wiki/File:N404DX_at_AMS_20260929.jpg | VynedJ | CC BY 4.0 | 2026-09-29 |
| `commons-N410DZ_-_Airbus_A330-941_-_Delta_Air_Lines_LHR_310326.jpg` | below | N410DZ, A330-900 | climbing overhead: the blue belly from the nose-gear bay, the white widget and DELTA | https://commons.wikimedia.org/wiki/File:N410DZ_-_Airbus_A330-941_-_Delta_Air_Lines_LHR_310326.jpg | kitmasterbloke | CC BY 4.0 | 2026-04-06 |
| `commons-Delta_Air_Lines_Airbus_A330-300_N809NW_at_Dublin_May_2025.jpg` | 3/4 front right | N809NW, A330-300 | pushed back, sunlit | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A330-300_N809NW_at_Dublin_May_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-05-07 |
| `commons-Airbus_A330_N436DX_Taxiing_in_Boston_March_2026.jpg` | left side | N436DX, A330-900 | taxiing, low sun (warm, saturated): the measurement master for the A330 | https://commons.wikimedia.org/wiki/File:Airbus_A330_(N436DX)_Taxiing_in_Boston,_March_2026.jpg | Fletcher | CC BY 4.0 | 2026-03-29 |
| `commons-Delta_Air_Lines_Airbus_A350-900_N512DN_winglet.jpg` | winglet | N512DN, A350-900 | the left winglet from a cabin window: its inner face, navy with the widget | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A350-900_N512DN_winglet.jpg | 4300streetcar | CC BY 4.0 | 2026-05-08 |
| `commons-Airbus_A350-941_N512DN_3512_Delta_Air_Lines_55498285818_.jpg` | right side | N512DN, A350-900 | on the runway, sunlit, from a terrace: the measurement master for the A350; the widget on both faces of the winglets | https://commons.wikimedia.org/wiki/File:Airbus_A350-941_%E2%80%98N512DN_3512%E2%80%99_Delta_Air_Lines_(55498285818).jpg | Alan Wilson | CC BY-SA 4.0 | 2026-03-16 |
| `commons-Delta_Air_Lines_Airbus_A350-900_N507DN_at_Taoyuan_February_2026_1.jpg` | left side | N507DN, A350-900 | taxiing, from a terrace; small in the frame | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A350-900_N507DN_at_Taoyuan_February_2026_1.jpg | 4300streetcar | CC BY 4.0 | 2026-02-04 |
| `commons-_JPN-Tokyo_Delta_Air_Lines_Airbus_A350-941_N503DN_RJTT_2026-06-09.jpg` | right side | N503DN, A350-900 | at dusk: not for colour | https://commons.wikimedia.org/wiki/File:(JPN-Tokyo)_Delta_Air_Lines_Airbus_A350-941_N503DN_@_RJTT_2026-06-09.jpg | S5A-0043 | CC BY 4.0 | 2026-06-09 |
| `commons-N519DN_LHR_170325.jpg` | right side | N519DN, A350-900 | climbing, seen from under the beam: winglets, belly title upside down from this side | https://commons.wikimedia.org/wiki/File:N519DN_LHR_170325.jpg | kitmasterbloke | CC BY 2.0 | 2025-04-09 |
| `crop-tail-left-B739-N803DN.jpg` | tail | N803DN, B737-900ER | crop of File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg: the left side of the fin | https://commons.wikimedia.org/wiki/File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-06 |
| `crop-tail-right-B752-N687DL.jpg` | tail | N687DL, B757-200 | crop of File:N687DL_-_Boeing_757-232_-_Delta_Air_Lines_SJO_220126_-_55059043154.jpg: the RIGHT side of the fin, whole, root to tip (the mirror image of the left side) | https://commons.wikimedia.org/wiki/File:N687DL_-_Boeing_757-232_-_Delta_Air_Lines_SJO_220126_-_55059043154.jpg | kitmasterbloke | CC BY 4.0 | 2026-01-24 |
| `crop-engine-left-B739-N803DN.jpg` | engine | N803DN, B737-900ER | crop of File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg: the left engine, outboard face (CFM56-7B) | https://commons.wikimedia.org/wiki/File:Delta_Boeing_737-900ER_N803DN_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-06 |
| `crop-engine-right-A359-N512DN.jpg` | engine | N512DN, A350-900 | crop of File:Airbus_A350-941_%E2%80%98N512DN_3512%E2%80%99_Delta_Air_Lines_(55498285818).jpg: the RIGHT engine, outboard face (Trent XWB) | https://commons.wikimedia.org/wiki/File:Airbus_A350-941_%E2%80%98N512DN_3512%E2%80%99_Delta_Air_Lines_(55498285818).jpg | Alan Wilson | CC BY-SA 4.0 | 2026-03-16 |
| `crop-winglet-left-B739-N959DZ.jpg` | winglet | N959DZ, B737-900ER | crop of File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg: the left Split Scimitar winglet, outer face | https://commons.wikimedia.org/wiki/File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg | ZLEA | CC BY-SA 4.0 | 2026-01-18 |
| `crop-winglet-left-A21N-N572DT.jpg` | winglet | N572DT, A321neo | crop of File:Delta_Airlines_Airbus_A321neo_N572DT_at_Seattle-Tacoma_May_2026.jpg: the left Sharklet, outer face | https://commons.wikimedia.org/wiki/File:Delta_Airlines_Airbus_A321neo_N572DT_at_Seattle-Tacoma_May_2026.jpg | 4300streetcar | CC BY 4.0 | 2026-05-08 |
| `crop-winglet-right-A359-N512DN.jpg` | winglet | N512DN, A350-900 | crop of File:Airbus_A350-941_%E2%80%98N512DN_3512%E2%80%99_Delta_Air_Lines_(55498285818).jpg: the RIGHT winglet, outer face, with the widget | https://commons.wikimedia.org/wiki/File:Airbus_A350-941_%E2%80%98N512DN_3512%E2%80%99_Delta_Air_Lines_(55498285818).jpg | Alan Wilson | CC BY-SA 4.0 | 2026-03-16 |
| `crop-forward-left-B739-N959DZ.jpg` | forward fuselage, left | N959DZ, B737-900ER | crop of File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg: door 1, the widget and DELTA, the start of the belly blue | https://commons.wikimedia.org/wiki/File:Boeing_737-9GP(ER)(WL)_(N959DZ,_msn_39880,_ln_5081)_(1-18-2026).jpg | ZLEA | CC BY-SA 4.0 | 2026-01-18 |
| `crop-belly-title-A321-N101DQ.jpg` | below | N101DQ, A321-200 | crop of File:Delta_Air_Lines_Airbus_A321_N101DQ_planform_view_January_2025.jpg: the white widget and DELTA on the wing fairing | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_Airbus_A321_N101DQ_planform_view_January_2025.jpg | 4300streetcar | CC BY 4.0 | 2025-01-04 |

Most useful: `…N959DZ…` (737, left, flat light: the measurement master), `commons-N818DA…` (737, right),
`…N101DQ_planform…` (the belly from straight under), `crop-tail-left-B739-N803DN.jpg` and
`crop-tail-right-B752-N687DL.jpg` (the fin art, both sides), `…N512DN_3512…` and `…N512DN_winglet.jpg` (A350, the
winglets), `…N572DT…` (title and Sharklets close).

The planespotters photos are thumbnails for reference only. The Commons photos are CC BY or CC BY-SA; the crops
(`crop-*.jpg`) are cut from larger copies of them and carry the same source, author and licence. None of them may
leave `data/livery-refs/DAL/`.

Removed (not the current scheme, or not the outside of an aircraft): nine cabin pictures that the category run
brought (two looked at, seven by their titles), the 2018 Delta News Hub winglet photo (section 8), N527DN and
N16065 (section 1), and two strongly processed photos (N821DN, N666DN).

---

## 3. Colours

Official digital values are in the logo files on Commons (`Delta logo.svg`, from delta.com): red **#E31837**, dark
red **#98002E**, blue **#003D79**. I found no paint specification.

Photo samples: the median of a 6 to 10 px box on a flat area, then divided by the white of the same photo's
fuselage side (white → #F2F2F0, in linear light), so that photos in different light can be compared. H is the hue.

| Paint | Recommended sRGB | Evidence (relative to white) | Trust |
|---|---|---|---|
| **White** (fuselage, radome, tail cone, the knee of the Sharklets) | **#F5F6F5** | Raw samples: sunlit upper side #FDFDFD (`N512DN`), #FAFEFE (`N687DL`); overcast #EFEEE7 upper, #B8B4A9 lower (`N959DZ`). A clean, neutral white. | High |
| **Navy** (fin, belly, engines, wingtip devices, the DELTA letters) | **#12306E** | Fin, sunlit: #183D8B (`N512DN`, A350), #1C4280 (`N404DX`, A330), #0E2D58 (`N346DN`, A321), #002C64 (`N803DN`, 737), #001A5A (`N193DN`, 767), #002174 (`N436DX`, low sun). Engines: #23468E, #0B326A, #073F7D, #103A6E, #1C4483. Median of 21 fin and engine samples: #103074 (H 221°). In shade it goes near black: #1A253F (`N687DL`), raw #0C1427 under the belly. Overcast #455484 (`N959DZ`). Hue 212 to 226°. | Medium-high. The paint photographs a little more violet than the logo's #003D79 (H 210°), which is the alternative. The app's present `belly` #0B1F41 is the paint in shade: too dark for a sunlit fin. |
| **Red** (the bright facets of the widget) | **#E31837** | Fin: #E00017 (`N346DN`), #F6001B (`N803DN`), #E20031 (`N193DN`), #D10220 (`N723TW`), #FF2047 (`N404DX`), #E8455B overcast (`N959DZ`); the A350 photo clips (#FF4A4F). Hue 345 to 358°, median 352°. The logo's red is H 351°. | High |
| **Dark red** (the dark facets) | **#98002E** | Fin: #77171F, #7C262B (`N346DN`), #981429, #8D1123 (`N803DN`), #840028, #8B012C (`N193DN`), #730C1D, #6B0E23 (`N723TW`), #8C263E, #6E1A36 (`N404DX`), #B32C39, #A42E36 (`N512DN`). Median #89172B, hue 342 to 357°. | Medium-high. The logo's value is inside the spread. |
| **DELTA letters** | the navy | Read lighter than the fin in every photo (#3F5083 against a fin of #192D5C in the same light, `N572DT`) but at the same hue (224° and 221°): the strokes are thin and sit on the sky-lit shoulder of the fuselage. | Medium |
| **Belly title** | **#FFFFFF** | White on the navy (`N101DQ`, `N410DZ`); cream in the shade under the wing. | High |
| **Wing and tailplane grey** | **#B6BBBF** | The makers' light grey; my samples are sky reflections. | Low (an estimate) |
| **Inlet lip, leading edges** (bare metal) | **#C5C7C9** | #A3ABB9 in sun (`N512DN`), #848888 overcast (`N959DZ`). | Low-medium |
| **Exhaust, APU nozzle** | **#4A4D52** | Dark metal in `crop-engine-left-B739-N803DN.jpg`. | Low (an estimate) |

---

## 4. Elements (side elevation)

Metres in this section are for the **737-900ER** (`N959DZ`, left; fuselage 40.67 m long, 4.01 m high). Section 7 has
the other types.

Type landmarks measured on `N959DZ`: door 1 z 4.1 to 5.0; window row h 2.15 to 2.46 (centre 2.30), pitch 0.508 m;
crown h 3.93; engine inlet lip z 13.7; aft door z 34.1 to 34.9; dorsal fillet from z 31.6; fin tip z 40.5 (leading
corner) to 42.1 (trailing corner), h 11.3; tail cone tip z 40.9.

**Fuselage base:** white #F5F6F5 all over, radome included, to the tip of the tail cone. No cheatline, no grey
belly, no nose band. The APU exhaust is bare metal.

**Belly blue** (navy #12306E):

- *From below* (`N101DQ_planform`, A321, 37.9 px/m in the 1920 px copy): a lens along the keel with rounded ends,
  from z 2.4 to z 35.4 of 44.5 m. It is 1.9 to 2.2 m wide under the forward and aft fuselage (the fuselage is
  3.95 m wide) and takes the whole underside of the wing-to-body fairing (3.7 m wide, z 15.2 to 26.6).
- *From the side* it shows as a low boat shape: the upper edge is a shallow arc, highest under the wing.
  737-900ER (`N959DZ`, column scans): the open nose-gear doors are navy (z 2.3 to 3.7); the edge leaves the keel
  at about z 4.7, is at h 0.18 at z 6.5, h 0.45 at z 9.2 and h 0.55 (f 0.14) at z 11.9, runs behind the engine and
  the wing, comes out aft of the fairing at h 0.68 (z 24.2) and falls in a nearly straight line to meet the upswept
  keel in a point at **z 32.4**, 1.7 m ahead of the aft door. The lower part of the wing fairing is navy.
- The height of the edge differs by type (section 7): f 0.07 on the A321, about 0.13 on the Boeings, 0.2 on the A350.
- Where it starts: just aft of the radome on the A321 (z 2.4) and the 757 (z 2.1, `N723TW`); at the nose-gear bay
  on the 737 (`N917DU`), the A330 (`N410DZ`, `N853NW`) and, as far as I can see, the 767. The nose-gear doors are
  navy on every type and carry the fleet number in white.

**Title** (both sides): the logo as in `title.svg`, the red widget then **DELTA** in navy capitals, wide-set.

- Place: above the window row, starting 0.5 to 1.0 m aft of door 1 (section 7). Between the door and the widget
  is a small block of placards (skip).
- 737-900ER, left: widget z **5.46 to 6.39**, letters z **6.84 to 10.68**, so the title is **5.2 m** long. In a level
  side view the widget stands from h **2.61** (0.15 m above the window tops) to h **3.27**; the letters from h 2.74
  to 3.27 (cap height 0.53 m).
- The logo is 1000 : 154. Painted on the skin the widget is therefore 0.154 × the length (0.80 m on the 737), but the
  title lies on the shoulder of the fuselage, which leans away: in side elevation it shows about **0.8** as high
  (0.66 m measured). Draw the SVG stretched to the side-elevation box, as the Wizz logo is.
- The letters are **upright**. In three-quarter views (`N397DN`, `N701DH`, `N803DN`) they and the widget lean:
  that is the angle of view, not an italic.
- The widget is as in the logo file: the left halves bright red, the right halves dark red (sampled on `N512DN`:
  upper left #FE6371, upper right #A4646F, lower left #EB4E63, lower right #A55D68, all paled by the small size).

**Flag and registration** (skip in the design; here for the record): above the windows, just ahead of the last door,
navy letters about 0.3 m high, baseline 0.26 m above the window tops. 737-900ER left: flag z 29.5 to 30.5, "N959DZ"
z 30.8 to 32.5. The flag is forward of the registration on both sides, its blue canton towards the nose.

**Fin:** navy all over, both sides, the dorsal fillet included, down to a straight line at the fin root. No blue on
the fuselage under it. Over the navy lies one very large widget, the art of `fin-widget.svg` (Commons' "rotated
symbol"): turned so that its point is forward and up, 33° above the horizontal, and so large that the point and the
corners fall outside the fin. What stays inside, on the left side from the tip down:

1. navy at the tip, with the fleet number (white, about 0.3 m high) near the leading edge;
2. a **bright red** field with a level upper edge at **h 0.73**, across the whole chord; its lower edge is a "V":
   from the leading edge at h 0.56 down to the **notch** in the middle of the fin, then up to the trailing edge at
   h 0.60;
3. below its forward half a **dark red** field, between the leading edge (h 0.56 to 0.42) and a line that falls aft
   to the root; forward of that line the fin is navy;
4. the widget's gap, a navy stripe 0.6 m wide, bent at the notch: one arm from the notch straight down to the
   root, one arm up and aft to the trailing edge (h 0.49 to 0.60);
5. aft of the stripe a small **bright red** triangle at the trailing edge (h 0.49 down to 0.30) and under it a
   **dark red** field down to the root.

Measured on `N959DZ` (left) and checked on `N818DA` and `N687DL` (right): the angles of the art fit the SVG to within
4°, the stripe is 40 to 44 units of the SVG wide (40 in the file). Place the SVG by two things: the level upper edge
and the notch. In the left-side file the notch is the point (218.1, 140.7) and the upper edge is y = 0, so
**1 unit = (h_top − h_notch) × fin height / 140.7**.

| Type | Upper edge, h | Notch (u, h) | Width of the SVG (500 units) in fin heights | Photo |
|---|---|---|---|---|
| 737-900ER | 0.725 | (0.52, 0.45) | 0.98 (7.4 m on a 7.5 m fin) | `N959DZ` left |
| 757-200 | 0.74 | (0.52, 0.46) | 0.99 | `N687DL` right; `N723TW` left gives 0.72 and 0.43 |
| 767-300ER | 0.72 | (0.52, 0.45) | 0.98 | `N193DN` left |
| A321 | 0.72 | (0.60, 0.39) | 1.15 | `N397DN` right, `N346DN` left |
| A330-900 | 0.76 | (0.55, 0.43) | 1.16 | `N436DX` left |
| A350-900 | 0.73 | (0.55, 0.43) | 1.05 | `N512DN` right |

The right side is the mirror image: the point is forward and up there too (`crop-tail-right-B752-N687DL.jpg`).
The leading edge of the fin is a thin strip of bare metal on the Boeings and white on the A350; skip it.

**Tail cone:** white. The tailplane is light grey on both faces and carries no livery colour.

**Engines:** the whole nacelle, fan cowl and reverser, is navy on every face of every engine. The inlet lip is a ring
of bare polished metal. The exhaust nozzle and plug are bare dark metal. There is no title and no widget on the
nacelles, only small white stencils and one red and white placard (skip). The pylons are white or light grey.
Seen on the 737 (`crop-engine-left-B739-N803DN.jpg`), the A321 (`N346DN`), the A321neo (`N572DT`), the 757
(`N687DL`, `N723TW`), the 767 (`N193DN`), the A330-200 (`N853NW`), the A330-900 (`N436DX`, `N410DZ`) and the
A350 (`crop-engine-right-A359-N512DN.jpg`).

**Wingtip devices:**

| Type | Device | Outer face | Inner face |
|---|---|---|---|
| 737-900ER | Split Scimitar winglet (all five 737s in the Commons refs) | navy from the wing up, a thin bare-metal leading edge; the lower strake navy with a white leading edge (`crop-winglet-left-B739-N959DZ.jpg`, `N818DA`) | navy with a white band along the leading edge, about a fifth of the chord (far winglet in `N959DZ`) |
| 757-200 and -300 | blended winglet; some 757-200s have none (`N662DN`, `N664DN`) | navy, thin metal leading edge (`N723TW`, `N687DL`) | navy with a white leading-edge band (far winglet in `N687DL`; `N581NW`) |
| 767-300ER | blended winglet | navy with a bare-metal leading-edge band (`N193DN`) | navy (far winglet in `N185DN`) |
| 767-400ER | raked wingtip, no device | wing grey (`N826MH`) | – |
| A321, A321neo | Sharklet | the knee white, cut level; above it the blade navy with a white leading-edge band, a third of the chord at the root and less at the tip (`crop-winglet-left-A21N-N572DT.jpg`, `N346DN`) | the same (far Sharklet in `N572DT`, `N701DH`) |
| A330-200, -300 | winglet | navy (`N853NW`) | navy (`N809NW`) |
| A330-900 | the curved-up wingtip | navy on the upturned end, both faces (`N436DX`, `N410DZ`) | navy |
| A350-900 | curved winglet | the knee white, cut level; above it navy with the same turned widget as the fin, point forward and up, and a white leading edge (`crop-winglet-right-A359-N512DN.jpg`) | the same, mirrored (`…N512DN_winglet.jpg`, the left winglet from the cabin) |

**Belly title** (plan view, `belly(k)`): the logo in white (`title-white.svg`; the widget is two flat white pieces),
on the navy under the wing, on the centreline. It reads nose to tail, the tops of the letters to the **left** (port)
wing, so it is the right way up from below-left (`N662DN`, `N853NW`) and upside down from below-right (`N826MH`,
`N519DN`). A321 (`crop-belly-title-A321-N101DQ.jpg`, 75.8 px/m): widget z 16.6 to 18.2, letters z 18.9 to 25.2,
**8.6 m** long, letters 1.06 m high, widget 1.28 m; that is the logo's own proportions, from 1.4 m aft of the front
of the wing fairing to 1.4 m ahead of its end. Not measured on the other types: fit it to the fairing the same way.

**Wings:** light grey above and below; flap-track fairings grey. The registration is not painted large under the wing.

**Nose:** white; black frames round the cockpit windows as built, no anti-glare panel.

**Other small things (skip):** a grey SkyTeam roundel about 0.4 m across just ahead of door 1 (`N959DZ`, `N193DN`,
`N346DN`, `N436DX`, `N512DN`); the fleet number on the nose-gear doors and the fin tip; "A321neo" under the cockpit
of `N701DH`; small red corner marks on the skin near some windows; grey door outlines.

---

## 5. Left and right, and the drawing order

**The two sides differ in three things only:**

- The **title** is not mirrored: it reads widget-then-DELTA from left to right on both sides, over the same stretch
  of fuselage. On the left the widget is next to door 1; on the right the "A" is next to door 1 and the widget is at
  the aft end. Checked on five types: the 737 title covers the same eleven windows on both sides (`N959DZ`,
  `N818DA`); the gap to door 1 is 0.45 m left and 0.41 m right on the A321 (`N346DN`, `N397DN`), 0.74 and 0.94 on
  the 757 (`N723TW`, `N687DL`), 1.03 and 1.07 on the A330-900 (`N436DX`, `N404DX`), 0.76 and 0.74 on the A350
  (`N507DN`, `N512DN`). The kit's `k.image` does this by itself.
- The **fin widget is mirrored**: its point is forward on both sides. Draw `fin-widget.svg` with `mirror: true`.
  The A350's winglet widgets likewise.
- The **belly title** has its letter tops to port.

**Drawing order for `side(k)`:**

1. `k.fill` white.
2. Belly navy: `k.below(f)` with f rising from 0 at the nose-gear bay to the type's value (section 7) under the wing
   and back to 0 at the aft point; or leave the side to `belly(k)` and add only the low band.
3. Fin: `k.finFill` navy, then, clipped to the fin (`k.clip('fin', …)`), `fin-widget.svg` with `mirror: true`, its
   notch at the type's (u, h) and its scale from the table in section 4. The image is centred 31.9 units aft of and
   84.3 units below the notch.
4. Title: `title.svg` in its side-elevation box (section 7), its base 0.15 to 0.2 m above the window tops.
5. Bare-metal APU exhaust.

`belly(k)`: the navy lens, then `title-white.svg` on the wing fairing. `engine(k)`: navy, the lip ring metal, the
nozzle dark. `winglet(k)`: navy, a white or metal leading-edge band, the knee white on the Airbus types; the widget
on the A350 (`k.model`).

Flat colours: `base` white, `engineColor` and `wingletColor` navy, `wing` and `stab` #B6BBBF.

---

## 6. Logos and fonts

| Graphic | Commons file | Licence (read on the file page, 2026-10-13) | In `liveries/DAL/` | Use |
|---|---|---|---|---|
| Widget and DELTA wordmark | https://commons.wikimedia.org/wiki/File:Delta_logo.svg | `{{PD-textlogo}}` + `{{trademark}}` + `{{TOO-US}}`; author Delta Air Lines, source delta.com | `title.svg`: paths unchanged, the ® sign left out, the letters recoloured #003D79 → #12306E | the fuselage title, both sides |
| The same, white | the same file | the same | `title-white.svg`: the same paths, all white | the belly title |
| Widget turned as on the fin | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_rotated_symbol.svg | `{{PD-textlogo}}` + `{{trademark}}` + `{{TOO-US}}`; author Delta Air Lines | `fin-widget.svg`: paths unchanged, mirrored to the left-side view, #E31937 → #E31837 | the fin, the A350 winglets |
| Widget alone, upright | https://commons.wikimedia.org/wiki/File:Delta_Air_Lines_2007_symbol.svg | `{{PD-Textlogo}}` + `{{Trademarked}}` | not copied (it is inside `title.svg`) | – |

All are public domain as simple shapes and letters; Delta's trade mark rights remain.

**Fonts:** none needed. The only lettering in the design is the wordmark, which is in the SVG. The registration and
the fleet number are skipped. No font file is in the folder.

**No free artwork** exists for the "100 YEARS" livery of N527DN or the Team USA aircraft: paint them standard.

---

## 7. Per type

Lengths in metres. "Gap" is from the aft edge of door 1 to the widget on the left side. "Side height" is the height
of the widget in a level side view (painted height = 0.154 × length; × 0.8 for the lean of the skin). "Belly f" is
the height of the navy edge midway between door 1 and the wing, as a fraction of the fuselage height.

| Type | Fuselage height | Door 1 aft edge, z | Gap | Title length | Side height of widget | Base above window tops | Belly f | Navy ends ahead of last door | Photo |
|---|---|---|---|---|---|---|---|---|---|
| 737-900ER | 4.01 | 4.97 | 0.49 | **5.2** | 0.66 | 0.15 | 0.12 to 0.14 | 1.7 | `N959DZ` |
| A321, A321neo | 4.14 | 5.2 to 5.4 | 0.45 | **4.7** | 0.57 | 0.2 | 0.07 | 0.5 to 1.3 | `N346DN`, `N397DN`, `N101DQ` |
| 757-200 | 4.01 | 5.43 | 0.74 | **5.15** | about 0.63 (0.53 from below, 0.75 from above) | 0.1 | 0.12 | 1.4 | `N723TW`, `N687DL` |
| 767-300ER | 5.41 | 6.54 | 0.93 | **7.6** | 0.94 | 0.18 | 0.12, 0.16 near the wing | 0.5 | `N193DN` |
| A330-900 | 5.64 | 6.19 | 1.03 | **7.8** (7.9 on the right) | 0.94 | 0.17 to 0.2 | 0.06 to 0.10 | 1.7 | `N436DX`, `N404DX` |
| A350-900 | 6.09 | about 8.2 | 0.76 | **9.2** (9.1 left, 9.3 right) | about 1.15 (1.23 from above) | 0.15 to 0.18 | 0.20 | 2.1 | `N512DN`, `N507DN` |

A rule for a type that is not in the table: title length = 1.35 × the fuselage height; start 0.5 to 1.0 m aft of
door 1; keep 0.5 m clear of the next door. The 757-300, 767-400ER, A330-200 and A330-300 were looked at
(`N581NW`, `N826MH`, `N853NW`, `N809NW`) but not measured: paint them as their sister type.

**The app's present entry** (`client/scene/liveries.json`): `base` #F7F7F7, `belly` #0B1F41, `fin` #C8102E, `fin2`
#8C0C22, `engine` #0B1F41. Against the photos: the fin is navy with the widget on it, not red; the navy is too dark;
there is no title.

---

## 8. Confidence and open questions

- **High:** the parts of the scheme and that all the types wear it; the title's text, its place and that it reads
  the same way on both sides; the fin art and that it is mirrored; navy engines without titles; the belly title and
  which way it reads; the reds.
- **Medium-high:** the navy (#12306E from photos, #003D79 from the logo); the title lengths (± 0.2 m); the fin
  anchor points (± 0.03 in u and h).
- **Medium:** the side height of the title (it depends on how the model's shoulder curves: tune it in the lab);
  the height of the belly edge (± 0.04 in f; the A330 value comes from one low-sun photo); where the belly navy
  starts at the nose on the 767.
- **Low:** the greys and the bare-metal colours (estimates); the width of the white leading-edge bands on the
  winglets; the belly title's size on every type but the A321.
- **A350 winglets:** every photo of 2025 and 2026 (N503DN, N507DN, N512DN, N519DN) shows the widget on both faces.
  A Delta News Hub photo of 2018 on Commons ("A350 Exterior (44624453765)") shows a navy winglet with a white
  "A350 XWB" mark instead. I took the recent photos as the state of today and removed the 2018 one.
- **Not seen or not measured:** the inner face of the 737's lower strake; the right-side title of the 767 (taken
  to cover the same stretch as the left, as on the five types where both sides were measured).
- **Dates:** the planespotters API gives no date. Commons dates are the "taken" dates in the file data.
- **Scale:** `N687DL` and `N512DN` were shot from terraces and `N346DN`, `N723TW` in flight; their positions along
  the fuselage are good, their heights less so. `N959DZ`, `N193DN` and `N436DX` are level and side-on.

Sources: Wikimedia Commons (the photos and the three logo files above; licences read through the Commons API);
planespotters.net public API (eight thumbnails);
[Wikipedia: Delta Air Lines](https://en.wikipedia.org/wiki/Delta_Air_Lines) (the name and year of the livery);
`client/scene/liveries.json` (the present entry). Type dimensions are the makers' published figures.

---

## 9. Render check (2026-10-14)

Rendered on the QA machine in five rounds (a321, b739, a359, a333, b763 against the photos of section 2, all twelve
views each), then the design test.

**What matches the photos:** the white aircraft; the navy fin with the red widget (level upper edge, notch, the navy
stripe, the two red triangles) on both sides, mirrored so the point is forward; the title, its text, size and place
on both sides (widget first on the left, "A" first on the right); navy engines with the bare lip and dark nozzle; navy
wingtip devices; the navy belly seen from below with the white widget and DELTA on the fairing; the A350 winglet with
a white knee and the widget.

**Changed after the first render:**

- ec135 (no wing: the wing root has no chord) made the belly path non-finite. The belly edge now takes a chord of at
  least 0.5 m. The design test draws every painted model.
- The APU exhaust shape was a tall rectangle: where the fin's trailing edge overhangs the tail (737, A350 tip) it
  painted the rudder dark grey. It is now the cone's tip only.
- The belly navy is drawn about 30 % higher (10 % on the A350) and lighter towards the keel: the model's keel renders
  almost black at a grazing angle, so the line vanished from the side.
- 767: the model's door 1 is 1 m ahead of the aircraft's, so the title sits 1 m further aft (`aft` in the layout).
- A350 winglet: white knee, navy blade, white leading edge and the widget, traced on `…N512DN_winglet.jpg`.
  A320neo-family Sharklet (a20n, a21n): white knee, white leading-edge band, from the numbers measured for the Wizz
  A321neo; drawn but not rendered (none of the five pairs has Sharklets).

**Still different:** the forward belly line reads dark rather than navy on the A330 and A350 (shading under the
keel); the reds are about 15 % darker than the photos (the model's fin renders darker; the logo file's reds are
kept); the 737 winglet is one blade (the model has no lower strake); no fleet number on the fin tip or the nose
gear doors, no flag and registration.
