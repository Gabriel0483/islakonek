import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Calendar, Users, Ship, Anchor, Clock, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === "hero-ferry");

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage?.imageUrl || ""}
          alt="Modern ferry"
          fill
          className="object-cover"
          priority
          data-ai-hint="modern ferry"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        
        <div className="container relative z-10 px-4 mx-auto text-white">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-5xl md:text-6xl font-headline font-extrabold leading-tight">
              Connect Islands, <br />
              <span className="text-accent">Simplify Voyages</span>
            </h1>
            <p className="text-xl text-white/90 max-w-lg">
              Isla Konek is your modern bridge to the Philippine seas. Book ferry trips, manage schedules, and explore the islands with ease.
            </p>
            
            {/* Search Box */}
            <Card className="bg-white/95 backdrop-blur p-4 md:p-6 shadow-2xl border-none text-foreground mt-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-accent" /> Origin
                  </label>
                  <Input placeholder="Manila" className="border-none bg-secondary focus-visible:ring-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-accent" /> Destination
                  </label>
                  <Input placeholder="Cebu" className="border-none bg-secondary focus-visible:ring-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-accent" /> Date
                  </label>
                  <Input type="date" className="border-none bg-secondary focus-visible:ring-accent" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full h-10 gap-2 font-bold bg-accent hover:bg-accent/90 text-primary">
                    <Search className="h-4 w-4" /> Search Trips
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { from: "Manila", to: "Cebu", price: "₱1,200", duration: "22h", type: "RoRo" },
              { from: "Iloilo", to: "Bacolod", price: "₱350", duration: "1.5h", type: "FastCraft" },
              { from: "Batangas", to: "Calapan", price: "₱500", duration: "2h", type: "RoRo" },
            ].map((route, idx) => (
              <Card key={idx} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-none bg-white">
                <div className="relative h-48">
                  <Image
                    src={`https://picsum.photos/seed/route${idx}/600/400`}
                    alt={`${route.from} to ${route.to}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-accent/90 backdrop-blur text-primary font-bold px-3 py-1 rounded-full text-sm">
                    {route.price}
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-lg text-primary">{route.from} → {route.to}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {route.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <Ship className="h-4 w-4" /> {route.type}
                    </div>
                  </div>
                  <Button className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors border-none">
                    Book Trip
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Operators Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-bold">
                <LayoutDashboard className="h-4 w-4" /> For Maritime Operators
              </div>
              <h2 className="text-4xl font-headline font-bold">Scale Your Maritime Operations</h2>
              <p className="text-lg text-primary-foreground/80">
                A unified platform to manage vessels, optimize schedules with AI, and reach thousands of passengers daily. Modernize your fleet management today.
              </p>
              <ul className="space-y-4">
                {[
                  "AI-Powered Schedule Optimization",
                  "Real-time Inventory Tracking",
                  "Detailed Analytics & Reporting",
                  "Secure Automated Payments"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="bg-accent rounded-full p-1 text-primary">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/operator">
                <Button className="bg-accent text-primary font-bold hover:bg-accent/90 mt-4 px-8 py-6 text-lg">
                  Join as Operator
                </Button>
              </Link>
            </div>
            <div className="flex-1 relative aspect-video w-full">
               <Image
                  src="https://picsum.photos/seed/dashboard/800/500"
                  alt="Operator Dashboard"
                  fill
                  className="rounded-xl shadow-2xl object-cover"
                  data-ai-hint="dashboard analytics"
               />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li><Link href="/operator" className="hover:text-accent">Operator Login</Link></li>
                <li><Link href="/privacy" className="hover:text-accent">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/faq" className="hover:text-accent">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-accent">Contact Us</Link></li>
                <li><Link href="/terms" className="hover:text-accent">Terms of Service</Link></li>
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
            © {new Date().getFullYear()} Isla Konek. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
