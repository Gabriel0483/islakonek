"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Ticket, 
  Search, 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Ship, 
  Tag, 
  BadgeInfo,
  QrCode,
  Download,
  Printer,
  Info
} from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function MyBookingsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isPassOpen, setIsPassOpen] = useState(false);

  // Queries
  const routesRef = useMemoFirebase(() => db ? collection(db, "routes") : null, [db]);
  const schedulesRef = useMemoFirebase(() => db ? collection(db, "schedules") : null, [db]);
  const bookingsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    // We search by userId
    return query(
      collection(db, "bookings"), 
      where("userId", "==", user.uid)
    );
  }, [db, user?.uid]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules } = useCollection(schedulesRef);
  const { data: userBookings, isLoading: isBookingsLoading } = useCollection(bookingsQuery);

  const filteredBookings = useMemo(() => {
    if (!userBookings) return [];
    return userBookings.filter(b => 
      b.passengerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.travelDate?.includes(search)
    ).sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [userBookings, search]);

  const getTripInfo = (booking: any) => {
    if (!booking) return { code: "TBA", route: "Unknown Route", time: "--:--" };
    const s = schedules?.find(item => item.id === booking.scheduleId);
    const r = routes?.find(item => item.id === booking.routeId);
    return {
      code: s?.tripCode || "TBA",
      route: r?.name || "Unknown Route",
      time: s?.departureTime || "--:--"
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed': return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'Reserved': return <Badge className="bg-blue-500">Reserved</Badge>;
      case 'Waitlisted': return <Badge className="bg-orange-500">Waitlisted</Badge>;
      case 'Used': return <Badge className="bg-indigo-600">Used (Boarded)</Badge>;
      case 'Suspended': return <Badge variant="destructive">Suspended</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      case 'Refunded': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Refunded</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black font-headline text-primary uppercase tracking-tight">My Bookings</h1>
            <p className="text-muted-foreground text-sm">Track your voyages and download boarding passes.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID or name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm"
            />
          </div>
        </header>

        {isBookingsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/50 rounded-2xl border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Retrieving Tickets...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBookings.map((booking) => {
              const trip = getTripInfo(booking);
              const isActive = ['Confirmed', 'Reserved', 'Waitlisted'].includes(booking.status);
              
              return (
                <Card 
                  key={booking.id} 
                  className={cn(
                    "border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white",
                    !isActive && "opacity-80"
                  )}
                >
                  <div className={cn(
                    "h-1.5 w-full",
                    booking.status === 'Confirmed' ? "bg-green-600" : 
                    booking.status === 'Waitlisted' ? "bg-orange-500" : 
                    booking.status === 'Used' ? "bg-indigo-600" : "bg-primary/20"
                  )} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-accent border-accent/20">
                             {trip.code}
                           </Badge>
                           <span className="text-[10px] font-mono font-bold text-muted-foreground">#{booking.id}</span>
                        </div>
                        <CardTitle className="text-lg font-bold text-primary truncate max-w-[250px]">
                          {booking.passengerName}
                        </CardTitle>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div className="space-y-1">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <Calendar className="h-2.5 w-2.5" /> Date
                         </p>
                         <p className="font-bold text-primary">{booking.travelDate}</p>
                       </div>
                       <div className="space-y-1">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <Clock className="h-2.5 w-2.5" /> Time
                         </p>
                         <p className="font-bold text-primary">{trip.time}</p>
                       </div>
                       <div className="col-span-2 space-y-1">
                         <p className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <MapPin className="h-2.5 w-2.5" /> Route
                         </p>
                         <p className="font-bold text-xs truncate">{trip.route}</p>
                       </div>
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between">
                      <p className="text-sm font-black text-primary">₱{booking.finalFare?.toLocaleString()}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs font-bold gap-1 group-hover:bg-accent group-hover:text-primary transition-colors"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsPassOpen(true);
                        }}
                      >
                        {['Confirmed', 'Used'].includes(booking.status) ? (
                          <><QrCode className="h-3.5 w-3.5" /> Pass</>
                        ) : (
                          <><Info className="h-3.5 w-3.5" /> Details</>
                        )}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-white opacity-50 flex flex-col items-center">
            <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-primary uppercase tracking-tight">No bookings found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
              Trips booked while signed in will appear here. Legacy records may be searched at the terminal desk.
            </p>
            <Button asChild variant="outline" className="mt-8 border-primary text-primary font-bold">
              <Link href="/trips">Book Your First Voyage</Link>
            </Button>
          </div>
        )}
      </main>

      {/* Pass View / Details Dialog */}
      <Dialog open={isPassOpen} onOpenChange={setIsPassOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[450px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
             <DialogTitle>Ticket Info</DialogTitle>
             <DialogDescription>Full itinerary and boarding pass</DialogDescription>
          </DialogHeader>
          
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative mx-auto my-4 border">
            <div className={cn(
              "p-6 text-white text-center space-y-2",
              ['Confirmed', 'Used'].includes(selectedBooking?.status) ? "bg-primary" : "bg-muted-foreground"
            )}>
              <div className="flex justify-center mb-2">
                <div className="bg-white/20 p-2 rounded-2xl">
                  <Ship className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-2xl font-black font-headline uppercase tracking-tight">
                {['Confirmed', 'Used'].includes(selectedBooking?.status) ? 'Boarding Pass' : 'Ticket Summary'}
              </h2>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-dashed pb-4">
                <div className="flex-1 mr-2 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Passenger Name</p>
                  <p className="text-lg font-black text-primary uppercase truncate">{selectedBooking?.passengerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</p>
                  <p className="font-mono text-sm font-bold">#{selectedBooking?.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Trip ID</p>
                  <p className="font-black text-accent uppercase">{getTripInfo(selectedBooking).code}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedBooking?.status)}</div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Travel Date</p>
                  <p className="font-bold text-sm">{selectedBooking?.travelDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Departure</p>
                  <p className="font-bold text-sm">{getTripInfo(selectedBooking).time}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Routing</p>
                  <p className="font-bold text-sm truncate">{getTripInfo(selectedBooking).route}</p>
                </div>
              </div>

              {['Confirmed', 'Used'].includes(selectedBooking?.status) ? (
                <div className="flex flex-col items-center justify-center py-6 border-t border-dashed">
                  <div className="bg-secondary/20 p-4 rounded-2xl mb-4">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOARDING_PASS_${selectedBooking?.id}_${selectedBooking?.boardingSequenceNumber || '0'}`}
                      alt="Pass QR"
                      width={120}
                      height={120}
                      className="mix-blend-multiply"
                    />
                  </div>
                  <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic text-center px-4">
                    {selectedBooking?.status === 'Used' ? 'ALREADY BOARDED' : 'PRESENT AT BOARDING GATE'}
                  </p>
                  {selectedBooking?.boardingSequenceNumber && (
                    <div className="mt-4 flex flex-col items-center">
                       <p className="text-[9px] font-bold text-muted-foreground uppercase">Seq Number</p>
                       <p className="text-2xl font-black text-primary">#{selectedBooking.boardingSequenceNumber}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-secondary/10 p-4 rounded-xl border-2 border-dashed text-center">
                   <BadgeInfo className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                   <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                     Please visit the terminal check-in desk to finalize payment and issue your boarding pass.
                   </p>
                </div>
              )}
            </div>

            <div className="bg-secondary/30 p-4 flex gap-2">
              <Button className="flex-1 bg-primary text-white font-bold h-10 text-xs" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print Pass
              </Button>
              <Button variant="outline" className="flex-1 font-bold h-10 text-xs">
                <Download className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>
          <div className="mt-2 text-center pb-6">
            <Button variant="link" className="text-white text-xs opacity-70" onClick={() => setIsPassOpen(false)}>
              Close Ticket View
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
