# Scenario SDK: build a scenario package

This document is the procedure for an AI agent, or a person, who adds a scenario to Flight Chaser. Do each step in
order. Do not skip a check.

A scenario is one recorded flight that the app plays on a timeline. You add the story: marks on the timeline, messages
on the screen, captions of the radio, an ending.

Two documents work together:

- This document says what to do, in which order, and how to know that it is correct.
- [scenarios.md](scenarios.md) is the reference for each file and each column. Part 3 there has the rules for
  accident scenarios. Read it in full before you write a file.

## 1. The contract

These rules have no exceptions.

1. **A scenario is one folder:** `public/scenarios/<id>/`. Everything that the scenario needs to play is in that
   folder.
2. **Add a scenario without a change to any other file.** No list, no registry, no code. The app finds each folder
   that holds a `scenario.json`.
3. **A scenario is portable.** Copy the folder into another Flight Chaser and it plays there. Do not name a file
   outside the folder. Do not name an absolute path.
4. **The package uses only what each Flight Chaser has:** the loader (format 1) and the aircraft models in
   `public/models/` (one folder each). Do not add a model, a livery design or app code for one scenario.
5. **Every fact has a source.** Each row names a source id from `scenario.json`. Do not invent a time, a quote or a
   number.
6. **Do not invent speech.** Captions are words that somebody said, from a record or a real recording. Write your own
   narration as `story` messages.
7. **Do not change by hand what a tool wrote.** The exceptions are the fields of `scenario.json` that sections 6 and 8
   name, and the rows that you add to `events.csv`. Never change `track.csv` by hand.
8. **Do not weaken a check.** Do not change `client/scenario/physics.ts`, the tests or their limits to make a package
   pass.
9. **The work is not done until section 9 passes.**

## 2. What a scenario shows

The viewer gets all of this from the package and the app. None of it needs a key or an account.

| Part | Where it comes from |
|---|---|
| The aircraft in 3-D over real terrain, with gear, lights and its airline's colours | `track.csv`, `aircraft` in `scenario.json` |
| Sun, moon, stars and city lights for the real date and time of the flight | `date`, `utcOffset` and the clock. You send no lighting data |
| The flight instruments round the aircraft (altitude, speeds, attitude, wind) | `track.csv` |
| A timeline with play, pause, drag, and speeds from 1× to 16× | `start`, `end` |
| Chapters on the play bar | `phase` events |
| Ticks on the timeline, a title on the screen when the flight passes one, dots on the map route | `mark` events |
| Story messages: a text card at the top left that fades in and out | `story` events |
| Captions with speaker and addressee, for example "Captain → Tower · radio" | `transcript.csv` |
| Gear, flaps and damage changes | `gear`, `flaps`, `damage` events |
| A real voice recording in time with the captions | `audio` in `scenario.json` |
| A fade to dark and a closing card | `ending` in `scenario.json` |
| The top-down map: the whole route in altitude colours (press `V`) | `track.csv` |
| Runways as they were on the day | `airport.json` |

The Layers panel works in a scenario: map or satellite (`M`), roads (`R`), borders and places (`P`), 3-D terrain (`T`),
sun and moon light (`L`). The app draws no weather and no other traffic in a scenario.

## 3. Choose the path

| The user wants | Do this |
|---|---|
| To replay a flight from a tracking file, with no story | Do not build a package. In the app, open Scenarios → **Import a file**. The file itself is the thing to share. |
| A flight with a story: marks, messages, captions, an ending | Build a package with the starter (sections 4 to 9). This is the standard path. |
| A violent upset, or a flight known only from a recorder chart or a report | The starter cannot do this. Build the track with your own builder (section 11). |

The standard path in short:

1. Get a flight file (5.1).
2. Run `node tools/scenarios/new.ts <flight file> <id> --model <model id>` (5.3).
3. Check the track in the tests and in the app (5.4).
4. Write the words (6), the story (7) and the optional parts (8).
5. Do the final check (9).
6. Share the folder as one zip file (13).

## 4. Before you start

1. Make sure that Node is version 24.2 or newer: `node --version`.
2. If the folder `node_modules` is missing, run `npm ci`.
3. Get these facts from the user. Ask one time, at the start, for those that you cannot find:
   - The flight: flight number or callsign, date, and the aircraft registration if known.
   - The story: what happened, and which moments matter.
   - The flight file, or permission to get one (step 5.1).
