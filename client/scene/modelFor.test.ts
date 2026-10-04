// client/scene/modelFor.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { ModelManifest, ModelManifestEntry } from '../types.ts'
import { ModelPicker, placeholderWords } from './modelFor.ts'

const e = (id: string, types: string[] = [], standIns?: string[], name?: string): ModelManifestEntry => ({
  id, uri: `models/${id}.glb`, license: 'x', author: 'x', source: 'x', forwardAxisFix: { headingDeg: 90, pitchDeg: 0, rollDeg: 0 },
  gearHeightM: 1, lengthM: 30, scale: 1, types, ...(standIns ? { standIns } : {}), ...(name ? { name } : {}),
})
const man: ModelManifest = {
  default: 'generic',
  fallback: { A1: 'c182', A2: 'c550', A3: 'a320', A4: 'a321', A5: 'b789', A7: 'ec135', light: 'c182', jet: 'a320', heavy: 'b789', heli: 'ec135' },
  models: [
    e('generic'), e('a320', ['A320', 'A20N']), e('a321', ['A321', 'A21N'], ['B75*'], 'Airbus A321'), e('b738', ['B73*', 'B38M']), e('b789', ['B789']),
    e('c550', ['C25*', 'C68A', 'C560'], ['C56*']), e('c182', ['C1*', 'C2*']), e('ec135', ['EC35']), e('b744', ['B744', 'A388']),
    e('a333', ['A33*'], ['A337', 'A306'], 'Airbus A330-300'),
  ],
}
const pick = new ModelPicker(man)
const id = (type: string | null, cat: string | null = null): string => pick.for(type, cat).id
const fit = (type: string | null, cat: string | null = null): string => `${pick.pick(type, cat).entry.id} ${pick.pick(type, cat).fit}`

test('exact designator first, then the longest prefix', () => {
  assert.equal(id('A21N', 'A3'), 'a321')
  assert.equal(id('B38M'), 'b738')
  assert.equal(id('B739'), 'b738') // B73* prefix
  assert.equal(id('C25B'), 'c550') // C25* beats C2*
  assert.equal(id('C208'), 'c182')
  assert.equal(id('a388'), 'b744') // designators are upper-cased
})

test('unlisted types: a helicopter designator wins, then the ADS-B category, then the type family', () => {
  assert.equal(id('R44', 'A1'), 'ec135') // a helicopter squawking A1
  assert.equal(id('GLF6', 'A2'), 'c550')
  assert.equal(id('B77W', null), 'b789') // heavy list
  assert.equal(id('PA46', null), 'c182') // light pattern
  assert.equal(id('XYZ9', null), 'a320') // unknown jet
  assert.equal(id(null, 'A5'), 'b789')
  assert.equal(id(null, 'A7'), 'ec135')
})

test('no type and no category (or a ground vehicle): the default model', () => {
  assert.equal(id(null, null), 'generic')
  assert.equal(id('', 'C1'), 'generic')
})

test('pick: a type on its own model (types), on a stand-in (standIns), or on the generic one (a fallback, the default)', () => {
  assert.equal(fit('A321', 'A3'), 'a321 own')
  assert.equal(fit('B739'), 'b738 own') // a prefix of types
  assert.equal(fit('B752', 'A4'), 'a321 standIn') // a prefix of standIns
  assert.equal(fit('a306'), 'a333 standIn') // designators are upper-cased
  assert.equal(fit('GLF6', 'A2'), 'c550 generic') // unlisted: its category's model
  assert.equal(fit('XYZ9', null), 'a320 generic') // unlisted: its type family's
  assert.equal(fit(null, 'A5'), 'b789 generic') // no type
  assert.equal(fit(null, null), 'generic generic') // nothing known: the default
  assert.equal(pick.for('B752', 'A4'), pick.pick('B752', 'A4').entry, 'for() is the picked entry')
  assert.equal(pick.pick('B752', 'A4'), pick.pick('B753', null), 'the same answer is the same object: nothing is made per call')
})

