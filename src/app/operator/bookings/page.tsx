
"use client";

import { useState, useMemo } from "react";
import { 
  Ticket, 
  Plus, 
  Search, 
  Loader2, 
  Calendar, 
  User, 
  Phone, 
  CheckCircle2, 
  Ship,
  Clock,
  Waypoints,
  CreditCard,
  AlertCircle,
  Banknote
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { 
  setDocumentNonBlocking,
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BookingsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
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
  const [search, setSearch] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    routeId: "",
    scheduleId: "",
    fareId: "",
    passengerName: "",
    passengerContact: "",
    paymentStatus: "Paid" as const
  });

  const filteredRoutes = routes || [];
  const selectedRoute = routes?.find(r => r.id === formData.routeId);
  const availableSchedules = schedules?.filter(s => s.routeId === formData.routeId && s.isActive);
  const availableFares = fares?.filter(f => f.routeId === formData.routeId);
  const selectedFare = fares?.find(f => f.id === formData.fareId);
  const selectedSchedule = schedules?.find(s => s.id === formData.scheduleId);

  const handleCreateBooking = () => {
    if (!db || !formData.routeId || !formData.scheduleId || !formData.fareId || !formData.passengerName) return;

    const newId = Math.random().toString(36).substr(2, 9);
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

  const filteredBookings = bookings?.filter(b => 
    b.passengerName.toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getVesselName = (id: string) => {
    const schedule = schedules?.find(s => s.id === id);
    return vessels?.find(v => v.id === schedule?.vesselId)?.name || "Unknown Vessel";
  };

  const getSeatsUsed = (scheduleId: string) => {
    return bookings?.filter(b => b.scheduleId === scheduleId && b.paymentStatus !== "Cancelled").length || 0;
  };

  const isLoading = isUserLoading || isBookingsLoading;

  return (
    <SidebarProvider>
      <OperatorSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent" />
            Desk Bookings
          </h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by passenger name or Ticket ID..." 
                className="pl-10 h-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsNewBookingOpen(true)} className="bg-accent text-primary font-bold hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" /> New Ticket Booking
            </Button>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-lg font-bold">Recent Desk Bookings</CardTitle>
              <CardDescription>Live manifest of ticket issued at this counter.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Synchronizing manifest...</p>
                </div>
              ) : filteredBookings && filteredBookings.length > 0 ? (
                <Table>
                  <TableHeader className="bg-secondary/30">
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Route & Schedule</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Fare</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-accent/5">
                        <TableCell className="font-mono text-[10px] font-bold">#{booking.id}</TableCell>
                        <TableCell>
                          <div className="font-bold">{booking.passengerName}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2 w-2" /> {booking.passengerContact || "No contact"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold">{getRouteName(booking.routeId)}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                             <Clock className="h-2 w-2" /> {schedules?.find(s => s.id === booking.scheduleId)?.departureTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                            {booking.segmentLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-black text-primary">₱{booking.finalFare?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={booking.paymentStatus === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {booking.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 opacity-50">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold">No bookings found</h3>
                  <p className="text-sm">Issued tickets will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-accent" /> New Counter Booking
              </DialogTitle>
              <DialogDescription>Process a walk-in passenger booking for active trips.</DialogDescription>
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
                          <SelectItem key={s.id} value={s.id}>{s.departureTime} ({vessels?.find(v => v.id === s.vesselId)?.name})</SelectItem>
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
                          {selectedSchedule?.passengerCapacity - getSeatsUsed(formData.scheduleId)} Seats Remaining
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      Capacity: {selectedSchedule?.passengerCapacity}
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
                        placeholder="e.g. Juan Dela Cruz"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input 
                        id="contact" 
                        value={formData.passengerContact} 
                        onChange={(e) => setFormData({...formData, passengerContact: e.target.value})}
                        placeholder="e.g. 0912 345 6789"
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
                        <p className="text-4xl font-black">₱{selectedFare.finalFare?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                          {selectedFare.isVatExempt ? "VAT Exempt" : "VAT Inclusive"}
                        </Badge>
                        <p className="text-[10px] mt-1 opacity-70">Segment: {selectedFare.segmentLabel}</p>
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
