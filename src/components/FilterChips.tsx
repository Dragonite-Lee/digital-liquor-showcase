import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { categoryLabel } from '@/lib/categories';
import { usedCategories, useCellar } from '@/store';
import { color, font, space } from '@/theme';

/** 모은 술에 있는 종류만 필터로 나온다. 한 종류뿐이면 필터가 필요 없으니 숨긴다. */
export function FilterChips() {
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const setFilter = useCellar((s) => s.setFilter);
  const used = usedCategories(bottles);

  if (used.length < 2) return null;

  const chips = [{ id: 'all' as const, label: '전체', count: bottles.length }].concat(
    used.map((u) => ({ id: u.id as never, label: categoryLabel(u.id), count: u.count })),
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const on = filter === chip.id;
        return (
          <Pressable
            key={chip.id}
            onPress={() => setFilter(chip.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${chip.label} ${chip.count}병`}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{chip.label}</Text>
            <Text style={[styles.count, on && styles.countOn]}>{chip.count}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: space.l, gap: space.s, paddingVertical: space.s },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,228,184,0.35)',
    backgroundColor: 'rgba(7,17,14,0.35)',
  },
  chipOn: { backgroundColor: color.glow, borderColor: color.glow },
  label: { fontFamily: font.serif, fontSize: 14, color: color.label },
  labelOn: { color: color.labelInk },
  count: { fontSize: 12, color: color.mist, fontVariant: ['tabular-nums'] },
  countOn: { color: color.brassDeep },
});
