import { Ship, LayoutDashboard, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";

export default function OperatorDashboard() {
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
                  <p className="text-sm font-medium text-muted-foreground">Operational Status</p>
                  <p className="text-2xl font-bold">Ready</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Ship className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-accent" />
                  Welcome to Isla Konek Ops
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <p className="text-sm text-primary-foreground/80 leading-relaxed max-w-2xl">
                  Your maritime operations command center is ready. Start by configuring your fleet and routes to begin digitalizing your island connections.
                </p>
              </CardContent>
            </Card>

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
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
