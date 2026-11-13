import { requireOptionalNativeModule } from 'expo';

/** uri: 깨끗한 누끼, stickerUri: 얇은 테두리를 두른 스티커 버전 */
export type LiftResult = { uri: string; stickerUri?: string; width: number; height: number };

type SubjectLiftNative = {
  isAvailable(): boolean;
  liftSubject(uri: string): Promise<LiftResult>;
};

const native = requireOptionalNativeModule<SubjectLiftNative>('SubjectLift');

/** 기기에서 피사체 분리를 쓸 수 있는지 (iOS 17+ 실기기, Android). 웹·시뮬레이터·Expo Go는 false. */
export function isAvailable(): boolean {
  try {
    return !!native && native.isAvailable();
  } catch {
    return false;
  }
}

/** 사진에서 가운데 피사체만 떼어 투명 배경 PNG로 돌려준다. */
export function liftSubject(uri: string): Promise<LiftResult> {
  if (!native) return Promise.reject(new Error('SubjectLift native module is not linked'));
  return native.liftSubject(uri);
}
