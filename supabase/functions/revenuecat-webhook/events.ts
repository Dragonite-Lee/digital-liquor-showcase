// RevenueCat 웹훅 이벤트 → 변환권 증감. (DB 접근은 grant로 넘겨 테스트에서 바꾼다)

/** 소모성 인앱 상품 → 변환권 장수. App Store Connect 제품 ID와 같아야 한다 */
export const PACKS: Record<string, number> = {
  'kr.dragonite.suljang.credits.10': 10,
  'kr.dragonite.suljang.credits.20': 20,
  'kr.dragonite.suljang.credits.50': 50,
  'kr.dragonite.suljang.credits.100': 100,
};

export type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  transaction_id?: string;
  id?: string;
  cancel_reason?: string;
};

export type Grant = (userId: string, delta: number, reason: 'purchase' | 'refund', ref: string) => Promise<number>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 앱은 Purchases.logIn(Supabase 사용자 id)를 하므로 그 id를 찾는다 */
export function supabaseUser(e: RcEvent): string | null {
  for (const id of [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])]) {
    if (id && UUID.test(id)) return id.toLowerCase();
  }
  return null;
}

export type Outcome = { action: 'granted' | 'revoked' | 'ignored'; reason?: string; balance?: number };

export async function handleEvent(e: RcEvent, grant: Grant): Promise<Outcome> {
  const credits = e.product_id ? PACKS[e.product_id] : undefined;
  if (!credits) return { action: 'ignored', reason: `product ${e.product_id ?? '-'}` };
  const user = supabaseUser(e);
  if (!user) return { action: 'ignored', reason: 'no supabase user id' };
  const tx = e.transaction_id ?? e.id;
  if (!tx) return { action: 'ignored', reason: 'no transaction id' };

  if (e.type === 'NON_RENEWING_PURCHASE') {
    return { action: 'granted', balance: await grant(user, credits, 'purchase', `purchase:${tx}`) };
  }
  // 소모성 상품 환불은 CANCELLATION(cancel_reason CUSTOMER_SUPPORT)으로 온다. 잔액이 마이너스가 될 수 있다.
  if (e.type === 'CANCELLATION') {
    return { action: 'revoked', balance: await grant(user, -credits, 'refund', `refund:${tx}`) };
  }
  return { action: 'ignored', reason: `type ${e.type}` };
}
