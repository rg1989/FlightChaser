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
- **With a EUMETSAT key** (`EUMETSAT_KEY` and `EUMETSAT_SECRET` in `.env.local`: the README's Keys section) the server fetches the
  satellite's two products as numbers from EUMETSAT's Data Store, and the page takes the frame from the server. What changes: the
  cloud stands on the satellite's own pixels (the keyless pictures are the same products laid again on a lattice of 1/24° of
  latitude and longitude: they stand about 2 km south-east of the pixels, and the edge of a block of one height up to 7 km off);
  no number is read back from a picture's colour; and the newest frame is in use 14 to 16 minutes after its time, where the
  pictures' is in use 16 to 31 minutes after (the Data Store has a frame 14 minutes after its time, the pictures 16 to 26, and
  the page asks its own server every minute, the pictures' service every 5). What does not change: the heights are the same steps
  of 320 m, the highest 15,040 m, because the product itself holds no finer ones; they are the cloud top's pressure read as a
  height in the standard atmosphere; and everything listed as estimated below stays estimated. The weather line reads the same
  by either route. Without the key, or when EUMETSAT's Data Store fails, the page uses the keyless pictures as before.
- **What is real and what is estimated.** Real: where cloud is, to the satellite's pixel (3 to 5 km), and the height of the top layer
  (in steps of 320 m, in blocks of 9 to 15 km); where it rains (the radar); each airport's cloud amounts and bases. Estimated: a cloud's
  base away from an airport (the forecast's cloudy levels, else a thickness by the top's height); every layer under the top one away
  from an airport (the satellite cannot see it); the top where the satellite gives none (thin or broken cloud takes its neighbours'
  top); small cumulus (FEW and SCT below 2 km, which a satellite pixel cannot place: they stand round their airport by rule); a
  shower's top where the satellite's is lower; and the fine shape of every cloud, which is noise. The picture is also 15 to 35
  minutes old. In two skies checked, 9 to 12 % of a cloud field's cells changed between cloud and clear in 15 minutes and 14 to 18 %
  in 30 minutes, mostly by cloud that formed or thinned out, which the move by the wind does not follow.
- **The Weather menu** (a square of its own under Layers, there while the chase's weather is drawn; it opens when you turn Weather on in
  a live chase, not at load). **Clouds:** natural, severity colours (cloud white, light rain blue, heavy rain amber, thunderstorm red) or
  blocks. **Hazard areas:** their edges as a curtain or a fence (each with the area's striped footprint on the ground) or a box.
  **Looking ahead:** three switches, the track line (the next six minutes on this heading, a label at each minute, coloured where it
  enters weather), the level slice (the weather at the aircraft's own altitude within 60 km, with rings at 10, 20 and 40 km) and the
  ahead strip (a side view of the next 80 km: the weather's cells, the hazard areas, the aircraft's way; not in a window under 480 px
  high). A choice applies at once and is kept in this browser; `?wxlook=natural|severity|blocks`, `?wxhaz=curtain|fence|box` and
  `?wxtrack`, `?wxslice`, `?wxstrip` (`=0` or `=1`) set them for one load, and are not kept.
- The clouds are drawn at one of nine tiers, 0 the finest (half the view's size, 128 steps a ray) and 8 the cheapest (a sixth of
  the view's size, 32 steps). The app starts at tier 7, a cheap one, and goes finer only when the graphics card's own time for the
  cloud pass proves the room (a budget of 4 ms a frame; the browser must have the timer for it: Chrome, Edge and Firefox on a
  desktop do, Safari does not, and there the clouds stay at tier 7). A pass over its budget goes coarser, whatever the frame rate:
  on a laptop the card's time is heat. A tier gives up, one thing more at each, what is seen least: a part of its steps, the finest
  detail of a cloud's edge, the clouds' shadows on the ground, its size (0.35, then 0.25 of the view), the second light sample, and
  then steps and size again.
  The sky round the aircraft is worked out off the
  main thread and ahead of the aircraft on its track, so the view does not stop for it. Should the graphics card refuse the cloud
  pass, the view goes on without it: a toast says "3-D clouds stopped after a drawing error", the Weather menu goes, and the hazard
  areas stay marked on the ground. Check aids: `?wxdemo=1` (a made-up sky, no weather asked for; `?wxdemo=60` starts in its rain,
  `?wxdemo=98` at its storm), `?wxtier=0`…`8` (the clouds held at one tier, 0 the finest), `?wxbreak=1` (the cloud pass fails on purpose),
  `?wxsat=0` (no satellite for this load: the sky as the reports, the radar and the forecast alone make it), `?wxsat=pictures` (the
  satellite's keyless pictures alone, also on a server that has the key: to compare the two routes). In the console
  `weather3d.satellite` says which frame is held, and `raw: true` when it came as numbers from the server.
