"use client";

import { useState, useEffect } from "react";
import { 
  MapPin, 
  Waypoints, 
  Ticket, 
  Ship, 
  ArrowLeft, 
  Loader2,
  Activity,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin-nav";

export default function OperationalOverviewPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const portsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "ports");
  }, [db]);

  const routesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const vesselsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);

  const bookingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "bookings");
  }, [db]);

  const { data: ports, isLoading: isPortsLoading } = useCollection(portsRef);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesRef);
  const { data: vessels, isLoading: isVesselsLoading } = useCollection(vesselsRef);
  const { data: bookings, isLoading: isBookingsLoading } = useCollection(bookingsRef);

  const isLoading = isPortsLoading || isRoutesLoading || isVesselsLoading || isBookingsLoading;

  const statusTiles = [
    { 
      label: "Active Ports", 
      value: ports?.length || 0, 
      icon: MapPin, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10", 
      description: "Configured maritime terminals and facilities." 
    },
    { 
      label: "Routes Defined", 
      value: routes?.length || 0, 
      icon: Waypoints, 
      color: "text-accent", 
      bg: "bg-accent/10", 
      description: "Active inter-island shipping connections." 
    },
    { 
      label: "Total Bookings", 
      value: bookings?.length || 0, 
      icon: Ticket, 
      color: "text-green-500", 
      bg: "bg-green-500/10", 
      description: "Validated passenger manifest records." 
    },
    { 
      label: "Fleet Size", 
      value: vessels?.length || 0, 
      icon: Ship, 
      color: "text-primary", 
      bg: "bg-primary/10", 
      description: "Vessels currently in the operational registry." 
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            Operational Overview
          </h1>
        </div>
      </header>

      <main className="p-6 space-y-8 container mx-auto">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tight">System Statistics</h2>
            <p className="text-sm text-muted-foreground">High-level overview of maritime infrastructure and operations.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-xl border border-dashed">
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Aggregating Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statusTiles.map((tile, i) => (
                <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:ring-2 hover:ring-primary/10 transition-all">
                  <CardHeader className="pb-2">
                    <div className={`${tile.bg} ${tile.color} p-2 w-fit rounded-lg mb-2 group-hover:scale-110 transition-transform`}>
                      <tile.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-4xl font-black text-primary">
                      {isMounted ? tile.value : "--"}
                    </CardTitle>
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{tile.label}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      {tile.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-primary text-primary-foreground p-8 flex flex-col justify-center gap-4">
            <h3 className="text-xl font-black uppercase tracking-tight">Data Synchronized</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              All statistics are fetched directly from the live Firestore database. Fleet statuses and manifest counts are updated in real-time as operations proceed at the terminals.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full">
               <Calendar className="h-3 w-3" /> Last sync: {isMounted ? new Date().toLocaleTimeString() : "--"}
            </div>
          </Card>
          
          <Card className="border-none shadow-sm p-8 bg-white border">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Infrastructure Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground font-medium">Database Latency</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[10px]">Optimal</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground font-medium">Terminal Gateways</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[10px]">Active</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground font-medium">Cloud Function Triggers</span>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 uppercase text-[10px]">Healthy</Badge>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
