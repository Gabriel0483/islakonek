
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Ship, LayoutDashboard, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const heroImage = PlaceHolderImages.find(img => img.id === "hero-ferry");
  
  const [searchData, setSearchData] = useState({
    date: ""
  });

  const db = useFirestore();
  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const { data: routes } = useCollection(routesRef);

  useEffect(() => {
    setIsMounted(true);
    setYear(new Date().getFullYear());
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchData.date) params.set("date", searchData.date);
    router.push(`/trips?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Navbar />
      
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
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
          <div className="max-w-xl mx-auto space-y-6 text-center">
            {/* Hero Message and Description Removed */}
            
            <Card className="bg-white/95 backdrop-blur p-6 shadow-2xl border-none text-foreground mt-8">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-accent" /> Select Travel Date
                  </label>
                  <Input 
                    type="date" 
                    value={searchData.date}
                    onChange={(e) => setSearchData({...searchData, date: e.target.value})}
                    className="border-none bg-secondary h-12 focus-visible:ring-accent w-full" 
                  />
                </div>
                <div className="w-full md:w-auto">
                  <Button 
                    onClick={handleSearch}
                    className="w-full h-12 px-8 gap-2 font-bold bg-accent hover:bg-accent/90 text-primary"
                  >
                    <Search className="h-4 w-4" /> Search Trips
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
                Search all available island connections by date
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-headline font-bold text-primary">Popular Island Routes</h2>
              <p className="text-muted-foreground">Most traveled routes this week</p>
            </div>
            <Link href="/trips">
              <Button variant="outline" className="text-primary hover:text-accent">View All Routes</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes && routes.length > 0 ? (
              routes.slice(0, 3).map((route) => (
                <Card key={route.id} className="border-none shadow-sm hover:shadow-lg transition-all group overflow-hidden bg-white">
                  <div className="h-3 bg-accent/20 group-hover:bg-accent transition-colors" />
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-2">{route.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <span>Duration: {Math.floor(route.estimatedDurationMinutes / 60)}h {route.estimatedDurationMinutes % 60}m</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-primary">
                        ₱{isMounted ? route.basePrice?.toLocaleString() : "---"}
                      </span>
                      <Link href={`/trips?origin=${route.name.split(' - ')[0]}`}>
                        <Button size="sm" variant="ghost" className="text-accent gap-1 group-hover:gap-2 transition-all">
                          Book Now <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-secondary/20">
                <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">Stay tuned! New routes are being added daily.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-bold">
                <LayoutDashboard className="h-4 w-4" /> For Maritime Operators
              </div>
              <h2 className="text-4xl font-headline font-bold">Scale Your Maritime Operations</h2>
              <p className="text-lg text-primary-foreground/80">
                A unified platform to manage vessels, optimize schedules, and reach thousands of passengers daily. Modernize your fleet management today.
              </p>
              <Link href="/admin">
                <Button className="bg-accent text-primary font-bold hover:bg-accent/90 mt-4 px-8 py-6 text-lg">
                  Admin Portal
                </Button>
              </Link>
            </div>
            <div className="flex-1 relative aspect-video w-full">
               <Image
                  src="https://picsum.photos/seed/dashboard/800/500"
                  alt="Admin Dashboard"
                  fill
                  className="rounded-xl shadow-2xl object-cover"
                  data-ai-hint="dashboard analytics"
               />
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-background border-t">
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
                <li><Link href="/admin" className="hover:text-accent">Admin Login</Link></li>
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
