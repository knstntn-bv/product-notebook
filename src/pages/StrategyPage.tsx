import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { ColorPicker } from "@/components/ColorPicker";
import { InlineEditInput } from "@/components/InlineEditInput";
import { SectionHeader } from "@/components/SectionHeader";
import { EntityDialog } from "@/components/EntityDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formulaKey, initiativesKey, metricsKey, requireProductId, valuesKey, type InitiativeRow } from "@/lib/productQueries";
import { archiveRow, compareByPriorityThenArchive, visibleByArchive } from "@/lib/archive";
import { errorToast } from "@/lib/errorToast";
import { DEFAULT_INITIATIVE_COLOR, DEFAULT_INITIATIVE_PRIORITY, parseInitiativePriorityInput } from "@/lib/initiatives";

const StrategyPage = () => {
  const { metrics, initiatives, showArchived, currentProductId } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [productFormula, setProductFormula] = useState("");
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState("");
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { name: string; parent_metric_id: string | null }>>({});
  const [editingInitiative, setEditingInitiative] = useState<Partial<InitiativeRow> | null>(null);
  const [isInitiativeDialogOpen, setIsInitiativeDialogOpen] = useState(false);
  const [deleteInitiativeAlertOpen, setDeleteInitiativeAlertOpen] = useState(false);
  const [initiativePriorityInput, setInitiativePriorityInput] = useState("");
  const [initiativePriorityFieldError, setInitiativePriorityFieldError] = useState(false);

  // Fetch product formula
  const { data: formulaData } = useQuery({
    queryKey: formulaKey(currentProductId),
    queryFn: async () => {
      if (!currentProductId) return null;
      const { data, error } = await supabase
        .from("product_formulas")
        .select("*")
        .eq("product_id", currentProductId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentProductId,
  });

  useEffect(() => {
    if (formulaData) {
      setProductFormula(formulaData.formula || "");
    }
  }, [formulaData]);

  // Fetch values
  const { data: values = [] } = useQuery({
    queryKey: valuesKey(currentProductId),
    queryFn: async () => {
      if (!currentProductId) return [];
      const { data, error } = await supabase
        .from("values")
        .select("*")
        .eq("product_id", currentProductId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProductId,
  });

  // Save formula mutation
  const saveFormulaMutation = useMutation({
    mutationFn: async (formula: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("product_formulas")
        .upsert({ product_id: productId, formula }, { onConflict: "product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formulaKey(currentProductId) });
      setIsEditingFormula(false);
      toast({ title: "Formula saved successfully" });
    },
    onError: errorToast,
  });

  // Value mutations
  const addValueMutation = useMutation({
    mutationFn: async () => {
      const productId = requireProductId(currentProductId);
      const position = values.length;
      const { error } = await supabase
        .from("values")
        .insert({ product_id: productId, value_text: "", position });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valuesKey(currentProductId) });
    },
    onError: errorToast,
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ id, value_text }: { id: string; value_text: string }) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("values")
        .update({ value_text })
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valuesKey(currentProductId) });
    },
    onError: errorToast,
  });

  const deleteValueMutation = useMutation({
    mutationFn: async (id: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("values")
        .delete()
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: valuesKey(currentProductId) });
    },
    onError: errorToast,
  });

  // Metric mutations
  const addMetricMutation = useMutation({
    mutationFn: async () => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("metrics")
        .insert({ product_id: productId, name: "" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metricsKey(currentProductId) });
    },
    onError: errorToast,
  });

  const updateMetricMutation = useMutation({
    mutationFn: async ({ id, name, parent_metric_id }: { id: string; name?: string; parent_metric_id?: string | null }) => {
      const productId = requireProductId(currentProductId);
      const updates: TablesUpdate<"metrics"> = {};
      if (name !== undefined) updates.name = name;
      if (parent_metric_id !== undefined) updates.parent_metric_id = parent_metric_id || null;
      
      const { error } = await supabase
        .from("metrics")
        .update(updates)
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metricsKey(currentProductId) });
    },
    onError: errorToast,
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("metrics")
        .delete()
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metricsKey(currentProductId) });
    },
    onError: errorToast,
  });

  // Initiative mutations - теперь используем createInitiative для открытия редактора


  const deleteInitiativeMutation = useMutation({
    mutationFn: async (id: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase
        .from("initiatives")
        .delete()
        .eq("id", id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativesKey(currentProductId) });
      setIsInitiativeDialogOpen(false);
      setEditingInitiative(null);
      setInitiativePriorityInput("");
      setInitiativePriorityFieldError(false);
      toast({ title: "Initiative deleted successfully" });
    },
    onError: errorToast,
  });

  const archiveInitiativeMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const productId = requireProductId(currentProductId);
      return archiveRow("initiatives", id, archived, productId);
    },
    onSuccess: (fields, variables) => {
      queryClient.invalidateQueries({ queryKey: initiativesKey(currentProductId) });
      if (editingInitiative?.id === variables.id) {
        setEditingInitiative({ ...editingInitiative, archived: fields.archived });
      }
      toast({
        title: fields.archived
          ? "Initiative archived successfully"
          : "Initiative unarchived successfully",
      });
    },
    onError: errorToast,
  });

  // Functions for initiative editor
  const createInitiative = () => {
    setEditingInitiative({
      name: "",
      description: "",
      color: DEFAULT_INITIATIVE_COLOR,
      priority: DEFAULT_INITIATIVE_PRIORITY,
      target_metric_id: null,
    });
    setInitiativePriorityInput(String(DEFAULT_INITIATIVE_PRIORITY));
    setInitiativePriorityFieldError(false);
    setIsInitiativeDialogOpen(true);
  };

  const editInitiative = (initiative: typeof initiatives[0]) => {
    const priority = initiative.priority ?? DEFAULT_INITIATIVE_PRIORITY;
    setEditingInitiative({
      id: initiative.id,
      name: initiative.name,
      description: initiative.description || "",
      color: initiative.color || DEFAULT_INITIATIVE_COLOR,
      priority,
      target_metric_id: initiative.target_metric_id || null,
      archived: initiative.archived || false,
    });
    setInitiativePriorityInput(String(priority));
    setInitiativePriorityFieldError(false);
    setIsInitiativeDialogOpen(true);
  };

  const saveInitiativeMutation = useMutation({
    mutationFn: async (initiative: NonNullable<typeof editingInitiative>) => {
      const productId = requireProductId(currentProductId);
      const isEditing = !!initiative.id;
      
      if (isEditing) {
        // Update existing
        const updates: TablesUpdate<"initiatives"> = {};
        if (initiative.name !== undefined) updates.name = initiative.name;
        if (initiative.description !== undefined) updates.description = initiative.description;
        if (initiative.color !== undefined) updates.color = initiative.color;
        if (initiative.target_metric_id !== undefined) updates.target_metric_id = initiative.target_metric_id;
        if (initiative.priority !== undefined) updates.priority = initiative.priority;
        
        const { error } = await supabase
          .from("initiatives")
          .update(updates)
          .eq("id", initiative.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("initiatives")
          .insert({
            product_id: productId,
            name: initiative.name || "",
            description: initiative.description || "",
            color: initiative.color || DEFAULT_INITIATIVE_COLOR,
            priority: initiative.priority ?? DEFAULT_INITIATIVE_PRIORITY,
            target_metric_id: initiative.target_metric_id || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: initiativesKey(currentProductId) });
      setIsInitiativeDialogOpen(false);
      setEditingInitiative(null);
      setInitiativePriorityInput("");
      setInitiativePriorityFieldError(false);
      toast({ title: variables.id ? "Initiative updated successfully" : "Initiative created successfully" });
    },
    onError: errorToast,
  });

  const saveInitiative = () => {
    if (!editingInitiative) return;
    
    if (!editingInitiative.name?.trim()) {
      toast({ title: "Error", description: "Initiative name is required", variant: "destructive" });
      return;
    }

    const parsed = parseInitiativePriorityInput(initiativePriorityInput);
    if (!parsed.ok) {
      setInitiativePriorityFieldError(true);
      toast({
        title: "Invalid priority",
        description: "Enter a whole number from 1 to 99.",
        variant: "destructive",
      });
      return;
    }

    saveInitiativeMutation.mutate({ ...editingInitiative, priority: parsed.value });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="divide-y divide-border">
      {/* Product Formula */}
      <section className="space-y-4 pb-6">
        <SectionHeader 
          title="Product Formula" 
          description="Define your product's core formula"
        />
        {isEditingFormula ? (
          <div className="space-y-2">
            <Input
              value={productFormula}
              onChange={(e) => setProductFormula(e.target.value)}
              maxLength={500}
              placeholder="Enter product formula..."
            />
            <Button onClick={() => saveFormulaMutation.mutate(productFormula)} size="sm">
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-foreground">{productFormula || "No product formula"}</p>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingFormula(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>

      {/* Values */}
      <section className="space-y-4 py-6">
        <SectionHeader 
          title="Values" 
          description="Define your product values"
          onAdd={() => addValueMutation.mutate()}
          addLabel="Add Value"
        />
        <div className="space-y-4">
          {values.map((value, index) => (
            <div key={value.id} className="flex gap-2">
              {editingValueIndex === index ? (
                <>
                  <Textarea
                    value={editingValueText}
                    onChange={(e) => setEditingValueText(e.target.value)}
                    maxLength={1000}
                    placeholder="Enter value..."
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      updateValueMutation.mutate({ id: value.id, value_text: editingValueText });
                      setEditingValueIndex(null);
                    }}
                    size="sm"
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-foreground">{value.value_text || "No value"}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingValueIndex(index);
                      setEditingValueText(value.value_text);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteValueMutation.mutate(value.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Metrics Table */}
      <section className="space-y-4 py-6">
        <SectionHeader 
          title="Metrics" 
          description="Define your product metrics hierarchy"
          onAdd={() => addMetricMutation.mutate()}
          addLabel="Add Metric"
        />
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Parent Metric</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => {
                const editing = editingMetrics[metric.id] || { name: metric.name, parent_metric_id: metric.parent_metric_id || null };
                const hasChanges = editing.name !== metric.name || editing.parent_metric_id !== (metric.parent_metric_id || null);
                
                return (
                  <TableRow key={metric.id}>
                    <TableCell>
                      <InlineEditInput
                        value={editing.name}
                        onChange={(value) => setEditingMetrics(prev => ({
                          ...prev,
                          [metric.id]: { ...editing, name: value }
                        }))}
                        maxLength={100}
                        placeholder="Enter metric name..."
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editing.parent_metric_id || "none"}
                        onValueChange={(value) => setEditingMetrics(prev => ({
                          ...prev,
                          [metric.id]: { ...editing, parent_metric_id: value === "none" ? null : value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {metrics.filter(m => m.id !== metric.id).map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name || "Unnamed Metric"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasChanges && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              updateMetricMutation.mutate({ 
                                id: metric.id, 
                                name: editing.name,
                                parent_metric_id: editing.parent_metric_id
                              });
                              setEditingMetrics(prev => {
                                const newState = { ...prev };
                                delete newState[metric.id];
                                return newState;
                              });
                            }}
                          >
                            Save
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteMetricMutation.mutate(metric.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </section>

      {/* Initiatives Table */}
      <section className="space-y-4 pt-6">
        <SectionHeader 
          title="Initiatives" 
          description="Define your product initiatives"
          onAdd={createInitiative}
          addLabel="Add Initiative"
        />
        <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%]">Initiative</TableHead>
                <TableHead className="w-[45%]">Description</TableHead>
                <TableHead className="w-[25%]">Target Metric</TableHead>
                <TableHead className="w-[10%]">Color</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleByArchive(initiatives, showArchived)
                .sort(compareByPriorityThenArchive)
                .map((initiative) => {
                const isArchived = initiative.archived || false;
                const targetMetric = initiative.target_metric_id 
                  ? metrics.find(m => m.id === initiative.target_metric_id)
                  : null;
                
                return (
                  <TableRow 
                    key={initiative.id} 
                    className={cn(
                      isArchived ? "opacity-50" : "",
                      "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => editInitiative(initiative)}
                  >
                    <TableCell className={cn(
                      isArchived ? "text-muted-foreground" : "",
                      "break-words"
                    )}>
                      {initiative.name}
                    </TableCell>
                    <TableCell className={cn(
                      isArchived ? "text-muted-foreground" : "",
                      "break-words"
                    )}>
                      {initiative.description || "—"}
                    </TableCell>
                    <TableCell className={cn(
                      isArchived ? "text-muted-foreground" : "",
                      "break-words"
                    )}>
                      {targetMetric ? targetMetric.name : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: initiative.color || DEFAULT_INITIATIVE_COLOR }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </section>
      </div>

      {/* Initiative Editor Dialog */}
      <EntityDialog
        open={isInitiativeDialogOpen}
        onOpenChange={setIsInitiativeDialogOpen}
        title={editingInitiative?.id ? "Edit Initiative" : "New Initiative"}
        onSave={saveInitiative}
        onDelete={editingInitiative?.id ? () => {
          setDeleteInitiativeAlertOpen(true);
        } : undefined}
        onArchive={editingInitiative?.id ? () => {
          const isArchived = editingInitiative.archived || false;
          archiveInitiativeMutation.mutate({ id: editingInitiative.id!, archived: !isArchived });
        } : undefined}
        isEditing={!!editingInitiative?.id}
        saveLabel="Save Initiative"
        saveDisabled={initiativePriorityFieldError}
        isArchived={editingInitiative?.archived || false}
        leftContent={editingInitiative && (
          <>
            <div>
              <Label htmlFor="initiative-name">Name *</Label>
              <Input
                id="initiative-name"
                value={editingInitiative.name || ""}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, name: e.target.value })}
                placeholder="Enter initiative name..."
              />
            </div>
            <div>
              <Label htmlFor="initiative-description">Description</Label>
              <Textarea
                id="initiative-description"
                value={editingInitiative.description || ""}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, description: e.target.value })}
                placeholder="Enter description..."
                rows={6}
              />
            </div>
          </>
        )}
        rightContent={editingInitiative && (
          <>
            <div>
              <Label htmlFor="initiative-priority">Priority</Label>
              <Input
                id="initiative-priority"
                type="text"
                inputMode="numeric"
                value={initiativePriorityInput}
                onChange={(e) => {
                  const next = e.target.value;
                  setInitiativePriorityInput(next);
                  const parsed = parseInitiativePriorityInput(next);
                  if (!parsed.ok) {
                    setInitiativePriorityFieldError(true);
                  } else {
                    setInitiativePriorityFieldError(false);
                    setEditingInitiative({ ...editingInitiative, priority: parsed.value });
                  }
                }}
                aria-invalid={initiativePriorityFieldError}
                aria-describedby={initiativePriorityFieldError ? "initiative-priority-error" : undefined}
                className={cn(
                  initiativePriorityFieldError &&
                    "border-destructive/55 focus-visible:ring-0 focus-visible:ring-offset-0",
                )}
              />
              {initiativePriorityFieldError ? (
                <p id="initiative-priority-error" className="text-sm text-destructive mt-1">
                  Enter a whole number from 1 to 99.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Lower number = higher priority</p>
              )}
            </div>
            <div>
              <Label htmlFor="initiative-metric">Target Metric</Label>
              <Select
                value={editingInitiative.target_metric_id || "none"}
                onValueChange={(value) => setEditingInitiative({ ...editingInitiative, target_metric_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {metrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label htmlFor="initiative-color">Color</Label>
              <ColorPicker
                value={editingInitiative.color || DEFAULT_INITIATIVE_COLOR}
                onChange={(color) => setEditingInitiative({ ...editingInitiative, color })}
                className="w-full"
              />
            </div>
          </>
        )}
      />

      <ConfirmDeleteDialog
        open={deleteInitiativeAlertOpen}
        onOpenChange={setDeleteInitiativeAlertOpen}
        title="Delete Initiative"
        description="Are you sure you want to delete this initiative? This action cannot be undone."
        onConfirm={() => {
          if (editingInitiative?.id) {
            deleteInitiativeMutation.mutate(editingInitiative.id);
          }
        }}
      />
    </div>
  );
};

export default StrategyPage;
