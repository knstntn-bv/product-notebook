import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";

interface CrudMutationsOptions {
  tableName: string;
  queryKey: string[];
  entityName?: string;
  onSuccessCallback?: () => void;
}

export const useCrudMutations = ({
  tableName,
  queryKey,
  entityName = "Item",
  onSuccessCallback,
}: CrudMutationsOptions) => {
  const { currentProductId } = useProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!currentProductId) throw new Error("No product selected");
      const { error } = await supabase
        .from(tableName)
        .insert({ ...data, product_id: currentProductId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onSuccessCallback?.();
      toast({ title: `${entityName} added successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onSuccessCallback?.();
      toast({ title: `${entityName} updated successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onSuccessCallback?.();
      toast({ title: `${entityName} deleted successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    addMutation,
    updateMutation,
    deleteMutation,
  };
};
