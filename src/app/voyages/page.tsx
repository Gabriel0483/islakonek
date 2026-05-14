
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Radio, 
  Search, 
  Loader2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Info,
  Timer,
  XCircle,
  PlayCircle,
  Anchor,
  Ship,
  MapPin,
  ArrowRight
} from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PublicVoyageStatusPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [todayPHT, setTodayPHT] = useState("");
  const [search, setSearch] = useState("");

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

  const schedulesRef = useMemoFirebase(() => db ? collection(db, "schedules") : null, [db]);
  const routesRef = useMemoFirebase(() => db ? collection(db, "routes") : null, [db]);
  const voyagesRef = useMemoFirebase(() => db ? collection(db, "voyages") : null, [db]);
  const vesselsRef = useMemoFirebase(() => db ? collection(db, "vessels") : null, [db]);

  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: routes } = useCollection(routesRef);
  const { data: voyageStatuses } = useCollection(voyagesRef);
  const { data: vessels } = useCollection(vesselsRef);

  const activeVoyages = useMemo(() => {
    if (!schedules || !todayPHT) return [];

    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    }).map(s => {
      const voyageId = `${s.id}_${todayPHT}`;
      const statusData = voyageStatuses?.find(v => v.id === voyageId);
      const route = routes?.find(r => r.id === s.routeId);
      
      const assignedVesselId = statusData?.vesselId || s.vesselId;
      const assignedVessel = vessels?.find(v => v.id === assignedVesselId);
      
      return {
        ...s,
        route,
        assignedVessel,
        status: statusData?.status || "Scheduled",
        remarks: statusData?.remarks || "",
        actualDeparture: statusData?.actualDeparture || ""
      };
    }).filter(v => 
      !search || 
      v.tripCode.toLowerCase().includes(search.toLowerCase()) ||
      v.route?.name?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, todayPHT, voyageStatuses, routes, search, vessels]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On-time': return 'bg-green-600 text-white';
      case 'Delayed': return 'bg-orange-500 text-white';
      case 'Departed': return 'bg-blue-600 text-white';
      case 'Arrived': return 'bg-indigo-600 text-white';
      case 'Cancelled': return 'bg-destructive text-white';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On-time': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'Delayed': return <Timer className="h-3.5 w-3.5" />;
      case 'Departed': return <PlayCircle className="h-3.5 w-3.5" />;
      case 'Arrived': return <Anchor className="h-3.5 w-3.5" />;
      case 'Cancelled': return <XCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Radio className="h-5 w-5 text-accent animate-pulse" />
               <h1 className="text-3xl font-black font-headline text-primary uppercase tracking-tight">Live Trip Status</h1>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Real-time board for {todayPHT || "..."}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search trip code or route..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm h-11"
            />
          </div>
        </header>

        {isSchedulesLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Syncing Live Board...</p>
          </div>
        ) : activeVoyages.length > 0 ? (
          <div className="grid gap-4">
            {activeVoyages.map((voyage) => (
              <Card key={voyage.id} className="border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-5 sm:w-32 bg-secondary/10 flex flex-col justify-center items-center text-center shrink-0 border-b sm:border-b-0 sm:border-r">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-1">{voyage.tripCode}</p>
                      <p className="text-2xl font-black text-primary">{voyage.departureTime}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Scheduled</p>
                    </div>
                    
                    <div className="p-5 flex-1 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                           <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-tight">
                              <span>{voyage.route?.name?.split(' - ')[0]}</span>
                              <ArrowRight className="h-3 w-3 text-accent" />
                              <span className="truncate">{voyage.route?.name?.split(' - ')[1]}</span>
                           </div>
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Ship className="h-3 w-3" /> {voyage.assignedVessel?.name || "TBA"}
                           </div>
                        </div>
                        
                        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                          <Badge className={cn("gap-1.5 py-1 px-3 uppercase font-black text-[10px]", getStatusColor(voyage.status))}>
                             {getStatusIcon(voyage.status)} {voyage.status}
                          </Badge>
                          {voyage.actualDeparture && (
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">
                              Actual: <span className="text-primary">{voyage.actualDeparture}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {voyage.remarks && (
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                          <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-800 italic leading-relaxed">{voyage.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-white opacity-50 flex flex-col items-center">
            <Radio className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-primary uppercase">No Active Voyages</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
              There are no voyages scheduled for broadcast at this moment. Please check back during operational hours.
            </p>
          </div>
        )}

        <footer className="pt-8 pb-12">
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex items-start gap-4">
             <div className="bg-white p-2 rounded-xl shadow-sm">
                <Radio className="h-5 w-5 text-accent" />
             </div>
             <div className="space-y-1">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Automatic Refresh</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This board updates in real-time. Status changes broadcast from the terminal command center are reflected here instantly.
                </p>
             </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
