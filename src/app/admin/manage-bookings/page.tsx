
"use client";

import { useState } from "react";
import { 
  ClipboardList, 
  Search, 
  Loader2, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Filter,
  Eye,
  MoreVertical,
  Banknote,
  Calendar,
  Tag
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManageBookingsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const bookingsRef = useMemoFirebase(() => collection(db!, "bookings"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: schedules } = useCollection(schedulesRef);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredBookings = bookings?.filter(b => {
    const matchesSearch = 
      b.passengerName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && b.paymentStatus === "Pending";
    if (activeTab === "paid") return matchesSearch && b.paymentStatus === "Paid";
    if (activeTab === "cancelled") return matchesSearch && b.paymentStatus === "Cancelled";
    if (activeTab === "public") return matchesSearch && b.bookingSource === "Public";
    if (activeTab === "desk") return matchesSearch && b.bookingSource === "Desk";
    
    return matchesSearch;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  const handleUpdateStatus = (id: string, status: 'Paid' | 'Cancelled') => {
    if (!db) return;
    const bookingRef = doc(db, "bookings", id);
    updateDocumentNonBlocking(bookingRef, { paymentStatus: status, updatedAt: new Date().toISOString() });
  };

  const isLoading = isUserLoading || isBookingsLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return <Badge className="bg-green-500">Paid</Badge>;
      case 'Pending': return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'Cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            Manage Bookings & Manifest
          </h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search passenger or Ticket ID..." 
                className="pl-10 h-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="bg-white">Total: {bookings?.length || 0}</Badge>
               <Badge className="bg-yellow-500">Pending: {bookings?.filter(b => b.paymentStatus === 'Pending').length || 0}</Badge>
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border p-1 h-auto flex-wrap">
              <TabsTrigger value="all">All Records</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="public">Online Source</TabsTrigger>
              <TabsTrigger value="desk">Desk Source</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">Loading manifest...</p>
                  </div>
                ) : filteredBookings && filteredBookings.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Trip Details</TableHead>
                        <TableHead>Fare & Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id} className="hover:bg-accent/5">
                          <TableCell className="font-mono text-[10px] font-bold">#{booking.id}</TableCell>
                          <TableCell>
                            <div className="font-bold">{booking.passengerName}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" /> {booking.passengerContact || "No contact"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-2.5 w-2.5 text-accent" />
                              <span className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</span>
                            </div>
                            <div className="text-xs font-bold">{getRouteName(booking.routeId)}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                               <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {getDeparture(booking.scheduleId)}</span>
                               <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {new Date(booking.createdAt).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-primary">₱{booking.finalFare?.toLocaleString()}</div>
                            <div className="text-[9px] uppercase font-bold text-muted-foreground">{booking.segmentLabel}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={booking.bookingSource === 'Public' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-green-200 text-green-700 bg-green-50'}>
                              {booking.bookingSource}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.paymentStatus)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {booking.paymentStatus === 'Pending' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'Paid')} className="text-green-600">
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {booking.paymentStatus !== 'Cancelled' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'Cancelled')} className="text-destructive">
                                    <XCircle className="h-4 w-4 mr-2" /> Void Ticket
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20 opacity-50">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold">No bookings match criteria</h3>
                    <p className="text-sm">Try adjusting your filters or search query.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
