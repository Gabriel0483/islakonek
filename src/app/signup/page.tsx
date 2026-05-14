"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, ArrowRight, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Label } from "@/components/ui/label";
import { doc, setDoc } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user becomes logged in (from the non-blocking sign up), create profile and redirect
  useEffect(() => {
    if (!isUserLoading && user) {
      // Create user profile document if it doesn't exist
      if (db) {
        const userRef = doc(db, "users", user.uid);
        setDoc(userRef, {
          uid: user.uid,
          displayName: fullName || user.displayName || "",
          email: user.email,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      router.push("/profile");
    }
  }, [user, isUserLoading, router, db, fullName]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password || !fullName) return;
    
    setIsSubmitting(true);
    initiateEmailSignUp(auth, email, password, fullName);
    
    // We keep submitting state for a moment while auth propagates
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 font-body">
      <Card className="w-full max-w-md border-none shadow-xl overflow-hidden bg-white">
        <div className="h-2 bg-accent" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="bg-accent/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black font-headline text-primary">Create Account</CardTitle>
          <CardDescription>
            Join Isla Konek to manage your voyages
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="fullName" 
                  type="text" 
                  placeholder="Juan Dela Cruz" 
                  className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-accent"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="juan@example.com" 
                  className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-accent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-accent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-primary text-white font-bold text-lg hover:bg-primary/90 mt-4 group"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 flex gap-3 items-start">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-blue-800 font-medium">
              By creating an account, you agree to receive voyage notifications and itinerary updates via email.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
