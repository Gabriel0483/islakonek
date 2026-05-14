"use client";

import { useState, useEffect } from "react";
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
  AlertCircle
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

  const filteredRoutes = routes?.filter(route => 
    route.name.toLowerCase().includes(search.toLowerCase())
  );

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
    const segments = [...formData.passengerSegments, { ...newSegment, id: Math.random().toString(36).substring(2, 9) }];
    setFormData({ ...formData, passengerSegments: segments });
    setNewSegment({ label: "" });
  };

  const handleRemoveSegment = (id: string) => {
    const segments = formData.passengerSegments.filter((s: any) => s.id !== id);
    setFormData({ ...formData, passengerSegments: segments });
  };

  const handleSave = () => {
    if (!db) return;
    
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
      const newId = Math.random().toString(36).substring(2, 11);
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
    if (confirm("Are you sure you want to delete this route?")) {
      const routeRef = doc(db, "routes", id);
      deleteDocumentNonBlocking(routeRef);
    }
  };

  const getPortName = (id: string) => ports?.find(p => p.id === id)?.name || "Unknown Port";

  const isLoading = isPortsLoading || isRoutesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-accent" />
          Route Management
        </h1>
      </header>

      <main className="p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search routes by name..." 
              className="pl-10 h-12 bg-white border-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90 h-12 px-6">
            <Plus className="h-4 w-4 mr-2" /> Create New Route
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Synchronizing maritime routes...</p>
          </div>
        ) : filteredRoutes && filteredRoutes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRoutes.map((route) => (
              <Card key={route.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-primary">{route.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm font-medium">
                        {getPortName(route.originPortId)} 
                        <ArrowRight className="h-3 w-3 text-accent" /> 
                        {getPortName(route.destinationPortId)}
                      </CardDescription>
                    </div>
                    <div className="bg-secondary px-3 py-1 rounded-full text-xs font-bold text-primary">
                      ₱{isMounted ? route.basePrice?.toLocaleString() : "---"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 py-2">
                     <div className="p-2 rounded bg-red-50 border border-red-100 text-center">
                        <p className="text-[9px] uppercase font-bold text-red-600">Rebook</p>
                        <p className="text-xs font-black">₱{route.rebookingFee || 0}</p>
                     </div>
                     <div className="p-2 rounded bg-orange-50 border border-orange-100 text-center">
                        <p className="text-[9px] uppercase font-bold text-orange-600">Cancel</p>
                        <p className="text-xs font-black">₱{route.cancellationFee || 0}</p>
                     </div>
                     <div className="p-2 rounded bg-slate-50 border border-slate-200 text-center">
                        <p className="text-[9px] uppercase font-bold text-slate-600">No-Show</p>
                        <p className="text-xs font-black">₱{route.noShowFee || 0}</p>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {route.passengerSegments?.map((seg: any) => (
                      <Badge key={seg.id} variant="outline" className="text-[10px] bg-accent/5 border-accent/20">
                        {seg.label}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                     <span className="text-xs text-muted-foreground">
                       Duration: {Math.floor(route.estimatedDurationMinutes / 60)}h {route.estimatedDurationMinutes % 60}m
                     </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(route)} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(route.id)} className="h-8 w-8 p-0 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
            <Waypoints className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold">No routes defined</h3>
            <p className="text-muted-foreground">Establish your first shipping route connecting two ports.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Create New Route"}</DialogTitle>
            <DialogDescription>
              Define journey details, passenger demographics, and penalty fees.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Route Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Manila - Cebu Express"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin Port</Label>
                  <Select 
                    value={formData.originPortId} 
                    onValueChange={(val) => setFormData({...formData, originPortId: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {ports?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination Port</Label>
                  <Select 
                    value={formData.destinationPortId} 
                    onValueChange={(val) => setFormData({...formData, destinationPortId: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {ports?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Fare (₱)</Label>
                  <Input 
                    id="basePrice" 
                    type="number"
                    value={formData.basePrice} 
                    onChange={(e) => setFormData({...formData, basePrice: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (Minutes)</Label>
                  <Input 
                    id="duration" 
                    type="number"
                    value={formData.estimatedDurationMinutes} 
                    onChange={(e) => setFormData({...formData, estimatedDurationMinutes: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-4 border pt-4 p-4 rounded-lg bg-red-50/30">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <Label className="font-bold">Penalty Configurations (₱)</Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rebook" className="text-[10px] uppercase text-muted-foreground font-bold">Rebooking Fee</Label>
                    <Input 
                      id="rebook" 
                      type="number"
                      value={formData.rebookingFee} 
                      onChange={(e) => setFormData({...formData, rebookingFee: e.target.value})} 
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancel" className="text-[10px] uppercase text-muted-foreground font-bold">Cancellation Fee</Label>
                    <Input 
                      id="cancel" 
                      type="number"
                      value={formData.cancellationFee} 
                      onChange={(e) => setFormData({...formData, cancellationFee: e.target.value})} 
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noshow" className="text-[10px] uppercase text-muted-foreground font-bold">No-Show Fee</Label>
                    <Input 
                      id="noshow" 
                      type="number"
                      value={formData.noShowFee} 
                      onChange={(e) => setFormData({...formData, noShowFee: e.target.value})} 
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-accent" />
                  <Label className="font-bold">Passenger Demographics</Label>
                </div>
                
                <div className="bg-secondary/30 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Demographic Label</Label>
                      <Input 
                        placeholder="e.g. Student" 
                        value={newSegment.label}
                        onChange={(e) => setNewSegment({...newSegment, label: e.target.value})}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button onClick={handleAddSegment} className="h-8 bg-primary text-white">Add</Button>
                  </div>

                  <div className="space-y-2">
                    {formData.passengerSegments.map((seg: any) => (
                      <div key={seg.id} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                        <span>{seg.label}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveSegment(seg.id)} className="h-6 w-6 p-0 text-destructive">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-white">
              {editingRoute ? "Save Changes" : "Create Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
