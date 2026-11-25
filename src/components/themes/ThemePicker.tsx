import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrushFrame } from '@/components/BrushFrame';
import { THEMES, type ThemeId } from '@/lib/themes';
import { font, paper } from '@/theme';

type Props = {
  value: ThemeId | null;
  /** 지금 그리고 있는 테마 */
  busy?: ThemeId | null;
  /** 이 병에 이미 그린 테마 (다시 골라도 무료) */
  drawn?: ThemeId[];
  onSelect: (id: ThemeId) => void;
};

/**
 * 그림 테마 고르기 (피그마 "테마를 선택해 주세요"): 네 장의 카드가 한 줄에.
 * 고른 카드는 흰 바탕. 테마는 모두 열려 있고, 이미 그린 테마는 "그렸어요".
 */
export function ThemePicker({ value, busy, drawn = [], onSelect }: Props) {
  return (
    <View style={styles.row}>
      {THEMES.map((t, i) => {
        const on = value === t.id;
        const note = drawn.includes(t.id) ? '그렸어요' : null;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on, busy: busy === t.id }}
            accessibilityLabel={`${t.label} 테마${note ? `, ${note}` : ''}`}
            style={({ pressed }) => [styles.card, on ? styles.cardOn : styles.cardOff, pressed && styles.pressed]}
          >
            <BrushFrame radius={12} seed={i + 1} />
            <View style={styles.thumb}>
              {/* 미리보기는 3:4 그림의 위쪽(병 머리)이 원 안에 오게 */}
              <Image source={t.preview} style={styles.thumbImage} contentFit="cover" />
              {busy === t.id && (
                <View style={styles.busy}>
                  <ActivityIndicator color={paper.cream} size="small" />
                </View>
              )}
            </View>
            <View style={styles.text}>
              <Text style={styles.label}>{t.label}</Text>
              {note && <Text style={styles.note}>{note}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    width: 80,
    height: 120,
    paddingTop: 12,
    gap: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  cardOn: { backgroundColor: 'rgba(255,255,255,0.5)' },
  cardOff: { opacity: 0.8 },
  pressed: { opacity: 0.5 },
  thumb: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  thumbImage: { width: 50, height: 66.667 },
  busy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(65,56,54,0.45)',
  },
  text: { width: 64, gap: 4, alignItems: 'center' },
  label: { fontFamily: font.hand, fontSize: 14, color: paper.ink, textAlign: 'center' },
  note: { fontFamily: font.hand, fontSize: 13, color: paper.accent, textAlign: 'center' },
});
