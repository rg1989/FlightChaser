// shared/flightId.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { oneSlip, parseFlightId, slips, ticketText, typeLike } from './flightId.ts'

test('parseFlightId: a ticket number is a 2-character designator and a number; spaces, hyphens and case do not count', () => {
  assert.deepEqual(parseFlightId('W43257'), { id: 'W43257', callsign: null, ticket: { airline: 'W4', number: '3257' } })
  assert.deepEqual(parseFlightId(' w4 3257 '), { id: 'W43257', callsign: null, ticket: { airline: 'W4', number: '3257' } })
  assert.deepEqual(parseFlightId('LY-315'), { id: 'LY315', callsign: null, ticket: { airline: 'LY', number: '315' } })
  assert.deepEqual(parseFlightId('u2 8431'), { id: 'U28431', callsign: null, ticket: { airline: 'U2', number: '8431' } })
  assert.deepEqual(parseFlightId('5f123'), { id: '5F123', callsign: null, ticket: { airline: '5F', number: '123' } })
  assert.deepEqual(parseFlightId('BA12A'), { id: 'BA12A', callsign: null, ticket: { airline: 'BA', number: '12A' } })
  assert.equal(ticketText({ airline: 'W4', number: '3257' }), 'W4 3257')
})

test('parseFlightId: an airline callsign (3 letters, then a digit) and any other callsign are sent as they are', () => {
  assert.deepEqual(parseFlightId('wmt7403'), { id: 'WMT7403', callsign: 'WMT7403', ticket: null })
  assert.deepEqual(parseFlightId('ELY315'), { id: 'ELY315', callsign: 'ELY315', ticket: null })
  assert.deepEqual(parseFlightId('EZY84TL'), { id: 'EZY84TL', callsign: 'EZY84TL', ticket: null })
  assert.deepEqual(parseFlightId('N123AB'), { id: 'N123AB', callsign: 'N123AB', ticket: null }) // a registration flown as a callsign
  assert.deepEqual(parseFlightId('4XEKA'), { id: '4XEKA', callsign: '4XEKA', ticket: null })
})

test('parseFlightId: not a flight: a word, a number, too short, too long, other characters', () => {
  for (const t of ['', 'London', 'TLV', '3257', 'W4', 'A1', 'ABCDEFGH1', 'W4/3257', 'tel aviv 1', 'LY 315 x']) assert.equal(parseFlightId(t), null, t)
})

test('typeLike: an aircraft type designator, which is also typed to find aircraft of that type', () => {
  for (const t of ['A320', 'B738', 'E190', 'C172', 'A21N', 'B38M', 'B77W', 'B744']) assert.equal(typeLike(t), true, t)
  for (const t of ['W43257', 'LY315', 'ELY315', 'FZ1073', 'AA100', 'A32', 'A3200']) assert.equal(typeLike(t), false, t)
})

test('oneSlip: one character wrong, missing or extra, or two neighbours swapped; not the same, not two slips', () => {
  assert.equal(oneSlip('FDB1073', 'FDB1037'), true) // swapped
  assert.equal(oneSlip('FDB1073', 'FDB1074'), true) // wrong
  assert.equal(oneSlip('FDB1073', 'FDB107'), true) // missing
  assert.equal(oneSlip('FDB107', 'FDB1073'), true) // extra
  assert.equal(oneSlip('FDB1073', 'FDB073'), true)
  assert.equal(oneSlip('EYL315', 'ELY315'), true)
  assert.equal(oneSlip('FDB1073', 'FDB1073'), false)
  assert.equal(oneSlip('FDB1073', 'FDB1730'), false)
  assert.equal(oneSlip('FDB1073', 'FDB10'), false)
  assert.equal(oneSlip('AB', 'BA'), true)
  assert.equal(oneSlip('', 'A'), true)
})

test('slips: the known ids one slip away, in their order, at most max', () => {
  const known = ['ELY315', 'ELY351', 'ELY31', 'ELY3155', 'ELY001', 'ELY316']
  assert.deepEqual(slips('ELY315', known, 10), ['ELY351', 'ELY31', 'ELY3155', 'ELY316'])
  assert.deepEqual(slips('ELY315', known, 2), ['ELY351', 'ELY31'])
  assert.deepEqual(slips('XXX999', known, 10), [])
})
