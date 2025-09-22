import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/protected-route";
import { POSLayout } from "@/components/pos-layout";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProfitLoss from "./pages/ProfitLoss";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <POSLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<Sales />} />
              <Route path="inventory" element={
                <ProtectedRoute requiredRole="inventory_staff">
                  <Inventory />
                </ProtectedRoute>
              } />
              <Route path="finance" element={
                <ProtectedRoute requiredRole="manager">
                  <Finance />
                </ProtectedRoute>
              } />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profit-loss" element={
                <ProtectedRoute requiredRole="manager">
                  <ProfitLoss />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute requiredRole="admin">
                  <Users />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
