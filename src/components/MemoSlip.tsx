import { StyleSheet, Text, View } from 'react-native';

import { color, font } from '@/theme';

/** 선반 아래에 테이프로 붙인 메모지. */
export function MemoSlip({ name, memo, tilt }: { name: string; memo: string; tilt: number }) {
  // 진열장 전체가 한눈에 들어오는 크기에 맞춘 작은 메모지. 확대하면 읽힌다.
  return (
    <View style={[styles.slip, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={styles.tape} />
      <Text style={styles.name} numberOfLines={1}>
        {name || '이름 없는 병'}
      </Text>
      {memo ? (
        <Text style={styles.memo} numberOfLines={1}>
          {memo}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slip: {
    backgroundColor: color.label,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 5,
    borderRadius: 1.5,
    minHeight: 30,
    boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
  },
  tape: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 24,
    height: 9,
    backgroundColor: 'rgba(201,162,87,0.55)',
    transform: [{ rotate: '-3deg' }],
  },
  name: { fontFamily: font.serifBold, fontSize: 9, lineHeight: 12, color: color.labelInk },
  memo: { fontFamily: font.pen, fontSize: 13, lineHeight: 13.5, color: '#4A3F2A', marginTop: 1 },
});
