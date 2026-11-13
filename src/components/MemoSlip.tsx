import { StyleSheet, Text, View } from 'react-native';

import { color, font } from '@/theme';

/** 선반 아래에 테이프로 붙인 메모지. */
export function MemoSlip({ name, memo, tilt }: { name: string; memo: string; tilt: number }) {
  return (
    <View style={[styles.slip, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={styles.tape} />
      <Text style={styles.name} numberOfLines={2}>
        {name || '이름 없는 병'}
      </Text>
      {memo ? (
        <Text style={styles.memo} numberOfLines={3}>
          {memo}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slip: {
    backgroundColor: color.label,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    borderRadius: 2,
    minHeight: 54,
    boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
  },
  tape: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    width: 34,
    height: 13,
    backgroundColor: 'rgba(201,162,87,0.55)',
    transform: [{ rotate: '-3deg' }],
  },
  name: { fontFamily: font.serifBold, fontSize: 11.5, lineHeight: 15, color: color.labelInk },
  memo: { fontFamily: font.pen, fontSize: 17, lineHeight: 18, color: '#4A3F2A', marginTop: 3 },
});
