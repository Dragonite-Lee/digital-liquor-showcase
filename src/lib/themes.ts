export type ThemeId = 'watercolor' | 'monet' | 'vangogh' | 'crayon';

export type Theme = {
  id: ThemeId;
  label: string;
  /** 고를 때 보여 주는 한 줄 */
  blurb: string;
  /** require()로 불러온 미리보기 이미지 */
  preview: number;
};

// 테마는 모두 열려 있다. 그림 한 장마다 변환권 1장 (lib/credits.ts).

export const THEMES: Theme[] = [
  {
    id: 'watercolor',
    label: '수채화',
    blurb: '맑은 물감이 번진 손그림',
    preview: require('../../assets/themes/watercolor.jpg'),
  },
  {
    id: 'monet',
    label: '인상주의',
    blurb: '빛이 부서지는 인상파 유화',
    preview: require('../../assets/themes/monet.jpg'),
  },
  {
    id: 'vangogh',
    label: '유화',
    blurb: '소용돌이치는 두꺼운 붓질',
    preview: require('../../assets/themes/vangogh.jpg'),
  },
  {
    id: 'crayon',
    label: '크레용',
    blurb: '크레용으로 꾹꾹 눌러 그린 그림',
    preview: require('../../assets/themes/crayon.jpg'),
  },
];


export const themeOf = (id: ThemeId | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** "수채화로", "크레용으로": 받침이 있으면(ㄹ 받침 제외) "으로", 없으면 "로" */
export function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const jong = code % 28;
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`;
}
