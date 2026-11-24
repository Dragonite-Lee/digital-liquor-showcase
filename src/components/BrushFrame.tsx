import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { paper } from '@/theme';

type Props = {
  radius: number;
  /** 평균 굵기 (피그마 Stroke 2) */
  width?: number;
  color?: string;
  /** 같은 모양이 반복되지 않게 카드마다 다른 값 */
  seed?: number;
};

/**
 * 피그마 "Brush" 스트로크 느낌의 둥근 테두리. 부모를 꽉 채워 뒤에 깔린다 (터치는 통과).
 * 굵기가 천천히 출렁이고 가장자리가 살짝 거칠다. 부모의 borderWidth 대신 쓴다.
 */
export const BrushFrame = memo(function BrushFrame({ radius, width = 2, color = paper.ink, seed = 1 }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!size || size.w !== w || size.h !== h) setSize({ w, h });
      }}
    >
      {size && size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Path d={brushPath(size.w, size.h, radius, width, seed)} fill={color} fillRule="evenodd" />
        </Svg>
      )}
    </View>
  );
});

/** 시드로 정해지는 의사 난수 (같은 카드는 늘 같은 모양) */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/** 둥근 사각형 둘레를 따라 굵기가 변하는 붓 자국을 채운 다각형으로 만든다 */
export function brushPath(w: number, h: number, radius: number, sw: number, seed: number): string {
  const rand = rng(seed);
  const inset = sw * 0.75;
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const r = Math.max(0, Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2));

  // 둘레를 따라 점과 바깥 방향(법선)을 모은다. 시계 방향.
  const pts: { x: number; y: number; nx: number; ny: number }[] = [];
  const step = 1.5;
  const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) pts.push({ x: ax + ((bx - ax) * i) / n, y: ay + ((by - ay) * i) / n, nx, ny });
  };
  const arc = (cx: number, cy: number, from: number) => {
    const n = Math.max(2, Math.round((Math.PI / 2) * r / step));
    for (let i = 0; i < n; i++) {
      const a = from + ((Math.PI / 2) * i) / n;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
    }
  };
  line(x0 + r, y0, x1 - r, y0, 0, -1);
  arc(x1 - r, y0 + r, -Math.PI / 2);
  line(x1, y0 + r, x1, y1 - r, 1, 0);
  arc(x1 - r, y1 - r, 0);
  line(x1 - r, y1, x0 + r, y1, 0, 1);
  arc(x0 + r, y1 - r, Math.PI / 2);
  line(x0, y1 - r, x0, y0 + r, -1, 0);
  arc(x0 + r, y0 + r, Math.PI);

  // 굵기: 느린 물결 두 개 + 가장자리 거칠기
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const total = pts.length;
  const outer: string[] = [];
  const inner: string[] = [];
  pts.forEach((p, i) => {
    const t = (i / total) * Math.PI * 2;
    const swell = 0.78 + 0.22 * Math.sin(t * 3 + p1) + 0.14 * Math.sin(t * 7 + p2);
    const half = (sw * swell) / 2;
    const out = half + (rand() - 0.5) * sw * 0.35;
    const inn = half + (rand() - 0.5) * sw * 0.35;
    outer.push(`${(p.x + p.nx * out).toFixed(2)},${(p.y + p.ny * out).toFixed(2)}`);
    inner.push(`${(p.x - p.nx * inn).toFixed(2)},${(p.y - p.ny * inn).toFixed(2)}`);
  });
  return `M${outer.join('L')}Z M${inner.reverse().join('L')}Z`;
}
