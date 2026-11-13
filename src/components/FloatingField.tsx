import { useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import type { Bottle } from '@/store';
import { color } from '@/theme';

import { BottleImage } from './BottleImage';

/** id에서 뽑은 고정 난수 — 병마다 움직임이 다르되, 다시 열어도 같은 궤적을 돈다. */
export function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const TAU = Math.PI * 2;

type Body = {
  bottle: Bottle;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number; // 0 = 멀리, 1 = 가까이
  ax: number;
  ay: number;
};

/** 화면을 느슨한 칸으로 나눠 병의 중심 자리를 정한다. 병이 늘면 조금씩 작아진다. */
function layout(bottles: Bottle[], W: number, H: number): Body[] {
  const n = bottles.length;
  if (!n || !W || !H) return [];
  const cols = Math.max(2, Math.ceil(Math.sqrt((n * W) / (H * 0.62))));
  const rows = Math.ceil(n / cols);
  const cw = W / cols;
  const ch = H / rows;
  const baseH = Math.min(210, ch * 0.92, cw * 2.1);

  // 최근 병이 늘 같은 구석에 몰리지 않게 자리를 섞는다
  const order = bottles
    .map((b, i) => ({ b, k: seeded(b.id, 11), i }))
    .sort((p, q) => p.k - q.k || p.i - q.i);

  return order.map(({ b }, slot) => {
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const depth = seeded(b.id, 7);
    const h = baseH * (0.72 + depth * 0.28);
    const ratio = b.width && b.height ? Math.min(0.9, Math.max(0.28, b.width / b.height)) : 0.42;
    const w = h * ratio;
    const x = (col + 0.5) * cw + (seeded(b.id, 8) - 0.5) * cw * 0.24;
    const y = (row + 0.5) * ch + (seeded(b.id, 9) - 0.5) * ch * 0.24;
    return {
      bottle: b,
      x,
      y,
      w,
      h,
      depth,
      // 떠다니되 화면 밖으로는 나가지 않게, 가장자리까지 남은 거리로 폭을 제한한다
      ax: Math.max(0, Math.min(cw * 0.42, x - w * 0.6, W - x - w * 0.6)),
      ay: Math.max(0, Math.min(ch * 0.36, y - h * 0.5, H - y - h * 0.5)),
    };
  });
}

function Drifter({ body, clock, onPress }: { body: Body; clock: SharedValue<number>; onPress: () => void }) {
  const id = body.bottle.id;
  // 서로 다른 느린 주기 두 개를 겹쳐 같은 길을 되풀이하지 않는 것처럼 보이게 한다
  const wx = TAU / (17 + seeded(id, 1) * 14);
  const wy = TAU / (13 + seeded(id, 2) * 12);
  const wr = TAU / (19 + seeded(id, 3) * 16);
  const px = seeded(id, 4) * TAU;
  const py = seeded(id, 5) * TAU;
  const spin = 4 + seeded(id, 6) * 7;
  const { ax, ay } = body;

  const drift = useAnimatedStyle(() => {
    const t = clock.value;
    return {
      transform: [
        { translateX: ax * (0.72 * Math.sin(t * wx + px) + 0.28 * Math.sin(t * wx * 2.7 + py)) },
        { translateY: ay * (0.72 * Math.sin(t * wy + py) + 0.28 * Math.sin(t * wy * 2.3 + px)) },
        { rotate: `${spin * Math.sin(t * wr + px + py)}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: body.x - body.w / 2,
          top: body.y - body.h / 2,
          width: body.w,
          height: body.h,
          zIndex: Math.round(body.depth * 100),
          opacity: 0.78 + body.depth * 0.22,
        },
        drift,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${body.bottle.name || '이름 없는 병'} 자세히 보기`}
        style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { opacity: 0.7 }]}
      >
        <BottleImage bottle={body.bottle} style={StyleSheet.absoluteFill} sticker />
      </Pressable>
    </Animated.View>
  );
}

const DUST = Array.from({ length: 16 }, (_, i) => `dust${i}`);

function Dust({ id, clock }: { id: string; clock: SharedValue<number> }) {
  const w = TAU / (3 + seeded(id, 1) * 5);
  const p = seeded(id, 2) * TAU;
  const size = 1.5 + seeded(id, 3) * 2;
  const twinkle = useAnimatedStyle(() => ({ opacity: 0.08 + 0.4 * (0.5 + 0.5 * Math.sin(clock.value * w + p)) }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${seeded(id, 4) * 100}%`,
          top: `${seeded(id, 5) * 100}%`,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color.glow,
        },
        twinkle,
      ]}
    />
  );
}

export function FloatingField({ bottles, onOpen }: { bottles: Bottle[]; onOpen: (id: string) => void }) {
  const still = useReducedMotion();
  const clock = useSharedValue(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useFrameCallback((frame) => {
    clock.value = frame.timeSinceFirstFrame / 1000;
  }, !still);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {DUST.map((id) => (
          <Dust key={id} id={id} clock={clock} />
        ))}
      </View>
      {layout(bottles, size.w, size.h).map((body) => (
        <Drifter key={body.bottle.id} body={body} clock={clock} onPress={() => onOpen(body.bottle.id)} />
      ))}
    </View>
  );
}