4. Choose the `<id>`: 1 to 64 letters, digits, `_` or `-`. It starts with a letter or a digit. Use lower case. Example:
   `ely315-2026-09-30`. The id is the folder name, the `id` in `scenario.json`, and the name in the link.
5. If `public/scenarios/<id>/` exists, choose another id. Do not write into another scenario's folder.

## 5. Build the package

### 5.1 Get the flight file

The starter reads these formats: KML, GPX, a Flightradar24 CSV, an ADS-B trace (readsb or tar1090 JSON), an OpenSky
track, and a Flight Chaser recording (`.jsonl`).

Sources, best first:

1. **A Flight Chaser recording.** The user records the flight with the Record button on the flight card. The recording's
   details have **Download**. This is the densest source.
2. **An adsb.lol trace.** You need the aircraft's 24-bit address as 6 lower-case hex digits (`<hex>`). `<xx>` is the
   last 2 digits of `<hex>`.
   - Today: `https://adsb.lol/data/traces/<xx>/trace_full_<hex>.json`
   - A past day: `https://adsb.lol/globe_history/YYYY/MM/DD/traces/<xx>/trace_full_<hex>.json`
   - The data is under the ODbL. A package made from it can be shared, with the credit in its source note.
   - Get one file. Do not poll.
3. **A file that the user exports** from another tracking service.

Rules:

- Keep the file outside the package and outside git: `.work/<id>/` is git-ignored.
- If the terms of a service do not permit you to pass its data on, the package is for the user alone. Tell the user.
  Write the terms in the source note.
- Do not scrape a service against its terms. Ask the user for an export.
- Ask the user before you download audio, or a file larger than 50 MB.

### 5.2 Choose the model

1. Run `node tools/scenarios/new.ts` with no arguments. It prints the model ids.
2. Use the model of the aircraft type. Example: a Boeing 737-800 is `b738`.
3. If the type has no model, use the nearest shape. The table in [liveries.md](liveries.md), section 2.1, lists the
   stand-in for each type.

### 5.3 Run the starter

```bash
node tools/scenarios/new.ts <flight file> <id> --model <model id>
```

- If the file holds more than one flight, the command lists them with their numbers and stops. Run it again with
  `--flight <n>`.
- The command writes `public/scenarios/<id>/` with `scenario.json`, `track.csv` and `events.csv`.
- The path and the attitude come from the same estimator that flies a live aircraft, with one row each second.
- All times are UTC. Do not change `date`, `utcOffset`, `clockLabel` or a time in `track.csv`.

Read the last lines of the output:

| Output | Meaning | Do this |
|---|---|---|
| `Next: docs/scenario-sdk.md, section 5.4.` and exit code 0 | The track passes the physics check. | Go to 5.4. |
| `The file gives no airspeed …` | The physics check has no airspeed to judge with. A pass proves nothing. | Go to 5.4. Do check 5 of section 5.4 with more care. |
| `The track does not fly like an aircraft …` and exit code 1 | The track breaks a physical limit. The package is written but is not ready. | Go to section 10. |
| `Not a flight file this app reads …` | The format is not one of the six. | Get the file in a format from 5.1. |

### 5.4 Check the track before you write a word

Find a bad track now. Later, a new track makes you do the story again.

1. Run the two package tests:
   ```bash
   node --test client/scenario/format.test.ts client/scenario/physics.test.ts
   ```
   At this point 1 failure is correct: `<id>: scenario.json still holds a TODO`. Any other failure is a defect.
2. Start the app: `make`. Open `http://localhost:5173/?scenario=<id>`.
3. Open the Scenarios panel. Your scenario is in the list. If it is not, see section 12.
4. Press Play. Set the speed to 8×. Watch the whole flight one time.
5. Look for these defects. Each one means that the track is bad (section 10):
   - The aircraft jumps, stops in the air, or flies backward.
   - The aircraft climbs or dives while the nose points the other way.
   - A turn has no bank, or the bank flips from side to side.
   - The aircraft is far above or under the runway at take-off or landing.
   - The route on the map (`V`) has a spike or a straight line across a turn.
6. Near the ground the starter's altitude can be up to 300 ft wrong. The app keeps the aircraft above the terrain. If
   the take-off or the landing is the subject of the scenario, use section 11.

## 6. Write the words in scenario.json

Replace each `TODO`. The package test fails while one is left.

