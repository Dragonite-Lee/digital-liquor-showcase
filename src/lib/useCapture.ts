import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { isAvailable, liftSubject } from 'subject-lift';

import { type ArtFiles, newId, useCellar } from '@/store';

import type { CategoryId } from './categories';
import { classifyBottle, classifyEnabled, lastClassifyError } from './classify';
import { NoCreditsError } from './credits';
import { type Art, DailyLimitError, illustrateBottle, illustrateEnabled } from './illustrate';
import { keepImage } from './images';
import type { ThemeId } from './themes';

export type Cut = {
  uri: string;
  stickerUri?: string;
  width: number;
  height: number;
  lifted: boolean;
  /** 누끼를 못 딴 이유 (개발 빌드 화면에만 보여 준다) */
  liftError?: string;
};
export type Stage = 'camera' | 'lifting' | 'review';
/** off: 분류 꺼짐 · reading: 라벨 읽는 중 · found: 이름을 읽음 · missed: 못 읽음 */
export type GuessState = 'off' | 'reading' | 'found' | 'missed';
/** off: 그림 기능 꺼짐 · painting: 그리는 중 · done: 완성 · failed: 실패(사진으로 담는다) */
export type PaintState = 'off' | 'painting' | 'done' | 'failed';

const EMPTY = { name: '', category: 'etc' as CategoryId, memo: '' };
/** 다른 테마로 다시 그릴 때 쓰려고 남겨 두는 원본 사진 크기 */
const KEEP_PHOTO_SIDE = 1024;

/**
 * 촬영 한 번의 흐름: 사진 → 병 떼어 내기(폰 안, 무료) + 라벨 읽기 → 확인 → 저장.
 * 테마는 고르기만 해서는 그리지 않는다. "그리기"를 눌러야 그린다 (그림 한 장마다 비용이 든다).
 * 그린 그림은 테마별로 기억해 되돌아가도 다시 안 그리고, 담을 때 전부 병에 남긴다.
 */
