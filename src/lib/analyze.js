// 학생 글의 변화와 피드백 반영을 살펴보기 위한 계산 함수들입니다.
// 화면을 그리지 않고 계산만 하므로, 숫자가 이상할 때 이 파일만 확인하면 됩니다.

import { ALL_FOCUS_LABELS, DEPTH_OPTIONS, SELF_LEVEL_LABEL, AI_LEVEL_LABEL } from "../data/feedbackOptions.js";

/* ──────────────────────────────────────────────
   1. 글자·문장 세기
   ────────────────────────────────────────────── */

// 공백을 뺀 글자 수를 셉니다. (원고지 칸 수와 비슷하게 보려고 공백을 뺐어요.)
export function countChars(text) {
  return String(text || "").replace(/\s/g, "").length;
}

// 문장 단위로 자릅니다. 마침표·물음표·느낌표와 줄바꿈을 기준으로 삼습니다.
// 옛 사파리에서도 동작하도록 정규식 lookbehind를 쓰지 않았습니다.
export function splitSentences(text) {
  const out = [];
  let cur = "";
  for (const ch of String(text || "")) {
    if (ch === "\n") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
    if (".!?。？！".indexOf(ch) !== -1) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* ──────────────────────────────────────────────
   2. 두 글 비교 (낱말 단위)
   ────────────────────────────────────────────── */

// 공백도 하나의 조각으로 남겨 두어, 다시 이어 붙이면 원래 글이 되도록 자릅니다.
export function tokenize(text) {
  return String(text || "").split(/(\s+)/).filter((t) => t !== "");
}

const MAX_TOKENS = 1500; // 글이 아주 길면 계산을 건너뛰어 화면이 멈추지 않게 합니다.

// 두 글을 비교해 [{ type: "same" | "del" | "ins", text }] 목록으로 돌려줍니다.
// del = 지워진 부분(이전 글에만 있음), ins = 새로 쓴 부분(지금 글에만 있음)
export function diffWords(prevText, nextText) {
  const a = tokenize(prevText);
  const b = tokenize(nextText);

  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) {
    // 너무 긴 글은 낱말 단위 비교 대신 통째로 보여 줍니다.
    return { tooLong: true, parts: [{ type: "same", text: nextText || "" }] };
  }

  // 가장 긴 공통 부분(LCS) 길이표를 만듭니다.
  const n = a.length;
  const m = b.length;
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // 표를 따라가며 같은 곳/지운 곳/더한 곳을 나눕니다.
  const parts = [];
  const push = (type, text) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", a[i]);
      i++;
    } else {
      push("ins", b[j]);
      j++;
    }
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("ins", b[j++]);

  return { tooLong: false, parts };
}

// 두 글 사이에 무엇이 달라졌는지 숫자와 문장으로 요약합니다.
export function changeSummary(prevText, nextText) {
  const prev = splitSentences(prevText);
  const next = splitSentences(nextText);
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const added = next.filter((s) => !prevSet.has(s));
  const removed = prev.filter((s) => !nextSet.has(s));

  const prevChars = countChars(prevText);
  const nextChars = countChars(nextText);
  const { parts, tooLong } = diffWords(prevText, nextText);
  const insChars = tooLong ? 0 : parts.filter((p) => p.type === "ins").reduce((s, p) => s + countChars(p.text), 0);
  const delChars = tooLong ? 0 : parts.filter((p) => p.type === "del").reduce((s, p) => s + countChars(p.text), 0);

  return {
    added,
    removed,
    keptCount: next.length - added.length,
    prevChars,
    nextChars,
    charDelta: nextChars - prevChars,
    prevSentences: prev.length,
    nextSentences: next.length,
    insChars,
    delChars,
    // 글을 얼마나 손봤는지 대략 보는 값입니다. (더한 글자 + 지운 글자) ÷ 이전 글자 수
    editRatio: prevChars > 0 ? (insChars + delChars) / prevChars : 0,
    tooLong,
  };
}

/* ──────────────────────────────────────────────
   3. 피드백 반영 추적
   ────────────────────────────────────────────── */

// 교사 판정을 저장할 때 쓰는 열쇠입니다. (회차 번호 : 질문 번호)
export function markKey(versionIndex, itemIndex) {
  return `${versionIndex}:${itemIndex}`;
}

export const MARK_LABEL = { yes: "반영함", partial: "조금 반영", no: "반영 안 함" };

