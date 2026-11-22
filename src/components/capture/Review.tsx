import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryPicker } from '@/components/CategoryPicker';
import { Halo } from '@/components/Halo';
import { NotePaper } from '@/components/NotePaper';
import type { Capture, Cut, GuessState } from '@/lib/useCapture';
import { color, font, space } from '@/theme';

const HINT: Record<GuessState, string> = {
  reading: '라벨을 읽고 있어요.',
  found: '라벨에서 읽은 이름이에요. 다르면 눌러서 고쳐 주세요.',
  missed: '라벨을 읽지 못했어요. 이름을 직접 적어 주세요.',
  off: '이름과 종류를 직접 적어 주세요.',
};

/** 떼어 낸 병을 확인하고 이름·종류·메모를 적는 단계. */
export function Review({ capture, cut, onSaved }: { capture: Capture; cut: Cut; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, guess } = capture;
  const reading = guess === 'reading';
  // 그림이 오면 그림, 아니면 누끼(또는 사진)
  const shown = capture.art ?? cut;
  const plain = !capture.art && !cut.lifted;

  return (
    <KeyboardAvoidingView style={styles.review} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: space.l, paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.l }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stageBox}>
          <Halo style={styles.halo} />
          <Image
            source={{ uri: shown.uri }}
            style={[styles.cutout, plain && styles.cutoutPlain]}
            contentFit={plain ? 'cover' : 'contain'}
            transition={400}
            accessibilityLabel={capture.art ? '수채화로 그린 병' : '방금 찍은 병'}
          />
          {capture.paint === 'painting' && (
            <View style={styles.painting}>
              <ActivityIndicator color={color.labelInk} size="small" />
              <Text style={styles.paintingText}>수채화로 그리는 중…</Text>
            </View>
          )}
        </View>
        {!cut.lifted && (
          <Text style={styles.notice}>
            병만 떼어 내지 못해 사진 그대로 담아요. 병을 화면 가운데에 두고 다시 찍으면 잘 돼요.
          </Text>
        )}
        {__DEV__ && cut.liftError && <Text style={styles.debug}>개발용 — 원인: {cut.liftError}</Text>}
        {capture.paint === 'failed' && (
          <Text style={styles.notice}>수채화를 그리지 못해 사진으로 담아요. 담은 뒤 병 화면에서 다시 그릴 수 있어요.</Text>
        )}
        {__DEV__ && capture.paintError && <Text style={styles.debug}>개발용 — 그림: {capture.paintError}</Text>}

        <View style={styles.nameRow}>
          <TextInput
            value={draft.name}
            onChangeText={capture.setName}
            placeholder={reading ? '라벨을 읽는 중…' : '병 이름'}
            placeholderTextColor={color.mist}
            style={styles.name}
            accessibilityLabel="병 이름"
            returnKeyType="done"
          />
          {reading ? <ActivityIndicator color={color.brass} /> : <Ionicons name="pencil" size={16} color={color.mist} />}
        </View>
        <Text style={styles.nameHint}>{HINT[guess]}</Text>
        {__DEV__ && capture.guessError && <Text style={styles.debug}>개발용 — 라벨: {capture.guessError}</Text>}

        <CategoryPicker value={draft.category} onChange={capture.setCategory} />
        <NotePaper value={draft.memo} onChangeText={capture.setMemo} />

        {capture.saveError && (
          <Text style={styles.error}>병을 저장하지 못했어요. 저장 공간을 확인하고 다시 눌러 주세요.</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={capture.reset}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Text style={styles.ghostLabel}>다시 찍기</Text>
          </Pressable>
          <Pressable
            onPress={() => capture.save() && onSaved()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>술장에 담기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  review: { flex: 1, backgroundColor: color.glass },
  stageBox: { height: 350, alignItems: 'center', justifyContent: 'flex-end', marginBottom: space.l },
  halo: { bottom: 10 },
  cutout: { width: '70%', height: 330 },
  cutoutPlain: { width: 200, borderRadius: 8 },
  painting: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.glow,
  },
  paintingText: { fontFamily: font.serif, fontSize: 13, color: color.labelInk },
  notice: { fontFamily: font.serif, fontSize: 13, lineHeight: 20, color: color.mist, marginBottom: space.m },
  debug: { fontSize: 11, color: '#F0A8A8', marginBottom: space.m },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.glassLine,
  },
  nameHint: { fontFamily: font.serif, fontSize: 12.5, color: color.mist, marginTop: 6, marginBottom: space.m },
  name: { flex: 1, fontFamily: font.serifBold, fontSize: 24, color: color.label, paddingVertical: 10 },
  error: { fontFamily: font.serif, fontSize: 13, color: '#F0A8A8', marginTop: space.m },
  actions: { flexDirection: 'row', gap: space.s, marginTop: space.l },
  ghost: {
    height: 54,
    paddingHorizontal: space.l,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: color.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { fontFamily: font.serif, fontSize: 16, color: color.label },
  primary: { flex: 1, height: 54, borderRadius: 27, backgroundColor: color.glow, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontFamily: font.serifBold, fontSize: 17, color: color.labelInk },
  pressed: { opacity: 0.6 },
});
