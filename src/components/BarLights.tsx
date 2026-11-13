import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { color } from '@/theme';

// 유리 너머로 번지는 바 조명. 장식은 이것 하나로 끝낸다.
const LIGHTS = [
  { left: '-8%', top: '8%', size: 300, tint: 'rgba(201,162,87,0.20)' },
  { left: '48%', top: '26%', size: 360, tint: 'rgba(244,228,184,0.11)' },
  { left: '-30%', top: '50%', size: 420, tint: 'rgba(138,36,51,0.34)' },
  { left: '44%', top: '70%', size: 320, tint: 'rgba(201,162,87,0.16)' },
] as const;

export function BarLights() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[color.glassHi, color.glass, color.ink]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {LIGHTS.map((l, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: l.left,
            top: l.top,
            width: l.size,
            height: l.size,
            // 블러 필터는 iOS에서 지원되지 않아 방사형 그라디언트로 번짐을 만든다
            backgroundImage: `radial-gradient(circle, ${l.tint} 0%, rgba(0,0,0,0) 68%)`,
          }}
        />
      ))}
    </View>
  );
}
