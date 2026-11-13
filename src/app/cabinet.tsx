import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { arrange, ENTRY, FLOOR, HEADROOM, ROOM_H, roomWidth, UNIT_H, unitLeft } from '@/components/cabinet/layout';
import { MoveContext } from '@/components/cabinet/MoveContext';
import { Unit } from '@/components/cabinet/Unit';
import { useRoomView } from '@/components/cabinet/useRoomView';
import { FilterChips } from '@/components/FilterChips';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

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


  const lampCount = Math.ceil((view.fittedWidth * 1.4) / 230) + 1;

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top + space.s }}>
        <View style={styles.head}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="술장으로 돌아가기"
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={color.label} />
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
                <ActivityIndicator color={color.glow} />
              ) : (
                <Ionicons name="share-outline" size={21} color={moving ? color.mist : color.label} />
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
              {/* 벽과 바닥 */}
              <LinearGradient colors={['#0B1612', '#16291F', '#101E18']} locations={[0, 0.45, 1]} style={styles.wallBack} />
              <LinearGradient colors={['#2A1A0F', '#120A05']} style={styles.floor} />
              <View style={styles.skirting} />

              <View style={styles.entry}>
                <LinearGradient colors={['#D9B56B', '#8C6B2F']} style={styles.plaque}>
                  <Text style={styles.plaqueTitle}>나의 진열장</Text>
                  <Text style={styles.plaqueCount}>{bottles.length}병</Text>
                </LinearGradient>
              </View>

              <MoveContext.Provider value={move}>
                {units.map((cells, i) => (
                  <View key={i} style={[styles.unitSpot, { left: unitLeft(i) }]}>
                    <Unit cells={cells} />
                  </View>
                ))}
              </MoveContext.Provider>
            </Animated.View>
          )}

          <Animated.View style={[styles.lamps, view.lampsStyle]} pointerEvents="none">
            {Array.from({ length: lampCount }, (_, i) => (
              <View key={i} style={[styles.lamp, { left: 120 + i * 230 }]}>
                <View style={styles.cord} />
                <LinearGradient colors={['#E2C078', '#7A5A22']} style={styles.shade} />
                <View style={styles.lampGlow} />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.reset, { bottom: insets.bottom + (moving ? 84 : space.m) }, view.resetStyle]}>
            <Pressable onPress={view.zoomOut} accessibilityRole="button" style={styles.resetHit}>
              <Ionicons name="contract-outline" size={16} color={color.labelInk} />
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
  screen: { flex: 1, backgroundColor: '#050B09' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.serif, fontSize: 19, color: color.label, letterSpacing: 4 },
  unitSpot: { position: 'absolute', top: 0 },
  viewport: { flex: 1, overflow: 'hidden' },
  room: { position: 'absolute', left: 0, top: 0, height: ROOM_H, transformOrigin: 'left top' },
  wallBack: { position: 'absolute', left: 0, right: 0, top: 0, height: HEADROOM + UNIT_H },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FLOOR },
  skirting: { position: 'absolute', left: 0, right: 0, bottom: FLOOR, height: 3, backgroundColor: '#3A2414' },
  entry: { position: 'absolute', left: 0, top: HEADROOM, width: ENTRY, height: UNIT_H, alignItems: 'center', justifyContent: 'center' },
  plaque: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
  },
  plaqueTitle: { fontFamily: font.serifBold, fontSize: 15, color: '#2B1D08', letterSpacing: 2 },
  plaqueCount: { fontFamily: font.serif, fontSize: 12, color: '#3D2B10', marginTop: 4 },
  lamps: { position: 'absolute', top: 0, left: 0, height: 80 },
  lamp: { position: 'absolute', top: 0, alignItems: 'center', width: 30 },
  cord: { width: 1, height: 22, backgroundColor: 'rgba(201,162,87,0.7)' },
  shade: { width: 22, height: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  lampGlow: {
    position: 'absolute',
    top: 4,
    width: 150,
    height: 150,
    backgroundImage: 'radial-gradient(circle, rgba(244,228,184,0.22) 0%, rgba(244,228,184,0) 62%)',
  },
  reset: { position: 'absolute', alignSelf: 'center' },
  resetHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: color.glow,
  },
  resetLabel: { fontFamily: font.serifBold, fontSize: 13, color: color.labelInk },
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
    backgroundColor: color.glow,
    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
  },
  moveText: { flex: 1, fontFamily: font.serif, fontSize: 13.5, lineHeight: 19, color: color.labelInk },
  moveCancel: { fontFamily: font.serifBold, fontSize: 13.5, color: color.wine },
  error: { color: '#F0A8A8' },
  hint: { position: 'absolute', alignSelf: 'center', fontFamily: font.serif, fontSize: 14, color: color.mist },
});
