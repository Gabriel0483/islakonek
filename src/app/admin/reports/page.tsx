
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
  FileSpreadsheet
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
  Legend
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
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
    const start = subMonths(end, 3);
    setDateFrom(format(start, "yyyy-MM-dd"));
    setDateTo(format(end, "yyyy-MM-dd"));
  }, []);

  const bookingsRef = useMemoFirebase(() => db ? collection(db, "bookings") : null, [db]);
  const routesRef = useMemoFirebase(() => db ? collection(db, "routes") : null, [db]);
  
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: routes } = useCollection(routesRef);

  const reportData = useMemo(() => {
    if (!bookings || !isMounted || !dateFrom || !dateTo) return [];
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

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

      // Penalty Analytics
      if (penalties > 0) {
         if (b.status === 'Suspended') acc.noShowFees += penalties;
         else if (b.rebookedFromId) acc.rebookingFees += penalties;
         else acc.cancellationFees += penalties;
      }

      return acc;
    }, { 
      gross: 0, net: 0, earned: 0, refunds: 0, 
      rebookingFees: 0, noShowFees: 0, cancellationFees: 0
    });
  }, [reportData]);

  const momentumData = useMemo(() => {
    const months: Record<string, number> = {};
    reportData.forEach(b => {
       const month = format(parseISO(b.travelDate), "MMM yyyy");
       months[month] = (months[month] || 0) + (b.finalFare || 0) + (b.penaltyFees || 0);
    });
    return Object.entries(months).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [reportData]);

  const routeData = useMemo(() => {
    const routesMap: Record<string, number> = {};
    reportData.forEach(b => {
       const routeName = routes?.find(r => r.id === b.routeId)?.name || "Unknown Route";
       routesMap[routeName] = (routesMap[routeName] || 0) + 1;
    });
    return Object.entries(routesMap).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [reportData, routes]);

  const fareTypeData = useMemo(() => {
    const faresMap: Record<string, number> = {};
    reportData.forEach(b => {
       const label = b.segmentLabel || "Regular";
       faresMap[label] = (faresMap[label] || 0) + (b.finalFare || 0);
    });
    return Object.entries(faresMap).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reportData]);

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    const headers = ["Booking ID", "Travel Date", "Passenger", "Route", "Fare", "Penalties", "Total", "Status", "Source"];
    const rows = reportData.map(b => [
      b.id,
      b.travelDate,
      `"${b.passengerName}"`,
      `"${routes?.find(r => r.id === b.routeId)?.name || 'Unknown'}"`,
      b.finalFare,
      b.penaltyFees || 0,
      (b.finalFare || 0) + (b.penaltyFees || 0),
      b.status,
      b.bookingSource
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `IslaKonek_Report_${dateFrom}_to_${dateTo}.csv`);
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
           <BarChart3 className="h-5 w-5 text-primary" />
           <h1 className="text-lg font-black font-headline text-primary uppercase tracking-tight">Financial Intelligence</h1>
        </div>
        <Button 
          onClick={handleExportCSV} 
          disabled={reportData.length === 0}
          className="bg-accent text-primary font-bold h-10 px-4 gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Ledger
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        {/* FILTERS */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-4">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                <Filter className="h-3 w-3" /> Report Parameters
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 flex flex-wrap items-end gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Reporting Period From</Label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                   <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-10 h-10 bg-secondary/20 border-none font-bold text-sm w-48" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Reporting Period To</Label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                   <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-10 h-10 bg-secondary/20 border-none font-bold text-sm w-48" />
                </div>
              </div>
              <div className="flex-1 text-right">
                 <Badge variant="outline" className="h-10 px-4 border-dashed border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest">
                    Live Data Sync Active
                 </Badge>
              </div>
           </CardContent>
        </Card>

        {isBookingsLoading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">Aggregating Manifests...</p>
          </div>
        ) : (
          <>
            {/* REVENUE TIERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="h-24 w-24" /></div>
                  <CardHeader className="pb-2">
                     <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">Gross Revenue</p>
                     <CardTitle className="text-4xl font-black">₱{stats.gross.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[10px] opacity-60 italic">Total processed manifest value before adjustments.</p>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-white border-2 border-green-600/10">
                  <CardHeader className="pb-2">
                     <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Net Revenue</p>
                        <Badge className="bg-green-600 text-white font-black text-[9px] uppercase h-5">Reconciled</Badge>
                     </div>
                     <CardTitle className="text-4xl font-black text-green-600">₱{stats.net.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[10px] text-muted-foreground italic">Realized intake after processed refunds/cancellations.</p>
                  </CardContent>
               </Card>
               <Card className="border-none shadow-sm bg-accent text-primary relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="h-24 w-24" /></div>
                  <CardHeader className="pb-2">
                     <p className="text-[10px] font-black uppercase text-primary/70 tracking-[0.2em]">Earned Revenue</p>
                     <CardTitle className="text-4xl font-black">₱{stats.earned.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-[10px] text-primary/60 font-bold italic">Recognized only upon confirmed passenger boarding.</p>
                  </CardContent>
               </Card>
            </div>

            {/* PENALTY ANALYTICS */}
            <section className="space-y-4">
               <h2 className="text-sm font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> Penalty & Fee Analytics
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary space-y-1">
                     <p className="text-[9px] font-black text-muted-foreground uppercase">Rebooking Fees</p>
                     <p className="text-xl font-black text-primary">₱{stats.rebookingFees.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary space-y-1">
                     <p className="text-[9px] font-black text-muted-foreground uppercase">No-Show Fees</p>
                     <p className="text-xl font-black text-destructive">₱{stats.noShowFees.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-secondary space-y-1">
                     <p className="text-[9px] font-black text-muted-foreground uppercase">Cancellation Fees</p>
                     <p className="text-xl font-black text-orange-600">₱{stats.cancellationFees.toLocaleString()}</p>
                  </div>
               </div>
            </section>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card className="border-none shadow-sm bg-white p-6">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <TrendingUp className="h-5 w-5 text-accent" /> Revenue Momentum
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Monthly gross revenue trends across selected period.</p>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={momentumData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#888'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} tickFormatter={(v) => `₱${v/1000}k`} />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                            {momentumData.map((_, index) => (
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
                       <PieChartIcon className="h-5 w-5 text-accent" /> Route Popularity
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Top 5 routes by passenger volume.</p>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={routeData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {routeData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                       </PieChart>
                    </ResponsiveContainer>
                  </div>
               </Card>

               <Card className="border-none shadow-sm bg-white p-6 lg:col-span-2">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                       <Users className="h-5 w-5 text-accent" /> Fare Type Distribution
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Revenue allocation across passenger demographics.</p>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={fareTypeData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 10, fontWeight: 'bold'}} />
                          <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                             {fareTypeData.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                  </div>
               </Card>
            </div>

            {/* AUDIT TABLE */}
            <section className="space-y-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                    <TableIcon className="h-4 w-4" /> Audit-Ready Transaction Ledger
                  </h2>
               </div>
               <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <Table>
                     <TableHeader className="bg-secondary/30">
                        <TableRow>
                           <TableHead className="text-[10px] font-black uppercase">Reference</TableHead>
                           <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                           <TableHead className="text-[10px] font-black uppercase">Passenger</TableHead>
                           <TableHead className="text-[10px] font-black uppercase text-right">Base Fare</TableHead>
                           <TableHead className="text-[10px] font-black uppercase text-right">Penalties</TableHead>
                           <TableHead className="text-[10px] font-black uppercase text-right">Total Intake</TableHead>
                           <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {reportData.slice(0, 50).map((b) => (
                          <TableRow key={b.id} className="text-xs">
                             <TableCell className="font-mono font-bold">#{b.id}</TableCell>
                             <TableCell>{b.travelDate}</TableCell>
                             <TableCell className="font-bold text-primary">{b.passengerName}</TableCell>
                             <TableCell className="text-right">₱{b.finalFare?.toLocaleString()}</TableCell>
                             <TableCell className="text-right text-destructive font-bold">₱{(b.penaltyFees || 0).toLocaleString()}</TableCell>
                             <TableCell className="text-right font-black">₱{((b.finalFare || 0) + (b.penaltyFees || 0)).toLocaleString()}</TableCell>
                             <TableCell className="text-center">
                                <Badge variant="outline" className={cn(
                                   "text-[9px] font-black uppercase h-5",
                                   b.status === 'Confirmed' ? "bg-green-50 text-green-700" :
                                   b.status === 'Used' ? "bg-indigo-50 text-indigo-700" :
                                   b.status === 'Refunded' ? "bg-blue-50 text-blue-700" : "bg-secondary text-muted-foreground"
                                )}>{b.status}</Badge>
                             </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                  </Table>
                  {reportData.length > 50 && (
                     <div className="p-4 text-center bg-secondary/5 border-t">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                           + {reportData.length - 50} more records in full ledger. Use "Export Ledger" for complete reconciliation.
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
