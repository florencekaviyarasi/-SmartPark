# SmartPark — Project Handoff Document

> Last updated: May 30, 2026  
> Status: Feature-complete MVP, fully functional, zero seeded/demo data

---

## 1. Project Overview

**SmartPark** is a full-stack smart parking management system for admin and operational staff to manage a physical parking facility in real time. The system handles the complete vehicle lifecycle — entry, parking slot assignment, exit, fee calculation, and reporting — with a browser-based interface that reflects live parking state.

### Key Design Principles
- **Contract-first API** — OpenAPI spec (`lib/api-spec/openapi.yaml`) is the source of truth; all Zod validators and React Query hooks are auto-generated from it via Orval.
- **Zero demo data** — the database starts empty. The admin must complete the first-run Setup screen before anything works.
- **Data-driven configuration** — lot name, vehicle types, and pricing rates are stored in the database and read at runtime (not hardcoded).
- **Session-based auth** — `express-session` with `bcryptjs` password hashing; role-based access (admin/staff).

### Credentials (dev/default)
| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | admin |
| staff    | staff123  | staff |

---

## 2. Features Implemented

### Authentication
- Session-based login / logout
- Role guard — admin-only pages (Slot Management, Reports) are inaccessible to staff
- `useAuth()` hook with `AuthProvider` wrapping the whole app

### First-Run Admin Setup (`/setup`)
- Triggered automatically after login when no config row exists in the DB
- Collects: parking lot name, supported vehicle types (car / bike / truck), base rate (first hour), additional hourly rate
- Shows a live preview of the auto-generated 30-slot layout before submission
- Displays a fee calculator preview as the admin types rates
- On submit: creates the `parking_config` row and auto-generates 30 parking slots (A1–A10, B1–B10, C1–C10) in one transaction
- Redirects to the dashboard on success

### Dashboard (`/`)
- Live stats cards: Today's Revenue, Occupancy Rate, Available Slots, Monthly Revenue
- Stats auto-refresh every 5 seconds via React Query `refetchInterval`
- Embedded **Interactive Parking Map** (see Section 7)
- Weekly Revenue area chart (Recharts) with a friendly empty state if no transactions exist yet

### Interactive Parking Map (component: `parking-map.tsx`)
- 30 slots rendered across 3 floors (A, B, C), two rows of 5 per floor
- **Green 🅿 = available**, **Red 🚗 = occupied**
- Live vehicle icon matches vehicle type (car / bike / truck) for occupied slots
- Polls every 3 seconds — slot colours update automatically as vehicles enter/exit
- Occupancy indicator bar (green → amber → red) and "PARKING FULL" alert banner
- **Click any slot** to open a details dialog showing: vehicle number, owner name, vehicle type, entry time, live duration since entry

### Slot Management — Admin only (`/slots`)
- Visual grid of all slots with live status badges
- Filter by All / Available / Occupied
- Add a new slot (manual, beyond the 30 auto-generated ones)
- Edit slot number or type (available slots only)
- Delete a slot (available slots only — prevents data loss for occupied slots)
- Hover-to-reveal edit/delete controls per slot card

### Vehicle Entry (`/entry`)
- Input: vehicle number, owner name, vehicle type
- Auto-assigns the best available slot (prefers type match, falls back to any available)
- Shows available slot count and count for the selected vehicle type in real time
- Blocks submission if parking is full
- Displays a confirmation card with assigned slot number and entry timestamp

### Vehicle Exit (`/exit`)
- Search by vehicle number — shows current slot, entry time, and estimated fee preview
- Calculates fee using config rates (not hardcoded): first hour = `baseRate`, subsequent hours = `additionalHourlyRate` per hour (ceiling)
- Confirmation shows: duration, final fee, slot freed

### Transaction History (`/history`)
- Searchable (vehicle number or owner name) and date-range filterable table
- Aggregate stats at top: total count, total revenue, average fee
- Empty state when no transactions exist

### Reports — Admin only (`/reports`)
- Daily, weekly, monthly report modes with period selection
- Summary stats: total vehicles, total revenue, average fee, peak hour
- Top vehicles by number of visits
- CSV export for any report period

