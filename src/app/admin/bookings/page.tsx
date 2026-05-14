"use client";

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import { 
  Ticket, 
  PlusCircle, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Clock, 
  Check, 
  ChevronRight, 
  Users,
  Ship,
  UserPlus,
  Phone,
  Banknote,
  AlertCircle,
  ListOrdered
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, doc, serverTimestamp, runTransaction, Timestamp, where, query, getDocs, getDoc } from "firebase/firestore"
import React, { useMemo, useState, useEffect } from "react"
import { Separator } from "@/components/ui/separator"
import { format, addDays, isValid, isBefore, parseISO } from "date-fns"
import { TripItinerary } from "@/components/trip-itinerary"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminNav } from "@/components/admin-nav"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const passengerSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  birthDate: z.string().min(1, { message: "Birth date is required." }),
  fareType: z.string({ required_error: "Please select a fare type."}),
  emergencyContact: z.string().min(1, { message: "Emergency contact is required." }),
});

const bookingFormSchema = z.object({
  routeId: z.string({ required_error: "Please select a route." }),
  travelDate: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "A date of travel is required."}),
  scheduleId: z.string({ required_error: "Please select a schedule." }),
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required."),
  primaryEmail: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  primaryPhone: z.string().min(1, { message: "Please enter a contact number." }),
  isPaid: z.boolean().default(true),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

type BookingSummary = {
  details: {
    name: string;
    fareType: string;
    price: number;
  }[];
  totalPrice: number;
  totalTickets: number;
};

