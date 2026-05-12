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
  CheckCircle2
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

function TripsContent() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [phtState, setPhtState] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // Calculate Philippine Time (UTC+8)
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

  // Data Fetching
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const selectedOriginPort = searchParams.get("originPortId") || "all";
  const searchDate = searchParams.get("date");

  // Booking State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [bookingFormData, setBookingFormData] = useState({
    passengerName: "",
    passengerContact: "",
    fareId: ""
  });

  const filteredTrips = useMemo(() => {
    if (!schedules || !routes || !isMounted || !phtState) return [];

    return schedules.filter(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      
      if (!schedule.isActive) return false;

      // 1. Date Validation
      if (searchDate) {
        if (schedule.type === 'Special') {
          if (!schedule.specialDates?.includes(searchDate)) return false;
        }
        // If searching for PHT "Today", check if trip has already elapsed
        if (searchDate === phtState.date) {
          if (schedule.departureTime < phtState.time) return false;
        }
      }

      // 2. Filter by Origin Port (Streamlined from home)
      if (selectedOriginPort !== "all" && route?.originPortId !== selectedOriginPort) {
        return false;
      }

      // 3. Filter by Text Search
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
      const usedSeats = bookings?.filter(b => b.scheduleId === schedule.id && !['Cancelled', 'Auto-cancelled'].includes(b.status)).length || 0;
      
      const capacity = schedule.passengerCapacity || vessel?.passengerCapacity || 0;
      const waitlistLimit = schedule.waitlistLimit || 0;
      
      return {
        ...schedule,
        route,
        vessel,
        availability: capacity - usedSeats,
        waitlistCapacity: (capacity + waitlistLimit) - usedSeats,
        isWaitlistOnly: usedSeats >= capacity && usedSeats < (capacity + waitlistLimit),
        isFull: usedSeats >= (capacity + waitlistLimit)
      };
    });
  }, [schedules, routes, vessels, ports, bookings, searchQuery, selectedOriginPort, searchDate, isMounted, phtState]);

  const handleBookNow = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsBookingOpen(true);
  };

  const handleProcessBooking = () => {
    if (!db || !selectedSchedule || !bookingFormData.fareId || !bookingFormData.passengerName) return;

    const selectedFare = fares?.find(f => f.id === bookingFormData.fareId);
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = new Date().toISOString();
    const bookingRef = doc(db, "bookings", newId);

    const status = selectedSchedule.isWaitlistOnly ? 'Waitlisted' : 'Reserved';

    setDocumentNonBlocking(bookingRef, {
      id: newId,
      scheduleId: selectedSchedule.id,
      routeId: selectedSchedule.routeId,
      passengerName: bookingFormData.passengerName,
      passengerContact: bookingFormData.passengerContact,
      fareId: bookingFormData.fareId,
      segmentLabel: selectedFare?.segmentLabel || "",
      finalFare: selectedFare?.finalFare || 0,
      status: status,
      bookingSource: "Public",
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    setIsBookingOpen(false);
    setBookingFormData({ passengerName: "", passengerContact: "", fareId: "" });
    
    if (status === 'Waitlisted') {
      alert(`You have been placed on the WAITLIST! Reservation ID: ${newId}. You will be notified if a seat becomes available.`);
    } else {
      alert(`Booking requested successfully! Your Reservation ID is ${newId}. Please proceed to the terminal to confirm your payment.`);
    }
  };

  const availableFares = fares?.filter(f => f.routeId === selectedSchedule?.routeId);
  const selectedFareDetails = fares?.find(f => f.id === bookingFormData.fareId);

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline text-primary mb-2">Available Trips</h1>
          <p className="text-muted-foreground text-sm">
            Voyages for <span className="text-primary font-bold">{searchDate}</span> 
            {selectedOriginPort !== 'all' && <> originating from <span className="text-primary font-bold">{ports?.find(p => p.id === selectedOriginPort)?.name}</span></>}
          </p>
        </header>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Quick search trip ID or destination..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-white border-none shadow-sm" 
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground py-2 border-b">
            <p>Showing <span className="text-foreground font-bold">{filteredTrips.length}</span> results</p>
          </div>

          <div className="space-y-4">
            {isSchedulesLoading || !phtState ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p>Searching for active voyages...</p>
              </div>
            ) : filteredTrips.length > 0 ? filteredTrips.map((trip) => (
              <Card key={trip.id} className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-accent border-accent/20 bg-accent/5">
                          {trip.vessel?.type || "Standard"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">{trip.type} Schedule</span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-primary/50 uppercase ml-auto">
                           <Tag className="h-3 w-3" /> {trip.tripCode}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4">
                        <div className="md:col-span-2 space-y-1">
                          <div className="text-lg font-bold text-primary">{trip.route?.name?.split(' - ')[0]}</div>
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-accent" /> {trip.departureTime}
                          </div>
                        </div>
                        
                        <div className="md:col-span-3 flex flex-col items-center justify-center px-4">
                          <div className="w-full h-px bg-border relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                              <Ship className="h-5 w-5 text-accent" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter">
                            {trip.route?.estimatedDurationMinutes} mins travel
                          </span>
                        </div>

                        <div className="md:col-span-2 space-y-1 text-right">
                          <div className="text-lg font-bold text-primary">{trip.route?.name?.split(' - ')[1]}</div>
                          <div className="text-sm font-medium">Direct Arrival</div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Ship className="h-4 w-4" />
                          {trip.vessel?.name || "TBA"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          {trip.availability > 0 ? (
                            <span className={trip.availability < 10 ? "text-orange-500 font-bold" : ""}>
                              {trip.availability} seats left
                            </span>
                          ) : trip.isWaitlistOnly ? (
                            <span className="text-orange-600 font-bold flex items-center gap-1">
                              <ListOrdered className="h-3 w-3" /> Waitlist Open
                            </span>
                          ) : (
                            <span className="text-destructive font-bold">Fully Booked</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-secondary/30 p-6 md:w-64 border-t md:border-t-0 md:border-l flex flex-col justify-center items-center text-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Starts From</p>
                        <p className="text-2xl font-extrabold text-primary">₱{isMounted ? trip.route?.basePrice?.toLocaleString() : "---"}</p>
                      </div>
                      <Button 
                        onClick={() => handleBookNow(trip)}
                        disabled={trip.isFull}
                        variant={trip.isWaitlistOnly ? "outline" : "default"}
                        className={`w-full font-bold gap-2 transition-transform ${trip.isWaitlistOnly ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : 'bg-accent text-primary hover:bg-accent/90'}`}
                      >
                        {trip.isWaitlistOnly ? "Join Waitlist" : "Select & Book"} <ChevronRight className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" /> {selectedSchedule?.isWaitlistOnly ? 'Join Waitlist' : 'Secure Your Seat'}
            </DialogTitle>
            <DialogDescription>
              Trip: <span className="font-bold text-primary">{selectedSchedule?.tripCode}</span> ({selectedSchedule?.route?.name})
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-4">
            <div className="grid gap-6 py-4">
              {selectedSchedule?.isWaitlistOnly && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">Trip is Full</p>
                    <p className="text-xs text-orange-700">You are joining the waitlist. Your status will be 'Waitlisted'. If a reserved seat is cancelled, you may be automatically upgraded to 'Reserved'.</p>
                  </div>
                </div>
              )}

              <section className="space-y-4">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> Passenger Information
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passengerName">Full Name</Label>
                    <Input 
                      id="passengerName" 
                      value={bookingFormData.passengerName} 
                      onChange={(e) => setBookingFormData({...bookingFormData, passengerName: e.target.value})}
                      placeholder="Juan Dela Cruz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Number</Label>
                    <Input 
                      id="contact" 
                      value={bookingFormData.passengerContact} 
                      onChange={(e) => setBookingFormData({...bookingFormData, passengerContact: e.target.value})}
                      placeholder="0912 345 6789"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-accent" /> Select Passenger Type
                </Label>
                <div className="space-y-2">
                  <Select value={bookingFormData.fareId} onValueChange={(val) => setBookingFormData({...bookingFormData, fareId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose demographics for pricing" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFares?.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.segmentLabel} - ₱{f.finalFare}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {selectedFareDetails && (
                <div className="mt-4 p-6 bg-primary rounded-xl text-primary-foreground">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-70 uppercase font-bold">Ticket Price</p>
                      <p className="text-4xl font-black">₱{isMounted ? selectedFareDetails.finalFare?.toLocaleString() : "---"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleProcessBooking} 
              className={selectedSchedule?.isWaitlistOnly ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-primary text-white'}
              disabled={!bookingFormData.fareId || !bookingFormData.passengerName}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> {selectedSchedule?.isWaitlistOnly ? 'Confirm Waitlist' : 'Complete Reservation'}
            </Button>
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