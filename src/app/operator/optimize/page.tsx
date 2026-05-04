"use client";

import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, Ship, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
import { optimizeSchedule, AIScheduleOptimizationOutput } from "@/ai/flows/ai-schedule-optimization-tool";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Mock data for initial state
const MOCK_INPUT = {
  existingSchedule: [
    {
      routeId: "R-001",
      routeName: "Manila-Cebu",
      origin: "Manila North Harbor",
      destination: "Cebu Pier 1",
      scheduledDeparture: new Date(Date.now() + 86400000).toISOString(),
      scheduledArrival: new Date(Date.now() + 86400000 + 79200000).toISOString(),
      vesselTypeRequired: "RoRo",
      currentVesselId: "V-101",
      expectedDurationHours: 22,
    },
    {
      routeId: "R-002",
      routeName: "Iloilo-Bacolod",
      origin: "Iloilo Port",
      destination: "Bacolod Port",
      scheduledDeparture: new Date(Date.now() + 43200000).toISOString(),
      scheduledArrival: new Date(Date.now() + 43200000 + 5400000).toISOString(),
      vesselTypeRequired: "FastCraft",
      currentVesselId: "V-201",
      expectedDurationHours: 1.5,
    }
  ],
  availableVessels: [
    {
      vesselId: "V-101",
      vesselName: "MV Oceanic Express",
      type: "RoRo",
      passengerCapacity: 1200,
      cargoCapacityTEU: 45,
      currentLocation: "Manila",
      availableFrom: new Date().toISOString()
    },
    {
      vesselId: "V-201",
      vesselName: "FastJet 1",
      type: "FastCraft",
      passengerCapacity: 350,
      cargoCapacityTEU: 0,
      currentLocation: "Iloilo",
      availableFrom: new Date().toISOString()
    },
    {
      vesselId: "V-102",
      vesselName: "MV Sea Titan",
      type: "RoRo",
      passengerCapacity: 1500,
      cargoCapacityTEU: 60,
      currentLocation: "Manila",
      availableFrom: new Date().toISOString()
    }
  ],
  demandForecast: [
    { routeId: "R-001", date: new Date().toISOString().split('T')[0], passengerDemand: 1350, cargoDemandTEU: 50 },
    { routeId: "R-002", date: new Date().toISOString().split('T')[0], passengerDemand: 300, cargoDemandTEU: 0 }
  ],
  weatherForecast: [
    { location: "Manila", date: new Date().toISOString().split('T')[0], conditions: "clear", windSpeedKts: 10 },
    { location: "Visayas", date: new Date().toISOString().split('T')[0], conditions: "storm", windSpeedKts: 35, waveHeightMeters: 2.5 }
  ],
  operationalConstraints: ["Vessels cannot depart if wave height exceeds 2.5m", "V-101 is scheduled for minor engine check in 3 days"]
};

export default function OptimizePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIScheduleOptimizationOutput | null>(null);

  async function handleOptimize() {
    setLoading(true);
    try {
      const output = await optimizeSchedule(MOCK_INPUT);
      setResult(output);
    } catch (error) {
      console.error("Optimization failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SidebarProvider>
      <OperatorSidebar />
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
                disabled={loading}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Input Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Active Routes:</span> <span className="font-bold">2</span></div>
                  <div className="flex justify-between"><span>Available Vessels:</span> <span className="font-bold">3</span></div>
                  <div className="flex justify-between"><span>Demand Surge detected:</span> <Badge variant="secondary" className="text-green-600 bg-green-50">Yes</Badge></div>
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Environmental Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Storm Advisory:</span> <span className="font-bold">Visayas Region</span></div>
                  <div className="flex justify-between"><span>Avg Wave Height:</span> <span className="font-bold">1.2m</span></div>
                  <div className="flex justify-between"><span>Peak Wind Speed:</span> <span className="font-bold">35kts</span></div>
                </CardContent>
              </Card>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Rationale Card */}
              <Card className="bg-primary text-primary-foreground border-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    AI Rationale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-primary-foreground/90">{result.optimizationRationale}</p>
                </CardContent>
              </Card>

              {/* Warnings */}
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

              {/* Optimized Schedule Table */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold font-headline">Proposed Schedule</h3>
                <div className="grid grid-cols-1 gap-4">
                  {result.optimizedSchedule.map((trip) => (
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
                                <span className="font-medium">{new Date(trip.optimizedDeparture).toLocaleString()}</span>
                              </div>
                              <p className="text-sm">{trip.origin}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Arrival</p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-accent" />
                                <span className="font-medium">{new Date(trip.optimizedArrival).toLocaleString()}</span>
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
                             <Badge variant="outline" className="bg-white">{trip.assignedVesselId}</Badge>
                             <span className="text-xs text-muted-foreground">Assigned Vessel</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Vessel Summaries */}
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