export const meta = {
  name: 'livery',
  description: 'Paint airlines on Flight Chaser models from reference photos: research, design, render on the QA machine, independent critique, fix',
  whenToUse: 'Adding or improving an airline livery (docs/liveries.md Part 5). args: { repo, airlines: [{ code, airline, types, pairs, aliases?, hexes?, note? }] }',
  phases: [
    { title: 'Research', detail: 'reference photos + the dossier liveries/<CODE>/README.md' },
    { title: 'Design', detail: 'liveries/<CODE>/design.ts, iterated against renders' },
    { title: 'Critique', detail: 'an independent comparison of renders and photos' },
    { title: 'Fix', detail: 'the critic\'s issues, fixed' },
  ],
}

// args: {
//   repo: '/abs/path/to/checkout',     the checkout the agents edit
//   airlines: [{ code: 'WZZ', airline: 'Wizz Air', types: 'Airbus A321neo (A21N)', pairs: ['a21n:WZZ'],
//                aliases: ['WMT'], hexes: ['4d2531', …] (tracked airframes for photos), note: '…' }],
// }
const A = args ?? {}
const REPO = A.repo
if (!REPO) throw new Error('args.repo (the checkout the agents edit) is required')
const AIRLINES = A.airlines ?? []

const dir = (a) => `liveries/${a.code}`
const refs = (a) => `data/livery-refs/${a.code}`
const shotsCmd = (a) => `cd ${REPO} && .planning/tools/fleet-qa.sh shots ${dir(a)} ${refs(a)} -- --views all ${a.pairs.join(' ')}`
const checkCmd = (a) => `cd ${REPO} && .planning/tools/fleet-qa.sh run ${dir(a)} -- node --test client/livery/designs.test.ts && .planning/tools/fleet-qa.sh run ${dir(a)} -- npx tsc --noEmit -p .`

const RULES = (a) => `
Rules:
- Work only in ${REPO}. Read docs/liveries.md Part 3 and Part 4 first (the guide: the folder, the kit's calls, the licences). A finished example to read: liveries/WZZ/ (design.ts, README.md, sources.json).
- Your files: the folder ${dir(a)}/ (design.ts, README.md, logos, fonts, sources.json) and ${refs(a)}/ (photos; git ignores it). Edit nothing else. Never run git. Other agents work in the same checkout at the same time on other airlines.
- This Mac is the user's own machine: run NO heavy process on it. Never run tsc, npm test, npm run check, vite, a dev server or Chrome here. Renders and checks run on the QA machine with the two commands your task gives. Small node tools (tools/liveries/refs.ts, curl) are fine.
- Photos are copyrighted: they stay in ${refs(a)}/. Never copy one into ${dir(a)}/ or anywhere else.
- Logos: only public-domain or freely licensed files from Wikimedia Commons (for example PD-textlogo; open the file page and read the licence), into ${dir(a)}/ with the source and licence of each file in ${dir(a)}/sources.json. A wordmark with no free file: typeset it in an OFL font that looks like it (font file + its OFL licence text in ${dir(a)}/, both in sources.json). A graphic emblem with no free file: draw it with plain kit shapes that give the look without copying the artwork, or leave it out.
- Downloads needed for the task are approved. Be polite to APIs (planespotters: 1 request per second; User-Agent "Flight Chaser livery research (+https://github.com/rg1989/FlightChaser)"; never put a person's e-mail address in a User-Agent).
- Look at images with the Read tool. Base every claim on what you see.`

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: { code: { type: 'string' }, photos: { type: 'number' }, scheme: { type: 'string' }, open: { type: 'array', items: { type: 'string' } } },
  required: ['code', 'scheme'],
}
const DESIGN_SCHEMA = {
  type: 'object',
  properties: { code: { type: 'string' }, files: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' }, knownGaps: { type: 'array', items: { type: 'string' } } },
  required: ['code', 'summary', 'knownGaps'],
}
const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fix'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['major', 'minor'] }, view: { type: 'string' }, what: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'what', 'fix'] } },
    score: { type: 'number', description: '0-10, how closely the model matches the photos' },
  },
  required: ['verdict', 'issues', 'score'],
}

