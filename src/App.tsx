import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import RoleGuard from "@/components/RoleGuard";
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
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
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/app" element={<RoleRouter />} />
            <Route path="/admin" element={<RoleGuard allow={["admin","engineer"]}><AdminDashboard /></RoleGuard>} />
            <Route path="/yard" element={<RoleGuard allow={["yard_storekeeper", "admin", "engineer"]}><YardDashboard /></RoleGuard>} />
            <Route path="/contractor" element={<RoleGuard allow={["contractor", "admin", "engineer"]}><ContractorHome /></RoleGuard>} />
            <Route path="/contractor/site/:id" element={<RoleGuard allow={["contractor", "admin", "engineer"]}><ContractorSiteDetail /></RoleGuard>} />
            <Route path="/sitekeeper" element={<RoleGuard allow={["site_storekeeper", "admin", "engineer"]}><SiteKeeperDashboard /></RoleGuard>} />
            {/* Admin read-only views of other dashboards */}
            <Route path="/admin/yard-view" element={<RoleGuard allow={["admin","engineer"]}><YardDashboard readOnly /></RoleGuard>} />
            <Route path="/admin/sitekeeper-view" element={<RoleGuard allow={["admin","engineer"]}><SiteKeeperDashboard readOnly /></RoleGuard>} />
            <Route path="/admin/contractor" element={<RoleGuard allow={["admin","engineer"]}><ContractorHome readOnly /></RoleGuard>} />
            <Route path="/admin/contractor/site/:id" element={<RoleGuard allow={["admin","engineer"]}><ContractorSiteDetail readOnly /></RoleGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
