// 선생님 화면의 분석 탭 네 가지입니다.
// 학생 글을 고치지 않고 "보기"만 합니다. 다만 '반영 추적' 탭에서 선생님의 판정은 저장됩니다.
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, X as XIcon, Save } from "lucide-react";
import { PALETTE, CATEGORY_STYLE } from "../palette.js";
import { ALL_FOCUS_LABELS, DEPTH_OPTIONS, SELF_LEVEL_LABEL, AI_LEVEL_LABEL } from "../data/feedbackOptions.js";
import {
  countChars,
  changeSummary,
  diffWords,
  trackRounds,
  summarize,
  studentLabel,
  compareStudents,
  markKey,
  MARK_LABEL,
} from "../lib/analyze.js";
import { saveTeacherMarks } from "../services/submissions.js";

/* ── 공통 조각 ─────────────────────────────── */

const card = { backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` };

function Box({ title, right, children }) {
  return (
    <section className="rounded-lg p-4 mb-4" style={card}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && (
            <h3 className="text-sm font-bold" style={{ color: PALETTE.text }}>
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Empty({ children }) {
  return (
    <p className="text-sm py-8 text-center" style={{ color: PALETTE.textMuted }}>
      {children}
    </p>
  );
}

function submissionTitle(s) {
  const when = s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "";
  const rounds = Array.isArray(s.versions) ? s.versions.length : 0;
  const status = s.status === "completed" ? "완성" : "쓰는 중";
  return `${studentLabel(s)} · ${s.activityLabel || "코너 없음"} · ${rounds}회차 · ${status}${when ? ` · ${when}` : ""}`;
}

// 학생 글 하나를 고르는 드롭다운입니다. 번호순으로 줄 세웁니다.
function Picker({ submissions, value, onChange }) {
  const sorted = useMemo(() => [...submissions].sort(compareStudents), [submissions]);
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-md text-sm border"
      style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
    >
      <option value="">학생 글을 고르세요</option>
      {sorted.map((s) => (
        <option key={s.id} value={s.id}>
          {submissionTitle(s)}
        </option>
      ))}
    </select>
  );
}

// 고른 글이 없을 때 첫 번째 글을 자동으로 고릅니다.
function useSelected(submissions) {
  const [id, setId] = useState("");
  useEffect(() => {
    if (submissions.length === 0) {
      setId("");
      return;
    }
    if (!submissions.some((s) => s.id === id)) {
      setId([...submissions].sort(compareStudents)[0].id);
    }
  }, [submissions, id]);
  return [submissions.find((s) => s.id === id) || null, id, setId];
}

function optionLine(opts) {
  if (!opts) return "주문서 기록 없음";
  const focus = (Array.isArray(opts.focus) ? opts.focus : [])
    .map((f) => ALL_FOCUS_LABELS.find((x) => x.id === f)?.label || f)
    .join(", ");
  const depth = DEPTH_OPTIONS.find((d) => d.id === opts.depth)?.label || "";
  return [SELF_LEVEL_LABEL[opts.selfLevel], focus, depth].filter(Boolean).join(" · ");
}

function Pill({ children, bg, fg }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color: fg }}>
      {children}
    </span>
  );
}

/* ── 1. 학생별 흐름 ─────────────────────────── */

export function FlowView({ submissions }) {
  const [sub, id, setId] = useSelected(submissions);
  if (submissions.length === 0) return <Empty>아직 제출된 글이 없어요.</Empty>;

  const versions = sub && Array.isArray(sub.versions) ? sub.versions : [];

  return (
    <div>
      <div className="mb-4">
        <Picker submissions={submissions} value={id} onChange={setId} />
      </div>

      {!sub ? (
        <Empty>학생 글을 골라 주세요.</Empty>
      ) : (
        <>
          <p className="text-xs mb-4" style={{ color: PALETTE.textMuted }}>
            회차를 시간순으로 봅니다. 학생이 주문서에서 무엇을 골랐고, 어떤 질문을 받았고, 그중 무엇을 고쳐 보겠다고
            했는지 함께 나옵니다.
          </p>

          {versions.map((v, i) => {
            const prev = i > 0 ? versions[i - 1] : null;
            const delta = prev ? countChars(v.text) - countChars(prev.text) : null;
            const questions = Array.isArray(v.feedback?.detective_feedback) ? v.feedback.detective_feedback : [];
            const items = v.plan && Array.isArray(v.plan.items) ? v.plan.items : [];
            return (
              <Box
                key={i}
                title={`${i + 1}회차`}
                right={
                  <span className="text-xs" style={{ color: PALETTE.textMuted }}>
                    {countChars(v.text)}자
                    {delta !== null && (
                      <b style={{ color: delta >= 0 ? PALETTE.content : PALETTE.signal }}>
                        {" "}
                        ({delta >= 0 ? "+" : ""}
                        {delta})
                      </b>
                    )}
                    {v.feedback?.ai_level ? ` · AI 판단 ${AI_LEVEL_LABEL[v.feedback.ai_level]}` : ""}
                  </span>
                }
              >
                <div className="rounded-md px-3 py-2 mb-3 text-xs" style={{ backgroundColor: PALETTE.paperDeep, color: PALETTE.text }}>
                  <b>주문서</b> · {optionLine(v.feedback?.options)}
                  {v.feedback?.options?.topic ? <div>질문의 주제: {v.feedback.options.topic}</div> : null}
                  {v.feedback?.options?.note ? <div>편집자에게 한마디: “{v.feedback.options.note}”</div> : null}
                </div>

                <p
                  className="text-sm leading-7 whitespace-pre-wrap rounded-md px-3 py-2 mb-3"
                  style={{ color: PALETTE.text, backgroundColor: PALETTE.paper }}
                >
                  {v.text}
                </p>

                {questions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-bold mb-1.5" style={{ color: PALETTE.textMuted }}>
                      AI가 한 질문
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {questions.map((q, k) => {
                        const chosen = items[k]?.will;
                        const style = CATEGORY_STYLE[q.category] || { bg: PALETTE.paperDeep, fg: PALETTE.text };
                        return (
                          <li key={k} className="text-xs leading-relaxed flex items-start gap-2">
                            <Pill bg={style.bg} fg={style.fg}>{q.category}</Pill>
                            <span style={{ color: PALETTE.text }}>
                              {q.question}
                              {chosen && (
                                <b style={{ color: PALETTE.gold }}> ← 고쳐 볼래요</b>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {v.plan?.note && (
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>
                    고치기 계획 메모: {v.plan.note}
                  </p>
                )}
                {!v.plan && i < versions.length - 1 && (
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>
                    고치기 계획을 고르지 않고 바로 다시 썼어요.
                  </p>
                )}
              </Box>
            );
          })}

          {sub.reflection && (sub.reflection.changed || sub.reflection.next) && (
            <Box title="마무리 돌아보기">
              {sub.reflection.changed && (
                <p className="text-sm mb-1" style={{ color: PALETTE.text }}>
                  · {sub.reflection.changedLabel || "달라진 곳"}: {sub.reflection.changed}
                </p>
              )}
              {sub.reflection.next && (
                <p className="text-sm" style={{ color: PALETTE.text }}>
                  · 다음에 해 보고 싶은 것: {sub.reflection.next}
                </p>
              )}
            </Box>
          )}
        </>
      )}
    </div>
  );
}

/* ── 2. 글 변화 비교 ─────────────────────────── */

export function DiffView({ submissions }) {
  const [sub, id, setId] = useSelected(submissions);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(1);
  const [mode, setMode] = useState("marked"); // marked = 변화 표시, side = 나란히

  const versions = sub && Array.isArray(sub.versions) ? sub.versions : [];

  useEffect(() => {
    setLeft(0);
    setRight(versions.length > 1 ? versions.length - 1 : 0);
  }, [id, versions.length]);

  if (submissions.length === 0) return <Empty>아직 제출된 글이 없어요.</Empty>;

  const a = versions[left];
  const b = versions[right];
  const summary = a && b ? changeSummary(a.text, b.text) : null;
  const diff = a && b ? diffWords(a.text, b.text) : null;

  const roundSelect = (value, onChange, label) => (
    <label className="text-xs flex items-center gap-1.5" style={{ color: PALETTE.textMuted }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1 rounded-md text-xs border"
        style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
      >
        {versions.map((_, i) => (
          <option key={i} value={i}>{i + 1}회차</option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="mb-4">
        <Picker submissions={submissions} value={id} onChange={setId} />
      </div>

      {!sub ? (
        <Empty>학생 글을 골라 주세요.</Empty>
      ) : versions.length < 2 ? (
        <Empty>이 학생은 아직 한 번만 써서 비교할 회차가 없어요.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {roundSelect(left, setLeft, "이전")}
            {roundSelect(right, setRight, "나중")}
            <div className="flex gap-1 ml-auto">
              {[["marked", "변화 표시"], ["side", "나란히 보기"]].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className="px-3 py-1 rounded-md text-xs font-bold"
                  style={{
                    backgroundColor: mode === k ? PALETTE.ink : "white",
                    color: mode === k ? PALETTE.paper : PALETTE.textMuted,
                    border: `1px solid ${PALETTE.paperDeep}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {summary && (
            <Box title="무엇이 달라졌나">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" style={{ color: PALETTE.text }}>
                <div>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>글자 수</p>
                  <p className="font-bold">
                    {summary.prevChars} → {summary.nextChars}
                    <span style={{ color: summary.charDelta >= 0 ? PALETTE.content : PALETTE.signal }}>
                      {" "}
                      ({summary.charDelta >= 0 ? "+" : ""}
                      {summary.charDelta})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>문장 수</p>
                  <p className="font-bold">{summary.prevSentences} → {summary.nextSentences}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>새로 쓴 문장</p>
                  <p className="font-bold" style={{ color: PALETTE.content }}>{summary.added.length}개</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>빠진 문장</p>
                  <p className="font-bold" style={{ color: PALETTE.signal }}>{summary.removed.length}개</p>
                </div>
              </div>
              {summary.tooLong && (
                <p className="text-xs mt-3" style={{ color: PALETTE.signal }}>
                  글이 아주 길어서 낱말 단위 표시는 건너뛰었어요. 나란히 보기로 확인해 주세요.
                </p>
              )}
            </Box>
          )}

          {mode === "marked" && diff && !diff.tooLong && (
            <Box title={`${left + 1}회차 → ${right + 1}회차`}>
              <p className="text-xs mb-3" style={{ color: PALETTE.textMuted }}>
                <span style={{ backgroundColor: "#E5EEDD", color: PALETTE.content }}>초록색</span>은 새로 쓴 곳,{" "}
                <span style={{ backgroundColor: "#F3E3E1", color: PALETTE.signal, textDecoration: "line-through" }}>
                  빨간색
                </span>
                은 지운 곳이에요.
              </p>
              <p className="text-sm leading-8 whitespace-pre-wrap" style={{ color: PALETTE.text }}>
                {diff.parts.map((part, i) =>
                  part.type === "same" ? (
                    <span key={i}>{part.text}</span>
                  ) : part.type === "ins" ? (
                    <span key={i} style={{ backgroundColor: "#E5EEDD", color: PALETTE.content, fontWeight: 700 }}>
                      {part.text}
                    </span>
                  ) : (
                    <span
                      key={i}
                      style={{ backgroundColor: "#F3E3E1", color: PALETTE.signal, textDecoration: "line-through" }}
                    >
                      {part.text}
                    </span>
                  )
                )}
              </p>
            </Box>
          )}

          {(mode === "side" || (diff && diff.tooLong)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Box title={`${left + 1}회차 (${countChars(a.text)}자)`}>
                <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: PALETTE.text }}>{a.text}</p>
              </Box>
              <Box title={`${right + 1}회차 (${countChars(b.text)}자)`}>
                <p className="text-sm leading-7 whitespace-pre-wrap" style={{ color: PALETTE.text }}>{b.text}</p>
              </Box>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── 3. 피드백 반영 추적 ─────────────────────── */

export function TrackView({ submissions, onSaved }) {
  const [sub, id, setId] = useSelected(submissions);
  const [marks, setMarks] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMarks((sub && sub.teacherMarks) || {});
    setDirty(false);
    setMessage("");
  }, [id, sub]);

  if (submissions.length === 0) return <Empty>아직 제출된 글이 없어요.</Empty>;

  const rounds = sub ? trackRounds(sub) : [];

  function setMark(key, value) {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
    setDirty(true);
    setMessage("");
  }

  async function save() {
    if (!sub || saving) return;
    setSaving(true);
    try {
      await saveTeacherMarks({ submissionId: sub.id, marks });
      setDirty(false);
      setMessage("저장했어요.");
      if (onSaved) onSaved(sub.id, marks);
    } catch (e) {
      setMessage("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const markButton = (key, value, Icon, label, color) => (
    <button
      onClick={() => setMark(key, value)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold"
      style={{
        backgroundColor: marks[key] === value ? color : "white",
        color: marks[key] === value ? "white" : PALETTE.textMuted,
        border: `1px solid ${marks[key] === value ? color : PALETTE.paperDeep}`,
      }}
    >
      <Icon size={12} /> {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4">
        <Picker submissions={submissions} value={id} onChange={setId} />
      </div>

      {!sub ? (
        <Empty>학생 글을 골라 주세요.</Empty>
      ) : (
        <>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: PALETTE.textMuted }}>
            학생이 "고쳐 볼래요"로 고른 질문과, 그다음 회차에서 실제로 달라진 문장을 함께 봅니다. 기계는 어떤 질문이
            반영됐는지 정확히 알 수 없으므로, <b>판정은 선생님이</b> 눌러 주세요. 판정한 내용은 '학급 전체 요약'의
            반영률에 반영됩니다.
          </p>

          {rounds.every((r) => r.chosen.length === 0) && (
            <Empty>이 글에서는 "고쳐 볼래요"로 고른 질문이 없어요.</Empty>
          )}

          {rounds.map((r) =>
            r.chosen.length === 0 ? null : (
              <Box key={r.index} title={`${r.index + 1}회차에서 고른 질문 → ${r.next ? `${r.index + 2}회차 변화` : "다음 회차 없음"}`}>
                <ul className="flex flex-col gap-3 mb-4">
                  {r.chosen.map((it) => {
                    const key = markKey(r.index, it.itemIndex);
                    const style = CATEGORY_STYLE[it.category] || { bg: PALETTE.paperDeep, fg: PALETTE.text };
                    return (
                      <li key={key} className="rounded-md px-3 py-2.5" style={{ backgroundColor: PALETTE.paper }}>
                        <p className="text-xs leading-relaxed mb-2 flex items-start gap-2">
                          <Pill bg={style.bg} fg={style.fg}>{it.category}</Pill>
                          <span style={{ color: PALETTE.text }}>{it.question}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {markButton(key, "yes", Check, MARK_LABEL.yes, PALETTE.content)}
                          {markButton(key, "partial", Minus, MARK_LABEL.partial, PALETTE.gold)}
                          {markButton(key, "no", XIcon, MARK_LABEL.no, PALETTE.signal)}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {r.planNote && (
                  <p className="text-xs mb-3" style={{ color: PALETTE.textMuted }}>
                    학생의 고치기 계획 메모: {r.planNote}
                  </p>
                )}

                {r.change ? (
                  <div className="rounded-md px-3 py-2.5 text-xs" style={{ backgroundColor: PALETTE.paperDeep }}>
                    <p className="font-bold mb-1.5" style={{ color: PALETTE.text }}>
                      다음 회차에서 달라진 곳 (판정에 참고하세요)
                    </p>
                    <p className="mb-2" style={{ color: PALETTE.textMuted }}>
                      글자 {r.change.prevChars} → {r.change.nextChars} ({r.change.charDelta >= 0 ? "+" : ""}
                      {r.change.charDelta}자) · 새 문장 {r.change.added.length}개 · 빠진 문장 {r.change.removed.length}개
                    </p>
                    {r.change.added.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {r.change.added.slice(0, 6).map((s, k) => (
                          <li key={k} style={{ color: PALETTE.content }}>+ {s}</li>
                        ))}
                        {r.change.added.length > 6 && (
                          <li style={{ color: PALETTE.textMuted }}>… 그 밖에 {r.change.added.length - 6}문장</li>
                        )}
                      </ul>
                    ) : (
                      <p style={{ color: PALETTE.signal }}>새로 쓴 문장이 없어요. 낱말만 손봤거나 그대로 냈을 수 있어요.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>
                    아직 다음 회차를 쓰지 않아서 비교할 글이 없어요.
                  </p>
                )}
              </Box>
            )
          )}

          {rounds.some((r) => r.chosen.length > 0) && (
            <div className="flex items-center gap-3 sticky bottom-0 py-3" style={{ backgroundColor: PALETTE.paper }}>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: dirty && !saving ? 1 : 0.35 }}
              >
                <Save size={14} /> {saving ? "저장 중..." : "판정 저장하기"}
              </button>
              {message && (
                <span className="text-xs font-bold" style={{ color: PALETTE.copyedit }}>{message}</span>
              )}
              {dirty && !message && (
                <span className="text-xs" style={{ color: PALETTE.signal }}>저장하지 않은 판정이 있어요.</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── 4. 학급 전체 요약 ──────────────────────── */

function Bar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="shrink-0 text-right" style={{ width: 120, color: PALETTE.text }}>{label}</span>
      <span className="flex-1 rounded-full h-2.5" style={{ backgroundColor: PALETTE.paperDeep }}>
        <span className="block h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: PALETTE.gold }} />
      </span>
      <span className="shrink-0 font-bold" style={{ width: 36, color: PALETTE.textMuted }}>{count}</span>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-lg px-4 py-3" style={card}>
      <p className="text-xs mb-1" style={{ color: PALETTE.textMuted }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: PALETTE.text }}>{value}</p>
      {note && <p className="text-xs mt-0.5" style={{ color: PALETTE.textMuted }}>{note}</p>}
    </div>
  );
}

export function SummaryView({ submissions }) {
  const s = useMemo(() => summarize(submissions), [submissions]);
  if (submissions.length === 0) return <Empty>아직 제출된 글이 없어요.</Empty>;

  const maxFocus = s.focusRank.length ? s.focusRank[0].count : 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="글 편수" value={`${s.submissionCount}편`} note={`학생 ${s.studentCount}명`} />
        <Stat label="전체 회차" value={`${s.versionTotal}회`} note={`한 편당 평균 ${s.avgRounds.toFixed(1)}회`} />
        <Stat label="끝까지 마친 글" value={`${s.completed}편`} note={`돌아보기 쓴 글 ${s.reflectionWritten}편`} />
        <Stat
          label="피드백 반영률"
          value={s.marks.rate === null ? "판정 전" : `${s.marks.rate}%`}
          note={`판정 ${s.marks.judged}개 / 고른 질문 ${s.marks.chosenTotal}개`}
        />
      </div>

      {s.growth && (
        <Box title="두 번 이상 고쳐 쓴 글의 길이 변화">
          <p className="text-sm" style={{ color: PALETTE.text }}>
            처음 평균 <b>{Math.round(s.growth.first)}자</b> → 마지막 평균{" "}
            <b style={{ color: PALETTE.content }}>{Math.round(s.growth.last)}자</b>{" "}
            <span style={{ color: PALETTE.textMuted }}>({s.growth.samples}편 기준)</span>
          </p>
          <p className="text-xs mt-1" style={{ color: PALETTE.textMuted }}>
            길이는 글이 좋아졌는지를 말해 주지 않습니다. 얼마나 손을 댔는지 보는 눈금으로만 봐 주세요.
          </p>
        </Box>
      )}

      <Box title="코너별 참여">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: PALETTE.textMuted }}>
              <th className="text-left font-normal text-xs pb-2">코너</th>
              <th className="text-right font-normal text-xs pb-2">글 편수</th>
              <th className="text-right font-normal text-xs pb-2">학생 수</th>
              <th className="text-right font-normal text-xs pb-2">전체 회차</th>
            </tr>
          </thead>
          <tbody>
            {s.activities.map((a) => (
              <tr key={a.label} className="border-t" style={{ borderColor: PALETTE.paperDeep }}>
                <td className="py-2" style={{ color: PALETTE.text }}>{a.label}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{a.count}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{a.students}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{a.rounds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <Box title="학생들이 많이 고른 '받고 싶은 부분'">
        {s.focusRank.length === 0 ? (
          <p className="text-sm" style={{ color: PALETTE.textMuted }}>주문서 기록이 아직 없어요.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {s.focusRank.map((f) => (
              <Bar key={f.id} label={f.label} count={f.count} max={maxFocus} />
            ))}
          </div>
        )}
      </Box>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Box title="알려 주는 방법">
          {s.depthRank.length === 0 ? (
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>기록 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s.depthRank.map((d) => (
                <Bar key={d.id} label={d.label} count={d.count} max={s.depthRank[0].count} />
              ))}
            </div>
          )}
        </Box>
        <Box title="스스로 생각한 단계">
          {s.selfLevelRank.length === 0 ? (
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>기록 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {s.selfLevelRank.map((d) => (
                <Bar key={d.id} label={d.label} count={d.count} max={s.selfLevelRank[0].count} />
              ))}
            </div>
          )}
        </Box>
      </div>

      <Box title="학생별 현황">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: PALETTE.textMuted }}>
              <th className="text-left font-normal text-xs pb-2">학생</th>
              <th className="text-right font-normal text-xs pb-2">글 편수</th>
              <th className="text-right font-normal text-xs pb-2">전체 회차</th>
              <th className="text-right font-normal text-xs pb-2">마친 글</th>
              <th className="text-right font-normal text-xs pb-2">고른 질문</th>
            </tr>
          </thead>
          <tbody>
            {s.students.map((st) => (
              <tr key={st.key} className="border-t" style={{ borderColor: PALETTE.paperDeep }}>
                <td className="py-2" style={{ color: PALETTE.text }}>
                  {st.studentNo ? `${st.studentNo}번 ` : ""}
                  {st.studentName}
                </td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{st.submissions}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{st.rounds}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{st.completed}</td>
                <td className="py-2 text-right" style={{ color: PALETTE.text }}>{st.chosen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <p className="text-xs leading-relaxed" style={{ color: PALETTE.textMuted }}>
        반영률은 '피드백 반영 추적' 탭에서 선생님이 직접 누른 판정만 세어 계산합니다. '반영함'은 1개, '조금 반영'은
        0.5개로 셉니다. 아직 판정하지 않은 {s.marks.unjudged}개는 계산에 넣지 않았습니다.
      </p>
    </div>
  );
}
