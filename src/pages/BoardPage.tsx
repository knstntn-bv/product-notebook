import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Check, ChevronsUpDown, GripVertical, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

interface Feature {
  id: string;
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
}

const BoardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Partial<Feature> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
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
            initiative_id: feature.initiative_id,
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
            initiative_id: feature.initiative_id,
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

  // Delete feature mutation
  const deleteFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase
        .from("features")
        .delete()
        .eq("id", featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setEditingFeature(null);
      setIsDialogOpen(false);
      setDeleteAlertOpen(false);
      toast({ title: "Feature deleted successfully" });
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

  const handleInitiativeSelect = (initiativeId: string) => {
    const selectedInitiative = initiatives.find(i => i.id === initiativeId);
    setEditingFeature({
      ...editingFeature,
      initiative_id: initiativeId,
      track_id: selectedInitiative?.track_id,
    });
    setInitiativeOpen(false);
  };

  const handleTrackSelect = (trackId: string) => {
    setEditingFeature({
      ...editingFeature,
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

  const getFeaturesForColumn = (columnId: ColumnId) => {
    return features.filter(f => f.board_column === columnId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const featureId = active.id as string;
    const newColumnId = over.id as ColumnId;
    const feature = features.find(f => f.id === featureId);

    if (feature && feature.board_column !== newColumnId) {
      saveFeatureMutation.mutate({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        initiative_id: feature.initiative_id,
        track_id: feature.track_id,
        board_column: newColumnId,
      });
    }
  };

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null;

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {columns.map(column => (
              <DroppableColumn key={column.id} column={column}>
                {getFeaturesForColumn(column.id).map(feature => (
                  <DraggableFeature
                    key={feature.id}
                    feature={feature as Feature}
                    trackName={getTrackName(feature.track_id)}
                    onClick={() => {
                      setEditingFeature(feature as Feature);
                      setIsDialogOpen(true);
                    }}
                  />
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
              </DroppableColumn>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <DragOverlay>
        {activeFeature ? (
          <Card className="w-80 opacity-90 shadow-lg rotate-3">
            <CardContent className="p-3">
              <p className="font-medium text-sm mb-1 break-words hyphens-auto">{activeFeature.title}</p>
              <p className="text-xs text-muted-foreground break-words">{getTrackName(activeFeature.track_id)}</p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

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
                <Label>Linked Initiative</Label>
                <Popover open={initiativeOpen} onOpenChange={setInitiativeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={initiativeOpen}
                      className="w-full justify-between"
                    >
                      {editingFeature.initiative_id
                        ? getInitiativeName(editingFeature.initiative_id)
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
                          {initiatives.map((initiative) => (
                            <CommandItem
                              key={initiative.id}
                              value={initiative.goal}
                              onSelect={() => handleInitiativeSelect(initiative.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingFeature.initiative_id === initiative.id ? "opacity-100" : "opacity-0"
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
              <div className="flex justify-between gap-2">
                {editingFeature.id && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteAlertOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveFeature}>
                    Save Feature
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feature? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingFeature?.id && deleteFeatureMutation.mutate(editingFeature.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
};

interface DroppableColumnProps {
  column: { id: ColumnId; label: string };
  children: React.ReactNode;
}

const DroppableColumn = ({ column, children }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      <div className="bg-muted p-4 rounded-t-lg border border-border">
        <h3 className="font-semibold text-sm">{column.label}</h3>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "bg-card border-x border-b border-border rounded-b-lg p-4 min-h-[500px] space-y-2 transition-colors",
          isOver && "bg-muted/50"
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface DraggableFeatureProps {
  feature: Feature;
  trackName: string;
  onClick: () => void;
}

const DraggableFeature = ({ feature, trackName, onClick }: DraggableFeatureProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: feature.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:shadow-md transition-shadow group",
        isDragging && "opacity-50 cursor-move"
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3 flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-1 break-words hyphens-auto">{feature.title}</p>
          <p className="text-xs text-muted-foreground break-words">{trackName}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BoardPage;
