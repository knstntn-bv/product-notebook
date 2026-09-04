export const GOAL_QUARTERS = ["current", "next", "halfYear"] as const;

export type GoalQuarter = (typeof GOAL_QUARTERS)[number];

export function isGoalQuarter(value: string): value is GoalQuarter {
  return (GOAL_QUARTERS as readonly string[]).includes(value);
}

export function cascadeInitiativeFromGoal(
  goals: readonly { id: string; initiative_id: string | null }[],
  goalId: string,
): { goal_id: string; initiative_id: string | null } {
  return {
    goal_id: goalId,
    initiative_id: goals.find((goal) => goal.id === goalId)?.initiative_id ?? null,
  };
}
