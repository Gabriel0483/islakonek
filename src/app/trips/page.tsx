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
  Timer
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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

  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);
  const faresRef = useMemoFirebase(() => collection(db!, "fares"), [db]);
  const bookingsRef = useMemoFirebase(() => collection(db!, "bookings"), [db]);
  const vesselsRef = useMemoFirebase(() => collection(db!, "vessels"), [db]);
  const portsRef = useMemoFirebase(() => collection(db!, "ports"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: bookings } = useCollection(bookingsRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: ports } = useCollection(portsRef);

  const [searchQuery, setSearchQuery] = useState("");
  const selectedOriginPort = searchParams.get("originPortId") || "all";
  const searchDate = searchParams.get("date");

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Details, 2: Summary
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
  const [passengers, setPassengers] = useState<PassengerForm[]>([{
    passengerName: "",
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
    emergencyContact: "",
    fareId: ""
  }]);

  const filteredTrips = useMemo(() => {
    if (!schedules || !routes || !isMounted || !phtState) return [];

    const targetDate = searchDate || phtState.date;

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
        const matchesRoute = route?.name?.toLowerCase().includes(query);
        const matchesCode = schedule.tripCode?.toLowerCase().includes(query);
        const originPortName = ports?.find(p => p.id === route?.originPortId)?.name?.toLowerCase().includes(query);
        const destPortName = ports?.find(p => p.id === route?.destinationPortId)?.name?.toLowerCase().includes(query);
        if (!matchesRoute && !originPortName && !destPortName && !matchesCode) return false;
      }

      return true;
    }).map(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      const vessel = vessels?.find(v => v.id === schedule.vesselId);
      
      const usedSeats = bookings?.filter(b => 
        b.scheduleId === schedule.id && 
        b.travelDate === targetDate && 
        !['Cancelled', 'Auto-cancelled', 'Suspended'].includes(b.status)
      ).length || 0;
      
      const capacity = schedule.passengerCapacity || vessel?.passengerCapacity || 0;
      const waitlistLimit = schedule.waitlistLimit || 0;
      
      return {
        ...schedule,
        route,
        vessel,
        availability: capacity - usedSeats,
        waitlistCapacity: (capacity + waitlistLimit) - usedSeats,
        isWaitlistOnly: usedSeats >= capacity && usedSeats < (capacity + waitlistLimit),
        isFull: usedSeats >= (capacity + waitlistLimit),
        estimatedDurationMinutes: route?.estimatedDurationMinutes || 0
      };
    });
  }, [schedules, routes, vessels, ports, bookings, searchQuery, selectedOriginPort, searchDate, isMounted, phtState]);

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

  const handleProcessBooking = () => {
    if (!db || !selectedSchedule || !phtState) return;

    const targetDate = searchDate || phtState.date;
    const status = selectedSchedule.isWaitlistOnly ? 'Waitlisted' : 'Reserved';

    passengers.forEach(p => {
      const selectedFare = fares?.find(f => f.id === p.fareId);
      const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      const bookingRef = doc(db, "bookings", newId);

      setDocumentNonBlocking(bookingRef, {
        id: newId,
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
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });
    });

    setIsBookingOpen(false);
    setBookingStep(1);
    setPassengers([{ passengerName: "", passengerDob: "", passengerEmail: "", passengerContact: "", emergencyContact: "", fareId: "" }]);
    
    alert(`Successfully processed ${passengers.length} booking request(s)!`);
  };

  const availableFares = fares?.filter(f => f.routeId === selectedSchedule?.routeId);
  const totalGroupFare = passengers.reduce((sum, p) => {
    const fare = fares?.find(f => f.id === p.fareId);
    return sum + (fare?.finalFare || 0);
  }, 0);

  const isDetailsValid = passengers.every(p => p.passengerName && p.fareId && p.passengerDob && p.emergencyContact && p.passengerContact && p.passengerEmail);

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary mb-1 sm:mb-2">Available Trips</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Voyages for <span className="text-primary font-bold">{searchDate || phtState?.date}</span> 
            {selectedOriginPort !== 'all' && <> from <span className="text-primary font-bold truncate inline-block max-w-[150px] align-bottom">{ports?.find(p => p.id === selectedOriginPort)?.name}</span></>}
          </p>
        </header>

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search trip ID or destination..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 sm:h-12 bg-white border-none shadow-sm text-sm" 
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] sm:text-sm text-muted-foreground py-2 border-b">
            <p>Showing <span className="text-foreground font-bold">{filteredTrips.length}</span> voyages</p>
          </div>

          <div className="space-y-4">
            {isSchedulesLoading || !phtState ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-sm">Searching for active voyages...</p>
              </div>
            ) : filteredTrips.length > 0 ? filteredTrips.map((trip) => (
              <Card 
                key={trip.id} 
                className={cn(
                  "group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white cursor-pointer",
                  trip.isFull && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => !trip.isFull && handleBookNow(trip)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent border-accent/20 bg-accent/5">
                          {trip.vessel?.type || "Standard"}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{trip.type} Service</span>
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-primary/50 uppercase ml-auto sm:ml-0">
                           <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {trip.tripCode}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                        <div className="space-y-0.5 sm:space-y-1">
                          <div className="text-base sm:text-xl font-black text-primary truncate uppercase tracking-tight">
                            {trip.route?.name?.split(' - ')[0]}
                          </div>
                          <div className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-accent">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {trip.departureTime}
                          </div>
                        </div>
                        
                        <div className="space-y-0.5 sm:space-y-1 md:text-right">
                          <div className="text-base sm:text-xl font-black text-primary truncate uppercase tracking-tight">
                            {trip.route?.name?.split(' - ')[1]}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden">Arrival Destination</p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] sm:text-sm text-muted-foreground border-t border-dashed">
                        <div className="flex items-center gap-1.5">
                          <Ship className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/40" />
                          <span className="font-medium">{trip.vessel?.name || "TBA"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/40" />
                          {trip.availability > 0 ? (
                            <span className={cn("font-bold", trip.availability < 10 ? "text-orange-500" : "text-primary")}>
                              {trip.availability} seats left
                            </span>
                          ) : trip.isWaitlistOnly ? (
                            <span className="text-orange-600 font-bold flex items-center gap-1">
                              <ListOrdered className="h-3 w-3 sm:h-4 sm:w-4" /> Waitlist Open
                            </span>
                          ) : (
                            <span className="text-destructive font-black uppercase text-[10px]">Fully Booked</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary/40" />
                          <span className="font-bold text-primary/70">{trip.estimatedDurationMinutes} mins voyage</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col justify-center">
                       <div className="bg-primary/5 p-3 rounded-full group-hover:bg-accent transition-colors">
                          <ChevronRight className="h-6 w-6 text-primary" />
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="py-20 text-center border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold">No trips found</h3>
                <p className="text-sm text-muted-foreground">Try selecting a different date or origin port.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[750px] p-0 overflow-hidden h-[95vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b bg-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-primary">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-accent" /> {selectedSchedule?.isWaitlistOnly ? 'Join Waitlist' : 'Trip Booking'}
              </DialogTitle>
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
                <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">Confirm</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-4 sm:p-6 pb-32">
              {bookingStep === 1 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  {selectedSchedule?.isWaitlistOnly && (
                    <div className="bg-orange-50 border border-orange-200 p-3 sm:p-4 rounded-xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-orange-800">Trip is Full</p>
                        <p className="text-[10px] sm:text-xs text-orange-700 leading-tight">You are joining the waitlist for this voyage. Confirmations are subject to seat availability.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                       <Label className="flex items-center gap-2 font-black text-primary uppercase text-base sm:text-lg tracking-tight">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> Passengers ({passengers.length})
                      </Label>
                    </div>

                    <div className="space-y-6 sm:space-y-8">
                      {passengers.map((p, index) => (
                        <div key={index} className="relative bg-secondary/5 rounded-2xl border-2 border-dashed p-4 sm:p-6 pt-8 group hover:border-accent/40 transition-colors">
                          <div className="absolute -top-4 left-4 sm:left-6 bg-white border-2 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase text-primary tracking-widest z-10">
                            Passenger #{index + 1}
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -top-3 -right-3 h-7 w-7 sm:h-8 sm:w-8 bg-white shadow-md border-2 rounded-full text-destructive hover:bg-red-50 z-20"
                            onClick={() => removePassenger(index)}
                            disabled={passengers.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          
                          <div className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Full Name</Label>
                                <Input 
                                  value={p.passengerName} 
                                  onChange={(e) => updatePassenger(index, 'passengerName', e.target.value)}
                                  placeholder="As shown in ID"
                                  className="bg-white h-10 sm:h-11 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Date of Birth</Label>
                                <Input 
                                  type="date"
                                  value={p.passengerDob} 
                                  onChange={(e) => updatePassenger(index, 'passengerDob', e.target.value)}
                                  className="bg-white h-10 sm:h-11 text-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mobile Number</Label>
                                <Input 
                                  value={p.passengerContact} 
                                  onChange={(e) => updatePassenger(index, 'passengerContact', e.target.value)}
                                  placeholder="09XX XXX XXXX"
                                  className="bg-white h-10 sm:h-11 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                  <Heart className="h-2.5 w-2.5 text-destructive" /> Emergency Contact
                                </Label>
                                <Input 
                                  value={p.emergencyContact} 
                                  onChange={(e) => updatePassenger(index, 'emergencyContact', e.target.value)}
                                  placeholder="ICE name or mobile"
                                  className="bg-white h-10 sm:h-11 text-sm"
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
                                  placeholder="your@email.com"
                                  className="bg-white h-10 sm:h-11 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Passenger Type</Label>
                                <Select value={p.fareId} onValueChange={(val) => updatePassenger(index, 'fareId', val)}>
                                  <SelectTrigger className="bg-white h-10 sm:h-11 border-2 text-sm">
                                    <SelectValue placeholder="Select type" />
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
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addPassenger} className="w-full gap-2 h-11 font-bold text-xs sm:text-sm border-2 border-dashed">
                        <Plus className="h-4 w-4" /> Add Another Passenger
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-32">
                  <div className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/10">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-3 sm:mb-4">Voyage Review</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Trip ID</Label>
                        <p className="font-black text-accent text-sm sm:text-lg">{selectedSchedule?.tripCode}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Departure</Label>
                        <p className="font-bold text-primary text-sm">{selectedSchedule?.departureTime}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Travel Date</Label>
                        <p className="font-bold text-sm">{searchDate || phtState?.date}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Vessel</Label>
                        <p className="font-bold text-sm truncate">{selectedSchedule?.vessel?.name || 'TBA'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Routing</Label>
                        <p className="font-bold text-xs sm:text-sm">{selectedSchedule?.route?.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-2">Passenger Roster</h3>
                    <div className="space-y-2 sm:space-y-3">
                      {passengers.map((p, i) => {
                        const fare = fares?.find(f => f.id === p.fareId);
                        return (
                          <div key={i} className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl border-2">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary flex items-center justify-center font-black text-primary text-[10px] sm:text-xs shrink-0">
                                {i + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-primary uppercase text-xs sm:text-sm truncate">{p.passengerName}</p>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate">
                                  {fare?.segmentLabel} • {p.passengerContact || 'No mobile'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-primary text-xs sm:text-base">₱{fare?.finalFare?.toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-8 bg-primary rounded-2xl text-primary-foreground p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Banknote className="h-24 w-24 sm:h-32 sm:w-32 -rotate-12 translate-x-8 translate-y-8" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                      <div>
                        <p className="text-[10px] opacity-70 uppercase font-black tracking-widest mb-1">Estimated Total Fare</p>
                        <p className="text-3xl sm:text-5xl font-black">₱{isMounted ? totalGroupFare.toLocaleString() : "---"}</p>
                        <p className="text-[9px] sm:text-[10px] mt-3 sm:mt-4 opacity-60 font-medium italic leading-tight">* Final payment collected during issuance.</p>
                      </div>
                      <Badge variant="outline" className="bg-white/10 text-white border-white/30 uppercase text-[9px] px-3 py-1 sm:px-4 sm:py-1.5 font-black shrink-0">
                        {selectedSchedule?.isWaitlistOnly ? 'Waitlist' : 'Reserved'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-row items-center justify-between shrink-0">
            {bookingStep === 1 ? (
              <Button variant="outline" onClick={() => setIsBookingOpen(false)} className="h-10 sm:h-12 font-bold px-4 sm:px-8 text-xs sm:text-sm">
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setBookingStep(1)} className="h-10 sm:h-12 font-bold px-2 sm:px-8 text-xs sm:text-sm">
                <ChevronLeft className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Back to Details</span><span className="sm:hidden">Back</span>
              </Button>
            )}

            {bookingStep === 1 ? (
              <Button 
                onClick={() => setBookingStep(2)} 
                disabled={!isDetailsValid}
                className="bg-primary text-white h-10 sm:h-12 px-6 sm:px-10 font-bold group text-xs sm:text-sm"
              >
                Review <span className="hidden sm:inline">Summary</span> <ChevronRight className="h-4 w-4 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                onClick={handleProcessBooking} 
                className={cn("h-10 sm:h-12 px-6 sm:px-10 font-black uppercase tracking-wider text-[10px] sm:text-xs", 
                  selectedSchedule?.isWaitlistOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-accent text-primary hover:bg-accent/90')}
              >
                {selectedSchedule?.isWaitlistOnly ? 'Confirm Waitlist' : 'Complete Reservation'} <Check className="h-4 w-4 ml-1 sm:ml-2" />
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    }>
      <TripsContent />
    </Suspense>
  );
}
