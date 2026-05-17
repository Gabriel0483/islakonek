
"use client";

import { useState, useMemo } from "react";
import { 
  Megaphone, 
  Loader2, 
  Calendar, 
  Cloud, 
  AlertTriangle, 
  Waypoints, 
  Info,
  Clock,
  ArrowRight
} from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PublicAdvisoriesPage() {
  const db = useFirestore();

  const advisoriesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "advisories");
  }, [db]);
  
  const { data: advisories, isLoading: isAdvisoriesLoading } = useCollection(advisoriesRef);

  const activeAdvisories = useMemo(() => {
    if (!advisories) return [];
    return advisories
      .filter(a => a.isActive !== false)
      .sort((a: any, b: any) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [advisories]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Weather': return <Cloud className="h-5 w-5 text-blue-500" />;
      case 'Service Disruption': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'Route/Fare Change': return <Waypoints className="h-5 w-5 text-accent" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getSeverityStyles = (sev: string) => {
    switch (sev) {
      case 'High': return "border-destructive bg-destructive/5 text-destructive";
      case 'Medium': return "border-orange-500 bg-orange-50 text-orange-700";
      default: return "border-primary/20 bg-primary/5 text-primary";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-xl">
               <Megaphone className="h-7 w-7 text-primary" />
             </div>
             <h1 className="text-3xl font-black font-headline text-primary uppercase tracking-tight">Public Advisories</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Stay informed with real-time updates regarding weather conditions, service schedules, and important terminal notices.
          </p>
        </header>

        {isAdvisoriesLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Syncing Broadcast Board...</p>
          </div>
        ) : activeAdvisories.length > 0 ? (
          <div className="space-y-6">
            {activeAdvisories.map((advisory) => (
              <Card key={advisory.id} className={cn("border-2 shadow-sm overflow-hidden bg-white transition-all group", advisory.severity === 'High' ? "border-destructive/30" : "border-secondary")}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className={cn("p-6 md:w-48 shrink-0 flex flex-col items-center justify-center text-center gap-3 border-b md:border-b-0 md:border-r", 
                      advisory.severity === 'High' ? "bg-destructive/5" : "bg-secondary/20")}>
                       <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                          {getCategoryIcon(advisory.category)}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">{advisory.category}</p>
                          {advisory.severity === 'High' && (
                             <Badge variant="destructive" className="text-[8px] font-black uppercase py-0 px-2 h-4">Critical</Badge>
                          )}
                       </div>
                    </div>

                    <div className="p-6 flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <h2 className={cn("text-xl font-black font-headline uppercase leading-tight", 
                            advisory.severity === 'High' ? "text-destructive" : "text-primary")}>
                            {advisory.title}
                          </h2>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-secondary/30 px-2 py-1 rounded-full shrink-0">
                             <Clock className="h-3 w-3" /> {advisory.updatedAt ? format(new Date(advisory.updatedAt), "MMM dd, HH:mm") : "Recently"}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {advisory.content}
                        </p>
                      </div>

                      {advisory.category === 'Weather' && (
                         <div className="pt-4 mt-4 border-t border-dashed flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase">
                            <Info className="h-3.5 w-3.5" /> Source: PAGASA Local Maritime Bulletin
                         </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-white opacity-50 flex flex-col items-center">
            <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-primary uppercase">No Active Bulletins</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
              The maritime operation is currently running under normal conditions. All systems are nominal.
            </p>
          </div>
        )}

        <footer className="pt-12 pb-20">
           <Card className="border-none shadow-md bg-primary text-primary-foreground overflow-hidden rounded-3xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Waypoints className="h-32 w-32 -rotate-12 translate-x-8 translate-y-8" />
              </div>
              <CardContent className="p-8 sm:p-10 relative z-10 flex flex-col md:flex-row items-center gap-8">
                 <div className="flex-1 space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Need Real-time Status?</h3>
                    <p className="text-primary-foreground/70 text-sm">Check our Live Trip Status board for vessel departures, arrivals, and delays.</p>
                 </div>
                 <a href="/voyages">
                    <Button className="bg-accent text-primary font-black uppercase tracking-widest h-12 px-8 rounded-xl shadow-lg group">
                       Live Board <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                 </a>
              </CardContent>
           </Card>
        </footer>
      </main>
    </div>
  );
}