export default function DeskBookingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  const [step, setStep] = useState<'form' | 'summary' | 'confirmation'>('form');
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ details: [], totalPrice: 0, totalTickets: 0 });
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  
  const [lookupSearch, setLookupSearch] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    const sixtyDaysFromNow = addDays(today, 59);
    setDateRange({ 
        min: format(today, "yyyy-MM-dd"), 
        max: format(sixtyDaysFromNow, "yyyy-MM-dd") 
    });
  }, []);

  const schedulesRef = useMemoFirebase(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
  const routesRef = useMemoFirebase(() => firestore ? collection(firestore, 'routes') : null, [firestore]);
  const faresRef = useMemoFirebase(() => firestore ? collection(firestore, 'fares') : null, [firestore]);
  const bookingsRef = useMemoFirebase(() => firestore ? collection(firestore, 'bookings') : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);

  const { data: allSchedules, isLoading: isLoadingSchedules } = useCollection(schedulesRef);
  const { data: routes, isLoading: isLoadingRoutes } = useCollection(routesRef);
  const { data: allFares, isLoading: isLoadingFares } = useCollection(faresRef);
  const { data: recentBookings, isLoading: isLoadingBookings } = useCollection(bookingsRef);
  const { data: registeredUsers } = useCollection(usersRef);

  const [availableFares, setAvailableFares] = useState<any[]>([]);
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      travelDate: format(new Date(), "yyyy-MM-dd"),
      scheduleId: "",
      passengers: [{ id: nanoid(), fullName: "", birthDate: "", fareType: "", emergencyContact: "" }],
      primaryEmail: "",
      primaryPhone: "",
      isPaid: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });
  
  const watchRouteId = form.watch('routeId');
  const watchTravelDate = form.watch('travelDate');
  const watchScheduleId = form.watch('scheduleId');
  const watchPassengers = form.watch('passengers');

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

  useEffect(() => {
    if (watchRouteId) {
      form.setValue('scheduleId', "");
      setAvailableFares([]);
    }
  }, [watchRouteId, form]);

  useEffect(() => {
    const selectedSchedule = filteredSchedules?.find(s => s.id === watchScheduleId);
    if (selectedSchedule && routes && allFares) {
      const routeFares = allFares.filter(f => f.routeId === selectedSchedule.routeId);
      setAvailableFares(routeFares);
    } else {
      setAvailableFares([]);
    }
  }, [watchScheduleId, filteredSchedules, routes, allFares]);

  const calculateBookingSummary = (data: BookingFormData): BookingSummary => {
    const fareDetails = data.passengers.map(p => {
      const fareInfo = availableFares.find(f => f.segmentLabel === p.fareType);
      return {
        name: p.fullName || 'Passenger',
        fareType: p.fareType,
        price: fareInfo?.finalFare || 0,
      };
    });
    const totalPrice = fareDetails.reduce((acc, detail) => acc + detail.price, 0);
    return { details: fareDetails, totalPrice, totalTickets: data.passengers.length };
  };

  const handleFormSubmit = (data: BookingFormData) => {
    setBookingSummary(calculateBookingSummary(data));
    setStep('summary');
  };

  const handleApplyProfile = (index: number, user: any) => {
    const currentPassengers = form.getValues('passengers');
    currentPassengers[index] = {
      ...currentPassengers[index],
      fullName: user.displayName || "",
      emergencyContact: "", 
    };
    form.setValue('passengers', currentPassengers);
    form.setValue('primaryEmail', user.email || "");
    form.setValue('primaryPhone', user.phoneNumber || "");
    setLookupSearch('');
  };

  async function handleFinalReserve(data: BookingFormData) {
    if (!firestore) return;
  
    setIsReserving(true);
    const summary = calculateBookingSummary(data);
    const travelDate = data.travelDate;
  
    try {
      const { status: bookingStatus, bookingId } = await runTransaction(firestore, async (transaction) => {
        const scheduleRef = doc(firestore, 'schedules', data.scheduleId);
        const scheduleSnap = await transaction.get(scheduleRef);
        if (!scheduleSnap.exists()) throw new Error("Trip schedule no longer exists.");
        
        const scheduleData = scheduleSnap.data();
        const capacity = scheduleData.passengerCapacity || 0;
        const waitlistLimit = scheduleData.waitlistLimit || 0;
        
        const currentTripBookingsQuery = query(
          collection(firestore, 'bookings'),
          where('scheduleId', '==', data.scheduleId),
          where('travelDate', '==', travelDate),
          where('status', 'in', ['Confirmed', 'Used', 'Reserved', 'Waitlisted'])
        );
        const existingBookingsSnap = await getDocs(currentTripBookingsQuery);
        const seatsUsed = existingBookingsSnap.docs.length;

        let status: 'Reserved' | 'Waitlisted' | 'Confirmed';
        if (seatsUsed + data.passengers.length <= capacity) {
          status = data.isPaid ? 'Confirmed' : 'Reserved';
        } else if (seatsUsed + data.passengers.length <= capacity + waitlistLimit) {
          status = 'Waitlisted';
        } else {
          throw new Error("This trip is fully booked including waitlist.");
        }

        const tripBookings = existingBookingsSnap.docs.filter(d => ['Confirmed', 'Used'].includes(d.data().status));
        let boardingSeq = status === 'Confirmed' ? tripBookings.length + 1 : null;

        const newBookingId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        data.passengers.forEach((p, idx) => {
          const fareInfo = availableFares.find(f => f.segmentLabel === p.fareType);
          const passengerBookingId = idx === 0 ? newBookingId : `${newBookingId}-${idx + 1}`;
          const bookingRef = doc(collection(firestore, 'bookings'), passengerBookingId);
          
          const bookingData = {
            id: passengerBookingId,
            routeId: data.routeId,
            scheduleId: data.scheduleId,
            travelDate: data.travelDate,
            passengerName: p.fullName,
            passengerDob: p.birthDate,
            passengerEmail: data.primaryEmail || "",
            passengerContact: data.primaryPhone,
            emergencyContact: p.emergencyContact,
            fareId: fareInfo?.id || "",
            segmentLabel: p.fareType,
            finalFare: fareInfo?.finalFare || 0,
            status: status,
            bookingSource: "Desk",
            boardingSequenceNumber: boardingSeq ? boardingSeq++ : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          transaction.set(bookingRef, bookingData);
        });

        return { status, bookingId: newBookingId };
      });
  
      toast({ title: "Booking Successful!", description: `Reference: ${bookingId} (${bookingStatus})` });
      
      setConfirmedBooking({
        id: bookingId,
        travelDate: data.travelDate,
        routeName: routes?.find(r => r.id === data.routeId)?.name || 'Unknown Route',
        departurePortName: '', 
        departureTime: filteredSchedules.find(s => s.id === data.scheduleId)?.departureTime || '',
        passengers: data.passengers.map(p => ({ fullName: p.fullName, fareType: p.fareType })),
        totalPrice: summary.totalPrice,
        status: bookingStatus,
      });
  
      setStep('confirmation');
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Booking Failed", description: e.message });
    } finally {
        setIsReserving(false);
    }
  }

  const sortedRecentBookings = useMemo(() => {
    if (!recentBookings) return [];
    return recentBookings
      .filter(b => b.bookingSource === 'Desk')
      .sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [recentBookings]);

  const isLoading = isLoadingSchedules || isLoadingRoutes || isLoadingFares || !isMounted;

  if (isLoading) {
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
          <Ticket className="h-5 w-5 text-accent" />
          Desk Bookings
        </h1>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">Counter Sales</CardTitle>
                <CardDescription className="text-primary-foreground/70">Record manifest details for walk-in passengers.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 sm:p-20 text-center">
             <Ticket className="h-16 w-16 text-accent/20 mx-auto mb-6" />
             <h2 className="text-2xl font-black text-primary mb-2">Ready to Issue?</h2>
             <p className="text-muted-foreground mb-8 max-w-md mx-auto">Select a voyage and record passenger details to generate valid boarding passes.</p>
             <Button onClick={() => { setIsBookingDialogOpen(true); setStep('form'); }} size="lg" className="bg-primary px-12 h-14 text-lg">
               Start Ticket Booking
             </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b p-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Desk Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {!isLoadingBookings && sortedRecentBookings.length > 0 ? (
              <div className="w-full min-w-[700px]">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/30">
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left font-bold text-muted-foreground uppercase text-[10px]">ID</th>
                      <th className="h-12 px-4 text-left font-bold text-muted-foreground uppercase text-[10px]">Passenger</th>
                      <th className="h-12 px-4 text-left font-bold text-muted-foreground uppercase text-[10px]">Voyage</th>
                      <th className="h-12 px-4 text-left font-bold text-muted-foreground uppercase text-[10px]">Status</th>
                      <th className="h-12 px-4 text-right font-bold text-muted-foreground uppercase text-[10px]">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle font-mono text-[10px] font-bold">#{booking.id}</td>
                        <td className="p-4 align-middle font-bold">{booking.passengerName}</td>
                        <td className="p-4 align-middle">
                          <div className="text-[10px] text-muted-foreground">{booking.travelDate}</div>
                          <div className="text-xs font-bold truncate max-w-[150px]">{routes?.find(r => r.id === booking.routeId)?.name}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="text-[9px] uppercase font-black">{booking.status}</Badge>
                        </td>
                        <td className="p-4 align-middle text-right font-black text-primary">₱{booking.finalFare?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 opacity-30 text-xs font-bold uppercase">No recent activity</div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[800px] p-0 overflow-hidden h-[95vh] flex flex-col">
          <DialogHeader className="p-4 sm:p-6 border-b bg-white shrink-0">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-primary uppercase tracking-tight">
                <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-accent" /> Desk Issuance
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors", 
                  step === 'form' ? "bg-primary text-white" : "bg-green-600 text-white")}>
                  {step !== 'form' ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className={cn("text-[10px] font-bold uppercase", step === 'form' ? "text-primary" : "text-muted-foreground")}>Details</span>
              </div>
              <Separator className="w-8 h-px bg-border shrink-0" />
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors", 
                  step === 'summary' ? "bg-primary text-white" : step === 'confirmation' ? 'bg-green-600 text-white' : "bg-secondary text-muted-foreground")}>
                  {step === 'confirmation' ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <span className={cn("text-[10px] font-bold uppercase", step === 'summary' ? "text-primary" : "text-muted-foreground")}>Summary</span>
              </div>
              <Separator className="w-8 h-px bg-border shrink-0" />
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors", 
                  step === 'confirmation' ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>3</div>
                <span className={cn("text-[10px] font-bold uppercase", step === 'confirmation' ? "text-primary" : "text-muted-foreground")}>Success</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-4 sm:p-6 space-y-8 pb-32">
              {step === 'form' && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/10 p-4 rounded-xl border-2 border-dashed">
                      <FormField
                        control={form.control}
                        name="travelDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Travel Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} min={dateRange.min} max={dateRange.max} className="bg-white h-11" />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Route</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white h-11">
                                  <SelectValue placeholder="Choose Connection" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Schedule</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!watchRouteId}>
                              <FormControl>
                                <SelectTrigger className="bg-white h-11">
                                  <SelectValue placeholder="Choose Time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {filteredSchedules.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.tripCode} - {s.departureTime}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </section>

                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-black text-primary uppercase text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-accent" /> Passengers ({fields.length})
                        </h3>
                      </div>

                      <div className="space-y-10">
                        {fields.map((field, index) => (
                          <div key={field.id} className="relative bg-secondary/5 rounded-2xl border-2 border-dashed p-4 sm:p-6 pt-10 group hover:border-accent/40 transition-colors">
                            <div className="absolute -top-4 left-4 bg-white border-2 px-3 py-1 rounded-full text-[10px] font-black uppercase text-primary tracking-widest z-10">
                              Passenger #{index + 1}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-3 -right-3 h-8 w-8 bg-white shadow-md border-2 rounded-full text-destructive hover:bg-red-50 z-20" onClick={() => remove(index)} disabled={fields.length === 1}>
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <div className="space-y-6">
                               <div className="space-y-2 relative">
                                <Label className="text-[10px] font-black uppercase text-accent flex items-center gap-1.5 tracking-wider">
                                  <Search className="h-3 w-3" /> Rapid Profile Lookup
                                </Label>
                                <Input 
                                  placeholder="Search by name or mobile..." 
                                  value={lookupSearch}
                                  onChange={(e) => setLookupSearch(e.target.value)}
                                  className="bg-white border-accent/20 h-11 text-sm focus-visible:ring-accent"
                                />
                                {lookupSearch.length > 1 && (
                                  <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-2xl z-50 mt-2 overflow-hidden animate-in zoom-in-95 duration-200">
                                    {registeredUsers?.filter(u => u.displayName?.toLowerCase().includes(lookupSearch.toLowerCase()) || u.phoneNumber?.includes(lookupSearch)).slice(0, 3).map(user => (
                                      <button key={user.uid} type="button" onClick={() => handleApplyProfile(index, user)} className="w-full text-left px-5 py-4 hover:bg-accent/5 border-b last:border-0 flex items-center gap-4 transition-colors">
                                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                                          <Users className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-primary truncate">{user.displayName}</p>
                                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {user.phoneNumber || "No mobile set"}
                                          </p>
                                        </div>
                                        <UserPlus className="h-5 w-5 ml-auto text-accent shrink-0" />
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
                                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Full Name</FormLabel>
                                      <FormControl><Input placeholder="Juan Dela Cruz" {...field} className="bg-white h-11" /></FormControl>
                                      <FormMessage className="text-[10px]" />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`passengers.${index}.birthDate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Birth Date</FormLabel>
                                      <FormControl><Input type="date" {...field} className="bg-white h-11" /></FormControl>
                                      <FormMessage className="text-[10px]" />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                  control={form.control}
                                  name={`passengers.${index}.fareType`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Demographic</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value} disabled={!watchScheduleId}>
                                        <FormControl>
                                          <SelectTrigger className="bg-white h-11">
                                            <SelectValue placeholder="Select Tier" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {availableFares.map(f => <SelectItem key={f.id} value={f.segmentLabel}>{f.segmentLabel} (₱{f.finalFare})</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage className="text-[10px]" />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`passengers.${index}.emergencyContact`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Emergency Contact</FormLabel>
                                      <FormControl><Input placeholder="Name or Phone" {...field} className="bg-white h-11" /></FormControl>
                                      <FormMessage className="text-[10px]" />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => append({ id: nanoid(), fullName: "", birthDate: "", fareType: "", emergencyContact: "" })} 
                          disabled={!watchScheduleId} 
                          className="w-full gap-2 h-11 font-bold text-xs sm:text-sm border-2 border-dashed"
                        >
                          <PlusCircle className="h-4 w-4" /> Add Another Passenger
                        </Button>
                      </div>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                      <FormField
                        control={form.control}
                        name="primaryPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Primary Mobile</FormLabel>
                            <FormControl><Input placeholder="09171234567" {...field} className="bg-white h-11" /></FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="primaryEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Email (Optional)</FormLabel>
                            <FormControl><Input placeholder="juan@example.com" {...field} className="bg-white h-11" /></FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </section>

                    <FormField
                      control={form.control}
                      name="isPaid"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 bg-secondary/5 p-5">
                          <div className="space-y-1 pr-4">
                            <FormLabel className="text-sm font-black text-primary uppercase">Process Payment Now</FormLabel>
                            <FormDescription className="text-[10px] italic">Marking this as paid issues a CONFIRMED ticket immediately.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}

              {step === 'summary' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-32">
                   <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Voyage Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold uppercase">Trip ID</Label>
                        <p className="font-black text-accent text-lg">{filteredSchedules.find(s => s.id === watchScheduleId)?.tripCode}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold uppercase">Departure</Label>
                        <p className="font-bold text-primary">{filteredSchedules.find(s => s.id === watchScheduleId)?.departureTime}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-bold uppercase">Travel Date</Label>
                        <p className="font-bold">{watchTravelDate}</p>
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <Label className="text-[10px] text-muted-foreground font-bold uppercase">Routing</Label>
                        <p className="font-bold text-sm">{routes?.find(r => r.id === watchRouteId)?.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] border-b pb-2">Passenger Breakdown</h3>
                    <div className="space-y-3">
                      {bookingSummary.details.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-4 rounded-xl border-2">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center font-black text-primary text-xs shrink-0">{index + 1}</div>
                              <div>
                                <p className="font-bold text-primary uppercase text-sm truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{item.fareType}</p>
                              </div>
                           </div>
                           <p className="font-black text-primary">₱{item.price.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 bg-primary rounded-2xl text-primary-foreground shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="h-32 w-32 -rotate-12 translate-x-8 translate-y-8" /></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                      <div>
                        <p className="text-[10px] opacity-70 uppercase font-black tracking-widest mb-1">Total Payable</p>
                        <p className="text-4xl sm:text-6xl font-black">₱{bookingSummary.totalPrice.toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className="bg-white/10 text-white border-white/30 uppercase text-[10px] px-4 py-1.5 font-black">
                        {form.getValues('isPaid') ? 'Immediate Issuance' : 'Reservation Only'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {step === 'confirmation' && confirmedBooking && (
                <div className="py-6 animate-in zoom-in-95 duration-300 pb-32">
                  <TripItinerary booking={confirmedBooking} />
                  <Button variant="outline" className="w-full mt-8 h-12 font-bold" onClick={() => { form.reset(); setStep('form'); setConfirmedBooking(null); }}>
                    Start New Booking
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 sm:p-6 border-t bg-secondary/5 flex flex-row items-center justify-between shrink-0">
            {step === 'form' ? (
              <>
                <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)} className="h-12 font-bold px-8">Cancel</Button>
                <Button 
                  type="button"
                  onClick={form.handleSubmit(handleFormSubmit)} 
                  className="bg-primary h-12 px-10 font-black uppercase tracking-wider"
                  disabled={!watchScheduleId || fields.length === 0}
                >
                  Review Summary <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </>
            ) : step === 'summary' ? (
              <>
                <Button variant="ghost" onClick={() => setStep('form')} className="h-12 font-bold px-8">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Details
                </Button>
                <Button onClick={() => handleFinalReserve(form.getValues())} size="lg" className="bg-accent text-primary h-12 px-10 font-black uppercase tracking-wider" disabled={isReserving}>
                  {isReserving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Confirm & Issue
                </Button>
              </>
            ) : (
               <Button className="w-full h-12 font-bold" onClick={() => setIsBookingDialogOpen(false)}>Close Window</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
