---
name: Fee calculation
description: How parking fees are calculated at vehicle exit
---

Formula: first hour = baseRate, each additional hour = additionalHourlyRate (ceiling).

**Why:** Configurable per parking lot so different facilities can set their own pricing. Rates come from parking_config table, not hardcoded.

**How to apply:** vehicles.ts exit handler calls `getConfig()` which queries parking_config. Fallback is {baseRate: 20, additionalHourlyRate: 10} if unconfigured.
