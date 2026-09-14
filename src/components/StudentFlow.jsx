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
  PenLine,
} from "lucide-react";
import { PALETTE, GRID_BG } from "../palette.js";
import { DEFAULT_ACTIVITIES } from "../data/activities.js";
import { getIcon } from "../iconMap.js";
import { StageTracker, OnAirBadge } from "./Shared.jsx";
import FeedbackView from "./FeedbackView.jsx";
import { requestOcr, requestFeedback, fileToBase64 } from "../api.js";
import { fetchCustomActivities, saveCustomActivity } from "../services/customActivities.js";
import { createSubmission, addRevision, markCompleted } from "../services/submissions.js";

export default function StudentFlow() {
  const [step, setStep] = useState("start");
  const [studentName, setStudentName] = useState("");
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activity, setActivity] = useState(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [text, setText] = useState("");
  const [ocrDraft, setOcrDraft] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [revisionRound, setRevisionRound] = useState(0);

  const [submissionId, setSubmissionId] = useState(null);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    fetchCustomActivities()
      .then((custom) => setActivities([...DEFAULT_ACTIVITIES, ...custom]))
      .catch(() => {
        // 커스텀 코너를 불러오지 못해도 기본 코너로 계속 진행합니다.
      });
  }, []);

  const stageIndex = ["start", "activity", "method", "compose", "confirming"].includes(step)
    ? 0
    : ["feedback", "loadingFeedback"].includes(step)
    ? 1
    : step === "final"
    ? 2
    : 0;

  function chooseActivity(preset) {
    setActivity(preset);
    setStep("method");
  }

  async function confirmCustomActivity() {
    if (!customPrompt.trim() || !customFocus.trim()) return;
    const newActivity = {
      id: `custom-${Date.now()}`,
      label: customLabel.trim() || "자유 코너",
      icon: "PenLine",
      tagline: "선생님이 만든 코너",
      writingPrompt: customPrompt.trim(),
      contentFocus: customFocus.trim(),
      isCustom: true,
    };
    setActivity(newActivity);
    setStep("method");
    try {
      await saveCustomActivity(newActivity);
    } catch (e) {
      // 저장에 실패해도 이번 시간 활동은 계속 진행합니다.
    }
  }

  async function handlePhotoChosen(file) {
    setError("");
    setStep("loadingOcr");
    try {
      const { mediaType, base64 } = await fileToBase64(file);
      const { text: recognized } = await requestOcr({ mediaType, base64 });
      setOcrDraft(recognized || "");
      setStep("confirming");
    } catch (e) {
      setError(e.message || "사진을 읽는 중 문제가 생겼어요.");
      setStep("method");
    }
  }

  async function sendToEditor(finalText) {
    setError("");
    setText(finalText);
    setStep("loadingFeedback");
    try {
      const fb = await requestFeedback({ text: finalText, activity });
      setFeedback(fb);

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

  async function finishUp() {
    if (submissionId) {
      try {
        await markCompleted({ submissionId, finalText: text });
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
    setCustomLabel("");
    setCustomPrompt("");
    setCustomFocus("");
    setText("");
    setOcrDraft("");
    setFeedback(null);
    setError("");
    setRevisionRound(0);
    setSubmissionId(null);
    setVersions([]);
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
          <OnAirBadge active={step === "loadingOcr" || step === "loadingFeedback"} />
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

            <div className="mt-5 rounded-lg border p-4" style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white" }}>
              <div className="flex items-center gap-2 mb-3">
                <PenLine size={18} style={{ color: PALETTE.gold }} />
                <span className="text-sm font-bold" style={{ color: PALETTE.text }}>자유 코너 만들기 (선생님용)</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="코너 이름 (예: 관찰 기록 코너)"
                  className="w-full px-3 py-2 rounded-md text-sm border"
                  style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
                />
                <input
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="학생에게 보여줄 활동 안내"
                  className="w-full px-3 py-2 rounded-md text-sm border"
                  style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
                />
                <input
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="AI가 내용 면에서 살펴볼 점"
                  className="w-full px-3 py-2 rounded-md text-sm border"
                  style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
                />
                <button
                  onClick={confirmCustomActivity}
                  disabled={!customPrompt.trim() || !customFocus.trim()}
                  className="self-end px-4 py-2 rounded-md text-sm font-bold"
                  style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: customPrompt.trim() && customFocus.trim() ? 1 : 0.35 }}
                >
                  이 코너로 시작하기
                </button>
              </div>
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) handlePhotoChosen(file);
                  }}
                />
              </label>
            </div>
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
            <p className="text-sm mb-4" style={{ color: PALETTE.textMuted }}>
              혹시 편집자 AI가 잘못 읽은 글자가 있다면 아래에서 직접 고쳐 주세요.
            </p>
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
                onClick={() => sendToEditor(ocrDraft)}
                className="px-5 py-2.5 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: ocrDraft.trim() ? 1 : 0.35 }}
              >
                맞아요, 편집자에게 보내기
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
                onClick={() => sendToEditor(text)}
                className="px-5 py-2.5 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: text.trim() ? 1 : 0.35 }}
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
            <FeedbackView feedback={feedback} />
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() => {
                  setRevisionRound((r) => r + 1);
                  setStep("compose");
                }}
                className="text-sm font-bold underline"
                style={{ color: PALETTE.textMuted }}
              >
                고쳐 쓰러 가기
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
