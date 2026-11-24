import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { HandIcon } from '@/components/HandIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { arrange, ROOM_H, roomWidth, unitLeft } from '@/components/cabinet/layout';
import { MoveContext } from '@/components/cabinet/MoveContext';
import { Unit } from '@/components/cabinet/Unit';
import { useRoomView } from '@/components/cabinet/useRoomView';
import { FilterChips } from '@/components/FilterChips';
import { useCellar } from '@/store';
import { color, font, paper, space } from '@/theme';

const PAPER = require('../../assets/ui/paper.png');

const buzz = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export default function Cabinet() {
  const insets = useSafeAreaInsets();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const moveTo = useCellar((s) => s.moveTo);
  const filtered = filter !== 'all';

  const units = useMemo(
    () => arrange(filtered ? bottles.filter((b) => b.category === filter) : bottles, filtered),
    [bottles, filter, filtered],
  );
  const roomW = roomWidth(units.length);
  const view = useRoomView(roomW);

  // 자리 옮기기: 길게 눌러 집고, 놓을 칸을 누른다
  const [movingId, setMovingId] = useState<string | null>(null);
  const moving = movingId ? bottles.find((b) => b.id === movingId) : undefined;
  const heldId = moving?.id ?? null;
  const move = useMemo(
    () => ({
      movingId: heldId,
      // 필터가 걸린 화면은 실제 자리와 달라서 옮기기를 막는다
      canMove: !filtered,
      pick: (id: string) => {
        buzz();
        setMovingId(id);
      },
      place: (slot: number) => {
        if (heldId) moveTo(heldId, slot);
        buzz();
        setMovingId(null);
      },
    }),
    [heldId, filtered, moveTo],
  );

  return (
    <View style={styles.screen}>
      <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={{ paddingTop: insets.top + space.s }}>
        <View style={styles.head}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="홈으로 돌아가기"
            hitSlop={12}
            style={styles.back}
          >
            <HandIcon name="back" size={23} />
          </Pressable>
          <Text style={styles.title}>진열장</Text>
          <View style={styles.back} />
        </View>
        <FilterChips />
      </View>

      <GestureDetector gesture={view.gesture}>
        <View style={styles.viewport} onLayout={view.onLayout}>
          {view.ready && (
            <Animated.View style={[styles.room, { width: roomW }, view.roomStyle]}>
              {/* 확대·이동해도 종이가 이어지도록 방 안에도 깐다 */}
              <Image source={PAPER} style={StyleSheet.absoluteFill} contentFit="cover" />

              <MoveContext.Provider value={move}>
                {units.map((cells, i) => (
                  <View key={i} style={[styles.unitSpot, { left: unitLeft(i) }]}>
                    <Unit cells={cells} />
                  </View>
                ))}
              </MoveContext.Provider>
            </Animated.View>
          )}

          <Animated.View style={[styles.reset, { bottom: insets.bottom + (moving ? 84 : space.m) }, view.resetStyle]}>
            <Pressable onPress={view.zoomOut} accessibilityRole="button" style={styles.resetHit}>
              <Ionicons name="contract-outline" size={16} color={paper.bg} />
              <Text style={styles.resetLabel}>전체 보기</Text>
            </Pressable>
          </Animated.View>

          {moving && (
            <View style={[styles.moveBar, { bottom: insets.bottom + space.m }]}>
              <Text style={styles.moveText} numberOfLines={2}>
                옮길 자리를 누르세요. 다른 병을 누르면 자리를 바꿔요.
              </Text>
              <Pressable onPress={() => setMovingId(null)} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.moveCancel}>그만두기</Text>
              </Pressable>
            </View>
          )}

          {bottles.length === 0 && (
            <Text style={[styles.hint, { bottom: insets.bottom + space.l }]}>병을 찍어 담으면 선반에 차례로 놓여요.</Text>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: paper.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.hand, fontSize: 18, color: paper.ink },
  unitSpot: { position: 'absolute', top: 0 },
  viewport: { flex: 1, overflow: 'hidden' },
  room: { position: 'absolute', left: 0, top: 0, height: ROOM_H, transformOrigin: 'left top', overflow: 'hidden' },
  reset: { position: 'absolute', alignSelf: 'center' },
  resetHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: paper.ink,
  },
  resetLabel: { fontFamily: font.serifBold, fontSize: 13, color: paper.bg },
  moveBar: {
    position: 'absolute',
    left: space.m,
    right: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.m,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFF8EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: paper.line,
    boxShadow: '0 8px 20px rgba(90,60,30,0.2)',
  },
  moveText: { flex: 1, fontFamily: font.serif, fontSize: 13.5, lineHeight: 19, color: color.labelInk },
  moveCancel: { fontFamily: font.serifBold, fontSize: 13.5, color: color.wine },
  hint: { position: 'absolute', alignSelf: 'center', fontFamily: font.hand, fontSize: 16, color: paper.inkSoft },
});
