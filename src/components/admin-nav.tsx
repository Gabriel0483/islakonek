
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

const menuItems = [
  { label: "Voyages", icon: Radio, href: "/admin/voyages", roles: ["SuperAdmin", "Operations Manager", "Port Officer"] },
  { label: "Boarding", icon: Scan, href: "/admin/boarding", roles: ["SuperAdmin", "Operations Manager", "Port Officer", "Desk Agent", "Crew"] },
  { label: "Desk", icon: Ticket, href: "/admin/bookings", roles: ["SuperAdmin", "Operations Manager", "Port Officer", "Desk Agent"] },
  { label: "Bookings", icon: ClipboardList, href: "/admin/manage-bookings", roles: ["SuperAdmin", "Operations Manager", "Finance/Accounting"] },
];

const analyticItems = [
  { label: "Sales", icon: TrendingUp, href: "/admin/sales-overview", roles: ["SuperAdmin", "Operations Manager", "Finance/Accounting"] },
  { label: "Ops", icon: Activity, href: "/admin/operational-overview", roles: ["SuperAdmin", "Operations Manager", "Port Officer"] },
];

const configItems = [
  { label: "Ports", icon: MapPin, href: "/admin/ports", roles: ["SuperAdmin"] },
  { label: "Routes", icon: Waypoints, href: "/admin/routes", roles: ["SuperAdmin", "Operations Manager"] },
  { label: "Fares", icon: Banknote, href: "/admin/fares", roles: ["SuperAdmin", "Finance/Accounting"] },
  { label: "Fleet", icon: Wrench, href: "/admin/fleet", roles: ["SuperAdmin", "Operations Manager"] },
  { label: "Schedules", icon: CalendarDays, href: "/admin/schedules", roles: ["SuperAdmin", "Operations Manager", "Port Officer"] },
  { label: "Staff", icon: Users, href: "/admin/staff", roles: ["SuperAdmin", "Operations Manager", "Port Officer"] },
];

export function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const staffRef = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: allStaff } = useCollection(staffRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Guest");

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login/admin");
    }
  };
  
  const filteredMenuItems = menuItems.filter(m => m.roles.includes(currentRole));
  const filteredAnalyticItems = analyticItems.filter(m => m.roles.includes(currentRole));
  const filteredConfigItems = configItems.filter(m => m.roles.includes(currentRole));

  return (
    <nav className="bg-primary text-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 mr-2 sm:mr-4">
             <div className="bg-accent p-1 rounded-md shrink-0">
               <Ship className="h-5 w-5 text-primary" />
             </div>
             <span className="font-headline font-bold text-base sm:text-lg hidden xs:inline lg:inline">Isla Konek Admin</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1">
            <Link 
              href="/admin"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors",
                pathname === "/admin" ? "bg-accent text-primary" : "hover:bg-white/10"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <div className="h-4 w-px bg-white/20 mx-2" />
            {filteredMenuItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors",
                  pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            
            {filteredAnalyticItems.length > 0 && <div className="h-4 w-px bg-white/20 mx-2" />}
            {filteredAnalyticItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors",
                  pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            {filteredConfigItems.length > 0 && <div className="h-4 w-px bg-white/20 mx-2" />}
            {filteredConfigItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors",
                  pathname === item.href ? "bg-accent text-primary" : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
           <Link href="/" className="text-xs font-bold flex items-center gap-1.5 hover:text-accent transition-colors hidden sm:flex">
             <Home className="h-4 w-4" /> Public Site
           </Link>

           <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[85vh] overflow-y-auto">
                  <DropdownMenuLabel>Personal</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {filteredMenuItems.length > 0 && (
                    <>
                      <DropdownMenuLabel>Operations</DropdownMenuLabel>
                      {filteredMenuItems.map(item => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {filteredAnalyticItems.length > 0 && (
                    <>
                      <DropdownMenuLabel>Analytics</DropdownMenuLabel>
                      {filteredAnalyticItems.map(item => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {filteredConfigItems.length > 0 && (
                    <>
                      <DropdownMenuLabel>Infrastructure</DropdownMenuLabel>
                      {filteredConfigItems.map(item => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center gap-2">
                      <Home className="h-4 w-4" /> Public Site
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold">
                    <LogOut className="h-4 w-4" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
           
           <div className="hidden lg:flex items-center border-l border-white/20 pl-4 ml-2 gap-2">
             <Link href="/profile">
               <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider">
                 <User className="h-3 w-3 mr-1.5" /> My Profile
               </Button>
             </Link>
             <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider">
               <LogOut className="h-3 w-3 mr-1.5" /> Out
             </Button>
           </div>
        </div>
      </div>
    </nav>
  );
}
