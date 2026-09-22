import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
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

// 같은 이름 + 같은 코너로 "아직 끝내지 않은" 원고가 있으면 찾아서 이어서 쓸 수 있게 합니다.
// (studentName만 등호 조건으로 걸어서 인덱스 설정 없이도 바로 동작하도록 하고,
//  코너/완료 여부는 가져온 뒤 자바스크립트에서 걸러냅니다.)
export async function findActiveSubmission({ studentName, activityId }) {
  const q = query(collection(db, SUBMISSIONS), where("studentName", "==", studentName));
  const snap = await getDocs(q);
  let best = null;
  snap.forEach((d) => {
    const data = { id: d.id, ...d.data() };
    if (data.activityId !== activityId) return;
    if (data.status === "completed") return;
    const updatedMillis = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
    const bestMillis = best?.updatedAt?.toMillis ? best.updatedAt.toMillis() : -1;
    if (!best || updatedMillis > bestMillis) best = data;
  });
  return best;
}
