import { Sparkles, Search, CheckCircle2 } from "lucide-react";
import { PALETTE, CATEGORY_STYLE } from "../palette.js";
import { ALL_FOCUS_LABELS, DEPTH_OPTIONS, AI_LEVEL_LABEL, SELF_LEVEL_LABEL } from "../data/feedbackOptions.js";

export default function FeedbackView({ feedback, showLevel = false }) {
  const detectiveFeedback = Array.isArray(feedback.detective_feedback) ? feedback.detective_feedback : [];
  const copyeditFixes = Array.isArray(feedback.copyedit_fixes) ? feedback.copyedit_fixes : [];

  return (
    <div className="flex flex-col gap-4">
      {showLevel && (feedback.ai_level || feedback.options) && (
        <div className="rounded-md px-4 py-2.5 text-xs" style={{ backgroundColor: PALETTE.paperDeep, color: PALETTE.text }}>
          <b>교사용</b> · 자기평가: {SELF_LEVEL_LABEL[feedback.options?.selfLevel] || "-"} · AI 판단:{" "}
          <b>{AI_LEVEL_LABEL[feedback.ai_level] || "-"}</b>
          {feedback.level_reason ? ` — ${feedback.level_reason}` : ""}
        </div>
      )}
      {feedback.options && (
        <p className="text-xs" style={{ color: PALETTE.textMuted }}>
          내가 고른 것:{" "}
          {(feedback.options.focus || ["all"])
            .map((id) => ALL_FOCUS_LABELS.find((f) => f.id === id)?.label)
            .filter(Boolean)
            .join(", ")}{" "}
          · {DEPTH_OPTIONS.find((d) => d.id === feedback.options.depth)?.label || "힌트 질문만"}
          {feedback.options.topic ? (
            <>
              <br />
              질문의 주제: {feedback.options.topic}
            </>
          ) : null}
          {feedback.options.note ? (
            <>
              <br />
              편집자에게 한 말: “{feedback.options.note}”
            </>
          ) : null}
        </p>
      )}
      <div
        className="rounded-lg p-5"
        style={{ backgroundColor: PALETTE.goldSoft + "55", border: `1px solid ${PALETTE.goldSoft}` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} style={{ color: PALETTE.gold }} />
          <span className="text-xs font-bold tracking-wide" style={{ color: PALETTE.ink }}>
            좋았던 점
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: PALETTE.text }}>
          {feedback.good_point}
        </p>
      </div>

      {detectiveFeedback.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: PALETTE.detectiveSoft, border: `1px solid ${PALETTE.detective}33` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} style={{ color: PALETTE.detective }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: PALETTE.ink }}>
              {feedback.options?.corner === "question" ? "질문 코치" : "글 탐정"}
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {detectiveFeedback.map((item, i) => {
              const style = CATEGORY_STYLE[item.category] || CATEGORY_STYLE["표현"];
              return (
                <li key={i} className="flex flex-col gap-1.5">
                  <span
                    className="self-start text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: style.bg, color: style.fg }}
                  >
                    {style.label}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: PALETTE.text }}>
                    {item.question}
                  </span>
                  {Array.isArray(item.ideas) && item.ideas.length > 0 && (
                    <ul
                      className="mt-1 ml-1 flex flex-col gap-1 rounded-md px-3 py-2 text-xs leading-relaxed"
                      style={{ backgroundColor: "white", color: PALETTE.textMuted }}
                    >
                      <li className="font-bold" style={{ color: PALETTE.ink }}>이렇게 해 볼 수 있어요</li>
                      {item.ideas.map((idea, j) => (
                        <li key={j}>• {idea}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {copyeditFixes.length > 0 && (
        <details
          className="rounded-lg p-5"
          style={{ backgroundColor: PALETTE.copyeditSoft, border: `1px solid ${PALETTE.copyedit}33` }}
        >
          <summary className="flex items-center gap-2 cursor-pointer select-none">
            <CheckCircle2 size={16} style={{ color: PALETTE.copyedit }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: PALETTE.ink }}>
              맞춤법 · 띄어쓰기 (눌러서 보기 — 내용을 먼저 고친 다음에 확인해요)
            </span>
          </summary>
          <ul className="flex flex-col gap-2 mt-3">
            {copyeditFixes.map((f, i) => (
              <li key={i} className="text-sm leading-relaxed" style={{ color: PALETTE.text }}>
                {f}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
