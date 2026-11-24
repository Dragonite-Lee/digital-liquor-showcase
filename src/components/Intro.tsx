import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, paper } from '@/theme';

const SPLASH = require('../../assets/ui/splash.png');

export const INTRO_LINES = ['호랑이는 죽어서', '가죽을 남기고', '술은 죽어서', '병을 남긴다'];

const STROKE = 620; // 한 줄을 쓰는 시간(ms)
const PAUSE = 140; // 줄 사이 붓을 떼는 시간
const HOLD = 900; // 다 쓰고 머무는 시간
const FADE = 420;
/** 붓글씨 마지막 획이 글자 폭 밖으로 삐져나와도 잘리거나 줄바꿈되지 않게 두는 여유 */
const SPILL = 16;

/** 한 줄: 왼쪽에서 오른쪽으로 붓이 지나가듯 드러난다 */
function BrushLine({ text, delay, still }: { text: string; delay: number; still: boolean }) {
  const [width, setWidth] = useState(0);
  const p = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (!width || still) return;
    p.value = withDelay(delay, withTiming(1, { duration: STROKE, easing: Easing.bezier(0.45, 0.05, 0.35, 1) }));
  }, [width, delay, still, p]);

  const reveal = useAnimatedStyle(() => ({ width: (width + SPILL) * p.value }));
  // 붓 끝: 드러나는 경계를 살짝 흐리게 해 먹이 번지는 느낌을 준다
  const tip = useAnimatedStyle(() => ({
    left: (width + SPILL) * p.value - 14,
    opacity: p.value > 0 && p.value < 1 ? 1 : 0,
  }));

  const measure = (e: LayoutChangeEvent) => setWidth(Math.ceil(e.nativeEvent.layout.width));

  return (
    <View onLayout={measure}>
      {/* 자리만 차지하는 보이지 않는 줄 — 이 너비만큼 붓이 지나간다 */}
      <Text style={[styles.line, styles.ghost]} accessible={false}>
        {text}
      </Text>
      <Animated.View style={[styles.clip, reveal]}>
        <Text style={[styles.line, styles.inked, { width: width + SPILL }]}>
          {text}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.tip, tip]} pointerEvents="none" />
    </View>
  );
}

/**
 * 앱을 켤 때 한 번: 종이 위 병 그림, 문구가 한 줄씩 붓으로 써진다. 누르면 바로 넘어간다.
 * 동작 줄이기 설정이면 글을 바로 보여 주고 짧게 머문다.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const fade = useSharedValue(1);
  const [leaving, setLeaving] = useState(false);

  const writing = still ? 0 : INTRO_LINES.length * (STROKE + PAUSE);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    fade.value = withTiming(0, { duration: FADE }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  };

  useEffect(() => {
    const timer = setTimeout(leave, writing + HOLD);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, style]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={leave}
        accessibilityRole="button"
        accessibilityLabel={`${INTRO_LINES.join(' ')}. 눌러서 시작하기`}
      >
        <Image source={SPLASH} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="bottom" />
        <View style={[styles.words, { top: insets.top + 178 }]}>
          {INTRO_LINES.map((line, i) => (
            <BrushLine key={line} text={line} delay={i * (STROKE + PAUSE) + 180} still={still} />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: paper.bg, zIndex: 100 },
  words: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 2 },
  line: { fontFamily: font.hand, fontSize: 40, lineHeight: 52, color: paper.ink, textAlign: 'left' },
  ghost: { opacity: 0 },
  inked: { flexShrink: 0 },
  clip: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  tip: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 28,
    backgroundImage: 'linear-gradient(90deg, rgba(251,238,224,0) 0%, rgba(251,238,224,0.9) 50%, rgba(251,238,224,0) 100%)',
  },
});
