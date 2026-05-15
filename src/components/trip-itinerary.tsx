"use client";

import React from "react";
import { Ship, Calendar, Clock, MapPin, Users, QrCode, Printer, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const isConfirmed = booking.status === 'Confirmed' || booking.status === 'Used';

  if (!booking) return null;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-primary/10 w-full max-w-lg mx-auto print:shadow-none print:border-none animate-in zoom-in-95 duration-300">
      <div className={cn(
        "p-4 sm:p-6 text-white text-center space-y-2",
        isConfirmed ? "bg-primary" : "bg-blue-600"
      )}>
        <div className="flex justify-center mb-1 sm:mb-2">
          <div className="bg-white/20 p-2 rounded-xl sm:rounded-2xl">
            <Ship className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-black font-headline uppercase tracking-tight">
          {isConfirmed ? 'Official Itinerary' : 'Booking Summary'}
        </h2>
        <p className="text-[9px] sm:text-[10px] opacity-80 font-bold uppercase tracking-[0.2em]">Isla Konek Maritime Services</p>
      </div>

      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex justify-between items-start border-b border-dashed pb-4">
          <div className="flex-1 space-y-0.5">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-widest">Booking Reference</p>
            <p className="text-lg sm:text-2xl font-mono font-black text-primary">#{booking.id}</p>
          </div>
          <div className="text-right shrink-0">
             <Badge className={cn("text-[10px] uppercase font-black", isConfirmed ? 'bg-green-600' : 'bg-blue-600')}>
               {booking.status}
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Travel Date
            </p>
            <p className="font-bold text-sm sm:text-base text-primary">{booking.travelDate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" /> Departure
            </p>
            <p className="font-bold text-sm sm:text-base text-primary">{booking.departureTime}</p>
          </div>
          <div className="col-span-2 space-y-1 bg-secondary/10 p-2 rounded-lg border border-secondary">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Routing
            </p>
            <p className="font-bold text-xs sm:text-sm text-primary leading-tight">{booking.routeName}</p>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-1">Passenger Roster</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {booking.passengers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] sm:text-sm bg-secondary/5 p-1.5 rounded">
                <span className="font-bold text-primary truncate mr-2">{p.fullName}</span>
                <span className="text-muted-foreground italic shrink-0">{p.fareType}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 p-3 sm:p-4 rounded-xl border border-primary/10 flex justify-between items-center">
          <span className="text-xs sm:text-sm font-bold text-primary uppercase">Total Fare</span>
          <span className="text-xl sm:text-2xl font-black text-primary">₱{booking.totalPrice?.toLocaleString()}</span>
        </div>

        {isConfirmed ? (
          <div className="flex flex-col items-center justify-center py-4 sm:py-6 border-t border-dashed mt-2">
            <div className="bg-secondary/20 p-3 sm:p-4 rounded-2xl mb-3 shadow-inner">
              <Image 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOOKING_${booking.id}`}
                alt="Booking QR"
                width={120}
                height={120}
                className="mix-blend-multiply sm:w-[140px] sm:h-[140px]"
              />
            </div>
            {booking.boardingSequenceNumber && (
              <div className="text-center mb-3">
                 <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</p>
                 <p className="text-3xl sm:text-5xl font-black text-primary leading-none">#{booking.boardingSequenceNumber}</p>
              </div>
            )}
            <p className="text-[9px] text-primary/60 font-black uppercase tracking-[0.2em] italic text-center px-4">Present at the check-in desk</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center text-center gap-3">
            <AlertCircle className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs sm:text-sm font-black text-blue-800 uppercase">Payment Pending</p>
              <p className="text-[9px] sm:text-[10px] text-blue-600 font-medium leading-relaxed">Please finalize your transaction at the desk to issue your official QR boarding pass and sequence number.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-secondary/30 p-3 sm:p-4 flex gap-2 print:hidden border-t">
        <Button className="flex-1 bg-primary text-white font-bold h-11 sm:h-12 text-xs sm:text-sm" onClick={() => window.print()} disabled={!isConfirmed}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 font-bold h-11 sm:h-12 text-xs sm:text-sm bg-white border-primary/20 text-primary">
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </div>
    </div>
  );
}
