import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { type ComponentRef, createContext, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { BottleImage } from '@/components/BottleImage';
import { FilterChips } from '@/components/FilterChips';
import { seeded } from '@/components/FloatingField';
import { MemoSlip } from '@/components/MemoSlip';
import { type Bottle, useCellar } from '@/store';
import { color, font, space } from '@/theme';

// 장 한 채: 3칸 × 5단. 병이 늘면 같은 장이 옆으로 이어진다.
const COLS = 3;
const ROWS = 5;
const PER_UNIT = COLS * ROWS;

const SLOT = 96;
const BAY = 138; // 조명 칸 높이
const BOTTLE = 106;
const GLASS = 22; // 유리 선반 윗면이 보이는 깊이
const STAND = 11; // 병이 선반 앞 가장자리에서 떨어진 거리
const EDGE = 4;
const LIP = 46;
const FRAME = 9;

const UNIT_W = SLOT * COLS + 20 + FRAME * 2 + 2;
const UNIT_H = (BAY + EDGE + LIP) * ROWS + FRAME * 2 + 2;
const GAP = 40;
const ENTRY = 170;
const TAIL = 90;
const HEADROOM = 76; // 장 위 벽
const FLOOR = 120;
const ROOM_H = HEADROOM + UNIT_H + FLOOR;

const MAX_ZOOM = 3.2;
const TAP_ZOOM = 2.2;

type Cell = { slot: number; bottle?: Bottle };

/** 자리 옮기기 상태. movingId가 있으면 선반의 모든 칸이 놓을 자리가 된다. */
const MoveContext = createContext<{
  movingId: string | null;
  canMove: boolean;
  pick: (id: string) => void;
  place: (slot: number) => void;
}>({ movingId: null, canMove: false, pick: () => {}, place: () => {} });

function Standing({ bottle }: { bottle: Bottle }) {
  const { movingId, canMove, pick } = useContext(MoveContext);
  const held = movingId === bottle.id;
  return (
    <>
      <View style={styles.mirrorClip} pointerEvents="none">
        <BottleImage bottle={bottle} style={styles.mirror} />
      </View>
      <View style={[styles.contact, held && styles.contactHeld]} pointerEvents="none" />
      <Pressable
        onPress={() => router.push({ pathname: '/bottle/[id]', params: { id: bottle.id } })}
        onLongPress={canMove ? () => pick(bottle.id) : undefined}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`${bottle.name || '이름 없는 병'} 자세히 보기`}
        accessibilityHint={canMove ? '길게 누르면 자리를 옮길 수 있어요' : undefined}
        style={({ pressed }) => [styles.bottleHit, held && styles.bottleHeld, pressed && { opacity: 0.75 }]}
      >
        <BottleImage bottle={bottle} style={styles.bottle} />
      </Pressable>
    </>
  );
}

function Slot({ cell }: { cell: Cell }) {
  const { movingId, place } = useContext(MoveContext);
  const moving = movingId !== null;
  const held = moving && cell.bottle?.id === movingId;
  return (
    <View style={styles.slot}>
      {cell.bottle ? <Standing bottle={cell.bottle} /> : null}
      {moving && !held && (
        <Pressable
          onPress={() => place(cell.slot)}
          accessibilityRole="button"
          accessibilityLabel={cell.bottle ? `${cell.bottle.name || '이름 없는 병'}와 자리 바꾸기` : '이 빈자리에 놓기'}
          style={styles.drop}
        >
          {!cell.bottle && <View style={styles.dropMark} />}
        </Pressable>
      )}
    </View>
  );
}

