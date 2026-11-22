"""오래된 신문 오린 조각(종이 + 구김) 이미지를 만든다.

  python3 scripts/make-clippings.py assets/clipping

종이마다 두 장을 만든다.
  paper-<a>-<n>.png   빛바랜 신문지. 가운데 사진 칸, 둘레 기사 글줄, 아래 캡션, 찢긴 가장자리, 그림자.
  crease-<a>-<n>.png  구김 음영만 담은 회색판(50% 회색 = 변화 없음). 병 위에 overlay로 얹어 병까지 구겨 보이게 한다.
사진 칸의 위치는 src/components/Clipping.tsx 의 WINDOW 값과 같아야 한다.
"""
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
LONG = 760
WINDOW = dict(left=0.13, right=0.13, top=0.11, bottom=0.19)  # Clipping.tsx 와 같게
ASPECTS = {'narrow': 0.48, 'mid': 0.64, 'wide': 0.86}
SEEDS = [1, 2]
FONT = '/usr/share/fonts/truetype/dejavu/'
WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore '
         'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip '
         'ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla '
         'pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim').split()


def fbm(h, w, rng, octaves=5, base=4):
    """부드러운 잡음 (0~1)."""
    out = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        small = rng.random((n + 1, max(2, int(n * w / h)) + 1))
        img = Image.fromarray((small * 255).astype('uint8')).resize((w, h), Image.BICUBIC)
        out += np.asarray(img, float) / 255 * amp
        total += amp
        amp *= 0.5
    return out / total


def torn_mask(w, h, rng, margin):
    """가장자리가 찢긴 종이 모양 (0~255)."""
    y, x = np.mgrid[0:h, 0:w]
    d = np.minimum.reduce([x, w - 1 - x, y, h - 1 - y]).astype(float)
    wobble = (fbm(h, w, rng, octaves=6, base=3) - 0.5) * margin * 1.6
    fibers = (rng.random((h, w)) - 0.5) * 2.2
    edge = d - margin + wobble + fibers
    return np.clip(edge * 1.4 + 0.5, 0, 1)


def crumple(w, h, rng):
    """구겨졌다 펴진 종이의 음영 (-1~1). 작은 면들이 제각각 기울어 있고, 접힌 선 몇 개가 지나간다."""
    y, x = np.mgrid[0:h, 0:w].astype(float)
    light = np.array([-0.5, -0.65, 0.58])
    light /= np.linalg.norm(light)

    # 면: 보로노이 칸마다 기울기가 다르다
    n = int(rng.integers(240, 320))
    px, py = rng.random(n) * w, rng.random(n) * h
    tilt = rng.normal(0, 0.15, (n, 2))
    best = np.full((h, w), np.inf)
    cell = np.zeros((h, w), int)
    for i in range(n):
        d = (x - px[i]) ** 2 + (y - py[i]) ** 2
        closer = d < best
        best[closer] = d[closer]
        cell[closer] = i
    gx, gy = tilt[cell, 0], tilt[cell, 1]

    # 신문을 접었던 선 2~3개 (한쪽 밝고 한쪽 어두운 좁은 띠)
    for _ in range(int(rng.integers(2, 4))):
        cx, cy = rng.random() * w, rng.random() * h
        ang = rng.random() * np.pi
        nx, ny = np.cos(ang), np.sin(ang)
        dist = (x - cx) * nx + (y - cy) * ny
        band = np.exp(-(dist / 5) ** 2) * np.sign(dist) * rng.uniform(0.25, 0.45)
        gx += band * nx
        gy += band * ny

    # 잔주름
    bump = fbm(h, w, rng, octaves=5, base=10)
    by, bx = np.gradient(bump)
    gx += bx * 9
    gy += by * 9

    norm = np.sqrt(gx ** 2 + gy ** 2 + 1)
    shade = (-gx * light[0] - gy * light[1] + light[2]) / norm
    # 면과 면이 만나는 자리에 가는 주름선
    ridge = (np.diff(cell, axis=0, prepend=cell[:1]) != 0) | (np.diff(cell, axis=1, prepend=cell[:, :1]) != 0)
    shade = shade - ridge * 0.05
    shade = np.asarray(Image.fromarray(((shade + 1) * 127.5).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2)), float) / 127.5 - 1
    shade = (shade - shade.mean()) / (shade.std() + 1e-6)
    return np.clip(shade * 0.2, -1, 1)


