import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { ColorPicker } from "@/components/ColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const StrategyPage = () => {
  const { metrics, tracks, refetchMetrics, refetchTracks } = useProduct();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [productFormula, setProductFormula] = useState("");
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editingValueIndex, setEditingValueIndex] = useState<number | null>(null);
  const [editingValueText, setEditingValueText] = useState("");
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { name: string; parent_metric_id: string | null }>>({});
  const [editingTracks, setEditingTracks] = useState<Record<string, { name: string; description: string; color: string }>>({});

  // Fetch product formula
  const { data: formulaData } = useQuery({
    queryKey: ["product_formula", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("product_formulas")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (formulaData) {
      setProductFormula(formulaData.formula || "");
    }
  }, [formulaData]);

  // Fetch values
  const { data: values = [] } = useQuery({
    queryKey: ["values", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("values")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
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

  // Track mutations
  const addTrackMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("tracks")
        .insert({ user_id: user.id, name: "", description: "" });
      if (error) throw error;
    },
    onSuccess: () => refetchTracks(),
  });

  const updateTrackMutation = useMutation({
    mutationFn: async ({ id, name, description, color }: { id: string; name?: string; description?: string; color?: string }) => {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      
      const { error } = await supabase
        .from("tracks")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchTracks(),
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchTracks(),
  });

  return (
    <div className="space-y-6">
      {/* Product Formula */}
      <Card>
        <CardHeader>
          <CardTitle>Product Formula</CardTitle>
          <CardDescription>Define your product's core formula</CardDescription>
        </CardHeader>
        <CardContent>
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
              <p className="text-foreground">{productFormula || "Click edit to add product formula"}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingFormula(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Values */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Values</CardTitle>
              <CardDescription>Define your product values</CardDescription>
            </div>
            <Button onClick={() => addValueMutation.mutate()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <p className="flex-1 text-foreground">{value.value_text || "Click edit to add value"}</p>
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
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Define your product metrics hierarchy</CardDescription>
            </div>
            <Button onClick={() => addMetricMutation.mutate()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditingMetrics(prev => ({
                          ...prev,
                          [metric.id]: { ...editing, name: e.target.value }
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
        </CardContent>
      </Card>

      {/* Tracks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tracks</CardTitle>
              <CardDescription>Define your product tracks</CardDescription>
            </div>
            <Button onClick={() => addTrackMutation.mutate()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => {
                const editing = editingTracks[track.id] || { name: track.name, description: track.description, color: track.color || "#8B5CF6" };
                const hasChanges = editing.name !== track.name || editing.description !== track.description || editing.color !== (track.color || "#8B5CF6");
                
                return (
                  <TableRow key={track.id}>
                    <TableCell>
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditingTracks(prev => ({
                          ...prev,
                          [track.id]: { ...editing, name: e.target.value }
                        }))}
                        maxLength={100}
                        placeholder="Enter track name..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editing.description}
                        onChange={(e) => setEditingTracks(prev => ({
                          ...prev,
                          [track.id]: { ...editing, description: e.target.value }
                        }))}
                        maxLength={500}
                        placeholder="Enter description..."
                      />
                    </TableCell>
                    <TableCell>
                      <ColorPicker
                        value={editing.color}
                        onChange={(color) => setEditingTracks(prev => ({
                          ...prev,
                          [track.id]: { ...editing, color }
                        }))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {hasChanges && (
                          <Button 
                            size="sm" 
                            onClick={() => {
                              updateTrackMutation.mutate({ 
                                id: track.id, 
                                name: editing.name,
                                description: editing.description,
                                color: editing.color
                              });
                              setEditingTracks(prev => {
                                const newState = { ...prev };
                                delete newState[track.id];
                                return newState;
                              });
                            }}
                          >
                            Save
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteTrackMutation.mutate(track.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyPage;
