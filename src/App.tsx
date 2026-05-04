import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import RoleGuard from "@/components/RoleGuard";
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import BootstrapPage from "./pages/BootstrapPage";
import RoleRouter from "./pages/RoleRouter";
import AdminDashboard from "./pages/admin/AdminDashboard";
import YardDashboard from "./pages/yard/YardDashboard";
import { ContractorHome, ContractorSiteDetail } from "./pages/contractor/Contractor";
import SiteKeeperDashboard from "./pages/sitekeeper/SiteKeeperDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/bootstrap" element={<BootstrapPage />} />
            <Route path="/app" element={<RoleRouter />} />
            <Route path="/admin" element={<RoleGuard allow={["admin"]}><AdminDashboard /></RoleGuard>} />
            <Route path="/yard" element={<RoleGuard allow={["yard_storekeeper", "admin"]}><YardDashboard /></RoleGuard>} />
            <Route path="/contractor" element={<RoleGuard allow={["contractor", "admin"]}><ContractorHome /></RoleGuard>} />
            <Route path="/contractor/site/:id" element={<RoleGuard allow={["contractor", "admin"]}><ContractorSiteDetail /></RoleGuard>} />
            <Route path="/sitekeeper" element={<RoleGuard allow={["site_storekeeper", "admin"]}><SiteKeeperDashboard /></RoleGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
