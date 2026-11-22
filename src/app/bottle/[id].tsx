import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/CategoryPicker';
import { BottleImage } from '@/components/BottleImage';
import { Halo } from '@/components/Halo';
import { NotePaper } from '@/components/NotePaper';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { ThemeSheet } from '@/components/themes/ThemeSheet';
import { illustrateBottle, illustrateEnabled } from '@/lib/illustrate';
import { isUnlocked } from '@/lib/purchases';
import { themeOf, type ThemeId } from '@/lib/themes';
import { dropImage, imageUri, keepImage } from '@/lib/images';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

const dateText = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 담음`;
};

export default function BottleDetail() {
  const { id, try: tryTheme } = useLocalSearchParams<{ id: string; try?: ThemeId }>();
  const insets = useSafeAreaInsets();
  const bottle = useCellar((s) => s.bottles.find((b) => b.id === id));
  const update = useCellar((s) => s.update);
  const remove = useCellar((s) => s.remove);
  const owned = useCellar((s) => s.ownedThemes);
  const [painting, setPainting] = useState<ThemeId | null>(null);
  const [paintError, setPaintError] = useState<string | null>(null);
  // 홈의 권유 카드에서 들어오면 그 테마의 체험 시트를 바로 연다
  const [locked, setLocked] = useState<ThemeId | null>(tryTheme && !isUnlocked(tryTheme, owned) ? tryTheme : null);

  if (!bottle) {
    return (
      <View style={[styles.screen, styles.gone]}>
        <Text style={styles.date}>술장에서 뺀 병이에요.</Text>
      </View>
    );
  }

  /** 이미 담은 병을 고른 테마로 (다시) 그린다. 원본 사진이 남아 있으면 그걸로, 없으면 누끼로. */
  const paint = async (theme: ThemeId) => {
    if (painting) return;
    setPainting(theme);
    setPaintError(null);
    try {
      const art = bottle.photo
        ? await illustrateBottle(imageUri(bottle.photo), 1024, 1024 * (bottle.height / bottle.width || 1), theme)
        : await illustrateBottle(imageUri(bottle.image), bottle.width, bottle.height, theme, !!bottle.sticker);
      const stamp = Date.now().toString(36);
      const next = {
        art: keepImage(art.uri, `${bottle.id}-art-${stamp}`),
        artSticker: art.stickerUri ? keepImage(art.stickerUri, `${bottle.id}-art-sticker-${stamp}`) : undefined,
        theme,
      };
      if (bottle.art) dropImage(bottle.art);
      if (bottle.artSticker) dropImage(bottle.artSticker);
      update(bottle.id, next);
    } catch (e) {
      setPaintError(e instanceof Error ? e.message : String(e));
    } finally {
      setPainting(null);
    }
  };

  const pickTheme = (theme: ThemeId) => {
    if (isUnlocked(theme, owned)) paint(theme);
    else setLocked(theme);
  };

  const confirmRemove = () => {
    const go = () => {
      router.back();
      remove(bottle.id);
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('술장에서 뺄까요?', '사진과 메모가 함께 지워져요.', [
      { text: '그대로 두기', style: 'cancel' },
      { text: '술장에서 빼기', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.bar}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={12}>
            <Ionicons name="close" size={26} color={color.label} />
          </Pressable>
          <Pressable onPress={confirmRemove} accessibilityRole="button" accessibilityLabel="술장에서 빼기" hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color={color.mist} />
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Halo style={styles.halo} />
          <BottleImage bottle={bottle} style={styles.image} />
        </View>

        {illustrateEnabled && (
          <View style={styles.themes}>
            <Text style={styles.themesTitle}>
              {painting ? `${themeOf(painting).label}(으)로 그리는 중…` : '다른 화풍으로 다시 그리기'}
            </Text>
            <ThemePicker value={bottle.art ? (bottle.theme ?? 'watercolor') : null} busy={painting} onSelect={pickTheme} />
          </View>
        )}
        {paintError && <Text style={styles.paintError}>그리지 못했어요. 잠시 뒤 다시 눌러 주세요.{__DEV__ ? `\n${paintError}` : ''}</Text>}

        <TextInput
          value={bottle.name}
          onChangeText={(name) => update(bottle.id, { name })}
          placeholder="병 이름"
          placeholderTextColor={color.mist}
          style={styles.name}
          accessibilityLabel="병 이름"
          multiline
        />
        <Text style={styles.date}>{dateText(bottle.createdAt)}</Text>

        <CategoryPicker value={bottle.category} onChange={(category) => update(bottle.id, { category })} />

        <NotePaper value={bottle.memo} onChangeText={(memo) => update(bottle.id, { memo })} />
      </ScrollView>
      <ThemeSheet
        theme={locked}
        onClose={() => setLocked(null)}
        onReady={(theme) => {
          setLocked(null);
          paint(theme);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.glass },
  gone: { alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stage: { height: 340, alignItems: 'center', justifyContent: 'flex-end', marginTop: space.s, marginBottom: space.l },
  halo: { bottom: 20 },
  image: { width: '70%', height: 320 },
  themes: { marginBottom: space.l },
  themesTitle: { fontFamily: font.serif, fontSize: 13, color: color.mist, marginBottom: space.s },
  paintError: { fontFamily: font.serif, fontSize: 12, color: '#F0A8A8', textAlign: 'center', marginTop: -space.m, marginBottom: space.l },
  name: { fontFamily: font.serifBold, fontSize: 26, lineHeight: 34, color: color.label, padding: 0 },
  date: { fontFamily: font.serif, fontSize: 13, color: color.mist, marginTop: 6, marginBottom: space.m },
});
