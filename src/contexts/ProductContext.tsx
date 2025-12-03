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

interface ProductContextType {
  metrics: Metric[];
  initiatives: Initiative[];
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

  const { data: metrics = [], isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["metrics", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  const { data: initiatives = [], isLoading: initiativesLoading, refetch: refetchInitiatives } = useQuery({
    queryKey: ["initiatives", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  // Fetch showArchived setting
  const { data: showArchivedData, refetch: refetchShowArchived } = useQuery({
    queryKey: ["project_settings", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return { show_archived: false };
      const { data, error } = await supabase
        .from("project_settings")
        .select("show_archived")
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data || { show_archived: false };
    },
    enabled: !!effectiveUserId,
  });

  const showArchived = showArchivedData?.show_archived ?? false;

  const setShowArchived = async (value: boolean) => {
    if (!user) return;
    
    const { data: existing } = await supabase
      .from("project_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("project_settings")
        .update({ show_archived: value })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("project_settings")
        .insert({ user_id: user.id, show_archived: value });
    }
    
    refetchShowArchived();
  };

  return (
    <ProductContext.Provider 
      value={{ 
        metrics, 
        initiatives, 
        isLoading: metricsLoading || initiativesLoading,
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
