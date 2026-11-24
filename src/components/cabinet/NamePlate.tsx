import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/theme';

const BADGE = require('../../../assets/ui/badge.png');
const RATIO = 270 / 60;

/** 선반 원목 띠에 붙은 놋쇠 명패. 병 이름을 새긴다 (메모는 병 상세에서 본다). */
export const NamePlate = memo(function NamePlate({ name, width }: { name: string; width: number }) {
  const height = width / RATIO;
  return (
    <View style={[styles.plate, { width, height }]}>
      <Image source={BADGE} style={StyleSheet.absoluteFill} contentFit="fill" />
      <Text
        style={[styles.name, { fontSize: Math.max(8, height * 0.36), paddingHorizontal: width * 0.1 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {name || '이름 없는 병'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  plate: { alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 3px rgba(60,30,10,0.3)', borderRadius: 4 },
  // 놋쇠에 새긴 글씨: 어두운 갈색 + 아래쪽 밝은 하이라이트
  name: {
    fontFamily: font.serifBold,
    color: '#4A2E14',
    textAlign: 'center',
    textShadowColor: 'rgba(255,236,200,0.7)',
    textShadowOffset: { width: 0, height: 0.6 },
    textShadowRadius: 0,
  },
});
