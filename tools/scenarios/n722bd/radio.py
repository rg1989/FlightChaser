#!/usr/bin/env python3
# tools/scenarios/n722bd/radio.py
# The Miami Center radio for N722BD: its captions (transcript.csv) and its audio (local/radio.m4a, git-ignored), from VASAviation's
# video of the LiveATC recording (.work/n722bd/sources/video/8ri8h7dg8nE.mp4). Each line's words are VASAviation's own on-screen caption;
# nobody official has confirmed them (q=H). The clock is the one in that video: its radar replay of the ADS-B, read per second.
# It runs at 1:1 from 17:47 on and faster before (silences cut out), so each transmission is a clip of its own at its own time.
# VASAviation muted the aircraft's transmissions on purpose from 17:48:38 on; those lines are captions only.
#
#   python3 tools/scenarios/n722bd/radio.py <the video> <package folder>
# Prints the `clips` for scenario.json.
import csv
import json
import os
import subprocess
import sys

# Local EST clock of the video's frame at video second t: read off the frames (.work/n722bd/sources/video/clk_sheet.png).
L = lambda hhmmss: sum(int(x) * f for x, f in zip(hhmmss.split(':'), (3600, 60, 1))) - 5 * 3600
PIC, ATC = 'N722BD', 'ZMA'
# (video from, video to, clock, speaker, words); from/to None: no sound (muted by the source)
LINES = [
    (10.1, 18.9, '17:30:05', ATC, 'N722BD, Miami Center, roger. There\'s moderate precipitation 11 o\'clock and 5 miles, scattered 150 miles to the southeast. You can deviate left and right. When able proceed direct FEMID.'),
    (29.0, 32.3, '17:31:25', PIC, 'Center, N2BD requesting direct Freeport.'),
    (33.0, 34.0, '17:31:33', ATC, 'That was unreadable.'),
    (34.0, 38.0, '17:31:35', PIC, '722BD requesting direct Freeport.'),
    (38.0, 42.0, '17:31:42', ATC, 'N722BD, cleared direct Freeport.'),
    (42.0, 44.0, '17:31:50', PIC, 'Cleared direct Freeport, thanks; 2BD.'),
    (44.0, 51.3, '17:31:53', ATC, 'N722BD, the turn to Freeport looks pretty bad. There is a moderate to extreme precipitation 11 o\'clock and 25 miles, 100 miles in diameter.'),
    (52.9, 55.8, '17:32:09', PIC, 'Roger, we\'ll look at it; 2BD.'),
    (58.8, 62.0, '17:32:21', PIC, 'Center, 722BD, we\'re just going to do FIMED and then Freeport.'),
    (62.0, 64.3, '17:32:27', ATC, 'N722BD, roger.'),
    (69.1, 73.5, '17:33:22', ATC, 'N722BD, descend and maintain FL350.'),
    (73.5, 75.4, '17:34:12', PIC, 'Descend FL350; 2BD.'),
    (79.0, 81.0, '17:35:02', PIC, '2BD, [unintelligible]'),
    (91.6, 94.9, '17:37:23', ATC, '2BD, approved to deviate.'),
    (97.3, 101.5, '17:37:58', ATC, 'N722BD, deviations left or right of course are approved, Freeport when able.'),
    (101.5, 104.0, '17:38:13', PIC, 'Freeport when able, going left; 2BD.'),
    (104.0, 107.5, '17:38:23', ATC, 'N2BD, Miami Center 125.07.'),
    (107.5, 109.9, '17:38:35', PIC, '25.07, 2BD.'),
    (139.4, 147.3, '17:47:00', PIC, 'Miami, 722BD, FL350 turning direct Freeport. We have light clear ice that is manageable and moderate turbulence.'),
    (154.0, 158.0, '17:47:16', ATC, 'Aircraft with light clear ice and moderate turbulence, say again.'),
    (158.0, 166.5, '17:47:21', PIC, '722BD, FL350, moderate turbulence. Plus or minus - okay, now 700 feet, 600 feet...'),
    (167.2, 171.0, '17:47:30', ATC, 'N-- roger, say outside air temperature.'),
    (171.0, 176.5, '17:47:34', PIC, '-47°C, we\'re managing the ice but it is moderate turbulence. We\'re direct Freeport.'),
    (177.1, 181.5, '17:47:41', ATC, 'Okay, N722BD, roger, let me know if you need anything else. I\'m just working you to my airspace right now.'),
    (181.5, 186.1, '17:47:46', PIC, 'Thank you, if you have any better rides, let us know; 2BD.'),
    (186.7, 194.3, '17:47:51', ATC, 'N2BD, the ride should improve in my airspace. You\'re kinda far outside of it right now. You can expect better rides ahead.'),
    (195.3, 198.0, '17:48:00', PIC, 'Roger, 2BD, and now we\'re picking up precipitation...'),
    (198.0, 202.0, '17:48:03', PIC, 'We need to climb FL370 if able, 2BD.'),
    (202.7, 208.0, '17:48:07', ATC, 'N722BD, roger, climb and maintain FL370, no further right than your present heading for traffic.'),
    (208.0, 210.8, '17:48:13', PIC, 'Climb FL370, 2BD.'),
    (223.4, 228.8, '17:48:29', PIC, '722BD, we\'re descending 8000 - MAYDAY MAYDAY, we\'re descending 10000 feet per minute.'),
    (229.5, 232.8, '17:48:35', ATC, 'N722BD, roger.'),
    (None, None, '17:48:38', PIC, 'Declaring an emergency, 722BD!'),
    (None, None, '17:48:42', PIC, 'Descending 20,000 feet per minute!'),
    (239.6, 243.9, '17:48:46', ATC, 'N722BD, roger, altitude your discretion. Let me know what you need.'),
    (None, None, '17:48:56', PIC, 'We\'re going to crash into the ground, 722BD.'),
    (254.9, 257.4, '17:49:01', ATC, 'N2BD, I\'m here with you. Talk to me.'),
    (None, None, '17:49:04', PIC, 'We are descending 22,000 feet...'),
    (None, None, '17:49:06', PIC, '...and we are banking... 60 degrees...'),
    (268.6, 272.3, '17:49:15', ATC, 'N2BD, roger--'),
    (None, None, '17:49:20', PIC, 'But look outside, Jack! Look outside!'),
    (None, None, '17:49:22', PIC, 'Holy fuck! We\'re out of ti--'),
]


def main(video, folder):
    def utc2local(s):
        h, m, sec = s.split(':')
        return f'{int(h) - 5:02d}:{m}:{sec}'

    with open(os.path.join(folder, 'transcript.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow('time,dur,speaker,to,channel,lang,text,original,q,src'.split(','))
        for a, b, at, who, text in LINES:
            dur = '' if a is None else f'{max(2.5, b - a):.1f}'
            w.writerow([utc2local(at), dur, who, ATC if who == PIC else PIC, 'radio', 'en', text, '', 'H', 'VASA'])

    os.makedirs(os.path.join(folder, 'local'), exist_ok=True)
    clips = []
    parts = []
    pos = 0.0
    for a, b, at, who, text in LINES:
        if a is None:
            continue
        parts.append(f'between(t,{a},{b})')
        clips.append({'from': round(pos, 2), 'to': round(pos + b - a, 2), 'at': utc2local(at)})
        pos += b - a
    out = os.path.join(folder, 'local', 'radio.m4a')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vn', '-af', f"aselect='{'+'.join(parts)}',asetpts=N/SR/TB", '-ac', '1', '-c:a', 'aac', '-b:a', '96k', out], check=True)
    print(json.dumps(clips))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
