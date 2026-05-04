import { Ship, Users, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
import Link from "next/link";

export default function OperatorDashboard() {
  const recentBookings: any[] = [];

  return (
    <SidebarProvider>
      <OperatorSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary">Dashboard Overview</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <Ship className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Vessels</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-accent/20 p-3 rounded-full text-accent">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Passengers</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-500/10 p-3 rounded-full text-green-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weekly Revenue</p>
                  <p className="text-2xl font-bold">₱0</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-full text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Trips</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBookings.length > 0 ? recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-accent/10 p-2 rounded text-accent">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{booking.customer}</p>
                          <p className="text-xs text-muted-foreground">{booking.route} • {booking.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{booking.amount}</p>
                        <p className="text-xs text-muted-foreground">{booking.time}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No recent bookings found.</p>
                    </div>
                  )}
                </div>
                {recentBookings.length > 0 && (
                  <Button variant="ghost" className="w-full mt-4 text-accent">View All Bookings</Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Ship className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  AI Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <p className="text-sm text-primary-foreground/80 leading-relaxed">
                  Start configuring your routes and fleet to enable AI-powered schedule optimization and revenue insights.
                </p>
                <Link href="/operator/optimize">
                  <Button className="w-full bg-accent text-primary font-bold hover:bg-accent/90 border-none">
                    Go to Optimization Hub
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Operational Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border rounded-lg border-dashed">
                <CheckCircle2 className="h-8 w-8 text-green-500/50 mb-2" />
                <p className="text-sm">All systems operational. No active alerts.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}