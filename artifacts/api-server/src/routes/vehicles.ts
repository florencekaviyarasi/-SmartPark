import { Router, type IRouter } from "express";
import { db, vehicleEntriesTable, parkingSlotsTable } from "@workspace/db";
import { eq, and, like, or } from "drizzle-orm";
import {
  VehicleEntryBody,
  VehicleExitBody,
  ListActiveVehiclesQueryParams,
  SearchVehicleQueryParams,
} from "@workspace/api-zod";
import { parkingTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

function calculateFee(entryTime: Date, exitTime: Date): number {
  const durationMs = exitTime.getTime() - entryTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  if (durationHours <= 1) return 20;
  return 20 + Math.ceil(durationHours - 1) * 10;
}

router.post("/vehicles/entry", async (req, res): Promise<void> => {
  const parsed = VehicleEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vehicleNumber, ownerName, vehicleType } = parsed.data;

  const existing = await db
    .select()
    .from(vehicleEntriesTable)
    .where(eq(vehicleEntriesTable.vehicleNumber, vehicleNumber.toUpperCase()));

  if (existing.length > 0) {
    res.status(400).json({ error: "Vehicle is already parked" });
    return;
  }

  const availableSlots = await db
    .select()
    .from(parkingSlotsTable)
    .where(
      and(
        eq(parkingSlotsTable.status, "available"),
        eq(parkingSlotsTable.slotType, vehicleType),
      ),
    )
    .limit(1);

  if (availableSlots.length === 0) {
    const anySlot = await db
      .select()
      .from(parkingSlotsTable)
      .where(eq(parkingSlotsTable.status, "available"))
      .limit(1);

    if (anySlot.length === 0) {
      res.status(400).json({ error: "No available parking slots" });
      return;
    }
    availableSlots.push(anySlot[0]);
  }

  const slot = availableSlots[0];

  const [entry] = await db
    .insert(vehicleEntriesTable)
    .values({
      vehicleNumber: vehicleNumber.toUpperCase(),
      ownerName,
      vehicleType,
      slotId: slot.id,
    })
    .returning();

  await db.update(parkingSlotsTable).set({ status: "occupied" }).where(eq(parkingSlotsTable.id, slot.id));

  req.log.info({ vehicleNumber, slotId: slot.id }, "Vehicle entry registered");

  res.status(201).json({
    id: entry.id,
    vehicleNumber: entry.vehicleNumber,
    ownerName: entry.ownerName,
    vehicleType: entry.vehicleType,
    slotId: entry.slotId,
    slotNumber: slot.slotNumber,
    entryTime: entry.entryTime.toISOString(),
  });
});

router.post("/vehicles/exit", async (req, res): Promise<void> => {
  const parsed = VehicleExitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { vehicleNumber } = parsed.data;

  const [entry] = await db
    .select()
    .from(vehicleEntriesTable)
    .where(eq(vehicleEntriesTable.vehicleNumber, vehicleNumber.toUpperCase()));

  if (!entry) {
    res.status(404).json({ error: "Vehicle not found in parking" });
    return;
  }

  const exitTime = new Date();
  const durationMs = exitTime.getTime() - entry.entryTime.getTime();
  const durationMinutes = Math.ceil(durationMs / (1000 * 60));
  const fee = calculateFee(entry.entryTime, exitTime);

  const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, entry.slotId));

  const [transaction] = await db
    .insert(parkingTransactionsTable)
    .values({
      vehicleNumber: entry.vehicleNumber,
      ownerName: entry.ownerName,
      vehicleType: entry.vehicleType,
      slotId: entry.slotId,
      entryTime: entry.entryTime,
      exitTime,
      durationMinutes,
      fee: fee.toFixed(2),
    })
    .returning();

  await db.delete(vehicleEntriesTable).where(eq(vehicleEntriesTable.id, entry.id));
  await db.update(parkingSlotsTable).set({ status: "available" }).where(eq(parkingSlotsTable.id, entry.slotId));

  req.log.info({ vehicleNumber, fee, durationMinutes }, "Vehicle exit registered");

  res.json({
    id: transaction.id,
    vehicleNumber: transaction.vehicleNumber,
    ownerName: transaction.ownerName,
    vehicleType: transaction.vehicleType,
    slotId: transaction.slotId,
    slotNumber: slot?.slotNumber ?? null,
    entryTime: transaction.entryTime.toISOString(),
    exitTime: transaction.exitTime.toISOString(),
    durationMinutes: transaction.durationMinutes,
    fee: parseFloat(String(transaction.fee)),
  });
});

router.get("/vehicles/active", async (req, res): Promise<void> => {
  const params = ListActiveVehiclesQueryParams.safeParse(req.query);
  const search = params.success ? params.data.search : undefined;

  const entries = await db
    .select({
      id: vehicleEntriesTable.id,
      vehicleNumber: vehicleEntriesTable.vehicleNumber,
      ownerName: vehicleEntriesTable.ownerName,
      vehicleType: vehicleEntriesTable.vehicleType,
      slotId: vehicleEntriesTable.slotId,
      slotNumber: parkingSlotsTable.slotNumber,
      entryTime: vehicleEntriesTable.entryTime,
    })
    .from(vehicleEntriesTable)
    .leftJoin(parkingSlotsTable, eq(vehicleEntriesTable.slotId, parkingSlotsTable.id));

  const filtered = search
    ? entries.filter(
        (e) =>
          e.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
          e.ownerName.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  res.json(
    filtered.map((e) => ({
      ...e,
      entryTime: e.entryTime.toISOString(),
    })),
  );
});

router.get("/vehicles/search", async (req, res): Promise<void> => {
  const params = SearchVehicleQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { vehicleNumber } = params.data;

  const [entry] = await db
    .select({
      id: vehicleEntriesTable.id,
      vehicleNumber: vehicleEntriesTable.vehicleNumber,
      ownerName: vehicleEntriesTable.ownerName,
      vehicleType: vehicleEntriesTable.vehicleType,
      slotId: vehicleEntriesTable.slotId,
      slotNumber: parkingSlotsTable.slotNumber,
      entryTime: vehicleEntriesTable.entryTime,
    })
    .from(vehicleEntriesTable)
    .leftJoin(parkingSlotsTable, eq(vehicleEntriesTable.slotId, parkingSlotsTable.id))
    .where(eq(vehicleEntriesTable.vehicleNumber, vehicleNumber.toUpperCase()));

  if (!entry) {
    res.status(404).json({ error: "Vehicle not found in parking" });
    return;
  }

  res.json({ ...entry, entryTime: entry.entryTime.toISOString() });
});

export default router;
