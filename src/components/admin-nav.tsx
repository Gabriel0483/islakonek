"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Ship, 
  LayoutDashboard, 
  Scan, 
  Ticket, 
  ClipboardList, 
  MapPin, 
  Waypoints, 
  Banknote, 
  Wrench, 
  CalendarDays, 
  Home,
  Menu,
  Activity,
  LogOut,
  User,
  TrendingUp,
  Radio,
  Users
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection } from "firebase/firestore";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "SuperAdmin": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff"],
  "Operations Manager": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff"],
  "Port Officer": ["voyages", "boarding", "desk", "ops", "schedules", "staff"],
  "Desk Agent": ["boarding", "desk", "bookings"],
  "Crew": ["boarding"],
  "Finance/Accounting": ["fares", "bookings", "sales"]
};

const menuItems = [
  { id: "voyages", label: "Voyages", icon: Radio, href: "/admin/voyages" },
  { id: "boarding", label: "Boarding", icon: Scan, href: "/admin/boarding" },
  { id: "desk", label: "Desk", icon: Ticket, href: "/admin/bookings" },
  { id: "bookings", label: "Bookings", icon: ClipboardList, href: "/admin/manage-bookings" },
];

const analyticItems = [
  { id: "sales", label: "Sales", icon: TrendingUp, href: "/admin/sales-overview" },
  { id: "ops", label: "Ops", icon: Activity, href: "/admin/operational-overview" },
];

const configItems = [
  { id: "ports", label: "Ports", icon: MapPin, href: "/admin/ports" },
  { id: "routes", label: "Routes", icon: Waypoints, href: "/admin/routes" },
  { id: "fares", label: "Fares", icon: Banknote, href: "/admin/fares" },
  { id: "fleet", label: "Fleet", icon: Wrench, href: "/admin/fleet" },
  { id: "schedules", label: "Schedules", icon: CalendarDays, href: "/admin/schedules" },
  { id: "staff", label: "Staff", icon: Users, href: "/admin/staff" },
];

export function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  // Defer staff registry read until user is authenticated
  const staffRef = useMemoFirebase(() => (db && user) ? collection(db, "staff") : null, [db, user]);
  const { data: allStaff } = useCollection(staffRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Guest");
  const permissions = ROLE_PERMISSIONS[currentRole] || [];

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login/admin");
    }
  };
  
  const filteredMenuItems = menuItems.filter(m => permissions.includes(m.id));
  const filteredAnalyticItems = analyticItems.filter(m => permissions.includes(m.id));
  const filteredConfigItems = configItems.filter(m => permissions.includes(m.id));

  return (
    <nav className="bg-primary text-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 mr-2">
             <div className="bg-accent p-1 rounded-md shrink-0"><Ship className="h-5 w-5 text-primary" /></div>
             <span className="font-headline font-bold text-base hidden sm:inline">Isla Konek</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/admin" className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors", pathname === "/admin" ? "bg-accent text-primary" : "hover:bg-white/10")}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            {filteredMenuItems.length > 0 && <div className="h-4 w-px bg-white/20 mx-2" />}
            {filteredMenuItems.map(item => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors", pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10")}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
            {filteredAnalyticItems.length > 0 && <div className="h-4 w-px bg-white/20 mx-2" />}
            {filteredAnalyticItems.map(item => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors", pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10")}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
            {filteredConfigItems.length > 0 && <div className="h-4 w-px bg-white/20 mx-2" />}
            {filteredConfigItems.map(item => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors", pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10")}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10"><Menu className="h-6 w-6" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[85vh] overflow-y-auto">
                  <DropdownMenuLabel>Modules</DropdownMenuLabel>
                  {filteredMenuItems.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.label}</Link></DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  {filteredConfigItems.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.label}</Link></DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold"><LogOut className="h-4 w-4" /> Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
           <div className="hidden lg:flex items-center border-l border-white/20 pl-4 ml-2 gap-2">
             <Link href="/profile"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider"><User className="h-3 w-3 mr-1.5" /> Admin Profile</Button></Link>
             <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider"><LogOut className="h-3 w-3 mr-1.5" /> Out</Button>
           </div>
        </div>
      </div>
    </nav>
  );
}
