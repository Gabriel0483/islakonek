
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Ship, 
  LayoutDashboard, 
  MapPin,
  Settings, 
  LogOut,
  Waypoints
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

export function OperatorSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-1.5 rounded-lg shrink-0">
            <Ship className="h-6 w-6 text-primary" />
          </div>
          <span className="font-headline font-bold text-white truncate text-lg group-data-[collapsible=icon]:hidden">
            Isla Konek <span className="text-accent">Ops</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 px-4 mb-2">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/operator"}
                  tooltip="Overview"
                  className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                >
                  <Link href="/operator">
                    <LayoutDashboard />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/operator/ports"}
                  tooltip="Ports"
                  className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                >
                  <Link href="/operator/ports">
                    <MapPin />
                    <span>Ports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/operator/routes"}
                  tooltip="Routes"
                  className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                >
                  <Link href="/operator/routes">
                    <Waypoints />
                    <span>Routes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" className="hover:bg-accent/10">
              <Link href="/operator/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout" className="hover:bg-destructive/10 text-red-400">
              <Link href="/">
                <LogOut />
                <span>Logout</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
