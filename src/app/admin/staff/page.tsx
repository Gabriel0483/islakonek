
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Mail,
  Phone,
  ShieldCheck,
  Briefcase,
  MapPin,
  CheckCircle2,
  XCircle,
  Filter,
  Lock,
  UserCheck,
  Check,
  X,
  LayoutGrid,
  Info,
  Anchor,
  Ship
} from "lucide-react";
import { collection, doc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const STAFF_ROLES = [
  "Operations Manager",
  "Port Officer",
  "Desk Agent",
  "Crew",
  "Finance/Accounting"
];

const CREW_SPECIALTIES = [
  "Captain",
  "Engineer",
  "Deckhand"
];

const MODULE_LIST = [
  { id: "voyages", label: "Voyage Control" },
  { id: "boarding", label: "Boarding Mode" },
  { id: "desk", label: "Desk Bookings" },
  { id: "bookings", label: "Manage Bookings" },
  { id: "sales", label: "Sales Overview" },
  { id: "ops", label: "Operational Overview" },
  { id: "ports", label: "Port Registry" },
  { id: "routes", label: "Route Management" },
  { id: "fares", label: "Fare Management" },
  { id: "fleet", label: "Fleet & Maintenance" },
  { id: "schedules", label: "Trip Schedules" },
  { id: "staff", label: "Staff Management" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "SuperAdmin": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff"],
  "Operations Manager": ["voyages", "boarding", "desk", "bookings", "sales", "ops", "ports", "routes", "fares", "fleet", "schedules", "staff"],
  "Port Officer": ["voyages", "boarding", "desk", "ops", "schedules", "staff"],
  "Desk Agent": ["boarding", "desk", "bookings"],
  "Crew": ["boarding"],
  "Finance/Accounting": ["fares", "bookings", "sales"]
};

const HIERARCHY_MAP: Record<string, string[]> = {
  "SuperAdmin": STAFF_ROLES,
  "Operations Manager": ["Port Officer", "Finance/Accounting"],
  "Port Officer": ["Desk Agent", "Crew"]
};

export default function StaffManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  
  const staffRef = useMemoFirebase(() => (db && user) ? collection(db, "staff") : null, [db, user]);
  const portsRef = useMemoFirebase(() => (db && user) ? collection(db, "ports") : null, [db, user]);
  const vesselsRef = useMemoFirebase(() => (db && user) ? collection(db, "vessels") : null, [db, user]);
  
  const { data: allStaff, isLoading: isStaffLoading } = useCollection(staffRef);
  const { data: ports } = useCollection(portsRef);
  const { data: vessels } = useCollection(vesselsRef);

  const isSuperAdmin = user?.email === 'rielmagpantay@gmail.com';
  const myStaffRecord = allStaff?.find(s => s.email === user?.email);
  const currentRole = isSuperAdmin ? "SuperAdmin" : (myStaffRecord?.role || "Restricted");

  const managedRoles = HIERARCHY_MAP[currentRole] || [];
  const canManageAny = managedRoles.length > 0;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "",
    crewRole: "",
    phoneNumber: "",
    status: "Active",
    assignedPortId: "",
    assignedVesselId: "",
    authorizedModules: [] as string[]
  });

  const filteredStaff = allStaff?.filter(member => {
    const isManaged = isSuperAdmin || managedRoles.includes(member.role);
    if (!isManaged) return false;
    const matchesSearch = member.fullName.toLowerCase().includes(search.toLowerCase()) || member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const handleOpenDialog = (member: any = null) => {
    if (member) {
      setEditingStaff(member);
      setFormData({
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        crewRole: member.crewRole || "",
        phoneNumber: member.phoneNumber || "",
        status: member.status || "Active",
        assignedPortId: member.assignedPortId || "",
        assignedVesselId: member.assignedVesselId || "",
        authorizedModules: member.authorizedModules || ROLE_PERMISSIONS[member.role] || []
      });
    } else {
      const defaultRole = managedRoles[0] || "";
      setEditingStaff(null);
      setFormData({
        fullName: "",
        email: "",
        role: defaultRole,
        crewRole: "",
        phoneNumber: "",
        status: "Active",
        assignedPortId: "",
        assignedVesselId: "",
        authorizedModules: ROLE_PERMISSIONS[defaultRole] || []
      });
    }
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role: role,
      crewRole: role === 'Crew' ? (formData.crewRole || "Deckhand") : "",
      assignedVesselId: role === 'Crew' ? formData.assignedVesselId : "", // Only Crew can have ship assignments
      authorizedModules: ROLE_PERMISSIONS[role] || []
    });
  };

  const handleToggleModule = (moduleId: string) => {
    const current = [...formData.authorizedModules];
    if (current.includes(moduleId)) {
      setFormData({ ...formData, authorizedModules: current.filter(id => id !== moduleId) });
    } else {
      setFormData({ ...formData, authorizedModules: [...current, moduleId] });
    }
  };

  const handleSave = () => {
    if (!db || !formData.fullName || !formData.email) return;
    const timestamp = new Date().toISOString();
    const payload = { ...formData, updatedAt: timestamp };
    if (editingStaff) {
      updateDocumentNonBlocking(doc(db, "staff", editingStaff.id), payload);
    } else {
      const newId = Math.random().toString(36).substr(2, 9).toUpperCase();
      setDocumentNonBlocking(doc(db, "staff", newId), { ...payload, id: newId, createdAt: timestamp }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this staff member?")) {
      deleteDocumentNonBlocking(doc(db, "staff", id));
    }
  };

  const getPortName = (id: string) => ports?.find(p => p.id === id)?.name || "Unassigned";
  const getVesselName = (id: string) => vessels?.find(v => v.id === id)?.name || "No Ship Assigned";

  const getRoleBadge = (member: any) => {
    switch (member.role) {
      case 'Operations Manager': return <Badge className="bg-primary text-white">OP-MGR</Badge>;
      case 'Port Officer': return <Badge className="bg-blue-600 text-white">PORT-OFF</Badge>;
      case 'Desk Agent': return <Badge className="bg-green-600 text-white">DESK-AGT</Badge>;
      case 'Crew': 
        return (
          <div className="flex gap-1.5 items-center">
            <Badge className="bg-accent text-primary">CREW</Badge>
            {member.crewRole && <Badge variant="outline" className="text-[10px] font-black uppercase text-accent border-accent/30">{member.crewRole}</Badge>}
          </div>
        );
      case 'Finance/Accounting': return <Badge className="bg-indigo-600 text-white">FINANCE</Badge>;
      default: return <Badge variant="outline">{member.role}</Badge>;
    }
  };

  if (!canManageAny && !isStaffLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AdminNav />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4"><Lock className="h-10 w-10 text-destructive" /></div>
          <h2 className="text-xl font-bold text-primary mb-2 uppercase tracking-tight">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Staff Management is for SuperAdmins and authorized Managers only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-16 z-40">
        <div className="flex items-center gap-2">
           <Users className="h-5 w-5 text-accent" />
           <h1 className="text-lg font-bold font-headline text-primary uppercase tracking-tight">Personnel Registry</h1>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold h-10 px-4">
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Search Identity</Label>
                <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                <Input placeholder="Name or email..." className="pl-10 h-10 bg-secondary/10 border-none text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Role Filter</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                   <SelectTrigger className="h-10 bg-secondary/10 border-none text-sm"><SelectValue placeholder="All Managed Roles" /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">All Managed Roles</SelectItem>
                      {managedRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                   </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="bg-secondary/20 px-3 py-2 rounded-lg w-full flex items-center justify-between">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">Managed Personnel</span>
                   <span className="text-sm font-black text-primary">{filteredStaff?.length || 0}</span>
                </div>
              </div>
           </div>
        </div>

        {isStaffLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff?.map((member) => (
              <Card key={member.id} className="border-none shadow-sm hover:ring-2 hover:ring-primary/10 transition-all bg-white relative overflow-hidden group">
                <div className={cn("absolute top-0 left-0 w-1 h-full", member.status === 'Active' ? "bg-green-500" : "bg-destructive")} />
                <CardHeader className="p-5 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                       {member.fullName} {member.status === 'Active' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">{getRoleBadge(member)}</div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {member.email}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {getPortName(member.assignedPortId)}</div>
                    {member.role === 'Crew' && member.assignedVesselId && (
                      <div className="flex items-center gap-2"><Ship className="h-3.5 w-3.5" /> {getVesselName(member.assignedVesselId)}</div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(member)} className="h-8 text-[10px] font-black uppercase text-primary">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(member.id)} className="h-8 text-[10px] font-black uppercase text-destructive">Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl"><UserCheck className="h-6 w-6" /></div>
               <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingStaff ? "Update Staff Profile" : "Register Personnel"}</DialogTitle>
                 <DialogDescription className="text-primary-foreground/70 text-xs">Hierarchy scope: {currentRole}</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-8">
              {!editingStaff && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                   <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                   <div>
                     <p className="text-xs font-black text-blue-800 uppercase mb-1">Account Activation Required</p>
                     <p className="text-[10px] text-blue-700 leading-relaxed">
                       After registration, the staff member must sign up at <span className="font-bold underline">/signup</span> using this specific email to set their own password and activate their dashboard access.
                     </p>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Full Name</Label>
                   <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Email Address</Label>
                   <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-10 text-sm" disabled={!!editingStaff} />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Operational Role</Label>
                   <Select value={formData.role} onValueChange={handleRoleChange}>
                     <SelectTrigger className="h-10"><SelectValue placeholder="Select Role" /></SelectTrigger>
                     <SelectContent>{managedRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
                {formData.role === 'Crew' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-1">
                      <Anchor className="h-3 w-3" /> Crew Specialty
                    </Label>
                    <Select value={formData.crewRole} onValueChange={(val) => setFormData({...formData, crewRole: val})}>
                      <SelectTrigger className="h-10 border-accent/30"><SelectValue placeholder="Select Specialty" /></SelectTrigger>
                      <SelectContent>
                        {CREW_SPECIALTIES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* ASSIGNMENTS SECTION */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                   <MapPin className="h-4 w-4 text-accent" />
                   <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Manual Assignments</Label>
                </div>
                <div className={cn("grid gap-4 bg-secondary/5 p-4 rounded-xl border", formData.role === 'Crew' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  <div className="space-y-1.5">
                     <Label className="text-[9px] font-black uppercase text-muted-foreground">Port Assignment</Label>
                     <Select value={formData.assignedPortId || "none"} onValueChange={(val) => setFormData({...formData, assignedPortId: val === "none" ? "" : val})}>
                       <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Floating / Unassigned" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="none">Floating / Unassigned</SelectItem>
                         {ports?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                  </div>
                  {formData.role === 'Crew' && (
                    <div className="space-y-1.5 animate-in slide-in-from-right-2 duration-300">
                       <Label className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                         <Ship className="h-3 w-3" /> Ship Assignment
                       </Label>
                       <Select value={formData.assignedVesselId || "none"} onValueChange={(val) => setFormData({...formData, assignedVesselId: val === "none" ? "" : val})}>
                         <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="No Ship Assigned" /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">No Ship Assigned</SelectItem>
                           {vessels?.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* MODULE ACCESS SELECTION */}
              {formData.role && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-accent" />
                    <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Module Authorization</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-secondary/10 p-4 rounded-xl border border-secondary">
                    {MODULE_LIST.map((mod) => {
                      const isChecked = formData.authorizedModules.includes(mod.id);
                      return (
                        <div key={mod.id} className="flex items-center justify-between group">
                           <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`mod-${mod.id}`} 
                                checked={isChecked} 
                                onCheckedChange={() => handleToggleModule(mod.id)}
                              />
                              <Label 
                                htmlFor={`mod-${mod.id}`}
                                className={cn("text-[11px] font-bold cursor-pointer", isChecked ? "text-primary" : "text-muted-foreground/60")}
                              >
                                {mod.label}
                              </Label>
                           </div>
                           {isChecked && <Check className="h-3 w-3 text-green-600" />}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                    * Selection defaults to standard role permissions. Ticking modules creates a custom access profile.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/5 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-primary text-white font-black uppercase text-xs h-10 shadow-lg">
              {editingStaff ? "Apply Updates" : "Register Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
