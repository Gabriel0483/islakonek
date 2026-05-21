"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Ship, 
  Search, 
  Clock, 
  Users, 
  ChevronRight,
  Loader2,
  Ticket,
  User,
  Phone,
  Banknote,
  Tag,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Mail,
  Heart,
  Plus,
  Trash2,
  ChevronLeft,
  Check,
  Timer,
  Anchor,
  PlayCircle,
  XCircle,
  Radio,
  BarChart,
  UserPlus,
  MapPin,
  MapPinned,
  Zap,
  Flame,
  ArrowRight
} from "lucide-react";
import { collection, doc, query, where, runTransaction, increment } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { Navbar as MainNavbar } from "@/components/navbar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PassengerForm {
  passengerName: string;
  passengerDob: string;
  passengerEmail: string;
  passengerContact: string;
  emergencyContact: string;
  fareId: string;
}

function TripsContent() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [phtState, setPhtState] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    setIsMounted(true);

    const getPHT = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      
      const y = pht.getFullYear();
      const m = String(pht.getMonth() + 1).padStart(2, '0');
      const d = String(pht.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      
      const hh = String(pht.getHours()).padStart(2, '0');
      const mm = String(pht.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;

      return { date: dateStr, time: timeStr };
    };

    setPhtState(getPHT());
  }, []);

  const searchDate = searchParams.get("date");
  const targetDate = useMemo(() => searchDate || phtState?.date, [searchDate, phtState?.date]);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(profileRef);

  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);
  const faresRef = useMemoFirebase(() => collection(db!, "fares"), [db]);
  const vesselsRef = useMemoFirebase(() => collection(db!, "vessels"), [db]);
  const portsRef = useMemoFirebase(() => collection(db!, "ports"), [db]);
  const voyagesRef = useMemoFirebase(() => collection(db!, "voyages"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: ports } = useCollection(portsRef);
  const { data: voyageStatuses } = useCollection(voyagesRef);

  const [searchQuery, setSearchQuery] = useState("");
  const selectedOriginPort = searchParams.get("originPortId") || "all";

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); 
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
  const [passengers, setPassengers] = useState<PassengerForm[]>([{
    passengerName: "",
    passengerDob: "",
    passengerEmail: user?.email || "",
    passengerContact: "",
    emergencyContact: "",
    fareId: ""
  }]);

  useEffect(() => {
    if (user?.email && passengers.length === 1 && !passengers[0].passengerEmail) {
      setPassengers([{ ...passengers[0], passengerEmail: user.email }]);
    }
  }, [user, passengers.length]);

  const filteredTrips = useMemo(() => {
    if (!schedules || !routes || !isMounted || !phtState || !targetDate) return [];

    return schedules.filter(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      
      if (!schedule.isActive) return false;

      if (searchDate) {
        if (schedule.type === 'Special') {
          if (!schedule.specialDates?.includes(searchDate)) return false;
        }
        if (searchDate === phtState.date) {
          if (schedule.departureTime < phtState.time) return false;
        }
      }

      if (selectedOriginPort !== "all" && route?.originPortId !== selectedOriginPort) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesCode = schedule.tripCode?.toLowerCase().includes(query);
        if (!matchesCode) return false;
      }

      return true;
    }).map(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      const voyageId = `${schedule.id}_${targetDate}`;
      const voyageInfo = voyageStatuses?.find(v => v.id === voyageId);
      
      const assignedVesselId = voyageInfo?.vesselId || schedule.vesselId;
      const vessel = vessels?.find(v => v.id === assignedVesselId);
      
      const usedSeats = voyageInfo?.bookedCount || 0;
      const waitlistedCount = voyageInfo?.waitlistCount || 0;
      const capacity = schedule.passengerCapacity || vessel?.passengerCapacity || 0;
      const waitlistLimit = schedule.waitlistLimit || 0;

      const originPort = ports?.find(p => p.id === route?.originPortId);
      const destPort = ports?.find(p => p.id === route?.destinationPortId);

      return {
        ...schedule,
        route,
        vessel,
        originPort,
        destPort,
        voyageInfo,
        capacity,
        usedSeats,
        availability: Math.max(0, capacity - usedSeats),
        waitlistUsed: waitlistedCount,
        waitlistLimit,
        waitlistSpotsRemaining: Math.max(0, waitlistLimit - waitlistedCount),
        isWaitlistOnly: usedSeats >= capacity && waitlistedCount < waitlistLimit,
        isFull: usedSeats >= capacity && waitlistedCount >= waitlistLimit,
        fillPercentage: capacity > 0 ? Math.min(100, (usedSeats / capacity) * 100) : 0,
        isHighDemand: capacity > 0 && Math.max(0, capacity - usedSeats) < 10 && Math.max(0, capacity - usedSeats) > 0
      };
    });
  }, [schedules, routes, vessels, ports, voyageStatuses, searchQuery, selectedOriginPort, searchDate, isMounted, phtState, targetDate]);

  const handleBookNow = (schedule: any) => {
    setSelectedSchedule(schedule);
    setBookingStep(1);
    setIsBookingOpen(true);
  };

  const addPassenger = () => {
    setPassengers([...passengers, {
      passengerName: "",
      passengerDob: "",
      passengerEmail: "",
      passengerContact: "",
      emergencyContact: "",
      fareId: ""
    }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length === 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleApplyMe = (index: number) => {
    if (!profile) return;
    const updated = [...passengers];
    updated[index] = {
      ...updated[index],
      passengerName: profile.displayName || "",
      passengerEmail: profile.email || "",
      passengerContact: profile.phoneNumber || ""
    };
    setPassengers(updated);
  };

  const handleApplyFamily = (familyMember: any) => {
    const emptyIndex = passengers.findIndex(p => !p.passengerName);
    if (emptyIndex !== -1) {
      const updated = [...passengers];
      updated[emptyIndex] = {
        ...updated[emptyIndex],
        passengerName: familyMember.fullName,
        passengerDob: familyMember.birthDate,
        emergencyContact: familyMember.emergencyContact
      };
      setPassengers(updated);
    } else {
      setPassengers([...passengers, {
        passengerName: familyMember.fullName,
        passengerDob: familyMember.birthDate,
        passengerEmail: "",
        passengerContact: "",
        emergencyContact: familyMember.emergencyContact,
        fareId: ""
      }]);
    }
  };

  const handleProcessBooking = async () => {
    if (!db || !selectedSchedule || !targetDate) return;
    setIsReserving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const voyageId = `${selectedSchedule.id}_${targetDate}`;
        const voyageRef = doc(db, "voyages", voyageId);
        const voyageSnap = await transaction.get(voyageRef);
        
        const capacity = selectedSchedule.capacity;
        const waitlistLimit = selectedSchedule.waitlistLimit;
        const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;
        const currentWaitlisted = voyageSnap.exists() ? (voyageSnap.data().waitlistCount || 0) : 0;

        let status: 'Reserved' | 'Waitlisted';
        if (currentBooked + passengers.length <= capacity) {
          status = 'Reserved';
        } else if (currentWaitlisted + passengers.length <= waitlistLimit) {
          status = 'Waitlisted';
        } else {
          throw new Error("This trip is fully booked including waitlist.");
        }

        if (!voyageSnap.exists()) {
          transaction.set(voyageRef, {
            id: voyageId,
            scheduleId: selectedSchedule.id,
            travelDate: targetDate,
            status: "Scheduled",
            bookedCount: status === 'Waitlisted' ? 0 : passengers.length,
            waitlistCount: status === 'Waitlisted' ? passengers.length : 0,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.update(voyageRef, {
            bookedCount: status === 'Waitlisted' ? increment(0) : increment(passengers.length),
            waitlistCount: status === 'Waitlisted' ? increment(passengers.length) : increment(0),
            updatedAt: new Date().toISOString()
          });
        }

        passengers.forEach((p) => {
          const selectedFare = fares?.find(f => f.id === p.fareId);
          const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
          const bookingRef = doc(collection(db, "bookings"), newId);
          
          transaction.set(bookingRef, {
            id: newId,
            userId: user?.uid || null,
            scheduleId: selectedSchedule.id,
            routeId: selectedSchedule.routeId,
            travelDate: targetDate,
            passengerName: p.passengerName,
            passengerDob: p.passengerDob,
            passengerEmail: p.passengerEmail,
            passengerContact: p.passengerContact,
            emergencyContact: p.emergencyContact,
            fareId: p.fareId,
            segmentLabel: selectedFare?.segmentLabel || "",
            finalFare: selectedFare?.finalFare || 0,
            status: status,
            bookingSource: "Public",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
      });

      setIsBookingOpen(false);
      setBookingStep(1);
      setPassengers([{ passengerName: "", passengerDob: "", passengerEmail: user?.email || "", passengerContact: "", emergencyContact: "", fareId: "" }]);
      alert(selectedSchedule.isWaitlistOnly ? "Waitlist request submitted successfully!" : `Successfully processed ${passengers.length} reservation request(s)!`);
    } catch (e: any) {
      alert("Booking failed: " + e.message);
    } finally {
      setIsReserving(false);
    }
  };

  const availableFares = fares?.filter(f => f.routeId === selectedSchedule?.routeId);
  const totalGroupFare = passengers.reduce((sum, p) => {
    const fare = fares?.find(f => f.id === p.fareId);
    return sum + (fare?.finalFare || 0);
  }, 0);

  const isDetailsValid = passengers.every(p => p.passengerName && p.fareId && p.passengerDob && p.emergencyContact && p.passengerContact && p.passengerEmail);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On-time': return <Badge className="bg-green-600 text-white gap-1 text-[9px] h-5"><CheckCircle2 className="h-3 w-3" /> On-time</Badge>;
      case 'Delayed': return <Badge className="bg-orange-500 text-white gap-1 text-[9px] h-5"><Timer className="h-3 w-3" /> Delayed</Badge>;
      case 'Departed': return <Badge className="bg-blue-600 text-white gap-1 text-[9px] h-5"><PlayCircle className="h-3 w-3" /> Departed</Badge>;
      case 'Arrived': return <Badge className="bg-indigo-600 text-white gap-1 text-[9px] h-5"><Anchor className="h-3 w-3" /> Arrived</Badge>;
      case 'Cancelled': return <Badge className="bg-destructive text-white gap-1 text-[9px] h-5"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <MainNavbar />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary mb-1 sm:mb-2 uppercase tracking-tight">Available Trips</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Voyages for <span className="text-primary font-bold">{targetDate}</span> 
            {selectedOriginPort !== 'all' && <> from <span className="text-primary font-bold truncate inline-block max-w-[150px] align-bottom">{ports?.find(p => p.id === selectedOriginPort)?.name}</span></>}
          </p>
        </header>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search trip ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 sm:h-12 bg-white border-none shadow-sm text-sm" 
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground py-2 border-b uppercase font-bold tracking-wider">
            <p>Displaying <span className="text-primary font-black">{filteredTrips.length}</span> Active Trips</p>
          </div>

          <div className="space-y-4">
            {isSchedulesLoading || !phtState ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Scanning Horizons...</p>
              </div>
            ) : filteredTrips.length > 0 ? filteredTrips.map((trip) => (
              <Card 
                key={trip.id} 
                className={cn(
                  "group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white cursor-pointer",
                  (trip.isFull || trip.voyageInfo?.status === 'Cancelled' || trip.voyageInfo?.status === 'Arrived') && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => {
                   if (trip.isFull || trip.voyageInfo?.status === 'Cancelled' || trip.voyageInfo?.status === 'Arrived') return;
                   handleBookNow(trip);
                }}
              >
                {trip.isHighDemand && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-pulse z-10" />
                )}
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent border-accent/20 bg-accent/5">
                            {trip.vessel?.type === 'RoRo' ? 'RoRo (Vehicles OK)' : trip.vessel?.type === 'FastCraft' ? 'FastCraft (Express)' : trip.vessel?.type || "Standard"}
                          </Badge>
                          {trip.voyageInfo?.status && getStatusBadge(trip.voyageInfo.status)}
                          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-primary/50 uppercase">
                             <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {trip.tripCode}
                          </div>
                        </div>
                        
                        <div className="text-right">
                           {trip.isFull ? (
                             <Badge variant="destructive" className="text-[9px] font-black uppercase">Voyage Full</Badge>
                           ) : trip.isWaitlistOnly ? (
                             <Badge className="bg-orange-500 text-white text-[9px] font-black uppercase">Waitlist Open</Badge>
                           ) : trip.isHighDemand ? (
                             <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-black text-[9px] uppercase animate-pulse">
                               <Flame className="h-3 w-3 mr-1" /> High Demand
                             </Badge>
                           ) : (
                             <Badge className="bg-green-600 text-white text-[9px] font-black uppercase">Seats Available</Badge>
                           )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 sm:gap-8">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1">
                             <MapPin className="h-3 w-3" /> Origin Port
                          </div>
                          <div className="text-base sm:text-xl font-black text-primary truncate uppercase tracking-tight">
                            {trip.originPort?.name}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{trip.originPort?.cityMunicipality}, {trip.originPort?.province}</p>
                          <div className="text-sm sm:text-lg font-bold flex items-center gap-1.5 text-accent pt-1">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {trip.departureTime}
                          </div>
                        </div>
                        
                        <div className="space-y-1 md:text-right">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-1 md:justify-end">
                             Arrival Port <MapPinned className="h-3 w-3" />
                          </div>
                          <div className="text-base sm:text-xl font-black text-primary truncate uppercase tracking-tight">
                            {trip.destPort?.name}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{trip.destPort?.cityMunicipality}, {trip.destPort?.province}</p>
                          {trip.arrivalTime && (
                            <div className="text-sm sm:text-lg font-bold flex items-center gap-1.5 text-accent md:justify-end pt-1">
                              <span className="text-[10px] font-black uppercase mr-1">ETA</span> {trip.arrivalTime}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                           <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-muted-foreground uppercase">
                              <BarChart className="h-3 w-3" /> Current Inventory
                           </div>
                           <div className="text-[10px] sm:text-xs font-black text-primary">
                             {trip.isWaitlistOnly 
                               ? `${trip.waitlistSpotsRemaining} Waitlist spots left` 
                               : trip.availability === 0 ? "No active seats" : `${trip.availability} Seats remaining`}
                           </div>
                        </div>
                        <Progress value={trip.fillPercentage} className={cn("h-1.5 bg-secondary", trip.isHighDemand && "[&>div]:bg-orange-500")} />
                        {trip.isWaitlistOnly && (
                           <p className="text-[9px] font-bold text-orange-600 uppercase flex items-center gap-1">
                             <Info className="h-2.5 w-2.5" /> FCFS Promotion Likelihood: {trip.waitlistUsed < 5 ? "High" : "Moderate"}
                           </p>
                        )}
                      </div>

                      <div className="pt-3 flex flex-wrap items-center justify-between gap-4 sm:gap-6 text-[11px] sm:text-xs text-muted-foreground border-t border-dashed">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Ship className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/40" />
                            <span className="font-bold text-primary/70">{trip.vessel?.name || "TBA"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/40" />
                            <span className="font-bold uppercase tracking-tight">
                              {trip.capacity} Seats
                            </span>
                          </div>
                        </div>
                        {trip.voyageInfo?.remarks && (
                           <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold italic bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                             <Radio className="h-2.5 w-2.5" /> {trip.voyageInfo.remarks}
                           </div>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col justify-center">
                       <div className="bg-primary/5 p-4 rounded-full group-hover:bg-accent transition-colors shadow-sm">
                          <ChevronRight className="h-6 w-6 text-primary" />
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold">No voyages matching criteria</h3>
                <p className="text-sm text-muted-foreground">Adjust your route or date filters to see more results.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[750px] p-0 overflow-hidden h-[95vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b bg-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-black font-headline text-primary uppercase tracking-tight">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-accent" /> {selectedSchedule?.isWaitlistOnly ? 'Waitlist Registration' : 'Voyage Reservation'}
              </DialogTitle>
            </div>
            
            {/* STICKY TRIP INFO IN DIALOG */}
            <div className="bg-primary/5 p-3 rounded-xl border-2 border-dashed flex justify-between items-center mb-4">
               <div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Selected Voyage</p>
                  <p className="text-xs font-black text-primary uppercase">{selectedSchedule?.tripCode} • {selectedSchedule?.route?.name}</p>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Time</p>
                  <p className="text-xs font-black text-accent">{selectedSchedule?.departureTime}</p>
               </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className={cn("h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors", 
                  bookingStep >= 1 ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>1</div>
                <span className={cn("text-[10px] sm:text-xs font-bold uppercase", bookingStep >= 1 ? "text-primary" : "text-muted-foreground")}>Details</span>
              </div>
              <Separator className="w-6 sm:w-12 h-px bg-border shrink-0" />
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className={cn("h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors", 
                  bookingStep >= 2 ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>2</div>
                <span className={cn("text-[10px] sm:text-xs font-bold uppercase", bookingStep >= 2 ? "text-primary" : "text-muted-foreground")}>Summary</span>
              </div>
              <Separator className="w-6 sm:w-12 h-px bg-border shrink-0" />
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 opacity-50">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold bg-secondary text-muted-foreground">3</div>
                <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">Done</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-4 sm:p-6 pb-32">
              {bookingStep === 1 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  {selectedSchedule?.isWaitlistOnly && (
                    <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-black text-orange-800 uppercase">Waitlist Open</p>
                        <p className="text-[10px] sm:text-xs text-orange-700 leading-relaxed">
                          Primary capacity has been reached. You are joining the queue for <span className="font-bold">{selectedSchedule.waitlistSpotsRemaining} remaining</span> waitlist slots. **No immediate payment required.**
                        </p>
                      </div>
                    </div>
                  )}

                  {profile && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Profile Shortcuts</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 gap-2 border-accent/20 bg-accent/5 text-primary font-bold text-xs"
                          onClick={() => handleApplyMe(0)}
                        >
                          <User className="h-3.5 w-3.5" /> Just Me
                        </Button>
                        {profile.familyMembers?.map((member: any) => (
                          <Button 
                            key={member.id}
                            variant="outline" 
                            size="sm" 
                            className="h-9 gap-2 border-primary/20 bg-primary/5 text-primary font-bold text-xs"
                            onClick={() => handleApplyFamily(member)}
                          >
                            <UserPlus className="h-3.5 w-3.5" /> {member.fullName.split(' ')[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                       <Label className="flex items-center gap-2 font-black text-primary uppercase text-base sm:text-lg tracking-tight">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> Passenger Details ({passengers.length})
                      </Label>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                      {passengers.map((p, index) => (
                        <div key={index} className="relative bg-secondary/5 rounded-2xl border-2 border-dashed p-4 sm:p-6 pt-10 group hover:border-accent/40 transition-colors">
                          <div className="absolute -top-4 left-4 sm:left-6 bg-white border-2 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-widest z-10 shadow-sm">
                            Passenger #{index + 1}
                          </div>
                          
                          <div className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Full Legal Name</Label>
                                <Input 
                                  value={p.passengerName} 
                                  onChange={(e) => updatePassenger(index, 'passengerName', e.target.value)}
                                  placeholder="As shown in ID"
                                  className="bg-white h-11 text-sm shadow-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Date of Birth</Label>
                                <Input 
                                  type="date"
                                  value={p.passengerDob} 
                                  onChange={(e) => updatePassenger(index, 'passengerDob', e.target.value)}
                                  className="bg-white h-11 text-sm shadow-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mobile Number</Label>
                                <Input 
                                  value={p.passengerContact} 
                                  onChange={(e) => updatePassenger(index, 'passengerContact', e.target.value)}
                                  placeholder="09XXXXXXXXX"
                                  className="bg-white h-11 text-sm shadow-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                  <Heart className="h-2.5 w-2.5 text-destructive" /> Emergency Mobile
                                </Label>
                                <Input 
                                  value={p.emergencyContact} 
                                  onChange={(e) => updatePassenger(index, 'emergencyContact', e.target.value)}
                                  placeholder="Contact for emergency"
                                  className="bg-white h-11 text-sm shadow-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Email Address</Label>
                                <Input 
                                  type="email"
                                  value={p.passengerEmail} 
                                  onChange={(e) => updatePassenger(index, 'passengerEmail', e.target.value)}
                                  placeholder="itinerary@example.com"
                                  className="bg-white h-11 text-sm shadow-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Fare Tier</Label>
                                <Select value={p.fareId} onValueChange={(val) => updatePassenger(index, 'fareId', val)}>
                                  <SelectTrigger className="bg-white h-11 border-2 text-sm shadow-sm">
                                    <SelectValue placeholder="Choose Demographic" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableFares?.map(f => (
                                      <SelectItem key={f.id} value={f.id}>{f.segmentLabel} - ₱{f.finalFare}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          {passengers.length > 1 && (
                            <div className="flex justify-end pt-4 mt-4 border-t border-dashed">
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:bg-red-50 font-bold text-[10px] uppercase"
                                onClick={() => removePassenger(index)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addPassenger} className="w-full gap-2 h-12 font-bold text-xs sm:text-sm border-2 border-dashed">
                        <Plus className="h-4 w-4" /> Add Another Passenger
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-32">
                  <div className="bg-primary/5 p-4 sm:p-8 rounded-3xl border-2 border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 translate-x-12 translate-y-12">
                       <Ship className="h-48 w-48" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4 sm:mb-6">Voyage Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Trip ID</Label>
                        <p className="font-black text-accent text-lg sm:text-xl">{selectedSchedule?.tripCode}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Departure</Label>
                        <p className="font-bold text-primary text-sm sm:text-base">{selectedSchedule?.departureTime}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Travel Date</Label>
                        <p className="font-bold text-sm sm:text-base">{targetDate}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Status</Label>
                        <div className="mt-1">
                           {selectedSchedule?.isWaitlistOnly 
                             ? <Badge className="bg-orange-500 text-white uppercase text-[8px] font-black">Waitlist Entry</Badge>
                             : <Badge className="bg-green-600 text-white uppercase text-[8px] font-black">Seat Reserved</Badge>}
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-4 border-t pt-4 mt-2">
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Routing</Label>
                        <p className="font-bold text-xs sm:text-sm">{selectedSchedule?.route?.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-2">Passenger Breakdown</h3>
                    <div className="space-y-2 sm:space-y-3">
                      {passengers.map((p, i) => {
                        const fare = fares?.find(f => f.id === p.fareId);
                        return (
                          <div key={i} className="flex items-center justify-between bg-white p-3 sm:p-5 rounded-2xl border-2 shadow-sm">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-4">
                              <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-secondary flex items-center justify-center font-black text-primary text-[10px] sm:text-sm shrink-0">
                                {i + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-primary uppercase text-xs sm:text-base truncate">{p.passengerName || 'Unnamed'}</p>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                                  {fare?.segmentLabel} • {p.passengerContact || 'No contact set'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-primary text-sm sm:text-xl">₱{fare?.finalFare?.toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-8 bg-primary rounded-3xl text-primary-foreground p-6 sm:p-10 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Banknote className="h-32 w-32 sm:h-48 sm:w-48 -rotate-12 translate-x-12 translate-y-12" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                      <div>
                        <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.3em] mb-2">Total Payable Amount</p>
                        <p className="text-4xl sm:text-6xl font-black">₱{isMounted ? totalGroupFare.toLocaleString() : "---"}</p>
                        <p className="text-[9px] sm:text-[11px] mt-6 opacity-60 font-medium italic leading-tight max-w-sm">
                          {selectedSchedule?.isWaitlistOnly 
                            ? "* You are joining the waitlist queue. No payment is required at this stage. You will be notified once a seat is promoted to Reserved."
                            : "* Reservations are held until 60 minutes before departure. Proceed to our terminal desks for payment and confirmation. Present a valid ID for passenger verification."}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <Badge variant="outline" className="bg-white/10 text-white border-white/30 uppercase text-[9px] sm:text-[10px] px-4 py-2 font-black">
                          {selectedSchedule?.isWaitlistOnly ? 'Waitlist Confirmation' : 'Pre-Arrival Reserved'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-row items-center justify-between shrink-0">
            {bookingStep === 1 ? (
              <Button variant="outline" onClick={() => setIsBookingOpen(false)} className="h-11 sm:h-14 font-bold px-4 sm:px-10 text-xs sm:text-base rounded-xl">
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setBookingStep(1)} className="h-11 sm:h-14 font-bold px-2 sm:px-10 text-xs sm:text-base rounded-xl">
                <ChevronLeft className="h-5 w-5 sm:mr-2" /> <span className="hidden sm:inline">Modify Details</span><span className="sm:hidden">Back</span>
              </Button>
            )}

            {bookingStep === 1 ? (
              <Button 
                onClick={() => setBookingStep(2)} 
                disabled={!isDetailsValid}
                className="bg-primary text-white h-11 sm:h-14 px-6 sm:px-12 font-black uppercase tracking-widest group text-xs sm:text-base rounded-xl shadow-lg"
              >
                Review Summary <ChevronRight className="h-5 w-5 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                onClick={handleProcessBooking} 
                disabled={isReserving}
                className={cn("h-11 sm:h-14 px-6 sm:px-12 font-black uppercase tracking-widest text-[10px] sm:text-base rounded-xl shadow-lg", 
                  selectedSchedule?.isWaitlistOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-accent text-primary hover:bg-accent/90')}
              >
                {isReserving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 ml-1 sm:ml-2" />}
                {selectedSchedule?.isWaitlistOnly ? 'Join Waitlist' : 'Complete Booking'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-12 w-12 animate-spin text-accent" />
           <p className="font-black uppercase tracking-widest text-primary/50 text-xs">Syncing Terminal Data...</p>
        </div>
      </div>
    }>
      <TripsContent />
    </Suspense>
  );
}
