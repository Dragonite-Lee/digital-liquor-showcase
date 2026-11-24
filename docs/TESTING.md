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
| 그림 | 같은 촬영 → 수채화 카드 → "수채화로 그리기" | 찍은 직후엔 누끼만. 버튼을 눌러야 수채화가 나옴 |
| 함수 보호 | 아래 curl | `{"error":"login required"}` |
| 로그 | 대시보드 Edge Functions → illustrate-bottle → Logs | `art <user id> watercolor cloudflare drawn` 줄 (같은 요청 반복이면 `cached`) |

```bash
curl -X POST https://ieafmosojnvcveqawnmz.supabase.co/functions/v1/classify-bottle \
  -H "apikey: sb_publishable_4xKs90tdu-7yzxr5kbmf4w__RvdC5T3" -d '{}'
```

촬영은 1~2장이면 충분합니다. 비용은 "그리기"를 누를 때만 듭니다(장당 약 65원). 오류가 나면 촬영 화면 아래 디버그 줄을 캡처합니다.

### 비용 없이 돌리는 자동 테스트

```bash
deno test -A supabase/functions/_tests   # 재시도·응답 파싱·모델 선택·토큰 확인 (가짜 fetch)
npx tsc --noEmit
```

## 그림 정책: 누끼 먼저, 누르면 그리기, 하루 10장

### 서버에 올리기
```bash
npx supabase db push --remote                       # claim_art · refund_art · 캐시 인덱스
npx supabase functions deploy illustrate-bottle
npx supabase functions deploy delete-account        # 공통 admin 모듈로 바꿈
```

### 확인할 것
- [ ] 찍은 직후 그림이 자동으로 그려지지 않고 누끼만 보인다
- [ ] 테마 카드를 누르면 견본과 "수채화로 그리기"·"크레용으로 그리기" 버튼만 나온다 (그리지 않음)
- [ ] 그리기 → 그림이 나온다. 다른 테마를 그렸다가 돌아오면 바로 바뀐다 (다시 안 그림)
- [ ] 고른 카드를 다시 누르면 선택이 풀리고 누끼로 담긴다 (그린 뒤에는 버튼이 없다)
- [ ] 담은 뒤 상세에서 이미 그린 테마 카드에 "그렸어요"가 있고, 누르면 무료로 바뀐다
- [ ] Supabase `art_jobs`에 그린 만큼 줄이 생기고 `art` 저장소에 파일이 생긴다
- [ ] 같은 병·같은 테마를 상세에서 다시 요청해도 함수 로그가 `cached`다 (앱 재설치 후 포함)
- [ ] `usage_daily.art_count`를 9로 바꿔 두고 2장 그리면 두 번째에 "오늘 그릴 수 있는 10장을 다 썼어요"

## 로그인 (설정은 README "로그인" 참고)

| 확인 | 정상 |
|---|---|
| 첫 실행 | 인트로 다음에 로그인 화면이 한 번 뜸. "나중에 할게요"로 넘어가면 다시 안 뜸 |
| Apple로 계속하기 | 로그인 후 대시보드 Users에서 **같은 사용자 id**에 apple이 붙음 (새 사용자가 생기지 않음) |
| Google로 계속하기 | 브라우저 창 → 계정 선택 → 앱으로 돌아와 "Google에 연결돼 있어요" |
| 다른 기기에서 같은 계정 | 그 계정의 사용자로 로그인됨 (사용자 수 늘지 않음) |
| 홈 오른쪽 위 계정 버튼 | 연결 상태·계정 삭제 |
| 계정 삭제 | 대시보드 Users에서 사라지고, 앱은 새 익명 사용자로 계속 |

첫 실행을 다시 보려면 앱을 지웠다 다시 설치합니다.

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
