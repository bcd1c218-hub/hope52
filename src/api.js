export async function requestOcr({ mediaType, base64 }) {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mediaType, base64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "사진을 읽는 중 문제가 생겼어요.");
  return data;
}

export async function requestFeedback({ text, activity }) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, activity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "편집자 AI에게 원고를 보내는 중 문제가 생겼어요.");
  return data;
}

export async function checkTeacherPassword(password) {
  const res = await fetch("/api/teacher-auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "비밀번호를 확인하지 못했어요.");
  return data.ok === true;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const match = String(result).match(/^data:(.*);base64,(.*)$/);
      if (!match) {
        reject(new Error("이미지를 읽지 못했어요."));
        return;
      }
      resolve({ mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}
