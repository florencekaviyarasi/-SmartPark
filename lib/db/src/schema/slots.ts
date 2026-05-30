import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingSlotsTable = pgTable("parking_slots", {
  id: serial("id").primaryKey(),
  slotNumber: text("slot_number").notNull().unique(),
  slotType: text("slot_type").notNull().default("car"),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSlotSchema = createInsertSchema(parkingSlotsTable).omit({ id: true, createdAt: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type ParkingSlot = typeof parkingSlotsTable.$inferSelect;
