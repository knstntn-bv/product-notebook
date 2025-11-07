import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { EntityDialog } from "@/components/EntityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useIsMobile } from "@/hooks/use-mobile";

type ColumnId = "inbox" | "discovery" | "backlog" | "design" | "development" | "onHold" | "done" | "cancelled";

interface Feature {
  id: string;
  title: string;
  description: string;
  initiative_id?: string;
  track_id?: string;
  board_column: ColumnId;
  position: number;
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

const BoardPage = () => {
  const { isReadOnly, sharedUserId } = useProduct();
  const { user } = useAuth();
  const effectiveUserId = sharedUserId || user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<Partial<Feature> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isReadOnly || isMobile ? 999999 : 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: isReadOnly ? 999999 : 500,
        tolerance: 5,
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
    queryKey: ["features", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("features")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as Feature[];
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

  // Fetch tracks
  const { data: tracks = [] } = useQuery({
    queryKey: ["tracks", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
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
            position: feature.position,
          })
          .eq("id", feature.id);
        if (error) throw error;
      } else {
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

  // Drag mutation with optimistic updates
  const dragFeatureMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Array<{ id: string; position: number; board_column?: string }> }) => {
      const promises = updates.map(update =>
        supabase.from("features").update({ 
          position: update.position,
          ...(update.board_column && { board_column: update.board_column })
        }).eq("id", update.id)
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onMutate: async ({ updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["features", effectiveUserId] });
      
      // Snapshot the previous value
      const previousFeatures = queryClient.getQueryData<Feature[]>(["features", effectiveUserId]);
      
      // Optimistically update to the new value
      if (previousFeatures) {
        const updatedFeatures = previousFeatures.map(feature => {
          const update = updates.find(u => u.id === feature.id);
          if (update) {
            return {
              ...feature,
              position: update.position,
              ...(update.board_column && { board_column: update.board_column as ColumnId })
            };
          }
          return feature;
        });
        queryClient.setQueryData(["features", effectiveUserId], updatedFeatures);
      }
      
      return { previousFeatures };
    },
    onError: (error: any, variables, context) => {
      // Revert to previous state on error
      if (context?.previousFeatures) {
        queryClient.setQueryData(["features", effectiveUserId], context.previousFeatures);
      }
      toast({ title: "Error moving feature", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ["features", effectiveUserId] });
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

  const getTrackColor = (trackId?: string) => {
    return tracks.find(t => t.id === trackId)?.color || "#8B5CF6";
  };

  const getFeaturesForColumn = (columnId: ColumnId) => {
    return features.filter(f => f.board_column === columnId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // We'll handle everything in handleDragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeFeature = features.find(f => f.id === activeId);
    const overFeature = features.find(f => f.id === overId);
    const overColumn = columns.find(col => col.id === overId);

    if (!activeFeature) return;

    // Case 1: Dropped on a feature (same or different column)
    if (overFeature) {
      const isSameColumn = activeFeature.board_column === overFeature.board_column;
      
      if (isSameColumn) {
        // Reorder within the same column
        const columnFeatures = getFeaturesForColumn(activeFeature.board_column);
        const oldIndex = columnFeatures.findIndex(f => f.id === activeId);
        const newIndex = columnFeatures.findIndex(f => f.id === overId);
        
        const reorderedFeatures = arrayMove(columnFeatures, oldIndex, newIndex);
        
        // Prepare updates for mutation
        const updates = reorderedFeatures.map((feature, index) => ({
          id: feature.id,
          position: index,
        }));
        
        dragFeatureMutation.mutate({ updates });
      } else {
        // Move to different column at the position of overFeature
        const sourceColumnFeatures = getFeaturesForColumn(activeFeature.board_column).filter(f => f.id !== activeId);
        const targetColumnFeatures = getFeaturesForColumn(overFeature.board_column);
        const insertIndex = targetColumnFeatures.findIndex(f => f.id === overId);
        
        // Update source column positions
        const sourceUpdates = sourceColumnFeatures.map((feature, index) => ({
          id: feature.id,
          position: index,
        }));
        
        // Update target column positions
        const targetUpdates: { id: string; position: number; board_column?: string }[] = [];
        targetColumnFeatures.forEach((feature, index) => {
          if (index >= insertIndex) {
            targetUpdates.push({ id: feature.id, position: index + 1 });
          }
        });
        
        // Update the active feature with new column and position
        targetUpdates.push({
          id: activeId,
          position: insertIndex,
          board_column: overFeature.board_column,
        });
        
        const updates = [...sourceUpdates, ...targetUpdates];
        dragFeatureMutation.mutate({ updates });
      }
    } 
    // Case 2: Dropped on an empty column
    else if (overColumn && activeFeature.board_column !== overColumn.id) {
      const sourceColumnFeatures = getFeaturesForColumn(activeFeature.board_column).filter(f => f.id !== activeId);
      const targetColumnFeatures = getFeaturesForColumn(overColumn.id);
      
      // Update source column positions
      const sourceUpdates = sourceColumnFeatures.map((feature, index) => ({
        id: feature.id,
        position: index,
      }));
      
      // Update the moved feature
      const movedUpdate = {
        id: activeId,
        position: targetColumnFeatures.length,
        board_column: overColumn.id,
      };
      
      const updates = [...sourceUpdates, movedUpdate];
      dragFeatureMutation.mutate({ updates });
    }
  };

  const activeFeature = activeId ? features.find(f => f.id === activeId) : null;

  // Sort initiatives and tracks alphabetically for dropdowns
  const sortedInitiatives = [...initiatives].sort((a, b) => 
    (a.goal || "").localeCompare(b.goal || "", undefined, { sensitivity: "base" })
  );
  const sortedTracks = [...tracks].sort((a, b) => 
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  );

  const autoScrollConfig = {
    threshold: {
      x: 0.2,
      y: 0.2,
    },
    acceleration: 1,
    interval: 20,
    enabled: true,
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={autoScrollConfig}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide md:scrollbar-default -mx-4 md:mx-0">
          <div className="flex gap-4 pb-4 pl-[5vw] pr-[5vw] md:pl-4 md:pr-4">
            {columns.map(column => {
              const columnFeatures = getFeaturesForColumn(column.id);
              return (
                <DroppableColumn key={column.id} column={column} onAddFeature={!isReadOnly ? createFeature : undefined}>
                  <SortableContext items={columnFeatures.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {columnFeatures.map(feature => (
                      <SortableFeature
                        key={feature.id}
                        feature={feature as Feature}
                        initiativeName={getInitiativeName(feature.initiative_id)}
                        trackColor={getTrackColor(feature.track_id)}
                        onClick={() => {
                          if (!isReadOnly) {
                            setEditingFeature(feature as Feature);
                            setIsDialogOpen(true);
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                  
                </DroppableColumn>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeFeature ? (
          <Card className="w-80 opacity-90 shadow-lg rotate-3 relative overflow-hidden">
            {activeFeature.track_id && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-1" 
                style={{ backgroundColor: getTrackColor(activeFeature.track_id) }}
              />
            )}
            <CardContent className="p-3 pl-4">
              <p className="font-medium text-sm mb-1 break-words whitespace-normal hyphens-auto">{activeFeature.title}</p>
              {activeFeature.initiative_id && (
                <p className="text-xs text-muted-foreground break-words whitespace-normal">{getInitiativeName(activeFeature.initiative_id)}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>

      <EntityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Feature Details"
        onSave={saveFeature}
        onDelete={editingFeature?.id ? () => setDeleteAlertOpen(true) : undefined}
        isEditing={!!editingFeature?.id}
        saveLabel="Save Feature"
      >
        {editingFeature && (
          <>
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
                        {sortedInitiatives.map((initiative) => (
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
                        {sortedTracks.map((track) => (
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
          </>
        )}
      </EntityDialog>

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
  onAddFeature?: (columnId: ColumnId) => void;
}

const DroppableColumn = ({ column, children, onAddFeature }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col w-[90vw] md:w-80 flex-shrink-0 snap-center snap-always h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] mb-6">
      <div className="bg-muted p-4 rounded-t-lg border border-border flex-shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">{column.label}</h3>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onAddFeature(column.id)}
                className="p-2 h-auto min-h-0"
            >
            Add
            </Button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "bg-card border-x border-b border-border rounded-b-lg p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 transition-colors",
          isOver && "bg-muted/50"
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </div>
  );
};

interface SortableFeatureProps {
  feature: Feature;
  initiativeName: string;
  trackColor: string;
  onClick: () => void;
}

const SortableFeature = ({ feature, initiativeName, trackColor, onClick }: SortableFeatureProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feature.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden select-none",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onClick}
    >
      {feature.track_id && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1" 
          style={{ backgroundColor: trackColor }}
        />
      )}
      <CardContent className="p-3 pl-4">
        <p className="font-medium text-sm mb-1 break-words whitespace-normal hyphens-auto">{feature.title}</p>
        {initiativeName && (
          <p className="text-xs text-muted-foreground break-words whitespace-normal">{initiativeName}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BoardPage;


