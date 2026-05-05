
"use client";

import { useState } from "react";
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
  Clock
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { 
  setDocumentNonBlocking,
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
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

export default function FleetPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const vesselsCollection = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "vessels");
  }, [db, user]);

  const maintenanceCollection = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "maintenance");
  }, [db, user]);
  
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
    if (!db || !vesselsCollection) return;
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
      const newId = Math.random().toString(36).substr(2, 9);
      const vesselRef = doc(db, "vessels", newId);
      setDocumentNonBlocking(vesselRef, { ...payload, id: newId, createdAt: timestamp }, { merge: true });
    }
    setIsVesselDialogOpen(false);
  };

  const handleSaveMaintenance = () => {
    if (!db || !maintenanceCollection) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date().toISOString();
    const maintenanceRef = doc(db, "maintenance", newId);
    
    setDocumentNonBlocking(maintenanceRef, {
      ...maintenanceFormData,
      id: newId,
      createdAt: timestamp
    }, { merge: true });

    // If maintenance is In Progress, update vessel status
    if (maintenanceFormData.status === "In Progress") {
      const vesselRef = doc(db, "vessels", maintenanceFormData.vesselId);
      updateDocumentNonBlocking(vesselRef, { status: "Maintenance" });
    }

    setIsMaintenanceDialogOpen(false);
  };

  const handleDeleteVessel = (id: string) => {
    if (confirm("Are you sure you want to remove this vessel from the fleet?")) {
      const vesselRef = doc(db, "vessels", id);
      deleteDocumentNonBlocking(vesselRef);
    }
  };

  const getVesselName = (id: string) => vessels?.find(v => v.id === id)?.name || "Unknown Vessel";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Operational": return <Badge className="bg-green-500 hover:bg-green-600">Operational</Badge>;
      case "Maintenance": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Maintenance</Badge>;
      case "Out of Service": return <Badge variant="destructive">Out of Service</Badge>;
      case "Completed": return <Badge className="bg-blue-500">Completed</Badge>;
      case "In Progress": return <Badge className="bg-yellow-500">In Progress</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = isUserLoading || isVesselsLoading || isMaintenanceLoading;

  return (
    <SidebarProvider>
      <OperatorSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Wrench className="h-5 w-5 text-accent" />
            Fleet & Maintenance
          </h1>
        </header>

        <main className="p-6 space-y-6">
          <Tabs defaultValue="vessels" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <TabsList className="bg-secondary/50 p-1">
                <TabsTrigger value="vessels" className="data-[state=active]:bg-white">Active Fleet</TabsTrigger>
                <TabsTrigger value="maintenance" className="data-[state=active]:bg-white">Maintenance Log</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search fleet..." 
                    className="pl-10 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => handleOpenVesselDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" /> Add Vessel
                </Button>
              </div>
            </div>

            <TabsContent value="vessels">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted-foreground">Inspecting fleet status...</p>
                </div>
              ) : filteredVessels && filteredVessels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVessels.map((vessel) => (
                    <Card key={vessel.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-lg font-bold text-primary">{vessel.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Ship className="h-3 w-3" /> {vessel.type}
                            </CardDescription>
                          </div>
                          {getStatusBadge(vessel.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-secondary/20 p-2 rounded">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Passengers</p>
                            <p className="font-bold">{vessel.passengerCapacity || 0}</p>
                          </div>
                          <div className="bg-secondary/20 p-2 rounded">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Cargo (TEU)</p>
                            <p className="font-bold">{vessel.cargoCapacityTEU || 0}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 gap-1.5"
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
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenVesselDialog(vessel)} className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteVessel(vessel.id)} className="h-8 w-8 p-0 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
                  <Ship className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold">No vessels recorded</h3>
                  <p className="text-muted-foreground">Start by adding your first vessel to the registry.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="maintenance">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <ScrollArea className="h-[600px]">
                  <div className="p-4 space-y-4">
                    {maintenance && maintenance.length > 0 ? (
                      maintenance.sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((record: any) => (
                        <div key={record.id} className="flex items-start gap-4 p-4 rounded-lg border bg-secondary/5 transition-colors hover:bg-secondary/10">
                          <div className={`p-2 rounded-full ${record.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {record.status === 'Completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-primary">{getVesselName(record.vesselId)}</h4>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {record.scheduledDate}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{record.description}</p>
                            <div className="pt-2">
                              {getStatusBadge(record.status)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 opacity-50">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p>No maintenance history available.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        <Dialog open={isVesselDialogOpen} onOpenChange={setIsVesselDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingVessel ? "Edit Vessel" : "Add New Vessel"}</DialogTitle>
              <DialogDescription>Define a vessel's technical specifications and status.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Vessel Name</Label>
                  <Input 
                    value={vesselFormData.name} 
                    onChange={(e) => setVesselFormData({...vesselFormData, name: e.target.value})} 
                    placeholder="e.g. MV Island Voyager"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vessel Type</Label>
                    <Select 
                      value={vesselFormData.type} 
                      onValueChange={(val) => setVesselFormData({...vesselFormData, type: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["RoRo", "FastCraft", "Cargo Ship", "Catamaran"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Status</Label>
                    <Select 
                      value={vesselFormData.status} 
                      onValueChange={(val) => setVesselFormData({...vesselFormData, status: val})}
                    >
                      <SelectTrigger>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Passenger Capacity</Label>
                    <Input 
                      type="number"
                      value={vesselFormData.passengerCapacity} 
                      onChange={(e) => setVesselFormData({...vesselFormData, passengerCapacity: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo Capacity (TEU)</Label>
                    <Input 
                      type="number"
                      value={vesselFormData.cargoCapacityTEU} 
                      onChange={(e) => setVesselFormData({...vesselFormData, cargoCapacityTEU: Number(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVesselDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveVessel} className="bg-primary text-white">Save Vessel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Maintenance</DialogTitle>
              <DialogDescription>Create a maintenance record for the selected vessel.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Vessel</Label>
                <Select 
                  value={maintenanceFormData.vesselId} 
                  onValueChange={(val) => setMaintenanceFormData({...maintenanceFormData, vesselId: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels?.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Maintenance Description</Label>
                <Input 
                  value={maintenanceFormData.description} 
                  onChange={(e) => setMaintenanceFormData({...maintenanceFormData, description: e.target.value})} 
                  placeholder="e.g. Engine Overhaul, Hull Cleaning"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input 
                    type="date"
                    value={maintenanceFormData.scheduledDate} 
                    onChange={(e) => setMaintenanceFormData({...maintenanceFormData, scheduledDate: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={maintenanceFormData.status} 
                    onValueChange={(val) => setMaintenanceFormData({...maintenanceFormData, status: val})}
                  >
                    <SelectTrigger>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveMaintenance} className="bg-primary text-white">Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
