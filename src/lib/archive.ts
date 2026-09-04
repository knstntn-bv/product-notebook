import { supabase } from "@/integrations/supabase/client";

export type ArchiveTable = "goals" | "initiatives";

export function archiveFields(archived: boolean): {
  archived: boolean;
  archived_at: string | null;
} {
  return {
    archived,
    archived_at: archived ? new Date().toISOString() : null,
  };
}

export async function archiveRow(
  table: ArchiveTable,
  id: string,
  archived: boolean,
  productId: string,
): Promise<{ archived: boolean; archived_at: string | null }> {
  const fields = archiveFields(archived);
  const query =
    table === "goals"
      ? supabase.from("goals").update(fields)
      : supabase.from("initiatives").update(fields);
  const { error } = await query.eq("id", id).eq("product_id", productId);
  if (error) throw error;
  return fields;
}

type WithArchive = { archived?: boolean | null };

export function visibleByArchive<T extends WithArchive>(
  items: readonly T[],
  showArchived: boolean,
): T[] {
  if (showArchived) return [...items];
  return items.filter((item) => !item.archived);
}

export function compareArchivedLast<T extends WithArchive>(a: T, b: T): number {
  if (a.archived && !b.archived) return 1;
  if (!a.archived && b.archived) return -1;
  return 0;
}

export function compareByPriorityThenArchive<
  T extends WithArchive & { priority: number },
>(a: T, b: T): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return compareArchivedLast(a, b);
}

