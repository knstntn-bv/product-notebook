import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useProduct } from "@/contexts/ProductContext";

interface Epic {
  id: string;
  goal: string;
  expectedResult: string;
  achievedResult: string;
  done: boolean;
  targetMetrics: string[];
  trackId: string;
  quarter: "current" | "next" | "halfYear";
}

const RoadmapPage = () => {
  const { tracks } = useProduct();
  const [epics, setEpics] = useState<Epic[]>([]);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const quarters = [
    { id: "current", label: "Current Quarter" },
    { id: "next", label: "Next Quarter" },
    { id: "halfYear", label: "Next Half-Year" },
  ];

  const createEpic = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    const newEpic: Epic = {
      id: `epic-${Date.now()}`,
      goal: "",
      expectedResult: "",
      achievedResult: "",
      done: false,
      targetMetrics: [],
      trackId,
      quarter,
    };
    setEditingEpic(newEpic);
    setIsDialogOpen(true);
  };

  const saveEpic = () => {
    if (editingEpic) {
      if (epics.find(e => e.id === editingEpic.id)) {
        setEpics(epics.map(e => e.id === editingEpic.id ? editingEpic : e));
      } else {
        setEpics([...epics, editingEpic]);
      }
      setEditingEpic(null);
      setIsDialogOpen(false);
    }
  };

  const getEpicsForCell = (trackId: string, quarter: "current" | "next" | "halfYear") => {
    return epics.filter(e => e.trackId === trackId && e.quarter === quarter);
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
                            setEditingEpic(epic);
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
                  value={editingEpic.expectedResult}
                  onChange={(e) => setEditingEpic({ ...editingEpic, expectedResult: e.target.value })}
                  placeholder="Enter expected result..."
                />
              </div>
              <div>
                <Label htmlFor="achievedResult">Achieved Result</Label>
                <Textarea
                  id="achievedResult"
                  value={editingEpic.achievedResult}
                  onChange={(e) => setEditingEpic({ ...editingEpic, achievedResult: e.target.value })}
                  placeholder="Enter achieved result..."
                />
              </div>
              <div>
                <Label htmlFor="targetMetrics">Target Metrics (comma-separated)</Label>
                <Input
                  id="targetMetrics"
                  value={editingEpic.targetMetrics.join(", ")}
                  onChange={(e) => setEditingEpic({ 
                    ...editingEpic, 
                    targetMetrics: e.target.value.split(",").map(s => s.trim()).filter(Boolean) 
                  })}
                  placeholder="Enter target metrics..."
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
