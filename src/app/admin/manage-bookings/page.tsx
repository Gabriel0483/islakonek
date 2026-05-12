
"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ClipboardList, 
  Search, 
  Loader2, 
  Clock, 
  Phone, 
  CheckCircle2, 
  MoreVertical,
  Calendar,
  Tag,
  Ship,
  Ban,
  AlertTriangle,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Banknote,
  Info
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  setDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type BookingStatus = "Reserved" | "Waitlisted" | "Confirmed" | "Used" | "Suspended" | "Auto-cancelled" | "Refunded";

export default function ManageBookingsPage() {
  const db = useFirestore();
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
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
    emergencyContact: "",
    travelDate: ""
  });

  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [rebookingBooking, setRebookingBooking] = useState<any>(null);
  const [rebookingData, setRebookingData] = useState({
    newScheduleId: "",
    newTravelDate: "",
    reason: "Force Majeure"
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
      return matchesSearch && (["Suspended", "Auto-cancelled", "Refunded"].includes(b.status) || !activeStatuses.includes(b.status));
    }
    
    return matchesSearch;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getRoute = (id: string) => routes?.find(r => r.id === id);
  const getSchedule = (id: string) => schedules?.find(s => s.id === id);
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  const handleUpdateStatus = (booking: any, status: BookingStatus) => {
    if (!db) return;
    
    const route = getRoute(booking.routeId);
    const schedule = getSchedule(booking.scheduleId);
    let penaltyMessage = "";
    let penaltyAmount = 0;

    // Logic for Force Majeure Free Refund vs Penalized Cancel
    if (status === 'Refunded' || status === 'Auto-cancelled') {
       if (schedule?.isCancelled) {
          penaltyMessage = "\n\nOriginal trip was CANCELLED by operator. Refund is FREE of charge.";
       } else if (booking.status === 'Suspended') {
          penaltyAmount = (route?.noShowFee || 0) + (route?.cancellationFee || 0);
          penaltyMessage = `\n\nBooking was a No-Show. Total Penalty: ₱${penaltyAmount} (No-Show: ₱${route?.noShowFee || 0} + Cancel: ₱${route?.cancellationFee || 0}).`;
       } else {
          penaltyAmount = route?.cancellationFee || 0;
          penaltyMessage = `\n\nA Cancellation Fee of ₱${penaltyAmount} applies to this route.`;
       }
    } else if (status === 'Suspended') {
       penaltyAmount = route?.noShowFee || 0;
       penaltyMessage = `\n\nA No-Show Fee of ₱${penaltyAmount} applies to this record.`;
    }

    const confirmed = window.confirm(`Update booking ${booking.id} status to ${status}?${penaltyMessage}`);
    if (!confirmed) return;

    const bookingRef = doc(db, "bookings", booking.id);
    updateDocumentNonBlocking(bookingRef, { 
      status: status, 
      penaltyFees: penaltyAmount,
      updatedAt: new Date().toISOString() 
    });
  };

  const handleOpenRebook = (booking: any) => {
    setRebookingBooking(booking);
    setRebookingData({
      newScheduleId: "",
      newTravelDate: booking.travelDate || "",
      reason: getSchedule(booking.scheduleId)?.isCancelled ? "Force Majeure" : "Passenger Request"
    });
    setIsRebookDialogOpen(true);
  };

  const calculateRebookingFees = useMemo(() => {
    if (!rebookingBooking || !routes) return 0;
    const route = getRoute(rebookingBooking.routeId);
    const schedule = getSchedule(rebookingBooking.scheduleId);

    // Free if trip was cancelled
    if (schedule?.isCancelled) return 0;
    
    // Penalties apply if suspended (No-Show) or simple request
    let fees = 0;
    if (rebookingBooking.status === 'Suspended') {
      fees += (route?.noShowFee || 0);
    }
    fees += (route?.rebookingFee || 0);
    
    return fees;
  }, [rebookingBooking, routes, schedules]);

  const handlePerformRebook = () => {
    if (!db || !rebookingBooking || !rebookingData.newScheduleId) return;

    const fees = calculateRebookingFees;
    const bookingRef = doc(db, "bookings", rebookingBooking.id);
    
    updateDocumentNonBlocking(bookingRef, {
      scheduleId: rebookingData.newScheduleId,
      travelDate: rebookingData.newTravelDate,
      status: "Confirmed",
      penaltyFees: fees,
      updatedAt: new Date().toISOString()
    });

    setIsRebookDialogOpen(false);
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
      passengerDob: booking.passengerDob || "",
      passengerEmail: booking.passengerEmail || "",
      passengerContact: booking.passengerContact || "",
      emergencyContact: booking.emergencyContact || "",
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

  const isLoading = isBookingsLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed': return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'Reserved': return <Badge className="bg-blue-500">Reserved</Badge>;
      case 'Waitlisted': return <Badge className="bg-orange-500">Waitlisted</Badge>;
      case 'Used': return <Badge className="bg-indigo-600">Used (Boarded)</Badge>;
      case 'Suspended': return <Badge variant="destructive">Suspended (No-Show)</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground">Auto-Cancelled</Badge>;
      case 'Refunded': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Refunded</Badge>;
      default: return <Badge variant="outline" className="opacity-70 italic">{status || 'Legacy'}</Badge>;
    }
  };

  const availableRebookingSchedules = schedules?.filter(s => 
    s.routeId === rebookingBooking?.routeId && s.isActive && !s.isCancelled
  );

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
              <TabsTrigger value="inactive">Inactive/History</TabsTrigger>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Fare & Penalties</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id} className={`hover:bg-accent/5 ${getSchedule(booking.scheduleId)?.isCancelled ? 'bg-destructive/5' : ''}`}>
                          <TableCell className="font-mono text-[10px] font-bold">
                            #{booking.id}
                            {getSchedule(booking.scheduleId)?.isCancelled && (
                               <div className="text-[8px] text-destructive uppercase font-black flex items-center gap-0.5 mt-1">
                                 <AlertTriangle className="h-2 w-2" /> Trip Cancelled
                               </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">{booking.passengerName}</div>
                            <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-1">
                              <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {booking.passengerContact || "No contact"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-2.5 w-2.5 text-accent" />
                              <span className="text-[10px] font-black text-accent uppercase tracking-tighter">{getTripCode(booking.scheduleId)}</span>
                            </div>
                            <div className="text-xs font-bold">{getRouteName(booking.routeId)}</div>
                            <div className="text-[10px] text-muted-foreground">
                               <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {booking.travelDate} @ {getDeparture(booking.scheduleId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            <div className="font-black text-primary">₱{isMounted ? booking.finalFare?.toLocaleString() : "---"}</div>
                            {booking.penaltyFees > 0 && (
                               <div className="text-[9px] text-destructive font-bold uppercase mt-1">
                                 + ₱{booking.penaltyFees.toLocaleString()} Penalties
                               </div>
                            )}
                          </TableCell>
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
                                <DropdownMenuItem onSelect={() => handleOpenRebook(booking)}>
                                  <RefreshCw className="h-4 w-4 mr-2 text-accent" /> Rebook Trip
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Status & Finance</DropdownMenuLabel>
                                {['Reserved', 'Waitlisted', 'Confirmed', 'Suspended'].includes(booking.status) && (
                                   <DropdownMenuItem onSelect={() => handleUpdateStatus(booking, 'Refunded')} className="text-blue-600">
                                     <Banknote className="h-4 w-4 mr-2" /> Refund / Cancel
                                   </DropdownMenuItem>
                                )}
                                {(booking.status === 'Reserved' || booking.status === 'Waitlisted') && (
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(booking, 'Confirmed')} className="text-green-600">
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {booking.status === 'Confirmed' && (
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(booking, 'Used')} className="text-indigo-600">
                                    <Ship className="h-4 w-4 mr-2" /> Mark as Boarded
                                  </DropdownMenuItem>
                                )}
                                {['Reserved', 'Waitlisted', 'Confirmed'].includes(booking.status) && (
                                  <DropdownMenuItem onSelect={() => handleUpdateStatus(booking, 'Suspended')} className="text-orange-600">
                                    <AlertTriangle className="h-4 w-4 mr-2" /> Mark as No-Show
                                  </DropdownMenuItem>
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

        <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
           <DialogContent className="sm:max-w-[500px]">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <RefreshCw className="h-5 w-5 text-accent" /> Rebooking Ticket
               </DialogTitle>
               <DialogDescription>
                 Rebook Ticket ID: <span className="font-bold text-primary">#{rebookingBooking?.id}</span>
               </DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
               {getSchedule(rebookingBooking?.scheduleId)?.isCancelled ? (
                  <div className="p-3 rounded bg-blue-50 border border-blue-100 flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-800 font-medium">Original trip was cancelled by operator. This rebooking is <strong>FREE</strong> of charge.</p>
                  </div>
               ) : rebookingBooking?.status === 'Suspended' ? (
                  <div className="p-3 rounded bg-orange-50 border border-orange-100 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <p className="text-xs text-orange-800 font-medium">Passenger was a No-Show. Rebooking and No-Show fees will be applied.</p>
                  </div>
               ) : (
                  <div className="p-3 rounded bg-secondary/30 flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground">Standard rebooking fee applies.</p>
                  </div>
               )}

               <div className="space-y-2">
                 <Label>New Travel Date</Label>
                 <Input 
                   type="date" 
                   value={rebookingData.newTravelDate} 
                   onChange={(e) => setRebookingData({...rebookingData, newTravelDate: e.target.value, newScheduleId: ""})} 
                 />
               </div>

               <div className="space-y-2">
                 <Label>Select New Voyage</Label>
                 <Select value={rebookingData.newScheduleId} onValueChange={(val) => setRebookingData({...rebookingData, newScheduleId: val})}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select available trip" />
                   </SelectTrigger>
                   <SelectContent>
                     {availableRebookingSchedules?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div className="mt-2 p-4 bg-primary rounded-lg text-primary-foreground flex justify-between items-center">
                 <div>
                   <p className="text-[10px] uppercase font-bold opacity-70">Calculated Penalty Fees</p>
                   <p className="text-2xl font-black">₱{calculateRebookingFees.toLocaleString()}</p>
                 </div>
                 <Badge variant="outline" className="text-white border-white/20">
                   {calculateRebookingFees === 0 ? "Complimentary" : "Penalized"}
                 </Badge>
               </div>
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)}>Cancel</Button>
               <Button 
                onClick={handlePerformRebook} 
                className="bg-primary text-white"
                disabled={!rebookingData.newScheduleId || !rebookingData.newTravelDate}
               >
                 Process Rebooking
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-accent" /> Edit Passenger Details
              </DialogTitle>
              <DialogDescription>
                Correct information for Ticket ID: <span className="font-bold text-primary">#{editingBooking?.id}</span>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">Full Name</Label>
                    <Input 
                      id="editName" 
                      value={editFormData.passengerName} 
                      onChange={(e) => setEditFormData({...editFormData, passengerName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDob">Date of Birth</Label>
                    <Input 
                      id="editDob" 
                      type="date"
                      value={editFormData.passengerDob} 
                      onChange={(e) => setEditFormData({...editFormData, passengerDob: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email Address</Label>
                    <Input 
                      id="editEmail" 
                      type="email"
                      value={editFormData.passengerEmail} 
                      onChange={(e) => setEditFormData({...editFormData, passengerEmail: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editContact">Mobile Number</Label>
                    <Input 
                      id="editContact" 
                      value={editFormData.passengerContact} 
                      onChange={(e) => setEditFormData({...editFormData, passengerContact: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmergency">Emergency Contact</Label>
                  <Input 
                    id="editEmergency" 
                    value={editFormData.emergencyContact} 
                    onChange={(e) => setEditFormData({...editFormData, emergencyContact: e.target.value})} 
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
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
