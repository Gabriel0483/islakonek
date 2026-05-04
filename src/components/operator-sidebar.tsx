"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Ship, 
  LayoutDashboard, 
  Route, 
  Settings, 
  TrendingUp, 
  Calendar, 
  Users, 
  CreditCard,
  LogOut,
  Sparkles
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

  const menuItems = [
    { title: "Overview", icon: LayoutDashboard, href: "/operator" },
    { title: "Routes & Schedules", icon: Route, href: "/operator/routes" },
    { title: "Vessel Fleet", icon: Ship, href: "/operator/vessels" },
    { title: "Bookings", icon: Calendar, href: "/operator/bookings" },
  ];

  const toolItems = [
    { title: "AI Optimization", icon: Sparkles, href: "/operator/optimize", isSpecial: true },
    { title: "Revenue Insights", icon: TrendingUp, href: "/operator/analytics" },
    { title: "Crew Management", icon: Users, href: "/operator/crew" },
  ];

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 px-4 mb-2">Smart Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className={`hover:bg-accent/10 ${item.isSpecial ? 'text-accent font-bold' : ''} data-[active=true]:bg-accent data-[active=true]:text-primary`}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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