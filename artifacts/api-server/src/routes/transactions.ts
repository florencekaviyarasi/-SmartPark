import { Router, type IRouter } from "express";
import { db, parkingTransactionsTable, parkingSlotsTable } from "@workspace/db";
import { eq, gte, lte, and, like, or, desc } from "drizzle-orm";
import { ListTransactionsQueryParams, GetTransactionParams } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const params = ListTransactionsQueryParams.safeParse(req.query);
  const { search, startDate, endDate, limit = 50, offset = 0 } = params.success ? params.data : {};

  const transactions = await db
    .select({
      id: parkingTransactionsTable.id,
      vehicleNumber: parkingTransactionsTable.vehicleNumber,
      ownerName: parkingTransactionsTable.ownerName,
      vehicleType: parkingTransactionsTable.vehicleType,
      slotId: parkingTransactionsTable.slotId,
      slotNumber: parkingSlotsTable.slotNumber,
      entryTime: parkingTransactionsTable.entryTime,
      exitTime: parkingTransactionsTable.exitTime,
      durationMinutes: parkingTransactionsTable.durationMinutes,
      fee: parkingTransactionsTable.fee,
    })
    .from(parkingTransactionsTable)
    .leftJoin(parkingSlotsTable, eq(parkingTransactionsTable.slotId, parkingSlotsTable.id))
    .orderBy(desc(parkingTransactionsTable.exitTime))
    .limit(limit ?? 50)
    .offset(offset ?? 0);

  let filtered = transactions;

  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
        (t.ownerName && t.ownerName.toLowerCase().includes(search.toLowerCase())),
    );
  }

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((t) => t.exitTime >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((t) => t.exitTime <= end);
  }

  res.json(
    filtered.map((t) => ({
      ...t,
      fee: parseFloat(String(t.fee)),
      entryTime: t.entryTime.toISOString(),
      exitTime: t.exitTime.toISOString(),
    })),
  );
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  const params = GetTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [transaction] = await db
    .select({
      id: parkingTransactionsTable.id,
      vehicleNumber: parkingTransactionsTable.vehicleNumber,
      ownerName: parkingTransactionsTable.ownerName,
      vehicleType: parkingTransactionsTable.vehicleType,
      slotId: parkingTransactionsTable.slotId,
      slotNumber: parkingSlotsTable.slotNumber,
      entryTime: parkingTransactionsTable.entryTime,
      exitTime: parkingTransactionsTable.exitTime,
      durationMinutes: parkingTransactionsTable.durationMinutes,
      fee: parkingTransactionsTable.fee,
    })
    .from(parkingTransactionsTable)
    .leftJoin(parkingSlotsTable, eq(parkingTransactionsTable.slotId, parkingSlotsTable.id))
    .where(eq(parkingTransactionsTable.id, params.data.id));

  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({
    ...transaction,
    fee: parseFloat(String(transaction.fee)),
    entryTime: transaction.entryTime.toISOString(),
    exitTime: transaction.exitTime.toISOString(),
  });
});

export default router;
