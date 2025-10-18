import { createContext, useContext, useState, ReactNode } from "react";

interface Metric {
  id: string;
  name: string;
  parentMetricId?: string;
}

interface Track {
  id: string;
  name: string;
  description: string;
}

interface ProductContextType {
  metrics: Metric[];
  setMetrics: (metrics: Metric[]) => void;
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  return (
    <ProductContext.Provider value={{ metrics, setMetrics, tracks, setTracks }}>
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
