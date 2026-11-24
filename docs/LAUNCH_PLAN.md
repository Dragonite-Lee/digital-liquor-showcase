# 술장 출시 계획

출시까지 해야 할 일을 순서대로 정리한 문서입니다. 위에서부터 차례로 진행하고, 끝난 항목은 `[x]`로 바꿉니다.

## 지금 구조와 바꿀 구조

**지금**

1. 앱이 사진을 보냅니다.
2. Edge Function이 Cloudflare를 거쳐 나노바나나를 부르고 약 15초 기다립니다.
3. 결과를 바로 돌려받습니다.

이 방식의 문제는 네 가지입니다.

- 앱을 닫거나 네트워크가 끊기면 결과를 잃습니다.
- 요청이 몰리면 429 오류가 나고 그대로 실패합니다.
- 구매 여부와 사용 횟수를 기기에서만 확인하므로 조작으로 뚫을 수 있습니다.

**출시 구조: 작업을 맡기고 나중에 받기**

```
앱 ── 익명 로그인 ──▶ Supabase Auth (user_id)
 │
 ├─ 사진 업로드 ──▶ Storage: originals/{user_id}/{bottle_id}.jpg
 ├─ 작업 등록 ───▶ Edge Function enqueue-art
 │                  (권한, 일일 한도, 캐시 확인 → art_jobs에 한 줄 추가)
 │
 │              art_jobs (queued → running → done / failed)
 │                    ▲          │
 │                    │          ▼
 │              Edge Function art-worker (cron 또는 트리거)
 │                - 정해진 개수만 동시에 꺼내 처리
 │                - provider adapter: cloudflare / google / comfy
 │                - 429·5xx는 백오프 후 재시도, 3회 실패하면 failed
 │                - 결과 저장: Storage art/{user_id}/{job_id}.png
 │
 └─ 결과 수신 ◀── Realtime(art_jobs 변경) 또는 앱 실행 시 조회
```

## 단계별 할 일

### 1단계: 함수 정리

- [x] **provider adapter**
  - `illustrate-bottle`에서 모델을 호출하는 부분을 `providers/` 아래 `cloudflare.ts`와 `google.ts`로 분리합니다.
  - 공통 형태는 `generate({image, prompt}) → {png, model, costUsd}`입니다.
  - 사용할 provider는 환경변수 `ART_PROVIDER`로 고르고, 테마별로 따로 지정할 수도 있게 합니다(`ART_PROVIDER_<THEME>`).
- [x] **재시도**
  - 429, 5xx, 타임아웃이 나면 지수 백오프로 최대 3회 다시 시도합니다(1초 → 3초 → 9초, 지터 포함).
  - 422(flagged)는 다시 시도하지 않습니다.
- [x] **classify 빈 이름 문제** (프롬프트 보강 완료, 실제 사진으로 확인 필요)
  - 글렌리벳처럼 이름이 비어서 오는 경우가 있습니다. 응답의 `raw`를 보고 프롬프트를 손봅니다.
  - 그래도 비어 있으면 앱에서 "이름을 입력해주세요"로 처리합니다.

- 테스트(비용 0, 실제 모델 호출 없음): `deno test -A supabase/functions/_tests`

### 2단계: 사용자 식별과 데이터베이스

- [x] **Supabase 익명 로그인** (코드 완료, 대시보드 설정 필요)
  - 앱은 처음 실행할 때 `signInAnonymously()`를 부르고, 세션은 AsyncStorage에 둡니다. `src/lib/supabase.ts`
  - 대시보드 Authentication → Sign In / Providers에서 **Allow anonymous sign-ins**를 켜야 합니다.
  - 익명 가입 남용은 Supabase 기본 IP 한도(시간당 30회)로 막습니다. 출시 전 CAPTCHA(Turnstile)를 검토합니다.
