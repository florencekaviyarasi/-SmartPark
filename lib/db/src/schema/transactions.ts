import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { parkingSlotsTable } from "./slots";

export const parkingTransactionsTable = pgTable("parking_transactions", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  ownerName: text("owner_name"),
  vehicleType: text("vehicle_type"),
  slotId: integer("slot_id").notNull().references(() => parkingSlotsTable.id),
  entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
  exitTime: timestamp("exit_time", { withTimezone: true }).notNull().defaultNow(),
  durationMinutes: integer("duration_minutes").notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull(),
});

export const insertTransactionSchema = createInsertSchema(parkingTransactionsTable).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type ParkingTransaction = typeof parkingTransactionsTable.$inferSelect;
