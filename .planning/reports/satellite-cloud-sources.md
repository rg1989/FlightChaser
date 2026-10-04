# Satellite cloud data for the chase view: which free, near-real-time sources can place clouds and give their top heights

Date of research: 2026-10-04 (live fetches were made between about 00:40 and 01:00 UTC that day).
Scope: Israel and the Eastern Mediterranean first, then worldwide.
Rule followed: primary sources only (the data owner's own documentation, capabilities documents, API responses, licence texts). Where a statement could not be traced to a primary source it is marked "not confirmed" or "my derivation". Source text is paraphrased, not copied.

How to read this file:

- "Observed" means I fetched the owner's service on 2026-10-04 and report what it returned. Times are UTC.
- "Search excerpt" means the owner's page is rendered by JavaScript or was blocked (EUMETSAT's user portal could not be rendered, and www.eumetsat.int returned HTTP 403 to the fetch tool), so the claim rests only on a search-engine excerpt of that page. These claims are weaker and are listed again in section 5.
- "My derivation" means arithmetic or physics done here, not taken from a source.

---

## 1. Comparison table

| Source / product | What it is | Resolution | Update and observed lag | Access | Browser direct (CORS) | Limits | Licence / attribution | Covers Israel? |
|---|---|---|---|---|---|---|---|---|
| **EUMETSAT EUMETView WMS**, layer `msg_fes:cth` (MSG, 0 deg) | Cloud top height as a colour-coded image (the style has no colour map) | Search excerpt: 3x3 superpixel, 300 m height steps. The spec's change record gives a 1237-pixel image width | 15 min. Observed: newest frame 00:30Z when the clock was about 00:50Z | Keyless WMS GetMap | Not confirmed | No MaxWidth/MaxHeight or quota stated | Capabilities say no fees, no access constraints. Data Policy: derived products are Core, CC-BY-4.0, attribution required | Yes. Layer box -77..77 deg |
| **EUMETView** `msg_iodc:cth`, `msg_iodc:clm` (Meteosat-9 at 45.5 E) | The same products from the Indian Ocean satellite | As above | 15 min. Observed: newest 00:30Z at about 00:50Z | Keyless WMS | Not confirmed | As above | As above | Yes. Box lon -35.5..118.5, lat -77..77. Better viewing angle for Israel (my derivation: about 39 deg against about 53 deg from 0 deg) |
| **EUMETView** `msg_fes:clm` | Clear or cloudy per pixel | Pixel level | 15 min | Keyless WMS | Not confirmed | As above | As above | Yes |
| **EUMETView** `mtg_fd:ir105_hrfi` (MTG imager, IR 10.5 um) | Infrared image, level 1c | 1 km (layer abstract) | 10 min. Observed: newest 00:30Z at about 00:50Z | Keyless WMS | Not confirmed | As above | Level 1 data under 1 h old is "Recommended" data (section 2.1). Whether a rendered image counts is not confirmed | Yes. Box -70..70 deg |
| **EUMETView** `msg_rss:ir039_nrt` (rapid scan) | IR 3.9 um image, northern third of the disc | SEVIRI | 5 min. Observed default 00:45Z | Keyless WMS | Not confirmed | As above | As above | Yes. Lat 13..78 N, lon -64.3..84.3 |
| **EUMETView** `mumi:worldcloudmap_ir108` | Global IR 10.8 um composite of several geostationary satellites | Not stated | 3 h steps only | Keyless WMS | Not confirmed | As above | As above | Yes (worldwide), too slow |
| **EUMETSAT Data Store**, MTG: `0681` (cloud top temperature and height), `0678` (cloud mask netCDF), `0800` (cloud mask GRIB2), `0680` (cloud type), `0684` (optimal cloud analysis) | Per-pixel numeric products: top temperature, geometric height, pressure; mask; type; cloud analysis | OCA: 2 km at nadir. The others: not stated | 10 min. Observed: top-height product for 00:30-00:40 published 00:50:17Z | Free account and API key to download; search and browse worked with no credentials | Needs a server (token flow); CORS not confirmed | Quota not confirmed. Search results are capped at 10,000 records | Core data, CC-BY-4.0, attribution line naming EUMETSAT, the Meteosat product and the year | Yes. Collection polygon -67.5..67.5 deg |
| **EUMETSAT Data Store**, MSG: `EO:EUM:DAT:MSG:CTH`, `CTH-IODC`, `CLM`, `CLM-IODC` | The MSG products as numeric files | See EUMETView rows | 15 min. Observed: top height for 00:30 published 00:43:41Z (0 deg) and 00:43:35Z (Indian Ocean), about 14 min after nominal time | Same | Same | Same | Same | Yes |
| **EUMETSAT Data Store**, `EO:EUM:DAT:MSG:RSS-CLM` | Rapid scan cloud mask | Not stated | 5 min. Observed: 00:55 sensing published 01:00:06Z | Same | Same | Each file about 133 MB as listed, heavy | Same | Yes (lat 13..78 N) |
| **NASA GIBS geostationary** (GOES-East, GOES-West, Himawari) | Clean IR, red visible, air mass RGB, GeoColor | Not stated in the pages read | 10 min; about 40 min latency (NASA) | Keyless tiles | Not stated | None stated | NASA asks for an acknowledgement line | **No.** NASA says Europe and Africa are not covered |
| **NASA GIBS MODIS** Terra and Aqua: cloud top height, pressure, temperature, fraction (day and night) | Polar-orbit cloud products | Algorithm 5 km, imagery 2 km (NASA layer text) | Daily layer; NRT latency 1-3 h (NASA) | Keyless tiles | Not stated | None stated | Same acknowledgement | Yes, but one or two passes a day |
| **NOAA GOES** (ACHA top height on AWS; nowCOAST WMS imagery) | Real top height (GOES-R ACHA); IR composites | ACHA 2 km since 24 Mar 2023 (NCEI) | ACHA 10 min (NCEI record); nowCOAST imagery listed at 5-min steps | AWS S3 with no sign-in; nowCOAST WMS keyless | Not confirmed | None stated | Open; attribution requested for unaltered data | **No** (Americas) |
| **JMA Himawari-8/9** | Full-disc imagery every 10 min | 2 km IR | 10 min | HimawariCloud is for national met services only; no public tile API found; level 1b on AWS | n/a | n/a | JMA Public Data License 1.0 (CC-BY 4.0 compatible) | **No** (my derivation: sub-satellite point near 140.7 E) |
| **RainViewer** | Radar tiles; satellite IR discontinued 1 Jan 2026 | Radar, max zoom 7 | `satellite.infrared` is an empty array (observed) | Keyless | n/a | 100 requests per IP per minute; personal and educational use | Link to RainViewer requested | Radar only |
| **DWD WMS** | Meteosat RGB Europe, world IR 10.8 um mosaic | 3 km (world mosaic) | 3 h steps only | Keyless WMS | Not confirmed | None stated | Points to the DWD copyright page | Yes, but too slow |
| **SSEC RealEarth** | Tile service of contributed products | Varies | Varies | Keyless tiles | Not confirmed | 500 megapixels per rolling 24 h, then a watermark | Terms not confirmed | No cloud-height product confirmed |

