# 테스트 체크리스트

## 1·2단계: 재시도, 모델 분리, 익명 로그인, 테이블

### 서버에 올리기 (순서 지키기)

1. 대시보드 Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜기
2. `git pull` → `npm install`
3. `npx supabase db push --remote` (테이블·저장소 생성)
4. `npx supabase functions deploy classify-bottle illustrate-bottle`
5. `npx expo start` 다시 켜기 (네이티브 변경 없음, 다시 빌드할 필요 없음)

1번 전에 4번을 하면 앱이 로그인하지 못해 분류·그림이 실패하고 직접 입력으로 넘어갑니다.

### 확인할 것

| 확인 | 방법 | 정상 |
|---|---|---|
| 익명 로그인 | 앱 실행 → 대시보드 Authentication → Users | 익명 사용자 1명. Table Editor `profiles`에도 같은 id 한 줄 |
| 로그인 유지 | 앱을 완전히 껐다 켜기 | 사용자 수가 늘지 않음 |
| 분류 | 병 1장 촬영 | 이름이 채워짐. 라벨이 안 보이는 병도 브랜드는 나오는지 |
| 그림 | 같은 촬영 | 수채화가 예전처럼 나옴 |
| 함수 보호 | 아래 curl | `{"error":"login required"}` |
| 로그 | 대시보드 Edge Functions → illustrate-bottle → Logs | `art <user id> watercolor cloudflare` 줄 |

```bash
curl -X POST https://ieafmosojnvcveqawnmz.supabase.co/functions/v1/classify-bottle \
  -H "apikey: sb_publishable_4xKs90tdu-7yzxr5kbmf4w__RvdC5T3" -d '{}'
```

촬영은 1~2장이면 충분합니다(장당 약 65원). 오류가 나면 촬영 화면 아래 디버그 줄을 캡처합니다.

### 비용 없이 돌리는 자동 테스트

```bash
deno test -A supabase/functions/_tests   # 재시도·응답 파싱·모델 선택·토큰 확인 (가짜 fetch)
npx tsc --noEmit
```

## 디자인 에셋 교체 후

`app.json`의 스플래시 색이 바뀌어서 **네이티브 다시 빌드**가 필요합니다: `npx expo run:ios --device`

| 확인 | 정상 |
|---|---|
| 앱 실행 | 종이 배경 스플래시 → 문구가 한 줄씩 써짐 → 홈으로 넘어감. 화면을 누르면 바로 넘어감 |
| 스플래시 병 | 라벨 글자가 알아볼 수 없게 뭉개져 있음 |
| 홈 (빈 상태) | "호가술병" 제목, 안내 문구, 왼쪽 아래 진열장 아이콘, 가운데 카메라 버튼 |
| 홈 (병 있음) | 병이 종이 배경 위에 떠다님 |
| 진열장 | 수채화 진열장이 옆으로 이어짐, 병이 유리 선반 위에 서 있고 메모지가 병 아래에 겹치지 않게 붙음 |
| 진열장 확대·이동 | 확대해도 진열장 그림이 흐려 보이지 않음 |
