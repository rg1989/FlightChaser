<!-- docs/liveries.md -->
# Liveries and type models: how to add an aircraft

Flight Chaser draws each aircraft on a 3-D model of its type, painted in its operator's livery. This document tells you
how to add a new type model and a new airline livery. The same steps made the first five combinations (El Al 737,
Wizz Air A321neo, Israir A320, flydubai 737 MAX 8, Royal Jordanian A320neo).

The design is in `.planning/livery-pipeline-design.md`. Read section 3 ("The method, and why") first.

## The pipeline at a glance

```
survey ──► type model ──► reference photos ──► dossier ──► design ──► lab + shots ──► compare ──► fix ──► done
(what flies) (geometry)    (refs.ts)          (research)  (designs/)  (livery-lab)     (you/agent)
```

| Step | Tool | Output |
|---|---|---|
| 1. Find what to paint | `node tools/liveries/survey.ts` | type × operator ranking, airframes (hex, registration) |
| 2. Make or pick the type model | `tools/models/variants.ts`, `tools/models/profile.ts` | the folder `public/models/<id>/` |
| 3. Get reference photos | `node tools/liveries/refs.ts` | `data/livery-refs/<CODE>/` + `refs.json` (git-ignored) |
| 4. Describe the livery | research (by hand or by agent) | `liveries/<CODE>/README.md` (the dossier) |
| 5. Draw the design | edit `liveries/<CODE>/design.ts` | the design; the app finds the folder by itself |
| 6. Look at it | `/tools/livery-lab/?model=<id>&livery=<CODE>` | the model beside the photos |
| 7. Capture sheets | `node tools/livery-shots.ts <id>:<CODE> …` | `data/livery-refs/shots/<id>-<CODE>/*.png` |
| 8. Repeat 5–7 | until the model looks like the photos | |

To do all of it with agents, run the saved workflow (Part 5).

## Part 1. Find what to paint

```bash
node tools/liveries/survey.ts --top 30
```

The survey reads the recordings in `data/recordings/` (the recorder's queries around Ben Gurion by default; use
`--near lat,lon` for another hero airport, `--near all` for every query). It ranks each type × operator by flights and
airframes, and shows which model draws the type and whether the operator has a design (`design`), only colours
(`colours`) or nothing (`none`). `--json out.json` also writes every airframe (hex, registration) per combination.

Wet-leased aircraft fly under the operator's callsign in the lessor's paint. The app paints them in the operator's
livery (one livery per airline). Choose reference photos of the operator's own aircraft.

## Part 2. The type model

A model is one folder, `public/models/<id>/`, and nothing else. `<id>` is short and in lower case, usually the ICAO type
designator (`b763`). To add a model that someone made, put its folder in `public/models/` and reload. To share one, send
the folder. There is no list to edit.

| File | What it is |
|---|---|
| `model.json` | what the app reads: the name, the licence, the author, the source, the types, the calibration, the paint map, and what the tools measure (`box`, `lights`, `outline`, `profile`) |
| `model.glb` | the mesh: one mesh, no textures, metres |
| `gear.glb` | the landing gear (a tool builds it) |
| `recipe.json` | what the tools build from: the door and cockpit stations, the gear's layout, flags; for a derived model, its base and the changes |

`public/models/defaults.json` names the model for an aircraft of unknown type and the model for each category.

### 2.1 Own models, stand-ins and placeholders

`client/scene/modelFor.ts` picks the model for an ICAO type designator from the two lists in each `model.json`:

| The designator is in | The picker's `fit` | The aircraft is drawn |
|---|---|---|
| `types` | `own` | as the model, in its operator's livery |
| `standIns` | `standIn` | as a placeholder, without a livery |
| neither (or the type is unknown) | `generic` | as a placeholder, without a livery, on the model of its category (`defaults.json`) |

- **`types`** holds the designators that the model truly is. The first one is the aircraft that the model shows. The
  others are members of its family that have no model of their own: the same fuselage section and layout, a different
  length or generation (the 737 Classic on the 737-800, the A330neo on the A330-300).
- **`standIns`** holds the designators of other aircraft that have no model: the model is only the nearest shape (the
  A340 on the 747, a Piper on the Cessna 182). If you are not sure, use `standIns`.
