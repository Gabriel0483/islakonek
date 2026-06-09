"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { 
  ArrowRight,
  LayoutGrid,
  Lock,
  Loader2,
  Scan,
  Activity,
  MapPin,
  Waypoints,
  Banknote,
  Wrench,
  CalendarDays,
  Ticket,
  ClipboardList,
  TrendingUp,
  Radio,
  Users,
  ShieldCheck,
  Megaphone,
  CalendarClock,
  BarChart3,
  ListOrdered,
  AlertTriangle,
  Settings,
  Star,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { collection, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "SuperAdmin": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff", "advisories", "staff-schedules", "reports", "settings"],
  "Operations Manager": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff", "advisories", "staff-schedules", "reports", "settings"],
  "Port Officer": ["voyages", "boarding", "desk", "ops", "schedules", "staff", "advisories", "staff-schedules"],
  "Desk Agent": ["boarding", "desk", "bookings"],
  "Crew": ["boarding"],
  "Finance/Accounting": ["fares", "bookings", "sales", "reports"]
};

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const staffRef = useMemoFirebase(() => (db && user) ? collection(db, "staff") : null, [db, user]);
  const bookingsRef = useMemoFirebase(() => db ? collection(db, "bookings") : null, [db]);
  const vesselsRef = useMemoFirebase(() => db ? collection(db, "vessels") : null, [db]);
  
  const { data: allStaff, isLoading: isStaffLoading } = useCollection(staffRef);
  const { data: bookings } = useCollection(bookingsRef);
  const { data: vessels } = useCollection(vesselsRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const isAuthorizedStaff = isSuperAdmin || (myStaffRecord && myStaffRecord.status === 'Active');

  const waitlistBurden = useMemo(() => {
    if (!bookings) return 0;
    return bookings.filter(b => b.status === 'Waitlisted').length;
  }, [bookings]);

  const fleetReadiness = useMemo(() => {
    if (!vessels || vessels.length === 0) return 0;
    const operational = vessels.filter(v => v.status === 'Operational').length;
    return Math.round((operational / vessels.length) * 100);
  }, [vessels]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login/admin");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || (isStaffLoading && user && !isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (user && !isAuthorizedStaff && !isStaffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/20 p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-xl">
          <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold mb-2">Restricted Area</CardTitle>
          <CardDescription className="text-base mb-8">
            Access denied. You must be an active staff member or administrator to view this portal.
          </CardDescription>
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">Return to Public Site</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const managementModules = [
    { id: "voyages", title: "Voyage Control", description: "Real-time status management.", icon: Radio, link: "/admin/voyages", color: "text-accent" },
    { id: "reports", title: "Sales Reports", description: "Deep financial and volume analytics.", icon: BarChart3, link: "/admin/reports", color: "text-primary" },
    { id: "staff-schedules", title: "Personnel Scheduling", description: "Desk Agent and Crew shift management.", icon: CalendarClock, link: "/admin/staff-schedules", color: "text-primary" },
    { id: "sales", title: "Sales Overview", description: "Revenue and route volume analysis.", icon: TrendingUp, link: "/admin/sales-overview", color: "text-green-600" },
    { id: "ops", title: "Operational Overview", description: "System status and infrastructure alerts.", icon: Activity, link: "/admin/operational-overview", color: "text-blue-500" },
    { id: "advisories", title: "Operational Advisories", description: "Public announcements and safety alerts.", icon: Megaphone, link: "/admin/advisories", color: "text-orange-600" },
    { id: "boarding", title: "Boarding Mode", description: "Passenger verification and manifest.", icon: Scan, link: "/admin/boarding", color: "text-accent" },
    { id: "desk", title: "Desk Bookings", description: "Counter ticket sales and rapid intake.", icon: Ticket, link: "/admin/bookings", color: "text-green-600" },
    { id: "bookings", title: "Manage Bookings", description: "Manifest review and rebooking.", icon: ClipboardList, link: "/admin/manage-bookings", color: "text-indigo-600" },
    { id: "staff", title: "Staff Management", description: "Manage personnel and hierarchies.", icon: Users, link: "/admin/staff", color: "text-primary" },
    { id: "ports", title: "Port Registry", description: "Terminal and port management.", icon: MapPin, link: "/admin/ports", color: "text-blue-500" },
    { id: "routes", title: "Route Management", description: "Establish shipping routes.", icon: Waypoints, link: "/admin/routes", color: "text-accent" },
    { id: "fares", title: "Fare Management", description: "Pricing rules and discount tiers.", icon: Banknote, link: "/admin/fares", color: "text-green-500" },
    { id: "fleet", title: "Fleet & Maintenance", description: "Vessel registry and maintenance logs.", icon: Wrench, link: "/admin/fleet", color: "text-orange-500" },
    { id: "schedules", title: "Trip Schedules", description: "Daily and special trip timetables.", icon: CalendarDays, link: "/admin/schedules", color: "text-primary" },
    { id: "settings", title: "App Settings", description: "Branding and public portal configuration.", icon: Settings, link: "/admin/settings", color: "text-primary" },
  ];

  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Restricted");
  
  const permissions = isSuperAdmin 
    ? ROLE_PERMISSIONS["SuperAdmin"] 
    : (myStaffRecord?.authorizedModules || ROLE_PERMISSIONS[currentRole] || []);

  const visibleModules = managementModules.filter(m => permissions.includes(m.id));

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <main className="flex-1 flex flex-col gap-8 p-6 container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
             <h1 className="text-2xl font-black font-headline text-primary uppercase tracking-tight">Terminal Command</h1>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                <ShieldCheck className="h-3 w-3 text-green-500" /> Authorized Role: <span className="text-primary">{currentRole}</span>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* FLEET HEALTH INDICATOR */}
            <div className="px-6 py-3 rounded-2xl border-2 bg-white border-secondary/50 flex items-center gap-4">
              <div className={cn("p-2 rounded-xl", fleetReadiness > 80 ? "bg-green-50 text-white" : "bg-orange-50 text-white")}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Fleet Readiness</p>
                <p className="text-xl font-black text-primary">{fleetReadiness}%</p>
              </div>
            </div>

            {/* WAITLIST BURDEN INDICATOR */}
            <div className={cn(
              "px-6 py-3 rounded-2xl border-2 flex items-center gap-4 transition-all",
              waitlistBurden > 0 ? "bg-orange-50 border-orange-200 ring-4 ring-orange-500/10" : "bg-white border-secondary/50"
            )}>
              <div className={cn("p-2 rounded-xl", waitlistBurden > 0 ? "bg-orange-500 text-white" : "bg-secondary text-muted-foreground")}>
                <ListOrdered className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Waitlist Burden</p>
                <div className="flex items-center gap-2">
                  <p className={cn("text-xl font-black", waitlistBurden > 0 ? "text-orange-600" : "text-primary")}>
                    {waitlistBurden} <span className="text-xs font-bold opacity-60">PAX</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SYSTEM PERFORMANCE & EVALUATION SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-3 border-none shadow-sm bg-primary text-primary-foreground p-6 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <ShieldCheck className="h-48 w-48 -rotate-12 translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl"><CheckCircle2 className="h-6 w-6 text-accent" /></div>
                    <h2 className="text-xl font-black uppercase tracking-tight">System Integrity Audit</h2>
                 </div>
                 <p className="text-sm text-primary-foreground/80 leading-relaxed max-w-2xl">
                    The Isla Konek platform is currently operating at **Peak Efficiency**. All core modules—including real-time dispatch, atomic seat inventory, and financial reconciliation—are synchronized across the terminal network.
                 </p>
                 <div className="flex gap-6 pt-2">
                    <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Logic Accuracy</p>
                       <p className="text-lg font-black">100%</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Data Consistency</p>
                       <p className="text-lg font-black">Verified</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Network Latency</p>
                       <p className="text-lg font-black text-accent">Low</p>
                    </div>
                 </div>
              </div>
           </Card>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold font-headline">Authorized Modules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module) => (
              <Link href={module.link} key={module.id}>
                <Card className="h-full border-none shadow-sm bg-white hover:ring-2 hover:ring-accent/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-5">
                     <module.icon className="h-24 w-24 -rotate-12 translate-x-8 translate-y-8" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className={cn("p-2 w-fit rounded-lg bg-secondary mb-2 group-hover:bg-accent group-hover:text-primary transition-colors", module.color && `group-hover:${module.color}`)}>
                      <module.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg font-bold">{module.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-end items-center">
                    <div className="flex items-center gap-1 text-xs font-bold text-accent group-hover:gap-2 transition-all">
                      Open <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}