import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, MapPin, ArrowLeftRight,
  Wrench, Users, FileBarChart, GraduationCap, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Inventaris Barang", url: "/items", icon: Package },
  { title: "Kategori", url: "/categories", icon: FolderTree },
  { title: "Ruang & Lokasi", url: "/locations", icon: MapPin },
  { title: "Peminjaman", url: "/loans", icon: ArrowLeftRight },
  { title: "Perawatan", url: "/maintenance", icon: Wrench },
  { title: "Laporan", url: "/reports", icon: FileBarChart },
];

const adminNav = [
  { title: "Manajemen Pengguna", url: "/users", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile, isAdmin, roles, signOut } = useAuth();

  const isActive = (p: string) => p === "/" ? pathname === "/" : pathname.startsWith(p);

  const roleLabel = (r: string) => ({
    admin: "Admin", petugas: "Petugas Sarpras", guru: "Guru", kepala_sekolah: "Kepala Sekolah",
  } as Record<string, string>)[r] || r;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
            <GraduationCap className="h-6 w-6 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-sidebar-foreground leading-tight">SIM Sarpras</div>
              <div className="text-[11px] text-sidebar-foreground/70">Sekolah</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Menu Utama</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Administrasi</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="px-2">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || "Pengguna"}
              </div>
              <div className="text-[11px] text-sidebar-primary font-medium truncate">
                {roles.map(roleLabel).join(", ") || "—"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
