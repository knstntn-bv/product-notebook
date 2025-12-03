import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { SectionHeader } from "@/components/SectionHeader";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  human_readable_id?: string;
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
  const { metrics } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [statusSort, setStatusSort] = useState<"asc" | "desc" | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState<Partial<Hypothesis> | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
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
      // Ensure all fields are properly typed and handle null values
      return (data || []).map((h: any) => ({
        id: h.id,
        status: h.status as Status,
        insight: h.insight || "",
        problem_hypothesis: h.problem_hypothesis || "",
        problem_validation: h.problem_validation || "",
        solution_hypothesis: h.solution_hypothesis || "",
        solution_validation: h.solution_validation || "",
        impact_metrics: Array.isArray(h.impact_metrics) ? h.impact_metrics : [],
      })) as Hypothesis[];
    },
    enabled: !!effectiveUserId,
  });

  // Add hypothesis mutation - теперь открывает диалог
  const handleAddHypothesis = () => {
    setEditingHypothesis({
      status: "new",
      insight: "",
      problem_hypothesis: "",
      problem_validation: "",
      solution_hypothesis: "",
      solution_validation: "",
      impact_metrics: [],
    });
    setIsDialogOpen(true);
  };

  // Save hypothesis mutation (create or update)
  const saveHypothesisMutation = useMutation({
    mutationFn: async (hypothesis: Partial<Hypothesis>) => {
      if (!user) throw new Error("No user");
      if (hypothesis.id) {
        // Update existing
        const updates: any = {};
        if (hypothesis.status !== undefined) updates.status = hypothesis.status;
        if (hypothesis.insight !== undefined) updates.insight = hypothesis.insight;
        if (hypothesis.problem_hypothesis !== undefined) updates.problem_hypothesis = hypothesis.problem_hypothesis;
        if (hypothesis.problem_validation !== undefined) updates.problem_validation = hypothesis.problem_validation;
        if (hypothesis.solution_hypothesis !== undefined) updates.solution_hypothesis = hypothesis.solution_hypothesis;
        if (hypothesis.solution_validation !== undefined) updates.solution_validation = hypothesis.solution_validation;
        if (hypothesis.impact_metrics !== undefined) updates.impact_metrics = hypothesis.impact_metrics;
        
        const { error } = await supabase
          .from("hypotheses")
          .update(updates)
          .eq("id", hypothesis.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("hypotheses")
          .insert({
            user_id: user.id,
            status: hypothesis.status || "new",
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
      queryClient.invalidateQueries({ queryKey: ["hypotheses"] });
      setIsDialogOpen(false);
      setEditingHypothesis(null);
      toast({ title: "Hypothesis saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      setIsDialogOpen(false);
      setEditingHypothesis(null);
      setDeleteAlertOpen(false);
      toast({ title: "Hypothesis deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      
      // Generate human_readable_id
      let prefix = "NNN";
      if (feature.initiative_id) {
        const initiative = initiatives.find(i => i.id === feature.initiative_id);
        if (initiative?.name) {
          // Take first 3 characters, uppercase
          prefix = initiative.name
            .substring(0, 3)
            .toUpperCase();
        }
      }
      
      // Get total count of features for this user (sequential numbering)
      const { count } = await supabase
        .from("features")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      const featureNumber = (count || 0) + 1;
      const human_readable_id = `${prefix}-${featureNumber}`;
      
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
          human_readable_id: human_readable_id,
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

  const handleSaveHypothesis = () => {
    if (editingHypothesis) {
      saveHypothesisMutation.mutate(editingHypothesis);
    }
  };

  const handleEditHypothesis = (hypothesis: Hypothesis) => {
    setEditingHypothesis({ ...hypothesis });
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

  const sortedHypotheses = [...hypotheses].sort((a, b) => {
    if (statusSort === null) return 0;
    
    const statusOrder: Record<Status, number> = {
      new: 1,
      inProgress: 2,
      accepted: 3,
      rejected: 4,
    };
    
    const comparison = statusOrder[a.status] - statusOrder[b.status];
    return statusSort === "asc" ? comparison : -comparison;
  });

  const handleCreateFeature = (hypothesis: Hypothesis) => {
    setCreatingFeature({
      title: (hypothesis.insight || "").toString(),
      description: (hypothesis.solution_hypothesis || "").toString(),
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
        onAdd={handleAddHypothesis}
        addLabel="Add Hypothesis"
      />

      <div className="w-full overflow-x-auto">
        <Table className={cn(
          "w-full",
          !isMobile && "table-auto",
          isMobile && "min-w-[1200px]"
        )}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-auto">
                <button
                  onClick={handleStatusSort}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity text-xs whitespace-nowrap"
                  type="button"
                >
                  Status
                  {statusSort === "asc" && <ArrowUp className="h-3 w-3" />}
                  {statusSort === "desc" && <ArrowDown className="h-3 w-3" />}
                </button>
              </TableHead>
              <TableHead className={cn(
                !isMobile && "w-[15%]",
                isMobile && "min-w-[180px]"
              )}>Insight</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[20%]",
                isMobile && "min-w-[240px]"
              )}>Problem Hypothesis</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[20%]",
                isMobile && "min-w-[240px]"
              )}>Solution Hypothesis</TableHead>
              <TableHead className={cn(
                !isMobile && "w-[10%]",
                isMobile && "min-w-[150px]"
              )}>Impact Metrics</TableHead>
              <TableHead className="w-auto">Actions</TableHead>
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
                <TableCell className="w-auto px-2">
                  <span className="text-xs whitespace-nowrap">
                    {statuses.find(s => s.value === hypothesis.status)?.label || hypothesis.status}
                  </span>
                </TableCell>
                <TableCell className="break-words">
                  <div className="text-sm whitespace-pre-wrap">
                    {hypothesis.insight || <span className="text-muted-foreground italic">No insight</span>}
                  </div>
                </TableCell>
                <TableCell className="break-words">
                  <div className="space-y-2">
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
                  </div>
                </TableCell>
                <TableCell className="break-words">
                  <div className="space-y-2">
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
                  </div>
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
                <TableCell 
                  onClick={(e) => e.stopPropagation()} 
                  className="w-auto px-2"
                >
                  <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleCreateFeature(hypothesis)}
                        title="Create feature from hypothesis"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
          }
        }}
        title={editingHypothesis?.id ? "Edit Hypothesis" : "New Hypothesis"}
        onSave={handleSaveHypothesis}
        onDelete={editingHypothesis?.id ? handleDeleteHypothesis : undefined}
        isEditing={!!editingHypothesis?.id}
        saveLabel="Save Hypothesis"
      >
        {editingHypothesis && (
          <>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={(editingHypothesis.status || "new") as Status}
                onValueChange={(value: Status) => 
                  setEditingHypothesis({ ...editingHypothesis, status: value })
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
            </div>
            <div>
              <Label htmlFor="insight">Insight</Label>
              <Textarea
                id="insight"
                value={editingHypothesis.insight || ""}
                onChange={(e) => setEditingHypothesis({ ...editingHypothesis, insight: e.target.value })}
                placeholder="Enter insight..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="problem_hypothesis">Problem Hypothesis</Label>
              <Textarea
                id="problem_hypothesis"
                value={editingHypothesis.problem_hypothesis || ""}
                onChange={(e) => setEditingHypothesis({ ...editingHypothesis, problem_hypothesis: e.target.value })}
                placeholder="Enter problem hypothesis..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="problem_validation">Problem Validation</Label>
              <Textarea
                id="problem_validation"
                value={editingHypothesis.problem_validation || ""}
                onChange={(e) => setEditingHypothesis({ ...editingHypothesis, problem_validation: e.target.value })}
                placeholder="Enter validation (links supported)..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="solution_hypothesis">Solution Hypothesis</Label>
              <Textarea
                id="solution_hypothesis"
                value={editingHypothesis.solution_hypothesis || ""}
                onChange={(e) => setEditingHypothesis({ ...editingHypothesis, solution_hypothesis: e.target.value })}
                placeholder="Enter solution hypothesis..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="solution_validation">Solution Validation</Label>
              <Textarea
                id="solution_validation"
                value={editingHypothesis.solution_validation || ""}
                onChange={(e) => setEditingHypothesis({ ...editingHypothesis, solution_validation: e.target.value })}
                placeholder="Enter validation (links supported)..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="impact_metrics">Impact Metrics</Label>
              <MetricTagInput
                value={Array.isArray(editingHypothesis.impact_metrics) ? editingHypothesis.impact_metrics : []}
                onChange={(tags) => setEditingHypothesis({ ...editingHypothesis, impact_metrics: tags })}
                suggestions={metrics.map(m => m.name).filter(Boolean)}
                placeholder="Type to add metrics..."
              />
            </div>
          </>
        )}
      </EntityDialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hypothesis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hypothesis? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteHypothesis}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
