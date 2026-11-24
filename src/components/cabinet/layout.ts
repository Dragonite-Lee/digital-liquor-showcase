import type { Bottle } from '@/store';

import shelf from './shelf.json';

// 장 한 채 = 수채화 진열장 그림 한 장(assets/ui/shelf.png). 3칸 × 5단, 병이 늘면 같은 장이 옆으로 이어진다.
// 칸 좌표는 scripts/make-shelf.py가 그림과 함께 만든 shelf.json에서 온다.
export const COLS = 3;
export const ROWS = shelf.bays.length;
export const PER_UNIT = COLS * ROWS;

/** 그림 px → 방 좌표. 방 전체는 화면 높이에 맞춰 다시 확대·축소된다. */
export const SCALE = 0.62;
const s = (v: number) => v * SCALE;

export const IMG_W = s(shelf.width);
export const IMG_H = s(shelf.height);
const FRAME_L = s(shelf.frame[0]);
const FRAME_W = s(shelf.frame[1] - shelf.frame[0]);
const INNER_L = s(shelf.inner[0]);
export const INNER_W = s(shelf.inner[1] - shelf.inner[0]);
export const SLOT = INNER_W / COLS;

/** 칸마다 병이 서는 선과 메모지 띠 (그림 안 좌표) */
export const BAYS = shelf.bays.map((b) => ({
  top: s(b.top),
  floor: s(b.floor),
  lipTop: s(b.lip[0]),
  lipH: s(b.lip[1] - b.lip[0]),
}));
export const INNER_LEFT = INNER_L;
/** 병 높이: 칸 높이의 78% */
export const BOTTLE = Math.min(...BAYS.map((b) => b.floor - b.top)) * 0.78;

export const GAP = 36; // 이웃한 장 기둥 사이
export const ENTRY = 60; // 첫 장 앞 벽
export const TAIL = 60;
export const ROOM_H = IMG_H + 24;
/** 처음 화면에 들어오게 할 너비: 첫 장 전체 + 다음 장이 조금 */
export const FIT_WIDTH = ENTRY + FRAME_W + GAP + 70;

// 그림 양옆의 투명한 빛 번짐은 이웃 장과 겹쳐도 된다. 자리는 기둥 기준으로 잡는다.
export const unitLeft = (index: number) => ENTRY - FRAME_L + index * (FRAME_W + GAP);
export const roomWidth = (unitCount: number) => ENTRY + unitCount * FRAME_W + (unitCount - 1) * GAP + TAIL;

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
