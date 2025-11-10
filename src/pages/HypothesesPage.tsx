import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, ArrowUp, ArrowDown, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  goal_id?: string;
  initiative_id?: string;
  board_column: ColumnId;
}

interface Goal {
  id: string;
  goal: string;
  initiative_id: string;
}

interface Initiative {
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
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [creatingFeature, setCreatingFeature] = useState<Feature | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);

  const columns: { id: ColumnId; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "discovery", label: "Discovery" },
    { id: "backlog", label: "Backlog" },
    { id: "design", label: "Design" },
    { id: "development", label: "Development" },
    { id: "onHold", label: "On Hold" },
    { id: "done", label: "Done" },
    { id: "cancelled", label: "Cancelled" },
  ];

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

  // Fetch features to calculate position
  const { data: features = [] } = useQuery({
    queryKey: ["features", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("user_id", effectiveUserId);
      if (error) throw error;
      return (data || []) as Array<{ id: string; board_column: ColumnId; position: number }>;
    },
    enabled: !!effectiveUserId,
  });

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ["goals", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Fetch initiatives
  const { data: initiatives = [] } = useQuery({
    queryKey: ["initiatives", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: async (feature: Feature) => {
      if (!user) throw new Error("No user");
      
      const columnFeatures = features.filter(f => f.board_column === feature.board_column);
      const maxPosition = columnFeatures.length > 0 
        ? Math.max(...columnFeatures.map(f => f.position)) 
        : -1;
      
      const { error } = await supabase
        .from("features")
        .insert({
          user_id: user.id,
          title: feature.title,
          description: feature.description || "",
          goal_id: feature.goal_id,
          initiative_id: feature.initiative_id,
          board_column: feature.board_column,
          position: maxPosition + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setCreatingFeature(null);
      setIsFeatureDialogOpen(false);
      toast({ title: "Feature created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleCreateFeature = (hypothesis: Hypothesis) => {
    const insight = getHypothesisValue(hypothesis, "insight") as string;
    const solutionHypothesis = getHypothesisValue(hypothesis, "solution_hypothesis") as string;
    
    setCreatingFeature({
      title: insight || "",
      description: solutionHypothesis || "",
      board_column: "backlog",
    });
    setIsFeatureDialogOpen(true);
  };

  const handleSaveFeature = () => {
    if (creatingFeature && creatingFeature.title) {
      createFeatureMutation.mutate(creatingFeature);
    }
  };

  const handleGoalSelect = (goalId: string) => {
    if (creatingFeature) {
      setCreatingFeature({ ...creatingFeature, goal_id: goalId });
    }
    setGoalOpen(false);
  };

  const handleInitiativeSelect = (initiativeId: string) => {
    if (creatingFeature) {
      setCreatingFeature({ ...creatingFeature, initiative_id: initiativeId });
    }
    setInitiativeOpen(false);
  };

  const getGoalName = (id: string) => {
    return goals.find(i => i.id === id)?.goal || "";
  };

  const getInitiativeName = (id: string) => {
    return initiatives.find(i => i.id === id)?.name || "";
  };

  const sortedGoals = [...goals].sort((a, b) => 
    a.goal.localeCompare(b.goal)
  );

  const sortedInitiatives = [...initiatives].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Hypotheses Portfolio"
        onAdd={!isReadOnly ? () => addHypothesisMutation.mutate() : undefined}
        addLabel="Add Hypothesis"
      />

      <div className="w-full overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
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
              <TableHead className="w-[15%]">Insight</TableHead>
              <TableHead className="w-[15%]">Problem Hypothesis</TableHead>
              <TableHead className="w-[15%]">Problem Validation</TableHead>
              <TableHead className="w-[15%]">Solution Hypothesis</TableHead>
              <TableHead className="w-[15%]">Solution Validation</TableHead>
              <TableHead className="w-[10%]">Impact Metrics</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                <TableCell className="break-words">
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "insight") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "insight", v)}
                    placeholder="Enter insight..."
                    rows={2}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="break-words">
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_hypothesis", v)}
                    placeholder="Enter problem hypothesis..."
                    rows={2}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="break-words">
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "problem_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "problem_validation", v)}
                    placeholder="Enter validation (links supported)..."
                    rows={2}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="break-words">
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_hypothesis") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_hypothesis", v)}
                    placeholder="Enter solution hypothesis..."
                    rows={2}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="break-words">
                  <AutoResizeTextarea
                    value={(getHypothesisValue(hypothesis, "solution_validation") as string) || ""}
                    onChange={(v) => handleFieldChange(hypothesis.id, "solution_validation", v)}
                    placeholder="Enter validation (links supported)..."
                    rows={2}
                    disabled={isReadOnly}
                    className="w-full"
                  />
                </TableCell>
                <TableCell className="break-words">
                  <MetricTagInput
                    value={(getHypothesisValue(hypothesis, "impact_metrics") as string[]) || []}
                    onChange={(tags) => handleFieldChange(hypothesis.id, "impact_metrics", tags)}
                    suggestions={metrics.map(m => m.name).filter(Boolean)}
                    placeholder="Type to add metrics..."
                    disabled={isReadOnly}
                  />
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateFeature(hypothesis)}
                        title="Create feature from hypothesis"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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

      <EntityDialog
        open={isFeatureDialogOpen}
        onOpenChange={setIsFeatureDialogOpen}
        title="Create Feature from Hypothesis"
        onSave={handleSaveFeature}
        saveLabel="Create Feature"
      >
        {creatingFeature && (
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
                rows={4}
              />
            </div>
            <div>
              <Label>Linked Goal</Label>
              <Popover open={goalOpen} onOpenChange={setGoalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={goalOpen}
                    className="w-full justify-between"
                  >
                    {creatingFeature.goal_id
                      ? getGoalName(creatingFeature.goal_id)
                      : "Select goal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search goals..." />
                    <CommandList>
                      <CommandEmpty>No goal found.</CommandEmpty>
                      <CommandGroup>
                        {sortedGoals.map((goal) => (
                          <CommandItem
                            key={goal.id}
                            value={goal.goal}
                            onSelect={() => handleGoalSelect(goal.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                creatingFeature.goal_id === goal.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {goal.goal}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Linked Initiative</Label>
              <Popover open={initiativeOpen} onOpenChange={setInitiativeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={initiativeOpen}
                    className="w-full justify-between"
                  >
                    {creatingFeature.initiative_id
                      ? getInitiativeName(creatingFeature.initiative_id)
                      : "Select initiative..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search initiatives..." />
                    <CommandList>
                      <CommandEmpty>No initiative found.</CommandEmpty>
                      <CommandGroup>
                        {sortedInitiatives.map((initiative) => (
                          <CommandItem
                            key={initiative.id}
                            value={initiative.name}
                            onSelect={() => handleInitiativeSelect(initiative.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                creatingFeature.initiative_id === initiative.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {initiative.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="column">Column</Label>
              <Select
                value={creatingFeature.board_column}
                onValueChange={(value: ColumnId) => setCreatingFeature({ ...creatingFeature, board_column: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </EntityDialog>
    </div>
  );
};

export default HypothesesPage;
