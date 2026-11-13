import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarLights } from '@/components/BarLights';
import { FilterChips } from '@/components/FilterChips';
import { FloatingField } from '@/components/FloatingField';
import { sampleBottles } from '@/lib/samples';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

const openBottle = (id: string) => router.push({ pathname: '/bottle/[id]', params: { id } });

export default function Home() {
  const insets = useSafeAreaInsets();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const justAdded = useCellar((s) => s.justAdded);
  const clearJustAdded = useCellar((s) => s.clearJustAdded);
  const addMany = useCellar((s) => s.addMany);
  const removeSamples = useCellar((s) => s.removeSamples);
  const added = justAdded ? bottles.find((b) => b.id === justAdded) : undefined;
  const hasSamples = __DEV__ && bottles.some((b) => b.id.startsWith('sample-'));

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(clearJustAdded, 2800);
    return () => clearTimeout(timer);
  }, [justAdded, clearJustAdded]);

  const shown = useMemo(
    () => (filter === 'all' ? bottles : bottles.filter((b) => b.category === filter)),
    [bottles, filter],
  );

  return (
    <View style={styles.screen}>
      <BarLights />

      {/* 병은 머리글과 버튼 뒤까지 화면 전체를 떠다닌다 */}
      <View style={[StyleSheet.absoluteFill, { top: insets.top + 96, bottom: insets.bottom + 96 }]}>
        <FloatingField
          bottles={shown}
          freshId={justAdded}
          onOpen={openBottle}
        />
      </View>

      <View style={{ paddingTop: insets.top + space.s }} pointerEvents="box-none">
        <View style={styles.head}>
          <Text style={styles.title}>술장</Text>
          {bottles.length > 0 && <Text style={styles.total}>{bottles.length}병</Text>}
        </View>
        <FilterChips />
      </View>

      {bottles.length === 0 && (
        <View style={styles.empty} pointerEvents="box-none">
          <Text style={styles.emptyTitle}>아직 빈 술장이에요</Text>
          <Text style={styles.emptyBody}>
            버리기 아까운 병을 찍어 보세요.{'\n'}병만 떼어 내 여기에 띄워 둘게요.
          </Text>
          {__DEV__ && (
            <Pressable onPress={() => addMany(sampleBottles())} accessibilityRole="button" style={styles.dev}>
              <Text style={styles.devLabel}>개발용: 샘플 병 18개 채우기</Text>
            </Pressable>
          )}
        </View>
      )}

      {hasSamples && (
        <Pressable
          onPress={removeSamples}
          accessibilityRole="button"
          style={[styles.dev, styles.devCorner, { bottom: insets.bottom + 34 }]}
        >
          <Text style={styles.devLabel}>샘플 지우기</Text>
        </Pressable>
      )}

      {added && (
        <Animated.View
          key={added.id}
          entering={FadeInDown.duration(260)}
          exiting={FadeOut.duration(400)}
          style={[styles.toast, { top: insets.top + 110 }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.toastText} numberOfLines={1}>
            {added.name ? `${added.name}, 술장에 담았어요` : '술장에 담았어요'}
          </Text>
        </Animated.View>
      )}

      <LinearGradient
        colors={['rgba(4,10,8,0)', 'rgba(4,10,8,0.9)']}
        style={[styles.dock, { paddingBottom: insets.bottom + space.m }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.push('/cabinet')}
          accessibilityRole="button"
          accessibilityLabel="진열장 열기"
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
        >
          <Ionicons name="albums-outline" size={22} color={color.glow} />
          <Text style={styles.sideLabel}>진열장</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/capture')}
          accessibilityRole="button"
          accessibilityLabel="술병 찍기"
          style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
        >
          <View style={styles.shutterCore}>
            <Ionicons name="camera-outline" size={24} color={color.labelInk} />
          </View>
        </Pressable>

        <View style={styles.side} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    paddingBottom: space.xs,
  },
  title: { fontFamily: font.serif, fontSize: 28, color: color.label, letterSpacing: 6 },
  total: { fontFamily: font.serif, fontSize: 14, color: color.brass, letterSpacing: 1 },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  emptyTitle: { fontFamily: font.serifBold, fontSize: 21, color: color.label, marginBottom: space.s },
  emptyBody: { fontFamily: font.serif, fontSize: 15, lineHeight: 24, color: color.mist, textAlign: 'center' },
  dev: {
    marginTop: space.l,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.mist,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  devCorner: { position: 'absolute', right: space.l, marginTop: 0, zIndex: 3 },
  devLabel: { fontSize: 12, color: color.mist },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '84%',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: color.glow,
    boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
    zIndex: 4,
  },
  toastText: { fontFamily: font.serifBold, fontSize: 14, color: color.labelInk },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 64,
    paddingHorizontal: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 72, alignItems: 'center', gap: 5 },
  sideLabel: { fontFamily: font.serif, fontSize: 12, color: color.glow, letterSpacing: 1 },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: color.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: color.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
