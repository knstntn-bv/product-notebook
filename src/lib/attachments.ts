import { supabase } from "@/integrations/supabase/client";

export const ATTACHMENTS_BUCKET = "attachments";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_BYTES = 200 * 1024 * 1024;

/** Must stay in sync with attachments_no_executables_check in SQL. */
export const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "pif",
  "cpl",
  "dll",
  "so",
  "dylib",
  "app",
  "sh",
  "bash",
  "ps1",
  "vbs",
  "vbe",
  "jse",
  "wsf",
  "wsh",
  "msc",
  "hta",
]);

export function fileExtension(filename: string): string | null {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

export function isBlockedExecutable(filename: string): boolean {
  const ext = fileExtension(filename);
  return ext !== null && BLOCKED_EXTENSIONS.has(ext);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentStoragePath(productId: string, attachmentId: string): string {
  return `${productId}/${attachmentId}`;
}

export async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type EnsureAttachmentResult =
  | { ok: true; attachmentId: string; created: boolean }
  | { ok: false; message: string };

export async function findAttachmentIdByHash(
  productId: string,
  contentHash: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("attachments")
    .select("id")
    .eq("product_id", productId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function ensureAttachmentFromFile(
  productId: string,
  file: File,
  usedBytes: number,
): Promise<EnsureAttachmentResult> {
  const validation = validateAttachmentFile(file, usedBytes);
  if (!validation.ok) return validation;

  const contentHash = await sha256Hex(file);
  const existingId = await findAttachmentIdByHash(productId, contentHash);
  if (existingId) {
    return { ok: true, attachmentId: existingId, created: false };
  }

  const id = crypto.randomUUID();
  const storagePath = attachmentStoragePath(productId, id);

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: insertError } = await supabase.from("attachments").insert({
    id,
    product_id: productId,
    display_name: file.name,
    original_filename: file.name,
    content_hash: contentHash,
    size_bytes: file.size,
    mime_type: file.type || null,
    storage_path: storagePath,
  });

  if (insertError) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    if (insertError.code === "23505") {
      const racedId = await findAttachmentIdByHash(productId, contentHash);
      if (racedId) {
        return { ok: true, attachmentId: racedId, created: false };
      }
    }
    return { ok: false, message: insertError.message };
  }

  return { ok: true, attachmentId: id, created: true };
}

export async function downloadAttachmentFile(attachment: {
  storage_path: string;
  original_filename: string;
}): Promise<void> {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .download(attachment.storage_path);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.original_filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function validateAttachmentFile(
  file: File,
  usedBytes: number,
): { ok: true } | { ok: false; message: string } {
  if (isBlockedExecutable(file.name)) {
    return { ok: false, message: "Executable files are not allowed." };
  }
  if (file.size <= 0) {
    return { ok: false, message: "The file is empty." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: "File is larger than 10 MB." };
  }
  if (usedBytes + file.size > MAX_PRODUCT_BYTES) {
    return { ok: false, message: "Product attachment quota exceeded (200 MB)." };
  }
  return { ok: true };
}
