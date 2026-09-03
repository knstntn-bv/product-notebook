import { useRef, useState, type ChangeEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionHeader } from "@/components/SectionHeader";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { attachmentLinkFlags } from "@/lib/attachmentLinks";
import {
  ATTACHMENTS_BUCKET,
  downloadAttachmentFile,
  ensureAttachmentFromFile,
  formatBytes,
} from "@/lib/attachments";

type Attachment = Tables<"attachments">;

const AttachmentsPage = () => {
  const { currentProductId } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);

  const attachmentsQueryKey = ["attachments", currentProductId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: attachmentsQueryKey,
    queryFn: async () => {
      if (!currentProductId) return [];
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("product_id", currentProductId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentProductId,
  });

  const { data: linkFlags } = useQuery({
    queryKey: ["attachment_link_flags", currentProductId, attachments.map((item) => item.id)],
    queryFn: () => attachmentLinkFlags(attachments.map((item) => item.id)),
    enabled: attachments.length > 0,
  });

  const usedBytes = attachments.reduce((sum, item) => sum + item.size_bytes, 0);

  const invalidateAttachmentQueries = () => {
    queryClient.invalidateQueries({ queryKey: attachmentsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["attachment_link_flags"] });
    queryClient.invalidateQueries({ queryKey: ["hypothesis_attachments"] });
    queryClient.invalidateQueries({ queryKey: ["feature_attachments"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!currentProductId) throw new Error("No product selected");

      let used = usedBytes;
      let uploaded = 0;

      for (const file of files) {
        const result = await ensureAttachmentFromFile(currentProductId, file, used);
        if (!result.ok) {
          toast({ title: "Error", description: `${file.name}: ${result.message}`, variant: "destructive" });
          continue;
        }
        if (!result.created) {
          toast({ title: "This file already exists", description: file.name });
          continue;
        }
        used += file.size;
        uploaded += 1;
      }

      return { uploaded };
    },
    onSuccess: ({ uploaded }) => {
      invalidateAttachmentQueries();
      if (uploaded > 0) {
        toast({
          title: uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`,
        });
      }
    },
    onError: (error: Error) => {
      invalidateAttachmentQueries();
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      const { error: storageError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([attachment.storage_path]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("attachments").delete().eq("id", attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAttachmentQueries();
      setAttachmentToDelete(null);
      toast({ title: "Attachment deleted" });
    },
    onError: (error: Error) => {
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Attachments"
        description={`${formatBytes(usedBytes)} of 200 MB used`}
        onAdd={() => {
          if (uploadMutation.isPending) return;
          fileInputRef.current?.click();
        }}
        addLabel={uploadMutation.isPending ? "Uploading..." : "Upload"}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        disabled={uploadMutation.isPending}
        onChange={handleFileInputChange}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[160px]">Linked to</TableHead>
                <TableHead className="w-[120px]">Size</TableHead>
                <TableHead className="w-[180px]">Uploaded</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment) => (
                <TableRow key={attachment.id}>
                  <TableCell className="font-medium">{attachment.display_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {linkFlags?.hypothesisIds.has(attachment.id) && (
                        <Badge variant="secondary">Hypotheses</Badge>
                      )}
                      {linkFlags?.featureIds.has(attachment.id) && (
                        <Badge variant="secondary">Features</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(attachment.size_bytes)}</TableCell>
                  <TableCell>
                    {attachment.created_at
                      ? new Date(attachment.created_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Download ${attachment.display_name}`}
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${attachment.display_name}`}
                      onClick={() => setAttachmentToDelete(attachment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!open) setAttachmentToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              {attachmentToDelete ? `"${attachmentToDelete.display_name}"` : "this file"}? This
              detaches it from all hypotheses and features. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (attachmentToDelete) {
                  deleteMutation.mutate(attachmentToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttachmentsPage;
