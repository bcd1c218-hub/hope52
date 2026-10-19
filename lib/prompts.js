export function extractJson(raw) {
  const cleaned = String(raw).replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("응답 형식을 이해하지 못했어요.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function ocrMessageContent(mediaType, base64) {
  return [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    {
      type: "text",
      text:
        "이 원고지 사진 속 손글씨를 최대한 정확하게 그대로 옮겨 적어줘. " +
        "맞춤법이나 띄어쓰기가 틀려 보여도 절대 고치지 말고 학생이 쓴 그대로 옮겨야 해. " +
        "가장 중요한 규칙: 사진에 실제로 있는 글자만 옮겨 적어야 해. 절대로 내용을 지어내거나, " +
        "앞뒤 문맥에 맞춰 그럴듯한 문장을 추측해서 채워 넣지 마. " +
        "글씨가 흐리거나 겹쳐 있거나 잘려서 도저히 못 읽겠는 부분이 있으면, 없는 내용을 " +
        "만들어내지 말고 그 자리에 [읽기 어려움]이라고만 표시해. " +
        "사진 안에 원고지 글이 아예 안 보이거나 다른 사물이 찍혀 있으면, " +
        '{"text": "", "warning": "사진에서 원고지 글씨를 찾지 못했어요."} 로만 답해. ' +
        '그 외의 정상적인 경우는 오직 아래 JSON 형식으로만 답해. 코드블록 표시나 다른 설명은 절대 하지 마.\n{"text": "여기에 옮긴 전체 글"}',
    },
  ];
}

const FOCUS_TEXT = {
  all: "전체적으로",
  opening: "처음 부분(글의 시작)",
  content: "내용(경험·생각이 구체적인지)",
  flow: "흐름·순서",
  expression: "표현",
  ending: "끝부분(느낀 점·마무리)",
  spelling: "맞춤법·띄어쓰기",
};
const FOCUS_CATEGORY = { opening: "처음", content: "내용", flow: "구성", expression: "표현", ending: "마무리" };
const SELF_TEXT = {
  low: "아직 어려워요 (스스로 낮게 평가)",
  mid: "보통이에요",
  high: "꽤 잘 썼어요 (스스로 높게 평가)",
  unsure: "잘 모르겠어요 (AI가 판단해 주길 원함)",
};

export function feedbackPrompt(studentText, activity, previous, options) {
  const label = activity?.label || "글쓰기";
  const writingPrompt = activity?.writingPrompt || "";
  const contentFocus = activity?.contentFocus || "경험이나 생각이 구체적으로 드러나는지";

  const focus = Array.isArray(options?.focus) && options.focus.length ? options.focus : ["all"];
  const isAll = focus.includes("all");
  const depth = options?.depth === "concrete" ? "concrete" : "hint";
  const selfLevel = SELF_TEXT[options?.selfLevel] ? options.selfLevel : "unsure";
  const wantsSpelling = isAll || focus.includes("spelling");
  const focusAreas = focus.filter((f) => FOCUS_CATEGORY[f]);

  let previousBlock = "";
  if (previous && typeof previous.text === "string" && previous.text.trim()) {
    const prevQs = Array.isArray(previous.feedback?.detective_feedback)
      ? previous.feedback.detective_feedback.map((d) => `- (${d.category}) ${d.question}`).join("\n")
      : "";
    previousBlock = `
이번은 고쳐 쓴 글이야. 학생이 바로 전에 낸 글과, 그때 네가 던진 질문은 아래와 같아.
[전에 낸 글]
"""
${String(previous.text).slice(0, 3000)}
"""
[전에 던진 질문]
${prevQs || "(없음)"}

고쳐 쓴 글을 전의 글과 비교해서, 학생이 무엇을 바꿨는지 먼저 살펴봐.
- 질문에 답하려고 내용을 더하거나 고쳤다면, 그 노력을 good_point에서 구체적으로 칭찬해 줘.
- 띄어쓰기·맞춤법·문장부호만 고치고 내용(경험, 느낌, 생각)은 거의 그대로라면, 그 점을 다정하게 알려 줘. 예: "글이 깔끔해졌어요! 그런데 아직 ○○ 이야기는 그대로네요." 그리고 전에 던진 질문을 다른 방식으로 다시 물어 줘.
- 이미 충분히 잘 고쳤다면 새 질문을 억지로 만들지 말고, 남은 한 가지 정도만 물어봐.
`;
  }

  const focusRule = isAll
    ? "- 학생이 '전체적으로'를 골랐어. 이 글에 지금 가장 필요한 부분 1~2개를 네가 골라서 피드백해. 한꺼번에 여러 개를 쏟아붓지 마."
    : focusAreas.length
    ? `- 학생이 피드백받고 싶은 부분을 직접 골랐어: ${focusAreas.map((f) => `${FOCUS_TEXT[f]}(category "${FOCUS_CATEGORY[f]}")`).join(", ")}. 고른 부분에만 집중해서 부분마다 질문 1개씩(필요하면 2개) 해 줘. 고르지 않은 부분은 말하지 마. 전체 질문은 최대 3개.`
    : "- 학생은 맞춤법·띄어쓰기만 골랐어. detective_feedback은 빈 배열로 둬.";

  const spellingRule = wantsSpelling
    ? "- copyedit_fixes: 맞춤법·띄어쓰기·문장부호 중 가장 중요한 것 최대 3개를 어디를 어떻게 고치면 되는지 바로 알려줘. 고칠 곳이 없으면 빈 배열."
    : "- copyedit_fixes: 학생이 맞춤법을 고르지 않았으니 반드시 빈 배열로 둬.";

  const depthRule =
    depth === "concrete"
      ? `- 학생이 '구체적으로'를 골랐어. detective_feedback의 각 항목에 "ideas"를 2~3개 넣어 줘. ideas는 학생이 시도해 볼 수 있는 구체적인 방법이야. 짧게 방법을 설명하고, 필요하면 학생 글과 다른 상황의 짧은 예시를 곁들여도 좋아. (예: "소리를 넣어 볼 수 있어요. 예: '쿵!' 하고 문이 닫혔다.") 단, 학생 글의 문장을 대신 고쳐 쓰거나 완성된 문단을 써 주지는 마. 선택은 학생 몫이야.`
      : `- 학생이 '힌트 질문만'을 골랐어. "ideas"는 빈 배열로 두고, 스스로 생각하게 만드는 질문으로만 표현해.`;

  return `너는 초등학교 5학년 학생의 글쓰기를 도와주는 "글쓰기 편집자 AI"야.
학생은 "${label}"라는 글쓰기 활동에서 아래와 같은 안내를 받고 글을 썼어: "${writingPrompt}"

[학생이 직접 고른 것]
- 스스로 평가한 내 글: ${SELF_TEXT[selfLevel]}
- 피드백받고 싶은 부분: ${isAll ? "전체적으로" : focus.map((f) => FOCUS_TEXT[f]).filter(Boolean).join(", ")}
- 피드백 방식: ${depth === "concrete" ? "구체적으로 (방법도 알려 주세요)" : "힌트 질문만 (스스로 생각해 볼래요)"}

[할 일 1 — 글의 수준 판단]
글을 읽고 "ai_level"을 "low" | "mid" | "high" 중 하나로 정해. 글자 수가 아니라 구체성(장면, 이유, 느낌, 새로 알게 된 점)과 표현의 풍부함으로 판단하고, 애매하면 "mid"로 해. 짧게 쓰는 학생이라고 생각이 얕다고 단정하지 마.
이 판단은 교사만 보는 정보야. 학생에게 "수준이 낮다/높다"는 말은 절대 하지 마. "level_reason"에 교사가 볼 근거를 한 문장으로 적어.

[할 일 2 — 수준에 맞는 피드백]
- low: 질문을 쉽고 구체적으로, 한 번에 한 가지씩. 학생이 바로 대답할 수 있는 작은 질문으로 해. (예: "누가 제일 먼저 넘어졌어?", "그때 손과 발은 어땠어?") 칭찬도 어느 문장이 좋았는지 콕 집어서 해.
- mid: 내용·구성 쪽 질문 1~2개로 한 걸음 더 나아가게 해.
- high: 질문은 줄이고, 글을 한 단계 끌어올릴 표현 방법(비유, 소리·감각 표현, 대화 넣기, 장면 쪼개기, 마무리의 여운 등)을 제안해.
- 학생이 스스로 평가한 수준과 네 판단이 달라도 학생을 깎아내리지 마. 높게 골랐는데 글이 아직 간단하면 "도전하는 마음이 멋져요"라고 하고 작은 다음 걸음을 알려 줘. 낮게 골랐는데 잘 썼다면 "생각보다 훨씬 잘 썼어요"라고 용기를 줘. 실제 글에 맞게 도와줘.

[규칙]
- 절대로 고친 문장이나 정답을 대신 써주지 마.
- 이 활동에서 특히 살펴볼 내용 관점: ${contentFocus}
${focusRule}
${depthRule}
${spellingRule}
- 먼저 학생 글에서 잘 쓴 표현이나 활동 목적에 맞는 부분을 한 가지 짚어서 다정하게 칭찬해.
- 어투는 다정하고 격려하는 5학년 눈높이 말투. 딱딱하거나 지적하는 말투는 피해.
- 글이 이미 아주 훌륭하면 질문을 억지로 만들지 말고 한두 개로 줄여.

오직 아래 JSON 형식으로만 답해. 코드블록 표시나 다른 설명은 절대 하지 마.
{
  "good_point": "좋은 점 한 가지를 다정한 말투로 1~2문장",
  "ai_level": "low" | "mid" | "high",
  "level_reason": "교사용 판단 근거 한 문장",
  "detective_feedback": [
    {"category": "처음" | "내용" | "구성" | "표현" | "마무리", "question": "질문형 피드백 문장", "ideas": ["시도해 볼 방법", "..."]}
  ],
  "copyedit_fixes": ["- '됬다' → '됐다'로 고쳐주세요. 와 같은 형식의 문자열", "..."]
}
${previousBlock}
학생이 이번에 제출한 글:
"""
${studentText}
"""`;
}
