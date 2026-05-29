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
  Ghost,
  MapPin,
  Filter,
  Wrench,
  ShieldAlert,
  X,
  RotateCcw,
  History,
  Building2,
  Globe,
  HandCoins,
  ArrowDownCircle,
  Undo2
} from "lucide-react";
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit, 
  runTransaction, 
  getDocs, 
  where, 
  increment,
  writeBatch 
} from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
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
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { subDays, format } from "date-fns";

type BookingStatus = "Reserved" | "Waitlisted" | "Confirmed" | "Used" | "Suspended" | "Auto-cancelled" | "Refunded";

const ITEMS_PER_PAGE = 50;

/**
 * MEMOIZED ROW COMPONENT
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

  const canShowPass = booking.status === 'Confirmed' || booking.status === 'Used';

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
        {booking.boardingSequenceNumber && (
          <div className="text-[9px] font-black text-accent uppercase mt-1">Seq: #{booking.boardingSequenceNumber}</div>
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
            {canShowPass && (
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
            {booking.status === 'Confirmed' && (
              <DropdownMenuItem onSelect={() => onStatus(booking, 'Reserved')} className="text-orange-600">
                <RotateCcw className="h-4 w-4 mr-2" /> Undo Payment
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

  // Filter States
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterScheduleId, setFilterScheduleId] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

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
  
  useEffect(() => {
    const checkBodyLock = () => {
      if (!document.querySelector('[role="dialog"]') && !document.querySelector('[role="menu"]')) {
        document.body.style.pointerEvents = 'auto';
      }
    };
    const timer = setInterval(checkBodyLock, 1000);
    return () => clearInterval(timer);
  }, []);

  const settingsRef = useMemoFirebase(() => db ? doc(db, "settings", "app") : null, [db]);
  const { data: appSettings } = useDoc(settingsRef);

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

  const faresRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "fares");
  }, [db]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);

  const { data: routes } = useCollection(routesRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);
  const { data: schedules } = useCollection(schedulesRef);
  const { data: fares } = useCollection(faresRef);
  const { data: vessels } = useCollection(vesselsRef);

  const companyName = appSettings?.companyName || "Isla Konek";

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isRebookDialogOpen, setIsRebookDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [isHistoryPurgeOpen, setIsHistoryPurgeOpen] = useState(false);
  const [isFeePaymentAlertOpen, setIsFeePaymentAlertOpen] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    passengerName: "",
    passengerDob: "",
    passengerEmail: "",
    passengerContact: "",
    emergencyContact: "",
    travelDate: "",
    fareId: ""
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
      const matchesSearch = !search || b.id?.toLowerCase().includes(searchLower) || b.passengerName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
      if (filterDate && b.travelDate !== filterDate) return false;
      if (filterScheduleId !== "all" && b.scheduleId !== filterScheduleId) return false;
      
      if (activeTab === "all") return true;
      if (activeTab === "reserved") return b.status === "Reserved";
      if (activeTab === "waitlisted") return b.status === "Waitlisted";
      if (activeTab === "confirmed") return b.status === "Confirmed";
      if (activeTab === "used") return b.status === "Used";
      
      return true;
    });
  }, [bookings, search, filterDate, filterScheduleId, activeTab]);

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
      // Consistent with 60-minute hold policy
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
  const getVesselName = useCallback((scheduleId: string) => {
    const schedule = schedules?.find(s => s.id === scheduleId);
    if (!schedule) return "TBA";
    return vessels?.find(v => v.id === schedule.vesselId)?.name || "TBA";
  }, [schedules, vessels]);

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
      travelDate: booking.travelDate || "",
      fareId: booking.fareId || ""
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
    } else if (status === 'Reserved') {
       penalty = 0;
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
    setIsFeePaymentAlertOpen(false);

    try {
      const activeStates = ['Confirmed', 'Reserved', 'Used'];
      const inactiveStates = ['Auto-cancelled', 'Refunded', 'Suspended'];
      
      let candidateDoc = await findWaitlistedCandidate(booking.scheduleId, booking.travelDate);

      await runTransaction(db, async (transaction) => {
        const voyageId = `${booking.scheduleId}_${booking.travelDate}`;
        const voyageRef = doc(db, "voyages", voyageId);
        const bookingRef = doc(db, "bookings", booking.id);

        const [bookingSnap, voyageSnap] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(voyageRef)
        ]);

        if (!bookingSnap.exists()) throw new Error("Booking no longer exists.");
        
        const freshStatus = bookingSnap.data().status;
        const wasActive = activeStates.includes(freshStatus);
        const wasWaitlisted = freshStatus === 'Waitlisted';
        const isNowActive = activeStates.includes(newStatus);
        const isNowInactive = inactiveStates.includes(newStatus);

        let sequenceToAssign = bookingSnap.data().boardingSequenceNumber || null;
        if (newStatus === 'Confirmed' && !sequenceToAssign && voyageSnap.exists()) {
           sequenceToAssign = (voyageSnap.data().bookedCount || 0) + 1;
        }

        if (newStatus === 'Reserved' || isNowInactive || newStatus === 'Waitlisted') {
          sequenceToAssign = null;
        }

        transaction.update(bookingRef, { 
          status: newStatus, 
          penaltyFees: penaltyAmount,
          isFeeWaived: statusActionData.isFeeWaived,
          waiveReason: statusActionData.isFeeWaived ? statusActionData.waiveReason : "",
          boardingSequenceNumber: sequenceToAssign,
          updatedAt: new Date().toISOString() 
        });

        if (voyageSnap.exists()) {
          if (wasActive && isNowInactive) {
            transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
            
            if (candidateDoc) {
              const freshCandidateSnap = await transaction.get(candidateDoc.ref);
              if (freshCandidateSnap.exists() && freshCandidateSnap.data().status === 'Waitlisted') {
                transaction.update(candidateDoc.ref, {
                  status: "Reserved",
                  boardingSequenceNumber: null,
                  remarks: "Auto-promoted from Waitlist (System)",
                  updatedAt: new Date().toISOString()
                });
                transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
              }
            }
          } else if (wasWaitlisted && isNowInactive) {
            transaction.update(voyageRef, { waitlistCount: increment(-1), updatedAt: new Date().toISOString() });
          } else if (wasWaitlisted && isNowActive) {
            transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1), updatedAt: new Date().toISOString() });
          }
        }
      });
      
      if (newStatus === 'Confirmed') setIsBoardingPassOpen(true);
      toast({ title: "Status Updated", description: `Booking #${booking.id} is now ${newStatus}.` });
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

  const handlePerformRebook = async () => {
    if (!db || !selectedBooking || !rebookingData.newScheduleId || isActionProcessing) return;
    setIsActionProcessing(true);
    
    const fees = calculateRebookingFees;
    const bookingId = selectedBooking.id;
    const oldVoyageId = `${selectedBooking.scheduleId}_${selectedBooking.travelDate}`;
    const newVoyageId = `${rebookingData.newScheduleId}_${rebookingData.newTravelDate}`;

    let candidateDoc = await findWaitlistedCandidate(selectedBooking.scheduleId, selectedBooking.travelDate);
    setIsRebookDialogOpen(false);
    setIsFeePaymentAlertOpen(false);

    try {
      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, "bookings", bookingId);
        const oldVoyageRef = doc(db, "voyages", oldVoyageId);
        const newVoyageRef = doc(db, "voyages", newVoyageId);

        const [bookingSnap, oldVoyageSnap, newVoyageSnap] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(oldVoyageRef),
          transaction.get(newVoyageRef)
        ]);

        if (!bookingSnap.exists()) throw new Error("Booking not found.");
        const currentStatus = bookingSnap.data().status;
        const wasActive = ['Confirmed', 'Reserved', 'Used'].includes(currentStatus);
        const wasWaitlisted = currentStatus === 'Waitlisted';

        if (oldVoyageSnap.exists()) {
          if (wasActive) {
            transaction.update(oldVoyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
            
            if (candidateDoc) {
              const freshCandidateSnap = await transaction.get(candidateDoc.ref);
              if (freshCandidateSnap.exists() && freshCandidateSnap.data().status === 'Waitlisted') {
                transaction.update(candidateDoc.ref, {
                  status: "Reserved",
                  boardingSequenceNumber: null,
                  remarks: "Auto-promoted from Waitlist (System: Vacated by Rebooking)",
                  updatedAt: new Date().toISOString()
                });
                transaction.update(oldVoyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
              }
            }
          } else if (wasWaitlisted) {
            transaction.update(oldVoyageRef, { waitlistCount: increment(-1), updatedAt: new Date().toISOString() });
          }
        }

        const currentNewBooked = newVoyageSnap.exists() ? (newVoyageSnap.data().bookedCount || 0) : 0;
        if (!newVoyageSnap.exists()) {
          transaction.set(newVoyageRef, {
            id: newVoyageId,
            scheduleId: rebookingData.newScheduleId,
            travelDate: rebookingData.newTravelDate,
            status: "Scheduled",
            bookedCount: 1,
            waitlistCount: 0,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.update(newVoyageRef, { bookedCount: increment(1), updatedAt: new Date().toISOString() });
        }

        transaction.update(bookingRef, {
          scheduleId: rebookingData.newScheduleId,
          travelDate: rebookingData.newTravelDate,
          status: "Confirmed",
          penaltyFees: fees,
          isFeeWaived: rebookingData.isFeeWaived,
          waiveReason: rebookingData.isFeeWaived ? rebookingData.waiveReason : "",
          boardingSequenceNumber: currentNewBooked + 1,
          updatedAt: new Date().toISOString()
        });
      });
      
      toast({ title: "Rebooked Successfully", description: `Ticket #${bookingId} moved to ${rebookingData.newTravelDate}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rebooking Failed", description: e.message });
    } finally {
      setIsActionProcessing(false);
      setSelectedBooking(null);
    }
  };

  const handleSaveEdit = () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    
    const selectedFare = fares?.find(f => f.id === editFormData.fareId);
    const updatePayload: any = { 
      ...editFormData, 
      updatedAt: new Date().toISOString() 
    };

    if (selectedFare) {
      updatePayload.segmentLabel = selectedFare.segmentLabel;
      updatePayload.finalFare = selectedFare.finalFare;
    }

    const bookingRef = doc(db, "bookings", selectedBooking.id);
    updateDocumentNonBlocking(bookingRef, updatePayload);
    
    setTimeout(() => { 
      setIsEditDialogOpen(false); 
      setIsActionProcessing(false); 
    }, 200);
  };

  const handleDeleteRecord = async () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    const bookingId = selectedBooking.id;
    const voyageId = `${selectedBooking.scheduleId}_${selectedBooking.travelDate}`;
    
    let candidateDoc = await findWaitlistedCandidate(selectedBooking.scheduleId, selectedBooking.travelDate);
    setIsDeleteConfirmOpen(false);

    try {
      await runTransaction(db, async (transaction) => {
        const voyageRef = doc(db, "voyages", voyageId);
        const bookingRef = doc(db, "bookings", bookingId);
        
        const [bookingSnap, voyageSnap] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(voyageRef)
        ]);

        if (!bookingSnap.exists()) return;
        
        const freshStatus = bookingSnap.data().status;
        const wasActive = ['Confirmed', 'Reserved', 'Used'].includes(freshStatus);
        const wasWaitlisted = freshStatus === 'Waitlisted';

        transaction.delete(bookingRef);

        if (voyageSnap.exists()) {
          if (wasActive) {
            transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
            
            if (candidateDoc) {
              const freshCandidateSnap = await transaction.get(candidateDoc.ref);
              if (freshCandidateSnap.exists() && freshCandidateSnap.data().status === 'Waitlisted') {
                transaction.update(candidateDoc.ref, {
                  status: "Reserved",
                  boardingSequenceNumber: null,
                  remarks: "Auto-promoted from Waitlist (System)",
                  updatedAt: new Date().toISOString()
                });
                transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
              }
            }
          } else if (wasWaitlisted) {
            transaction.update(voyageRef, { waitlistCount: increment(-1), updatedAt: new Date().toISOString() });
          }
        }
      });
      toast({ title: "Booking Deleted", description: "The manifest and inventory have been updated." });
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
          
          const [bSnap, voyageSnap] = await Promise.all([
            transaction.get(bRef),
            transaction.get(voyageRef)
          ]);

          if (!bSnap.exists() || bSnap.data().status !== 'Reserved') return;
          
          transaction.update(bRef, { 
            status: "Auto-cancelled", 
            updatedAt: new Date().toISOString(), 
            remarks: "Purged: Unpaid ghost reservation released 60 minutes before departure." 
          });
          
          if (voyageSnap.exists()) {
            transaction.update(voyageRef, { bookedCount: increment(-1), updatedAt: new Date().toISOString() });
            
            if (candidateDoc) {
              const freshCandidateSnap = await transaction.get(candidateDoc.ref);
              if (freshCandidateSnap.exists() && freshCandidateSnap.data().status === 'Waitlisted') {
                transaction.update(candidateDoc.ref, { 
                  status: "Reserved", 
                  boardingSequenceNumber: null,
                  updatedAt: new Date().toISOString() 
                });
                transaction.update(voyageRef, { bookedCount: increment(1), waitlistCount: increment(-1) });
              }
            }
          }
        });
      }
      setIsPurgeDialogOpen(false);
      toast({ title: "Ghost Purge Complete", description: `Released ${ghostBookings.length} seats.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: e.message });
    } finally { setIsActionProcessing(false); }
  };

  const handlePurgeHistory = async () => {
    if (!db || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      const cutoff = subDays(new Date(), 90);
      const cutoffStr = format(cutoff, "yyyy-MM-dd");
      
      const q = query(collection(db, "bookings"), where("travelDate", "<", cutoffStr));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ title: "No historical records", description: "No bookings found older than 90 days." });
        setIsHistoryPurgeOpen(false);
        setIsActionProcessing(false);
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      setIsHistoryPurgeOpen(false);
      toast({ title: "Purge Complete", description: `Removed ${snap.docs.length} historical records.` });
    } catch (e: any) {
      console.error("Purge Error:", e);
      toast({ variant: "destructive", title: "Purge Failed", description: e.message });
    } finally { 
      setIsActionProcessing(false); 
    }
  };

  const availableRebookingSchedules = schedules?.filter(s => s.routeId === selectedBooking?.routeId && s.isActive);
  const availableEditFares = fares?.filter(f => f.routeId === selectedBooking?.routeId);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-accent" /> Manage Bookings
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 gap-2 font-bold text-muted-foreground hover:bg-secondary"
            onClick={() => setIsHistoryPurgeOpen(true)}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Purge History</span>
          </Button>
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
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-secondary/50 space-y-4">
           <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
              <Filter className="h-3.5 w-3.5 text-accent" /> Manifest Filters
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Booking Reference</Label>
                <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="ID or Name..." 
                  className="pl-10 h-10 bg-secondary/10 border-none text-sm"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Travel Date</Label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                   <Input 
                     type="date"
                     className="pl-10 h-10 bg-secondary/10 border-none text-sm"
                     value={filterDate}
                     onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                   />
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Trip Code</Label>
                <Select value={filterScheduleId} onValueChange={(val) => { setFilterScheduleId(val); setCurrentPage(1); }}>
                   <SelectTrigger className="h-10 bg-secondary/10 border-none text-sm">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All Trips" />
                      </div>
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">All Trips</SelectItem>
                      {schedules?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  className="h-10 text-[10px] font-black uppercase text-muted-foreground hover:text-primary underline"
                  onClick={() => {
                    setSearch("");
                    setFilterDate("");
                    setFilterScheduleId("all");
                    setCurrentPage(1);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
           </div>
        </div>

        <Tabs defaultValue="all" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="space-y-6">
          <TabsList className="bg-white border p-1 h-auto flex flex-wrap w-full sm:w-fit">
            {["all", "reserved", "waitlisted", "confirmed", "used"].map(tab => (
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
      <Dialog open={isHistoryPurgeOpen} onOpenChange={setIsHistoryPurgeOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-destructive text-destructive-foreground">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <History className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase">Purge History</DialogTitle>
                   <DialogDescription className="text-destructive-foreground/80 text-xs">Administrative data management.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
             <div className="space-y-4">
                <h3 className="font-bold text-primary flex items-center gap-2">
                   <Trash2 className="h-4 w-4 text-destructive" /> Historical Cleanup
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To maintain system performance, you can remove historical records that are already 90 days old or more.
                </p>
                <div className="p-4 bg-secondary/20 rounded-xl border border-dashed space-y-4">
                   <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">Purge Old Bookings</p>
                        <p className="text-[10px] text-muted-foreground">Target: 90+ days old records.</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="font-black uppercase text-[10px]"
                        onClick={() => {
                          if (confirm("This will permanently delete all bookings older than 90 days. This action cannot be undone. Proceed?")) {
                            handlePurgeHistory();
                          }
                        }}
                        disabled={isActionProcessing}
                      >
                        {isActionProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Purge Now"}
                      </Button>
                   </div>
                </div>
             </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5">
             <Button variant="outline" className="w-full font-bold" onClick={() => setIsHistoryPurgeOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <p className="text-xs text-muted-foreground">Reservations are held until 60 minutes before departure. Releasing these seats promotes waitlisted passengers.</p>
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
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                   <div className="space-y-0.5">
                      <Label>Waive Penalty Fees</Label>
                      <p className="text-[10px] text-muted-foreground">Exempt passenger from cancellation/no-show fees.</p>
                   </div>
                  <Switch checked={statusActionData.isFeeWaived} onCheckedChange={(checked) => setStatusActionData({...statusActionData, isFeeWaived: checked})} />
                </div>
                
                {statusActionData.isFeeWaived && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <Label className="text-[10px] font-bold uppercase">Waiver Reason</Label>
                    <Select value={statusActionData.waiveReason} onValueChange={(val) => setStatusActionData({...statusActionData, waiveReason: val})}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                          {["Weather", "Technical", "Force Majeure"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                       </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4">
                   <div className="bg-secondary/5 p-4 rounded-xl border-2 border-dashed space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase">
                         <span>Penalty Applied</span>
                         <span className="text-destructive">₱{calculateStatusPenalties().toLocaleString()}</span>
                      </div>
                      {(statusTarget?.status === 'Refunded' || statusTarget?.status === 'Auto-cancelled') && (
                        <>
                          <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase">
                             <span>Gross Ticket Fare</span>
                             <span className="text-primary">₱{statusTarget.booking.finalFare?.toLocaleString()}</span>
                          </div>
                          <Separator className="bg-secondary" />
                          <div className="flex justify-between items-end pt-1">
                             <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-primary uppercase">Net Refund to Return</p>
                                <p className="text-[8px] text-muted-foreground italic">Fare minus applicable penalty</p>
                             </div>
                             <p className="text-2xl font-black text-green-600">₱{Math.max(0, (statusTarget.booking.finalFare || 0) - calculateStatusPenalties()).toLocaleString()}</p>
                          </div>
                        </>
                      )}
                      {statusTarget?.status === 'Suspended' && (
                        <div className="bg-primary p-4 rounded-xl text-primary-foreground flex justify-between items-center mt-2">
                          <p className="text-xs font-black uppercase opacity-70">Total to Collect</p>
                          <p className="text-2xl font-black">₱{calculateStatusPenalties().toLocaleString()}</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button 
                   className="w-full sm:flex-1 bg-primary text-white font-bold" 
                   onClick={() => {
                      if (calculateStatusPenalties() > 0) {
                         setIsFeePaymentAlertOpen(true);
                      } else {
                         handleConfirmStatusUpdate();
                      }
                   }} 
                   disabled={isActionProcessing}
                >
                   {calculateStatusPenalties() > 0 ? "Confirm & Collect Fees" : "Apply Change"}
                </Button>
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
                <DialogDescription>Move passenger to a different voyage</DialogDescription>
              </DialogHeader>
              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">New Date</Label>
                      <Input type="date" value={rebookingData.newTravelDate} onChange={(e) => setRebookingData({...rebookingData, newTravelDate: e.target.value, newScheduleId: ""})} />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">New Trip</Label>
                      <Select value={rebookingData.newScheduleId} onValueChange={(val) => setRebookingData({...rebookingData, newScheduleId: val})}>
                        <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                        <SelectContent>{availableRebookingSchedules?.map(s => <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-xl">
                   <div className="space-y-0.5">
                      <Label>Waive Fees</Label>
                      <p className="text-[10px] text-muted-foreground">Exempt passenger from rebooking penalties.</p>
                   </div>
                  <Switch checked={rebookingData.isFeeWaived} onCheckedChange={(checked) => setRebookingData({...rebookingData, isFeeWaived: checked})} />
                </div>

                <div className="bg-primary p-4 rounded-xl text-primary-foreground flex justify-between items-center">
                  <div className="space-y-0.5">
                     <p className="text-[10px] font-black uppercase opacity-70">Rebooking Fee + No-Show</p>
                     {rebookingData.isFeeWaived && <p className="text-[8px] font-bold text-accent uppercase">Waived</p>}
                  </div>
                  <p className="text-2xl font-black">₱{calculateRebookingFees.toLocaleString()}</p>
                </div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t gap-2">
                <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)}>Cancel</Button>
                <Button 
                   className="flex-1 bg-primary text-white font-bold" 
                   onClick={() => {
                      if (calculateRebookingFees > 0) {
                         setIsFeePaymentAlertOpen(true);
                      } else {
                         handlePerformRebook();
                      }
                   }} 
                   disabled={!rebookingData.newScheduleId || isActionProcessing}
                >
                   {calculateRebookingFees > 0 ? "Confirm & Collect Fees" : "Process Rebooking"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* FEE COLLECTION ALERT */}
      <Dialog open={isFeePaymentAlertOpen} onOpenChange={setIsFeePaymentAlertOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 bg-orange-600 text-white">
             <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <HandCoins className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight leading-none">
                    { (statusTarget?.status === 'Refunded' || statusTarget?.status === 'Auto-cancelled') ? "Reconcile Refund" : "Collect Penalty"}
                  </DialogTitle>
                  <DialogDescription className="text-orange-100 text-[10px] font-black uppercase tracking-widest mt-1">Fee Verification Step</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-10 space-y-8 text-center">
             <div className="space-y-6">
                {(statusTarget?.status === 'Refunded' || statusTarget?.status === 'Auto-cancelled') ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Net Amount to Return</p>
                    <p className="text-6xl font-black text-green-600 tracking-tighter">
                       ₱{Math.max(0, (statusTarget.booking.finalFare || 0) - calculateStatusPenalties()).toLocaleString()}
                    </p>
                    <div className="flex justify-center gap-4 text-[10px] font-bold text-muted-foreground uppercase bg-secondary/30 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Banknote className="h-3 w-3" /> Fare: ₱{statusTarget.booking.finalFare?.toLocaleString()}</span>
                      <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Fee: -₱{calculateStatusPenalties().toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Total Penalty to Collect</p>
                    <p className="text-5xl font-black text-primary tracking-tighter">
                       ₱{(statusTarget ? calculateStatusPenalties() : calculateRebookingFees).toLocaleString()}
                    </p>
                  </div>
                )}
                
                <div className="bg-secondary/30 p-3 rounded-xl inline-center items-center gap-2 text-[10px] font-bold text-primary">
                   <Info className="h-3.5 w-3.5" /> Confirm cash/digital transaction before proceeding.
                </div>
             </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 gap-3">
             <Button variant="outline" className="flex-1 font-black h-12 rounded-2xl uppercase text-[10px]" onClick={() => setIsFeePaymentAlertOpen(false)}>Not Collected</Button>
             <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest h-12 rounded-2xl shadow-xl"
                onClick={() => {
                   if (statusTarget) handleConfirmStatusUpdate();
                   else handlePerformRebook();
                }}
             >
               { (statusTarget?.status === 'Refunded' || statusTarget?.status === 'Auto-cancelled') ? "Refund Reconciled" : "Paid & Proceed"}
             </Button>
          </DialogFooter>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={editFormData.passengerEmail} onChange={(e) => setEditFormData({...editFormData, passengerEmail: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Fare Type</Label>
                    <Select value={editFormData.fareId} onValueChange={(val) => setEditFormData({...editFormData, fareId: val})}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select demographic" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEditFares?.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.segmentLabel} (₱{f.finalFare})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[650px] p-0 overflow-hidden">
          {isViewDetailsOpen && (
            <div className="flex flex-col h-[90vh] max-h-[90vh]">
              <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-white/20 rounded-xl">
                          <ClipboardList className="h-6 w-6" />
                       </div>
                       <div>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Full Booking Profile</DialogTitle>
                          <DialogDescription className="text-primary-foreground/70 text-xs font-mono">Reference: #{selectedBooking?.id}</DialogDescription>
                       </div>
                    </div>
                    <Badge className={cn("uppercase font-black text-[10px] px-3", 
                      selectedBooking?.status === 'Confirmed' ? "bg-green-600" : 
                      selectedBooking?.status === 'Reserved' ? "bg-blue-500" : "bg-orange-500")}>
                      {selectedBooking?.status}
                    </Badge>
                 </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                   {/* PASSENGER IDENTITY */}
                   <section className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                         <User className="h-3.5 w-3.5 text-accent" /> Passenger Identity
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Full Legal Name</Label>
                            <p className="text-sm font-black text-primary uppercase">{selectedBooking?.passengerName}</p>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</Label>
                            <p className="text-sm font-bold flex items-center gap-2">
                               <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {selectedBooking?.passengerDob}
                            </p>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Primary Email</Label>
                            <p className="text-sm font-bold flex items-center gap-2 truncate">
                               <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {selectedBooking?.passengerEmail || "N/A"}
                            </p>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Contact Number</Label>
                            <p className="text-sm font-bold flex items-center gap-2">
                               <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedBooking?.passengerContact}
                            </p>
                         </div>
                         <div className="space-y-1 col-span-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Emergency Contact</Label>
                            <p className="text-sm font-bold flex items-center gap-2">
                               <Heart className="h-3.5 w-3.5 text-destructive" /> {selectedBooking?.emergencyContact}
                            </p>
                         </div>
                      </div>
                   </section>

                   {/* VOYAGE ITINERARY */}
                   <section className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                         <Ship className="h-3.5 w-3.5 text-accent" /> Voyage Itinerary
                      </div>
                      <div className="bg-secondary/10 p-4 rounded-2xl border-2 border-dashed space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[9px] font-black text-muted-foreground uppercase">Trip Code</p>
                               <p className="text-sm font-black text-accent">{getTripCode(selectedBooking?.scheduleId)}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-muted-foreground uppercase">Dept. Time</p>
                               <p className="text-sm font-black text-primary">{getDeparture(selectedBooking?.scheduleId)}</p>
                            </div>
                         </div>
                         <Separator className="bg-white" />
                         <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Routing Details</p>
                            <div className="flex items-start gap-2">
                               <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                               <p className="text-xs font-bold leading-tight">{getRouteName(selectedBooking?.routeId)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                               <Calendar className="h-4 w-4 text-primary shrink-0" />
                               <p className="text-xs font-bold">{selectedBooking?.travelDate}</p>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                               <Badge variant="outline" className="text-[8px] font-black uppercase text-primary border-primary/20 bg-white">
                                  Vessel: {getVesselName(selectedBooking?.scheduleId)}
                               </Badge>
                            </div>
                         </div>
                      </div>
                   </section>

                   {/* FINANCIAL LEDGER */}
                   <section className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                         <Banknote className="h-3.5 w-3.5 text-accent" /> Financial Ledger
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                            <div className="flex flex-col">
                               <span className="text-muted-foreground text-[10px] font-bold uppercase">Base Voyage Fare</span>
                               <span className="font-bold text-primary">{selectedBooking?.segmentLabel || "Regular"} Segment</span>
                            </div>
                            <span className="font-black">₱{selectedBooking?.finalFare?.toLocaleString()}</span>
                         </div>
                         
                         {selectedBooking?.penaltyFees > 0 && (
                            <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-destructive/5 text-destructive">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-bold uppercase opacity-70">Applicable Fees / Penalties</span>
                                  <span className="text-[10px] font-bold italic">Rebooking/No-show adjustments</span>
                               </div>
                               <span className="font-black">+ ₱{selectedBooking.penaltyFees.toLocaleString()}</span>
                            </div>
                         )}

                         {selectedBooking?.isFeeWaived && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                               <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                               <div>
                                  <p className="text-[10px] font-black text-green-800 uppercase">Penalty Fees Waived</p>
                                  <p className="text-[10px] text-green-700">Reason: {selectedBooking.waiveReason || "Operational Discretion"}</p>
                               </div>
                            </div>
                         )}

                         <div className="bg-primary p-4 rounded-2xl text-primary-foreground flex justify-between items-end mt-2">
                            <div className="space-y-1">
                               <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Total Transaction Value</p>
                               {selectedBooking?.boardingSequenceNumber && (
                                  <p className="text-[10px] font-black text-accent uppercase">Assigned Sequence: #{selectedBooking.boardingSequenceNumber}</p>
                               )}
                            </div>
                            <p className="text-3xl font-black">₱{((selectedBooking?.finalFare || 0) + (selectedBooking?.penaltyFees || 0)).toLocaleString()}</p>
                         </div>
                      </div>
                   </section>

                   {/* OPERATIONAL METADATA */}
                   <section className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
                         <Info className="h-3.5 w-3.5 text-accent" /> Operational History
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px]">
                         <div className="p-3 bg-secondary/30 rounded-xl flex items-center gap-2">
                            {selectedBooking?.bookingSource === 'Desk' ? <Building2 className="h-4 w-4 opacity-40" /> : <Globe className="h-4 w-4 opacity-40" />}
                            <div>
                               <p className="font-bold text-muted-foreground uppercase">Source</p>
                               <p className="font-black text-primary uppercase">{selectedBooking?.bookingSource || "Public Web"}</p>
                            </div>
                         </div>
                         <div className="p-3 bg-secondary/30 rounded-xl flex items-center gap-2">
                            <Clock className="h-4 w-4 opacity-40" />
                            <div>
                               <p className="font-bold text-muted-foreground uppercase">Created At</p>
                               <p className="font-black text-primary">{selectedBooking?.createdAt ? format(new Date(selectedBooking.createdAt), "MMM dd, HH:mm") : "---"}</p>
                            </div>
                         </div>
                      </div>
                      {selectedBooking?.remarks && (
                         <div className="p-3 bg-orange-50 border-2 border-dashed border-orange-200 rounded-xl flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                               <p className="text-[9px] font-black text-orange-800 uppercase">Internal System Remark</p>
                               <p className="text-[10px] text-orange-700 italic">{selectedBooking.remarks}</p>
                            </div>
                         </div>
                      )}
                   </section>
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t shrink-0 bg-secondary/5">
                <Button className="w-full h-12 font-black uppercase text-xs tracking-widest shadow-lg" onClick={() => setIsViewDetailsOpen(false)}>Close Review</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="h-6 w-6 text-destructive" /></div>
            <DialogTitle className="text-center">Permanent Removal</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete Ticket <span className="font-bold">#{selectedBooking?.id}</span>?
              <br /><br />
              <span className="text-destructive font-bold uppercase text-[10px]">Warning:</span> This action is permanent and removes the record for both the terminal and the passenger.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteRecord} disabled={isActionProcessing}>Delete Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[420px] p-0 overflow-y-auto max-h-[90vh] bg-transparent border-none shadow-none no-scrollbar">
          <DialogHeader className="sr-only">
            <DialogTitle>Administrative Boarding Pass View</DialogTitle>
          </DialogHeader>
          {isBoardingPassOpen && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative mx-auto my-2 border animate-in zoom-in-95 duration-200">
              <div className="p-3 bg-primary text-white text-center space-y-1 relative">
                <button 
                  onClick={() => setIsBoardingPassOpen(false)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
                <div className="flex justify-center mb-0.5">
                  <div className="bg-white/20 p-1.5 rounded-xl shadow-inner">
                    <Ship className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-black font-headline uppercase tracking-tight leading-none">Boarding Pass</h2>
                <p className="text-[7px] opacity-80 font-bold uppercase tracking-[0.2em]">Official Internal Copy - {companyName}</p>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start border-b border-dashed pb-3 text-left">
                  <div className="flex-1 mr-2 overflow-hidden">
                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Passenger</p>
                    <p className="text-lg font-black text-primary uppercase truncate leading-tight">{selectedBooking?.passengerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Reference</p>
                    <p className="font-mono text-xs font-black text-primary">#{selectedBooking?.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-left">
                  <div className="space-y-0.5">
                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Trip Code</p>
                    <p className="font-black text-accent text-sm uppercase leading-none">{getTripCode(selectedBooking?.scheduleId)}</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Departure</p>
                    <p className="font-bold text-xs text-primary leading-none">{getDeparture(selectedBooking?.scheduleId)}</p>
                  </div>
                  <div className="col-span-2 space-y-0.5 bg-secondary/10 p-2 rounded-lg border border-secondary/50 text-left">
                    <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Date & Routing</p>
                    <p className="font-bold text-[10px] text-primary leading-tight">{selectedBooking?.travelDate} • {getRouteName(selectedBooking?.routeId)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-around py-3 border-t border-dashed mt-1">
                  <div className="bg-secondary/20 p-2 rounded-2xl shadow-inner">
                    <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=PASS_${selectedBooking?.id}`} alt="QR" width={110} height={110} className="mix-blend-multiply" />
                  </div>
                  {selectedBooking?.boardingSequenceNumber && (
                    <div className="flex flex-col items-center p-2 bg-primary/5 rounded-xl border border-primary/10 min-w-[100px]">
                       <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Sequence</p>
                       <p className="text-3xl font-black text-primary leading-none">#{selectedBooking.boardingSequenceNumber}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-secondary/30 p-3 flex gap-2 print:hidden border-t">
                <Button className="flex-1 bg-primary text-white font-black h-9 text-xs" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
                </Button>
                <Button variant="outline" className="flex-1 font-black h-9 text-xs bg-white border-primary/20 text-primary" onClick={() => setIsBoardingPassOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}