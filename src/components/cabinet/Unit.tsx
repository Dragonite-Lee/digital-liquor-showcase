import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BAYS, type Cell, COLS, IMG_H, IMG_W, INNER_LEFT, INNER_W } from './layout';
import { Shelf } from './Shelf';

const SHELF = require('../../../assets/ui/shelf.png');

/** 수채화 진열장 그림 한 장 위에 칸마다 병과 메모지를 얹는다. */
export const Unit = memo(function Unit({ cells }: { cells: Cell[] }) {
  return (
    <View style={styles.unit}>
      <Image source={SHELF} style={styles.art} contentFit="fill" />
      {BAYS.map((bay, i) => (
        <Shelf
          key={i}
          cells={cells.slice(i * COLS, (i + 1) * COLS)}
          bay={bay}
          left={INNER_LEFT}
          width={INNER_W}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  unit: { width: IMG_W, height: IMG_H },
  art: { position: 'absolute', top: 0, left: 0, width: IMG_W, height: IMG_H },
});
