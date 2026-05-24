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
  Info,
  X,
  CreditCard,
  Building2,
  Globe
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
      case 'Confirmed': return <Badge className="bg-green-600 uppercase font-black text-[9px] h-5">Confirmed</Badge>;
      case 'Reserved': return <Badge className="bg-blue-500 uppercase font-black text-[9px] h-5">Reserved</Badge>;
      case 'Waitlisted': return <Badge className="bg-orange-500 uppercase font-black text-[9px] h-5">Waitlisted</Badge>;
      case 'Used': return <Badge className="bg-indigo-600 uppercase font-black text-[9px] h-5">Boarded</Badge>;
      case 'Suspended': return <Badge variant="destructive" className="uppercase font-black text-[9px] h-5">Suspended</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground uppercase font-black text-[9px] h-5">Cancelled</Badge>;
      case 'Refunded': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 uppercase font-black text-[9px] h-5">Refunded</Badge>;
      default: return <Badge variant="outline" className="uppercase font-black text-[9px] h-5">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'Desk') {
       return (
         <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary/60 flex items-center gap-1">
           <Building2 className="h-2 w-2" /> Terminal Issued
         </Badge>
       );
    }
    return (
      <Badge variant="outline" className="text-[8px] font-black uppercase border-accent/20 text-accent/60 flex items-center gap-1">
        <Globe className="h-2 w-2" /> Web Booking
      </Badge>
    );
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
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-5xl space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-headline text-primary uppercase tracking-tight">My Bookings</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Track your voyages and download boarding passes.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID or name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-none shadow-sm h-11"
            />
          </div>
        </header>

        {isBookingsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white/50 rounded-2xl border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Retrieving Tickets...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredBookings.map((booking) => {
              const trip = getTripInfo(booking);
              const isActive = ['Confirmed', 'Reserved', 'Waitlisted'].includes(booking.status);
              const canShowPass = booking.status === 'Confirmed' || booking.status === 'Used';
              
              return (
                <Card 
                  key={booking.id} 
                  className={cn(
                    "border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white cursor-pointer active:scale-[0.98]",
                    !isActive && "opacity-80"
                  )}
                  onClick={() => {
                    setSelectedBooking(booking);
                    setIsPassOpen(true);
                  }}
                >
                  <div className={cn(
                    "h-1.5 w-full",
                    booking.status === 'Confirmed' ? "bg-green-600" : 
                    booking.status === 'Waitlisted' ? "bg-orange-500" : 
                    booking.status === 'Used' ? "bg-indigo-600" : "bg-primary/20"
                  )} />
                  <CardHeader className="p-4 sm:p-5 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                           <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-accent border-accent/20 h-4 px-1.5">
                             {trip.code}
                           </Badge>
                           <span className="text-[10px] font-mono font-bold text-muted-foreground">#{booking.id}</span>
                           {getSourceBadge(booking.bookingSource)}
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-primary truncate mt-1">
                          {booking.passengerName}
                        </CardTitle>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                       <div className="space-y-0.5">
                         <p className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <Calendar className="h-2.5 w-2.5" /> Date
                         </p>
                         <p className="font-bold text-primary">{booking.travelDate}</p>
                       </div>
                       <div className="space-y-0.5">
                         <p className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <Clock className="h-2.5 w-2.5" /> Time
                         </p>
                         <p className="font-bold text-primary">{trip.time}</p>
                       </div>
                       <div className="col-span-2 space-y-0.5">
                         <p className="text-[8px] sm:text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                           <MapPin className="h-2.5 w-2.5" /> Route
                         </p>
                         <p className="font-bold text-[11px] truncate leading-tight">{trip.route}</p>
                       </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between">
                      <p className="text-xs sm:text-sm font-black text-primary">₱{booking.finalFare?.toLocaleString()}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-[10px] sm:text-xs font-bold gap-1.5 hover:bg-accent hover:text-primary transition-colors uppercase tracking-wider"
                      >
                        {canShowPass ? (
                          <><QrCode className="h-3.5 w-3.5" /> View Pass</>
                        ) : (
                          <><Info className="h-3.5 w-3.5" /> Details</>
                        )}
                        <ChevronRight className="h-3 w-3" />
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
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[420px] p-0 overflow-y-auto max-h-[90vh] bg-transparent border-none shadow-none no-scrollbar">
          <DialogHeader className="sr-only">
             <DialogTitle>Ticket Details</DialogTitle>
             <DialogDescription>Itinerary and boarding pass for passenger</DialogDescription>
          </DialogHeader>
          
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative mx-auto my-2 border animate-in zoom-in-95 duration-200">
            <div className={cn(
              "p-3 text-white text-center space-y-1 relative",
              ['Confirmed', 'Used'].includes(selectedBooking?.status) ? "bg-primary" : "bg-muted-foreground"
            )}>
              <button 
                onClick={() => setIsPassOpen(false)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <div className="flex justify-center mb-0.5">
                <div className="bg-white/20 p-1.5 rounded-xl shadow-inner">
                  <Ship className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-lg font-black font-headline uppercase tracking-tight leading-none">
                {['Confirmed', 'Used'].includes(selectedBooking?.status) ? 'Digital Pass' : 'Ticket Summary'}
              </h2>
              <p className="text-[7px] opacity-80 font-bold uppercase tracking-[0.2em]">Isla Konek Maritime</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start border-b border-dashed pb-3">
                <div className="flex-1 mr-2 overflow-hidden text-left">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Passenger</p>
                  <p className="text-lg font-black text-primary uppercase truncate leading-tight">{selectedBooking?.passengerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Ticket ID</p>
                  <p className="font-mono text-xs font-black text-primary">#{selectedBooking?.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="space-y-0.5 text-left">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Trip Code</p>
                  <p className="font-black text-accent text-sm uppercase leading-none">{getTripInfo(selectedBooking).code}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedBooking?.status)}</div>
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1">
                    <Calendar className="h-2 w-2" /> Date
                  </p>
                  <p className="font-bold text-xs text-primary">{selectedBooking?.travelDate}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1 justify-end">
                    <Clock className="h-2 w-2" /> Time
                  </p>
                  <p className="font-bold text-xs text-primary">{getTripInfo(selectedBooking).time}</p>
                </div>
                <div className="col-span-2 space-y-0.5 bg-secondary/10 p-2 rounded-lg border border-secondary/50 text-left">
                  <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1">
                    <MapPin className="h-2 w-2" /> Routing
                  </p>
                  <p className="font-bold text-[10px] text-primary leading-tight">{getTripInfo(selectedBooking).route}</p>
                </div>
              </div>

              {['Confirmed', 'Used'].includes(selectedBooking?.status) ? (
                <div className="flex items-center justify-around py-3 border-t border-dashed mt-1">
                  <div className="bg-secondary/20 p-2 rounded-2xl shadow-inner">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=BOARDING_PASS_${selectedBooking?.id}_${selectedBooking?.boardingSequenceNumber || '0'}`}
                      alt="Pass QR"
                      width={110}
                      height={110}
                      className="mix-blend-multiply"
                    />
                  </div>
                  {selectedBooking?.boardingSequenceNumber && (
                    <div className="flex flex-col items-center p-2 bg-primary/5 rounded-xl border border-primary/10 min-w-[100px]">
                       <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Sequence</p>
                       <p className="text-3xl font-black text-primary leading-none">#{selectedBooking.boardingSequenceNumber}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50/80 p-4 rounded-xl border-2 border-dashed border-blue-200 text-center space-y-2">
                   <BadgeInfo className="h-7 w-7 text-blue-500 mx-auto" />
                   <div>
                     <p className="text-xs font-black text-blue-800 uppercase tracking-tight">Payment Verification Required</p>
                     <p className="text-[9px] font-medium text-blue-700 leading-relaxed max-w-[240px] mx-auto">
                       Finalize payment at the terminal desk within 60 minutes of departure to activate your pass.
                     </p>
                   </div>
                </div>
              )}
            </div>

            <div className="bg-secondary/30 p-3 flex gap-2 print:hidden border-t">
              <Button className="flex-1 bg-primary text-white font-black h-9 text-xs shadow-lg" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
              </Button>
              <Button variant="outline" className="flex-1 font-black h-9 text-xs bg-white border-primary/20 text-primary shadow-sm">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Save
              </Button>
            </div>
          </div>
          <div className="text-center pb-4">
            <Button variant="link" className="text-white text-[10px] opacity-50 hover:opacity-100 font-bold" onClick={() => setIsPassOpen(false)}>
              Close View
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
