import { Alert } from 'react-native';

import { useCellar } from '@/store';

import { authHeaders } from './supabase';

const URL = process.env.EXPO_PUBLIC_CLASSIFY_URL?.replace(/classify-bottle$/, 'credits');

/**
 * 변환권: 그림 한 장 = 1장. 잔액의 정본은 서버(credits 테이블)이고 앱은 사본만 들고 있다.
 * - 로그인(Apple·Google)하면 계정마다 한 번 10장 (credits 함수가 지급)
 * - 충전은 소모성 인앱 상품. RevenueCat 웹훅이 서버 잔액을 올린다.
 *
 * 결제는 아직 자리만 있다. RevenueCat(react-native-purchases)을 붙이면 buyPack 안만 바뀐다.
 */

export type Pack = {
  /** App Store Connect 제품 ID (소모성) */
  id: string;
  credits: number;
  /** 화면용 가격. 결제를 붙이면 스토어가 주는 현지 가격으로 바뀐다 */
  price: string;
  won: number;
  popular?: boolean;
};

export const WELCOME_CREDITS = 10;

export const PACKS: Pack[] = [
  { id: 'kr.dragonite.suljang.credits.10', credits: 10, price: '2,200원', won: 2200 },
  { id: 'kr.dragonite.suljang.credits.20', credits: 20, price: '3,900원', won: 3900, popular: true },
  { id: 'kr.dragonite.suljang.credits.50', credits: 50, price: '8,900원', won: 8900 },
  { id: 'kr.dragonite.suljang.credits.100', credits: 100, price: '15,900원', won: 15900 },
];

/** "1회당 195원 · 약 11% 할인" */
export function packNote(p: Pack): string {
  const each = Math.round(p.won / p.credits);
  const base = PACKS[0].won / PACKS[0].credits;
  const off = Math.round((1 - each / base) * 100);
  return off > 0 ? `1회당 ${each}원 · 약 ${off}% 할인` : `1회당 ${each}원`;
}

/** 그림을 그리려는데 변환권이 없다 (서버 402) */
export class NoCreditsError extends Error {
  constructor() {
    super('변환권이 없어요');
  }
}

/**
 * 서버에서 잔액을 받아 온다. 로그인한 계정이면 이때 첫 10장이 들어온다.
 * 실패하면 null (화면은 가지고 있던 사본을 쓴다).
 */
export async function refreshCredits(): Promise<number | null> {
  if (!URL) return null;
  try {
    const res = await fetch(URL, { method: 'POST', headers: await authHeaders() });
    if (!res.ok) return null;
    const body = (await res.json()) as { balance?: number };
    if (typeof body.balance !== 'number') return null;
    useCellar.getState().setCredits(body.balance);
    return body.balance;
  } catch {
    return null;
  }
}

/** 변환권 묶음을 산다. 성공하면 true */
export async function buyPack(pack: Pack): Promise<boolean> {
  Alert.alert('곧 열려요', `결제 연결을 준비하고 있어요. (${pack.id})`);
  return false;
}
