"use client";

import { useState, useMemo } from "react";
import { 
  Megaphone, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Globe,
  Cloud,
  Wrench,
  Waypoints,
  FileText,
  Check
} from "lucide-react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const CATEGORIES = ["Weather", "Service Disruption", "Route/Fare Change", "General Information"];
const SEVERITIES = ["Low", "Medium", "High"];

export default function AdvisoriesManagementPage() {
  const db = useFirestore();
  
  const advisoriesRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "advisories");
  }, [db]);
  
  const { data: advisories, isLoading: isAdvisoriesLoading } = useCollection(advisoriesRef);

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdvisory, setEditingAdvisory] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "General Information",
    severity: "Low",
    isActive: true
  });

  const isFormValid = formData.title.trim().length > 0 && formData.content.trim().length > 0;

  const filteredAdvisories = advisories?.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => {
     const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
     const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
     return dateB - dateA;
  });

  const handleOpenDialog = (advisory: any = null) => {
    if (advisory) {
      setEditingAdvisory(advisory);
      setFormData({
        title: advisory.title,
        content: advisory.content,
        category: advisory.category,
        severity: advisory.severity,
        isActive: advisory.isActive !== undefined ? advisory.isActive : true
      });
    } else {
      setEditingAdvisory(null);
      setFormData({
        title: "",
        content: "",
        category: "General Information",
        severity: "Low",
        isActive: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !isFormValid) return;
    
    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      updatedAt: timestamp
    };

    if (editingAdvisory) {
      updateDocumentNonBlocking(doc(db, "advisories", editingAdvisory.id), payload);
    } else {
      const newId = Math.random().toString(36).substring(2, 11).toUpperCase();
      setDocumentNonBlocking(doc(db, "advisories", newId), { 
        ...payload, 
        id: newId, 
        createdAt: timestamp 
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to permanently remove this public advisory?")) {
      deleteDocumentNonBlocking(doc(db, "advisories", id));
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Weather': return <Cloud className="h-4 w-4" />;
      case 'Service Disruption': return <AlertTriangle className="h-4 w-4" />;
      case 'Route/Fare Change': return <Waypoints className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'High': return <Badge className="bg-destructive text-destructive-foreground">Critical</Badge>;
      case 'Medium': return <Badge className="bg-orange-500 text-white">Advisory</Badge>;
      default: return <Badge variant="secondary">Notice</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-accent" />
          Public Advisories
        </h1>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold h-10 px-4">
          <Plus className="h-4 w-4 mr-2" /> New Broadcast
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search active broadcasts..." 
              className="pl-10 h-11 bg-white border-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-3">
             <Globe className="h-5 w-5 text-blue-600" />
             <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">
               Live Sync: All active advisories are broadcasted to travelers instantly.
             </p>
          </div>
        </div>

        {isAdvisoriesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Retrieving Bulletins...</p>
          </div>
        ) : filteredAdvisories && filteredAdvisories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAdvisories.map((advisory) => (
              <Card key={advisory.id} className={cn("border-none shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-white", !advisory.isActive && "opacity-60")}>
                <div className={cn("absolute top-0 left-0 w-full h-1", 
                  advisory.severity === 'High' ? "bg-destructive" : advisory.severity === 'Medium' ? "bg-orange-500" : "bg-primary")} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="text-[9px] uppercase font-black bg-secondary/30 flex items-center gap-1">
                          {getCategoryIcon(advisory.category)} {advisory.category}
                       </Badge>
                       {getSeverityBadge(advisory.severity)}
                    </div>
                    {!advisory.isActive && <Badge variant="outline" className="text-[9px] font-black uppercase">Draft/Hidden</Badge>}
                  </div>
                  <CardTitle className="text-lg font-bold text-primary leading-tight">{advisory.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase mt-1">
                     <Calendar className="h-3 w-3" /> Updated {advisory.updatedAt ? format(new Date(advisory.updatedAt), "MMM dd, HH:mm") : "Just now"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {advisory.content}
                  </p>
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(advisory)} className="h-8 text-[10px] font-black uppercase text-primary">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(advisory.id)} className="h-8 text-[10px] font-black uppercase text-destructive">
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-secondary/5 opacity-50 flex flex-col items-center">
            <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-primary uppercase">No Active Advisories</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Click "New Broadcast" to inform travelers about weather, disruptions, or route changes.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Megaphone className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingAdvisory ? "Edit Broadcast" : "New Public Broadcast"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Information will be published live to travelers.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 h-full">
            <div className="p-6 space-y-8">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Broadcast Category</Label>
                  <div className="grid grid-cols-2 gap-2">
                     {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, category: cat})}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 text-left",
                            formData.category === cat 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-secondary bg-white text-muted-foreground hover:border-primary/20"
                          )}
                        >
                           {getCategoryIcon(cat)} {cat}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Urgency Level</Label>
                     <Select value={formData.severity} onValueChange={(val) => setFormData({...formData, severity: val})}>
                        <SelectTrigger className="h-12 rounded-xl border-2">
                           <SelectValue placeholder="Select Severity" />
                        </SelectTrigger>
                        <SelectContent>
                           {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 rounded-xl bg-secondary/5 h-[48px] mt-7">
                     <Label className="text-[10px] font-black uppercase tracking-widest">Broadcast Active</Label>
                     <Switch 
                       checked={formData.isActive} 
                       onCheckedChange={(val) => setFormData({...formData, isActive: val})}
                     />
                  </div>
               </div>

               <Separator />

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Announcement Content</Label>
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Broadcast Title</Label>
                        <Input 
                          placeholder="e.g. Typhoon Bising: Trip Suspensions" 
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="h-12 rounded-xl font-bold border-2 focus-visible:ring-primary"
                        />
                     </div>

                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Detailed Instructions / Description</Label>
                        <Textarea 
                          placeholder="Provide clear details and next steps for travelers..." 
                          value={formData.content}
                          onChange={(e) => setFormData({...formData, content: e.target.value})}
                          className="min-h-[180px] rounded-xl text-sm leading-relaxed border-2 focus-visible:ring-primary p-4"
                        />
                     </div>
                  </div>
               </div>

               <div className="bg-accent/10 p-4 rounded-2xl border-2 border-dashed border-accent/20 flex items-start gap-4">
                  <Globe className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-primary uppercase tracking-wider">Public Voice Context</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                      This information is pushed to the public live ticker and the advisories timeline. Ensure instructions are clear and accurate before broadcasting.
                    </p>
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t gap-3 shrink-0 bg-secondary/10">
             <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold rounded-xl h-14 border-2">Cancel</Button>
             <Button 
               type="button"
               onClick={handleSave} 
               disabled={!isFormValid}
               className={cn(
                 "flex-1 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl h-14 shadow-xl transition-all",
                 isFormValid ? "bg-primary hover:scale-[1.02] active:scale-[0.98]" : "bg-muted text-muted-foreground cursor-not-allowed"
               )}
             >
               {editingAdvisory ? "Update Broadcast" : "Start Broadcast"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
