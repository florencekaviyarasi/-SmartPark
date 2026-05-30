import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingConfigTable = pgTable("parking_config", {
  id: serial("id").primaryKey(),
  lotName: text("lot_name").notNull(),
  totalFloors: integer("total_floors").notNull().default(3),
  slotsPerFloor: integer("slots_per_floor").notNull().default(10),
  vehicleTypes: text("vehicle_types").array().notNull(),
  baseRate: numeric("base_rate", { precision: 10, scale: 2 }).notNull().default("20"),
  additionalHourlyRate: numeric("additional_hourly_rate", { precision: 10, scale: 2 }).notNull().default("10"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParkingConfigSchema = createInsertSchema(parkingConfigTable).omit({ id: true, createdAt: true });
export type InsertParkingConfig = z.infer<typeof insertParkingConfigSchema>;
export type ParkingConfig = typeof parkingConfigTable.$inferSelect;
