# easyJet (EZY / EJU / EZS): Airbus A319, A320, A320neo and A321neo livery dossier

Research date: 2026-10-13. Refs folder: `data/livery-refs/EZY/` (git-ignored). Every file name below is in that
folder. `refs.json` lists each photo with its view. I looked at each photo (the full frame and zoomed crops). I
measured the positions and the colours from the pixels.

No second agent checked this dossier yet.

Coordinate convention (side elevation, the same for both sides):

- **d** = metres aft of the nose tip (0 = radome tip). The other dossiers call it z. The kit's own `z` runs the other
  way.
- **h** = metres above the keel of the constant-section fuselage (0 = keel, crown = 4.14). The fuselage is 3.95 m
  wide and 4.14 m high.
- **L** = the length of the type: 33.84 m (A319), 37.57 m (A320 and A320neo), 44.51 m (A321neo). The last point is
  the tip of the APU exhaust.
- The window row: window centres at h 2.69 (measured on all 3 master photos).

Scale sources (the "master" photos, 3840 px copies):

- **Left side, A320neo:** `commons-G-UZLS_STN_2024-06-22.jpg`. The camera is ahead of side-on (about 11°, an estimate). The
  window pitch is 42.6 px at the front and 42.0 px at the rear. Nose tip x = 517.5 px, tail tip x = 3490 px. I fitted
  x = 517.5 + 80.73·d − 0.0397·d² for points on the centreline. A point on the near skin moves 15.8 px aft for each
  metre of half-width. Vertical: 80.7 px/m (keel to crown 334 px = 4.14 m). Check: the fit puts the tail tip at
  d 37.51.
- **Right side, A320neo:** `commons-Airbus_A320-251N_c-n_8662_G-UZHT_2026-01-19_Andre_Gerwing_Collection_ID_027759.j.jpg`.
  Long lens, 3° ahead of side-on. Nose tip x = 3639.5 px, tail tip x = 204 px, 91.35 px/m along the whole length
  (window pitch 48.5 to 49.0 px). Vertical: 91.1 px/m. Check: tail tip at d 37.61.
- **Right side, A321neo:** `commons-G-UZMG_easyJet_A21N_EGCC.jpg`. Nose tip x = 3633 px, tail tip x = 192 px,
  x = 3633 − (76.32·d + 0.0252·d²), vertical 76.5 px/m. Check: tail tip at d 44.44. Door 3 is at d 26.2 to 27.2 and
  door 4 at d 36.0 to 36.9. The Wizz Air dossier has the same door places.
- **A319:** `commons-G-EZGH_-_Airbus_A319-111_-_easyJet_LGW_120225.jpg` (left, side-on, hazy, 86.1 px/m). I used
  `commons-G-EZBW_-_Airbus_A319-111_-_easyJet_BHX_110625.jpg` and
  `commons-Airbus_A319-111_c-n_3082_G-EZBO_2026-04-23_Andre_Gerwing_Collection_ID_028581.jp.jpg` as checks.

The two A320neo masters agree to within 0.3 m. The right photo puts each door 0.1 m further aft than the left
photo. The values below are the means.

---

## 1. Identity

**Scheme:** the easyJet livery of 2015. easyJet showed it on 3 February 2015. Its press statement said: the orange
goes from the fin onto the fuselage, the logo is 15% larger, and an orange stripe is new on the fuselage. New
aircraft got it from April 2015. Older aircraft got it at their next repaint (source: Travel Weekly, 2015-02-03).
Other trade reports name the A319 G-EZDE as the first aircraft. I did not open those pages.

The parts (seen on `G-UZLS`, `G-UZHT`, `G-UZMG`, `G-EZBW`, `G-EZBO` and `OE-IWW`):

- A white fuselage, white all round, with no grey belly and no cheatline.
- An orange **cap** over the cockpit windows, which widens aft into an orange **wedge**. The wedge covers the crown
  to above the 9th window. Then it runs down and aft as a long dart behind the wing. It ends in a sharp tip low on
  the rear fuselage.
- A white **easyJet** wordmark on the wedge, above the windows, aft of door 1.
- An orange **tail band**: a straight diagonal cut near the rear door. Aft of it the fuselage is orange all round.
- An all-orange fin with a large white **easyJet** wordmark along its leading edge.
- A white tail cone.
- Orange engine nacelles with bare-metal inlet lips and no title.
- Orange wingtip devices. A Sharklet has the wordmark on its inner face only.

The scheme before it (1998 to 2015) had a white fuselage with orange "easyJet.com" or "easyJet" titles, an orange
fin and titles on the engines. Do not draw that one.

**Operators:** easyJet UK (callsign EZY, G- register), easyJet Europe (EJU, OE-) and easyJet Switzerland (EZS, HB-)
wear the same paint. The OE- aircraft carry 2 small flags (EU and Austria) above the registration (`OE-IZF`). The app's
`client/scene/liveries.json` already aliases EJU and EZS to EZY.

**Types:** all 4 types wear the same design. The design is fixed at the nose and at the tail. Only the wedge
changes its length (section 4).

| Type | Length | Engines | Wingtip device |
|---|---|---|---|
| A319-111 | 33.84 m | CFM56-5B | wingtip fence |
| A320-214 | 37.57 m | CFM56-5B | wingtip fence (`G-EZUZ`) or Sharklet (`G-EZOI`, `G-EZWK`, `OE-IWW`) |
| A320-251N (A320neo) | 37.57 m | CFM LEAP-1A | Sharklet |
| A321-251NX (A321neo) | 44.51 m | CFM LEAP-1A | Sharklet |

**Exceptions:**

- "NEO" logo aircraft: the standard scheme plus large grey outline letters "NEO" on the rear fuselage. I saw
  them on HB-AYN (2026-05-08), HB-AYE (2026-06-08) and G-UZMA (2019-01-18), on Commons previews. These photos are
  not stored. None of the 10 tracked aircraft has the letters. Paint these aircraft in the standard scheme.
- Small per-aircraft marks: the last 3 letters of the registration in white on the cap ("ZHT", "JCV"), the
  registration in black on the rear fuselage, and on some aircraft a name in orange below the cockpit windows
  ("Paul Green" on `G-UZMG`). Leave them out.
- Old scheme: every stored photo is from 2019 or later and shows the 2015 scheme. I saw the old scheme only in photos
  from 2017 or earlier (for example HB-JXC, April 2017, with a title on the engine). I deleted those photos.

**Tracked aircraft:** all 10 show the standard 2015 scheme in their current planespotters photo.

