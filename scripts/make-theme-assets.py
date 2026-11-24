"""테마 미리보기(design/source/themes/<id>.png)를 앱용 assets/themes/<id>.jpg로 만든다.

미리보기는 앱에 들어가는 그림이라 실제 상표(라벨 글자·문장·목 메달)를 뭉갠다.
좌표는 900×1200으로 줄인 그림 기준 (left, top, right, bottom).
실행: python3 scripts/make-theme-assets.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SIZE = (900, 1200)

# 네 그림 모두 같은 구도라 영역이 거의 같다. 조금씩 어긋나는 만큼 넉넉히 잡는다.
# (영역, 세기): 글자가 있는 라벨 띠는 세게, 문장·메달은 모양이 남을 만큼만
REGIONS = {
    'default': [((400, 265, 490, 375), 1), ((355, 520, 552, 690), 1), ((322, 690, 578, 900), 2)],
}
STRENGTH = {1: (11, 4), 2: (17, 7)}  # (중앙값 필터 크기, 가우시안 반경)


def smudge(img: Image.Image, boxes) -> Image.Image:
    for box, level in boxes:
        median, blur = STRENGTH[level]
        soft = img.filter(ImageFilter.MedianFilter(median)).filter(ImageFilter.GaussianBlur(blur))
        mask = Image.new('L', img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(box, radius=26, fill=255)
        img = Image.composite(soft, img, mask.filter(ImageFilter.GaussianBlur(10)))
    return img


def main() -> None:
    out_dir = ROOT / 'assets/themes'
    out_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted((ROOT / 'design/source/themes').glob('*.png')):
        img = Image.open(src).convert('RGB').resize(SIZE, Image.LANCZOS)
        img = smudge(img, REGIONS.get(src.stem, REGIONS['default']))
        out = out_dir / f'{src.stem}.jpg'
        img.save(out, quality=86, optimize=True, progressive=True)
        print(out, img.size)


if __name__ == '__main__':
    main()
