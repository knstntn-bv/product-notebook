import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

type Status = "new" | "inProgress" | "accepted" | "rejected";

interface Hypothesis {
  id: string;
  status: Status;
  insight: string;
  problem_hypothesis: string;
  problem_validation: string;
  solution_hypothesis: string;
  solution_validation: string;
  impact_metrics: string[];
}

const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      rows={2}
      className="w-full border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none leading-5"
    />
  );
};

const HypothesesPage = () => {
  const { metrics } = useProduct();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedHypotheses, setEditedHypotheses] = useState<Record<string, Partial<Hypothesis>>>({});

  const statuses: { value: Status; label: string }[] = [
    { value: "new", label: "New" },
    { value: "inProgress", label: "In Progress" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  // Fetch hypotheses
  const { data: hypotheses = [] } = useQuery({
    queryKey: ["hypotheses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("hypotheses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Hypothesis[];
    },
    enabled: !!user,
  });

  // Add hypothesis mutation
  const addHypothesisMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("hypotheses")
        .insert({
          user_id: user.id,
          status: "new",
          insight: "",
          problem_hypothesis: "",
          problem_validation: "",
          solution_hypothesis: "",
          solution_validation: "",
          impact_metrics: [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
    },
  });

  // Update hypothesis mutation
  const updateHypothesisMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Hypothesis> }) => {
      const { error } = await supabase
        .from("hypotheses")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
      setEditedHypotheses(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({ title: "Hypothesis saved successfully" });
    },
  });

  // Delete hypothesis mutation
  const deleteHypothesisMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hypotheses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
      toast({ title: "Hypothesis deleted" });
    },
  });

  const handleFieldChange = (id: string, field: keyof Hypothesis, value: any) => {
    setEditedHypotheses(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSave = (id: string) => {
    const updates = editedHypotheses[id];
    if (updates) {
      updateHypothesisMutation.mutate({ id, updates });
    }
  };

  const getHypothesisValue = (hypothesis: Hypothesis, field: keyof Hypothesis) => {
    return editedHypotheses[hypothesis.id]?.[field] ?? hypothesis[field];
  };

  const hasUnsavedChanges = (id: string) => {
    return !!editedHypotheses[id];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hypotheses Portfolio</h2>
        <Button onClick={() => addHypothesisMutation.mutate()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Hypothesis
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="min-w-[200px]">Insight</TableHead>
              <TableHead className="min-w-[200px]">Problem Hypothesis</TableHead>
              <TableHead className="min-w-[200px]">Problem Validation</TableHead>
              <TableHead className="min-w-[200px]">Solution Hypothesis</TableHead>
              <TableHead className="min-w-[200px]">Solution Validation</TableHead>
              <TableHead className="min-w-[200px]">Impact Metrics</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hypotheses.map((hypothesis) => (
              <TableRow key={hypothesis.id}>
                <TableCell>
                  <Select
                    value={getHypothesisValue(hypothesis, "status") as Status}
                    onValueChange={(value: Status) =>
                      handleFieldChange(hypothesis.id, "status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "insight") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "insight", v)}
                    placeholder="Enter insight..."
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_hypothesis", v)}
                    placeholder="Enter problem hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_validation", v)}
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_hypothesis", v)}
                    placeholder="Enter solution hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_validation", v)}
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <MetricTagInput
                    value={(getHypothesisValue(hypothesis, "impact_metrics") as string[]) || []}
                    onChange={(tags) => handleFieldChange(hypothesis.id, "impact_metrics", tags)}
                    suggestions={metrics.map(m => m.name).filter(Boolean)}
                    placeholder="Type to add metrics..."
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {hasUnsavedChanges(hypothesis.id) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSave(hypothesis.id)}
                        disabled={updateHypothesisMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHypothesisMutation.mutate(hypothesis.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default HypothesesPage;
