import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottleImage } from '@/components/BottleImage';
import { CategoryPicker } from '@/components/CategoryPicker';
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

  if (!bottle) {
    return (
      <View style={[styles.screen, styles.gone]}>
        <Text style={styles.date}>술장에서 뺀 병이에요.</Text>
      </View>
    );
  }

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
          <View style={styles.halo} />
          <BottleImage bottle={bottle} style={styles.image} />
        </View>

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

        <View style={styles.note}>
          <TextInput
            value={bottle.memo}
            onChangeText={(memo) => update(bottle.id, { memo })}
            placeholder="누구와, 어디서, 어떤 맛이었는지"
            placeholderTextColor="#9A8C6C"
            style={styles.noteText}
            accessibilityLabel="메모"
            multiline
            maxLength={120}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.glass },
  gone: { alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stage: { height: 340, alignItems: 'center', justifyContent: 'flex-end', marginTop: space.s, marginBottom: space.l },
  halo: {
    position: 'absolute',
    bottom: 20,
    width: 340,
    height: 340,
    backgroundImage: 'radial-gradient(circle, rgba(244,228,184,0.22) 0%, rgba(244,228,184,0) 68%)',
  },
  image: { width: '70%', height: 320 },
  name: { fontFamily: font.serifBold, fontSize: 26, lineHeight: 34, color: color.label, padding: 0 },
  date: { fontFamily: font.serif, fontSize: 13, color: color.mist, marginTop: 6, marginBottom: space.m },
  note: {
    backgroundColor: color.label,
    borderRadius: 2,
    padding: space.m,
    marginTop: space.m,
    minHeight: 110,
    transform: [{ rotate: '-0.6deg' }],
  },
  noteText: { fontFamily: font.pen, fontSize: 24, lineHeight: 28, color: color.labelInk, padding: 0, minHeight: 80, textAlignVertical: 'top' },
});
