
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Banknote, 
  Download, 
  Filter, 
  Loader2, 
  ChevronRight, 
  Calendar,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Tag,
  Ship,
  Info,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Building2,
  HandCoins,
  ShieldCheck
} from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid, 
  Cell,
  Pie,
  PieChart,
  Legend,
  Line,
  LineChart
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['#1e3a8a', '#06b6d4', '#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function SalesReportPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  
  // Date Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const end = new Date();
    const start = subMonths(end, 1); // Default to last 30 days
    setDateFrom(format(start, "yyyy-MM-dd"));
    setDateTo(format(end, "yyyy-MM-dd"));
  }, []);

  const bookingsRef = useMemoFirebase(() => db ? collection(db, "bookings") : null, [db]);
  const routesRef = useMemoFirebase(() => db ? collection(db, "routes") : null, [db]);
  
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: routes } = useCollection(routesRef);

  const reportData = useMemo(() => {
    if (!bookings || !isMounted || !dateFrom || !dateTo) return [];
    const from = startOfDay(parseISO(dateFrom));
    const to = endOfDay(parseISO(dateTo));

    return bookings.filter(b => {
      if (!b.travelDate) return false;
      const travelDate = parseISO(b.travelDate);
      return isWithinInterval(travelDate, { start: from, end: to });
    });
  }, [bookings, isMounted, dateFrom, dateTo]);

  const stats = useMemo(() => {
    return reportData.reduce((acc, b) => {
      const fare = b.finalFare || 0;
      const penalties = b.penaltyFees || 0;
      const total = fare + penalties;

      acc.gross += total;
      
      if (b.status === 'Refunded' || b.status === 'Auto-cancelled') {
         acc.refunds += fare;
      } else {
         acc.net += total;
      }

      if (b.status === 'Used') {
         acc.earned += fare;
      }

      if (b.isFeeWaived) {
         // This represents potential revenue lost due to operational waivers
         acc.waivedValue += (penalties || 0); // Assuming penalties holds the original calculation even if waived
      }

      // Penalty Analytics
      if (penalties > 0 && !b.isFeeWaived) {
         if (b.status === 'Suspended') acc.noShowFees += penalties;
         else if (b.rebookedFromId || b.remarks?.toLowerCase().includes('rebook')) acc.rebookingFees += penalties;
         else acc.cancellationFees += penalties;
         acc.totalPenalties += penalties;
      }

      // Source Breakdown
      if (b.bookingSource === 'Desk') acc.deskRevenue += total;
      else acc.webRevenue += total;

      return acc;
    }, { 
      gross: 0, net: 0, earned: 0, refunds: 0, 
      rebookingFees: 0, noShowFees: 0, cancellationFees: 0, 
      totalPenalties: 0, waivedValue: 0,
      deskRevenue: 0, webRevenue: 0
    });
  }, [reportData]);

  const momentumData = useMemo(() => {
    const days: Record<string, number> = {};
    reportData.forEach(b => {
       const date = b.travelDate;
       days[date] = (days[date] || 0) + (b.finalFare || 0) + (b.penaltyFees || 0);
    });
    return Object.entries(days).map(([name, revenue]) => ({ name: format(parseISO(name), "MMM dd"), revenue }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [reportData]);

  const routePerformanceData = useMemo(() => {
    const routesMap: Record<string, { revenue: number, volume: number }> = {};
    reportData.forEach(b => {
       const routeName = routes?.find(r => r.id === b.routeId)?.name || "Unknown Route";
       if (!routesMap[routeName]) routesMap[routeName] = { revenue: 0, volume: 0 };
       routesMap[routeName].revenue += (b.finalFare || 0) + (b.penaltyFees || 0);
       routesMap[routeName].volume += 1;
    });
    return Object.entries(routesMap).map(([name, data]) => ({ name, revenue: data.revenue, volume: data.volume }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [reportData, routes]);

  const sourceBreakdownData = [
    { name: 'Terminal Desk', value: stats.deskRevenue },
    { name: 'Web Portal', value: stats.webRevenue }
  ];

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = ["Booking ID", "Travel Date", "Passenger", "Route", "Fare", "Penalties", "Total", "Status", "Source", "Fee Waived"];
    const rows = reportData.map(b => [
      b.id,
      b.travelDate,
      `"${b.passengerName}"`,
      `"${routes?.find(r => r.id === b.routeId)?.name || 'Unknown'}"`,
      b.finalFare,
      b.penaltyFees || 0,
      (b.finalFare || 0) + (b.penaltyFees || 0),
      b.status,
      b.bookingSource,
      b.isFeeWaived ? "YES" : "NO"
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `IslaKonek_FinancialLedger_${dateFrom}_to_${dateTo}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
           <div className="bg-primary/10 p-2 rounded-lg">
             <BarChart3 className="h-5 w-5 text-primary" />
           </div>
           <h1 className="text-lg font-black font-headline text-primary uppercase tracking-tight">Financial Intelligence</h1>
        </div>
        <Button 
          onClick={handleExportCSV} 
          disabled={reportData.length === 0}
          className="bg-accent text-primary font-black uppercase text-xs tracking-widest h-10 px-6 gap-2 shadow-sm"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Ledger
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        {/* PARAMETERS */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                <Filter className="h-3 w-3" /> Reporting Parameters
              </CardTitle>
              <Badge variant="outline" className="h-6 px-3 border-primary/20 text-primary font-black uppercase text-[8px] tracking-[0.2em] bg-white">
                Live Transaction Node: Connected
              </Badge>
           </CardHeader>
           <CardContent className="p-6 flex flex-wrap items-end gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reporting Start</Label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                   <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-10 h-11 bg-secondary/10 border-none font-black text-sm w-52" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Reporting End</Label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
                   <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-10 h-11 bg-secondary/10 border-none font-black text-sm w-52" />
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                 <Info className="h-4 w-4 text-blue-600 shrink-0" />
                 <p className="text-[10px] text-blue-800 font-bold leading-tight">
                   Analysis is based on **Travel Date**. Transactions for voyages outside this range are excluded from the current view.
                 </p>
              </div>
           </CardContent>
        </Card>

        {isBookingsLoading ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-30">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">Synchronizing Ledgers...</p>
          </div>
        ) : (
          <>
            {/* REVENUE PERFORMANCE TIERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="h-24 w-24" /></div>
                  <CardHeader className="pb-1">
                     <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">Gross Manifest</p>
                     <CardTitle className="text-4xl font-black">₱{isMounted ? stats.gross.toLocaleString() : "---"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[9px] opacity-60 italic font-bold">Total book value across all active reservations.</p>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-white border-2 border-green-600/10">
                  <CardHeader className="pb-1">
                     <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Net Reconciled</p>
                        <Badge className="bg-green-600 text-white font-black text-[8px] uppercase h-4 px-2">Liquid</Badge>
                     </div>
                     <CardTitle className="text-4xl font-black text-green-600">₱{isMounted ? stats.net.toLocaleString() : "---"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[9px] text-muted-foreground italic font-bold">Realized intake after cancellations and refunds.</p>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-accent text-primary relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><HandCoins className="h-24 w-24" /></div>
                  <CardHeader className="pb-1">
                     <p className="text-[10px] font-black uppercase text-primary/70 tracking-[0.2em]">Earned Yield</p>
                     <CardTitle className="text-4xl font-black">₱{isMounted ? stats.earned.toLocaleString() : "---"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[9px] text-primary/60 font-black italic">Recognized only upon physical passenger boarding.</p>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-white border-2 border-orange-500/10">
                  <CardHeader className="pb-1">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Penalties Collected</p>
                     <CardTitle className="text-4xl font-black text-orange-600">₱{isMounted ? stats.totalPenalties.toLocaleString() : "---"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-3 w-3 text-orange-600" />
                        <p className="text-[9px] text-muted-foreground font-black">Non-fare operational recoveries.</p>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* CHARTS & PENALTY ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
                  <div className="mb-10 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                         <TrendingUp className="h-5 w-5 text-accent" /> Revenue Velocity
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold">Daily gross intake trend for selected period.</p>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded-xl flex items-center gap-3">
                       <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Intake</span>
                       </div>
                    </div>
                  </div>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={momentumData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#888'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} tickFormatter={(v) => `₱${v/1000}k`} />
                          <RechartsTooltip cursor={{stroke: '#1e3a8a', strokeWidth: 2}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                          <Line 
                             type="monotone" 
                             dataKey="revenue" 
                             stroke="#1e3a8a" 
                             strokeWidth={4} 
                             dot={{ r: 4, fill: "#06b6d4", strokeWidth: 0 }}
                             activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                       </LineChart>
                    </ResponsiveContainer>
                  </div>
               </Card>

               <div className="space-y-6">
                  <Card className="border-none shadow-sm bg-white p-6 h-fit">
                    <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                       <HandCoins className="h-4 w-4 text-accent" /> Penalty Distribution
                    </h3>
                    <div className="space-y-5">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                             <span className="text-xs font-bold text-muted-foreground uppercase">Rebooking Fees</span>
                          </div>
                          <span className="font-black text-primary">₱{stats.rebookingFees.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
                             <span className="text-xs font-bold text-muted-foreground uppercase">No-Show Penalties</span>
                          </div>
                          <span className="font-black text-primary">₱{stats.noShowFees.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                             <span className="text-xs font-bold text-muted-foreground uppercase">Cancellation Fees</span>
                          </div>
                          <span className="font-black text-primary">₱{stats.cancellationFees.toLocaleString()}</span>
                       </div>
                       <Separator />
                       <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-red-700 uppercase">Waived Value</span>
                            <Badge variant="outline" className="text-[8px] font-black border-red-200 text-red-600">Opportunity Loss</Badge>
                          </div>
                          <p className="text-2xl font-black text-red-700">₱{stats.waivedValue.toLocaleString()}</p>
                          <p className="text-[9px] text-red-600 italic">Total penalties forgiven by staff override.</p>
                       </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-sm bg-primary text-primary-foreground p-6 h-fit relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Globe className="h-32 w-32" /></div>
                    <div className="relative z-10 space-y-5">
                       <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-accent" /> Intake Compliance
                       </h3>
                       <div className="space-y-4">
                          <div className="space-y-1">
                             <div className="flex justify-between text-[10px] font-bold uppercase opacity-70">
                                <span>Desk Revenue Share</span>
                                <span>{isMounted ? Math.round((stats.deskRevenue / (stats.gross || 1)) * 100) : 0}%</span>
                             </div>
                             <Progress value={isMounted ? (stats.deskRevenue / (stats.gross || 1)) * 100 : 0} className="h-1.5 bg-white/10" />
                          </div>
                          <div className="space-y-1">
                             <div className="flex justify-between text-[10px] font-bold uppercase opacity-70">
                                <span>Web Revenue Share</span>
                                <span>{isMounted ? Math.round((stats.webRevenue / (stats.gross || 1)) * 100) : 0}%</span>
                             </div>
                             <Progress value={isMounted ? (stats.webRevenue / (stats.gross || 1)) * 100 : 0} className="h-1.5 bg-white/10" />
                          </div>
                       </div>
                    </div>
                  </Card>
               </div>
            </div>

            {/* ROUTE PERFORMANCE & SOURCE BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card className="border-none shadow-sm bg-white p-6">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <Ship className="h-5 w-5 text-accent" /> High-Value Routes
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold">Top 5 routes by cumulative manifest revenue.</p>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={routePerformanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                          <XAxis type="number" hide />
                          <YAxis 
                             dataKey="name" 
                             type="category" 
                             axisLine={false} 
                             tickLine={false} 
                             width={120} 
                             tick={{fontSize: 9, fontWeight: 'black', fill: '#1e3a8a'}} 
                             tickFormatter={(v) => v.split(' - ')[0]}
                          />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                             {routePerformanceData.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                  </div>
               </Card>

               <Card className="border-none shadow-sm bg-white p-6">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <PieChartIcon className="h-5 w-5 text-accent" /> Source Contribution
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold">Revenue allocation by ticketing entry point.</p>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={sourceBreakdownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            <Cell fill="#1e3a8a" />
                            <Cell fill="#06b6d4" />
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'black' }} />
                       </PieChart>
                    </ResponsiveContainer>
                  </div>
               </Card>
            </div>

            {/* AUDIT READY LEDGER */}
            <section className="space-y-4">
               <div className="flex items-center justify-between border-b-2 border-secondary pb-3">
                  <h2 className="text-sm font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                    <TableIcon className="h-5 w-5 text-accent" /> Reconciliation Ledger
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Showing up to 100 recent matching records</p>
               </div>
               <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/30">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase">Reference</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Travel Date</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Passenger</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right">Fare</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right">Penalties</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right">Total Intake</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-center">Source</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {reportData.slice(0, 100).map((b) => (
                            <TableRow key={b.id} className="text-xs group hover:bg-secondary/5 transition-colors">
                              <TableCell className="font-mono font-black text-primary">#{b.id}</TableCell>
                              <TableCell className="font-bold">{b.travelDate}</TableCell>
                              <TableCell>
                                 <div className="font-black text-primary uppercase">{b.passengerName}</div>
                                 <div className="text-[8px] font-bold text-muted-foreground uppercase">{routes?.find(r => r.id === b.routeId)?.name}</div>
                              </TableCell>
                              <TableCell className="text-right font-bold">₱{b.finalFare?.toLocaleString()}</TableCell>
                              <TableCell className={cn("text-right font-black", b.penaltyFees > 0 ? "text-orange-600" : "text-muted-foreground/30")}>
                                 {b.isFeeWaived ? (
                                    <span className="text-[8px] text-green-600 uppercase border border-green-200 px-1 rounded bg-green-50">Waived</span>
                                 ) : (
                                    <>₱{(b.penaltyFees || 0).toLocaleString()}</>
                                 )}
                              </TableCell>
                              <TableCell className="text-right font-black text-primary">
                                 ₱{((b.finalFare || 0) + (b.isFeeWaived ? 0 : (b.penaltyFees || 0))).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] font-black uppercase h-5 px-2",
                                    b.status === 'Confirmed' ? "bg-green-50 text-green-700 border-green-200" :
                                    b.status === 'Used' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                    b.status === 'Refunded' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-secondary text-muted-foreground border-transparent"
                                  )}>{b.status}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                 {b.bookingSource === 'Desk' ? (
                                    <Building2 className="h-3.5 w-3.5 mx-auto text-primary opacity-40" title="Desk Booking" />
                                 ) : (
                                    <Globe className="h-3.5 w-3.5 mx-auto text-accent opacity-60" title="Web Booking" />
                                 )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {reportData.length > 100 && (
                     <div className="p-5 text-center bg-secondary/5 border-t border-dashed">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                           Viewing recent 100 of {reportData.length} records in range. Use CSV Export for full financial auditing.
                        </p>
                     </div>
                  )}
               </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
