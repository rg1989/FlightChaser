// client/scene/framePresets.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS, dockAt, optionOf } from './framePresets.ts'

const safe = { x: 66, y: 158, w: 1300, h: 490 } // a scenario's chase on a 1440 × 900 window: the button's column and the bands cut off
const view = { x: 12, y: 12, w: 1416, h: 876 }
const bar = { x: 12, y: 824, w: 1364, h: 64 } // the play bar
const captions = { x: 12, y: 658, w: 1364, h: 154 }
const button = { x: 12, y: 770, w: 46, h: 46 } // the layout button
const mini = { left: { w: 160, h: 60 }, right: { w: 160, h: 60 }, top: { w: 160, h: 60 }, bottom: { w: 160, h: 60 } }
const full = { left: { w: 131, h: 227, ay: 100 }, right: { w: 88, h: 227, ay: 100 }, top: { w: 271, h: 106, ax: 135 }, bottom: { w: 271, h: 118, ax: 135 } }

test('three ready-made layouts of three options each; an option out of range is the first', () => {
  for (const id of ['compact', 'stylistic', 'detailed'] as const) assert.equal(PRESETS[id].length, 3, id)
  assert.equal(optionOf('compact', { compact: 1 }).name, 'Strip')
  assert.equal(optionOf('compact', undefined), PRESETS.compact[0])
  assert.equal(optionOf('detailed', { detailed: 9 }), PRESETS.detailed[0])
})

test('dockAt, the corner: a cluster two by two in the view\'s bottom left corner, over what covers the view there', () => {
  // A live chase: nothing in the corner. The heading and the attitude over the altitude and the speed, 5 px apart.
  assert.deepEqual(dockAt('corner', mini, safe, view, [], 10), {
    top: { x: 12, y: 763 }, bottom: { x: 177, y: 763 }, left: { x: 12, y: 828 }, right: { x: 177, y: 828 },
  })
  // A scenario: over the play bar, the captions' band and the layout button, 10 px clear of the highest.
  const lifted = dockAt('corner', mini, safe, view, [bar, captions, button], 10)!
  assert.deepEqual([lifted.left, lifted.top], [{ x: 12, y: 588 }, { x: 12, y: 523 }])
  // A card with nothing to show leaves its place empty, the rest where they were.
  assert.deepEqual(Object.keys(dockAt('corner', { left: mini.left, bottom: mini.bottom }, safe, view, [], 10)!).sort(), ['bottom', 'left'])
  // No room over the covers: none.
  assert.equal(dockAt('corner', mini, { ...safe, y: 600 }, view, [captions], 10), null)
})

test('dockAt, the row: altitude, heading, attitude and speed on one base line, centred on the view; none when it is wider than the room', () => {
  const at = dockAt('row', full, safe, view, [bar, captions], 10)!
  const width = 131 + 271 + 271 + 88 + 30
  assert.deepEqual(at.left, { x: 720 - width / 2, y: 648 - 227 })
  assert.deepEqual([at.top!.y + 106, at.bottom!.y + 118, at.right!.y + 227], [648, 648, 648]) // one base line, 10 px over the captions
  assert.ok(at.left!.x < at.top!.x && at.top!.x < at.bottom!.x && at.bottom!.x < at.right!.x)
  assert.equal(dockAt('row', full, { ...safe, w: 700 }, view, [], 10), null)
})

test('dockAt, the edges: the tapes at the sides, level with the middle by their readouts; the heading and the attitude over and under the view\'s middle', () => {
  const at = dockAt('edges', full, safe, view, [], 10)!
  assert.deepEqual(at.left, { x: 66, y: 158 + 245 - 100 })
  assert.deepEqual(at.right, { x: 66 + 1300 - 88, y: 158 + 245 - 100 })
  assert.deepEqual(at.top, { x: 720 - 135, y: 158 })
  assert.deepEqual(at.bottom, { x: 720 - 135, y: 158 + 490 - 118 })
  assert.equal(dockAt('edges', full, { ...safe, w: 480 }, view, [], 10), null) // no width for the tapes beside the heading
  // A low room: the tapes stay inside it; the flight card open on a small window (the room starts at 320): the attitude
  // would lie on the altitude tape, so there is no such layout there.
  const low = dockAt('edges', full, { ...safe, h: 240 }, view, [], 10)!
  assert.ok(low.left!.y >= 158 && low.left!.y + 227 <= 158 + 240, `altitude at ${low.left!.y}`)
  assert.equal(dockAt('edges', full, { x: 320, y: 62, w: 680, h: 420 }, { x: 12, y: 12, w: 1000, h: 500 }, [], 10), null)
})
