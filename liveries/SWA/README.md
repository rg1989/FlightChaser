# Southwest Airlines (SWA): Boeing 737-700, 737-800 and 737 MAX 8 livery dossier

Research date: 2026-10-13. Refs folder: `data/livery-refs/SWA/` (git-ignored). Paths that start with `ps-`,
`commons-`, `crops/` or `logos/` are relative to that folder. I looked at each photo (the full frame and zoomed
crops) and measured the positions and colours from the pixels. A statement that I could not check in a photo says
so.

This dossier describes the **2014 "Heart" scheme**: a blue aircraft with yellow, red and blue bands that rise from
the belly up the fin, and a heart on the belly. It does not describe the older "Canyon Blue" scheme (blue above, red
belly, "SOUTHWEST" on the fin).

Not written yet: `design.ts`. The folder has the dossier, the logo files, one font and `sources.json`.

Coordinate convention (side elevation, the same for both sides, the same as the other dossiers):

- **z** = metres aft of the nose tip of the **737-800** (0 = radome tip; 38.02 = tip of the tail cone). The
  737 MAX 8 has the same fuselage up to the tail cone; its tail cone is longer (tip at z ≈ 39.0).
- **h** = metres above the keel of the constant-section fuselage (0 = lowest line; crown = 4.01).
- Fixed stations (Boeing airport-planning data, as in `public/models/b738/recipe.json`): door 1 centre z 5.03,
  rear door centre z 31.88, aft edge of the cockpit windows z 2.92.
- Window row: window centres at h ≈ 2.55 (0.635 of the fuselage height in two ground-level photos).
- Fin: **v** = 0 at the crown (h 4.0) to 1 at the fin tip (h 11.15). **u** = 0 at the leading edge to 1 at the
  trailing edge, along the chord at that height. The leading edge is the straight main edge, extended down to the
  crown; the low dorsal fairing lies ahead of u = 0.

Scale source and how good it is:

- **Left side master:** `commons-N8305E_left_2026-02-11.jpg` (737-800, sun, a far telephoto shot; 1920 px copy).
  Nose tip x 79.5, tail-cone tip x 1723, door 1 outline x 260.5–294.5, rear door outline x 1424.5–1456.5, crown
  y 456, keel y 633. Along the fuselage 43.3 px = 1 m; in the picture plane 44.2 px = 1 m.
- The photo is not a true side view. The far winglet's tip is 332 px (7.5 m) aft of the near one, so the camera was
  12° behind the beam. The windows sit at 0.59 of the fuselage height (0.635 in ground-level photos), so the camera
  was about 6° above. I corrected each point for both angles (fuselage section taken as a circle of the local
  height; fin points lie on the centre plane and need no side correction). After the correction the doors come out
  at z 4.96 and 31.77 and the tail cone at 37.96, against Boeing's 5.03, 31.88 and 38.02. I then added 0.08 m to
  every z.
- **Checks on other photos** (position of the band edges at window height, metres aft of the rear door centre):

  | Edge | N8305E (737-800) | N8524Z (737-800, ground level) | N8988S (MAX 8, ground level) |
  |---|---|---|---|
  | blue / silver stripe 1 | −3.80 | −3.66 | −3.93 |
  | centre of silver stripe 2 | −1.15 | −0.98 | −1.34 |
  | centre of silver stripe 3 | +2.44 | +2.54 | +2.48 |

  The right side (`commons-N8781Q_right_2025-12-06.jpg`, mirrored) agrees with N8305E to 0.15 m at the one height I
  compared (0.475 of the fuselage height): −4.25 / −1.78 / +1.92 against −4.26 / −1.75 / +1.78 for the three edges
  blue/silver 1, centre of silver 2, centre of silver 3.
- Positions are good to about ±0.2 m along z and ±0.15 m in h on the fuselage and fin. The belly heart is ±0.8 m.

---

## 1. Identity

**Scheme:** the Southwest "Heart" livery, shown on 8 September 2014 (AirlineRatings, 2014-09-08: a heart on the
belly, the name much larger on the fuselage and on the engines, bolder stripes on the tail). The 737-800 N8642E has
the name "Heart One" under its cockpit window (`commons-N8642E_right_2024-02-25.jpg`); I did not check that it was
the first aircraft painted. The parts, all seen on the photos named in section 4:

- a **blue** fuselage all round: nose, crown, sides and belly, with no cheatline and no belly colour;
- a large white **"Southwest"** title on the forward fuselage, with a small three-colour heart beside door 1;
- three **bands that rise aft** from the belly, across the rear fuselage and up the fin: **yellow**, then **red**,
  then **blue** again (lower rear fuselage, tail cone, lower aft corner of the fin). A thin **silver** stripe lies on
  each of the three boundaries;
- a fin with a yellow leading-edge band, a silver stripe, and red behind it;
- a three-colour **heart on the belly**, ahead of the wing;
- blue engines, most of them with a white **"Southwest♥com"** title (a small heart in place of the dot);
- wingtip devices with the same yellow, silver, red and blue as the fin.

**Aircraft types:** all three types wear the same scheme. The bands sit in the same place relative to the rear door
and the fin on the 737-800 and the MAX 8 (table above). The 737-700 is 5.8 m shorter; I did not measure it, because
the app draws it on the 737-800 model. On the 737-700 the title still starts beside door 1 and it runs past the one
over-wing exit (`commons-N286WN_right_2024-03-11.jpg`).

**How many aircraft wear it:** every photo dated 2024–2026 that I looked at shows this scheme: the 10 tracked
aircraft below, and 47 Commons photos of 43 other registrations (46 dated 2024–2026, one with no usable date; contact
sheets from the Commons categories "Current Boeing 737-700 / 737-800 / 737-8 MAX of Southwest Airlines"). One more
photo on the sheets, from 2017, shows Canyon Blue tails. I did not find out whether a Canyon Blue aircraft is still
in the fleet.

