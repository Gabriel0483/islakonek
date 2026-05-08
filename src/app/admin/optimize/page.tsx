
"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, Ship, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { optimizeSchedule, AIScheduleOptimizationOutput, AIScheduleOptimizationInput } from "@/ai/flows/ai-schedule-optimization-tool";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function OptimizePage() {
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIScheduleOptimizationOutput | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const schedulesRef = useMemoFirebase(() => collection(db!, "schedules"), [db]);
  const vesselsRef = useMemoFirebase(() => collection(db!, "vessels"), [db]);
  const routesRef = useMemoFirebase(() => collection(db!, "routes"), [db]);
  const portsRef = useMemoFirebase(() => collection(db!, "ports"), [db]);

  const { data: schedules } = useCollection(schedulesRef);
  const { data: vessels } = useCollection(vesselsRef);
  const { data: routes } = useCollection(routesRef);
  const { data: ports } = useCollection(portsRef);

  async function handleOptimize() {
    if (!schedules || schedules.length === 0) {
      console.warn("No schedule data provided for optimization.");
      return;
    }
    
    setLoading(true);
    try {
      // Map Firestore data to AI Input schema
      const existingScheduleInput = schedules.map(s => {
        const route = routes?.find(r => r.id === s.routeId);
        const origin = ports?.find(p => p.id === route?.originPortId)?.name || "Unknown Port";
        const dest = ports?.find(p => p.id === route?.destinationPortId)?.name || "Unknown Port";
        
        // Mocking ISO timestamps for current day based on HH:mm
        const today = new Date().toISOString().split('T')[0];
        const departure = `${today}T${s.departureTime}:00Z`;
        const arrivalDate = new Date(new Date(departure).getTime() + (route?.estimatedDurationMinutes || 60) * 60000);

        return {
          routeId: s.routeId,
          routeName: route?.name || "Unnamed Route",
          origin: origin,
          destination: dest,
          scheduledDeparture: departure,
          scheduledArrival: arrivalDate.toISOString(),
          vesselTypeRequired: "FastCraft", // Fallback
          currentVesselId: s.vesselId,
          expectedDurationHours: (route?.estimatedDurationMinutes || 60) / 60
        };
      });

      const availableVesselsInput = (vessels || []).map(v => ({
        vesselId: v.id,
        vesselName: v.name,
        type: v.type,
        passengerCapacity: v.passengerCapacity || 0,
        cargoCapacityTEU: v.cargoCapacityTEU || 0,
        currentLocation: "TBA",
        availableFrom: new Date().toISOString()
      }));

      const input: AIScheduleOptimizationInput = {
        existingSchedule: existingScheduleInput,
        availableVessels: availableVesselsInput,
        demandForecast: (routes || []).map(r => ({
          routeId: r.id,
          date: new Date().toISOString().split('T')[0],
          passengerDemand: 100, // Mocked demand
          cargoDemandTEU: 0
        })),
        weatherForecast: [],
        operationalConstraints: [
          "Max 1 trip per vessel per day during optimization test",
          "Ensure high utilization for passenger ferries"
        ]
      };

      const output = await optimizeSchedule(input);
      setResult(output);
    } catch (error) {
      console.error("Optimization failed", error);
    } finally {
      setLoading(false);
    }
  }

  const hasData = schedules && schedules.length > 0;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Schedule Optimization
          </h1>
        </header>

        <main className="flex flex-1 flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold font-headline">Intelligence Hub</h2>
                <p className="text-muted-foreground">Optimize your fleet assignments based on demand, weather, and real-world constraints.</p>
              </div>
              <Button 
                onClick={handleOptimize} 
                disabled={loading || !hasData}
                className="bg-accent text-primary font-bold hover:bg-accent/90 px-6 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Optimized Plan
                  </>
                )}
              </Button>
            </div>
          </section>

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl opacity-50">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold">
                {hasData ? "Ready to optimize" : "No data to optimize"}
              </h3>
              <p className="text-muted-foreground max-w-xs">
                {hasData 
                  ? "Your current trips and fleet are loaded. Click generate to see the AI proposal." 
                  : "Once you have active routes and vessels configured, our AI will help you find the most efficient schedule."}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-primary text-primary-foreground border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-accent" />
                    AI Rationale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-primary-foreground/90">{result.optimizationRationale}</p>
                </CardContent>
              </Card>

              {result.warnings && result.warnings.length > 0 && (
                <div className="space-y-3">
                  {result.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold font-headline">Proposed Schedule</h3>
                <div className="grid grid-cols-1 gap-4">
                  {result.optimizedSchedule.length > 0 ? result.optimizedSchedule.map((trip) => (
                    <Card key={trip.routeId} className="border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center">
                          <div className="bg-secondary p-6 md:w-1/4">
                            <div className="flex items-center gap-2 text-primary mb-1">
                              <Ship className="h-5 w-5" />
                              <span className="font-bold">{trip.routeName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{trip.routeId}</div>
                          </div>
                          <div className="p-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Departure</p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-accent" />
                                <span className="font-medium">
                                  {isMounted ? new Date(trip.optimizedDeparture).toLocaleString() : "---"}
                                </span>
                              </div>
                              <p className="text-sm">{trip.origin}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Arrival</p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-accent" />
                                <span className="font-medium">
                                  {isMounted ? new Date(trip.optimizedArrival).toLocaleString() : "---"}
                                </span>
                              </div>
                              <p className="text-sm">{trip.destination}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Capacity Utilization</p>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>PASSENGERS</span>
                                  <span>{trip.capacityUtilization.passengers}%</span>
                                </div>
                                <Progress value={trip.capacityUtilization.passengers} className="h-1.5" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span>CARGO (TEU)</span>
                                  <span>{trip.capacityUtilization.cargo}%</span>
                                </div>
                                <Progress value={trip.capacityUtilization.cargo} className="h-1.5" />
                              </div>
                            </div>
                          </div>
                          <div className="p-6 md:w-1/5 border-t md:border-t-0 md:border-l flex flex-col justify-center items-center gap-2 bg-secondary/50">
                             <Badge variant="outline" className="bg-white">{vessels?.find(v => v.id === trip.assignedVesselId)?.name || trip.assignedVesselId}</Badge>
                             <span className="text-xs text-muted-foreground">Assigned Vessel</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="p-12 text-center text-muted-foreground">No trips generated.</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold font-headline">Vessel Utilization Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {result.vesselAssignmentsSummary.map((vessel) => (
                    <Card key={vessel.vesselId} className="border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                          {vessel.vesselName}
                          {vessel.maxCapacityReached && <Badge variant="destructive" className="text-[10px]">MAX REACHED</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs">{vessel.vesselId}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Trips Assigned:</span>
                          <span className="font-bold">{vessel.assignedTripsCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Operating Hours:</span>
                          <span className="font-bold">{vessel.totalOperatingHours.toFixed(1)}h</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-8">
                <Button className="bg-primary text-white gap-2 px-10 py-6 text-lg">
                  Apply Optimized Schedule <CheckCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
