import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const DIR = 'bottles';

/**
 * 떼어낸 병 PNG를 앱 문서 폴더로 옮기고, 저장용 파일명을 돌려준다.
 * iOS는 앱을 업데이트하면 문서 폴더 절대경로가 바뀌므로 파일명만 저장한다.
 */
export function keepImage(tempUri: string, id: string): string {
  if (Platform.OS === 'web') return tempUri;
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = tempUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const target = new File(dir, `${id}.${ext}`);
  new File(tempUri).copy(target);
  return target.name;
}

export function imageUri(stored: string): string {
  if (stored.includes('://') || stored.startsWith('/') || stored.startsWith('data:')) return stored;
  return new File(Paths.document, DIR, stored).uri;
}

export function dropImage(stored: string) {
  if (Platform.OS === 'web' || stored.includes('://')) return;
  try {
    const file = new File(Paths.document, DIR, stored);
    if (file.exists) file.delete();
  } catch {
    // 파일이 이미 없으면 그대로 둔다
  }
}
