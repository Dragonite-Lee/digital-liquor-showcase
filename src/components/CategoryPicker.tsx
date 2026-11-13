import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, type CategoryId } from '@/lib/categories';
import { color, font } from '@/theme';

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
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: color.glassLine,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: color.glow, borderColor: color.glow },
  label: { fontFamily: font.serif, fontSize: 14, color: color.label },
  labelOn: { fontFamily: font.serifBold, color: color.labelInk },
});