| Field | Write |
|---|---|
| `title` | The flight as people call it: "El Al Flight 315". |
| `subtitle` | The route: "Tel Aviv → London Heathrow". |
| `note` | 1 or 2 sentences for the card: what this flight is, and that the attitude is computed from the path. |
| `summary` | 2 to 4 short lines: route, aircraft, what happened, where. |
| `crew` | Only if a public record names them: `[{ "role", "name", "detail" }]`. Else `[]`. |
| `aircraft.type` | The full type name: "Boeing 737-8HX". |
| `aircraft.callsign` | The radio callsign with the airline's ICAO code: `ELY315`. The app paints that airline's livery from it. |
| `aircraft.operator` | The airline's name. |
| `aircraft.registration` | The registration, if known. |
| `sources[0].url`, `sources[0].note` | Where the flight file comes from, who published it, and its terms. Keep the sentences on `q=A`, `q=R` and the computed attitude. |

Rules:

- Add one entry to `sources` for each other document that you cite. Each has an `id`, a `title`, a `url` and a `note`.
- To play only a part of the flight, change `start` and `end`. Both must lie between the first and the last row of
  `track.csv`. Use whole seconds: `HH:MM:SS`.
- Write plain facts. No adjectives that dramatise. No guesses.
- Do not add a field that [scenarios.md](scenarios.md) section 1.3 does not list.

## 7. Add the story to events.csv

The starter wrote the header and the marks `Take-off` and `Landing`. Add your rows. Keep the rows in time order.

```csv
time,type,value,label,src
17:04:41,phase,,Taxi and take-off,TRACK
17:05:10,story,14,"El Al 315 leaves Tel Aviv for London with 164 people aboard.",NEWS
17:11:53.557,mark,,Take-off,TRACK
17:12:00,phase,,Climb,TRACK
17:31:20,mark,,Engine 2 fails,REPORT:p.12
17:31:25,story,16,"The right engine fails at 34,000 ft. The crew turn back.",REPORT:p.12
```

This example needs two more entries in `sources`, with the ids `NEWS` and `REPORT`.

To open the app at one moment, add `&t=<seconds since midnight>` to the link. Example: 17:31:20 is
`/?scenario=<id>&t=63080`.

| `type` | `value` | `label` | What the viewer sees |
|---|---|---|---|
| `phase` | empty | A chapter name, 1 to 4 words | The play bar shows it from this time on. |
| `mark` | empty | A key moment, 1 to 5 words | A tick on the timeline. A title on the screen when the flight passes it. A dot on the map route. A click jumps there. |
| `story` | Seconds on screen. Empty means 12 | 1 or 2 plain sentences | A text card at the top left. |
| `gear` | `1` down, `0` up | For example "Gear up" | The gear on the model, and GEAR DN on the instruments. |
| `flaps` | The flap setting as a number | For example "Flaps 5" | FLAPS n on the instruments. `0` removes it. |
| `damage` | `fin` or `rudder:<from>-<to>` | What was lost | The part is gone from the model. Only on `b744`, `b738` and `b38m`. |

Rules:

1. Each `time` is between `start` and `end`.
2. Put quotes round a `label` that holds a comma. Write a quote inside it as two quotes.
3. Each `src` is a source id from `scenario.json`, with an optional page: `REPORT:p.12`.
4. Only one story message shows at a time. Start the next one after the last one ends: its time plus its seconds.
5. A story message's seconds are scenario seconds. Give 12 to 16 for 2 sentences.
6. Put a `phase` row at `start`, so that the play bar is never empty.
7. Use 5 to 20 marks. More marks make the timeline hard to read.
8. **Gear.** With no `gear` row, the app lowers and raises the gear by the height above the ground. Leave it so,
   unless a record gives the times. If you add one `gear` row, the app follows only your rows. Then add a row at
   `start` and a row for each change.
9. Where a time is your estimate, say so in the label: "Gear up (estimated)".

## 8. Optional parts

Add a part only if you have the data for it. Each part has its full rules in [scenarios.md](scenarios.md).

