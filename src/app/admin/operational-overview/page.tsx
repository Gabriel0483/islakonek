"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  MapPin, 
  Waypoints, 
  Ship, 
  ArrowLeft, 
  Loader2, 
  Activity, 
  Calendar, 
  AlertCircle, 
  Wrench, 
  CheckCircle2 
} from "lucide-react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin-nav";

export default function OperationalOverviewPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [todayPHT, setTodayPHT] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      
      const y = pht.getFullYear();
      const m = String(pht.getMonth() + 1).padStart(2, '0');
      const d = String(pht.getDate()).padStart(2, '0');
      setTodayPHT(`${y}-${m}-${d}`);
    };
    updateTime();
  }, []);

  const portsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "ports");
  }, [db]);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const { data: ports, isLoading: isPortsLoading } = useCollection(portsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);
  const { data: vessels, isLoading: isVesselsLoading } = useCollection(vesselsRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);

  const isLoading = isPortsLoading || isRoutesLoading || isVesselsLoading || isSchedulesLoading;

  const activeTripsCount = useMemo(() => {
    if (!schedules || !todayPHT) return 0;
    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    }).length;
  }, [schedules, todayPHT]);

  const maintenanceNeeded = useMemo(() => {
    return vessels?.filter(v => v.status === "Maintenance").length || 0;
  }, [vessels]);

  const statusTiles = [
    { 
      label: "Active Ports", 
      value: ports?.length || 0, 
      icon: MapPin, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10", 
      description: "Configured maritime terminals." 
    },
    { 
      label: "Routes Defined", 
      value: routes?.length || 0, 
      icon: Waypoints, 
      color: "text-accent", 
      bg: "bg-accent/10", 
      description: "Inter-island shipping connections." 
    },
    { 
      label: "Today's Trips", 
      value: activeTripsCount, 
      icon: Calendar, 
      color: "text-green-600", 
      bg: "bg-green-600/10", 
      description: "Active voyages scheduled for today." 
    },
    { 
      label: "Fleet Size", 
      value: vessels?.length || 0, 
      icon: Ship, 
      color: "text-primary", 
      bg: "bg-primary/10", 
      description: "Vessels in the operational registry." 
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary h-9">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Dashboard</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base sm:text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Overview
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        <section>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black font-headline text-primary uppercase tracking-tight">Operational Statistics</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">High-level summary of maritime infrastructure.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-dashed">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Aggregating Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {statusTiles.map((tile, i) => (
                <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:ring-2 hover:ring-primary/10 transition-all">
                  <CardHeader className="pb-2 p-4 sm:p-6">
                    <div className={`${tile.bg} ${tile.color} p-2 w-fit rounded-lg mb-2 group-hover:scale-110 transition-transform`}>
                      <tile.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-3xl sm:text-4xl font-black text-primary">
                      {isMounted ? tile.value : "--"}
                    </CardTitle>
                    <p className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-wider">{tile.label}</p>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed italic">
                      {tile.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-none shadow-sm bg-primary text-primary-foreground p-6 sm:p-8 flex flex-col justify-center gap-4">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">Live Sync</h3>
            <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
              Operational data is fetched in real-time from the cloud. Fleet statuses reflect current terminal activity.
            </p>
            <div className="flex items-center gap-2 mt-2 sm:mt-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full">
               <Calendar className="h-3 w-3" /> Sync: {isMounted ? new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--"}
            </div>
          </Card>

          <Card className="lg:col-span-1 border-none shadow-sm bg-white border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Operational Alerts
              </CardTitle>
              <CardDescription className="text-xs">System health and fleet notifications.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {maintenanceNeeded > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 border border-yellow-200">
                  <Wrench className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold text-xs sm:text-sm">{maintenanceNeeded} Vessel(s) in Maintenance</p>
                    <p className="text-[10px] sm:text-xs">Schedule review required.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground border rounded-xl border-dashed bg-secondary/10">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="font-bold text-primary text-xs sm:text-sm">Nominal Status</p>
                  <p className="text-[10px]">All vessels operational.</p>
                </div>
              )}
              
              <div className="pt-4 border-t space-y-2">
                 <div className="flex justify-between text-[10px] sm:text-xs font-medium">
                    <span className="text-muted-foreground">Gateway Status:</span>
                    <span className="text-green-600 flex items-center gap-1 font-black">
                      <CheckCircle2 className="h-3 w-3" /> ONLINE
                    </span>
                 </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-1 border-none shadow-sm p-6 sm:p-8 bg-white border">
            <h3 className="text-lg sm:text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Health Indicators
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">DB Latency</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[9px]">Optimal</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Gateways</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[9px]">Active</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Triggers</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[9px]">Healthy</Badge>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
