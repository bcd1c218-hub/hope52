// AI가 준 맞춤법·띄어쓰기 안내(copyedit_fixes) 중 믿기 어려운 것을 서버에서 걸러 냅니다.
// 안내 한 줄은 보통 "- '됬다' → '됐다'로 고쳐주세요." 모양이에요.
//  1) 학생 글에 실제로 없는 표현을 고치라는 것 → 뺍니다 (AI가 잘못 옮겨 적은 것)
//  2) 지난번에 "A → B"로 고치라고 해서 학생이 B로 고쳤는데, 이번에 "B → A"나 "B → C"로 다시 바꾸라는 것 → 뺍니다
//  3) 고치기 전과 후가 똑같은 것, 같은 안내가 두 번 나온 것 → 뺍니다
// 형식을 읽을 수 없는 안내는 그대로 둡니다.

const Q = "['‘’\"“”]";
const PAIR = new RegExp(`${Q}([^'‘’"“”]+)${Q}\\s*(?:→|->|=>|⇒)\\s*${Q}([^'‘’"“”]+)${Q}`);

export function parseFix(line) {
  const m = String(line || "").match(PAIR);
  return m ? { from: m[1].trim(), to: m[2].trim() } : null;
}

export function filterCopyedits(fixes, text, pastFixes) {
  if (!Array.isArray(fixes)) return fixes;
  const past = (Array.isArray(pastFixes) ? pastFixes : []).map(parseFix).filter(Boolean);
  const body = String(text || "");
  const seen = new Set();
  return fixes.filter((line) => {
    const p = parseFix(line);
    if (!p) return true;
    if (!p.from || p.from === p.to) return false;
    if (body && !body.includes(p.from)) return false;
    if (past.some((q) => q.to === p.from)) return false; // 지난번에 고치라고 한 모양을 또 바꾸라는 안내
    const key = `${p.from}→${p.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
