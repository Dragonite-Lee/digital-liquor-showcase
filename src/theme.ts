// 밤의 백바: 병 유리의 짙은 녹색, 선반 뒤 조명의 크림빛, 황동 프레임.
export const color = {
  ink: '#07110E',
  glass: '#0F231D',
  glassHi: '#1B3A30',
  glassLine: '#2A4E42',
  brass: '#C9A257',
  brassDeep: '#8C6B2F',
  glow: '#F4E4B8',
  glowDeep: '#E3C98A',
  label: '#F7F0DF',
  labelInk: '#2B2417',
  mist: '#8FA69C',
  wine: '#8A2433',
} as const;

// 수채화 종이: 스플래시·홈·진열장
export const paper = {
  bg: '#FBEEE0',
  ink: '#3A2F2A',
  inkSoft: '#6E5D52',
  line: 'rgba(58,47,42,0.22)',
  wash: 'rgba(251,238,224,0.86)',
} as const;

export const font = {
  serif: 'GowunBatang_400Regular',
  serifBold: 'GowunBatang_700Bold',
  pen: 'NanumPenScript_400Regular',
  /** 손글씨 흘림체 — 스플래시 문구, 홈·진열장 제목과 안내 (한글 2,780자 범위라 사용자가 쓴 글에는 쓰지 않는다) */
  hand: 'SongleSongeul',
} as const;

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 40 } as const;
