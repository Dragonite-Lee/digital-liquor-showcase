// 함수들이 함께 쓰는 HTTP 도구: CORS, JSON 응답, apikey 확인, 재시도.

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** 잠시 뒤 다시 시도하면 될 수 있는 응답: 한도 초과, 서버 쪽 일시 오류 */
export const RETRYABLE = new Set([408, 429, 500, 502, 503, 504, 529]);

export type RetryOptions = {
  /** 총 시도 횟수 (첫 시도 포함). 비용이 드는 호출이라 작게 둔다. */
  attempts?: number;
  /** 첫 대기 시간(ms). 이후 3배씩 늘어난다. */
  baseMs?: number;
  /** 한 번 기다리는 최대 시간(ms). Retry-After가 더 길어도 여기서 자른다. */
  maxWaitMs?: number;
  label?: string;
  /** 테스트용 */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function waitFor(res: Response | null, attempt: number, baseMs: number, maxWaitMs: number): number {
  const header = res?.headers.get('retry-after');
  const seconds = header ? Number(header) : NaN;
  const backoff = baseMs * 3 ** attempt;
  const jitter = Math.random() * baseMs * 0.3;
  const ms = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : backoff + jitter;
  return Math.min(ms, maxWaitMs);
}

/**
 * fetch + 제한된 재시도. 429·5xx·네트워크 오류일 때만 다시 시도하고, 그 밖의 응답(4xx 등)은 그대로 돌려준다.
 * 마지막 시도까지 실패하면 마지막 응답을 돌려주거나, 네트워크 오류면 그 오류를 던진다.
 */
export async function fetchWithRetry(url: string, init: RequestInit, opts: RetryOptions = {}): Promise<Response> {
  const { attempts = 3, baseMs = 1000, maxWaitMs = 10_000, label = 'fetch', sleep = defaultSleep } = opts;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, init);
      if (!RETRYABLE.has(res.status) || attempt === attempts - 1) return res;
      // 다시 보내기 전에 본문을 비워 연결을 돌려준다
      await res.body?.cancel();
      lastError = null;
    } catch (e) {
      lastError = e;
      if (attempt === attempts - 1) throw e;
    }
    const ms = waitFor(res, attempt, baseMs, maxWaitMs);
    console.warn(`[${label}] ${res ? `HTTP ${res.status}` : String(lastError)} — ${attempt + 1}/${attempts}, ${Math.round(ms)}ms 뒤 다시 시도`);
    await sleep(ms);
  }
  throw lastError ?? new Error('unreachable');
}

/** 바이트 → base64 (큰 이미지도 스택이 넘치지 않게 조각내서) */
export function bytesToBase64(buf: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