- `"B73*"` matches each designator that starts with `B73`. An exact designator has priority over a prefix.
- Two models can list the same designator. Then the model that lists it in `types` has priority over a stand-in, and
  after that the model that lists it earlier in its list. Thus a new package takes its types from the models that drew
  them, and you do not edit the other packages. `variants.ts` removes the designator from the other lists when it
  builds a derived model. For a model from a source file, remove it yourself when the work is merged.
- `name` is the name of the aircraft that the model shows ("Boeing 787-9"). The flight card uses it.

An aircraft that is not on its own model is drawn as a placeholder (`client/scene/placeholder.ts`): a flat pale ghost
with a dashed outline and no livery, because the paint of an airline on the shape of a different aircraft would be
false. The flight card says it in words: "Shown as a Boeing 787-9: no B763 model yet". `?ghost=2,all` draws each
aircraft as a placeholder and `?ghost=0` draws none as a placeholder.

### 2.2 A derived model (recipe)

Most new types are a model we have with a different fuselage length, wingtip or engine (A320 → A319, A320neo;
737-800 → 737-700, 737 MAX 8). Write `public/models/<id>/recipe.json` and build the package from it:

```json
{
  "base": "a320",
  "name": "Airbus A319",
  "types": ["A319", "A19N"],
  "date": "2026-10-13",
  "fuselage": { "foreM": -1.6, "aftM": -2.13 },
  "sources": ["Airbus AC A319 (2025-01) https://…: overall length 33.84 m; 3 frames less ahead of the wing, 4 behind"]
}
```

```bash
node tools/models/variants.ts <id>        # model.glb, gear.glb and model.json, all measured on the new mesh
node tools/models/variants.ts --png <dir> <id>   # and a sheet of views to look at
```

| Field | What it does |
|---|---|
| `base` | the package the model is made from |
| `fuselage` | `foreM`, `aftM`: the change of the fuselage's length ahead of the wing and behind it, metres (negative: shorter). The constant section is made longer or shorter; the nose, the wing and the tail keep their shapes. The doors and the gear follow. |
| `wingtip` | a new wingtip device: `kind` (`sharklet`, `blended`, `at-winglet`, `none`) and its sizes |
| `nacelle` | bigger or smaller engine nacelles: `scale` (across, up, along), `forwardM`, `upM` |
| `stations`, `gear` | only if the derived values are wrong: see 2.3 |
| `sources` | where each number comes from (the manufacturer's airport-planning document, with the page) |

Use the real aircraft's sizes. The existing recipes show each field (`a20n`, `a21n`, `b38m`). A derived model has the
licence of its base, and the tool writes that into `model.json` and into the GLB.

### 2.3 A new model from a source file

Use a GPL model from FlightAirMap-3dmodels, Flightradar24's fr24-3d-models or FlightGear's FGAddon, as in
`.planning/reports/aircraft-model-sources.md` (which model, where, which licence, how much work). Read the licence
file of the model yourself before you use it.

1. Keep the unchanged source file in `third_party/aircraft-models/source/<collection>/`. Convert and simplify it with
   the scripts in `third_party/aircraft-models/scripts/` (`third_party/aircraft-models/README.md` gives the commands;
   Blender: `/opt/homebrew/bin/blender -b`). The result is `public/models/<id>/model.glb`: one mesh, no textures, in
   metres, at the real aircraft's size, 1 MB at most.
2. Write `public/models/<id>/model.json`. Copy a similar package's and change: `id`, `name`, `uri`
   (`models/<id>/model.glb`), `license`, `author`, `source` (the address of the source file at a fixed commit),
   `forwardAxisFix`, `lengthM` (the real length), `scale`, `types`, and `paint` (the region map: `Paint` in
   `client/types.ts` says what each number is; measure each one on the mesh). Remove `gear`, `box`, `lights`, `outline`
   and `profile`: the tools write them.
3. Write `public/models/<id>/recipe.json`:
   - `stations`: the left doors' centre lines and the aft edge of the cockpit side windows, in metres aft of the nose,
     with the overall length of the document they come from, and its address.
   - `gear`: the gear's layout (`GearSpec` in `tools/models/gear-glb.ts`): the nose gear's distance aft of the nose, the
     wheelbase, the track, the wheels per main leg, the tyre sizes, how the mains retract. No `gear`: no gear is drawn
     (a light aircraft with fixed gear in its mesh, a helicopter).
   - `flags` if they apply: `rotor` (a helicopter), `finBeacon` (the upper beacon is on the fin tip), `noBellyBeacon`,
     `noWindows` (no cabin window row). `windowPitchM` if the cabin windows are not 0.51 m apart.
4. Let the tools measure the package, in this order:

```bash
node tools/models/gear-glb.ts --write <id>        # gear.glb, the gear entry, gearHeightM
node tools/models/light-anchors.ts --write <id>   # the lights, the window row
node tools/models/profile.ts --write <id>         # the side profile that the liveries are drawn on
node tools/models/outline.ts --write <id>         # the spheres over the mesh: what the place names keep off
node tools/models/profile.ts --png <dir> <id>     # the profile drawn on the mesh: each outline must sit on it
```

5. Run the tests (`client/scene/model.test.ts` checks the size, the wheels and the nose direction from the geometry).
6. Look at it in the lab, plain and in a livery (3.5): `…/tools/livery-lab/?model=<id>` and `?model=<id>&livery=RYR`.

### 2.4 The profile

The livery is drawn on the model's side profile (`ModelProfile` in `client/types.ts`): the fuselage outline, the fin,
the wing root, the nacelle box, the wingtip device box, the tailplane, the passenger doors and the cockpit windows, in
the paint frame (metres; +z to the nose, +y up, +x to the left wing). The profile tool measures it from the mesh.

## Part 3. The airline design

A livery is one folder, `liveries/<CODE>/`, and nothing else. `<CODE>` is the airline's ICAO code (the first three
letters of its callsigns). To add a livery that someone made, put its folder in `liveries/` and reload. To share one,
send the folder. There is no list to edit.

