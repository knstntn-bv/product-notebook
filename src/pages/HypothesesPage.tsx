import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";

type Status = "new" | "inProgress" | "accepted" | "rejected";

interface Hypothesis {
  id: string;
  status: Status;
  insight: string;
  problemHypothesis: string;
  problemValidation: string;
  solutionHypothesis: string;
  solutionValidation: string;
  impactMetrics: string[];
}

const HypothesesPage = () => {
  const { metrics } = useProduct();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);

  const statuses: { value: Status; label: string }[] = [
    { value: "new", label: "New" },
    { value: "inProgress", label: "In Progress" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  const addHypothesis = () => {
    setHypotheses([
      ...hypotheses,
      {
        id: `hypothesis-${Date.now()}`,
        status: "new",
        insight: "",
        problemHypothesis: "",
        problemValidation: "",
        solutionHypothesis: "",
        solutionValidation: "",
        impactMetrics: [],
      },
    ]);
  };

  const updateHypothesis = (id: string, field: keyof Hypothesis, value: any) => {
    setHypotheses(hypotheses.map(h => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const deleteHypothesis = (id: string) => {
    setHypotheses(hypotheses.filter(h => h.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hypotheses Portfolio</h2>
        <Button onClick={addHypothesis}>
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
                      updateHypothesis(hypothesis.id, "status", value)
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
                    value={hypothesis.insight}
                    onChange={(e) =>
                      updateHypothesis(hypothesis.id, "insight", e.target.value)
                    }
                    placeholder="Enter insight..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.problemHypothesis}
                    onChange={(e) =>
                      updateHypothesis(hypothesis.id, "problemHypothesis", e.target.value)
                    }
                    placeholder="Enter problem hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.problemValidation}
                    onChange={(e) =>
                      updateHypothesis(hypothesis.id, "problemValidation", e.target.value)
                    }
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.solutionHypothesis}
                    onChange={(e) =>
                      updateHypothesis(hypothesis.id, "solutionHypothesis", e.target.value)
                    }
                    placeholder="Enter solution hypothesis..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={hypothesis.solutionValidation}
                    onChange={(e) =>
                      updateHypothesis(hypothesis.id, "solutionValidation", e.target.value)
                    }
                    placeholder="Enter validation (links supported)..."
                  />
                </TableCell>
                <TableCell>
                  <MetricTagInput
                    value={hypothesis.impactMetrics}
                    onChange={(tags) => updateHypothesis(hypothesis.id, "impactMetrics", tags)}
                    suggestions={metrics.map(m => m.name).filter(Boolean)}
                    placeholder="Type to add metrics..."
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHypothesis(hypothesis.id)}
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
