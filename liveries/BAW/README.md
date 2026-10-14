# British Airways (BAW): livery dossier, Airbus A320 family, Boeing 777 and 787

Research date: 2026-10-13. Reference photos: `data/livery-refs/BAW/` (git ignores it; `refs.json` there lists every
photo with its view, source, author and licence). File names in `code` below are in that folder. I looked at every
stored photo (the full frame and zoomed crops with a pixel grid) and measured positions and colours from the pixels.
Where a statement comes from general knowledge and not from a photo, it says so.

Frames used below:

- **z** = metres aft of the nose tip (on the model: `k.a.nose - z`).
- **wc** = the centre line of the cabin window row (`k.a.windowY`). Heights are given as metres above (+) or below (−)
  **wc**, because the window row is the one landmark that every photo and every model shows.
- **h** = metres above the keel of the constant section, where a fraction of the fuselage height is more useful.
- **(u, h)** on the fin = the kit's `k.fin(u, h)`: `u` 0 leading edge … 1 trailing edge, `h` 0 root … 1 tip.

Scales: on each photo the horizontal scale comes from the window pitch (A320 family and 777: 0.533 m; 787: 0.61 m)
and from the door stations of the app's models (`public/models/<type>/model.json`: A320neo door 1 at z 5.13, door 4 at
z 30.05; 777-300ER doors 1 and 2 at z 6.79 and 17.20; 787-9 doors 1 and 2 at z 6.59 and 19.23).

---

## 1. Identity

**Scheme:** the "Chatham Dockyard" Union Flag livery: a white fuselage, a navy belly, the red and navy ribbon emblem
(the "Speedmarque") above the forward windows, the navy "BRITISH AIRWAYS" title under the windows, navy engines, and a
fin painted as a waving piece of the Union Flag whose lowest red band runs on down the tail cone. Every photo of
2025–2026 in the folder shows it unchanged, on all three families. The A380 (G-XLEA, G-XLEB) wears it too: measured in
section 4.6a from seven Commons photos added on 2026-10-14.

From general knowledge, not checked here: the fin design dates from 1997 and became the fleet standard around 2001;
the small silver coat of arms beside the title was added about 2011 (a 2009 photo in the folder,
`commons-British_Airways_A320_3737431993_.jpg`, has no coat of arms; photos from 2017 on have it).

**Which aircraft wear it** (seen in the Commons categories "Current … of British Airways", photos of 2024–2026):
Airbus A320-200 (wing fences or Sharklets), A320neo, A321neo, Boeing 777-200ER, 777-300ER, 787-8, 787-9, 787-10 and
A350-1000 and A380. The A319 and A321-200 wear it too (general knowledge; one A319 tail photo of 2018 is in the folder).
The A350 takes the 787's layout in the design (same fuselage section; not measured).
BA CityFlyer (CFE) and BA Euroflyer (EFW) aircraft and the "Shuttle" callsign (SHT) fly in the same paint (general
knowledge, not checked here): candidates for `aliases`.

**The eight tracked aircraft** all show the standard scheme in their current planespotters photos (stored):

| Hex | Registration | Type | Scheme | Photo |
|---|---|---|---|---|
| 407462 | G-TTNC | A320neo | standard | `ps-407462-1938959.jpg` |
| 4080e4 | G-TTNZ | A320neo | standard | `ps-4080e4-1958243.jpg` |
| 40822e | G-TTSG | A320neo | standard | `ps-40822e-1973911.jpg` |
| 4081a1 | G-TTSB | A320neo | standard | `ps-4081a1-1933280.jpg` |
| 40095d | G-TTOB | A320-200 (wing fences) | standard | `ps-40095d-1929163.jpg` |
| 406a3e | G-EUYU | A320-200 (Sharklets) | standard | `ps-406a3e-1866222.jpg` |
| 406a3d | G-EUYT | A320-200 (Sharklets) | standard | `ps-406a3d-1975896.jpg` |
| 4009d9 | G-EUUL | A320-200 (wing fences) | standard | `ps-4009d9-1953897.jpg` |

**Special liveries seen on Commons (viewed on contact sheets, not stored; paint them standard):**

- G-TTNA (A320neo): "BA Better World", a pale blue and turquoise scheme (photos of 2021 to 2026-08-13). The folder
  keeps one 2018 photo of G-TTNA from before the special, because it is a clean right side.
- G-EUYS and G-EUYR (A320): a very large "oneworld" title in place of the BA title (photos of 2024-08-20 and
  2026-03-26).
- G-EUUR (A320): a red radome ("Red Nose", 2026-04-04).
- G-STBN (777-300ER): a "GREAT FUTURES" sticker on the rear fuselage (2026-05-02). The paint is standard.

---

## 2. Reference images

58 files. Planespotters files are the API's thumbnails (reference only). Commons files are 1600–1920 px copies. The
four `crop-…` files are crops that I cut from two of the Commons photos to get an engine, a tail and the Sharklets
close up; they carry their photo's licence. No dedicated close-up of a BA Sharklet exists on Commons (searched).

Dropped after the fetch: a video still of a wing (not a livery view) and two 2009 photos in which the aircraft is very
small. No stored photo shows an old scheme or a special livery.

