import type { Bottle } from '@/store';

// 장 한 채: 3칸 × 5단. 병이 늘면 같은 장이 옆으로 이어진다.
export const COLS = 3;
export const ROWS = 5;
export const PER_UNIT = COLS * ROWS;

export const SLOT = 96;
export const BAY = 138; // 조명 칸 높이
export const BOTTLE = 106;
export const GLASS = 22; // 유리 선반 윗면이 보이는 깊이
export const STAND = 11; // 병이 선반 앞 가장자리에서 떨어진 거리
export const EDGE = 4;
export const LIP = 46;
export const FRAME = 9;

export const UNIT_W = SLOT * COLS + 20 + FRAME * 2 + 2;
export const UNIT_H = (BAY + EDGE + LIP) * ROWS + FRAME * 2 + 2;
export const GAP = 40;
export const ENTRY = 170;
export const TAIL = 90;
export const HEADROOM = 76; // 장 위 벽
export const FLOOR = 120;
export const ROOM_H = HEADROOM + UNIT_H + FLOOR;

export const roomWidth = (unitCount: number) => ENTRY + unitCount * UNIT_W + (unitCount - 1) * GAP + TAIL;
export const unitLeft = (index: number) => ENTRY + index * (UNIT_W + GAP);

export type Cell = { slot: number; bottle?: Bottle };

/** 병을 자리 번호대로 칸에 놓는다. 필터가 걸려 있으면 그 종류만 앞에서부터 채워 보여 준다. */
export function arrange(bottles: Bottle[], filtered: boolean): Cell[][] {
  const bySlot = new Map<number, Bottle>();
  if (filtered) {
    [...bottles].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).forEach((b, i) => bySlot.set(i, b));
  } else {
    bottles.forEach((b, i) => bySlot.set(b.slot ?? i, b));
  }
  const last = bySlot.size ? Math.max(...bySlot.keys()) : -1;
  let unitCount = Math.max(2, Math.floor(last / PER_UNIT) + 1);
  // 늘 빈자리가 하나는 남도록, 꽉 차면 장을 하나 더 세운다
  if (bySlot.size >= unitCount * PER_UNIT) unitCount += 1;
  return Array.from({ length: unitCount }, (_, u) =>
    Array.from({ length: PER_UNIT }, (_, i) => {
      const slot = u * PER_UNIT + i;
      return { slot, bottle: bySlot.get(slot) };
    }),
  );
}
