// 학생이 번호+이름으로 들어왔을 때 보는 "내 글 보관함"과 "내 글이 달라진 과정" 화면입니다.
import { ArrowRight, ChevronLeft, PenLine, History } from "lucide-react";
import { PALETTE, CATEGORY_STYLE } from "../palette.js";
import { countChars, diffWords } from "../lib/analyze.js";

function dateText(value) {
  if (!value) return "";
  const d = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
}

const card = { backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` };

export function MyWorkList({ studentName, submissions, onNew, onContinue, onHistory }) {
  return (
    <div className="pt-4">
      <h2 className="sayeon-serif text-xl font-bold mb-1" style={{ color: PALETTE.text }}>
        {studentName} 학생의 글 보관함
      </h2>
      <p className="text-sm mb-5" style={{ color: PALETTE.textMuted }}>
        쓰던 글은 이어서 고칠 수 있고, 내 글이 어떻게 달라졌는지도 볼 수 있어요.
      </p>

      <button
        onClick={onNew}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-bold mb-5"
        style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}
      >
        <PenLine size={15} /> 새 글 쓰기
      </button>

      <ul className="flex flex-col gap-3">
        {submissions.map((s) => {
          const versions = Array.isArray(s.versions) ? s.versions : [];
          const done = s.status === "completed";
          const last = versions[versions.length - 1];
          const preview = (s.draftText || last?.text || "").replace(/\s+/g, " ").slice(0, 60);
          return (
            <li key={s.id} className="rounded-lg p-4" style={card}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: PALETTE.text }}>
                  {s.activityLabel || "글"}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: done ? PALETTE.contentSoft || PALETTE.paperDeep : PALETTE.goldSoft + "55",
                    color: done ? PALETTE.content : PALETTE.text,
                  }}
                >
                  {done ? "완성" : "쓰는 중"}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: PALETTE.textMuted }}>
                {dateText(s.updatedAt)} · 피드백 {versions.length}번
                {s.draftText && !done ? " · 고쳐 쓰던 글 있음" : ""}
              </p>
              {preview && (
                <p className="text-xs leading-relaxed mb-3" style={{ color: PALETTE.text }}>
                  {preview}
                  {preview.length >= 60 ? "…" : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!done && (
                  <button
                    onClick={() => onContinue(s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold"
                    style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}
                  >
                    이어서 고쳐 쓰기 <ArrowRight size={13} />
                  </button>
                )}
                <button
                  onClick={() => onHistory(s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold border"
                  style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text, backgroundColor: "white" }}
                >
                  <History size={13} /> 달라진 과정 보기
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Diff({ prev, next }) {
  const { parts, tooLong } = diffWords(prev, next);
  if (tooLong) {
    return <p className="text-sm leading-8 whitespace-pre-wrap" style={{ color: PALETTE.text }}>{next}</p>;
  }
  return (
    <p className="text-sm leading-8 whitespace-pre-wrap" style={{ color: PALETTE.text }}>
      {parts.map((part, i) =>
        part.type === "same" ? (
          <span key={i}>{part.text}</span>
        ) : part.type === "ins" ? (
          <span key={i} style={{ backgroundColor: "#E5EEDD", color: PALETTE.content, fontWeight: 700 }}>
            {part.text}
          </span>
        ) : (
          <span key={i} style={{ backgroundColor: "#F3E3E1", color: PALETTE.signal, textDecoration: "line-through" }}>
            {part.text}
          </span>
        )
      )}
    </p>
  );
}

export function MyHistory({ submission, onBack, onContinue }) {
  const versions = Array.isArray(submission?.versions) ? submission.versions : [];
  const done = submission?.status === "completed";
  const first = versions[0];
  const last = versions[versions.length - 1];

  return (
    <div className="pt-2">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold mb-3" style={{ color: PALETTE.textMuted }}>
        <ChevronLeft size={14} /> 글 보관함으로
      </button>
      <h2 className="sayeon-serif text-xl font-bold mb-1" style={{ color: PALETTE.text }}>
        내 글이 달라진 과정
      </h2>
      <p className="text-sm mb-4" style={{ color: PALETTE.textMuted }}>
        {submission?.activityLabel} · 피드백 {versions.length}번
      </p>

      {versions.length > 1 && (
        <div className="rounded-md px-4 py-3 mb-4 text-sm" style={{ backgroundColor: PALETTE.paperDeep, color: PALETTE.text }}>
          처음 <b>{countChars(first.text)}자</b> → 지금 <b>{countChars(last.text)}자</b>. 초록색은 새로 쓴 곳, 빨간
          줄은 지운 곳이에요.
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {versions.map((v, i) => {
          const questions = Array.isArray(v.feedback?.detective_feedback) ? v.feedback.detective_feedback : [];
          const items = v.plan && Array.isArray(v.plan.items) ? v.plan.items : [];
          return (
            <li key={i} className="rounded-lg p-4" style={card}>
              <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>
                {i + 1}번째 글 <span className="text-xs font-normal" style={{ color: PALETTE.textMuted }}>· {dateText(v.submittedAt)} · {countChars(v.text)}자</span>
              </p>
              {i > 0 ? (
                <>
                  <p className="text-xs mb-1" style={{ color: PALETTE.textMuted }}>지난 글에서 달라진 곳</p>
                  <Diff prev={versions[i - 1].text} next={v.text} />
                </>
              ) : (
                <p className="text-sm leading-8 whitespace-pre-wrap" style={{ color: PALETTE.text }}>{v.text}</p>
              )}

              {questions.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: PALETTE.paperDeep }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: PALETTE.textMuted }}>편집자가 물어본 것</p>
                  <ul className="flex flex-col gap-1.5">
                    {questions.map((q, k) => {
                      const style = CATEGORY_STYLE[q.category] || { bg: PALETTE.paperDeep, fg: PALETTE.text };
                      const chosen = items[k]?.will;
                      return (
                        <li key={k} className="text-xs leading-relaxed flex items-start gap-2">
                          <span className="font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: style.bg, color: style.fg }}>
                            {q.category}
                          </span>
                          <span style={{ color: PALETTE.text }}>
                            {q.question}
                            {chosen && <b style={{ color: PALETTE.gold }}> ← 내가 고쳐 보기로 한 것</b>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {v.plan?.note && (
                    <p className="text-xs mt-2" style={{ color: PALETTE.textMuted }}>내 고치기 계획: {v.plan.note}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {done && submission.reflection && (submission.reflection.changed || submission.reflection.next) && (
        <div className="rounded-lg p-4 mt-4" style={card}>
          <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>마무리 돌아보기</p>
          {submission.reflection.changed && (
            <p className="text-sm mb-1" style={{ color: PALETTE.text }}>
              · {submission.reflection.changedLabel || "달라진 곳"}: {submission.reflection.changed}
            </p>
          )}
          {submission.reflection.next && (
            <p className="text-sm" style={{ color: PALETTE.text }}>· 다음에 해 보고 싶은 것: {submission.reflection.next}</p>
          )}
        </div>
      )}

      {!done && (
        <button
          onClick={() => onContinue(submission)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-bold mt-5"
          style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}
        >
          이어서 고쳐 쓰기 <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
