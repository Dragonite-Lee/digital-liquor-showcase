import { Asset } from 'expo-asset';

import type { CategoryId } from './categories';
import type { Bottle } from '@/store';

// 개발 빌드에서 화면을 바로 확인하기 위한 더미 병. 실제 병 사진이 아니다.
const SAMPLES: { name: string; category: CategoryId; memo: string; image: number; sticker: number }[] = [
  { name: 'Macallan 12 Double Cask', category: 'whisky', memo: '아버지 환갑 때 같이 딴 병', image: require('../../assets/demo/b1.png'), sticker: require('../../assets/demo/b1-sticker.png') },
  { name: 'Cloudy Bay Sauvignon Blanc', category: 'wine', memo: '제주 여행 마지막 밤', image: require('../../assets/demo/b2.png'), sticker: require('../../assets/demo/b2-sticker.png') },
  { name: 'Château Margaux 2015', category: 'wine', memo: '', image: require('../../assets/demo/b3.png'), sticker: require('../../assets/demo/b3-sticker.png') },
  { name: 'Don Julio 1942', category: 'tequila', memo: '승진 축하주!', image: require('../../assets/demo/b4.png'), sticker: require('../../assets/demo/b4-sticker.png') },
  { name: 'Glenfiddich 18', category: 'whisky', memo: '면세점에서 고민하다 삼', image: require('../../assets/demo/b5.png'), sticker: require('../../assets/demo/b5-sticker.png') },
  { name: 'Dassai 23', category: 'sake', memo: '오사카 이자카야', image: require('../../assets/demo/b6.png'), sticker: require('../../assets/demo/b6-sticker.png') },
  { name: 'Bombay Sapphire', category: 'gin', memo: '', image: require('../../assets/demo/b7.png'), sticker: require('../../assets/demo/b7-sticker.png') },
];

/** 더미 병 count개. 진열장이 옆으로 이어지는 것까지 보려면 16개 이상. */
export function sampleBottles(count = 18): Bottle[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const s = SAMPLES[i % SAMPLES.length];
    return {
      id: `sample-${now.toString(36)}-${i}`,
      name: s.name,
      category: s.category,
      memo: s.memo,
      image: Asset.fromModule(s.image).uri,
      sticker: Asset.fromModule(s.sticker).uri,
      width: 360,
      height: 900,
      createdAt: now - i * 86400000,
    };
  });
}
