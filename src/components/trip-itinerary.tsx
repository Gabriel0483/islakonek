
"use client";

import React from "react";
import { Ship, Calendar, Clock, MapPin, Users, QrCode, Printer, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

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

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10 max-w-lg mx-auto print:shadow-none print:border-none">
      <div className="bg-primary p-6 text-primary-foreground text-center space-y-2">
        <div className="flex justify-center mb-2">
          <div className="bg-white/20 p-2 rounded-xl">
            <Ship className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-2xl font-black font-headline uppercase tracking-tight">
          {isConfirmed ? 'Official Itinerary' : 'Booking Summary'}
        </h2>
        <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Isla Konek Maritime Services</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start border-b border-dashed pb-4">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Booking ID</p>
            <p className="text-xl font-mono font-black text-primary">#{booking.id}</p>
          </div>
          <div className="text-right space-y-1">
             <Badge className={booking.status === 'Confirmed' ? 'bg-green-600' : 'bg-blue-600'}>
               {booking.status}
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" /> Travel Date
            </p>
            <p className="font-bold text-sm">{booking.travelDate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Departure
            </p>
            <p className="font-bold text-sm">{booking.departureTime}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> Routing
            </p>
            <p className="font-bold text-sm truncate">{booking.routeName}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-1">Passenger Roster</p>
          <div className="space-y-2">
            {booking.passengers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="font-bold text-primary">{p.fullName}</span>
                <span className="text-muted-foreground italic">{p.fareType}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary/20 p-4 rounded-xl flex justify-between items-center">
          <span className="text-sm font-bold text-primary uppercase">Total Fare Paid</span>
          <span className="text-xl font-black text-primary">₱{booking.totalPrice.toLocaleString()}</span>
        </div>

        {isConfirmed ? (
          <div className="flex flex-col items-center justify-center py-6 border-t border-dashed">
            <div className="bg-secondary/20 p-4 rounded-2xl mb-3">
              <Image 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOOKING_${booking.id}`}
                alt="Booking QR"
                width={120}
                height={120}
                className="mix-blend-multiply"
              />
            </div>
            {booking.boardingSequenceNumber && (
              <div className="text-center mb-4">
                 <p className="text-[10px] text-muted-foreground uppercase font-bold">Boarding Seq</p>
                 <p className="text-3xl font-black text-primary">#{booking.boardingSequenceNumber}</p>
              </div>
            )}
            <p className="text-[9px] text-primary/60 font-black uppercase tracking-[0.2em] italic">Validate at the check-in desk</p>
          </div>
        ) : (
          <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center text-center gap-3">
            <AlertCircle className="h-10 w-10 text-blue-500" />
            <div>
              <p className="text-sm font-black text-blue-800 uppercase">Payment Required</p>
              <p className="text-[10px] text-blue-600 font-medium">Please finalize your transaction at the desk to issue your QR boarding pass and sequence number.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-secondary/30 p-4 flex gap-2 print:hidden">
        <Button className="flex-1 bg-primary text-white font-bold h-10" onClick={() => window.print()} disabled={!isConfirmed}>
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
        <Button variant="outline" className="flex-1 font-bold h-10">
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
      </div>
    </div>
  );
}
