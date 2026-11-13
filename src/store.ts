import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CategoryId } from './lib/categories';
import { dropImage } from './lib/images';

export type Bottle = {
  id: string;
  name: string;
  category: CategoryId;
  memo: string;
  /** 깨끗한 누끼 (진열장·상세) */
  image: string;
  /** 테두리를 두른 스티커 (홈). 누끼를 못 딴 병에는 없다. */
  sticker?: string;
  width: number;
  height: number;
  createdAt: number;
  /** 진열장에서의 자리 번호 (장·단·칸 순서로 0부터) */
  slot?: number;
};

type State = {
  bottles: Bottle[];
  filter: CategoryId | 'all';
  /** 방금 담은 병 — 홈에서 등장 연출을 한 번 보여 주고 지운다 */
  justAdded: string | null;
  clearJustAdded: () => void;
  addMany: (bottles: Bottle[]) => void;
  removeSamples: () => void;
  /** 병을 진열장의 다른 자리로 옮긴다. 그 자리에 병이 있으면 서로 바꾼다. */
  moveTo: (id: string, slot: number) => void;
  setFilter: (filter: CategoryId | 'all') => void;
  add: (bottle: Bottle) => void;
  update: (id: string, patch: Partial<Pick<Bottle, 'name' | 'category' | 'memo'>>) => void;
  remove: (id: string) => void;
};

export const useCellar = create<State>()(
  persist(
    (set, get) => ({
      bottles: [],
      filter: 'all',
      justAdded: null,
      clearJustAdded: () => set({ justAdded: null }),
      addMany: (bottles) => set({ bottles: withSlots([...get().bottles, ...bottles]) }),
      removeSamples: () => set({ bottles: get().bottles.filter((b) => !b.id.startsWith('sample-')), filter: 'all' }),
      setFilter: (filter) => set({ filter }),
      add: (bottle) =>
        set({ bottles: withSlots([bottle, ...get().bottles]), justAdded: bottle.id, filter: 'all' }),
      moveTo: (id, slot) => {
        const bottles = withSlots(get().bottles);
        const moving = bottles.find((b) => b.id === id);
        if (!moving || moving.slot === slot) return;
        const from = moving.slot;
        set({
          bottles: bottles.map((b) => (b.id === id ? { ...b, slot } : b.slot === slot ? { ...b, slot: from } : b)),
        });
      },
      update: (id, patch) =>
        set({ bottles: get().bottles.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
      remove: (id) => {
        const target = get().bottles.find((b) => b.id === id);
        if (target) {
          dropImage(target.image);
          if (target.sticker) dropImage(target.sticker);
        }
        const bottles = get().bottles.filter((b) => b.id !== id);
        const filter = get().filter;
        const stillUsed = filter === 'all' || bottles.some((b) => b.category === filter);
        set({ bottles, filter: stillUsed ? filter : 'all' });
      },
    }),
    {
      name: 'cellar-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bottles: state.bottles }),
      // 자리 번호가 없던 예전 데이터에도 자리를 준다
      merge: (saved, current) => ({
        ...current,
        bottles: withSlots((saved as { bottles?: Bottle[] } | undefined)?.bottles ?? []),
      }),
    },
  ),
);

/** 자리 번호가 없는 병에 앞에서부터 빈 자리를 준다. 이미 자리가 있는 병은 건드리지 않는다. */
export function withSlots(bottles: Bottle[]): Bottle[] {
  if (bottles.every((b) => b.slot !== undefined)) return bottles;
  const taken = new Set(bottles.map((b) => b.slot).filter((n): n is number => n !== undefined));
  let next = 0;
  // 오래된 병부터 앞자리에 놓는다
  const pending = bottles.filter((b) => b.slot === undefined).sort((a, b) => a.createdAt - b.createdAt);
  const given = new Map<string, number>();
  for (const b of pending) {
    while (taken.has(next)) next++;
    taken.add(next);
    given.set(b.id, next);
  }
  return bottles.map((b) => (b.slot === undefined ? { ...b, slot: given.get(b.id) } : b));
}

/** 지금 모은 병에 있는 종류만, 많이 모은 순으로. */
export function usedCategories(bottles: Bottle[]): { id: CategoryId; count: number }[] {
  const counts = new Map<CategoryId, number>();
  for (const b of bottles) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
