import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCcw, Printer, X, ChevronRight } from "lucide-react";
import { PALETTE } from "../palette.js";
import { fetchAllSubmissions } from "../services/submissions.js";
import FeedbackView from "./FeedbackView.jsx";

function formatTime(ts) {
  if (!ts) return "-";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TeacherDashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const teacherPasscode = import.meta.env.VITE_TEACHER_PASSCODE || "";

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
    if (unlocked) load();
  }, [unlocked]);

  function handleUnlock() {
    if (!teacherPasscode) {
      setPassError("VITE_TEACHER_PASSCODE가 설정되어 있지 않아요. 환경변수를 확인해주세요.");
      return;
    }
    if (passInput === teacherPasscode) {
      setUnlocked(true);
    } else {
      setPassError("비밀번호가 맞지 않아요.");
    }
  }

  const activityOptions = useMemo(() => {
    const set = new Set(submissions.map((s) => s.activityLabel).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [submissions]);

  const filtered = useMemo(() => {
    if (activityFilter === "all") return submissions;
    return submissions.filter((s) => s.activityLabel === activityFilter);
  }, [submissions, activityFilter]);

  if (!unlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: PALETTE.paper }}>
        <div className="w-full max-w-xs flex flex-col items-center text-center px-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: PALETTE.paperDeep }}>
            <Lock size={22} style={{ color: PALETTE.gold }} />
          </div>
          <h1 className="sayeon-serif text-xl font-bold mb-2" style={{ color: PALETTE.text }}>
            교사 취합 화면
          </h1>
          <p className="text-sm mb-6" style={{ color: PALETTE.textMuted }}>
            비밀번호를 입력해주세요.
          </p>
          <input
            type="password"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            className="w-full px-4 py-3 rounded-md text-sm border mb-3"
            style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
          />
          {passError && (
            <p className="text-xs mb-3" style={{ color: PALETTE.signal }}>{passError}</p>
          )}
          <button
            onClick={handleUnlock}
            className="w-full px-4 py-3 rounded-md text-sm font-bold"
            style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}
          >
            들어가기
          </button>
        </div>
      </div>
    );
  }

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

      <div className="w-full max-w-4xl mx-auto px-5 py-8">
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
                  <th className="text-left px-4 py-2.5 font-bold" style={{ color: PALETTE.text }}>마지막 수정</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>{s.studentName}</td>
                    <td className="px-4 py-2.5" style={{ color: PALETTE.text }}>{s.activityLabel}</td>
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

            <div className="flex flex-col gap-6">
              {(selected.versions || []).map((v, i) => (
                <div key={i} className="border-t pt-4" style={{ borderColor: PALETTE.paperDeep }}>
                  <p className="text-xs font-bold mb-2" style={{ color: PALETTE.gold }}>
                    {i + 1}번째 원고 · {new Date(v.submittedAt).toLocaleString("ko-KR")}
                  </p>
                  <p className="text-sm leading-7 whitespace-pre-wrap mb-3 sayeon-serif" style={{ color: PALETTE.text }}>
                    {v.text}
                  </p>
                  {v.feedback && <FeedbackView feedback={v.feedback} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
