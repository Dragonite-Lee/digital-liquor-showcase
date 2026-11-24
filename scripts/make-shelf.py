"""수채화 진열장(design/source/shelf.png)을 다시 짜서 assets/ui/shelf.png와 칸 좌표(src/components/cabinet/shelf.json)를 만든다.

- 가로: 양쪽 기둥과 조명은 그대로 두고 가운데 안쪽만 늘린다(선반·유리·원목 띠가 가로 띠라 늘려도 자연스럽다).
- 세로: 원본 5단 중 일부 단을 빼고, 남은 칸 안쪽을 높여 병이 크게 서게 한다. 원목 띠(메모지 자리)는 두껍게 한다.
- 원본 좌표는 1064×1346 원본 기준으로 잰 값이다.

실행: python3 scripts/make-shelf.py
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/source/shelf.png'

WIDEN = 1.6  # 가로 배율 (기둥 바깥 너비 기준)
KEEP_BAYS = [0, 1, 3, 4]  # 원본 5단 중 남길 단 (위에서부터 0)
BAY_SCALE = 1.85  # 칸 안쪽 높이 배율
LIP_SCALE = 1.6  # 원목 띠 두께 배율
GLASS = 14  # 유리 선반 두께(px) — 늘리지 않는다

# 원본에서 잰 좌표
CROP = (133, 0, 806, 1300)  # 번지는 빛까지 포함한 범위
FRAME_X = (214, 681)  # 바깥 기둥
INNER_X = (250, 647)  # 칸 안쪽
SPLIT_X = (330, 570)  # 이 사이(조명보다 안쪽)만 늘린다
HEAD = 212  # 장 윗판 아래 끝 = 첫 칸 시작
BAY_FLOORS = [379, 569, 760, 956, 1159]  # 각 단 유리 윗면
LIP_BOTTOMS = [412, 606, 795, 990]  # 각 단 아래 원목 띠 끝 (마지막 단은 받침대)
BASE_END = 1250


def stretch_x(img: Image.Image):
    a, b = SPLIT_X[0] - CROP[0], SPLIT_X[1] - CROP[0]
    w, h = img.size
    extra = round((FRAME_X[1] - FRAME_X[0]) * (WIDEN - 1))
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


def vertical_plan():
    """원본 세로 구간 목록: (시작, 끝, 배율, 이름). 배율 0인 구간은 뺀다."""
    plan = [(0, HEAD, 1.0, 'head')]
    top = HEAD
    for i, floor in enumerate(BAY_FLOORS):
        keep = i in KEEP_BAYS
        lip_end = LIP_BOTTOMS[i] + 1 if i < len(LIP_BOTTOMS) else None
        plan.append((top, floor - GLASS, BAY_SCALE if keep else 0, f'bay{i}'))
        plan.append((floor - GLASS, floor + 1, 1.0 if keep else 0, f'glass{i}'))
        if lip_end is not None:
            plan.append((floor + 1, lip_end, LIP_SCALE if keep else 0, f'lip{i}'))
            top = lip_end
    plan.append((BAY_FLOORS[-1] + 1, CROP[3], 1.0, 'base'))
    return plan


def stretch_y(img: Image.Image):
    w = img.width
    pieces, where, y = [], {}, 0
    for start, end, scale, name in vertical_plan():
        if scale == 0:
            continue
        piece = img.crop((0, start, w, end))
        new_h = round((end - start) * scale)
        if new_h != piece.height:
            piece = piece.resize((w, new_h), Image.LANCZOS)
        pieces.append(piece)
        where[name] = (y, y + new_h)
        y += new_h
    out = Image.new('RGBA', (w, y))
    cursor = 0
    for p in pieces:
        out.paste(p, (0, cursor))
        cursor += p.height
    return out, where


def main() -> None:
    img = Image.open(SRC).convert('RGBA').crop(CROP)
    img, mx = stretch_x(img)
    img, where = stretch_y(img)
    W, H = img.size

    out = ROOT / 'assets/ui/shelf.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)

    bays = []
    for n, i in enumerate(KEEP_BAYS):
        top, glass_top = where[f'bay{i}']
        if f'lip{i}' in where:
            lip = list(where[f'lip{i}'])
        else:  # 맨 아래 단은 받침대 윗부분에 메모지를 붙인다
            base = where['base'][0]
            lip = [base, base + round(46 * LIP_SCALE)]
        bays.append({'top': top, 'floor': glass_top + GLASS - 6, 'lip': lip})

    r = lambda v: round(v, 1)
    geo = {
        'width': W,
        'height': H,
        'frame': [r(mx(FRAME_X[0])), r(mx(FRAME_X[1]))],
        'inner': [r(mx(INNER_X[0])), r(mx(INNER_X[1]))],
        # 칸마다: top(칸 위) · floor(유리 윗면, 병이 서는 선) · lip(메모지 붙이는 원목 띠 위·아래)
        'bays': bays,
    }
    (ROOT / 'src/components/cabinet/shelf.json').write_text(json.dumps(geo, indent=2) + '\n')
    print(out, W, H, 'frame aspect', round((geo['frame'][1] - geo['frame'][0]) / (where['base'][1] - 177), 2))


if __name__ == '__main__':
    main()
