import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.js";

const SUBMISSIONS = "submissions";

// 학생이 편집자에게 처음 원고를 보낼 때 새 문서를 만듭니다.
export async function createSubmission({ studentName, activity, text, feedback }) {
  const ref = await addDoc(collection(db, SUBMISSIONS), {
    studentName,
    activityId: activity.id,
    activityLabel: activity.label,
    status: "in_progress",
    currentText: text,
    versions: [
      {
        text,
        feedback,
        submittedAt: new Date().toISOString(),
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// 같은 원고를 고쳐서 다시 보낼 때, 기존 문서에 새 버전을 추가합니다.
export async function addRevision({ submissionId, versions, text, feedback }) {
  const ref = doc(db, SUBMISSIONS, submissionId);
  const nextVersions = [
    ...versions,
    { text, feedback, submittedAt: new Date().toISOString() },
  ];
  await updateDoc(ref, {
    currentText: text,
    versions: nextVersions,
    updatedAt: serverTimestamp(),
  });
  return nextVersions;
}

// 학생이 "방송 준비 완료"를 누르면 최종본으로 표시합니다.
export async function markCompleted({ submissionId, finalText }) {
  const ref = doc(db, SUBMISSIONS, submissionId);
  await updateDoc(ref, {
    status: "completed",
    currentText: finalText,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// 교사 대시보드에서 전체 제출 목록을 가져옵니다.
export async function fetchAllSubmissions() {
  const q = query(collection(db, SUBMISSIONS), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
