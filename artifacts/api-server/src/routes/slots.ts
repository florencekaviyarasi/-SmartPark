import { Router, type IRouter } from "express";
import { db, parkingSlotsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListSlotsQueryParams,
  CreateSlotBody,
  UpdateSlotBody,
  GetSlotParams,
  UpdateSlotParams,
  DeleteSlotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/slots", async (req, res): Promise<void> => {
  const params = ListSlotsQueryParams.safeParse(req.query);
  const conditions = [];

  if (params.success) {
    if (params.data.status) conditions.push(eq(parkingSlotsTable.status, params.data.status));
    if (params.data.type) conditions.push(eq(parkingSlotsTable.slotType, params.data.type));
  }

  const slots =
    conditions.length > 0
      ? await db.select().from(parkingSlotsTable).where(and(...conditions))
      : await db.select().from(parkingSlotsTable);

  res.json(slots.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/slots", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = CreateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db
    .insert(parkingSlotsTable)
    .values({ slotNumber: parsed.data.slotNumber, slotType: parsed.data.slotType, status: "available" })
    .returning();

  res.status(201).json({ ...slot, createdAt: slot.createdAt.toISOString() });
});

router.get("/slots/:id", async (req, res): Promise<void> => {
  const params = GetSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db.select().from(parkingSlotsTable).where(eq(parkingSlotsTable.id, params.data.id));
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json({ ...slot, createdAt: slot.createdAt.toISOString() });
});

router.patch("/slots/:id", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const params = UpdateSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db
    .update(parkingSlotsTable)
    .set(parsed.data)
    .where(eq(parkingSlotsTable.id, params.data.id))
    .returning();

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json({ ...slot, createdAt: slot.createdAt.toISOString() });
});

router.delete("/slots/:id", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const params = DeleteSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db.delete(parkingSlotsTable).where(eq(parkingSlotsTable.id, params.data.id)).returning();

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