---

## 3. Database Schema

All tables are in PostgreSQL managed via **Drizzle ORM**. Migrations are applied with `pnpm --filter @workspace/db run push`.

### `users`
| Column      | Type                     | Notes                    |
|-------------|--------------------------|--------------------------|
| id          | serial PK                |                          |
| username    | text UNIQUE NOT NULL     |                          |
| password    | text NOT NULL            | bcryptjs hash            |
| role        | text NOT NULL DEFAULT 'staff' | `'admin'` or `'staff'` |
| created_at  | timestamptz NOT NULL     | auto                     |

### `parking_config`
| Column                | Type                  | Notes                                     |
|-----------------------|-----------------------|-------------------------------------------|
| id                    | serial PK             | Only ever one row                         |
| lot_name              | text NOT NULL         | Display name of the facility              |
| total_floors          | integer DEFAULT 3     | Fixed at 3 for current map layout         |
| slots_per_floor       | integer DEFAULT 10    | Fixed at 10 for current map layout        |
| vehicle_types         | text[] NOT NULL       | Array e.g. `['car','bike','truck']`       |
| base_rate             | numeric(10,2)         | Fee for first hour (₹)                   |
| additional_hourly_rate| numeric(10,2)         | Fee for each subsequent hour (₹)         |
| created_at            | timestamptz NOT NULL  | auto                                      |

### `parking_slots`
| Column      | Type                     | Notes                                  |
|-------------|--------------------------|----------------------------------------|
| id          | serial PK                |                                        |
| slot_number | text UNIQUE NOT NULL     | e.g. `A1`, `B10`, `C5`               |
| slot_type   | text NOT NULL DEFAULT 'car' | `'car'`, `'bike'`, or `'truck'`    |
| status      | text NOT NULL DEFAULT 'available' | `'available'` or `'occupied'` |
| created_at  | timestamptz NOT NULL     | auto                                   |

### `vehicle_entries`
Active (currently parked) vehicles. Row deleted when vehicle exits.

| Column         | Type                  | Notes                          |
|----------------|-----------------------|--------------------------------|
| id             | serial PK             |                                |
| vehicle_number | text NOT NULL         | Uppercase, unique in this table |
| owner_name     | text NOT NULL         |                                |
| vehicle_type   | text NOT NULL         |                                |
| slot_id        | integer FK → parking_slots.id |                        |
| entry_time     | timestamptz NOT NULL  | auto                           |

### `parking_transactions`
Completed sessions. Immutable historical record.

| Column           | Type                  | Notes                        |
|------------------|-----------------------|------------------------------|
| id               | serial PK             |                              |
| vehicle_number   | text NOT NULL         |                              |
| owner_name       | text                  |                              |
| vehicle_type     | text                  |                              |
| slot_id          | integer FK → parking_slots.id |                      |
| entry_time       | timestamptz NOT NULL  |                              |
| exit_time        | timestamptz NOT NULL  | auto at exit                 |
| duration_minutes | integer NOT NULL      |                              |
| fee              | numeric(10,2) NOT NULL| Calculated from config rates |

---

## 4. Folder Structure

