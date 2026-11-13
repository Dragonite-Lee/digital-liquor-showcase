import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Bottle } from '@/store';

import { BottleImage } from './BottleImage';

/** id에서 뽑은 고정 난수 — 병마다 떠 있는 리듬이 다르되, 다시 열어도 같은 자리에 있다. */
export function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

type Props = { bottle: Bottle; width: number; height: number; onPress: () => void };

export function FloatingBottle({ bottle, width, height, onPress }: Props) {
  const still = useReducedMotion();
  const t = useSharedValue(0);

  const lift = 5 + seeded(bottle.id, 1) * 6;
  const tilt = (seeded(bottle.id, 2) - 0.5) * 5;
  const period = 2600 + seeded(bottle.id, 3) * 1800;
  const delay = seeded(bottle.id, 4) * 1200;

  useEffect(() => {
    if (still) return;
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [still, delay, period, t]);

  const floating = useAnimatedStyle(() => ({
    transform: [
      { translateY: (t.value - 0.5) * 2 * lift },
      { rotate: `${tilt * (t.value - 0.5)}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ width, height }, floating]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${bottle.name || '이름 없는 병'} 자세히 보기`}
        style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { opacity: 0.7 }]}
      >
        <BottleImage bottle={bottle} style={StyleSheet.absoluteFill} />
      </Pressable>
    </Animated.View>
  );
}
