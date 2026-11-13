import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottleImage } from '@/components/BottleImage';
import { FilterChips } from '@/components/FilterChips';
import { seeded } from '@/components/FloatingBottle';
import { MemoSlip } from '@/components/MemoSlip';
import { type Bottle, useCellar } from '@/store';
import { color, font, space } from '@/theme';

const PER_SHELF = 3;
const MIN_SHELVES = 3;

function Shelf({ bottles }: { bottles: Bottle[] }) {
  const slots = Array.from({ length: PER_SHELF }, (_, i) => bottles[i]);
  return (
    <View>
      {/* 뒤에서 비추는 조명 칸 */}
      <LinearGradient colors={[color.glow, color.glowDeep]} style={styles.bay}>
        <View style={styles.led} />
        <View style={styles.bayRow}>
          {slots.map((bottle, i) => (
            <View key={bottle?.id ?? `empty-${i}`} style={styles.slot}>
              {bottle ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/bottle/[id]', params: { id: bottle.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${bottle.name || '이름 없는 병'} 자세히 보기`}
                  style={({ pressed }) => [styles.bottleHit, pressed && { opacity: 0.7 }]}
                >
                  <BottleImage bottle={bottle} style={styles.bottle} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* 유리 선반과 황동 레일 */}
      <View style={styles.rail} />
      <View style={styles.board} />

      <View style={styles.memoRow}>
        {slots.map((bottle, i) => (
          <View key={bottle?.id ?? `empty-${i}`} style={styles.memoSlot}>
            {bottle ? (
              <MemoSlip name={bottle.name} memo={bottle.memo} tilt={(seeded(bottle.id, 5) - 0.5) * 5} />
            ) : null}
          </View>
        ))}
      </View>
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
      <View style={{ paddingTop: insets.top + space.s }}>
        <View style={styles.head}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="술장으로 돌아가기"
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={24} color={color.label} />
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
        <View style={styles.frame}>
          {shelves.map((row, i) => (
            <Shelf key={i} bottles={row} />
          ))}
        </View>
        {bottles.length === 0 && (
          <Text style={styles.hint}>병을 찍어 담으면 여기 선반에 차례로 놓여요.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.serifBold, fontSize: 22, color: color.label, letterSpacing: 1 },
  frame: {
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: color.brass,
    backgroundColor: color.glass,
  },
  bay: { height: 190, justifyContent: 'flex-end', overflow: 'hidden' },
  led: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFFDF2',
    boxShadow: '0 0 18px 6px rgba(255,250,225,0.9)',
  },
  bayRow: { flexDirection: 'row', alignItems: 'flex-end', height: 166 },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bottleHit: { width: '84%', height: '100%' },
  bottle: { width: '100%', height: '100%' },
  rail: { height: 3, backgroundColor: color.brass },
  board: { height: 7, backgroundColor: 'rgba(244,228,184,0.28)' },
  memoRow: { flexDirection: 'row', paddingTop: 10, paddingBottom: 18, minHeight: 40 },
  memoSlot: { flex: 1, paddingHorizontal: 6 },
  hint: { fontFamily: font.serif, fontSize: 14, color: color.mist, textAlign: 'center', marginTop: space.l },
});