| Part | Add it when | Rules | The usual mistake |
|---|---|---|---|
| Captions: `transcript.csv` and `speakers` | A record or a real recording gives the words | 1.6, 1.11 | A speaker code that is not in `speakers`. A caption that nobody said. |
| `ending` | The scenario must fade out before its last second | 1.8 | `fadeFrom` later than `darkAt`. |
| Own colours: `aircraft.livery` | The airline has no livery in the app, or the aircraft had other colours | 1.3 | A logo under trademark in the package. Put it in `local/`. |
| `airport.json` | The runway of the day is missing or different in the app | 1.11a | A runway end without `thrHaeM`. Copy the method of `tools/scenarios/kc1388/airports.ts`. |
| `imagery` | The map of today misleads | 1.7 | A `rect` larger than the area that has tiles. |
| `audio` | A real recording exists and the user has it | 1.9 | A file outside `local/`. No `source`. |

For an accident or a serious incident, obey Part 3 of [scenarios.md](scenarios.md): end before the impact, name the
flight crew only, and keep the wording sober.

## 9. Final check

Do all of these. The scenario is done only when each one passes.

1. Run the package tests:
   ```bash
   node --test client/scenario/format.test.ts client/scenario/physics.test.ts
   ```
   Result: `fail 0`. The output has one line for your package: `<id>: N rows; steepest …`.
2. Run the full check: `npm run check`. Result: no type error and `fail 0`.
3. Run `git status --short`. Each changed path starts with `public/scenarios/<id>/`. If you made a builder (section
   11), its folder `tools/scenarios/<id>/` is the only other path.
4. Open `http://localhost:5173/?scenario=<id>` and watch the whole flight at 1× to 4×:
   - Each story message is on the screen long enough to read, and no message cuts another one off.
   - Each mark title shows at the correct moment.
   - The play bar shows a phase at all times.
   - Each caption shows the correct speaker.
   - The gear is down on the ground and up in cruise.
   - The light is correct for the place and the time: day, dusk or night.
5. Press `V`. The map shows the whole route with a dot for each mark.
6. Reload the page with the link in the address bar. The scenario opens paused at the same time.
7. Tell the user what is measured and what is computed. Example: "The path is the aircraft's own ADS-B positions. The
   pitch and the bank are computed from the path."

The package tests check these points for each folder: the folder name, that `track.csv` is there, each rule of the
loader, that `id` is the folder name, that `aircraft.model` is a model of the app, that each file named in
`scenario.json` is inside the folder, and that no `TODO` is left. The physics test checks that the track flies like an
aircraft.

## 10. When the physics check fails

The message gives the limit and the time. Examples:

- `the vertical speed reaches 0.97 × the true airspeed at 15:51:50 (≤ 0.9)`
- `the nose is 67° above the path at 15:51:50 (angle of attack ≤ 20°)`
- `energy changes at 113 m/s over 12 s at 07:44:48 (≤ 110)`

Find the cause in the flight file, not in the package.

| What you find in the file near that time | Cause | Do this |
|---|---|---|
| 1 or 2 points whose altitude or speed differs sharply from the points before and after | A bad reading | Copy the file. Remove those points from the copy. Remove the package folder. Run the starter on the copy. Name the removed points in the source note. |
| Points that jump sideways by hundreds of metres | Multilateration positions, or satellite navigation interference | Tell the user. Get the flight from another source, or use section 11. |
| A real dive, a steep turn or a stall | The flight itself. The starter keeps to the attitude limits of normal flight | Use section 11. |
| A gap of minutes with no points | Nobody received the aircraft | The starter flies a smooth line across the gap. If the gap hides what the story is about, get another source or use section 11. |

Never do these:

- Do not change a limit, a test or `physics.ts`.
- Do not empty the `ias_kt` column to make the check stop.
- Do not change rows of `track.csv` by hand.
- Do not hide bad rows with `start` and `end`. The check reads the whole file. To cut a flight, cut the points from a
  copy of the flight file and run the starter again.

## 11. Advanced: your own track builder

Use this path only when section 3 or section 10 sends you here. It takes much longer. Tell the user before you start.

Write one script, `tools/scenarios/<id>/reconstruct.ts`, that writes `public/scenarios/<id>/track.csv`. Put the raw
inputs in `.work/<id>/`. The package must still obey section 1.

Worked examples, each with a README:

| Example | Source data | Read |
|---|---|---|
| `tools/scenarios/fz1073/` | ADS-B with gaps, a dive, a landing built on a runway | `reconstruct.ts`, the header first |
| `tools/scenarios/kc1388/` | Multilateration positions and a chart from the report | `reconstruct.ts`, `digitize_fig13.py` |
| `tools/scenarios/jal123/` | Flight recorder charts from the accident report | `README.md` |