```
/
├── artifacts/
│   ├── api-server/                   # Express 5 backend (Node.js, port from $PORT)
│   │   └── src/
│   │       ├── app.ts                # Express app, session, middleware setup
│   │       ├── index.ts              # Entry point (esbuild CJS bundle)
│   │       ├── lib/logger.ts         # Pino logger singleton
│   │       └── routes/
│   │           ├── index.ts          # Mounts all routers
│   │           ├── auth.ts           # POST /login, POST /logout, GET /me
│   │           ├── config.ts         # GET /config, POST /config/setup
│   │           ├── slots.ts          # CRUD /slots
│   │           ├── vehicles.ts       # POST /entry, POST /exit, GET /active, GET /search
│   │           ├── transactions.ts   # GET /transactions, GET /transactions/:id
│   │           ├── dashboard.ts      # GET /dashboard/stats, /revenue-chart, /occupancy-chart
│   │           ├── reports.ts        # GET /reports/daily|weekly|monthly, GET /reports/export
│   │           └── health.ts         # GET /health
│   │
│   └── parking/                      # React + Vite frontend
│       └── src/
│           ├── App.tsx               # Router, ProtectedRoute (auth + config guard)
│           ├── main.tsx
│           ├── index.css             # Tailwind + CSS variables
│           ├── pages/
│           │   ├── login.tsx
│           │   ├── setup.tsx         # First-run configuration form
│           │   ├── dashboard.tsx     # Stats + ParkingMap + revenue chart
│           │   ├── slots.tsx         # Slot management grid (admin)
│           │   ├── entry.tsx         # Vehicle entry form
│           │   ├── exit.tsx          # Vehicle exit + fee display
│           │   ├── history.tsx       # Transaction history table
│           │   ├── reports.tsx       # Reports + CSV export (admin)
│           │   └── not-found.tsx
│           ├── components/
│           │   ├── parking-map.tsx   # Interactive 30-slot map with polling
│           │   ├── theme-provider.tsx
│           │   └── layout/
│           │       └── app-layout.tsx # Sidebar nav, theme toggle, user menu
│           └── hooks/
│               ├── use-auth.tsx      # AuthProvider + useAuth()
│               ├── use-toast.ts
│               └── use-mobile.tsx
│
└── lib/
    ├── api-spec/
    │   ├── openapi.yaml              # SOURCE OF TRUTH for all API contracts
    │   └── orval.config.ts           # Codegen config (outputs to api-zod + api-client-react)
    ├── api-zod/
    │   └── src/generated/api.ts      # Zod schemas (auto-generated — do not edit)
    ├── api-client-react/
    │   └── src/
    │       ├── custom-fetch.ts       # Fetch wrapper (base path aware)
    │       └── generated/api.ts      # React Query hooks (auto-generated — do not edit)
    └── db/
        ├── drizzle.config.ts
        └── src/
            ├── index.ts              # Exports db client + all tables
            └── schema/
                ├── users.ts
                ├── slots.ts
                ├── vehicle_entries.ts
                ├── transactions.ts
                └── parking_config.ts
```

---

## 5. API Endpoints Reference

All routes are prefixed with `/api`.

| Tag          | Method | Path                        | Summary                                   | Auth     |
|--------------|--------|-----------------------------|-------------------------------------------|----------|
| health       | GET    | /health                     | Health check                              | None     |
| auth         | POST   | /auth/login                 | Login (returns session cookie)            | None     |
| auth         | POST   | /auth/logout                | Logout                                    | Any      |
| auth         | GET    | /auth/me                    | Get current user                          | Any      |
| config       | GET    | /config                     | Get lot config (404 if not set up)        | Any      |
| config       | POST   | /config/setup               | First-run setup — creates config + 30 slots | Any   |
| slots        | GET    | /slots                      | List slots (filter by `?status=`)         | Any      |
| slots        | POST   | /slots                      | Create slot                               | Admin    |
| slots        | GET    | /slots/:id                  | Get slot by ID                            | Any      |
| slots        | PUT    | /slots/:id                  | Update slot                               | Admin    |
| slots        | DELETE | /slots/:id                  | Delete slot (available only)              | Admin    |
| vehicles     | POST   | /vehicles/entry             | Register vehicle entry + assign slot      | Any      |
| vehicles     | POST   | /vehicles/exit              | Register exit + calculate fee             | Any      |
| vehicles     | GET    | /vehicles/active            | List currently parked vehicles            | Any      |
| vehicles     | GET    | /vehicles/search?vehicleNumber= | Find active vehicle by plate         | Any      |
| transactions | GET    | /transactions               | History (search, date range, pagination)  | Any      |
| transactions | GET    | /transactions/:id           | Single transaction                        | Any      |
| dashboard    | GET    | /dashboard/stats            | Today revenue, occupancy, counts          | Any      |
| dashboard    | GET    | /dashboard/revenue-chart    | Daily revenue for chart (`?period=week`)  | Any      |
| dashboard    | GET    | /dashboard/occupancy-chart  | Hourly occupancy (`?period=day`)          | Any      |
| reports      | GET    | /reports/daily              | Daily report (`?date=`)                   | Admin    |
| reports      | GET    | /reports/weekly             | Weekly report (`?startDate=`)             | Admin    |
| reports      | GET    | /reports/monthly            | Monthly report (`?year=&month=`)          | Admin    |
| reports      | GET    | /reports/export             | CSV download (`?type=&...`)               | Admin    |

