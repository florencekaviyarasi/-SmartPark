import {
  useGetDashboardStats,
  getGetDashboardStatsQueryKey,
  useGetRevenueChart,
  getGetRevenueChartQueryKey,
  useGetConfig,
  getGetConfigQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, IndianRupee, Activity, TrendingUp, ParkingSquare } from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ParkingMap } from "@/components/parking-map";

export default function Dashboard() {
  const { data: config } = useGetConfig({
    query: { queryKey: getGetConfigQueryKey(), retry: false },
  });

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), refetchInterval: 5000 },
  });

  const { data: revenue } = useGetRevenueChart(
    { period: "week" },
    { query: { queryKey: getGetRevenueChartQueryKey({ period: "week" }), refetchInterval: 10000 } },
  );

  const formatCurrency = (val: number | undefined) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

  const hasRevenueData = revenue?.some((d) => d.revenue > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config?.lotName ?? "Parking Dashboard"}</h2>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Activity className="w-3.5 h-3.5 text-green-500" />
            Live updates every 5 seconds
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "—" : formatCurrency(stats?.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.todayVehicles ?? 0} vehicle{(stats?.todayVehicles ?? 0) !== 1 ? "s" : ""} served today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "—" : `${(stats?.occupancyRate ?? 0).toFixed(1)}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.occupiedSlots ?? 0} / {stats?.totalSlots ?? 0} slots occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Slots</CardTitle>
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <ParkingSquare className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.availableSlots ?? 1) === 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
              {statsLoading ? "—" : (stats?.availableSlots ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for entry</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "—" : formatCurrency(stats?.monthRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Parking Map */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Live Parking Map
            <span className="text-xs font-normal text-muted-foreground ml-1">— click any slot for details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ParkingMap />
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasRevenueData ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <IndianRupee className="w-10 h-10 opacity-20" />
              <p className="text-sm">No transactions yet — revenue will appear here once vehicles exit.</p>
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MMM dd")} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy")}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