| Registration (hex) | Type | Operator | Scheme | Evidence |
|---|---|---|---|---|
| G-UJEC (407fc7) | A320-251N | easyJet UK | standard 2015 | `ps-407fc7-1973734.jpg` |
| G-UZLY (4080ad) | A320-251N | easyJet UK | standard 2015 | `ps-4080ad-1906040.jpg`, `commons-Easyjet_G-UZLY_A320neo.jpg` (2025-09-01) |
| G-UJEA (407f79) | A320-251N | easyJet UK | standard 2015 | `ps-407f79-1926093.jpg` |
| G-UZHM (407567) | A320-251N | easyJet UK | standard 2015 | `ps-407567-1986178.jpg` |
| G-EJCO (407f5f) | A320-214 | easyJet UK | standard 2015 | `ps-407f5f-1868874.jpg` |
| G-EJCD (407f64) | A320-214 | easyJet UK | standard 2015 | `ps-407f64-1713831.jpg` |
| G-EJCA (407e5f) | A320-214 | easyJet UK | standard 2015 | `ps-407e5f-1978788.jpg` |
| G-EJCV (407f62) | A320-214 | easyJet UK | standard 2015 | `ps-407f62-1903189.jpg` (head-on) |
| OE-IBF (440cf8) | A320-214 | easyJet Europe | standard 2015 | `ps-440cf8-1885917.jpg` |
| OE-ICJ (440c96) | A320-214 | easyJet Europe | standard 2015 | `ps-440c96-1920950.jpg` (from below) |

---

## 2. Reference images

The folder holds 57 photos: 10 planespotters thumbnails, 42 Commons photos and 5 crops of Commons photos. The
Commons files are the 1200 to 3840 px copies that Wikimedia served. The licences, authors and dates are the ones the
Commons API returned. The planespotters API gives no date. I looked at about 160 Commons previews to choose them.

