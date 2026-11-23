"""테마 미리보기용 가상 술병 사진을 그린다 (실제 브랜드 없음).

  python3 scripts/make-preview-bottle.py scripts/preview-bottle.jpg
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
W, H = 900, 1500
F = '/usr/share/fonts/truetype/dejavu/'

# 배경: 밝은 벽과 나무 탁자
y = np.linspace(0, 1, H)[:, None, None]
bg = np.array([236, 232, 224]) * (1 - y * 0.12) + np.zeros((H, W, 3))
bg[int(H * 0.86):] = np.array([150, 112, 78])
img = Image.fromarray(np.clip(bg, 0, 255).astype('uint8'))

# 병 모양
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
cx = W // 2
d.rounded_rectangle([cx - 52, 180, cx + 52, 560], radius=18, fill=255)       # 목
d.pieslice([cx - 230, 470, cx + 230, 900], 180, 360, fill=255)               # 어깨
d.rectangle([cx - 230, 684, cx + 230, 1200], fill=255)
d.rounded_rectangle([cx - 230, 1100, cx + 230, 1300], radius=40, fill=255)   # 바닥
mask = mask.filter(ImageFilter.GaussianBlur(1.2))

# 유리 + 호박색 술 (병의 60%)
glass = np.zeros((H, W, 3))
xs = (np.arange(W) - cx) / 230.0
shade = np.clip(1 - xs ** 2, 0, 1) ** 0.5
glass[:] = np.array([214, 222, 220])
liquid_top = 820
amber = np.array([196, 128, 42])
glass[liquid_top:] = amber * (0.55 + 0.45 * shade[None, :, None])
glass[:liquid_top] = glass[:liquid_top] * (0.85 + 0.15 * shade[None, :, None])
# 세로 반사광
spec = (np.exp(-((xs + 0.55) / 0.06) ** 2) * 0.7 + np.exp(-((xs - 0.62) / 0.04) ** 2) * 0.35)[None, :, None]
glass = glass + (255 - glass) * spec
glass_img = Image.fromarray(np.clip(glass, 0, 255).astype('uint8'))
img.paste(glass_img, (0, 0), mask)

d = ImageDraw.Draw(img)
# 코르크 마개
d.rounded_rectangle([cx - 60, 120, cx + 60, 215], radius=14, fill=(92, 52, 34))
d.rectangle([cx - 60, 196, cx + 60, 215], fill=(176, 140, 76))

# 라벨 (가상 브랜드: MAISON LUNE)
L, T, R, B = cx - 190, 760, cx + 190, 1150
d.rectangle([L, T, R, B], fill=(242, 232, 208))
d.rectangle([L + 10, T + 10, R - 10, B - 10], outline=(120, 40, 46), width=3)
d.rectangle([L, T + 270, R, T + 320], fill=(120, 40, 46))
# 초승달 문장
d.ellipse([cx - 44, T + 34, cx + 44, T + 122], fill=(176, 140, 76))
d.ellipse([cx - 22, T + 26, cx + 60, T + 112], fill=(242, 232, 208))
def text(y, s, size, color, font='DejaVuSerif-Bold.ttf'):
    f = ImageFont.truetype(F + font, size)
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=color)
text(T + 138, 'MAISON LUNE', 38, (44, 30, 22))
text(T + 196, 'SINGLE CASK  ·  12', 26, (120, 40, 46), 'DejaVuSerif.ttf')
text(T + 280, 'RESERVE', 30, (242, 232, 208))
text(T + 340, 'Distilled & aged in oak', 20, (70, 56, 40), 'DejaVuSerif-Italic.ttf')
# 목 라벨
d.rectangle([cx - 54, 420, cx + 54, 470], fill=(120, 40, 46))
text(430, 'ML', 26, (242, 232, 208))

# 바닥 그림자
sh = Image.new('L', (W, H), 0)
ImageDraw.Draw(sh).ellipse([cx - 250, 1280, cx + 250, 1330], fill=120)
sh = sh.filter(ImageFilter.GaussianBlur(14))
img = Image.composite(Image.new('RGB', (W, H), (60, 40, 26)), img, sh.point(lambda v: int(v * 0.6)))
img.paste(glass_img.crop((0, 0, 1, 1)), (0, 0))
img.convert('RGB').save(OUT, quality=90)
