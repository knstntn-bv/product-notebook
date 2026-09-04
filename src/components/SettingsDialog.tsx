import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
import { errorToast } from "@/lib/errorToast";
import { currentProductKey, requireProductId } from "@/lib/productQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { currentProductId, currentProductName } = useProduct();
  const [productNameInput, setProductNameInput] = useState("");

  useEffect(() => {
    if (open) {
      setProductNameInput(currentProductName ?? "");
    }
  }, [open, currentProductName]);

  const trimmedName = useMemo(() => productNameInput.trim(), [productNameInput]);
  const hasLengthError = trimmedName.length < 1 || trimmedName.length > 100;
  const isUnchanged = trimmedName === (currentProductName ?? "").trim();

  const saveNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const productId = requireProductId(currentProductId);
      const { error } = await supabase.from("products").update({ name }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentProductKey(user?.id) });
      toast({
        title: "Saved",
        description: "Product name has been updated.",
      });
      onOpenChange(false);
    },
    onError: errorToast,
  });

  const saveDisabled =
    !currentProductId || hasLengthError || isUnchanged || saveNameMutation.isPending;

  const handleSave = () => {
    if (!currentProductId || hasLengthError || isUnchanged) return;
    saveNameMutation.mutate(trimmedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="product-name-input">Product name</Label>
            <Input
              id="product-name-input"
              value={productNameInput}
              onChange={(e) => setProductNameInput(e.target.value)}
              maxLength={100}
              aria-invalid={hasLengthError}
            />
            {hasLengthError ? (
              <p className="text-sm text-destructive">
                Product name is required and must be between 1 and 100 characters.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveNameMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveDisabled}>
              {saveNameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
