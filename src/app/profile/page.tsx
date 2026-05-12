
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  History,
  Ticket,
  LogOut,
  LogIn
} from "lucide-react";
import { doc, collection } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const bookingsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "bookings");
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(userDocRef);
  const { data: allBookings, isLoading: isBookingsLoading } = useCollection(bookingsQuery);

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phoneNumber: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || ""
      });
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.displayName || "",
        email: user.email || ""
      }));
    }
  }, [profile, user]);

  const userEmail = profile?.email || user?.email;
  const myBookings = allBookings?.filter(b => b.passengerEmail === userEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSave = () => {
    if (!db || !user || !userDocRef) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const timestamp = new Date().toISOString();
    setDocumentNonBlocking(userDocRef, {
      ...formData,
      uid: user.uid,
      updatedAt: timestamp
    }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 500);
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (!isUserLoading && (!user || user.isAnonymous)) {
    return (
      <div className="min-h-screen bg-background font-body">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="bg-secondary/30 p-8 rounded-2xl mb-6">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-2xl font-bold font-headline text-primary mb-2">Guest Session</h1>
            <p className="text-muted-foreground text-sm mb-6">You are currently using Isla Konek as a guest. Sign in to save your profile permanently and track your voyages.</p>
            <Button className="w-full bg-primary font-bold h-12" onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4 mr-2" /> Sign In / Register
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold font-headline text-primary mb-2">Account Profile</h1>
            <p className="text-muted-foreground text-sm">Manage your personal information and view your maritime journey history.</p>
          </div>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" /> Personal Details
                </CardTitle>
                <CardDescription>Your information for faster ticket issuance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Full Name</Label>
                        <Input 
                          id="displayName" 
                          placeholder="e.g. Juan Dela Cruz" 
                          value={formData.displayName}
                          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" /> Email Address
                          </Label>
                          <Input 
                            id="email" 
                            type="email"
                            placeholder="juan@example.com" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" /> Mobile Number
                          </Label>
                          <Input 
                            id="phone" 
                            placeholder="0912 345 6789" 
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground italic uppercase">
                        {profile?.updatedAt ? `Last updated: ${new Date(profile.updatedAt).toLocaleDateString()}` : "Profile session active"}
                      </p>
                      <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saveSuccess ? <CheckCircle2 className="h-4 w-4 mr-2" /> : null}
                        {saveSuccess ? "Saved!" : "Update Profile"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-secondary/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Recent Travel Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isBookingsLoading ? (
                  <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" /></div>
                ) : myBookings && myBookings.length > 0 ? (
                  <div className="divide-y">
                    {myBookings.map((booking) => (
                      <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-3 w-3 text-accent" />
                            <span className="font-mono text-[10px] font-bold">#{booking.id}</span>
                            <Badge variant="outline" className="text-[9px] py-0">{booking.status}</Badge>
                          </div>
                          <p className="text-sm font-bold text-primary">{booking.travelDate}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{booking.segmentLabel} Segment</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-primary">₱{booking.finalFare?.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Paid via {booking.bookingSource}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-40">
                    <Ticket className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">No voyage history found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Verified Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-white/10 text-sm">
                  <p className="opacity-80">Connected as:</p>
                  <p className="font-bold truncate">{user?.email}</p>
                </div>
                <p className="text-xs opacity-70 leading-relaxed">
                  Your Isla Konek digital ID simplifies your check-in process at the port. Ensure your name matches your valid government ID.
                </p>
              </CardContent>
            </Card>

            <div className="p-6 rounded-xl border border-dashed text-center space-y-2 opacity-60">
               <p className="text-xs font-bold uppercase tracking-widest">Need Help?</p>
               <p className="text-[10px] text-muted-foreground">For booking adjustments or cancellations, please contact support or visit the nearest ticket counter.</p>
               <Separator className="my-4" />
               <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                 Log Out Session
               </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
