import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

interface Metric {
  id: string;
  name: string;
  parent_metric_id?: string;
}

interface Track {
  id: string;
  name: string;
  description: string;
  color?: string;
}

interface ProductContextType {
  metrics: Metric[];
  tracks: Track[];
  isLoading: boolean;
  refetchMetrics: () => void;
  refetchTracks: () => void;
  isReadOnly: boolean;
  sharedUserId: string | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sharedUserId, setSharedUserId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const shareToken = searchParams.get("share");

  useEffect(() => {
    const fetchSharedUser = async () => {
      if (shareToken && !user) {
        const { data, error } = await supabase
          .from("project_settings")
          .select("user_id")
          .eq("share_token", shareToken)
          .eq("is_public", true)
          .maybeSingle();

        if (data && !error) {
          setSharedUserId(data.user_id);
          setIsReadOnly(true);
        }
      } else if (user) {
        setSharedUserId(null);
        setIsReadOnly(false);
      }
    };

    fetchSharedUser();
  }, [shareToken, user]);

  const effectiveUserId = sharedUserId || user?.id;

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

  const { data: tracks = [], isLoading: tracksLoading, refetch: refetchTracks } = useQuery({
    queryKey: ["tracks", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveUserId,
  });

  return (
    <ProductContext.Provider 
      value={{ 
        metrics, 
        tracks, 
        isLoading: metricsLoading || tracksLoading,
        refetchMetrics,
        refetchTracks,
        isReadOnly,
        sharedUserId
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
