---
name: First-run setup flow
description: How the app detects unconfigured state and routes to setup page
---

When `GET /api/config` returns 404 (no row in parking_config), the ProtectedRoute component in App.tsx detects configError and redirects to `/setup`.

**Why:** The parking lot needs a name, vehicle types, and rates before any operations are meaningful. Slots are generated from setup, so nothing works without it.

**How to apply:** `useGetConfig({ query: { retry: false } })` — retry must be false so TanStack Query surfaces the 404 as an error immediately rather than retrying. `configError` triggers `setLocation("/setup")`. The `/setup` route is outside ProtectedRoute so it's reachable after login.

**Guard:** `location !== "/setup"` in the useEffect prevents redirect loops.
