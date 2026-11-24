"""종이 배경과 버튼 아이콘을 assets/ui로 내보낸다.

- paper.png: 스플래시 그림 위쪽(병이 없는 종이 부분)을 위아래로 이어 붙여 만든 전체 화면 종이 배경
- camera.png, cabinet.png: 받은 아이콘을 투명 여백만 잘라 그대로 쓴다
실행: python3 scripts/make-ui-assets.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/source'
OUT = ROOT / 'assets/ui'

CLEAN_UNTIL = 880  # 스플래시에서 병 그림이 시작되기 전까지(위에서부터 px)


def paper() -> None:
    src = Image.open(SRC / 'splash.png').convert('RGB')
    w, h = src.size
    top = src.crop((0, 0, w, CLEAN_UNTIL))
    rest = ImageOps.flip(top).crop((0, 0, w, h - CLEAN_UNTIL))
    out = Image.new('RGB', (w, h))
    out.paste(top, (0, 0))
    out.paste(rest, (0, CLEAN_UNTIL))
    out.save(OUT / 'paper.png', optimize=True)
    px = np.asarray(top).reshape(-1, 3).mean(0)
    print('paper', out.size, 'average', '#%02X%02X%02X' % tuple(int(v) for v in px))


def icon(name: str, out: str) -> None:
    img = Image.open(SRC / name).convert('RGBA')
    box = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    img = img.crop(box) if box else img
    img.save(OUT / out, optimize=True)
    print(out, img.size)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    paper()
    icon('camera-button.png', 'camera.png')
    icon('cabinet-icon.png', 'cabinet.png')
