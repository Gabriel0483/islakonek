"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Calendar, Ship, MapPin } from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const router = useRouter();
  const db = useFirestore();
  const [year, setYear] = useState<number | null>(null);
  const [dateLimits, setDateLimits] = useState({ min: "", max: "" });
  const heroImage = PlaceHolderImages.find(img => img.id === "hero-ferry");
  
  const portsRef = useMemoFirebase(() => collection(db!, "ports"), [db]);
  const { data: ports } = useCollection(portsRef);

  const [searchData, setSearchData] = useState({
    date: "",
    originPortId: ""
  });

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());

    // Calculate 10-day rolling window
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayStr = formatDate(now);
    const tenDaysLater = new Date();
    tenDaysLater.setDate(now.getDate() + 9);
    const maxDateStr = formatDate(tenDaysLater);

    setDateLimits({
      min: todayStr,
      max: maxDateStr
    });
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchData.date) params.set("date", searchData.date);
    if (searchData.originPortId) params.set("originPortId", searchData.originPortId);
    router.push(`/trips?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Navbar />
      
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage?.imageUrl || ""}
          alt="Modern ferry"
          fill
          className="object-cover"
          priority
          data-ai-hint="modern ferry"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-background/80" />
        
        <div className="container relative z-10 px-4 mx-auto text-white">
          <div className="max-w-2xl mx-auto space-y-6 text-center">
            <h1 className="text-4xl md:text-6xl font-black font-headline mb-6 drop-shadow-lg">
              Islands Within Reach
            </h1>
            <Card className="bg-white/95 backdrop-blur p-6 shadow-2xl border-none text-foreground">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-accent" /> Origin Port
                  </label>
                  <Select 
                    value={searchData.originPortId} 
                    onValueChange={(val) => setSearchData({...searchData, originPortId: val})}
                  >
                    <SelectTrigger className="border-none bg-secondary h-12 focus:ring-accent">
                      <SelectValue placeholder="Select Departure Port" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ports</SelectItem>
                      {ports?.map(port => (
                        <SelectItem key={port.id} value={port.id}>{port.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-accent" /> Travel Date
                  </label>
                  <Input 
                    type="date" 
                    value={searchData.date}
                    min={dateLimits.min}
                    max={dateLimits.max}
                    onChange={(e) => setSearchData({...searchData, date: e.target.value})}
                    className="border-none bg-secondary h-12 focus-visible:ring-accent w-full" 
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <Button 
                    onClick={handleSearch}
                    className="w-full h-12 gap-2 font-bold bg-accent hover:bg-accent/90 text-primary"
                  >
                    <Search className="h-4 w-4" /> Find Trips
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
                Check real-time island schedules and availability
              </p>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-background border-t mt-auto">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Ship className="h-6 w-6 text-accent" />
                <span className="text-xl font-headline font-bold text-primary">Isla Konek</span>
              </div>
              <p className="text-muted-foreground text-sm">
                The leading digital maritime bridge in the Philippines. Connecting islands, simplified.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/trips" className="hover:text-accent">Search Trips</Link></li>
                <li><Link href="/admin" className="hover:text-accent">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/faq" className="hover:text-accent">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-accent">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Stay Connected</h4>
              <p className="text-sm text-muted-foreground mb-4">Sign up for updates on new routes and offers.</p>
              <div className="flex gap-2">
                <Input placeholder="Email address" className="bg-secondary border-none" />
                <Button className="bg-primary text-white">Subscribe</Button>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © {year} Isla Konek. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}