| Registration | Hex | Type | Scheme | Evidence |
|---|---|---|---|---|
| N444WN | a55b7a | 737-700 | Heart | `ps-a55b7a-1693970.jpg` |
| N913WN | aca3d1 | 737-700 | Heart | `ps-aca3d1-1985937.jpg` |
| N932WN | acef18 | 737-700 | Heart | `ps-acef18-1933604.jpg` |
| N928WN | acdde3 | 737-700 | Heart | `ps-acdde3-1948048.jpg` |
| N8709Q | abf9f8 | 737 MAX 8 | Heart | `ps-abf9f8-1971510.jpg` |
| N8762Q | ac0f4d | 737 MAX 8 | Heart | `ps-ac0f4d-1575484.jpg` |
| N8760L | ac0f03 | 737 MAX 8 | Heart | `ps-ac0f03-1935540.jpg` |
| N8785L | ac1720 | 737 MAX 8 | Heart | `ps-ac1720-1696514.jpg` |
| N8534Z | abb579 | 737-800 | Heart | `ps-abb579-926936.jpg` |
| N8540V | abb8a0 | 737-800 | Heart | `ps-abb8a0-1253594.jpg` |

The planespotters API gives no photo date.

**Exceptions:**

- **Special liveries.** Southwest has many: Commons has 58 categories of named aircraft, among them the state-flag
  aircraft (Arizona One, California One, Colorado One, Florida One, Illinois One, Lone Star One, Louisiana One,
  Maryland One, Missouri One, Nevada One, New Mexico One), Imua One, Freedom One and "Southwest Classic". The one I looked at, Illinois
  One (N8619F, `not-used/`), has a painted fuselage, the standard Heart fin and the "Southwest" title moved to the
  blue corner of the fin. None of the 10 tracked aircraft is a special. Paint a special with the standard scheme.
- **Engines without a title.** Five aircraft photographed in 2026 have plain blue engines: N8305E (2026-02),
  N8570W (2026-05), N8524Z, N8988S and N9007K (2026-08). Others photographed in 2026 have the title
  (N7748A, N8764Q, N8679A, N8865L, N8523W). See section 4, engines.

---

## 2. Reference images

47 entries are in `refs.json`: 10 planespotters thumbnails (420 to 498 px wide), 19 Commons photos (1920 px
copies) and 18 crops of those Commons photos. The full-size Commons files of 13 photos are in `orig/`. The 48
thumbnails that I chose from are in `candidates/`. `not-used/` holds 8 photos of the first Commons category that do
not show the scheme (Canyon Blue, a special, cabins).

