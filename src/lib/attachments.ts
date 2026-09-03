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
