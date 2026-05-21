"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  CalendarClock, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Users,
  MapPin,
  Ship,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Filter
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const SHIFT_STATUSES = ["Scheduled", "Ongoing", "Completed", "Absent", "Cancelled"];

export default function StaffSchedulingPage() {
  const db = useFirestore();
  
  const staffRef = useMemoFirebase(() => db ? collection(db, "staff") : null, [db]);
  const schedulesRef = useMemoFirebase(() => db ? collection(db, "staff_schedules") : null, [db]);
  const portsRef = useMemoFirebase(() => db ? collection(db, "ports") : null, [db]);
  const vesselsRef = useMemoFirebase(() => db ? collection(db, "vessels") : null, [db]);
  
  const { data: staff, isLoading: isStaffLoading } = useCollection(staffRef);
  const { data: shifts, isLoading: isSchedulesLoading } = useCollection(schedulesRef);
  const { data: ports } = useCollection(portsRef);
  const { data: vessels } = useCollection(vesselsRef);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  const [formData, setFormData] = useState({
    staffId: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "08:00",
    endTime: "17:00",
    assignmentType: "Port" as "Port" | "Vessel",
    assignmentId: "",
    status: "Scheduled",
    notes: ""
  });

  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    return shifts.filter(s => {
      const matchesSearch = s.staffName?.toLowerCase().includes(search.toLowerCase()) || 
                          s.assignmentName?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, search, roleFilter]);

  const handleOpenDialog = (shift: any = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        staffId: shift.staffId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        assignmentType: shift.assignmentType,
        assignmentId: shift.assignmentId,
        status: shift.status,
        notes: shift.notes || ""
      });
    } else {
      setEditingShift(null);
      setFormData({
        staffId: "",
        date: new Date().toISOString().split('T')[0],
        startTime: "08:00",
        endTime: "17:00",
        assignmentType: "Port",
        assignmentId: "",
        status: "Scheduled",
        notes: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !formData.staffId || !formData.assignmentId) return;
    
    const selectedStaff = staff?.find(s => s.id === formData.staffId);
    const assignmentName = formData.assignmentType === 'Port' 
      ? ports?.find(p => p.id === formData.assignmentId)?.name 
      : vessels?.find(v => v.id === formData.assignmentId)?.name;

    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      staffName: selectedStaff?.fullName || "Unknown",
      role: selectedStaff?.role || "Staff",
      assignmentName: assignmentName || "Unknown",
      updatedAt: timestamp
    };

    if (editingShift) {
      updateDocumentNonBlocking(doc(db, "staff_schedules", editingShift.id), payload);
    } else {
      const newId = Math.random().toString(36).substring(2, 11).toUpperCase();
      setDocumentNonBlocking(doc(db, "staff_schedules", newId), { 
        ...payload, 
        id: newId, 
        createdAt: timestamp 
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this shift record?")) {
      deleteDocumentNonBlocking(doc(db, "staff_schedules", id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ongoing': return <Badge className="bg-blue-500">Ongoing</Badge>;
      case 'Completed': return <Badge className="bg-green-600">Completed</Badge>;
      case 'Absent': return <Badge variant="destructive">Absent</Badge>;
      case 'Cancelled': return <Badge variant="secondary">Cancelled</Badge>;
      default: return <Badge className="bg-primary/80">Scheduled</Badge>;
    }
  };

  const isLoading = isStaffLoading || isSchedulesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
           <CalendarClock className="h-5 w-5 text-accent" />
           <h1 className="text-lg font-bold font-headline text-primary uppercase tracking-tight">Personnel Scheduling</h1>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold h-10 px-4">
          <Plus className="h-4 w-4 mr-2" /> Assign New Shift
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Search Schedule</Label>
                <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Staff name or location..." 
                  className="pl-10 h-10 bg-secondary/10 border-none text-sm" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Role Filtering</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                   <SelectTrigger className="h-10 bg-secondary/10 border-none text-sm"><SelectValue placeholder="All Personnel" /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">All Personnel</SelectItem>
                      <SelectItem value="Desk Agent">Desk Agents Only</SelectItem>
                      <SelectItem value="Crew">Vessel Crew Only</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="bg-accent/10 px-4 py-2 rounded-lg w-full flex items-center justify-between border border-accent/20">
                   <span className="text-[10px] font-black text-accent uppercase tracking-widest">Active Rotations</span>
                   <span className="text-sm font-black text-primary">{filteredShifts.length}</span>
                </div>
              </div>
           </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Rotations...</p>
          </div>
        ) : filteredShifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShifts.map((shift) => (
              <Card key={shift.id} className="border-none shadow-sm hover:ring-2 hover:ring-primary/10 transition-all bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                   {getStatusBadge(shift.status)}
                </div>
                <CardHeader className="p-5 pb-3">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">{shift.role}</p>
                      <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                         <UserCheck className="h-4 w-4" /> {shift.staffName}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                         <Calendar className="h-3 w-3" /> {shift.date}
                      </div>
                   </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                   <div className="bg-secondary/20 p-3 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                         <span className="text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-3 w-3" /> Time</span>
                         <span className="text-primary">{shift.startTime} — {shift.endTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                         <span className="text-muted-foreground uppercase flex items-center gap-1">
                            {shift.assignmentType === 'Port' ? <MapPin className="h-3 w-3" /> : <Ship className="h-3 w-3" />}
                            Assignment
                         </span>
                         <span className="text-primary truncate ml-4">{shift.assignmentName}</span>
                      </div>
                   </div>

                   {shift.notes && (
                      <p className="text-[10px] text-muted-foreground italic line-clamp-1 border-l-2 border-accent pl-2">
                        "{shift.notes}"
                      </p>
                   )}

                   <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(shift)} className="h-8 text-[10px] font-black uppercase text-primary">Edit Shift</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(shift.id)} className="h-8 text-[10px] font-black uppercase text-destructive">Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-white opacity-50 flex flex-col items-center">
            <CalendarClock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-primary uppercase">No Active Assignments</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto text-muted-foreground">Define personnel shifts for your ports and vessels to ensure coverage.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Briefcase className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingShift ? "Update Assignment" : "New Duty Assignment"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Establish shifts for terminal agents and vessel crew.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Select Staff Member</Label>
                     <Select value={formData.staffId} onValueChange={(val) => setFormData({...formData, staffId: val})}>
                        <SelectTrigger className="h-11">
                           <SelectValue placeholder="Search Personnel" />
                        </SelectTrigger>
                        <SelectContent>
                           {staff?.filter(s => s.status === 'Active').map(s => (
                             <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.role})</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Service Date</Label>
                     <Input 
                       type="date" 
                       className="h-11 font-bold" 
                       value={formData.date} 
                       onChange={(e) => setFormData({...formData, date: e.target.value})} 
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Start Time</Label>
                     <Input 
                       type="time" 
                       className="h-11 font-bold" 
                       value={formData.startTime} 
                       onChange={(e) => setFormData({...formData, startTime: e.target.value})} 
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">End Time</Label>
                     <Input 
                       type="time" 
                       className="h-11 font-bold" 
                       value={formData.endTime} 
                       onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
                     />
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">3. Assignment Allocation</Label>
                  <div className="bg-secondary/10 p-4 rounded-xl border border-dashed space-y-4">
                     <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={formData.assignmentType === 'Port' ? 'default' : 'outline'}
                          className="flex-1 h-10 gap-2 font-bold text-xs uppercase"
                          onClick={() => setFormData({...formData, assignmentType: 'Port', assignmentId: ""})}
                        >
                           <MapPin className="h-3.5 w-3.5" /> Port/Desk
                        </Button>
                        <Button 
                          type="button" 
                          variant={formData.assignmentType === 'Vessel' ? 'default' : 'outline'}
                          className="flex-1 h-10 gap-2 font-bold text-xs uppercase"
                          onClick={() => setFormData({...formData, assignmentType: 'Vessel', assignmentId: ""})}
                        >
                           <Ship className="h-3.5 w-3.5" /> Vessel/Crew
                        </Button>
                     </div>

                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Select {formData.assignmentType}</Label>
                        <Select value={formData.assignmentId} onValueChange={(val) => setFormData({...formData, assignmentId: val})}>
                           <SelectTrigger className="bg-white border-2">
                              <SelectValue placeholder={`Choose ${formData.assignmentType}`} />
                           </SelectTrigger>
                           <SelectContent>
                              {formData.assignmentType === 'Port' ? (
                                ports?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                              ) : (
                                vessels?.filter(v => v.status === 'Operational').map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)
                              )}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assignment Status</Label>
                     <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                        <SelectTrigger className="h-11">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {SHIFT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Administrative Notes</Label>
                  <Textarea 
                    placeholder="e.g. Relieving Captain Santos, or Double-shift at desk..." 
                    className="min-h-[100px] border-2" 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/5 gap-2 shrink-0">
             <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-12">Cancel</Button>
             <Button 
                onClick={handleSave} 
                disabled={!formData.staffId || !formData.assignmentId}
                className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 shadow-lg"
             >
                {editingShift ? "Update Assignment" : "Finalize Assignment"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
