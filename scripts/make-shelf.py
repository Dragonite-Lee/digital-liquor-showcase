"""수채화 진열장(design/source/shelf.png)을 넓혀 assets/ui/shelf.png와 칸 좌표(src/components/cabinet/shelf.json)를 만든다.

- 가로: 양쪽 기둥과 조명은 그대로 두고 가운데 안쪽만 늘린다(선반·유리·원목 띠가 가로 띠라 늘려도 자연스럽다).
- 세로: 선반 아래 원목 띠(메모지 붙이는 자리)만 두껍게 한다.
- 원본 좌표는 1064×1346 원본 기준으로 잰 값이다.

실행: python3 scripts/make-shelf.py [가로 배율=1.6] [원목 띠 배율=1.6]
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/source/shelf.png'

WIDEN = float(sys.argv[1]) if len(sys.argv) > 1 else 1.6
LIP_SCALE = float(sys.argv[2]) if len(sys.argv) > 2 else 1.6

# 원본에서 잰 좌표
CROP = (133, 0, 806, 1300)  # 번지는 빛까지 포함한 범위
FRAME_X = (214, 681)  # 바깥 기둥
INNER_X = (250, 647)  # 칸 안쪽
SPLIT_X = (330, 570)  # 이 사이(조명보다 안쪽)만 늘린다
BAYS = [(212, 379), (413, 569), (607, 760), (796, 956), (991, 1159)]  # 칸: 위(조명) ~ 유리 윗면
LIPS = [(380, 412), (570, 606), (761, 795), (957, 990)]  # 유리 아래 원목 띠
BASE = (1160, 1250)


def stretch_x(img: Image.Image) -> tuple[Image.Image, callable]:
    a, b = SPLIT_X[0] - CROP[0], SPLIT_X[1] - CROP[0]
    w, h = img.size
    frame_w = FRAME_X[1] - FRAME_X[0]
    extra = round(frame_w * (WIDEN - 1))
    mid = img.crop((a, 0, b, h)).resize((b - a + extra, h), Image.LANCZOS)
    out = Image.new('RGBA', (w + extra, h))
    out.paste(img.crop((0, 0, a, h)), (0, 0))
    out.paste(mid, (a, 0))
    out.paste(img.crop((b, 0, w, h)), (a + mid.width, 0))

    def mx(x: float) -> float:
        x -= CROP[0]
        if x <= a:
            return x
        if x >= b:
            return x + extra
        return a + (x - a) * (mid.width / (b - a))

    return out, mx


def stretch_y(img: Image.Image) -> tuple[Image.Image, callable]:
    w, h = img.size
    pieces, cursor, marks = [], 0, []
    for top, bottom in LIPS:
        pieces.append(img.crop((0, cursor, w, top)))
        lip = img.crop((0, top, w, bottom + 1))
        pieces.append(lip.resize((w, round(lip.height * LIP_SCALE)), Image.LANCZOS))
        marks.append((top, bottom + 1, round(lip.height * LIP_SCALE)))
        cursor = bottom + 1
    pieces.append(img.crop((0, cursor, w, h)))
    out = Image.new('RGBA', (w, sum(p.height for p in pieces)))
    y = 0
    for p in pieces:
        out.paste(p, (0, y))
        y += p.height

    def my(v: float) -> float:
        shift = 0.0
        for top, bottom, new_h in marks:
            if v >= bottom:
                shift += new_h - (bottom - top)
            elif v > top:
                return v + shift + (v - top) * (new_h / (bottom - top) - 1)
        return v + shift

    return out, my


def main() -> None:
    img = Image.open(SRC).convert('RGBA').crop(CROP)
    img, mx = stretch_x(img)
    img, my = stretch_y(img)
    W, H = img.size

    out = ROOT / 'assets/ui/shelf.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)

    r = lambda v: round(v, 1)
    geo = {
        'width': W,
        'height': H,
        'frame': [r(mx(FRAME_X[0])), r(mx(FRAME_X[1]))],
        'inner': [r(mx(INNER_X[0])), r(mx(INNER_X[1]))],
        # 칸마다: top(칸 위) · floor(유리 윗면, 병이 서는 선) · lip(원목 띠 위·아래)
        'bays': [
            {
                'top': r(my(t)),
                'floor': r(my(f - 6)),
                'lip': [r(my(LIPS[i][0])), r(my(LIPS[i][1] + 1))] if i < len(LIPS) else [r(my(BASE[0])), r(my(BASE[0] + 46))],
            }
            for i, (t, f) in enumerate(BAYS)
        ],
    }
    (ROOT / 'src/components/cabinet/shelf.json').write_text(json.dumps(geo, indent=2) + '\n')
    print(out, W, H)
    print(json.dumps(geo))


if __name__ == '__main__':
    main()