test('pick: a designator listed exactly beats a prefix of the other list, whichever list it is in', () => {
  assert.equal(fit('A339'), 'a333 own')
  assert.equal(fit('A337'), 'a333 standIn') // the BelugaXL, inside A33*
  assert.equal(fit('C56X'), 'c550 standIn')
  assert.equal(fit('C560'), 'c550 own') // inside C56*
})

test('placeholderWords: none on its own model; a stand-in names the model drawn and the type missing; the generic one says so', () => {
  assert.equal(placeholderWords(pick.pick('A321', 'A3'), 'A321'), null)
  assert.equal(placeholderWords(pick.pick('B752', 'A4'), 'B752'), 'Shown as an Airbus A321: no B752 model yet')
  assert.equal(placeholderWords(pick.pick('a337', null), 'a337 '), 'Shown as an Airbus A330-300: no A337 model yet')
  assert.equal(placeholderWords(pick.pick('C56X', 'A2'), 'C56X'), 'Shown as a C550: no C56X model yet', 'an entry without a name: its id')
  assert.equal(placeholderWords(pick.pick('GLF6', 'A2'), 'GLF6'), 'Placeholder model: no GLF6 model yet')
  assert.equal(placeholderWords(pick.pick(null, 'A5'), null), 'Placeholder model: type unknown')
  assert.equal(placeholderWords(pick.pick('', null), ''), 'Placeholder model: type unknown')
})

test('placeholderWords: "an" before a vowel sound, "a" otherwise', () => {
  const words = (name: string): string => placeholderWords({ entry: e('x', [], ['T'], name), fit: 'standIn' }, 'T')!
  assert.equal(words('ATR 72'), 'Shown as an ATR 72: no T model yet')
  assert.equal(words('Embraer 175'), 'Shown as an Embraer 175: no T model yet')
  assert.equal(words('Boeing 747-400'), 'Shown as a Boeing 747-400: no T model yet')
  assert.equal(words('Eurocopter EC135'), 'Shown as a Eurocopter EC135: no T model yet')
})

test('a fallback naming a missing model is a manifest error', () => {
  assert.throws(() => new ModelPicker({ ...man, fallback: { A1: 'nope' } }), /nope/)
})

