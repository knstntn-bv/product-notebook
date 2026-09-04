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
          <header className="z-50 flex h-20 shrink-0 items-center gap-2 bg-background px-20">
            <HeaderSidebarToggle />
            <h1 className="flex-1 min-w-0 -translate-y-1 overflow-hidden text-ellipsis whitespace-nowrap pb-1 text-2xl font-semibold leading-normal tracking-tight text-foreground md:text-3xl">
              {pageTitle}
            </h1>
            <HeaderActionsSlot />
          </header>
          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              isBoard
                ? "overflow-hidden px-8 pb-4"
                : "overflow-y-auto px-20 py-4",
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
