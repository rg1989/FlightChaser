# N722BD package: how it was built

Bombardier Learjet 60 N722BD (s/n 60-271, ICAO a9ab17), 1 November 2026, Austin → North Eleuthera, lost near Greenacres, Florida
(`public/scenarios/n722bd/`). No report exists yet. The package was made the day after, from public data.

Inputs (not in the repository; `.work/n722bd/sources/`):

- `adsblol_history.json`: adsb.lol's trace of the day. ODbL. `theairtraffic.json` was a cross-check only.
- `video/8ri8h7dg8nE.mp4`: VASAviation's video of the LiveATC radio, with captions and a clock. It mutes the aircraft from 17:48:38 UTC on purpose.
- `video/PsynXCIsuQM.mp4`: another copy of the recording, unmuted: the aircraft's calls after 17:48:38 UTC.
- `wx/`: NEXRAD `n0q_*.png` (IEM), GOES-East `ir_1745.tif` (IEM), `metar.json` (aviationweather.gov), `raob.json` (KMFL sounding, IEM).
- `photos/`: six JetPhotos pictures of the aircraft. Reference only. Never commit or ship them.

Run from the repository root, in this order:

```bash
python3 tools/scenarios/n722bd/weather.py .work/n722bd/sources/wx public/scenarios/n722bd
node tools/scenarios/n722bd/weather.ts .work/n722bd/sources/wx public/scenarios/n722bd
node tools/scenarios/n722bd/reconstruct.ts .work/n722bd/sources/adsblol_history.json .work/n722bd/sources/wx/wind.json
python3 tools/scenarios/n722bd/radio.py .work/n722bd/sources/video/8ri8h7dg8nE.mp4 .work/n722bd/sources/video/PsynXCIsuQM.mp4 public/scenarios/n722bd
python3 tools/scenarios/n722bd/livery.py public/scenarios/n722bd
```

`radio.py` prints the audio clips for `scenario.json`. `weather.ts` asks Open-Meteo, and falls back on the sounding when it does not answer.
The model is `tools/models/lj60.ts`.

The trace has no airspeed, so `track.csv` has none. The physics test has nothing to judge the track with, and reports 0 rows.

The final seconds exceed the check's limits for normal flight: the height falls near 950 ft/s at a ground speed of about 235 kt.

The screen is dark 0.1 s before the estimated impact (12:49:33.2 EST), as docs/scenarios.md Part 3 asks. The radio file ends nine seconds earlier.
