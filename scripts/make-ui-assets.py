"""종이 배경과 버튼 아이콘을 assets/ui로 내보낸다.

- paper.png: 스플래시 그림 위쪽(병이 없는 종이 부분)을 위아래로 이어 붙여 만든 전체 화면 종이 배경
- camera.png, cabinet.png: 받은 아이콘을 투명 여백만 잘라 그대로 쓴다
- assets/icon.png 외 Android 적응형 아이콘: design/source/app-icon.png에서 만든다
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


def app_icon() -> None:
    """앱 아이콘: 둥근 모서리 밖(투명)을 종이색으로 채운 정사각형. iOS가 모서리를 다시 둥글게 깎는다."""
    src = Image.open(SRC / 'app-icon.png').convert('RGBA')
    w, h = src.size
    # 모서리 바로 안쪽 종이색을 바탕으로 쓴다
    edge = src.convert('RGB').crop((w // 2 - 40, 8, w // 2 + 40, 40))
    paper = tuple(int(v) for v in np.asarray(edge).reshape(-1, 3).mean(0))
    flat = Image.new('RGBA', src.size, paper + (255,))
    flat.alpha_composite(src)
    flat = flat.convert('RGB').resize((1024, 1024), Image.LANCZOS)
    flat.save(ROOT / 'assets/icon.png', optimize=True)
    flat.resize((48, 48), Image.LANCZOS).save(ROOT / 'assets/favicon.png')

    # Android 적응형 아이콘: 원·둥근사각형으로 잘려도 병이 남도록 72%로 줄여 가운데에
    bg = Image.new('RGB', (1024, 1024), paper)
    small = flat.resize((738, 738), Image.LANCZOS)
    bg.paste(small, (143, 143))
    bg.save(ROOT / 'assets/android-icon-background.png', optimize=True)
    Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)).save(ROOT / 'assets/android-icon-foreground.png')
    # 단색(테마) 아이콘: 어두운 병 부분만 남긴 실루엣
    gray = np.asarray(small.convert('L')).astype(float)
    alpha = np.clip((185 - gray) * 3, 0, 255).astype('uint8')
    mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    mono.paste(Image.merge('RGBA', [Image.new('L', small.size, 255)] * 3 + [Image.fromarray(alpha)]), (143, 143))
    mono.save(ROOT / 'assets/android-icon-monochrome.png', optimize=True)
    print('icon', paper)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    paper()
    # 스플래시는 받은 그림(상표 모자이크 처리됨)을 그대로 쓴다
    Image.open(SRC / 'splash.png').save(OUT / 'splash.png', optimize=True)
    icon('camera-button.png', 'camera.png')
    icon('cabinet-icon.png', 'cabinet.png')
    for name in ('badge', 'icon-close', 'icon-share', 'icon-back'):
        Image.open(SRC / f'{name}.png').save(OUT / f'{name}.png', optimize=True)
    app_icon()
