import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isUnlocked } from '@/lib/purchases';
import { THEMES, type ThemeId } from '@/lib/themes';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

type Props = {
  value: ThemeId | null;
  /** 지금 그리고 있는 테마 */
  busy?: ThemeId | null;
  onSelect: (id: ThemeId) => void;
};

/** 그림 테마 고르기. 잠긴 테마는 자물쇠, 무료 체험이 남아 있으면 "한 번 무료". */
export function ThemePicker({ value, busy, onSelect }: Props) {
  const owned = useCellar((s) => s.ownedThemes);
  const trials = useCellar((s) => s.trialsUsed);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {THEMES.map((t) => {
        const open = isUnlocked(t.id, owned);
        const on = value === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label} 테마${open ? '' : ', 잠김'}`}
            style={[styles.card, on && styles.cardOn]}
          >
            <View style={styles.thumbWrap}>
              <Image source={t.preview} style={styles.thumb} contentFit="cover" />
              {busy === t.id && (
                <View style={styles.busy}>
                  <ActivityIndicator color={color.glow} size="small" />
                </View>
              )}
              {!open && (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={11} color={color.labelInk} />
                </View>
              )}
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
            {!open && !trials.includes(t.id) && <Text style={styles.trial}>한 번 무료</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.s, paddingVertical: space.xs },
  card: {
    width: 76,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.glassLine,
  },
  cardOn: { borderColor: color.glow, backgroundColor: 'rgba(244,228,184,0.08)' },
  thumbWrap: { width: 48, height: 64, borderRadius: 6, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  busy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,14,0.5)',
  },
  lock: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.glow,
  },
  label: { fontFamily: font.serif, fontSize: 13, color: color.label, marginTop: 6 },
  labelOn: { fontFamily: font.serifBold, color: color.glow },
  trial: { fontSize: 10, color: color.brass, marginTop: 2 },
});
