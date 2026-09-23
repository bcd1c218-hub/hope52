import { Mic, BookOpen, BookMarked, Megaphone, PenLine, Monitor } from "lucide-react";

export const ICON_MAP = {
  Mic,
  BookOpen,
  BookMarked,
  Megaphone,
  PenLine,
  Monitor,
};

export function getIcon(name) {
  return ICON_MAP[name] || PenLine;
}
