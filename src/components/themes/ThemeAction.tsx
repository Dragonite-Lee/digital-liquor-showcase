import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SmallText, UnderlineButton } from '@/components/bottle/parts';
import { themeOf, type ThemeId } from '@/lib/themes';
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
  onRedraw: () => void;
  onPlain: () => void;
};

/**
 * 테마 카드 아래: 고르기만 해서는 그리지 않는다.
 * 견본을 보여 주고 "그리기"를 눌러야 그린다. 그린 뒤에는 다시 그리기·그림 없이 보기.
 */
export function ThemeAction({ theme, drawn, painting, error, limitHit, onDraw, onRedraw, onPlain }: Props) {
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
              <Text style={styles.drawLabel}>{t.label}(으)로 그리기</Text>
            </Pressable>
          </View>
        </View>
      )}
      {drawn && !painting && (
        <View style={styles.links}>
          <UnderlineButton label="다시 그리기" onPress={onRedraw} hint="같은 테마로 새로 그립니다. 하루 그리기 횟수를 씁니다" />
          <UnderlineButton label="그림 없이 보기" onPress={onPlain} hint="사진 누끼로 진열합니다. 그린 그림은 남아 있어요" />
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
  links: { flexDirection: 'row', gap: 20 },
  pressed: { opacity: 0.5 },
});
