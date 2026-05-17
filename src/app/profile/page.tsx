"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  User, 
  Users, 
  Phone, 
  Mail, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Save, 
  Heart,
  Calendar,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Ticket,
  Briefcase,
  Anchor
} from "lucide-react";
import { doc, collection } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { nanoid } from "nanoid";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  // Defer collection reads until user is authenticated
  const staffRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "staff");
  }, [db, user]);

  const portsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "ports");
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);
  const { data: allStaff } = useCollection(staffRef);
  const { data: ports } = useCollection(portsRef);

  const myStaffRecord = useMemo(() => {
    if (!allStaff || !user?.email) return null;
    return allStaff.find(s => s.email === user.email);
  }, [allStaff, user?.email]);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    phoneNumber: "",
    email: "",
    birthDate: "",
    emergencyContact: ""
  });

  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [familyForm, setFamilyForm] = useState({
    fullName: "",
    birthDate: "",
    emergencyContact: ""
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || "",
        phoneNumber: profile.phoneNumber || "",
        email: profile.email || user?.email || "",
        birthDate: profile.birthDate || "",
        emergencyContact: profile.emergencyContact || ""
      });
    } else if (user) {
      setProfileForm(prev => ({
        ...prev,
        email: user.email || ""
      }));
    }
  }, [profile, user]);

  const handleUpdateProfile = () => {
    if (!profileRef) return;
    setDocumentNonBlocking(profileRef, {
      ...profileForm,
      uid: user?.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setIsProfileEditing(false);
  };

  const handleOpenFamilyDialog = (member: any = null) => {
    if (member) {
      setEditingMemberId(member.id);
      setFamilyForm({
        fullName: member.fullName,
        birthDate: member.birthDate,
        emergencyContact: member.emergencyContact
      });
    } else {
      setEditingMemberId(null);
      setFamilyForm({
        fullName: "",
        birthDate: "",
        emergencyContact: ""
      });
    }
    setIsFamilyDialogOpen(true);
  };

  const handleSaveFamilyMember = () => {
    if (!profileRef) return;
    
    let updatedMembers = [...(profile?.familyMembers || [])];
    
    if (editingMemberId) {
      updatedMembers = updatedMembers.map(m => 
        m.id === editingMemberId ? { ...familyForm, id: editingMemberId } : m
      );
    } else {
      updatedMembers.push({ ...familyForm, id: nanoid() });
    }

    setDocumentNonBlocking(profileRef, {
      familyMembers: updatedMembers,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    setIsFamilyDialogOpen(false);
  };

  const handleDeleteFamilyMember = (id: string) => {
    if (!profileRef) return;
    if (confirm("Are you sure you want to remove this family member?")) {
      const updatedMembers = (profile?.familyMembers || []).filter((m: any) => m.id !== id);
      setDocumentNonBlocking(profileRef, {
        familyMembers: updatedMembers,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const getPortName = (id: string) => ports?.find(p => p.id === id)?.name || "Floating / Unassigned";

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline text-primary uppercase tracking-tight">Admin Profile</h1>
            <p className="text-muted-foreground text-sm">Manage your admin profile and view professional status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && (
              <Badge className="bg-accent text-primary font-black uppercase tracking-widest px-3 py-1">SuperAdmin Access</Badge>
            )}
            {myStaffRecord && !isSuperAdmin && (
              <Badge className="bg-primary text-white font-black uppercase tracking-widest px-3 py-1">Authorized Staff</Badge>
            )}
            <div className="bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">{user?.email}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: ACCOUNT & PROFESSIONAL */}
          <div className="lg:col-span-4 space-y-6">
            {/* Professional Status Card */}
            {(myStaffRecord || isSuperAdmin) && (
              <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Briefcase className="h-24 w-24 -rotate-12 translate-x-8 translate-y-8" />
                </div>
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Professional Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2 relative z-10">
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold opacity-60">Organizational Role</p>
                    <p className="font-black text-xl uppercase leading-tight">
                      {isSuperAdmin ? "Super Administrator" : myStaffRecord?.role}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase font-bold opacity-60">Primary Assignment</p>
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      <Anchor className="h-3.5 w-3.5 opacity-60" /> 
                      {isSuperAdmin ? "All Terminals" : getPortName(myStaffRecord?.assignedPortId)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] leading-relaxed opacity-70 italic">
                      Staff credentials and role-based permissions are managed by higher-level management.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="h-2 bg-accent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <User className="h-5 w-5 text-accent" /> Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {!isProfileEditing ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Full Name</Label>
                      <p className="font-bold text-primary">{profile?.displayName || "Not set"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Registered Email</Label>
                      <p className="font-bold text-primary flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {profile?.email || user?.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Mobile Number</Label>
                      <p className="font-bold text-primary flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {profile?.phoneNumber || "Not set"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Date of Birth</Label>
                      <p className="font-bold text-primary flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {profile?.birthDate || "Not set"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Emergency Contact</Label>
                      <p className="font-bold text-primary flex items-center gap-2">
                        <Heart className="h-3.5 w-3.5 text-destructive" /> {profile?.emergencyContact || "Not set"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full h-10 font-bold text-xs uppercase tracking-wider mt-2 hover:bg-accent hover:text-primary transition-colors"
                      onClick={() => setIsProfileEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Admin Details
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Display Name</Label>
                      <Input 
                        value={profileForm.displayName} 
                        onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                        className="h-10 text-sm"
                        placeholder="Public Name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Contact Email</Label>
                      <Input 
                        type="email"
                        value={profileForm.email} 
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                        className="h-10 text-sm"
                        placeholder="itinerary@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Mobile</Label>
                      <Input 
                        value={profileForm.phoneNumber} 
                        onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                        placeholder="09XX XXX XXXX"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Date of Birth</Label>
                      <Input 
                        type="date"
                        value={profileForm.birthDate} 
                        onChange={(e) => setProfileForm({...profileForm, birthDate: e.target.value})}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase">Emergency Number</Label>
                      <Input 
                        value={profileForm.emergencyContact} 
                        onChange={(e) => setProfileForm({...profileForm, emergencyContact: e.target.value})}
                        placeholder="09XX XXX XXXX"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" className="flex-1 h-10 text-xs" onClick={() => setIsProfileEditing(false)}>Cancel</Button>
                      <Button className="flex-1 h-10 bg-primary text-white text-xs font-bold" onClick={handleUpdateProfile}>
                        <Save className="h-3.5 w-3.5 mr-2" /> Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: FAMILY MEMBERS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline text-primary flex items-center gap-2">
                <Users className="h-6 w-6 text-accent" /> Travel Roster
              </h2>
              <Button onClick={() => handleOpenFamilyDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90 h-9 px-4 text-xs">
                <Plus className="h-4 w-4 mr-1.5" /> Add Member
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile?.familyMembers && profile.familyMembers.length > 0 ? (
                profile.familyMembers.map((member: any) => (
                  <Card key={member.id} className="border-none shadow-sm bg-white hover:ring-2 hover:ring-accent/50 transition-all group">
                    <CardContent className="p-5 flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-black text-accent tracking-[0.2em]">Passenger Name</p>
                          <p className="font-black text-primary text-lg uppercase truncate">{member.fullName}</p>
                        </div>
                        <div className="flex gap-4">
                           <div className="space-y-0.5">
                             <p className="text-[9px] uppercase font-bold text-muted-foreground">Birthdate</p>
                             <p className="text-xs font-bold flex items-center gap-1.5 text-primary">
                               <Calendar className="h-3 w-3 text-muted-foreground" /> {member.birthDate}
                             </p>
                           </div>
                           <div className="space-y-0.5">
                             <p className="text-[9px] uppercase font-bold text-muted-foreground">Emergency</p>
                             <p className="text-xs font-bold flex items-center gap-1.5 text-primary">
                               <Phone className="h-3 w-3 text-muted-foreground" /> {member.emergencyContact}
                             </p>
                           </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={() => handleOpenFamilyDialog(member)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50" onClick={() => handleDeleteFamilyMember(member.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-secondary/5 opacity-50">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">No family records found</p>
                  <p className="text-xs mt-1">Start building your travel roster for faster bookings.</p>
                </div>
              )}
            </div>

            <Card className="border-none shadow-sm bg-secondary/10 p-6 rounded-3xl border border-dashed mt-12">
               <div className="flex items-start gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm"><Users className="h-6 w-6 text-accent" /></div>
                  <div className="space-y-1">
                     <h3 className="font-black text-primary uppercase tracking-tight">Rapid Booking Context</h3>
                     <p className="text-xs text-muted-foreground leading-relaxed">
                        The profiles stored above are automatically synchronized with the island checkout system. Adding family members here allows you to bypass data entry for large groups during high-traffic travel periods.
                     </p>
                  </div>
               </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Family Dialog */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" /> {editingMemberId ? "Edit Member" : "Add Family Member"}
            </DialogTitle>
            <DialogDescription>
              Details stored here will be available for quick-selection during trip checkouts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Passenger Full Name</Label>
              <Input 
                value={familyForm.fullName} 
                onChange={(e) => setFamilyForm({...familyForm, fullName: e.target.value})} 
                placeholder="Juan Dela Cruz"
                className="h-11 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date of Birth</Label>
                <Input 
                  type="date"
                  value={familyForm.birthDate} 
                  onChange={(e) => setFamilyForm({...familyForm, birthDate: e.target.value})} 
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Heart className="h-2.5 w-2.5 text-destructive" /> Emergency Mobile
                </Label>
                <Input 
                  value={familyForm.emergencyContact} 
                  onChange={(e) => setFamilyForm({...familyForm, emergencyContact: e.target.value})} 
                  placeholder="09XX XXX XXXX"
                  className="h-11 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsFamilyDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary text-white font-bold uppercase text-xs tracking-wider" 
              onClick={handleSaveFamilyMember}
              disabled={!familyForm.fullName || !familyForm.birthDate || !familyForm.emergencyContact}
            >
              <Save className="h-4 w-4 mr-2" /> {editingMemberId ? "Update Record" : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
