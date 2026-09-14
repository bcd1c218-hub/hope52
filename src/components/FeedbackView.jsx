import { Sparkles, Search, CheckCircle2 } from "lucide-react";
import { PALETTE, CATEGORY_STYLE } from "../palette.js";

export default function FeedbackView({ feedback }) {
  const detectiveFeedback = Array.isArray(feedback.detective_feedback) ? feedback.detective_feedback : [];
  const copyeditFixes = Array.isArray(feedback.copyedit_fixes) ? feedback.copyedit_fixes : [];

  return (
    <div className="flex flex-col gap-4">
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
              글 탐정
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
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {copyeditFixes.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: PALETTE.copyeditSoft, border: `1px solid ${PALETTE.copyedit}33` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} style={{ color: PALETTE.copyedit }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: PALETTE.ink }}>
              맞춤법 · 띄어쓰기
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {copyeditFixes.map((f, i) => (
              <li key={i} className="text-sm leading-relaxed" style={{ color: PALETTE.text }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
