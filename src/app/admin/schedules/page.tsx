
"use client";

import { useState } from "react";
import { 
  CalendarDays, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Search,
  Clock,
  Waypoints,
  Ship,
  Calendar,
  CheckCircle2,
  X,
  Users,
  Tag,
  ListOrdered,
  AlertTriangle,
  CloudOff
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  setDocumentNonBlocking,
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase/non-blocking-updates";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
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
import { Switch } from "@/components/ui/switch";

export default function SchedulesPage() {
  const db = useFirestore();
  
  const schedulesCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "schedules");
  }, [db]);

  const routesCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "routes");
  }, [db]);

  const vesselsCollection = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "vessels");
  }, [db]);
  
  const { data: schedules, isLoading: isSchedulesLoading } = useCollection(schedulesCollection);
  const { data: routes } = useCollection(routesCollection);
  const { data: vessels } = useCollection(vesselsCollection);

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);

  const [formData, setFormData] = useState({
    tripCode: "",
    routeId: "",
    vesselId: "",
    departureTime: "08:00",
    passengerCapacity: 0,
    waitlistLimit: 10,
    type: "Daily",
    specialDates: [] as string[],
    description: "",
    isActive: true,
    isCancelled: false,
    cancellationReason: ""
  });

  const [newDate, setNewDate] = useState("");

  const filteredSchedules = schedules?.filter(s => {
    const route = routes?.find(r => r.id === s.routeId);
    const routeName = route?.name || "";
    const tripCode = s.tripCode || "";
    const matchesSearch = routeName.toLowerCase().includes(search.toLowerCase()) || 
                          tripCode.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleOpenDialog = (schedule: any = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        tripCode: schedule.tripCode || "",
        routeId: schedule.routeId || "",
        vesselId: schedule.vesselId || "",
        departureTime: schedule.departureTime || "08:00",
        passengerCapacity: schedule.passengerCapacity || 0,
        waitlistLimit: schedule.waitlistLimit !== undefined ? schedule.waitlistLimit : 10,
        type: schedule.type || "Daily",
        specialDates: schedule.specialDates || [],
        description: schedule.description || "",
        isActive: schedule.isActive !== undefined ? schedule.isActive : true,
        isCancelled: schedule.isCancelled || false,
        cancellationReason: schedule.cancellationReason || ""
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        tripCode: "",
        routeId: "",
        vesselId: "",
        departureTime: "08:00",
        passengerCapacity: 0,
        waitlistLimit: 10,
        type: "Daily",
        specialDates: [],
        description: "",
        isActive: true,
        isCancelled: false,
        cancellationReason: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleVesselChange = (vesselId: string) => {
    const realVesselId = vesselId === "unassigned" ? "" : vesselId;
    const selectedVessel = vessels?.find(v => v.id === realVesselId);
    
    setFormData({
      ...formData,
      vesselId: realVesselId,
      passengerCapacity: selectedVessel ? selectedVessel.passengerCapacity : formData.passengerCapacity
    });
  };

  const handleAddDate = () => {
    if (!newDate) return;
    if (formData.specialDates.includes(newDate)) return;
    setFormData({ ...formData, specialDates: [...formData.specialDates, newDate].sort() });
    setNewDate("");
  };

  const handleRemoveDate = (date: string) => {
    setFormData({ ...formData, specialDates: formData.specialDates.filter(d => d !== date) });
  };

  const handleSave = () => {
    if (!db || !formData.tripCode || !formData.routeId) return;
    
    const tripType = formData.specialDates.length > 0 ? "Special" : "Daily";
    const timestamp = new Date().toISOString();
    const payload = {
      ...formData,
      tripCode: formData.tripCode.toUpperCase(),
      passengerCapacity: Number(formData.passengerCapacity),
      waitlistLimit: Number(formData.waitlistLimit),
      type: tripType,
      updatedAt: timestamp
    };

    if (editingSchedule) {
      const scheduleRef = doc(db, "schedules", editingSchedule.id);
      updateDocumentNonBlocking(scheduleRef, payload);
    } else {
      const newId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const scheduleRef = doc(db, "schedules", newId);
      setDocumentNonBlocking(scheduleRef, { 
        ...payload, 
        id: newId, 
        createdAt: timestamp 
      }, { merge: true });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    if (confirm("Are you sure you want to delete this trip schedule? This cannot be undone.")) {
      const scheduleRef = doc(db, "schedules", id);
      deleteDocumentNonBlocking(scheduleRef);
    }
  };

  const getRouteName = (id: string) => routes?.find(r => r.id === id)?.name || "Unknown Route";
  const getVesselName = (id: string) => {
    if (!id) return "Pending Assignment";
    return vessels?.find(v => v.id === id)?.name || "Unknown Vessel";
  };

  const isLoading = isSchedulesLoading;

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-bold font-headline text-primary flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            Trip Schedules
          </h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search schedules by route or Trip ID..." 
                className="pl-10 h-10 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary font-bold hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" /> New Trip Schedule
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Coordinating island timetables...</p>
            </div>
          ) : filteredSchedules && filteredSchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className={`border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${!schedule.isActive ? 'opacity-60' : ''} ${schedule.isCancelled ? 'border-2 border-destructive' : ''}`}>
                  <div className={`absolute top-0 right-0 p-2 ${schedule.isCancelled ? 'bg-destructive' : schedule.type === 'Daily' ? 'bg-blue-500' : 'bg-orange-500'} text-white text-[10px] font-bold uppercase rounded-bl-lg`}>
                    {schedule.isCancelled ? 'Cancelled' : schedule.type}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-3 w-3 text-accent" />
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">{schedule.tripCode}</span>
                    </div>
                    <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                      <Waypoints className="h-4 w-4 text-accent" />
                      {getRouteName(schedule.routeId)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-3 w-3" /> {schedule.departureTime}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {schedule.isCancelled && (
                       <div className="p-2 rounded bg-destructive/10 text-destructive text-[10px] font-bold flex items-center gap-2 mb-2">
                         <CloudOff className="h-3 w-3" /> CANCELLED: {schedule.cancellationReason || "Weather/Force Majeure"}
                       </div>
                    )}
                    <div className="bg-secondary/20 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Vessel</span>
                        <span className={`font-bold flex items-center gap-1 ${!schedule.vesselId ? 'text-orange-600 italic' : ''}`}>
                          <Ship className="h-3 w-3" /> {getVesselName(schedule.vesselId)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Capacity</span>
                        <span className="font-bold flex items-center gap-1">
                          <Users className="h-3 w-3" /> {schedule.passengerCapacity || 0} Seats
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Frequency</p>
                        {schedule.type === 'Daily' ? (
                          <p className="text-xs font-medium">Daily Service</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {schedule.specialDates?.map((date: string) => (
                              <Badge key={date} variant="outline" className="text-[9px] h-4 bg-white">
                                {date}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="flex gap-2">
                        <Badge variant={schedule.isActive ? "default" : "outline"} className={schedule.isActive && !schedule.isCancelled ? "bg-green-500" : ""}>
                          {schedule.isCancelled ? "Cancelled" : schedule.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(schedule)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)} className="h-8 w-8 p-0 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl opacity-50 bg-secondary/10">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold">No schedules defined</h3>
              <p className="text-muted-foreground">Assign vessels and departure times to your active routes.</p>
            </div>
          )}
        </main>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Schedule" : "New Trip Schedule"}</DialogTitle>
              <DialogDescription>
                Configure the route, vessel, and timing for this maritime trip.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>Trip ID / Code</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="e.g. ML-101" 
                      className="pl-10 uppercase font-black"
                      value={formData.tripCode} 
                      onChange={(e) => setFormData({...formData, tripCode: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Maritime Route</Label>
                    <Select 
                      value={formData.routeId} 
                      onValueChange={(val) => setFormData({...formData, routeId: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes?.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Vessel</Label>
                    <Select 
                      value={formData.vesselId || "unassigned"} 
                      onValueChange={handleVesselChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pending Assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-orange-600 italic">TBA / Pending Assignment</SelectItem>
                        {vessels?.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} {v.status !== 'Operational' ? `(${v.status})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input 
                      type="time" 
                      value={formData.departureTime} 
                      onChange={(e) => setFormData({...formData, departureTime: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passenger Capacity</Label>
                    <Input 
                      type="number"
                      placeholder="Seats available"
                      value={formData.passengerCapacity} 
                      onChange={(e) => setFormData({...formData, passengerCapacity: Number(e.target.value)})} 
                    />
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-secondary/5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="font-bold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" /> Emergency Cancellation
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Mark this trip as cancelled due to weather or technical issues.</p>
                    </div>
                    <Switch 
                      checked={formData.isCancelled} 
                      onCheckedChange={(checked) => setFormData({...formData, isCancelled: checked})}
                    />
                  </div>
                  {formData.isCancelled && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs">Cancellation Reason</Label>
                      <Select 
                        value={formData.cancellationReason} 
                        onValueChange={(val) => setFormData({...formData, cancellationReason: val})}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Adverse Weather Conditions">Adverse Weather Conditions</SelectItem>
                          <SelectItem value="Technical/Engine Issue">Technical/Engine Issue</SelectItem>
                          <SelectItem value="Port Closure">Port Closure</SelectItem>
                          <SelectItem value="Force Majeure">Force Majeure</SelectItem>
                          <SelectItem value="Other Operational Reason">Other Operational Reason</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Waitlist Limit</Label>
                    <Input 
                      type="number"
                      value={formData.waitlistLimit} 
                      onChange={(e) => setFormData({...formData, waitlistLimit: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/5 self-end h-[40px]">
                    <Label className="flex items-center gap-2">Trip Active</Label>
                    <Switch 
                      checked={formData.isActive} 
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-accent" /> Special Trip Dates
                    </Label>
                    <Badge variant={formData.specialDates.length > 0 ? "default" : "secondary"}>
                      {formData.specialDates.length > 0 ? "Special Schedule" : "Daily Schedule"}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={newDate} 
                      onChange={(e) => setNewDate(e.target.value)} 
                      className="h-10"
                    />
                    <Button onClick={handleAddDate} className="bg-primary text-white">Add Date</Button>
                  </div>

                  {formData.specialDates.length > 0 && (
                    <div className="bg-secondary/30 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {formData.specialDates.map(date => (
                          <div key={date} className="flex items-center gap-1 bg-white border px-2 py-1 rounded text-xs">
                            {date}
                            <button onClick={() => handleRemoveDate(date)} className="text-destructive hover:text-destructive/80">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                className="bg-primary text-white"
                disabled={!formData.tripCode || !formData.routeId}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> {editingSchedule ? "Save Changes" : "Create Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