// 한 학생의 제출물에서, 회차마다 "고른 질문 → 다음 회차의 변화"를 이어 붙입니다.
export function trackRounds(submission) {
  const versions = Array.isArray(submission?.versions) ? submission.versions : [];
  const marks = submission?.teacherMarks || {};
  return versions.map((v, i) => {
    const next = versions[i + 1] || null;
    const allItems = (v.plan && Array.isArray(v.plan.items) ? v.plan.items : []).map((it, k) => ({
      ...it,
      itemIndex: k,
      mark: marks[markKey(i, k)] || null,
    }));
    return {
      index: i,
      version: v,
      next,
      questions: Array.isArray(v.feedback?.detective_feedback) ? v.feedback.detective_feedback : [],
      chosen: allItems.filter((it) => it.will),
      planNote: (v.plan && v.plan.note) || "",
      change: next ? changeSummary(v.text, next.text) : null,
    };
  });
}

// 교사가 판정한 것만 모아 반영 비율을 냅니다. (판정하지 않은 것은 세지 않습니다.)
export function markStats(submissions) {
  let yes = 0;
  let partial = 0;
  let no = 0;
  let chosenTotal = 0;
  submissions.forEach((s) => {
    trackRounds(s).forEach((r) => {
      r.chosen.forEach((it) => {
        chosenTotal += 1;
        if (it.mark === "yes") yes += 1;
        else if (it.mark === "partial") partial += 1;
        else if (it.mark === "no") no += 1;
      });
    });
  });
  const judged = yes + partial + no;
  return {
    chosenTotal,
    judged,
    unjudged: chosenTotal - judged,
    yes,
    partial,
    no,
    rate: judged > 0 ? Math.round(((yes + partial * 0.5) / judged) * 100) : null,
  };
}

/* ──────────────────────────────────────────────
   4. 학급 전체 요약
   ────────────────────────────────────────────── */

function labelOfFocus(id) {
  const found = ALL_FOCUS_LABELS.find((f) => f.id === id);
  return found ? found.label : id;
}

export function summarize(submissions) {
  const list = Array.isArray(submissions) ? submissions : [];
  const byActivity = new Map();
  const byStudent = new Map();
  const focusCount = new Map();
  const depthCount = new Map();
  const selfLevelCount = new Map();
  const aiLevelCount = new Map();

  let versionTotal = 0;
  let completed = 0;
  let reflectionWritten = 0;
  let charsFirstTotal = 0;
  let charsLastTotal = 0;
  let growthSamples = 0;

  list.forEach((s) => {
    const versions = Array.isArray(s.versions) ? s.versions : [];
    versionTotal += versions.length;
    if (s.status === "completed") completed += 1;
    if (s.reflection && (s.reflection.changed || s.reflection.next)) reflectionWritten += 1;

    const actKey = s.activityLabel || "(코너 없음)";
    const act = byActivity.get(actKey) || { label: actKey, count: 0, rounds: 0, students: new Set() };
    act.count += 1;
    act.rounds += versions.length;
    act.students.add(studentKey(s));
    byActivity.set(actKey, act);

    const stuKey = studentKey(s);
    const stu = byStudent.get(stuKey) || {
      key: stuKey,
      studentNo: s.studentNo || null,
      studentName: s.studentName || "(이름 없음)",
      submissions: 0,
      rounds: 0,
      completed: 0,
      chosen: 0,
    };
    stu.submissions += 1;
    stu.rounds += versions.length;
    if (s.status === "completed") stu.completed += 1;
    versions.forEach((v) => {
      const items = v.plan && Array.isArray(v.plan.items) ? v.plan.items : [];
      stu.chosen += items.filter((it) => it.will).length;
    });
    byStudent.set(stuKey, stu);

    if (versions.length >= 2) {
      charsFirstTotal += countChars(versions[0].text);
      charsLastTotal += countChars(versions[versions.length - 1].text);
      growthSamples += 1;
    }

    versions.forEach((v) => {
      const opts = v.feedback?.options;
      if (opts) {
        (Array.isArray(opts.focus) ? opts.focus : []).forEach((f) => {
          focusCount.set(f, (focusCount.get(f) || 0) + 1);
        });
        if (opts.depth) depthCount.set(opts.depth, (depthCount.get(opts.depth) || 0) + 1);
        if (opts.selfLevel) selfLevelCount.set(opts.selfLevel, (selfLevelCount.get(opts.selfLevel) || 0) + 1);
      }
      if (v.feedback?.ai_level) aiLevelCount.set(v.feedback.ai_level, (aiLevelCount.get(v.feedback.ai_level) || 0) + 1);
    });
  });

  const rank = (map, labelFn) =>
    Array.from(map.entries())
      .map(([id, count]) => ({ id, label: labelFn(id), count }))
      .sort((a, b) => b.count - a.count);

  return {
    submissionCount: list.length,
    studentCount: byStudent.size,
    versionTotal,
    completed,
    reflectionWritten,
    avgRounds: list.length > 0 ? versionTotal / list.length : 0,
    activities: Array.from(byActivity.values())
      .map((a) => ({ label: a.label, count: a.count, rounds: a.rounds, students: a.students.size }))
      .sort((a, b) => b.count - a.count),
    students: Array.from(byStudent.values()).sort(compareStudents),
    focusRank: rank(focusCount, labelOfFocus),
    depthRank: rank(depthCount, (id) => DEPTH_OPTIONS.find((d) => d.id === id)?.label || id),
    selfLevelRank: rank(selfLevelCount, (id) => SELF_LEVEL_LABEL[id] || id),
    aiLevelRank: rank(aiLevelCount, (id) => AI_LEVEL_LABEL[id] || id),
    growth:
      growthSamples > 0
        ? { first: charsFirstTotal / growthSamples, last: charsLastTotal / growthSamples, samples: growthSamples }
        : null,
    marks: markStats(list),
  };
}

