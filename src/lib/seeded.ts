/** id에서 뽑은 고정 난수(0~1). 같은 병은 다시 열어도 같은 값이 나온다. */
export function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
