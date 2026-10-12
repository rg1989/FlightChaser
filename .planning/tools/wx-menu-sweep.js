// Runs in the page: every combination of the Weather menu's chase choices, by the menu's own buttons; what the menu shows, what is
// stored and what the scene holds must agree after each, with no error; then how long each change of look takes to show.
(async () => {
  const errs = []
  addEventListener('error', (e) => errs.push(String(e.error?.message ?? e.message)))
  const frames = (n = 2) => new Promise((r) => { const f = () => (n-- > 0 ? requestAnimationFrame(f) : r()); f() })
  const until = async (ok, ms = 20000) => { const t0 = performance.now(); while (!ok()) { if (performance.now() - t0 > ms) return -1; await frames(1) } return Math.round(performance.now() - t0) }
  const seg = (label) => [...document.querySelectorAll(`.fh-wxm-seg[aria-label="${label}"] button`)]
  const sw = (label) => document.querySelector(`button[aria-label="${label}"]`)
  const pressed = (label) => seg(label).filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent).join('+')
  const pick = (label, text) => seg(label).find((b) => b.textContent === text).click()
  const set = (label, on) => { if ((sw(label).getAttribute('aria-checked') === 'true') !== on) sw(label).click() }
  const LOOK = { Natural: 'natural', 'Severity colours': 'severity', Sculpted: 'sculpted' }
  const HAZ = { Curtain: 'curtain', Fence: 'fence', Box: 'box' }
  const w = window.weather3d
  const ready = () => (w.look === 'sculpted' ? (w.sky.clouds.stats?.bodies ?? 0) > 0 : w.sky.clouds.drawn === true)
  const bad = []
  let n = 0
  const check = async (want) => {
    await frames(3)
    n++
    const stored = JSON.parse(localStorage.getItem('fh.wx3d.v1') ?? '{}')
    const got = {
      menuLook: pressed('Clouds'), sceneLook: w.look, storedLook: stored.look, renderer: w.sky.clouds.stats !== undefined ? 'sculpted' : 'volume',
      menuHaz: pressed('Hazard area style'), sceneHaz: w.hazardStyle,
      track: sw('Weather on path').getAttribute('aria-checked'), sceneTrack: String(w.aheadShow.track),
      slice: sw('Level slice').getAttribute('aria-checked'), sceneSlice: String(w.aheadShow.slice),
      strip: sw('Ahead strip').getAttribute('aria-checked'), failed: w.cloudsFailed, errs: errs.splice(0).join(' | '),
    }
    const ok = got.menuLook === want.look && got.sceneLook === LOOK[want.look] && got.storedLook === LOOK[want.look] && got.renderer === (want.look === 'Sculpted' ? 'sculpted' : 'volume')
      && got.menuHaz === want.haz && got.sceneHaz === HAZ[want.haz] && got.track === String(want.track) && got.sceneTrack === String(want.track)
      && got.slice === String(want.slice) && got.sceneSlice === String(want.slice) && got.strip === String(want.strip) && !got.failed && got.errs === ''
    if (!ok) bad.push({ want, got })
  }
  // 1. every combination: 3 looks × 3 hazard styles × the three aids on and off = 72
  for (const look of Object.keys(LOOK)) for (const haz of Object.keys(HAZ)) for (const track of [true, false]) for (const slice of [false, true]) for (const strip of [true, false]) {
    pick('Clouds', look)
    pick('Hazard area style', haz)
    set('Weather on path', track)
    // (in the Sculpted look the level slice's switch is out of use and keeps its choice: it is set in another look first)
    if ((sw('Level slice').getAttribute('aria-checked') === 'true') !== slice) { if (look === 'Sculpted') { pick('Clouds', 'Natural'); await frames(2); set('Level slice', slice); pick('Clouds', 'Sculpted') } else set('Level slice', slice) }
    set('Ahead strip', strip)
    await check({ look, haz, track, slice, strip })
    const stripShown = await until(() => { const e = document.querySelector('.fh-wxhud-strip'); return (e !== null && e.offsetParent !== null && getComputedStyle(e).display !== 'none') === strip }, 1500)
    if (stripShown < 0) bad.push({ want: { look, haz, track, slice, strip }, got: 'the ahead strip did not follow its switch within 1.5 s' })
  }
  const combos = n
  // 2. the level slice's switch in the Sculpted look: out of use, a click changes nothing
  pick('Clouds', 'Sculpted'); await frames(3)
  const sliceWas = sw('Level slice').getAttribute('aria-checked')
  sw('Level slice').click(); await frames(3)
  const sliceOff = { disabled: sw('Level slice').disabled || sw('Level slice').closest('[aria-disabled=true]') !== null, unchanged: sw('Level slice').getAttribute('aria-checked') === sliceWas }
  // 3. every change of look, timed: from the click to the look being on the screen (the volume's pass in the scene; the sculpted bodies made)
  set('Weather on path', true); set('Ahead strip', true); pick('Hazard area style', 'Curtain')
  const timings = {}
  for (const [from, to] of [['Natural', 'Severity colours'], ['Severity colours', 'Natural'], ['Natural', 'Sculpted'], ['Sculpted', 'Natural'], ['Severity colours', 'Sculpted'], ['Sculpted', 'Severity colours']]) {
    pick('Clouds', from); await until(ready); await frames(30)
    const t0 = performance.now()
    pick('Clouds', to)
    const menuMs = Math.round(performance.now() - t0) // the click's own work: the menu shows the choice when it returns
    const shownMs = await until(ready)
    timings[`${from} → ${to}`] = { clickMs: menuMs, shownMs, menu: pressed('Clouds'), errs: errs.splice(0).join(' | ') }
  }
  // 4. fast clicks: round the looks ten times with a frame between, then twice with none; the last asked for is the one shown
  for (let i = 0; i < 10; i++) for (const look of Object.keys(LOOK)) { pick('Clouds', look); await frames(1) }
  for (let i = 0; i < 2; i++) for (const look of ['Sculpted', 'Severity colours', 'Sculpted', 'Natural']) pick('Clouds', look)
  const fastMs = await until(ready)
  await check({ look: 'Natural', haz: 'Curtain', track: true, slice: sw('Level slice').getAttribute('aria-checked') === 'true', strip: true })
  // 5. the opacity slider at none, half and solid in each look
  const range = document.querySelector('input.fh-wxm-range')
  const opacity = {}
  for (const look of Object.keys(LOOK)) for (const v of [0, 50, 100]) {
    pick('Clouds', look); await frames(2)
    range.value = String(v); range.dispatchEvent(new Event('input', { bubbles: true })); range.dispatchEvent(new Event('change', { bubbles: true })); await frames(3)
    opacity[`${look} ${v}`] = `${w.opacity.toFixed(2)} "${document.querySelector('.fh-wxm-amount').textContent}"${errs.length ? ' ERR ' + errs.splice(0).join('|') : ''}`
  }
  // 6. the master switch off and on in each look
  const master = {}
  for (const look of Object.keys(LOOK)) {
    pick('Clouds', look); await until(ready)
    set('Weather', false); await frames(5)
    const off = w.show
    set('Weather', true)
    master[look] = { shownWhileOff: off, backMs: await until(() => w.show && ready()), errs: errs.splice(0).join(' | ') }
  }
  range.value = '70'; range.dispatchEvent(new Event('input', { bubbles: true })); range.dispatchEvent(new Event('change', { bubbles: true }))
  return { combos, mismatches: bad.length, firstBad: bad.slice(0, 4), sliceInSculpted: sliceOff, timings, fastMs, opacity, master }
})()
