# The weather in the chase

- **Weather** (the Layers panel's switch, or `W`): in the chase the clouds, rain and storms are volumes round the aircraft, out to 150 km,
  from airport reports, the rain radar, the weather satellite and the weather model: it flies into them and fades out of sight in thick ones, and rain falls as
  a veil under a raining cloud. A line at the top centre says what is on its heading ("In light rain", "Clear air · a thunderstorm in
  3 min"; "No weather data" until a weather source has answered), a second line names a hazard area on the way, in the area's colour,
  and a red frame round the view shows the aircraft is inside one. Live only: History and scenarios draw none.
- **Where the clouds are.** Inside the view of Europe's Meteosat satellite (Europe, Africa, the Middle East: within 65° of the point
  0° N 0° E) the satellite says where cloud is and how high its top is. Its newest frame is 15 to 35 minutes old, so each cloud is
  moved by the forecast wind at its top for the frame's age, 40 km at most. It is also moved back toward the point under the
  satellite, because the satellite sees a high top out of place (13 km for a 10 km top over Israel). The Layers panel's weather line
  then says "cloud positions from Meteosat, 14:45 UTC" and carries the credit "© EUMETSAT". Outside the satellite's view, and when its
  newest frame cannot be had for 45 minutes, the clouds are placed as before: by rule, from the reports, the radar and the forecast.
- **What is real and what is estimated.** Real: where cloud is, to the satellite's pixel (3 to 5 km), and the height of the top layer
  (in steps of 320 m, in blocks of 9 to 15 km); where it rains (the radar); each airport's cloud amounts and bases. Estimated: a cloud's
  base away from an airport (the forecast's cloudy levels, else a thickness by the top's height); every layer under the top one away
  from an airport (the satellite cannot see it); the top where the satellite gives none (thin or broken cloud takes its neighbours'
  top); small cumulus (FEW and SCT below 2 km, which a satellite pixel cannot place: they stand round their airport by rule); a
  shower's top where the satellite's is lower; and the fine shape of every cloud, which is noise.
- **The Weather menu** (a square of its own under Layers, there while the chase's weather is drawn; it opens when you turn Weather on in
  a live chase, not at load). **Clouds:** natural, severity colours (cloud white, light rain blue, heavy rain amber, thunderstorm red) or
  blocks. **Hazard areas:** their edges as a curtain or a fence (each with the area's striped footprint on the ground) or a box.
  **Looking ahead:** three switches, the track line (the next six minutes on this heading, a label at each minute, coloured where it
  enters weather), the level slice (the weather at the aircraft's own altitude within 60 km, with rings at 10, 20 and 40 km) and the
  ahead strip (a side view of the next 80 km: the weather's cells, the hazard areas, the aircraft's way; not in a window under 480 px
  high). A choice applies at once and is kept in this browser; `?wxlook=natural|severity|blocks`, `?wxhaz=curtain|fence|box` and
  `?wxtrack`, `?wxslice`, `?wxstrip` (`=0` or `=1`) set them for one load, and are not kept.
- The clouds are drawn at half the view's size. When the cloud pass makes the frames slow for a while it gives up, a tier at a time,
  what is seen least: a part of its steps, the finest detail of a cloud's edge, the clouds' shadows on the ground, and then its size
  (0.35, then 0.25 of the view); when the view is cheap again it takes them back. The sky round the aircraft is worked out off the
  main thread and ahead of the aircraft on its track, so the view does not stop for it. Should the graphics card refuse the cloud
  pass, the view goes on without it: a toast says "3-D clouds stopped after a drawing error", the Weather menu goes, and the hazard
  areas stay marked on the ground. Check aids: `?wxdemo=1` (a made-up sky, no weather asked for; `?wxdemo=60` starts in its rain,
  `?wxdemo=98` at its storm), `?wxtier=0`…`5` (the clouds held at one tier, 0 the finest), `?wxbreak=1` (the cloud pass fails on purpose),
  `?wxsat=0` (no satellite for this load: the sky as the reports, the radar and the forecast alone make it; in the console
  `weather3d.satellite` says which frame is held).
