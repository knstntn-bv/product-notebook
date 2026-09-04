import type { HypothesisRow } from "@/lib/productQueries";

export const HYPOTHESIS_STATUSES = [
  { value: "new", label: "New" },
  { value: "inProgress", label: "In Progress" },
  { value: "accepted", label: "Accepted" },
  { value: "done", label: "Done" },
  { value: "rejected", label: "Rejected" },
] as const;

export type HypothesisStatus = (typeof HYPOTHESIS_STATUSES)[number]["value"];

export const DEFAULT_HYPOTHESIS_PRIORITY = 3;

export const hypothesisStatusOrder: Record<HypothesisStatus, number> = {
  new: 1,
  inProgress: 2,
  accepted: 3,
  done: 4,
  rejected: 5,
};

export type HypothesisFormValue = {
  id?: string;
  status: HypothesisStatus;
  priority: number;
  insight: string;
  problem_hypothesis: string;
  problem_validation: string;
  solution_hypothesis: string;
  solution_validation: string;
  impact_metrics: string[];
};

export function emptyHypothesisForm(): HypothesisFormValue {
  return {
    status: "new",
    priority: DEFAULT_HYPOTHESIS_PRIORITY,
    insight: "",
    problem_hypothesis: "",
    problem_validation: "",
    solution_hypothesis: "",
    solution_validation: "",
    impact_metrics: [],
  };
}

export function hypothesisStatusLabel(status: string): string {
  return HYPOTHESIS_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function hypothesisStatusSortValue(status: string): number {
  if (status in hypothesisStatusOrder) {
    return hypothesisStatusOrder[status as HypothesisStatus];
  }
  return 99;
}

export function hypothesisRowToForm(row: HypothesisRow): HypothesisFormValue {
  return {
    id: row.id,
    status: (row.status in hypothesisStatusOrder
      ? row.status
      : "new") as HypothesisStatus,
    priority: row.priority ?? DEFAULT_HYPOTHESIS_PRIORITY,
    insight: row.insight || "",
    problem_hypothesis: row.problem_hypothesis || "",
    problem_validation: row.problem_validation || "",
    solution_hypothesis: row.solution_hypothesis || "",
    solution_validation: row.solution_validation || "",
    impact_metrics: Array.isArray(row.impact_metrics) ? row.impact_metrics : [],
  };
}

/** Priority field: integer 1–99 after trim; empty or non-integer / out of range → invalid. */
export function parseHypothesisPriorityInput(
  raw: string,
): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 99) return { ok: false };
  return { ok: true, value: n };
}
