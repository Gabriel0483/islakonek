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
  Percent,
  Coins,
  Receipt,
  Calculator
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Banknote className="h-5 w-5 text-accent" />
          Fare Management
        </h1>
        {selectedRouteId && (
           <div className="bg-secondary/50 px-4 py-1.5 rounded-full border border-secondary flex items-center gap-2">
             <Coins className="h-4 w-4 text-accent" />
             <span className="text-[10px] font-black uppercase text-primary tracking-widest">Base: ₱{isMounted ? selectedRoute?.basePrice?.toLocaleString() : "---"}</span>
           </div>
        )}
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-4">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Pricing Scope
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4">
              <div className="max-w-md space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Active Maritime Route</Label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger className="h-12 bg-white border-2">
                    <SelectValue placeholder="Select a route to manage segment pricing" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes?.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Calculating Price Tables...</p>
          </div>
        ) : !selectedRouteId ? (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl opacity-40 flex flex-col items-center bg-white">
            <Waypoints className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">Select a Route</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Choose a route from the dropdown to configure demographics and final fares.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tight">{selectedRoute?.name}</h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Configuring {selectedRoute?.passengerSegments?.length || 0} Demographic Fares</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedRoute?.passengerSegments?.map((segment: any) => {
                const fare = routeFares?.find(f => f.segmentId === segment.id);
                return (
                  <Card key={segment.id} className="border-none shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white group">
                    <div className={cn("absolute top-0 left-0 w-full h-1.5", fare ? "bg-accent" : "bg-secondary")} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-black text-primary uppercase tracking-tight">{segment.label}</CardTitle>
                          {fare ? (
                            <Badge className="bg-green-600 text-white text-[8px] font-black uppercase h-4 px-1.5">Configured</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[8px] font-black uppercase h-4 px-1.5">Pending Setup</Badge>
                          )}
                        </div>
                        <div className="bg-secondary/30 p-2 rounded-xl group-hover:bg-accent group-hover:text-primary transition-colors">
                           <Receipt className="h-5 w-5 opacity-40" />
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {fare ? (
                        <div className="space-y-3 p-3 bg-secondary/5 rounded-2xl border-2 border-dashed">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-muted-foreground uppercase">Base Applied:</span>
                            <span className="text-primary font-black">₱{isMounted ? fare.baseFare?.toLocaleString() : "---"}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-muted-foreground uppercase">Discount:</span>
                            <span className="text-accent font-black">{fare.discountPercentage}% OFF</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-muted-foreground uppercase">VAT Status:</span>
                            <span className="text-primary font-black">{fare.isVatExempt ? "EXEMPT" : "12% APPLIED"}</span>
                          </div>
                          <Separator className="bg-secondary/20" />
                          <div className="flex justify-between items-end pt-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Final Fare</span>
                            <span className="text-2xl font-black text-primary">₱{isMounted ? fare.finalFare?.toLocaleString() : "---"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-secondary/10 rounded-2xl border-2 border-dashed">
                          <Info className="h-6 w-6 text-muted-foreground opacity-30" />
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 leading-relaxed">
                            System is using Route Default (₱{selectedRoute?.basePrice}). Click configure to apply rules.
                          </p>
                        </div>
                      )}
                      
                      <Button 
                        variant={fare ? "outline" : "default"} 
                        className={cn("w-full h-11 gap-2 font-black uppercase text-xs tracking-widest shadow-sm", !fare && "bg-primary text-white")}
                        onClick={() => handleOpenDialog(segment, fare)}
                      >
                        {fare ? <><Pencil className="h-3.5 w-3.5" /> Modify Rule</> : <><Plus className="h-3.5 w-3.5" /> Set Pricing</>}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {(!selectedRoute?.passengerSegments || selectedRoute.passengerSegments.length === 0) && (
              <div className="text-center py-20 bg-secondary/5 rounded-3xl border-2 border-dashed opacity-50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No segments defined for this route. Add demographics in Route Management.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Banknote className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">Configure: {formData.segmentLabel}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Set specific pricing rules for this demographic.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Coins className="h-4 w-4 text-accent" />
                   <Label className="text-[10px] font-black uppercase text-primary tracking-widest">1. Base Applied Fare (₱)</Label>
                </div>
                <Input 
                  type="number" 
                  value={formData.baseFare} 
                  onChange={(e) => setFormData({...formData, baseFare: Number(e.target.value)})}
                  className="h-12 font-black text-lg border-2"
                />
                <p className="text-[10px] text-muted-foreground font-bold italic">Route Base Price is ₱{selectedRoute?.basePrice}. Overrides here affect this segment only.</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Percent className="h-4 w-4 text-accent" />
                   <Label className="text-[10px] font-black uppercase text-primary tracking-widest">2. Select Discount Tier</Label>
                </div>
                <RadioGroup 
                  value={formData.discountPercentage.toString()} 
                  onValueChange={(val) => setFormData({...formData, discountPercentage: Number(val)})}
                  className="grid grid-cols-2 gap-4"
                >
                  {[0, 20, 50, 100].map((disc) => (
                    <Label 
                      key={disc}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        formData.discountPercentage === disc ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-secondary hover:border-primary/20 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={disc.toString()} id={`disc-${disc}`} />
                        <span className="font-black text-xs uppercase tracking-tight">
                          {disc === 0 ? "Standard" : `${disc}% DISCOUNT`}
                        </span>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground font-bold italic">Standard Student/Senior/PWD discount is 20% in the Philippines.</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Receipt className="h-4 w-4 text-accent" />
                   <Label className="text-[10px] font-black uppercase text-primary tracking-widest">3. Tax Compliance</Label>
                </div>
                <div className="flex items-center justify-between p-5 border-2 rounded-2xl bg-secondary/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase tracking-tight">VAT Exempt Status</Label>
                    <p className="text-[10px] text-muted-foreground font-bold">Toggle if this demographic is exempt from 12% VAT.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">{formData.isVatExempt ? "EXEMPT" : "12% VAT"}</span>
                    <Switch 
                      checked={formData.isVatExempt} 
                      onCheckedChange={(checked) => setFormData({...formData, isVatExempt: checked})}
                    />
                  </div>
                </div>
              </div>

              {/* LIVE CALCULATION PREVIEW */}
              {isMounted && (
                <div className="mt-8 p-6 bg-primary rounded-3xl text-primary-foreground relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Calculator className="h-32 w-32 -rotate-12 translate-x-8 translate-y-8" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em] border-b border-white/10 pb-2">Final Passenger Fare Preview</p>
                    
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold opacity-80">
                         <span>Net of Discount:</span>
                         <span>₱{isMounted ? (formData.baseFare * (1 - formData.discountPercentage / 100)).toLocaleString() : "---"}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold opacity-80">
                         <span>VAT {formData.isVatExempt ? "(Exempt)" : "(12%)"}:</span>
                         <span>₱{isMounted ? (formData.isVatExempt ? 0 : (formData.baseFare * (1 - formData.discountPercentage / 100) * 0.12)).toLocaleString() : "---"}</span>
                       </div>
                       <Separator className="bg-white/20" />
                       <div className="flex justify-between items-center pt-2">
                         <span className="font-black uppercase tracking-wider text-sm">Payable Amount:</span>
                         <span className="text-4xl font-black text-accent">₱{isMounted ? calculateFinalFare(formData.baseFare, formData.isVatExempt, formData.discountPercentage).toLocaleString() : "---"}</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-14 rounded-2xl border-2">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-primary text-white font-black uppercase text-xs h-14 rounded-2xl shadow-xl tracking-[0.2em]">
              <Check className="h-5 w-5 mr-2" /> {editingFare ? "Update Rule" : "Apply Pricing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
