"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { 
  Ticket, 
  PlusCircle, 
  Trash2, 
  Loader2, 
  Search, 
  Clock, 
  Check, 
  ChevronRight, 
  Users,
  UserPlus,
  Phone,
  Banknote,
  BarChart,
  Calendar,
  MapPin,
  Mail,
  Heart,
  AlertCircle,
  HandCoins,
  Globe,
  ArrowRight,
  UserCheck,
  Ship,
  Tag,
  QrCode,
  Info,
  Pencil,
  X,
  User
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, runTransaction, where, query, increment, getDoc } from "firebase/firestore";
import React, { useMemo, useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { TripItinerary } from "@/components/trip-itinerary";
import { nanoid } from "nanoid";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminNav } from "@/components/admin-nav";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const passengerSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  fullName: z.string().min(2, { message: "Full name is required." }),
  birthDate: z.string().min(1, { message: "Birth date is required." }),
  passengerContact: z.string().min(1, { message: "Mobile number is required." }),
  emergencyContact: z.string().min(1, { message: "Emergency number is required." }),
  passengerEmail: z.string().email({ message: "Valid email required." }),
  fareType: z.string({ required_error: "Select fare type."}),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: "Select route." }),
  travelDate: z.string().min(1, { message: "Date is required."}),
  scheduleId: z.string({ required_error: "Select schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  isPaid: z.boolean().default(false),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function DeskBookingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  // UI Dialog States
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isOnlineSearchDialogOpen, setIsOnlineSearchDialogOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isPaymentCollectionAlertOpen, setIsPaymentCollectionAlertOpen] = useState(false);
  
  // Processing States
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineBookingId, setOnlineBookingId] = useState("");
  const [foundBooking, setFoundOnlineBooking] = useState<any>(null);
  const [isEditingOnline, setIsEditingOnline] = useState(false);
  const [onlineEditData, setOnlineEditData] = useState<any>(null);
  
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [lookupSearch, setLookupSearch] = useState('');
  const [activeLookupIndex, setActiveLookupIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    const tenDaysFromNow = addDays(today, 9);
    setDateRange({ 
        min: format(today, "yyyy-MM-dd"), 
        max: format(tenDaysFromNow, "yyyy-MM-dd") 
    });
  }, []);

  const schedulesRef = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesRef = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresRef = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const voyagesRef = useMemoFirebase(() => firestore ? collection(firestore, 'voyages') : null, [firestore]);
  const bookingsRef = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesRef);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesRef);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresRef);
  const { data: registeredUsers } = useCollection(usersRef);
  const { data: voyageStatuses } = useCollection(voyagesRef);
  const { data: allBookings } = useCollection(bookingsRef);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: format(new Date(), "yyyy-MM-dd"),
      scheduleId: "",
      passengers: [{ 
        id: nanoid(), 
        userId: "",
        fullName: "", 
        birthDate: "", 
        passengerContact: "", 
        emergencyContact: "", 
        passengerEmail: "", 
        fareType: "" 
      }],
      isPaid: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const watchRouteId = useWatch({ control: form.control, name: "routeId" });
  const watchTravelDate = useWatch({ control: form.control, name: "travelDate" });
  const watchScheduleId = useWatch({ control: form.control, name: "scheduleId" });
  const watchPassengers = useWatch({ control: form.control, name: "passengers" });
  const watchIsPaid = useWatch({ control: form.control, name: "isPaid" });

  const deskStats = useMemo(() => {
    if (!allBookings || !isMounted || !dateRange.min) return { counterPax: 0, webPax: 0, cashOnHand: 0 };
    
    return allBookings.reduce((acc, b) => {
      const isToday = b.travelDate === dateRange.min;
      if (isToday) {
        // Track volumes
        if (b.bookingSource === 'Desk') {
          acc.counterPax++;
        } else {
          acc.webPax++;
        }

        // Tally Cash-on-Hand (Net Liquid Intake)
        // Confirmed means it was paid (either desk walk-in or web verification today)
        // Used means it was boarded
        // Refunded/Cancelled means the fare is gone, but the penalty fee is intake
        const isLiquidated = b.status === 'Refunded' || b.status === 'Auto-cancelled';
        const fareContributed = isLiquidated ? 0 : (b.finalFare || 0);
        const penaltiesContributed = b.isFeeWaived ? 0 : (b.penaltyFees || 0);

        // We only count cash for records that have been physically handled or finalized at the terminal
        if (['Confirmed', 'Used', 'Refunded', 'Auto-cancelled', 'Suspended'].includes(b.status)) {
           acc.cashOnHand += (fareContributed + penaltiesContributed);
        }
      }
      return acc;
    }, { counterPax: 0, webPax: 0, cashOnHand: 0 });
  }, [allBookings, isMounted, dateRange.min]);

  const filteredSchedules = useMemo(() => {
    if (!watchRouteId || !watchTravelDate || !allSchedules) return [];
    const formattedTravelDate = watchTravelDate;
    const isToday = formattedTravelDate === format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return allSchedules.filter(s => {
      if (!s.isActive || s.routeId !== watchRouteId) return false;
      if (s.type === 'Daily') return !isToday || s.departureTime > currentTime;
      if (s.type === 'Special') return s.specialDates?.includes(formattedTravelDate) && (!isToday || s.departureTime > currentTime);
      return false;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [watchRouteId, watchTravelDate, allSchedules]);

  const availableFares = useMemo(() => {
    const selectedSchedule = allSchedules?.find(s => s.id === watchScheduleId);
    if (selectedSchedule && allFares) {
      return allFares.filter(f => f.routeId === selectedSchedule.routeId);
    }
    return [];
  }, [watchScheduleId, allSchedules, allFares]);

  const currentTotalPrice = useMemo(() => {
    if (!availableFares.length || !watchPassengers) return 0;
    return watchPassengers.reduce((sum, p) => {
      if (!p || !p.fareType) return sum;
      const fareInfo = availableFares.find(f => f.segmentLabel === p.fareType);
      return sum + (fareInfo?.finalFare || 0);
    }, 0);
  }, [availableFares, watchPassengers]);

  const voyageInfo = useMemo(() => {
    if (!watchScheduleId || !watchTravelDate || !voyageStatuses) return null;
    const voyageId = `${watchScheduleId}_${watchTravelDate}`;
    return voyageStatuses.find(v => v.id === voyageId);
  }, [watchScheduleId, watchTravelDate, voyageStatuses]);

  const inventoryStats = useMemo(() => {
    const schedule = allSchedules?.find(s => s.id === watchScheduleId);
    if (!schedule) return null;

    const used = Math.max(0, voyageInfo?.bookedCount || 0);
    const waitlisted = Math.max(0, voyageInfo?.waitlistCount || 0);
    const capacity = schedule.passengerCapacity || 0;
    const waitlistLimit = schedule.waitlistLimit || 0;
    
    return {
      remaining: Math.max(0, capacity - used),
      capacity,
      waitlistSpotsRemaining: Math.max(0, waitlistLimit - waitlisted),
      isWaitlistOnly: used >= capacity,
      isFull: used >= capacity && waitlisted >= waitlistLimit
    };
  }, [allSchedules, watchScheduleId, voyageInfo]);

  useEffect(() => {
    if (watchRouteId) {
      form.setValue('scheduleId', "");
    }
  }, [watchRouteId, form]);

  const handleApplyProfile = (index: number, user: any) => {
    form.setValue(`passengers.${index}.fullName`, user.displayName || "");
    form.setValue(`passengers.${index}.passengerEmail`, user.email || "");
    form.setValue(`passengers.${index}.passengerContact`, user.phoneNumber || "");
    form.setValue(`passengers.${index}.userId`, user.id); 
    setLookupSearch('');
    setActiveLookupIndex(null);
  };

  const handleSearchOnlineBooking = async () => {
    if (!firestore || !onlineBookingId) return;
    setIsSearchingOnline(true);
    setFoundOnlineBooking(null);
    setIsEditingOnline(false);

    try {
      const docRef = doc(firestore, "bookings", onlineBookingId.toUpperCase());
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFoundOnlineBooking(data);
        setOnlineEditData({
           passengerName: data.passengerName,
           passengerDob: data.passengerDob,
           passengerEmail: data.passengerEmail,
           passengerContact: data.passengerContact,
           emergencyContact: data.emergencyContact,
           fareId: data.fareId || ""
        });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Reference ID does not exist." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleProcessOnlineConfirm = async () => {
    if (!firestore || !foundBooking) return;
    setIsReserving(true);

    try {
      const result = await runTransaction(firestore, async (transaction) => {
        const bookingRef = doc(firestore, 'bookings', foundBooking.id);
        const voyageId = `${foundBooking.scheduleId}_${foundBooking.travelDate}`;
        const voyageRef = doc(firestore, 'voyages', voyageId);
        const scheduleRef = doc(firestore, 'schedules', foundBooking.scheduleId);

        const [bookingSnap, voyageSnap, scheduleSnap] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(voyageRef),
          transaction.get(scheduleRef)
        ]);

        if (!bookingSnap.exists()) throw new Error("Booking no longer exists.");
        if (!scheduleSnap.exists()) throw new Error("Schedule no longer exists.");

        const currentStatus = bookingSnap.data().status;
        const scheduleData = scheduleSnap.data();
        const capacity = scheduleData.passengerCapacity || 0;
        const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;

        let boardingSeq = null;

        if (currentStatus === 'Waitlisted') {
           if (currentBooked < capacity) {
              boardingSeq = currentBooked + 1;
              transaction.update(voyageRef, {
                 bookedCount: increment(1),
                 waitlistCount: increment(-1),
                 updatedAt: new Date().toISOString()
              });
           } else {
              throw new Error("No physical seats available to promote this waitlisted passenger.");
           }
        } else if (currentStatus === 'Reserved') {
           boardingSeq = currentBooked + 1;
        } else if (currentStatus === 'Confirmed' || currentStatus === 'Used') {
           throw new Error(`Ticket is already ${currentStatus}.`);
        }

        // Apply any edits made by the agent
        const selectedFare = allFares?.find(f => f.id === onlineEditData.fareId);
        const updatePayload: any = {
          ...onlineEditData,
          segmentLabel: selectedFare?.segmentLabel || foundBooking.segmentLabel,
          finalFare: selectedFare?.finalFare || foundBooking.finalFare,
          status: "Confirmed",
          boardingSequenceNumber: boardingSeq,
          updatedAt: new Date().toISOString()
        };

        transaction.update(bookingRef, updatePayload);

        return { 
          ...foundBooking, 
          ...updatePayload
        };
      });

      setConfirmedBooking({
        ...result,
        routeName: routes?.find(r => r.id === result.routeId)?.name || 'Unknown Route',
        departureTime: allSchedules?.find(s => s.id === result.scheduleId)?.departureTime || '',
        passengers: [{ fullName: result.passengerName, fareType: result.segmentLabel }],
        totalPrice: result.finalFare
      });

      setIsOnlineSearchDialogOpen(false);
      setIsConfirmationOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Processing Failed", description: e.message });
    } finally {
      setIsReserving(false);
    }
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore) return;
    setIsReserving(true);

    try {
      const { status: bookingStatus, bookingId, totalPrice } = await runTransaction(firestore, async (transaction) => {
        const scheduleRef = doc(firestore, 'schedules', data.scheduleId);
        const scheduleSnap = await transaction.get(scheduleRef);
        if (!scheduleSnap.exists()) throw new Error("Trip schedule no longer exists.");
        
        const scheduleData = scheduleSnap.data();
        const capacity = scheduleData.passengerCapacity || 0;
        const waitlistLimit = scheduleData.waitlistLimit || 0;
        
        const voyageId = `${data.scheduleId}_${data.travelDate}`;
        const voyageRef = doc(firestore, 'voyages', voyageId);
        const voyageSnap = await transaction.get(voyageRef);
        
        const currentBooked = voyageSnap.exists() ? (voyageSnap.data().bookedCount || 0) : 0;
        const currentWaitlisted = voyageSnap.exists() ? (voyageSnap.data().waitlistCount || 0) : 0;

        let status: 'Reserved' | 'Waitlisted' | 'Confirmed';
        if (currentBooked + data.passengers.length <= capacity) {
          status = data.isPaid ? 'Confirmed' : 'Reserved';
        } else if (currentWaitlisted + data.passengers.length <= waitlistLimit) {
          status = 'Waitlisted';
        } else {
          throw new Error("This trip is fully booked including waitlist.");
        }

        if (!voyageSnap.exists()) {
          transaction.set(voyageRef, {
            id: voyageId,
            scheduleId: data.scheduleId,
            travelDate: data.travelDate,
            status: "Scheduled",
            bookedCount: status === 'Waitlisted' ? 0 : data.passengers.length,
            waitlistCount: status === 'Waitlisted' ? data.passengers.length : 0,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.update(voyageRef, {
            bookedCount: status === 'Waitlisted' ? increment(0) : increment(data.passengers.length),
            waitlistCount: status === 'Waitlisted' ? increment(data.passengers.length) : increment(0),
            updatedAt: new Date().toISOString()
          });
        }

        let boardingSeq = status === 'Confirmed' ? currentBooked + 1 : null;
        let runningTotal = 0;
        const baseBookingId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        data.passengers.forEach((p, idx) => {
          const fareInfo = availableFares.find(f => f.segmentLabel === p.fareType);
          const finalFare = fareInfo?.finalFare || 0;
          runningTotal += finalFare;
          
          const passengerBookingId = idx === 0 ? baseBookingId : `${baseBookingId}-${idx + 1}`;
          const bookingRef = doc(collection(firestore, 'bookings'), passengerBookingId);
          
          transaction.set(bookingRef, {
            id: passengerBookingId,
            userId: p.userId || null,
            routeId: data.routeId,
            scheduleId: data.scheduleId,
            travelDate: data.travelDate,
            passengerName: p.fullName,
            passengerDob: p.birthDate,
            passengerEmail: p.passengerEmail,
            passengerContact: p.passengerContact,
            emergencyContact: p.emergencyContact,
            fareId: fareInfo?.id || "",
            segmentLabel: p.fareType,
            finalFare: finalFare,
            status: status,
            bookingSource: "Desk",
            boardingSequenceNumber: boardingSeq ? boardingSeq++ : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });

        return { status, bookingId: baseBookingId, totalPrice: runningTotal };
      });
  
      setConfirmedBooking({
        id: bookingId,
        travelDate: data.travelDate,
        routeName: routes?.find(r => r.id === data.routeId)?.name || 'Unknown Route',
        departurePortName: '', 
        departureTime: filteredSchedules.find(s => s.id === data.scheduleId)?.departureTime || '',
        passengers: data.passengers.map(p => ({ fullName: p.fullName, fareType: p.fareType })),
        totalPrice: totalPrice,
        status: bookingStatus,
      });
  
      setIsBookingDialogOpen(false);
      setIsConfirmationOpen(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Booking Failed", description: e.message });
    } finally {
        setIsReserving(false);
    }
  }

  const onlineAvailableFares = useMemo(() => {
    if (!foundBooking || !allFares) return [];
    return allFares.filter(f => f.routeId === foundBooking.routeId);
  }, [foundBooking, allFares]);

  const currentOnlineTotal = useMemo(() => {
    if (!foundBooking || !onlineEditData || !onlineAvailableFares) return 0;
    const fare = onlineAvailableFares.find(f => f.id === onlineEditData.fareId);
    return fare?.finalFare || foundBooking.finalFare;
  }, [foundBooking, onlineEditData, onlineAvailableFares]);

  if (isLoadingSchedules || isLoadingRoutes || isLoadingFares || !isMounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AdminNav />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent" /> Terminal Command Center
        </h1>
        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary">
           <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase text-primary tracking-widest">Gateway Online</span>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">Passenger Intake</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">Select the appropriate flow to manage walk-in ticketing or verify existing reservations.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card 
                className="border-none shadow-xl hover:ring-4 hover:ring-primary/10 transition-all group cursor-pointer bg-white relative overflow-hidden h-72 flex flex-col justify-end p-8"
                onClick={() => { form.reset(); setIsBookingDialogOpen(true); }}
              >
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                    <UserPlus className="h-40 w-40 -rotate-12 translate-x-12 translate-y-[-20px]" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <div className="bg-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                       <UserPlus className="h-7 w-7 text-white" />
                    </div>
                    <div>
                       <CardTitle className="text-2xl font-black text-primary uppercase">Counter Issuance</CardTitle>
                       <CardDescription className="font-bold text-muted-foreground mt-1">Issue fresh tickets for walk-in passengers.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black text-accent uppercase tracking-[0.2em] group-hover:gap-4 transition-all pt-2">
                       Launch Intake <ArrowRight className="h-4 w-4" />
                    </div>
                 </div>
              </Card>

              <Card 
                className="border-none shadow-xl hover:ring-4 hover:ring-accent/20 transition-all group cursor-pointer bg-white relative overflow-hidden h-72 flex flex-col justify-end p-8"
                onClick={() => { setOnlineBookingId(""); setFoundOnlineBooking(null); setIsOnlineSearchDialogOpen(true); }}
              >
                 <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                    <Globe className="h-40 w-40 -rotate-12 translate-x-12 translate-y-[-20px]" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <div className="bg-accent w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                       <Globe className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                       <CardTitle className="text-2xl font-black text-primary uppercase">Web Verification</CardTitle>
                       <CardDescription className="font-bold text-muted-foreground mt-1">Process payments for online reservations.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-[0.2em] group-hover:gap-4 transition-all pt-2">
                       Scan Web ID <ArrowRight className="h-4 w-4 text-accent" />
                    </div>
                 </div>
              </Card>
           </div>

           <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border-none shadow-sm p-4 rounded-2xl border-2 flex items-center gap-4 transition-all">
                 <div className="bg-primary/10 p-2.5 rounded-xl"><Ticket className="h-5 w-5 text-primary" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Daily Counter Vol.</p>
                    <p className="text-lg font-black text-primary">{deskStats.counterPax} PAX</p>
                 </div>
              </div>
              <div className="bg-white border-none shadow-sm p-4 rounded-2xl border-2 flex items-center gap-4 transition-all">
                 <div className="bg-accent/10 p-2.5 rounded-xl"><Globe className="h-5 w-5 text-accent" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Web Intake Today</p>
                    <p className="text-lg font-black text-primary">{deskStats.webPax} PAX</p>
                 </div>
              </div>
              <div className="bg-white border-none shadow-sm p-4 rounded-2xl border-2 flex items-center gap-4 transition-all">
                 <div className="bg-green-50 p-2.5 rounded-xl"><Banknote className="h-5 w-5 text-green-600" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Cash-on-Hand</p>
                    <p className="text-lg font-black text-green-700">₱{deskStats.cashOnHand.toLocaleString()}</p>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* ONLINE PROCESSING DIALOG */}
      <Dialog open={isOnlineSearchDialogOpen} onOpenChange={setIsOnlineSearchDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[700px] p-0 overflow-hidden rounded-3xl h-[90vh] flex flex-col">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl"><Globe className="h-6 w-6 text-accent" /></div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">Web Verification</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs font-bold uppercase">Search & Process Payments</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8 pb-32">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Enter 6-Character Reference Code</Label>
                  <div className="flex gap-2">
                     <Input 
                       placeholder="e.g. ABCDEF" 
                       value={onlineBookingId}
                       onChange={(e) => setOnlineBookingId(e.target.value.toUpperCase())}
                       className="font-mono h-14 text-2xl font-black text-center tracking-[0.3em] border-2 focus-visible:ring-accent"
                       onKeyDown={(e) => e.key === 'Enter' && handleSearchOnlineBooking()}
                     />
                     <Button 
                       onClick={handleSearchOnlineBooking} 
                       disabled={isSearchingOnline || !onlineBookingId}
                       className="bg-accent text-primary font-black h-14 px-8 shadow-xl"
                     >
                       {isSearchingOnline ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
                     </Button>
                  </div>
               </div>

               {foundBooking && (
                  <div className="space-y-8 animate-in zoom-in-95 duration-200">
                     <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-black text-primary uppercase text-sm flex items-center gap-2">
                           <User className="h-4 w-4 text-accent" /> Reservation Profile
                        </h3>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                          onClick={() => setIsEditingOnline(!isEditingOnline)}
                        >
                           {isEditingOnline ? <><X className="h-3 w-3" /> Cancel Edit</> : <><Pencil className="h-3 w-3" /> Edit Info</>}
                        </Button>
                     </div>

                     <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-3xl border-2 transition-all", isEditingOnline ? "bg-accent/5 border-accent/30" : "bg-secondary/5 border-dashed border-secondary")}>
                        {isEditingOnline ? (
                          <>
                            <div className="space-y-4">
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Passenger Full Name</Label>
                                  <Input 
                                    value={onlineEditData.passengerName}
                                    onChange={(e) => setOnlineEditData({...onlineEditData, passengerName: e.target.value})}
                                    className="bg-white h-11 font-bold"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Date of Birth</Label>
                                  <Input 
                                    type="date"
                                    value={onlineEditData.passengerDob}
                                    onChange={(e) => setOnlineEditData({...onlineEditData, passengerDob: e.target.value})}
                                    className="bg-white h-11"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Fare Demographic</Label>
                                  <Select value={onlineEditData.fareId} onValueChange={(val) => setOnlineEditData({...onlineEditData, fareId: val})}>
                                     <SelectTrigger className="bg-white h-11 border-2"><SelectValue placeholder="Select Segment" /></SelectTrigger>
                                     <SelectContent>
                                        {onlineAvailableFares.map(f => (
                                          <SelectItem key={f.id} value={f.id}>{f.segmentLabel} (₱{f.finalFare})</SelectItem>
                                        ))}
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Mobile Number</Label>
                                  <Input 
                                    value={onlineEditData.passengerContact}
                                    onChange={(e) => setOnlineEditData({...onlineEditData, passengerContact: e.target.value})}
                                    className="bg-white h-11"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Email Address</Label>
                                  <Input 
                                    type="email"
                                    value={onlineEditData.passengerEmail}
                                    onChange={(e) => setOnlineEditData({...onlineEditData, passengerEmail: e.target.value})}
                                    className="bg-white h-11"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Emergency Contact</Label>
                                  <Input 
                                    value={onlineEditData.emergencyContact}
                                    onChange={(e) => setOnlineEditData({...onlineEditData, emergencyContact: e.target.value})}
                                    className="bg-white h-11"
                                  />
                               </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Legal Name</p>
                                  <p className="text-xl font-black text-primary uppercase">{foundBooking.passengerName}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Birth Date</p>
                                  <p className="text-sm font-bold text-primary">{foundBooking.passengerDob}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Segment</p>
                                  <Badge className="bg-primary text-white h-5 px-3 uppercase text-[10px] font-black">{foundBooking.segmentLabel}</Badge>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Primary Contact</p>
                                  <p className="text-sm font-bold text-primary flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {foundBooking.passengerContact}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Email</p>
                                  <p className="text-sm font-bold text-primary flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" /> {foundBooking.passengerEmail}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase">Emergency</p>
                                  <p className="text-sm font-bold text-destructive flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> {foundBooking.emergencyContact}</p>
                               </div>
                            </div>
                          </>
                        )}
                     </div>

                     <div className="space-y-4">
                        <h3 className="font-black text-primary uppercase text-sm flex items-center gap-2">
                           <Ship className="h-4 w-4 text-accent" /> Voyage Summary
                        </h3>
                        <div className="bg-secondary/10 p-5 rounded-2xl border-2 border-dashed flex justify-between items-center">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Travel Date</p>
                              <p className="text-lg font-black text-primary">{foundBooking.travelDate}</p>
                           </div>
                           <div className="text-center space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Trip Code</p>
                              <p className="text-lg font-black text-accent">{allSchedules?.find(s => s.id === foundBooking.scheduleId)?.tripCode || "TBA"}</p>
                           </div>
                           <div className="text-right space-y-1">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Routing</p>
                              <p className="text-sm font-bold text-primary max-w-[200px] truncate">{routes?.find(r => r.id === foundBooking.routeId)?.name}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-secondary/5 shrink-0 flex flex-row items-center justify-between">
             <Button variant="outline" className="px-6 font-black uppercase text-xs h-12" onClick={() => setIsOnlineSearchDialogOpen(false)}>Close</Button>
             {foundBooking && (
                <div className="flex items-center gap-6">
                   <div className="flex flex-col items-end">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Payable Amount</p>
                      <p className="text-3xl font-black text-primary">₱{currentOnlineTotal.toLocaleString()}</p>
                   </div>
                   <Button 
                      onClick={() => setIsPaymentCollectionAlertOpen(true)}
                      disabled={isReserving}
                      className="bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest px-10 h-14 rounded-2xl shadow-xl transition-all"
                   >
                      {isReserving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <HandCoins className="h-5 w-5 mr-2" />}
                      Collect & Confirm
                   </Button>
                </div>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WALK-IN BOOKING DIALOG */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[850px] p-0 overflow-hidden h-[95vh] flex flex-col rounded-3xl">
          <DialogHeader className="p-6 border-b bg-white shrink-0">
             <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl"><UserPlus className="h-6 w-6 text-primary" /></div>
                <div>
                   <DialogTitle className="text-xl font-black text-primary uppercase tracking-tight">Counter Ticketing</DialogTitle>
                   <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Real-time Passenger Intake Mode</DialogDescription>
                </div>
             </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-10 pb-20">
              <Form {...form}>
                <form className="space-y-10">
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary/5 p-6 rounded-3xl border-2 border-dashed border-secondary/50">
                    <FormField
                      control={form.control}
                      name="routeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 tracking-widest"><MapPin className="h-3.5 w-3.5 text-accent" /> 1. Select Route</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-11 bg-white border-2 font-bold"><SelectValue placeholder="Choose Lane" /></SelectTrigger></FormControl>
                            <SelectContent>{routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="travelDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 tracking-widest"><Calendar className="h-3.5 w-3.5 text-accent" /> 2. Departure Date</FormLabel>
                          <FormControl><Input type="date" {...field} min={dateRange.min} max={dateRange.max} className="h-11 bg-white border-2 font-bold" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-1.5 tracking-widest"><Clock className="h-3.5 w-3.5 text-accent" /> 3. Select Trip</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId}>
                            <FormControl><SelectTrigger className="h-11 bg-white border-2 font-bold"><SelectValue placeholder="Choose Time" /></SelectTrigger></FormControl>
                            <SelectContent>{filteredSchedules.map(s => <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  {inventoryStats && (
                    <div className={cn("p-6 rounded-3xl flex items-center justify-between border-2 shadow-sm animate-in slide-in-from-top-2 duration-300", 
                      inventoryStats.isFull ? "bg-red-50 border-red-200" : inventoryStats.isWaitlistOnly ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200")}>
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl", 
                           inventoryStats.isFull ? "bg-red-600 text-white" : inventoryStats.isWaitlistOnly ? "bg-orange-600 text-white" : "bg-green-600 text-white")}>
                           <BarChart className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Atomic Seat Inventory</p>
                           <p className={cn("text-2xl font-black uppercase", 
                             inventoryStats.isFull ? "text-red-600" : inventoryStats.isWaitlistOnly ? "text-orange-600" : "text-green-700")}>
                             {inventoryStats.isFull ? "VOYAGE FULL" : inventoryStats.isWaitlistOnly ? `WAITLIST ACTIVE (${inventoryStats.waitlistSpotsRemaining} left)` : `${inventoryStats.remaining} Seats Remaining`}
                           </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-black px-4 py-1.5 border-primary/20 bg-white">
                         Max {inventoryStats.capacity} PAX
                      </Badge>
                    </div>
                  )}

                  <section className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-secondary pb-3">
                      <h3 className="font-black text-primary uppercase text-lg flex items-center gap-2.5">
                        <Users className="h-6 w-6 text-accent" /> Passengers ({fields.length})
                      </h3>
                    </div>

                    <div className="space-y-12">
                      {fields.map((field, index) => {
                        const currentFareLabel = watchPassengers?.[index]?.fareType;
                        const currentFarePrice = availableFares.find(f => f.segmentLabel === currentFareLabel)?.finalFare || 0;

                        return (
                          <div key={field.id} className="relative bg-secondary/5 rounded-3xl border-2 border-dashed p-4 sm:p-6 pt-12 group hover:border-accent/40 transition-colors">
                            <div className="absolute -top-4 left-6 bg-primary text-white border-4 border-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-10 shadow-lg">
                              Manifest Entry #{index + 1}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-4 -right-4 h-10 w-10 bg-white shadow-xl border-2 rounded-full text-destructive hover:bg-red-50 z-20" onClick={() => remove(index)} disabled={fields.length === 1}>
                              <Trash2 className="h-5 w-5" />
                            </Button>

                            <div className="space-y-8">
                              <div className="space-y-2 relative">
                                <Label className="text-[10px] font-black uppercase text-accent flex items-center gap-1.5 tracking-wider">
                                  <Search className="h-3.5 w-3.5" /> Rapid Profile Lookup
                                </Label>
                                <div className="relative">
                                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                   <input 
                                     placeholder="Search registered passengers by name or mobile..." 
                                     value={activeLookupIndex === index ? lookupSearch : ''}
                                     onChange={(e) => { setLookupSearch(e.target.value); setActiveLookupIndex(index); }}
                                     onFocus={() => setActiveLookupIndex(index)}
                                     className="flex h-12 w-full rounded-2xl border-2 border-accent/20 bg-white pl-11 pr-4 text-sm font-bold ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
                                   />
                                </div>
                                {activeLookupIndex === index && lookupSearch.length > 1 && (
                                  <div className="absolute top-full left-0 w-full bg-white border-2 rounded-2xl shadow-2xl z-50 mt-2 overflow-hidden animate-in zoom-in-95 duration-200">
                                    {registeredUsers?.filter(u => u.displayName?.toLowerCase().includes(lookupSearch.toLowerCase()) || u.phoneNumber?.includes(lookupSearch)).slice(0, 3).map(user => (
                                      <button key={user.id} type="button" onClick={() => handleApplyProfile(index, user)} className="w-full text-left px-6 py-4 hover:bg-accent/5 border-b last:border-0 flex items-center gap-5 transition-colors">
                                        <div className="bg-primary/10 p-2.5 rounded-xl shrink-0"><Users className="h-5 w-5 text-primary" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-black text-primary truncate uppercase">{user.displayName}</p>
                                          <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5"><Phone className="h-3 w-3" /> {user.phoneNumber || "No mobile registered"}</p>
                                        </div>
                                        <div className="bg-accent text-primary p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                           <UserCheck className="h-4 w-4" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.fullName`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Full Legal Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Juan Dela Cruz" {...field} className="h-11 bg-white border-2 font-bold" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} 
                                />
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.birthDate`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Date of Birth</Label>
                                      <FormControl>
                                        <Input type="date" {...field} className="h-11 bg-white border-2 font-bold" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} 
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.passengerContact`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="h-3 w-3" /> Mobile Number
                                      </FormLabel>
                                      <FormControl>
                                        <Input placeholder="0917XXXXXXX" {...field} className="h-11 bg-white border-2 font-bold" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} 
                                />
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.emergencyContact`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Heart className="h-3 w-3 text-destructive" /> Emergency Number
                                      </FormLabel>
                                      <FormControl>
                                        <Input placeholder="Contact for emergency" {...field} className="h-11 bg-white border-2 font-bold" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} 
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.passengerEmail`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" /> Email Address
                                      </FormLabel>
                                      <FormControl>
                                        <Input type="email" placeholder="itinerary@example.com" {...field} className="h-11 bg-white border-2 font-bold" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} 
                                />
                                <FormField 
                                  control={form.control} 
                                  name={`passengers.${index}.fareType`} 
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Banknote className="h-3 w-3" /> Fare Type
                                      </FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchScheduleId}>
                                        <FormControl>
                                          <SelectTrigger className="h-11 bg-white border-2 font-black">
                                            <SelectValue placeholder="Select Tier" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {availableFares.map(f => (
                                            <SelectItem key={f.id} value={f.segmentLabel}>
                                              {f.segmentLabel} (₱{f.finalFare})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                      {currentFarePrice > 0 && (
                                        <div className="flex items-center gap-1.5 pt-2">
                                           <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                           <p className="text-[10px] font-black text-primary uppercase">Segment Fare Applied: ₱{currentFarePrice.toLocaleString()}</p>
                                        </div>
                                      )}
                                    </FormItem>
                                  )} 
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), userId: "", fullName: "", birthDate: "", passengerContact: "", emergencyContact: "", passengerEmail: "", fareType: "" })} disabled={!watchScheduleId || inventoryStats?.isFull} className="w-full h-14 gap-2 border-2 border-dashed font-black uppercase text-xs tracking-widest hover:bg-primary/5 transition-all">
                        <PlusCircle className="h-5 w-5" /> Add Group Passenger
                      </Button>
                    </div>
                  </section>

                  <section className={cn("p-6 rounded-3xl border-2 space-y-4 transition-all", watchIsPaid ? "bg-green-50 border-green-200" : "bg-primary/5")}>
                    <FormField
                      control={form.control}
                      name="isPaid"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <div className="flex flex-row items-center justify-between">
                            <div className="space-y-1">
                              <FormLabel className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                                 <HandCoins className="h-5 w-5 text-accent" /> Final Step: Payment Processing
                              </FormLabel>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Verify cash or digital transaction before marking as paid.</p>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={(val) => {
                                  if (val) {
                                    field.onChange(true);
                                    setTimeout(() => setIsPaymentCollectionAlertOpen(true), 0);
                                  } else {
                                    field.onChange(false);
                                  }
                                }} 
                              />
                            </FormControl>
                          </div>

                          {field.value && (
                            <div className="bg-white border-2 border-green-500 p-5 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2 duration-300 shadow-sm">
                               <div className="bg-green-600 p-1.5 rounded-full"><Check className="h-4 w-4 text-white" /></div>
                               <div>
                                 <p className="text-sm font-black text-green-700 uppercase">Cash/Funds Verified</p>
                                 <p className="text-[10px] text-green-600 font-bold uppercase">Transaction of ₱{currentTotalPrice.toLocaleString()} marked as received.</p>
                               </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </section>
                </form>
              </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/5 shrink-0 items-center flex flex-row justify-between">
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)} className="px-8 font-black uppercase text-xs h-12 rounded-xl">Discard</Button>
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Transaction</p>
                  <p className="text-2xl font-black text-primary">₱{currentTotalPrice.toLocaleString()}</p>
               </div>
               <Button 
                 onClick={form.handleSubmit(handleFinalReserve)} 
                 disabled={isReserving || !watchScheduleId || inventoryStats?.isFull || (!inventoryStats?.isWaitlistOnly && !watchIsPaid)}
                 className={cn("px-12 h-14 font-black uppercase text-sm tracking-widest shadow-2xl rounded-2xl transition-all", 
                   inventoryStats?.isWaitlistOnly ? "bg-orange-600 text-white" : "bg-primary")}
               >
                 {isReserving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                 {inventoryStats?.isWaitlistOnly ? "Add to Waitlist" : "Issue Ticket(s)"}
               </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAYMENT ALERT */}
      <Dialog open={isPaymentCollectionAlertOpen} onOpenChange={setIsPaymentCollectionAlertOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 bg-orange-600 text-white">
             <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <HandCoins className="h-8 w-8" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">Collect Funds</DialogTitle>
                  <DialogDescription className="text-orange-100 text-[10px] font-black uppercase tracking-widest mt-1">Manual Cash/Digital Verification</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-10 space-y-8">
             <div className="text-center space-y-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Total Amount to Collect</p>
                <p className="text-6xl font-black text-primary tracking-tighter">
                   ₱{(foundBooking ? currentOnlineTotal : currentTotalPrice).toLocaleString()}
                </p>
                <div className="bg-secondary/30 p-3 rounded-xl inline-flex items-center gap-2 text-xs font-bold text-primary">
                   <Info className="h-4 w-4" /> Ensure exact change for cash payments.
                </div>
             </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 gap-3">
             <Button variant="outline" className="flex-1 font-black h-14 rounded-2xl uppercase text-xs" onClick={() => {
                if (!foundBooking) form.setValue('isPaid', false);
                setIsPaymentCollectionAlertOpen(false);
             }}>Not Received</Button>
             <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-[0.2em] h-14 rounded-2xl shadow-xl"
                onClick={() => {
                   if (foundBooking) {
                      handleProcessOnlineConfirm();
                   }
                   setIsPaymentCollectionAlertOpen(false);
                }}
             >
               Funds Verified
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION / ITINERARY */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[550px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Success</DialogTitle>
          </DialogHeader>
          <div className="p-2 space-y-6">
            <TripItinerary booking={confirmedBooking} />
            <Button onClick={() => setIsConfirmationOpen(false)} className="w-full h-14 font-black uppercase text-sm tracking-widest bg-white text-primary border-4 border-white/20 shadow-2xl rounded-2xl">
              Done & Return to Desk
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
