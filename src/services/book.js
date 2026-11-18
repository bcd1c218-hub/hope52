// "우리 반 책" 저장 기능입니다.
// Firebase 규칙을 바꾸지 않아도 되도록, 지금 쓰는 submissions 모음 안에만 저장합니다.
//  - 글마다 book = {
//      status: "submitted"(점검 기다림) | "needsFix"(고쳐 주세요) | "approved"(확인 완료),
//      teacherNote, title, bookTitle, bookAuthor, stars, oneLine, cover(작게 줄인 사진), text,
//      included, order, sectionId, reactions: { like, learn, want }
//    }
//  - 글마다 bookComments = [{ id, name, text, at }]
//  - 책 전체 설정: kind: "bookSettings" 표시가 붙은 문서 한 개 (제목, 부제, 장 목록)
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
  increment,
  arrayUnion,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.js";

const SUBMISSIONS = "submissions";
export const BOOK_SETTINGS_KIND = "bookSettings";

export const DEFAULT_BOOK_SETTINGS = {
  title: "우리 반 글 모음집",
  subtitle: "질문으로 고쳐 쓴 우리들의 글",
  sections: [], // [{ id, title }] — 비어 있으면 장 구분 없이 순서대로
};

export const BOOK_STATUS_LABEL = {
  submitted: "선생님 확인 기다리는 중",
  needsFix: "선생님 확인: 고쳐 주세요",
  approved: "책에 실렸어요",
};

export const REACTIONS = [
  { id: "like", emoji: "👍", label: "공감돼요" },
  { id: "learn", emoji: "💡", label: "새로 알았어요" },
  { id: "want", emoji: "📚", label: "읽고 싶어요" },
];

/* ── 책 설정 ─────────────────────────────── */

export async function fetchBookSettings() {
  const snap = await getDocs(query(collection(db, SUBMISSIONS), where("kind", "==", BOOK_SETTINGS_KIND)));
  if (snap.empty) return { id: null, ...DEFAULT_BOOK_SETTINGS };
  const d = snap.docs[0];
  return { id: d.id, ...DEFAULT_BOOK_SETTINGS, ...d.data() };
}

export async function saveBookSettings(settings) {
  const data = {
    kind: BOOK_SETTINGS_KIND,
    title: settings.title || "",
    subtitle: settings.subtitle || "",
    sections: Array.isArray(settings.sections) ? settings.sections : [],
    updatedAt: serverTimestamp(),
  };
  if (settings.id) {
    await updateDoc(doc(db, SUBMISSIONS, settings.id), data);
    return settings.id;
  }
  const ref = await addDoc(collection(db, SUBMISSIONS), data);
  return ref.id;
}

/* ── 학생: 책에 내기 (처음 내기 / 고쳐서 다시 내기) ── */

export async function submitToBook({ submissionId, entry }) {
  await updateDoc(doc(db, SUBMISSIONS, submissionId), {
    "book.status": "submitted",
    "book.title": String(entry.title || "").slice(0, 60),
    "book.bookTitle": String(entry.bookTitle || "").slice(0, 60),
    "book.bookAuthor": String(entry.bookAuthor || "").slice(0, 40),
    "book.stars": Number(entry.stars) || 0,
    "book.oneLine": String(entry.oneLine || "").slice(0, 80),
    "book.cover": entry.cover || "",
    "book.text": String(entry.text || "").slice(0, 6000),
    "book.submittedAt": new Date().toISOString(),
  });
}

/* ── 선생님: 점검 ──────────────────────────── */

// 확인 완료: 책에 싣습니다(맨 뒤 순서). 선생님이 고친 글이 있으면 함께 저장해요.
export async function approveBook({ submissionId, text, order }) {
  const patch = {
    "book.status": "approved",
    "book.teacherNote": "",
    "book.included": true,
    "book.order": typeof order === "number" ? order : 9999,
    "book.approvedAt": new Date().toISOString(),
  };
  if (typeof text === "string") patch["book.text"] = text;
  await updateDoc(doc(db, SUBMISSIONS, submissionId), patch);
}

