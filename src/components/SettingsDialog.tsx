import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProduct } from "@/contexts/ProductContext";
import { useToast } from "@/hooks/use-toast";
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
  const { currentProductId, currentProductName, refetchCurrentProduct } = useProduct();
  const [productNameInput, setProductNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProductNameInput(currentProductName ?? "");
    }
  }, [open, currentProductName]);

  const trimmedName = useMemo(() => productNameInput.trim(), [productNameInput]);
  const hasLengthError = trimmedName.length < 1 || trimmedName.length > 100;
  const isUnchanged = trimmedName === (currentProductName ?? "").trim();
  const saveDisabled = !currentProductId || hasLengthError || isUnchanged || isSaving;

  const handleSave = async () => {
    if (!currentProductId || hasLengthError || isUnchanged) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("products")
      .update({ name: trimmedName })
      .eq("id", currentProductId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    await refetchCurrentProduct();
    toast({
      title: "Saved",
      description: "Product name has been updated.",
    });
    setIsSaving(false);
    onOpenChange(false);
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveDisabled}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
