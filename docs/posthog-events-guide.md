# PostHog 이벤트 추적 가이드

## 📊 설정된 이벤트 목록

### 1. 🎯 **signup** - 회원가입
**위치**: `contexts/AuthContext.tsx`
**트리거 시점**: 새로운 사용자가 Google OAuth로 로그인하고 프로필이 생성될 때

**추적 속성**:
```typescript
{
  provider: 'google',
  user_id: string,
  email: string
}
```

**확인 방법**:
1. 로그아웃 상태에서 시작
2. "Sign in with Google" 클릭
3. Google 계정으로 로그인
4. PostHog에서 'signup' 이벤트 확인

---

### 2. 📁 **project_created** - 프로젝트 생성
**위치**: `hooks/useProject.ts`
**트리거 시점**: 새로운 프로젝트가 생성될 때

**추적 속성**:
```typescript
{
  project_id: string,
  project_name: string,
  user_id: string
}
```

**확인 방법**:
1. 로그인 후 랜딩 페이지에서 "New Project" 또는 프롬프트 입력
2. 에디터 페이지로 진입
3. PostHog에서 'project_created' 이벤트 확인

---

### 3. ⭐ **first_generation_done** - 첫 생성 완료 (북극성 지표!)
**위치**: `pages/EditorPage.tsx`
**트리거 시점**: 사용자가 처음으로 디자인을 생성하고 완료했을 때

**추적 속성**:
```typescript
{
  project_id: string,
  model_type: 'fast' | 'quality',
  has_images: boolean,
  prompt_length: number,
  generation_time_ms: number,
  user_id: string,
  is_first_generation: true
}
```

**확인 방법**:
1. 새 프로젝트에서 프롬프트 입력 (예: "modern landing page")
2. 생성 완료 대기
3. PostHog에서 'first_generation_done' 이벤트 확인
4. 콘솔에 "🌟 First generation done tracked!" 로그 확인

**중요**: 이 이벤트는 프로젝트당 **한 번만** 발생하며, 가장 중요한 북극성 지표입니다.

---

### 4. 📤 **page_exported_or_shared** - 페이지 Export/공유
**위치**: `components/Canvas.tsx`
**트리거 시점**: 
- 사용자가 ZIP 파일로 Export할 때
- 사용자가 페이지를 Public으로 퍼블리시할 때

**추적 속성**:
```typescript
{
  project_id: string,
  node_id: string,
  action: 'exported' | 'published',
  export_type?: 'zip',  // action이 'exported'일 때만
  user_id: string
}
```

**확인 방법**:
1. 캔버스에서 노드 선택
2. **Export ZIP**: 
   - 우측 상단 "Export" 버튼 클릭
   - "Download ZIP" 선택
   - PostHog에서 `action: 'exported'` 이벤트 확인
3. **Publish/Share**:
   - 우측 상단 "Share" 버튼 클릭
   - "Publish to web" 토글을 ON
   - PostHog에서 `action: 'published'` 이벤트 확인

---

### 5. 🔄 **return_visit** - 재방문
**위치**: `contexts/AuthContext.tsx`
**트리거 시점**: 기존 사용자가 1일 이상 후에 다시 로그인할 때

**추적 속성**:
```typescript
{
  user_id: string,
  days_since_last_visit: number,
  total_projects: number,
  last_project_id?: string
}
```

**확인 방법**:
1. 로그인
2. 로그아웃
3. `profiles` 테이블에서 `last_visit_at`을 1일 이전으로 수동 변경 (테스트용)
4. 다시 로그인
5. PostHog에서 'return_visit' 이벤트 확인

---

## 🛠 개발 환경 설정

### 필수 환경 변수
`.env` 파일에 다음 변수가 설정되어 있어야 합니다:

```env
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### PostHog 초기화
이미 `index.tsx`에서 `PostHogProvider`로 초기화되어 있습니다:

```tsx
<PostHogProvider
  apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
  options={{
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
    capture_exceptions: true,
    debug: import.meta.env.MODE === 'development',
  }}
>
  <App />
</PostHogProvider>
```

---

## 📚 코드 구조

### 중앙화된 이벤트 관리
모든 이벤트 이름과 타입은 `lib/analytics.ts`에서 enum으로 관리됩니다:

```typescript
export enum AnalyticsEvent {
  SIGNUP = 'signup',
  PROJECT_CREATED = 'project_created',
  FIRST_GENERATION_DONE = 'first_generation_done',
  PAGE_EXPORTED_OR_SHARED = 'page_exported_or_shared',
  RETURN_VISIT = 'return_visit',
}
```

### 커스텀 훅 (선택사항)
`hooks/useAnalytics.ts`에 편리한 래퍼 훅이 준비되어 있습니다:

```typescript
const { trackSignup, trackProjectCreated, trackFirstGenerationDone } = useAnalytics();
```

**현재는 `posthog` 직접 import 방식을 사용 중**이지만, 향후 훅으로 전환 가능합니다.

---

## 🔍 디버깅

### 콘솔 로그 확인
각 이벤트가 트리거될 때 콘솔에 로그가 출력됩니다:

```
[Analytics] Signup tracked: user@example.com
[Analytics] Project created tracked: abc-123
[Analytics] 🌟 First generation done tracked! (North Star Metric) { ... }
[Analytics] Page exported tracked (ZIP): node-xyz
[Analytics] Page published tracked: node-xyz
[Analytics] Return visit tracked: 3 days
```

### PostHog 대시보드
1. PostHog 대시보드 접속
2. "Events" 탭에서 실시간 이벤트 확인
3. "Insights" 탭에서 퍼널 및 트렌드 분석

---

## 📈 추천 분석 퍼널

### 사용자 활성화 퍼널 (Activation Funnel)
1. `signup` - 회원가입
2. `project_created` - 프로젝트 생성
3. `first_generation_done` ⭐ - 첫 생성 (북극성 지표)
4. `page_exported_or_shared` - Export 또는 공유

### 재참여 분석
- `return_visit` 이벤트의 `days_since_last_visit` 분포 분석
- 재방문 사용자의 `first_generation_done` 재발생 여부 추적

---

## ⚠️ 주의사항

1. **개인정보 보호**: 이메일 주소는 `identify`에서만 사용하고, 이벤트 속성에는 최소한으로 포함
2. **테스트 계정 필터링**: 개발 중에는 `debug: true` 모드 사용
3. **중복 이벤트 방지**: 
   - `first_generation_done`은 `isFirstGeneration` 플래그로 제어
   - `return_visit`은 `last_visit_at` 기반으로 1일 이상 간격 확인

---

## 🚀 다음 단계

### 추가 가능한 이벤트
- `variant_created` - 변종 생성
- `node_edited` - 노드 수정
- `credits_purchased` - 크레딧 구매
- `feedback_submitted` - 피드백 제출

### 고급 분석
- Cohort 분석: 첫 생성까지 걸린 시간별 그룹화
- Retention 분석: D1, D7, D30 재방문율
- Funnel 드롭오프 지점 분석

---

## 📞 문의
PostHog 이벤트 관련 문의는 개발팀에 연락해주세요.