test('the shipped manifest: E190s and E195s (and their E2s) fly the E190 model; E170s, E175s and the ERJ family the E175', () => {
  const shipped = new ModelPicker(JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8')))
  for (const t of ['E190', 'E195', 'E290', 'E295']) assert.equal(shipped.for(t, 'A3').id, 'e190', t)
  for (const t of ['E170', 'E175', 'E75L', 'E75S', 'E135', 'E145', 'E45X']) assert.equal(shipped.for(t, 'A3').id, 'e75l', t)
})

test('the shipped manifest: the 707 and DC-8 families (tankers, AWACS, E-6) fly the four-engine model, not a twin', () => {
  const shipped = new ModelPicker(JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8')))
  for (const t of ['K35R', 'K35E', 'C135', 'R135', 'E3TF', 'E3CF', 'E6', 'B703', 'B701', 'B720', 'DC86', 'DC87']) assert.equal(shipped.for(t, 'A5').id, 'b744', t)
  for (const t of ['P8', 'E737']) assert.equal(shipped.for(t, 'A5').id, 'b738', t) // 737 airframes
  assert.equal(shipped.for('K46', 'A5').id, 'b789', 'the KC-46 is a 767: the widebody twin')
})

// What each shipped model truly is, and what it only stands in for (docs/liveries.md Part 2.1).
const SPLIT: Record<string, { own: string[]; standIn: string[] }> = {
  a320: { own: ['A320', 'A319', 'A318', 'A19N'], standIn: [] },
  a20n: { own: ['A20N'], standIn: [] },
  a321: { own: ['A321'], standIn: ['B752', 'B753'] },
  a21n: { own: ['A21N'], standIn: [] },
  b738: { own: ['B736', 'B737', 'B738', 'B739', 'B733', 'B732', 'P8'], standIn: ['BCS1', 'BCS3', 'E737'] },
  b38m: { own: ['B38M', 'B37M', 'B39M', 'B3XM'], standIn: [] },
  b773: { own: ['B772', 'B77L', 'B773', 'B77W', 'B779'], standIn: [] },
  b789: { own: ['B788', 'B789', 'B78X'], standIn: ['B762', 'B763', 'B764', 'K46'] },
  a333: { own: ['A332', 'A333', 'A338', 'A339'], standIn: ['A337', 'A3ST', 'A306', 'A30B', 'A310'] },
  a359: { own: ['A359', 'A35K'], standIn: [] },
  e75l: { own: ['E170', 'E75L', 'E75S'], standIn: ['E135', 'E145', 'E45X'] },
  e190: { own: ['E190', 'E195', 'E290', 'E295'], standIn: [] },
  crj9: { own: ['CRJ2', 'CRJ7', 'CRJ9', 'CRJX'], standIn: ['MD82', 'MD83', 'MD90', 'DC93', 'B712', 'F100', 'F70'] },
  at75: { own: ['AT43', 'AT45', 'AT72', 'AT75', 'AT76'], standIn: ['DH8A', 'DH8D', 'SF34', 'SB20', 'D328', 'JS41'] },
  b744: { own: ['B742', 'B744', 'B748', 'B74S'], standIn: ['A342', 'A346', 'A388', 'A124', 'A225', 'IL96', 'IL86', 'B703', 'B720', 'K35R', 'E3TF', 'E6', 'DC87'] },
  c550: { own: ['C500', 'C501', 'C550', 'C551', 'C55B', 'C560'], standIn: ['C56X', 'C510', 'C525', 'C25B', 'C650', 'C680', 'C68A', 'C700', 'C750', 'E55P', 'CL35', 'GLEX', 'GLF4', 'FA7X', 'F900', 'LJ45', 'H25B', 'BE40', 'PC24'] },
  c182: { own: ['C182'], standIn: ['C172', 'C152', 'C150', 'P28A', 'SR22'] },
  ec135: { own: ['EC35'], standIn: [] },
}

test('the shipped manifest: each model keeps its own family in types; what it only stands in for is in standIns', () => {
  const shippedMan: ModelManifest = JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8'))
  const shipped = new ModelPicker(shippedMan)
  assert.deepEqual(shippedMan.models.filter((m) => m.types || m.standIns).map((m) => m.id).sort(), Object.keys(SPLIT).sort(), 'every typed model is in the table')
  for (const [model, { own, standIn }] of Object.entries(SPLIT)) {
    for (const t of own) assert.deepEqual([shipped.pick(t, null).entry.id, shipped.pick(t, null).fit], [model, 'own'], t)
    for (const t of standIn) assert.deepEqual([shipped.pick(t, null).entry.id, shipped.pick(t, null).fit], [model, 'standIn'], t)
  }
})

test('the shipped manifest: no designator is listed twice; every model that stands in for another has a name for the card', () => {
  const shippedMan: ModelManifest = JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8'))
  const seen = new Map<string, string>()
  for (const m of shippedMan.models) {
    for (const t of [...(m.types ?? []), ...(m.standIns ?? [])]) {
      assert.equal(seen.get(t), undefined, `${t} is on ${seen.get(t)} and on ${m.id}`)
      seen.set(t, m.id)
    }
    if (m.standIns?.length) assert.match(m.name ?? '', /^[A-Z]/, `${m.id} has no name`)
  }
})

test('the shipped manifest: an unlisted type, or none, flies the generic model of its category (a fallback or the default)', () => {
  const shipped = new ModelPicker(JSON.parse(readFileSync(new URL('../../public/models/manifest.json', import.meta.url), 'utf8')))
  assert.deepEqual([shipped.pick('J328', 'A2').entry.id, shipped.pick('J328', 'A2').fit], ['c550', 'generic'])
  assert.deepEqual([shipped.pick('R44', 'A7').entry.id, shipped.pick('R44', 'A7').fit], ['ec135', 'generic'])
  assert.deepEqual([shipped.pick(null, 'A3').entry.id, shipped.pick(null, 'A3').fit], ['a320', 'generic'])
  assert.deepEqual([shipped.pick(null, null).entry.id, shipped.pick(null, null).fit], ['cesium-air', 'generic'])
})
