// 학생이 글을 쓴 뒤, 피드백을 받기 전에 직접 고르는 항목들입니다.
export const SELF_LEVELS = [
  { id: "low", emoji: "🌱", label: "이제 막 시작했어요", desc: "생각을 쓰기 시작한 단계예요" },
  { id: "mid", emoji: "🌿", label: "쓰는 중이에요", desc: "더 붙이고 고치고 싶어요" },
  { id: "high", emoji: "🌳", label: "거의 다 됐어요", desc: "마지막으로 다듬고 싶어요" },
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
export const SELF_LEVEL_LABEL = { low: "🌱 막 시작", mid: "🌿 쓰는 중", high: "🌳 거의 다 됨", unsure: "선택 안 함" };