| File | What it is |
|---|---|
| `design.ts` | the design (its default export) |
| `README.md` | the dossier: how the livery looks, with the evidence |
| logos, fonts | the files the design draws with (SVG preferred) |
| `sources.json` | the source and the licence of each logo and font file |

A design has priority over a colours-only entry of the same code in `client/scene/liveries.json`.

### 3.1 Reference photos

```bash
node tools/liveries/refs.ts --code WZZ --hex 4d2531,4d2532,… --commons "Category:Wizz Air Airbus A321neo"
```

Take the hexes from the survey (`--json`). The tool gets each airframe's photo from planespotters.net (the app's photo
source: thumbnails, for reference only, credited) and larger free photos from a Wikimedia Commons category. They go
into `data/livery-refs/<CODE>/`, which git ignores: never commit or ship a photo. Open `refs.json` and replace each
`"view": "?"` with what the photo shows: `left side`, `right side`, `3/4 front left`, `3/4 rear right`, `tail`,
`engine`, `winglet`, `below`. The lab puts the same view of the model beside each photo.

Get at least: one clean photo of each side, a 3/4 front view, the tail, an engine and a wingtip device.

### 3.2 The dossier

Write down how the livery looks before you draw it: `liveries/<CODE>/README.md`. The existing dossiers show the
format: which aircraft wear the scheme, every colour as a hex with its evidence, every element in side elevation
(belly line, cheatlines, titles and their size and place, fin art, engines, wingtips, left/right differences), the
logos and their licences, and the fonts.

### 3.3 Logos and fonts: licences

- Logos: only public-domain or freely licensed files from Wikimedia Commons (for example `PD-textlogo`). Put them in
  `liveries/<CODE>/` (SVG preferred, with `width` and `height` set) and record each file's source and licence in
  that folder's `sources.json`: `{ "wordmark.svg": { "source": "https://commons.wikimedia.org/wiki/File:…", "licence": "PD-textlogo" } }`.
- A wordmark with no free file: typeset it in an OFL font that looks like it (Google Fonts). Put the font file and its
  licence file in `liveries/<CODE>/`, and both in `sources.json`.
- A graphic emblem with no free file: leave it out, or use plain colour shapes that are not a copy of it.
- Photos: never.

### 3.4 Write the design

A design is a TypeScript module, `liveries/<CODE>/design.ts`. Its default export is the design. It draws one side of
the aircraft at a time. The kit (`client/livery/kit.ts`) gives you the model's landmarks and
drawing calls in metres. The same design paints every model the airline flies.

