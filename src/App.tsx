import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { lazy } from "react";
import { ENV } from "@/config/env";
const HomePage = lazy(() => import('./pages/HomePage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StakePage = lazy(() => import('./pages/StakePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CredentialsPage = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.CredentialsPage})));
const LegacyPage = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.LegacyPage})));
const PoolDetailPage = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.PoolDetailPage})));
const PoolsPage = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.PoolsPage})));
const RegisterPoolPage = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.RegisterPoolPage})));
const RewardsPageV2 = lazy(() => import('./pages/PlatformPages').then(m => ({default:m.RewardsPageV2})));

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<DashboardLayout />}>
            {ENV.LEGACY_ONLY ? <>
            <Route path="/legacy" element={<LegacyPage />} />
            <Route path="*" element={<Navigate to="/legacy" replace />} />
            </> : <>
            <Route path="/" element={<HomePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/pools" element={<PoolsPage />} />
            <Route path="/pools/:address" element={<PoolDetailPage />} />
            <Route path="/pool/:address" element={<PoolDetailPage />} />
            <Route path="/stake" element={<StakePage />} />
            <Route path="/rewards" element={<RewardsPageV2 />} />
            <Route path="/legacy" element={<LegacyPage />} />
            <Route path="/register-pool" element={<RegisterPoolPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
            </>}
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
