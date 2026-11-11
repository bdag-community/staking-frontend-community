import { NetworkNotice } from "./NetworkNotice";
import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ENV } from "@/config/env";
import { Suspense } from 'react';
import { PageLoadingSkeleton } from "@/components/skeletons/PageLoadingSkeleton";

export const DashboardLayout = () => {
  const location = useLocation();
  const hasLandingHero = !ENV.LEGACY_ONLY && location.pathname === "/";
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-x-hidden">
          <TopBar />
            <main className={`flex-1 w-full overflow-x-hidden ${hasLandingHero ? "pt-[76px]" : "pt-32 lg:pt-28"}`}>
            <NetworkNotice />
            <Suspense fallback={<PageLoadingSkeleton className="page-shell pb-12" />}><Outlet /></Suspense>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};