def text_lines(draw, box, rng, size, color, italic=False):
    x0, y0, x1, y1 = box
    font = ImageFont.truetype(FONT + ('DejaVuSerifCondensed-Italic.ttf' if italic else 'DejaVuSerifCondensed.ttf'), size)
    lh = int(size * 1.32)
    y = y0
    while y + lh <= y1:
        line, w = [], 0
        while True:
            word = rng.choice(WORDS)
            ww = draw.textlength(word + ' ', font=font)
            if w + ww > x1 - x0:
                break
            line.append(word)
            w += ww
        if rng.random() < 0.08:  # 문단 끝
            line = line[: max(1, len(line) // 2)]
        draw.text((x0, y), ' '.join(line), font=font, fill=color)
        y += lh


def paper(aspect, seed):
    rng = np.random.default_rng(seed * 100 + int(aspect * 100))
    prng = random.Random(seed * 7 + int(aspect * 100))
    h = LONG
    w = int(LONG * aspect)
    pad = 26  # 그림자 자리
    W, H = w + pad * 2, h + pad * 2

    # 종이 바탕: 누렇게 바랜 신문지, 가장자리로 갈수록 더 탐
    base = np.array([226, 211, 176], float)
    tone = fbm(h, w, rng, octaves=5, base=3)
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx / w, (w - xx) / w, yy / h, (h - yy) / h])
    burn = np.clip(1 - edge * 5, 0, 1) ** 1.6
    col = base[None, None, :] * (0.93 + 0.1 * tone[..., None]) - burn[..., None] * np.array([40, 52, 66])
    grain = rng.normal(0, 5, (h, w, 1))
    col = col + grain
    # 얼룩(여우 반점)
    for _ in range(prng.randint(4, 9)):
        cx, cy, r = prng.random() * w, prng.random() * h, prng.uniform(4, 26)
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
        col -= (np.exp(-d ** 2) * prng.uniform(10, 26))[..., None] * np.array([0.6, 0.9, 1.3])

    img = Image.fromarray(np.clip(col, 0, 255).astype('uint8'))
    draw = ImageDraw.Draw(img)
    ink = (52, 42, 30)

    # 사진 칸
    L, R = int(w * WINDOW['left']), int(w * (1 - WINDOW['right']))
    T, B = int(h * WINDOW['top']), int(h * (1 - WINDOW['bottom']))
    photo = Image.new('L', (R - L, B - T), 0)
    pd = ImageDraw.Draw(photo)
    pitch = 5
    g = fbm(B - T, R - L, rng, octaves=3, base=2)
    for py in range(0, B - T, pitch):
        for px in range(0, R - L, pitch):
            v = 0.3 + 0.22 * g[min(py, B - T - 1), min(px, R - L - 1)]
            r = v * pitch * 0.62
            off = pitch / 2
            pd.ellipse([px + off - r, py + off - r, px + off + r, py + off + r], fill=255)
    photo_np = np.asarray(photo, float) / 255
    arr = np.asarray(img, float)
    region = arr[T:B, L:R]
    arr[T:B, L:R] = region * (1 - photo_np[..., None] * 0.3) + np.array(ink) * photo_np[..., None] * 0.3
    img = Image.fromarray(np.clip(arr, 0, 255).astype('uint8'))
    draw = ImageDraw.Draw(img)
    draw.rectangle([L - 3, T - 3, R + 2, B + 2], outline=ink, width=2)

    # 둘레 기사와 캡션
    size = max(9, int(w * 0.032))
    gap = int(w * 0.03)
    text_lines(draw, (-int(w * 0.2), -int(size * 0.6), L - gap, h), prng, size, ink)
    text_lines(draw, (R + gap, -int(size * 0.6), w + int(w * 0.3), h), prng, size, ink)
    text_lines(draw, (L, -int(size * 0.4), R, T - gap), prng, size, ink)
    cap_font = ImageFont.truetype(FONT + 'DejaVuSerifCondensed-BoldItalic.ttf', int(size * 1.15))
    draw.text((L, B + gap * 0.8), prng.choice(['Fig. ', 'Abb. ', 'Ill. ']) + str(prng.randint(2, 19)) + ' — '
              + ' '.join(prng.choice(WORDS) for _ in range(3)), font=cap_font, fill=ink)
    draw.line([L, B + gap * 0.8 + size * 1.7, R, B + gap * 0.8 + size * 1.7], fill=ink, width=1)
    text_lines(draw, (L, int(B + gap * 0.8 + size * 2.1), R, h + size), prng, size, ink)

    # 잉크가 고르게 안 묻은 느낌
    arr = np.asarray(img, float)
    blot = fbm(h, w, rng, octaves=4, base=10)
    arr = arr + (blot[..., None] - 0.5) * 26
    img = Image.fromarray(np.clip(arr, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.45))

    # 구김
    shade = crumple(w, h, rng)
    arr = np.asarray(img, float)
    arr = np.where(shade[..., None] > 0, arr + (255 - arr) * shade[..., None] * 0.5, arr * (1 + shade[..., None] * 0.42))

    mask = torn_mask(w, h, rng, margin=10)
    # 찢긴 자리는 속 섬유가 드러나 더 밝다
    rim = np.clip(mask * (1 - torn_mask(w, h, np.random.default_rng(seed), margin=17)) * 1.8, 0, 1)
    arr = arr * (1 - rim[..., None] * 0.6) + np.array([240, 232, 212]) * rim[..., None] * 0.6

    paper_rgba = np.zeros((H, W, 4))
    paper_rgba[pad:pad + h, pad:pad + w, :3] = arr
    paper_rgba[pad:pad + h, pad:pad + w, 3] = mask * 255
    # 그림자
    sh = Image.fromarray(np.uint8(np.pad(mask, pad) * 255)).filter(ImageFilter.GaussianBlur(9))
    sh = np.roll(np.roll(np.asarray(sh, float), 6, 0), 4, 1) / 255 * 0.5
    a = paper_rgba[..., 3] / 255
    out_a = a + sh * (1 - a)
    out_rgb = (paper_rgba[..., :3] * a[..., None] + np.array([12, 8, 4]) * (sh * (1 - a))[..., None]) / np.maximum(out_a, 1e-6)[..., None]
    out = np.dstack([out_rgb, out_a * 255])

    crease = np.zeros((H, W, 4))
    crease[pad:pad + h, pad:pad + w, :3] = (128 + shade * 127 * 0.85)[..., None]
    # 사진 칸에도 망점이 겹쳐 보이게 (overlay에서 어두운 점)
    dots = np.ones((h, w)) * 0
    dots[T:B, L:R] = photo_np
    crease[pad:pad + h, pad:pad + w, :3] -= dots[..., None] * 26
    crease[pad:pad + h, pad:pad + w, 3] = mask * 255
    return out, crease, (W, H)


