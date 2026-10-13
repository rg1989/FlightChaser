#!/usr/bin/env python3
"""JAL 123: the cockpit voice recording on the scenario clock.

The source is a hobbyist's Audacity project (github.com/SonGohan/JAL123CVR): the leaked 2000 copy of the recording and
the ground radio tape, cut into clips and laid by ear on a timeline that counts seconds from 18:00:00 JST. Its clips
sit up to 6.4 s late and the tape runs up to 1 % off speed, so every continuous stretch is moved and stretched to the
official record's times (transcript.csv), as measured by tools/scenarios/align_lines.py.

  cvr_audio.py tracks  PROJECT.aup DATA_DIR OUT_DIR          each track as it lies in the project (to measure)
  cvr_audio.py fit     PROJECT.aup cam.json ground.json      -> cvr_retime.json (lateness of every stretch)
  cvr_audio.py render  PROJECT.aup DATA_DIR OUT.m4a          the mix, re-timed by cvr_retime.json

The output starts at 18:24:00 and stops at the scenario's darkAt (18:56:22), before the first sound of contact.
Needs numpy and ffmpeg. The result goes to public/scenarios/jal123/local/, which git never publishes.
"""
import json, os, struct, subprocess, sys, wave
import xml.etree.ElementTree as ET
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RETIME = os.path.join(HERE, 'cvr_retime.json')
T0, T1 = 1440.0, 3382.0  # 18:24:00 .. 18:56:22 on the project's timeline (seconds from 18:00:00)
RATE = 44100
CAM = ('Cockpit', 'LQ Cockpit')  # the cockpit microphone, in two qualities that take turns
RADIO = 'CTLCH2'  # the recorder's radio and announcement channel, one unbroken 12.5 minutes
GROUND = ('ACC-JL123', 'ATC', 'Cabin')  # the ground tape and cabin clips: used only after RADIO ends
# Up to 18:28:10 the project carries its author's own labels, set by ear: 48 crew lines lie a median 0.7 s after the
# record's second, which is in time (the record names the second a line starts in). The aligner reads the first stretch
# 1.1 s early through the bang and the warning horn; where the two disagree the ear is right, so these stay put.
BY_EAR_UNTIL = 1690.0


def read_project(aup, data_dir):
    root = ET.parse(aup).getroot()
    ns = root.tag.split('}')[0] + '}'
    files = {f: os.path.join(d, f) for d, _, fs in os.walk(data_dir or '.') for f in fs} if data_dir else {}
    tracks = {}
    for tr in root.findall(ns + 'wavetrack'):
        if tr.get('channel') != '0':
            continue  # the right channel of each pair repeats the left
        clips = []
        for clip in tr.findall(ns + 'waveclip'):
            seq = clip.find(ns + 'sequence')
            blocks = [(int(wb.get('start')), wb[0].get('filename'), int(wb[0].get('len'))) for wb in seq.findall(ns + 'waveblock') if wb[0].tag == ns + 'simpleblockfile']
            env = clip.find(ns + 'envelope')
            pts = [(float(p.get('t')), float(p.get('val'))) for p in env] if env is not None else []
            clips.append(dict(off=float(clip.get('offset')), n=int(seq.get('numsamples')), blocks=blocks, env=pts))
        tracks[tr.get('name')] = dict(rate=int(float(tr.get('rate'))), gain=float(tr.get('gain')), clips=sorted(clips, key=lambda c: c['off']))
    return tracks, files


def read_au(path, n):
    b = open(path, 'rb').read()
    e = '<' if b[:4] == b'dns.' else '>'
    off, _, enc, _, _ = struct.unpack(e + '5I', b[4:24])
    assert enc == 6, f'{path}: not 32-bit float'
    return np.frombuffer(b, dtype=e + 'f4', offset=off, count=n).astype(np.float32)


def clip_audio(clip, rate, files):
    buf = np.zeros(clip['n'], np.float32)
    for start, name, ln in clip['blocks']:
        buf[start:start + ln] = read_au(files[name], ln)
    if any(abs(v - 1) > 1e-6 for _, v in clip['env']):
        buf *= np.interp(np.arange(clip['n']) / rate, [p[0] for p in clip['env']], [p[1] for p in clip['env']]).astype(np.float32)
    return buf


