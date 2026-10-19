// 학생이 글을 쓴 뒤, 피드백을 받기 전에 직접 고르는 항목들입니다.
export const SELF_LEVELS = [
  { id: "low", emoji: "🌱", label: "아직 어려워요", desc: "무엇을 더 써야 할지 잘 모르겠어요" },
  { id: "mid", emoji: "🌿", label: "보통이에요", desc: "쓰긴 썼는데 더 좋아질 것 같아요" },
  { id: "high", emoji: "🌳", label: "꽤 잘 썼어요", desc: "더 멋지게 다듬고 싶어요" },
  { id: "unsure", emoji: "🤔", label: "잘 모르겠어요", desc: "편집자 AI가 봐 주세요" },
];

export const FOCUS_OPTIONS = [
  { id: "all", label: "전체적으로" },
  { id: "opening", label: "처음 부분" },
  { id: "content", label: "내용 (구체적으로)" },
  { id: "flow", label: "흐름·순서" },
  { id: "expression", label: "표현" },
  { id: "ending", label: "끝부분 (느낀 점)" },
  { id: "spelling", label: "맞춤법·띄어쓰기" },
];

export const DEPTH_OPTIONS = [
  { id: "hint", label: "힌트 질문만", desc: "스스로 생각해 볼래요" },
  { id: "concrete", label: "구체적으로", desc: "이렇게 해 볼 수 있다는 방법도 알려 주세요" },
];

export const AI_LEVEL_LABEL = { low: "하", mid: "중", high: "상" };
export const SELF_LEVEL_LABEL = { low: "🌱 아직 어려워요", mid: "🌿 보통", high: "🌳 꽤 잘 썼어요", unsure: "🤔 모르겠어요" };
