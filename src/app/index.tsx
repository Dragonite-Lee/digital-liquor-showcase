import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChips } from '@/components/FilterChips';
import { FloatingField } from '@/components/FloatingField';
import { sampleBottles } from '@/lib/samples';
import { useCellar } from '@/store';
import { font, paper, space } from '@/theme';

const PAPER = require('../../assets/ui/paper.png');
const CAMERA = require('../../assets/ui/camera.png');
const CABINET = require('../../assets/ui/cabinet.png');

/** 앱 이름 (홈 제목) */
export const APP_TITLE = '호가술병';

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
      <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />

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
          <Text style={styles.title} accessibilityRole="header">
            {APP_TITLE}
          </Text>
          <Pressable
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="계정"
            hitSlop={10}
            style={({ pressed }) => [styles.account, pressed && styles.pressed]}
          >
            <Ionicons name="person-circle-outline" size={26} color={paper.ink} />
          </Pressable>
        </View>
        <FilterChips />
      </View>

      {bottles.length === 0 && (
        <View style={styles.empty} pointerEvents="box-none">
          <Text style={styles.emptyBody}>아직 비어있어요{'\n'}기록하고 싶었던 술병을 찍어보세요</Text>
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
            {added.name ? `${added.name}, 진열장에 담았어요` : '진열장에 담았어요'}
          </Text>
        </Animated.View>
      )}

      <View style={[styles.dock, { paddingBottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/cabinet')}
          accessibilityRole="button"
          accessibilityLabel="진열장 열기"
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
        >
          <Image source={CABINET} style={styles.cabinetIcon} contentFit="contain" />
          <Text style={styles.sideLabel}>진열장</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/capture')}
          accessibilityRole="button"
          accessibilityLabel="술병 찍기"
          style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
        >
          <Image source={CAMERA} style={styles.shutterArt} contentFit="contain" />
        </Pressable>

        <View style={styles.side} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: paper.bg },
  head: { alignItems: 'center', justifyContent: 'center', paddingTop: space.m, paddingBottom: space.xs },
  account: { position: 'absolute', right: space.l, top: space.m - 2 },
  title: { fontFamily: font.hand, fontSize: 18, color: paper.ink },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  emptyBody: { fontFamily: font.hand, fontSize: 16, lineHeight: 23, color: paper.ink, textAlign: 'center' },
  dev: {
    marginTop: space.l,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: paper.inkSoft,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  devCorner: { position: 'absolute', right: space.l, marginTop: 0, zIndex: 3 },
  devLabel: { fontSize: 12, color: paper.inkSoft },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '84%',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: paper.ink,
    boxShadow: '0 6px 16px rgba(90,60,30,0.25)',
    zIndex: 4,
  },
  toastText: { fontFamily: font.serifBold, fontSize: 14, color: paper.bg },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 72, alignItems: 'center' },
  cabinetIcon: { width: 48, height: 48, marginBottom: -4 },
  sideLabel: { fontFamily: font.hand, fontSize: 16, color: paper.ink },
  shutter: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  shutterArt: { width: 72, height: 72 },
  pressed: { opacity: 0.6 },
});
