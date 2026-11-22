import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/CategoryPicker';
import { BottleImage } from '@/components/BottleImage';
import { Halo } from '@/components/Halo';
import { NotePaper } from '@/components/NotePaper';
import { illustrateBottle, illustrateEnabled } from '@/lib/illustrate';
import { dropImage, imageUri, keepImage } from '@/lib/images';
import { useCellar } from '@/store';
import { color, font, space } from '@/theme';

const dateText = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 담음`;
};

export default function BottleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bottle = useCellar((s) => s.bottles.find((b) => b.id === id));
  const update = useCellar((s) => s.update);
  const remove = useCellar((s) => s.remove);
  const [painting, setPainting] = useState(false);
  const [paintError, setPaintError] = useState<string | null>(null);

  if (!bottle) {
    return (
      <View style={[styles.screen, styles.gone]}>
        <Text style={styles.date}>술장에서 뺀 병이에요.</Text>
      </View>
    );
  }

  /** 이미 담은 병을 수채화로 (다시) 그린다 */
  const paint = async () => {
    if (painting) return;
    setPainting(true);
    setPaintError(null);
    try {
      const art = await illustrateBottle(imageUri(bottle.image), bottle.width, bottle.height, !!bottle.sticker);
      const stamp = Date.now().toString(36);
      const next = {
        art: keepImage(art.uri, `${bottle.id}-art-${stamp}`),
        artSticker: art.stickerUri ? keepImage(art.stickerUri, `${bottle.id}-art-sticker-${stamp}`) : undefined,
      };
      if (bottle.art) dropImage(bottle.art);
      if (bottle.artSticker) dropImage(bottle.artSticker);
      update(bottle.id, next);
    } catch (e) {
      setPaintError(e instanceof Error ? e.message : String(e));
    } finally {
      setPainting(false);
    }
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
          <Pressable
            onPress={paint}
            disabled={painting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.paint, pressed && { opacity: 0.6 }]}
          >
            {painting ? (
              <ActivityIndicator color={color.glow} size="small" />
            ) : (
              <Ionicons name="color-palette-outline" size={16} color={color.glow} />
            )}
            <Text style={styles.paintLabel}>
              {painting ? '수채화로 그리는 중…' : bottle.art ? '수채화 다시 그리기' : '수채화로 그리기'}
            </Text>
          </Pressable>
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
  paint: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(244,228,184,0.4)',
    marginBottom: space.l,
  },
  paintLabel: { fontFamily: font.serif, fontSize: 13, color: color.glow },
  paintError: { fontFamily: font.serif, fontSize: 12, color: '#F0A8A8', textAlign: 'center', marginTop: -space.m, marginBottom: space.l },
  name: { fontFamily: font.serifBold, fontSize: 26, lineHeight: 34, color: color.label, padding: 0 },
  date: { fontFamily: font.serif, fontSize: 13, color: color.mist, marginTop: 6, marginBottom: space.m },
});
