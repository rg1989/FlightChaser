#!/usr/bin/env python3
# tools/scenarios/n722bd/weather.py
# The sky of 1 November 2026 for the package (weather/): NEXRAD's composite at 17:45 UTC as tiles in RainViewer's layout and colours
# (client/scene/radar.ts reads each colour as one dBZ), the METARs near that time, an empty SIGMET list, and, from the Miami sounding,
# the wind and temperature by height (wind.json, for reconstruct.ts).
#   python3 -I tools/scenarios/n722bd/weather.py <sources/wx> <package folder>
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
src, pkg = sys.argv[1], sys.argv[2]
out = os.path.join(pkg, 'weather')
os.makedirs(out, exist_ok=True)

# ---- the radar
table = re.search(r"const UB_RAIN = \[(.*?)\]", open('client/scene/radar.ts').read(), re.S).group(1)
UB = [bytes.fromhex(h) for h in re.findall(r"'([0-9a-f]{8})'", table)]
rad = Image.open(os.path.join(src, 'n0q_1745.png'))
assert rad.mode == 'P'
data = rad.load()
Z = 7
N = 2 ** Z


def lonlat(px, py):
    lon = px / (256 * N) * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / (256 * N)))))
    return lon, lat


tiles = 0
top = 0
for x in range(int((-85 + 180) / 360 * N), int((-76 + 180) / 360 * N) + 1):
    for y in range(int((1 - math.asinh(math.tan(math.radians(30))) / math.pi) / 2 * N), int((1 - math.asinh(math.tan(math.radians(23.5))) / math.pi) / 2 * N) + 1):
        im = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
        px = im.load()
        echoes = 0
        for j in range(256):
            for i in range(256):
                lon, lat = lonlat(x * 256 + i + 0.5, y * 256 + j + 0.5)
                c, r = int((lon + 126) / 0.005), int((50 - lat) / 0.005)
                v = data[c, r] if 0 <= c < rad.width and 0 <= r < rad.height else 0
                if v == 0:
                    continue
                dbz = round(v * 0.5 - 32.5)
                if dbz < 5:
                    continue
                top = max(top, dbz)
                px[i, j] = tuple(UB[min(dbz, 94) + 10])
                echoes += 1
        if echoes:
            d = os.path.join(out, 'radar', '256', str(Z), str(x), str(y), '2')
            os.makedirs(d, exist_ok=True)
            im.save(os.path.join(d, '0_1.png'))
            tiles += 1
print(f'radar: {tiles} tiles, strongest {top} dBZ')

# ---- the METARs: of each station the last before 17:50 UTC
at = datetime(2026, 11, 1, 17, 50, tzinfo=timezone.utc).timestamp()
raw = json.load(open(os.path.join(src, 'metar.json')))
best = {}
for m in raw:
    t = m.get('obsTime')
    if t is None or t > at:
        continue
    if m['icaoId'] not in best or t > best[m['icaoId']]['obsTime']:
        best[m['icaoId']] = m
json.dump(list(best.values()), open(os.path.join(src, 'metar_1750.json'), 'w'))
print('metars:', len(best), [m['rawOb'] for k, m in best.items() if k in ('KPBI', 'KLNA')])
json.dump([], open(os.path.join(out, 'sigmet.json'), 'w'))

# ---- the cloud tops: GOES-East's infrared at 17:45 UTC (IEM's 8-bit frame: 0.04° a pixel from 52° N 130° W; brightness temperature
# 330 − b/2 K up to count 176, 418 − b K above it), as a frame of shared/sat.ts. A top is the height of its temperature in the sounding of 12:00 UTC:
# an estimate, low for thin cirrus. Colder than the sounding's coldest: the tropopause's height.
import struct

ir = Image.open(os.path.join(src, 'ir_1745.tif')).load()
sounding = [l for l in json.load(open(os.path.join(src, 'raob.json')))['profiles'][0]['profile'] if l.get('hght') is not None and l.get('tmpc') is not None]
freeze = 0


def top_m(t):
    for a, b in zip(sounding, sounding[1:]):
        if a['tmpc'] >= t > b['tmpc']:
            return a['hght'] + (a['tmpc'] - t) / (a['tmpc'] - b['tmpc']) * (b['hght'] - a['hght'])
    coldest = min(sounding, key=lambda l: l['tmpc'])
    return coldest['hght'] if t <= coldest['tmpc'] else 0


south, west, north, east = 24.5, -83.5, 29.5, -78.5
n = 125
cloud, seen, tops = bytearray(), bytearray(), []
for r in range(n):
    for c in range(n):
        lat = north - (r + 0.5) * (north - south) / n
        lon = west + (c + 0.5) * (east - west) / n
        v = ir[int((lon + 130) / 0.04), int((52 - lat) / 0.04)]
        t = (418 - v if v > 176 else 330 - v / 2) - 273.15
        share = min(1, max(0, (12 - t) / 8))  # warm: the sea or the land; 4 °C and colder: cloud
        cloud.append(round(share * 255))
        seen.append(1)
        tops.append(round(top_m(t)) if share > 0 else 0)
at_ms = 1793555100000  # 2026-11-01T17:45:00Z
head = b'FHS1' + struct.pack('<I', n) + struct.pack('<d', at_ms) + struct.pack('<4d', south, west, north, east)
open(os.path.join(out, 'sat.bin'), 'wb').write(head + bytes(cloud) + bytes(seen) + struct.pack(f'<{n * n}H', *tops))
print('sat: tallest top', max(tops), 'm')
