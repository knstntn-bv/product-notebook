import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Archive, ArchiveRestore } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { EntityDialog } from "@/components/EntityDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsKey, requireProductId, useGoalsQuery, type GoalRow } from "@/lib/productQueries";
import { archiveRow, compareArchivedLast, compareByPriorityThenArchive, visibleByArchive } from "@/lib/archive";
import { GOAL_QUARTERS, isGoalQuarter, type GoalQuarter } from "@/lib/goals";
import { errorToast } from "@/lib/errorToast";
import { DEFAULT_INITIATIVE_COLOR } from "@/lib/initiatives";
import { applyOptimisticUpdate, rollbackOptimisticUpdate } from "@/lib/optimisticQuery";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

const QUARTER_LABELS: Record<GoalQuarter, string> = {
  current: "Current Quarter",
  next: "Next Quarter",
  halfYear: "Next Half-Year",
};

const RoadmapPage = () => {
  const { initiatives, metrics, showArchived, currentProductId } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingGoal, setEditingGoal] = useState<Partial<GoalRow> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const quarters = GOAL_QUARTERS.map((id) => ({ id, label: QUARTER_LABELS[id] }));

  const { data: goals = [] } = useGoalsQuery(currentProductId);

  // Save goal mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (goal: Partial<GoalRow>) => {
      const productId = requireProductId(currentProductId);

      if (goal.id) {
        const { error } = await supabase
          .from("goals")
          .update({
            goal: goal.goal,
            expected_result: goal.expected_result,
            achieved_result: goal.achieved_result,
            done: goal.done,
            target_metrics: goal.target_metrics,
            quarter: goal.quarter,
            archived: goal.archived,
            archived_at: goal.archived_at,
          })
          .eq("id", goal.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("goals")
          .insert({
            product_id: productId,
            initiative_id: goal.initiative_id!,
            goal: goal.goal!,
            expected_result: goal.expected_result || "",
            achieved_result: goal.achieved_result || "",
            done: goal.done || false,
            target_metrics: goal.target_metrics || [],
            quarter: goal.quarter!,
            archived: false,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKey(currentProductId) });
      setEditingGoal(null);
      setIsDialogOpen(false);
      toast({ title: "Goal saved successfully" });
    },
    onError: errorToast,
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKey(currentProductId) });
      setEditingGoal(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Goal deleted successfully" });
    },
    onError: errorToast,
  });

  // Archive goal mutation
  const archiveGoalMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const productId = requireProductId(currentProductId);
      return archiveRow("goals", id, archived, productId);
    },
    onSuccess: (fields, variables) => {
      queryClient.invalidateQueries({ queryKey: goalsKey(currentProductId) });
      if (editingGoal?.id === variables.id) {
        setEditingGoal({
          ...editingGoal,
          archived: fields.archived,
          archived_at: fields.archived_at,
        });
      }
      toast({
        title: fields.archived ? "Goal archived successfully" : "Goal unarchived successfully",
      });
    },
    onError: errorToast,
  });

  // Move goal mutation - optimistic update is handled in handleDragEnd
  const moveGoalMutation = useMutation({
    mutationFn: async ({ id, initiative_id, quarter }: { id: string; initiative_id: string; quarter: GoalQuarter }) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("goals")
        .update({ initiative_id, quarter })
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onError: (error) => errorToast(error, "Error moving goal"),
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: goalsKey(currentProductId) });
    },
  });

  const createGoal = (initiativeId: string, quarter: GoalQuarter) => {
    setEditingGoal({
      goal: "",
      expected_result: "",
      achieved_result: "",
      done: false,
      target_metrics: [],
      initiative_id: initiativeId,
      quarter,
      archived: false,
    });
    setIsDialogOpen(true);
  };

  const saveGoal = () => {
    if (editingGoal?.goal) {
      saveGoalMutation.mutate(editingGoal);
    }
  };

  const getGoalsForCell = (initiativeId: string, quarter: GoalQuarter) => {
    const cellGoals = goals.filter(i => i.initiative_id === initiativeId && i.quarter === quarter);
    return visibleByArchive(cellGoals, showArchived).sort(compareArchivedLast);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetInitiativeId: string | null = null;
    let targetQuarter: GoalQuarter | null = null;

    // Case 1: Dropped directly on a cell
    if (overId.startsWith("cell-")) {
      const parts = overId.substring(5).split("-"); // Remove "cell-" prefix
      const last = parts[parts.length - 1];
      targetQuarter = isGoalQuarter(last) ? last : null;
      targetInitiativeId = parts.slice(0, -1).join("-"); // Everything except the last part
    }
    // Case 2: Dropped on another card - find which cell that card belongs to
    else {
      const targetGoal = goals.find(i => i.id === overId);
      if (targetGoal) {
        targetInitiativeId = targetGoal.initiative_id;
        targetQuarter = isGoalQuarter(targetGoal.quarter) ? targetGoal.quarter : null;
      }
    }

    // If we found a valid target cell, move the goal
    if (targetInitiativeId && targetQuarter) {
      const activeGoal = goals.find(i => i.id === activeId);
      
      if (activeGoal && (activeGoal.initiative_id !== targetInitiativeId || activeGoal.quarter !== targetQuarter)) {
        const previous = applyOptimisticUpdate(queryClient, goalsKey(currentProductId), (goals) =>
          goals.map((goal) =>
            goal.id === activeId
              ? { ...goal, initiative_id: targetInitiativeId, quarter: targetQuarter }
              : goal,
          ),
        );

        moveGoalMutation.mutate(
          {
            id: activeId,
            initiative_id: targetInitiativeId,
            quarter: targetQuarter,
          },
          {
            onError: () => {
              rollbackOptimisticUpdate(queryClient, goalsKey(currentProductId), previous);
            },
          }
        );
      }
    }
  };

  const activeGoal = activeId ? goals.find(i => i.id === activeId) : null;

  // Draggable Goal Card Component
  const DraggableGoalCard = ({ goal }: { goal: GoalRow }) => {
    const isArchived = goal.archived || false;
    const initiativeColor =
      initiatives.find((initiative) => initiative.id === goal.initiative_id)?.color || DEFAULT_INITIATIVE_COLOR;
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useSortable({ id: goal.id, disabled: isArchived });
    
    // Disable transition completely to prevent return animation
    // Optimistic update happens immediately, so no animation needed
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: 'none', // Explicitly disable transitions
      opacity: isDragging ? 0.5 : (isArchived ? 0.5 : 1),
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card
          className={cn(
            "relative cursor-grab overflow-hidden active:cursor-grabbing hover:shadow-md transition-shadow",
            isDragging && "ring-2 ring-primary",
            isArchived && "opacity-50"
          )}
          onClick={(e) => {
            if (!isDragging) {
              e.stopPropagation();
              setEditingGoal(goal);
              setIsDialogOpen(true);
            }
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: initiativeColor }}
          />
          <CardContent className="p-3 pl-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-sm font-bold", isArchived && "text-muted-foreground")}>
                  {goal.goal || "Untitled Goal"}
                </p>
                <div className="flex gap-1">
                  {isArchived && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Archived</span>
                  )}
                  {goal.done && (
                    <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                  )}
                </div>
              </div>
              {goal.expected_result && (
                <div className={cn("text-xs whitespace-pre-line", isArchived && "text-muted-foreground")}>
                  {goal.expected_result}
                </div>
              )}
              {goal.achieved_result && (
                <div className={cn("text-xs whitespace-pre-line", isArchived && "text-muted-foreground")}>
                  {goal.achieved_result}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Droppable Cell Component
  const DroppableCell = ({ 
    initiativeId, 
    quarter, 
    children 
  }: { 
    initiativeId: string; 
    quarter: GoalQuarter;
    children: ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${initiativeId}-${quarter}`,
    });

    return (
      <td 
        ref={setNodeRef}
        className={cn(
          "border border-border bg-card p-4 align-top",
          isOver && "bg-muted/50"
        )}
      >
        {children}
      </td>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border bg-muted p-4 text-left font-semibold">Initiative</th>
                {quarters.map(quarter => (
                  <th key={quarter.id} className="border border-border bg-muted p-4 text-left font-semibold">
                    {quarter.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleByArchive(initiatives, showArchived)
                .sort(compareByPriorityThenArchive)
                .map(initiative => (
                <tr key={initiative.id}>
                  <td className="border border-border bg-card p-4 font-medium relative pl-4">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: initiative.color || DEFAULT_INITIATIVE_COLOR }}
                    />
                    {initiative.name}
                  </td>
                  {quarters.map(quarter => {
                    const cellGoals = getGoalsForCell(initiative.id, quarter.id);
                    return (
                      <DroppableCell key={quarter.id} initiativeId={initiative.id} quarter={quarter.id}>
                        <div className="space-y-2 min-h-[200px]">
                          <SortableContext
                            items={cellGoals.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {cellGoals.map(goal => (
                              <DraggableGoalCard key={goal.id} goal={goal} />
                            ))}
                          </SortableContext>
                          <Button
                            variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => createGoal(initiative.id, quarter.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Goal
                            </Button>
                        </div>
                      </DroppableCell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <EntityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Goal Details"
        onSave={saveGoal}
        onDelete={editingGoal?.id ? () => setDeleteAlertOpen(true) : undefined}
        onArchive={editingGoal?.id ? () => {
          const isArchived = editingGoal.archived || false;
          archiveGoalMutation.mutate({ id: editingGoal.id!, archived: !isArchived });
        } : undefined}
        isEditing={!!editingGoal?.id}
        saveLabel="Save Goal"
        isArchived={editingGoal?.archived || false}
        leftContent={editingGoal && (
          <>
            <div>
              <Label htmlFor="goal">Goal *</Label>
              <Input
                id="goal"
                value={editingGoal.goal || ""}
                onChange={(e) => setEditingGoal({ ...editingGoal, goal: e.target.value })}
                placeholder="Enter goal..."
              />
            </div>
            <div>
              <Label htmlFor="expectedResult">Expected Result</Label>
              <Textarea
                id="expectedResult"
                value={editingGoal.expected_result ?? ""}
                onChange={(e) => setEditingGoal({ ...editingGoal, expected_result: e.target.value })}
                placeholder="Enter expected result..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="achievedResult">Achieved Result</Label>
              <Textarea
                id="achievedResult"
                value={editingGoal.achieved_result ?? ""}
                onChange={(e) => setEditingGoal({ ...editingGoal, achieved_result: e.target.value })}
                placeholder="Enter achieved result..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="targetMetrics">Target Metrics</Label>
              <MetricTagInput
                value={editingGoal.target_metrics || []}
                onChange={(tags) => setEditingGoal({ ...editingGoal, target_metrics: tags })}
                suggestions={metrics.map(m => m.name).filter(Boolean)}
                placeholder="Type to add metrics..."
              />
            </div>
          </>
        )}
        rightContent={editingGoal && (
          <>
            <div>
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={editingGoal.quarter as GoalQuarter | undefined}
                onValueChange={(value: GoalQuarter) => setEditingGoal({ ...editingGoal, quarter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map(quarter => (
                    <SelectItem key={quarter.id} value={quarter.id}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="done"
                checked={!!editingGoal.done}
                onCheckedChange={(checked) => setEditingGoal({ ...editingGoal, done: checked as boolean })}
              />
              <Label htmlFor="done">Done</Label>
            </div>
          </>
        )}
      />

      <ConfirmDeleteDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        title="Delete Goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        onConfirm={() => editingGoal?.id && deleteGoalMutation.mutate(editingGoal.id)}
      />
      </div>

      <DragOverlay>
        {activeGoal ? (
          <Card className="relative w-64 overflow-hidden opacity-90">
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{
                backgroundColor:
                  initiatives.find((initiative) => initiative.id === activeGoal.initiative_id)?.color ||
                  DEFAULT_INITIATIVE_COLOR,
              }}
            />
            <CardContent className="p-3 pl-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-bold", activeGoal.archived && "text-muted-foreground")}>
                    {activeGoal.goal || "Untitled Goal"}
                  </p>
                  <div className="flex gap-1">
                    {activeGoal.archived && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Archived</span>
                    )}
                    {activeGoal.done && (
                      <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                    )}
                  </div>
                </div>
                {activeGoal.expected_result && (
                  <div className={cn("text-xs whitespace-pre-line", activeGoal.archived && "text-muted-foreground")}>
                    {activeGoal.expected_result}
                  </div>
                )}
                {activeGoal.achieved_result && (
                  <div className={cn("text-xs whitespace-pre-line", activeGoal.archived && "text-muted-foreground")}>
                    {activeGoal.achieved_result}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default RoadmapPage;
