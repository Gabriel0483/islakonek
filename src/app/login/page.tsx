
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ship, Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/navbar";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirect if already logged in as a non-anonymous user
  if (user && !user.isAnonymous) {
    router.push("/profile");
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      initiateEmailSignIn(auth, formData.email, formData.password);
      // The onAuthStateChanged listener in FirebaseClientProvider will handle the state change
      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Check your credentials.");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      initiateEmailSignUp(auth, formData.email, formData.password);
      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary/20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground text-center py-8">
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Ship className="h-10 w-10 text-accent" />
            </div>
            <CardTitle className="text-2xl font-black font-headline tracking-tight">Isla Konek Access</CardTitle>
            <CardDescription className="text-primary-foreground/70">Secure your island voyages and travel history.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>
              
              {error && (
                <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 rotate-180" /> {error}
                </div>
              )}

              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="login-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="login-password" 
                        type="password" 
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary font-bold h-12" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" /> Sign In</>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Create Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" 
                        type="password" 
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-accent text-primary font-bold h-12 hover:bg-accent/90" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" /> Create Account</>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-secondary/10 py-4 justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              Secured by Firebase Auth
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
