import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { SectionHeader } from "@/components/SectionHeader";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Status = "new" | "inProgress" | "accepted" | "rejected";
type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

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

interface Feature {
  id?: string;
  title: string;
  description: string;
  initiative_id?: string;
  track_id?: string;
  board_column: ColumnId;
}

interface Initiative {
  id: string;
  goal: string;
  track_id: string;
}

interface Track {
  id: string;
  name: string;
  color?: string;
}

const HypothesesPage = () => {
  const { metrics, isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedHypotheses, setEditedHypotheses] = useState<Record<string, Partial<Hypothesis>>>({});
  const [statusSort, setStatusSort] = useState<"asc" | "desc" | null>(null);

  const statuses: { value: Status; label: string }[] = [
    { value: "new", label: "New" },
    { value: "inProgress", label: "In Progress" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  // Fetch hypotheses
  const { data: hypotheses = [] } = useQuery({
    queryKey: ["hypotheses", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("hypotheses")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Hypothesis[];
    },
    enabled: !!effectiveUserId,
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

  const handleStatusSort = () => {
    if (statusSort === null) {
      setStatusSort("asc");
    } else if (statusSort === "asc") {
      setStatusSort("desc");
    } else {
      setStatusSort(null);
    }
  };

  const sortedHypotheses = [...hypotheses].sort((a, b) => {
    if (statusSort === null) return 0;
    
    const statusOrder: Record<Status, number> = {
      new: 1,
      inProgress: 2,
      accepted: 3,
      rejected: 4,
    };
    
    const aStatus = getHypothesisValue(a, "status") as Status || a.status;
    const bStatus = getHypothesisValue(b, "status") as Status || b.status;
    
    const comparison = statusOrder[aStatus] - statusOrder[bStatus];
    return statusSort === "asc" ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Hypotheses Portfolio"
        onAdd={!isReadOnly ? () => addHypothesisMutation.mutate() : undefined}
        addLabel="Add Hypothesis"
      />

      <div className="w-full overflow-x-auto">
        <Table className="w-full table-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="min-w-[150px]">Insight</TableHead>
              <TableHead className="min-w-[150px]">Problem Hypothesis</TableHead>
              <TableHead className="min-w-[150px]">Problem Validation</TableHead>
              <TableHead className="min-w-[150px]">Solution Hypothesis</TableHead>
              <TableHead className="min-w-[150px]">Solution Validation</TableHead>
              <TableHead className="min-w-[50px]">Impact Metrics</TableHead>
              <TableHead className="min-w-[100px]">Actions</TableHead>
              <TableHead className="min-w-[120px]">
                <button
                  onClick={handleStatusSort}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  type="button"
                >
                  Status
                  {statusSort === "asc" && <ArrowUp className="h-4 w-4" />}
                  {statusSort === "desc" && <ArrowDown className="h-4 w-4" />}
                </button>
              </TableHead>
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
            {sortedHypotheses.map((hypothesis) => (
              <TableRow key={hypothesis.id}>
                <TableCell>
                  <Select
                    value={getHypothesisValue(hypothesis, "status") as Status}
                    onValueChange={(value: Status) =>
                      handleFieldChange(hypothesis.id, "status", value)
                    }
                    disabled={isReadOnly}
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
                    rows={2}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_hypothesis", v)}
                    placeholder="Enter problem hypothesis..."
                    rows={2}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_validation", v)}
                    placeholder="Enter validation (links supported)..."
                    rows={2}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_hypothesis", v)}
                    placeholder="Enter solution hypothesis..."
                    rows={2}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_validation", v)}
                    placeholder="Enter validation (links supported)..."
                    rows={2}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <div className="max-w-[150px]">
                    <MetricTagInput
                      value={(getHypothesisValue(hypothesis, "impact_metrics") as string[]) || []}
                      onChange={(tags) => handleFieldChange(hypothesis.id, "impact_metrics", tags)}
                      suggestions={metrics.map(m => m.name).filter(Boolean)}
                      placeholder="Type to add metrics..."
                      disabled={isReadOnly}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  {!isReadOnly && (
                    <div className="flex flex-col gap-2">
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
                  )}
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
