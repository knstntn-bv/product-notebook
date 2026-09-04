import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Paperclip } from "lucide-react";
import { applyClosedAt, BOARD_COLUMNS, type BoardColumnId } from "@/lib/board";
import { createFeature as createFeatureRecord } from "@/lib/features";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { EntityDialog } from "@/components/EntityDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EntityCombobox } from "@/components/EntityCombobox";
import { EntityAttachmentsDialog } from "@/components/EntityAttachmentsDialog";
import { syncAttachmentLinksForFeatureHypothesis } from "@/lib/attachmentLinks";
import {
  HypothesisFormLeftContent,
  HypothesisFormStatusAndPriority,
} from "@/components/HypothesisFormFields";
import {
  DEFAULT_HYPOTHESIS_PRIORITY,
  emptyHypothesisForm,
  parseHypothesisPriorityInput,
  type HypothesisFormValue,
} from "@/lib/hypotheses";
import { supabase } from "@/integrations/supabase/client";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresKey, hypothesesKey, requireProductId, useFeaturesQuery, useGoalsQuery, useHypothesesQuery, type FeatureRow } from "@/lib/productQueries";
import { visibleByArchive } from "@/lib/archive";
import { cascadeInitiativeFromGoal } from "@/lib/goals";
import { errorToast } from "@/lib/errorToast";
import { DEFAULT_INITIATIVE_COLOR } from "@/lib/initiatives";
import { applyOptimisticUpdate, rollbackOptimisticUpdate } from "@/lib/optimisticQuery";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, useSensor, useSensors, PointerSensor, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

