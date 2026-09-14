export const PALETTE = {
  ink: "#26221D",
  inkSoft: "#3A342C",
  paper: "#F7F1E4",
  paperDeep: "#EFE6D2",
  gold: "#C08A24",
  goldSoft: "#E3C583",
  signal: "#B23A2E",
  detective: "#3B5166",
  detectiveSoft: "#E4EAEF",
  structure: "#7A5C3E",
  structureSoft: "#EFE3D3",
  content: "#5E7A4E",
  contentSoft: "#E5EEDD",
  copyedit: "#4F6B4F",
  copyeditSoft: "#E5EEE3",
  text: "#2B2621",
  textMuted: "#6B6255",
};

export const GRID_BG = {
  backgroundImage:
    "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(43,38,33,0.07) 27px, rgba(43,38,33,0.07) 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(43,38,33,0.07) 27px, rgba(43,38,33,0.07) 28px)",
  backgroundSize: "28px 28px",
};

export const CATEGORY_STYLE = {
  "내용": { bg: PALETTE.contentSoft, fg: PALETTE.content, label: "내용" },
  "구성": { bg: PALETTE.structureSoft, fg: PALETTE.structure, label: "구성" },
  "표현": { bg: PALETTE.detectiveSoft, fg: PALETTE.detective, label: "표현" },
};
