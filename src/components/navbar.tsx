"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ship, LayoutDashboard, Menu, User, LogOut, Radio, UserCircle, Home, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection } from "firebase/firestore";

export function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login");
    }
  };

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';

  // Check if current user is authorized staff
  const staffRef = useMemoFirebase(() => (db && user) ? collection(db, "staff") : null, [db, user]);
  const { data: allStaff } = useCollection(staffRef);
  const isAuthorizedStaff = isSuperAdmin || allStaff?.some(s => s.email === user?.email && s.status === 'Active');

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Ship className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-headline font-bold tracking-tight text-primary">
              Isla Konek
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 ml-4">
            <Link href="/voyages" className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-accent flex items-center gap-1.5 transition-colors">
              <Radio className="h-3.5 w-3.5 text-accent animate-pulse" />
              Live Status
            </Link>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {user && isAuthorizedStaff && (
            <Link href="/admin" className="text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5 text-primary font-bold">
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
          
          <div className="flex items-center gap-4 border-l pl-6">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-9 px-3 hover:bg-secondary">
                    <div className="bg-primary/10 p-1.5 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold max-w-[120px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Account Services</DropdownMenuLabel>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" /> {isAuthorizedStaff ? 'Staff Profile' : 'My Profile'}
                    </Link>
                  </DropdownMenuItem>
                  
                  {!isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/my-bookings" className="cursor-pointer flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" /> My Bookings
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {isAuthorizedStaff && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer font-bold text-accent">Go to Admin Hub</Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="default" className="bg-primary h-9 px-6 font-bold text-xs">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/voyages">Live Status</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/advisories">Public Advisories</Link>
              </DropdownMenuItem>
              {user && isAuthorizedStaff && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin Dashboard</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">{isAuthorizedStaff ? 'Staff Profile' : 'My Profile'}</Link>
                  </DropdownMenuItem>
                  {!isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/my-bookings">My Bookings</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    Log Out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login">Sign In</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
