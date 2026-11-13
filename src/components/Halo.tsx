import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

/** 병 뒤에 번지는 크림색 조명. 블러 필터는 iOS에서 지원되지 않아 방사형 그라디언트로 만든다. */
export function Halo({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.halo, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    width: 340,
    height: 340,
    backgroundImage: 'radial-gradient(circle, rgba(244,228,184,0.22) 0%, rgba(244,228,184,0) 68%)',
  },
});