---

## 6. Key Commands

```bash
# Run API server (dev)
pnpm --filter @workspace/api-server run dev

# Run frontend (dev)
pnpm --filter @workspace/parking run dev

# Regenerate Zod schemas + React Query hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only — not safe for production)
pnpm --filter @workspace/db run push

# Full typecheck
pnpm run typecheck

# Typecheck individual packages
pnpm --filter @workspace/parking run typecheck
pnpm --filter @workspace/api-server run typecheck
```

### Required Environment Variables
| Variable        | Description                          |
|-----------------|--------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string         |
| `SESSION_SECRET`| Secret key for express-session signing |

---

## 7. Parking Slot Visualization Requirements

The `ParkingMap` component (`artifacts/parking/src/components/parking-map.tsx`) renders a 30-slot grid.

### Layout
```
Floor A:  [A1] [A2] [A3] [A4] [A5]
          [A6] [A7] [A8] [A9] [A10]

Floor B:  [B1] [B2] [B3] [B4] [B5]
          [B6] [B7] [B8] [B9] [B10]

Floor C:  [C1] [C2] [C3] [C4] [C5]
          [C6] [C7] [C8] [C9] [C10]
```

### Visual States
| State     | Border       | Background          | Icon              |
|-----------|--------------|---------------------|-------------------|
| Available | green-400    | green-50 (dark: green-950/40) | 🅿 emoji |
| Occupied  | red-400      | red-50 (dark: red-950/40)    | Car/Bike/Truck icon |
| No data   | dashed muted | muted/20            | slot number only  |

### Behaviour
- Occupied slots show the vehicle number in small text beneath the icon
- Clicking any slot opens a `Dialog` with full details (vehicle no., owner, type, entry time, live duration)
- Occupancy bar above the map: green → amber (≥60%) → red (≥90%)
- "PARKING FULL" pulsing banner appears when `availableSlots === 0`
- `hover:scale-105` animation on available slots to invite interaction

### Expansion Rules
If the parking layout ever changes (more floors or slots per floor):
1. Update `FLOORS` and `SLOTS_PER_FLOOR` constants in `parking-map.tsx`
2. Update the slot generation loop in `artifacts/api-server/src/routes/config.ts`
3. Update `totalFloors` / `slotsPerFloor` values in the `parking_config` insert
4. The OpenAPI spec schema for `SetupInput` does not need changing (floors/slots are still server-controlled)

---

## 8. Real-Time Update Requirements

The system uses **polling via React Query `refetchInterval`** — no WebSockets.

| Component / Hook           | Interval | Endpoint polled                       |
|----------------------------|----------|---------------------------------------|
| `ParkingMap`               | 3 s      | `GET /slots`, `GET /vehicles/active`  |
| Dashboard stats cards      | 5 s      | `GET /dashboard/stats`                |
| Dashboard revenue chart    | 10 s     | `GET /dashboard/revenue-chart`        |
| Entry page available count | 5 s      | `GET /slots?status=available`         |

### Cache Invalidation on Mutations
All write operations (vehicle entry, vehicle exit, slot CRUD) call `queryClient.invalidateQueries()` on the relevant keys immediately after success, so the UI reflects changes without waiting for the next poll cycle.

### Upgrading to WebSockets
If sub-second updates are needed in the future:
- Add a Socket.IO or native WS layer to the Express app
- Emit events from route handlers on entry/exit/slot changes
- Replace `refetchInterval` with socket event listeners in the affected components

---

