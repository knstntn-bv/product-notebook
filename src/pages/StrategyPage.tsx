import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { ColorPicker } from "@/components/ColorPicker";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { InlineEditInput } from "@/components/InlineEditInput";
import { SectionHeader } from "@/components/SectionHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const StrategyPage = () => {
  const { metrics, initiatives, refetchMetrics, refetchInitiatives, isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [productFormula, setProductFormula] = useState("");
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState("");
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { name: string; parent_metric_id: string | null }>>({});
  const [editingInitiatives, setEditingInitiatives] = useState<Record<string, { name: string; description: string; color: string }>>({});

  // Fetch product formula
  const { data: formulaData } = useQuery({
    queryKey: ["product_formula", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data, error } = await supabase
        .from("product_formulas")
        .select("*")
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  useEffect(() => {
    if (formulaData) {
      setProductFormula(formulaData.formula || "");
    }
  }, [formulaData]);

  // Fetch values
  const { data: values = [] } = useQuery({
    queryKey: ["values", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("values")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Save formula mutation
  const saveFormulaMutation = useMutation({
    mutationFn: async (formula: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("product_formulas")
        .upsert({ user_id: user.id, formula }, { onConflict: "user_id" });
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
      const { error } = await supabase
        .from("values")
        .insert({ user_id: user.id, value_text: "", position });
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
      const { error } = await supabase
        .from("metrics")
        .insert({ user_id: user.id, name: "" });
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

  // Initiative mutations
  const addInitiativeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("initiatives")
        .insert({ user_id: user.id, name: "", description: "" });
      if (error) throw error;
    },
    onSuccess: () => refetchInitiatives(),
  });

  const updateInitiativeMutation = useMutation({
    mutationFn: async ({ id, name, description, color }: { id: string; name?: string; description?: string; color?: string }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      
      const { error } = await supabase
        .from("initiatives")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchInitiatives(),
  });

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
    onSuccess: () => refetchInitiatives(),
  });

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
            {!isReadOnly && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingFormula(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-border" />

      {/* Values */}
      <div className="py-8">
        <SectionHeader 
          title="Values" 
          description="Define your product values"
          onAdd={!isReadOnly ? () => addValueMutation.mutate() : undefined}
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
                  {!isReadOnly && (
                    <>
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
          onAdd={!isReadOnly ? () => addMetricMutation.mutate() : undefined}
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
                      {isReadOnly ? (
                        <span className="text-foreground">{metric.name || "Unnamed Metric"}</span>
                      ) : (
                        <InlineEditInput
                          value={editing.name}
                          onChange={(value) => setEditingMetrics(prev => ({
                            ...prev,
                            [metric.id]: { ...editing, name: value }
                          }))}
                          maxLength={100}
                          placeholder="Enter metric name..."
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className="text-foreground">
                          {metrics.find(m => m.id === metric.parent_metric_id)?.name || "None"}
                        </span>
                      ) : (
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
                      )}
                    </TableCell>
                    <TableCell>
                      {!isReadOnly && (
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
                      )}
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
          onAdd={!isReadOnly ? () => addInitiativeMutation.mutate() : undefined}
          addLabel="Add Initiative"
        />
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Initiative</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...initiatives]
                .sort((a, b) => {
                  // Sort: non-archived first, then archived
                  if (a.archived && !b.archived) return 1;
                  if (!a.archived && b.archived) return -1;
                  return 0;
                })
                .map((initiative) => {
                const editing = editingInitiatives[initiative.id] || { name: initiative.name, description: initiative.description, color: initiative.color || "#8B5CF6" };
                const hasChanges = editing.name !== initiative.name || editing.description !== initiative.description || editing.color !== (initiative.color || "#8B5CF6");
                const isArchived = initiative.archived || false;
                
                return (
                  <TableRow key={initiative.id} className={isArchived ? "opacity-50" : ""}>
                    <TableCell>
                      {isReadOnly ? (
                        <span className={isArchived ? "text-muted-foreground" : "text-foreground"}>{initiative.name || "Unnamed Initiative"}</span>
                      ) : (
                        <InlineEditInput
                          value={editing.name}
                          onChange={(value) => setEditingInitiatives(prev => ({
                            ...prev,
                            [initiative.id]: { ...editing, name: value }
                          }))}
                          maxLength={100}
                          placeholder="Enter initiative name..."
                          className={isArchived ? "text-muted-foreground" : ""}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <span className={isArchived ? "text-muted-foreground whitespace-pre-line" : "text-foreground whitespace-pre-line"}>{initiative.description}</span>
                      ) : (
                        <div className="flex items-center">
                          <AutoResizeTextarea
                            value={editing.description}
                            onChange={(v) => setEditingInitiatives(prev => ({
                              ...prev,
                              [initiative.id]: { ...editing, description: v }
                            }))}
                            placeholder="Enter description..."
                            className={isArchived ? "text-muted-foreground" : ""}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isReadOnly ? (
                        <div className={`w-6 h-6 rounded border ${isArchived ? "opacity-50" : ""}`} style={{ backgroundColor: initiative.color || "#8B5CF6" }} />
                      ) : (
                        <ColorPicker
                          value={editing.color}
                          onChange={(color) => setEditingInitiatives(prev => ({
                            ...prev,
                            [initiative.id]: { ...editing, color }
                          }))}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {!isReadOnly && (
                        <div className="flex gap-2">
                          {hasChanges && (
                            <Button 
                              size="sm" 
                              onClick={() => {
                                updateInitiativeMutation.mutate({ 
                                  id: initiative.id, 
                                  name: editing.name,
                                  description: editing.description,
                                  color: editing.color
                                });
                                setEditingInitiatives(prev => {
                                  const newState = { ...prev };
                                  delete newState[initiative.id];
                                  return newState;
                                });
                              }}
                            >
                              Save
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => archiveInitiativeMutation.mutate({ id: initiative.id, archived: !isArchived })}
                            title={isArchived ? "Unarchive" : "Archive"}
                          >
                            {isArchived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteInitiativeMutation.mutate(initiative.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </div>
    </div>
  );
};

export default StrategyPage;
