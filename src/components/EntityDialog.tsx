import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  deleteLabel?: string;
  isEditing?: boolean;
}

export const EntityDialog = ({
  open,
  onOpenChange,
  title,
  children,
  onSave,
  onDelete,
  saveLabel = "Save",
  deleteLabel = "Delete",
  isEditing = false,
}: EntityDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
          <div className="flex justify-between gap-2">
            {isEditing && onDelete && (
              <Button variant="destructive" onClick={onDelete}>
                {deleteLabel}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onSave}>{saveLabel}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
