"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Waypoints,
  ArrowRight,
  UserCheck,
  X,
  AlertCircle,
  Timer,
  Anchor,
  Navigation,
  MapPinned,
  Coins,
  CheckCircle2
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function RoutesPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const portsCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "ports");
  }, [db]);
  
  const routesCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);
  
  const { data: ports, isLoading: isPortsLoading } = useCollection(portsCollection);
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesCollection);

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const [formData, setFormData] = useState<any>({
    name: "",
    originPortId: "",
    destinationPortId: "",
    basePrice: 0,
    estimatedDurationMinutes: 0,
    rebookingFee: 0,
    cancellationFee: 0,
    noShowFee: 0,
    passengerSegments: []
  });

  const [newSegment, setNewSegment] = useState({ label: "" });

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    return routes.filter(route => 
      route.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [routes, search]);

  const handleOpenDialog = (route: any = null) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        name: route.name,
        originPortId: route.originPortId,
        destinationPortId: route.destinationPortId,
        basePrice: route.basePrice,
        estimatedDurationMinutes: route.estimatedDurationMinutes || 0,
        rebookingFee: route.rebookingFee || 0,
        cancellationFee: route.cancellationFee || 0,
        noShowFee: route.noShowFee || 0,
        passengerSegments: route.passengerSegments || []
      });
    } else {
      setEditingRoute(null);
      setFormData({
        name: "",
        originPortId: "",
        destinationPortId: "",
        basePrice: 0,
        estimatedDurationMinutes: 0,
        rebookingFee: 0,
        cancellationFee: 0,
        noShowFee: 0,
        passengerSegments: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleAddSegment = () => {
    if (!newSegment.label) return;
    const segments = [...formData.passengerSegments, { ...newSegment, id: Math.random().toString(36).substring(2, 9).toUpperCase() }];
    setFormData({ ...formData, passengerSegments: segments });
    setNewSegment({ label: "" });
  };

  const handleRemoveSegment = (id: string) => {
    const segments = formData.passengerSegments.filter((s: any) => s.id !== id);
    setFormData({ ...formData, passengerSegments: segments });
  };

  const handleSave = () => {
    if (!db || !formData.originPortId || !formData.destinationPortId) return;

    // Operational Validation: Prevent circular routes
    if (formData.originPortId === formData.destinationPortId) {
      alert("Validation Error: Origin and Destination ports cannot be the same.");
      return;
    }
    
    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      basePrice: Number(formData.basePrice),
      estimatedDurationMinutes: Number(formData.estimatedDurationMinutes),
      rebookingFee: Number(formData.rebookingFee),
      cancellationFee: Number(formData.cancellationFee),
      noShowFee: Number(formData.noShowFee)
    };

    if (editingRoute) {
      const routeRef = doc(db, "routes", editingRoute.id);
      updateDocumentNonBlocking(routeRef, {
        ...payload,
        updatedAt: timestamp
      });
    } else {
      const newId = Math.random().toString(36).substring(2, 11).toUpperCase();
      const routeRef = doc(db, "routes", newId);
      setDocumentNonBlocking(routeRef, {
        ...payload,
        id: newId,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this route? Schedules relying on this route may become inactive.")) {
      const routeRef = doc(db, "routes", id);
      deleteDocumentNonBlocking(routeRef);
    }
  };

  const getPortInfo = (id: string) => {
    const port = ports?.find(p => p.id === id);
    return {
      name: port?.name || "Unknown Port",
      code: port?.code || "TBA",
      province: port?.province || ""
    };
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const isLoading = isPortsLoading || isRoutesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-accent" />
          Route Management
        </h1>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-black uppercase text-xs tracking-widest h-10 px-6 shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Establish Route
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search shipping lanes..." 
              className="pl-10 h-11 bg-white border-none shadow-sm text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-3">
             <Navigation className="h-4 w-4 text-primary" />
             <p className="text-[10px] font-black uppercase text-primary tracking-widest">
               Active Network: {routes?.length || 0} Routes Configured
             </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mapping Shipping Lanes...</p>
          </div>
        ) : filteredRoutes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRoutes.map((route) => {
              const origin = getPortInfo(route.originPortId);
              const dest = getPortInfo(route.destinationPortId);
              return (
                <Card key={route.id} className="border-none shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-accent/20 group-hover:bg-accent transition-colors" />
                  
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                       <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg font-black text-primary uppercase tracking-tight leading-none mb-4">
                             {route.name}
                          </CardTitle>
                          
                          <div className="flex items-center gap-4">
                             <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                   <Badge variant="outline" className="text-[9px] font-black tracking-tighter h-4 px-1">{origin.code}</Badge>
                                   <p className="text-xs font-bold uppercase truncate">{origin.name}</p>
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase ml-11">{origin.province}</p>
                             </div>
                             <ArrowRight className="h-4 w-4 text-accent shrink-0" />
                             <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                   <Badge variant="outline" className="text-[9px] font-black tracking-tighter h-4 px-1">{dest.code}</Badge>
                                   <p className="text-xs font-bold uppercase truncate">{dest.name}</p>
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase ml-11">{dest.province}</p>
                             </div>
                          </div>
                       </div>
                       <div className="text-right ml-4">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Base Price</p>
                          <p className="text-2xl font-black text-primary">₱{isMounted ? route.basePrice?.toLocaleString() : "---"}</p>
                       </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       <div className="bg-secondary/20 p-2.5 rounded-xl space-y-0.5 border border-transparent hover:border-accent/20 transition-all">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">Duration</p>
                          <p className="text-xs font-black text-primary flex items-center gap-1.5">
                             <Timer className="h-3 w-3 text-accent" /> {formatDuration(route.estimatedDurationMinutes)}
                          </p>
                       </div>
                       <div className="bg-red-50/50 p-2.5 rounded-xl space-y-0.5 border border-red-100">
                          <p className="text-[8px] font-black text-red-600/60 uppercase tracking-wider">Rebook Fee</p>
                          <p className="text-xs font-black text-red-600 flex items-center gap-1.5">
                             <Coins className="h-3 w-3" /> ₱{route.rebookingFee || 0}
                          </p>
                       </div>
                       <div className="bg-orange-50/50 p-2.5 rounded-xl space-y-0.5 border border-orange-100">
                          <p className="text-[8px] font-black text-orange-600/60 uppercase tracking-wider">Cancel Fee</p>
                          <p className="text-xs font-black text-orange-600 flex items-center gap-1.5">
                             <Coins className="h-3 w-3" /> ₱{route.cancellationFee || 0}
                          </p>
                       </div>
                       <div className="bg-secondary/10 p-2.5 rounded-xl space-y-0.5 border border-secondary">
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-wider">No-Show</p>
                          <p className="text-xs font-black text-primary flex items-center gap-1.5 opacity-60">
                             <Coins className="h-3 w-3" /> ₱{route.noShowFee || 0}
                          </p>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap min-h-[24px]">
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mr-1">Demographics:</span>
                       {route.passengerSegments?.length > 0 ? route.passengerSegments.map((seg: any) => (
                         <Badge key={seg.id} variant="outline" className="text-[8px] font-black uppercase bg-accent/5 border-accent/20 px-1.5 h-4">
                           {seg.label}
                         </Badge>
                       )) : (
                         <span className="text-[8px] font-bold text-muted-foreground italic">None Defined</span>
                       )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-dashed">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(route)} className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Configure
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(route.id)} className="h-8 text-[10px] font-black uppercase text-destructive hover:bg-destructive/5">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl opacity-40 flex flex-col items-center bg-white">
            <Waypoints className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Routes Defined</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Establish your first shipping lane by connecting two registered terminals.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Waypoints className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingRoute ? "Modify Route" : "Establish New Route"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Configure pathing, duration, and financial rules.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
               {/* ROUTE IDENTITY */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <Navigation className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Routing Path</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/5 p-5 rounded-2xl border-2 border-dashed border-secondary/50">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Departure Terminal</Label>
                        <Select 
                          value={formData.originPortId} 
                          onValueChange={(val) => setFormData({...formData, originPortId: val})}
                        >
                          <SelectTrigger className="h-11 font-bold bg-white">
                            <SelectValue placeholder="Select Origin" />
                          </SelectTrigger>
                          <SelectContent>
                            {ports?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Arrival Terminal</Label>
                        <Select 
                          value={formData.destinationPortId} 
                          onValueChange={(val) => setFormData({...formData, destinationPortId: val})}
                        >
                          <SelectTrigger className="h-11 font-bold bg-white">
                            <SelectValue placeholder="Select Destination" />
                          </SelectTrigger>
                          <SelectContent>
                            {ports?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                     <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Official Route Name</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          placeholder="e.g. Batangas - Calapan FastCraft"
                          className="h-11 font-bold bg-white"
                        />
                     </div>
                  </div>
               </div>

               {/* PERFORMANCE & BASE PRICE */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-accent" /> Base Journey Fare (₱)
                     </Label>
                     <Input 
                        type="number"
                        value={formData.basePrice} 
                        onChange={(e) => setFormData({...formData, basePrice: e.target.value})} 
                        className="h-11 font-black text-lg"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-accent" /> Journey Time (Minutes)
                     </Label>
                     <Input 
                        type="number"
                        value={formData.estimatedDurationMinutes} 
                        onChange={(e) => setFormData({...formData, estimatedDurationMinutes: e.target.value})} 
                        className="h-11 font-black text-lg"
                     />
                  </div>
               </div>

               <Separator />

               {/* PENALTY CONFIGURATION */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2">
                     <AlertCircle className="h-4 w-4 text-destructive" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Financial Penalty Rules (₱)</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-4 bg-red-50/30 p-4 rounded-2xl border border-red-100">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-red-600/70">Rebooking</Label>
                        <Input 
                          type="number"
                          value={formData.rebookingFee} 
                          onChange={(e) => setFormData({...formData, rebookingFee: e.target.value})} 
                          className="h-9 font-bold bg-white border-red-200"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-orange-600/70">Cancellation</Label>
                        <Input 
                          type="number"
                          value={formData.cancellationFee} 
                          onChange={(e) => setFormData({...formData, cancellationFee: e.target.value})} 
                          className="h-9 font-bold bg-white border-orange-200"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">No-Show</Label>
                        <Input 
                          type="number"
                          value={formData.noShowFee} 
                          onChange={(e) => setFormData({...formData, noShowFee: e.target.value})} 
                          className="h-9 font-bold bg-white border-secondary"
                        />
                     </div>
                  </div>
               </div>

               {/* PASSENGER SEGMENTS */}
               <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                     <UserCheck className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Demographic Segments</Label>
                  </div>
                  <div className="bg-secondary/10 p-5 rounded-2xl space-y-5">
                     <div className="flex gap-3">
                        <Input 
                           placeholder="Add segment (e.g. Student, Senior)..." 
                           value={newSegment.label}
                           onChange={(e) => setNewSegment({...newSegment, label: e.target.value})}
                           className="h-10 bg-white"
                           onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSegment())}
                        />
                        <Button onClick={handleAddSegment} className="h-10 px-6 font-bold uppercase text-xs">Add</Button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {formData.passengerSegments.length > 0 ? formData.passengerSegments.map((seg: any) => (
                           <Badge key={seg.id} variant="secondary" className="pl-3 pr-1 py-1.5 gap-2 text-[10px] font-bold uppercase bg-white border-2">
                              {seg.label}
                              <button onClick={() => handleRemoveSegment(seg.id)} className="h-5 w-5 rounded-full hover:bg-red-50 text-destructive flex items-center justify-center">
                                 <X className="h-3 w-3" />
                              </button>
                           </Badge>
                        )) : (
                           <p className="text-[10px] text-muted-foreground italic py-2">No segments defined. Base price will apply to everyone.</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-12 rounded-xl">Cancel</Button>
            <Button 
               onClick={handleSave} 
               disabled={!formData.name || !formData.originPortId || !formData.destinationPortId}
               className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 rounded-xl shadow-lg tracking-widest"
            >
               {editingRoute ? "Save Configurations" : "Establish Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
