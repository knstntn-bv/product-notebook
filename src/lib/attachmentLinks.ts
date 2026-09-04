import { supabase } from "@/integrations/supabase/client";

export type AttachmentLinkKind = "hypothesis" | "feature";

const ATTACHMENT_LINK_TARGETS = {
  hypothesis: {
    table: "hypothesis_attachments",
    entityColumn: "hypothesis_id",
  },
  feature: {
    table: "feature_attachments",
    entityColumn: "feature_id",
  },
} as const;

function attachmentLinkTarget(kind: AttachmentLinkKind) {
  return ATTACHMENT_LINK_TARGETS[kind];
}

function linkRow(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
) {
  const { entityColumn } = attachmentLinkTarget(kind);
  return { [entityColumn]: entityId, attachment_id: attachmentId } as never;
}

export async function listLinkedAttachmentIds(
  kind: AttachmentLinkKind,
  entityId: string,
): Promise<string[]> {
  const { table, entityColumn } = attachmentLinkTarget(kind);
  const { data, error } = await supabase
    .from(table)
    .select("attachment_id")
    .eq(entityColumn, entityId);
  if (error) throw error;
  return (data ?? []).map((row) => row.attachment_id);
}

export async function attachToEntity(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
): Promise<void> {
  const { table } = attachmentLinkTarget(kind);
  const { error } = await supabase.from(table).insert(linkRow(kind, entityId, attachmentId));
  if (error && error.code !== "23505") throw error;
}

export async function detachFromEntity(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
): Promise<void> {
  const { table, entityColumn } = attachmentLinkTarget(kind);
  const { error } = await supabase
    .from(table)
    .delete()
    .eq(entityColumn, entityId)
    .eq("attachment_id", attachmentId);
  if (error) throw error;
}

export async function copyAttachmentLinks(
  fromKind: AttachmentLinkKind,
  fromId: string,
  toKind: AttachmentLinkKind,
  toId: string,
): Promise<void> {
  const attachmentIds = await listLinkedAttachmentIds(fromKind, fromId);
  if (attachmentIds.length === 0) return;

  const { table } = attachmentLinkTarget(toKind);
  const { error } = await supabase.from(table).upsert(
    attachmentIds.map((attachmentId) => linkRow(toKind, toId, attachmentId)),
    { ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function syncAttachmentLinksForFeatureHypothesis(
  featureId: string,
  hypothesisId: string,
): Promise<void> {
  await copyAttachmentLinks("hypothesis", hypothesisId, "feature", featureId);
  await copyAttachmentLinks("feature", featureId, "hypothesis", hypothesisId);
}

export async function attachmentLinkFlags(attachmentIds: string[]): Promise<{
  hypothesisIds: Set<string>;
  featureIds: Set<string>;
}> {
  if (attachmentIds.length === 0) {
    return { hypothesisIds: new Set(), featureIds: new Set() };
  }

  const [hypotheses, features] = await Promise.all([
    supabase
      .from(ATTACHMENT_LINK_TARGETS.hypothesis.table)
      .select("attachment_id")
      .in("attachment_id", attachmentIds),
    supabase
      .from(ATTACHMENT_LINK_TARGETS.feature.table)
      .select("attachment_id")
      .in("attachment_id", attachmentIds),
  ]);

  if (hypotheses.error) throw hypotheses.error;
  if (features.error) throw features.error;

  return {
    hypothesisIds: new Set((hypotheses.data ?? []).map((row) => row.attachment_id)),
    featureIds: new Set((features.data ?? []).map((row) => row.attachment_id)),
  };
}
