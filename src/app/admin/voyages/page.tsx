
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Radio, 
  Search, 
  Loader2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Ship, 
  ChevronRight, 
  Info, 
  Timer, 
  XCircle, 
  PlayCircle, 
  Anchor, 
  Filter,
  RefreshCw,
  Activity
} from "lucide-react";
import { collection, doc, query, where, getDocs, runTransaction } from "firebase/firestore";
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
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Radio className="h-5 w-5 text-accent animate-pulse" />
          Voyage Control
        </h1>
        <div className="flex items-center gap-3">
           <Label className="hidden sm:block text-[10px] font-black uppercase text-muted-foreground">Select Day</Label>
           <Input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)}
             className="w-40 h-10 bg-secondary/10 border-none font-bold"
           />
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 space-y-4">
             <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-3 border-b">
                   <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                     <Filter className="h-3 w-3" /> Dashboard Filters
                   </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Route</Label>
                      <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                         <SelectTrigger className="bg-secondary/20 h-10 border-none">
                            <SelectValue placeholder="All Routes" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="all">All Routes</SelectItem>
                            {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Search Code</Label>
                      <Input 
                        placeholder="e.g. ML-101" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-secondary/20 h-10 border-none"
                      />
                   </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-sm bg-primary text-primary-foreground p-5">
                <div className="space-y-3">
                   <h3 className="font-black uppercase tracking-tight text-sm flex items-center gap-2">
                     <Ship className="h-4 w-4" /> Voyage Dispatch
                   </h3>
                   <p className="text-[10px] opacity-70 leading-relaxed">
                     Update trip progress to keep passengers informed. Broadcasted statuses are reflected in real-time on the public Live Status board.
                   </p>
                </div>
             </Card>
          </div>

          <div className="md:col-span-3">
             {isSchedulesLoading ? (
               <div className="flex flex-col items-center justify-center py-32 opacity-30">
                  <Loader2 className="h-10 w-10 animate-spin mb-4" />
                  <p className="font-bold uppercase text-xs">Accessing Timetables...</p>
               </div>
             ) : activeVoyages.length > 0 ? (
               <div className="space-y-3">
                  {activeVoyages.map((voyage) => (
                    <Card key={voyage.voyageId} className="border-none shadow-sm bg-white hover:ring-1 hover:ring-accent/30 transition-all group overflow-hidden">
                       <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                             <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                                <div className="space-y-1 sm:w-24 shrink-0">
                                   <p className="text-[10px] font-black text-accent uppercase tracking-widest">{voyage.tripCode}</p>
                                   <p className="text-xl font-black text-primary">{voyage.departureTime}</p>
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                   <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground truncate">
                                      {voyage.route?.name}
                                   </div>
                                   <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                                      <Badge className={cn("gap-1.5 py-1 px-3 uppercase font-black text-[10px]", getStatusColor(voyage.status))}>
                                         {getStatusIcon(voyage.status)} {voyage.status}
                                      </Badge>
                                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/60 bg-secondary/50 px-2 py-0.5 rounded-md">
                                         <Ship className="h-3 w-3" /> {voyage.assignedVessel?.name || "No vessel set"}
                                      </div>
                                      <div className="flex items-center gap-3 ml-2 border-l pl-3">
                                         <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-muted-foreground">Booked</span>
                                            <span className="text-xs font-black text-primary">{voyage.bookedCount}</span>
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-muted-foreground">Wait</span>
                                            <span className="text-xs font-black text-orange-600">{voyage.waitlistCount}</span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             <div className="bg-secondary/10 px-4 py-3 lg:px-6 lg:py-0 flex items-center justify-end gap-2 lg:border-l">
                                <Button 
                                  onClick={() => handleOpenUpdate(voyage)}
                                  className="h-10 px-6 font-bold text-xs uppercase tracking-wider bg-white border border-primary/10 text-primary hover:bg-primary hover:text-white"
                                >
                                   Broadcast <ChevronRight className="h-3.5 w-3.5 ml-2" />
                                </Button>
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                  ))}
               </div>
             ) : (
               <div className="text-center py-32 border-2 border-dashed rounded-2xl bg-secondary/5 opacity-50 flex flex-col items-center">
                  <Calendar className="h-16 w-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold">No Voyages Scheduled</h3>
                  <p className="text-sm">No active trips found for the selected filters on this date.</p>
               </div>
             )}
          </div>
        </div>
      </main>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[95vh]">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                   <Radio className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <DialogTitle className="text-lg">Update Voyage Status</DialogTitle>
                   <DialogDescription className="text-xs">Trip {selectedVoyage?.tripCode} • {selectedDate}</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Current Condition</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {["Scheduled", "On-time", "Delayed", "Departed", "Arrived", "Cancelled"].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusForm({...statusForm, status: s as VoyageStatusValue})}
                          className={cn(
                            "h-10 px-2 rounded-lg text-[10px] font-black uppercase transition-all border-2",
                            statusForm.status === s 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-secondary bg-white text-muted-foreground hover:border-primary/20"
                          )}
                        >
                           {s}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Vessel Assignment</Label>
                  <Select 
                    value={statusForm.vesselId} 
                    onValueChange={(val) => setStatusForm({...statusForm, vesselId: val})}
                  >
                    <SelectTrigger className="bg-white border-2">
                      <SelectValue placeholder="Assign a vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels?.filter(v => v.status === 'Operational' || v.id === selectedVoyage?.vesselId).map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} {v.id === selectedVoyage?.vesselId ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic">Overwrites schedule default for this trip instance.</p>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Operator Remarks</Label>
                  <Textarea 
                    placeholder="e.g. Delayed due to vessel cleaning or high tide..." 
                    value={statusForm.remarks}
                    onChange={(e) => setStatusForm({...statusForm, remarks: e.target.value})}
                    className="min-h-[100px] text-sm"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-bold uppercase text-muted-foreground">Actual Dept.</Label>
                     <Input 
                       type="time" 
                       value={statusForm.actualDeparture} 
                       onChange={(e) => setStatusForm({...statusForm, actualDeparture: e.target.value})} 
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-bold uppercase text-muted-foreground">Actual Arrv.</Label>
                     <Input 
                       type="time" 
                       value={statusForm.actualArrival} 
                       onChange={(e) => setStatusForm({...statusForm, actualArrival: e.target.value})} 
                     />
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t gap-2 shrink-0 bg-secondary/5">
             <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} className="flex-1 h-11">Cancel</Button>
             <Button onClick={handleSaveStatus} className="flex-1 bg-primary text-white font-bold uppercase text-xs tracking-wider h-11">
               Broadcast Status
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
