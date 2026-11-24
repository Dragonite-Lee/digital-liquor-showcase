// 그림 비용을 아끼는 규칙: 같은 사진·같은 테마는 서버에 남긴 그림을 돌려주고(캐시),
// 새로 그릴 때만 하루 한도(기본 10장)를 쓴다. 실패하면 한도를 돌려준다.
import type { Admin } from '../_shared/admin.ts';
import { base64ToBytes, bytesToBase64 } from '../_shared/http.ts';
import type { ArtOutput } from './providers/types.ts';

export const DAILY_LIMIT = Number(Deno.env.get('ART_DAILY_LIMIT') ?? 10);

export type Job = {
  userId: string;
  bottleId: string;
  theme: string;
  hash: string;
  image: string;
  provider: string;
  model: string;
};

/** DB·저장소 접근을 한곳에 모은다. 테스트에서는 가짜로 바꾼다. */
export interface Ledger {
  /** 이 사용자가 같은 사진·테마로 그린 그림 (base64), 없으면 null */
  cached(userId: string, hash: string, theme: string): Promise<string | null>;
  /** 오늘 사용량을 1 올리고 올린 값을 돌려준다. 한도에 닿았으면 -1 */
  claim(userId: string, limit: number): Promise<number>;
  refund(userId: string): Promise<void>;
  /** 그림을 저장소에 남기고 작업 기록을 쓴다 */
  record(job: Job): Promise<void>;
}

export type Request = {
  userId: string;
  image: string;
  mediaType: string;
  theme: string;
  bottleId: string;
  /** 마음에 안 들어 다시 그리기: 캐시를 건너뛴다 (한도는 쓴다) */
  redraw: boolean;
};

export type Result =
  | { kind: 'cached'; image: string }
  | { kind: 'drawn'; image: string; model: string; used: number }
  | { kind: 'limit'; limit: number };

export async function inputHash(mediaType: string, image: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${mediaType}:${image}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function illustrate(
  ledger: Ledger,
  provider: { id: string; draw: () => Promise<ArtOutput> },
  req: Request,
  limit = DAILY_LIMIT,
): Promise<Result> {
  const hash = await inputHash(req.mediaType, req.image);

  if (!req.redraw) {
    const hit = await ledger.cached(req.userId, hash, req.theme).catch((e) => {
      console.error('cache lookup', e);
      return null;
    });
    if (hit) return { kind: 'cached', image: hit };
  }

  const used = await ledger.claim(req.userId, limit);
  if (used < 0) return { kind: 'limit', limit };

  let out: ArtOutput;
  try {
    out = await provider.draw();
  } catch (e) {
    await ledger.refund(req.userId).catch((err) => console.error('refund', err));
    throw e;
  }

  // 기록 실패는 그림을 돌려주는 데 지장이 없게 한다
  await ledger
    .record({ ...req, hash, image: out.image, provider: provider.id, model: out.model })
    .catch((e) => console.error('record', e));
  return { kind: 'drawn', image: out.image, model: out.model, used };
}

const mimeOf = (bytes: Uint8Array) => (bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg' : 'image/png');

export function dbLedger(admin: Admin): Ledger {
  return {
    async cached(userId, hash, theme) {
      const { data, error } = await admin
        .from('art_jobs')
        .select('output_path')
        .eq('user_id', userId)
        .eq('input_hash', hash)
        .eq('theme', theme)
        .eq('status', 'done')
        .not('output_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.output_path) return null;
      const file = await admin.storage.from('art').download(data.output_path);
      if (file.error) throw file.error;
      return bytesToBase64(new Uint8Array(await file.data.arrayBuffer()));
    },
    async claim(userId, limit) {
      const { data, error } = await admin.rpc('claim_art', { p_user: userId, p_limit: limit });
      if (error) throw error;
      return typeof data === 'number' ? data : -1;
    },
    async refund(userId) {
      const { error } = await admin.rpc('refund_art', { p_user: userId });
      if (error) throw error;
    },
    async record(job) {
      const bytes = base64ToBytes(job.image);
      const type = mimeOf(bytes);
      const path = `${job.userId}/${job.hash.slice(0, 16)}-${job.theme}-${Date.now().toString(36)}.${type === 'image/jpeg' ? 'jpg' : 'png'}`;
      const up = await admin.storage.from('art').upload(path, bytes, { contentType: type, upsert: false });
      if (up.error) throw up.error;
      const { error } = await admin.from('art_jobs').insert({
        user_id: job.userId,
        bottle_id: job.bottleId,
        theme: job.theme,
        status: 'done',
        attempts: 1,
        input_path: 'inline',
        input_hash: job.hash,
        output_path: path,
        provider: job.provider,
        model: job.model,
      });
      if (error) throw error;
    },
  };
}
