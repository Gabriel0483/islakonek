
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ship, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { Label } from "@/components/ui/label";
import { useUser } from "@/firebase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user is already logged in, redirect to home or admin
  if (user) {
    if (user.email === 'rielmagpantay@gmail.com') {
      router.push("/admin");
    } else {
      router.push("/");
    }
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    
    setIsSubmitting(true);
    initiateEmailSignIn(auth, email, password);
    
    // Auth state change will be handled by the listener in provider
    // We add a small delay to allow the auth listener to fire
    setTimeout(() => {
      setIsSubmitting(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 font-body">
      <Card className="w-full max-w-md border-none shadow-xl overflow-hidden bg-white">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-black font-headline text-primary">Welcome Back</CardTitle>
          <CardDescription>
            Access your Isla Konek account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@example.com" 
                  className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-accent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-accent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                  Sign In <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-accent/5 rounded-lg border border-accent/20 flex gap-3 items-start">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-primary/70 italic">
              SuperAdmin designation: <span className="font-bold">rielmagpantay@gmail.com</span>. 
              Only this account can manage infrastructure settings.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Return to Public Site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
