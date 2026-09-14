import { Mic, BookOpen, BookMarked, Megaphone, PenLine } from "lucide-react";

export const ICON_MAP = {
  Mic,
  BookOpen,
  BookMarked,
  Megaphone,
  PenLine,
};

export function getIcon(name) {
  return ICON_MAP[name] || PenLine;
}
