# ✅ PostHog 이벤트 설정 완료

## 🎉 설정된 이벤트

| 이벤트 | 위치 | 설명 | 중요도 |
|--------|------|------|--------|
| **signup** | `AuthContext.tsx` | 회원가입 완료 | 🟢 High |
| **project_created** | `useProject.ts` | 새 프로젝트 생성 | 🟢 High |
| **first_generation_done** ⭐ | `EditorPage.tsx` | 첫 디자인 생성 완료 (북극성 지표) | 🔴 Critical |
| **page_exported_or_shared** | `Canvas.tsx` | ZIP Export 또는 Public 공유 | 🟡 Medium |
| **return_visit** | `AuthContext.tsx` | 1일+ 후 재방문 | 🟡 Medium |

---

## 📁 생성된 파일

### 새로 생성된 파일
1. **`lib/analytics.ts`**
   - 모든 이벤트 이름을 enum으로 관리
   - TypeScript 타입 정의

2. **`hooks/useAnalytics.ts`**
   - PostHog 이벤트 추적을 위한 커스텀 훅
   - 재사용 가능한 헬퍼 함수

3. **`docs/posthog-events-guide.md`**
   - 전체 이벤트 가이드 문서
   - 테스트 방법 및 디버깅 가이드

### 수정된 파일
1. **`contexts/AuthContext.tsx`**
   - ✅ `signup` 이벤트 추가 (새 프로필 생성 시)
   - ✅ `return_visit` 이벤트 추가 (재로그인 시)
   - ✅ 사용자 식별 (`posthog.identify`)

2. **`hooks/useProject.ts`**
   - ✅ `project_created` 이벤트 추가

3. **`pages/EditorPage.tsx`**
   - ✅ `first_generation_done` 이벤트 추가 (북극성 지표!)
   - ✅ 생성 시간 측정
   - ✅ 첫 생성 여부 체크

4. **`components/Canvas.tsx`**
   - ✅ `page_exported_or_shared` 이벤트 추가 (ZIP Export)
   - ✅ `page_exported_or_shared` 이벤트 추가 (Publish)
   - ✅ `Edit3` import 추가 (linter 에러 수정)

---

## 🚀 빠른 테스트 가이드

### 1단계: 환경 변수 확인
`.env` 파일에 PostHog 키가 있는지 확인:
```bash
cat .env | grep POSTHOG
```

### 2단계: 개발 서버 실행
```bash
npm run dev
```

### 3단계: 이벤트 테스트

#### A. Signup 이벤트
1. 로그아웃 상태에서 시작
2. "Sign in with Google" 클릭
3. 콘솔에서 `[Analytics] Signup tracked` 로그 확인

#### B. Project Created 이벤트
1. 랜딩 페이지에서 프롬프트 입력
2. 콘솔에서 `[Analytics] Project created tracked` 로그 확인

#### C. First Generation Done 이벤트 (북극성!)
1. 에디터에서 프롬프트 입력 (예: "modern landing page")
2. 생성 완료 대기
3. 콘솔에서 `🌟 First generation done tracked!` 로그 확인

#### D. Page Exported/Shared 이벤트
1. 노드 선택
2. **ZIP Export**: "Export" → "Download ZIP"
3. **Publish**: "Share" → "Publish to web" 토글 ON
4. 콘솔에서 해당 로그 확인

#### E. Return Visit 이벤트
1. 로그아웃
2. (테스트) Supabase에서 `profiles.last_visit_at`을 과거로 변경
3. 다시 로그인
4. 콘솔에서 `[Analytics] Return visit tracked` 로그 확인

---

## 📊 PostHog 대시보드 확인

### 실시간 이벤트 확인
1. PostHog 대시보드 접속
2. **"Events"** 탭 → **"Live events"** 클릭
3. 위에서 테스트한 이벤트들이 실시간으로 표시됨

### 권장 인사이트 생성

#### 1. 사용자 활성화 퍼널
```
signup → project_created → first_generation_done → page_exported_or_shared
```

#### 2. 첫 생성까지 시간 (Time to First Generation)
- 이벤트: `first_generation_done`
- 속성: `generation_time_ms` 분포 차트

#### 3. 재방문 간격 분석
- 이벤트: `return_visit`
- 속성: `days_since_last_visit` 분포 차트

---

## 🎯 북극성 지표 (North Star Metric)

### first_generation_done
이것이 가장 중요한 지표입니다!

**왜 북극성 지표인가?**
- 사용자가 제품의 핵심 가치를 경험한 순간
- 회원가입 → 활성화 전환의 핵심 단계
- Retention과 직접적인 상관관계

**추적 속성**:
```typescript
{
  project_id: string,
  model_type: 'fast' | 'quality',
  has_images: boolean,
  prompt_length: number,
  generation_time_ms: number,
  user_id: string,
  is_first_generation: true  // 🔥 중요!
}
```

**분석 방향**:
1. **전환율**: signup → first_generation_done (목표: 70%+)
2. **소요 시간**: signup 후 첫 생성까지 시간 (목표: 5분 이내)
3. **속성 분석**:
   - `has_images: true` vs `false` 전환율 비교
   - `prompt_length` 최적 범위 찾기
   - `model_type` 선택과 만족도 관계

---

## ⚠️ 주의사항

### 중복 이벤트 방지
- ✅ `first_generation_done`은 `isFirstGeneration` 플래그로 제어됨
- ✅ `return_visit`은 `last_visit_at` 기반으로 1일+ 간격 확인
- ✅ `signup`은 새 프로필 생성 시에만 발생

### 개인정보 보호
- ✅ 이메일은 `identify`에서만 사용
- ✅ 이벤트 속성은 최소한의 정보만 포함
- ✅ Supabase `profiles` 테이블에 `last_visit_at` 추가 필요

---

## 📝 다음 단계 (선택사항)

### 추가 이벤트 제안
1. `variant_created` - 변종 생성
2. `node_edited` - 노드 수정
3. `chat_message_sent` - 채팅 메시지
4. `credits_low` - 크레딧 부족 경고
5. `upgrade_clicked` - 업그레이드 버튼 클릭

### 고급 분석
1. **Cohort 분석**: 첫 생성 시간대별 그룹화
2. **Retention 분석**: D1, D7, D30 재방문율
3. **A/B 테스트**: 온보딩 플로우 최적화

---

## 🔗 관련 문서
- 📖 [전체 이벤트 가이드](./docs/posthog-events-guide.md)
- 🏗 [PostHog 공식 문서](https://posthog.com/docs)
- 📊 [대시보드 접속](https://app.posthog.com)

---

## ✨ 완료!
모든 PostHog 이벤트 설정이 완료되었습니다.
이제 사용자 행동을 추적하고 데이터 기반 의사결정을 할 수 있습니다! 🚀

