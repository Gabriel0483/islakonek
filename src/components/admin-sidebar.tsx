"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Ship, 
  LayoutDashboard, 
  Settings, 
  Home,
  Scan,
  Ticket,
  ClipboardList,
  MapPin,
  Waypoints,
  Banknote,
  Wrench,
  CalendarDays
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
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export function AdminSidebar() {
  const pathname = usePathname();
  const db = useFirestore();
  
  const settingsRef = useMemoFirebase(() => db ? doc(db, "settings", "app") : null, [db]);
  const { data: appSettings } = useDoc(settingsRef);

  const companyName = appSettings?.companyName || "Isla Konek";
  const logoUrl = appSettings?.logoUrl;

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { label: "Boarding Mode", icon: Scan, href: "/admin/boarding" },
    { label: "Desk Bookings", icon: Ticket, href: "/admin/bookings" },
    { label: "Manage Bookings", icon: ClipboardList, href: "/admin/manage-bookings" },
  ];

  const configItems = [
    { label: "Port Registry", icon: MapPin, href: "/admin/ports" },
    { label: "Route Setup", icon: Waypoints, href: "/admin/routes" },
    { label: "Fare Tables", icon: Banknote, href: "/admin/fares" },
    { label: "Fleet Registry", icon: Wrench, href: "/admin/fleet" },
    { label: "Trip Schedules", icon: CalendarDays, href: "/admin/schedules" },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0 bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-1.5 rounded-lg shrink-0 h-9 w-9 flex items-center justify-center overflow-hidden">
             {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full" />
             ) : (
                <Ship className="h-6 w-6 text-primary" />
             )}
          </div>
          <span className="font-headline font-bold text-white truncate text-lg group-data-[collapsible=icon]:hidden uppercase tracking-tight">
            {companyName} <span className="text-accent text-xs">ADMIN</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 px-4 mb-2">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-white/50 px-4 mb-2">Infrastructure</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-primary"
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Home Site" className="hover:bg-accent/10">
              <Link href="/">
                <Home />
                <span>Return to Site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === "/admin/settings"} className="hover:bg-accent/10">
              <Link href="/admin/settings">
                <Settings />
                <span>Global Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}