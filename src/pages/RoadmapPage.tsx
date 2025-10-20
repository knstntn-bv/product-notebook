import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";
import { MetricTagInput } from "@/components/MetricTagInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Epic {
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
  const [editingEpic, setEditingEpic] = useState<Partial<Epic> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const quarters = [
    { id: "current", label: "Current Quarter" },
    { id: "next", label: "Next Quarter" },
    { id: "halfYear", label: "Next Half-Year" },
  ];

  // Fetch epics
  const { data: epics = [] } = useQuery({
    queryKey: ["epics", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Save epic mutation
  const saveEpicMutation = useMutation({
    mutationFn: async (epic: Partial<Epic>) => {
      if (!user) throw new Error("No user");
      
      if (epic.id) {
        const { error } = await supabase
          .from("epics")
          .update({
            goal: epic.goal,
            expected_result: epic.expected_result,
            achieved_result: epic.achieved_result,
            done: epic.done,
            target_metrics: epic.target_metrics,
          })
          .eq("id", epic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("epics")
          .insert({
            user_id: user.id,
            track_id: epic.track_id!,
            goal: epic.goal!,
            expected_result: epic.expected_result || "",
            achieved_result: epic.achieved_result || "",
            done: epic.done || false,
            target_metrics: epic.target_metrics || [],
            quarter: epic.quarter!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      setEditingEpic(null);
      setIsDialogOpen(false);
      toast({ title: "Epic saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createEpic = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    setEditingEpic({
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

  const saveEpic = () => {
    if (editingEpic?.goal) {
      saveEpicMutation.mutate(editingEpic);
    }
  };

  const getEpicsForCell = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    return epics.filter(e => e.track_id === trackId && e.quarter === quarter);
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
                <td className="border border-border bg-card p-4 font-medium">
                  {track.name}
                </td>
                {quarters.map(quarter => (
                  <td key={quarter.id} className="border border-border bg-card p-4 align-top">
                    <div className="space-y-2 min-h-[200px]">
                      {getEpicsForCell(track.id, quarter.id as any).map(epic => (
                        <Card
                          key={epic.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setEditingEpic(epic as Epic);
                            setIsDialogOpen(true);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{epic.goal || "Untitled Epic"}</p>
                              {epic.done && (
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
                        onClick={() => createEpic(track.id, quarter.id as any)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Epic
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Epic Details</DialogTitle>
          </DialogHeader>
          {editingEpic && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal">Goal *</Label>
                <Input
                  id="goal"
                  value={editingEpic.goal}
                  onChange={(e) => setEditingEpic({ ...editingEpic, goal: e.target.value })}
                  placeholder="Enter epic goal..."
                />
              </div>
              <div>
                <Label htmlFor="expectedResult">Expected Result</Label>
                <Textarea
                  id="expectedResult"
                  value={editingEpic.expected_result}
                  onChange={(e) => setEditingEpic({ ...editingEpic, expected_result: e.target.value })}
                  placeholder="Enter expected result..."
                />
              </div>
              <div>
                <Label htmlFor="achievedResult">Achieved Result</Label>
                <Textarea
                  id="achievedResult"
                  value={editingEpic.achieved_result}
                  onChange={(e) => setEditingEpic({ ...editingEpic, achieved_result: e.target.value })}
                  placeholder="Enter achieved result..."
                />
              </div>
              <div>
                <Label htmlFor="targetMetrics">Target Metrics</Label>
                <MetricTagInput
                  value={editingEpic.target_metrics || []}
                  onChange={(tags) => setEditingEpic({ ...editingEpic, target_metrics: tags })}
                  suggestions={metrics.map(m => m.name).filter(Boolean)}
                  placeholder="Type to add metrics..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="done"
                  checked={editingEpic.done}
                  onCheckedChange={(checked) => setEditingEpic({ ...editingEpic, done: checked as boolean })}
                />
                <Label htmlFor="done">Done</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEpic}>
                  Save Epic
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoadmapPage;
