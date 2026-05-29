"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  Loader2, 
  Building2, 
  Image as ImageIcon, 
  Layout, 
  ShieldCheck,
  Globe,
  Monitor,
  Palette,
  CheckCircle2,
  Info
} from "lucide-react";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  
  const settingsRef = useMemoFirebase(() => {
    if (!db) return null;
    return doc(db, "settings", "app");
  }, [db]);

  const { data: settings, isLoading } = useDoc(settingsRef);

  const [formData, setFormData] = useState({
    companyName: "Isla Konek",
    logoUrl: "",
    heroTitle: "Islands Within Reach",
    heroDescription: "The leading digital maritime bridge in the Philippines. Connecting islands, simplified.",
    heroImageUrl: "https://picsum.photos/seed/maritime1/1200/600"
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "Isla Konek",
        logoUrl: settings.logoUrl || "",
        heroTitle: settings.heroTitle || "Islands Within Reach",
        heroDescription: settings.heroDescription || "The leading digital maritime bridge in the Philippines. Connecting islands, simplified.",
        heroImageUrl: settings.heroImageUrl || "https://picsum.photos/seed/maritime1/1200/600"
      });
    }
  }, [settings]);

  const handleSave = () => {
    if (!settingsRef) return;
    setIsSaving(true);
    
    setDocumentNonBlocking(settingsRef, {
      ...formData,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Broadcasted",
        description: "Branding and interface updates have been pushed to all users.",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-headline text-primary uppercase tracking-tight">Platform Settings</h1>
        </div>
        <Button 
          onClick={handleSave} 
          className="bg-primary text-white font-black uppercase text-xs tracking-widest h-10 px-6 gap-2 shadow-lg"
          disabled={isSaving || isLoading}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Publish Changes
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-8 container mx-auto pb-20">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                 <div className="bg-primary/10 p-2.5 rounded-xl">
                   <ShieldCheck className="h-6 w-6 text-primary" />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-primary uppercase">Organization Identity</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Branding Configuration</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase bg-green-50 px-3 py-1 rounded-full border border-green-100">
                 <Globe className="h-3.5 w-3.5" /> Live Node: Primary
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* BRANDING FORM */}
              <div className="md:col-span-2 space-y-8">
                 <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-secondary/10 py-4 border-b">
                       <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                          <Palette className="h-4 w-4" /> Branding Assets
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Official Company Name</Label>
                          <Input 
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                            className="h-12 font-black text-primary border-2 focus-visible:ring-primary"
                          />
                          <p className="text-[9px] text-muted-foreground italic">Updates headers, receipts, and legal manifests globally.</p>
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Logo Asset URL</Label>
                          <div className="flex gap-3">
                             <Input 
                               value={formData.logoUrl}
                               onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                               placeholder="https://..."
                               className="h-12 font-bold border-2 flex-1"
                             />
                             <div className="h-12 w-12 rounded-xl bg-secondary/20 flex items-center justify-center border-2 border-dashed shrink-0 overflow-hidden">
                                {formData.logoUrl ? (
                                   <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                ) : (
                                   <ImageIcon className="h-5 w-5 text-muted-foreground opacity-20" />
                                )}
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-secondary/10 py-4 border-b">
                       <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                          <Monitor className="h-4 w-4" /> Public Portal Hero Editor
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Welcome Headline (Hero Title)</Label>
                          <Input 
                            value={formData.heroTitle}
                            onChange={(e) => setFormData({...formData, heroTitle: e.target.value})}
                            className="h-12 font-black text-primary border-2 focus-visible:ring-primary"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Support Messaging (Hero Description)</Label>
                          <Textarea 
                            value={formData.heroDescription}
                            onChange={(e) => setFormData({...formData, heroDescription: e.target.value})}
                            className="min-h-[100px] font-bold border-2 p-4 leading-relaxed"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Atmosphere Image (Hero Background URL)</Label>
                          <Input 
                            value={formData.heroImageUrl}
                            onChange={(e) => setFormData({...formData, heroImageUrl: e.target.value})}
                            placeholder="https://..."
                            className="h-12 font-bold border-2"
                          />
                       </div>
                    </CardContent>
                 </Card>
              </div>

              {/* LIVE PREVIEW SIDEBAR */}
              <div className="space-y-6">
                 <div className="sticky top-40 space-y-6">
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                       <CardHeader className="bg-primary py-3">
                          <CardTitle className="text-[10px] font-black uppercase text-white tracking-[0.2em] flex items-center gap-2">
                             <Layout className="h-4 w-4 text-accent" /> Interface Preview
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="p-0">
                          {/* MOCK NAVBAR */}
                          <div className="p-3 border-b flex items-center gap-2 bg-secondary/5">
                             <div className="h-6 w-6 rounded bg-primary flex items-center justify-center shrink-0">
                                {formData.logoUrl ? (
                                   <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full" />
                                ) : (
                                   <Building2 className="h-3 w-3 text-white" />
                                )}
                             </div>
                             <span className="text-[10px] font-black text-primary uppercase truncate">{formData.companyName}</span>
                          </div>
                          
                          {/* MOCK HERO */}
                          <div className="relative h-40 bg-secondary flex items-center justify-center p-6 overflow-hidden">
                             {formData.heroImageUrl && (
                                <img src={formData.heroImageUrl} alt="Hero" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                             )}
                             <div className="absolute inset-0 bg-primary/30" />
                             <div className="relative z-10 text-center space-y-1">
                                <p className="text-[11px] font-black text-white uppercase drop-shadow-md">{formData.heroTitle}</p>
                                <p className="text-[7px] text-white/80 font-bold max-w-[150px] mx-auto line-clamp-2 drop-shadow-sm">{formData.heroDescription}</p>
                             </div>
                          </div>

                          <div className="p-4 bg-secondary/10 flex flex-col items-center gap-2">
                             <div className="h-8 w-32 rounded bg-white shadow-sm flex items-center justify-center">
                                <span className="text-[8px] font-black text-muted-foreground uppercase">Search Component</span>
                             </div>
                          </div>
                       </CardContent>
                    </Card>

                    <div className="bg-accent/10 p-5 rounded-3xl border-2 border-dashed border-accent/30 space-y-4">
                       <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div className="space-y-1">
                             <p className="text-xs font-black text-primary uppercase">Identity Audit</p>
                             <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                                Changes made here are pervasive. Ensure asset URLs are permanent and publicly accessible to avoid broken icons on traveler devices.
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>

      {/* FOOTER BAR */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 z-50 flex justify-center lg:pl-0">
         <div className="max-w-4xl w-full flex justify-between items-center px-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
               <CheckCircle2 className="h-4 w-4 text-green-600" /> Auto-save inactive. Manual publish required.
            </div>
            <Button 
               onClick={handleSave}
               className="bg-primary text-white font-black uppercase text-xs tracking-widest h-12 px-10 shadow-xl rounded-xl"
               disabled={isSaving || isLoading}
            >
               {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
               Publish Identity
            </Button>
         </div>
      </div>
    </div>
  );
}