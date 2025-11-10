import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  goal: string;
  expected_result: string;
  achieved_result: string;
  done: boolean;
  target_metrics: string[];
  initiative_id: string;
  quarter: "current" | "next" | "halfYear";
}

const RoadmapPage = () => {
  const { initiatives, metrics, isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingGoal, setEditingGoal] = useState<Partial<Goal> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isReadOnly ? 999999 : 8, // Effectively disable drag in read-only mode
      },
    })
  );

  const quarters = [
    { id: "current", label: "Current Quarter" },
    { id: "next", label: "Next Quarter" },
    { id: "halfYear", label: "Next Half-Year" },
  ];

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Save goal mutation
  const saveGoalMutation = useMutation({
    mutationFn: async (goal: Partial<Goal>) => {
      if (!user) throw new Error("No user");
      
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
          })
          .eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("goals")
          .insert({
            user_id: user.id,
            initiative_id: goal.initiative_id!,
            goal: goal.goal!,
            expected_result: goal.expected_result || "",
            achieved_result: goal.achieved_result || "",
            done: goal.done || false,
            target_metrics: goal.target_metrics || [],
            quarter: goal.quarter!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditingGoal(null);
      setIsDialogOpen(false);
      toast({ title: "Goal saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditingGoal(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Goal deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Move goal mutation (for drag and drop) with optimistic updates
  const moveGoalMutation = useMutation({
    mutationFn: async ({ id, initiative_id, quarter }: { id: string; initiative_id: string; quarter: "current" | "next" | "halfYear" }) => {
      const { error } = await supabase
        .from("goals")
        .update({ initiative_id, quarter })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, initiative_id, quarter }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["goals", effectiveUserId] });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData<Goal[]>(["goals", effectiveUserId]);

      // Optimistically update to the new value
      if (previousGoals) {
        const updatedGoals = previousGoals.map(goal =>
          goal.id === id
            ? { ...goal, initiative_id, quarter }
            : goal
        );
        queryClient.setQueryData<Goal[]>(["goals", effectiveUserId], updatedGoals);
      }

      // Return context with the snapshotted value
      return { previousGoals };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousGoals) {
        queryClient.setQueryData<Goal[]>(["goals", effectiveUserId], context.previousGoals);
      }
      toast({ title: "Error moving goal", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: ["goals", effectiveUserId] });
    },
  });

  const createGoal = (initiativeId: string, quarter: "current" | "next" | "halfYear") => {
    setEditingGoal({
      goal: "",
      expected_result: "",
      achieved_result: "",
      done: false,
      target_metrics: [],
      initiative_id: initiativeId,
      quarter,
    });
    setIsDialogOpen(true);
  };

  const saveGoal = () => {
    if (editingGoal?.goal) {
      saveGoalMutation.mutate(editingGoal);
    }
  };

  const getGoalsForCell = (initiativeId: string, quarter: "current" | "next" | "halfYear") => {
    return goals.filter(i => i.initiative_id === initiativeId && i.quarter === quarter);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || isReadOnly) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetInitiativeId: string | null = null;
    let targetQuarter: "current" | "next" | "halfYear" | null = null;

    // Case 1: Dropped directly on a cell
    if (overId.startsWith("cell-")) {
      const parts = overId.substring(5).split("-"); // Remove "cell-" prefix
      targetQuarter = parts[parts.length - 1] as "current" | "next" | "halfYear";
      targetInitiativeId = parts.slice(0, -1).join("-"); // Everything except the last part
    }
    // Case 2: Dropped on another card - find which cell that card belongs to
    else {
      const targetGoal = goals.find(i => i.id === overId);
      if (targetGoal) {
        targetInitiativeId = targetGoal.initiative_id;
        targetQuarter = targetGoal.quarter as "current" | "next" | "halfYear";
      }
    }

    // If we found a valid target cell, move the goal
    if (targetInitiativeId && targetQuarter) {
      const activeGoal = goals.find(i => i.id === activeId);
      
      if (activeGoal && (activeGoal.initiative_id !== targetInitiativeId || activeGoal.quarter !== targetQuarter)) {
        moveGoalMutation.mutate({
          id: activeId,
          initiative_id: targetInitiativeId,
          quarter: targetQuarter,
        });
      }
    }
  };

  const activeGoal = activeId ? goals.find(i => i.id === activeId) : null;

  // Draggable Goal Card Component
  const DraggableGoalCard = ({ goal }: { goal: Goal }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: goal.id, disabled: isReadOnly });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card
          className={cn(
            isReadOnly ? "" : "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
            isDragging && "ring-2 ring-primary"
          )}
          onClick={(e) => {
            if (!isReadOnly && !isDragging) {
              e.stopPropagation();
              setEditingGoal(goal);
              setIsDialogOpen(true);
            }
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{goal.goal || "Untitled Goal"}</p>
                {goal.done && (
                  <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                )}
              </div>
              {goal.expected_result && (
                <div className="text-xs whitespace-pre-line">{goal.expected_result}</div>
              )}
              {goal.achieved_result && (
                <div className="text-xs whitespace-pre-line">{goal.achieved_result}</div>
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
    quarter: "current" | "next" | "halfYear";
    children: ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${initiativeId}-${quarter}`,
      disabled: isReadOnly,
    });

    return (
      <td 
        ref={setNodeRef}
        className={cn(
          "border border-border bg-card p-4 align-top",
          isOver && !isReadOnly && "bg-muted/50"
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
      <div className="space-y-6">
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
              {initiatives.map(initiative => (
                <tr key={initiative.id}>
                  <td className="border border-border bg-card p-4 font-medium relative pl-4">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: initiative.color || "#8B5CF6" }}
                    />
                    {initiative.name}
                  </td>
                  {quarters.map(quarter => {
                    const cellGoals = getGoalsForCell(initiative.id, quarter.id as any);
                    return (
                      <DroppableCell key={quarter.id} initiativeId={initiative.id} quarter={quarter.id as any}>
                        <div className="space-y-2 min-h-[200px]">
                          <SortableContext
                            items={cellGoals.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {cellGoals.map(goal => (
                              <DraggableGoalCard key={goal.id} goal={goal as Goal} />
                            ))}
                          </SortableContext>
                          {!isReadOnly && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => createGoal(initiative.id, quarter.id as any)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Goal
                            </Button>
                          )}
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
        isEditing={!!editingGoal?.id}
        saveLabel="Save Goal"
      >
        {editingGoal && (
          <>
            <div>
              <Label htmlFor="goal">Goal *</Label>
              <Input
                id="goal"
                value={editingGoal.goal}
                onChange={(e) => setEditingGoal({ ...editingGoal, goal: e.target.value })}
                placeholder="Enter goal..."
              />
            </div>
            <div>
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={editingGoal.quarter}
                onValueChange={(value) => setEditingGoal({ ...editingGoal, quarter: value as any })}
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
            <div>
              <Label htmlFor="expectedResult">Expected Result</Label>
              <Textarea
                id="expectedResult"
                value={editingGoal.expected_result}
                onChange={(e) => setEditingGoal({ ...editingGoal, expected_result: e.target.value })}
                placeholder="Enter expected result..."
              />
            </div>
            <div>
              <Label htmlFor="achievedResult">Achieved Result</Label>
              <Textarea
                id="achievedResult"
                value={editingGoal.achieved_result}
                onChange={(e) => setEditingGoal({ ...editingGoal, achieved_result: e.target.value })}
                placeholder="Enter achieved result..."
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="done"
                checked={editingGoal.done}
                onCheckedChange={(checked) => setEditingGoal({ ...editingGoal, done: checked as boolean })}
              />
              <Label htmlFor="done">Done</Label>
            </div>
          </>
        )}
      </EntityDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingGoal?.id && deleteGoalMutation.mutate(editingGoal.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      <DragOverlay>
        {activeGoal ? (
          <Card className="w-64 opacity-90">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold">{activeGoal.goal || "Untitled Goal"}</p>
                  {activeGoal.done && (
                    <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                  )}
                </div>
                {activeGoal.expected_result && (
                  <div className="text-xs whitespace-pre-line">{activeGoal.expected_result}</div>
                )}
                {activeGoal.achieved_result && (
                  <div className="text-xs whitespace-pre-line">{activeGoal.achieved_result}</div>
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
