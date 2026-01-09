import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { ColorPicker } from "@/components/ColorPicker";
import { InlineEditInput } from "@/components/InlineEditInput";
import { SectionHeader } from "@/components/SectionHeader";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const StrategyPage = () => {
  const { metrics, initiatives, refetchMetrics, refetchInitiatives, showArchived, currentProductId } = useProduct();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [productFormula, setProductFormula] = useState("");
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState("");
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { name: string; parent_metric_id: string | null }>>({});
  const [editingInitiative, setEditingInitiative] = useState<Partial<{ id: string; name: string; description: string; color: string; target_metric_id: string | null; priority: number; archived: boolean }> | null>(null);
  const [isInitiativeDialogOpen, setIsInitiativeDialogOpen] = useState(false);
  const [deleteInitiativeAlertOpen, setDeleteInitiativeAlertOpen] = useState(false);

  // Fetch product formula
  const { data: formulaData } = useQuery({
    queryKey: ["product_formula", currentProductId],
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
    queryKey: ["values", currentProductId],
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
      if (!user) throw new Error("No user");
      if (!currentProductId) throw new Error("No product selected");
      const { error } = await supabase
        .from("product_formulas")
        .upsert({ product_id: currentProductId, formula }, { onConflict: "product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_formula"] });
      setIsEditingFormula(false);
      toast({ title: "Formula saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Value mutations
  const addValueMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const position = values.length;
      if (!currentProductId) throw new Error("No product selected");
      const { error } = await supabase
        .from("values")
        .insert({ product_id: currentProductId, value_text: "", position });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["values"] });
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ id, value_text }: { id: string; value_text: string }) => {
      const { error } = await supabase
        .from("values")
        .update({ value_text })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["values"] });
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("values").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["values"] });
    },
  });

  // Metric mutations
  const addMetricMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      if (!currentProductId) throw new Error("No product selected");
      const { error } = await supabase
        .from("metrics")
        .insert({ product_id: currentProductId, name: "" });
      if (error) throw error;
    },
    onSuccess: () => refetchMetrics(),
  });

  const updateMetricMutation = useMutation({
    mutationFn: async ({ id, name, parent_metric_id }: { id: string; name?: string; parent_metric_id?: string | null }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (parent_metric_id !== undefined) updates.parent_metric_id = parent_metric_id || null;
      
      const { error } = await supabase
        .from("metrics")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchMetrics(),
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchMetrics(),
  });

  // Initiative mutations - теперь используем createInitiative для открытия редактора


  const deleteInitiativeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("initiatives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchInitiatives(),
  });

  const archiveInitiativeMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const updates: any = { archived };
      if (archived) {
        updates.archived_at = new Date().toISOString();
      } else {
        updates.archived_at = null;
      }
      
      const { error } = await supabase
        .from("initiatives")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchInitiatives();
      toast({ title: "Initiative archived successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Functions for initiative editor
  const createInitiative = () => {
    setEditingInitiative({
      name: "",
      description: "",
      color: "#8B5CF6",
      priority: 3,
      target_metric_id: null,
    });
    setIsInitiativeDialogOpen(true);
  };

  const editInitiative = (initiative: typeof initiatives[0]) => {
    setEditingInitiative({
      id: initiative.id,
      name: initiative.name,
      description: initiative.description || "",
      color: initiative.color || "#8B5CF6",
      priority: initiative.priority || 3,
      target_metric_id: initiative.target_metric_id || null,
      archived: initiative.archived || false,
    });
    setIsInitiativeDialogOpen(true);
  };

  const saveInitiativeMutation = useMutation({
    mutationFn: async (initiative: NonNullable<typeof editingInitiative>) => {
      if (!currentProductId) throw new Error("No product selected");
      const isEditing = !!initiative.id;
      
      if (isEditing) {
        // Update existing
        const updates: any = {};
        if (initiative.name !== undefined) updates.name = initiative.name;
        if (initiative.description !== undefined) updates.description = initiative.description;
        if (initiative.color !== undefined) updates.color = initiative.color;
        if (initiative.target_metric_id !== undefined) updates.target_metric_id = initiative.target_metric_id;
        if (initiative.priority !== undefined) updates.priority = initiative.priority;
        
        const { error } = await supabase
          .from("initiatives")
          .update(updates)
          .eq("id", initiative.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("initiatives")
          .insert({
            product_id: currentProductId,
            name: initiative.name || "",
            description: initiative.description || "",
            color: initiative.color || "#8B5CF6",
            priority: initiative.priority || 3,
            target_metric_id: initiative.target_metric_id || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      refetchInitiatives();
      setIsInitiativeDialogOpen(false);
      setEditingInitiative(null);
      toast({ title: variables.id ? "Initiative updated successfully" : "Initiative created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveInitiative = () => {
    if (!editingInitiative) return;
    
    if (!editingInitiative.name?.trim()) {
      toast({ title: "Error", description: "Initiative name is required", variant: "destructive" });
      return;
    }

    saveInitiativeMutation.mutate(editingInitiative);
  };

  return (
    <div className="space-y-0"> {/* Remove card spacing. Use manual spacing and dividers */}
      {/* Product Formula */}
      <div className="py-8">
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
      </div>

      <div className="border-b border-border" />

      {/* Values */}
      <div className="py-8">
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
      </div>

      <div className="border-b border-border" />

      {/* Metrics Table */}
      <div className="py-8">
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
      </div>

      <div className="border-b border-border" />

      {/* Initiatives Table */}
      <div className="py-8">
        <SectionHeader 
          title="Initiatives" 
          description="Define your product initiatives"
          onAdd={createInitiative}
          addLabel="Add Initiative"
        />
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Initiative</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Target Metric</TableHead>
                <TableHead>Color</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...initiatives]
                .filter(initiative => showArchived || !initiative.archived)
                .sort((a, b) => {
                  // Sort: first by priority ASC, then non-archived before archived
                  if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                  }
                  if (a.archived && !b.archived) return 1;
                  if (!a.archived && b.archived) return -1;
                  return 0;
                })
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
                    <TableCell className={isArchived ? "text-muted-foreground" : ""}>
                      {initiative.name}
                    </TableCell>
                    <TableCell className={isArchived ? "text-muted-foreground" : ""}>
                      {initiative.description || "—"}
                    </TableCell>
                    <TableCell className={isArchived ? "text-muted-foreground" : ""}>
                      {targetMetric ? targetMetric.name : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-4 w-4 rounded border"
                          style={{ backgroundColor: initiative.color || "#8B5CF6" }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                type="number"
                min={1}
                value={editingInitiative.priority || 3}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, priority: parseInt(e.target.value) || 3 })}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Lower number = higher priority</p>
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
                value={editingInitiative.color || "#8B5CF6"}
                onChange={(color) => setEditingInitiative({ ...editingInitiative, color })}
                className="w-full"
              />
            </div>
          </>
        )}
      />

      {/* Delete Initiative Alert */}
      <AlertDialog open={deleteInitiativeAlertOpen} onOpenChange={setDeleteInitiativeAlertOpen}>
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
              onClick={() => {
                if (editingInitiative?.id) {
                  deleteInitiativeMutation.mutate(editingInitiative.id);
                  setDeleteInitiativeAlertOpen(false);
                  setEditingInitiative(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StrategyPage;
