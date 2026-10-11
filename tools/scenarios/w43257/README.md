# W4 3257 package: how it was built

Wizz Air Flight 3257, 10 October 2026, Airbus A321 HA-LXF (ICAO 471F67, callsign WMT7403), Bucharest → Tel Aviv,
diverted to Larnaca (`public/scenarios/w43257/`). Nothing has been published about why, so this package is the
aircraft's own broadcasts and has no captions: the story messages give the data.

Inputs (not in the repository; `.work/w43257/sources/` in the main checkout):

- `adsb/adsblol_trace_full.json`: adsb.lol's tar1090 trace of the day for 471f67
  (`https://adsb.lol/data/traces/67/trace_full_471f67.json`, fetched 2026-10-10 09:40 UTC; ODbL). GPS positions
  03:11–04:43, with holes over Turkey.
- `adsb/adsbx_trace_full.json`: the same from ADS-B Exchange. Used where adsb.lol heard nothing: the take-off roll,
  the holes over Turkey, and everything after 04:43:27 (pressure altitude, airspeed, ground speed and track in three
  bursts, no GPS position until 05:21:49).
- `adsb/theairtraffic_trace_full.json`, `adsb/opensky_track.json`: cross-checks only; both end at 04:43 too.
- `iaa_board_otp.json`: Ben Gurion's flight board for Bucharest (data.gov.il), read 09:38 UTC.

Steps:

```bash
node tools/scenarios/w43257/airports.ts
node tools/scenarios/w43257/reconstruct.ts .work/w43257/sources/adsb/adsblol_trace_full.json .work/w43257/sources/adsb/adsbx_trace_full.json
node --test client/scenario/format.test.ts client/scenario/physics.test.ts
```

What is heard and what is built is in the header of `reconstruct.ts`. In short: rows `q=A` are within 5 s of a
reception with a GPS position. From 04:43:27 to 05:12:06 the path is the heard speeds and tracks flown on from the last
position, with the two unheard turns timed (05:01:23 and 05:08:50) to pass within 2 nm of two multilateration fixes.
The approach after 05:12:06 is built to reach the GPS fixes on short final at 05:21:49 and 05:21:54.
