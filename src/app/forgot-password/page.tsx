"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { initiatePasswordReset } from "@/firebase/non-blocking-login";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;
    
    setIsSubmitting(true);
    initiatePasswordReset(auth, email);
    
    // Non-blocking call, we show success immediately for UX
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 font-body">
      <Card className="w-full max-w-md border-none shadow-xl overflow-hidden bg-white">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black font-headline text-primary">Reset Password</CardTitle>
          <CardDescription>
            We'll send a secure link to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {!isSent ? (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="juan@example.com" 
                    className="pl-10 h-12 bg-secondary/10 border-none focus-visible:ring-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Send Reset Link <Send className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <p className="text-sm font-bold text-green-800">Check your inbox</p>
                <p className="text-xs text-green-700">If an account exists for <span className="font-bold">{email}</span>, a reset link is on its way.</p>
              </div>
              <Button variant="outline" className="w-full h-11" onClick={() => setIsSent(false)}>
                Try another email
              </Button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
