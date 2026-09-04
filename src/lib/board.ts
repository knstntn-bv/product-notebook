export const BOARD_COLUMNS = [
  { id: "inbox", label: "Inbox" },
  { id: "discovery", label: "Discovery" },
  { id: "backlog", label: "Backlog" },
  { id: "design", label: "Design & Analysis" },
  { id: "development", label: "Development & Testing" },
  { id: "onHold", label: "On Hold / Blocked" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number]["id"];

const BOARD_COLUMN_IDS = new Set<string>(BOARD_COLUMNS.map((column) => column.id));

const TERMINAL_BOARD_COLUMN_IDS = new Set<BoardColumnId>(["done", "cancelled"]);

export function isBoardColumnId(value: string): value is BoardColumnId {
  return BOARD_COLUMN_IDS.has(value);
}

export function boardColumnLabel(id: string): string {
  return BOARD_COLUMNS.find((column) => column.id === id)?.label ?? id;
}

export function isTerminalBoardColumn(id: string): boolean {
  return isBoardColumnId(id) && TERMINAL_BOARD_COLUMN_IDS.has(id);
}

export function applyClosedAt(column: string | null | undefined): string | null {
  if (column && isTerminalBoardColumn(column)) return new Date().toISOString();
  return null;
}
