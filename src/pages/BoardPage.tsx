import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, useSensor, useSensors, PointerSensor, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

interface Feature {
  id: string;
  title: string;
  description: string;
  goal_id?: string;
  initiative_id?: string;
  board_column: ColumnId;
  position: number;
  human_readable_id?: string;
}

interface Goal {
  id: string;
  goal: string;
  initiative_id: string;
}

interface Initiative {
  id: string;
  name: string;
  color?: string;
}

const BoardPage = () => {
  const { isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Partial<Feature> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const originalFeaturesRef = useRef<Feature[] | null>(null);

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isReadOnly || isMobile ? 999999 : 8,
      },
    })
  );

  const columns: { id: ColumnId; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "discovery", label: "Discovery" },
    { id: "backlog", label: "Backlog" },
    { id: "design", label: "Design & Analysis" },
    { id: "development", label: "Development & Testing" },
    { id: "onHold", label: "On Hold / Blocked" },
    { id: "done", label: "Done" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Fetch features
  const { data: features = [] } = useQuery({
    queryKey: ["features", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as Feature[];
    },
    enabled: !!effectiveUserId,
  });

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

  // Save feature mutation
  const saveFeatureMutation = useMutation({
    mutationFn: async (feature: Partial<Feature>) => {
      if (!user) throw new Error("No user");
      
      if (feature.id) {
        const { error } = await supabase
          .from("features")
          .update({
            title: feature.title,
            description: feature.description,
            goal_id: feature.goal_id,
            initiative_id: feature.initiative_id,
            board_column: feature.board_column,
            position: feature.position,
          })
          .eq("id", feature.id);
        if (error) throw error;
      } else {
        // Get the max position for the column
        const columnFeatures = features.filter(f => f.board_column === feature.board_column);
        const maxPosition = columnFeatures.length > 0 
          ? Math.max(...columnFeatures.map(f => f.position)) 
          : -1;
        
        // Generate human_readable_id
        let prefix = "NNN";
        if (feature.initiative_id) {
          const initiative = initiatives.find(i => i.id === feature.initiative_id);
          if (initiative?.name) {
            // Take first 3 characters, uppercase
            prefix = initiative.name
              .substring(0, 3)
              .toUpperCase();
          }
        }
        
        // Get total count of features for this user (sequential numbering)
        const { count } = await supabase
          .from("features")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        const featureNumber = (count || 0) + 1;
        const human_readable_id = `${prefix}-${featureNumber}`;
        
        const { error } = await supabase
          .from("features")
          .insert({
            user_id: user.id,
            title: feature.title!,
            description: feature.description || "",
            goal_id: feature.goal_id,
            initiative_id: feature.initiative_id,
            board_column: feature.board_column!,
            position: maxPosition + 1,
            human_readable_id: human_readable_id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setEditingFeature(null);
      setIsDialogOpen(false);
      toast({ title: "Feature saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("features")
        .delete()
        .eq("id", featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setEditingFeature(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Feature deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Drag mutation - optimistic update is handled in handleDragEnd
  const dragFeatureMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; position: number; board_column?: string }> }) => {
      const promises = updates.map(update =>
        supabase.from("features").update({ 
          position: update.position,
          ...(update.board_column && { board_column: update.board_column })
        }).eq("id", update.id)
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onError: (error: any) => {
      toast({ title: "Error moving feature", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ["features", effectiveUserId] });
    },
  });

  const createFeature = (columnId: ColumnId) => {
    setEditingFeature({
      title: "",
      description: "",
      board_column: columnId,
    });
    setIsDialogOpen(true);
  };

  const saveFeature = () => {
    if (editingFeature?.title) {
      saveFeatureMutation.mutate(editingFeature);
    }
  };

  const exportFeatureToMarkdown = () => {
    if (!editingFeature) return;

    // Get human readable ID or use placeholder
    const humanReadableId = editingFeature.human_readable_id || "NEW";
    
    // Get title or use placeholder
    const title = editingFeature.title || "Untitled Feature";
    
    // Get description
    const description = editingFeature.description || "";

    // Create filename: human_readable_id + title (sanitized for filesystem)
    const sanitizeFilename = (str: string) => {
      return str
        .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename characters
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()
        .substring(0, 100); // Limit length
    };

    const filename = `${humanReadableId} ${sanitizeFilename(title)}.md`;

    // Create blob with description content
    const blob = new Blob([description], { type: "text/markdown;charset=utf-8" });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGoalSelect = (goalId: string) => {
    const selectedGoal = goals.find(i => i.id === goalId);
    setEditingFeature({
      ...editingFeature,
      goal_id: goalId,
      initiative_id: selectedGoal?.initiative_id,
    });
    setGoalOpen(false);
  };

  const handleInitiativeSelect = (initiativeId: string) => {
    setEditingFeature({
      ...editingFeature,
      initiative_id: initiativeId,
    });
    setInitiativeOpen(false);
  };

  const getGoalName = (goalId?: string) => {
    return goals.find(i => i.id === goalId)?.goal || "";
  };

  const getInitiativeName = (initiativeId?: string) => {
    return initiatives.find(i => i.id === initiativeId)?.name || "";
  };

  const getInitiativeColor = (initiativeId?: string) => {
    return initiatives.find(i => i.id === initiativeId)?.color || "#8B5CF6";
  };

  const getFeaturesForColumn = (columnId: ColumnId) => {
    return features
      .filter(f => f.board_column === columnId)
      .sort((a, b) => {
        // Sort by position first, then by id for stability
        // This ensures consistent order even with duplicate positions
        if (a.position !== b.position) {
          return a.position - b.position;
        }
        return a.id.localeCompare(b.id);
      });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Store original state for preview
    originalFeaturesRef.current = queryClient.getQueryData<Feature[]>(["features", effectiveUserId]) || null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !originalFeaturesRef.current) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    if (activeId === overId) {
      // Same position, revert to original
      queryClient.setQueryData(["features", effectiveUserId], originalFeaturesRef.current);
      setDragOverId(null);
      return;
    }
    
    // Use original features to determine current state
    const activeFeature = originalFeaturesRef.current.find(f => f.id === activeId);
    const overFeature = originalFeaturesRef.current.find(f => f.id === overId);
    const overColumn = columns.find(col => col.id === overId);
    
    if (!activeFeature) return;
    
    // Only update preview if we're moving to a different position
    const currentDragOver = `${overId}-${activeId}`;
    if (dragOverId === currentDragOver) return; // Already showing this preview
    setDragOverId(currentDragOver);
    
    let updatedFeatures: Feature[] = [];
    
    // Case 1: Dragging over a feature (same or different column)
    if (overFeature) {
      const isSameColumn = activeFeature.board_column === overFeature.board_column;
      
      if (isSameColumn) {
        // Reorder within the same column - dnd-kit's SortableContext handles visual preview automatically
        // Don't update query data here to avoid interfering with dnd-kit's internal tracking
        // The preview will be applied in handleDragEnd
        return;
      } else {
        // Move to different column at the position of overFeature
        const sourceColumnFeatures = originalFeaturesRef.current
          .filter(f => f.board_column === activeFeature.board_column)
          .sort((a, b) => a.position - b.position);
        const targetColumnFeatures = originalFeaturesRef.current
          .filter(f => f.board_column === overFeature.board_column)
          .sort((a, b) => a.position - b.position);
        const insertIndex = targetColumnFeatures.findIndex(f => f.id === overId);
        
        // Create updated features array showing preview
        updatedFeatures = originalFeaturesRef.current.map(feature => {
          // Move active feature to target column
          if (feature.id === activeId) {
            return {
              ...feature,
              board_column: overFeature.board_column,
              position: insertIndex,
            };
          }
          // Update source column positions (shift down after removing active)
          if (feature.board_column === activeFeature.board_column && feature.position > activeFeature.position) {
            return { ...feature, position: feature.position - 1 };
          }
          // Update target column positions (shift up to make room)
          if (feature.board_column === overFeature.board_column && feature.position >= insertIndex) {
            return { ...feature, position: feature.position + 1 };
          }
          return feature;
        });
      }
    } 
    // Case 2: Dragging over an empty column
    else if (overColumn && activeFeature.board_column !== overColumn.id) {
      const targetColumnFeatures = originalFeaturesRef.current
        .filter(f => f.board_column === overColumn.id)
        .sort((a, b) => a.position - b.position);
      const newPosition = targetColumnFeatures.length;
      
      // Create updated features array showing preview
      updatedFeatures = originalFeaturesRef.current.map(feature => {
        // Move to target column at the end
        if (feature.id === activeId) {
          return {
            ...feature,
            board_column: overColumn.id,
            position: newPosition,
          };
        }
        // Update source column positions (shift down after removing active)
        if (feature.board_column === activeFeature.board_column && feature.position > activeFeature.position) {
          return { ...feature, position: feature.position - 1 };
        }
        return feature;
      });
    } else {
      // No valid drop target, revert to original
      queryClient.setQueryData(["features", effectiveUserId], originalFeaturesRef.current);
      setDragOverId(null);
      return;
    }
    
    // Apply preview update to show where item will land
    if (updatedFeatures.length > 0) {
      queryClient.setQueryData(["features", effectiveUserId], updatedFeatures);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (!over) {
      // Drag cancelled, revert to original state
      if (originalFeaturesRef.current) {
        queryClient.setQueryData(["features", effectiveUserId], originalFeaturesRef.current);
      }
      originalFeaturesRef.current = null;
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      // Same position, revert to original if we had a preview
      if (originalFeaturesRef.current) {
        queryClient.setQueryData(["features", effectiveUserId], originalFeaturesRef.current);
      }
      originalFeaturesRef.current = null;
      return;
    }

    // Cancel any outgoing refetches
    queryClient.cancelQueries({ queryKey: ["features", effectiveUserId] });
    
    // Get original state for rollback and feature lookup
    const originalFeatures = originalFeaturesRef.current || queryClient.getQueryData<Feature[]>(["features", effectiveUserId]) || [];
    const activeFeature = originalFeatures.find(f => f.id === activeId);
    const overFeature = originalFeatures.find(f => f.id === overId);
    const overColumn = columns.find(col => col.id === overId);
    
    // Store original features for error rollback before clearing ref
    const previousFeaturesForRollback = originalFeaturesRef.current;
    originalFeaturesRef.current = null;

    if (!activeFeature) return;
    
    let updatedFeatures: Feature[] = [];
    let updates: Array<{ id: string; position: number; board_column?: string }> = [];

    // Case 1: Dropped on a feature (same or different column)
    if (overFeature) {
      const isSameColumn = activeFeature.board_column === overFeature.board_column;
      
      if (isSameColumn) {
        // Reorder within the same column
        // Get column features sorted by position (matching render order)
        const columnFeatures = originalFeatures
          .filter(f => f.board_column === activeFeature.board_column)
          .sort((a, b) => {
            // Sort by position first, then by id for stability
            if (a.position !== b.position) {
              return a.position - b.position;
            }
            return a.id.localeCompare(b.id);
          });
        
        const oldIndex = columnFeatures.findIndex(f => f.id === activeId);
        const newIndex = columnFeatures.findIndex(f => f.id === overId);
        
        // Validate indices
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('Invalid indices for drag operation', { activeId, overId, oldIndex, newIndex });
          return;
        }
        
        if (oldIndex === newIndex) {
          // No change needed
          return;
        }
        
        // Use arrayMove to get the correct reordered array
        // This matches what dnd-kit's SortableContext shows visually
        const reorderedFeatures = arrayMove(columnFeatures, oldIndex, newIndex);
        
        // Prepare updates for mutation - assign new positions based on array order
        // This ensures positions are sequential (0, 1, 2, ...) without gaps
        updates = reorderedFeatures.map((feature, index) => ({
          id: feature.id,
          position: index,
        }));
        
        // Optimistically update all features in the column with new positions
        updatedFeatures = originalFeatures.map(feature => {
          // Update all features in this column
          if (feature.board_column === activeFeature.board_column) {
            const update = updates.find(u => u.id === feature.id);
            if (update) {
              return { ...feature, position: update.position };
            }
          }
          return feature;
        });
      } else {
        // Move to different column at the position of overFeature
        const sourceColumnFeatures = originalFeatures
          .filter(f => f.board_column === activeFeature.board_column && f.id !== activeId)
          .sort((a, b) => a.position - b.position);
        const targetColumnFeatures = originalFeatures
          .filter(f => f.board_column === overFeature.board_column)
          .sort((a, b) => a.position - b.position);
        const insertIndex = targetColumnFeatures.findIndex(f => f.id === overId);
        
        // Update source column positions
        const sourceUpdates = sourceColumnFeatures.map((feature, index) => ({
          id: feature.id,
          position: index,
        }));
        
        // Update target column positions
        const targetUpdates: { id: string; position: number; board_column?: string }[] = [];
        targetColumnFeatures.forEach((feature, index) => {
          if (index >= insertIndex) {
            targetUpdates.push({ id: feature.id, position: index + 1 });
          }
        });
        
        // Update the active feature with new column and position
        targetUpdates.push({
          id: activeId,
          position: insertIndex,
          board_column: overFeature.board_column,
        });
        
        updates = [...sourceUpdates, ...targetUpdates];
        
        // Optimistically update all features
        updatedFeatures = originalFeatures.map(feature => {
          const update = updates.find(u => u.id === feature.id);
          if (update) {
            return {
              ...feature,
              position: update.position,
              ...(update.board_column && { board_column: update.board_column as ColumnId })
            };
          }
          return feature;
        });
      }
    } 
    // Case 2: Dropped on an empty column
    else if (overColumn && activeFeature.board_column !== overColumn.id) {
      const sourceColumnFeatures = originalFeatures
        .filter(f => f.board_column === activeFeature.board_column && f.id !== activeId)
        .sort((a, b) => a.position - b.position);
      const targetColumnFeatures = originalFeatures
        .filter(f => f.board_column === overColumn.id)
        .sort((a, b) => a.position - b.position);
      
      // Update source column positions
      const sourceUpdates = sourceColumnFeatures.map((feature, index) => ({
        id: feature.id,
        position: index,
      }));
      
      // Update the moved feature
      const movedUpdate = {
        id: activeId,
        position: targetColumnFeatures.length,
        board_column: overColumn.id,
      };
      
      updates = [...sourceUpdates, movedUpdate];
      
      // Optimistically update all features
      updatedFeatures = originalFeatures.map(feature => {
        const update = updates.find(u => u.id === feature.id);
        if (update) {
          return {
            ...feature,
            position: update.position,
            ...(update.board_column && { board_column: update.board_column as ColumnId })
          };
        }
        return feature;
      });
    } else {
      // No valid drop, restore original state (should not happen, but safety check)
      queryClient.setQueryData(["features", effectiveUserId], originalFeatures);
      return;
    }

    // Apply optimistic update immediately
    if (updatedFeatures.length > 0) {
      queryClient.setQueryData(["features", effectiveUserId], updatedFeatures);
    }

    // Then perform the mutation (will rollback on error)
    dragFeatureMutation.mutate(
      { updates },
      {
        onError: (error: any) => {
          // Rollback on error - use previousFeaturesForRollback that we stored
          if (previousFeaturesForRollback) {
            queryClient.setQueryData(["features", effectiveUserId], previousFeaturesForRollback);
          }
        },
      }
    );
  };

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null;

  // Sort goals and initiatives alphabetically for dropdowns
  const sortedGoals = [...goals].sort((a, b) => 
    (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" })
  );
  const sortedInitiatives = [...initiatives].sort((a, b) => 
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  );

  const autoScrollConfig = {
    threshold: {
      x: 0.2,
      y: 0.2,
    },
    acceleration: 1,
    interval: 20,
    enabled: true,
  };

  // Minimal touch handling: only prevent vertical scroll in columns when horizontal gesture detected
  const touchStartRef = useRef<{ x: number; y: number; column: HTMLElement | null } | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const column = target.closest('[data-column-content]') as HTMLElement;
      if (column) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, column };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // If clearly horizontal, temporarily prevent vertical scroll
      if (deltaX > 8 && deltaX > deltaY * 1.5 && touchStartRef.current.column) {
        touchStartRef.current.column.style.overflowY = 'hidden';
      }
    };

    const handleTouchEnd = () => {
      if (touchStartRef.current?.column) {
        touchStartRef.current.column.style.overflowY = '';
      }
      touchStartRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile]);

  const handleDragCancel = () => {
    // Revert to original state if drag is cancelled
    if (originalFeaturesRef.current) {
      queryClient.setQueryData(["features", effectiveUserId], originalFeaturesRef.current);
      originalFeaturesRef.current = null;
    }
    setActiveId(null);
    setDragOverId(null);
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={autoScrollConfig}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="w-full flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:scrollbar-default scroll-smooth min-h-0">
          <div className="flex gap-4 h-full px-[7.5vw] md:pl-4 md:pr-4 pb-4 pt-4 md:pt-0 items-stretch">
            {columns.map(column => {
              const columnFeatures = getFeaturesForColumn(column.id);
              return (
                <DroppableColumn key={column.id} column={column} onAddFeature={!isReadOnly ? createFeature : undefined}>
                  <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {columnFeatures.map(feature => (
                      <SortableFeature
                        key={feature.id}
                        feature={feature as Feature}
                        goalName={getGoalName(feature.goal_id)}
                        initiativeColor={getInitiativeColor(feature.initiative_id)}
                        onClick={() => {
                          if (!isReadOnly) {
                            setEditingFeature(feature as Feature);
                            setIsDialogOpen(true);
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                  
                </DroppableColumn>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeFeature ? (
          <Card className="w-80 opacity-90 shadow-lg rotate-3 relative overflow-hidden">
            {activeFeature.initiative_id && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-1" 
                style={{ backgroundColor: getInitiativeColor(activeFeature.initiative_id) }}
              />
            )}
            <CardContent className="p-3 pl-4">
              <p className="font-medium text-sm mb-1 break-words whitespace-normal hyphens-auto">{activeFeature.title}</p>
              {activeFeature.goal_id && (
                <p className="text-xs text-muted-foreground break-words whitespace-normal">{getGoalName(activeFeature.goal_id)}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      <EntityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Feature Details"
        onSave={saveFeature}
        onDelete={editingFeature?.id ? () => setDeleteAlertOpen(true) : undefined}
        onExport={exportFeatureToMarkdown}
        exportLabel="Export to .md"
        isEditing={!!editingFeature?.id}
        saveLabel="Save Feature"
      >
        {editingFeature && (
          <>
            {editingFeature.human_readable_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{editingFeature.human_readable_id}</p>
              </div>
            )}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={editingFeature.title}
                onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
                placeholder="Enter feature title..."
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingFeature.description}
                onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                placeholder="Enter feature description..."
              />
            </div>
            <div>
              <Label>Linked Goal</Label>
              <Popover open={goalOpen} onOpenChange={setGoalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={goalOpen}
                    className="w-full justify-between"
                  >
                    {editingFeature.goal_id
                      ? getGoalName(editingFeature.goal_id)
                      : "Select goal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search goals..." />
                    <CommandList>
                      <CommandEmpty>No goal found.</CommandEmpty>
                      <CommandGroup>
                        {sortedGoals.map((goal) => (
                          <CommandItem
                            key={goal.id}
                            value={goal.goal}
                            onSelect={() => handleGoalSelect(goal.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editingFeature.goal_id === goal.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {goal.goal}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Linked Initiative</Label>
              <Popover open={initiativeOpen} onOpenChange={setInitiativeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={initiativeOpen}
                    className="w-full justify-between"
                  >
                    {editingFeature.initiative_id
                      ? getInitiativeName(editingFeature.initiative_id)
                      : "Select initiative..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search initiatives..." />
                    <CommandList>
                      <CommandEmpty>No initiative found.</CommandEmpty>
                      <CommandGroup>
                        {sortedInitiatives.map((initiative) => (
                          <CommandItem
                            key={initiative.id}
                            value={initiative.name}
                            onSelect={() => handleInitiativeSelect(initiative.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editingFeature.initiative_id === initiative.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {initiative.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="column">Column</Label>
              <Select
                value={editingFeature.board_column}
                onValueChange={(value: ColumnId) => setEditingFeature({ ...editingFeature, board_column: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </EntityDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingFeature?.id && deleteFeatureMutation.mutate(editingFeature.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
};

interface DroppableColumnProps {
  column: { id: ColumnId; label: string };
  children: React.ReactNode;
  onAddFeature?: (columnId: ColumnId) => void;
}

const DroppableColumn = ({ column, children, onAddFeature }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col w-[85vw] md:w-80 flex-shrink-0 snap-center snap-always h-full">
      <div className="bg-muted p-4 rounded-t-lg border border-border flex-shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">{column.label}</h3>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onAddFeature(column.id)}
                className="p-2 h-auto min-h-0"
            >
            Add
            </Button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        data-column-content
        className={cn(
          "bg-card border-x border-b border-border rounded-b-lg p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 transition-colors",
          isOver && "bg-muted/50"
        )}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
      >
        {children}
      </div>
    </div>
  );
};

interface SortableFeatureProps {
  feature: Feature;
  goalName: string;
  initiativeColor: string;
  onClick: () => void;
}

const SortableFeature = ({ feature, goalName, initiativeColor, onClick }: SortableFeatureProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: feature.id,
  });

  const [isLongTouched, setIsLongTouched] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const LONG_PRESS_DURATION = 500; // milliseconds
  const MOVEMENT_THRESHOLD = 10; // pixels

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsLongTouched(false);

    longPressTimerRef.current = window.setTimeout(() => {
      setIsLongTouched(true);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If moved beyond threshold, cancel long press
    if (distance > MOVEMENT_THRESHOLD) {
      clearLongPressTimer();
      setIsLongTouched(false);
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
    // Reset long touch indication after a short delay
    window.setTimeout(() => setIsLongTouched(false), 200);
  };

  const handleTouchCancel = () => {
    clearLongPressTimer();
    touchStartRef.current = null;
    setIsLongTouched(false);
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  // Disable transition completely to prevent return animation
  // Optimistic update happens immediately, so no animation needed
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: 'none', // Explicitly disable transitions
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden select-none",
        isDragging && "opacity-50 z-50",
        isLongTouched && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
      )}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {feature.initiative_id && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1" 
          style={{ backgroundColor: initiativeColor }}
        />
      )}
      <CardContent className="p-3 pl-4">
        <p className="font-medium text-sm mb-1 break-words whitespace-normal hyphens-auto">{feature.title}</p>
        {goalName && (
          <p className="text-xs text-muted-foreground break-words whitespace-normal">{goalName}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BoardPage;


