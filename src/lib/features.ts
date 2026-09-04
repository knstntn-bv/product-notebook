import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { syncAttachmentLinksForFeatureHypothesis } from "@/lib/attachmentLinks";
import { applyClosedAt, type BoardColumnId } from "@/lib/board";
import type { FeatureRow, InitiativeRow } from "@/lib/productQueries";

export type FeaturePositionSource = Pick<FeatureRow, "board_column" | "position">;
export type FeatureInitiativeSource = Pick<InitiativeRow, "id" | "name">;

export type CreateFeatureInput = {
  productId: string;
  title: string;
  description?: string | null;
  goal_id?: string | null;
  initiative_id?: string | null;
  hypothesis_id?: string | null;
  board_column: BoardColumnId;
  features: FeaturePositionSource[];
  initiatives: FeatureInitiativeSource[];
};

export type CreateFeatureDraft = Omit<CreateFeatureInput, "productId" | "features" | "initiatives">;

export function nextPositionInColumn(
  features: FeaturePositionSource[],
  boardColumn: string,
): number {
  const columnFeatures = features.filter((feature) => feature.board_column === boardColumn);
  if (columnFeatures.length === 0) return 0;
  return Math.max(...columnFeatures.map((feature) => feature.position)) + 1;
}

export function featureIdPrefix(initiativeName: string | null | undefined): string {
  const name = initiativeName?.trim();
  if (!name) return "NNN";
  return name.substring(0, 3).toUpperCase();
}

export function buildHumanReadableId(prefix: string, featureNumber: number): string {
  return `${prefix}-${featureNumber}`;
}

export async function nextFeatureNumber(productId: string): Promise<number> {
  const { count, error } = await supabase
    .from("features")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);
  if (error) throw error;
  return (count || 0) + 1;
}

export async function createFeature(input: CreateFeatureInput): Promise<FeatureRow> {
  const initiative = input.initiative_id
    ? input.initiatives.find((item) => item.id === input.initiative_id)
    : undefined;
  const human_readable_id = buildHumanReadableId(
    featureIdPrefix(initiative?.name),
    await nextFeatureNumber(input.productId),
  );

  const insertData: TablesInsert<"features"> = {
    product_id: input.productId,
    title: input.title,
    description: input.description || "",
    goal_id: input.goal_id || null,
    initiative_id: input.initiative_id || null,
    hypothesis_id: input.hypothesis_id || null,
    board_column: input.board_column,
    position: nextPositionInColumn(input.features, input.board_column),
    human_readable_id,
    closed_at: applyClosedAt(input.board_column),
  };

  const { data: created, error } = await supabase
    .from("features")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw error;

  if (input.hypothesis_id) {
    await syncAttachmentLinksForFeatureHypothesis(created.id, input.hypothesis_id);
  }

  return created;
}