def span(clip, rate):
    return clip['off'], clip['off'] + clip['n'] / rate


def stretches(tracks, names, after=0.0):
    """Runs of clips that touch (within 0.5 s): one continuous piece of tape each."""
    spans = sorted(span(c, tracks[n]['rate']) for n in names for c in tracks[n]['clips'] if c['n'] / tracks[n]['rate'] > 0.05 and c['off'] >= after)
    runs = []
    for s, e in spans:
        if runs and s <= runs[-1][1] + 0.5:
            runs[-1][1] = max(runs[-1][1], e)
        else:
            runs.append([s, e])
    return runs


def fit(aup, measured):
    """measured: {'cam': align json, 'ground': align json}. Lateness d = heard - official, at the heard time.

    Inside a stretch the lateness at a moment is the median of the lines heard within 30 s of it (a tape off speed
    drifts, and one misheard line must not move the rest). A stretch with fewer than three lines that agree takes its
    nearest measured neighbour's lateness, within a minute; failing that it stays where the project has it."""
    tracks, _ = read_project(aup, None)
    radio_end = span(tracks[RADIO]['clips'][-1], tracks[RADIO]['rate'])[1]
    out = []
    for group, names, after in (('cam', CAM, 0.0), ('ground', GROUND, radio_end - 5)):
        ms = sorted((r['t'] + r['d'] - 18 * 3600, r['d']) for r in json.load(open(measured[group])) if r['agree'])
        edges = sorted({round(v, 2) for n in names for c in tracks[n]['clips'] for v in span(c, tracks[n]['rate'])})
        rows = []
        for s, e in stretches(tracks, names, after):
            pts = [(t, d) for t, d in ms if s - 0.3 <= t <= e + 0.3]
            ds = [d for _, d in pts]
            ok = len(pts) >= 3 or (len(pts) == 2 and abs(ds[0] - ds[1]) <= 1.2)
            knots = None
            if group == 'cam' and e <= BY_EAR_UNTIL:
                knots = [[round(s, 2), 0.0], [round(e, 2), 0.0]]
            elif ok:
                knots = []
                for t in [x for x in edges if s - 0.01 <= x <= e + 0.01]:
                    w = 30.0
                    near = [d for u, d in pts if abs(u - t) <= w]
                    while len(near) < min(4, len(pts)):
                        w += 10.0
                        near = [d for u, d in pts if abs(u - t) <= w]
                    knots.append([t, round(float(np.median(near)), 2)])
            rows.append(dict(group=group, s=round(s, 2), e=round(e, 2), n=len(pts), knots=knots, one=float(np.mean(ds)) if 1 <= len(pts) <= 2 else None))
        fitted = [r for r in rows if r['knots']]
        for r in rows:
            if r['knots'] is None:
                near = sorted((min(abs(r['s'] - q['e']), abs(q['s'] - r['e'])), q['knots'][-1 if q['e'] <= r['s'] else 0][1]) for q in fitted)
                guess = near[0][1] if near and near[0][0] <= 60 else None
                if r['one'] is not None and (guess is None or abs(r['one'] - guess) <= 2.0):
                    guess = r['one']
                r['guessed'] = True
                r['knots'] = [[r['s'], round(guess or 0.0, 2)], [r['e'], round(guess or 0.0, 2)]]
        for r in rows:
            r.pop('one')
        out += rows
    with open(RETIME, 'w') as f:
        f.write('[\n' + ',\n'.join(json.dumps(r) for r in out) + '\n]\n')
    for r in out:
        print('%-6s %7.1f-%7.1f n=%2d late %+5.2f .. %+5.2f %s' % (r['group'], r['s'], r['e'], r['n'], r['knots'][0][1], r['knots'][-1][1], '(neighbour)' if r.get('guessed') else ''))


def lateness(retime, group, t):
    for r in retime:
        if r['group'] == group and r['s'] - 0.02 <= t <= r['e'] + 0.02:
            return float(np.interp(t, [k[0] for k in r['knots']], [k[1] for k in r['knots']]))
    return 0.0


