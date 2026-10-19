import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

const CUSTOM_ACTIVITIES = "customActivities";

// 선생님이 "자유 코너"를 만들면 모두가 볼 수 있도록 저장합니다.
export async function saveCustomActivity({ label, writingPrompt, contentFocus }) {
  const ref = await addDoc(collection(db, CUSTOM_ACTIVITIES), {
    label,
    writingPrompt,
    contentFocus,
    tagline: "선생님이 만든 코너",
    icon: "PenLine",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// 저장된 모든 자유 코너를 불러옵니다. (기본 코너 목록과 합쳐서 보여줍니다)
export async function fetchCustomActivities() {
  const snap = await getDocs(collection(db, CUSTOM_ACTIVITIES));
  const list = snap.docs.map((d) => ({ id: d.id, isCustom: true, tagline: "선생님이 만든 코너", ...d.data() }));
  const millis = (a) => (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
  return list.sort((a, b) => millis(a) - millis(b));
}

// 코너를 삭제합니다. (이미 학생이 쓴 글은 지워지지 않아요.)
export async function deleteCustomActivity(id) {
  await deleteDoc(doc(db, CUSTOM_ACTIVITIES, id));
}
