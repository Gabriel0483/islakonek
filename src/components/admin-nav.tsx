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
  Menu,
  Activity,
  LogOut,
  User,
  TrendingUp,
  Radio,
  Users,
  Megaphone,
  Globe,
  CalendarClock,
  BarChart3,
  ChevronDown,
  LayoutGrid
} from "lucide-react";
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
  "SuperAdmin": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff", "advisories", "staff-schedules", "reports"],
  "Operations Manager": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff", "advisories", "staff-schedules", "reports"],
  "Port Officer": ["voyages", "boarding", "desk", "ops", "schedules", "staff", "advisories", "staff-schedules"],
  "Desk Agent": ["boarding", "desk", "bookings"],
  "Crew": ["boarding"],
  "Finance/Accounting": ["fares", "bookings", "sales", "reports"]
};

const menuItems = [
  { id: "voyages", label: "Voyages", icon: Radio, href: "/admin/voyages" },
  { id: "boarding", label: "Boarding Mode", icon: Scan, href: "/admin/boarding" },
  { id: "desk", label: "Desk Bookings", icon: Ticket, href: "/admin/bookings" },
  { id: "bookings", label: "Manage Bookings", icon: ClipboardList, href: "/admin/manage-bookings" },
];

const analyticItems = [
  { id: "sales", label: "Sales Overview", icon: TrendingUp, href: "/admin/sales-overview" },
  { id: "reports", label: "Financial Reports", icon: BarChart3, href: "/admin/reports" },
  { id: "ops", label: "Operational Overview", icon: Activity, href: "/admin/operational-overview" },
  { id: "advisories", label: "Public Advisories", icon: Megaphone, href: "/admin/advisories" },
];

const configItems = [
  { id: "staff", label: "Personnel Registry", icon: Users, href: "/admin/staff" },
  { id: "staff-schedules", label: "Duty Scheduling", icon: CalendarClock, href: "/admin/staff-schedules" },
  { id: "ports", label: "Port Registry", icon: MapPin, href: "/admin/ports" },
  { id: "routes", label: "Route Setup", icon: Waypoints, href: "/admin/routes" },
  { id: "fares", label: "Fare Tables", icon: Banknote, href: "/admin/fares" },
  { id: "fleet", label: "Fleet Registry", icon: Wrench, href: "/admin/fleet" },
  { id: "schedules", label: "Trip Timetables", icon: CalendarDays, href: "/admin/schedules" },
];

export function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const staffRef = useMemoFirebase(() => (db && user) ? collection(db, "staff") : null, [db, user]);
  const { data: allStaff } = useCollection(staffRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Guest");
  
  const permissions = isSuperAdmin 
    ? ROLE_PERMISSIONS["SuperAdmin"] 
    : (myStaffRecord?.authorizedModules || ROLE_PERMISSIONS[currentRole] || []);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-9 px-4 font-bold text-xs gap-2">
                  <LayoutGrid className="h-4 w-4" /> Admin Modules <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-[85vh] overflow-y-auto shadow-2xl rounded-xl">
                {filteredMenuItems.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pt-3">Operations</DropdownMenuLabel>
                    {filteredMenuItems.map(item => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer py-2 font-bold text-sm">
                          <item.icon className="h-4 w-4 text-accent" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {filteredAnalyticItems.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Intelligence</DropdownMenuLabel>
                    {filteredAnalyticItems.map(item => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer py-2 font-bold text-sm">
                          <item.icon className="h-4 w-4 text-accent" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                {filteredConfigItems.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Configuration</DropdownMenuLabel>
                    {filteredConfigItems.map(item => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer py-2 font-bold text-sm">
                          <item.icon className="h-4 w-4 text-accent" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Link href="/" className="hidden sm:block">
             <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-9 px-3 font-bold text-xs gap-2">
               <Globe className="h-4 w-4" /> Public Site
             </Button>
           </Link>

           <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10"><Menu className="h-6 w-6" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-[85vh] overflow-y-auto shadow-2xl rounded-xl">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuItem asChild><Link href="/admin" className="flex items-center gap-2 font-bold"><LayoutDashboard className="h-4 w-4" /> Admin Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/" className="flex items-center gap-2 font-bold"><Globe className="h-4 w-4" /> Public Site</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/my-bookings" className="flex items-center gap-2 font-bold"><Ticket className="h-4 w-4" /> My Bookings</Link></DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Operations</DropdownMenuLabel>
                  {filteredMenuItems.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} className="flex items-center gap-2 font-bold"><item.icon className="h-4 w-4" /> {item.label}</Link></DropdownMenuItem>)}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Intelligence</DropdownMenuLabel>
                  {filteredAnalyticItems.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} className="flex items-center gap-2 font-bold"><item.icon className="h-4 w-4" /> {item.label}</Link></DropdownMenuItem>)}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Configuration</DropdownMenuLabel>
                  {filteredConfigItems.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} className="flex items-center gap-2 font-bold"><item.icon className="h-4 w-4" /> {item.label}</Link></DropdownMenuItem>)}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive font-black uppercase text-xs tracking-widest"><LogOut className="h-4 w-4" /> Log Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
           
           <div className="hidden lg:flex items-center border-l border-white/20 pl-4 ml-2 gap-2">
             <Link href="/my-bookings"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider"><Ticket className="h-3 w-3 mr-1.5 text-accent" /> My Bookings</Button></Link>
             <Link href="/profile"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider"><User className="h-3 w-3 mr-1.5 text-accent" /> Profile</Button></Link>
             <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10 h-8 px-2 font-bold text-[10px] uppercase tracking-wider"><LogOut className="h-3 w-3 mr-1.5 text-accent" /> Out</Button>
           </div>
        </div>
      </div>
    </nav>
  );
}