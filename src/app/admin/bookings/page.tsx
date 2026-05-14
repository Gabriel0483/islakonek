"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Ticket, 
  Plus, 
  Loader2, 
  User, 
  CheckCircle2, 
  Ship,
  Clock,
  Banknote,
  ClipboardList,
  Tag,
  AlertCircle,
  ListOrdered,
  Calendar as CalendarIcon,
  Mail,
  Heart,
  QrCode,
  Download,
  Printer,
  Trash2,
  Users,
  Search,
  UserPlus,
  Phone,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";
import Link from "next/link";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  setDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PassengerForm {
  passengerName: string;
  passengerDob: string;
  passengerEmail: string;
  passengerContact: string;
  emergencyContact: string;
  fareId: string;
}

export default function DeskBookingsPage() {
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
  
  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const faresRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "fares");
  }, [db]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "bookings");
  }, [db]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);

  const usersRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "users");
  }, [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules } = useCollection(schedulesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: registeredUsers } = useCollection(usersRef);

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1); // 1: Details, 2: Summary
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    routeId: "",
    scheduleId: "",
    travelDate: "",
    isPaid: true
  });

  const [passengers, setPassengers] = useState<PassengerForm[]>([{
    passengerName: "",
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
    emergencyContact: "",
    fareId: ""
  }]);

  const [userSearchTerm, setUserSearchTerm] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (todayPHT && !formData.travelDate) {
      setFormData(prev => ({ ...prev, travelDate: todayPHT }));
    }
  }, [todayPHT, formData.travelDate]);

  const availableSchedules = schedules?.filter(s => s.routeId === formData.routeId && s.isActive);
  const availableFares = fares?.filter(f => f.routeId === formData.routeId);
  const selectedSchedule = schedules?.find(s => s.id === formData.scheduleId);
  const selectedRoute = routes?.find(r => r.id === formData.routeId);

  const getSeatsUsed = (scheduleId: string, travelDate: string) => {
    return bookings?.filter(b => 
      b.scheduleId === scheduleId && 
      b.travelDate === travelDate && 
      !['Cancelled', 'Auto-cancelled', 'Suspended'].includes(b.status)
    ).length || 0;
  };

  const currentCapacity = selectedSchedule?.passengerCapacity || vessels?.find(v => v.id === selectedSchedule?.vesselId)?.passengerCapacity || 0;
  const waitlistLimit = selectedSchedule?.waitlistLimit || 0;
  const seatsUsed = formData.scheduleId && formData.travelDate ? getSeatsUsed(formData.scheduleId, formData.travelDate) : 0;
  
  const totalRequested = passengers.length;
  const isWaitlistOnly = (seatsUsed + totalRequested) > currentCapacity && (seatsUsed + totalRequested) <= (currentCapacity + waitlistLimit);
  const isFull = (seatsUsed + totalRequested) > (currentCapacity + waitlistLimit);

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
    const newSearchTerm = { ...userSearchTerm };
    delete newSearchTerm[index];
    setUserSearchTerm(newSearchTerm);
  };

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const handleApplyProfile = (index: number, user: any) => {
    const updated = [...passengers];
    updated[index] = {
      ...updated[index],
      passengerName: user.displayName || "",
      passengerEmail: user.email || "",
      passengerContact: user.phoneNumber || ""
    };
    setPassengers(updated);
    setUserSearchTerm({ ...userSearchTerm, [index]: "" });
  };

  const handleCreateBooking = () => {
    if (!db || !formData.routeId || !formData.scheduleId || !formData.travelDate) return;

    const tripBookings = bookings?.filter(b => 
      b.scheduleId === formData.scheduleId && 
      b.travelDate === formData.travelDate && 
      (b.status === 'Confirmed' || b.status === 'Used')
    ) || [];
    let currentSeq = tripBookings.length + 1;

    passengers.forEach((p) => {
      const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timestamp = new Date().toISOString();
      const bookingRef = doc(db, "bookings", newId);
      const selectedFare = fares?.find(f => f.id === p.fareId);

      let status = isWaitlistOnly ? 'Waitlisted' : 'Reserved';
      if (formData.isPaid && !isWaitlistOnly) {
        status = 'Confirmed';
      }

      let boardingSeq = null;
      if (status === 'Confirmed') {
        boardingSeq = currentSeq++;
      }

      const newBookingData = {
        id: newId,
        routeId: formData.routeId,
        scheduleId: formData.scheduleId,
        travelDate: formData.travelDate,
        emergencyContact: p.emergencyContact,
        passengerName: p.passengerName,
        passengerDob: p.passengerDob,
        passengerEmail: p.passengerEmail,
        passengerContact: p.passengerContact,
        fareId: p.fareId,
        status: status,
        segmentLabel: selectedFare?.segmentLabel || "",
        finalFare: selectedFare?.finalFare || 0,
        bookingSource: "Desk",
        boardingSequenceNumber: boardingSeq,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      setDocumentNonBlocking(bookingRef, newBookingData, { merge: true });

      if (status === 'Confirmed') {
        setLastCreatedBooking(newBookingData);
        setIsBoardingPassOpen(true);
      }
    });

    setIsNewBookingOpen(false);
    setBookingStep(1);
    setFormData({
      routeId: "",
      scheduleId: "",
      travelDate: todayPHT,
      isPaid: true
    });
    setPassengers([{
      passengerName: "",
      passengerDob: "",
      passengerEmail: "",
      passengerContact: "",
      emergencyContact: "",
      fareId: ""
    }]);
    setUserSearchTerm({});
  };

  const deskBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter(b => b.bookingSource === "Desk")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [bookings]);

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";

  const totalFare = passengers.reduce((sum, p) => {
    const fare = fares?.find(f => f.id === p.fareId);
    return sum + (fare?.finalFare || 0);
  }, 0);

  const isDetailsValid = formData.scheduleId && formData.travelDate && !isFull && passengers.every(p => p.passengerName && p.fareId && p.passengerDob && p.emergencyContact);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent" />
            Desk Bookings
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg sm:text-xl">Counter Sales</CardTitle>
                <CardDescription className="text-primary-foreground/70 text-xs sm:text-sm">Process tickets for walk-in passengers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-10 sm:p-20 text-center">
               <Ticket className="h-12 w-12 sm:h-20 sm:w-20 text-accent/20 mx-auto mb-4 sm:mb-6" />
               <h2 className="text-xl sm:text-3xl font-black text-primary mb-2">Ready to Issue?</h2>
               <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">Select the trip and demographics to generate valid tickets and manifest entries for walk-in passengers.</p>
               <Button onClick={() => { setIsNewBookingOpen(true); setBookingStep(1); }} size="lg" className="bg-primary w-full sm:w-auto px-12 h-12 sm:h-14 text-base sm:text-lg">
                 Start Ticket Booking
               </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b p-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recently Issued (Desk)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isBookingsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : deskBookings && deskBookings.length > 0 ? (
              <div className="w-full min-w-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/30">
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ticket ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Passenger</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Travel Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Trip/Route</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deskBookings.map((booking) => (
                      <tr key={booking.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4 align-middle font-mono text-[10px] font-bold">#{booking.id}</td>
                        <td className="p-4 align-middle font-bold">{booking.passengerName}</td>
                        <td className="p-4 align-middle text-xs">{booking.travelDate}</td>
                        <td className="p-4 align-middle">
                          <div className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{getRouteName(booking.routeId)}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="text-[10px]">{booking.status}</Badge>
                        </td>
                        <td className="p-4 align-middle font-black text-primary">
                          ₱{isMounted ? booking.finalFare?.toLocaleString() : "---"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 opacity-30 text-xs font-bold uppercase">No recent counter sales</div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 bg-transparent border-none shadow-none overflow-y-auto max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Boarding Pass</DialogTitle>
            <DialogDescription>Digital boarding pass with voyage details and QR code.</DialogDescription>
          </DialogHeader>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative mx-auto">
            <div className="bg-primary p-4 sm:p-6 text-primary-foreground text-center space-y-2">
              <div className="flex justify-center mb-1 sm:mb-2">
                <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl">
                  <Ship className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">Boarding Pass</h2>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex justify-between items-start border-b border-dashed pb-4">
                <div className="flex-1 mr-2 overflow-hidden">
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Passenger Name</Label>
                  <p className="text-base sm:text-lg font-black text-primary uppercase truncate">{lastCreatedBooking?.passengerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</Label>
                  <p className="font-mono text-xs sm:text-sm font-bold">#{lastCreatedBooking?.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-4 sm:gap-x-8">
                <div>
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Trip ID</Label>
                  <p className="font-black text-accent uppercase text-sm sm:text-base">{getTripCode(lastCreatedBooking?.scheduleId)}</p>
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Date of Travel</Label>
                  <p className="font-bold text-sm">{lastCreatedBooking?.travelDate}</p>
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Departure Time</Label>
                  <p className="font-bold text-sm">{getDeparture(lastCreatedBooking?.scheduleId)}</p>
                </div>
                <div>
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</Label>
                  <div className="bg-primary/10 text-primary h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm">
                    {lastCreatedBooking?.boardingSequenceNumber || "N/A"}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Routing</Label>
                  <p className="font-bold text-xs sm:text-sm truncate">{getRouteName(lastCreatedBooking?.routeId)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4 sm:py-6 border-t border-dashed">
                <div className="bg-secondary/20 p-3 sm:p-4 rounded-2xl mb-4">
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=BOARDING_PASS_${lastCreatedBooking?.id}_${lastCreatedBooking?.boardingSequenceNumber}`}
                    alt="Boarding Pass QR"
                    width={120}
                    height={120}
                    className="mix-blend-multiply w-[100px] h-[100px] sm:w-[120px] sm:h-[120px]"
                  />
                </div>
                <p className="text-[9px] sm:text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic">Scan at the boarding gate</p>
              </div>
            </div>

            <div className="bg-secondary/30 p-4 flex gap-2">
              <Button className="flex-1 bg-primary text-white font-bold h-9 text-xs sm:text-sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2 shrink-0" /> Print Pass
              </Button>
              <Button variant="outline" className="flex-1 font-bold h-9 text-xs sm:text-sm">
                <Download className="h-4 w-4 mr-2 shrink-0" /> Save
              </Button>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="link" className="text-white" onClick={() => setIsBoardingPassOpen(false)}>
              Close Boarding Pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[850px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b bg-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-primary">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-accent" /> Desk Issuance
              </DialogTitle>
            </div>
            {/* Progress Indicator */}
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

          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 pb-20">
              {bookingStep === 1 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 bg-secondary/5 p-3 sm:p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" /> 1. Travel Date
                      </Label>
                      <Input 
                        type="date" 
                        value={formData.travelDate} 
                        onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                        className="bg-white h-10 sm:h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">2. Select Route</Label>
                      <Select value={formData.routeId} onValueChange={(val) => setFormData({...formData, routeId: val, scheduleId: ""})}>
                        <SelectTrigger className="bg-white h-10 sm:h-11 text-sm">
                          <SelectValue placeholder="Choose Route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes?.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">3. Select Schedule</Label>
                      <Select disabled={!formData.routeId} value={formData.scheduleId} onValueChange={(val) => setFormData({...formData, scheduleId: val})}>
                        <SelectTrigger className="bg-white h-10 sm:h-11 text-sm">
                          <SelectValue placeholder="Choose Departure" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSchedules?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </section>

                  {formData.scheduleId && formData.travelDate && (
                    <div className={cn("p-3 sm:p-4 rounded-xl flex items-center justify-between border-2 transition-colors", 
                      isWaitlistOnly ? 'bg-orange-50 border-orange-200' : isFull ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200')}>
                      <div className="flex items-center gap-3">
                        {isWaitlistOnly ? <ListOrdered className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" /> : isFull ? <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" /> : <Ship className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
                        <div>
                          <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">Availability for {formData.travelDate}</p>
                          <p className={cn("text-base sm:text-lg font-black", isFull ? 'text-red-700' : isWaitlistOnly ? 'text-orange-700' : 'text-primary')}>
                            {isFull ? 'TRIP FULL' : isWaitlistOnly ? 'WAITLISTING' : `${currentCapacity - seatsUsed} Seats Available`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <section className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="flex items-center gap-2 text-base sm:text-lg font-black text-primary uppercase tracking-tight">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> Passengers ({passengers.length})
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPassenger} className="gap-1 sm:gap-2 h-8 sm:h-9 font-bold text-[10px] sm:text-xs">
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Another
                      </Button>
                    </div>

                    <div className="space-y-8 sm:space-y-10">
                      {passengers.map((p, index) => {
                        const searchTerm = userSearchTerm[index] || "";
                        const filteredUsers = searchTerm.length > 1 
                          ? registeredUsers?.filter(u => 
                              u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              u.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
                            ).slice(0, 3) 
                          : [];

                        return (
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
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>

                            <div className="space-y-4 sm:space-y-6">
                              <div className="space-y-1.5 sm:space-y-2 relative">
                                <Label className="text-[9px] sm:text-[10px] font-black uppercase text-accent flex items-center gap-1.5 tracking-wider">
                                  <Search className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Rapid Profile Lookup
                                </Label>
                                <Input 
                                  placeholder="Search by name or mobile..." 
                                  value={searchTerm}
                                  onChange={(e) => setUserSearchTerm({ ...userSearchTerm, [index]: e.target.value })}
                                  className="bg-white border-accent/20 h-10 sm:h-11 text-sm focus-visible:ring-accent"
                                />
                                {filteredUsers && filteredUsers.length > 0 && (
                                  <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-2xl z-50 mt-2 overflow-hidden animate-in zoom-in-95 duration-200">
                                    {filteredUsers.map(user => (
                                      <button
                                        key={user.id}
                                        onClick={() => handleApplyProfile(index, user)}
                                        className="w-full text-left px-4 py-3 sm:px-5 sm:py-4 hover:bg-accent/5 border-b last:border-0 flex items-center gap-3 sm:gap-4 transition-colors"
                                      >
                                        <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg shrink-0">
                                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs sm:text-sm font-bold text-primary truncate">{user.displayName}</p>
                                          <p className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                            <Phone className="h-2.5 w-2.5" /> {user.phoneNumber || "No mobile set"}
                                          </p>
                                        </div>
                                        <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 ml-auto text-accent shrink-0" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Full Name</Label>
                                  <Input 
                                    value={p.passengerName} 
                                    onChange={(e) => updatePassenger(index, 'passengerName', e.target.value)}
                                    placeholder="Juan Dela Cruz"
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
                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Contact Number</Label>
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
                                    placeholder="Name or mobile"
                                    className="bg-white h-10 sm:h-11 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                <div className="space-y-1.5">
                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Email (Optional)</Label>
                                  <Input 
                                    type="email"
                                    value={p.passengerEmail} 
                                    onChange={(e) => updatePassenger(index, 'passengerEmail', e.target.value)}
                                    placeholder="juan@example.com"
                                    className="bg-white h-10 sm:h-11 text-sm"
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Demographic</Label>
                                  <Select disabled={!formData.routeId} value={p.fareId} onValueChange={(val) => updatePassenger(index, 'fareId', val)}>
                                    <SelectTrigger className="bg-white h-10 sm:h-11 text-sm">
                                      <SelectValue placeholder="Choose tier" />
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
                        );
                      })}
                    </div>
                  </section>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-12">
                  <div className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/10">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-3 sm:mb-4">Voyage Summary</h3>
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
                        <p className="font-bold text-sm">{formData.travelDate}</p>
                      </div>
                      <div>
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Vessel</Label>
                        <p className="font-bold text-sm truncate">{vessels?.find(v => v.id === selectedSchedule?.vesselId)?.name || 'TBA'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <Label className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase">Routing</Label>
                        <p className="font-bold text-xs sm:text-sm">{selectedRoute?.name}</p>
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
                                  {fare?.segmentLabel} • {p.passengerContact || 'No contact'}
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

                  <div className="space-y-4 sm:space-y-6 pt-4 border-t">
                    <div className="flex items-center justify-between p-4 sm:p-5 border-2 rounded-2xl bg-secondary/5">
                      <div className="space-y-0.5 pr-2">
                        <Label className="font-black text-primary uppercase text-[10px] sm:text-xs tracking-wider">Collect Payment Now</Label>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground italic leading-tight">Enabling this issues a CONFIRMED ticket immediately.</p>
                      </div>
                      <Switch 
                        checked={formData.isPaid} 
                        onCheckedChange={(checked) => setFormData({...formData, isPaid: checked})}
                        disabled={isWaitlistOnly}
                      />
                    </div>

                    <div className="p-6 sm:p-8 bg-primary rounded-2xl text-primary-foreground shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Banknote className="h-24 w-24 sm:h-32 sm:w-32 -rotate-12 translate-x-8 translate-y-8" />
                      </div>
                      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                          <p className="text-[10px] opacity-70 uppercase font-black tracking-widest mb-1">Total Payable</p>
                          <p className="text-3xl sm:text-5xl font-black">₱{isMounted ? totalFare.toLocaleString() : "---"}</p>
                        </div>
                        <div className="text-right space-y-2">
                          <Badge variant="outline" className="bg-white/10 text-white border-white/30 uppercase text-[9px] px-2 py-0.5 sm:px-3 sm:py-1 font-bold">
                            {isWaitlistOnly ? 'Waitlist Submission' : formData.isPaid ? 'Immediate Issuance' : 'Reservation Only'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-row items-center justify-between shrink-0">
            {bookingStep === 1 ? (
              <Button variant="outline" onClick={() => setIsNewBookingOpen(false)} className="h-10 sm:h-12 font-bold px-4 sm:px-8 text-xs sm:text-sm">
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
                onClick={handleCreateBooking} 
                className="bg-accent text-primary h-10 sm:h-12 px-6 sm:px-10 font-black uppercase tracking-wider hover:bg-accent/90 text-[10px] sm:text-xs"
              >
                {isWaitlistOnly ? 'Confirm' : formData.isPaid ? 'Issue Tickets' : 'Finalize'} <Check className="h-4 w-4 ml-1 sm:ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