| File | View | Aircraft | Source | Author | Licence | Date |
|---|---|---|---|---|---|---|
| `ps-407462-1938959.jpg` | right side (in flight) | G-TTNC | https://www.planespotters.net/photo/1938959/g-ttnc-british-airways-airbus-a320-251n | Björn Wylezich | planespotters.net: reference only | not given |
| `ps-4080e4-1958243.jpg` | left side (ground) | G-TTNZ | https://www.planespotters.net/photo/1958243/g-ttnz-british-airways-airbus-a320-251n | Borut Smrdelj | planespotters.net: reference only | not given |
| `ps-40822e-1973911.jpg` | left side (in flight) | G-TTSG | https://www.planespotters.net/photo/1973911/g-ttsg-british-airways-airbus-a320-251n | Marcel Klein | planespotters.net: reference only | not given |
| `ps-4081a1-1933280.jpg` | left side (ground) | G-TTSB | https://www.planespotters.net/photo/1933280/g-ttsb-british-airways-airbus-a320-251n | Rafal Pruszkowski | planespotters.net: reference only | not given |
| `ps-40095d-1929163.jpg` | right side (in flight) | G-TTOB | https://www.planespotters.net/photo/1929163/g-ttob-british-airways-airbus-a320-232 | Markus Pichler | planespotters.net: reference only | not given |
| `ps-406a3e-1866222.jpg` | left side (in flight) | G-EUYU | https://www.planespotters.net/photo/1866222/g-euyu-british-airways-airbus-a320-232-wl | Marvin Knitl | planespotters.net: reference only | not given |
| `ps-406a3d-1975896.jpg` | right side (ground) | G-EUYT | https://www.planespotters.net/photo/1975896/g-euyt-british-airways-airbus-a320-232-wl | Fabio Strack | planespotters.net: reference only | not given |
| `ps-4009d9-1953897.jpg` | left side (ground) | G-EUUL | https://www.planespotters.net/photo/1953897/g-euul-british-airways-airbus-a320-232 | Cornelius Grossmann | planespotters.net: reference only | not given |
| `commons-British_Airways_Airbus_A320_land_in_Larnaca_Airport.jpg` | right side (in flight, A320neo, small) | not read | https://commons.wikimedia.org/wiki/File:British_Airways_Airbus_A320_land_in_Larnaca_Airport.jpg | Enteral UAL | CC BY-SA 4.0 | 2022-09-16 |
| `commons-British_Airways_-_A320_Quintin_Soloviev_-_QFS_Aviation_.jpg` | left side (ground, A320 with wing fences, 2017) | not read | https://commons.wikimedia.org/wiki/File:British_Airways_-_A320_(Quintin_Soloviev_-_QFS_Aviation).png | Quintin Soloviev | CC BY-SA 4.0 | 2017-03-15 |
| `commons-Wingtip_Fence_Airbus_A320.jpg` | winglet (A320 wing fence, inner face, 2014) | not read | https://commons.wikimedia.org/wiki/File:Wingtip_Fence_Airbus_A320.JPG | Mariofan13 | CC BY-SA 4.0 | 2014-07-10 |
| `commons-British_Airways_A320_7465923064_.jpg` | 3/4 front left (A320 with wing fences, 2012) | not read | https://commons.wikimedia.org/wiki/File:British_Airways_A320_(7465923064).jpg | RHL Images from England | CC BY-SA 2.0 | 2012-06-29 |
| `commons-British_Airways_A320_3737431993_.jpg` | forward fuselage, left (2009: before the crest was added) | not read | https://commons.wikimedia.org/wiki/File:British_Airways_A320_(3737431993).jpg | RHL Images from England | CC BY-SA 2.0 | 2009-05-26 |
| `commons-Airbus_A320_British_Airways_9298169441_.jpg` | 3/4 rear left (A320 at the gate, 2013) | not read | https://commons.wikimedia.org/wiki/File:Airbus_A320_(British_Airways)_(9298169441).jpg | Clemens Vasters from Viersen, Germany | CC BY 2.0 | 2013-07-16 |
| `commons-_GBR-London_British_Airways_Airbus_A321-251NX_G-NEOR_EGLL_2025-06-17.jpg` | right side (ground, A321neo) | G-NEOR | https://commons.wikimedia.org/wiki/File:(GBR-London)_British_Airways_Airbus_A321-251NX_G-NEOR_@_EGLL_2025-06-17.jpg | S5A-0043 | CC BY 4.0 | 2025-06-17 |
| `commons-_GBR-London_British_Airways_Boeing_777-36NER_G-STBE_EGLL_2025-06-17.jpg` | left side (ground, 777-300ER) | G-STBE | https://commons.wikimedia.org/wiki/File:(GBR-London)_British_Airways_Boeing_777-36NER_G-STBE_@_EGLL_2025-06-17.jpg | S5A-0043 | CC BY 4.0 | 2025-06-17 |
| `commons-_SGP-Singapore_British_Airways_Boeing_777-36NER_G-STBC_WSSS_2025-08-30.jpg` | right side (ground, 777-300ER) | G-STBC | https://commons.wikimedia.org/wiki/File:(SGP-Singapore)_British_Airways_Boeing_777-36NER_G-STBC_@_WSSS_2025-08-30.jpg | S5A-0043 | CC BY 4.0 | 2025-08-30 |
| `commons-20230811_Boeing_787-9_of_British_Airways_G-ZBKL_at_SYD_01.jpg` | right side (ground, 787-9) | G-ZBKL | https://commons.wikimedia.org/wiki/File:20230811_Boeing_787-9_of_British_Airways_(G-ZBKL)_at_SYD_01.jpg | Windmemories | CC BY-SA 4.0 | 2023-08-11 |
| `commons-20230811_Boeing_787-9_of_British_Airways_G-ZBKL_at_SYD_03.jpg` | left side (ground, 787-9) | G-ZBKL | https://commons.wikimedia.org/wiki/File:20230811_Boeing_787-9_of_British_Airways_(G-ZBKL)_at_SYD_03.jpg | Windmemories | CC BY-SA 4.0 | 2023-08-11 |
| `commons-20240523_G-ZBKN_BA31_LHR.jpg` | 3/4 front right (787-9 at the gate) | G-ZBKN | https://commons.wikimedia.org/wiki/File:20240523_G-ZBKN_BA31_LHR.jpg | VN8058 on The Encyclopedia of Aviation Transport in Hong Kong | CC BY-SA 3.0 | 2024-05-23 |
| `commons-20250402_Boeing_787-9_of_British_Airways_G-ZBKD_taking_off_from_SYD.jpg` | right side (ground, 787-9) | G-ZBKD | https://commons.wikimedia.org/wiki/File:20250402_Boeing_787-9_of_British_Airways_(G-ZBKD)_taking_off_from_SYD.jpg | Windmemories | CC BY-SA 4.0 | 2025-04-02 |
| `commons-A_Rolls_Royce_Trent_1000_Engine_on_British_Airways_B787-10_G-ZBLC.jpg` | engine (787-10, from the front) | G-ZBLC | https://commons.wikimedia.org/wiki/File:A_Rolls_Royce_Trent_1000_Engine_on_British_Airways_B787-10_G-ZBLC.jpg | Yankun Li | Public domain | 2023-01-09 |
| `commons-At_Frankfurt_am_Main_2024_005.jpg` | engine (A320neo, left, at night) | G-TTND | https://commons.wikimedia.org/wiki/File:At_Frankfurt_am_Main_2024_005.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2024-11-21 |
| `commons-At_Lisbon_2025_109.jpg` | 3/4 front right (A320ceo, at the gate) | not read | https://commons.wikimedia.org/wiki/File:At_Lisbon_2025_109.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2025-10-29 |
| `commons-At_Long_Island_2025_393.jpg` | 3/4 front right (777-300ER at the gate) | G-STBK | https://commons.wikimedia.org/wiki/File:At_Long_Island_2025_393.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2025-03-16 |
| `commons-At_Milan_2026_009.jpg` | tail (A321neo, right side: rear fuselage and lower fin) | G-NEOS | https://commons.wikimedia.org/wiki/File:At_Milan_2026_009.jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2026-04-30 |
| `commons-BA_G-TTSI_A320-251N.jpg` | right side (in flight) | G-TTSI | https://commons.wikimedia.org/wiki/File:BA(G-TTSI)A320-251N.jpg | JCSigma2000 | CC BY 4.0 | 2026-08-15 |
| `commons-BGN_190523_G-ZBKC.jpg` | 3/4 front left (787-9, close) | G-ZBKC | https://commons.wikimedia.org/wiki/File:BGN_190523_G-ZBKC.jpg | Oren Rozen | CC BY-SA 4.0 | 2023-05-19 |
| `commons-British_Airways_Airbus_A320_G-MEDK_LGW_August_2025_02_.jpg` | front (A320 cockpit, close) | G-MEDK | https://commons.wikimedia.org/wiki/File:British_Airways_Airbus_A320_(G-MEDK)_@_LGW,_August_2025_(02).jpg | Photograph by Mike Peel (www.mikepeel.net). | CC BY-SA 4.0 | 2025-08-11 |
| `commons-British_Airways_Airbus_A320Neo_G-TTNA_27919173938_.jpg` | right side (ground, 2018: before G-TTNA got its special livery) | G-TTNA | https://commons.wikimedia.org/wiki/File:British_Airways_Airbus_A320Neo_G-TTNA_(27919173938).jpg | BriYYZ from Toronto, Canada | CC BY-SA 2.0 | 2018-04-29 |
| `commons-British_Airways_G-EUUC_A320.jpg` | 3/4 front left (A320 with wing fences) | G-EUUC | https://commons.wikimedia.org/wiki/File:British_Airways_G-EUUC_A320.jpg | Zima Savolainen | CC BY-SA 4.0 | 2025-09-01 |
| `commons-G-DBCB_A319_British_Airways_tailfin_OPO.jpg` | tail (A319, left side) | G-DBCB | https://commons.wikimedia.org/wiki/File:G-DBCB_A319_British_Airways_tailfin_OPO.jpg | Bene Riobó | CC BY-SA 4.0 | 2018-01-18 |
| `commons-G-EUYK_A320_British_ARN_02.jpg` | left side (ground, A320ceo) | G-EUYK | https://commons.wikimedia.org/wiki/File:G-EUYK_A320_British_ARN_02.jpg | Bene Riobó | CC BY-SA 4.0 | 2025-07-02 |
| `commons-G-NEOW_AIRCRAFT_Airbus_A321-251NX.jpg` | left side (ground, A321neo) | G-NEOW | https://commons.wikimedia.org/wiki/File:G-NEOW_AIRCRAFT_Airbus_A321-251NX.jpg | Sg1959 | CC BY-SA 4.0 | 2025-12-12 |
| `commons-G-STBC_taking_off_2025-06-30.jpg` | below (777-300ER) | G-STBC | https://commons.wikimedia.org/wiki/File:G-STBC_taking_off_2025-06-30.jpg | Suntooooth | CC BY-SA 4.0 | 2025-06-30 |
| `commons-G-STBG_55229801898_.jpg` | left side (ground, 777-300ER) | G-STBG | https://commons.wikimedia.org/wiki/File:G-STBG_(55229801898).jpg | Liam Thompson | CC BY-SA 4.0 | 2026-04-07 |
| `commons-G-STBL_LHR_310325.jpg` | right side (ground, 777-300ER, reversers open) | G-STBL | https://commons.wikimedia.org/wiki/File:G-STBL_LHR_310325.jpg | kitmasterbloke | CC BY 2.0 | 2025-04-13 |
| `commons-G-TTNB_-_Airbus_A320-251N_-_British_Airways_LHR_310326.jpg` | below (A320neo) | G-TTNB | https://commons.wikimedia.org/wiki/File:G-TTNB_-_Airbus_A320-251N_-_British_Airways_LHR_310326.jpg | kitmasterbloke | CC BY 4.0 | 2026-04-06 |
| `commons-G-TTNH_London_Heathrow_November_13th_2025_-_55043396259.jpg` | left side (ground) | G-TTNH | https://commons.wikimedia.org/wiki/File:G-TTNH,_London_Heathrow,_November_13th_2025_-_55043396259.jpg | Southsea_Matt | CC BY-SA 4.0 | 2025-11-13 |
| `commons-G-TTNI_Airbus_A320-251N_British_Airways_Manchester.jpg` | left side (ground): the left master | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N_British_Airways,_Manchester.jpg | Ian Gratton | CC BY 2.0 | 2024-07-29 |
| `commons-G-TTNI_Airbus_A320-251N_27.10.2019_Frankfurt_Airport.jpg` | 3/4 front right (from the terminal) | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N,_27.10.2019@Frankfurt_Airport.jpg | OliverZenglein | CC BY-SA 4.0 | 2019-10-27 |
| `commons-G-TTNJ_Airbus_A320-251N_-_British_Airways_LHR_031021_51565101272_.jpg` | 3/4 front right (at the gate) | G-TTNJ | https://commons.wikimedia.org/wiki/File:G-TTNJ_Airbus_A320-251N_-_British_Airways_LHR_031021_(51565101272).jpg | Steve Knight from Halstead, United Kingdom | CC BY 2.0 | 2021-10-08 |
| `commons-G-TTNK_-_British_Airways_A320neo_on_stand_at_London_Heathrow_Terminal_5.jpg` | 3/4 front right (at the gate) | G-TTNK | https://commons.wikimedia.org/wiki/File:G-TTNK_-_British_Airways_A320neo_on_stand_at_London_Heathrow_Terminal_5.jpg | Mertbiol | CC0 | 2023-03-09 |
| `commons-G-TTNK_British_Airways_A20N_EGPH.jpg` | left side (in flight) | G-TTNK | https://commons.wikimedia.org/wiki/File:G-TTNK_British_Airways_A20N_EGPH.jpg | Oscaracton | CC BY 4.0 | 2026-05-31 |
| `commons-G-TTNV_British_Airways_A20N_EGCC.jpg` | right side (ground): the right master | G-TTNV | https://commons.wikimedia.org/wiki/File:G-TTNV_British_Airways_A20N_EGCC.jpg | Oscaracton | CC BY 4.0 | 2026-05-25 |
| `commons-G-TTNY_London_Heathrow_October_6th_2025.jpg` | 3/4 front left (in flight, low sun) | G-TTNY | https://commons.wikimedia.org/wiki/File:G-TTNY,_London_Heathrow,_October_6th_2025.jpg | Matt Taylor | CC BY-SA 4.0 | 2025-10-06 |
| `commons-G-ZBKK_London_Heathrow_September_27th_2021_-_54966063262.jpg` | forward fuselage, right (787-9) | G-ZBKK | https://commons.wikimedia.org/wiki/File:G-ZBKK,_London_Heathrow,_September_27th_2021_-_54966063262.jpg | Southsea_Matt | CC BY-SA 4.0 | 2021-09-27 |
| `crop-G-TTNI_Manchester_engine.jpg` | engine (A320neo, left) | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N_British_Airways,_Manchester.jpg | Ian Gratton | CC BY 2.0 (a crop of the photo, kept here only) | 2024-07-29 |
| `crop-G-TTNI_Manchester_tail.jpg` | tail (A320neo, left side) | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N_British_Airways,_Manchester.jpg | Ian Gratton | CC BY 2.0 (a crop of the photo, kept here only) | 2024-07-29 |
| `crop-G-TTNI_Manchester_sharklet-outer.jpg` | winglet (Sharklet, left, outer face) | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N_British_Airways,_Manchester.jpg | Ian Gratton | CC BY 2.0 (a crop of the photo, kept here only) | 2024-07-29 |
| `crop-G-TTNI_Frankfurt_sharklets.jpg` | winglet (Sharklets: left inner face, right outer face) | G-TTNI | https://commons.wikimedia.org/wiki/File:G-TTNI_Airbus_A320-251N,_27.10.2019@Frankfurt_Airport.jpg | OliverZenglein | CC BY-SA 4.0 (a crop of the photo, kept here only) | 2019-10-27 |
| `commons-G-XLEA_British_Airways_A380_at_London_Heathrow_Airport_2026-04-04.jpg` | 3/4 front left (A380-800) | G-XLEA | https://commons.wikimedia.org/wiki/File:G-XLEA_British_Airways_A380_at_London_Heathrow_Airport_2026-04-04.jpg | Robert Cutter | CC BY-SA 4.0 | 2026-04-04 |
| `commons-Airbus_A380-841_54951626330_.jpg` | 3/4 rear right (A380-800) | G-XLEA | https://commons.wikimedia.org/wiki/File:Airbus_A380-841_(54951626330).jpg | Samson Ng . D201@EAL | CC BY-SA 4.0 | 2025-08-21 |
| `commons-British_Airways_G-XLEA_Airbus_A380-841_London_Heathrow_Airport_LHR_EGLL_50221681.jpg` | 3/4 front left (A380-800) | G-XLEA | https://commons.wikimedia.org/wiki/File:British_Airways_G-XLEA_Airbus_A380-841_London_Heathrow_Airport_(LHR_EGLL)_(50221681086).jpg | Mitchul Hope | CC BY-SA 2.0 | 2017-11-06 |
| `commons-2013Riat-4725.jpg` | left side (A380-800) | G-XLEA | https://commons.wikimedia.org/wiki/File:2013Riat-4725.jpg | Jim.van.de.Burgt | CC0 | 2013-07-20 |
| `commons-British_Airways_Airbus_A380-800_G-XLEB_MD2.jpg` | 3/4 rear right (A380-800) | G-XLEB | https://commons.wikimedia.org/wiki/File:British_Airways_Airbus_A380-800_G-XLEB_MD2.jpg | Acroterion | CC BY-SA 4.0 | 2025-07-24 |
| `commons-GOC_Richmond_193_Airbus_Industrie_A380_G-XLEB_British_Airways_14706504132_.jpg` | 3/4 front left (A380-800) | G-XLEB | https://commons.wikimedia.org/wiki/File:GOC_Richmond_193_Airbus_Industrie_A380_(G-XLEB)_%E2%80%93_British_Airways_(14706504132).jpg | Peter O'Connor aka anemoneprojectors | CC BY-SA 2.0 | 2014-02-08 |
| `commons-G-XLEB_LHR_48738879237_.jpg` | 3/4 front left (A380-800) | G-XLEB | https://commons.wikimedia.org/wiki/File:G-XLEB_LHR_(48738879237).jpg | ERIC SALARD from Paris, FRANCE | CC BY-SA 2.0 | 2017-03-11 |

