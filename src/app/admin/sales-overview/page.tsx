"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Banknote, 
  TrendingUp, 
  Users, 
  ListOrdered, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  BarChart3, 
  Ticket, 
  ArrowRight, 
  Ship, 
  Search, 
  Filter, 
  Clock, 
  Flame, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  Zap, 
  BarChart 
} from "lucide-react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin-nav";
import { 
  Bar, 
  BarChart as RechartsBarChart, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SalesOverviewPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [occupancySearch, setOccupancySearch] = useState("");
  const [occupancyDateFilter, setOccupancyDateFilter] = useState("");

  useEffect(() => {
    setIsMounted(true);
    // Set default filter to today in PHT
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pht = new Date(utc + (3600000 * 8));
    setOccupancyDateFilter(format(pht, "yyyy-MM-dd"));
  }, []);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "bookings");
  }, [db]);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesRef);

  const stats = useMemo(() => {
    if (!bookings) return { totalRevenue: 0, totalPassengers: 0, waitlistCount: 0, confirmedCount: 0, totalBookings: 0 };
    
    return bookings.reduce((acc, b) => {
      acc.totalBookings += 1;
      if (['Confirmed', 'Used'].includes(b.status)) {
        acc.totalRevenue += (b.finalFare || 0);
        acc.totalPassengers += 1;
        acc.confirmedCount += 1;
      } else if (b.status === 'Waitlisted') {
        acc.waitlistCount += 1;
      }
      return acc;
    }, { totalRevenue: 0, totalPassengers: 0, waitlistCount: 0, confirmedCount: 0, totalBookings: 0 });
  }, [bookings]);

  const dailyRevenueData = useMemo(() => {
    if (!bookings) return [];
    
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), i);
      return format(d, "yyyy-MM-dd");
    }).reverse();

    return last14Days.map(date => {
      const dayBookings = bookings.filter(b => 
        ['Confirmed', 'Used'].includes(b.status) && 
        (b.travelDate === date)
      );
      
      const revenue = dayBookings.reduce((sum, b) => sum + (b.finalFare || 0), 0);
      return {
        date: format(parseISO(date), "MMM dd"),
        revenue
      };
    });
  }, [bookings]);

  const routeVolumeData = useMemo(() => {
    if (!bookings || !routes) return [];

    const volumeMap = bookings.reduce((acc: any, b) => {
      if (['Confirmed', 'Used'].includes(b.status)) {
        acc[b.routeId] = (acc[b.routeId] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(volumeMap).map(([routeId, count]: [string, any]) => {
      const route = routes.find(r => r.id === routeId);
      return {
        name: route?.name?.split(' - ')[0] || "Unknown",
        fullName: route?.name || "Unknown",
        passengers: count
      };
    }).sort((a, b) => b.passengers - a.passengers).slice(0, 5);
  }, [bookings, routes]);

  const tripOccupancyData = useMemo(() => {
    if (!bookings || !schedules || !routes) return [];

    const groups: Record<string, {
      scheduleId: string;
      travelDate: string;
      reserved: number;
      confirmed: number;
      used: number;
      waitlisted: number;
    }> = {};

    bookings.forEach(b => {
      const key = `${b.scheduleId}_${b.travelDate}`;
      if (!groups[key]) {
        groups[key] = { 
          scheduleId: b.scheduleId, 
          travelDate: b.travelDate, 
          reserved: 0, 
          confirmed: 0, 
          used: 0,
          waitlisted: 0 
        };
      }
      if (b.status === 'Reserved') groups[key].reserved++;
      else if (b.status === 'Confirmed') groups[key].confirmed++;
      else if (b.status === 'Used') groups[key].used++;
      else if (b.status === 'Waitlisted') groups[key].waitlisted++;
    });

    return Object.values(groups).map(g => {
      const schedule = schedules.find(s => s.id === g.scheduleId);
      const route = routes.find(r => r.id === schedule?.routeId);
      const capacity = schedule?.passengerCapacity || 0;
      const activeTotal = g.confirmed + g.reserved + g.used;
      
      return {
        ...g,
        tripCode: schedule?.tripCode || 'N/A',
        departureTime: schedule?.departureTime || '--:--',
        routeName: route?.name || 'Unknown',
        capacity,
        activeTotal,
        occupancyRate: capacity > 0 ? Math.round((activeTotal / capacity) * 100) : 0
      };
    }).filter(t => {
      const matchesSearch = !occupancySearch || t.tripCode.toLowerCase().includes(occupancySearch.toLowerCase()) || t.routeName.toLowerCase().includes(occupancySearch.toLowerCase());
      const matchesDate = !occupancyDateFilter || t.travelDate === occupancyDateFilter;
      return matchesSearch && matchesDate;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [bookings, schedules, routes, occupancySearch, occupancyDateFilter]);

  const avgLoadFactor = useMemo(() => {
    if (tripOccupancyData.length === 0) return 0;
    const totalRate = tripOccupancyData.reduce((sum, t) => sum + t.occupancyRate, 0);
    return Math.round(totalRate / tripOccupancyData.length);
  }, [tripOccupancyData]);

  const isLoading = isBookingsLoading || isRoutesLoading || isSchedulesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-black font-headline text-primary uppercase tracking-tight">Operational Intelligence</h1>
        </div>
        <div className="flex items-center gap-3">
           <Link href="/admin/reports">
             <Button variant="ghost" size="sm" className="h-9 gap-2 font-black uppercase text-[10px] text-muted-foreground hover:text-primary transition-all">
                <Banknote className="h-4 w-4" /> Financial Reports
             </Button>
           </Link>
           <Separator orientation="vertical" className="h-4" />
           <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase text-primary">
              <Activity className="h-3.5 w-3.5 text-accent animate-pulse" /> Live Tracking Board
           </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        {/* KPI SUITE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
           <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Banknote className="h-16 w-16" /></div>
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Gross Revenue</p>
                 <CardTitle className="text-2xl font-black">₱{isMounted ? stats.totalRevenue.toLocaleString() : "---"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[8px] opacity-60 font-bold uppercase">Confirmed & Boarded</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white border-2 border-primary/10">
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Volume Hub</p>
                 <CardTitle className="text-2xl font-black text-primary">{isMounted ? stats.totalBookings.toLocaleString() : "---"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[8px] text-muted-foreground font-bold uppercase">Total Manifest Records</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white border-2 border-green-600/10">
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-green-600/60 tracking-widest">Paid Manifest</p>
                 <CardTitle className="text-2xl font-black text-green-600">{isMounted ? stats.totalPassengers.toLocaleString() : "---"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[8px] text-muted-foreground font-bold uppercase">Confirmed PAX entries</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-white border-2 border-orange-500/10">
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-orange-600/60 tracking-widest">Waitlist Burden</p>
                 <CardTitle className="text-2xl font-black text-orange-600">{isMounted ? stats.waitlistCount.toLocaleString() : "---"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[8px] text-muted-foreground font-bold uppercase">Unmet Trip Demand</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-sm bg-accent text-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Zap className="h-16 w-16" /></div>
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-primary/70 tracking-widest">Avg. Trip Yield</p>
                 <CardTitle className="text-2xl font-black">₱{isMounted && stats.confirmedCount > 0 ? Math.round(stats.totalRevenue / stats.confirmedCount).toLocaleString() : "0"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[8px] text-primary/60 font-black uppercase">Per Confirmed Seat</p>
              </CardContent>
           </Card>
        </div>

        {/* ANALYTICS PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="border-none shadow-sm bg-white p-6">
              <div className="mb-10 flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <TrendingUp className="h-5 w-5 text-accent" /> Revenue Velocity
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold">Daily gross confirmed intake (Last 14 Days)</p>
                 </div>
              </div>
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyRevenueData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#888'}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} tickFormatter={(v) => `₱${v/1000}k`} />
                       <Tooltip cursor={{stroke: 'hsl(var(--primary))', strokeWidth: 2}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                       <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                       />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
           </Card>

           <Card className="border-none shadow-sm bg-white p-6">
              <div className="mb-10 flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <BarChart3 className="h-5 w-5 text-accent" /> Top Shipping Lanes
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold">High-volume routes by passenger count</p>
                 </div>
              </div>
              <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={routeVolumeData} layout="vertical">
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                       <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} />
                       <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          width={100} 
                          tick={{fontSize: 9, fontWeight: 'black', fill: '#1e3a8a'}} 
                       />
                       <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                       <Bar dataKey="passengers" radius={[0, 4, 4, 0]} barSize={20}>
                          {routeVolumeData.map((_, index) => (
                             <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.6)"} />
                          ))}
                       </Bar>
                    </RechartsBarChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        </div>

        {/* VOYAGE OCCUPANCY TRACKER */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-6 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <div className="bg-primary/10 p-1.5 rounded-lg"><Ship className="h-5 w-5 text-primary" /></div>
                       <CardTitle className="text-lg font-black text-primary uppercase tracking-tight">Voyage Occupancy Tracker</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-bold uppercase text-muted-foreground">Live inventory pressure per scheduled rotation.</CardDescription>
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                          placeholder="Search Trip ID..." 
                          className="pl-9 h-11 bg-white border-none shadow-sm text-sm w-44"
                          value={occupancySearch}
                          onChange={(e) => setOccupancySearch(e.target.value)}
                       />
                    </div>
                    <div className="flex items-center gap-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground">Service Date:</Label>
                       <Input 
                          type="date" 
                          className="h-11 bg-white border-none shadow-sm text-sm font-black w-44"
                          value={occupancyDateFilter}
                          onChange={(e) => setOccupancyDateFilter(e.target.value)}
                       />
                    </div>
                 </div>
              </div>
           </CardHeader>
           <CardContent className="p-0">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-30">
                   <Loader2 className="h-10 w-10 animate-spin mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Querying Trip Nodes...</p>
                </div>
              ) : tripOccupancyData.length > 0 ? (
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-secondary/20">
                         <TableRow>
                            <TableHead className="text-[10px] font-black uppercase">Trip Code</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Shipping Lane</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Reserved</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Confirmed</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Waitlist</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Load Factor</TableHead>
                            <TableHead className="text-right"></TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {tripOccupancyData.map((trip) => {
                            const isAtRisk = trip.occupancyRate >= 90;
                            return (
                               <TableRow key={`${trip.scheduleId}_${trip.travelDate}`} className={cn("group transition-colors", isAtRisk ? "bg-red-50/30" : "hover:bg-secondary/5")}>
                                  <TableCell>
                                     <div className="space-y-0.5">
                                        <div className="text-xs font-black text-accent">{trip.tripCode}</div>
                                        <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                           <Clock className="h-2.5 w-2.5" /> {trip.departureTime}
                                        </div>
                                     </div>
                                  </TableCell>
                                  <TableCell>
                                     <div className="text-xs font-bold text-primary truncate max-w-[200px] uppercase">{trip.routeName}</div>
                                     <div className="text-[8px] text-muted-foreground uppercase font-black">{trip.travelDate}</div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                     <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[10px] h-6 px-2 min-w-[35px]">
                                        {trip.reserved}
                                     </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                     <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 font-black text-[10px] h-6 px-2 min-w-[35px]">
                                        {trip.confirmed + trip.used}
                                     </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                     <Badge variant="outline" className={cn("font-black text-[10px] h-6 px-2 min-w-[35px]", trip.waitlisted > 0 ? "bg-orange-50 text-orange-600 border-orange-100" : "opacity-30")}>
                                        {trip.waitlisted}
                                     </Badge>
                                  </TableCell>
                                  <TableCell className="min-w-[180px]">
                                     <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[9px] font-black">
                                           <span className={cn(isAtRisk ? "text-destructive" : "text-muted-foreground")}>
                                              {isAtRisk && <Flame className="h-2.5 w-2.5 inline mr-1 animate-pulse" />}
                                              {trip.occupancyRate}%
                                           </span>
                                           <span className="text-primary">{trip.activeTotal} / {trip.capacity} PAX</span>
                                        </div>
                                        <Progress value={trip.occupancyRate} className={cn("h-1.5 bg-secondary shadow-inner", isAtRisk ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")} />
                                     </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                     <Link href={`/admin/manage-bookings?trip=${trip.scheduleId}&date=${trip.travelDate}`}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent hover:text-primary transition-all rounded-lg">
                                           <ArrowRight className="h-4 w-4" />
                                        </Button>
                                     </Link>
                                  </TableCell>
                               </TableRow>
                            );
                         })}
                      </TableBody>
                   </Table>
                </div>
              ) : (
                <div className="py-32 text-center opacity-30 flex flex-col items-center">
                   <Ship className="h-16 w-16 mb-4 text-primary" />
                   <p className="text-sm font-black uppercase tracking-widest">Zero Operations Logged for {occupancyDateFilter}</p>
                   <p className="text-[10px] font-bold text-muted-foreground mt-1">Adjust date filters to view upcoming or historical rotations.</p>
                </div>
              )}
           </CardContent>
        </Card>

        {/* BOTTOM ANALYTICS & INSIGHTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-1 border-none shadow-sm bg-white p-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2 border-b pb-2">
                 <ListOrdered className="h-4 w-4 text-accent" /> Pending Capacity Burden
              </h3>
              <div className="space-y-4">
                 {bookings?.filter(b => b.status === 'Waitlisted').slice(0, 5).map(b => {
                    const route = routes?.find(r => r.id === b.routeId);
                    return (
                      <div key={b.id} className="flex items-center justify-between py-3 border-b border-dashed last:border-0 hover:bg-orange-50/50 px-2 rounded-lg transition-colors">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-black text-primary truncate uppercase">{b.passengerName}</p>
                          <div className="flex items-center gap-2 text-[8px] font-bold text-muted-foreground uppercase">
                             <MapPin className="h-2 w-2" /> {route?.name?.split(' - ')[0]} → {route?.name?.split(' - ')[1]}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[8px] uppercase font-black text-orange-600 border-orange-200 bg-orange-50 h-5">Waitlist #{b.id.slice(-4)}</Badge>
                      </div>
                    );
                 })}
                 <Link href="/admin/manage-bookings?tab=waitlisted" className="block w-full pt-2">
                   <Button variant="ghost" className="w-full h-10 text-[9px] font-black uppercase gap-2 border-2 border-dashed group">
                      Review Underserved Demand <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                   </Button>
                 </Link>
              </div>
           </Card>

           <Card className="lg:col-span-2 border-none shadow-sm bg-primary text-primary-foreground p-8 relative overflow-hidden flex flex-col justify-center min-h-[280px]">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <BarChart className="h-64 w-64 -rotate-12 translate-x-16 translate-y-16" />
              </div>
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl"><Info className="h-6 w-6 text-accent" /></div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">Load Factor Summary</h3>
                       <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest">Fleet-Wide Optimization Metrics</p>
                    </div>
                 </div>
                 
                 <p className="text-primary-foreground/80 text-sm leading-relaxed max-w-lg">
                    Current average load factor across all active rotations is <span className="font-black text-white">{avgLoadFactor}%</span>. 
                    {avgLoadFactor > 80 ? " Operational pressure is high; consider activating standby RoRo vessels for peak relief." : " Asset utilization is within nominal parameters."}
                 </p>
                 
                 <div className="flex flex-wrap gap-4 pt-4">
                    <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-sm space-y-1">
                       <p className="text-[9px] uppercase font-black text-accent tracking-widest">Avg. Utilization</p>
                       <div className="flex items-end gap-2">
                          <p className="text-3xl font-black">{avgLoadFactor}%</p>
                          <div className={cn("flex items-center gap-0.5 text-[10px] font-bold mb-1", avgLoadFactor > 75 ? "text-green-400" : "text-orange-400")}>
                             {avgLoadFactor > 75 ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                             {avgLoadFactor > 75 ? "Optimal" : "Slack"}
                          </div>
                       </div>
                    </div>
                    <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 backdrop-blur-sm space-y-1">
                       <p className="text-[9px] uppercase font-black text-accent tracking-widest">Capacity Reserve</p>
                       <p className="text-3xl font-black">{isMounted ? Math.max(0, 100 - avgLoadFactor) : "--"}%</p>
                       <p className="text-[8px] font-medium opacity-50">Physical fleet buffer</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </main>
    </div>
  );
}
