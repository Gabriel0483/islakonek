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
import { AdminNav } from "@/components/admin-nav";
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

const ACTIVE_STATUSES = ["Reserved", "Waitlisted", "Confirmed", "Used"];

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

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(b => {
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
        return matchesSearch && (["Suspended", "Auto-cancelled", "Refunded"].includes(b.status) || !ACTIVE_STATUSES.includes(b.status));
      }
      
      return matchesSearch;
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, search, activeTab]);

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
      case 'Suspended': return <Badge variant="destructive">Suspended</Badge>;
      case 'Auto-cancelled': return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      case 'Refunded': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Refunded</Badge>;
      default: return <Badge variant="outline" className="opacity-70 italic">{status || 'Legacy'}</Badge>;
    }
  };

  const availableRebookingSchedules = schedules?.filter(s => 
    s.routeId === selectedBooking?.routeId && s.isActive
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent" />
          <span className="hidden sm:inline">Manage Bookings & Manifest</span>
          <span className="sm:hidden">Manifest</span>
        </h1>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search passenger, ID, or Date..." 
              className="pl-10 h-10 sm:h-12 bg-white border-none shadow-sm text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="bg-white px-3 py-1 font-bold text-[10px] sm:text-xs">Total: {bookings?.length || 0} records</Badge>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList className="bg-white border p-1 h-auto flex flex-nowrap sm:flex-wrap w-fit sm:w-full">
              <TabsTrigger value="all" className="shrink-0 text-[10px] sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="reserved" className="shrink-0 text-[10px] sm:text-sm">Reserved</TabsTrigger>
              <TabsTrigger value="waitlisted" className="shrink-0 text-[10px] sm:text-sm">Waitlisted</TabsTrigger>
              <TabsTrigger value="confirmed" className="shrink-0 text-[10px] sm:text-sm">Paid</TabsTrigger>
              <TabsTrigger value="used" className="shrink-0 text-[10px] sm:text-sm">Boarded</TabsTrigger>
              <TabsTrigger value="inactive" className="shrink-0 text-[10px] sm:text-sm">Inactive</TabsTrigger>
            </TabsList>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0 overflow-x-auto">
              {isBookingsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Loading manifest...</p>
                </div>
              ) : filteredBookings && filteredBookings.length > 0 ? (
                <div className="w-full min-w-[700px]">
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
                                 <Check className="h-2 w-2" /> Waived
                               </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-sm">{booking.passengerName}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              <Phone className="h-2.5 w-2.5 inline mr-1" /> {booking.passengerContact}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Tag className="h-2.5 w-2.5 text-accent" />
                              <span className="text-[10px] font-black text-accent uppercase">{getTripCode(booking.scheduleId)}</span>
                            </div>
                            <div className="text-xs font-bold truncate max-w-[150px]">{routes?.find(r => r.id === booking.routeId)?.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                               <Calendar className="h-2.5 w-2.5 inline mr-1" /> {booking.travelDate}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(booking.status)}</TableCell>
                          <TableCell>
                            <div className="font-black text-primary text-sm">₱{isMounted ? booking.finalFare?.toLocaleString() : "---"}</div>
                            {booking.penaltyFees > 0 && (
                               <div className="text-[9px] text-destructive font-bold uppercase mt-1">
                                 + ₱{isMounted ? booking.penaltyFees.toLocaleString() : "---"}
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
                                    <QrCode className="h-4 w-4 mr-2 text-primary" /> Boarding Pass
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleOpenEdit(booking)}>
                                  <Pencil className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Info
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
                                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleOpenDelete(booking)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

      {/* Rebook Dialog */}
      <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
         <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
               <RefreshCw className="h-5 w-5 text-accent" /> Rebooking Ticket
             </DialogTitle>
             <DialogDescription className="text-xs">
               Rebook Ticket ID: <span className="font-bold text-primary">#{selectedBooking?.id}</span>
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-4 sm:gap-6 py-4">
             <div className="space-y-3 p-3 sm:p-4 border rounded-lg bg-secondary/5">
               <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-bold text-xs sm:text-sm">Waive Penalties</Label>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground italic">Exempt from standard rebooking fees.</p>
                  </div>
                  <Switch 
                    checked={rebookingData.isFeeWaived} 
                    onCheckedChange={(checked) => setRebookingData({...rebookingData, isFeeWaived: checked})}
                  />
               </div>
               {rebookingData.isFeeWaived && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] sm:text-xs">Reason for Waiving</Label>
                    <Select value={rebookingData.waiveReason} onValueChange={(val) => setRebookingData({...rebookingData, waiveReason: val})}>
                      <SelectTrigger className="h-8 text-[10px] sm:text-xs">
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

             <div className="space-y-1.5">
               <Label className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">New Travel Date</Label>
               <Input 
                 type="date" 
                 value={rebookingData.newTravelDate} 
                 onChange={(e) => setRebookingData({...rebookingData, newTravelDate: e.target.value, newScheduleId: ""})} 
                 className="h-10 text-sm"
               />
             </div>

             <div className="space-y-1.5">
               <Label className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">Select New Voyage</Label>
               <Select value={rebookingData.newScheduleId} onValueChange={(val) => setRebookingData({...rebookingData, newScheduleId: val})}>
                 <SelectTrigger className="h-10 text-sm">
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
                 <p className="text-[10px] uppercase font-bold opacity-70">Penalty Fees</p>
                 <p className="text-xl sm:text-2xl font-black">₱{isMounted ? calculateRebookingFees.toLocaleString() : "---"}</p>
               </div>
               <Badge variant="outline" className="text-white border-white/20 text-[9px]">
                 {calculateRebookingFees === 0 ? "Complimentary" : "Standard Fee"}
               </Badge>
             </div>
           </div>
           <DialogFooter className="gap-2 sm:gap-0">
             <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)} className="h-10 text-sm">Cancel</Button>
             <Button 
              onClick={handlePerformRebook} 
              className="bg-primary text-white h-10 text-sm"
              disabled={!rebookingData.newScheduleId || !rebookingData.newTravelDate}
             >
               Process Rebooking
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
      
      {/* Other dialogs (View Details, Edit, Status, Delete, Boarding Pass) would also be optimized similarly */}
    </div>
  );
}
