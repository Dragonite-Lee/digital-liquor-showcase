import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SmallText } from '@/components/bottle/parts';
import { themeOf, type ThemeId, withRo } from '@/lib/themes';
import { font, paper } from '@/theme';

type Props = {
  /** 고른 테마. null이면 누끼 */
  theme: ThemeId | null;
  /** 고른 테마의 그림이 이미 있는지 */
  drawn: boolean;
  painting: boolean;
  error: string | null;
  limitHit?: boolean;
  onDraw: () => void;
};

/**
 * 테마 카드 아래: 고르기만 해서는 그리지 않는다.
 * 견본을 보여 주고 "그리기"를 눌러야 그린다. 그린 뒤에는 아무것도 없다 (고른 카드를 다시 누르면 누끼).
 */
export function ThemeAction({ theme, drawn, painting, error, limitHit, onDraw }: Props) {
  if (!theme) return <SmallText tone="soft">테마를 고르면 그 화풍으로 그려 드려요. 고르지 않으면 사진 그대로 담겨요.</SmallText>;
  const t = themeOf(theme);

  return (
    <View style={styles.wrap}>
      {!drawn && !painting && (
        <View style={styles.sample}>
          <Image source={t.preview} style={styles.preview} contentFit="cover" accessibilityLabel={`${t.label} 견본`} />
          <View style={styles.sampleText}>
            <Text style={styles.caption}>이런 느낌으로 그려요</Text>
            <Pressable
              onPress={onDraw}
              accessibilityRole="button"
              style={({ pressed }) => [styles.draw, pressed && styles.pressed]}
            >
              <Text style={styles.drawLabel}>{withRo(t.label)} 그리기</Text>
            </Pressable>
          </View>
        </View>
      )}
      {error && (
        <SmallText tone="accent">
          {limitHit ? error : '그리지 못했어요. 잠시 뒤 다시 눌러 주세요.'}
          {__DEV__ && !limitHit ? `\n개발용 — ${error}` : ''}
        </SmallText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  sample: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  preview: { width: 60, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: paper.ink },
  sampleText: { flex: 1, gap: 8 },
  caption: { fontFamily: font.hand, fontSize: 14, color: paper.ink },
  draw: {
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: paper.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  drawLabel: { fontFamily: font.hand, fontSize: 17, color: paper.ink },
  pressed: { opacity: 0.5 },
});
