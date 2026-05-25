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
  ArrowRight,
  ChevronRight,
  Filter,
  Activity,
  AlertTriangle,
  Zap,
  Check,
  Tag
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type VoyageStatusValue = "Scheduled" | "On-time" | "Delayed" | "Departed" | "Arrived" | "Cancelled";

export default function VoyageManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("all");

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({
    status: "On-time" as VoyageStatusValue,
    vesselId: "",
    remarks: "",
    actualDeparture: "",
    actualArrival: ""
  });

  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      const y = pht.getFullYear();
      const m = String(pht.getMonth() + 1).padStart(2, '0');
      const d = String(pht.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
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
    if (!schedules || !selectedDate) return [];

    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(selectedDate)) return true;
      return false;
    }).filter(s => {
      if (selectedRouteId !== "all" && s.routeId !== selectedRouteId) return false;
      if (search && !s.tripCode.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).map(s => {
      const voyageId = `${s.id}_${selectedDate}`;
      const statusData = voyageStatuses?.find(v => v.id === voyageId);
      const route = routes?.find(r => r.id === s.routeId);
      
      const assignedVesselId = statusData?.vesselId || s.vesselId;
      const assignedVessel = vessels?.find(v => v.id === assignedVesselId);
      
      return {
        ...s,
        voyageId,
        route,
        assignedVessel,
        status: statusData?.status || "Scheduled",
        remarks: statusData?.remarks || "",
        actualDeparture: statusData?.actualDeparture || "",
        actualArrival: statusData?.actualArrival || "",
        currentVesselId: statusData?.vesselId || "",
        bookedCount: statusData?.bookedCount || 0,
        waitlistCount: statusData?.waitlistCount || 0
      };
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, selectedDate, selectedRouteId, search, voyageStatuses, routes, vessels]);

  const stats = useMemo(() => {
    return activeVoyages.reduce((acc, v) => {
      acc.total++;
      if (v.status === 'On-time') acc.onTime++;
      if (v.status === 'Delayed') acc.delayed++;
      if (v.status === 'Departed') acc.enRoute++;
      if (v.status === 'Arrived') acc.completed++;
      return acc;
    }, { total: 0, onTime: 0, delayed: 0, enRoute: 0, completed: 0 });
  }, [activeVoyages]);

  const handleOpenUpdate = (voyage: any) => {
    setSelectedVoyage(voyage);
    setStatusForm({
      status: (voyage.status as VoyageStatusValue) || "Scheduled",
      vesselId: voyage.currentVesselId || voyage.vesselId || "",
      remarks: voyage.remarks || "",
      actualDeparture: voyage.actualDeparture || "",
      actualArrival: voyage.actualArrival || ""
    });
    setIsUpdateDialogOpen(true);
  };

  const handleSaveStatus = () => {
    if (!db || !selectedVoyage) return;

    const voyageRef = doc(db, "voyages", selectedVoyage.voyageId);
    setDocumentNonBlocking(voyageRef, {
      id: selectedVoyage.voyageId,
      scheduleId: selectedVoyage.id,
      travelDate: selectedDate,
      ...statusForm,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setIsUpdateDialogOpen(false);
    toast({ title: "Broadcast Successful", description: `Status for ${selectedVoyage.tripCode} updated to ${statusForm.status}.` });
  };

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
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
           <Radio className="h-5 w-5 text-accent animate-pulse" />
           <h1 className="text-lg font-black font-headline text-primary uppercase tracking-tight">Voyage Control</h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-secondary/50 px-4 py-1.5 rounded-full border flex items-center gap-2">
             <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
             <Input 
               type="date" 
               value={selectedDate} 
               onChange={(e) => setSelectedDate(e.target.value)}
               className="w-36 h-6 p-0 border-none bg-transparent font-black uppercase text-[10px] focus-visible:ring-0"
             />
           </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        {/* DISPATCH ANALYTICS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-secondary/50 space-y-1">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Today's Fleet</p>
              <p className="text-2xl font-black text-primary">{stats.total} <span className="text-[10px] opacity-40">TRIPS</span></p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-green-600/10 space-y-1">
              <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Nominal</p>
              <p className="text-2xl font-black text-green-700">{stats.onTime}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-orange-500/10 space-y-1">
              <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Delayed</p>
              <p className="text-2xl font-black text-orange-700">{stats.delayed}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-blue-600/10 space-y-1">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">En Route</p>
              <p className="text-2xl font-black text-blue-700">{stats.enRoute}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-indigo-600/10 space-y-1 hidden md:block">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Completed</p>
              <p className="text-2xl font-black text-indigo-700">{stats.completed}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
             <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b bg-secondary/5">
                   <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                     <Filter className="h-3 w-3" /> Dashboard Filters
                   </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                   <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Lane Filter</Label>
                      <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                         <SelectTrigger className="bg-secondary/20 h-10 border-none font-bold text-xs">
                            <SelectValue placeholder="All Active Routes" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="all">All Active Routes</SelectItem>
                            {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Rapid Trip Lookup</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="e.g. ML-101" 
                          value={search} 
                          onChange={(e) => setSearch(e.target.value)}
                          className="bg-secondary/20 h-10 border-none text-xs pl-9 font-black"
                        />
                      </div>
                   </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="h-24 w-24" /></div>
                <div className="space-y-4 relative z-10">
                   <h3 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
                     <Activity className="h-4 w-4 text-accent" /> Control Gateway
                   </h3>
                   <p className="text-[11px] opacity-70 leading-relaxed">
                     Update voyage stages to maintain public trust. Status broadcasts are instantly reflected on the **Live Trip Status** board and traveler itineraries.
                   </p>
                   <div className="pt-2">
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[9px] uppercase font-black px-3 py-1">
                        Cloud Sync: Active
                      </Badge>
                   </div>
                </div>
             </Card>
          </div>

          <div className="md:col-span-3">
             {isSchedulesLoading ? (
               <div className="flex flex-col items-center justify-center py-32 opacity-30">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p className="font-bold uppercase text-xs tracking-widest">Accessing Timetables...</p>
               </div>
             ) : activeVoyages.length > 0 ? (
               <div className="space-y-4">
                  {activeVoyages.map((voyage) => (
                    <Card key={voyage.voyageId} className={cn("border-none shadow-sm transition-all group overflow-hidden bg-white", voyage.status === 'Cancelled' && "opacity-60")}>
                       <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                             <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                                <div className="space-y-1 sm:w-28 shrink-0 text-center sm:text-left">
                                   <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                                      <Tag className="h-3 w-3 text-accent" />
                                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">{voyage.tripCode}</span>
                                   </div>
                                   <p className="text-3xl font-black text-primary tracking-tighter">{voyage.departureTime}</p>
                                   <p className="text-[9px] font-bold text-muted-foreground uppercase">Scheduled</p>
                                </div>
                                
                                <div className="space-y-4 flex-1 min-w-0">
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-3 text-sm font-black text-primary uppercase tracking-tight">
                                         <span>{voyage.route?.name?.split(' - ')[0]}</span>
                                         <ArrowRight className="h-4 w-4 text-accent" />
                                         <span className="truncate">{voyage.route?.name?.split(' - ')[1]}</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                         <div className={cn("flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md", voyage.currentVesselId ? "bg-accent/10 text-primary border border-accent/20" : "bg-secondary/50 text-primary/60")}>
                                            <Ship className="h-3.5 w-3.5" /> {voyage.assignedVessel?.name || "No vessel set"}
                                            {voyage.currentVesselId && <Zap className="h-2.5 w-2.5 text-accent animate-pulse ml-1" />}
                                         </div>
                                         <div className="flex items-center gap-4 border-l pl-4">
                                            <div className="flex flex-col">
                                               <span className="text-[8px] font-black uppercase text-muted-foreground">Booked</span>
                                               <span className="text-sm font-black text-primary">{voyage.bookedCount}</span>
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="text-[8px] font-black uppercase text-muted-foreground">Waitlist</span>
                                               <span className="text-sm font-black text-orange-600">{voyage.waitlistCount}</span>
                                            </div>
                                         </div>
                                      </div>
                                   </div>

                                   <div className="flex flex-wrap items-center gap-3">
                                      <Badge className={cn("gap-1.5 py-1 px-3 uppercase font-black text-[10px] shadow-sm", getStatusColor(voyage.status))}>
                                         {getStatusIcon(voyage.status)} {voyage.status}
                                      </Badge>
                                      {voyage.actualDeparture && (
                                         <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
                                            <Clock className="h-3 w-3" /> ATD: {voyage.actualDeparture}
                                         </div>
                                      )}
                                   </div>
                                </div>
                             </div>
                             <div className="bg-secondary/10 px-5 py-4 lg:px-8 lg:py-0 flex items-center justify-end gap-3 lg:border-l">
                                <Button 
                                  onClick={() => handleOpenUpdate(voyage)}
                                  className="h-11 px-8 font-black text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/10 group"
                                >
                                   Broadcast <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                             </div>
                          </div>
                          {voyage.remarks && (
                             <div className="bg-orange-50/80 px-5 py-2.5 border-t border-orange-100 flex items-start gap-3">
                                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-orange-800 italic leading-relaxed">
                                   Dispatcher Note: {voyage.remarks}
                                </p>
                             </div>
                          )}
                       </CardContent>
                    </Card>
                  ))}
               </div>
             ) : (
               <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-secondary/5 opacity-50 flex flex-col items-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold text-primary uppercase tracking-tight">Zero Rotations Scheduled</h3>
                  <p className="text-sm mt-2 max-w-xs mx-auto">No active voyages matched your filters for {selectedDate}. Adjust parameters to view past or future trips.</p>
               </div>
             )}
          </div>
        </div>
      </main>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[550px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh] rounded-3xl">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl shadow-inner">
                   <Radio className="h-7 w-7 text-accent" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">Broadcast Status</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mt-2">
                     Trip {selectedVoyage?.tripCode} • {selectedDate}
                   </DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-10 pb-10">
               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                     <Activity className="h-4 w-4 text-accent" /> 1. Current Voyage Condition
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {["Scheduled", "On-time", "Delayed", "Departed", "Arrived", "Cancelled"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusForm({...statusForm, status: s as VoyageStatusValue})}
                          className={cn(
                            "h-12 px-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 relative",
                            statusForm.status === s 
                              ? "border-primary bg-primary/5 text-primary ring-4 ring-primary/10 shadow-sm" 
                              : "border-secondary bg-white text-muted-foreground hover:border-primary/20"
                          )}
                        >
                           {s}
                           {statusForm.status === s && <Check className="h-3 w-3 absolute top-1 right-1" />}
                        </button>
                     ))}
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                     <Ship className="h-4 w-4 text-accent" /> 2. Vessel Deployment
                  </Label>
                  <div className="bg-secondary/10 p-5 rounded-2xl border-2 border-dashed border-secondary/50 space-y-1.5">
                     <Label className="text-[9px] font-bold uppercase text-muted-foreground">Deployment Override</Label>
                     <Select 
                       value={statusForm.vesselId} 
                       onValueChange={(val) => setStatusForm({...statusForm, vesselId: val})}
                     >
                       <SelectTrigger className="bg-white border-2 h-11 font-black">
                         <SelectValue placeholder="Assign a vessel" />
                       </SelectTrigger>
                       <SelectContent>
                         {vessels?.filter(v => v.status === 'Operational' || v.id === selectedVoyage?.vesselId).map(v => (
                           <SelectItem key={v.id} value={v.id} className="font-bold">
                             {v.name} {v.id === selectedVoyage?.vesselId ? "(Default Assignment)" : ""}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     <p className="text-[9px] text-muted-foreground italic pt-1">
                        Use this to swap ships if the default vessel is unavailable or undergooing repair.
                     </p>
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                     <Timer className="h-4 w-4 text-accent" /> 3. Performance Metrics
                  </Label>
                  <div className="grid grid-cols-2 gap-6 bg-secondary/5 p-5 rounded-2xl border">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Actual Departure</Label>
                        <Input 
                          type="time" 
                          value={statusForm.actualDeparture} 
                          onChange={(e) => setStatusForm({...statusForm, actualDeparture: e.target.value})} 
                          className="h-10 font-bold bg-white"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Actual Arrival</Label>
                        <Input 
                          type="time" 
                          value={statusForm.actualArrival} 
                          onChange={(e) => setStatusForm({...statusForm, actualArrival: e.target.value})} 
                          className="h-10 font-bold bg-white"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-2.5">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Dispatcher Remarks</Label>
                  <Textarea 
                    placeholder="Provide context for delays or special instructions for travelers..." 
                    value={statusForm.remarks}
                    onChange={(e) => setStatusForm({...statusForm, remarks: e.target.value})}
                    className="min-h-[120px] text-sm p-4 rounded-2xl border-2 focus-visible:ring-primary leading-relaxed"
                  />
                  <div className="flex items-start gap-2 pt-2 text-[9px] text-muted-foreground font-medium bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                     <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                     Remarks are pushed as high-visibility alerts on the traveler dashboard. Ensure information is concise.
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t gap-3 shrink-0 bg-secondary/10">
             <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} className="flex-1 h-14 font-bold rounded-2xl border-2">Discard Changes</Button>
             <Button 
                onClick={handleSaveStatus} 
                className="flex-1 bg-primary text-white font-black uppercase text-xs h-14 rounded-2xl shadow-xl tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
               Broadcast Updates
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