Most useful:

- `commons-G-TTNI_Airbus_A320-251N_British_Airways_Manchester.jpg`: the left master (A320neo, ground, sun). It is
  taken from close by and a little ahead of the wing, so its scale falls from 53 px/m at the nose to 40 px/m at the
  tail; positions were taken through a perspective fit on the nose, door 1 and door 4.
- `commons-G-TTNV_British_Airways_A20N_EGCC.jpg`: the right master (A320neo, long lens, almost true side-on).
- `commons-G-DBCB_A319_British_Airways_tailfin_OPO.jpg`: the fin art close up (the A319 has the A320's fin).
- `commons-At_Milan_2026_009.jpg`: the right side of the fin's base, the rear fuselage and the belly line.
- `commons-_GBR-London_British_Airways_Boeing_777-36NER_G-STBE_EGLL_2025-06-17.jpg` (777 left, warm evening light: not
  for colour) and `commons-G-STBL_LHR_310325.jpg` (777 right).
- `commons-G-ZBKK_London_Heathrow_September_27th_2021_-_54966063262.jpg` (787-9 forward fuselage, right) and
  `commons-20250402_Boeing_787-9_of_British_Airways_G-ZBKD_taking_off_from_SYD.jpg` (787-9 tail, right).
- `commons-G-TTNB_-_Airbus_A320-251N_-_British_Airways_LHR_310326.jpg` and `commons-G-STBC_taking_off_2025-06-30.jpg`:
  the belly.

---

## 3. Colours

No paint specification was found. An unofficial site ([brandcolorcode.com](https://www.brandcolorcode.com/british-airways))
gives the digital brand values Blue #0035AD, Signal Red #CC3333 and Silver #999999 (Pantone 877 C). The fuselage navy
is much darker than that blue. The recommendations are from the photos: medians of hand-placed boxes on flat areas.
`G-TTSI`, `G-ZBKD` and `G-DBCB` are strongly processed (clipped or shifted) and count less.

| Paint | Recommended sRGB | Evidence | Trust |
|---|---|---|---|
| **White** (fuselage, fin ground, Sharklets) | **#F5F5F3** | Sunlit: #F7F7F7 (`G-TTNV`), #E6E6E8 (`G-DBCB`), #FAF1ED (`G-STBL`), #F3F1F1 (`G-ZBKD` fin). In shade #CDD2CC (`G-TTNI`). | High |
| **Navy** (belly, engines, title, fin and emblem blue) | **#1B2857** | Title letters in sun: #1D2A53 (`G-ZBKK`, large letters, hue 226°), #16244E (`G-TTNV`, 225°), #121A2E (`G-TTNI`, 223°, dim). Emblem blue #2B3E7D (`G-ZBKK`), #1F2E57 (`G-TTNI`). Nacelle in sun #1C3479 (`G-ZBKK`), #0C1946 (`G-TTNI`), #013881 (`G-TTNV`). Fin blue #29385B (`G-STBL`), #101935 (`G-TTNI`), #123A76 (`G-TTNV`). Belly, always in shade: #111524, #161E31, #0F1926, #031F41. Hue 213–227° in the neutral photos, median 224°. | Medium-high. One paint for all navy parts: under even light at night (`At_Frankfurt…005`) the belly and the nacelle are the same blue. The belly photographs near black because it faces down. |
| **Red** (fin bands, emblem blade, tail cone, wing-fence tip) | **#D4202B** (round 3: from #CE2029, because the lab's side light renders the red darker than the photos) | Sunlit: #D90F29 fin and #C80A20 tail cone (`G-TTNV`, hue 352°), #D62C34 emblem (`G-ZBKK`, 357°), #C22421 emblem (`G-TTNI`, 1°), #B52121 fin (`G-STBL`, 0°), #A11516 fin a little shaded (`G-TTNI`). Hue 352–1°. | High. A pure red with no orange. |
| **Navy, sunlit** (nacelles, the fin's navy band) | **#1D3680** | Nacelle in sun #1C3479 (`G-ZBKK`), #013881 (`G-TTNV`); the fin's navy band in `G-ZBKL` reads #2A3F95 in full sun. Round 3 split the navy: the belly, title and emblem keep #1B2857 (they are in shade or thin), the nacelles and the fin band take this one. | Medium |
| **Fin tints** (the dot screens: see section 4) | red **#E58E93**, navy **#8C93AB** | About half colour, half white, as the dotted zones read from a distance (`G-DBCB`, `At_Milan…009`). | Medium (a rendering choice) |
| **Emblem shadow** | **#C5CAD1** | The pale grey sliver under the red blade and under the navy wedge (`G-TTNI`, `G-ZBKK`). | Medium |
| **Coat of arms** | **#B9BDC4** | Silver grey, low contrast on the white (`G-TTNI`, `G-ZBKK`, `At_Frankfurt…005`). | Medium |
| **Wing and tailplane grey** | **#B6BBBF** | The makers' standard light grey. The samples are spoiled by shade and reflections. | Low-medium (an estimate) |
| **Inlet lip** (bare metal) | **#C5C7CA** | #A3A7BA (`G-ZBKK`), #7E7E79 in shade (`G-TTNI`). | Medium |
| **Exhaust, APU ring** | **#5A5D62** | Dark bare metal (`crop-G-TTNI_Manchester_engine`, `G-DBCB`). | Medium (an estimate) |
| **787 tail cone tip and fin leading edge** | **#2A2D33** | Near black on `G-ZBKD`. | Medium |

---

## 4. Elements (side elevation)

### 4.1 Common to every type

- **Fuselage:** white from the nose to the tail cone, crown included. No cheatline and no pinstripe: the white meets
  the navy directly (`G-TTNI`, `At_Milan…009`).
- **Belly:** navy below a straight **waterline** (a constant height, not a constant fraction). Forward it runs to the
  nose and meets the radome just under its tip (0.1–0.4 m below the tip), so the lower radome is navy. Aft of the wing
  the keel sweeps up to the line and the navy ends in a point. The whole underside is navy between those ends
  (`G-TTNB`, `G-STBC` from below), the belly fairing too. There is **no belly title**. Aft of the navy the underside is
  white up to the red tail cone.
- **Emblem** (the ribbon above the forward windows): a red ribbon with a navy underside. It has no free file
  (section 6): draw it with plain shapes. It straddles door 1 (the door's outline cuts through it). With L its length,
  total height 0.235 L. Traced on `zoom/ttni-emblem.jpg` (x 0 forward end … 1 aft end, y 0 bottom of the navy … 1 top of
  the red): the **red blade**'s top edge is almost flat to x 0.6, then falls to the point at (1, 0.845); its lower edge
  runs from the point forward as (0.878, 0.76) (0.735, 0.69) (0.59, 0.655) (0.448, 0.64) (0.3, 0.625) (0.16, 0.61); its
  forward end is a fold that curls down and round: (0.11, 0.993) (0.054, 0.94) (0.018, 0.78) (0, 0.62) (0.004, 0.51).
  Under the fold the ribbon turns over and comes back as the **navy wedge**, whose point is at the **bottom**, 0.37 L aft:
  its upper edge runs (0.075, 0.585) (0.16, 0.565) (0.233, 0.455) (0.305, 0.275) (0.37, 0.04), its lower edge is nearly
  flat along the bottom, (0.28, 0.012) (0.2, 0.02) (0.12, 0.07) (0.05, 0.17) (0.015, 0.3). A thin white gap lies between
  the red's lower edge and the navy's upper edge. Under both lies a pale grey sliver about 0.016 of the height thick (a
  painted shadow). (The first draft put the wedge's point half way up and it read as a half disc: wrong.)
- **Title:** "BRITISH AIRWAYS" in navy capitals with small serifs, one line, **under** the window row, starting just
  aft of door 1. Length : cap height = 11.4–11.6 : 1 (the SVG is 11.36 : 1).
- **Coat of arms:** a small silver-grey achievement (shield, supporters, crest, motto), as tall as the title's
  capitals or a little taller, on the title's line just aft of the title's aft end. On both sides.
- **oneworld roundel:** a blue disc about 0.3 m across at window height, 0.3 m aft of door 1 (and of door 2 on the
  777), on the **left** side (`G-TTNI`, `G-STBE`, the 2017 and 2009 photos). I could not find it on the right side
  (`G-TTNV`, `G-ZBKK`).
- **Registration:** navy capitals about 0.4 m high under the windows just ahead of the last door, both sides, with a
  small red and yellow Royal Mail badge ahead of it. The last two letters (787: three) are repeated in navy at the top
  of the fin. Skip all of these: they change per aircraft.
- **Wings and tailplane:** light grey, both surfaces. The registration is under the left wing in dark letters (skip).
  The aft tips of the flap-track fairings are red (small; `commons-British_Airways_A320_3737431993_.jpg`, `G-TTNI`).
- **Cockpit:** the windows only; no dark mask (`British_Airways_Airbus_A320_G-MEDK…`, `BGN_190523_G-ZBKC`).

### 4.2 The fin

The fin is white with three bands that rise toward the trailing edge, like a flag flying aft: from the top a **red**
band, a **navy** wedge that comes to a point at the leading edge, and a second **red** band along the root. White
shows above the upper band (the fin tip), between the bands, and at the foot of the leading edge. Both sides are the
same in aircraft terms (each is the mirror image of the other): the navy point is at the leading edge on both sides
(`G-DBCB` left, `At_Milan…009` and `G-ZBKD` right).

Edges in `k.fin(u, h)` terms, traced on the close-ups. `h` 0 is the fuselage crown line (on the A320neo model the
kit's root is 0.15 m lower: a shift of up to 0.03 near the root, none at the tip).

**A320 family** (`G-DBCB`; `G-TTNI` agrees within 0.02):

| Band | Edge | Points (u, h), leading edge → trailing edge |
|---|---|---|
| Upper red | top | (0, 0.54) (0.07, 0.58) (0.14, 0.63) (0.21, 0.68) (0.30, 0.73) (0.42, 0.76) (0.54, 0.80) (0.69, 0.825) (0.86, 0.85) (1, 0.865) |
| Upper red | bottom | (0, 0.36) (0.09, 0.37) (0.18, 0.39) (0.26, 0.42) (0.34, 0.46) (0.43, 0.49) (0.53, 0.52) (0.64, 0.54) (0.76, 0.563) (0.89, 0.585) (1, 0.595) |
| Navy | top | point (0.05, 0.28), then (0.19, 0.27) (0.29, 0.28) (0.38, 0.29) (0.46, 0.32) (0.54, 0.365) (0.63, 0.40) (0.71, 0.43) (0.84, 0.45) (1, 0.46) |
| Navy | bottom | point (0.05, 0.28), then (0.14, 0.25) (0.24, 0.22) (0.35, 0.21) (0.45, 0.21) (0.54, 0.215) (0.64, 0.22) (0.74, 0.21) (0.85, 0.19) (0.94, 0.17) (1, 0.165) |
| Lower red | top | (0.01, 0.19) (0.11, 0.16) (0.23, 0.13) (0.33, 0.11) (0.42, 0.11) (0.52, 0.105) (0.61, 0.10) (0.72, 0.085) (0.82, 0.07) (0.91, 0.06) (1, 0.05) |
| Lower red | bottom | (0, 0.09) (0.11, 0.02) (0.23, −0.04) (0.33, −0.07) (0.42, −0.08) (0.54, −0.08) (0.62, −0.08) (0.70, −0.09) (0.79, −0.12) (0.83, −0.15), then into the tail cone |

**777 and 787** (`G-STBE` left; `G-ZBKD` right agrees within 0.03):

| Band | Edge | Points (u, h), leading edge → trailing edge |
|---|---|---|
| Upper red | top | (0.01, 0.69) (0.11, 0.74) (0.27, 0.79) (0.48, 0.82) (0.74, 0.845) (1, 0.85) |
| Upper red | bottom | (0.02, 0.41) (0.09, 0.42) (0.20, 0.46) (0.32, 0.50) (0.46, 0.54) (0.64, 0.56) (0.83, 0.57) (1, 0.575) |
| Navy | top | point (0.04, 0.32), then (0.24, 0.31) (0.38, 0.32) (0.50, 0.35) (0.63, 0.40) (0.78, 0.435) (1, 0.45) |
| Navy | bottom | point (0.04, 0.32), then (0.22, 0.27) (0.37, 0.26) (0.53, 0.26) (0.69, 0.25) (0.86, 0.225) (0.97, 0.205) (1, 0.20) |
| Lower red | top | (0.03, 0.22) (0.18, 0.18) (0.35, 0.15) (0.49, 0.14) (0.65, 0.12) (0.81, 0.09) (0.92, 0.07) (1, 0.055) |
| Lower red | bottom | (0.01, 0.12) (0.16, 0.05) (0.29, −0.02) (0.44, −0.05) (0.59, −0.06) (0.70, −0.07) (0.80, −0.11), then into the tail cone |

At the trailing edge the three bands sit at nearly the same heights on every type. Round 3 re-measured them on the
close-ups `crop-G-TTNI_Manchester_tail`, `zoom/ttnv-tail`, `zoom/stbe-tail` (the TE root taken where the trailing edge
meets the tail cone): upper red 0.60–0.87, navy 0.46–0.17 (777: 0.45–0.20), lower red top 0.05 (0.06 on the 777). The
tables below carry these values at u = 1; the earlier tables were 0.03–0.09 lower at the trailing edge. At the leading edge the upper red band starts higher on the wide-bodies (0.41–0.69)
than on the A320 fin (0.36–0.54).

**The lower red band leaves the fin.** From about u 0.15 it dips below the fin's root onto the fuselage crown (to
0.5 m below the crown on the A320, a little more on the wide-bodies) and runs aft into the red tail cone.

**Dot screens.** Each band is flat colour in its middle and printed as dots elsewhere (`G-DBCB`, `At_Milan…009`):
the first 15–20 % at the leading-edge end breaks into dots that shrink to nothing (the band fades into the white, and
the navy point is all dots), and a strip at about u 0.75–0.95 is a lighter dot screen that reads as a fold of the
flag; the last few per cent at the trailing edge are dark again. The lower red band has a darker fold shade near
u 0.55–0.60. From a normal viewing distance these read as soft gradients: draw them with gradients to the tints of
section 3, or leave the bands flat.

**787 only:** the fin's leading edge is a near-black strip, about 6–7 % of the chord, along its whole length (`G-ZBKD`,
`…G-ZBKL_at_SYD_03`). The art ends at the strip. The A320 and 777 fins have no such strip.

### 4.3 The tail cone

Red all round, joined to the fin's lower red band. The red starts on a slanted cut: further forward at the top than at
the bottom.

| Type | Red starts, top / bottom (metres ahead of the tail tip) | Tip |
|---|---|---|
| A320 family | 3.7 / 2.4 (`G-DBCB`, `G-TTNV`) | the last 0.3 m is the bare-metal APU ring |
| 777-300ER | 5.7 / 3.3 (`G-STBE`) | the APU outlet on the left of the tip is bare metal |
| 787-9 | 6.0 / 3.9 (`G-ZBKD`) | the last 1.8 m is a near-black cone |

### 4.4 A320 family (A320-200, A320neo, A321neo; fuselage 4.14 m high)

| Element | Along the fuselage | Height | Evidence |
|---|---|---|---|
| Belly waterline | nose to z ≈ 30.7 (it ends in a point at the aft edge of door 4) | **wc − 1.48 m** (round 3; the photos give navy 0.28 of the fuselage height, and the model's window row is 2.65 m above its keel; the first draft's 1.60 m gave 0.25) | `G-TTNI`, `G-TTNV` (measured on a larger copy of the same photo, not stored) |
| Emblem | **z 3.95 – 8.55** (L = 4.6 m): from 0.6 m ahead of door 1's forward edge to 2.9 m aft of its aft edge; the wedge's point at z ≈ 5.4 | top **wc + 0.90**, bottom **wc − 0.20** (1.1 m) | left 4.75 m, right 4.55 m long |
| Title | **z 6.2 – 12.8** (6.6 m): from 0.5 m aft of door 1's aft edge (0.4 m on the right) to the centre of the 12th window | baseline **wc − 0.88**, **cap height 0.57 m** (top 0.31 m below wc, 0.12 m under the window bottoms) | left 6.60 m, right 6.58 m; cap 0.56 and 0.58 m |
| Coat of arms | centre z ≈ 13.6 (0.8 m aft of the title's aft end) | 0.6 m wide, 0.6 m high, centred on the title's capitals | both sides |
| oneworld roundel | z ≈ 5.95 (left side) | at wc, 0.3 m across | `G-TTNI` |
| Registration | z 26.5 – 28.2 | centred 1.15 m below wc | skip |

The A321neo carries the same emblem and title at the same place from door 1, and its navy ends at its last door
(`G-NEOW`, `G-NEOR`, `At_Milan…009`; seen, not measured).

### 4.5 Boeing 777-300ER (fuselage 6.2 m across)

| Element | Along the fuselage | Height | Evidence |
|---|---|---|---|
| Belly waterline | nose to about 2.5 m aft of the last door | **wc − 1.95 m** (round 3: the navy is 0.24 of the height on `G-STBE`; the model's window row is 3.55 m above its keel) | `G-STBE` (measured on a larger copy of the same photo, not stored) |
| Emblem | **z 4.7 – 11.8** (L = 7.1 m): from 1.45 m ahead of door 1's forward edge to 4.3 m aft of its aft edge | top **wc + 1.05**, bottom **wc − 0.78** (1.83 m) | `G-STBE` |
| Title | **z 8.5 – 19.9** (11.4 m): from 1.05 m aft of door 1's aft edge to 2.1 m aft of door 2's aft edge. The "W" and the second "A" cross the lower part of door 2. | baseline **wc − 1.55**, **cap height 0.94 m** | `G-STBE`; on the right (`G-STBL`) it covers the same span: 1.1 m aft of door 1 to 1.9 m aft of door 2 |
| Coat of arms | centre about 1.6 m aft of the title's aft end | about 0.9 m high | `G-STBL` (small in the photo) |
| oneworld roundel | 0.3 m aft of door 1 and of door 2 (left side) | at wc | `G-STBE` |

The 777-200ER wears the same scheme (seen on the Commons contact sheets; not measured).

### 4.6 Boeing 787-9 (fuselage 5.94 m high)

The 787 photos are oblique, so the lengths are less sure (±0.4 m).

| Element | Along the fuselage | Height | Evidence |
|---|---|---|---|
| Belly waterline | nose to under the tailplane's leading edge | **wc − 2.3 m** (round 3: navy 0.20–0.21 of the height; the model's window row is 3.55 m above its keel) | `G-ZBKK`, `…G-ZBKL_at_SYD_03` |
| Emblem | **z 4.6 – 11.7** (L ≈ 7.3 m): from 1.4 m ahead of door 1's forward edge to 4.25 m aft of its aft edge | top **wc + 0.89**, bottom **wc − 0.91** (1.8 m) | `G-ZBKK` |
| Title | between doors 1 and 2: **z ≈ 7.6 – 17.9** (10.0 ± 0.4 m), 0.3–0.4 m clear of door 1 and 0.5–0.7 m clear of door 2 | baseline **wc − 1.36**, **cap height 0.86 m** | `G-ZBKK` (right), `…SYD_03` (left) |
| Coat of arms | **aft of door 2**: centre 1.1 m aft of door 2's aft edge | 0.75 m wide, 0.86 m high | `G-ZBKK` |

The 787-8 and 787-10 wear the same scheme (seen on the contact sheets; not measured).

### 4.6a Airbus A380-800 (fuselage 8.46 m high on the model; added 2026-10-14)

Measured on `commons-2013Riat-4725.jpg` (G-XLEA, left side, a CC0 photo; 72.7 m = 807 px, 11.1 px/m) and checked on
`commons-Airbus_A380-841_54951626330_.jpg` (right side, in flight: the title reads forward, the coat of arms is at its
aft end). The model draws only the main deck's window row (wc, 3.83 m above the keel); the real aircraft has an upper
deck row 2.9 m higher, which the model lacks (a model gap, not painted). Door 1 is at d 7.1 m on the photo, 6.3 m on the model.

| Element | Along the fuselage | Height | Evidence |
|---|---|---|---|
| Belly waterline | nose to the tail | **wc − 2.35 m** (1.5 m above the keel, 0.175 of the height) | the photo |
| Emblem | d 7.7 – 18.1 (L = 10.4 m): from 0.6 m aft of door 1's centre | top **wc + 3.2**, bottom **wc + 1.1** (2.1 m), at the upper deck's row | the photo |
| Title | d 12.1 – 27.9 (15.8 m), 5.0 m aft of door 1's centre; it runs over the top of door 2 | baseline **wc + 0.36**, cap height **1.3 m**, between the two window rows | the photo |
| Coat of arms | centre 1.65 m aft of the title's aft end | 1.0 m high | the photo |
| Doors (outline) | 1.4 m wide | wc − 1.2 … wc + 0.9 | the photo |
| Tail cone red | starts 7.0 m (crown) / 3.8 m (keel) ahead of the tail tip | | assumed from the 777 |

The fin is the wide-body table of 4.2 (the three bands at the same heights; checked on the right and left fin photos).
The A350 (not measured, no photo) takes the 787's layout in the design: its fuselage section is the same size.

### 4.7 Engines

All types: the nacelle is **navy** all round from the lip to the nozzle, with a **bare-metal inlet lip** and a dark
bare-metal exhaust. The pylon is light grey. There is **no title** on any nacelle; only small stencils.

- A320neo (LEAP-1A): lip ring about 0.3 m wide (`crop-G-TTNI_Manchester_engine`, `At_Frankfurt…005`). The design's lip is
  0.3 m (A320 family), 0.5 m (777), 0.75 m (787: the polished band is the width of the nacelle's front cowl), 0.6 m (A380).
- A320-200 (V2500): the same navy on the long cowl (`commons-British_Airways_A320_3737431993_.jpg`, `G-EUUC`).
- 777-300ER (GE90): navy, silver lip (`G-STBE`, `G-STBG`).
- 787 (Trent 1000): navy, a broad silver lip, a small white-outlined Rolls-Royce badge on the outboard face of each
  nacelle, chevrons at the trailing edge (`G-ZBKK`, `…SYD_03`, `A_Rolls_Royce_Trent_1000…`).

### 4.8 Wingtip devices

- **Sharklets** (A320neo, A321neo, newer A320-200): **white on both faces, no marking** (outer face:
  `crop-G-TTNI_Manchester_sharklet-outer`, `G-TTNV`; inner face of the left one and outer face of the right one:
  `crop-G-TTNI_Frankfurt_sharklets`). In shade they photograph light grey (#919B95).
- **Wing fences** (older A320-200, A319): light grey or white, with about the **bottom 40 % of the lower blade red**
  (`commons-Wingtip_Fence_Airbus_A320.jpg`, `G-EUUC`, `G-DBCB`).
- 777 and 787: raked tips, wing grey, no marking.

### 4.9 Left and right

- The colour fields are the same on both sides: belly, fin bands (mirror images), tail cone, engines.
- The **emblem is mirrored**: its thick end is forward on both sides. Drawn as shapes in z and y it comes out right.
- The **title is not mirrored** and covers the same stretch of fuselage on both sides: on the left the "B" is at the
  forward end, on the right the "S" is. The kit does this for an image by itself.
- The coat of arms is at the **aft** end of the title on both sides (A320, 777) or aft of door 2 (787).
- The oneworld roundel was found on the left side only.

---

## 5. Drawing steps

1. Fill white #F5F5F3 (fuselage and fin).
2. Navy #1B2857 below the waterline: a constant height (`k.a.windowY` − 1.48 m on the A320 family, − 1.95 m on the
   777, − 2.3 m on the 787, − 2.35 m on the A380), from ahead of the nose to behind the tail: a polygon, or `k.below` with the fraction given as a function of z.
   A constant fraction is wrong: the navy must end where the rising keel meets the line.
3. The fin: the three bands as polygons from the tables of 4.2 (`k.finPoly`, or `k.fin(u, h)` points in a path).
   Take the A320 table for `a3…` models and the wide-body table for the 777, 787, A350 and A380. Let the lower red
   band's bottom edge run below the root, and clip the upper two bands to the fin (`k.clip('fin', …)`).
4. The tail cone red #D4202B aft of the slanted cut of 4.3 (overshoot the tail), then the bare-metal ring
   (A320), or the near-black cone (787). **Limit these end pieces to the cone's own height** (keel − 0.5 m to crown +
   0.2 m at the tail tip): the fin's trailing edge reaches aft of the cone's end, and a full-height polygon there paints
   the fin's trailing edge grey (the first draft's bug, seen on every A320 and A380 render).
5. 787: the near-black strip along the fin's leading edge, u 0 – 0.065, **clipped to the fin** (`k.clip('fin', …)`; unclipped it
   puts a black block on the crown ahead of the fin).
6. The emblem from plain shapes (4.1) at the type's place and size: the red blade, the navy wedge, the two grey
   slivers. Do not use a trace of BA's artwork.
7. The title: `title.svg` with its height = the cap height and its lower edge on the baseline (A320 0.57 m at
   wc − 0.88; 777 0.94 m at wc − 1.55; 787 0.86 m at wc − 1.36), spanning the z range of the type's table.
8. Optional small marks: the coat of arms as a pale grey patch (section 6), `oneworld.svg` 0.3 m across on the left
   side only (`k.side`).
9. `engineColor` and `engine(k)`: navy #1D3680, the lip #C5C7CA at the inlet (width by type, 4.7), the exhaust #5A5D62.
10. `winglet(k)`: white. For a model with wing fences: light grey with a red lower tip.
11. `wing` and `stab`: #B6BBBF.

---

## 6. Logos and fonts

| Graphic | Commons file | Licence | In `liveries/BAW/` | Use |
|---|---|---|---|---|
| "BRITISH AIRWAYS" wordmark (1997, current) | https://commons.wikimedia.org/wiki/File:British_Airways_1997_wordmark.svg | **PD-textlogo** + Trademark (the page's permission field: TOO-UK); read on the file page 2026-10-13 | `title.svg` (paths unchanged; fill #00054C → #1B2857; size set in pixels) | The fuselage title. Rendered and compared with the aircraft: the same letters. |
| The same wordmark, another upload | https://commons.wikimedia.org/wiki/File:BRITISH_AIRWAYS_logo.svg | PD-textlogo | not taken (smaller, web blue #2E5C99) | – |
| oneworld logo | https://commons.wikimedia.org/wiki/File:Oneworld_Logo.svg | **PD-textlogo** + Trademark | `oneworld.svg` (unchanged) | The roundel by the left doors (optional). |
| The ribbon emblem ("Speedmarque") | none usable. https://commons.wikimedia.org/wiki/File:British_Airways.svg (uploaded 2026-07-18 as "own work, CC0") carries a deletion request: not the uploader's work, and the ribbon is above the UK threshold of originality. | **no free file** | – | Draw it with plain kit shapes (4.1). |
| Coat of arms | https://commons.wikimedia.org/wiki/File:Armorial_Bearings_of_British_Airways.svg (Ben1we, **CC BY-SA 4.0**) and https://commons.wikimedia.org/wiki/File:British_Airways_Arms.svg (A1 Aardvark, **CC BY-SA 3.0**) | free, share-alike, in full colour | not taken | On the aircraft it is a 0.6–0.9 m silver mark: at the atlas's scale a pale grey patch does the same. Take the CC BY-SA file only if the mark must be legible, and then credit its author in `sources.json`. |
| Fin art | none | – | – | Polygons from 4.2. |

**Fonts:** none needed. The title is the SVG. The only other lettering is the registration and the letters at the fin
tip, which are skipped.

---

## 7. How sure

- **High:** the scheme and its parts on all three families; the left/right rules of 4.9; white, navy and red; no
  title on the engines; no belly title; the red tail cone; the fin bands' order and their heights at the trailing
  edge.
- **A320 family positions:** ±0.15 m along the fuselage and ±0.08 m in height for the title and the emblem (two
  independent photos, one per side, agree to 0.1 m on lengths). The left master is a perspective view: its heights
  above the windows read 0.1–0.2 m low, so the emblem's heights are from the right master.
- **Belly waterline:** ±0.1 m (A320), ±0.2 m (777, 787). The photos' fractions spread from 0.22 to 0.275 on the A320.
- **777 and 787 positions:** ±0.3 m along the fuselage (777) and ±0.4 m (787: oblique photos only). Cap heights
  ±0.05 m.
- **Fin tables:** ±0.03 in u and h (the trailing-edge ends were re-measured in round 3 on three close-ups that agree to 0.03). The dot screens are described, not measured dot by dot.
- **Navy:** one hex for a gloss paint that photographs from near black to royal blue. If the sunlit engines look too
  dark beside the photos, lighten the nacelle toward #1F3070; the belly needs no change.
- **Sharklets:** white on both faces is seen on four faces of two aircraft, all from a distance. A thin unpainted
  leading-edge strip could not be ruled out.
- **A380:** one side-on photo (±0.3 m along the fuselage, ±0.1 m in height), the right side checked on an oblique photo; the tail cone's cut is assumed.
- **Open:** the A380's upper-deck window row (the model has none); the A350 (the 787's layout is used, not measured); the oneworld roundel on the right side (not found); the coat of arms on the 777's left side (too faint
  in the evening photo to place; assumed to mirror the right side); the A321neo, 777-200ER, 787-8 and 787-10 were
  seen but not measured; the aliases CFE, EFW and SHT are from general knowledge.

Sources: Wikimedia Commons (the files above; categories "Current Airbus A320neo / A320 / A321neo / Boeing 777-300ER /
777-200ER / 787-9 / 787-10 of British Airways"); planespotters.net public API; brandcolorcode.com (unofficial brand
values); the app's `public/models/*/model.json` (door and window stations).

---

## 8. Changes after rendering and comparing (2026-10-14, five rounds on a320, a20n, b772, b789, a388)

- The bare-metal ring (A320 family) and the near-black cone and fin edge (787) were full-height polygons: they painted the
  fin's trailing edge grey (every A320 and A380) and a black block on the 787's crown. They are now limited to the cone's
  height and clipped to the fin (section 5, steps 4 and 5).
- The emblem was redrawn from the close-up (4.1): the navy wedge's point is at its bottom, 0.37 L aft, with a white gap under the red.
- The fin's trailing-edge heights were raised 0.02–0.09 (4.2); the navy and red are brighter in the nacelles and the fin (section 3).
- The belly waterlines were set from the navy's share of the fuselage height in the photos (4.4–4.6).
- The A380 got its own layout (4.6a); the A350 and the 747 take the 787's and the 777's.
- The coat of arms is larger on the A320 family (0.8 m) and the 787 (0.95 m): it was a small patch beside the photos' mark.
- The engine lips are wider (4.7).

Still different from the photos: the models' window rows start about two windows ahead of the real ones on the A320 family
(the model's first window overlaps the emblem's wedge); the A380 model has no upper-deck windows; the fin's dot screens are
soft gradients; the wing and tailplane undersides render darker than the photos' light grey (the lab's light).
