import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { HandIcon } from '@/components/HandIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

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

  const roomRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  /** 진열장 전체(화면 밖으로 이어진 장까지)를 한 장의 이미지로 만들어 공유 시트를 연다. */
  const share = async () => {
    if (sharing || !roomRef.current) return;
    setSharing(true);
    setShareError(false);
    try {
      // 장이 길어도 가로 4096px을 넘지 않게 줄인다
      const shrink = Math.min(1, 4096 / (roomW * PixelRatio.get()));
      const uri = await captureRef(roomRef, {
        format: 'png',
        result: 'tmpfile',
        width: roomW * shrink,
        height: ROOM_H * shrink,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: '나의 진열장' });
    } catch {
      setShareError(true);
    } finally {
      setSharing(false);
    }
  };


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
            <HandIcon name="back" size={30} />
          </Pressable>
          <Text style={styles.title}>진열장</Text>
          {Platform.OS === 'web' || bottles.length === 0 ? (
            <View style={styles.back} />
          ) : (
            <Pressable
              onPress={share}
              disabled={sharing || !!moving}
              accessibilityRole="button"
              accessibilityLabel="진열장을 이미지로 저장하거나 공유하기"
              hitSlop={12}
              style={styles.back}
            >
              {sharing ? (
                <ActivityIndicator color={paper.ink} />
              ) : (
                <HandIcon name="share" size={30} dim={!!moving} />
              )}
            </Pressable>
          )}
        </View>
        <FilterChips />
      </View>

      <GestureDetector gesture={view.gesture}>
        <View style={styles.viewport} onLayout={view.onLayout}>
          {view.ready && (
            <Animated.View ref={roomRef} collapsable={false} style={[styles.room, { width: roomW }, view.roomStyle]}>
              {/* 공유 이미지에도 종이 배경이 들어가도록 방 안에 한 번 더 깐다 */}
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

          {shareError && (
            <Text style={[styles.hint, styles.error, { bottom: insets.bottom + space.l }]}>
              이미지를 만들지 못했어요. 다시 눌러 주세요.
            </Text>
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
  title: { fontFamily: font.hand, fontSize: 22, color: paper.ink, letterSpacing: 1 },
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
  error: { color: color.wine },
  hint: { position: 'absolute', alignSelf: 'center', fontFamily: font.hand, fontSize: 16, color: paper.inkSoft },
});
