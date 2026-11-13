import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { color } from '@/theme';

// 어두운 바 안쪽에서 번지는 조명 두 점. 블러 필터는 iOS에서 지원되지 않아 방사형 그라디언트로 만든다.
const LIGHTS = [
  { left: '-25%', top: '-6%', size: 520, tint: 'rgba(201,162,87,0.20)' },
  { left: '30%', top: '52%', size: 560, tint: 'rgba(138,36,51,0.22)' },
] as const;

export function BarLights() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#12261F', color.ink, '#040A08']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {LIGHTS.map((l, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: l.left,
            top: l.top,
            width: l.size,
            height: l.size,
            backgroundImage: `radial-gradient(circle, ${l.tint} 0%, rgba(0,0,0,0) 66%)`,
          }}
        />
      ))}
    </View>
  );
}
