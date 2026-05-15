"use client";

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import * as z from "zod"
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
  HandCoins
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, runTransaction, where, query, increment } from "firebase/firestore"
import React, { useMemo, useState, useEffect } from "react"
import { format, addDays } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary"
import { nanoid } from "nanoid"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminNav } from "@/components/admin-nav"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const passengerSchema = z.object({
  id: z.string(),
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
  
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isPaymentCollectionAlertOpen, setIsPaymentCollectionAlertOpen] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [isReserving, setIsReserving] = useState(false);
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

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesRef);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesRef);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresRef);
  const { data: registeredUsers } = useCollection(usersRef);
  const { data: voyageStatuses } = useCollection(voyagesRef);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: format(new Date(), "yyyy-MM-dd"),
      scheduleId: "",
      passengers: [{ 
        id: nanoid(), 
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
      const current = form.getValues('passengers');
      if (current) {
        current.forEach((_, idx) => {
          form.setValue(`passengers.${idx}.fareType`, "");
        });
      }
    }
  }, [watchRouteId, form]);

  const handleApplyProfile = (index: number, user: any) => {
    form.setValue(`passengers.${index}.fullName`, user.displayName || "");
    form.setValue(`passengers.${index}.passengerEmail`, user.email || "");
    form.setValue(`passengers.${index}.passengerContact`, user.phoneNumber || "");
    setLookupSearch('');
    setActiveLookupIndex(null);
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

        let boardingSeq = status !== 'Waitlisted' ? currentBooked + 1 : null;
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
      console.error(e);
      toast({ variant: "destructive", title: "Booking Failed", description: e.message });
    } finally {
        setIsReserving(false);
    }
  }

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
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Ticket className="h-5 w-5 text-accent" /> Desk Bookings
        </h1>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <CardTitle className="text-xl">Counter Sales</CardTitle>
            <CardDescription className="text-primary-foreground/70">Issue valid boarding passes for walk-in passengers.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 sm:p-20 text-center">
             <Ticket className="h-16 w-16 text-accent/20 mx-auto mb-6" />
             <h2 className="text-2xl font-black text-primary mb-2">Ready to Issue?</h2>
             <p className="text-muted-foreground mb-8 max-w-md mx-auto">Verify trip availability and capture manifest details to generate passenger itineraries.</p>
             <Button onClick={() => { form.reset(); setIsBookingDialogOpen(true); }} size="lg" className="bg-primary px-12 h-14 text-lg">
               New Ticket Booking
             </Button>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[800px] p-0 overflow-hidden h-[95vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b bg-white shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-primary uppercase">
              <Ticket className="h-5 w-5 text-accent" /> Desk Issuance
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 space-y-8 pb-10">
              <Form {...form}>
                <form className="space-y-8">
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/10 p-4 rounded-xl border-2 border-dashed">
                    <FormField
                      control={form.control}
                      name="routeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Select Route</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Choose Route" /></SelectTrigger></FormControl>
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
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Travel Date</FormLabel>
                          <FormControl><Input type="date" {...field} min={dateRange.min} max={dateRange.max} className="bg-white" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Select Schedule</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId}>
                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Choose Time" /></SelectTrigger></FormControl>
                            <SelectContent>{filteredSchedules.map(s => <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  {inventoryStats && (
                    <div className={cn("p-4 rounded-xl flex items-center justify-between border-2 shadow-sm", 
                      inventoryStats.isFull ? "bg-red-50 border-red-200" : inventoryStats.isWaitlistOnly ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200")}>
                      <div className="flex items-center gap-3">
                        <BarChart className={cn("h-5 w-5", inventoryStats.isFull ? "text-red-600" : inventoryStats.isWaitlistOnly ? "text-orange-600" : "text-green-600")} />
                        <div>
                           <p className="text-[10px] font-black uppercase text-muted-foreground">Atomic Seat Inventory</p>
                           <p className={cn("text-lg font-black", inventoryStats.isFull ? "text-red-600" : inventoryStats.isWaitlistOnly ? `text-orange-600` : "text-green-600")}>
                             {inventoryStats.isFull ? "VOYAGE FULL" : inventoryStats.isWaitlistOnly ? `WAITLIST ACTIVE (${inventoryStats.waitlistSpotsRemaining} left)` : `${inventoryStats.remaining} Seats Remaining`}
                           </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{inventoryStats.capacity} Total</Badge>
                    </div>
                  )}

                  <section className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-black text-primary uppercase text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-accent" /> Passengers ({fields.length})
                      </h3>
                    </div>

                    <div className="space-y-10">
                      {fields.map((field, index) => {
                        const currentFareLabel = watchPassengers?.[index]?.fareType;
                        const currentFarePrice = availableFares.find(f => f.segmentLabel === currentFareLabel)?.finalFare || 0;

                        return (
                          <div key={field.id} className="relative bg-secondary/5 rounded-2xl border-2 border-dashed p-4 sm:p-6 pt-10 group hover:border-accent/40 transition-colors">
                            <div className="absolute -top-4 left-4 bg-white border-2 px-3 py-1 rounded-full text-[10px] font-black uppercase text-primary tracking-widest z-10 shadow-sm">
                              Passenger #{index + 1}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-3 -right-3 h-8 w-8 bg-white shadow-md border-2 rounded-full text-destructive hover:bg-red-50 z-20" onClick={() => remove(index)} disabled={fields.length === 1}>
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <div className="space-y-6">
                              <div className="space-y-2 relative">
                                <Label className="text-[10px] font-black uppercase text-accent flex items-center gap-1.5 tracking-wider">
                                  <Search className="h-3 w-3" /> Step 3: Rapid Profile Lookup
                                </Label>
                                <input 
                                  placeholder="Search by name or mobile..." 
                                  value={activeLookupIndex === index ? lookupSearch : ''}
                                  onChange={(e) => { setLookupSearch(e.target.value); setActiveLookupIndex(index); }}
                                  onFocus={() => setActiveLookupIndex(index)}
                                  className="flex h-11 w-full rounded-md border border-accent/20 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                                />
                                {activeLookupIndex === index && lookupSearch.length > 1 && (
                                  <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-2xl z-50 mt-2 overflow-hidden animate-in zoom-in-95 duration-200">
                                    {registeredUsers?.filter(u => u.displayName?.toLowerCase().includes(lookupSearch.toLowerCase()) || u.phoneNumber?.includes(lookupSearch)).slice(0, 3).map(user => (
                                      <button key={user.id} type="button" onClick={() => handleApplyProfile(index, user)} className="w-full text-left px-5 py-4 hover:bg-accent/5 border-b last:border-0 flex items-center gap-4 transition-colors">
                                        <div className="bg-primary/10 p-2 rounded-lg shrink-0"><Users className="h-5 w-5 text-primary" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-primary truncate">{user.displayName}</p>
                                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {user.phoneNumber || "No mobile set"}</p>
                                        </div>
                                        <UserPlus className="h-5 w-5 ml-auto text-accent shrink-0" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`passengers.${index}.fullName`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</FormLabel><FormControl><Input placeholder="Juan Dela Cruz" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`passengers.${index}.birthDate`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Date of Birth</FormLabel><FormControl><Input type="date" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`passengers.${index}.passengerContact`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile Number</FormLabel><FormControl><Input placeholder="0917XXXXXXX" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`passengers.${index}.emergencyContact`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> Emergency Number</FormLabel><FormControl><Input placeholder="Backup Contact" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )} />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name={`passengers.${index}.passengerEmail`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</FormLabel><FormControl><Input type="email" placeholder="juan@example.com" {...field} className="bg-white" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`passengers.${index}.fareType`} render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Fare Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchScheduleId}>
                                      <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select Tier" /></SelectTrigger></FormControl>
                                      <SelectContent>{availableFares.map(f => <SelectItem key={f.id} value={f.segmentLabel}>{f.segmentLabel} (₱{f.finalFare})</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    {currentFarePrice > 0 && (
                                      <p className="text-[10px] font-black text-primary uppercase mt-1">Applied Fare: ₱{currentFarePrice.toLocaleString()}</p>
                                    )}
                                  </FormItem>
                                )} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", passengerContact: "", emergencyContact: "", passengerEmail: "", fareType: "" })} disabled={!watchScheduleId || inventoryStats?.isFull} className="w-full gap-2 border-2 border-dashed font-bold">
                        <PlusCircle className="h-4 w-4" /> Add Another Passenger
                      </Button>
                    </div>
                  </section>

                  <section className={cn("p-6 rounded-2xl border-2 space-y-4 transition-all", watchIsPaid ? "bg-green-50 border-green-200" : "bg-primary/5")}>
                    <FormField
                      control={form.control}
                      name="isPaid"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <div className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-black text-primary uppercase">Step 5: Process Payment Now</FormLabel>
                              <FormDescription className="text-xs italic">Is the customer paying at the counter? Paid bookings are Issued immediately.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={(val) => {
                                  if (val) {
                                    setIsPaymentCollectionAlertOpen(true);
                                  } else {
                                    field.onChange(false);
                                  }
                                }} 
                              />
                            </FormControl>
                          </div>

                          {field.value && (
                            <div className="bg-white border-2 border-green-500 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                               <Check className="h-5 w-5 text-green-600 mt-0.5" />
                               <div>
                                 <p className="text-xs font-black text-green-700 uppercase">Payment Verified</p>
                                 <p className="text-[10px] text-green-600 font-bold">Total of ₱{currentTotalPrice.toLocaleString()} has been marked as collected.</p>
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

          <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 shrink-0 items-center flex flex-row justify-between">
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)} className="px-8 font-bold">Cancel</Button>
            <div className="flex flex-col items-end mr-4">
               <p className="text-[9px] font-black uppercase text-muted-foreground">Booking Total</p>
               <p className="text-xl font-black text-primary">₱{currentTotalPrice.toLocaleString()}</p>
            </div>
            <Button 
              onClick={form.handleSubmit(handleFinalReserve)} 
              disabled={isReserving || !watchScheduleId || inventoryStats?.isFull || (!inventoryStats?.isWaitlistOnly && !watchIsPaid)}
              className={cn("px-10 font-black uppercase tracking-wider shadow-lg", 
                inventoryStats?.isWaitlistOnly ? "bg-orange-600 text-white" : "bg-primary")}
            >
              {isReserving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {inventoryStats?.isWaitlistOnly ? "Add to Waitlist" : "Confirm & Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentCollectionAlertOpen} onOpenChange={setIsPaymentCollectionAlertOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-orange-500 text-white">
             <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <HandCoins className="h-8 w-8" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Collect Payment</DialogTitle>
                  <DialogDescription className="text-orange-100 text-xs font-medium">Verify cash or digital transaction before marking as paid.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Total Amount to Collect</p>
                <p className="text-5xl font-black text-primary">₱{currentTotalPrice.toLocaleString()}</p>
             </div>
             
             <div className="bg-secondary/20 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-primary flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" /> Administrative Protocol
                </p>
                <ul className="text-[10px] space-y-1.5 text-muted-foreground font-medium uppercase leading-relaxed">
                   <li className="flex items-center gap-2">• Receive exact fare amount</li>
                   <li className="flex items-center gap-2">• Provide official paper receipt</li>
                   <li className="flex items-center gap-2">• Count notes in view of passenger</li>
                </ul>
             </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 gap-3">
             <Button variant="outline" className="flex-1 font-bold" onClick={() => setIsPaymentCollectionAlertOpen(false)}>Not Yet</Button>
             <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest"
                onClick={() => {
                   form.setValue('isPaid', true);
                   setIsPaymentCollectionAlertOpen(false);
                }}
             >
               Funds Collected
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[550px] p-0 overflow-hidden">
          <div className="p-6 space-y-6">
            <TripItinerary booking={confirmedBooking} />
            <Button onClick={() => setIsConfirmationOpen(false)} className="w-full h-12 font-bold bg-primary text-white">
              Done & Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
