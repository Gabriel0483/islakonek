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
  Anchor,
  CalendarClock,
  Clock,
  Ship,
  CheckCircle2,
  Timer,
  Zap,
  Activity,
  Star,
  MessageSquare,
  Send
} from "lucide-react";
import { doc, collection, query, where } from "firebase/firestore";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { nanoid } from "nanoid";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const staffRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "staff");
  }, [db, user]);

  const portsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "ports");
  }, [db, user]);

  const schedulesRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "staff_schedules");
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);
  const { data: allStaff } = useCollection(staffRef);
  const { data: ports } = useCollection(portsRef);
  const { data: allShifts, isLoading: isShiftsLoading } = useCollection(schedulesRef);

  const [todayStr, setTodayStr] = useState("");
  const [nowTime, setNowTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      setTodayStr(format(pht, "yyyy-MM-dd"));
      setNowTime(format(pht, "HH:mm"));
    };
    updateTime();
  }, []);

  const myStaffRecord = useMemo(() => {
    if (!allStaff || !user?.email) return null;
    return allStaff.find(s => s.email === user.email);
  }, [allStaff, user?.email]);

  const myShifts = useMemo(() => {
    if (!allShifts || !myStaffRecord) return [];
    return allShifts
      .filter(s => s.staffId === myStaffRecord.id)
      .sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  }, [allShifts, myStaffRecord]);

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

  // Feedback State
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

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

  const handleSaveFamilyMember = () => {
    if (!profileRef) return;
    let updatedMembers = [...(profile?.familyMembers || [])];
    if (editingMemberId) {
      updatedMembers = updatedMembers.map(m => m.id === editingMemberId ? { ...familyForm, id: editingMemberId } : m);
    } else {
      updatedMembers.push({ ...familyForm, id: nanoid() });
    }
    setDocumentNonBlocking(profileRef, { familyMembers: updatedMembers, updatedAt: new Date().toISOString() }, { merge: true });
    setIsFamilyDialogOpen(false);
  };

  const handleDeleteFamilyMember = (id: string) => {
    if (!profileRef) return;
    if (confirm("Are you sure you want to remove this family member?")) {
      const updatedMembers = (profile?.familyMembers || []).filter((m: any) => m.id !== id);
      setDocumentNonBlocking(profileRef, { familyMembers: updatedMembers, updatedAt: new Date().toISOString() }, { merge: true });
    }
  };

  const handleSendFeedback = () => {
     if (!db || !feedbackRating) return;
     setIsFeedbackSubmitting(true);
     
     // Simulated non-blocking submission
     setTimeout(() => {
        setIsFeedbackSubmitting(false);
        setFeedbackRating(0);
        setFeedbackText("");
        toast({
           title: "Feedback Received",
           description: "Thank you for helping us improve the Isla Konek experience."
        });
     }, 1000);
  };

  const getPortNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return "Floating / Unassigned";
    return ids.map(id => ports?.find(p => p.id === id)?.name || "Unknown Port").join(", ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ongoing': return <Badge className="bg-blue-600 text-white gap-1 uppercase font-black text-[8px] h-5 shadow-sm"><Zap className="h-2.5 w-2.5 animate-pulse" /> Ongoing</Badge>;
      case 'Completed': return <Badge className="bg-green-600 text-white gap-1 uppercase font-black text-[8px] h-5 shadow-sm"><CheckCircle2 className="h-2.5 w-2.5" /> Done</Badge>;
      case 'Absent': return <Badge variant="destructive" className="gap-1 uppercase font-black text-[8px] h-5 shadow-sm">Absent</Badge>;
      default: return <Badge variant="outline" className="uppercase font-black text-[8px] h-5 border-primary/20 text-primary/60">Scheduled</Badge>;
    }
  };

  const calculateShiftProgress = (date: string, start: string, end: string) => {
     if (date !== todayStr) return 0;
     if (nowTime < start) return 0;
     if (nowTime > end) return 100;
     const [sh, sm] = start.split(':').map(Number);
     const [eh, em] = end.split(':').map(Number);
     const [nh, nm] = nowTime.split(':').map(Number);
     const startTotal = sh * 60 + sm;
     const endTotal = eh * 60 + em;
     const nowTotal = nh * 60 + nm;
     return Math.round(((nowTotal - startTotal) / (endTotal - startTotal || 1)) * 100);
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
            <h1 className="text-3xl font-black font-headline text-primary uppercase tracking-tight">Profile Hub</h1>
            <p className="text-muted-foreground text-sm">Account details and operational duty roster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && <Badge className="bg-accent text-primary font-black uppercase tracking-widest px-3 py-1">SuperAdmin</Badge>}
            {myStaffRecord && !isSuperAdmin && <Badge className="bg-primary text-white font-black uppercase tracking-widest px-3 py-1">{myStaffRecord.role}</Badge>}
            <div className="bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">{user?.email}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: ACCOUNT */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-primary uppercase tracking-tight">
                  <User className="h-5 w-5 text-accent" /> Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {!isProfileEditing ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Legal Name</Label>
                      <p className="font-bold text-primary uppercase">{profile?.displayName || "UNSET"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Email Node</Label>
                      <p className="font-bold text-primary flex items-center gap-2 truncate text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {profile?.email || user?.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Mobile Reach</Label>
                      <p className="font-bold text-primary flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {profile?.phoneNumber || "NOT SET"}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full h-11 font-black text-[10px] uppercase tracking-[0.2em] mt-2 border-2 hover:bg-accent/10 hover:text-primary transition-all"
                      onClick={() => setIsProfileEditing(true)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Modify Profile
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold uppercase">Name</Label><Input value={profileForm.displayName} onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})} className="h-10 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold uppercase">Mobile</Label><Input value={profileForm.phoneNumber} onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})} className="h-10 text-sm" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold uppercase">Emergency Contact</Label><Input value={profileForm.emergencyContact} onChange={(e) => setProfileForm({...profileForm, emergencyContact: e.target.value})} className="h-10 text-sm" /></div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" className="flex-1 h-10 text-[10px] font-black uppercase" onClick={() => setIsProfileEditing(false)}>Cancel</Button>
                      <Button className="flex-1 h-10 bg-primary text-white text-[10px] font-black uppercase shadow-lg" onClick={handleUpdateProfile}>Update</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* FEEDBACK SECTION */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
               <CardHeader className="bg-secondary/10 py-4 border-b">
                  <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                    <MessageSquare className="h-4 w-4" /> Share Experience
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-4">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => setFeedbackRating(s)}
                        className="transition-transform active:scale-90"
                      >
                        <Star className={cn("h-7 w-7", s <= feedbackRating ? "fill-accent text-accent" : "text-secondary")} />
                      </button>
                    ))}
                  </div>
                  <Textarea 
                    placeholder="Tell us how we can improve our voyages..." 
                    className="min-h-[100px] text-xs font-medium bg-secondary/5 border-none"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <Button 
                    className="w-full h-11 bg-primary text-white font-black uppercase text-[10px] tracking-widest gap-2"
                    disabled={!feedbackRating || isFeedbackSubmitting}
                    onClick={handleSendFeedback}
                  >
                    {isFeedbackSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Rating
                  </Button>
               </CardContent>
            </Card>

            {/* FAMILY SECTION */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" /> Travel Roster
                </h2>
                <Button onClick={() => handleOpenFamilyDialog()} variant="ghost" className="h-7 text-[9px] font-black uppercase text-accent hover:text-primary underline">
                  Add Member
                </Button>
              </div>
              <div className="space-y-3">
                {profile?.familyMembers?.map((member: any) => (
                  <Card key={member.id} className="border-none shadow-sm bg-white overflow-hidden group">
                    <CardContent className="p-4 flex justify-between items-center">
                       <div className="space-y-0.5 min-w-0">
                          <p className="font-black text-primary uppercase text-xs truncate">{member.fullName}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">{member.birthDate}</p>
                       </div>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleOpenFamilyDialog(member)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFamilyMember(member.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: DUTY ROSTER */}
          <div className="lg:col-span-8 space-y-6">
            <section id="duty-roster" className="space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl"><CalendarClock className="h-6 w-6 text-primary" /></div>
                    <h2 className="text-xl font-black font-headline text-primary uppercase tracking-tight">Duty Roster</h2>
                  </div>
                  {(myStaffRecord || isSuperAdmin) && (
                    <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-3">
                       <Activity className="h-4 w-4 text-green-600" />
                       <div className="space-y-0.5">
                          <p className="text-[8px] font-black text-green-800 uppercase tracking-widest leading-none">Roster Status</p>
                          <p className="text-[10px] font-bold text-green-600">Syncing with Central Ops</p>
                       </div>
                    </div>
                  )}
               </div>
               
               {isShiftsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed opacity-50">
                    <Loader2 className="h-10 w-10 animate-spin text-accent" />
                  </div>
               ) : myShifts.length > 0 ? (
                  <div className="space-y-4">
                    {myShifts.map((shift) => {
                      const progress = calculateShiftProgress(shift.date, shift.startTime, shift.endTime);
                      return (
                        <Card key={shift.id} className="border-none shadow-sm bg-white hover:ring-1 hover:ring-primary/10 transition-all group overflow-hidden">
                          <CardContent className="p-0">
                             <div className="flex flex-col sm:flex-row">
                               <div className="p-5 sm:w-32 bg-secondary/10 flex flex-col justify-center items-center text-center shrink-0 border-b sm:border-b-0 sm:border-r">
                                  <p className="text-[10px] font-black text-accent uppercase tracking-tighter mb-0.5">{shift.date}</p>
                                  <p className="text-2xl font-black text-primary leading-tight">{shift.startTime}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Shift Start</p>
                               </div>
                               <div className="p-5 flex-1 space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                     <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                           {shift.assignmentType === 'Port' ? <MapPin className="h-4 w-4 text-accent" /> : <Ship className="h-4 w-4 text-accent" />}
                                           <span className="font-black text-base text-primary uppercase tracking-tight">{shift.assignmentName}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                           <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Ends @ {shift.endTime}</span>
                                           <span className="flex items-center gap-1.5 border-l pl-4"><Briefcase className="h-3 w-3" /> {shift.role}</span>
                                        </div>
                                     </div>
                                     <div className="shrink-0 flex items-center gap-2">
                                        {getStatusBadge(shift.status)}
                                     </div>
                                  </div>
                                  
                                  {shift.status === 'Ongoing' && (
                                     <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                           <span className="text-blue-600">Shift Progress</span>
                                           <span className="text-primary">{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5 bg-secondary" />
                                     </div>
                                  )}

                                  {shift.notes && (
                                     <div className="bg-secondary/20 p-3 rounded-xl border border-secondary/50 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <Timer className="h-3.5 w-3.5 text-primary/40 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-primary/70 italic leading-relaxed">
                                          Dispatcher Note: "{shift.notes}"
                                        </p>
                                     </div>
                                  )}
                               </div>
                             </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
               ) : (
                  <div className="py-24 text-center border-2 border-dashed rounded-3xl bg-white opacity-40 flex flex-col items-center">
                     <CalendarClock className="h-16 w-16 text-muted-foreground mb-4" />
                     <p className="font-black text-primary uppercase text-sm tracking-widest">Zero Duty Rotations Found</p>
                     <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">Your work assignments will be broadcasted here once the operations schedule is published.</p>
                  </div>
               )}
            </section>
          </div>
        </div>
      </main>

      {/* FAMILY DIALOG */}
      <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
        <DialogContent className="w-[calc(100%-1rem)] sm:max-w-[500px] p-0 overflow-hidden rounded-3xl">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><Users className="h-6 w-6" /></div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingMemberId ? "Edit Roster Entry" : "New Roster Entry"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest">Update Passenger Profile</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Passenger Full Name</Label>
              <Input 
                value={familyForm.fullName} 
                onChange={(e) => setFamilyForm({...familyForm, fullName: e.target.value.toUpperCase()})} 
                placeholder="JUAN DELA CRUZ"
                className="h-12 text-sm font-black border-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Date of Birth</Label>
                <Input type="date" value={familyForm.birthDate} onChange={(e) => setFeedbackRating(Number(e.target.value))} className="h-12 text-sm border-2 font-black" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Emergency Mobile</Label>
                <Input value={familyForm.emergencyContact} onChange={(e) => setFamilyForm({...familyForm, emergencyContact: e.target.value})} placeholder="09XXXXXXXXX" className="h-12 text-sm border-2 font-black" />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3">
            <Button variant="outline" onClick={() => setIsFamilyDialogOpen(false)} className="flex-1 font-black h-12 rounded-xl">Cancel</Button>
            <Button className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 rounded-xl shadow-lg" onClick={handleSaveFamilyMember}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}