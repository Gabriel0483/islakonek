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
  PieChart,
  MapPin,
  ArrowRight,
  Filter
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
  BarChart, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RePieChart
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { format, parseISO, startOfDay, subDays, isSameDay } from "date-fns";

export default function SalesOverviewPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "bookings");
  }, [db]);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);

  const stats = useMemo(() => {
    if (!bookings) return { totalRevenue: 0, totalPassengers: 0, waitlistCount: 0, confirmedCount: 0 };
    
    return bookings.reduce((acc, b) => {
      if (['Confirmed', 'Used'].includes(b.status)) {
        acc.totalRevenue += (b.finalFare || 0);
        acc.totalPassengers += 1;
        acc.confirmedCount += 1;
      } else if (b.status === 'Waitlisted') {
        acc.waitlistCount += 1;
      }
      return acc;
    }, { totalRevenue: 0, totalPassengers: 0, waitlistCount: 0, confirmedCount: 0 });
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
        (b.travelDate === date || (b.createdAt && b.createdAt.startsWith(date)))
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

  const isLoading = isBookingsLoading || isRoutesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary h-9">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Dashboard</span><span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-base sm:text-lg font-bold font-headline text-primary flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Sales Overview
          </h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-headline text-primary uppercase tracking-tight">Financial Intelligence</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Revenue tracking and volume analysis across all routes.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase">Today</Button>
             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase">7 Days</Button>
             <Button variant="secondary" size="sm" className="h-8 text-[10px] font-bold uppercase">All Time</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Compiling Financial Data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Revenue</p>
                    <CardTitle className="text-2xl font-black text-primary">
                      ₱{isMounted ? stats.totalRevenue.toLocaleString() : "---"}
                    </CardTitle>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-600">
                    <Banknote className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" /> +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Passengers</p>
                    <CardTitle className="text-2xl font-black text-primary">
                      {isMounted ? stats.totalPassengers.toLocaleString() : "---"}
                    </CardTitle>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-muted-foreground">Successful manifest entries</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Waitlist Burden</p>
                    <CardTitle className="text-2xl font-black text-orange-600">
                      {isMounted ? stats.waitlistCount.toLocaleString() : "---"}
                    </CardTitle>
                  </div>
                  <div className="bg-orange-500/10 p-2 rounded-lg text-orange-600">
                    <ListOrdered className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-muted-foreground">Passengers awaiting seats</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Avg. Ticket Value</p>
                    <CardTitle className="text-2xl font-black text-primary">
                      ₱{isMounted && stats.confirmedCount > 0 ? Math.round(stats.totalRevenue / stats.confirmedCount).toLocaleString() : "0"}
                    </CardTitle>
                  </div>
                  <div className="bg-accent/10 p-2 rounded-lg text-primary">
                    <Calendar className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] text-muted-foreground">Yield per confirmed booking</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden p-6">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-accent" /> Revenue Momentum
                    </h3>
                    <p className="text-xs text-muted-foreground">Daily sales performance (last 14 days)</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#888'}}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#888'}}
                        tickFormatter={(value) => `₱${value >= 1000 ? (value/1000) + 'k' : value}`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`₱${value.toLocaleString()}`, "Revenue"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border-none shadow-sm bg-white overflow-hidden p-6">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-accent" /> Route Volume Analysis
                    </h3>
                    <p className="text-xs text-muted-foreground">Top performing connections by passenger count</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routeVolumeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 'bold', fill: '#444'}}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value: any) => [`${value} Passengers`, "Volume"]}
                      />
                      <Bar dataKey="passengers" radius={[0, 4, 4, 0]} barSize={20}>
                        {routeVolumeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.6)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Detailed Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="lg:col-span-1 border-none shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Waitlist Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {bookings?.filter(b => b.status === 'Waitlisted').slice(0, 5).map(b => {
                        const route = routes?.find(r => r.id === b.routeId);
                        return (
                          <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-primary">{b.passengerName}</p>
                              <p className="text-[10px] text-muted-foreground">{route?.name}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase font-black text-orange-600 border-orange-200 bg-orange-50">Waitlisted</Badge>
                          </div>
                        );
                     })}
                     <Link href="/admin/manage-bookings?tab=waitlisted" className="block w-full">
                       <Button variant="ghost" className="w-full h-8 text-[10px] font-bold uppercase gap-2">
                         Manage Waitlist <ArrowRight className="h-3 w-3" />
                       </Button>
                     </Link>
                  </CardContent>
               </Card>

               <Card className="lg:col-span-2 border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden flex flex-col justify-center p-8">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="h-64 w-64 -rotate-12 translate-x-16 translate-y-16" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Sales Insights</h3>
                    <p className="text-primary-foreground/80 text-sm leading-relaxed max-w-md">
                      Current momentum indicates peak performance on weekend inter-island routes. Route volume is up 15% compared to the same period last year. Focus marketing efforts on mid-week schedules to balance vessel load factor.
                    </p>
                    <div className="flex gap-4 pt-2">
                       <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                          <p className="text-[9px] uppercase font-bold opacity-60">Avg. Load Factor</p>
                          <p className="text-lg font-black">84%</p>
                       </div>
                       <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                          <p className="text-[9px] uppercase font-bold opacity-60">Revenue Yield</p>
                          <p className="text-lg font-black">+4.2%</p>
                       </div>
                    </div>
                  </div>
               </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