| File | View | Registration | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|
| `ps-a55b7a-1693970.jpg` | right side: 737-700, climbing after take-off | N444WN | https://www.planespotters.net/photo/1693970/n444wn-southwest-airlines-boeing-737-7h4-wl | Justin Stöckel | reference only (planespotters.net thumbnail) | not given |
| `ps-aca3d1-1985937.jpg` | left side: 737-700, climbing | N913WN | https://www.planespotters.net/photo/1985937/n913wn-southwest-airlines-boeing-737-7h4-wl | Andrew Kuznetsov | reference only (planespotters.net thumbnail) | not given |
| `ps-acef18-1933604.jpg` | left side: 737-700, taxiing, seen from a little higher | N932WN | https://www.planespotters.net/photo/1933604/n932wn-southwest-airlines-boeing-737-7h4-wl | Xiamen Air 849 Heavy | reference only (planespotters.net thumbnail) | not given |
| `ps-acdde3-1948048.jpg` | right side: 737-700, climbing | N928WN | https://www.planespotters.net/photo/1948048/n928wn-southwest-airlines-boeing-737-7h4-wl | Brad Ice | reference only (planespotters.net thumbnail) | not given |
| `ps-abf9f8-1971510.jpg` | right side: 737 MAX 8, climbing, low sun | N8709Q | https://www.planespotters.net/photo/1971510/n8709q-southwest-airlines-boeing-737-8-max | Jason D’Adamo | reference only (planespotters.net thumbnail) | not given |
| `ps-ac0f4d-1575484.jpg` | left side: 737 MAX 8, landing | N8762Q | https://www.planespotters.net/photo/1575484/n8762q-southwest-airlines-boeing-737-8-max | Demo Borstell | reference only (planespotters.net thumbnail) | not given |
| `ps-ac0f03-1935540.jpg` | from below and ahead on the left: both engines, the blue belly | N8760L | https://www.planespotters.net/photo/1935540/n8760l-southwest-airlines-boeing-737-8-max | Marc Charon | reference only (planespotters.net thumbnail) | not given |
| `ps-ac1720-1696514.jpg` | from below on the left, low sun | N8785L | https://www.planespotters.net/photo/1696514/n8785l-southwest-airlines-boeing-737-8-max | Marc Charon | reference only (planespotters.net thumbnail) | not given |
| `ps-abb579-926936.jpg` | left side: 737-800, landing | N8534Z | https://www.planespotters.net/photo/926936/n8534z-southwest-airlines-boeing-737-8h4-wl | Thom Luttenberg | reference only (planespotters.net thumbnail) | not given |
| `ps-abb8a0-1253594.jpg` | 3/4 front left: 737-800, taxiing, seen from higher | N8540V | https://www.planespotters.net/photo/1253594/n8540v-southwest-airlines-boeing-737-8h4-wl | Dennys Todorov | reference only (planespotters.net thumbnail) | not given |
| `commons-N8305E_left_2026-02-11.jpg` | left side: 737-800, sun; the measurement master; no engine title | N8305E | https://commons.wikimedia.org/wiki/File:N8305E_(55091684730).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-02-11 |
| `commons-N8524Z_left_2026-08-13.jpg` | left side: 737-800, from ground level, overcast; no engine title | N8524Z | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-800_N8524Z_BWI_MD3.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-13 |
| `commons-N8988S_left_2026-08-13.jpg` | left side: 737 MAX 8, from ground level, overcast; no engine title | N8988S | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8988S_BWI_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-13 |
| `commons-N8865L_left_2026-07-30.jpg` | left side: 737 MAX 8, from ground level; engine title | N8865L | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8865L_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-07-30 |
| `commons-N8523W_left_2026-09-10.jpg` | left side: 737-800, landing, seen from lower and ahead; both engines with titles; the belly heart | N8523W | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-800_N8523W_BWI_MD5.jpg | Acroterion | CC BY-SA 4.0 | 2026-09-10 |
| `commons-N9007K_left_2026-08-06.jpg` | left side: 737 MAX 8, landing, seen from lower and ahead; no engine titles; the belly heart | N9007K | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N9007K_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2026-08-06 |
| `commons-N212WN_left_2025-09-11.jpg` | 3/4 front left: 737-700, landing, seen from lower; blended winglets; both engines with titles | N212WN | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-700_N212WN_BWI_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2025-09-11 |
| `commons-N8781Q_right_2025-12-06.jpg` | right side: 737 MAX 8, sun; the right-side master (seen from higher and from behind the beam) | N8781Q | https://commons.wikimedia.org/wiki/File:Southewest_Boeing_737-8MAX_N8781Q_Arriving_SFO_L1170923.jpg | Bill Abbott | CC BY-SA 4.0 | 2025-12-06 |
| `commons-N8786Q_right_2024-03-11.jpg` | right side: 737 MAX 8, low sun | N8786Q | https://commons.wikimedia.org/wiki/File:Boeing_737-8_MAX_8_(N8786Q,_msn_67782,_ln_8386)_(3-11-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-11 |
| `commons-N8573Z_right_2024-03-02.jpg` | right side: 737-800, dull light, grainy, a fence in the way | N8573Z | https://commons.wikimedia.org/wiki/File:Boeing_737-8H4(WL)_(N8573Z,_msn_64250,_ln_6958)_(3-2-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-02 |
| `commons-N8642E_right_2024-02-25.jpg` | 3/4 front right: 737-800 "Heart One" (standard scheme plus its name under the cockpit window), low sun | N8642E | https://commons.wikimedia.org/wiki/File:Boeing_737-8H4(WL)_%27Heart_One%27_(N8642E,_msn_42525,_ln_5022)_(2-25-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-02-25 |
| `commons-N286WN_right_2024-03-11.jpg` | 3/4 front right: 737-700, low sun; blended winglets | N286WN | https://commons.wikimedia.org/wiki/File:Boeing_737-7H4(WL)_(N286WN,_msn_32471,_ln_1535)_(3-11-2024).jpg | ZLEA | CC BY-SA 4.0 | 2024-03-11 |
| `commons-N7748A_right_2026-01-24.jpg` | 3/4 front right: 737-700, low sun; split scimitar winglets | N7748A | https://commons.wikimedia.org/wiki/File:N7748A_(55074453672).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-01-24 |
| `commons-N8764Q_3q-front-right_2026-02-01.jpg` | 3/4 front right: 737 MAX 8, on snow, low sun | N8764Q | https://commons.wikimedia.org/wiki/File:Southwest_Airlines%E2%80%99_Boeing_737_MAX_8_%E2%80%98N8764Q%E2%80%99_@IND.jpg | AVA Navigate | CC BY-SA 4.0 | 2026-02-01 |
| `commons-N8570W_3q-front-left_2026-05-07.jpg` | 3/4 front left: 737-800, landing, seen from lower; no engine title | N8570W | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-800_N8570W_BWI_MD3.jpg | Acroterion | CC BY-SA 4.0 | 2026-05-07 |
| `commons-N7888A_3q-front-left_2025-12-11.jpg` | 3/4 front left: 737-700, landing, seen from lower; split scimitar winglets | N7888A | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-700_N7888A_BWI_MD4.jpg | Acroterion | CC BY-SA 4.0 | 2025-12-11 |
| `commons-N8919K_below_2024-12-27.jpg` | from below on the right: 737 MAX 8; the belly heart, the bands round the keel, both engines, both AT winglets | N8919K | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-8_MAX_N8919K_taking_off_from_Boston_Dec_2024_2.jpg | 4300streetcar | CC BY 4.0 | 2024-12-27 |
| `commons-N8679A_below_2026-04-09.jpg` | from below and behind on the right: 737-800; the bands round the keel, the belly heart, both split scimitar winglets | N8679A | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-800_N8679A_BWI_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2026-04-09 |
| `commons-N947WN_below_2025-06-26.jpg` | from below and behind on the right: 737-700; the belly heart seen nearly square on | N947WN | https://commons.wikimedia.org/wiki/File:Southwest_Boeing_737-700_N947WN_BWI_MD1.jpg | Acroterion | CC BY-SA 4.0 | 2025-06-26 |

The crops (each has the source, author and licence of its photo in `refs.json`):

| File | Shows |
|---|---|
| `crops/N8305E_tail.jpg`, `crops/N8988S_tail.jpg` | tail, left side (737-800 in sun; MAX 8, overcast) |
| `crops/N8781Q_tail.jpg` | tail, right side (MAX 8, sun) |
| `crops/N8865L_engine.jpg`, `crops/N8781Q_engine.jpg` | LEAP-1B engine with the title: left engine and right engine, outer faces |
| `crops/N8523W_engines.jpg` | CFM56-7B engines with the title: left engine outer face, right engine inner face |
| `crops/N8305E_engine.jpg`, `crops/N8570W_engine.jpg` | CFM56-7B engine without the title (N8570W: with a blue inlet lip) |
| `crops/N8305E_winglet_near.jpg`, `crops/N8305E_winglet_far.jpg` | split scimitar winglet: left one, outer face; right one, inner face |
| `crops/N8988S_winglet.jpg`, `crops/N8781Q_winglets.jpg` | AT winglet (MAX 8): left one, outer face; right one outer face and left one inner face |
| `crops/N8988S_fwd.jpg`, `crops/N8988S_doorheart.jpg` | forward fuselage, left: the title, door 1, the small heart |
| `crops/N947WN_heart.jpg`, `crops/N947WN_belly.jpg`, `crops/N8679A_belly.jpg`, `crops/N8919K_belly.jpg` | the belly and its heart from below |

