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
  children?: ReactNode;
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
}

export const EntityDialog = ({
  open,
  onOpenChange,
  title,
  children,
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

  // Determine if we should use two-column layout
  const useTwoColumn = !isMobile && (leftContent !== undefined || rightContent !== undefined);
  // If two-column is not used, fall back to children for backward compatibility
  const useLegacyLayout = !useTwoColumn && children !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          useTwoColumn ? "max-w-6xl" : "max-w-3xl",
          "max-h-[90vh] min-h-[660px] !grid grid-rows-[auto_1fr_auto] bg-muted",
          contentClassName
        )}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {useTwoColumn ? (
          // Two-column layout
          <div className="grid grid-cols-[1fr_0.43fr] gap-6 min-h-0 pr-4 pl-1">
            <div className="space-y-4 overflow-y-auto min-h-0 pl-2 pr-4 scrollbar-thin">
              {leftContent}
            </div>
            <div className="space-y-4 flex flex-col min-h-0">
              {rightContent}
              <div className="flex flex-col gap-2 mt-auto pt-4 border-t">
                {showArchiveButton && (
                  <Button
                    variant="outline"
                    onClick={onArchive}
                    title={archiveButtonLabel}
                  >
                    <ArchiveIcon className="h-4 w-4 mr-2" />
                    {archiveButtonLabel}
                  </Button>
                )}

                {showExportButton && (
                  <Button variant="outline" onClick={onExport}>
                    {exportLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : useLegacyLayout ? (
          // Legacy single-column layout (backward compatibility)
          <div className="overflow-y-auto min-h-0 pr-4 pl-1">
            <div className="space-y-4">{children}</div>
          </div>
        ) : (
          // Two-column layout on mobile (stacked)
          <div className="overflow-y-auto min-h-0 pr-4 pl-1 space-y-4">
            {leftContent}
            {rightContent}
            <div className="flex flex-col gap-2 pt-4 border-t">
              {showArchiveButton && (
                <Button
                  variant="outline"
                  onClick={onArchive}
                  title={archiveButtonLabel}
                >
                  <ArchiveIcon className="h-4 w-4 mr-2" />
                  {archiveButtonLabel}
                </Button>
              )}

              {showExportButton && (
                <Button variant="outline" onClick={onExport}>
                  {exportLabel}
                </Button>
              )}
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
            <Button onClick={onSave}>{saveLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