- [x] **함수 인증 변경**
  - 플랫폼 `verify_jwt`는 새 키 체계와 맞지 않는 경우가 있어 `false`로 두고, 함수 안에서 `getClaims`로 사용자 토큰을 검증합니다. `supabase/functions/_shared/auth.ts`
  - 토큰이 없으면 401입니다. publishable 키만으로는 더 이상 부를 수 없습니다.
- [x] **테이블** `supabase/migrations/20261123000000_users_and_jobs.sql`
  - `profiles`(가입 시 트리거로 자동 생성), `entitlements`, `art_jobs`, `usage_daily`
  - 모두 RLS를 켜고 본인 행 읽기만 허용합니다. 쓰기는 함수(secret 키)만 합니다.
  - 같은 영수증(transaction_id)은 한 계정에만 기록됩니다. 계정이 지워지면 행도 같이 지워집니다.
- [x] **Storage 버킷**: `originals`(앱이 본인 폴더에 업로드), `art`(함수만 쓰고 본인만 읽음), 둘 다 비공개
- 검증: 로컬 Postgres에서 마이그레이션 적용과 RLS 동작(남의 행·폴더 차단, 앱 직접 쓰기 차단)을 확인했습니다.

### 2.5단계: 계정 연결 (Apple · Google)

- [x] 로그인 화면: iOS Apple·Google, Android Google. 익명 사용자에 계정을 연결(linkIdentity)해 id 유지, 이미 다른 사용자 것이면 그 사용자로 로그인
- [x] 처음 실행 때 한 번 노출, "나중에 할게요" 가능 (로그인 강제는 심사 가이드라인 5.1.1 위험이 있어 하지 않음)
- [x] 앱 안 계정 삭제 (`delete-account` 함수, 심사 요구사항 5.1.1(v))
- [x] Supabase·Google Cloud·Apple 설정, 폰에서 Apple·Google 로그인 확인

### 3단계: 결제 (RevenueCat)

**확정한 것**

| 항목 | 내용 |
|---|---|
| 앱 본체 | 유료 앱 **5,500원** (애플 가격 단계에 4,900원이 없어 5,500원). 수채화 테마 포함 |
| 테마 | 인상주의·유화·크레용 각각 **1,100원**, 비소모성(한 번 사면 계속) |
| 묶음 상품 | 만들지 않음 (나중에 필요하면 추가) |
| 무료 체험 | 테마마다 1회 |
| 결제 방식 | RevenueCat (`react-native-purchases`) |

**준비 (이준영)**

- [x] 유료 앱 계약, 은행 계좌
- [ ] 유료 앱 계약 새 버전 동의, 세금 양식(W-8BEN) 활성 확인
- [x] App Store Small Business Program 신청 (2026-11-24, 승인 메일 대기) — 승인되면 RevenueCat 앱 설정에도 가입일 입력
- [x] App Store Connect 앱 등록, 가격 5,500원
- [x] 인앱 상품 3개 생성(비소모성, 1,100원, 대한민국) — 심사 스크린샷은 결제 연동 후
  - `kr.dragonite.suljang.theme.monet` (인상주의)
  - `kr.dragonite.suljang.theme.vangogh` (유화)
  - `kr.dragonite.suljang.theme.crayon` (크레용)
- [ ] App Store Connect → 사용자 및 액세스 → 통합 → **인앱 구입 키**(.p8) 발급 → RevenueCat에 등록
- [ ] RevenueCat 가입 → 프로젝트·iOS 앱 추가 → 상품 3개 연결 → 엔타이틀먼트 3개(`monet`, `vangogh`, `crayon`)
- [ ] 샌드박스 테스터 계정 만들기 (App Store Connect → 사용자 및 액세스 → 샌드박스)

**코드 (Claude)**