| File | View | Registration | Type | What it shows | Source | Photographer | Licence | Date |
|---|---|---|---|---|---|---|---|---|
| `ps-407fc7-1973734.jpg` | right side | G-UJEC | A320neo | on the ground | https://www.planespotters.net/photo/1973734/g-ujec-easyjet-airbus-a320-251n | Radiance777 | planespotters.net: reference only | no date (API) |
| `ps-4080ad-1906040.jpg` | right side | G-UZLY | A320neo | on the ground, a little from the front | https://www.planespotters.net/photo/1906040/g-uzly-easyjet-airbus-a320-251n | Alexander Zur | planespotters.net: reference only | no date (API) |
| `ps-407f79-1926093.jpg` | left side | G-UJEA | A320neo | in flight | https://www.planespotters.net/photo/1926093/g-ujea-easyjet-airbus-a320-251n | Wesley Poxon | planespotters.net: reference only | no date (API) |
| `ps-407567-1986178.jpg` | left side | G-UZHM | A320neo | take-off roll | https://www.planespotters.net/photo/1986178/g-uzhm-easyjet-airbus-a320-251n | Marcel Rudolf | planespotters.net: reference only | no date (API) |
| `ps-407f5f-1868874.jpg` | left side | G-EJCO | A320 (Sharklets) | on the ground | https://www.planespotters.net/photo/1868874/g-ejco-easyjet-airbus-a320-214-wl | Karl Dittlbacher | planespotters.net: reference only | no date (API) |
| `ps-407f64-1713831.jpg` | right side | G-EJCD | A320 | in flight, from below | https://www.planespotters.net/photo/1713831/g-ejcd-easyjet-airbus-a320-214 | Kaan Can Ozdemir | planespotters.net: reference only | no date (API) |
| `ps-407e5f-1978788.jpg` | right side | G-EJCA | A320 (Sharklets) | in flight, from below | https://www.planespotters.net/photo/1978788/g-ejca-easyjet-airbus-a320-214-wl | Chris Pitchacaren | planespotters.net: reference only | no date (API) |
| `ps-407f62-1903189.jpg` | front | G-EJCV | A320 (Sharklets) | head-on: the orange cap with the white letters "JCV" above the windscreen | https://www.planespotters.net/photo/1903189/g-ejcv-easyjet-airbus-a320-214-wl | Lorenzo Cirillo | planespotters.net: reference only | no date (API) |
| `ps-440cf8-1885917.jpg` | right side | OE-IBF | A320 (Sharklets) | easyJet Europe, on the ground | https://www.planespotters.net/photo/1885917/oe-ibf-easyjet-europe-airbus-a320-214-wl | Laszlo Fekete | planespotters.net: reference only | no date (API) |
| `ps-440c96-1920950.jpg` | below | OE-ICJ | A320 (Sharklets) | easyJet Europe, climbing, from below and ahead | https://www.planespotters.net/photo/1920950/oe-icj-easyjet-europe-airbus-a320-214-wl | Florencio Martin Melian | planespotters.net: reference only | no date (API) |
| `commons-Easyjet_A320-251N_G-UZLT.jpg` | left side | G-UZLT | A320neo | on the ground, close: the nose is nearer than the tail (perspective) | https://commons.wikimedia.org/wiki/File:Easyjet_A320-251N_G-UZLT.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `commons-G-UZLS_STN_2024-06-22.jpg` | left side | G-UZLS | A320neo | landing roll, long lens, 11 degrees from the front: the measurement master for the left side | https://commons.wikimedia.org/wiki/File:G-UZLS_@_STN,_2024-06-22.jpg | Steve Knight | CC BY 2.0 | 2024-06-22 |
| `commons-EasyJet_G-UZHO_Airbus_A320-251N_49601344923_.jpg` | left side | G-UZHO | A320neo | on the ground | https://commons.wikimedia.org/wiki/File:EasyJet,_G-UZHO,_Airbus_A320-251N_(49601344923).jpg | Anna Zvereva | CC BY-SA 2.0 | 2019-07-14 |
| `commons-EasyJet_G-UZHM_Airbus_A320-251N_49602109582_.jpg` | left side | G-UZHM | A320neo | on the ground, a little from the front | https://commons.wikimedia.org/wiki/File:EasyJet,_G-UZHM,_Airbus_A320-251N_(49602109582).jpg | Anna Zvereva | CC BY-SA 2.0 | 2020-01-09 |
| `commons-Easyjet_G-UZLY_A320neo.jpg` | 3/4 front left | G-UZLY | A320neo | on the ground, "ZLY" on the cap, the right engine's inboard face | https://commons.wikimedia.org/wiki/File:Easyjet_G-UZLY_A320neo.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-09-01 |
| `commons-Airbus_A320-214_c-n_6257_OE-IWW_2026-10-07_Andre_Gerwing_Collection_ID_031374.jp.jpg` | left side | OE-IWW | A320 (Sharklets) | easyJet Europe, on the ground, a little from the front, the newest photo, the right Sharklet's inner face with its title | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_6257,_OE-IWW)_2026-10-07_Andre_Gerwing_Collection_ID_031374.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `commons-Airbus_A319-111_c-n_3082_G-EZBO_2026-04-23_Andre_Gerwing_Collection_ID_028581.jp.jpg` | left side | G-EZBO | A319 | in flight, from below and the left: the blade's tip, the tail band, the wingtip fence | https://commons.wikimedia.org/wiki/File:Airbus_A319-111_(c-n_3082,_G-EZBO)_2026-04-23_Andre_Gerwing_Collection_ID_028581.jpg | André Gerwing | CC BY-SA 4.0 | 2026-04-23 |
| `commons-Airbus_A319-111_c-n_3742_G-EZDV_2025-12-17_Andre_Gerwing_Collection_ID_027583.jp.jpg` | left side | G-EZDV | A319 | in flight | https://commons.wikimedia.org/wiki/File:Airbus_A319-111_(c-n_3742,_G-EZDV)_2025-12-17_Andre_Gerwing_Collection_ID_027583.jpg | André Gerwing | CC BY-SA 4.0 | 2025-12-17 |
| `commons-G-EZGH_-_Airbus_A319-111_-_easyJet_LGW_120225.jpg` | left side | G-EZGH | A319 | on the ground, side-on but hazy | https://commons.wikimedia.org/wiki/File:G-EZGH_-_Airbus_A319-111_-_easyJet_LGW_120225.jpg | kitmasterbloke | CC BY 2.0 | 2025-03-02 |
| `commons-Hamburg_Airport_easyJet_Airbus_A321-251NX_G-UZMB_DSC0425_.jpg` | left side | G-UZMB | A321neo | in flight, from below and the left | https://commons.wikimedia.org/wiki/File:Hamburg_Airport_easyJet_Airbus_A321-251NX_G-UZMB_(DSC0425).jpg | MarcelX42 | CC BY-SA 4.0 | 2024-04-14 |
| `commons-EasyJet_G-UZMF_Airbus_A321-251NX_49585805831_.jpg` | left side | G-UZMF | A321neo | in flight | https://commons.wikimedia.org/wiki/File:EasyJet,_G-UZMF,_Airbus_A321-251NX_(49585805831).jpg | Anna Zvereva | CC BY-SA 2.0 | 2019-10-27 |
| `commons-EasyJet_A321-200neo_arriving_at_LGW.jpg` | left side | - | A321neo | on the ground, a little from the front | https://commons.wikimedia.org/wiki/File:EasyJet_A321-200neo_arriving_at_LGW.jpg | BOSSHEP | CC0 | 2024-03-04 |
| `commons-Airbus_A320-251N_c-n_8662_G-UZHT_2026-01-19_Andre_Gerwing_Collection_ID_027759.j.jpg` | right side | G-UZHT | A320neo | on the ground, long lens, 3 degrees from the front: the measurement master for the right side | https://commons.wikimedia.org/wiki/File:Airbus_A320-251N_(c-n_8662,_G-UZHT)_2026-01-19_Andre_Gerwing_Collection_ID_027759.jpg | André Gerwing | CC BY-SA 4.0 | 2026-01-19 |
| `commons-G-UZMG_easyJet_A21N_EGCC.jpg` | right side | G-UZMG | A321neo | landing roll, side-on: the measurement master for the A321neo | https://commons.wikimedia.org/wiki/File:G-UZMG_easyJet_A21N_EGCC.jpg | Oscaracton | CC BY 4.0 | 2026-05-25 |
| `commons-G-EZBW_-_Airbus_A319-111_-_easyJet_BHX_110625.jpg` | right side | G-EZBW | A319 | on the ground, from above and a little from the front | https://commons.wikimedia.org/wiki/File:G-EZBW_-_Airbus_A319-111_-_easyJet_BHX_110625.jpg | kitmasterbloke | CC BY 2.0 | 2025-06-11 |
| `commons-G-UZMD_LGW_270225.jpg` | right side | G-UZMD | A321neo | on the ground, the fin is cut off, strong processing | https://commons.wikimedia.org/wiki/File:G-UZMD_LGW_270225.jpg | kitmasterbloke | CC BY 2.0 | 2025-04-14 |
| `commons-Airbus_A320-251N_c-n_8110_G-UZHE_2026-03-19_Andre_Gerwing_Collection_ID_028048.j.jpg` | right side | G-UZHE | A320neo | in flight | https://commons.wikimedia.org/wiki/File:Airbus_A320-251N_(c-n_8110,_G-UZHE)_2026-03-19_Andre_Gerwing_Collection_ID_028048.jpg | André Gerwing | CC BY-SA 4.0 | 2026-03-19 |
| `commons-Airbus_A320-214_c-n_6562_G-EZOI_2026-05-08_Andre_Gerwing_Collection_ID_028690.jp.jpg` | right side | G-EZOI | A320 (Sharklets) | in flight | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_6562,_G-EZOI)_2026-05-08_Andre_Gerwing_Collection_ID_028690.jpg | André Gerwing | CC BY-SA 4.0 | 2026-05-08 |
| `commons-Airbus_A319-111_c-n_4380_G-EZFW_2025-11-06_Andre_Gerwing_Collection_ID_027299.jp.jpg` | right side | G-EZFW | A319 | in flight | https://commons.wikimedia.org/wiki/File:Airbus_A319-111_(c-n_4380,_G-EZFW)_2025-11-06_Andre_Gerwing_Collection_ID_027299.jpg | André Gerwing | CC BY-SA 4.0 | 2025-11-06 |
| `commons-EasyJet_G-UZMC_Airbus_A321-251NX_49585805891_.jpg` | right side | G-UZMC | A321neo | in flight | https://commons.wikimedia.org/wiki/File:EasyJet,_G-UZMC,_Airbus_A321-251NX_(49585805891).jpg | Anna Zvereva | CC BY-SA 2.0 | 2019-12-04 |
| `commons-G-UZHY.jpg` | right side | G-UZHY | A320neo | on the ground, a little from behind | https://commons.wikimedia.org/wiki/File:G-UZHY.jpg | Alec Wilson | CC BY-SA 2.0 | 2021-12-11 |
| `commons-G-EZBI_easyJet_Airbus_A319-111_LGW_120225.jpg` | right side | G-EZBI | A319 | on the ground, through glass | https://commons.wikimedia.org/wiki/File:G-EZBI_easyJet_Airbus_A319-111_LGW_120225.jpg | kitmasterbloke | CC BY 2.0 | 2025-03-02 |
| `commons-G-UZHZ_Airbus_A320_251N_at_Luton_8th_February_2025.jpg` | 3/4 rear right | G-UZHZ | A320neo | on the ground | https://commons.wikimedia.org/wiki/File:G-UZHZ_Airbus_A320_251N_at_Luton_8th_February_2025.jpg | Mike Burdett | CC BY-SA 2.0 | 2025-02-08 |
| `commons-Airbus_A320_-_MSN_6831_OE-IZF_1_.jpg` | 3/4 rear right | OE-IZF | A320 (Sharklets) | easyJet Europe, in flight, from below | https://commons.wikimedia.org/wiki/File:Airbus_A320_-_MSN_6831_OE-IZF_(1).jpg | Ibex73 | CC BY 4.0 | 2025-05-01 |
| `commons-Airbus_A320_-_MSN_6831_OE-IZF_2_.jpg` | right side | OE-IZF | A320 (Sharklets) | easyJet Europe, in flight, from below | https://commons.wikimedia.org/wiki/File:Airbus_A320_-_MSN_6831_OE-IZF_(2).jpg | Ibex73 | CC BY 4.0 | 2025-05-01 |
| `commons-Airbus_A320_-_MSN_6831_OE-IZF_3_.jpg` | right side | OE-IZF | A320 (Sharklets) | easyJet Europe, in flight, from below | https://commons.wikimedia.org/wiki/File:Airbus_A320_-_MSN_6831_OE-IZF_(3).jpg | Ibex73 | CC BY 4.0 | 2025-05-01 |
| `commons-Airbus_A320_-_MSN_6831_OE-IZF_4_.jpg` | 3/4 front right | OE-IZF | A320 (Sharklets) | easyJet Europe, in flight, from below | https://commons.wikimedia.org/wiki/File:Airbus_A320_-_MSN_6831_OE-IZF_(4).jpg | Ibex73 | CC BY 4.0 | 2025-05-01 |
| `commons-_GBR-Greater_Manchester_EasyJet_Airbus_A320-251N_G-UZEF_EGCC_2025-06-09.jpg` | 3/4 front right | G-UZEF | A320neo | on the ground, overcast: "ZEF" on the cap, the orange over the crown, the left Sharklet's inner face | https://commons.wikimedia.org/wiki/File:(GBR-Greater_Manchester)_EasyJet_Airbus_A320-251N_G-UZEF_@_EGCC_2025-06-09.jpg | S5A-0043 | CC BY 4.0 | 2025-06-09 |
| `commons-EasyJet_A-320_at_Funchal_Airport_Madeira_54029209516_.jpg` | right side | G-EZUZ | A320 | on the ground, a little from the front and from above, wingtip fences | https://commons.wikimedia.org/wiki/File:EasyJet_A-320_at_Funchal_Airport,_Madeira_(54029209516).jpg | Frank Kovalchek | CC BY 2.0 | 2024-09-10 |
| `commons-Madeira-Airport-Airbus_A320-214_airplane_G-EJCH_easy_Jet_-02ASD.jpg` | 3/4 front right | G-EJCH | A320 | on the apron, far away | https://commons.wikimedia.org/wiki/File:Madeira-Airport-Airbus_A320-214_airplane_G-EJCH_(easy_Jet)-02ASD.jpg | Asurnipal | CC BY-SA 4.0 | 2024-12-04 |
| `commons-Madeira-Airport-Airbus_A320-214_airplane_G-EJCH_easy_Jet_-03ASD.jpg` | right side | G-EJCH | A320 | on the apron, a little from the front | https://commons.wikimedia.org/wiki/File:Madeira-Airport-Airbus_A320-214_airplane_G-EJCH_(easy_Jet)-03ASD.jpg | Asurnipal | CC BY-SA 4.0 | 2024-12-04 |
| `commons-At_Tenerife_2026_980.jpg` | front | - | A320 | on the apron, head-on, from above | https://commons.wikimedia.org/wiki/File:At_Tenerife_2026_980.jpg | Mike Peel | CC BY-SA 4.0 | 2026-03-25 |
| `commons-EasyJet_Airbus_A320neo_G-UZHN_MAN_June_2023_03_.jpg` | nose (left side) | G-UZHN | A320neo | the nose close up: the cap's edge over the cockpit windows, door 1 | https://commons.wikimedia.org/wiki/File:EasyJet_Airbus_A320neo_(G-UZHN)_@_MAN,_June_2023_(03).jpg | Ardfern | CC BY-SA 4.0 | 2023-06-21 |
| `commons-Air_Travel_Waiting_to_Board.jpg` | nose (left side) | - | A320 family | the forward fuselage from the steps: the title on the band | https://commons.wikimedia.org/wiki/File:Air_Travel_Waiting_to_Board.jpg | Kurt Kaiser | CC0 | 2019-06-24 |
| `commons-Airbus_A319-111_c-n_4129_OE-LQW_2026-06-10_Andre_Gerwing_Collection_ID_029643.jp.jpg` | below | OE-LQW | A319 | easyJet Europe: the white belly, the tail band all round, the orange flap-track fairings and fences | https://commons.wikimedia.org/wiki/File:Airbus_A319-111_(c-n_4129,_OE-LQW)_2026-06-10_Andre_Gerwing_Collection_ID_029643.jpg | André Gerwing | CC BY-SA 4.0 | 2026-06-10 |
| `commons-EasyJet_G-EZRZ.jpg` | below | G-EZRZ | A320 (Sharklets) | climbing, from below and ahead: the left Sharklet's inner face | https://commons.wikimedia.org/wiki/File:EasyJet_G-EZRZ.jpg | Skye Haynes | CC BY-SA 4.0 | 2026-06-27 |
| `commons-Airbus_A320-214_c-n_5688_G-EZWK_2026-05-29_Andre_Gerwing_Collection_ID_029060.jp.jpg` | 3/4 front left | G-EZWK | A320 (Sharklets) | in flight, from below | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_5688,_G-EZWK)_2026-05-29_Andre_Gerwing_Collection_ID_029060.jpg | André Gerwing | CC BY-SA 4.0 | 2026-05-29 |
| `commons-G-UZMG_-_Airbus_A321-251NX_-_easyJet_LGW_approach_040525.jpg` | 3/4 front left | G-UZMG | A321neo | in flight, from below | https://commons.wikimedia.org/wiki/File:G-UZMG_-_Airbus_A321-251NX_-_easyJet_LGW_approach_040525.jpg | kitmasterbloke | CC BY 2.0 | 2025-05-04 |
| `commons-CFM_International_LEAP_engine_on_a_2023_Airbus_A320neo_operated_by_EasyJet.jpg` | engine | - | A320neo | a LEAP-1A inlet from the front: the bare-metal lip, the orange cowl | https://commons.wikimedia.org/wiki/File:CFM_International_LEAP_engine_on_a_2023_Airbus_A320neo_operated_by_EasyJet.jpg | Actualcpscm | CC BY-SA 4.0 | 2023-09-01 |
| `commons-Slats_and_winglet_piais-l_s-Louvres_SIAE2200_cropped_.jpg` | winglet | - | A320 family | the left Sharklet's inner face from the cabin: the title, the grey leading-edge band, the pale knee | https://commons.wikimedia.org/wiki/File:Slats_and_winglet,_%C3%89piais-l%C3%A8s-Louvres_(SIAE2200)_(cropped).jpg | Matti Blume | CC BY-SA 4.0 | 2019-06-18 |
| `commons-A_beautiful_wing_view_surfing_the_clouds_above_the_UK..jpg` | winglet | G-UZLL | A320neo | the left Sharklet's inner face from the cabin, far away, the orange flap-track fairings from above | https://commons.wikimedia.org/wiki/File:A_beautiful_wing_view,_surfing_the_clouds_above_the_UK..jpg | Scglossop1 | CC BY-SA 4.0 | 2021-09-15 |
| `commons-A320_Wingtip_EasyJet.jpg` | winglet | - | A320 family | a Sharklet's outer face (left of the frame) and a wingtip fence (right), from the steps | https://commons.wikimedia.org/wiki/File:A320_Wingtip_EasyJet.jpg | Ddoherty958 | CC0 | 2025-09-29 |
| `crop-tail-left-G-UZLT.jpg` | tail | G-UZLT | A320neo | crop: the fin and the tail band, left side (cut from commons-Easyjet_A320-251N_G-UZLT.jpg) | https://commons.wikimedia.org/wiki/File:Easyjet_A320-251N_G-UZLT.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |
| `crop-tail-right-G-UZMG.jpg` | tail | G-UZMG | A321neo | crop: the fin, the tail band and the white tail cone, right side (cut from commons-G-UZMG_easyJet_A21N_EGCC.jpg) | https://commons.wikimedia.org/wiki/File:G-UZMG_easyJet_A21N_EGCC.jpg | Oscaracton | CC BY 4.0 | 2026-05-25 |
| `crop-engine-right-G-UZHT.jpg` | engine | G-UZHT | A320neo | crop: the right LEAP-1A nacelle, outboard face (cut from commons-Airbus_A320-251N_c-n_8662_G-UZHT_2026-01-19_Andre_Gerwing_Collection_ID_027759.j.jpg) | https://commons.wikimedia.org/wiki/File:Airbus_A320-251N_(c-n_8662,_G-UZHT)_2026-01-19_Andre_Gerwing_Collection_ID_027759.jpg | André Gerwing | CC BY-SA 4.0 | 2026-01-19 |
| `crop-engine-left-OE-IWW.jpg` | engine | OE-IWW | A320 (Sharklets) | crop: the left CFM56 nacelle, outboard face (cut from commons-Airbus_A320-214_c-n_6257_OE-IWW_2026-10-07_Andre_Gerwing_Collection_ID_031374.jp.jpg) | https://commons.wikimedia.org/wiki/File:Airbus_A320-214_(c-n_6257,_OE-IWW)_2026-10-07_Andre_Gerwing_Collection_ID_031374.jpg | André Gerwing | CC BY-SA 4.0 | 2026-10-07 |
| `crop-winglet-outer-left-G-UZLT.jpg` | winglet | G-UZLT | A320neo | crop: the left Sharklet's outer face (cut from commons-Easyjet_A320-251N_G-UZLT.jpg) | https://commons.wikimedia.org/wiki/File:Easyjet_A320-251N_G-UZLT.jpg | Zima Savolainen-Schtakleff | CC BY-SA 4.0 | 2026-08-26 |

