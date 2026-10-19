import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Printer, X, ChevronRight, Trash2 } from "lucide-react";
import { PALETTE } from "../palette.js";
import { fetchAllSubmissions } from "../services/submissions.js";
import { fetchCustomActivities, saveCustomActivity, deleteCustomActivity } from "../services/customActivities.js";
import { DEFAULT_ACTIVITIES } from "../data/activities.js";
import { AI_LEVEL_LABEL, SELF_LEVEL_LABEL } from "../data/feedbackOptions.js";
import FeedbackView from "./FeedbackView.jsx";

function formatTime(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TeacherDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("records");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllSubmissions();
      setSubmissions(data);
    } catch (e) {
      setLoadError(e.message || "목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activityOptions = useMemo(() => {
    const set = new Set(submissions.map((s) => s.activityLabel).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [submissions]);

  const filtered = useMemo(() => {
    if (activityFilter === "all") return submissions;
    return submissions.filter((s) => s.activityLabel === activityFilter);
  }, [submissions, activityFilter]);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: PALETTE.paper }}>
      <div className="w-full flex justify-center no-print" style={{ backgroundColor: PALETTE.ink }}>
        <div className="w-full max-w-4xl flex items-center justify-between px-5 py-3.5">
          <span className="sayeon-serif text-sm font-bold" style={{ color: PALETTE.paper }}>
            교사 취합 화면
          </span>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: PALETTE.goldSoft }}>
            <RefreshCcw size={13} /> 새로고침
          </button>
        </div>
      </div>

      <div className="w-full flex justify-center no-print" style={{ backgroundColor: PALETTE.paperDeep }}>
        <div className="w-full max-w-4xl flex gap-1 px-5 pt-2">
          {[
            ["records", "학생 제출 기록"],
            ["corners", "코너 관리"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-4 py-2 text-sm font-bold rounded-t-md"
              style={{
                backgroundColor: tab === id ? PALETTE.paper : "transparent",
                color: tab === id ? PALETTE.ink : PALETTE.textMuted,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "corners" && <CornerManager />}

      <div className="w-full max-w-4xl mx-auto px-5 py-8" style={{ display: tab === "records" ? "block" : "none" }}>
        {loadError && (
          <p className="text-sm mb-4" style={{ color: PALETTE.signal }}>{loadError}</p>
        )}

        <div className="flex items-center gap-2 mb-4 no-print">
          <span className="text-xs font-bold" style={{ color: PALETTE.textMuted }}>코너 필터</span>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-md border"
            style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
          >
            {activityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt === "all" ? "전체" : opt}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: PALETTE.textMuted }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm" style={{ color: PALETTE.textMuted }}>아직 제출된 글이 없어요.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: PALETTE.paperDeep }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: PALETTE.paperDeep }}>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>학생</th>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>코너</th>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>상태</th>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>제출 횟수</th>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>자기평가 / AI판단</th>
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>마지막 수정</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>{s.studentName}</td>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>
                      {s.activityId === "question" && <span className="mr-1">❓</span>}
                      {s.activityLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={
                          s.status === "completed"
                            ? { backgroundColor: PALETTE.copyeditSoft, color: PALETTE.copyedit }
                            : { backgroundColor: PALETTE.detectiveSoft, color: PALETTE.detective }
                        }
                      >
                        {s.status === "completed" ? "완성" : "진행중"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>{(s.versions || []).length}회</td>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>
                      {(() => {
                        const last = (s.versions || [])[(s.versions || []).length - 1]?.feedback;
                        return `${SELF_LEVEL_LABEL[last?.options?.selfLevel] || "-"} / ${AI_LEVEL_LABEL[last?.ai_level] || "-"}`;
                      })()}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.textMuted }}>{formatTime(s.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setSelected(s)} className="flex items-center gap-1 text-xs font-bold" style={{ color: PALETTE.gold }}>
                        자세히 <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto py-10 px-4" style={{ backgroundColor: "rgba(38,34,29,0.5)" }}>
          <div className="w-full max-w-xl rounded-lg p-6" style={{ backgroundColor: PALETTE.paper }}>
            <div className="flex items-start justify-between mb-4 no-print">
              <div>
                <h2 className="sayeon-serif text-lg font-bold" style={{ color: PALETTE.text }}>
                  {selected.studentName} · {selected.activityLabel}
                </h2>
                <p className="text-xs" style={{ color: PALETTE.textMuted }}>
                  총 {(selected.versions || []).length}회 제출 · {selected.status === "completed" ? "완성" : "진행중"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="flex items-center gap-1 text-xs font-bold" style={{ color: PALETTE.textMuted }}>
                  <Printer size={14} /> 인쇄
                </button>
                <button onClick={() => setSelected(null)}>
                  <X size={18} style={{ color: PALETTE.textMuted }} />
                </button>
              </div>
            </div>

            {selected.reflection && (selected.reflection.changed || selected.reflection.next) && (
              <div className="rounded-lg p-4 mb-4 text-sm leading-relaxed" style={{ backgroundColor: PALETTE.goldSoft + "55", color: PALETTE.text }}>
                <p className="text-xs font-bold mb-1" style={{ color: PALETTE.gold }}>학생 성찰</p>
                {selected.reflection.changed && <p>· {selected.reflection.changedLabel || "달라진 점"}: {selected.reflection.changed}</p>}
                {selected.reflection.next && <p>· 다음에 해 보고 싶은 것: {selected.reflection.next}</p>}
              </div>
            )}
            {selected.activityId === "question" && (selected.versions || []).length > 1 && (
              <div className="rounded-lg p-4 mb-4 text-sm leading-relaxed" style={{ backgroundColor: "white", color: PALETTE.text, border: `1px solid ${PALETTE.paperDeep}` }}>
                <p className="text-xs font-bold mb-2" style={{ color: PALETTE.gold }}>❓ 질문의 변화 (1차 → 최근)</p>
                <p><b>1차</b> · {selected.versions[0].text}</p>
                <p className="mt-1"><b>{selected.versions.length}차</b> · {selected.versions[selected.versions.length - 1].text}</p>
              </div>
            )}
            <div className="flex flex-col gap-6">
              {(selected.versions || []).map((v, i) => (
                <div key={i} className="border-t pt-4" style={{ borderColor: PALETTE.paperDeep }}>
                  <p className="text-xs font-bold mb-2" style={{ color: PALETTE.gold }}>
                    {i + 1}번째 {selected.activityId === "question" ? "질문" : "원고"} · {new Date(v.submittedAt).toLocaleString("ko-KR")}
                  </p>
                  <p className="text-sm leading-7 whitespace-pre-wrap mb-3 sayeon-serif" style={{ color: PALETTE.text }}>
                    {v.text}
                  </p>
                  {v.feedback && <FeedbackView feedback={v.feedback} showLevel />}
                  {v.plan && ((v.plan.items || []).some((it) => it.will) || v.plan.note) && (
                    <div className="mt-3 rounded-md px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "white", color: PALETTE.text }}>
                      <p className="font-bold mb-1" style={{ color: PALETTE.gold }}>학생의 고치기 계획</p>
                      {(v.plan.items || []).filter((it) => it.will).map((it, k) => (
                        <p key={k}>· ({it.category}) {it.question}</p>
                      ))}
                      {v.plan.note && <p>· {v.plan.note}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sameCorner(a, b) {
  return (
    (a.label || "").trim() === (b.label || "").trim() &&
    (a.writingPrompt || "").trim() === (b.writingPrompt || "").trim() &&
    (a.contentFocus || "").trim() === (b.contentFocus || "").trim()
  );
}

function friendlyError(e) {
  const msg = String(e?.code || e?.message || e);
  if (msg.includes("permission")) {
    return "삭제 권한이 없어요. Firebase 규칙에서 customActivities의 삭제(delete)를 허용해 주세요. (안내문 참고)";
  }
  return e?.message || "처리하지 못했어요. 잠시 뒤 다시 해 주세요.";
}

// 선생님 전용: 자유 코너를 만들고 지우는 화면입니다. (학생 화면에는 나오지 않아요)
function CornerManager() {
  const [corners, setCorners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCorners(await fetchCustomActivities());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const duplicateIds = useMemo(() => {
    const ids = [];
    corners.forEach((c, i) => {
      if (corners.slice(0, i).some((p) => sameCorner(p, c))) ids.push(c.id);
    });
    return ids;
  }, [corners]);

  async function create() {
    if (!label.trim() || !prompt.trim() || !focus.trim() || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveCustomActivity({ label: label.trim(), writingPrompt: prompt.trim(), contentFocus: focus.trim() });
      setLabel("");
      setPrompt("");
      setFocus("");
      setMessage("코너를 만들었어요. 학생 화면에 바로 나타나요.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`"${c.label}" 코너를 삭제할까요?\n(이미 학생이 쓴 글은 지워지지 않아요.)`)) return;
    setError("");
    setMessage("");
    try {
      await deleteCustomActivity(c.id);
      setMessage("삭제했어요.");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  async function cleanDuplicates() {
    if (duplicateIds.length === 0) return;
    if (!window.confirm(`똑같은 코너 ${duplicateIds.length}개를 지우고 하나씩만 남길까요?`)) return;
    setError("");
    setMessage("");
    try {
      for (const id of duplicateIds) await deleteCustomActivity(id);
      setMessage(`중복 ${duplicateIds.length}개를 정리했어요.`);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const inputStyle = { borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text };

  return (
    <div className="w-full max-w-4xl mx-auto px-5 py-8 flex flex-col gap-8">
      {error && <p className="text-sm font-bold" style={{ color: PALETTE.signal }}>{error}</p>}
      {message && <p className="text-sm font-bold" style={{ color: PALETTE.copyedit }}>{message}</p>}

      <section>
        <h2 className="sayeon-serif text-base font-bold mb-3" style={{ color: PALETTE.text }}>새 코너 만들기</h2>
        <div className="rounded-lg border p-4 flex flex-col gap-2.5" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="코너 이름 (예: 관찰 기록 코너)" className="w-full px-3 py-2 rounded-md text-sm border" style={inputStyle} />
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="학생에게 보여줄 활동 안내" className="w-full px-3 py-2 rounded-md text-sm border" style={inputStyle} />
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="AI가 내용 면에서 살펴볼 점" className="w-full px-3 py-2 rounded-md text-sm border" style={inputStyle} />
          <button
            onClick={create}
            disabled={!label.trim() || !prompt.trim() || !focus.trim() || busy}
            className="self-end px-4 py-2 rounded-md text-sm font-bold"
            style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: label.trim() && prompt.trim() && focus.trim() && !busy ? 1 : 0.35 }}
          >
            코너 만들기
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="sayeon-serif text-base font-bold" style={{ color: PALETTE.text }}>
            만든 코너 {loading ? "(불러오는 중...)" : `(${corners.length}개)`}
          </h2>
          {duplicateIds.length > 0 && (
            <button onClick={cleanDuplicates} className="text-xs font-bold px-3 py-1.5 rounded-md" style={{ backgroundColor: "#FBEFE0", color: PALETTE.text }}>
              중복 {duplicateIds.length}개 정리하기
            </button>
          )}
        </div>
        {corners.length === 0 && !loading ? (
          <p className="text-sm" style={{ color: PALETTE.textMuted }}>아직 만든 코너가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {corners.map((c) => (
              <li key={c.id} className="rounded-lg border p-4 flex items-start justify-between gap-3" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
                <div className="text-sm leading-relaxed" style={{ color: PALETTE.text }}>
                  <p className="font-bold">
                    {c.label}
                    {duplicateIds.includes(c.id) && (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FBEFE0", color: PALETTE.signal }}>중복</span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>안내: {c.writingPrompt}</p>
                  <p className="text-xs" style={{ color: PALETTE.textMuted }}>AI가 볼 점: {c.contentFocus}</p>
                </div>
                <button onClick={() => remove(c)} className="flex items-center gap-1 text-xs font-bold shrink-0" style={{ color: PALETTE.signal }}>
                  <Trash2 size={14} /> 삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="sayeon-serif text-base font-bold mb-2" style={{ color: PALETTE.text }}>기본 코너 (삭제할 수 없어요)</h2>
        <p className="text-sm" style={{ color: PALETTE.textMuted }}>{DEFAULT_ACTIVITIES.map((a) => a.label).join(" · ")}</p>
      </section>
    </div>
  );
}
