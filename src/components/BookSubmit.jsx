// 학생이 완성한 글을 "우리 반 책"에 내는 화면입니다.
// 책 표지 사진, 읽은 책 정보, 별점, 한 줄 추천을 붙일 수 있어요. (모두 선택)
import { useState } from "react";
import { Camera, X, Send, Loader2 } from "lucide-react";
import { PALETTE } from "../palette.js";
import { submitToBook, finalTextOf, BOOK_STATUS_LABEL } from "../services/book.js";

// 표지 사진은 작게 줄여서(긴 변 600px) 글 기록 안에 함께 저장합니다.
export function shrinkToDataUrl(file, maxSide = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("사진을 읽지 못했어요."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이 사진은 열 수 없어요. 다른 사진을 골라 주세요."));
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let out = canvas.toDataURL("image/jpeg", quality);
        if (out.length > 400000) out = canvas.toDataURL("image/jpeg", 0.55);
        resolve(out);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="별점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`별 ${n}개`}
          onClick={() => onChange(value === n ? 0 : n)}
          className="text-2xl leading-none px-0.5"
          style={{ color: n <= value ? "#E0A82E" : PALETTE.paperDeep }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const inputStyle = { borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text };

export default function BookSubmit({ submission, onDone, onCancel }) {
  const b = submission?.book || {};
  const [title, setTitle] = useState(b.title || "");
  const [bookTitle, setBookTitle] = useState(b.bookTitle || "");
  const [bookAuthor, setBookAuthor] = useState(b.bookAuthor || "");
  const [stars, setStars] = useState(b.stars || 0);
  const [oneLine, setOneLine] = useState(b.oneLine || "");
  const [cover, setCover] = useState(b.cover || "");
  const [text, setText] = useState(b.text || finalTextOf(submission));
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPhoto(file) {
    if (!file) return;
    setError("");
    setPhotoBusy(true);
    try {
      setCover(await shrinkToDataUrl(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const entry = { title, bookTitle, bookAuthor, stars, oneLine, cover, text };
      await submitToBook({ submissionId: submission.id, entry });
      onDone({ ...submission, book: { ...b, ...entry, status: "submitted" } });
    } catch (e) {
      setError("책에 내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-2">
      <h2 className="sayeon-serif text-xl font-bold mb-1" style={{ color: PALETTE.text }}>
        📚 우리 반 책에 내기
      </h2>
      <p className="text-sm mb-4" style={{ color: PALETTE.textMuted }}>
        선생님이 확인하면 친구들이 읽는 '우리 반 책'에 실려요. 빈칸은 비워 둬도 괜찮아요.
      </p>

      {b.status === "needsFix" && (
        <div className="rounded-md px-4 py-3 mb-4 text-sm" style={{ backgroundColor: "#FBEBDD", color: PALETTE.text }}>
          <p className="font-bold mb-1">✏️ 선생님이 고쳐 달라고 했어요</p>
          <p>{b.teacherNote || "글을 한 번 더 살펴봐 주세요."}</p>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <label
          className="shrink-0 flex flex-col items-center justify-center rounded-md border-2 border-dashed cursor-pointer overflow-hidden relative"
          style={{ width: 104, height: 140, borderColor: PALETTE.paperDeep, backgroundColor: "white" }}
        >
          {cover ? (
            <img src={cover} alt="책 표지" className="w-full h-full object-cover" />
          ) : photoBusy ? (
            <Loader2 size={20} className="animate-spin" style={{ color: PALETTE.gold }} />
          ) : (
            <>
              <Camera size={22} style={{ color: PALETTE.gold }} />
              <span className="text-xs font-bold mt-1 text-center px-1" style={{ color: PALETTE.textMuted }}>
                책 표지
                <br />
                사진 넣기
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhoto(e.target.files && e.target.files[0])}
          />
        </label>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="읽은 책 제목" className="w-full px-3 py-2 rounded-md text-sm border" style={inputStyle} />
          <input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} placeholder="지은이" className="w-full px-3 py-2 rounded-md text-sm border" style={inputStyle} />
          <div>
            <p className="text-xs mb-0.5" style={{ color: PALETTE.textMuted }}>이 책에 주고 싶은 별</p>
            <StarPicker value={stars} onChange={setStars} />
          </div>
          {cover && (
            <button type="button" onClick={() => setCover("")} className="self-start flex items-center gap-1 text-xs" style={{ color: PALETTE.textMuted }}>
              <X size={12} /> 사진 빼기
            </button>
          )}
        </div>
      </div>

      <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>내 글 제목</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 질문 하나로 달라진 하루" className="w-full px-3 py-2 rounded-md text-sm border mb-3" style={inputStyle} />

      <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>친구에게 한 줄 추천 ({oneLine.length}/80)</label>
      <input value={oneLine} onChange={(e) => setOneLine(e.target.value.slice(0, 80))} placeholder="예: 친구와 다툰 적 있는 사람에게 꼭 권해요!" className="w-full px-3 py-2 rounded-md text-sm border mb-3" style={inputStyle} />

      <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>책에 실을 글 (마지막으로 다듬어도 돼요)</label>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full p-3 rounded-md text-sm leading-7 border sayeon-serif mb-3" style={inputStyle} />

      {error && <p className="text-sm font-bold mb-3" style={{ color: PALETTE.signal }}>{error}</p>}

      <div className="flex justify-between items-center">
        <button onClick={onCancel} className="text-sm font-bold underline" style={{ color: PALETTE.textMuted }}>
          그만두기
        </button>
        <button
          onClick={submit}
          disabled={!text.trim() || busy || photoBusy}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-bold"
          style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: text.trim() && !busy ? 1 : 0.35 }}
        >
          <Send size={14} /> {busy ? "내는 중..." : b.status ? "고쳐서 다시 내기" : "책에 내기"}
        </button>
      </div>
    </div>
  );
}

// 보관함·완성 화면에 쓰는 작은 상태 표시 + 버튼입니다.
export function BookStatusBox({ submission, onOpenForm }) {
  const b = submission?.book || {};
  const status = b.status;
  return (
    <div className="w-full rounded-lg p-4 text-center" style={{ backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` }}>
      {status ? (
        <p className="text-sm font-bold mb-1" style={{ color: status === "needsFix" ? "#B4541A" : status === "approved" ? PALETTE.content : PALETTE.text }}>
          📚 {BOOK_STATUS_LABEL[status]}
        </p>
      ) : (
        <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>📚 이 글을 우리 반 책에 실어 볼까요?</p>
      )}
      {status === "needsFix" && b.teacherNote && (
        <p className="text-xs mb-2" style={{ color: PALETTE.text }}>선생님 메모: {b.teacherNote}</p>
      )}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {status !== "approved" && (
          <button onClick={onOpenForm} className="px-4 py-2 rounded-md text-xs font-bold" style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper }}>
            {status === "needsFix" ? "고쳐서 다시 내기" : status === "submitted" ? "낸 내용 고치기" : "우리 반 책에 내기"}
          </button>
        )}
        <a href="/?book" className="px-4 py-2 rounded-md text-xs font-bold border" style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}>
          📖 우리 반 책 읽기
        </a>
      </div>
    </div>
  );
}