```ts
import { asset } from '../../client/livery/kit.ts'
import type { Design } from '../../client/livery/kit.ts'

const BLUE = '#0b2e6b'

const ELY: Design = {
  code: 'ELY',                                          // the folder's name
  aliases: ['ELB'],                                     // other callsign codes that fly in this paint (optional)
  name: 'El Al (2023 scheme)',
  sources: ['https://commons.wikimedia.org/wiki/File:…'],
  base: '#ffffff', wing: '#c9ced6', engineColor: '#ffffff',
  side(k) {
    k.fill('#ffffff')                                   // the whole fuselage and fin
    k.below(0.28, '#d6dade')                            // belly: below 28 % of the fuselage height
    k.stripe(0.45, 0.35, BLUE, { from: k.a.cockpit, to: k.a.tail })   // a cheatline 0.35 m wide
    k.finFill(BLUE)                                     // the fin, from its measured outline
    k.text('EL AL', { z: k.a.door1 - 1.5, y: k.a.windowY + 0.45, capM: 0.9, color: BLUE, weight: 800 })
    k.image(asset('liveries/ELY/logo.svg'), { z: k.fin(0.5, 0.5)[0], y: k.fin(0.5, 0.5)[1], h: 2.2 })
  },
  engine(k) { k.fill('#ffffff') },
}

export default ELY
```

The design imports only from `client/livery/kit.ts`. It reads files only from its own folder
(`asset('liveries/<CODE>/…')`), fonts also: `fonts: [{ family: 'Montserrat', src: asset('liveries/<CODE>/Montserrat-Bold.woff2'), weight: '700' }]`.

The frame: `z` is metres along the fuselage (larger is further forward), `y` is metres up. Draw in painter's order:
later calls paint over earlier ones. Shapes may run past the aircraft (only the surface is sampled); let them overshoot
at the nose and the tail so no seam shows.

Landmarks (`k.a`): `nose`, `tail`, `length`, `cockpit` (aft edge of the cockpit windows), `door1`, `doors`,
`windowY` (the cabin window row), `wingLe`, `wingTe` (the wing root chord), `finRoot`, `finTip` (`[y, le, te]`), `box`.

Where things are:

| Call | What it gives |
|---|---|
| `k.top(z)`, `k.bottom(z)` | the fuselage crown and keel height at `z` |
| `k.at(z, f)` | the height at fraction `f` of the local fuselage height (0 keel, 1 crown) |
| `k.fin(u, h)` | a point on the fin: `u` 0 leading edge … 1 trailing edge, `h` 0 root … 1 tip |
| `k.stations(from, to, step)` | z values from `from` to `to`, for building your own curves |

Drawing. A colour is a CSS string (sRGB); where a call takes a colour it also takes a gradient in metres:
`{ linear: [z0, y0, z1, y1], stops: [[0, '#fff'], [1, '#c6007e']] }` or `{ radial: [z, y, r], stops: … }`.

