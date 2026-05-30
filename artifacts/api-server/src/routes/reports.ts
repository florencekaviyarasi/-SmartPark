import { Router, type IRouter } from "express";
import { db, parkingTransactionsTable, parkingSlotsTable } from "@workspace/db";
import { eq, gte, and, sql } from "drizzle-orm";
import {
  GetDailyReportQueryParams,
  GetWeeklyReportQueryParams,
  GetMonthlyReportQueryParams,
  ExportReportQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatTransaction(t: {
  id: number;
  vehicleNumber: string;
  ownerName: string | null;
  vehicleType: string | null;
  slotId: number;
  slotNumber: string | null;
  entryTime: Date;
  exitTime: Date;
  durationMinutes: number;
  fee: string;
}) {
  return {
    id: t.id,
    vehicleNumber: t.vehicleNumber,
    ownerName: t.ownerName,
    vehicleType: t.vehicleType,
    slotId: t.slotId,
    slotNumber: t.slotNumber,
    entryTime: t.entryTime.toISOString(),
    exitTime: t.exitTime.toISOString(),
    durationMinutes: t.durationMinutes,
    fee: parseFloat(String(t.fee)),
  };
}

async function getTransactionsInRange(start: Date, end: Date) {
  return db
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
    .where(and(gte(parkingTransactionsTable.exitTime, start), sql`${parkingTransactionsTable.exitTime} < ${end}`));
}

router.get("/reports/daily", async (req, res): Promise<void> => {
  const params = GetDailyReportQueryParams.safeParse(req.query);
  const date = params.success && params.data.date ? new Date(params.data.date) : new Date();

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const transactions = await getTransactionsInRange(start, end);
  const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);
  const averageFee = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  res.json({
    period: start.toISOString().split("T")[0],
    totalVehicles: transactions.length,
    totalRevenue,
    averageFee,
    transactions: transactions.map(formatTransaction),
  });
});

router.get("/reports/weekly", async (req, res): Promise<void> => {
  const params = GetWeeklyReportQueryParams.safeParse(req.query);
  const baseDate = params.success && params.data.startDate ? new Date(params.data.startDate) : new Date();

  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(baseDate);
  end.setDate(baseDate.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  const transactions = await getTransactionsInRange(start, end);
  const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);
  const averageFee = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  res.json({
    period: `${start.toISOString().split("T")[0]} to ${new Date(end.getTime() - 1).toISOString().split("T")[0]}`,
    totalVehicles: transactions.length,
    totalRevenue,
    averageFee,
    transactions: transactions.map(formatTransaction),
  });
});

router.get("/reports/monthly", async (req, res): Promise<void> => {
  const params = GetMonthlyReportQueryParams.safeParse(req.query);
  const now = new Date();
  const month = params.success && params.data.month != null ? params.data.month : now.getMonth() + 1;
  const year = params.success && params.data.year != null ? params.data.year : now.getFullYear();

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const transactions = await getTransactionsInRange(start, end);
  const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(String(t.fee)), 0);
  const averageFee = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  res.json({
    period: `${monthNames[month - 1]} ${year}`,
    totalVehicles: transactions.length,
    totalRevenue,
    averageFee,
    transactions: transactions.map(formatTransaction),
  });
});

router.get("/reports/export", async (req, res): Promise<void> => {
  const params = ExportReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { type, date } = params.data;
  const now = new Date();

  let start: Date;
  let end: Date;
  let filename: string;

  if (type === "daily") {
    const d = date ? new Date(date) : now;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    filename = `parking-report-daily-${start.toISOString().split("T")[0]}.csv`;
  } else if (type === "weekly") {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    filename = `parking-report-weekly-${start.toISOString().split("T")[0]}.csv`;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    filename = `parking-report-monthly-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}.csv`;
  }

  const transactions = await getTransactionsInRange(start, end);

  const headers = "ID,Vehicle Number,Owner Name,Vehicle Type,Slot Number,Entry Time,Exit Time,Duration (min),Fee (₹)";
  const rows = transactions.map((t) =>
    [
      t.id,
      t.vehicleNumber,
      t.ownerName || "",
      t.vehicleType || "",
      t.slotNumber || "",
      t.entryTime.toISOString(),
      t.exitTime.toISOString(),
      t.durationMinutes,
      parseFloat(String(t.fee)).toFixed(2),
    ].join(","),
  );

  const csv = [headers, ...rows].join("\n");
  res.json({ csv, filename });
});

export default router;
