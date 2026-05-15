"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
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
  Trash
} from "lucide-react";
import { collection, doc, query, orderBy, limit, runTransaction, getDocs, where, increment, getDoc } from "firebase/firestore";
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
import { cn } from "@/lib/utils";

type BookingStatus = "Reserved" | "Waitlisted" | "Confirmed" | "Used" | "Suspended" | "Auto-cancelled" | "Refunded";

const ACTIVE_STATUSES = ["Reserved", "Waitlisted", "Confirmed", "Used"];
const ITEMS_PER_PAGE = 50;

// Memoized Row Component to prevent freezing on large manifest updates
const BookingRow = memo(({ 
  booking, 
  isMounted, 
  getRouteName, 
  getDeparture, 
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
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onView(booking); }}>
              <Eye className="h-4 w-4 mr-2 text-muted-foreground" /> View Details
            </DropdownMenuItem>
            {(booking.status === 'Confirmed' || booking.status === 'Used') && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onPass(booking); }}>
                <QrCode className="h-4 w-4 mr-2 text-primary" /> Boarding Pass
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(booking); }}>
              <Pencil className="h-4 w-4 mr-2 text-muted-foreground" /> Edit Info
            </DropdownMenuItem>
            {(booking.status === 'Reserved' || booking.status === 'Waitlisted') && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatus(booking, 'Confirmed'); }} className="text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onRebook(booking); }}>
              <RefreshCw className="h-4 w-4 mr-2 text-accent" /> Rebook
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatus(booking, 'Refunded'); }} className="text-blue-600">
              <Banknote className="h-4 w-4 mr-2" /> Refund
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onStatus(booking, 'Auto-cancelled'); }} className="text-orange-600">
              <XCircle className="h-4 w-4 mr-2" /> Cancel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onDelete(booking); }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

BookingRow.displayName = "BookingRow";