---

## 2. Sections by source

### 2.1 EUMETSAT EUMETView (WMS imagery and cloud products)

**What it is.** EUMETSAT's own map service. The Data Policy describes it as the service for displaying visualisations and making maps from EUMETSAT data, without giving access to the original numbers (Data Policy, Article 3, p. 9: https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf).

**Endpoint and protocol.** `https://view.eumetsat.int/geoserver/wms`, WMS 1.3.0, layers named `workspace:layer`, a `TIME` parameter picks the frame (EUMETSAT tutorial of 3 Aug 2016, pp. 5-8: https://www-cdn.eumetsat.int/files/2020-07/Tutorial%20on%20EUMETView%20Service%20access%20through%20WMS%20GetCapabilities%20and%20GetMap%20requests.pdf). The service still answers GetCapabilities in that form. Per-workspace capabilities were fetched from:

- https://view.eumetsat.int/geoserver/msg_fes/wms?service=WMS&version=1.3.0&request=GetCapabilities
- https://view.eumetsat.int/geoserver/msg_iodc/wms?service=WMS&version=1.3.0&request=GetCapabilities
- https://view.eumetsat.int/geoserver/mtg_fd/wms?service=WMS&version=1.3.0&request=GetCapabilities
- https://view.eumetsat.int/geoserver/msg_rss/wms?service=WMS&version=1.3.0&request=GetCapabilities
- https://view.eumetsat.int/geoserver/mumi/wms?service=WMS&version=1.3.0&request=GetCapabilities

**Layers that matter (all read from the capabilities above).**

- `msg_fes:cth`: cloud top height, MSG at 0 deg. The abstract says it gives the height of the highest cloud, from part of the scene and cloud analysis plus other external meteorological data, for aviation weather. Box -77..77 deg. Time steps of 15 min since 2020-09-01. Style `msg_cth`, an RGB style with a custom legend.
- `msg_fes:clm`: cloud mask with four classes (clear over water, clear over land, cloud, not processed). 15 min.
- `msg_fes:ir108` and `ir039`: SEVIRI IR 10.8 and 3.9 um, 15 min. The IR3.9 abstract states its grey mapping (200-300 K at night, 250-330 K by day, equivalent black body temperature). No such mapping is stated for IR10.8.
- `msg_iodc:cth`, `clm`, `ir108`: box lon -35.5..118.5, lat -77..77, 15 min. The abstract says Meteosat-9 at 45.5 E has been the prime Indian Ocean satellite since 1 June 2022.
- `mtg_fd:ir105_hrfi`: FCI level 1c full-disc image at 1 km, IR 10.5 um. Box -70..70 deg. 10 min since 2024-09-23. Styles: grayscale, style_01, style_02.
- Other MTG layers: `vis06_hrfi` (0.5 km visible, 10 min), `rgb_cloudtype` (daytime only), `rgb_cloudphase`, `rgb_geocolour`, `rgb_fog`. There is **no** `cth` or `clm` layer in the `mtg_fd` workspace.
- `msg_rss:ir039_nrt` and RGB layers: 5 min steps, box lon -64.3..84.3, lat 13..78 N.
- `mumi:worldcloudmap_ir108`: IR 10.8 um multi-satellite composite, global, 3 h steps.

**What the cloud top height layer contains.** The `msg_cth` style (https://view.eumetsat.int/geoserver/styles/msg_cth.sld) holds only a raster symbolizer at full opacity and no colour map, and the JSON legend for `msg_fes:cth` also lists no colour map entries. So the heights cannot be recovered from the style. The colour-to-height mapping is not confirmed (section 5).

**Cloud top height image product facts (MSG).**
- EUMETSAT's MSG product extraction specification (EUM/MSG/SPE/022 v5B, 259 pages: https://user.eumetsat.int/s3/eup-strapi-media/pdf_ten_spe_04022_msg_mpef_c5dbfeb7d4.pdf) records that the cloud analysis and top height image products use GRIB-2 encoding, and that the top height image size is 1237 pixels (its change record, p. 4, naming section 8.4). The same record (p. 6, issue v4C) shows the radiative transfer model was changed to RTTOV.
- A search excerpt of the same document says the top height image reports the highest cloud in each 3x3 pixel block, in 300 m height steps, and that the radiances are predicted from ECMWF forecasts. I did not reach that page in the PDF. A 1237-pixel width fits 3712/3 (my derivation).

**Frame rate and observed lag.**
- At 00:50:24Z (RainViewer's own `generated` field, fetched at the same moment) the newest frames in these capabilities were 00:30Z for `msg_fes` cth/clm/ir108, `msg_iodc` cth/clm/ir108 and `mtg_fd:ir105_hrfi`. The rapid scan layers showed 00:45Z (IR 3.9) and 00:40Z (RGB). So the newest frame was about 20 min past its nominal time. This is one observation, not a measured spread.
- The Data Store (section 2.2) published the same MSG top height for 00:30 at 00:43:41Z, so the WMS lag looks like the product delay plus a few minutes. Not confirmed beyond that.

**Access limits.** Capabilities give no fees and no access constraints. No MaxWidth, MaxHeight or LayerLimit is declared and I found no quota. GetMap formats include PNG, JPEG, GeoTIFF (8-bit and normal), TIFF and others.

**Tiles.** The tile-cached WMS (https://view.eumetsat.int/geoserver/gwc/service/wms?request=GetCapabilities&version=1.1.1&tiled=true, a 7.7 MB document that was only partly summarised) listed tile sets only for `osmgray:dark_labels` and `msg_rss:rgb_natural_nrt`. A WMTS call on `/geoserver/wmts` returned 404 and `/geoserver/ows?service=wmts` answered that no such service exists. So `cth`, `clm` and `ir` layers are reached through ordinary WMS GetMap with a BBOX, not XYZ tiles (partial evidence, section 5).

**Browser access (CORS).** Not documented. A search excerpt of the EUMETSAT page https://user.eumetsat.int/data-access/eumetview says only that the OGC interfaces (WMS, WCS, WFS) let other applications integrate EUMETView. Whether the server sends `Access-Control-Allow-Origin` is not confirmed. NASA's Worldview, a browser app, lists EUMETSAT layers as type `wms` with source `EUMETSAT:wms`, for example https://raw.githubusercontent.com/nasa-gibs/worldview/main/config/default/common/config/wv.json/layers/eumetsat/EUMETSAT_MTG_0Deg_IR105_10min.json. That shows another client uses them, not that CORS headers are sent.

**Licence (important).** From the EUMETSAT Data Policy (https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf):
- Article 4 (p. 10): the Core class holds the hourly level 1 SEVIRI, FCI and IRS data, all derived products and all advanced image products of those instruments. The Recommended class holds level 1 data with a latency of 1 hour or more (free) and level 1 data under 1 hour (may carry fees).
- Article 5.1 (p. 11): Core data and products are free and unrestricted for every user worldwide, under CC-BY-4.0.
- Article 6 (p. 11): Core data may be redistributed; users must carry an attribution line to EUMETSAT naming the Meteosat data or product and the year, with a "contains modified" prefix where changed. Redistributing the original numbers of Recommended data is prohibited unless a provision allows it.
- Article 12.2 (p. 15): research, educational and personal users get Recommended data under 1 hour free, but operational and commercial use, including broadcasting, is prohibited.
- Article 14.2 (p. 16): service providers, broadcasters and end users pay annual flat fees for Recommended data under 1 hour: EUR 4,000 for end users, EUR 8,000 for service providers and broadcasters.
- Reading for this app: the derived cloud products (mask, top height, top temperature and height, cloud type, cloud analysis) are Core, so CC-BY-4.0 with attribution is the clear case. Whether a rendered WMS picture of a level 1 IR band under 1 hour old counts as original numerical data (Recommended, restricted) or as an advanced image product (Core) is not confirmed. The page https://www.eumetsat.int/about-us/terms-use returned HTTP 403, so the EUMETView terms page was not read.

**Which satellites cover Israel.** All three EUMETSAT services include 35 E, 32 N: the 0 deg MSG service (box -77..77), the MTG imager at 0 deg (box -70..70, platform tag `MTI1` in the Data Store) and the Indian Ocean service (Meteosat-9 at 45.5 E, box lon -35.5..118.5). Platform tags in the Data Store listings: MSG3 for the 0 deg MSG products, MSG2 for the Indian Ocean ones, MSG4 for the rapid scan.

---

### 2.2 EUMETSAT Data Store (the numeric cloud products)

**Anonymous discovery worked.** I queried the Data Store API with no credentials:
- Collections: https://api.eumetsat.int/data/browse/collections?format=json. Cloud related collections found: `EO:EUM:DAT:MSG:CLM`, `EO:EUM:DAT:MSG:CLM-IODC`, `EO:EUM:DAT:MSG:CTH`, `EO:EUM:DAT:MSG:CTH-IODC`, `EO:EUM:DAT:0617` (MSG optimal cloud analysis climate record), `EO:EUM:DAT:0800` (MTG cloud mask, GRIB2), `EO:EUM:DAT:0678` (MTG cloud mask, netCDF), `EO:EUM:DAT:0680` (MTG cloud type), `EO:EUM:DAT:0681` (MTG cloud top temperature and height), `EO:EUM:DAT:0684` (MTG optimal cloud analysis), `EO:EUM:DAT:MSG:RSS-CLM`.
- Product search pattern that worked: `https://api.eumetsat.int/data/search-products/1.0.0/os?format=json&pi=<collection>&c=3`.

**Download needs an account.** The EUMDAC guide describes a consumer key and secret taken from the EUMETSAT portal, a token valid for 1 hour, and anonymous discovery but authenticated download (https://user.eumetsat.int/resources/user-guides/eumetsat-data-access-client-eumdac-guide, search excerpt; the page itself is JavaScript-rendered). I did not register and did not download anything.

**Observed products and publication lag (search API, 2026-10-04).**

| Collection | Product seen | Published | Size listed |
|---|---|---|---|
| MTG top temperature and height `0681` (platform MTI1, instrument FCI, "FD") | sensing 00:30-00:40Z | 00:50:17Z | 82,970 bytes (zip) |
| same | sensing 00:20-00:30Z | 00:39:45Z | 82,742 bytes |
| MTG cloud mask netCDF `0678` | sensing 00:30-00:40Z | 00:48:56Z | 7,968 bytes |
| MSG 0 deg top height (MSG3) | sensing 00:30Z | 00:43:41Z | 433 KB |
| MSG Indian Ocean top height (MSG2) | sensing 00:30Z | 00:43:35Z | 408 (unit as printed) |
| MSG rapid scan cloud mask (MSG4) | sensing 00:55Z | 01:00:06Z | 134 MB |

Counts reported: MTG top height 42,368 products; MSG 0 deg top height 601,256; Indian Ocean 337,780. The MTG top-height files look very small for a full-disc product. I did not open them, so what one file holds is not confirmed.

**Product facts (collection metadata fetched from the API).**
- MTG top temperature and height (`0681`, https://api.eumetsat.int/data/browse/collections/EO%3AEUM%3ADAT%3A0681?format=json): gives cloud top temperature and height (geometric height and pressure) for every cloudy pixel, opaque or semi-transparent. Fractional clouds are left out because the warm surface contaminates them and no accurate height is possible. Available from 10 Dec 2025. Polygon -67.5..67.5 deg. Licence field says no conditions. Resolution and format not stated.
- MTG optimal cloud analysis (`0684`): an optimal-estimation retrieval of phase, height and microphysics from visible, near-IR and thermal IR channels; 2 km at nadir, every 10 min, netCDF; from 27 Jan 2025.
- MTG cloud type (`0680`): classifies cloudy pixels as low, medium or high, and as opaque, fractional or semi-transparent, with water or ice phase. From 10 Dec 2025.
- MSG top height (https://data.eumetsat.int/elastic-csw/download/EO:EUM:DAT:MSG:CTH): 96 products a day, from 21 Jun 2005, polygon -67.5..67.5, same abstract as the WMS layer. The matching MSG cloud mask record lists GeoTIFF (1.9 MB average) and GRIB2 (0.6 MB average) and points to the WMS latest image at `https://view.eumetsat.int/geoserver/ows`.
- Licence: the metadata field says no conditions, while the Data Policy puts derived products in Core under CC-BY-4.0 with attribution (section 2.1). Follow the stricter reading and give the attribution.

**Usage limits.** No quota or rate limit found in anything I could read. A search query is capped at 10,000 records.

---

### 2.3 NASA GIBS (Global Imagery Browse Services)

**Service.** Tiles through WMTS, WMS and TWMS at `https://gibs.earthdata.nasa.gov`, in EPSG:4326, 3857 and the two polar projections; sub-daily times use ISO 8601 (https://nasa-gibs.github.io/gibs-api-docs/access-basics/). The pages I read do not mention CORS, keys, usage limits or geostationary layers. The landing page requests an acknowledgement that the imagery came from GIBS, part of NASA's ESDIS (https://nasa-gibs.github.io/gibs-api-docs/). NASA's data policy commits to full and open sharing with no exclusive-access period (https://www.earthdata.nasa.gov/engage/open-data-services-software/data-information-policy).

**Geostationary layers: they do not cover Israel.**
- NASA's article of 4 Nov 2020 says GOES-East, GOES-West and Himawari track events over most of the globe and that Europe, Africa and the poles are not covered (https://www.earthdata.nasa.gov/fr/news/feature-articles/now-available-nasa-worldview-earth-every-10-minutes). Products per satellite: red visible, clean infrared (cloud top temperature and precipitation clues) and air mass RGB.
- The Worldview page says geostationary layers come in ten-minute steps for the last 90 days (https://www.earthdata.nasa.gov/data/tools/worldview).
- Latency is about 40 minutes after capture (https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/data-latency).
- Layer lists from NASA's Worldview repository (GitHub API directory listings): `goes` has Band 13 clean IR, air mass, dust, fire temperature, GeoColor and red visible for East and West; `himawari` has air mass, Band 13 and Band 3 visible. No Meteosat layer is served by GIBS itself.
- Worldview also lists EUMETSAT layers, but as direct WMS from EUMETSAT: `EUMETSAT_MTG_0Deg_IR105_10min` (`mtg_fd:ir105_hrfi`), `EUMETSAT_MSG_IDOC_IR108_10min` (`msg_iodc:ir108`), `EUMETSAT_RING_IR108` (`mumi:worldcloudmap_ir108`, 3 hour) and others (https://api.github.com/repos/nasa-gibs/worldview/contents/config/default/common/config/wv.json/layers/eumetsat). These are not GIBS tiles.

**Polar cloud layers (cover Israel, sparse in time).** Worldview's layer files list, for Terra and Aqua: cloud top height, pressure, temperature and fraction (day and night versions), and for Terra also optical thickness, phase, water path and a multi-layer flag (https://api.github.com/repos/nasa-gibs/worldview/contents/config/default/common/config/wv.json/layers/modis/terra and `.../aqua`). NASA's description of Cloud Top Height (Day): the geopotential height of the highest cloud top, rounded to 50 m; algorithm resolution 5 km, imagery 2 km, temporal resolution daily; sources MOD06_L2 and MYD06_L2, near-real-time and standard (https://raw.githubusercontent.com/nasa-gibs/worldview/main/config/default/common/config/metadata/layers/modis/terra/MODIS_Terra_Cloud_Top_Height_Day.md). NASA defines near-real-time latency as 1 to 3 hours (data-latency page above). GIBS "best" layers prefer the standard product over the near-real-time one (https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/).

---

### 2.4 NOAA (GOES)

- **Position.** A search excerpt of the nowCOAST service page (https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/sat_meteo_imagery_time/MapServer, which itself returned 403) puts GOES-East at 75 deg W and GOES-West at 135 deg W. On the AWS registry, GOES-19 became operational GOES-East on 4 Apr 2025 and GOES-18 is GOES-West (https://registry.opendata.aws/noaa-goes/). Neither sees Israel (my derivation: about 110 deg of longitude from GOES-East).
- **nowCOAST WMS** (https://nowcoast.noaa.gov/geoserver/satellite/wms?request=getcapabilities&service=wms): fees and access constraints both "NONE". Layers such as `goes_longwave_imagery` (box lon -179.5..-50.7, lat 10.9..50.6, 86 five-minute steps listed) and global mosaics such as `global_longwave_imagery_mosaic` (lat about -72.7..72.7, six timestamps listed up to 00:00Z). The mosaic cadence is unclear: six timestamps over five hours in the capabilities, every 3 h in the service text. Not confirmed.
- **Real cloud top height.** GOES-R ABI Level 2 Cloud Top Height (ACHA) is an image whose pixels hold the geopotential height of the top of a cloud layer, in metres, day and night; 2 km since 24 Mar 2023; a 10-minute interval; valid to local zenith angles of 70 deg (NCEI record: https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc%3AC01505). It sits in the open AWS buckets `noaa-goes16/18/19` (`ABI-L2-ACHAF` is the full-disc folder) with no AWS account needed. NOAA says data on those buckets are open for any use and asks for attribution on unaltered data (https://registry.opendata.aws/noaa-goes/). A search excerpt words the frequency as 60 minutes; the 10-minute figure is the one in the NCEI record I read. Not reconciled.
- **Browser access.** AWS objects are netCDF files, so a server would decode them. CORS for nowCOAST and the AWS buckets is not confirmed.

---

### 2.5 JMA Himawari

- JMA's Himawari-8/9 imager scans the full disc every 10 minutes; bands 5-16, including band 13 at 10.4 um, have 2 km resolution at the sub-satellite point (https://www.data.jma.go.jp/mscweb/en/himawari89/space_segment/spsg_ahi.html).
- The satellites sit near 140.7 deg E (search excerpt of the JMA MSC site; the exact page was not re-read). Israel at about 35 deg E is outside the visible disc (my derivation). NASA also lists Europe and Africa as not covered by Himawari (section 2.3).
- HimawariCloud carries full-disc data every 10 minutes but is open only to national meteorological and hydrological services (https://www.data.jma.go.jp/mscweb/en/himawari89/cloud_service/cloud_service.html). No public tile API was found on JMA's MSC pages, which only link a real-time image page (https://www.data.jma.go.jp/mscweb/en/index.html). Himawari-9 level 1b full-disc data is on AWS under NOAA Open Data (`noaa-himawari9`, no sign-in; https://registry.opendata.aws/noaa-himawari/, search excerpt).
- Licence: JMA website content falls under the Public Data License 1.0, compatible with CC BY 4.0; cite JMA as the source and mark edited content as edited (https://www.jma.go.jp/jma/en/copyright.html).
- A public cloud top height product for Himawari: not confirmed.

---

### 2.6 RainViewer

- **Satellite infrared is gone.** The API transition page lists, for 1 January 2026: future radar data (nowcast) discontinued, satellite IR data discontinued, all colour schemes except Universal Blue discontinued, maximum zoom 7, rate limit 100 requests per IP per minute (https://www.rainviewer.com/api/transition-faq.html). Remaining: the Weather Maps API (past radar, 2 hours, 10-minute steps), single radar data and data sources.
- **Observed.** `https://api.rainviewer.com/public/weather-maps.json` returned version 2.0, `generated` 1791075024 (2026-10-04 00:50:24Z), host `https://tilecache.rainviewer.com`, newest radar frame 1791075000 (00:50:00Z), an empty `nowcast` array and `"satellite":{"infrared":[]}`.
- **Terms** (they matter for the radar the app already uses): free for personal or educational use only, a link to RainViewer as the source is requested, and availability is not guaranteed (https://www.rainviewer.com/api.html). The Weather Maps API page gives tile size 256 or 512 and maximum zoom 7 (https://www.rainviewer.com/api/weather-maps-api.html).

---

### 2.7 Others found

- **DWD (German weather service) WMS** (https://maps.dwd.de/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities): `Satellite_worldmosaic_3km_world_ir108_3h` (world IR 10.8 um, 3 h steps) and `Satellite_meteosat_1km_euat_rgb_day_hrv_and_night_ir108_3h` (Europe, 3 h steps). Fees none; access constraints point to https://www.dwd.de/copyright. Three-hour steps make it unfit for placing clouds now.
- **SSEC RealEarth** (University of Wisconsin): tile API `/api/image?products=[ID]&x=&y=&z=` (https://realearth.ssec.wisc.edu/doc/api.php). Free use is limited to 500 megapixels per rolling 24 h and 512x512 px composites before a watermark; 1000 megapixels when registered (https://ssec.wisc.edu/realearth/realearth-pro). Its own documentation calls the service a repository of user-generated products with no ownership or availability guarantee (https://realearth.ssec.wisc.edu/doc/dataaccess.php). My searches for cloud-top-height and Meteosat products returned only GOES products. Not a fit.
- **Israel Meteorological Service**: the station-data API needs a token requested by email (https://ims.gov.il/sites/default/files/2023-01/API_Explanation_en.pdf, search excerpt). No satellite tile service or API with documented terms was found.
- **LSA SAF map service** (EUMETSAT) is WMS but covers land surface temperature and fire, not clouds (https://lsa-saf.eumetsat.int/en/data/map-service/); CC BY 4.0.

---

## 3. Recommendation

### 3.1 What to use

**First choice: EUMETSAT Data Store derived cloud products, fetched by a small server.**

- For Israel and the Eastern Mediterranean use the MTG imager products over the 0 deg disc: cloud top temperature and height (`EO:EUM:DAT:0681`), cloud mask (`0678` netCDF or `0800` GRIB2) and optionally cloud type (`0680`). They come every 10 minutes and were published about 10 minutes after the end of the scan (observed). They give a real per-pixel height, not a picture.
- Add the Indian Ocean Meteosat-9 top height and mask (`CTH-IODC`, `CLM-IODC`, 15 min, observed about 14 min after nominal time) as a cross-check over Israel. Its viewing angle is better (my derivation: satellite zenith angle about 39 deg from 45.5 E against about 53 deg from 0 deg, so a thinner pixel and a smaller parallax shift).
- Licence is the cleanest of all: Core data, CC-BY-4.0, with an attribution line naming EUMETSAT, the Meteosat product and the year (Data Policy, Articles 4-6).
- The server does what the browser cannot: token handling, one small zip every 10 minutes, decode, regrid, and serving a small height grid or PNG tiles. The browser then talks only to the app's own server, so EUMETSAT's CORS settings do not matter.
- Cost: a free EUMETSAT account and API key (not created here), plus a decoder for the MTG netCDF/GRIB2 files.

**Second choice, zero server, for a quick prototype: EUMETView WMS GetMap.**

- `msg_iodc:cth` and `msg_fes:cth` for height (colour coded), `clm` for the mask, `mtg_fd:ir105_hrfi` for a 1 km IR picture; use Cesium's WMS imagery provider with a `time` parameter.
- Needs a test that the server sends CORS headers (not confirmed) and a legend decode for the height colours (not confirmed).
- Coarse: the MSG top height layer is a 3x3 superpixel with 300 m steps (search excerpt), so expect cells of roughly 10 km at nadir and larger over Israel.
- Licence caution for the IR imagery layer, see section 2.1.

**Worldwide** (second priority, after Israel):
- Meteosat covers Europe, Africa, the Middle East and, through the Indian Ocean satellite, lon -35.5..118.5 deg (EUMETView capabilities).
- GOES-East and GOES-West cover the Americas with real cloud top height (ACHA, 2 km, 10 min) from the open AWS buckets, decoded by the same server.
- Asia and the Pacific (Himawari): no public cloud-top-height product was confirmed. Level 1b imagery is on AWS, so the brightness-temperature method below would be needed there.
- A 3-hourly global IR composite (`mumi:worldcloudmap_ir108`, or DWD's world mosaic) exists as a coarse fallback only.

**Not recommended:** NASA GIBS geostationary layers (do not cover Israel), RainViewer satellite (discontinued), SSEC RealEarth (volume limits, unclear terms), DWD and the ring composites (3 h steps).

**Useful extra:** NASA GIBS MODIS cloud top height and cloud fraction layers cover Israel (2 km imagery, daily, 1-3 h latency). They suit a once-a-day sanity check against the Meteosat result, not a live view.

### 3.2 How a cloud's position and top height would be derived

**From the Data Store products (top height and temperature, cloud mask).**
- Position: each pixel has a fixed-grid satellite position, converted to latitude and longitude with the product's own geolocation (the grid and geolocation fields were not inspected, see section 5).
- Top height: read the geometric height (metres) for cloudy pixels; the product also carries top temperature and pressure. Mask with the cloud mask; fractional clouds carry no height by design (collection abstract).
- Parallax: a high cloud seen from a geostationary satellite appears displaced away from the sub-satellite point. My derivation, flat-Earth estimate: the shift is about height x tan(satellite zenith angle). For a 10 km top over Israel that is about 13 km seen from 0 deg and about 8 km seen from 45.5 E. Whether EUMETSAT's level 2 geolocation already corrects for it is not confirmed; if not, the app should correct it, because it already has the height.

**From an infrared image (for example `mtg_fd:ir105_hrfi`, or Himawari or GOES level 1b).**
1. Get the brightness temperature (BT) of the 10.5 or 10.8 um window channel. A calibrated level 1 file gives it directly. A WMS grey picture needs the grey-to-temperature mapping, which EUMETSAT states only for IR3.9 (200-300 K night, 250-330 K day); for IR10.8 and IR10.5 it is not confirmed.
2. Decide which pixels are cloudy: use the cloud mask product, or compare BT with a clear-sky value.
3. For thick, opaque cloud, BT is about the cloud top temperature. Convert temperature to height with the air temperature profile: the height where the profile equals the BT. This needs a profile from a weather model. EUMETSAT's own top height uses external meteorological data and RTTOV (section 2.1). The app already fetches Open-Meteo, which could supply pressure-level temperatures and heights (my suggestion). A crude fallback is the standard-atmosphere cooling of about 6.5 K per km (general knowledge, no primary source fetched).
4. Thin cirrus and fractional cloud let warm surface radiation through, so BT reads too warm and the height too low. EUMETSAT leaves fractional cloud out for this reason (MTG top height abstract) and applies a semi-transparency correction in its own MSG products (search excerpt only). A plain BT-to-height lookup has no such correction.
5. Low cloud under a temperature inversion is ambiguous with a single temperature lookup (general knowledge; no primary source fetched).
6. Correct position for parallax with the height just derived.

### 3.3 What cannot be had

- **Cloud base.** None of the products read carries a cloud base. The MTG top height, cloud analysis and cloud type descriptions cover top temperature, top height and pressure, phase, optical properties and a low/medium/high class; the MSG product is the height of the highest cloud.
- **Layers under the top.** Passive imagery sees the top surface only. The nearest hints are the cloud type class (low, medium, high; opaque, fractional, semi-transparent) and a MODIS multi-layer flag layer in GIBS (named in the layer list in section 2.3; its description was not read).
- **Thickness, and clear gaps beneath cirrus.** Not provided.
- **Practical consequence:** the app's airport reports (cover and base) and the forecast model can supply base height; the satellite supplies where the tops are and how high. That is a design suggestion, not something the sources state.

---

## 4. A small first test, when work on this starts

1. One anonymous request to the Data Store search (no key) to list the newest MTG top-height product, as done here. Then, with a free key, download one product and inspect its fields: resolution, geolocation, whether one file covers the whole disc, units, the height field and its fill values. This settles several "not confirmed" items.
2. One browser `fetch` from a page on another origin to `https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetCapabilities` and to a GetMap request, to see whether the response carries `Access-Control-Allow-Origin`.
3. One GetMap of `msg_iodc:cth` for a box round Israel and one GetLegendGraphic, to see how colours map to heights.

---

## 5. Not confirmed

CORS and limits
- CORS headers of `view.eumetsat.int`, `api.eumetsat.int`, `gibs.earthdata.nasa.gov`, `nowcoast.noaa.gov` and the AWS GOES buckets: no primary document I could read states them.
- Any request quota for EUMETView WMS, or for Data Store downloads and the account (the EUMDAC guide is JavaScript-rendered; only a search excerpt was available). MaxWidth, MaxHeight and LayerLimit are not declared in the WMS capabilities.
- Rate limits and key requirements for GIBS (the docs I read are silent).

EUMETView content
- How the colours of `msg_fes:cth` and `msg_iodc:cth` map to heights (the style has no colour map), and how grey levels of `ir108` and `ir105_hrfi` map to brightness temperature.
- Whether the WMS tile cache lists `cth`, `clm` or `ir` layers (the 7.7 MB cache capabilities was only partly summarised).
- The exact resolution of the MSG mask and top height WMS layers, and the 3x3 superpixel and 300 m steps (the PDF's own page was not reached; search excerpt only, supported by the 1237-pixel image width).
- Whether the WMS lag is stable. I have one observation of about 20 min.

Licence
- Whether a rendered WMS image of an infrared level 1 band less than 1 hour old falls under "Recommended" (restricted) or "advanced image products" (Core) in the EUMETSAT Data Policy. The www.eumetsat.int terms-of-use page returned HTTP 403, so it was not read.
- The Data Store collection metadata says no conditions while the Data Policy says CC-BY-4.0 with attribution; I followed the attribution requirement.

Data Store products
- Resolution, file format and content of the MTG top height, cloud mask and cloud type files (only the cloud analysis collection states 2 km nadir and netCDF), why the top height product is only about 83 KB, and whether parallax is already corrected.
- Which MSG unit sits at 0 deg beyond the API platform tags (MSG3 for the 0 deg products, MSG2 for Indian Ocean, MSG4 for rapid scan), and how long the 0 deg MSG service will run beside the MTG imager (a search excerpt of a www.eumetsat.int page speaks of at least 18 months of parallel operation; that page returned 403).
- Accuracy figures of EUMETSAT cloud top height products (none read).

Other sources
- GIBS: which layer holds which time range, the exact latency of the MODIS cloud layers, and the colour map used to decode cloud top height pixels.
- NOAA: the cadence of the nowCOAST global mosaic, and the update interval of ACHA (10 minutes in the NCEI record read; 60 minutes in a search excerpt).
- JMA: a public tile or cloud-height service for Himawari; the exact JMA page giving 140.7 deg E.
- SSEC RealEarth: terms, CORS and cloud-height products.
- Israel Meteorological Service: any documented satellite tile or API service.
- All numbers marked "my derivation" (viewing angles 53 and 39 deg, parallax 13 and 8 km) are my own estimates and have no citation.