- [ ] `react-native-purchases` 설치 (네이티브 모듈이라 다시 빌드 필요)
- [ ] 앱 시작 시 `Purchases.configure`, 사용자 id는 Supabase 사용자 id로 (`logIn`) → 기기를 바꿔도 같은 구매
- [ ] `purchases.ts`의 자리 코드를 실제 구매·복원으로 교체, 가격은 스토어가 주는 현지 가격 표시
- [ ] RevenueCat **webhook** → Supabase 함수 `revenuecat-webhook` → `entitlements`에 기록 (`NON_RENEWING_PURCHASE`, 거래 id로 중복 방지)
- [ ] 테마 권한은 서버 `entitlements` 기준, 기기 값은 표시용 캐시
- [ ] 무료 체험 1회를 서버에서 확인 (`art_jobs`)
- [ ] 테마 결제 창 디자인 교체 (시안 받은 뒤)
- [ ] 구매 복원 버튼 (심사 필수)

### 4단계: 작업 큐

- [ ] **`enqueue-art` 함수**
  1. JWT를 확인합니다.
  2. 테마 권한을 확인합니다. 수채화는 누구나 쓸 수 있고, 나머지는 구매했거나 체험이 남아 있어야 합니다.
  3. 일일 한도를 확인합니다.
  4. 캐시를 확인합니다. 같은 `input_hash`와 테마로 done인 작업이 있으면 그 결과를 바로 돌려줍니다.
  5. 위를 모두 통과하면 `art_jobs`에 queued로 넣고 `job_id`를 돌려줍니다.
- [ ] **`art-worker` 함수**
  - 1분 간격 cron(pg_cron 또는 Supabase Cron)과, 작업이 들어올 때의 즉시 트리거로 실행합니다.
  - `select ... for update skip locked limit N`으로 작업을 꺼내 running으로 바꿉니다.
  - 동시에 처리하는 개수 N은 환경변수로 정합니다(시작값 3).
  - provider adapter를 부르고, 결과를 Storage에 저장한 뒤 done으로 바꿉니다.
  - 실패하면 `attempts`를 올리고 queued로 되돌립니다. 3회째에도 실패하면 failed로 둡니다.
  - running 상태로 5분 넘게 멈춘 작업은 queued로 되돌립니다.
- [ ] **앱 변경**
  - `useCapture`: 촬영하면 업로드하고 작업을 등록한 다음 바로 저장합니다. 병은 누끼 이미지로 먼저 보이고, 그림이 오면 바뀝니다.
  - Realtime으로 `art_jobs`를 구독하고, 앱을 실행할 때 밀린 결과도 받아옵니다.
  - 진열장과 상세 화면에 "그리는 중"과 "실패, 다시 시도" 상태를 보여줍니다.
- [ ] **기존 동기 함수 처리**
  - `illustrate-bottle`은 큐로 전환을 마친 뒤 제거하거나 개발용으로만 남깁니다.

### 5단계: 비용과 남용 방지

- [x] **그림 정책 (2026-11-25 확정)**
  - 찍으면 누끼만 땁니다(폰 안, 무료). 테마 없이 누끼로 담을 수 있습니다.
  - 테마 카드는 고르기만 합니다. 견본을 보여 주고 "○○(으)로 그리기"를 눌러야 그립니다.
  - 병마다 테마별 그림을 전부 폰에 보관합니다(`Bottle.arts`). 이미 그린 테마로 바꾸면 무료입니다. 진열장에는 고른 1개만 보입니다.
  - 같은 병·같은 테마는 한 번만 그립니다. "다시 그리기"는 하루 한도 안에서 됩니다.
- [x] **일일 한도**: 그림 하루 10장(한국 날짜, `ART_DAILY_LIMIT`로 변경). 실패하면 돌려줍니다. 분류 한도는 아직입니다.
- [x] **캐시**: 같은 사용자·같은 입력 해시·같은 테마면 서버 `art` 저장소의 그림을 돌려줍니다(한도 안 씀). 다시 그리기는 캐시를 건너뜁니다.
- [ ] **지출 상한**
  - Cloudflare AI Gateway에 월 지출 한도와 알림을 겁니다.
  - Anthropic 콘솔에 월 한도를 겁니다.
