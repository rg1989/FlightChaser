// client/scene/modelFor.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ModelManifest, ModelManifestEntry } from '../types.ts'
import { ModelPicker, placeholderWords } from './modelFor.ts'
import { readManifest } from '../../tools/models/packages.ts'

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

test('two models list a designator: its own model beats a stand-in, then the one that lists it earlier; a dropped-in package takes its types over', () => {
  const before = new ModelPicker({ ...man, models: [...man.models, e('b763', ['B763', 'B76*'])] })
  assert.equal(before.pick('B763', null).entry.id, 'b763')
  const both = new ModelPicker({ ...man, models: [
    e('generic'), e('c182'), e('c550'), e('a321'), e('ec135'),
    e('a320', ['A320', 'A319', 'A318']), e('a319', ['A319', 'A318']), // the A319 package: its first type is what it shows
    e('b789', ['B789'], ['B76*', 'BCS3']), e('b763', ['B763', 'B76*']), e('bcs3', ['BCS3']),
  ] })
  const got = (t: string): string => `${both.pick(t, null).entry.id} ${both.pick(t, null).fit}`
  assert.equal(got('A319'), 'a319 own', 'listed first there, second on the A320')
  assert.equal(got('A318'), 'a319 own', 'second there, third on the A320')
  assert.equal(got('A320'), 'a320 own')
  assert.equal(got('B762'), 'b763 own', 'the same prefix: its own model, not the stand-in')
  assert.equal(got('BCS3'), 'bcs3 own', 'the same designator: its own model, not the stand-in')
})

test('the shipped packages: each model draws the aircraft it shows (its first type) as its own; a stand-in has a name for the card', () => {
  const shippedMan: ModelManifest = readManifest()
  const shipped = new ModelPicker(shippedMan)
  for (const m of shippedMan.models) {
    const first = m.types?.[0]
    if (first !== undefined && !first.endsWith('*')) assert.deepEqual([shipped.pick(first, null).entry.id, shipped.pick(first, null).fit], [m.id, 'own'], first)
    if (m.standIns?.length) assert.match(m.name ?? '', /^[A-Z]/, `${m.id} has no name`)
  }
})

test('the shipped packages: no two models claim a designator alike (the same list, the same place in it)', () => {
  const seen = new Map<string, string>()
  for (const m of readManifest().models) {
    for (const [list, name] of [[m.types, 'types'], [m.standIns, 'standIns']] as const) {
      for (const [at, t] of (list ?? []).entries()) {
        const key = `${t} ${name} ${at}`
        assert.equal(seen.get(key), undefined, `${t} is at place ${at} of ${name} on ${seen.get(key)} and on ${m.id}: one of them must list it earlier`)
        seen.set(key, m.id)
      }
    }
  }
})

test('the shipped packages: the families fly a model of their own kind', () => {
  const shipped = new ModelPicker(readManifest())
  for (const t of ['E190', 'E195', 'E290', 'E295']) assert.equal(shipped.pick(t, 'A3').fit, 'own', t)
  for (const t of ['B738', 'B38M', 'A320', 'A20N', 'A321', 'A21N', 'B77W', 'B789', 'A333', 'A359', 'B744', 'AT76', 'CRJ9', 'E75L', 'C550', 'C182', 'EC35']) assert.equal(shipped.pick(t, null).fit, 'own', t)
  for (const t of ['K35R', 'E3TF', 'B703']) assert.notEqual(shipped.pick(t, 'A5').fit, 'own', `${t}: no model of it`)
})

test('the shipped manifest: an unlisted type, or none, flies the generic model of its category (a fallback or the default)', () => {
  const shipped = new ModelPicker(readManifest())
  assert.deepEqual([shipped.pick('J328', 'A2').entry.id, shipped.pick('J328', 'A2').fit], ['c550', 'generic'])
  assert.deepEqual([shipped.pick('R44', 'A7').entry.id, shipped.pick('R44', 'A7').fit], ['ec135', 'generic'])
  assert.deepEqual([shipped.pick(null, 'A3').entry.id, shipped.pick(null, 'A3').fit], ['a320', 'generic'])
  assert.deepEqual([shipped.pick(null, null).entry.id, shipped.pick(null, null).fit], ['cesium-air', 'generic'])
})
