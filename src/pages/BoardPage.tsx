import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

interface Feature {
  id: string;
  title: string;
  description: string;
  linkedEpic?: string;
  linkedTrack: string;
  column: ColumnId;
}

const BoardPage = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const createFeature = (columnId: ColumnId) => {
    const newFeature: Feature = {
      id: `feature-${Date.now()}`,
      title: "",
      description: "",
      linkedTrack: "",
      column: columnId,
    };
    setEditingFeature(newFeature);
    setIsDialogOpen(true);
  };

  const saveFeature = () => {
    if (editingFeature && editingFeature.title && editingFeature.linkedTrack) {
      if (features.find(f => f.id === editingFeature.id)) {
        setFeatures(features.map(f => f.id === editingFeature.id ? editingFeature : f));
      } else {
        setFeatures([editingFeature, ...features]);
      }
      setEditingFeature(null);
      setIsDialogOpen(false);
    }
  };

  const getFeaturesForColumn = (columnId: ColumnId) => {
    return features.filter(f => f.column === columnId);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col">
            <div className="bg-muted p-4 rounded-t-lg border border-border">
              <h3 className="font-semibold text-sm">{column.label}</h3>
            </div>
            <div className="bg-card border-x border-b border-border rounded-b-lg p-4 min-h-[500px] space-y-2">
              {getFeaturesForColumn(column.id).map(feature => (
                <Card
                  key={feature.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setEditingFeature(feature);
                    setIsDialogOpen(true);
                  }}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.linkedTrack}</p>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => createFeature(column.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feature Details</DialogTitle>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={editingFeature.title}
                  onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
                  placeholder="Enter feature title..."
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingFeature.description}
                  onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                  placeholder="Enter feature description..."
                />
              </div>
              <div>
                <Label htmlFor="linkedEpic">Linked Epic</Label>
                <Input
                  id="linkedEpic"
                  value={editingFeature.linkedEpic || ""}
                  onChange={(e) => setEditingFeature({ ...editingFeature, linkedEpic: e.target.value })}
                  placeholder="Enter linked epic..."
                />
              </div>
              <div>
                <Label htmlFor="linkedTrack">Linked Track *</Label>
                <Input
                  id="linkedTrack"
                  value={editingFeature.linkedTrack}
                  onChange={(e) => setEditingFeature({ ...editingFeature, linkedTrack: e.target.value })}
                  placeholder="Enter linked track..."
                />
              </div>
              <div>
                <Label htmlFor="column">Column</Label>
                <Select
                  value={editingFeature.column}
                  onValueChange={(value: ColumnId) => setEditingFeature({ ...editingFeature, column: value })}
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveFeature}>
                  Save Feature
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardPage;
