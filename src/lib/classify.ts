import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { type CategoryId, isCategory } from './categories';

export type Guess = { category: CategoryId; name: string };

const URL = process.env.EXPO_PUBLIC_CLASSIFY_URL;
const KEY = process.env.EXPO_PUBLIC_CLASSIFY_KEY;

export const classifyEnabled = !!URL;

/** 원본 사진(라벨이 보이는 쪽)을 보내 종류와 이름을 추정한다. 실패하면 null — 사용자가 직접 고른다. */
export async function classifyBottle(photoUri: string): Promise<Guess | null> {
  if (!URL || Platform.OS === 'web') return null;
  try {
    const image = await new File(photoUri).base64();
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
