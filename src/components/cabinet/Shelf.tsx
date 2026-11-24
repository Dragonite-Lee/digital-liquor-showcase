import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottleImage } from '@/components/BottleImage';
import { MemoSlip } from '@/components/MemoSlip';
import { seeded } from '@/lib/seeded';
import type { Bottle } from '@/store';

import { BOTTLE, type Cell, SLOT } from './layout';
import { useMove } from './MoveContext';

type Bay = { top: number; floor: number; lipTop: number; lipH: number };

function Standing({ bottle }: { bottle: Bottle }) {
  const { movingId, canMove, pick } = useMove();
  const held = movingId === bottle.id;
  return (
    <>
      {/* 유리 선반에 닿는 그림자 */}
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

/** 진열장 한 단: 유리 선반 위 병 3개 + 그 아래 원목 띠에 붙인 메모지 */
export const Shelf = memo(function Shelf({ cells, bay, left, width }: { cells: Cell[]; bay: Bay; left: number; width: number }) {
  return (
    <>
      <View style={[styles.row, { left, width, top: bay.top, height: bay.floor - bay.top }]}>
        {cells.map((cell) => (
          <Slot key={cell.slot} cell={cell} />
        ))}
      </View>
      <View style={[styles.lip, { left, width, top: bay.lipTop, height: bay.lipH }]} pointerEvents="none">
        {cells.map(({ slot, bottle }) => (
          <View key={slot} style={styles.memoSlot}>
            {bottle ? <MemoSlip name={bottle.name} memo={bottle.memo} tilt={(seeded(bottle.id, 5) - 0.5) * 4} /> : null}
          </View>
        ))}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  row: { position: 'absolute', flexDirection: 'row' },
  slot: { width: SLOT, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bottleHit: { width: SLOT * 0.62, height: BOTTLE },
  bottle: { width: '100%', height: '100%' },
  // 집어 든 병은 선반에서 살짝 떠오른다
  bottleHeld: { transform: [{ translateY: -10 }, { scale: 1.06 }] },
  contact: {
    position: 'absolute',
    bottom: -4,
    width: SLOT * 0.42,
    height: 9,
    backgroundImage: 'radial-gradient(ellipse at center, rgba(70,40,15,0.45) 0%, rgba(70,40,15,0) 70%)',
  },
  contactHeld: { opacity: 0.4, transform: [{ scaleX: 0.7 }] },
  drop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end' },
  dropMark: {
    width: SLOT * 0.4,
    height: BOTTLE * 0.82,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(92,58,20,0.7)',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  lip: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  memoSlot: { width: SLOT, paddingHorizontal: SLOT * 0.12 },
});