Most useful: `commons-N8305E_left_2026-02-11.jpg` (all left-side positions), `commons-N8524Z_left_2026-08-13.jpg`
and `commons-N8988S_left_2026-08-13.jpg` (ground level, for heights), `commons-N8781Q_right_2025-12-06.jpg` (right
side), `crops/N947WN_heart.jpg` (belly heart), `crops/N8865L_engine.jpg` (engine title).

---

## 3. Colours

Digital brand values: the 2014 logo file on Commons (`logos/Southwest_Airlines_logo_2014.svg`, made from Southwest's
media logo) has the wordmark in **#304CB2**, the heart's outline in **#CCCCCC**, and three gradients: blue #3656CC →
#304CB2 → #283B80, red #E61C23 → #C3161C, yellow #FDBC11 → #FCB415 → #F89E1C (I read these in the SVG source). A
third-party site (brandpalettes.com, source not stated) gives blue #2E4BB1, red #E51D23 (Pantone 485 C), yellow
#F9B612 (Pantone 1235 C) and silver #CCCCCC. I found no paint specification.

Photo samples are medians of boxes on flat areas. H = hue in degrees.

| Paint | Recommended sRGB | Evidence and spread | Trust |
|---|---|---|---|
| **Blue** (fuselage, engines, tail cone, fin corner) | **#304CB2** | Logo #304CB2 (H 227°). Sun: upper side #3547B1 and engine #3749AB, side #233385 (N8305E, H 230–231°); strong sun and strong processing #043AA8 (N8781Q, H 220°), #3464DA (N8679A). Overcast: #2346B1 upper, #0D2D92 side (N8988S, H 225°); #213C8E engine, #102259 side (N8524Z); #2B3C81 (N8523W). Photo hue 220–233°. | High. The sunlit upper side of N8305E is the logo blue to within a few units. |
| **Yellow** (band, fin leading edge, wingtips) | **#F9B612** | Logo #FDBC11–#F89E1C; third party #F9B612. Sun: #F4C21C (N8781Q), #E5B922 and fin #E1B220 (N8305E), #D1A71A (N8679A). Overcast: #F1B90D, fin #E8AD15 (N8988S); #D6A019, fin #F6C833 (N8524Z). Photo hue 43–46°. In shade low on the fuselage it goes to orange (#D18C08, N8305E). | High. |
| **Red** (band, fin, wingtips) | **#E51D23** | Logo #E61C23–#C3161C; third party #E51D23. Sun: #D10006, fin #BB0007 (N8305E, H 358°); fin with glare #E4313D (N8781Q). Overcast: #C01918, fin #BF2F2B (N8988S); #B91F1F, fin #B71D1D (N8524Z). Strong processing: #EE023B (N8919K), #F4503C (N8679A). Photo hue 356–2°. | High for the hue. The photos are a little darker than the logo value. |
| **Silver** (the three thin stripes, the heart's outline) | **#CCCCCC** | Logo #CCCCCC. Photos: #C8CDD5 (fin, N8305E), #BEC8C8 (fin, N8988S), #ABB1B3 (fuselage, N8305E). It is a light metallic silver; it looks white from far. | Medium-high. |
| **White** (title, door outlines, lower blade of the wingtip devices) | **#FFFFFF** | Title in sun #E5E6E3 (N8305E). Lower blade #CAD0D1 (N8988S, overcast), #C7CDD8 (N8781Q). | High. |
| **Inlet lip** (bare metal) | **#C3C5C7** | #D1D0CB (N8988S), #AEB3BA (N8781Q). | Medium. |
| **Exhaust nozzle, core, APU exhaust** (bare metal) | **#857F78** | Nozzle #6F665D (N8781Q), APU exhaust #989590 (N8988S). | Medium-low (an estimate). |
| **Wings and tailplane** (grey) | **#A9ADB1** | Boeing's usual grey, not a Southwest colour. My samples are all in shade (#898174, #6E6254) and not usable. | Low (an estimate). |

There is no black on the nose: the radome is blue and the cockpit windows have no dark surround
(`crops/N8988S_fwd.jpg`, `crops/N8570W_engine.jpg`).

---

## 4. Elements (side elevation)

Landmarks of the 737-800 that I measured on `commons-N8305E_left_2026-02-11.jpg` (after the corrections):

| Landmark | z (m aft of nose) | h (m above keel) |
|---|---|---|
| Door 1 outline | 4.66 – 5.47 | 1.7 – 3.5 |
| Over-wing exits (two per side) | 16.3 – 17.0 and 17.3 – 17.95 | 1.95 – 3.0 |
| Rear door outline | 31.49 – 32.23 | 1.6 – 3.45 |
| Start of the low dorsal fairing on the crown | about 29.0 | 4.0 |
| Fin leading edge, straight part | z = 28.27 + 0.852·h, from h 5.3 (z 32.7) to the tip | |
| Fin trailing edge | z 37.45 at the crown; z = 36.44 + 0.250·h above h 6 | |
| Fin tip (leading / trailing corner) | 37.6 / 39.2 | 11.15 |
| Keel starts to rise | about 28 | 0 |
| Tail-cone tip | 38.02 | 3.25 |

The app's 737 model has a larger fin (tip chord 2.0 m against 1.6 m here). Use the fin fractions u and v for the fin.

**Fuselage base colour:** blue #304CB2 from the nose tip to the bands, all round: the radome, the crown, the belly,
the wing-to-body fairing and the nose gear doors are blue (`crops/N8988S_fwd.jpg`, `crops/N8679A_belly.jpg`,
`crops/N8919K_belly.jpg`). There is no cheatline and no second belly colour.

**The bands.** Behind the wing the fuselage changes from blue to yellow, to red and to blue again. The three
boundaries are smooth lines that rise aft. They are flat near the keel (16–26° above the horizontal), steeper on
the side (32–43°; the first boundary is the steepest, the third the flattest) and steepest on the fin (48–49°,
nearly parallel to the fin's leading edge). A silver stripe lies on each
boundary. z of each edge at height h (left side; the right side is the mirror image):

| h | blue / silver 1 | silver 1 / yellow | yellow / silver 2 | silver 2 / red | red / silver 3 | silver 3 / blue |
|---|---|---|---|---|---|---|
| 0.00 (keel) | 24.1 | 24.5 | 25.8 | 26.0 | – | – |
| 0.25 | 24.8 | 25.15 | 26.55 | 26.8 | 28.8 | 29.3 |
| 0.50 | 25.5 | 25.75 | 27.2 | 27.5 | 29.9 | 30.15 |
| 0.75 | 25.95 | 26.2 | 27.75 | 28.1 | 30.65 | 31.0 |
| 1.00 | 26.35 | 26.6 | 28.25 | 28.6 | 31.4 | 31.65 |
| 1.50 | 27.0 | 27.25 | 29.1 | 29.45 | 32.45 | 32.8 |
| 2.00 | 27.55 | 27.8 | 29.8 | 30.2 | 33.3 | 33.65 |
| 2.50 (windows) | 28.05 | 28.3 | 30.45 | 30.8 | 34.0 | 34.4 |
| 3.00 | 28.5 | 28.85 | 31.05 | 31.4 | 34.65 | 35.05 |
| 3.50 | 29.0 | 29.3 | 31.6 | 31.95 | 35.25 | 35.65 |
| 4.00 (crown) | 29.6 | 29.9 | 32.2 | 32.55 | 35.9 | 36.25 |
| 4.25 | 29.8 | 30.1 | 32.35 | 32.7 | 36.1 | 36.5 |
| 5.00 | – | – | 33.05 | 33.4 | 36.8 | 37.2 |
| 5.50 | – | – | 33.55 | 33.9 | 37.25 | 37.7 |
| 6.50 | – | – | 34.4 | 34.8 | – | – |
| 7.50 | – | – | 35.3 | 35.7 | – | – |
| 8.50 | – | – | 36.15 | 36.6 | – | – |
| 9.50 | – | – | 37.0 | 37.5 | – | – |
| 10.50 | – | – | 37.95 | 38.4 | – | – |
| 10.90 | – | – | 38.3 | 38.8 | – | – |

Notes on the table:

- The keel row is an extrapolation of 0.15 m. The keel rises aft of z 28, so the two aft edges have no keel row: the
  red / silver 3 edge meets the bottom line of the fuselage at z ≈ 28.5.
- Width of the stripes across their length: silver 1, 2 and 3 are each about **0.20 m** wide on the fuselage (0.29 m,
  0.35 m and 0.39 m measured along z at window height). Silver 2 gets wider on the fin: 0.37 m along z at the fin's
  base and 0.50 m at the tip (0.28 m and 0.37 m across).
- Yellow band: 2.15 m along z at window height (about 1.35 m across). Red band: 3.2 m along z (about 1.75 m across).
- At the crown the first boundary (blue / silver 1 / yellow) runs on up the low dorsal fairing. The fairing starts at
  z ≈ 29.0, so its first 0.7 m is blue, then comes the silver stripe, then yellow (`crops/N8305E_tail.jpg`,
  `crops/N8988S_tail.jpg`).
- The bands go round the belly. From below each edge runs on at an angle to the keel and meets its mirror image on
  the centre line, in a V that points forward (`commons-N8679A_below_2026-04-09.jpg`,
  `commons-N8919K_below_2024-12-27.jpg`). I did not measure the V.

**Fin** (both sides alike; `crops/N8305E_tail.jpg`, `crops/N8988S_tail.jpg`, `crops/N8781Q_tail.jpg`; checked on
N8524Z):

- **Yellow** along the leading edge, from the dorsal fairing to the tip. Measured along z it is 0.58 m wide at the
  base and 0.72 m at the tip. In fin fractions: u 0 to 0.12 at v 0.2, to 0.17 at v 0.5, to 0.26 at v 0.77, to 0.45 at
  v 0.97. The dorsal fairing aft of silver 1 is yellow too.
- **Silver stripe 2** behind the yellow: u 0.12–0.19 at v 0.2, 0.17–0.29 at v 0.5, 0.26–0.47 at v 0.77, 0.45–0.76
  at v 0.97.
- **Red** from silver 2 to the trailing edge, and the fin tip aft of the silver. At the tip chord: yellow 45%,
  silver 31%, red 24% (N8524Z: 48%, 33%, 19%).
- **Blue corner:** the lower aft corner of the fin is blue, with **silver stripe 3** between it and the red. At the
  crown the silver is at u 0.75–0.82 and the blue from u 0.82 to the trailing edge. The silver / blue edge reaches
  the trailing edge at h ≈ 5.6 (v 0.23; 5.8 on N8305E, 5.5 on N8524Z). The red / silver edge reaches it at h ≈ 6.1
  (v 0.30; 6.3 and 6.0). The corner is the same line as the red / silver 3 / blue boundary of the fuselage.
- The leading edge has a thin bare-metal strip (a few centimetres; `crops/N8988S_tail.jpg`). Skip it.
- A small United States flag is on the yellow of the dorsal fairing (z 31.5–32.15, h 4.2–4.55). Its stars are
  towards the nose on the left side and towards the tail on the right side (`crops/N8305E_tail.jpg`,
  `crops/N8781Q_tail.jpg`). Skip it, or draw it small.

**Tail cone:** blue aft of silver 3, to the end. The APU exhaust at the tip is bare metal (z 37.7–38.02 on the
737-800; `crops/N8988S_tail.jpg`).

**Titles and marks on the fuselage:**

- **"Southwest"**, white, the logo's own letters (capital S, lower case; no registered-trademark sign), on each side
  of the forward fuselage. Box: **z 6.3 – 16.2** (9.9 m long). It starts 1.26 m aft of the centre of door 1 and ends
  0.1 m ahead of the forward over-wing exit. **Baseline h ≈ 2.1, top of the "S" h ≈ 3.5**, tops of the "h" and "t"
  h ≈ 3.55, top of the small letters h ≈ 3.2. The window row runs through the letters, 0.45 m above the baseline; the
  windows stay clear. Measured: N8305E baseline 2.15, cap top 3.49, length 9.88 m; N8524Z baseline 1.95, cap top
  3.43, length 9.8 m; N8988S baseline 2.05, cap top 3.43.
  - On the skin the letters keep the logo's shape: the "S" is 0.16 of the word's length, which is 1.58 m measured
    round the fuselage. Seen from the side the curve of the fuselage shortens it to about **1.4 m** (0.142–0.150 of
    the length in the three photos). In a side-elevation drawing, stretch `title.svg` to the box (its height becomes
    about 89% of its natural height).
  - Letter positions on the left side (from the logo's proportions): S 6.30–7.39, o 7.46–8.62, u 8.70–9.71,
    t 9.81–10.59, h 10.66–11.66, w 11.67–13.44, e 13.39–14.45, s 14.52–15.39, t 15.40–16.19.
  - **Left side:** reads from nose to tail ("S" at z 6.3). **Right side:** the same box; it reads from tail to nose
    ("S" at z 16.2 beside the over-wing exits, the last "t" beside door 1). Never mirrored
    (`commons-N8781Q_right_2025-12-06.jpg`). On the right-side master the box measures 0.2–0.4 m further aft; that
    photo is oblique, and the ends sit against the same door and exit, so I use the same box.
- **Small heart beside door 1:** the logo's three-colour heart with its silver outline, upright, **0.26 m wide and
  0.24 m high**, centre at **z 5.7, h 3.1**. That is 0.25 m aft of the door's aft edge and a little below the door's
  top, between the door and the title. It is aft of door 1 on both sides (`crops/N8988S_doorheart.jpg`,
  `crops/N8570W_engine.jpg`, `commons-N8781Q_right_2025-12-06.jpg`).
- **Belly heart:** the same heart, large, on the centre line of the belly ahead of the wing-to-body fairing: centre
  at **z ≈ 12 (±0.8)**, about **1.2 m (±0.3)** from its point to its top. Its top points to the nose and its point to
  the tail. The blue part is towards the right wing and the yellow lobe towards the left wing, so a person below the
  aircraft who looks along it towards the nose reads the heart the right way round (`crops/N947WN_heart.jpg`; also
  `crops/N8679A_belly.jpg`, `crops/N8919K_belly.jpg`, and under N8523W and N9007K). A side elevation cannot show it:
  it needs the belly view.
- Registration: blue letters on the yellow band, above the last windows, ahead of the rear door (z 29.3–30.8,
  h ≈ 3.1–3.35), on both sides. A small fleet number with "ETOPS" is above it, and the fleet number is in white on
  the nose gear door. Skip all three.
- Door and exit outlines: thin white lines round the two passenger doors (blue zone and red zone) and the over-wing
  exits. Optional.
- "Heart One" (N8642E) has its name in white under the cockpit window. Other aircraft have no name there. Skip it.

**Tailplane:** grey on both surfaces. No livery colour (`crops/N8988S_tail.jpg`, `commons-N8679A_below_2026-04-09.jpg`).

**Wings:** grey on both surfaces, with bare-metal leading edges. The flap-track fairings and the engine pylons are
light grey or white, not blue (`crops/N8865L_engine.jpg`, `commons-N8919K_below_2024-12-27.jpg`).

**Engines** (CFM56-7B on the 737-700 and 737-800, LEAP-1B on the MAX 8):

- The whole cowl is blue #304CB2.
- Inlet lip: a bare polished ring. It is about 0.15 m wide on the CFM56 and about 0.3 m on the LEAP-1B (one tenth of
  the cowl's length on `crops/N8865L_engine.jpg`).
- LEAP-1B: the blue cowl ends in the saw-tooth chevrons; the nozzle and plug behind them are bare metal. CFM56: plain
  round exit, bare-metal nozzle and plug.
- **Title "Southwest♥com"**: white letters, with a small red-and-yellow heart in place of the dot, low on the line
  like a full stop. Measured on `crops/N8865L_engine.jpg` (LEAP-1B, nearly side-on): it runs from **0.12 to 0.88 of
  the cowl's length** behind the front of the lip; the capital "S" is **0.146 of the cowl's height**; the title's
  centre is **0.08 of the height above the centre line**. With the MAX 8 model's cowl (3.76 m long, about 2.4 m high)
  that is 0.45 m to 3.3 m behind the lip and letters 0.35 m high. On the CFM56 the title has the same place and
  proportions; I measured it only on oblique photos (letters about 0.12 of the cowl's height, about 0.25 m;
  `crops/N8523W_engines.jpg`).
- The title is on **both faces of both engines** and always reads the right way: on the left engine's outer face and
  the right engine's inner face the "S" is at the inlet end; on the right engine's outer face and the left engine's
  inner face the "S" is at the exhaust end (`crops/N8865L_engine.jpg`, `crops/N8781Q_engine.jpg`,
  `crops/N8523W_engines.jpg`, `crops/N8919K_belly.jpg`).
- **Some aircraft have no title.** Of those, two 737-800s have a **blue** inlet lip (`crops/N8570W_engine.jpg`; on
  N8305E the blue runs to the front edge with no bright ring, `crops/N8305E_engine.jpg`); the two MAX 8s keep the bare lip
  (`commons-N8988S_left_2026-08-13.jpg`, `commons-N9007K_left_2026-08-06.jpg`). I do not know the rule. Draw the
  title: it is on at least 8 of the 10 tracked aircraft's thumbnails and on most 2024–2026 photos.
- Small red warning marks are low on the cowl. Skip them.

**Wingtip devices.** Three kinds fly: blended winglets (some 737-700: N286WN, N212WN), split scimitar winglets
(737-800, some 737-700: N8305E, N7748A, N7888A) and AT winglets (MAX 8). All have the fin's colours on the upper
blade, **the same on the outer and the inner face**:

- **Yellow** along the leading edge, as a band of nearly constant width, so it takes more of the chord towards the
  tip. AT winglet (`crops/N8988S_winglet.jpg`): 27% of the chord at the base, 54% at half height, 79% at the tip
  (about 0.4 m wide). Split scimitar (`crops/N8305E_winglet_near.jpg`): 9–62% of the chord at half height, behind a
  bare-metal leading-edge strip of 9%; the pointed tip cap is all yellow.
- A thin **silver** stripe (3–5% of the chord, a few centimetres), then **red** to the trailing edge.
- **Blue** in the lower aft corner, with a thin silver stripe between it and the red. AT winglet: the aft 44% of the
  base chord, up to 30% of the blade's height at the trailing edge. Split scimitar: the aft 25% of the base, up to
  17% of the height. Blended winglet: a longer blue wedge along the lower aft edge, down into the curve to the wing
  (`commons-N212WN_left_2025-09-11.jpg`, `commons-N286WN_right_2024-03-11.jpg`).
- The **lower blade** (split scimitar and AT winglet) is **white** on both faces. So is the junction with the wing.
- Inner faces: `crops/N8305E_winglet_far.jpg` and `crops/N8781Q_winglets.jpg` show yellow, silver and red in the
  same order (yellow at the leading edge); `commons-N8679A_below_2026-04-09.jpg` shows the blue corner on the inner
  face too. There is no text on either face.

**Nose:** blue radome, no nose band, no dark surround round the cockpit windows.

---

## 5. Side-elevation drawing steps

### LEFT side (nose at the left, z to the right)

1. **Fill** the whole elevation blue #304CB2: fuselage, fin, tail cone.
2. **Silver 1:** fill silver #CCCCCC aft of the "blue / silver 1" line of the table (from below the keel to the top
   of the dorsal fairing at h ≈ 4.6). Let the line overshoot below the keel.
3. **Yellow:** fill #F9B612 aft of the "silver 1 / yellow" line. On the fin this gives the yellow leading-edge band
   by itself: everything on the fin ahead of the next line is yellow.
4. **Silver 2:** fill silver aft of the "yellow / silver 2" line, from below the keel to above the fin tip.
5. **Red:** fill #E51D23 aft of the "silver 2 / red" line.
6. **Silver 3**, then **blue:** fill silver aft of the "red / silver 3" line and blue #304CB2 aft of the
   "silver 3 / blue" line. Both lines stop at the fin's trailing edge (h ≈ 6.1 and 5.6). Above that the red runs to
   the trailing edge.
7. On a model whose fin is larger or smaller than the real one, draw steps 4 to 6 on the fin in fin fractions
   (section 4) and join them to the fuselage lines at the crown.
8. **APU exhaust:** bare metal #857F78 on the last 0.3 m of the tail cone.
9. **Title:** `title.svg` in the box z 6.3–16.2, from h 2.09 (its bottom edge) to h 3.55 (its top edge, the top of
   the "h"), stretched to the box. It reads from nose to tail.
10. **Small heart:** `heart.svg`, 0.26 m wide, centre z 5.7, h 3.1.
11. Skip the registration, the flag, the fleet numbers and the warning marks. The door outlines are optional (white
    lines 0.03 m wide).

### RIGHT side (differences from the left)

- The colour fields are the mirror image: the same lines.
- **Title:** the same box, not mirrored. Seen from the right it reads "Southwest" from left to right, so the "S" is
  at the aft end (z 16.2) and the last "t" beside door 1.
- **Small heart:** the same place (aft of door 1), not mirrored.

### Belly view

`heart-belly.svg` (the heart turned so that its top points to the nose), centre z 12, on the centre line, 1.2 m from
point to top. No belly title, no belly panel.

### Flat colours

- Wings, tailplane: #A9ADB1. Pylons and flap-track fairings: the same, or a little lighter.

### Nacelle artwork (both engines, all faces)

Blue #304CB2. Inlet lip ring #C3C5C7 (the front 0.15 m on the 737-800 model, 0.3 m on the MAX 8 model). Exhaust end
#857F78. Title: `title.svg`, then `heart.svg` as the dot (about 45% of the small letters' height, on the baseline),
then "com" in Source Sans 3 Bold, all white except the heart; from 0.12 to 0.88 of the cowl's length behind the lip,
capital height 0.146 of the cowl's height, centre 0.08 of the height above the centre line. It always reads the right
way (the kit turns text and images on the right side).

### Wingtip artwork

Upper blade, both faces: yellow leading-edge band (about half the chord at half height, more towards the tip), a
thin silver stripe, red behind it, a blue lower aft corner with a thin silver stripe. Lower blade and junction:
white.

---

## 6. Logos, wordmarks and fonts

| Graphic | Commons file | Licence | In `liveries/SWA/` | Use |
|---|---|---|---|---|
| **"Southwest" wordmark** (fuselage title, first part of the engine title) | https://commons.wikimedia.org/wiki/File:Southwest_Airlines_logo_2014.svg | **PD-textlogo**, with the Trademarked tag (I read the file page: `{{PD-textlogo}}`, `{{trademarked}}`; author Lippincott Studio, NY; dated 2014-09-01) | `title.svg`: the wordmark's path, unchanged, in white, without the registered-trademark sign and without the heart (viewBox 187.6 × 31.2) | Usable. The letters on the aircraft have the same shapes and proportions as this wordmark. |
| **Heart** (beside door 1, on the belly, the dot of the engine title) | the same file | the same | `heart.svg`: the four heart paths and the three gradients, unchanged. `heart-belly.svg`: the same, turned a quarter turn anticlockwise for the belly view | Usable. On the aircraft the heart has the same three colours and the silver outline. |
| "com" of the engine title | – (the logo file has no "c" and no "m") | – | typeset it: `SourceSans3-Bold.woff2` | See fonts. |
| United States flag on the fin base | not taken | – | – | Leave out, or draw a plain flag. |

The original file is kept in `logos/Southwest_Airlines_logo_2014.svg` (refs folder). The app's present
`SWA-title.png` comes from the same Commons file.

**Fonts.** Southwest's own typeface is not free. For "com" I chose **Source Sans 3 Bold** (Adobe, SIL Open Font
License 1.1; `SourceSans3-Bold.woff2` and `SourceSans3-OFL.txt`, both in `sources.json`). I set "Southwest." in
Source Sans 3 Bold and Black, Fira Sans Bold and Hind Bold and compared them with the wordmark: Source Sans 3 Bold is
nearest in stem weight (0.21 of the ascender height against 0.19 in the wordmark), it has the slanted top on the "t"
and the pointed middle of the "w". Its letters are a little narrower than the wordmark's.

---

## 7. Geometry facts for the model

- **737-800** (model `b738`): length 39.47 m over the tailplane, fuselage 38.02 m, fuselage 3.76 m wide and 4.01 m
  high. CFM56-7B engines. Southwest's 737-800s in the photos have split scimitar winglets; the model has blended
  winglets, which some 737-700s have. The same art fits both (no lower blade on the model).
- **737 MAX 8** (model `b38m`): the same fuselage and the same band positions; a longer blue tail cone; LEAP-1B
  engines with chevrons and a wider polished lip; AT winglets with a white lower blade.
- **737-700**: 33.6 m long; drawn on the 737-800 model. The scheme is the same; I did not measure it.
- Doors per side on the 737-800: door 1, two over-wing exits, rear door. This matters only if the design draws the
  outlines.
- **Differences from the app's present `liveries.json` entry**
  (`"SWA": {"base": "#304cb2", "fin": "#304cb2", "fin2": "#e21e26", "title": true}`):
  - the base blue is right;
  - the fin is not blue with a red second colour: it is yellow at the leading edge, then silver, then red, with a
    small blue corner;
  - the yellow and red bands on the rear fuselage, the silver stripes, the hearts, the engine titles and the wingtip
    art are missing.

---

## 8. Confidence and open questions

- **High:** the scheme and its parts; the order of the colours; that both sides are mirror images; that the titles
  read the right way on both sides; that all three types wear it; the three paint colours.
- **Band and title positions:** ±0.2 m in z and ±0.15 m in h. The master photo is oblique (12° and 6°) and I
  corrected it by calculation; three other photos agree to 0.2 m (the table at the top). A true side view from far
  would be better; I did not find one on Commons.
- **Fin:** the fractions come from two photos that agree to 0.03 in u. The blue corner's top is ±0.3 m.
- **Title height:** the three photos give 1.34–1.48 m for the "S" in side view; I use 1.4 m.
- **Belly heart:** position ±0.8 m and size ±0.3 m, from oblique photos. Its direction (top to the nose, yellow lobe
  to the left wing) is clear on `crops/N947WN_heart.jpg`.
- **The V of the bands under the belly:** seen, not measured.
- **Engine title:** the proportions come from one nearly side-on photo of a LEAP-1B. For the CFM56 they are an
  estimate (medium-low).
- **Engines without a title, blue inlet lips:** five aircraft in 2026 photos. I do not know if this is a new
  standard or spare cowls. The design draws the title.
- **Wingtip devices:** the fractions come from small crops (medium). The inner faces are seen only in part; the blue
  corner on the inner face is seen on one photo.
- **Wing and tailplane grey, metal colours:** estimates.
- **Canyon Blue:** I did not check whether any aircraft still wears it. The app paints every Southwest aircraft in
  the Heart scheme.
- **Brand colour names and paint codes:** not found in a primary source.
- **Planespotters dates:** the API gives none. Every planespotters thumbnail is "reference only".

Sources consulted: Wikimedia Commons (the files above; the categories "Current Boeing 737-700 of Southwest
Airlines", "Current Boeing 737-800 of Southwest Airlines", "Boeing 737-8 MAX of Southwest Airlines", "Aircraft of
Southwest Airlines by name"); the planespotters.net public API;
[AirlineRatings, "You've got to have heart! Southwest's new livery" (2014-09-08)](https://www.airlineratings.com/articles/youve-got-to-have-heart-southwests-new-livery);
[brandpalettes.com, Southwest Airlines logo colours](https://brandpalettes.com/southwest-airlines-logo-colors/)
(third party, source not stated); Boeing airport-planning stations as recorded in `public/models/b738/recipe.json`
and `public/models/b38m/recipe.json`; [Source Sans](https://github.com/adobe-fonts/source-sans) (font and licence);
the `client/scene/liveries.json` SWA entry.

---

## Rendered check (2026-10-14)

Three renders of `b737:SWA b738:SWA b38m:SWA` against the photos (N8305E, N8524Z, N8988S, N8781Q, N8786Q, N8573Z, N212WN, the engine, winglet, tail and belly crops).

- Fixed: the bare-metal APU patch spanned the whole height behind z = tail + 0.3 m, and the body table ends 1.65 m ahead of the tail cone's tip, so the fin's aft half was painted grey. It is now the tail cone's tip only (from the rear door: d 37.6 on), below the fin; the red now runs to the fin's trailing edge above h 6.1 and the blue corner shows below it, as on N8305E and N8988S.
- Tuned: the bare-metal strip on the blended winglet's leading edge is thinner (0.04 of the chord).
- Matches: the blue, the white title's text, size and place on both sides (reads forwards on both), the three bands with their silver stripes up the fin (their start on the belly, their slant, where they meet the crown and the dorsal fairing), the tail cone, the small heart by door 1, the flag, the engine titles, the red and yellow wingtip devices, the 737-700 (no exits drawn) and the 737-800 and MAX (exits drawn).
- Still differs: the 737-800 model has the blended winglet (the real ones carry the split scimitar); older -800s have no engine title (the design puts one on every engine); the belly heart is small and hard to see from below; the windows come from the shader and run on past the rear door over the bands.
