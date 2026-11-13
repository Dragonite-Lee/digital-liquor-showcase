import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarLights } from '@/components/BarLights';
import { FilterChips } from '@/components/FilterChips';
import { FloatingField } from '@/components/FloatingField';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const shown = filter === 'all' ? bottles : bottles.filter((b) => b.category === filter);

  return (
    <View style={styles.screen}>
      <BarLights />

      {/* 병은 머리글과 버튼 뒤까지 화면 전체를 떠다닌다 */}
      <View style={[StyleSheet.absoluteFill, { top: insets.top + 96, bottom: insets.bottom + 96 }]}>
        <FloatingField
          bottles={shown}
          onOpen={(id) => router.push({ pathname: '/bottle/[id]', params: { id } })}
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
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyTitle}>아직 빈 술장이에요</Text>
          <Text style={styles.emptyBody}>
            버리기 아까운 병을 찍어 보세요.{'\n'}병만 떼어 내 여기에 띄워 둘게요.
          </Text>
        </View>
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
