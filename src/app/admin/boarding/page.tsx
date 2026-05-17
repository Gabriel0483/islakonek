
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Ship, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Scan, 
  Ticket,
  ChevronRight,
  UserCheck,
  Calendar,
  RotateCcw,
  MapPin,
  ShieldCheck,
  Lock,
  Anchor,
  PlayCircle,
  AlertCircle,
  BarChart,
  ClipboardCheck,
  Info
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function BoardingPage() {
  const db = useFirestore();
  const [todayPHT, setTodayPHT] = useState("");
  const [currentTimePHT, setCurrentTimePHT] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("all");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      
      const y = pht.getFullYear();
      const m = String(pht.getMonth() + 1).padStart(2, '0');
      const d = String(pht.getDate()).padStart(2, '0');
      setTodayPHT(`${y}-${m}-${d}`);
      
      const hh = String(pht.getHours()).padStart(2, '0');
      const mm = String(pht.getMinutes()).padStart(2, '0');
      setCurrentTimePHT(`${hh}:${mm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "bookings");
  }, [db]);

  const voyagesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "voyages");
  }, [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: voyages } = useCollection(voyagesRef);

  const activeTodaySchedules = useMemo(() => {
    if (!schedules || !todayPHT) return [];
    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, todayPHT]);

  const todayRoutes = useMemo(() => {
    if (!routes || !activeTodaySchedules) return [];
    const routeIdsToday = new Set(activeTodaySchedules.map(s => s.routeId));
    return routes.filter(r => routeIdsToday.has(r.id));
  }, [routes, activeTodaySchedules]);

  const filteredSchedulesForDropdown = useMemo(() => {
    if (selectedRouteId === "all") return activeTodaySchedules;
    return activeTodaySchedules.filter(s => s.routeId === selectedRouteId);
  }, [activeTodaySchedules, selectedRouteId]);

  const currentVoyage = useMemo(() => {
    if (!voyages || selectedScheduleId === "all" || !todayPHT) return null;
    const voyageId = `${selectedScheduleId}_${todayPHT}`;
    return voyages.find(v => v.id === voyageId) || {
      id: voyageId,
      status: "Scheduled",
      compliance: {
        sanitationChecked: false,
        safetyGearChecked: false,
        stabilityConfirmed: false,
        headcountVerified: false,
        vesselClear: false,
        logbookFinalized: false
      }
    };
  }, [voyages, selectedScheduleId, todayPHT]);

  const filteredBookings = useMemo(() => {
    if (!bookings || !todayPHT) return [];
    
    return bookings.filter(b => {
      const matchesDate = b.travelDate === todayPHT;
      
      let matchesSchedule = false;
      if (selectedScheduleId !== "all") {
        matchesSchedule = b.scheduleId === selectedScheduleId;
      } else if (selectedRouteId !== "all") {
        matchesSchedule = b.routeId === selectedRouteId;
      } else {
        matchesSchedule = true;
      }

      const matchesStatus = b.status === "Confirmed" || b.status === "Used";
      const matchesSearch = 
        b.passengerName?.toLowerCase().includes(search.toLowerCase()) ||
        b.id?.toLowerCase().includes(search.toLowerCase());
      
      return matchesDate && matchesSchedule && matchesStatus && matchesSearch;
    }).sort((a: any, b: any) => {
      if (a.status === 'Used' && b.status !== 'Used') return -1;
      if (a.status !== 'Used' && b.status === 'Used') return 1;
      return a.passengerName.localeCompare(b.passengerName);
    });
  }, [bookings, todayPHT, selectedScheduleId, selectedRouteId, search]);

  const isPreBoardingOk = currentVoyage?.compliance?.sanitationChecked && currentVoyage?.compliance?.safetyGearChecked;
  const isPreDepartureOk = currentVoyage?.compliance?.headcountVerified && currentVoyage?.compliance?.stabilityConfirmed;
  const isPostArrivalOk = currentVoyage?.compliance?.vesselClear && currentVoyage?.compliance?.logbookFinalized;

  const handleUpdateCompliance = (field: string, value: boolean) => {
    if (!db || !currentVoyage) return;
    const voyageRef = doc(db, "voyages", currentVoyage.id);
    const updatedCompliance = { 
      ...(currentVoyage.compliance || {}), 
      [field]: value 
    };
    
    setDocumentNonBlocking(voyageRef, {
      id: currentVoyage.id,
      scheduleId: selectedScheduleId,
      travelDate: todayPHT,
      compliance: updatedCompliance,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const handleUpdateVoyageStatus = (newStatus: string) => {
    if (!db || !currentVoyage) return;
    const voyageRef = doc(db, "voyages", currentVoyage.id);
    updateDocumentNonBlocking(voyageRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleBoardPassenger = (bookingId: string) => {
    if (!db || !isPreBoardingOk) return;
    const bookingRef = doc(db, "bookings", bookingId);
    updateDocumentNonBlocking(bookingRef, {
      status: "Used",
      boardedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeboardPassenger = (bookingId: string) => {
    if (!db) return;
    const bookingRef = doc(db, "bookings", bookingId);
    updateDocumentNonBlocking(bookingRef, {
      status: "Confirmed",
      boardedAt: null,
      updatedAt: new Date().toISOString()
    });
  };

  const getTripInfo = (scheduleId: string) => {
    const s = schedules?.find(item => item.id === scheduleId);
    const r = routes?.find(item => item.id === s?.routeId);
    return {
      code: s?.tripCode || "N/A",
      route: r?.name || "Unknown Route",
      time: s?.departureTime || "--:--"
    };
  };

  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const boarded = filteredBookings.filter(b => b.status === "Used").length;
    return { total, boarded, pending: total - boarded };
  }, [filteredBookings]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Scan className="h-5 w-5 text-accent" />
            <span className="hidden sm:inline">Boarding Mode</span>
            <span className="sm:hidden">Boarding</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 sm:px-3 py-1.5 rounded-full">
            <Calendar className="h-3 w-3" /> {todayPHT}
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 sm:px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" /> {currentTimePHT}
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 border-none shadow-sm bg-white h-fit">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Manifest Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> 1. Select Route
                </label>
                <Select 
                  value={selectedRouteId} 
                  onValueChange={(val) => {
                    setSelectedRouteId(val);
                    setSelectedScheduleId("all");
                  }}
                >
                  <SelectTrigger className="w-full h-10 text-xs bg-secondary/20">
                    <SelectValue placeholder="All Active Routes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {todayRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Ship className="h-3 w-3" /> 2. Select Trip
                </label>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger className="w-full h-10 text-xs bg-secondary/20">
                    <SelectValue placeholder="All Active Trips" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Today's Trips</SelectItem>
                    {filteredSchedulesForDropdown.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.tripCode} - {s.departureTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            {/* COMPLIANCE CHECKLIST CONSOLE */}
            <TooltipProvider>
            {selectedScheduleId !== "all" && (
              <Card className="border-none shadow-md overflow-hidden bg-white animate-in slide-in-from-top-4 duration-500">
                <div className="bg-primary p-4 text-white flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-sm">Maritime Safety & Compliance</h3>
                        <p className="text-[10px] opacity-70">Regulatory protocols required to advance voyage state.</p>
                      </div>
                   </div>
                   <Badge className={cn("uppercase font-black text-[10px]", 
                      currentVoyage?.status === 'Departed' ? "bg-blue-500" :
                      currentVoyage?.status === 'Arrived' ? "bg-indigo-600" : "bg-accent text-primary")}>
                      {currentVoyage?.status || 'Scheduled'}
                   </Badge>
                </div>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* STAGE 1: PRE-BOARDING */}
                   <div className={cn("space-y-4 p-4 rounded-2xl border-2 transition-all", 
                      currentVoyage?.status === 'Scheduled' ? "border-accent bg-accent/5 ring-4 ring-accent/10" : "border-secondary opacity-50")}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="h-5 px-1.5 font-black bg-white">01</Badge>
                        <span className="text-[11px] font-black uppercase text-primary">Pre-Boarding</span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="sanitation" 
                                 checked={currentVoyage?.compliance?.sanitationChecked} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('sanitationChecked', !!checked)}
                                 disabled={currentVoyage?.status !== 'Scheduled'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="sanitation" className="text-xs font-black cursor-pointer uppercase">Deck Sanitation</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Passenger areas cleaned & disinfected.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Verification of cleaning logs per health standards.</TooltipContent></Tooltip>
                         </div>
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="safetygear" 
                                 checked={currentVoyage?.compliance?.safetyGearChecked} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('safetyGearChecked', !!checked)}
                                 disabled={currentVoyage?.status !== 'Scheduled'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="safetygear" className="text-xs font-black cursor-pointer uppercase">LSA/FFA Ready</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Life jackets & extinguishers inspected.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Verification that all life-saving appliances are accessible.</TooltipContent></Tooltip>
                         </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full h-9 font-black uppercase text-[10px] tracking-widest gap-2"
                        disabled={!isPreBoardingOk || currentVoyage?.status !== 'Scheduled'}
                        onClick={() => handleUpdateVoyageStatus('On-time')}
                      >
                         {currentVoyage?.status === 'Scheduled' ? <><PlayCircle className="h-4 w-4" /> Start Boarding</> : <><CheckCircle2 className="h-4 w-4" /> Boarding Active</>}
                      </Button>
                   </div>

                   {/* STAGE 2: PRE-DEPARTURE */}
                   <div className={cn("space-y-4 p-4 rounded-2xl border-2 transition-all", 
                      currentVoyage?.status === 'On-time' ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10" : "border-secondary opacity-50")}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="h-5 px-1.5 font-black bg-white">02</Badge>
                        <span className="text-[11px] font-black uppercase text-primary">Pre-Departure</span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="headcount" 
                                 checked={currentVoyage?.compliance?.headcountVerified} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('headcountVerified', !!checked)}
                                 disabled={currentVoyage?.status !== 'On-time'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="headcount" className="text-xs font-black cursor-pointer uppercase">Manifest Sync</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Physical headcount matches manifest.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Mandatory PCG regulation for vessel clearance.</TooltipContent></Tooltip>
                         </div>
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="stability" 
                                 checked={currentVoyage?.compliance?.stabilityConfirmed} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('stabilityConfirmed', !!checked)}
                                 disabled={currentVoyage?.status !== 'On-time'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="stability" className="text-xs font-black cursor-pointer uppercase">Stability / Trim</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Cargo/passenger balance confirmed.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Confirmation of safe draft and load distribution.</TooltipContent></Tooltip>
                         </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="w-full h-9 font-black uppercase text-[10px] tracking-widest gap-2 bg-blue-600 text-white hover:bg-blue-700"
                        disabled={!isPreDepartureOk || currentVoyage?.status !== 'On-time'}
                        onClick={() => handleUpdateVoyageStatus('Departed')}
                      >
                         {currentVoyage?.status === 'Departed' ? <><Anchor className="h-4 w-4" /> En Route</> : <><Anchor className="h-4 w-4" /> Finalize Dept.</>}
                      </Button>
                   </div>

                   {/* STAGE 3: POST-ARRIVAL */}
                   <div className={cn("space-y-4 p-4 rounded-2xl border-2 transition-all", 
                      currentVoyage?.status === 'Departed' ? "border-indigo-600 bg-indigo-50 ring-4 ring-indigo-600/10" : "border-secondary opacity-50")}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="h-5 px-1.5 font-black bg-white">03</Badge>
                        <span className="text-[11px] font-black uppercase text-primary">Post-Arrival</span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="vesselclear" 
                                 checked={currentVoyage?.compliance?.vesselClear} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('vesselClear', !!checked)}
                                 disabled={currentVoyage?.status !== 'Departed'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="vesselclear" className="text-xs font-black cursor-pointer uppercase">Interior Sweep</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Vessel checked for left-behind items.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Verification that all passengers have disembarked safely.</TooltipContent></Tooltip>
                         </div>
                         <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                               <Checkbox 
                                 id="logbook" 
                                 checked={currentVoyage?.compliance?.logbookFinalized} 
                                 onCheckedChange={(checked) => handleUpdateCompliance('logbookFinalized', !!checked)}
                                 disabled={currentVoyage?.status !== 'Departed'}
                               />
                               <div className="grid gap-0.5">
                                 <label htmlFor="logbook" className="text-xs font-black cursor-pointer uppercase">Log Completion</label>
                                 <p className="text-[9px] text-muted-foreground leading-tight">Voyage report finalized for registry.</p>
                               </div>
                            </div>
                            <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger><TooltipContent className="text-[10px]">Official Master's Log entry for technical/voyage records.</TooltipContent></Tooltip>
                         </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full h-9 font-black uppercase text-[10px] tracking-widest gap-2 bg-indigo-600 text-white"
                        disabled={!isPostArrivalOk || currentVoyage?.status !== 'Departed'}
                        onClick={() => handleUpdateVoyageStatus('Arrived')}
                      >
                         {currentVoyage?.status === 'Arrived' ? <><ClipboardCheck className="h-4 w-4" /> Report Filed</> : <><ClipboardCheck className="h-4 w-4" /> Close Voyage</>}
                      </Button>
                   </div>
                </CardContent>
              </Card>
            )}
            </TooltipProvider>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Total Manifest</p>
                  <p className="text-3xl sm:text-4xl font-black">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-green-600 text-white">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Boarded</p>
                  <p className="text-3xl sm:text-4xl font-black">{stats.boarded}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-accent text-primary">
                <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center h-full">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Remaining</p>
                  <p className="text-3xl sm:text-4xl font-black">{stats.pending}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="border-b bg-secondary/10 py-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg">Passenger Manifest</CardTitle>
                    <CardDescription className="text-xs">
                      Verify and board passengers for {selectedScheduleId === 'all' 
                        ? (selectedRouteId === 'all' ? "all current voyages" : todayRoutes.find(r => r.id === selectedRouteId)?.name)
                        : getTripInfo(selectedScheduleId).code}
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by name or ticket ID..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-white h-10 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 relative">
                {/* GLOBAL LOCK OVERLAY */}
                {selectedScheduleId !== "all" && !isPreBoardingOk && (
                  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                     <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-accent/20 flex flex-col items-center max-w-sm">
                        <div className="bg-accent/10 p-4 rounded-full mb-4">
                           <Lock className="h-10 w-10 text-primary" />
                        </div>
                        <h4 className="font-black uppercase tracking-tight text-primary text-lg mb-2">Operational Lock</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed text-center">
                           Passenger boarding is locked until **Sanitation** and **Safety Gear** protocols are verified and the **"Start Boarding"** signal is broadcast.
                        </p>
                     </div>
                  </div>
                )}

                {isSchedulesLoading || isBookingsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                ) : filteredBookings.length > 0 ? (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/30 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[80px]">Seq</TableHead>
                          <TableHead>Passenger</TableHead>
                          <TableHead className="hidden sm:table-cell">Trip Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.map((booking) => {
                          const trip = getTripInfo(booking.scheduleId);
                          const isBoarded = booking.status === "Used";
                          
                          return (
                            <TableRow key={booking.id} className={isBoarded ? "bg-green-50/50" : ""}>
                              <TableCell className="font-black text-primary/40 text-sm">
                                #{booking.boardingSequenceNumber || "--"}
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-primary text-sm">{booking.passengerName}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">ID: #{booking.id}</div>
                                <div className="sm:hidden mt-1 flex items-center gap-1">
                                  <Badge variant="outline" className="text-[8px] font-black uppercase text-accent border-accent/20 px-1 py-0 h-4">
                                    {trip.code}
                                  </Badge>
                                  <span className="text-[9px] font-bold">{trip.time}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] font-black uppercase text-accent border-accent/20">
                                    {trip.code}
                                  </Badge>
                                  <span className="text-xs font-bold">{trip.time}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                                  {trip.route}
                                </div>
                              </TableCell>
                              <TableCell>
                                {isBoarded ? (
                                  <Badge className="bg-green-600 text-white gap-1 py-0 px-1.5 h-5 text-[9px] sm:text-xs">
                                    <UserCheck className="h-2.5 w-2.5" /> Boarded
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 py-0 px-1.5 h-5 text-[9px] sm:text-xs">
                                    Confirmed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {!isBoarded ? (
                                  <Button 
                                    size="sm" 
                                    disabled={!isPreBoardingOk}
                                    onClick={() => handleBoardPassenger(booking.id)}
                                    className="bg-primary hover:bg-primary/90 text-white font-bold h-7 sm:h-8 px-2 sm:px-4 text-[10px] sm:text-sm"
                                  >
                                    Board <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeboardPassenger(booking.id)}
                                      className="h-7 sm:h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-bold text-destructive hover:text-destructive/10 uppercase"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" /> Deboard
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-32 opacity-30 flex flex-col items-center">
                    <Ticket className="h-16 w-16 mb-4" />
                    <p className="font-black uppercase tracking-widest text-sm sm:text-base">No passengers matching criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