def place(out, buf, rate, t_from, t_to, gain):
    """buf, recorded at `rate`, is laid from t_from to t_to (stretched to fit), with 15 ms fades."""
    n = int(round((t_to - t_from) * RATE))
    if n < 32:
        return
    x = np.interp(np.linspace(0, len(buf) - 1, n), np.arange(len(buf)), buf).astype(np.float32)
    f = min(int(0.015 * RATE), n // 2)
    x[:f] *= np.linspace(0, 1, f, dtype=np.float32)
    x[-f:] *= np.linspace(1, 0, f, dtype=np.float32)
    a = int(round((t_from - T0) * RATE))
    s0, s1 = max(a, 0), min(a + n, len(out))
    if s1 > s0:
        out[s0:s1] += gain * x[s0 - a:s1 - a]


def render(aup, data_dir, dst, retime):
    tracks, files = read_project(aup, data_dir)
    n = int((T1 - T0) * RATE)
    cam, radio = np.zeros(n, np.float32), np.zeros(n, np.float32)
    hq = [span(c, tracks['Cockpit']['rate']) for c in tracks['Cockpit']['clips']]
    radio_end = span(tracks[RADIO]['clips'][-1], tracks[RADIO]['rate'])[1]
    for name in CAM + (RADIO,) + GROUND:
        tr = tracks[name]
        group = 'cam' if name in CAM else 'ground' if name in GROUND else None
        for c in tr['clips']:
            s, e = span(c, tr['rate'])
            if e - s <= 0.05 or (name in GROUND and s < radio_end - 5):
                continue  # before the radio channel ends, the ground tape only repeats it
            if name == 'LQ Cockpit' and sum(max(0.0, min(e, b) - max(s, a)) for a, b in hq) > 0.8 * (e - s):
                continue  # the better copy of the same seconds is there
            d0 = lateness(retime, group, s) if group else 0.0
            d1 = lateness(retime, group, e) if group else 0.0
            place(cam if name in CAM else radio, clip_audio(c, tr['rate'], files), tr['rate'], s - d0, e - d1, tr['gain'])
    if os.environ.get('STEM') == 'cam':  # one side alone, to measure it
        radio[:] = 0
    if os.environ.get('STEM') == 'radio':
        cam[:] = 0
    mix = np.stack([cam + 0.55 * radio, cam + 0.85 * radio], 1)  # the radio sits a little to the right
    mix *= 0.89 / float(np.abs(mix).max())
    tmp = dst + '.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', dst], check=True)
    os.remove(tmp)
    print(dst, '%.1f s' % (n / RATE))


def write_tracks(aup, data_dir, out_dir):
    tracks, files = read_project(aup, data_dir)
    n = int((T1 + 70 - T0) * RATE)
    for label, names in (('cam', CAM), ('radio', (RADIO,)), ('ground', GROUND)):
        buf = np.zeros(n, np.float32)
        for name in names:
            tr = tracks[name]
            for c in tr['clips']:
                s, e = span(c, tr['rate'])
                if e - s > 0.05:
                    x = clip_audio(c, tr['rate'], files)
                    m = int(round((e - s) * RATE)); i = int(round((s - T0) * RATE))
                    y = np.interp(np.linspace(0, len(x) - 1, m), np.arange(len(x)), x).astype(np.float32)
                    j0, j1 = max(i, 0), min(i + m, n)
                    if j1 > j0:
                        buf[j0:j1] += y[j0 - i:j1 - i]
        with wave.open(os.path.join(out_dir, label + '.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
            w.writeframes((np.clip(buf, -1, 1) * 32767).astype('<i2').tobytes())
        print(label, 'written')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'tracks':
        write_tracks(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == 'fit':
        fit(sys.argv[2], dict(cam=sys.argv[3], ground=sys.argv[4]))
    elif cmd == 'render':
        render(sys.argv[2], sys.argv[3], sys.argv[4], json.load(open(RETIME)))
    else:
        sys.exit(__doc__)
