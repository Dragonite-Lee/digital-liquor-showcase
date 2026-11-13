import { StyleSheet, TextInput, View } from 'react-native';

import { color, font, space } from '@/theme';

/** 손글씨로 적는 메모지. 담을 때와 병 상세에서 같이 쓴다. */
export function NotePaper({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={styles.paper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="누구와, 어디서, 어떤 맛이었는지"
        placeholderTextColor="#9A8C6C"
        style={styles.text}
        accessibilityLabel="메모"
        multiline
        maxLength={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: color.label,
    borderRadius: 2,
    padding: space.m,
    marginTop: space.m,
    minHeight: 110,
    transform: [{ rotate: '-0.6deg' }],
  },
  text: {
    fontFamily: font.pen,
    fontSize: 24,
    lineHeight: 28,
    color: color.labelInk,
    padding: 0,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
