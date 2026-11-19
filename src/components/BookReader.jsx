// 친구들이 함께 읽는 "우리 반 책" 화면입니다. 주소: hope52.vercel.app/?book
// 선생님이 확인 완료한 글만 보여요. 칭찬 스티커와 댓글을 남길 수 있어요.
import { useEffect, useState } from "react";
import { BookOpen, RefreshCcw, MessageCircle, Loader2 } from "lucide-react";
import { PALETTE } from "../palette.js";
import { classLabel } from "../data/classInfo.js";
import { fetchBook, addReaction, addComment, displayTextOf, entryTitleOf, REACTIONS } from "../services/book.js";

export function Stars({ value, size = 14 }) {
  if (!value) return null;
  return (
    <span aria-label={`별 ${value}개`} style={{ color: "#E0A82E", fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(value)}
      <span style={{ color: PALETTE.paperDeep }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

// 글 한 편의 본문(표지 사진·책 정보·한 줄 추천·글)입니다. 읽기 화면과 인쇄에서 함께 써요.
export function EntryBody({ entry, sectionTitle, print = false }) {
  const b = entry.book || {};
  return (
    <article>
      {sectionTitle && (
        <p className="text-xs font-bold mb-1" style={{ color: PALETTE.gold }}>{sectionTitle}</p>
      )}
      <div className="flex gap-4 items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`sayeon-serif font-bold leading-snug ${print ? "text-2xl" : "text-lg"}`} style={{ color: PALETTE.text }}>
            {entryTitleOf(entry)}
          </h3>
          <p className="text-sm mt-1" style={{ color: PALETTE.textMuted }}>
            글 · <b style={{ color: PALETTE.text }}>{entry.studentName}</b>
          </p>
          {(b.bookTitle || b.bookAuthor) && (
            <p className="text-sm mt-1.5" style={{ color: PALETTE.text }}>
              📖 {b.bookTitle ? `『${b.bookTitle}』` : ""}
              {b.bookAuthor ? ` ${b.bookAuthor}` : ""}
            </p>
          )}
          {b.stars ? <div className="mt-1"><Stars value={b.stars} size={print ? 16 : 15} /></div> : null}
        </div>
        {b.cover && (
          <img
            src={b.cover}
            alt={b.bookTitle ? `${b.bookTitle} 표지` : "책 표지"}
            className="shrink-0 rounded-md object-cover"
            style={{ width: print ? 110 : 84, height: print ? 150 : 114, border: `1px solid ${PALETTE.paperDeep}` }}
          />
        )}
      </div>
      {b.oneLine && (
        <p className="text-sm font-bold rounded-md px-3 py-2 mb-3" style={{ backgroundColor: PALETTE.goldSoft + "55", color: PALETTE.text }}>
          “{b.oneLine}”
        </p>
      )}
      <p className={`whitespace-pre-wrap sayeon-serif ${print ? "text-base leading-9" : "text-sm leading-8"}`} style={{ color: PALETTE.text }}>
        {displayTextOf(entry)}
      </p>
    </article>
  );
}

const NAME_KEY = "hope52-reader-name";
const REACTED_KEY = "hope52-reacted";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (e) {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // 저장이 안 돼도 화면은 계속 써요.
  }
}

function EntryCard({ entry, sectionTitle, index }) {
  const [reactions, setReactions] = useState((entry.book && entry.book.reactions) || {});
  const [reacted, setReacted] = useState(() => readJson(REACTED_KEY, {}));
  const [comments, setComments] = useState(Array.isArray(entry.bookComments) ? entry.bookComments : []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch (e) {
      return "";
    }
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function react(kind) {
    const key = `${entry.id}:${kind}`;
    if (reacted[key]) return; // 같은 기기에서 같은 스티커는 한 번만
    setReactions((r) => ({ ...r, [kind]: (r[kind] || 0) + 1 }));
    const next = { ...reacted, [key]: true };
    setReacted(next);
    writeJson(REACTED_KEY, next);
    try {
      await addReaction({ submissionId: entry.id, kind });
    } catch (e) {
      setMsg("스티커를 붙이지 못했어요.");
    }
  }

  async function send() {
    if (!name.trim() || !text.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const c = await addComment({ submissionId: entry.id, name, text });
      setComments((list) => [...list, c]);
      setText("");
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch (e) {
        // 괜찮아요.
      }
    } catch (e) {
      setMsg("댓글을 남기지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id={`entry-${entry.id}`} className="rounded-xl p-5 mb-5" style={{ backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` }}>
      <p className="text-xs mb-2" style={{ color: PALETTE.textMuted }}>{index + 1}</p>
      <EntryBody entry={entry} sectionTitle={sectionTitle} />

      <div className="flex flex-wrap gap-2 mt-4">
        {REACTIONS.map((r) => {
          const done = reacted[`${entry.id}:${r.id}`];
          return (
            <button
              key={r.id}
              onClick={() => react(r.id)}
              aria-pressed={!!done}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border"
              style={{
                borderColor: done ? PALETTE.ink : PALETTE.paperDeep,
                backgroundColor: done ? PALETTE.paperDeep : "white",
                color: PALETTE.text,
              }}
            >
              {r.emoji} {r.label} <span style={{ color: PALETTE.textMuted }}>{reactions[r.id] || 0}</span>
            </button>
          );
        })}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border"
          style={{ borderColor: PALETTE.paperDeep, backgroundColor: "white", color: PALETTE.text }}
        >
          <MessageCircle size={13} /> 댓글 {comments.length}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: PALETTE.paperDeep }}>
          {comments.length === 0 ? (
            <p className="text-xs mb-3" style={{ color: PALETTE.textMuted }}>첫 댓글을 남겨 주세요. 좋았던 점이나 궁금한 점을 써 봐요.</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-3">
              {comments.map((c) => (
                <li key={c.id} className="text-sm" style={{ color: PALETTE.text }}>
                  <b>{c.name}</b> <span style={{ color: PALETTE.text }}>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="내 이름"
              className="w-full px-3 py-2 rounded-md text-sm border"
              style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
            />
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 200))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="예: 주인공 마음이 잘 느껴졌어!"
                className="flex-1 min-w-0 px-3 py-2 rounded-md text-sm border"
                style={{ borderColor: PALETTE.paperDeep, color: PALETTE.text }}
              />
              <button
                onClick={send}
                disabled={!name.trim() || !text.trim() || busy}
                className="shrink-0 px-4 py-2 rounded-md text-sm font-bold"
                style={{ backgroundColor: PALETTE.ink, color: PALETTE.paper, opacity: name.trim() && text.trim() && !busy ? 1 : 0.35 }}
              >
                남기기
              </button>
            </div>
          </div>
        </div>
      )}
      {msg && <p className="text-xs font-bold mt-2" style={{ color: PALETTE.signal }}>{msg}</p>}
    </section>
  );
}

export default function BookReader() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setData(await fetchBook());
    } catch (e) {
      setError("책을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  const settings = data?.settings;
  const entries = data?.entries || [];
  const sections = Array.isArray(settings?.sections) ? settings.sections : [];
  const sectionTitle = (id) => sections.find((x) => x.id === id)?.title || "";

  return (
    <div className="min-h-screen w-full flex flex-col items-center" style={{ backgroundColor: PALETTE.paper }}>
      <div className="w-full flex justify-center" style={{ backgroundColor: PALETTE.ink }}>
        <div className="w-full max-w-2xl flex items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2 sayeon-serif text-sm font-bold" style={{ color: PALETTE.paper }}>
            <BookOpen size={17} style={{ color: PALETTE.goldSoft }} /> 우리 반 책
          </span>
          <button onClick={load} className="flex items-center gap-1 text-xs font-bold" style={{ color: PALETTE.goldSoft }}>
            <RefreshCcw size={13} /> 새로고침
          </button>
        </div>
      </div>

      <main className="w-full max-w-2xl px-5 py-8 flex-1">
        {error && <p className="text-sm font-bold mb-4" style={{ color: PALETTE.signal }}>{error}</p>}
        {!data && !error && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 size={26} className="animate-spin" style={{ color: PALETTE.gold }} />
            <p className="text-sm" style={{ color: PALETTE.textMuted }}>책을 펼치는 중...</p>
          </div>
        )}

        {data && (
          <>
            <header className="rounded-xl px-6 py-10 mb-6 text-center" style={{ backgroundColor: PALETTE.ink }}>
              <p className="text-xs mb-3" style={{ color: PALETTE.goldSoft }}>{classLabel()}</p>
              <h1 className="sayeon-serif text-2xl font-bold mb-2" style={{ color: PALETTE.paper }}>{settings.title}</h1>
              {settings.subtitle && <p className="text-sm" style={{ color: PALETTE.goldSoft }}>{settings.subtitle}</p>}
              <p className="text-xs mt-4" style={{ color: PALETTE.paperDeep }}>글 {entries.length}편</p>
            </header>

            {entries.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: PALETTE.textMuted }}>
                아직 책에 실린 글이 없어요. 선생님이 확인하면 여기에 나타나요.
              </p>
            ) : (
              <>
                <nav className="rounded-xl p-5 mb-6" style={{ backgroundColor: "white", border: `1px solid ${PALETTE.paperDeep}` }} aria-label="차례">
                  <p className="text-sm font-bold mb-2" style={{ color: PALETTE.text }}>차례</p>
                  <ol className="flex flex-col gap-1.5">
                    {entries.map((e, i) => {
                      const sec = sectionTitle(e.book.sectionId);
                      const prevSec = i > 0 ? sectionTitle(entries[i - 1].book.sectionId) : null;
                      return (
                        <li key={e.id}>
                          {sec && sec !== prevSec && (
                            <p className="text-xs font-bold mt-2 mb-1" style={{ color: PALETTE.gold }}>{sec}</p>
                          )}
                          <a href={`#entry-${e.id}`} className="text-sm flex gap-2" style={{ color: PALETTE.text }}>
                            <span style={{ color: PALETTE.textMuted }}>{i + 1}.</span>
                            <span className="flex-1">{entryTitleOf(e)}</span>
                            <span style={{ color: PALETTE.textMuted }}>{e.studentName}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
                {entries.map((e, i) => (
                  <EntryCard key={e.id} entry={e} index={i} sectionTitle={sectionTitle(e.book.sectionId)} />
                ))}
              </>
            )}
            <p className="text-center mt-4">
              <a href="/" className="text-xs font-bold underline" style={{ color: PALETTE.textMuted }}>글쓰기 화면으로 가기</a>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
