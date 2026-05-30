---
name: Slot generation
description: How the 30 slots are created during initial setup
---

POST /api/config/setup generates exactly 30 slots: floors A, B, C × 10 slots each (A1-A10, B1-B10, C1-C10). slotType cycles through the vehicleTypes array chosen during setup (index % types.length).

**Why:** Fixed 3-floor layout matches the parking map UI which hard-renders 3 rows of 10.

**How to apply:** If the map layout ever changes (more floors/slots), both the config route AND the ParkingMap component (FLOORS + SLOTS_PER_FLOOR constants) must be updated together.
