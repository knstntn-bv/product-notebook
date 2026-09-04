import { useState } from "react";
import { LogOut, PanelLeft, PanelLeftClose, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProduct } from "@/contexts/ProductContext";

export function HeaderSidebarToggle() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 -ml-1"
      onClick={toggleSidebar}
      aria-label="Open menu"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

export function AppSidebarFooter() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { showArchived, setShowArchived } = useProduct();
  const { state, setOpen, isMobile } = useSidebar();
  const expanded = state === "expanded";
  const profileEmail = user?.email;

  return (
    <>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Settings" className="h-9 text-base">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuItem
                  className="flex items-center justify-between gap-4"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span>Show Archived Items</span>
                  <Switch
                    checked={showArchived}
                    onCheckedChange={(checked) => setShowArchived(checked)}
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  Open Project Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Profile" className="h-9 text-base">
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                {profileEmail && (
                  <>
                    <DropdownMenuLabel className="font-normal truncate">
                      {profileEmail}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          {!isMobile && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setOpen(!expanded)}
                tooltip={expanded ? "Collapse sidebar" : "Expand sidebar"}
                className="h-9 justify-end text-base"
              >
                {expanded ? <PanelLeftClose /> : <PanelLeft />}
                <span className="sr-only">{expanded ? "Collapse" : "Expand"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
