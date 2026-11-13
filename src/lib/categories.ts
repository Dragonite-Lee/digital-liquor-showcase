export const CATEGORIES = [
  { id: 'whisky', label: '위스키' },
  { id: 'wine', label: '와인' },
  { id: 'champagne', label: '샴페인' },
  { id: 'tequila', label: '데킬라' },
  { id: 'beer', label: '맥주' },
  { id: 'sake', label: '사케' },
  { id: 'soju', label: '소주' },
  { id: 'makgeolli', label: '막걸리' },
  { id: 'gin', label: '진' },
  { id: 'rum', label: '럼' },
  { id: 'vodka', label: '보드카' },
  { id: 'brandy', label: '브랜디' },
  { id: 'liqueur', label: '리큐르' },
  { id: 'etc', label: '기타' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const labels = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>;

export const categoryLabel = (id: CategoryId) => labels[id] ?? '기타';

export const isCategory = (value: unknown): value is CategoryId =>
  typeof value === 'string' && value in labels;
