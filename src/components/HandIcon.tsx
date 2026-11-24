import { Image } from 'expo-image';

const ICONS = {
  back: require('../../assets/ui/icon-back.png'),
  close: require('../../assets/ui/icon-close.png'),
  share: require('../../assets/ui/icon-share.png'),
} as const;

/** 손그림 아이콘. 어두운 화면에서는 tint로 밝게 칠한다. */
export function HandIcon({ name, size = 28, tint, dim }: { name: keyof typeof ICONS; size?: number; tint?: string; dim?: boolean }) {
  return (
    <Image
      source={ICONS[name]}
      style={{ width: size, height: size, opacity: dim ? 0.35 : 1 }}
      contentFit="contain"
      tintColor={tint}
      accessible={false}
    />
  );
}