## 9. Pending Tasks

- [ ] **Password change / user management UI** — there's no admin screen to add users or change passwords; currently requires direct DB access
- [ ] **Multi-admin setup** — the setup endpoint blocks once a config row exists; there's no way to reset or re-configure without direct DB manipulation
- [ ] **Occupancy chart on dashboard** — `GET /dashboard/occupancy-chart` is implemented in the API but the dashboard currently shows only the revenue chart; adding the occupancy bar chart card is straightforward
- [ ] **Vehicle number duplicate check at entry** — prevents the same plate re-entering while parked; currently handled server-side with a 400 error but there is no client-side pre-check before submission
- [ ] **Slot-level history** — no way to see which vehicles have used a specific slot over time
- [ ] **Notification / alerts** — no push notification when parking is nearly full; only the in-page "PARKING FULL" banner exists
- [ ] **Pagination for transaction history** — the history table fetches up to 100 rows hardcoded; UI pagination controls exist in the query params schema but are not wired to UI controls

---

## 10. Known Issues

| # | Severity | Description | Workaround |
|---|----------|-------------|------------|
| 1 | Low | The login page shows "Demo Accounts" label — this is misleading once the system is in production use | Rename the label in `login.tsx` to "Default Accounts" |
| 2 | Low | `date-fns` `formatDistanceStrict` in the parking map dialog shows relative duration without seconds for stays under 1 minute | Duration always rounds to at least 1 minute |
| 3 | Low | Slot type icons on the parking map default to "car" if vehicle type is an unexpected string | Acceptable for current vehicle types; add icon mapping if new types are added |
| 4 | Info | The setup endpoint (`POST /config/setup`) has no authentication guard — any unauthenticated user who knows the endpoint can call it | Acceptable for first-run flow; add auth middleware if the app will be exposed to the internet without VPN |

---

## 11. Future Enhancements

### Operational
- **Pre-booking / reservation** — allow vehicles to reserve a slot in advance with a time window
- **QR code tickets** — generate a QR code on entry; scan on exit to auto-fetch vehicle details
- **SMS / WhatsApp fee notification** — send fee amount to the owner's phone on exit
- **Monthly / season passes** — flat-rate passes for regular parkers (requires new `passes` table and pass check at entry)

### Technical
- **WebSocket live updates** — replace polling with server-push for true real-time without periodic HTTP overhead
- **Multi-lot support** — currently assumes a single parking facility; schema would need a `lot_id` foreign key on slots and transactions
- **Role expansion** — add a `supervisor` role that can view reports but not manage slots
- **Audit log** — track who performed each entry/exit action (add `performed_by` FK to `users` on both entries and transactions)
- **Docker / containerisation** — the current setup is Replit-native; a `Dockerfile` + `docker-compose.yml` would make it portable
- **Automated tests** — add Vitest unit tests for fee calculation and integration tests for the API routes using a test database

### UI / UX
- **Dark/light mode toggle** — the `ThemeProvider` is already wired; add a persistent preference sync to the user's DB record
- **Mobile-optimised entry/exit** — a simplified "quick scan" view sized for a tablet mounted at the parking booth
- **Floor selector tabs** — for very large lots, tabbed navigation per floor instead of one scrollable map

---

## 12. Tech Stack Summary

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Runtime        | Node.js 24                                    |
| Language       | TypeScript 5.9 (strict)                       |
| Package manager| pnpm workspaces (monorepo)                    |
| Backend        | Express 5 + express-session + bcryptjs        |
| Database       | PostgreSQL + Drizzle ORM                      |
| Validation     | Zod v4 + drizzle-zod                          |
| API contract   | OpenAPI 3.1 → Orval codegen                   |
| Frontend       | React 18 + Vite + Wouter (routing)            |
| Data fetching  | TanStack React Query v5                       |
| UI components  | shadcn/ui (Radix UI primitives) + Tailwind CSS|
| Charts         | Recharts                                      |
| Build (server) | esbuild (CJS bundle)                          |
| Hosting        | Replit (path-routed reverse proxy)            |
