import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchSettings();
    }
  }, [open, user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("project_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setIsPublic(data.is_public);
      setShareToken(data.share_token);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from("project_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("project_settings")
          .update({ is_public: checked })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("project_settings")
          .insert({ user_id: user.id, is_public: checked })
          .select()
          .single();

        if (error) throw error;
        setShareToken(data.share_token);
      }

      setIsPublic(checked);
      toast({
        title: "Success",
        description: checked ? "Project is now publicly accessible" : "Project is now private",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/?share=${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-access">Open Project</Label>
              <p className="text-sm text-muted-foreground">
                Allow read-only access via a shareable link
              </p>
            </div>
            <Switch
              id="public-access"
              checked={isPublic}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>

          {isPublic && shareToken && (
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/?share=${shareToken}`}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyShareLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view your project in read-only mode
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
