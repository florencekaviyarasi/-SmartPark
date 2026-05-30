import { useState } from "react";
import {
  useListSlots,
  getListSlotsQueryKey,
  useListActiveVehicles,
  getListActiveVehiclesQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, Truck, MapPin, Clock, User } from "lucide-react";
import { formatDistanceStrict, format } from "date-fns";

const FLOORS = ["A", "B", "C"];
const SLOTS_PER_FLOOR = 10;

type SlotInfo = {
  id: number;
  slotNumber: string;
  slotType: string;
  status: "available" | "occupied";
};

type ActiveVehicle = {
  id: number;
  vehicleNumber: string;
  ownerName: string;
  vehicleType: string;
  slotId: number;
  slotNumber: string | null;
  entryTime: string;
};

const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  if (type === "bike") return <Bike className={className} />;
  if (type === "truck") return <Truck className={className} />;
  return <Car className={className} />;
};

export function ParkingMap() {
  const [selected, setSelected] = useState<{ slot: SlotInfo; vehicle?: ActiveVehicle } | null>(null);

  const { data: slots } = useListSlots({}, {
    query: {
      queryKey: getListSlotsQueryKey({}),
      refetchInterval: 3000,
    },
  });

  const { data: activeVehicles } = useListActiveVehicles({}, {
    query: {
      queryKey: getListActiveVehiclesQueryKey({}),
      refetchInterval: 3000,
    },
  });

  const vehicleBySlotId = new Map<number, ActiveVehicle>();
  activeVehicles?.forEach((v) => {
    vehicleBySlotId.set(v.slotId, v as ActiveVehicle);
  });

  const slotByNumber = new Map<string, SlotInfo>();
  slots?.forEach((s) => {
    slotByNumber.set(s.slotNumber, s as SlotInfo);
  });

  const totalSlots = slots?.length ?? 30;
  const occupiedSlots = slots?.filter((s) => s.status === "occupied").length ?? 0;
  const availableSlots = totalSlots - occupiedSlots;
  const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
  const isFull = availableSlots === 0 && totalSlots > 0;

  const handleSlotClick = (slotNum: string) => {
    const slot = slotByNumber.get(slotNum);
    if (!slot) return;
    const vehicle = slot.status === "occupied" ? vehicleBySlotId.get(slot.id) : undefined;
    setSelected({ slot, vehicle });
  };

  return (
    <div className="space-y-4">
      {/* Occupancy Indicator */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              Available: {availableSlots}/{totalSlots}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-800 dark:text-red-300">
              Occupied: {occupiedSlots}/{totalSlots}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border">
            <span className="text-sm font-medium">Occupancy: {occupancyRate}%</span>
          </div>
        </div>

        {isFull && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white animate-pulse">
            <span className="text-sm font-bold">🚫 PARKING FULL</span>
          </div>
        )}
      </div>

      {/* Occupancy bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            occupancyRate >= 90 ? "bg-red-500" : occupancyRate >= 60 ? "bg-amber-500" : "bg-green-500"
          }`}
          style={{ width: `${occupancyRate}%` }}
        />
      </div>

      {/* Floor map */}
      <div className="space-y-5">
        {FLOORS.map((floor) => (
          <div key={floor} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {floor}
              </div>
              <span className="text-sm font-semibold text-muted-foreground tracking-wide">
                Floor {floor}
              </span>
            </div>

            {/* Two rows of 5 */}
            {[0, 5].map((rowStart) => (
              <div key={rowStart} className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, i) => {
                  const slotNum = `${floor}${rowStart + i + 1}`;
                  const slot = slotByNumber.get(slotNum);
                  const vehicle = slot ? vehicleBySlotId.get(slot.id) : undefined;
                  const isOccupied = slot?.status === "occupied";
                  const hasData = !!slot;

                  return (
                    <button
                      key={slotNum}
                      onClick={() => handleSlotClick(slotNum)}
                      disabled={!hasData}
                      data-testid={`slot-${slotNum}`}
                      className={`
                        relative group flex flex-col items-center justify-center gap-1
                        rounded-lg border-2 p-2 min-h-[72px] text-xs font-medium
                        transition-all duration-300 select-none
                        ${!hasData
                          ? "border-dashed border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed bg-muted/20"
                          : isOccupied
                            ? "border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer shadow-sm"
                            : "border-green-400 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 cursor-pointer shadow-sm hover:scale-105"
                        }
                      `}
                    >
                      {!hasData ? (
                        <span className="text-[10px]">{slotNum}</span>
                      ) : isOccupied ? (
                        <>
                          <TypeIcon
                            type={vehicle?.vehicleType || slot?.slotType || "car"}
                            className="w-5 h-5 text-red-500"
                          />
                          <span className="font-bold text-[11px]">{slotNum}</span>
                          {vehicle && (
                            <span className="text-[9px] text-red-400 truncate w-full text-center leading-tight">
                              {vehicle.vehicleNumber}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-lg leading-none">🅿</span>
                          <span className="font-bold text-[11px]">{slotNum}</span>
                          <span className="text-[9px] text-green-500 font-medium">Free</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-green-400 bg-green-50 dark:bg-green-950/40" />
          <span>Available (🅿)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-red-400 bg-red-50 dark:bg-red-950/40" />
          <span>Occupied (🚗)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-dashed border border-muted-foreground/20 bg-muted/20" />
          <span>Not assigned</span>
        </div>
      </div>

      {/* Slot Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Slot {selected?.slot.slotNumber}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.slot.status === "available" ? (
                <div className="text-center py-4 space-y-2">
                  <span className="text-5xl">🅿</span>
                  <p className="font-semibold text-green-700 dark:text-green-400">Available</p>
                  <p className="text-sm text-muted-foreground capitalize">{selected.slot.slotType} slot</p>
                </div>
              ) : selected.vehicle ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center py-3">
                    <TypeIcon
                      type={selected.vehicle.vehicleType}
                      className="w-12 h-12 text-red-500"
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Car className="w-3 h-3" /> Vehicle No.
                    </dt>
                    <dd className="font-mono font-bold">{selected.vehicle.vehicleNumber}</dd>

                    <dt className="text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> Owner
                    </dt>
                    <dd>{selected.vehicle.ownerName}</dd>

                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="capitalize">
                      <Badge variant="outline">{selected.vehicle.vehicleType}</Badge>
                    </dd>

                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Entry Time
                    </dt>
                    <dd>{format(new Date(selected.vehicle.entryTime), "h:mm a, dd MMM")}</dd>

                    <dt className="text-muted-foreground">Duration</dt>
                    <dd className="font-medium">
                      {formatDistanceStrict(new Date(selected.vehicle.entryTime), new Date())}
                    </dd>
                  </dl>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Car className="w-10 h-10 mx-auto mb-2 text-red-400" />
                  <p className="font-medium text-red-600 dark:text-red-400">Occupied</p>
                  <p className="text-sm text-muted-foreground">Vehicle details not available</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
