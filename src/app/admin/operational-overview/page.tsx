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
  Anchor,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Building2,
  ChevronRight,
  ArrowRight,
  Radio,
  Check
} from "lucide-react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin-nav";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

  const portsRef = useMemoFirebase(() => db ? collection(db, "ports") : null, [db]);
  const routesRef = useMemoFirebase(() => db ? collection(db, "routes") : null, [db]);
  const vesselsRef = useMemoFirebase(() => db ? collection(db, "vessels") : null, [db]);
  const schedulesRef = useMemoFirebase(() => db ? collection(db, "schedules") : null, [db]);
  const maintenanceRef = useMemoFirebase(() => db ? collection(db, "maintenance") : null, [db]);
  const voyagesRef = useMemoFirebase(() => db ? collection(db, "voyages") : null, [db]);

  const { data: ports, isLoading: isPortsLoading } = useCollection(portsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);
  const { data: vessels, isLoading: isVesselsLoading } = useCollection(vesselsRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: maintenance, isLoading: isMaintenanceLoading } = useCollection(maintenanceRef);
  const { data: voyages, isLoading: isVoyagesLoading } = useCollection(voyagesRef);

  const isLoading = isPortsLoading || isRoutesLoading || isVesselsLoading || isSchedulesLoading || isMaintenanceLoading || isVoyagesLoading;

  const todaySchedules = useMemo(() => {
    if (!schedules || !todayPHT) return [];
    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    });
  }, [schedules, todayPHT]);

  const unassignedVoyages = useMemo(() => {
    if (!todaySchedules || !todayPHT) return [];
    return todaySchedules.filter(s => {
      // A trip is unassigned if:
      // 1. It has no default vesselId in the schedule registry
      // 2. AND there is no override vesselId in the voyages collection for today
      const voyageId = `${s.id}_${todayPHT}`;
      const voyageStatus = voyages?.find(v => v.id === voyageId);
      
      return !s.vesselId && !voyageStatus?.vesselId;
    });
  }, [todaySchedules, voyages, todayPHT]);

  const operationalStats = useMemo(() => {
    const totalVessels = vessels?.length || 0;
    const operationalVessels = vessels?.filter(v => v.status === "Operational").length || 0;
    const maintenanceVessels = vessels?.filter(v => v.status === "Maintenance").length || 0;
    
    const unassignedCount = unassignedVoyages.length;
    const assignedCount = Math.max(0, todaySchedules.length - unassignedCount);

    const activeMaintenance = maintenance?.filter(m => m.status !== "Completed").length || 0;

    return {
      fleetHealth: totalVessels > 0 ? Math.round((operationalVessels / totalVessels) * 100) : 0,
      operationalVessels,
      maintenanceVessels,
      unassignedCount,
      assignedCount,
      activeMaintenance,
      totalTrips: todaySchedules.length
    };
  }, [vessels, todaySchedules, unassignedVoyages, maintenance]);

  const readinessScore = useMemo(() => {
    if (operationalStats.totalTrips === 0) return 100;
    return Math.round((operationalStats.assignedCount / operationalStats.totalTrips) * 100);
  }, [operationalStats]);

  const isSystemNominal = readinessScore === 100 && operationalStats.activeMaintenance === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary h-9 font-bold">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-lg font-black font-headline text-primary flex items-center gap-2 uppercase tracking-tight">
            <Activity className="h-5 w-5 text-accent" />
            Operational Overview
          </h1>
        </div>
        <div className="flex items-center gap-3">
           {isMounted && (
             <div className={cn(
               "px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all",
               isSystemNominal ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"
             )}>
                <div className={cn("h-2 w-2 rounded-full animate-pulse", isSystemNominal ? "bg-green-500" : "bg-orange-500")} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Status: {isSystemNominal ? "All Systems Nominal" : "Action Required"}
                </span>
             </div>
           )}
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        {/* KPI MATRIX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="border-none shadow-sm bg-white overflow-hidden group">
              <CardHeader className="p-4 pb-1">
                 <div className="flex justify-between items-start">
                    <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                      <Anchor className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-blue-200 text-blue-700">Infrastructure</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                 <p className="text-4xl font-black text-primary">{ports?.length || 0}</p>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Active Terminals</p>
                 <p className="text-[9px] text-muted-foreground mt-2 italic leading-relaxed">Verified maritime hubs in the Philippine network.</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white overflow-hidden group">
              <CardHeader className="p-4 pb-1">
                 <div className="flex justify-between items-start">
                    <div className="bg-accent/10 p-2 rounded-xl text-accent group-hover:scale-110 transition-transform">
                      <Waypoints className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-accent/20 text-primary">Connectivity</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                 <p className="text-4xl font-black text-primary">{routes?.length || 0}</p>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Established Lanes</p>
                 <p className="text-[9px] text-muted-foreground mt-2 italic leading-relaxed">Inter-island routes with active fare tables.</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white overflow-hidden group">
              <CardHeader className="p-4 pb-1">
                 <div className="flex justify-between items-start">
                    <div className="bg-green-500/10 p-2 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-green-200 text-green-700">Deployment</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                 <p className="text-4xl font-black text-primary">{operationalStats.totalTrips}</p>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Voyages Today</p>
                 <p className="text-[9px] text-muted-foreground mt-2 italic leading-relaxed">Scheduled rotations for {todayPHT}.</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white overflow-hidden group">
              <CardHeader className="p-4 pb-1">
                 <div className="flex justify-between items-start">
                    <div className="bg-orange-500/10 p-2 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                      <Ship className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-orange-200 text-orange-700">Assets</Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                 <p className="text-4xl font-black text-primary">{vessels?.length || 0}</p>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Fleet Registry</p>
                 <p className="text-[9px] text-muted-foreground mt-2 italic leading-relaxed">Total physical assets under management.</p>
              </CardContent>
           </Card>
        </div>

        {/* INTEGRITY & ALERT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* SERVICE INTEGRITY PANEL */}
           <Card className="lg:col-span-2 border-none shadow-sm bg-white p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 translate-x-12 translate-y-12">
                 <ShieldCheck className="h-64 w-64" />
              </div>
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-primary uppercase tracking-tight leading-none">Service Integrity</h3>
                       <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">Overall Operational Readiness Index</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fleet Availability</span>
                             <span className="text-2xl font-black text-primary">{operationalStats.fleetHealth}%</span>
                          </div>
                          <Progress value={operationalStats.fleetHealth} className="h-1.5 bg-secondary shadow-inner" />
                          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                             <span>{operationalStats.operationalVessels} Ready Ships</span>
                             <span>{operationalStats.maintenanceVessels} In Shop</span>
                          </div>
                       </div>
                       <Separator className="bg-secondary/50" />
                       <div className="space-y-2">
                          <div className="flex justify-between items-end">
                             <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assignment Readiness</span>
                             <span className={cn("text-2xl font-black", readinessScore === 100 ? "text-green-600" : "text-orange-600")}>
                                {readinessScore}%
                             </span>
                          </div>
                          <Progress value={readinessScore} className={cn("h-1.5 bg-secondary shadow-inner", readinessScore === 100 ? "[&>div]:bg-green-600" : "[&>div]:bg-orange-500")} />
                          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                             <span>{operationalStats.assignedCount} Trips Assigned</span>
                             <span className={cn(operationalStats.unassignedCount > 0 && "text-orange-600")}>{operationalStats.unassignedCount} Missing Vessel</span>
                          </div>
                       </div>
                    </div>

                    <div className="bg-secondary/10 rounded-3xl p-6 border-2 border-dashed border-secondary-foreground/10 space-y-4 flex flex-col justify-center">
                       <div className="flex items-start gap-4">
                          <div className="bg-white p-3 rounded-2xl shadow-sm text-accent">
                             <Zap className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                             <h4 className="font-black text-primary uppercase text-sm">System Capacity</h4>
                             <p className="text-[10px] text-muted-foreground leading-relaxed">
                                The integrity score reflects the operation's ability to fulfill the published schedule with ready-for-service assets.
                             </p>
                          </div>
                       </div>
                       <Link href="/admin/voyages" className="w-full">
                          <Button className="w-full h-12 bg-primary text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl hover:scale-[1.02] transition-transform">
                             Go to Voyage Control <ArrowRight className="h-4 w-4" />
                          </Button>
                       </Link>
                    </div>
                 </div>
              </div>
           </Card>

           {/* OPERATIONAL ALERTS PANEL */}
           <Card className="border-none shadow-sm bg-white overflow-hidden flex flex-col">
              <CardHeader className="bg-secondary/5 py-4 border-b flex flex-row items-center justify-between">
                 <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <AlertCircle className="h-4 w-4 text-destructive" /> Critical Disruptions
                 </CardTitle>
                 {isMounted && (operationalStats.unassignedCount > 0 || operationalStats.activeMaintenance > 0) && (
                   <div className="h-2 w-2 rounded-full bg-destructive animate-ping" />
                 )}
              </CardHeader>
              <CardContent className="flex-1 p-0">
                 <ScrollArea className="h-[340px]">
                    <div className="p-4 space-y-4">
                       {operationalStats.unassignedCount > 0 && (
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase text-orange-700 ml-1">Vessel Assignment Gaps ({operationalStats.unassignedCount})</Label>
                             <div className="space-y-2">
                                {unassignedVoyages.map(trip => (
                                   <div key={trip.id} className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex justify-between items-center group hover:bg-orange-100 transition-colors">
                                      <div className="flex items-center gap-3">
                                         <div className="bg-white p-1.5 rounded-lg border border-orange-200">
                                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                                         </div>
                                         <div>
                                            <p className="text-xs font-black text-primary uppercase">{trip.tripCode}</p>
                                            <p className="text-[8px] font-bold text-orange-800 uppercase">{trip.departureTime} • {routes?.find(r => r.id === trip.routeId)?.name}</p>
                                         </div>
                                      </div>
                                      <Link href="/admin/voyages">
                                         <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="h-4 w-4" />
                                         </Button>
                                      </Link>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}

                       {operationalStats.activeMaintenance > 0 && (
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase text-blue-700 ml-1">Asset Service Alert ({operationalStats.activeMaintenance})</Label>
                             <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-4">
                                <div className="bg-white p-2 rounded-xl shadow-sm">
                                   <Wrench className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                   <p className="text-xs font-black text-blue-800 uppercase">Fleet Offline</p>
                                   <p className="text-[10px] text-blue-700 leading-relaxed mt-1 font-medium">
                                      {operationalStats.activeMaintenance} vessel(s) are undergoing technical inspection or repair. 
                                   </p>
                                   <Link href="/admin/fleet">
                                      <Button variant="link" className="p-0 h-auto text-[9px] font-black uppercase text-blue-800 underline mt-2">Check Log</Button>
                                   </Link>
                                </div>
                             </div>
                          </div>
                       )}

                       {isSystemNominal && (
                          <div className="py-20 text-center opacity-30 flex flex-col items-center">
                             <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero Critical Hazards</p>
                             <p className="text-[10px] font-bold">Systems currently operating at peak capacity.</p>
                          </div>
                       )}
                    </div>
                 </ScrollArea>
              </CardContent>
           </Card>
        </div>

        {/* INFRASTRUCTURE NODES BOARD */}
        <section className="space-y-4">
           <div className="flex items-center justify-between border-b-2 border-secondary pb-3">
              <h2 className="text-sm font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-accent" /> Terminal Connectivity Audit
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Live Port Registry Hierarchy</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ports?.map(port => {
                const connections = routes?.filter(r => r.originPortId === port.id || r.destinationPortId === port.id).length || 0;
                return (
                  <Card key={port.id} className="border-none shadow-sm bg-white overflow-hidden hover:ring-2 hover:ring-primary/5 transition-all">
                    <CardHeader className="p-4 border-b bg-secondary/5">
                       <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary/60">{port.code || 'TBA'}</Badge>
                          {port.status === 'Operational' ? (
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-200" title="Online" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-destructive shadow-sm shadow-destructive/20" title="Suspended" />
                          )}
                       </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                       <div>
                          <p className="text-sm font-black text-primary uppercase truncate">{port.name}</p>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase mt-1">
                             <MapPin className="h-2.5 w-2.5" /> {port.province}
                          </div>
                       </div>
                       <div className="flex items-center gap-4 pt-1">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black uppercase text-muted-foreground">Density</span>
                             <span className="text-lg font-black text-accent">{connections} <span className="text-[8px] opacity-40">LANES</span></span>
                          </div>
                          <div className="h-8 w-px bg-secondary" />
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black uppercase text-muted-foreground">Condition</span>
                             <span className="text-[10px] font-black text-primary uppercase">{port.status}</span>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                );
              })}
           </div>
        </section>
      </main>

      <footer className="mt-12 py-12 bg-primary text-primary-foreground relative overflow-hidden">
         <div className="absolute top-0 left-0 p-8 opacity-5">
            <Radio className="h-64 w-64 animate-pulse" />
         </div>
         <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl space-y-6">
               <h3 className="text-3xl font-black uppercase tracking-tight">System Sustainability</h3>
               <p className="text-primary-foreground/70 leading-relaxed text-sm">
                  Operational Overview synchronizes real-time database state across terminals and vessels. All recorded gaps are broadcasted to the **Dispatcher Control** and **Voyage Status** boards to ensure total organizational transparency.
               </p>
               <div className="flex flex-wrap gap-6 pt-4">
                  <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2 rounded-xl"><Check className="h-5 w-5 text-accent" /></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Protocol Audit: 100%</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2 rounded-xl"><Check className="h-5 w-5 text-accent" /></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Gateway Node: Online</span>
                  </div>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