Most useful:

- `commons-G-UZLS_STN_2024-06-22.jpg` and `commons-Easyjet_A320-251N_G-UZLT.jpg`: the left side.
- `commons-Airbus_A320-251N_c-n_8662_G-UZHT_2026-01-19_Andre_Gerwing_Collection_ID_027759.j.jpg`: the right side.
- `commons-G-UZMG_easyJet_A21N_EGCC.jpg`: the A321neo.
- `commons-G-EZBW_-_Airbus_A319-111_-_easyJet_BHX_110625.jpg`: the A319, and the wedge behind the wing.
- `commons-_GBR-Greater_Manchester_EasyJet_Airbus_A320-251N_G-UZEF_EGCC_2025-06-09.jpg`: the crown and the cap.
- `commons-Slats_and_winglet_piais-l_s-Louvres_SIAE2200_cropped_.jpg`: the inner face of a Sharklet.
- `commons-Airbus_A319-111_c-n_4129_OE-LQW_2026-06-10_Andre_Gerwing_Collection_ID_029643.jp.jpg`: the underside.

Missing: a close photo of an A321neo Sharklet, and a view from straight above.

---

## 3. Colours

Brand values: easyJet's brand manual names **Pantone 021 C** for the orange (quoted by fontsinuse.com). A
third-party converter gives #FF5A00 for it (hextoral.com). I did not check Pantone's own value. The Commons logo
file uses **#FF6600**. No paint specification was found.

