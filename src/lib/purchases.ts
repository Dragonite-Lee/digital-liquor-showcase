import { Alert } from 'react-native';

import { useCellar } from '@/store';

import { THEMES, type ThemeId } from './themes';

/**
 * 테마 인앱 결제.
 *
 * 지금은 화면 흐름을 확인하기 위한 자리만 있다. 개발 빌드에서는 누르면 바로 열리고,
 * 배포 빌드에서는 "준비 중"을 띄운다. 3단계에서 RevenueCat(react-native-purchases)으로
 * 이 파일 안만 바꾼다. 상품: 테마마다 비소모성 1개 (묶음 상품은 만들지 않는다).
 */

/** 화면에 보여 줄 가격. 결제를 붙이면 스토어가 주는 현지 가격으로 바뀐다. (앱 본체 5,500원은 스토어 판매가) */
export const PRICE = { app: '5,500원', theme: '1,100원' } as const;

export const isUnlocked = (id: ThemeId, owned: ThemeId[]) =>
  THEMES.find((t) => t.id === id)?.included || owned.includes(id);

/** 테마 하나를 산다. 성공하면 true. */
export async function buyTheme(id: ThemeId): Promise<boolean> {
  const productId = THEMES.find((t) => t.id === id)?.productId;

  if (__DEV__) {
    useCellar.getState().unlockThemes([id]);
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
