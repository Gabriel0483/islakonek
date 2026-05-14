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
  UserPlus
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
import Image from "next/image";

interface PassengerForm {
  passengerName: string;
  passengerDob: string;
  passengerEmail: string;
  passengerContact: string;
  fareId: string;
}

export default function DeskBookingsPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [todayPHT, setTodayPHT] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pht = new Date(utc + (3600000 * 8));
    const y = pht.getFullYear();
    const m = String(pht.getMonth() + 1).padStart(2, '0');
    const d = String(pht.getDate()).padStart(2, '0');
    setTodayPHT(`${y}-${m}-${d}`);
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
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    routeId: "",
    scheduleId: "",
    emergencyContact: "",
    travelDate: "",
    isPaid: true
  });

  const [passengers, setPassengers] = useState<PassengerForm[]>([{
    passengerName: "",
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
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
    if (!db || !formData.routeId || !formData.scheduleId || !formData.travelDate || !formData.emergencyContact) return;

    let confirmedCount = 0;
    const tripBookings = bookings?.filter(b => 
      b.scheduleId === formData.scheduleId && 
      b.travelDate === formData.travelDate && 
      (b.status === 'Confirmed' || b.status === 'Used')
    ) || [];
    let currentSeq = tripBookings.length + 1;

    passengers.forEach((p, index) => {
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
        emergencyContact: formData.emergencyContact,
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

      if (status === 'Confirmed' && confirmedCount === 0) {
        setLastCreatedBooking(newBookingData);
        setIsBoardingPassOpen(true);
        confirmedCount++;
      }
    });

    setIsNewBookingOpen(false);
    setFormData({
      routeId: "",
      scheduleId: "",
      emergencyContact: "",
      travelDate: todayPHT,
      isPaid: true
    });
    setPassengers([{
      passengerName: "",
      passengerDob: "",
      passengerEmail: "",
      passengerContact: "",
      fareId: ""
    }]);
    setUserSearchTerm({});
  };

  const deskBookings = bookings?.filter(b => b.bookingSource === "Desk")
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";

  const totalFare = passengers.reduce((sum, p) => {
    const fare = fares?.find(f => f.id === p.fareId);
    return sum + (fare?.finalFare || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent" />
            Desk Bookings (Counter)
          </h1>
        </div>
        <Link href="/admin/manage-bookings">
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardList className="h-4 w-4" /> View Full Manifest
          </Button>
        </Link>
      </header>

      <main className="p-6 space-y-6 container mx-auto">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-primary text-primary-foreground">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Counter Sales</CardTitle>
                <CardDescription className="text-primary-foreground/70">Process tickets for walk-in passengers.</CardDescription>
              </div>
              <Button onClick={() => setIsNewBookingOpen(true)} className="bg-accent text-primary font-bold hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" /> New Ticket Group
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="p-20 text-center">
               <Ticket className="h-20 w-20 text-accent/20 mx-auto mb-6" />
               <h2 className="text-3xl font-black text-primary mb-2">Ready to Issue?</h2>
               <p className="text-muted-foreground mb-8 max-w-md mx-auto">Select the trip and demographics to generate valid tickets and manifest entries for walk-in passengers.</p>
               <Button onClick={() => setIsNewBookingOpen(true)} size="lg" className="bg-primary px-12 h-14 text-lg">
                 Start Ticket Booking
               </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recently Issued (Desk)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isBookingsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : deskBookings && deskBookings.length > 0 ? (
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead>Trip/Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deskBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-[10px] font-bold">#{booking.id}</TableCell>
                      <TableCell className="font-bold">{booking.passengerName}</TableCell>
                      <TableCell className="text-xs">{booking.travelDate}</TableCell>
                      <TableCell>
                        <div className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</div>
                        <div className="text-[10px] text-muted-foreground">{getRouteName(booking.routeId)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{booking.status}</Badge>
                      </TableCell>
                      <TableCell className="font-black text-primary">
                        ₱{isMounted ? booking.finalFare?.toLocaleString() : "---"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 opacity-30 text-xs font-bold uppercase">No recent counter sales</div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Boarding Pass</DialogTitle>
            <DialogDescription>Digital boarding pass with voyage details and QR code.</DialogDescription>
          </DialogHeader>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="bg-primary p-6 text-primary-foreground text-center space-y-2">
              <div className="flex justify-center mb-2">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Ship className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Boarding Pass</h2>
              <p className="text-xs opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-dashed pb-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Passenger Name</Label>
                  <p className="text-lg font-black text-primary uppercase">{lastCreatedBooking?.passengerName}</p>
                </div>
                <div className="text-right">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</Label>
                  <p className="font-mono text-sm font-bold">#{lastCreatedBooking?.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Trip ID</Label>
                  <p className="font-black text-accent uppercase">{getTripCode(lastCreatedBooking?.scheduleId)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Date of Travel</Label>
                  <p className="font-bold">{lastCreatedBooking?.travelDate}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Departure Time</Label>
                  <p className="font-bold">{getDeparture(lastCreatedBooking?.scheduleId)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</Label>
                  <div className="bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">
                    {lastCreatedBooking?.boardingSequenceNumber || "N/A"}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Routing</Label>
                  <p className="font-bold text-sm">{getRouteName(lastCreatedBooking?.routeId)}</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-6 border-t border-dashed">
                <div className="bg-secondary/20 p-4 rounded-2xl mb-4">
                  <Image 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOARDING_PASS_${lastCreatedBooking?.id}_${lastCreatedBooking?.boardingSequenceNumber}`}
                    alt="Boarding Pass QR"
                    width={150}
                    height={150}
                    className="mix-blend-multiply"
                  />
                </div>
                <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic">Scan at the boarding gate</p>
              </div>
            </div>

            <div className="bg-secondary/30 p-4 flex gap-2">
              <Button className="flex-1 bg-primary text-white font-bold" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print Representative Pass
              </Button>
              <Button variant="outline" className="flex-1 font-bold">
                <Download className="h-4 w-4 mr-2" /> Save Image
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
        <DialogContent className="sm:max-w-[850px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" /> Desk Issuance (Multi-Passenger)
            </DialogTitle>
            <DialogDescription>Process tickets for walks-in groups on active trips.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-4">
            <div className="grid gap-6 py-4">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarIcon className="h-3 w-3" /> Travel Date</Label>
                  <Input 
                    type="date" 
                    value={formData.travelDate} 
                    onChange={(e) => setFormData({...formData, travelDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Route</Label>
                  <Select value={formData.routeId} onValueChange={(val) => setFormData({...formData, routeId: val, scheduleId: ""})}>
                    <SelectTrigger>
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
                  <Label>Select Schedule</Label>
                  <Select disabled={!formData.routeId} value={formData.scheduleId} onValueChange={(val) => setFormData({...formData, scheduleId: val})}>
                    <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="emergency" className="flex items-center gap-1.5"><Heart className="h-3 w-3 text-destructive" /> Emergency Contact Number (Group)</Label>
                <Input 
                  id="emergency" 
                  value={formData.emergencyContact} 
                  onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                  placeholder="Name and number for entire group"
                />
              </div>

              {formData.scheduleId && formData.travelDate && (
                <div className={`p-4 rounded-lg flex items-center justify-between border ${isWaitlistOnly ? 'bg-orange-50 border-orange-200' : isFull ? 'bg-red-50 border-red-200' : 'bg-secondary/20'}`}>
                  <div className="flex items-center gap-3">
                    {isWaitlistOnly ? <ListOrdered className="h-5 w-5 text-orange-600" /> : isFull ? <AlertCircle className="h-5 w-5 text-red-600" /> : <Ship className="h-5 w-5 text-primary" />}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Availability for {formData.travelDate}</p>
                      <p className={`font-bold ${isFull ? 'text-red-700' : isWaitlistOnly ? 'text-orange-700' : 'text-primary'}`}>
                        {isFull ? 'TRIP FULL' : isWaitlistOnly ? 'WAITLISTING' : `${currentCapacity - seatsUsed} Seats Available`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <section className="space-y-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-lg font-bold">
                    <Users className="h-5 w-5 text-accent" /> Passengers ({passengers.length})
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPassenger} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Another Passenger
                  </Button>
                </div>

                <div className="space-y-8">
                  {passengers.map((p, index) => {
                    const searchTerm = userSearchTerm[index] || "";
                    const filteredUsers = searchTerm.length > 1 
                      ? registeredUsers?.filter(u => 
                          u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).slice(0, 3) 
                      : [];

                    return (
                      <Card key={index} className="relative bg-secondary/10 border-none shadow-none overflow-visible">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute -top-3 -right-3 h-7 w-7 bg-white shadow-sm border rounded-full text-destructive hover:text-destructive hover:bg-white z-20"
                          onClick={() => removePassenger(index)}
                          disabled={passengers.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-2 relative">
                            <Label className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                              <Search className="h-3 w-3" /> Rapid Profile Lookup
                            </Label>
                            <Input 
                              placeholder="Search by name or email..." 
                              value={searchTerm}
                              onChange={(e) => setUserSearchTerm({ ...userSearchTerm, [index]: e.target.value })}
                              className="bg-white border-accent/20 focus-visible:ring-accent"
                            />
                            {filteredUsers && filteredUsers.length > 0 && (
                              <div className="absolute top-full left-0 w-full bg-white border rounded-md shadow-lg z-50 mt-1 animate-in fade-in slide-in-from-top-1">
                                {filteredUsers.map(user => (
                                  <button
                                    key={user.id}
                                    onClick={() => handleApplyProfile(index, user)}
                                    className="w-full text-left px-4 py-3 hover:bg-secondary/50 border-b last:border-0 flex items-center gap-3 transition-colors"
                                  >
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-primary">{user.displayName}</p>
                                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                                    </div>
                                    <UserPlus className="h-4 w-4 ml-auto text-accent" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Passenger #{index + 1} Name</Label>
                              <Input 
                                value={p.passengerName} 
                                onChange={(e) => updatePassenger(index, 'passengerName', e.target.value)}
                                placeholder="Juan Dela Cruz"
                                className="bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Date of Birth</Label>
                              <Input 
                                type="date"
                                value={p.passengerDob} 
                                onChange={(e) => updatePassenger(index, 'passengerDob', e.target.value)}
                                className="bg-white"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Contact Number</Label>
                              <Input 
                                value={p.passengerContact} 
                                onChange={(e) => updatePassenger(index, 'passengerContact', e.target.value)}
                                placeholder="09XX XXX XXXX"
                                className="bg-white"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Fare Demographic</Label>
                              <Select disabled={!formData.routeId} value={p.fareId} onValueChange={(val) => updatePassenger(index, 'fareId', val)}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Choose demographic" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFares?.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.segmentLabel} - ₱{f.finalFare}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="font-bold">Mark Group as Paid</Label>
                    <p className="text-[10px] text-muted-foreground italic">Instant Confirmation for all</p>
                  </div>
                  <Switch 
                    checked={formData.isPaid} 
                    onCheckedChange={(checked) => setFormData({...formData, isPaid: checked})}
                    disabled={isWaitlistOnly}
                  />
                </div>

                <div className="p-6 bg-primary rounded-xl text-primary-foreground">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs opacity-70 uppercase font-bold">Total Group Fare</p>
                      <p className="text-4xl font-black">₱{isMounted ? totalFare.toLocaleString() : "---"}</p>
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 uppercase text-[10px]">
                      {isWaitlistOnly ? 'Waitlist Entry' : formData.isPaid ? 'Confirmed Tickets' : 'Reserved Seats'}
                    </Badge>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsNewBookingOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateBooking} 
              className="bg-primary text-white"
              disabled={!formData.scheduleId || !formData.travelDate || !formData.emergencyContact || isFull || passengers.some(p => !p.passengerName || !p.fareId)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> {isWaitlistOnly ? 'Add Group to Waitlist' : 'Issue Group Tickets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-auto"><table className="w-full text-sm">{children}</table></div>;
}
function TableHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <thead className={className}>{children}</thead>;
}
function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}
function TableRow({ children, className }: { children: React.ReactNode, className?: string }) {
  return <tr className={`border-b hover:bg-muted/50 transition-colors ${className}`}>{children}</tr>;
}
function TableHead({ children, className }: { children: React.ReactNode, className?: string }) {
  return <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${className}`}>{children}</th>;
}
function TableCell({ children, className }: { children: React.ReactNode, className?: string }) {
  return <td className={`p-4 align-middle ${className}`}>{children}</td>;
}
