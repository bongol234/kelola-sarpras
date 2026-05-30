import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Items from "./pages/Items";
import Categories from "./pages/Categories";
import Locations from "./pages/Locations";
import Loans from "./pages/Loans";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/items" element={<Items />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
