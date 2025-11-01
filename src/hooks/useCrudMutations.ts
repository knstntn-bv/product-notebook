import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!user) throw new Error("No user");
      const { error } = await (supabase as any)
        .from(tableName)
        .insert({ ...data, user_id: user.id });
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
      const { error } = await (supabase as any)
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
      const { error } = await (supabase as any).from(tableName).delete().eq("id", id);
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
