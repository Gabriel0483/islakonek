
"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Ship, 
  Search, 
  MapPin, 
  Clock, 
  Users, 
  ChevronRight,
  Filter,
  Loader2,
  Calendar,
  CheckCircle2,
  Ticket,
  User,
  Phone,
  Banknote
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

export default function TripsPage() {
  const searchParams = useSearchParams();
  const db = useFirestore();

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
  const [searchQuery, setSearchQuery] = useState(searchParams.get("origin") || "");
  const [selectedVesselTypes, setSelectedVesselTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // Booking State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [bookingFormData, setBookingFormData] = useState({
    passengerName: "",
    passengerContact: "",
    fareId: ""
  });

  const filteredTrips = useMemo(() => {
    if (!schedules || !routes) return [];

    return schedules.filter(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      const vessel = vessels?.find(v => v.id === schedule.vesselId);
      
      if (!schedule.isActive) return false;

      // Filter by Search Query (Route Name or Port Name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesRoute = route?.name.toLowerCase().includes(query);
        const originPort = ports?.find(p => p.id === route?.originPortId)?.name.toLowerCase().includes(query);
        const destPort = ports?.find(p => p.id === route?.destinationPortId)?.name.toLowerCase().includes(query);
        if (!matchesRoute && !originPort && !destPort) return false;
      }

      // Filter by Vessel Type
      if (selectedVesselTypes.length > 0 && vessel && !selectedVesselTypes.includes(vessel.type)) {
        return false;
      }

      // Filter by Price Range
      if (priceRange.min && route.basePrice < Number(priceRange.min)) return false;
      if (priceRange.max && route.basePrice > Number(priceRange.max)) return false;

      return true;
    }).map(schedule => {
      const route = routes.find(r => r.id === schedule.routeId);
      const vessel = vessels?.find(v => v.id === schedule.vesselId);
      const usedSeats = bookings?.filter(b => b.scheduleId === schedule.id && b.paymentStatus !== "Cancelled").length || 0;
      
      return {
        ...schedule,
        route,
        vessel,
        availability: schedule.passengerCapacity - usedSeats
      };
    });
  }, [schedules, routes, vessels, ports, bookings, searchQuery, selectedVesselTypes, priceRange]);

  const handleBookNow = (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsBookingOpen(true);
  };

  const handleProcessBooking = () => {
    if (!db || !selectedSchedule || !bookingFormData.fareId || !bookingFormData.passengerName) return;

    const selectedFare = fares?.find(f => f.id === bookingFormData.fareId);
    const newId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    const bookingRef = doc(db, "bookings", newId);

    setDocumentNonBlocking(bookingRef, {
      id: newId,
      scheduleId: selectedSchedule.id,
      routeId: selectedSchedule.routeId,
      passengerName: bookingFormData.passengerName,
      passengerContact: bookingFormData.passengerContact,
      fareId: bookingFormData.fareId,
      segmentLabel: selectedFare?.segmentLabel || "",
      finalFare: selectedFare?.finalFare || 0,
      paymentStatus: "Pending",
      bookingSource: "Public",
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    setIsBookingOpen(false);
    setBookingFormData({ passengerName: "", passengerContact: "", fareId: "" });
    alert("Booking requested successfully! Please proceed to the terminal to confirm your payment.");
  };

  const availableFares = fares?.filter(f => f.routeId === selectedSchedule?.routeId);
  const selectedFareDetails = fares?.find(f => f.id === bookingFormData.fareId);

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline text-primary mb-2">Available Trips</h1>
          <p className="text-muted-foreground">Find and book your next maritime journey using our live island schedules.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-sm sticky top-24">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <Filter className="h-4 w-4 text-accent" />
                    Filters
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-accent h-auto p-0 hover:bg-transparent underline"
                    onClick={() => {
                      setSelectedVesselTypes([]);
                      setPriceRange({ min: "", max: "" });
                      setSearchQuery("");
                    }}
                  >
                    Reset All
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Vessel Type</label>
                  <div className="space-y-2">
                    {["RoRo", "FastCraft", "Cargo Ship", "Catamaran"].map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={type} 
                          checked={selectedVesselTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedVesselTypes([...selectedVesselTypes, type]);
                            else setSelectedVesselTypes(selectedVesselTypes.filter(t => t !== type));
                          }}
                          className="rounded border-border text-accent focus:ring-accent" 
                        />
                        <label htmlFor={type} className="text-sm">{type}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Price Range</label>
                  <div className="flex gap-2 items-center">
                    <Input 
                      placeholder="Min" 
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      className="h-8 text-xs bg-secondary border-none" 
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                      placeholder="Max" 
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      className="h-8 text-xs bg-secondary border-none" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search route or port..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-white border-none shadow-sm" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground py-2 border-b">
              <p>Showing <span className="text-foreground font-bold">{filteredTrips.length}</span> results</p>
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <select className="bg-transparent font-bold text-foreground outline-none">
                  <option>Earliest Departure</option>
                  <option>Lowest Price</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {isSchedulesLoading ? (
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

                        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Ship className="h-4 w-4" />
                            {trip.vessel?.name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {trip.availability > 0 ? (
                              <span className={trip.availability < 10 ? "text-orange-500 font-bold" : ""}>
                                {trip.availability} seats left
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
                          <p className="text-2xl font-extrabold text-primary">₱{trip.route?.basePrice?.toLocaleString()}</p>
                        </div>
                        <Button 
                          onClick={() => handleBookNow(trip)}
                          disabled={trip.availability <= 0}
                          className="w-full bg-accent text-primary font-bold hover:bg-accent/90 gap-2 border-none group-hover:scale-105 transition-transform"
                        >
                          Select & Book <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="py-20 text-center border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold">No trips found</h3>
                  <p className="text-sm text-muted-foreground">Adjust your filters or search criteria to find available maritime trips.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" /> Secure Your Seat
            </DialogTitle>
            <DialogDescription>
              Trip: {selectedSchedule?.route?.name} at {selectedSchedule?.departureTime}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-4">
            <div className="grid gap-6 py-4">
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
                  <p className="text-[10px] text-muted-foreground italic">Discounts will be verified upon terminal check-in with valid IDs.</p>
                </div>
              </section>

              {selectedFareDetails && (
                <div className="mt-4 p-6 bg-primary rounded-xl text-primary-foreground">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-70 uppercase font-bold">Final Ticket Price</p>
                      <p className="text-4xl font-black">₱{selectedFareDetails.finalFare?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                        {selectedFareDetails.isVatExempt ? "VAT Exempt" : "VAT Inclusive"}
                      </Badge>
                      <p className="text-[10px] mt-1 opacity-70">Category: {selectedFareDetails.segmentLabel}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-secondary/20 p-4 rounded-lg flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Reservation Policy</p>
                  <p className="text-[10px] text-muted-foreground">Online bookings are reservations. Please arrive 1 hour early for payment and verification.</p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleProcessBooking} 
              className="bg-primary text-white"
              disabled={!bookingFormData.fareId || !bookingFormData.passengerName}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Complete Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
