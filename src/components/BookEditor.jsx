// 선생님 화면의 "책 만들기" 탭입니다.
//  ① 점검하기: 학생이 낸 글을 확인하고, 필요하면 직접 고치거나 학생에게 고쳐 달라고 해요.
//  ② 책 순서: 확인한 글의 순서와 장을 정하고, 댓글을 관리해요.
//  ③ 책 정보·인쇄: 제목·부제·장 이름을 정하고 A4로 인쇄해요.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, ArrowDown, Check, Pencil, Printer, Plus, Trash2, X, Save, MinusCircle, PlusCircle } from "lucide-react";
import { PALETTE } from "../palette.js";
import { classLabel } from "../data/classInfo.js";
import { studentLabel } from "../lib/analyze.js";
import {
  fetchBookSettings,
  saveBookSettings,
  approveBook,
  askFix,
  saveBookPlacements,
  removeComment,
  arrangeBook,
  editBookEntry,
  planChaptersByBook,
  bookTextOf,
  entryTitleOf,
  REACTIONS,
  BOOK_STATUS_LABEL,
} from "../services/book.js";
import { EntryBody, Stars } from "./BookReader.jsx";

const card = { backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` };
const inputStyle = { borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text };

function SubTab({ id, current, onClick, children }) {
  const on = id === current;
  return (
    <button
      onClick={() => onClick(id)}
      className="px-3 py-2 rounded-md text-sm font-bold"
      style={{ backgroundColor: on ? PALETTE.ink : "white", color: on ? PALETTE.paper : PALETTE.textMuted, border: `1px solid ${PALETTE.paperDeep}` }}
    >
      {children}
    </button>
  );
}

/* ── ① 점검하기 ─────────────────────────────── */

function ReviewCard({ sub, nextOrder, onDone }) {
  const b = sub.book || {};
  const [text, setText] = useState(bookTextOf(sub));
  const [note, setNote] = useState(b.teacherNote || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const edited = text !== bookTextOf(sub);

  async function approve() {
    setBusy(true);
    setMsg("");
    try {
      await approveBook({ submissionId: sub.id, text: edited ? text : undefined, order: nextOrder });
      onDone();
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
      setBusy(false);
    }
  }
  async function fix() {
    if (!note.trim()) {
      setMsg("학생에게 보여 줄 메모를 한 줄 써 주세요.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await askFix({ submissionId: sub.id, note });
      onDone();
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg p-4 mb-4" style={card}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-bold" style={{ color: PALETTE.text }}>
          {studentLabel(sub)} · {sub.activityLabel}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: b.status === "needsFix" ? "#FBEBDD" : PALETTE.paperDeep, color: PALETTE.text }}>
          {BOOK_STATUS_LABEL[b.status]}
        </span>
      </div>
      <div className="flex gap-4 items-start mb-3">
        <div className="flex-1 min-w-0 text-sm" style={{ color: PALETTE.text }}>
          <p className="font-bold sayeon-serif text-base">{entryTitleOf(sub)}</p>
          {(b.bookTitle || b.bookAuthor) && <p className="mt-1">📖 {b.bookTitle ? `『${b.bookTitle}』` : ""} {b.bookAuthor}</p>}
          {b.stars ? <Stars value={b.stars} /> : null}
          {b.oneLine && <p className="mt-1">“{b.oneLine}”</p>}
        </div>
        {b.cover && <img src={b.cover} alt="책 표지" className="shrink-0 rounded-md object-cover" style={{ width: 72, height: 98 }} />}
      </div>
      <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>
        책에 실을 글 {edited && <span style={{ color: PALETTE.gold }}>· 선생님이 고친 내용이 있어요</span>}
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full p-3 rounded-md text-sm leading-7 border sayeon-serif mb-3"
        style={inputStyle}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 300))}
        placeholder="고쳐 달라고 할 때 학생에게 보여 줄 메모 (예: 책 제목과 지은이를 써 주세요)"
        className="w-full px-3 py-2 rounded-md text-sm border mb-3"
        style={inputStyle}
      />
      {msg && <p className="text-xs font-bold mb-2" style={{ color: PALETTE.signal }}>{msg}</p>}
      <div className="flex flex-wrap gap-2 justify-end">
        <button onClick={fix} disabled={busy} className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-bold border" style={{ borderColor: "#B4541A", color: "#B4541A", backgroundColor: "white" }}>
          <Pencil size={14} /> 고쳐 달라고 하기
        </button>
        <button onClick={approve} disabled={busy} className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-bold" style={{ backgroundColor: PALETTE.content, color: "white" }}>
          <Check size={14} /> 확인 완료 · 책에 싣기
        </button>
      </div>
    </section>
  );
}

/* ── 책에 실린 글 고치기 (선생님이 직접) ─────────────── */
function EntryEditor({ entry, onSaved, onCancel }) {
  const b = entry.book || {};
  const [f, setF] = useState({
    title: b.title || "",
    bookTitle: b.bookTitle || "",
    bookAuthor: b.bookAuthor || "",
    oneLine: b.oneLine || "",
    text: bookTextOf(entry),
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await editBookEntry({ submissionId: entry.id, patch: f });
      onSaved("고친 내용을 저장했어요.");
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
      setBusy(false);
    }
  }
  async function sendBack() {
    if (!note.trim()) {
      setMsg("학생에게 보여 줄 메모를 한 줄 써 주세요.");
      return;
    }
    if (!window.confirm("이 글을 책에서 잠시 빼고 학생에게 고쳐 달라고 할까요? 학생이 다시 내면 '① 점검하기'에 올라와요.")) return;
    setBusy(true);
    setMsg("");
    try {
      await askFix({ submissionId: entry.id, note });
      onSaved("학생에게 고쳐 달라고 보냈어요.");
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
      setBusy(false);
    }
  }

  const lab = "block text-xs font-bold mb-1";
  const inp = "w-full px-3 py-1.5 rounded-md text-sm border mb-2";
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: PALETTE.paperDeep }}>
      <label className={lab} style={{ color: PALETTE.textMuted }}>글 제목 (비우면 『책 제목』을 읽고)</label>
      <input value={f.title} onChange={set("title")} className={inp} style={inputStyle} aria-label="글 제목" />
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <label className={lab} style={{ color: PALETTE.textMuted }}>읽은 책</label>
          <input value={f.bookTitle} onChange={set("bookTitle")} className={inp} style={inputStyle} aria-label="읽은 책" />
        </div>
        <div className="flex-1 min-w-0">
          <label className={lab} style={{ color: PALETTE.textMuted }}>지은이</label>
          <input value={f.bookAuthor} onChange={set("bookAuthor")} className={inp} style={inputStyle} aria-label="지은이" />
        </div>
      </div>
      <label className={lab} style={{ color: PALETTE.textMuted }}>한 줄 추천</label>
      <input value={f.oneLine} onChange={set("oneLine")} className={inp} style={inputStyle} aria-label="한 줄 추천" />
      <label className={lab} style={{ color: PALETTE.textMuted }}>책에 실을 글</label>
      <textarea value={f.text} onChange={set("text")} rows={10} className="w-full p-3 rounded-md text-sm leading-7 border sayeon-serif mb-2" style={inputStyle} aria-label="책에 실을 글" />
      {msg && <p className="text-xs font-bold mb-2" style={{ color: PALETTE.signal }}>{msg}</p>}
      <div className="flex flex-wrap gap-2 justify-end mb-3">
        <button onClick={onCancel} disabled={busy} className="px-3 py-2 rounded-md text-sm font-bold border" style={inputStyle}>
          취소
        </button>
        <button onClick={save} disabled={busy} className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-bold" style={{ backgroundColor: PALETTE.content, color: "white" }}>
          <Save size={14} /> 고친 내용 저장
        </button>
      </div>
      <details className="text-xs" style={{ color: PALETTE.textMuted }}>
        <summary className="cursor-pointer font-bold">학생에게 다시 고쳐 달라고 하기</summary>
        <div className="flex gap-2 mt-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder="예: 마지막 문장을 끝까지 써 주세요"
            className="flex-1 px-3 py-1.5 rounded-md text-sm border"
            style={inputStyle}
          />
          <button onClick={sendBack} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold border" style={{ borderColor: "#B4541A", color: "#B4541A", backgroundColor: "white" }}>
            <Pencil size={14} /> 보내기
          </button>
        </div>
      </details>
    </div>
  );
}

/* ── 인쇄 미리보기 (A4) ─────────────────────── */

function BookPrint({ settings, entries, onClose }) {
  useEffect(() => {
    document.body.classList.add("printing-book");
    return () => document.body.classList.remove("printing-book");
  }, []);
  const sections = Array.isArray(settings.sections) ? settings.sections : [];
  const sectionTitle = (id) => sections.find((x) => x.id === id)?.title || "";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  return createPortal(
    <div className="book-print fixed inset-0 z-50 overflow-auto" style={{ backgroundColor: "#ffffff" }}>
      <div className="no-print sticky top-0 flex items-center justify-between gap-2 px-5 py-3" style={{ backgroundColor: PALETTE.ink }}>
        <span className="text-sm font-bold" style={{ color: PALETTE.paper }}>인쇄 미리보기 · A4 · 글 {entries.length}편</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold" style={{ backgroundColor: PALETTE.goldSoft, color: PALETTE.ink }}>
            <Printer size={14} /> 인쇄하기
          </button>
          <button onClick={onClose} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold" style={{ color: PALETTE.paper }}>
            <X size={14} /> 닫기
          </button>
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: "180mm", padding: "10mm 0" }}>
        {/* 표지 */}
        <section className="flex flex-col items-center justify-center text-center" style={{ minHeight: "240mm" }}>
          <p className="text-sm mb-6" style={{ color: PALETTE.textMuted }}>{classLabel()}</p>
          <h1 className="sayeon-serif font-bold mb-4" style={{ fontSize: 40, color: PALETTE.text }}>{settings.title}</h1>
          {settings.subtitle && <p className="text-lg" style={{ color: PALETTE.textMuted }}>{settings.subtitle}</p>}
          <p className="text-sm mt-16" style={{ color: PALETTE.textMuted }}>{today}</p>
        </section>

        {/* 차례 */}
        <section className="book-break pt-4">
          <h2 className="sayeon-serif text-2xl font-bold mb-6" style={{ color: PALETTE.text }}>차례</h2>
          <ol className="flex flex-col gap-2">
            {entries.map((e, i) => {
              const sec = sectionTitle(e.book.sectionId);
              const prevSec = i > 0 ? sectionTitle(entries[i - 1].book.sectionId) : null;
              return (
                <li key={e.id}>
                  {sec && sec !== prevSec && <p className="font-bold mt-4 mb-1" style={{ color: PALETTE.gold }}>{sec}</p>}
                  <p className="flex gap-3 text-base" style={{ color: PALETTE.text }}>
                    <span style={{ width: 28, color: PALETTE.textMuted }}>{i + 1}</span>
                    <span className="flex-1">{entryTitleOf(e)}</span>
                    <span>{e.studentName}</span>
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 글 */}
        {entries.map((e) => (
          <section key={e.id} className="book-break pt-4">
            <EntryBody entry={e} sectionTitle={sectionTitle(e.book.sectionId)} print />
          </section>
        ))}
      </div>
    </div>,
    document.body
  );
}

/* ── 책 만들기 탭 ───────────────────────────── */

export default function BookEditor({ submissions, onReload }) {
  const [sub, setSub] = useState("review");
  const [settings, setSettings] = useState(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [placements, setPlacements] = useState({}); // id → { included, order, sectionId }
  const [placeDirty, setPlaceDirty] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [openComments, setOpenComments] = useState(null);
  const [comments, setComments] = useState({});
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchBookSettings()
      .then(setSettings)
      .catch(() => setMsg("책 정보를 불러오지 못했어요."));
  }, []);

  // 학생 글이 새로 불러와지면 순서 정보를 다시 맞춥니다.
  useEffect(() => {
    const next = {};
    submissions.forEach((s) => {
      if (s.book && s.book.status === "approved") {
        next[s.id] = { included: !!s.book.included, order: s.book.order ?? 9999, sectionId: s.book.sectionId || null };
      }
    });
    setPlacements(next);
    setPlaceDirty(false);
    const c = {};
    submissions.forEach((s) => {
      c[s.id] = Array.isArray(s.bookComments) ? s.bookComments : [];
    });
    setComments(c);
  }, [submissions]);

  const toReview = submissions.filter((s) => s.book && s.book.status === "submitted");
  const waitingFix = submissions.filter((s) => s.book && s.book.status === "needsFix");
  const approved = submissions.filter((s) => s.book && s.book.status === "approved");

  const merged = useMemo(
    () => approved.map((s) => ({ ...s, book: { ...s.book, ...(placements[s.id] || {}) } })),
    [approved, placements]
  );
  const arranged = useMemo(() => (settings ? arrangeBook(merged, settings) : []), [merged, settings]);
  const leftOut = merged.filter((s) => !s.book.included);
  const nextOrder = arranged.length ? Math.max(...arranged.map((e) => e.book.order ?? 0)) + 1 : 0;
  const sections = settings && Array.isArray(settings.sections) ? settings.sections : [];

  function setPlace(id, patch) {
    setPlacements((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
    setPlaceDirty(true);
    setMsg("");
  }

  // 같은 장 안에서만 위·아래로 옮깁니다.
  function move(index, dir) {
    const a = arranged[index];
    const j = index + dir;
    const b = arranged[j];
    if (!a || !b || (a.book.sectionId || null) !== (b.book.sectionId || null)) return;
    const list = arranged.map((e) => e.id);
    [list[index], list[j]] = [list[j], list[index]];
    setPlacements((p) => {
      const next = { ...p };
      list.forEach((id, k) => {
        next[id] = { ...next[id], order: k };
      });
      return next;
    });
    setPlaceDirty(true);
    setMsg("");
  }

  async function savePlacements() {
    setSaving(true);
    setMsg("");
    try {
      const list = Object.entries(placements).map(([id, p]) => ({ id, ...p }));
      if (list.length) await saveBookPlacements(list);
      setPlaceDirty(false);
      setMsg("책 순서를 저장했어요.");
      onReload && onReload();
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMsg("");
    try {
      const id = await saveBookSettings(settings);
      setSettings((s) => ({ ...s, id }));
      setSettingsDirty(false);
      setMsg("책 정보를 저장했어요.");
    } catch (e) {
      setMsg("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  // 읽은 책 제목이 같은 글끼리 장으로 묶어요. (2편 이상인 책만 장이 되고, 나머지는 '여러 책 이야기'로)
  async function autoChapters() {
    if (arranged.length === 0) return;
    if (sections.length > 0 && !window.confirm("지금 있는 장을 지우고 책 제목별로 새로 나눌까요? (글은 그대로예요)")) return;
    const plan = planChaptersByBook(arranged);
    setSaving(true);
    setMsg("");
    try {
      const next = { ...settings, sections: plan.sections };
      const id = await saveBookSettings(next);
      setSettings({ ...next, id });
      setSettingsDirty(false);
      await saveBookPlacements(plan.placements);
      const nextPl = {};
      plan.placements.forEach((x) => (nextPl[x.id] = { included: true, order: x.order, sectionId: x.sectionId }));
      setPlacements((p) => ({ ...p, ...nextPl }));
      setPlaceDirty(false);
      setMsg(`장 ${plan.sections.length}개를 만들고 ${plan.placements.length}편을 나눴어요. 장 이름은 아래에서 바꿀 수 있어요.`);
      onReload && onReload();
    } catch (e) {
      setMsg("장을 나누지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function editSettings(patch) {
    setSettings((s) => ({ ...s, ...patch }));
    setSettingsDirty(true);
    setMsg("");
  }

  async function deleteComment(subId, commentId) {
    try {
      const list = await removeComment({ submissionId: subId, commentId });
      setComments((c) => ({ ...c, [subId]: list }));
    } catch (e) {
      setMsg("댓글을 지우지 못했어요.");
    }
  }

  if (!settings) {
    return <p className="text-sm" style={{ color: PALETTE.textMuted }}>{msg || "책 정보를 불러오는 중..."}</p>;
  }

  return (
    <div>
      {preview && <BookPrint settings={settings} entries={arranged} onClose={() => setPreview(false)} />}

      <div className="flex flex-wrap gap-2 mb-5 no-print">
        <SubTab id="review" current={sub} onClick={setSub}>① 점검하기 ({toReview.length})</SubTab>
        <SubTab id="order" current={sub} onClick={setSub}>② 책 순서 ({arranged.length})</SubTab>
        <SubTab id="info" current={sub} onClick={setSub}>③ 책 정보·인쇄</SubTab>
      </div>

      {msg && <p className="text-sm font-bold mb-4" style={{ color: msg.includes("못") ? PALETTE.signal : PALETTE.content }}>{msg}</p>}

      {sub === "review" && (
        <div>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: PALETTE.textMuted }}>
            학생이 '우리 반 책에 내기'로 낸 글입니다. 맞춤법 정도는 아래 칸에서 직접 고친 뒤 <b>확인 완료</b>를 누르면 바로
            책에 실려요. 학생이 직접 고쳐야 할 부분이 있으면 메모를 쓰고 <b>고쳐 달라고 하기</b>를 누르세요. 학생 보관함에
            메모가 보여요.
          </p>
          {toReview.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: PALETTE.textMuted }}>점검할 글이 없어요.</p>
          ) : (
            toReview.map((s, i) => <ReviewCard key={s.id} sub={s} nextOrder={nextOrder + i} onDone={onReload} />)
          )}
          {waitingFix.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>학생이 고치는 중인 글 ({waitingFix.length})</p>
              <ul className="flex flex-col gap-1.5">
                {waitingFix.map((s) => (
                  <li key={s.id} className="text-xs rounded-md px-3 py-2" style={card}>
                    <b>{studentLabel(s)}</b> · {entryTitleOf(s)} — 메모: {s.book.teacherNote}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sub === "order" && (
        <div>
          <p className="text-xs mb-4" style={{ color: PALETTE.textMuted }}>
            확인 완료한 글이 실린 순서입니다. 화살표로 순서를, 칸에서 장을 정한 뒤 <b>순서 저장하기</b>를 누르세요. 맞춤법·띄어쓰기는 <b>고치기</b>로 바로 고칠 수 있어요. 장 이름은
            '③ 책 정보·인쇄'에서 만듭니다.
          </p>
          {arranged.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: PALETTE.textMuted }}>아직 책에 실린 글이 없어요. '① 점검하기'에서 확인 완료를 눌러 주세요.</p>
          ) : (
            <ol className="flex flex-col gap-2 mb-4">
              {arranged.map((e, i) => {
                const sameAbove = i > 0 && (arranged[i - 1].book.sectionId || null) === (e.book.sectionId || null);
                const sameBelow = i < arranged.length - 1 && (arranged[i + 1].book.sectionId || null) === (e.book.sectionId || null);
                const cs = comments[e.id] || [];
                const r = e.book.reactions || {};
                return (
                  <li key={e.id} className="rounded-lg p-3" style={card}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold w-6 text-center" style={{ color: PALETTE.textMuted }}>{i + 1}</span>
                      <span className="flex-1 min-w-0 text-sm" style={{ color: PALETTE.text }}>
                        <b>{entryTitleOf(e)}</b> <span style={{ color: PALETTE.textMuted }}>· {e.studentName}</span>
                      </span>
                      {sections.length > 0 && (
                        <select
                          value={e.book.sectionId || ""}
                          onChange={(ev) => setPlace(e.id, { sectionId: ev.target.value || null })}
                          className="text-xs px-2 py-1 rounded-md border"
                          style={inputStyle}
                          aria-label="장 고르기"
                        >
                          <option value="">장 없음</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      )}
                      <button onClick={() => move(i, -1)} disabled={!sameAbove} aria-label="위로" className="p-1.5 rounded-md border" style={{ ...inputStyle, opacity: sameAbove ? 1 : 0.3 }}>
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={!sameBelow} aria-label="아래로" className="p-1.5 rounded-md border" style={{ ...inputStyle, opacity: sameBelow ? 1 : 0.3 }}>
                        <ArrowDown size={14} />
                      </button>
                      <button onClick={() => setEditing(editing === e.id ? null : e.id)} className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold" style={inputStyle}>
                        <Pencil size={12} /> 고치기
                      </button>
                      <button onClick={() => setPlace(e.id, { included: false })} aria-label="책에서 빼기" className="p-1.5 rounded-md" style={{ color: PALETTE.signal }}>
                        <MinusCircle size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 pl-8 text-xs" style={{ color: PALETTE.textMuted }}>
                      {REACTIONS.map((x) => (
                        <span key={x.id}>{x.emoji} {r[x.id] || 0}</span>
                      ))}
                      <button onClick={() => setOpenComments(openComments === e.id ? null : e.id)} className="underline font-bold">
                        댓글 {cs.length}개 {openComments === e.id ? "닫기" : "보기"}
                      </button>
                    </div>
                    {editing === e.id && (
                      <EntryEditor
                        entry={e}
                        onCancel={() => setEditing(null)}
                        onSaved={(m) => {
                          setEditing(null);
                          setMsg(m);
                          onReload && onReload();
                        }}
                      />
                    )}
                    {openComments === e.id && (
                      <ul className="mt-2 pl-8 flex flex-col gap-1">
                        {cs.length === 0 && <li className="text-xs" style={{ color: PALETTE.textMuted }}>아직 댓글이 없어요.</li>}
                        {cs.map((c) => (
                          <li key={c.id} className="text-xs flex items-start gap-2" style={{ color: PALETTE.text }}>
                            <span className="flex-1"><b>{c.name}</b> {c.text}</span>
                            <button onClick={() => deleteComment(e.id, c.id)} className="flex items-center gap-0.5" style={{ color: PALETTE.signal }}>
                              <Trash2 size={12} /> 지우기
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {leftOut.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>책에서 뺀 글</p>
              <ul className="flex flex-col gap-1.5">
                {leftOut.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm rounded-md px-3 py-2" style={card}>
                    <span className="flex-1" style={{ color: PALETTE.text }}>{entryTitleOf(e)} · {e.studentName}</span>
                    <button onClick={() => setPlace(e.id, { included: true, order: nextOrder })} className="flex items-center gap-1 text-xs font-bold" style={{ color: PALETTE.content }}>
                      <PlusCircle size={14} /> 다시 넣기
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={savePlacements}
            disabled={!placeDirty || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
            style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: placeDirty && !saving ? 1 : 0.35 }}
          >
            <Save size={14} /> 순서 저장하기
          </button>
          {placeDirty && <span className="text-xs ml-3" style={{ color: PALETTE.signal }}>저장하지 않은 변경이 있어요.</span>}
        </div>
      )}

      {sub === "info" && (
        <div>
          <section className="rounded-lg p-4 mb-4" style={card}>
            <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>책 제목</label>
            <input value={settings.title} onChange={(e) => editSettings({ title: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm border mb-3" style={inputStyle} />
            <label className="block text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>부제 (표지 문구)</label>
            <input value={settings.subtitle} onChange={(e) => editSettings({ subtitle: e.target.value })} className="w-full px-3 py-2 rounded-md text-sm border mb-4" style={inputStyle} />

            <p className="text-xs font-bold mb-1" style={{ color: PALETTE.textMuted }}>장 나누기 (선택 — 없으면 순서대로 한 줄)</p>
            <button
              onClick={autoChapters}
              disabled={saving || arranged.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold border mb-1"
              style={{ ...inputStyle, opacity: saving || arranged.length === 0 ? 0.4 : 1 }}
            >
              📚 책 제목별로 장 자동 나누기
            </button>
            <p className="text-xs mb-2" style={{ color: PALETTE.textMuted }}>
              같은 책을 2명 이상 읽었으면 한 장으로 묶고, 나머지는 '여러 책 이야기' 장에 모아요. 바로 저장돼요.
            </p>
            <ul className="flex flex-col gap-1.5 mb-2">
              {sections.map((s, k) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="text-xs w-10" style={{ color: PALETTE.textMuted }}>{k + 1}장</span>
                  <input
                    value={s.title}
                    onChange={(e) => editSettings({ sections: sections.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })}
                    className="flex-1 px-3 py-1.5 rounded-md text-sm border"
                    style={inputStyle}
                  />
                  <button onClick={() => editSettings({ sections: sections.filter((x) => x.id !== s.id) })} aria-label="장 지우기" style={{ color: PALETTE.signal }}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mb-4">
              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="예: 1장. 마음을 나눈 책"
                className="flex-1 px-3 py-1.5 rounded-md text-sm border"
                style={inputStyle}
              />
              <button
                onClick={() => {
                  if (!newSection.trim()) return;
                  editSettings({ sections: [...sections, { id: `s${Date.now()}`, title: newSection.trim() }] });
                  setNewSection("");
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-bold border"
                style={inputStyle}
              >
                <Plus size={14} /> 장 추가
              </button>
            </div>
            <button
              onClick={saveSettings}
              disabled={!settingsDirty || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
              style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: settingsDirty && !saving ? 1 : 0.35 }}
            >
              <Save size={14} /> 책 정보 저장하기
            </button>
          </section>

          <section className="rounded-lg p-4 mb-4" style={card}>
            <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>인쇄</p>
            <p className="text-xs mb-3" style={{ color: PALETTE.textMuted }}>
              표지 → 차례 → 글(한 편마다 새 쪽) 순서로 A4에 인쇄됩니다. 인쇄 창에서 '배경 그래픽'을 켜면 색이 함께 나와요.
              PDF로 저장하려면 인쇄 창의 대상에서 'PDF로 저장'을 고르세요.
            </p>
            <button
              onClick={() => setPreview(true)}
              disabled={arranged.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
              style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: arranged.length ? 1 : 0.35 }}
            >
              <Printer size={14} /> 인쇄 미리보기 ({arranged.length}편)
            </button>
            {(placeDirty || settingsDirty) && (
              <p className="text-xs mt-2" style={{ color: PALETTE.signal }}>
                저장하지 않은 변경도 미리보기에는 반영돼요. 친구들 화면에 보이려면 저장해 주세요.
              </p>
            )}
          </section>

          <section className="rounded-lg p-4" style={card}>
            <p className="text-sm font-bold mb-1" style={{ color: PALETTE.text }}>친구들이 읽는 주소</p>
            <p className="text-sm font-bold" style={{ color: PALETTE.copyedit }}>{window.location.origin}/?book</p>
            <p className="text-xs mt-1" style={{ color: PALETTE.textMuted }}>
              확인 완료한 글만 보입니다. 이 주소는 링크를 아는 사람이면 누구나 열 수 있어요.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
