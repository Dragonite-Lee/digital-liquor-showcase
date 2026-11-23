// 테마 미리보기 4장을 실제 그림 함수로 만든다 (가상 브랜드 병 사진 → 수채화·모네·고흐·현대회화).
//
//   node scripts/make-theme-previews.mjs
//
// .env의 EXPO_PUBLIC_CLASSIFY_URL / EXPO_PUBLIC_CLASSIFY_KEY를 쓴다. 장당 약 $0.04 (Cloudflare 크레딧).
// 결과는 assets/themes/<테마>.jpg 를 덮어쓴다. 줄이기·변환에 macOS 기본 도구 sips를 쓴다.
import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = (env.EXPO_PUBLIC_ILLUSTRATE_URL || env.EXPO_PUBLIC_CLASSIFY_URL || '').replace('classify-bottle', 'illustrate-bottle');
const key = env.EXPO_PUBLIC_CLASSIFY_KEY;
if (!url || !key) throw new Error('.env에 EXPO_PUBLIC_CLASSIFY_URL / EXPO_PUBLIC_CLASSIFY_KEY가 필요해요');

const image = readFileSync('scripts/preview-bottle.jpg').toString('base64');
const themes = process.argv.slice(2).length ? process.argv.slice(2) : ['watercolor', 'monet', 'vangogh', 'modern'];

for (const theme of themes) {
  process.stdout.write(`${theme} … `);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ image, mediaType: 'image/jpeg', theme }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`실패 ${res.status} ${text.slice(0, 200)}`);
    continue;
  }
  const { image: out, model } = JSON.parse(text);
  const tmp = join(tmpdir(), `preview-${theme}.png`);
  writeFileSync(tmp, Buffer.from(out, 'base64'));
  execFileSync('sips', ['-Z', '780', '-s', 'format', 'jpeg', '-s', 'formatOptions', '84', tmp, '--out', `assets/themes/${theme}.jpg`], {
    stdio: 'ignore',
  });
  unlinkSync(tmp);
  console.log(`완료 (${model})`);
}
