import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottleImage } from '@/components/BottleImage';
import { FilterChips } from '@/components/FilterChips';
import { seeded } from '@/components/FloatingField';
import { MemoSlip } from '@/components/MemoSlip';
import { type Bottle, useCellar } from '@/store';
import { color, font, space } from '@/theme';

const PER_SHELF = 3;
const MIN_SHELVES = 3;

const BAY = 214; // 조명 칸 높이
const BOTTLE = 164; // 병 높이
const GLASS = 30; // 유리 선반 윗면이 보이는 깊이
const STAND = 15; // 병이 선반 앞 가장자리에서 떨어진 거리

function Standing({ bottle }: { bottle: Bottle }) {
  return (
    <>
      {/* 유리 선반에 비친 병 */}
      <View style={styles.mirrorClip} pointerEvents="none">
        <BottleImage bottle={bottle} style={styles.mirror} />
      </View>
      {/* 병 바닥이 선반에 닿는 그림자 */}
      <View style={styles.contact} pointerEvents="none" />
      <Pressable
        onPress={() => router.push({ pathname: '/bottle/[id]', params: { id: bottle.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${bottle.name || '이름 없는 병'} 자세히 보기`}
        style={({ pressed }) => [styles.bottleHit, pressed && { opacity: 0.75 }]}
      >
        <BottleImage bottle={bottle} style={styles.bottle} />
      </Pressable>
    </>
  );
}

function Shelf({ bottles }: { bottles: Bottle[] }) {
  const slots = Array.from({ length: PER_SHELF }, (_, i) => bottles[i]);
  const hasMemo = bottles.length > 0;
  return (
    <View>
      <View style={styles.bay}>
        {/* 뒤판: 위 조명에서 아래로 갈수록 어두워진다 */}
        <LinearGradient colors={['#FBF1D3', '#EDD9A6', '#B98F55']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.hotspot} />
        {/* 안쪽 옆벽에 지는 그늘 — 칸에 깊이를 준다 */}
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
        {/* 유리 선반 윗면 */}
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.34)']}
          style={styles.glassTop}
        />
        <View style={styles.row}>
          {slots.map((bottle, i) => (
            <View key={bottle?.id ?? `empty-${i}`} style={styles.slot}>
              {bottle ? <Standing bottle={bottle} /> : null}
            </View>
          ))}
        </View>
        {/* 천장 LED */}
        <LinearGradient colors={['rgba(255,252,238,0.95)', 'rgba(255,252,238,0)']} style={styles.ledGlow} pointerEvents="none" />
        <View style={styles.led} />
      </View>

      {/* 유리 선반 앞 단면 */}
      <LinearGradient colors={['#F4FFF9', '#9CC4B2', '#5E8776']} locations={[0, 0.35, 1]} style={styles.glassEdge} />

      {/* 선반 아래 원목 띠 — 메모지를 붙이는 자리 */}
      <LinearGradient colors={['#1F120A', '#4B2E1B', '#38210F']} locations={[0, 0.25, 1]} style={[styles.lip, hasMemo && styles.lipOpen]}>
        {slots.map((bottle, i) => (
          <View key={bottle?.id ?? `empty-${i}`} style={styles.memoSlot}>
            {bottle ? (
              <MemoSlip name={bottle.name} memo={bottle.memo} tilt={(seeded(bottle.id, 5) - 0.5) * 4} />
            ) : null}
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

export default function Cabinet() {
  const insets = useSafeAreaInsets();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const shown = filter === 'all' ? bottles : bottles.filter((b) => b.category === filter);

  const shelfCount = Math.max(MIN_SHELVES, Math.ceil(shown.length / PER_SHELF));
  const shelves = Array.from({ length: shelfCount }, (_, i) => shown.slice(i * PER_SHELF, (i + 1) * PER_SHELF));

  return (
    <View style={styles.screen}>
      <View style={styles.room} pointerEvents="none" />
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
          <View style={styles.back} />
        </View>
        <FilterChips />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.m, paddingTop: space.s, paddingBottom: insets.bottom + space.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* 원목 장 */}
        <LinearGradient
          colors={['#5A3A22', '#2C1A0D', '#4A2E1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cabinet}
        >
          <View style={styles.inner}>
            {shelves.map((row, i) => (
              <Shelf key={i} bottles={row} />
            ))}
          </View>
        </LinearGradient>
        <View style={styles.floorShadow} />
        {bottles.length === 0 && <Text style={styles.hint}>병을 찍어 담으면 여기 선반에 차례로 놓여요.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050B09' },
  room: {
    position: 'absolute',
    top: -120,
    left: '-30%',
    width: '160%',
    height: 620,
    backgroundImage: 'radial-gradient(circle, rgba(244,228,184,0.13) 0%, rgba(244,228,184,0) 62%)',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.serif, fontSize: 19, color: color.label, letterSpacing: 4 },

  cabinet: {
    padding: 9,
    borderRadius: 4,
    boxShadow: '0 24px 40px rgba(0,0,0,0.6)',
  },
  inner: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.6)',
    overflow: 'hidden',
    backgroundColor: '#2E1B0E',
  },
  floorShadow: {
    alignSelf: 'center',
    width: '92%',
    height: 26,
    marginTop: -4,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)',
  },

  bay: { height: BAY, overflow: 'hidden' },
  hotspot: {
    position: 'absolute',
    top: -150,
    left: '10%',
    width: '80%',
    height: 300,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(255,253,240,0.85) 0%, rgba(255,253,240,0) 68%)',
  },
  wall: { position: 'absolute', top: 0, bottom: 0, width: 30 },
  glassTop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GLASS },
  row: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: 10 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bottleHit: { width: '82%', height: BOTTLE, marginBottom: STAND },
  bottle: { width: '100%', height: '100%' },
  mirrorClip: {
    position: 'absolute',
    bottom: 0,
    width: '82%',
    height: STAND,
    overflow: 'hidden',
  },
  mirror: { width: '100%', height: BOTTLE, opacity: 0.28, transform: [{ scaleY: -1 }] },
  contact: {
    position: 'absolute',
    bottom: STAND - 7,
    width: '64%',
    height: 14,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(40,20,4,0.6) 0%, rgba(40,20,4,0) 70%)',
  },
  ledGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 46 },
  led: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' },

  glassEdge: { height: 5 },
  lip: { flexDirection: 'row', minHeight: 16, paddingHorizontal: 10 },
  lipOpen: { paddingTop: 12, paddingBottom: 16 },
  memoSlot: { flex: 1, paddingHorizontal: 5 },
  hint: { fontFamily: font.serif, fontSize: 14, color: color.mist, textAlign: 'center', marginTop: space.l },
});
