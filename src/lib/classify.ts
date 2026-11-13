import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { type CategoryId, isCategory } from './categories';

export type Guess = { category: CategoryId; name: string };

const URL = process.env.EXPO_PUBLIC_CLASSIFY_URL;
const KEY = process.env.EXPO_PUBLIC_CLASSIFY_KEY;

/** 분류 서버로 보내는 사진의 긴 변(px). 라벨 글자는 읽히고 전송은 가벼운 크기. */
const SEND_SIDE = 1280;

export const classifyEnabled = !!URL;

/** 원본 사진은 수 MB라 느리고 서버 크기 제한에 걸릴 수 있어, 줄여서 보낸다. */
async function toBase64(photoUri: string, width: number, height: number): Promise<string> {
  try {
    const size = width >= height ? { width: SEND_SIDE } : { height: SEND_SIDE };
    const tooBig = Math.max(width, height) > SEND_SIDE;
    const context = ImageManipulator.manipulate(photoUri);
    const rendered = await (tooBig ? context.resize(size) : context).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (saved.base64) return saved.base64;
  } catch {
    // 줄이기에 실패하면 원본을 그대로 보낸다
  }
  return new File(photoUri).base64();
}

/** 원본 사진(라벨이 보이는 쪽)을 보내 종류와 이름을 추정한다. 실패하면 null — 사용자가 직접 고른다. */
export async function classifyBottle(photoUri: string, width: number, height: number): Promise<Guess | null> {
  if (!URL || Platform.OS === 'web') return null;
  try {
    const image = await toBase64(photoUri, width, height);
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 새 Supabase 키는 JWT가 아니라 Authorization이 아닌 apikey 헤더로 보낸다
        ...(KEY ? { apikey: KEY } : {}),
      },
      body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!isCategory(data?.category)) return null;
    return { category: data.category, name: typeof data.name === 'string' ? data.name : '' };
  } catch {
    return null;
  }
}
