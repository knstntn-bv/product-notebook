import { useRef, useState, type ChangeEvent } from "react";
import { Download, Paperclip, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  attachToEntity,
  detachFromEntity,
  listLinkedAttachmentIds,
  type AttachmentLinkKind,
} from "@/lib/attachmentLinks";
import {
  downloadAttachmentFile,
  ensureAttachmentFromFile,
  formatBytes,
} from "@/lib/attachments";

type Attachment = Tables<"attachments">;

interface EntityAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  kind: AttachmentLinkKind;
  entityId: string;
}

export const EntityAttachmentsDialog = ({
  open,
  onOpenChange,
  productId,
  kind,
  entityId,
}: EntityAttachmentsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const libraryQueryKey = ["attachments", productId];
  const linksQueryKey = [`${kind}_attachments`, entityId];

  const { data: library = [], isLoading: libraryLoading } = useQuery({
    queryKey: libraryQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!productId,
  });

  const { data: linkedIds = [], isLoading: linksLoading } = useQuery({
    queryKey: linksQueryKey,
    queryFn: () => listLinkedAttachmentIds(kind, entityId),
    enabled: open && !!entityId,
  });

  const linkedIdSet = new Set(linkedIds);
  const attached = library.filter((item) => linkedIdSet.has(item.id));
  const available = library.filter((item) => !linkedIdSet.has(item.id));
  const usedBytes = library.reduce((sum, item) => sum + item.size_bytes, 0);
  const isLoading = libraryLoading || linksLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: linksQueryKey });
    queryClient.invalidateQueries({ queryKey: libraryQueryKey });
    queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
  };

  const attachMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      setPendingId(attachmentId);
      await attachToEntity(kind, entityId, attachmentId);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Attachment linked" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => setPendingId(null),
  });

  const detachMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      setPendingId(attachmentId);
      await detachFromEntity(kind, entityId, attachmentId);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Attachment detached" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => setPendingId(null),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let used = usedBytes;
      let attachedCount = 0;
      let createdCount = 0;

      for (const file of files) {
        const result = await ensureAttachmentFromFile(productId, file, used);
        if (!result.ok) {
          toast({
            title: "Error",
            description: `${file.name}: ${result.message}`,
            variant: "destructive",
          });
          continue;
        }
        if (result.created) {
          used += file.size;
          createdCount += 1;
        }
        await attachToEntity(kind, entityId, result.attachmentId);
        attachedCount += 1;
      }

      return { attachedCount, createdCount };
    },
    onSuccess: ({ attachedCount, createdCount }) => {
      invalidate();
      if (attachedCount > 0) {
        toast({
          title:
            createdCount > 0
              ? createdCount === 1
                ? "File uploaded and attached"
                : `${createdCount} files uploaded and attached`
              : attachedCount === 1
                ? "Existing file attached"
                : `${attachedCount} existing files attached`,
        });
      }
    },
    onError: (error: Error) => {
      invalidate();
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDownload = async (attachment: Attachment) => {
    try {
      await downloadAttachmentFile(attachment);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    uploadMutation.mutate(files);
  };

  const renderRow = (attachment: Attachment, mode: "attached" | "available") => (
    <div
      key={attachment.id}
      className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{attachment.display_name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.size_bytes)}</p>
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Download ${attachment.display_name}`}
          onClick={() => handleDownload(attachment)}
        >
          <Download className="h-4 w-4" />
        </Button>
        {mode === "attached" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pendingId === attachment.id}
            onClick={() => detachMutation.mutate(attachment.id)}
          >
            Detach
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pendingId === attachment.id}
            onClick={() => attachMutation.mutate(attachment.id)}
          >
            Attach
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[60] max-h-[80vh] max-w-lg overflow-y-auto bg-background"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{formatBytes(usedBytes)} of 200 MB used</p>
            <Button
              type="button"
              size="sm"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              disabled={uploadMutation.isPending}
              onChange={handleFileInputChange}
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Attached</h3>
                {attached.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files attached yet.</p>
                ) : (
                  <div className="space-y-2">{attached.map((item) => renderRow(item, "attached"))}</div>
                )}
              </section>
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip className="h-4 w-4" />
                  Product library
                </h3>
                {available.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {library.length === 0
                      ? "Upload a file to add it to the library and this item."
                      : "All library files are already attached."}
                  </p>
                ) : (
                  <div className="space-y-2">{available.map((item) => renderRow(item, "available"))}</div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
