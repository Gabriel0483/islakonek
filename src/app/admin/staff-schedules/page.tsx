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
  Filter,
  Copy,
  LayoutGrid,
  Check,
  Activity,
  History,
  Timer,
  Zap,
  MoreVertical
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parse, parseISO } from "date-fns";

const SHIFT_STATUSES = ["Scheduled", "Ongoing", "Completed", "Absent", "Cancelled"];

export default function StaffSchedulingPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [todayStr, setTodayStr] = useState("");
  const [nowTime, setNowTime] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pht = new Date(utc + (3600000 * 8));
      setTodayStr(format(pht, "yyyy-MM-dd"));
      setNowTime(format(pht, "HH:mm"));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);
  
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
  const [statusFilter, setStatusFilter] = useState("all");
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

  const rosterStats = useMemo(() => {
    if (!shifts || !isMounted) return { total: 0, active: 0, absent: 0, coverage: 0 };
    const todayShifts = shifts.filter(s => s.date === todayStr);
    const active = todayShifts.filter(s => s.status === 'Ongoing').length;
    const absent = todayShifts.filter(s => s.status === 'Absent').length;
    const total = todayShifts.length;
    const coverage = total > 0 ? Math.round(((total - absent) / total) * 100) : 0;
    return { total, active, absent, coverage };
  }, [shifts, isMounted, todayStr]);

  // Conflict detection logic
  const conflictMap = useMemo(() => {
    const conflicts: Record<string, boolean> = {};
    if (!shifts) return conflicts;

    shifts.forEach((s1, i) => {
      shifts.forEach((s2, j) => {
        if (i === j) return;
        if (s1.staffId === s2.staffId && s1.date === s2.date && s1.status !== 'Cancelled' && s2.status !== 'Cancelled') {
           // Basic overlapping time check
           if ((s1.startTime >= s2.startTime && s1.startTime < s2.endTime) || 
               (s2.startTime >= s1.startTime && s2.startTime < s1.endTime)) {
              conflicts[s1.id] = true;
              conflicts[s2.id] = true;
           }
        }
      });
    });
    return conflicts;
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    if (!shifts) return [];
    return shifts.filter(s => {
      const matchesSearch = s.staffName?.toLowerCase().includes(search.toLowerCase()) || 
                          s.assignmentName?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    }).sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, search, roleFilter, statusFilter]);

  const handleOpenDialog = (shift: any = null, isDuplicate = false) => {
    if (shift) {
      setEditingShift(isDuplicate ? null : shift);
      setFormData({
        staffId: shift.staffId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        assignmentType: shift.assignmentType,
        assignmentId: shift.assignmentId,
        status: isDuplicate ? "Scheduled" : shift.status,
        notes: shift.notes || ""
      });
    } else {
      setEditingShift(null);
      setFormData({
        staffId: "",
        date: todayStr || new Date().toISOString().split('T')[0],
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
    if (confirm("Are you sure you want to permanently remove this shift record?")) {
      deleteDocumentNonBlocking(doc(db, "staff_schedules", id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ongoing': return <Badge className="bg-blue-600 text-white gap-1.5 uppercase font-black text-[9px] h-5"><Zap className="h-3 w-3 animate-pulse" /> Ongoing</Badge>;
      case 'Completed': return <Badge className="bg-green-600 text-white gap-1.5 uppercase font-black text-[9px] h-5"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'Absent': return <Badge variant="destructive" className="gap-1.5 uppercase font-black text-[9px] h-5"><XCircle className="h-3 w-3" /> Absent</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="text-muted-foreground uppercase font-black text-[9px] h-5">Cancelled</Badge>;
      default: return <Badge className="bg-primary/80 uppercase font-black text-[9px] h-5">Scheduled</Badge>;
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
     
     const total = endTotal - startTotal;
     const current = nowTotal - startTotal;
     
     return Math.round((current / (total || 1)) * 100);
  };

  const isLoading = isStaffLoading || isSchedulesLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
           <CalendarClock className="h-5 w-5 text-accent" />
           <h1 className="text-lg font-bold font-headline text-primary uppercase tracking-tight">Personnel Roster</h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase text-primary">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {todayStr}
           </div>
           <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-black uppercase text-xs tracking-widest h-10 px-6 shadow-sm">
             <Plus className="h-4 w-4 mr-2" /> Assign Duty
           </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        {/* ROSTER ANALYTICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Users className="h-20 w-20" /></div>
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Daily Deployed</p>
                 <CardTitle className="text-3xl font-black">{rosterStats.total}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[9px] opacity-60 font-bold uppercase">Personnel on today's roster</p>
              </CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-white border-2 border-green-600/10">
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-green-600/60 tracking-widest">Live Duty</p>
                 <CardTitle className="text-3xl font-black text-green-600">{rosterStats.active}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[9px] text-muted-foreground font-bold uppercase">Personnel currently clocking</p>
              </CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-white border-2 border-destructive/10">
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-destructive/60 tracking-widest">Absences</p>
                 <CardTitle className="text-3xl font-black text-destructive">{rosterStats.absent}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <p className="text-[9px] text-muted-foreground font-bold uppercase">No-show / Absent reports</p>
              </CardContent>
           </Card>
           <Card className="border-none shadow-sm bg-accent text-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><Timer className="h-24 w-24" /></div>
              <CardHeader className="pb-1 p-4">
                 <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Total Coverage</p>
                 <CardTitle className="text-3xl font-black">{rosterStats.coverage}%</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                 <div className="space-y-1.5">
                    <Progress value={rosterStats.coverage} className="h-1 bg-white/20" />
                    <p className="text-[9px] text-primary/60 font-black uppercase">Service readiness score</p>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* FILTERS */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-3 flex flex-row items-center gap-2 border-b">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Roster Management</CardTitle>
           </CardHeader>
           <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="md:col-span-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                       placeholder="Staff name or location..." 
                       className="pl-10 h-11 bg-secondary/10 border-none text-sm" 
                       value={search} 
                       onChange={(e) => setSearch(e.target.value)} 
                    />
                 </div>
                 <div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                       <SelectTrigger className="h-11 bg-secondary/10 border-none text-sm">
                          <SelectValue placeholder="All Personnel" />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Personnel Roles</SelectItem>
                          <SelectItem value="Desk Agent">Desk Agents Only</SelectItem>
                          <SelectItem value="Crew">Vessel Crew Only</SelectItem>
                          <SelectItem value="Port Officer">Port Officers Only</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                       <SelectTrigger className="h-11 bg-secondary/10 border-none text-sm">
                          <SelectValue placeholder="All Statuses" />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Shift Statuses</SelectItem>
                          {SHIFT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <Button 
                    variant="ghost" 
                    className="h-11 text-[10px] font-black uppercase text-muted-foreground underline"
                    onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}
                 >
                    Clear Filter Board
                 </Button>
              </div>
           </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Duty Board...</p>
          </div>
        ) : filteredShifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShifts.map((shift) => {
              const progress = calculateShiftProgress(shift.date, shift.startTime, shift.endTime);
              const hasConflict = conflictMap[shift.id];

              return (
                <Card key={shift.id} className="border-none shadow-sm hover:ring-2 hover:ring-primary/10 transition-all bg-white relative overflow-hidden group">
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full transition-all", 
                    shift.status === 'Ongoing' ? "bg-blue-500" : 
                    shift.status === 'Completed' ? "bg-green-500" : 
                    shift.status === 'Absent' ? "bg-destructive" : "bg-primary/20")} />
                  
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[8px] font-black uppercase text-accent border-accent/30 bg-accent/5">{shift.role}</Badge>
                             {hasConflict && (
                                <Badge variant="destructive" className="h-5 px-1.5 gap-1 text-[8px] font-black uppercase animate-pulse">
                                   <AlertCircle className="h-2.5 w-2.5" /> Conflict
                                </Badge>
                             )}
                          </div>
                          <CardTitle className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2">
                             <UserCheck className="h-4 w-4 text-primary/40" /> {shift.staffName}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                             <Calendar className="h-3 w-3" /> {shift.date}
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(shift.status)}
                       </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-5 pt-0 space-y-4">
                    <div className="bg-secondary/20 p-4 rounded-2xl space-y-3">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                {shift.assignmentType === 'Port' ? <MapPin className="h-3.5 w-3.5 text-accent" /> : <Ship className="h-3.5 w-3.5 text-accent" />}
                             </div>
                             <div className="space-y-0.5">
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">{shift.assignmentType} Deployment</p>
                                <p className="text-xs font-black text-primary truncate max-w-[150px]">{shift.assignmentName}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center gap-1 text-xs font-black text-primary">
                                <Clock className="h-3 w-3 text-accent" /> {shift.startTime}
                             </div>
                             <p className="text-[8px] font-bold text-muted-foreground uppercase">Ends @ {shift.endTime}</p>
                          </div>
                       </div>
                       
                       {shift.status === 'Ongoing' && (
                          <div className="space-y-1 pt-1">
                             <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                <span className="text-blue-600">Rotation Progress</span>
                                <span className="text-primary">{progress}%</span>
                             </div>
                             <Progress value={progress} className="h-1 bg-white" />
                          </div>
                       )}
                    </div>

                    {shift.notes && (
                       <div className="bg-orange-50 border-l-2 border-orange-400 p-2.5 rounded-r-lg">
                          <p className="text-[9px] text-orange-800 italic leading-relaxed line-clamp-2">
                             "{shift.notes}"
                          </p>
                       </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-dashed">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenDialog(shift, true)} 
                        className="h-8 text-[10px] font-black uppercase text-accent hover:bg-accent/5"
                        title="Duplicate shift for another day"
                      >
                         <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(shift)} className="h-8 w-8 p-0 hover:bg-primary/5 text-primary">
                           <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(shift.id)} className="h-8 w-8 p-0 hover:bg-destructive/5 text-destructive">
                           <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-white opacity-40 flex flex-col items-center">
            <CalendarClock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Rotation Found</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Personnel shifts will appear here once assignments are published.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                   <Briefcase className="h-6 w-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingShift ? "Modify Duty Log" : "New Duty Assignment"}</DialogTitle>
                   <DialogDescription className="text-primary-foreground/70 text-xs">Establish shifts for terminal agents and vessel crew.</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8 pb-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-accent" /> 1. Select Staff Member
                     </Label>
                     <Select value={formData.staffId} onValueChange={(val) => setFormData({...formData, staffId: val})}>
                        <SelectTrigger className="h-12 border-2 bg-white font-bold">
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
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-accent" /> 2. Service Date
                     </Label>
                     <Input 
                       type="date" 
                       className="h-12 border-2 font-black" 
                       value={formData.date} 
                       onChange={(e) => setFormData({...formData, date: e.target.value})} 
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shift Start</Label>
                     <Input 
                       type="time" 
                       className="h-11 border-2 font-black" 
                       value={formData.startTime} 
                       onChange={(e) => setFormData({...formData, startTime: e.target.value})} 
                     />
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shift End</Label>
                     <Input 
                       type="time" 
                       className="h-11 border-2 font-black" 
                       value={formData.endTime} 
                       onChange={(e) => setFormData({...formData, endTime: e.target.value})} 
                     />
                  </div>
               </div>

               <Separator />

               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                     <MapPin className="h-3.5 w-3.5 text-accent" /> 3. Assignment Allocation
                  </Label>
                  <div className="bg-secondary/10 p-5 rounded-3xl border-2 border-dashed border-secondary/50 space-y-5">
                     <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={formData.assignmentType === 'Port' ? 'default' : 'outline'}
                          className={cn("flex-1 h-12 gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all", 
                            formData.assignmentType === 'Port' ? "bg-primary text-white" : "bg-white border-2")}
                          onClick={() => setFormData({...formData, assignmentType: 'Port', assignmentId: ""})}
                        >
                           <MapPin className="h-4 w-4" /> Port/Desk
                        </Button>
                        <Button 
                          type="button" 
                          variant={formData.assignmentType === 'Vessel' ? 'default' : 'outline'}
                          className={cn("flex-1 h-12 gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all", 
                            formData.assignmentType === 'Vessel' ? "bg-primary text-white" : "bg-white border-2")}
                          onClick={() => setFormData({...formData, assignmentType: 'Vessel', assignmentId: ""})}
                        >
                           <Ship className="h-4 w-4" /> Vessel/Crew
                        </Button>
                     </div>

                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Select Precise Deployment Location</Label>
                        <Select value={formData.assignmentId} onValueChange={(val) => setFormData({...formData, assignmentId: val})}>
                           <SelectTrigger className="bg-white border-2 h-11 font-bold">
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

               <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                     <Activity className="h-4 w-4 text-accent" />
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest">4. Duty Status & Notes</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">Initial Status</Label>
                        <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                           <SelectTrigger className="h-11 border-2 bg-white font-bold">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {SHIFT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <Label className="text-[9px] font-bold uppercase text-muted-foreground">Internal Dispatcher Notes</Label>
                     <Textarea 
                       placeholder="e.g. Relieving Captain Santos, or Double-shift at desk..." 
                       className="min-h-[120px] border-2 text-sm p-4 rounded-2xl leading-relaxed" 
                       value={formData.notes}
                       onChange={(e) => setFormData({...formData, notes: e.target.value})}
                     />
                  </div>
               </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
             <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-14 rounded-2xl border-2">Cancel</Button>
             <Button 
                onClick={handleSave} 
                disabled={!formData.staffId || !formData.assignmentId}
                className="flex-1 bg-primary text-white font-black uppercase text-xs h-14 rounded-2xl shadow-xl tracking-[0.2em]"
             >
                {editingShift ? "Update Assignment" : "Finalize Roster"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
