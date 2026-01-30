import { supabase } from "./supabaseClient";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sales from "./pages/Sales";
import SalesReport from "./pages/SalesReport";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BusinessProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales-report" element={<SalesReport />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/team" element={<Team />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BusinessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
