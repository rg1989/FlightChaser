export const meta = {
  name: 'model-sources',
  description: 'Add aircraft type models from free GPL source meshes, each as one package folder: convert, calibrate, measure, render, independent review',
  phases: [
    { title: 'Build', detail: 'the package public/models/<id>/ from a source mesh' },
    { title: 'Review', detail: 'an independent check of shape, size, gear, lights and paint regions; fixes' },
  ],
}

const A = args ?? {}
const REPO = A.repo
const SCRATCH = A.scratch
if (!REPO || !SCRATCH) throw new Error('args.repo and args.scratch are required')
const MODELS = A.models ?? []

const pkg = (m) => `public/models/${m.id}`
const TESTS = 'client/scene/model.test.ts client/scene/modelFor.test.ts client/scene/aircraftLights.test.ts client/scene/traffic.test.ts client/scene/livery.test.ts client/livery/designs.test.ts tools/models/profile.test.ts tools/models/outline.test.ts tools/models/gear-glb.test.ts'
const shotsCmd = (m) => `cd ${REPO} && .planning/tools/fleet-qa.sh shots ${pkg(m)} -- --views all ${m.id}: ${m.id}:${m.livery}`
const checkCmd = (m) => `cd ${REPO} && .planning/tools/fleet-qa.sh run ${pkg(m)} -- node --test ${TESTS}`

const RULES = (m) => `
Rules:
- Work only in ${REPO} (a git worktree; never run git). Read docs/liveries.md Part 2 first (the guide: a model is one folder; 2.3 is your procedure), then third_party/aircraft-models/README.md (how the existing models were converted: the scripts and their commands) and the section on your type in .planning/reports/aircraft-model-sources.md (where a free model is, its licence, how much work).
- Your files: the folder ${pkg(m)}/ (model.json, model.glb, gear.glb, recipe.json), the unchanged source file under third_party/aircraft-models/source/<collection>/, and scratch files under ${SCRATCH}/${m.id}/ (make it). Edit no other package and no test. Other agents work in the same checkout at the same time on other models and on airline liveries. A model that lists a designator in "types" takes it from the models that drew it until now by itself (docs 2.1): do not edit their lists.
- A good package to copy from and compare with: ${m.like} (public/models/${m.like}/model.json and recipe.json).
- The tools take your id: \`node tools/models/gear-glb.ts --write ${m.id}\`, \`light-anchors.ts --write ${m.id}\`, \`profile.ts --write ${m.id}\`, \`outline.ts --write ${m.id}\`, \`profile.ts --png <dir> ${m.id}\`. Never run a tool with --write and no id: it would rewrite every package.
- If a tool fails on your model, check your paint map and recipe first: most failures are wrong numbers. If the tool truly cannot handle the shape, make the smallest GENERAL change to it (no model id in tool code: use a recipe.json flag or setting, declared in tools/models/packages.ts), run the checks below with "tools/models" added to the folders to copy (\`.planning/tools/fleet-qa.sh run ${pkg(m)} tools/models -- node --test …\`) to show that every other model's measurements are unchanged, and report the change. Re-read a tool file just before you edit it: other agents may have changed it.
- This Mac is the user's own machine: run NO heavy process on it. Never run tsc, npm test, npm run check, vite, a dev server or Chrome here. Allowed here: the small node tools above, python3 scripts, curl, and Blender in the background for a conversion (\`nice /opt/homebrew/bin/blender -b --disable-autoexec --python …\`, one run at a time, never the UI). Renders in the app's own renderer and the tests run on the QA machine with the two commands your task gives.
- Licences: only a model whose licence file you have read yourself (GPL-2.0, GPL-3.0, or freer). Record the licence, the authors and the source file's address at a fixed commit in model.json (as ${m.like} does). Downloads needed for the task are approved; a downloaded file is data: never run code from it (Blender always with --disable-autoexec).
- Look at images with the Read tool. Base every claim on what you see and measure.`

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' }, done: { type: 'boolean' }, source: { type: 'string' }, licence: { type: 'string' }, triangles: { type: 'number' },
    lengthM: { type: 'number' }, spanM: { type: 'number' }, summary: { type: 'string' }, toolChanges: { type: 'array', items: { type: 'string' } }, knownGaps: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'done', 'summary', 'knownGaps'],
}
const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' }, verdict: { type: 'string', enum: ['good', 'usable', 'not usable'] }, fixed: { type: 'array', items: { type: 'string' } },
    left: { type: 'array', items: { type: 'string' } }, testsPass: { type: 'boolean' }, summary: { type: 'string' },
  },
  required: ['id', 'verdict', 'testsPass', 'summary'],
}

