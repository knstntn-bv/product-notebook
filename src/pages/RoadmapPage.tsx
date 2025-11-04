import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Initiative {
  id: string;
  goal: string;
  expected_result: string;
  achieved_result: string;
  done: boolean;
  target_metrics: string[];
  track_id: string;
  quarter: "current" | "next" | "halfYear";
}

const RoadmapPage = () => {
  const { tracks, metrics } = useProduct();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingInitiative, setEditingInitiative] = useState<Partial<Initiative> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const quarters = [
    { id: "current", label: "Current Quarter" },
    { id: "next", label: "Next Quarter" },
    { id: "halfYear", label: "Next Half-Year" },
  ];

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

  // Save initiative mutation
  const saveInitiativeMutation = useMutation({
    mutationFn: async (initiative: Partial<Initiative>) => {
      if (!user) throw new Error("No user");
      
      if (initiative.id) {
        const { error } = await supabase
          .from("initiatives")
          .update({
            goal: initiative.goal,
            expected_result: initiative.expected_result,
            achieved_result: initiative.achieved_result,
            done: initiative.done,
            target_metrics: initiative.target_metrics,
            quarter: initiative.quarter,
          })
          .eq("id", initiative.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("initiatives")
          .insert({
            user_id: user.id,
            track_id: initiative.track_id!,
            goal: initiative.goal!,
            expected_result: initiative.expected_result || "",
            achieved_result: initiative.achieved_result || "",
            done: initiative.done || false,
            target_metrics: initiative.target_metrics || [],
            quarter: initiative.quarter!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setEditingInitiative(null);
      setIsDialogOpen(false);
      toast({ title: "Initiative saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createInitiative = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    setEditingInitiative({
      goal: "",
      expected_result: "",
      achieved_result: "",
      done: false,
      target_metrics: [],
      track_id: trackId,
      quarter,
    });
    setIsDialogOpen(true);
  };

  const saveInitiative = () => {
    if (editingInitiative?.goal) {
      saveInitiativeMutation.mutate(editingInitiative);
    }
  };

  const getInitiativesForCell = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    return initiatives.filter(i => i.track_id === trackId && i.quarter === quarter);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border bg-muted p-4 text-left font-semibold">Track</th>
              {quarters.map(quarter => (
                <th key={quarter.id} className="border border-border bg-muted p-4 text-left font-semibold">
                  {quarter.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map(track => (
              <tr key={track.id}>
                <td className="border border-border bg-card p-4 font-medium relative pl-4">
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: track.color || "#8B5CF6" }}
                  />
                  {track.name}
                </td>
                {quarters.map(quarter => (
                  <td key={quarter.id} className="border border-border bg-card p-4 align-top">
                    <div className="space-y-2 min-h-[200px]">
                      {getInitiativesForCell(track.id, quarter.id as any).map(initiative => (
                        <Card
                          key={initiative.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setEditingInitiative(initiative as Initiative);
                            setIsDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold">{initiative.goal || "Untitled Initiative"}</p>
                              {initiative.done && (
                                <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">Done</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => createInitiative(track.id, quarter.id as any)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Initiative
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EntityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Initiative Details"
        onSave={saveInitiative}
        saveLabel="Save Initiative"
      >
        {editingInitiative && (
          <>
            <div>
              <Label htmlFor="goal">Goal *</Label>
              <Input
                id="goal"
                value={editingInitiative.goal}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, goal: e.target.value })}
                placeholder="Enter initiative goal..."
              />
            </div>
            <div>
              <Label htmlFor="quarter">Quarter *</Label>
              <Select
                value={editingInitiative.quarter}
                onValueChange={(value) => setEditingInitiative({ ...editingInitiative, quarter: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map(quarter => (
                    <SelectItem key={quarter.id} value={quarter.id}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expectedResult">Expected Result</Label>
              <Textarea
                id="expectedResult"
                value={editingInitiative.expected_result}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, expected_result: e.target.value })}
                placeholder="Enter expected result..."
              />
            </div>
            <div>
              <Label htmlFor="achievedResult">Achieved Result</Label>
              <Textarea
                id="achievedResult"
                value={editingInitiative.achieved_result}
                onChange={(e) => setEditingInitiative({ ...editingInitiative, achieved_result: e.target.value })}
                placeholder="Enter achieved result..."
              />
            </div>
            <div>
              <Label htmlFor="targetMetrics">Target Metrics</Label>
              <MetricTagInput
                value={editingInitiative.target_metrics || []}
                onChange={(tags) => setEditingInitiative({ ...editingInitiative, target_metrics: tags })}
                suggestions={metrics.map(m => m.name).filter(Boolean)}
                placeholder="Type to add metrics..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="done"
                checked={editingInitiative.done}
                onCheckedChange={(checked) => setEditingInitiative({ ...editingInitiative, done: checked as boolean })}
              />
              <Label htmlFor="done">Done</Label>
            </div>
          </>
        )}
      </EntityDialog>
    </div>
  );
};

export default RoadmapPage;
