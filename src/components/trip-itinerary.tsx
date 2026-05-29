"use client";

import React from "react";
import { Ship, Calendar, Clock, MapPin, Users, QrCode, Printer, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface TripItineraryProps {
  booking: {
    id: string;
    travelDate: string;
    routeName: string;
    departurePortName: string;
    departureTime: string;
    arrivalTime?: string;
    passengers: { fullName: string; fareType: string }[];
    totalPrice: number;
    status: string;
    boardingSequenceNumber?: number;
    primaryEmail?: string;
    primaryPhone?: string;
  };
}

export function TripItinerary({ booking }: TripItineraryProps) {
  const db = useFirestore();
  const settingsRef = useMemoFirebase(() => db ? doc(db, "settings", "app") : null, [db]);
  const { data: appSettings } = useDoc(settingsRef);

  const companyName = appSettings?.companyName || "Isla Konek";
  const isConfirmed = booking.status === 'Confirmed' || booking.status === 'Used';

  if (!booking) return null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10 w-full max-w-sm mx-auto print:shadow-none print:border-none animate-in zoom-in-95 duration-300">
      <div className={cn(
        "p-3 sm:p-4 text-white text-center space-y-1",
        isConfirmed ? "bg-primary" : "bg-blue-600"
      )}>
        <div className="flex justify-center mb-0.5">
          <div className="bg-white/20 p-1.5 rounded-xl">
            <Ship className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
        <h2 className="text-lg font-black font-headline uppercase tracking-tight">
          {isConfirmed ? 'Official Itinerary' : 'Booking Summary'}
        </h2>
        <p className="text-[7px] opacity-80 font-bold uppercase tracking-[0.2em]">{companyName} Maritime Services</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start border-b border-dashed pb-3 text-left">
          <div className="flex-1 space-y-0.5">
            <p className="text-[7px] text-muted-foreground uppercase font-black tracking-widest">Booking Reference</p>
            <p className="text-lg font-mono font-black text-primary">#{booking.id}</p>
          </div>
          <div className="text-right shrink-0">
             <Badge className={cn("text-[9px] uppercase font-black h-5", isConfirmed ? 'bg-green-600' : 'bg-blue-600')}>
               {booking.status}
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="space-y-0.5">
            <p className="text-[7px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Calendar className="h-2 w-2" /> Date
            </p>
            <p className="font-bold text-xs text-primary">{booking.travelDate}</p>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="text-[7px] text-muted-foreground uppercase font-bold flex items-center gap-1 justify-end">
              <Clock className="h-2 w-2" /> Dept.
            </p>
            <p className="font-bold text-xs text-primary">{booking.departureTime}</p>
          </div>
          <div className="col-span-2 space-y-0.5 bg-secondary/10 p-1.5 rounded-lg border border-secondary">
            <p className="text-[7px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <MapPin className="h-2 w-2" /> Routing
            </p>
            <p className="font-bold text-[10px] text-primary leading-tight">{booking.routeName}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest border-b pb-0.5">Passengers</p>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
            {booking.passengers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] bg-secondary/5 p-1 rounded">
                <span className="font-bold text-primary truncate mr-2">{p.fullName}</span>
                <span className="text-[8px] text-muted-foreground italic shrink-0">{p.fareType}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 p-2 rounded-xl border border-primary/10 flex justify-between items-center">
          <span className="text-[10px] font-bold text-primary uppercase">Total Fare</span>
          <span className="text-base font-black text-primary">₱{booking.totalPrice?.toLocaleString()}</span>
        </div>

        {isConfirmed ? (
          <div className="flex items-center justify-around py-3 border-t border-dashed mt-1">
            <div className="bg-secondary/20 p-2 rounded-2xl shadow-inner">
              <Image 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=BOOKING_${booking.id}`}
                alt="Booking QR"
                width={110}
                height={110}
                className="mix-blend-multiply"
              />
            </div>
            {booking.boardingSequenceNumber && (
              <div className="text-center min-w-[80px]">
                 <p className="text-[7px] text-muted-foreground uppercase font-bold">Boarding Seq</p>
                 <p className="text-3xl font-black text-primary leading-none">#{booking.boardingSequenceNumber}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center text-center gap-2">
            <AlertCircle className="h-6 w-6 text-blue-500" />
            <div>
              <p className="text-[10px] font-black text-blue-800 uppercase leading-none">Check-in Required</p>
              <p className="text-[8px] text-blue-600 font-medium leading-relaxed mt-1">
                Reservations are held until 60 minutes before departure. Proceed to our terminal desks for payment and confirmation. Present a valid ID for passenger verification.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-secondary/30 p-2 flex gap-2 print:hidden border-t">
        <Button className="flex-1 bg-primary text-white font-bold h-9 text-xs" onClick={() => window.print()} disabled={!isConfirmed}>
          <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
        </Button>
        <Button variant="outline" className="flex-1 font-bold h-9 text-xs bg-white border-primary/20 text-primary">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Save
        </Button>
      </div>
    </div>
  );
}