Photo samples are medians of the orange (or white) pixels in a box on a flat area in direct sun. H is the hue in
degrees.

| Paint | Recommended sRGB | Evidence and spread | Trust |
|---|---|---|---|
| **easyJet orange** (cap, wedge, tail band, fin, nacelles, wingtip devices, flap-track fairings) | **#F05A14** | Sunlit samples: #E96221 (wedge, H 19.5°), #E65E1A (fin, H 20.0°) and #ED661A (nacelle, H 21.6°) on `OE-IWW`. #F25D1C (fin, H 18.2°) on `G-UZLS`. #E35303 (wedge, H 21.4°) on `G-EZBO`. #DC4502 (wedge and fin, H 18.4°) on `G-UZHT`, in low winter sun. Overcast: #9C4834 (fin, `G-UZEF`). Evening sun clips to #FE7702 (`G-UZMG`, H 28°, not used). Photo hue 18° to 22°, median 20°. #F05A14 has H 19°, S 0.92, V 0.94. | High. The paint is redder than the logo file's #FF6600 (H 24°). It agrees with the #FF5A00 conversion of Pantone 021 C (H 21°). The app's current `fin` and `engine` value #ff6600 is a little too yellow. |
| **White** (fuselage, tail cone, titles) | **#F5F5F5** | #F9F9FB (`G-UZLS`), #F1F2F5 (`OE-IWW`), #F3F3F5 (`G-EZBW`), #FCFBF8 (`G-UZMG`), all in sun. Overcast: #D8DAE6 (`G-UZEF`). | High (plain white). |
| **Wing and tailplane grey** | **#D2D5D9** | Wing upper surface in sun: #E1DFDC (`G-UZHT`), #E0DEE0 (Sharklet photo). Overcast: #C9CAD2, beside a fuselage white of #D8DAE6 (`G-UZEF`). In that photo the wing is 9% darker than the fuselage. | Low to medium (an estimate). |
| **Grey band on the Sharklet's leading edge** | **#A9ACB0** | #8A7E87 in part shade (Sharklet photo). Light grey in sun (`crop-winglet-outer-left-G-UZLT.jpg`, by eye). | Low to medium. |
| **Inlet lip** (bare metal) | **#C9C6C3** | #D6CBC4 in sun (`G-UZHT`), #9B9597 in shade (`OE-IWW`). | Medium. |
| **Exhaust, core cowl, APU nozzle** | **#4A4D52** | Dark metal in `crop-engine-right-G-UZHT.jpg` and `crop-engine-left-OE-IWW.jpg`. #4D3F31 in warm light (`G-UZMG`). The value is the one the Wizz Air dossier uses. | Medium (an estimate). |
| **Cockpit windows** | **#16181C** | Not sampled. The value is the one the other dossiers use. | Medium. |

