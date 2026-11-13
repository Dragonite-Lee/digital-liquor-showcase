import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { isAvailable, liftSubject } from 'subject-lift';

import { newId, useCellar } from '@/store';

import type { CategoryId } from './categories';
import { classifyBottle, classifyEnabled } from './classify';
import { keepImage } from './images';

export type Cut = { uri: string; stickerUri?: string; width: number; height: number; lifted: boolean };
export type Stage = 'camera' | 'lifting' | 'review';
/** off: 분류 꺼짐 · reading: 라벨 읽는 중 · found: 이름을 읽음 · missed: 못 읽음 */
export type GuessState = 'off' | 'reading' | 'found' | 'missed';

const EMPTY = { name: '', category: 'etc' as CategoryId, memo: '' };

/**
 * 촬영 한 번의 흐름: 사진 → 병 떼어 내기 + 라벨 읽기(동시에) → 이름·종류·메모 확인 → 저장.
 */
export function useCapture() {
  const add = useCellar((s) => s.add);

  const [stage, setStage] = useState<Stage>('camera');
  const [photo, setPhoto] = useState<string | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [guess, setGuess] = useState<GuessState>('off');
  const [saveError, setSaveError] = useState(false);

  // 사용자가 직접 고친 값은 AI 추정이 뒤늦게 와도 덮어쓰지 않는다
  const touched = useRef({ name: false, category: false });
  // 다시 찍으면 이전 사진의 추정 결과가 늦게 도착해도 버린다
  const run = useRef(0);

  const reset = () => {
    run.current += 1;
    touched.current = { name: false, category: false };
    setStage('camera');
    setPhoto(null);
    setCut(null);
    setDraft(EMPTY);
    setGuess('off');
    setSaveError(false);
  };

  const process = async (uri: string, width: number, height: number) => {
    const mine = ++run.current;
    touched.current = { name: false, category: false };
    setPhoto(uri);
    setDraft(EMPTY);
    setStage('lifting');
    setGuess(classifyEnabled ? 'reading' : 'off');

    const guessing = classifyBottle(uri, width, height);

    let next: Cut = { uri, width, height, lifted: false };
    if (isAvailable()) {
      try {
        next = { ...(await liftSubject(uri)), lifted: true };
      } catch {
        // 병을 못 찾으면 사진 그대로 담는다
      }
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
    } else if (classifyEnabled) {
      setGuess('missed');
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

  /** 술장에 담는다. 성공하면 true. */
  const save = (): boolean => {
    if (!cut) return false;
    try {
      const id = newId();
      add({
        id,
        name: draft.name.trim(),
        category: draft.category,
        memo: draft.memo.trim(),
        image: keepImage(cut.uri, id),
        sticker: cut.stickerUri ? keepImage(cut.stickerUri, `${id}-sticker`) : undefined,
        width: cut.width,
        height: cut.height,
        createdAt: Date.now(),
      });
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  };

  return { stage, photo, cut, draft, guess, saveError, process, reset, save, setName, setCategory, setMemo };
}

export type Capture = ReturnType<typeof useCapture>;
