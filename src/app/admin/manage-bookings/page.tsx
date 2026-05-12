
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
  Info,
  User,
  Mail,
  Heart,
  Eye,
  XCircle,
  QrCode,
  Download,
  Printer
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking
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
import { Switch } from "@/components/ui/switch";
import Image from "next/image";

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

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    passengerName: "",
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
    emergencyContact: "",
    travelDate: ""
  });

  const [rebookingData, setRebookingData] = useState({
    newScheduleId: "",
    newTravelDate: "",
    isFeeWaived: false,
    waiveReason: "Weather"
  });

  const [statusTarget, setStatusTarget] = useState<{ booking: any, status: BookingStatus } | null>(null);
  const [statusActionData, setStatusActionData] = useState({
    isFeeWaived: false,
    waiveReason: "Weather"
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

  const getRoute = (id: string) => routes?.find(r => r.id === id);
  const getSchedule = (id: string) => schedules?.find(s => s.id === id);
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  // Actions
  const handleOpenViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setIsViewDetailsOpen(true);
  };

  const handleOpenEdit = (booking: any) => {
    setSelectedBooking(booking);
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

  const handleOpenStatusDialog = (booking: any, status: BookingStatus) => {
    setStatusTarget({ booking, status });
    setStatusActionData({ isFeeWaived: false, waiveReason: "Weather" });
    setIsStatusDialogOpen(true);
  };

  const handleOpenRebook = (booking: any) => {
    setSelectedBooking(booking);
    setRebookingData({
      newScheduleId: "",
      newTravelDate: booking.travelDate || "",
      isFeeWaived: false,
      waiveReason: "Weather"
    });
    setIsRebookDialogOpen(true);
  };

  const handleOpenDelete = (booking: any) => {
    setSelectedBooking(booking);
    setIsDeleteConfirmOpen(true);
  };

  const handleViewBoardingPass = (booking: any) => {
    setSelectedBooking(booking);
    setIsBoardingPassOpen(true);
  };

  const calculateStatusPenalties = () => {
    if (!statusTarget) return 0;
    if (statusActionData.isFeeWaived) return 0;

    const { booking, status } = statusTarget;
    const route = getRoute(booking.routeId);
    let penalty = 0;

    if (status === 'Refunded' || status === 'Auto-cancelled') {
       if (booking.status === 'Suspended') {
          penalty = (route?.noShowFee || 0) + (route?.cancellationFee || 0);
       } else {
          penalty = route?.cancellationFee || 0;
       }
    } else if (status === 'Suspended') {
       penalty = route?.noShowFee || 0;
    }

    return penalty;
  };

  const handleConfirmStatusUpdate = () => {
    if (!db || !statusTarget) return;
    
    const penaltyAmount = calculateStatusPenalties();
    const bookingRef = doc(db, "bookings", statusTarget.booking.id);
    
    const updateData: any = { 
      status: statusTarget.status, 
      penaltyFees: penaltyAmount,
      isFeeWaived: statusActionData.isFeeWaived,
      waiveReason: statusActionData.isFeeWaived ? statusActionData.waiveReason : "",
      updatedAt: new Date().toISOString() 
    };

    // If marking as paid/confirmed, assign a boarding sequence number
    if (statusTarget.status === 'Confirmed' && !statusTarget.booking.boardingSequenceNumber) {
      const tripBookings = bookings?.filter(b => 
        b.scheduleId === statusTarget.booking.scheduleId && 
        b.travelDate === statusTarget.booking.travelDate && 
        (b.status === 'Confirmed' || b.status === 'Used')
      ) || [];
      updateData.boardingSequenceNumber = tripBookings.length + 1;
    }

    updateDocumentNonBlocking(bookingRef, updateData);

    setIsStatusDialogOpen(false);

    // If it was confirmed, show the pass
    if (statusTarget.status === 'Confirmed') {
      setTimeout(() => {
        const updatedBooking = { ...statusTarget.booking, ...updateData };
        setSelectedBooking(updatedBooking);
        setIsBoardingPassOpen(true);
      }, 500);
    }
  };

  const calculateRebookingFees = useMemo(() => {
    if (!selectedBooking || !routes) return 0;
    if (rebookingData.isFeeWaived) return 0;

    const route = getRoute(selectedBooking.routeId);
    let fees = 0;
    if (selectedBooking.status === 'Suspended') {
      fees += (route?.noShowFee || 0);
    }
    fees += (route?.rebookingFee || 0);
    
    return fees;
  }, [selectedBooking, routes, rebookingData.isFeeWaived]);

  const handlePerformRebook = () => {
    if (!db || !selectedBooking || !rebookingData.newScheduleId) return;

    const fees = calculateRebookingFees;
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    
    // Calculate new sequence number
    const tripBookings = bookings?.filter(b => 
      b.scheduleId === rebookingData.newScheduleId && 
      b.travelDate === rebookingData.newTravelDate && 
      (b.status === 'Confirmed' || b.status === 'Used')
    ) || [];

    updateDocumentNonBlocking(bookingRef, {
      scheduleId: rebookingData.newScheduleId,
      travelDate: rebookingData.newTravelDate,
      status: "Confirmed",
      penaltyFees: fees,
      isFeeWaived: rebookingData.isFeeWaived,
      waiveReason: rebookingData.isFeeWaived ? rebookingData.waiveReason : "",
      boardingSequenceNumber: tripBookings.length + 1,
      updatedAt: new Date().toISOString()
    });

    setIsRebookDialogOpen(false);
  };

  const handleSaveEdit = () => {
    if (!db || !selectedBooking) return;
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    updateDocumentNonBlocking(bookingRef, {
      ...editFormData,
      updatedAt: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
  };

  const handleDeleteRecord = () => {
    if (!db || !selectedBooking) return;
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    deleteDocumentNonBlocking(bookingRef);
    setIsDeleteConfirmOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed': return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'Reserved': return <Badge className="bg-blue-500">Reserved</Badge>;
      case 'Waitlisted': return <Badge className="bg-orange-500">Waitlisted</Badge>;
      case 'Used': return <Badge className="bg-indigo-600">Used (Boarded)</Badge>;
      case 'Suspended': return <Badge variant="destructive">Suspended (No-Show)</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      case 'Refunded': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Refunded</Badge>;
      default: return <Badge variant="outline" className="opacity-70 italic">{status || 'Legacy'}</Badge>;
    }
  };

  const availableRebookingSchedules = schedules?.filter(s => 
    s.routeId === selectedBooking?.routeId && s.isActive
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
                {isBookingsLoading ? (
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
                        <TableRow key={booking.id} className="hover:bg-accent/5">
                          <TableCell className="font-mono text-[10px] font-bold">
                            #{booking.id}
                            {booking.isFeeWaived && (
                               <div className="text-[8px] text-green-600 uppercase font-black flex items-center gap-0.5 mt-1">
                                 <Check className="h-2 w-2" /> Fees Waived ({booking.waiveReason})
                               </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">{booking.passengerName}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              <Phone className="h-2.5 w-2.5 inline mr-1" /> {booking.passengerContact}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-2.5 w-2.5 text-accent" />
                              <span className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</span>
                            </div>
                            <div className="text-xs font-bold">{routes?.find(r => r.id === booking.routeId)?.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                               <Calendar className="h-2.5 w-2.5 inline mr-1" /> {booking.travelDate} @ {getDeparture(booking.scheduleId)}
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
                                <DropdownMenuItem onSelect={() => handleOpenViewDetails(booking)}>
                                  <Eye className="h-4 w-4 mr-2 text-muted-foreground" /> View Details
                                </DropdownMenuItem>
                                {(booking.status === 'Confirmed' || booking.status === 'Used') && (
                                  <DropdownMenuItem onSelect={() => handleViewBoardingPass(booking)}>
                                    <QrCode className="h-4 w-4 mr-2 text-primary" /> View Boarding Pass
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleOpenEdit(booking)}>
                                  <Pencil className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Booking
                                </DropdownMenuItem>
                                {(booking.status === 'Reserved' || booking.status === 'Waitlisted') && (
                                  <DropdownMenuItem onSelect={() => handleOpenStatusDialog(booking, 'Confirmed')} className="text-green-600">
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleOpenRebook(booking)}>
                                  <RefreshCw className="h-4 w-4 mr-2 text-accent" /> Rebook
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleOpenStatusDialog(booking, 'Refunded')} className="text-blue-600">
                                  <Banknote className="h-4 w-4 mr-2" /> Refund
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleOpenStatusDialog(booking, 'Auto-cancelled')} className="text-orange-600">
                                  <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleOpenDelete(booking)} className="text-destructive">
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

        {/* Boarding Pass Dialog */}
        <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 bg-transparent border-none shadow-none">
            <DialogHeader className="sr-only">
              <DialogTitle>Boarding Pass</DialogTitle>
              <DialogDescription>Digital boarding pass with voyage details and QR code.</DialogDescription>
            </DialogHeader>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="bg-primary p-6 text-primary-foreground text-center space-y-2">
                <div className="flex justify-center mb-2">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Ship className="h-8 w-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Boarding Pass</h2>
                <p className="text-xs opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-dashed pb-4">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Passenger Name</Label>
                    <p className="text-lg font-black text-primary uppercase">{selectedBooking?.passengerName}</p>
                  </div>
                  <div className="text-right">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</Label>
                    <p className="font-mono text-sm font-bold">#{selectedBooking?.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Trip ID</Label>
                    <p className="font-black text-accent uppercase">{getTripCode(selectedBooking?.scheduleId)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Date of Travel</Label>
                    <p className="font-bold">{selectedBooking?.travelDate}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Departure Time</Label>
                    <p className="font-bold">{getDeparture(selectedBooking?.scheduleId)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</Label>
                    <div className="bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">
                      {selectedBooking?.boardingSequenceNumber || "N/A"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Routing</Label>
                    <p className="font-bold text-sm">{getRoute(selectedBooking?.routeId)?.name}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-6 border-t border-dashed relative">
                  {/* Decorative Ticket Punches */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/80 md:bg-transparent" />
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/80 md:bg-transparent" />

                  <div className="bg-primary/5 p-4 rounded-2xl mb-4 border border-primary/10">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BOARDING_PASS_${selectedBooking?.id}_${selectedBooking?.boardingSequenceNumber}&color=1f3a93&bgcolor=ffffff`}
                      alt="Boarding Pass QR"
                      width={180}
                      height={180}
                      className="mix-blend-multiply transition-opacity hover:opacity-90"
                    />
                  </div>
                  <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic">Scan at the boarding gate</p>
                </div>
              </div>

              <div className="bg-secondary/30 p-4 flex gap-2">
                <Button className="flex-1 bg-primary text-white font-bold" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print Pass
                </Button>
                <Button variant="outline" className="flex-1 font-bold">
                  <Download className="h-4 w-4 mr-2" /> Save Image
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button variant="link" className="text-white" onClick={() => setIsBoardingPassOpen(false)}>
                Close Boarding Pass
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-accent" /> Booking Details
              </DialogTitle>
              <DialogDescription>
                Detailed information for Ticket ID: <span className="font-bold text-primary">#{selectedBooking?.id}</span>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Passenger Information</Label>
                  <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-lg">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</p>
                      <p className="font-bold">{selectedBooking?.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Date of Birth</p>
                      <p className="font-bold">{selectedBooking?.passengerDob}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                      <p className="font-bold">{selectedBooking?.passengerEmail || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Contact</p>
                      <p className="font-bold">{selectedBooking?.passengerContact}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Emergency Contact</p>
                      <p className="font-bold">{selectedBooking?.emergencyContact}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Voyage Details</Label>
                  <div className="bg-secondary/10 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Trip Code</p>
                      <p className="font-black text-accent">{getTripCode(selectedBooking?.scheduleId)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Route</p>
                      <p className="font-bold">{getRoute(selectedBooking?.routeId)?.name}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Travel Date</p>
                      <p className="font-bold">{selectedBooking?.travelDate} @ {getDeparture(selectedBooking?.scheduleId)}</p>
                    </div>
                    {selectedBooking?.boardingSequenceNumber && (
                      <div className="flex justify-between items-center pt-2 border-t border-muted-foreground/10">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Boarding Sequence</p>
                        <p className="font-black text-primary text-lg">#{selectedBooking.boardingSequenceNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Financial Summary</Label>
                  <div className="bg-primary/5 p-4 rounded-lg space-y-3 border border-primary/10">
                    <div className="flex justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                      {getStatusBadge(selectedBooking?.status || "")}
                    </div>
                    <div className="flex justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Final Fare</p>
                      <p className="font-black text-primary">₱{isMounted ? selectedBooking?.finalFare?.toLocaleString() : "---"}</p>
                    </div>
                    {selectedBooking?.penaltyFees > 0 && (
                      <div className="flex justify-between text-destructive">
                        <p className="text-[10px] uppercase font-bold">Penalties Applied</p>
                        <p className="font-black">+ ₱{selectedBooking.penaltyFees.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedBooking?.isFeeWaived && (
                      <div className="bg-green-50 p-2 rounded text-[10px] text-green-700 font-bold italic">
                        Fees waived due to: {selectedBooking.waiveReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Booking Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-accent" /> Edit Booking
              </DialogTitle>
              <DialogDescription>
                Correct information for Ticket ID: <span className="font-bold text-primary">#{selectedBooking?.id}</span>
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

        {/* Rebook Dialog */}
        <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
           <DialogContent className="sm:max-w-[500px]">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2">
                 <RefreshCw className="h-5 w-5 text-accent" /> Rebooking Ticket
               </DialogTitle>
               <DialogDescription>
                 Rebook Ticket ID: <span className="font-bold text-primary">#{selectedBooking?.id}</span>
               </DialogDescription>
             </DialogHeader>
             <div className="grid gap-6 py-4">
               <div className="space-y-4 p-4 border rounded-lg bg-secondary/5">
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold">Waive Penalties</Label>
                      <p className="text-[10px] text-muted-foreground italic">Waive fees for specific reasons.</p>
                    </div>
                    <Switch 
                      checked={rebookingData.isFeeWaived} 
                      onCheckedChange={(checked) => setRebookingData({...rebookingData, isFeeWaived: checked})}
                    />
                 </div>
                 {rebookingData.isFeeWaived && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs">Reason for Waiving</Label>
                      <Select value={rebookingData.waiveReason} onValueChange={(val) => setRebookingData({...rebookingData, waiveReason: val})}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weather">Adverse Weather</SelectItem>
                          <SelectItem value="Technical">Technical Issue</SelectItem>
                          <SelectItem value="Force Majeure">Force Majeure</SelectItem>
                          <SelectItem value="Passenger Request">Special Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                 )}
               </div>

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

               <div className="p-4 bg-primary rounded-lg text-primary-foreground flex justify-between items-center">
                 <div>
                   <p className="text-[10px] uppercase font-bold opacity-70">Penalty Fees to Apply</p>
                   <p className="text-2xl font-black">₱{calculateRebookingFees.toLocaleString()}</p>
                 </div>
                 <Badge variant="outline" className="text-white border-white/20">
                   {calculateRebookingFees === 0 ? "Complimentary" : "Standard Fee"}
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

        {/* Status Update Dialog (Refund/Cancel) */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
           <DialogContent className="sm:max-w-[450px]">
             <DialogHeader>
               <DialogTitle>Confirm Status Update</DialogTitle>
               <DialogDescription>
                 Changing Ticket #{statusTarget?.booking.id} status to <span className="font-bold text-primary">{statusTarget?.status === 'Auto-cancelled' ? 'Cancelled' : statusTarget?.status}</span>.
               </DialogDescription>
             </DialogHeader>
             
             <div className="grid gap-6 py-4">
               {(statusTarget?.status === 'Refunded' || statusTarget?.status === 'Auto-cancelled') && (
                  <div className="space-y-4 p-4 border rounded-lg bg-secondary/5">
                    <div className="flex items-center justify-between">
                       <div className="space-y-0.5">
                         <Label className="font-bold">Waive Penalty Fee</Label>
                         <p className="text-[10px] text-muted-foreground italic">Exempt passenger from standard charges.</p>
                       </div>
                       <Switch 
                         checked={statusActionData.isFeeWaived} 
                         onCheckedChange={(checked) => setStatusActionData({...statusActionData, isFeeWaived: checked})}
                       />
                    </div>
                    {statusActionData.isFeeWaived && (
                       <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                         <Label className="text-xs">Reason for Waiving</Label>
                         <Select value={statusActionData.waiveReason} onValueChange={(val) => setStatusActionData({...statusActionData, waiveReason: val})}>
                           <SelectTrigger className="h-8 text-xs">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Weather">Adverse Weather</SelectItem>
                             <SelectItem value="Technical">Technical Issue</SelectItem>
                             <SelectItem value="Force Majeure">Force Majeure</SelectItem>
                             <SelectItem value="Passenger Request">Staff Discretion</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                    )}
                  </div>
               )}

               <div className="p-4 rounded-lg bg-primary text-primary-foreground flex justify-between items-center">
                 <div>
                   <p className="text-[10px] uppercase font-bold opacity-70">Penalty Fee</p>
                   <p className="text-2xl font-black">₱{calculateStatusPenalties().toLocaleString()}</p>
                 </div>
               </div>
             </div>

             <DialogFooter>
               <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
               <Button onClick={handleConfirmStatusUpdate} className="bg-primary text-white">
                 Confirm Update
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Delete Record
              </DialogTitle>
              <DialogDescription>
                Are you absolutely sure you want to delete Ticket ID <span className="font-bold">#{selectedBooking?.id}</span>? This action cannot be undone and will remove all manifest data for this passenger.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>No, Keep Record</Button>
              <Button variant="destructive" onClick={handleDeleteRecord}>Yes, Delete Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
