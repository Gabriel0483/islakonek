"use client";

import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
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
  Printer,
  ChevronRight,
  ChevronLeft,
  Ghost
} from "lucide-react";
import { collection, doc, query, orderBy, limit, runTransaction, getDocs, where, increment } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  updateDocumentNonBlocking
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type BookingStatus = "Reserved" | "Waitlisted" | "Confirmed" | "Used" | "Suspended" | "Auto-cancelled" | "Refunded";

const ACTIVE_STATUSES = ["Reserved", "Waitlisted", "Confirmed", "Used"];
const ITEMS_PER_PAGE = 50;

/**
 * MEMOIZED ROW COMPONENT
 * Prevents massive re-renders when a single row's state changes.
 */
const BookingRow = memo(({ 
  booking, 
  isMounted, 
  getRouteName, 
  getTripCode, 
  onView, 
  onEdit, 
  onStatus, 
  onRebook, 
  onDelete, 
  onPass 
}: any) => {
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

  return (
    <TableRow className="hover:bg-accent/5">
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
        <div className="text-xs font-bold truncate max-w-[150px]">{getRouteName(booking.routeId)}</div>
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
            <DropdownMenuItem onSelect={() => onView(booking)}>
              <Eye className="h-4 w-4 mr-2 text-muted-foreground" /> View Details
            </DropdownMenuItem>
            {(booking.status === 'Confirmed' || booking.status === 'Used') && (
              <DropdownMenuItem onSelect={() => onPass(booking)}>
                <QrCode className="h-4 w-4 mr-2 text-primary" /> Boarding Pass
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onEdit(booking)}>
              <Pencil className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Info
            </DropdownMenuItem>
            {(booking.status === 'Reserved' || booking.status === 'Waitlisted') && (
              <DropdownMenuItem onSelect={() => onStatus(booking, 'Confirmed')} className="text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onRebook(booking)}>
              <RefreshCw className="h-4 w-4 mr-2 text-accent" /> Rebook
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onStatus(booking, 'Refunded')} className="text-blue-600">
              <Banknote className="h-4 w-4 mr-2" /> Refund
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStatus(booking, 'Auto-cancelled')} className="text-orange-600">
              <XCircle className="h-4 w-4 mr-2" /> Cancel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(booking)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}, (prev, next) => {
  // Deep equality check for memoization stability
  return prev.booking.id === next.booking.id && 
         prev.booking.status === next.booking.status &&
         prev.booking.updatedAt === next.booking.updatedAt &&
         prev.isMounted === next.isMounted;
});

BookingRow.displayName = "BookingRow";

export default function ManageBookingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [todayPHT, setTodayPHT] = useState("");
  const [currentTimePHT, setCurrentTimePHT] = useState("");

  useEffect(() => {
    setIsMounted(true);
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
  
  // Guard for stuck Radix body locks
  useEffect(() => {
    const checkBodyLock = () => {
      if (!document.querySelector('[role="dialog"]') && !document.querySelector('[role="menu"]')) {
        document.body.style.pointerEvents = 'auto';
      }
    };
    const timer = setInterval(checkBodyLock, 1000);
    return () => clearInterval(timer);
  }, []);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(300));
  }, [db]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: schedules } = useCollection(schedulesRef);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);

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
    const searchLower = search.toLowerCase();
    
    return bookings.filter(b => {
      const matchesSearch = 
        !search ||
        b.passengerName?.toLowerCase().includes(searchLower) ||
        b.id?.toLowerCase().includes(searchLower) ||
        b.travelDate?.includes(search);
      
      if (!matchesSearch) return false;
      
      if (activeTab === "all") return true;
      if (activeTab === "reserved") return b.status === "Reserved";
      if (activeTab === "waitlisted") return b.status === "Waitlisted";
      if (activeTab === "confirmed") return b.status === "Confirmed";
      if (activeTab === "used") return b.status === "Used";
      if (activeTab === "inactive") {
        return ["Suspended", "Auto-cancelled", "Refunded"].includes(b.status) || !ACTIVE_STATUSES.includes(b.status);
      }
      return true;
    });
  }, [bookings, search, activeTab]);

  const ghostBookings = useMemo(() => {
    if (!bookings || !schedules || !todayPHT || !currentTimePHT) return [];
    
    return bookings.filter(b => {
      if (b.status !== "Reserved" || b.travelDate !== todayPHT) return false;
      const schedule = schedules.find(s => s.id === b.scheduleId);
      if (!schedule) return false;
      const [depH, depM] = schedule.departureTime.split(':').map(Number);
      const [curH, curM] = currentTimePHT.split(':').map(Number);
      const depTotal = depH * 60 + depM;
      const curTotal = curH * 60 + curM;
      return (depTotal - curTotal) <= 60;
    });
  }, [bookings, schedules, todayPHT, currentTimePHT]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const getRouteName = useCallback((id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route", [routes]);
  const getDeparture = useCallback((id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--", [schedules]);
  const getTripCode = useCallback((id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A", [schedules]);

  // STABLE ACTION HANDLERS
  const handleOpenViewDetails = useCallback((booking: any) => {
    setSelectedBooking(booking);
    setIsViewDetailsOpen(true);
  }, []);

  const handleOpenEdit = useCallback((booking: any) => {
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
  }, []);

  const handleOpenStatusDialog = useCallback((booking: any, status: BookingStatus) => {
    setStatusTarget({ booking, status });
    setStatusActionData({ isFeeWaived: false, waiveReason: "Weather" });
    setIsStatusDialogOpen(true);
  }, []);

  const handleOpenRebook = useCallback((booking: any) => {
    setSelectedBooking(booking);
    setRebookingData({
      newScheduleId: "",
      newTravelDate: booking.travelDate || "",
      isFeeWaived: false,
      waiveReason: "Weather"
    });
    setIsRebookDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((booking: any) => {
    setSelectedBooking(booking);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleViewBoardingPass = useCallback((booking: any) => {
    setSelectedBooking(booking);
    setIsBoardingPassOpen(true);
  }, []);

  const calculateStatusPenalties = useCallback(() => {
    if (!statusTarget || !routes) return 0;
    if (statusActionData.isFeeWaived) return 0;
    const { booking, status } = statusTarget;
    const route = routes.find(r => r.id === booking.routeId);
    let penalty = 0;
    if (status === 'Refunded' || status === 'Auto-cancelled') {
       penalty = booking.status === 'Suspended' ? (route?.noShowFee || 0) + (route?.cancellationFee || 0) : (route?.cancellationFee || 0);
    } else if (status === 'Suspended') {
       penalty = route?.noShowFee || 0;
    }
    return penalty;
  }, [statusTarget, routes, statusActionData.isFeeWaived]);

  const findWaitlistedCandidate = async (scheduleId: string, travelDate: string) => {
    if (!db) return null;
    try {
      const waitlistQuery = query(
        collection(db, "bookings"),
        where("scheduleId", "==", scheduleId),
        where("travelDate", "==", travelDate),
        where("status", "==", "Waitlisted"),
        orderBy("createdAt", "asc"),
        limit(1)
      );
      const snap = await getDocs(waitlistQuery);
      return !snap.empty ? snap.docs[0] : null;
    } catch (e) { return null; }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!db || !statusTarget || isActionProcessing) return;
    setIsActionProcessing(true);
    const { booking, status: newStatus } = statusTarget;
    const penaltyAmount = calculateStatusPenalties();
    setIsStatusDialogOpen(false);

    try {
      const wasConfirmed = ['Confirmed', 'Reserved', 'Used'].includes(booking.status);
      const isNowInactive = ['Auto-cancelled', 'Refunded', 'Suspended'].includes(newStatus);
      let candidateDoc = (wasConfirmed && isNowInactive) ? await findWaitlistedCandidate(booking.scheduleId, booking.travelDate) : null;

      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, "bookings", booking.id);
        const voyageId = `${booking.scheduleId}_${booking.travelDate}`;
        const voyageRef = doc(db, "voyages", voyageId);

        transaction.update(bookingRef, { 
          status: newStatus, 
          penaltyFees: penaltyAmount,
          isFeeWaived: statusActionData.isFeeWaived,
          waiveReason: statusActionData.isFeeWaived ? statusActionData.waiveReason : "",
          updatedAt: new Date().toISOString() 
        });

        if (wasConfirmed && isNowInactive) {
          transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
          if (candidateDoc) {
            const voyageSnap = await transaction.get(voyageRef);
            const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;
            transaction.update(candidateDoc.ref, {
              status: "Reserved",
              boardingSequenceNumber: currentBooked,
              remarks: "Auto-promoted from Waitlist (System)",
              updatedAt: new Date().toISOString()
            });
            transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
          }
        }
      });
      if (newStatus === 'Confirmed') setIsBoardingPassOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally { setIsActionProcessing(false); }
  };

  const calculateRebookingFees = useMemo(() => {
    if (!selectedBooking || !routes) return 0;
    if (rebookingData.isFeeWaived) return 0;
    const route = routes.find(r => r.id === selectedBooking.routeId);
    let fees = selectedBooking.status === 'Suspended' ? (route?.noShowFee || 0) : 0;
    fees += (route?.rebookingFee || 0);
    return fees;
  }, [selectedBooking, routes, rebookingData.isFeeWaived]);

  const handlePerformRebook = () => {
    if (!db || !selectedBooking || !rebookingData.newScheduleId || isActionProcessing) return;
    setIsActionProcessing(true);
    const fees = calculateRebookingFees;
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    const tripBookings = bookings?.filter(b => b.scheduleId === rebookingData.newScheduleId && b.travelDate === rebookingData.newTravelDate && (b.status === 'Confirmed' || b.status === 'Used')) || [];

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
    
    setTimeout(() => { setIsRebookDialogOpen(false); setIsActionProcessing(false); }, 200);
  };

  const handleSaveEdit = () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    updateDocumentNonBlocking(bookingRef, { ...editFormData, updatedAt: new Date().toISOString() });
    setTimeout(() => { setIsEditDialogOpen(false); setIsActionProcessing(false); }, 200);
  };

  const handleDeleteRecord = async () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    const bookingId = selectedBooking.id;
    const voyageId = `${selectedBooking.scheduleId}_${selectedBooking.travelDate}`;
    const wasConfirmed = ['Confirmed', 'Reserved', 'Used'].includes(selectedBooking.status);

    setIsDeleteConfirmOpen(false);

    try {
      let candidateDoc = wasConfirmed ? await findWaitlistedCandidate(selectedBooking.scheduleId, selectedBooking.travelDate) : null;

      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, "bookings", bookingId);
        const voyageRef = doc(db, "voyages", voyageId);
        transaction.delete(bookingRef);

        if (wasConfirmed) {
          transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
          if (candidateDoc) {
            const voyageSnap = await transaction.get(voyageRef);
            const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;
            transaction.update(candidateDoc.ref, {
              status: "Reserved",
              boardingSequenceNumber: currentBooked,
              remarks: "Auto-promoted from Waitlist (System)",
              updatedAt: new Date().toISOString()
            });
            transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
          }
        }
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: e.message });
    } finally { 
      setIsActionProcessing(false);
      setSelectedBooking(null);
    }
  };

  const handlePurgeGhosts = async () => {
    if (!db || ghostBookings.length === 0 || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      for (const b of ghostBookings) {
        const candidateDoc = await findWaitlistedCandidate(b.scheduleId, b.travelDate);
        await runTransaction(db, async (transaction) => {
          const voyageId = `${b.scheduleId}_${b.travelDate}`;
          const voyageRef = doc(db, "voyages", voyageId);
          const bRef = doc(db, "bookings", b.id);
          transaction.update(bRef, { status: "Auto-cancelled", updatedAt: new Date().toISOString(), remarks: "Purged: Unpaid ghost reservation released 1hr before departure." });
          transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
          if (candidateDoc) {
            const voyageSnap = await transaction.get(voyageRef);
            const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;
            transaction.update(candidateDoc.ref, { status: "Reserved", boardingSequenceNumber: currentBooked, updatedAt: new Date().toISOString() });
            transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
          }
        });
      }
      setIsPurgeDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: e.message });
    } finally { setIsActionProcessing(false); }
  };

  const availableRebookingSchedules = schedules?.filter(s => s.routeId === selectedBooking?.routeId && s.isActive);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent" /> Manage Bookings
        </h1>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("h-9 gap-2 font-bold transition-all", ghostBookings.length > 0 ? "border-orange-200 bg-orange-50 text-orange-600 animate-pulse" : "text-muted-foreground")}
          onClick={() => setIsPurgeDialogOpen(true)}
        >
          <Ghost className="h-4 w-4" />
          <span className="hidden sm:inline">Ghost Purge</span>
          {ghostBookings.length > 0 && <Badge className="bg-orange-600 h-5 px-1.5 min-w-[20px]">{ghostBookings.length}</Badge>}
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search passenger, ID, or Date..." 
              className="pl-10 h-10 sm:h-12 bg-white border-none shadow-sm text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Badge variant="outline" className="bg-white px-3 py-1 font-bold text-[10px] sm:text-xs">Found {filteredBookings.length} records</Badge>
        </div>

        <Tabs defaultValue="all" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="space-y-6">
          <TabsList className="bg-white border p-1 h-auto flex flex-wrap w-full sm:w-fit">
            {["all", "reserved", "waitlisted", "confirmed", "used", "inactive"].map(tab => (
              <TabsTrigger key={tab} value={tab} className="text-[10px] sm:text-sm capitalize">{tab}</TabsTrigger>
            ))}
          </TabsList>

          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0 overflow-x-auto">
              {isBookingsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Loading manifest...</p>
                </div>
              ) : paginatedBookings.length > 0 ? (
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
                      {paginatedBookings.map((booking) => (
                        <BookingRow 
                          key={booking.id}
                          booking={booking}
                          isMounted={isMounted}
                          getRouteName={getRouteName}
                          getTripCode={getTripCode}
                          onView={handleOpenViewDetails}
                          onEdit={handleOpenEdit}
                          onStatus={handleOpenStatusDialog}
                          onRebook={handleOpenRebook}
                          onDelete={handleOpenDelete}
                          onPass={handleViewBoardingPass}
                        />
                      ))}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="p-4 border-t flex items-center justify-between bg-secondary/10">
                      <p className="text-xs font-bold text-muted-foreground">Page {currentPage} of {totalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="h-8 text-xs">Previous</Button>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="h-8 text-xs">Next</Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 opacity-50">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-xl font-bold">No manifest records found</h3>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </main>

      {/* DIALOGS */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-orange-600 text-white">
            <div className="flex items-center gap-3">
               <Ghost className="h-6 w-6" />
               <div><DialogTitle className="text-xl font-black uppercase">Ghost Purge</DialogTitle></div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm font-bold text-orange-800">Ready to release {ghostBookings.length} unpaid seats?</p>
            <ScrollArea className="h-32 pr-4">
              {ghostBookings.map(b => (
                <div key={b.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-orange-100 mb-2">
                  <span className="font-bold">{b.passengerName}</span>
                  <span className="font-mono">#{b.id}</span>
                </div>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 gap-2">
            <Button variant="outline" onClick={() => setIsPurgeDialogOpen(false)}>Close</Button>
            <Button className="bg-orange-600 text-white font-black" onClick={handlePurgeGhosts} disabled={isActionProcessing}>Purge & Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden">
          {isStatusDialogOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b">
                <DialogTitle>Update Status</DialogTitle>
                <DialogDescription>Ticket #{statusTarget?.booking.id} → {statusTarget?.status}</DialogDescription>
              </DialogHeader>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                  <Label>Waive Penalty Fees</Label>
                  <Switch checked={statusActionData.isFeeWaived} onCheckedChange={(checked) => setStatusActionData({...statusActionData, isFeeWaived: checked})} />
                </div>
                <div className="bg-primary p-5 rounded-xl text-primary-foreground flex justify-between items-center">
                  <p className="text-xs font-black uppercase opacity-70">Penalty Applied</p>
                  <p className="text-2xl font-black">₱{calculateStatusPenalties().toLocaleString()}</p>
                </div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button className="w-full sm:flex-1 bg-primary text-white" onClick={handleConfirmStatusUpdate} disabled={isActionProcessing}>Apply Change</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden">
          {isRebookDialogOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b">
                <DialogTitle>Rebook Ticket #{selectedBooking?.id}</DialogTitle>
              </DialogHeader>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2"><Label>New Date</Label><Input type="date" value={rebookingData.newTravelDate} onChange={(e) => setRebookingData({...rebookingData, newTravelDate: e.target.value, newScheduleId: ""})} /></div>
                <div className="space-y-2"><Label>New Trip</Label>
                  <Select value={rebookingData.newScheduleId} onValueChange={(val) => setRebookingData({...rebookingData, newScheduleId: val})}>
                    <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                    <SelectContent>{availableRebookingSchedules?.map(s => <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="bg-primary p-4 rounded-xl text-primary-foreground flex justify-between items-center">
                  <p className="text-xs font-black uppercase">Rebooking Fee</p>
                  <p className="text-xl font-black">₱{calculateRebookingFees.toLocaleString()}</p>
                </div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t gap-2">
                <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary text-white" onClick={handlePerformRebook} disabled={!rebookingData.newScheduleId || isActionProcessing}>Process Rebooking</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[600px] p-0 overflow-hidden">
          {isEditDialogOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b"><DialogTitle>Edit Passenger Info</DialogTitle></DialogHeader>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name</Label><Input value={editFormData.passengerName} onChange={(e) => setEditFormData({...editFormData, passengerName: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Birthdate</Label><Input type="date" value={editFormData.passengerDob} onChange={(e) => setEditFormData({...editFormData, passengerDob: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Mobile</Label><Input value={editFormData.passengerContact} onChange={(e) => setEditFormData({...editFormData, passengerContact: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Emergency</Label><Input value={editFormData.emergencyContact} onChange={(e) => setEditFormData({...editFormData, emergencyContact: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={editFormData.passengerEmail} onChange={(e) => setEditFormData({...editFormData, passengerEmail: e.target.value})} /></div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary text-white" onClick={handleSaveEdit} disabled={isActionProcessing}>Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden">
          {isViewDetailsOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b bg-primary text-primary-foreground"><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground text-[10px] uppercase font-black">Name</p><p className="font-bold">{selectedBooking?.passengerName}</p></div>
                  <div><p className="text-muted-foreground text-[10px] uppercase font-black">Status</p><p className="font-bold">{selectedBooking?.status}</p></div>
                </div>
                <div><p className="text-muted-foreground text-[10px] uppercase font-black">Route</p><p className="font-bold">{getRouteName(selectedBooking?.routeId)}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-muted-foreground text-[10px] uppercase font-black">Time</p><p className="font-bold">{getDeparture(selectedBooking?.scheduleId)}</p></div>
                  <div><p className="text-muted-foreground text-[10px] uppercase font-black">Amount</p><p className="font-bold">₱{selectedBooking?.finalFare?.toLocaleString()}</p></div>
                </div>
              </div>
              <DialogFooter className="p-4 border-t"><Button className="w-full" onClick={() => setIsViewDetailsOpen(false)}>Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-destructive" /></div>
            <DialogTitle className="text-center">Permanent Removal</DialogTitle>
            <DialogDescription className="text-center">Are you sure you want to delete Ticket <span className="font-bold">#{selectedBooking?.id}</span>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteRecord} disabled={isActionProcessing}>Delete Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[450px] p-0 bg-transparent border-none shadow-none">
          {isBoardingPassOpen && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl mx-auto my-4">
              <div className="bg-primary p-6 text-primary-foreground text-center space-y-2">
                <Ship className="h-8 w-8 mx-auto mb-2" /><h2 className="text-xl font-black uppercase">Boarding Pass</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-dashed pb-4">
                  <div className="flex-1 overflow-hidden"><p className="text-[10px] text-muted-foreground uppercase font-bold">Passenger</p><p className="font-black text-primary uppercase truncate">{selectedBooking?.passengerName}</p></div>
                  <div className="text-right"><p className="text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</p><p className="font-mono text-sm font-bold">#{selectedBooking?.id}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Trip</p><p className="font-black text-accent uppercase">{getTripCode(selectedBooking?.scheduleId)}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Time</p><p className="font-bold">{getDeparture(selectedBooking?.scheduleId)}</p></div>
                </div>
                <div className="flex flex-col items-center justify-center py-6 border-t border-dashed">
                  <div className="bg-secondary/20 p-4 rounded-2xl mb-4">
                    <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=PASS_${selectedBooking?.id}`} alt="QR" width={100} height={100} className="mix-blend-multiply" />
                  </div>
                </div>
              </div>
              <div className="bg-secondary/30 p-4 flex gap-2"><Button className="flex-1" onClick={() => window.print()}>Print</Button><Button variant="outline" className="flex-1" onClick={() => setIsBoardingPassOpen(false)}>Close</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}