for name, aspect in ASPECTS.items():
    for seed in SEEDS:
        p, c, size = paper(aspect, seed)
        Image.fromarray(np.clip(p, 0, 255).astype('uint8'), 'RGBA').save(f'{OUT}/paper-{name}-{seed}.png', optimize=True)
        Image.fromarray(np.clip(c, 0, 255).astype('uint8'), 'RGBA').convert('LA').save(f'{OUT}/crease-{name}-{seed}.png', optimize=True)
        print(name, seed, size)


# 앱에서 쓸 목록: 파일마다 이미지 비율과 사진 칸 위치(이미지 기준 0~1)
PAD = 26
lines = [
    '// scripts/make-clippings.py 가 만든 파일. 직접 고치지 말 것.',
    '/* eslint-disable */',
    'export const CLIPPINGS = [',
]
for name, aspect in ASPECTS.items():
    w = int(LONG * aspect)
    W, H = w + PAD * 2, LONG + PAD * 2
    win = dict(
        left=(PAD + w * WINDOW['left']) / W,
        top=(PAD + LONG * WINDOW['top']) / H,
        width=w * (1 - WINDOW['left'] - WINDOW['right']) / W,
        height=LONG * (1 - WINDOW['top'] - WINDOW['bottom']) / H,
    )
    for seed in SEEDS:
        lines.append(
            f"  {{ aspect: {W / H:.4f}, window: {{ left: {win['left']:.4f}, top: {win['top']:.4f}, "
            f"width: {win['width']:.4f}, height: {win['height']:.4f} }}, "
            f"paper: require('../../assets/clipping/paper-{name}-{seed}.png'), "
            f"crease: require('../../assets/clipping/crease-{name}-{seed}.png') }},"
        )
lines.append('] as const;\n')
with open('src/components/clippingAssets.ts', 'w') as f:
    f.write('\n'.join(lines))