There is no second livery colour. The orange is one paint everywhere.

---

## 4. Elements (side elevation)

Landmarks that I measured on the A320neo (mean of both sides):

| Landmark | d (m aft of nose) | h (m above keel) |
|---|---|---|
| Cockpit side windows | 1.5 to 3.2 | 2.55 to 3.0 |
| Door 1 (outline) | 4.45 to 5.5 | 1.7 to 3.7 |
| Cabin windows 1 to 15 | 6.1 to 13.6 | centres 2.69 |
| Over-wing exits (2 per side) | 14.0 to 14.7 and 14.85 to 15.55 | 1.9 to 3.2 |
| Rear windows | 15.8 to 28.0 | centres 2.69 |
| Rear door (outline) | 29.1 to 30.1 | 1.8 to 3.75 |
| Fin leading edge at the dorsal fillet | 30.3 | 4.1 to 4.8 |
| Fin tip (leading corner / trailing corner) | 34.9 / 36.8 | 9.9 to 10.1 |
| Fin trailing edge at the root | 35.3 | 4.1 |

The nose section is the same on all 4 types. The tail section is the same too. Give nose items as d. Give tail
items as a distance ahead of the tail tip (L − d).

**Fuselage base colour:** white #F5F5F5 from the radome to the tail band. The white covers the belly and the belly
fairing (`OE-LQW` from below). The radome is white. There is no nose band.

**The cap and the wedge (orange):** one shape, the same on both sides. In side elevation its 2 edges are straight
lines.

- *Front tip:* d 1.9 to 2.1, h 3.05. The cap starts on the crown at the top of the windscreen. Head-on, the cap covers
  the whole crown above the windscreen (`ps-407f62-1903189.jpg`).
- *Lower edge, first part:* level at h 3.05 from d 1.9 to d 4.2. It runs 5 to 10 cm above the cockpit side windows.
  A thin white line stays between the windows and the orange.
- *Lower edge, second part:* one straight line from (d 4.2, h 3.03) to the tip of the wedge. On the A320neo I
  measured: d 5.3 → h 2.87, d 6.2 → h 2.73, d 8.3 → h 2.46, d 10.6 → h 2.18, d 13.1 → h 1.91, d 15.7 → h 1.63 (left
  side). The right side gives the same line within 0.07 m. The line cuts door 1 at h 2.87: the upper 0.8 m of the
  door is orange.
- *Upper edge:* the orange covers the crown from the cap to d 10.5 (± 0.3). From (d 10.5, h 4.14) the upper edge
  is one straight line to the tip of the wedge. On the A320neo I measured: d 10.6 → h 4.04, d 11.7 → h 3.78,
  d 12.7 → h 3.52, d 13.9 → h 3.26, d 15.4 → h 2.87, d 16.2 → h 2.61, d 17.6 → h 2.35, d 18.7 → h 2.09 (left). The
  right side is 0.3 m further aft.
- *Tip of the wedge:* the 2 edges meet at **(d = L − 12.0, h 0.5)**. That is d 25.6 on the A320 and A320neo
  (measured tip 25.3 left, 25.6 right), d 32.5 on the A321neo (the 2 fitted edges meet at 32.3) and d 21.8 on the
  A319 (21.5 on `G-EZBO`, 22.1 on `G-EZBW`). The tip is 1.1 to 1.6 m ahead of the tail band, low on the side.
- *Slopes:* the edges are straight on each type, so the slopes follow from the 3 points. A320: lower −0.119,
  upper −0.241 (measured −0.117 and −0.239). A321neo: lower −0.089, upper −0.165 (measured −0.088 and −0.168). A319:
  lower −0.143, upper −0.32 (measured −0.143 and −0.33).
- *The wing:* the wedge passes behind the wing root. In a side view the wing hides its lower part between about
  d 15.5 and d 21 (A320). Aft of the wing it shows again as a thin dart (`G-EZBW`, `G-UZMB`). The wedge does not
  reach the keel. The belly stays white.
- The window row runs through the wedge from window 1 to about d 16.5. The 2 over-wing exits and the first rear
  windows are in the orange. Windows in the orange have a thin white ring.

**Fuselage title:** the white **easyJet** wordmark (file `title.svg`), level, on the wedge above the windows.

- Side-elevation box: **d 5.95 to 11.3** (5.35 m long), **h 2.73 to 3.70**. Baseline at h 2.97. The top of the "J"
  is at h 3.70. The foot of the "y" is at h 2.73, between windows 5 and 6.
- Measured: left 5.93 to 11.27 (`G-UZLS`), right 6.04 to 11.39 (`G-UZHT`), A321neo 5.93 to 11.29 (`G-UZMG`), A319
  5.89 to 11.23 (`G-EZGH`).
- It starts 0.45 m aft of door 1. It ends where the wedge's upper edge leaves the crown.
- On the skin the wordmark is 5.35 m × 1.20 m (the file's shape, 4.46 to 1). The curve of the fuselage shows it
  0.97 m high in side elevation. Stretch the file to the box.
- The title is the same on both sides and reads correctly on both. On the left the "e" is at d 5.95. On the right
  the "e" is at d 11.3 and the "t" is next to door 1.

**Tail band (orange):**

- *Forward edge:* one straight line, the same on both sides and on all types: **L − d = 11.15 − 0.87·h**. It meets
  the keel 11.15 m ahead of the tail tip and the crown 7.55 m ahead of it. The top leans aft, 49° from the
  horizontal. A320neo: d = 26.4 + 0.87·h (left: h 0.5 → d 26.86, h 1.9 → 28.07, h 3.1 → 29.15, h 3.7 → 29.62. Right:
  h 0.6 → 26.94, h 2.0 → 28.09, h 3.3 → 29.24, h 4.2 → 29.99). A321neo: d = 33.4 + 0.84·h. A319: d = 22.8 + 0.87·h.
- The edge passes 0.3 m ahead of the rear door at window height. The rear door is all orange with a white outline.
- The line goes on up to the fin's leading edge. The dorsal fillet ahead of it is white.
- *Aft edge:* **L − d = 3.1 − 0.215·h**, from the root of the fin's trailing edge (2.2 m ahead of the tail tip at
  h 4.3) down to 2.6 m ahead of the tail tip at h 2.3. The edge continues the rudder's trailing edge line.
- Between the 2 edges the fuselage is orange all round, and the underside too (`OE-LQW`).
- The fairing plate at the tailplane root is light grey on the orange (`crop-tail-right-G-UZMG.jpg`).

**Tail cone:** white from the aft edge of the band to the end (the last 2.2 to 2.6 m). The APU nozzle (the last
0.3 m) is dark metal.

**Fin:** orange on both sides, with the tip cap and the rudder. A white strip about 0.1 m wide runs along the whole
leading edge and joins the white dorsal fillet.

**Fin title:** the white **easyJet** wordmark, parallel to the leading edge.

