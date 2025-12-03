import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Metric {
  id: string;
  name: string;
  parent_metric_id?: string;
}

interface Initiative {
  id: string;
  name: string;
  description: string;
  color?: string;
  archived?: boolean;
  archived_at?: string | null;
}

interface Product {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ProductContextType {
  metrics: Metric[];
  initiatives: Initiative[];
  currentProductId: string | null;
  isLoading: boolean;
  refetchMetrics: () => void;
  refetchInitiatives: () => void;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  refetchShowArchived: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const effectiveUserId = user?.id;

  // Get current product for the user (first/default product)
  const { data: currentProduct, isLoading: productLoading } = useQuery({
    queryKey: ["current_product", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as Product | null;
    },
    enabled: !!effectiveUserId,
  });

  const currentProductId = currentProduct?.id || null;

  const { data: metrics = [], isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["metrics", currentProductId],
    queryFn: async () => {
      if (!currentProductId) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("product_id", currentProductId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProductId,
  });

  const { data: initiatives = [], isLoading: initiativesLoading, refetch: refetchInitiatives } = useQuery({
    queryKey: ["initiatives", currentProductId],
    queryFn: async () => {
      if (!currentProductId) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("product_id", currentProductId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProductId,
  });

  // Fetch showArchived setting
  const { data: showArchivedData, refetch: refetchShowArchived } = useQuery({
    queryKey: ["project_settings", currentProductId],
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

  const setShowArchived = async (value: boolean) => {
    if (!user || !currentProductId) return;
    
    const { data: existing } = await supabase
      .from("project_settings")
      .select("*")
      .eq("product_id", currentProductId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("project_settings")
        .update({ show_archived: value })
        .eq("product_id", currentProductId);
    } else {
      await supabase
        .from("project_settings")
        .insert({ product_id: currentProductId, show_archived: value });
    }
    
    refetchShowArchived();
  };

  return (
    <ProductContext.Provider 
      value={{ 
        metrics, 
        initiatives,
        currentProductId,
        isLoading: productLoading || metricsLoading || initiativesLoading,
        refetchMetrics,
        refetchInitiatives,
        showArchived,
        setShowArchived,
        refetchShowArchived
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
