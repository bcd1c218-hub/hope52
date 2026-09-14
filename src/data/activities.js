// 기본 글쓰기 코너. 여기에 항목을 추가하면 모든 학생 화면에 새 코너가 나타납니다.
// icon은 lucide-react 컴포넌트 이름 문자열이고, src/iconMap.js 에서 실제 컴포넌트로 매핑됩니다.
export const DEFAULT_ACTIVITIES = [
  {
    id: "sayeon",
    label: "사연 코너",
    icon: "Mic",
    tagline: "나의 경험을 라디오 사연처럼",
    writingPrompt: "방학 동안 있었던 일 중 하나를 골라, 라디오 사연처럼 그때의 장면과 기분이 드러나게 써보세요.",
    contentFocus: "그때의 장면이나 기분이 구체적으로 드러나는지, 듣는 사람이 상황을 상상할 수 있는지",
  },
  {
    id: "diary",
    label: "일기 코너",
    icon: "BookOpen",
    tagline: "오늘 하루를 돌아보며",
    writingPrompt: "오늘 있었던 일 중 하나를 고르고, 그때 느낀 감정이 잘 드러나게 써보세요.",
    contentFocus: "그때 느낀 감정이나 생각이 구체적으로 표현되었는지",
  },
  {
    id: "book-report",
    label: "독서감상 코너",
    icon: "BookMarked",
    tagline: "책을 읽고 든 생각을 정리하며",
    writingPrompt: "읽은 책의 내용을 간단히 소개하고, 그 부분에서 든 자신의 생각이나 느낌을 써보세요.",
    contentFocus: "책의 내용과 자신의 생각이 구분되어 쓰였는지, 왜 그렇게 생각했는지 이유가 드러나는지",
  },
  {
    id: "argument",
    label: "주장 코너",
    icon: "Megaphone",
    tagline: "내 생각을 근거와 함께",
    writingPrompt: "하나의 주제에 대한 자신의 주장을 정하고, 그렇게 생각하는 이유나 근거를 들어 써보세요.",
    contentFocus: "주장이 분명하게 드러나는지, 주장을 뒷받침하는 이유나 근거가 있는지",
  },
];
