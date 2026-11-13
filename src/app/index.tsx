import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarLights } from '@/components/BarLights';
import { FilterChips } from '@/components/FilterChips';
import { FloatingBottle, seeded } from '@/components/FloatingBottle';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

const COLS = 3;
const ROW = 204;

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const shown = filter === 'all' ? bottles : bottles.filter((b) => b.category === filter);

  const cell = width / COLS;
  const rows = Math.ceil(shown.length / COLS);

  return (
    <View style={styles.screen}>
      <BarLights />

      <View style={{ paddingTop: insets.top + space.s }}>
        <View style={styles.head}>
          <Text style={styles.title}>술장</Text>
          {bottles.length > 0 && <Text style={styles.total}>{bottles.length}병을 모았어요</Text>}
        </View>
        <FilterChips />
      </View>

      {bottles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 빈 술장이에요</Text>
          <Text style={styles.emptyBody}>
            버리기 아까운 병을 찍어 보세요.{'\n'}병만 떼어 내 여기에 띄워 둘게요.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ height: rows * ROW + 220, paddingTop: space.m }}
          showsVerticalScrollIndicator={false}
        >
          {shown.map((bottle, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const scale = 0.84 + seeded(bottle.id, 7) * 0.2;
            const w = cell * 0.78 * scale;
            const h = 168 * scale;
            const left = col * cell + (cell - w) / 2 + (seeded(bottle.id, 8) - 0.5) * 18;
            const top = row * ROW + (col === 1 ? 34 : 0) + (seeded(bottle.id, 9) - 0.5) * 26 + space.m;
            return (
              <View key={bottle.id} style={{ position: 'absolute', left, top }}>
                <FloatingBottle
                  bottle={bottle}
                  width={w}
                  height={h}
                  onPress={() => router.push({ pathname: '/bottle/[id]', params: { id: bottle.id } })}
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      <LinearGradient
        colors={['rgba(7,17,14,0)', 'rgba(7,17,14,0.92)']}
        style={[styles.dock, { paddingBottom: insets.bottom + space.m }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.push('/cabinet')}
          accessibilityRole="button"
          accessibilityLabel="진열장 열기"
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
        >
          <Ionicons name="grid-outline" size={20} color={color.glow} />
          <Text style={styles.sideLabel}>진열장</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/capture')}
          accessibilityRole="button"
          accessibilityLabel="술병 찍기"
          style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
        >
          <View style={styles.shutterCore}>
            <Ionicons name="camera" size={26} color={color.labelInk} />
          </View>
        </Pressable>

        <View style={styles.side} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.glass },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.m + 4,
    paddingBottom: space.xs,
  },
  title: { fontFamily: font.serifBold, fontSize: 34, color: color.label, letterSpacing: 2 },
  total: { fontFamily: font.serif, fontSize: 14, color: color.mist },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 120, paddingHorizontal: space.xl },
  emptyTitle: { fontFamily: font.serifBold, fontSize: 22, color: color.label, marginBottom: space.s },
  emptyBody: { fontFamily: font.serif, fontSize: 15, lineHeight: 24, color: color.mist, textAlign: 'center' },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 56,
    paddingHorizontal: space.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 76, alignItems: 'center', gap: 4 },
  sideLabel: { fontFamily: font.serif, fontSize: 13, color: color.glow },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: color.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: color.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
