export type ThemeId = 'watercolor' | 'monet' | 'vangogh' | 'crayon';

export type Theme = {
  id: ThemeId;
  label: string;
  /** 고를 때 보여 주는 한 줄 */
  blurb: string;
  /** require()로 불러온 미리보기 이미지 */
  preview: number;
  /** 앱을 산 사람에게 기본으로 열려 있는 테마 */
  included: boolean;
  /** App Store Connect에 만들 비소모성 인앱 상품 id */
  productId: string;
};

export const THEMES: Theme[] = [
  {
    id: 'watercolor',
    label: '수채화',
    blurb: '맑은 물감이 번진 손그림',
    preview: require('../../assets/themes/watercolor.jpg'),
    included: true,
    productId: '',
  },
  {
    id: 'monet',
    label: '모네',
    blurb: '빛이 부서지는 인상파 유화',
    preview: require('../../assets/themes/monet.jpg'),
    included: false,
    productId: 'kr.dragonite.suljang.theme.monet',
  },
  {
    id: 'vangogh',
    label: '고흐',
    blurb: '소용돌이치는 두꺼운 붓질',
    preview: require('../../assets/themes/vangogh.jpg'),
    included: false,
    productId: 'kr.dragonite.suljang.theme.vangogh',
  },
  {
    id: 'crayon',
    label: '크레용',
    blurb: '크레용으로 꾹꾹 눌러 그린 그림',
    preview: require('../../assets/themes/crayon.jpg'),
    included: false,
    productId: 'kr.dragonite.suljang.theme.crayon',
  },
];

/** 세 테마를 한 번에 여는 묶음 상품 */
export const ALL_THEMES_PRODUCT = 'kr.dragonite.suljang.theme.all';

export const themeOf = (id: ThemeId | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** 유료 테마를 처음 권하는 시점: 이만큼 담아 진열장에 애착이 생긴 뒤 */
export const NUDGE_AFTER_BOTTLES = 3;
