import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottleImage } from '@/components/BottleImage';
import { MemoSlip } from '@/components/MemoSlip';
import { seeded } from '@/lib/seeded';
import type { Bottle } from '@/store';

import { BAY, BOTTLE, type Cell, EDGE, GLASS, LIP, SLOT, STAND } from './layout';
import { useMove } from './MoveContext';

function Standing({ bottle }: { bottle: Bottle }) {
  const { movingId, canMove, pick } = useMove();
  const held = movingId === bottle.id;
  return (
    <>
      <View style={styles.mirrorClip} pointerEvents="none">
        <BottleImage bottle={bottle} style={styles.mirror} />
      </View>
      <View style={[styles.contact, held && styles.contactHeld]} pointerEvents="none" />
      <Pressable
        onPress={() => router.push({ pathname: '/bottle/[id]', params: { id: bottle.id } })}
        onLongPress={canMove ? () => pick(bottle.id) : undefined}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`${bottle.name || '이름 없는 병'} 자세히 보기`}
        accessibilityHint={canMove ? '길게 누르면 자리를 옮길 수 있어요' : undefined}
        style={({ pressed }) => [styles.bottleHit, held && styles.bottleHeld, pressed && { opacity: 0.75 }]}
      >
        <BottleImage bottle={bottle} style={styles.bottle} />
      </Pressable>
    </>
  );
}

function Slot({ cell }: { cell: Cell }) {
  const { movingId, place } = useMove();
  const moving = movingId !== null;
  const held = moving && cell.bottle?.id === movingId;
  return (
    <View style={styles.slot}>
      {cell.bottle ? <Standing bottle={cell.bottle} /> : null}
      {moving && !held && (
        <Pressable
          onPress={() => place(cell.slot)}
          accessibilityRole="button"
          accessibilityLabel={cell.bottle ? `${cell.bottle.name || '이름 없는 병'}와 자리 바꾸기` : '이 빈자리에 놓기'}
          style={styles.drop}
        >
          {!cell.bottle && <View style={styles.dropMark} />}
        </Pressable>
      )}
    </View>
  );
}

export const Shelf = memo(function Shelf({ cells }: { cells: Cell[] }) {
  return (
    <View>
      <View style={styles.bay}>
        {/* 뒤판: 위 조명에서 아래로 갈수록 어두워진다 */}
        <LinearGradient colors={['#FBF1D3', '#EDD9A6', '#B98F55']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.hotspot} />
        {/* 안쪽 옆벽 그늘 — 칸에 깊이를 준다 */}
        <LinearGradient
          colors={['rgba(58,32,10,0.55)', 'rgba(58,32,10,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.wall, { left: 0 }]}
        />
        <LinearGradient
          colors={['rgba(58,32,10,0)', 'rgba(58,32,10,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.wall, { right: 0 }]}
        />
        <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.34)']} style={styles.glassTop} />
        <View style={styles.row}>
          {cells.map((cell) => (
            <Slot key={cell.slot} cell={cell} />
          ))}
        </View>
        <LinearGradient colors={['rgba(255,252,238,0.95)', 'rgba(255,252,238,0)']} style={styles.ledGlow} pointerEvents="none" />
        <View style={styles.led} />
      </View>

      <LinearGradient colors={['#F4FFF9', '#9CC4B2', '#5E8776']} locations={[0, 0.35, 1]} style={styles.glassEdge} />

      {/* 선반 아래 원목 띠 — 메모지를 붙이는 자리 */}
      <LinearGradient colors={['#1F120A', '#4B2E1B', '#38210F']} locations={[0, 0.25, 1]} style={styles.lip}>
        {cells.map(({ slot, bottle }) => (
          <View key={slot} style={styles.memoSlot}>
            {bottle ? (
              <MemoSlip name={bottle.name} memo={bottle.memo} tilt={(seeded(bottle.id, 5) - 0.5) * 4} />
            ) : null}
          </View>
        ))}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  bay: { height: BAY, overflow: 'hidden' },
  hotspot: {
    position: 'absolute',
    top: -100,
    left: '10%',
    width: '80%',
    height: 200,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(255,253,240,0.85) 0%, rgba(255,253,240,0) 68%)',
  },
  wall: { position: 'absolute', top: 0, bottom: 0, width: 24 },
  glassTop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GLASS },
  row: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: 10 },
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'flex-end' },
  bottleHit: { width: '84%', height: BOTTLE, marginBottom: STAND },
  bottle: { width: '100%', height: '100%' },
  // 집어 든 병은 선반에서 살짝 떠오른다
  bottleHeld: { transform: [{ translateY: -12 }, { scale: 1.06 }] },
  contactHeld: { opacity: 0.4, transform: [{ scaleX: 0.7 }] },
  drop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  dropMark: {
    width: '58%',
    height: BOTTLE * 0.82,
    marginBottom: STAND,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(92,58,20,0.7)',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  mirrorClip: { position: 'absolute', bottom: 0, width: '84%', height: STAND, overflow: 'hidden' },
  mirror: { width: '100%', height: BOTTLE, opacity: 0.28, transform: [{ scaleY: -1 }] },
  contact: {
    position: 'absolute',
    bottom: STAND - 5,
    width: '62%',
    height: 10,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(40,20,4,0.6) 0%, rgba(40,20,4,0) 70%)',
  },
  ledGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 34 },
  led: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#FFFFFF' },
  glassEdge: { height: EDGE },
  lip: { flexDirection: 'row', height: LIP, paddingHorizontal: 10, paddingTop: 7, overflow: 'hidden' },
  memoSlot: { width: SLOT, paddingHorizontal: 4 },
});
