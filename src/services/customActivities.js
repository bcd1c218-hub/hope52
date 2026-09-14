import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

const CUSTOM_ACTIVITIES = "customActivities";

// 선생님이 "자유 코너"를 만들면 모두가 볼 수 있도록 저장합니다.
export async function saveCustomActivity({ label, writingPrompt, contentFocus }) {
  const ref = await addDoc(collection(db, CUSTOM_ACTIVITIES), {
    label,
    writingPrompt,
    contentFocus,
    icon: "PenLine",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// 저장된 모든 자유 코너를 불러옵니다. (기본 코너 목록과 합쳐서 보여줍니다)
export async function fetchCustomActivities() {
  const snap = await getDocs(collection(db, CUSTOM_ACTIVITIES));
  return snap.docs.map((d) => ({ id: d.id, isCustom: true, ...d.data() }));
}