const BoardPage = () => {
  const { currentProductId, metrics, initiatives } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Partial<FeatureRow> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const originalFeaturesRef = useRef<FeatureRow[] | null>(null);
  const [creatingHypothesisFromFeature, setCreatingHypothesisFromFeature] = useState<{
    featureId: string;
    title: string;
    description: string;
  } | null>(null);
  const [isHypothesisDialogOpen, setIsHypothesisDialogOpen] = useState(false);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Partial<HypothesisFormValue> | null>(null);
  const [hypothesisPriorityInput, setHypothesisPriorityInput] = useState("");
  const [hypothesisPriorityFieldError, setHypothesisPriorityFieldError] = useState(false);

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 999999 : 8,
      },
    })
  );

  const { data: features = [] } = useFeaturesQuery(currentProductId);
  const { data: goals = [] } = useGoalsQuery(currentProductId);
  const { data: hypotheses = [] } = useHypothesesQuery(currentProductId);

  // Save feature mutation
  const saveFeatureMutation = useMutation({
    mutationFn: async (feature: Partial<FeatureRow>) => {
      const productId = requireProductId(currentProductId);

      if (feature.id) {
        const updateData: TablesUpdate<"features"> = {
          title: feature.title,
          description: feature.description,
          goal_id: feature.goal_id,
          initiative_id: feature.initiative_id,
          hypothesis_id: feature.hypothesis_id,
          board_column: feature.board_column,
          position: feature.position,
          closed_at: applyClosedAt(feature.board_column),
        };
        
        const { error } = await supabase
          .from("features")
          .update(updateData)
          .eq("id", feature.id)
          .eq("product_id", productId);
        if (error) throw error;

        const previousHypothesisId =
          features.find((item) => item.id === feature.id)?.hypothesis_id ?? null;
        const nextHypothesisId = feature.hypothesis_id || null;
        if (nextHypothesisId && nextHypothesisId !== previousHypothesisId) {
          await syncAttachmentLinksForFeatureHypothesis(feature.id, nextHypothesisId);
        }
      } else {
        if (!feature.board_column) throw new Error("Column is required");
        if (!feature.title) throw new Error("Title is required");
        await createFeatureRecord({
          productId,
          title: feature.title,
          description: feature.description,
          goal_id: feature.goal_id,
          initiative_id: feature.initiative_id,
          hypothesis_id: feature.hypothesis_id,
          board_column: feature.board_column,
          features,
          initiatives,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
      queryClient.invalidateQueries({ queryKey: ["feature_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["hypothesis_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
      setEditingFeature(null);
      setIsDialogOpen(false);
      toast({ title: "Feature saved successfully" });
    },
    onError: errorToast,
  });

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("features")
        .delete()
        .eq("id", featureId)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
      setEditingFeature(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Feature deleted successfully" });
    },
    onError: errorToast,
  });

  // Drag mutation - optimistic update is handled in handleDragEnd
  const dragFeatureMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; position: number; board_column?: string }> }) => {
      const productId = requireProductId(currentProductId);
      const promises = updates.map(update => {
        const updateData: TablesUpdate<"features"> = {
          position: update.position,
        };
        if (update.board_column) {
          updateData.board_column = update.board_column;
          updateData.closed_at = applyClosedAt(update.board_column);
        }

        return supabase.from("features").update(updateData).eq("id", update.id).eq("product_id", productId);
      });
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onError: (error) => errorToast(error, "Error moving feature"),
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
    },
  });

  const createFeature = (columnId: BoardColumnId) => {
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

  const getGoalName = (goalId?: string | null) => {
    return goals.find(i => i.id === goalId)?.goal || "";
  };

  const getInitiativeColor = (initiativeId?: string | null) => {
    return initiatives.find(i => i.id === initiativeId)?.color || DEFAULT_INITIATIVE_COLOR;
  };

  const handleDiscoveryThisFeature = () => {
    if (!editingFeature || !editingFeature.id) return;
    
    setCreatingHypothesisFromFeature({
      featureId: editingFeature.id,
      title: editingFeature.title || "",
      description: editingFeature.description || "",
    });
    setIsHypothesisDialogOpen(true);
  };

  // Предзаполнение полей гипотезы при открытии диалога
  useEffect(() => {
    if (creatingHypothesisFromFeature && isHypothesisDialogOpen) {
      setHypothesisPriorityInput(String(DEFAULT_HYPOTHESIS_PRIORITY));
      setHypothesisPriorityFieldError(false);
      setEditingHypothesis({
        ...emptyHypothesisForm(),
        insight: creatingHypothesisFromFeature.title,
        problem_hypothesis: creatingHypothesisFromFeature.description,
      });
    }
  }, [creatingHypothesisFromFeature, isHypothesisDialogOpen]);

  // Save hypothesis from feature mutation
  const saveHypothesisFromFeatureMutation = useMutation({
    mutationFn: async (hypothesis: NonNullable<typeof editingHypothesis>) => {
      const productId = requireProductId(currentProductId);
      if (!creatingHypothesisFromFeature) throw new Error("No feature context");
      
      // Создаем гипотезу
      const { data: newHypothesis, error: hypothesisError } = await supabase
        .from("hypotheses")
        .insert({
          product_id: productId,
          status: hypothesis.status || "new",
          priority: hypothesis.priority ?? DEFAULT_HYPOTHESIS_PRIORITY,
          insight: hypothesis.insight || "",
          problem_hypothesis: hypothesis.problem_hypothesis || "",
          problem_validation: hypothesis.problem_validation || "",
          solution_hypothesis: hypothesis.solution_hypothesis || "",
          solution_validation: hypothesis.solution_validation || "",
          impact_metrics: hypothesis.impact_metrics || [],
        })
        .select()
        .single();
      
      if (hypothesisError) throw hypothesisError;
      
      // Обновляем фичу: привязываем гипотезу и переносим в Discovery
      const { error: featureError } = await supabase
        .from("features")
        .update({
          hypothesis_id: newHypothesis.id,
          board_column: "discovery",
          closed_at: applyClosedAt("discovery"),
        })
        .eq("id", creatingHypothesisFromFeature.featureId)
        .eq("product_id", productId);
      
      if (featureError) throw featureError;

      await syncAttachmentLinksForFeatureHypothesis(
        creatingHypothesisFromFeature.featureId,
        newHypothesis.id,
      );
      
      return newHypothesis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hypothesesKey(currentProductId) });
      queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
      queryClient.invalidateQueries({ queryKey: ["feature_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["hypothesis_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
      setCreatingHypothesisFromFeature(null);
      setEditingHypothesis(null);
      setHypothesisPriorityInput("");
      setHypothesisPriorityFieldError(false);
      setIsHypothesisDialogOpen(false);
      setIsDialogOpen(false); // Закрываем диалог фичи
      toast({ title: "Hypothesis created and feature linked successfully" });
    },
    onError: errorToast,
  });

  const handleSaveHypothesis = () => {
    if (!editingHypothesis) return;
    const parsed = parseHypothesisPriorityInput(hypothesisPriorityInput);
    if (!parsed.ok) {
      setHypothesisPriorityFieldError(true);
      toast({
        title: "Invalid priority",
        description: "Enter a whole number from 1 to 99.",
        variant: "destructive",
      });
      return;
    }
    saveHypothesisFromFeatureMutation.mutate({ ...editingHypothesis, priority: parsed.value });
  };

  const getFeaturesForColumn = (columnId: BoardColumnId) => {
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
    originalFeaturesRef.current = queryClient.getQueryData<FeatureRow[]>(featuresKey(currentProductId)) || null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !originalFeaturesRef.current) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    if (activeId === overId) {
      // Same position, revert to original
      queryClient.setQueryData(featuresKey(currentProductId), originalFeaturesRef.current);
      setDragOverId(null);
      return;
    }
    
    // Use original features to determine current state
    const activeFeature = originalFeaturesRef.current.find(f => f.id === activeId);
    const overFeature = originalFeaturesRef.current.find(f => f.id === overId);
    const overColumn = BOARD_COLUMNS.find(col => col.id === overId);
    
    if (!activeFeature) return;
    
    // Only update preview if we're moving to a different position
    const currentDragOver = `${overId}-${activeId}`;
    if (dragOverId === currentDragOver) return; // Already showing this preview
    setDragOverId(currentDragOver);
    
    let updatedFeatures: FeatureRow[] = [];
    
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
      queryClient.setQueryData(featuresKey(currentProductId), originalFeaturesRef.current);
      setDragOverId(null);
      return;
    }
    
    // Apply preview update to show where item will land
    if (updatedFeatures.length > 0) {
      queryClient.setQueryData(featuresKey(currentProductId), updatedFeatures);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (!over) {
      // Drag cancelled, revert to original state
      if (originalFeaturesRef.current) {
        queryClient.setQueryData(featuresKey(currentProductId), originalFeaturesRef.current);
      }
      originalFeaturesRef.current = null;
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) {
      // Same position, revert to original if we had a preview
      if (originalFeaturesRef.current) {
        queryClient.setQueryData(featuresKey(currentProductId), originalFeaturesRef.current);
      }
      originalFeaturesRef.current = null;
      return;
    }

    const snapshot =
      originalFeaturesRef.current ??
      queryClient.getQueryData<FeatureRow[]>(featuresKey(currentProductId));
    const originalFeatures = snapshot ?? [];
    const activeFeature = originalFeatures.find(f => f.id === activeId);
    const overFeature = originalFeatures.find(f => f.id === overId);
    const overColumn = BOARD_COLUMNS.find(col => col.id === overId);

    originalFeaturesRef.current = null;

    if (!activeFeature) return;
    
    let updatedFeatures: FeatureRow[] = [];
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
            const updatedFeature = {
              ...feature,
              position: update.position,
              ...(update.board_column && { board_column: update.board_column }),
              ...(update.board_column
                ? { closed_at: applyClosedAt(update.board_column) }
                : {}),
            };
            
            return updatedFeature;
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
          const updatedFeature = {
            ...feature,
            position: update.position,
            ...(update.board_column && { board_column: update.board_column }),
            ...(update.board_column
              ? { closed_at: applyClosedAt(update.board_column) }
              : {}),
          };
          
          return updatedFeature;
        }
        return feature;
      });
    } else {
      // No valid drop, restore original state (should not happen, but safety check)
      queryClient.setQueryData(featuresKey(currentProductId), originalFeatures);
      return;
    }

    const previous =
      updatedFeatures.length > 0
        ? applyOptimisticUpdate(
            queryClient,
            featuresKey(currentProductId),
            () => updatedFeatures,
            snapshot,
          )
        : snapshot;

    dragFeatureMutation.mutate(
      { updates },
      {
        onError: () => {
          rollbackOptimisticUpdate(queryClient, featuresKey(currentProductId), previous);
        },
      }
    );
  };

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null;

  // Sort goals and initiatives alphabetically for dropdowns, excluding archived ones
  const sortedGoals = visibleByArchive(goals, false).sort((a, b) =>
    (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" }),
  );

  const sortedInitiatives = visibleByArchive(initiatives, false).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
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
      queryClient.setQueryData(featuresKey(currentProductId), originalFeaturesRef.current);
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
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
        <div className="w-full min-h-0 flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:scrollbar-default scroll-smooth">
          <div className="flex h-full items-stretch gap-4 px-[calc(7.5vw-1rem)] md:px-0">
            {BOARD_COLUMNS.map(column => {
              const columnFeatures = getFeaturesForColumn(column.id);
              return (
                <DroppableColumn key={column.id} column={column} onAddFeature={createFeature}>
                  <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {columnFeatures.map(feature => (
                      <SortableFeature
                        key={feature.id}
                        feature={feature}
                        goalName={getGoalName(feature.goal_id)}
                        initiativeColor={getInitiativeColor(feature.initiative_id)}
                        onClick={() => {
                          setEditingFeature(feature);
                          setIsDialogOpen(true);
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
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setAttachmentsDialogOpen(false);
        }}
        title="Feature Details"
        onSave={saveFeature}
        onDelete={editingFeature?.id ? () => setDeleteAlertOpen(true) : undefined}
        onExport={exportFeatureToMarkdown}
        exportLabel="Export to .md"
        isEditing={!!editingFeature?.id}
        saveLabel="Save Feature"
        leftContent={editingFeature && (
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
                value={editingFeature.title || ""}
                onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
                placeholder="Enter feature title..."
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingFeature.description ?? ""}
                onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                placeholder="Enter feature description..."
                rows={15}
              />
            </div>
          </>
        )}
        rightContent={editingFeature && (
          <>
            <div>
              <Label>Linked Goal</Label>
              <EntityCombobox
                items={sortedGoals.map((goal) => ({ id: goal.id, label: goal.goal || "" }))}
                value={editingFeature.goal_id}
                fallbackLabel={goals.find((goal) => goal.id === editingFeature.goal_id)?.goal || undefined}
                onSelect={(id) => {
                  if (!id) return;
                  setEditingFeature({
                    ...editingFeature,
                    ...cascadeInitiativeFromGoal(goals, id),
                  });
                }}
                placeholder="Select goal..."
                searchPlaceholder="Search goals..."
                emptyText="No goal found."
              />
            </div>
            <div>
              <Label>Linked Initiative</Label>
              <EntityCombobox
                items={sortedInitiatives.map((initiative) => ({
                  id: initiative.id,
                  label: initiative.name || "",
                }))}
                value={editingFeature.initiative_id}
                fallbackLabel={
                  initiatives.find((initiative) => initiative.id === editingFeature.initiative_id)?.name || undefined
                }
                onSelect={(id) => {
                  if (!id) return;
                  setEditingFeature({ ...editingFeature, initiative_id: id });
                }}
                placeholder="Select initiative..."
                searchPlaceholder="Search initiatives..."
                emptyText="No initiative found."
              />
            </div>
            <div>
              <Label>Linked Hypothesis</Label>
              <EntityCombobox
                items={hypotheses.map((hypothesis) => ({
                  id: hypothesis.id,
                  label: hypothesis.insight || "Untitled hypothesis",
                }))}
                value={editingFeature.hypothesis_id}
                fallbackLabel={
                  hypotheses.find((hypothesis) => hypothesis.id === editingFeature.hypothesis_id)?.insight
                  || (editingFeature.hypothesis_id ? "Untitled hypothesis" : undefined)
                }
                onSelect={(id) => {
                  setEditingFeature({ ...editingFeature, hypothesis_id: id });
                }}
                placeholder="Select hypothesis..."
                searchPlaceholder="Search hypothesis..."
                emptyText="No hypothesis found."
                allowNone
              />
            </div>
            <div>
              <Label htmlFor="column">Column</Label>
              <Select
                value={editingFeature.board_column as BoardColumnId | undefined}
                onValueChange={(value: BoardColumnId) => setEditingFeature({ ...editingFeature, board_column: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_COLUMNS.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingFeature.id && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setAttachmentsDialogOpen(true)}
                  className="w-full"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments
                </Button>
              </div>
            )}
            <div className="mt-auto pt-4">
              <Button
                variant="outline"
                onClick={handleDiscoveryThisFeature}
                disabled={!editingFeature?.id}
                className="w-full"
                title={!editingFeature?.id ? "Save the feature first to create a hypothesis" : "Create hypothesis from this feature"}
              >
                Discover this feature
              </Button>
            </div>
          </>
        )}
      />

      {currentProductId && editingFeature?.id && (
        <EntityAttachmentsDialog
          open={attachmentsDialogOpen}
          onOpenChange={setAttachmentsDialogOpen}
          productId={currentProductId}
          kind="feature"
          entityId={editingFeature.id}
        />
      )}

      <EntityDialog
        open={isHypothesisDialogOpen}
        onOpenChange={(open) => {
          setIsHypothesisDialogOpen(open);
          if (!open) {
            setEditingHypothesis(null);
            setCreatingHypothesisFromFeature(null);
            setHypothesisPriorityInput("");
            setHypothesisPriorityFieldError(false);
          }
        }}
        title="New Hypothesis"
        onSave={handleSaveHypothesis}
        isEditing={false}
        saveLabel="Save Hypothesis"
        saveDisabled={!!editingHypothesis && hypothesisPriorityFieldError}
        leftContent={editingHypothesis && (
          <HypothesisFormLeftContent
            value={editingHypothesis}
            onChange={setEditingHypothesis}
            metricSuggestions={metrics.map((m) => m.name).filter(Boolean)}
          />
        )}
        rightContent={editingHypothesis && (
          <>
            <div className="min-w-0">
              <Label>Linked Feature</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full min-w-0 justify-start overflow-hidden"
                disabled
                aria-disabled
                title={creatingHypothesisFromFeature?.title || "Untitled feature"}
              >
                <span className="min-w-0 truncate">
                  {creatingHypothesisFromFeature?.title || "Untitled feature"}
                </span>
              </Button>
            </div>
            <HypothesisFormStatusAndPriority
              value={editingHypothesis}
              onChange={setEditingHypothesis}
              priorityInput={hypothesisPriorityInput}
              onPriorityInputChange={setHypothesisPriorityInput}
              priorityFieldError={hypothesisPriorityFieldError}
              onPriorityFieldErrorChange={setHypothesisPriorityFieldError}
            />
          </>
        )}
      />

      <ConfirmDeleteDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        title="Delete Feature"
        description="Are you sure you want to delete this feature? This action cannot be undone."
        onConfirm={() => editingFeature?.id && deleteFeatureMutation.mutate(editingFeature.id)}
      />
    </DndContext>
  );
};

interface DroppableColumnProps {
  column: { id: BoardColumnId; label: string };
  children: React.ReactNode;
  onAddFeature?: (columnId: BoardColumnId) => void;
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
  feature: FeatureRow;
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


