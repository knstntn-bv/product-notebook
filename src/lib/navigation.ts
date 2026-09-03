import { FileText, Lightbulb, Map, Paperclip, Trello, type LucideIcon } from "lucide-react";

export type AppSection = "strategy" | "roadmap" | "hypotheses" | "board" | "attachments";

export interface NavItem {
  section: AppSection;
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { section: "strategy", path: "/strategy", label: "Strategy", icon: FileText },
  { section: "roadmap", path: "/roadmap", label: "Roadmap", icon: Map },
  { section: "hypotheses", path: "/hypotheses", label: "Hypotheses", icon: Lightbulb },
  { section: "board", path: "/board", label: "Board", icon: Trello },
  { section: "attachments", path: "/attachments", label: "Attachments", icon: Paperclip },
];

export const DEFAULT_SECTION_PATH = "/strategy";

export function isBoardPath(pathname: string): boolean {
  return pathname.endsWith("/board");
}

export function getNavLabelFromPath(pathname: string): string {
  const item = NAV_ITEMS.find(
    (nav) => pathname === nav.path || pathname.endsWith(nav.path),
  );
  return item?.label ?? "Product Notebook";
}
