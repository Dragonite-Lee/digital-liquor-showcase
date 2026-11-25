import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CategoryId } from './lib/categories';
import type { ThemeId } from './lib/themes';
import { dropImage } from './lib/images';

/** 테마 그림 파일 (투명 배경 그림과 홈용 테두리 스티커) */
export type ArtFiles = { art: string; artSticker?: string };

export type Bottle = {
  id: string;
  name: string;
  category: CategoryId;
  memo: string;
  /** 깨끗한 누끼 (진열장·상세) */
  image: string;
  /** 테두리를 두른 스티커 (홈). 누끼를 못 딴 병에는 없다. */
  sticker?: string;
  /** 지금 보여 주는 테마 그림 (투명 배경). 있으면 사진 누끼 대신 이걸 보여 준다 */
  art?: string;
  /** 테마 그림의 테두리 스티커 (홈) */
  artSticker?: string;
  /** 지금 보여 주는 그림의 테마. 없으면 누끼 */
  theme?: ThemeId;
  /** 이 병에 그린 테마 그림 전부. 테마를 바꿔 끼워도 다시 그리지 않는다 */
  arts?: Partial<Record<ThemeId, ArtFiles>>;
  /** 다른 테마로 다시 그릴 때 쓰는 원본 사진 (긴 변 1024px) */
  photo?: string;
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
  /** 이미 그린 테마 그림으로 바꿔 보여 준다. null이면 누끼 */
  showTheme: (id: string, theme: ThemeId | null) => void;
  /** 새로 그린 그림을 넣고 보여 준다. 같은 테마의 예전 그림 파일은 지운다 */
  putArt: (id: string, theme: ThemeId, files: ArtFiles) => void;
  remove: (id: string) => void;

  /** 남은 변환권 (서버가 정본, 여기는 화면용 사본). null = 아직 모름 */
  credits: number | null;
  setCredits: (n: number) => void;
  /** 처음 실행 때 로그인 화면을 한 번 보여 줬는지 */
  onboarded: boolean;
  markOnboarded: () => void;
};

export const useCellar = create<State>()(
  persist(
    (set, get) => ({
      bottles: [],
      filter: 'all',
      credits: null,
      setCredits: (credits) => set({ credits }),
      onboarded: false,
      markOnboarded: () => set({ onboarded: true }),
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
      showTheme: (id, theme) =>
        set({
          bottles: get().bottles.map((b) => {
            if (b.id !== id) return b;
            const files = theme ? b.arts?.[theme] : undefined;
            return files
              ? { ...b, art: files.art, artSticker: files.artSticker, theme: theme ?? undefined }
              : { ...b, art: undefined, artSticker: undefined, theme: undefined };
          }),
        }),
      putArt: (id, theme, files) =>
        set({
          bottles: get().bottles.map((b) => {
            if (b.id !== id) return b;
            const old = b.arts?.[theme];
            if (old) {
              if (old.art !== files.art) dropImage(old.art);
              if (old.artSticker && old.artSticker !== files.artSticker) dropImage(old.artSticker);
            }
            return { ...b, arts: { ...b.arts, [theme]: files }, art: files.art, artSticker: files.artSticker, theme };
          }),
        }),
      remove: (id) => {
        const target = get().bottles.find((b) => b.id === id);
        if (target) {
          dropImage(target.image);
          if (target.sticker) dropImage(target.sticker);
          for (const f of artFilesOf(target)) dropImage(f);
          if (target.photo) dropImage(target.photo);
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
      partialize: (state) => ({
        bottles: state.bottles,
        credits: state.credits,
        onboarded: state.onboarded,
      }),
      merge: (saved, current) => {
        const kept = (saved ?? {}) as Partial<State>;
        // '현대회화' 테마가 '크레용'으로 이름이 바뀌었다
        const renamed = (id: string) => (id === 'modern' ? 'crayon' : id) as ThemeId;
        return {
          ...current,
          ...kept,
          // 자리 번호가 없던 예전 데이터에도 자리를 준다
          // 테마별 보관(arts)이 없던 예전 데이터는 보여 주던 그림 하나를 넣어 둔다
          bottles: withSlots(
            (kept.bottles ?? []).map((b) => {
              const theme = b.theme ? renamed(b.theme) : undefined;
              const arts = b.arts ?? (theme && b.art ? { [theme]: { art: b.art, artSticker: b.artSticker } } : undefined);
              return { ...b, theme, arts };
            }),
          ),
        };
      },
    },
  ),
);

/** 병의 테마 그림 파일 전부 (겹치지 않게) */
function artFilesOf(b: Bottle): string[] {
  const files = new Set<string>();
  for (const f of [b.art, b.artSticker]) if (f) files.add(f);
  for (const a of Object.values(b.arts ?? {})) {
    if (a?.art) files.add(a.art);
    if (a?.artSticker) files.add(a.artSticker);
  }
  return [...files];
}

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
