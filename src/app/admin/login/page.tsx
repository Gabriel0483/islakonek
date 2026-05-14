
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Ship, Mail, Lock, Loader2, ArrowRight, ShieldCheck, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth, useUser } from "@/firebase";
import { initiateEmailSignIn } from "@/firebase/non-blocking-login";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      if (user.email === 'rielmagpantay@gmail.com') {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    
    setIsSubmitting(true);
    initiateEmailSignIn(auth, email, password);
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 2000);
  };

  if (isUserLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/95 p-4 font-body">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden bg-white">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="bg-primary w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <LayoutDashboard className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-black font-headline text-primary uppercase tracking-tight">Administrative Access</CardTitle>
          <CardDescription>
            Isla Konek Internal Operations Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@islakonek.com" 
                  className="pl-10 h-12 bg-secondary/20 border-none focus-visible:ring-primary"
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
                  className="pl-10 h-12 bg-secondary/20 border-none focus-visible:ring-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-primary text-white font-black text-lg hover:bg-primary/90 mt-4 group shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Verify Credentials <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-3 items-start">
            <ShieldCheck className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed text-yellow-800 font-medium">
              Restricted Area. Authorized staff only. All login attempts are recorded for terminal security audit logs.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              Return to Public Site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
