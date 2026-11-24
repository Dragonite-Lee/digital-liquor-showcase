import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottleImage } from '@/components/BottleImage';
import { CategoryPicker } from '@/components/CategoryPicker';
import {
  formStyles,
  MemoBox,
  NameField,
  PaperScreen,
  SectionTitle,
  SmallText,
  UnderlineButton,
} from '@/components/bottle/parts';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { ThemeAction } from '@/components/themes/ThemeAction';
import { ThemeSheet } from '@/components/themes/ThemeSheet';
import { DailyLimitError, illustrateBottle, illustrateEnabled } from '@/lib/illustrate';
import { imageUri, keepImage } from '@/lib/images';
import { isUnlocked } from '@/lib/purchases';
import { themeOf, type ThemeId } from '@/lib/themes';
import { useCellar } from '@/store';
import { font, paper } from '@/theme';

const dateText = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 담음`;
};

/** 병 상세 (피그마 "술병 진열하기") */
export default function BottleDetail() {
  const { id, try: tryTheme } = useLocalSearchParams<{ id: string; try?: ThemeId }>();
  const insets = useSafeAreaInsets();
  const bottle = useCellar((s) => s.bottles.find((b) => b.id === id));
  const update = useCellar((s) => s.update);
  const showTheme = useCellar((s) => s.showTheme);
  const putArt = useCellar((s) => s.putArt);
  const remove = useCellar((s) => s.remove);
  const owned = useCellar((s) => s.ownedThemes);
  const [painting, setPainting] = useState<ThemeId | null>(null);
  const [paintError, setPaintError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  // 고른 테마 (아직 안 그렸으면 견본과 "그리기" 버튼만). 처음엔 지금 보여 주는 그림의 테마
  const [chosen, setChosen] = useState<ThemeId | null>(() => bottle?.theme ?? null);
  // 홈의 권유 카드에서 들어오면 그 테마의 체험 시트를 바로 연다
  const [locked, setLocked] = useState<ThemeId | null>(tryTheme && !isUnlocked(tryTheme, owned) ? tryTheme : null);

  if (!bottle) {
    return (
      <PaperScreen title="술병 진열하기" onClose={() => router.back()}>
        <View style={styles.gone}>
          <Text style={styles.goneText}>진열장에서 뺀 병이에요.</Text>
        </View>
      </PaperScreen>
    );
  }

  const drawn = Object.keys(bottle.arts ?? {}) as ThemeId[];

  /** 고른 테마로 그린다 (redraw면 서버 캐시를 건너뛰고 새로). 원본 사진이 남아 있으면 그걸로, 없으면 누끼로. */
  const paint = async (theme: ThemeId, redraw = false) => {
    if (painting) return;
    setChosen(theme);
    setPainting(theme);
    setPaintError(null);
    try {
      const opts = { bottleId: bottle.id, redraw };
      const art = bottle.photo
        ? await illustrateBottle(imageUri(bottle.photo), 1024, 1024 * (bottle.height / bottle.width || 1), theme, opts)
        : await illustrateBottle(imageUri(bottle.image), bottle.width, bottle.height, theme, { ...opts, png: !!bottle.sticker });
      const stamp = Date.now().toString(36);
      putArt(bottle.id, theme, {
        art: keepImage(art.uri, `${bottle.id}-art-${theme}-${stamp}`),
        artSticker: art.stickerUri ? keepImage(art.stickerUri, `${bottle.id}-art-sticker-${theme}-${stamp}`) : undefined,
      });
    } catch (e) {
      setPaintError(e instanceof Error ? e.message : String(e));
      setLimitHit(e instanceof DailyLimitError);
    } finally {
      setPainting(null);
    }
  };

  // 고르기만 한다: 이미 그린 테마면 바로 바꿔 끼우고(무료), 아니면 견본과 "그리기" 버튼을 보여 준다.
  // 고른 카드를 다시 누르면 누끼로.
  const pickTheme = (theme: ThemeId) => {
    if (painting) return;
    setPaintError(null);
    if (chosen === theme) {
      setChosen(null);
      showTheme(bottle.id, null);
    } else if (drawn.includes(theme)) {
      setChosen(theme);
      showTheme(bottle.id, theme);
    } else if (isUnlocked(theme, owned)) {
      setChosen(theme);
    } else {
      setLocked(theme);
    }
  };

  const confirmRemove = () => {
    const go = () => {
      router.back();
      remove(bottle.id);
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('진열장에서 뺄까요?', '사진과 기록이 함께 지워져요.', [
      { text: '그대로 두기', style: 'cancel' },
      { text: '삭제하기', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <PaperScreen title="술병 진열하기" onClose={() => router.back()}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
          <View style={[formStyles.stage, styles.stage]}>
            <BottleImage bottle={bottle} style={formStyles.bottle} />
          </View>

          <View style={formStyles.body}>
            {illustrateEnabled && (
              <View style={formStyles.option}>
                <SectionTitle>
                  {painting ? `${themeOf(painting).label}(으)로 그리는 중…` : '테마를 선택해 주세요'}
                </SectionTitle>
                <ThemePicker value={chosen} busy={painting} drawn={drawn} onSelect={pickTheme} />
                <ThemeAction
                  theme={chosen}
                  drawn={!!chosen && drawn.includes(chosen)}
                  painting={!!painting}
                  error={paintError}
                  limitHit={limitHit}
                  onDraw={() => chosen && paint(chosen)}
                  onRedraw={() => chosen && paint(chosen, true)}
                  onPlain={() => {
                    setChosen(null);
                    showTheme(bottle.id, null);
                  }}
                />
              </View>
            )}

            <View style={formStyles.option}>
              <NameField value={bottle.name} onChange={(name) => update(bottle.id, { name })} />
              <SmallText>{dateText(bottle.createdAt)}</SmallText>
            </View>

            <View style={formStyles.option}>
              <SectionTitle>주종을 선택해 주세요</SectionTitle>
              <CategoryPicker value={bottle.category} onChange={(category) => update(bottle.id, { category })} />
            </View>

            <MemoBox value={bottle.memo} onChange={(memo) => update(bottle.id, { memo })} />

            <UnderlineButton label="삭제하기" onPress={confirmRemove} hint="진열장에서 이 병을 뺍니다" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ThemeSheet
        theme={locked}
        onClose={() => setLocked(null)}
        onReady={(theme) => {
          setLocked(null);
          paint(theme);
        }}
      />
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 피그마: 헤더 아래 병 그림이 바로 시작
  stage: { marginTop: 14 },
  gone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  goneText: { fontFamily: font.hand, fontSize: 16, color: paper.ink },
});
