import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { categoryLabel } from '@/lib/categories';
import { usedCategories, useCellar } from '@/store';
import { font, paper, space } from '@/theme';

/** 모은 술에 있는 종류만 필터로 나온다. 병이 하나도 없으면 숨긴다. */
export function FilterChips() {
  const bottles = useCellar((s) => s.bottles);
  const filter = useCellar((s) => s.filter);
  const setFilter = useCellar((s) => s.setFilter);
  const used = usedCategories(bottles);

  if (used.length === 0) return null;

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
    borderColor: paper.line,
    backgroundColor: 'rgba(255,250,242,0.55)',
  },
  chipOn: { backgroundColor: paper.ink, borderColor: paper.ink },
  label: { fontFamily: font.hand, fontSize: 15, color: paper.ink },
  labelOn: { color: paper.bg },
  count: { fontSize: 11, color: paper.inkSoft, fontVariant: ['tabular-nums'] },
  countOn: { color: 'rgba(251,238,224,0.75)' },
});
