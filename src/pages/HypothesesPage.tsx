import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Save, Plus, Check, ChevronsUpDown } from "lucide-react";
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
  const [creatingFeature, setCreatingFeature] = useState<Partial<Feature> | null>(null);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

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

  // Fetch initiatives
  const { data: initiatives = [] } = useQuery({
    queryKey: ["initiatives", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch tracks
  const { data: tracks = [] } = useQuery({
    queryKey: ["tracks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create feature mutation
  const createFeatureMutation = useMutation({
    mutationFn: async (feature: Partial<Feature>) => {
      if (!user) throw new Error("No user");
      
      // Get the max position for the column
      const columnFeatures = features.filter(f => f.board_column === feature.board_column);
      const maxPosition = columnFeatures.length > 0 
        ? Math.max(...columnFeatures.map(f => f.position)) 
        : -1;
      
      const { error } = await supabase
        .from("features")
        .insert({
          user_id: user.id,
          title: feature.title!,
          description: feature.description || "",
          initiative_id: feature.initiative_id,
          track_id: feature.track_id,
          board_column: feature.board_column!,
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

  const handleCreateFeature = (hypothesis: Hypothesis) => {
    const insight = getHypothesisValue(hypothesis, "insight") as string || hypothesis.insight || "";
    const solutionHypothesis = getHypothesisValue(hypothesis, "solution_hypothesis") as string || hypothesis.solution_hypothesis || "";
    setCreatingFeature({
      title: insight,
      description: solutionHypothesis,
      initiative_id: undefined,
      track_id: undefined,
      board_column: "inbox",
    });
    setIsFeatureDialogOpen(true);
  };

  const handleSaveFeature = () => {
    if (creatingFeature?.title) {
      createFeatureMutation.mutate(creatingFeature);
    }
  };

  const handleInitiativeSelect = (initiativeId: string) => {
    const selectedInitiative = initiatives.find(i => i.id === initiativeId);
    setCreatingFeature({
      ...creatingFeature,
      initiative_id: initiativeId,
      track_id: selectedInitiative?.track_id,
    });
    setInitiativeOpen(false);
  };

  const handleTrackSelect = (trackId: string) => {
    setCreatingFeature({
      ...creatingFeature,
      track_id: trackId,
    });
    setTrackOpen(false);
  };

  const getInitiativeName = (initiativeId?: string) => {
    return initiatives.find(i => i.id === initiativeId)?.goal || "";
  };

  const getTrackName = (trackId?: string) => {
    return tracks.find(t => t.id === trackId)?.name || "";
  };

  // Sort initiatives and tracks alphabetically for dropdowns
  const sortedInitiatives = [...initiatives].sort((a, b) => 
    (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" })
  );
  const sortedTracks = [...tracks].sort((a, b) => 
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  );

  const columns: { id: ColumnId; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "discovery", label: "Discovery" },
    { id: "backlog", label: "Backlog" },
    { id: "design", label: "Design & Analysis" },
    { id: "development", label: "Development & Testing" },
    { id: "onHold", label: "On Hold / Blocked" },
    { id: "done", label: "Done" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Hypotheses Portfolio"
        onAdd={!isReadOnly ? () => addHypothesisMutation.mutate() : undefined}
        addLabel="Add Hypothesis"
      />

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
                        title="Create feature from solution hypothesis"
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
        title="Feature Details"
        onSave={handleSaveFeature}
        saveLabel="Save Feature"
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
              />
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
                            value={initiative.goal}
                            onSelect={() => handleInitiativeSelect(initiative.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                creatingFeature.initiative_id === initiative.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {initiative.goal}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Linked Track</Label>
              <Popover open={trackOpen} onOpenChange={setTrackOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={trackOpen}
                    className="w-full justify-between"
                  >
                    {creatingFeature.track_id
                      ? getTrackName(creatingFeature.track_id)
                      : "Select track..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search tracks..." />
                    <CommandList>
                      <CommandEmpty>No track found.</CommandEmpty>
                      <CommandGroup>
                        {sortedTracks.map((track) => (
                          <CommandItem
                            key={track.id}
                            value={track.name}
                            onSelect={() => handleTrackSelect(track.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                creatingFeature.track_id === track.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {track.name}
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
