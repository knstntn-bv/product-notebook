import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

interface Feature {
  id: string;
  title: string;
  description: string;
  epic_id?: string;
  track_id?: string;
  board_column: ColumnId;
}

interface Epic {
  id: string;
  goal: string;
  track_id: string;
}

interface Track {
  id: string;
  name: string;
}

const BoardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Partial<Feature> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [epicOpen, setEpicOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

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

  // Fetch features
  const { data: features = [] } = useQuery({
    queryKey: ["features", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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

  // Save feature mutation
  const saveFeatureMutation = useMutation({
    mutationFn: async (feature: Partial<Feature>) => {
      if (!user) throw new Error("No user");
      
      if (feature.id) {
        const { error } = await supabase
          .from("features")
          .update({
            title: feature.title,
            description: feature.description,
            epic_id: feature.epic_id,
            track_id: feature.track_id,
            board_column: feature.board_column,
          })
          .eq("id", feature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("features")
          .insert({
            user_id: user.id,
            title: feature.title!,
            description: feature.description || "",
            epic_id: feature.epic_id,
            track_id: feature.track_id,
            board_column: feature.board_column!,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setEditingFeature(null);
      setIsDialogOpen(false);
      toast({ title: "Feature saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFeature = (columnId: ColumnId) => {
    setEditingFeature({
      title: "",
      description: "",
      board_column: columnId,
    });
    setIsDialogOpen(true);
  };

  const saveFeature = () => {
    if (editingFeature?.title) {
      saveFeatureMutation.mutate(editingFeature);
    }
  };

  const handleEpicSelect = (epicId: string) => {
    const selectedEpic = epics.find(e => e.id === epicId);
    setEditingFeature({
      ...editingFeature,
      epic_id: epicId,
      track_id: selectedEpic?.track_id,
    });
    setEpicOpen(false);
  };

  const handleTrackSelect = (trackId: string) => {
    setEditingFeature({
      ...editingFeature,
      track_id: trackId,
    });
    setTrackOpen(false);
  };

  const getEpicName = (epicId?: string) => {
    return epics.find(e => e.id === epicId)?.goal || "";
  };

  const getTrackName = (trackId?: string) => {
    return tracks.find(t => t.id === trackId)?.name || "";
  };

  const getFeaturesForColumn = (columnId: ColumnId) => {
    return features.filter(f => f.board_column === columnId);
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
                    setEditingFeature(feature as Feature);
                    setIsDialogOpen(true);
                  }}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm mb-1">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{getTrackName(feature.track_id)}</p>
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
                <Label>Linked Epic</Label>
                <Popover open={epicOpen} onOpenChange={setEpicOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={epicOpen}
                      className="w-full justify-between"
                    >
                      {editingFeature.epic_id
                        ? getEpicName(editingFeature.epic_id)
                        : "Select epic..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search epics..." />
                      <CommandList>
                        <CommandEmpty>No epic found.</CommandEmpty>
                        <CommandGroup>
                          {epics.map((epic) => (
                            <CommandItem
                              key={epic.id}
                              value={epic.goal}
                              onSelect={() => handleEpicSelect(epic.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingFeature.epic_id === epic.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {epic.goal}
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
                      {editingFeature.track_id
                        ? getTrackName(editingFeature.track_id)
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
                          {tracks.map((track) => (
                            <CommandItem
                              key={track.id}
                              value={track.name}
                              onSelect={() => handleTrackSelect(track.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingFeature.track_id === track.id ? "opacity-100" : "opacity-0"
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
                  value={editingFeature.board_column}
                  onValueChange={(value: ColumnId) => setEditingFeature({ ...editingFeature, board_column: value })}
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
