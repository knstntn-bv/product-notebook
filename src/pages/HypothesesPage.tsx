import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Plus, Copy, Paperclip } from "lucide-react";
import { EntityAttachmentsDialog } from "@/components/EntityAttachmentsDialog";
import { copyAttachmentLinks } from "@/lib/attachmentLinks";
import { createFeature, type CreateFeatureDraft } from "@/lib/features";
import { BOARD_COLUMNS, type BoardColumnId } from "@/lib/board";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProduct } from "@/contexts/ProductContext";
import { EntityDialog } from "@/components/EntityDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EntityCombobox } from "@/components/EntityCombobox";
import {
  HypothesisFormLeftContent,
  HypothesisFormStatusAndPriority,
} from "@/components/HypothesisFormFields";
import { HeaderActions } from "@/components/HeaderActions";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresKey, hypothesesKey, requireProductId, useFeaturesQuery, useGoalsQuery, useHypothesesQuery, type HypothesisRow } from "@/lib/productQueries";
import { visibleByArchive } from "@/lib/archive";
import { cascadeInitiativeFromGoal } from "@/lib/goals";
import { errorToast } from "@/lib/errorToast";
import {
  DEFAULT_HYPOTHESIS_PRIORITY,
  emptyHypothesisForm,
  hypothesisRowToForm,
  hypothesisStatusLabel,
  hypothesisStatusSortValue,
  parseHypothesisPriorityInput,
  type HypothesisFormValue,
} from "@/lib/hypotheses";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const HypothesesPage = () => {
  const { metrics, currentProductId, initiatives } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [statusSort, setStatusSort] = useState<"asc" | "desc" | null>(null);
  const [prioritySort, setPrioritySort] = useState<"asc" | "desc" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Partial<HypothesisFormValue> | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [creatingFeature, setCreatingFeature] = useState<CreateFeatureDraft | null>(null);
  const [priorityInput, setPriorityInput] = useState("");
  const [priorityFieldError, setPriorityFieldError] = useState(false);
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);

  const { data: hypotheses = [] } = useHypothesesQuery(currentProductId);
  const { data: features = [] } = useFeaturesQuery(currentProductId);
  const { data: goals = [] } = useGoalsQuery(currentProductId);

  // Add hypothesis mutation - теперь открывает диалог
  const handleAddHypothesis = () => {
    setPriorityInput(String(DEFAULT_HYPOTHESIS_PRIORITY));
    setPriorityFieldError(false);
    setEditingHypothesis(emptyHypothesisForm());
    setIsDialogOpen(true);
  };

  // Save hypothesis mutation (create or update)
  const saveHypothesisMutation = useMutation({
    mutationFn: async (hypothesis: Partial<HypothesisFormValue>) => {
      const productId = requireProductId(currentProductId);
      if (hypothesis.id) {
        // Update existing
        const updates: TablesUpdate<"hypotheses"> = {};
        if (hypothesis.status !== undefined) updates.status = hypothesis.status;
        if (hypothesis.priority !== undefined) updates.priority = hypothesis.priority;
        if (hypothesis.insight !== undefined) updates.insight = hypothesis.insight;
        if (hypothesis.problem_hypothesis !== undefined) updates.problem_hypothesis = hypothesis.problem_hypothesis;
        if (hypothesis.problem_validation !== undefined) updates.problem_validation = hypothesis.problem_validation;
        if (hypothesis.solution_hypothesis !== undefined) updates.solution_hypothesis = hypothesis.solution_hypothesis;
        if (hypothesis.solution_validation !== undefined) updates.solution_validation = hypothesis.solution_validation;
        if (hypothesis.impact_metrics !== undefined) updates.impact_metrics = hypothesis.impact_metrics;
        
        const { error } = await supabase
          .from("hypotheses")
          .update(updates)
          .eq("id", hypothesis.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
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
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hypothesesKey(currentProductId) });
      setIsDialogOpen(false);
      setEditingHypothesis(null);
      setPriorityInput("");
      setPriorityFieldError(false);
      toast({ title: "Hypothesis saved successfully" });
    },
    onError: errorToast,
  });

  // Delete hypothesis mutation
  const deleteHypothesisMutation = useMutation({
    mutationFn: async (id: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("hypotheses")
        .delete()
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hypothesesKey(currentProductId) });
      setIsDialogOpen(false);
      setEditingHypothesis(null);
      setPriorityInput("");
      setPriorityFieldError(false);
      setDeleteAlertOpen(false);
      toast({ title: "Hypothesis deleted" });
    },
    onError: errorToast,
  });

  // Clone hypothesis mutation
  const cloneHypothesisMutation = useMutation({
    mutationFn: async (hypothesis: HypothesisFormValue & { id: string }) => {
      const productId = requireProductId(currentProductId);

      const { data: cloned, error } = await supabase
        .from("hypotheses")
        .insert({
          product_id: productId,
          status: hypothesis.status,
          priority: hypothesis.priority ?? DEFAULT_HYPOTHESIS_PRIORITY,
          insight: hypothesis.insight || "",
          problem_hypothesis: hypothesis.problem_hypothesis || "",
          problem_validation: hypothesis.problem_validation || "",
          solution_hypothesis: hypothesis.solution_hypothesis || "",
          solution_validation: hypothesis.solution_validation || "",
          impact_metrics: hypothesis.impact_metrics || [],
        })
        .select("id")
        .single();
      if (error) throw error;
      if (hypothesis.id && cloned?.id) {
        await copyAttachmentLinks("hypothesis", hypothesis.id, "hypothesis", cloned.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hypothesesKey(currentProductId) });
      queryClient.invalidateQueries({ queryKey: ["hypothesis_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
      toast({ title: "Hypothesis cloned successfully" });
    },
    onError: errorToast,
  });


  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: async (feature: CreateFeatureDraft) => {
      const productId = requireProductId(currentProductId);
      if (!feature.hypothesis_id) throw new Error("Hypothesis is required");
      await createFeature({
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuresKey(currentProductId) });
      queryClient.invalidateQueries({ queryKey: ["feature_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["hypothesis_attachments"] });
      queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
      setCreatingFeature(null);
      setIsFeatureDialogOpen(false);
      toast({ title: "Feature created successfully" });
    },
    onError: errorToast,
  });

  const handleSaveHypothesis = () => {
    if (!editingHypothesis) return;
    const parsed = parseHypothesisPriorityInput(priorityInput);
    if (!parsed.ok) {
      setPriorityFieldError(true);
      toast({
        title: "Invalid priority",
        description: "Enter a whole number from 1 to 99.",
        variant: "destructive",
      });
      return;
    }
    saveHypothesisMutation.mutate({ ...editingHypothesis, priority: parsed.value });
  };

  const handleEditHypothesis = (hypothesis: HypothesisRow) => {
    setPriorityInput(String(hypothesis.priority ?? DEFAULT_HYPOTHESIS_PRIORITY));
    setPriorityFieldError(false);
    setEditingHypothesis(hypothesisRowToForm(hypothesis));
    setIsDialogOpen(true);
  };

  const handleDeleteHypothesis = () => {
    if (editingHypothesis?.id) {
      setDeleteAlertOpen(true);
    }
  };

  const confirmDeleteHypothesis = () => {
    if (editingHypothesis?.id) {
      deleteHypothesisMutation.mutate(editingHypothesis.id);
    }
  };

  const handleStatusSort = () => {
    if (statusSort === null) {
      setStatusSort("asc");
    } else if (statusSort === "asc") {
      setStatusSort("desc");
    } else {
      setStatusSort(null);
    }
  };

  const handlePrioritySort = () => {
    if (prioritySort === null) {
      setPrioritySort("asc");
    } else if (prioritySort === "asc") {
      setPrioritySort("desc");
    } else {
      setPrioritySort(null);
    }
  };

  const sortedHypotheses = [...hypotheses].sort((a, b) => {
    // Если активна сортировка по приоритету
    if (prioritySort !== null) {
      const priorityComparison = (a.priority || DEFAULT_HYPOTHESIS_PRIORITY) - (b.priority || DEFAULT_HYPOTHESIS_PRIORITY);
      if (priorityComparison !== 0) {
        return prioritySort === "asc" ? priorityComparison : -priorityComparison;
      }
      // Если приоритеты равны, сортируем по статусу (если активна сортировка по статусу)
      if (statusSort !== null) {
        const statusComparison = hypothesisStatusSortValue(a.status) - hypothesisStatusSortValue(b.status);
        return statusSort === "asc" ? statusComparison : -statusComparison;
      }
      return 0;
    }
    
    // Если активна сортировка по статусу
    if (statusSort !== null) {
      const statusComparison = hypothesisStatusSortValue(a.status) - hypothesisStatusSortValue(b.status);
      if (statusComparison !== 0) {
        return statusSort === "asc" ? statusComparison : -statusComparison;
      }
      // Если статусы равны, сортируем по приоритету
      const priorityComparison = (a.priority || DEFAULT_HYPOTHESIS_PRIORITY) - (b.priority || DEFAULT_HYPOTHESIS_PRIORITY);
      return priorityComparison;
    }
    
    // Если сортировка неактивна
    return 0;
  });

  const handleCreateFeature = (hypothesis: HypothesisRow) => {
    setCreatingFeature({
      title: hypothesis.insight || "",
      description: hypothesis.solution_hypothesis || "",
      board_column: "backlog",
      hypothesis_id: hypothesis.id,
    });
    setIsFeatureDialogOpen(true);
  };

  const handleCloneHypothesis = () => {
    if (editingHypothesis?.id) {
      const parsedPriority = parseHypothesisPriorityInput(priorityInput);
      const priority = parsedPriority.ok
        ? parsedPriority.value
        : (editingHypothesis.priority ?? DEFAULT_HYPOTHESIS_PRIORITY);
      // Use current state from editor (editingHypothesis) to clone with any unsaved changes
      const hypothesisToClone: HypothesisFormValue & { id: string } = {
        id: editingHypothesis.id,
        status: editingHypothesis.status || "new",
        priority,
        insight: editingHypothesis.insight || "",
        problem_hypothesis: editingHypothesis.problem_hypothesis || "",
        problem_validation: editingHypothesis.problem_validation || "",
        solution_hypothesis: editingHypothesis.solution_hypothesis || "",
        solution_validation: editingHypothesis.solution_validation || "",
        impact_metrics: Array.isArray(editingHypothesis.impact_metrics) 
          ? editingHypothesis.impact_metrics 
          : [],
      };
      cloneHypothesisMutation.mutate(hypothesisToClone);
    }
  };

  const handleSaveFeature = () => {
    if (creatingFeature?.title && creatingFeature.hypothesis_id) {
      createFeatureMutation.mutate(creatingFeature);
    }
  };

  const sortedGoals = visibleByArchive(goals, false).sort((a, b) =>
    (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" }),
  );

  const sortedInitiatives = visibleByArchive(initiatives, false).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }),
  );

  const linkedHypothesisLabel =
    (creatingFeature?.hypothesis_id &&
      hypotheses.find((item) => item.id === creatingFeature.hypothesis_id)?.insight) ||
    "Untitled hypothesis";

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <HeaderActions>
        <Button onClick={handleAddHypothesis} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Hypothesis
        </Button>
      </HeaderActions>

      <div className="w-full overflow-x-auto">
        <Table className={cn(
          "w-full",
          !isMobile && "table-fixed",
          isMobile && "min-w-[1200px]"
        )}>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(
                !isMobile && "w-[90px]",
                isMobile && "min-w-[90px]"
              )}>
                <button
                  onClick={handleStatusSort}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity text-xs whitespace-nowrap w-full justify-start"
                  type="button"
                >
                  Status
                  {statusSort === "asc" && <ArrowUp className="h-3 w-3" />}
                  {statusSort === "desc" && <ArrowDown className="h-3 w-3" />}
                </button>
              </TableHead>
              <TableHead className={cn(
                !isMobile && "w-[80px]",
                isMobile && "min-w-[80px]"
              )}>
                <button
                  onClick={handlePrioritySort}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity text-xs whitespace-nowrap w-full justify-start"
                  type="button"
                >
                  Priority
                  {prioritySort === "asc" && <ArrowUp className="h-3 w-3" />}
                  {prioritySort === "desc" && <ArrowDown className="h-3 w-3" />}
                </button>
              </TableHead>
              <TableHead className={cn(
                !isMobile && "w-[200px]",
                isMobile && "min-w-[180px]"
              )}>Insight</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[250px]",
                isMobile && "min-w-[240px]"
              )}>Problem Hypothesis</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[250px]",
                isMobile && "min-w-[240px]"
              )}>Solution Hypothesis</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[150px]",
                isMobile && "min-w-[150px]"
              )}>Impact Metrics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHypotheses.map((hypothesis) => (
              <TableRow 
                key={hypothesis.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  "transition-colors"
                )}
                onClick={() => handleEditHypothesis(hypothesis)}
              >
                <TableCell className={cn(
                  !isMobile && "w-[90px]",
                  isMobile && "min-w-[90px]",
                  "px-2 overflow-hidden"
                )}>
                  <span className="text-xs whitespace-nowrap block truncate">
                    {hypothesisStatusLabel(hypothesis.status)}
                  </span>
                </TableCell>
                <TableCell className={cn(
                  !isMobile && "w-[80px]",
                  isMobile && "min-w-[80px]",
                  "px-2 overflow-hidden"
                )}>
                  <span className="text-xs whitespace-nowrap block truncate">
                    {hypothesis.priority ?? DEFAULT_HYPOTHESIS_PRIORITY}
                  </span>
                </TableCell>
                <TableCell className="break-words">
                  <div className="text-sm whitespace-pre-wrap">
                    {hypothesis.insight || <span className="text-muted-foreground italic">No insight</span>}
                  </div>
                </TableCell>
                <TableCell className="break-words">
                  <div className="text-sm whitespace-pre-wrap">
                    {hypothesis.problem_hypothesis || <span className="text-muted-foreground italic">No problem hypothesis</span>}
                  </div>
                  {hypothesis.problem_validation && (
                    <>
                      <div className="border-t border-border pt-2 mt-2" />
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {hypothesis.problem_validation}
                      </div>
                    </>
                  )}
                </TableCell>
                <TableCell className="break-words">
                  <div className="text-sm whitespace-pre-wrap">
                    {hypothesis.solution_hypothesis || <span className="text-muted-foreground italic">No solution hypothesis</span>}
                  </div>
                  {hypothesis.solution_validation && (
                    <>
                      <div className="border-t border-border pt-2 mt-2" />
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {hypothesis.solution_validation}
                      </div>
                    </>
                  )}
                </TableCell>
                <TableCell className="break-words">
                  <div className="flex flex-wrap gap-1">
                    {hypothesis.impact_metrics && Array.isArray(hypothesis.impact_metrics) && hypothesis.impact_metrics.length > 0 ? (
                      hypothesis.impact_metrics.map((metric, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                          {metric}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No metrics</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EntityDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingHypothesis(null);
            setPriorityInput("");
            setPriorityFieldError(false);
            setAttachmentsDialogOpen(false);
          }
        }}
        title={editingHypothesis?.id ? "Edit Hypothesis" : "New Hypothesis"}
        onSave={handleSaveHypothesis}
        onDelete={editingHypothesis?.id ? handleDeleteHypothesis : undefined}
        isEditing={!!editingHypothesis?.id}
        saveLabel="Save Hypothesis"
        saveDisabled={!!editingHypothesis && priorityFieldError}
        leftContent={editingHypothesis && (
          <HypothesisFormLeftContent
            value={editingHypothesis}
            onChange={setEditingHypothesis}
            metricSuggestions={metrics.map((m) => m.name).filter(Boolean)}
          />
        )}
        rightContent={editingHypothesis && (
          <>
            <HypothesisFormStatusAndPriority
              value={editingHypothesis}
              onChange={setEditingHypothesis}
              priorityInput={priorityInput}
              onPriorityInputChange={setPriorityInput}
              priorityFieldError={priorityFieldError}
              onPriorityFieldErrorChange={setPriorityFieldError}
            />
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  if (editingHypothesis?.id) {
                    const hypothesis = hypotheses.find(h => h.id === editingHypothesis.id);
                    if (hypothesis) {
                      setIsDialogOpen(false);
                      handleCreateFeature(hypothesis);
                    }
                  }
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Feature
              </Button>
            </div>
            {editingHypothesis?.id && (
              <>
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
                <div>
                  <Button
                    variant="outline"
                    onClick={handleCloneHypothesis}
                    className="w-full"
                    disabled={cloneHypothesisMutation.isPending}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Clone
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      />

      {currentProductId && editingHypothesis?.id && (
        <EntityAttachmentsDialog
          open={attachmentsDialogOpen}
          onOpenChange={setAttachmentsDialogOpen}
          productId={currentProductId}
          kind="hypothesis"
          entityId={editingHypothesis.id}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        title="Delete Hypothesis"
        description="Are you sure you want to delete this hypothesis? This action cannot be undone."
        onConfirm={confirmDeleteHypothesis}
      />

      <EntityDialog
        open={isFeatureDialogOpen}
        onOpenChange={setIsFeatureDialogOpen}
        title="Create Feature from Hypothesis"
        onSave={handleSaveFeature}
        saveLabel="Create Feature"
        leftContent={creatingFeature && (
          <>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={creatingFeature.title || ""}
                onChange={(e) => setCreatingFeature({ ...creatingFeature, title: e.target.value })}
                placeholder="Enter feature title..."
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={creatingFeature.description || ""}
                onChange={(e) => setCreatingFeature({ ...creatingFeature, description: e.target.value })}
                placeholder="Enter feature description..."
                rows={15}
              />
            </div>
          </>
        )}
        rightContent={creatingFeature && (
          <>
            <div className="min-w-0">
              <Label>Linked Hypothesis</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full min-w-0 justify-start overflow-hidden"
                disabled
                aria-disabled
                title={linkedHypothesisLabel}
              >
                <span className="min-w-0 truncate">{linkedHypothesisLabel}</span>
              </Button>
            </div>
            <div>
              <Label>Linked Goal</Label>
              <EntityCombobox
                items={sortedGoals.map((goal) => ({ id: goal.id, label: goal.goal || "" }))}
                value={creatingFeature.goal_id}
                fallbackLabel={goals.find((goal) => goal.id === creatingFeature.goal_id)?.goal || undefined}
                onSelect={(id) => {
                  if (!id) return;
                  setCreatingFeature({
                    ...creatingFeature,
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
                value={creatingFeature.initiative_id}
                fallbackLabel={
                  initiatives.find((initiative) => initiative.id === creatingFeature.initiative_id)?.name || undefined
                }
                onSelect={(id) => {
                  if (!id) return;
                  setCreatingFeature({ ...creatingFeature, initiative_id: id });
                }}
                placeholder="Select initiative..."
                searchPlaceholder="Search initiatives..."
                emptyText="No initiative found."
              />
            </div>
            <div>
              <Label htmlFor="column">Column</Label>
              <Select
                value={creatingFeature.board_column as BoardColumnId}
                onValueChange={(value: BoardColumnId) => setCreatingFeature({ ...creatingFeature, board_column: value })}
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
          </>
        )}
      />
    </div>
  );
};

export default HypothesesPage;
