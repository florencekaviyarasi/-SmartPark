import { useState } from "react";
import {
  useListTransactions,
  getListTransactionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, History, Car, Bike, Truck, Clock, IndianRupee } from "lucide-react";
import { format } from "date-fns";

const typeIcon = { car: Car, bike: Bike, truck: Truck };

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = {
    ...(search && { search }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    limit: 100,
    offset: 0,
  };

  const { data: transactions, isLoading } = useListTransactions(params, {
    query: { queryKey: getListTransactionsQueryKey(params) },
  });

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setStartDate("");
    setEndDate("");
  };

  const totalRevenue = transactions?.reduce((sum, t) => sum + t.fee, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaction History</h2>
        <p className="text-muted-foreground">Complete record of all parking transactions.</p>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transactions?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">₹{totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {transactions?.length ? (totalRevenue / transactions.length).toFixed(0) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg Fee (₹)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Search vehicle or owner..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-history-search"
              />
              <Button onClick={handleSearch} size="sm" data-testid="button-history-search">Search</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
                data-testid="input-start-date"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
                data-testid="input-end-date"
              />
            </div>
            {(search || startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle No.</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions?.map((tx) => {
                    const Icon = typeIcon[(tx.vehicleType || "car") as keyof typeof typeIcon] || Car;
                    const durationHrs = Math.floor(tx.durationMinutes / 60);
                    const durationMins = tx.durationMinutes % 60;
                    return (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="font-mono font-medium">{tx.vehicleNumber}</TableCell>
                        <TableCell>{tx.ownerName || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="capitalize text-sm">{tx.vehicleType || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {tx.slotNumber || `#${tx.slotId}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tx.entryTime), "dd MMM, h:mm a")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tx.exitTime), "dd MMM, h:mm a")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {durationHrs > 0 ? `${durationHrs}h ` : ""}{durationMins}m
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          ₹{tx.fee.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
