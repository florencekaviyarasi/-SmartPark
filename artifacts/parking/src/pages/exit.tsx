import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useVehicleExit,
  useSearchVehicle,
  getSearchVehicleQueryKey,
  getListSlotsQueryKey,
  getListActiveVehiclesQueryKey,
  getGetDashboardStatsQueryKey,
  ParkingTransaction,
  VehicleEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Search, ArrowLeftFromLine, Clock, IndianRupee, MapPin, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceStrict } from "date-fns";

export default function Exit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [completedTransaction, setCompletedTransaction] = useState<ParkingTransaction | null>(null);

  const { data: foundVehicle, isLoading: searching, isError: notFound } = useSearchVehicle(
    { vehicleNumber: searchTerm },
    {
      query: {
        queryKey: getSearchVehicleQueryKey({ vehicleNumber: searchTerm }),
        enabled: searchTerm.length > 0,
        retry: false,
      },
    },
  );

  const exitMutation = useVehicleExit({
    mutation: {
      onSuccess: (data) => {
        setCompletedTransaction(data);
        setSearchTerm("");
        setSearchQuery("");
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ status: "available" }) });
        queryClient.invalidateQueries({ queryKey: getListActiveVehiclesQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Failed to register exit.";
        toast({ title: "Exit Failed", description: msg, variant: "destructive" });
      },
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSearchTerm(searchQuery.trim().toUpperCase());
    setCompletedTransaction(null);
  };

  const handleExit = () => {
    if (!foundVehicle) return;
    exitMutation.mutate({ data: { vehicleNumber: foundVehicle.vehicleNumber } });
  };

  const calculateEstimatedFee = (entryTime: string) => {
    const durationMs = Date.now() - new Date(entryTime).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours <= 1) return 20;
    return 20 + Math.ceil(durationHours - 1) * 10;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vehicle Exit</h2>
        <p className="text-muted-foreground">Search for a vehicle and process its exit with fee calculation.</p>
      </div>

      {completedTransaction && (
        <Card className="border-green-400 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              Exit Processed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Vehicle No.</dt>
              <dd className="font-mono font-bold" data-testid="text-exit-vehicle-number">{completedTransaction.vehicleNumber}</dd>
              <dt className="text-muted-foreground">Duration</dt>
              <dd data-testid="text-exit-duration">{completedTransaction.durationMinutes} minutes</dd>
              <dt className="text-muted-foreground">Entry Time</dt>
              <dd>{format(new Date(completedTransaction.entryTime), "dd MMM, h:mm a")}</dd>
              <dt className="text-muted-foreground">Exit Time</dt>
              <dd>{format(new Date(completedTransaction.exitTime), "dd MMM, h:mm a")}</dd>
              <dt className="text-muted-foreground font-medium text-base">Total Fee</dt>
              <dd className="font-bold text-xl text-green-700 dark:text-green-400" data-testid="text-exit-fee">
                ₹{completedTransaction.fee.toFixed(2)}
              </dd>
            </dl>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setCompletedTransaction(null)}>
              Process Another Exit
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Vehicle
          </CardTitle>
          <CardDescription>Enter the vehicle number to find it in the parking lot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Vehicle number (e.g. MH12AB1234)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="uppercase font-mono"
              data-testid="input-search-vehicle"
            />
            <Button onClick={handleSearch} disabled={searching} data-testid="button-search-vehicle">
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchTerm && notFound && (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-sm">
              Vehicle "{searchTerm}" is not currently parked.
            </div>
          )}

          {foundVehicle && !exitMutation.isSuccess && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-bold text-lg" data-testid="text-found-vehicle-number">{foundVehicle.vehicleNumber}</p>
                  <p className="text-sm text-muted-foreground">{foundVehicle.ownerName} · {foundVehicle.vehicleType}</p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-700">
                  <MapPin className="w-3 h-3 mr-1" />
                  {foundVehicle.slotNumber}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Entry Time
                  </span>
                  <span className="font-medium" data-testid="text-found-entry-time">
                    {format(new Date(foundVehicle.entryTime), "h:mm a")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(foundVehicle.entryTime), "dd MMM")}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duration
                  </span>
                  <span className="font-medium">
                    {formatDistanceStrict(new Date(foundVehicle.entryTime), new Date())}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" /> Est. Fee
                  </span>
                  <span className="font-bold text-primary" data-testid="text-estimated-fee">
                    ₹{calculateEstimatedFee(foundVehicle.entryTime)}
                  </span>
                  <span className="text-xs text-muted-foreground">1hr=₹20, +₹10/hr</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleExit}
                disabled={exitMutation.isPending}
                data-testid="button-process-exit"
              >
                <ArrowLeftFromLine className="w-4 h-4 mr-2" />
                {exitMutation.isPending ? "Processing..." : "Confirm Exit & Collect Fee"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Fee Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">First Hour</p>
              <p className="text-xl font-bold text-primary mt-1">₹20</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">Every Additional Hour</p>
              <p className="text-xl font-bold text-primary mt-1">₹10</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
