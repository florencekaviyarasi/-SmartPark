import { useState } from "react";
import { useSetupConfig } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getGetConfigQueryKey } from "@workspace/api-client-react";
import { Car, Bike, Truck, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const VEHICLE_OPTIONS = [
  { value: "car", label: "Car", icon: Car },
  { value: "bike", label: "Bike / Two-Wheeler", icon: Bike },
  { value: "truck", label: "Truck / Heavy Vehicle", icon: Truck },
];

export default function Setup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [lotName, setLotName] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(["car", "bike", "truck"]);
  const [baseRate, setBaseRate] = useState("20");
  const [additionalRate, setAdditionalRate] = useState("10");
  const [done, setDone] = useState(false);

  const setup = useSetupConfig({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
        setDone(true);
        setTimeout(() => setLocation("/"), 1500);
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Setup failed. Please try again.";
        toast({ title: "Setup Failed", description: msg, variant: "destructive" });
      },
    },
  });

  const toggleType = (t: string) => {
    setVehicleTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotName.trim()) {
      toast({ title: "Error", description: "Parking lot name is required.", variant: "destructive" });
      return;
    }
    if (vehicleTypes.length === 0) {
      toast({ title: "Error", description: "Select at least one vehicle type.", variant: "destructive" });
      return;
    }
    const base = parseFloat(baseRate);
    const add = parseFloat(additionalRate);
    if (isNaN(base) || base <= 0 || isNaN(add) || add < 0) {
      toast({ title: "Error", description: "Enter valid parking rates.", variant: "destructive" });
      return;
    }
    setup.mutate({
      data: { lotName: lotName.trim(), vehicleTypes, baseRate: base, additionalHourlyRate: add },
    });
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Setup Complete!</h2>
          <p className="text-muted-foreground">30 parking slots created. Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Settings className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Parking Lot Setup</h1>
          <p className="text-muted-foreground">
            Configure your parking facility. This creates <strong>30 slots</strong> across 3 floors (A, B, C — 10 slots each).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lot Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Facility Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="lot-name">Parking Lot Name</Label>
                <Input
                  id="lot-name"
                  placeholder="e.g. City Centre Parking"
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                  data-testid="input-lot-name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Slot Layout Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Slot Layout</CardTitle>
              <CardDescription>Auto-generated — 3 floors × 10 slots = 30 total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["A", "B", "C"].map((floor) => (
                  <div key={floor}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Floor {floor}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-700 flex items-center justify-center text-xs font-mono text-green-700 dark:text-green-400 font-semibold"
                        >
                          {floor}{i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Supported Vehicle Types</CardTitle>
              <CardDescription>Select all vehicle types your lot will accept</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {VEHICLE_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const selected = vehicleTypes.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleType(value)}
                      data-testid={`toggle-type-${value}`}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium">{label}</span>
                      {selected && <Badge className="text-[10px] py-0 h-4">Selected</Badge>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parking Rates</CardTitle>
              <CardDescription>Fees applied to all vehicle types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base-rate">First Hour Rate (₹)</Label>
                <Input
                  id="base-rate"
                  type="number"
                  min="1"
                  step="0.5"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  data-testid="input-base-rate"
                />
                <p className="text-xs text-muted-foreground">Charged for the first hour of parking</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-rate">Additional Hour Rate (₹)</Label>
                <Input
                  id="add-rate"
                  type="number"
                  min="0"
                  step="0.5"
                  value={additionalRate}
                  onChange={(e) => setAdditionalRate(e.target.value)}
                  data-testid="input-additional-rate"
                />
                <p className="text-xs text-muted-foreground">Charged for every hour after the first</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Fee Preview</p>
                <div className="space-y-0.5 text-muted-foreground">
                  <p>1 hour → ₹{parseFloat(baseRate) || 0}</p>
                  <p>2 hours → ₹{(parseFloat(baseRate) || 0) + (parseFloat(additionalRate) || 0)}</p>
                  <p>3 hours → ₹{(parseFloat(baseRate) || 0) + 2 * (parseFloat(additionalRate) || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={setup.isPending}
            data-testid="button-complete-setup"
          >
            {setup.isPending ? "Setting up…" : "Complete Setup & Create 30 Slots"}
          </Button>
        </form>
      </div>
    </div>
  );
}
