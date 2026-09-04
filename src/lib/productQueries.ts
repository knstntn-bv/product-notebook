import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type InitiativeRow = Tables<"initiatives">;
export type FeatureRow = Tables<"features">;
export type HypothesisRow = Tables<"hypotheses">;
export type GoalRow = Tables<"goals">;
export type MetricRow = Tables<"metrics">;
export type ProductRow = Tables<"products">;

export const initiativesKey = (productId: string | null) =>
  ["initiatives", productId] as const;

export const featuresKey = (productId: string | null) =>
  ["features", productId] as const;

export const hypothesesKey = (productId: string | null) =>
  ["hypotheses", productId] as const;

export const goalsKey = (productId: string | null) =>
  ["goals", productId] as const;

export const metricsKey = (productId: string | null) =>
  ["metrics", productId] as const;

export const valuesKey = (productId: string | null) =>
  ["values", productId] as const;

export const formulaKey = (productId: string | null) =>
  ["product_formula", productId] as const;

export const currentProductKey = (userId: string | null | undefined) =>
  ["current_product", userId] as const;

export const projectSettingsKey = (productId: string | null) =>
  ["project_settings", productId] as const;

export function requireProductId(productId: string | null | undefined): string {
  if (!productId) throw new Error("No product selected");
  return productId;
}

export async function fetchInitiatives(productId: string): Promise<InitiativeRow[]> {
  const { data, error } = await supabase
    .from("initiatives")
    .select("*")
    .eq("product_id", productId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFeatures(productId: string): Promise<FeatureRow[]> {
  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchHypotheses(productId: string): Promise<HypothesisRow[]> {
  const { data, error } = await supabase
    .from("hypotheses")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchGoals(productId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMetrics(productId: string): Promise<MetricRow[]> {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useInitiativesQuery(productId: string | null) {
  return useQuery({
    queryKey: initiativesKey(productId),
    queryFn: () => fetchInitiatives(productId as string),
    enabled: !!productId,
  });
}

export function useFeaturesQuery(productId: string | null) {
  return useQuery({
    queryKey: featuresKey(productId),
    queryFn: () => fetchFeatures(productId as string),
    enabled: !!productId,
  });
}

export function useHypothesesQuery(productId: string | null) {
  return useQuery({
    queryKey: hypothesesKey(productId),
    queryFn: () => fetchHypotheses(productId as string),
    enabled: !!productId,
  });
}

export function useGoalsQuery(productId: string | null) {
  return useQuery({
    queryKey: goalsKey(productId),
    queryFn: () => fetchGoals(productId as string),
    enabled: !!productId,
  });
}

export function useMetricsQuery(productId: string | null) {
  return useQuery({
    queryKey: metricsKey(productId),
    queryFn: () => fetchMetrics(productId as string),
    enabled: !!productId,
  });
}
