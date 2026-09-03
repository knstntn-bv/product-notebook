import { NavLink, useLocation } from "react-router-dom";
import { BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarToggleFooter } from "@/components/SidebarToggleButtons";
import { NAV_ITEMS } from "@/lib/navigation";
import { useProduct } from "@/contexts/ProductContext";

export function AppSidebar() {
  const location = useLocation();
  const { currentProductName } = useProduct();
  const { setOpenMobile } = useSidebar();
  const productTitle = currentProductName?.trim() || "Product Notebook";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={productTitle}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BookOpen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{productTitle}</span>
                <span className="truncate text-xs text-muted-foreground">Product Notebook</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === path || location.pathname.endsWith(path)}
                    tooltip={label}
                  >
                    <NavLink
                      to={path}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarToggleFooter />
      <SidebarRail />
    </Sidebar>
  );
}
