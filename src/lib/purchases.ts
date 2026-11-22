import { Alert } from 'react-native';

import { useCellar } from '@/store';

import { ALL_THEMES_PRODUCT, THEMES, type ThemeId } from './themes';

/**
 * 테마 인앱 결제.
 *
 * 지금은 화면 흐름을 확인하기 위한 자리만 있다. 개발 빌드에서는 누르면 바로 열리고,
 * 배포 빌드에서는 "준비 중"을 띄운다. StoreKit 연결(App Store Connect에 비소모성 상품 4개 등록 후
 * expo-iap 또는 RevenueCat)은 다음 단계에서 이 파일 안만 바꾸면 된다.
 */

/** 화면에 보여 줄 가격. StoreKit을 붙이면 스토어가 주는 현지 가격으로 바뀐다. */
export const PRICE = { theme: '2,200원', all: '4,400원' } as const;

export const isUnlocked = (id: ThemeId, owned: ThemeId[]) =>
  THEMES.find((t) => t.id === id)?.included || owned.includes(id);

/** 테마 하나 또는 묶음을 산다. 성공하면 true. */
export async function buyThemes(target: ThemeId | 'all'): Promise<boolean> {
  const ids = target === 'all' ? THEMES.filter((t) => !t.included).map((t) => t.id) : [target];
  const productId = target === 'all' ? ALL_THEMES_PRODUCT : THEMES.find((t) => t.id === target)?.productId;

  if (__DEV__) {
    useCellar.getState().unlockThemes(ids);
    return true;
  }
  Alert.alert('곧 열려요', `결제 연결을 준비하고 있어요. (${productId})`);
  return false;
}

/** 다른 기기나 재설치 뒤 산 테마를 되살린다. */
export async function restoreThemes(): Promise<void> {
  if (__DEV__) return;
  Alert.alert('곧 열려요', '구매 복원을 준비하고 있어요.');
}