- Size: **6.25 m long, 1.40 m high** (the top of the "J" to the foot of the "y"). Cap height 1.14 m, x-height
  0.83 m. Measured length: 6.1 to 6.3 m on `G-UZLS`, 6.2 to 6.3 m on `G-UZHT`, 6.3 m on `G-UZMG`.
- Angle: 51° from the horizontal (52° left, 51° right, 49° on the A321neo photo). The leading edge is at 50° to 51°.
- Place: the middle line of the wordmark is 1.0 m behind the leading edge (1.3 m measured along the fuselage). Its
  lower end is at h 4.7 (0.55 m above the crown). Its upper end is 0.5 m below the fin tip (h 9.5). On the A320neo
  the middle line runs from (d 32.0, h 4.7) to (d 35.9, h 9.5). In fin coordinates its centre is at 39% of the
  chord, at half the fin's height.
- The tops of the letters point to the leading edge on both sides.
- **Left side:** it reads upwards. The "e" is at the root and the "t" is at the tip (file `title-up.svg`).
- **Right side:** it reads downwards. The "e" is at the tip and the "t" is at the root (file `title-down.svg`).
  It is not a mirror image.

**Tailplane:** light grey #D2D5D9 on both surfaces. No livery colour.

**Wings:** light grey #D2D5D9. The pylons are white or light grey. The **flap-track fairings are orange** (3 under
each wing: `G-EZBW`, `OE-LQW`, `G-UZLL`).

**Engine nacelles (both engines alike):**

- The fan cowl and the reverser are orange all round. The strakes are orange.
- The inlet lip is bare metal #C9C6C3, a ring about 0.3 m wide in a side view (`crop-engine-right-G-UZHT.jpg`,
  `crop-engine-left-OE-IWW.jpg`, `commons-CFM_International_LEAP_engine_on_a_2023_Airbus_A320neo_operated_by_EasyJet.jpg`).
- **No title and no logo** on any face. The outboard faces show in the 2 crops. The inboard faces show in
  `commons-EasyJet_G-EZRZ.jpg` and `OE-LQW` (from below). Only small white stencils are there.
- The core cowl, the nozzle and the plug are dark metal #4A4D52.
- `G-UZMG` shows a dark band round its nacelle. That is the open thrust reverser on the landing roll. It is not
  paint.

**Wingtip devices:**

- **Sharklet** (A320neo, A321neo and the newer A320): the curved knee (the lowest 0.4 m) is wing grey. The blade is
  orange on both faces up to the tip. A grey band #A9ACB0 runs along the leading edge of the blade. By eye, the band
  is one third of the chord at the knee and one quarter at the tip.
- *Outer face:* orange and the grey band only. No text (`crop-winglet-outer-left-G-UZLT.jpg`, `G-UZHT`, `G-UZMG`).
- *Inner face:* orange, the grey band, and the white **easyJet** wordmark along the blade. The wordmark is about
  1.6 m long and 0.36 m high (± 15%, from an oblique photo). It starts 0.5 m below the tip and ends 0.45 m above the
  knee. The tops of the letters point to the leading edge.
  - Left Sharklet (`commons-Slats_and_winglet_piais-l_s-Louvres_SIAE2200_cropped_.jpg`, `G-UZEF`): the "e" is at
    the tip and the "t" is at the knee. It reads as the right side of the fin does (`title-down.svg`).
  - Right Sharklet (`OE-IWW`, the far wing): the "t" is at the tip. It reads as the left side of the fin does
    (`title-up.svg`).
- **Wingtip fence** (A319 and the older A320): orange on both faces, no text (`G-EZBO`, `G-EZGH`,
  `commons-A320_Wingtip_EasyJet.jpg`).

**Left/right differences:** none in the colour fields. The fuselage title, the fin title and the Sharklet title
read correctly on each side. Their letters then run the other way along the aircraft on the right side. The fin
title and the Sharklet title need a different file for each side.

**Other:**

- Door and exit outlines are thin white lines on the orange and grey lines on the white.
- The registration is black, 0.25 m high, above the rear windows, and ends 0.5 m ahead of the tail band
  (d 26.4 to 28.2 on `G-UZHT`). Skip it.

---

## 5. Side-elevation drawing steps

Write P for the tip of the wedge: **P = (d = L − 12.0, h 0.5)**.

### LEFT side

1. **Fill** the fuselage and the fin white #F5F5F5.
2. **Wedge:** fill this polygon orange #F05A14: (d 1.9, h 3.05) → (d 4.2, h 3.03) → P → (d 10.5, the crown) → along
   the crown forward to d 1.9. Let it overshoot above the crown from d 1.9 to d 10.5, so that the crown is orange
   there.
3. **Tail band:** fill orange every point aft of the line L − d = 11.15 − 0.87·h and ahead of the line
   L − d = 3.1 − 0.215·h, for all h from the keel to the crown.
4. **Fin:** fill the fin orange. Keep the dorsal fillet ahead of the tail band's line white. If the kit can draw
   it, add a white strip 0.1 m wide along the fin's leading edge.
5. **APU nozzle:** paint the last 0.3 m dark metal #4A4D52.
6. **Cockpit windows:** paint them #16181C if the model's texture has none.
7. **Fuselage title:** draw `title.svg` in the box d 5.95 to 11.3, h 2.73 to 3.70, stretched to the box.
8. **Fin title:** draw `title-up.svg`. Its box is the box of the turned wordmark: 5.09 m along the fuselage and
   5.69 m high for a wordmark 6.25 m long. Put the centre of the box on the fin at 39% of the chord and half the
   height (A320neo: d 33.95, h 7.1). If the model's fin is smaller, scale the box so that the wordmark stays
   0.5 m below the tip and 0.55 m above the crown.
9. **Outlines:** draw door and exit outlines as 0.03 m lines, white on the orange and grey on the white. Skip the
   registration, the cap letters and the name.

### RIGHT side (differences from the left)

- The colour fields are **identical**. Use the same numbers.
- **Fuselage title:** the same box. It reads correctly, so the "e" is at the aft end (d 11.3).
- **Fin title:** the same place, but use `title-down.svg`. The kit shows an image un-mirrored on the right side.
  `title-up.svg` would then lean the wrong way.

### Flat colours

- Wings, tailplane and pylons: #D2D5D9.
- The kit paints a wing in one colour. It cannot draw the orange flap-track fairings. Leave them grey.

### Nacelle artwork (both engines, all faces)

Orange #F05A14. Inlet lip #C9C6C3 (the front 0.3 m). Core cowl, nozzle and plug #4A4D52. No text.

### Wingtip artwork

- Sharklet: the knee (the lowest 0.4 m) wing grey. The blade orange. A grey band #A9ACB0 along the leading edge,
  one third of the chord at the knee and one quarter at the tip.
- The inner face has the wordmark and the outer face has none. If the kit draws one artwork on both faces, choose
  one. A side view shows the plain outer face of the near Sharklet.