- [ ] **비용 기록**
  - `art_jobs.cost_usd`를 쌓아두고 사용자별, 일별 비용을 볼 수 있게 합니다.
- [ ] **분류 함수 보호**
  - `classify-bottle`에도 JWT를 요구하고 일일 한도를 적용합니다.

### 6단계: 백업과 복원

- [ ] **병 메타데이터 서버 동기화**
  - `bottles(user_id, id, name, category, memo, theme, slot, image_path, art_path, created_at)` 테이블을 만들고, 이미지는 Storage에 올립니다.
- [ ] **복원**
  - 기기를 바꾸면 "구매 복원"으로 같은 계정을 찾아 데이터를 받아옵니다.
  - 익명 계정을 Apple 로그인과 연결(link identity)하면 다른 기기에서도 이어집니다.
- [ ] **계정 삭제**
  - 앱 안에서 계정 삭제를 할 수 있어야 합니다(Apple 심사 요구사항). 삭제하면 Storage와 DB 데이터를 함께 지웁니다.

### 7단계: 심사와 출시 준비

- [ ] **연령 등급**: 주류 콘텐츠이므로 17+ 또는 18+로 설정합니다.
- [ ] **상표**
  - 앱 에셋, 스크린샷, 테마 미리보기에는 가상 병(MAISON LUNE)만 씁니다.
  - 미리보기를 만들려면 `node scripts/make-theme-previews.mjs`를 실행합니다.
- [ ] **법적 문서**
  - 개인정보처리방침에 사진 처리, AI 전송(Anthropic, Google, Cloudflare), 보관 기간을 적습니다.
  - 이용약관도 준비합니다. App Store Connect에 URL을 등록합니다.
- [ ] **App Privacy 라벨**: 사진, 구매 내역, 식별자를 기재합니다.
- [ ] **오류·분석 도구**: Sentry 또는 Expo 기본 도구를 붙이고, 함수 로그를 보존합니다.
- [ ] **EAS Build**: production 프로필로 빌드하고 TestFlight 내부 테스트를 거쳐 심사에 제출합니다.
- [ ] **스토어 자료**: 스크린샷(가상 병 기준), 설명, 키워드를 준비합니다.

### 8단계: 출시 후 확장

- [ ] **Android**: ML Kit 누끼는 이미 구현되어 있습니다. Google Play 결제를 붙이고 빌드합니다.
- [ ] **provider 전환**
  - 사용량이 늘면 Google을 직접 호출해 5% 수수료를 없애고 한도를 올립니다.
  - 그림체를 고정하고 싶으면 Comfy Cloud에서 오픈 모델과 LoRA 조합을 시험합니다.
- [ ] **워커 동시 처리 수 조정**: provider 한도에 맞춰 N을 올립니다.

## 비용 기준 (2026-11 기준)

| 항목 | 단가 |
|---|---|
| 그림 1장 (나노바나나, Cloudflare 경유) | 약 $0.039 + 5% |
| 분류 1회 (Claude Haiku) | 수 원 |
| 병 1개 합계 | 약 65원 |
| 앱 5,500원 실수령 (부가세 10%·수수료 15% 제외, 대략) | 약 4,250원 → 약 65병분 |
| 테마 1,100원 실수령 (같은 기준, 대략) | 약 850원 → 그림 약 13장분 |
| RevenueCat | 월 추적 매출 $2,500까지 무료, 넘는 달만 1% |

그림은 "그리기"를 누른 것에만 비용이 들고, 하루 10장(약 670원)이 사용자당 상한입니다.

## 관련 위치

- 함수: `supabase/functions/classify-bottle`, `supabase/functions/illustrate-bottle`
- 프롬프트: `supabase/functions/illustrate-bottle/prompts.ts`
- 테마 정의와 가격: `src/lib/themes.ts`, `src/lib/purchases.ts`
- 촬영 흐름: `src/lib/useCapture.ts`