| Call | Draws |
|---|---|
| `k.fill(color)` | the whole region |
| `k.band(f0, f1, color, {from, to})` | between two contour fractions (numbers or functions of `z`), from `z` `from` to `to` |
| `k.below(f, color, o)`, `k.above(f, color, o)` | everything below (belly) or above a fraction |
| `k.stripe(f, widthM, color, o)` | a stripe of constant width centred on a fraction |
| `k.poly([[z, y], …], color)` | a polygon |
| `k.path([['M', z, y], ['L', z, y], ['Q', cz, cy, z, y], ['C', …], ['Z']], color)` | a path with curves |
| `k.stroke(pathOrPoints, widthM, color)` | a line `widthM` metres wide on the aircraft (pinstripes, outlines) |
| `k.circle(z, y, r, color)` | a disc (dots, roundels) |
| `k.clip('fin' \| points \| path, () => { … })` | draws the calls inside the function only within the shape (`'fin'`: the fin's outline) |
| `k.finFill(color, {down})` | the fin, from its measured outline, reaching `down` m into the fuselage |
| `k.finPoly([[u, h], …], color)` | a polygon in fin coordinates |
| `k.text(str, {z, y, capM, color, font, weight, italic, align, tracking, mirror})` | text; `y` is the baseline, `capM` the cap height; `align` says which end sits at `z` (`fore`, `centre`, `aft`) |
| `k.image(src, {z, y, w, h, mirror, opacity})` | an image centred at `z`, `y`; give `w` or `h` (the image's aspect gives the other); `src` = `asset('liveries/<CODE>/x.svg')`, a file in the design's folder |

Text and images read correctly on both sides: on the right side the kit flips them, so a title covers the same span
of the fuselage on both sides. Set `mirror: true` for a directional logo that must face forward on both sides.

**Schemes.** An airline in the middle of a repaint flies two liveries at once (El Al's 1999 ribbons and its 2025
refresh). List the registrations per scheme in `variants: { A1: ['4X-EHA', …], B: […] }`, set `defaultVariant` for
aircraft in no list (usually the newest scheme), and branch on `k.variant` in the drawing. The app picks the scheme
from the aircraft's registration; the lab and the shots tool take `livery=ELY~A1` / `b738:ELY~A1`. Record in the
design when the lists were checked: repaints move aircraft between them.

`k.side` is `'left'` or `'right'`, for the rare design that differs per side (for example a title in another script
on the right). `k.model` is the manifest id, for a per-type tweak (`if (k.model.startsWith('b78'))`).

Markings seen only from below (a belly title, a belly panel narrower than the fuselage): `belly(k)` draws in plan
view, seen from below with the nose at the left: `z` along the fuselage as usual, `y` across it (positive towards the
left wing; `k.a.box` is `[zMin, zMax, -half, half]`). It is transparent where you draw nothing, and it is blended onto
the skin where the skin faces down. Text reads correctly for someone below the aircraft with the nose to their left.

The engines: `engine(k)` draws the nacelle's side box (`k.a.box` is `[zInletAft…]`: `[zMin, zMax, yMin, yMax]`; the
inlet is at `zMax`). The wingtip devices: `winglet(k)`, over the device's side box. Wings and the tailplane: the flat
colours `wing` and `stab`.

### 3.5 Look at it

Start the dev server (`npx vite`, or the launch config) and open:

```
/tools/livery-lab/?model=a21n&livery=WZZ
```

The lab shows each reference photo beside the same view of the model, every view (left, right, 3/4 front and rear,
below, above, tail, forward fuselage, engine, wingtip), and the atlases the design drew. Parameters: `views=refs` (only
the views the photos show), `views=left,tail`, `gear=0`, `refs=0`, `w`, `h`.

To capture the sheets without a browser (for an agent, or to compare before and after):

```bash
node tools/livery-shots.ts --views refs a21n:WZZ b738:ELY
```

### 3.6 Done when

- Every photo view matches: the colours (in the same light), the belly line, every stripe and swoosh, the title's text,
  size and place on each side, the fin art, the engines and the wingtips.
- `npm test` passes (`client/livery/designs.test.ts` draws every design on every model).
- The design names its sources, and every logo and font file in `liveries/<CODE>/` has its source and licence in `sources.json`.

## Part 4. How it works

- The design runs once per model it is drawn on, in the browser, when an aircraft of that airline and type appears
  (`client/scene/livery.ts`, `LiveryShaders`). `client/livery/raster.ts` draws its calls into three canvases: the skin
  atlas (2048 × 1024: the left side in the top half, the right side in the bottom half, the nose at the left in both),
  the nacelle atlas and the wingtip atlas. The model shows the flat `base` colour for the few frames until they are
  ready.
- The paint shader projects each atlas across the span: a point of the fuselage or fin takes the colour of its side
  view position. That is exact for the fin and right for the fuselage sides; the crown and the belly take the top and
  bottom rows of the artwork. Cabin windows are drawn by the shader.
- Airlines with only colours in `liveries.json` (and scenario liveries) become designs automatically
  (`client/livery/legacy.ts`).

## Part 5. The agent workflow

`tools/liveries/livery.workflow.js` runs Parts 3.1–3.6 with agents for one or more airlines: a researcher gets the
photos and writes the dossier, a checker verifies it, a designer writes the design and iterates with the lab shots, and
an independent critic compares the shots with the photos until they match. In Claude Code:

```
Workflow({ scriptPath: 'tools/liveries/livery.workflow.js', args: [{ code: 'AEE', airline: 'Aegean', model: 'a21n', types: 'A321neo (A21N)' }] })
```

It needs the dev server on :5182 (`liveries-replay-client`) or `args.host`.
