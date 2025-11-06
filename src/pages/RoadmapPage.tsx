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

interface Initiative {
  id: string;
  goal: string;
  expected_result: string;
  achieved_result: string;
  done: boolean;
  target_metrics: string[];
  track_id: string;
  quarter: "current" | "next" | "halfYear";
}

const RoadmapPage = () => {
  const { tracks, metrics, isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingInitiative, setEditingInitiative] = useState<Partial<Initiative> | null>(null);
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

  // Fetch initiatives
  const { data: initiatives = [] } = useQuery({
    queryKey: ["initiatives", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Save initiative mutation
  const saveInitiativeMutation = useMutation({
    mutationFn: async (initiative: Partial<Initiative>) => {
      if (!user) throw new Error("No user");
      
      if (initiative.id) {
        const { error } = await supabase
          .from("initiatives")
          .update({
            goal: initiative.goal,
            expected_result: initiative.expected_result,
            achieved_result: initiative.achieved_result,
            done: initiative.done,
            target_metrics: initiative.target_metrics,
            quarter: initiative.quarter,
          })
          .eq("id", initiative.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("initiatives")
          .insert({
            user_id: user.id,
            track_id: initiative.track_id!,
            goal: initiative.goal!,
            expected_result: initiative.expected_result || "",
            achieved_result: initiative.achieved_result || "",
            done: initiative.done || false,
            target_metrics: initiative.target_metrics || [],
            quarter: initiative.quarter!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setEditingInitiative(null);
      setIsDialogOpen(false);
      toast({ title: "Initiative saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete initiative mutation
  const deleteInitiativeMutation = useMutation({
    mutationFn: async (initiativeId: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("initiatives")
        .delete()
        .eq("id", initiativeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setEditingInitiative(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Initiative deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Move initiative mutation (for drag and drop) with optimistic updates
  const moveInitiativeMutation = useMutation({
    mutationFn: async ({ id, track_id, quarter }: { id: string; track_id: string; quarter: "current" | "next" | "halfYear" }) => {
      const { error } = await supabase
        .from("initiatives")
        .update({ track_id, quarter })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, track_id, quarter }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["initiatives", effectiveUserId] });

      // Snapshot the previous value
      const previousInitiatives = queryClient.getQueryData<Initiative[]>(["initiatives", effectiveUserId]);

      // Optimistically update to the new value
      if (previousInitiatives) {
        const updatedInitiatives = previousInitiatives.map(initiative =>
          initiative.id === id
            ? { ...initiative, track_id, quarter }
            : initiative
        );
        queryClient.setQueryData<Initiative[]>(["initiatives", effectiveUserId], updatedInitiatives);
      }

      // Return context with the snapshotted value
      return { previousInitiatives };
    },
    onError: (error: any, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInitiatives) {
        queryClient.setQueryData<Initiative[]>(["initiatives", effectiveUserId], context.previousInitiatives);
      }
      toast({ title: "Error moving initiative", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: ["initiatives", effectiveUserId] });
    },
  });

  const createInitiative = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    setEditingInitiative({
      goal: "",
      expected_result: "",
      achieved_result: "",
      done: false,
      target_metrics: [],
      track_id: trackId,
      quarter,
    });
    setIsDialogOpen(true);
  };

  const saveInitiative = () => {
    if (editingInitiative?.goal) {
      saveInitiativeMutation.mutate(editingInitiative);
    }
  };

  const getInitiativesForCell = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    return initiatives.filter(i => i.track_id === trackId && i.quarter === quarter);
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

    let targetTrackId: string | null = null;
    let targetQuarter: "current" | "next" | "halfYear" | null = null;

    // Case 1: Dropped directly on a cell
    if (overId.startsWith("cell-")) {
      const parts = overId.substring(5).split("-"); // Remove "cell-" prefix
      targetQuarter = parts[parts.length - 1] as "current" | "next" | "halfYear";
      targetTrackId = parts.slice(0, -1).join("-"); // Everything except the last part
    }
    // Case 2: Dropped on another card - find which cell that card belongs to
    else {
      const targetInitiative = initiatives.find(i => i.id === overId);
      if (targetInitiative) {
        targetTrackId = targetInitiative.track_id;
        targetQuarter = targetInitiative.quarter as "current" | "next" | "halfYear";
      }
    }

    // If we found a valid target cell, move the initiative
    if (targetTrackId && targetQuarter) {
      const activeInitiative = initiatives.find(i => i.id === activeId);
      
      if (activeInitiative && (activeInitiative.track_id !== targetTrackId || activeInitiative.quarter !== targetQuarter)) {
        moveInitiativeMutation.mutate({
          id: activeId,
          track_id: targetTrackId,
          quarter: targetQuarter,
        });
      }
    }
  };

  const activeInitiative = activeId ? initiatives.find(i => i.id === activeId) : null;

  // Draggable Initiative Card Component
  const DraggableInitiativeCard = ({ initiative }: { initiative: Initiative }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: initiative.id, disabled: isReadOnly });

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
              setEditingInitiative(initiative);
              setIsDialogOpen(true);
            }
          }}
        >
          <CardContent className="p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{initiative.goal || "Untitled Initiative"}</p>
                {initiative.done && (
                  <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                )}
              </div>
              {initiative.expected_result && (
                <div className="text-xs whitespace-pre-line">{initiative.expected_result}</div>
              )}
              {initiative.achieved_result && (
                <div className="text-xs whitespace-pre-line">{initiative.achieved_result}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Droppable Cell Component
  const DroppableCell = ({ 
    trackId, 
    quarter, 
    children 
  }: { 
    trackId: string; 
    quarter: "current" | "next" | "halfYear";
    children: ReactNode;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `cell-${trackId}-${quarter}`,
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
                <th className="border border-border bg-muted p-4 text-left font-semibold">Track</th>
                {quarters.map(quarter => (
                  <th key={quarter.id} className="border border-border bg-muted p-4 text-left font-semibold">
                    {quarter.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.map(track => (
                <tr key={track.id}>
                  <td className="border border-border bg-card p-4 font-medium relative pl-4">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: track.color || "#8B5CF6" }}
                    />
                    {track.name}
                  </td>
                  {quarters.map(quarter => {
                    const cellInitiatives = getInitiativesForCell(track.id, quarter.id as any);
                    return (
                      <DroppableCell key={quarter.id} trackId={track.id} quarter={quarter.id as any}>
                        <div className="space-y-2 min-h-[200px]">
                          <SortableContext
                            items={cellInitiatives.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {cellInitiatives.map(initiative => (
                              <DraggableInitiativeCard key={initiative.id} initiative={initiative as Initiative} />
                            ))}
                          </SortableContext>
                          {!isReadOnly && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => createInitiative(track.id, quarter.id as any)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Initiative
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
        title="Initiative Details"
        onSave={saveInitiative}
        onDelete={editingInitiative?.id ? () => setDeleteAlertOpen(true) : undefined}
        isEditing={!!editingInitiative?.id}
        saveLabel="Save Initiative"
      >
        {editingInitiative && (
          <>
            <div>
              <Label htmlFor="goal">Goal *</Label>
              <Input
                id="goal"
                value={editingInitiative.goal}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, goal: e.target.value })}
                placeholder="Enter initiative goal..."
              />
            </div>
            <div>
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={editingInitiative.quarter}
                onValueChange={(value) => setEditingInitiative({ ...editingInitiative, quarter: value as any })}
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
                value={editingInitiative.expected_result}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, expected_result: e.target.value })}
                placeholder="Enter expected result..."
              />
            </div>
            <div>
              <Label htmlFor="achievedResult">Achieved Result</Label>
              <Textarea
                id="achievedResult"
                value={editingInitiative.achieved_result}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, achieved_result: e.target.value })}
                placeholder="Enter achieved result..."
              />
            </div>
            <div>
              <Label htmlFor="targetMetrics">Target Metrics</Label>
              <MetricTagInput
                value={editingInitiative.target_metrics || []}
                onChange={(tags) => setEditingInitiative({ ...editingInitiative, target_metrics: tags })}
                suggestions={metrics.map(m => m.name).filter(Boolean)}
                placeholder="Type to add metrics..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="done"
                checked={editingInitiative.done}
                onCheckedChange={(checked) => setEditingInitiative({ ...editingInitiative, done: checked as boolean })}
              />
              <Label htmlFor="done">Done</Label>
            </div>
          </>
        )}
      </EntityDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Initiative</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this initiative? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingInitiative?.id && deleteInitiativeMutation.mutate(editingInitiative.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      <DragOverlay>
        {activeInitiative ? (
          <Card className="w-64 opacity-90">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold">{activeInitiative.goal || "Untitled Initiative"}</p>
                  {activeInitiative.done && (
                    <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                  )}
                </div>
                {activeInitiative.expected_result && (
                  <div className="text-xs whitespace-pre-line">{activeInitiative.expected_result}</div>
                )}
                {activeInitiative.achieved_result && (
                  <div className="text-xs whitespace-pre-line">{activeInitiative.achieved_result}</div>
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