Use the shared code. Do not write your own smoothing or attitude code.

- `tools/scenarios/fuse.ts`: `fuseHeight` and `fuseGround` join sources of different quality. Each observation has an
  error for its value and an error for its time.
- `client/track/attitude.ts`: `aeroPitchRoll` and `AttitudeFilter` compute pitch and bank from the path. Use
  `UPSET_LIMITS` only round a real upset. Use `NORMAL_LIMITS` for the rest.
- `shared/geoid.ts`: `geoidN` gives the geoid height for altitude conversion.

Rules that earlier packages paid for:

1. **Keep each source on its own clock.** Do not move a point's time to fit a speed. That made one aircraft dive while
   it slowed down.
2. **`alt_ft` is true altitude above mean sea level.** From a GNSS height: subtract `geoidN`. From a pressure altitude:
   correct it with the QNH and the temperature of the day.
3. **`hdg` is the true heading of the nose.** It is not the track over the ground. Compute it from the ground velocity
   less the wind. From a magnetic heading: add the declination of the date.
4. **Give a row each second where the aircraft manoeuvres.** A row each 4 s is enough in straight flight.
5. **Mark a computed row `q=R`.** `q=A` is only for a value that the source gives.
6. **On the ground, set `gnd` to `1`** and give the runway's elevation. Build the runway in `airport.json`.
7. **Add `gear` rows only where a record gives the times.** With no `gear` row the gear is automatic (section 7).
8. **Run the physics test after each build.** It is the judge.

Then do sections 6 to 9.

## 12. Problems and their causes

| Symptom | Cause | Fix |
|---|---|---|
| The scenario is not in the Scenarios panel | The folder has no `scenario.json`, or the `id` in it is not the folder name | Correct the name. The browser console names the package and the reason. |
| The link opens the live map, not the scenario | The loader refused the package | Read the browser console. Each problem is one line: `file:row: column: problem`. |
| `unknown source` | A `src` cell names an id that `sources` does not have | Add the source, or correct the id. |
| `unknown speaker` | A `speaker` or `to` cell is not a key of `speakers` | Add the speaker. |
| `unknown column` | A column that the format does not have | Remove it, or start its name with `x_`. |
| `not strictly increasing` in `track.csv` | 2 rows have the same time | Build the track again. Do not edit the rows. |
| `first row … must be at or before start` | `start` or `end` is outside the track | Set them inside the first and last row. |
| The aircraft has the wrong shape | `aircraft.model` is not the type's model | Choose the model again (5.2). |
| The aircraft has no airline colours | The app has no livery for the callsign's airline | Set `aircraft.livery` with `base` and `fin` colours (scenarios.md 1.3). |
| The aircraft sits on its belly on the ground | Your `gear` rows do not include a `gear,1` row at `start` | Add it, or remove all `gear` rows. |
| A story message vanishes too soon | The next `story` row starts before it ends | Move the next row later. |
| The clock shows UTC, not local time | The starter writes UTC | Leave it. Give the local time in a story message. |
| A new package does not show in a built copy (`npm run build`) | The list is written when the app is built | Build again. |

## 13. Share and install a scenario

A package is its folder. Share it as one zip file.

```bash
cd public/scenarios && zip -r ~/<id>.zip <id> -x '<id>/local/*'
```

The zip file is then in your home folder.

- The command leaves out `local/`. That folder holds files with rights that you cannot pass on: a recording, a logo
  under trademark. The scenario plays without them, with captions only and a plain fin.
- Before you share, read the terms of each source in `scenario.json`. If a source does not permit you to pass its
  data on, do not share the package.

To install a package that somebody sent:

1. Unzip it into `public/scenarios/`: `unzip <id>.zip -d public/scenarios/`
2. Run the package tests of section 9, step 1. Do not play a package that fails.
3. Reload the app. The scenario is in the Scenarios panel. No restart is necessary with `make`.

A package holds data only: JSON, CSV, images and sound. The app runs no code from it. One thing to read before you
install a package from a stranger: `imagery` in `scenario.json` can name a map tile server, and the app gets tiles
from that address while the scenario plays.

## 14. Done

Report these to the user, in this order:

1. The link: `http://localhost:5173/?scenario=<id>`.
2. The test result: the line of the physics test for the package.
3. What is measured, what is computed, and each estimate.
4. Each source and its terms, and whether the package can be shared.
5. What is left out, and why.
