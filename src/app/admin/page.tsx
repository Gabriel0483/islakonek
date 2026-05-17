
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
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";
import { collection } from "firebase/firestore";

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const staffRef = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const { data: allStaff, isLoading: isStaffLoading } = useCollection(staffRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const isAuthorizedStaff = isSuperAdmin || (myStaffRecord && myStaffRecord.status === 'Active');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login/admin");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || (isStaffLoading && !isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthorizedStaff) {
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
            <Link href="/login/admin" className="block">
              <Button variant="link" className="text-xs text-muted-foreground" onClick={() => window.location.reload()}>Try another account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const managementModules = [
    {
      title: "Voyage Control",
      description: "Manage real-time status (Delayed, Departed, etc.) for daily trips.",
      icon: Radio,
      link: "/admin/voyages",
      color: "text-accent",
      count: "Real-time",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer"]
    },
    {
      title: "Sales Overview",
      description: "Revenue momentum, route volume analysis, and sales performance.",
      icon: TrendingUp,
      link: "/admin/sales-overview",
      color: "text-green-600",
      count: "Finance Stats",
      roles: ["SuperAdmin", "Operations Manager", "Finance/Accounting"]
    },
    {
      title: "Operational Overview",
      description: "Real-time summary of ports, routes, fleet, and system alerts.",
      icon: Activity,
      link: "/admin/operational-overview",
      color: "text-blue-500",
      count: "Operational Stats",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer"]
    },
    {
      title: "Boarding Mode",
      description: "Real-time passenger boarding and final manifest.",
      icon: Scan,
      link: "/admin/boarding",
      color: "text-accent",
      count: "Boarding",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer", "Desk Agent", "Crew"]
    },
    {
      title: "Desk Bookings",
      description: "Counter ticket sales and rapid profile lookup.",
      icon: Ticket,
      link: "/admin/bookings",
      color: "text-green-600",
      count: "Issue New",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer", "Desk Agent"]
    },
    {
      title: "Manage Bookings",
      description: "Full manifest review, rebooking, and cancellations.",
      icon: ClipboardList,
      link: "/admin/manage-bookings",
      color: "text-indigo-600",
      count: "Manifest",
      roles: ["SuperAdmin", "Operations Manager", "Finance/Accounting"]
    },
    {
      title: "Staff Management",
      description: "Manage operations managers, port officers, agents, and crew.",
      icon: Users,
      link: "/admin/staff",
      color: "text-primary",
      count: "Personnel",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer"]
    },
    {
      title: "Port Registry",
      description: "Terminal and port facility management.",
      icon: MapPin,
      link: "/admin/ports",
      color: "text-blue-500",
      count: "Terminals",
      roles: ["SuperAdmin"]
    },
    {
      title: "Route Management",
      description: "Establish shipping routes and demographics.",
      icon: Waypoints,
      link: "/admin/routes",
      color: "text-accent",
      count: "Connections",
      roles: ["SuperAdmin", "Operations Manager"]
    },
    {
      title: "Fare Management",
      description: "Pricing rules, VAT, and discount tiers.",
      icon: Banknote,
      link: "/admin/fares",
      color: "text-green-500",
      count: "Pricing",
      roles: ["SuperAdmin", "Finance/Accounting"]
    },
    {
      title: "Fleet & Maintenance",
      description: "Vessel registry and maintenance logs.",
      icon: Wrench,
      link: "/admin/fleet",
      color: "text-orange-500",
      count: "Vessels",
      roles: ["SuperAdmin", "Operations Manager"]
    },
    {
      title: "Trip Schedules",
      description: "Daily and special peak-season timetables.",
      icon: CalendarDays,
      link: "/admin/schedules",
      color: "text-primary",
      count: "Timetables",
      roles: ["SuperAdmin", "Operations Manager", "Port Officer"]
    }
  ];

  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Restricted");
  const visibleModules = managementModules.filter(m => m.roles.includes(currentRole));

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <main className="flex-1 flex flex-col gap-8 p-6 container mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
             <h1 className="text-2xl font-black font-headline text-primary uppercase tracking-tight">Terminal Command</h1>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                <ShieldCheck className="h-3 w-3 text-green-500" /> Authorized Role: <span className="text-primary">{currentRole}</span>
             </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="System Online" />
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-bold font-headline">Operational Modules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module, i) => (
              <Link href={module.link} key={`module-${i}`}>
                <Card className="h-full border-none shadow-sm bg-white hover:ring-2 hover:ring-accent/50 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-5">
                     <module.icon className="h-24 w-24 -rotate-12 translate-x-8 translate-y-8" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className={`p-2 w-fit rounded-lg bg-secondary mb-2 group-hover:bg-accent group-hover:text-primary transition-colors`}>
                      <module.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg font-bold">{module.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {module.count}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-accent group-hover:gap-2 transition-all">
                      Open <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="pb-12">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden p-8 flex items-center rounded-3xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="h-48 w-48 -rotate-12 translate-x-12 translate-y-12" />
            </div>
            <div className="relative z-10 space-y-4 max-w-2xl">
              <h2 className="text-3xl font-black font-headline tracking-tight uppercase">Security Notice</h2>
              <p className="text-lg text-primary-foreground/80 leading-relaxed">
                Your administrative privileges are governed by your organizational hierarchy. Some modules may be restricted to ensure operational compliance and data privacy.
              </p>
              <div className="flex gap-4">
                <Link href="/admin/voyages">
                  <Button className="bg-accent text-primary font-bold hover:bg-accent/90 mt-4 rounded-xl px-8 h-12 shadow-lg">
                    Real-time Board
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
