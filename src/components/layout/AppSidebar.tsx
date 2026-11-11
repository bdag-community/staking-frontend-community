import React from 'react';
import { LayoutDashboard, Coins, Wallet, Gift, BadgeCheck, Settings2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";

import { ENV } from '@/config/env';

const navItems = ENV.LEGACY_ONLY ? [{ title: 'Legacy Staking', url: '/legacy', icon: Wallet }] : [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Portfolio', url: '/portfolio', icon: Wallet },
  { title: 'Pools', url: '/pools', icon: LayoutDashboard },
  { title: 'Stake', url: '/stake', icon: Coins },
  { title: 'Rewards', url: '/rewards', icon: Gift },
  { title: 'Voting', url: '/credentials', icon: BadgeCheck },
  { title: 'Operator', url: '/register-pool', icon: Settings2 },
];

export const AppSidebar: React.FC = () => {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed' && !isMobile;

  // Close mobile sidebar on route change
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border/50 lg:hidden">
      <SidebarHeader className={cn("h-20 flex flex-col justify-center transition-all duration-200", collapsed ? "px-0" : "px-2")}>
        <Link
          to="/"
          aria-label="BDAG Staking home"
          className={cn(
            "flex items-center transition-all duration-200 rounded-lg",
            collapsed ? "justify-center w-full px-0" : "gap-4 px-3 py-4"
          )}
        >
          {collapsed ? <img src="/icon.svg" alt="" className="h-10 w-10" /> : <img src="/logo.svg" alt="" className="h-10 w-auto" />}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="lg" tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={cn(
                        "flex items-center transition-all duration-200 rounded-lg",
                        collapsed ? "justify-center w-full px-0" : "gap-4 px-3 py-3 hover:bg-secondary/10 hover:text-primary"
                      )}
                      activeClassName="bg-primary/10 text-primary border-l-2 border-primary"
                    >
                      <div className={cn("flex items-center justify-center shrink-0 transition-all duration-200", collapsed ? "w-6 h-6" : "w-10 h-10")}>
                        <item.icon className={cn("transition-all duration-200", collapsed ? "w-5 h-5" : "w-6 h-6")} />
                      </div>
                      {!collapsed && <span className="text-lg font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar >
  );
};
