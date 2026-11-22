import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { isAvailable, liftSubject } from 'subject-lift';

import type { ThemeId } from './themes';

const CLASSIFY_URL = process.env.EXPO_PUBLIC_CLASSIFY_URL;
const KEY = process.env.EXPO_PUBLIC_CLASSIFY_KEY;
// 분류 함수와 같은 Supabase 프로젝트에 있는 그림 함수
const URL = process.env.EXPO_PUBLIC_ILLUSTRATE_URL ?? CLASSIFY_URL?.replace('classify-bottle', 'illustrate-bottle');

/** 그림 모델이 받는 입력 이미지의 최대 크기(px) */
const INPUT_SIDE = 512;

export const illustrateEnabled = !!URL && Platform.OS !== 'web';

export type Art = { uri: string; stickerUri?: string; width: number; height: number };

/**
 * 병 사진을 테마(수채화·모네·고흐·현대회화) 그림으로 다시 그린다.
 * 받은 그림(흰 배경)에서 다시 병만 떼어 내 투명 배경으로 만든다. 떼어 내기를 못 하면 흰 배경 그림 그대로.
 * @param png 투명 배경 누끼(PNG)를 보낼 때 true. 원본 사진은 JPEG로 보낸다.
 */
export async function illustrateBottle(
  uri: string,
  width: number,
  height: number,
  theme: ThemeId = 'watercolor',
  png = false,
): Promise<Art> {
  if (!URL) throw new Error('그림 함수 주소가 없어요 (.env)');

  const size = width >= height ? { width: INPUT_SIDE } : { height: INPUT_SIDE };
  const rendered = await ImageManipulator.manipulate(uri).resize(size).renderAsync();
  const input = await rendered.saveAsync({ format: png ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!input.base64) throw new Error('사진을 줄이지 못했어요');

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(KEY ? { apikey: KEY } : {}) },
    body: JSON.stringify({ image: input.base64, mediaType: png ? 'image/png' : 'image/jpeg', theme }),
  });
  if (res.status === 422) throw new Error('그림 모델의 안전 필터가 이 병을 막았어요 (라벨의 인물·상표 그림 때문일 수 있어요)');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (typeof data?.image !== 'string') throw new Error('그림을 받지 못했어요');

  const raw = new File(Paths.cache, `paint-${Date.now().toString(36)}.png`);
  raw.create({ overwrite: true });
  await raw.write(data.image.replace(/^data:image\/\w+;base64,/, ''), { encoding: 'base64' });

  if (isAvailable()) {
    try {
      return await liftSubject(raw.uri);
    } catch {
      // 흰 배경 그대로 쓴다
    }
  }
  return { uri: raw.uri, width: 640, height: 1024 };
}
