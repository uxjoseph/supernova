/**
 * Supernova Design System
 * 세련된 미니멀리즘 + 랜딩페이지 구성 가이드
 */

export const DESIGN_SYSTEM_GUIDE = `
## 디자인 시스템: 세련된 미니멀리즘

### 색상
- 배경: #FFFFFF, #FAFAFA, #F9FAFB
- 텍스트: #0A0A0A (primary), #6B7280 (secondary)
- 강조: #000000 (버튼), 선택적 포인트 컬러 1가지

### 타이포그래피
- 폰트: **Pretendard** (필수)
- 제목: text-5xl md:text-6xl font-bold tracking-tight
- 부제목: text-xl md:text-2xl text-gray-600
- 본문: text-base md:text-lg

### 여백
- 섹션: py-20 md:py-24
- 컨테이너: max-w-6xl mx-auto px-4 md:px-8
- 요소: gap-8 md:gap-12

### 버튼
- Primary: bg-black text-white px-8 py-4 rounded-full hover:bg-gray-900
- Secondary: border-2 border-black px-8 py-4 rounded-full hover:bg-black hover:text-white
`;

export const LANDING_PAGE_TEMPLATE = `
## 랜딩페이지 필수 섹션 (최소 8개)

1. **히어로**: 긴급성 배너 + 헤드라인 + CTA + 신뢰 배지
2. **문제 공감**: "이런 고민 있으시죠?" + 체크리스트
3. **해결책**: AS-IS vs TO-BE 대비
4. **솔루션**: 3컬럼 피처 그리드 또는 단계별 프로세스
5. **증거**: 숫자 성과 + 후기 카드
6. **혜택**: 체크리스트 + 보너스 + 가격
7. **FAQ**: 아코디언 형태
8. **최종 CTA**: 대형 버튼 + 마이크로카피
9. **푸터**: 로고 + 링크 + 저작권

### 필수 요소
- Pretendard 폰트 로드
- Tailwind CSS
- Lucide Icons (lucide.createIcons())
- 한글 텍스트만
- 반응형 (md:, lg:)
- CTA 3회 이상 반복
`;
