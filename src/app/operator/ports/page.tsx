"use client";

import { useState } from "react";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Anchor
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { 
  setDocumentNonBlocking,
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { OperatorSidebar } from "@/components/operator-sidebar";
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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PortsPage() {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const portsCollection = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "ports");
  }, [db, user]);
  
  const { data: ports, isLoading: isPortsLoading } = useCollection(portsCollection);

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "",
    country: "",
    description: ""
  });

  const filteredPorts = ports?.filter(port => 
    port.name.toLowerCase().includes(search.toLowerCase()) ||
    port.city.toLowerCase().includes(search.toLowerCase()) ||
    port.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (port: any = null) => {
    if (port) {
      setEditingPort(port);
      setFormData({
        name: port.name,
        code: port.code || "",
        city: port.city,
        country: port.country,
        description: port.description || ""
      });
    } else {
      setEditingPort(null);
      setFormData({
        name: "",
        code: "",
        city: "",
        country: "",
        description: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !portsCollection) return;
    
    const timestamp = new Date().toISOString();
    if (editingPort) {
      const portRef = doc(db, "ports", editingPort.id);
      updateDocumentNonBlocking(portRef, {
        ...formData,
        updatedAt: timestamp
      });
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      const portRef = doc(db, "ports", newId);
      setDocumentNonBlocking(portRef, {
        ...formData,
        id: newId,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this port?")) {
      const portRef = doc(db, "ports", id);
      deleteDocumentNonBlocking(portRef);
    }
  };

  const isLoading = isUserLoading || isPortsLoading;

  return (
    <SidebarProvider>
      <OperatorSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <Anchor className="h-5 w-5 text-accent" />
            Port Registry
          </h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search ports by name, city, or code..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90" disabled={!user}>
              <Plus className="h-4 w-4 mr-2" /> Add New Port
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Synchronizing with maritime registry...</p>
            </div>
          ) : filteredPorts && filteredPorts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPorts.map((port) => (
                <Card key={port.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-primary">{port.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {port.city}, {port.country}
                        </CardDescription>
                      </div>
                      <div className="bg-secondary px-2 py-1 rounded text-[10px] font-bold text-primary">
                        {port.code}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {port.description || "No description provided."}
                    </p>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(port)} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(port.id)} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold">No ports found</h3>
              <p className="text-muted-foreground">Start by adding your first maritime port entry.</p>
            </div>
          )}
        </main>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPort ? "Edit Port" : "Add New Port"}</DialogTitle>
              <DialogDescription>
                Fill in the details below to define a maritime port.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Port Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Port of Manila"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Port Code</Label>
                    <Input 
                      id="code" 
                      value={formData.code} 
                      onChange={(e) => setFormData({...formData, code: e.target.value})} 
                      placeholder="e.g. MNL"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={formData.city} 
                      onChange={(e) => setFormData({...formData, city: e.target.value})} 
                      placeholder="e.g. Manila"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input 
                      id="country" 
                      value={formData.country} 
                      onChange={(e) => setFormData({...formData, country: e.target.value})} 
                      placeholder="e.g. Philippines"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    placeholder="Brief details about port facilities..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-primary text-white">
                {editingPort ? "Save Changes" : "Create Port"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
