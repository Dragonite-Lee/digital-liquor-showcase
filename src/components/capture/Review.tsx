import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/CategoryPicker';
import { formStyles, MemoBox, NameField, PaperScreen, SectionTitle, SmallText, UnderlineButton } from '@/components/bottle/parts';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { ThemeSheet } from '@/components/themes/ThemeSheet';
import { illustrateEnabled } from '@/lib/illustrate';
import { isUnlocked } from '@/lib/purchases';
import { themeOf, type ThemeId } from '@/lib/themes';
import type { Capture, Cut, GuessState } from '@/lib/useCapture';
import { useCellar } from '@/store';
import { font, paper } from '@/theme';

const HINT: Record<GuessState, string> = {
  reading: '라벨을 읽고 있어요',
  found: '라벨에서 읽은 이름이에요. 다르면 고쳐 주세요',
  missed: '라벨을 읽지 못했어요. 이름을 적어 주세요',
  off: '이름과 주종을 적어 주세요',
};

/** 찍은 병을 확인하고 테마·이름·주종·기록을 정해 담는 단계 (병 상세와 같은 "술병 진열하기" 화면) */
export function Review({ capture, cut, onSaved }: { capture: Capture; cut: Cut; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, guess } = capture;
  const reading = guess === 'reading';
  const owned = useCellar((s) => s.ownedThemes);
  const [locked, setLocked] = useState<ThemeId | null>(null);

  const pickTheme = (id: ThemeId) => {
    if (isUnlocked(id, owned)) capture.paintAs(id);
    else setLocked(id);
  };
  // 그림이 오면 그림, 아니면 누끼(또는 사진)
  const shown = capture.art ?? cut;
  const plain = !capture.art && !cut.lifted;
  const painting = capture.paint === 'painting';

  return (
    <PaperScreen title="술병 진열하기" onClose={() => router.back()}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
          <View style={[formStyles.stage, styles.stage]}>
            <Image
              source={{ uri: shown.uri }}
              style={[formStyles.bottle, plain && styles.plain]}
              contentFit={plain ? 'cover' : 'contain'}
              transition={400}
              accessibilityLabel={capture.art ? `${themeOf(capture.theme).label}(으)로 그린 병` : '방금 찍은 병'}
            />
            {painting && (
              <View style={styles.painting}>
                <ActivityIndicator color={paper.cream} size="small" />
                <Text style={styles.paintingText}>{themeOf(capture.theme).label}(으)로 그리는 중…</Text>
              </View>
            )}
          </View>

          <View style={formStyles.body}>
            {!cut.lifted && (
              <SmallText tone="soft">병만 떼어 내지 못해 사진 그대로 담아요. 병을 화면 가운데에 두고 다시 찍으면 잘 돼요.</SmallText>
            )}
            {__DEV__ && cut.liftError && <SmallText tone="accent">개발용 — 원인: {cut.liftError}</SmallText>}

            {illustrateEnabled && (
              <View style={formStyles.option}>
                <SectionTitle>테마를 선택해 주세요</SectionTitle>
                <ThemePicker value={capture.theme} busy={painting ? capture.theme : null} onSelect={pickTheme} />
                {capture.paint === 'failed' && (
                  <SmallText tone="accent">그림을 그리지 못해 사진으로 담아요. 담은 뒤 다시 그릴 수 있어요.</SmallText>
                )}
                {__DEV__ && capture.paintError && <SmallText tone="accent">개발용 — 그림: {capture.paintError}</SmallText>}
              </View>
            )}

            <View style={formStyles.option}>
              <NameField
                value={draft.name}
                onChange={capture.setName}
                busy={reading}
                placeholder={reading ? '라벨을 읽는 중…' : '병 이름'}
              />
              <SmallText tone={guess === 'missed' ? 'accent' : 'ink'}>{HINT[guess]}</SmallText>
              {__DEV__ && capture.guessError && <SmallText tone="accent">개발용 — 라벨: {capture.guessError}</SmallText>}
            </View>

            <View style={formStyles.option}>
              <SectionTitle>주종을 선택해 주세요</SectionTitle>
              <CategoryPicker value={draft.category} onChange={capture.setCategory} />
            </View>

            <MemoBox value={draft.memo} onChange={capture.setMemo} />

            {capture.saveError && <SmallText tone="accent">병을 저장하지 못했어요. 저장 공간을 확인하고 다시 눌러 주세요.</SmallText>}

            <Pressable
              onPress={async () => {
                if (await capture.save()) onSaved();
              }}
              disabled={capture.saving}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, (pressed || capture.saving) && styles.pressed]}
            >
              {capture.saving ? <ActivityIndicator color={paper.bg} /> : <Text style={styles.primaryLabel}>진열장에 담기</Text>}
            </Pressable>
            <UnderlineButton label="다시 찍기" onPress={capture.reset} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ThemeSheet
        theme={locked}
        onClose={() => setLocked(null)}
        onReady={(id) => {
          setLocked(null);
          capture.paintAs(id);
        }}
      />
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { marginTop: 14 },
  plain: { width: 180, borderRadius: 8 },
  painting: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(65,56,54,0.8)',
  },
  paintingText: { fontFamily: font.hand, fontSize: 14, color: paper.cream },
  primary: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: paper.ink },
  primaryLabel: { fontFamily: font.hand, fontSize: 20, color: paper.bg },
  pressed: { opacity: 0.6 },
});
