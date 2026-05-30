import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useVehicleEntry,
  useListSlots,
  getListSlotsQueryKey,
  getListActiveVehiclesQueryKey,
  getGetDashboardStatsQueryKey,
  VehicleEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Car, ArrowRightToLine, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const entrySchema = z.object({
  vehicleNumber: z.string().min(2, "Vehicle number required"),
  ownerName: z.string().min(2, "Owner name required"),
  vehicleType: z.enum(["car", "bike", "truck"]),
});

type EntryForm = z.infer<typeof entrySchema>;

export default function Entry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [successEntry, setSuccessEntry] = useState<VehicleEntry | null>(null);

  const form = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { vehicleNumber: "", ownerName: "", vehicleType: "car" },
  });

  const vehicleType = form.watch("vehicleType");

  const { data: slots } = useListSlots({ status: "available" }, {
    query: { queryKey: getListSlotsQueryKey({ status: "available" }) },
  });

  const availableCount = slots?.length ?? 0;

  const entry = useVehicleEntry({
    mutation: {
      onSuccess: (data) => {
        setSuccessEntry(data);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ status: "available" }) });
        queryClient.invalidateQueries({ queryKey: getListActiveVehiclesQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Failed to register entry.";
        toast({ title: "Entry Failed", description: msg, variant: "destructive" });
      },
    },
  });

  const onSubmit = (values: EntryForm) => {
    setSuccessEntry(null);
    entry.mutate({
      data: {
        vehicleNumber: values.vehicleNumber.toUpperCase(),
        ownerName: values.ownerName,
        vehicleType: values.vehicleType,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vehicle Entry</h2>
        <p className="text-muted-foreground">Register a vehicle entering the parking facility.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${availableCount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
              {availableCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available Slots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {slots?.filter(s => s.slotType === vehicleType).length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available for {vehicleType}</p>
          </CardContent>
        </Card>
      </div>

      {availableCount === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">No available parking slots. All slots are currently occupied.</p>
        </div>
      )}

      {successEntry && (
        <Card className="border-green-400 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              Entry Registered Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Vehicle No.</dt>
              <dd className="font-mono font-medium" data-testid="text-entry-vehicle-number">{successEntry.vehicleNumber}</dd>
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{successEntry.ownerName}</dd>
              <dt className="text-muted-foreground">Slot Assigned</dt>
              <dd><Badge variant="outline" className="border-green-500 text-green-700">{successEntry.slotNumber}</Badge></dd>
              <dt className="text-muted-foreground">Entry Time</dt>
              <dd data-testid="text-entry-time">{format(new Date(successEntry.entryTime), "dd MMM yyyy, h:mm a")}</dd>
            </dl>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setSuccessEntry(null)}>
              Register Another Vehicle
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightToLine className="w-5 h-5 text-primary" />
            Entry Details
          </CardTitle>
          <CardDescription>Fill in the vehicle and owner information below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. MH12AB1234"
                        className="uppercase font-mono"
                        data-testid="input-vehicle-number"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" data-testid="input-owner-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vehicle-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="bike">Bike</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={entry.isPending || availableCount === 0}
                data-testid="button-submit-entry"
              >
                {entry.isPending ? "Registering..." : "Register Entry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
