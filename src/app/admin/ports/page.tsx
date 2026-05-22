"use client";

import { useState, useMemo } from "react";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Anchor,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Waypoints,
  Globe,
  Compass,
  Building2,
  Navigation,
  Check,
  X
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function PortsPage() {
  const db = useFirestore();
  
  const portsCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "ports");
  }, [db]);

  const routesCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);
  
  const { data: ports, isLoading: isPortsLoading } = useCollection(portsCollection);
  const { data: routes } = useCollection(routesCollection);

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    cityMunicipality: "",
    province: "",
    country: "Philippines",
    description: "",
    status: "Operational" as "Operational" | "Suspended",
    coordinates: {
      lat: "",
      lng: ""
    }
  });

  const filteredPorts = useMemo(() => {
    if (!ports) return [];
    return ports.filter(port => 
      port.name.toLowerCase().includes(search.toLowerCase()) ||
      port.code?.toLowerCase().includes(search.toLowerCase()) ||
      port.province.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [ports, search]);

  const getConnectionsCount = (portId: string) => {
    if (!routes) return 0;
    return routes.filter(r => r.originPortId === portId || r.destinationPortId === portId).length;
  };

  const handleOpenDialog = (port: any = null) => {
    if (port) {
      setEditingPort(port);
      setFormData({
        name: port.name,
        code: port.code || "",
        cityMunicipality: port.cityMunicipality || "",
        province: port.province || "",
        country: port.country || "Philippines",
        description: port.description || "",
        status: port.status || "Operational",
        coordinates: {
          lat: port.coordinates?.lat || "",
          lng: port.coordinates?.lng || ""
        }
      });
    } else {
      setEditingPort(null);
      setFormData({
        name: "",
        code: "",
        cityMunicipality: "",
        province: "",
        country: "Philippines",
        description: "",
        status: "Operational",
        coordinates: {
          lat: "",
          lng: ""
        }
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !formData.name || !formData.code) return;
    
    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      code: formData.code.toUpperCase(),
      updatedAt: timestamp
    };

    if (editingPort) {
      const portRef = doc(db, "ports", editingPort.id);
      updateDocumentNonBlocking(portRef, payload);
    } else {
      const newId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const portRef = doc(db, "ports", newId);
      setDocumentNonBlocking(portRef, {
        ...payload,
        id: newId,
        createdAt: timestamp
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to permanently remove this port from the registry? This may break existing routes.")) {
      const portRef = doc(db, "ports", id);
      deleteDocumentNonBlocking(portRef);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Anchor className="h-5 w-5 text-accent" />
          Port Registry
        </h1>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-black uppercase text-xs tracking-widest h-10 px-6 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Register Terminal
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, province, or code..." 
              className="pl-10 h-11 bg-white border-none shadow-sm text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3">
             <Activity className="h-4 w-4 text-primary" />
             <p className="text-[10px] font-black uppercase text-primary tracking-widest">
               Database: {ports?.length || 0} Registered Hubs
             </p>
          </div>
        </div>

        {isPortsLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Maritime Registry...</p>
          </div>
        ) : filteredPorts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPorts.map((port) => {
              const connections = getConnectionsCount(port.id);
              return (
                <Card key={port.id} className={cn("border-none shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white group", port.status === 'Suspended' && "opacity-75")}>
                  <div className={cn("absolute top-0 left-0 w-full h-1.5", port.status === 'Operational' ? "bg-green-500" : "bg-destructive")} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-secondary/50 border-secondary">
                             {port.code || 'TBA'}
                           </Badge>
                           {port.status === 'Operational' ? (
                             <Badge className="bg-green-500/10 text-green-700 border-none h-5 px-1.5 gap-1 text-[8px] font-black uppercase">
                               <ShieldCheck className="h-2.5 w-2.5" /> Operational
                             </Badge>
                           ) : (
                             <Badge className="bg-destructive/10 text-destructive border-none h-5 px-1.5 gap-1 text-[8px] font-black uppercase">
                               <ShieldAlert className="h-2.5 w-2.5" /> Suspended
                             </Badge>
                           )}
                        </div>
                        <CardTitle className="text-lg font-black text-primary uppercase tracking-tight leading-tight mt-2">
                          {port.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted-foreground">
                          <MapPin className="h-3 w-3 text-accent" /> {port.cityMunicipality}, {port.province}
                        </CardDescription>
                      </div>
                      <div className="bg-secondary/30 p-2 rounded-xl group-hover:bg-accent group-hover:text-primary transition-colors">
                        <Building2 className="h-5 w-5 opacity-40" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-secondary/20 p-2.5 rounded-xl space-y-0.5">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Connections</p>
                          <p className="text-sm font-black text-primary flex items-center gap-1.5">
                             <Waypoints className="h-3.5 w-3.5 text-accent" /> {connections} Routes
                          </p>
                       </div>
                       <div className="bg-secondary/20 p-2.5 rounded-xl space-y-0.5">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Region</p>
                          <p className="text-sm font-black text-primary flex items-center gap-1.5 truncate">
                             <Globe className="h-3.5 w-3.5 text-accent" /> {port.country}
                          </p>
                       </div>
                    </div>

                    <div className="space-y-1">
                       <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Operational Context</p>
                       <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                         {port.description || "No specific facility notes provided."}
                       </p>
                    </div>

                    {port.coordinates?.lat && (
                       <div className="flex items-center gap-2 text-[9px] font-bold text-primary/40 uppercase bg-secondary/10 px-2 py-1 rounded-md w-fit">
                          <Navigation className="h-2.5 w-2.5" /> {port.coordinates.lat}, {port.coordinates.lng}
                       </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-dashed">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(port)} className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(port.id)} className="h-8 text-[10px] font-black uppercase text-destructive hover:bg-destructive/5">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl opacity-40 flex flex-col items-center bg-white">
            <Anchor className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Port Entries Found</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Establish your maritime network by registering your first terminal.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Anchor className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingPort ? "Edit Terminal" : "New Terminal Registry"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Define a port of departure or arrival.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Port Name</Label>
                     <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        placeholder="e.g. Port of Batangas"
                        className="h-11 font-bold"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Port Code</Label>
                     <Input 
                        value={formData.code} 
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                        placeholder="e.g. BTG"
                        maxLength={5}
                        className="h-11 font-black text-accent"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">City / Municipality</Label>
                     <Input 
                        value={formData.cityMunicipality} 
                        onChange={(e) => setFormData({...formData, cityMunicipality: e.target.value})} 
                        className="h-11"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Province</Label>
                     <Input 
                        value={formData.province} 
                        onChange={(e) => setFormData({...formData, province: e.target.value})} 
                        className="h-11"
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Operational Status</Label>
                     <Select 
                        value={formData.status} 
                        onValueChange={(val: any) => setFormData({...formData, status: val})}
                     >
                        <SelectTrigger className="h-11 font-bold">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Operational">
                              <div className="flex items-center gap-2">
                                 <div className="h-2 w-2 rounded-full bg-green-500" /> Operational
                              </div>
                           </SelectItem>
                           <SelectItem value="Suspended">
                              <div className="flex items-center gap-2">
                                 <div className="h-2 w-2 rounded-full bg-destructive" /> Suspended / Closed
                              </div>
                           </SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Country</Label>
                     <Input 
                        value={formData.country} 
                        onChange={(e) => setFormData({...formData, country: e.target.value})} 
                        className="h-11 font-bold"
                     />
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <Compass className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Geospatial Data (Optional)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-xl border border-dashed">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Latitude</Label>
                        <Input 
                           value={formData.coordinates.lat} 
                           onChange={(e) => setFormData({...formData, coordinates: {...formData.coordinates, lat: e.target.value}})} 
                           placeholder="13.754"
                           className="h-9 text-xs"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Longitude</Label>
                        <Input 
                           value={formData.coordinates.lng} 
                           onChange={(e) => setFormData({...formData, coordinates: {...formData.coordinates, lng: e.target.value}})} 
                           placeholder="121.053"
                           className="h-9 text-xs"
                        />
                     </div>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Facility Description</Label>
                  <Textarea 
                     value={formData.description} 
                     onChange={(e) => setFormData({...formData, description: e.target.value})} 
                     placeholder="Brief details about port facilities, docking berths, or terminal specific notes..."
                     className="min-h-[120px] text-sm p-4 border-2"
                  />
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-12 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 rounded-xl shadow-lg tracking-widest">
               {editingPort ? "Apply Changes" : "Register Port"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
