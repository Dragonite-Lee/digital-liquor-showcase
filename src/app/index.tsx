import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarLights } from '@/components/BarLights';
import { FilterChips } from '@/components/FilterChips';
import { FloatingField } from '@/components/FloatingField';
import { illustrateEnabled } from '@/lib/illustrate';
import { sampleBottles } from '@/lib/samples';
import { NUDGE_AFTER_BOTTLES, themeOf } from '@/lib/themes';
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
  const nudged = useCellar((s) => s.nudged);
  const ownedThemes = useCellar((s) => s.ownedThemes);
  const markNudged = useCellar((s) => s.markNudged);
  // 유료 테마는 첫 촬영 때 권하지 않는다. 몇 병 모아 술장에 애착이 생긴 뒤, 담기 연출이 끝나면 한 번만.
  const realBottles = bottles.filter((b) => !b.id.startsWith('sample-'));
  const nudgeTarget = realBottles[0];
  const showNudge =
    illustrateEnabled && !nudged && !justAdded && ownedThemes.length === 0 && realBottles.length >= NUDGE_AFTER_BOTTLES;
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

      {showNudge && nudgeTarget && (
        <Animated.View entering={FadeInDown.duration(320)} style={[styles.nudge, { bottom: insets.bottom + 118 }]}>
          <Pressable
            onPress={() => {
              markNudged();
              router.push({ pathname: '/bottle/[id]', params: { id: nudgeTarget.id, try: 'vangogh' } });
            }}
            accessibilityRole="button"
            style={styles.nudgeHit}
          >
            <Image source={themeOf('vangogh').preview} style={styles.nudgeThumb} contentFit="cover" />
            <View style={styles.nudgeCopy}>
              <Text style={styles.nudgeTitle}>{nudgeTarget.name || '방금 담은 병'}, 고흐 화풍으로 그려 볼까요?</Text>
              <Text style={styles.nudgeBody}>모네·고흐·현대회화, 테마마다 한 번은 무료예요</Text>
            </View>
          </Pressable>
          <Pressable onPress={markNudged} accessibilityRole="button" accessibilityLabel="권유 닫기" hitSlop={10}>
            <Ionicons name="close" size={18} color={color.labelInk} />
          </Pressable>
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
  nudge: {
    position: 'absolute',
    left: space.m,
    right: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    padding: 10,
    paddingRight: space.m,
    borderRadius: 16,
    backgroundColor: color.glow,
    boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  nudgeHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m },
  nudgeThumb: { width: 40, height: 56, borderRadius: 6 },
  nudgeCopy: { flex: 1 },
  nudgeTitle: { fontFamily: font.serifBold, fontSize: 14, color: color.labelInk },
  nudgeBody: { fontFamily: font.serif, fontSize: 12, color: '#5A4C30', marginTop: 2 },
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