export function useCapture() {
  const add = useCellar((s) => s.add);

  const [stage, setStage] = useState<Stage>('camera');
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [guess, setGuess] = useState<GuessState>('off');
  const [guessError, setGuessError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [arts, setArts] = useState<Partial<Record<ThemeId, Art>>>({});
  const [painting, setPainting] = useState<ThemeId | null>(null);
  const [paintError, setPaintError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  /** 변환권이 없어 못 그렸다 → 충전 화면 */
  const [noCredits, setNoCredits] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  // 확인 화면과 담은 뒤가 같은 모습이 되도록 id를 미리 정한다
  const [id, setId] = useState(newId);

  // 사용자가 직접 고친 값은 AI 추정이 뒤늦게 와도 덮어쓰지 않는다
  const touched = useRef({ name: false, category: false });
  // 다시 찍으면 이전 사진의 결과가 늦게 도착해도 버린다
  const run = useRef(0);

  const art = theme ? (arts[theme] ?? null) : null;
  const paint: PaintState = !illustrateEnabled
    ? 'off'
    : painting && painting === theme
      ? 'painting'
      : art
        ? 'done'
        : paintError
          ? 'failed'
          : 'off';

  const reset = () => {
    run.current += 1;
    touched.current = { name: false, category: false };
    setStage('camera');
    setPhoto(null);
    setCut(null);
    setDraft(EMPTY);
    setGuess('off');
    setTheme(null);
    setArts({});
    setPainting(null);
    setPaintError(null);
    setSaveError(false);
  };

  /** 테마를 고른다 (그리지는 않는다). null이면 누끼 */
  const choose = (next: ThemeId | null) => {
    setTheme(next);
    setPaintError(null);
  };

  /** 고른 테마로 그린다. 이미 그린 테마는 redraw일 때만 다시 그린다. */
  const draw = (next: ThemeId, redraw = false) => {
    setTheme(next);
    setPaintError(null);
    const source = photo;
    const mine = run.current;
    if (!illustrateEnabled || !source || painting || (arts[next] && !redraw)) return;
    setPainting(next);
    illustrateBottle(source.uri, source.width, source.height, next, { bottleId: id, redraw })
      .then((a) => {
        if (mine !== run.current) return;
        setArts((prev) => ({ ...prev, [next]: a }));
      })
      .catch((e) => {
        if (mine !== run.current) return;
        if (e instanceof NoCreditsError) return setNoCredits(true);
        setPaintError(e instanceof Error ? e.message : String(e));
        setLimitHit(e instanceof DailyLimitError);
      })
      .finally(() => {
        if (mine === run.current) setPainting((p) => (p === next ? null : p));
      });
  };

  const process = async (uri: string, width: number, height: number) => {
    const mine = ++run.current;
    const source = { uri, width, height };
    touched.current = { name: false, category: false };
    setPhoto(source);
    setDraft(EMPTY);
    setArts({});
    setTheme(null);
    setPaintError(null);
    setId(newId());
    setStage('lifting');
    setGuess(classifyEnabled ? 'reading' : 'off');
    setGuessError(null);

    const guessing = classifyBottle(uri, width, height);

    let next: Cut = { uri, width, height, lifted: false };
    if (isAvailable()) {
      try {
        next = { ...(await liftSubject(uri)), lifted: true };
      } catch (e) {
        // 병을 못 찾으면 사진 그대로 담는다
        next.liftError = e instanceof Error ? e.message : String(e);
        console.warn('[subject-lift]', next.liftError);
      }
    } else {
      next.liftError = '피사체 분리 모듈을 쓸 수 없는 환경 (웹·시뮬레이터·Expo Go, 또는 네이티브 모듈 미연결)';
    }
    if (mine !== run.current) return;
    setCut(next);
    setStage('review');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const found = await guessing;
    if (mine !== run.current) return;
    if (found) {
      const useName = !touched.current.name && !!found.name;
      const useCategory = !touched.current.category;
      setDraft((d) => ({
        ...d,
        name: useName ? found.name : d.name,
        category: useCategory ? found.category : d.category,
      }));
      setGuess(useName ? 'found' : 'missed');
      if (!useName) setGuessError(lastClassifyError);
    } else if (classifyEnabled) {
      setGuess('missed');
      setGuessError(lastClassifyError);
    }
  };

  const setName = (name: string) => {
    touched.current.name = true;
    setDraft((d) => ({ ...d, name }));
  };
  const setCategory = (category: CategoryId) => {
    touched.current.category = true;
    setDraft((d) => ({ ...d, category }));
  };
  const setMemo = (memo: string) => setDraft((d) => ({ ...d, memo }));

  /** 원본 사진을 줄여 보관한다. 실패해도 저장은 계속한다. */
  const keepPhoto = async (): Promise<string | undefined> => {
    if (!photo || Platform.OS === 'web') return undefined;
    try {
      const size = photo.width >= photo.height ? { width: KEEP_PHOTO_SIDE } : { height: KEEP_PHOTO_SIDE };
      const small = await (await ImageManipulator.manipulate(photo.uri).resize(size).renderAsync()).saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.8,
      });
      return keepImage(small.uri, `${id}-photo`);
    } catch {
      return undefined;
    }
  };

  /** 술장에 담는다. 성공하면 true. 그린 그림은 전부 남기고, 고른 테마의 그림이 없으면 누끼로 보여 준다. */
  const save = async (): Promise<boolean> => {
    if (!cut || saving) return false;
    setSaving(true);
    try {
      const kept: Partial<Record<ThemeId, ArtFiles>> = {};
      for (const [t, a] of Object.entries(arts) as [ThemeId, Art][]) {
        kept[t] = {
          art: keepImage(a.uri, `${id}-art-${t}`),
          artSticker: a.stickerUri ? keepImage(a.stickerUri, `${id}-art-sticker-${t}`) : undefined,
        };
      }
      const shown = theme ? kept[theme] : undefined;
      add({
        id,
        name: draft.name.trim(),
        category: draft.category,
        memo: draft.memo.trim(),
        image: keepImage(cut.uri, id),
        sticker: cut.stickerUri ? keepImage(cut.stickerUri, `${id}-sticker`) : undefined,
        art: shown?.art,
        artSticker: shown?.artSticker,
        theme: shown && theme ? theme : undefined,
        arts: Object.keys(kept).length ? kept : undefined,
        photo: await keepPhoto(),
        width: cut.width,
        height: cut.height,
        createdAt: Date.now(),
      });
      return true;
    } catch {
      setSaveError(true);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    id,
    stage,
    photo: photo?.uri ?? null,
    cut,
    draft,
    guess,
    guessError,
    theme,
    art,
    /** 그린 테마들 */
    drawn: Object.keys(arts) as ThemeId[],
    painting,
    paint,
    paintError,
    limitHit,
    noCredits,
    clearNoCredits: () => setNoCredits(false),
    saveError,
    saving,
    process,
    reset,
    save,
    choose,
    draw,
    setName,
    setCategory,
    setMemo,
  };
}

export type Capture = ReturnType<typeof useCapture>;