function Shelf({ cells }: { cells: Cell[] }) {
  return (
    <View>
      <View style={styles.bay}>
        {/* 뒤판: 위 조명에서 아래로 갈수록 어두워진다 */}
        <LinearGradient colors={['#FBF1D3', '#EDD9A6', '#B98F55']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.hotspot} />
        {/* 안쪽 옆벽 그늘 — 칸에 깊이를 준다 */}
        <LinearGradient
          colors={['rgba(58,32,10,0.55)', 'rgba(58,32,10,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.wall, { left: 0 }]}
        />
        <LinearGradient
          colors={['rgba(58,32,10,0)', 'rgba(58,32,10,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.wall, { right: 0 }]}
        />
        <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.34)']} style={styles.glassTop} />
        <View style={styles.row}>
          {cells.map((cell) => (
            <Slot key={cell.slot} cell={cell} />
          ))}
        </View>
        <LinearGradient colors={['rgba(255,252,238,0.95)', 'rgba(255,252,238,0)']} style={styles.ledGlow} pointerEvents="none" />
        <View style={styles.led} />
      </View>

      <LinearGradient colors={['#F4FFF9', '#9CC4B2', '#5E8776']} locations={[0, 0.35, 1]} style={styles.glassEdge} />

      {/* 선반 아래 원목 띠 — 메모지를 붙이는 자리 */}
      <LinearGradient colors={['#1F120A', '#4B2E1B', '#38210F']} locations={[0, 0.25, 1]} style={styles.lip}>
        {cells.map(({ slot, bottle }) => (
          <View key={slot} style={styles.memoSlot}>
            {bottle ? (
              <MemoSlip name={bottle.name} memo={bottle.memo} tilt={(seeded(bottle.id, 5) - 0.5) * 4} />
            ) : null}
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

function Unit({ cells }: { cells: Cell[] }) {
  const shelves = Array.from({ length: ROWS }, (_, i) => cells.slice(i * COLS, (i + 1) * COLS));
  return (
    <View style={styles.unitWrap}>
      {/* 장 위 벽에 번지는 간접 조명 */}
      <View style={styles.wash} pointerEvents="none" />
      <LinearGradient
        colors={['#5A3A22', '#2C1A0D', '#4A2E1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.unit}
      >
        <View style={styles.inner}>
          {shelves.map((row, i) => (
            <Shelf key={i} cells={row} />
          ))}
        </View>
      </LinearGradient>
      {/* 바닥에 떨어지는 장의 빛 */}
      <View style={styles.pool} pointerEvents="none" />
    </View>
  );
}

/** 병을 자리 번호대로 칸에 놓는다. 필터가 걸려 있으면 그 종류만 앞에서부터 채워 보여 준다. */
function arrange(bottles: Bottle[], filtered: boolean): Cell[][] {
  const bySlot = new Map<number, Bottle>();
  if (filtered) {
    [...bottles].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).forEach((b, i) => bySlot.set(i, b));
  } else {
    bottles.forEach((b, i) => bySlot.set(b.slot ?? i, b));
  }
  const last = bySlot.size ? Math.max(...bySlot.keys()) : -1;
  let unitCount = Math.max(2, Math.floor(last / PER_UNIT) + 1);
  // 늘 빈자리가 하나는 남도록, 꽉 차면 장을 하나 더 세운다
  if (bySlot.size >= unitCount * PER_UNIT) unitCount += 1;
  return Array.from({ length: unitCount }, (_, u) =>
    Array.from({ length: PER_UNIT }, (_, i) => {
      const slot = u * PER_UNIT + i;
      return { slot, bottle: bySlot.get(slot) };
    }),
  );
}

export default function Cabinet() {
  const insets = useSafeAreaInsets();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const moveTo = useCellar((s) => s.moveTo);
  const filtered = filter !== 'all';
  const shown = filtered ? bottles.filter((b) => b.category === filter) : bottles;

  const units = arrange(shown, filtered);
  const unitCount = units.length;

  const [movingId, setMovingId] = useState<string | null>(null);
  const moving = movingId ? bottles.find((b) => b.id === movingId) : undefined;
  const buzz = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const move = {
    movingId: moving ? moving.id : null,
    // 필터가 걸린 화면은 실제 자리와 달라서 옮기기를 막는다
    canMove: !filtered,
    pick: (id: string) => {
      buzz();
      setMovingId(id);
    },
    place: (slot: number) => {
      if (moving) moveTo(moving.id, slot);
      buzz();
      setMovingId(null);
    },
  };

  const roomRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);
  const roomW = ENTRY + unitCount * UNIT_W + (unitCount - 1) * GAP + TAIL;

  const [view, setView] = useState({ w: 0, h: 0 });
  const fit = view.h ? view.h / ROOM_H : 1; // 장 전체가 세로로 한눈에 들어오는 배율
  const viewW = view.w;
  const viewH = view.h;

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const settle = (x: number, y: number, z: number) => {
    'worklet';
    const w = roomW * fit * z;
    const h = ROOM_H * fit * z;
    tx.value = w <= viewW ? (viewW - w) / 2 : Math.min(0, Math.max(viewW - w, x));
    ty.value = h <= viewH ? (viewH - h) / 2 : Math.min(0, Math.max(viewH - h, y));
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      'worklet';
      cancelAnimation(tx);
      cancelAnimation(ty);
    },
    onUpdate: (e) => {
      'worklet';
      settle(tx.value + e.changeX, ty.value + e.changeY, zoom.value);
    },
    onDeactivate: (e) => {
      'worklet';
      // 손을 떼도 걷던 방향으로 조금 더 미끄러진다
      const w = roomW * fit * zoom.value;
      if (w > viewW) tx.value = withDecay({ velocity: e.velocityX, clamp: [viewW - w, 0] });
      const h = ROOM_H * fit * zoom.value;
      if (h > viewH) ty.value = withDecay({ velocity: e.velocityY, clamp: [viewH - h, 0] });
    },
  });

  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      cancelAnimation(tx);
      cancelAnimation(ty);
    },
    onUpdate: (e) => {
      'worklet';
      const next = Math.min(MAX_ZOOM, Math.max(1, zoom.value * e.scaleChange));
      const k = next / zoom.value;
      zoom.value = next;
      // 두 손가락 사이 지점이 제자리에 있도록
      settle(e.focalX - (e.focalX - tx.value) * k, e.focalY - (e.focalY - ty.value) * k, next);
    },
  });

  // 한 손으로도 볼 수 있게: 두 번 누르면 그 자리를 확대, 다시 두 번 누르면 전체 보기
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      'worklet';
      const next = zoom.value > 1.05 ? 1 : TAP_ZOOM;
      const k = next / zoom.value;
      const w = roomW * fit * next;
      const h = ROOM_H * fit * next;
      const x = e.x - (e.x - tx.value) * k;
      const y = e.y - (e.y - ty.value) * k;
      zoom.value = withTiming(next, { duration: 260 });
      tx.value = withTiming(w <= viewW ? (viewW - w) / 2 : Math.min(0, Math.max(viewW - w, x)), { duration: 260 });
      ty.value = withTiming(h <= viewH ? (viewH - h) / 2 : Math.min(0, Math.max(viewH - h, y)), { duration: 260 });
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch, doubleTap);

  const room = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: fit * zoom.value }],
  }));

  // 앞쪽에 걸린 펜던트 조명은 벽보다 빨리 지나가 걷는 느낌을 준다
  const lamps = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value * 1.4 }],
    opacity: Math.max(0, 1 - (zoom.value - 1) * 2.5),
  }));

  const reset = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (zoom.value - 1.05) * 6)) }));

  const zoomOut = () => {
    zoom.value = withTiming(1, { duration: 260 });
    ty.value = withTiming(0, { duration: 260 });
    const w = roomW * fit;
    tx.value = withTiming(w <= viewW ? (viewW - w) / 2 : Math.min(0, Math.max(viewW - w, tx.value)), { duration: 260 });
  };

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

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ w: width, h: height });
  };

  const lampCount = Math.ceil((roomW * fit * 1.4) / 230) + 1;

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

      <GestureDetector gesture={gesture}>
        <View style={styles.viewport} onLayout={onLayout}>
          {view.h > 0 && (
            <Animated.View ref={roomRef} collapsable={false} style={[styles.room, { width: roomW }, room]}>
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
                  <View key={i} style={{ position: 'absolute', left: ENTRY + i * (UNIT_W + GAP), top: 0 }}>
                    <Unit cells={cells} />
                  </View>
                ))}
              </MoveContext.Provider>
            </Animated.View>
          )}

          <Animated.View style={[styles.lamps, lamps]} pointerEvents="none">
            {Array.from({ length: lampCount }, (_, i) => (
              <View key={i} style={[styles.lamp, { left: 120 + i * 230 }]}>
                <View style={styles.cord} />
                <LinearGradient colors={['#E2C078', '#7A5A22']} style={styles.shade} />
                <View style={styles.lampGlow} />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.reset, { bottom: insets.bottom + (moving ? 84 : space.m) }, reset]}>
            <Pressable onPress={zoomOut} accessibilityRole="button" style={styles.resetHit}>
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

  unitWrap: { width: UNIT_W, height: ROOM_H },
  wash: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: UNIT_W + 80,
    height: 240,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(244,228,184,0.20) 0%, rgba(244,228,184,0) 66%)',
  },
  unit: {
    marginTop: HEADROOM,
    padding: FRAME,
    borderRadius: 3,
    boxShadow: '0 10px 24px rgba(0,0,0,0.6)',
  },
  inner: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.6)', overflow: 'hidden', backgroundColor: '#2E1B0E' },
  pool: {
    position: 'absolute',
    bottom: 10,
    left: -20,
    width: UNIT_W + 40,
    height: FLOOR - 10,
    backgroundImage: 'radial-gradient(ellipse at top, rgba(244,228,184,0.28) 0%, rgba(244,228,184,0) 70%)',
  },

  bay: { height: BAY, overflow: 'hidden' },
  hotspot: {
    position: 'absolute',
    top: -100,
    left: '10%',
    width: '80%',
    height: 200,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(255,253,240,0.85) 0%, rgba(255,253,240,0) 68%)',
  },
  wall: { position: 'absolute', top: 0, bottom: 0, width: 24 },
  glassTop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GLASS },
  row: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: 10 },
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'flex-end' },
  bottleHit: { width: '84%', height: BOTTLE, marginBottom: STAND },
  bottle: { width: '100%', height: '100%' },
  // 집어 든 병은 선반에서 살짝 떠오른다
  bottleHeld: { transform: [{ translateY: -12 }, { scale: 1.06 }] },
  contactHeld: { opacity: 0.4, transform: [{ scaleX: 0.7 }] },
  drop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  dropMark: {
    width: '58%',
    height: BOTTLE * 0.82,
    marginBottom: STAND,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(92,58,20,0.7)',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  mirrorClip: { position: 'absolute', bottom: 0, width: '84%', height: STAND, overflow: 'hidden' },
  mirror: { width: '100%', height: BOTTLE, opacity: 0.28, transform: [{ scaleY: -1 }] },
  contact: {
    position: 'absolute',
    bottom: STAND - 5,
    width: '62%',
    height: 10,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(40,20,4,0.6) 0%, rgba(40,20,4,0) 70%)',
  },
  ledGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 34 },
  led: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' },
  glassEdge: { height: EDGE },
  lip: { flexDirection: 'row', height: LIP, paddingHorizontal: 10, paddingTop: 7, overflow: 'hidden' },
  memoSlot: { width: SLOT, paddingHorizontal: 4 },

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
