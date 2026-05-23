
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
import { Separator } from "@/components/ui/separator";
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
  "Operations Manager": ["Port Officer", "Finance/Accounting", "Desk Agent", "Crew"],
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
    assignedPortIds: [] as string[],
    assignedVesselId: "",
    authorizedModules: [] as string[]
  });

  const filteredStaff = allStaff?.filter(member => {
    // Standard filtering logic
    const matchesSearch = member.fullName.toLowerCase().includes(search.toLowerCase()) || member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    
    // Hierarchy filtering: Users can only see what they manage
    const isVisibleInHierarchy = isSuperAdmin || managedRoles.includes(member.role);
    
    return matchesSearch && matchesRole && isVisibleInHierarchy;
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
        assignedPortIds: member.assignedPortIds || (member.assignedPortId ? [member.assignedPortId] : []),
        assignedVesselId: member.assignedVesselId || "",
        authorizedModules: member.authorizedModules || ROLE_PERMISSIONS[member.role] || []
      });
    } else {
      const defaultRole = managedRoles[0] || STAFF_ROLES[0];
      setEditingStaff(null);
      setFormData({
        fullName: "",
        email: "",
        role: defaultRole,
        crewRole: "",
        phoneNumber: "",
        status: "Active",
        assignedPortIds: [],
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
      assignedVesselId: role === 'Crew' ? formData.assignedVesselId : "", 
      authorizedModules: ROLE_PERMISSIONS[role] || []
    });
  };

  const handleTogglePort = (portId: string) => {
    const current = [...formData.assignedPortIds];
    if (current.includes(portId)) {
      setFormData({ ...formData, assignedPortIds: current.filter(id => id !== portId) });
    } else {
      setFormData({ ...formData, assignedPortIds: [...current, portId] });
    }
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
    if (confirm("Are you sure you want to permanently remove this staff member from the registry?")) {
      deleteDocumentNonBlocking(doc(db, "staff", id));
    }
  };

  const getPortNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return "Floating / Unassigned";
    return ids.map(id => ports?.find(p => p.id === id)?.name || "Unknown").join(", ");
  };

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
          <p className="text-sm text-muted-foreground max-w-md">Staff Management is reserved for SuperAdmins and authorized personnel with hierarchical oversight. Your current role does not have management permissions.</p>
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
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold h-10 px-4 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        {/* MANAGEMENT SCOPE BANNER */}
        <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                 <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Your Hierarchy Access</p>
                 <h2 className="text-sm font-black text-primary uppercase">{currentRole} Oversight</h2>
              </div>
           </div>
           <div className="flex gap-2">
              <Badge variant="outline" className="bg-white text-[10px] font-bold uppercase py-1 px-3 border-secondary-foreground/20">
                Managed Roles: {managedRoles.length}
              </Badge>
              <Badge variant="outline" className="bg-white text-[10px] font-bold uppercase py-1 px-3 border-secondary-foreground/20">
                Staff Count: {filteredStaff?.length || 0}
              </Badge>
           </div>
        </div>

        {/* FILTERS */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
           <CardHeader className="bg-secondary/10 py-3 flex flex-row items-center gap-2 border-b">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Directory Filters</CardTitle>
           </CardHeader>
           <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                       placeholder="Search by name, email, or mobile..." 
                       className="pl-10 h-11 bg-secondary/10 border-none text-sm" 
                       value={search} 
                       onChange={(e) => setSearch(e.target.value)} 
                    />
                 </div>
                 <div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                       <SelectTrigger className="h-11 bg-secondary/10 border-none text-sm">
                          <SelectValue placeholder="All Managed Roles" />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All Managed Roles</SelectItem>
                          {managedRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <Button 
                    variant="ghost" 
                    className="h-11 text-[10px] font-black uppercase text-muted-foreground underline"
                    onClick={() => { setSearch(""); setRoleFilter("all"); }}
                 >
                    Reset Directory
                 </Button>
              </div>
           </CardContent>
        </Card>

        {isStaffLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Personnel Database...</p>
          </div>
        ) : filteredStaff && filteredStaff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => (
              <Card key={member.id} className="border-none shadow-sm hover:ring-2 hover:ring-primary/10 transition-all bg-white relative overflow-hidden group">
                <div className={cn("absolute top-0 left-0 w-1.5 h-full transition-all", member.status === 'Active' ? "bg-green-500" : "bg-destructive")} />
                
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-black text-primary uppercase tracking-tight flex items-center gap-2">
                         {member.fullName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">{getRoleBadge(member)}</div>
                    </div>
                    {member.status === 'Active' ? (
                       <Badge className="bg-green-500/10 text-green-700 border-none h-5 px-1.5 gap-1 text-[8px] font-black uppercase">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                       </Badge>
                    ) : (
                       <Badge className="bg-destructive/10 text-destructive border-none h-5 px-1.5 gap-1 text-[8px] font-black uppercase">
                          <XCircle className="h-2.5 w-2.5" /> Inactive
                       </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                       <Mail className="h-3.5 w-3.5 opacity-40" /> 
                       <span className="truncate">{member.email}</span>
                    </div>
                    {member.phoneNumber && (
                       <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 opacity-40" /> {member.phoneNumber}
                       </div>
                    )}
                    <div className="bg-secondary/20 p-3 rounded-xl space-y-2">
                       <div className="flex items-start gap-2.5">
                          <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" /> 
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Assigned Terminals</p>
                             <p className="text-[10px] font-bold text-primary leading-tight">
                                {getPortNames(member.assignedPortIds || (member.assignedPortId ? [member.assignedPortId] : []))}
                             </p>
                          </div>
                       </div>
                       {member.role === 'Crew' && member.assignedVesselId && (
                          <div className="flex items-start gap-2.5 pt-1 border-t border-secondary-foreground/10 mt-1">
                             <Ship className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                             <div className="space-y-0.5">
                                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Assigned Vessel</p>
                                <p className="text-[10px] font-bold text-primary">{getVesselName(member.assignedVesselId)}</p>
                             </div>
                          </div>
                       )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-dashed">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(member)} className="h-8 text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                       <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(member.id)} className="h-8 text-[10px] font-black uppercase text-destructive hover:bg-destructive/5">
                       <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 border-2 border-dashed rounded-3xl opacity-40 flex flex-col items-center bg-white">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-black text-primary uppercase tracking-tight">No Personnel Found</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">Try adjusting your filters or add a new staff member to the registry.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col h-[90vh] max-h-[90vh]">
          <DialogHeader className="p-6 bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl">
                  <UserCheck className="h-6 w-6" />
               </div>
               <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tight">
                    {editingStaff ? "Update Staff Profile" : "New Personnel Induction"}
                 </DialogTitle>
                 <DialogDescription className="text-primary-foreground/70 text-xs">Hierarchy scope: {currentRole} management</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {!editingStaff && (
                <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-4 rounded-xl flex items-start gap-3">
                   <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                   <div>
                     <p className="text-xs font-black text-blue-800 uppercase mb-1">Induction Requirement</p>
                     <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                       Registering here establishes the internal role. The staff member must subsequently **sign up at the public portal** using this exact email to activate their secure credentials and dashboard access.
                     </p>
                   </div>
                </div>
              )}

              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" /> 1. Identity & Role
                 </Label>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/10 p-5 rounded-2xl border border-secondary">
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground">Full Name</Label>
                       <Input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="h-11 font-bold bg-white" placeholder="e.g. Capt. Juan Dela Cruz" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground">Email Address</Label>
                       <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="h-11 font-bold bg-white" disabled={!!editingStaff} placeholder="itinerary@islakonek.com" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground">Contact Number</Label>
                       <Input value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="h-11 font-bold bg-white" placeholder="0917XXXXXXX" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-muted-foreground">Operational Role</Label>
                       <Select value={formData.role} onValueChange={handleRoleChange}>
                         <SelectTrigger className="h-11 bg-white">
                            <SelectValue placeholder="Select Role" />
                         </SelectTrigger>
                         <SelectContent>
                            {managedRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>
                 </div>
              </div>

              {formData.role === 'Crew' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2">
                    <Ship className="h-4 w-4" /> 2. Maritime Specifics
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-accent/5 p-5 rounded-2xl border border-accent/20">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-accent">Crew Specialty</Label>
                      <Select value={formData.crewRole} onValueChange={(val) => setFormData({...formData, crewRole: val})}>
                        <SelectTrigger className="h-11 bg-white border-accent/30">
                           <SelectValue placeholder="Select Specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          {CREW_SPECIALTIES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[9px] font-bold uppercase text-accent">Assigned Vessel Hub</Label>
                       <Select value={formData.assignedVesselId || "none"} onValueChange={(val) => setFormData({...formData, assignedVesselId: val === "none" ? "" : val})}>
                         <SelectTrigger className="h-11 bg-white border-accent/30">
                            <SelectValue placeholder="No Ship Assigned" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">Floating / Unassigned</SelectItem>
                           {vessels?.filter(v => v.status === 'Operational').map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                         </SelectContent>
                       </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                   <Briefcase className="h-4 w-4 text-primary" />
                   <Label className="text-[10px] font-black uppercase text-primary tracking-widest">3. Port Allocation</Label>
                </div>
                <div className="bg-secondary/5 p-5 rounded-2xl border space-y-3">
                   <Label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Area of Responsibility (Terminal Access)
                   </Label>
                   <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {ports?.map(p => {
                        const isAssigned = formData.assignedPortIds.includes(p.id);
                        return (
                          <div key={p.id} className={cn("flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer", isAssigned ? "bg-primary/5 border-primary/20" : "bg-white border-transparent hover:border-secondary-foreground/10")} onClick={() => handleTogglePort(p.id)}>
                            <Checkbox 
                              id={`port-${p.id}`} 
                              checked={isAssigned} 
                              onCheckedChange={() => handleTogglePort(p.id)}
                            />
                            <Label 
                              htmlFor={`port-${p.id}`} 
                              className={cn("text-[11px] font-bold cursor-pointer transition-colors leading-none", isAssigned ? "text-primary" : "text-muted-foreground/60")}
                            >
                              {p.name}
                            </Label>
                          </div>
                        );
                      })}
                   </div>
                   <p className="text-[9px] text-muted-foreground italic leading-relaxed pt-2 border-t">Tick all terminals where this staff member is authorized to operate (e.g. check-in desk, boarding ramp).</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black uppercase text-primary tracking-widest">4. Module Authorization</Label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[8px] font-black uppercase text-accent hover:text-accent border border-accent/20"
                    onClick={() => setFormData({...formData, authorizedModules: ROLE_PERMISSIONS[formData.role] || []})}
                  >
                     Reset to Role Defaults
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-secondary/10 p-5 rounded-2xl border border-secondary">
                  {MODULE_LIST.map((mod) => {
                    const isChecked = formData.authorizedModules.includes(mod.id);
                    return (
                      <div key={mod.id} className={cn("flex items-center justify-between p-2 rounded-lg transition-all", isChecked ? "bg-white shadow-sm" : "opacity-60")}>
                         <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`mod-${mod.id}`} 
                              checked={isChecked} 
                              onCheckedChange={() => handleToggleModule(mod.id)}
                            />
                            <Label 
                              htmlFor={`mod-${mod.id}`}
                              className={cn("text-[10px] font-bold cursor-pointer uppercase tracking-tight", isChecked ? "text-primary" : "text-muted-foreground")}
                            >
                              {mod.label}
                            </Label>
                         </div>
                         {isChecked && <Check className="h-3 w-3 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between p-4 border-2 rounded-2xl bg-secondary/5 mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-black uppercase tracking-tight">Active Status</Label>
                    <p className="text-[9px] text-muted-foreground font-bold">Toggle to suspend portal access immediately.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-5", formData.status === 'Active' ? "text-green-600 bg-green-50" : "text-destructive bg-destructive/5")}>
                       {formData.status}
                    </Badge>
                    <Checkbox 
                      id="status-toggle" 
                      checked={formData.status === 'Active'} 
                      onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'Active' : 'Inactive'})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/10 gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold h-12 rounded-xl border-2">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-primary text-white font-black uppercase text-xs h-12 rounded-xl shadow-lg tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all">
              {editingStaff ? "Update Record" : "Finalize Induction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
