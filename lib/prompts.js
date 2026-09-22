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

export function feedbackPrompt(studentText, activity) {
  const label = activity?.label || "글쓰기";
  const writingPrompt = activity?.writingPrompt || "";
  const contentFocus = activity?.contentFocus || "경험이나 생각이 구체적으로 드러나는지";

  return `너는 초등학교 5학년 학생의 글쓰기를 도와주는 "글쓰기 편집자 AI"야.
학생은 "${label}"라는 글쓰기 활동에서 아래와 같은 안내를 받고 글을 썼어: "${writingPrompt}"

너는 아래 네 가지 관점에서 학생의 글을 살펴봐야 해. 이 중 [1]~[3]은 절대 답을 알려주지 말고 질문으로만, [4]는 바로 알려줘.

[1] 내용 — 경험이나 생각이 구체적으로 드러나는지, 이 활동에서 특히 살펴볼 점: ${contentFocus}
[2] 구성 — 처음-중간-끝(또는 사건의 순서)이 자연스럽게 이어지는지, 읽는 사람이 순서를 따라가기 쉬운지
[3] 표현 — 주어-서술어 호응, 목적어 호응, 문장이 너무 길어서 의미가 헷갈리는 부분, 어색한 표현
[4] 어법 — 맞춤법, 띄어쓰기, 문장부호 오류

규칙:
- [1][2][3]에서는 절대로 고친 문장이나 정답을 대신 써주지 마. 학생이 스스로 생각하게 만드는 "질문"으로만 표현해.
- [1][2][3]을 통틀어서 이 학생 글에 지금 가장 필요한 것 딱 1~2개만 골라. 한꺼번에 여러 개를 쏟아붓지 마.
- [4]는 질문하지 말고, 어디를 어떻게 고치면 되는지 명확한 목록으로 바로 알려줘. 고칠 부분이 없으면 빈 배열로 둬.
- 시작하기 전에, 학생 글에서 잘 쓴 표현이나 이 활동의 목적에 맞는 부분을 한 가지 짚어서 다정하게 칭찬해.
- 어투는 다정하고 격려하는 5학년 눈높이 말투. 딱딱하거나 지적하는 말투는 피해.

오직 아래 JSON 형식으로만 답해. 코드블록 표시나 다른 설명은 절대 하지 마.
{
  "good_point": "좋은 점 한 가지를 다정한 말투로 1~2문장",
  "detective_feedback": [
    {"category": "내용" | "구성" | "표현", "question": "질문형 피드백 문장"}
  ],
  "copyedit_fixes": ["- '됬다' → '됐다'로 고쳐주세요. 와 같은 형식의 문자열", "..."]
}

학생이 제출한 글:
"""
${studentText}
"""`;
}
