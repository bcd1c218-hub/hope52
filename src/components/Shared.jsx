import { PALETTE } from "../palette.js";

export function StageTracker({ stage }) {
  const stages = ["원고 쓰기", "편집자 의견", "완성"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stages.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                backgroundColor: i <= stage ? PALETTE.gold : PALETTE.paperDeep,
                boxShadow: i === stage ? `0 0 0 4px ${PALETTE.goldSoft}` : "none",
              }}
            />
            <span
              className="text-xs tracking-wide"
              style={{
                color: i <= stage ? PALETTE.ink : PALETTE.textMuted,
                fontWeight: i === stage ? 700 : 500,
              }}
            >
              {label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div className="w-10 h-px mb-4" style={{ backgroundColor: PALETTE.paperDeep }} />
          )}
        </div>
      ))}
    </div>
  );
}

// AI가 글을 읽는 동안에만 보이는 표시입니다. (예전 '라디오 ON AIR' 표시를 바꿨어요.)
export function OnAirBadge({ active }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: PALETTE.inkSoft }}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: PALETTE.signal,
          animation: active ? "pulse-dot 1.4s ease-in-out infinite" : "none",
        }}
      />
      <span className="text-xs font-bold" style={{ color: PALETTE.goldSoft }}>
        AI가 읽는 중
      </span>
    </div>
  );
}
