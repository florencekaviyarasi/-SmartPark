import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">SmartPark</CardTitle>
          <CardDescription>
            Operations Control Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or staff"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoggingIn}>
              {isLoggingIn ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-8 text-sm text-muted-foreground text-center border-t pt-6">
            <p className="font-medium text-foreground mb-2">Demo Accounts</p>
            <div className="flex justify-center space-x-6">
              <div>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">admin123</span>
              </div>
              <div>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">staff</span> / <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">staff123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
