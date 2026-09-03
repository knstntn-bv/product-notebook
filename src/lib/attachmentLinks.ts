import { supabase } from "@/integrations/supabase/client";

export type AttachmentLinkKind = "hypothesis" | "feature";

export async function listLinkedAttachmentIds(
  kind: AttachmentLinkKind,
  entityId: string,
): Promise<string[]> {
  if (kind === "hypothesis") {
    const { data, error } = await supabase
      .from("hypothesis_attachments")
      .select("attachment_id")
      .eq("hypothesis_id", entityId);
    if (error) throw error;
    return (data ?? []).map((row) => row.attachment_id);
  }

  const { data, error } = await supabase
    .from("feature_attachments")
    .select("attachment_id")
    .eq("feature_id", entityId);
  if (error) throw error;
  return (data ?? []).map((row) => row.attachment_id);
}

export async function attachToEntity(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
): Promise<void> {
  if (kind === "hypothesis") {
    const { error } = await supabase.from("hypothesis_attachments").insert({
      hypothesis_id: entityId,
      attachment_id: attachmentId,
    });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase.from("feature_attachments").insert({
    feature_id: entityId,
    attachment_id: attachmentId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function detachFromEntity(
  kind: AttachmentLinkKind,
  entityId: string,
  attachmentId: string,
): Promise<void> {
  if (kind === "hypothesis") {
    const { error } = await supabase
      .from("hypothesis_attachments")
      .delete()
      .eq("hypothesis_id", entityId)
      .eq("attachment_id", attachmentId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("feature_attachments")
    .delete()
    .eq("feature_id", entityId)
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

  if (toKind === "hypothesis") {
    const { error } = await supabase.from("hypothesis_attachments").upsert(
      attachmentIds.map((attachment_id) => ({
        hypothesis_id: toId,
        attachment_id,
      })),
      { ignoreDuplicates: true },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("feature_attachments").upsert(
    attachmentIds.map((attachment_id) => ({
      feature_id: toId,
      attachment_id,
    })),
    { ignoreDuplicates: true },
  );
  if (error) throw error;
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
      .from("hypothesis_attachments")
      .select("attachment_id")
      .in("attachment_id", attachmentIds),
    supabase
      .from("feature_attachments")
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
