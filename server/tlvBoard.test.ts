// server/tlvBoard.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BOARD_URL, TlvBoard, parseBoard, zoneTimeMs } from './tlvBoard.ts'

// The board's rows for W4 3257 on 2026-10-11 (the fields read): the diverted flight of the 10th, the 11th's, and two to come.
const ROWS = [
  { CHOPER: 'W4', CHFLTN: '3257', CHSTOL: '2026-10-10T08:25:00', CHPTOL: '2026-10-10T16:08:00', CHAORD: 'A', CHLOC1: 'OTP', CHRMINE: 'LANDED' },
  { CHOPER: 'W4', CHFLTN: '3257', CHSTOL: '2026-10-11T08:25:00', CHPTOL: '2026-10-11T08:45:00', CHAORD: 'A', CHLOC1: 'OTP', CHRMINE: 'LANDED' },
  { CHOPER: 'W4', CHFLTN: '3257', CHSTOL: '2026-10-12T08:25:00', CHPTOL: '2026-10-12T08:25:00', CHAORD: 'A', CHLOC1: 'OTP', CHRMINE: 'NOT FINAL' },
  { CHOPER: 'W4', CHFLTN: '3257', CHSTOL: '2026-10-13T08:25:00', CHPTOL: '2026-10-13T08:25:00', CHAORD: 'A', CHLOC1: 'OTP', CHRMINE: 'CANCELED' },
]

test('zoneTimeMs: Israel\'s clock as UTC, in summer time and in winter time', () => {
  assert.equal(zoneTimeMs('2026-10-11T08:45:00'), Date.UTC(2026, 9, 11, 5, 45)) // summer time: UTC+3
  assert.equal(zoneTimeMs('2026-12-01T08:45:00'), Date.UTC(2026, 11, 1, 6, 45)) // winter: UTC+2
  assert.equal(zoneTimeMs('2026-10-11T00:10:00'), Date.UTC(2026, 9, 10, 21, 10)) // the day before, in UTC
  assert.ok(Number.isNaN(zoneTimeMs('soon')))
})

test('parseBoard: each day\'s estimated or actual time, arrivals or departures as the rows say; a cancelled one is none', () => {
  assert.deepEqual(parseBoard({ success: true, result: { records: ROWS } }), {
    arrival: true, times: [Date.UTC(2026, 9, 10, 13, 8), Date.UTC(2026, 9, 11, 5, 45), Date.UTC(2026, 9, 12, 5, 25)],
  })
  assert.deepEqual(parseBoard({ result: { records: [{ ...ROWS[1], CHAORD: 'D', CHPTOL: undefined }] } }), { arrival: false, times: [Date.UTC(2026, 9, 11, 5, 25)] }) // no estimate: the schedule
  assert.equal(parseBoard({ result: { records: [] } }), null)
  assert.equal(parseBoard({ success: false }), null)
  assert.equal(parseBoard(null), null)
})

test('times: one request with the airline and the number as filters, kept; a failure is not kept; what is no ticket number is not asked', async () => {
  const asked: string[] = []
  let status = 200
  const fetchFn = (async (input: RequestInfo | URL) => {
    asked.push(String(input))
    return new Response(JSON.stringify({ success: true, result: { records: ROWS } }), { status })
  }) as typeof fetch
  const board = new TlvBoard({ userAgent: 'test', fetchFn, nowMs: () => 0 })
  assert.equal((await board.times('W4', '3257'))?.times.length, 3)
  assert.equal((await board.times('W4', '3257'))?.arrival, true)
  assert.equal(asked.length, 1)
  const url = new URL(asked[0])
  assert.equal(`${url.origin}${url.pathname}`, BOARD_URL)
  assert.deepEqual(JSON.parse(url.searchParams.get('filters')!), { CHOPER: 'W4', CHFLTN: '3257' })
  status = 503
  assert.equal(await board.times('LY', '315'), null)
  assert.equal(await board.times('LY', '315'), null)
  assert.equal(asked.length, 3) // asked again: a failure is not kept
  assert.equal(await board.times('WMT', '3257'), null)
  assert.equal(await board.times('W4', 'x'), null)
  assert.equal(asked.length, 3)
})
