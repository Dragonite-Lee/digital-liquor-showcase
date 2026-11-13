import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { type Cell, COLS, FLOOR, FRAME, HEADROOM, ROOM_H, ROWS, UNIT_W } from './layout';
import { Shelf } from './Shelf';

export const Unit = memo(function Unit({ cells }: { cells: Cell[] }) {
  const shelves = Array.from({ length: ROWS }, (_, i) => cells.slice(i * COLS, (i + 1) * COLS));
  return (
    <View style={styles.unitWrap}>
      {/* 장 위 벽에 번지는 간접 조명 */}
      <View style={styles.wash} pointerEvents="none" />
      <LinearGradient
        colors={['#5A3A22', '#2C1A0D', '#4A2E1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.unit}
      >
        <View style={styles.inner}>
          {shelves.map((row, i) => (
            <Shelf key={i} cells={row} />
          ))}
        </View>
      </LinearGradient>
      {/* 바닥에 떨어지는 장의 빛 */}
      <View style={styles.pool} pointerEvents="none" />
    </View>
  );
});

const styles = StyleSheet.create({
  unitWrap: { width: UNIT_W, height: ROOM_H },
  wash: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: UNIT_W + 80,
    height: 240,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(244,228,184,0.20) 0%, rgba(244,228,184,0) 66%)',
  },
  unit: {
    marginTop: HEADROOM,
    padding: FRAME,
    borderRadius: 3,
    boxShadow: '0 10px 24px rgba(0,0,0,0.6)',
  },
  inner: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.6)', overflow: 'hidden', backgroundColor: '#2E1B0E' },
  pool: {
    position: 'absolute',
    bottom: 10,
    left: -20,
    width: UNIT_W + 40,
    height: FLOOR - 10,
    backgroundImage: 'radial-gradient(ellipse at top, rgba(244,228,184,0.28) 0%, rgba(244,228,184,0) 70%)',
  },
});
