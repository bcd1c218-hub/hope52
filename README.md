# 오늘의 원고 편집실

초등학교 글쓰기 지도용 웹앱입니다. 학생은 로그인 없이 링크로 들어가 원고(타이핑 또는 원고지 사진)를
제출하고, AI 편집자에게 내용·구성·표현·어법 네 가지 관점의 피드백을 받으며 고쳐 씁니다.
모든 제출 기록은 Firebase에 저장되고, 교사는 별도 화면에서 반 전체 기록을 모아 볼 수 있습니다.

## 폴더 구조

```
src/
  components/
    StudentFlow.jsx        학생이 실제로 사용하는 전체 화면
    TeacherDashboard.jsx   교사 취합 화면 (비밀번호로 보호)
    FeedbackView.jsx       4개 카테고리 피드백 카드
    Shared.jsx             공통 UI 조각
  data/activities.js       기본 글쓰기 코너 목록 (여기에 추가하면 코너가 늘어남)
  services/                Firestore 읽기/쓰기 함수
  firebase.js              Firebase 초기화
  api.js                   /api 라우트를 호출하는 클라이언트 함수
api/
  ocr.js                   원고지 사진 → 텍스트 (서버에서 Claude 호출)
  feedback.js              텍스트 → 4개 카테고리 피드백 (서버에서 Claude 호출)
lib/prompts.js             두 API가 함께 쓰는 프롬프트/JSON 파싱 함수
firestore.rules            Firestore 보안 규칙 (아래 설명 참고)
```

AI 호출이 `/api` 서버 함수 안에서만 일어나기 때문에, Anthropic API 키가 학생 브라우저에
노출되지 않습니다. 이 부분이 이전 Claude 아티팩트 버전과 가장 다른 점이고, 그래서 학생들이
로그인 없이도 AI 피드백을 받을 수 있습니다.

## 1. Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속 → "프로젝트 추가"
2. 프로젝트 이름 입력 (예: `onul-wongo-editor`) → 애널리틱스는 꺼도 됩니다.
3. 왼쪽 메뉴 "빌드 > Firestore Database" → "데이터베이스 만들기"
   - 위치는 `asia-northeast3 (서울)` 선택 추천
   - 처음엔 "테스트 모드"로 시작해도 되고, 바로 아래 3번처럼 규칙을 붙여넣어도 됩니다.
4. Firestore 규칙 탭에 이 저장소의 `firestore.rules` 내용을 그대로 붙여넣고 게시하세요.
   - 이 규칙은 로그인 없는 학급 도구에 맞춰 "읽기/쓰기는 열고, 삭제는 막는" 정도로만
     보호합니다. Firebase 콘솔 화면 자체는 선생님만 접근하니 데이터가 함부로 지워지진
     않지만, 진짜 보안이 필요한 민감한 정보는 다루지 않는 게 좋습니다.
5. 왼쪽 메뉴 "프로젝트 개요" 옆 톱니바퀴 → "프로젝트 설정" → 아래로 스크롤해서 "내 앱" →
   웹 아이콘(`</>`)으로 앱 등록 → 나오는 `firebaseConfig` 값들을 복사해두세요.

## 2. Anthropic API 키 만들기

https://console.anthropic.com → API Keys → 새 키 생성. 이 키는 절대 `VITE_` 접두사를
붙이지 마세요. 서버 함수(`/api`)에서만 쓰이고 브라우저에는 절대 노출되면 안 됩니다.

## 3. 환경 변수 설정

`.env.example` 파일을 참고해서 값을 채워주세요. 로컬 개발용으로는 `.env.local` 파일을
만들어서 아래처럼 채우면 됩니다.

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

TEACHER_PASSCODE=원하는비밀번호

ANTHROPIC_API_KEY=sk-ant-...
```

`TEACHER_PASSCODE`는 (`VITE_` 접두사가 없어서) 서버에서만 쓰이고, 학생 화면 브라우저 코드에는 절대 노출되지 않습니다.

## 4. GitHub에 올리기

```bash
git init
git add .
git commit -m "오늘의 원고 편집실 초기 버전"
git branch -M main
git remote add origin <본인 GitHub 저장소 주소>
git push -u origin main
```

## 5. Vercel에 배포하기

1. https://vercel.com 에서 "Add New... > Project" → 방금 만든 GitHub 저장소 선택
2. Framework Preset은 자동으로 "Vite"가 잡힙니다. 빌드 명령/출력 폴더는 기본값 그대로 두면 됩니다.
3. "Environment Variables"에 위 3단계의 값들을 모두 등록하세요 (`ANTHROPIC_API_KEY` 포함).
4. Deploy 클릭 → 몇 분 뒤 `https://프로젝트이름.vercel.app` 같은 주소가 생깁니다.

환경 변수를 나중에 바꾸면 Vercel에서 "Redeploy"를 한 번 눌러줘야 반영됩니다.

## 6. 학생/교사 링크

- **학생용**: `https://프로젝트이름.vercel.app` 링크를 그대로 알려주면 됩니다. 로그인이
  필요 없고, 이름만 적고 바로 시작합니다.
- **교사용**: 같은 주소 뒤에 `?teacher=1`을 붙인 링크 (`https://프로젝트이름.vercel.app/?teacher=1`)
  로 들어가면 비밀번호 입력 화면이 나오고, 3단계에서 정한 `TEACHER_PASSCODE`를
  입력하면 전체 학생 제출 목록을 볼 수 있습니다.

## 7. 글쓰기 코너 추가하기

두 가지 방법이 있습니다.

- **바로 써보고 싶을 때**: 학생 화면의 "자유 코너 만들기"에서 이름/안내문/AI가 살펴볼 점을
  입력하면 바로 그 자리에서 새 코너가 만들어지고, Firestore에 저장되어 이후에도 계속 남습니다.
- **영구적으로 기본 코너에 추가하고 싶을 때**: `src/data/activities.js`의 `DEFAULT_ACTIVITIES`
  배열에 같은 형식으로 항목을 추가하고 다시 배포하세요.

## 8. 로컬에서 테스트하기

`/api` 폴더의 서버 함수는 일반 `vite dev`로는 실행되지 않습니다. Vercel CLI를 설치해서
아래처럼 실행하면 로컬에서도 API까지 함께 테스트할 수 있습니다.

```bash
npm install -g vercel
vercel dev
```

## 알려진 제한사항 / 다음 확장 아이디어

- Firestore 보안 규칙이 로그인 없이 열려 있어서, Firebase 설정 값을 아는 사람이 마음만
  먹으면 Firestore SDK로 직접 데이터를 읽을 수도 있습니다. 학급 활동 수준의 낮은 민감도
  데이터에 맞춘 절충입니다. (교사 비밀번호 자체는 이제 서버에서만 확인하므로 브라우저
  코드에는 노출되지 않습니다.)
- 원고지 사진 용량이 크면 AI가 읽는 데 시간이 걸릴 수 있습니다.
- 친구 피드백 단계, 완성작 인쇄용 모아보기(잡지 형태) 는 아직 들어있지 않습니다. 지금
  구조(Firestore에 학생별 최종본이 다 저장됨) 위에서 자연스럽게 이어서 만들 수 있습니다.
