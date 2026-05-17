
"use client";

import { useState } from "react";
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
  MoreVertical,
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
import { cn } from "@/lib/utils";

const STAFF_ROLES = [
  "Operations Manager",
  "Port Officer",
  "Desk Agent",
  "Crew",
  "Finance/Accounting"
];

export default function StaffManagementPage() {
  const db = useFirestore();
  
  const staffCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "staff");
  }, [db]);

  const portsCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "ports");
  }, [db]);
  
  const { data: staff, isLoading: isStaffLoading } = useCollection(staffCollection);
  const { data: ports } = useCollection(portsCollection);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "Desk Agent",
    phoneNumber: "",
    status: "Active",
    assignedPortId: ""
  });

  const filteredStaff = staff?.filter(member => {
    const matchesSearch = 
      member.fullName.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    
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
        phoneNumber: member.phoneNumber || "",
        status: member.status || "Active",
        assignedPortId: member.assignedPortId || ""
      });
    } else {
      setEditingStaff(null);
      setFormData({
        fullName: "",
        email: "",
        role: "Desk Agent",
        phoneNumber: "",
        status: "Active",
        assignedPortId: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !formData.fullName || !formData.email) return;
    
    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      updatedAt: timestamp
    };

    if (editingStaff) {
      const staffRef = doc(db, "staff", editingStaff.id);
      updateDocumentNonBlocking(staffRef, payload);
    } else {
      const newId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const staffRef = doc(db, "staff", newId);
      setDocumentNonBlocking(staffRef, { ...payload, id: newId, createdAt: timestamp }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this staff member from the registry?")) {
      const staffRef = doc(db, "staff", id);
      deleteDocumentNonBlocking(staffRef);
    }
  };

  const getPortName = (id: string) => ports?.find(p => p.id === id)?.name || "Unassigned";

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Operations Manager': return <Badge className="bg-primary text-white">OP-MGR</Badge>;
      case 'Port Officer': return <Badge className="bg-blue-600 text-white">PORT-OFF</Badge>;
      case 'Desk Agent': return <Badge className="bg-green-600 text-white">DESK-AGT</Badge>;
      case 'Crew': return <Badge className="bg-accent text-primary">CREW</Badge>;
      case 'Finance/Accounting': return <Badge className="bg-indigo-600 text-white">FINANCE</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AdminNav />
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white sticky top-0 z-40">
        <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          Staff Management
        </h1>
        <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90 h-10 px-4">
          <Plus className="h-4 w-4 mr-2" /> Add Staff Member
        </Button>
      </header>

      <main className="p-4 sm:p-6 space-y-6 container mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-secondary/50 space-y-4">
           <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest border-b pb-2">
              <Filter className="h-3.5 w-3.5 text-accent" /> Personnel Filters
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Search Name/Email</Label>
                <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="e.g. Juan Dela Cruz..." 
                  className="pl-10 h-10 bg-secondary/10 border-none text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Department / Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                   <SelectTrigger className="h-10 bg-secondary/10 border-none text-sm">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All Departments" />
                      </div>
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {STAFF_ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex gap-2">
                   <div className="bg-secondary/20 px-3 py-2 rounded-lg flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                         <div className="h-2 w-2 rounded-full bg-green-500" />
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">Active: {staff?.filter(s => s.status === 'Active').length || 0}</span>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>

        {isStaffLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Accessing staff registry...</p>
          </div>
        ) : filteredStaff && filteredStaff.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((member) => (
              <Card key={member.id} className="border-none shadow-sm hover:ring-2 hover:ring-primary/10 transition-all bg-white relative overflow-hidden group">
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  member.status === 'Active' ? "bg-green-500" : "bg-destructive"
                )} />
                
                <CardHeader className="pb-3 p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                         {member.fullName}
                         {member.status === 'Active' ? (
                           <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                         ) : (
                           <XCircle className="h-3.5 w-3.5 text-destructive" />
                         )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                         {getRoleBadge(member.role)}
                         <span className="text-[10px] font-mono text-muted-foreground">ID: {member.id}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {member.email}
                    </div>
                    {member.phoneNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {member.phoneNumber}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {getPortName(member.assignedPortId)}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(member)} className="h-8 px-2 text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(member.id)} className="h-8 px-2 text-[10px] font-black uppercase text-destructive hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed rounded-3xl bg-white opacity-40 flex flex-col items-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-tight">No personnel records found</h3>
            <p className="text-sm mt-2">Add your operations staff to the registry to begin.</p>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/20 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
               </div>
               <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tight">
                   {editingStaff ? "Update Staff Profile" : "New Staff Registration"}
                 </DialogTitle>
                 <DialogDescription className="text-primary-foreground/70 text-xs">
                   Define identity and operational role for maritime personnel.
                 </DialogDescription>
               </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Legal Full Name</Label>
                    <Input 
                      value={formData.fullName} 
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                      placeholder="e.g. Juan Dela Cruz"
                      className="h-11 text-sm border-2"
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Staff Email</Label>
                       <Input 
                         type="email"
                         value={formData.email} 
                         onChange={(e) => setFormData({...formData, email: e.target.value})} 
                         placeholder="staff@islakonek.com"
                         className="h-11 text-sm border-2"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mobile Number</Label>
                       <Input 
                         value={formData.phoneNumber} 
                         onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
                         placeholder="09XXXXXXXXX"
                         className="h-11 text-sm border-2"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Assigned Department</Label>
                       <Select 
                         value={formData.role} 
                         onValueChange={(val) => setFormData({...formData, role: val})}
                       >
                         <SelectTrigger className="h-11 border-2">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {STAFF_ROLES.map(role => (
                             <SelectItem key={role} value={role}>{role}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Employment Status</Label>
                       <Select 
                         value={formData.status} 
                         onValueChange={(val) => setFormData({...formData, status: val})}
                       >
                         <SelectTrigger className="h-11 border-2">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Active">Active Duty</SelectItem>
                           <SelectItem value="Inactive">On Leave / Inactive</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Primary Port Assignment</Label>
                    <Select 
                      value={formData.assignedPortId} 
                      onValueChange={(val) => setFormData({...formData, assignedPortId: val})}
                    >
                      <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Floating / No specific port" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned / Floating</SelectItem>
                        {ports?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-secondary/5 gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 font-bold">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 bg-primary text-white font-black uppercase tracking-wider text-xs h-10 shadow-lg">
              {editingStaff ? "Update Registry" : "Finalize Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
