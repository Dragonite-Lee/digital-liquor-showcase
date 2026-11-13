import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Review } from '@/components/capture/Review';
import { useCapture } from '@/lib/useCapture';
import { color, font, space } from '@/theme';

// 누끼가 선명하도록 원본은 높은 화질로 받는다 (분류 서버로는 줄여서 보낸다)
const PHOTO_QUALITY = 0.85;

export default function Capture() {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const capture = useCapture();
  const lifting = capture.stage === 'lifting';

  const shoot = async () => {
    const shot = await camera.current?.takePictureAsync({ quality: PHOTO_QUALITY });
    if (shot) await capture.process(shot.uri, shot.width, shot.height);
  };

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: PHOTO_QUALITY });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) await capture.process(asset.uri, asset.width, asset.height);
  };

  if (capture.stage === 'review' && capture.cut) {
    return <Review capture={capture} cut={capture.cut} onSaved={() => router.back()} />;
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
      {lifting && capture.photo ? (
        <Image source={{ uri: capture.photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      )}

      {lifting ? (
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
  ghostLabel: { fontFamily: font.serif, fontSize: 16, color: color.label },
  primary: { flex: 1, height: 54, borderRadius: 27, backgroundColor: color.glow, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontFamily: font.serifBold, fontSize: 17, color: color.labelInk },
});
