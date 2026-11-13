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
};

type State = {
  bottles: Bottle[];
  filter: CategoryId | 'all';
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
      setFilter: (filter) => set({ filter }),
      add: (bottle) => set({ bottles: [bottle, ...get().bottles] }),
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
    },
  ),
);

/** 지금 모은 병에 있는 종류만, 많이 모은 순으로. */
export function usedCategories(bottles: Bottle[]): { id: CategoryId; count: number }[] {
  const counts = new Map<CategoryId, number>();
  for (const b of bottles) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
