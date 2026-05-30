import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { parkingSlotsTable } from "./slots";

export const vehicleEntriesTable = pgTable("vehicle_entries", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  ownerName: text("owner_name").notNull(),
  vehicleType: text("vehicle_type").notNull().default("car"),
  slotId: integer("slot_id").notNull().references(() => parkingSlotsTable.id),
  entryTime: timestamp("entry_time", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVehicleEntrySchema = createInsertSchema(vehicleEntriesTable).omit({ id: true, entryTime: true });
export type InsertVehicleEntry = z.infer<typeof insertVehicleEntrySchema>;
export type VehicleEntry = typeof vehicleEntriesTable.$inferSelect;
