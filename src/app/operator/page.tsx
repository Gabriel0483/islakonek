
"use client";

import { Ship, LayoutDashboard, AlertCircle, CheckCircle2, MapPin, Waypoints, Banknote, Wrench, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function OperatorDashboard() {
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

  const faresRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "fares");
  }, [db, user]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "vessels");
  }, [db, user]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "schedules");
  }, [db, user]);

  const { data: ports } = useCollection(portsRef);
  const { data: routes } = useCollection(routesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: schedules } = useCollection(schedulesRef);

  const stats = [
    {
      label: "Active Ports",
      value: ports?.length || 0,
      icon: MapPin,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      label: "Routes Defined",
      value: routes?.length || 0,
      icon: Waypoints,
      color: "text-accent",
      bg: "bg-accent/10"
    },
    {
      label: "Trip Schedules",
      value: schedules?.length || 0,
      icon: CalendarDays,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      label: "Fleet Size",
      value: vessels?.length || 0,
      icon: Ship,
      color: "text-primary",
      bg: "bg-primary/10"
    }
  ];

  const maintenanceNeeded = vessels?.filter(v => v.status === "Maintenance").length || 0;

  return (
    <SidebarProvider>
      <OperatorSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary">Dashboard Overview</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden p-8">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Ship className="h-48 w-48 -rotate-12 translate-x-12 translate-y-12" />
              </div>
              <div className="relative z-10 space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <LayoutDashboard className="h-4 w-4" />
                  Fleet Operations Console
                </div>
                <h2 className="text-3xl font-black font-headline tracking-tight">Welcome to Isla Konek Ops</h2>
                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  Your maritime data is synchronized and secure. Manage your vessels, ports, routes, and schedules from a unified interface.
                </p>
              </div>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Operational Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {maintenanceNeeded > 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 text-yellow-700 border border-yellow-200">
                    <Wrench className="h-5 w-5" />
                    <div>
                      <p className="font-bold text-sm">{maintenanceNeeded} Vessel(s) in Maintenance</p>
                      <p className="text-xs">Schedule updates required in Fleet module.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border rounded-xl border-dashed bg-secondary/20">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                    <p className="font-bold text-primary text-sm">Fleet Status: Nominal</p>
                    <p className="text-[10px]">All registered vessels are operational.</p>
                  </div>
                )}
                
                <div className="pt-4 border-t space-y-2">
                   <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Database Sync:</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                   </div>
                   <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Auth Token:</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
