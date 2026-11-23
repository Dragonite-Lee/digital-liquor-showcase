/** 그림 모델 하나를 감싼 어댑터. 모델을 바꿀 때는 이 모양만 맞추면 된다. */
export type ArtInput = {
  /** base64 (data: 접두사 없음) */
  image: string;
  mediaType: string;
  prompt: string;
};

export type ArtOutput = {
  /** PNG/JPEG base64 (data: 접두사 없음) */
  image: string;
  model: string;
};

export interface ArtProvider {
  id: string;
  generate(input: ArtInput): Promise<ArtOutput>;
}

/**
 * flagged: 모델 안전 필터에 막힘 (다시 시도해도 같다) · config: 키·설정 문제 · upstream: 그 밖의 실패
 */
export class ProviderError extends Error {
  constructor(
    public code: 'flagged' | 'config' | 'upstream',
    public status: number,
    public detail: string,
  ) {
    super(`${code} ${status}: ${detail}`);
  }
}
