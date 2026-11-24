import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buyThemes, PRICE } from '@/lib/purchases';
import { themeOf, type ThemeId } from '@/lib/themes';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

type Props = {
  theme: ThemeId | null;
  onClose: () => void;
  /** 샀거나 체험을 골랐을 때. 부른 쪽이 그 테마로 그린다. */
  onReady: (id: ThemeId) => void;
};

/** 잠긴 테마를 눌렀을 때: 미리보기, 한 번 무료 체험, 구매. */
export function ThemeSheet({ theme, onClose, onReady }: Props) {
  const insets = useSafeAreaInsets();
  const trials = useCellar((s) => s.trialsUsed);
  const spendTrial = useCellar((s) => s.spendTrial);
  const [buying, setBuying] = useState<'one' | 'all' | null>(null);

  if (!theme) return null;
  const t = themeOf(theme);
  const canTry = !trials.includes(theme);

  const buy = async (target: 'one' | 'all') => {
    setBuying(target);
    try {
      if (await buyThemes(target === 'all' ? 'all' : theme)) onReady(theme);
    } finally {
      setBuying(null);
    }
  };

  const tryOnce = () => {
    spendTrial(theme);
    onReady(theme);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]}>
        <View style={styles.grip} />
        <View style={styles.head}>
          <Image source={t.preview} style={styles.preview} contentFit="cover" />
          <View style={styles.copy}>
            <Text style={styles.title}>{t.label}</Text>
            <Text style={styles.blurb}>{t.blurb}</Text>
            <Text style={styles.body}>찍은 병을 이 화풍으로 그려 진열장에 담아요. 한 번 사면 계속 쓸 수 있어요.</Text>
          </View>
        </View>

        {canTry && (
          <Pressable onPress={tryOnce} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryLabel}>이 병으로 한 번 무료로 그려 보기</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => buy('one')}
          disabled={!!buying}
          accessibilityRole="button"
          style={({ pressed }) => [canTry ? styles.secondary : styles.primary, pressed && styles.pressed]}
        >
          {buying === 'one' ? (
            <ActivityIndicator color={canTry ? color.glow : color.labelInk} />
          ) : (
            <Text style={canTry ? styles.secondaryLabel : styles.primaryLabel}>
              {t.label} 열기 · {PRICE.theme}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => buy('all')}
          disabled={!!buying}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          {buying === 'all' ? (
            <ActivityIndicator color={color.glow} />
          ) : (
            <Text style={styles.secondaryLabel}>인상주의·유화·크레용 모두 열기 · {PRICE.all}</Text>
          )}
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterLabel}>다음에</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: color.glass,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: space.l,
    paddingTop: space.s,
    gap: space.s,
  },
  grip: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.glassLine, marginBottom: space.s },
  head: { flexDirection: 'row', gap: space.m, marginBottom: space.m },
  preview: { width: 96, height: 136, borderRadius: 8 },
  copy: { flex: 1, justifyContent: 'center' },
  title: { fontFamily: font.serifBold, fontSize: 22, color: color.label },
  blurb: { fontFamily: font.serif, fontSize: 14, color: color.brass, marginTop: 4 },
  body: { fontFamily: font.serif, fontSize: 13, lineHeight: 20, color: color.mist, marginTop: space.s },
  primary: { height: 52, borderRadius: 26, backgroundColor: color.glow, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontFamily: font.serifBold, fontSize: 15, color: color.labelInk },
  secondary: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: color.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontFamily: font.serif, fontSize: 15, color: color.label },
  later: { alignSelf: 'center', padding: space.s },
  laterLabel: { fontFamily: font.serif, fontSize: 13, color: color.mist },
  pressed: { opacity: 0.6 },
});
