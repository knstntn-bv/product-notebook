import { createContext, useContext, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { errorToast } from "@/lib/errorToast";
import {
  currentProductKey,
  projectSettingsKey,
  requireProductId,
  useInitiativesQuery,
  useMetricsQuery,
  type InitiativeRow,
  type MetricRow,
  type ProductRow,
} from "@/lib/productQueries";

interface ProductContextType {
  metrics: MetricRow[];
  initiatives: InitiativeRow[];
  currentProductId: string | null;
  currentProductName: string | null;
  isLoading: boolean;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const effectiveUserId = user?.id;

  const { data: currentProduct, isLoading: productLoading } = useQuery({
    queryKey: currentProductKey(effectiveUserId),
    queryFn: async (): Promise<ProductRow | null> => {
      if (!effectiveUserId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const currentProductId = currentProduct?.id || null;
  const currentProductName = currentProduct?.name || null;

  const { data: metrics = [], isLoading: metricsLoading } = useMetricsQuery(currentProductId);

  const { data: initiatives = [], isLoading: initiativesLoading } =
    useInitiativesQuery(currentProductId);

  const { data: showArchivedData } = useQuery({
    queryKey: projectSettingsKey(currentProductId),
    queryFn: async () => {
      if (!currentProductId) return { show_archived: false };
      const { data, error } = await supabase
        .from("project_settings")
        .select("show_archived")
        .eq("product_id", currentProductId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data || { show_archived: false };
    },
    enabled: !!currentProductId,
  });

  const showArchived = showArchivedData?.show_archived ?? false;

  const setShowArchivedMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const productId = requireProductId(currentProductId);
      const { data: existing, error: selectError } = await supabase
        .from("project_settings")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (selectError && selectError.code !== "PGRST116") throw selectError;

      if (existing) {
        const { error } = await supabase
          .from("project_settings")
          .update({ show_archived: value })
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_settings")
          .insert({ product_id: productId, show_archived: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectSettingsKey(currentProductId) });
    },
    onError: errorToast,
  });

  const setShowArchived = (value: boolean) => {
    setShowArchivedMutation.mutate(value);
  };

  return (
    <ProductContext.Provider 
      value={{ 
        metrics, 
        initiatives,
        currentProductId,
        currentProductName,
        isLoading: productLoading || metricsLoading || initiativesLoading,
        showArchived,
        setShowArchived,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProduct must be used within ProductProvider");
  }
  return context;
};
