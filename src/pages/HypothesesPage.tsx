import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const HypothesesPage = () => {
  const { metrics } = useProduct();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      return data || [];
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
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from("hypotheses")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
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
    },
  });

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
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hypotheses.map((hypothesis) => (
              <TableRow key={hypothesis.id}>
                <TableCell>
                  <Select
                    value={hypothesis.status}
                    onValueChange={(value: Status) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "status", value })
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
                  <Input
                    value={hypothesis.insight || ""}
                    onChange={(e) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "insight", value: e.target.value })
                    }
                    placeholder="Enter insight..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.problem_hypothesis || ""}
                    onChange={(e) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "problem_hypothesis", value: e.target.value })
                    }
                    placeholder="Enter problem hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.problem_validation || ""}
                    onChange={(e) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "problem_validation", value: e.target.value })
                    }
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.solution_hypothesis || ""}
                    onChange={(e) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "solution_hypothesis", value: e.target.value })
                    }
                    placeholder="Enter solution hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.solution_validation || ""}
                    onChange={(e) =>
                      updateHypothesisMutation.mutate({ id: hypothesis.id, field: "solution_validation", value: e.target.value })
                    }
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <MetricTagInput
                    value={hypothesis.impact_metrics || []}
                    onChange={(tags) => updateHypothesisMutation.mutate({ id: hypothesis.id, field: "impact_metrics", value: tags })}
                    suggestions={metrics.map(m => m.name).filter(Boolean)}
                    placeholder="Type to add metrics..."
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHypothesisMutation.mutate(hypothesis.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