export default function ManageBookingsPage() {
  const db = useFirestore();
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
  
  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    // Limit to 300 recent records for operational efficiency
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

  // Dialog states
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

      // Check if departure is within 1 hour
      const [depH, depM] = schedule.departureTime.split(':').map(Number);
      const [curH, curM] = currentTimePHT.split(':').map(Number);
      
      const depTotal = depH * 60 + depM;
      const curTotal = curH * 60 + curM;
      
      // If departure is less than 60 mins away or already past
      return (depTotal - curTotal) <= 60;
    });
  }, [bookings, schedules, todayPHT, currentTimePHT]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getDeparture = (id: string) => schedules?.find(s => s.id === id)?.departureTime || "--:--";
  const getTripCode = (id: string) => schedules?.find(s => s.id === id)?.tripCode || "N/A";

  // Action Handlers
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
    if (!statusTarget || !routes) return 0;
    if (statusActionData.isFeeWaived) return 0;

    const { booking, status } = statusTarget;
    const route = routes.find(r => r.id === booking.routeId);
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

  /**
   * ATOMIC PROMOTION UTILITY
   * Identifies next waitlisted party and promotes them.
   * Internal helper for transactions.
   */
  const promoteWaitlistedParty = async (transaction: any, scheduleId: string, travelDate: string) => {
    if (!db) return;
    const waitlistQuery = query(
      collection(db, "bookings"),
      where("scheduleId", "==", scheduleId),
      where("travelDate", "==", travelDate),
      where("status", "==", "Waitlisted"),
      orderBy("createdAt", "asc"),
      limit(1)
    );
    const snap = await getDocs(waitlistQuery);
    if (!snap.empty) {
      const candidate = snap.docs[0];
      const voyageId = `${scheduleId}_${travelDate}`;
      const voyageRef = doc(db, "voyages", voyageId);
      const voyageSnap = await transaction.get(voyageRef);
      
      if (voyageSnap.exists()) {
        const currentBooked = voyageSnap.data().bookedCount || 0;
        transaction.update(candidate.ref, {
          status: "Reserved",
          boardingSequenceNumber: currentBooked + 1,
          remarks: "Auto-promoted from Waitlist (System)",
          updatedAt: new Date().toISOString()
        });
        transaction.update(voyageRef, {
          bookedCount: increment(1),
          waitlistCount: increment(-1),
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!db || !statusTarget || isActionProcessing) return;
    setIsActionProcessing(true);
    
    const { booking, status: newStatus } = statusTarget;
    const penaltyAmount = calculateStatusPenalties();
    const bookingRef = doc(db, "bookings", booking.id);
    const voyageId = `${booking.scheduleId}_${booking.travelDate}`;
    const voyageRef = doc(db, "voyages", voyageId);

    try {
      await runTransaction(db, async (transaction) => {
        const updateData: any = { 
          status: newStatus, 
          penaltyFees: penaltyAmount,
          isFeeWaived: statusActionData.isFeeWaived,
          waiveReason: statusActionData.isFeeWaived ? statusActionData.waiveReason : "",
          updatedAt: new Date().toISOString() 
        };

        const wasConfirmed = ['Confirmed', 'Reserved', 'Used'].includes(booking.status);
        const isNowInactive = ['Auto-cancelled', 'Refunded', 'Suspended'].includes(newStatus);

        // 1. Update Booking
        transaction.update(bookingRef, updateData);

        // 2. Adjust Inventory if seat vacated
        if (wasConfirmed && isNowInactive) {
          transaction.update(voyageRef, {
            bookedCount: increment(-1),
            updatedAt: new Date().toISOString()
          });
          // Attempt Promotion
          await promoteWaitlistedParty(transaction, booking.scheduleId, booking.travelDate);
        }
      });
      
      setIsStatusDialogOpen(false);
      if (newStatus === 'Confirmed') {
        setSelectedBooking((prev: any) => ({ ...prev, status: newStatus }));
        setIsBoardingPassOpen(true);
      }
    } catch (e) {
      console.error("Status update failed:", e);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const calculateRebookingFees = useMemo(() => {
    if (!selectedBooking || !routes) return 0;
    if (rebookingData.isFeeWaived) return 0;

    const route = routes.find(r => r.id === selectedBooking.routeId);
    let fees = 0;
    if (selectedBooking.status === 'Suspended') {
      fees += (route?.noShowFee || 0);
    }
    fees += (route?.rebookingFee || 0);
    return fees;
  }, [selectedBooking, routes, rebookingData.isFeeWaived]);

  const handlePerformRebook = () => {
    if (!db || !selectedBooking || !rebookingData.newScheduleId || isActionProcessing) return;
    setIsActionProcessing(true);

    const fees = calculateRebookingFees;
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    
    const tripBookings = bookings?.filter(b => 
      b.scheduleId === rebookingData.newScheduleId && 
      b.travelDate === rebookingData.newTravelDate && 
      (b.status === 'Confirmed' || b.status === 'Used')
    ) || [];

    const updateData = {
      scheduleId: rebookingData.newScheduleId,
      travelDate: rebookingData.newTravelDate,
      status: "Confirmed",
      penaltyFees: fees,
      isFeeWaived: rebookingData.isFeeWaived,
      waiveReason: rebookingData.isFeeWaived ? rebookingData.waiveReason : "",
      boardingSequenceNumber: tripBookings.length + 1,
      updatedAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(bookingRef, updateData);
    
    setTimeout(() => {
      setIsRebookDialogOpen(false);
      setIsActionProcessing(false);
    }, 100);
  };

  const handleSaveEdit = () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    const bookingRef = doc(db, "bookings", selectedBooking.id);
    updateDocumentNonBlocking(bookingRef, {
      ...editFormData,
      updatedAt: new Date().toISOString()
    });
    setTimeout(() => {
      setIsEditDialogOpen(false);
      setIsActionProcessing(false);
    }, 100);
  };

  const handleDeleteRecord = async () => {
    if (!db || !selectedBooking || isActionProcessing) return;
    setIsActionProcessing(true);
    
    const bookingId = selectedBooking.id;
    const voyageId = `${selectedBooking.scheduleId}_${selectedBooking.travelDate}`;
    const voyageRef = doc(db, "voyages", voyageId);
    const bookingRef = doc(db, "bookings", bookingId);

    try {
      await runTransaction(db, async (transaction) => {
        const wasConfirmed = ['Confirmed', 'Reserved', 'Used'].includes(selectedBooking.status);
        
        transaction.delete(bookingRef);

        if (wasConfirmed) {
          transaction.update(voyageRef, {
            bookedCount: increment(-1),
            updatedAt: new Date().toISOString()
          });
          // Attempt Promotion
          await promoteWaitlistedParty(transaction, selectedBooking.scheduleId, selectedBooking.travelDate);
        }
      });
      
      setIsDeleteConfirmOpen(false);
      setSelectedBooking(null);
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handlePurgeGhosts = async () => {
    if (!db || ghostBookings.length === 0 || isActionProcessing) return;
    setIsActionProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        // Group ghosts by voyageId for counter updates
        const voyageGroups: Record<string, any[]> = {};
        ghostBookings.forEach(b => {
          const vId = `${b.scheduleId}_${b.travelDate}`;
          if (!voyageGroups[vId]) voyageGroups[vId] = [];
          voyageGroups[vId].push(b);
        });

        for (const [voyageId, ghosts] of Object.entries(voyageGroups)) {
          const voyageRef = doc(db, "voyages", voyageId);
          const voyageSnap = await transaction.get(voyageRef);
          
          if (voyageSnap.exists()) {
            const currentBooked = voyageSnap.data().bookedCount || 0;
            const releasedCount = ghosts.length;
            
            // 1. Cancel Ghosts
            ghosts.forEach(ghost => {
              const bRef = doc(db, "bookings", ghost.id);
              transaction.update(bRef, {
                status: "Auto-cancelled",
                updatedAt: new Date().toISOString(),
                remarks: "Purged: Unpaid ghost reservation released 1hr before departure."
              });
            });

            // 2. Adjust counters
            transaction.update(voyageRef, {
              bookedCount: increment(-releasedCount),
              updatedAt: new Date().toISOString()
            });

            // 3. Promote Waitlisted
            for (let i = 0; i < releasedCount; i++) {
              await promoteWaitlistedParty(transaction, ghosts[0].scheduleId, ghosts[0].travelDate);
            }
          }
        }
      });
      
      setIsPurgeDialogOpen(false);
    } catch (e: any) {
      console.error("Purge failed:", e);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const availableRebookingSchedules = schedules?.filter(s => 
    s.routeId === selectedBooking?.routeId && s.isActive
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-accent" />
            <span className="hidden sm:inline">Manage Bookings</span>
            <span className="sm:hidden">Bookings</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <Button 
            variant="outline" 
            size="sm" 
            className={cn("h-9 gap-2 font-bold transition-all", 
              ghostBookings.length > 0 ? "border-orange-200 bg-orange-50 text-orange-600 animate-pulse" : "text-muted-foreground")}
            onClick={() => setIsPurgeDialogOpen(true)}
           >
             <Ghost className="h-4 w-4" />
             <span className="hidden sm:inline">Ghost Purge</span>
             {ghostBookings.length > 0 && (
               <Badge className="bg-orange-600 h-5 px-1.5 min-w-[20px]">{ghostBookings.length}</Badge>
             )}
           </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search passenger, ID, or Date..." 
              className="pl-10 h-10 sm:h-12 bg-white border-none shadow-sm text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="bg-white px-3 py-1 font-bold text-[10px] sm:text-xs">
               Found {filteredBookings.length} results
             </Badge>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="space-y-6">
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
                          getDeparture={getDeparture}
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
                      <p className="text-xs font-bold text-muted-foreground uppercase">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="h-8 text-xs font-bold"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="h-8 text-xs font-bold"
                        >
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
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

      {/* Ghost Purge Dialog */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-orange-600 text-white">
            <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg">
                 <Ghost className="h-6 w-6" />
               </div>
               <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tight">Ghost Reservation Purge</DialogTitle>
                 <DialogDescription className="text-orange-100 text-xs font-medium">Identify and release unpaid bookings within 1hr of departure.</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-6">
            {ghostBookings.length > 0 ? (
              <>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                     <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Identified Ghosts</p>
                     <Badge className="bg-orange-600 font-black">{ghostBookings.length} Passengers</Badge>
                  </div>
                  <ScrollArea className="h-32 pr-4">
                    <div className="space-y-2">
                       {ghostBookings.map(b => (
                         <div key={b.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-orange-100">
                           <span className="font-bold text-primary truncate max-w-[150px]">{b.passengerName}</span>
                           <span className="text-[10px] font-mono text-muted-foreground">#{b.id} • {getTripCode(b.scheduleId)}</span>
                         </div>
                       ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800">
                  <RefreshCw className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Auto-Promotion Logic</p>
                    <p className="text-xs leading-relaxed opacity-80">
                      Purging these records will release inventory back to the voyages. This allows the system to admit waitlisted passengers or accept new paid walk-ins.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center space-y-4 opacity-50">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <h3 className="font-bold text-primary">No ghost reservations detected</h3>
                <p className="text-xs max-w-xs mx-auto">All unpaid reservations today are still within the valid holding window.</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsPurgeDialogOpen(false)}>Close Utility</Button>
            {ghostBookings.length > 0 && (
              <Button 
                className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest gap-2"
                onClick={handlePurgeGhosts}
                disabled={isActionProcessing}
              >
                {isActionProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                Purge & Release Seats
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRebookDialogOpen} onOpenChange={setIsRebookDialogOpen}>
         <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden">
           {isRebookDialogOpen && (
             <>
               <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
                 <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                   <RefreshCw className="h-5 w-5 text-accent" /> Rebooking Ticket
                 </DialogTitle>
                 <DialogDescription className="text-xs">
                   Rebook Ticket ID: <span className="font-bold text-primary">#{selectedBooking?.id}</span>
                 </DialogDescription>
               </DialogHeader>
               <ScrollArea className="max-h-[60vh]">
                 <div className="p-4 sm:p-6 space-y-6">
                   <div className="space-y-3 p-4 border rounded-xl bg-secondary/5">
                     <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <Label className="font-bold text-xs sm:text-sm">Waive Penalties</Label>
                          <p className="text-[10px] text-muted-foreground italic leading-tight">Exempt from standard rebooking fees.</p>
                        </div>
                        <Switch 
                          checked={rebookingData.isFeeWaived} 
                          onCheckedChange={(checked) => setRebookingData({...rebookingData, isFeeWaived: checked})}
                        />
                     </div>
                     {rebookingData.isFeeWaived && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 pt-2 border-t mt-2">
                          <Label className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">Reason for Waiving</Label>
                          <Select value={rebookingData.waiveReason} onValueChange={(val) => setRebookingData({...rebookingData, waiveReason: val})}>
                            <SelectTrigger className="h-10 text-sm bg-white">
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
                     <Label className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">New Travel Date</Label>
                     <Input 
                       type="date" 
                       value={rebookingData.newTravelDate} 
                       onChange={(e) => setRebookingData({...rebookingData, newTravelDate: e.target.value, newScheduleId: ""})} 
                       className="h-11 text-sm"
                     />
                   </div>

                   <div className="space-y-2">
                     <Label className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground">Select New Voyage</Label>
                     <Select value={rebookingData.newScheduleId} onValueChange={(val) => setRebookingData({...rebookingData, newScheduleId: val})}>
                       <SelectTrigger className="h-11 text-sm bg-white">
                         <SelectValue placeholder="Select available trip" />
                       </SelectTrigger>
                       <SelectContent>
                         {availableRebookingSchedules?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div className="p-5 bg-primary rounded-xl text-primary-foreground flex justify-between items-center shadow-lg relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-3 opacity-10">
                       <Banknote className="h-12 w-12 -rotate-12" />
                     </div>
                     <div className="relative z-10">
                       <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Rebooking Penalty</p>
                       <p className="text-2xl sm:text-3xl font-black">₱{isMounted ? calculateRebookingFees.toLocaleString() : "---"}</p>
                     </div>
                     <Badge variant="outline" className="text-white border-white/20 text-[9px] font-black uppercase shrink-0">
                       {calculateRebookingFees === 0 ? "Complimentary" : "Standard Fee"}
                     </Badge>
                   </div>
                 </div>
               </ScrollArea>
               <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
                 <Button variant="outline" onClick={() => setIsRebookDialogOpen(false)} className="w-full sm:w-auto h-11 text-sm">Cancel</Button>
                 <Button 
                  onClick={handlePerformRebook} 
                  className="w-full sm:flex-1 bg-primary text-white h-11 text-sm font-bold"
                  disabled={!rebookingData.newScheduleId || !rebookingData.newTravelDate || isActionProcessing}
                 >
                   {isActionProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                   Process Rebooking <ChevronRight className="h-4 w-4 ml-2" />
                 </Button>
               </DialogFooter>
             </>
           )}
         </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[600px] p-0 overflow-hidden">
          {isEditDialogOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-accent" /> Edit Passenger Info
                </DialogTitle>
                <DialogDescription className="text-xs">Update demographics or contact details for Ticket #{selectedBooking?.id}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</Label>
                      <Input value={editFormData.passengerName} onChange={(e) => setEditFormData({...editFormData, passengerName: e.target.value})} className="h-11 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Date of Birth</Label>
                      <Input type="date" value={editFormData.passengerDob} onChange={(e) => setEditFormData({...editFormData, passengerDob: e.target.value})} className="h-11 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Mobile Number</Label>
                      <Input value={editFormData.passengerContact} onChange={(e) => setEditFormData({...editFormData, passengerContact: e.target.value})} className="h-11 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Emergency Contact</Label>
                      <Input value={editFormData.emergencyContact} onChange={(e) => setEditFormData({...editFormData, emergencyContact: e.target.value})} placeholder="Emergency mobile number" className="h-11 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Email Address</Label>
                    <Input type="email" value={editFormData.passengerEmail} onChange={(e) => setEditFormData({...editFormData, passengerEmail: e.target.value})} className="h-11 text-sm" />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-11">Cancel</Button>
                <Button onClick={handleSaveEdit} className="w-full sm:flex-1 bg-primary text-white h-11 font-bold" disabled={isActionProcessing}>
                  {isActionProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden">
          {isViewDetailsOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b bg-primary text-primary-foreground">
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" /> Ticket Details
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Full manifest entry for #{selectedBooking?.id}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh]">
                <div className="p-4 sm:p-6 space-y-6">
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">Passenger Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                        <p className="font-bold">{selectedBooking?.passengerName}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Demographic</Label>
                        <p className="font-bold">{selectedBooking?.segmentLabel}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Contact</Label>
                        <p className="font-bold">{selectedBooking?.passengerContact}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Birthdate</Label>
                        <p className="font-bold">{selectedBooking?.passengerDob}</p>
                      </div>
                    </div>
                  </section>
                  <DropdownMenuSeparator />
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">Voyage Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Trip ID</Label>
                        <p className="font-black text-primary">{getTripCode(selectedBooking?.scheduleId)}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Departure</Label>
                        <p className="font-bold">{getDeparture(selectedBooking?.scheduleId)}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Route</Label>
                        <p className="font-bold truncate">{getRouteName(selectedBooking?.routeId)}</p>
                      </div>
                    </div>
                  </section>
                  <DropdownMenuSeparator />
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-accent tracking-widest">Status & Financials</h4>
                    <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-xl">
                       <div>
                         <Label className="text-[10px] text-muted-foreground">Booking Status</Label>
                         <p className="mt-1 font-bold text-primary">{selectedBooking?.status}</p>
                       </div>
                       <div className="text-right">
                         <Label className="text-[10px] text-muted-foreground">Final Amount</Label>
                         <p className="text-xl font-black text-primary">₱{isMounted ? selectedBooking?.finalFare?.toLocaleString() : "---"}</p>
                       </div>
                    </div>
                  </section>
                </div>
              </ScrollArea>
              <DialogFooter className="p-4 sm:p-6 border-t">
                <Button className="w-full h-11" onClick={() => setIsViewDetailsOpen(false)}>Close Details</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[400px]">
          <DialogHeader>
            <div className="bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Permanent Removal</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete Ticket <span className="font-bold text-primary">#{selectedBooking?.id}</span>? 
              This will remove the entry from the manifest permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" className="w-full sm:flex-1" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="w-full sm:flex-1 font-bold" onClick={handleDeleteRecord} disabled={isActionProcessing}>
              {isActionProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden">
          {isStatusDialogOpen && (
            <>
              <DialogHeader className="p-4 sm:p-6 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-accent" /> Update Booking Status
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Change Ticket #{statusTarget?.booking.id} to <span className="font-black text-primary uppercase">{statusTarget?.status}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="p-4 sm:p-6 space-y-6">
                <div className="bg-secondary/10 p-4 rounded-xl border-2 border-dashed space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-xs sm:text-sm">Waive Associated Fees</Label>
                      <p className="text-[10px] text-muted-foreground italic">Skip cancellation/no-show penalties.</p>
                    </div>
                    <Switch 
                      checked={statusActionData.isFeeWaived} 
                      onCheckedChange={(checked) => setStatusActionData({...statusActionData, isFeeWaived: checked})}
                    />
                  </div>
                  {statusActionData.isFeeWaived && (
                    <div className="pt-2 border-t">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Reason for Exception</Label>
                      <Select value={statusActionData.waiveReason} onValueChange={(val) => setStatusActionData({...statusActionData, waiveReason: val})}>
                        <SelectTrigger className="mt-1 h-10 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weather">Adverse Weather</SelectItem>
                          <SelectItem value="Technical">Technical/Vessel Issue</SelectItem>
                          <SelectItem value="Force Majeure">Force Majeure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="bg-primary p-5 rounded-xl text-primary-foreground flex justify-between items-center shadow-lg">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Penalty Applied</p>
                    <p className="text-3xl font-black">₱{isMounted ? calculateStatusPenalties().toLocaleString() : "---"}</p>
                  </div>
                  <div className={cn("p-2 rounded-full", calculateStatusPenalties() > 0 ? "bg-red-500/20" : "bg-green-500/20")}>
                    <Banknote className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
                <Button className="w-full sm:flex-1 bg-primary font-bold text-white" onClick={handleConfirmStatusUpdate} disabled={isActionProcessing}>
                  {isActionProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply Status Change
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBoardingPassOpen} onOpenChange={setIsBoardingPassOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[450px] p-0 bg-transparent border-none shadow-none overflow-y-auto max-h-[95vh]">
          {isBoardingPassOpen && (
            <>
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl relative mx-auto my-4">
                <div className="bg-primary p-4 sm:p-6 text-primary-foreground text-center space-y-2">
                  <div className="flex justify-center mb-1 sm:mb-2">
                    <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl">
                      <Ship className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">Boarding Pass</h2>
                  <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-start border-b border-dashed pb-4">
                    <div className="flex-1 mr-2 overflow-hidden">
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Passenger Name</Label>
                      <p className="text-base sm:text-lg font-black text-primary uppercase truncate">{selectedBooking?.passengerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Ticket ID</Label>
                      <p className="font-mono text-xs sm:text-sm font-bold">#{selectedBooking?.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-4 sm:gap-x-8">
                    <div>
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Trip ID</Label>
                      <p className="font-black text-accent uppercase text-sm sm:text-base">{getTripCode(selectedBooking?.scheduleId)}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Date of Travel</Label>
                      <p className="font-bold text-sm">{selectedBooking?.travelDate}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Departure Time</Label>
                      <p className="font-bold text-sm">{getDeparture(selectedBooking?.scheduleId)}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</Label>
                      <div className="bg-primary/10 text-primary h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm">
                        {selectedBooking?.boardingSequenceNumber || "N/A"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Routing</Label>
                      <p className="font-bold text-xs sm:text-sm truncate">{getRouteName(selectedBooking?.routeId)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4 sm:py-6 border-t border-dashed">
                    <div className="bg-secondary/20 p-3 sm:p-4 rounded-2xl mb-4">
                      <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=BOARDING_PASS_${selectedBooking?.id}_${selectedBooking?.boardingSequenceNumber}`}
                        alt="Boarding Pass QR"
                        width={120}
                        height={120}
                        className="mix-blend-multiply w-[100px] h-[100px] sm:w-[120px] sm:h-[120px]"
                      />
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic">Scan at the boarding gate</p>
                  </div>
                </div>

                <div className="bg-secondary/30 p-4 flex gap-2">
                  <Button className="flex-1 bg-primary text-white font-bold h-9 text-xs sm:text-sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2 shrink-0" /> Print Pass
                  </Button>
                  <Button variant="outline" className="flex-1 font-bold h-9 text-xs sm:text-sm">
                    <Download className="h-4 w-4 mr-2 shrink-0" /> Save
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-center pb-6">
                <Button variant="link" className="text-white text-xs" onClick={() => setIsBoardingPassOpen(false)}>
                  Close Boarding Pass
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
