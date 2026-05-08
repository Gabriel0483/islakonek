
"use client";

import { useState, useEffect } from "react";
import { 
  Ticket, 
  Plus, 
  Loader2, 
  User, 
  Phone, 
  CheckCircle2, 
  Ship,
  Clock,
  Banknote,
  ClipboardList,
  Tag
} from "lucide-react";
import Link from "next/link";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { 
  setDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DeskBookingsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);
  const faresRef = useMemoFirebase(() => collection(db!, "fares"), [db]);
  const bookingsRef = useMemoFirebase(() => collection(db!, "bookings"), [db]);
  const vesselsRef = useMemoFirebase(() => collection(db!, "vessels"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules } = useCollection(schedulesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: vessels } = useCollection(vesselsRef);

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    routeId: "",
    scheduleId: "",
    fareId: "",
    passengerName: "",
    passengerContact: "",
    paymentStatus: "Paid" as const
  });

  const selectedRoute = routes?.find(r => r.id === formData.routeId);
  const availableSchedules = schedules?.filter(s => s.routeId === formData.routeId && s.isActive);
  const availableFares = fares?.filter(f => f.routeId === formData.routeId);
  const selectedFare = fares?.find(f => f.id === formData.fareId);
  const selectedSchedule = schedules?.find(s => s.id === formData.scheduleId);

  const handleCreateBooking = () => {
    if (!db || !formData.routeId || !formData.scheduleId || !formData.fareId || !formData.passengerName) return;

    // Generate 6-digit alpha-numeric booking ID
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = new Date().toISOString();
    const bookingRef = doc(db, "bookings", newId);

    setDocumentNonBlocking(bookingRef, {
      id: newId,
      ...formData,
      segmentLabel: selectedFare?.segmentLabel || "",
      finalFare: selectedFare?.finalFare || 0,
      bookingSource: "Desk",
      createdAt: timestamp,
      updatedAt: timestamp
    }, { merge: true });

    setIsNewBookingOpen(false);
    setFormData({
      routeId: "",
      scheduleId: "",
      fareId: "",
      passengerName: "",
      passengerContact: "",
      paymentStatus: "Paid"
    });
  };

  const deskBookings = bookings?.filter(b => b.bookingSource === "Desk")
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  const getSeatsUsed = (scheduleId: string) => {
    return bookings?.filter(b => b.scheduleId === scheduleId && b.paymentStatus !== "Cancelled").length || 0;
  };

  const currentCapacity = selectedSchedule?.passengerCapacity || vessels?.find(v => v.id === selectedSchedule?.vesselId)?.passengerCapacity || 0;

  const isLoading = isUserLoading || isBookingsLoading;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
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

        <main className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Counter Sales</CardTitle>
                  <CardDescription className="text-primary-foreground/70">Process a new ticket for walk-in passengers.</CardDescription>
                </div>
                <Button onClick={() => setIsNewBookingOpen(true)} className="bg-accent text-primary font-bold hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" /> New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-12 text-center">
                 <Ticket className="h-16 w-16 text-accent/20 mx-auto mb-4" />
                 <h2 className="text-2xl font-black text-primary mb-2">Ready to Issue?</h2>
                 <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Select the trip and demographic to generate a valid ticket ID and manifest entry.</p>
                 <Button onClick={() => setIsNewBookingOpen(true)} size="lg" className="bg-primary px-8">
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
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : deskBookings && deskBookings.length > 0 ? (
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Trip/Route</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deskBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-[10px] font-bold">#{booking.id}</TableCell>
                        <TableCell className="font-bold">{booking.passengerName}</TableCell>
                        <TableCell>
                          <div className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</div>
                          <div className="text-[10px] text-muted-foreground">{getRouteName(booking.routeId)}</div>
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

        <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-accent" /> Counter Issuance
              </DialogTitle>
              <DialogDescription>Process walk-in booking for active trips.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] pr-4">
              <div className="grid gap-6 py-4">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Route</Label>
                    <Select value={formData.routeId} onValueChange={(val) => setFormData({...formData, routeId: val, scheduleId: "", fareId: ""})}>
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
                          <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime} ({vessels?.find(v => v.id === s.vesselId)?.name})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {formData.scheduleId && (
                  <div className="bg-secondary/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Ship className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Availability</p>
                        <p className="font-bold text-primary">
                          {currentCapacity - getSeatsUsed(formData.scheduleId)} Seats Remaining
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      Max: {currentCapacity}
                    </Badge>
                  </div>
                )}

                <section className="space-y-4 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" /> Passenger Information
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passengerName">Full Name</Label>
                      <Input 
                        id="passengerName" 
                        value={formData.passengerName} 
                        onChange={(e) => setFormData({...formData, passengerName: e.target.value})}
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input 
                        id="contact" 
                        value={formData.passengerContact} 
                        onChange={(e) => setFormData({...formData, passengerContact: e.target.value})}
                        placeholder="0912 345 6789"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-accent" /> Pricing & Segment
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fare Type</Label>
                      <Select disabled={!formData.routeId} value={formData.fareId} onValueChange={(val) => setFormData({...formData, fareId: val})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose demographic" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFares?.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.segmentLabel} - ₱{f.finalFare}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select value={formData.paymentStatus} onValueChange={(val: any) => setFormData({...formData, paymentStatus: val})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid (Cash/Card)</SelectItem>
                          <SelectItem value="Pending">Pending / Reserved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {selectedFare && (
                  <div className="mt-4 p-6 bg-primary rounded-xl text-primary-foreground">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs opacity-70 uppercase font-bold">Total Fare Amount</p>
                        <p className="text-4xl font-black">₱{isMounted ? selectedFare.finalFare?.toLocaleString() : "---"}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                          {selectedFare.isVatExempt ? "VAT Exempt" : "VAT Inclusive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setIsNewBookingOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateBooking} 
                className="bg-primary text-white"
                disabled={!formData.fareId || !formData.passengerName || !formData.scheduleId}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Issue Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
