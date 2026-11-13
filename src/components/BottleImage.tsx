import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { imageUri } from '@/lib/images';
import type { Bottle } from '@/store';

/** 병 사진. 투명 배경 PNG라 항상 바닥에 붙여 contain으로 그린다. */
export function BottleImage({ bottle, style }: { bottle: Pick<Bottle, 'image' | 'name'>; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={{ uri: imageUri(bottle.image) }}
      style={style}
      contentFit="contain"
      contentPosition="bottom"
      transition={150}
      accessibilityLabel={bottle.name || '이름 없는 병'}
    />
  );
}
