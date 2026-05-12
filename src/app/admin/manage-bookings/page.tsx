"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Loader2, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Eye,
  MoreVertical,
  Calendar,
  Tag,
  Ship,
  Ban,
  UserCheck,
  AlertTriangle,
  Pencil,
  Trash2,
  Check
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type BookingStatus = "Reserved" | "Waitlisted" | "Confirmed" | "Used" | "Suspended" | "Auto-cancelled";

export default function ManageBookingsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const bookingsRef = useMemoFirebase(() => collection(db!, "bookings"), [db]);
  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: schedules } = useCollection(schedulesRef);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    passengerName: "",
    passengerContact: "",
    travelDate: ""
  });

  const activeStatuses = ["Reserved", "Waitlisted", "Confirmed", "Used"];

  const filteredBookings = bookings?.filter(b => {
    const matchesSearch = 
      b.passengerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.travelDate?.includes(search);
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "reserved") return matchesSearch && b.status === "Reserved";
    if (activeTab === "waitlisted") return matchesSearch && b.status === "Waitlisted";
    if (activeTab === "confirmed") return matchesSearch && b.status === "Confirmed";
    if (activeTab === "used") return matchesSearch && b.status === "Used";
    if (activeTab === "inactive") {
      return matchesSearch && (["Suspended", "Auto-cancelled"].includes(b.status) || !activeStatuses.includes(b.status));
    }
    
    return matchesSearch;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  const handleUpdateStatus = (id: string, status: BookingStatus) => {
    if (!db) return;
    const bookingRef = doc(db, "bookings", id);
    updateDocumentNonBlocking(bookingRef, { status: status, updatedAt: new Date().toISOString() });
  };

  const handleDeleteBooking = (id: string) => {
    if (!db || !id) return;
    setTimeout(() => {
      const confirmed = window.confirm("Are you sure you want to permanently delete this booking record?");
      if (confirmed) {
        const bookingRef = doc(db, "bookings", id);
        deleteDocumentNonBlocking(bookingRef);
      }
    }, 200);
  };

  const handleOpenEdit = (booking: any) => {
    setEditingBooking(booking);
    setEditFormData({
      passengerName: booking.passengerName || "",
      passengerContact: booking.passengerContact || "",
      travelDate: booking.travelDate || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!db || !editingBooking) return;
    const bookingRef = doc(db, "bookings", editingBooking.id);
    updateDocumentNonBlocking(bookingRef, {
      ...editFormData,
      updatedAt: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
  };

  const isLoading = isUserLoading || isBookingsLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed': return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'Reserved': return <Badge className="bg-blue-500">Reserved</Badge>;
      case 'Waitlisted': return <Badge className="bg-orange-500">Waitlisted</Badge>;
      case 'Used': return <Badge className="bg-indigo-600">Used (Boarded)</Badge>;
      case 'Suspended': return <Badge variant="destructive">Suspended</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground">Auto-Cancelled</Badge>;
      default: return <Badge variant="outline" className="opacity-70 italic">{status || 'Legacy'}</Badge>;
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
                placeholder="Search passenger, Ticket ID, or Date..." 
                className="pl-10 h-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="bg-white">Total: {bookings?.length || 0}</Badge>
               <Badge className="bg-blue-500">Reserved: {bookings?.filter(b => b.status === 'Reserved').length || 0}</Badge>
               <Badge className="bg-orange-500">Waitlist: {bookings?.filter(b => b.status === 'Waitlisted').length || 0}</Badge>
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border p-1 h-auto flex-wrap">
              <TabsTrigger value="all">All Records</TabsTrigger>
              <TabsTrigger value="reserved">Reserved</TabsTrigger>
              <TabsTrigger value="waitlisted">Waitlisted</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed (Paid)</TabsTrigger>
              <TabsTrigger value="used">Used (Boarded)</TabsTrigger>
              <TabsTrigger value="inactive">Cancelled/Legacy</TabsTrigger>
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
                        <TableHead>Travel Date</TableHead>
                        <TableHead>Fare & Type</TableHead>
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
                              <span className="text-[10px] font-black text-accent uppercase tracking-tighter">{getTripCode(booking.scheduleId)}</span>
                            </div>
                            <div className="text-xs font-bold">{getRouteName(booking.routeId)}</div>
                            <div className="text-[10px] text-muted-foreground">
                               <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {getDeparture(booking.scheduleId)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {booking.travelDate || "No date"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-primary">₱{isMounted ? booking.finalFare?.toLocaleString() : "---"}</div>
                            <div className="text-[9px] uppercase font-bold text-muted-foreground">{booking.segmentLabel}</div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleOpenEdit(booking)}>
                                  <Pencil className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Info
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                {(booking.status === 'Reserved' || booking.status === 'Waitlisted') && (
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(booking.id, 'Confirmed')} className="text-green-600">
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {booking.status === 'Confirmed' && (
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(booking.id, 'Used')} className="text-indigo-600">
                                    <Ship className="h-4 w-4 mr-2" /> Mark as Boarded
                                  </DropdownMenuItem>
                                )}
                                {['Reserved', 'Waitlisted', 'Confirmed'].includes(booking.status) && (
                                  <>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(booking.id, 'Suspended')} className="text-orange-600">
                                      <AlertTriangle className="h-4 w-4 mr-2" /> No Show
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(booking.id, 'Auto-cancelled')} className="text-destructive">
                                      <Ban className="h-4 w-4 mr-2" /> Cancel Booking
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleDeleteBooking(booking.id);
                                  }} 
                                  className="text-destructive font-bold"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete Record
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
                    <h3 className="text-xl font-bold">No manifest records found</h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </main>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-accent" /> Edit Passenger Details
              </DialogTitle>
              <DialogDescription>
                Correct information for Ticket ID: <span className="font-bold text-primary">#{editingBooking?.id}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editDate">Travel Date</Label>
                <Input 
                  id="editDate" 
                  type="date"
                  value={editFormData.travelDate} 
                  onChange={(e) => setEditFormData({...editFormData, travelDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name</Label>
                <Input 
                  id="editName" 
                  value={editFormData.passengerName} 
                  onChange={(e) => setEditFormData({...editFormData, passengerName: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editContact">Contact Number</Label>
                <Input 
                  id="editContact" 
                  value={editFormData.passengerContact} 
                  onChange={(e) => setEditFormData({...editFormData, passengerContact: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} className="bg-primary text-white">
                <Check className="h-4 w-4 mr-2" /> Update Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
