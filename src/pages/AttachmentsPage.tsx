import { useRef, useState, type ChangeEvent } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeaderActions } from "@/components/HeaderActions";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { attachmentLinkFlags } from "@/lib/attachmentLinks";
import { errorToast } from "@/lib/errorToast";
import { requireProductId } from "@/lib/productQueries";
import {
  deleteAttachment,
  downloadAttachmentFile,
  formatBytes,
  formatQuotaUsed,
  uploadFiles,
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
      const productId = requireProductId(currentProductId);
      const { created } = await uploadFiles(productId, files, usedBytes, {
        onExisting: (file) => {
          toast({ title: "This file already exists", description: file.name });
        },
      });
      return { uploaded: created };
    },
    onSuccess: ({ uploaded }) => {
      invalidateAttachmentQueries();
      if (uploaded > 0) {
        toast({
          title: uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`,
        });
      }
    },
    onError: (error) => {
      invalidateAttachmentQueries();
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: Attachment) => {
      const productId = requireProductId(currentProductId);
      await deleteAttachment(attachment, productId);
    },
    onSuccess: () => {
      invalidateAttachmentQueries();
      setAttachmentToDelete(null);
      toast({ title: "Attachment deleted" });
    },
    onError: errorToast,
  });

  const handleDownload = async (attachment: Attachment) => {
    try {
      await downloadAttachmentFile(attachment);
    } catch (error) {
      errorToast(error instanceof Error ? error : "Download failed");
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    uploadMutation.mutate(files);
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <HeaderActions>
        <Button
          size="sm"
          disabled={uploadMutation.isPending}
          onClick={() => {
            if (uploadMutation.isPending) return;
            fileInputRef.current?.click();
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </HeaderActions>
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
        <>
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
          <p className="text-sm text-muted-foreground">
            {formatQuotaUsed(usedBytes)}
          </p>
        </>
      ) : (
        <>
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
                      <div className="inline-flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Download ${attachment.display_name}`}
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Delete ${attachment.display_name}`}
                          onClick={() => setAttachmentToDelete(attachment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatQuotaUsed(usedBytes)}
          </p>
        </>
      )}

      <ConfirmDeleteDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!open) setAttachmentToDelete(null);
        }}
        title="Delete Attachment"
        description={
          <>
            Are you sure you want to delete{" "}
            {attachmentToDelete ? `"${attachmentToDelete.display_name}"` : "this file"}? This
            detaches it from all hypotheses and features. This action cannot be undone.
          </>
        }
        onConfirm={() => {
          if (attachmentToDelete) {
            deleteMutation.mutate(attachmentToDelete);
          }
        }}
        confirmDisabled={deleteMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  );
};

export default AttachmentsPage;
