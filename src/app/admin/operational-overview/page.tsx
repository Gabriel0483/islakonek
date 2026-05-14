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
  CheckCircle2,
  AlertTriangle,
  Zap,
  Anchor
} from "lucide-react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin-nav";
import { Progress } from "@/components/ui/progress";

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

  const maintenanceRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "maintenance");
  }, [db]);

  const { data: ports, isLoading: isPortsLoading } = useCollection(portsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);
  const { data: vessels, isLoading: isVesselsLoading } = useCollection(vesselsRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: maintenance, isLoading: isMaintenanceLoading } = useCollection(maintenanceRef);

  const isLoading = isPortsLoading || isRoutesLoading || isVesselsLoading || isSchedulesLoading || isMaintenanceLoading;

  const todaySchedules = useMemo(() => {
    if (!schedules || !todayPHT) return [];
    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    });
  }, [schedules, todayPHT]);

  const operationalStats = useMemo(() => {
    const totalVessels = vessels?.length || 0;
    const operationalVessels = vessels?.filter(v => v.status === "Operational").length || 0;
    const maintenanceVessels = vessels?.filter(v => v.status === "Maintenance").length || 0;
    
    const unassignedTrips = todaySchedules.filter(s => !s.vesselId).length;
    const assignedTrips = todaySchedules.length - unassignedTrips;

    const activeMaintenance = maintenance?.filter(m => m.status !== "Completed").length || 0;

    return {
      fleetHealth: totalVessels > 0 ? Math.round((operationalVessels / totalVessels) * 100) : 0,
      operationalVessels,
      maintenanceVessels,
      unassignedTrips,
      assignedTrips,
      activeMaintenance,
      totalTrips: todaySchedules.length
    };
  }, [vessels, todaySchedules, maintenance]);

  const statusTiles = [
    { 
      label: "Active Ports", 
      value: ports?.length || 0, 
      icon: Anchor, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10", 
      description: "Available maritime terminals." 
    },
    { 
      label: "Routes Defined", 
      value: routes?.length || 0, 
      icon: Waypoints, 
      color: "text-accent", 
      bg: "bg-accent/10", 
      description: "Established shipping lanes." 
    },
    { 
      label: "Today's Voyages", 
      value: operationalStats.totalTrips, 
      icon: Calendar, 
      color: "text-green-600", 
      bg: "bg-green-600/10", 
      description: "Active trips in rotation today." 
    },
    { 
      label: "Fleet Size", 
      value: vessels?.length || 0, 
      icon: Ship, 
      color: "text-primary", 
      bg: "bg-primary/10", 
      description: "Total vessels in the registry." 
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary h-9">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base sm:text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Operational Overview
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        <section>
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-black font-headline text-primary uppercase tracking-tight">System Infrastructure</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Real-time status of your maritime assets and routes.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-dashed">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Collecting System Stats...</p>
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
          <Card className="lg:col-span-1 border-none shadow-sm bg-white border flex flex-col">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Fleet Health & Health
              </CardTitle>
              <CardDescription className="text-xs">Overall fleet readiness and availability.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Operational Rate</span>
                  <span className="text-2xl font-black text-primary">{operationalStats.fleetHealth}%</span>
                </div>
                <Progress value={operationalStats.fleetHealth} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <p className="text-[9px] uppercase font-bold text-green-600">Available</p>
                    <p className="text-xl font-black text-green-700">{operationalStats.operationalVessels}</p>
                 </div>
                 <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                    <p className="text-[9px] uppercase font-bold text-yellow-600">In Service/Off</p>
                    <p className="text-xl font-black text-yellow-700">{operationalStats.maintenanceVessels}</p>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 border-none shadow-sm bg-white border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Operational Alerts
              </CardTitle>
              <CardDescription className="text-xs">System alerts and pending maintenance.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
              {operationalStats.activeMaintenance > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 border border-yellow-200">
                  <Wrench className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold text-xs sm:text-sm">{operationalStats.activeMaintenance} Maintenance Records</p>
                    <p className="text-[10px] sm:text-xs">Active or upcoming repairs.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground border rounded-xl border-dashed bg-secondary/10">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="font-bold text-primary text-xs sm:text-sm">Nominal Status</p>
                  <p className="text-[10px]">No critical vessel alerts found.</p>
                </div>
              )}

              {operationalStats.unassignedTrips > 0 && (
                 <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                   <AlertTriangle className="h-5 w-5 shrink-0" />
                   <div>
                     <p className="font-bold text-xs sm:text-sm">{operationalStats.unassignedTrips} Unassigned Trips</p>
                     <p className="text-[10px] sm:text-xs">Trips today missing vessels.</p>
                   </div>
                 </div>
              )}
              
              <div className="pt-4 border-t space-y-2">
                 <div className="flex justify-between text-[10px] sm:text-xs font-medium">
                    <span className="text-muted-foreground">Cloud Sync Gateway:</span>
                    <span className="text-green-600 flex items-center gap-1 font-black">
                      <CheckCircle2 className="h-3 w-3" /> ONLINE
                    </span>
                 </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-1 border-none shadow-sm p-6 bg-primary text-primary-foreground relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="h-48 w-48 -rotate-12 translate-x-12 translate-y-12" />
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">Assignment Readiness</h3>
              <div className="space-y-1">
                <p className="text-sm opacity-80 leading-relaxed">
                  Percentage of today's active schedule that has a vessel assigned and confirmed.
                </p>
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                     <span>Readiness</span>
                     <span>{operationalStats.totalTrips > 0 ? Math.round((operationalStats.assignedTrips / operationalStats.totalTrips) * 100) : 0}%</span>
                  </div>
                  <Progress value={operationalStats.totalTrips > 0 ? (operationalStats.assignedTrips / operationalStats.totalTrips) * 100 : 0} className="h-2 bg-white/20" />
                </div>
              </div>
              <Link href="/admin/schedules">
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 h-8 text-[10px] font-bold uppercase">
                  Audit Schedules
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
