"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Banknote, 
  Plus, 
  Pencil, 
  Loader2, 
  Waypoints,
  Info,
  Check,
  Percent
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  setDocumentNonBlocking,
  updateDocumentNonBlocking 
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function FaresPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const routesCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);
  
  const faresCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "fares");
  }, [db]);
  
  const { data: routes, isLoading: isRoutesLoading } = useCollection(routesCollection);
  const { data: fares, isLoading: isFaresLoading } = useCollection(faresCollection);

  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFare, setEditingFare] = useState<any>(null);

  const [formData, setFormData] = useState({
    segmentId: "",
    segmentLabel: "",
    baseFare: 0,
    isVatExempt: false,
    discountPercentage: 0
  });

  const selectedRoute = useMemo(() => 
    routes?.find(r => r.id === selectedRouteId), 
    [routes, selectedRouteId]
  );

  const routeFares = useMemo(() => 
    fares?.filter(f => f.routeId === selectedRouteId),
    [fares, selectedRouteId]
  );

  const calculateFinalFare = (base: number, isExempt: boolean, discount: number) => {
    const discounted = base * (1 - discount / 100);
    const vat = isExempt ? 0 : discounted * 0.12;
    return Math.round((discounted + vat) * 100) / 100;
  };

  const handleOpenDialog = (segment: any, existingFare: any = null) => {
    if (existingFare) {
      setEditingFare(existingFare);
      setFormData({
        segmentId: existingFare.segmentId,
        segmentLabel: existingFare.segmentLabel,
        baseFare: existingFare.baseFare,
        isVatExempt: existingFare.isVatExempt,
        discountPercentage: existingFare.discountPercentage
      });
    } else {
      setEditingFare(null);
      setFormData({
        segmentId: segment.id,
        segmentLabel: segment.label,
        baseFare: selectedRoute?.basePrice || 0,
        isVatExempt: false,
        discountPercentage: 0
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !selectedRouteId) return;
    
    const timestamp = new Date().toISOString();
    const finalFare = calculateFinalFare(
      Number(formData.baseFare), 
      formData.isVatExempt, 
      Number(formData.discountPercentage)
    );

    const payload = {
      ...formData,
      routeId: selectedRouteId,
      baseFare: Number(formData.baseFare),
      discountPercentage: Number(formData.discountPercentage),
      vatRate: formData.isVatExempt ? 0 : 0.12,
      finalFare,
      updatedAt: timestamp
    };

    if (editingFare) {
      const fareRef = doc(db, "fares", editingFare.id);
      updateDocumentNonBlocking(fareRef, payload);
    } else {
      const fareId = `${selectedRouteId}_${formData.segmentId}`;
      const fareRef = doc(db, "fares", fareId);
      setDocumentNonBlocking(fareRef, { ...payload, id: fareId }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const isLoading = isRoutesLoading || isFaresLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Banknote className="h-5 w-5 text-accent" />
          Fare Management
        </h1>
      </header>

      <main className="p-6 space-y-6 container mx-auto">
        <section className="max-w-md space-y-2">
          <Label>Select Route to Manage Fares</Label>
          <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
            <SelectTrigger className="h-12 bg-white">
              <SelectValue placeholder="Select a maritime route" />
            </SelectTrigger>
            <SelectContent>
              {routes?.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Calculating fare structures...</p>
          </div>
        ) : !selectedRouteId ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
            <Waypoints className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold">Select a route to begin</h3>
            <p className="text-muted-foreground">Choose a route from the dropdown to configure segment-based pricing.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold font-headline">{selectedRoute?.name}</h2>
                <p className="text-muted-foreground">Base Route Price: ₱{isMounted ? selectedRoute?.basePrice?.toLocaleString() : "---"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedRoute?.passengerSegments?.map((segment: any) => {
                const fare = routeFares?.find(f => f.segmentId === segment.id);
                return (
                  <Card key={segment.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                    <div className="h-2 bg-accent/20" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">{segment.label}</CardTitle>
                        {fare && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Configured</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fare ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="font-bold">{fare.discountPercentage}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">VAT Status:</span>
                            <span className="font-bold">{fare.isVatExempt ? "Exempt" : "12% Applied"}</span>
                          </div>
                          <div className="pt-3 border-t">
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs font-bold text-muted-foreground uppercase">Final Fare</span>
                              <span className="text-xl font-extrabold text-primary">₱{isMounted ? fare.finalFare?.toLocaleString() : "---"}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center gap-2 bg-secondary/20 rounded-lg">
                          <Info className="h-5 w-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground px-4">No fare rules configured for this segment.</p>
                        </div>
                      )}
                      
                      <Button 
                        variant={fare ? "outline" : "default"} 
                        className={`w-full gap-2 ${!fare ? 'bg-primary text-white' : ''}`}
                        onClick={() => handleOpenDialog(segment, fare)}
                      >
                        {fare ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {fare ? "Edit Fare Rule" : "Configure Fare"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {(!selectedRoute?.passengerSegments || selectedRoute.passengerSegments.length === 0) && (
              <div className="text-center py-20 bg-secondary/10 rounded-xl border border-dashed">
                <p className="text-muted-foreground">No segments defined for this route. Go to Route Management to add demographics.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure Fare: {formData.segmentLabel}</DialogTitle>
            <DialogDescription>
              Set the pricing rules for this demographic segment.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-8 py-4">
              <div className="space-y-3">
                <Label htmlFor="baseFare">Base Segment Fare (₱)</Label>
                <Input 
                  id="baseFare" 
                  type="number" 
                  value={formData.baseFare} 
                  onChange={(e) => setFormData({...formData, baseFare: Number(e.target.value)})}
                />
                <p className="text-[10px] text-muted-foreground">Typically inherits the Route base price (₱{selectedRoute?.basePrice}).</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>VAT Status</Label>
                    <p className="text-[10px] text-muted-foreground">Toggle for 12% VAT or VAT Exempt status.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">{formData.isVatExempt ? "Exempt" : "12% VAT"}</span>
                    <Switch 
                      checked={formData.isVatExempt} 
                      onCheckedChange={(checked) => setFormData({...formData, isVatExempt: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-accent" /> Standard Discount Tiers
                </Label>
                <RadioGroup 
                  value={formData.discountPercentage.toString()} 
                  onValueChange={(val) => setFormData({...formData, discountPercentage: Number(val)})}
                  className="grid grid-cols-2 gap-4"
                >
                  {[0, 20, 50, 100].map((disc) => (
                    <Label 
                      key={disc}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.discountPercentage === disc ? 'border-accent bg-accent/5' : 'border-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={disc.toString()} id={`disc-${disc}`} />
                        <span className="font-bold">{disc === 0 ? "Standard" : `${disc}% Off`}</span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {isMounted && (
                <div className="mt-4 p-6 bg-primary rounded-xl text-primary-foreground space-y-2">
                  <div className="flex justify-between text-xs opacity-70">
                    <span>Subtotal:</span>
                    <span>₱{isMounted ? (formData.baseFare * (1 - formData.discountPercentage / 100)).toLocaleString() : "---"}</span>
                  </div>
                  <div className="flex justify-between text-xs opacity-70">
                    <span>VAT {formData.isVatExempt ? "(Exempt)" : "(12%)"}:</span>
                    <span>₱{isMounted ? (formData.isVatExempt ? 0 : (formData.baseFare * (1 - formData.discountPercentage / 100) * 0.12)).toLocaleString() : "---"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-primary-foreground/20">
                    <span className="font-bold">Final Passenger Fare:</span>
                    <span className="text-2xl font-black">₱{isMounted ? calculateFinalFare(formData.baseFare, formData.isVatExempt, formData.discountPercentage).toLocaleString() : "---"}</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-white">
              <Check className="h-4 w-4 mr-2" /> {editingFare ? "Update Fare Rule" : "Apply Fare Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
