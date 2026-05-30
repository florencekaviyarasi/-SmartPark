import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetConfig, getGetConfigQueryKey } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Dashboard from "@/pages/dashboard";
import Slots from "@/pages/slots";
import Entry from "@/pages/entry";
import Exit from "@/pages/exit";
import History from "@/pages/history";
import Reports from "@/pages/reports";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: config, isLoading: configLoading, isError: configError } = useGetConfig({
    query: {
      queryKey: getGetConfigQueryKey(),
      retry: false,
      enabled: !!user,
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/");
    } else if (!isLoading && !configLoading && user && configError && location !== "/setup") {
      setLocation("/setup");
    }
  }, [isLoading, user, adminOnly, configLoading, configError, location, setLocation]);

  if (isLoading || (user && configLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;
  if (configError) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />

      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/slots">
        <ProtectedRoute component={Slots} adminOnly={true} />
      </Route>
      <Route path="/entry">
        <ProtectedRoute component={Entry} />
      </Route>
      <Route path="/exit">
        <ProtectedRoute component={Exit} />
      </Route>
      <Route path="/history">
        <ProtectedRoute component={History} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} adminOnly={true} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="smartpark-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
