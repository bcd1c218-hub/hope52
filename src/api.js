// 서버가 JSON이 아닌 답(예: "Request Entity Too Large")을 보내도 앱이 멈추지 않게 읽습니다.
async function readJson(res, fallbackMessage) {
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 413) throw new Error("사진이 너무 커서 보내지 못했어요. 사진을 한 장씩 올리거나, 조금 멀리서 다시 찍어 주세요.");
    throw new Error((data && data.error) || fallbackMessage);
  }
  if (!data) throw new Error(fallbackMessage);
  return data;
}

export async function requestOcr({ mediaType, base64 }) {
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mediaType, base64 }),
  });
  return readJson(res, "사진을 읽는 중 문제가 생겼어요.");
}

export async function requestFeedback({ text, activity, previous, options }) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, activity, previous, options }),
  });
  return readJson(res, "편집자 AI에게 원고를 보내는 중 문제가 생겼어요.");
}

export async function checkTeacherPassword(password) {
  const res = await fetch("/api/teacher-auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await readJson(res, "비밀번호를 확인하지 못했어요.");
  return data.ok === true;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    img.src = src;
  });
}

function splitDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error("이미지를 읽지 못했어요.");
  return { mediaType: match[1], base64: match[2] };
}

// 휴대폰 사진은 10MB가 넘기도 해서 서버가 받지 못합니다(Vercel 한도 약 4.5MB).
// 긴 변을 2000px 이하로 줄이고 JPEG로 다시 저장해 보통 1MB 안팎으로 만듭니다.
// 원고지 글씨를 읽기에는 2000px이면 충분합니다.
const MAX_SIDE = 2000;
const MAX_BASE64 = 3_500_000; // 서버 한도보다 넉넉히 작게

export async function fileToBase64(file) {
  const dataUrl = await readAsDataUrl(file);
  let img;
  try {
    img = await loadImage(dataUrl);
  } catch (e) {
    // 브라우저가 열지 못하는 형식(예: 일부 HEIC)은 원본 그대로 보내 봅니다.
    return splitDataUrl(dataUrl);
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const original = splitDataUrl(dataUrl);
  const isSmallEnough = Math.max(w, h) <= MAX_SIDE && original.base64.length <= MAX_BASE64;
  if (isSmallEnough && /^image\/(jpeg|png|webp|gif)$/.test(original.mediaType)) return original;

  let scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  let quality = 0.85;
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = splitDataUrl(canvas.toDataURL("image/jpeg", quality));
    if (out.base64.length <= MAX_BASE64) return out;
    scale *= 0.8;
    quality = Math.max(0.6, quality - 0.08);
  }
  throw new Error("사진이 너무 커서 보내지 못했어요. 조금 멀리서 다시 찍어 주세요.");
}
