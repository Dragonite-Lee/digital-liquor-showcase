import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { imageUri } from '@/lib/images';
import { seeded } from '@/lib/seeded';

import { CLIPPINGS } from './clippingAssets';

type Variant = (typeof CLIPPINGS)[number];

/** 병 비율에 가장 잘 맞는 신문 조각을 고른다. 같은 병은 늘 같은 조각. */
export function pickClipping(seedId: string, ratio: number): Variant {
  const windowAspect = (v: Variant) => (v.window.width / v.window.height) * v.aspect;
  const best = Math.min(...CLIPPINGS.map((v) => Math.abs(windowAspect(v) - ratio)));
  const fits = CLIPPINGS.filter((v) => Math.abs(windowAspect(v) - ratio) - best < 0.02);
  return fits[Math.floor(seeded(seedId, 21) * fits.length)] ?? CLIPPINGS[0];
}

type Props = {
  /** 저장된 병 이미지(파일명) 또는 uri */
  image: string;
  /** 병 이미지의 가로/세로 */
  ratio: number;
  /** 조각 선택과 기울기를 고정할 값 (병 id) */
  seedId: string;
  height: number;
  /** 누끼를 못 딴 사진이면 사진 칸을 꽉 채운다 */
  photo?: boolean;
  tilt?: boolean;
};

/**
 * 오래된 신문에 실린 병 사진을 오려 붙인 모습.
 * 병은 luminosity로 합성해 종이의 누런 색을 입고(잉크로 찍힌 듯), 그 위에 구김을 overlay로 얹어 병까지 구겨 보이게 한다.
 */
export const Clipping = memo(function Clipping({ image, ratio, seedId, height, photo, tilt = true }: Props) {
  const v = pickClipping(seedId, ratio);
  const width = height * v.aspect;
  const angle = tilt ? (seeded(seedId, 22) - 0.5) * 6 : 0;
  const fit = photo ? 'cover' : 'contain';
  const win = {
    left: v.window.left * width,
    top: v.window.top * height,
    width: v.window.width * width,
    height: v.window.height * height,
  };

  return (
    <View style={[styles.wrap, { width, height, transform: [{ rotate: `${angle}deg` }] }]} pointerEvents="none">
      <Image source={v.paper} style={StyleSheet.absoluteFill} contentFit="fill" />
      <View style={[styles.print, win]}>
        <Image source={{ uri: imageUri(image) }} style={StyleSheet.absoluteFill} contentFit={fit} />
      </View>
      {/* 같은 병을 한 번 더 곱해 잉크가 진하게 먹은 느낌 */}
      <View style={[styles.ink, win]}>
        <Image source={{ uri: imageUri(image) }} style={StyleSheet.absoluteFill} contentFit={fit} />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.crease]}>
        <Image source={v.crease} style={StyleSheet.absoluteFill} contentFit="fill" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // 합성이 뒤 화면과 섞이지 않고 이 조각 안에서만 일어나게
  wrap: { isolation: 'isolate' },
  print: { position: 'absolute', mixBlendMode: 'luminosity', opacity: 0.94 },
  ink: { position: 'absolute', mixBlendMode: 'multiply', opacity: 0.32 },
  crease: { mixBlendMode: 'overlay', opacity: 0.7 },
});
