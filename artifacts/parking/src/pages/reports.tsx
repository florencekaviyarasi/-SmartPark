import { useState } from "react";
import {
  useGetDailyReport,
  getGetDailyReportQueryKey,
  useGetWeeklyReport,
  getGetWeeklyReportQueryKey,
  useGetMonthlyReport,
  getGetMonthlyReportQueryKey,
  useExportReport,
  getExportReportQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, BarChart3, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-primary">{value}</div>
        <p className="text-sm font-medium mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function TransactionTable({ transactions, isLoading }: { transactions: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
        No transactions in this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle No.</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Fee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const durationHrs = Math.floor(tx.durationMinutes / 60);
            const durationMins = tx.durationMinutes % 60;
            return (
              <TableRow key={tx.id}>
                <TableCell className="font-mono font-medium">{tx.vehicleNumber}</TableCell>
                <TableCell>{tx.ownerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {tx.slotNumber || `#${tx.slotId}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{format(new Date(tx.entryTime), "dd MMM, h:mm a")}</TableCell>
                <TableCell className="text-sm">{format(new Date(tx.exitTime), "dd MMM, h:mm a")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {durationHrs > 0 ? `${durationHrs}h ` : ""}{durationMins}m
                </TableCell>
                <TableCell className="text-right font-bold">₹{tx.fee.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("daily");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const dailyParams = { date: reportDate };
  const weeklyParams = { startDate: reportDate };
  const monthlyParams = { month: reportMonth, year: reportYear };

  const { data: daily, isLoading: dailyLoading } = useGetDailyReport(dailyParams, {
    query: { queryKey: getGetDailyReportQueryKey(dailyParams), enabled: activeTab === "daily" },
  });

  const { data: weekly, isLoading: weeklyLoading } = useGetWeeklyReport(weeklyParams, {
    query: { queryKey: getGetWeeklyReportQueryKey(weeklyParams), enabled: activeTab === "weekly" },
  });

  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyReport(monthlyParams, {
    query: { queryKey: getGetMonthlyReportQueryKey(monthlyParams), enabled: activeTab === "monthly" },
  });

  const { data: exportData, refetch: fetchExport } = useExportReport(
    { type: activeTab as "daily" | "weekly" | "monthly", date: reportDate },
    {
      query: {
        queryKey: getExportReportQueryKey({ type: activeTab as "daily" | "weekly" | "monthly", date: reportDate }),
        enabled: false,
      },
    },
  );

  const handleExport = async () => {
    const result = await fetchExport();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Downloaded ${result.data.filename}` });
    }
  };

  const currentReport = activeTab === "daily" ? daily : activeTab === "weekly" ? weekly : monthly;
  const isLoading = activeTab === "daily" ? dailyLoading : activeTab === "weekly" ? weeklyLoading : monthlyLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">Analyze parking operations and revenue.</p>
        </div>
        <Button onClick={handleExport} variant="outline" data-testid="button-export-csv">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center gap-4">
          <TabsList>
            <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
          </TabsList>

          {(activeTab === "daily" || activeTab === "weekly") && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-36"
                data-testid="input-report-date"
              />
            </div>
          )}

          {activeTab === "monthly" && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                data-testid="select-report-month"
              >
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <Input
                type="number"
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className="w-20"
                data-testid="input-report-year"
              />
            </div>
          )}
        </div>

        {currentReport && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mt-4">
            <StatCard
              label="Period"
              value={currentReport.period}
            />
            <StatCard
              label="Total Vehicles"
              value={String(currentReport.totalVehicles)}
            />
            <StatCard
              label="Total Revenue"
              value={`₹${currentReport.totalRevenue.toFixed(0)}`}
            />
            <StatCard
              label="Average Fee"
              value={`₹${(currentReport.averageFee || 0).toFixed(0)}`}
              sub="per vehicle"
            />
          </div>
        )}

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Daily Transactions — {reportDate}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={daily?.transactions ?? []} isLoading={dailyLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Weekly Transactions — {weekly?.period}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={weekly?.transactions ?? []} isLoading={weeklyLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Monthly Transactions — {monthly?.period}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={monthly?.transactions ?? []} isLoading={monthlyLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
