import { Outlet, useLocation } from "react-router-dom";
import { ProductProvider } from "@/contexts/ProductContext";
import { AppSidebar } from "@/components/AppSidebar";
import { HeaderActionsProvider, HeaderActionsSlot } from "@/components/HeaderActions";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HeaderSidebarToggle } from "@/components/SidebarToggleButtons";
import { getNavLabelFromPath, isBoardPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const AppLayoutContent = () => {
  const location = useLocation();
  const isBoard = isBoardPath(location.pathname);
  const pageTitle = getNavLabelFromPath(location.pathname);

  return (
    <HeaderActionsProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 h-svh overflow-hidden">
          <header className="z-50 flex h-20 shrink-0 items-center gap-3 bg-background pl-0 pr-4 md:gap-2 md:px-20">
            <HeaderSidebarToggle />
            <h1 className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-foreground md:-translate-y-1 md:pb-1 md:text-3xl md:leading-normal">
              {pageTitle}
            </h1>
            <HeaderActionsSlot />
          </header>
          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              isBoard
                ? "overflow-hidden px-1 pb-4 md:px-8"
                : "overflow-y-auto px-4 py-4 md:px-20",
            )}
          >
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </HeaderActionsProvider>
  );
};

export const AppLayout = () => {
  return (
    <ProductProvider>
      <AppLayoutContent />
    </ProductProvider>
  );
};
