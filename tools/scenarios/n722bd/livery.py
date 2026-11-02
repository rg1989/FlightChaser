#!/usr/bin/env python3
# tools/scenarios/n722bd/livery.py
# N722BD's paint as the package's decals (livery/body.png: the cheatlines over the model's paint.body box; livery/fin.png: the
# registration). The points are read off side photographs of the aircraft (JetPhotos 2022-2024, reference only; not in the package):
# pixels of a left-side photo at 74 px to the metre, the nose tip at x 35, the centre line at y 298.
#   python3 tools/scenarios/n722bd/livery.py public/scenarios/n722bd
import os
import sys
from PIL import Image, ImageDraw, ImageFont

S = 2  # supersampled
W, H = 2048 * S, 458 * S
Z = (W / 17.88)  # px per metre
Y_TOP = 2.76
BLACK, GOLD, GLASS, FRAME, SEAM = (14, 15, 18, 255), (190, 152, 86, 255), (20, 28, 38, 255), (42, 52, 74, 255), (150, 154, 160, 255)


def pt(x, py):  # photo px → image px
    s, y = (x - 35) / 74, (298 - py) / 74
    return (s * Z, (Y_TOP - y) * Z)


def main(folder):
    d = os.path.join(folder, 'livery')
    os.makedirs(d, exist_ok=True)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(im)
    poly = lambda pts, c: g.polygon([pt(*p) for p in pts], fill=c)
    # The chin and the first band, rising from the keel to the engine.
    poly([(25, 345), (70, 349), (200, 351), (300, 352), (345, 350), (400, 335), (470, 322), (540, 312), (620, 304), (700, 299), (780, 295), (815, 293),
          (815, 305), (760, 310), (700, 314), (620, 322), (560, 328), (500, 338), (450, 348), (400, 360), (345, 390), (25, 390)], BLACK)
    # The second, thin at the wing and wide under the engine, to the tail.
    poly([(455, 337), (560, 330), (640, 325), (720, 320), (800, 312), (880, 302), (960, 298), (1040, 300), (1095, 306),
          (1095, 314), (1050, 325), (1000, 335), (930, 345), (870, 350), (800, 345), (720, 340), (640, 336), (560, 333)], BLACK)
    # The gold pinstripe.
    g.line([pt(*p) for p in [(365, 330), (470, 312), (560, 300), (680, 290), (780, 283), (880, 279), (1000, 275), (1130, 268)]], fill=GOLD, width=int(0.05 * Z))
    # The cockpit's side windows and windscreen.
    poly([(186, 285), (248, 243), (318, 241), (318, 273), (232, 282)], FRAME)
    poly([(196, 281), (250, 248), (290, 247), (290, 272), (232, 278)], GLASS)
    poly([(295, 247), (312, 247), (312, 270), (295, 271)], GLASS)
    # The door's outline.
    g.rectangle([pt(337, 242), pt(385, 313)], outline=SEAM, width=int(0.018 * Z))
    # The decal's layout (client/livery/raster.ts): the left side in the top half, the right in the bottom, the nose at the left in both.
    side = im.resize((W // S, H // S), Image.LANCZOS)
    two = Image.new('RGBA', (side.width, side.height * 2), (0, 0, 0, 0))
    two.paste(side, (0, 0))
    two.paste(side, (0, side.height))
    two.save(os.path.join(d, 'body.png'))

    size = 512
    fin = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf', 118)
    t = ImageDraw.Draw(fin)
    box = t.textbbox((0, 0), 'N722BD', font=font)
    t.text(((size - box[2] + box[0]) / 2 - box[0], (size - box[3] + box[1]) / 2 - box[1]), 'N722BD', font=font, fill=(214, 170, 74, 255))
    fin.save(os.path.join(d, 'fin.png'))


main(sys.argv[1])
