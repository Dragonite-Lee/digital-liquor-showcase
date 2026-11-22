import { Image } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';

import { imageUri } from '@/lib/images';
import type { Bottle } from '@/store';

/** 병 사진. 투명 배경 PNG라 항상 바닥에 붙여 contain으로 그린다. */
type Props = { bottle: Pick<Bottle, 'image' | 'sticker' | 'art' | 'artSticker' | 'name'>; style?: StyleProp<ImageStyle>; sticker?: boolean };

/** 수채화가 있으면 수채화, 없으면 사진 누끼. 홈에서는 테두리 스티커를 먼저 쓴다. */
function pick(b: Props['bottle'], sticker?: boolean) {
  if (b.art) return (sticker && b.artSticker) || b.art;
  return (sticker && b.sticker) || b.image;
}

export function BottleImage({ bottle, style, sticker }: Props) {
  return (
    <Image
      source={{ uri: imageUri(pick(bottle, sticker)) }}
      style={style}
      contentFit="contain"
      contentPosition="bottom"
      transition={150}
      accessibilityLabel={bottle.name || '이름 없는 병'}
    />
  );
}
