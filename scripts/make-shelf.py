"""수채화 진열장(design/source/shelf.png)을 assets/ui/shelf.png로 내보내고 칸 좌표(src/components/cabinet/shelf.json)를 만든다.

그림은 3단 진열장 그대로 쓴다. 좌표는 920×1378 원본에서 잰 값이다.
실행: python3 scripts/make-shelf.py
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/source/shelf.png'

FRAME_X = (164, 754)  # 바깥 기둥
INNER_X = (222, 698)  # 병을 세울 안쪽 (유리 선반 폭보다 조금 안쪽)
# 칸마다: 칸 위(조명) · 병이 서는 유리 윗면 · 명패를 붙일 원목 띠 위·아래
BAYS = [
    (263, 500, (522, 563)),
    (573, 790, (818, 863)),
    (871, 1096, (1125, 1176)),  # 맨 아래는 받침대 윗판
]


def main() -> None:
    img = Image.open(SRC).convert('RGBA')
    out = ROOT / 'assets/ui/shelf.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    geo = {
        'width': img.width,
        'height': img.height,
        'frame': list(FRAME_X),
        'inner': list(INNER_X),
        'bays': [{'top': t, 'floor': f, 'lip': list(lip)} for t, f, lip in BAYS],
    }
    (ROOT / 'src/components/cabinet/shelf.json').write_text(json.dumps(geo, indent=2) + '\n')
    print(out, img.size)


if __name__ == '__main__':
    main()
