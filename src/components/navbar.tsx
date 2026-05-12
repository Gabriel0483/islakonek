
"use client";

import Link from "next/link";
import { Ship, User, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, isUserLoading } = useUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Ship className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-headline font-bold tracking-tight text-primary">
              Isla Konek
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/trips" className="text-sm font-medium hover:text-accent transition-colors">
            Find Trips
          </Link>
          <Link href="/admin" className="text-sm font-medium hover:text-accent transition-colors flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Admin Portal
          </Link>
          <div className="h-4 w-px bg-border mx-2" />
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4 text-accent" />
              {isUserLoading ? "..." : user && !user.isAnonymous ? "My Profile" : "Sign In"}
            </Button>
          </Link>
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
                <Link href="/trips">Find Trips</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin Portal</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  {user && !user.isAnonymous ? "My Profile" : "Sign In"}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
