import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAvailable, liftSubject } from 'subject-lift';

import { CategoryPicker } from '@/components/CategoryPicker';
import type { CategoryId } from '@/lib/categories';
import { classifyBottle, classifyEnabled } from '@/lib/classify';
import { keepImage } from '@/lib/images';
import { newId, useCellar } from '@/store';
import { color, font, space } from '@/theme';

type Cut = { uri: string; width: number; height: number; lifted: boolean };
type Stage = 'camera' | 'lifting' | 'review';

export default function Capture() {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const add = useCellar((s) => s.add);

  const [stage, setStage] = useState<Stage>('camera');
  const [photo, setPhoto] = useState<string | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('etc');
  const [memo, setMemo] = useState('');
  const [guessing, setGuessing] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // 사용자가 직접 고친 값은 AI 추정이 뒤늦게 와도 덮어쓰지 않는다
  const touched = useRef({ name: false, category: false });

  const reset = () => {
    setStage('camera');
    setPhoto(null);
    setCut(null);
    setName('');
    setCategory('etc');
    setMemo('');
    setSaveError(false);
    touched.current = { name: false, category: false };
  };

  const process = async (uri: string, width: number, height: number) => {
    setPhoto(uri);
    setStage('lifting');
    touched.current = { name: false, category: false };

    setGuessing(classifyEnabled);
    const guess = classifyBottle(uri);

    let next: Cut = { uri, width, height, lifted: false };
    if (isAvailable()) {
      try {
        next = { ...(await liftSubject(uri)), lifted: true };
      } catch {
        // 병을 못 찾으면 사진 그대로 담는다
      }
    }
    setCut(next);
    setStage('review');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const found = await guess;
    if (found) {
      if (!touched.current.category) setCategory(found.category);
      if (!touched.current.name && found.name) setName(found.name);
    }
    setGuessing(false);
  };

  const shoot = async () => {
    const shot = await camera.current?.takePictureAsync({ quality: 0.6 });
    if (shot) await process(shot.uri, shot.width, shot.height);
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) await process(asset.uri, asset.width, asset.height);
  };

  const save = () => {
    if (!cut) return;
    try {
      const id = newId();
      const image = keepImage(cut.uri, id);
      add({
        id,
        name: name.trim(),
        category,
        memo: memo.trim(),
        image,
        width: cut.width,
        height: cut.height,
        createdAt: Date.now(),
      });
      router.back();
    } catch {
      setSaveError(true);
    }
  };

  if (stage === 'review' && cut) {
    return (
      <KeyboardAvoidingView style={styles.review} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: space.l, paddingTop: insets.top + space.m, paddingBottom: insets.bottom + space.l }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stageBox}>
            <View style={styles.halo} />
            <Image
              source={{ uri: cut.uri }}
              style={[styles.cutout, !cut.lifted && styles.cutoutPlain]}
              contentFit={cut.lifted ? 'contain' : 'cover'}
              accessibilityLabel="방금 찍은 병"
            />
          </View>
          {!cut.lifted && (
            <Text style={styles.notice}>병만 떼어 내지 못해 사진 그대로 담아요. 병을 화면 가운데에 두고 다시 찍으면 잘 돼요.</Text>
          )}

          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={(v) => {
                touched.current.name = true;
                setName(v);
              }}
              placeholder={guessing ? '라벨을 읽는 중…' : '병 이름'}
              placeholderTextColor={color.mist}
              style={styles.name}
              accessibilityLabel="병 이름"
              returnKeyType="done"
            />
            {guessing && <ActivityIndicator color={color.brass} />}
          </View>

          <CategoryPicker
            value={category}
            onChange={(id) => {
              touched.current.category = true;
              setCategory(id);
            }}
          />

          <View style={styles.note}>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="누구와, 어디서, 어떤 맛이었는지"
              placeholderTextColor="#9A8C6C"
              style={styles.noteText}
              accessibilityLabel="메모"
              multiline
              maxLength={120}
            />
          </View>

          {saveError && <Text style={styles.error}>병을 저장하지 못했어요. 저장 공간을 확인하고 다시 눌러 주세요.</Text>}

          <View style={styles.actions}>
            <Pressable onPress={reset} accessibilityRole="button" style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
              <Text style={styles.ghostLabel}>다시 찍기</Text>
            </Pressable>
            <Pressable onPress={save} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryLabel}>술장에 담기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const close = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="닫기"
      hitSlop={12}
      style={[styles.close, { top: insets.top + space.s }]}
    >
      <Ionicons name="close" size={28} color={color.label} />
    </Pressable>
  );

  if (!permission) return <View style={styles.camera} />;

  if (!permission.granted) {
    return (
      <View style={[styles.camera, styles.center]}>
        {close}
        <Text style={styles.askTitle}>카메라를 켜야 병을 찍을 수 있어요</Text>
        <Pressable
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, styles.askButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryLabel}>{permission.canAskAgain ? '카메라 켜기' : '설정에서 카메라 켜기'}</Text>
        </Pressable>
        <Pressable onPress={pick} accessibilityRole="button" style={styles.askAlt}>
          <Text style={styles.ghostLabel}>앨범에서 고르기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.camera}>
      {stage === 'lifting' && photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      )}

      {stage === 'lifting' ? (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
          <ActivityIndicator size="large" color={color.glow} />
          <Text style={styles.working}>병만 떼어 내는 중…</Text>
        </View>
      ) : (
        <>
          {close}
          <View style={styles.guide} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Text style={[styles.tip, { top: insets.top + 64 }]}>라벨이 보이게, 병 하나만 가운데에</Text>

          <View style={[styles.controls, { paddingBottom: insets.bottom + space.l }]}>
            <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="앨범에서 고르기" style={styles.round}>
              <Ionicons name="images-outline" size={22} color={color.label} />
            </Pressable>
            <Pressable
              onPress={shoot}
              accessibilityRole="button"
              accessibilityLabel="병 찍기"
              style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
            >
              <View style={styles.shutterCore} />
            </Pressable>
            <View style={styles.roundSpacer} />
          </View>
        </>
      )}
    </View>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.l },
  dim: { backgroundColor: 'rgba(7,17,14,0.6)' },
  working: { fontFamily: font.serif, fontSize: 16, color: color.label, marginTop: space.m },
  close: { position: 'absolute', left: space.m, zIndex: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  guide: { position: 'absolute', left: '24%', right: '24%', top: '20%', bottom: '30%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: color.glow },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  tip: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: font.serif,
    fontSize: 14,
    color: color.label,
    backgroundColor: 'rgba(7,17,14,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,17,14,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundSpacer: { width: 48 },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: color.glow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: color.glow },
  pressed: { opacity: 0.6 },

  askTitle: { fontFamily: font.serifBold, fontSize: 19, color: color.label, textAlign: 'center', marginBottom: space.l },
  askButton: { flex: 0, alignSelf: 'center', paddingHorizontal: space.l },
  askAlt: { marginTop: space.m, padding: space.s },

  review: { flex: 1, backgroundColor: color.glass },
  stageBox: { height: 320, alignItems: 'center', justifyContent: 'flex-end', marginBottom: space.l },
  halo: {
    position: 'absolute',
    bottom: 10,
    width: 340,
    height: 340,
    backgroundImage: 'radial-gradient(circle, rgba(244,228,184,0.22) 0%, rgba(244,228,184,0) 68%)',
  },
  cutout: { width: '70%', height: 300 },
  cutoutPlain: { width: 200, borderRadius: 8 },
  notice: { fontFamily: font.serif, fontSize: 13, lineHeight: 20, color: color.mist, marginBottom: space.m },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.glassLine,
    marginBottom: space.m,
  },
  name: { flex: 1, fontFamily: font.serifBold, fontSize: 24, color: color.label, paddingVertical: 10 },
  note: {
    backgroundColor: color.label,
    borderRadius: 2,
    padding: space.m,
    marginTop: space.m,
    minHeight: 110,
    transform: [{ rotate: '-0.6deg' }],
  },
  noteText: { fontFamily: font.pen, fontSize: 24, lineHeight: 28, color: color.labelInk, padding: 0, minHeight: 80, textAlignVertical: 'top' },
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
});