const results = await pipeline(
  AIRLINES,
  (a) => agent(`${RULES(a)}
Task: the livery dossier for ${a.airline} (${a.code}): the scheme its aircraft wear TODAY, on ${a.types}. ${a.note ?? ''}
1. Reference photos into ${refs(a)}/: \`cd ${REPO} && node tools/liveries/refs.ts --code ${a.code}${a.hexes && a.hexes.length ? ` --hex ${a.hexes.slice(0, 12).join(',')}` : ''} --commons "<the Wikimedia Commons category of this airline's aircraft of one type>"\` (read the tool's header for its options; find the category names on Commons). Get at least: one clean photo of each side, a 3/4 front view, the tail, an engine and a wingtip device, of the CURRENT scheme. Get more from Commons if a view is missing. Open ${refs(a)}/refs.json and replace each "view": "?" with what the photo shows (left side, right side, 3/4 front left, 3/4 rear right, tail, engine, winglet, below). Delete from refs.json the photos of an old scheme or a special livery.
2. Write the dossier ${dir(a)}/README.md as liveries/WZZ/README.md does: which aircraft wear the scheme; a table of the reference photos; every colour as a hex with its evidence (sample sunlit areas); every element in side elevation with metres and landmarks (belly line, cheatlines, swooshes: where each starts and ends; the titles: text, size, place, on each side; the fin art; the tail cone; the engines; the wingtip devices, both faces); left/right differences; the logos with their Commons pages and licences; the fonts; how sure you are of each part.
Return the structured summary.`, { label: `research:${a.code}`, phase: 'Research', schema: RESEARCH_SCHEMA }),
  (r, a) => agent(`${RULES(a)}
Task: draw ${a.airline}'s livery (${a.code}) as a Flight Chaser design, so that the 3-D models (${a.pairs.join(', ')}) look like the aircraft in the reference photos. ${a.note ?? ''}
Inputs: the dossier ${dir(a)}/README.md; the photos ${refs(a)}/ (refs.json says each one's view); the kit's calls in docs/liveries.md 3.4 and client/livery/kit.ts; the finished designs liveries/WZZ/design.ts (simple) and liveries/FDB/design.ts (curves, gradients, engines, winglets).
Write ${dir(a)}/design.ts: \`const ${a.code}: Design = { code: '${a.code}', ${a.aliases && a.aliases.length ? `aliases: ${JSON.stringify(a.aliases)}, ` : ''}name: '…', sources: […], … }\` and \`export default ${a.code}\`. It imports only from '../../client/livery/kit.ts' and reads files only from its own folder (asset('${dir(a)}/…')). The same design paints every model the airline flies: place things by the kit's landmarks (k.a, k.at, k.fin), not by one model's numbers; use k.model only where the real aircraft differ.
Loop: edit the design, then render: \`${shotsCmd(a)}\` (about a minute; it stops with an error if design.ts does not load). Open the PNGs in ${REPO}/data/livery-refs/shots/<model>-${a.code}/ (sheet.png: each photo beside the same view of the model; left.png, right.png, front-left.png, rear-right.png, tail.png, engine.png, winglet.png, below.png, top.png, nose.png are larger). Compare with the photos view by view: the colours, the belly line, every stripe and swoosh and where it starts and ends, the titles' text, size and place on BOTH sides (the text must read correctly on the right side), the fin art, the engines, the wingtips, the nose. Fix, render again. Do at least 3 rounds and at most 6. Stop when a careful observer would say it is the same livery.
Then check: \`${checkCmd(a)}\`. Fix what fails in your folder (a failure that names another airline's folder is not yours: ignore it).
Return the structured summary (what you matched, known gaps).`, { label: `design:${a.code}`, phase: 'Design', schema: DESIGN_SCHEMA }),
  async (d, a) => {
    const c = await agent(`${RULES(a)}
You are an independent, demanding critic. Compare Flight Chaser's 3-D model of ${a.airline} (${a.code}) with real photos. Do not trust anyone's summary. Change no file.
Run \`${shotsCmd(a)}\` for fresh renders in ${REPO}/data/livery-refs/shots/<model>-${a.code}/. Look at every reference photo in ${refs(a)}/ (refs.json gives each view) and the matching render, and read the dossier ${dir(a)}/README.md.
List every difference a spotter would notice: colours, belly line, stripes and swooshes (shape, width, where they start and end), titles (text, weight, size, place, both sides reading correctly), fin art (extent, logo size and place), tail cone, engines, wingtips (both faces), nose, anything missing or extra. Ignore what the model's geometry or the renderer cannot do (window shapes, panel lines, reflections, the light, the photo's background). For each difference: severity (major = a spotter would call it a wrong livery at first glance; minor = a detail), the view, what is wrong, and a concrete fix in the kit's terms (docs/liveries.md 3.4). Verdict "pass" only when there is no major issue. Score 0-10.`, { label: `critic:${a.code}`, phase: 'Critique', schema: CRITIC_SCHEMA })
    if (!c || c.verdict === 'pass' || c.issues.length === 0) return { code: a.code, design: d, critic: c, fixed: null }
    const fixed = await agent(`${RULES(a)}
Fix ${a.airline}'s design (${dir(a)}/ only; the renders: ${a.pairs.join(', ')}) for these issues that an independent critic found when comparing the renders with the photos (${REPO}/data/livery-refs/shots/, ${refs(a)}/):
${JSON.stringify(c.issues, null, 1)}
Fix every major issue and as many minor ones as you can. After each change render with \`${shotsCmd(a)}\` and look at the result against the photos; at most 4 rounds. Then check: \`${checkCmd(a)}\` (a failure that names another airline's folder is not yours). Return a short summary: what you changed, and what is still different from the photos.`, { label: `fix:${a.code}`, phase: 'Fix' })
    return { code: a.code, design: d, critic: c, fixed }
  },
)
return results.filter(Boolean)