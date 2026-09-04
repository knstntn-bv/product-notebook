import { ReactNode, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  onSave: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  saveLabel?: string;
  deleteLabel?: string;
  exportLabel?: string;
  isEditing?: boolean;
  isArchived?: boolean;
  contentClassName?: string;
  /** When true, the primary save action is disabled (e.g. invalid form state). */
  saveDisabled?: boolean;
}

export const EntityDialog = ({
  open,
  onOpenChange,
  title,
  leftContent,
  rightContent,
  onSave,
  onDelete,
  onExport,
  onArchive,
  saveLabel = "Save",
  deleteLabel = "Delete",
  exportLabel = "Export",
  isEditing = false,
  isArchived = false,
  contentClassName,
  saveDisabled = false,
}: EntityDialogProps) => {
  const isMobile = useIsMobile();
  const showArchiveButton = isEditing && onArchive;
  const showDeleteButton = isEditing && onDelete;
  const showExportButton = !!onExport;

  const archiveButtonLabel = useMemo(() => {
    return isArchived ? "Unarchive" : "Archive";
  }, [isArchived]);

  const ArchiveIcon = isArchived ? ArchiveRestore : Archive;

  const handleCancel = () => {
    onOpenChange(false);
  };

  const useTwoColumn = !isMobile && (leftContent !== undefined || rightContent !== undefined);

  const sideActions = (
    <>
      {showArchiveButton && (
        <Button variant="outline" onClick={onArchive} title={archiveButtonLabel}>
          <ArchiveIcon className="h-4 w-4 mr-2" />
          {archiveButtonLabel}
        </Button>
      )}
      {showExportButton && (
        <Button variant="outline" onClick={onExport}>
          {exportLabel}
        </Button>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          useTwoColumn ? "max-w-6xl" : "max-w-3xl",
          "max-h-[90vh] min-h-[600px] !grid grid-rows-[auto_1fr_auto] bg-muted",
          contentClassName
        )}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {useTwoColumn ? (
          // Two-column layout
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 min-h-0 min-w-0 pr-4 pl-1">
            <div className="space-y-4 overflow-y-auto min-h-0 min-w-0 pl-2 pr-4 scrollbar-thin">
              {leftContent}
            </div>
            <div className="space-y-4 flex flex-col min-h-0 min-w-0 overflow-hidden px-2 py-1 [&>*]:min-w-0">
              {rightContent}
              <div className="flex flex-col gap-2 mt-auto pt-4 border-t">
                {sideActions}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto min-h-0 pr-4 pl-1 space-y-4">
            {leftContent}
            {rightContent}
            <div className="flex flex-col gap-2 pt-4 border-t">
              {sideActions}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 flex-shrink-0 pt-4 border-t">
          {showDeleteButton && (
            <Button variant="destructive" onClick={onDelete}>
              {deleteLabel}
            </Button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saveDisabled}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
