
"use client";

import Link from "next/link";
import { 
  Ship, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Waypoints, 
  Banknote, 
  Wrench, 
  CalendarDays,
  ArrowRight,
  LayoutGrid,
  Ticket,
  ClipboardList
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useUser();

  const portsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "ports");
  }, [db, user]);

  const routesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "routes");
  }, [db, user]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "vessels");
  }, [db, user]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "schedules");
  }, [db, user]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "bookings");
  }, [db, user]);

  const { data: ports } = useCollection(portsRef);
  const { data: routes } = useCollection(routesRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: schedules } = useCollection(schedulesRef);
  const { data: bookings } = useCollection(bookingsRef);

  const stats = [
    { label: "Active Ports", value: ports?.length || 0, icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Routes Defined", value: routes?.length || 0, icon: Waypoints, color: "text-accent", bg: "bg-accent/10" },
    { label: "Bookings Today", value: bookings?.length || 0, icon: Ticket, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Fleet Size", value: vessels?.length || 0, icon: Ship, color: "text-primary", bg: "bg-primary/10" }
  ];

  const managementModules = [
    {
      title: "Desk Bookings",
      description: "Counter ticket sales and instant passenger check-in.",
      icon: Ticket,
      link: "/admin/bookings",
      color: "text-green-600",
      count: "Issue New"
    },
    {
      title: "Manage Bookings",
      description: "Full manifest review, reservation confirmation, and cancellations.",
      icon: ClipboardList,
      link: "/admin/manage-bookings",
      color: "text-indigo-600",
      count: bookings?.length || 0
    },
    {
      title: "Port Registry",
      description: "Manage maritime terminals and port facilities across the islands.",
      icon: MapPin,
      link: "/admin/ports",
      color: "text-blue-500",
      count: ports?.length || 0
    },
    {
      title: "Route Management",
      description: "Establish shipping routes connecting ports with specific demographics.",
      icon: Waypoints,
      link: "/admin/routes",
      color: "text-accent",
      count: routes?.length || 0
    },
    {
      title: "Fare Management",
      description: "Configure pricing rules, VAT status, and discount tiers for segments.",
      icon: Banknote,
      link: "/admin/fares",
      color: "text-green-500",
      count: "Pricing Active"
    },
    {
      title: "Fleet & Maintenance",
      description: "Registry for your maritime vessels and maintenance scheduling logs.",
      icon: Wrench,
      link: "/admin/fleet",
      color: "text-orange-500",
      count: vessels?.length || 0
    },
    {
      title: "Trip Schedules",
      description: "Coordinate daily and special peak-season trips for active routes.",
      icon: CalendarDays,
      link: "/admin/schedules",
      color: "text-primary",
      count: schedules?.length || 0
    }
  ];

  const maintenanceNeeded = vessels?.filter(v => v.status === "Maintenance").length || 0;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary">Admin Dashboard</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-8 p-6">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm bg-white group transition-all hover:shadow-md">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`${stat.bg} ${stat.color} p-3 rounded-xl transition-transform group-hover:scale-110`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-black text-primary">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-bold font-headline">Operations Hub</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {managementModules.map((module, i) => (
                <Link href={module.link} key={i}>
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
                        {typeof module.count === 'number' ? `${module.count} records` : module.count}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-accent group-hover:gap-2 transition-all">
                        Configure <ArrowRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden p-8">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Ship className="h-48 w-48 -rotate-12 translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10 space-y-4 max-w-2xl">
                <h2 className="text-3xl font-black font-headline tracking-tight">Welcome, Administrator</h2>
                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  Your maritime data is synchronized and secure. Use the hub above to manage your island connections.
                </p>
              </div>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Fleet Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {maintenanceNeeded > 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 text-yellow-700 border border-yellow-200">
                    <Wrench className="h-5 w-5" />
                    <div>
                      <p className="font-bold text-sm">{maintenanceNeeded} Vessel(s) in Maintenance</p>
                      <p className="text-xs">Service schedule required.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border rounded-xl border-dashed bg-secondary/10">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                    <p className="font-bold text-primary text-sm">Nominal Status</p>
                    <p className="text-[10px]">All vessels operational.</p>
                  </div>
                )}
                
                <div className="pt-4 border-t space-y-2">
                   <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Sync State:</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Real-time Active
                      </span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
