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
      <DialogContent className="max-w-3xl max-h-[90vh] min-h-[660px] !grid grid-rows-[auto_1fr_auto]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 pr-4 pl-1">
          <div className="space-y-4">
            {children}
          </div>
        </div>
        <div className="flex justify-between gap-2 flex-shrink-0 pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  );
};