// 고쳐 달라고 하기: 학생 보관함에 메모가 보여요. 책에서는 빠집니다.
export async function askFix({ submissionId, note }) {
  await updateDoc(doc(db, SUBMISSIONS, submissionId), {
    "book.status": "needsFix",
    "book.teacherNote": String(note || "").slice(0, 300),
    "book.included": false,
  });
}

// 책 순서·장·싣기 여부를 한 번에 저장합니다. placements: [{ id, included, order, sectionId }]
export async function saveBookPlacements(placements) {
  const batch = writeBatch(db);
  placements.forEach((p) => {
    batch.update(doc(db, SUBMISSIONS, p.id), {
      "book.included": !!p.included,
      "book.order": typeof p.order === "number" ? p.order : 9999,
      "book.sectionId": p.sectionId || null,
    });
  });
  await batch.commit();
}

/* ── 함께 읽기: 칭찬 스티커와 댓글 ──────────── */

export async function addReaction({ submissionId, kind }) {
  if (!REACTIONS.some((r) => r.id === kind)) return;
  await updateDoc(doc(db, SUBMISSIONS, submissionId), { [`book.reactions.${kind}`]: increment(1) });
}

export async function addComment({ submissionId, name, text }) {
  const comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "").trim().slice(0, 20),
    text: String(text || "").trim().slice(0, 200),
    at: new Date().toISOString(),
  };
  await updateDoc(doc(db, SUBMISSIONS, submissionId), { bookComments: arrayUnion(comment) });
  return comment;
}

// 선생님이 댓글을 지웁니다. (최신 목록을 다시 읽은 뒤 그 댓글만 빼고 저장해요.)
export async function removeComment({ submissionId, commentId }) {
  const ref = doc(db, SUBMISSIONS, submissionId);
  const snap = await getDoc(ref);
  const list = (snap.exists() && Array.isArray(snap.data().bookComments) ? snap.data().bookComments : []).filter(
    (c) => c.id !== commentId
  );
  await updateDoc(ref, { bookComments: list });
  return list;
}

/* ── 책에 들어간 글 정리 ─────────────────────── */

export function finalTextOf(s) {
  const versions = Array.isArray(s?.versions) ? s.versions : [];
  return s?.currentText || versions[versions.length - 1]?.text || "";
}

export function bookTextOf(s) {
  return (s?.book && s.book.text) || finalTextOf(s);
}

// 책 제목 끝 글자에 받침이 있으면 "을", 없으면 "를"을 붙입니다. (한글이 아니면 "을(를)")
function objectParticle(word) {
  const ch = String(word || "").trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "을(를)";
  return code % 28 === 0 ? "를" : "을";
}

export function entryTitleOf(s) {
  const b = s?.book || {};
  return b.title || (b.bookTitle ? `『${b.bookTitle}』${objectParticle(b.bookTitle)} 읽고` : s?.activityLabel || "글");
}

// 책에 실린 글만 순서대로 돌려줍니다. 장이 있으면 장 순서 → 글 순서.
export function arrangeBook(submissions, settings) {
  const sections = Array.isArray(settings?.sections) ? settings.sections : [];
  const sectionIndex = (id) => {
    const i = sections.findIndex((x) => x.id === id);
    return i === -1 ? sections.length : i; // 장이 없는 글은 맨 뒤
  };
  return submissions
    .filter((s) => s.kind !== BOOK_SETTINGS_KIND && s.book && s.book.included && s.book.status === "approved")
    .sort((a, b) => {
      const sa = sectionIndex(a.book.sectionId);
      const sb = sectionIndex(b.book.sectionId);
      if (sa !== sb) return sa - sb;
      return (a.book.order ?? 9999) - (b.book.order ?? 9999);
    });
}

// 함께 읽기 화면용: 책에 실린 글만 가져옵니다.
export async function fetchBook() {
  const [settings, snap] = await Promise.all([
    fetchBookSettings(),
    getDocs(query(collection(db, SUBMISSIONS), where("book.included", "==", true))),
  ]);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { settings, entries: arrangeBook(list, settings) };
}

export async function fetchOne(submissionId) {
  const snap = await getDoc(doc(db, SUBMISSIONS, submissionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
