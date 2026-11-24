import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, type CategoryId } from '@/lib/categories';
import { font, paper } from '@/theme';

/** 주종 고르기 (피그마 "주종을 선택해 주세요"): 연필 테두리 알약, 고른 것은 흰 바탕 */
export function CategoryPicker({ value, onChange }: { value: CategoryId; onChange: (id: CategoryId) => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="술 종류">
      {CATEGORIES.map((c) => {
        const on = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            hitSlop={4}
            style={({ pressed }) => [styles.chip, on ? styles.chipOn : styles.chipOff, pressed && styles.pressed]}
          >
            <Text style={styles.label}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 28,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: paper.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.5)' },
  chipOff: { opacity: 0.8 },
  pressed: { opacity: 0.5 },
  label: { fontFamily: font.hand, fontSize: 14, color: paper.ink, textAlign: 'center' },
});
