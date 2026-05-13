
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Ship, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Users, 
  Scan, 
  Ticket,
  ChevronRight,
  UserCheck,
  Calendar,
  Filter,
  RotateCcw
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function BoardingPage() {
  const db = useFirestore();
  const [todayPHT, setTodayPHT] = useState("");
  const [currentTimePHT, setCurrentTimePHT] = useState("");
  const [search, setSearch] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("all");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      
      const y = pht.getFullYear();
      const m = String(pht.getMonth() + 1).padStart(2, '0');
      const d = String(pht.getDate()).padStart(2, '0');
      setTodayPHT(`${y}-${m}-${d}`);
      
      const hh = String(pht.getHours()).padStart(2, '0');
      const mm = String(pht.getMinutes()).padStart(2, '0');
      setCurrentTimePHT(`${hh}:${mm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);
  const bookingsRef = useMemoFirebase(() => collection(db!, "bookings"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);

  const activeTodaySchedules = useMemo(() => {
    if (!schedules || !todayPHT) return [];
    return schedules.filter(s => {
      if (!s.isActive) return false;
      if (s.type === 'Daily') return true;
      if (s.type === 'Special' && s.specialDates?.includes(todayPHT)) return true;
      return false;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, todayPHT]);

  const filteredBookings = useMemo(() => {
    if (!bookings || !todayPHT) return [];
    
    return bookings.filter(b => {
      const matchesDate = b.travelDate === todayPHT;
      const matchesSchedule = selectedScheduleId === "all" || b.scheduleId === selectedScheduleId;
      const matchesStatus = b.status === "Confirmed" || b.status === "Used";
      const matchesSearch = 
        b.passengerName?.toLowerCase().includes(search.toLowerCase()) ||
        b.id?.toLowerCase().includes(search.toLowerCase());
      
      return matchesDate && matchesSchedule && matchesStatus && matchesSearch;
    }).sort((a: any, b: any) => {
      // Sort by boarding sequence if boarded, then by name
      if (a.status === 'Used' && b.status !== 'Used') return -1;
      if (a.status !== 'Used' && b.status === 'Used') return 1;
      return a.passengerName.localeCompare(b.passengerName);
    });
  }, [bookings, todayPHT, selectedScheduleId, search]);

  const handleBoardPassenger = (bookingId: string) => {
    if (!db) return;
    const bookingRef = doc(db, "bookings", bookingId);
    updateDocumentNonBlocking(bookingRef, {
      status: "Used",
      boardedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeboardPassenger = (bookingId: string) => {
    if (!db) return;
    const bookingRef = doc(db, "bookings", bookingId);
    updateDocumentNonBlocking(bookingRef, {
      status: "Confirmed",
      boardedAt: null,
      updatedAt: new Date().toISOString()
    });
  };

  const getTripInfo = (scheduleId: string) => {
    const s = schedules?.find(item => item.id === scheduleId);
    const r = routes?.find(item => item.id === s?.routeId);
    return {
      code: s?.tripCode || "N/A",
      route: r?.name || "Unknown Route",
      time: s?.departureTime || "--:--"
    };
  };

  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const boarded = filteredBookings.filter(b => b.status === "Used").length;
    return { total, boarded, pending: total - boarded };
  }, [filteredBookings]);

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
              <Scan className="h-5 w-5 text-accent" />
              Boarding Gate
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-full">
              <Calendar className="h-3 w-3" /> {todayPHT}
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Clock className="h-3 w-3" /> {currentTimePHT} PHT
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-1 border-none shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Select Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Active Trips" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Today's Trips</SelectItem>
                    {activeTodaySchedules.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.tripCode} - {s.departureTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Total Manifest</p>
                  <p className="text-2xl font-black">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-green-600 text-white">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Boarded</p>
                  <p className="text-2xl font-black">{stats.boarded}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-accent text-primary">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Remaining</p>
                  <p className="text-2xl font-black">{stats.pending}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b bg-secondary/10 py-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Passenger Manifest</CardTitle>
                  <CardDescription>Verify and board passengers for {selectedScheduleId === 'all' ? "all current voyages" : getTripInfo(selectedScheduleId).code}</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or ticket ID..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>
            </Header>
            <CardContent className="p-0">
              {isSchedulesLoading || isBookingsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : filteredBookings.length > 0 ? (
                <ScrollArea className="h-[60vh]">
                  <Table>
                    <TableHeader className="bg-secondary/30 sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[100px]">Seq</TableHead>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Trip Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => {
                        const trip = getTripInfo(booking.scheduleId);
                        const isBoarded = booking.status === "Used";
                        
                        return (
                          <TableRow key={booking.id} className={isBoarded ? "bg-green-50/50" : ""}>
                            <TableCell className="font-black text-primary/40 text-sm">
                              #{booking.boardingSequenceNumber || "--"}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-primary">{booking.passengerName}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">ID: #{booking.id}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] font-black uppercase text-accent border-accent/20">
                                  {trip.code}
                                </Badge>
                                <span className="text-xs font-bold">{trip.time}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                                {trip.route}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isBoarded ? (
                                <Badge className="bg-green-600 text-white gap-1 py-0.5">
                                  <UserCheck className="h-3 w-3" /> Boarded
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                  Confirmed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isBoarded ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleBoardPassenger(booking.id)}
                                  className="bg-primary hover:bg-primary/90 text-white font-bold h-8 px-4"
                                >
                                  Board <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDeboardPassenger(booking.id)}
                                    className="h-8 text-[10px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 uppercase"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" /> Deboard
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-32 opacity-30 flex flex-col items-center">
                  <Ticket className="h-16 w-16 mb-4" />
                  <p className="font-black uppercase tracking-widest">No passengers matching criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
