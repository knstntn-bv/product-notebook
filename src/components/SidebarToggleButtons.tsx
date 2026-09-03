import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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

export function SidebarToggleFooter() {
  const { state, setOpen, isMobile } = useSidebar();

  if (isMobile) {
    return null;
  }

  const expanded = state === "expanded";

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setOpen(!expanded)}
            tooltip={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <PanelLeftClose /> : <PanelLeft />}
            <span>{expanded ? "Collapse" : "Expand"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
