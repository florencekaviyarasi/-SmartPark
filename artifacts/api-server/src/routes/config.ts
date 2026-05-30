import { Router, type IRouter } from "express";
import { db, parkingConfigTable, parkingSlotsTable } from "@workspace/db";
import { SetupConfigBody } from "@workspace/api-zod";

const router: IRouter = Router();

const FLOORS = ["A", "B", "C"];
const SLOTS_PER_FLOOR = 10;

function generateSlotNumber(floor: string, index: number): string {
  return `${floor}${index + 1}`;
}

router.get("/config", async (req, res): Promise<void> => {
  const configs = await db.select().from(parkingConfigTable).limit(1);
  if (configs.length === 0) {
    res.status(404).json({ error: "Not configured" });
    return;
  }
  const c = configs[0];
  res.json({
    id: c.id,
    lotName: c.lotName,
    totalFloors: c.totalFloors,
    slotsPerFloor: c.slotsPerFloor,
    vehicleTypes: c.vehicleTypes,
    baseRate: parseFloat(String(c.baseRate)),
    additionalHourlyRate: parseFloat(String(c.additionalHourlyRate)),
    createdAt: c.createdAt.toISOString(),
  });
});

router.post("/config/setup", async (req, res): Promise<void> => {
  const existing = await db.select().from(parkingConfigTable).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Already configured" });
    return;
  }

  const parsed = SetupConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lotName, vehicleTypes, baseRate, additionalHourlyRate } = parsed.data;

  const [config] = await db
    .insert(parkingConfigTable)
    .values({
      lotName,
      totalFloors: 3,
      slotsPerFloor: 10,
      vehicleTypes: vehicleTypes as string[],
      baseRate: String(baseRate),
      additionalHourlyRate: String(additionalHourlyRate),
    })
    .returning();

  const slotValues: { slotNumber: string; slotType: string; status: string }[] = [];
  const types = vehicleTypes as string[];
  for (const floor of FLOORS) {
    for (let i = 0; i < SLOTS_PER_FLOOR; i++) {
      const slotType = types.length > 0 ? types[i % types.length] : "car";
      slotValues.push({
        slotNumber: generateSlotNumber(floor, i),
        slotType,
        status: "available",
      });
    }
  }

  await db.insert(parkingSlotsTable).values(slotValues);

  req.log.info({ lotName, totalSlots: slotValues.length }, "Parking lot configured");

  res.status(201).json({
    id: config.id,
    lotName: config.lotName,
    totalFloors: config.totalFloors,
    slotsPerFloor: config.slotsPerFloor,
    vehicleTypes: config.vehicleTypes,
    baseRate: parseFloat(String(config.baseRate)),
    additionalHourlyRate: parseFloat(String(config.additionalHourlyRate)),
    createdAt: config.createdAt.toISOString(),
  });
});

export default router;
