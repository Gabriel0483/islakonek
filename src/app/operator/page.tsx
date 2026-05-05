
"use client";

import { Ship, LayoutDashboard, AlertCircle, CheckCircle2, MapPin, Waypoints, Banknote } from "lucide-react";
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

  const { data: ports } = useCollection(portsRef);
  const { data: routes } = useCollection(routesRef);
  const { data: fares } = useCollection(faresRef);

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
      label: "Configured Fares",
      value: fares?.length || 0,
      icon: Banknote,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      label: "Vessels",
      value: 0,
      icon: Ship,
      color: "text-primary",
      bg: "bg-primary/10"
    }
  ];

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

          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden p-8">
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
                  Your maritime data is synchronized and secure. All ports, routes, and fare rules are persisted in Firestore and accessible across your organization.
                </p>
              </div>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  System Health & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border rounded-xl border-dashed bg-secondary/20">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                  <p className="font-bold text-primary">All Systems Nominal</p>
                  <p className="text-xs">Database connection active. Auth services operational.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
