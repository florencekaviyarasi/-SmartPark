import { Router, type IRouter } from "express";
import { db, parkingSlotsTable, vehicleEntriesTable, parkingTransactionsTable } from "@workspace/db";
import { eq, gte, and, sql } from "drizzle-orm";
import { GetOccupancyChartQueryParams, GetRevenueChartQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const allSlots = await db.select().from(parkingSlotsTable);
  const totalSlots = allSlots.length;
  const occupiedSlots = allSlots.filter((s) => s.status === "occupied").length;
  const availableSlots = totalSlots - occupiedSlots;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayTransactions = await db
    .select()
    .from(parkingTransactionsTable)
    .where(gte(parkingTransactionsTable.exitTime, todayStart));

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);
  const todayVehicles = todayTransactions.length;
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekTransactions = await db
    .select()
    .from(parkingTransactionsTable)
    .where(gte(parkingTransactionsTable.exitTime, weekStart));
  const weekRevenue = weekTransactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTransactions = await db
    .select()
    .from(parkingTransactionsTable)
    .where(gte(parkingTransactionsTable.exitTime, monthStart));
  const monthRevenue = monthTransactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);

  res.json({
    totalSlots,
    availableSlots,
    occupiedSlots,
    todayRevenue,
    todayVehicles,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    weekRevenue,
    monthRevenue,
  });
});

router.get("/dashboard/occupancy-chart", async (req, res): Promise<void> => {
  const params = GetOccupancyChartQueryParams.safeParse(req.query);
  const targetDate = params.success && params.data.date ? new Date(params.data.date) : new Date();

  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const transactions = await db
    .select()
    .from(parkingTransactionsTable)
    .where(and(gte(parkingTransactionsTable.exitTime, dayStart), sql`${parkingTransactionsTable.exitTime} < ${dayEnd}`));

  const hourCounts: Record<string, number> = {};
  for (let h = 0; h < 24; h++) {
    hourCounts[`${h.toString().padStart(2, "0")}:00`] = 0;
  }

  for (const t of transactions) {
    const h = t.exitTime.getHours();
    const key = `${h.toString().padStart(2, "0")}:00`;
    hourCounts[key] = (hourCounts[key] || 0) + 1;
  }

  const data = Object.entries(hourCounts).map(([hour, count]) => ({ hour, count }));
  res.json(data);
});

router.get("/dashboard/revenue-chart", async (req, res): Promise<void> => {
  const params = GetRevenueChartQueryParams.safeParse(req.query);
  const period = params.success ? params.data.period : "week";

  const now = new Date();
  const days = period === "month" ? 30 : 7;
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const transactions = await db
    .select()
    .from(parkingTransactionsTable)
    .where(gte(parkingTransactionsTable.exitTime, start));

  const dailyRevenue: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyRevenue[key] = 0;
  }

  for (const t of transactions) {
    const key = t.exitTime.toISOString().split("T")[0];
    if (key in dailyRevenue) {
      dailyRevenue[key] = (dailyRevenue[key] || 0) + parseFloat(String(t.fee));
    }
  }

  const data = Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));
  res.json(data);
});

export default router;