- Wingtip fence (the `a320` model has no device box): orange if the model can colour it.

---

## 6. Logos and wordmarks

| Graphic | Commons file | Licence | In `liveries/EZY/` | Use |
|---|---|---|---|---|
| **easyJet wordmark** (fuselage, fin, Sharklets) | https://commons.wikimedia.org/wiki/File:EasyJet_logo.svg | **PD-textlogo**, with the `{{Trademarked}}` tag (read from the page's templates through the Commons API). Author: easyJet. The page says the logo is set in Cooper Black. | `title.svg` (white, level), `title-up.svg` and `title-down.svg` (white, turned 50°). The 7 letter paths are unchanged. | **Usable.** The aircraft wear exactly this wordmark, in white. I compared the letter shapes with `G-UZLS` and `G-UZHT`. |
| The same wordmark on an orange rectangle | https://commons.wikimedia.org/wiki/File:EasyJet_logo_with_orange_background.svg | PD-textlogo, Trademarked | not copied | Not needed: the paint supplies the orange. |
| "easyJet.com" logo (old) | https://commons.wikimedia.org/wiki/File:Easyjet_com_Logo.svg | PD-textlogo, Trademarked. Author and source unknown. | not copied | **Do not use.** The 2015 livery dropped ".com". |
| "NEO" letters (logo aircraft) | none found | - | - | Leave out. |

The 2 Commons files are in `data/livery-refs/EZY/logos/` as downloaded. The app's current
`public/liveries/EZY-title.png` and `EZY-fin.png` belong to the colours-only entry. I did not open them. The design
replaces that entry.

**Fonts:** none. Each title is the wordmark file. The wordmark's typeface is Cooper Black (the Commons page, and
easyJet's brand manual as quoted by fontsinuse.com). Cooper Black is a commercial font, so no font file is in the
folder. The registration and the cap letters would need a plain sans font. The design skips them.

---

## 7. Geometry facts for the models

- **Models:** the app draws the A319 and the A320 on the `a320` model, the A320neo on `a20n` and the A321neo on
  `a21n`. One design must paint all 3. Fix the cap and the titles to the nose. Fix the tail band and the tip of the
  wedge to the tail.
- **A321neo doors** (`G-UZMG`): door 1, 2 over-wing exits (d 17.5 to 19.0), door 3 at d 26.2 to 27.2 and door 4 at
  d 36.0 to 36.9. There is no door 2 ahead of the wing.
- **A320 and A319 doors:** door 1, 2 over-wing exits per side and the rear door. easyJet's A319 has 2 exits per
  side too (`G-EZBW`, `G-EZGH`).
- **Engines:** CFM56-5B on the A319 and A320. CFM LEAP-1A on the neo types (the type codes -251N and -251NX). The
  LEAP nacelle is larger and has a plain exhaust.
- **Fin:** the standard A320-family fin. The tip is 5.8 to 5.9 m above the crown. The tip chord is 1.9 m.
- **Differences from the app's current `liveries.json` EZY entry**
  (`{"base": "#f7f7f7", "fin": "#ff6600", "engine": "#ff6600", "title": true, "finLogo": true}`): the entry has no
  cap, no wedge and no tail band, so the fuselage is plain white. The orange is a little too yellow.

---

## 8. Confidence and open questions

- **High confidence:** the parts of the scheme and their shapes. The straight edges of the wedge. The tail band's
  line (2 sides and 3 types agree within 0.1 m). The title boxes. That the engines have no title. That all
  3 operators and all 4 types wear the same design.
- **Positions:** within ± 0.3 m in d and ± 0.1 m in h on the A320neo. The A319 and A321neo numbers come from
  1 good photo each (± 0.4 m).
- **Tip of the wedge:** L − 12.0 ± 0.3 m. The tip is thin, and haze or the flap-track fairings hide it in some
  photos.
- **Where the upper edge leaves the crown:** d 10.5 ± 0.3. No photo from straight above was found. I assume that
  the edge crosses the crown as a straight cut.
- **Orange:** the hue is certain (18° to 22°). The brightness depends on the light. #F05A14 is the sunlit median.
- **Wing grey and the Sharklet's grey band:** estimates.
- **Sharklet wordmark:** the size and place are from 1 oblique photo of 2019 (± 15%). No close photo of the right
  Sharklet's inner face was found. `OE-IWW` shows only "Jet" on it, far away.
- **Fin's leading-edge strip:** white on `G-UZMG` and `G-UZLS`. I did not check if it is paint or bare material.
- **Dates:** the planespotters API gives no date. Each thumbnail is "reference only".
- **Not checked by a second agent.**

Sources consulted: Wikimedia Commons (the files above, and the categories "Airbus A320 of EasyJet", "Current
Airbus A320neo of EasyJet", "Current Airbus A321neo of EasyJet", "Airbus A319 of EasyJet" and "Aircraft of
EasyJet"). The planespotters.net public API.
[Travel Weekly, "easyJet unveils first new livery since 1998" (2015-02-03)](https://travelweekly.co.uk/articles/53054/easyjet-unveils-first-new-livery-since-1998).
[Fonts In Use, "easyJet"](https://fontsinuse.com/uses/16586/easyjet) (Pantone 021 C and Cooper Black, from a web
search result). [hextoral.com](https://hextoral.com/side-by-side/pantone-orange-021-c-vs-pantone-172-c/) (the
#FF5A00 conversion, from a web search result). The `client/scene/liveries.json` EZY entry.

---

## 9. Rendered check (2026-10-14)

Three renders of `a320:EZY a20n:EZY a21n:EZY a319:EZY` against the photos (G-UZLS, G-UZHT, G-UZHN, G-UZMF, G-UZLT, G-UZMG, G-EZGH, G-EZBI, OE-IWW and the Sharklet photos).

- Matches: the cap and the wedge on both sides (the tip low behind the wing), the title's text, size and place on both sides (it reads forwards on both), the straight cut to the tail band, the white tail cone, the fin with its white title along the leading edge (reading up on the left side, down on the right), the white strip and the dorsal fillet, the orange nacelles, the orange Sharklets with the grey leading-edge band and the white wordmark on the inner face, the door and exit outlines.
- Fixed: the cockpit windows were one big black blob; they are now a windshield pane and two side panes, 0.5 m tall, with light frames, as on G-UZHN and G-UZLS.
- Fixed: the nacelle's inlet ring is a little thicker (0.3 m; 0.4 m on the neo), so the bare-metal lip shows from the front.
- Tuned: the orange is a little more saturated (#F4540E), because the model's lighting greys it (the render of the fin sampled #C26030 against #DD4501 on G-UZHT in sun).
- Still differs: the `a320` and `a319` models have no Sharklets (the aircraft wear them); the inside of the inlet is orange (the real one is grey, the atlas cannot tell the inside from the outside); the windows come from the shader and run on past the rear door onto the orange band; the cockpit panes are plain shapes.
