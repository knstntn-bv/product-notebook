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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppSidebarFooter } from "@/components/SidebarToggleButtons";
import { NAV_ITEMS } from "@/lib/navigation";
import { useProduct } from "@/contexts/ProductContext";

const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => item.section !== "attachments");
const ATTACHMENTS_NAV_ITEM = NAV_ITEMS.find((item) => item.section === "attachments");

export function AppSidebar() {
  const location = useLocation();
  const { currentProductName } = useProduct();
  const { setOpenMobile } = useSidebar();
  const productTitle = currentProductName?.trim() || "Product Notebook";

  const renderNavItem = ({ path, label, icon: Icon }: (typeof NAV_ITEMS)[number]) => (
    <SidebarMenuItem key={path}>
      <SidebarMenuButton
        asChild
        isActive={location.pathname === path || location.pathname.endsWith(path)}
        tooltip={label}
        className="h-9 text-base"
      >
        <NavLink to={path} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={productTitle}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BookOpen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-lg leading-tight">
                <span className="truncate font-semibold">{productTitle}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="text-base">
            <SidebarMenu>
              {PRIMARY_NAV_ITEMS.map(renderNavItem)}
            </SidebarMenu>
            {ATTACHMENTS_NAV_ITEM && (
              <>
                <SidebarSeparator className="mx-0 my-2" />
                <SidebarMenu>
                  {renderNavItem(ATTACHMENTS_NAV_ITEM)}
                </SidebarMenu>
              </>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <AppSidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
