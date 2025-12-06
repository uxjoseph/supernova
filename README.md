# ✨ Supernova

> AI 기반 랜딩페이지 디자인 도구 - 생각을 말하면 바로 디자인으로

Supernova는 Google Gemini AI를 활용하여 텍스트 설명만으로 전문적인 랜딩페이지를 생성하는 혁신적인 디자인 도구입니다. 디자이너나 개발자가 아니어도 누구나 쉽게 아름다운 웹 페이지를 만들 수 있습니다.

## 🎯 주요 기능

### 🤖 AI 기반 디자인 생성
- **자연어 프롬프트**: "IT 스타트업 랜딩페이지 만들어줘"처럼 자연스럽게 요청
- **실시간 생성**: 코드 생성 과정을 실시간으로 확인
- **고급 모드**: Gemini 3.0 Pro를 활용한 더 깊은 사고 과정

### 🎨 비주얼 캔버스 에디터
- **무한 캔버스**: 자유롭게 배치하고 관리하는 작업 공간
- **드래그 앤 드롭**: 모든 요소를 마우스로 쉽게 이동
- **실시간 미리보기**: 변경 사항을 즉시 확인

### 🔄 변종 생성
- **디자인 변형**: 기존 디자인을 기반으로 다양한 변종 생성
- **빠른 태그**: 다크모드, 미니멀, 그라디언트 등 원클릭 스타일 변경
- **맞춤 수정**: 원하는 부분만 골라서 수정 요청

### 📐 반응형 디자인
- **멀티 디바이스**: 모바일, 태블릿, 데스크탑 해상도 지원
- **미리보기 모드**: 각 디바이스별 레이아웃 즉시 확인
- **자동 최적화**: AI가 각 화면 크기에 맞게 자동 조정

### 🎯 추가 캔버스 요소
- **이미지 추가**: 로컬 이미지를 캔버스에 업로드
- **스티키 노트**: 아이디어와 메모를 포스트잇처럼 추가

### 📤 내보내기 옵션
- **Figma 복사**: 이미지로 변환하여 Figma에 바로 붙여넣기
- **ZIP 다운로드**: HTML, CSS 소스코드를 압축파일로 다운로드
- **코드 복사**: 개발용 HTML 코드를 클립보드에 복사

## 🚀 시작하기

### 필수 요구사항
- **Node.js** (v18 이상 권장)
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/app/apikey)에서 발급)

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/uxjoseph/supernova.git
   cd supernova
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   
   프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**
   
   `http://localhost:5173` 접속

## 💡 사용 방법

### 1. 디자인 생성
1. 좌측 사이드바의 입력창에 원하는 랜딩페이지 설명 입력
2. "고급모드"를 선택하면 더 정교한 디자인 생성
3. 생성 과정을 실시간으로 확인
4. 캔버스에 생성된 디자인 확인

### 2. 디자인 수정
- 캔버스에서 디자인 클릭하여 선택
- 드래그하여 위치 이동
- 모서리 핸들로 크기 조절
- 상단 툴바에서 이름 변경

### 3. 변종 생성
- 디자인 선택 후 "변종만들기" 버튼 클릭
- 사이드바에서 원하는 스타일 태그 선택 또는 직접 입력
- 새로운 변형 디자인 자동 생성

### 4. 내보내기
- 디자인 선택 후 "내보내기" 버튼 클릭
- Figma로 복사 / ZIP 다운로드 / HTML 코드 복사 선택

## 🛠 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 3.0 Pro / Gemini 2.5 Flash
- **Icons**: Lucide React
- **File Processing**: JSZip, html2canvas

## 📁 프로젝트 구조

```
supernova/
├── components/
│   ├── Canvas.tsx          # 메인 캔버스 컴포넌트
│   └── Sidebar.tsx         # 사이드바 및 채팅 UI
├── services/
│   └── geminiService.ts    # Gemini API 통신
├── types.ts                # TypeScript 타입 정의
├── designSystem.ts         # 디자인 시스템 컬러 팔레트
└── App.tsx                 # 메인 앱 컴포넌트
```

## 🎨 디자인 철학

Supernova는 **"복잡한 디자인 도구를 사용하지 않고도 전문적인 결과물을 만들 수 있어야 한다"**는 철학으로 만들어졌습니다. AI의 창의성과 사용자의 직관적인 조작이 만나 누구나 디자이너가 될 수 있습니다.

## 🤝 기여하기

이슈 제기, 버그 리포트, 기능 제안, Pull Request 모두 환영합니다!

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Created with ❤️ by [@uxjoseph](https://github.com/uxjoseph)

---

⭐ 프로젝트가 마음에 드셨다면 Star를 눌러주세요!
