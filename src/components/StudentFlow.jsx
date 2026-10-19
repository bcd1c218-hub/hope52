import { useEffect, useState } from "react";
import {
  Radio,
  Mic,
  Type as TypeIcon,
  RotateCcw,
  Loader2,
  AlertCircle,
  ArrowRight,
  ImageUp,
  ChevronLeft,
} from "lucide-react";
import { PALETTE, GRID_BG } from "../palette.js";
import { DEFAULT_ACTIVITIES } from "../data/activities.js";
import { getIcon } from "../iconMap.js";
import { StageTracker, OnAirBadge } from "./Shared.jsx";
import FeedbackView from "./FeedbackView.jsx";
import { SELF_LEVELS, FOCUS_OPTIONS, DEPTH_OPTIONS } from "../data/feedbackOptions.js";
import { requestOcr, requestFeedback, fileToBase64 } from "../api.js";
import { fetchCustomActivities } from "../services/customActivities.js";
import { createSubmission, addRevision, markCompleted, findActiveSubmission, updateLastVersion } from "../services/submissions.js";

export default function StudentFlow() {
  const [step, setStep] = useState("start");
  const [studentName, setStudentName] = useState("");
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activity, setActivity] = useState(null);
  const [text, setText] = useState("");
  const [ocrDraft, setOcrDraft] = useState("");
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [revisionRound, setRevisionRound] = useState(0);
  const [selfLevel, setSelfLevel] = useState(null);
  const [focus, setFocus] = useState(["all"]);
  const [depth, setDepth] = useState("hint");
  const [note, setNote] = useState("");
  const [planWill, setPlanWill] = useState([]);
  const [planNote, setPlanNote] = useState("");
  const [refChanged, setRefChanged] = useState("");
  const [refNext, setRefNext] = useState("");

  const [submissionId, setSubmissionId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [resumed, setResumed] = useState(false);
  const [checkingResume, setCheckingResume] = useState(false);

  useEffect(() => {
    fetchCustomActivities()
      .then((custom) => setActivities([...DEFAULT_ACTIVITIES, ...custom]))
      .catch(() => {
        // 커스텀 코너를 불러오지 못해도 기본 코너로 계속 진행합니다.
      });
  }, []);

  const stageIndex = ["start", "activity", "checkingResume", "method", "compose", "confirming", "setup"].includes(step)
    ? 0
    : ["feedback", "loadingFeedback"].includes(step)
    ? 1
    : step === "final" || step === "reflect"
    ? 2
    : 0;

  async function chooseActivity(preset) {
    setActivity(preset);
    await resumeOrStart(preset);
  }

  async function resumeOrStart(chosenActivity) {
    const name = studentName.trim();
    if (!name) {
      setStep("method");
      return;
    }
    setCheckingResume(true);
    setStep("checkingResume");
    try {
      const existing = await findActiveSubmission({ studentName: name, activityId: chosenActivity.id });
      if (existing && existing.versions && existing.versions.length > 0) {
        const last = existing.versions[existing.versions.length - 1];
        setSubmissionId(existing.id);
        setVersions(existing.versions);
        setText(last.text || "");
        setFeedback(last.feedback || null);
        setRevisionRound(existing.versions.length);
        setResumed(true);
        setStep("feedback");
        setCheckingResume(false);
        return;
      }
    } catch (e) {
      // 이어서 쓰기 조회에 실패해도 새로 시작할 수 있어야 합니다.
    }
    setCheckingResume(false);
    setStep("method");
  }

  async function handlePhotosChosen(files) {
    setError("");
    setStep("loadingOcr");
    try {
      const previews = files.map((file) => URL.createObjectURL(file));
      setPhotoPreviews(previews);

      const pieces = [];
      let sawWarning = "";
      for (const file of files) {
        const { mediaType, base64 } = await fileToBase64(file);
        const result = await requestOcr({ mediaType, base64 });
        if (result.text) pieces.push(result.text);
        if (result.warning && !sawWarning) sawWarning = result.warning;
      }
      setOcrDraft(pieces.join("\n\n"));
      if (pieces.length === 0 && sawWarning) {
        setError(sawWarning + " 다른 사진으로 다시 찍어서 올려주세요.");
        setStep("method");
        return;
      }
      setStep("confirming");
    } catch (e) {
      setError(e.message || "사진을 읽는 중 문제가 생겼어요.");
      setStep("method");
    }
  }

  // 글을 다 쓴 뒤, 피드백을 받기 전에 "피드백 주문서"를 먼저 고릅니다.
  function goSetup(finalText) {
    setError("");
    setText(finalText);
    setResumed(false);
    setStep("setup");
  }

  function toggleFocus(id) {
    if (id === "all") {
      setFocus(["all"]);
      return;
    }
    const without = focus.filter((f) => f !== "all");
    const next = without.includes(id) ? without.filter((f) => f !== id) : [...without, id];
    setFocus(next.length ? next : ["all"]);
  }

  async function sendToEditor(finalText) {
    setError("");
    setText(finalText);
    setResumed(false);
    setStep("loadingFeedback");
    try {
      const prev = versions && versions.length ? versions[versions.length - 1] : null;
      const options = { selfLevel: selfLevel || "unsure", focus, depth, note: note.trim() };
      const result = await requestFeedback({
        text: finalText,
        activity,
        previous: prev ? { text: prev.text, feedback: prev.feedback, plan: prev.plan } : null,
        options,
      });
      const fb = { ...result, options };
      setFeedback(fb);
      setPlanWill([]);
      setPlanNote("");
      setNote("");

      if (!submissionId) {
        const id = await createSubmission({ studentName, activity, text: finalText, feedback: fb });
        setSubmissionId(id);
        setVersions([{ text: finalText, feedback: fb, submittedAt: new Date().toISOString() }]);
      } else {
        const nextVersions = await addRevision({ submissionId, versions, text: finalText, feedback: fb });
        setVersions(nextVersions);
      }

      setStep("feedback");
    } catch (e) {
      setError(e.message || "편집자 AI에게 원고를 보내는 중 문제가 생겼어요.");
      setStep("compose");
    }
  }

  function goReflect() {
    setStep("reflect");
  }

  async function goRevise() {
    const items = (feedback?.detective_feedback || []).map((d, i) => ({
      category: d.category,
      question: d.question,
      will: planWill.includes(i),
    }));
    const plan = { items, note: planNote.trim() };
    if (submissionId && (items.some((it) => it.will) || plan.note)) {
      try {
        const next = await updateLastVersion({ submissionId, versions, patch: { plan } });
        setVersions(next);
      } catch (e) {
        // 계획 저장에 실패해도 고쳐 쓰기는 계속할 수 있어요.
      }
    }
    setRevisionRound((r) => r + 1);
    setStep("compose");
  }

  async function finishUp() {
    const changedLabel = versions.length > 1 ? "처음 글보다 달라진 곳" : "이 글에서 가장 마음에 드는 곳";
    const reflection = { changedLabel, changed: refChanged.trim(), next: refNext.trim() };
    if (submissionId) {
      try {
        await markCompleted({ submissionId, finalText: text, reflection });
      } catch (e) {
        // 완료 표시에 실패해도 학생 화면은 정상적으로 넘어갑니다.
      }
    }
    setStep("final");
  }

  function startOver() {
    setStep("start");
    setStudentName("");
    setActivity(null);
    setText("");
    setOcrDraft("");
    setPhotoPreviews([]);
    setFeedback(null);
    setError("");
    setRevisionRound(0);
    setSelfLevel(null);
    setFocus(["all"]);
    setDepth("hint");
    setNote("");
    setPlanWill([]);
    setPlanNote("");
    setRefChanged("");
    setRefNext("");
    setSubmissionId(null);
    setVersions([]);
    setResumed(false);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: PALETTE.paper }}>
      <div className="w-full flex justify-center" style={{ backgroundColor: PALETTE.ink }}>
        <div className="w-full max-w-2xl flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Radio size={18} style={{ color: PALETTE.goldSoft }} />
            <span className="sayeon-serif text-sm font-bold" style={{ color: PALETTE.paper }}>
              오늘의 원고 편집실
            </span>
            {activity && (
              <span
                className="text-xs px-2 py-0.5 rounded-full ml-1"
                style={{ backgroundColor: PALETTE.inkSoft, color: PALETTE.goldSoft }}
              >
                {activity.label}
              </span>
            )}
          </div>
          <OnAirBadge active={step === "checkingResume" || step === "loadingOcr" || step === "loadingFeedback"} />
        </div>
      </div>

      <div className="w-full max-w-2xl px-5 py-10 flex-1">
        {step !== "start" && step !== "activity" && step !== "final" && <StageTracker stage={stageIndex} />}

        {error && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md text-sm" style={{ backgroundColor: "#F3E3E1", color: PALETTE.signal }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "start" && (
          <div className="flex flex-col items-center text-center pt-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: PALETTE.paperDeep }}>
              <Mic size={28} style={{ color: PALETTE.gold }} />
            </div>
            <h1 className="sayeon-serif text-3xl font-bold mb-3" style={{ color: PALETTE.text }}>
              오늘의 원고 편집실
            </h1>
            <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: PALETTE.textMuted }}>
              사연, 일기, 독서감상문, 주장하는 글까지.
              <br />
              어떤 글이든 편집자 AI가 함께 질문하며 다듬어 드려요.
            </p>
            <div className="w-full max-w-xs">
              <label className="block text-xs font-bold mb-1.5 text-left" style={{ color: PALETTE.textMuted }}>
                이름
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="이름을 적어주세요"
                className="w-full px-4 py-3 rounded-md text-sm border"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
              />
            </div>
            <button
              disabled={!studentName.trim()}
              onClick={() => setStep("activity")}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-md text-sm font-bold transition-opacity"
              style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: studentName.trim() ? 1 : 0.35 }}
            >
              편집실 들어가기 <ArrowRight size={15} />
            </button>
          </div>
        )}

        {step === "activity" && (
          <div className="pt-4">
            <h2 className="sayeon-serif text-xl font-bold mb-1" style={{ color: PALETTE.text }}>
              {studentName} 학생, 오늘은 어떤 코너인가요?
            </h2>
            <p className="text-sm mb-6" style={{ color: PALETTE.textMuted }}>
              오늘 쓸 글의 종류를 골라주세요.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {activities.map((a) => {
                const Icon = getIcon(a.icon);
                return (
                  <button
                    key={a.id}
                    onClick={() => chooseActivity(a)}
                    className="flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-transform hover:-translate-y-0.5"
                    style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}
                  >
                    <Icon size={20} style={{ color: PALETTE.gold }} />
                    <span className="text-sm font-bold" style={{ color: PALETTE.text }}>{a.label}</span>
                    <span className="text-xs leading-snug" style={{ color: PALETTE.textMuted }}>{a.tagline}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "method" && activity && (
          <div className="pt-4">
            <button onClick={() => setStep("activity")} className="flex items-center gap-1 text-xs font-bold mb-4" style={{ color: PALETTE.textMuted }}>
              <ChevronLeft size={14} /> 코너 다시 고르기
            </button>
            <h2 className="sayeon-serif text-xl font-bold mb-1" style={{ color: PALETTE.text }}>{activity.label}</h2>
            <p className="text-sm mb-8" style={{ color: PALETTE.textMuted }}>{activity.writingPrompt}</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep("compose")}
                className="flex flex-col items-center gap-3 py-8 rounded-lg border transition-transform hover:-translate-y-0.5"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}
              >
                <TypeIcon size={26} style={{ color: PALETTE.gold }} />
                <span className="text-sm font-bold" style={{ color: PALETTE.text }}>직접 타이핑하기</span>
              </button>
              <label
                className="flex flex-col items-center gap-3 py-8 rounded-lg border cursor-pointer transition-transform hover:-translate-y-0.5"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}
              >
                <ImageUp size={26} style={{ color: PALETTE.gold }} />
                <span className="text-sm font-bold" style={{ color: PALETTE.text }}>원고지 사진 올리기</span>
                <span className="text-xs text-center px-2" style={{ color: PALETTE.textMuted }}>
                  앞면·뒷면처럼 여러 장이면 한 번에 여러 장을 골라주세요
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (files.length > 0) handlePhotosChosen(files);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {step === "checkingResume" && (
          <div className="flex flex-col items-center pt-20 gap-3">
            <Loader2 size={26} className="animate-spin" style={{ color: PALETTE.gold }} />
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>쓰던 원고가 있는지 확인하고 있어요...</p>
          </div>
        )}

        {step === "loadingOcr" && (
          <div className="flex flex-col items-center pt-20 gap-3">
            <Loader2 size={26} className="animate-spin" style={{ color: PALETTE.gold }} />
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>편집자 AI가 원고지를 읽고 있어요...</p>
          </div>
        )}

        {step === "confirming" && (
          <div>
            <h2 className="sayeon-serif text-lg font-bold mb-1" style={{ color: PALETTE.text }}>이렇게 읽었어요</h2>
            <div
              className="rounded-md px-4 py-3 text-sm font-bold mb-4"
              style={{ backgroundColor: "#FBEFE0", color: PALETTE.text }}
            >
              ⚠️ AI가 사진을 읽다가 완전히 다른 내용으로 잘못 읽을 때도 있어요. 아래 사진과 글을
              꼭 하나씩 비교해서, 내가 쓴 것과 다르면 반드시 고쳐 주세요!
            </div>
            {photoPreviews.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {photoPreviews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`업로드한 사진 ${i + 1}`}
                    className="h-40 rounded-md border object-contain"
                    style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}
                  />
                ))}
              </div>
            )}
            <textarea
              value={ocrDraft}
              onChange={(e) => setOcrDraft(e.target.value)}
              rows={10}
              className="w-full p-4 rounded-md text-sm leading-8 border sayeon-serif"
              style={{ ...GRID_BG, borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setStep("method")} className="px-4 py-2.5 rounded-md text-sm font-bold" style={{ color: PALETTE.textMuted }}>
                다시 찍기
              </button>
              <button
                disabled={!ocrDraft.trim()}
                onClick={() => goSetup(ocrDraft)}
                className="px-5 py-2.5 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: ocrDraft.trim() ? 1 : 0.35 }}
              >
                맞아요, 다음으로
              </button>
            </div>
          </div>
        )}

        {step === "compose" && activity && (
          <div>
            <h2 className="sayeon-serif text-lg font-bold mb-1" style={{ color: PALETTE.text }}>
              {revisionRound > 0 ? "고쳐 쓰기" : `${activity.label} 쓰기`}
            </h2>
            <p className="text-sm mb-4" style={{ color: PALETTE.textMuted }}>{activity.writingPrompt}</p>
            {revisionRound > 0 && (() => {
              const plan = versions[versions.length - 1]?.plan;
              const picked = (plan?.items || []).filter((it) => it.will);
              if (picked.length === 0 && !plan?.note) return null;
              return (
                <div className="rounded-md px-4 py-3 mb-4 text-xs leading-relaxed" style={{ backgroundColor: PALETTE.goldSoft + "55", color: PALETTE.text }}>
                  <p className="font-bold mb-1">🛠 내 고치기 계획</p>
                  {picked.map((it, k) => (
                    <p key={k}>· {it.question}</p>
                  ))}
                  {plan?.note && <p>· {plan.note}</p>}
                </div>
              );
            })()}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={11}
              placeholder="완벽하지 않아도 괜찮아요. 내 생각을 솔직하게 적어 보세요..."
              className="w-full p-4 rounded-md text-sm leading-8 border sayeon-serif"
              style={{ ...GRID_BG, borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
            />
            <div className="flex justify-end mt-4">
              <button
                disabled={!text.trim()}
                onClick={() => goSetup(text)}
                className="px-5 py-2.5 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: text.trim() ? 1 : 0.35 }}
              >
                다음으로
              </button>
            </div>
          </div>
        )}

        {step === "setup" && activity && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="sayeon-serif text-lg font-bold mb-1" style={{ color: PALETTE.text }}>피드백 주문서 📝</h2>
              <p className="text-sm" style={{ color: PALETTE.textMuted }}>
                내 글에 꼭 필요한 도움만 받아 봐요. 정답은 없으니 솔직하게 골라 주세요.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>① 내 글은 지금 어디쯤일까요?</p>
              <p className="text-xs mb-2" style={{ color: PALETTE.textMuted }}>건너뛰어도 돼요.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SELF_LEVELS.map((lv) => {
                  const on = selfLevel === lv.id;
                  return (
                    <button
                      key={lv.id}
                      onClick={() => setSelfLevel(on ? null : lv.id)}
                      className="text-left px-4 py-3 rounded-lg border"
                      style={{
                        borderColor: on ? PALETTE.ink : PALETTE.paperDeep,
                        backgroundColor: on ? PALETTE.ink : "white",
                        color: on ? PALETTE.paper : PALETTE.text,
                      }}
                    >
                      <span className="text-sm font-bold">{lv.emoji} {lv.label}</span>
                      <span className="block text-xs mt-0.5" style={{ opacity: 0.8 }}>{lv.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>② 어떤 부분의 피드백을 받고 싶나요?</p>
              <p className="text-xs mb-2" style={{ color: PALETTE.textMuted }}>여러 개를 골라도 돼요.</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => {
                  const on = focus.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFocus(f.id)}
                      className="px-3.5 py-2 rounded-full text-sm font-bold border"
                      style={{
                        borderColor: on ? PALETTE.ink : PALETTE.paperDeep,
                        backgroundColor: on ? PALETTE.ink : "white",
                        color: on ? PALETTE.paper : PALETTE.text,
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <label className="block mt-3 text-xs font-bold" style={{ color: PALETTE.textMuted }}>
                편집자에게 한마디 (쓰고 싶을 때만)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 150))}
                  placeholder="예: 끝부분이 어색한 것 같아요 / 이 장면이 잘 전달되는지 궁금해요"
                  className="mt-1.5 w-full px-4 py-3 rounded-md text-sm border font-normal"
                  style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>③ 어떻게 알려 줄까요?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPTH_OPTIONS.map((d) => {
                  const on = depth === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDepth(d.id)}
                      className="text-left px-4 py-3 rounded-lg border"
                      style={{
                        borderColor: on ? PALETTE.ink : PALETTE.paperDeep,
                        backgroundColor: on ? PALETTE.ink : "white",
                        color: on ? PALETTE.paper : PALETTE.text,
                      }}
                    >
                      <span className="text-sm font-bold">{d.label}</span>
                      <span className="block text-xs mt-0.5" style={{ opacity: 0.8 }}>{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <button onClick={() => setStep("compose")} className="text-sm font-bold underline" style={{ color: PALETTE.textMuted }}>
                글 다시 보기
              </button>
              <button
                onClick={() => sendToEditor(text)}
                className="px-5 py-2.5 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}
              >
                편집자에게 보내기
              </button>
            </div>
          </div>
        )}

        {step === "loadingFeedback" && (
          <div className="flex flex-col items-center pt-20 gap-3">
            <Loader2 size={26} className="animate-spin" style={{ color: PALETTE.gold }} />
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>편집자 AI가 원고를 읽고 있어요...</p>
          </div>
        )}

        {step === "feedback" && feedback && (
          <div className="flex flex-col gap-4">
            {resumed && (
              <div
                className="rounded-md px-4 py-3 text-sm font-bold"
                style={{ backgroundColor: PALETTE.paperDeep, color: PALETTE.text }}
              >
                🔄 이어서 쓰던 원고예요! 지금까지 {revisionRound}번 피드백을 받았어요.
              </div>
            )}
            <FeedbackView feedback={feedback} />

            <div className="rounded-lg p-5 border" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
              <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>🛠 내 글을 어떻게 고쳐 볼까요?</p>
              <p className="text-xs mb-3" style={{ color: PALETTE.textMuted }}>
                편집자의 의견을 모두 따를 필요는 없어요. 내 글에 필요하다고 생각하는 것만 골라요.
              </p>
              {(feedback.detective_feedback || []).length > 0 && (
                <ul className="flex flex-col gap-2 mb-3">
                  {feedback.detective_feedback.map((d, i) => {
                    const on = planWill.includes(i);
                    return (
                      <li key={i}>
                        <button
                          onClick={() => setPlanWill(on ? planWill.filter((x) => x !== i) : [...planWill, i])}
                          className="w-full text-left flex items-start gap-2 px-3 py-2 rounded-md border text-xs leading-relaxed"
                          style={{
                            borderColor: on ? PALETTE.ink : PALETTE.paperDeep,
                            backgroundColor: on ? PALETTE.paperDeep : "white",
                            color: PALETTE.text,
                          }}
                        >
                          <span className="font-bold">{on ? "☑" : "☐"}</span>
                          <span>고쳐 볼래요 — {d.question}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <input
                value={planNote}
                onChange={(e) => setPlanNote(e.target.value.slice(0, 150))}
                placeholder="나는 이렇게 고쳐 볼 거예요 (한 줄, 쓰고 싶을 때만)"
                className="w-full px-3 py-2.5 rounded-md text-sm border"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
              />
            </div>

            {revisionRound >= 2 && (
              <div className="rounded-md px-4 py-3 text-sm font-bold" style={{ backgroundColor: "#FBEFE0", color: PALETTE.text }}>
                ✨ 벌써 {revisionRound + 1}번이나 다듬었어요! 이제는 편집자의 의견보다 내 마음에 드는지가 더 중요해요. 이만하면 마무리해 볼까요?
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <button onClick={goRevise} className="text-sm font-bold underline" style={{ color: PALETTE.textMuted }}>
                고쳐 쓰러 가기
              </button>
              <button onClick={goReflect} className="px-5 py-2.5 rounded-md text-sm font-bold" style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}>
                방송 준비 완료
              </button>
            </div>
          </div>
        )}

        {step === "reflect" && activity && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="sayeon-serif text-lg font-bold mb-1" style={{ color: PALETTE.text }}>마무리 돌아보기 🔍</h2>
              <p className="text-sm" style={{ color: PALETTE.textMuted }}>
                {versions.length > 1 ? "처음 글과 지금 글을 비교해 보고, 한 줄씩만 적어 봐요." : "내 글을 한 번 더 읽어 보고, 한 줄씩만 적어 봐요."}
              </p>
            </div>

            {versions.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-4 border" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: PALETTE.textMuted }}>처음 글</p>
                  <p className="text-xs leading-6 whitespace-pre-wrap sayeon-serif" style={{ color: PALETTE.text }}>{versions[0].text}</p>
                </div>
                <div className="rounded-lg p-4 border" style={{ borderColor: PALETTE.gold, backgroundColor: "white" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: PALETTE.gold }}>지금 글</p>
                  <p className="text-xs leading-6 whitespace-pre-wrap sayeon-serif" style={{ color: PALETTE.text }}>{text}</p>
                </div>
              </div>
            )}

            <label className="block text-xs font-bold" style={{ color: PALETTE.textMuted }}>
              {versions.length > 1 ? "처음 글보다 달라진 곳은 어디인가요?" : "이 글에서 가장 마음에 드는 곳은 어디인가요?"}
              <input
                value={refChanged}
                onChange={(e) => setRefChanged(e.target.value.slice(0, 200))}
                className="mt-1.5 w-full px-4 py-3 rounded-md text-sm border font-normal"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
              />
            </label>
            <label className="block text-xs font-bold" style={{ color: PALETTE.textMuted }}>
              다음 글쓰기에서 또 해 보고 싶은 것은 무엇인가요?
              <input
                value={refNext}
                onChange={(e) => setRefNext(e.target.value.slice(0, 200))}
                className="mt-1.5 w-full px-4 py-3 rounded-md text-sm border font-normal"
                style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
              />
            </label>

            <div className="flex justify-between items-center mt-2">
              <button onClick={() => setStep("feedback")} className="text-sm font-bold underline" style={{ color: PALETTE.textMuted }}>
                돌아가기
              </button>
              <button onClick={finishUp} className="px-5 py-2.5 rounded-md text-sm font-bold" style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}>
                방송 준비 완료
              </button>
            </div>
          </div>
        )}

        {step === "final" && activity && (
          <div className="flex flex-col items-center pt-6">
            <div className="mb-6"><OnAirBadge active={false} /></div>
            <div className="w-full rounded-lg p-7 border" style={{ ...GRID_BG, backgroundColor: "white", borderColor: PALETTE.paperDeep }}>
              <p className="text-xs font-bold mb-1" style={{ color: PALETTE.gold }}>
                {studentName} 학생의 {activity.label} 완성작
              </p>
              <p className="text-sm leading-8 whitespace-pre-wrap sayeon-serif" style={{ color: PALETTE.text }}>{text}</p>
            </div>
            <button onClick={startOver} className="mt-8 flex items-center gap-2 text-sm font-bold" style={{ color: PALETTE.textMuted }}>
              <RotateCcw size={14} /> 새 글 쓰러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
