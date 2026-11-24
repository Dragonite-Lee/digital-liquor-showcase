import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { HandIcon } from '@/components/HandIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Review } from '@/components/capture/Review';
import { useCapture } from '@/lib/useCapture';
import { color, font, paper, space } from '@/theme';

const SHUTTER = require('../../assets/ui/button-camera.png');
const ALBUM = require('../../assets/ui/icon-album.png');

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
    return (
      <>
        <StatusBar style="dark" />
        <Review capture={capture} cut={capture.cut} onSaved={() => router.back()} />
      </>
    );
  }

  const close = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="닫기"
      hitSlop={12}
      style={[styles.close, { top: insets.top + 18 }]}
    >
      <HandIcon name="close" size={23} tint={paper.cream} />
    </Pressable>
  );

  if (!permission) return <View style={styles.camera} />;

  if (!permission.granted) {
    return (
      <View style={[styles.camera, styles.center]}>
        <StatusBar style="light" />
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
      <StatusBar style="light" />
      {lifting && capture.photo ? (
        <Image source={{ uri: capture.photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      )}

      {lifting ? (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
          <ActivityIndicator size="large" color={paper.cream} />
          <Text style={styles.working}>병만 떼어 내는 중…</Text>
        </View>
      ) : (
        <>
          {close}
          <View style={[styles.guide, { top: insets.top + 48 }]} pointerEvents="none">
            <Text style={styles.guideText}>라벨이 보이게 한 병만 촬영해 주세요</Text>
          </View>

          <View style={[styles.controls, { bottom: insets.bottom + 24 }]}>
            <Pressable
              onPress={pick}
              accessibilityRole="button"
              accessibilityLabel="앨범에서 고르기"
              hitSlop={8}
              style={({ pressed }) => [styles.album, pressed && styles.pressed]}
            >
              <Image source={ALBUM} style={styles.albumIcon} contentFit="contain" />
            </Pressable>
            <Pressable
              onPress={shoot}
              accessibilityRole="button"
              accessibilityLabel="병 찍기"
              style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}
            >
              <Image source={SHUTTER} style={styles.shutter} contentFit="contain" />
            </Pressable>
            <View style={styles.album} />
          </View>
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.l },
  dim: { backgroundColor: 'rgba(65,56,54,0.6)' },
  working: { fontFamily: font.hand, fontSize: 18, color: paper.cream, marginTop: space.m },
  close: { position: 'absolute', right: 16, zIndex: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // 피그마 "Guide": 반투명 갈색 띠 위 크림색 손글씨
  guide: {
    position: 'absolute',
    alignSelf: 'center',
    height: 30,
    paddingHorizontal: 24,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(65,56,54,0.8)',
  },
  guideText: { fontFamily: font.hand, fontSize: 16, color: paper.cream, textAlign: 'center' },
  // 촬영 버튼(80)이 가운데, 앨범(48)이 왼쪽 36에서 같은 높이 중심
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
  },
  album: { width: 48, height: 48 },
  albumIcon: { width: 48, height: 48 },
  shutter: { width: 80, height: 80 },
  pressed: { opacity: 0.6 },
  askTitle: { fontFamily: font.serifBold, fontSize: 19, color: color.label, textAlign: 'center', marginBottom: space.l },
  askButton: { flex: 0, alignSelf: 'center', paddingHorizontal: space.l },
  askAlt: { marginTop: space.m, padding: space.s },
  ghostLabel: { fontFamily: font.serif, fontSize: 16, color: color.label },
  primary: { flex: 1, height: 54, borderRadius: 27, backgroundColor: color.glow, alignItems: 'center', justifyContent: 'center' },
  primaryLabel: { fontFamily: font.serifBold, fontSize: 17, color: color.labelInk },
});
