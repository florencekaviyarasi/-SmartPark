import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSlots,
  getListSlotsQueryKey,
  useCreateSlot,
  useDeleteSlot,
  useUpdateSlot,
  getGetSlotQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, ParkingSquare, Car, Bike, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const vehicleTypeIcon = { car: Car, bike: Bike, truck: Truck };

export default function Slots() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "available" | "occupied">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<{ id: number; slotNumber: string; slotType: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ slotNumber: "", slotType: "car" });

  const params = filter === "all" ? {} : { status: filter as "available" | "occupied" };
  const { data: slots, isLoading } = useListSlots(params, {
    query: { queryKey: getListSlotsQueryKey(params) },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ status: "available" }) });
    queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ status: "occupied" }) });
  };

  const createSlot = useCreateSlot({
    mutation: {
      onSuccess: () => {
        invalidate();
        setAddOpen(false);
        setForm({ slotNumber: "", slotType: "car" });
        toast({ title: "Slot added", description: `Slot ${form.slotNumber} created.` });
      },
      onError: () => toast({ title: "Error", description: "Failed to create slot.", variant: "destructive" }),
    },
  });

  const updateSlot = useUpdateSlot({
    mutation: {
      onSuccess: () => {
        invalidate();
        if (editSlot) queryClient.invalidateQueries({ queryKey: getGetSlotQueryKey(editSlot.id) });
        setEditSlot(null);
        toast({ title: "Slot updated" });
      },
      onError: () => toast({ title: "Error", description: "Failed to update slot.", variant: "destructive" }),
    },
  });

  const deleteSlot = useDeleteSlot({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDeleteId(null);
        toast({ title: "Slot deleted" });
      },
      onError: () => toast({ title: "Error", description: "Failed to delete slot.", variant: "destructive" }),
    },
  });

  const stats = {
    total: slots?.length ?? 0,
    available: slots?.filter((s) => s.status === "available").length ?? 0,
    occupied: slots?.filter((s) => s.status === "occupied").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Parking Slots</h2>
          <p className="text-muted-foreground">Manage your parking slot inventory.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Slot
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Slots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.available}</div>
            <p className="text-xs text-muted-foreground mt-1">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{stats.occupied}</div>
            <p className="text-xs text-muted-foreground mt-1">Occupied</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["all", "available", "occupied"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : slots?.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <ParkingSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No parking slots available</p>
              <p className="text-sm mt-1">Add slots manually or they were auto-generated during setup.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {slots?.map((slot) => {
            const Icon = vehicleTypeIcon[slot.slotType as keyof typeof vehicleTypeIcon] || Car;
            const isOccupied = slot.status === "occupied";
            return (
              <div
                key={slot.id}
                className={`relative group rounded-lg border-2 p-3 flex flex-col items-center justify-center gap-1 transition-all ${
                  isOccupied
                    ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                    : "border-green-400 bg-green-50 dark:bg-green-950/30"
                }`}
              >
                <Icon className={`w-5 h-5 ${isOccupied ? "text-red-500" : "text-green-600"}`} />
                <span className="text-sm font-bold">{slot.slotNumber}</span>
                <Badge
                  variant={isOccupied ? "destructive" : "outline"}
                  className={`text-xs ${!isOccupied ? "border-green-500 text-green-600" : ""}`}
                >
                  {slot.status}
                </Badge>
                {!isOccupied && (
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                    <button onClick={() => setEditSlot({ id: slot.id, slotNumber: slot.slotNumber, slotType: slot.slotType })} className="p-1 rounded hover:bg-background/80">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteId(slot.id)} className="p-1 rounded hover:bg-background/80 text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Slot Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Slot</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Slot Number</Label>
              <Input placeholder="e.g. D-01" value={form.slotNumber} onChange={(e) => setForm((f) => ({ ...f, slotNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={form.slotType} onValueChange={(v) => setForm((f) => ({ ...f, slotType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createSlot.mutate({ data: { slotNumber: form.slotNumber.trim().toUpperCase(), slotType: form.slotType as "car" | "bike" | "truck" } })} disabled={createSlot.isPending || !form.slotNumber.trim()}>
              {createSlot.isPending ? "Adding…" : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={(open) => !open && setEditSlot(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Slot</DialogTitle></DialogHeader>
          {editSlot && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Slot Number</Label>
                <Input value={editSlot.slotNumber} onChange={(e) => setEditSlot((s) => s && { ...s, slotNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select value={editSlot.slotType} onValueChange={(v) => setEditSlot((s) => s && { ...s, slotType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={() => editSlot && updateSlot.mutate({ id: editSlot.id, data: { slotNumber: editSlot.slotNumber, slotType: editSlot.slotType as "car" | "bike" | "truck" } })} disabled={updateSlot.isPending}>
              {updateSlot.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slot</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the slot. Only available (unoccupied) slots can be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteSlot.mutate({ id: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