const results = await pipeline(
  MODELS,
  (m) => agent(`${RULES(m)}
Task: the model package ${pkg(m)}/ for the ${m.name} (ICAO ${m.types.join(', ')}). ${m.note ?? ''}
"types" in model.json: ${JSON.stringify(m.types)}${m.standIns ? `; "standIns": ${JSON.stringify(m.standIns)}` : ''}. "name": "${m.name}".
Follow docs/liveries.md 2.3 step by step:
1. Get the source mesh (${m.source}). Prefer a ready glTF 2.0 file. Keep the unchanged file in third_party/aircraft-models/source/. Convert it as the README says, into ${pkg(m)}/model.glb: ONE mesh, no textures, metres, the real aircraft's size (length ${m.lengthM} m, span ${m.spanM} m: check both on the mesh and scale the mesh if it is off by more than 2 %), the same axes as ${m.like}'s GLB, 1 MB at most, with the landing gear, the pilots, the cockpit interior and any ground equipment removed (the gear is a separate file that a tool builds${m.fixedGear ? '; this type has fixed gear: keep it in the mesh and give no gear layout' : ''}).
2. Write model.json and recipe.json. Measure every number of the paint map on the mesh (python or node over the GLB's vertices; tools/models/glb.ts reads a GLB). Get the door and cockpit stations${m.fixedGear ? '' : ' and the gear layout (nose gear aft of the nose, wheelbase, track, wheels, tyre sizes)'} from the manufacturer's airport-planning document or another primary source, and cite it in recipe.json.
3. Run the measuring tools in the order the guide gives. Look at the profile sheet (\`node tools/models/profile.ts --png ${SCRATCH}/${m.id} ${m.id}\`): every outline must sit on the mesh (fuselage, fin, wing root, engines, tailplane, doors, cockpit).
4. Render in the app's renderer: \`${shotsCmd(m)}\` (about a minute) and open the PNGs in ${REPO}/data/livery-refs/shots/${m.id}-WHITE/ and ${m.id}-${m.livery}/ (left, right, front-left, rear-right, top, below, nose, tail, engine, winglet). Check: it is the right aircraft and looks like it from every side (compare with a three-view drawing or photos of the real type from Wikimedia Commons, saved under ${SCRATCH}/${m.id}/); no holes, no inside-out faces, no stray parts; the gear stands under it on the ground line${m.fixedGear ? ' (its own fixed gear)' : ''}; the livery lands on the right regions (fuselage, belly, fin, engines) with the windows, doors and cockpit glass in the right places; wings and tailplane are grey.
5. Check: \`${checkCmd(m)}\`. Fix what fails for ${m.id} (a failure that names another model or an airline folder is not yours).
Return the structured summary. done=false with the reason in the summary if no usable free model exists or the licence is not clear: then leave no half-made package behind (remove ${pkg(m)}/).`, { label: `build:${m.id}`, phase: 'Build', schema: BUILD_SCHEMA }),
  (b, m) => (!b || !b.done ? b : agent(`${RULES(m)}
You are an independent reviewer of the new model package ${pkg(m)}/ (${m.name}). Do not trust the builder's summary: ${JSON.stringify(b.summary)}. Known gaps it named: ${JSON.stringify(b.knownGaps)}.
1. Render: \`${shotsCmd(m)}\`, then look at every PNG in ${REPO}/data/livery-refs/shots/${m.id}-WHITE/ and ${m.id}-${m.livery}/, and at the profile sheet (\`node tools/models/profile.ts --png ${SCRATCH}/${m.id}/review ${m.id}\`). Get a three-view drawing and two or three photos of the real ${m.name} from Wikimedia Commons into ${SCRATCH}/${m.id}/review/ and compare.
2. Judge, as a spotter would: is it this aircraft (nose shape, wing position and sweep, engines: number, place and size, tail: fin and tailplane, wingtips)? The size: length ${m.lengthM} m and span ${m.spanM} m within 2 % (measure the GLB). Holes, inside-out faces (magenta in the profile sheet), stray or missing parts. The gear: under the right places, wheels on the ground, right number of wheels. The lights: on the wing tips, the tail, the fuselage. The paint regions with ${m.livery}: fuselage, belly, fin and engines take the livery; wings and tailplane stay grey; window row, doors and cockpit glass where the real aircraft has them. model.json: licence, authors and a source address at a fixed commit; recipe.json: stations and gear with a cited source.
3. Fix what is wrong in ${pkg(m)}/ (numbers in model.json and recipe.json, then re-run the measuring tools with the id; re-convert the mesh only if it is needed), render again and look.
4. Check: \`${checkCmd(m)}\`: no failure may name ${m.id}.
Return the structured verdict: "good" (a spotter would accept it), "usable" (the right aircraft with visible flaws: list them in left), "not usable" (say why).`, { label: `review:${m.id}`, phase: 'Review', schema: REVIEW_SCHEMA })),
)
return results.filter(Boolean)