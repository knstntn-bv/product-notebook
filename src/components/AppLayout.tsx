import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { ProductProvider, useProduct } from "@/contexts/ProductContext";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AppSidebar } from "@/components/AppSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HeaderSidebarToggle } from "@/components/SidebarToggleButtons";
import { getNavLabelFromPath, isBoardPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const AppLayoutContent = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { showArchived, setShowArchived } = useProduct();
  const location = useLocation();
  const isBoard = isBoardPath(location.pathname);
  const pageTitle = getNavLabelFromPath(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        className={cn(
          "min-w-0",
          isBoard && "h-svh overflow-hidden",
        )}
      >
        <header className="z-50 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
          <HeaderSidebarToggle />
          <h1 className="flex-1 truncate text-lg font-semibold text-foreground md:text-xl">
            {pageTitle}
          </h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:h-10 md:w-auto md:px-4 md:py-2">
                  <Settings className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:h-10 md:w-auto md:px-4 md:py-2">
                  <User className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">{user?.email || "Profile"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <main
          className={cn(
            isBoard
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              : "container mx-auto flex-1 px-4 py-8",
          )}
        >
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export const AppLayout = () => {
  return (
    <ProductProvider>
      <AppLayoutContent />
    </ProductProvider>
  );
};