/* ──────────────────────────────────────────────
   5. 학생 구분과 정렬
   ────────────────────────────────────────────── */

// 같은 학생인지 가르는 열쇠입니다. 번호가 있으면 번호를 먼저 씁니다.
export function studentKey(s) {
  const no = s?.studentNo;
  const name = (s?.studentName || "").trim();
  return no ? `${String(no).padStart(2, "0")}·${name}` : name || "(이름 없음)";
}

export function studentLabel(s) {
  const no = s?.studentNo;
  const name = (s?.studentName || "(이름 없음)").trim();
  return no ? `${no}번 ${name}` : name;
}

export function compareStudents(a, b) {
  const an = Number(a.studentNo) || 999;
  const bn = Number(b.studentNo) || 999;
  if (an !== bn) return an - bn;
  return String(a.studentName || "").localeCompare(String(b.studentName || ""), "ko");
}

/* ──────────────────────────────────────────────
   6. 엑셀(CSV)로 내보내기
   ────────────────────────────────────────────── */

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatDate(value) {
  if (!value) return "";
  const d = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", { hour12: false });
}

export const CSV_HEADERS = [
  "번호",
  "이름",
  "코너",
  "회차",
  "전체회차수",
  "제출시각",
  "스스로 생각한 단계",
  "받고 싶은 부분",
  "알려 주는 방법",
  "코치에게 한마디",
  "질문 주제",
  "글자수(공백제외)",
  "이전 회차 대비 글자 변화",
  "AI 판단 수준",
  "AI 질문",
  "고쳐 볼래요로 고른 질문",
  "고치기 계획 메모",
  "교사 판정",
  "글 내용",
  "마무리: 달라진 곳",
  "마무리: 다음에 해 보고 싶은 것",
  "완료 여부",
];

// 회차 하나를 한 줄로 만들어, 엑셀에서 바로 정렬·필터할 수 있게 합니다.
export function toCsvRows(submissions) {
  const rows = [];
  (submissions || []).forEach((s) => {
    const versions = Array.isArray(s.versions) ? s.versions : [];
    const marks = s.teacherMarks || {};
    versions.forEach((v, i) => {
      const opts = v.feedback?.options || {};
      const questions = Array.isArray(v.feedback?.detective_feedback) ? v.feedback.detective_feedback : [];
      const items = v.plan && Array.isArray(v.plan.items) ? v.plan.items : [];
      const chosen = items.filter((it) => it.will);
      const prev = i > 0 ? versions[i - 1] : null;
      rows.push([
        s.studentNo || "",
        s.studentName || "",
        s.activityLabel || "",
        i + 1,
        versions.length,
        formatDate(v.submittedAt),
        SELF_LEVEL_LABEL[opts.selfLevel] || "",
        (Array.isArray(opts.focus) ? opts.focus : []).map(labelOfFocus).join(", "),
        DEPTH_OPTIONS.find((d) => d.id === opts.depth)?.label || "",
        opts.note || "",
        opts.topic || "",
        countChars(v.text),
        prev ? countChars(v.text) - countChars(prev.text) : "",
        AI_LEVEL_LABEL[v.feedback?.ai_level] || "",
        questions.map((q, k) => `${k + 1}. (${q.category}) ${q.question}`).join("\n"),
        chosen.map((it) => `(${it.category}) ${it.question}`).join("\n"),
        (v.plan && v.plan.note) || "",
        chosen
          .map((it) => MARK_LABEL[marks[markKey(i, items.indexOf(it))]] || "미판정")
          .join(", "),
        v.text || "",
        i === versions.length - 1 ? s.reflection?.changed || "" : "",
        i === versions.length - 1 ? s.reflection?.next || "" : "",
        i === versions.length - 1 ? (s.status === "completed" ? "완료" : "쓰는 중") : "",
      ]);
    });
  });
  return rows;
}

export function buildCsv(submissions) {
  const rows = toCsvRows(submissions);
  const lines = [CSV_HEADERS, ...rows].map((r) => r.map(csvCell).join(","));
  // 엑셀이 한글을 깨뜨리지 않도록 맨 앞에 BOM을 붙입니다.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(submissions, filename) {
  const blob = new Blob([buildCsv(submissions)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "글쓰기기록.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
