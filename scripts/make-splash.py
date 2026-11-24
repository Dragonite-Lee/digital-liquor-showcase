"""스플래시 그림(design/source/splash.png)의 실제 상표(라벨 글자, 문장, 목 메달)를 수채화 얼룩처럼 뭉갠다.

병 모양과 색, 라벨 띠는 남기고 글자·문장만 알아볼 수 없게 한다.
실행: python3 scripts/make-splash.py → assets/ui/splash.png
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent

# 750×1624 원본 기준 (left, top, right, bottom)
REGIONS = [
    (306, 1004, 352, 1054),  # 목의 메달
    (290, 1124, 380, 1203),  # 문장과 연도
    (278, 1203, 392, 1298),  # 라벨 글자
]


def main() -> None:
    img = Image.open(ROOT / 'design/source/splash.png').convert('RGBA')
    # 글자 획을 먼저 뭉개고(중앙값 필터) 부드럽게 번지게(가우시안) 한다
    smudged = img.filter(ImageFilter.MedianFilter(11)).filter(ImageFilter.GaussianBlur(3.5))
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    for box in REGIONS:
        draw.rounded_rectangle(box, radius=14, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6))
    img = Image.composite(smudged, img, mask)

    out = ROOT / 'assets/ui/splash.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    print(out)


if __name__ == '__main__':
    main()
