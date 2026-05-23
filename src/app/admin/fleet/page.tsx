"use client";

import { useState, useMemo } from "react";
import { 
  Ship, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Anchor,
  Zap,
  ShieldCheck,
  Activity,
  History,
  Info,
  ChevronRight,
  Filter,
  Users
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  setDocumentNonBlocking,
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function FleetPage() {
  const db = useFirestore();
  
  const vesselsCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);

  const maintenanceCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "maintenance");
  }, [db]);
  
  const { data: vessels, isLoading: isVesselsLoading } = useCollection(vesselsCollection);
  const { data: maintenance, isLoading: isMaintenanceLoading } = useCollection(maintenanceCollection);

  const [search, setSearch] = useState("");
  const [isVesselDialogOpen, setIsVesselDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<any>(null);

  const [vesselFormData, setVesselFormData] = useState({
    name: "",
    type: "RoRo",
    passengerCapacity: 0,
    cargoCapacityTEU: 0,
    status: "Operational"
  });

  const [maintenanceFormData, setMaintenanceFormData] = useState({
    vesselId: "",
    description: "",
    scheduledDate: new Date().toISOString().split('T')[0],
    status: "Scheduled"
  });

  const filteredVessels = vessels?.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.type.toLowerCase().includes(search.toLowerCase())
  );

  const fleetStats = useMemo(() => {
    if (!vessels) return { total: 0, operational: 0, maintenance: 0, health: 0 };
    const total = vessels.length;
    const operational = vessels.filter(v => v.status === 'Operational').length;
    const maintenanceCount = vessels.filter(v => v.status === 'Maintenance').length;
    return {
      total,
      operational,
      maintenance: maintenanceCount,
      health: total > 0 ? Math.round((operational / total) * 100) : 0
    };
  }, [vessels]);

  const handleOpenVesselDialog = (vessel: any = null) => {
    if (vessel) {
      setEditingVessel(vessel);
      setVesselFormData({
        name: vessel.name,
        type: vessel.type,
        passengerCapacity: vessel.passengerCapacity || 0,
        cargoCapacityTEU: vessel.cargoCapacityTEU || 0,
        status: vessel.status
      });
    } else {
      setEditingVessel(null);
      setVesselFormData({
        name: "",
        type: "RoRo",
        passengerCapacity: 0,
        cargoCapacityTEU: 0,
        status: "Operational"
      });
    }
    setIsVesselDialogOpen(true);
  };

  const handleSaveVessel = () => {
    if (!db) return;
    const timestamp = new Date().toISOString();
    const payload = {
      ...vesselFormData,
      passengerCapacity: Number(vesselFormData.passengerCapacity),
      cargoCapacityTEU: Number(vesselFormData.cargoCapacityTEU),
      updatedAt: timestamp
    };

    if (editingVessel) {
      const vesselRef = doc(db, "vessels", editingVessel.id);
      updateDocumentNonBlocking(vesselRef, payload);
    } else {
      const newId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const vesselRef = doc(db, "vessels", newId);
      setDocumentNonBlocking(vesselRef, { ...payload, id: newId, createdAt: timestamp }, { merge: true });
    }
    setIsVesselDialogOpen(false);
  };

  const handleSaveMaintenance = () => {
    if (!db) return;
    const newId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const timestamp = new Date().toISOString();
    const maintenanceRef = doc(db, "maintenance", newId);
    
    setDocumentNonBlocking(maintenanceRef, {
      ...maintenanceFormData,
      id: newId,
      createdAt: timestamp
    }, { merge: true });

    if (maintenanceFormData.status === "In Progress") {
      const vesselRef = doc(db, "vessels", maintenanceFormData.vesselId);
      updateDocumentNonBlocking(vesselRef, { status: "Maintenance" });
    }

    setIsMaintenanceDialogOpen(false);
  };

  const handleDeleteVessel = (id: string) => {
    if (confirm("Are you sure you want to remove this vessel from the fleet registry? This action is permanent.")) {
      const vesselRef = doc(db, "vessels", id);
      deleteDocumentNonBlocking(vesselRef);
    }
  };

  const getVesselName = (id: string) => vessels?.find(v => v.id === id)?.name || "Unknown Vessel";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Operational": return <Badge className="bg-green-600 text-white gap-1.5 uppercase font-black text-[9px] h-5"><ShieldCheck className="h-3 w-3" /> Ready</Badge>;
      case "Maintenance": return <Badge className="bg-orange-500 text-white gap-1.5 uppercase font-black text-[9px] h-5"><Wrench className="h-3 w-3" /> In Shop</Badge>;
      case "Out of Service": return <Badge variant="destructive" className="gap-1.5 uppercase font-black text-[9px] h-5"><AlertCircle className="h-3 w-3" /> Off-Line</Badge>;
      default: return <Badge variant="outline" className="uppercase font-black text-[9px] h-5">{status}</Badge>;
    }
  };

  const isLoading = isVesselsLoading || isMaintenanceLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Ship className="h-5 w-5 text-accent" />
          Fleet Registry
        </h1>
        <div className="flex items-center gap-4">
           <div className="hidden sm:flex items-center gap-3 bg-secondary/50 px-4 py-1.5 rounded-full border">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Fleet Health: {fleetStats.health}%</span>
           </div>
           <Button onClick={() => handleOpenVesselDialog()} className="bg-accent text-primary font-black uppercase text-xs tracking-widest h-10 px-6 shadow-sm">
             <Plus className="h-4 w-4 mr-2" /> Add Vessel
           </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto">
        {/* OPERATIONAL SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Ship className="h-20 w-24" /></div>
              <CardHeader className="pb-2">
                 <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Total Fleet</p>
                 <CardTitle className="text-4xl font-black">{fleetStats.total}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-[10px] opacity-60">Registered Maritime Assets</p></CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-white border-2 border-green-600/10">
              <CardHeader className="pb-2">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Operational</p>
                 <CardTitle className="text-4xl font-black text-green-600">{fleetStats.operational}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-[10px] text-muted-foreground">Ready for Assignment</p></CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-white border-2 border-orange-500/10">
              <CardHeader className="pb-2">
                 <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Maintenance</p>
                 <CardTitle className="text-4xl font-black text-orange-600">{fleetStats.maintenance}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-[10px] text-muted-foreground">Scheduled or In-Progress</p></CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-accent text-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="h-24 w-24" /></div>
              <CardHeader className="pb-2">
                 <p className="text-[9px] font-black uppercase text-primary/70 tracking-widest">System Readiness</p>
                 <CardTitle className="text-4xl font-black">{fleetStats.health}%</CardTitle>
              </CardHeader>
              <CardContent><p className="text-[10px] text-primary/60 font-bold">Total Availability Score</p></CardContent>
           </Card>
        </div>

        <Tabs defaultValue="vessels" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="bg-secondary/50 p-1 rounded-xl h-11">
              <TabsTrigger value="vessels" className="data-[state=active]:bg-white rounded-lg gap-2 text-xs font-bold px-5">
                <Ship className="h-3.5 w-3.5" /> Fleet List
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-white rounded-lg gap-2 text-xs font-bold px-5">
                <History className="h-3.5 w-3.5" /> Service Log
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter vessels by name or type..." 
                  className="pl-10 h-11 bg-white border-none shadow-sm text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <TabsContent value="vessels">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Auditing Fleet Assets...</p>
              </div>
            ) : filteredVessels && filteredVessels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVessels.map((vessel) => (
                  <Card key={vessel.id} className="border-none shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white group">
                    <div className={cn("absolute top-0 left-0 w-full h-1.5", vessel.status === 'Operational' ? "bg-green-500" : "bg-orange-500")} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-black text-primary uppercase tracking-tight">{vessel.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                            <Anchor className="h-3.5 w-3.5 text-accent" /> {vessel.type} Class
                          </CardDescription>
                        </div>
                        {getStatusBadge(vessel.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/20 p-2.5 rounded-xl space-y-0.5 border border-transparent hover:border-accent/20 transition-all">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Max Capacity</p>
                          <p className="text-sm font-black text-primary flex items-center gap-1.5">
                             <Users className="h-3.5 w-3.5 text-accent" /> {vessel.passengerCapacity || 0} PAX
                          </p>
                        </div>
                        <div className="bg-secondary/20 p-2.5 rounded-xl space-y-0.5 border border-transparent hover:border-accent/20 transition-all">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Cargo Load</p>
                          <p className="text-sm font-black text-primary flex items-center gap-1.5">
                             <Zap className="h-3.5 w-3.5 text-accent" /> {vessel.cargoCapacityTEU || 0} TEU
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-dashed">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[9px] h-8 gap-2 font-black uppercase tracking-widest border-2 hover:bg-accent/10 hover:text-primary transition-all"
                          onClick={() => {
                            setMaintenanceFormData({
                              ...maintenanceFormData,
                              vesselId: vessel.id
                            });
                            setIsMaintenanceDialogOpen(true);
                          }}
                        >
                          <Wrench className="h-3 w-3" /> Schedule
                        </Button>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenVesselDialog(vessel)} className="h-8 w-8 p-0 hover:bg-primary/5 text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteVessel(vessel.id)} className="h-8 w-8 p-0 hover:bg-destructive/5 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 border-2 border-dashed rounded-3xl opacity-40 flex flex-col items-center bg-white">
                <Ship className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Vessels Registered</h3>
                <p className="text-sm mt-2 max-w-xs mx-auto">Start building your maritime network by registering your first fleet asset.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <ScrollArea className="h-[600px]">
                <div className="p-0">
                  {maintenance && maintenance.length > 0 ? (
                    <div className="divide-y divide-dashed">
                      {maintenance.sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((record: any) => (
                        <div key={record.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-secondary/5 transition-colors">
                          <div className={cn("sm:w-32 shrink-0 flex flex-col items-center justify-center text-center p-2 rounded-xl border border-dashed",
                             record.status === 'Completed' ? "bg-green-50 border-green-100 text-green-700" : "bg-orange-50 border-orange-100 text-orange-700")}>
                             <p className="text-[9px] font-black uppercase tracking-tighter mb-0.5">{record.scheduledDate}</p>
                             {record.status === 'Completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                             <p className="text-[8px] font-bold uppercase mt-0.5">{record.status}</p>
                          </div>
                          
                          <div className="flex-1 space-y-1">
                             <div className="flex items-center gap-2">
                                <h4 className="font-black text-primary uppercase text-sm">{getVesselName(record.vesselId)}</h4>
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1.5 opacity-50">#{record.id}</Badge>
                             </div>
                             <p className="text-xs text-muted-foreground leading-relaxed italic">"{record.description}"</p>
                             <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary/40 uppercase">
                                   <Activity className="h-3 w-3" /> Logged: {record.createdAt ? format(new Date(record.createdAt), "MMM dd, HH:mm") : "---"}
                                </div>
                             </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                             <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-primary gap-1.5">
                               Details <ChevronRight className="h-3 w-3" />
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-32 opacity-40 flex flex-col items-center">
                      <History className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Service History</h3>
                      <p className="text-sm mt-2 max-w-xs mx-auto">Asset maintenance logs will appear here once scheduled.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isVesselDialogOpen} onOpenChange={setIsVesselDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Ship className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingVessel ? "Edit Vessel Registry" : "New Vessel Induction"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Define technical specifications for the fleet asset.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <Info className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">1. Technical Identity</Label>
                  </div>
                  <div className="grid gap-6 bg-secondary/10 p-5 rounded-2xl border-2 border-dashed border-secondary/50">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Vessel Name</Label>
                        <Input 
                           value={vesselFormData.name} 
                           onChange={(e) => setVesselFormData({...vesselFormData, name: e.target.value.toUpperCase()})} 
                           placeholder="e.g. MV ISLAND VOYAGER"
                           className="h-11 font-black bg-white"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground">Vessel Type</Label>
                           <Select 
                              value={vesselFormData.type} 
                              onValueChange={(val) => setVesselFormData({...vesselFormData, type: val})}
                           >
                              <SelectTrigger className="h-11 font-bold bg-white">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                 {["RoRo", "FastCraft", "Cargo Ship", "Catamaran"].map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-1.5">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground">Status</Label>
                           <Select 
                              value={vesselFormData.status} 
                              onValueChange={(val) => setVesselFormData({...vesselFormData, status: val})}
                           >
                              <SelectTrigger className="h-11 font-bold bg-white">
                                 <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                 {["Operational", "Maintenance", "Out of Service"].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                     </div>
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <Activity className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">2. Load Specifications</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">PAX Capacity</Label>
                        <Input 
                           type="number"
                           value={vesselFormData.passengerCapacity} 
                           onChange={(e) => setVesselFormData({...vesselFormData, passengerCapacity: Number(e.target.value)})} 
                           className="h-11 font-black text-lg"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Cargo (TEU)</Label>
                        <Input 
                           type="number"
                           value={vesselFormData.cargoCapacityTEU} 
                           onChange={(e) => setVesselFormData({...vesselFormData, cargoCapacityTEU: Number(e.target.value)})} 
                           className="h-11 font-black text-lg"
                        />
                     </div>
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsVesselDialogOpen(false)} className="flex-1 font-bold h-12 rounded-xl">Cancel</Button>
            <Button onClick={handleSaveVessel} className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 rounded-xl shadow-lg tracking-widest">
               {editingVessel ? "Update Spec" : "Induct Vessel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-orange-600 text-white">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Wrench className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">Service Scheduler</DialogTitle>
                   <DialogDescription className="text-orange-100 text-xs">Flag asset for technical inspection or repair.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Asset Target</Label>
              <Select 
                value={maintenanceFormData.vesselId} 
                onValueChange={(val) => setMaintenanceFormData({...maintenanceFormData, vesselId: val})}
              >
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue placeholder="Select vessel from fleet" />
                </SelectTrigger>
                <SelectContent>
                  {vessels?.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Service Description</Label>
              <Input 
                value={maintenanceFormData.description} 
                onChange={(e) => setMaintenanceFormData({...maintenanceFormData, description: e.target.value})} 
                placeholder="e.g. Annual Engine Overhaul, Hull Sanding"
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scheduled Date</Label>
                <Input 
                  type="date"
                  value={maintenanceFormData.scheduledDate} 
                  onChange={(e) => setMaintenanceFormData({...maintenanceFormData, scheduledDate: e.target.value})} 
                  className="h-11 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Log Status</Label>
                <Select 
                  value={maintenanceFormData.status} 
                  onValueChange={(val) => setMaintenanceFormData({...maintenanceFormData, status: val})}
                >
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Scheduled", "In Progress", "Completed"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/5 gap-3">
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)} className="flex-1 font-bold h-12">Cancel</Button>
            <Button onClick={handleSaveMaintenance} className="flex-1 bg-orange-600 text-white font-black uppercase text-xs h-12 shadow-lg">
               Schedule Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
