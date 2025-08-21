import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Crown,
  BarChart3,
  Building2,
  Users,
  Settings,
  Shield,
  Activity,
  Database,
  MessageSquare,
  FileText,
  Globe,
  UserCheck,
  AlertTriangle,
  Zap,
  Bell,
  Archive,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/super-admin",
    icon: BarChart3,
    description: "Platform overview and analytics"
  },
  {
    title: "Organizations",
    url: "/super-admin/organizations",
    icon: Building2,
    description: "Manage platform organizations"
  },
  {
    title: "User Management",
    url: "/super-admin/users",
    icon: Users,
    description: "Global user administration"
  },
  {
    title: "Platform Analytics",
    url: "/super-admin/analytics",
    icon: Activity,
    description: "Detailed platform metrics"
  },
];

const systemNavItems = [
  {
    title: "System Health",
    url: "/super-admin/system",
    icon: Shield,
    description: "Database and service status"
  },
  {
    title: "Database Admin",
    url: "/super-admin/database",
    icon: Database,
    description: "Direct database management"
  },
  {
    title: "API Monitoring",
    url: "/super-admin/api",
    icon: Zap,
    description: "API performance and logs"
  },
  {
    title: "Security Center",
    url: "/super-admin/security",
    icon: AlertTriangle,
    description: "Security audits and alerts"
  },
];

const communicationNavItems = [
  {
    title: "Notifications",
    url: "/super-admin/notifications",
    icon: Bell,
    description: "Platform-wide notifications"
  },
  {
    title: "Support Tickets",
    url: "/super-admin/support",
    icon: MessageSquare,
    description: "Customer support management"
  },
  {
    title: "Audit Logs",
    url: "/super-admin/audit",
    icon: FileText,
    description: "System activity tracking"
  },
];

const toolsNavItems = [
  {
    title: "Demo Configuration",
    url: "/super-admin/demo-config",
    icon: UserCheck,
    description: "Configure demo account settings"
  },
  {
    title: "Global Settings",
    url: "/super-admin/settings",
    icon: Settings,
    description: "Platform configuration"
  },
  {
    title: "Feature Flags",
    url: "/super-admin/features",
    icon: Wrench,
    description: "Control feature rollouts"
  },
  {
    title: "Data Export",
    url: "/super-admin/export",
    icon: Archive,
    description: "Export platform data"
  },
  {
    title: "Global Broadcast",
    url: "/super-admin/broadcast",
    icon: Globe,
    description: "Send platform announcements"
  },
];

interface NavItemProps {
  item: typeof mainNavItems[0];
  isCollapsed: boolean;
}

function NavItem({ item, isCollapsed }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.url;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs opacity-70 truncate">{item.description}</div>
            </div>
          )}
          {isActive && !isCollapsed && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SuperAdminSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-72"} transition-all duration-300`}
      collapsible="icon"
    >
      <div className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-lg">Super Admin</h2>
                <p className="text-xs text-muted-foreground">Platform Control</p>
              </div>
            )}
          </div>
          <SidebarTrigger className="h-8 w-8" />
        </div>
      </div>

      <SidebarContent className="overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="px-2 py-4 space-y-4">
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              Main Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainNavItems.map((item) => (
                  <NavItem key={item.url} item={item} isCollapsed={isCollapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              System Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {systemNavItems.map((item) => (
                  <NavItem key={item.url} item={item} isCollapsed={isCollapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              Communication
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {communicationNavItems.map((item) => (
                  <NavItem key={item.url} item={item} isCollapsed={isCollapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
              Tools & Configuration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {toolsNavItems.map((item) => (
                  <NavItem key={item.url} item={item} isCollapsed={isCollapsed} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      {/* Remove the floating toggle as SidebarTrigger is now in header */}
    </Sidebar>
  );
}