import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { isAvailable, liftSubject } from 'subject-lift';

import { newId, useCellar } from '@/store';

import type { CategoryId } from './categories';
import { classifyBottle, classifyEnabled, lastClassifyError } from './classify';
import { type Art, illustrateBottle, illustrateEnabled } from './illustrate';
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
 * 촬영 한 번의 흐름: 사진 → 병 떼어 내기 + 라벨 읽기 + 수채화 그리기(동시에) → 확인 → 저장.
 * 확인 화면에서 테마를 바꾸면 그 테마로 다시 그린다. 그린 그림은 테마별로 기억해 되돌아가도 다시 안 그린다.
 */
export function useCapture() {
  const add = useCellar((s) => s.add);

  const [stage, setStage] = useState<Stage>('camera');
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [guess, setGuess] = useState<GuessState>('off');
  const [guessError, setGuessError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>('watercolor');
  const [arts, setArts] = useState<Partial<Record<ThemeId, Art>>>({});
  const [painting, setPainting] = useState<ThemeId | null>(null);
  const [paintError, setPaintError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  // 확인 화면과 담은 뒤가 같은 모습이 되도록 id를 미리 정한다
  const [id, setId] = useState(newId);

  // 사용자가 직접 고친 값은 AI 추정이 뒤늦게 와도 덮어쓰지 않는다
  const touched = useRef({ name: false, category: false });
  // 다시 찍으면 이전 사진의 결과가 늦게 도착해도 버린다
  const run = useRef(0);

  const art = arts[theme] ?? null;
  const paint: PaintState = !illustrateEnabled
    ? 'off'
    : painting === theme
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
    setTheme('watercolor');
    setArts({});
    setPainting(null);
    setPaintError(null);
    setSaveError(false);
  };

  const paintAs = (next: ThemeId, source = photo, mine = run.current) => {
    setTheme(next);
    setPaintError(null);
    if (!illustrateEnabled || !source || arts[next]) return;
    setPainting(next);
    illustrateBottle(source.uri, source.width, source.height, next)
      .then((a) => {
        if (mine !== run.current) return;
        setArts((prev) => ({ ...prev, [next]: a }));
      })
      .catch((e) => {
        if (mine !== run.current) return;
        setPaintError(e instanceof Error ? e.message : String(e));
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
    setId(newId());
    setStage('lifting');
    setGuess(classifyEnabled ? 'reading' : 'off');
    setGuessError(null);

    const guessing = classifyBottle(uri, width, height);
    // 앱에 포함된 수채화는 바로 그리기 시작한다
    paintAs('watercolor', source, mine);

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

  /** 술장에 담는다. 성공하면 true. 고른 테마의 그림이 없으면 사진 누끼로 담는다. */
  const save = async (): Promise<boolean> => {
    if (!cut || saving) return false;
    setSaving(true);
    try {
      add({
        id,
        name: draft.name.trim(),
        category: draft.category,
        memo: draft.memo.trim(),
        image: keepImage(cut.uri, id),
        sticker: cut.stickerUri ? keepImage(cut.stickerUri, `${id}-sticker`) : undefined,
        art: art ? keepImage(art.uri, `${id}-art`) : undefined,
        artSticker: art?.stickerUri ? keepImage(art.stickerUri, `${id}-art-sticker`) : undefined,
        theme: art ? theme : undefined,
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
    paint,
    paintError,
    saveError,
    saving,
    process,
    reset,
    save,
    paintAs,
    setName,
    setCategory,
    setMemo,
  };
}

export type Capture = ReturnType<typeof useCapture>;
